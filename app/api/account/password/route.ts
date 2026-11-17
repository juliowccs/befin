import { NextResponse } from "next/server";
import { authInstance } from "@/src/lib/auth";
import { checkRateLimit } from "@/src/lib/rate-limit";
import { setPasswordSchema } from "@/src/lib/schemas/auth";

export async function POST(req: Request) {
  try {
    const auth = authInstance();
    const session = await auth.api.getSession({ headers: req.headers });

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
    }

    const rate = checkRateLimit(`account:password:${session.user.id}`, {
      limit: 5,
      windowMs: 15 * 60 * 1000,
    });
    if (!rate.allowed) {
      return NextResponse.json(
        { error: "Muitas tentativas. Aguarde antes de tentar novamente." },
        {
          status: 429,
          headers: { "Retry-After": String(rate.retryAfterSeconds) },
        },
      );
    }

    let rawBody: unknown;
    try {
      rawBody = await req.json();
    } catch {
      return NextResponse.json(
        { error: "Corpo da requisição inválido." },
        { status: 400 },
      );
    }

    const parsed = setPasswordSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error:
            parsed.error.issues[0]?.message ??
            "A senha deve ter entre 8 e 128 caracteres.",
        },
        { status: 400 },
      );
    }

    const { newPassword } = parsed.data;

    await auth.api.setPassword({
      body: { newPassword },
      headers: req.headers,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Set password error:", error);
    return NextResponse.json(
      { error: "Não foi possível definir a senha." },
      { status: 400 },
    );
  }
}
