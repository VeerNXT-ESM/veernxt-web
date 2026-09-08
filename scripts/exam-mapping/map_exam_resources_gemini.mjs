#!/usr/bin/env node
/**
 * scripts/map_exam_resources_gemini.mjs
 *
 * Phase 1 of the admin data-quality plan (see status_report.md and the
 * approved plan this session): for each lc_exams row, ask Gemini to pick
 * the best-fit resources rows per category (Intro/Guide/Precis/PYQ)
 * from a candidate shortlist, and write verified rows to
 * lc_exam_resource_map (sql/lc_exam_resource_map.sql). This replaces
 * src/hooks/useExamContent.js's runtime exact -> ilike -> career-track
 * fuzzy chain with a precomputed, reasoned mapping for exams that have one
 * — useExamContent.js still falls back to the old chain for exams this
 * script hasn't covered yet, so nothing regresses mid-rollout.
 *
 * Candidate shortlist per exam (deduped by resource_id, capped at 40),
 * built the same way useExamContent.js's fetchByExamName already does
 * PLUS two extra tiers this script adds because it has a bigger job than
 * a single runtime lookup — surfacing the "niche unlinked" resources
 * status_report.md §26.3 flagged, not just repeating today's behavior:
 *   1. Exact/ilike match against resources.exam_name (today's primary
 *      signal).
 *   2. Every "dominant" universal-subject resource (English/Reasoning/
 *      Maths/GK/Hindi/Computer Science — src/lib/thumbnailTaxonomy.js's
 *      CORE_TITLE_TO_SUBJECT) — nearly every exam wants a subset of these
 *      per its subject_requirements.
 *   3. For a state/UT exam: resources rows matching
 *      REGION_GS_TITLE_PATTERN whose title contains the exam's region
 *      name — the state GS/SI books that were seeded unlinked.
 *   4. Career-track keyword fallback (same mapping useExamContent.js
 *      already uses: POLICE_CAPF->Constable, SSC->SSC, RAILWAYS->RRB,
 *      BANKING->IBPS, DEFENCE->Defence).
 *
 * Gemini is explicitly told to leave a category empty rather than force a
 * weak pick — same "leave unmatched rather than force weak" principle
 * scripts/match_jobs_to_lc_exams.mjs already established for this project.
 *
 * Modes:
 *   --sample=N       Process only the first N exams missing a mapping, no
 *                    writes unless --execute is also passed. Prints per-exam
 *                    token usage so real cost can be extrapolated to the
 *                    full batch before running it. Default 20.
 *   --execute        Actually write lc_exam_resource_map rows. Without this
 *                    flag the script only prints what it WOULD write.
 *   --all            Also reprocess exams that already have mapping rows
 *                    (skipped by default so a re-run only covers new gaps).
 *   --concurrency=N  How many exams' Gemini calls run in flight at once.
 *                    Default 5. Exact-match short-circuited exams (see
 *                    below) never touch Gemini so aren't affected by this.
 *
 * Exact-match short-circuit: candidates are now tagged by which tier of
 * buildCandidates found them (exact / dominant / region / career_track).
 * A category whose only candidates are 'exact' tier (the resource's
 * exam_name, stripped-prefix-normalized, is literally the same string as
 * the exam's name) is resolved directly with source='exact_name' and
 * never sent to Gemini at all -- there's no real ambiguity for Gemini to
 * adjudicate, same as useExamContent.js's runtime chain already treating
 * an exact exam_name match as authoritative over the ilike fallback. If
 * exact-tier candidates exist for a category alongside fuzzier ones, the
 * fuzzy ones are dropped for that category (the exact match already
 * answers "is this exam-relevant", so they'd only be noise). An exam
 * whose every non-empty category resolves this way skips the Gemini call
 * entirely. This exists because ~91% of lc_exams (1,396 of 1,530) are
 * still unmapped as of 2026-09-08 -- meaningfully cutting both the
 * Gemini bill and wall-clock time for the full run matters here.
 *
 * Usage:
 *   node scripts/map_exam_resources_gemini.mjs --sample=20
 *   node scripts/map_exam_resources_gemini.mjs --execute --concurrency=8
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { CORE_TITLE_TO_SUBJECT, REGION_GS_TITLE_PATTERN } from '../../src/lib/thumbnailTaxonomy.js';

const args = process.argv.slice(2);
const EXECUTE = args.includes('--execute');
const ALL = args.includes('--all');
const VERBOSE = args.includes('--verbose');
const sampleArg = args.find((a) => a.startsWith('--sample='));
const SAMPLE = sampleArg ? parseInt(sampleArg.split('=')[1], 10) : (EXECUTE ? Infinity : 20);
const concurrencyArg = args.find((a) => a.startsWith('--concurrency='));
const CONCURRENCY = concurrencyArg ? Math.max(1, parseInt(concurrencyArg.split('=')[1], 10)) : 5;

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${GEMINI_API_KEY}`;

const CATEGORIES = ['Intro', 'Guide', 'Precis', 'PYQ'];

// Same career-track -> keyword fallback useExamContent.js's fetchByExamName
// uses as its last-resort tier.
const CAREER_TRACK_KEYWORD = {
  POLICE_CAPF: 'Constable',
  SSC: 'SSC',
  RAILWAYS: 'RRB',
  BANKING: 'IBPS',
  DEFENCE: 'Defence',
};

if (!GEMINI_API_KEY) {
  console.error('GEMINI_API_KEY not set in .env — aborting.');
  process.exit(1);
}

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

function normalize(s) {
  return (s || '').trim().toLowerCase();
}

// Strip the numeric CMS-ingestion list prefix ("17. AP High Court...")
// present on lc_exams.name/legacy exam_name in some rows, same pattern
// documented in status_report.md §27.1.
function stripPrefix(s) {
  return (s || '').replace(/^\d+\.\s*/, '').trim();
}

async function fetchAllRows(table, columns, filter) {
  let all = [];
  let from = 0;
  const pageSize = 1000;
  while (true) {
    let query = supabase.from(table).select(columns).range(from, from + pageSize - 1);
    if (filter) query = filter(query);
    const { data, error } = await query;
    if (error) throw error;
    all = all.concat(data);
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return all;
}

// Some titles have exact-duplicate rows in resources (status_report.md
// §26.3's "duplicate-orphan" finding — e.g. 5 identical "GS & GK GUIDE
// BOOK" rows under different resource_ids). Deduping candidates by
// resource_id alone lets every copy through as a distinct-looking option,
// and Gemini — which can only see the title, not that they're byte-for-
// byte duplicates — reasonably approves several of them, producing
// repeated identical rows in the final mapping. Dedupe by (category,
// normalized title) instead, so only one representative row per real
// document ever reaches the prompt.
function dedupeKey(r) {
  return `${r.category}::${normalize(r.title)}`;
}

// Tier priority when the same physical resource is found by more than one
// tier (e.g. a "dominant" title that also happens to exact-match the exam
// name) -- exact always wins so its short-circuit-eligibility is never
// accidentally lost to whichever tier's loop happened to run last.
const TIER_PRIORITY = { exact: 3, region: 2, career_track: 2, fuzzy_name: 1, dominant: 1 };

function setCandidate(candidates, row, tier) {
  const key = dedupeKey(row);
  const existing = candidates.get(key);
  if (existing && TIER_PRIORITY[existing.tier] >= TIER_PRIORITY[tier]) return;
  candidates.set(key, { ...row, tier });
}

function buildCandidates(exam, legacy, allResources, dominantResources) {
  const candidates = new Map(); // dedupeKey -> row (with .tier)

  for (const r of dominantResources) setCandidate(candidates, r, 'dominant');

  const regionName = exam.region?.level === 'state' || exam.region?.level === 'ut' ? exam.region.name : null;
  if (regionName) {
    const regionToken = normalize(regionName).replace(/[^a-z]/g, '');
    for (const r of allResources) {
      const title = (r.title || '').trim();
      if (REGION_GS_TITLE_PATTERN.test(title) && normalize(title).replace(/[^a-z]/g, '').includes(regionToken)) {
        setCandidate(candidates, r, 'region');
      }
    }
  }

  const careerTrack = legacy?.career_track;
  const keyword = careerTrack && CAREER_TRACK_KEYWORD[careerTrack];
  if (keyword) {
    const kw = normalize(keyword);
    for (const r of allResources) {
      if (normalize(r.exam_name).includes(kw)) setCandidate(candidates, r, 'career_track');
    }
  }

  // Exact tier last so it always wins the dedupe-key collision above.
  const examNameNorm = normalize(stripPrefix(exam.name));
  for (const r of allResources) {
    const rNameNorm = normalize(stripPrefix(r.exam_name));
    if (rNameNorm === examNameNorm) {
      setCandidate(candidates, r, 'exact');
    } else if (rNameNorm.includes(examNameNorm) || examNameNorm.includes(rNameNorm)) {
      // Substring match, not a true exact match -- fuzzy tier, low
      // priority so it never wrongly qualifies a category for the
      // exact-match short-circuit.
      setCandidate(candidates, r, 'fuzzy_name');
    }
  }

  return [...candidates.values()].slice(0, 40);
}

// A category short-circuits Gemini when every candidate it has is 'exact'
// tier -- there's nothing ambiguous left for Gemini to adjudicate. Mixed
// exact + fuzzy candidates still short-circuit (the exact ones answer
// "is this relevant" on their own; the fuzzy ones for that category are
// dropped as noise). A category with only fuzzy/dominant/region candidates,
// or no candidates at all, is left for Gemini (or stays empty).
function splitExactAndFuzzy(candidates) {
  const byCategory = new Map();
  for (const c of candidates) {
    if (!byCategory.has(c.category)) byCategory.set(c.category, []);
    byCategory.get(c.category).push(c);
  }

  const resolved = []; // { category, candidate } pairs written directly
  const forGemini = []; // candidates still needing Gemini's judgment

  for (const [category, group] of byCategory) {
    const exact = group.filter((c) => c.tier === 'exact');
    if (exact.length > 0) {
      for (const c of exact) resolved.push({ category, candidate: c });
    } else {
      forGemini.push(...group);
    }
  }

  return { resolved, forGemini };
}

function buildPrompt(exam, legacy, candidates) {
  const syllabusLines = legacy?.subject_requirements
    ? Object.entries(legacy.subject_requirements)
        .filter(([, v]) => String(v).toLowerCase() === 'yes')
        .map(([k]) => `- ${k}`)
        .join('\n')
    : '(no structured syllabus on file — infer from the exam name/career track)';

  const candidateLines = candidates
    .map((c, i) => `${i + 1}. resource_id=${c.resource_id} | category=${c.category} | title="${c.title}"`)
    .join('\n');

  return `You are helping map real study-guide documents to a government-exam catalog entry for VeerNXT, a career transition platform for ex-servicemen.

Exam: ${exam.name}
Conducting Body: ${exam.conducting_body?.name || 'Unknown'}
Region: ${exam.region?.name || 'Central'} (${exam.region?.level || 'central'})
Career Track: ${legacy?.career_track || 'Unknown'}

Required syllabus subjects (from the official eligibility data):
${syllabusLines}

Candidate documents already in our library (pick from this list ONLY — never invent a resource_id):
${candidateLines}

Task: for each category (Intro, Guide, Precis, PYQ), pick the candidate resource_id(s) that are a genuinely good fit for this exam's actual syllabus and career track. A category can have zero, one, or several good picks. If nothing in the candidate list is a good fit for a category, return an empty array for it — do NOT force a weak match just to fill the category. Prefer a state/UT-specific document over a generic one when the exam is a state/UT exam and a matching regional document exists in the candidates.

Respond with ONLY strict JSON in this exact shape, no markdown fences, no explanation outside the JSON:
{
  "Intro": [{ "resource_id": "...", "confidence": "high|medium|low", "reasoning": "under 12 words" }],
  "Guide": [...],
  "Precis": [...],
  "PYQ": [...]
}`;
}

async function callGemini(prompt) {
  const response = await fetch(GEMINI_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.1, maxOutputTokens: 8192, responseMimeType: 'application/json' },
    }),
  });
  if (!response.ok) {
    throw new Error(`Gemini API error ${response.status}: ${await response.text()}`);
  }
  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Gemini returned no content');
  const usage = data.usageMetadata || {};
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (err) {
    const finishReason = data?.candidates?.[0]?.finishReason;
    throw new Error(`${err.message} (finishReason=${finishReason}, text length=${text.length}, tail="${text.slice(-120)}")`);
  }
  return { parsed, promptTokens: usage.promptTokenCount || 0, outputTokens: usage.candidatesTokenCount || 0 };
}

// Runs `worker` over `items` with at most `limit` in flight at once.
// Plain index-based pool (no external dep) -- each of `limit` workers pulls
// the next index off a shared cursor until the queue is drained, so a slow
// or erroring item never blocks the others already in flight.
async function runWithConcurrency(items, limit, worker) {
  let cursor = 0;
  const results = new Array(items.length);
  async function runOne() {
    while (true) {
      const i = cursor++;
      if (i >= items.length) return;
      results[i] = await worker(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, runOne));
  return results;
}

function exactRowsFor(exam, resolved) {
  return resolved.map(({ category, candidate }) => ({
    exam_id: exam.id,
    resource_id: candidate.resource_id,
    category,
    confidence: 'high',
    reasoning: 'exact exam-name match',
    source: 'exact_name',
  }));
}

async function processExam(exam, legacy, allResources, dominantResources, index, total) {
  const candidates = buildCandidates(exam, legacy, allResources, dominantResources);

  if (candidates.length === 0) {
    console.log(`[skip] "${exam.name}" — no candidate resources found at all.`);
    return { exam, rowsToWrite: [], usedGemini: false, noneFound: true };
  }

  const { resolved, forGemini } = splitExactAndFuzzy(candidates);
  const exactRows = exactRowsFor(exam, resolved);

  if (forGemini.length === 0) {
    console.log(`[${index + 1}/${total}] "${exam.name}" — ${exactRows.length} picks, all exact-match (no Gemini call needed)`);
    if (VERBOSE) for (const row of exactRows) console.log(`    [${row.category}/exact] resource_id=${row.resource_id}`);
    return { exam, rowsToWrite: exactRows, usedGemini: false };
  }

  const prompt = buildPrompt(exam, legacy, forGemini);
  let result;
  try {
    result = await callGemini(prompt);
  } catch (err) {
    console.error(`[error] "${exam.name}": ${err.message}`);
    return { exam, rowsToWrite: exactRows, usedGemini: true, error: err.message };
  }

  const candidateIds = new Set(forGemini.map((c) => c.resource_id));
  const geminiRows = [];
  for (const category of CATEGORIES) {
    const picks = Array.isArray(result.parsed[category]) ? result.parsed[category] : [];
    for (const pick of picks) {
      if (!candidateIds.has(pick.resource_id)) {
        console.warn(`  [warn] Gemini picked resource_id "${pick.resource_id}" not in candidate list — skipping.`);
        continue;
      }
      geminiRows.push({
        exam_id: exam.id,
        resource_id: pick.resource_id,
        category,
        confidence: ['high', 'medium', 'low'].includes(pick.confidence) ? pick.confidence : 'low',
        reasoning: pick.reasoning || null,
        source: 'gemini',
      });
    }
  }

  const rowsToWrite = [...exactRows, ...geminiRows];
  console.log(`[${index + 1}/${total}] "${exam.name}" — ${rowsToWrite.length} picks (${exactRows.length} exact + ${geminiRows.length} gemini) from ${candidates.length} candidates (prompt=${result.promptTokens}t, output=${result.outputTokens}t)`);
  if (VERBOSE) {
    for (const row of rowsToWrite) {
      const title = candidates.find((c) => c.resource_id === row.resource_id)?.title;
      console.log(`    [${row.category}/${row.confidence}] "${title}" — ${row.reasoning}`);
    }
  }

  // Rate-limit safety per worker slot (concurrency limit already bounds
  // how many of these run at once).
  await new Promise((r) => setTimeout(r, 300));

  return { exam, rowsToWrite, usedGemini: true, promptTokens: result.promptTokens, outputTokens: result.outputTokens };
}

async function main() {
  console.log(`Mode: ${EXECUTE ? 'EXECUTE (writing to lc_exam_resource_map)' : 'DRY RUN (no writes)'}, sample=${SAMPLE === Infinity ? 'all' : SAMPLE}, all=${ALL}, concurrency=${CONCURRENCY}`);

  const [lcExams, legacyExams, allResources, existingMappedExamIds] = await Promise.all([
    fetchAllRows('lc_exams', 'id,name,category,conducting_body:lc_conducting_bodies(id,name),region:lc_regions(id,name,level)'),
    fetchAllRows('exams', 'exam_name,career_track,subject_requirements'),
    fetchAllRows('resources', 'resource_id,title,category,exam_name'),
    ALL ? Promise.resolve([]) : fetchAllRows('lc_exam_resource_map', 'exam_id'),
  ]);

  const legacyByName = new Map(legacyExams.map((e) => [normalize(e.exam_name), e]));
  const dominantResources = allResources.filter((r) => Object.prototype.hasOwnProperty.call(CORE_TITLE_TO_SUBJECT, (r.title || '').trim()));
  const alreadyMapped = new Set(existingMappedExamIds.map((r) => r.exam_id));

  const toProcess = lcExams.filter((e) => ALL || !alreadyMapped.has(e.id)).slice(0, SAMPLE);
  console.log(`${lcExams.length} total exams, ${alreadyMapped.size} already mapped, processing ${toProcess.length} this run.\n`);

  const results = await runWithConcurrency(toProcess, CONCURRENCY, (exam, i) => {
    const legacy = legacyByName.get(normalize(exam.name));
    return processExam(exam, legacy, allResources, dominantResources, i, toProcess.length);
  });

  let totalPromptTokens = 0;
  let totalOutputTokens = 0;
  let geminiCount = 0;
  let exactOnlyCount = 0;
  let noneFoundCount = 0;
  let errorCount = 0;

  for (const r of results) {
    if (r.noneFound) { noneFoundCount++; continue; }
    if (r.error) errorCount++;
    if (r.usedGemini) {
      geminiCount++;
      totalPromptTokens += r.promptTokens || 0;
      totalOutputTokens += r.outputTokens || 0;
    } else {
      exactOnlyCount++;
    }

    if (EXECUTE && r.rowsToWrite.length > 0) {
      const { error } = await supabase.from('lc_exam_resource_map').upsert(r.rowsToWrite, { onConflict: 'exam_id,resource_id' });
      if (error) console.error(`  [db error] "${r.exam.name}": ${error.message}`);
    }
  }

  console.log('\n--- Summary ---');
  console.log(`Exams processed: ${results.length} (exact-match only, no Gemini: ${exactOnlyCount}; used Gemini: ${geminiCount}; no candidates: ${noneFoundCount}; errors: ${errorCount})`);
  console.log(`Total tokens — prompt: ${totalPromptTokens}, output: ${totalOutputTokens}`);
  const inputCost = (totalPromptTokens / 1_000_000) * 0.75;
  const outputCost = (totalOutputTokens / 1_000_000) * 3.75;
  console.log(`Estimated cost this run: $${(inputCost + outputCost).toFixed(4)} (at Gemini_Cost_Estimation.md's $0.75/1M in, $3.75/1M out)`);
  if (geminiCount > 0) {
    const perExam = (inputCost + outputCost) / geminiCount;
    const remaining = lcExams.length - alreadyMapped.size - results.length;
    console.log(`Per-Gemini-exam average: $${perExam.toFixed(5)}. Extrapolated for the remaining ~${Math.max(remaining, 0)} unmapped exams (assuming a similar exact-match rate): $${(perExam * Math.max(remaining, 0) * (geminiCount / results.length)).toFixed(2)}`);
  }
  if (!EXECUTE) console.log('\nDry run — no rows written. Re-run with --execute to write.');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
