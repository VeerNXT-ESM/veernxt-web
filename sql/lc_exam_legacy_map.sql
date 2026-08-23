-- ---------------------------------------------------------------------
-- lc_exam_legacy_map
--
-- Bridges the canonical lc_exams catalog (admin CMS, 1,534 rows) to the
-- separate legacy `exams` table (recommendation engine / api/profile/
-- recommend.js, 1,629 rows). The two catalogs share the same source
-- documents and near-identical exam names -- lc_exams just carries a
-- leading "N. " ordinal prefix from CMS ingestion that `exams` never has.
--
-- Additive and non-destructive: does not alter either source table, and
-- can be dropped/rebuilt freely if the matching logic needs revision.
-- ---------------------------------------------------------------------
create table if not exists lc_exam_legacy_map (
  id uuid primary key default gen_random_uuid(),
  lc_exam_id uuid not null references lc_exams(id) on delete cascade,
  legacy_exam_id text not null,
  match_method text not null check (match_method in ('exact', 'normalized_exact', 'normalized_exact_cb', 'normalized_exact_region', 'fuzzy')),
  match_confidence numeric,
  created_at timestamptz not null default now(),
  unique (lc_exam_id, legacy_exam_id)
);
create index if not exists idx_lc_exam_legacy_map_legacy on lc_exam_legacy_map(legacy_exam_id);

alter table lc_exam_legacy_map enable row level security;
create policy "lc_exam_legacy_map_read" on lc_exam_legacy_map for select using (true);
