-- Stores the pre-computed dominant thumbnail subject key (one of the 17 in
-- src/lib/thumbnailTaxonomy.js) per exam, so ExamThumbnail.jsx can render
-- from a plain column instead of re-deriving it from resources_v2 on every
-- render. Recomputed by scripts/compute_exam_thumbnail_subjects.mjs
-- whenever content changes.
alter table exams add column if not exists thumbnail_subject text;
create index if not exists idx_exams_thumbnail_subject on exams(thumbnail_subject);
