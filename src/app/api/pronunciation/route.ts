import { NextResponse } from "next/server";
import { z } from "zod";
import { analyzePronunciation } from "@/lib/domain/pronunciation";
import { getLearnerState } from "@/lib/db/repository";

const pronunciationSchema = z.object({
  targetPhrase: z.string().trim().min(2).max(300),
  transcript: z.string().trim().min(1).max(300),
});

export async function POST(req: Request) {
  try {
    const json = await req.json();
    const parsed = pronunciationSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Entrada de pronúncia inválida.", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const learner = getLearnerState();
    const result = analyzePronunciation({
      targetPhrase: parsed.data.targetPhrase,
      transcript: parsed.data.transcript,
      portugueseVariety: learner.portugueseVariety,
      portfolioOptIn: learner.pronunciationPortfolioOptIn,
    });

    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Payload JSON inválido." }, { status: 400 });
  }
}
