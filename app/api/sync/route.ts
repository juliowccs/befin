import { gt, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getTursoDb } from "@/src/db/client";
import {
  banks,
  envelopes,
  reconciliations,
  thirdParties,
  transactions,
} from "@/src/db/schema";
import type {
  BankRecord,
  EnvelopeRecord,
  ReconciliationRecord,
  ThirdPartyRecord,
  TransactionRecord,
} from "@/src/lib/ledger";

interface SyncPayload {
  last_synced_at?: number;
  changes?: {
    banks?: BankRecord[];
    envelopes?: EnvelopeRecord[];
    third_parties?: ThirdPartyRecord[];
    transactions?: TransactionRecord[];
    reconciliations?: ReconciliationRecord[];
  };
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as SyncPayload;
    const lastSyncedAt = Number(body.last_synced_at ?? 0);
    const changes = body.changes ?? {};
    const db = getTursoDb();

    await db.transaction(async (tx) => {
      for (const row of changes.banks ?? []) {
        await tx
          .insert(banks)
          .values({
            id: row.id,
            name: row.name,
            balance_cents: Math.trunc(row.balance_cents),
            updated_at: row.updated_at,
            deleted_at: row.deleted_at ?? null,
          })
          .onConflictDoUpdate({
            target: banks.id,
            set: {
              name: sql`excluded.name`,
              balance_cents: sql`excluded.balance_cents`,
              updated_at: sql`excluded.updated_at`,
              deleted_at: sql`excluded.deleted_at`,
            },
            setWhere: sql`excluded.updated_at > ${banks.updated_at}`,
          });
      }

      for (const row of changes.envelopes ?? []) {
        await tx
          .insert(envelopes)
          .values({
            id: row.id,
            name: row.name,
            color: row.color,
            icon: row.icon,
            is_emergency_fund: Boolean(row.is_emergency_fund),
            updated_at: row.updated_at,
            deleted_at: row.deleted_at ?? null,
          })
          .onConflictDoUpdate({
            target: envelopes.id,
            set: {
              name: sql`excluded.name`,
              color: sql`excluded.color`,
              icon: sql`excluded.icon`,
              is_emergency_fund: sql`excluded.is_emergency_fund`,
              updated_at: sql`excluded.updated_at`,
              deleted_at: sql`excluded.deleted_at`,
            },
            setWhere: sql`excluded.updated_at > ${envelopes.updated_at}`,
          });
      }

      for (const row of changes.third_parties ?? []) {
        await tx
          .insert(thirdParties)
          .values({
            id: row.id,
            name: row.name,
            updated_at: row.updated_at,
            deleted_at: row.deleted_at ?? null,
          })
          .onConflictDoUpdate({
            target: thirdParties.id,
            set: {
              name: sql`excluded.name`,
              updated_at: sql`excluded.updated_at`,
              deleted_at: sql`excluded.deleted_at`,
            },
            setWhere: sql`excluded.updated_at > ${thirdParties.updated_at}`,
          });
      }

      for (const row of changes.transactions ?? []) {
        await tx
          .insert(transactions)
          .values({
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
          })
          .onConflictDoUpdate({
            target: transactions.id,
            set: {
              type: sql`excluded.type`,
              amount_cents: sql`excluded.amount_cents`,
              description: sql`excluded.description`,
              date: sql`excluded.date`,
              payment_method: sql`excluded.payment_method`,
              status: sql`excluded.status`,
              from_envelope_id: sql`excluded.from_envelope_id`,
              to_envelope_id: sql`excluded.to_envelope_id`,
              third_party_id: sql`excluded.third_party_id`,
              bank_id: sql`excluded.bank_id`,
              updated_at: sql`excluded.updated_at`,
              deleted_at: sql`excluded.deleted_at`,
            },
            setWhere: sql`excluded.updated_at > ${transactions.updated_at}`,
          });
      }

      for (const row of changes.reconciliations ?? []) {
        await tx
          .insert(reconciliations)
          .values({
            id: row.id,
            date: row.date,
            expected_cents: Math.trunc(row.expected_cents),
            actual_cents: Math.trunc(row.actual_cents),
            yield_cents: Math.trunc(row.yield_cents),
            discrepancy_cents: Math.trunc(row.discrepancy_cents),
            notes: row.notes ?? null,
            updated_at: row.updated_at,
            deleted_at: row.deleted_at ?? null,
          })
          .onConflictDoUpdate({
            target: reconciliations.id,
            set: {
              date: sql`excluded.date`,
              expected_cents: sql`excluded.expected_cents`,
              actual_cents: sql`excluded.actual_cents`,
              yield_cents: sql`excluded.yield_cents`,
              discrepancy_cents: sql`excluded.discrepancy_cents`,
              notes: sql`excluded.notes`,
              updated_at: sql`excluded.updated_at`,
              deleted_at: sql`excluded.deleted_at`,
            },
            setWhere: sql`excluded.updated_at > ${reconciliations.updated_at}`,
          });
      }
    });

    const [
      remoteBanks,
      remoteEnvelopes,
      remoteThirdParties,
      remoteTransactions,
      remoteReconciliations,
    ] = await Promise.all([
      db.select().from(banks).where(gt(banks.updated_at, lastSyncedAt)),
      db.select().from(envelopes).where(gt(envelopes.updated_at, lastSyncedAt)),
      db
        .select()
        .from(thirdParties)
        .where(gt(thirdParties.updated_at, lastSyncedAt)),
      db
        .select()
        .from(transactions)
        .where(gt(transactions.updated_at, lastSyncedAt)),
      db
        .select()
        .from(reconciliations)
        .where(gt(reconciliations.updated_at, lastSyncedAt)),
    ]);

    return NextResponse.json({
      server_time: Date.now(),
      changes: {
        banks: remoteBanks,
        envelopes: remoteEnvelopes,
        third_parties: remoteThirdParties,
        transactions: remoteTransactions,
        reconciliations: remoteReconciliations,
      },
    });
  } catch (error) {
    console.error("Sync error:", error);
    return NextResponse.json(
      { error: "Failed to sync with Turso" },
      { status: 500 },
    );
  }
}
