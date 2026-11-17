import { distributeByPercentages } from "./money";

export type TransactionType = "INCOME" | "EXPENSE" | "TRANSFER";
export type PaymentMethod = "PIX_DEBIT" | "CREDIT";
export type TransactionStatus = "PAID" | "PENDING";
export type EnvelopeColor =
  | "lavender"
  | "mint"
  | "peach"
  | "sky"
  | "butter"
  | "blush";

export interface BankRecord {
  id: string;
  name: string;
  balance_cents: number;
  updated_at: number;
  deleted_at?: number | null;
}

export interface EnvelopeRecord {
  id: string;
  name: string;
  color: EnvelopeColor;
  icon: string;
  is_emergency_fund: boolean;
  updated_at: number;
  deleted_at?: number | null;
}

export interface ThirdPartyRecord {
  id: string;
  name: string;
  updated_at: number;
  deleted_at?: number | null;
}

export interface TransactionRecord {
  id: string;
  type: TransactionType;
  amount_cents: number;
  description: string;
  date: string;
  payment_method: PaymentMethod;
  status: TransactionStatus;
  from_envelope_id: string | null;
  to_envelope_id: string | null;
  third_party_id: string | null;
  bank_id: string | null;
  updated_at: number;
  deleted_at?: number | null;
}

export interface ReconciliationRecord {
  id: string;
  date: string;
  expected_cents: number;
  actual_cents: number;
  yield_cents: number;
  discrepancy_cents: number;
  notes: string;
  updated_at: number;
  deleted_at?: number | null;
}

export interface LedgerSnapshot {
  freeBalanceCents: number;
  envelopeBalances: Record<string, number>;
  totalEnvelopesCents: number;
  creditPayableCents: number;
  receivablesByThirdParty: Record<string, number>;
  thirdPartyReceivableCents: number;
  expectedBankBalanceCents: number;
}

export interface ReconciliationResult {
  expectedCents: number;
  actualCents: number;
  yieldCents: number;
  discrepancyCents: number;
  status: "MATCHED" | "SURPLUS" | "DEFICIT";
  isYieldCompatible: boolean;
  suggestsEmergencyFundTransfer: boolean;
  emergencyEnvelopeId: string | null;
  autoAdjustmentAllowed: false;
}

export interface DistributionAllocation {
  envelopeId: string;
  value: number;
}

export type NewTransactionInput = Omit<
  TransactionRecord,
  "id" | "updated_at" | "deleted_at"
>;

/**
 * Returns true if a local-first record has not been soft-deleted.
 */
export function isActive<T extends { deleted_at?: number | null }>(
  record: T
): boolean {
  return record.deleted_at == null;
}

/**
 * Computes the complete ledger snapshot strictly in integer cents.
 */
export function calculateLedgerSnapshot(
  transactions: TransactionRecord[],
  envelopes: EnvelopeRecord[],
  thirdParties: ThirdPartyRecord[] = []
): LedgerSnapshot {
  const activeEnvelopes = envelopes.filter(isActive);
  const activeThirdParties = thirdParties.filter(isActive);
  const activeTransactions = transactions.filter(isActive);

  let freeBalanceCents = 0;
  let creditPayableCents = 0;
  let thirdPartyReceivableCents = 0;

  const envelopeBalances: Record<string, number> = {};
  for (const env of activeEnvelopes) {
    envelopeBalances[env.id] = 0;
  }

  const receivablesByThirdParty: Record<string, number> = {};
  for (const tp of activeThirdParties) {
    receivablesByThirdParty[tp.id] = 0;
  }

  for (const tx of activeTransactions) {
    const amount = Math.trunc(tx.amount_cents);

    if (tx.type === "INCOME") {
      if (tx.to_envelope_id == null) {
        freeBalanceCents += amount;
      } else {
        envelopeBalances[tx.to_envelope_id] =
          (envelopeBalances[tx.to_envelope_id] ?? 0) + amount;
      }
      continue;
    }

    if (tx.type === "TRANSFER") {
      if (tx.from_envelope_id == null) {
        freeBalanceCents -= amount;
      } else {
        envelopeBalances[tx.from_envelope_id] =
          (envelopeBalances[tx.from_envelope_id] ?? 0) - amount;
      }

      if (tx.to_envelope_id == null) {
        freeBalanceCents += amount;
      } else {
        envelopeBalances[tx.to_envelope_id] =
          (envelopeBalances[tx.to_envelope_id] ?? 0) + amount;
      }
      continue;
    }

    if (tx.type === "EXPENSE") {
      if (tx.third_party_id != null) {
        // Third-party expenses NEVER reduce user envelopes or Free Balance
        if (tx.status === "PENDING") {
          receivablesByThirdParty[tx.third_party_id] =
            (receivablesByThirdParty[tx.third_party_id] ?? 0) + amount;
          thirdPartyReceivableCents += amount;
        }
        continue;
      }

      if (tx.from_envelope_id == null) {
        freeBalanceCents -= amount;
      } else {
        envelopeBalances[tx.from_envelope_id] =
          (envelopeBalances[tx.from_envelope_id] ?? 0) - amount;
      }

      if (tx.payment_method === "CREDIT" && tx.status === "PENDING") {
        creditPayableCents += amount;
      }
    }
  }

  const totalEnvelopesCents = activeEnvelopes.reduce(
    (sum, env) => sum + (envelopeBalances[env.id] ?? 0),
    0
  );

  // Equation of Truth:
  // Expected = Sum(Envelopes) + FreeBalance + CreditPayable(User) - CreditReceivable(ThirdParties)
  const expectedBankBalanceCents =
    totalEnvelopesCents +
    freeBalanceCents +
    creditPayableCents -
    thirdPartyReceivableCents;

  return {
    freeBalanceCents,
    envelopeBalances,
    totalEnvelopesCents,
    creditPayableCents,
    receivablesByThirdParty,
    thirdPartyReceivableCents,
    expectedBankBalanceCents,
  };
}

/**
 * Evaluates the bank reconciliation discrepancy and determines whether a surplus
 * can be routed to the Emergency Fund envelope. Never creates auto-adjustments on deficit.
 */
export function calculateReconciliation(params: {
  expectedCents: number;
  actualCents: number;
  yieldCents?: number;
  envelopes?: EnvelopeRecord[];
}): ReconciliationResult {
  const expectedCents = Math.trunc(params.expectedCents);
  const actualCents = Math.trunc(params.actualCents);
  const yieldCents = Math.max(0, Math.trunc(params.yieldCents ?? 0));
  const discrepancyCents = actualCents - expectedCents;

  const status: ReconciliationResult["status"] =
    discrepancyCents === 0
      ? "MATCHED"
      : discrepancyCents > 0
        ? "SURPLUS"
        : "DEFICIT";

  const emergencyEnvelope = params.envelopes?.find(
    (env) => isActive(env) && Boolean(env.is_emergency_fund)
  );

  const isYieldCompatible =
    discrepancyCents > 0 && yieldCents > 0 && discrepancyCents <= yieldCents;

  const suggestsEmergencyFundTransfer =
    discrepancyCents > 0 &&
    Boolean(emergencyEnvelope) &&
    (yieldCents === 0 || isYieldCompatible);

  return {
    expectedCents,
    actualCents,
    yieldCents,
    discrepancyCents,
    status,
    isYieldCompatible,
    suggestsEmergencyFundTransfer,
    emergencyEnvelopeId: emergencyEnvelope?.id ?? null,
    autoAdjustmentAllowed: false,
  };
}

/**
 * Generates TRANSFER transactions from Free Balance (`from_envelope_id = null`)
 * to target envelopes in either FIXED (cents) or PERCENTAGE mode.
 */
export function createDistributionTransfers(params: {
  freeBalanceCents: number;
  mode: "FIXED" | "PERCENTAGE";
  allocations: DistributionAllocation[];
  date?: string;
  envelopeNames?: Record<string, string>;
}): NewTransactionInput[] {
  const { freeBalanceCents, mode, allocations, envelopeNames } = params;
  const date = params.date ?? new Date().toISOString().slice(0, 10);

  if (!Number.isInteger(freeBalanceCents) || freeBalanceCents < 0) {
    throw new Error("Saldo Livre deve ser não-negativo para distribuição.");
  }

  const validAllocations = allocations.filter(
    (item) => item.envelopeId && item.value > 0
  );
  if (validAllocations.length === 0) {
    return [];
  }

  let amounts: number[];
  if (mode === "FIXED") {
    amounts = validAllocations.map((item) => {
      if (!Number.isInteger(item.value) || item.value < 0) {
        throw new Error("Valores de distribuição fixa devem ser centavos inteiros.");
      }
      return item.value;
    });
    const totalAllocated = amounts.reduce((sum, val) => sum + val, 0);
    if (totalAllocated > freeBalanceCents) {
      throw new Error("Distribuição excede o Saldo Livre disponível.");
    }
  } else {
    const percentages = validAllocations.map((item) => item.value);
    amounts = distributeByPercentages(freeBalanceCents, percentages);
  }

  return validAllocations
    .map((item, idx) => ({
      type: "TRANSFER" as const,
      amount_cents: amounts[idx],
      description: envelopeNames?.[item.envelopeId]
        ? `Distribuição para ${envelopeNames[item.envelopeId]}`
        : "Distribuição do Saldo Livre",
      date,
      payment_method: "PIX_DEBIT" as const,
      status: "PAID" as const,
      from_envelope_id: null,
      to_envelope_id: item.envelopeId,
      third_party_id: null,
      bank_id: null,
    }))
    .filter((tx) => tx.amount_cents > 0);
}

/**
 * Pure helper that returns an updated transaction list settling PENDING items to PAID
 * without duplicating or re-applying envelope deductions.
 */
export function settleTransactions(
  transactions: TransactionRecord[],
  transactionIds?: string[],
  now: number = Date.now()
): TransactionRecord[] {
  const targetIds = transactionIds ? new Set(transactionIds) : null;

  return transactions.map((tx) => {
    if (!isActive(tx) || tx.status !== "PENDING") {
      return tx;
    }
    if (targetIds && !targetIds.has(tx.id)) {
      return tx;
    }
    return {
      ...tx,
      status: "PAID",
      updated_at: now,
    };
  });
}
