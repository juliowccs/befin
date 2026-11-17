import { z } from "zod";

const MAX_SYNC_BATCH = 5000;
const MAX_CENTS = 100_000_000_000; // R$ 1 bilhão em centavos
const MIN_CENTS = -100_000_000_000;

const recordIdSchema = z.string().trim().min(1).max(128);
const nullableIdSchema = recordIdSchema.nullable().optional();
const timestampSchema = z.number().int().nonnegative().max(9_999_999_999_999);
const nullableTimestampSchema = timestampSchema.nullable().optional();
const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Data deve estar no formato YYYY-MM-DD.");
const centsSchema = z.number().int().min(MIN_CENTS).max(MAX_CENTS);

export const envelopeColorSchema = z.enum([
  "lavender",
  "mint",
  "peach",
  "sky",
  "butter",
  "blush",
]);

export const transactionTypeSchema = z.enum(["INCOME", "EXPENSE", "TRANSFER"]);
export const paymentMethodSchema = z.enum(["PIX_DEBIT", "CREDIT"]);
export const transactionStatusSchema = z.enum(["PAID", "PENDING"]);

export const bankSyncRecordSchema = z.object({
  id: recordIdSchema,
  name: z.string().trim().min(1).max(80),
  balance_cents: centsSchema,
  updated_at: timestampSchema,
  deleted_at: nullableTimestampSchema,
});

export const envelopeSyncRecordSchema = z.object({
  id: recordIdSchema,
  name: z.string().trim().min(1).max(80),
  color: envelopeColorSchema,
  icon: z.string().trim().min(1).max(40),
  is_emergency_fund: z.boolean(),
  updated_at: timestampSchema,
  deleted_at: nullableTimestampSchema,
});

export const thirdPartySyncRecordSchema = z.object({
  id: recordIdSchema,
  name: z.string().trim().min(1).max(80),
  updated_at: timestampSchema,
  deleted_at: nullableTimestampSchema,
});

export const transactionSyncRecordSchema = z.object({
  id: recordIdSchema,
  type: transactionTypeSchema,
  amount_cents: z.number().int().positive().max(MAX_CENTS),
  description: z.string().trim().max(200),
  date: isoDateSchema,
  payment_method: paymentMethodSchema,
  status: transactionStatusSchema,
  from_envelope_id: nullableIdSchema,
  to_envelope_id: nullableIdSchema,
  third_party_id: nullableIdSchema,
  bank_id: nullableIdSchema,
  updated_at: timestampSchema,
  deleted_at: nullableTimestampSchema,
});

export const reconciliationSyncRecordSchema = z.object({
  id: recordIdSchema,
  date: isoDateSchema,
  expected_cents: centsSchema,
  actual_cents: centsSchema,
  yield_cents: z.number().int().nonnegative().max(MAX_CENTS),
  discrepancy_cents: centsSchema,
  notes: z.string().max(500).nullable().optional(),
  updated_at: timestampSchema,
  deleted_at: nullableTimestampSchema,
});

export const syncPayloadSchema = z.object({
  last_synced_at: z.number().int().nonnegative().max(9_999_999_999_999).optional().default(0),
  changes: z
    .object({
      banks: z.array(bankSyncRecordSchema).max(MAX_SYNC_BATCH).optional(),
      envelopes: z.array(envelopeSyncRecordSchema).max(MAX_SYNC_BATCH).optional(),
      third_parties: z
        .array(thirdPartySyncRecordSchema)
        .max(MAX_SYNC_BATCH)
        .optional(),
      transactions: z
        .array(transactionSyncRecordSchema)
        .max(MAX_SYNC_BATCH)
        .optional(),
      reconciliations: z
        .array(reconciliationSyncRecordSchema)
        .max(MAX_SYNC_BATCH)
        .optional(),
    })
    .optional()
    .default({}),
});

export type ValidatedSyncPayload = z.infer<typeof syncPayloadSchema>;
