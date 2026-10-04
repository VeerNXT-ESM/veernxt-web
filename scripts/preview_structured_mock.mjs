#!/usr/bin/env node
/**
 * READ-ONLY (no DB). Parses a structured mock-test .docx and writes the result for the local
 * preview page (/dev-quiz-preview). Usage: node scripts/preview_structured_mock.mjs <file.docx>
 * Output: src/pages/sandbox/quizPreviewData.json (git-excluded; images inlined as data URIs).
 */
import fs from 'node:fs';
import { parseStructuredMock } from './lib/structured_mock_parser.mjs';
const file = process.argv[2];
if (!file) { console.error('Usage: node scripts/preview_structured_mock.mjs <file.docx>'); process.exit(1); }
const r = await parseStructuredMock(file);
const { images, ...rest } = r;
const out = new URL('../src/pages/sandbox/quizPreviewData.json', import.meta.url);
fs.writeFileSync(out, JSON.stringify({ file: file.split(/[\\/]/).pop(), parsedAt: new Date().toISOString(), ...rest, imageCount: images.length }));
const tally = {}; r.questions.forEach((q) => q.flags.forEach((f) => (tally[f] = (tally[f] || 0) + 1)));
console.log(`${r.title}\nquestions ${r.questions.length} (declared ${r.declared}), sections ${r.sections.map((s) => `${s.id}:${s.count}`).join(' ')}, images ${images.length}`);
console.log('paper issues:', r.issues.length ? '\n  - ' + r.issues.join('\n  - ') : 'none');
console.log('flag tally:', JSON.stringify(tally));
