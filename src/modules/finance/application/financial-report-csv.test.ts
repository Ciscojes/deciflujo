import { describe, expect, it } from "vitest";
import { formatFinancialReportCsv } from "./financial-report-csv";
import type { FinancialReport } from "./use-cases/generate-financial-report";

const report: FinancialReport = {
  filter: {
    from: "2026-07-01",
    to: "2026-07-31",
  },
  summary: {
    incomeCents: 100_000,
    expenseCents: 0,
    netCashFlowCents: 100_000,
    transactionCount: 1,
  },
  transactions: [
    {
      id: "58f8f1b0-f8e2-4b90-9de6-5b578f9c6cb4",
      description: "=HYPERLINK(\"https://malicioso.example\")",
      amountCents: 100_000,
      type: "income",
      category: "Ventas",
      accountId: "d144af62-b43b-4124-a556-5ef624959c43",
      accountName: "Cuenta principal",
      occurredOn: "2026-07-30",
    },
  ],
  budgetVariances: [],
};

describe("exportación CSV", () => {
  it("incluye BOM, separador compatible y neutraliza fórmulas", () => {
    const csv = formatFinancialReportCsv(report);
    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv).toContain('"Fecha";"Descripción";"Tipo"');
    expect(csv).toContain(
      `"'=HYPERLINK(""https://malicioso.example"")"`,
    );
  });
});
