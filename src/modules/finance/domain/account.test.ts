import { describe, expect, it } from "vitest";
import { calculateAccountBalance } from "./account";

describe("calculateAccountBalance", () => {
  it("suma ingresos y resta egresos del saldo inicial", () => {
    const balance = calculateAccountBalance(50_000, [
      { type: "income", amountCents: 100_000 },
      { type: "expense", amountCents: 30_000 },
    ]);

    expect(balance).toBe(120_000);
  });
});
