import { describe, expect, it } from "vitest";
import {
  type EnvelopeRecord,
  type ThirdPartyRecord,
  type TransactionRecord,
  calculateLedgerSnapshot,
  calculateReconciliation,
  createDistributionTransfers,
  settleTransactions,
} from "@/lib/ledger";

const BASE_TIME = 1_700_000_000_000;

const envelopes: EnvelopeRecord[] = [
  {
    id: "env-emergency",
    name: "Reserva de Emergência",
    color: "mint",
    icon: "ShieldCheck",
    is_emergency_fund: true,
    updated_at: BASE_TIME,
    deleted_at: null,
  },
  {
    id: "env-essentials",
    name: "Essenciais",
    color: "lavender",
    icon: "House",
    is_emergency_fund: false,
    updated_at: BASE_TIME,
    deleted_at: null,
  },
  {
    id: "env-leisure",
    name: "Lazer",
    color: "peach",
    icon: "Sparkle",
    is_emergency_fund: false,
    updated_at: BASE_TIME,
    deleted_at: null,
  },
];

const thirdParties: ThirdPartyRecord[] = [
  { id: "tp-1", name: "Pessoa A", updated_at: BASE_TIME, deleted_at: null },
  { id: "tp-2", name: "Pessoa B", updated_at: BASE_TIME, deleted_at: null },
];

function makeTx(
  overrides: Partial<TransactionRecord> & Pick<TransactionRecord, "id" | "type" | "amount_cents">
): TransactionRecord {
  return {
    description: "Teste",
    date: "2026-11-16",
    payment_method: "PIX_DEBIT",
    status: "PAID",
    from_envelope_id: null,
    to_envelope_id: null,
    third_party_id: null,
    bank_id: null,
    updated_at: BASE_TIME,
    deleted_at: null,
    ...overrides,
  };
}

describe("ledger domain rules", () => {
  it("routes INCOME with to_envelope_id = null to Free Balance and preserves wealth on distribution (R$ and %)", () => {
    const initialTxs: TransactionRecord[] = [
      makeTx({
        id: "tx-1",
        type: "INCOME",
        amount_cents: 100000, // R$ 1.000,00
        to_envelope_id: null,
      }),
    ];

    const snapBefore = calculateLedgerSnapshot(initialTxs, envelopes, thirdParties);
    expect(snapBefore.freeBalanceCents).toBe(100000);
    expect(snapBefore.totalEnvelopesCents).toBe(0);

    // Distribute 60% / 40% via PERCENTAGE mode
    const pctTransfers = createDistributionTransfers({
      freeBalanceCents: snapBefore.freeBalanceCents,
      mode: "PERCENTAGE",
      allocations: [
        { envelopeId: "env-emergency", value: 60 },
        { envelopeId: "env-essentials", value: 40 },
      ],
    });

    const txsAfterPct: TransactionRecord[] = [
      ...initialTxs,
      ...pctTransfers.map((item, idx) =>
        makeTx({ ...item, id: `dist-pct-${idx}` })
      ),
    ];

    const snapAfterPct = calculateLedgerSnapshot(txsAfterPct, envelopes, thirdParties);
    expect(snapAfterPct.freeBalanceCents).toBe(0);
    expect(snapAfterPct.envelopeBalances["env-emergency"]).toBe(60000);
    expect(snapAfterPct.envelopeBalances["env-essentials"]).toBe(40000);
    expect(snapAfterPct.totalEnvelopesCents + snapAfterPct.freeBalanceCents).toBe(100000);

    // Also test FIXED mode partial distribution
    const fixedTransfers = createDistributionTransfers({
      freeBalanceCents: 100000,
      mode: "FIXED",
      allocations: [{ envelopeId: "env-leisure", value: 25000 }],
    });
    const txsAfterFixed: TransactionRecord[] = [
      ...initialTxs,
      ...fixedTransfers.map((item, idx) =>
        makeTx({ ...item, id: `dist-fixed-${idx}` })
      ),
    ];
    const snapAfterFixed = calculateLedgerSnapshot(txsAfterFixed, envelopes, thirdParties);
    expect(snapAfterFixed.freeBalanceCents).toBe(75000);
    expect(snapAfterFixed.envelopeBalances["env-leisure"]).toBe(25000);
    expect(snapAfterFixed.totalEnvelopesCents + snapAfterFixed.freeBalanceCents).toBe(100000);
  });

  it("moves balances between envelopes on TRANSFER while keeping total wealth constant", () => {
    const txs: TransactionRecord[] = [
      makeTx({ id: "tx-1", type: "INCOME", amount_cents: 50000, to_envelope_id: "env-essentials" }),
      makeTx({ id: "tx-2", type: "INCOME", amount_cents: 30000, to_envelope_id: "env-leisure" }),
      makeTx({
        id: "tx-3",
        type: "TRANSFER",
        amount_cents: 12000,
        from_envelope_id: "env-essentials",
        to_envelope_id: "env-emergency",
      }),
      // Soft-deleted transfer must be ignored
      makeTx({
        id: "tx-deleted",
        type: "TRANSFER",
        amount_cents: 5000,
        from_envelope_id: "env-leisure",
        to_envelope_id: "env-emergency",
        deleted_at: BASE_TIME + 100,
      }),
    ];

    const snap = calculateLedgerSnapshot(txs, envelopes, thirdParties);
    expect(snap.envelopeBalances["env-essentials"]).toBe(38000);
    expect(snap.envelopeBalances["env-emergency"]).toBe(12000);
    expect(snap.envelopeBalances["env-leisure"]).toBe(30000);
    expect(snap.totalEnvelopesCents).toBe(80000);
  });

  it("abates envelope immediately on CREDIT PENDING expense and settles PENDING -> PAID without double-deducting", () => {
    const txs: TransactionRecord[] = [
      makeTx({ id: "tx-inc", type: "INCOME", amount_cents: 100000, to_envelope_id: "env-essentials" }),
      makeTx({
        id: "tx-credit-1",
        type: "EXPENSE",
        amount_cents: 15000,
        payment_method: "CREDIT",
        status: "PENDING",
        from_envelope_id: "env-essentials",
      }),
      makeTx({
        id: "tx-credit-2",
        type: "EXPENSE",
        amount_cents: 5000,
        payment_method: "CREDIT",
        status: "PENDING",
        from_envelope_id: "env-essentials",
      }),
    ];

    const beforeSettle = calculateLedgerSnapshot(txs, envelopes, thirdParties);
    expect(beforeSettle.envelopeBalances["env-essentials"]).toBe(80000);
    expect(beforeSettle.creditPayableCents).toBe(20000);
    // Physical bank still holds all R$ 1.000,00 until invoice is paid
    expect(beforeSettle.expectedBankBalanceCents).toBe(100000);

    // Batch settle both PENDING transactions
    const settledTxs = settleTransactions(txs, ["tx-credit-1", "tx-credit-2"], BASE_TIME + 500);
    const afterSettle = calculateLedgerSnapshot(settledTxs, envelopes, thirdParties);

    // Envelope remains 80000 (no double deduction), Credit Payable drops to 0
    expect(afterSettle.envelopeBalances["env-essentials"]).toBe(80000);
    expect(afterSettle.creditPayableCents).toBe(0);
    expect(afterSettle.expectedBankBalanceCents).toBe(80000);
  });

  it("never deducts user envelopes for third-party purchases and groups receivables by third_party_id", () => {
    const txs: TransactionRecord[] = [
      makeTx({ id: "tx-inc", type: "INCOME", amount_cents: 100000, to_envelope_id: "env-essentials" }),
      makeTx({
        id: "tx-tp-1",
        type: "EXPENSE",
        amount_cents: 14500,
        payment_method: "CREDIT",
        status: "PENDING",
        from_envelope_id: "env-essentials", // even if passed, third_party_id prevents deduction
        third_party_id: "tp-1",
      }),
      makeTx({
        id: "tx-tp-2",
        type: "EXPENSE",
        amount_cents: 5500,
        payment_method: "PIX_DEBIT",
        status: "PENDING",
        from_envelope_id: null,
        third_party_id: "tp-1",
      }),
      makeTx({
        id: "tx-tp-3",
        type: "EXPENSE",
        amount_cents: 8000,
        payment_method: "CREDIT",
        status: "PENDING",
        from_envelope_id: null,
        third_party_id: "tp-2",
      }),
    ];

    const snap = calculateLedgerSnapshot(txs, envelopes, thirdParties);
    expect(snap.envelopeBalances["env-essentials"]).toBe(100000);
    expect(snap.freeBalanceCents).toBe(0);
    expect(snap.creditPayableCents).toBe(0);
    expect(snap.receivablesByThirdParty["tp-1"]).toBe(20000);
    expect(snap.receivablesByThirdParty["tp-2"]).toBe(8000);
    expect(snap.thirdPartyReceivableCents).toBe(28000);
    // Equation of truth: 100000 + 0 + 0 - 28000 = 72000
    expect(snap.expectedBankBalanceCents).toBe(72000);
  });

  it("computes the Equation of Truth and handles positive/negative reconciliation discrepancies safely", () => {
    const txs: TransactionRecord[] = [
      makeTx({ id: "tx-free", type: "INCOME", amount_cents: 20000, to_envelope_id: null }),
      makeTx({ id: "tx-env", type: "INCOME", amount_cents: 80000, to_envelope_id: "env-essentials" }),
      makeTx({
        id: "tx-cred",
        type: "EXPENSE",
        amount_cents: 10000,
        payment_method: "CREDIT",
        status: "PENDING",
        from_envelope_id: "env-essentials",
      }),
      makeTx({
        id: "tx-tp",
        type: "EXPENSE",
        amount_cents: 5000,
        payment_method: "PIX_DEBIT",
        status: "PENDING",
        third_party_id: "tp-1",
      }),
    ];

    const snap = calculateLedgerSnapshot(txs, envelopes, thirdParties);
    // Envelopes = 70000, Free = 20000, CreditPayable = 10000, Receivable = 5000
    // Expected = 70000 + 20000 + 10000 - 5000 = 95000
    expect(snap.expectedBankBalanceCents).toBe(95000);

    // Positive discrepancy compatible with informed bank yields -> suggests Emergency Fund
    const surplusResult = calculateReconciliation({
      expectedCents: snap.expectedBankBalanceCents,
      actualCents: 97500, // +2500 surplus
      yieldCents: 2500,
      envelopes,
    });
    expect(surplusResult.status).toBe("SURPLUS");
    expect(surplusResult.discrepancyCents).toBe(2500);
    expect(surplusResult.isYieldCompatible).toBe(true);
    expect(surplusResult.suggestsEmergencyFundTransfer).toBe(true);
    expect(surplusResult.emergencyEnvelopeId).toBe("env-emergency");

    // Negative discrepancy -> DEFICIT, NO automatic adjustment allowed
    const deficitResult = calculateReconciliation({
      expectedCents: snap.expectedBankBalanceCents,
      actualCents: 91000, // -4000 missing
      yieldCents: 0,
      envelopes,
    });
    expect(deficitResult.status).toBe("DEFICIT");
    expect(deficitResult.discrepancyCents).toBe(-4000);
    expect(deficitResult.suggestsEmergencyFundTransfer).toBe(false);
    expect(deficitResult.autoAdjustmentAllowed).toBe(false);

    // Exact match -> MATCHED
    const matchedResult = calculateReconciliation({
      expectedCents: snap.expectedBankBalanceCents,
      actualCents: 95000,
      yieldCents: 0,
      envelopes,
    });
    expect(matchedResult.status).toBe("MATCHED");
    expect(matchedResult.discrepancyCents).toBe(0);
    expect(matchedResult.suggestsEmergencyFundTransfer).toBe(false);
  });

  it("rejects distributions exceeding freeBalanceCents and clears third-party receivables on settle", () => {
    expect(() =>
      createDistributionTransfers({
        freeBalanceCents: 10000,
        mode: "FIXED",
        allocations: [{ envelopeId: "env-essentials", value: 15000 }],
      })
    ).toThrow();

    const txs: TransactionRecord[] = [
      makeTx({
        id: "tx-tp",
        type: "EXPENSE",
        amount_cents: 12000,
        payment_method: "CREDIT",
        status: "PENDING",
        third_party_id: "tp-1",
      }),
    ];
    const settled = settleTransactions(txs, ["tx-tp"], BASE_TIME + 200);
    const snap = calculateLedgerSnapshot(settled, envelopes, thirdParties);
    expect(snap.receivablesByThirdParty["tp-1"]).toBe(0);
    expect(snap.thirdPartyReceivableCents).toBe(0);
  });
});
