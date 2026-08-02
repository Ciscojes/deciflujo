import { describe, expect, it } from "vitest";
import {
  FutureCloseMonthError,
  InvalidCloseMonthError,
  monthSequence,
  normalizeTrendWindow,
  validateCloseMonth,
} from "./monthly-close";

describe("cierres mensuales", () => {
  const now = new Date("2026-07-31T12:00:00.000Z");

  it("acepta el mes actual y meses anteriores", () => {
    expect(validateCloseMonth("2026-07", now)).toBe("2026-07");
    expect(validateCloseMonth("2025-12", now)).toBe("2025-12");
  });

  it("rechaza formatos inválidos y meses futuros", () => {
    expect(() => validateCloseMonth("2026-7", now)).toThrow(
      InvalidCloseMonthError,
    );
    expect(() => validateCloseMonth("2026-08", now)).toThrow(
      FutureCloseMonthError,
    );
  });

  it("genera una secuencia continua incluso al cambiar de año", () => {
    expect(monthSequence(3, new Date("2026-01-10T00:00:00.000Z"))).toEqual([
      "2025-11",
      "2025-12",
      "2026-01",
    ]);
  });

  it("limita la ventana entre 3 y 24 meses", () => {
    expect(normalizeTrendWindow(1)).toBe(3);
    expect(normalizeTrendWindow(50)).toBe(24);
    expect(normalizeTrendWindow(Number.NaN)).toBe(12);
  });
});
