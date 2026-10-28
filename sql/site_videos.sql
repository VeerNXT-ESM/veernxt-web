-- CMS-managed YouTube intro videos for the public landing page ("What is VeerNXT?").
-- One row per language code. A missing row (or null youtube_id) means "use the built-in default
-- video for that language" (src/lib/videoStore.js, DEFAULT_VIDEOS), so an empty table = the site as it was.
-- Edited from Admin -> Videos (src/pages/admin/VideosPage.jsx). Writes go through
-- POST /api/admin/content-writes (action 'table-write', service role); RLS allows public reads only.

create table if not exists public.site_videos (
  lang        text primary key,       -- 'en', 'hi', 'ta', 'mr', 'te', 'kn'
  youtube_id  text,                   -- 11-character YouTube video id
  updated_at  timestamptz not null default now(),
  updated_by  text
);

alter table public.site_videos enable row level security;
drop policy if exists "Public read site_videos" on public.site_videos;
create policy "Public read site_videos" on public.site_videos for select using (true);
revoke insert, update, delete on public.site_videos from anon, authenticated;
grant select on public.site_videos to anon, authenticated;
