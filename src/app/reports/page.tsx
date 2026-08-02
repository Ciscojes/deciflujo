import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { ReportManager } from "@/components/reports/report-manager";
import { hasDeciflujoPermission } from "@/lib/access-control";
import {
  getOrganizationMembershipRole,
  getOrganizationName,
} from "@/modules/finance/infrastructure/libsql-database";

export default async function ReportsPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/sign-in");

  const organizationId = session.session.activeOrganizationId;
  if (!organizationId) redirect("/onboarding");

  const role = await getOrganizationMembershipRole(
    session.user.id,
    organizationId,
  );
  if (!role || !hasDeciflujoPermission(role, "report", "read")) redirect("/");

  return (
    <ReportManager
      organizationName={
        (await getOrganizationName(organizationId)) ?? "Mi empresa"
      }
      canExport={hasDeciflujoPermission(role, "report", "export")}
    />
  );
}
