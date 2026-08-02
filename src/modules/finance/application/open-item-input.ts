import { z } from "zod";
import { openItemKinds } from "../domain/open-item";

export const openItemInputSchema = z.object({
  kind: z.enum(openItemKinds),
  counterpartyName: z
    .string()
    .trim()
    .min(2, "El nombre debe tener al menos 2 caracteres.")
    .max(100, "El nombre no puede superar 100 caracteres."),
  concept: z
    .string()
    .trim()
    .min(3, "El concepto debe tener al menos 3 caracteres.")
    .max(140, "El concepto no puede superar 140 caracteres."),
  amountCents: z
    .number()
    .int("El monto debe expresarse en céntimos.")
    .positive("El monto debe ser mayor que cero.")
    .max(999_999_999_00, "El monto excede el límite permitido."),
  dueOn: z.iso.date("La fecha de vencimiento no es válida."),
});

export const payOpenItemInputSchema = z.object({
  accountId: z.uuid("Selecciona una cuenta válida."),
  paidOn: z.iso.date("La fecha de pago no es válida."),
});

export type OpenItemInput = z.infer<typeof openItemInputSchema>;
export type PayOpenItemInput = z.infer<typeof payOpenItemInputSchema>;
