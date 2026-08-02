import { describe, expect, it } from "vitest";
import {
  calculateFinancialPulse,
  simulateRecurringExpense,
} from "./decision-engine";

describe("calculateFinancialPulse", () => {
  it("marca atención cuando los gastos consumen más del 80% del ingreso", () => {
    const pulse = calculateFinancialPulse({
      currentBalanceCents: 1_000_000,
      monthlyIncomeCents: 1_000_000,
      monthlyExpenseCents: 850_000,
    });

    expect(pulse.status).toBe("attention");
    expect(pulse.expenseRatio).toBe(0.85);
  });

  it("marca crítico cuando el flujo mensual es negativo", () => {
    const pulse = calculateFinancialPulse({
      currentBalanceCents: 1_000_000,
      monthlyIncomeCents: 400_000,
      monthlyExpenseCents: 500_000,
    });

    expect(pulse.status).toBe("critical");
    expect(pulse.netCashFlowCents).toBe(-100_000);
  });
});

describe("simulateRecurringExpense", () => {
  it("compara la línea base con un nuevo gasto durante seis meses", () => {
    const result = simulateRecurringExpense({
      currentBalanceCents: 1_000_000,
      monthlyIncomeCents: 500_000,
      monthlyExpenseCents: 300_000,
      addedMonthlyExpenseCents: 250_000,
      months: 6,
    });

    expect(result.baselineFinalBalanceCents).toBe(2_200_000);
    expect(result.scenarioFinalBalanceCents).toBe(700_000);
    expect(result.totalImpactCents).toBe(1_500_000);
    expect(result.runwayMonths).toBe(20);
    expect(result.projection).toHaveLength(7);
  });

  it("rechaza horizontes fuera del rango permitido", () => {
    expect(() =>
      simulateRecurringExpense({
        currentBalanceCents: 0,
        monthlyIncomeCents: 0,
        monthlyExpenseCents: 0,
        addedMonthlyExpenseCents: 0,
        months: 25,
      }),
    ).toThrow("entre 1 y 24 meses");
  });
});
