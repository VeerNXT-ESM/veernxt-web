-- ============================================================
-- VeerNXT Learning Journey — post-launch fixes (audit follow-up)
-- Run once against sql/user_learning_journey.sql's tables.
-- ============================================================

-- 1. Enforce "one primary target per user" at the DB level. Previously
-- this was only ever enforced by the client doing a demote-then-upsert
-- as two separate round trips (see set_primary_exam_target below), which
-- is not atomic — a dropped connection or two racing tabs could leave a
-- user with zero or two primary rows.
CREATE UNIQUE INDEX IF NOT EXISTS uq_user_exam_targets_one_primary
  ON user_exam_targets (user_id)
  WHERE is_primary = true;

-- 2. Lock down the status columns to their documented enum values —
-- previously only comment-documented, not enforced.
ALTER TABLE user_exam_targets
  ADD CONSTRAINT user_exam_targets_status_check
  CHECK (status IN ('active', 'paused', 'completed'));

ALTER TABLE user_resource_reads
  ADD CONSTRAINT user_resource_reads_status_check
  CHECK (status IN ('not_started', 'in_progress', 'completed'));

-- 3. Atomic "set primary exam target" — replaces the 2-round-trip
-- demote-then-upsert previously duplicated in ProfilingResults.jsx,
-- LearningCenter.jsx, and ExamSyllabus.jsx. Reads auth.uid() internally
-- rather than taking a user_id parameter, so (unlike the money-moving
-- RPCs in sql/points_system.sql, which stay locked to service_role) it's
-- safe to grant directly to `authenticated`: a caller can only ever
-- touch their own rows, no matter what exam_id they pass.
CREATE OR REPLACE FUNCTION set_primary_exam_target(p_exam_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  UPDATE user_exam_targets
  SET is_primary = false
  WHERE user_id = auth.uid() AND is_primary = true;

  INSERT INTO user_exam_targets (user_id, exam_id, is_primary, status, last_activity_at)
  VALUES (auth.uid(), p_exam_id, true, 'active', now())
  ON CONFLICT (user_id, exam_id)
  DO UPDATE SET is_primary = true, status = 'active', last_activity_at = now();
END;
$$;

REVOKE ALL ON FUNCTION set_primary_exam_target(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION set_primary_exam_target(UUID) TO authenticated;
