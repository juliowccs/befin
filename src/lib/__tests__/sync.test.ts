import { describe, expect, it } from "vitest";
import type {
  BankRecord,
  EnvelopeRecord,
  ReconciliationRecord,
  ThirdPartyRecord,
  TransactionRecord,
} from "@/lib/ledger";
import { syncPayloadSchema } from "@/lib/schemas/sync";
import {
  applyRemoteChangesToDb,
  collectLocalChanges,
  type SyncDatabaseLike,
  type SyncTableLike,
} from "@/lib/sync";

function createMemoryTable<TRecord extends { id: string }>(
  initial: TRecord[] = [],
): SyncTableLike<TRecord> {
  const store = new Map<string, TRecord>(initial.map((r) => [r.id, r]));
  return {
    async toArray() {
      return Array.from(store.values());
    },
    async get(key: string) {
      return store.get(key);
    },
    async put(item: TRecord) {
      store.set(item.id, item);
      return item.id;
    },
  };
}

function createMemoryDatabase(seed?: {
  banks?: BankRecord[];
  envelopes?: EnvelopeRecord[];
  third_parties?: ThirdPartyRecord[];
  transactions?: TransactionRecord[];
  reconciliations?: ReconciliationRecord[];
}): SyncDatabaseLike {
  return {
    banks: createMemoryTable<BankRecord>(seed?.banks),
    envelopes: createMemoryTable<EnvelopeRecord>(seed?.envelopes),
    third_parties: createMemoryTable<ThirdPartyRecord>(seed?.third_parties),
    transactions: createMemoryTable<TransactionRecord>(seed?.transactions),
    reconciliations: createMemoryTable<ReconciliationRecord>(
      seed?.reconciliations,
    ),
    async runInTransaction(fn) {
      return fn();
    },
  };
}

describe("Sync Engine: collectLocalChanges", () => {
  it("collects only records with updated_at > sinceTimestamp and normalizes fields for syncPayloadSchema", async () => {
    const db = createMemoryDatabase({
      banks: [
        {
          id: "bank-old",
          name: "Banco Antigo",
          balance_cents: 10000,
          updated_at: 1000,
          deleted_at: null,
        },
        {
          id: "bank-new",
          name: "  Nubank  ",
          balance_cents: 25000.9 as number,
          updated_at: 2000,
          deleted_at: undefined,
        },
      ],
      transactions: [
        {
          id: "tx-1",
          type: "EXPENSE",
          amount_cents: 4500,
          description: "  Mercado  ",
          date: "2026-11-17",
          payment_method: "PIX_DEBIT",
          status: "PAID",
          from_envelope_id: "env-1",
          to_envelope_id: null,
          third_party_id: null,
          bank_id: "bank-new",
          updated_at: 2500,
          deleted_at: undefined,
        },
      ],
      reconciliations: [
        {
          id: "rec-1",
          date: "2026-11-17",
          expected_cents: 50000,
          actual_cents: 50500,
          yield_cents: 500,
          discrepancy_cents: 500,
          notes: "",
          updated_at: 3000,
          deleted_at: null,
        },
      ],
    });

    const result = await collectLocalChanges(db, 1000);

    expect(result.totalCount).toBe(3);
    expect(result.maxUpdatedAt).toBe(3000);
    expect(result.hasMore).toBe(false);

    expect(result.changes.banks).toEqual([
      {
        id: "bank-new",
        name: "Nubank",
        balance_cents: 25000,
        updated_at: 2000,
        deleted_at: null,
      },
    ]);
    expect(result.changes.envelopes).toBeUndefined();
    expect(result.changes.transactions?.[0].description).toBe("Mercado");
    expect(result.changes.transactions?.[0].deleted_at).toBeNull();
    expect(result.changes.reconciliations?.[0].notes).toBeNull();

    const validation = syncPayloadSchema.safeParse({
      last_synced_at: 1000,
      changes: result.changes,
    });
    expect(validation.success).toBe(true);
  });
});

describe("Sync Engine: applyRemoteChangesToDb (Last-Write-Wins)", () => {
  it("inserts new remote records and strips user_id", async () => {
    const db = createMemoryDatabase();

    const { maxRemoteUpdatedAt, appliedCount } = await applyRemoteChangesToDb(
      db,
      {
        banks: [
          {
            id: "bank-remote-1",
            user_id: "user-123",
            name: "Inter",
            balance_cents: 120000,
            updated_at: 5000,
            deleted_at: null,
          },
        ],
        envelopes: [
          {
            id: "env-remote-1",
            user_id: "user-123",
            name: "Reserva",
            color: "mint",
            icon: "ShieldCheck",
            is_emergency_fund: true,
            updated_at: 5500,
            deleted_at: null,
          },
        ],
        reconciliations: [
          {
            id: "rec-remote-1",
            user_id: "user-123",
            date: "2026-11-17",
            expected_cents: 100000,
            actual_cents: 100000,
            yield_cents: 0,
            discrepancy_cents: 0,
            notes: null,
            updated_at: 5200,
            deleted_at: null,
          },
        ],
      },
    );

    expect(appliedCount).toBe(3);
    expect(maxRemoteUpdatedAt).toBe(5500);

    const savedBank = await db.banks.get("bank-remote-1");
    expect(savedBank).toEqual({
      id: "bank-remote-1",
      name: "Inter",
      balance_cents: 120000,
      updated_at: 5000,
      deleted_at: null,
    });
    expect("user_id" in (savedBank as unknown as Record<string, unknown>)).toBe(
      false,
    );

    const savedRec = await db.reconciliations.get("rec-remote-1");
    expect(savedRec?.notes).toBe("");
  });

  it("updates local record when remote.updated_at > local.updated_at and preserves local when local.updated_at >= remote.updated_at", async () => {
    const db = createMemoryDatabase({
      banks: [
        {
          id: "bank-newer-remote",
          name: "Nome Antigo",
          balance_cents: 1000,
          updated_at: 2000,
          deleted_at: null,
        },
        {
          id: "bank-newer-local",
          name: "Edição Local Recente",
          balance_cents: 9900,
          updated_at: 8000,
          deleted_at: null,
        },
        {
          id: "bank-equal-ts",
          name: "Mesmo Timestamp Local",
          balance_cents: 5000,
          updated_at: 6000,
          deleted_at: null,
        },
      ],
    });

    const { appliedCount } = await applyRemoteChangesToDb(db, {
      banks: [
        {
          id: "bank-newer-remote",
          user_id: "user-1",
          name: "Nome Atualizado Remoto",
          balance_cents: 4500,
          updated_at: 3000,
          deleted_at: null,
        },
        {
          id: "bank-newer-local",
          user_id: "user-1",
          name: "Versão Remota Velha",
          balance_cents: 1200,
          updated_at: 7000,
          deleted_at: null,
        },
        {
          id: "bank-equal-ts",
          user_id: "user-1",
          name: "Versão Remota Mesmo TS",
          balance_cents: 100,
          updated_at: 6000,
          deleted_at: null,
        },
      ],
    });

    expect(appliedCount).toBe(1);
    expect((await db.banks.get("bank-newer-remote"))?.name).toBe(
      "Nome Atualizado Remoto",
    );
    expect((await db.banks.get("bank-newer-local"))?.name).toBe(
      "Edição Local Recente",
    );
    expect((await db.banks.get("bank-equal-ts"))?.name).toBe(
      "Mesmo Timestamp Local",
    );
  });

  it("propagates soft deletion (deleted_at) when remote.updated_at > local.updated_at", async () => {
    const db = createMemoryDatabase({
      third_parties: [
        {
          id: "tp-1",
          name: "Mãe",
          updated_at: 4000,
          deleted_at: null,
        },
      ],
      transactions: [
        {
          id: "tx-1",
          type: "EXPENSE",
          amount_cents: 5000,
          description: "Farmácia",
          date: "2026-11-17",
          payment_method: "CREDIT",
          status: "PENDING",
          from_envelope_id: null,
          to_envelope_id: null,
          third_party_id: "tp-1",
          bank_id: null,
          updated_at: 9000,
          deleted_at: null,
        },
      ],
    });

    await applyRemoteChangesToDb(db, {
      third_parties: [
        {
          id: "tp-1",
          user_id: "user-1",
          name: "Mãe",
          updated_at: 5000,
          deleted_at: 5000,
        },
      ],
      transactions: [
        {
          id: "tx-1",
          user_id: "user-1",
          type: "EXPENSE",
          amount_cents: 5000,
          description: "Farmácia",
          date: "2026-11-17",
          payment_method: "CREDIT",
          status: "PENDING",
          from_envelope_id: null,
          to_envelope_id: null,
          third_party_id: "tp-1",
          bank_id: null,
          updated_at: 8500,
          deleted_at: 8500,
        },
      ],
    });

    expect((await db.third_parties.get("tp-1"))?.deleted_at).toBe(5000);
    // Local transaction is newer (9000 > 8500), so remote soft-delete does NOT overwrite it
    expect((await db.transactions.get("tx-1"))?.deleted_at).toBeNull();
  });
});
