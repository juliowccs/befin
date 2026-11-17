import Dexie, { type Table } from "dexie";
import { v7 as uuidv7 } from "uuid";
import {
  type BankRecord,
  type DistributionAllocation,
  type EnvelopeColor,
  type EnvelopeRecord,
  type NewTransactionInput,
  type ReconciliationRecord,
  type ThirdPartyRecord,
  type TransactionRecord,
  createDistributionTransfers,
  isActive,
} from "./ledger";

export class BefinDatabase extends Dexie {
  banks!: Table<BankRecord, string>;
  envelopes!: Table<EnvelopeRecord, string>;
  third_parties!: Table<ThirdPartyRecord, string>;
  transactions!: Table<TransactionRecord, string>;
  reconciliations!: Table<ReconciliationRecord, string>;

  constructor() {
    super("befin_local_db");
    this.version(1).stores({
      banks: "id, name, updated_at, deleted_at",
      envelopes: "id, name, is_emergency_fund, updated_at, deleted_at",
      third_parties: "id, name, updated_at, deleted_at",
      transactions:
        "id, type, date, status, payment_method, from_envelope_id, to_envelope_id, third_party_id, bank_id, updated_at, deleted_at",
      reconciliations: "id, date, updated_at, deleted_at",
    });
  }
}

export const db = new BefinDatabase();

export function generateId(): string {
  return uuidv7();
}

export function todayIsoDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/* ── Banks CRUD ──────────────────────────────────────────────── */

export async function addBank(input: {
  name: string;
  balance_cents: number;
}): Promise<BankRecord> {
  const record: BankRecord = {
    id: generateId(),
    name: input.name.trim(),
    balance_cents: Math.trunc(input.balance_cents),
    updated_at: Date.now(),
    deleted_at: null,
  };
  await db.banks.add(record);
  return record;
}

export async function updateBank(
  id: string,
  changes: Partial<Pick<BankRecord, "name" | "balance_cents">>
): Promise<void> {
  await db.banks.update(id, {
    ...changes,
    ...(changes.name !== undefined ? { name: changes.name.trim() } : {}),
    ...(changes.balance_cents !== undefined
      ? { balance_cents: Math.trunc(changes.balance_cents) }
      : {}),
    updated_at: Date.now(),
  });
}

export async function deleteBank(id: string): Promise<void> {
  const now = Date.now();
  await db.banks.update(id, { deleted_at: now, updated_at: now });
}

/* ── Envelopes CRUD ──────────────────────────────────────────── */

export async function addEnvelope(input: {
  name: string;
  color: EnvelopeColor;
  icon: string;
  is_emergency_fund?: boolean;
}): Promise<EnvelopeRecord> {
  const now = Date.now();
  const isEmergency = Boolean(input.is_emergency_fund);

  const record: EnvelopeRecord = {
    id: generateId(),
    name: input.name.trim(),
    color: input.color,
    icon: input.icon,
    is_emergency_fund: isEmergency,
    updated_at: now,
    deleted_at: null,
  };

  await db.transaction("rw", db.envelopes, async () => {
    if (isEmergency) {
      const existing = await db.envelopes.toArray();
      for (const env of existing) {
        if (isActive(env) && env.is_emergency_fund) {
          await db.envelopes.update(env.id, {
            is_emergency_fund: false,
            updated_at: now,
          });
        }
      }
    }
    await db.envelopes.add(record);
  });

  return record;
}

export async function updateEnvelope(
  id: string,
  changes: Partial<
    Pick<EnvelopeRecord, "name" | "color" | "icon" | "is_emergency_fund">
  >
): Promise<void> {
  const now = Date.now();
  await db.transaction("rw", db.envelopes, async () => {
    if (changes.is_emergency_fund) {
      const existing = await db.envelopes.toArray();
      for (const env of existing) {
        if (env.id !== id && isActive(env) && env.is_emergency_fund) {
          await db.envelopes.update(env.id, {
            is_emergency_fund: false,
            updated_at: now,
          });
        }
      }
    }
    await db.envelopes.update(id, {
      ...changes,
      ...(changes.name !== undefined ? { name: changes.name.trim() } : {}),
      updated_at: now,
    });
  });
}

export async function deleteEnvelope(id: string): Promise<void> {
  const now = Date.now();
  await db.envelopes.update(id, { deleted_at: now, updated_at: now });
}

/* ── Third Parties CRUD ──────────────────────────────────────── */

export async function addThirdParty(name: string): Promise<ThirdPartyRecord> {
  const record: ThirdPartyRecord = {
    id: generateId(),
    name: name.trim(),
    updated_at: Date.now(),
    deleted_at: null,
  };
  await db.third_parties.add(record);
  return record;
}

export async function updateThirdParty(
  id: string,
  name: string
): Promise<void> {
  await db.third_parties.update(id, {
    name: name.trim(),
    updated_at: Date.now(),
  });
}

export async function deleteThirdParty(id: string): Promise<void> {
  const now = Date.now();
  await db.third_parties.update(id, { deleted_at: now, updated_at: now });
}

/* ── Transactions & Batch Operations ─────────────────────────── */

export async function addTransaction(
  input: NewTransactionInput
): Promise<TransactionRecord> {
  const record: TransactionRecord = {
    ...input,
    id: generateId(),
    amount_cents: Math.trunc(input.amount_cents),
    description: input.description.trim(),
    updated_at: Date.now(),
    deleted_at: null,
  };
  await db.transactions.add(record);
  return record;
}

export async function addTransactionsBulk(
  inputs: NewTransactionInput[]
): Promise<TransactionRecord[]> {
  if (inputs.length === 0) return [];
  const now = Date.now();
  const records: TransactionRecord[] = inputs.map((input, idx) => ({
    ...input,
    id: generateId(),
    amount_cents: Math.trunc(input.amount_cents),
    description: input.description.trim(),
    updated_at: now + idx,
    deleted_at: null,
  }));
  await db.transactions.bulkAdd(records);
  return records;
}

export async function deleteTransaction(id: string): Promise<void> {
  const now = Date.now();
  await db.transactions.update(id, { deleted_at: now, updated_at: now });
}

export async function settleTransactionsInDb(
  transactionIds: string[]
): Promise<number> {
  if (transactionIds.length === 0) return 0;
  const now = Date.now();
  let updatedCount = 0;

  await db.transaction("rw", db.transactions, async () => {
    for (const id of transactionIds) {
      const tx = await db.transactions.get(id);
      if (tx && isActive(tx) && tx.status === "PENDING") {
        await db.transactions.update(id, {
          status: "PAID",
          updated_at: now,
        });
        updatedCount += 1;
      }
    }
  });

  return updatedCount;
}

export async function distributeFreeBalanceInDb(params: {
  freeBalanceCents: number;
  mode: "FIXED" | "PERCENTAGE";
  allocations: DistributionAllocation[];
  envelopeNames?: Record<string, string>;
}): Promise<TransactionRecord[]> {
  const transfers = createDistributionTransfers({
    freeBalanceCents: params.freeBalanceCents,
    mode: params.mode,
    allocations: params.allocations,
    date: todayIsoDate(),
    envelopeNames: params.envelopeNames,
  });

  return addTransactionsBulk(transfers);
}

/* ── Reconciliations ─────────────────────────────────────────── */

export async function saveReconciliationInDb(input: {
  date?: string;
  expected_cents: number;
  actual_cents: number;
  yield_cents: number;
  discrepancy_cents: number;
  notes?: string;
}): Promise<ReconciliationRecord> {
  const record: ReconciliationRecord = {
    id: generateId(),
    date: input.date ?? todayIsoDate(),
    expected_cents: Math.trunc(input.expected_cents),
    actual_cents: Math.trunc(input.actual_cents),
    yield_cents: Math.trunc(input.yield_cents),
    discrepancy_cents: Math.trunc(input.discrepancy_cents),
    notes: (input.notes ?? "").trim(),
    updated_at: Date.now(),
    deleted_at: null,
  };
  await db.reconciliations.add(record);
  return record;
}

export async function applyYieldSurplusToEmergencyFundInDb(params: {
  surplusCents: number;
  emergencyEnvelopeId: string;
  expectedCents: number;
  actualCents: number;
  yieldCents: number;
  notes?: string;
}): Promise<void> {
  const surplus = Math.trunc(params.surplusCents);
  if (surplus <= 0) {
    throw new Error("Apenas sobras positivas podem ser enviadas à Reserva.");
  }

  const now = Date.now();
  const date = todayIsoDate();

  await db.transaction("rw", db.transactions, db.reconciliations, async () => {
    await db.transactions.add({
      id: generateId(),
      type: "INCOME",
      amount_cents: surplus,
      description: "Rendimento conciliado → Reserva de Emergência",
      date,
      payment_method: "PIX_DEBIT",
      status: "PAID",
      from_envelope_id: null,
      to_envelope_id: params.emergencyEnvelopeId,
      third_party_id: null,
      bank_id: null,
      updated_at: now,
      deleted_at: null,
    });

    await db.reconciliations.add({
      id: generateId(),
      date,
      expected_cents: Math.trunc(params.expectedCents),
      actual_cents: Math.trunc(params.actualCents),
      yield_cents: Math.trunc(params.yieldCents),
      discrepancy_cents: surplus,
      notes:
        params.notes?.trim() ||
        "Sobra de rendimento enviada para Reserva de Emergência",
      updated_at: now,
      deleted_at: null,
    });
  });
}

/* ── Initial Seed & Reset ────────────────────────────────────── */

let seedingPromise: Promise<void> | null = null;

export async function seedDefaultDataIfEmpty(): Promise<void> {
  if (typeof window === "undefined") return;
  if (seedingPromise) return seedingPromise;

  seedingPromise = (async () => {
    const initialized = window.localStorage.getItem("befin_seeded_v1");
    const envelopeCount = await db.envelopes.count();
    if (initialized === "1" || envelopeCount > 0) {
      window.localStorage.setItem("befin_seeded_v1", "1");
      return;
    }

    const now = Date.now();
    const today = todayIsoDate();

    const emergencyId = generateId();
    const essentialsId = generateId();
    const leisureId = generateId();
    const travelId = generateId();

    const nubankId = generateId();
    const mercadoPagoId = generateId();
    const familyMemberId = generateId();

    await db.transaction(
      "rw",
      db.banks,
      db.envelopes,
      db.third_parties,
      db.transactions,
      async () => {
        await db.banks.bulkAdd([
          {
            id: nubankId,
            name: "Nubank (Caixinha Turbo)",
            balance_cents: 310500,
            updated_at: now,
            deleted_at: null,
          },
          {
            id: mercadoPagoId,
            name: "Mercado Pago",
            balance_cents: 162000,
            updated_at: now,
            deleted_at: null,
          },
        ]);

        await db.envelopes.bulkAdd([
          {
            id: emergencyId,
            name: "Reserva de Emergência",
            color: "mint",
            icon: "ShieldCheck",
            is_emergency_fund: true,
            updated_at: now,
            deleted_at: null,
          },
          {
            id: essentialsId,
            name: "Essenciais & Casa",
            color: "lavender",
            icon: "House",
            is_emergency_fund: false,
            updated_at: now,
            deleted_at: null,
          },
          {
            id: leisureId,
            name: "Lazer & Cuidados",
            color: "peach",
            icon: "Sparkle",
            is_emergency_fund: false,
            updated_at: now,
            deleted_at: null,
          },
          {
            id: travelId,
            name: "Viagem & Sonhos",
            color: "sky",
            icon: "AirplaneTilt",
            is_emergency_fund: false,
            updated_at: now,
            deleted_at: null,
          },
        ]);

        await db.third_parties.add({
          id: familyMemberId,
          name: "Mãe",
          updated_at: now,
          deleted_at: null,
        });

        await db.transactions.bulkAdd([
          {
            id: generateId(),
            type: "INCOME",
            amount_cents: 500000,
            description: "Salário mensal",
            date: today,
            payment_method: "PIX_DEBIT",
            status: "PAID",
            from_envelope_id: null,
            to_envelope_id: null,
            third_party_id: null,
            bank_id: nubankId,
            updated_at: now + 1,
            deleted_at: null,
          },
          {
            id: generateId(),
            type: "TRANSFER",
            amount_cents: 200000,
            description: "Aporte Reserva de Emergência",
            date: today,
            payment_method: "PIX_DEBIT",
            status: "PAID",
            from_envelope_id: null,
            to_envelope_id: emergencyId,
            third_party_id: null,
            bank_id: null,
            updated_at: now + 2,
            deleted_at: null,
          },
          {
            id: generateId(),
            type: "TRANSFER",
            amount_cents: 150000,
            description: "Orçamento Essenciais",
            date: today,
            payment_method: "PIX_DEBIT",
            status: "PAID",
            from_envelope_id: null,
            to_envelope_id: essentialsId,
            third_party_id: null,
            bank_id: null,
            updated_at: now + 3,
            deleted_at: null,
          },
          {
            id: generateId(),
            type: "TRANSFER",
            amount_cents: 65000,
            description: "Orçamento Lazer & Cuidados",
            date: today,
            payment_method: "PIX_DEBIT",
            status: "PAID",
            from_envelope_id: null,
            to_envelope_id: leisureId,
            third_party_id: null,
            bank_id: null,
            updated_at: now + 4,
            deleted_at: null,
          },
          {
            id: generateId(),
            type: "EXPENSE",
            amount_cents: 13000,
            description: "Mercado da semana (Pix)",
            date: today,
            payment_method: "PIX_DEBIT",
            status: "PAID",
            from_envelope_id: essentialsId,
            to_envelope_id: null,
            third_party_id: null,
            bank_id: nubankId,
            updated_at: now + 5,
            deleted_at: null,
          },
          {
            id: generateId(),
            type: "EXPENSE",
            amount_cents: 18500,
            description: "Jantar & Café especial (Crédito)",
            date: today,
            payment_method: "CREDIT",
            status: "PENDING",
            from_envelope_id: leisureId,
            to_envelope_id: null,
            third_party_id: null,
            bank_id: null,
            updated_at: now + 6,
            deleted_at: null,
          },
          {
            id: generateId(),
            type: "EXPENSE",
            amount_cents: 14500,
            description: "Farmácia da Mãe (Crédito)",
            date: today,
            payment_method: "CREDIT",
            status: "PENDING",
            from_envelope_id: null,
            to_envelope_id: null,
            third_party_id: familyMemberId,
            bank_id: null,
            updated_at: now + 7,
            deleted_at: null,
          },
        ]);
      }
    );

    window.localStorage.setItem("befin_seeded_v1", "1");
  })();

  try {
    await seedingPromise;
  } finally {
    seedingPromise = null;
  }
}

export async function clearAllLocalData(): Promise<void> {
  await db.transaction(
    "rw",
    db.banks,
    db.envelopes,
    db.third_parties,
    db.transactions,
    db.reconciliations,
    async () => {
      await db.banks.clear();
      await db.envelopes.clear();
      await db.third_parties.clear();
      await db.transactions.clear();
      await db.reconciliations.clear();
    }
  );
  if (typeof window !== "undefined") {
    window.localStorage.setItem("befin_seeded_v1", "1");
  }
}

export async function resetDemoData(): Promise<void> {
  await clearAllLocalData();
  if (typeof window !== "undefined") {
    window.localStorage.removeItem("befin_seeded_v1");
  }
  await seedDefaultDataIfEmpty();
}
