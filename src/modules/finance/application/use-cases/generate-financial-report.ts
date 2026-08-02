import {
  summarizeReportTransactions,
} from "../../domain/financial-report";
import {
  reportFilterSchema,
  type ReportFilter,
} from "../report-filter";
import type { ReportRepository } from "../ports/report-repository";

export async function generateFinancialReport(
  repository: ReportRepository,
  input: ReportFilter,
) {
  const filter = reportFilterSchema.parse(input);
  const [transactions, budgetVariances] = await Promise.all([
    repository.listTransactions(filter),
    repository.listBudgetVariances(filter),
  ]);
  return {
    filter,
    summary: summarizeReportTransactions(transactions),
    transactions,
    budgetVariances,
  };
}

export type FinancialReport = Awaited<
  ReturnType<typeof generateFinancialReport>
>;
