import "server-only";

import type {
  AuditAction,
  AuditMetadata,
} from "@/modules/audit/domain/audit-event";
import { LibsqlAuditRepository } from "@/modules/audit/infrastructure/libsql-audit-repository";
import { logError } from "./logger";

type AuditActor = {
  organizationId: string;
  userId: string;
  userName: string;
};

type RecordAuditInput = {
  action: AuditAction;
  entityType: string;
  entityId?: string | null;
  summary: string;
  metadata?: AuditMetadata;
};

const repository = new LibsqlAuditRepository();

export async function recordAuditEvent(
  actor: AuditActor,
  input: RecordAuditInput,
): Promise<void> {
  try {
    await repository.record({
      organizationId: actor.organizationId,
      actorUserId: actor.userId,
      actorName: actor.userName,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId ?? null,
      summary: input.summary,
      metadata: input.metadata ?? {},
    });
  } catch (error) {
    // La operación principal ya ocurrió; no se devuelve un falso error al
    // cliente. El fallo queda visible en logs para observabilidad.
    logError("audit.record_failed", error, {
      organizationId: actor.organizationId,
      action: input.action,
    });
  }
}
