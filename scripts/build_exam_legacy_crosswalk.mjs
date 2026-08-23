#!/usr/bin/env node
/**
 * scripts/build_exam_legacy_crosswalk.mjs
 *
 * Populates lc_exam_legacy_map by matching lc_exams (canonical, 1,534 rows,
 * names carry a leading "N. " ordinal prefix from CMS ingestion) against
 * the legacy `exams` table (1,629 rows, recommendation engine, no prefix).
 *
 * Strategy: normalize both sides (strip lc_exams' leading ordinal, lowercase,
 * collapse whitespace/punctuation), then:
 *   1. exact match on normalized name -> 'normalized_exact'
 *   2. for the remainder, containment match (one normalized name is a
 *      substring of the other) -> 'fuzzy', confidence = length ratio
 * Unmatched rows on either side are left unmapped -- correctness over
 * coverage. Everything below the fuzzy threshold is reported, not written.
 *
 * Usage:
 *   node scripts/build_exam_legacy_crosswalk.mjs            # dry run
 *   node scripts/build_exam_legacy_crosswalk.mjs --execute  # writes
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
const FUZZY_MIN_LEN_RATIO = 0.6; // shorter/longer length ratio floor for a containment match to count

function normalize(name) {
  return name
    .replace(/^\s*\d+\.\s*/, '') // strip leading "N. " ordinal (lc_exams only)
    .toLowerCase()
    .replace(/[()&,'".]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeLoose(s) {
  return (s || '').toLowerCase().replace(/[()&,'".]/g, '').replace(/\s+/g, ' ').trim();
}

// Disambiguate a group of legacy exams sharing the same normalized name
// against one lc_exam, using conducting body first (same source lineage,
// usually byte-identical), then region/state as a fallback signal.
function disambiguate(lc, candidates) {
  const lcCb = normalizeLoose(lc.conducting_body?.name);
  const cbMatches = candidates.filter((c) => normalizeLoose(c.conducting_body) === lcCb && lcCb);
  if (cbMatches.length === 1) return { exam: cbMatches[0], method: 'normalized_exact_cb' };

  const pool = cbMatches.length > 1 ? cbMatches : candidates;
  const lcIsCentral = lc.region?.level === 'central';
  const lcRegionName = normalizeLoose(lc.region?.name);
  const regionMatches = pool.filter((c) => {
    const hasState = !!(c.state_ut && c.state_ut.trim());
    if (lcIsCentral) return !hasState;
    return hasState && normalizeLoose(c.state_ut) === lcRegionName;
  });
  if (regionMatches.length === 1) return { exam: regionMatches[0], method: 'normalized_exact_region' };

  return null;
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

  const [lcExams, legacyExams, existingMap] = await Promise.all([
    fetchAll(supabase, 'lc_exams', 'id,name,conducting_body:lc_conducting_bodies(name),region:lc_regions(level,name)'),
    fetchAll(supabase, 'exams', 'exam_id,exam_name,conducting_body,state_ut'),
    fetchAll(supabase, 'lc_exam_legacy_map', 'lc_exam_id,legacy_exam_id'),
  ]);

  console.log(`lc_exams: ${lcExams.length}, legacy exams: ${legacyExams.length}, existing map rows: ${existingMap.length}`);

  const alreadyMapped = new Set(existingMap.map((m) => `${m.lc_exam_id}::${m.legacy_exam_id}`));

  // Build normalized-name index for legacy exams (may collide -- keep all).
  const legacyByNorm = new Map();
  for (const e of legacyExams) {
    const n = normalize(e.exam_name);
    if (!legacyByNorm.has(n)) legacyByNorm.set(n, []);
    legacyByNorm.get(n).push(e);
  }

  const toInsert = [];
  const unmatched = [];
  const ambiguous = [];

  for (const lc of lcExams) {
    const n = normalize(lc.name);
    const exactMatches = legacyByNorm.get(n) || [];

    if (exactMatches.length === 1) {
      toInsert.push({ lc_exam_id: lc.id, legacy_exam_id: exactMatches[0].exam_id, match_method: 'normalized_exact', match_confidence: 1.0, lcName: lc.name, legacyName: exactMatches[0].exam_name });
      continue;
    }
    if (exactMatches.length > 1) {
      const resolved = disambiguate(lc, exactMatches);
      if (resolved) {
        toInsert.push({ lc_exam_id: lc.id, legacy_exam_id: resolved.exam.exam_id, match_method: resolved.method, match_confidence: 1.0, lcName: lc.name, legacyName: resolved.exam.exam_name });
      } else {
        ambiguous.push({ lc: lc.name, candidates: exactMatches.map((e) => `${e.exam_name} [${e.conducting_body}${e.state_ut ? ', ' + e.state_ut : ''}]`) });
      }
      continue;
    }

    // Fuzzy: containment match with a length-ratio floor to avoid
    // "SI" matching "SBI" style false positives.
    let best = null;
    for (const e of legacyExams) {
      const ln = normalize(e.exam_name);
      if (ln === n) continue; // already handled above
      const shorter = n.length <= ln.length ? n : ln;
      const longer = n.length <= ln.length ? ln : n;
      if (longer.includes(shorter)) {
        const ratio = shorter.length / longer.length;
        if (ratio >= FUZZY_MIN_LEN_RATIO && (!best || ratio > best.ratio)) {
          best = { exam: e, ratio };
        }
      }
    }
    if (best) {
      toInsert.push({ lc_exam_id: lc.id, legacy_exam_id: best.exam.exam_id, match_method: 'fuzzy', match_confidence: best.ratio, lcName: lc.name, legacyName: best.exam.exam_name });
    } else {
      unmatched.push(lc.name);
    }
  }

  const newRows = toInsert.filter((r) => !alreadyMapped.has(`${r.lc_exam_id}::${r.legacy_exam_id}`));

  console.log(`\nMatched: ${toInsert.length} (${toInsert.filter((r) => r.match_method === 'normalized_exact').length} exact, ${toInsert.filter((r) => r.match_method === 'fuzzy').length} fuzzy)`);
  console.log(`Already in map: ${toInsert.length - newRows.length}`);
  console.log(`New rows to write: ${newRows.length}`);
  console.log(`Ambiguous (multiple legacy exams share the same normalized name): ${ambiguous.length}`);
  console.log(`Unmatched lc_exams: ${unmatched.length}`);

  console.log('\n--- Sample fuzzy matches (review before trusting) ---');
  for (const r of newRows.filter((r) => r.match_method === 'fuzzy').slice(0, 20)) {
    console.log(`  [${r.match_confidence.toFixed(2)}] "${r.lcName}"  <->  "${r.legacyName}"`);
  }

  console.log('\n--- Sample ambiguous (skipped, not written) ---');
  for (const a of ambiguous.slice(0, 10)) {
    console.log(`  "${a.lc}" matches multiple: ${a.candidates.join(' | ')}`);
  }

  console.log('\n--- Sample unmatched lc_exams (left unmapped) ---');
  for (const u of unmatched.slice(0, 20)) console.log(`  ${u}`);

  if (!EXECUTE) {
    console.log('\nDry run only -- no writes made. Re-run with --execute to apply.');
    return;
  }

  console.log('\nWriting...');
  const CHUNK = 500;
  let written = 0;
  for (let i = 0; i < newRows.length; i += CHUNK) {
    const chunk = newRows.slice(i, i + CHUNK).map(({ lc_exam_id, legacy_exam_id, match_method, match_confidence }) => ({ lc_exam_id, legacy_exam_id, match_method, match_confidence }));
    const { error } = await supabase.from('lc_exam_legacy_map').insert(chunk);
    if (error) { console.error('FAILED chunk', i, error.message); continue; }
    written += chunk.length;
  }
  console.log(`Done. Wrote ${written}/${newRows.length} new crosswalk rows.`);
}

main().catch((err) => { console.error(err); process.exit(1); });
