-- Guaranteed one-row-per-exam Intro slot for the admin "Learning Center CMS"
-- (ExamEditorPanel.jsx), separate from both existing content systems:
-- resources_v2 + lc_exam_resource_map (legacy, candidate-facing, see
-- sql/lc_exam_resource_map.sql) has the real Intro documents but no admin
-- UI; lc_resources/lc_subjects (admin CMS) has zero Intro rows and no
-- exam-level (subject-less) attachment slot at all -- resources there only
-- attach through a subject. See docs/admin_intro_housekeeping_plan.md.
--
-- resource_id is text (not uuid) to match resources_v2.resource_id's own
-- column type, same reasoning as lc_exam_resource_map.resource_id -- no FK
-- constraint, resources_v2 has no unique/PK constraint Postgres can target.
create table if not exists lc_exam_intro (
  exam_id uuid primary key references lc_exams(id) on delete cascade,
  resource_id text,
  manual_title text,
  manual_body text,
  source text not null check (source in ('auto', 'manual', 'unset')),
  updated_at timestamptz not null default now()
);

-- This project auto-enables RLS on new tables with zero policies, which
-- silently blocks all anon-key access (both read and write). Every sibling
-- table ExamEditorPanel.jsx writes to (lc_exam_subjects, lc_exams, ...) has
-- RLS disabled -- this admin CMS's security model is a client-side session
-- flag, not Postgres RLS -- so match that convention rather than leaving
-- this one table inconsistently locked.
alter table lc_exam_intro disable row level security;
