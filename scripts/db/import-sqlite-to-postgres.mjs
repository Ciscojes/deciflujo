import { existsSync, realpathSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import pg from "pg";

const { Pool } = pg;
const sqlitePath = process.env.DECIFLUJO_SQLITE_PATH;
const databaseUrl = process.env.DATABASE_URL ?? "";

if (!sqlitePath || !existsSync(sqlitePath)) {
  throw new Error("DECIFLUJO_SQLITE_PATH debe apuntar al archivo SQLite existente.");
}
if (!databaseUrl.startsWith("postgres://") && !databaseUrl.startsWith("postgresql://")) {
  throw new Error("DATABASE_URL debe apuntar a PostgreSQL.");
}
if (process.env.DECIFLUJO_IMPORT_CONFIRM !== "IMPORT_DECIFLUJO") {
  throw new Error("Define DECIFLUJO_IMPORT_CONFIRM=IMPORT_DECIFLUJO para autorizar la importación.");
}

const tableOrder = [
  "user",
  "organization",
  "account",
  "verification",
  "member",
  "invitation",
  "session",
  "accounts",
  "transactions",
  "decisions",
  "audit_events",
  "open_items",
  "monthly_budgets",
  "monthly_closures",
];

const quote = (identifier) => `"${identifier.replaceAll('"', '""')}"`;
const sqlite = new DatabaseSync(realpathSync(sqlitePath), { readOnly: true });
const pool = new Pool({ connectionString: databaseUrl, max: 1 });
const client = await pool.connect();
const report = [];

function sqliteHasTable(table) {
  return Boolean(
    sqlite
      .prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?")
      .get(table),
  );
}

function convertValue(value, dataType) {
  if (value === null || value === undefined) return null;
  if (dataType === "boolean") return Boolean(value);
  if (dataType.includes("timestamp")) return new Date(String(value));
  if ((dataType === "json" || dataType === "jsonb") && typeof value === "string") {
    return JSON.parse(value);
  }
  return value;
}

try {
  await client.query("BEGIN");

  // Una preparación nueva de Deciflujo contiene únicamente datos demo. Se
  // retiran antes de importar para evitar duplicados; cualquier dato real
  // existente detiene la operación.
  const users = await client.query('SELECT COUNT(*)::int AS total FROM "user"');
  if (users.rows[0].total > 0) {
    throw new Error("La base PostgreSQL ya contiene usuarios; se canceló la importación.");
  }
  const nonDemoAccounts = await client.query(
    "SELECT COUNT(*)::int AS total FROM accounts WHERE is_demo <> 1",
  );
  const nonDemoTransactions = await client.query(
    "SELECT COUNT(*)::int AS total FROM transactions WHERE is_demo <> 1",
  );
  if (nonDemoAccounts.rows[0].total > 0 || nonDemoTransactions.rows[0].total > 0) {
    throw new Error("La base PostgreSQL contiene datos financieros reales; se canceló la importación.");
  }
  await client.query("DELETE FROM transactions WHERE is_demo = 1");
  await client.query("DELETE FROM accounts WHERE is_demo = 1");

  for (const table of tableOrder) {
    if (!sqliteHasTable(table)) continue;

    const destinationColumns = await client.query(
      `SELECT column_name, data_type
       FROM information_schema.columns
       WHERE table_schema = current_schema() AND table_name = $1
       ORDER BY ordinal_position`,
      [table],
    );
    if (destinationColumns.rows.length === 0) {
      throw new Error(`Falta la tabla PostgreSQL ${table}; ejecuta las migraciones primero.`);
    }
    const existing = await client.query(`SELECT COUNT(*)::int AS total FROM ${quote(table)}`);
    if (existing.rows[0].total > 0) {
      throw new Error(`La tabla PostgreSQL ${table} no está vacía.`);
    }

    const sourceColumns = sqlite
      .prepare(`PRAGMA table_info(${quote(table)})`)
      .all()
      .map((column) => String(column.name));
    const columns = destinationColumns.rows.filter((column) =>
      sourceColumns.includes(column.column_name),
    );
    const rows = sqlite.prepare(`SELECT * FROM ${quote(table)}`).all();

    for (const row of rows) {
      const values = columns.map((column) =>
        convertValue(row[column.column_name], column.data_type),
      );
      const placeholders = values.map((_, index) => `$${index + 1}`).join(", ");
      await client.query(
        `INSERT INTO ${quote(table)} (${columns.map((column) => quote(column.column_name)).join(", ")})
         VALUES (${placeholders})`,
        values,
      );
    }

    const imported = await client.query(`SELECT COUNT(*)::int AS total FROM ${quote(table)}`);
    if (imported.rows[0].total !== rows.length) {
      throw new Error(`Conteo incorrecto al importar ${table}.`);
    }
    report.push({ table, rows: rows.length });
  }

  await client.query("COMMIT");
  console.log(JSON.stringify({ status: "ok", source: realpathSync(sqlitePath), tables: report }, null, 2));
} catch (error) {
  await client.query("ROLLBACK");
  throw error;
} finally {
  sqlite.close();
  client.release();
  await pool.end();
}
