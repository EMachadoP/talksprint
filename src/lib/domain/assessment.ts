import { callGeminiJson, hasGeminiKey } from "@/lib/ai/gemini";
import { CONVERSATION_MISSIONS } from "./curriculum";
import type {
  CefrLevel,
  CefrRubricDimensions,
  CheckpointEvaluation,
  LearningEvent,
} from "./types";

export function computeReal7DayRetention(events: LearningEvent[]): number {
  const cutoff = Date.now() - 7 * 86400 * 1000;
  const recentReviews = events.filter(
    (e) =>
      e.eventType === "REVIEW_COMPLETED" &&
      new Date(e.occurredAt).getTime() >= cutoff
  );
  if (recentReviews.length === 0) return 0;
  const passed = recentReviews.filter((e) => Boolean(e.payload?.correct)).length;
  return Math.round((passed / recentReviews.length) * 100);
}

export interface CheckpointInput {
  weekNumber: number;
  trainedTaskId: string;
  userResponseText: string;
  listeningCorrectRatio: number; // 0..1
  mutScore: number; // 0..1
  retention7DayPercent: number; // 0..100
  pronunciationMasteredCount: number;
  pronunciationTotalCount: number;
}

export function pickNovelCheckpointTask(trainedTaskId: string): {
  id: string;
  title: string;
  prompt: string;
} {
  const trained = CONVERSATION_MISSIONS.find((m) => m.id === trainedTaskId);
  const paired = trained
    ? CONVERSATION_MISSIONS.find((m) => m.id === trained.novelTransferPairId)
    : undefined;

  const novel =
    paired ??
    CONVERSATION_MISSIONS.find((m) => m.id !== trainedTaskId) ??
    CONVERSATION_MISSIONS[0];

  return {
    id: novel.id,
    title: novel.title,
    prompt: `${novel.situation} Missão inédita: ${novel.taskGoal}`,
  };
}

function estimateCefrFromScore(score: number): CefrLevel {
  if (score < 35) return "A0";
  if (score < 55) return "A1";
  if (score < 74) return "A2";
  if (score < 89) return "B1";
  return "B2";
}

export function evaluateCheckpoint(input: CheckpointInput): CheckpointEvaluation {
  const novelTask = pickNovelCheckpointTask(input.trainedTaskId);
  const text = input.userResponseText.trim();
  const words = text.split(/\s+/).filter(Boolean);
  const uniqueWords = new Set(words.map((w) => w.toLowerCase().replace(/[^a-z']/g, "")));

  const hasPoliteRequest = /\b(could|would|please|excuse me|appreciate)\b/i.test(text);
  const hasConnector = /\b(because|although|however|while|so|if|yesterday)\b/i.test(text);
  const hasQuestion = text.includes("?");
  const hasMajorError = /\bno have\b|\bwant change\b/i.test(text);

  const taskCompletion = Math.min(
    100,
    Math.round(40 + Math.min(35, words.length * 1.4) + (hasPoliteRequest ? 15 : 0) + (hasQuestion ? 10 : 0))
  );
  const comprehensibility = Math.min(
    100,
    Math.round(55 + Math.min(30, words.length * 1.1) - (hasMajorError ? 18 : 0) + 10)
  );
  const interaction = Math.min(
    100,
    Math.round(45 + (hasQuestion ? 25 : 0) + (hasPoliteRequest ? 20 : 0))
  );
  const fluency = Math.min(100, Math.round(38 + Math.min(52, words.length * 2.1)));
  const accuracy = Math.min(
    100,
    Math.round(62 + (hasConnector ? 18 : 0) - (hasMajorError ? 24 : 0) + 8)
  );
  const range = Math.min(100, Math.round(35 + uniqueWords.size * 2.4));
  const pronunciation = Math.min(
    100,
    Math.round(
      input.pronunciationTotalCount > 0
        ? 45 + (input.pronunciationMasteredCount / input.pronunciationTotalCount) * 50
        : 65
    )
  );
  const listening = Math.min(100, Math.round(input.listeningCorrectRatio * 100));

  const dimensions: CefrRubricDimensions = {
    taskCompletion,
    comprehensibility,
    interaction,
    fluency,
    accuracy,
    range,
    pronunciation,
    listening,
  };

  const values = Object.values(dimensions);
  const overallScore = Math.round(
    values.reduce((acc, v) => acc + v, 0) / values.length
  );
  const estimatedCefr = estimateCefrFromScore(overallScore);

  // Identify biggest gap dynamically from lowest rubric dimension
  const dimensionLabels: Record<keyof CefrRubricDimensions, string> = {
    taskCompletion: "cumprimento completo da tarefa comunicativa",
    comprehensibility: "clareza e compreensibilidade imediata",
    interaction: "perguntas de seguimento e tomada de turno",
    fluency: "continuidade e redução de pausas",
    accuracy: "precisão gramatical (passado e auxiliares)",
    range: "variedade de chunks e conectores",
    pronunciation: "alvos fonéticos contrastivos",
    listening: "compreensão de fala natural conectada",
  };
  const lowestKey = (Object.keys(dimensions) as Array<keyof CefrRubricDimensions>).sort(
    (a, b) => dimensions[a] - dimensions[b]
  )[0];

  return {
    weekNumber: input.weekNumber,
    trainedTaskId: input.trainedTaskId,
    novelTaskId: novelTask.id,
    novelTaskTitle: novelTask.title,
    dimensions,
    overallScore,
    estimatedCefr,
    mutScore: Number(input.mutScore.toFixed(3)),
    asrSeparatedFromRubric: true,
    weeklyCapabilitySummary: {
      canDoNow: `Conduzir "${novelTask.title}" em cenário inédito sem roteiro prévio.`,
      listeningLevel: estimateCefrFromScore(listening),
      interactionLevel: estimateCefrFromScore(interaction),
      pronunciationTargetsMastered: `${input.pronunciationMasteredCount} de ${input.pronunciationTotalCount} alvos dominados`,
      retention7DayPercent: Math.round(input.retention7DayPercent),
      biggestGap: dimensionLabels[lowestKey],
      nextMission:
        input.weekNumber < 16
          ? `Avançar para a Semana ${input.weekNumber + 1} com foco em ${dimensionLabels[lowestKey]}.`
          : "Consolidar bateria final B1 conversacional.",
    },
  };
}

export async function evaluateCheckpointWithGemini(
  input: CheckpointInput
): Promise<CheckpointEvaluation> {
  const baseline = evaluateCheckpoint(input);
  if (!hasGeminiKey() || process.env.VITEST === "true") {
    return baseline;
  }

  const systemPrompt = [
    "You are a certified CEFR oral/written assessor evaluating a novel transfer task (separate from ASR).",
    `Week: ${input.weekNumber}. Novel task: "${baseline.novelTaskTitle}".`,
    "Score each of the 8 CEFR dimensions from 0 to 100 honestly based ONLY on the learner's actual response.",
    'Return strict JSON: {"dimensions": {"taskCompletion": number, "comprehensibility": number, "interaction": number, "fluency": number, "accuracy": number, "range": number, "pronunciation": number, "listening": number}, "canDoNow": string (Portuguese), "biggestGap": string (Portuguese), "nextMission": string (Portuguese)}.',
  ].join("\n");

  const ai = await callGeminiJson<{
    dimensions?: CefrRubricDimensions;
    canDoNow?: string;
    biggestGap?: string;
    nextMission?: string;
  }>(systemPrompt, [{ text: `Learner response: "${input.userResponseText}"` }], 0.2);

  if (!ai?.dimensions) return baseline;

  const vals = Object.values(ai.dimensions);
  if (vals.length !== 8 || vals.some((v) => typeof v !== "number")) {
    return baseline;
  }

  const overallScore = Math.round(vals.reduce((a, b) => a + b, 0) / 8);
  const estimatedCefr = estimateCefrFromScore(overallScore);

  return {
    ...baseline,
    dimensions: ai.dimensions,
    overallScore,
    estimatedCefr,
    weeklyCapabilitySummary: {
      ...baseline.weeklyCapabilitySummary,
      canDoNow: ai.canDoNow || baseline.weeklyCapabilitySummary.canDoNow,
      biggestGap: ai.biggestGap || baseline.weeklyCapabilitySummary.biggestGap,
      nextMission: ai.nextMission || baseline.weeklyCapabilitySummary.nextMission,
    },
  };
}
