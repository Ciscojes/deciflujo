import type { TransactionCategory } from "./transaction";

export const budgetStatuses = ["healthy", "warning", "exceeded"] as const;
export type BudgetStatus = (typeof budgetStatuses)[number];

export type MonthlyBudget = {
  id: string | null;
  month: string;
  category: TransactionCategory;
  plannedCents: number;
  spentCents: number;
  remainingCents: number;
  usagePercentage: number;
  status: BudgetStatus;
  createdAt: string | null;
  updatedAt: string | null;
};

export type BudgetSummary = {
  plannedCents: number;
  spentCents: number;
  remainingCents: number;
  usagePercentage: number;
  configuredCount: number;
  warningCount: number;
  exceededCount: number;
};

export function calculateBudgetProgress(
  plannedCents: number,
  spentCents: number,
): Pick<
  MonthlyBudget,
  "remainingCents" | "usagePercentage" | "status"
> {
  const remainingCents = plannedCents - spentCents;
  const usagePercentage =
    plannedCents > 0 ? (spentCents / plannedCents) * 100 : 0;
  const status: BudgetStatus =
    plannedCents > 0 && spentCents > plannedCents
      ? "exceeded"
      : plannedCents > 0 && usagePercentage >= 80
        ? "warning"
        : "healthy";
  return { remainingCents, usagePercentage, status };
}

export function summarizeBudgets(budgets: MonthlyBudget[]): BudgetSummary {
  const configured = budgets.filter((budget) => budget.plannedCents > 0);
  const plannedCents = configured.reduce(
    (total, budget) => total + budget.plannedCents,
    0,
  );
  const spentCents = configured.reduce(
    (total, budget) => total + budget.spentCents,
    0,
  );
  return {
    plannedCents,
    spentCents,
    remainingCents: plannedCents - spentCents,
    usagePercentage: plannedCents > 0 ? (spentCents / plannedCents) * 100 : 0,
    configuredCount: configured.length,
    warningCount: configured.filter((budget) => budget.status === "warning")
      .length,
    exceededCount: configured.filter((budget) => budget.status === "exceeded")
      .length,
  };
}
