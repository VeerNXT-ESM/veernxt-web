-- jobs had no uniqueness constraint at all, so every scrape run since June
-- silently re-inserted rows for postings already in the table (261 of 587
-- rows were exact title+url duplicates as of 2026-08-24, ~44% of the table).
-- Existing duplicates were deleted first (keeping the copy with lc_exam_id
-- set where one existed, otherwise the most recent), then this constraint
-- was added so push_json_to_supabase.js's INSERT ... ON CONFLICT (url) DO
-- NOTHING can actually enforce it going forward.
alter table jobs add constraint jobs_url_unique unique (url);
