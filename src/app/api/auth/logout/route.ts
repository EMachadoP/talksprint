import { NextResponse } from "next/server";
import {
  getCurrentSession,
  getRawSessionToken,
  revokeActiveSession,
  SESSION_COOKIE_NAME,
} from "@/lib/auth/session";
import { verifyCsrfOrigin } from "@/lib/security/csrf";
import { getClientIp } from "@/lib/security/rate-limit";
import { logSecurityEvent } from "@/lib/security/audit-log";

export async function POST(req: Request) {
  const ip = getClientIp(req);
  const csrf = verifyCsrfOrigin(req);
  if (!csrf.ok) {
    logSecurityEvent({ event: "CSRF_BLOCKED", ip, detail: csrf.reason });
    return NextResponse.json({ error: "Requisição cross-site bloqueada." }, { status: 403 });
  }

  const session = await getCurrentSession(req);
  const token = await getRawSessionToken(req);
  await revokeActiveSession(token);
  logSecurityEvent({
    event: "AUTH_LOGOUT",
    ip,
    pseudonymId: session?.pseudonymId,
  });

  const res = NextResponse.json({ loggedOut: true });
  res.cookies.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  return res;
}
