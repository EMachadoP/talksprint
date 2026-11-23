import crypto from "node:crypto";
import { getInitialCompetencyNodes } from "@/lib/domain/curriculum";
import type { LearnerState } from "@/lib/domain/types";

const globalStore = globalThis as unknown as {
  __talksprintLearners?: Map<string, LearnerState>;
};

function getStore(): Map<string, LearnerState> {
  if (!globalStore.__talksprintLearners) {
    globalStore.__talksprintLearners = new Map<string, LearnerState>();
  }
  return globalStore.__talksprintLearners;
}

const DEFAULT_LEARNER_KEY = "demo-learner";

export function createDefaultLearnerState(pseudonymId?: string): LearnerState {
  const now = new Date().toISOString();
  return {
    pseudonymId: pseudonymId ?? crypto.randomUUID(),
    displayName: "Visitante",
    portugueseVariety: "pt-BR",
    initialCefr: "A1",
    currentCefr: "A1",
    targetCefr: "B1",
    weeklyHoursAvailable: 18,
    recommendedWeeklyHours: { min: 16, max: 20 },
    speakingComfort: "medium",
    prioritySituations: ["travel", "work_meetings", "restaurants_services"],
    diagnosedPhoneticTargets: [
      "final_consonant_epenthesis",
      "ed_s_endings",
      "dental_fricatives_th",
    ],
    currentWeek: 1,
    pronunciationPortfolioOptIn: false,
    nodes: getInitialCompetencyNodes(),
    events: [],
    checkpoints: [],
    conversationMinutes: 45,
    updatedAt: now,
  };
}

export function getLearnerState(key = DEFAULT_LEARNER_KEY): LearnerState {
  const store = getStore();
  let state = store.get(key);
  if (!state) {
    state = createDefaultLearnerState();
    store.set(key, state);
  }
  return state;
}

export function saveLearnerState(
  state: LearnerState,
  key = DEFAULT_LEARNER_KEY
): LearnerState {
  const updated: LearnerState = {
    ...state,
    updatedAt: new Date().toISOString(),
  };
  getStore().set(key, updated);
  return updated;
}

export function deleteLearnerState(key = DEFAULT_LEARNER_KEY): void {
  getStore().delete(key);
}
