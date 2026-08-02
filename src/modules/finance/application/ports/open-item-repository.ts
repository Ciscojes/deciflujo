import type {
  NewOpenItem,
  OpenItem,
} from "../../domain/open-item";
import type { PayOpenItemInput } from "../open-item-input";

export type PayOpenItemResult =
  | { outcome: "paid"; item: OpenItem }
  | { outcome: "not_found" }
  | { outcome: "already_paid" }
  | { outcome: "account_not_found" }
  | { outcome: "month_closed" };

export interface OpenItemRepository {
  list(): Promise<OpenItem[]>;
  create(item: NewOpenItem): Promise<OpenItem>;
  pay(id: string, input: PayOpenItemInput): Promise<PayOpenItemResult>;
}
