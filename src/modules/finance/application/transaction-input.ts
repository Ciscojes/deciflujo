import { z } from "zod";
import {
  transactionCategories,
  transactionTypes,
} from "../domain/transaction";

export const transactionInputSchema = z.object({
  description: z
    .string()
    .trim()
    .min(3, "La descripción debe tener al menos 3 caracteres.")
    .max(100, "La descripción no puede superar 100 caracteres."),
  amountCents: z
    .number()
    .int("El monto debe expresarse en céntimos.")
    .positive("El monto debe ser mayor que cero.")
    .max(999_999_999_00, "El monto excede el límite permitido."),
  type: z.enum(transactionTypes),
  category: z.enum(transactionCategories),
  accountId: z.uuid("Selecciona una cuenta válida."),
  occurredOn: z.iso.date("La fecha no es válida."),
});

export type TransactionInput = z.infer<typeof transactionInputSchema>;
