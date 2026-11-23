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
