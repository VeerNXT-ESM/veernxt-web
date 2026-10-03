#!/usr/bin/env node
/**
 * scripts/exam-mapping/link_matrix_exam_books.mjs
 *
 * Purpose:
 *   Links books to the 99 exams in "exam_subject_matrix_99_exams.xlsx"
 *   (data/matrix_99_exams.json, built by build_presence_data.py). For every
 *   subject marked Present, the matching book is linked:
 *     GK / Current Affairs / General Studies / General Science -> GS & GK (Guide + Precis)
 *     State-Specific GK  -> that state's GS Guide (e.g. "Assam GS")
 *     English / Hindi / Maths / Reasoning / Computer -> their canonical Guide + Precis
 *     Nursing & Midwifery -> the Nursing Guide (no Nursing Precis exists)
 *   Subjects with no book in the library are reported, not linked. Insert-only:
 *   never removes a link; skips links that already exist. Links carry the
 *   reasoning "... (exam subject matrix)", which sync_subject_book_links.mjs
 *   never deletes (2026-10-02 review: the matrix overrides the presence sheets).
 *
 * Usage:
 *   node scripts/exam-mapping/link_matrix_exam_books.mjs            # Dry run
 *   node scripts/exam-mapping/link_matrix_exam_books.mjs --execute  # Live writes (inserted rows logged)
 */

import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

function loadEnv() {
  const envPath = path.resolve(process.cwd(), '.env');
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, 'utf-8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    if (!(key in process.env)) process.env[key] = trimmed.slice(eq + 1).trim();
  }
}
loadEnv();

const EXECUTE = process.argv.includes('--execute');
const DATA_DIR = path.resolve('scripts/exam-mapping/data');

// Canonical Guide/Precis per core subject (same ids sync_subject_book_links.mjs uses).
const CORE = {
  gsgk: { label: 'GS & GK', Guide: '125ec54d-0a3d-40a3-a0a3-125ec54d0a3d_1d174c11', Precis: '349e75e0-7927-4792-a792-349e75e07927_7101afd1' },
  english: { label: 'English', Guide: '345ae2f4-c7f8-4cc8-9926-578d005fe2d8', Precis: '0503abd3-2d38-42d3-a2d3-0503abd32d38' },
  hindi: { label: 'Hindi', Guide: '8f1d501f-cef0-4268-a112-883052142a15', Precis: '472e55b9-34ef-434e-a34e-472e55b934ef_7c149f88' },
  maths: { label: 'Mathematics', Guide: '20924968-4525-4452-a452-209249684525_1d174c11', Precis: '7c4ebdfc-5c68-45c6-a5c6-7c4ebdfc5c68' },
  reasoning: { label: 'Reasoning', Guide: '756514fe-4f8c-44f8-a4f8-756514fe4f8c_47228b1e', Precis: '4aaea18f-598c-4598-a598-4aaea18f598c_47228b1e' },
  computer: { label: 'Computer Science', Guide: '31cb6eed-1354-4135-a135-31cb6eed1354_1d174c11', Precis: '77a55f03-23c9-423c-a23c-77a55f0323c9_1d174c11' },
};

const SUBJECT_TO_CORE = {
  'General Knowledge / Awareness': 'gsgk',
  'Current Affairs': 'gsgk',
  'General Studies (History, Geography, Polity, Economy)': 'gsgk',
  'General Science': 'gsgk',
  'English Language': 'english',
  'Hindi Language': 'hindi',
  'Quantitative Aptitude / Maths': 'maths',
  'Reasoning / Mental Ability': 'reasoning',
  'Computer Knowledge': 'computer',
};

// State -> its GS Guide title in the Books library. Uttar Pradesh has none
// (2026-10-02 review: to be re-uploaded by the content team).
const STATE_GS_TITLE = {
  assam: 'Assam GS',
  bihar: 'Bihar GS',
  chhattisgarh: 'Chhattisgarh GS',
  goa: 'Goa GS',
  gujarat: 'Gujarat GS',
  haryana: 'Haryana GS',
  'himachal pradesh': 'Himachal Pradesh GS',
  jharkhand: 'Jharkhand GS Book',
  karnataka: 'Karnataka GS',
  kerala: 'KERALA GS',
  'madhya pradesh': 'Madhya Pradesh GS',
  maharashtra: 'MAHARASHTRA GS',
  manipur: 'Manipur GS Book',
};

const NURSING_GUIDE_TITLE = 'Nursing';

const norm = (s) => String(s ?? '').toLowerCase().replace(/[�†]/g, '').replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, ' ').trim();

async function main() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) throw new Error('Missing Supabase credentials in .env');
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
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

  console.log(`Mode: ${EXECUTE ? 'EXECUTE (LIVE WRITES)' : 'DRY RUN'}\n`);

  const rows = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'matrix_99_exams.json'), 'utf-8'));
  const { data: regions, error: regErr } = await supabase.from('lc_regions').select('id,name,level');
  if (regErr) throw regErr;
  const exams = await fetchAll('lc_exams', 'id,name,region_id,also_listed_as');
  const resources = await fetchAll('resources', 'resource_id,title,category,status,storage_base_url', (q) => q.in('category', ['Guide', 'Precis']).eq('format', 'blocks'));
  const maps = await fetchAll('lc_exam_resource_map', 'exam_id,resource_id,category');

  // Canonical row of a Guide title: the storage URL most rows share (the Books
  // page's definition), then the row there carrying the most links.
  const linkCount = new Map();
  for (const m of maps) linkCount.set(m.resource_id, (linkCount.get(m.resource_id) || 0) + 1);
  function canonicalGuide(title) {
    const rowsForTitle = resources.filter((r) => r.category === 'Guide' && r.title.trim() === title);
    if (!rowsForTitle.length) return null;
    const byUrl = new Map();
    for (const r of rowsForTitle) byUrl.set(r.storage_base_url, (byUrl.get(r.storage_base_url) || 0) + 1);
    const url = [...byUrl.entries()].sort((a, b) => b[1] - a[1])[0][0];
    return rowsForTitle.filter((r) => r.storage_base_url === url)
      .sort((a, b) => (linkCount.get(b.resource_id) || 0) - (linkCount.get(a.resource_id) || 0))[0];
  }
  const nursingGuide = canonicalGuide(NURSING_GUIDE_TITLE);

  // 1. Resolve each matrix exam (state-scoped; "All India"/"International"/etc. -> Central).
  const central = regions.find((r) => r.level === 'central');
  const resolved = [];
  const unresolved = [];
  for (const row of rows) {
    const region = regions.find((r) => norm(r.name) === norm(row.state));
    const st = String(row.state || '');
    const stripState = (n) => (n.trim().toLowerCase().endsWith(` (${st.toLowerCase()})`) ? n.trim().slice(0, -(st.length + 3)).trim() : n.trim());
    const lastGroup = (n) => { const t = n.trim(); const i = t.lastIndexOf('('); return t.endsWith(')') && i > 0 ? t.slice(0, i).trim() : t; };
    const variants = [...new Set([row.name, stripState(row.name), lastGroup(row.name), row.name.split(st).join(' ').trim()])];
    const pools = [region ? exams.filter((e) => e.region_id === region.id) : [], exams.filter((e) => e.region_id === central.id)];
    let hit = null;
    for (const pool of pools) {
      for (const v of variants) {
        const h = pool.filter((e) => norm(e.name) === norm(v) || (e.also_listed_as || []).some?.((a) => norm(a) === norm(v)));
        if (h.length === 1) { hit = h[0]; break; }
      }
      if (hit) break;
    }
    if (hit) resolved.push({ row, exam: hit }); else unresolved.push(row);
  }
  console.log(`Matrix exams: ${rows.length}  matched: ${resolved.length}  unmatched: ${unresolved.length}`);
  for (const u of unresolved) console.log(`  UNMATCHED: ${u.name} [${u.state}]`);

  // 2. Plan links per exam.
  const existing = new Set(maps.map((m) => `${m.exam_id}::${m.resource_id}`));
  const toInsert = [];
  const noBook = new Map();
  const noStateGs = [];
  const perSubject = {};
  const add = (row, examId, resourceId, category, why, subjectLabel) => {
    perSubject[subjectLabel] = perSubject[subjectLabel] || new Set();
    perSubject[subjectLabel].add(examId);
    const key = `${examId}::${resourceId}`;
    if (existing.has(key)) return;
    existing.add(key);
    toInsert.push({ exam_id: examId, resource_id: resourceId, category, confidence: 'high', reasoning: why, source: 'manual', _exam: row.name, _book: subjectLabel });
  };
  for (const { row, exam } of resolved) {
    for (const subject of row.present) {
      const why = `${subject} present in syllabus (exam subject matrix)`;
      const core = SUBJECT_TO_CORE[subject];
      if (core) {
        add(row, exam.id, CORE[core].Guide, 'Guide', why, CORE[core].label);
        add(row, exam.id, CORE[core].Precis, 'Precis', why, CORE[core].label);
      } else if (subject === 'State-Specific GK') {
        const title = STATE_GS_TITLE[norm(row.state)];
        const guide = title && canonicalGuide(title);
        if (guide) add(row, exam.id, guide.resource_id, 'Guide', why, `State GS (${title})`);
        else noStateGs.push(`${row.name} [${row.state}]`);
      } else if (subject === 'Nursing & Midwifery' && nursingGuide) {
        add(row, exam.id, nursingGuide.resource_id, 'Guide', why, 'Nursing (Guide only)');
      } else {
        if (!noBook.has(subject)) noBook.set(subject, []);
        noBook.get(subject).push(row.name);
      }
    }
  }

  console.log('\nExams with each book (of the matched exams):');
  for (const [label, set] of Object.entries(perSubject).sort((a, b) => b[1].size - a[1].size)) console.log(`  ${String(set.size).padStart(3)}  ${label}`);
  console.log(`\nLinks to INSERT: ${toInsert.length} (Guide ${toInsert.filter((l) => l.category === 'Guide').length}, Precis ${toInsert.filter((l) => l.category === 'Precis').length})`);
  for (const l of toInsert) console.log(`  + ${l._exam} :: ${l._book} ${l.category}`);
  console.log('\nSubjects marked Present with NO book in the library (not linked):');
  for (const [s, names] of [...noBook.entries()].sort((a, b) => b[1].length - a[1].length)) console.log(`  ${String(names.length).padStart(3)}  ${s}`);
  if (noStateGs.length) console.log(`\nState-Specific GK with no state GS Guide: ${noStateGs.join('; ')}`);

  if (!EXECUTE) { console.log('\nDry run — no changes. Re-run with --execute to apply.'); return; }

  const rowsToWrite = toInsert.map(({ _exam, _book, ...r }) => r);
  const log = path.join(DATA_DIR, `matrix_99_inserted_${Date.now()}.json`);
  fs.writeFileSync(log, JSON.stringify(rowsToWrite, null, 1));
  for (let i = 0; i < rowsToWrite.length; i += 100) {
    const { error } = await supabase.from('lc_exam_resource_map').insert(rowsToWrite.slice(i, i + 100));
    if (error) throw error;
  }
  console.log(`\nDone: inserted ${rowsToWrite.length}. Inserted rows logged to ${log}`);
}

main().catch((err) => { console.error('Fatal error:', err); process.exit(1); });
