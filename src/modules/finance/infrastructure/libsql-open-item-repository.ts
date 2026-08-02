import "server-only";

import type { DatabaseValue } from "./database-client";
import type {
  OpenItemRepository,
  PayOpenItemResult,
} from "../application/ports/open-item-repository";
import type { PayOpenItemInput } from "../application/open-item-input";
import {
  resolveOpenItemStatus,
  type NewOpenItem,
  type OpenItem,
  type OpenItemKind,
  type StoredOpenItemStatus,
} from "../domain/open-item";
import { getFinanceDatabase } from "./libsql-database";

function mapRow(row: Record<string, DatabaseValue>): OpenItem {
  const storedStatus = String(row.status) as StoredOpenItemStatus;
  const dueOn = String(row.due_on);
  return {
    id: String(row.id),
    kind: String(row.kind) as OpenItemKind,
    counterpartyName: String(row.counterparty_name),
    concept: String(row.concept),
    amountCents: Number(row.amount_cents),
    dueOn,
    status: resolveOpenItemStatus(storedStatus, dueOn),
    paidAt: row.paid_at === null ? null : String(row.paid_at),
    paymentTransactionId:
      row.payment_transaction_id === null
        ? null
        : String(row.payment_transaction_id),
    createdAt: String(row.created_at),
  };
}

export class LibsqlOpenItemRepository implements OpenItemRepository {
  constructor(private readonly organizationId: string) {}

  async list(): Promise<OpenItem[]> {
    const database = await getFinanceDatabase();
    const result = await database.execute({
      sql: `
        SELECT *
        FROM open_items
        WHERE organization_id = ?
        ORDER BY
          CASE status WHEN 'pending' THEN 0 ELSE 1 END,
          due_on,
          created_at DESC
      `,
      args: [this.organizationId],
    });
    return result.rows.map((row) => mapRow(row));
  }

  async create(item: NewOpenItem): Promise<OpenItem> {
    const database = await getFinanceDatabase();
    const entity: OpenItem = {
      ...item,
      id: crypto.randomUUID(),
      status: resolveOpenItemStatus("pending", item.dueOn),
      paidAt: null,
      paymentTransactionId: null,
      createdAt: new Date().toISOString(),
    };
    await database.execute({
      sql: `
        INSERT INTO open_items (
          id, organization_id, kind, counterparty_name, concept,
          amount_cents, due_on, status, paid_at,
          payment_transaction_id, created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', NULL, NULL, ?)
      `,
      args: [
        entity.id,
        this.organizationId,
        entity.kind,
        entity.counterpartyName,
        entity.concept,
        entity.amountCents,
        entity.dueOn,
        entity.createdAt,
      ],
    });
    return entity;
  }

  async pay(id: string, input: PayOpenItemInput): Promise<PayOpenItemResult> {
    const database = await getFinanceDatabase();
    const transaction = await database.transaction("write");
    try {
      const itemResult = await transaction.execute({
        sql: "SELECT * FROM open_items WHERE id = ? AND organization_id = ?",
        args: [id, this.organizationId],
      });
      const row = itemResult.rows[0];
      if (!row) return { outcome: "not_found" };
      if (String(row.status) === "paid") return { outcome: "already_paid" };

      const accountResult = await transaction.execute({
        sql: "SELECT 1 FROM accounts WHERE id = ? AND organization_id = ?",
        args: [input.accountId, this.organizationId],
      });
      if (accountResult.rows.length === 0) {
        return { outcome: "account_not_found" };
      }

      const transactionId = crypto.randomUUID();
      const paidAt = new Date().toISOString();
      const kind = String(row.kind) as OpenItemKind;
      const concept = String(row.concept);
      const counterpartyName = String(row.counterparty_name);

      try {
        await transaction.batch([
        {
          sql: `
            INSERT INTO transactions (
              id, description, amount_cents, type, category, account_id,
              occurred_on, created_at, organization_id
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `,
          args: [
            transactionId,
            `${concept} — ${counterpartyName}`,
            Number(row.amount_cents),
            kind === "receivable" ? "income" : "expense",
            kind === "receivable" ? "Ventas" : "Operación",
            input.accountId,
            input.paidOn,
            paidAt,
            this.organizationId,
          ],
        },
        {
          sql: `
            UPDATE open_items
            SET status = 'paid', paid_at = ?, payment_transaction_id = ?
            WHERE id = ? AND organization_id = ? AND status = 'pending'
          `,
          args: [paidAt, transactionId, id, this.organizationId],
        },
        ]);
      } catch (error) {
        if (error instanceof Error && error.message.includes("MONTH_CLOSED")) {
          await transaction.rollback();
          return { outcome: "month_closed" };
        }
        throw error;
      }
      await transaction.commit();

      return {
        outcome: "paid",
        item: mapRow({
          ...row,
          status: "paid",
          paid_at: paidAt,
          payment_transaction_id: transactionId,
        }),
      };
    } finally {
      transaction.close();
    }
  }
}
