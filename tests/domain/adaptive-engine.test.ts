import { describe, it, expect } from "vitest";
import {
  computePriorityScore,
  rankCompetencyNodes,
  applyReviewOutcome,
  computeMutScore,
  isNodeMastered,
  RETRIEVAL_STAGE_ORDER,
} from "@/lib/domain/adaptive-engine";
import type { CompetencyNode } from "@/lib/domain/types";

function makeNode(overrides: Partial<CompetencyNode> = {}): CompetencyNode {
  return {
    id: "chunk-hotel-1",
    type: "lexical_chunk",
    label: "Relatar problema no hotel",
    targetText: "There seems to be a problem with my room.",
    ptIntent: "Parece haver um problema com o meu quarto.",
    exampleContext: "Recepção de hotel",
    weekIntroduced: 8,
    masteryProbability: 0.4,
    forgettingRisk: 0.8,
    communicativeCost: 0.9,
    ptBrTransferRisk: 0.5,
    personalRelevance: 0.7,
    retrievalStage: "recognize",
    successfulSessions: 0,
    transferredInNovelContext: false,
    lastReviewedAt: null,
    nextReviewAt: "2026-11-23T00:00:00.000Z",
    errorHistory: [],
    ...overrides,
  };
}

describe("Adaptive Priority Engine & 6-Stage Productive SRS", () => {
  it("computes deterministic priority using 0.30R + 0.25G + 0.20C + 0.15T + 0.10U", () => {
    const node = makeNode({
      forgettingRisk: 0.8,
      masteryProbability: 0.4, // gap G = 0.6
      communicativeCost: 0.9,
      ptBrTransferRisk: 0.5,
      personalRelevance: 0.7,
    });

    // 0.30*0.8 + 0.25*0.6 + 0.20*0.9 + 0.15*0.5 + 0.10*0.7 = 0.24 + 0.15 + 0.18 + 0.075 + 0.07 = 0.715
    expect(computePriorityScore(node)).toBeCloseTo(0.715, 3);
  });

  it("ranks higher priority nodes first", () => {
    const low = makeNode({ id: "low", forgettingRisk: 0.1, masteryProbability: 0.9 });
    const high = makeNode({ id: "high", forgettingRisk: 0.95, masteryProbability: 0.2 });

    const ranked = rankCompetencyNodes([low, high]);
    expect(ranked[0].id).toBe("high");
    expect(ranked[1].id).toBe("low");
  });

  it("advances retrieval stage on fast unaided recall and penalizes slow or hinted responses", () => {
    const start = makeNode({ retrievalStage: "recognize", masteryProbability: 0.35 });

    const fastUnaided = applyReviewOutcome(start, {
      correct: true,
      responseTimeMs: 2200,
      usedHint: false,
      novelContext: false,
      nowIso: "2026-11-23T12:00:00.000Z",
    });

    expect(fastUnaided.retrievalStage).toBe(RETRIEVAL_STAGE_ORDER[1]); // "complete"
    expect(fastUnaided.masteryProbability).toBeGreaterThan(start.masteryProbability);
    expect(fastUnaided.successfulSessions).toBe(1);

    const hinted = applyReviewOutcome(start, {
      correct: true,
      responseTimeMs: 9500,
      usedHint: true,
      novelContext: false,
      nowIso: "2026-11-23T12:00:00.000Z",
    });

    expect(hinted.retrievalStage).toBe("recognize");
    expect(hinted.masteryProbability).toBeLessThan(fastUnaided.masteryProbability);
  });

  it("requires >1 successful session AND productive novel-context transfer before marking mastered", () => {
    const singleSession = makeNode({
      masteryProbability: 0.92,
      successfulSessions: 1,
      transferredInNovelContext: true,
    });
    expect(isNodeMastered(singleSession)).toBe(false);

    const noTransfer = makeNode({
      masteryProbability: 0.92,
      successfulSessions: 3,
      transferredInNovelContext: false,
    });
    expect(isNodeMastered(noTransfer)).toBe(false);

    const mastered = makeNode({
      masteryProbability: 0.85,
      successfulSessions: 2,
      transferredInNovelContext: true,
    });
    expect(isNodeMastered(mastered)).toBe(true);
  });

  it("calculates MUT (Mastery Under Transfer) as ratio of unaided novel-context targets", () => {
    const nodes = [
      makeNode({ id: "1", masteryProbability: 0.85, successfulSessions: 2, transferredInNovelContext: true }),
      makeNode({ id: "2", masteryProbability: 0.9, successfulSessions: 3, transferredInNovelContext: false }),
      makeNode({ id: "3", masteryProbability: 0.82, successfulSessions: 2, transferredInNovelContext: true }),
      makeNode({ id: "4", masteryProbability: 0.4, successfulSessions: 1, transferredInNovelContext: false }),
    ];

    expect(computeMutScore(nodes)).toBeCloseTo(0.5, 2);
  });
});
