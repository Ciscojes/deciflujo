"use client";

import {
  Activity,
  CalendarCheck,
  CircleAlert,
  CircleCheckBig,
  FlaskConical,
  Gauge,
  History,
  Info,
  LoaderCircle,
  Play,
  Save,
  Sparkles,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  calculateFinancialPulse,
  simulateRecurringExpense,
  type ProjectionPoint,
  type PulseStatus,
  type ScenarioRisk,
} from "@/modules/finance/domain/decision-engine";
import type { Decision } from "@/modules/finance/domain/decision";

type DecisionCenterProps = {
  canCreateDecision: boolean;
  canReviewDecision: boolean;
  currentBalanceCents: number;
  monthlyIncomeCents: number;
  monthlyExpenseCents: number;
};

type ApiResponse<T> = {
  data?: T;
  error?: string;
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

function formatMoney(cents: number) {
  return moneyFormatter.format(cents / 100);
}

const pulseCopy: Record<
  PulseStatus,
  { label: string; title: string; description: string; classes: string }
> = {
  healthy: {
    label: "Saludable",
    title: "Tu operación tiene espacio para decidir.",
    description:
      "El flujo es positivo y la cobertura de efectivo no presenta una alerta inmediata.",
    classes: "bg-[#e6eef8] text-[#256344] border-[#cde2d4]",
  },
  attention: {
    label: "Atención",
    title: "Hay poco margen para absorber cambios.",
    description:
      "Tus gastos o tu reserva de efectivo merecen revisión antes de asumir nuevos compromisos.",
    classes: "bg-[#fff3df] text-[#986223] border-[#efd9b2]",
  },
  critical: {
    label: "Crítico",
    title: "Protege el efectivo antes de crecer.",
    description:
      "El flujo actual o la cobertura indican que un gasto adicional podría aumentar el riesgo.",
    classes: "bg-[#fae9e4] text-[#a45238] border-[#edcec4]",
  },
};

const riskCopy: Record<
  ScenarioRisk,
  { label: string; message: string; classes: string }
> = {
  stable: {
    label: "Escenario sostenible",
    message:
      "Con los datos actuales, el gasto no vuelve negativo el flujo proyectado.",
    classes: "bg-[#e6eef8] text-[#256344]",
  },
  attention: {
    label: "Requiere atención",
    message:
      "El escenario reduce tu reserva o produce un flujo mensual negativo.",
    classes: "bg-[#fff3df] text-[#986223]",
  },
  critical: {
    label: "Riesgo elevado",
    message:
      "La proyección agota el efectivo o deja menos de tres meses de cobertura.",
    classes: "bg-[#fae9e4] text-[#a45238]",
  },
};

export function DecisionCenter({
  canCreateDecision,
  canReviewDecision,
  currentBalanceCents,
  monthlyIncomeCents,
  monthlyExpenseCents,
}: DecisionCenterProps) {
  const [expenseInput, setExpenseInput] = useState("250000");
  const [monthsInput, setMonthsInput] = useState("6");
  const [scenario, setScenario] = useState({
    addedMonthlyExpenseCents: 250_000_00,
    months: 6,
  });
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [decisionsLoading, setDecisionsLoading] = useState(true);
  const [saveOpen, setSaveOpen] = useState(false);
  const [decisionTitle, setDecisionTitle] = useState("");
  const [savingDecision, setSavingDecision] = useState(false);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [journalError, setJournalError] = useState<string | null>(null);

  useEffect(() => {
    async function loadDecisions() {
      try {
        const response = await fetch("/api/decisions");
        const payload = (await response.json()) as ApiResponse<Decision[]>;
        if (!response.ok || !payload.data) {
          throw new Error(payload.error ?? "No se pudo cargar la bitácora.");
        }
        setDecisions(payload.data);
      } catch (error) {
        setJournalError(
          error instanceof Error ? error.message : "No se pudo cargar la bitácora.",
        );
      } finally {
        setDecisionsLoading(false);
      }
    }

    void loadDecisions();
  }, []);

  const pulse = useMemo(
    () =>
      calculateFinancialPulse({
        currentBalanceCents,
        monthlyIncomeCents,
        monthlyExpenseCents,
      }),
    [currentBalanceCents, monthlyExpenseCents, monthlyIncomeCents],
  );

  const simulation = useMemo(
    () =>
      simulateRecurringExpense({
        currentBalanceCents,
        monthlyIncomeCents,
        monthlyExpenseCents,
        ...scenario,
      }),
    [
      currentBalanceCents,
      monthlyExpenseCents,
      monthlyIncomeCents,
      scenario,
    ],
  );

  const pulseState = pulseCopy[pulse.status];
  const scenarioState = riskCopy[simulation.risk];

  function handleSimulation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const expense = Math.max(0, Number(expenseInput) || 0);
    const months = Math.min(24, Math.max(1, Number(monthsInput) || 1));
    setExpenseInput(String(Math.round(expense)));
    setMonthsInput(String(months));
    setScenario({
      addedMonthlyExpenseCents: Math.round(expense * 100),
      months,
    });
  }

  function openSaveDecision() {
    setDecisionTitle(
      `Evaluar gasto mensual de ${formatMoney(scenario.addedMonthlyExpenseCents)}`,
    );
    setSaveOpen(true);
  }

  async function handleSaveDecision(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingDecision(true);
    setJournalError(null);

    try {
      const response = await fetch("/api/decisions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: decisionTitle,
          addedMonthlyExpenseCents: scenario.addedMonthlyExpenseCents,
          horizonMonths: scenario.months,
        }),
      });
      const payload = (await response.json()) as ApiResponse<Decision>;
      if (!response.ok || !payload.data) {
        throw new Error(payload.error ?? "No se pudo guardar la decisión.");
      }

      setDecisions((current) => [payload.data!, ...current]);
      setSaveOpen(false);
    } catch (error) {
      setJournalError(
        error instanceof Error
          ? error.message
          : "No se pudo guardar la decisión.",
      );
    } finally {
      setSavingDecision(false);
    }
  }

  async function handleReviewDecision(id: string) {
    setReviewingId(id);
    setJournalError(null);

    try {
      const response = await fetch(`/api/decisions/${id}/review`, {
        method: "PATCH",
      });
      const payload = (await response.json()) as ApiResponse<Decision>;
      if (!response.ok || !payload.data) {
        throw new Error(payload.error ?? "No se pudo evaluar la decisión.");
      }
      setDecisions((current) =>
        current.map((decision) =>
          decision.id === id ? payload.data! : decision,
        ),
      );
    } catch (error) {
      setJournalError(
        error instanceof Error
          ? error.message
          : "No se pudo evaluar la decisión.",
      );
    } finally {
      setReviewingId(null);
    }
  }

  return (
    <section
      id="decisiones"
      className="mt-5 scroll-mt-24 rounded-2xl border border-[#d9e1da] bg-[#f9fbf8] p-5 shadow-[0_1px_2px_rgba(20,38,27,0.03)] sm:p-6"
    >
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-[#e5eef8] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#315f9b]">
              Diferenciador Deciflujo
            </span>
            <Sparkles size={15} className="text-[#b16d36]" />
          </div>
          <h3 className="mt-3 text-xl font-semibold tracking-[-0.035em]">
            Centro de decisiones
          </h3>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-[#748093]">
            Comprende tu situación actual y prueba una decisión antes de
            comprometer el dinero.
          </p>
        </div>
        <span className="flex w-fit items-center gap-2 rounded-lg border border-[#d6dfd8] bg-white px-3 py-2 text-xs text-[#667386]">
          <Info size={14} />
          Proyección, no asesoría financiera
        </span>
      </div>

      <div className="mt-6 grid gap-5 xl:grid-cols-[0.8fr_1.4fr]">
        <article className="rounded-2xl border border-[#d9e1eb] bg-white p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity size={18} className="text-[#2b6648]" />
              <h4 className="font-semibold">Pulso Deciflujo</h4>
            </div>
            <span
              className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${pulseState.classes}`}
            >
              {pulseState.label}
            </span>
          </div>

          <div className="mt-6 grid place-items-center">
            <div
              className={`grid size-28 place-items-center rounded-full border-[10px] ${
                pulse.status === "healthy"
                  ? "border-[#d7eadf] bg-[#edf7f1] text-[#276447]"
                  : pulse.status === "attention"
                    ? "border-[#f4e4c7] bg-[#fff8ec] text-[#9a672b]"
                    : "border-[#f0d8d0] bg-[#fff3ef] text-[#a5543b]"
              }`}
            >
              {pulse.status === "healthy" ? (
                <CircleCheckBig size={38} strokeWidth={1.6} />
              ) : (
                <CircleAlert size={38} strokeWidth={1.6} />
              )}
            </div>
          </div>

          <h5 className="mt-5 text-center text-lg font-semibold tracking-[-0.025em]">
            {pulseState.title}
          </h5>
          <p className="mx-auto mt-2 max-w-sm text-center text-sm leading-6 text-[#748093]">
            {pulseState.description}
          </p>

          <div className="mt-6 grid grid-cols-3 gap-2">
            <PulseMetric
              label="Cobertura"
              value={
                pulse.cashCoverageMonths === null
                  ? "Sin límite"
                  : `${pulse.cashCoverageMonths.toFixed(1)} meses`
              }
            />
            <PulseMetric
              label="Gasto/ingreso"
              value={`${(pulse.expenseRatio * 100).toFixed(0)}%`}
            />
            <PulseMetric
              label="Flujo"
              value={formatMoney(pulse.netCashFlowCents)}
            />
          </div>

          <details className="group mt-5 rounded-xl border border-[#dce3ec] bg-[#f8fafc]">
            <summary className="cursor-pointer list-none px-4 py-3 text-sm font-medium text-[#536273]">
              ¿Cómo calculó Deciflujo este pulso?
            </summary>
            <div className="border-t border-[#dee5ed] px-4 py-3 text-xs leading-5 text-[#6f7b8c]">
              <p>
                Flujo mensual = ingresos ({formatMoney(monthlyIncomeCents)}) −
                egresos ({formatMoney(monthlyExpenseCents)}).
              </p>
              <p className="mt-2">
                Cobertura = saldo disponible ({formatMoney(currentBalanceCents)})
                ÷ egresos del período.
              </p>
            </div>
          </details>
        </article>

        <article className="overflow-hidden rounded-2xl border border-[#d9e1eb] bg-white">
          <div className="border-b border-[#dfe6ee] px-5 py-5 sm:px-6">
            <div className="flex items-center gap-2">
              <FlaskConical size={18} className="text-[#9b6435]" />
              <h4 className="font-semibold">Explora un gasto mensual</h4>
            </div>
            <p className="mt-1 text-sm text-[#798493]">
              Responde: ¿qué pasa si agrego un nuevo compromiso fijo?
            </p>
          </div>

          <form
            onSubmit={handleSimulation}
            className="grid gap-3 border-b border-[#e1e6ed] bg-[#fafbfd] p-5 sm:grid-cols-[1fr_150px_auto] sm:items-end sm:px-6"
          >
            <label>
              <span className="mb-1.5 block text-xs font-medium text-[#5d6b7c]">
                Nuevo gasto mensual (₡)
              </span>
              <input
                type="number"
                min="0"
                step="1000"
                required
                value={expenseInput}
                onChange={(event) => setExpenseInput(event.target.value)}
                className="form-control"
              />
            </label>
            <label>
              <span className="mb-1.5 block text-xs font-medium text-[#5d6b7c]">
                Horizonte
              </span>
              <select
                value={monthsInput}
                onChange={(event) => setMonthsInput(event.target.value)}
                className="form-control"
              >
                <option value="3">3 meses</option>
                <option value="6">6 meses</option>
                <option value="12">12 meses</option>
                <option value="24">24 meses</option>
              </select>
            </label>
            <button className="flex h-[43px] items-center justify-center gap-2 rounded-lg bg-[#183153] px-4 text-sm font-medium text-white hover:bg-[#102943]">
              <Play size={15} fill="currentColor" />
              Simular
            </button>
          </form>

          <div className="p-5 sm:p-6">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
              <div>
                <span
                  className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${scenarioState.classes}`}
                >
                  {scenarioState.label}
                </span>
                <p className="mt-2 max-w-lg text-sm leading-6 text-[#67746c]">
                  {scenarioState.message}
                </p>
              </div>
              <div className="text-left sm:text-right">
                <p className="text-xs text-[#8792a1]">
                  Saldo proyectado con decisión
                </p>
                <p
                  className={`mt-1 text-xl font-semibold tracking-[-0.035em] ${
                    simulation.scenarioFinalBalanceCents < 0
                      ? "text-[#a5543b]"
                      : "text-[#315f9b]"
                  }`}
                >
                  {formatMoney(simulation.scenarioFinalBalanceCents)}
                </p>
              </div>
            </div>

            <ScenarioChart projection={simulation.projection} />

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <ResultMetric
                icon={
                  simulation.scenarioMonthlyFlowCents >= 0
                    ? TrendingUp
                    : TrendingDown
                }
                label="Nuevo flujo mensual"
                value={formatMoney(simulation.scenarioMonthlyFlowCents)}
              />
              <ResultMetric
                icon={Gauge}
                label="Impacto acumulado"
                value={`−${formatMoney(simulation.totalImpactCents)}`}
              />
              <ResultMetric
                icon={Activity}
                label="Reserva estimada"
                value={
                  simulation.runwayMonths === null
                    ? "No disminuye"
                    : `${simulation.runwayMonths.toFixed(1)} meses`
                }
              />
            </div>

            <details className="mt-4 rounded-xl border border-[#dce3ec] bg-[#f8fafc]">
              <summary className="cursor-pointer list-none px-4 py-3 text-sm font-medium text-[#536273]">
                Ver supuestos y fórmula
              </summary>
              <div className="border-t border-[#dee5ed] px-4 py-3 text-xs leading-5 text-[#6f7b8c]">
                <p>
                  Deciflujo supone que los ingresos y egresos actuales se repiten
                  cada mes durante {scenario.months} meses.
                </p>
                <p className="mt-2 font-mono">
                  saldo futuro = saldo actual + (ingresos − egresos − nuevo
                  gasto) × meses
                </p>
                <p className="mt-2">
                  No incluye impuestos, inflación, intereses ni cambios
                  estacionales. La transparencia de estos supuestos es parte del
                  diseño.
                </p>
              </div>
            </details>

            {canCreateDecision ? (
              <button
                onClick={openSaveDecision}
                disabled={scenario.addedMonthlyExpenseCents <= 0}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-[#b9cbbf] bg-[#eef5f0] px-4 py-3 text-sm font-semibold text-[#315f9b] transition hover:bg-[#e2eee6] disabled:cursor-not-allowed disabled:opacity-45"
              >
                <Save size={16} />
                Guardar esta decisión en la Bitácora
              </button>
            ) : (
              <p className="mt-4 rounded-xl bg-[#f3f5f9] px-4 py-3 text-center text-sm text-[#788494]">
                Tu rol permite simular y consultar, pero no guardar decisiones.
              </p>
            )}
          </div>
        </article>
      </div>

      <article className="mt-5 overflow-hidden rounded-2xl border border-[#d9e1eb] bg-white">
        <div className="flex flex-col justify-between gap-3 border-b border-[#dfe6ee] px-5 py-5 sm:flex-row sm:items-center sm:px-6">
          <div>
            <div className="flex items-center gap-2">
              <History size={18} className="text-[#2b6648]" />
              <h4 className="font-semibold">Bitácora Deciflujo</h4>
            </div>
            <p className="mt-1 text-sm text-[#798493]">
              Lo que esperabas, lo que decidiste y lo que ocurrió.
            </p>
          </div>
          <span className="w-fit rounded-full bg-[#eef2ee] px-2.5 py-1 text-xs font-medium text-[#68746c]">
            {decisions.length}{" "}
            {decisions.length === 1 ? "decisión" : "decisiones"}
          </span>
        </div>

        {journalError && (
          <div className="mx-5 mt-4 flex items-center gap-2 rounded-xl border border-[#e9cfc6] bg-[#fff7f3] px-4 py-3 text-sm text-[#9c4f35] sm:mx-6">
            <CircleAlert size={16} />
            {journalError}
          </div>
        )}

        {decisionsLoading ? (
          <div className="grid min-h-44 place-items-center text-sm text-[#748093]">
            <span className="flex items-center gap-2">
              <LoaderCircle size={17} className="animate-spin" />
              Cargando decisiones…
            </span>
          </div>
        ) : decisions.length === 0 ? (
          <div className="grid min-h-52 place-items-center px-5 py-8 text-center">
            <div>
              <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-[#eef4ef] text-[#3a6b50]">
                <History size={22} />
              </span>
              <p className="mt-3 font-medium">Todavía no hay decisiones guardadas</p>
              <p className="mt-1 max-w-md text-sm leading-6 text-[#798493]">
                Simula un gasto y guárdalo. Deciflujo conservará la fotografía
                financiera utilizada para poder compararla después.
              </p>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-[#e8ece8]">
            {decisions.map((decision) => (
              <DecisionJournalRow
                key={decision.id}
                decision={decision}
                reviewing={reviewingId === decision.id}
                canReview={canReviewDecision}
                onReview={() => handleReviewDecision(decision.id)}
              />
            ))}
          </div>
        )}
      </article>

      {saveOpen && (
        <div className="fixed inset-0 z-[70] grid place-items-center bg-[#121d2d]/45 p-4 backdrop-blur-[3px]">
          <button
            className="absolute inset-0 cursor-default"
            onClick={() => !savingDecision && setSaveOpen(false)}
            aria-label="Cerrar formulario"
          />
          <form
            onSubmit={handleSaveDecision}
            className="relative w-full max-w-lg rounded-2xl border border-white/60 bg-white p-6 shadow-2xl"
          >
            <span className="grid size-11 place-items-center rounded-xl bg-[#e8f0f9] text-[#315f9b]">
              <Save size={20} />
            </span>
            <h3 className="mt-4 text-xl font-semibold tracking-[-0.03em]">
              Guardar en Bitácora
            </h3>
            <p className="mt-2 text-sm leading-6 text-[#6d7888]">
              Conservaremos los datos y la proyección utilizados en este
              momento para compararlos con el resultado real.
            </p>
            <label className="mt-5 block">
              <span className="mb-1.5 block text-sm font-medium text-[#536172]">
                Nombre de la decisión
              </span>
              <input
                required
                minLength={4}
                maxLength={100}
                value={decisionTitle}
                onChange={(event) => setDecisionTitle(event.target.value)}
                className="form-control"
              />
            </label>
            <div className="mt-4 grid grid-cols-2 gap-3 rounded-xl bg-[#f6f8fb] p-4 text-sm">
              <div>
                <p className="text-xs text-[#7f8a9a]">Gasto mensual</p>
                <p className="mt-1 font-semibold">
                  {formatMoney(scenario.addedMonthlyExpenseCents)}
                </p>
              </div>
              <div>
                <p className="text-xs text-[#7f8a9a]">Horizonte</p>
                <p className="mt-1 font-semibold">{scenario.months} meses</p>
              </div>
            </div>
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                disabled={savingDecision}
                onClick={() => setSaveOpen(false)}
                className="flex-1 rounded-lg border border-[#d5dde8] px-4 py-2.5 text-sm font-medium text-[#5d6979] hover:bg-[#f7f8fa] disabled:opacity-60"
              >
                Cancelar
              </button>
              <button
                disabled={savingDecision}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-[#183153] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#102943] disabled:opacity-60"
              >
                {savingDecision && (
                  <LoaderCircle size={16} className="animate-spin" />
                )}
                Guardar decisión
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}

function DecisionJournalRow({
  decision,
  reviewing,
  canReview,
  onReview,
}: {
  decision: Decision;
  reviewing: boolean;
  canReview: boolean;
  onReview: () => void;
}) {
  const risk = riskCopy[decision.risk];
  const reviewed = decision.status === "reviewed";
  const positiveVariance = (decision.varianceCents ?? 0) >= 0;

  return (
    <div className="px-5 py-5 sm:px-6">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h5 className="font-semibold">{decision.title}</h5>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${risk.classes}`}
            >
              {risk.label}
            </span>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                reviewed
                  ? "bg-[#e7edf1] text-[#4b6875]"
                  : "bg-[#f1f3f6] text-[#697586]"
              }`}
            >
              {reviewed ? "Evaluada" : "En seguimiento"}
            </span>
          </div>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#7c8780]">
            <span>
              Gasto: {formatMoney(decision.addedMonthlyExpenseCents)}/mes
            </span>
            <span>{decision.horizonMonths} meses</span>
            <span className="flex items-center gap-1">
              <CalendarCheck size={13} />
              Revisar:{" "}
              {dateFormatter.format(
                new Date(`${decision.reviewOn}T00:00:00Z`),
              )}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:min-w-[430px]">
          <JournalMetric
            label="Saldo inicial"
            value={formatMoney(decision.startingBalanceCents)}
          />
          <JournalMetric
            label="Esperado"
            value={formatMoney(decision.projectedFinalBalanceCents)}
          />
          {reviewed ? (
            <JournalMetric
              label="Real observado"
              value={formatMoney(decision.actualBalanceCents ?? 0)}
              detail={`${
                positiveVariance ? "+" : "−"
              }${formatMoney(Math.abs(decision.varianceCents ?? 0))} vs. esperado`}
              positive={positiveVariance}
            />
          ) : canReview ? (
            <button
              onClick={onReview}
              disabled={reviewing}
              className="flex min-h-[66px] items-center justify-center gap-2 rounded-xl border border-[#cbd8cf] bg-[#f0f6f2] px-3 text-xs font-semibold text-[#315f47] hover:bg-[#e4efe8] disabled:opacity-60"
              title="Si la fecha objetivo aún no llega, la comparación será anticipada"
            >
              {reviewing ? (
                <LoaderCircle size={15} className="animate-spin" />
              ) : (
                <CalendarCheck size={15} />
              )}
              Evaluar ahora
            </button>
          ) : (
            <div className="flex min-h-[66px] items-center justify-center rounded-xl bg-[#f3f5f9] px-3 text-center text-xs text-[#7d8796]">
              Solo lectura
            </div>
          )}
        </div>
      </div>

      {!reviewed && (
        <p className="mt-3 text-[11px] text-[#8d98a8]">
          Si evalúas antes de la fecha objetivo, el resultado se marcará como
          comparación anticipada.
        </p>
      )}
    </div>
  );
}

function JournalMetric({
  label,
  value,
  detail,
  positive,
}: {
  label: string;
  value: string;
  detail?: string;
  positive?: boolean;
}) {
  return (
    <div className="rounded-xl bg-[#f6f8f5] px-3 py-2.5">
      <p className="text-[9px] font-medium uppercase tracking-[0.07em] text-[#8792a1]">
        {label}
      </p>
      <p className="mt-1 truncate text-xs font-semibold">{value}</p>
      {detail && (
        <p
          className={`mt-1 text-[9px] ${
            positive ? "text-[#2d7351]" : "text-[#a5543b]"
          }`}
        >
          {detail}
        </p>
      )}
    </div>
  );
}

function PulseMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-[#f3f6f2] px-2 py-3 text-center">
      <p className="text-[10px] uppercase tracking-[0.07em] text-[#8491a1]">
        {label}
      </p>
      <p className="mt-1 truncate text-xs font-semibold text-[#3c4941]">
        {value}
      </p>
    </div>
  );
}

function ResultMetric({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Activity;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-[#e0e5e0] bg-[#fafbfd] p-3">
      <div className="flex items-center gap-1.5 text-[#7a8696]">
        <Icon size={14} />
        <p className="text-[10px] font-medium uppercase tracking-[0.06em]">
          {label}
        </p>
      </div>
      <p className="mt-2 text-sm font-semibold">{value}</p>
    </div>
  );
}

function ScenarioChart({ projection }: { projection: ProjectionPoint[] }) {
  const width = 640;
  const height = 230;
  const padding = { top: 20, right: 22, bottom: 34, left: 22 };
  const values = projection.flatMap((point) => [
    point.baselineBalanceCents,
    point.scenarioBalanceCents,
  ]);
  const minimum = Math.min(0, ...values);
  const maximum = Math.max(1, ...values);
  const range = maximum - minimum || 1;
  const x = (index: number) =>
    padding.left +
    (index / Math.max(1, projection.length - 1)) *
      (width - padding.left - padding.right);
  const y = (value: number) =>
    padding.top +
    ((maximum - value) / range) *
      (height - padding.top - padding.bottom);
  const baselinePoints = projection
    .map((point, index) => `${x(index)},${y(point.baselineBalanceCents)}`)
    .join(" ");
  const scenarioPoints = projection
    .map((point, index) => `${x(index)},${y(point.scenarioBalanceCents)}`)
    .join(" ");
  const zeroY = y(0);

  return (
    <div className="mt-6">
      <div className="mb-2 flex items-center justify-end gap-4 text-[10px] text-[#748093]">
        <span className="flex items-center gap-1.5">
          <span className="h-0.5 w-4 bg-[#2c7351]" /> Sin decisión
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-0.5 w-4 bg-[#d08252]" /> Con nuevo gasto
        </span>
      </div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full overflow-visible"
        role="img"
        aria-label="Comparación del saldo proyectado con y sin el nuevo gasto"
      >
        {[0.25, 0.5, 0.75].map((position) => (
          <line
            key={position}
            x1={padding.left}
            x2={width - padding.right}
            y1={padding.top + (height - padding.top - padding.bottom) * position}
            y2={padding.top + (height - padding.top - padding.bottom) * position}
            stroke="#e4e8e4"
            strokeDasharray="4 5"
          />
        ))}
        {minimum < 0 && (
          <line
            x1={padding.left}
            x2={width - padding.right}
            y1={zeroY}
            y2={zeroY}
            stroke="#c56e54"
            strokeDasharray="6 4"
          />
        )}
        <polyline
          points={baselinePoints}
          fill="none"
          stroke="#2c7351"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <polyline
          points={scenarioPoints}
          fill="none"
          stroke="#d08252"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {projection.map((point, index) => (
          <g key={point.month}>
            <circle
              cx={x(index)}
              cy={y(point.scenarioBalanceCents)}
              r="3.5"
              fill="#fff"
              stroke="#d08252"
              strokeWidth="2"
            />
            <text
              x={x(index)}
              y={height - 10}
              textAnchor="middle"
              fontSize="10"
              fill="#8491a1"
            >
              {index === 0 ? "Hoy" : `M${point.month}`}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}
