import type { TransactionRepository } from "../ports/transaction-repository";

export async function listTransactions(repository: TransactionRepository) {
  return repository.list();
}
