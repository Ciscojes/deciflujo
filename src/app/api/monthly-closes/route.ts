import { NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { getAuthContext } from "@/lib/auth-context";
import { recordAuditEvent } from "@/lib/audit";
import { logError } from "@/lib/logger";
import {
  FutureCloseMonthError,
  InvalidCloseMonthError,
  MonthAlreadyClosedError,
  MonthlyCloseNotFoundError,
} from "@/modules/finance/domain/monthly-close";
import {
  closeMonth,
  getMonthlyCloseOverview,
  reopenMonth,
} from "@/modules/finance/application/use-cases/manage-monthly-close";
import { LibsqlMonthlyCloseRepository } from "@/modules/finance/infrastructure/libsql-monthly-close-repository";

export const runtime = "nodejs";

const closeInputSchema = z.object({ month: z.string() }).strict();

export async function GET(request: Request) {
  const authResult = await getAuthContext(request, {
    resource: "closing",
    action: "read",
  });
  if (!authResult.ok) return authResult.response;

  const months = Number(new URL(request.url).searchParams.get("months") ?? 12);
  const repository = new LibsqlMonthlyCloseRepository(
    authResult.context.organizationId,
  );
  return NextResponse.json({
    data: await getMonthlyCloseOverview(repository, months),
  });
}

export async function POST(request: Request) {
  const authResult = await getAuthContext(request, {
    resource: "closing",
    action: "create",
  });
  if (!authResult.ok) return authResult.response;

  try {
    const input = closeInputSchema.parse(await request.json());
    const repository = new LibsqlMonthlyCloseRepository(
      authResult.context.organizationId,
    );
    const closed = await closeMonth(repository, input.month, {
      userId: authResult.context.userId,
      userName: authResult.context.userName,
    });
    await recordAuditEvent(authResult.context, {
      action: "month.closed",
      entityType: "monthly_close",
      entityId: closed.id,
      summary: `Cerró el período ${closed.month}.`,
      metadata: {
        month: closed.month,
        incomeCents: closed.incomeCents,
        expenseCents: closed.expenseCents,
        closingBalanceCents: closed.closingBalanceCents,
      },
    });
    return NextResponse.json({ data: closed }, { status: 201 });
  } catch (error) {
    if (
      error instanceof ZodError ||
      error instanceof InvalidCloseMonthError ||
      error instanceof FutureCloseMonthError
    ) {
      return NextResponse.json(
        {
          error:
            error instanceof ZodError
              ? "El mes del cierre no es válido."
              : error.message,
        },
        { status: 400 },
      );
    }
    if (error instanceof MonthAlreadyClosedError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    logError("api.month_close_failed", error);
    return NextResponse.json(
      { error: "No fue posible cerrar el período." },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  const authResult = await getAuthContext(request, {
    resource: "closing",
    action: "delete",
  });
  if (!authResult.ok) return authResult.response;

  const month = new URL(request.url).searchParams.get("month") ?? "";
  try {
    const repository = new LibsqlMonthlyCloseRepository(
      authResult.context.organizationId,
    );
    await reopenMonth(repository, month);
    await recordAuditEvent(authResult.context, {
      action: "month.reopened",
      entityType: "monthly_close",
      summary: `Reabrió el período ${month}.`,
      metadata: { month },
    });
    return new Response(null, { status: 204 });
  } catch (error) {
    if (
      error instanceof InvalidCloseMonthError ||
      error instanceof FutureCloseMonthError
    ) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (error instanceof MonthlyCloseNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    logError("api.month_reopen_failed", error);
    return NextResponse.json(
      { error: "No fue posible reabrir el período." },
      { status: 500 },
    );
  }
}
