-- Renames the live content table resources_v2 -> resources, per explicit
-- user direction ("I dont like this resources_v2. It should be called
-- just resources"). Its own CREATE TABLE was never checked into sql/ (built
-- directly in the Supabase dashboard/SQL editor), so every object name
-- below was pulled live via pg_indexes/pg_constraint/pg_policies rather
-- than assumed from this repo.
--
-- Zero-downtime approach: the currently-deployed production site still
-- runs compiled code querying `resources_v2` by name -- renaming outright
-- would break every content query (reader, browse, exam pages, quizzes)
-- until this branch merges and redeploys. A compatibility view named
-- resources_v2 (a plain `select *` over the renamed table, which Postgres
-- auto-updatable-views support for insert/update/delete too) keeps old
-- deployed code working unaffected in the meantime. Drop that view with
-- sql/drop_resources_v2_compat_view.sql once this branch's code (which
-- queries `resources` directly) is live in production -- leaving the view
-- around indefinitely would just be a new deprecated alias to clean up
-- later, the opposite of what this rename is for.

alter table resources_v2 rename to resources;

create view resources_v2 as select * from resources;

-- Dependent object names, renamed for hygiene (all still functioned fine
-- under their old resources_v2-embedded names -- Postgres doesn't rename
-- these automatically -- but the user wants a genuinely clean end state,
-- not just a working one).
alter table resources rename constraint resources_v2_pkey to resources_pkey;
alter table resources rename constraint resources_v2_resource_id_key to resources_resource_id_key;
alter table resources rename constraint resources_v2_category_check to resources_category_check;
alter table resources rename constraint resources_v2_format_check to resources_format_check;
alter table resources rename constraint resources_v2_status_check to resources_status_check;

alter index idx_resources_v2_resource_id rename to idx_resources_resource_id;
alter index idx_resources_v2_exam_name rename to idx_resources_exam_name;
alter index idx_resources_v2_category rename to idx_resources_category;
alter index idx_resources_v2_subject rename to idx_resources_subject;
alter index idx_resources_v2_status rename to idx_resources_status;
alter index idx_resources_v2_conducting_body rename to idx_resources_conducting_body;
alter index idx_resources_v2_format rename to idx_resources_format;

alter policy "Public Read resources_v2" on resources rename to "Public Read resources";
alter policy "Service Role Full Access resources_v2" on resources rename to "Service Role Full Access resources";
