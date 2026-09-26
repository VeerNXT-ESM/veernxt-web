import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://jtcyeufhvpieyngracpo.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

function extractCompany(job) {
  // If the raw JSON has a conducting body that isn't a scraper source, use it
  if (job.raw_json?.conducting_body && !['Adda247', 'Sarkari Job Portal', 'FreeJobAlert'].includes(job.raw_json.conducting_body)) {
    return job.raw_json.conducting_body;
  }
  // Try to extract the company from the title before common job keywords
  const title = job.title || '';
  const match = title.match(/^(.*?)(?=\s+(?:Recruitment|Notification|Apprentice|Online Form|Admit Card|Result|Vacancy|Various|Officer|Clerk|PO|SO|Manager|Engineer|Trainee|Intake|Staff|Assistant))/i);
  if (match && match[1].trim().length > 1) {
    return match[1].trim();
  }
  // Ultimate fallback to first word
  return title.split(' ')[0] || 'Unknown';
}

async function handleLegacyJobs(req, res) {
  try {
    const { data, error } = await supabase
      .from('jobs')
      .select('*, exams(conducting_body), lc_exams(name, lc_conducting_bodies(name))')
      .order('published_on', { ascending: false, nullsFirst: false });

    if (error) {
      console.error('jobs API error:', error);
      return res.status(500).json({ ok: false, error: error.message });
    }

    const mappedJobs = (data || []).map(job => ({
      ...job,
      id: job.job_id,
      title: job.title,
      // Prefer the lc_exams-linked conducting body (scripts/match_jobs_to_lc_exams.mjs,
      // matched against the canonical catalog) over the older exams.exam_id FK,
      // which is separately known to be wrong on ~75% of its populated rows.
      body: job.lc_exams?.lc_conducting_bodies?.name || job.exams?.conducting_body || extractCompany(job),
      // Required exam for this job, when matched — only ~14/549 rows have
      // lc_exam_id populated today (scripts/match_jobs_to_lc_exams.mjs's
      // conservative pass); the frontend must degrade gracefully when null.
      examId: job.lc_exam_id || null,
      examName: job.lc_exams?.name || null,
      careerTrack: job.career_track || null,
      publishedOn: job.published_on,
      lastDate: job.last_date,
      vacancies: job.vacancies,
      ageRange: job.age_range,
      url: job.url,
      notes: job.raw_json?.notes || '',
      detailed_markdown: job.raw_json?.detailed_markdown || '',
      standard_details: job.raw_json?.standard_details || null
    }));

    return res.status(200).json({ ok: true, jobs: mappedJobs });
  } catch (err) {
    console.error('jobs API catch:', err);
    return res.status(500).json({ ok: false, error: err.message });
  }
}

// jobs_v2 table (New Jobs tab). Lives in this file rather than its own
// api/jobs-v2.js because Vercel's Hobby plan caps a deployment at 12
// serverless functions; /api/jobs-v2 is rewritten to /api/jobs?source=v2 in
// vercel.json so the client URL is unchanged.
function extractBodyFromTitle(title = '') {
  const match = title.match(/^(.*?)(?=\s+(?:Recruitment|Notification|Apprentice|Online Form|Admit Card|Result|Vacancy|Various|Officer|Clerk|PO|SO|Manager|Engineer|Trainee|Intake|Staff|Assistant))/i);
  if (match && match[1].trim().length > 1) return match[1].trim();
  return title.split(' ')[0] || 'Unknown';
}

async function handleJobsV2(req, res) {
  try {
    // Paginate in chunks to get all rows
    const PAGE_SIZE = 1000;
    let allRows = [];
    let page = 0;

    while (true) {
      const { data, error } = await supabase
        .from('jobs_v2')
        .select('*')
        .order('created_at', { ascending: false, nullsFirst: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (error) {
        console.error('jobs-v2 API error:', error);
        return res.status(500).json({ ok: false, error: error.message });
      }

      if (!data || data.length === 0) break;
      allRows.push(...data);
      if (data.length < PAGE_SIZE) break;
      page++;
    }

    const mappedJobs = allRows.map(job => ({
      ...job,
      id: job.id,
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
      // V2 marker for UI
      _source: 'jobs_v2',
    }));

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
