import { z } from "zod";

export const decisionInputSchema = z.object({
  title: z
    .string()
    .trim()
    .min(4, "El título debe tener al menos 4 caracteres.")
    .max(100, "El título no puede superar 100 caracteres."),
  addedMonthlyExpenseCents: z
    .number()
    .int("El gasto debe expresarse en céntimos.")
    .positive("El gasto debe ser mayor que cero."),
  horizonMonths: z
    .number()
    .int()
    .min(1, "El horizonte mínimo es un mes.")
    .max(24, "El horizonte máximo es 24 meses."),
});

export type DecisionInput = z.infer<typeof decisionInputSchema>;
