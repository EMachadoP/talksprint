import { NextResponse } from "next/server";
import { z } from "zod";
import { authenticateUserAccount } from "@/lib/db/repository";
import {
  buildSessionCookieOptions,
  SESSION_COOKIE_NAME,
  signSessionToken,
} from "@/lib/auth/session";

import { checkRateLimit, getClientIp } from "@/lib/security/rate-limit";

const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
});

export async function POST(req: Request) {
  const limit = checkRateLimit(`api:auth:login:${getClientIp(req)}`, 15, 60_000);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Muitas tentativas de login. Aguarde 1 minuto." },
      { status: 429 }
    );
  }
  try {
    const json = await req.json();
    const parsed = loginSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Credenciais inválidas." }, { status: 400 });
    }

    const user = await authenticateUserAccount(parsed.data);
    if (!user) {
      return NextResponse.json(
        { error: "E-mail ou senha incorretos." },
        { status: 401 }
      );
    }

    const token = signSessionToken({
      userId: user.id,
      pseudonymId: user.pseudonymId,
      email: user.email,
      displayName: user.displayName,
    });

    const res = NextResponse.json({
      user: {
        email: user.email,
        displayName: user.displayName,
        pseudonymId: user.pseudonymId,
      },
    });
    res.cookies.set(SESSION_COOKIE_NAME, token, buildSessionCookieOptions());
    return res;
  } catch {
    return NextResponse.json({ error: "Erro ao autenticar." }, { status: 500 });
  }
}
