import "server-only";

import type { DatabaseValue } from "./database-client";
import type { DecisionRepository } from "../application/ports/decision-repository";
import type {
  Decision,
  DecisionStatus,
  NewDecision,
} from "../domain/decision";
import type { ScenarioRisk } from "../domain/decision-engine";
import { getFinanceDatabase } from "./libsql-database";

function mapDecision(row: Record<string, DatabaseValue>): Decision {
  return {
    id: String(row.id),
    title: String(row.title),
    addedMonthlyExpenseCents: Number(row.added_monthly_expense_cents),
    horizonMonths: Number(row.horizon_months),
    startingBalanceCents: Number(row.starting_balance_cents),
    monthlyIncomeCents: Number(row.monthly_income_cents),
    monthlyExpenseCents: Number(row.monthly_expense_cents),
    baselineFinalBalanceCents: Number(row.baseline_final_balance_cents),
    projectedFinalBalanceCents: Number(row.projected_final_balance_cents),
    risk: String(row.risk) as ScenarioRisk,
    status: String(row.status) as DecisionStatus,
    reviewOn: String(row.review_on),
    actualBalanceCents:
      row.actual_balance_cents === null
        ? null
        : Number(row.actual_balance_cents),
    varianceCents:
      row.variance_cents === null ? null : Number(row.variance_cents),
    createdAt: String(row.created_at),
    reviewedAt:
      row.reviewed_at === null ? null : String(row.reviewed_at),
  };
}

export class LibsqlDecisionRepository implements DecisionRepository {
  constructor(private readonly organizationId: string) {}

  async list(): Promise<Decision[]> {
    const database = await getFinanceDatabase();
    const result = await database.execute({
      sql: `
      SELECT *
      FROM decisions
      WHERE organization_id = ?
      ORDER BY
        CASE WHEN status = 'planned' THEN 0 ELSE 1 END,
        created_at DESC
      `,
      args: [this.organizationId],
    });
    return result.rows.map((row) => mapDecision(row));
  }

  async create(decision: NewDecision): Promise<Decision> {
    const database = await getFinanceDatabase();
    const entity: Decision = {
      ...decision,
      id: crypto.randomUUID(),
      status: "planned",
      actualBalanceCents: null,
      varianceCents: null,
      createdAt: new Date().toISOString(),
      reviewedAt: null,
    };

    await database.execute({
      sql: `
        INSERT INTO decisions (
          id, title, added_monthly_expense_cents, horizon_months,
          starting_balance_cents, monthly_income_cents, monthly_expense_cents,
          baseline_final_balance_cents, projected_final_balance_cents,
          risk, status, review_on, actual_balance_cents, variance_cents,
          created_at, reviewed_at, organization_id
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      args: [
        entity.id,
        entity.title,
        entity.addedMonthlyExpenseCents,
        entity.horizonMonths,
        entity.startingBalanceCents,
        entity.monthlyIncomeCents,
        entity.monthlyExpenseCents,
        entity.baselineFinalBalanceCents,
        entity.projectedFinalBalanceCents,
        entity.risk,
        entity.status,
        entity.reviewOn,
        entity.actualBalanceCents,
        entity.varianceCents,
        entity.createdAt,
        entity.reviewedAt,
        this.organizationId,
      ],
    });

    return entity;
  }

  async review(
    id: string,
    actualBalanceCents: number,
    reviewedAt: string,
  ): Promise<Decision | null> {
    const database = await getFinanceDatabase();
    const update = await database.execute({
      sql: `
        UPDATE decisions
        SET
          status = 'reviewed',
          actual_balance_cents = ?,
          variance_cents = ? - projected_final_balance_cents,
          reviewed_at = ?
        WHERE id = ? AND organization_id = ? AND status = 'planned'
      `,
      args: [
        actualBalanceCents,
        actualBalanceCents,
        reviewedAt,
        id,
        this.organizationId,
      ],
    });
    if (update.rowsAffected !== 1) return null;

    const result = await database.execute({
      sql: "SELECT * FROM decisions WHERE id = ? AND organization_id = ?",
      args: [id, this.organizationId],
    });
    return mapDecision(result.rows[0]);
  }
}
