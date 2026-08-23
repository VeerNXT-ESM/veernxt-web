-- Learning Center CMS -- read-only aggregate views for the admin UI (Phase 2)
--
-- Additive only, no writes to any existing table/row. Pure SELECT views over
-- the lc_-prefixed schema from learning_center_schema.sql (must already be
-- applied). Every count here would otherwise be an N+1 query per row in the
-- Exams table / Resource Library / Syllabus tab / Content Graph -- computing
-- them once in a view keeps those screens to one query each, per
-- CMS_Rehaul.md's "efficient Supabase queries" requirement (§22).
--
-- Reversible: `drop view if exists <name>;` for any of these, in any order
-- (none of them reference each other).

create or replace view lc_exam_stats as
select
  e.id as exam_id,
  count(distinct es.id) as subject_count,
  count(distinct sr.resource_id) as resource_count
from lc_exams e
left join lc_exam_subjects es on es.exam_id = e.id
left join lc_subject_resources sr on sr.exam_subject_id = es.id
group by e.id;

create or replace view lc_resource_usage as
select
  r.id as resource_id,
  count(distinct es.exam_id) as exam_count
from lc_resources r
left join lc_subject_resources sr on sr.resource_id = r.id
left join lc_exam_subjects es on es.id = sr.exam_subject_id
group by r.id;

create or replace view lc_subject_stats as
select
  s.id as subject_id,
  count(distinct sr.resource_id) as resource_count,
  count(distinct es.exam_id) as exam_count
from lc_subjects s
left join lc_exam_subjects es on es.subject_id = s.id
left join lc_subject_resources sr on sr.exam_subject_id = es.id
group by s.id;

create or replace view lc_region_stats as
select
  r.id as region_id,
  count(distinct e.id) as exam_count
from lc_regions r
left join lc_exams e on e.region_id = r.id
group by r.id;
