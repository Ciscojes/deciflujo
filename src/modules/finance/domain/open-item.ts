export const openItemKinds = ["receivable", "payable"] as const;

export type OpenItemKind = (typeof openItemKinds)[number];
export type StoredOpenItemStatus = "pending" | "paid";
export type OpenItemStatus = StoredOpenItemStatus | "overdue";

export type OpenItem = {
  id: string;
  kind: OpenItemKind;
  counterpartyName: string;
  concept: string;
  amountCents: number;
  dueOn: string;
  status: OpenItemStatus;
  paidAt: string | null;
  paymentTransactionId: string | null;
  createdAt: string;
};

export type NewOpenItem = Omit<
  OpenItem,
  "id" | "status" | "paidAt" | "paymentTransactionId" | "createdAt"
>;

export type OpenItemSummary = {
  receivableCents: number;
  payableCents: number;
  overdueReceivableCents: number;
  overduePayableCents: number;
  pendingCount: number;
  overdueCount: number;
};

export function resolveOpenItemStatus(
  storedStatus: StoredOpenItemStatus,
  dueOn: string,
  today = new Date().toISOString().slice(0, 10),
): OpenItemStatus {
  if (storedStatus === "paid") return "paid";
  return dueOn < today ? "overdue" : "pending";
}

export function summarizeOpenItems(items: OpenItem[]): OpenItemSummary {
  return items.reduce<OpenItemSummary>(
    (summary, item) => {
      if (item.status === "paid") return summary;

      if (item.kind === "receivable") {
        summary.receivableCents += item.amountCents;
        if (item.status === "overdue") {
          summary.overdueReceivableCents += item.amountCents;
        }
      } else {
        summary.payableCents += item.amountCents;
        if (item.status === "overdue") {
          summary.overduePayableCents += item.amountCents;
        }
      }

      if (item.status === "overdue") summary.overdueCount += 1;
      else summary.pendingCount += 1;
      return summary;
    },
    {
      receivableCents: 0,
      payableCents: 0,
      overdueReceivableCents: 0,
      overduePayableCents: 0,
      pendingCount: 0,
      overdueCount: 0,
    },
  );
}
