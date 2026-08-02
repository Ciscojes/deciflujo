export const transactionTypes = ["income", "expense"] as const;

export type TransactionType = (typeof transactionTypes)[number];

export const transactionCategories = [
  "Ventas",
  "Servicios",
  "Nómina",
  "Operación",
  "Marketing",
  "Impuestos",
  "Otros",
] as const;

export type TransactionCategory = (typeof transactionCategories)[number];

export type Transaction = {
  id: string;
  description: string;
  amountCents: number;
  type: TransactionType;
  category: TransactionCategory;
  accountId: string;
  occurredOn: string;
  createdAt: string;
};

export type NewTransaction = Omit<Transaction, "id" | "createdAt">;

export function assertPositiveAmount(amountCents: number): void {
  if (!Number.isInteger(amountCents) || amountCents <= 0) {
    throw new Error("El monto debe ser un número entero positivo en céntimos.");
  }
}
