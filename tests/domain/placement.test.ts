import { describe, it, expect } from "vitest";
import { evaluatePlacement } from "@/lib/domain/placement";
import type { OnboardingInput } from "@/lib/domain/types";

describe("Placement & 16-Week Plan Engine", () => {
  it("recommends 22-25h/week for A0 learner and warns when available hours are below Cambridge reference", () => {
    const input: OnboardingInput = {
      displayName: "Ana",
      portugueseVariety: "pt-BR",
      selfReportedLevel: "A0",
      weeklyHoursAvailable: 10,
      speakingComfort: "low",
      prioritySituations: ["travel", "restaurants_services"],
      placementAnswers: {
        recognitionScore: 20,
        listeningScore: 15,
        speakingTranscripts: ["I workee in bank", "I like coffee"],
      },
    };

    const result = evaluatePlacement(input);

    expect(result.diagnosedCefr).toBe("A0");
    expect(result.recommendedWeeklyHours).toEqual({ min: 22, max: 25 });
    expect(result.hoursSufficiency).toBe("under_allocated");
    expect(result.honestExpectationMessage).toMatch(/22.*25/);
    expect(result.sixteenWeekPlan).toHaveLength(16);
    expect(result.diagnosedPhoneticTargets).toContain("final_consonant_epenthesis");
  });

  it("recommends 16-20h/week for A1 learner aiming for conversational B1", () => {
    const input: OnboardingInput = {
      displayName: "Carlos",
      portugueseVariety: "pt-BR",
      selfReportedLevel: "A1",
      weeklyHoursAvailable: 18,
      speakingComfort: "medium",
      prioritySituations: ["work_meetings", "travel"],
      placementAnswers: {
        recognitionScore: 52,
        listeningScore: 48,
        speakingTranscripts: [
          "Yesterday I worked with my team and we talked about the project.",
          "I think this option is better because it saves time.",
        ],
      },
    };

    const result = evaluatePlacement(input);

    expect(result.diagnosedCefr).toBe("A1");
    expect(result.recommendedTargetCefr).toBe("B1");
    expect(result.recommendedWeeklyHours).toEqual({ min: 16, max: 20 });
    expect(result.hoursSufficiency).toBe("aligned");
  });

  it("does not force PT-BR epenthesis stereotype onto PT-PT speakers when not observed", () => {
    const input: OnboardingInput = {
      displayName: "Beatriz",
      portugueseVariety: "pt-PT",
      selfReportedLevel: "A2",
      weeklyHoursAvailable: 12,
      speakingComfort: "high",
      prioritySituations: ["work_meetings"],
      placementAnswers: {
        recognitionScore: 72,
        listeningScore: 70,
        speakingTranscripts: [
          "I need to reschedule our meeting because my flight was delayed.",
        ],
      },
    };

    const result = evaluatePlacement(input);

    expect(result.diagnosedCefr).toBe("A2");
    expect(result.recommendedWeeklyHours).toEqual({ min: 10, max: 14 });
    expect(result.diagnosedPhoneticTargets).not.toContain(
      "final_consonant_epenthesis"
    );
  });

  it("generates an 8-block daily main session summing to target daily study minutes", () => {
    const input: OnboardingInput = {
      displayName: "Lucas",
      portugueseVariety: "pt-BR",
      selfReportedLevel: "A0",
      weeklyHoursAvailable: 24,
      speakingComfort: "low",
      prioritySituations: ["daily_life"],
      placementAnswers: {
        recognitionScore: 10,
        listeningScore: 10,
        speakingTranscripts: ["Hello my name is Lucas"],
      },
    };

    const result = evaluatePlacement(input);
    expect(result.dailyScheduleBlocks).toHaveLength(8);
    const totalMinutes = result.dailyScheduleBlocks.reduce(
      (sum, b) => sum + b.minutes,
      0
    );
    expect(totalMinutes).toBe(120);
  });
});
