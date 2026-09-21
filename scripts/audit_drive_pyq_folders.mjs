#!/usr/bin/env node
/**
 * PYQ counterpart to audit_drive_intro_folders.mjs. An "exam folder" is any
 * directory with a sibling set of numbered content subfolders where at
 * least one matches /guide|precis|pyq|test series/i. The PYQ folder among
 * those numbered children is whichever matches /pyq/i (lowest-numbered if
 * more than one, same tie-break as the Intro script), else null.
 *
 * "Real" PYQ papers are counted by distinct paper stem (basename with
 * extension stripped, skipping Office lock files) so a docx+pdf pair for
 * the same paper counts once, matching how the Drive folders are actually
 * laid out (PAPER 1.docx + PAPER 1.pdf side by side).
 *
 * Usage: node scripts/audit_drive_pyq_folders.mjs "<absolute category root>"
 */
import fs from 'node:fs';
import path from 'node:path';

const root = process.argv[2];
if (!root) { console.error('usage: node audit_drive_pyq_folders.mjs <root>'); process.exit(1); }

function isNumberedFolder(name) {
  return /^\d+\.\s*/.test(name);
}

function walk(dir, results) {
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
  const dirs = entries.filter((e) => e.isDirectory());
  const numbered = dirs.filter((d) => isNumberedFolder(d.name));
  const hasContentSignature = numbered.some((d) => /guide|precis|pyq|test\s*series/i.test(d.name));

  if (hasContentSignature) {
    const pyqMatches = dirs.filter((d) => /pyq/i.test(d.name));
    const numOf = (name) => { const m = name.match(/^(\d+)\./); return m ? parseInt(m[1], 10) : Infinity; };
    const pyqDir = pyqMatches.length > 1
      ? pyqMatches.slice().sort((a, b) => numOf(a.name) - numOf(b.name))[0]
      : pyqMatches[0];

    if (pyqMatches.length > 1) {
      console.error(`  [WARN] multiple "pyq"-named folders in ${dir} -- picked "${pyqDir.name}", others: ${pyqMatches.filter((d) => d !== pyqDir).map((d) => d.name).join(', ')}`);
    }

    if (pyqDir) {
      const pyqPath = path.join(dir, pyqDir.name);
      let entries2 = [];
      try { entries2 = fs.readdirSync(pyqPath, { withFileTypes: true }); } catch {}
      const isRealFile = (f) => f.isFile() && !f.name.startsWith('~$') && /\.(docx|pdf)$/i.test(f.name);
      const stemOf = (name) => name.replace(/\.[^.]+$/, '').trim().toLowerCase();

      const directFiles = entries2.filter(isRealFile);
      let stems;
      if (directFiles.length > 0) {
        stems = new Set(directFiles.map((f) => stemOf(f.name)));
      } else {
        // Some exams (e.g. SSC JE) split PYQ papers by subject into one more
        // level of subfolders (Civil/Electrical/Mechanical) instead of dumping
        // files directly in the PYQ folder -- recurse one level and tag each
        // paper with its subject subfolder so counts stay accurate.
        stems = new Set();
        const subDirs = entries2.filter((e) => e.isDirectory());
        for (const sub of subDirs) {
          let subFiles = [];
          try { subFiles = fs.readdirSync(path.join(pyqPath, sub.name), { withFileTypes: true }); } catch {}
          for (const f of subFiles.filter(isRealFile)) stems.add(`${sub.name}/${stemOf(f.name)}`);
        }
      }

      results.push({
        examFolder: dir,
        pyqFolderName: pyqDir.name,
        pyqFolderPath: pyqPath,
        paperStems: [...stems],
        fileCount: stems.size,
      });
    } else {
      results.push({ examFolder: dir, pyqFolderName: null, paperStems: [], fileCount: 0, noPyqFolderAtAll: true });
    }
    return;
  }

  for (const e of dirs) {
    walk(path.join(dir, e.name), results);
  }
}

const results = [];
walk(root, results);

console.log(`Root: ${root}`);
console.log(`Found ${results.length} exam folders (content-signature match).\n`);

let withReal = 0, withoutReal = 0;
for (const r of results) {
  const rel = path.relative(root, r.examFolder);
  if (r.paperStems.length > 0) {
    withReal++;
    console.log(`[REAL]  ${rel}  ->  ${r.paperStems.length} paper(s)   (pyq folder: "${r.pyqFolderName}")`);
  } else {
    withoutReal++;
    console.log(`[none]  ${rel}  (pyq folder: "${r.pyqFolderName}")`);
  }
}
console.log(`\nSummary: ${withReal} with real PYQ content, ${withoutReal} without.`);
