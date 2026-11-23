import { NextResponse } from "next/server";
import { z } from "zod";
import { loadLearner, persistLearner, removeLearner } from "@/lib/db/repository";
import { getCurrentSession, SESSION_COOKIE_NAME } from "@/lib/auth/session";

const privacyPatchSchema = z.object({
  pronunciationPortfolioOptIn: z.boolean(),
});

export async function GET() {
  const session = await getCurrentSession();
  const learner = await loadLearner(session?.pseudonymId);
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
  try {
    const json = await req.json();
    const parsed = privacyPatchSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Configuração inválida." }, { status: 400 });
    }
    const session = await getCurrentSession();
    const learner = await loadLearner(session?.pseudonymId);
    const updated = await persistLearner(
      {
        ...learner,
        pronunciationPortfolioOptIn: parsed.data.pronunciationPortfolioOptIn,
      },
      session?.pseudonymId
    );
    return NextResponse.json({
      pronunciationPortfolioOptIn: updated.pronunciationPortfolioOptIn,
    });
  } catch {
    return NextResponse.json({ error: "Payload JSON inválido." }, { status: 400 });
  }
}

export async function DELETE() {
  const session = await getCurrentSession();
  await removeLearner(session?.pseudonymId);
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
