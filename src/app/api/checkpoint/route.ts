import { NextResponse } from "next/server";
import { z } from "zod";
import {
  computeReal7DayRetention,
  evaluateCheckpointWithGemini,
} from "@/lib/domain/assessment";
import { computeMutScore } from "@/lib/domain/adaptive-engine";
import { loadLearner, persistLearner } from "@/lib/db/repository";
import { getCurrentSession } from "@/lib/auth/session";
import { checkRateLimit, getClientIp } from "@/lib/security/rate-limit";
import { verifyCsrfOrigin } from "@/lib/security/csrf";

const checkpointSchema = z.object({
  weekNumber: z.number().int().min(1).max(16),
  trainedTaskId: z.string().min(1).max(80),
  userResponseText: z.string().trim().min(5).max(1500),
  listeningCorrectRatio: z.number().min(0).max(1).default(0.8),
});

export async function POST(req: Request) {
  const csrf = verifyCsrfOrigin(req);
  if (!csrf.ok) {
    return NextResponse.json({ error: "Requisição cross-site bloqueada." }, { status: 403 });
  }

  const session = await getCurrentSession(req);
  if (!session) {
    return NextResponse.json(
      { error: "Autenticação obrigatória para avaliação de checkpoint CEFR." },
      { status: 401 }
    );
  }

  const limit = checkRateLimit(
    `api:checkpoint:${session.pseudonymId}:${getClientIp(req)}`,
    10,
    60_000
  );
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Limite de avaliações atingido. Aguarde 1 minuto." },
      { status: 429 }
    );
  }

  try {
    const json = await req.json();
    const parsed = checkpointSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Dados de checkpoint inválidos.", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const learner = await loadLearner(session.pseudonymId);
    const mutScore = computeMutScore(learner.nodes);
    const retention7DayPercent = computeReal7DayRetention(learner.events);

    const evaluation = await evaluateCheckpointWithGemini({
      weekNumber: parsed.data.weekNumber,
      trainedTaskId: parsed.data.trainedTaskId,
      userResponseText: parsed.data.userResponseText,
      listeningCorrectRatio: parsed.data.listeningCorrectRatio,
      mutScore,
      retention7DayPercent,
      pronunciationMasteredCount: Math.max(0, 5 - learner.diagnosedPhoneticTargets.length),
      pronunciationTotalCount: 5,
    });

    await persistLearner(
      {
        ...learner,
        currentCefr: evaluation.estimatedCefr,
        checkpoints: [evaluation, ...learner.checkpoints].slice(0, 16),
      },
      session.pseudonymId
    );

    return NextResponse.json(evaluation);
  } catch {
    return NextResponse.json({ error: "Payload JSON inválido." }, { status: 400 });
  }
}
