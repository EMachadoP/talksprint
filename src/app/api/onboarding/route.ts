import { NextResponse } from "next/server";
import { z } from "zod";
import { evaluatePlacement } from "@/lib/domain/placement";
import { loadLearner, persistLearner } from "@/lib/db/repository";
import { getCurrentSession } from "@/lib/auth/session";
import { verifyCsrfOrigin } from "@/lib/security/csrf";

const onboardingSchema = z.object({
  displayName: z.string().trim().min(1).max(80),
  portugueseVariety: z.enum(["pt-BR", "pt-PT", "other"]),
  selfReportedLevel: z.enum(["A0", "A1", "A2", "B1"]),
  weeklyHoursAvailable: z.number().min(2).max(45),
  speakingComfort: z.enum(["low", "medium", "high"]),
  prioritySituations: z
    .array(
      z.enum([
        "travel",
        "work_meetings",
        "daily_life",
        "social_small_talk",
        "restaurants_services",
        "job_interviews",
      ])
    )
    .min(1),
  placementAnswers: z.object({
    recognitionScore: z.number().min(0).max(100),
    listeningScore: z.number().min(0).max(100),
    speakingTranscripts: z.array(z.string().max(500)).min(1).max(3),
  }),
});

export async function POST(req: Request) {
  const csrf = verifyCsrfOrigin(req);
  if (!csrf.ok) {
    return NextResponse.json({ error: "Requisição cross-site bloqueada." }, { status: 403 });
  }

  const session = await getCurrentSession(req);
  if (!session) {
    return NextResponse.json(
      { error: "Crie uma conta ou faça login antes de salvar seu Placement." },
      { status: 401 }
    );
  }

  try {
    const json = await req.json();
    const parsed = onboardingSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Dados de onboarding inválidos.", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const placement = evaluatePlacement(parsed.data);
    const current = await loadLearner(session.pseudonymId);

    const updated = await persistLearner(
      {
        ...current,
        displayName: parsed.data.displayName,
        portugueseVariety: parsed.data.portugueseVariety,
        initialCefr: placement.diagnosedCefr,
        currentCefr: placement.diagnosedCefr,
        targetCefr: placement.recommendedTargetCefr,
        weeklyHoursAvailable: parsed.data.weeklyHoursAvailable,
        recommendedWeeklyHours: placement.recommendedWeeklyHours,
        speakingComfort: parsed.data.speakingComfort,
        prioritySituations: parsed.data.prioritySituations,
        diagnosedPhoneticTargets: placement.diagnosedPhoneticTargets,
        currentWeek: 1,
      },
      session.pseudonymId
    );

    return NextResponse.json({
      learner: updated,
      placement,
    });
  } catch {
    return NextResponse.json({ error: "Payload JSON inválido." }, { status: 400 });
  }
}
