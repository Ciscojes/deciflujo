import { DatabaseSync } from "node:sqlite";
import { Pool } from "pg";
import { betterAuth } from "better-auth";
import { organization } from "better-auth/plugins";
import {
  deciflujoAccessControl,
  deciflujoRoles,
} from "./src/lib/access-control";

// Configuración exclusiva para `better-auth migrate`. Mantiene el mismo
// esquema de identidad que la aplicación sin cargar correo, auditoría ni APIs.
const databaseUrl = process.env.DATABASE_URL ?? "";
const postgres =
  process.env.DATABASE_PROVIDER === "postgres" ||
  databaseUrl.startsWith("postgres://") ||
  databaseUrl.startsWith("postgresql://");

if (postgres && !databaseUrl) {
  throw new Error("DATABASE_URL es obligatoria al migrar PostgreSQL.");
}

export const auth = betterAuth({
  appName: "Deciflujo",
  baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
  secret:
    process.env.BETTER_AUTH_SECRET ??
    "deciflujo-schema-generation-secret-at-least-32-characters",
  database: postgres
    ? new Pool({ connectionString: databaseUrl })
    : new DatabaseSync(
        process.env.AUTH_DATABASE_PATH ?? "finanzas-pyme.db",
      ),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
    resetPasswordTokenExpiresIn: 60 * 60,
    revokeSessionsOnPasswordReset: true,
  },
  plugins: [
    organization({
      allowUserToCreateOrganization: true,
      ac: deciflujoAccessControl,
      roles: deciflujoRoles,
    }),
  ],
});
