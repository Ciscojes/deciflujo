import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { TrendsManager } from "@/components/trends/trends-manager";
import { auth } from "@/lib/auth";
import { hasDeciflujoPermission } from "@/lib/access-control";
import {
  getOrganizationMembershipRole,
  getOrganizationName,
} from "@/modules/finance/infrastructure/libsql-database";

export default async function TrendsPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/sign-in");

  const organizationId = session.session.activeOrganizationId;
  if (!organizationId) redirect("/onboarding");
  const role = await getOrganizationMembershipRole(
    session.user.id,
    organizationId,
  );
  if (!role || !hasDeciflujoPermission(role, "closing", "read")) redirect("/");

  return (
    <TrendsManager
      organizationName={
        (await getOrganizationName(organizationId)) ?? "Mi empresa"
      }
      canManageCloses={hasDeciflujoPermission(role, "closing", "create")}
    />
  );
}
