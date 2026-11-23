"use client";

import type { LearningEventType } from "@/lib/domain/types";

export interface QueuedOfflineEvent {
  eventId: string;
  eventType: LearningEventType;
  payload: Record<string, unknown>;
  occurredAt: string;
}

const QUEUE_KEY = "talksprint_offline_event_queue_v1";

export function readOfflineQueue(): QueuedOfflineEvent[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(QUEUE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function enqueueOfflineEvent(
  eventType: LearningEventType,
  payload: Record<string, unknown>
): QueuedOfflineEvent {
  const evt: QueuedOfflineEvent = {
    eventId:
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `evt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    eventType,
    payload,
    occurredAt: new Date().toISOString(),
  };

  if (typeof window !== "undefined") {
    const next = [...readOfflineQueue(), evt];
    window.localStorage.setItem(QUEUE_KEY, JSON.stringify(next));
  }
  return evt;
}

export async function flushOfflineQueue(): Promise<{
  synced: number;
  remaining: number;
}> {
  const queue = readOfflineQueue();
  if (queue.length === 0) return { synced: 0, remaining: 0 };

  try {
    const res = await fetch("/api/sync", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ events: queue }),
    });
    if (!res.ok) {
      return { synced: 0, remaining: queue.length };
    }
    window.localStorage.setItem(QUEUE_KEY, JSON.stringify([]));
    return { synced: queue.length, remaining: 0 };
  } catch {
    return { synced: 0, remaining: queue.length };
  }
}
