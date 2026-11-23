import crypto from "node:crypto";
import { getInitialCompetencyNodes } from "@/lib/domain/curriculum";
import type { LearnerState } from "@/lib/domain/types";
import { hashPassword, verifyPassword } from "@/lib/auth/session";
import {
  hasDatabaseUrl,
  pgCreateUserAndLearner,
  pgDeleteUserAndLearner,
  pgFindUserByEmail,
  pgLoadLearnerState,
  pgSaveLearnerState,
  type UserAccountRow,
} from "@/lib/db/postgres-repository";

const globalStore = globalThis as unknown as {
  __talksprintLearners?: Map<string, LearnerState>;
  __talksprintUsers?: Map<string, UserAccountRow>;
};

function getLearnerStore(): Map<string, LearnerState> {
  if (!globalStore.__talksprintLearners) {
    globalStore.__talksprintLearners = new Map<string, LearnerState>();
  }
  return globalStore.__talksprintLearners;
}

function getUserStore(): Map<string, UserAccountRow> {
  if (!globalStore.__talksprintUsers) {
    globalStore.__talksprintUsers = new Map<string, UserAccountRow>();
  }
  return globalStore.__talksprintUsers;
}

const DEFAULT_LEARNER_KEY = "guest-session";

export function createDefaultLearnerState(
  pseudonymId?: string,
  displayName = "Estudante"
): LearnerState {
  const now = new Date().toISOString();
  return {
    pseudonymId: pseudonymId ?? crypto.randomUUID(),
    displayName,
    portugueseVariety: "pt-BR",
    initialCefr: "A0",
    currentCefr: "A0",
    targetCefr: "B1",
    weeklyHoursAvailable: 16,
    recommendedWeeklyHours: { min: 16, max: 20 },
    speakingComfort: "low",
    prioritySituations: ["travel", "work_meetings"],
    diagnosedPhoneticTargets: [],
    currentWeek: 1,
    pronunciationPortfolioOptIn: false,
    nodes: getInitialCompetencyNodes(),
    events: [],
    checkpoints: [],
    conversationMinutes: 0,
    updatedAt: now,
  };
}

export async function registerUserAccount(params: {
  email: string;
  password: string;
  displayName: string;
}): Promise<{ user: UserAccountRow; learner: LearnerState } | { error: string }> {
  const normalizedEmail = params.email.trim().toLowerCase();

  if (hasDatabaseUrl()) {
    const existing = await pgFindUserByEmail(normalizedEmail);
    if (existing) {
      return { error: "Já existe uma conta cadastrada com este e-mail." };
    }
    const user: UserAccountRow = {
      id: crypto.randomUUID(),
      email: normalizedEmail,
      displayName: params.displayName.trim(),
      pseudonymId: crypto.randomUUID(),
      passwordHash: hashPassword(params.password),
      pronunciationPortfolioOptIn: false,
    };
    const learner = createDefaultLearnerState(user.pseudonymId, user.displayName);
    await pgCreateUserAndLearner(user, learner);
    return { user, learner };
  }

  const users = getUserStore();
  if (users.has(normalizedEmail)) {
    return { error: "Já existe uma conta cadastrada com este e-mail." };
  }
  const user: UserAccountRow = {
    id: crypto.randomUUID(),
    email: normalizedEmail,
    displayName: params.displayName.trim(),
    pseudonymId: crypto.randomUUID(),
    passwordHash: hashPassword(params.password),
    pronunciationPortfolioOptIn: false,
  };
  const learner = createDefaultLearnerState(user.pseudonymId, user.displayName);
  users.set(normalizedEmail, user);
  getLearnerStore().set(user.pseudonymId, learner);
  return { user, learner };
}

export async function authenticateUserAccount(params: {
  email: string;
  password: string;
}): Promise<UserAccountRow | null> {
  const normalizedEmail = params.email.trim().toLowerCase();
  const user = hasDatabaseUrl()
    ? await pgFindUserByEmail(normalizedEmail)
    : getUserStore().get(normalizedEmail) ?? null;

  if (!user || !verifyPassword(params.password, user.passwordHash)) {
    return null;
  }
  return user;
}

export async function loadLearner(pseudonymId?: string): Promise<LearnerState> {
  if (pseudonymId && hasDatabaseUrl()) {
    const fromDb = await pgLoadLearnerState(pseudonymId);
    if (fromDb) return fromDb;
  }

  const key = pseudonymId ?? DEFAULT_LEARNER_KEY;
  const store = getLearnerStore();
  let state = store.get(key);
  if (!state) {
    state = createDefaultLearnerState(pseudonymId);
    store.set(key, state);
  }
  return state;
}

export async function persistLearner(
  state: LearnerState,
  pseudonymId?: string
): Promise<LearnerState> {
  const updated: LearnerState = {
    ...state,
    updatedAt: new Date().toISOString(),
  };

  if (pseudonymId && hasDatabaseUrl()) {
    await pgSaveLearnerState(updated);
    return updated;
  }

  const key = pseudonymId ?? DEFAULT_LEARNER_KEY;
  getLearnerStore().set(key, updated);
  return updated;
}

export async function removeLearner(pseudonymId?: string): Promise<void> {
  if (pseudonymId && hasDatabaseUrl()) {
    await pgDeleteUserAndLearner(pseudonymId);
    return;
  }
  const key = pseudonymId ?? DEFAULT_LEARNER_KEY;
  getLearnerStore().delete(key);
}
