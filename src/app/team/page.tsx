import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { TeamManager } from "@/components/team/team-manager";
import {
  getOrganizationMembershipRole,
  getOrganizationName,
} from "@/modules/finance/infrastructure/libsql-database";

export default async function TeamPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/sign-in");

  const organizationId = session.session.activeOrganizationId;
  if (!organizationId) redirect("/onboarding");

  const role = await getOrganizationMembershipRole(
    session.user.id,
    organizationId,
  );
  if (role !== "owner" && role !== "admin") redirect("/");

  return (
    <TeamManager
      currentUserId={session.user.id}
      organizationName={
        (await getOrganizationName(organizationId)) ?? "Mi empresa"
      }
    />
  );
}
