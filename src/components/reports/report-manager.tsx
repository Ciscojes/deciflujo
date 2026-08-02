"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  ArrowDownRight,
  ArrowLeft,
  ArrowUpRight,
  Building2,
  CalendarRange,
  Download,
  FileBarChart,
  Filter,
  Landmark,
  LoaderCircle,
  RefreshCw,
  TrendingUp,
  WalletCards,
  X,
} from "lucide-react";
import type { AccountOverview } from "@/modules/finance/domain/account";
import type { FinancialReport } from "@/modules/finance/application/use-cases/generate-financial-report";
import {
  transactionCategories,
  type TransactionCategory,
  type TransactionType,
} from "@/modules/finance/domain/transaction";

type ApiResponse<T> = {
  data?: T;
  error?: string;
};

type Filters = {
  from: string;
  to: string;
  type: "" | TransactionType;
  category: "" | TransactionCategory;
  accountId: string;
};

const moneyFormatter = new Intl.NumberFormat("es-CR", {
  style: "currency",
  currency: "CRC",
  maximumFractionDigits: 0,
});

const dateFormatter = new Intl.DateTimeFormat("es-CR", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

const monthFormatter = new Intl.DateTimeFormat("es-CR", {
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

function formatMoney(amountCents: number) {
  return moneyFormatter.format(amountCents / 100);
}

function initialFilters(): Filters {
  const today = new Date().toISOString().slice(0, 10);
  return {
    from: `${today.slice(0, 7)}-01`,
    to: today,
    type: "",
    category: "",
    accountId: "",
  };
}

function buildQuery(filters: Filters, format?: "csv") {
  const query = new URLSearchParams({
    from: filters.from,
    to: filters.to,
  });
  if (filters.type) query.set("type", filters.type);
  if (filters.category) query.set("category", filters.category);
  if (filters.accountId) query.set("accountId", filters.accountId);
  if (format) query.set("format", format);
  return query.toString();
}

export function ReportManager({
  organizationName,
  canExport,
}: {
  organizationName: string;
  canExport: boolean;
}) {
  const [filters, setFilters] = useState<Filters>(initialFilters);
  const [report, setReport] = useState<FinancialReport | null>(null);
  const [accounts, setAccounts] = useState<AccountOverview[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadReport(currentFilters: Filters) {
    setError(null);
    const response = await fetch(
      `/api/reports/financial?${buildQuery(currentFilters)}`,
    );
    const payload = (await response.json()) as ApiResponse<FinancialReport>;
    if (!response.ok || !payload.data) {
      throw new Error(payload.error ?? "No fue posible generar el reporte.");
    }
    setReport(payload.data);
  }

  useEffect(() => {
    let active = true;
    const currentFilters = initialFilters();
    void Promise.all([
      fetch(`/api/reports/financial?${buildQuery(currentFilters)}`),
      fetch("/api/accounts"),
    ])
      .then(async ([reportResponse, accountsResponse]) => {
        const reportPayload =
          (await reportResponse.json()) as ApiResponse<FinancialReport>;
        const accountsPayload =
          (await accountsResponse.json()) as ApiResponse<AccountOverview[]>;
        if (!active) return;
        if (!reportResponse.ok || !reportPayload.data) {
          throw new Error(
            reportPayload.error ?? "No fue posible generar el reporte.",
          );
        }
        if (!accountsResponse.ok || !accountsPayload.data) {
          throw new Error(
            accountsPayload.error ?? "No fue posible cargar las cuentas.",
          );
        }
        setReport(reportPayload.data);
        setAccounts(accountsPayload.data);
      })
      .catch((loadError: unknown) => {
        if (active) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "No fue posible cargar el reporte.",
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  async function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    try {
      await loadReport(filters);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "No fue posible generar el reporte.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function exportCsv() {
    setExporting(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/reports/financial?${buildQuery(filters, "csv")}`,
      );
      if (!response.ok) {
        const payload = (await response.json()) as ApiResponse<never>;
        throw new Error(payload.error ?? "No fue posible exportar el reporte.");
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `deciflujo-${filters.from}-${filters.to}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (exportError) {
      setError(
        exportError instanceof Error
          ? exportError.message
          : "No fue posible exportar el reporte.",
      );
    } finally {
      setExporting(false);
    }
  }

  const budgetTotals = useMemo(
    () =>
      report?.budgetVariances.reduce(
        (totals, budget) => ({
          planned: totals.planned + budget.plannedCents,
          spent: totals.spent + budget.spentCents,
        }),
        { planned: 0, spent: 0 },
      ) ?? { planned: 0, spent: 0 },
    [report],
  );

  return (
    <main className="min-h-screen bg-[#f7f8fa] px-5 py-8 text-[#18212f] sm:px-8">
      <div className="mx-auto max-w-7xl">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-medium text-[#48668e] hover:text-[#183153]"
        >
          <ArrowLeft size={16} /> Volver al dashboard
        </Link>

        <header className="mt-7 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <div className="mb-3 flex items-center gap-2 text-sm text-[#667386]">
              <Building2 size={16} /> {organizationName}
            </div>
            <h1 className="text-3xl font-semibold tracking-[-0.04em]">
              Reportes financieros
            </h1>
            <p className="mt-2 max-w-2xl leading-7 text-[#6d7888]">
              Analiza el flujo de un período y exporta el detalle para
              trabajarlo en Excel u otra herramienta.
            </p>
          </div>
          {canExport && (
            <button
              onClick={() => void exportCsv()}
              disabled={exporting || loading || !report}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#183153] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#102943] disabled:opacity-60"
            >
              {exporting ? (
                <LoaderCircle size={17} className="animate-spin" />
              ) : (
                <Download size={17} />
              )}
              Exportar CSV
            </button>
          )}
        </header>

        {error && (
          <div className="mt-6 flex items-center justify-between rounded-xl border border-[#e9cfc6] bg-[#fff7f3] px-4 py-3 text-sm text-[#9c4f35]">
            <span>{error}</span>
            <button onClick={() => setError(null)} aria-label="Cerrar alerta">
              <X size={16} />
            </button>
          </div>
        )}

        <form
          onSubmit={(event) => void applyFilters(event)}
          className="mt-7 grid gap-4 rounded-2xl border border-[#dce3ec] bg-white p-5 md:grid-cols-2 xl:grid-cols-[1fr_1fr_0.9fr_1fr_1fr_auto]"
        >
          <FilterControl label="Desde">
            <input
              type="date"
              value={filters.from}
              max={filters.to}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  from: event.target.value,
                }))
              }
              className="form-control"
              required
            />
          </FilterControl>
          <FilterControl label="Hasta">
            <input
              type="date"
              value={filters.to}
              min={filters.from}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  to: event.target.value,
                }))
              }
              className="form-control"
              required
            />
          </FilterControl>
          <FilterControl label="Tipo">
            <select
              value={filters.type}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  type: event.target.value as Filters["type"],
                }))
              }
              className="form-control"
            >
              <option value="">Todos</option>
              <option value="income">Ingresos</option>
              <option value="expense">Egresos</option>
            </select>
          </FilterControl>
          <FilterControl label="Categoría">
            <select
              value={filters.category}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  category: event.target.value as Filters["category"],
                }))
              }
              className="form-control"
            >
              <option value="">Todas</option>
              {transactionCategories.map((category) => (
                <option key={category}>{category}</option>
              ))}
            </select>
          </FilterControl>
          <FilterControl label="Cuenta">
            <select
              value={filters.accountId}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  accountId: event.target.value,
                }))
              }
              className="form-control"
            >
              <option value="">Todas</option>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </select>
          </FilterControl>
          <button
            type="submit"
            disabled={loading}
            className="mt-auto inline-flex h-[43px] items-center justify-center gap-2 rounded-lg border border-[#cdd8d0] bg-[#edf2f8] px-4 text-sm font-medium text-[#315d46] hover:bg-[#e3eee6] disabled:opacity-60"
          >
            {loading ? (
              <LoaderCircle size={16} className="animate-spin" />
            ) : (
              <Filter size={16} />
            )}
            Aplicar
          </button>
        </form>

        {report && (
          <>
            <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <Metric
                title="Ingresos"
                value={formatMoney(report.summary.incomeCents)}
                note="Entradas del período"
                icon={ArrowDownRight}
                tone="green"
              />
              <Metric
                title="Egresos"
                value={formatMoney(report.summary.expenseCents)}
                note="Salidas del período"
                icon={ArrowUpRight}
                tone="clay"
              />
              <Metric
                title="Flujo neto"
                value={formatMoney(report.summary.netCashFlowCents)}
                note="Ingresos menos egresos"
                icon={TrendingUp}
                tone={report.summary.netCashFlowCents < 0 ? "red" : "forest"}
              />
              <Metric
                title="Movimientos"
                value={String(report.summary.transactionCount)}
                note={`${report.filter.from} a ${report.filter.to}`}
                icon={WalletCards}
                tone="blue"
              />
            </section>

            <section className="mt-6 grid gap-6 xl:grid-cols-[1.45fr_0.85fr]">
              <div className="overflow-hidden rounded-2xl border border-[#dce3ec] bg-white">
                <div className="flex items-center justify-between border-b border-[#e4e9f0] p-5">
                  <div>
                    <h2 className="font-semibold">Detalle de movimientos</h2>
                    <p className="mt-1 text-sm text-[#7b8696]">
                      Resultado de los filtros aplicados
                    </p>
                  </div>
                  <FileBarChart size={20} className="text-[#54705f]" />
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[680px] text-left text-sm">
                    <thead className="bg-[#f7f8fa] text-xs uppercase tracking-wide text-[#7d8796]">
                      <tr>
                        <th className="px-5 py-3 font-semibold">Fecha</th>
                        <th className="px-5 py-3 font-semibold">Concepto</th>
                        <th className="px-5 py-3 font-semibold">Cuenta</th>
                        <th className="px-5 py-3 text-right font-semibold">
                          Monto
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#eef1f5]">
                      {report.transactions.map((transaction) => (
                        <tr key={transaction.id}>
                          <td className="whitespace-nowrap px-5 py-3.5 text-[#758091]">
                            {dateFormatter.format(
                              new Date(transaction.occurredOn),
                            )}
                          </td>
                          <td className="px-5 py-3.5">
                            <p className="font-medium">
                              {transaction.description}
                            </p>
                            <p className="mt-0.5 text-xs text-[#89938d]">
                              {transaction.category}
                            </p>
                          </td>
                          <td className="px-5 py-3.5 text-[#637068]">
                            {transaction.accountName}
                          </td>
                          <td
                            className={`whitespace-nowrap px-5 py-3.5 text-right font-semibold ${
                              transaction.type === "income"
                                ? "text-[#28704d]"
                                : "text-[#a25b3e]"
                            }`}
                          >
                            {transaction.type === "income" ? "+" : "−"}
                            {formatMoney(transaction.amountCents)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {report.transactions.length === 0 && (
                    <div className="grid min-h-48 place-items-center px-5 text-center">
                      <div>
                        <RefreshCw
                          size={24}
                          className="mx-auto text-[#8b9690]"
                        />
                        <p className="mt-3 font-medium">
                          No hay movimientos para estos filtros
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-[#dce3ec] bg-white p-5">
                <div className="flex items-center gap-3">
                  <span className="grid size-10 place-items-center rounded-xl bg-[#e8f1ea] text-[#37664b]">
                    <Landmark size={19} />
                  </span>
                  <div>
                    <h2 className="font-semibold">Presupuesto vs. ejecución</h2>
                    <p className="text-sm text-[#7b8696]">
                      Períodos mensuales completos
                    </p>
                  </div>
                </div>
                <div className="mt-5 rounded-xl bg-[#f4f6f4] p-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-[#748093]">Planificado</span>
                    <span className="font-semibold">
                      {formatMoney(budgetTotals.planned)}
                    </span>
                  </div>
                  <div className="mt-2 flex justify-between text-sm">
                    <span className="text-[#748093]">Ejecutado</span>
                    <span className="font-semibold">
                      {formatMoney(budgetTotals.spent)}
                    </span>
                  </div>
                </div>
                <div className="mt-4 space-y-3">
                  {report.budgetVariances.map((budget) => (
                    <div
                      key={`${budget.month}-${budget.category}`}
                      className="rounded-xl border border-[#e5e9e5] p-3.5"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium">
                            {budget.category}
                          </p>
                          <p className="mt-0.5 text-xs capitalize text-[#859089]">
                            {monthFormatter.format(
                              new Date(`${budget.month}-01T00:00:00Z`),
                            )}
                          </p>
                        </div>
                        <span
                          className={`text-sm font-semibold ${
                            budget.varianceCents < 0
                              ? "text-[#a45143]"
                              : "text-[#337052]"
                          }`}
                        >
                          {formatMoney(budget.varianceCents)}
                        </span>
                      </div>
                      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#eef1f5]">
                        <div
                          className={
                            budget.status === "exceeded"
                              ? "h-full rounded-full bg-[#c56554]"
                              : budget.status === "warning"
                                ? "h-full rounded-full bg-[#d29a37]"
                                : "h-full rounded-full bg-[#438061]"
                          }
                          style={{
                            width: `${Math.min(100, budget.usagePercentage)}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                  {report.budgetVariances.length === 0 && (
                    <p className="rounded-xl bg-[#f7f8fa] p-4 text-sm text-[#7b8696]">
                      No hay presupuestos configurados dentro del período.
                    </p>
                  )}
                </div>
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}

function FilterControl({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block text-xs font-semibold uppercase tracking-wide text-[#748093]">
      <span className="mb-1.5 block">{label}</span>
      {children}
    </label>
  );
}

function Metric({
  title,
  value,
  note,
  icon: Icon,
  tone,
}: {
  title: string;
  value: string;
  note: string;
  icon: typeof CalendarRange;
  tone: "green" | "clay" | "forest" | "red" | "blue";
}) {
  const tones = {
    green: "bg-[#e8f4ed] text-[#27704d]",
    clay: "bg-[#fff0e8] text-[#a45b39]",
    forest: "bg-[#e6edf7] text-[#315f9b]",
    red: "bg-[#fff0ed] text-[#a34f42]",
    blue: "bg-[#eaf1f3] text-[#3b6570]",
  };
  return (
    <div className="rounded-2xl border border-[#dce3ec] bg-white p-5">
      <div className="flex items-start justify-between">
        <p className="text-sm text-[#758091]">{title}</p>
        <span className={`grid size-9 place-items-center rounded-lg ${tones[tone]}`}>
          <Icon size={17} />
        </span>
      </div>
      <p className="mt-3 text-2xl font-semibold tracking-[-0.035em]">{value}</p>
      <p className="mt-1 text-xs text-[#89938d]">{note}</p>
    </div>
  );
}
