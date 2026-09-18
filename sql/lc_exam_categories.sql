-- Canonical exam-category list, editable by the content team from a new
-- admin page (src/pages/admin/CategoriesPage.jsx) instead of only through a
-- code change. lc_exams.category stays a plain text column (unchanged,
-- matches every other admin surface that already reads/filters it as text)
-- -- this table is the validated source list for that column's dropdown,
-- kept in sync by the admin page itself (rename here cascades an UPDATE
-- onto every lc_exams.category row with the old name; delete is blocked
-- while any exam still uses it).
create table lc_exam_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

-- Same posture as every other lc_ table (see lc_exams_thumbnail_subject.sql
-- and learning_center_grants.sql's own comment on why -- Supabase enables
-- RLS by default on every table created via the Management API regardless
-- of the DDL, and this app's admin auth is application-layer, not RLS).
alter table lc_exam_categories disable row level security;
grant select, insert, update, delete on lc_exam_categories to anon, authenticated;
