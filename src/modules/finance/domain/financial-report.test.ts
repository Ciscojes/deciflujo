import { describe, expect, it } from "vitest";
import {
  createBudgetVariance,
  summarizeReportTransactions,
  type ReportTransaction,
} from "./financial-report";

function transaction(
  type: "income" | "expense",
  amountCents: number,
): ReportTransaction {
  return {
    id: crypto.randomUUID(),
    description: "Movimiento de prueba",
    amountCents,
    type,
    category: type === "income" ? "Ventas" : "Operación",
    accountId: crypto.randomUUID(),
    accountName: "Cuenta principal",
    occurredOn: "2026-07-30",
  };
}

describe("reporte financiero", () => {
  it("resume ingresos, egresos y flujo neto", () => {
    expect(
      summarizeReportTransactions([
        transaction("income", 150_000),
        transaction("expense", 40_000),
        transaction("expense", 10_000),
      ]),
    ).toEqual({
      incomeCents: 150_000,
      expenseCents: 50_000,
      netCashFlowCents: 100_000,
      transactionCount: 3,
    });
  });

  it("calcula la variación presupuestaria y su alerta", () => {
    const variance = createBudgetVariance({
      month: "2026-07",
      category: "Marketing",
      plannedCents: 100_000,
      spentCents: 125_000,
    });
    expect(variance.varianceCents).toBe(-25_000);
    expect(variance.usagePercentage).toBe(125);
    expect(variance.status).toBe("exceeded");
  });
});
