import crypto from "node:crypto";
import { cookies } from "next/headers";
import {
  hasDatabaseUrl,
  pgCreateSession,
  pgIsSessionActive,
  pgRevokeSession,
} from "@/lib/db/postgres-repository";

export const SESSION_COOKIE_NAME = "talksprint_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 14; // 14 days

const revokedMemoryHashes = new Set<string>();

function getAuthSecret(): string {
  const secret = process.env.AUTH_SECRET?.trim();
  if (secret && secret.length >= 16) return secret;
  if (process.env.NODE_ENV === "production") {
    throw new Error("AUTH_SECRET must be configured in production.");
  }
  return "talksprint-dev-only-ephemeral-secret";
}

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const derived = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${derived}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const [salt, keyHex] = storedHash.split(":");
  if (!salt || !keyHex) return false;
  const derived = crypto.scryptSync(password, salt, 64);
  const storedBuf = Buffer.from(keyHex, "hex");
  if (derived.length !== storedBuf.length) return false;
  return crypto.timingSafeEqual(derived, storedBuf);
}

export function hashSessionToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export interface SessionPayload {
  jti: string;
  userId: string;
  pseudonymId: string;
  email: string;
  displayName: string;
  exp: number;
}

export function signSessionToken(
  payload: Omit<SessionPayload, "exp" | "jti">
): string {
  const full: SessionPayload = {
    ...payload,
    jti: crypto.randomUUID(),
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
  };
  const data = Buffer.from(JSON.stringify(full)).toString("base64url");
  const sig = crypto
    .createHmac("sha256", getAuthSecret())
    .update(data)
    .digest("base64url");
  return `${data}.${sig}`;
}

export function verifySessionToken(token: string): SessionPayload | null {
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [data, sig] = parts;
  const expected = crypto
    .createHmac("sha256", getAuthSecret())
    .update(data)
    .digest("base64url");

  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return null;
  }

  try {
    const parsed = JSON.parse(
      Buffer.from(data, "base64url").toString("utf8")
    ) as SessionPayload;
    if (!parsed.exp || !parsed.jti || parsed.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export async function registerActiveSession(
  token: string,
  payload: Pick<SessionPayload, "userId" | "pseudonymId">
): Promise<void> {
  const tokenHash = hashSessionToken(token);
  revokedMemoryHashes.delete(tokenHash);
  if (hasDatabaseUrl()) {
    await pgCreateSession({
      tokenHash,
      userId: payload.userId,
      pseudonymId: payload.pseudonymId,
      expiresAt: new Date(Date.now() + SESSION_TTL_SECONDS * 1000),
    });
  }
}

export async function revokeActiveSession(token: string | null | undefined): Promise<void> {
  if (!token) return;
  const tokenHash = hashSessionToken(token);
  revokedMemoryHashes.add(tokenHash);
  if (hasDatabaseUrl()) {
    await pgRevokeSession(tokenHash);
  }
}

function extractCookieTokenFromHeader(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(";")) {
    const [rawKey, ...rest] = part.trim().split("=");
    if (rawKey === SESSION_COOKIE_NAME) {
      return decodeURIComponent(rest.join("="));
    }
  }
  return null;
}

export async function getRawSessionToken(req?: Request): Promise<string | null> {
  if (req) {
    const fromHeader = extractCookieTokenFromHeader(req.headers.get("cookie"));
    if (fromHeader) return fromHeader;
  }
  try {
    const cookieStore = await cookies();
    return cookieStore.get(SESSION_COOKIE_NAME)?.value ?? null;
  } catch {
    return null;
  }
}

export async function getCurrentSession(req?: Request): Promise<SessionPayload | null> {
  const token = await getRawSessionToken(req);
  if (!token) return null;

  const parsed = verifySessionToken(token);
  if (!parsed) return null;

  const tokenHash = hashSessionToken(token);
  if (revokedMemoryHashes.has(tokenHash)) return null;

  if (hasDatabaseUrl()) {
    const active = await pgIsSessionActive(tokenHash);
    if (!active) return null;
  }

  return parsed;
}

export function buildSessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  };
}
