-- Private Sector: Industry Sectors & Tags Migration
-- Adds sector & tags support to ps_job_requirements and ps_candidate_profiles.
-- Safe and idempotent (add column if not exists).

-- 1. ps_job_requirements
alter table ps_job_requirements
  add column if not exists sector text,
  add column if not exists tags text[] not null default '{}';

create index if not exists ps_job_requirements_tags_idx
  on ps_job_requirements using gin(tags);

create index if not exists ps_job_requirements_sector_idx
  on ps_job_requirements(sector);

-- 2. ps_candidate_profiles
alter table ps_candidate_profiles
  add column if not exists sectors text[] not null default '{}',
  add column if not exists tags text[] not null default '{}';

create index if not exists ps_candidate_profiles_tags_idx
  on ps_candidate_profiles using gin(tags);

create index if not exists ps_candidate_profiles_sectors_idx
  on ps_candidate_profiles using gin(sectors);
