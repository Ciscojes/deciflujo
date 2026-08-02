export type PulseStatus = "healthy" | "attention" | "critical";
export type ScenarioRisk = "stable" | "attention" | "critical";

export type FinancialPulse = {
  status: PulseStatus;
  cashCoverageMonths: number | null;
  expenseRatio: number;
  netCashFlowCents: number;
};

export type RecurringExpenseScenario = {
  currentBalanceCents: number;
  monthlyIncomeCents: number;
  monthlyExpenseCents: number;
  addedMonthlyExpenseCents: number;
  months: number;
};

export type ProjectionPoint = {
  month: number;
  baselineBalanceCents: number;
  scenarioBalanceCents: number;
};

export type ScenarioResult = {
  baselineMonthlyFlowCents: number;
  scenarioMonthlyFlowCents: number;
  baselineFinalBalanceCents: number;
  scenarioFinalBalanceCents: number;
  totalImpactCents: number;
  runwayMonths: number | null;
  risk: ScenarioRisk;
  projection: ProjectionPoint[];
};

export function calculateFinancialPulse(input: {
  currentBalanceCents: number;
  monthlyIncomeCents: number;
  monthlyExpenseCents: number;
}): FinancialPulse {
  const netCashFlowCents =
    input.monthlyIncomeCents - input.monthlyExpenseCents;
  const expenseRatio =
    input.monthlyIncomeCents === 0
      ? input.monthlyExpenseCents > 0
        ? 1
        : 0
      : input.monthlyExpenseCents / input.monthlyIncomeCents;
  const cashCoverageMonths =
    input.monthlyExpenseCents === 0
      ? null
      : input.currentBalanceCents / input.monthlyExpenseCents;

  let status: PulseStatus = "healthy";
  if (
    input.currentBalanceCents < 0 ||
    netCashFlowCents < 0 ||
    (cashCoverageMonths !== null && cashCoverageMonths < 1)
  ) {
    status = "critical";
  } else if (
    expenseRatio > 0.8 ||
    (cashCoverageMonths !== null && cashCoverageMonths < 3)
  ) {
    status = "attention";
  }

  return {
    status,
    cashCoverageMonths,
    expenseRatio,
    netCashFlowCents,
  };
}

export function simulateRecurringExpense(
  input: RecurringExpenseScenario,
): ScenarioResult {
  if (!Number.isInteger(input.months) || input.months < 1 || input.months > 24) {
    throw new Error("El horizonte debe estar entre 1 y 24 meses.");
  }
  if (
    !Number.isInteger(input.addedMonthlyExpenseCents) ||
    input.addedMonthlyExpenseCents < 0
  ) {
    throw new Error("El gasto mensual debe ser un entero no negativo.");
  }

  const baselineMonthlyFlowCents =
    input.monthlyIncomeCents - input.monthlyExpenseCents;
  const scenarioMonthlyFlowCents =
    baselineMonthlyFlowCents - input.addedMonthlyExpenseCents;
  const projection = Array.from({ length: input.months + 1 }, (_, month) => ({
    month,
    baselineBalanceCents:
      input.currentBalanceCents + baselineMonthlyFlowCents * month,
    scenarioBalanceCents:
      input.currentBalanceCents + scenarioMonthlyFlowCents * month,
  }));
  const lastPoint = projection.at(-1)!;
  const runwayMonths =
    scenarioMonthlyFlowCents < 0
      ? Math.max(0, input.currentBalanceCents / -scenarioMonthlyFlowCents)
      : null;

  let risk: ScenarioRisk = "stable";
  if (
    lastPoint.scenarioBalanceCents < 0 ||
    (runwayMonths !== null && runwayMonths < 3)
  ) {
    risk = "critical";
  } else if (
    scenarioMonthlyFlowCents < 0 ||
    input.addedMonthlyExpenseCents >
      Math.max(input.currentBalanceCents * 0.25, 0)
  ) {
    risk = "attention";
  }

  return {
    baselineMonthlyFlowCents,
    scenarioMonthlyFlowCents,
    baselineFinalBalanceCents: lastPoint.baselineBalanceCents,
    scenarioFinalBalanceCents: lastPoint.scenarioBalanceCents,
    totalImpactCents: input.addedMonthlyExpenseCents * input.months,
    runwayMonths,
    risk,
    projection,
  };
}
