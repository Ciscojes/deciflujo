import type { ScenarioRisk } from "./decision-engine";

export const decisionStatuses = ["planned", "reviewed"] as const;
export type DecisionStatus = (typeof decisionStatuses)[number];

export type Decision = {
  id: string;
  title: string;
  addedMonthlyExpenseCents: number;
  horizonMonths: number;
  startingBalanceCents: number;
  monthlyIncomeCents: number;
  monthlyExpenseCents: number;
  baselineFinalBalanceCents: number;
  projectedFinalBalanceCents: number;
  risk: ScenarioRisk;
  status: DecisionStatus;
  reviewOn: string;
  actualBalanceCents: number | null;
  varianceCents: number | null;
  createdAt: string;
  reviewedAt: string | null;
};

export type NewDecision = Omit<
  Decision,
  "id" | "status" | "actualBalanceCents" | "varianceCents" | "createdAt" | "reviewedAt"
>;

export function calculateDecisionVariance(
  expectedBalanceCents: number,
  actualBalanceCents: number,
): number {
  return actualBalanceCents - expectedBalanceCents;
}
