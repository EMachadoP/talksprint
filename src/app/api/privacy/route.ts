import { NextResponse } from "next/server";
import { z } from "zod";
import { loadLearner, persistLearner, removeLearner } from "@/lib/db/repository";
import {
  getCurrentSession,
  getRawSessionToken,
  revokeActiveSession,
  SESSION_COOKIE_NAME,
} from "@/lib/auth/session";
import { verifyCsrfOrigin } from "@/lib/security/csrf";
import { getClientIp } from "@/lib/security/rate-limit";
import { logSecurityEvent } from "@/lib/security/audit-log";

const privacyPatchSchema = z.object({
  pronunciationPortfolioOptIn: z.boolean(),
});

export async function GET(req: Request) {
  const session = await getCurrentSession(req);
  if (!session) {
    return NextResponse.json(
      { error: "Autenticação obrigatória para consultar inventário de privacidade." },
      { status: 401 }
    );
  }
  const learner = await loadLearner(session.pseudonymId);
  return NextResponse.json({
    pseudonymId: learner.pseudonymId,
    pronunciationPortfolioOptIn: learner.pronunciationPortfolioOptIn,
    dataInventory: {
      piiSeparated: true,
      rawAudioPolicy: learner.pronunciationPortfolioOptIn
        ? "Opt-in ativo: retido apenas para portfólio pessoal"
        : "Extração e descarte imediato (padrão LGPD)",
      learningEventsCount: learner.events.length,
      competencyNodesCount: learner.nodes.length,
    },
  });
}

export async function PATCH(req: Request) {
  const ip = getClientIp(req);
  const csrf = verifyCsrfOrigin(req);
  if (!csrf.ok) {
    logSecurityEvent({ event: "CSRF_BLOCKED", ip, detail: csrf.reason });
    return NextResponse.json({ error: "Requisição cross-site bloqueada." }, { status: 403 });
  }

  const session = await getCurrentSession(req);
  if (!session) {
    return NextResponse.json(
      { error: "Autenticação obrigatória para alterar preferências LGPD." },
      { status: 401 }
    );
  }

  try {
    const json = await req.json();
    const parsed = privacyPatchSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Configuração inválida." }, { status: 400 });
    }
    const learner = await loadLearner(session.pseudonymId);
    const updated = await persistLearner(
      {
        ...learner,
        pronunciationPortfolioOptIn: parsed.data.pronunciationPortfolioOptIn,
      },
      session.pseudonymId
    );
    logSecurityEvent({
      event: "PRIVACY_PORTFOLIO_CHANGED",
      ip,
      pseudonymId: session.pseudonymId,
      detail: `optIn=${updated.pronunciationPortfolioOptIn}`,
    });
    return NextResponse.json({
      pronunciationPortfolioOptIn: updated.pronunciationPortfolioOptIn,
    });
  } catch {
    return NextResponse.json({ error: "Payload JSON inválido." }, { status: 400 });
  }
}

export async function DELETE(req: Request) {
  const ip = getClientIp(req);
  const csrf = verifyCsrfOrigin(req);
  if (!csrf.ok) {
    logSecurityEvent({ event: "CSRF_BLOCKED", ip, detail: csrf.reason });
    return NextResponse.json({ error: "Requisição cross-site bloqueada." }, { status: 403 });
  }

  const session = await getCurrentSession(req);
  if (!session) {
    return NextResponse.json(
      { error: "Autenticação obrigatória para exclusão de dados." },
      { status: 401 }
    );
  }

  const token = await getRawSessionToken(req);
  await revokeActiveSession(token);
  await removeLearner(session.pseudonymId);
  logSecurityEvent({
    event: "PRIVACY_DATA_DELETED",
    ip,
    pseudonymId: session.pseudonymId,
  });

  const res = NextResponse.json({
    deleted: true,
    message: "Dados pessoais e perfil pseudônimo removidos em propagação completa.",
  });
  res.cookies.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  return res;
}
