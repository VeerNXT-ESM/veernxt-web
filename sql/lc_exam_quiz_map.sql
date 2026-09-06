-- Precomputed, Gemini-verified exam -> quizzes mapping, mirroring
-- sql/lc_exam_resource_map.sql's approach for resources_v2. Replaces
-- QuizCenter.jsx's runtime subject-overlap filter (which matches any quiz
-- tagged with a subject the exam's syllabus requires, not the exam
-- itself — nearly every exam requires English/Reasoning/Maths/GK, so
-- that filter barely discriminates) with a reasoned, exam-specific pick
-- for exams that have one. QuizCenter.jsx still falls back to the old
-- subject-overlap chain for exams this hasn't covered yet, so nothing
-- regresses mid-rollout.
--
-- quiz_id has no FK to quizzes(id) — same convention already used by
-- sql/user_learning_journey.sql's user_quiz_attempts.quiz_id ("matches
-- quizzes.id", comment-only).
create table if not exists lc_exam_quiz_map (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references lc_exams(id) on delete cascade,
  quiz_id uuid not null,
  confidence text not null check (confidence in ('high', 'medium', 'low')),
  reasoning text,
  source text not null default 'gemini' check (source in ('gemini', 'manual')),
  created_at timestamptz not null default now(),
  unique (exam_id, quiz_id)
);
create index if not exists idx_lc_exam_quiz_map_exam on lc_exam_quiz_map(exam_id);
create index if not exists idx_lc_exam_quiz_map_confidence on lc_exam_quiz_map(confidence);
