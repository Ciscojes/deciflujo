import { z } from "zod";
import { accountTypes } from "../domain/account";

export const accountInputSchema = z.object({
  name: z
    .string()
    .trim()
    .min(3, "El nombre debe tener al menos 3 caracteres.")
    .max(60, "El nombre no puede superar 60 caracteres."),
  type: z.enum(accountTypes),
  openingBalanceCents: z
    .number()
    .int("El saldo debe expresarse en céntimos.")
    .nonnegative("El saldo inicial no puede ser negativo.")
    .max(999_999_999_00, "El saldo excede el límite permitido."),
});

export type AccountInput = z.infer<typeof accountInputSchema>;
