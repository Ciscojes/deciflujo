import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowLeft,
  Building2,
  Clock3,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { auth } from "@/lib/auth";
import type {
  AuditAction,
  AuditEvent,
} from "@/modules/audit/domain/audit-event";
import { LibsqlAuditRepository } from "@/modules/audit/infrastructure/libsql-audit-repository";
import {
  getOrganizationMembershipRole,
  getOrganizationName,
} from "@/modules/finance/infrastructure/libsql-database";

const actionLabels: Record<AuditAction, string> = {
  "account.created": "Cuenta creada",
  "transaction.created": "Movimiento registrado",
  "transaction.deleted": "Movimiento eliminado",
  "decision.created": "Decisión guardada",
  "decision.reviewed": "Decisión evaluada",
  "demo_data.deleted": "Datos demo retirados",
  "invitation.created": "Invitación creada",
  "invitation.accepted": "Invitación aceptada",
  "invitation.cancelled": "Invitación cancelada",
  "open_item.created": "Cuenta pendiente creada",
  "open_item.paid": "Cuenta pendiente pagada",
  "budget.set": "Presupuesto establecido",
  "report.exported": "Reporte exportado",
  "month.closed": "Período cerrado",
  "month.reopened": "Período reabierto",
  "member.role_changed": "Rol de miembro modificado",
  "member.removed": "Miembro retirado",
};

const dateFormatter = new Intl.DateTimeFormat("es-CR", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "America/Costa_Rica",
});

function AuditTimeline({ events }: { events: AuditEvent[] }) {
  if (events.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-[#ccd6ce] bg-white px-6 py-14 text-center">
        <ShieldCheck className="mx-auto text-[#6a7c70]" size={30} />
        <h2 className="mt-4 font-semibold">Todavía no hay eventos</h2>
        <p className="mt-2 text-sm text-[#748093]">
          Las próximas acciones sensibles aparecerán aquí.
        </p>
      </div>
    );
  }

  return (
    <ol className="overflow-hidden rounded-2xl border border-[#dce3ec] bg-white">
      {events.map((event) => (
        <li
          key={event.id}
          className="grid gap-3 border-b border-[#eef1f5] px-5 py-5 last:border-b-0 sm:grid-cols-[180px_1fr]"
        >
          <div className="text-xs text-[#77837b]">
            <p className="flex items-center gap-2 font-medium text-[#536259]">
              <Clock3 size={14} />
              {dateFormatter.format(new Date(event.createdAt))}
            </p>
            <p className="mt-2 flex items-center gap-2">
              <UserRound size={14} />
              {event.actorName}
            </p>
          </div>
          <div>
            <span className="inline-flex rounded-full bg-[#e8eff7] px-2.5 py-1 text-[11px] font-semibold text-[#315f9b]">
              {actionLabels[event.action]}
            </span>
            <p className="mt-2 text-sm font-medium text-[#293648]">
              {event.summary}
            </p>
            {event.entityId && (
              <p className="mt-1 font-mono text-[11px] text-[#8d98a8]">
                ID: {event.entityId}
              </p>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}

export default async function AuditPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/sign-in");

  const organizationId = session.session.activeOrganizationId;
  if (!organizationId) redirect("/onboarding");

  const role = await getOrganizationMembershipRole(
    session.user.id,
    organizationId,
  );
  if (role !== "owner" && role !== "admin") redirect("/");

  const [organizationName, events] = await Promise.all([
    getOrganizationName(organizationId),
    new LibsqlAuditRepository().list(organizationId, 100),
  ]);

  return (
    <main className="min-h-screen bg-[#f7f8fa] px-5 py-8 text-[#18212f] sm:px-8">
      <div className="mx-auto max-w-5xl">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-medium text-[#48668e] hover:text-[#183153]"
        >
          <ArrowLeft size={16} /> Volver al dashboard
        </Link>

        <header className="mt-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <div className="mb-3 flex items-center gap-2 text-sm text-[#667386]">
              <Building2 size={16} /> {organizationName ?? "Mi empresa"}
            </div>
            <h1 className="text-3xl font-semibold tracking-[-0.04em]">
              Historial de auditoría
            </h1>
            <p className="mt-2 max-w-2xl leading-7 text-[#6d7888]">
              Consulta quién realizó cambios sensibles y cuándo ocurrieron.
              Los eventos están aislados por empresa y no se pueden editar
              desde la aplicación.
            </p>
          </div>
          <div className="inline-flex items-center gap-2 self-start rounded-xl border border-[#cfe0d4] bg-[#e8eff7] px-4 py-3 text-sm font-medium text-[#315f9b]">
            <ShieldCheck size={18} />
            {events.length} eventos recientes
          </div>
        </header>

        <section className="mt-8">
          <AuditTimeline events={events} />
        </section>
      </div>
    </main>
  );
}
