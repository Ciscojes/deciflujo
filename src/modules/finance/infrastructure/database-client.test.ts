import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { toPostgresPlaceholders } from "./database-client";

describe("adaptador SQL para PostgreSQL", () => {
  it("convierte parámetros posicionales sin tocar signos dentro de texto", () => {
    expect(
      toPostgresPlaceholders(
        "SELECT '?' AS literal FROM movements WHERE id = ? AND note = 'it''s ?' AND month = ?",
      ),
    ).toBe(
      "SELECT '?' AS literal FROM movements WHERE id = $1 AND note = 'it''s ?' AND month = $2",
    );
  });
});
