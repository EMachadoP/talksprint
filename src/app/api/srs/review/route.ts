import { NextResponse } from "next/server";
import { z } from "zod";
import { getLearnerState, saveLearnerState } from "@/lib/db/repository";
import { applyReviewOutcome, computeMutScore, computePriorityScore } from "@/lib/domain/adaptive-engine";

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

    const learner = getLearnerState();
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
    saveLearnerState({ ...learner, nodes: nextNodes });

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
