import "server-only";

import type { DatabaseValue } from "./database-client";
import type { TransactionRepository } from "../application/ports/transaction-repository";
import type {
  NewTransaction,
  Transaction,
  TransactionCategory,
  TransactionType,
} from "../domain/transaction";
import { getFinanceDatabase } from "./libsql-database";
import { MonthClosedError } from "../domain/monthly-close";

function isClosedMonthDatabaseError(error: unknown): boolean {
  return error instanceof Error && error.message.includes("MONTH_CLOSED");
}

function mapRow(row: Record<string, DatabaseValue>): Transaction {
  return {
    id: String(row.id),
    description: String(row.description),
    amountCents: Number(row.amount_cents),
    type: String(row.type) as TransactionType,
    category: String(row.category) as TransactionCategory,
    accountId: String(row.account_id),
    occurredOn: String(row.occurred_on),
    createdAt: String(row.created_at),
  };
}

export class LibsqlTransactionRepository implements TransactionRepository {
  constructor(private readonly organizationId: string) {}

  async list(): Promise<Transaction[]> {
    const database = await getFinanceDatabase();
    const result = await database.execute({
      sql: `
      SELECT
        id, description, amount_cents, type, category, account_id,
        occurred_on, created_at
      FROM transactions
      WHERE organization_id = ?
      ORDER BY occurred_on DESC, created_at DESC
      `,
      args: [this.organizationId],
    });

    return result.rows.map((row) => mapRow(row));
  }

  async create(transaction: NewTransaction): Promise<Transaction> {
    const database = await getFinanceDatabase();
    const entity: Transaction = {
      ...transaction,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };

    try {
      await database.execute({
        sql: `
          INSERT INTO transactions
            (id, description, amount_cents, type, category, account_id, occurred_on, created_at, organization_id)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        args: [
          entity.id,
          entity.description,
          entity.amountCents,
          entity.type,
          entity.category,
          entity.accountId,
          entity.occurredOn,
          entity.createdAt,
          this.organizationId,
        ],
      });
    } catch (error) {
      if (isClosedMonthDatabaseError(error)) throw new MonthClosedError();
      throw error;
    }

    return entity;
  }

  async deleteById(id: string): Promise<boolean> {
    const database = await getFinanceDatabase();
    let result;
    try {
      result = await database.execute({
        sql: "DELETE FROM transactions WHERE id = ? AND organization_id = ?",
        args: [id, this.organizationId],
      });
    } catch (error) {
      if (isClosedMonthDatabaseError(error)) throw new MonthClosedError();
      throw error;
    }

    return result.rowsAffected === 1;
  }
}
