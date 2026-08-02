import "server-only";

import { Pool } from "pg";

const globalPostgres = globalThis as typeof globalThis & {
  deciflujoPostgresPool?: Pool;
};

export function usesPostgres(): boolean {
  const url = process.env.DATABASE_URL ?? "";
  return (
    process.env.DATABASE_PROVIDER === "postgres" ||
    url.startsWith("postgres://") ||
    url.startsWith("postgresql://")
  );
}

export function getPostgresPool(): Pool {
  if (!usesPostgres()) {
    throw new Error("PostgreSQL no está habilitado para esta ejecución.");
  }
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL es obligatoria al usar PostgreSQL.");
  }

  const pool =
    globalPostgres.deciflujoPostgresPool ??
    new Pool({
      connectionString,
      max: Number(process.env.DATABASE_POOL_MAX ?? 10),
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
    });

  if (process.env.NODE_ENV !== "production") {
    globalPostgres.deciflujoPostgresPool = pool;
  }
  return pool;
}
