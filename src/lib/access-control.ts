import { createAccessControl } from "better-auth/plugins/access";
import { defaultStatements } from "better-auth/plugins/organization/access";

export const deciflujoStatements = {
  ...defaultStatements,
  finance: ["read", "create", "delete"],
  decision: ["read", "create", "review"],
  demo: ["delete"],
  audit: ["read"],
  report: ["read", "export"],
  closing: ["read", "create", "delete"],
} as const;

export const deciflujoAccessControl = createAccessControl(deciflujoStatements);

export const deciflujoRoles = {
  owner: deciflujoAccessControl.newRole({
    organization: ["update", "delete"],
    member: ["create", "update", "delete"],
    invitation: ["create", "cancel"],
    team: ["create", "update", "delete"],
    ac: ["create", "read", "update", "delete"],
    finance: ["read", "create", "delete"],
    decision: ["read", "create", "review"],
    demo: ["delete"],
    audit: ["read"],
    report: ["read", "export"],
    closing: ["read", "create", "delete"],
  }),
  admin: deciflujoAccessControl.newRole({
    organization: ["update"],
    member: ["create", "update", "delete"],
    invitation: ["create", "cancel"],
    team: ["create", "update", "delete"],
    ac: ["read"],
    finance: ["read", "create", "delete"],
    decision: ["read", "create", "review"],
    demo: ["delete"],
    audit: ["read"],
    report: ["read", "export"],
    closing: ["read", "create", "delete"],
  }),
  accountant: deciflujoAccessControl.newRole({
    organization: [],
    member: [],
    invitation: [],
    team: [],
    ac: ["read"],
    finance: ["read", "create"],
    decision: ["read", "create", "review"],
    demo: [],
    audit: [],
    report: ["read", "export"],
    closing: ["read"],
  }),
  collaborator: deciflujoAccessControl.newRole({
    organization: [],
    member: [],
    invitation: [],
    team: [],
    ac: ["read"],
    finance: ["read", "create"],
    decision: ["read"],
    demo: [],
    audit: [],
    report: ["read"],
    closing: ["read"],
  }),
};

export type DeciflujoRole = keyof typeof deciflujoRoles;
export type DeciflujoResource =
  | "finance"
  | "decision"
  | "demo"
  | "audit"
  | "report"
  | "closing"
  | "team";
export type DeciflujoAction =
  | "read"
  | "create"
  | "delete"
  | "update"
  | "review"
  | "export";

export const roleLabels: Record<DeciflujoRole, string> = {
  owner: "Propietario",
  admin: "Administrador",
  accountant: "Contador",
  collaborator: "Colaborador",
};

export function isDeciflujoRole(value: string): value is DeciflujoRole {
  return value in deciflujoRoles;
}

export function hasDeciflujoPermission(
  role: string,
  resource: DeciflujoResource,
  action: DeciflujoAction,
): boolean {
  if (!isDeciflujoRole(role)) return false;
  return deciflujoRoles[role].authorize({
    [resource]: [action],
  } as never).success;
}
