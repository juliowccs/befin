"use client";

import { useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import {
  type BankRecord,
  type EnvelopeRecord,
  type LedgerSnapshot,
  type ReconciliationRecord,
  type ThirdPartyRecord,
  type TransactionRecord,
  calculateLedgerSnapshot,
  isActive,
} from "@/lib/ledger";

export interface BefinDataState {
  isLoading: boolean;
  banks: BankRecord[];
  envelopes: EnvelopeRecord[];
  thirdParties: ThirdPartyRecord[];
  transactions: TransactionRecord[];
  reconciliations: ReconciliationRecord[];
  snapshot: LedgerSnapshot;
}

const EMPTY_SNAPSHOT: LedgerSnapshot = {
  freeBalanceCents: 0,
  envelopeBalances: {},
  totalEnvelopesCents: 0,
  creditPayableCents: 0,
  receivablesByThirdParty: {},
  thirdPartyReceivableCents: 0,
  expectedBankBalanceCents: 0,
};

export function useBefinData(): BefinDataState {
  const rawBanks = useLiveQuery(() => db.banks.toArray(), [], undefined);
  const rawEnvelopes = useLiveQuery(() => db.envelopes.toArray(), [], undefined);
  const rawThirdParties = useLiveQuery(
    () => db.third_parties.toArray(),
    [],
    undefined
  );
  const rawTransactions = useLiveQuery(
    () => db.transactions.toArray(),
    [],
    undefined
  );
  const rawReconciliations = useLiveQuery(
    () => db.reconciliations.toArray(),
    [],
    undefined
  );

  const isLoading =
    rawBanks === undefined ||
    rawEnvelopes === undefined ||
    rawThirdParties === undefined ||
    rawTransactions === undefined ||
    rawReconciliations === undefined;

  return useMemo(() => {
    if (isLoading) {
      return {
        isLoading: true,
        banks: [],
        envelopes: [],
        thirdParties: [],
        transactions: [],
        reconciliations: [],
        snapshot: EMPTY_SNAPSHOT,
      };
    }

    const banks = rawBanks
      .filter(isActive)
      .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
    const envelopes = rawEnvelopes.filter(isActive).sort((a, b) => {
      if (a.is_emergency_fund !== b.is_emergency_fund) {
        return a.is_emergency_fund ? -1 : 1;
      }
      return a.name.localeCompare(b.name, "pt-BR");
    });
    const thirdParties = rawThirdParties
      .filter(isActive)
      .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
    const transactions = rawTransactions.filter(isActive).sort((a, b) => {
      if (b.date !== a.date) return b.date.localeCompare(a.date);
      return b.updated_at - a.updated_at;
    });
    const reconciliations = rawReconciliations
      .filter(isActive)
      .sort((a, b) => {
        if (b.date !== a.date) return b.date.localeCompare(a.date);
        return b.updated_at - a.updated_at;
      });

    const snapshot = calculateLedgerSnapshot(
      transactions,
      envelopes,
      thirdParties
    );

    return {
      isLoading: false,
      banks,
      envelopes,
      thirdParties,
      transactions,
      reconciliations,
      snapshot,
    };
  }, [
    isLoading,
    rawBanks,
    rawEnvelopes,
    rawThirdParties,
    rawTransactions,
    rawReconciliations,
  ]);
}
