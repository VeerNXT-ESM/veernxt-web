#!/usr/bin/env node
/**
 * scripts/link_orphaned_intros_to_exams.mjs
 *
 * 319 `resources` rows (category='Intro', all now format='blocks' after
 * reformat_legacy_intros.mjs) exist in the DB but no exam currently points
 * to them -- leftovers from the older ingestion pipeline, never linked.
 * Some are real, usable content for exams still missing an Introduction;
 * some (the VeerNXT_Mock_Test_* ones found earlier) are genuinely
 * mislabeled and should never be linked as an "Introduction" to anything.
 *
 * Reuses rankCandidates()/decideMatch() from link_intros_to_exams.mjs --
 * these resources don't have a local docx folder, but storage_base_url
 * reliably encodes the exact same folder path shape those functions
 * already expect (`.../structured_resources/<CENTRAL|STATE|UT EXAMS/.../
 * post/INTRO-folder>/<resource_id>/`).
 *
 * Some older-ingestion paths dropped the level prefix entirely -- not just
 * "CENTRAL EXAMS" (verified live: raw paths starting straight with
 * "02.BANKING/...", genuinely central), but also cases where the path
 * starts with a bare state/UT name ("5. Delhi/2. Administration/...")
 * that's actually STATE or UT level. Assuming "no prefix -> central" (the
 * first version of this script) was a real, confirmed bug: for a Delhi
 * Stenographer resource, that wrong assumption searched the central-level
 * exam pool and landed on completely wrong body "Food Corporation Of
 * India" purely by coincidental token overlap -- while the correct "Delhi
 * Subordinate Services Selection Board / Stenographer Grade II/III" (score
 * 0.68, a clean win) only turns up when the SAME resource is searched
 * under the correct 'ut' pool. Since the prefix is genuinely ambiguous
 * here, this tries central AND, if the first segment matches a real
 * state_ut value from the exams table, both state and ut pools too --
 * merging every hypothesis's candidates into one list before deciding,
 * rather than committing to a single guessed level up front.
 *
 * Usage:
 *   node scripts/link_orphaned_intros_to_exams.mjs                 (dry run)
 *   node scripts/link_orphaned_intros_to_exams.mjs --execute
 */
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { rankCandidates, decideMatch } from './link_intros_to_exams.mjs';

const ARGS = process.argv.slice(2);
const EXECUTE = ARGS.includes('--execute');
const LIMIT = (() => {
  const i = ARGS.indexOf('--limit');
  return i >= 0 ? parseInt(ARGS[i + 1], 10) : Infinity;
})();
const SHOW_ALL = process.argv.includes('--show-all') || process.env.SHOW_ALL;

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL;

async function fetchAll(table, select) {
  let all = [];
  let from = 0;
  while (true) {
    const { data, error } = await supabase.from(table).select(select).range(from, from + 999);
    if (error) throw error;
    all = all.concat(data || []);
    if (!data || data.length < 1000) break;
    from += 1000;
  }
  return all;
}

function normKey(s) {
  return (s || '').toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '');
}

// storage_base_url = `${R2_PUBLIC_URL}/structured_resources/<path>/<resource_id>/`
// -> one or more synthetic relPath hypotheses, each
// "<level-prefix>/path (minus resource_id folder)/RESOURCE.json" --
// multiple when the level prefix is genuinely ambiguous (see file
// docstring). knownStateNames: normalized set of every real state_ut
// value from the exams table, used to recognize "5. Delhi/..." as a
// plausible state/UT-level path worth trying alongside the central guess.
function deriveRelPathHypotheses(storageBaseUrl, resourceId, knownStateNames) {
  const prefix = `${R2_PUBLIC_URL}/structured_resources/`;
  if (!storageBaseUrl.startsWith(prefix)) return [];
  let rest = storageBaseUrl.slice(prefix.length);
  const resourceSuffix = `${resourceId}/`;
  if (rest.endsWith(resourceSuffix)) rest = rest.slice(0, -resourceSuffix.length);
  rest = rest.replace(/\/+$/, '');
  if (!rest) return [];
  // The "blocks/" scheme-marker prefix this session's own converter uses
  // (structured_resources/blocks/Intro/<id>/) carries no real folder path
  // at all and can't be matched this way.
  if (rest.startsWith('blocks/')) return [];

  const hasKnownPrefix = /^(CENTRAL EXAMS|STATE EXAMS|UT EXAMS)(\/|$)/.test(rest);
  if (hasKnownPrefix) return [`${rest}/RESOURCE.json`];

  const hypotheses = [`CENTRAL EXAMS/${rest}/RESOURCE.json`];
  const firstSegment = rest.split('/')[0] || '';
  const firstSegmentKey = normKey(firstSegment.replace(/^\d+[.\s]*/, ''));
  if (firstSegmentKey && knownStateNames.has(firstSegmentKey)) {
    hypotheses.push(`STATE EXAMS/${rest}/RESOURCE.json`);
    hypotheses.push(`UT EXAMS/${rest}/RESOURCE.json`);
  }
  return hypotheses;
}

async function main() {
  console.log(`Mode: ${EXECUTE ? 'EXECUTE (writing to Supabase)' : 'DRY RUN (matching only)'}\n`);

  console.log('Loading exams, lc_exam_intro, lc_exam_resource_map, resources...');
  const [exams, intros, mapRows, resources] = await Promise.all([
    fetchAll('exams', 'exam_id, exam_name, conducting_body, career_track, state_ut, metadata'),
    fetchAll('lc_exam_intro', 'exam_id, source, resource_id'),
    fetchAll('lc_exam_resource_map', 'exam_id, resource_id, category').then((rows) =>
      rows.filter((r) => (r.category || '').trim().toLowerCase() === 'intro')
    ),
    fetchAll('resources', 'resource_id, title, exam_name, category, format, storage_base_url'),
  ]);

  const resourceIds = new Set(resources.map((r) => r.resource_id));
  const introByExamId = new Map(intros.map((i) => [i.exam_id, i]));
  const linkedResourceIds = new Set();
  for (const i of intros) if (i.source === 'auto' && i.resource_id) linkedResourceIds.add(i.resource_id);
  for (const m of mapRows) linkedResourceIds.add(m.resource_id);
  const fallbackExamIds = new Set(mapRows.filter((r) => resourceIds.has(r.resource_id)).map((r) => r.exam_id));

  function examAlreadyHasIntro(examId) {
    const intro = introByExamId.get(examId);
    if (intro?.source === 'manual') return true;
    if (intro?.source === 'auto' && intro.resource_id && resourceIds.has(intro.resource_id)) return true;
    if (fallbackExamIds.has(examId)) return true;
    return false;
  }

  const knownStateNames = new Set(exams.map((e) => normKey(e.state_ut)).filter(Boolean));

  let orphaned = resources.filter(
    (r) => (r.category || '').trim().toLowerCase() === 'intro' && !linkedResourceIds.has(r.resource_id)
  );
  if (orphaned.length > LIMIT) orphaned = orphaned.slice(0, LIMIT);
  console.log(`${orphaned.length} orphaned Intro resources to match.\n`);

  const results = { matched: [], alreadyHasIntro: [], ambiguous: [], weak: [], noMatch: [], noCandidatesInScope: [], noPath: [] };

  for (const resource of orphaned) {
    const hypotheses = deriveRelPathHypotheses(resource.storage_base_url, resource.resource_id, knownStateNames);
    if (hypotheses.length === 0) {
      results.noPath.push(resource);
      continue;
    }
    const local = { title: resource.exam_name || resource.title, relPath: hypotheses[0] };

    // Merge every hypothesis's candidate pool (dedup by exam_id, keep the
    // best score seen for that exam across hypotheses) before deciding --
    // rather than committing to one guessed level up front and potentially
    // never seeing the exam actually pointed to under a different level.
    const byExamId = new Map();
    let lastLevel = null, lastState = null;
    for (const relPath of hypotheses) {
      const { level, state, scored } = rankCandidates({ ...local, relPath }, exams);
      lastLevel = level; lastState = state;
      for (const s of scored) {
        const prior = byExamId.get(s.exam.exam_id);
        if (!prior || s.score > prior.score) byExamId.set(s.exam.exam_id, s);
      }
    }
    const merged = [...byExamId.values()].sort((a, b) => b.score - a.score || b.intersection - a.intersection);
    const m = decideMatch(merged, local, lastLevel, lastState);

    if (m.status === 'matched') {
      if (examAlreadyHasIntro(m.exam.exam_id)) {
        results.alreadyHasIntro.push({ resource, exam: m.exam });
      } else {
        results.matched.push({ resource, exam: m.exam, score: m.score, margin: m.margin });
      }
    } else if (m.status === 'ambiguous') {
      const stillMissing = m.tied.some((e) => !examAlreadyHasIntro(e.exam_id));
      results.ambiguous.push({ resource, candidates: m.tied.map((e) => `${e.conducting_body} / ${e.exam_name}`), stillMissing });
    } else if (m.status === 'weak') {
      const stillMissing = !examAlreadyHasIntro(m.best.exam_id);
      results.weak.push({ resource, best: `${m.best.conducting_body} / ${m.best.exam_name}`, bestScore: m.bestScore, secondScore: m.secondScore, stillMissing });
    } else if (m.status === 'no-candidates-in-scope') {
      results.noCandidatesInScope.push({ resource, level: m.level, state: m.state });
    } else {
      results.noMatch.push({ resource, level: m.level, state: m.state });
    }
  }

  console.log('--- Match summary ---');
  console.log(`Confident match, exam currently has NO intro -> will link: ${results.matched.length}`);
  console.log(`Confident match, but exam ALREADY has a working intro -> skipped: ${results.alreadyHasIntro.length}`);
  console.log(`Ambiguous (tied top candidates) -> skipped, needs a human: ${results.ambiguous.length}`);
  console.log(`Weak match -> skipped, needs a human: ${results.weak.length}`);
  console.log(`No candidate exams in scope -> skipped: ${results.noCandidatesInScope.length}`);
  console.log(`No match at all -> skipped: ${results.noMatch.length}`);
  console.log(`Couldn't derive a path from storage_base_url -> skipped: ${results.noPath.length}`);

  const stillMissingAmbiguous = results.ambiguous.filter((a) => a.stillMissing);
  const stillMissingWeak = results.weak.filter((w) => w.stillMissing);
  console.log(`\nOf the ambiguous/weak ones, actually relevant to a real gap (target exam still has no intro): ${stillMissingAmbiguous.length + stillMissingWeak.length} of ${results.ambiguous.length + results.weak.length}`);
  if (stillMissingAmbiguous.length || stillMissingWeak.length) {
    console.log(`\n--- Still-missing ambiguous (${stillMissingAmbiguous.length}) ---`);
    for (const a of stillMissingAmbiguous) console.log(`  "${a.resource.title}" (${a.resource.resource_id}) -> tied: [${a.candidates.join(' | ')}]`);
    console.log(`\n--- Still-missing weak (${stillMissingWeak.length}) ---`);
    for (const w of stillMissingWeak) console.log(`  "${w.resource.title}" (${w.resource.resource_id}) -> best "${w.best}" (score ${w.bestScore.toFixed(2)} vs ${w.secondScore.toFixed(2)})`);
  }

  const n = SHOW_ALL ? Infinity : 15;
  console.log(`\nMatched (will link):`);
  for (const m of results.matched.slice(0, n)) console.log(`  "${m.resource.title}" -> "${m.exam.conducting_body} / ${m.exam.exam_name}" (score ${m.score.toFixed(2)}, margin ${m.margin.toFixed(2)})`);
  if (results.ambiguous.length) {
    console.log(`\nAmbiguous (first ${Math.min(n, results.ambiguous.length)}):`);
    for (const a of results.ambiguous.slice(0, n)) console.log(`  "${a.resource.title}" -> tied: [${a.candidates.join(' | ')}]`);
  }
  if (results.weak.length) {
    console.log(`\nWeak (first ${Math.min(n, results.weak.length)}):`);
    for (const w of results.weak.slice(0, n)) console.log(`  "${w.resource.title}" -> best "${w.best}" (score ${w.bestScore.toFixed(2)} vs ${w.secondScore.toFixed(2)})`);
  }
  if (results.noPath.length) {
    console.log(`\nNo derivable path (first ${Math.min(n, results.noPath.length)}):`);
    for (const r of results.noPath.slice(0, n)) console.log(`  "${r.title}" -> ${r.storage_base_url}`);
  }

  if (!EXECUTE) {
    console.log('\nDry run only -- nothing written.');
    return;
  }

  console.log(`\nLinking ${results.matched.length} confident matches...`);
  let ok = 0, failed = 0;
  for (const { resource, exam } of results.matched) {
    try {
      const { error } = await supabase.from('lc_exam_intro').upsert(
        { exam_id: exam.exam_id, resource_id: resource.resource_id, manual_title: null, manual_body: null, source: 'auto', updated_at: new Date().toISOString() },
        { onConflict: 'exam_id' }
      );
      if (error) throw error;
      console.log(`[ok] "${resource.title}" -> "${exam.exam_name}" (${exam.exam_id})`);
      ok++;
    } catch (err) {
      failed++;
      console.error(`[FAIL] "${resource.title}" -> ${err.message}`);
    }
  }
  console.log(`\n--- Link summary ---`);
  console.log(`Linked: ${ok}  Failed: ${failed}`);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
