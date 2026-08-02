import type {
  AccountOverview,
  NewAccount,
} from "../../domain/account";

export interface AccountRepository {
  list(): Promise<AccountOverview[]>;
  create(account: NewAccount): Promise<AccountOverview>;
  exists(id: string): Promise<boolean>;
}
