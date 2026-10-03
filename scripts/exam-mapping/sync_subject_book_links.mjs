#!/usr/bin/env node
/**
 * scripts/exam-mapping/sync_subject_book_links.mjs
 *
 * Purpose:
 *   Applies a content-team "<Subject> Presence — All States" sheet to
 *   `lc_exam_resource_map`, then pairs the subject's Guide and Precis:
 *     1. "Present" exams get the canonical Guide + Precis.
 *     2. "Not Present" exams have every Guide/Precis link for the subject removed.
 *     3. Links to a copy stored at a non-canonical URL are moved onto the canonical
 *        book (the Books page only counts rows at the canonical URL).
 *     4. Every exam with either book gets both, so Guide and Precis link counts match.
 *   Exams not listed in the sheet (Central, UTs) are only touched by steps 3-4.
 *
 * Input:
 *   scripts/exam-mapping/data/<subject>_presence_states.json  ({state, name, present}[])
 *
 * Usage:
 *   node scripts/exam-mapping/sync_subject_book_links.mjs --subject computer            # Dry run
 *   node scripts/exam-mapping/sync_subject_book_links.mjs --subject computer --execute  # Live writes (backup written first)
 *   node scripts/exam-mapping/sync_subject_book_links.mjs --subject computer --ut       # UT sheet (data/ut_<subject>_presence.json)
 *   node scripts/exam-mapping/sync_subject_book_links.mjs --subject computer --central  # Central by-category sheet (data/central_<subject>_presence.json)
 */

import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

function loadEnv() {
  const envPath = path.resolve(process.cwd(), '.env');
  if (!fs.existsSync(envPath)) return;
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

// Canonical books = the Guide/Precis rows already carrying most of the subject's links.
const SUBJECTS = {
  reasoning: {
    title: 'reasoning',
    Guide: '756514fe-4f8c-44f8-a4f8-756514fe4f8c_47228b1e',
    Precis: '4aaea18f-598c-4598-a598-4aaea18f598c_47228b1e',
  },
  computer: {
    title: 'computer science',
    Guide: '31cb6eed-1354-4135-a135-31cb6eed1354_1d174c11',
    Precis: '77a55f03-23c9-423c-a23c-77a55f0323c9_1d174c11',
  },
  hindi: {
    title: 'hindi',
    Guide: '8f1d501f-cef0-4268-a112-883052142a15',
    // The Books page's canonical HINDI Precis (Cluster_012, 561 rows). A second
    // upload (6d359416..., Cluster_057, same 18 chapters) carries links the page
    // never counts; the stray-copy step moves those onto this one.
    Precis: '472e55b9-34ef-434e-a34e-472e55b934ef_7c149f88',
  },
  gsgk: {
    title: 'gs & gk',
    Guide: '125ec54d-0a3d-40a3-a0a3-125ec54d0a3d_1d174c11',
    Precis: '349e75e0-7927-4792-a792-349e75e07927_7101afd1',
    // Other GS/GK books (state GS Guides like "Bihar GS", the "2026 GK-GS"
    // Precis) are also unlinked from not-present exams. They're never added.
    alsoRemoveFromAbsent: /\bgs\b|\bgk\b|\bgk-gs\b/i,
  },
  maths: {
    title: 'mathematics',
    Guide: '20924968-4525-4452-a452-209249684525_1d174c11',
    Precis: '7c4ebdfc-5c68-45c6-a5c6-7c4ebdfc5c68',
    alsoRemoveFromAbsent: /math/i, // e.g. the combined "MATHS AND REASONING" Guide
  },
  english: {
    title: 'english',
    Guide: '345ae2f4-c7f8-4cc8-9926-578d005fe2d8',
    // Canonical copy at .../Precis/1b0cedf2-.../; a second upload at
    // .../Precis/6a3c965c-.../ is folded in by the stray-copy step.
    Precis: '0503abd3-2d38-42d3-a2d3-0503abd32d38',
    alsoRemoveFromAbsent: /english/i,
  },
};

const EXECUTE = process.argv.includes('--execute');
const subjectKey = process.argv[process.argv.indexOf('--subject') + 1];
const SUBJECT = SUBJECTS[subjectKey];
if (!process.argv.includes('--subject') || !SUBJECT) {
  console.error(`Usage: --subject <${Object.keys(SUBJECTS).join('|')}> [--execute]`);
  process.exit(1);
}
// --ut / --central: apply the UT sheet (data/ut_<subject>_presence.json) or the
// Central "by category" sheet (data/central_<subject>_presence.json, every row
// state "Central") instead of the state one.
const UT = process.argv.includes('--ut');
const CENTRAL = process.argv.includes('--central');
const DATA_FILE = path.resolve(
  UT ? `scripts/exam-mapping/data/ut_${subjectKey}_presence.json`
    : CENTRAL ? `scripts/exam-mapping/data/central_${subjectKey}_presence.json`
      : `scripts/exam-mapping/data/${subjectKey}_presence_states.json`,
);

const norm = (s) => String(s).toLowerCase().replace(/[�†]/g, '').replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, ' ').trim();

// "Exam (Body (Abbr))" -> ["Exam", "Body (Abbr)"]: splits off the last balanced (...) group.
function splitTrailingGroup(s) {
  const t = s.replace(/[�†]/g, '').trim();
  if (!t.endsWith(')')) return [t, ''];
  let depth = 0;
  for (let i = t.length - 1; i >= 0; i--) {
    if (t[i] === ')') depth++;
    else if (t[i] === '(' && --depth === 0) return [t.slice(0, i).trim(), t.slice(i + 1, -1).trim()];
  }
  return [t, ''];
}

// UT sheet names that differ from the catalog's: [sheet-name pattern, catalog-name pattern].
const UT_NAME_ALIASES = [
  [/^gds postal assistant/, /gds gramin dak sevak/], // "GDS / Postal Assistant (India Post)" -> "<UT> GDS (Gramin Dak Sevak)"
];

// Body names match when equal, one contains the other, or one is the other's
// initials ("Rajasthan Staff Selection Board" ~ "RSSB", "Public Works Department" ~ "PWD").
const initials = (s) => norm(s).split(' ').filter((w) => w && !['of', 'and', 'the', 'for', 'in'].includes(w)).map((w) => w[0]).join('');
function bodiesMatch(a, b) {
  const x = norm(a);
  const y = norm(b);
  if (!x || !y) return false;
  return x === y || x.includes(y) || y.includes(x)
    || initials(a) === y.replace(/ /g, '') || initials(b) === x.replace(/ /g, '');
}

/**
 * True duplicates: same normalized name and the same body -- a sheet row's status
 * then applies to each (e.g. Delhi's two "Sanitary Inspector [MCD]" rows).
 * Same name under different bodies (Central's many "Staff Nurse"s) is NOT this.
 */
function areDuplicates(hits, bodyName) {
  return hits.length > 1 && hits.every((e) => norm(e.name) === norm(hits[0].name)
    && bodiesMatch(bodyName(e), bodyName(hits[0])));
}

/**
 * Exams in `pool` (one region's exams) a sheet name refers to. Tries, in order:
 * exact text (keeps "Sister Grade II" and "Sister Grade-II" apart), normalized
 * name, "name (body)", the name with trailing (...) groups peeled off one at a
 * time (narrowed by body when ambiguous), then UT_NAME_ALIASES. May return
 * several exams -- the caller accepts that only for true duplicates.
 */
function matchExams(sheetName, pool, bodyName) {
  const n = norm(sheetName);
  const raw = sheetName.replace(/[�†]/g, '').trim().toLowerCase();
  let hits = pool.filter((e) => e.name.trim().toLowerCase() === raw);
  if (hits.length === 1 || areDuplicates(hits, bodyName)) return hits;
  hits = pool.filter((e) => norm(e.name) === n || (e.also_listed_as || []).some?.((a) => norm(a) === n));
  if (hits.length) return hits;
  hits = pool.filter((e) => norm(`${e.name} (${bodyName(e)})`) === n);
  if (hits.length === 1) return hits;

  let [base, body] = splitTrailingGroup(sheetName);
  while (base) {
    let cand = pool.filter((e) => norm(e.name) === norm(base));
    if (cand.length > 1 && body) {
      // A body was given: only exams under that body qualify (none -> not in this region).
      return cand.filter((e) => bodiesMatch(body, bodyName(e)));
    }
    if (cand.length) return cand;
    const next = splitTrailingGroup(base);
    if (next[0] === base) break;
    [base, body] = next;
  }

  for (const [from, to] of UT_NAME_ALIASES) {
    if (from.test(n)) {
      const cand = pool.filter((e) => to.test(norm(e.name)));
      if (cand.length === 1) return cand;
    }
  }
  return [];
}

async function main() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Missing Supabase credentials in .env');
  }
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  async function fetchAll(table, select, filter = (q) => q) {
    let out = [];
    for (let from = 0; ; from += 1000) {
      const { data, error } = await filter(supabase.from(table).select(select)).range(from, from + 999);
      if (error) throw error;
      out = out.concat(data);
      if (data.length < 1000) break;
    }
    return out;
  }

  console.log(`Subject: ${subjectKey}   Mode: ${EXECUTE ? 'EXECUTE (LIVE WRITES)' : 'DRY RUN'}\n`);

  // 1. Match sheet rows to lc_exams, scoped to the row's state.
  // Central sheets carry a "Present in All" pseudo-row and the odd "3. Pharmacist".
  const rows = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'))
    .filter((r) => norm(r.name) !== 'present in all')
    .map((r) => ({ ...r, name: r.name.replace(/^\s*\d+\.\s+/, '') }));
  const { data: regions, error: regErr } = await supabase.from('lc_regions').select('id,name');
  if (regErr) throw regErr;
  const regionByName = new Map(regions.map((r) => [norm(r.name), r.id]));
  const exams = await fetchAll('lc_exams', 'id,name,region_id,also_listed_as,conducting_body_id');
  const bodies = await fetchAll('lc_conducting_bodies', 'id,name');
  const bodyById = new Map(bodies.map((b) => [b.id, b.name]));
  const bodyName = (e) => bodyById.get(e.conducting_body_id) || '';

  const presentIds = new Set();
  const absentIds = new Set();
  const unmatched = [];
  const matched = rows.map((row) => {
    const regionId = regionByName.get(norm(row.state));
    return { row, hits: matchExams(row.name, exams.filter((e) => e.region_id === regionId), bodyName) };
  });
  // A bare generic name ("staff Nurse") matching several exams resolves only if
  // exactly one of them isn't already claimed by a more specific row.
  const claimed = new Set(matched.filter((m) => m.hits.length === 1).map((m) => m.hits[0].id));
  for (const m of matched) {
    let { hits } = m;
    if (hits.length > 1 && !areDuplicates(hits, bodyName)) {
      const unclaimed = hits.filter((e) => !claimed.has(e.id));
      if (unclaimed.length === 1) hits = unclaimed;
    }
    if (!hits.length || (hits.length > 1 && !areDuplicates(hits, bodyName))) {
      unmatched.push({ ...m.row, hits: hits.length });
      continue;
    }
    for (const e of hits) (m.row.present ? presentIds : absentIds).add(e.id);
  }
  const conflicts = [...presentIds].filter((id) => absentIds.has(id));
  if (conflicts.length) throw new Error(`Exams marked both present and absent: ${conflicts.join(', ')}`);

  console.log(`Sheet rows: ${rows.length}  matched present: ${presentIds.size}  absent: ${absentIds.size}  unmatched: ${unmatched.length}`);
  for (const u of unmatched) console.log(`  HELD (${u.hits} matches): ${u.state} | ${u.name}`);

  // 2. Every Guide/Precis row for the subject (1,000+ rows -- must paginate).
  const firstWord = SUBJECT.title.split(' ')[0];
  const resources = (await fetchAll('resources', 'resource_id,title,category,storage_base_url', (q) => q
    .in('category', ['Guide', 'Precis'])
    .ilike('title', `%${firstWord}%`)))
    .filter((r) => r.title.trim().toLowerCase() === SUBJECT.title);
  const byId = new Map(resources.map((r) => [r.resource_id, r]));
  const canonicalUrl = {
    Guide: byId.get(SUBJECT.Guide).storage_base_url,
    Precis: byId.get(SUBJECT.Precis).storage_base_url,
  };
  const allMaps = await fetchAll('lc_exam_resource_map', '*');
  const maps = allMaps.filter((m) => byId.has(m.resource_id));

  // 3. Plan: drop absent-exam links, move stray-copy links, then pair.
  // Links added from the exam subject matrix (link_matrix_exam_books.mjs) are
  // never dropped here -- per the 2026-10-02 review the matrix overrides these
  // presence sheets.
  const fromMatrix = (m) => /exam subject matrix/i.test(m.reasoning || '');
  const toDelete = maps.filter((m) => absentIds.has(m.exam_id) && !fromMatrix(m));

  // Related books under other titles, unlinked from not-present exams only.
  if (SUBJECT.alsoRemoveFromAbsent) {
    const absentMaps = allMaps.filter((m) => absentIds.has(m.exam_id) && !byId.has(m.resource_id) && !fromMatrix(m));
    const candidates = [...new Set(absentMaps.map((m) => m.resource_id))];
    const titleById = new Map();
    for (let i = 0; i < candidates.length; i += 100) {
      const { data, error } = await supabase.from('resources').select('resource_id,title,category')
        .in('resource_id', candidates.slice(i, i + 100)).in('category', ['Guide', 'Precis']);
      if (error) throw error;
      for (const r of data) if (SUBJECT.alsoRemoveFromAbsent.test(r.title)) titleById.set(r.resource_id, `${r.category} "${r.title.trim()}"`);
    }
    const related = absentMaps.filter((m) => titleById.has(m.resource_id));
    const byTitle = {};
    for (const m of related) byTitle[titleById.get(m.resource_id)] = (byTitle[titleById.get(m.resource_id)] || 0) + 1;
    console.log(`\nRelated-title links on not-present exams: ${related.length}`);
    for (const [t, n] of Object.entries(byTitle).sort((a, b) => b[1] - a[1])) console.log(`  ${n}\t${t}`);
    toDelete.push(...related);
  }
  const kept = maps.filter((m) => !absentIds.has(m.exam_id));
  const isStray = (m) => byId.get(m.resource_id).storage_base_url !== canonicalUrl[m.category];

  const covered = { Guide: new Set(), Precis: new Set() };
  for (const m of kept) if (!isStray(m)) covered[m.category].add(m.exam_id);
  const toRepoint = [];
  for (const m of kept.filter(isStray)) {
    if (covered[m.category].has(m.exam_id)) { toDelete.push(m); continue; }
    toRepoint.push(m);
    covered[m.category].add(m.exam_id);
  }

  const targetExams = new Set([...kept.map((m) => m.exam_id), ...presentIds]);
  const toInsert = [];
  for (const cat of ['Guide', 'Precis']) {
    for (const examId of targetExams) {
      if (covered[cat].has(examId)) continue;
      toInsert.push({
        exam_id: examId,
        resource_id: SUBJECT[cat],
        category: cat,
        confidence: 'high',
        reasoning: presentIds.has(examId)
          ? `${SUBJECT.title} present in syllabus (${subjectKey} presence sheet)`
          : `Paired with ${SUBJECT.title} ${cat === 'Guide' ? 'Precis' : 'Guide'}`,
        source: 'manual',
      });
    }
  }

  console.log(`\nLinks to DELETE: ${toDelete.length} (not-present exams: ${toDelete.filter((m) => absentIds.has(m.exam_id)).length}, duplicate stray copies: ${toDelete.filter((m) => !absentIds.has(m.exam_id)).length})`);
  console.log(`Stray-copy links repointed to canonical: ${toRepoint.length}`);
  console.log(`Links to INSERT: Guide ${toInsert.filter((l) => l.category === 'Guide').length}, Precis ${toInsert.filter((l) => l.category === 'Precis').length}`);
  console.log(`Result: Guide and Precis each linked to ${targetExams.size} exams`);

  if (!EXECUTE) {
    console.log('\nDry run — no changes. Re-run with --execute to apply.');
    return;
  }

  const backup = path.resolve(`scripts/exam-mapping/data/${subjectKey}_links_backup_${Date.now()}.json`);
  fs.writeFileSync(backup, JSON.stringify({ deleted: toDelete, repointed: toRepoint }, null, 1));
  console.log(`Backed up changed rows to ${backup}`);

  const delIds = toDelete.map((m) => m.id);
  for (let i = 0; i < delIds.length; i += 100) {
    const { error } = await supabase.from('lc_exam_resource_map').delete().in('id', delIds.slice(i, i + 100));
    if (error) throw error;
  }
  for (const m of toRepoint) {
    const { error } = await supabase.from('lc_exam_resource_map')
      .update({ resource_id: SUBJECT[m.category] }).eq('id', m.id);
    if (error) throw error;
  }
  for (let i = 0; i < toInsert.length; i += 100) {
    const { error } = await supabase.from('lc_exam_resource_map').insert(toInsert.slice(i, i + 100));
    if (error) throw error;
  }
  console.log(`\nDone: deleted ${toDelete.length}, repointed ${toRepoint.length}, inserted ${toInsert.length}.`);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
