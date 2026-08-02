import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { getAuthContext } from "@/lib/auth-context";
import { recordAuditEvent } from "@/lib/audit";
import { logError } from "@/lib/logger";
import { listBudgets } from "@/modules/finance/application/use-cases/list-budgets";
import { setBudget } from "@/modules/finance/application/use-cases/set-budget";
import { summarizeBudgets } from "@/modules/finance/domain/budget";
import { LibsqlBudgetRepository } from "@/modules/finance/infrastructure/libsql-budget-repository";

export const runtime = "nodejs";

function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

export async function GET(request: Request) {
  const authResult = await getAuthContext(request, {
    resource: "finance",
    action: "read",
  });
  if (!authResult.ok) return authResult.response;

  const repository = new LibsqlBudgetRepository(
    authResult.context.organizationId,
  );
  try {
    const month =
      new URL(request.url).searchParams.get("month") ?? currentMonth();
    const budgets = await listBudgets(repository, month);
    return NextResponse.json({
      data: budgets,
      summary: summarizeBudgets(budgets),
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "El mes solicitado no es válido." },
        { status: 400 },
      );
    }
    logError("api.budget_list_failed", error);
    return NextResponse.json(
      { error: "No fue posible cargar los presupuestos." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const authResult = await getAuthContext(request, {
    resource: "finance",
    action: "create",
  });
  if (!authResult.ok) return authResult.response;

  const repository = new LibsqlBudgetRepository(
    authResult.context.organizationId,
  );
  try {
    const budget = await setBudget(repository, await request.json());
    await recordAuditEvent(authResult.context, {
      action: "budget.set",
      entityType: "monthly_budget",
      entityId: budget.id,
      summary: `Estableció el presupuesto de ${budget.category} para ${budget.month}.`,
      metadata: {
        month: budget.month,
        category: budget.category,
        plannedCents: budget.plannedCents,
      },
    });
    return NextResponse.json({ data: budget });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          error: "Los datos enviados no son válidos.",
          fields: error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }
    logError("api.budget_set_failed", error);
    return NextResponse.json(
      { error: "No fue posible guardar el presupuesto." },
      { status: 500 },
    );
  }
}
