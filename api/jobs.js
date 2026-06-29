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

export default async function handler(req, res) {
  try {
    const { data, error } = await supabase
      .from('jobs')
      .select('*, exams(conducting_body)')
      .order('published_on', { ascending: false, nullsFirst: false });

    if (error) {
      console.error('jobs API error:', error);
      return res.status(500).json({ ok: false, error: error.message });
    }

    const mappedJobs = (data || []).map(job => ({
      ...job,
      id: job.job_id,
      title: job.title,
      body: job.exams?.conducting_body || extractCompany(job),
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
