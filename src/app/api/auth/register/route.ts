import { NextResponse } from "next/server";
import { z } from "zod";
import { registerUserAccount } from "@/lib/db/repository";
import {
  buildSessionCookieOptions,
  SESSION_COOKIE_NAME,
  signSessionToken,
} from "@/lib/auth/session";

import { checkRateLimit, getClientIp } from "@/lib/security/rate-limit";

const registerSchema = z.object({
  displayName: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(120),
  password: z.string().min(8).max(120),
});

export async function POST(req: Request) {
  const limit = checkRateLimit(`api:auth:register:${getClientIp(req)}`, 10, 60_000);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Muitas tentativas de cadastro. Aguarde 1 minuto." },
      { status: 429 }
    );
  }
  try {
    const json = await req.json();
    const parsed = registerSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Informe nome, e-mail válido e senha com no mínimo 8 caracteres." },
        { status: 400 }
      );
    }

    const created = await registerUserAccount(parsed.data);
    if ("error" in created) {
      return NextResponse.json({ error: created.error }, { status: 409 });
    }

    const token = signSessionToken({
      userId: created.user.id,
      pseudonymId: created.user.pseudonymId,
      email: created.user.email,
      displayName: created.user.displayName,
    });

    const res = NextResponse.json({
      user: {
        email: created.user.email,
        displayName: created.user.displayName,
        pseudonymId: created.user.pseudonymId,
      },
    });
    res.cookies.set(SESSION_COOKIE_NAME, token, buildSessionCookieOptions());
    return res;
  } catch {
    return NextResponse.json({ error: "Erro ao criar conta." }, { status: 500 });
  }
}
