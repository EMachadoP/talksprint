import { CONVERSATION_MISSIONS } from "./curriculum";
import type {
  CefrLevel,
  CefrRubricDimensions,
  CheckpointEvaluation,
} from "./types";

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
