-- lc_exam_resource_map and lc_exam_quiz_map were created with RLS
-- enabled by default (this Supabase project auto-enables RLS on new
-- tables) but zero policies, so the anon key -- what every candidate's
-- browser actually uses -- reads 0 rows from both, silently. Match the
-- established pattern for these admin-populated, publicly-read lookup
-- tables (see lc_exam_intro, which already has RLS disabled).
ALTER TABLE lc_exam_resource_map DISABLE ROW LEVEL SECURITY;
ALTER TABLE lc_exam_quiz_map DISABLE ROW LEVEL SECURITY;
