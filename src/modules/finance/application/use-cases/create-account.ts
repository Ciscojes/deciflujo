import type { AccountRepository } from "../ports/account-repository";
import {
  accountInputSchema,
  type AccountInput,
} from "../account-input";

export async function createAccount(
  repository: AccountRepository,
  input: AccountInput,
) {
  const account = accountInputSchema.parse(input);
  return repository.create(account);
}
