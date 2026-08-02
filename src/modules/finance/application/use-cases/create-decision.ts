import type { AccountRepository } from "../ports/account-repository";
import type { DecisionRepository } from "../ports/decision-repository";
import type { TransactionRepository } from "../ports/transaction-repository";
import {
  decisionInputSchema,
  type DecisionInput,
} from "../decision-input";
import { calculateFinancialSummary } from "../../domain/financial-summary";
import { simulateRecurringExpense } from "../../domain/decision-engine";

export async function createDecision(
  decisionRepository: DecisionRepository,
  accountRepository: AccountRepository,
  transactionRepository: TransactionRepository,
  input: DecisionInput,
) {
  const decision = decisionInputSchema.parse(input);
  const [accounts, transactions] = await Promise.all([
    accountRepository.list(),
    transactionRepository.list(),
  ]);
  const startingBalanceCents = accounts.reduce(
    (total, account) => total + account.balanceCents,
    0,
  );
  const summary = calculateFinancialSummary(transactions);
  const simulation = simulateRecurringExpense({
    currentBalanceCents: startingBalanceCents,
    monthlyIncomeCents: summary.incomeCents,
    monthlyExpenseCents: summary.expenseCents,
    addedMonthlyExpenseCents: decision.addedMonthlyExpenseCents,
    months: decision.horizonMonths,
  });
  const reviewOn = new Date();
  reviewOn.setUTCMonth(reviewOn.getUTCMonth() + decision.horizonMonths);

  return decisionRepository.create({
    title: decision.title,
    addedMonthlyExpenseCents: decision.addedMonthlyExpenseCents,
    horizonMonths: decision.horizonMonths,
    startingBalanceCents,
    monthlyIncomeCents: summary.incomeCents,
    monthlyExpenseCents: summary.expenseCents,
    baselineFinalBalanceCents: simulation.baselineFinalBalanceCents,
    projectedFinalBalanceCents: simulation.scenarioFinalBalanceCents,
    risk: simulation.risk,
    reviewOn: reviewOn.toISOString().slice(0, 10),
  });
}
