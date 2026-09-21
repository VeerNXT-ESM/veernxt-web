#!/usr/bin/env node
/**
 * scripts/link_intros_to_exams.mjs
 *
 * Takes the 761 converted Introductions sitting locally at
 * public/FINAL_INTROS_STRUCTURED/<slug>/ (see
 * scripts/convert_docx_intros_to_blocks.mjs) and, for each one:
 *   1. Matches it to a real exam_id in the `exams` table.
 *   2. Uploads its metadata.json + chapters/chapter-1.json to R2 (same
 *      layout scripts/content/migrate_resources_to_blocks.mjs uses for
 *      Guide/Precis: structured_resources/blocks/Intro/<resource_id>/).
 *   3. Inserts a `resources` row (category: 'Intro', format: 'blocks').
 *   4. Upserts `lc_exam_intro` (exam_id, resource_id, source: 'auto') --
 *      the same shape ExamIntroCard.jsx / useExamContent.js already read
 *      for the 647 pre-existing auto intros, so no frontend change needed.
 *
 * MATCHING is the risky part -- a wrong match silently shows a candidate
 * the WRONG exam's Introduction, which is worse than showing nothing. So:
 *
 *   - Never touches an exam that already has a working Introduction
 *     (lc_exam_intro.source is 'manual' or 'auto' with a resolvable
 *     resource_id, OR a lc_exam_resource_map category='Intro' fallback
 *     exists). Only fills the gap this whole investigation started from.
 *   - Filters candidate exams by `metadata.level` (central/state/ut) and,
 *     for state/ut, by `state_ut` first -- read straight off the source
 *     folder path (CENTRAL EXAMS / STATE EXAMS\<state> / UT EXAMS\<state>),
 *     not guessed from text. This alone eliminates the vast majority of
 *     false-match risk before any fuzzy scoring happens.
 *   - Within that filtered set, scores by word-token overlap between the
 *     source folder's own words and each candidate's `conducting_body` +
 *     `exam_name`. Only auto-links when there's a single best-scoring
 *     candidate with a real margin over the next-best -- anything tied or
 *     weak is left unmatched and reported, never guessed.
 *
 * Usage:
 *   node scripts/link_intros_to_exams.mjs                 (dry run, matching only, no writes anywhere)
 *   node scripts/link_intros_to_exams.mjs --execute        (uploads to R2 + writes resources/lc_exam_intro)
 *   node scripts/link_intros_to_exams.mjs --execute --limit 5
 */
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';
import { getS3Client, uploadToR2 } from './lib/ingest-drive-content.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ARGS = process.argv.slice(2);
const EXECUTE = ARGS.includes('--execute');
const LIMIT = (() => {
  const i = ARGS.indexOf('--limit');
  return i >= 0 ? parseInt(ARGS[i + 1], 10) : Infinity;
})();
const ONLY = (() => {
  const i = ARGS.indexOf('--only');
  return i >= 0 ? ARGS[i + 1] : null;
})();

// Matches convert_docx_intros_to_blocks.mjs's OUTPUT_ROOT -- not under
// public/, since this is local intermediate conversion output, not
// something meant to ship with the deployed app.
const LOCAL_ROOT = path.join(__dirname, '..', 'FINAL_INTROS_STRUCTURED');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

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

// Deliberately does NOT filter by word length -- exam titles in this
// corpus are acronym-heavy (PO, SO, JE, SI, DSP...) and those 2-letter
// role codes are exactly what distinguishes "IBPS PO" from "IBPS SO" from
// "IBPS RRB PO". A length>2 filter (the first version of this function)
// silently dropped all of them, so every IBPS/SBI/SSC role variant tied
// on just "ibps"/"rrb"/"ssc" -- found live via the dry run before any
// write happened.
// Deliberately keeps single-character tokens (digits AND letters) --
// found live on the second dry run: "KTET Category 1/2/3" and "NABARD
// Grade A/B" tie perfectly against each other when the lone
// distinguishing character (the digit, the letter) gets filtered out as
// "noise". A stray folder-ordinal digit ("02.", "1.") does slip through
// as a side effect, but it essentially never collides with a real
// exam_name token, so it's harmless -- unlike silently erasing the one
// character that actually tells two sibling exams apart.
const STOPWORDS = new Set(['the', 'and', 'for', 'of', 'in', 'exam', 'exams', 'recruitment', 'board', 'commission', 'department', 'staff', 'selection', 'service', 'services']);
function tokenize(s) {
  return new Set(
    (s || '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .split(' ')
      .filter((w) => w.length >= 1 && !STOPWORDS.has(w))
  );
}

// Pulls level + state straight from the folder path, same convention the
// converter's own relPath uses (CENTRAL EXAMS\... , STATE EXAMS\<state>\...,
// UT EXAMS\<state>\...). Far more reliable than guessing level/state from
// free text.
function deriveLevelAndState(relPath) {
  const segments = relPath.split(/[\\/]/);
  const top = segments[0];
  const build = (level, state, wordSegments) => ({
    level,
    state,
    wordSegments,
    postSegment: wordSegments[wordSegments.length - 1] || '',
    // The folder segment right before the post/exam-name segment is
    // almost always the conducting body, spelled out in full ("Rajasthan
    // Staff Selection Board") where the exams table often only stores its
    // acronym ("RSSB") -- see deriveAcronym below.
    bodySegment: wordSegments.length >= 2 ? wordSegments[wordSegments.length - 2] : '',
  });
  if (top === 'CENTRAL EXAMS') return build('central', null, segments.slice(1, -2));
  if (top === 'STATE EXAMS') return build('state', segments[1].replace(/^\d+[.\s]*/, '').trim(), segments.slice(2, -2));
  if (top === 'UT EXAMS') return build('ut', segments[1].replace(/^\d+[.\s]*/, '').trim(), segments.slice(2, -2));
  return build(null, null, segments.slice(0, -2));
}

// Derives what a spelled-out body name's acronym would be ("Rajasthan
// Staff Selection Board" -> "RSSB") so it can be compared against the
// exams table's own (often acronym-only) conducting_body. Found live:
// "Staff Nurse"/"Community Health Officer" postings under half a dozen
// different state bodies all tied on generic-role text alone (every
// candidate's exam_name is literally "Staff Nurse"), and the only signal
// that actually distinguishes them -- the spelled-out body matching the
// DB's acronym -- was being thrown away entirely.
const ACRONYM_STOPWORDS = new Set(['of', 'and', 'the', 'for']);
function deriveAcronym(segment) {
  const stripped = (segment || '').replace(/^\d+[.\s]*/, '').trim();
  const words = stripped.split(/[\s,()&/-]+/).filter((w) => w && !ACRONYM_STOPWORDS.has(w.toLowerCase()));
  if (words.length < 2) return null;
  return words.map((w) => w[0]).join('').toUpperCase();
}

// Strips ALL separators (not just collapsing whitespace) so "Dadra and
// Nagar Haveli and Daman and Diu" (folder) matches the DB's "DADRA &
// NAGAR HAVELI AND DAMAN & DIU" (mixed "&"/"and"), and so the DB's own
// "Lakshadwee p" typo (a stray mid-word space) still matches "Lakshadweep"
// -- found live: all 99 UT-level folders under Dadra & Nagar Haveli/Daman
// & Diu, Lakshadweep, and Jammu & Kashmir had zero candidate exams purely
// because of this formatting mismatch, not because the exams table
// actually lacks rows for these UTs.
function normalizeStateName(s) {
  return (s || '').toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '');
}

// Curated exceptions: real Introductions confirmed correct against the
// exam matchExam() already picked as "best", for exams independently
// confirmed to still have NO intro (checked against the live
// exams_missing_intro export, not just "this match looks right" -- an
// earlier version of this list included matches that were individually
// correct but pointed at exams already covered from elsewhere, which
// would have done nothing for the actual gap).
const FORCE_ACCEPT_TITLES = new Set([]);

function jaccard(aTokens, bTokens) {
  const intersection = [...aTokens].filter((t) => bTokens.has(t)).length;
  const union = new Set([...aTokens, ...bTokens]).size;
  return union === 0 ? 0 : intersection / union;
}

// Shared scoring core -- returns the full ranked candidate list plus
// level/state, factored out so callers that want more than the top-2
// pass/fail decision (e.g. link_orphaned_intros_to_exams.mjs building an
// AI-review shortlist) can get a ranked top-N without duplicating the
// scoring logic.
export function rankCandidates(local, exams) {
  const { level, state, wordSegments, postSegment, bodySegment } = deriveLevelAndState(local.relPath);
  let pool = exams.filter((e) => (e.metadata?.level || null) === level);
  if (state) {
    const normState = normalizeStateName(state);
    pool = pool.filter((e) => normalizeStateName(e.state_ut) === normState);
  }
  if (pool.length === 0) return { level, state, scored: [] };

  const folderTokens = tokenize(wordSegments.join(' '));
  const postTokens = tokenize(postSegment);
  const folderAcronym = deriveAcronym(bodySegment);
  // Two-signal score: fullJaccard (category+body+post vs conducting_body+
  // exam_name) alone let siblings under the same body tie -- "IBPS PO" and
  // "IBPS RRB PO" both share {ibps, po} and only differ by one extra
  // unmatched word, not enough to separate them reliably. postJaccard
  // isolates just the exam-identifying folder segment (the one right
  // before the INTRO folder) against exam_name alone, which is exactly
  // the distinguishing signal category/body segments dilute. Weighted
  // toward postJaccard since it carries the real identity; fullJaccard
  // still contributes so conducting_body corroboration matters.
  const scored = pool.map((e) => {
    const examTokens = tokenize(`${e.conducting_body || ''} ${e.exam_name || ''}`);
    const examNameTokens = tokenize(e.exam_name || '');
    let fullScore = jaccard(folderTokens, examTokens);
    const postScore = jaccard(postTokens, examNameTokens);
    // Acronym bonus: "Rajasthan Staff Selection Board" derives to "RSSB",
    // which is exactly how the exams table names its own conducting_body
    // for that row -- Jaccard sees zero token overlap here (none of
    // "rajasthan"/"staff"/"selection"/"board" literally equals "rssb"),
    // so this was previously invisible to fullScore entirely. Boosts
    // fullScore (body corroboration), NOT the final combined score
    // directly -- every sibling exam under the same body shares the same
    // acronym, so overriding the combined score outright (an earlier,
    // broken version of this fix) made all of them tie at the floor;
    // postScore still has to do its job differentiating the specific
    // role. Requires >=3 letters to keep coincidental collisions rare.
    const conductingBodyAcronym = (e.conducting_body || '').replace(/[^A-Za-z]/g, '').toUpperCase();
    const acronymMatch = folderAcronym && folderAcronym.length >= 3 && conductingBodyAcronym === folderAcronym;
    if (acronymMatch) fullScore = Math.max(fullScore, 0.8);
    let score = 0.35 * fullScore + 0.65 * postScore;
    // Containment floor for terse exam identities (PSU-style rows like
    // "BEL / BEL Recruitment") -- Jaccard structurally punishes these:
    // the folder path spells out the full company name plus category
    // noise ("PUBLIC SECTOR UNDERTAKING NAVRATNA - BEL - BHARAT
    // ELECTRONICS LIMITED"), while exam_name is just 2-3 words, so even a
    // dead-on match tops out around 0.15-0.3 Jaccard and never clears the
    // absolute floor. When every single word of the exam's own identity
    // (conducting_body + exam_name) is found somewhere in the folder path
    // AND that identity is short enough that this isn't a coincidence,
    // trust it regardless of the diluted ratio.
    // Also require exam_name itself to contribute at least one real token
    // -- found live: a handful of `exams` rows have an EMPTY exam_name
    // (just conducting_body, e.g. "RRB" / ""), which trivially satisfies
    // "every exam token is in the folder" using conducting_body alone and
    // ties with the actually-correct "RRB / Staff Nurse" row.
    const fullyContained = examNameTokens.size > 0 && examTokens.size > 0 && examTokens.size <= 5 && [...examTokens].every((t) => folderTokens.has(t));
    if (fullyContained) score = Math.max(score, 0.6);
    const intersection = [...folderTokens].filter((t) => examTokens.has(t)).length;
    return { exam: e, score, intersection, fullScore, postScore };
  });
  scored.sort((a, b) => b.score - a.score || b.intersection - a.intersection);
  return { level, state, scored };
}

// Decision logic factored out from matchExam so a caller with its own
// merged candidate list (e.g. link_orphaned_intros_to_exams.mjs, which
// tries several level guesses when a legacy path has no explicit
// CENTRAL/STATE/UT EXAMS prefix and merges all their candidate pools
// before deciding) can reuse the exact same thresholds instead of
// duplicating them.
export function decideMatch(scored, local, level, state) {
  if (scored.length === 0) return { status: 'no-candidates-in-scope', level, state };

  const best = scored[0];
  const second = scored[1];
  if (best.intersection === 0) return { status: 'no-match', level, state };
  if (second && Math.abs(second.score - best.score) < 0.001) return { status: 'ambiguous', level, state, tied: scored.filter((s) => Math.abs(s.score - best.score) < 0.001).map((s) => s.exam) };
  // Relative margin, not absolute -- an absolute gap (e.g. >= 0.15) doesn't
  // scale with the post-weighted score range. Found live: "IBPS PO" vs.
  // "IBPS Clerk" scores 0.55 vs 0.425, an unambiguously correct match, but
  // only a 0.125 absolute gap -- just under a flat 0.15 cutoff, so it was
  // wrongly benched as "weak" alongside genuinely uncertain cases.
  const relativeMargin = second ? (best.score - second.score) / best.score : 1;
  if (best.score < 0.4 || relativeMargin < 0.12) {
    // Manual promotion for a curated set of "weak" results confirmed
    // correct by human eyeball, not a further threshold change -- the
    // score range these sit in isn't cleanly separable from real
    // mismatches (e.g. "SSC JE" wrongly matching "RRB JE" scores 0.52,
    // *between* two of these confirmed-correct ones at 0.44 and 0.61), so
    // lowering the bar further would let wrong matches back in. Each
    // entry here was individually checked against local.title before
    // being added.
    if (FORCE_ACCEPT_TITLES.has(local.title.trim())) {
      return { status: 'matched', level, state, exam: best.exam, score: best.score, margin: second ? best.score - second.score : best.score };
    }
    return { status: 'weak', level, state, best: best.exam, bestScore: best.score, secondScore: second ? second.score : 0 };
  }

  return { status: 'matched', level, state, exam: best.exam, score: best.score, margin: second ? best.score - second.score : best.score };
}

export function matchExam(local, exams) {
  const { level, state, scored } = rankCandidates(local, exams);
  return decideMatch(scored, local, level, state);
}

async function main() {
  console.log(`Mode: ${EXECUTE ? 'EXECUTE (writing to R2 + Supabase)' : 'DRY RUN (matching only)'}\n`);

  console.log('Loading exams, lc_exam_intro, lc_exam_resource_map, resources...');
  const [exams, intros, mapRows, resources] = await Promise.all([
    fetchAll('exams', 'exam_id, exam_name, conducting_body, career_track, state_ut, metadata'),
    fetchAll('lc_exam_intro', 'exam_id, source, resource_id'),
    fetchAll('lc_exam_resource_map', 'exam_id, resource_id, category').then((rows) => rows.filter((r) => (r.category || '').trim().toLowerCase() === 'intro')),
    fetchAll('resources', 'resource_id'),
  ]);
  const resourceIds = new Set(resources.map((r) => r.resource_id));
  const introByExamId = new Map(intros.map((i) => [i.exam_id, i]));
  const fallbackExamIds = new Set(mapRows.filter((r) => resourceIds.has(r.resource_id)).map((r) => r.exam_id));

  // Same "does this exam already have a real Introduction" test as
  // audit_exam_intros.mjs -- only the gap this whole thread started from
  // is eligible to be filled here.
  function examAlreadyHasIntro(examId) {
    const intro = introByExamId.get(examId);
    if (intro?.source === 'manual') return true;
    if (intro?.source === 'auto' && intro.resource_id && resourceIds.has(intro.resource_id)) return true;
    if (fallbackExamIds.has(examId)) return true;
    return false;
  }

  let localDirs = fs.readdirSync(LOCAL_ROOT);
  // Filter on the folder's own source_file (the original docx's relative
  // path), not the slug -- the slug is a normalized-plus-hash string that
  // doesn't reliably substring-match an arbitrary path fragment the way
  // convert_docx_intros_to_blocks.mjs's --only (which filters real paths
  // pre-conversion) does.
  if (ONLY) {
    localDirs = localDirs.filter((slug) => {
      const meta = JSON.parse(fs.readFileSync(path.join(LOCAL_ROOT, slug, 'metadata.json'), 'utf-8'));
      return meta.source_file.toLowerCase().includes(ONLY.toLowerCase());
    });
  }
  if (localDirs.length > LIMIT) localDirs = localDirs.slice(0, LIMIT);

  const results = { matched: [], alreadyHasIntro: [], ambiguous: [], weak: [], noMatch: [], noCandidatesInScope: [] };

  for (const slug of localDirs) {
    const metaPath = path.join(LOCAL_ROOT, slug, 'metadata.json');
    const meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
    const local = { slug, title: meta.title, relPath: meta.source_file };
    const m = matchExam(local, exams);

    if (m.status === 'matched') {
      if (examAlreadyHasIntro(m.exam.exam_id)) {
        results.alreadyHasIntro.push({ local, exam: m.exam });
      } else {
        results.matched.push({ local, exam: m.exam, score: m.score, margin: m.margin });
      }
    } else if (m.status === 'ambiguous') {
      // stillMissing: does AT LEAST ONE tied candidate actually have no
      // intro yet? If every tied candidate is already covered from
      // elsewhere, this ambiguity is moot for closing the real gap --
      // found live: a first pass at curating "obviously correct" matches
      // included several that were individually right but pointed at
      // exams already linked from an earlier round, so they wouldn't
      // have helped the actual missing-intro complaint at all.
      const stillMissing = m.tied.some((e) => !examAlreadyHasIntro(e.exam_id));
      results.ambiguous.push({ local, candidates: m.tied.map((e) => `${e.conducting_body} / ${e.exam_name}`), stillMissing });
    } else if (m.status === 'weak') {
      const stillMissing = !examAlreadyHasIntro(m.best.exam_id);
      results.weak.push({ local, best: `${m.best.conducting_body} / ${m.best.exam_name}`, bestScore: m.bestScore, secondScore: m.secondScore, stillMissing });
    } else if (m.status === 'no-candidates-in-scope') {
      results.noCandidatesInScope.push({ local, level: m.level, state: m.state });
    } else {
      results.noMatch.push({ local, level: m.level, state: m.state });
    }
  }

  console.log(`\n${localDirs.length} local Introductions processed.\n`);
  console.log('--- Match summary ---');
  console.log(`Confident match, exam currently has NO intro -> will link: ${results.matched.length}`);
  console.log(`Confident match, but exam ALREADY has a working intro -> skipped (not overwriting): ${results.alreadyHasIntro.length}`);
  console.log(`Ambiguous (tied top candidates) -> skipped, needs a human: ${results.ambiguous.length}`);
  console.log(`Weak match (low score / thin margin) -> skipped, needs a human: ${results.weak.length}`);
  console.log(`No candidate exams in scope (level/state has zero exams) -> skipped: ${results.noCandidatesInScope.length}`);
  console.log(`No match at all (zero token overlap) -> skipped: ${results.noMatch.length}`);

  const stillMissingAmbiguous = results.ambiguous.filter((a) => a.stillMissing);
  const stillMissingWeak = results.weak.filter((w) => w.stillMissing);
  console.log(`\nOf the ambiguous/weak ones above, actually relevant to closing a real gap (target exam still has no intro from ANY source): ${stillMissingAmbiguous.length + stillMissingWeak.length} of ${results.ambiguous.length + results.weak.length}`);
  if (process.env.SHOW_STILL_MISSING) {
    console.log(`\n--- Still-missing ambiguous (${stillMissingAmbiguous.length}) ---`);
    for (const a of stillMissingAmbiguous) console.log(`  "${a.local.title}" (${a.local.relPath}) -> tied: [${a.candidates.join(' | ')}]`);
    console.log(`\n--- Still-missing weak (${stillMissingWeak.length}) ---`);
    for (const w of stillMissingWeak) console.log(`  "${w.local.title}" -> best "${w.best}" (score ${w.bestScore.toFixed(2)} vs runner-up ${w.secondScore.toFixed(2)})`);
  }

  const ambiguousN = process.env.SHOW_ALL ? results.ambiguous.length : 10;
  if (results.ambiguous.length) {
    console.log(`\nAmbiguous samples (${ambiguousN === results.ambiguous.length ? 'all' : 'first ' + ambiguousN}):`);
    for (const a of results.ambiguous.slice(0, ambiguousN)) console.log(`  "${a.local.title}" (${a.local.relPath}) -> tied: [${a.candidates.join(' | ')}]`);
  }
  const weakN = process.env.SHOW_ALL ? results.weak.length : 10;
  if (results.weak.length) {
    console.log(`\nWeak-match samples (${weakN === results.weak.length ? 'all' : 'first ' + weakN}):`);
    for (const w of results.weak.slice(0, weakN)) console.log(`  "${w.local.title}" -> best "${w.best}" (score ${w.bestScore.toFixed(2)} vs runner-up ${w.secondScore.toFixed(2)})`);
  }
  if (results.noMatch.length) {
    console.log(`\nNo-match samples (first 10):`);
    for (const n of results.noMatch.slice(0, 10)) console.log(`  "${n.local.title}" (${n.local.relPath})`);
  }
  if (process.env.SHOW_SCOPE) {
    const byState = new Map();
    for (const n of results.noCandidatesInScope) {
      const key = `${n.level}::${n.state}`;
      byState.set(key, (byState.get(key) || 0) + 1);
    }
    console.log(`\nNo-candidates-in-scope breakdown by level/state (${results.noCandidatesInScope.length} total):`);
    for (const [key, count] of [...byState.entries()].sort((a, b) => b[1] - a[1])) console.log(`  ${key}: ${count}`);
  }

  if (process.env.SHOW_MATCHED) {
    console.log(`\nAll ${results.matched.length} confident matches (folder -> exam):`);
    for (const m of results.matched) console.log(`  "${m.local.title}"  ->  "${m.exam.conducting_body} / ${m.exam.exam_name}"  (score ${m.score.toFixed(2)}, margin ${m.margin.toFixed(2)})`);
  }

  if (!EXECUTE) {
    console.log('\nDry run only -- nothing written to R2 or Supabase.');
    return;
  }

  console.log(`\nLinking ${results.matched.length} confident matches...`);
  const s3 = getS3Client();
  const bucket = process.env.R2_BUCKET_NAME;
  const publicUrl = process.env.R2_PUBLIC_URL;

  let ok = 0, failed = 0;
  for (const { local, exam } of results.matched) {
    try {
      const dir = path.join(LOCAL_ROOT, local.slug);
      const metadata = JSON.parse(fs.readFileSync(path.join(dir, 'metadata.json'), 'utf-8'));
      const chapter = JSON.parse(fs.readFileSync(path.join(dir, 'chapters', 'chapter-1.json'), 'utf-8'));

      const resourceId = crypto.randomUUID();
      const prefix = `structured_resources/blocks/Intro/${resourceId}`;
      await uploadToR2(s3, bucket, `${prefix}/metadata.json`, Buffer.from(JSON.stringify(metadata, null, 2)), 'application/json');
      await uploadToR2(s3, bucket, `${prefix}/chapters/chapter-1.json`, Buffer.from(JSON.stringify(chapter, null, 2)), 'application/json');

      const storageBaseUrl = `${publicUrl}/${prefix}/`;
      const resourceRow = {
        resource_id: resourceId,
        file_hash: crypto.createHash('sha256').update(JSON.stringify(chapter)).digest('hex'),
        source_file: local.relPath,
        title: metadata.title,
        exam_name: exam.exam_name,
        subject: 'General',
        category: 'Intro',
        conducting_body: exam.conducting_body || '',
        website_url: '',
        chapter_count: 1,
        format: 'blocks',
        storage_base_url: storageBaseUrl,
        metadata_url: `${storageBaseUrl}metadata.json`,
        thumbnail_url: null,
        is_freemium: true,
        is_locked: false,
        status: 'Published',
        updated_at: new Date().toISOString(),
      };
      const { error: resErr } = await supabase.from('resources').insert(resourceRow);
      if (resErr) throw resErr;

      const introRow = {
        exam_id: exam.exam_id,
        resource_id: resourceId,
        manual_title: null,
        manual_body: null,
        source: 'auto',
        updated_at: new Date().toISOString(),
      };
      const { error: introErr } = await supabase.from('lc_exam_intro').upsert(introRow, { onConflict: 'exam_id' });
      if (introErr) throw introErr;

      console.log(`[ok] "${local.title}" -> exam "${exam.exam_name}" (${exam.exam_id}), resource ${resourceId}`);
      ok++;
    } catch (err) {
      failed++;
      console.error(`[FAIL] "${local.title}" -> ${err.message}`);
    }
  }

  console.log(`\n--- Link summary ---`);
  console.log(`Linked: ${ok}  Failed: ${failed}`);
}

// Guard so other scripts (e.g. link_orphaned_intros_to_exams.mjs, reusing
// matchExam against resources.storage_base_url instead of a local docx
// folder path) can `import` from this file without also triggering this
// file's own CLI run.
const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  main().catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
}
