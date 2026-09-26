#!/usr/bin/env node
/**
 * Drive-vs-DB Mock Test (Quiz Center) audit, one category folder at a time.
 * Same method as audit_pyq_linkage.mjs. READ-ONLY.
 *
 * Drive side: an "exam folder" is a dir with numbered content subfolders,
 * one of which matches /guide|precis|pyq|test series/. Its mock-test folder
 * is the numbered child matching /mock|test.?series/ (lowest number wins).
 * Files are docx/doc, deduped by stem, one subfolder level allowed. A file
 * under PLACEHOLDER_BYTES is flagged as a likely placeholder (real mock
 * test docx are ~90 KB+).
 *
 * DB side: `quizzes` (category 'Mock Test'). A quiz belongs to an exam if it
 * has lc_exam_id = exam id, or its normalized exam_name equals the Drive
 * label. Naming rule: no underscores in titles.
 *
 * Usage: node scripts/audit_mock_test_linkage.mjs "<category root>" [--json=<out.json>]
 */
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

const args = process.argv.slice(2);
const root = args.find((a) => !a.startsWith('--'));
const jsonOut = (args.find((a) => a.startsWith('--json=')) || '').slice(7);
if (!root) { console.error('usage: node audit_mock_test_linkage.mjs "<category root>" [--json=out.json]'); process.exit(1); }

const PLACEHOLDER_BYTES = 20 * 1024;
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function fetchAll(table, select) {
  let all = []; let from = 0;
  for (;;) {
    const { data, error } = await supabase.from(table).select(select).range(from, from + 999);
    if (error) throw error;
    all = all.concat(data || []);
    if (!data || data.length < 1000) break;
    from += 1000;
  }
  return all;
}
const normalize = (s) => (s || '').toLowerCase().replace(/^\d+(\s*\(\d+\))?\.\s*/, '').replace(/[^a-z0-9]+/g, ' ').trim();
const STOP = new Set(['of', 'the', 'and', 'for', 'in', 'a', 'an', 'recruitment']);
const toks = (s) => new Set(normalize(s).split(' ').filter((t) => t && !STOP.has(t) && !/^\d+$/.test(t)));
const subset = (a, b) => a.size > 0 && [...a].every((t) => b.has(t));
const numOf = (n) => { const m = n.match(/^(\d+)\./); return m ? parseInt(m[1], 10) : Infinity; };
const isNumbered = (n) => /^\d+\.?\s*/.test(n);
const isMockName = (n) => /mock|test[\s_.-]*series/i.test(n);
const isDoc = (f) => f.isFile() && /\.(docx|doc)$/i.test(f.name) && !f.name.startsWith('~$');

function listMockFiles(dir) {
  const out = [];
  const seen = new Set();
  const add = (full, name) => {
    const stem = name.replace(/\.[^.]+$/, '').trim().toLowerCase();
    if (seen.has(stem)) return; seen.add(stem);
    let size = 0; try { size = fs.statSync(full).size; } catch {}
    out.push({ name, size });
  };
  let ents = []; try { ents = fs.readdirSync(dir, { withFileTypes: true }); } catch {}
  ents.filter(isDoc).forEach((f) => add(path.join(dir, f.name), f.name));
  for (const sub of ents.filter((e) => e.isDirectory())) {
    let se = []; try { se = fs.readdirSync(path.join(dir, sub.name), { withFileTypes: true }); } catch {}
    se.filter(isDoc).forEach((f) => add(path.join(dir, sub.name, f.name), `${sub.name}/${f.name}`));
  }
  return out;
}

function walk(dir, results) {
  let ents; try { ents = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
  const dirs = ents.filter((e) => e.isDirectory());
  const numbered = dirs.filter((d) => isNumbered(d.name));
  if (numbered.some((d) => /guide|precis|pyq|test[\s_.-]*series|mock/i.test(d.name))) {
    const mocks = dirs.filter((d) => isNumbered(d.name) && isMockName(d.name)).sort((a, b) => numOf(a.name) - numOf(b.name));
    const mockDir = mocks[0];
    const files = mockDir ? listMockFiles(path.join(dir, mockDir.name)) : [];
    results.push({ ancestors: path.relative(root, dir).split(path.sep).slice(0, -1).reverse(), relPath: path.relative(root, dir), label: path.basename(dir).replace(/^\d+\.\s*/, ''), mockFolder: mockDir?.name || null, files });
    return;
  }
  for (const d of dirs) walk(path.join(dir, d.name), results);
}
const drive = []; walk(root, drive);

const examsAll = await fetchAll('exams', 'exam_id, exam_name, conducting_body, career_track, state_ut');
// STATE/UT roots: only exams whose state_ut equals the root's state/UT can match (generic names such as
// "Constable Recruitment" or "MPSC ..." exist in many states and must never match across states).
const compact = (x) => String(x || '').toLowerCase().replace(/&/g, ' and ').split(' and ').join('').replace(/[^a-z0-9]/g, '');
const inRegionTree = root.toUpperCase().includes('STATE EXAMS') || root.toUpperCase().includes('UT EXAMS');
const regionName = inRegionTree ? path.basename(root).replace(/^[0-9]+[.] */, '') : null;
const exams = regionName ? examsAll.filter((e) => compact(e.state_ut) === compact(regionName)) : examsAll;
if (regionName) console.log(`Region scope: "${regionName}" -> ${exams.length} exams`);
const quizzes = await fetchAll('quizzes', 'id, title, exam_name, total_questions, lc_exam_id');
const index = (keyFn) => { const m = new Map(); for (const e of exams) { const k = keyFn(e); if (!k) continue; (m.get(k) || m.set(k, []).get(k)).push(e); } return m; };
const byName = index((e) => normalize(e.exam_name));
const byCombo = index((e) => normalize(`${e.conducting_body || ''} ${e.exam_name || ''}`));

const examToks = exams.map((e) => ({ e, name: toks(e.exam_name), body: toks(e.conducting_body) }));
function resolveExam(d) {
  const norm = normalize(d.label);
  const exact = byName.get(norm) || byCombo.get(norm) || [];
  if (exact.length === 1) return { exam: exact[0], how: 'exact' };
  // Token match against the label plus up to 3 ancestor folders (body/state + post).
  for (let depth = 0; depth <= 3; depth++) {
    const chain = new Set([...toks(d.label), ...d.ancestors.slice(0, depth).flatMap((a) => [...toks(a)])]);
    let best = []; let bestScore = 0;
    for (const x of examToks) {
      if (!subset(x.name, chain)) continue;
      if (x.body.size && !subset(x.body, chain)) continue;
      const score = x.name.size + x.body.size;
      if (score > bestScore) { best = [x]; bestScore = score; } else if (score === bestScore) best.push(x);
    }
    if (best.length === 1 && bestScore > 0) return { exam: best[0].e, how: `tokens+${depth}anc` };
  }
  return { exam: null, how: exact.length > 1 ? 'ambiguous' : 'none' };
}
const labelCount = new Map(); drive.forEach((d) => labelCount.set(normalize(d.label), (labelCount.get(normalize(d.label)) || 0) + 1));

const rows = drive.map((d) => {
  const norm = normalize(d.label);
  const { exam, how } = resolveExam(d);
  const real = d.files.filter((f) => f.size >= PLACEHOLDER_BYTES);
  const tiny = d.files.length - real.length;
  // A quiz counts for this folder if linked by id, or its exam_name equals the label AND that
  // label is unique across Drive (generic names like "Stenographer" are not trusted).
  const qs = quizzes.filter((q) => (exam && q.lc_exam_id === exam.exam_id) || (labelCount.get(norm) === 1 && toks(d.label).size >= 2 && normalize(q.exam_name) === norm));
  const badNames = qs.filter((q) => /_/.test(q.title || ''));
  let status;
  if (d.files.length === 0) status = 'NO_MOCKS_ON_DRIVE';
  else if (real.length === 0) status = 'PLACEHOLDERS_ONLY';
  else if (qs.length === 0) status = 'NOT_IN_DB';
  else if (qs.length < real.length) status = 'PARTIAL';
  else status = 'OK';
  const flags = [];
  if (!exam) flags.push(how === 'ambiguous' ? 'AMBIGUOUS_EXAM' : 'NO_EXAM_MATCH');
  if (qs.length && qs.some((q) => !q.lc_exam_id)) flags.push('QUIZ_UNLINKED');
  if (badNames.length) flags.push(`UNDERSCORE_TITLES x${badNames.length}`);
  if (/_|\(\d+\)/.test(d.relPath)) flags.push('DRIVE_NAME_DIRTY');
  return { relPath: d.relPath, label: d.label, mockFolder: d.mockFolder, driveFiles: d.files.length, realFiles: real.length, tinyFiles: tiny, examId: exam?.exam_id || null, examName: exam?.exam_name || null, conductingBody: exam?.conducting_body || null, matchHow: how, dbQuizzes: qs.length, quizTitles: qs.map((q) => q.title), status, flags };
});

console.log(`Root: ${root}\nDrive exam folders: ${rows.length} | exams rows: ${exams.length} | quizzes: ${quizzes.length}\n`);
for (const r of rows) console.log(`[${r.status}] ${r.relPath} | drive=${r.driveFiles} real=${r.realFiles} tiny=${r.tinyFiles} db=${r.dbQuizzes} ${r.flags.join(' ')}${r.mockFolder ? '' : ' (no mock folder)'}`);
const by = {}; rows.forEach((r) => { by[r.status] = (by[r.status] || 0) + 1; });
console.log('\n=== Summary ===', by);
console.log('No exam match:', rows.filter((r) => !r.examId).length);
if (jsonOut) { fs.writeFileSync(jsonOut, JSON.stringify(rows, null, 2)); console.log('wrote', jsonOut); }
