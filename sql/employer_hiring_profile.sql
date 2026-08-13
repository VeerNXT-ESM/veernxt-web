-- Employer guided-onboarding — adds one flexible column rather than a wide
-- schema change. `employer_profiles` was created ad-hoc via the Supabase
-- dashboard (no prior migration file in this repo), so this only ALTERs it.
-- Run once in the Supabase SQL editor.
--
-- Shape written by the app (src/pages/Dashboard.jsx renderEmployerOnboarding):
-- {
--   hiringRoles: string,        -- roles currently hiring for (free text)
--   requiredSkills: string,     -- key skills/trade backgrounds needed (free text)
--   candidatePreferences: string, -- service branch/rank/experience preferences (free text)
--   hiringReadiness: string     -- one of: 'Immediately', 'Within 30 days', 'Within 90 days', 'Just exploring'
-- }
-- All keys optional — the app writes whatever the employer has answered so far.

alter table employer_profiles
  add column if not exists hiring_profile jsonb not null default '{}'::jsonb;
