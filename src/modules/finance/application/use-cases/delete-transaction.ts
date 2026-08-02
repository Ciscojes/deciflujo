import { z } from "zod";
import type { TransactionRepository } from "../ports/transaction-repository";

const transactionIdSchema = z.uuid("El identificador del movimiento no es válido.");

export class TransactionNotFoundError extends Error {
  constructor() {
    super("El movimiento solicitado no existe.");
    this.name = "TransactionNotFoundError";
  }
}

export async function deleteTransaction(
  repository: TransactionRepository,
  transactionId: string,
): Promise<void> {
  const id = transactionIdSchema.parse(transactionId);
  const deleted = await repository.deleteById(id);

  if (!deleted) {
    throw new TransactionNotFoundError();
  }
}
