-- Additive column enabling a dual-path content format on resources_v2:
-- 'html' (existing: chapter-N.json shaped {title, body_html, images}) stays
-- the default for every existing row: 'blocks' (new: chapter-N.json shaped
-- {title, order, blocks}) is set only on rows migrated by
-- scripts/migrate_resources_to_blocks.mjs. SecureReader.jsx branches on
-- this column at read time -- see Resources_Migration_Plan.md.
alter table resources_v2 add column if not exists format text not null default 'html' check (format in ('html', 'blocks'));
create index if not exists idx_resources_v2_format on resources_v2(format);
