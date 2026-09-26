#!/usr/bin/env node
/**
 * Mock Test cleanup for CENTRAL (docs/Central_Mock_Tests_Audit.xlsx, sheet
 * "Existing quizzes to fix"), user-approved 2026-09-25:
 *   1. Duplicates: per (exam, paper) keep ONE quiz -- most real `questions`
 *      rows, ties -> earliest created -- and delete the other copies (+ their
 *      questions). `quizzes` has no status column, so removal is a delete;
 *      a full JSON backup is written first. A copy with quiz_attempts is
 *      never deleted (reported instead).
 *   2. Kept quizzes: title -> "<Exam Name> Mock Test NN" (no underscores),
 *      lc_exam_id -> matched exam. exam_name is left untouched (the app
 *      queries quizzes by exam_name).
 * "Section N" quizzes (exam unknown) are left alone.
 *
 * Usage: node scripts/dedupe_and_rename_mock_tests.mjs            (dry run)
 *        node scripts/dedupe_and_rename_mock_tests.mjs --execute
 */
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { createClient } from '@supabase/supabase-js';

const EXECUTE = process.argv.includes('--execute');
const XLSX_PATH = 'docs/Central_Mock_Tests_Audit.xlsx';
const xlsx = createRequire('K:/tmp/xlsx_tool/')('xlsx');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function fetchAll(table, select, filter) {
  let all = [];
  for (let from = 0; ; from += 1000) {
    let q = supabase.from(table).select(select).range(from, from + 999);
    if (filter) q = filter(q);
    const { data, error } = await q;
    if (error) throw new Error(`${table}: ${error.message}`);
    all = all.concat(data);
    if (data.length < 1000) break;
  }
  return all;
}
const chunk = (a, n) => Array.from({ length: Math.ceil(a.length / n) }, (_, i) => a.slice(i * n, i * n + n));

const plan = xlsx.utils.sheet_to_json(xlsx.readFile(XLSX_PATH).Sheets['Existing quizzes to fix']).filter((r) => r['Proposed title'] && r['Exam ID to link']);
const quizzes = await fetchAll('quizzes', '*');
const byId = new Map(quizzes.map((q) => [q.id, q]));
const questions = await fetchAll('questions', 'id, quiz_id');
const qCount = new Map(); questions.forEach((q) => qCount.set(q.quiz_id, (qCount.get(q.quiz_id) || 0) + 1));
const attempts = await fetchAll('quiz_attempts', 'quiz_id');
const attemptCount = new Map(); attempts.forEach((a) => attemptCount.set(a.quiz_id, (attemptCount.get(a.quiz_id) || 0) + 1));

// Group plan rows by (exam id, proposed title) -> one paper.
const groups = new Map();
for (const r of plan) {
  const q = byId.get(r['Quiz ID']); if (!q) continue;
  const key = `${r['Exam ID to link']}||${r['Proposed title']}`;
  (groups.get(key) || groups.set(key, []).get(key)).push(q);
}

const keeps = []; const deletes = []; const blocked = [];
for (const [key, list] of groups) {
  const sorted = list.slice().sort((a, b) => (qCount.get(b.id) || 0) - (qCount.get(a.id) || 0) || String(a.created_at).localeCompare(String(b.created_at)));
  const [examId, title] = key.split('||');
  keeps.push({ quiz: sorted[0], examId, title });
  for (const dup of sorted.slice(1)) {
    if (attemptCount.get(dup.id)) blocked.push({ dup, keep: sorted[0], attempts: attemptCount.get(dup.id) });
    else deletes.push(dup);
  }
}
const renames = keeps.filter((k) => k.quiz.title !== k.title || k.quiz.lc_exam_id !== k.examId);
const delQ = deletes.reduce((n, q) => n + (qCount.get(q.id) || 0), 0);

console.log(`Mode: ${EXECUTE ? 'EXECUTE' : 'DRY RUN'}`);
console.log(`Plan rows: ${plan.length} | papers (groups): ${groups.size}`);
console.log(`KEEP+rename/link: ${renames.length} of ${keeps.length} kept quizzes`);
console.log(`DELETE duplicates: ${deletes.length} quizzes (${delQ} questions)`);
console.log(`BLOCKED (dup has quiz_attempts, not deleted): ${blocked.length}`);
const short = keeps.filter((k) => (qCount.get(k.quiz.id) || 0) < 90);
console.log(`Kept quizzes with <90 real questions: ${short.length}`, short.slice(0, 5).map((k) => `${k.title}=${qCount.get(k.quiz.id) || 0}`));
console.log('Sample renames:'); renames.slice(0, 6).forEach((k) => console.log(`  ${k.quiz.title}  ->  ${k.title}  [${qCount.get(k.quiz.id) || 0}q]`));
console.log('Kept per exam:', Object.entries(keeps.reduce((m, k) => (m[k.quiz.exam_name] = (m[k.quiz.exam_name] || 0) + 1, m), {})));
const after = quizzes.length - deletes.length;
console.log(`quizzes rows: ${quizzes.length} -> ${after}`);

if (!EXECUTE) { console.log('\nDry run only -- re-run with --execute.'); process.exit(0); }

// Backup everything we might touch (all quizzes + their questions) before writing.
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const dir = path.join('K:/tmp/db_backups', stamp); fs.mkdirSync(dir, { recursive: true });
const allQuestions = await fetchAll('questions', '*');
fs.writeFileSync(path.join(dir, 'quizzes.json'), JSON.stringify(quizzes));
fs.writeFileSync(path.join(dir, 'questions.json'), JSON.stringify(allQuestions));
fs.writeFileSync(path.join(dir, 'mock_cleanup_plan.json'), JSON.stringify({ deletes: deletes.map((q) => q.id), renames: renames.map((k) => ({ id: k.quiz.id, oldTitle: k.quiz.title, oldLcExamId: k.quiz.lc_exam_id })) }));
console.log(`Backup written: ${dir}`);

let renamed = 0;
for (const k of renames) {
  const { error } = await supabase.from('quizzes').update({ title: k.title, lc_exam_id: k.examId }).eq('id', k.quiz.id);
  if (error) throw new Error(`rename ${k.quiz.id}: ${error.message}`);
  renamed++;
}
console.log(`Renamed/linked ${renamed}`);
let removed = 0;
for (const ids of chunk(deletes.map((q) => q.id), 50)) {
  const { error: e1 } = await supabase.from('questions').delete().in('quiz_id', ids);
  if (e1) throw new Error(`delete questions: ${e1.message}`);
  const { error: e2 } = await supabase.from('quizzes').delete().in('id', ids);
  if (e2) throw new Error(`delete quizzes: ${e2.message}`);
  removed += ids.length;
}
console.log(`Deleted ${removed} duplicate quizzes.`);
