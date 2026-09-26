#!/usr/bin/env node
/**
 * Content-team hit list for Mock Tests: builds an .xlsx from the issues_*.json
 * files written by ingest_mock_tests.mjs plus the audit JSONs (READ-ONLY).
 *
 * Sheets: Summary by exam | Quizzes with issues (worst first) | Flagged questions |
 *         Held / unreadable papers | Folders not ingested (no exam match) | Exams with no mock tests
 *
 * Usage: node scripts/export_mock_test_issues.mjs <mock_audit dir> <out.xlsx> <prefix e.g. CENTRAL>
 * Needs `xlsx` from K:\tmp\xlsx_tool.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const [dir, out, prefix = 'CENTRAL'] = process.argv.slice(2);
if (!dir || !out) { console.error('usage: node export_mock_test_issues.mjs <dir> <out.xlsx> [prefix]'); process.exit(1); }
const xlsx = createRequire('K:/tmp/xlsx_tool/')('xlsx');

const issues = fs.readdirSync(dir).filter((f) => /^issues_.*\.json$/.test(f)).sort().map((f) => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')));
const audits = fs.readdirSync(dir).filter((f) => new RegExp(`^${prefix}_.*\\.json$`).test(f)).sort().flatMap((f) => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')).map((r) => ({ category: f.replace(`${prefix}_`, '').replace('.json', '').replace(/_/g, ' ').trim(), ...r })));

const papers = issues.flatMap((i) => i.papers.map((p) => ({ category: i.category, ...p })));
const questions = issues.flatMap((i) => i.questions.map((q) => ({ category: i.category, ...q })));
const held = issues.flatMap((i) => i.held.map((h) => ({ category: i.category, ...h })));
const noExam = issues.flatMap((i) => i.noExam.map((n) => ({ category: i.category, folder: n })));

const topFlags = (t) => Object.entries(t).filter(([k]) => k !== 'NO_EXPLANATION').sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} x${v}`).join('; ');
const quizRows = papers.map((p) => ({ Category: p.category, Exam: p.exam, 'Quiz title': p.title, 'Source file': p.file, Questions: p.questions, 'Flagged questions': p.flagged, '% flagged': p.questions ? Math.round((100 * p.flagged) / p.questions) : 0, 'Main problems': topFlags(p.tally), 'Paper-level problems': p.paperIssues.join(' | '), 'Exam ID': p.examId }));
const worst = quizRows.filter((r) => r['Flagged questions'] > 0 || r['Paper-level problems']).sort((a, b) => b['% flagged'] - a['% flagged'] || b['Flagged questions'] - a['Flagged questions']);

const byExam = new Map();
for (const p of papers) { const e = byExam.get(p.examId) || { Category: p.category, Exam: p.exam, Quizzes: 0, Questions: 0, Flagged: 0, 'Quizzes with problems': 0 }; e.Quizzes++; e.Questions += p.questions; e.Flagged += p.flagged; if (p.flagged || p.paperIssues.length) e['Quizzes with problems']++; byExam.set(p.examId, e); }
const summary = [...byExam.values()].map((e) => ({ ...e, '% flagged': e.Questions ? Math.round((100 * e.Flagged) / e.Questions) : 0 })).sort((a, b) => b['% flagged'] - a['% flagged']);

const flagCounts = {}; questions.forEach((q) => q.flags.forEach((f) => (flagCounts[f] = (flagCounts[f] || 0) + 1)));
const legend = [
  ['NO_ANSWER_KEY', 'No correct answer given (or "answer not available") - quiz cannot score this question'],
  ['KEY_TEXT_MISMATCH', 'The stated answer text does not match the keyed option - key probably belongs to another question'],
  ['EXPLANATION_SELF_CONTRADICTS', 'Explanation says "wait / recalculate / actually / take X" - the answer/explanation is unreliable'],
  ['DUPLICATE_OPTIONS', 'Two or more options are identical'],
  ['DUP_QUESTION', 'Same question (and options) appears more than once in the paper'],
  ['NEEDS_IMAGE / IMAGE_OPTIONS', 'Question depends on a figure/image that is not in the docx'],
  ['OPTIONS_NOT_FOUND / EMPTY_OPTION / NO_STEM', 'Question text or options missing/garbled in the source'],
  ['PLACEHOLDER_EXPLANATION', 'Explanation is boilerplate ("verify with official materials")'],
  ['ANSWER_LEAKED_IN_OPTION', 'Answer/explanation text is stuck inside an option'],
].map(([flag, meaning]) => ({ Flag: flag, Meaning: meaning, 'Count (all categories)': flag.split(' / ').reduce((n, f) => n + (flagCounts[f] || 0), 0) }));

const noMocks = audits.filter((a) => a.status === 'NO_MOCKS_ON_DRIVE' || a.status === 'PLACEHOLDERS_ONLY').map((a) => ({ Category: a.category, Exam: a.examName || a.label, 'Conducting body': a.conductingBody || '', 'Drive folder': a.relPath, Needed: a.mockFolder ? '10 mock test docx missing from the mock folder' : 'Create a mock test folder and supply 10 mock test docx' }));

const wb = xlsx.utils.book_new();
const add = (name, rows, widths) => { const ws = xlsx.utils.json_to_sheet(rows.length ? rows : [{ Note: '(none)' }]); if (widths) ws['!cols'] = widths.map((w) => ({ wch: w })); xlsx.utils.book_append_sheet(wb, ws, name); };
add('Read me', [{ Info: `Mock test issues for ${prefix} exams. Generated ${new Date().toISOString().slice(0, 10)}.` }, { Info: `Quizzes loaded: ${papers.length} | questions: ${papers.reduce((n, p) => n + p.questions, 0)} | flagged questions: ${questions.length}` }, { Info: 'Flagged questions are stored in the app with a review flag. Fix the source docx (or reply with corrected Q/answer/explanation) and we re-load.' }, ...legend.map((l) => ({ Info: `${l.Flag} (${l['Count (all categories)']}): ${l.Meaning}` }))], [140]);
add('Summary by exam', summary, [26, 50, 10, 11, 10, 20, 10]);
add('Quizzes with issues', worst, [26, 50, 56, 40, 10, 10, 9, 60, 60, 38]);
add('Flagged questions', questions.map((q) => ({ Category: q.category, Exam: q.exam, 'Quiz title': q.title, 'Q#': q.n, Problems: q.flags.join('; '), Question: q.stem, Options: q.options, 'Key in file': q.key || '', Explanation: q.explanation })), [22, 40, 50, 6, 36, 70, 60, 8, 60]);
add('Held (not loaded)', held.map((h) => ({ Category: h.category, Exam: h.exam, File: h.file, Reason: h.reason })), [24, 50, 44, 70]);
add('Not loaded - exam match', noExam.map((n) => ({ Category: n.category, 'Drive folder': n.folder })), [24, 90]);
add('Exams with no mock tests', noMocks, [26, 50, 30, 60, 50]);
xlsx.writeFile(wb, out);
console.log(`Wrote ${out}\nquizzes ${papers.length} (with issues ${worst.length}) | flagged questions ${questions.length} | held ${held.length} | no-exam-match folders ${noExam.length} | exams with no mocks ${noMocks.length}`);
