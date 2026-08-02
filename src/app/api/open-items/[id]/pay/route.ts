import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { getAuthContext } from "@/lib/auth-context";
import { recordAuditEvent } from "@/lib/audit";
import { logError } from "@/lib/logger";
import {
  OpenItemAlreadyPaidError,
  OpenItemNotFoundError,
  PaymentAccountNotFoundError,
  payOpenItem,
} from "@/modules/finance/application/use-cases/pay-open-item";
import { LibsqlOpenItemRepository } from "@/modules/finance/infrastructure/libsql-open-item-repository";
import { MonthClosedError } from "@/modules/finance/domain/monthly-close";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  context: RouteContext<"/api/open-items/[id]/pay">,
) {
  const authResult = await getAuthContext(request, {
    resource: "finance",
    action: "create",
  });
  if (!authResult.ok) return authResult.response;

  const repository = new LibsqlOpenItemRepository(
    authResult.context.organizationId,
  );
  try {
    const { id } = await context.params;
    const item = await payOpenItem(repository, id, await request.json());
    await recordAuditEvent(authResult.context, {
      action: "open_item.paid",
      entityType: "open_item",
      entityId: item.id,
      summary: `Marcó como pagada la cuenta “${item.concept}”.`,
      metadata: {
        kind: item.kind,
        amountCents: item.amountCents,
        transactionId: item.paymentTransactionId,
      },
    });
    return NextResponse.json({ data: item });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Los datos del pago no son válidos." },
        { status: 400 },
      );
    }
    if (error instanceof OpenItemNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    if (error instanceof OpenItemAlreadyPaidError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    if (error instanceof PaymentAccountNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    if (error instanceof MonthClosedError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    logError("api.open_item_pay_failed", error);
    return NextResponse.json(
      { error: "No fue posible registrar el pago." },
      { status: 500 },
    );
  }
}
