-- Learning Center CMS rearchitecture -- canonical schema
--
-- Additive only. Does NOT touch resources_v2 / quizzes / questions /
-- resources (the legacy V1 table) -- those keep serving live traffic
-- unchanged while this schema is built out and validated alongside them.
--
-- All tables are prefixed lc_ (Learning Center). This was NOT the
-- original plan -- discovered mid-build that "exams" and "resources"
-- already exist live in this database under those exact names:
--   - exams (1,629 rows) backs api/profile/recommend.js, the ex-servicemen
--     eligibility/career-matching engine. Same lineage (same source docx,
--     same conducting_body/exam_name data) but a different shape --
--     eligibility fields (career_track, min_qualification,
--     physical_required, domicile_required, ex_servicemen_quota, ...)
--     baked onto each row instead of a normalized content/subject
--     structure. Confirmed direction with the user: this should
--     eventually draw from the SAME canonical exam catalog built here
--     (jobs/profiling linking to exams by name, many-to-many, instead of
--     maintaining a separate duplicated exam list) -- but that's a
--     distinct follow-on effort, not part of this pass. The lc_ prefix
--     keeps this schema unambiguous until that unification happens.
--   - resources is the legacy V1 table (42 rows, orphaned, only touched
--     by the unlinked AdminContentEditor.jsx).
--
-- No migration tooling exists in this repo (schema.json is empty, no
-- /migrations dir) -- schema changes are applied via the Supabase
-- Management API / SQL editor by hand, same convention as every other
-- file in sql/. Run this whole file once, in order (later tables
-- reference earlier ones).
--
-- Model: Conducting Body -> Region -> Exam -> Subject -> Resource, with
-- resources canonical and many-to-many via lc_exam_subjects /
-- lc_subject_resources. A resource is never duplicated per exam -- it's
-- referenced by any number of (exam, subject) pairs.

create extension if not exists pg_trgm;
create extension if not exists "uuid-ossp";

-- ---------------------------------------------------------------------
-- Regions: level (central/state/ut) + name. Mirrors the (level, state)
-- pairing already proven throughout exam_master_datamap.json this session.
-- ---------------------------------------------------------------------
create table lc_regions (
  id uuid primary key default gen_random_uuid(),
  level text not null check (level in ('central', 'state', 'ut')),
  name text not null,               -- 'Central', or a specific state/UT name
  created_at timestamptz not null default now(),
  unique (level, name)
);

-- ---------------------------------------------------------------------
-- Conducting bodies. Deliberately NOT region-scoped here -- a body's
-- region is a property of each exam it conducts (see lc_exams.region_id),
-- matching what the exam-list dedup work this session actually found:
-- some bodies' exams span more than one region.
-- ---------------------------------------------------------------------
create table lc_conducting_bodies (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  website text,
  logo_path text,
  created_at timestamptz not null default now()
);
create index idx_lc_conducting_bodies_name_trgm on lc_conducting_bodies using gin (name gin_trgm_ops);

-- ---------------------------------------------------------------------
-- Thumbnail templates (created before lc_exams, which reference one).
-- ---------------------------------------------------------------------
create table lc_thumbnail_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,        -- e.g. 'General Awareness', 'Quantitative Aptitude'
  background_image_path text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Exams. category = CMS_Rehaul.md's "Category of Exam" (e.g. 'SSC',
-- 'Banking') -- distinct from Region. also_listed_as preserves the
-- also_listed_as tags from the exam-list dedup pass (§12.5) -- alternate
-- level/state/exam_name text this exam was found under in the source
-- docx, kept for search/audit, not a live relationship.
-- ---------------------------------------------------------------------
create table lc_exams (
  id uuid primary key default gen_random_uuid(),
  conducting_body_id uuid not null references lc_conducting_bodies(id),
  region_id uuid not null references lc_regions(id),
  category text,
  name text not null,
  website text,
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  thumbnail_template_id uuid references lc_thumbnail_templates(id),
  accent_color text,
  also_listed_as jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_lc_exams_conducting_body on lc_exams(conducting_body_id);
create index idx_lc_exams_region on lc_exams(region_id);
create index idx_lc_exams_status on lc_exams(status);
create index idx_lc_exams_name_trgm on lc_exams using gin (name gin_trgm_ops);

-- ---------------------------------------------------------------------
-- Subjects: global (e.g. 'English', 'Reasoning', 'General Knowledge / GS')
-- -- not duplicated per exam. Linked to exams via lc_exam_subjects below.
-- ---------------------------------------------------------------------
create table lc_subjects (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  icon text,
  description text,
  created_at timestamptz not null default now()
);

create table lc_exam_subjects (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references lc_exams(id) on delete cascade,
  subject_id uuid not null references lc_subjects(id),
  display_order int not null default 0,
  created_at timestamptz not null default now(),
  unique (exam_id, subject_id)
);
create index idx_lc_exam_subjects_exam on lc_exam_subjects(exam_id);

-- ---------------------------------------------------------------------
-- Canonical resources. file_hash has a unique constraint (NULLs excepted
-- by Postgres default behavior) so duplicate content is rejected at the
-- database level, not just by ingestion-time convention -- this is the
-- actual enforcement mechanism behind "no cluttering the database with
-- nonsense." subject_id is the resource's own primary/intrinsic subject
-- (CMS_Rehaul.md §12 shows Subject as a Resource Library column) --
-- separate from actual per-exam usage, which lives in lc_subject_resources
-- below (the same English resource has one subject_id but can be
-- referenced by many different exams' English lc_subject_resources rows).
-- source_conducting_body_id/source_region_id are provenance (where this
-- resource was first sourced from), NOT an exam binding.
-- ---------------------------------------------------------------------
create table lc_resources (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  resource_type text not null check (resource_type in ('Intro', 'Guide', 'Precis', 'PYQ', 'Mock', 'Other')),
  subject_id uuid references lc_subjects(id),
  file_hash text unique,
  storage_base_url text,
  metadata_url text,
  thumbnail_url text,
  source_conducting_body_id uuid references lc_conducting_bodies(id),
  source_region_id uuid references lc_regions(id),
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_lc_resources_type on lc_resources(resource_type);
create index idx_lc_resources_status on lc_resources(status);
create index idx_lc_resources_subject on lc_resources(subject_id);
create index idx_lc_resources_title_trgm on lc_resources using gin (title gin_trgm_ops);

-- ---------------------------------------------------------------------
-- The actual many-to-many: which canonical resource is attached to which
-- exam's which subject. Keyed on exam_subject_id (not subject_id alone)
-- so the same canonical resource can be referenced by many different
-- (exam, subject) pairs without ever being copied -- this is the whole
-- point of the rearchitecture.
-- ---------------------------------------------------------------------
create table lc_subject_resources (
  id uuid primary key default gen_random_uuid(),
  exam_subject_id uuid not null references lc_exam_subjects(id) on delete cascade,
  resource_id uuid not null references lc_resources(id) on delete cascade,
  display_order int not null default 0,
  created_at timestamptz not null default now(),
  unique (exam_subject_id, resource_id)
);
create index idx_lc_subject_resources_exam_subject on lc_subject_resources(exam_subject_id);
create index idx_lc_subject_resources_resource on lc_subject_resources(resource_id);

-- ---------------------------------------------------------------------
-- Tags: flexible metadata, explicitly NOT a substitute for the structured
-- Conducting Body / Region fields (per CMS_Rehaul.md §7/§26).
-- ---------------------------------------------------------------------
create table lc_tags (
  id uuid primary key default gen_random_uuid(),
  name text not null unique
);

create table lc_exam_tags (
  exam_id uuid not null references lc_exams(id) on delete cascade,
  tag_id uuid not null references lc_tags(id) on delete cascade,
  primary key (exam_id, tag_id)
);
