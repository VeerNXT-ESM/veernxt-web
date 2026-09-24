-- Custom reader themes created in the admin Theme Editor
-- (src/pages/admin/ThemeEditor.jsx). The 4 built-in themes (Academic,
-- Modern, Exam Prep, Textbook) are NOT rows here -- they're hardcoded in
-- src/components/book/theme/themes/*.js so the candidate reader always has
-- a working theme even before this migration has been run anywhere. This
-- table only holds themes an admin has actually created/customized.
--
-- `tokens` stores the same flat key set readerThemeTokens.js's
-- ALL_TOKEN_KEYS defines (primary, bodyFont, spaceMd, radiusSm, ...) --
-- whatever a theme's own tokens object looks like in JS is exactly what
-- gets persisted here, no separate DB schema to keep in sync by hand.
create table if not exists lc_reader_themes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  description text,
  is_default boolean not null default false,
  is_system boolean not null default false,
  tokens jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Per-resource theme assignment (ThemeEditor_UI.md §12-13: "apply a theme
-- to whatever book you want"). Nullable -- when unset, the reader falls
-- back to the candidate's own theme preference, then Academic. Stored as
-- text (not a uuid FK) because a resource can be assigned either a system
-- theme (id = 'academic' / 'modern' / 'exam-prep' / 'textbook', not a real
-- row in lc_reader_themes) or a custom theme (a real uuid row here) --
-- same dual-shape id getRegistryTheme()/fetchCustomTheme() already resolve
-- in readerThemeRegistry.js / ReaderThemeProvider.jsx.
alter table resources add column if not exists reader_theme_id text;
alter table resources add column if not exists subject_accent text;

-- Same reasoning as sql/lc_exam_intro.sql: this admin CMS's security model
-- is a client-side session flag, not Postgres RLS, and every sibling table
-- the admin panel writes to already has RLS disabled -- match that
-- convention rather than leaving this one table inconsistently locked
-- (which would silently block both reads and writes under the anon key).
alter table lc_reader_themes disable row level security;
