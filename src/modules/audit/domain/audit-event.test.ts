import { describe, expect, it } from "vitest";
import {
  isAuditAction,
  normalizeAuditLimit,
} from "./audit-event";

describe("eventos de auditoría", () => {
  it("reconoce únicamente acciones conocidas", () => {
    expect(isAuditAction("transaction.deleted")).toBe(true);
    expect(isAuditAction("member.role_changed")).toBe(true);
    expect(isAuditAction("member.removed")).toBe(true);
    expect(isAuditAction("transaction.changed")).toBe(false);
  });

  it("limita el tamaño de consulta entre 1 y 100", () => {
    expect(normalizeAuditLimit(0)).toBe(1);
    expect(normalizeAuditLimit(25.8)).toBe(25);
    expect(normalizeAuditLimit(500)).toBe(100);
    expect(normalizeAuditLimit(Number.NaN)).toBe(50);
  });
});
