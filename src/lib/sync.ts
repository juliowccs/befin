import { BefinDatabase, db } from "./db";
import type {
  BankRecord,
  EnvelopeRecord,
  ReconciliationRecord,
  ThirdPartyRecord,
  TransactionRecord,
} from "./ledger";
import type { ValidatedSyncPayload } from "./schemas/sync";

const MAX_SYNC_BATCH = 5000;
const SYNC_META_KEY_PREFIX = "befin_sync_meta_v1:";
const CLOCK_SKEW_LEEWAY_MS = 60_000;

export type SyncStatus =
  | "idle"
  | "syncing"
  | "synced"
  | "offline"
  | "error"
  | "unauthenticated";

export interface SyncMeta {
  lastPushedAt: number;
  lastPulledUpdatedAt: number;
  lastSyncedAt: number | null;
}

export interface SyncTableLike<TRecord> {
  toArray(): Promise<TRecord[]>;
  get(key: string): Promise<TRecord | undefined>;
  put(item: TRecord): Promise<unknown>;
}

export interface SyncDatabaseLike {
  banks: SyncTableLike<BankRecord>;
  envelopes: SyncTableLike<EnvelopeRecord>;
  third_parties: SyncTableLike<ThirdPartyRecord>;
  transactions: SyncTableLike<TransactionRecord>;
  reconciliations: SyncTableLike<ReconciliationRecord>;
  runInTransaction?: <T>(fn: () => Promise<T>) => Promise<T>;
}

type SyncChanges = NonNullable<ValidatedSyncPayload["changes"]>;

export interface RemoteBankRow extends BankRecord {
  user_id?: string;
}

export interface RemoteEnvelopeRow extends EnvelopeRecord {
  user_id?: string;
}

export interface RemoteThirdPartyRow extends ThirdPartyRecord {
  user_id?: string;
}

export interface RemoteTransactionRow extends TransactionRecord {
  user_id?: string;
}

export interface RemoteReconciliationRow
  extends Omit<ReconciliationRecord, "notes"> {
  user_id?: string;
  notes?: string | null;
}

export interface RemoteSyncChanges {
  banks?: RemoteBankRow[];
  envelopes?: RemoteEnvelopeRow[];
  third_parties?: RemoteThirdPartyRow[];
  transactions?: RemoteTransactionRow[];
  reconciliations?: RemoteReconciliationRow[];
}

export interface SyncResponsePayload {
  server_time: number;
  changes: RemoteSyncChanges;
}

export interface CollectedLocalChanges {
  changes: SyncChanges;
  maxUpdatedAt: number;
  totalCount: number;
  hasMore: boolean;
}

export interface SyncRunResult {
  pushedCount: number;
  pulledCount: number;
  serverTime: number;
}

const DEFAULT_SYNC_META: SyncMeta = {
  lastPushedAt: 0,
  lastPulledUpdatedAt: 0,
  lastSyncedAt: null,
};

function getMetaStorageKey(userId: string): string {
  return `${SYNC_META_KEY_PREFIX}${userId}`;
}

export function getSyncMeta(userId: string): SyncMeta {
  if (typeof window === "undefined" || !userId) {
    return { ...DEFAULT_SYNC_META };
  }

  try {
    const raw = window.localStorage.getItem(getMetaStorageKey(userId));
    if (!raw) return { ...DEFAULT_SYNC_META };
    const parsed = JSON.parse(raw) as Partial<SyncMeta>;
    return {
      lastPushedAt:
        typeof parsed.lastPushedAt === "number" &&
        Number.isFinite(parsed.lastPushedAt)
          ? Math.max(0, Math.trunc(parsed.lastPushedAt))
          : 0,
      lastPulledUpdatedAt:
        typeof parsed.lastPulledUpdatedAt === "number" &&
        Number.isFinite(parsed.lastPulledUpdatedAt)
          ? Math.max(0, Math.trunc(parsed.lastPulledUpdatedAt))
          : 0,
      lastSyncedAt:
        typeof parsed.lastSyncedAt === "number" &&
        Number.isFinite(parsed.lastSyncedAt)
          ? Math.trunc(parsed.lastSyncedAt)
          : null,
    };
  } catch {
    return { ...DEFAULT_SYNC_META };
  }
}

export function setSyncMeta(userId: string, meta: SyncMeta): void {
  if (typeof window === "undefined" || !userId) return;
  try {
    window.localStorage.setItem(getMetaStorageKey(userId), JSON.stringify(meta));
  } catch {
    // Ignore storage quota errors cleanly
  }
}

export function clearSyncMeta(userId?: string): void {
  if (typeof window === "undefined") return;
  try {
    if (userId) {
      window.localStorage.removeItem(getMetaStorageKey(userId));
      return;
    }
    const keysToRemove: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (key?.startsWith(SYNC_META_KEY_PREFIX)) {
        keysToRemove.push(key);
      }
    }
    for (const key of keysToRemove) {
      window.localStorage.removeItem(key);
    }
  } catch {
    // Ignore storage access errors
  }
}

function selectBatch<T extends { updated_at: number }>(
  rows: T[],
  sinceTimestamp: number,
): { items: T[]; hasMore: boolean; maxUpdatedAt: number } {
  const filtered = rows
    .filter((row) => row.updated_at > sinceTimestamp)
    .sort((a, b) => a.updated_at - b.updated_at);

  const hasMore = filtered.length > MAX_SYNC_BATCH;
  const items = hasMore ? filtered.slice(0, MAX_SYNC_BATCH) : filtered;
  const maxUpdatedAt =
    items.length > 0 ? items[items.length - 1].updated_at : 0;

  return { items, hasMore, maxUpdatedAt };
}

export async function collectLocalChanges(
  database: SyncDatabaseLike,
  sinceTimestamp: number,
): Promise<CollectedLocalChanges> {
  const [
    allBanks,
    allEnvelopes,
    allThirdParties,
    allTransactions,
    allReconciliations,
  ] = await Promise.all([
    database.banks.toArray(),
    database.envelopes.toArray(),
    database.third_parties.toArray(),
    database.transactions.toArray(),
    database.reconciliations.toArray(),
  ]);

  const banksBatch = selectBatch(allBanks, sinceTimestamp);
  const envelopesBatch = selectBatch(allEnvelopes, sinceTimestamp);
  const thirdPartiesBatch = selectBatch(allThirdParties, sinceTimestamp);
  const transactionsBatch = selectBatch(allTransactions, sinceTimestamp);
  const reconciliationsBatch = selectBatch(allReconciliations, sinceTimestamp);

  const changes: SyncChanges = {};

  if (banksBatch.items.length > 0) {
    changes.banks = banksBatch.items.map((row) => ({
      id: row.id,
      name: row.name.trim().slice(0, 80),
      balance_cents: Math.trunc(row.balance_cents),
      updated_at: Math.trunc(row.updated_at),
      deleted_at: row.deleted_at ?? null,
    }));
  }

  if (envelopesBatch.items.length > 0) {
    changes.envelopes = envelopesBatch.items.map((row) => ({
      id: row.id,
      name: row.name.trim().slice(0, 80),
      color: row.color,
      icon: row.icon.trim().slice(0, 40),
      is_emergency_fund: Boolean(row.is_emergency_fund),
      updated_at: Math.trunc(row.updated_at),
      deleted_at: row.deleted_at ?? null,
    }));
  }

  if (thirdPartiesBatch.items.length > 0) {
    changes.third_parties = thirdPartiesBatch.items.map((row) => ({
      id: row.id,
      name: row.name.trim().slice(0, 80),
      updated_at: Math.trunc(row.updated_at),
      deleted_at: row.deleted_at ?? null,
    }));
  }

  if (transactionsBatch.items.length > 0) {
    changes.transactions = transactionsBatch.items.map((row) => ({
      id: row.id,
      type: row.type,
      amount_cents: Math.trunc(row.amount_cents),
      description: row.description.trim().slice(0, 200),
      date: row.date,
      payment_method: row.payment_method,
      status: row.status,
      from_envelope_id: row.from_envelope_id ?? null,
      to_envelope_id: row.to_envelope_id ?? null,
      third_party_id: row.third_party_id ?? null,
      bank_id: row.bank_id ?? null,
      updated_at: Math.trunc(row.updated_at),
      deleted_at: row.deleted_at ?? null,
    }));
  }

  if (reconciliationsBatch.items.length > 0) {
    changes.reconciliations = reconciliationsBatch.items.map((row) => ({
      id: row.id,
      date: row.date,
      expected_cents: Math.trunc(row.expected_cents),
      actual_cents: Math.trunc(row.actual_cents),
      yield_cents: Math.trunc(row.yield_cents),
      discrepancy_cents: Math.trunc(row.discrepancy_cents),
      notes: row.notes ? row.notes.slice(0, 500) : null,
      updated_at: Math.trunc(row.updated_at),
      deleted_at: row.deleted_at ?? null,
    }));
  }

  const batches = [
    banksBatch,
    envelopesBatch,
    thirdPartiesBatch,
    transactionsBatch,
    reconciliationsBatch,
  ];
  const hasMore = batches.some((b) => b.hasMore);
  const truncatedCutoffs = batches
    .filter((b) => b.hasMore && b.maxUpdatedAt > 0)
    .map((b) => b.maxUpdatedAt);
  const rawMaxUpdatedAt = Math.max(0, ...batches.map((b) => b.maxUpdatedAt));
  const maxUpdatedAt =
    truncatedCutoffs.length > 0
      ? Math.min(...truncatedCutoffs)
      : rawMaxUpdatedAt;

  const totalCount = batches.reduce((sum, b) => sum + b.items.length, 0);

  return {
    changes,
    maxUpdatedAt,
    totalCount,
    hasMore,
  };
}

async function runInRwTransaction<T>(
  database: SyncDatabaseLike,
  fn: () => Promise<T>,
): Promise<T> {
  if (database.runInTransaction) {
    return database.runInTransaction(fn);
  }
  if (database instanceof BefinDatabase) {
    return database.transaction(
      "rw",
      database.banks,
      database.envelopes,
      database.third_parties,
      database.transactions,
      database.reconciliations,
      fn,
    );
  }
  return fn();
}

async function upsertLwwBatch<
  TRemote extends { id: string; updated_at: number },
  TLocal extends { id: string; updated_at: number },
>(
  table: SyncTableLike<TLocal>,
  rows: TRemote[] | undefined,
  normalize: (remote: TRemote) => TLocal,
): Promise<{ maxUpdatedAt: number; appliedCount: number }> {
  if (!rows || rows.length === 0) {
    return { maxUpdatedAt: 0, appliedCount: 0 };
  }

  let maxUpdatedAt = 0;
  let appliedCount = 0;

  for (const remote of rows) {
    if (remote.updated_at > maxUpdatedAt) {
      maxUpdatedAt = remote.updated_at;
    }
    const existing = await table.get(remote.id);
    if (!existing || remote.updated_at > existing.updated_at) {
      await table.put(normalize(remote));
      appliedCount += 1;
    }
  }

  return { maxUpdatedAt, appliedCount };
}

export async function applyRemoteChangesToDb(
  database: SyncDatabaseLike,
  remoteChanges: RemoteSyncChanges,
): Promise<{ maxRemoteUpdatedAt: number; appliedCount: number }> {
  return runInRwTransaction(database, async () => {
    const bankRes = await upsertLwwBatch(
      database.banks,
      remoteChanges.banks,
      (row): BankRecord => ({
        id: row.id,
        name: row.name,
        balance_cents: Math.trunc(row.balance_cents),
        updated_at: row.updated_at,
        deleted_at: row.deleted_at ?? null,
      }),
    );

    const envRes = await upsertLwwBatch(
      database.envelopes,
      remoteChanges.envelopes,
      (row): EnvelopeRecord => ({
        id: row.id,
        name: row.name,
        color: row.color,
        icon: row.icon,
        is_emergency_fund: Boolean(row.is_emergency_fund),
        updated_at: row.updated_at,
        deleted_at: row.deleted_at ?? null,
      }),
    );

    const tpRes = await upsertLwwBatch(
      database.third_parties,
      remoteChanges.third_parties,
      (row): ThirdPartyRecord => ({
        id: row.id,
        name: row.name,
        updated_at: row.updated_at,
        deleted_at: row.deleted_at ?? null,
      }),
    );

    const txRes = await upsertLwwBatch(
      database.transactions,
      remoteChanges.transactions,
      (row): TransactionRecord => ({
        id: row.id,
        type: row.type,
        amount_cents: Math.trunc(row.amount_cents),
        description: row.description,
        date: row.date,
        payment_method: row.payment_method,
        status: row.status,
        from_envelope_id: row.from_envelope_id ?? null,
        to_envelope_id: row.to_envelope_id ?? null,
        third_party_id: row.third_party_id ?? null,
        bank_id: row.bank_id ?? null,
        updated_at: row.updated_at,
        deleted_at: row.deleted_at ?? null,
      }),
    );

    const recRes = await upsertLwwBatch(
      database.reconciliations,
      remoteChanges.reconciliations,
      (row): ReconciliationRecord => ({
        id: row.id,
        date: row.date,
        expected_cents: Math.trunc(row.expected_cents),
        actual_cents: Math.trunc(row.actual_cents),
        yield_cents: Math.trunc(row.yield_cents),
        discrepancy_cents: Math.trunc(row.discrepancy_cents),
        notes: row.notes ?? "",
        updated_at: row.updated_at,
        deleted_at: row.deleted_at ?? null,
      }),
    );

    const maxRemoteUpdatedAt = Math.max(
      bankRes.maxUpdatedAt,
      envRes.maxUpdatedAt,
      tpRes.maxUpdatedAt,
      txRes.maxUpdatedAt,
      recRes.maxUpdatedAt,
    );

    const appliedCount =
      bankRes.appliedCount +
      envRes.appliedCount +
      tpRes.appliedCount +
      txRes.appliedCount +
      recRes.appliedCount;

    return { maxRemoteUpdatedAt, appliedCount };
  });
}

let activeSyncPromise: Promise<SyncRunResult> | null = null;
let activeSyncUserId: string | null = null;
let rerunRequested = false;

async function performSingleSync(userId: string): Promise<SyncRunResult> {
  const meta = getSyncMeta(userId);
  const local = await collectLocalChanges(db, meta.lastPushedAt);

  const requestLastSyncedAt =
    meta.lastPulledUpdatedAt > 0
      ? Math.max(0, meta.lastPulledUpdatedAt - CLOCK_SKEW_LEEWAY_MS)
      : 0;

  const response = await fetch("/api/sync", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      last_synced_at: requestLastSyncedAt,
      changes: local.changes,
    }),
  });

  if (!response.ok) {
    let errorMessage = "Não foi possível sincronizar agora.";
    try {
      const errorPayload = (await response.json()) as { error?: string };
      if (typeof errorPayload?.error === "string" && errorPayload.error) {
        errorMessage = errorPayload.error;
      }
    } catch {
      // Keep fallback message
    }
    throw new Error(errorMessage);
  }

  const data = (await response.json()) as SyncResponsePayload;
  const { maxRemoteUpdatedAt, appliedCount } = await applyRemoteChangesToDb(
    db,
    data.changes ?? {},
  );

  const nextLastPushedAt = local.hasMore
    ? Math.max(meta.lastPushedAt, local.maxUpdatedAt)
    : Math.max(meta.lastPushedAt, local.maxUpdatedAt, maxRemoteUpdatedAt);

  const nextLastPulledUpdatedAt = Math.max(
    meta.lastPulledUpdatedAt,
    local.maxUpdatedAt,
    maxRemoteUpdatedAt,
  );

  setSyncMeta(userId, {
    lastPushedAt: nextLastPushedAt,
    lastPulledUpdatedAt: nextLastPulledUpdatedAt,
    lastSyncedAt: data.server_time,
  });

  if (local.hasMore) {
    rerunRequested = true;
  }

  return {
    pushedCount: local.totalCount,
    pulledCount: appliedCount,
    serverTime: data.server_time,
  };
}

export async function syncWithServer(userId: string): Promise<SyncRunResult> {
  if (!userId) {
    throw new Error("Usuário não autenticado para sincronizar.");
  }

  if (activeSyncPromise) {
    if (activeSyncUserId === userId) {
      rerunRequested = true;
      return activeSyncPromise;
    }
    await activeSyncPromise.catch(() => undefined);
  }

  activeSyncUserId = userId;
  activeSyncPromise = (async () => {
    let totalPushed = 0;
    let totalPulled = 0;
    let lastServerTime = Date.now();

    try {
      do {
        rerunRequested = false;
        const step = await performSingleSync(userId);
        totalPushed += step.pushedCount;
        totalPulled += step.pulledCount;
        lastServerTime = step.serverTime;
      } while (rerunRequested);

      return {
        pushedCount: totalPushed,
        pulledCount: totalPulled,
        serverTime: lastServerTime,
      };
    } finally {
      activeSyncPromise = null;
      activeSyncUserId = null;
      rerunRequested = false;
    }
  })();

  return activeSyncPromise;
}
