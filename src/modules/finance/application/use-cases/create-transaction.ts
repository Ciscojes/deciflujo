import { assertPositiveAmount } from "../../domain/transaction";
import type { AccountRepository } from "../ports/account-repository";
import type { TransactionRepository } from "../ports/transaction-repository";
import {
  transactionInputSchema,
  type TransactionInput,
} from "../transaction-input";

export async function createTransaction(
  repository: TransactionRepository,
  accountRepository: AccountRepository,
  input: TransactionInput,
) {
  const transaction = transactionInputSchema.parse(input);
  assertPositiveAmount(transaction.amountCents);

  if (!(await accountRepository.exists(transaction.accountId))) {
    throw new AccountNotFoundError();
  }

  return repository.create(transaction);
}

export class AccountNotFoundError extends Error {
  constructor() {
    super("La cuenta seleccionada no existe.");
    this.name = "AccountNotFoundError";
  }
}
