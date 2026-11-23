import { NextResponse } from "next/server";
import { z } from "zod";
import { CONVERSATION_MISSIONS } from "@/lib/domain/curriculum";
import { generateTutorTurn } from "@/lib/domain/tutor-orchestrator";
import { getLearnerState, saveLearnerState } from "@/lib/db/repository";
import { checkRateLimit } from "@/lib/security/rate-limit";

const conversationSchema = z.object({
  utterance: z.string().trim().min(1).max(800),
  mode: z.enum(["coach", "partner", "examiner"]).default("partner"),
  taskId: z.string().min(1),
  turnNumber: z.number().int().min(1).max(50).default(1),
  isSecondAttempt: z.boolean().optional(),
});

export async function POST(req: Request) {
  const limit = checkRateLimit("api:conversation", 45, 60_000);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Limite de requisições atingido. Aguarde alguns segundos." },
      { status: 429 }
    );
  }

  try {
    const json = await req.json();
    const parsed = conversationSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Entrada de conversação inválida.", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const learner = getLearnerState();
    const mission =
      CONVERSATION_MISSIONS.find((m) => m.id === parsed.data.taskId) ??
      CONVERSATION_MISSIONS[0];

    const response = await generateTutorTurn(parsed.data.utterance, {
      mode: parsed.data.mode,
      taskId: mission.id,
      taskGoal: mission.taskGoal,
      learnerLevel: learner.currentCefr,
      portugueseVariety: learner.portugueseVariety,
      allowedVocabulary: mission.allowedVocabulary,
      targetStructures: mission.targetStructures,
      knownErrors: learner.diagnosedPhoneticTargets,
      turnNumber: parsed.data.turnNumber,
      isSecondAttempt: parsed.data.isSecondAttempt,
    });

    saveLearnerState({
      ...learner,
      conversationMinutes: learner.conversationMinutes + 2,
    });

    return NextResponse.json(response);
  } catch {
    return NextResponse.json({ error: "Payload JSON inválido." }, { status: 400 });
  }
}
