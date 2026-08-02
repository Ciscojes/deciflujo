import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth-context";
import { normalizeAuditLimit } from "@/modules/audit/domain/audit-event";
import { LibsqlAuditRepository } from "@/modules/audit/infrastructure/libsql-audit-repository";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const authResult = await getAuthContext(request, {
    resource: "audit",
    action: "read",
  });
  if (!authResult.ok) return authResult.response;

  const url = new URL(request.url);
  const limit = normalizeAuditLimit(
    Number(url.searchParams.get("limit") ?? 50),
  );
  const repository = new LibsqlAuditRepository();
  const events = await repository.list(
    authResult.context.organizationId,
    limit,
  );

  return NextResponse.json({ data: events });
}
