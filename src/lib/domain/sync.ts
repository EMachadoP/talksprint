import type { LearningEvent } from "./types";

export interface SyncMergeResult {
  events: LearningEvent[];
  acceptedCount: number;
  duplicateCount: number;
}

export function mergeIdempotentEvents(
  existing: LearningEvent[],
  incoming: LearningEvent[]
): SyncMergeResult {
  const seen = new Set(existing.map((e) => e.eventId));
  const accepted: LearningEvent[] = [];
  let duplicateCount = 0;

  for (const evt of incoming) {
    if (seen.has(evt.eventId)) {
      duplicateCount += 1;
      continue;
    }
    seen.add(evt.eventId);
    accepted.push(evt);
  }

  const merged = [...existing, ...accepted].sort((a, b) =>
    a.occurredAt.localeCompare(b.occurredAt)
  );

  return {
    events: merged,
    acceptedCount: accepted.length,
    duplicateCount,
  };
}
