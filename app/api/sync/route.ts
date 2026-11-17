import { and, eq, gt, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getTursoDb } from "@/src/db/client";
import {
  banks,
  envelopes,
  reconciliations,
  thirdParties,
  transactions,
} from "@/src/db/schema";
import { authInstance } from "@/src/lib/auth";
import { checkRateLimit } from "@/src/lib/rate-limit";
import { syncPayloadSchema } from "@/src/lib/schemas/sync";

const MAX_SYNC_BODY_BYTES = 2 * 1024 * 1024; // 2 MiB

export async function POST(req: Request) {
  try {
    const session = await authInstance().api.getSession({
      headers: req.headers,
    });

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Autenticação necessária para sincronizar." },
        { status: 401 },
      );
    }

    const rate = checkRateLimit(`sync:${session.user.id}`, {
      limit: 60,
      windowMs: 60 * 1000,
    });
    if (!rate.allowed) {
      return NextResponse.json(
        { error: "Limite de sincronizações excedido. Aguarde um instante." },
        {
          status: 429,
          headers: { "Retry-After": String(rate.retryAfterSeconds) },
        },
      );
    }

    const contentLength = Number(req.headers.get("content-length") ?? "0");
    if (Number.isFinite(contentLength) && contentLength > MAX_SYNC_BODY_BYTES) {
      return NextResponse.json(
        { error: "Payload de sincronização excede o tamanho máximo permitido." },
        { status: 413 },
      );
    }

    let rawBody: unknown;
    try {
      const rawText = await req.text();
      if (Buffer.byteLength(rawText, "utf8") > MAX_SYNC_BODY_BYTES) {
        return NextResponse.json(
          { error: "Payload de sincronização excede o tamanho máximo permitido." },
          { status: 413 },
        );
      }
      rawBody = JSON.parse(rawText);
    } catch {
      return NextResponse.json(
        { error: "JSON inválido no corpo da sincronização." },
        { status: 400 },
      );
    }

    const parsed = syncPayloadSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Payload de sincronização inválido." },
        { status: 400 },
      );
    }

    const userId = session.user.id;
    const lastSyncedAt = parsed.data.last_synced_at;
    const changes = parsed.data.changes;
    const db = getTursoDb();

    await db.transaction(async (tx) => {
      for (const row of changes.banks ?? []) {
        await tx
          .insert(banks)
          .values({
            id: row.id,
            user_id: userId,
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
            setWhere: and(
              eq(banks.user_id, userId),
              sql`excluded.updated_at > ${banks.updated_at}`,
            ),
          });
      }

      for (const row of changes.envelopes ?? []) {
        await tx
          .insert(envelopes)
          .values({
            id: row.id,
            user_id: userId,
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
            setWhere: and(
              eq(envelopes.user_id, userId),
              sql`excluded.updated_at > ${envelopes.updated_at}`,
            ),
          });
      }

      for (const row of changes.third_parties ?? []) {
        await tx
          .insert(thirdParties)
          .values({
            id: row.id,
            user_id: userId,
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
            setWhere: and(
              eq(thirdParties.user_id, userId),
              sql`excluded.updated_at > ${thirdParties.updated_at}`,
            ),
          });
      }

      for (const row of changes.transactions ?? []) {
        await tx
          .insert(transactions)
          .values({
            id: row.id,
            user_id: userId,
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
            setWhere: and(
              eq(transactions.user_id, userId),
              sql`excluded.updated_at > ${transactions.updated_at}`,
            ),
          });
      }

      for (const row of changes.reconciliations ?? []) {
        await tx
          .insert(reconciliations)
          .values({
            id: row.id,
            user_id: userId,
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
            setWhere: and(
              eq(reconciliations.user_id, userId),
              sql`excluded.updated_at > ${reconciliations.updated_at}`,
            ),
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
      db
        .select()
        .from(banks)
        .where(and(eq(banks.user_id, userId), gt(banks.updated_at, lastSyncedAt))),
      db
        .select()
        .from(envelopes)
        .where(
          and(
            eq(envelopes.user_id, userId),
            gt(envelopes.updated_at, lastSyncedAt),
          ),
        ),
      db
        .select()
        .from(thirdParties)
        .where(
          and(
            eq(thirdParties.user_id, userId),
            gt(thirdParties.updated_at, lastSyncedAt),
          ),
        ),
      db
        .select()
        .from(transactions)
        .where(
          and(
            eq(transactions.user_id, userId),
            gt(transactions.updated_at, lastSyncedAt),
          ),
        ),
      db
        .select()
        .from(reconciliations)
        .where(
          and(
            eq(reconciliations.user_id, userId),
            gt(reconciliations.updated_at, lastSyncedAt),
          ),
        ),
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
