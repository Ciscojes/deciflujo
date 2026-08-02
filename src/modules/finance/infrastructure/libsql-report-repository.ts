import "server-only";

import type { DatabaseValue } from "./database-client";
import type { ReportRepository } from "../application/ports/report-repository";
import type { ReportFilter } from "../application/report-filter";
import {
  createBudgetVariance,
  type BudgetVariance,
  type ReportTransaction,
} from "../domain/financial-report";
import type {
  TransactionCategory,
  TransactionType,
} from "../domain/transaction";
import { getFinanceDatabase } from "./libsql-database";

function mapTransaction(row: Record<string, DatabaseValue>): ReportTransaction {
  return {
    id: String(row.id),
    description: String(row.description),
    amountCents: Number(row.amount_cents),
    type: String(row.type) as TransactionType,
    category: String(row.category) as TransactionCategory,
    accountId: String(row.account_id),
    accountName: String(row.account_name),
    occurredOn: String(row.occurred_on),
  };
}

export class LibsqlReportRepository implements ReportRepository {
  constructor(private readonly organizationId: string) {}

  async listTransactions(filter: ReportFilter): Promise<ReportTransaction[]> {
    const database = await getFinanceDatabase();
    const clauses = [
      "t.organization_id = ?",
      "t.occurred_on >= ?",
      "t.occurred_on <= ?",
    ];
    const args: DatabaseValue[] = [this.organizationId, filter.from, filter.to];
    if (filter.type) {
      clauses.push("t.type = ?");
      args.push(filter.type);
    }
    if (filter.category) {
      clauses.push("t.category = ?");
      args.push(filter.category);
    }
    if (filter.accountId) {
      clauses.push("t.account_id = ?");
      args.push(filter.accountId);
    }

    const result = await database.execute({
      sql: `
        SELECT
          t.id, t.description, t.amount_cents, t.type, t.category,
          t.account_id, a.name AS account_name, t.occurred_on
        FROM transactions t
        JOIN accounts a
          ON a.id = t.account_id
          AND a.organization_id = t.organization_id
        WHERE ${clauses.join(" AND ")}
        ORDER BY t.occurred_on DESC, t.created_at DESC
      `,
      args,
    });
    return result.rows.map((row) => mapTransaction(row));
  }

  async listBudgetVariances(
    filter: ReportFilter,
  ): Promise<BudgetVariance[]> {
    const database = await getFinanceDatabase();
    const result = await database.execute({
      sql: `
        SELECT
          b.month,
          b.category,
          b.planned_cents,
          COALESCE(SUM(
            CASE WHEN t.type = 'expense' THEN t.amount_cents ELSE 0 END
          ), 0) AS spent_cents
        FROM monthly_budgets b
        LEFT JOIN transactions t
          ON t.organization_id = b.organization_id
          AND t.category = b.category
          AND substr(t.occurred_on, 1, 7) = b.month
        WHERE b.organization_id = ?
          AND b.month >= ?
          AND b.month <= ?
        GROUP BY b.id, b.month, b.category, b.planned_cents
        ORDER BY b.month DESC, b.category
      `,
      args: [
        this.organizationId,
        filter.from.slice(0, 7),
        filter.to.slice(0, 7),
      ],
    });
    return result.rows.map((row) =>
      createBudgetVariance({
        month: String(row.month),
        category: String(row.category) as TransactionCategory,
        plannedCents: Number(row.planned_cents),
        spentCents: Number(row.spent_cents),
      }),
    );
  }
}
