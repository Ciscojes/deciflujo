import type {
  MonthlyClose,
  MonthlyCloseOverview,
} from "../../domain/monthly-close";

export type CloseMonthActor = {
  userId: string;
  userName: string;
};

export interface MonthlyCloseRepository {
  getOverview(months: number): Promise<MonthlyCloseOverview>;
  close(month: string, actor: CloseMonthActor): Promise<MonthlyClose>;
  reopen(month: string): Promise<boolean>;
}
