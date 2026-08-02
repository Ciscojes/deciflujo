import "server-only";

import type { DatabaseValue } from "@/modules/finance/infrastructure/database-client";
import {
  isAuditAction,
  normalizeAuditLimit,
  type AuditEvent,
  type AuditMetadata,
  type NewAuditEvent,
} from "../domain/audit-event";
import { getFinanceDatabase } from "@/modules/finance/infrastructure/libsql-database";

function parseMetadata(value: DatabaseValue): AuditMetadata {
  try {
    const parsed = JSON.parse(String(value));
    return parsed && typeof parsed === "object"
      ? (parsed as AuditMetadata)
      : {};
  } catch {
    return {};
  }
}

function mapRow(row: Record<string, DatabaseValue>): AuditEvent {
  const action = String(row.action);
  if (!isAuditAction(action)) {
    throw new Error(`Acción de auditoría desconocida: ${action}`);
  }

  return {
    id: String(row.id),
    organizationId: String(row.organization_id),
    actorUserId:
      row.actor_user_id === null ? null : String(row.actor_user_id),
    actorName: String(row.actor_name),
    action,
    entityType: String(row.entity_type),
    entityId: row.entity_id === null ? null : String(row.entity_id),
    summary: String(row.summary),
    metadata: parseMetadata(row.metadata_json),
    createdAt: String(row.created_at),
  };
}

export class LibsqlAuditRepository {
  async record(event: NewAuditEvent): Promise<AuditEvent> {
    const database = await getFinanceDatabase();
    const entity: AuditEvent = {
      ...event,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };

    await database.execute({
      sql: `
        INSERT INTO audit_events (
          id, organization_id, actor_user_id, actor_name, action,
          entity_type, entity_id, summary, metadata_json, created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      args: [
        entity.id,
        entity.organizationId,
        entity.actorUserId,
        entity.actorName,
        entity.action,
        entity.entityType,
        entity.entityId,
        entity.summary,
        JSON.stringify(entity.metadata),
        entity.createdAt,
      ],
    });
    return entity;
  }

  async list(organizationId: string, limit = 50): Promise<AuditEvent[]> {
    const database = await getFinanceDatabase();
    const result = await database.execute({
      sql: `
        SELECT *
        FROM audit_events
        WHERE organization_id = ?
        ORDER BY created_at DESC
        LIMIT ?
      `,
      args: [organizationId, normalizeAuditLimit(limit)],
    });
    return result.rows.map((row) => mapRow(row));
  }
}
