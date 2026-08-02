import "server-only";

import type { DatabaseValue } from "./database-client";
import type { BudgetRepository } from "../application/ports/budget-repository";
import type { BudgetInput } from "../application/budget-input";
import {
  calculateBudgetProgress,
  type MonthlyBudget,
} from "../domain/budget";
import {
  transactionCategories,
  type TransactionCategory,
} from "../domain/transaction";
import { getFinanceDatabase } from "./libsql-database";

function mapRow(row: Record<string, DatabaseValue>): MonthlyBudget {
  const plannedCents = Number(row.planned_cents);
  const spentCents = Number(row.spent_cents);
  return {
    id: row.id === null ? null : String(row.id),
    month: String(row.month),
    category: String(row.category) as TransactionCategory,
    plannedCents,
    spentCents,
    ...calculateBudgetProgress(plannedCents, spentCents),
    createdAt: row.created_at === null ? null : String(row.created_at),
    updatedAt: row.updated_at === null ? null : String(row.updated_at),
  };
}

export class LibsqlBudgetRepository implements BudgetRepository {
  constructor(private readonly organizationId: string) {}

  async list(month: string): Promise<MonthlyBudget[]> {
    const database = await getFinanceDatabase();
    const categoryValues = transactionCategories
      .map((_, index) => `(?, ${index})`)
      .join(", ");
    const result = await database.execute({
      sql: `
        WITH categories(category, position) AS (VALUES ${categoryValues}),
        spending AS (
          SELECT category, SUM(amount_cents) AS spent_cents
          FROM transactions
          WHERE organization_id = ?
            AND type = 'expense'
            AND substr(occurred_on, 1, 7) = ?
          GROUP BY category
        )
        SELECT
          b.id,
          ? AS month,
          c.category,
          COALESCE(b.planned_cents, 0) AS planned_cents,
          COALESCE(s.spent_cents, 0) AS spent_cents,
          b.created_at,
          b.updated_at
        FROM categories c
        LEFT JOIN monthly_budgets b
          ON b.organization_id = ?
          AND b.month = ?
          AND b.category = c.category
        LEFT JOIN spending s ON s.category = c.category
        ORDER BY c.position
      `,
      args: [
        ...transactionCategories,
        this.organizationId,
        month,
        month,
        this.organizationId,
        month,
      ],
    });
    return result.rows.map((row) => mapRow(row));
  }

  async set(input: BudgetInput): Promise<MonthlyBudget> {
    const database = await getFinanceDatabase();
    const now = new Date().toISOString();
    await database.execute({
      sql: `
        INSERT INTO monthly_budgets (
          id, organization_id, month, category, planned_cents,
          created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(organization_id, month, category)
        DO UPDATE SET
          planned_cents = excluded.planned_cents,
          updated_at = excluded.updated_at
      `,
      args: [
        crypto.randomUUID(),
        this.organizationId,
        input.month,
        input.category,
        input.plannedCents,
        now,
        now,
      ],
    });
    const budgets = await this.list(input.month);
    const budget = budgets.find(
      (current) => current.category === input.category,
    );
    if (!budget) throw new Error("Could not read saved budget.");
    return budget;
  }
}
