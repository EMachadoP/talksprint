import type {
  CompetencyNode,
  RetrievalStage,
  ReviewOutcomeInput,
} from "./types";

export const RETRIEVAL_STAGE_ORDER: RetrievalStage[] = [
  "recognize",
  "complete",
  "cued_recall",
  "intent_to_english",
  "sentence_use",
  "unpredictable_conversation",
];

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, Number(value.toFixed(4))));
}

/**
 * Deterministic, auditable priority formula:
 * Prioridade_i = 0.30*R + 0.25*G + 0.20*C + 0.15*T + 0.10*U
 * where G = 1 - masteryProbability (mastery gap).
 */
export function computePriorityScore(node: CompetencyNode): number {
  const R = clamp01(node.forgettingRisk);
  const G = clamp01(1 - node.masteryProbability);
  const C = clamp01(node.communicativeCost);
  const T = clamp01(node.ptBrTransferRisk);
  const U = clamp01(node.personalRelevance);

  return Number((0.3 * R + 0.25 * G + 0.2 * C + 0.15 * T + 0.1 * U).toFixed(4));
}

export function rankCompetencyNodes(nodes: CompetencyNode[]): CompetencyNode[] {
  return [...nodes].sort((a, b) => computePriorityScore(b) - computePriorityScore(a));
}

/**
 * An item is only marked "mastered" after:
 *  - masteryProbability >= 0.80
 *  - retrieved successfully across > 1 session
 *  - productively transferred in a novel context
 */
export function isNodeMastered(node: CompetencyNode): boolean {
  return (
    node.masteryProbability >= 0.8 &&
    node.successfulSessions > 1 &&
    node.transferredInNovelContext
  );
}

/**
 * MUT (Mastery Under Transfer) = unaided novel-context mastered targets / evaluated targets
 */
export function computeMutScore(nodes: CompetencyNode[]): number {
  if (nodes.length === 0) return 0;
  const masteredCount = nodes.filter(isNodeMastered).length;
  return Number((masteredCount / nodes.length).toFixed(3));
}

export function applyReviewOutcome(
  node: CompetencyNode,
  outcome: ReviewOutcomeInput
): CompetencyNode {
  const now = outcome.nowIso ? new Date(outcome.nowIso) : new Date();
  const currentStageIdx = RETRIEVAL_STAGE_ORDER.indexOf(node.retrievalStage);

  let nextMastery = node.masteryProbability;
  let nextForgetting = node.forgettingRisk;
  let nextStageIdx = currentStageIdx;
  let nextSuccessfulSessions = node.successfulSessions;
  let nextTransferred = node.transferredInNovelContext;
  let intervalHours = 6;

  if (!outcome.correct) {
    nextMastery = clamp01(node.masteryProbability - 0.18);
    nextForgetting = clamp01(Math.max(0.85, node.forgettingRisk + 0.25));
    nextStageIdx = Math.max(0, currentStageIdx - 1);
    intervalHours = 2; // return within hours
  } else {
    const fastResponse = outcome.responseTimeMs <= 4500;
    const moderateResponse = outcome.responseTimeMs <= 8000;

    if (outcome.usedHint) {
      nextMastery = clamp01(node.masteryProbability + 0.05);
      nextForgetting = clamp01(node.forgettingRisk - 0.08);
      intervalHours = 8; // keep same stage, review soon
    } else {
      const speedBonus = fastResponse ? 0.16 : moderateResponse ? 0.11 : 0.07;
      const transferBonus = outcome.novelContext ? 0.08 : 0;
      nextMastery = clamp01(node.masteryProbability + speedBonus + transferBonus);
      nextForgetting = clamp01(node.forgettingRisk - (fastResponse ? 0.28 : 0.16));
      nextSuccessfulSessions += 1;

      if (fastResponse || outcome.novelContext) {
        nextStageIdx = Math.min(RETRIEVAL_STAGE_ORDER.length - 1, currentStageIdx + 1);
      }
      if (outcome.novelContext) {
        nextTransferred = true;
      }

      // Multi-scale spacing: hours -> days -> weeks -> month
      const scaleHours = [6, 24, 72, 168, 336, 720];
      intervalHours = scaleHours[Math.min(scaleHours.length - 1, nextSuccessfulSessions)];
    }
  }

  const nextReviewDate = new Date(now.getTime() + intervalHours * 3600 * 1000);

  return {
    ...node,
    masteryProbability: nextMastery,
    forgettingRisk: nextForgetting,
    retrievalStage: RETRIEVAL_STAGE_ORDER[nextStageIdx],
    successfulSessions: nextSuccessfulSessions,
    transferredInNovelContext: nextTransferred,
    lastReviewedAt: now.toISOString(),
    nextReviewAt: nextReviewDate.toISOString(),
  };
}
