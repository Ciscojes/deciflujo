export const auditActions = [
  "account.created",
  "transaction.created",
  "transaction.deleted",
  "decision.created",
  "decision.reviewed",
  "decision.auto_reviewed",
  "demo_data.deleted",
  "invitation.created",
  "invitation.accepted",
  "invitation.cancelled",
  "open_item.created",
  "open_item.paid",
  "budget.set",
  "report.exported",
  "month.closed",
  "month.reopened",
  "member.role_changed",
  "member.removed",
] as const;

export type AuditAction = (typeof auditActions)[number];

export type AuditMetadata = Record<
  string,
  string | number | boolean | null
>;

export type AuditEvent = {
  id: string;
  organizationId: string;
  actorUserId: string | null;
  actorName: string;
  action: AuditAction;
  entityType: string;
  entityId: string | null;
  summary: string;
  metadata: AuditMetadata;
  createdAt: string;
};

export type NewAuditEvent = Omit<AuditEvent, "id" | "createdAt">;

export function isAuditAction(value: string): value is AuditAction {
  return auditActions.includes(value as AuditAction);
}

export function normalizeAuditLimit(value: number): number {
  if (!Number.isFinite(value)) return 50;
  return Math.min(100, Math.max(1, Math.trunc(value)));
}
