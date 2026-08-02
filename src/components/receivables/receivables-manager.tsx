"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  ArrowDownLeft,
  ArrowLeft,
  ArrowUpRight,
  Building2,
  CalendarClock,
  CheckCircle2,
  Clock3,
  LoaderCircle,
  Plus,
  ReceiptText,
  WalletCards,
  X,
} from "lucide-react";
import type { AccountOverview } from "@/modules/finance/domain/account";
import {
  summarizeOpenItems,
  type OpenItem,
  type OpenItemKind,
  type OpenItemStatus,
} from "@/modules/finance/domain/open-item";

type ApiResponse<T> = {
  data?: T;
  error?: string;
};

type Filter = "open" | "all" | OpenItemKind;

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

const statusLabels: Record<OpenItemStatus, string> = {
  pending: "Pendiente",
  overdue: "Vencido",
  paid: "Pagado",
};

function formatMoney(amountCents: number) {
  return moneyFormatter.format(amountCents / 100);
}

function defaultDueDate() {
  const date = new Date();
  date.setDate(date.getDate() + 7);
  return date.toISOString().slice(0, 10);
}

export function ReceivablesManager({
  organizationName,
}: {
  organizationName: string;
}) {
  const [items, setItems] = useState<OpenItem[]>([]);
  const [accounts, setAccounts] = useState<AccountOverview[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [payingItem, setPayingItem] = useState<OpenItem | null>(null);
  const [filter, setFilter] = useState<Filter>("open");
  const [error, setError] = useState<string | null>(null);

  async function loadData() {
    const [itemsResponse, accountsResponse] = await Promise.all([
      fetch("/api/open-items"),
      fetch("/api/accounts"),
    ]);
    const itemsPayload =
      (await itemsResponse.json()) as ApiResponse<OpenItem[]>;
    const accountsPayload =
      (await accountsResponse.json()) as ApiResponse<AccountOverview[]>;

    if (!itemsResponse.ok || !itemsPayload.data) {
      throw new Error(
        itemsPayload.error ?? "No se pudieron cargar las cuentas pendientes.",
      );
    }
    if (!accountsResponse.ok || !accountsPayload.data) {
      throw new Error(
        accountsPayload.error ?? "No se pudieron cargar las cuentas financieras.",
      );
    }
    setItems(itemsPayload.data);
    setAccounts(accountsPayload.data);
  }

  useEffect(() => {
    let active = true;
    void Promise.all([
      fetch("/api/open-items"),
      fetch("/api/accounts"),
    ])
      .then(async ([itemsResponse, accountsResponse]) => {
        const itemsPayload =
          (await itemsResponse.json()) as ApiResponse<OpenItem[]>;
        const accountsPayload =
          (await accountsResponse.json()) as ApiResponse<AccountOverview[]>;
        if (!active) return;
        if (!itemsResponse.ok || !itemsPayload.data) {
          throw new Error(
            itemsPayload.error ??
              "No se pudieron cargar las cuentas pendientes.",
          );
        }
        if (!accountsResponse.ok || !accountsPayload.data) {
          throw new Error(
            accountsPayload.error ??
              "No se pudieron cargar las cuentas financieras.",
          );
        }
        setItems(itemsPayload.data);
        setAccounts(accountsPayload.data);
      })
      .catch((loadError: unknown) => {
        if (!active) return;
        setError(
          loadError instanceof Error
            ? loadError.message
            : "No se pudieron cargar los datos.",
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const summary = useMemo(() => summarizeOpenItems(items), [items]);
  const visibleItems = useMemo(
    () =>
      items.filter((item) => {
        if (filter === "all") return true;
        if (filter === "open") return item.status !== "paid";
        return item.kind === filter;
      }),
    [filter, items],
  );

  async function createItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    setSaving(true);
    setError(null);
    const response = await fetch("/api/open-items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kind: form.get("kind"),
        counterpartyName: form.get("counterpartyName"),
        concept: form.get("concept"),
        amountCents: Math.round(Number(form.get("amount")) * 100),
        dueOn: form.get("dueOn"),
      }),
    });
    const payload = (await response.json()) as ApiResponse<OpenItem>;
    if (!response.ok || !payload.data) {
      setError(payload.error ?? "No fue posible registrar la cuenta.");
      setSaving(false);
      return;
    }
    setItems((current) => [payload.data!, ...current]);
    formElement.reset();
    setFormOpen(false);
    setSaving(false);
  }

  async function payItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!payingItem) return;
    const form = new FormData(event.currentTarget);
    setSaving(true);
    setError(null);
    const response = await fetch(`/api/open-items/${payingItem.id}/pay`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        accountId: form.get("accountId"),
        paidOn: form.get("paidOn"),
      }),
    });
    const payload = (await response.json()) as ApiResponse<OpenItem>;
    if (!response.ok || !payload.data) {
      setError(payload.error ?? "No fue posible registrar el pago.");
      setSaving(false);
      return;
    }
    await loadData();
    setPayingItem(null);
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
              Cobros y pagos
            </h1>
            <p className="mt-2 max-w-2xl leading-7 text-[#6d7888]">
              Controla lo que tus clientes te deben y las obligaciones con tus
              proveedores antes de que afecten tu flujo.
            </p>
          </div>
          <button
            onClick={() => setFormOpen(true)}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#183153] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#102943]"
          >
            <Plus size={17} /> Nueva cuenta
          </button>
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
            title="Por cobrar"
            value={formatMoney(summary.receivableCents)}
            note={`${summary.overdueCount} cuentas vencidas en total`}
            icon={ArrowDownLeft}
            tone="green"
          />
          <SummaryCard
            title="Por pagar"
            value={formatMoney(summary.payableCents)}
            note="Obligaciones abiertas"
            icon={ArrowUpRight}
            tone="clay"
          />
          <SummaryCard
            title="Cobros vencidos"
            value={formatMoney(summary.overdueReceivableCents)}
            note="Requieren seguimiento"
            icon={CalendarClock}
            tone="amber"
          />
          <SummaryCard
            title="Pagos vencidos"
            value={formatMoney(summary.overduePayableCents)}
            note={`${summary.pendingCount} cuentas aún en plazo`}
            icon={Clock3}
            tone="red"
          />
        </section>

        <section className="mt-6 overflow-hidden rounded-2xl border border-[#dce3ec] bg-white">
          <div className="flex flex-col gap-4 border-b border-[#e4e9f0] p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-semibold">Próximos vencimientos</h2>
              <p className="mt-1 text-sm text-[#788494]">
                Al pagar se crea automáticamente el movimiento de ingreso o
                egreso.
              </p>
            </div>
            <div className="flex flex-wrap gap-1 rounded-lg bg-[#f1f4f1] p-1">
              {(
                [
                  ["open", "Abiertas"],
                  ["receivable", "Por cobrar"],
                  ["payable", "Por pagar"],
                  ["all", "Todas"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  onClick={() => setFilter(value)}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                    filter === value
                      ? "bg-white text-[#234b37] shadow-sm"
                      : "text-[#758091] hover:text-[#35463c]"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="grid min-h-52 place-items-center">
              <LoaderCircle className="animate-spin text-[#52705e]" />
            </div>
          ) : visibleItems.length === 0 ? (
            <div className="grid min-h-64 place-items-center px-5 text-center">
              <div>
                <span className="mx-auto grid size-12 place-items-center rounded-xl bg-[#edf2f8] text-[#4c715c]">
                  <ReceiptText size={22} />
                </span>
                <p className="mt-4 font-medium">No hay cuentas en esta vista</p>
                <p className="mt-1 text-sm text-[#7b8696]">
                  Registra un cobro o pago pendiente para empezar.
                </p>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-[#eef1f5]">
              {visibleItems.map((item) => (
                <article
                  key={item.id}
                  className="grid gap-4 px-5 py-4 transition hover:bg-[#fafbfa] md:grid-cols-[1.4fr_0.9fr_0.8fr_auto] md:items-center"
                >
                  <div className="flex items-start gap-3">
                    <span
                      className={`mt-0.5 grid size-9 shrink-0 place-items-center rounded-lg ${
                        item.kind === "receivable"
                          ? "bg-[#e8f4ed] text-[#27704d]"
                          : "bg-[#fff0e8] text-[#a45b39]"
                      }`}
                    >
                      {item.kind === "receivable" ? (
                        <ArrowDownLeft size={17} />
                      ) : (
                        <ArrowUpRight size={17} />
                      )}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-medium">{item.concept}</p>
                      <p className="mt-0.5 truncate text-sm text-[#7b8696]">
                        {item.counterpartyName} ·{" "}
                        {item.kind === "receivable"
                          ? "Cliente"
                          : "Proveedor"}
                      </p>
                    </div>
                  </div>
                  <div>
                    <p className="font-semibold">
                      {formatMoney(item.amountCents)}
                    </p>
                    <p className="mt-0.5 text-xs text-[#8a95a5]">
                      Vence {dateFormatter.format(new Date(item.dueOn))}
                    </p>
                  </div>
                  <StatusBadge status={item.status} />
                  <div className="md:text-right">
                    {item.status === "paid" ? (
                      <span className="inline-flex items-center gap-1.5 text-sm font-medium text-[#3e7357]">
                        <CheckCircle2 size={16} /> Completado
                      </span>
                    ) : (
                      <button
                        onClick={() => setPayingItem(item)}
                        disabled={accounts.length === 0}
                        title={
                          accounts.length === 0
                            ? "Crea primero una cuenta financiera"
                            : undefined
                        }
                        className="inline-flex items-center gap-2 rounded-lg border border-[#cfdad2] bg-[#f6f8fb] px-3 py-2 text-sm font-medium text-[#315d46] hover:bg-[#eaf0f7] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <WalletCards size={15} /> Marcar pagado
                      </button>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>

      {formOpen && (
        <Dialog title="Nueva cuenta pendiente" onClose={() => setFormOpen(false)}>
          <form className="space-y-4" onSubmit={(event) => void createItem(event)}>
            <label className="block text-sm font-medium">
              Tipo
              <select name="kind" className="form-control mt-1.5" required>
                <option value="receivable">Cuenta por cobrar</option>
                <option value="payable">Cuenta por pagar</option>
              </select>
            </label>
            <label className="block text-sm font-medium">
              Cliente o proveedor
              <input
                name="counterpartyName"
                className="form-control mt-1.5"
                minLength={2}
                maxLength={100}
                placeholder="Ej. Cliente Acme"
                required
              />
            </label>
            <label className="block text-sm font-medium">
              Concepto
              <input
                name="concept"
                className="form-control mt-1.5"
                minLength={3}
                maxLength={140}
                placeholder="Ej. Factura de servicios de julio"
                required
              />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-medium">
                Monto (CRC)
                <input
                  name="amount"
                  className="form-control mt-1.5"
                  type="number"
                  min="1"
                  step="0.01"
                  required
                />
              </label>
              <label className="block text-sm font-medium">
                Vencimiento
                <input
                  name="dueOn"
                  className="form-control mt-1.5"
                  type="date"
                  defaultValue={defaultDueDate()}
                  required
                />
              </label>
            </div>
            <DialogActions
              saving={saving}
              onCancel={() => setFormOpen(false)}
              submitLabel="Registrar cuenta"
            />
          </form>
        </Dialog>
      )}

      {payingItem && (
        <Dialog
          title="Registrar pago"
          onClose={() => setPayingItem(null)}
        >
          <div className="mb-5 rounded-xl bg-[#f3f6fa] p-4">
            <p className="text-sm text-[#758091]">{payingItem.concept}</p>
            <p className="mt-1 text-xl font-semibold">
              {formatMoney(payingItem.amountCents)}
            </p>
            <p className="mt-1 text-xs text-[#89938d]">
              Se creará un{" "}
              {payingItem.kind === "receivable" ? "ingreso" : "egreso"} en la
              cuenta seleccionada.
            </p>
          </div>
          <form className="space-y-4" onSubmit={(event) => void payItem(event)}>
            <label className="block text-sm font-medium">
              Cuenta financiera
              <select name="accountId" className="form-control mt-1.5" required>
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name} · {formatMoney(account.balanceCents)}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm font-medium">
              Fecha efectiva
              <input
                name="paidOn"
                className="form-control mt-1.5"
                type="date"
                defaultValue={new Date().toISOString().slice(0, 10)}
                required
              />
            </label>
            <DialogActions
              saving={saving}
              onCancel={() => setPayingItem(null)}
              submitLabel="Confirmar pago"
            />
          </form>
        </Dialog>
      )}
    </main>
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
  icon: typeof ArrowDownLeft;
  tone: "green" | "clay" | "amber" | "red";
}) {
  const tones = {
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

function StatusBadge({ status }: { status: OpenItemStatus }) {
  const classes: Record<OpenItemStatus, string> = {
    pending: "bg-[#edf2f8] text-[#486353]",
    overdue: "bg-[#fff0ed] text-[#a24e40]",
    paid: "bg-[#e7f4eb] text-[#28714d]",
  };
  return (
    <span
      className={`w-fit rounded-full px-2.5 py-1 text-xs font-semibold ${classes[status]}`}
    >
      {statusLabels[status]}
    </span>
  );
}

function Dialog({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-[#15263c]/35 p-4 backdrop-blur-sm">
      <section className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-xl font-semibold tracking-[-0.03em]">{title}</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-[#718092] hover:bg-[#f0f3f7]"
            aria-label="Cerrar"
          >
            <X size={18} />
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}

function DialogActions({
  saving,
  onCancel,
  submitLabel,
}: {
  saving: boolean;
  onCancel: () => void;
  submitLabel: string;
}) {
  return (
    <div className="flex justify-end gap-3 pt-2">
      <button
        type="button"
        onClick={onCancel}
        className="rounded-lg border border-[#d6dee8] px-4 py-2.5 text-sm font-medium text-[#647184]"
      >
        Cancelar
      </button>
      <button
        type="submit"
        disabled={saving}
        className="inline-flex items-center gap-2 rounded-lg bg-[#183153] px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60"
      >
        {saving && <LoaderCircle size={16} className="animate-spin" />}
        {submitLabel}
      </button>
    </div>
  );
}
