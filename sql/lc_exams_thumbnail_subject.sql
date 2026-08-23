-- Mirrors exams.thumbnail_subject onto lc_exams so the admin CMS (still
-- reading lc_exams -- not yet repointed at the unified exams table, see
-- status_report.md §27.9) can render the new subject-based thumbnails
-- without waiting on that larger repoint.
alter table lc_exams add column if not exists thumbnail_subject text;
