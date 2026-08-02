import { describe, expect, it } from "vitest";
import { calculateFinancialSummary } from "./financial-summary";
import type { Transaction } from "./transaction";

const baseTransaction: Omit<Transaction, "id" | "type" | "amountCents"> = {
  description: "Movimiento de prueba",
  category: "Otros",
  accountId: "58f8f1b0-f8e2-4b90-9de6-5b578f9c6cb4",
  occurredOn: "2026-07-29",
  createdAt: "2026-07-29T18:00:00.000Z",
};

describe("calculateFinancialSummary", () => {
  it("calcula ingresos, egresos, saldo y margen", () => {
    const summary = calculateFinancialSummary([
      { ...baseTransaction, id: "1", type: "income", amountCents: 100_000 },
      { ...baseTransaction, id: "2", type: "expense", amountCents: 35_000 },
    ]);

    expect(summary).toEqual({
      incomeCents: 100_000,
      expenseCents: 35_000,
      balanceCents: 65_000,
      operatingMargin: 65,
    });
  });

  it("evita dividir entre cero cuando no hay ingresos", () => {
    const summary = calculateFinancialSummary([
      { ...baseTransaction, id: "1", type: "expense", amountCents: 10_000 },
    ]);

    expect(summary.operatingMargin).toBe(0);
    expect(summary.balanceCents).toBe(-10_000);
  });
});
