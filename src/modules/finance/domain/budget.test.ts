import { describe, expect, it } from "vitest";
import {
  calculateBudgetProgress,
  summarizeBudgets,
  type MonthlyBudget,
} from "./budget";

function budget(
  overrides: Partial<MonthlyBudget> &
    Pick<MonthlyBudget, "plannedCents" | "spentCents" | "status">,
): MonthlyBudget {
  const progress = calculateBudgetProgress(
    overrides.plannedCents,
    overrides.spentCents,
  );
  return {
    id: crypto.randomUUID(),
    month: "2026-07",
    category: "Operación",
    createdAt: "2026-07-01T12:00:00.000Z",
    updatedAt: "2026-07-01T12:00:00.000Z",
    ...progress,
    ...overrides,
  };
}

describe("progreso de presupuesto", () => {
  it("clasifica como saludable, advertencia o excedido", () => {
    expect(calculateBudgetProgress(100_000, 50_000).status).toBe("healthy");
    expect(calculateBudgetProgress(100_000, 80_000).status).toBe("warning");
    expect(calculateBudgetProgress(100_000, 100_001).status).toBe("exceeded");
  });

  it("conserva el exceso como disponible negativo", () => {
    const progress = calculateBudgetProgress(100_000, 125_000);
    expect(progress.remainingCents).toBe(-25_000);
    expect(progress.usagePercentage).toBe(125);
  });

  it("resume únicamente categorías con un límite configurado", () => {
    const summary = summarizeBudgets([
      budget({ plannedCents: 100_000, spentCents: 85_000, status: "warning" }),
      budget({ plannedCents: 50_000, spentCents: 60_000, status: "exceeded" }),
      budget({ plannedCents: 0, spentCents: 999_000, status: "healthy" }),
    ]);
    expect(summary).toEqual({
      plannedCents: 150_000,
      spentCents: 145_000,
      remainingCents: 5_000,
      usagePercentage: (145_000 / 150_000) * 100,
      configuredCount: 2,
      warningCount: 1,
      exceededCount: 1,
    });
  });
});
