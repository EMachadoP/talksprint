import { NextResponse } from "next/server";
import { getLearnerState } from "@/lib/db/repository";
import { computeMutScore, computePriorityScore, rankCompetencyNodes } from "@/lib/domain/adaptive-engine";
import { getWeekPlan } from "@/lib/domain/curriculum";

export async function GET() {
  const learner = getLearnerState();
  const rankedNodes = rankCompetencyNodes(learner.nodes).map((n) => ({
    ...n,
    priorityScore: computePriorityScore(n),
  }));

  return NextResponse.json({
    learner,
    weekPlan: getWeekPlan(learner.currentWeek),
    mutScore: computeMutScore(learner.nodes),
    rankedNodes,
  });
}
