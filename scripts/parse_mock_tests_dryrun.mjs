#!/usr/bin/env node
/**
 * READ-ONLY dry run: parse every mock-test docx under one or more exam folders
 * and print the G3 quality report per paper (docs/MOCK_TESTS_PLAN.md).
 * Usage: node scripts/parse_mock_tests_dryrun.mjs <mock folder> [<mock folder> ...] [--json=out.json]
 */
import fs from 'node:fs';
import path from 'node:path';
import { docxText, parseMockText, gate } from './lib/mock_test_parser.mjs';

const args = process.argv.slice(2);
const jsonOut = (args.find((a) => a.startsWith('--json=')) || '').slice(7);
const folders = args.filter((a) => !a.startsWith('--'));
const report = [];
for (const folder of folders) {
  const files = fs.readdirSync(folder).filter((f) => /\.docx$/i.test(f) && !f.startsWith('~$')).sort();
  for (const f of files) {
    const parsed = parseMockText(await docxText(path.join(folder, f)));
    const g = gate(parsed);
    report.push({ folder, file: f, ...g, sample: parsed.questions.slice(0, 1) });
    console.log(`${g.pass ? 'PASS' : 'FAIL'}  ${path.basename(path.dirname(folder))}/${f}  q=${g.total}/${g.declared ?? '?'}  hardFail=${g.hardFailQuestions}  ${JSON.stringify(g.tally)} ${g.issues.join(' | ')}`);
  }
}
const pass = report.filter((r) => r.pass).length;
console.log(`\n${pass}/${report.length} papers pass G3`);
if (jsonOut) fs.writeFileSync(jsonOut, JSON.stringify(report, null, 2));
