#!/usr/bin/env node
/**
 * Mock-test GAP report for the content team (CENTRAL + STATE + UT in one workbook). READ-ONLY.
 *
 * Source of truth: the database (exams, quizzes, questions) + the Drive audit JSONs written by
 * audit_mock_test_linkage.mjs (K:\tmp\mock_audit\{CENTRAL,STATE,UT}_*.json) + scripts/data/mock_exam_overrides.json.
 *
 * Sheets: Read me | Summary by region | Exams needing mock tests | Incomplete exams (<10 papers) |
 *         Placeholder files | Drive folders not matched | Conflicts (one exam, several folders) |
 *         Few playable questions (<10) | Flagged questions by exam
 *
 * Usage: node scripts/export_mock_gap_report.mjs <out.xlsx>     (needs `xlsx` in K:\tmp\xlsx_tool)
 */
import 'dotenv/config';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { createClient } from '@supabase/supabase-js';

const out = process.argv[2];
if (!out) { console.error('usage: node export_mock_gap_report.mjs <out.xlsx>'); process.exit(1); }
const xlsx = createRequire('K:/tmp/xlsx_tool/')('xlsx');
const URL_ = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const sb = createClient(URL_, process.env.SUPABASE_SERVICE_ROLE_KEY);
const ref = new URL(URL_).hostname.split('.')[0];
const sql = async (query) => { const r = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, { method: 'POST', headers: { Authorization: `Bearer ${process.env.SUPABASE_ACCESS_TOKEN}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ query }) }); const j = await r.json(); if (!Array.isArray(j)) throw new Error(JSON.stringify(j).slice(0, 300)); return j; };
const AUDIT = 'K:/tmp/mock_audit/';
const BS = String.fromCharCode(92);
const compact = (x) => String(x || '').toLowerCase().replace(/&/g, ' and ').split(' and ').join('').replace(/[^a-z0-9]/g, '');
const strip = (s) => String(s || '').replace(/^[0-9]+[.] */, '');

async function all(table, cols) { let o = []; for (let f = 0; ; f += 1000) { const { data, error } = await sb.from(table).select(cols).range(f, f + 999); if (error) throw new Error(table + ': ' + error.message); o = o.concat(data); if (data.length < 1000) break; } return o; }

const UT_NAMES = ['Andaman and Nicobar Islands', 'Chandigarh', 'DADRA & NAGAR HAVELI AND DAMAN & DIU', 'Jammu & Kashmir', 'Delhi', 'Ladakh', 'Lakshadweep', 'Puducherry'].map(compact);
const exams = await all('exams', 'exam_id, exam_name, conducting_body, state_ut');
const quizzes = await all('quizzes', 'id, title, lc_exam_id, total_questions, playable_questions, source_file');
const overrides = JSON.parse(fs.readFileSync(new URL('./data/mock_exam_overrides.json', import.meta.url), 'utf8'));

const regionOf = (e) => (e.state_ut ? String(e.state_ut).replace('Lakshadwee p', 'Lakshadweep') : 'CENTRAL');
const treeOf = (e) => (!e.state_ut ? 'CENTRAL' : UT_NAMES.includes(compact(String(e.state_ut).replace('Lakshadwee p', 'Lakshadweep'))) ? 'UT' : 'STATE');
const examById = new Map(exams.map((e) => [e.exam_id, e]));

// per-quiz question stats (one aggregate query)
const qstats = new Map();
try {
  for (const r of await sql(`select quiz_id::text id, count(*) n, count(*) filter (where cardinality(review_flags)>0) flagged, count(*) filter (where correct_answer is null) nokey from questions group by quiz_id`)) qstats.set(r.id, r);
} catch (e) { console.log('question aggregate skipped:', e.message); }

const perExam = new Map();
for (const q of quizzes) {
  if (!q.lc_exam_id) continue;
  const o = perExam.get(q.lc_exam_id) || { quizzes: 0, questions: 0, playable: 0, listed: 0, flagged: 0, dirs: new Set() };
  o.quizzes++; o.questions += q.total_questions || 0; o.playable += q.playable_questions || 0; if ((q.playable_questions || 0) >= 10) o.listed++;
  o.flagged += Number(qstats.get(q.id)?.flagged || 0);
  o.dirs.add(String(q.source_file || '').split(BS).slice(4, -1).join(' / '));
  perExam.set(q.lc_exam_id, o);
}

// Drive audit rows (tree from file name), with manual overrides applied
const drive = [];
for (const f of fs.readdirSync(AUDIT).filter((x) => /^(CENTRAL|STATE|UT)_.*[.]json$/.test(x) && !/^STATE_01_/.test(x))) {
  const tree = f.split('_')[0]; let rows; try { rows = JSON.parse(fs.readFileSync(AUDIT + f, 'utf8')); } catch { continue; }
  if (!Array.isArray(rows)) continue;
  const cat = f.replace(/^(CENTRAL|STATE|UT)_/, '').replace(/[.]json$/, '').split('__').join(' ').split('_').join(' ');
  for (const r of rows) {
    const key = Object.keys(overrides).find((k) => k.endsWith('|' + r.relPath) && compact(k.split('|')[0]).length > 0 && (compact(cat).includes(compact(k.split('|')[0])) || compact(k.split('|')[0]).includes(compact(cat))));
    const examId = (key && overrides[key]) || r.examId;
    drive.push({ tree, cat, ...r, examId, overridden: !!(key && overrides[key]) });
  }
}
const driveByExam = new Map();
for (const d of drive) if (d.examId) driveByExam.set(d.examId, [...(driveByExam.get(d.examId) || []), d]);

const sheets = [];
const add = (name, rows) => sheets.push([name, rows.length ? rows : [{ note: 'nothing to report' }]]);
const dpath = (d) => `${d.tree} EXAMS / ${d.cat} / ${d.relPath.split(BS).join(' / ')}`;

// ---- Exams needing mock tests
const need = [];
for (const e of exams) {
  const o = perExam.get(e.exam_id); if (o && o.quizzes > 0) continue;
  const ds = driveByExam.get(e.exam_id) || [];
  let why, action, path = '';
  if (!ds.length) { why = 'No Drive folder found for this exam'; action = 'Create the exam folder with a "5. 10 MOCK TESTS" sub-folder and upload the papers'; }
  else {
    const d = ds[0]; path = dpath(d);
    if (d.realFiles === 0 && d.tinyFiles > 0) { why = `Placeholder files only (${d.tinyFiles} tiny .docx)`; action = 'Replace the placeholders with the real mock tests'; }
    else if (!d.mockFolder) { why = 'Exam folder exists but has no mock-test sub-folder'; action = 'Add a "5. 10 MOCK TESTS" sub-folder and upload the papers'; }
    else if (d.realFiles === 0) { why = 'Mock-test folder exists but is empty'; action = 'Upload the mock-test .docx files'; }
    else { why = 'Real papers exist on Drive but were not loaded (held, unreadable or exam shared with another folder)'; action = 'See sheets "Conflicts" / "Drive folders not matched"'; }
  }
  need.push({ Tree: treeOf(e), Region: regionOf(e), Exam: e.exam_name, 'Conducting body': e.conducting_body, Why: why, 'Drive path': path, 'What to do': action });
}
need.sort((a, b) => a.Tree.localeCompare(b.Tree) || a.Region.localeCompare(b.Region) || String(a.Exam).localeCompare(String(b.Exam)));
add('Exams needing mock tests', need);

// ---- Incomplete (1-9 papers)
add('Incomplete exams (<10 papers)', exams.filter((e) => { const o = perExam.get(e.exam_id); return o && o.quizzes > 0 && o.quizzes < 10; }).map((e) => { const o = perExam.get(e.exam_id); return { Tree: treeOf(e), Region: regionOf(e), Exam: e.exam_name, 'Conducting body': e.conducting_body, 'Papers in app': o.quizzes, 'Papers still needed (to reach 10)': 10 - o.quizzes, 'Loaded from': [...o.dirs].join(' | ') }; }).sort((a, b) => a['Papers in app'] - b['Papers in app']));

// ---- Placeholder files
add('Placeholder files', drive.filter((d) => d.tinyFiles > 0).map((d) => ({ Tree: d.tree, Folder: dpath(d), 'Real papers': d.realFiles, 'Placeholder (tiny) files': d.tinyFiles, Exam: d.examName || '(no match)' })).sort((a, b) => b['Placeholder (tiny) files'] - a['Placeholder (tiny) files']));

// ---- Folders not matched
const cand = (d) => {
  const region = d.tree === 'CENTRAL' ? null : compact(strip(d.cat));
  const lt = new Set(String(d.label).toLowerCase().split(/[^a-z0-9]+/).filter((t) => t.length > 2));
  return exams.filter((e) => !region || compact(e.state_ut) === region).map((e) => { const et = new Set(String(e.exam_name).toLowerCase().split(/[^a-z0-9]+/).filter((t) => t.length > 2)); const hit = [...lt].filter((t) => et.has(t)).length; return { e, hit }; }).filter((x) => x.hit > 0).sort((a, b) => b.hit - a.hit).slice(0, 3).map((x) => x.e.exam_name).join(' | ');
};
add('Drive folders not matched', drive.filter((d) => d.realFiles > 0 && !d.examId).map((d) => ({ Tree: d.tree, Folder: dpath(d), 'Real papers on Drive': d.realFiles, 'Closest exams in the app (suggestion only)': cand(d), 'What to do': 'Tell us which exam this folder belongs to (or create the exam)' })));

// ---- Conflicts: exam claimed by several folders with real papers
const conflicts = [];
for (const [id, ds] of driveByExam) { const real = ds.filter((d) => d.realFiles > 0); if (real.length < 2) continue; const e = examById.get(id); const o = perExam.get(id);
  for (const d of real) conflicts.push({ Exam: e?.exam_name, 'Exam region': e ? regionOf(e) : '', 'Conducting body': e?.conducting_body, 'Drive folder': dpath(d), 'Papers in this folder': d.realFiles, 'Papers currently in app for this exam': o?.quizzes || 0, 'What to do': 'Two folders point to one exam. Say which folder is right, or which exam each belongs to.' }); }
add('Conflicts (shared exams)', conflicts);

// ---- Few playable questions (listed in the app, not hidden)
add('Few playable questions (<10)', quizzes.filter((q) => (q.playable_questions || 0) < 10).map((q) => { const e = examById.get(q.lc_exam_id); const s = qstats.get(q.id); return { Tree: e ? treeOf(e) : '(unlinked)', Region: e ? regionOf(e) : '', Exam: e?.exam_name || '(no exam)', Quiz: q.title, 'Questions in source': q.total_questions, 'Playable questions': q.playable_questions, 'Without answer key': s?.nokey ?? '' }; }).sort((a, b) => a.Tree.localeCompare(b.Tree) || String(a.Exam).localeCompare(String(b.Exam))));

// ---- Flagged questions by exam
add('Flagged questions by exam', [...perExam.entries()].map(([id, o]) => { const e = examById.get(id); return { Tree: e ? treeOf(e) : '', Region: e ? regionOf(e) : '', Exam: e?.exam_name, Papers: o.quizzes, Questions: o.questions, Flagged: o.flagged, 'Flagged %': o.questions ? Math.round((100 * o.flagged) / o.questions) : 0, 'Playable questions': o.playable, 'Papers with 10+ playable questions': o.listed }; }).sort((a, b) => b['Flagged %'] - a['Flagged %'] || b.Flagged - a.Flagged));

// ---- Summary by region
const regions = new Map();
const R = (tree, name) => { const k = tree + '|' + name; if (!regions.has(k)) regions.set(k, { Tree: tree, Region: name, 'Exams in app': 0, 'Exams WITH mock tests': 0, 'Exams WITHOUT mock tests': 0, 'Papers in app': 0, Questions: 0, 'Playable questions': 0, 'Drive folders with real papers': 0, 'Folders with placeholders only': 0, 'Folders not matched to an exam': 0 }); return regions.get(k); };
for (const e of exams) { const r = R(treeOf(e), regionOf(e)); r['Exams in app']++; const o = perExam.get(e.exam_id); if (o && o.quizzes) { r['Exams WITH mock tests']++; r['Papers in app'] += o.quizzes; r.Questions += o.questions; r['Playable questions'] += o.playable; } else r['Exams WITHOUT mock tests']++; }
for (const d of drive) { const reg = d.tree === 'CENTRAL' ? 'CENTRAL' : strip(d.cat); const r = [...regions.values()].find((x) => x.Tree === d.tree && (d.tree === 'CENTRAL' || compact(x.Region) === compact(reg))) || R(d.tree, reg); if (d.realFiles > 0) r['Drive folders with real papers']++; if (d.realFiles === 0 && d.tinyFiles > 0) r['Folders with placeholders only']++; if (d.realFiles > 0 && !d.examId) r['Folders not matched to an exam']++; }
const summary = [...regions.values()].sort((a, b) => ['CENTRAL', 'STATE', 'UT'].indexOf(a.Tree) - ['CENTRAL', 'STATE', 'UT'].indexOf(b.Tree) || a.Region.localeCompare(b.Region));
const tot = (t) => summary.filter((s) => s.Tree === t).reduce((a, s) => { for (const k of Object.keys(s)) if (typeof s[k] === 'number') a[k] = (a[k] || 0) + s[k]; return a; }, { Tree: t, Region: 'TOTAL ' + t });
add('Summary by region', [...summary, tot('CENTRAL'), tot('STATE'), tot('UT')]);

const readme = [
  { 'Mock tests gap report': `Generated ${new Date().toISOString().slice(0, 10)} from the live database and the Google Drive audit.` },
  { 'Mock tests gap report': 'PURPOSE: shows where mock tests are still missing so they can be uploaded, and what needs a decision. Every paper that exists on Drive in a readable form has already been loaded and linked to its exam.' },
  { 'Mock tests gap report': 'HOW TO UPLOAD: put the papers (.docx, 10 per exam) in the exam folder under a sub-folder named "5. 10 MOCK TESTS" (a number, then MOCK TESTS or TEST SERIES). Papers under about 20 KB are treated as placeholders.' },
  { 'Mock tests gap report': 'Paper format: "Q1." question, A) to D) options, "Answer: C" and "Explanation:". The loader also reads several other layouts; questions it cannot read cleanly are flagged and hidden from students, never dropped silently.' },
  { 'Mock tests gap report': 'SHEETS: Summary by region | Exams needing mock tests (upload these) | Incomplete exams (fewer than 10 papers) | Placeholder files (replace these) | Drive folders not matched (tell us the exam) | Conflicts (shared exams: one exam, several folders - tell us which is right) | Few playable questions (listed in the app, but fewer than 10 questions can be attempted until the source paper is fixed) | Flagged questions by exam (source papers with wrong or missing answer keys - please review).' },
];
sheets.unshift(['Read me', readme]);
const wb = xlsx.utils.book_new();
for (const [name, rows] of sheets) { const ws = xlsx.utils.json_to_sheet(rows); ws['!cols'] = Object.keys(rows[0]).map((k) => ({ wch: Math.min(70, Math.max(12, k.length + 2, ...rows.slice(0, 200).map((r) => String(r[k] ?? '').length + 2))) })); xlsx.utils.book_append_sheet(wb, ws, name.slice(0, 31)); }
xlsx.writeFile(wb, out);
for (const [name, rows] of sheets) console.log(name.padEnd(36), rows.length, 'rows');
console.log('wrote', out);
