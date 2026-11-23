import { describe, it, expect } from "vitest";
import { evaluateCheckpoint, pickNovelCheckpointTask } from "@/lib/domain/assessment";

describe("Multidimensional CEFR Assessment & Novel Transfer Checkpoints", () => {
  it("always selects a novel task different from the trained task to prevent score inflation", () => {
    const novel = pickNovelCheckpointTask("hotel-problem");
    expect(novel.id).not.toBe("hotel-problem");
    expect(novel.title.length).toBeGreaterThan(5);
  });

  it("evaluates 8 CEFR dimensions separately from ASR and produces capability-oriented weekly summary", () => {
    const evaluation = evaluateCheckpoint({
      weekNumber: 8,
      trainedTaskId: "hotel-problem",
      userResponseText:
        "Excuse me, there seems to be a mistake with my reservation. I booked a table for four people yesterday, could you check if another table is available?",
      listeningCorrectRatio: 0.8,
      mutScore: 0.72,
      retention7DayPercent: 84,
      pronunciationMasteredCount: 3,
      pronunciationTotalCount: 5,
    });

    expect(evaluation.asrSeparatedFromRubric).toBe(true);
    expect(Object.keys(evaluation.dimensions)).toHaveLength(8);
    expect(evaluation.novelTaskId).not.toBe("hotel-problem");
    expect(evaluation.weeklyCapabilitySummary.canDoNow).toBeTruthy();
    expect(evaluation.weeklyCapabilitySummary.retention7DayPercent).toBe(84);
  });
});
