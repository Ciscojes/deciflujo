import { describe, expect, it } from "vitest";
import type { AccountRepository } from "../ports/account-repository";
import type { DecisionRepository } from "../ports/decision-repository";
import type { Decision, NewDecision } from "../../domain/decision";
import { reviewDueDecisions } from "./review-due-decisions";

function decision(id: string, reviewOn: string, status: Decision["status"] = "planned"): Decision {
  return {
    id,
    title: `Decisión ${id}`,
    addedMonthlyExpenseCents: 10_000,
    horizonMonths: 1,
    startingBalanceCents: 100_000,
    monthlyIncomeCents: 50_000,
    monthlyExpenseCents: 30_000,
    baselineFinalBalanceCents: 120_000,
    projectedFinalBalanceCents: 110_000,
    risk: "stable",
    status,
    reviewOn,
    actualBalanceCents: null,
    varianceCents: null,
    createdAt: "2026-06-01T00:00:00.000Z",
    reviewedAt: null,
  };
}

describe("reviewDueDecisions", () => {
  it("evalúa solo las decisiones pendientes cuya fecha ya llegó", async () => {
    const stored = [
      decision("due", "2026-08-02"),
      decision("future", "2026-08-03"),
      decision("reviewed", "2026-07-01", "reviewed"),
    ];
    const repository: DecisionRepository = {
      list: async () => stored,
      create: async (input: NewDecision) => decision("created", input.reviewOn),
      review: async (id, actualBalanceCents, reviewedAt) => {
        const current = stored.find((item) => item.id === id && item.status === "planned");
        if (!current) return null;
        current.status = "reviewed";
        current.actualBalanceCents = actualBalanceCents;
        current.varianceCents = actualBalanceCents - current.projectedFinalBalanceCents;
        current.reviewedAt = reviewedAt;
        return current;
      },
    };
    const accounts: AccountRepository = {
      list: async () => [
        { id: "bank", name: "Banco", type: "bank", openingBalanceCents: 0, balanceCents: 80_000, transactionCount: 0, createdAt: "2026-01-01T00:00:00.000Z" },
        { id: "cash", name: "Caja", type: "cash", openingBalanceCents: 0, balanceCents: 40_000, transactionCount: 0, createdAt: "2026-01-01T00:00:00.000Z" },
      ],
      create: async () => { throw new Error("No se usa en esta prueba"); },
      exists: async () => false,
    };

    const reviewed = await reviewDueDecisions(
      repository,
      accounts,
      new Date("2026-08-02T15:00:00.000Z"),
    );

    expect(reviewed).toHaveLength(1);
    expect(reviewed[0]).toMatchObject({
      id: "due",
      status: "reviewed",
      actualBalanceCents: 120_000,
      varianceCents: 10_000,
    });
    expect(stored.find((item) => item.id === "future")?.status).toBe("planned");
  });
});
