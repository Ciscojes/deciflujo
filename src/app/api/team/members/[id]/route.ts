import { NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { auth } from "@/lib/auth";
import { getAuthContext } from "@/lib/auth-context";
import { recordAuditEvent } from "@/lib/audit";
import { getOrganizationMember } from "@/modules/finance/infrastructure/libsql-database";

export const runtime = "nodejs";

const roleSchema = z
  .object({ role: z.enum(["admin", "accountant", "collaborator"]) })
  .strict();

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const authResult = await getAuthContext(request, {
    resource: "team",
    action: "update",
  });
  if (!authResult.ok) return authResult.response;

  try {
    const { id } = await context.params;
    const input = roleSchema.parse(await request.json());
    const member = await getOrganizationMember(
      id,
      authResult.context.organizationId,
    );
    if (!member) {
      return NextResponse.json({ error: "El miembro no existe." }, { status: 404 });
    }
    if (member.role === "owner") {
      return NextResponse.json(
        { error: "El rol del propietario no se modifica desde esta operación." },
        { status: 409 },
      );
    }

    await auth.api.updateMemberRole({
      headers: request.headers,
      body: {
        memberId: id,
        organizationId: authResult.context.organizationId,
        role: input.role,
      },
    });
    await recordAuditEvent(authResult.context, {
      action: "member.role_changed",
      entityType: "member",
      entityId: id,
      summary: `Cambió el rol de ${member.name}.`,
      metadata: {
        email: member.email,
        previousRole: member.role,
        newRole: input.role,
      },
    });
    return NextResponse.json({ data: { id, role: input.role } });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "El rol no es válido." }, { status: 400 });
    }
    throw error;
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  const authResult = await getAuthContext(request, {
    resource: "team",
    action: "delete",
  });
  if (!authResult.ok) return authResult.response;

  const { id } = await context.params;
  const member = await getOrganizationMember(
    id,
    authResult.context.organizationId,
  );
  if (!member) {
    return NextResponse.json({ error: "El miembro no existe." }, { status: 404 });
  }
  if (member.role === "owner") {
    return NextResponse.json(
      { error: "No se puede retirar al propietario principal." },
      { status: 409 },
    );
  }

  await auth.api.removeMember({
    headers: request.headers,
    body: {
      memberIdOrEmail: id,
      organizationId: authResult.context.organizationId,
    },
  });
  await recordAuditEvent(authResult.context, {
    action: "member.removed",
    entityType: "member",
    entityId: id,
    summary: `Retiró a ${member.name} del equipo.`,
    metadata: { email: member.email, previousRole: member.role },
  });
  return NextResponse.json({ data: { id } });
}
