import { createClient } from '@supabase/supabase-js';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://jtcyeufhvpieyngracpo.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

function pickCanonicalStorageBaseUrl(rows) {
  const counts = new Map();
  const maxChaptersByUrl = new Map();
  for (const r of rows) {
    if (!r.storage_base_url) continue;
    const w = r.status === 'Published' ? 10 : 1;
    counts.set(r.storage_base_url, (counts.get(r.storage_base_url) || 0) + w);
    const ch = Number(r.chapter_count) || 0;
    if (ch > (maxChaptersByUrl.get(r.storage_base_url) || 0)) {
      maxChaptersByUrl.set(r.storage_base_url, ch);
    }
  }
  let best = null;
  let bestCount = -1;
  let bestCh = -1;
  for (const [url, c] of counts) {
    const ch = maxChaptersByUrl.get(url) || 0;
    if (c > bestCount || (c === bestCount && ch > bestCh)) {
      best = url;
      bestCount = c;
      bestCh = ch;
    }
  }
  return best;
}

async function resolveCanonicalResource(resource) {
  if (!resource) return resource;
  const cat = (resource.category || '').trim();
  if ((cat === 'Guide' || cat === 'Precis') && resource.title) {
    const { data: groupRows } = await supabase
      .from('resources')
      .select('resource_id, title, category, storage_base_url, chapter_count, status, is_freemium')
      .eq('category', cat)
      .eq('format', 'blocks')
      .ilike('title', resource.title.trim());
    if (groupRows && groupRows.length > 0) {
      const canonicalUrl = pickCanonicalStorageBaseUrl(groupRows);
      if (canonicalUrl) {
        resource.storage_base_url = canonicalUrl;
      }
      const maxCh = Math.max(...groupRows.map((r) => Number(r.chapter_count) || 0));
      if (maxCh > (Number(resource.chapter_count) || 0)) {
        resource.chapter_count = maxCh;
      }
    }
  }
  return resource;
}

async function fetchJsonFromR2(fullUrl) {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6000);
    const resp = await fetch(`${fullUrl}${fullUrl.includes('?') ? '&' : '?'}t=${Date.now()}`, {
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (resp.ok) {
      return await resp.json();
    }
  } catch (err) {
    // Fall through to S3 client fallback if public r2.dev domain times out
  }

  const r2AccountId = process.env.R2_ACCOUNT_ID;
  const r2Bucket = process.env.R2_BUCKET_NAME;
  const r2AccessKeyId = process.env.R2_ACCESS_KEY_ID;
  const r2SecretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const r2PublicUrl = (process.env.R2_PUBLIC_URL || '').replace(/\/+$/, '');
  const cleanUrl = fullUrl.split('?')[0];

  if (r2AccountId && r2Bucket && r2AccessKeyId && r2SecretAccessKey && r2PublicUrl && cleanUrl.startsWith(`${r2PublicUrl}/`)) {
    const key = cleanUrl.slice(r2PublicUrl.length + 1);
    const s3 = new S3Client({
      region: 'auto',
      endpoint: `https://${r2AccountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId: r2AccessKeyId, secretAccessKey: r2SecretAccessKey },
    });
    const out = await s3.send(new GetObjectCommand({ Bucket: r2Bucket, Key: key }));
    const bodyStr = await out.Body.transformToString('utf-8');
    return JSON.parse(bodyStr);
  }
  return null;
}

async function handleFetchMetadata(req, res) {
  const { resourceId } = req.query;
  if (!resourceId) {
    return res.status(400).json({ ok: false, error: 'resourceId is required' });
  }
  try {
    const { data: rawResource, error: resErr } = await supabase
      .from('resources')
      .select('resource_id, title, category, storage_base_url, chapter_count, status, is_freemium')
      .eq('resource_id', resourceId)
      .maybeSingle();

    if (resErr || !rawResource) {
      return res.status(404).json({ ok: false, error: 'Resource not found' });
    }

    const resource = await resolveCanonicalResource(rawResource);
    if (!resource.storage_base_url) {
      return res.status(404).json({ ok: false, error: 'Resource storage URL missing' });
    }

    const base = resource.storage_base_url.endsWith('/') ? resource.storage_base_url : `${resource.storage_base_url}/`;
    const metadata = await fetchJsonFromR2(`${base}metadata.json`);
    if (!metadata) {
      return res.status(404).json({ ok: false, error: 'Metadata not found' });
    }

    return res.status(200).json({
      ok: true,
      storageBaseUrl: resource.storage_base_url,
      metadata,
    });
  } catch (err) {
    console.error('handleFetchMetadata error:', err);
    return res.status(500).json({ ok: false, error: err.message });
  }
}

async function handleFetchChapter(req, res) {
  const { resourceId, chapterIndex, fileName } = req.query;
  const idx = parseInt(chapterIndex, 10);
  if (!resourceId || isNaN(idx)) {
    return res.status(400).json({ ok: false, error: 'resourceId and chapterIndex are required' });
  }

  try {
    // 1. Fetch resource metadata from DB and resolve canonical storage_base_url
    const { data: rawResource, error: resErr } = await supabase
      .from('resources')
      .select('resource_id, title, category, storage_base_url, chapter_count, status, is_freemium')
      .eq('resource_id', resourceId)
      .maybeSingle();

    if (resErr || !rawResource) {
      return res.status(404).json({ ok: false, error: 'Resource not found' });
    }

    const resource = await resolveCanonicalResource(rawResource);
    const cat = (resource.category || '').toLowerCase().trim();

    // 2. Paid category gate: Open to everyone by default directly in code
    // (Only enforced if VITE_LOCK_PAYWALL='true' or LOCK_PAYWALL='true' is explicitly set).
    const isExplicitlyLocked =
      process.env.VITE_LOCK_PAYWALL === 'true' ||
      process.env.LOCK_PAYWALL === 'true';

    if (isExplicitlyLocked && (cat === 'precis' || cat === 'pyq')) {
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
      const isPaid = (tier === 'TESTER' || ['MONTHLY', 'ANNUAL', 'BIENNIAL', 'PREMIUM'].includes(tier)) && (!expiresAt || new Date(expiresAt) > new Date());

      if (!isPaid) {
        return res.status(403).json({ ok: false, error: 'Upgrade to a paid subscription to view this resource', locked: true });
      }
    }

    // 3. Fetch chapter content from storage
    if (!resource.storage_base_url) {
      return res.status(404).json({ ok: false, error: 'Resource storage URL missing' });
    }

    const base = resource.storage_base_url.endsWith('/') ? resource.storage_base_url : `${resource.storage_base_url}/`;
    const safeFileName = typeof fileName === 'string' && /^chapters\/chapter-\d+\.json$/.test(fileName)
      ? fileName
      : `chapters/chapter-${idx + 1}.json`;
    const chapterData = await fetchJsonFromR2(`${base}${safeFileName}`);
    if (!chapterData) {
      return res.status(404).json({ ok: false, error: 'Chapter content not found' });
    }

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
  if (fn === 'metadata') return handleFetchMetadata(req, res);

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
