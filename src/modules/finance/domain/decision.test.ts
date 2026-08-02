import { describe, expect, it } from "vitest";
import { calculateDecisionVariance } from "./decision";

describe("calculateDecisionVariance", () => {
  it("indica cuánto quedó el saldo real por encima de lo esperado", () => {
    expect(calculateDecisionVariance(800_000, 950_000)).toBe(150_000);
  });

  it("devuelve una variación negativa cuando el resultado fue menor", () => {
    expect(calculateDecisionVariance(800_000, 700_000)).toBe(-100_000);
  });
});
