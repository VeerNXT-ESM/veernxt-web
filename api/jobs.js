import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://jtcyeufhvpieyngracpo.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

// In-memory cache & in-flight deduplication to prevent concurrent requests
// from hammering Supabase and triggering Postgres statement timeouts.
const CACHE_TTL_MS = 3 * 60 * 1000; // 3 minutes
const cache = {
  legacy: { data: null, timestamp: 0, promise: null },
  v2: { data: null, timestamp: 0, promise: null },
};

function extractCompany(job) {
  const cb = job.conducting_body;
  if (cb && !['Adda247', 'Sarkari Job Portal', 'FreeJobAlert'].includes(cb)) {
    return cb;
  }
  const title = job.title || '';
  const match = title.match(/^(.*?)(?=\s+(?:Recruitment|Notification|Apprentice|Online Form|Admit Card|Result|Vacancy|Various|Officer|Clerk|PO|SO|Manager|Engineer|Trainee|Intake|Staff|Assistant))/i);
  if (match && match[1].trim().length > 1) {
    return match[1].trim();
  }
  return title.split(' ')[0] || 'Unknown';
}

function extractBodyFromTitle(title = '') {
  const match = title.match(/^(.*?)(?=\s+(?:Recruitment|Notification|Apprentice|Online Form|Admit Card|Result|Vacancy|Various|Officer|Clerk|PO|SO|Manager|Engineer|Trainee|Intake|Staff|Assistant))/i);
  if (match && match[1].trim().length > 1) return match[1].trim();
  return title.split(' ')[0] || 'Unknown';
}

async function queryLegacyJobs() {
  // Explicit column selection avoids pulling massive raw_json dumps (rawText, scraper HTML)
  // which previously triggered "canceling statement due to statement timeout" in Postgres.
  const { data, error } = await supabase
    .from('jobs')
    .select('job_id, exam_id, title, url, published_on, last_date, vacancies, age_range, lc_exam_id, career_track, created_at, detailed_markdown:raw_json->>detailed_markdown, standard_details:raw_json->standard_details, conducting_body:raw_json->>conducting_body, notes:raw_json->>notes, exams(conducting_body), lc_exams(name, lc_conducting_bodies(name))')
    .order('published_on', { ascending: false, nullsFirst: false })
    .limit(1000);

  if (error) {
    console.error('jobs API error:', error);
    throw error;
  }

  return (data || []).map(job => ({
    ...job,
    id: job.job_id,
    title: job.title,
    body: job.lc_exams?.lc_conducting_bodies?.name || job.exams?.conducting_body || extractCompany(job),
    examId: job.lc_exam_id || null,
    examName: job.lc_exams?.name || null,
    careerTrack: job.career_track || null,
    publishedOn: job.published_on,
    lastDate: job.last_date,
    vacancies: job.vacancies,
    ageRange: job.age_range,
    url: job.url,
    notes: job.notes || '',
    detailed_markdown: job.detailed_markdown || '',
    standard_details: job.standard_details || null,
  }));
}

async function handleLegacyJobs(req, res) {
  try {
    const isFresh = req.query?.fresh === 'true';
    const now = Date.now();

    if (!isFresh && cache.legacy.data && (now - cache.legacy.timestamp < CACHE_TTL_MS)) {
      res.setHeader('X-Cache', 'HIT');
      return res.status(200).json({ ok: true, jobs: cache.legacy.data });
    }

    if (!cache.legacy.promise) {
      cache.legacy.promise = queryLegacyJobs()
        .then(mappedJobs => {
          cache.legacy.data = mappedJobs;
          cache.legacy.timestamp = Date.now();
          cache.legacy.promise = null;
          return mappedJobs;
        })
        .catch(err => {
          cache.legacy.promise = null;
          throw err;
        });
    }

    const mappedJobs = await cache.legacy.promise;
    res.setHeader('X-Cache', 'MISS');
    res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=180, stale-while-revalidate=300');
    return res.status(200).json({ ok: true, jobs: mappedJobs });
  } catch (err) {
    console.error('jobs API catch:', err);
    return res.status(500).json({ ok: false, error: err.message });
  }
}

async function queryJobsV2() {
  // Specific columns avoid serializing huge raw_json dumps while extracting conducting_body
  const { data, error } = await supabase
    .from('jobs_v2')
    .select('job_id, exam_id, title, url, published_on, last_date, vacancies, age_range, created_at, lc_exam_id, career_track, tags, is_expired, updated_at, ai_description, conducting_body:raw_json->>conducting_body')
    .order('created_at', { ascending: false, nullsFirst: false })
    .limit(1000);

  if (error) {
    console.error('jobs-v2 API error:', error);
    throw error;
  }

  return (data || []).map(job => ({
    ...job,
    id: job.job_id || job.id,
    title: job.title,
    body: job.conducting_body || extractBodyFromTitle(job.title),
    careerTrack: job.career_track || null,
    publishedOn: job.published_on,
    lastDate: job.last_date,
    vacancies: job.vacancies,
    ageRange: job.age_range,
    url: job.url,
    tags: Array.isArray(job.tags) ? job.tags : [],
    aiDescription: job.ai_description || null,
    isExpired: job.is_expired || false,
    _source: 'jobs_v2',
  }));
}

async function handleJobsV2(req, res) {
  try {
    const isFresh = req.query?.fresh === 'true';
    const now = Date.now();

    if (!isFresh && cache.v2.data && (now - cache.v2.timestamp < CACHE_TTL_MS)) {
      res.setHeader('X-Cache', 'HIT');
      return res.status(200).json({ ok: true, jobs: cache.v2.data });
    }

    if (!cache.v2.promise) {
      cache.v2.promise = queryJobsV2()
        .then(mappedJobs => {
          cache.v2.data = mappedJobs;
          cache.v2.timestamp = Date.now();
          cache.v2.promise = null;
          return mappedJobs;
        })
        .catch(err => {
          cache.v2.promise = null;
          throw err;
        });
    }

    const mappedJobs = await cache.v2.promise;
    res.setHeader('X-Cache', 'MISS');
    res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=180, stale-while-revalidate=300');
    return res.status(200).json({ ok: true, jobs: mappedJobs });
  } catch (err) {
    console.error('jobs-v2 API catch:', err);
    return res.status(500).json({ ok: false, error: err.message });
  }
}

export default async function handler(req, res) {
  if (req.query?.source === 'v2') return handleJobsV2(req, res);
  return handleLegacyJobs(req, res);
}

