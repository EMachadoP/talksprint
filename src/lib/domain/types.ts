export type PortugueseVariety = "pt-BR" | "pt-PT" | "other";

export type CefrLevel = "A0" | "A1" | "A2" | "B1" | "B2";

export type SpeakingComfort = "low" | "medium" | "high";

export type PrioritySituation =
  | "travel"
  | "work_meetings"
  | "daily_life"
  | "social_small_talk"
  | "restaurants_services"
  | "job_interviews";

export type RetrievalStage =
  | "recognize"
  | "complete"
  | "cued_recall"
  | "intent_to_english"
  | "sentence_use"
  | "unpredictable_conversation";

export type CompetencyNodeType =
  | "can_do_task"
  | "grammar_pattern"
  | "lexical_chunk"
  | "listening_pattern"
  | "phoneme_prosody";

export type PhoneticTargetId =
  | "final_consonant_epenthesis"
  | "consonant_clusters"
  | "ed_s_endings"
  | "dental_fricatives_th"
  | "vowel_contrasts"
  | "lexical_stress_rhythm"
  | "connected_speech";

export type TutorMode = "coach" | "partner" | "examiner";

export type FeedbackSeverity = "blocks_meaning" | "target_recurring" | "low_priority";

export interface OnboardingInput {
  displayName: string;
  portugueseVariety: PortugueseVariety;
  selfReportedLevel: "A0" | "A1" | "A2" | "B1";
  weeklyHoursAvailable: number;
  speakingComfort: SpeakingComfort;
  prioritySituations: PrioritySituation[];
  targetDate?: string;
  placementAnswers: {
    recognitionScore: number; // 0..100
    listeningScore: number; // 0..100
    speakingTranscripts: string[]; // 1..3 spoken responses
  };
}

export interface DailyBlock {
  id: string;
  title: string;
  minutes: number;
  purpose: string;
  route: string;
}

export interface WeekPlan {
  week: number;
  title: string;
  communicativeMissions: string[];
  supportLanguage: string[];
  pronunciationFocus: string;
  milestone: string;
  isCheckpoint: boolean;
  coreChunks: string[];
}

export interface PlacementResult {
  diagnosedCefr: "A0" | "A1" | "A2" | "B1";
  recommendedTargetCefr: "A2" | "B1" | "B2";
  recommendedWeeklyHours: { min: number; max: number };
  hoursSufficiency: "aligned" | "stretch" | "under_allocated";
  honestExpectationMessage: string;
  diagnosedPhoneticTargets: PhoneticTargetId[];
  dailyScheduleBlocks: DailyBlock[];
  sixteenWeekPlan: WeekPlan[];
}

export interface CompetencyNode {
  id: string;
  type: CompetencyNodeType;
  label: string;
  targetText: string;
  ptIntent: string;
  exampleContext: string;
  weekIntroduced: number;
  masteryProbability: number; // 0..1
  forgettingRisk: number; // 0..1 (R)
  communicativeCost: number; // 0..1 (C)
  ptBrTransferRisk: number; // 0..1 (T)
  personalRelevance: number; // 0..1 (U)
  retrievalStage: RetrievalStage;
  successfulSessions: number;
  transferredInNovelContext: boolean;
  lastReviewedAt: string | null;
  nextReviewAt: string;
  errorHistory: string[];
}

export interface ReviewOutcomeInput {
  correct: boolean;
  responseTimeMs: number;
  usedHint: boolean;
  novelContext: boolean;
  nowIso?: string;
}

export interface PronunciationIssue {
  targetId: PhoneticTargetId;
  word: string;
  observedForm: string;
  ipaTarget: string;
  severity: FeedbackSeverity;
  explanationPt: string;
  minimalPair: [string, string];
  retryPrompt: string;
}

export interface PronunciationAnalysisResult {
  targetPhrase: string;
  transcript: string;
  intelligibilityScore: number; // 0..100
  priorityIssues: PronunciationIssue[]; // max 2
  rawAudioRetained: boolean;
  privacyNotice: string;
  shouldScheduleSrs: boolean;
}

export interface TutorPedagogicalContext {
  mode: TutorMode;
  taskId: string;
  taskGoal: string;
  learnerLevel: CefrLevel;
  portugueseVariety: PortugueseVariety;
  allowedVocabulary: string[];
  targetStructures: string[];
  knownErrors: string[];
  turnNumber: number;
  isSecondAttempt?: boolean;
}

export interface CorrectiveTarget {
  originalSnippet: string;
  suggestedForm: string;
  severity: FeedbackSeverity;
  explanation: string;
  reformulationPrompt: string;
  srsChunkCandidate: string;
}

export interface TutorTurnResponse {
  reply: string;
  interruptedForCommunicationBreakdown: boolean;
  feedbackTargets: CorrectiveTarget[]; // max 2
  requiresSecondAttempt: boolean;
  secondAttemptPrompt: string | null;
  helpInPortuguese: string | null;
  providerUsed: "deterministic" | "openai" | "gemini";
  taskProgressPercent: number;
}

export interface CefrRubricDimensions {
  taskCompletion: number; // 0..100
  comprehensibility: number; // 0..100
  interaction: number; // 0..100
  fluency: number; // 0..100
  accuracy: number; // 0..100
  range: number; // 0..100
  pronunciation: number; // 0..100
  listening: number; // 0..100
}

export interface CheckpointEvaluation {
  weekNumber: number;
  trainedTaskId: string;
  novelTaskId: string;
  novelTaskTitle: string;
  dimensions: CefrRubricDimensions;
  overallScore: number;
  estimatedCefr: CefrLevel;
  mutScore: number;
  asrSeparatedFromRubric: true;
  weeklyCapabilitySummary: {
    canDoNow: string;
    listeningLevel: string;
    interactionLevel: string;
    pronunciationTargetsMastered: string;
    retention7DayPercent: number;
    biggestGap: string;
    nextMission: string;
  };
}

export type LearningEventType =
  | "REVIEW_COMPLETED"
  | "TASK_ATTEMPTED"
  | "ITEM_RECALLED"
  | "AUDIO_RECORDED"
  | "LESSON_COMPLETED"
  | "CHECKPOINT_COMPLETED";

export interface LearningEvent {
  eventId: string;
  pseudonymId: string;
  eventType: LearningEventType;
  payload: Record<string, unknown>;
  occurredAt: string;
}

export interface LearnerState {
  pseudonymId: string;
  displayName: string;
  portugueseVariety: PortugueseVariety;
  initialCefr: "A0" | "A1" | "A2" | "B1";
  currentCefr: CefrLevel;
  targetCefr: "A2" | "B1" | "B2";
  weeklyHoursAvailable: number;
  recommendedWeeklyHours: { min: number; max: number };
  speakingComfort: SpeakingComfort;
  prioritySituations: PrioritySituation[];
  diagnosedPhoneticTargets: PhoneticTargetId[];
  currentWeek: number;
  pronunciationPortfolioOptIn: boolean;
  nodes: CompetencyNode[];
  events: LearningEvent[];
  checkpoints: CheckpointEvaluation[];
  conversationMinutes: number;
  updatedAt: string;
}
