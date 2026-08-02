import type { Decision, NewDecision } from "../../domain/decision";

export interface DecisionRepository {
  list(): Promise<Decision[]>;
  create(decision: NewDecision): Promise<Decision>;
  review(
    id: string,
    actualBalanceCents: number,
    reviewedAt: string,
  ): Promise<Decision | null>;
}
