import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

/* ── Better Auth Core Tables ─────────────────────────────────── */

export const user = sqliteTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: integer("email_verified", { mode: "boolean" })
    .notNull()
    .default(false),
  image: text("image"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
});

export const session = sqliteTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    token: text("token").notNull().unique(),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (t) => [index("session_user_id_idx").on(t.userId)],
);

export const account = sqliteTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: integer("access_token_expires_at", {
      mode: "timestamp_ms",
    }),
    refreshTokenExpiresAt: integer("refresh_token_expires_at", {
      mode: "timestamp_ms",
    }),
    scope: text("scope"),
    password: text("password"),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  },
  (t) => [index("account_user_id_idx").on(t.userId)],
);

export const verification = sqliteTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" }),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }),
  },
  (t) => [index("verification_identifier_idx").on(t.identifier)],
);

/* ── Domain Sync Tables (Multi-Tenant via user_id) ───────────── */

export const banks = sqliteTable(
  "banks",
  {
    id: text("id").primaryKey(),
    user_id: text("user_id").notNull(),
    name: text("name").notNull(),
    balance_cents: integer("balance_cents").notNull(),
    updated_at: integer("updated_at").notNull(),
    deleted_at: integer("deleted_at"),
  },
  (t) => [
    index("banks_updated_at_idx").on(t.updated_at),
    index("banks_user_updated_idx").on(t.user_id, t.updated_at),
  ],
);

export const envelopes = sqliteTable(
  "envelopes",
  {
    id: text("id").primaryKey(),
    user_id: text("user_id").notNull(),
    name: text("name").notNull(),
    color: text("color").notNull(),
    icon: text("icon").notNull(),
    is_emergency_fund: integer("is_emergency_fund", { mode: "boolean" })
      .notNull()
      .default(false),
    updated_at: integer("updated_at").notNull(),
    deleted_at: integer("deleted_at"),
  },
  (t) => [
    index("envelopes_updated_at_idx").on(t.updated_at),
    index("envelopes_user_updated_idx").on(t.user_id, t.updated_at),
  ],
);

export const thirdParties = sqliteTable(
  "third_parties",
  {
    id: text("id").primaryKey(),
    user_id: text("user_id").notNull(),
    name: text("name").notNull(),
    updated_at: integer("updated_at").notNull(),
    deleted_at: integer("deleted_at"),
  },
  (t) => [
    index("third_parties_updated_at_idx").on(t.updated_at),
    index("third_parties_user_updated_idx").on(t.user_id, t.updated_at),
  ],
);

export const transactions = sqliteTable(
  "transactions",
  {
    id: text("id").primaryKey(),
    user_id: text("user_id").notNull(),
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
  (t) => [
    index("transactions_updated_at_idx").on(t.updated_at),
    index("transactions_user_updated_idx").on(t.user_id, t.updated_at),
  ],
);

export const reconciliations = sqliteTable(
  "reconciliations",
  {
    id: text("id").primaryKey(),
    user_id: text("user_id").notNull(),
    date: text("date").notNull(),
    expected_cents: integer("expected_cents").notNull(),
    actual_cents: integer("actual_cents").notNull(),
    yield_cents: integer("yield_cents").notNull(),
    discrepancy_cents: integer("discrepancy_cents").notNull(),
    notes: text("notes"),
    updated_at: integer("updated_at").notNull(),
    deleted_at: integer("deleted_at"),
  },
  (t) => [
    index("reconciliations_updated_at_idx").on(t.updated_at),
    index("reconciliations_user_updated_idx").on(t.user_id, t.updated_at),
  ],
);
