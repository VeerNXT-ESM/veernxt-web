#!/usr/bin/env node
/**
 * scripts/map_exam_quizzes_gemini.mjs
 *
 * Writes lc_exam_quiz_map (sql/lc_exam_quiz_map.sql), replacing
 * QuizCenter.jsx's runtime subject-overlap filter — which matches any quiz
 * tagged with a subject the exam's syllabus requires, and barely
 * discriminates since 401 of the catalog's 451 mock tests share the exact
 * same generic "General Studies" subject tag — with a reasoned,
 * exam-specific mapping for exams that have one.
 *
 * This is NOT structured like scripts/map_exam_resources_gemini.mjs
 * (iterate every lc_exams row, search for matching content). A live check
 * of the `quizzes` table found only ~10 distinct `exam_name` values across
 * the whole catalog — the mock-test library only actually covers a
 * handful of real exams (RRB ALP, RPF Constable, Stenographer, etc.), each
 * as a self-contained set of papers. Iterating 1500+ lc_exams rows
 * searching for a home for content that only exists for 10 of them would
 * mean ~1500 Gemini calls to solve a 10-bucket problem, and would still
 * hand Gemini an arbitrary slice of ~400 near-identically-tagged
 * candidates for the common case (a generic-subject exam with no
 * dedicated quiz set) since "subject overlap" isn't a real discriminator
 * here.
 *
 * So this script iterates the small number of quiz exam_name buckets
 * instead: for each one, shortlist the lc_exams rows whose name plausibly
 * refers to the same real-world exam, ask Gemini to confirm which ones
 * genuinely are (a bucket can legitimately match several exams — e.g. one
 * generic "Stenographer" quiz set is valid prep for every state/High
 * Court Stenographer posting, which the catalog lists as ~50 separate
 * lc_exams rows), and map every quiz in the bucket to every confirmed
 * exam_id. Exams with no matching bucket get no mapping row at all —
 * correctly signalling "no dedicated mock test yet" — and QuizCenter.jsx
 * falls back to its subject-overlap chain for those, honestly labelled.
 *
 * Modes:
 *   --sample=N   Process only the first N buckets (there are ~10 total),
 *                no writes unless --execute is also passed.
 *   --execute    Actually write lc_exam_quiz_map rows.
 *   --all        Reprocess buckets that already have mapping rows (skipped
 *                by default).
 *
 * Usage:
 *   node scripts/map_exam_quizzes_gemini.mjs --sample=2
 *   node scripts/map_exam_quizzes_gemini.mjs --execute
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const args = process.argv.slice(2);
const EXECUTE = args.includes('--execute');
const ALL = args.includes('--all');
const VERBOSE = args.includes('--verbose');
const sampleArg = args.find((a) => a.startsWith('--sample='));
const SAMPLE = sampleArg ? parseInt(sampleArg.split('=')[1], 10) : (EXECUTE ? Infinity : 20);

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${GEMINI_API_KEY}`;

const STOPWORDS = new Set(['the', 'of', 'and', 'for', 'phase', 'etc', 'grade', 'a', 'b', 'c', 'd', 'i', 'ii', 'iii']);

if (!GEMINI_API_KEY) {
  console.error('GEMINI_API_KEY not set in .env — aborting.');
  process.exit(1);
}

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

function normalize(s) {
  return (s || '').trim().toLowerCase();
}

// Strip the numeric CMS-ingestion list prefix ("17. AP High Court...")
// present on lc_exams.name in some rows, same pattern
// scripts/map_exam_resources_gemini.mjs handles.
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

// Bidirectional substring match on the normalized, prefix-stripped name —
// guards against blank/near-empty lc_exams.name rows (at least one exists
// live), which would otherwise match every bucket trivially since ''
// is a substring of everything.
function buildCandidates(bucketName, allExams) {
  const bucketNorm = normalize(stripPrefix(bucketName));
  let matches = allExams.filter((e) => {
    const examNorm = normalize(stripPrefix(e.name));
    if (!examNorm) return false;
    return examNorm === bucketNorm || examNorm.includes(bucketNorm) || bucketNorm.includes(examNorm);
  });

  if (matches.length === 0) {
    // Fallback: any significant word from the bucket name appearing in an
    // exam name — for a bucket whose real-world exam is phrased
    // differently in lc_exams than in the quiz catalog.
    const words = bucketNorm.split(/\s+/).filter((w) => w.length >= 3 && !STOPWORDS.has(w));
    matches = allExams.filter((e) => {
      const examNorm = normalize(stripPrefix(e.name));
      return examNorm && words.some((w) => examNorm.includes(w));
    });
  }

  return matches.slice(0, 60);
}

function buildPrompt(bucketName, sampleTitles, candidates) {
  const candidateLines = candidates.map((c, i) => `${i + 1}. exam_id=${c.id} | name="${c.name}"`).join('\n');

  return `You are helping map a set of real mock-test quizzes to the government-exam catalog entries they were written for, for VeerNXT, a career transition platform for ex-servicemen.

This mock-test set is titled/tagged for the exam: "${bucketName}"
Sample quiz titles from this set: ${sampleTitles.join(', ')}

Candidate exam catalog entries (pick from this list ONLY — never invent an exam_id):
${candidateLines}

Task: return every candidate exam_id that genuinely refers to the SAME real-world exam or recruitment role as "${bucketName}" (accounting for naming variants, abbreviations, and regional/board-specific phrasing) — not just a superficially similar name. It is normal and expected for a generic-role exam (e.g. a Stenographer or Constable mock-test set) to genuinely match MANY candidate rows, since many states/boards each recruit for the same role under their own exam listing — include all of them if they're real matches. If nothing in the candidate list is a genuine match, return an empty array.

Respond with ONLY strict JSON in this exact shape, no markdown fences, no explanation outside the JSON:
{
  "picks": [{ "exam_id": "...", "confidence": "high|medium|low", "reasoning": "under 12 words" }]
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

async function main() {
  console.log(`Mode: ${EXECUTE ? 'EXECUTE (writing to lc_exam_quiz_map)' : 'DRY RUN (no writes)'}, sample=${SAMPLE === Infinity ? 'all' : SAMPLE}, all=${ALL}`);

  const [allExams, allQuizzes, existingMappedQuizIds] = await Promise.all([
    fetchAllRows('lc_exams', 'id,name'),
    fetchAllRows('quizzes', 'id,title,exam_name', (q) => q.eq('category', 'Mock Test')),
    ALL ? Promise.resolve([]) : fetchAllRows('lc_exam_quiz_map', 'quiz_id'),
  ]);

  const alreadyMappedQuizIds = new Set(existingMappedQuizIds.map((r) => r.quiz_id));

  const bucketsByName = new Map();
  for (const q of allQuizzes) {
    const name = q.exam_name || '(untitled)';
    if (!bucketsByName.has(name)) bucketsByName.set(name, []);
    bucketsByName.get(name).push(q);
  }
  const allBuckets = [...bucketsByName.entries()];
  const toProcess = allBuckets.filter(([, quizzes]) => ALL || !quizzes.every((q) => alreadyMappedQuizIds.has(q.id))).slice(0, SAMPLE);

  console.log(`${allExams.length} exams in catalog, ${allBuckets.length} distinct quiz exam_name buckets (${allQuizzes.length} mock tests total), processing ${toProcess.length} this run.\n`);

  let totalPromptTokens = 0;
  let totalOutputTokens = 0;
  let processed = 0;

  for (const [bucketName, bucketQuizzes] of toProcess) {
    const candidates = buildCandidates(bucketName, allExams);

    if (candidates.length === 0) {
      console.log(`[skip] "${bucketName}" (${bucketQuizzes.length} quizzes) — no candidate exams found at all.`);
      continue;
    }

    const sampleTitles = bucketQuizzes.slice(0, 3).map((q) => q.title);
    const prompt = buildPrompt(bucketName, sampleTitles, candidates);
    let result;
    try {
      result = await callGemini(prompt);
    } catch (err) {
      console.error(`[error] "${bucketName}": ${err.message}`);
      continue;
    }

    totalPromptTokens += result.promptTokens;
    totalOutputTokens += result.outputTokens;
    processed++;

    const candidateIds = new Set(candidates.map((c) => c.id));
    const picks = Array.isArray(result.parsed.picks) ? result.parsed.picks : [];
    const matchedExamIds = [];
    for (const pick of picks) {
      if (!candidateIds.has(pick.exam_id)) {
        console.warn(`  [warn] Gemini picked exam_id "${pick.exam_id}" not in candidate list — skipping.`);
        continue;
      }
      matchedExamIds.push(pick);
    }

    const rowsToWrite = [];
    for (const pick of matchedExamIds) {
      for (const quiz of bucketQuizzes) {
        rowsToWrite.push({
          exam_id: pick.exam_id,
          quiz_id: quiz.id,
          confidence: ['high', 'medium', 'low'].includes(pick.confidence) ? pick.confidence : 'low',
          reasoning: pick.reasoning || null,
          source: 'gemini',
        });
      }
    }

    console.log(`[${processed}/${toProcess.length}] "${bucketName}" (${bucketQuizzes.length} quizzes, ${candidates.length} candidate exams) — matched ${matchedExamIds.length} exam(s) -> ${rowsToWrite.length} map rows (prompt=${result.promptTokens}t, output=${result.outputTokens}t)`);
    if (VERBOSE) {
      for (const pick of matchedExamIds) {
        const name = candidates.find((c) => c.id === pick.exam_id)?.name;
        console.log(`    [${pick.confidence}] "${name}" — ${pick.reasoning}`);
      }
    }

    if (EXECUTE && rowsToWrite.length > 0) {
      const { error } = await supabase.from('lc_exam_quiz_map').upsert(rowsToWrite, { onConflict: 'exam_id,quiz_id' });
      if (error) console.error(`  [db error] ${error.message}`);
    }

    await new Promise((r) => setTimeout(r, 300));
  }

  console.log('\n--- Summary ---');
  console.log(`Buckets processed: ${processed} of ${toProcess.length} attempted (${allBuckets.length} total)`);
  console.log(`Total tokens — prompt: ${totalPromptTokens}, output: ${totalOutputTokens}`);
  const inputCost = (totalPromptTokens / 1_000_000) * 0.75;
  const outputCost = (totalOutputTokens / 1_000_000) * 3.75;
  console.log(`Estimated cost this run: $${(inputCost + outputCost).toFixed(4)} (at Gemini_Cost_Estimation.md's $0.75/1M in, $3.75/1M out)`);
  if (!EXECUTE) console.log('\nDry run — no rows written. Re-run with --execute to write.');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
