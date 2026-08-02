import {
  MonthlyCloseNotFoundError,
  normalizeTrendWindow,
  validateCloseMonth,
} from "../../domain/monthly-close";
import type {
  CloseMonthActor,
  MonthlyCloseRepository,
} from "../ports/monthly-close-repository";

export function getMonthlyCloseOverview(
  repository: MonthlyCloseRepository,
  months: number,
) {
  return repository.getOverview(normalizeTrendWindow(months));
}

export function closeMonth(
  repository: MonthlyCloseRepository,
  month: string,
  actor: CloseMonthActor,
) {
  return repository.close(validateCloseMonth(month), actor);
}

export async function reopenMonth(
  repository: MonthlyCloseRepository,
  month: string,
): Promise<void> {
  const reopened = await repository.reopen(validateCloseMonth(month));
  if (!reopened) throw new MonthlyCloseNotFoundError();
}
