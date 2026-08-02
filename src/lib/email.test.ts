import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  renderInvitationEmail,
  renderPasswordResetEmail,
  sendTransactionalEmail,
  TransactionalEmailError,
} from "./email";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  delete process.env.RESEND_API_KEY;
  delete process.env.RESEND_FROM_EMAIL;
  delete process.env.RESEND_REPLY_TO;
});

describe("correos transaccionales", () => {
  it("escapa contenido de usuario y conserva el enlace seguro", () => {
    const content = renderPasswordResetEmail({
      userName: "<Jesús & asociados>",
      resetUrl: "https://deciflujo.test/reset?token=abc&next=1",
    });
    expect(content.html).toContain("&lt;Jesús &amp; asociados&gt;");
    expect(content.html).toContain("token=abc&amp;next=1");
    expect(content.html).not.toContain("<Jesús & asociados>");
  });

  it("crea una invitación con versión HTML y texto", () => {
    const content = renderInvitationEmail({
      inviterName: "Ana",
      organizationName: "Empresa Uno",
      invitationUrl: "https://deciflujo.test/accept-invitation?id=1",
    });
    expect(content.subject).toContain("Empresa Uno");
    expect(content.html).toContain("Aceptar invitación");
    expect(content.text).toContain("accept-invitation?id=1");
  });

  it("envía a la API de Resend con autenticación e idempotencia", async () => {
    process.env.RESEND_API_KEY = "re_test_key";
    process.env.RESEND_FROM_EMAIL = "Deciflujo <no-reply@deciflujo.test>";
    process.env.RESEND_REPLY_TO = "soporte@deciflujo.test";
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await sendTransactionalEmail({
      to: "persona@example.com",
      subject: "Prueba",
      html: "<p>Hola</p>",
      text: "Hola",
      idempotencyKey: "email-test-1",
    });

    expect(fetchMock).toHaveBeenCalledOnce();
    const [, request] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(request.headers).toMatchObject({
      Authorization: "Bearer re_test_key",
      "Idempotency-Key": "email-test-1",
    });
    expect(JSON.parse(String(request.body))).toMatchObject({
      from: "Deciflujo <no-reply@deciflujo.test>",
      to: ["persona@example.com"],
      reply_to: "soporte@deciflujo.test",
    });
  });

  it("falla de forma explícita cuando falta la configuración", async () => {
    await expect(
      sendTransactionalEmail({
        to: "persona@example.com",
        subject: "Prueba",
        html: "<p>Hola</p>",
        text: "Hola",
        idempotencyKey: "email-test-2",
      }),
    ).rejects.toBeInstanceOf(TransactionalEmailError);
  });
});
