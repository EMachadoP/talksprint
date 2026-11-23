import { describe, it, expect } from "vitest";
import { generateTutorTurn } from "@/lib/domain/tutor-orchestrator";

describe("Vendor-Neutral AI Tutor Orchestrator", () => {
  it("returns selective corrective feedback (max 2 targets) and triggers second attempt when priority errors occur", async () => {
    const res = await generateTutorTurn(
      "I have a problem, yesterday I go to reception and the room no have water.",
      {
        mode: "partner",
        taskId: "hotel-problem",
        taskGoal: "Resolver um problema no quarto de hotel",
        learnerLevel: "A2",
        portugueseVariety: "pt-BR",
        allowedVocabulary: ["room", "reception", "problem", "water"],
        targetStructures: ["past simple", "There seems to be..."],
        knownErrors: ["past tense omission"],
        turnNumber: 1,
      }
    );

    expect(res.feedbackTargets.length).toBeGreaterThanOrEqual(1);
    expect(res.feedbackTargets.length).toBeLessThanOrEqual(2);
    expect(res.requiresSecondAttempt).toBe(true);
    expect(res.secondAttemptPrompt).toBeTruthy();
    expect(res.helpInPortuguese).toBeNull(); // partner stays in English
  });

  it("provides Portuguese support in Coach mode and withholds mid-task help/feedback in Examiner mode", async () => {
    const coachRes = await generateTutorTurn("I want change room please", {
      mode: "coach",
      taskId: "hotel-problem",
      taskGoal: "Resolver um problema no quarto de hotel",
      learnerLevel: "A1",
      portugueseVariety: "pt-BR",
      allowedVocabulary: ["room", "change"],
      targetStructures: ["Could I..."],
      knownErrors: [],
      turnNumber: 1,
    });
    expect(coachRes.helpInPortuguese).toBeTruthy();

    const examinerRes = await generateTutorTurn("I want change room please", {
      mode: "examiner",
      taskId: "hotel-problem",
      taskGoal: "Resolver um problema no quarto de hotel",
      learnerLevel: "A1",
      portugueseVariety: "pt-BR",
      allowedVocabulary: ["room", "change"],
      targetStructures: ["Could I..."],
      knownErrors: [],
      turnNumber: 1,
    });
    expect(examinerRes.helpInPortuguese).toBeNull();
    expect(examinerRes.feedbackTargets).toHaveLength(0); // Examiner gives feedback only at end
  });
});
