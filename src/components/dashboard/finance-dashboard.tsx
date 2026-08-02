"use client";

import {
  ArrowDownRight,
  ArrowUpRight,
  Bell,
  BookOpen,
  Banknote,
  Building2,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  CircleHelp,
  Compass,
  CreditCard,
  FileBarChart,
  Landmark,
  LayoutDashboard,
  ListChecks,
  LoaderCircle,
  LogOut,
  Menu,
  Plus,
  ReceiptText,
  Search,
  Settings,
  ShieldCheck,
  Trash2,
  TrendingDown,
  TrendingUp,
  Users,
  WalletCards,
  X,
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";
import { calculateFinancialSummary } from "@/modules/finance/domain/financial-summary";
import { DecisionCenter } from "@/components/decisions/decision-center";
import {
  accountTypes,
  type AccountOverview,
  type AccountType,
} from "@/modules/finance/domain/account";
import {
  transactionCategories,
  type Transaction,
  type TransactionCategory,
  type TransactionType,
} from "@/modules/finance/domain/transaction";

type ApiResponse<T> = {
  data?: T;
  error?: string;
};

type TransactionForm = {
  description: string;
  amount: string;
  type: TransactionType;
  category: TransactionCategory;
  accountId: string;
  occurredOn: string;
};

type AccountForm = {
  name: string;
  type: AccountType;
  openingBalance: string;
};

const initialForm: TransactionForm = {
  description: "",
  amount: "",
  type: "income",
  category: "Ventas",
  accountId: "",
  occurredOn: new Date().toISOString().slice(0, 10),
};

const initialAccountForm: AccountForm = {
  name: "",
  type: "bank",
  openingBalance: "0",
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
  month: "long",
  year: "numeric",
});

function formatMoney(amountCents: number) {
  return moneyFormatter.format(amountCents / 100);
}

const accountTypeLabels: Record<AccountType, string> = {
  bank: "Cuenta bancaria",
  cash: "Efectivo",
  card: "Tarjeta",
};

const navItems = [
  { label: "Resumen", icon: LayoutDashboard, href: "#resumen", active: true },
  { label: "Decisiones", icon: Compass, href: "#decisiones" },
  { label: "Movimientos", icon: WalletCards, href: "#movimientos" },
  { label: "Cuentas", icon: Landmark, href: "#cuentas" },
  { label: "Cobros y pagos", icon: ReceiptText, href: "/receivables" },
  { label: "Presupuestos", icon: ListChecks, href: "/budgets" },
  { label: "Reportes", icon: FileBarChart, href: "/reports" },
  { label: "Tendencias", icon: TrendingUp, href: "/trends" },
  { label: "Equipo", icon: Users, href: "/team" },
  { label: "Auditoría", icon: ShieldCheck, href: "/audit" },
];

const tourSteps = [
  {
    title: "Cuentas",
    subtitle: "Define dónde está tu dinero",
    description:
      "Crea tus cuentas bancarias, efectivo y tarjetas. El saldo de cada una se actualiza con sus movimientos.",
    example:
      "Empieza con una cuenta bancaria principal y agrega caja chica o tarjetas solamente si las utilizas.",
    action: "Ver cuentas",
    href: "#cuentas",
    icon: Landmark,
  },
  {
    title: "Movimientos",
    subtitle: "Registra lo que entra y sale",
    description:
      "Anota cada ingreso o egreso con fecha, categoría y cuenta. Deciflujo recalcula tus saldos automáticamente.",
    example:
      "Una venta es un ingreso; alquiler, planilla o publicidad son egresos.",
    action: "Ver movimientos",
    href: "#movimientos",
    icon: WalletCards,
  },
  {
    title: "Planificación",
    subtitle: "Anticipa pagos y límites",
    description:
      "Registra cobros y pagos pendientes, y define presupuestos mensuales para controlar tus gastos.",
    example:
      "Deciflujo te avisa cuando una categoría alcanza el 80% de su presupuesto.",
    action: "Abrir presupuestos",
    href: "/budgets",
    icon: ListChecks,
  },
  {
    title: "Análisis",
    subtitle: "Comprende cómo marcha el negocio",
    description:
      "Usa reportes y tendencias para comparar ingresos, egresos y flujo neto sin revisar movimiento por movimiento.",
    example:
      "Filtra un período y exporta el reporte cuando necesites compartirlo con contabilidad.",
    action: "Abrir reportes",
    href: "/reports",
    icon: FileBarChart,
  },
  {
    title: "Cierre mensual",
    subtitle: "Protege un período confirmado",
    description:
      "Cuando hayas revisado el mes, ciérralo para guardar una fotografía financiera y evitar modificaciones accidentales.",
    example:
      "Si detectas un error, un propietario o administrador puede reabrir el período y el cambio queda auditado.",
    action: "Ver cierres",
    href: "/trends",
    icon: ShieldCheck,
  },
] as const;

type FinanceDashboardProps = {
  organizationName: string;
  role: string;
  userName: string;
};

type DemoDataSummary = {
  accountCount: number;
  transactionCount: number;
};

function initials(value: string) {
  return value
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export function FinanceDashboard({
  organizationName,
  role,
  userName,
}: FinanceDashboardProps) {
  const router = useRouter();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<AccountOverview[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [accountSaving, setAccountSaving] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [accountFormOpen, setAccountFormOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [form, setForm] = useState<TransactionForm>(initialForm);
  const [accountForm, setAccountForm] =
    useState<AccountForm>(initialAccountForm);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [transactionToDelete, setTransactionToDelete] =
    useState<Transaction | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [tourOpen, setTourOpen] = useState(false);
  const [tourStep, setTourStep] = useState(0);
  const [showGettingStarted, setShowGettingStarted] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [demoData, setDemoData] = useState<DemoDataSummary | null>(null);
  const [removingDemo, setRemovingDemo] = useState(false);
  const canDeleteTransactions = role === "owner" || role === "admin";
  const canManageTeam = role === "owner" || role === "admin";
  const canCreateDecisions = role !== "collaborator";
  const canReviewDecisions = role !== "collaborator";
  async function handleSignOut() {
    setSigningOut(true);
    await authClient.signOut();
    router.push("/sign-in");
    router.refresh();
  }

  async function removeDemoData() {
    if (
      !window.confirm(
        "¿Eliminar los movimientos y saldos de demostración? Esta acción no elimina datos que hayas registrado.",
      )
    ) {
      return;
    }

    setRemovingDemo(true);
    const response = await fetch("/api/demo-data", { method: "DELETE" });
    if (!response.ok) {
      const payload = (await response.json()) as ApiResponse<never>;
      setError(payload.error ?? "No fue posible retirar los datos de ejemplo.");
      setRemovingDemo(false);
      return;
    }
    window.location.reload();
  }

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setShowGettingStarted(
        window.localStorage.getItem("deciflujo:hide-getting-started") !== "true",
      );
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    async function loadDashboard() {
      try {
        const [transactionsResponse, accountsResponse, demoResponse] =
          await Promise.all([
          fetch("/api/transactions"),
          fetch("/api/accounts"),
          fetch("/api/demo-data"),
        ]);
        const transactionsPayload =
          (await transactionsResponse.json()) as ApiResponse<Transaction[]>;
        const accountsPayload =
          (await accountsResponse.json()) as ApiResponse<AccountOverview[]>;
        const demoPayload =
          (await demoResponse.json()) as ApiResponse<DemoDataSummary>;

        if (!transactionsResponse.ok || !transactionsPayload.data) {
          throw new Error(
            transactionsPayload.error ?? "No se pudieron cargar los movimientos.",
          );
        }
        if (!accountsResponse.ok || !accountsPayload.data) {
          throw new Error(
            accountsPayload.error ?? "No se pudieron cargar las cuentas.",
          );
        }
        setTransactions(transactionsPayload.data);
        setAccounts(accountsPayload.data);
        if (demoResponse.ok && demoPayload.data) {
          setDemoData(demoPayload.data);
        }
        setForm((current) => ({
          ...current,
          accountId: current.accountId || accountsPayload.data![0]?.id || "",
        }));
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "No se pudieron cargar los datos.",
        );
      } finally {
        setLoading(false);
      }
    }

    void loadDashboard();
  }, []);

  useEffect(() => {
    if (!tourOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleTourKeyboard(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setTourOpen(false);
      }
      if (event.key === "ArrowRight") {
        setTourStep((current) =>
          Math.min(current + 1, tourSteps.length - 1),
        );
      }
      if (event.key === "ArrowLeft") {
        setTourStep((current) => Math.max(current - 1, 0));
      }
    }

    window.addEventListener("keydown", handleTourKeyboard);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleTourKeyboard);
    };
  }, [tourOpen]);

  const summary = useMemo(
    () => calculateFinancialSummary(transactions),
    [transactions],
  );

  const availableBalanceCents = useMemo(
    () =>
      accounts.reduce(
        (total, account) => total + account.balanceCents,
        0,
      ),
    [accounts],
  );

  const accountNames = useMemo(
    () => new Map(accounts.map((account) => [account.id, account.name])),
    [accounts],
  );

  const filteredTransactions = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("es");
    if (!query) return transactions;

    return transactions.filter(
      (transaction) =>
        transaction.description.toLocaleLowerCase("es").includes(query) ||
        transaction.category.toLocaleLowerCase("es").includes(query),
    );
  }, [search, transactions]);

  const expenseBreakdown = useMemo(() => {
    const expenses = transactions.filter(
      (transaction) => transaction.type === "expense",
    );
    const byCategory = new Map<string, number>();

    for (const expense of expenses) {
      byCategory.set(
        expense.category,
        (byCategory.get(expense.category) ?? 0) + expense.amountCents,
      );
    }

    return [...byCategory.entries()]
      .sort(([, left], [, right]) => right - left)
      .slice(0, 4);
  }, [transactions]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    const amount = Number(form.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Ingresa un monto mayor que cero.");
      setSaving(false);
      return;
    }

    try {
      const response = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: form.description,
          amountCents: Math.round(amount * 100),
          type: form.type,
          category: form.category,
          accountId: form.accountId,
          occurredOn: form.occurredOn,
        }),
      });
      const payload = (await response.json()) as ApiResponse<Transaction>;

      if (!response.ok || !payload.data) {
        throw new Error(payload.error ?? "No fue posible guardar el movimiento.");
      }

      setTransactions((current) =>
        [payload.data!, ...current].sort((left, right) =>
          right.occurredOn.localeCompare(left.occurredOn),
        ),
      );
      const balanceDelta =
        payload.data.type === "income"
          ? payload.data.amountCents
          : -payload.data.amountCents;
      setAccounts((current) =>
        current.map((account) =>
          account.id === payload.data!.accountId
            ? {
                ...account,
                balanceCents: account.balanceCents + balanceDelta,
                transactionCount: account.transactionCount + 1,
              }
            : account,
        ),
      );
      setForm({ ...initialForm, accountId: form.accountId });
      setFormOpen(false);
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "No fue posible guardar el movimiento.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!transactionToDelete) return;

    setDeleting(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/transactions/${transactionToDelete.id}`,
        { method: "DELETE" },
      );

      if (!response.ok) {
        const payload = (await response.json()) as ApiResponse<never>;
        throw new Error(payload.error ?? "No fue posible eliminar el movimiento.");
      }

      setTransactions((current) =>
        current.filter(
          (transaction) => transaction.id !== transactionToDelete.id,
        ),
      );
      const balanceDelta =
        transactionToDelete.type === "income"
          ? -transactionToDelete.amountCents
          : transactionToDelete.amountCents;
      setAccounts((current) =>
        current.map((account) =>
          account.id === transactionToDelete.accountId
            ? {
                ...account,
                balanceCents: account.balanceCents + balanceDelta,
                transactionCount: Math.max(0, account.transactionCount - 1),
              }
            : account,
        ),
      );
      setTransactionToDelete(null);
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "No fue posible eliminar el movimiento.",
      );
    } finally {
      setDeleting(false);
    }
  }

  async function handleAccountSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAccountSaving(true);
    setError(null);

    const openingBalance = Number(accountForm.openingBalance);
    if (!Number.isFinite(openingBalance) || openingBalance < 0) {
      setError("El saldo inicial debe ser cero o un número positivo.");
      setAccountSaving(false);
      return;
    }

    try {
      const response = await fetch("/api/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: accountForm.name,
          type: accountForm.type,
          openingBalanceCents: Math.round(openingBalance * 100),
        }),
      });
      const payload = (await response.json()) as ApiResponse<AccountOverview>;

      if (!response.ok || !payload.data) {
        throw new Error(payload.error ?? "No fue posible crear la cuenta.");
      }

      setAccounts((current) => [...current, payload.data!]);
      setForm((current) => ({ ...current, accountId: payload.data!.id }));
      setAccountForm(initialAccountForm);
      setAccountFormOpen(false);
    } catch (accountError) {
      setError(
        accountError instanceof Error
          ? accountError.message
          : "No fue posible crear la cuenta.",
      );
    } finally {
      setAccountSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#f7f8fa] text-[#18212f]">
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-[248px] border-r border-[#dce3ec] bg-[#fbfcfe] transition-transform lg:translate-x-0 ${
          menuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-full flex-col px-4 py-5">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-3">
              <div className="grid size-10 place-items-center rounded-xl bg-[#183153] text-white shadow-sm">
                <Building2 size={20} strokeWidth={2.2} />
              </div>
              <div>
                <p className="font-semibold tracking-[-0.02em]">Deciflujo</p>
                <p className="text-xs text-[#748093]">Control para pymes</p>
              </div>
            </div>
            <button
              className="rounded-lg p-2 text-[#667386] hover:bg-[#eef2f7] lg:hidden"
              onClick={() => setMenuOpen(false)}
              aria-label="Cerrar menú"
            >
              <X size={18} />
            </button>
          </div>

          <button
            className="mt-7 w-full rounded-xl border border-[#dce3ec] bg-white p-3 text-left transition hover:border-[#b6c6da]"
            onClick={() => router.push("/onboarding")}
            title="Cambiar de empresa"
          >
            <div className="flex items-center gap-3">
              <div className="grid size-9 place-items-center rounded-lg bg-[#edf3fb] text-sm font-semibold text-[#3567a8]">
                {initials(organizationName)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{organizationName}</p>
                <p className="text-xs text-[#7d8796]">Plan emprendedor</p>
              </div>
              <ChevronDown size={15} className="text-[#7d8796]" />
            </div>
          </button>

          <nav className="mt-6 space-y-1">
            <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8d98a8]">
              Espacio de trabajo
            </p>
            {navItems
              .filter(
                ({ label }) =>
                  !["Equipo", "Auditoría"].includes(label) || canManageTeam,
              )
              .map(({ label, icon: Icon, active, href }) => (
                <a
                  key={label}
                  href={href}
                  onClick={() => setMenuOpen(false)}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition ${
                    active
                      ? "bg-[#edf3fb] font-medium text-[#274f86]"
                      : "text-[#687588] hover:bg-[#f1f3f6] hover:text-[#283444]"
                  }`}
                >
                  <Icon size={18} strokeWidth={active ? 2.2 : 1.8} />
                  {label}
                </a>
              ))}
          </nav>

          <div className="mt-auto space-y-1 border-t border-[#e6e9e5] pt-4">
            <Link href="/help" className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-[#687588] hover:bg-[#f1f3f6]">
              <CircleHelp size={18} /> Centro de ayuda
            </Link>
            <Link href="/settings" className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-[#687588] hover:bg-[#f1f3f6]">
              <Settings size={18} /> Configuración
            </Link>
            <div className="mt-3 flex items-center gap-3 px-3 py-2">
              <div className="grid size-9 place-items-center rounded-full bg-[#293b31] text-xs font-semibold text-white">
                {initials(userName)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{userName}</p>
                <p className="text-xs text-[#8691a0]">
                  {role === "owner"
                    ? "Propietario"
                    : role === "admin"
                      ? "Administrador"
                      : role === "accountant"
                        ? "Contador"
                        : "Colaborador"}
                </p>
              </div>
              <button
                className="rounded-lg p-2 text-[#77827b] hover:bg-[#eef2f7] hover:text-[#334139] disabled:opacity-50"
                onClick={() => void handleSignOut()}
                disabled={signingOut}
                aria-label="Cerrar sesión"
                title="Cerrar sesión"
              >
                {signingOut ? (
                  <LoaderCircle size={17} className="animate-spin" />
                ) : (
                  <LogOut size={17} />
                )}
              </button>
            </div>
          </div>
        </div>
      </aside>

      {menuOpen && (
        <button
          className="fixed inset-0 z-30 bg-black/20 backdrop-blur-[1px] lg:hidden"
          onClick={() => setMenuOpen(false)}
          aria-label="Cerrar navegación"
        />
      )}

      <main className="lg:pl-[248px]">
        <header className="sticky top-0 z-20 flex h-[72px] items-center justify-between border-b border-[#dce3ec] bg-[#f8fafc]/90 px-5 backdrop-blur-md sm:px-8">
          <div className="flex items-center gap-3">
            <button
              className="rounded-lg border border-[#dce3ec] bg-white p-2 text-[#536172] lg:hidden"
              onClick={() => setMenuOpen(true)}
              aria-label="Abrir menú"
            >
              <Menu size={19} />
            </button>
            <div>
              <p className="text-xs text-[#7c8797]">Vista general</p>
              <h1 className="text-lg font-semibold tracking-[-0.02em]">
                Resumen financiero
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {showGettingStarted && (
              <button
                onClick={() => {
                  setTourStep(0);
                  setTourOpen(true);
                }}
                className="flex items-center gap-2 rounded-lg border border-[#dce3ec] bg-white px-3 py-2.5 text-sm font-medium text-[#536172] transition hover:border-[#b6c6da] hover:bg-[#f2f6f3]"
              >
                <BookOpen size={17} />
                <span className="hidden md:inline">Primeros pasos</span>
                <span className="sr-only md:hidden">Primeros pasos</span>
              </button>
            )}
            <button className="relative rounded-lg border border-[#dce3ec] bg-white p-2.5 text-[#536172] hover:bg-[#f2f4f7]">
              <Bell size={18} />
              <span className="absolute right-2 top-2 size-1.5 rounded-full bg-[#d9893d]" />
            </button>
            <button
              disabled={accounts.length === 0}
              onClick={() => setFormOpen(true)}
              className="flex items-center gap-2 rounded-lg bg-[#183153] px-4 py-2.5 text-sm font-medium text-white shadow-[0_3px_10px_rgba(24,49,83,0.18)] transition hover:bg-[#102943] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Plus size={17} strokeWidth={2.4} />
              <span className="hidden sm:inline">Nuevo movimiento</span>
              <span className="sm:hidden">Nuevo</span>
            </button>
          </div>
        </header>

        <div
          id="resumen"
          className="mx-auto max-w-[1440px] scroll-mt-24 px-5 py-7 sm:px-8 sm:py-9"
        >
          <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="mb-1 text-sm text-[#758091]">
                Hola, {userName.split(/\s+/)[0]}. Así marcha tu empresa.
              </p>
              <h2 className="text-2xl font-semibold tracking-[-0.035em] sm:text-[30px]">
                Entiende tus números. Decide con claridad.
              </h2>
            </div>
            <button className="flex w-fit items-center gap-2 rounded-lg border border-[#d5dde8] bg-white px-3.5 py-2 text-sm text-[#4f5d6d] shadow-sm">
              <CalendarDays size={16} />
              <span className="capitalize">{monthFormatter.format(new Date())}</span>
              <ChevronDown size={14} />
            </button>
          </div>

          {error && (
            <div className="mb-5 flex items-center justify-between rounded-xl border border-[#e9cfc6] bg-[#fff7f3] px-4 py-3 text-sm text-[#9c4f35]">
              <span>{error}</span>
              <button onClick={() => setError(null)} aria-label="Cerrar alerta">
                <X size={16} />
              </button>
            </div>
          )}

          {demoData && demoData.transactionCount > 0 && (
            <div className="mb-5 flex flex-col gap-4 rounded-xl border border-[#e6d7b9] bg-[#fffaf0] px-4 py-4 text-sm text-[#735b2d] sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-semibold">Estás viendo datos de ejemplo</p>
                <p className="mt-1 text-[#887044]">
                  Son {demoData.transactionCount} movimientos y{" "}
                  {demoData.accountCount} cuentas creados para enseñarte cómo
                  funciona Deciflujo.
                </p>
              </div>
              {(role === "owner" || role === "admin") && (
                <button
                  onClick={() => void removeDemoData()}
                  disabled={removingDemo}
                  className="flex shrink-0 items-center justify-center gap-2 rounded-lg border border-[#d8c59d] bg-white px-3.5 py-2 font-medium text-[#705726] hover:bg-[#fffdf8] disabled:opacity-60"
                >
                  {removingDemo && (
                    <LoaderCircle size={15} className="animate-spin" />
                  )}
                  Empezar con mis datos
                </button>
              )}
            </div>
          )}

          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              title="Saldo disponible"
              value={formatMoney(summary.balanceCents)}
              note="Ingresos menos egresos"
              icon={WalletCards}
              tone="forest"
            />
            <MetricCard
              title="Ingresos"
              value={formatMoney(summary.incomeCents)}
              note="Movimientos registrados"
              icon={TrendingUp}
              tone="green"
            />
            <MetricCard
              title="Egresos"
              value={formatMoney(summary.expenseCents)}
              note="Gastos del período"
              icon={TrendingDown}
              tone="clay"
            />
            <MetricCard
              title="Margen operativo"
              value={`${summary.operatingMargin.toFixed(1)}%`}
              note="Meta recomendada: 20%"
              icon={ArrowUpRight}
              tone="blue"
            />
          </section>

          <DecisionCenter
            canCreateDecision={canCreateDecisions}
            canReviewDecision={canReviewDecisions}
            currentBalanceCents={availableBalanceCents}
            monthlyIncomeCents={summary.incomeCents}
            monthlyExpenseCents={summary.expenseCents}
          />

          <section
            id="cuentas"
            className="mt-5 scroll-mt-24 rounded-2xl border border-[#dce3ec] bg-white p-5 shadow-[0_1px_2px_rgba(20,38,27,0.03)] sm:p-6"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="font-semibold tracking-[-0.02em]">Cuentas</h3>
                <p className="mt-1 text-sm text-[#798493]">
                  Dónde está distribuido el dinero de tu empresa
                </p>
              </div>
              <button
                onClick={() => setAccountFormOpen(true)}
                className="flex shrink-0 items-center gap-2 rounded-lg border border-[#cbd5e1] bg-[#f6f8fb] px-3.5 py-2 text-sm font-medium text-[#315d46] hover:bg-[#eaf0f7]"
              >
                <Plus size={16} />
                <span className="hidden sm:inline">Nueva cuenta</span>
                <span className="sm:hidden">Nueva</span>
              </button>
            </div>
            <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {accounts.map((account) => (
                <AccountCard key={account.id} account={account} />
              ))}
              {!loading && accounts.length === 0 && (
                <p className="rounded-xl bg-[#f7f8fa] p-4 text-sm text-[#798493]">
                  Crea tu primera cuenta para registrar movimientos.
                </p>
              )}
            </div>
          </section>

          <section className="mt-5 grid gap-5 xl:grid-cols-[1.45fr_0.75fr]">
            <div className="rounded-2xl border border-[#dce3ec] bg-white p-5 shadow-[0_1px_2px_rgba(20,38,27,0.03)] sm:p-6">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold tracking-[-0.02em]">
                    Flujo de caja
                  </h3>
                  <p className="mt-1 text-sm text-[#798493]">
                    Comparación visual del período actual
                  </p>
                </div>
                <div className="flex gap-4 text-xs text-[#758091]">
                  <span className="flex items-center gap-1.5">
                    <span className="size-2 rounded-full bg-[#2c7351]" /> Ingresos
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="size-2 rounded-full bg-[#d9a184]" /> Egresos
                  </span>
                </div>
              </div>
              <CashFlowChart
                income={summary.incomeCents}
                expenses={summary.expenseCents}
              />
            </div>

            <div className="rounded-2xl border border-[#dce3ec] bg-white p-5 shadow-[0_1px_2px_rgba(20,38,27,0.03)] sm:p-6">
              <div>
                <h3 className="font-semibold tracking-[-0.02em]">
                  Distribución de gastos
                </h3>
                <p className="mt-1 text-sm text-[#798493]">
                  Principales categorías
                </p>
              </div>
              <div className="mt-6 space-y-5">
                {expenseBreakdown.length === 0 ? (
                  <p className="rounded-xl bg-[#f7f8fa] p-4 text-sm text-[#798493]">
                    Registra un egreso para ver su distribución.
                  </p>
                ) : (
                  expenseBreakdown.map(([category, amount], index) => {
                    const percentage =
                      summary.expenseCents === 0
                        ? 0
                        : (amount / summary.expenseCents) * 100;
                    const colors = [
                      "bg-[#285d44]",
                      "bg-[#78a68e]",
                      "bg-[#d39b7d]",
                      "bg-[#aab5af]",
                    ];
                    return (
                      <div key={category}>
                        <div className="mb-2 flex items-center justify-between text-sm">
                          <span className="font-medium">{category}</span>
                          <span className="text-[#667386]">
                            {percentage.toFixed(0)}%
                          </span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-[#eef1f5]">
                          <div
                            className={`h-full rounded-full ${colors[index]}`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <p className="mt-1.5 text-xs text-[#8a95a5]">
                          {formatMoney(amount)}
                        </p>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </section>

          <section
            id="movimientos"
            className="mt-5 scroll-mt-24 overflow-hidden rounded-2xl border border-[#dce3ec] bg-white shadow-[0_1px_2px_rgba(20,38,27,0.03)]"
          >
            <div className="flex flex-col justify-between gap-4 border-b border-[#e1e6ed] px-5 py-5 sm:flex-row sm:items-center sm:px-6">
              <div>
                <h3 className="font-semibold tracking-[-0.02em]">
                  Movimientos
                </h3>
                <p className="mt-1 text-sm text-[#798493]">
                  Ingresos y egresos de tu operación
                </p>
              </div>
              <label className="flex items-center gap-2 rounded-lg border border-[#d9e1eb] bg-[#fafbfd] px-3 py-2 text-sm focus-within:border-[#7e9fc8] focus-within:ring-2 focus-within:ring-[#e5eef8]">
                <Search size={16} className="text-[#89928c]" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  className="w-full bg-transparent outline-none placeholder:text-[#9aa29d] sm:w-48"
                  placeholder="Buscar movimiento"
                />
              </label>
            </div>

            {loading ? (
              <div className="grid min-h-64 place-items-center text-[#748093]">
                <div className="flex items-center gap-2 text-sm">
                  <LoaderCircle className="animate-spin" size={18} />
                  Cargando movimientos…
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[780px] text-left">
                  <thead>
                    <tr className="border-b border-[#e7ebf1] bg-[#fafbfd] text-[11px] font-semibold uppercase tracking-[0.08em] text-[#8a95a5]">
                      <th className="px-6 py-3.5">Concepto</th>
                      <th className="px-4 py-3.5">Categoría</th>
                      <th className="px-4 py-3.5">Fecha</th>
                      <th className="px-6 py-3.5 text-right">Monto</th>
                      <th className="w-16 px-4 py-3.5">
                        <span className="sr-only">Acciones</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTransactions.map((transaction) => (
                      <tr
                        key={transaction.id}
                        className="border-b border-[#eef1f5] last:border-0 hover:bg-[#fafcf9]"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <span
                              className={`grid size-9 place-items-center rounded-lg ${
                                transaction.type === "income"
                                  ? "bg-[#e8eff7] text-[#27704d]"
                                  : "bg-[#f8ece6] text-[#b76847]"
                              }`}
                            >
                              {transaction.type === "income" ? (
                                <ArrowDownRight size={17} />
                              ) : (
                                <ArrowUpRight size={17} />
                              )}
                            </span>
                            <span>
                              <span className="block text-sm font-medium">
                                {transaction.description}
                              </span>
                              <span className="mt-0.5 block text-xs text-[#89938d]">
                                {accountNames.get(transaction.accountId) ??
                                  "Cuenta no disponible"}
                              </span>
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <span className="rounded-full bg-[#f1f3f6] px-2.5 py-1 text-xs text-[#647184]">
                            {transaction.category}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-sm text-[#748093]">
                          {dateFormatter.format(
                            new Date(`${transaction.occurredOn}T00:00:00Z`),
                          )}
                        </td>
                        <td
                          className={`px-6 py-4 text-right text-sm font-semibold ${
                            transaction.type === "income"
                              ? "text-[#226645]"
                              : "text-[#a65b3f]"
                          }`}
                        >
                          {transaction.type === "income" ? "+" : "−"}
                          {formatMoney(transaction.amountCents)}
                        </td>
                        <td className="px-4 py-4 text-right">
                          {canDeleteTransactions && (
                            <button
                              onClick={() =>
                                setTransactionToDelete(transaction)
                              }
                              className="rounded-lg p-2 text-[#89938d] transition hover:bg-[#f8e9e4] hover:text-[#a8583d]"
                              aria-label={`Eliminar ${transaction.description}`}
                              title="Eliminar movimiento"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredTransactions.length === 0 && (
                  <p className="px-6 py-12 text-center text-sm text-[#798493]">
                    No encontramos movimientos con esa búsqueda.
                  </p>
                )}
              </div>
            )}
          </section>
        </div>
      </main>

      {formOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-[#121d2d]/35 p-4 backdrop-blur-[2px]">
          <div
            className="absolute inset-0"
            onClick={() => setFormOpen(false)}
          />
          <form
            onSubmit={handleSubmit}
            className="relative w-full max-w-lg rounded-2xl border border-white/60 bg-white p-6 shadow-2xl sm:p-7"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#6f7d8e]">
                  Registro financiero
                </p>
                <h3 className="mt-1 text-xl font-semibold tracking-[-0.03em]">
                  Nuevo movimiento
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setFormOpen(false)}
                className="rounded-lg bg-[#f2f4f7] p-2 text-[#6d7888] hover:bg-[#e7ebf1]"
                aria-label="Cerrar formulario"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-2 rounded-xl bg-[#f1f4f0] p-1">
              {(["income", "expense"] as TransactionType[]).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() =>
                    setForm((current) => ({
                      ...current,
                      type,
                      category: type === "income" ? "Ventas" : "Operación",
                    }))
                  }
                  className={`rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                    form.type === type
                      ? "bg-white text-[#1e4f38] shadow-sm"
                      : "text-[#788494]"
                  }`}
                >
                  {type === "income" ? "Ingreso" : "Egreso"}
                </button>
              ))}
            </div>

            <div className="mt-5 space-y-4">
              <Field label="Descripción">
                <input
                  required
                  minLength={3}
                  maxLength={100}
                  value={form.description}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      description: event.target.value,
                    }))
                  }
                  className="form-control"
                  placeholder="Ej. Venta de consultoría"
                />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Monto (₡)">
                  <input
                    required
                    min="1"
                    step="1"
                    type="number"
                    value={form.amount}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        amount: event.target.value,
                      }))
                    }
                    className="form-control"
                    placeholder="250000"
                  />
                </Field>
                <Field label="Fecha">
                  <input
                    required
                    type="date"
                    value={form.occurredOn}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        occurredOn: event.target.value,
                      }))
                    }
                    className="form-control"
                  />
                </Field>
              </div>
              <Field label="Cuenta">
                <select
                  required
                  value={form.accountId}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      accountId: event.target.value,
                    }))
                  }
                  className="form-control"
                >
                  {accounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.name} · {formatMoney(account.balanceCents)}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Categoría">
                <select
                  value={form.category}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      category: event.target.value as TransactionCategory,
                    }))
                  }
                  className="form-control"
                >
                  {transactionCategories.map((category) => (
                    <option key={category}>{category}</option>
                  ))}
                </select>
              </Field>
            </div>

            <div className="mt-7 flex gap-3">
              <button
                type="button"
                onClick={() => setFormOpen(false)}
                className="flex-1 rounded-lg border border-[#d5dde8] px-4 py-2.5 text-sm font-medium text-[#5d6979] hover:bg-[#f7f8fa]"
              >
                Cancelar
              </button>
              <button
                disabled={saving}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-[#183153] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#102943] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving && <LoaderCircle className="animate-spin" size={16} />}
                Guardar movimiento
              </button>
            </div>
          </form>
        </div>
      )}

      {accountFormOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-[#121d2d]/35 p-4 backdrop-blur-[2px]">
          <button
            className="absolute inset-0 cursor-default"
            onClick={() => !accountSaving && setAccountFormOpen(false)}
            aria-label="Cerrar formulario de cuenta"
          />
          <form
            onSubmit={handleAccountSubmit}
            className="relative w-full max-w-lg rounded-2xl border border-white/60 bg-white p-6 shadow-2xl sm:p-7"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#6f7d8e]">
                  Ubicación del dinero
                </p>
                <h3 className="mt-1 text-xl font-semibold tracking-[-0.03em]">
                  Nueva cuenta
                </h3>
              </div>
              <button
                type="button"
                disabled={accountSaving}
                onClick={() => setAccountFormOpen(false)}
                className="rounded-lg bg-[#f2f4f7] p-2 text-[#6d7888] hover:bg-[#e7ebf1] disabled:opacity-50"
                aria-label="Cerrar formulario"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-6 space-y-4">
              <Field label="Nombre de la cuenta">
                <input
                  required
                  minLength={3}
                  maxLength={60}
                  value={accountForm.name}
                  onChange={(event) =>
                    setAccountForm((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                  className="form-control"
                  placeholder="Ej. Cuenta BAC"
                />
              </Field>
              <Field label="Tipo de cuenta">
                <select
                  value={accountForm.type}
                  onChange={(event) =>
                    setAccountForm((current) => ({
                      ...current,
                      type: event.target.value as AccountType,
                    }))
                  }
                  className="form-control"
                >
                  {accountTypes.map((type) => (
                    <option key={type} value={type}>
                      {accountTypeLabels[type]}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Saldo inicial (₡)">
                <input
                  required
                  min="0"
                  step="1"
                  type="number"
                  value={accountForm.openingBalance}
                  onChange={(event) =>
                    setAccountForm((current) => ({
                      ...current,
                      openingBalance: event.target.value,
                    }))
                  }
                  className="form-control"
                  placeholder="0"
                />
              </Field>
              <p className="rounded-xl bg-[#f2f5f9] p-3 text-xs leading-5 text-[#667386]">
                El saldo inicial representa el dinero que ya existía antes de
                comenzar a registrar movimientos en Deciflujo.
              </p>
            </div>

            <div className="mt-7 flex gap-3">
              <button
                type="button"
                disabled={accountSaving}
                onClick={() => setAccountFormOpen(false)}
                className="flex-1 rounded-lg border border-[#d5dde8] px-4 py-2.5 text-sm font-medium text-[#5d6979] hover:bg-[#f7f8fa] disabled:opacity-60"
              >
                Cancelar
              </button>
              <button
                disabled={accountSaving}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-[#183153] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#102943] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {accountSaving && (
                  <LoaderCircle className="animate-spin" size={16} />
                )}
                Crear cuenta
              </button>
            </div>
          </form>
        </div>
      )}

      {transactionToDelete && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-[#121d2d]/35 p-4 backdrop-blur-[2px]">
          <button
            className="absolute inset-0 cursor-default"
            onClick={() => !deleting && setTransactionToDelete(null)}
            aria-label="Cerrar confirmación"
          />
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-title"
            className="relative w-full max-w-md rounded-2xl border border-white/60 bg-white p-6 shadow-2xl"
          >
            <div className="grid size-11 place-items-center rounded-xl bg-[#f8e9e4] text-[#a8583d]">
              <Trash2 size={20} />
            </div>
            <h3
              id="delete-title"
              className="mt-4 text-xl font-semibold tracking-[-0.03em]"
            >
              ¿Eliminar este movimiento?
            </h3>
            <p className="mt-2 text-sm leading-6 text-[#6d7888]">
              Se eliminará <strong>{transactionToDelete.description}</strong>{" "}
              por {formatMoney(transactionToDelete.amountCents)}. Esta acción no
              se puede deshacer.
            </p>
            <div className="mt-6 flex gap-3">
              <button
                disabled={deleting}
                onClick={() => setTransactionToDelete(null)}
                className="flex-1 rounded-lg border border-[#d5dde8] px-4 py-2.5 text-sm font-medium text-[#5d6979] hover:bg-[#f7f8fa] disabled:opacity-60"
              >
                Cancelar
              </button>
              <button
                disabled={deleting}
                onClick={handleDelete}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-[#a8583d] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#91472f] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {deleting && <LoaderCircle className="animate-spin" size={16} />}
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {tourOpen && (
        <GettingStartedTour
          step={tourStep}
          onStepChange={setTourStep}
          onClose={(hideLauncher = false) => {
            if (hideLauncher) {
              window.localStorage.setItem(
                "deciflujo:hide-getting-started",
                "true",
              );
              setShowGettingStarted(false);
            }
            setTourOpen(false);
          }}
        />
      )}
    </div>
  );
}

function GettingStartedTour({
  step,
  onStepChange,
  onClose,
}: {
  step: number;
  onStepChange: (step: number) => void;
  onClose: (hideLauncher?: boolean) => void;
}) {
  const [hideLauncher, setHideLauncher] = useState(false);
  const currentStep = tourSteps[step];
  const StepIcon = currentStep.icon;
  const isFirst = step === 0;
  const isLast = step === tourSteps.length - 1;

  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-[#121d2d]/45 p-3 backdrop-blur-[3px] sm:p-6">
      <button
        className="absolute inset-0 cursor-default"
        onClick={() => onClose()}
        aria-label="Cerrar recorrido"
      />
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="tour-title"
        className="relative max-h-[94vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-white/60 bg-[#fbfcfe] shadow-[0_28px_80px_rgba(13,35,24,0.3)]"
      >
        <div className="flex items-start justify-between border-b border-[#dee5ed] px-5 py-5 sm:px-7">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-[#e8f0f9] text-[#2c568e]">
              <BookOpen size={19} />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#728078]">
                Guía práctica
              </p>
              <h2
                id="tour-title"
                className="mt-0.5 text-lg font-semibold tracking-[-0.025em]"
              >
                Primeros pasos en Deciflujo
              </h2>
            </div>
          </div>
          <button
            onClick={() => onClose()}
            className="rounded-lg bg-[#eef2f7] p-2 text-[#667386] hover:bg-[#e1e6ed]"
            aria-label="Cerrar recorrido"
          >
            <X size={18} />
          </button>
        </div>

        <div className="overflow-x-auto border-b border-[#e5e9e4] bg-white px-5 py-4 sm:px-7">
          <div className="flex min-w-[620px] items-center">
            {tourSteps.map((tourStep, index) => {
              const Icon = tourStep.icon;
              const completed = index < step;
              const active = index === step;
              return (
                <div
                  key={tourStep.title}
                  className="flex flex-1 items-center last:flex-none"
                >
                  <button
                    onClick={() => onStepChange(index)}
                    className="group flex flex-col items-center gap-1.5"
                    aria-label={`Ir al paso ${index + 1}: ${tourStep.title}`}
                    aria-current={active ? "step" : undefined}
                  >
                    <span
                      className={`grid size-9 place-items-center rounded-full border transition ${
                        active
                          ? "border-[#3567a8] bg-[#3567a8] text-white shadow-[0_0_0_4px_#e3edf8]"
                          : completed
                            ? "border-[#8fb09c] bg-[#e5f0e9] text-[#315f9b]"
                            : "border-[#d6dee8] bg-[#f6f7f5] text-[#8a958e] group-hover:border-[#aebbb2]"
                      }`}
                    >
                      <Icon size={16} />
                    </span>
                    <span
                      className={`text-[10px] font-medium ${
                        active ? "text-[#3567a8]" : "text-[#8792a1]"
                      }`}
                    >
                      {tourStep.title}
                    </span>
                  </button>
                  {index < tourSteps.length - 1 && (
                    <span
                      className={`mx-2 mb-5 h-px flex-1 ${
                        index < step ? "bg-[#8fb09c]" : "bg-[#dce3ec]"
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="grid gap-6 px-5 py-6 sm:grid-cols-[150px_1fr] sm:px-7 sm:py-8">
          <div className="flex flex-col items-center justify-center rounded-2xl border border-[#dce3ec] bg-[#f2f5f9] p-5 text-center">
            <span className="grid size-16 place-items-center rounded-2xl bg-[#e5eef8] text-[#315f9b]">
              <StepIcon size={30} strokeWidth={1.7} />
            </span>
            <span className="mt-4 text-xs font-semibold uppercase tracking-[0.12em] text-[#718077]">
              Paso {step + 1} de {tourSteps.length}
            </span>
          </div>

          <div>
            <p className="text-sm font-medium text-[#4e765f]">
              {currentStep.subtitle}
            </p>
            <h3 className="mt-1 text-2xl font-semibold tracking-[-0.04em]">
              {currentStep.title}
            </h3>
            <p className="mt-3 text-sm leading-6 text-[#687586]">
              {currentStep.description}
            </p>
            <div className="mt-4 rounded-xl border border-[#dce5de] bg-[#f3f7f3] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[#5f7467]">
                Consejo práctico
              </p>
              <p className="mt-1.5 text-sm leading-6 text-[#49564e]">
                {currentStep.example}
              </p>
            </div>
            <Link
              href={currentStep.href}
              onClick={() => onClose()}
              className="mt-4 inline-flex rounded-lg border border-[#b9cbe0] bg-white px-3.5 py-2 text-sm font-medium text-[#3567a8] hover:bg-[#f1f6f2]"
            >
              {currentStep.action}
            </Link>
          </div>
        </div>

        <label className="flex items-center gap-2 border-t border-[#dee5ed] bg-[#f7f9f7] px-5 py-3 text-xs text-[#687586] sm:px-7">
          <input
            type="checkbox"
            checked={hideLauncher}
            onChange={(event) => setHideLauncher(event.target.checked)}
            className="size-4 accent-[#3567a8]"
          />
          No volver a mostrar el botón “Primeros pasos”
        </label>

        <div className="flex items-center justify-between border-t border-[#dee5ed] bg-white px-5 py-4 sm:px-7">
          <button
            disabled={isFirst}
            onClick={() => onStepChange(step - 1)}
            className="flex items-center gap-1.5 rounded-lg border border-[#d5dde8] px-4 py-2.5 text-sm font-medium text-[#596779] hover:bg-[#f7f8fa] disabled:cursor-not-allowed disabled:opacity-35"
          >
            <ChevronLeft size={16} />
            Anterior
          </button>
          <div className="hidden items-center gap-1.5 sm:flex">
            {tourSteps.map((tourStep, index) => (
              <span
                key={tourStep.title}
                className={`h-1.5 rounded-full transition-all ${
                  index === step
                    ? "w-6 bg-[#2b6648]"
                    : "w-1.5 bg-[#d5dcd7]"
                }`}
              />
            ))}
          </div>
          <button
            onClick={() =>
              isLast
                ? onClose(hideLauncher)
                : onStepChange(Math.min(step + 1, tourSteps.length - 1))
            }
            className="flex items-center gap-1.5 rounded-lg bg-[#183153] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#102943]"
          >
            {isLast ? "Finalizar" : "Siguiente"}
            {!isLast && <ChevronRight size={16} />}
          </button>
        </div>
      </section>
    </div>
  );
}

function AccountCard({ account }: { account: AccountOverview }) {
  const Icon =
    account.type === "bank"
      ? Landmark
      : account.type === "cash"
        ? Banknote
        : CreditCard;

  return (
    <article className="rounded-xl border border-[#dce3ec] bg-[#fafbfd] p-4 transition hover:border-[#bfcac2] hover:bg-white">
      <div className="flex items-start justify-between">
        <span className="grid size-10 place-items-center rounded-xl bg-[#e8f0f9] text-[#3567a8]">
          <Icon size={19} />
        </span>
        <span className="rounded-full bg-[#edf1ed] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.07em] text-[#748093]">
          {accountTypeLabels[account.type]}
        </span>
      </div>
      <p className="mt-4 text-sm font-medium text-[#526057]">{account.name}</p>
      <p className="mt-1 text-xl font-semibold tracking-[-0.035em]">
        {formatMoney(account.balanceCents)}
      </p>
      <div className="mt-3 flex items-center justify-between border-t border-[#e1e6ed] pt-3 text-xs text-[#8491a1]">
        <span>
          Inicial: {formatMoney(account.openingBalanceCents)}
        </span>
        <span>
          {account.transactionCount}{" "}
          {account.transactionCount === 1 ? "movimiento" : "movimientos"}
        </span>
      </div>
    </article>
  );
}

function MetricCard({
  title,
  value,
  note,
  icon: Icon,
  tone,
}: {
  title: string;
  value: string;
  note: string;
  icon: typeof WalletCards;
  tone: "forest" | "green" | "clay" | "blue";
}) {
  const toneClasses = {
    forest: "bg-[#e8f0f9] text-[#2c568e]",
    green: "bg-[#e8eff7] text-[#2c7652]",
    clay: "bg-[#f7ebe5] text-[#ad6749]",
    blue: "bg-[#e8eef0] text-[#476c75]",
  };

  return (
    <article className="rounded-2xl border border-[#dce3ec] bg-white p-5 shadow-[0_1px_2px_rgba(20,38,27,0.03)]">
      <div className="flex items-start justify-between">
        <p className="text-sm text-[#707c74]">{title}</p>
        <span
          className={`grid size-9 place-items-center rounded-xl ${toneClasses[tone]}`}
        >
          <Icon size={18} />
        </span>
      </div>
      <p className="mt-4 truncate text-2xl font-semibold tracking-[-0.04em]">
        {value}
      </p>
      <p className="mt-2 text-xs text-[#8a95a5]">{note}</p>
    </article>
  );
}

function CashFlowChart({
  income,
  expenses,
}: {
  income: number;
  expenses: number;
}) {
  const maximum = Math.max(income, expenses, 1);
  const incomeHeight = Math.max(10, (income / maximum) * 100);
  const expenseHeight = Math.max(10, (expenses / maximum) * 100);
  const weeks = ["Sem 1", "Sem 2", "Sem 3", "Sem 4", "Actual"];

  return (
    <div className="mt-7">
      <div className="relative flex h-52 items-end justify-around border-b border-[#dce3ec] px-2">
        {[25, 50, 75, 100].map((line) => (
          <span
            key={line}
            className="absolute inset-x-0 border-t border-dashed border-[#e7eae6]"
            style={{ bottom: `${line}%` }}
          />
        ))}
        {weeks.map((week, index) => {
          const growth = 0.38 + index * 0.14;
          return (
            <div
              key={week}
              className="relative z-10 flex h-full w-[15%] items-end justify-center gap-1.5"
            >
              <span
                className="w-3 rounded-t-sm bg-[#2c7351] sm:w-5"
                style={{ height: `${incomeHeight * growth}%` }}
              />
              <span
                className="w-3 rounded-t-sm bg-[#d9a184] sm:w-5"
                style={{ height: `${expenseHeight * growth}%` }}
              />
            </div>
          );
        })}
      </div>
      <div className="flex justify-around px-2 pt-3 text-[11px] text-[#8b958f]">
        {weeks.map((week) => (
          <span key={week} className="w-[15%] text-center">
            {week}
          </span>
        ))}
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-[#536172]">
        {label}
      </span>
      {children}
    </label>
  );
}
