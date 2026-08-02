export type MonthlyTrend = {
  month: string;
  incomeCents: number;
  expenseCents: number;
  netCashFlowCents: number;
  transactionCount: number;
  isClosed: boolean;
};

export type MonthlyClose = MonthlyTrend & {
  id: string;
  openingBalanceCents: number;
  closingBalanceCents: number;
  budgetPlannedCents: number;
  budgetSpentCents: number;
  closedByUserId: string;
  closedByName: string;
  closedAt: string;
};

export type MonthlyCloseOverview = {
  trends: MonthlyTrend[];
  closes: MonthlyClose[];
};

const monthPattern = /^\d{4}-(0[1-9]|1[0-2])$/;

export class InvalidCloseMonthError extends Error {
  constructor(message = "El mes del cierre no es válido.") {
    super(message);
    this.name = "InvalidCloseMonthError";
  }
}

export class FutureCloseMonthError extends Error {
  constructor() {
    super("No se puede cerrar un mes futuro.");
    this.name = "FutureCloseMonthError";
  }
}

export class MonthAlreadyClosedError extends Error {
  constructor() {
    super("El mes seleccionado ya está cerrado.");
    this.name = "MonthAlreadyClosedError";
  }
}

export class MonthlyCloseNotFoundError extends Error {
  constructor() {
    super("El cierre mensual solicitado no existe.");
    this.name = "MonthlyCloseNotFoundError";
  }
}

export class MonthClosedError extends Error {
  constructor() {
    super("El mes está cerrado. Reabre el período antes de modificar sus movimientos.");
    this.name = "MonthClosedError";
  }
}

export function currentUtcMonth(now = new Date()): string {
  return now.toISOString().slice(0, 7);
}

export function validateCloseMonth(
  value: string,
  now = new Date(),
): string {
  if (!monthPattern.test(value)) throw new InvalidCloseMonthError();
  if (value > currentUtcMonth(now)) throw new FutureCloseMonthError();
  return value;
}

export function normalizeTrendWindow(value: number): number {
  if (!Number.isFinite(value)) return 12;
  return Math.min(24, Math.max(3, Math.trunc(value)));
}

export function monthSequence(count: number, now = new Date()): string[] {
  const normalized = normalizeTrendWindow(count);
  const cursor = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - normalized + 1, 1),
  );
  return Array.from({ length: normalized }, (_, index) => {
    const month = new Date(
      Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + index, 1),
    );
    return month.toISOString().slice(0, 7);
  });
}
