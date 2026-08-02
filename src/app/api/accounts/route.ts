import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { createAccount } from "@/modules/finance/application/use-cases/create-account";
import { listAccounts } from "@/modules/finance/application/use-cases/list-accounts";
import { LibsqlAccountRepository } from "@/modules/finance/infrastructure/libsql-account-repository";
import { getAuthContext } from "@/lib/auth-context";
import { recordAuditEvent } from "@/lib/audit";
import { logError } from "@/lib/logger";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const authResult = await getAuthContext(request, {
    resource: "finance",
    action: "read",
  });
  if (!authResult.ok) return authResult.response;
  const repository = new LibsqlAccountRepository(
    authResult.context.organizationId,
  );
  const accounts = await listAccounts(repository);
  return NextResponse.json({ data: accounts });
}

export async function POST(request: Request) {
  const authResult = await getAuthContext(request, {
    resource: "finance",
    action: "create",
  });
  if (!authResult.ok) return authResult.response;
  const repository = new LibsqlAccountRepository(
    authResult.context.organizationId,
  );

  try {
    const account = await createAccount(repository, await request.json());
    await recordAuditEvent(authResult.context, {
      action: "account.created",
      entityType: "account",
      entityId: account.id,
      summary: `Creó la cuenta “${account.name}”.`,
      metadata: {
        accountType: account.type,
        openingBalanceCents: account.openingBalanceCents,
      },
    });
    return NextResponse.json({ data: account }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          error: "Los datos de la cuenta no son válidos.",
          fields: error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    logError("api.account_create_failed", error);
    return NextResponse.json(
      { error: "No fue posible crear la cuenta." },
      { status: 500 },
    );
  }
}
