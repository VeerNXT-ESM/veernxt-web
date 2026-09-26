#!/usr/bin/env node
/**
 * READ-ONLY. Are mock-test quizzes linked to the RIGHT exam? For every Drive mock folder, compare the
 * folder path (category / body / post) with the exam its quizzes are linked to (exam_name + conducting_body).
 *   - score = share of the exam's distinctive tokens found in the folder path
 *   - flags: LOW_MATCH, TWO_EXAMS_IN_ONE_FOLDER, EXAM_FROM_MANY_FOLDERS, BODY_MISMATCH
 * Usage: node scripts/audit_mock_mapping.mjs [--json=out.json]
 */
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

const jsonOut = (process.argv.find((a) => a.startsWith('--json=')) || '').slice(7);
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function fetchAll(table, select) { let r = []; for (let f = 0; ; f += 1000) { const { data, error } = await supabase.from(table).select(select).order('id', { ascending: true }).range(f, f + 999); if (error) throw error; r = r.concat(data); if (data.length < 1000) break; } return r; }
async function fetchExams() { let r = []; for (let f = 0; ; f += 1000) { const { data, error } = await supabase.from('exams').select('exam_id,exam_name,conducting_body,career_track').order('exam_id').range(f, f + 999); if (error) throw error; r = r.concat(data); if (data.length < 1000) break; } return r; }

const STOP = new Set(['of', 'the', 'and', 'for', 'in', 'a', 'an', 'recruitment', 'exam', 'examination', 'limited', 'ltd', 'board', 'commission', 'service', 'services', 'public', 'india', 'indian', 'government', 'department', 'mock', 'test', 'series', 'tests', 'sub', 'post', 'posts']);
const norm = (s) => (s || '').toLowerCase().replace(/^\d+(\s*\(\d+\))?\.\s*/, '').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
const toks = (s) => new Set(norm(s).split(' ').filter((t) => t && !STOP.has(t) && !/^\d+$/.test(t)));

const exams = new Map((await fetchExams()).map((e) => [e.exam_id, e]));
// quizzes: page with a stable order on a small set of columns (no questions involved)
let quizzes = []; for (let f = 0; ; f += 1000) { const { data, error } = await supabase.from('quizzes').select('id,title,lc_exam_id,exam_name,source_file').order('id').range(f, f + 999); if (error) throw error; quizzes = quizzes.concat(data); if (data.length < 1000) break; }

const ROOT = /CENTRAL EXAMS[\\/]/i;
const folders = new Map();
for (const q of quizzes) {
  if (!q.source_file || !ROOT.test(q.source_file)) continue; // legacy rows point at the old Profiling Engine path
  const rel = q.source_file.split(ROOT)[1]; const dir = path.dirname(rel.replace(/\//g, '\\')).replace(/\//g, '\\');
  const f = folders.get(dir) || { dir, quizzes: 0, examIds: new Map() };
  f.quizzes++; f.examIds.set(q.lc_exam_id, (f.examIds.get(q.lc_exam_id) || 0) + 1); folders.set(dir, f);
}
const byExam = new Map();
for (const f of folders.values()) for (const id of f.examIds.keys()) (byExam.get(id) || byExam.set(id, []).get(id)).push(f.dir);

const rows = [];
for (const f of folders.values()) {
  const chain = new Set([...f.dir.split('\\').flatMap((p) => [...toks(p)])]);
  for (const [examId, n] of f.examIds) {
    const e = exams.get(examId);
    if (!e) { rows.push({ dir: f.dir, exam: '(missing exam row)', body: '', n, score: 0, flags: ['NO_EXAM_ROW'] }); continue; }
    const nameT = toks(e.exam_name), bodyT = toks(e.conducting_body);
    const hit = (set) => [...set].filter((t) => chain.has(t)).length;
    const nameScore = nameT.size ? hit(nameT) / nameT.size : 1, bodyScore = bodyT.size ? hit(bodyT) / bodyT.size : 1;
    const flags = [];
    if (f.examIds.size > 1) flags.push('TWO_EXAMS_IN_ONE_FOLDER');
    if (byExam.get(examId).length > 1) flags.push(`EXAM_FROM_${byExam.get(examId).length}_FOLDERS`);
    if (bodyScore < 0.5 && bodyT.size) flags.push('BODY_NOT_IN_PATH');
    if (nameScore < 0.5 && nameT.size) flags.push('NAME_NOT_IN_PATH');
    rows.push({ dir: f.dir, exam: e.exam_name, body: e.conducting_body, examId, n, nameScore: +nameScore.toFixed(2), bodyScore: +bodyScore.toFixed(2), flags });
  }
}
const bad = rows.filter((r) => r.flags.length);
console.log(`folders ${folders.size} | quizzes with a CENTRAL source path ${[...folders.values()].reduce((a, f) => a + f.quizzes, 0)} of ${quizzes.length} | exam links ${rows.length}`);
console.log(`clean (path agrees with exam name+body, 1 folder <-> 1 exam): ${rows.length - bad.length}`);
console.log(`needs a look: ${bad.length}`);
const tally = {}; bad.forEach((r) => r.flags.forEach((f) => { const k = f.replace(/\d+/, 'N'); tally[k] = (tally[k] || 0) + 1; })); console.log(tally);
for (const r of bad.slice(0, 80)) console.log(`\n[${r.flags.join(',')}] ${r.dir}\n    -> ${r.exam} | ${r.body} (name ${r.nameScore} body ${r.bodyScore})`);
if (jsonOut) fs.writeFileSync(jsonOut, JSON.stringify(rows, null, 1));
