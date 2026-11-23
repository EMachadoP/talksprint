import { NextResponse } from "next/server";
import { z } from "zod";
import { registerUserAccount } from "@/lib/db/repository";
import {
  buildSessionCookieOptions,
  registerActiveSession,
  SESSION_COOKIE_NAME,
  signSessionToken,
} from "@/lib/auth/session";
import { checkRateLimit, getClientIp } from "@/lib/security/rate-limit";
import { verifyCsrfOrigin } from "@/lib/security/csrf";
import { logSecurityEvent } from "@/lib/security/audit-log";

const registerSchema = z.object({
  displayName: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(120),
  password: z.string().min(8).max(120),
});

export async function POST(req: Request) {
  const ip = getClientIp(req);
  const csrf = verifyCsrfOrigin(req);
  if (!csrf.ok) {
    logSecurityEvent({ event: "CSRF_BLOCKED", ip, detail: csrf.reason });
    return NextResponse.json({ error: "Requisição cross-site bloqueada." }, { status: 403 });
  }

  const limit = checkRateLimit(`api:auth:register:${ip}`, 10, 60_000);
  if (!limit.allowed) {
    logSecurityEvent({ event: "AUTH_RATE_LIMITED", ip, detail: "register" });
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
    await registerActiveSession(token, {
      userId: created.user.id,
      pseudonymId: created.user.pseudonymId,
    });

    logSecurityEvent({
      event: "AUTH_REGISTER",
      ip,
      pseudonymId: created.user.pseudonymId,
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
