import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { BudgetManager } from "@/components/budgets/budget-manager";
import {
  getOrganizationMembershipRole,
  getOrganizationName,
} from "@/modules/finance/infrastructure/libsql-database";

export default async function BudgetsPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/sign-in");

  const organizationId = session.session.activeOrganizationId;
  if (!organizationId) redirect("/onboarding");

  const role = await getOrganizationMembershipRole(
    session.user.id,
    organizationId,
  );
  if (!role) redirect("/onboarding");

  return (
    <BudgetManager
      organizationName={
        (await getOrganizationName(organizationId)) ?? "Mi empresa"
      }
    />
  );
}
