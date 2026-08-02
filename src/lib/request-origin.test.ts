import { describe, expect, it } from "vitest";
import { hasTrustedMutationOrigin } from "./request-origin";

describe("hasTrustedMutationOrigin", () => {
  it("permite lecturas sin encabezado Origin", () => {
    const request = new Request("https://app.deciflujo.test/api/decisions");
    expect(hasTrustedMutationOrigin(request, "https://app.deciflujo.test")).toBe(true);
  });

  it("permite mutaciones del origen configurado", () => {
    const request = new Request("https://app.deciflujo.test/api/decisions", {
      method: "POST",
      headers: { origin: "https://app.deciflujo.test" },
    });
    expect(hasTrustedMutationOrigin(request, "https://app.deciflujo.test")).toBe(true);
  });

  it("rechaza mutaciones sin origen o desde otro sitio", () => {
    const missing = new Request("https://app.deciflujo.test/api/decisions", { method: "POST" });
    const foreign = new Request("https://app.deciflujo.test/api/decisions", {
      method: "DELETE",
      headers: { origin: "https://malicioso.test" },
    });

    expect(hasTrustedMutationOrigin(missing, "https://app.deciflujo.test")).toBe(false);
    expect(hasTrustedMutationOrigin(foreign, "https://app.deciflujo.test")).toBe(false);
  });
});
