#!/usr/bin/env node
/**
 * scripts/match_jobs_to_lc_exams.mjs
 *
 * Populates jobs.lc_exam_id by matching each job's scraped free-text
 * raw_json.exam_name / raw_json.conducting_body against the canonical
 * lc_exams catalog. Additive -- does not touch the existing (separately
 * known to be ~75% wrong) jobs.exam_id -> exams FK.
 *
 * Requires agreement between BOTH signals before accepting a match:
 *   1. conducting-body token-overlap similarity against lc_conducting_bodies
 *   2. exam-name token-overlap similarity against lc_exams, restricted to
 *      the conducting bodies that passed (1), and only accepted if the
 *      best candidate clearly beats the runner-up (no coin-flip guesses)
 * Anything short of both bars is left unmatched -- correctness over
 * coverage, same convention as scripts/build_exam_legacy_crosswalk.mjs.
 *
 * Usage:
 *   node scripts/match_jobs_to_lc_exams.mjs            # dry run
 *   node scripts/match_jobs_to_lc_exams.mjs --execute  # writes
 */
import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

function loadEnv() {
  const envPath = path.resolve(process.cwd(), '.env');
  const lines = fs.readFileSync(envPath, 'utf-8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (!(key in process.env)) process.env[key] = value;
  }
}
loadEnv();

const EXECUTE = process.argv.includes('--execute');
const BODY_SIM_MIN = 0.6;
const NAME_SIM_MIN = 0.34;
const NAME_WINNER_MARGIN = 0.15; // best candidate must clear runner-up by this much

const STOPWORDS = new Set(['the', 'of', 'and', 'for', 'exam', 'examination', 'recruitment', 'post', 'posts']);

// Generic institutional-template words that recur across dozens of
// differently-named bodies (every state has a "Public Service Commission",
// "Staff Selection Board", etc.) -- stripped only for BODY matching so
// containment there requires agreement on the distinguishing name (the
// state/ministry/company), not just the shared template words.
const BODY_GENERIC_WORDS = new Set(['staff', 'selection', 'board', 'commission', 'public', 'service', 'services', 'department', 'authority', 'corporation', 'limited', 'ltd', 'india', 'state', 'union', 'government', 'office', 'directorate']);

function tokens(s) {
  return (s || '')
    .toLowerCase()
    .replace(/[()&,'".:/-]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 1 && !STOPWORDS.has(t));
}

function bodyTokens(s) {
  return tokens(s).filter((t) => !BODY_GENERIC_WORDS.has(t));
}

// Overlap/min -- used for body matching (after stripping BODY_GENERIC_WORDS
// above) so a legitimate containment like "Kendriya Vidyalaya Sangathan"
// vs "Kendriya Vidyalaya Sangathan (KVS)" still scores well even though
// the two token sets are different sizes.
function overlapSim(aTok, bTok) {
  if (!aTok.length || !bTok.length) return 0;
  const setA = new Set(aTok);
  const setB = new Set(bTok);
  let inter = 0;
  for (const t of setA) if (setB.has(t)) inter++;
  return inter / Math.min(setA.size, setB.size);
}

// Jaccard (intersection/union) -- used for exam-name matching so a short
// exam name (e.g. "Manager", "Rajasthan Judiciary") doesn't get an
// artificially perfect score just by sharing one token with a much
// longer, mostly-unrelated job title.
function jaccardSim(aTok, bTok) {
  if (!aTok.length || !bTok.length) return 0;
  const setA = new Set(aTok);
  const setB = new Set(bTok);
  let inter = 0;
  for (const t of setA) if (setB.has(t)) inter++;
  const union = setA.size + setB.size - inter;
  return inter / union;
}

async function fetchAll(supabase, table, columns) {
  let all = [];
  let from = 0;
  const pageSize = 1000;
  while (true) {
    const { data, error } = await supabase.from(table).select(columns).range(from, from + pageSize - 1);
    if (error) throw error;
    all = all.concat(data);
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return all;
}

async function main() {
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

  const [jobs, lcExams] = await Promise.all([
    fetchAll(supabase, 'jobs', 'job_id,title,raw_json,lc_exam_id'),
    fetchAll(supabase, 'lc_exams', 'id,name,conducting_body:lc_conducting_bodies(name)'),
  ]);

  const lcExamsPrepped = lcExams.map((e) => ({
    ...e,
    nameTok: tokens(e.name.replace(/^\s*\d+\.\s*/, '')),
    cbTok: bodyTokens(e.conducting_body?.name),
  }));

  console.log(`jobs: ${jobs.length}, lc_exams: ${lcExams.length}`);

  let alreadyLinked = 0;
  const results = [];
  const unmatched = [];

  for (const job of jobs) {
    if (job.lc_exam_id) { alreadyLinked++; continue; }
    const scrapedCb = job.raw_json?.conducting_body || '';
    const scrapedName = job.raw_json?.exam_name || job.title || '';
    const cbTok = bodyTokens(scrapedCb);
    const nameTok = tokens(scrapedName);

    // Skip garbage rows (scraper captured an index page, not a real posting)
    // -- these have a conducting_body that's literally the scraper source name.
    const SCRAPER_NAMES = new Set(['adda247', 'sarkari job portal', 'freejobalert', 'examzy', 'indiagovtexam', 'sarkariresult', 'govtjobsalert', 'indgovtjobs', 'resultbharat', 'allgovernmentjobs']);
    if (SCRAPER_NAMES.has(scrapedCb.trim().toLowerCase())) { unmatched.push({ job, reason: 'scraper-name-as-body' }); continue; }

    // A handful of rows have the entire scraped page text dumped into
    // conducting_body instead of just the org name (p95 length is ~52
    // chars; a few outliers run to 15,000+) -- token-matching a page dump
    // picks up coincidental words from deep in the text (e.g. a
    // "Department Name: Home Dept." line) and produces false positives.
    if (scrapedCb.length > 100) { unmatched.push({ job, reason: 'garbage-conducting-body-field' }); continue; }

    // Require at least 2 distinguishing tokens on the shorter side --
    // otherwise a single shared generic-ish word (e.g. "education") between
    // two unrelated bodies scores a meaningless 100% overlap.
    const bodyCandidates = cbTok.length < 2 ? [] : lcExamsPrepped
      .filter((e) => e.cbTok.length >= 2)
      .map((e) => ({ e, sim: overlapSim(cbTok, e.cbTok) }))
      .filter((r) => r.sim >= BODY_SIM_MIN);

    if (bodyCandidates.length === 0) { unmatched.push({ job, reason: 'no-body-match' }); continue; }

    // If the body match is itself unique -- exactly one lc_exam anywhere
    // matches this conducting body at BODY_SIM_MIN or above -- that alone
    // identifies the exam, regardless of exam-name wording (a distinctive
    // conducting-body match with only one exam under it needs no further
    // corroboration; this is what actually resolves the bulk of real,
    // well-scraped single-exam bodies like a specific PSC or bank).
    if (bodyCandidates.length === 1) {
      const only = bodyCandidates[0];
      const nameSim = jaccardSim(nameTok, only.e.nameTok);
      // A unique conducting-body match is usually enough on its own, but if
      // the scraped post name shares literally zero tokens with the matched
      // exam name -- despite having enough tokens to expect some overlap if
      // it really were the same post -- this is more likely a body with
      // only one *catalogued* exam absorbing every other post from that
      // body (e.g. a bank's sole "Credit Officer" entry catching its
      // "Junior Associate" and "Office Assistant" postings too). Leave
      // those unmatched rather than accept a groundless link.
      if (nameTok.length >= 1 && nameSim === 0) {
        unmatched.push({ job, reason: 'unique-body-no-name-overlap' });
        continue;
      }
      results.push({ job_id: job.job_id, lc_exam_id: only.e.id, title: job.title, matchedName: only.e.name, bodySim: only.sim, nameSim, method: 'unique-body' });
      continue;
    }

    const scored = bodyCandidates
      .map((r) => ({ e: r.e, bodySim: r.sim, nameSim: jaccardSim(nameTok, r.e.nameTok) }))
      .filter((r) => r.nameSim >= NAME_SIM_MIN)
      .sort((a, b) => b.nameSim - a.nameSim);

    if (scored.length === 0) { unmatched.push({ job, reason: 'no-name-match', bodyCandidateCount: bodyCandidates.length }); continue; }
    if (scored.length > 1 && scored[0].nameSim - scored[1].nameSim < NAME_WINNER_MARGIN) {
      unmatched.push({ job, reason: 'ambiguous-name', top: scored.slice(0, 3).map((s) => `${s.e.name} (${s.nameSim.toFixed(2)})`) });
      continue;
    }

    const best = scored[0];
    results.push({ job_id: job.job_id, lc_exam_id: best.e.id, title: job.title, matchedName: best.e.name, bodySim: best.bodySim, nameSim: best.nameSim });
  }

  console.log(`\nAlready linked: ${alreadyLinked}`);
  console.log(`New matches: ${results.length}`);
  console.log(`Unmatched: ${unmatched.length}`);

  const reasonCounts = {};
  for (const u of unmatched) reasonCounts[u.reason] = (reasonCounts[u.reason] || 0) + 1;
  console.log('Unmatched reasons:', reasonCounts);

  console.log('\n--- Sample new matches ---');
  for (const r of results.slice(0, 15)) {
    console.log(`  "${r.title.slice(0, 60)}" -> "${r.matchedName}"  [body ${r.bodySim.toFixed(2)}, name ${r.nameSim.toFixed(2)}]`);
  }

  console.log('\n--- Sample ambiguous (skipped) ---');
  for (const u of unmatched.filter((u) => u.reason === 'ambiguous-name').slice(0, 5)) {
    console.log(`  "${u.job.title.slice(0, 60)}" -> candidates: ${u.top.join(' | ')}`);
  }

  if (!EXECUTE) {
    console.log('\nDry run only -- no writes made. Re-run with --execute to apply.');
    return;
  }

  console.log('\nWriting...');
  let written = 0;
  for (const r of results) {
    const { error } = await supabase.from('jobs').update({ lc_exam_id: r.lc_exam_id }).eq('job_id', r.job_id);
    if (error) { console.error(`FAILED job_id ${r.job_id}: ${error.message}`); continue; }
    written++;
  }
  console.log(`Done. Updated ${written}/${results.length} jobs rows.`);
}

main().catch((err) => { console.error(err); process.exit(1); });
