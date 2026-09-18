-- lc_exams.category was free text (ExamEditorPanel.jsx's Category field had
-- no dropdown) and drifted into 180 near-duplicate raw strings across 1,544
-- exams (BANKING / Banking / Rural Banking / Cooperative Banking all the
-- same real sector -- see the investigation in this session). This adds a
-- column to preserve the original wording before
-- scripts/exam-mapping/normalize_exam_categories.mjs overwrites `category`
-- with a canonical value from src/lib/examCategoryTaxonomy.js. Non-destructive:
-- nothing already in `category` is lost, it just moves to `category_detail`.
alter table lc_exams add column if not exists category_detail text;
comment on column lc_exams.category_detail is 'Original free-text category label before the 2026-09 normalization onto src/lib/examCategoryTaxonomy.js canonical values. Admin-editable, informational only -- not used by any filter.';
