import { z } from "zod";
import { transactionCategories } from "../domain/transaction";

export const budgetMonthSchema = z
  .string()
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/, "El mes no es válido.");

export const budgetInputSchema = z.object({
  month: budgetMonthSchema,
  category: z.enum(transactionCategories),
  plannedCents: z
    .number()
    .int("El monto debe expresarse en céntimos.")
    .positive("El presupuesto debe ser mayor que cero.")
    .max(999_999_999_00, "El monto excede el límite permitido."),
});

export type BudgetInput = z.infer<typeof budgetInputSchema>;
