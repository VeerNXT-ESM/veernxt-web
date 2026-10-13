-- Cover-studio data for each book (see src/pages/admin/BookCoverStudio.jsx).
-- One row per book: Guide/Precis books are keyed by category + lower(title)
-- (the same grouping the Book Content admin uses), Intro books by resource_id.
-- Images (hero picture, logo, baked 3D thumbnail, flat cover) live in R2;
-- this table holds their URLs plus the editable text fields in cover_data.
-- Writes go through api/admin/save-resource.js (service role); public read only.
create table if not exists book_covers (
  book_key    text primary key,
  category    text not null,
  title       text not null,
  resource_id text,
  cover_data  jsonb not null default '{}'::jsonb,
  logo_url    text,
  image_url   text,
  thumb_url   text,
  flat_url    text,
  updated_by  text,
  updated_at  timestamptz not null default now()
);

alter table book_covers enable row level security;
drop policy if exists "book_covers public read" on book_covers;
create policy "book_covers public read" on book_covers for select using (true);
