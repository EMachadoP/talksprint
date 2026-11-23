import { z } from "zod";
import { callGeminiJson, hasGeminiKey } from "@/lib/ai/gemini";
import type {
  CorrectiveTarget,
  TutorPedagogicalContext,
  TutorTurnResponse,
} from "./types";

const geminiTutorOutputSchema = z.object({
  reply: z.string().trim().min(1).max(1200),
  interruptedForCommunicationBreakdown: z.boolean().optional().default(false),
  feedbackTargets: z
    .array(
      z.object({
        originalSnippet: z.string().max(200),
        suggestedForm: z.string().max(250),
        severity: z.enum(["blocks_meaning", "target_recurring", "low_priority"]),
        explanation: z.string().max(400),
        reformulationPrompt: z.string().max(250),
        srsChunkCandidate: z.string().max(200),
      })
    )
    .max(2)
    .optional()
    .default([]),
  helpInPortuguese: z.string().max(400).nullable().optional().default(null),
});

function sanitizeLearnerUtterance(raw: string): string {
  // Neutralize prompt-injection style control directives while preserving natural speech
  return raw
    .replace(/```[\s\S]*?```/g, "")
    .replace(/(ignore previous instructions|system prompt|act as)/gi, "")
    .trim()
    .slice(0, 800);
}

function detectSelectiveErrors(utterance: string): CorrectiveTarget[] {
  const targets: CorrectiveTarget[] = [];
  const lower = utterance.toLowerCase();

  // 1. Past tense omission with time marker
  if (/\byesterday\b/.test(lower) && /\b(go|come|have|buy|talk|work)\b/.test(lower)) {
    const match = lower.match(/\b(go|come|have|buy|talk|work)\b/)?.[0] ?? "go";
    const pastMap: Record<string, string> = {
      go: "went",
      come: "came",
      have: "had",
      buy: "bought",
      talk: "talked",
      work: "worked",
    };
    targets.push({
      originalSnippet: `yesterday I ${match}`,
      suggestedForm: `yesterday I ${pastMap[match]}`,
      severity: "blocks_meaning",
      explanation: `Com "yesterday", o verbo precisa ir para o passado simples ("${pastMap[match]}").`,
      reformulationPrompt: `Reescreva ou diga novamente usando "${pastMap[match]}".`,
      srsChunkCandidate: `Yesterday I ${pastMap[match]}...`,
    });
  }

  // 2. "no have" / "don't have" / "there isn't" PT-BR calque
  if (/\bno have\b|\bnot have\b|\bdont have\b/.test(lower)) {
    targets.push({
      originalSnippet: "no have",
      suggestedForm: "there isn't any / doesn't have",
      severity: "blocks_meaning",
      explanation:
        'Em inglês não usamos "no have". Para existência em um local, prefira "There isn\'t any..." ou "The room doesn\'t have...".',
      reformulationPrompt: 'Reformule usando "The room doesn\'t have..." ou "There seems to be...".',
      srsChunkCandidate: "There seems to be a problem with...",
    });
  }

  // 3. "want change" / missing infinitive "to" or polite modal
  if (/\bwant\s+(change|move|order|book|check)\b/.test(lower)) {
    const verb = lower.match(/\bwant\s+(change|move|order|book|check)\b/)?.[1] ?? "change";
    targets.push({
      originalSnippet: `I want ${verb}`,
      suggestedForm: `Could I ${verb}...? / I'd like to ${verb}...`,
      severity: "target_recurring",
      explanation: `Depois de "want" usamos "to" ("want to ${verb}"), e em atendimento é mais natural e polido usar "Could I ${verb}...?" ou "I'd like to ${verb}...".`,
      reformulationPrompt: `Tente novamente usando "Could I ${verb}...?"`,
      srsChunkCandidate: `Could I ${verb} my room, please?`,
    });
  }

  // 4. Missing auxiliary "did" in past questions
  if (/\byou\s+(received|went|called|checked|sent)\b.*\?/.test(lower)) {
    targets.push({
      originalSnippet: "You received...?",
      suggestedForm: "Did you receive...?",
      severity: "target_recurring",
      explanation: 'Perguntas no passado simples usam o auxiliar "Did" + verbo na forma base.',
      reformulationPrompt: 'Faça a pergunta começando com "Did you..."',
      srsChunkCandidate: "Did you receive my message?",
    });
  }

  // Cap strictly to max 2 targets per turn
  return targets.slice(0, 2);
}

function buildDeterministicReply(
  utterance: string,
  ctx: TutorPedagogicalContext,
  hasBreakdown: boolean
): string {
  if (hasBreakdown && ctx.mode !== "examiner") {
    return "I want to make sure I understood you correctly — could you explain what happened one more time? For example, is something broken in your room?";
  }

  const lower = utterance.toLowerCase();

  if (ctx.taskId === "hotel-problem") {
    if (lower.includes("water") || lower.includes("air") || lower.includes("noisy") || lower.includes("problem")) {
      return "I'm really sorry to hear that. Let me check our system right now. We have a quieter room available on the fifth floor — would you like to move there tonight, or should I send maintenance first?";
    }
    return "I understand. Could you tell me your room number and exactly what isn't working so I can fix this right away?";
  }

  if (ctx.taskId === "restaurant-reservation") {
    return "Oh, I apologize for the mix-up! Let me take this back to the kitchen right away. Just to confirm, you wanted the non-spicy dish and sparkling water, correct?";
  }

  if (ctx.taskId === "work-status-meeting") {
    return "Got it, thanks for flagging that early. If we move the deadline by two days, what is the biggest risk to the rest of the team?";
  }

  if (ctx.taskId === "airport-rebooking") {
    return "Let me check the earliest flight tomorrow morning. There is a seat at 6:40 AM with one connection — would that get you there in time for your meeting?";
  }

  return `Thanks for sharing that. To keep moving forward on "${ctx.taskGoal}", what would you like me to do next?`;
}

export async function generateTutorTurn(
  rawUtterance: string,
  ctx: TutorPedagogicalContext
): Promise<TutorTurnResponse> {
  const utterance = sanitizeLearnerUtterance(rawUtterance);
  const wordCount = utterance.split(/\s+/).filter(Boolean).length;
  const communicationBreakdown = wordCount < 2;

  // Use real Gemini 2.5 Flash when GEMINI_API_KEY is configured and not in Vitest unit test mode
  if (hasGeminiKey() && process.env.VITEST !== "true") {
    const systemPrompt = [
      "You are TalkSprint's pedagogical English conversation partner for Portuguese speakers.",
      `Mode: ${ctx.mode} (coach = brief PT help allowed; partner = stay in English + selective post-turn feedback; examiner = ZERO help and ZERO feedbackTargets during the task).`,
      `Learner CEFR level: ${ctx.learnerLevel}. Portuguese variety: ${ctx.portugueseVariety}.`,
      `Task goal: ${ctx.taskGoal}. Target structures: ${ctx.targetStructures.join(", ")}.`,
      `Turn number: ${ctx.turnNumber}. Is second attempt: ${Boolean(ctx.isSecondAttempt)}.`,
      "Rules:",
      "- Keep your English reply natural, concise (2-3 sentences), calibrated to the learner's CEFR level.",
      "- Never return more than 2 items in feedbackTargets.",
      "- In examiner mode, feedbackTargets MUST be [] and helpInPortuguese MUST be null.",
      "- In partner mode, helpInPortuguese MUST be null.",
      "- Explanations inside feedbackTargets must be concise and written in Portuguese.",
      'Return strict JSON with keys: {"reply": string, "interruptedForCommunicationBreakdown": boolean, "feedbackTargets": [{"originalSnippet": string, "suggestedForm": string, "severity": "blocks_meaning"|"target_recurring"|"low_priority", "explanation": string, "reformulationPrompt": string, "srsChunkCandidate": string}], "helpInPortuguese": string|null}.',
    ].join("\n");

    const aiRaw = await callGeminiJson<unknown>(
      systemPrompt,
      [{ text: `Learner said: "${utterance}"` }],
      0.45
    );
    const parsedAi = geminiTutorOutputSchema.safeParse(aiRaw);

    if (parsedAi.success) {
      const ai = parsedAi.data;
      const feedbackTargets = ctx.mode === "examiner" ? [] : ai.feedbackTargets.slice(0, 2);
      const requiresSecondAttempt =
        ctx.mode !== "examiner" && feedbackTargets.length > 0 && !ctx.isSecondAttempt;
      const secondAttemptPrompt = requiresSecondAttempt
        ? `Segunda tentativa: reformule sua resposta aplicando "${feedbackTargets[0].suggestedForm}" e envie novamente para automatizar.`
        : null;

      return {
        reply: ai.reply,
        interruptedForCommunicationBreakdown: ai.interruptedForCommunicationBreakdown,
        feedbackTargets,
        requiresSecondAttempt,
        secondAttemptPrompt,
        helpInPortuguese: ctx.mode === "coach" ? ai.helpInPortuguese : null,
        providerUsed: "gemini",
        taskProgressPercent: Math.min(
          100,
          ctx.turnNumber * 25 + (ctx.isSecondAttempt ? 15 : 0)
        ),
      };
    }
  }

  // Deterministic fallback (used in offline tests or when no LLM key is present)
  const feedbackTargets =
    ctx.mode === "examiner" ? [] : detectSelectiveErrors(utterance);

  const requiresSecondAttempt =
    ctx.mode !== "examiner" && feedbackTargets.length > 0 && !ctx.isSecondAttempt;

  const secondAttemptPrompt = requiresSecondAttempt
    ? `Segunda tentativa: reformule sua resposta aplicando "${feedbackTargets[0].suggestedForm}" e envie novamente para automatizar.`
    : null;

  const helpInPortuguese =
    ctx.mode === "coach"
      ? `Dica do Coach (${ctx.learnerLevel}): tente usar uma das estruturas-alvo (${ctx.targetStructures.join(" / ")}) para cumprir a missão "${ctx.taskGoal}".`
      : null;

  const reply = buildDeterministicReply(utterance, ctx, communicationBreakdown);
  const taskProgressPercent = Math.min(100, ctx.turnNumber * 25 + (ctx.isSecondAttempt ? 15 : 0));

  return {
    reply,
    interruptedForCommunicationBreakdown: communicationBreakdown,
    feedbackTargets,
    requiresSecondAttempt,
    secondAttemptPrompt,
    helpInPortuguese,
    providerUsed: "deterministic",
    taskProgressPercent,
  };
}
