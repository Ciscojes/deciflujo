import "server-only";
import { logError, logWarning } from "./logger";

type TransactionalEmail = {
  to: string;
  subject: string;
  html: string;
  text: string;
  idempotencyKey: string;
};

type EmailContent = Pick<TransactionalEmail, "subject" | "html" | "text">;

export class TransactionalEmailError extends Error {
  constructor() {
    super("No fue posible entregar el correo transaccional.");
    this.name = "TransactionalEmailError";
  }
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>'"]/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "'": "&#39;",
      '"': "&quot;",
    };
    return entities[character];
  });
}

function sanitizeSubjectValue(value: string): string {
  return value.replace(/[\r\n]+/g, " ").trim().slice(0, 120);
}

function emailShell(content: string): string {
  return `<!doctype html>
<html lang="es">
  <body style="margin:0;background:#f7f8fa;font-family:Arial,sans-serif;color:#18212f">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:32px 16px">
      <tr><td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border:1px solid #dce3ec;border-radius:16px;padding:32px">
          <tr><td>
            <p style="margin:0 0 24px;font-size:20px;font-weight:700;color:#183153">Deciflujo</p>
            ${content}
            <p style="margin:28px 0 0;color:#7b8696;font-size:12px;line-height:18px">Este es un mensaje automático de seguridad. No respondas a este correo.</p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;
}

function actionButton(label: string, url: string): string {
  const safeUrl = escapeHtml(url);
  return `<p style="margin:28px 0"><a href="${safeUrl}" style="display:inline-block;background:#183153;color:#ffffff;text-decoration:none;padding:13px 20px;border-radius:10px;font-weight:600">${escapeHtml(label)}</a></p>`;
}

export function renderPasswordResetEmail(input: {
  userName: string;
  resetUrl: string;
}): EmailContent {
  const name = escapeHtml(input.userName);
  return {
    subject: "Restablece tu contraseña de Deciflujo",
    html: emailShell(`
      <h1 style="margin:0 0 16px;font-size:26px">Restablece tu contraseña</h1>
      <p style="margin:0;color:#586677;line-height:24px">Hola, ${name}. Recibimos una solicitud para cambiar tu contraseña.</p>
      ${actionButton("Crear una contraseña nueva", input.resetUrl)}
      <p style="margin:0;color:#586677;line-height:24px">El enlace vence en una hora. Si no solicitaste este cambio, puedes ignorar el mensaje.</p>
    `),
    text: `Hola, ${input.userName}.\n\nAbre este enlace para restablecer tu contraseña de Deciflujo:\n${input.resetUrl}\n\nEl enlace vence en una hora. Si no solicitaste este cambio, ignora el mensaje.`,
  };
}

export function renderInvitationEmail(input: {
  inviterName: string;
  organizationName: string;
  invitationUrl: string;
}): EmailContent {
  const inviter = escapeHtml(input.inviterName);
  const organization = escapeHtml(input.organizationName);
  return {
    subject: `${sanitizeSubjectValue(input.inviterName)} te invitó a ${sanitizeSubjectValue(
      input.organizationName,
    )} en Deciflujo`,
    html: emailShell(`
      <h1 style="margin:0 0 16px;font-size:26px">Invitación a ${organization}</h1>
      <p style="margin:0;color:#586677;line-height:24px">${inviter} te invitó a colaborar en el espacio financiero de ${organization}.</p>
      ${actionButton("Aceptar invitación", input.invitationUrl)}
      <p style="margin:0;color:#586677;line-height:24px">Inicia sesión o crea tu cuenta con el mismo correo que recibió esta invitación.</p>
    `),
    text: `${input.inviterName} te invitó a colaborar en ${input.organizationName} dentro de Deciflujo.\n\nAcepta la invitación aquí:\n${input.invitationUrl}\n\nUsa el mismo correo que recibió este mensaje.`,
  };
}

export async function sendTransactionalEmail(
  email: TransactionalEmail,
): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !from) {
    throw new TransactionalEmailError();
  }

  const payload: Record<string, unknown> = {
    from,
    to: [email.to],
    subject: email.subject,
    html: email.html,
    text: email.text,
    tags: [{ name: "application", value: "deciflujo" }],
  };
  if (process.env.RESEND_REPLY_TO) {
    payload.reply_to = process.env.RESEND_REPLY_TO;
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": email.idempotencyKey,
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) {
      logWarning("email.resend_rejected", {
        status: response.status,
        providerResponse: (await response.text()).slice(0, 500),
      });
      throw new TransactionalEmailError();
    }
  } catch (error) {
    if (error instanceof TransactionalEmailError) throw error;
    logError("email.resend_unreachable", error);
    throw new TransactionalEmailError();
  }
}

export async function sendPasswordResetEmail(input: {
  to: string;
  userName: string;
  resetUrl: string;
  token: string;
}): Promise<void> {
  if (
    (!process.env.RESEND_API_KEY || !process.env.RESEND_FROM_EMAIL) &&
    process.env.NODE_ENV !== "production"
  ) {
    console.info("[Deciflujo] Vista previa del enlace de recuperación:", input.resetUrl);
    return;
  }
  await sendTransactionalEmail({
    to: input.to,
    ...renderPasswordResetEmail(input),
    idempotencyKey: `password-reset-${input.token}`,
  });
}

export async function sendInvitationEmail(input: {
  to: string;
  inviterName: string;
  organizationName: string;
  invitationUrl: string;
  invitationId: string;
  deliveryKey: string;
}): Promise<void> {
  if (
    (!process.env.RESEND_API_KEY || !process.env.RESEND_FROM_EMAIL) &&
    process.env.NODE_ENV !== "production"
  ) {
    console.info("[Deciflujo] Vista previa del enlace de invitación:", input.invitationUrl);
    return;
  }
  await sendTransactionalEmail({
    to: input.to,
    ...renderInvitationEmail(input),
    idempotencyKey: `invitation-${input.invitationId}-${input.deliveryKey}`,
  });
}
