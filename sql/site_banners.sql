-- CMS-managed banners for the signed-in pages (Learning Center, Dashboard, Jobs, Network).
--
-- One row per banner slot. The slot list, labels, sizes and the built-in default image/text
-- live in code (src/lib/bannerStore.js, BANNER_SLOTS); a row here only stores overrides.
-- Any NULL/empty column means "use the default", so an empty table = the site as it was.
--
-- Edited from Admin -> Banners (src/pages/admin/BannersPage.jsx). Writes go through
-- POST /api/admin/content-writes (action 'table-write', service role), same as the lc_* tables,
-- so RLS allows public reads only.

create table if not exists public.site_banners (
  key              text primary key,        -- slot key, e.g. 'lc.hero', 'dashboard.welcome'
  image_url        text,                    -- R2 URL of the uploaded banner image
  eyebrow          text,                    -- small label above the title
  title            text,
  title_highlight  text,                    -- second, accent-coloured part of the title
  subtitle         text,                    -- tagline
  description      text,
  cta_label        text,                    -- button / link text
  updated_at       timestamptz not null default now(),
  updated_by       text
);

alter table public.site_banners enable row level security;
drop policy if exists "Public read site_banners" on public.site_banners;
create policy "Public read site_banners" on public.site_banners for select using (true);
revoke insert, update, delete on public.site_banners from anon, authenticated;
grant select on public.site_banners to anon, authenticated;
