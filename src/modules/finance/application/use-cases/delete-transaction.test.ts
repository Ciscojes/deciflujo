import { describe, expect, it } from "vitest";
import type { TransactionRepository } from "../ports/transaction-repository";
import {
  deleteTransaction,
  TransactionNotFoundError,
} from "./delete-transaction";
import type { Transaction } from "../../domain/transaction";

class FakeTransactionRepository implements TransactionRepository {
  constructor(private readonly existingIds: Set<string>) {}

  async list(): Promise<Transaction[]> {
    return [];
  }

  async create(): Promise<Transaction> {
    throw new Error("No se utiliza en esta prueba.");
  }

  async deleteById(id: string): Promise<boolean> {
    return this.existingIds.delete(id);
  }
}

const existingId = "58f8f1b0-f8e2-4b90-9de6-5b578f9c6cb4";
const missingId = "d144af62-b43b-4124-a556-5ef624959c43";

describe("deleteTransaction", () => {
  it("elimina un movimiento existente", async () => {
    const repository = new FakeTransactionRepository(new Set([existingId]));

    await expect(deleteTransaction(repository, existingId)).resolves.toBeUndefined();
    await expect(deleteTransaction(repository, existingId)).rejects.toBeInstanceOf(
      TransactionNotFoundError,
    );
  });

  it("rechaza identificadores que no son UUID", async () => {
    const repository = new FakeTransactionRepository(new Set([missingId]));

    await expect(deleteTransaction(repository, "id-invalido")).rejects.toThrow();
  });
});
