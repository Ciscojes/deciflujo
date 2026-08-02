import { NextResponse } from "next/server";
import { ZodError } from "zod";
import {
  deleteTransaction,
  TransactionNotFoundError,
} from "@/modules/finance/application/use-cases/delete-transaction";
import { LibsqlTransactionRepository } from "@/modules/finance/infrastructure/libsql-transaction-repository";
import { getAuthContext } from "@/lib/auth-context";
import { recordAuditEvent } from "@/lib/audit";
import { logError } from "@/lib/logger";
import { MonthClosedError } from "@/modules/finance/domain/monthly-close";

export const runtime = "nodejs";

export async function DELETE(
  request: Request,
  context: RouteContext<"/api/transactions/[id]">,
) {
  const authResult = await getAuthContext(request, {
    resource: "finance",
    action: "delete",
  });
  if (!authResult.ok) return authResult.response;
  const repository = new LibsqlTransactionRepository(
    authResult.context.organizationId,
  );

  try {
    const { id } = await context.params;
    await deleteTransaction(repository, id);
    await recordAuditEvent(authResult.context, {
      action: "transaction.deleted",
      entityType: "transaction",
      entityId: id,
      summary: "Eliminó un movimiento.",
    });
    return new Response(null, { status: 204 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "El identificador del movimiento no es válido." },
        { status: 400 },
      );
    }

    if (error instanceof TransactionNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    if (error instanceof MonthClosedError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }

    logError("api.transaction_delete_failed", error);
    return NextResponse.json(
      { error: "No fue posible eliminar el movimiento." },
      { status: 500 },
    );
  }
}
