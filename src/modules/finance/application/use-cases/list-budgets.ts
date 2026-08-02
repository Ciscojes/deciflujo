import { budgetMonthSchema } from "../budget-input";
import type { BudgetRepository } from "../ports/budget-repository";

export async function listBudgets(
  repository: BudgetRepository,
  month: string,
) {
  return repository.list(budgetMonthSchema.parse(month));
}
