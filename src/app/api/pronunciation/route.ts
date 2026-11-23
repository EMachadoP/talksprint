import { NextResponse } from "next/server";
import { z } from "zod";
import { analyzePronunciationWithGemini } from "@/lib/domain/pronunciation";
import { loadLearner } from "@/lib/db/repository";
import { getCurrentSession } from "@/lib/auth/session";
import { checkRateLimit, getClientIp } from "@/lib/security/rate-limit";
import { verifyCsrfOrigin } from "@/lib/security/csrf";

const ALLOWED_AUDIO_MIMES = [
  "audio/webm",
  "audio/mp4",
  "audio/ogg",
  "audio/wav",
  "audio/mpeg",
] as const;

const pronunciationSchema = z
  .object({
    targetPhrase: z.string().trim().min(2).max(300),
    transcript: z.string().trim().max(300).optional(),
    audioBase64: z.string().max(2_000_000).optional(),
    audioMimeType: z.enum(ALLOWED_AUDIO_MIMES).optional(),
  })
  .refine((d) => Boolean(d.transcript?.length || (d.audioBase64?.length && d.audioMimeType)), {
    message: "Envie áudio gravado com MIME válido ou transcrição para análise.",
  });

export async function POST(req: Request) {
  const csrf = verifyCsrfOrigin(req);
  if (!csrf.ok) {
    return NextResponse.json({ error: "Requisição cross-site bloqueada." }, { status: 403 });
  }

  const session = await getCurrentSession(req);
  if (!session) {
    return NextResponse.json(
      { error: "Autenticação obrigatória para análise de pronúncia." },
      { status: 401 }
    );
  }

  const limit = checkRateLimit(
    `api:pronunciation:${session.pseudonymId}:${getClientIp(req)}`,
    20,
    60_000
  );
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Limite de análises atingido. Aguarde 1 minuto." },
      { status: 429 }
    );
  }

  try {
    const json = await req.json();
    const parsed = pronunciationSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Entrada de pronúncia inválida.", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const learner = await loadLearner(session.pseudonymId);
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
