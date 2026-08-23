-- Additive column: links a scraped job posting to the canonical lc_exams
-- catalog, alongside (not replacing) the existing jobs.exam_id -> exams
-- FK, which is separately known to be wrong on ~75% of its populated rows.
alter table jobs add column if not exists lc_exam_id uuid references lc_exams(id);
create index if not exists idx_jobs_lc_exam_id on jobs(lc_exam_id);
