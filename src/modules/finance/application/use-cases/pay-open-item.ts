import { z } from "zod";
import {
  payOpenItemInputSchema,
  type PayOpenItemInput,
} from "../open-item-input";
import type { OpenItemRepository } from "../ports/open-item-repository";
import { MonthClosedError } from "../../domain/monthly-close";

export class OpenItemNotFoundError extends Error {
  constructor() {
    super("La cuenta pendiente no existe.");
    this.name = "OpenItemNotFoundError";
  }
}

export class OpenItemAlreadyPaidError extends Error {
  constructor() {
    super("La cuenta pendiente ya fue pagada.");
    this.name = "OpenItemAlreadyPaidError";
  }
}

export class PaymentAccountNotFoundError extends Error {
  constructor() {
    super("La cuenta financiera seleccionada no existe.");
    this.name = "PaymentAccountNotFoundError";
  }
}

export async function payOpenItem(
  repository: OpenItemRepository,
  id: string,
  input: PayOpenItemInput,
) {
  const validId = z.uuid().parse(id);
  const payment = payOpenItemInputSchema.parse(input);
  const result = await repository.pay(validId, payment);

  if (result.outcome === "not_found") throw new OpenItemNotFoundError();
  if (result.outcome === "already_paid") throw new OpenItemAlreadyPaidError();
  if (result.outcome === "account_not_found") {
    throw new PaymentAccountNotFoundError();
  }
  if (result.outcome === "month_closed") throw new MonthClosedError();
  return result.item;
}
