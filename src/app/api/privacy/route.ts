import { NextResponse } from "next/server";
import { z } from "zod";
import {
  deleteLearnerState,
  getLearnerState,
  saveLearnerState,
} from "@/lib/db/repository";

const privacyPatchSchema = z.object({
  pronunciationPortfolioOptIn: z.boolean(),
});

export async function GET() {
  const learner = getLearnerState();
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
    const learner = getLearnerState();
    const updated = saveLearnerState({
      ...learner,
      pronunciationPortfolioOptIn: parsed.data.pronunciationPortfolioOptIn,
    });
    return NextResponse.json({
      pronunciationPortfolioOptIn: updated.pronunciationPortfolioOptIn,
    });
  } catch {
    return NextResponse.json({ error: "Payload JSON inválido." }, { status: 400 });
  }
}

export async function DELETE() {
  deleteLearnerState();
  return NextResponse.json({
    deleted: true,
    message: "Dados pessoais e perfil pseudônimo removidos em propagação completa.",
  });
}
