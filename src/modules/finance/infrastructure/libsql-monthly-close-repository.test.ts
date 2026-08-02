import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { DatabaseClient } from "./database-client";
import type { MonthlyCloseRepository } from "../application/ports/monthly-close-repository";

vi.mock("server-only", () => ({}));

describe("cierres mensuales en libSQL", () => {
  let directory: string;
  let database: DatabaseClient;
  let repository: MonthlyCloseRepository;
  const organizationId = "org-integration-close";
  const accountId = "account-integration-close";
  const month = new Date().toISOString().slice(0, 7);

  beforeAll(async () => {
    directory = await mkdtemp(join(tmpdir(), "deciflujo-close-"));
    process.env.DATABASE_URL = `file:${join(directory, "test.db")}`;
    const databaseModule = await import("./libsql-database");
    const repositoryModule = await import("./libsql-monthly-close-repository");
    database = await databaseModule.getFinanceDatabase();
    repository = new repositoryModule.LibsqlMonthlyCloseRepository(
      organizationId,
    );
    await database.execute({
      sql: `
        INSERT INTO accounts (
          id, name, type, opening_balance_cents, created_at,
          organization_id, is_demo
        ) VALUES (?, 'Banco', 'bank', 100000, ?, ?, 0)
      `,
      args: [accountId, new Date().toISOString(), organizationId],
    });
    await database.execute({
      sql: `
        INSERT INTO transactions (
          id, description, amount_cents, type, category, account_id,
          occurred_on, created_at, organization_id, is_demo
        ) VALUES (?, 'Venta', 80000, 'income', 'Ventas', ?, ?, ?, ?, 0)
      `,
      args: [
        crypto.randomUUID(),
        accountId,
        `${month}-10`,
        new Date().toISOString(),
        organizationId,
      ],
    });
    await database.execute({
      sql: `
        INSERT INTO transactions (
          id, description, amount_cents, type, category, account_id,
          occurred_on, created_at, organization_id, is_demo
        ) VALUES (?, 'Operación', 30000, 'expense', 'Operación', ?, ?, ?, ?, 0)
      `,
      args: [
        crypto.randomUUID(),
        accountId,
        `${month}-12`,
        new Date().toISOString(),
        organizationId,
      ],
    });
  });

  afterAll(async () => {
    database?.close();
    delete process.env.DATABASE_URL;
    await rm(directory, { recursive: true, force: true });
  });

  it("migra, fotografía, bloquea y permite reabrir", async () => {
    const closed = await repository.close(month, {
      userId: "user-integration-close",
      userName: "Persona de prueba",
    });
    expect(closed).toMatchObject({
      month,
      incomeCents: 80_000,
      expenseCents: 30_000,
      netCashFlowCents: 50_000,
      openingBalanceCents: 100_000,
      closingBalanceCents: 150_000,
      transactionCount: 2,
    });

    await expect(
      database.execute({
        sql: `
          INSERT INTO transactions (
            id, description, amount_cents, type, category, account_id,
            occurred_on, created_at, organization_id, is_demo
          ) VALUES (?, 'Ajuste', 1000, 'income', 'Otros', ?, ?, ?, ?, 0)
        `,
        args: [
          crypto.randomUUID(),
          accountId,
          `${month}-20`,
          new Date().toISOString(),
          organizationId,
        ],
      }),
    ).rejects.toThrow("MONTH_CLOSED");

    expect(await repository.reopen(month)).toBe(true);
    await expect(
      database.execute({
        sql: `
          INSERT INTO transactions (
            id, description, amount_cents, type, category, account_id,
            occurred_on, created_at, organization_id, is_demo
          ) VALUES (?, 'Ajuste', 1000, 'income', 'Otros', ?, ?, ?, ?, 0)
        `,
        args: [
          crypto.randomUUID(),
          accountId,
          `${month}-20`,
          new Date().toISOString(),
          organizationId,
        ],
      }),
    ).resolves.toBeDefined();
  });
});
