import { SIXTEEN_WEEK_CURRICULUM } from "./curriculum";
import type {
  DailyBlock,
  OnboardingInput,
  PhoneticTargetId,
  PlacementResult,
} from "./types";

const HOURS_REFERENCE: Record<
  "A0" | "A1" | "A2" | "B1",
  { min: number; max: number; target: "A2" | "B1" | "B2" }
> = {
  A0: { min: 22, max: 25, target: "B1" },
  A1: { min: 16, max: 20, target: "B1" },
  A2: { min: 10, max: 14, target: "B1" },
  B1: { min: 8, max: 12, target: "B2" },
};

function diagnoseCefr(input: OnboardingInput): "A0" | "A1" | "A2" | "B1" {
  const { recognitionScore, listeningScore, speakingTranscripts } =
    input.placementAnswers;
  const wordCount = speakingTranscripts
    .join(" ")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
  const speakingScore = Math.min(100, wordCount * 3.2);
  const composite = recognitionScore * 0.35 + listeningScore * 0.35 + speakingScore * 0.3;

  if (composite < 32) return "A0";
  if (composite < 58) return "A1";
  if (composite < 80) return "A2";
  return "B1";
}

function diagnosePhoneticTargets(input: OnboardingInput): PhoneticTargetId[] {
  const joined = input.placementAnswers.speakingTranscripts.join(" ").toLowerCase();
  const targets = new Set<PhoneticTargetId>();

  const hasEpenthesis = /\b(workee|stoppee|helpee|talkee|likee|goodee|facebookee)\b/.test(
    joined
  );
  const hasThSub = /\b(tink|dis|dat|wit|fink|ze)\b/.test(joined);
  const hasEdOmission =
    /\byesterday\b/.test(joined) && /\b(work|talk|stop|help|want)\b/.test(joined);

  if (hasEpenthesis) {
    targets.add("final_consonant_epenthesis");
  }
  if (hasThSub) {
    targets.add("dental_fricatives_th");
  }
  if (hasEdOmission) {
    targets.add("ed_s_endings");
  }

  // Only add PT-BR baseline screening targets when user explicitly selected pt-BR
  // and is in early stages (A0/A1), without stereotyping PT-PT/other speakers.
  if (input.portugueseVariety === "pt-BR" && targets.size === 0) {
    if (input.selfReportedLevel === "A0" || input.selfReportedLevel === "A1") {
      targets.add("final_consonant_epenthesis");
      targets.add("lexical_stress_rhythm");
    } else {
      targets.add("connected_speech");
    }
  }

  if (targets.size === 0) {
    targets.add("lexical_stress_rhythm");
    targets.add("connected_speech");
  }

  return Array.from(targets);
}

function buildDailyScheduleBlocks(weeklyHours: number): DailyBlock[] {
  // Base 120-min main session split into 8 evidence-based blocks (scaled cleanly if lower weekly budget)
  const scale = weeklyHours >= 20 ? 1 : Math.max(0.5, weeklyHours / 20);
  const raw = [
    {
      id: "unaided_retrieval",
      title: "Recuperação sem pistas (SRS)",
      minutes: 10,
      purpose: "Reativar chunks e erros corrigidos antes de abrir novo conteúdo.",
      route: "/srs",
    },
    {
      id: "contextual_input",
      title: "Input auditivo contextual",
      minutes: 20,
      purpose: "Construir compreensão de fala natural em velocidade gradual.",
      route: "/today",
    },
    {
      id: "noticing_chunks",
      title: "Noticing & vocabulário em chunks",
      minutes: 15,
      purpose: "Extrair unidades multi-palavra prontas para fala.",
      route: "/srs",
    },
    {
      id: "pronunciation_drill",
      title: "Pronúncia e percepção contrastiva",
      minutes: 15,
      purpose: "Treinar apenas os alvos fonéticos diagnosticados no seu perfil.",
      route: "/pronunciation",
    },
    {
      id: "communicative_task",
      title: "Tarefa comunicativa (IA / Role-play)",
      minutes: 30,
      purpose: "Produção orientada a objetivo real com negociação de significado.",
      route: "/conversation",
    },
    {
      id: "selective_feedback",
      title: "Feedback seletivo + mini-explicação",
      minutes: 15,
      purpose: "Corrigir apenas os 1–2 erros de maior custo comunicativo.",
      route: "/conversation",
    },
    {
      id: "second_attempt",
      title: "Segunda tentativa (Replay)",
      minutes: 10,
      purpose: "Automatizar construções corrigidas em contexto novo.",
      route: "/conversation",
    },
    {
      id: "reflection_seed",
      title: "Registro & agendamento espaçado",
      minutes: 5,
      purpose: "Consolidar itens no grafo de competências para +horas/+dias/+semanas.",
      route: "/dashboard",
    },
  ];

  if (scale === 1) return raw;

  return raw.map((block) => ({
    ...block,
    minutes: Math.max(3, Math.round(block.minutes * scale)),
  }));
}

export function evaluatePlacement(input: OnboardingInput): PlacementResult {
  const diagnosedCefr = diagnoseCefr(input);
  const ref = HOURS_REFERENCE[diagnosedCefr];

  let hoursSufficiency: PlacementResult["hoursSufficiency"] = "aligned";
  let honestExpectationMessage = `Com ${input.weeklyHoursAvailable}h/semana partindo de ${diagnosedCefr}, seu ritmo está alinhado à referência operacional (${ref.min}–${ref.max}h/sem) para perseguir ${ref.target} conversacional nas tarefas priorizadas em 16 semanas.`;

  if (input.weeklyHoursAvailable < ref.min * 0.75) {
    hoursSufficiency = "under_allocated";
    honestExpectationMessage = `Transparência pedagógica: partindo de ${diagnosedCefr}, a referência operacional derivada de Cambridge para alcançar ${ref.target} em 16 semanas é de ${ref.min}–${ref.max}h/semana. Com ${input.weeklyHoursAvailable}h/semana, sua meta realista em 16 semanas será consolidar o próximo degrau funcional e priorizar suas situações essenciais.`;
  } else if (input.weeklyHoursAvailable < ref.min) {
    hoursSufficiency = "stretch";
    honestExpectationMessage = `Meta desafiadora: partindo de ${diagnosedCefr}, recomendamos ${ref.min}–${ref.max}h/semana. Com ${input.weeklyHoursAvailable}h/semana, foque nas missões prioritárias e mantenha consistência diária no SRS produtivo.`;
  }

  return {
    diagnosedCefr,
    recommendedTargetCefr: ref.target,
    recommendedWeeklyHours: { min: ref.min, max: ref.max },
    hoursSufficiency,
    honestExpectationMessage,
    diagnosedPhoneticTargets: diagnosePhoneticTargets(input),
    dailyScheduleBlocks: buildDailyScheduleBlocks(input.weeklyHoursAvailable),
    sixteenWeekPlan: SIXTEEN_WEEK_CURRICULUM,
  };
}
