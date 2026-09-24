import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://jtcyeufhvpieyngracpo.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
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

function extractBodyFromTitle(title = '') {
  const match = title.match(/^(.*?)(?=\s+(?:Recruitment|Notification|Apprentice|Online Form|Admit Card|Result|Vacancy|Various|Officer|Clerk|PO|SO|Manager|Engineer|Trainee|Intake|Staff|Assistant))/i);
  if (match && match[1].trim().length > 1) return match[1].trim();
  return title.split(' ')[0] || 'Unknown';
}
