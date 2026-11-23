import { describe, it, expect } from "vitest";
import { analyzePronunciation } from "@/lib/domain/pronunciation";

describe("PT-BR Contrastive Pronunciation Pipeline", () => {
  it("detects PT-BR final consonant epenthesis (e.g. workee) and limits feedback to max 2 priority issues", () => {
    const result = analyzePronunciation({
      targetPhrase: "I work with a marketing team and I stopped early.",
      transcript: "I workee wit a marketing team and I stoppee early",
      portugueseVariety: "pt-BR",
      portfolioOptIn: false,
    });

    expect(result.priorityIssues.length).toBeGreaterThanOrEqual(1);
    expect(result.priorityIssues.length).toBeLessThanOrEqual(2);
    expect(
      result.priorityIssues.some((i) => i.targetId === "final_consonant_epenthesis")
    ).toBe(true);
    expect(result.rawAudioRetained).toBe(false);
    expect(result.privacyNotice).toMatch(/descartado/i);
    expect(result.shouldScheduleSrs).toBe(true);
  });

  it("respects explicit pronunciation portfolio opt-in flag", () => {
    const result = analyzePronunciation({
      targetPhrase: "I think this works well.",
      transcript: "I think this works well",
      portugueseVariety: "pt-BR",
      portfolioOptIn: true,
    });

    expect(result.rawAudioRetained).toBe(true);
    expect(result.intelligibilityScore).toBeGreaterThanOrEqual(85);
  });

  it("detects -ed omission when past tense ending is dropped", () => {
    const result = analyzePronunciation({
      targetPhrase: "Yesterday I worked and talked with my manager.",
      transcript: "Yesterday I work and talk with my manager",
      portugueseVariety: "pt-BR",
      portfolioOptIn: false,
    });

    expect(
      result.priorityIssues.some((i) => i.targetId === "ed_s_endings")
    ).toBe(true);
  });
});
