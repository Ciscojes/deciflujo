import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { getAuthContext } from "@/lib/auth-context";
import { recordAuditEvent } from "@/lib/audit";
import { logError } from "@/lib/logger";
import { formatFinancialReportCsv } from "@/modules/finance/application/financial-report-csv";
import type { ReportFilter } from "@/modules/finance/application/report-filter";
import { generateFinancialReport } from "@/modules/finance/application/use-cases/generate-financial-report";
import { LibsqlReportRepository } from "@/modules/finance/infrastructure/libsql-report-repository";

export const runtime = "nodejs";

function optional(value: string | null) {
  return value || undefined;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const csv = url.searchParams.get("format") === "csv";
  const authResult = await getAuthContext(request, {
    resource: "report",
    action: csv ? "export" : "read",
  });
  if (!authResult.ok) return authResult.response;

  const filter: ReportFilter = {
    from: url.searchParams.get("from") ?? "",
    to: url.searchParams.get("to") ?? "",
    type: optional(url.searchParams.get("type")) as ReportFilter["type"],
    category: optional(
      url.searchParams.get("category"),
    ) as ReportFilter["category"],
    accountId: optional(url.searchParams.get("accountId")),
  };

  try {
    const repository = new LibsqlReportRepository(
      authResult.context.organizationId,
    );
    const report = await generateFinancialReport(repository, filter);
    if (!csv) return NextResponse.json({ data: report });

    await recordAuditEvent(authResult.context, {
      action: "report.exported",
      entityType: "financial_report",
      summary: `Exportó el reporte financiero del ${report.filter.from} al ${report.filter.to}.`,
      metadata: {
        from: report.filter.from,
        to: report.filter.to,
        transactionCount: report.summary.transactionCount,
      },
    });
    return new Response(formatFinancialReportCsv(report), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="deciflujo-${report.filter.from}-${report.filter.to}.csv"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          error: "Los filtros del reporte no son válidos.",
          fields: error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }
    logError("api.report_generate_failed", error);
    return NextResponse.json(
      { error: "No fue posible generar el reporte." },
      { status: 500 },
    );
  }
}
