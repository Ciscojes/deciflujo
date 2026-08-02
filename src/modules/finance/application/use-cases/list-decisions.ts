import type { DecisionRepository } from "../ports/decision-repository";

export async function listDecisions(repository: DecisionRepository) {
  return repository.list();
}
