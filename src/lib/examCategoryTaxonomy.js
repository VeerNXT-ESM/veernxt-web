/**
 * src/lib/examCategoryTaxonomy.js
 *
 * Canonical lc_exams.category taxonomy. Replaces the free-text Category
 * input that let 1,544 exams accumulate 180 near-duplicate raw strings
 * (BANKING / Banking / Rural Banking / Cooperative Banking all meaning the
 * same sector) -- see scripts/exam-mapping/normalize_exam_categories.mjs,
 * the one-time migration that folded those 180 raw values onto this list
 * and preserved the original wording in lc_exams.category_detail.
 *
 * Every admin Category filter (ExamsPage, LinkExamsDrawer,
 * PublishContentPage, ExamResourcesPanel) derives its options live from
 * distinct lc_exams.category values already in the DB -- once the data is
 * normalized onto this list, those filters show this list automatically,
 * no per-page changes needed. This file exists so ExamEditorPanel's
 * Category field can be a dropdown instead of free text, preventing the
 * same drift from happening again.
 */
export const EXAM_CATEGORIES = [
  'Banking & Insurance',
  'SSC',
  'Railways & Metro',
  'Defence',
  'Police & Security Services',
  'Judiciary & Legal Services',
  'Teaching & Education',
  'Health, Medical & Nursing Services',
  'Administrative & Civil Services',
  'Engineering Services',
  'Agriculture & Rural Development',
  'Public Sector Undertakings (PSU)',
  'Postal Services',
  'Transport Services',
  'IT & Technical Services',
  'Disaster Management',
  'Food & Civil Supplies',
  'Tourism & Hospitality',
  'Group / Class Posts (Ungraded)',
  'Other Government Exams',
];
