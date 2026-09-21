#!/usr/bin/env node
/**
 * Discovery v3: an "exam folder" is any directory that has a sibling set
 * of numbered content subfolders where at least one matches
 * /guide|precis|pyq|test series/i (a distinctive signature no category/
 * sub-body folder ever has). The intro folder among those numbered
 * children is whichever matches /intro/i, else falls back to the "1."
 * one (handles typos like "1. INTODUCTION").
 *
 * Usage: node discover_intro_folders.mjs "<absolute root path>"
 */
import fs from 'node:fs';
import path from 'node:path';

const root = process.argv[2];
if (!root) { console.error('usage: node discover_intro_folders.mjs <root>'); process.exit(1); }

function isNumberedFolder(name) {
  return /^\d+\.\s*/.test(name);
}

function walk(dir, results) {
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
  const dirs = entries.filter((e) => e.isDirectory());
  const numbered = dirs.filter((d) => isNumberedFolder(d.name));
  const hasContentSignature = numbered.some((d) => /guide|precis|pyq|test\s*series/i.test(d.name));
  // fs.readdirSync order isn't guaranteed alphabetical (especially over a
  // mounted Drive filesystem) -- when multiple folders match /intro/i
  // (a real content-team duplication/misfiling, seen live: a stray
  // "5. INTRODUCTION" folder full of mock-test docx alongside the real
  // "1. INTRODUCTION"), always prefer the lowest-numbered one rather than
  // whichever the filesystem happens to list first.
  const introMatches = dirs.filter((d) => /intro/i.test(d.name));
  const numOf = (name) => { const m = name.match(/^(\d+)\./); return m ? parseInt(m[1], 10) : Infinity; };
  const directIntroMatch = introMatches.length > 1
    ? introMatches.slice().sort((a, b) => numOf(a.name) - numOf(b.name))[0]
    : introMatches[0];

  if (directIntroMatch || hasContentSignature) {
    let introDir = directIntroMatch || numbered.find((d) => /^1\./.test(d.name)) || null;
    if (introMatches.length > 1) {
      console.error(`  [WARN] multiple "intro"-named folders in ${dir} -- picked "${introDir.name}", others: ${introMatches.filter((d) => d !== introDir).map((d) => d.name).join(', ')}`);
    }
    if (introDir) {
      const introPath = path.join(dir, introDir.name);
      let files = [];
      try { files = fs.readdirSync(introPath, { withFileTypes: true }); } catch {}
      const docx = files.filter((f) => f.isFile() && /\.docx$/i.test(f.name) && !f.name.startsWith('~$') && !/_PENDING_CONTENT/i.test(f.name));
      const allDocx = files.filter((f) => f.isFile() && /\.docx$/i.test(f.name));
      results.push({
        examFolder: dir,
        introFolderName: introDir.name,
        introFolderPath: introPath,
        realDocx: docx.map((f) => f.name),
        allDocxCount: allDocx.length,
      });
    } else {
      results.push({ examFolder: dir, introFolderName: null, realDocx: [], allDocxCount: 0, noIntroFolderAtAll: true });
    }
    return; // exam folders don't nest further exam folders
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
  if (r.realDocx.length > 0) {
    withReal++;
    console.log(`[REAL]  ${rel}  ->  ${r.realDocx.join(' | ')}   (intro folder: "${r.introFolderName}")`);
  } else {
    withoutReal++;
    console.log(`[none]  ${rel}  (${r.allDocxCount} docx, intro folder: "${r.introFolderName}")`);
  }
}
console.log(`\nSummary: ${withReal} with real content, ${withoutReal} without.`);
