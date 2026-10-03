-- ============================================================
-- Migration: Add has_hindi_subject column to exams and lc_exams
-- ============================================================
-- Indicates whether the official syllabus/exam pattern tests Hindi Language
-- (e.g. DSSSB, Bihar BPSC/BSSC, CGPSC, HSSC, HPAS, IBPS RRB, State TETs).
-- Exams where question papers are merely bilingual (SSC, Delhi Police) stay FALSE.

-- 1. Add to unified `exams` table (recommendation engine & candidate portal)
ALTER TABLE exams 
  ADD COLUMN IF NOT EXISTS has_hindi_subject BOOLEAN DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_exams_has_hindi_subject 
  ON exams(has_hindi_subject);

-- 2. Add to `lc_exams` table (Admin CMS catalog)
ALTER TABLE lc_exams 
  ADD COLUMN IF NOT EXISTS has_hindi_subject BOOLEAN DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_lc_exams_has_hindi_subject 
  ON lc_exams(has_hindi_subject);
