import { z } from "zod";
import type { AccountRepository } from "../ports/account-repository";
import type { DecisionRepository } from "../ports/decision-repository";

const decisionIdSchema = z.uuid("El identificador de la decisión no es válido.");

export class DecisionNotFoundError extends Error {
  constructor() {
    super("La decisión solicitada no existe.");
    this.name = "DecisionNotFoundError";
  }
}

export async function reviewDecision(
  decisionRepository: DecisionRepository,
  accountRepository: AccountRepository,
  decisionId: string,
) {
  const id = decisionIdSchema.parse(decisionId);
  const accounts = await accountRepository.list();
  const actualBalanceCents = accounts.reduce(
    (total, account) => total + account.balanceCents,
    0,
  );
  const reviewed = await decisionRepository.review(
    id,
    actualBalanceCents,
    new Date().toISOString(),
  );

  if (!reviewed) {
    throw new DecisionNotFoundError();
  }

  return reviewed;
}
