-- Fixes a real user-facing content bug found live 2026-09-08: a 23-chapter
-- English guidebook (resource_id 7bef0a0f-3c54-43c5-a3c5-7bef0a0f3c54,
-- source_file "ENGLISH.docx") was ingested with category='Intro' instead
-- of 'Guide' -- it lives under R2's ".../1.INTRO/..." path for the SSC
-- Constable (Driver) in Delhi Police exam, a source-data error, not a
-- mapping-logic bug.
--
-- Because English is a required subject for nearly every exam, this
-- resource is also a "dominant/universal" candidate map_exam_resources_gemini.mjs
-- surfaces for every exam regardless of identity. Seeing it labeled
-- category='Intro', Gemini reasonably picked it as the Intro for 502
-- different exams (reasoning like "Introductory guide covering English
-- syllabus subject") -- not a small, isolated mistake: backfill_exam_intro.mjs
-- then propagated it into lc_exam_intro for 465 of 1,530 exams (30% of
-- the catalog), each showing an English-textbook excerpt as their exam
-- "Introduction" to real candidates. The plan that first flagged this
-- (docs/learning_center_backend_session_plan.md §4) undercounted it as
-- just AFCAT + Accountant.
--
-- Applied via three ad-hoc Supabase JS calls (see scratch/_tmp_fix_english_intro_bug.mjs,
-- run once, not preserved as a script), backed up first to
-- scratch/_tmp_english_intro_bug_backup.json (resource row + all 502
-- map rows + all 465 intro rows), then re-verified live with
-- scratch/_tmp_check_afcat_intro.mjs. This file documents the equivalent
-- SQL for the audit trail; it was not how the fix was actually executed
-- (the delete needed the compound resource_id+category filter, more
-- naturally expressed via the JS client than repeated here verbatim).
--
-- 1. Recategorize the source resource to its real type.
update resources_v2 set category = 'Guide' where resource_id = '7bef0a0f-3c54-43c5-a3c5-7bef0a0f3c54';

-- 2. Remove the now-invalid Intro-category mapping rows.
delete from lc_exam_resource_map where resource_id = '7bef0a0f-3c54-43c5-a3c5-7bef0a0f3c54' and category = 'Intro';

-- 3. Regenerate lc_exam_intro for all exams (idempotent upsert) so the
--    465 affected exams either pick up a real remaining Intro candidate
--    (was true for ~58 of them) or fall back to source='unset' (blank --
--    already the state for 472 other exams pre-fix, not a novel gap):
--    node scripts/backfill_exam_intro.mjs --execute
