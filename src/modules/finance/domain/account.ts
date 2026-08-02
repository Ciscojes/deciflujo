export const accountTypes = ["bank", "cash", "card"] as const;

export type AccountType = (typeof accountTypes)[number];

export type Account = {
  id: string;
  name: string;
  type: AccountType;
  openingBalanceCents: number;
  createdAt: string;
};

export type AccountOverview = Account & {
  balanceCents: number;
  transactionCount: number;
};

export type NewAccount = Omit<Account, "id" | "createdAt">;

export function calculateAccountBalance(
  openingBalanceCents: number,
  movements: Array<{ type: "income" | "expense"; amountCents: number }>,
): number {
  return movements.reduce(
    (balance, movement) =>
      movement.type === "income"
        ? balance + movement.amountCents
        : balance - movement.amountCents,
    openingBalanceCents,
  );
}
