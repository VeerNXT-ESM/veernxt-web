import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://jtcyeufhvpieyngracpo.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * GET /api/exams?examId=<uuid>
 *
 * Exam header + syllabus for the learner-facing syllabus page
 * (src/pages/ExamSyllabus.jsx). Reads the unified `exams` table (exam_id ==
 * lc_exams.id, see status_report.md §27.5) for subject_requirements — the
 * actual content-team-authored syllabus — and resolves conducting body /
 * region names via the clean lc_conducting_bodies/lc_regions tables rather
 * than exams.conducting_body's older free-text column. Service-role, same
 * pattern as api/jobs.js, so this sidesteps needing anon-role RLS on `exams`.
 */
export default async function handler(req, res) {
  const { examId } = req.query;
  if (!examId) {
    return res.status(400).json({ ok: false, error: 'Missing examId' });
  }

  try {
    let { data: exam, error } = await supabase
      .from('exams')
      .select('exam_id, exam_name, conducting_body, state_ut, career_track, subject_requirements, base_url, region_id, conducting_body_id, thumbnail_subject')
      .eq('exam_id', examId)
      .maybeSingle();

    if (error) throw error;

    // Fallback: If not found directly in `exams`, check `lc_exams`
    if (!exam) {
      const { data: lcExam } = await supabase
        .from('lc_exams')
        .select('id, name, category, thumbnail_subject, conducting_body_id, region_id, conducting_body:lc_conducting_bodies(name), region:lc_regions(name, level)')
        .eq('id', examId)
        .maybeSingle();

      if (lcExam) {
        // Try finding content-rich row in `exams` table by name
        const cleanName = lcExam.name.replace(/\([^)]*\)/g, '').trim();
        const { data: matchByName } = await supabase
          .from('exams')
          .select('exam_id, exam_name, conducting_body, state_ut, career_track, subject_requirements, base_url, region_id, conducting_body_id, thumbnail_subject')
          .ilike('exam_name', `%${cleanName}%`)
          .limit(1)
          .maybeSingle();

        if (matchByName) {
          exam = matchByName;
        } else {
          exam = {
            exam_id: lcExam.id,
            exam_name: lcExam.name,
            conducting_body: lcExam.conducting_body?.name || '',
            state_ut: lcExam.region?.name || '',
            career_track: lcExam.category || 'Government Exams',
            subject_requirements: {},
            base_url: null,
            region_id: lcExam.region_id,
            conducting_body_id: lcExam.conducting_body_id,
            thumbnail_subject: lcExam.thumbnail_subject || 'general',
          };
        }
      }
    }

    if (!exam) {
      return res.status(404).json({ ok: false, error: 'Exam not found' });
    }

    const [bodyResult, regionResult] = await Promise.all([
      exam.conducting_body_id
        ? supabase.from('lc_conducting_bodies').select('id, name').eq('id', exam.conducting_body_id).maybeSingle()
        : Promise.resolve({ data: null }),
      exam.region_id
        ? supabase.from('lc_regions').select('id, name, level').eq('id', exam.region_id).maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

    return res.status(200).json({
      ok: true,
      exam: {
        id: exam.exam_id,
        name: exam.exam_name,
        conductingBody: bodyResult.data?.name || exam.conducting_body,
        region: regionResult.data?.name || exam.state_ut,
        level: regionResult.data?.level || null,
        careerTrack: exam.career_track,
        website: exam.base_url,
        thumbnailSubject: exam.thumbnail_subject,
        subjects: exam.subject_requirements || {},
      },
    });
  } catch (err) {
    console.error('exams API error:', err);
    return res.status(500).json({ ok: false, error: err.message });
  }
}
