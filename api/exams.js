import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://jtcyeufhvpieyngracpo.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function handleFetchChapter(req, res) {
  const { resourceId, chapterIndex } = req.query;
  const idx = parseInt(chapterIndex, 10);
  if (!resourceId || isNaN(idx)) {
    return res.status(400).json({ ok: false, error: 'resourceId and chapterIndex are required' });
  }

  try {
    // 1. Fetch resource metadata from DB
    const { data: resource, error: resErr } = await supabase
      .from('resources')
      .select('resource_id, title, category, storage_base_url, is_freemium')
      .eq('resource_id', resourceId)
      .maybeSingle();

    if (resErr || !resource) {
      return res.status(404).json({ ok: false, error: 'Resource not found' });
    }

    const cat = (resource.category || '').toLowerCase().trim();

    // 2. Paid category gate: Precis, PYQ require active paid subscription
    if (cat === 'precis' || cat === 'pyq') {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(403).json({ ok: false, error: 'Authentication and paid subscription required to access this resource', locked: true });
      }

      const token = authHeader.substring(7);
      const { data: { user }, error: userErr } = await supabase.auth.getUser(token);
      if (userErr || !user) {
        return res.status(401).json({ ok: false, error: 'Invalid or expired session token', locked: true });
      }

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('subscription_tier, subscription_expires_at')
        .eq('id', user.id)
        .maybeSingle();

      const tier = profile?.subscription_tier;
      const expiresAt = profile?.subscription_expires_at;
      const isPaid = ['MONTHLY', 'ANNUAL', 'BIENNIAL', 'PREMIUM'].includes(tier) && (!expiresAt || new Date(expiresAt) > new Date());

      if (!isPaid) {
        return res.status(403).json({ ok: false, error: 'Upgrade to a paid subscription to view this resource', locked: true });
      }
    }

    // 3. Fetch chapter content from storage
    if (!resource.storage_base_url) {
      return res.status(404).json({ ok: false, error: 'Resource storage URL missing' });
    }

    const base = resource.storage_base_url.endsWith('/') ? resource.storage_base_url : `${resource.storage_base_url}/`;
    const chapterUrl = `${base}chapters/chapter-${idx + 1}.json`;
    const resp = await fetch(chapterUrl);
    if (!resp.ok) {
      return res.status(404).json({ ok: false, error: 'Chapter content not found' });
    }

    const chapterData = await resp.json();
    return res.status(200).json({ ok: true, chapter: chapterData });
  } catch (err) {
    console.error('handleFetchChapter error:', err);
    return res.status(500).json({ ok: false, error: err.message });
  }
}

/**
 * GET /api/exams?examId=<uuid>
 * GET /api/exams?fn=chapter&resourceId=<id>&chapterIndex=<index>
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
  const { fn, examId } = req.query;
  if (fn === 'chapter') return handleFetchChapter(req, res);

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

    const [bodyResult, regionResult, categoryResult] = await Promise.all([
      exam.conducting_body_id
        ? supabase.from('lc_conducting_bodies').select('id, name').eq('id', exam.conducting_body_id).maybeSingle()
        : Promise.resolve({ data: null }),
      exam.region_id
        ? supabase.from('lc_regions').select('id, name, level').eq('id', exam.region_id).maybeSingle()
        : Promise.resolve({ data: null }),
      // lc_exams.category drives the category thumbnail image (see thumbnailTaxonomy.js).
      supabase.from('lc_exams').select('category').eq('id', examId).maybeSingle(),
    ]);

    return res.status(200).json({
      ok: true,
      exam: {
        id: exam.exam_id,
        name: exam.exam_name,
        conductingBody: bodyResult.data?.name || exam.conducting_body,
        region: regionResult.data?.name || exam.state_ut,
        level: regionResult.data?.level || null,
        category: categoryResult.data?.category || null,
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
