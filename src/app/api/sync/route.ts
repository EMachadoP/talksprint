import { NextResponse } from "next/server";
import { z } from "zod";
import { mergeIdempotentEvents } from "@/lib/domain/sync";
import { loadLearner, persistLearner } from "@/lib/db/repository";
import { getCurrentSession } from "@/lib/auth/session";

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

    const session = await getCurrentSession();
    const learner = await loadLearner(session?.pseudonymId);
    const incoming = parsed.data.events.map((e) => ({
      ...e,
      pseudonymId: learner.pseudonymId,
    }));

    const merged = mergeIdempotentEvents(learner.events, incoming);
    await persistLearner({ ...learner, events: merged.events }, session?.pseudonymId);

    return NextResponse.json({
      acceptedCount: merged.acceptedCount,
      duplicateCount: merged.duplicateCount,
      totalEvents: merged.events.length,
    });
  } catch {
    return NextResponse.json({ error: "Payload JSON inválido." }, { status: 400 });
  }
}
