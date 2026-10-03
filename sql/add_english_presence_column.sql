-- ============================================================
-- Migration: Add has_english_subject column to exams and lc_exams
-- ============================================================
-- Indicates whether the official syllabus/exam pattern includes an
-- English Language / Comprehension component (qualifying English papers
-- and English-or-Hindi option sections included).

-- 1. Add to unified `exams` table (recommendation engine & candidate portal)
ALTER TABLE exams 
  ADD COLUMN IF NOT EXISTS has_english_subject BOOLEAN DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_exams_has_english_subject 
  ON exams(has_english_subject);

-- 2. Add to `lc_exams` table (Admin CMS catalog)
ALTER TABLE lc_exams 
  ADD COLUMN IF NOT EXISTS has_english_subject BOOLEAN DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_lc_exams_has_english_subject 
  ON lc_exams(has_english_subject);
