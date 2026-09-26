#!/usr/bin/env node
/**
 * Builds the Mock Test (Quiz Center) audit workbook for the content team from
 * the JSON files written by audit_mock_test_linkage.mjs. READ-ONLY on the DB.
 *
 * Usage: node scripts/export_mock_test_report.mjs <audit json dir> <out.xlsx> <label e.g. CENTRAL>
 * Needs the `xlsx` package: resolved from K:\tmp\xlsx_tool (kept out of the repo's package.json).
 */
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { createClient } from '@supabase/supabase-js';

const [dir, out, label = 'CENTRAL'] = process.argv.slice(2);
if (!dir || !out) { console.error('usage: node export_mock_test_report.mjs <json dir> <out.xlsx> [label]'); process.exit(1); }
const xlsx = createRequire('K:/tmp/xlsx_tool/')('xlsx');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const rows = [];
for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.json')).sort()) {
  const cat = f.replace(/^[A-Z]+_/, '').replace(/\.json$/, '').replace(/_/g, ' ').trim();
  for (const r of JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'))) rows.push({ category: cat, ...r });
}

// An exam id claimed by 2+ folders means at least one folder is mismatched (or a real duplicate folder).
const claims = new Map();
rows.filter((r) => r.examId).forEach((r) => (claims.get(r.examId) || claims.set(r.examId, []).get(r.examId)).push(r));
for (const r of rows) if (r.examId && claims.get(r.examId).length > 1) r.flags = [...r.flags, 'EXAM_CLAIMED_BY_MULTIPLE_FOLDERS'];

const cleanName = (s) => (s || '').replace(/[_]+/g, ' ').replace(/\s+/g, ' ').trim();
const base = (r) => ({ Category: r.category, 'Drive folder': r.relPath, 'Drive mock folder': r.mockFolder || '(none)', 'Mock docx on Drive': r.driveFiles, 'Real (>20KB)': r.realFiles, 'Placeholder-size': r.tinyFiles, 'Matched exam (DB)': r.examName || '', 'Conducting body': r.conductingBody || '', 'Exam ID': r.examId || '', 'Match method': r.matchHow, 'DB quizzes': r.dbQuizzes, Flags: r.flags.join('; ') });

const summary = {};
for (const r of rows) {
  const s = (summary[r.category] ||= { Category: r.category, 'Exam folders': 0, 'No mocks on Drive': 0, 'On Drive, not in DB': 0, 'In DB (OK/partial)': 0, 'Unmatched to exam': 0, 'Drive mock docx': 0, 'DB quizzes': 0 });
  s['Exam folders']++; s['Drive mock docx'] += r.realFiles; s['DB quizzes'] += r.dbQuizzes;
  if (r.status === 'NO_MOCKS_ON_DRIVE' || r.status === 'PLACEHOLDERS_ONLY') s['No mocks on Drive']++;
  else if (r.status === 'NOT_IN_DB') s['On Drive, not in DB']++;
  else s['In DB (OK/partial)']++;
  if (!r.examId) s['Unmatched to exam']++;
}
const sumRows = Object.values(summary);
sumRows.push(sumRows.reduce((t, s) => { for (const k of Object.keys(s)) if (k !== 'Category') t[k] += s[k]; return t; }, { Category: 'TOTAL', 'Exam folders': 0, 'No mocks on Drive': 0, 'On Drive, not in DB': 0, 'In DB (OK/partial)': 0, 'Unmatched to exam': 0, 'Drive mock docx': 0, 'DB quizzes': 0 }));

const needMocks = rows.filter((r) => r.status === 'NO_MOCKS_ON_DRIVE' || r.status === 'PLACEHOLDERS_ONLY')
  .map((r) => ({ Category: r.category, Exam: r.examName || cleanName(r.label), 'Conducting body': r.conductingBody || '', 'Drive folder': r.relPath, 'Mock folder': r.mockFolder || '(no mock folder)', 'What is needed': r.mockFolder ? '10 mock test docx missing from the mock folder' : 'Create mock folder and supply 10 mock test docx', 'Exam ID': r.examId || '(unmatched)' }));
const toIngest = rows.filter((r) => r.status === 'NOT_IN_DB' || r.status === 'PARTIAL')
  .map((r) => ({ ...base(r), 'Proposed title pattern': `${r.examName || cleanName(r.label)} Mock Test 01..${String(r.realFiles).padStart(2, '0')}` }));
const unmatched = rows.filter((r) => !r.examId).map(base);
const multi = rows.filter((r) => r.flags.includes('EXAM_CLAIMED_BY_MULTIPLE_FOLDERS')).sort((a, b) => a.examId.localeCompare(b.examId)).map(base);

// Existing quizzes: current title -> proposed no-underscore title (only when the exam is known).
const quizzes = []; for (let from = 0; ; from += 1000) { const { data, error } = await supabase.from('quizzes').select('id,title,exam_name,total_questions,lc_exam_id,file_hash,created_at,source_file').range(from, from + 999); if (error) throw error; quizzes.push(...data); if (data.length < 1000) break; }
const folderByTitle = new Map(); rows.forEach((r) => r.quizTitles.forEach((t) => folderByTitle.set(t, r)));
const grpKey = (q) => `${q.exam_name}||${q.title}`;
const grp = new Map(); quizzes.forEach((q) => (grp.get(grpKey(q)) || grp.set(grpKey(q), []).get(grpKey(q))).push(q));
const existing = quizzes.map((q) => {
  const r = folderByTitle.get(q.title);
  const num = (q.title.match(/(\d+)(?!.*\d)/) || [])[1];
  const examName = r?.examName || null;
  let proposed = '';
  let note = '';
  if (r && examName && num && !/^Section\s*\d+$/i.test(q.title)) proposed = `${examName} Mock Test ${String(num).padStart(2, '0')}`;
  else if (/^Section\s*\d+$/i.test(q.title)) note = 'Title has no exam name; source exam unknown (Stenographer folders exist under ESIC, KVS, etc.) - needs content team to say which exam';
  else if (!r) note = 'No Drive folder matched this quiz';
  const peers = grp.get(grpKey(q)); const best = peers.slice().sort((a, b) => (b.total_questions || 0) - (a.total_questions || 0) || String(a.created_at).localeCompare(String(b.created_at)))[0];
  const dupNote = peers.length > 1 ? (best.id === q.id ? `DUPLICATE x${peers.length} - suggested KEEP (most questions)` : 'DUPLICATE - suggested ARCHIVE') : '';
  return { 'Quiz ID': q.id, 'Copies of this paper': peers.length, 'Duplicate action': dupNote, 'Created': String(q.created_at).slice(0, 10), 'File hash': q.file_hash || '', 'Current title': q.title, 'DB exam_name': q.exam_name, Questions: q.total_questions, 'Linked exam ID (now)': q.lc_exam_id || '(none)', 'Matched exam': examName || '', 'Exam ID to link': r?.examId || '', 'Proposed title': proposed, Note: note };
});

const wb = xlsx.utils.book_new();
const add = (name, data, widths) => { const ws = xlsx.utils.json_to_sheet(data.length ? data : [{ Note: '(none)' }]); if (widths) ws['!cols'] = widths.map((w) => ({ wch: w })); xlsx.utils.book_append_sheet(wb, ws, name); };
add('Summary', sumRows, [44, 14, 18, 20, 20, 18, 16, 12]);
add('Need mock tests (content)', needMocks, [26, 40, 30, 60, 22, 48, 38]);
add('On Drive, ingest to DB', toIngest, [26, 60, 22, 12, 12, 12, 40, 30, 38, 14, 10, 30, 50]);
add('Existing quizzes to fix', existing, [38, 10, 44, 12, 34, 40, 30, 10, 38, 40, 38, 50, 60]);
add('Unmatched to an exam', unmatched, [26, 60, 22, 12, 12, 12, 30, 20, 20, 14, 10, 30]);
add('Verify duplicate matches', multi, [26, 60, 22, 12, 12, 12, 40, 30, 38, 14, 10, 40]);
xlsx.writeFile(wb, out);
console.log(`Wrote ${out}\n${label}: ${rows.length} exam folders | need mocks ${needMocks.length} | ingest ${toIngest.length} | existing quizzes ${existing.length} (unique papers ${grp.size}; ${existing.filter((e) => e['Proposed title']).length} proposed) | unmatched ${unmatched.length} | multi-claim ${multi.length}`);
