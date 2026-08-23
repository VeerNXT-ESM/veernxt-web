-- Precomputed, Gemini-verified exam -> resources_v2 content mapping,
-- replacing the runtime exact-name -> ilike -> career-track fallback chain
-- in src/hooks/useExamContent.js for exams that have a row here.
-- resource_id is text (not uuid) to match resources_v2.resource_id's own
-- column type. resources_v2.resource_id is unique (verified live: 15,234
-- rows, 15,234 distinct values) and is the same field ResourceRow/QuizRow
-- already link to (/reader/:resource_id) -- but no FK constraint here,
-- since resources_v2 has no unique/PK constraint Postgres can target for
-- a foreign key, only an application-level guarantee.
create table if not exists lc_exam_resource_map (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references lc_exams(id) on delete cascade,
  resource_id text not null,
  category text not null check (category in ('Intro', 'Guide', 'Precis', 'PYQ')),
  confidence text not null check (confidence in ('high', 'medium', 'low')),
  reasoning text,
  source text not null default 'gemini' check (source in ('gemini', 'manual', 'exact_name')),
  created_at timestamptz not null default now(),
  unique (exam_id, resource_id)
);
create index if not exists idx_lc_exam_resource_map_exam on lc_exam_resource_map(exam_id);
create index if not exists idx_lc_exam_resource_map_confidence on lc_exam_resource_map(confidence);
