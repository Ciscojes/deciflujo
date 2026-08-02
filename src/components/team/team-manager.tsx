"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import {
  ArrowLeft,
  Building2,
  Check,
  Copy,
  LoaderCircle,
  MailPlus,
  Trash2,
  UserRoundCog,
  Users,
} from "lucide-react";
import { authClient } from "@/lib/auth-client";
import {
  type DeciflujoRole,
  roleLabels,
} from "@/lib/access-control";

type Member = {
  id: string;
  userId: string;
  role: DeciflujoRole;
  user: { name: string; email: string };
};

type Invitation = {
  id: string;
  email: string;
  role: DeciflujoRole;
  status: string;
};

const assignableRoles: DeciflujoRole[] = [
  "admin",
  "accountant",
  "collaborator",
];

export function TeamManager({
  currentUserId,
  organizationName,
}: {
  currentUserId: string;
  organizationName: string;
}) {
  const [members, setMembers] = useState<Member[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const loadTeam = useCallback(async () => {
    const result = await authClient.organization.getFullOrganization();
    if (result.error || !result.data) {
      setError("No fue posible cargar el equipo.");
    } else {
      setMembers(result.data.members as Member[]);
      setInvitations(
        (result.data.invitations as Invitation[]).filter(
          (invitation) => invitation.status === "pending",
        ),
      );
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    let active = true;

    void authClient.organization.getFullOrganization().then((result) => {
      if (!active) return;
      if (result.error || !result.data) {
        setError("No fue posible cargar el equipo.");
      } else {
        setMembers(result.data.members as Member[]);
        setInvitations(
          (result.data.invitations as Invitation[]).filter(
            (invitation) => invitation.status === "pending",
          ),
        );
      }
      setLoading(false);
    });

    return () => {
      active = false;
    };
  }, []);

  async function invite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    const result = await authClient.organization.inviteMember({
      email: String(form.get("email")),
      role: String(form.get("role")) as DeciflujoRole,
    });
    if (result.error) {
      setError("No fue posible crear la invitación.");
    } else {
      event.currentTarget.reset();
      await loadTeam();
    }
    setSaving(false);
  }

  async function updateRole(memberId: string, role: DeciflujoRole) {
    setSaving(true);
    setError(null);
    const response = await fetch(`/api/team/members/${memberId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    if (!response.ok) setError("No fue posible cambiar el rol.");
    await loadTeam();
    setSaving(false);
  }

  async function removeMember(member: Member) {
    if (!window.confirm(`¿Quitar a ${member.user.name} del equipo?`)) return;
    setSaving(true);
    const response = await fetch(`/api/team/members/${member.id}`, {
      method: "DELETE",
    });
    if (!response.ok) setError("No fue posible quitar al miembro.");
    await loadTeam();
    setSaving(false);
  }

  async function cancelInvitation(invitationId: string) {
    setSaving(true);
    const result = await authClient.organization.cancelInvitation({
      invitationId,
    });
    if (result.error) setError("No fue posible cancelar la invitación.");
    await loadTeam();
    setSaving(false);
  }

  async function copyInvitation(invitationId: string) {
    const url = `${window.location.origin}/accept-invitation?id=${invitationId}`;
    await navigator.clipboard.writeText(url);
    setCopiedId(invitationId);
    window.setTimeout(() => setCopiedId(null), 1800);
  }

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
              <Building2 size={16} /> {organizationName}
            </div>
            <h1 className="text-3xl font-semibold tracking-[-0.04em]">
              Equipo y permisos
            </h1>
            <p className="mt-2 max-w-2xl leading-7 text-[#6d7888]">
              Invita personas y decide qué operaciones financieras puede
              realizar cada una.
            </p>
          </div>
        </header>

        {error && (
          <p className="mt-6 rounded-xl border border-[#e9cfc6] bg-[#fff7f3] px-4 py-3 text-sm text-[#9c4f35]">
            {error}
          </p>
        )}

        <section className="mt-8 grid gap-6 lg:grid-cols-[1fr_0.8fr]">
          <div className="rounded-2xl border border-[#dce3ec] bg-white p-6">
            <div className="mb-5 flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-xl bg-[#edf3fb] text-[#3567a8]">
                <Users size={19} />
              </span>
              <div>
                <h2 className="font-semibold">Miembros</h2>
                <p className="text-sm text-[#7b8696]">
                  {members.length} personas con acceso
                </p>
              </div>
            </div>

            {loading ? (
              <LoaderCircle className="mx-auto my-10 animate-spin text-[#52705e]" />
            ) : (
              <div className="divide-y divide-[#eef1f5]">
                {members.map((member) => (
                  <div
                    key={member.id}
                    className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center"
                  >
                    <div className="grid size-10 shrink-0 place-items-center rounded-full bg-[#263b30] text-sm font-semibold text-white">
                      {member.user.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">
                        {member.user.name}
                        {member.userId === currentUserId && (
                          <span className="ml-2 text-xs font-normal text-[#7d8796]">
                            Tú
                          </span>
                        )}
                      </p>
                      <p className="truncate text-sm text-[#7b8696]">
                        {member.user.email}
                      </p>
                    </div>
                    {member.role === "owner" ? (
                      <span className="rounded-lg bg-[#edf2f8] px-3 py-2 text-sm font-medium text-[#315f45]">
                        {roleLabels.owner}
                      </span>
                    ) : (
                      <>
                        <select
                          className="rounded-lg border border-[#d5dde8] bg-white px-3 py-2 text-sm"
                          value={member.role}
                          disabled={saving}
                          onChange={(event) =>
                            void updateRole(
                              member.id,
                              event.target.value as DeciflujoRole,
                            )
                          }
                        >
                          {assignableRoles.map((role) => (
                            <option key={role} value={role}>
                              {roleLabels[role]}
                            </option>
                          ))}
                        </select>
                        <button
                          className="rounded-lg p-2 text-[#a05a46] hover:bg-[#fff1ed]"
                          onClick={() => void removeMember(member)}
                          disabled={saving}
                          aria-label={`Quitar a ${member.user.name}`}
                        >
                          <Trash2 size={17} />
                        </button>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-6">
            <form
              onSubmit={invite}
              className="rounded-2xl border border-[#dce3ec] bg-white p-6"
            >
              <div className="mb-5 flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-xl bg-[#f7ece3] text-[#9d613a]">
                  <MailPlus size={19} />
                </span>
                <div>
                  <h2 className="font-semibold">Invitar persona</h2>
                  <p className="text-sm text-[#7b8696]">
                    Envía un correo con enlace seguro
                  </p>
                </div>
              </div>
              <label className="block text-sm font-medium">
                Correo
                <input
                  className="form-control mt-2"
                  type="email"
                  name="email"
                  required
                />
              </label>
              <label className="mt-4 block text-sm font-medium">
                Rol
                <select className="form-control mt-2" name="role">
                  {assignableRoles.map((role) => (
                    <option key={role} value={role}>
                      {roleLabels[role]}
                    </option>
                  ))}
                </select>
              </label>
              <button
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-[#183153] px-4 py-3 font-medium text-white disabled:opacity-60"
                disabled={saving}
              >
                {saving ? (
                  <LoaderCircle size={17} className="animate-spin" />
                ) : (
                  <UserRoundCog size={17} />
                )}
                Crear invitación
              </button>
            </form>

            {invitations.length > 0 && (
              <div className="rounded-2xl border border-[#dce3ec] bg-white p-6">
                <h2 className="font-semibold">Invitaciones pendientes</h2>
                <div className="mt-4 space-y-3">
                  {invitations.map((invitation) => (
                    <div
                      key={invitation.id}
                      className="rounded-xl bg-[#f7f8fa] p-4"
                    >
                      <p className="truncate text-sm font-medium">
                        {invitation.email}
                      </p>
                      <p className="mt-1 text-xs text-[#7b8696]">
                        {roleLabels[invitation.role]}
                      </p>
                      <div className="mt-3 flex gap-2">
                        <button
                          className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-[#d5dde8] bg-white px-3 py-2 text-xs font-medium"
                          onClick={() => void copyInvitation(invitation.id)}
                        >
                          {copiedId === invitation.id ? (
                            <Check size={14} />
                          ) : (
                            <Copy size={14} />
                          )}
                          {copiedId === invitation.id
                            ? "Copiado"
                            : "Copiar enlace"}
                        </button>
                        <button
                          className="rounded-lg px-3 py-2 text-xs font-medium text-[#a05a46] hover:bg-[#fff1ed]"
                          onClick={() =>
                            void cancelInvitation(invitation.id)
                          }
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>

        <section className="mt-6 grid gap-3 rounded-2xl border border-[#dce3ec] bg-white p-6 sm:grid-cols-2 lg:grid-cols-4">
          {Object.entries(roleLabels).map(([role, label]) => (
            <div key={role} className="rounded-xl bg-[#f7f8fa] p-4">
              <p className="text-sm font-semibold">{label}</p>
              <p className="mt-1 text-xs leading-5 text-[#758091]">
                {role === "owner" && "Control total y gestión de la empresa."}
                {role === "admin" && "Gestiona equipo y todos los movimientos."}
                {role === "accountant" && "Registra y revisa, pero no elimina."}
                {role === "collaborator" &&
                  "Registra movimientos y solo consulta decisiones."}
              </p>
            </div>
          ))}
        </section>
      </div>
    </main>
  );
}
