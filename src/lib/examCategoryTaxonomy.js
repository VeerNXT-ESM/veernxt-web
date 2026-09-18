/**
 * src/lib/examCategoryTaxonomy.js
 *
 * Historical seed list only -- used once by
 * scripts/exam-mapping/seed_exam_categories.mjs to populate the
 * lc_exam_categories table. The table, not this file, is now the live
 * source of truth: ExamEditorPanel.jsx's Category dropdown and
 * CategoriesPage.jsx both read lc_exam_categories directly, so the content
 * team can add/rename/delete categories from the admin UI without a code
 * change. Keep this file around as a record of the original 2026-09
 * normalization (see scripts/exam-mapping/normalize_exam_categories.mjs),
 * not as something any component should import going forward.
 *
 * Banking/Insurance and Railways/Metro Rail were split apart 2026-09-19 --
 * a source document (content team's own "Central Exams List") treats them
 * as distinct categories; the original normalization had wrongly merged
 * both pairs. Nursing was split out from the broader Health/Medical
 * grouping the same day, per the same document treating Nursing as its own
 * category. See scripts/exam-mapping/split_merged_categories.mjs.
 */
export const EXAM_CATEGORIES = [
  'Banking',
  'Insurance',
  'SSC',
  'Railways',
  'Metro Rail',
  'Defence',
  'Police & Security Services',
  'Judiciary & Legal Services',
  'Teaching & Education',
  'Nursing',
  'Health & Medical Services',
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
