import type { MonthlyBudget } from "../../domain/budget";
import type { BudgetInput } from "../budget-input";

export interface BudgetRepository {
  list(month: string): Promise<MonthlyBudget[]>;
  set(input: BudgetInput): Promise<MonthlyBudget>;
}
