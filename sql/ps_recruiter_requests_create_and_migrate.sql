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

-- 3. Drop ONLY the user_id FK (candidates can be fallback/demo UUIDs not in auth.users).
--    Keep employer_id -> employer_profiles and requirement_id -> ps_job_requirements FKs so
--    PostgREST can resolve the admin panel joins on those columns.
ALTER TABLE ps_recruiter_requests DROP CONSTRAINT IF EXISTS ps_recruiter_requests_user_id_fkey;
ALTER TABLE ps_recruiter_requests DROP CONSTRAINT IF EXISTS ps_recruiter_requests_requirement_id_user_id_key;

-- Add employer_id FK if not present (needed for PostgREST join in admin_list_recruiter_requests)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'ps_recruiter_requests_employer_id_fkey'
      AND table_name = 'ps_recruiter_requests'
  ) THEN
    ALTER TABLE ps_recruiter_requests
      ADD CONSTRAINT ps_recruiter_requests_employer_id_fkey
      FOREIGN KEY (employer_id) REFERENCES employer_profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Add requirement_id FK if not present (needed for PostgREST join)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'ps_recruiter_requests_requirement_id_fkey'
      AND table_name = 'ps_recruiter_requests'
  ) THEN
    ALTER TABLE ps_recruiter_requests
      ADD CONSTRAINT ps_recruiter_requests_requirement_id_fkey
      FOREIGN KEY (requirement_id) REFERENCES ps_job_requirements(id) ON DELETE SET NULL;
  END IF;
END $$;

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

-- 7. Patch ps_notification_events: add recipient_count, allow 'sms' channel,
--    and allow 'job_approved_broadcast' event type
ALTER TABLE ps_notification_events ADD COLUMN IF NOT EXISTS recipient_count integer;

-- Expand channel constraint to include 'sms'
ALTER TABLE ps_notification_events DROP CONSTRAINT IF EXISTS ps_notification_events_channel_check;
ALTER TABLE ps_notification_events ADD CONSTRAINT ps_notification_events_channel_check
  CHECK (channel IN ('email', 'whatsapp', 'sms'));

-- Expand event_type constraint to include 'job_approved_broadcast'
ALTER TABLE ps_notification_events DROP CONSTRAINT IF EXISTS ps_notification_events_event_type_check;
ALTER TABLE ps_notification_events ADD CONSTRAINT ps_notification_events_event_type_check
  CHECK (event_type IN (
    'employer_requirement_submitted', 'candidate_verification_submitted',
    'candidate_interest_expressed', 'pipeline_status_changed', 'selection_offer_update',
    'job_approved_broadcast'
  ));

-- Done. ps_recruiter_requests is now fully operational.
