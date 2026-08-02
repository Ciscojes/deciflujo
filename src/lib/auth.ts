import "server-only";

import { DatabaseSync } from "node:sqlite";
import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { organization } from "better-auth/plugins";
import { getPostgresPool, usesPostgres } from "@/lib/postgres";
import {
  deciflujoAccessControl,
  deciflujoRoles,
} from "@/lib/access-control";
import { recordAuditEvent } from "@/lib/audit";
import {
  sendInvitationEmail,
  sendPasswordResetEmail,
} from "@/lib/email";

const databasePath =
  process.env.AUTH_DATABASE_PATH ?? "finanzas-pyme.db";
const authDatabase = usesPostgres()
  ? getPostgresPool()
  : new DatabaseSync(databasePath);
const secret =
  process.env.BETTER_AUTH_SECRET ??
  (process.env.NODE_ENV === "production"
    ? undefined
    : "deciflujo-local-development-secret-change-before-production");

if (!secret) {
  throw new Error("BETTER_AUTH_SECRET es obligatorio en producción.");
}

export const auth = betterAuth({
  appName: "Deciflujo",
  baseURL: process.env.BETTER_AUTH_URL,
  secret,
  database: authDatabase,
  trustedOrigins: process.env.BETTER_AUTH_URL
    ? [process.env.BETTER_AUTH_URL]
    : ["http://localhost:3000"],
  rateLimit: {
    enabled: true,
    window: 60,
    max: 100,
    customRules: {
      "/sign-in/email": { window: 60, max: 10 },
      "/sign-up/email": { window: 60, max: 5 },
      "/request-password-reset": { window: 300, max: 5 },
      "/reset-password": { window: 300, max: 10 },
    },
  },
  advanced: {
    useSecureCookies: process.env.NODE_ENV === "production",
  },
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
    resetPasswordTokenExpiresIn: 60 * 60,
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, url, token }) => {
      await sendPasswordResetEmail({
        to: user.email,
        userName: user.name,
        resetUrl: url,
        token,
      });
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
  },
  plugins: [
    organization({
      allowUserToCreateOrganization: true,
      ac: deciflujoAccessControl,
      roles: deciflujoRoles,
      sendInvitationEmail: async ({
        id,
        email,
        organization: invitedOrganization,
        inviter,
        invitation,
      }) => {
        const baseUrl = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";
        const invitationUrl = new URL("/accept-invitation", baseUrl);
        invitationUrl.searchParams.set("id", id);
        await sendInvitationEmail({
          to: email,
          inviterName: inviter.user.name,
          organizationName: invitedOrganization.name,
          invitationUrl: invitationUrl.toString(),
          invitationId: id,
          deliveryKey: String(new Date(invitation.expiresAt).getTime()),
        });
      },
      organizationHooks: {
        afterCreateInvitation: async ({
          invitation,
          inviter,
          organization,
        }) => {
          await recordAuditEvent(
            {
              organizationId: organization.id,
              userId: inviter.id,
              userName: inviter.name,
            },
            {
              action: "invitation.created",
              entityType: "invitation",
              entityId: invitation.id,
              summary: `Invitó a ${invitation.email}.`,
              metadata: {
                email: invitation.email,
                role: invitation.role,
              },
            },
          );
        },
        afterAcceptInvitation: async ({
          invitation,
          user,
          organization,
        }) => {
          await recordAuditEvent(
            {
              organizationId: organization.id,
              userId: user.id,
              userName: user.name,
            },
            {
              action: "invitation.accepted",
              entityType: "invitation",
              entityId: invitation.id,
              summary: `${user.name} aceptó la invitación.`,
              metadata: {
                email: invitation.email,
                role: invitation.role,
              },
            },
          );
        },
        afterCancelInvitation: async ({
          invitation,
          cancelledBy,
          organization,
        }) => {
          await recordAuditEvent(
            {
              organizationId: organization.id,
              userId: cancelledBy.id,
              userName: cancelledBy.name,
            },
            {
              action: "invitation.cancelled",
              entityType: "invitation",
              entityId: invitation.id,
              summary: `Canceló la invitación de ${invitation.email}.`,
              metadata: {
                email: invitation.email,
                role: invitation.role,
              },
            },
          );
        },
      },
    }),
    nextCookies(),
  ],
});
