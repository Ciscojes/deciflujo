import "server-only";

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  getOrganizationMembershipRole,
} from "@/modules/finance/infrastructure/libsql-database";
import {
  type DeciflujoAction,
  type DeciflujoResource,
  hasDeciflujoPermission,
} from "@/lib/access-control";
import { hasTrustedMutationOrigin } from "@/lib/request-origin";

type AuthContext = {
  organizationId: string;
  role: string;
  userId: string;
  userName: string;
};

export type AuthContextResult =
  | { ok: true; context: AuthContext }
  | { ok: false; response: NextResponse };

export async function getAuthContext(
  request: Request,
  permission?: { resource: DeciflujoResource; action: DeciflujoAction },
): Promise<AuthContextResult> {
  if (!hasTrustedMutationOrigin(request)) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "El origen de la solicitud no es válido." },
        { status: 403 },
      ),
    };
  }

  const session = await auth.api.getSession({ headers: request.headers });

  if (!session) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Debes iniciar sesión para continuar." },
        { status: 401 },
      ),
    };
  }

  const organizationId = session.session.activeOrganizationId;
  if (!organizationId) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Selecciona o crea una empresa para continuar." },
        { status: 403 },
      ),
    };
  }

  const role = await getOrganizationMembershipRole(
    session.user.id,
    organizationId,
  );
  if (!role) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "No tienes acceso a esta empresa." },
        { status: 403 },
      ),
    };
  }

  if (
    permission &&
    !hasDeciflujoPermission(role, permission.resource, permission.action)
  ) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Tu rol no permite realizar esta acción." },
        { status: 403 },
      ),
    };
  }

  return {
    ok: true,
    context: {
      organizationId,
      role,
      userId: session.user.id,
      userName: session.user.name,
    },
  };
}
