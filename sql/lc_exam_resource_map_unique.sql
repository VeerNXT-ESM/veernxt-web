-- Database-level backstop against linking the same resource to an exam twice.
-- The admin UI already refuses this (src/lib/resourceDuplicates.js: same
-- resource_id, same file_hash, or the same stored content); this index makes
-- the exact-repeat case impossible even from a script or a race between two
-- admins. Safe to apply now: as of 2026-09-19 there are 0 repeated
-- (exam_id, resource_id) pairs in lc_exam_resource_map (16,063 rows) after
-- scripts/exam-mapping/dedupe_exam_resources.mjs removed 4,977 duplicate links.
--
-- Run in the Supabase SQL editor. If it ever fails with "could not create
-- unique index", find the repeats with:
--   select exam_id, resource_id, count(*) from lc_exam_resource_map
--   group by 1, 2 having count(*) > 1;
create unique index if not exists lc_exam_resource_map_exam_resource_uniq
  on lc_exam_resource_map (exam_id, resource_id);
