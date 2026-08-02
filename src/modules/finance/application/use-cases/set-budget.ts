import {
  budgetInputSchema,
  type BudgetInput,
} from "../budget-input";
import type { BudgetRepository } from "../ports/budget-repository";

export async function setBudget(
  repository: BudgetRepository,
  input: BudgetInput,
) {
  return repository.set(budgetInputSchema.parse(input));
}
