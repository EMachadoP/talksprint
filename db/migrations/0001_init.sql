-- TalkSprint Initial Schema (PostgreSQL)
-- LGPD Privacy by Design:
--   1. PII (users) is strictly separated from pseudonymous learning events.
--   2. Raw audio is NOT persisted by default; only derived phonetic features are stored.
--   3. Event log is append-only with idempotent event_id for offline-first sync.

CREATE TABLE IF NOT EXISTS schema_migrations (
  version TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- PII Store (separated from analytics/events)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  pseudonym_id UUID UNIQUE NOT NULL,
  pronunciation_portfolio_opt_in BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Pseudonymous Learner Profile
CREATE TABLE IF NOT EXISTS learner_profiles (
  pseudonym_id UUID PRIMARY KEY,
  portuguese_variety TEXT NOT NULL CHECK (portuguese_variety IN ('pt-BR', 'pt-PT', 'other')),
  initial_cefr TEXT NOT NULL CHECK (initial_cefr IN ('A0', 'A1', 'A2', 'B1')),
  current_cefr TEXT NOT NULL CHECK (current_cefr IN ('A0', 'A1', 'A2', 'B1', 'B2')),
  target_cefr TEXT NOT NULL CHECK (target_cefr IN ('A2', 'B1', 'B2')),
  weekly_hours_available NUMERIC(4,1) NOT NULL,
  recommended_weekly_hours NUMERIC(4,1) NOT NULL,
  speaking_comfort TEXT NOT NULL CHECK (speaking_comfort IN ('low', 'medium', 'high')),
  priority_situations JSONB NOT NULL DEFAULT '[]'::jsonb,
  diagnosed_phonetic_targets JSONB NOT NULL DEFAULT '[]'::jsonb,
  current_week INTEGER NOT NULL DEFAULT 1 CHECK (current_week BETWEEN 1 AND 16),
  target_date DATE NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Competency Graph Nodes
CREATE TABLE IF NOT EXISTS competency_nodes (
  id TEXT NOT NULL,
  pseudonym_id UUID NOT NULL REFERENCES learner_profiles(pseudonym_id) ON DELETE CASCADE,
  node_type TEXT NOT NULL CHECK (node_type IN ('can_do_task', 'grammar_pattern', 'lexical_chunk', 'listening_pattern', 'phoneme_prosody')),
  label TEXT NOT NULL,
  target_text TEXT NOT NULL,
  pt_intent TEXT NOT NULL,
  week_introduced INTEGER NOT NULL,
  mastery_probability NUMERIC(4,3) NOT NULL DEFAULT 0.250,
  forgetting_risk NUMERIC(4,3) NOT NULL DEFAULT 0.500,
  communicative_cost NUMERIC(4,3) NOT NULL DEFAULT 0.600,
  pt_br_transfer_risk NUMERIC(4,3) NOT NULL DEFAULT 0.300,
  personal_relevance NUMERIC(4,3) NOT NULL DEFAULT 0.700,
  retrieval_stage TEXT NOT NULL DEFAULT 'recognize' CHECK (retrieval_stage IN ('recognize', 'complete', 'cued_recall', 'intent_to_english', 'sentence_use', 'unpredictable_conversation')),
  successful_sessions INTEGER NOT NULL DEFAULT 0,
  last_successful_transfer TIMESTAMPTZ,
  next_review_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  error_history JSONB NOT NULL DEFAULT '[]'::jsonb,
  PRIMARY KEY (id, pseudonym_id)
);

CREATE INDEX IF NOT EXISTS idx_competency_next_review ON competency_nodes (pseudonym_id, next_review_at);

-- Immutable Idempotent Offline-First Event Log
CREATE TABLE IF NOT EXISTS learning_events (
  event_id UUID PRIMARY KEY,
  pseudonym_id UUID NOT NULL REFERENCES learner_profiles(pseudonym_id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('REVIEW_COMPLETED', 'TASK_ATTEMPTED', 'ITEM_RECALLED', 'AUDIO_RECORDED', 'LESSON_COMPLETED', 'CHECKPOINT_COMPLETED')),
  payload JSONB NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_learning_events_user_time ON learning_events (pseudonym_id, occurred_at DESC);

-- Derived Pronunciation Features (raw audio discarded by default)
CREATE TABLE IF NOT EXISTS pronunciation_features (
  id UUID PRIMARY KEY,
  pseudonym_id UUID NOT NULL REFERENCES learner_profiles(pseudonym_id) ON DELETE CASCADE,
  target_phrase TEXT NOT NULL,
  transcript TEXT NOT NULL,
  detected_targets JSONB NOT NULL,
  intelligibility_score NUMERIC(4,2) NOT NULL,
  raw_audio_retained BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Multidimensional CEFR Checkpoints (8 dimensions, novel tasks)
CREATE TABLE IF NOT EXISTS cefr_checkpoints (
  id UUID PRIMARY KEY,
  pseudonym_id UUID NOT NULL REFERENCES learner_profiles(pseudonym_id) ON DELETE CASCADE,
  week_number INTEGER NOT NULL,
  novel_task_id TEXT NOT NULL,
  dimensions JSONB NOT NULL,
  estimated_cefr TEXT NOT NULL,
  mut_score NUMERIC(4,3) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
