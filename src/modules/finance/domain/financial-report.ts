import type {
  TransactionCategory,
  TransactionType,
} from "./transaction";
import {
  calculateBudgetProgress,
  type BudgetStatus,
} from "./budget";

export type ReportTransaction = {
  id: string;
  description: string;
  amountCents: number;
  type: TransactionType;
  category: TransactionCategory;
  accountId: string;
  accountName: string;
  occurredOn: string;
};

export type BudgetVariance = {
  month: string;
  category: TransactionCategory;
  plannedCents: number;
  spentCents: number;
  varianceCents: number;
  usagePercentage: number;
  status: BudgetStatus;
};

export type FinancialReportSummary = {
  incomeCents: number;
  expenseCents: number;
  netCashFlowCents: number;
  transactionCount: number;
};

export function summarizeReportTransactions(
  transactions: ReportTransaction[],
): FinancialReportSummary {
  const incomeCents = transactions
    .filter((transaction) => transaction.type === "income")
    .reduce((total, transaction) => total + transaction.amountCents, 0);
  const expenseCents = transactions
    .filter((transaction) => transaction.type === "expense")
    .reduce((total, transaction) => total + transaction.amountCents, 0);
  return {
    incomeCents,
    expenseCents,
    netCashFlowCents: incomeCents - expenseCents,
    transactionCount: transactions.length,
  };
}

export function createBudgetVariance(input: {
  month: string;
  category: TransactionCategory;
  plannedCents: number;
  spentCents: number;
}): BudgetVariance {
  const progress = calculateBudgetProgress(
    input.plannedCents,
    input.spentCents,
  );
  return {
    ...input,
    varianceCents: input.plannedCents - input.spentCents,
    usagePercentage: progress.usagePercentage,
    status: progress.status,
  };
}
