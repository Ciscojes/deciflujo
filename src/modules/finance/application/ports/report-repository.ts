import type {
  BudgetVariance,
  ReportTransaction,
} from "../../domain/financial-report";
import type { ReportFilter } from "../report-filter";

export interface ReportRepository {
  listTransactions(filter: ReportFilter): Promise<ReportTransaction[]>;
  listBudgetVariances(filter: ReportFilter): Promise<BudgetVariance[]>;
}
