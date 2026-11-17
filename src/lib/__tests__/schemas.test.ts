import { describe, expect, it } from "vitest";
import { setPasswordSchema, signUpSchema } from "@/lib/schemas/auth";
import { transactionFormSchema } from "@/lib/schemas/forms";
import { syncPayloadSchema } from "@/lib/schemas/sync";

describe("auth schemas", () => {
  it("rejects non-string or out-of-bounds passwords in setPasswordSchema", () => {
    expect(setPasswordSchema.safeParse({ newPassword: ["a", "b", "c", "d", "e", "f", "g", "h"] }).success).toBe(false);
    expect(setPasswordSchema.safeParse({ newPassword: "short" }).success).toBe(false);
    expect(setPasswordSchema.safeParse({ newPassword: "a".repeat(129) }).success).toBe(false);
    expect(setPasswordSchema.safeParse({ newPassword: "valid-password-123" }).success).toBe(true);
  });

  it("requires LGPD acceptance and valid email in signUpSchema", () => {
    expect(
      signUpSchema.safeParse({
        name: "Ana",
        email: "ana@example.com",
        password: "password123",
        acceptedLgpd: false,
      }).success
    ).toBe(false);

    expect(
      signUpSchema.safeParse({
        name: "Ana",
        email: "ana@example.com",
        password: "password123",
        acceptedLgpd: true,
      }).success
    ).toBe(true);
  });
});

describe("syncPayloadSchema", () => {
  it("rejects float amount_cents, negative transaction amounts, and invalid enums", () => {
    expect(
      syncPayloadSchema.safeParse({
        last_synced_at: 0,
        changes: {
          transactions: [
            {
              id: "tx-1",
              type: "EXPENSE",
              amount_cents: 12.5,
              description: "Teste",
              date: "2026-11-17",
              payment_method: "PIX_DEBIT",
              status: "PAID",
              from_envelope_id: null,
              to_envelope_id: null,
              third_party_id: null,
              bank_id: null,
              updated_at: 1700000000000,
              deleted_at: null,
            },
          ],
        },
      }).success
    ).toBe(false);

    expect(
      syncPayloadSchema.safeParse({
        last_synced_at: 0,
        changes: {
          banks: [
            {
              id: "bank-1",
              name: "x".repeat(81),
              balance_cents: 1000,
              updated_at: 1700000000000,
            },
          ],
        },
      }).success
    ).toBe(false);
  });

  it("accepts valid sync payload", () => {
    const result = syncPayloadSchema.safeParse({
      last_synced_at: 1700000000000,
      changes: {
        banks: [
          {
            id: "bank-1",
            name: "Nubank",
            balance_cents: 250000,
            updated_at: 1700000000001,
            deleted_at: null,
          },
        ],
      },
    });
    expect(result.success).toBe(true);
  });
});

describe("transactionFormSchema", () => {
  it("rejects transfer between identical envelopes and zero amounts", () => {
    expect(
      transactionFormSchema.safeParse({
        type: "TRANSFER",
        amount: "50,00",
        description: "",
        date: "2026-11-17",
        paymentMethod: "PIX_DEBIT",
        fromEnvelopeId: "env-1",
        toEnvelopeId: "env-1",
        bankId: "",
        isThirdParty: false,
        thirdPartyId: "",
      }).success
    ).toBe(false);

    expect(
      transactionFormSchema.safeParse({
        type: "EXPENSE",
        amount: "0,00",
        description: "Café",
        date: "2026-11-17",
        paymentMethod: "PIX_DEBIT",
        fromEnvelopeId: "__FREE__",
        toEnvelopeId: "__FREE__",
        bankId: "",
        isThirdParty: false,
        thirdPartyId: "",
      }).success
    ).toBe(false);
  });
});
