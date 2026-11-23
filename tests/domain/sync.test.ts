import { describe, it, expect } from "vitest";
import { mergeIdempotentEvents } from "@/lib/domain/sync";
import type { LearningEvent } from "@/lib/domain/types";

describe("Offline-First Idempotent Event Sync", () => {
  it("deduplicates events by eventId and preserves chronological order", () => {
    const existing: LearningEvent[] = [
      {
        eventId: "evt-1",
        pseudonymId: "user-1",
        eventType: "REVIEW_COMPLETED",
        payload: { nodeId: "chunk-1", correct: true },
        occurredAt: "2026-11-23T10:00:00.000Z",
      },
    ];

    const incoming: LearningEvent[] = [
      {
        eventId: "evt-1", // duplicate retry from offline queue
        pseudonymId: "user-1",
        eventType: "REVIEW_COMPLETED",
        payload: { nodeId: "chunk-1", correct: true },
        occurredAt: "2026-11-23T10:00:00.000Z",
      },
      {
        eventId: "evt-2",
        pseudonymId: "user-1",
        eventType: "TASK_ATTEMPTED",
        payload: { taskId: "hotel-problem" },
        occurredAt: "2026-11-23T10:05:00.000Z",
      },
    ];

    const result = mergeIdempotentEvents(existing, incoming);
    expect(result.acceptedCount).toBe(1);
    expect(result.duplicateCount).toBe(1);
    expect(result.events).toHaveLength(2);
    expect(result.events[1].eventId).toBe("evt-2");
  });
});
