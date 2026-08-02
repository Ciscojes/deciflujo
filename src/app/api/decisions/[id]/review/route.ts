import { NextResponse } from "next/server";
import { ZodError } from "zod";
import {
  DecisionNotFoundError,
  reviewDecision,
} from "@/modules/finance/application/use-cases/review-decision";
import { LibsqlAccountRepository } from "@/modules/finance/infrastructure/libsql-account-repository";
import { LibsqlDecisionRepository } from "@/modules/finance/infrastructure/libsql-decision-repository";
import { getAuthContext } from "@/lib/auth-context";
import { recordAuditEvent } from "@/lib/audit";
import { logError } from "@/lib/logger";

export const runtime = "nodejs";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const authResult = await getAuthContext(request, {
    resource: "decision",
    action: "review",
  });
  if (!authResult.ok) return authResult.response;
  const decisionRepository = new LibsqlDecisionRepository(
    authResult.context.organizationId,
  );
  const accountRepository = new LibsqlAccountRepository(
    authResult.context.organizationId,
  );

  try {
    const { id } = await context.params;
    const decision = await reviewDecision(
      decisionRepository,
      accountRepository,
      id,
    );
    await recordAuditEvent(authResult.context, {
      action: "decision.reviewed",
      entityType: "decision",
      entityId: decision.id,
      summary: `Evaluó la decisión “${decision.title}”.`,
      metadata: {
        actualBalanceCents: decision.actualBalanceCents,
        varianceCents: decision.varianceCents,
      },
    });
    return NextResponse.json({ data: decision });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "El identificador de la decisión no es válido." },
        { status: 400 },
      );
    }
    if (error instanceof DecisionNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    logError("api.decision_review_failed", error);
    return NextResponse.json(
      { error: "No fue posible evaluar la decisión." },
      { status: 500 },
    );
  }
}
