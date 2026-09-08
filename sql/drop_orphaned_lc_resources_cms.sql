-- Removes the orphaned admin-only Learning Center CMS: lc_resources /
-- lc_subjects / lc_exam_subjects / lc_subject_resources, plus the three
-- aggregate views built over them. Its admin UI (ResourcesTab.jsx,
-- ResourcesPage.jsx, SyllabusTab.jsx, SyllabusPage.jsx,
-- ExamSubjectsPanel.jsx, their routes/nav entries) was already removed
-- earlier this session (2026-09-08) after confirming no learner-facing
-- route ever read these tables.
--
-- At that point the tables were kept rather than dropped -- a live check
-- had found 45 lc_resources rows with status='published' and real R2
-- URLs, plus ~17,600 real lc_exam_subjects/lc_subject_resources link
-- rows, contradicting an earlier "all draft, empty" assumption. Re-checked
-- properly before this drop: all 45 published rows match an existing
-- `resources` row by BOTH file_hash and title (100%, verified live) --
-- byte-identical content already present in the canonical live table,
-- not unique data. Nothing is lost by dropping this system.
--
-- Backed up in full first (98 lc_resources + 12 lc_subjects + 6,663
-- lc_exam_subjects + 10,951 lc_subject_resources rows, count-verified) to
-- scratch/_tmp_lc_resources_system_full_backup.json before this ran.
--
-- Kept: lc_exams, lc_regions, lc_conducting_bodies, lc_thumbnail_templates,
-- lc_tags, lc_exam_tags, lc_region_stats -- all still live, shared with
-- lc_exam_resource_map/lc_exam_intro and the exam editor (ExamEditorPanel.jsx).

drop view if exists lc_exam_stats;
drop view if exists lc_resource_usage;
drop view if exists lc_subject_stats;

drop table if exists lc_subject_resources;
drop table if exists lc_exam_subjects;
drop table if exists lc_resources;
drop table if exists lc_subjects;
