import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { FinanceDashboard } from "@/components/dashboard/finance-dashboard";
import { auth } from "@/lib/auth";
import {
  claimLegacyFinanceData,
  getOrganizationMembershipRole,
  getOrganizationName,
} from "@/modules/finance/infrastructure/libsql-database";

export default async function Home() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/sign-in");

  const organizationId = session.session.activeOrganizationId;
  if (!organizationId) redirect("/onboarding");

  const role = await getOrganizationMembershipRole(
    session.user.id,
    organizationId,
  );
  if (!role) redirect("/onboarding");

  await claimLegacyFinanceData(organizationId);
  const organizationName =
    (await getOrganizationName(organizationId)) ?? "Mi empresa";

  return (
    <FinanceDashboard
      organizationName={organizationName}
      role={role}
      userName={session.user.name}
    />
  );
}
