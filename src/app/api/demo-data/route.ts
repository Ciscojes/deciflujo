import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth-context";
import {
  deleteDemoFinanceData,
  getDemoDataSummary,
} from "@/modules/finance/infrastructure/libsql-database";
import { recordAuditEvent } from "@/lib/audit";
import { logError } from "@/lib/logger";
import { MonthClosedError } from "@/modules/finance/domain/monthly-close";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const authResult = await getAuthContext(request, {
    resource: "finance",
    action: "read",
  });
  if (!authResult.ok) return authResult.response;

  return NextResponse.json({
    data: await getDemoDataSummary(authResult.context.organizationId),
  });
}

export async function DELETE(request: Request) {
  const authResult = await getAuthContext(request, {
    resource: "demo",
    action: "delete",
  });
  if (!authResult.ok) return authResult.response;

  let deleted;
  try {
    deleted = await deleteDemoFinanceData(authResult.context.organizationId);
  } catch (error) {
    if (error instanceof MonthClosedError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    logError("api.demo_delete_failed", error);
    return NextResponse.json(
      { error: "No fue posible retirar los datos de demostración." },
      { status: 500 },
    );
  }
  await recordAuditEvent(authResult.context, {
    action: "demo_data.deleted",
    entityType: "demo_data",
    summary: "Retiró los datos financieros de demostración.",
    metadata: {
      accountCount: deleted.accountCount,
      transactionCount: deleted.transactionCount,
    },
  });

  return NextResponse.json({ data: deleted });
}
