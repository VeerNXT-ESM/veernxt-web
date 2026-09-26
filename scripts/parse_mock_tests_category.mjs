#!/usr/bin/env node
/**
 * READ-ONLY. Runs the G3 parse+gate over every exam folder of one audited
 * category (uses the audit JSON) and prints a per-exam table of clean vs
 * flagged questions. Nothing is written to the DB.
 * Usage: node scripts/parse_mock_tests_category.mjs <audit json> <category root> [--out=report.json]
 */
import fs from 'node:fs';
import path from 'node:path';
import { docxText, parseMockText, gate } from './lib/mock_test_parser.mjs';

const args = process.argv.slice(2);
const [jsonPath, root] = args.filter((a) => !a.startsWith('--'));
const outPath = (args.find((a) => a.startsWith('--out=')) || '').slice(6);
import { HARD_FLAGS as HARD } from './lib/mock_test_parser.mjs';
const rows = JSON.parse(fs.readFileSync(jsonPath, 'utf8')).filter((r) => r.realFiles > 0 && r.mockFolder);
const out = [];
console.log('exam folder | papers | questions | clean | flagged | clean% | papers with 100% clean');
for (const r of rows) {
  const dir = path.join(root, r.relPath, r.mockFolder);
  const files = fs.readdirSync(dir).filter((f) => /\.docx$/i.test(f) && !f.startsWith('~$')).sort();
  let tq = 0, clean = 0, perfect = 0; const tally = {}; const papers = [];
  for (const f of files) {
    const p = parseMockText(await docxText(path.join(dir, f)));
    const g = gate(p);
    const c = p.questions.filter((q) => !q.flags.some((x) => HARD.includes(x))).length;
    tq += g.total; clean += c; if (c === g.total && g.total >= 90 && !g.issues.length) perfect++;
    for (const [k, v] of Object.entries(g.tally)) tally[k] = (tally[k] || 0) + v;
    papers.push({ file: f, parsed: g.total, declared: g.declared, clean: c, issues: g.issues, tally: g.tally });
  }
  const sizes = papers.map((p) => p.parsed).sort((a, b) => a - b); const median = sizes[Math.floor(sizes.length / 2)] || 0;
  for (const p of papers) if (p.declared ? p.parsed < p.declared * 0.9 : p.parsed < median * 0.8) p.issues.push(`SHORT_PAPER (${p.parsed} vs ${p.declared || 'folder median ' + median})`);
  console.log(`${r.relPath} | ${files.length} | ${tq} | ${clean} | ${tq - clean} | ${tq ? Math.round((100 * clean) / tq) : 0}% | ${perfect}/${files.length}`);
  out.push({ relPath: r.relPath, examName: r.examName, examId: r.examId, papers: files.length, questions: tq, clean, perfect, tally, paperDetail: papers });
}
const T = out.reduce((a, o) => ({ q: a.q + o.questions, c: a.c + o.clean, p: a.p + o.perfect, n: a.n + o.papers }), { q: 0, c: 0, p: 0, n: 0 });
console.log(`\nTOTAL papers ${T.n}, questions ${T.q}, clean ${T.c} (${Math.round((100 * T.c) / T.q)}%), fully-clean papers ${T.p}`);
if (outPath) fs.writeFileSync(outPath, JSON.stringify(out, null, 2));
