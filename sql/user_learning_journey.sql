-- ============================================================
-- VeerNXT Learning Journey — Release 1 Migration
-- user_exam_targets: tracks which exams a candidate is preparing for
-- ============================================================

-- Table: user_exam_targets
-- One row per (user, exam). A user may prepare for many exams
-- but only one is "primary" (is_primary = true).
CREATE TABLE IF NOT EXISTS user_exam_targets (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  exam_id          UUID NOT NULL REFERENCES lc_exams(id) ON DELETE CASCADE,
  is_primary       BOOLEAN NOT NULL DEFAULT false,
  status           TEXT NOT NULL DEFAULT 'active', -- active | paused | completed
  target_date      DATE,          -- optional: user-entered exam date
  started_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_activity_at TIMESTAMPTZ,
  CONSTRAINT user_exam_targets_unique UNIQUE (user_id, exam_id)
);

-- Ensure only one primary exam per user (enforced in app logic,
-- but this index speeds up the lookup of the primary target).
CREATE INDEX IF NOT EXISTS idx_user_exam_targets_user_primary
  ON user_exam_targets (user_id, is_primary)
  WHERE is_primary = true;

-- RLS Policies
ALTER TABLE user_exam_targets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own exam targets"
  ON user_exam_targets FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own exam targets"
  ON user_exam_targets FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own exam targets"
  ON user_exam_targets FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own exam targets"
  ON user_exam_targets FOR DELETE
  USING (auth.uid() = user_id);

-- Grant access to authenticated role
GRANT SELECT, INSERT, UPDATE, DELETE ON user_exam_targets TO authenticated;


-- ============================================================
-- Release 2 Migration (included here for a single run)
-- user_resource_reads: explicit per-resource completion tracking
-- Replaces the RESOURCE_OPENED point_transactions hack.
-- ============================================================

CREATE TABLE IF NOT EXISTS user_resource_reads (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  resource_id      TEXT NOT NULL,   -- matches resources_v2.resource_id
  exam_id          UUID REFERENCES lc_exams(id) ON DELETE SET NULL,
  subject_key      TEXT,            -- from thumbnailTaxonomy subject key
  status           TEXT NOT NULL DEFAULT 'not_started', -- not_started | in_progress | completed
  opened_at        TIMESTAMPTZ,
  completed_at     TIMESTAMPTZ,
  time_spent_sec   INT,
  CONSTRAINT user_resource_reads_unique UNIQUE (user_id, resource_id)
);

CREATE INDEX IF NOT EXISTS idx_user_resource_reads_user_exam
  ON user_resource_reads (user_id, exam_id);

ALTER TABLE user_resource_reads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own resource reads"
  ON user_resource_reads FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own resource reads"
  ON user_resource_reads FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own resource reads"
  ON user_resource_reads FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE ON user_resource_reads TO authenticated;


-- ============================================================
-- Release 3 Migration
-- user_quiz_attempts: per-quiz attempt results
-- ============================================================

CREATE TABLE IF NOT EXISTS user_quiz_attempts (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  quiz_id           UUID NOT NULL,   -- matches quizzes.id
  exam_id           UUID REFERENCES lc_exams(id) ON DELETE SET NULL,
  subject_key       TEXT,
  score_pct         FLOAT,           -- 0.0 – 100.0
  questions_total   INT,
  questions_correct INT,
  attempted_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_quiz_attempts_user_exam
  ON user_quiz_attempts (user_id, exam_id);

ALTER TABLE user_quiz_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own quiz attempts"
  ON user_quiz_attempts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own quiz attempts"
  ON user_quiz_attempts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

GRANT SELECT, INSERT ON user_quiz_attempts TO authenticated;
