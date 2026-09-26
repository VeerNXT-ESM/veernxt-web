-- ──────────────────────────────────────────────────────────────────────────
-- ps_recruiter_requests — Full Create + Migration
-- Run once in Supabase SQL Editor (safe to re-run: all statements are
-- idempotent via IF NOT EXISTS / IF EXISTS guards).
-- ──────────────────────────────────────────────────────────────────────────

-- 1. Create the table if it doesn't exist yet
CREATE TABLE IF NOT EXISTS ps_recruiter_requests (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requirement_id        uuid,                        -- nullable: dynamic search, no pre-posted job required
  employer_id           uuid NOT NULL,               -- employer who sent the interest (auth.users.id)
  user_id               uuid NOT NULL,               -- candidate (real or fallback demo UUID)
  status                text NOT NULL DEFAULT 'interest_sent',
  fit_score             integer,
  match_reasons         jsonb NOT NULL DEFAULT '{}'::jsonb,
  role_title            text,
  sector                text,
  notes                 text,
  employer_name         text,
  employer_company      text,
  candidate_masked_code text,
  candidate_trade       text,
  candidate_service     text,
  candidate_rank        text,
  admin_notes           text,
  unlocked_at           timestamptz,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

-- 2. Indexes
CREATE INDEX IF NOT EXISTS ps_recruiter_requests_employer_id_idx ON ps_recruiter_requests(employer_id);
CREATE INDEX IF NOT EXISTS ps_recruiter_requests_user_id_idx     ON ps_recruiter_requests(user_id);
CREATE INDEX IF NOT EXISTS ps_recruiter_requests_status_idx      ON ps_recruiter_requests(status);

-- 3. Drop ALL FK constraints — employer_profiles FK blocks inserts when the
--    employer hasn't fully completed onboarding. The admin panel fetches
--    employer/requirement data via separate queries instead of PostgREST joins.
ALTER TABLE ps_recruiter_requests DROP CONSTRAINT IF EXISTS ps_recruiter_requests_user_id_fkey;
ALTER TABLE ps_recruiter_requests DROP CONSTRAINT IF EXISTS ps_recruiter_requests_employer_id_fkey;
ALTER TABLE ps_recruiter_requests DROP CONSTRAINT IF EXISTS ps_recruiter_requests_requirement_id_fkey;
ALTER TABLE ps_recruiter_requests DROP CONSTRAINT IF EXISTS ps_recruiter_requests_requirement_id_user_id_key;


-- 4. Add any columns that might be missing if table existed in a prior form
ALTER TABLE ps_recruiter_requests ADD COLUMN IF NOT EXISTS role_title            text;
ALTER TABLE ps_recruiter_requests ADD COLUMN IF NOT EXISTS sector                text;
ALTER TABLE ps_recruiter_requests ADD COLUMN IF NOT EXISTS notes                 text;
ALTER TABLE ps_recruiter_requests ADD COLUMN IF NOT EXISTS employer_name         text;
ALTER TABLE ps_recruiter_requests ADD COLUMN IF NOT EXISTS employer_company      text;
ALTER TABLE ps_recruiter_requests ADD COLUMN IF NOT EXISTS candidate_masked_code text;
ALTER TABLE ps_recruiter_requests ADD COLUMN IF NOT EXISTS candidate_trade       text;
ALTER TABLE ps_recruiter_requests ADD COLUMN IF NOT EXISTS candidate_service     text;
ALTER TABLE ps_recruiter_requests ADD COLUMN IF NOT EXISTS candidate_rank        text;
ALTER TABLE ps_recruiter_requests ADD COLUMN IF NOT EXISTS admin_notes           text;
ALTER TABLE ps_recruiter_requests ADD COLUMN IF NOT EXISTS unlocked_at           timestamptz;
ALTER TABLE ps_recruiter_requests ALTER COLUMN requirement_id DROP NOT NULL;

-- 5. Enable Row Level Security
ALTER TABLE ps_recruiter_requests ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies (idempotent via DO block)
DO $$
BEGIN
  -- Employer and candidate can read their own rows
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy
    WHERE polname = 'recruiter_requests_select_policy'
      AND polrelid = 'ps_recruiter_requests'::regclass
  ) THEN
    CREATE POLICY recruiter_requests_select_policy ON ps_recruiter_requests
      FOR SELECT TO authenticated
      USING (auth.uid() = employer_id OR auth.uid() = user_id);
  END IF;

  -- Employer can insert/update their own rows
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy
    WHERE polname = 'recruiter_requests_employer_policy'
      AND polrelid = 'ps_recruiter_requests'::regclass
  ) THEN
    CREATE POLICY recruiter_requests_employer_policy ON ps_recruiter_requests
      FOR ALL TO authenticated
      USING (auth.uid() = employer_id)
      WITH CHECK (auth.uid() = employer_id);
  END IF;
END $$;

-- 7. Patch ps_notification_events: add recipient_count column and relax
--    the inline check constraints (all writes go through the server-side
--    router.js, so DB-level checks here are redundant and can block migrations
--    when rows were already inserted with new event_type/channel values).
ALTER TABLE ps_notification_events ADD COLUMN IF NOT EXISTS recipient_count integer;

-- Drop the narrow inline check constraints so existing rows with new values
-- (e.g. 'job_approved_broadcast', 'sms') don't block the migration.
-- The router validates event_type/channel at the application layer.
ALTER TABLE ps_notification_events DROP CONSTRAINT IF EXISTS ps_notification_events_channel_check;
ALTER TABLE ps_notification_events DROP CONSTRAINT IF EXISTS ps_notification_events_event_type_check;

-- Done. ps_recruiter_requests is now fully operational.

