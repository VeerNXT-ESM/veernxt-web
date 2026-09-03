-- Private Sector Employment module — managed-hiring workflow, kept fully
-- separate from `jobs`/`job_applications` (see docs/private_sector_module_plan.md).
-- VeerNXT HR is the mandatory intermediary: employers submit requirements
-- (not live listings), candidates express interest (not applications), and
-- an admin HR console does all matching/shortlisting. Run once via
-- scripts/apply_sql_via_management_api.mjs (this repo has no migration
-- tooling — same convention as sql/points_system.sql).

create extension if not exists pgcrypto;

-- ── Candidate profile ───────────────────────────────────────────────────
-- `path='professional'` rows skip work_types/skills/locations/licences —
-- they only record the opt-in for the admin senior-review queue.
create table if not exists ps_candidate_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  path text not null check (path in ('operational', 'professional')),
  work_types text[] not null default '{}',
  skills text[] not null default '{}',
  preferred_locations jsonb not null default '[]'::jsonb,
  licences_qualifications text[] not null default '{}',
  availability text,
  other_preferences text,
  profile_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists ps_candidate_profiles_user_id_idx on ps_candidate_profiles(user_id);

-- ── Service verification ────────────────────────────────────────────────
-- Kept separate from the profile row so re-submission / admin re-review
-- never clobbers profile data. The "VeerNXT Verified" badge must only ever
-- be derived from the latest row here with status='verified' — never from
-- upload alone (see docs/VeerNXT_Private_Sector_Implementation_Improvements.md §6).
create table if not exists ps_verifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  service_number text not null,
  -- Storage path (Supabase Storage 'ps-verification-docs' bucket, private),
  -- not a public URL -- these are discharge/release documents, PII. Admin
  -- review fetches a short-lived signed URL server-side on demand.
  document_path text not null,
  status text not null default 'pending' check (status in ('pending', 'verified', 'rejected')),
  reviewed_by text,
  reviewed_at timestamptz,
  rejection_reason text,
  created_at timestamptz not null default now()
);
create index if not exists ps_verifications_user_id_idx on ps_verifications(user_id);
create index if not exists ps_verifications_status_idx on ps_verifications(status);

-- ── Employer job requirements ───────────────────────────────────────────
-- Deliberately not called "jobs" -- these are not candidate-visible until
-- status='approved'. role_titles allows tagging one requirement with more
-- than one related role (e.g. "Driver" + "Delivery"); it is one requirement
-- with one shared quantity/location, not a batch-create of N postings.
create table if not exists ps_job_requirements (
  id uuid primary key default gen_random_uuid(),
  employer_id uuid not null references employer_profiles(id) on delete cascade,
  role_titles text[] not null default '{}',
  quantity integer not null check (quantity > 0),
  locations text[] not null default '{}',
  salary_range text,
  description text,
  jd_document_path text,
  requirements_text text,
  status text not null default 'submitted' check (status in ('submitted', 'under_review', 'approved', 'rejected', 'filled', 'closed')),
  hr_notes text,
  reviewed_by text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists ps_job_requirements_employer_id_idx on ps_job_requirements(employer_id);
create index if not exists ps_job_requirements_status_idx on ps_job_requirements(status);

-- ── Candidate interest ("I'm Interested") ──────────────────────────────
-- "Not for me" is deliberately not stored (client-side dismiss only, per
-- docs/VeerNXT_Private_Sector_Implementation_Improvements.md §11).
create table if not exists ps_candidate_interest (
  id uuid primary key default gen_random_uuid(),
  requirement_id uuid not null references ps_job_requirements(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  pipeline_status text not null default 'new' check (pipeline_status in (
    'new', 'hr_reviewing', 'shortlisted', 'candidate_contacted', 'employer_contacted',
    'interview', 'offer', 'joined', 'not_selected', 'withdrawn'
  )),
  hr_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (requirement_id, user_id)
);
create index if not exists ps_candidate_interest_requirement_id_idx on ps_candidate_interest(requirement_id);
create index if not exists ps_candidate_interest_user_id_idx on ps_candidate_interest(user_id);
create index if not exists ps_candidate_interest_pipeline_status_idx on ps_candidate_interest(pipeline_status);

-- ── Notification events ─────────────────────────────────────────────────
-- Phase 1, not deferred -- see docs/VeerNXT_Private_Sector_Implementation_Improvements.md §8.
-- Every ps_* write that should notify someone writes one row here via the
-- API router (api/private-sector/router.js), which then attempts delivery.
create table if not exists ps_notification_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null check (event_type in (
    'employer_requirement_submitted', 'candidate_verification_submitted',
    'candidate_interest_expressed', 'pipeline_status_changed', 'selection_offer_update'
  )),
  channel text not null default 'whatsapp' check (channel in ('email', 'whatsapp')),
  subject text not null,
  payload jsonb not null default '{}'::jsonb,
  related_requirement_id uuid references ps_job_requirements(id) on delete set null,
  related_user_id uuid references auth.users(id) on delete set null,
  related_interest_id uuid references ps_candidate_interest(id) on delete set null,
  recipient text,
  status text not null default 'pending' check (status in ('pending', 'sent', 'failed', 'simulated')),
  provider_response text,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists ps_notification_events_status_idx on ps_notification_events(status);
create index if not exists ps_notification_events_created_at_idx on ps_notification_events(created_at desc);

-- ── RLS ──────────────────────────────────────────────────────────────────
-- This Supabase project auto-enables RLS on new tables with zero policies,
-- which silently blocks all anon-key access (candidate self-reads
-- included) -- a real, previously-hit bug, see docs/status_report.md §37.1.
-- Policy shape here: candidates/employers can read their OWN rows directly
-- (self-service pages use the anon client + their auth session); every
-- WRITE and every cross-user/admin READ goes through
-- api/private-sector/router.js using the service-role key, which bypasses
-- RLS entirely -- matching the sql/points_system.sql precedent (no
-- client-side write policy defined on purpose).

alter table ps_candidate_profiles enable row level security;
drop policy if exists "ps_candidate_profiles_self_read" on ps_candidate_profiles;
create policy "ps_candidate_profiles_self_read" on ps_candidate_profiles for select using (auth.uid() = user_id);

alter table ps_verifications enable row level security;
drop policy if exists "ps_verifications_self_read" on ps_verifications;
create policy "ps_verifications_self_read" on ps_verifications for select using (auth.uid() = user_id);

alter table ps_job_requirements enable row level security;
drop policy if exists "ps_job_requirements_employer_read" on ps_job_requirements;
create policy "ps_job_requirements_employer_read" on ps_job_requirements for select using (auth.uid() = employer_id);
-- Approved requirements are the candidate-facing opportunities feed --
-- readable by any authenticated user, not just the owning employer.
drop policy if exists "ps_job_requirements_approved_read" on ps_job_requirements;
create policy "ps_job_requirements_approved_read" on ps_job_requirements for select using (status = 'approved');

alter table ps_candidate_interest enable row level security;
drop policy if exists "ps_candidate_interest_self_read" on ps_candidate_interest;
create policy "ps_candidate_interest_self_read" on ps_candidate_interest for select using (auth.uid() = user_id);

-- ps_notification_events has no client-side read policy at all -- it's an
-- internal delivery log, read only by the admin console via the
-- service-role client, matching point_transactions' "no client policy,
-- server-only" pattern.
alter table ps_notification_events enable row level security;

-- ── Storage ──────────────────────────────────────────────────────────────
-- Bucket itself created via the Storage API (not SQL) --
-- supabase.storage.createBucket('ps-verification-docs', { public: false }).
-- Candidates upload discharge/release documents directly from the client
-- (anon key + their own auth session, same pattern EmployerDashboard.jsx's
-- avatar upload uses) into a folder keyed by their own user id; nothing
-- else can read them directly -- the admin verification queue fetches a
-- short-lived signed URL server-side via
-- api/private-sector/router.js's admin_get_verification_url action.
drop policy if exists "ps_verification_docs_insert_own" on storage.objects;
create policy "ps_verification_docs_insert_own" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'ps-verification-docs' and (storage.foldername(name))[1] = auth.uid()::text);

-- Separate bucket for employer-uploaded JD documents (PostJobRequirement.jsx)
-- -- kept distinct from candidate service-verification documents rather
-- than sharing a bucket/policy across two different upload contexts.
-- supabase.storage.createBucket('ps-job-documents', { public: false }).
drop policy if exists "ps_job_documents_insert_own" on storage.objects;
create policy "ps_job_documents_insert_own" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'ps-job-documents' and (storage.foldername(name))[1] = auth.uid()::text);
