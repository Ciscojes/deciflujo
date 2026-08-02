import { describe, expect, it } from "vitest";
import type {
  OpenItemRepository,
  PayOpenItemResult,
} from "../ports/open-item-repository";
import type { OpenItem } from "../../domain/open-item";
import {
  OpenItemAlreadyPaidError,
  OpenItemNotFoundError,
  PaymentAccountNotFoundError,
  payOpenItem,
} from "./pay-open-item";
import { MonthClosedError } from "../../domain/monthly-close";

class FakeOpenItemRepository implements OpenItemRepository {
  constructor(private readonly result: PayOpenItemResult) {}

  async list(): Promise<OpenItem[]> {
    return [];
  }

  async create(): Promise<OpenItem> {
    throw new Error("No se utiliza en esta prueba.");
  }

  async pay(): Promise<PayOpenItemResult> {
    return this.result;
  }
}

const itemId = "58f8f1b0-f8e2-4b90-9de6-5b578f9c6cb4";
const input = {
  accountId: "d144af62-b43b-4124-a556-5ef624959c43",
  paidOn: "2026-07-30",
};

describe("payOpenItem", () => {
  it.each([
    ["not_found", OpenItemNotFoundError],
    ["already_paid", OpenItemAlreadyPaidError],
    ["account_not_found", PaymentAccountNotFoundError],
    ["month_closed", MonthClosedError],
  ] as const)("traduce el resultado %s a un error de negocio", async (outcome, ErrorType) => {
    const repository = new FakeOpenItemRepository({ outcome });
    await expect(payOpenItem(repository, itemId, input)).rejects.toBeInstanceOf(
      ErrorType,
    );
  });

  it("rechaza identificadores inválidos antes de consultar persistencia", async () => {
    const repository = new FakeOpenItemRepository({ outcome: "not_found" });
    await expect(payOpenItem(repository, "invalido", input)).rejects.toThrow();
  });
});
