import type { AccountRepository } from "../ports/account-repository";
import type { DecisionRepository } from "../ports/decision-repository";

export async function reviewDueDecisions(
  decisionRepository: DecisionRepository,
  accountRepository: AccountRepository,
  now = new Date(),
) {
  const today = now.toISOString().slice(0, 10);
  const decisions = await decisionRepository.list();
  const due = decisions.filter(
    (decision) => decision.status === "planned" && decision.reviewOn <= today,
  );
  if (due.length === 0) return [];

  const accounts = await accountRepository.list();
  const actualBalanceCents = accounts.reduce(
    (total, account) => total + account.balanceCents,
    0,
  );
  const reviewedAt = now.toISOString();
  const reviewed = [];

  for (const decision of due) {
    const result = await decisionRepository.review(
      decision.id,
      actualBalanceCents,
      reviewedAt,
    );
    if (result) reviewed.push(result);
  }

  return reviewed;
}
