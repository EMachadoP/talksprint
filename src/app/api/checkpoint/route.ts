import { NextResponse } from "next/server";
import { z } from "zod";
import { evaluateCheckpoint } from "@/lib/domain/assessment";
import { computeMutScore } from "@/lib/domain/adaptive-engine";
import { getLearnerState, saveLearnerState } from "@/lib/db/repository";

const checkpointSchema = z.object({
  weekNumber: z.number().int().min(1).max(16),
  trainedTaskId: z.string().min(1),
  userResponseText: z.string().trim().min(5).max(1500),
  listeningCorrectRatio: z.number().min(0).max(1).default(0.8),
});

export async function POST(req: Request) {
  try {
    const json = await req.json();
    const parsed = checkpointSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Dados de checkpoint inválidos.", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const learner = getLearnerState();
    const mutScore = computeMutScore(learner.nodes);
    const evaluation = evaluateCheckpoint({
      weekNumber: parsed.data.weekNumber,
      trainedTaskId: parsed.data.trainedTaskId,
      userResponseText: parsed.data.userResponseText,
      listeningCorrectRatio: parsed.data.listeningCorrectRatio,
      mutScore,
      retention7DayPercent: 84,
      pronunciationMasteredCount: Math.max(1, 5 - learner.diagnosedPhoneticTargets.length),
      pronunciationTotalCount: 5,
    });

    saveLearnerState({
      ...learner,
      currentCefr: evaluation.estimatedCefr,
      checkpoints: [evaluation, ...learner.checkpoints].slice(0, 16),
    });

    return NextResponse.json(evaluation);
  } catch {
    return NextResponse.json({ error: "Payload JSON inválido." }, { status: 400 });
  }
}
