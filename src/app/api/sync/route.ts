import { NextResponse } from "next/server";
import { z } from "zod";
import { mergeIdempotentEvents } from "@/lib/domain/sync";
import { getLearnerState, saveLearnerState } from "@/lib/db/repository";

const syncSchema = z.object({
  events: z
    .array(
      z.object({
        eventId: z.string().min(4).max(100),
        eventType: z.enum([
          "REVIEW_COMPLETED",
          "TASK_ATTEMPTED",
          "ITEM_RECALLED",
          "AUDIO_RECORDED",
          "LESSON_COMPLETED",
          "CHECKPOINT_COMPLETED",
        ]),
        payload: z.record(z.unknown()),
        occurredAt: z.string().datetime(),
      })
    )
    .max(100),
});

export async function POST(req: Request) {
  try {
    const json = await req.json();
    const parsed = syncSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Fila de eventos inválida.", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const learner = getLearnerState();
    const incoming = parsed.data.events.map((e) => ({
      ...e,
      pseudonymId: learner.pseudonymId,
    }));

    const merged = mergeIdempotentEvents(learner.events, incoming);
    saveLearnerState({ ...learner, events: merged.events });

    return NextResponse.json({
      acceptedCount: merged.acceptedCount,
      duplicateCount: merged.duplicateCount,
      totalEvents: merged.events.length,
    });
  } catch {
    return NextResponse.json({ error: "Payload JSON inválido." }, { status: 400 });
  }
}
