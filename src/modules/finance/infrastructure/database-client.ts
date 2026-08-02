import "server-only";

import type {
  Client as LibsqlClient,
  InValue,
  Transaction as LibsqlTransaction,
} from "@libsql/client";
import type { Pool, PoolClient, QueryResultRow } from "pg";

export type DatabaseValue = InValue | Date;
export type DatabaseRow = Record<string, DatabaseValue>;

export type DatabaseStatement = {
  sql: string;
  args?: DatabaseValue[];
};

export type DatabaseResult = {
  rows: DatabaseRow[];
  rowsAffected: number;
};

export interface DatabaseTransaction {
  execute(statement: DatabaseStatement | string): Promise<DatabaseResult>;
  batch(statements: Array<DatabaseStatement | string>): Promise<DatabaseResult[]>;
  commit(): Promise<void>;
  rollback(): Promise<void>;
  close(): void;
}

export interface DatabaseClient {
  execute(statement: DatabaseStatement | string): Promise<DatabaseResult>;
  batch(
    statements: Array<DatabaseStatement | string>,
    mode?: "read" | "write",
  ): Promise<DatabaseResult[]>;
  transaction(mode?: "read" | "write"): Promise<DatabaseTransaction>;
  close(): void;
}

function normalizeStatement(
  statement: DatabaseStatement | string,
): DatabaseStatement {
  return typeof statement === "string" ? { sql: statement, args: [] } : statement;
}

function mapLibsqlResult(result: {
  rows: Array<Record<string, InValue>>;
  rowsAffected: number;
}): DatabaseResult {
  return {
    rows: result.rows,
    rowsAffected: result.rowsAffected,
  };
}

function wrapLibsqlTransaction(
  transaction: LibsqlTransaction,
): DatabaseTransaction {
  return {
    async execute(statement) {
      return mapLibsqlResult(await transaction.execute(normalizeStatement(statement)));
    },
    async batch(statements) {
      const results = await transaction.batch(
        statements.map((statement) => normalizeStatement(statement)),
      );
      return results.map((result) => mapLibsqlResult(result));
    },
    async commit() {
      await transaction.commit();
    },
    async rollback() {
      await transaction.rollback();
    },
    close() {
      transaction.close();
    },
  };
}

export function wrapLibsqlClient(client: LibsqlClient): DatabaseClient {
  return {
    async execute(statement) {
      return mapLibsqlResult(await client.execute(normalizeStatement(statement)));
    },
    async batch(statements, mode = "write") {
      const results = await client.batch(
        statements.map((statement) => normalizeStatement(statement)),
        mode,
      );
      return results.map((result) => mapLibsqlResult(result));
    },
    async transaction(mode = "write") {
      return wrapLibsqlTransaction(await client.transaction(mode));
    },
    close() {
      client.close();
    },
  };
}

// Los repositorios existentes usan marcadores `?`. PostgreSQL requiere `$1`,
// `$2`, etc.; esta conversión evita duplicar todas las consultas.
export function toPostgresPlaceholders(sql: string): string {
  let parameter = 0;
  let inString = false;
  let converted = "";

  for (let index = 0; index < sql.length; index += 1) {
    const character = sql[index];
    const next = sql[index + 1];
    if (character === "'" && inString && next === "'") {
      converted += "''";
      index += 1;
      continue;
    }
    if (character === "'") {
      inString = !inString;
      converted += character;
      continue;
    }
    if (character === "?" && !inString) {
      parameter += 1;
      converted += `$${parameter}`;
      continue;
    }
    converted += character;
  }

  return converted;
}

async function executePostgres(
  client: Pick<Pool, "query"> | Pick<PoolClient, "query">,
  statement: DatabaseStatement | string,
): Promise<DatabaseResult> {
  const normalized = normalizeStatement(statement);
  const result = await client.query<QueryResultRow>(
    toPostgresPlaceholders(normalized.sql),
    normalized.args ?? [],
  );
  return {
    rows: result.rows as DatabaseRow[],
    rowsAffected: result.rowCount ?? 0,
  };
}

class PostgresTransaction implements DatabaseTransaction {
  private finished = false;

  constructor(private readonly client: PoolClient) {}

  execute(statement: DatabaseStatement | string): Promise<DatabaseResult> {
    return executePostgres(this.client, statement);
  }

  async batch(
    statements: Array<DatabaseStatement | string>,
  ): Promise<DatabaseResult[]> {
    const results: DatabaseResult[] = [];
    for (const statement of statements) {
      results.push(await this.execute(statement));
    }
    return results;
  }

  async commit(): Promise<void> {
    if (this.finished) return;
    await this.client.query("COMMIT");
    this.finished = true;
  }

  async rollback(): Promise<void> {
    if (this.finished) return;
    await this.client.query("ROLLBACK");
    this.finished = true;
  }

  close(): void {
    if (this.finished) {
      this.client.release();
      return;
    }
    void this.client.query("ROLLBACK").finally(() => {
      this.finished = true;
      this.client.release();
    });
  }
}

export function createPostgresClient(pool: Pool): DatabaseClient {
  return {
    execute(statement) {
      return executePostgres(pool, statement);
    },
    async batch(statements) {
      const transaction = await this.transaction("write");
      try {
        const results = await transaction.batch(statements);
        await transaction.commit();
        return results;
      } catch (error) {
        await transaction.rollback();
        throw error;
      } finally {
        transaction.close();
      }
    },
    async transaction() {
      const client = await pool.connect();
      await client.query("BEGIN");
      return new PostgresTransaction(client);
    },
    close() {
      void pool.end();
    },
  };
}
