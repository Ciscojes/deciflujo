import type {
  NewTransaction,
  Transaction,
} from "../../domain/transaction";

export interface TransactionRepository {
  list(): Promise<Transaction[]>;
  create(transaction: NewTransaction): Promise<Transaction>;
  deleteById(id: string): Promise<boolean>;
}
