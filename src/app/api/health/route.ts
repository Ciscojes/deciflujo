import { NextResponse } from "next/server";
import { getFinanceDatabase } from "@/modules/finance/infrastructure/libsql-database";
import { logError } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const startedAt = Date.now();
  try {
    const database = await getFinanceDatabase();
    await Promise.race([
      database.execute("SELECT 1 AS healthy"),
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error("Database health check timed out")),
          3_000,
        ),
      ),
    ]);
    return NextResponse.json(
      {
        status: "ok",
        database: "reachable",
        responseTimeMs: Date.now() - startedAt,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    logError("health.database_unreachable", error);
    return NextResponse.json(
      { status: "unavailable", database: "unreachable" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
