import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { createDecision } from "@/modules/finance/application/use-cases/create-decision";
import { listDecisions } from "@/modules/finance/application/use-cases/list-decisions";
import { LibsqlAccountRepository } from "@/modules/finance/infrastructure/libsql-account-repository";
import { LibsqlDecisionRepository } from "@/modules/finance/infrastructure/libsql-decision-repository";
import { LibsqlTransactionRepository } from "@/modules/finance/infrastructure/libsql-transaction-repository";
import { getAuthContext } from "@/lib/auth-context";
import { recordAuditEvent } from "@/lib/audit";
import { logError } from "@/lib/logger";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const authResult = await getAuthContext(request, {
    resource: "decision",
    action: "read",
  });
  if (!authResult.ok) return authResult.response;
  const decisionRepository = new LibsqlDecisionRepository(
    authResult.context.organizationId,
  );
  const decisions = await listDecisions(decisionRepository);
  return NextResponse.json({ data: decisions });
}

export async function POST(request: Request) {
  const authResult = await getAuthContext(request, {
    resource: "decision",
    action: "create",
  });
  if (!authResult.ok) return authResult.response;
  const decisionRepository = new LibsqlDecisionRepository(
    authResult.context.organizationId,
  );
  const accountRepository = new LibsqlAccountRepository(
    authResult.context.organizationId,
  );
  const transactionRepository = new LibsqlTransactionRepository(
    authResult.context.organizationId,
  );

  try {
    const decision = await createDecision(
      decisionRepository,
      accountRepository,
      transactionRepository,
      await request.json(),
    );
    await recordAuditEvent(authResult.context, {
      action: "decision.created",
      entityType: "decision",
      entityId: decision.id,
      summary: `Guardó la decisión “${decision.title}”.`,
      metadata: {
        addedMonthlyExpenseCents: decision.addedMonthlyExpenseCents,
        horizonMonths: decision.horizonMonths,
        risk: decision.risk,
      },
    });
    return NextResponse.json({ data: decision }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          error: "Los datos de la decisión no son válidos.",
          fields: error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    logError("api.decision_create_failed", error);
    return NextResponse.json(
      { error: "No fue posible guardar la decisión." },
      { status: 500 },
    );
  }
}
