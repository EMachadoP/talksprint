import { NextResponse } from "next/server";
import { z } from "zod";
import { analyzePronunciationWithGemini } from "@/lib/domain/pronunciation";
import { loadLearner } from "@/lib/db/repository";
import { getCurrentSession } from "@/lib/auth/session";

const pronunciationSchema = z
  .object({
    targetPhrase: z.string().trim().min(2).max(300),
    transcript: z.string().trim().max(300).optional(),
    audioBase64: z.string().max(4_000_000).optional(),
    audioMimeType: z.string().max(80).optional(),
  })
  .refine((d) => Boolean(d.transcript?.length || d.audioBase64?.length), {
    message: "Envie áudio gravado ou transcrição para análise.",
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

    const session = await getCurrentSession();
    const learner = await loadLearner(session?.pseudonymId);
    const result = await analyzePronunciationWithGemini({
      targetPhrase: parsed.data.targetPhrase,
      transcript: parsed.data.transcript,
      audioBase64: parsed.data.audioBase64,
      audioMimeType: parsed.data.audioMimeType,
      portugueseVariety: learner.portugueseVariety,
      portfolioOptIn: learner.pronunciationPortfolioOptIn,
    });

    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Payload JSON inválido." }, { status: 400 });
  }
}
