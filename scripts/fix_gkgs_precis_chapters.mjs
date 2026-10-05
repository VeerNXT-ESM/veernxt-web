#!/usr/bin/env node
/**
 * scripts/fix_gkgs_precis_chapters.mjs
 *
 * Makes a corrected COPY of Cluster_001_SSC COMPLETE GK.docx whose chapter structure is
 * right (chapter title = Heading 1, everything inside a chapter = Heading 2/3). Only
 * paragraph styles (and the 24 Polity chapter titles) are touched in word/document.xml;
 * every other part of the .docx is copied byte-for-byte. The original is never modified.
 *
 * Issues fixed (see docs/GKGS_Precis_Chapter_Issues_2026-10-05.md):
 *  A. chapter titles that were bold text / Heading 6 -> Heading 1
 *  B. sub-sections styled Heading 1 -> Heading 3 (or 2)
 *  C. Polity "CHAPTER – n" gets its real name appended; the duplicate Heading 2 name is removed
 *  D. duplicate "CHAPTER 3: LATITUDE, LONGITUDE & TIME" heading removed
 *  E. numbered all-caps section lines inside the promoted Chemistry chapters -> Heading 2
 *
 * Usage: node scripts/fix_gkgs_precis_chapters.mjs --src <orig.docx> --out <copy.docx> [--report out.json]
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

// ── style ids ────────────────────────────────────────────────
const idOf = (name) => new RegExp(`<w:style [^>]*w:styleId="([^"]+)"[^>]*>\\s*<w:name w:val="${name}"`, 'i').exec(styles)?.[1];
const ST = { 1: idOf('heading 1'), 2: idOf('heading 2'), 3: idOf('heading 3') };
if (!ST[1] || !ST[2] || !ST[3]) { console.error('Heading style ids not found', ST); process.exit(1); }
const styleName = {};
for (const m of styles.matchAll(/<w:style [^>]*w:styleId="([^"]+)"[^>]*>\s*<w:name w:val="([^"]+)"/g)) styleName[m[1]] = m[2].toLowerCase();

// ── paragraph scan (top-level only: skip anything inside <w:tbl>) ──
const decode = (s) => s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'");
const textOf = (p) => decode([...p.matchAll(/<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>|<w:br\s*\/>/g)].map((m) => (m[1] !== undefined ? m[1] : '\n')).join(''));
const styleOf = (p) => { const id = /<w:pStyle w:val="([^"]+)"/.exec(p)?.[1]; return id ? (styleName[id] || id).toLowerCase() : 'normal'; };

const tblRanges = [];
{
  let depth = 0, start = 0;
  for (const m of xml.matchAll(/<w:tbl>|<\/w:tbl>/g)) {
    if (m[0] === '<w:tbl>') { if (depth++ === 0) start = m.index; }
    else if (--depth === 0) tblRanges.push([start, m.index + m[0].length]);
  }
}
const inTable = (pos) => tblRanges.some(([a, b]) => pos >= a && pos < b);

const paras = [];
for (const m of xml.matchAll(/<w:p(?:\s[^>]*)?>[\s\S]*?<\/w:p>/g)) {
  if (inTable(m.index)) continue;
  paras.push({ start: m.index, end: m.index + m[0].length, xml: m[0], text: textOf(m[0]).trim(), style: styleOf(m[0]), hasDrawing: /<w:drawing>|<w:pict>/.test(m[0]) });
}

// ── paragraph editing helpers ────────────────────────────────
function setStyle(p, level) {
  let x = p.replace(/<w:numPr>[\s\S]*?<\/w:numPr>/, '');
  const tag = `<w:pStyle w:val="${ST[level]}"/>`;
  if (/<w:pStyle w:val="[^"]*"\s*\/>/.test(x)) x = x.replace(/<w:pStyle w:val="[^"]*"\s*\/>/, tag);
  else if (/<w:pPr>/.test(x)) x = x.replace('<w:pPr>', '<w:pPr>' + tag);
  else if (/<w:pPr\s*\/>/.test(x)) x = x.replace(/<w:pPr\s*\/>/, `<w:pPr>${tag}</w:pPr>`);
  else x = x.replace(/^(<w:p(?:\s[^>]*)?>)/, `$1<w:pPr>${tag}</w:pPr>`);
  return x;
}
const appendText = (p, t) => p.replace(/<\/w:p>$/, `<w:r><w:t xml:space="preserve">${t.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</w:t></w:r></w:p>`);

const edits = new Map(); // para index -> new xml ('' = delete)
const log = [];
const note = (kind, i, extra = '') => log.push({ kind, text: paras[i].text.slice(0, 80), from: paras[i].style, extra });

// A. promote to Heading 1
const PROMOTE = [
  /^CHAPTER 18: NATURAL VEGETATION & WILDLIFE OF INDIA$/,
  /^CHAPTER 5: JAINISM AND BUDDHISM$/,
  /^CHAPTER (5|9|10|11|13|14) : [A-Z][A-Z ,&'‑–-]+$/, // Chemistry
];
const promoted = [];
paras.forEach((p, i) => {
  if (!p.text || p.style === 'heading 1') return;
  if (PROMOTE.some((re) => re.test(p.text))) { edits.set(i, setStyle(p.xml, 1)); promoted.push(i); note('promote->H1', i); }
});

// B. demote Heading 1 sub-sections
const DEMOTE = [
  [/^LOCAL WINDS \(COMPLETE TABLE\)$/, 3],
  [/^DETAILED TABLE OF SOILS OF INDIA$/, 3],
  [/^(Paleolithic|Mesolithic|Neolithic) Age \(/, 3],
  [/^Chalcolithic Age \(/, 3],
  [/^1\. INTRODUCTION TO ATOMS AND MOLECULES$/, 2],
];
paras.forEach((p, i) => {
  if (p.style !== 'heading 1' || edits.has(i)) return;
  for (const [re, lvl] of DEMOTE) if (re.test(p.text)) { edits.set(i, setStyle(p.xml, lvl)); note(`demote->H${lvl}`, i); }
});

// D. duplicate Geography Chapter 3 heading (keep the first, drop later ones; never drop a drawing)
{
  const idx = paras.map((p, i) => [p, i]).filter(([p]) => p.style === 'heading 1' && /^CHAPTER 3: LATITUDE, LONGITUDE & TIME$/.test(p.text)).map(([, i]) => i);
  for (const i of idx.slice(1)) {
    if (paras[i].hasDrawing) { console.error('duplicate heading carries a drawing; not removing'); continue; }
    edits.set(i, ''); note('delete-duplicate', i);
  }
}

// C. Polity: "CHAPTER – n" + following Heading 2 name
let polity = 0;
paras.forEach((p, i) => {
  if (p.style !== 'heading 1' || !/^CHAPTER\s*[–-]\s*\d+$/.test(p.text)) return;
  let j = i + 1;
  while (j < paras.length && paras[j].style === 'heading 2' && !paras[j].text) j++; // skip empty H2s
  const nm = paras[j];
  if (!nm || nm.style !== 'heading 2' || !nm.text || nm.text !== nm.text.toUpperCase()) { log.push({ kind: 'POLITY-SKIPPED', text: p.text, extra: nm?.text }); return; }
  edits.set(i, appendText(p.xml, ': ' + nm.text.replace(/\s+/g, ' ')));
  // the name paragraph may carry a banner image: keep the drawing, drop only the text
  edits.set(j, nm.hasDrawing ? nm.xml.replace(/(<w:t(?:\s[^>]*)?>)[^<]*(<\/w:t>)/g, '$1$2') : '');
  polity++; note('polity-title', i, nm.text);
});

// E. Chemistry sections inside promoted chapters
let chemSections = 0;
for (const pi of promoted) {
  if (!/^CHAPTER \d+ : /.test(paras[pi].text)) continue;
  for (let k = pi + 1; k < paras.length; k++) {
    const q = paras[k];
    if (q.style === 'heading 1' || promoted.includes(k)) break; // next chapter starts
    if (q.style === 'normal' && /^\d{1,2}\.\s+[A-Z][A-Z0-9 ,&()'‑–/.:-]+$/.test(q.text) && q.text.length < 90 && !edits.has(k)) {
      edits.set(k, setStyle(q.xml, 2)); chemSections++;
    }
  }
}

// ── apply (back to front so offsets stay valid) ──────────────
const order = [...edits.keys()].sort((a, b) => b - a);
for (const i of order) xml = xml.slice(0, paras[i].start) + edits.get(i) + xml.slice(paras[i].end);

zip.file('word/document.xml', xml);
const buf = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE', compressionOptions: { level: 6 } });
fs.writeFileSync(OUT, buf);

const summary = {
  promotedToH1: log.filter((l) => l.kind === 'promote->H1').length,
  demotedH1: log.filter((l) => l.kind.startsWith('demote')).length,
  duplicatesDeleted: log.filter((l) => l.kind === 'delete-duplicate').length,
  polityTitlesMerged: polity,
  chemistrySectionsToH2: chemSections,
  skipped: log.filter((l) => l.kind === 'POLITY-SKIPPED'),
};
console.log(summary);
if (REPORT) fs.writeFileSync(REPORT, JSON.stringify({ summary, log }, null, 2));
console.log('Wrote', OUT, (buf.length / 1048576).toFixed(1) + ' MB');
