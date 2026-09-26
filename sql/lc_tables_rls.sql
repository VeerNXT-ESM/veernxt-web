-- Supabase Advisor "RLS Disabled in Public" (critical) for the 12 catalogue tables below.
-- They were created with RLS off (sql/lc_exam_categories.sql, sql/fix_lc_exam_map_rls.sql, ...), so anyone
-- holding the public anon key -- it ships in the site's JavaScript -- could insert/update/delete rows.
-- Fix (same pattern as resources/quizzes/questions): RLS on, public SELECT policy, no anon writes.
-- Companion to sql/lc_subjects_pyq_questions_rls.sql (lc_subjects, pyq_questions).
--
-- ORDER MATTERS: deploy the code first. Every admin write to these tables now goes through
-- POST /api/admin/content-writes (action 'table-write', api/admin/misc.js, service role) via
-- src/lib/adminDb.js. Applying this file before that deploy makes the admin pages (Exams, Categories,
-- Conducting Bodies, Link Exams, Publish Content, PYQ Papers, exam resources) fail to save; the public
-- site keeps working either way because reads stay open. Scripts use the service role (bypasses RLS);
-- the three public views are owner-mode, so they are unaffected.
--
-- Rollback (restores the previous open posture):
--   alter table <t> disable row level security;  grant insert, update, delete on <t> to anon, authenticated;
--   (for each table in the list below)

do $$
declare t text;
begin
  foreach t in array array[
    'lc_conducting_bodies', 'lc_exam_categories', 'lc_exam_intro', 'lc_exam_quiz_map', 'lc_exam_resource_map',
    'lc_exam_tags', 'lc_exams', 'lc_reader_themes', 'lc_regions', 'lc_tags', 'lc_thumbnail_templates', 'pyq_papers'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists %I on public.%I', 'Public read ' || t, t);
    execute format('create policy %I on public.%I for select using (true)', 'Public read ' || t, t);
    execute format('revoke insert, update, delete on public.%I from anon, authenticated', t);
  end loop;
end $$;
