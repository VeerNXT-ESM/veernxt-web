#!/usr/bin/env node
/**
 * Ingest mock-test docx -> quizzes + questions for ONE audited category, per
 * docs/MOCK_TESTS_PLAN.md (user policy C, 2026-09-25: ingest everything, MARK
 * flawed questions via questions.review_flags; never silently drop or "fix").
 * Exception: a paper that cannot be scored (source has no answer keys) or that
 * parsed to almost nothing is HELD for the content team, not ingested.
 *
 *  - title:   "<exams.exam_name> Mock Test NN"  (NN from the file's number, else order)
 *  - link:    lc_exam_id = exams.exam_id (audit match, or scripts/data/mock_exam_overrides.json)
 *  - idempotent on (lc_exam_id, title): an existing quiz has its questions REPLACED
 *  - backup:  affected quizzes + questions -> K:\tmp\db_backups\<ts>\ before any write
 *
 * Needs column questions.review_flags text[] (see SQL printed in --execute if missing).
 *
 * Usage: node scripts/ingest_mock_tests.mjs <audit json> <category root> [--only=<relPath prefix>] [--execute]
 */
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { docxText, parseMockText, gate, HARD_FLAGS } from './lib/mock_test_parser.mjs';

// Keep identical to BLOCKING_QUESTION_FLAGS in src/lib/quizQuality.js (HARD_FLAGS minus the explanation-only PLACEHOLDER_EXPLANATION).
const BLOCKING = HARD_FLAGS.filter((f) => f !== 'PLACEHOLDER_EXPLANATION');
const args = process.argv.slice(2);
const EXECUTE = args.includes('--execute');
const only = (args.find((a) => a.startsWith('--only=')) || '').slice(7);
const [jsonPath, root] = args.filter((a) => !a.startsWith('--'));
const catName = path.basename(root);
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const overrides = JSON.parse(fs.readFileSync(new URL('./data/mock_exam_overrides.json', import.meta.url), 'utf8'));

async function fetchAll(table, select) {
  let all = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase.from(table).select(select).range(from, from + 999);
    if (error) throw new Error(`${table}: ${error.message}`);
    all = all.concat(data); if (data.length < 1000) break;
  }
  return all;
}
const exams = new Map((await fetchAll('exams', 'exam_id, exam_name, conducting_body')).map((e) => [e.exam_id, e]));
// Generic exam names ("Constable", "Staff Nurse", ...) are shared by many exams: prefix the conducting body so titles stay unique.
const cleanName = (s) => (s || '').replace(/[\s.]+$/g, '').replace(/\s+/g, ' ').trim();
const nameCount = new Map(); for (const e of exams.values()) { const k = cleanName(e.exam_name).toLowerCase(); nameCount.set(k, (nameCount.get(k) || 0) + 1); }
const titleBase = (e) => (nameCount.get(cleanName(e.exam_name).toLowerCase()) > 1 && e.conducting_body && !cleanName(e.exam_name).toLowerCase().includes(e.conducting_body.toLowerCase()) ? `${e.conducting_body} ${cleanName(e.exam_name)}` : cleanName(e.exam_name));
const NO_REGRESS = args.includes('--no-regress'); // never replace an existing quiz with a parse that has FEWER playable questions
const existing = await fetchAll('quizzes', 'id, title, lc_exam_id, playable_questions');
const existingByKey = new Map(existing.map((q) => [`${q.lc_exam_id}|${q.title}`, q]));

const auditDir = path.dirname(jsonPath);
const claims = new Map();
for (const f of fs.readdirSync(auditDir).filter((x) => /^(CENTRAL|STATE|UT)_.*.json$/.test(x) && !/^STATE_01_/.test(x))) for (const r of JSON.parse(fs.readFileSync(path.join(auditDir, f), 'utf8'))) if (r.examId && r.realFiles > 0) claims.set(r.examId, (claims.get(r.examId) || 0) + 1);
const folders = JSON.parse(fs.readFileSync(jsonPath, 'utf8')).filter((r) => r.realFiles > 0 && r.mockFolder && (!only || r.relPath.startsWith(only)));
const plan = []; const held = []; const noExam = [];
for (const r of folders) {
  const overridden = overrides[`${catName}|${r.relPath}`];
  const examId = overridden || r.examId;
  if (!overridden && examId && claims.get(examId) > 1) { noExam.push(`${r.relPath} [exam claimed by ${claims.get(examId)} folders]`); continue; }
  const exam = examId && exams.get(examId);
  if (!exam) { noExam.push(r.relPath); continue; }
  const dir = path.join(root, r.relPath, r.mockFolder);
  const files = fs.readdirSync(dir).filter((f) => /\.docx$/i.test(f) && !f.startsWith('~$'));
  const numOf = (f) => { const m = f.replace(/\.[^.]+$/, '').match(/(\d+)(?!.*\d)/); return m ? parseInt(m[1], 10) : null; };
  files.sort((a, b) => (numOf(a) ?? 1e9) - (numOf(b) ?? 1e9) || a.localeCompare(b));
  const used = new Set();
  for (let i = 0; i < files.length; i++) {
    const f = files[i]; const full = path.join(dir, f);
    let n = numOf(f); if (n == null || used.has(n)) { n = 1; while (used.has(n)) n++; } used.add(n);
    let parsed, g;
    try { parsed = parseMockText(await docxText(full)); g = gate(parsed); } catch (e) { held.push({ relPath: r.relPath, file: f, exam, reason: `READ_ERROR ${e.message}` }); continue; }
    const title = `${titleBase(exam)} Mock Test ${String(n).padStart(2, '0')}`;
    const fatal = g.issues.find((x) => /^PARSED_TOO_FEW/.test(x)); // no-key papers are ingested (policy: ingest everything) and reported
    const item = { relPath: r.relPath, file: f, full, examId, exam, title, parsed, g, hash: crypto.createHash('md5').update(fs.readFileSync(full)).digest('hex').slice(0, 8) };
    if (fatal) { held.push({ ...item, reason: fatal }); continue; }
    const ex = existingByKey.get(`${examId}|${title}`) || null;
    const playableNew = parsed.questions.filter((q) => q.answer && !q.flags.some((f) => BLOCKING.includes(f))).length;
    const skipWrite = NO_REGRESS && ex && ex.playable_questions != null && playableNew < ex.playable_questions - 2; // keep the current data
    plan.push({ ...item, existing: ex, skipWrite, playableNew });
  }
}

const totalQ = plan.reduce((a, p) => a + p.g.total, 0);
const flagged = plan.reduce((a, p) => a + p.parsed.questions.filter((q) => q.flags.length && q.flags.some((x) => HARD_FLAGS.includes(x))).length, 0);
console.log(`Mode: ${EXECUTE ? 'EXECUTE' : 'DRY RUN'} | category ${catName}${only ? ' | only ' + only : ''}`);
console.log(`Folders with real mocks: ${folders.length} | no exam match: ${noExam.length} ${noExam.join('; ')}`);
console.log(`Papers to ingest: ${plan.length} (${plan.filter((p) => p.existing).length} replace existing, ${plan.filter((p) => !p.existing).length} new) | questions ${totalQ} | with review flags ${flagged}`);
console.log(`Papers HELD for content team (cannot be scored / near-empty): ${held.length}`);
const kept = plan.filter((p) => p.skipWrite);
if (NO_REGRESS) console.log(`--no-regress: ${kept.length} existing paper(s) KEEP their current data (new parse has fewer playable questions): ${kept.map((p) => `${p.title} ${p.existing.playable_questions}->${p.playableNew}`).slice(0, 6).join('; ')}${kept.length > 6 ? '…' : ''}`);
const perExam = {};
for (const p of plan) { const e = (perExam[p.exam.exam_name] ||= { papers: 0, q: 0, flagged: 0 }); e.papers++; e.q += p.g.total; e.flagged += p.parsed.questions.filter((q) => q.flags.some((x) => HARD_FLAGS.includes(x))).length; }
console.table(perExam);
for (const h of held) console.log(`  HELD ${h.exam.exam_name} / ${h.file}: ${h.reason}`);
const sample = plan[0]; if (sample) { const q = sample.parsed.questions[0]; console.log(`\nSample: "${sample.title}" Q1 -> ${JSON.stringify({ stem: q.stem.slice(0, 80), options: q.options, correct: q.answer, expl: (q.explanation || '').slice(0, 60), flags: q.flags })}`); }
const issues = { category: catName, papers: [], questions: [], held: held.map((h) => ({ exam: h.exam.exam_name, examId: h.examId, file: h.file, reason: h.reason })), noExam };
for (const p of plan) {
  const bad = p.parsed.questions.filter((q) => q.flags.length && q.flags.some((x) => HARD_FLAGS.includes(x)));
  const playable = p.parsed.questions.filter((q) => q.answer && !q.flags.some((f) => BLOCKING.includes(f))).length; // what students would see
  issues.papers.push({ exam: p.exam.exam_name, examId: p.examId, title: p.title, file: p.file, questions: p.g.total, playable, flagged: bad.length, tally: p.g.tally, paperIssues: p.g.issues });
  for (const q of bad) issues.questions.push({ exam: p.exam.exam_name, title: p.title, n: q.number, flags: q.flags.filter((x) => HARD_FLAGS.includes(x)), stem: (q.stem || '').slice(0, 220), options: q.options ? Object.values(q.options).map((v) => v.slice(0, 60)).join(' | ') : '', key: q.answer, explanation: (q.explanation || '').slice(0, 220) });
}
fs.writeFileSync(`K:/tmp/mock_audit/issues_${catName.replace(/[^A-Za-z0-9]/g, '_')}.json`, JSON.stringify(issues));
fs.mkdirSync('K:/tmp/mock_audit', { recursive: true });
fs.writeFileSync(`K:/tmp/mock_audit/ingest_plan_${catName.replace(/[^A-Za-z0-9]/g, '_')}.json`, JSON.stringify({ held: held.map((h) => ({ exam: h.exam.exam_name, file: h.file, reason: h.reason })), noExam, papers: plan.map((p) => ({ exam: p.exam.exam_name, title: p.title, file: p.file, questions: p.g.total, tally: p.g.tally, issues: p.g.issues, existing: !!p.existing })) }, null, 1));
if (!EXECUTE) { console.log('\nDry run only -- re-run with --execute.'); process.exit(0); }

// ---- execute ----
const probe = await supabase.from('questions').select('review_flags').limit(1);
if (probe.error) {
  console.error('\nSTOP: questions.review_flags is missing. Run this once in the Supabase SQL editor, then re-run:\n  ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS review_flags text[] NOT NULL DEFAULT \'{}\';');
  process.exit(2);
}
const stamp = new Date().toISOString().replace(/[:.]/g, '-'); const bdir = path.join('K:/tmp/db_backups', stamp); fs.mkdirSync(bdir, { recursive: true });
const touchedIds = plan.filter((p) => p.existing && !p.skipWrite).map((p) => p.existing.id);
// chunked: a single IN (...) list of hundreds of uuids exceeds the request URL limit
const bq = []; const bqz = [];
for (let i = 0; i < touchedIds.length; i += 40) {
  const ids = touchedIds.slice(i, i + 40);
  const a = await supabase.from('questions').select('*').in('quiz_id', ids); if (a.error) throw new Error(`backup questions: ${a.error.message}`); bq.push(...a.data);
  const b = await supabase.from('quizzes').select('*').in('id', ids); if (b.error) throw new Error(`backup quizzes: ${b.error.message}`); bqz.push(...b.data);
}
fs.writeFileSync(path.join(bdir, 'quizzes_replaced.json'), JSON.stringify(bqz)); fs.writeFileSync(path.join(bdir, 'questions_replaced.json'), JSON.stringify(bq));
console.log(`Backup: ${bdir} (${bqz.length} quizzes, ${bq.length} questions)`);

const created = [];
for (const p of plan) {
  if (p.skipWrite) continue; // --no-regress: keep the quiz as it is in the DB
  const modeSection = (() => { const c = {}; p.parsed.questions.forEach((q) => q.section && (c[q.section] = (c[q.section] || 0) + 1)); return Object.entries(c).sort((a, b) => b[1] - a[1])[0]?.[0] || 'General Studies'; })();
  const row = { title: p.title, description: null, subject: modeSection, category: 'Mock Test', source_file: p.full, total_questions: p.g.total, is_freemium: false, is_locked: true, unlock_cost: 0, file_hash: p.hash, exam_name: p.exam.exam_name, conducting_body: p.exam.conducting_body, lc_exam_id: p.examId };
  let quizId;
  if (p.existing) {
    quizId = p.existing.id;
    const { error: e1 } = await supabase.from('questions').delete().eq('quiz_id', quizId); if (e1) throw new Error(e1.message);
    const { error: e2 } = await supabase.from('quizzes').update(row).eq('id', quizId); if (e2) throw new Error(e2.message);
  } else {
    const { data, error } = await supabase.from('quizzes').insert(row).select('id').single(); if (error) throw new Error(error.message);
    quizId = data.id; created.push(quizId);
  }
  const qrows = p.parsed.questions.map((q) => ({ quiz_id: quizId, question_number: q.number, question_text: q.stem, options: q.options || {}, correct_answer: q.answer, explanation: q.explanation, review_flags: q.flags.filter((x) => x !== 'NO_EXPLANATION' || true) }));
  for (let i = 0; i < qrows.length; i += 400) { const { error } = await supabase.from('questions').insert(qrows.slice(i, i + 400)); if (error) throw new Error(`questions ${p.title}: ${error.message}`); }
  // Students only see questions without a blocking flag (src/lib/quizQuality.js); keep the count the Quiz Center filters on in sync.
  const playable = qrows.filter((r) => r.correct_answer && !r.review_flags.some((f) => BLOCKING.includes(f))).length;
  const { error: pe } = await supabase.from('quizzes').update({ playable_questions: playable }).eq('id', quizId); if (pe) throw new Error(`playable ${p.title}: ${pe.message}`);
}
fs.writeFileSync(path.join(bdir, 'created_quiz_ids.json'), JSON.stringify(created));
console.log(`Ingested ${plan.length} papers (${created.length} new, ${plan.length - created.length} replaced). Rollback ids: ${path.join(bdir, 'created_quiz_ids.json')}`);
