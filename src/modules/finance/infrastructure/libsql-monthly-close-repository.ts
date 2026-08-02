import "server-only";

import type { DatabaseValue } from "./database-client";
import type {
  CloseMonthActor,
  MonthlyCloseRepository,
} from "../application/ports/monthly-close-repository";
import {
  MonthAlreadyClosedError,
  monthSequence,
  type MonthlyClose,
  type MonthlyCloseOverview,
  type MonthlyTrend,
} from "../domain/monthly-close";
import { getFinanceDatabase } from "./libsql-database";

function mapClose(row: Record<string, DatabaseValue>): MonthlyClose {
  return {
    id: String(row.id),
    month: String(row.month),
    incomeCents: Number(row.income_cents),
    expenseCents: Number(row.expense_cents),
    netCashFlowCents: Number(row.net_cash_flow_cents),
    openingBalanceCents: Number(row.opening_balance_cents),
    closingBalanceCents: Number(row.closing_balance_cents),
    budgetPlannedCents: Number(row.budget_planned_cents),
    budgetSpentCents: Number(row.budget_spent_cents),
    transactionCount: Number(row.transaction_count),
    isClosed: true,
    closedByUserId: String(row.closed_by_user_id),
    closedByName: String(row.closed_by_name),
    closedAt: String(row.closed_at),
  };
}

export class LibsqlMonthlyCloseRepository implements MonthlyCloseRepository {
  constructor(private readonly organizationId: string) {}

  async getOverview(months: number): Promise<MonthlyCloseOverview> {
    const database = await getFinanceDatabase();
    const sequence = monthSequence(months);
    const firstMonth = sequence[0];
    const [trendResult, closeResult] = await Promise.all([
      database.execute({
        sql: `
          SELECT
            substr(occurred_on, 1, 7) AS month,
            SUM(CASE WHEN type = 'income' THEN amount_cents ELSE 0 END) AS income_cents,
            SUM(CASE WHEN type = 'expense' THEN amount_cents ELSE 0 END) AS expense_cents,
            COUNT(*) AS transaction_count
          FROM transactions
          WHERE organization_id = ?
            AND occurred_on >= ? || '-01'
          GROUP BY substr(occurred_on, 1, 7)
        `,
        args: [this.organizationId, firstMonth],
      }),
      database.execute({
        sql: `
          SELECT *
          FROM monthly_closures
          WHERE organization_id = ?
          ORDER BY month DESC
        `,
        args: [this.organizationId],
      }),
    ]);

    const closes = closeResult.rows.map((row) => mapClose(row));
    const closedMonths = new Set(closes.map((close) => close.month));
    const totals = new Map(
      trendResult.rows.map((row) => [
        String(row.month),
        {
          incomeCents: Number(row.income_cents),
          expenseCents: Number(row.expense_cents),
          transactionCount: Number(row.transaction_count),
        },
      ]),
    );
    const trends: MonthlyTrend[] = sequence.map((month) => {
      const total = totals.get(month) ?? {
        incomeCents: 0,
        expenseCents: 0,
        transactionCount: 0,
      };
      return {
        month,
        ...total,
        netCashFlowCents: total.incomeCents - total.expenseCents,
        isClosed: closedMonths.has(month),
      };
    });

    return { trends, closes };
  }

  async close(month: string, actor: CloseMonthActor): Promise<MonthlyClose> {
    const database = await getFinanceDatabase();
    const transaction = await database.transaction("write");
    try {
      const existing = await transaction.execute({
        sql: `
          SELECT 1 FROM monthly_closures
          WHERE organization_id = ? AND month = ?
        `,
        args: [this.organizationId, month],
      });
      if (existing.rows.length > 0) throw new MonthAlreadyClosedError();

      const [movementResult, balanceResult, budgetResult] = await Promise.all([
        transaction.execute({
          sql: `
            SELECT
              COALESCE(SUM(CASE WHEN type = 'income' THEN amount_cents ELSE 0 END), 0) AS income_cents,
              COALESCE(SUM(CASE WHEN type = 'expense' THEN amount_cents ELSE 0 END), 0) AS expense_cents,
              COUNT(*) AS transaction_count
            FROM transactions
            WHERE organization_id = ?
              AND substr(occurred_on, 1, 7) = ?
          `,
          args: [this.organizationId, month],
        }),
        transaction.execute({
          sql: `
            SELECT
              COALESCE((
                SELECT SUM(opening_balance_cents)
                FROM accounts
                WHERE organization_id = ?
              ), 0) + COALESCE(SUM(
                CASE WHEN type = 'income' THEN amount_cents ELSE -amount_cents END
              ), 0) AS opening_balance_cents
            FROM transactions
            WHERE organization_id = ?
              AND occurred_on < ? || '-01'
          `,
          args: [this.organizationId, this.organizationId, month],
        }),
        transaction.execute({
          sql: `
            SELECT
              COALESCE(SUM(b.planned_cents), 0) AS planned_cents,
              COALESCE(SUM((
                SELECT SUM(t.amount_cents)
                FROM transactions t
                WHERE t.organization_id = b.organization_id
                  AND t.type = 'expense'
                  AND t.category = b.category
                  AND substr(t.occurred_on, 1, 7) = b.month
              )), 0) AS spent_cents
            FROM monthly_budgets b
            WHERE b.organization_id = ? AND b.month = ?
          `,
          args: [this.organizationId, month],
        }),
      ]);

      const incomeCents = Number(movementResult.rows[0]?.income_cents ?? 0);
      const expenseCents = Number(movementResult.rows[0]?.expense_cents ?? 0);
      const openingBalanceCents = Number(
        balanceResult.rows[0]?.opening_balance_cents ?? 0,
      );
      const entity: MonthlyClose = {
        id: crypto.randomUUID(),
        month,
        incomeCents,
        expenseCents,
        netCashFlowCents: incomeCents - expenseCents,
        openingBalanceCents,
        closingBalanceCents: openingBalanceCents + incomeCents - expenseCents,
        budgetPlannedCents: Number(
          budgetResult.rows[0]?.planned_cents ?? 0,
        ),
        budgetSpentCents: Number(budgetResult.rows[0]?.spent_cents ?? 0),
        transactionCount: Number(
          movementResult.rows[0]?.transaction_count ?? 0,
        ),
        isClosed: true,
        closedByUserId: actor.userId,
        closedByName: actor.userName,
        closedAt: new Date().toISOString(),
      };

      await transaction.execute({
        sql: `
          INSERT INTO monthly_closures (
            id, organization_id, month, income_cents, expense_cents,
            net_cash_flow_cents, opening_balance_cents, closing_balance_cents,
            budget_planned_cents, budget_spent_cents, transaction_count,
            closed_by_user_id, closed_by_name, closed_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        args: [
          entity.id,
          this.organizationId,
          entity.month,
          entity.incomeCents,
          entity.expenseCents,
          entity.netCashFlowCents,
          entity.openingBalanceCents,
          entity.closingBalanceCents,
          entity.budgetPlannedCents,
          entity.budgetSpentCents,
          entity.transactionCount,
          entity.closedByUserId,
          entity.closedByName,
          entity.closedAt,
        ],
      });
      await transaction.commit();
      return entity;
    } catch (error) {
      await transaction.rollback();
      throw error;
    } finally {
      transaction.close();
    }
  }

  async reopen(month: string): Promise<boolean> {
    const database = await getFinanceDatabase();
    const result = await database.execute({
      sql: `
        DELETE FROM monthly_closures
        WHERE organization_id = ? AND month = ?
      `,
      args: [this.organizationId, month],
    });
    return result.rowsAffected === 1;
  }
}
