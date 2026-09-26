-- Supabase Advisor "RLS Disabled in Public" (critical) for lc_subjects and pyq_questions.
-- Both were created with RLS off (sql/lc_thumbnails.sql, sql/pyq_papers.sql), which lets anyone holding
-- the public anon key insert/update/delete rows. Same fix as resources/quizzes/questions: RLS on, a
-- public SELECT policy, writes only through the service role.
--
-- ORDER MATTERS: deploy the code first. The Subjects admin page and the PYQ question editor now save
-- through POST /api/admin/content-writes (api/admin/misc.js, service role). Applying this file before
-- that deploy makes those two pages fail to save (the public site is unaffected either way).
-- Scripts that write these tables already use the service role, which bypasses RLS.
--
-- Rollback (restores the previous open posture):
--   alter table lc_subjects disable row level security;
--   alter table pyq_questions disable row level security;
--   grant insert, update, delete on lc_subjects, pyq_questions to anon, authenticated;

alter table lc_subjects enable row level security;
alter table pyq_questions enable row level security;

drop policy if exists "Public read lc_subjects" on lc_subjects;
create policy "Public read lc_subjects" on lc_subjects for select using (true);

drop policy if exists "Public read pyq_questions" on pyq_questions;
create policy "Public read pyq_questions" on pyq_questions for select using (true);

-- Belt and braces: with RLS on and no write policy the writes are already rejected; revoking the
-- privilege also makes the intent explicit and stops the Advisor flagging the grant.
revoke insert, update, delete on lc_subjects, pyq_questions from anon, authenticated;
