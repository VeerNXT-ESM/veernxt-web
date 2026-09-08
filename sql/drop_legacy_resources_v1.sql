-- Drops the legacy V1 "resources" table (Quill body_html format, superseded
-- by resources_v2's R2-backed model). Confirmed live 2026-09-08: 42 rows,
-- all last touched 2026-06-13, 18 of 22 distinct exam_names already have a
-- newer resources_v2 Intro under the same exam_name -- old prototype
-- content, not a live gap. Its only reader, AdminContentEditor.jsx
-- (reachable at /admin/content/:id?, not in nav), and the V1 branch of
-- api/admin/save-resource.js that wrote to it were removed in the same
-- change. Backed up first to scratch/_tmp_legacy_resources_backup.json
-- (all 42 rows, confirmed count match) before this ran.
drop table if exists resources;
