/**
 * Structured mock-test parser for the content team's table-based quiz template
 * ("UP_SI_Mock_Test_COLOR" layout). Reads the .docx XML directly (NOT flat text), so
 * the template's structure is the source of truth:
 *
 *   banner table   "SECTION A: <name> (Q1–Q40)"                -> section + declared range
 *   question table [ "Q12" | stem cell (text, line breaks) ]   -> stem (HTML)
 *   figure         paragraph(s) with a drawing after the table -> <img> appended to the stem
 *   options        4 paragraphs "(A) text"; the correct one is bold + trailing "✓"
 *   explanation    table [ "B" | "Explanation: ..." ]          -> answer letter + explanation (HTML)
 *   answer key     table "Q.No | Ans" x4 column pairs          -> cross-check only
 *
 * The correct answer is cross-checked three ways (✓ marker, explanation-box letter, key table);
 * any disagreement is flagged, never silently resolved. Flags reuse the review_flags vocabulary
 * in src/lib/quizQuality.js so the player already hides blocking questions.
 * Pure function over a file path/buffer; no DB access.
 */
import fs from 'node:fs';
import JSZip from 'jszip';
import { DOMParser } from '@xmldom/xmldom';
import { CONTRADICTION, PLACEHOLDER_EXPL, norm } from './mock_test_parser.mjs';

const W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const R = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const A = 'http://schemas.openxmlformats.org/drawingml/2006/main';
const WP = 'http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing';
const MIME = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', svg: 'image/svg+xml', webp: 'image/webp' };
const MARK = /[✓✔]/;

const kids = (el, name) => Array.from(el.childNodes).filter((n) => n.nodeType === 1 && n.localName === name && n.namespaceURI === W);
const first = (el, name) => kids(el, name)[0] || null;
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export async function parseStructuredMock(input, { imageMode = 'dataUri', imageUrl } = {}) {
  const buf = Buffer.isBuffer(input) ? input : fs.readFileSync(input);
  const zip = await JSZip.loadAsync(buf);
  const doc = new DOMParser().parseFromString(await zip.file('word/document.xml').async('string'), 'text/xml');
  const relsDoc = new DOMParser().parseFromString(await zip.file('word/_rels/document.xml.rels').async('string'), 'text/xml');
  const rels = {};
  for (const r of Array.from(relsDoc.getElementsByTagName('Relationship'))) rels[r.getAttribute('Id')] = r.getAttribute('Target');
  const images = []; // { name, mime, buffer }
  const imgCache = {};

  async function imageFor(rid) {
    if (imgCache[rid]) return imgCache[rid];
    const target = rels[rid]; if (!target) return null;
    const f = zip.file('word/' + target.replace(/^\//, '').replace(/^word\//, ''));
    if (!f) return null;
    const data = await f.async('nodebuffer'); const ext = target.split('.').pop().toLowerCase();
    const rec = { name: target.split('/').pop(), mime: MIME[ext] || 'application/octet-stream', buffer: data };
    images.push(rec);
    return (imgCache[rid] = rec);
  }

  // ---- run / paragraph -> HTML ------------------------------------------------------------
  // Only semantic formatting survives (b/i/u/sup/sub). Colour is template chrome, not content.
  async function runHtml(r, { keepBold }) {
    let out = '';
    const rPr = first(r, 'rPr');
    for (const c of Array.from(r.childNodes)) {
      if (c.nodeType !== 1) continue;
      if (c.localName === 't') out += esc(c.textContent).replace(/\n/g, '<br>');
      else if (c.localName === 'br') out += '<br>';
      else if (c.localName === 'tab') out += '&emsp;';
      else if (c.localName === 'drawing') {
        const blip = c.getElementsByTagNameNS(A, 'blip')[0];
        const ext = c.getElementsByTagNameNS(WP, 'extent')[0];
        const rid = blip && blip.getAttributeNS(R, 'embed');
        const img = rid && (await imageFor(rid));
        if (img) {
          const wPx = ext ? Math.round(Number(ext.getAttribute('cx')) / 9525) : null;
          const src = imageMode === 'dataUri' ? `data:${img.mime};base64,${img.buffer.toString('base64')}` : (imageUrl ? imageUrl(img) : img.name);
          out += `<img src="${src}" alt="Figure" style="max-width:100%;height:auto;${wPx ? `width:${wPx}px;` : ''}display:block;margin:12px 0">`;
        }
      }
    }
    if (!out) return '';
    if (rPr) {
      const on = (n) => { const e = first(rPr, n); return e && e.getAttributeNS(W, 'val') !== '0' && e.getAttributeNS(W, 'val') !== 'false'; };
      const va = first(rPr, 'vertAlign'); const v = va && va.getAttributeNS(W, 'val');
      if (v === 'superscript') out = `<sup>${out}</sup>`; else if (v === 'subscript') out = `<sub>${out}</sub>`;
      if (on('u') && first(rPr, 'u').getAttributeNS(W, 'val') !== 'none') out = `<u>${out}</u>`;
      if (on('i')) out = `<em>${out}</em>`;
      if (keepBold && on('b')) out = `<strong>${out}</strong>`;
    }
    return out;
  }
  async function paraHtml(p, opts = {}) { let s = ''; for (const r of kids(p, 'r')) s += await runHtml(r, { keepBold: opts.keepBold !== false }); return s; }
  const paraText = (p) => Array.from(p.getElementsByTagNameNS(W, 't')).map((t) => t.textContent).join('');
  const hasDrawing = (p) => p.getElementsByTagNameNS(W, 'drawing').length > 0;

  // Table helpers (the template only uses 1xN tables for content, plus the answer-key grid)
  const rowsOf = (tbl) => kids(tbl, 'tr');
  const cellsOf = (tr) => kids(tr, 'tc');
  const cellText = (tc) => kids(tc, 'p').map(paraText).join('\n').trim();
  const cellFill = (tc) => { const tcPr = first(tc, 'tcPr'); const shd = tcPr && first(tcPr, 'shd'); return shd ? (shd.getAttributeNS(W, 'fill') || '').toUpperCase() : ''; };
  async function cellHtml(tc, opts) { const ps = []; for (const p of kids(tc, 'p')) { const h = (await paraHtml(p, opts)).trim(); if (h) ps.push(h); } return ps; }

  // ---- walk body in document order --------------------------------------------------------
  const body = doc.getElementsByTagNameNS(W, 'body')[0];
  const result = { title: null, subtitle: null, meta: {}, declared: null, sections: [], questions: [], keyTable: {}, instructions: [], issues: [], images };
  let section = null, cur = null, headerSeen = [];

  for (const el of Array.from(body.childNodes)) {
    if (el.nodeType !== 1) continue;
    if (el.localName === 'p') {
      if (cur && cur.stage === 'afterStem' && hasDrawing(el)) { cur.stemParts.push(await paraHtml(el)); continue; } // figure between stem and options
      const t = paraText(el).trim();
      const om = t.match(/^\(([A-Da-d])\)\s*(.*)$/s);
      if (cur && om && cur.stage !== 'afterExpl') {
        cur.stage = 'options';
        const letter = om[1].toUpperCase();
        const marked = MARK.test(t);
        let html = (await paraHtml(el, { keepBold: false })).replace(/^\s*\([A-Da-d]\)\s*/, '').replace(/\s*[✓✔]\s*$/, '').replace(/[✓✔]/g, '').trim();
        cur.options[letter] = html; cur.optionText[letter] = om[2].replace(/\s*[✓✔]\s*$/, '').trim();
        if (marked) cur.marked.push(letter);
      } else if (!result.declared) {
        const m = t.match(/(\d{2,3})\s*Questions/i); if (m) result.declared = parseInt(m[1], 10);
      }
      continue;
    }
    if (el.localName !== 'tbl') continue;
    const rows = rowsOf(el); const cells = rows[0] ? cellsOf(rows[0]) : [];

    // Answer key grid
    if (rows.length > 5 && /^Q\.?\s*No/i.test(cellText(cells[0] || { childNodes: [] }) || '')) {
      for (const tr of rows.slice(1)) { const c = cellsOf(tr).map(cellText); for (let i = 0; i + 1 < c.length; i += 2) { const n = parseInt(c[i], 10); const a = c[i + 1].replace(/[()\s]/g, '').toUpperCase(); if (n && a) result.keyTable[n] = a; } }
      cur = null; continue;
    }
    if (rows.length !== 1) { cur = null; continue; }

    const first0 = cellText(cells[0]);
    // Section banner
    const sm = first0.match(/^SECTION\s+([A-Z0-9]+)\s*[:\-–]\s*(.+?)\s*\(\s*Q\.?\s*(\d+)\s*[–-]\s*Q?\.?\s*(\d+)\s*\)\s*$/i);
    if (cells.length === 1 && sm) {
      section = { id: sm[1].toUpperCase(), name: sm[2].trim(), from: +sm[3], to: +sm[4], color: cellFill(cells[0]), count: 0 };
      result.sections.push(section); cur = null; continue;
    }
    // Question head
    const qm = cells.length === 2 && first0.match(/^Q\.?\s*(\d{1,3})$/i);
    if (qm) {
      const stemParts = await cellHtml(cells[1]);
      cur = { number: +qm[1], position: result.questions.length + 1, sourceNumber: +qm[1], section: section ? section.name : null, sectionId: section ? section.id : null, stemParts, options: {}, optionText: {}, marked: [], answer: null, boxLetter: null, explanation: '', flags: [], stage: 'afterStem', color: cellFill(cells[0]) };
      result.questions.push(cur); if (section) section.count++; continue;
    }
    // Explanation box: [ letter | "Explanation: ..." ]
    if (cur && cells.length === 2 && /^[A-D]$/i.test(first0) && /^Explanation\s*:/i.test(cellText(cells[1]))) {
      cur.boxLetter = first0.toUpperCase();
      const parts = await cellHtml(cells[1]);
      // drop the "Explanation:" label paragraph/prefix
      const text0 = parts[0] || '';
      parts[0] = text0.replace(/^(?:<[^>]+>)*\s*Explanation\s*:\s*(?:<\/[^>]+>)*/i, '').trim();
      cur.explanation = parts.filter(Boolean).join('<br>');
      cur.stage = 'afterExpl'; continue;
    }
    // Everything else = cover/header/instructions/footer chrome
    if (cells.length === 1) {
      const lines = kids(cells[0], 'p').map(paraText).map((s) => s.trim()).filter(Boolean);
      if (/^INSTRUCTIONS$/i.test(lines[0] || '')) result.instructions = lines.slice(1);
      else if (lines.length) headerSeen.push(lines);
    }
    cur = null;
  }

  // ---- header meta -------------------------------------------------------------------------
  const cover = headerSeen.find((l) => l.some((x) => /Questions\s*\|/i.test(x)));
  if (cover) {
    result.title = cover.slice(0, cover.length - 1).join(' — ');
    const ml = cover[cover.length - 1];
    const q = ml.match(/(\d+)\s*Questions/i), mk = ml.match(/(\d+)\s*Marks/i), hr = ml.match(/(\d+(?:\.\d+)?)\s*Hours?/i);
    result.meta = { questions: q && +q[1], marks: mk && +mk[1], hours: hr && +hr[1], raw: ml };
    if (q) result.declared = +q[1];
  }
  const rule = result.instructions.join(' ').match(/(\d+(?:\.\d+)?)\s*marks?[^|]*\|\s*Negative marking:\s*-?\s*(\d+(?:\.\d+)?)/i);
  if (rule) result.meta.marksPerQuestion = +rule[1], result.meta.negativeMarking = +rule[2];

  // ---- finalize questions + cross-checks ---------------------------------------------------
  // The key table is cross-checked under whichever numbering it actually follows: printed Q-numbers,
  // or body position (a generator that counts every question table, including strays). The ✓ and the
  // explanation-box letter are the primary truth; the key only vetoes when it disagrees under its own scheme.
  const secOf = (q) => result.sections.find((s) => s.id === q.sectionId);
  const inRangeOf = (q) => !q.sectionId || (q.sourceNumber >= secOf(q).from && q.sourceNumber <= secOf(q).to);
  const keyed = Object.keys(result.keyTable).length > 0;
  const agree = (lookup) => result.questions.filter((q) => q.marked.length === 1 && lookup(q) === q.marked[0]).length;
  const byPrinted = agree((q) => (inRangeOf(q) ? result.keyTable[q.sourceNumber] : undefined));
  const byPosition = agree((q) => result.keyTable[q.position]);
  const keyScheme = !keyed ? null : byPosition > byPrinted ? 'position' : 'printed';
  result.keyScheme = keyed ? { scheme: keyScheme, agreeByPrinted: byPrinted, agreeByPosition: byPosition, of: result.questions.length } : null;
  const keyFor = (q) => (keyScheme === 'position' ? result.keyTable[q.position] : inRangeOf(q) ? result.keyTable[q.sourceNumber] : undefined);
  const seenNum = new Map(), seenText = new Map();
  for (const q of result.questions) {
    delete q.stage;
    q.stem = q.stemParts.map((p) => (p.startsWith('<img') ? p : `<p>${p}</p>`)).join('');
    q.stemText = q.stemParts.join(' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    delete q.stemParts;
    const f = new Set();
    const letters = Object.keys(q.options);
    if (letters.join('') !== 'ABCD') f.add('OPTIONS_NOT_FOUND');
    if (Object.values(q.optionText).some((v) => !v)) f.add('EMPTY_OPTION');
    if (new Set(Object.values(q.optionText).map(norm)).size < Object.keys(q.optionText).length) f.add('DUPLICATE_OPTIONS');
    if (!q.stemText || q.stemText.length < 8) f.add('NO_STEM');
    if (/\b(figure|diagram|graph|chart|picture)\b/i.test(q.stemText) && !q.stem.includes('<img')) f.add('NEEDS_IMAGE');
    // answer: three independent sources
    const key = keyFor(q); const inRange = inRangeOf(q);
    if (q.marked.length === 1) q.answer = q.marked[0]; else if (q.marked.length > 1) { f.add('KEY_TEXT_MISMATCH'); q.answer = null; } else f.add('NO_ANSWER_KEY');
    if (!q.boxLetter) f.add('NO_EXPLANATION_BOX');
    if (q.answer && q.boxLetter && q.answer !== q.boxLetter) f.add('KEY_TEXT_MISMATCH');
    if (q.answer && key && key !== q.answer) f.add('KEY_TEXT_MISMATCH');
    if (!inRange) f.add('OUT_OF_SECTION_RANGE');
    if (keyed && !key) f.add('NOT_IN_ANSWER_KEY');
    // A repeated printed number is only blocking on the stray (out-of-range) copy, never on the genuine one.
    if (seenNum.has(q.sourceNumber) && !inRange) f.add('DUP_NUMBER');
    else if (seenNum.has(q.sourceNumber) && !inRangeOf(result.questions[seenNum.get(q.sourceNumber)])) result.questions[seenNum.get(q.sourceNumber)].flags.push('DUP_NUMBER');
    seenNum.has(q.sourceNumber) || seenNum.set(q.sourceNumber, result.questions.indexOf(q));
    const plainExpl = q.explanation.replace(/<[^>]+>/g, ' ');
    if (!plainExpl.trim()) f.add('NO_EXPLANATION'); else if (CONTRADICTION.test(plainExpl)) f.add('EXPLANATION_SELF_CONTRADICTS'); else if (PLACEHOLDER_EXPL.test(plainExpl)) f.add('PLACEHOLDER_EXPLANATION');
    const tk = norm(q.stemText) + '|' + norm(Object.values(q.optionText).join('|'));
    if (seenText.has(tk)) f.add('DUP_QUESTION'); seenText.set(tk, q.number);
    q.flags = [...new Set([...(q.flags || []), ...f])];
    delete q.marked;
  }
  // Heuristic hard check the template can't express: a self-contradicting explanation also hides
  // hedging inside the stem; leave stems alone.
  const dupNums = [...new Set(result.questions.filter((q) => q.flags.includes('DUP_NUMBER')).map((q) => q.sourceNumber))];
  if (result.declared && result.questions.length !== result.declared) result.issues.push(`COUNT ${result.questions.length} questions in body != declared ${result.declared}`);
  if (dupNums.length) result.issues.push(`DUPLICATE_QUESTION_NUMBERS: ${dupNums.join(', ')}`);
  for (const s of result.sections) { const inR = result.questions.filter((q) => q.sectionId === s.id && q.sourceNumber >= s.from && q.sourceNumber <= s.to).length; if (inR !== s.to - s.from + 1) result.issues.push(`SECTION ${s.id} expects ${s.to - s.from + 1} (Q${s.from}-Q${s.to}) but has ${inR} in range; ${s.count} in section`); }
  const keyN = Object.keys(result.keyTable).length; if (result.declared && keyN !== result.declared) result.issues.push(`ANSWER_KEY has ${keyN} rows, declared ${result.declared}`);
  if (result.keyScheme && result.keyScheme.scheme === 'position' && result.keyScheme.agreeByPrinted < result.keyScheme.agreeByPosition) result.issues.push(`ANSWER_KEY follows body position, not printed Q-numbers (matches ${result.keyScheme.agreeByPosition}/${result.keyScheme.of} by position vs ${result.keyScheme.agreeByPrinted} by printed number) - numbering in the paper drifts`);
  return result;
}
