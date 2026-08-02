import "server-only";

import type { DatabaseValue } from "./database-client";
import type { AccountRepository } from "../application/ports/account-repository";
import type {
  AccountOverview,
  AccountType,
  NewAccount,
} from "../domain/account";
import { getFinanceDatabase } from "./libsql-database";

function mapAccount(row: Record<string, DatabaseValue>): AccountOverview {
  return {
    id: String(row.id),
    name: String(row.name),
    type: String(row.type) as AccountType,
    openingBalanceCents: Number(row.opening_balance_cents),
    balanceCents: Number(row.balance_cents),
    transactionCount: Number(row.transaction_count),
    createdAt: String(row.created_at),
  };
}

export class LibsqlAccountRepository implements AccountRepository {
  constructor(private readonly organizationId: string) {}

  async list(): Promise<AccountOverview[]> {
    const database = await getFinanceDatabase();
    const result = await database.execute({
      sql: `
      SELECT
        a.id,
        a.name,
        a.type,
        a.opening_balance_cents,
        a.created_at,
        a.opening_balance_cents + COALESCE(
          SUM(
            CASE
              WHEN t.type = 'income' THEN t.amount_cents
              WHEN t.type = 'expense' THEN -t.amount_cents
              ELSE 0
            END
          ),
          0
        ) AS balance_cents,
        COUNT(t.id) AS transaction_count
      FROM accounts a
      LEFT JOIN transactions t
        ON t.account_id = a.id
        AND t.organization_id = ?
      WHERE a.organization_id = ?
      GROUP BY
        a.id, a.name, a.type, a.opening_balance_cents, a.created_at
      ORDER BY
        CASE
          WHEN a.type = 'bank' THEN 0
          WHEN a.type = 'cash' THEN 1
          ELSE 2
        END,
        a.created_at,
        a.name
      `,
      args: [this.organizationId, this.organizationId],
    });

    return result.rows.map((row) => mapAccount(row));
  }

  async create(account: NewAccount): Promise<AccountOverview> {
    const database = await getFinanceDatabase();
    const entity: AccountOverview = {
      ...account,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      balanceCents: account.openingBalanceCents,
      transactionCount: 0,
    };

    await database.execute({
      sql: `
        INSERT INTO accounts
          (id, name, type, opening_balance_cents, created_at, organization_id)
        VALUES (?, ?, ?, ?, ?, ?)
      `,
      args: [
        entity.id,
        entity.name,
        entity.type,
        entity.openingBalanceCents,
        entity.createdAt,
        this.organizationId,
      ],
    });

    return entity;
  }

  async exists(id: string): Promise<boolean> {
    const database = await getFinanceDatabase();
    const result = await database.execute({
      sql: "SELECT 1 FROM accounts WHERE id = ? AND organization_id = ?",
      args: [id, this.organizationId],
    });
    return result.rows.length > 0;
  }
}
