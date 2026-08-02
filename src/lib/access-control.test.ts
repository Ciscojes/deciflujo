import { describe, expect, it } from "vitest";
import { hasDeciflujoPermission } from "./access-control";

describe("matriz de permisos de Deciflujo", () => {
  it("permite al propietario administrar datos de demostración", () => {
    expect(hasDeciflujoPermission("owner", "demo", "delete")).toBe(true);
  });

  it("permite al administrador eliminar movimientos", () => {
    expect(hasDeciflujoPermission("admin", "finance", "delete")).toBe(true);
    expect(hasDeciflujoPermission("admin", "audit", "read")).toBe(true);
    expect(hasDeciflujoPermission("admin", "closing", "create")).toBe(true);
    expect(hasDeciflujoPermission("admin", "team", "update")).toBe(true);
    expect(hasDeciflujoPermission("admin", "team", "delete")).toBe(true);
  });

  it("permite al contador registrar pero no eliminar movimientos", () => {
    expect(hasDeciflujoPermission("accountant", "finance", "create")).toBe(true);
    expect(hasDeciflujoPermission("accountant", "finance", "delete")).toBe(false);
    expect(hasDeciflujoPermission("accountant", "audit", "read")).toBe(false);
    expect(hasDeciflujoPermission("accountant", "report", "export")).toBe(true);
    expect(hasDeciflujoPermission("accountant", "closing", "read")).toBe(true);
    expect(hasDeciflujoPermission("accountant", "closing", "create")).toBe(false);
    expect(hasDeciflujoPermission("accountant", "team", "update")).toBe(false);
  });

  it("mantiene las decisiones del colaborador en solo lectura", () => {
    expect(hasDeciflujoPermission("collaborator", "decision", "read")).toBe(true);
    expect(hasDeciflujoPermission("collaborator", "decision", "create")).toBe(
      false,
    );
    expect(hasDeciflujoPermission("collaborator", "decision", "review")).toBe(
      false,
    );
    expect(hasDeciflujoPermission("collaborator", "report", "read")).toBe(true);
    expect(hasDeciflujoPermission("collaborator", "report", "export")).toBe(
      false,
    );
  });

  it("rechaza roles desconocidos", () => {
    expect(hasDeciflujoPermission("intruso", "finance", "read")).toBe(false);
  });
});
