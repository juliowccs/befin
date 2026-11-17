import { describe, expect, it } from "vitest";
import { computeAnalytics } from "../analytics";
import type { EnvelopeRecord, TransactionRecord } from "../ledger";

const ENVELOPES: EnvelopeRecord[] = [
  {
    id: "env-food",
    name: "Mercado",
    color: "mint",
    icon: "ShoppingCart",
    is_emergency_fund: false,
    updated_at: 1,
    deleted_at: null,
  },
  {
    id: "env-fun",
    name: "Lazer",
    color: "peach",
    icon: "Sparkle",
    is_emergency_fund: false,
    updated_at: 1,
    deleted_at: null,
  },
];

const TRANSACTIONS: TransactionRecord[] = [
  {
    id: "t1",
    type: "INCOME",
    amount_cents: 500000, // R$ 5.000,00
    description: "Salário Outubro",
    date: "2026-10-05",
    payment_method: "PIX_DEBIT",
    status: "PAID",
    from_envelope_id: null,
    to_envelope_id: null,
    third_party_id: null,
    bank_id: null,
    updated_at: 1,
    deleted_at: null,
  },
  {
    id: "t2",
    type: "EXPENSE",
    amount_cents: 120000, // R$ 1.200,00
    description: "Supermercado",
    date: "2026-10-10",
    payment_method: "PIX_DEBIT",
    status: "PAID",
    from_envelope_id: "env-food",
    to_envelope_id: null,
    third_party_id: null,
    bank_id: null,
    updated_at: 2,
    deleted_at: null,
  },
  {
    id: "t3",
    type: "EXPENSE",
    amount_cents: 80000, // R$ 800,00
    description: "Jantar",
    date: "2026-11-06",
    payment_method: "CREDIT",
    status: "PENDING",
    from_envelope_id: "env-fun",
    to_envelope_id: null,
    third_party_id: null,
    bank_id: null,
    updated_at: 3,
    deleted_at: null,
  },
  {
    id: "t4",
    type: "EXPENSE",
    amount_cents: 95000, // R$ 950,00 — compra de terceiro NÃO entra como gasto da usuária
    description: "Farmácia Mãe",
    date: "2026-11-07",
    payment_method: "CREDIT",
    status: "PENDING",
    from_envelope_id: null,
    to_envelope_id: null,
    third_party_id: "tp-mae",
    bank_id: null,
    updated_at: 4,
    deleted_at: null,
  },
];

describe("computeAnalytics", () => {
  const refDate = new Date("2026-11-17T12:00:00");

  it("calculates KPIs in integer cents and excludes third-party expenses", () => {
    const summary = computeAnalytics(TRANSACTIONS, ENVELOPES, "ALL", refDate);

    expect(summary.totalIncomeCents).toBe(500000);
    expect(summary.totalExpenseCents).toBe(200000);
    expect(summary.netBalanceCents).toBe(300000);
    expect(summary.savingsRatePercent).toBe(60);
    expect(summary.pixDebitExpenseCents).toBe(120000);
    expect(summary.creditExpenseCents).toBe(80000);
    expect(summary.creditSharePercent).toBe(40);
    expect(summary.averageTicketCents).toBe(100000);
    expect(summary.expenseCount).toBe(2);
  });

  it("groups monthly series with cumulative net balance", () => {
    const summary = computeAnalytics(TRANSACTIONS, ENVELOPES, "ALL", refDate);

    expect(summary.monthlySeries).toHaveLength(2);
    expect(summary.monthlySeries[0]).toMatchObject({
      month: "2026-10",
      incomeCents: 500000,
      expenseCents: 120000,
      netCents: 380000,
      cumulativeNetCents: 380000,
    });
    expect(summary.monthlySeries[1]).toMatchObject({
      month: "2026-11",
      incomeCents: 0,
      expenseCents: 80000,
      netCents: -80000,
      cumulativeNetCents: 300000,
    });
  });

  it("breaks down spending by envelope and filters by 1M period", () => {
    const allSummary = computeAnalytics(TRANSACTIONS, ENVELOPES, "ALL", refDate);
    expect(allSummary.byEnvelope).toHaveLength(2);
    expect(allSummary.byEnvelope[0]?.name).toBe("Mercado");
    expect(allSummary.byEnvelope[0]?.percentage).toBe(60);

    const oneMonthSummary = computeAnalytics(
      TRANSACTIONS,
      ENVELOPES,
      "1M",
      refDate,
    );
    expect(oneMonthSummary.totalExpenseCents).toBe(80000);
    expect(oneMonthSummary.totalIncomeCents).toBe(0);
    expect(oneMonthSummary.topExpenses).toHaveLength(1);
  });
});
