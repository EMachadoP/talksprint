import { NextResponse } from "next/server";
import { z } from "zod";
import { authenticateUserAccount } from "@/lib/db/repository";
import {
  buildSessionCookieOptions,
  registerActiveSession,
  SESSION_COOKIE_NAME,
  signSessionToken,
} from "@/lib/auth/session";
import { checkRateLimit, getClientIp } from "@/lib/security/rate-limit";
import { verifyCsrfOrigin } from "@/lib/security/csrf";
import { logSecurityEvent } from "@/lib/security/audit-log";

const loginSchema = z.object({
  email: z.string().trim().email().max(120),
  password: z.string().min(1).max(120),
});

export async function POST(req: Request) {
  const ip = getClientIp(req);
  const csrf = verifyCsrfOrigin(req);
  if (!csrf.ok) {
    logSecurityEvent({ event: "CSRF_BLOCKED", ip, detail: csrf.reason });
    return NextResponse.json({ error: "Requisição cross-site bloqueada." }, { status: 403 });
  }

  const ipLimit = checkRateLimit(`api:auth:login:ip:${ip}`, 15, 60_000);
  if (!ipLimit.allowed) {
    logSecurityEvent({ event: "AUTH_RATE_LIMITED", ip, detail: "login_ip" });
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

    const acctKey = `api:auth:login:acct:${parsed.data.email.toLowerCase()}`;
    const acctLimit = checkRateLimit(acctKey, 8, 60_000);
    if (!acctLimit.allowed) {
      logSecurityEvent({ event: "AUTH_RATE_LIMITED", ip, detail: "login_account" });
      return NextResponse.json(
        { error: "Muitas tentativas para esta conta. Aguarde 1 minuto." },
        { status: 429 }
      );
    }

    const user = await authenticateUserAccount(parsed.data);
    if (!user) {
      logSecurityEvent({ event: "AUTH_LOGIN_FAILURE", ip });
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
    await registerActiveSession(token, {
      userId: user.id,
      pseudonymId: user.pseudonymId,
    });

    logSecurityEvent({
      event: "AUTH_LOGIN_SUCCESS",
      ip,
      pseudonymId: user.pseudonymId,
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
