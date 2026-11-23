import { NextResponse } from "next/server";
import { createDefaultLearnerState, loadLearner } from "@/lib/db/repository";
import { getCurrentSession } from "@/lib/auth/session";
import {
  computeMutScore,
  computePriorityScore,
  rankCompetencyNodes,
} from "@/lib/domain/adaptive-engine";
import { computeReal7DayRetention } from "@/lib/domain/assessment";
import { getWeekPlan } from "@/lib/domain/curriculum";

export async function GET(req: Request) {
  const session = await getCurrentSession(req);
  const learner = session
    ? await loadLearner(session.pseudonymId)
    : createDefaultLearnerState("anonymous-preview", "Visitante");

  const rankedNodes = rankCompetencyNodes(learner.nodes).map((n) => ({
    ...n,
    priorityScore: computePriorityScore(n),
  }));

  return NextResponse.json({
    authenticated: Boolean(session),
    learner,
    weekPlan: getWeekPlan(learner.currentWeek),
    mutScore: computeMutScore(learner.nodes),
    retention7DayPercent: computeReal7DayRetention(learner.events),
    rankedNodes,
  });
}
