-- Thumbnails are now data, managed from the admin CMS instead of being
-- inferred from filenames / hardcoded maps:
--   * Exams show their CATEGORY's thumbnail (landscape 16:9)
--     -> lc_exam_categories.thumbnail_url
--   * Books / study materials show their SUBJECT's thumbnail (portrait 2:3)
--     -> lc_subjects.thumbnail_url
-- The subject list itself is fixed by src/lib/thumbnailTaxonomy.js (it also
-- drives the title -> subject matching), so lc_subjects is seeded from that by
-- scripts/seed_thumbnail_urls.mjs and the admin page only edits thumbnails.
-- Run this file first, then: node scripts/seed_thumbnail_urls.mjs
alter table lc_exam_categories add column if not exists thumbnail_url text;

create table if not exists lc_subjects (
  key text primary key,
  label text not null,
  color_family text,
  thumbnail_url text,
  created_at timestamptz not null default now()
);

-- Same posture as every other lc_ table (see lc_exam_categories.sql).
alter table lc_subjects disable row level security;
grant select, insert, update, delete on lc_subjects to anon, authenticated;
