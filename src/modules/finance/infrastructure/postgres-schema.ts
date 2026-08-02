import "server-only";

import type { DatabaseClient } from "./database-client";

const postgresSchemaVersion = "013_postgres_baseline";

export async function preparePostgresSchema(
  database: DatabaseClient,
): Promise<void> {
  await database.execute(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL
    )
  `);
  const applied = await database.execute({
    sql: "SELECT 1 FROM schema_migrations WHERE id = ?",
    args: [postgresSchemaVersion],
  });
  if (applied.rows.length > 0) return;

  const now = new Date().toISOString();
  const bankAccountId = crypto.randomUUID();
  const cashAccountId = crypto.randomUUID();
  const dateDaysAgo = (days: number) => {
    const date = new Date();
    date.setUTCDate(date.getUTCDate() - days);
    return date.toISOString().slice(0, 10);
  };

  await database.batch([
    `CREATE TABLE IF NOT EXISTS accounts (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('bank', 'cash', 'card')),
      opening_balance_cents BIGINT NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      organization_id TEXT,
      is_demo INTEGER NOT NULL DEFAULT 0 CHECK (is_demo IN (0, 1)),
      UNIQUE (organization_id, name)
    )`,
    `CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      description TEXT NOT NULL,
      amount_cents BIGINT NOT NULL CHECK (amount_cents > 0),
      type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
      category TEXT NOT NULL,
      occurred_on TEXT NOT NULL,
      created_at TEXT NOT NULL,
      account_id TEXT REFERENCES accounts(id),
      organization_id TEXT,
      is_demo INTEGER NOT NULL DEFAULT 0 CHECK (is_demo IN (0, 1))
    )`,
    `CREATE TABLE IF NOT EXISTS decisions (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      added_monthly_expense_cents BIGINT NOT NULL CHECK (added_monthly_expense_cents > 0),
      horizon_months INTEGER NOT NULL CHECK (horizon_months BETWEEN 1 AND 24),
      starting_balance_cents BIGINT NOT NULL,
      monthly_income_cents BIGINT NOT NULL,
      monthly_expense_cents BIGINT NOT NULL,
      baseline_final_balance_cents BIGINT NOT NULL,
      projected_final_balance_cents BIGINT NOT NULL,
      risk TEXT NOT NULL CHECK (risk IN ('stable', 'attention', 'critical')),
      status TEXT NOT NULL CHECK (status IN ('planned', 'reviewed')),
      review_on TEXT NOT NULL,
      actual_balance_cents BIGINT,
      variance_cents BIGINT,
      created_at TEXT NOT NULL,
      reviewed_at TEXT,
      organization_id TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS audit_events (
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
    )`,
    `CREATE TABLE IF NOT EXISTS open_items (
      id TEXT PRIMARY KEY,
      organization_id TEXT NOT NULL,
      kind TEXT NOT NULL CHECK (kind IN ('receivable', 'payable')),
      counterparty_name TEXT NOT NULL,
      concept TEXT NOT NULL,
      amount_cents BIGINT NOT NULL CHECK (amount_cents > 0),
      due_on TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid')),
      paid_at TEXT,
      payment_transaction_id TEXT REFERENCES transactions(id),
      created_at TEXT NOT NULL,
      CHECK (
        (status = 'pending' AND paid_at IS NULL AND payment_transaction_id IS NULL)
        OR (status = 'paid' AND paid_at IS NOT NULL AND payment_transaction_id IS NOT NULL)
      )
    )`,
    `CREATE TABLE IF NOT EXISTS monthly_budgets (
      id TEXT PRIMARY KEY,
      organization_id TEXT NOT NULL,
      month TEXT NOT NULL CHECK (length(month) = 7 AND substr(month, 5, 1) = '-'),
      category TEXT NOT NULL,
      planned_cents BIGINT NOT NULL CHECK (planned_cents > 0),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE (organization_id, month, category)
    )`,
    `CREATE TABLE IF NOT EXISTS monthly_closures (
      id TEXT PRIMARY KEY,
      organization_id TEXT NOT NULL,
      month TEXT NOT NULL CHECK (length(month) = 7 AND substr(month, 5, 1) = '-'),
      income_cents BIGINT NOT NULL,
      expense_cents BIGINT NOT NULL,
      net_cash_flow_cents BIGINT NOT NULL,
      opening_balance_cents BIGINT NOT NULL,
      closing_balance_cents BIGINT NOT NULL,
      budget_planned_cents BIGINT NOT NULL,
      budget_spent_cents BIGINT NOT NULL,
      transaction_count INTEGER NOT NULL,
      closed_by_user_id TEXT NOT NULL,
      closed_by_name TEXT NOT NULL,
      closed_at TEXT NOT NULL,
      UNIQUE (organization_id, month)
    )`,
    "CREATE INDEX IF NOT EXISTS idx_accounts_organization ON accounts(organization_id)",
    "CREATE INDEX IF NOT EXISTS idx_transactions_account_id ON transactions(account_id)",
    "CREATE INDEX IF NOT EXISTS idx_transactions_organization ON transactions(organization_id)",
    "CREATE INDEX IF NOT EXISTS idx_decisions_organization ON decisions(organization_id)",
    "CREATE INDEX IF NOT EXISTS idx_decisions_status_review ON decisions(status, review_on)",
    "CREATE INDEX IF NOT EXISTS idx_audit_events_organization_created ON audit_events(organization_id, created_at DESC)",
    "CREATE INDEX IF NOT EXISTS idx_open_items_organization_due ON open_items(organization_id, status, due_on)",
    "CREATE UNIQUE INDEX IF NOT EXISTS idx_open_items_payment_transaction ON open_items(payment_transaction_id) WHERE payment_transaction_id IS NOT NULL",
    "CREATE INDEX IF NOT EXISTS idx_monthly_budgets_organization_month ON monthly_budgets(organization_id, month)",
    "CREATE INDEX IF NOT EXISTS idx_monthly_closures_organization_month ON monthly_closures(organization_id, month DESC)",
    `CREATE OR REPLACE FUNCTION deciflujo_reject_closed_month()
      RETURNS TRIGGER AS $$
      BEGIN
        IF TG_OP = 'DELETE' THEN
          IF EXISTS (
            SELECT 1 FROM monthly_closures
            WHERE organization_id = OLD.organization_id
              AND month = substr(OLD.occurred_on, 1, 7)
          ) THEN
            RAISE EXCEPTION 'MONTH_CLOSED';
          END IF;
          RETURN OLD;
        END IF;
        IF EXISTS (
          SELECT 1 FROM monthly_closures
          WHERE organization_id = NEW.organization_id
            AND month = substr(NEW.occurred_on, 1, 7)
        ) THEN
          RAISE EXCEPTION 'MONTH_CLOSED';
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql`,
    `DROP TRIGGER IF EXISTS prevent_transaction_insert_closed_month ON transactions`,
    `CREATE TRIGGER prevent_transaction_insert_closed_month
      BEFORE INSERT ON transactions
      FOR EACH ROW EXECUTE FUNCTION deciflujo_reject_closed_month()`,
    `DROP TRIGGER IF EXISTS prevent_transaction_delete_closed_month ON transactions`,
    `CREATE TRIGGER prevent_transaction_delete_closed_month
      BEFORE DELETE ON transactions
      FOR EACH ROW EXECUTE FUNCTION deciflujo_reject_closed_month()`,
    {
      sql: `INSERT INTO accounts
        (id, name, type, opening_balance_cents, created_at, organization_id, is_demo)
        VALUES (?, 'Cuenta principal', 'bank', 25000000, ?, NULL, 1)`,
      args: [bankAccountId, now],
    },
    {
      sql: `INSERT INTO accounts
        (id, name, type, opening_balance_cents, created_at, organization_id, is_demo)
        VALUES (?, 'Caja chica', 'cash', 5000000, ?, NULL, 1)`,
      args: [cashAccountId, now],
    },
    ...[
      ["Venta proyecto sitio web", 85000000, "income", "Ventas", bankAccountId, dateDaysAgo(2)],
      ["Mantenimiento mensual", 32500000, "income", "Servicios", bankAccountId, dateDaysAgo(5)],
      ["Pago de planilla", 41000000, "expense", "Nómina", bankAccountId, dateDaysAgo(7)],
      ["Campaña en redes", 9500000, "expense", "Marketing", cashAccountId, dateDaysAgo(9)],
    ].map(([description, amount, type, category, accountId, occurredOn]) => ({
      sql: `INSERT INTO transactions
        (id, description, amount_cents, type, category, account_id,
          occurred_on, created_at, organization_id, is_demo)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, 1)`,
      args: [
        crypto.randomUUID(),
        description,
        amount,
        type,
        category,
        accountId,
        occurredOn,
        now,
      ],
    })),
    {
      sql: "INSERT INTO schema_migrations (id, applied_at) VALUES (?, ?)",
      args: [postgresSchemaVersion, now],
    },
  ]);
}
