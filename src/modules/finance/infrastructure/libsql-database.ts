import "server-only";

import { createClient, type InValue } from "@libsql/client";
import { getPostgresPool, usesPostgres } from "../../../lib/postgres";
import type { NewTransaction } from "../domain/transaction";
import { MonthClosedError } from "../domain/monthly-close";
import {
  createPostgresClient,
  type DatabaseClient,
  wrapLibsqlClient,
} from "./database-client";
import { preparePostgresSchema } from "./postgres-schema";

// Conserva el archivo histórico para no perder datos tras el cambio de marca.
const postgresEnabled = usesPostgres();
const databaseUrl = process.env.DATABASE_URL ?? "file:finanzas-pyme.db";

type DatabaseState = {
  client: DatabaseClient;
  ready?: Promise<void>;
  schemaVersion?: string;
};

const globalDatabase = globalThis as typeof globalThis & {
  financeDatabase?: DatabaseState;
};

const database =
  globalDatabase.financeDatabase ??
  ({
    client: postgresEnabled
      ? createPostgresClient(getPostgresPool())
      : wrapLibsqlClient(createClient({ url: databaseUrl })),
  } satisfies DatabaseState);

const expectedSchemaVersion = postgresEnabled
  ? "013_postgres_baseline"
  : "012_monthly_closures";

if (database.schemaVersion !== expectedSchemaVersion) {
  database.ready = undefined;
  database.schemaVersion = expectedSchemaVersion;
}

if (process.env.NODE_ENV !== "production") {
  globalDatabase.financeDatabase = database;
}

function isoDateDaysAgo(daysAgo: number): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - daysAgo);
  return date.toISOString().slice(0, 10);
}

async function hasMigration(id: string): Promise<boolean> {
  const result = await database.client.execute({
    sql: "SELECT 1 FROM schema_migrations WHERE id = ?",
    args: [id],
  });
  return result.rows.length > 0;
}

async function recordMigration(id: string): Promise<void> {
  await database.client.execute({
    sql: "INSERT INTO schema_migrations (id, applied_at) VALUES (?, ?)",
    args: [id, new Date().toISOString()],
  });
}

async function migrateInitialSchema(): Promise<void> {
  if (await hasMigration("001_initial_transactions")) return;

  await database.client.execute(`
    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      description TEXT NOT NULL,
      amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
      type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
      category TEXT NOT NULL,
      occurred_on TEXT NOT NULL,
      created_at TEXT NOT NULL
    )
  `);
  await recordMigration("001_initial_transactions");
}

async function migrateAccounts(): Promise<void> {
  if (await hasMigration("002_accounts")) return;

  await database.client.execute(`
    CREATE TABLE IF NOT EXISTS accounts (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      type TEXT NOT NULL CHECK (type IN ('bank', 'cash', 'card')),
      opening_balance_cents INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    )
  `);

  const tableInfo = await database.client.execute(
    "PRAGMA table_info(transactions)",
  );
  const hasAccountId = tableInfo.rows.some(
    (column) => String(column.name) === "account_id",
  );

  if (!hasAccountId) {
    await database.client.execute(
      "ALTER TABLE transactions ADD COLUMN account_id TEXT REFERENCES accounts(id)",
    );
  }

  const accountCount = await database.client.execute(
    "SELECT COUNT(*) AS total FROM accounts",
  );

  if (Number(accountCount.rows[0]?.total ?? 0) === 0) {
    const createdAt = new Date().toISOString();
    await database.client.batch(
      [
        {
          sql: `
            INSERT INTO accounts (id, name, type, opening_balance_cents, created_at)
            VALUES (?, ?, ?, ?, ?)
          `,
          args: [
            crypto.randomUUID(),
            "Cuenta principal",
            "bank",
            250_000_00,
            createdAt,
          ],
        },
        {
          sql: `
            INSERT INTO accounts (id, name, type, opening_balance_cents, created_at)
            VALUES (?, ?, ?, ?, ?)
          `,
          args: [
            crypto.randomUUID(),
            "Caja chica",
            "cash",
            50_000_00,
            createdAt,
          ],
        },
      ],
      "write",
    );
  }

  const primaryAccount = await database.client.execute(
    `
      SELECT id
      FROM accounts
      ORDER BY CASE WHEN type = 'bank' THEN 0 ELSE 1 END, created_at, name
      LIMIT 1
    `,
  );
  const primaryAccountId = String(primaryAccount.rows[0]?.id);

  await database.client.execute({
    sql: "UPDATE transactions SET account_id = ? WHERE account_id IS NULL",
    args: [primaryAccountId],
  });
  await database.client.execute(
    "CREATE INDEX IF NOT EXISTS idx_transactions_account_id ON transactions(account_id)",
  );
  await recordMigration("002_accounts");
}

async function correctLegacyDefaultAccount(): Promise<void> {
  if (await hasMigration("003_default_bank_account")) return;

  const defaultAccounts = await database.client.execute(`
    SELECT id, name, type
    FROM accounts
    WHERE name IN ('Cuenta principal', 'Caja chica')
  `);
  const bankId = defaultAccounts.rows.find(
    (account) =>
      String(account.name) === "Cuenta principal" &&
      String(account.type) === "bank",
  )?.id;
  const cashId = defaultAccounts.rows.find(
    (account) =>
      String(account.name) === "Caja chica" && String(account.type) === "cash",
  )?.id;

  if (bankId && cashId) {
    const assignments = await database.client.execute({
      sql: `
        SELECT
          SUM(CASE WHEN account_id = ? THEN 1 ELSE 0 END) AS bank_total,
          SUM(CASE WHEN account_id = ? THEN 1 ELSE 0 END) AS cash_total
        FROM transactions
      `,
      args: [bankId, cashId],
    });
    const bankTotal = Number(assignments.rows[0]?.bank_total ?? 0);
    const cashTotal = Number(assignments.rows[0]?.cash_total ?? 0);

    if (bankTotal === 0 && cashTotal > 0) {
      await database.client.execute({
        sql: "UPDATE transactions SET account_id = ? WHERE account_id = ?",
        args: [bankId, cashId],
      });
    }
  }

  await recordMigration("003_default_bank_account");
}

async function migrateDecisionJournal(): Promise<void> {
  if (await hasMigration("004_decision_journal")) return;

  await database.client.execute(`
    CREATE TABLE IF NOT EXISTS decisions (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      added_monthly_expense_cents INTEGER NOT NULL CHECK (added_monthly_expense_cents > 0),
      horizon_months INTEGER NOT NULL CHECK (horizon_months BETWEEN 1 AND 24),
      starting_balance_cents INTEGER NOT NULL,
      monthly_income_cents INTEGER NOT NULL,
      monthly_expense_cents INTEGER NOT NULL,
      baseline_final_balance_cents INTEGER NOT NULL,
      projected_final_balance_cents INTEGER NOT NULL,
      risk TEXT NOT NULL CHECK (risk IN ('stable', 'attention', 'critical')),
      status TEXT NOT NULL CHECK (status IN ('planned', 'reviewed')),
      review_on TEXT NOT NULL,
      actual_balance_cents INTEGER,
      variance_cents INTEGER,
      created_at TEXT NOT NULL,
      reviewed_at TEXT
    )
  `);
  await database.client.execute(
    "CREATE INDEX IF NOT EXISTS idx_decisions_status_review ON decisions(status, review_on)",
  );
  await recordMigration("004_decision_journal");
}

async function addColumnIfMissing(
  table: string,
  column: string,
  definition: string,
): Promise<void> {
  const tableInfo = await database.client.execute(`PRAGMA table_info(${table})`);
  const exists = tableInfo.rows.some(
    (currentColumn) => String(currentColumn.name) === column,
  );

  if (!exists) {
    await database.client.execute(
      `ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`,
    );
  }
}

async function migrateMultiTenantData(): Promise<void> {
  if (await hasMigration("005_multi_tenant")) return;

  await addColumnIfMissing("accounts", "organization_id", "TEXT");
  await addColumnIfMissing("transactions", "organization_id", "TEXT");
  await addColumnIfMissing("decisions", "organization_id", "TEXT");

  await database.client.batch(
    [
      "CREATE INDEX IF NOT EXISTS idx_accounts_organization ON accounts(organization_id)",
      "CREATE INDEX IF NOT EXISTS idx_transactions_organization ON transactions(organization_id)",
      "CREATE INDEX IF NOT EXISTS idx_decisions_organization ON decisions(organization_id)",
    ],
    "write",
  );
  await recordMigration("005_multi_tenant");
}

async function migrateTenantAccountNames(): Promise<void> {
  if (await hasMigration("006_tenant_account_names")) return;

  await database.client.execute("PRAGMA foreign_keys = OFF");
  try {
    await database.client.batch(
      [
        `
          CREATE TABLE accounts_by_organization (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            type TEXT NOT NULL CHECK (type IN ('bank', 'cash', 'card')),
            opening_balance_cents INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL,
            organization_id TEXT,
            UNIQUE (organization_id, name)
          )
        `,
        `
          INSERT INTO accounts_by_organization (
            id, name, type, opening_balance_cents, created_at, organization_id
          )
          SELECT
            id, name, type, opening_balance_cents, created_at, organization_id
          FROM accounts
        `,
        "DROP TABLE accounts",
        "ALTER TABLE accounts_by_organization RENAME TO accounts",
        "CREATE INDEX IF NOT EXISTS idx_accounts_organization ON accounts(organization_id)",
      ],
      "write",
    );
  } finally {
    await database.client.execute("PRAGMA foreign_keys = ON");
  }

  await recordMigration("006_tenant_account_names");
}

async function migrateDemoDataFlags(): Promise<void> {
  if (await hasMigration("007_demo_data")) return;

  await addColumnIfMissing(
    "accounts",
    "is_demo",
    "INTEGER NOT NULL DEFAULT 0 CHECK (is_demo IN (0, 1))",
  );
  await addColumnIfMissing(
    "transactions",
    "is_demo",
    "INTEGER NOT NULL DEFAULT 0 CHECK (is_demo IN (0, 1))",
  );

  await database.client.batch(
    [
      `
        UPDATE accounts
        SET is_demo = 1
        WHERE name IN ('Cuenta principal', 'Caja chica')
          AND created_at = (
            SELECT MIN(created_at)
            FROM accounts
          )
      `,
      `
        UPDATE transactions
        SET is_demo = 1
        WHERE description IN (
          'Venta proyecto sitio web',
          'Mantenimiento mensual',
          'Pago de planilla',
          'Campaña en redes'
        )
      `,
    ],
    "write",
  );
  await recordMigration("007_demo_data");
}

async function migrateAuditLog(): Promise<void> {
  if (await hasMigration("008_audit_log")) return;

  await database.client.batch(
    [
      `
        CREATE TABLE IF NOT EXISTS audit_events (
          id TEXT PRIMARY KEY,
          organization_id TEXT NOT NULL,
          actor_user_id TEXT,
          actor_name TEXT NOT NULL,
          action TEXT NOT NULL,
          entity_type TEXT NOT NULL,
          entity_id TEXT,
          summary TEXT NOT NULL,
          metadata_json TEXT NOT NULL DEFAULT '{}',
          created_at TEXT NOT NULL
        )
      `,
      `
        CREATE INDEX IF NOT EXISTS idx_audit_events_organization_created
        ON audit_events(organization_id, created_at DESC)
      `,
    ],
    "write",
  );
  await recordMigration("008_audit_log");
}

async function migrateDemoTransactionsOnce(): Promise<void> {
  if (await hasMigration("009_demo_seed_once")) return;

  const result = await database.client.execute(
    "SELECT COUNT(*) AS total FROM transactions",
  );
  if (Number(result.rows[0]?.total ?? 0) > 0) {
    await recordMigration("009_demo_seed_once");
    return;
  }

  const accounts = await database.client.execute(
    `
      SELECT id, type
      FROM accounts
      WHERE is_demo = 1
      ORDER BY created_at, name
    `,
  );
  const bankAccount =
    accounts.rows.find((account) => String(account.type) === "bank") ??
    accounts.rows[0];

  // Los datos demo pueden haberse retirado intencionalmente. No deben
  // reaparecer ni producir movimientos con una cuenta inexistente.
  if (!bankAccount) {
    await recordMigration("009_demo_seed_once");
    return;
  }

  const bankAccountId = String(bankAccount.id);
  const cashAccountId = String(
    accounts.rows.find((account) => String(account.type) === "cash")?.id ??
      bankAccountId,
  );
  const now = new Date().toISOString();
  const demoTransactions: NewTransaction[] = [
    {
      description: "Venta proyecto sitio web",
      amountCents: 850_000_00,
      type: "income",
      category: "Ventas",
      accountId: bankAccountId,
      occurredOn: isoDateDaysAgo(2),
    },
    {
      description: "Mantenimiento mensual",
      amountCents: 325_000_00,
      type: "income",
      category: "Servicios",
      accountId: bankAccountId,
      occurredOn: isoDateDaysAgo(5),
    },
    {
      description: "Pago de planilla",
      amountCents: 410_000_00,
      type: "expense",
      category: "Nómina",
      accountId: bankAccountId,
      occurredOn: isoDateDaysAgo(7),
    },
    {
      description: "Campaña en redes",
      amountCents: 95_000_00,
      type: "expense",
      category: "Marketing",
      accountId: cashAccountId,
      occurredOn: isoDateDaysAgo(9),
    },
  ];

  await database.client.batch(
    demoTransactions.map((transaction) => ({
      sql: `
        INSERT INTO transactions
          (id, description, amount_cents, type, category, account_id, occurred_on, created_at, is_demo)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
      `,
      args: [
        crypto.randomUUID(),
        transaction.description,
        transaction.amountCents,
        transaction.type,
        transaction.category,
        transaction.accountId,
        transaction.occurredOn,
        now,
      ] satisfies InValue[],
    })),
    "write",
  );
  await recordMigration("009_demo_seed_once");
}

async function migrateReceivablesPayables(): Promise<void> {
  if (await hasMigration("010_receivables_payables")) return;

  await database.client.batch(
    [
      `
        CREATE TABLE IF NOT EXISTS open_items (
          id TEXT PRIMARY KEY,
          organization_id TEXT NOT NULL,
          kind TEXT NOT NULL CHECK (kind IN ('receivable', 'payable')),
          counterparty_name TEXT NOT NULL,
          concept TEXT NOT NULL,
          amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
          due_on TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'pending'
            CHECK (status IN ('pending', 'paid')),
          paid_at TEXT,
          payment_transaction_id TEXT REFERENCES transactions(id),
          created_at TEXT NOT NULL,
          CHECK (
            (status = 'pending' AND paid_at IS NULL AND payment_transaction_id IS NULL)
            OR
            (status = 'paid' AND paid_at IS NOT NULL AND payment_transaction_id IS NOT NULL)
          )
        )
      `,
      `
        CREATE INDEX IF NOT EXISTS idx_open_items_organization_due
        ON open_items(organization_id, status, due_on)
      `,
      `
        CREATE UNIQUE INDEX IF NOT EXISTS idx_open_items_payment_transaction
        ON open_items(payment_transaction_id)
        WHERE payment_transaction_id IS NOT NULL
      `,
    ],
    "write",
  );
  await recordMigration("010_receivables_payables");
}

async function migrateMonthlyBudgets(): Promise<void> {
  if (await hasMigration("011_monthly_budgets")) return;

  await database.client.batch(
    [
      `
        CREATE TABLE IF NOT EXISTS monthly_budgets (
          id TEXT PRIMARY KEY,
          organization_id TEXT NOT NULL,
          month TEXT NOT NULL CHECK (
            length(month) = 7
            AND substr(month, 5, 1) = '-'
          ),
          category TEXT NOT NULL,
          planned_cents INTEGER NOT NULL CHECK (planned_cents > 0),
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          UNIQUE (organization_id, month, category)
        )
      `,
      `
        CREATE INDEX IF NOT EXISTS idx_monthly_budgets_organization_month
        ON monthly_budgets(organization_id, month)
      `,
    ],
    "write",
  );
  await recordMigration("011_monthly_budgets");
}

async function migrateMonthlyClosures(): Promise<void> {
  if (await hasMigration("012_monthly_closures")) return;

  await database.client.batch(
    [
      `
        CREATE TABLE IF NOT EXISTS monthly_closures (
          id TEXT PRIMARY KEY,
          organization_id TEXT NOT NULL,
          month TEXT NOT NULL CHECK (
            length(month) = 7
            AND substr(month, 5, 1) = '-'
          ),
          income_cents INTEGER NOT NULL,
          expense_cents INTEGER NOT NULL,
          net_cash_flow_cents INTEGER NOT NULL,
          opening_balance_cents INTEGER NOT NULL,
          closing_balance_cents INTEGER NOT NULL,
          budget_planned_cents INTEGER NOT NULL,
          budget_spent_cents INTEGER NOT NULL,
          transaction_count INTEGER NOT NULL,
          closed_by_user_id TEXT NOT NULL,
          closed_by_name TEXT NOT NULL,
          closed_at TEXT NOT NULL,
          UNIQUE (organization_id, month)
        )
      `,
      `
        CREATE INDEX IF NOT EXISTS idx_monthly_closures_organization_month
        ON monthly_closures(organization_id, month DESC)
      `,
      `
        CREATE TRIGGER IF NOT EXISTS prevent_transaction_insert_closed_month
        BEFORE INSERT ON transactions
        WHEN EXISTS (
          SELECT 1
          FROM monthly_closures
          WHERE organization_id = NEW.organization_id
            AND month = substr(NEW.occurred_on, 1, 7)
        )
        BEGIN
          SELECT RAISE(ABORT, 'MONTH_CLOSED');
        END
      `,
      `
        CREATE TRIGGER IF NOT EXISTS prevent_transaction_delete_closed_month
        BEFORE DELETE ON transactions
        WHEN EXISTS (
          SELECT 1
          FROM monthly_closures
          WHERE organization_id = OLD.organization_id
            AND month = substr(OLD.occurred_on, 1, 7)
        )
        BEGIN
          SELECT RAISE(ABORT, 'MONTH_CLOSED');
        END
      `,
    ],
    "write",
  );
  await recordMigration("012_monthly_closures");
}

async function prepareDatabase(): Promise<void> {
  if (postgresEnabled) {
    await preparePostgresSchema(database.client);
    return;
  }
  await database.client.execute("PRAGMA foreign_keys = ON");
  await database.client.execute(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL
    )
  `);
  await migrateInitialSchema();
  await migrateAccounts();
  await correctLegacyDefaultAccount();
  await migrateDecisionJournal();
  await migrateMultiTenantData();
  await migrateTenantAccountNames();
  await migrateDemoDataFlags();
  await migrateAuditLog();
  await migrateDemoTransactionsOnce();
  await migrateReceivablesPayables();
  await migrateMonthlyBudgets();
  await migrateMonthlyClosures();
}

export async function getFinanceDatabase(): Promise<DatabaseClient> {
  database.ready ??= prepareDatabase();
  await database.ready;
  return database.client;
}

export async function getOrganizationMembershipRole(
  userId: string,
  organizationId: string,
): Promise<string | null> {
  const client = await getFinanceDatabase();
  const result = await client.execute({
    sql: `
      SELECT role
      FROM member
      WHERE "userId" = ? AND "organizationId" = ?
      LIMIT 1
    `,
    args: [userId, organizationId],
  });
  return result.rows[0] ? String(result.rows[0].role) : null;
}

export async function hasOrganizationMembership(
  userId: string,
  organizationId: string,
): Promise<boolean> {
  return (
    (await getOrganizationMembershipRole(userId, organizationId)) !== null
  );
}

export async function getOrganizationName(
  organizationId: string,
): Promise<string | null> {
  const client = await getFinanceDatabase();
  const result = await client.execute({
    sql: "SELECT name FROM organization WHERE id = ? LIMIT 1",
    args: [organizationId],
  });
  return result.rows[0] ? String(result.rows[0].name) : null;
}

export type OrganizationMemberDetails = {
  id: string;
  userId: string;
  name: string;
  email: string;
  role: string;
};

export async function getOrganizationMember(
  memberId: string,
  organizationId: string,
): Promise<OrganizationMemberDetails | null> {
  const client = await getFinanceDatabase();
  const result = await client.execute({
    sql: `
      SELECT
        m.id,
        m."userId" AS user_id,
        m.role,
        u.name,
        u.email
      FROM member m
      INNER JOIN "user" u ON u.id = m."userId"
      WHERE m.id = ? AND m."organizationId" = ?
      LIMIT 1
    `,
    args: [memberId, organizationId],
  });
  const row = result.rows[0];
  if (!row) return null;
  return {
    id: String(row.id),
    userId: String(row.user_id),
    name: String(row.name),
    email: String(row.email),
    role: String(row.role),
  };
}

export async function claimLegacyFinanceData(
  organizationId: string,
): Promise<void> {
  const client = await getFinanceDatabase();
  await client.batch(
    [
      {
        sql: "UPDATE accounts SET organization_id = ? WHERE organization_id IS NULL",
        args: [organizationId],
      },
      {
        sql: "UPDATE transactions SET organization_id = ? WHERE organization_id IS NULL",
        args: [organizationId],
      },
      {
        sql: "UPDATE decisions SET organization_id = ? WHERE organization_id IS NULL",
        args: [organizationId],
      },
    ],
    "write",
  );
}

export type DemoDataSummary = {
  accountCount: number;
  transactionCount: number;
};

export async function getDemoDataSummary(
  organizationId: string,
): Promise<DemoDataSummary> {
  const client = await getFinanceDatabase();
  const result = await client.execute({
    sql: `
      SELECT
        (SELECT COUNT(*) FROM accounts
          WHERE organization_id = ? AND is_demo = 1) AS account_count,
        (SELECT COUNT(*) FROM transactions
          WHERE organization_id = ? AND is_demo = 1) AS transaction_count
    `,
    args: [organizationId, organizationId],
  });
  return {
    accountCount: Number(result.rows[0]?.account_count ?? 0),
    transactionCount: Number(result.rows[0]?.transaction_count ?? 0),
  };
}

export async function deleteDemoFinanceData(
  organizationId: string,
): Promise<DemoDataSummary> {
  const client = await getFinanceDatabase();
  const before = await getDemoDataSummary(organizationId);

  try {
    await client.batch(
      [
        {
          sql: `
            DELETE FROM transactions
            WHERE organization_id = ? AND is_demo = 1
          `,
          args: [organizationId],
        },
        {
          sql: `
            DELETE FROM accounts
            WHERE organization_id = ?
              AND is_demo = 1
              AND NOT EXISTS (
                SELECT 1 FROM transactions
                WHERE transactions.account_id = accounts.id
              )
          `,
          args: [organizationId],
        },
        {
          sql: `
            UPDATE accounts
            SET opening_balance_cents = 0, is_demo = 0
            WHERE organization_id = ? AND is_demo = 1
          `,
          args: [organizationId],
        },
      ],
      "write",
    );
  } catch (error) {
    if (error instanceof Error && error.message.includes("MONTH_CLOSED")) {
      throw new MonthClosedError();
    }
    throw error;
  }

  return before;
}
