import { NextResponse } from "next/server";
import { ZodError } from "zod";
import {
  AccountNotFoundError,
  createTransaction,
} from "@/modules/finance/application/use-cases/create-transaction";
import { listTransactions } from "@/modules/finance/application/use-cases/list-transactions";
import { LibsqlTransactionRepository } from "@/modules/finance/infrastructure/libsql-transaction-repository";
import { LibsqlAccountRepository } from "@/modules/finance/infrastructure/libsql-account-repository";
import { getAuthContext } from "@/lib/auth-context";
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
  const repository = new LibsqlTransactionRepository(
    authResult.context.organizationId,
  );
  const transactions = await listTransactions(repository);
  return NextResponse.json({ data: transactions });
}

export async function POST(request: Request) {
  const authResult = await getAuthContext(request, {
    resource: "finance",
    action: "create",
  });
  if (!authResult.ok) return authResult.response;
  const repository = new LibsqlTransactionRepository(
    authResult.context.organizationId,
  );
  const accountRepository = new LibsqlAccountRepository(
    authResult.context.organizationId,
  );

  try {
    const transaction = await createTransaction(
      repository,
      accountRepository,
      await request.json(),
    );
    await recordAuditEvent(authResult.context, {
      action: "transaction.created",
      entityType: "transaction",
      entityId: transaction.id,
      summary: `Registró el movimiento “${transaction.description}”.`,
      metadata: {
        amountCents: transaction.amountCents,
        transactionType: transaction.type,
        category: transaction.category,
        accountId: transaction.accountId,
      },
    });

    return NextResponse.json({ data: transaction }, { status: 201 });
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

    if (error instanceof AccountNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    if (error instanceof MonthClosedError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }

    logError("api.transaction_create_failed", error);
    return NextResponse.json(
      { error: "No fue posible registrar el movimiento." },
      { status: 500 },
    );
  }
}
