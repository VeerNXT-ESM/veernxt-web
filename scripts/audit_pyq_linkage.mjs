#!/usr/bin/env node
/**
 * Drive-vs-DB PYQ audit, one category at a time (docs/status_report.md
 * §57.3). Combines audit_drive_pyq_folders.mjs's Drive discovery with a
 * DB-side check against `pyq_papers` (the confirmed candidate-facing table
 * per PyqReader.jsx/PyqCenter.jsx -- see status_report.md §57.1/§58).
 *
 * Matching is deliberately conservative: an `exams` row is resolved by
 * normalized (lowercased, punctuation-stripped) equality against the Drive
 * exam-folder label, scoped to a career_track filter -- never fuzzy across
 * career tracks. A `pyq_papers` row counts as belonging to that exam only
 * if its own normalized `exam_name` *starts with* the resolved exam's
 * normalized `exam_name` (the real ingestion pattern: "<exam name> 10
 * YEARS PYQ PAPER N"), so a paper whose exam_name merely *contains* an
 * unrelated keyword doesn't get miscounted.
 *
 * Usage: node scripts/audit_pyq_linkage.mjs "<drive category root>" <career_track>
 *   e.g. node scripts/audit_pyq_linkage.mjs "K:\...\CENTRAL EXAMS\01.SSC" SSC
 */
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

const [root, careerTrackHint] = process.argv.slice(2);
if (!root) {
  console.error('usage: node audit_pyq_linkage.mjs "<drive category root>" [career_track hint]');
  process.exit(1);
}

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function fetchAll(table, select) {
  let all = []; let from = 0; const pageSize = 1000;
  while (true) {
    const { data, error } = await supabase.from(table).select(select).range(from, from + pageSize - 1);
    if (error) throw error;
    all = all.concat(data || []);
    if (!data || data.length < pageSize) break;
    from += pageSize;
  }
  return all;
}

function normalize(s) {
  return (s || '').toLowerCase().replace(/^\d+\.\s*/, '').replace(/[^a-z0-9]+/g, ' ').trim();
}

// --- Drive discovery (same logic as audit_drive_pyq_folders.mjs) ---
function isNumberedFolder(name) { return /^\d+\.\s*/.test(name); }

function walk(dir, results) {
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
  const dirs = entries.filter((e) => e.isDirectory());
  const numbered = dirs.filter((d) => isNumberedFolder(d.name));
  const hasContentSignature = numbered.some((d) => /guide|precis|pyq|test\s*series/i.test(d.name));

  if (hasContentSignature) {
    const pyqMatches = dirs.filter((d) => /pyq/i.test(d.name));
    const numOf = (name) => { const m = name.match(/^(\d+)\./); return m ? parseInt(m[1], 10) : Infinity; };
    const pyqDir = pyqMatches.length > 1 ? pyqMatches.slice().sort((a, b) => numOf(a.name) - numOf(b.name))[0] : pyqMatches[0];

    let paperStems = [];
    if (pyqDir) {
      const pyqPath = path.join(dir, pyqDir.name);
      let entries2 = [];
      try { entries2 = fs.readdirSync(pyqPath, { withFileTypes: true }); } catch {}
      const isRealFile = (f) => f.isFile() && !f.name.startsWith('~$') && /\.(docx|pdf)$/i.test(f.name);
      const stemOf = (name) => name.replace(/\.[^.]+$/, '').trim().toLowerCase();
      const directFiles = entries2.filter(isRealFile);
      const stems = new Set();
      if (directFiles.length > 0) {
        directFiles.forEach((f) => stems.add(stemOf(f.name)));
      } else {
        for (const sub of entries2.filter((e) => e.isDirectory())) {
          let subFiles = [];
          try { subFiles = fs.readdirSync(path.join(pyqPath, sub.name), { withFileTypes: true }); } catch {}
          subFiles.filter(isRealFile).forEach((f) => stems.add(`${sub.name}/${stemOf(f.name)}`));
        }
      }
      paperStems = [...stems];
    }
    results.push({ examFolder: dir, relPath: path.relative(root, dir), examLabel: path.basename(dir).replace(/^\d+\.\s*/, ''), pyqFolderName: pyqDir?.name || null, paperStems });
    return;
  }
  for (const e of dirs) walk(path.join(dir, e.name), results);
}

const driveResults = [];
walk(root, driveResults);

// --- DB side ---
// career_track in this DB is too fragmented/overlapping to use as a hard
// scope filter (a single Drive category like "TEACHING" spans TEACHING,
// TEACHER RECRUITMENT, TEACHER ELIGIBILITY, EDUCATION SERVICES, etc. as
// separate career_track values) -- match by name across the WHOLE exams
// table instead, and only use the hint to break ties if a normalized name
// collides across more than one career_track (rare -- exam names/conducting
// bodies are specific enough on their own).
const exams = await fetchAll('exams', 'exam_id, exam_name, career_track, conducting_body');
function indexBy(keyFn) {
  const map = new Map();
  for (const e of exams) {
    const key = keyFn(e);
    if (!key) continue;
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(e);
  }
  const resolved = new Map();
  for (const [key, list] of map) {
    if (list.length === 1) { resolved.set(key, list[0]); continue; }
    const hinted = careerTrackHint ? list.find((e) => (e.career_track || '').toUpperCase() === careerTrackHint.toUpperCase()) : null;
    resolved.set(key, hinted || list[0]);
  }
  return resolved;
}
const examByNorm = indexBy((e) => normalize(e.exam_name));
// Some categories (e.g. BANKING) carry the real exam identity in
// conducting_body + a short generic exam_name ("BSCB" + "Manager"), not a
// self-contained exam_name the way SSC/DEFENCE do -- index that combo too
// so exam resolution doesn't silently fail for those rows.
const examByCombo = indexBy((e) => normalize(`${e.conducting_body || ''} ${e.exam_name || ''}`));

const papers = await fetchAll('pyq_papers', 'id, title, exam_name, subject, total_questions, lc_exam_id');

console.log(`Root: ${root}  |  career_track hint: ${careerTrackHint || '(none)'}`);
console.log(`Drive exam folders: ${driveResults.length}  |  exams rows (all tracks): ${exams.length}  |  pyq_papers total: ${papers.length}\n`);

const rows = [];
for (const d of driveResults) {
  const norm = normalize(d.examLabel);
  const exam = examByNorm.get(norm) || examByCombo.get(norm);
  const driveCount = d.paperStems.length;

  // Papers are matched against the DRIVE label by prefix, not the resolved
  // exams row -- confirmed live (§SSC pilot) that ingestion wrote
  // pyq_papers.exam_name from the Drive folder label itself ("<drive
  // label> 10 YEARS PYQ PAPER N"), so this still finds real papers even
  // when the exams-row resolution above fails (e.g. BANKING's generic
  // exam_name values).
  const dbRows = norm.length > 0 ? papers.filter((p) => normalize(p.exam_name).startsWith(norm)) : [];
  const dbCount = dbRows.length;

  let status;
  if (driveCount === 0) status = 'NO_DRIVE_CONTENT';
  else if (dbCount === 0) status = 'MISSING';
  else if (dbCount < driveCount) status = 'PARTIAL';
  else status = 'OK';
  if (!exam) status += '+NO_EXAM_MATCH';

  rows.push({ examLabel: d.examLabel, relPath: d.relPath, exam, driveCount, dbCount, dbRows, status, pyqFolderName: d.pyqFolderName, norm });
}

// A generic post name (e.g. "TGT (Trained Graduate Teacher)") repeated
// across multiple different Drive folders (different states/institutions)
// is a real risk: pyq_papers.exam_name is just as generic, so the same
// papers can get double-counted as "belonging" to every state that uses
// that label -- flag it rather than silently trusting the count.
const labelCounts = new Map();
for (const r of rows) labelCounts.set(r.norm, (labelCounts.get(r.norm) || 0) + 1);

for (const r of rows) {
  const ambiguous = labelCounts.get(r.norm) > 1 ? '  [AMBIGUOUS_LABEL x' + labelCounts.get(r.norm) + ']' : '';
  console.log(`[${r.status}]  ${r.relPath}  drive=${r.driveCount}  db=${r.dbCount}${ambiguous}`);
}

console.log('\n=== Summary ===');
const byStatus = {};
for (const r of rows) byStatus[r.status] = (byStatus[r.status] || 0) + 1;
for (const [k, v] of Object.entries(byStatus)) console.log(`  ${k}: ${v}`);
