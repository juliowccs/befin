import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const banks = sqliteTable(
  "banks",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    balance_cents: integer("balance_cents").notNull(),
    updated_at: integer("updated_at").notNull(),
    deleted_at: integer("deleted_at"),
  },
  (t) => [index("banks_updated_at_idx").on(t.updated_at)],
);

export const envelopes = sqliteTable(
  "envelopes",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    color: text("color").notNull(),
    icon: text("icon").notNull(),
    is_emergency_fund: integer("is_emergency_fund", { mode: "boolean" })
      .notNull()
      .default(false),
    updated_at: integer("updated_at").notNull(),
    deleted_at: integer("deleted_at"),
  },
  (t) => [index("envelopes_updated_at_idx").on(t.updated_at)],
);

export const thirdParties = sqliteTable(
  "third_parties",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    updated_at: integer("updated_at").notNull(),
    deleted_at: integer("deleted_at"),
  },
  (t) => [index("third_parties_updated_at_idx").on(t.updated_at)],
);

export const transactions = sqliteTable(
  "transactions",
  {
    id: text("id").primaryKey(),
    type: text("type", { enum: ["INCOME", "EXPENSE", "TRANSFER"] }).notNull(),
    amount_cents: integer("amount_cents").notNull(),
    description: text("description").notNull(),
    date: text("date").notNull(),
    payment_method: text("payment_method", {
      enum: ["PIX_DEBIT", "CREDIT"],
    }).notNull(),
    status: text("status", { enum: ["PAID", "PENDING"] }).notNull(),
    from_envelope_id: text("from_envelope_id"),
    to_envelope_id: text("to_envelope_id"),
    third_party_id: text("third_party_id"),
    bank_id: text("bank_id"),
    updated_at: integer("updated_at").notNull(),
    deleted_at: integer("deleted_at"),
  },
  (t) => [index("transactions_updated_at_idx").on(t.updated_at)],
);

export const reconciliations = sqliteTable(
  "reconciliations",
  {
    id: text("id").primaryKey(),
    date: text("date").notNull(),
    expected_cents: integer("expected_cents").notNull(),
    actual_cents: integer("actual_cents").notNull(),
    yield_cents: integer("yield_cents").notNull(),
    discrepancy_cents: integer("discrepancy_cents").notNull(),
    notes: text("notes"),
    updated_at: integer("updated_at").notNull(),
    deleted_at: integer("deleted_at"),
  },
  (t) => [index("reconciliations_updated_at_idx").on(t.updated_at)],
);
