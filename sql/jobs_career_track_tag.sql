-- Precise exam matching (jobs.lc_exam_id, via scripts/match_jobs_to_lc_exams.mjs)
-- only succeeds on a small fraction of scraped postings -- most jobs don't
-- cleanly fuzzy-match a specific catalogued exam. This column is a coarse
-- fallback tag every job gets regardless: computed from title/body keywords
-- via scraper-app/sources/_helpers.js's classifyCareerTrack() (already built,
-- previously unused), which always returns one of BANKING / SSC / RAILWAYS /
-- POLICE_CAPF / DEFENCE / PSU / ENGINEERING / STATE_GOVT (STATE_GOVT is the
-- default, so every job gets a real value, never null). Same vocabulary the
-- eligibility/scoring engine (backend/engine/weights.js) already reads on
-- exam.career_track.
alter table jobs add column if not exists career_track text;
create index if not exists idx_jobs_career_track on jobs(career_track);
