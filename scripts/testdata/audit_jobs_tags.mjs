/**
 * Read-only audit of the scraped jobs (jobs_v2 + legacy jobs):
 *  - what the Job Board's "Recommended for You" tab really selects (hardcoded keyword filter)
 *  - whether each jobs_v2 tag is supported by evidence in the job's own title / AI description
 *  - how many rows are not jobs at all (scholarships, admissions, results...)
 *  - which structured fields exist that a profile matcher could use (state, level, body, qualification)
 *
 * Output: test-data/baseline/jobs_audit.json
 * Usage:  node scripts/testdata/audit_jobs_tags.mjs
 */
import 'dotenv/config';
import { writeFileSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { createClient } from '@supabase/supabase-js';

const outDir = resolve(dirname(fileURLToPath(import.meta.url)), '../../test-data/baseline');
mkdirSync(outDir, { recursive: true });
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

async function all(table, cols) {
  const rows = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await sb.from(table).select(cols).range(from, from + 999);
    if (error) throw new Error(`${table}: ${error.message}`);
    rows.push(...data);
    if (data.length < 1000) break;
  }
  return rows;
}

const v2 = await all('jobs_v2', 'id:job_id,title,url,career_track,tags,ai_description,vacancies,age_range,raw_json,lc_exam_id,exam_id');
const legacy = await all('jobs', 'id:job_id,title,url,career_track,tags,age_range,raw_json,lc_exam_id,exam_id');

// --- 1. The Recommended tab (src/components/JobBoard.jsx: candidateKeywords) ---------------
const candidateKeywords = ['developer', 'graphic', 'game', 'designer', 'creative', 'artist', 'lip sync', 'dubbing', 'ai', 'intern', 'operations', 'video'];
const recommended = (rows) => rows.filter((j) => j.title && candidateKeywords.some((k) => j.title.toLowerCase().includes(k)));
const recV2 = recommended(v2);
const recLegacy = recommended(legacy);

// --- 2. Tag evidence ------------------------------------------------------------------------
const EVIDENCE = {
  postal_job: /post office|postal|india post|\bgds\b|dak sevak|postman|mail guard|डाक/i,
  banking_job: /bank|ibps|\bsbi\b|\brbi\b|nabard|sidbi|cooperative|बैंक/i,
  railway_job: /railway|\brrb\b|\brrc\b|\bircon\b|metro|रेलवे/i,
  ex_servicemen_job: /ex-?servicemen|ex servicemen|agniveer|veteran|पूर्व सैनिक/i,
  police_job: /police|constable|sub.?inspector|\bcapf\b|\bcrpf\b|\bcisf\b|\bbsf\b|\bitbp\b|\bssb\b|पुलिस/i,
  teaching_job: /teacher|\btgt\b|\bpgt\b|\bprt\b|lecturer|professor|\bctet\b|\btet\b|school|शिक्षक/i,
  medical_job: /nurs|medical|doctor|pharmac|health|hospital|\bnhm\b|\banm\b|\bgnm\b|aiims|paramedic|स्वास्थ्य/i,
  engineering_job: /engineer|\bje\b|technician|technical|diploma|\bgate\b|इंजीनियर/i,
  defence_job: /army|navy|air force|agniveer|defence|military|\bcds\b|\bnda\b|afcat|सेना/i,
  judiciary_job: /judic|court|\bclat\b|advocate|legal|न्यायालय/i,
  ssc_job: /\bssc\b|staff selection/i,
  upsc_job: /\bupsc\b|civil serv|\bias\b|\bifs\b/i,
  psu_job: /\bpsu\b|ongc|ntpc|bhel|\bsail\b|\bgail\b|\bioc\b|\bbpcl\b|hpcl|power grid|coal india|\bbel\b|\bhal\b|limited|\bltd\b/i,
  no_exam_job: /walk.?in|direct recruitment|without exam|no exam|merit|बिना परीक्षा/i,
};
const blob = (j) => `${j.title || ''} ${j.ai_description || ''}`;
const tagAudit = {};
for (const [tag, re] of Object.entries(EVIDENCE)) {
  const tagged = v2.filter((j) => (j.tags || []).includes(tag));
  const inTitle = tagged.filter((j) => re.test(j.title || '')).length;
  const inTitleOrAi = tagged.filter((j) => re.test(blob(j))).length;
  const inRaw = tagged.filter((j) => re.test(j.raw_json?.rawText || '')).length;
  tagAudit[tag] = { tagged: tagged.length, evidenceInTitle: inTitle, evidenceInTitleOrAi: inTitleOrAi, evidenceInRawPageText: inRaw, unsupportedPct: tagged.length ? +(100 * (1 - inTitleOrAi / tagged.length)).toFixed(0) : null };
}
// Recall check: jobs whose own title clearly says X but lack the tag
const recall = {};
for (const [tag, re] of Object.entries(EVIDENCE)) {
  const clear = v2.filter((j) => re.test(j.title || ''));
  recall[tag] = { titleSaysSo: clear.length, hasTag: clear.filter((j) => (j.tags || []).includes(tag)).length };
}

// --- 3. Non-job rows ------------------------------------------------------------------------
const NOT_A_JOB = /scholarship|admission|admit card|hall ticket|\bresult\b|answer key|syllabus|cut.?off|yojana|scheme|exam date|counselling|इनाम|छात्रवृत्ति|योजना|रिजल्ट|प्रवेश/i;
const nonJobs = v2.filter((j) => NOT_A_JOB.test(j.title || ''));

// --- 4. Structured fields a matcher could use -----------------------------------------------
const STATES = ['Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal', 'Delhi', 'Jammu', 'Kashmir', 'Ladakh', 'Chandigarh', 'Puducherry', 'Lakshadweep', 'Andaman'];
const stateInTitle = v2.filter((j) => STATES.some((s) => (j.title || '').toLowerCase().includes(s.toLowerCase())));
// Central-vs-State tag accuracy against unambiguous title markers (approximate: crude regexes)
const CENTRAL_ORG = /railway|\brrb\b|\brrc\b|ibps|\bsbi\b|\brbi\b|\bssc\b|upsc|\bcrpf\b|\bcisf\b|\bbsf\b|\bitbp\b|indian army|indian navy|air force|\baai\b|nabard|\bisro\b|drdo|\bongc\b|\bntpc\b|\bbhel\b|\bnhai\b|\blic\b|\bniacl\b|\bnicl\b|\bepfo\b|india post|aiims|\bcsir\b|\bugc\b/i;
const STATE_ORG = /uppsc|bpsc|rpsc|mppsc|hpsc|ppsc|tnpsc|kpsc|wbpsc|jpsc|opsc|appsc|tspsc|gpsc|uksssc|uttar pradesh|rajasthan|bihar|madhya pradesh|haryana|punjab|west bengal|odisha|gujarat|maharashtra|karnataka|kerala|tamil nadu|telangana|assam|jharkhand|chhattisgarh|himachal|uttarakhand|jammu|delhi/i;
const has = (j, t) => (j.tags || []).includes(t);
const centralTitles = v2.filter((j) => CENTRAL_ORG.test(j.title || ''));
const stateTitles = v2.filter((j) => STATE_ORG.test(j.title || '') && !CENTRAL_ORG.test(j.title || ''));
const levelTagAccuracy = {
  titlesClearlyCentral: centralTitles.length,
  ...{ ofWhichTaggedCentral: centralTitles.filter((j) => has(j, 'central_govt_job')).length, ofWhichTaggedState: centralTitles.filter((j) => has(j, 'state_govt_job')).length },
  titlesClearlyState: stateTitles.length,
  ...{ ofWhichTaggedState_: stateTitles.filter((j) => has(j, 'state_govt_job')).length, ofWhichTaggedCentral_: stateTitles.filter((j) => has(j, 'central_govt_job')).length },
  centralTagged: v2.filter((j) => has(j, 'central_govt_job')).length,
  stateTagged: v2.filter((j) => has(j, 'state_govt_job')).length,
  exampleCentralTaggedState: centralTitles.filter((j) => has(j, 'state_govt_job')).slice(0, 8).map((j) => (j.title || '').slice(0, 90)),
};
const sample = v2.find((j) => j.ai_description);
const legacyUrls = new Set(legacy.map((j) => j.url));
const bothTags = v2.filter((j) => (j.tags || []).includes('central_govt_job') && (j.tags || []).includes('state_govt_job'));
const tagCounts = v2.map((j) => (j.tags || []).length);

const audit = {
  ranAt: new Date().toISOString(),
  jobsV2: v2.length, jobsLegacy: legacy.length,
  v2UrlsAlsoInLegacy: v2.filter((j) => legacyUrls.has(j.url)).length,
  recommendedTab: {
    keywords: candidateKeywords,
    v2Matches: recV2.length, legacyMatches: recLegacy.length,
    behaviour: 'Same result for every user; if zero jobs match, the tab falls back to showing ALL jobs.',
    v2Sample: recV2.slice(0, 12).map((j) => j.title),
  },
  tagVocabulary: [...new Set(v2.flatMap((j) => j.tags || []))].sort(),
  tagsPerJob: { avg: +(tagCounts.reduce((a, b) => a + b, 0) / tagCounts.length).toFixed(1), max: Math.max(...tagCounts), min: Math.min(...tagCounts) },
  governmentJobOnEveryRow: v2.filter((j) => (j.tags || []).includes('government_job')).length,
  taggedBothCentralAndState: bothTags.length,
  tagAudit, recall, levelTagAccuracy,
  nonJobRows: { count: nonJobs.length, sample: nonJobs.slice(0, 15).map((j) => j.title) },
  structuredFields: {
    withStateNameInTitle: stateInTitle.length,
    withAgeRange: v2.filter((j) => j.age_range && !/not mentioned/i.test(j.age_range)).length,
    withVacancies: v2.filter((j) => j.vacancies).length,
    withConductingBody: v2.filter((j) => j.raw_json?.conducting_body && !/^(org:?|sarkari|resultbharat|indiagovtexam|freejobalert|adda247)/i.test(j.raw_json.conducting_body)).length,
    conductingBodyColumnExists: false,
    withQualificationInRawJson: v2.filter((j) => j.raw_json?.qualification).length,
    withLcExamId: v2.filter((j) => j.lc_exam_id).length,
    withExamId: v2.filter((j) => j.exam_id).length,
    withAiDescription: v2.filter((j) => j.ai_description).length,
    rawTextMedianChars: [...v2.map((j) => (j.raw_json?.rawText || '').length)].sort((a, b) => a - b)[Math.floor(v2.length / 2)],
  },
  aiDescriptionSample: sample ? { title: sample.title, text: sample.ai_description.slice(0, 1400) } : null,
  careerTrackCounts: Object.entries(v2.reduce((m, j) => { m[j.career_track] = (m[j.career_track] || 0) + 1; return m; }, {})).sort((a, b) => b[1] - a[1]),
};
writeFileSync(resolve(outDir, 'jobs_audit.json'), JSON.stringify(audit, null, 1));
console.log(JSON.stringify({ ...audit, tagAudit: undefined, recall: undefined, aiDescriptionSample: undefined, tagVocabulary: undefined }, null, 1));
console.log('\nTAG AUDIT (tagged / evidence in title+AI description / unsupported %):');
for (const [t, a] of Object.entries(tagAudit)) console.log(`  ${t.padEnd(20)} ${String(a.tagged).padStart(4)}  supported ${String(a.evidenceInTitleOrAi).padStart(4)}  raw-page ${String(a.evidenceInRawPageText).padStart(4)}  unsupported ${a.unsupportedPct}%`);
console.log('\nAI DESCRIPTION SAMPLE:\n', audit.aiDescriptionSample?.text);
