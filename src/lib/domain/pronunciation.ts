import { callGeminiJson, hasGeminiKey } from "@/lib/ai/gemini";
import type {
  PortugueseVariety,
  PronunciationAnalysisResult,
  PronunciationIssue,
} from "./types";

export interface PronunciationAnalyzeInput {
  targetPhrase: string;
  transcript: string;
  portugueseVariety: PortugueseVariety;
  portfolioOptIn: boolean;
}

const EPENTHESIS_PATTERNS: Array<{
  regex: RegExp;
  word: string;
  ipa: string;
  minimalPair: [string, string];
}> = [
  { regex: /\bworke?e\b/i, word: "work", ipa: "/wɜːrk/", minimalPair: ["work", "working"] },
  { regex: /\bstoppe?e\b/i, word: "stopped", ipa: "/stɑːpt/", minimalPair: ["stop", "stopping"] },
  { regex: /\bhelpe?e\b/i, word: "help", ipa: "/help/", minimalPair: ["help", "helping"] },
  { regex: /\btalke?e\b/i, word: "talk", ipa: "/tɔːk/", minimalPair: ["talk", "talking"] },
  { regex: /\blikee\b/i, word: "like", ipa: "/laɪk/", minimalPair: ["like", "likely"] },
];

const TH_SUBSTITUTION_PATTERNS: Array<{
  regex: RegExp;
  word: string;
  ipa: string;
  minimalPair: [string, string];
}> = [
  { regex: /\bwit\b/i, word: "with", ipa: "/wɪð/", minimalPair: ["with", "wit"] },
  { regex: /\btink\b/i, word: "think", ipa: "/θɪŋk/", minimalPair: ["think", "tink"] },
  { regex: /\bdis\b/i, word: "this", ipa: "/ðɪs/", minimalPair: ["this", "dis"] },
  { regex: /\bdat\b/i, word: "that", ipa: "/ðæt/", minimalPair: ["that", "dat"] },
];

export function analyzePronunciation(
  input: PronunciationAnalyzeInput
): PronunciationAnalysisResult {
  const issues: PronunciationIssue[] = [];
  const lowerTarget = input.targetPhrase.toLowerCase();
  const lowerTranscript = input.transcript.toLowerCase();

  // 1. PT-BR final consonant epenthesis (e.g. work-ee, stopp-ee)
  for (const pat of EPENTHESIS_PATTERNS) {
    const match = lowerTranscript.match(pat.regex);
    if (match) {
      issues.push({
        targetId: "final_consonant_epenthesis",
        word: pat.word,
        observedForm: match[0],
        ipaTarget: pat.ipa,
        severity: "target_recurring",
        explanationPt: `Evite adicionar uma vogal /i/ após a consoante final em "${pat.word}". Solte o ar suavemente sem formar outra sílaba.`,
        minimalPair: pat.minimalPair,
        retryPrompt: `Diga novamente sem adicionar vogal no final: "${input.targetPhrase}"`,
      });
    }
  }

  // 2. -ed ending omission when target requires past tense
  const targetEdWords = lowerTarget.match(/\b[a-z]{3,}ed\b/g) ?? [];
  for (const edWord of targetEdWords) {
    const stem = edWord.replace(/ed$/, "");
    const stemRegex = new RegExp(`\\b${stem}\\b`, "i");
    const edRegex = new RegExp(`\\b${edWord}\\b`, "i");
    if (!edRegex.test(lowerTranscript) && stemRegex.test(lowerTranscript)) {
      issues.push({
        targetId: "ed_s_endings",
        word: edWord,
        observedForm: stem,
        ipaTarget: `/${stem}t/`,
        severity: "blocks_meaning",
        explanationPt: `A terminação "-ed" em "${edWord}" marca o tempo passado e muda o sentido da frase. Articule o som final curto sem adicionar uma sílaba extra.`,
        minimalPair: [stem, edWord],
        retryPrompt: `Repita marcando o passado em "${edWord}": "${input.targetPhrase}"`,
      });
      break;
    }
  }

  // 3. Dental fricatives /θ/ and /ð/
  for (const pat of TH_SUBSTITUTION_PATTERNS) {
    const match = lowerTranscript.match(pat.regex);
    if (match && lowerTarget.includes(pat.word)) {
      issues.push({
        targetId: "dental_fricatives_th",
        word: pat.word,
        observedForm: match[0],
        ipaTarget: pat.ipa,
        severity: "target_recurring",
        explanationPt: `Em "${pat.word}" (${pat.ipa}), encoste levemente a ponta da língua entre os dentes para diferenciar de "${pat.minimalPair[1]}".`,
        minimalPair: pat.minimalPair,
        retryPrompt: `Foque no som de "${pat.word}" e repita: "${input.targetPhrase}"`,
      });
    }
  }

  // Prioritize communicative impact and cap at max 2 issues
  const severityRank = { blocks_meaning: 0, target_recurring: 1, low_priority: 2 };
  const priorityIssues = issues
    .sort((a, b) => severityRank[a.severity] - severityRank[b.severity])
    .slice(0, 2);

  // Word overlap intelligibility baseline
  const targetTokens = lowerTarget.replace(/[^a-z\s']/g, "").split(/\s+/).filter(Boolean);
  const transcriptTokens = new Set(
    lowerTranscript.replace(/[^a-z\s']/g, "").split(/\s+/).filter(Boolean)
  );
  const overlap =
    targetTokens.length === 0
      ? 1
      : targetTokens.filter((t) => transcriptTokens.has(t)).length / targetTokens.length;

  const penalty = priorityIssues.length * 14;
  const intelligibilityScore = Math.max(
    25,
    Math.min(100, Math.round(overlap * 100 - penalty + (priorityIssues.length === 0 ? 8 : 0)))
  );

  const rawAudioRetained = Boolean(input.portfolioOptIn);
  const privacyNotice = rawAudioRetained
    ? "Portfólio de Pronúncia ativado (opt-in): este trecho foi retido exclusivamente para sua comparação longitudinal de 16 semanas."
    : "Política LGPD Extração e Descarte: áudio bruto descartado imediatamente após extração das características fonéticas.";

  return {
    targetPhrase: input.targetPhrase,
    transcript: input.transcript,
    intelligibilityScore,
    priorityIssues,
    rawAudioRetained,
    privacyNotice,
    shouldScheduleSrs: priorityIssues.length > 0 || intelligibilityScore < 80,
  };
}

export async function analyzePronunciationWithGemini(input: {
  targetPhrase: string;
  transcript?: string;
  audioBase64?: string;
  audioMimeType?: string;
  portugueseVariety: PortugueseVariety;
  portfolioOptIn: boolean;
}): Promise<PronunciationAnalysisResult> {
  if (hasGeminiKey() && process.env.VITEST !== "true") {
    const systemPrompt = [
      "You are a specialist in English pronunciation intelligibility for Portuguese speakers.",
      `Portuguese variety: ${input.portugueseVariety}.`,
      `Target phrase: "${input.targetPhrase}".`,
      "Focus ONLY on communicative intelligibility (not native accent): final consonant epenthesis (e.g. adding /i/ after final /k,t,d,p/), -ed/-s endings, dental fricatives /θ ð/, vowel contrasts, lexical stress.",
      "Return at most 2 priorityIssues. Explanations must be concise and in Portuguese.",
      'Return strict JSON: {"transcript": string, "intelligibilityScore": number (0-100), "priorityIssues": [{"targetId": "final_consonant_epenthesis"|"consonant_clusters"|"ed_s_endings"|"dental_fricatives_th"|"vowel_contrasts"|"lexical_stress_rhythm"|"connected_speech", "word": string, "observedForm": string, "ipaTarget": string, "severity": "blocks_meaning"|"target_recurring"|"low_priority", "explanationPt": string, "minimalPair": [string, string], "retryPrompt": string}]}.',
    ].join("\n");

    const parts = [];
    if (input.audioBase64 && input.audioMimeType) {
      parts.push({
        inlineData: {
          mimeType: input.audioMimeType,
          data: input.audioBase64,
        },
      });
      parts.push({
        text: `Listen to the attached learner audio attempting to say: "${input.targetPhrase}". Transcribe faithfully (noting any epenthetic vowel or dropped endings) and evaluate intelligibility.`,
      });
    } else {
      parts.push({
        text: `Learner transcript: "${input.transcript ?? ""}" for target phrase "${input.targetPhrase}".`,
      });
    }

    const ai = await callGeminiJson<{
      transcript?: string;
      intelligibilityScore?: number;
      priorityIssues?: PronunciationIssue[];
    }>(systemPrompt, parts, 0.2);

    if (ai && typeof ai.intelligibilityScore === "number") {
      const priorityIssues = (Array.isArray(ai.priorityIssues) ? ai.priorityIssues : []).slice(0, 2);
      const rawAudioRetained = Boolean(input.portfolioOptIn);
      const privacyNotice = rawAudioRetained
        ? "Portfólio de Pronúncia ativado (opt-in): este trecho foi retido exclusivamente para sua comparação longitudinal de 16 semanas."
        : "Política LGPD Extração e Descarte: áudio bruto processado em memória e descartado imediatamente após extração das características fonéticas.";

      return {
        targetPhrase: input.targetPhrase,
        transcript: ai.transcript ?? input.transcript ?? "",
        intelligibilityScore: Math.max(0, Math.min(100, Math.round(ai.intelligibilityScore))),
        priorityIssues,
        rawAudioRetained,
        privacyNotice,
        shouldScheduleSrs: priorityIssues.length > 0 || ai.intelligibilityScore < 80,
      };
    }
  }

  return analyzePronunciation({
    targetPhrase: input.targetPhrase,
    transcript: input.transcript ?? "",
    portugueseVariety: input.portugueseVariety,
    portfolioOptIn: input.portfolioOptIn,
  });
}
