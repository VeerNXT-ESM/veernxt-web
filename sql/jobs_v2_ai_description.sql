-- Add ai_description column to jobs_v2
-- Safe to re-run: ADD COLUMN IF NOT EXISTS guard

ALTER TABLE public.jobs_v2
  ADD COLUMN IF NOT EXISTS ai_description text;

-- GIN full-text search index on the description
CREATE INDEX IF NOT EXISTS idx_jobs_v2_ai_description_fts
  ON public.jobs_v2 USING gin(to_tsvector('english', coalesce(ai_description, '')));
