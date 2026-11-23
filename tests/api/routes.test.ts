import { describe, it, expect } from "vitest";
import { GET as healthGet } from "@/app/api/health/route";
import { POST as onboardingPost } from "@/app/api/onboarding/route";
import { POST as srsReviewPost } from "@/app/api/srs/review/route";
import { POST as conversationPost } from "@/app/api/conversation/route";
import { POST as pronunciationPost } from "@/app/api/pronunciation/route";
import { POST as syncPost } from "@/app/api/sync/route";

describe("TalkSprint API Route Handlers", () => {
  it("GET /api/health returns ok status", async () => {
    const res = await healthGet();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe("ok");
  });

  it("POST /api/onboarding validates input with Zod and creates learner plan", async () => {
    const badReq = new Request("http://localhost/api/onboarding", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ displayName: "" }),
    });
    const badRes = await onboardingPost(badReq);
    expect(badRes.status).toBe(400);

    const goodReq = new Request("http://localhost/api/onboarding", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        displayName: "Marina",
        portugueseVariety: "pt-BR",
        selfReportedLevel: "A1",
        weeklyHoursAvailable: 18,
        speakingComfort: "medium",
        prioritySituations: ["travel", "work_meetings"],
        placementAnswers: {
          recognitionScore: 55,
          listeningScore: 50,
          speakingTranscripts: ["I workee in a tech company"],
        },
      }),
    });
    const goodRes = await onboardingPost(goodReq);
    expect(goodRes.status).toBe(200);
    const body = await goodRes.json();
    expect(body.placement.diagnosedCefr).toBe("A1");
    expect(body.learner.pseudonymId).toBeTruthy();
  });

  it("POST /api/srs/review updates mastery and returns recalculated MUT", async () => {
    const req = new Request("http://localhost/api/srs/review", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        nodeId: "chunk-hotel-problem",
        correct: true,
        responseTimeMs: 2800,
        usedHint: false,
        novelContext: true,
      }),
    });
    const res = await srsReviewPost(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.updatedNode.transferredInNovelContext).toBe(true);
    expect(typeof body.mutScore).toBe("number");
  });

  it("POST /api/conversation returns selective feedback and second attempt prompt", async () => {
    const req = new Request("http://localhost/api/conversation", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        utterance: "Yesterday I go to reception and room no have water.",
        mode: "partner",
        taskId: "hotel-problem",
        turnNumber: 1,
      }),
    });
    const res = await conversationPost(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.feedbackTargets.length).toBeLessThanOrEqual(2);
    expect(body.requiresSecondAttempt).toBe(true);
  });

  it("POST /api/pronunciation enforces LGPD audio discard by default", async () => {
    const req = new Request("http://localhost/api/pronunciation", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        targetPhrase: "I work with a marketing team.",
        transcript: "I workee with a marketing team",
      }),
    });
    const res = await pronunciationPost(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.rawAudioRetained).toBe(false);
    expect(body.priorityIssues.length).toBeGreaterThanOrEqual(1);
  });

  it("POST /api/sync deduplicates idempotent offline events", async () => {
    const event = {
      eventId: "11111111-1111-4111-8111-111111111111",
      eventType: "LESSON_COMPLETED",
      payload: { lessonId: "week-1-hotel" },
      occurredAt: "2026-11-23T11:00:00.000Z",
    };

    const req1 = new Request("http://localhost/api/sync", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ events: [event] }),
    });
    const res1 = await syncPost(req1);
    expect(res1.status).toBe(200);
    const body1 = await res1.json();
    expect(body1.acceptedCount).toBe(1);

    const req2 = new Request("http://localhost/api/sync", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ events: [event] }),
    });
    const res2 = await syncPost(req2);
    const body2 = await res2.json();
    expect(body2.duplicateCount).toBe(1);
  });
});
