import { z } from "zod";
import {
  transactionCategories,
  transactionTypes,
} from "../domain/transaction";

export const reportFilterSchema = z
  .object({
    from: z.iso.date("La fecha inicial no es válida."),
    to: z.iso.date("La fecha final no es válida."),
    type: z.enum(transactionTypes).optional(),
    category: z.enum(transactionCategories).optional(),
    accountId: z.uuid("La cuenta seleccionada no es válida.").optional(),
  })
  .refine((filter) => filter.from <= filter.to, {
    message: "La fecha inicial debe ser anterior a la fecha final.",
    path: ["to"],
  })
  .refine(
    (filter) => {
      const from = new Date(`${filter.from}T00:00:00Z`);
      const to = new Date(`${filter.to}T00:00:00Z`);
      return to.getTime() - from.getTime() <= 366 * 24 * 60 * 60 * 1000;
    },
    {
      message: "El reporte no puede abarcar más de 366 días.",
      path: ["to"],
    },
  );

export type ReportFilter = z.infer<typeof reportFilterSchema>;
