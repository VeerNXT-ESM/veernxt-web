-- Learning Center CMS -- grant anon/authenticated access to the lc_ schema.
--
-- Phase 1 (learning_center_schema.sql) created these tables via the Supabase
-- Management API (a superuser/service-role context), which does NOT
-- auto-grant anon/authenticated the way Supabase's dashboard table editor
-- does. Every other table this app uses (resources_v2, quizzes, ...) was
-- created through the dashboard at some point and picked up that default
-- grant; the lc_ tables never got it, so PostgREST silently returned `200 []`
-- to the real anon key for every lc_ query -- not an error, just an empty
-- result, which is why this was invisible until the admin UI was actually
-- driven against a real browser session (verified live in Phase 2's own
-- testing pass; src/lib/supabase.js's hardcoded fallback key happens to
-- decode to service_role -- see status_report.md §15.2 -- which is why this
-- gap didn't show up against that fallback, only against the real
-- VITE_SUPABASE_ANON_KEY set in .env).
--
-- Turns out grants alone weren't enough: Supabase enables row-level security
-- by default on every table created through its platform (dashboard or
-- Management API), regardless of whether the DDL that created it mentions
-- RLS at all -- confirmed via `select relrowsecurity from pg_class` showing
-- `true` on all 10 lc_ tables even though learning_center_schema.sql never
-- asked for it. With RLS on and zero policies, every non-superuser role is
-- denied unconditionally -- the grants above are necessary but not
-- sufficient. Every other table this app uses (resources_v2, quizzes, ...)
-- has RLS off and relies entirely on application-layer auth
-- (admin_session in localStorage -- a pre-existing, separately-flagged
-- posture, not something this file changes). Disabling RLS here matches
-- that existing posture instead of bolting on an inconsistent one-off
-- policy set for just this feature.
--
-- Reversible: `alter table <table> enable row level security;` / `revoke
-- all on <table> from anon, authenticated;` per table.

alter table lc_regions disable row level security;
alter table lc_conducting_bodies disable row level security;
alter table lc_thumbnail_templates disable row level security;
alter table lc_exams disable row level security;
alter table lc_subjects disable row level security;
alter table lc_exam_subjects disable row level security;
alter table lc_resources disable row level security;
alter table lc_subject_resources disable row level security;
alter table lc_tags disable row level security;
alter table lc_exam_tags disable row level security;

grant select, insert, update, delete on
  lc_regions,
  lc_conducting_bodies,
  lc_thumbnail_templates,
  lc_exams,
  lc_subjects,
  lc_exam_subjects,
  lc_resources,
  lc_subject_resources,
  lc_tags,
  lc_exam_tags
to anon, authenticated;

grant select on
  lc_exam_stats,
  lc_resource_usage,
  lc_subject_stats,
  lc_region_stats
to anon, authenticated;
