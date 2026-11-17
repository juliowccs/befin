import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getTursoDb } from "@/src/db/client";
import {
  banks,
  envelopes,
  reconciliations,
  thirdParties,
  transactions,
  user,
} from "@/src/db/schema";
import { authInstance } from "@/src/lib/auth";
import { checkRateLimit } from "@/src/lib/rate-limit";

/**
 * LGPD Art. 18, V — Portabilidade dos dados pessoais do titular em JSON.
 */
export async function GET(req: Request) {
  try {
    const session = await authInstance().api.getSession({
      headers: req.headers,
    });

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
    }

    const userId = session.user.id;
    const rate = checkRateLimit(`account:export:${userId}`, {
      limit: 5,
      windowMs: 60 * 60 * 1000,
    });
    if (!rate.allowed) {
      return NextResponse.json(
        { error: "Muitas solicitações de exportação. Tente novamente mais tarde." },
        {
          status: 429,
          headers: { "Retry-After": String(rate.retryAfterSeconds) },
        },
      );
    }

    const db = getTursoDb();

    const [
      userBanks,
      userEnvelopes,
      userThirdParties,
      userTransactions,
      userReconciliations,
    ] = await Promise.all([
      db.select().from(banks).where(eq(banks.user_id, userId)),
      db.select().from(envelopes).where(eq(envelopes.user_id, userId)),
      db.select().from(thirdParties).where(eq(thirdParties.user_id, userId)),
      db.select().from(transactions).where(eq(transactions.user_id, userId)),
      db
        .select()
        .from(reconciliations)
        .where(eq(reconciliations.user_id, userId)),
    ]);

    const payload = {
      exported_at: new Date().toISOString(),
      lgpd_notice:
        "Exportação completa dos dados associados à sua conta no befin (LGPD Art. 18).",
      profile: {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
        createdAt: session.user.createdAt,
      },
      data: {
        banks: userBanks,
        envelopes: userEnvelopes,
        third_parties: userThirdParties,
        transactions: userTransactions,
        reconciliations: userReconciliations,
      },
    };

    return new NextResponse(JSON.stringify(payload, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": 'attachment; filename="befin-dados-lgpd.json"',
      },
    });
  } catch (error) {
    console.error("Account export error:", error);
    return NextResponse.json(
      { error: "Não foi possível exportar os dados." },
      { status: 500 },
    );
  }
}

/**
 * LGPD Art. 18, VI — Eliminação definitiva dos dados pessoais do titular.
 */
export async function DELETE(req: Request) {
  try {
    const session = await authInstance().api.getSession({
      headers: req.headers,
    });

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
    }

    const userId = session.user.id;
    const rate = checkRateLimit(`account:delete:${userId}`, {
      limit: 3,
      windowMs: 60 * 60 * 1000,
    });
    if (!rate.allowed) {
      return NextResponse.json(
        { error: "Muitas tentativas de exclusão. Tente novamente mais tarde." },
        {
          status: 429,
          headers: { "Retry-After": String(rate.retryAfterSeconds) },
        },
      );
    }

    const db = getTursoDb();

    await db.transaction(async (tx) => {
      await tx.delete(transactions).where(eq(transactions.user_id, userId));
      await tx.delete(reconciliations).where(eq(reconciliations.user_id, userId));
      await tx.delete(thirdParties).where(eq(thirdParties.user_id, userId));
      await tx.delete(envelopes).where(eq(envelopes.user_id, userId));
      await tx.delete(banks).where(eq(banks.user_id, userId));
      await tx.delete(user).where(eq(user.id, userId));
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Account deletion error:", error);
    return NextResponse.json(
      { error: "Não foi possível excluir a conta." },
      { status: 500 },
    );
  }
}
