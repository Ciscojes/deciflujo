"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowDownRight,
  ArrowLeft,
  ArrowUpRight,
  Building2,
  CalendarCheck,
  CheckCircle2,
  LockKeyhole,
  RefreshCw,
  RotateCcw,
  X,
} from "lucide-react";
import type {
  MonthlyCloseOverview,
  MonthlyTrend,
} from "@/modules/finance/domain/monthly-close";

type ApiResponse<T> = { data?: T; error?: string };

const moneyFormatter = new Intl.NumberFormat("es-CR", {
  style: "currency",
  currency: "CRC",
  maximumFractionDigits: 0,
});

const monthFormatter = new Intl.DateTimeFormat("es-CR", {
  month: "short",
  year: "2-digit",
  timeZone: "UTC",
});

const fullMonthFormatter = new Intl.DateTimeFormat("es-CR", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

function formatMoney(cents: number) {
  return moneyFormatter.format(cents / 100);
}

function formatMonth(month: string, full = false) {
  const date = new Date(`${month}-01T00:00:00.000Z`);
  return (full ? fullMonthFormatter : monthFormatter).format(date);
}

function percentageChange(current: number, previous: number) {
  if (previous === 0) return current === 0 ? 0 : null;
  return Math.round(((current - previous) / Math.abs(previous)) * 100);
}

export function TrendsManager({
  organizationName,
  canManageCloses,
}: {
  organizationName: string;
  canManageCloses: boolean;
}) {
  const [overview, setOverview] = useState<MonthlyCloseOverview | null>(null);
  const [months, setMonths] = useState(12);
  const [selectedMonth, setSelectedMonth] = useState(
    new Date().toISOString().slice(0, 7),
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadOverview(windowMonths = months) {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/monthly-closes?months=${windowMonths}`);
      const payload = (await response.json()) as ApiResponse<MonthlyCloseOverview>;
      if (!response.ok || !payload.data) {
        throw new Error(payload.error ?? "No fue posible cargar las tendencias.");
      }
      setOverview(payload.data);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "No fue posible cargar las tendencias.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    void fetch(`/api/monthly-closes?months=${months}`)
      .then(async (response) => {
        const payload =
          (await response.json()) as ApiResponse<MonthlyCloseOverview>;
        if (!response.ok || !payload.data) {
          throw new Error(
            payload.error ?? "No fue posible cargar las tendencias.",
          );
        }
        if (active) setOverview(payload.data);
      })
      .catch((loadError: unknown) => {
        if (active) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "No fue posible cargar las tendencias.",
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [months]);

  const latest = overview?.trends.at(-1);
  const previous = overview?.trends.at(-2);
  const maxValue = useMemo(
    () =>
      Math.max(
        1,
        ...(overview?.trends.flatMap((trend) => [
          trend.incomeCents,
          trend.expenseCents,
        ]) ?? []),
      ),
    [overview],
  );
  const isSelectedClosed = overview?.closes.some(
    (close) => close.month === selectedMonth,
  );

  async function closeSelectedMonth() {
    if (
      !window.confirm(
        `¿Cerrar ${formatMonth(selectedMonth, true)}? Los movimientos de ese mes quedarán bloqueados hasta que se reabra.`,
      )
    ) {
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/monthly-closes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month: selectedMonth }),
      });
      const payload = (await response.json()) as ApiResponse<unknown>;
      if (!response.ok) {
        throw new Error(payload.error ?? "No fue posible cerrar el período.");
      }
      await loadOverview(months);
    } catch (closeError) {
      setError(
        closeError instanceof Error
          ? closeError.message
          : "No fue posible cerrar el período.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function reopen(month: string) {
    if (
      !window.confirm(
        `¿Reabrir ${formatMonth(month, true)}? Se podrán volver a modificar sus movimientos.`,
      )
    ) {
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/monthly-closes?month=${encodeURIComponent(month)}`,
        { method: "DELETE" },
      );
      if (!response.ok) {
        const payload = (await response.json()) as ApiResponse<never>;
        throw new Error(payload.error ?? "No fue posible reabrir el período.");
      }
      await loadOverview(months);
    } catch (reopenError) {
      setError(
        reopenError instanceof Error
          ? reopenError.message
          : "No fue posible reabrir el período.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f7f8fa] px-5 py-8 text-[#18212f] sm:px-8">
      <div className="mx-auto max-w-7xl">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-medium text-[#48668e] hover:text-[#183153]"
        >
          <ArrowLeft size={16} /> Volver al dashboard
        </Link>

        <header className="mt-7 flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <div>
            <div className="mb-3 flex items-center gap-2 text-sm text-[#667386]">
              <Building2 size={16} /> {organizationName}
            </div>
            <h1 className="text-3xl font-semibold tracking-[-0.04em]">
              Tendencias y cierres
            </h1>
            <p className="mt-2 max-w-2xl leading-7 text-[#6d7888]">
              Compara el flujo mensual y congela una fotografía verificable al
              terminar cada período.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={months}
              onChange={(event) => {
                setLoading(true);
                setError(null);
                setMonths(Number(event.target.value));
              }}
              className="form-control w-auto"
              aria-label="Ventana de tendencias"
            >
              <option value={6}>Últimos 6 meses</option>
              <option value={12}>Últimos 12 meses</option>
              <option value={24}>Últimos 24 meses</option>
            </select>
            <button
              onClick={() => void loadOverview(months)}
              className="rounded-lg border border-[#d5dde8] bg-white p-3 text-[#48668e] hover:bg-[#eef3ef]"
              aria-label="Actualizar tendencias"
            >
              <RefreshCw size={17} className={loading ? "animate-spin" : ""} />
            </button>
          </div>
        </header>

        {error && (
          <div className="mt-6 flex items-center justify-between rounded-xl border border-[#e9cfc6] bg-[#fff7f3] px-4 py-3 text-sm text-[#9c4f35]">
            <span>{error}</span>
            <button onClick={() => setError(null)} aria-label="Cerrar alerta">
              <X size={16} />
            </button>
          </div>
        )}

        <section className="mt-7 grid gap-4 md:grid-cols-3">
          <MetricCard
            label="Ingresos del mes"
            value={formatMoney(latest?.incomeCents ?? 0)}
            change={percentageChange(
              latest?.incomeCents ?? 0,
              previous?.incomeCents ?? 0,
            )}
            positive
          />
          <MetricCard
            label="Egresos del mes"
            value={formatMoney(latest?.expenseCents ?? 0)}
            change={percentageChange(
              latest?.expenseCents ?? 0,
              previous?.expenseCents ?? 0,
            )}
          />
          <MetricCard
            label="Flujo neto del mes"
            value={formatMoney(latest?.netCashFlowCents ?? 0)}
            change={percentageChange(
              latest?.netCashFlowCents ?? 0,
              previous?.netCashFlowCents ?? 0,
            )}
            positive={(latest?.netCashFlowCents ?? 0) >= 0}
          />
        </section>

        <section className="mt-6 rounded-2xl border border-[#dce3ec] bg-white p-5 sm:p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold">Flujo por mes</h2>
              <p className="mt-1 text-sm text-[#748093]">
                Ingresos frente a egresos; el candado identifica meses cerrados.
              </p>
            </div>
            <div className="hidden items-center gap-4 text-xs text-[#748093] sm:flex">
              <span className="flex items-center gap-1.5"><i className="size-2.5 rounded-full bg-[#2f7a54]" /> Ingresos</span>
              <span className="flex items-center gap-1.5"><i className="size-2.5 rounded-full bg-[#d58a70]" /> Egresos</span>
            </div>
          </div>

          <div className="mt-8 overflow-x-auto pb-2">
            <div className="flex min-w-[720px] items-end gap-3" style={{ height: 280 }}>
              {overview?.trends.map((trend) => (
                <TrendBars key={trend.month} trend={trend} maxValue={maxValue} />
              ))}
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
          <div className="rounded-2xl border border-[#dce3ec] bg-white p-5 sm:p-6">
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-[#e6f1e9] p-2.5 text-[#246044]">
                <CalendarCheck size={20} />
              </div>
              <div>
                <h2 className="font-semibold">Cerrar un período</h2>
                <p className="mt-1 text-sm leading-6 text-[#748093]">
                  Guarda saldos, flujo y presupuesto; también bloquea altas y
                  eliminaciones de movimientos del mes.
                </p>
              </div>
            </div>

            {canManageCloses ? (
              <div className="mt-6 space-y-3">
                <label className="block text-sm font-medium text-[#45544a]">
                  Mes del cierre
                </label>
                <input
                  type="month"
                  value={selectedMonth}
                  max={new Date().toISOString().slice(0, 7)}
                  onChange={(event) => setSelectedMonth(event.target.value)}
                  className="form-control"
                />
                <button
                  onClick={() => void closeSelectedMonth()}
                  disabled={saving || !selectedMonth || isSelectedClosed}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#183153] px-4 py-3 text-sm font-medium text-white hover:bg-[#102943] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <LockKeyhole size={17} />
                  {isSelectedClosed ? "Este mes ya está cerrado" : "Cerrar período"}
                </button>
              </div>
            ) : (
              <p className="mt-6 rounded-xl bg-[#f3f6fa] p-4 text-sm leading-6 text-[#667386]">
                Puedes consultar los cierres. Solo propietarios y administradores
                pueden cerrar o reabrir períodos.
              </p>
            )}
          </div>

          <div className="rounded-2xl border border-[#dce3ec] bg-white p-5 sm:p-6">
            <h2 className="font-semibold">Historial de cierres</h2>
            <div className="mt-5 space-y-3">
              {overview?.closes.length ? (
                overview.closes.map((close) => (
                  <article
                    key={close.id}
                    className="rounded-xl border border-[#dee5ed] p-4"
                  >
                    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                      <div>
                        <div className="flex items-center gap-2">
                          <CheckCircle2 size={17} className="text-[#2f7a54]" />
                          <p className="font-medium capitalize">
                            {formatMonth(close.month, true)}
                          </p>
                        </div>
                        <p className="mt-2 text-sm text-[#748093]">
                          Saldo final {formatMoney(close.closingBalanceCents)} · {close.transactionCount} movimientos
                        </p>
                        <p className="mt-1 text-xs text-[#8d98a8]">
                          Cerrado por {close.closedByName}
                        </p>
                      </div>
                      {canManageCloses && (
                        <button
                          onClick={() => void reopen(close.month)}
                          disabled={saving}
                          className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#d5dde8] px-3 py-2 text-sm font-medium text-[#526158] hover:bg-[#f2f5f2] disabled:opacity-50"
                        >
                          <RotateCcw size={15} /> Reabrir
                        </button>
                      )}
                    </div>
                  </article>
                ))
              ) : (
                <div className="rounded-xl border border-dashed border-[#d5dde8] px-5 py-10 text-center text-sm text-[#7a8696]">
                  Aún no hay períodos cerrados.
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function MetricCard({
  label,
  value,
  change,
  positive = false,
}: {
  label: string;
  value: string;
  change: number | null;
  positive?: boolean;
}) {
  const ChangeIcon = (change ?? 0) >= 0 ? ArrowUpRight : ArrowDownRight;
  return (
    <article className="rounded-2xl border border-[#dce3ec] bg-white p-5">
      <p className="text-sm text-[#748093]">{label}</p>
      <p className="mt-3 text-2xl font-semibold tracking-[-0.03em]">{value}</p>
      <div className="mt-3 flex items-center gap-1.5 text-xs text-[#7d8796]">
        {change === null ? (
          <span>Sin base de comparación</span>
        ) : (
          <>
            <ChangeIcon
              size={14}
              className={positive ? "text-[#2f7a54]" : "text-[#b76b52]"}
            />
            <span>{Math.abs(change)}% frente al mes anterior</span>
          </>
        )}
      </div>
    </article>
  );
}

function TrendBars({
  trend,
  maxValue,
}: {
  trend: MonthlyTrend;
  maxValue: number;
}) {
  const incomeHeight = Math.max(2, (trend.incomeCents / maxValue) * 210);
  const expenseHeight = Math.max(2, (trend.expenseCents / maxValue) * 210);
  return (
    <div className="flex min-w-12 flex-1 flex-col items-center">
      <div className="mb-2 h-5 text-[#698075]">
        {trend.isClosed && <LockKeyhole size={14} aria-label="Mes cerrado" />}
      </div>
      <div className="flex h-[210px] items-end gap-1.5">
        <div
          className="w-4 rounded-t-md bg-[#2f7a54] transition-all"
          style={{ height: incomeHeight }}
          title={`Ingresos: ${formatMoney(trend.incomeCents)}`}
        />
        <div
          className="w-4 rounded-t-md bg-[#d58a70] transition-all"
          style={{ height: expenseHeight }}
          title={`Egresos: ${formatMoney(trend.expenseCents)}`}
        />
      </div>
      <p className="mt-3 text-[11px] capitalize text-[#748093]">
        {formatMonth(trend.month)}
      </p>
    </div>
  );
}
