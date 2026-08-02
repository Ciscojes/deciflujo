import type { Transaction } from "./transaction";

export type FinancialSummary = {
  incomeCents: number;
  expenseCents: number;
  balanceCents: number;
  operatingMargin: number;
};

export function calculateFinancialSummary(
  transactions: Transaction[],
): FinancialSummary {
  const incomeCents = transactions
    .filter((transaction) => transaction.type === "income")
    .reduce((total, transaction) => total + transaction.amountCents, 0);

  const expenseCents = transactions
    .filter((transaction) => transaction.type === "expense")
    .reduce((total, transaction) => total + transaction.amountCents, 0);

  return {
    incomeCents,
    expenseCents,
    balanceCents: incomeCents - expenseCents,
    operatingMargin:
      incomeCents === 0 ? 0 : ((incomeCents - expenseCents) / incomeCents) * 100,
  };
}
