-- ============================================================
-- Migration: Add multi-tags, status/expiration, and audit columns to public.jobs
-- ============================================================

-- 1. Add tags array for multi-tagging (e.g. {'government_job', 'banking_job', 'peon_job'})
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}';

-- 2. GIN Index for blazing-fast array contains (@>) queries on tags
CREATE INDEX IF NOT EXISTS idx_jobs_tags ON public.jobs USING GIN (tags);

-- 3. Add is_expired flag to avoid expensive on-the-fly date math across all queries
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS is_expired boolean DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_jobs_is_expired ON public.jobs (is_expired);

-- 4. Add updated_at timestamp to track when jobs are refreshed/updated by the scraper
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT now();

-- 5. Helpful comment documenting tag taxonomy
COMMENT ON COLUMN public.jobs.tags IS 'Structured snake_case tags, e.g. government_job, banking_job, peon_job, railway_job, 10th_pass_job';
