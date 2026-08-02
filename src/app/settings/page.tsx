import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import {
  getOrganizationMembershipRole,
  getOrganizationName,
} from "@/modules/finance/infrastructure/libsql-database";
import { roleLabels, isDeciflujoRole } from "@/lib/access-control";

export default async function SettingsPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/sign-in");
  const organizationId = session.session.activeOrganizationId;
  if (!organizationId) redirect("/onboarding");
  const [organizationName, role] = await Promise.all([
    getOrganizationName(organizationId),
    getOrganizationMembershipRole(session.user.id, organizationId),
  ]);

  return (
    <main className="min-h-screen bg-[#f7f8fa] px-5 py-10 text-[#293648]">
      <div className="mx-auto max-w-3xl">
        <Link href="/" className="text-sm font-medium text-[#315f9b] hover:underline">← Volver al dashboard</Link>
        <h1 className="mt-7 text-3xl font-semibold">Configuración</h1>
        <div className="mt-7 grid gap-5 sm:grid-cols-2">
          <section className="rounded-2xl border border-[#dce3ec] bg-white p-6">
            <h2 className="font-semibold">Tu cuenta</h2>
            <p className="mt-3">{session.user.name}</p>
            <p className="text-sm text-[#748093]">{session.user.email}</p>
          </section>
          <section className="rounded-2xl border border-[#dce3ec] bg-white p-6">
            <h2 className="font-semibold">Empresa activa</h2>
            <p className="mt-3">{organizationName ?? "Mi empresa"}</p>
            <p className="text-sm text-[#748093]">
              {role && isDeciflujoRole(role) ? roleLabels[role] : "Miembro"}
            </p>
          </section>
        </div>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link href="/onboarding" className="rounded-lg border border-[#cbd5e1] bg-white px-4 py-2 text-sm font-medium">Cambiar empresa</Link>
          {(role === "owner" || role === "admin") && (
            <Link href="/team" className="rounded-lg bg-[#183153] px-4 py-2 text-sm font-medium text-white">Gestionar equipo</Link>
          )}
        </div>
      </div>
    </main>
  );
}
