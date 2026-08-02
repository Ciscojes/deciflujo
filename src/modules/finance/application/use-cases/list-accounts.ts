import type { AccountRepository } from "../ports/account-repository";

export async function listAccounts(repository: AccountRepository) {
  return repository.list();
}
