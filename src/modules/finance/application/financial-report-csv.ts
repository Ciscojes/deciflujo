import type { FinancialReport } from "./use-cases/generate-financial-report";

function safeCell(value: string | number): string {
  let text = String(value);
  if (/^[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}

function moneyValue(amountCents: number): string {
  return (amountCents / 100).toFixed(2).replace(".", ",");
}

export function formatFinancialReportCsv(report: FinancialReport): string {
  const rows: Array<Array<string | number>> = [
    ["Reporte financiero de Deciflujo"],
    ["Desde", report.filter.from],
    ["Hasta", report.filter.to],
    [],
    ["Resumen"],
    ["Ingresos", moneyValue(report.summary.incomeCents)],
    ["Egresos", moneyValue(report.summary.expenseCents)],
    ["Flujo neto", moneyValue(report.summary.netCashFlowCents)],
    ["Movimientos", report.summary.transactionCount],
    [],
    ["Movimientos"],
    ["Fecha", "Descripción", "Tipo", "Categoría", "Cuenta", "Monto CRC"],
    ...report.transactions.map((transaction) => [
      transaction.occurredOn,
      transaction.description,
      transaction.type === "income" ? "Ingreso" : "Egreso",
      transaction.category,
      transaction.accountName,
      moneyValue(transaction.amountCents),
    ]),
    [],
    ["Presupuesto mensual contra ejecución"],
    ["Mes", "Categoría", "Planificado CRC", "Ejecutado CRC", "Disponible CRC"],
    ...report.budgetVariances.map((budget) => [
      budget.month,
      budget.category,
      moneyValue(budget.plannedCents),
      moneyValue(budget.spentCents),
      moneyValue(budget.varianceCents),
    ]),
  ];
  return `\uFEFF${rows.map((row) => row.map(safeCell).join(";")).join("\r\n")}`;
}
