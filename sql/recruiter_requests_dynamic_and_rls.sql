-- Migration: Support Dynamic Preferences in Recruiter Requests and RLS Policies
-- Date: 2026-09-22

-- 1. Make requirement_id nullable so employers can express interest for roles without a pre-posted job
ALTER TABLE ps_recruiter_requests ALTER COLUMN requirement_id DROP NOT NULL;

-- 2. Relax foreign key constraints to allow flexible and fallback military candidate profiles
ALTER TABLE ps_recruiter_requests DROP CONSTRAINT IF EXISTS ps_recruiter_requests_user_id_fkey;
ALTER TABLE ps_recruiter_requests DROP CONSTRAINT IF EXISTS ps_recruiter_requests_requirement_id_fkey;
ALTER TABLE ps_recruiter_requests DROP CONSTRAINT IF EXISTS ps_recruiter_requests_requirement_id_user_id_key;

-- 3. Add dynamic role, candidate snapshot, and admin coordination columns
ALTER TABLE ps_recruiter_requests ADD COLUMN IF NOT EXISTS role_title text;
ALTER TABLE ps_recruiter_requests ADD COLUMN IF NOT EXISTS sector text;
ALTER TABLE ps_recruiter_requests ADD COLUMN IF NOT EXISTS notes text;
ALTER TABLE ps_recruiter_requests ADD COLUMN IF NOT EXISTS employer_name text;
ALTER TABLE ps_recruiter_requests ADD COLUMN IF NOT EXISTS employer_company text;
ALTER TABLE ps_recruiter_requests ADD COLUMN IF NOT EXISTS candidate_masked_code text;
ALTER TABLE ps_recruiter_requests ADD COLUMN IF NOT EXISTS candidate_trade text;
ALTER TABLE ps_recruiter_requests ADD COLUMN IF NOT EXISTS candidate_service text;
ALTER TABLE ps_recruiter_requests ADD COLUMN IF NOT EXISTS candidate_rank text;
ALTER TABLE ps_recruiter_requests ADD COLUMN IF NOT EXISTS admin_notes text;

-- 4. Enable RLS and add policies for client-side reads
ALTER TABLE ps_recruiter_requests ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy WHERE polname = 'recruiter_requests_select_policy' AND polrelid = 'ps_recruiter_requests'::regclass
  ) THEN
    CREATE POLICY recruiter_requests_select_policy ON ps_recruiter_requests
    FOR SELECT TO authenticated
    USING (auth.uid() = employer_id OR auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policy WHERE polname = 'recruiter_requests_employer_policy' AND polrelid = 'ps_recruiter_requests'::regclass
  ) THEN
    CREATE POLICY recruiter_requests_employer_policy ON ps_recruiter_requests
    FOR ALL TO authenticated
    USING (auth.uid() = employer_id)
    WITH CHECK (auth.uid() = employer_id);
  END IF;
END $$;
