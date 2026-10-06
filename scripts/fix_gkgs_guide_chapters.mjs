#!/usr/bin/env node
/**
 * scripts/fix_gkgs_guide_chapters.mjs
 *
 * Makes a corrected COPY of the GS & GK Guide DOCX in which chapter numbers restart in every
 * section/subject (like the Precis), instead of running 1..49 across the whole book:
 *   SECTION A - HISTORY      1-14
 *   SECTION B: INDIAN POLITY 1-15   (source numbered it 14-28, so "Chapter 14" appeared twice)
 *   SECTION C- GEOGRAPHY     1-11   (source skipped 37)
 *   SECTION D- ECONOMICS     1-9
 *   GENERAL SCIENCE / PHYSICS, CHEMISTRY, BIOLOGY: each section restarts at 1
 * Chapter titles are normalised to "Chapter N: Name". The table-of-contents lines (front matter)
 * are renumbered the same way so the document stays consistent. Only text inside those runs
 * changes; every other part of the .docx is copied byte-for-byte. The original is never modified.
 *
 * Usage: node scripts/fix_gkgs_guide_chapters.mjs --src <orig.docx> --out <copy.docx> [--report out.json]
 */
import fs from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const JSZip = require('jszip');

const arg = (f) => { const i = process.argv.indexOf(f); return i > -1 ? process.argv[i + 1] : null; };
const SRC = arg('--src'), OUT = arg('--out'), REPORT = arg('--report');
if (!SRC || !OUT) { console.error('Usage: --src <orig.docx> --out <copy.docx>'); process.exit(1); }
if (fs.existsSync(OUT)) { console.error('Refusing to overwrite existing ' + OUT); process.exit(1); }

const zip = await JSZip.loadAsync(fs.readFileSync(SRC));
let xml = await zip.file('word/document.xml').async('string');
const styles = await zip.file('word/styles.xml').async('string');
const h1Id = new RegExp('<w:style [^>]*w:styleId="([^"]+)"[^>]*>\\s*<w:name w:val="heading 1"', 'i').exec(styles)?.[1];
if (!h1Id) { console.error('Heading 1 style id not found'); process.exit(1); }

const decode = (s) => s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'");
const encode = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const T_RE = /<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>/g;
const textOf = (p) => decode([...p.matchAll(T_RE)].map((m) => m[1]).join(''));

// table ranges (only top-level paragraphs are edited)
const tbl = [];
{ let depth = 0, start = 0;
  for (const m of xml.matchAll(/<w:tbl>|<\/w:tbl>/g)) {
    if (m[0] === '<w:tbl>') { if (depth++ === 0) start = m.index; } else if (--depth === 0) tbl.push([start, m.index + m[0].length]);
  } }
const inTable = (pos) => tbl.some(([a, b]) => pos >= a && pos < b);

const paras = [];
for (const m of xml.matchAll(/<w:p(?:\s[^>]*)?>[\s\S]*?<\/w:p>/g)) {
  if (inTable(m.index)) continue;
  paras.push({ start: m.index, end: m.index + m[0].length, xml: m[0], text: textOf(m[0]).trim(), h1: new RegExp(`<w:pStyle w:val="${h1Id}"`).test(m[0]) });
}

const CH = /^\s*Chapter\s*(\d+)\s*[:：]?\s*(.*?)\s*$/i;
const edits = new Map();
const log = [];

// rewrite the single <w:t> of a paragraph with new text (all other w:t emptied)
function setText(p, text) {
  let first = true;
  return p.replace(T_RE, (m0) => {
    if (first) { first = false; return `<w:t xml:space="preserve">${encode(text)}</w:t>`; }
    return '<w:t></w:t>';
  });
}

// 1. chapter headings (Heading 1)
const firstH1 = paras.findIndex((p) => p.h1 && p.text);
let n = 0, changed = 0;
for (let i = firstH1; i < paras.length; i++) {
  const p = paras[i];
  if (!p.h1 || !p.text) continue;
  const m = CH.exec(p.text);
  if (!m) { n = 0; log.push({ divider: p.text }); continue; } // section / subject divider: numbering restarts
  n++;
  const next = `Chapter ${n}: ${m[2].replace(/\s+/g, ' ')}`;
  if (next !== p.text) { edits.set(i, setText(p.xml, next)); changed++; log.push({ from: p.text.slice(0, 60), to: next.slice(0, 60) }); }
}

// 2. table-of-contents lines in the front matter (before the first chapter heading)
let tocFixed = 0, tocSkipped = 0;
n = 0;
for (let i = 0; i < firstH1; i++) {
  const p = paras[i];
  const pieces = [...p.xml.matchAll(T_RE)].map((m) => decode(m[1]));
  const joined = pieces.join('');
  if (/^\s*(SECTION|GENERAL SCIENCE)/i.test(joined.trim())) { n = 0; continue; }
  const idx = pieces.findIndex((t) => CH.test(t));
  if (idx < 0) continue;
  n++;
  const m = CH.exec(pieces[idx]);
  const next = `Chapter ${n}: ${m[2].replace(/\s+/g, ' ')}`;
  if (next === pieces[idx].trim()) continue;
  let k = -1;
  edits.set(i, p.xml.replace(T_RE, (m0) => { k++; return k === idx ? `<w:t xml:space="preserve">${encode(next)}</w:t>` : m0; }));
  tocFixed++;
}

const order = [...edits.keys()].sort((a, b) => b - a);
for (const i of order) xml = xml.slice(0, paras[i].start) + edits.get(i) + xml.slice(paras[i].end);
zip.file('word/document.xml', xml);
const buf = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE', compressionOptions: { level: 6 } });
fs.writeFileSync(OUT, buf);
console.log({ chapterHeadingsRenumbered: changed, tocLinesRenumbered: tocFixed, dividers: log.filter((l) => l.divider).map((l) => l.divider) });
if (REPORT) fs.writeFileSync(REPORT, JSON.stringify(log, null, 2));
console.log('Wrote', OUT, (buf.length / 1048576).toFixed(1) + ' MB');
