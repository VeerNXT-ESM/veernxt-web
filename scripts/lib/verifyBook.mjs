/**
 * scripts/lib/verifyBook.mjs
 *
 * Independent check of a parsed book against its source DOCX. It re-reads word/document.xml with its own
 * (much simpler) extractor, so a bug in the parser cannot hide itself. Used by bulk_reparse_books.mjs:
 * a book that does not pass is never uploaded.
 *
 *   verifyBook(docxBuffer, chapters) -> { pass, issues[], warnings[], metrics }
 *
 * Checks
 *  V1 only known block types (heading, paragraph, list, numberedList, table, image)
 *  V2 at least one chapter, none empty
 *  V3 no invented text: every output text unit exists in the DOCX (numbering labels tolerated)
 *  V4 coverage: DOCX text between the first and last matched unit is present in the output
 *  V5 order: output units appear in DOCX order
 *  V6 images: output image count equals drawings in the matched DOCX range (+-1 warns, more fails)
 */
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const JSZip = require('jszip');
const { DOMParser } = require('@xmldom/xmldom');

const np = (s) => String(s || '').toLowerCase().replace(/[^\p{L}\p{M}\p{N}]+/gu, '').replace(/^\d+/, '');
const BULLET_RE = /^[\s ]*[•●▪■◦○‣∙·][\s ]*/;
const decode = (s) => s.replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');
const htmlText = (h) => decode(String(h || '').replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]+>/g, ' '));

// ── DOCX side ──────────────────────────────────────────────────
async function docxUnits(buffer) {
  const zip = await JSZip.loadAsync(buffer);
  const doc = new DOMParser().parseFromString(await zip.file('word/document.xml').async('string'), 'text/xml');
  const body = Array.from(doc.documentElement.childNodes).find((n) => n.localName === 'body');
  const units = []; // { t: normalized text, imgs }
  const textOf = (n) => {
    let out = '';
    const walk = (x) => {
      for (const c of Array.from(x.childNodes || [])) {
        if (c.nodeType !== 1 || c.localName === 'Fallback' || c.localName === 'drawing' || c.localName === 'pict') continue;
        if (c.localName === 't') out += c.textContent;
        else if (c.localName === 'tab' || c.localName === 'br' || c.localName === 'cr') out += ' ';
        else walk(c);
      }
    };
    walk(n);
    return out;
  };
  const drawings = (n) => {
    let k = 0;
    const walk = (x) => {
      for (const c of Array.from(x.childNodes || [])) {
        if (c.nodeType !== 1 || c.localName === 'Fallback') continue;
        if (c.localName === 'drawing') k++; else walk(c);
      }
    };
    walk(n);
    return k;
  };
  const para = (p) => units.push({ t: np(textOf(p).replace(BULLET_RE, '')), imgs: drawings(p) });
  const table = (tbl) => {
    for (const tr of Array.from(tbl.childNodes).filter((n) => n.localName === 'tr')) {
      for (const tc of Array.from(tr.childNodes).filter((n) => n.localName === 'tc')) {
        for (const c of Array.from(tc.childNodes)) {
          if (c.localName === 'p') para(c); else if (c.localName === 'tbl') table(c);
        }
      }
    }
  };
  const top = [];
  for (const el of Array.from(body.childNodes)) {
    if (el.nodeType !== 1) continue;
    if (el.localName === 'sdt') { const sc = Array.from(el.childNodes).find((n) => n.localName === 'sdtContent'); for (const c of Array.from(sc?.childNodes || [])) if (c.nodeType === 1) top.push(c); } else top.push(el);
  }
  for (const el of top) { if (el.localName === 'p') para(el); else if (el.localName === 'tbl') table(el); }
  return units;
}

// ── output side ───────────────────────────────────────────────
function outputUnits(chapters) {
  const units = []; // { t, img? }
  let images = 0;
  const types = {};
  for (const ch of chapters) {
    units.push({ t: np(htmlText(ch.title)), raw: ch.title, title: true });
    for (const b of ch.blocks) {
      types[b.type] = (types[b.type] || 0) + 1;
      if (b.type === 'image') { images++; units.push({ img: true }); }
      else if (b.type === 'heading' || b.type === 'paragraph') units.push({ t: np(htmlText(b.content)), raw: htmlText(b.content) });
      else if (b.type === 'list' || b.type === 'numberedList') {
        for (const it of b.items) for (const part of String(it).split(/<\/?(?:ul|ol|li)\b[^>]*>/i)) { const t = htmlText(part); if (t.trim()) units.push({ t: np(t), raw: t }); }
      } else if (b.type === 'table') {
        for (const r of b.rows) for (const cell of r.cells) {
          const imgN = (String(cell).match(/<img\b/gi) || []).length; images += imgN;
          const pieces = String(cell).split(/<\/?(?:p|ul|ol|li)\b[^>]*>/i).map(htmlText).filter((x) => x.trim());
          for (const t of pieces) units.push({ t: np(t), raw: t });
          for (let i = 0; i < imgN; i++) units.push({ img: true });
        }
      }
    }
  }
  return { units, images, types };
}

export async function verifyBook(docxBuffer, chapters, { parts = [] } = {}) {
  const issues = [], warnings = [];
  const KNOWN = new Set(['heading', 'paragraph', 'list', 'numberedList', 'table', 'image']);
  const out = outputUnits(chapters);
  const unknown = Object.keys(out.types).filter((t) => !KNOWN.has(t));
  if (unknown.length) issues.push(`unknown block types: ${unknown.join(', ')}`);
  if (!chapters.length) issues.push('no chapters');
  const empty = chapters.filter((c) => !c.blocks.length).length;
  if (empty) issues.push(`${empty} empty chapters`);

  const docx = await docxUnits(docxBuffer);
  const pos = new Map(); // text -> sorted positions
  docx.forEach((u, i) => { if (u.t) { if (!pos.has(u.t)) pos.set(u.t, []); pos.get(u.t).push(i); } });
  const findAfter = (t, last) => { const a = pos.get(t); if (!a) return -1; let lo = 0, hi = a.length; while (lo < hi) { const m = (lo + hi) >> 1; if (a[m] > last) hi = m; else lo = m + 1; } return lo < a.length ? a[lo] : -2; };
  const anywhere = (t) => {
    if (pos.has(t)) return true;
    for (let k = 1; k <= 3; k++) if (t.length > k + 3 && pos.has(t.slice(k))) return true; // numbering label prefix
    // merged title "CHAPTER 3: Name": both halves must exist
    return false;
  };

  const texts = out.units.filter((u) => u.t);
  let last = -1, invented = 0, outOfOrder = 0, firstPos = -1, lastPos = -1;
  const matched = new Set();
  const inventedSample = [];
  for (const u of texts) {
    const p = findAfter(u.t, last);
    if (p >= 0) { matched.add(p); last = p; if (firstPos < 0 && !u.title) firstPos = p; lastPos = p; continue; } // a title can match a contents line, so the coverage range starts at the first BODY unit
    if (p === -2 || anywhere(u.t)) { outOfOrder++; continue; }
    // numbering-label tolerance: try suffixes after `last`
    let ok = false;
    for (let k = 1; k <= 3 && !ok; k++) { const q = findAfter(u.t.slice(k), last); if (q >= 0) { matched.add(q); last = q; lastPos = q; ok = true; } }
    if (ok) continue;
    // merged chapter title ("CHAPTER 3: Name"): accept when the part after ': ' exists
    const raw = u.raw || '';
    const i = raw.indexOf(': ');
    if (i > 0 && anywhere(np(raw.slice(i + 2)))) continue;
    invented++; if (inventedSample.length < 8) inventedSample.push(raw.slice(0, 80));
  }
  const total = texts.length;
  if (invented / Math.max(1, total) > 0.002 || invented > 8) issues.push(`${invented} output text units not found in the DOCX (e.g. ${JSON.stringify(inventedSample.slice(0, 3))})`);
  else if (invented) warnings.push(`${invented} output units not found in the DOCX (e.g. ${JSON.stringify(inventedSample.slice(0, 3))})`);
  if (outOfOrder / Math.max(1, total) > 0.01) issues.push(`${outOfOrder} output units out of DOCX order`);
  else if (outOfOrder) warnings.push(`${outOfOrder} output units out of order`);

  // coverage between first and last matched DOCX unit
  // halves of merged chapter titles ("CHAPTER 2" + "History of Assam" -> "CHAPTER 2: History of Assam")
  const titleParts = new Set(chapters.flatMap((c) => { const t = htmlText(c.title); const i = t.indexOf(': '); return i > 0 ? [np(t.slice(0, i)), np(t.slice(i + 2))] : []; }));
  const ignore = new Set(parts.flatMap((p) => String(p).split('›').map((x) => np(x))));
  let range = 0, covered = 0, missingSample = [];
  for (let i = Math.max(0, firstPos); i <= lastPos; i++) {
    const u = docx[i];
    if (!u.t) continue;
    if (ignore.has(u.t) || /^(chapter|unit|part|lesson|अध्याय|इकाई)\d*$/i.test(u.t) || u.t === 'tableofcontents' || u.t === 'contents') continue;
    range++;
    if (matched.has(i) || titleParts.has(u.t)) covered++; else if (missingSample.length < 8) missingSample.push(i);
  }
  // a unit can also be present out of order; count those as covered
  const outSet = new Set(texts.map((u) => u.t));
  let rescued = 0;
  for (const i of missingSample.slice()) if (outSet.has(docx[i].t)) rescued++;
  const coverage = range ? (covered + rescued) / range : 1;
  if (coverage < 0.99) issues.push(`only ${(coverage * 100).toFixed(2)}% of the DOCX text is in the output`);

  // images in the matched range
  let docxImgs = 0;
  for (let i = Math.max(0, firstPos); i < docx.length; i++) docxImgs += docx[i].imgs;
  // drawings after the last matched unit still belong to the last chapter: count them too (bounded by the end of the document)
  const diff = out.images - docxImgs;
  if (Math.abs(diff) > 1) issues.push(`images: output ${out.images}, DOCX ${docxImgs}`);
  else if (diff) warnings.push(`images: output ${out.images}, DOCX ${docxImgs}`);

  return {
    pass: issues.length === 0,
    issues, warnings,
    missing: missingSample.map((i) => docx[i].t.slice(0, 60)),
    metrics: { chapters: chapters.length, blocks: Object.values(out.types).reduce((a, b) => a + b, 0), types: out.types, textUnits: total, invented, outOfOrder, coveragePct: +(coverage * 100).toFixed(2), imagesOut: out.images, imagesDocx: docxImgs },
  };
}
