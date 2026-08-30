-- PYQ (Previous Year Questions) -- dedicated, read-only content tables.
--
-- PYQs are not quizzes: they render as a formatted document (question,
-- options, correct answer, explanation, all visible at once), not an
-- interactive attempt-with-locking flow. Previously landed in
-- quizzes/questions (category='PYQ') by mistake; this is the correct home.
--
-- Applied via the Management API (no migration tooling in this repo --
-- see sql/learning_center_schema.sql's header), same as every other file
-- in sql/.

create table pyq_papers (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  exam_name text,
  subject text,
  conducting_body text,
  website_url text,
  total_questions int not null default 0,
  source_file text,
  file_hash text,
  created_at timestamptz not null default now()
);
create index idx_pyq_papers_exam_name on pyq_papers (exam_name);
create index idx_pyq_papers_subject on pyq_papers (subject);

create table pyq_questions (
  id uuid primary key default gen_random_uuid(),
  paper_id uuid not null references pyq_papers(id) on delete cascade,
  question_number int not null,
  question_text text not null,
  options jsonb not null,
  correct_answer text,
  explanation text,
  created_at timestamptz not null default now()
);
create index idx_pyq_questions_paper_id on pyq_questions (paper_id);

-- Match this app's existing posture (resources_v2, quizzes, questions all
-- have RLS off, app-layer auth only) -- new tables via the Management API
-- get RLS-on-zero-policies by default (see sql/learning_center_grants.sql's
-- postmortem), which silently 200-empties every anon/authenticated query.
alter table pyq_papers disable row level security;
alter table pyq_questions disable row level security;
grant select, insert, update, delete on pyq_papers, pyq_questions to anon, authenticated;
