"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  Gauge,
  LoaderCircle,
  Pencil,
  PiggyBank,
  Plus,
  TrendingDown,
  X,
} from "lucide-react";
import {
  summarizeBudgets,
  type BudgetStatus,
  type MonthlyBudget,
} from "@/modules/finance/domain/budget";

type ApiResponse<T> = {
  data?: T;
  error?: string;
};

const moneyFormatter = new Intl.NumberFormat("es-CR", {
  style: "currency",
  currency: "CRC",
  maximumFractionDigits: 0,
});

const monthFormatter = new Intl.DateTimeFormat("es-CR", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

const statusLabels: Record<BudgetStatus, string> = {
  healthy: "En orden",
  warning: "Cerca del límite",
  exceeded: "Excedido",
};

function formatMoney(amountCents: number) {
  return moneyFormatter.format(amountCents / 100);
}

function formatMonth(month: string) {
  return monthFormatter.format(new Date(`${month}-01T00:00:00Z`));
}

export function BudgetManager({
  organizationName,
}: {
  organizationName: string;
}) {
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [budgets, setBudgets] = useState<MonthlyBudget[]>([]);
  const [editing, setEditing] = useState<MonthlyBudget | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void fetch(`/api/budgets?month=${month}`)
      .then(async (response) => {
        const payload = (await response.json()) as ApiResponse<MonthlyBudget[]>;
        if (!response.ok || !payload.data) {
          throw new Error(
            payload.error ?? "No se pudieron cargar los presupuestos.",
          );
        }
        if (active) setBudgets(payload.data);
      })
      .catch((loadError: unknown) => {
        if (active) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "No se pudieron cargar los presupuestos.",
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [month]);

  const summary = useMemo(() => summarizeBudgets(budgets), [budgets]);

  async function saveBudget(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing) return;
    const form = new FormData(event.currentTarget);
    setSaving(true);
    setError(null);
    const response = await fetch("/api/budgets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        month,
        category: editing.category,
        plannedCents: Math.round(Number(form.get("amount")) * 100),
      }),
    });
    const payload = (await response.json()) as ApiResponse<MonthlyBudget>;
    if (!response.ok || !payload.data) {
      setError(payload.error ?? "No fue posible guardar el presupuesto.");
      setSaving(false);
      return;
    }
    setBudgets((current) =>
      current.map((budget) =>
        budget.category === payload.data!.category ? payload.data! : budget,
      ),
    );
    setEditing(null);
    setSaving(false);
  }

  return (
    <main className="min-h-screen bg-[#f7f8fa] px-5 py-8 text-[#18212f] sm:px-8">
      <div className="mx-auto max-w-6xl">
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
              Presupuestos
            </h1>
            <p className="mt-2 max-w-2xl leading-7 text-[#6d7888]">
              Define límites mensuales y compara lo planeado con los egresos
              que ya registraste.
            </p>
          </div>
          <label className="flex items-center gap-2 rounded-xl border border-[#d5dde8] bg-white px-3.5 py-2.5 text-sm font-medium text-[#4f5d6d]">
            <CalendarDays size={17} />
            <span className="sr-only">Mes del presupuesto</span>
            <input
              type="month"
              value={month}
              onChange={(event) => {
                setLoading(true);
                setMonth(event.target.value);
              }}
              className="bg-transparent capitalize outline-none"
            />
          </label>
        </header>

        {error && (
          <div className="mt-6 flex items-center justify-between rounded-xl border border-[#e9cfc6] bg-[#fff7f3] px-4 py-3 text-sm text-[#9c4f35]">
            <span>{error}</span>
            <button onClick={() => setError(null)} aria-label="Cerrar alerta">
              <X size={16} />
            </button>
          </div>
        )}

        <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryCard
            title="Planificado"
            value={formatMoney(summary.plannedCents)}
            note={`${summary.configuredCount} categorías configuradas`}
            icon={PiggyBank}
            tone="forest"
          />
          <SummaryCard
            title="Ejecutado"
            value={formatMoney(summary.spentCents)}
            note={`${summary.usagePercentage.toFixed(1)}% del presupuesto`}
            icon={TrendingDown}
            tone="clay"
          />
          <SummaryCard
            title="Disponible"
            value={formatMoney(summary.remainingCents)}
            note="Planificado menos ejecutado"
            icon={CircleDollarSign}
            tone={summary.remainingCents < 0 ? "red" : "green"}
          />
          <SummaryCard
            title="Alertas"
            value={String(summary.warningCount + summary.exceededCount)}
            note={`${summary.exceededCount} excedidas`}
            icon={AlertTriangle}
            tone={
              summary.exceededCount > 0
                ? "red"
                : summary.warningCount > 0
                  ? "amber"
                  : "green"
            }
          />
        </section>

        <section className="mt-6 overflow-hidden rounded-2xl border border-[#dce3ec] bg-white">
          <div className="border-b border-[#e4e9f0] p-5 sm:flex sm:items-center sm:justify-between">
            <div>
              <h2 className="font-semibold capitalize">
                Límites de {formatMonth(month)}
              </h2>
              <p className="mt-1 text-sm text-[#788494]">
                Solo los egresos del mes seleccionado cuentan como ejecutados.
              </p>
            </div>
          </div>

          {loading ? (
            <div className="grid min-h-64 place-items-center">
              <LoaderCircle className="animate-spin text-[#52705e]" />
            </div>
          ) : (
            <div className="grid gap-4 p-5 md:grid-cols-2">
              {budgets.map((budget) => (
                <BudgetCard
                  key={budget.category}
                  budget={budget}
                  onEdit={() => setEditing(budget)}
                />
              ))}
            </div>
          )}
        </section>

        <p className="mt-5 text-center text-xs leading-5 text-[#8691a0]">
          Los presupuestos no bloquean movimientos. Funcionan como una señal
          para decidir y corregir a tiempo.
        </p>
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-[#15263c]/35 p-4 backdrop-blur-sm">
          <section className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#748093]">Presupuesto mensual</p>
                <h2 className="mt-1 text-xl font-semibold">
                  {editing.category}
                </h2>
              </div>
              <button
                onClick={() => setEditing(null)}
                className="rounded-lg p-2 text-[#718092] hover:bg-[#f0f3f7]"
                aria-label="Cerrar"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-5 rounded-xl bg-[#f3f6fa] p-4 text-sm">
              <div className="flex justify-between">
                <span className="text-[#748093]">Ya ejecutado</span>
                <span className="font-semibold">
                  {formatMoney(editing.spentCents)}
                </span>
              </div>
              <div className="mt-2 flex justify-between">
                <span className="text-[#748093]">Período</span>
                <span className="font-medium capitalize">
                  {formatMonth(month)}
                </span>
              </div>
            </div>

            <form className="mt-5" onSubmit={(event) => void saveBudget(event)}>
              <label className="block text-sm font-medium">
                Límite planificado (CRC)
                <input
                  name="amount"
                  className="form-control mt-1.5"
                  type="number"
                  min="1"
                  step="0.01"
                  defaultValue={
                    editing.plannedCents > 0
                      ? editing.plannedCents / 100
                      : ""
                  }
                  autoFocus
                  required
                />
              </label>
              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditing(null)}
                  className="rounded-lg border border-[#d6dee8] px-4 py-2.5 text-sm font-medium text-[#647184]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#183153] px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60"
                >
                  {saving && (
                    <LoaderCircle size={16} className="animate-spin" />
                  )}
                  Guardar límite
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </main>
  );
}

function BudgetCard({
  budget,
  onEdit,
}: {
  budget: MonthlyBudget;
  onEdit: () => void;
}) {
  const configured = budget.plannedCents > 0;
  const progress = configured
    ? Math.min(100, Math.max(0, budget.usagePercentage))
    : 0;
  const statusStyles: Record<BudgetStatus, string> = {
    healthy: "bg-[#e8f3eb] text-[#347052]",
    warning: "bg-[#fff5d9] text-[#8b6920]",
    exceeded: "bg-[#fff0ed] text-[#a24f41]",
  };
  const barStyles: Record<BudgetStatus, string> = {
    healthy: "bg-[#3f815e]",
    warning: "bg-[#d59a32]",
    exceeded: "bg-[#c66554]",
  };

  return (
    <article className="rounded-xl border border-[#dee5ed] p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-semibold">{budget.category}</p>
          {configured ? (
            <span
              className={`mt-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${statusStyles[budget.status]}`}
            >
              {budget.status === "healthy" ? (
                <CheckCircle2 size={13} />
              ) : (
                <AlertTriangle size={13} />
              )}
              {statusLabels[budget.status]}
            </span>
          ) : (
            <span className="mt-2 inline-block rounded-full bg-[#f0f2f0] px-2.5 py-1 text-xs font-medium text-[#7c867f]">
              Sin límite
            </span>
          )}
        </div>
        <button
          onClick={onEdit}
          className="inline-flex items-center gap-1.5 rounded-lg border border-[#d4ddd6] px-3 py-2 text-xs font-medium text-[#486555] hover:bg-[#f0f5f1]"
        >
          {configured ? <Pencil size={14} /> : <Plus size={14} />}
          {configured ? "Ajustar" : "Definir"}
        </button>
      </div>

      <div className="mt-5 flex items-end justify-between gap-4">
        <div>
          <p className="text-xs text-[#8691a0]">Ejecutado</p>
          <p className="mt-1 text-lg font-semibold">
            {formatMoney(budget.spentCents)}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-[#8691a0]">Planificado</p>
          <p className="mt-1 font-medium">
            {configured ? formatMoney(budget.plannedCents) : "—"}
          </p>
        </div>
      </div>

      <div className="mt-4 h-2 overflow-hidden rounded-full bg-[#eef1f5]">
        <div
          className={`h-full rounded-full transition-all ${
            configured ? barStyles[budget.status] : "bg-[#d6dee8]"
          }`}
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="mt-2 flex justify-between text-xs">
        <span className="text-[#7d8796]">
          {configured ? `${budget.usagePercentage.toFixed(1)}% utilizado` : ""}
        </span>
        {configured && (
          <span
            className={
              budget.remainingCents < 0 ? "text-[#a24f41]" : "text-[#667386]"
            }
          >
            {budget.remainingCents < 0 ? "Exceso" : "Disponible"}:{" "}
            {formatMoney(Math.abs(budget.remainingCents))}
          </span>
        )}
      </div>
    </article>
  );
}

function SummaryCard({
  title,
  value,
  note,
  icon: Icon,
  tone,
}: {
  title: string;
  value: string;
  note: string;
  icon: typeof Gauge;
  tone: "forest" | "green" | "clay" | "amber" | "red";
}) {
  const tones = {
    forest: "bg-[#e6edf7] text-[#315f9b]",
    green: "bg-[#e8f4ed] text-[#27704d]",
    clay: "bg-[#fff0e8] text-[#a45b39]",
    amber: "bg-[#fff5d9] text-[#927025]",
    red: "bg-[#fff0ed] text-[#a34f42]",
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
