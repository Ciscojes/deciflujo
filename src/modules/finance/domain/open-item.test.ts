import { describe, expect, it } from "vitest";
import {
  resolveOpenItemStatus,
  summarizeOpenItems,
  type OpenItem,
} from "./open-item";

function item(
  overrides: Partial<OpenItem> & Pick<OpenItem, "kind" | "status" | "amountCents">,
): OpenItem {
  return {
    id: crypto.randomUUID(),
    counterpartyName: "Contraparte",
    concept: "Concepto de prueba",
    dueOn: "2026-08-15",
    paidAt: null,
    paymentTransactionId: null,
    createdAt: "2026-07-30T12:00:00.000Z",
    ...overrides,
  };
}

describe("estado de cuentas por cobrar y pagar", () => {
  it("calcula vencido desde la fecha sin persistir un estado que se vuelva obsoleto", () => {
    expect(resolveOpenItemStatus("pending", "2026-07-29", "2026-07-30")).toBe(
      "overdue",
    );
    expect(resolveOpenItemStatus("pending", "2026-07-30", "2026-07-30")).toBe(
      "pending",
    );
    expect(resolveOpenItemStatus("paid", "2026-07-01", "2026-07-30")).toBe(
      "paid",
    );
  });

  it("resume únicamente saldos abiertos y separa vencidos", () => {
    const summary = summarizeOpenItems([
      item({ kind: "receivable", status: "pending", amountCents: 100_000 }),
      item({ kind: "receivable", status: "overdue", amountCents: 50_000 }),
      item({ kind: "payable", status: "overdue", amountCents: 30_000 }),
      item({ kind: "payable", status: "paid", amountCents: 999_000 }),
    ]);

    expect(summary).toEqual({
      receivableCents: 150_000,
      payableCents: 30_000,
      overdueReceivableCents: 50_000,
      overduePayableCents: 30_000,
      pendingCount: 1,
      overdueCount: 2,
    });
  });
});
