-- ---------------------------------------------------------------------
-- Unify `exams` (recommendation engine) with `lc_exams` (admin CMS) by
-- adding the admin-CMS-only structure onto the table the live engine
-- already reads, instead of maintaining two catalogs. Purely additive --
-- every existing column, and everything api/profile/recommend.js reads
-- (exam_name, conducting_body, career_track, state_ut, base_url,
-- is_state_specific, metadata), is untouched.
-- ---------------------------------------------------------------------
alter table exams add column if not exists region_id uuid references lc_regions(id);
alter table exams add column if not exists conducting_body_id uuid references lc_conducting_bodies(id);
alter table exams add column if not exists subject_requirements jsonb;
alter table exams add column if not exists logo_path text;
alter table exams add column if not exists content_completeness jsonb;

create index if not exists idx_exams_region_id on exams(region_id);
create index if not exists idx_exams_conducting_body_id on exams(conducting_body_id);
