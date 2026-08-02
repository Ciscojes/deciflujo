import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { getAuthContext } from "@/lib/auth-context";
import { recordAuditEvent } from "@/lib/audit";
import { logError } from "@/lib/logger";
import { createOpenItem } from "@/modules/finance/application/use-cases/create-open-item";
import { summarizeOpenItems } from "@/modules/finance/domain/open-item";
import { LibsqlOpenItemRepository } from "@/modules/finance/infrastructure/libsql-open-item-repository";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const authResult = await getAuthContext(request, {
    resource: "finance",
    action: "read",
  });
  if (!authResult.ok) return authResult.response;

  const repository = new LibsqlOpenItemRepository(
    authResult.context.organizationId,
  );
  const items = await repository.list();
  return NextResponse.json({
    data: items,
    summary: summarizeOpenItems(items),
  });
}

export async function POST(request: Request) {
  const authResult = await getAuthContext(request, {
    resource: "finance",
    action: "create",
  });
  if (!authResult.ok) return authResult.response;

  const repository = new LibsqlOpenItemRepository(
    authResult.context.organizationId,
  );
  try {
    const item = await createOpenItem(repository, await request.json());
    await recordAuditEvent(authResult.context, {
      action: "open_item.created",
      entityType: "open_item",
      entityId: item.id,
      summary: `Registró ${item.kind === "receivable" ? "una cuenta por cobrar" : "una cuenta por pagar"}: “${item.concept}”.`,
      metadata: {
        kind: item.kind,
        amountCents: item.amountCents,
        dueOn: item.dueOn,
        counterpartyName: item.counterpartyName,
      },
    });
    return NextResponse.json({ data: item }, { status: 201 });
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
    logError("api.open_item_create_failed", error);
    return NextResponse.json(
      { error: "No fue posible registrar la cuenta pendiente." },
      { status: 500 },
    );
  }
}
