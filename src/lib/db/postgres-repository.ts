import { Pool } from "pg";
import type {
  CefrLevel,
  CheckpointEvaluation,
  CompetencyNode,
  LearnerState,
  LearningEvent,
  PhoneticTargetId,
  PortugueseVariety,
  PrioritySituation,
  SpeakingComfort,
} from "@/lib/domain/types";

let poolInstance: Pool | null = null;

export function hasDatabaseUrl(): boolean {
  return Boolean(process.env.DATABASE_URL && process.env.DATABASE_URL.startsWith("postgres"));
}

export function getPgPool(): Pool {
  if (!poolInstance) {
    poolInstance = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: true },
      max: 5,
    });
  }
  return poolInstance;
}

export async function pgCreateSession(params: {
  tokenHash: string;
  userId: string;
  pseudonymId: string;
  expiresAt: Date;
}): Promise<void> {
  const pool = getPgPool();
  await pool.query(
    `INSERT INTO user_sessions (token_hash, user_id, pseudonym_id, expires_at)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (token_hash) DO NOTHING`,
    [params.tokenHash, params.userId, params.pseudonymId, params.expiresAt.toISOString()]
  );
}

export async function pgIsSessionActive(tokenHash: string): Promise<boolean> {
  const pool = getPgPool();
  const res = await pool.query(
    `SELECT 1 FROM user_sessions WHERE token_hash = $1 AND expires_at > NOW() LIMIT 1`,
    [tokenHash]
  );
  return (res.rowCount ?? 0) > 0;
}

export async function pgRevokeSession(tokenHash: string): Promise<void> {
  const pool = getPgPool();
  await pool.query(`DELETE FROM user_sessions WHERE token_hash = $1`, [tokenHash]);
}

export interface UserAccountRow {
  id: string;
  email: string;
  displayName: string;
  pseudonymId: string;
  passwordHash: string;
  pronunciationPortfolioOptIn: boolean;
}

export async function pgFindUserByEmail(email: string): Promise<UserAccountRow | null> {
  const pool = getPgPool();
  const res = await pool.query(
    `SELECT id, email, display_name, pseudonym_id, password_hash, pronunciation_portfolio_opt_in
     FROM users
     WHERE lower(email) = lower($1) AND deleted_at IS NULL
     LIMIT 1`,
    [email]
  );
  if (res.rowCount === 0) return null;
  const r = res.rows[0];
  return {
    id: r.id,
    email: r.email,
    displayName: r.display_name,
    pseudonymId: r.pseudonym_id,
    passwordHash: r.password_hash,
    pronunciationPortfolioOptIn: Boolean(r.pronunciation_portfolio_opt_in),
  };
}

export async function pgCreateUserAndLearner(
  account: UserAccountRow,
  initialLearner: LearnerState
): Promise<void> {
  const pool = getPgPool();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      `INSERT INTO users (id, email, display_name, pseudonym_id, password_hash, pronunciation_portfolio_opt_in)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        account.id,
        account.email.toLowerCase(),
        account.displayName,
        account.pseudonymId,
        account.passwordHash,
        account.pronunciationPortfolioOptIn,
      ]
    );

    const targetDate = new Date(Date.now() + 16 * 7 * 86400 * 1000)
      .toISOString()
      .slice(0, 10);

    await client.query(
      `INSERT INTO learner_profiles (
         pseudonym_id, portuguese_variety, initial_cefr, current_cefr, target_cefr,
         weekly_hours_available, recommended_weekly_hours, speaking_comfort,
         priority_situations, diagnosed_phonetic_targets, current_week,
         target_date, conversation_minutes, onboarding_completed
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10::jsonb,$11,$12,$13,$14)`,
      [
        initialLearner.pseudonymId,
        initialLearner.portugueseVariety,
        initialLearner.initialCefr,
        initialLearner.currentCefr,
        initialLearner.targetCefr,
        initialLearner.weeklyHoursAvailable,
        initialLearner.recommendedWeeklyHours.min,
        initialLearner.speakingComfort,
        JSON.stringify(initialLearner.prioritySituations),
        JSON.stringify(initialLearner.diagnosedPhoneticTargets),
        initialLearner.currentWeek,
        targetDate,
        initialLearner.conversationMinutes,
        false,
      ]
    );

    for (const node of initialLearner.nodes) {
      await client.query(
        `INSERT INTO competency_nodes (
           id, pseudonym_id, node_type, label, target_text, pt_intent, week_introduced,
           mastery_probability, forgetting_risk, communicative_cost, pt_br_transfer_risk,
           personal_relevance, retrieval_stage, successful_sessions, last_successful_transfer,
           next_review_at, error_history
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17::jsonb)`,
        [
          node.id,
          initialLearner.pseudonymId,
          node.type,
          node.label,
          node.targetText,
          node.ptIntent,
          node.weekIntroduced,
          node.masteryProbability,
          node.forgettingRisk,
          node.communicativeCost,
          node.ptBrTransferRisk,
          node.personalRelevance,
          node.retrievalStage,
          node.successfulSessions,
          node.transferredInNovelContext ? new Date().toISOString() : null,
          node.nextReviewAt,
          JSON.stringify(node.errorHistory),
        ]
      );
    }

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export async function pgLoadLearnerState(
  pseudonymId: string
): Promise<LearnerState | null> {
  const pool = getPgPool();
  const profileRes = await pool.query(
    `SELECT lp.*, u.display_name, u.pronunciation_portfolio_opt_in
     FROM learner_profiles lp
     LEFT JOIN users u ON u.pseudonym_id = lp.pseudonym_id
     WHERE lp.pseudonym_id = $1`,
    [pseudonymId]
  );
  if (profileRes.rowCount === 0) return null;
  const p = profileRes.rows[0];

  const [nodesRes, eventsRes, checkpointsRes] = await Promise.all([
    pool.query(
      `SELECT * FROM competency_nodes WHERE pseudonym_id = $1 ORDER BY week_introduced ASC, id ASC`,
      [pseudonymId]
    ),
    pool.query(
      `SELECT event_id, pseudonym_id, event_type, payload, occurred_at
       FROM learning_events WHERE pseudonym_id = $1 ORDER BY occurred_at ASC LIMIT 500`,
      [pseudonymId]
    ),
    pool.query(
      `SELECT week_number, novel_task_id, dimensions, estimated_cefr, mut_score
       FROM cefr_checkpoints WHERE pseudonym_id = $1 ORDER BY created_at DESC LIMIT 16`,
      [pseudonymId]
    ),
  ]);

  const nodes: CompetencyNode[] = nodesRes.rows.map((r) => ({
    id: r.id,
    type: r.node_type,
    label: r.label,
    targetText: r.target_text,
    ptIntent: r.pt_intent,
    exampleContext: `Semana ${r.week_introduced}`,
    weekIntroduced: Number(r.week_introduced),
    masteryProbability: Number(r.mastery_probability),
    forgettingRisk: Number(r.forgetting_risk),
    communicativeCost: Number(r.communicative_cost),
    ptBrTransferRisk: Number(r.pt_br_transfer_risk),
    personalRelevance: Number(r.personal_relevance),
    retrievalStage: r.retrieval_stage,
    successfulSessions: Number(r.successful_sessions),
    transferredInNovelContext: Boolean(r.last_successful_transfer),
    lastReviewedAt: r.last_successful_transfer
      ? new Date(r.last_successful_transfer).toISOString()
      : null,
    nextReviewAt: new Date(r.next_review_at).toISOString(),
    errorHistory: Array.isArray(r.error_history) ? r.error_history : [],
  }));

  const events: LearningEvent[] = eventsRes.rows.map((r) => ({
    eventId: r.event_id,
    pseudonymId: r.pseudonym_id,
    eventType: r.event_type,
    payload: r.payload ?? {},
    occurredAt: new Date(r.occurred_at).toISOString(),
  }));

  const checkpoints: CheckpointEvaluation[] = checkpointsRes.rows.map((r) => ({
    weekNumber: Number(r.week_number),
    trainedTaskId: "hotel-problem",
    novelTaskId: r.novel_task_id,
    novelTaskTitle: r.novel_task_id,
    dimensions: r.dimensions,
    overallScore: Math.round(
      Object.values(r.dimensions as Record<string, number>).reduce((a, b) => a + b, 0) / 8
    ),
    estimatedCefr: r.estimated_cefr as CefrLevel,
    mutScore: Number(r.mut_score),
    asrSeparatedFromRubric: true,
    weeklyCapabilitySummary: {
      canDoNow: `Checkpoint da Semana ${r.week_number} concluído (${r.estimated_cefr}).`,
      listeningLevel: r.estimated_cefr,
      interactionLevel: r.estimated_cefr,
      pronunciationTargetsMastered: "Atualizado por análise real",
      retention7DayPercent: 0,
      biggestGap: "Calculado no próximo checkpoint",
      nextMission: `Semana ${Math.min(16, Number(r.week_number) + 1)}`,
    },
  }));

  const minHours = Number(p.recommended_weekly_hours ?? 16);

  return {
    pseudonymId: p.pseudonym_id,
    displayName: p.display_name ?? "Estudante",
    portugueseVariety: p.portuguese_variety as PortugueseVariety,
    initialCefr: p.initial_cefr,
    currentCefr: p.current_cefr,
    targetCefr: p.target_cefr,
    weeklyHoursAvailable: Number(p.weekly_hours_available),
    recommendedWeeklyHours: { min: minHours, max: minHours + 4 },
    speakingComfort: p.speaking_comfort as SpeakingComfort,
    prioritySituations: (p.priority_situations ?? []) as PrioritySituation[],
    diagnosedPhoneticTargets: (p.diagnosed_phonetic_targets ?? []) as PhoneticTargetId[],
    currentWeek: Number(p.current_week),
    pronunciationPortfolioOptIn: Boolean(p.pronunciation_portfolio_opt_in),
    nodes,
    events,
    checkpoints,
    conversationMinutes: Number(p.conversation_minutes ?? 0),
    updatedAt: new Date(p.updated_at).toISOString(),
  };
}

export async function pgSaveLearnerState(state: LearnerState): Promise<void> {
  const pool = getPgPool();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      `UPDATE users
       SET display_name = $1, pronunciation_portfolio_opt_in = $2
       WHERE pseudonym_id = $3`,
      [state.displayName, state.pronunciationPortfolioOptIn, state.pseudonymId]
    );

    await client.query(
      `UPDATE learner_profiles
       SET portuguese_variety = $1,
           initial_cefr = $2,
           current_cefr = $3,
           target_cefr = $4,
           weekly_hours_available = $5,
           recommended_weekly_hours = $6,
           speaking_comfort = $7,
           priority_situations = $8::jsonb,
           diagnosed_phonetic_targets = $9::jsonb,
           current_week = $10,
           conversation_minutes = $11,
           onboarding_completed = TRUE,
           updated_at = NOW()
       WHERE pseudonym_id = $12`,
      [
        state.portugueseVariety,
        state.initialCefr,
        state.currentCefr,
        state.targetCefr,
        state.weeklyHoursAvailable,
        state.recommendedWeeklyHours.min,
        state.speakingComfort,
        JSON.stringify(state.prioritySituations),
        JSON.stringify(state.diagnosedPhoneticTargets),
        state.currentWeek,
        state.conversationMinutes,
        state.pseudonymId,
      ]
    );

    for (const node of state.nodes) {
      await client.query(
        `INSERT INTO competency_nodes (
           id, pseudonym_id, node_type, label, target_text, pt_intent, week_introduced,
           mastery_probability, forgetting_risk, communicative_cost, pt_br_transfer_risk,
           personal_relevance, retrieval_stage, successful_sessions, last_successful_transfer,
           next_review_at, error_history
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17::jsonb)
         ON CONFLICT (id, pseudonym_id) DO UPDATE SET
           mastery_probability = EXCLUDED.mastery_probability,
           forgetting_risk = EXCLUDED.forgetting_risk,
           retrieval_stage = EXCLUDED.retrieval_stage,
           successful_sessions = EXCLUDED.successful_sessions,
           last_successful_transfer = EXCLUDED.last_successful_transfer,
           next_review_at = EXCLUDED.next_review_at,
           error_history = EXCLUDED.error_history`,
        [
          node.id,
          state.pseudonymId,
          node.type,
          node.label,
          node.targetText,
          node.ptIntent,
          node.weekIntroduced,
          node.masteryProbability,
          node.forgettingRisk,
          node.communicativeCost,
          node.ptBrTransferRisk,
          node.personalRelevance,
          node.retrievalStage,
          node.successfulSessions,
          node.transferredInNovelContext ? new Date().toISOString() : null,
          node.nextReviewAt,
          JSON.stringify(node.errorHistory),
        ]
      );
    }

    for (const evt of state.events) {
      await client.query(
        `INSERT INTO learning_events (event_id, pseudonym_id, event_type, payload, occurred_at)
         VALUES ($1, $2, $3, $4::jsonb, $5)
         ON CONFLICT (event_id) DO NOTHING`,
        [evt.eventId, state.pseudonymId, evt.eventType, JSON.stringify(evt.payload), evt.occurredAt]
      );
    }

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export async function pgDeleteUserAndLearner(pseudonymId: string): Promise<void> {
  const pool = getPgPool();
  await pool.query(`DELETE FROM learner_profiles WHERE pseudonym_id = $1`, [pseudonymId]);
  await pool.query(`DELETE FROM users WHERE pseudonym_id = $1`, [pseudonymId]);
}
