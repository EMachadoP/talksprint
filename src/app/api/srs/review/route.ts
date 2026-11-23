import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { loadLearner, persistLearner } from "@/lib/db/repository";
import { getCurrentSession } from "@/lib/auth/session";
import {
  applyReviewOutcome,
  computeMutScore,
  computePriorityScore,
} from "@/lib/domain/adaptive-engine";

const reviewSchema = z.object({
  nodeId: z.string().min(1),
  correct: z.boolean(),
  responseTimeMs: z.number().min(100).max(120_000),
  usedHint: z.boolean(),
  novelContext: z.boolean().default(false),
});

export async function POST(req: Request) {
  try {
    const json = await req.json();
    const parsed = reviewSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Payload de revisão inválido.", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const session = await getCurrentSession();
    const learner = await loadLearner(session?.pseudonymId);
    const idx = learner.nodes.findIndex((n) => n.id === parsed.data.nodeId);
    if (idx === -1) {
      return NextResponse.json({ error: "Item não encontrado." }, { status: 404 });
    }

    const updatedNode = applyReviewOutcome(learner.nodes[idx], {
      correct: parsed.data.correct,
      responseTimeMs: parsed.data.responseTimeMs,
      usedHint: parsed.data.usedHint,
      novelContext: parsed.data.novelContext,
    });

    const nextNodes = [...learner.nodes];
    nextNodes[idx] = updatedNode;

    const reviewEvent = {
      eventId: crypto.randomUUID(),
      pseudonymId: learner.pseudonymId,
      eventType: "REVIEW_COMPLETED" as const,
      payload: {
        nodeId: updatedNode.id,
        correct: parsed.data.correct,
        responseTimeMs: parsed.data.responseTimeMs,
        usedHint: parsed.data.usedHint,
        novelContext: parsed.data.novelContext,
      },
      occurredAt: new Date().toISOString(),
    };

    await persistLearner(
      {
        ...learner,
        nodes: nextNodes,
        events: [...learner.events, reviewEvent],
      },
      session?.pseudonymId
    );

    return NextResponse.json({
      updatedNode: {
        ...updatedNode,
        priorityScore: computePriorityScore(updatedNode),
      },
      mutScore: computeMutScore(nextNodes),
    });
  } catch {
    return NextResponse.json({ error: "Payload JSON inválido." }, { status: 400 });
  }
}
