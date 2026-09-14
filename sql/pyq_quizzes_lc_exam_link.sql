-- Additive column: links a pyq_papers/quizzes row to the canonical
-- lc_exams catalog, alongside (not replacing) the existing free-text
-- exam_name column that candidate-facing code (PyqReader.jsx, PyqCenter.jsx,
-- useLearningContent.js, etc.) still matches on by name. `exams` (the other,
-- service-role-only exams table) was considered and rejected here: neither
-- PyqPapersPage.jsx nor QuizzesPage.jsx go through a server API, so a picker
-- would not be able to read it from the browser at all. Same reasoning and
-- same column name as jobs.lc_exam_id (sql/jobs_lc_exam_link.sql).
alter table pyq_papers add column if not exists lc_exam_id uuid references lc_exams(id);
alter table quizzes add column if not exists lc_exam_id uuid references lc_exams(id);
create index if not exists idx_pyq_papers_lc_exam_id on pyq_papers(lc_exam_id);
create index if not exists idx_quizzes_lc_exam_id on quizzes(lc_exam_id);
