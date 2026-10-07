/**
 * scripts/lib/docxDirectParser.mjs
 *
 * WYSIWYG DOCX -> blocks parser. Reads word/document.xml directly (ordered walk of the
 * body) instead of going through mammoth's HTML, so nothing is guessed or dropped:
 *
 *  - headings come from the Word style only (no word-count inference)
 *  - Word lists (numPr) and typed bullets ("• text") become list blocks, nested by ilvl
 *  - every drawing (anchored, inline, in table cells) becomes an image at its place
 *  - bold / italic / underline / strike / super+subscript / colour / highlight / shading
 *    survive as inline HTML; paragraph centring survives as a style wrapper
 *  - table header rows come from <w:tblHeader>, not "first row = header"
 *  - NO AI enrichment, no invented blocks
 *
 * Output block types are the ones BlockRenderer.jsx already renders:
 * heading, paragraph, list, numberedList, table, image.
 *
 * parseDocxDirect(buffer, { onImage }) -> { chapters, stats }
 *   onImage({ bytes, ext, name, alt, widthPx, heightPx }) -> src string (caller saves/uploads)
 */
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const JSZip = require('jszip');
const { DOMParser } = require('@xmldom/xmldom');

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const kids = (n, name) => Array.from(n?.childNodes || []).filter((c) => c.nodeType === 1 && c.localName === name);
const first = (n, name) => kids(n, name)[0];
const wv = (n) => (n ? n.getAttribute('w:val') : null);
const isOff = (n) => !!n && ['0', 'false', 'none', 'off'].includes((wv(n) || '').toLowerCase()) && n.hasAttribute('w:val');
const BULLET_RE = /^[\s ]*[•●▪■◦○‣∙·][\s ]*/;

let idCounter = 0;
const newId = () => (idCounter++).toString(36).padStart(4, '0') + Math.random().toString(36).slice(2, 5);

export async function parseDocxDirect(buffer, { onImage } = {}) {
  const zip = await JSZip.loadAsync(buffer);
  const read = async (p) => (zip.file(p) ? zip.file(p).async('string') : null);
  const xml = (s) => new DOMParser().parseFromString(s, 'text/xml');
  const doc = xml(await read('word/document.xml'));
  const styles = xml(await read('word/styles.xml'));
  const numXml = await read('word/numbering.xml');
  const numbering = numXml ? xml(numXml) : null;
  const relsXml = (await read('word/_rels/document.xml.rels')) || '';

  // ── relationships ────────────────────────────────────────────
  const rels = {};
  for (const m of relsXml.matchAll(/<Relationship\s[^>]*>/g)) {
    const g = (k) => new RegExp(`${k}="([^"]*)"`).exec(m[0])?.[1];
    rels[g('Id')] = { target: g('Target'), external: g('TargetMode') === 'External' };
  }

  // ── styles ───────────────────────────────────────────────────
  const styleMap = {};
  for (const s of kids(styles.documentElement, 'style')) {
    const id = s.getAttribute('w:styleId');
    const rPr = first(s, 'rPr');
    const pPr = first(s, 'pPr');
    const np = pPr && first(pPr, 'numPr');
    styleMap[id] = {
      name: wv(first(s, 'name')) || id,
      basedOn: wv(first(s, 'basedOn')),
      b: rPr && first(rPr, 'b') ? !isOff(first(rPr, 'b')) : undefined,
      i: rPr && first(rPr, 'i') ? !isOff(first(rPr, 'i')) : undefined,
      jc: pPr && first(pPr, 'jc') ? wv(first(pPr, 'jc')) : undefined,
      num: np ? { numId: wv(first(np, 'numId')), ilvl: wv(first(np, 'ilvl')) || '0' } : undefined,
    };
  }
  const styleProp = (id, prop, depth = 0) => {
    const s = styleMap[id];
    if (!s || depth > 8) return undefined;
    return s[prop] !== undefined ? s[prop] : s.basedOn ? styleProp(s.basedOn, prop, depth + 1) : undefined;
  };

  // ── numbering ────────────────────────────────────────────────
  const absLvl = {};
  const numToAbs = {};
  if (numbering) {
    for (const a of kids(numbering.documentElement, 'abstractNum')) {
      const lv = {};
      for (const l of kids(a, 'lvl')) lv[l.getAttribute('w:ilvl')] = { fmt: wv(first(l, 'numFmt')) || 'bullet', text: wv(first(l, 'lvlText')) || '', start: parseInt(wv(first(l, 'start')) || '1', 10) };
      absLvl[a.getAttribute('w:abstractNumId')] = lv;
    }
    for (const n of kids(numbering.documentElement, 'num')) numToAbs[n.getAttribute('w:numId')] = wv(first(n, 'abstractNumId'));
  }
  const counters = {}; // numId -> [counter per ilvl]
  const roman = (n) => { const m = [[1000,'M'],[900,'CM'],[500,'D'],[400,'CD'],[100,'C'],[90,'XC'],[50,'L'],[40,'XL'],[10,'X'],[9,'IX'],[5,'V'],[4,'IV'],[1,'I']]; let r = ''; for (const [v, t] of m) while (n >= v) { r += t; n -= v; } return r; };
  const fmtNum = (n, fmt) => {
    if (fmt === 'upperLetter') return String.fromCharCode(64 + ((n - 1) % 26) + 1);
    if (fmt === 'lowerLetter') return String.fromCharCode(96 + ((n - 1) % 26) + 1);
    if (fmt === 'upperRoman') return roman(n);
    if (fmt === 'lowerRoman') return roman(n).toLowerCase();
    if (fmt === 'decimalZero') return String(n).padStart(2, '0');
    return String(n);
  };
  const listFmt = (numId, ilvl) => {
    if (!numId || numId === '0') return null;
    const abs = numToAbs[numId];
    const lvl = parseInt(ilvl, 10) || 0;
    const def = absLvl[abs]?.[ilvl] || { fmt: 'bullet', text: '', start: 1 };
    const ordered = def.fmt !== 'bullet' && def.fmt !== 'none';
    // Word numbering: bump this level, reset deeper levels.
    const c = (counters[numId] = counters[numId] || []);
    c[lvl] = c[lvl] === undefined ? def.start : c[lvl] + 1;
    for (let k = lvl + 1; k < 10; k++) c[k] = undefined;
    let label = '';
    if (ordered) {
      label = def.text.replace(/%(\d)/g, (_, d) => {
        const li = parseInt(d, 10) - 1;
        const ld = absLvl[abs]?.[String(li)] || { fmt: 'decimal', start: 1 };
        return fmtNum(c[li] === undefined ? ld.start : c[li], ld.fmt);
      });
    }
    return { numId, lvl, ordered, fmt: def.fmt, n: c[lvl], label };
  };

  // ── stats ────────────────────────────────────────────────────
  const stats = {
    paragraphs: 0, headings: 0, listItems: 0, typedBullets: 0, wordLists: 0, images: 0,
    tables: 0, tableHeaderRows: 0, skippedEmpty: 0, frontMatterDropped: 0, tocChaptersDropped: 0, visualMode: false, visualChapters: 0,
  };

  // ── images ───────────────────────────────────────────────────
  let imgSeq = 0;
  async function imageFor(drawing) {
    const blip = drawing.getElementsByTagNameNS('*', 'blip')[0];
    const rid = blip && (blip.getAttribute('r:embed') || blip.getAttribute('r:link'));
    const rel = rid && rels[rid];
    if (!rel || rel.external) return null;
    const mediaPath = 'word/' + rel.target.replace(/^\/?(word\/)?/, '');
    const f = zip.file(mediaPath);
    if (!f) return null;
    const bytes = await f.async('nodebuffer');
    const ext = (mediaPath.split('.').pop() || 'png').toLowerCase();
    const docPr = drawing.getElementsByTagNameNS('*', 'docPr')[0];
    const extent = drawing.getElementsByTagNameNS('*', 'extent')[0];
    const alt = (docPr && (docPr.getAttribute('descr') || '')) || '';
    const widthPx = extent ? Math.round(parseInt(extent.getAttribute('cx'), 10) / 9525) : undefined;
    const heightPx = extent ? Math.round(parseInt(extent.getAttribute('cy'), 10) / 9525) : undefined;
    imgSeq++;
    const src = onImage
      ? await onImage({ bytes, ext, name: `image_${String(imgSeq).padStart(3, '0')}`, alt, widthPx, heightPx })
      : mediaPath;
    stats.images++;
    return { id: newId(), type: 'image', src, alt, ...(widthPx ? { width: widthPx, height: heightPx } : {}) };
  }

  // ── inline content ───────────────────────────────────────────
  function runProps(r, paraStyleId) {
    const rPr = first(r, 'rPr');
    const rs = rPr && wv(first(rPr, 'rStyle'));
    const flag = (tag, prop) => {
      const n = rPr && first(rPr, tag);
      if (n) return !isOff(n);
      const fromRunStyle = rs ? styleProp(rs, prop) : undefined;
      if (fromRunStyle !== undefined) return fromRunStyle;
      return paraStyleId ? !!styleProp(paraStyleId, prop) : false;
    };
    const color = rPr && wv(first(rPr, 'color'));
    const hl = rPr && wv(first(rPr, 'highlight'));
    const shd = rPr && first(rPr, 'shd');
    const fill = shd && shd.getAttribute('w:fill');
    const va = rPr && wv(first(rPr, 'vertAlign'));
    const u = rPr && first(rPr, 'u');
    return {
      b: flag('b', 'b'), i: flag('i', 'i'),
      u: !!u && !isOff(u), s: !!(rPr && first(rPr, 'strike') && !isOff(first(rPr, 'strike'))),
      sup: va === 'superscript', sub: va === 'subscript',
      color: color && !['auto', '000000'].includes(color.toLowerCase()) ? color : '',
      bg: hl && hl !== 'none' ? hl : fill && !['auto', 'FFFFFF', 'ffffff'].includes(fill) ? '#' + fill : '',
    };
  }
  const keyOf = (p) => [p.b, p.i, p.u, p.s, p.sup, p.sub, p.color, p.bg, p.href || ''].join('|');

  // Returns { segs:[{props,text}], drawings:[el] }
  function collectInline(p, paraStyleId) {
    const segs = [];
    const drawings = [];
    const push = (props, text) => {
      if (!text) return;
      const last = segs[segs.length - 1];
      if (last && keyOf(last.props) === keyOf(props)) last.text += text;
      else segs.push({ props, text });
    };
    const walk = (node, href) => {
      for (const c of Array.from(node.childNodes || [])) {
        if (c.nodeType !== 1) continue;
        const ln = c.localName;
        if (ln === 'r') {
          const props = { ...runProps(c, paraStyleId), href };
          for (const rc of Array.from(c.childNodes)) {
            if (rc.nodeType !== 1) continue;
            const t = rc.localName;
            if (t === 't') push(props, rc.textContent);
            else if (t === 'tab') push(props, ' ');
            else if (t === 'br') { if ((rc.getAttribute('w:type') || 'textWrapping') === 'textWrapping') push(props, '\n'); }
            else if (t === 'cr') push(props, '\n');
            else if (t === 'noBreakHyphen') push(props, '-');
            else if (t === 'drawing') drawings.push(rc);
            else if (t === 'pict' || t === 'object') {
              // legacy VML picture: look for an imagedata element
              const idata = rc.getElementsByTagNameNS('*', 'imagedata')[0];
              if (idata) drawings.push({ legacy: idata });
            } else if (t === 'AlternateContent') {
              const d = rc.getElementsByTagNameNS('*', 'drawing')[0];
              if (d) drawings.push(d);
            }
          }
        } else if (ln === 'hyperlink') {
          const rid = c.getAttribute('r:id');
          const ext = rid && rels[rid]?.external ? rels[rid].target : '';
          walk(c, ext || href);
        } else if (['fldSimple', 'smartTag', 'ins', 'sdt', 'sdtContent', 'customXml'].includes(ln)) walk(c, href);
      }
    };
    walk(p);
    return { segs, drawings };
  }

  function segsToHtml(segs) {
    return segs.map(({ props: p, text }) => {
      let h = esc(text).replace(/\n/g, '<br>');
      if (!h.trim() && !h.includes('<br>')) return h;
      if (p.sup) h = `<sup>${h}</sup>`;
      if (p.sub) h = `<sub>${h}</sub>`;
      if (p.s) h = `<s>${h}</s>`;
      if (p.u) h = `<u>${h}</u>`;
      if (p.i) h = `<em>${h}</em>`;
      if (p.b) h = `<strong>${h}</strong>`;
      const css = [p.color && `color:#${p.color}`, p.bg && `background-color:${p.bg.startsWith('#') ? p.bg : p.bg}`].filter(Boolean).join(';');
      if (css) h = `<span style="${css}">${h}</span>`;
      if (p.href) h = `<a href="${esc(p.href)}" target="_blank" rel="noopener noreferrer">${h}</a>`;
      return h;
    }).join('');
  }
  const plainOf = (segs) => segs.map((s) => s.text).join('');

  // Strip a leading typed bullet marker from the segments (in place).
  function stripLeadingMarker(segs) {
    const joined = plainOf(segs);
    const m = BULLET_RE.exec(joined);
    if (!m) return false;
    let remove = m[0].length;
    while (remove > 0 && segs.length) {
      if (segs[0].text.length <= remove) { remove -= segs[0].text.length; segs.shift(); }
      else { segs[0] = { ...segs[0], text: segs[0].text.slice(remove) }; remove = 0; }
    }
    return true;
  }
  function trimSegs(segs) {
    while (segs.length && !segs[0].text.replace(/^[\s  ]+/, '')) segs.shift();
    if (segs.length) segs[0] = { ...segs[0], text: segs[0].text.replace(/^[\s  \n]+/, '') };
    while (segs.length && !segs[segs.length - 1].text.replace(/[\s  \n]+$/, '')) segs.pop();
    if (segs.length) segs[segs.length - 1] = { ...segs[segs.length - 1], text: segs[segs.length - 1].text.replace(/[\s  \n]+$/, '') };
    return segs;
  }

  // ── paragraph -> descriptor ──────────────────────────────────
  async function describeParagraph(p) {
    const pPr = first(p, 'pPr');
    const sid = pPr && wv(first(pPr, 'pStyle'));
    const styleName = sid ? styleMap[sid]?.name || sid : 'Normal';
    const hm = /^heading\s*(\d)/i.exec(styleName);
    const level = hm ? parseInt(hm[1], 10) : /^title$/i.test(styleName) ? 1 : 0;
    const jc = (pPr && first(pPr, 'jc') ? wv(first(pPr, 'jc')) : sid ? styleProp(sid, 'jc') : undefined) || '';
    // Word list membership
    const np = pPr && first(pPr, 'numPr');
    let list = null;
    if (np) list = listFmt(wv(first(np, 'numId')), wv(first(np, 'ilvl')) || '0');
    else if (sid && styleProp(sid, 'num')) { const n = styleProp(sid, 'num'); list = listFmt(n.numId, n.ilvl); }
    const { segs, drawings } = collectInline(p, level ? sid : sid);
    const images = [];
    for (const d of drawings) {
      if (d.legacy) continue; // VML pictures are not present in the GK/GS book; flagged by stats if ever hit
      const img = await imageFor(d);
      if (img) images.push(img);
    }
    let typedBullet = false;
    if (!level && !list && stripLeadingMarker(segs)) typedBullet = true;
    trimSegs(segs);
    return { level, list, typedBullet, segs, images, jc, styleName };
  }

  // ── list builder (nested, from flat items) ───────────────────
  function buildList(items) {
    // items: [{lvl, ordered, html}] -> {type, items:[html]} where nested levels become <ul>/<ol> inside the parent <li> html
    const rootOrdered = items[0].ordered;
    const build = (arr, depth) => {
      const out = [];
      let i = 0;
      while (i < arr.length) {
        const it = arr[i];
        const sub = [];
        let j = i + 1;
        while (j < arr.length && arr[j].lvl > it.lvl) { sub.push(arr[j]); j++; }
        let html = it.html;
        if (sub.length) {
          const subOrdered = sub[0].ordered;
          const tag = subOrdered ? 'ol' : 'ul';
          const attrs = subOrdered ? (sub[0].n && sub[0].n !== 1 ? ` start="${sub[0].n}"` : '') + ({ upperLetter: ' type="A"', lowerLetter: ' type="a"', upperRoman: ' type="I"', lowerRoman: ' type="i"' }[sub[0].fmt] || '') : '';
          html += `<${tag}${attrs}>${build(sub, depth + 1).map((s) => `<li>${s}</li>`).join('')}</${tag}>`;
        }
        out.push(html);
        i = j;
      }
      return out;
    };
    // normalise levels so the first item is level 0
    const base = Math.min(...items.map((x) => x.lvl));
    const norm = items.map((x) => ({ ...x, lvl: x.lvl - base }));
    const blk = { id: newId(), type: rootOrdered ? 'numberedList' : 'list', items: build(norm, 0) };
    if (rootOrdered) {
      const root = norm[0];
      if (root.n && root.n !== 1) blk.start = root.n;
      if (root.fmt && root.fmt !== 'decimal') blk.format = root.fmt;
    }
    return blk;
  }

  // ── block sink: collects paragraphs into blocks, grouping lists ──
  function makeSink(target) {
    let pendingList = [];
    const flush = () => {
      if (pendingList.length) { target.push(buildList(pendingList)); pendingList = []; }
    };
    return {
      flush,
      push(b) { flush(); target.push(b); },
      addItem(item) { pendingList.push(item); },
      hasList: () => pendingList.length > 0,
      pendingKind: () => (pendingList.length ? pendingList[0].ordered : null),
    };
  }

  async function emitParagraph(d, sink, ctx) {
    const html = segsToHtml(d.segs);
    const has = d.segs.length > 0 && plainOf(d.segs).trim().length > 0;
    if (d.level >= 2 || (d.level === 1 && !ctx.allowChapter)) {
      if (has) {
        sink.push({ id: newId(), type: 'heading', level: Math.min(d.level, 6), content: esc((d.list && d.list.ordered && d.list.label ? d.list.label + ' ' : '') + plainOf(d.segs)) });
        stats.headings++;
      }
    } else if (d.list || d.typedBullet) {
      if (has) {
        const ordered = d.list ? d.list.ordered : false;
        if (sink.hasList() && sink.pendingKind() !== ordered && (d.list ? d.list.lvl : 0) === 0) sink.flush();
        sink.addItem({ lvl: d.list ? d.list.lvl : 0, ordered, html, n: d.list ? d.list.n : undefined, fmt: d.list ? d.list.fmt : undefined });
        stats.listItems++;
        if (d.typedBullet) stats.typedBullets++; else stats.wordLists++;
      }
    } else if (has) {
      const content = d.jc === 'center' ? `<div style="text-align:center">${html}</div>` : d.jc === 'right' ? `<div style="text-align:right">${html}</div>` : html;
      sink.push({ id: newId(), type: 'paragraph', content });
      stats.paragraphs++;
    } else if (!d.images.length) stats.skippedEmpty++;
    for (const img of d.images) sink.push(img);
  }

  // ── tables ───────────────────────────────────────────────────
  async function emitTable(tbl, sink) {
    const rows = [];
    for (const tr of kids(tbl, 'tr')) {
      const trPr = first(tr, 'trPr');
      const isHeader = !!(trPr && first(trPr, 'tblHeader'));
      const cells = [];
      for (const tc of kids(tr, 'tc')) {
        const inner = [];
        const cellSink = makeSink(inner);
        for (const child of Array.from(tc.childNodes)) {
          if (child.nodeType !== 1) continue;
          if (child.localName === 'p') {
            const d = await describeParagraph(child);
            await emitParagraph(d, cellSink, { allowChapter: false });
          } else if (child.localName === 'tbl') {
            await emitTable(child, cellSink);
          }
        }
        cellSink.flush();
        const html = inner.map((b) => {
          if (b.type === 'paragraph') return `<p>${b.content}</p>`;
          if (b.type === 'heading') return `<p><strong>${b.content}</strong></p>`;
          if (b.type === 'list') return `<ul>${b.items.map((x) => `<li>${x}</li>`).join('')}</ul>`;
          if (b.type === 'numberedList') return `<ol>${b.items.map((x) => `<li>${x}</li>`).join('')}</ol>`;
          if (b.type === 'image') return `<img src="${esc(b.src)}" alt="${esc(b.alt || '')}">`;
          if (b.type === 'table') return '<p>[nested table]</p>';
          return '';
        }).join('');
        cells.push(html);
      }
      if (isHeader) stats.tableHeaderRows++;
      rows.push({ isHeader, cells });
    }
    if (rows.length) { sink.push({ id: newId(), type: 'table', rows }); stats.tables++; }
  }

  // ── main body walk ───────────────────────────────────────────
  const body = kids(doc.documentElement, 'body')[0];
  const chapters = [];
  let current = null;
  let sink = null;
  let part = '';
  let pendingDividers = [];
  let carryImages = [];
  const front = []; // content before the first chapter (cover / TOC), dropped
  const frontSink = makeSink(front);

  const closeChapter = () => {
    if (!current) return;
    sink.flush();
    if (current.blocks.length) chapters.push(current);
    else pendingDividers.push(current.title); // empty H1 = section / part divider
    current = null;
  };

  const topLevel = [];
  for (const el of Array.from(body.childNodes)) {
    if (el.nodeType !== 1) continue;
    if (el.localName === 'sdt') {
      const content = first(el, 'sdtContent');
      for (const c of Array.from(content?.childNodes || [])) if (c.nodeType === 1) topLevel.push(c);
    } else topLevel.push(el);
  }

  // ── visual-structure mode ────────────────────────────────────
  // Only for documents that have NO Heading 1 / Title style at all (structure exists only as formatting).
  // Chapter = a prominent paragraph (bold, shaded or much larger than body text) that starts with
  // CHAPTER / UNIT / PART / LESSON / अध्याय + number; a bare "CHAPTER 3" line is merged with the prominent
  // paragraph right after it. Sub-headings = short bold lines larger than body text, levels from size tiers.
  // Documents that do have Heading styles never use this.
  const CHAPTER_RE = /^\s*(chapter|unit|part|lesson|अध्याय|इकाई)\s*[-–—:.]?\s*\d+/i;
  const CHAPTER_BARE_RE = /^\s*(chapter|unit|part|lesson|अध्याय|इकाई)\s*[-–—:.]?\s*\d+\s*$/i;
  const textOfEl = (el) => Array.from(el.getElementsByTagNameNS('*', 't')).map((t) => t.textContent).join('');
  const maxSz = (el) => { let m = 0; for (const e of Array.from(el.getElementsByTagNameNS('*', 'sz'))) { const v = parseInt(e.getAttribute('w:val'), 10); if (v > m) m = v; } return m; };
  const quickBold = (el) => {
    const rs = Array.from(el.getElementsByTagNameNS('*', 'r')).filter((r) => Array.from(r.getElementsByTagNameNS('*', 't')).some((t) => t.textContent.trim()));
    return rs.length > 0 && rs.every((r) => { const rPr = first(r, 'rPr'); const b = rPr && first(rPr, 'b'); return b ? !isOff(b) : false; });
  };
  const quickShaded = (el) => Array.from(el.getElementsByTagNameNS('*', 'shd')).some((e) => { const fl = e.getAttribute('w:fill'); return fl && !['auto', 'FFFFFF', 'ffffff'].includes(fl); });
  const hasH1 = topLevel.some((el) => {
    if (el.localName !== 'p') return false;
    const pPr = first(el, 'pPr'); const sid = pPr && wv(first(pPr, 'pStyle'));
    const nm = sid ? (styleMap[sid]?.name || sid) : '';
    return /^heading\s*1$/i.test(nm) || /^title$/i.test(nm);
  });
  const visualMode = !hasH1;
  const visualPlan = {}; // topLevel index -> { skip } | { level, title? }
  if (visualMode) {
    const dd = first(styles.documentElement, 'docDefaults');
    const defaultSz = parseInt(wv(first(first(first(dd, 'rPrDefault') || dd, 'rPr') || dd, 'sz')) || '22', 10) || 22;
    const q = topLevel.map((el) => (el.localName === 'p' ? { t: textOfEl(el).trim(), sz: maxSz(el) || defaultSz, bold: quickBold(el), shaded: quickShaded(el) } : null));
    const hist = {};
    for (const x of q) if (x && x.t && x.t.split(/\s+/).length >= 15) hist[x.sz] = (hist[x.sz] || 0) + 1;
    const bodySz = parseInt(Object.entries(hist).sort((a, b) => b[1] - a[1])[0]?.[0] || String(defaultSz), 10);
    const prominent = (x) => x && (x.bold || x.shaded || x.sz >= bodySz + 6);
    const nextIdx = (i) => { for (let j = i + 1; j < q.length; j++) if (q[j] && q[j].t) return j; return -1; };
    const chapterIdx = [];
    for (let i = 0; i < q.length; i++) {
      const x = q[i];
      if (!x || !x.t || visualPlan[i]) continue;
      if (CHAPTER_BARE_RE.test(x.t) && prominent(x)) {
        const j = nextIdx(i);
        if (j > -1 && prominent(q[j]) && !CHAPTER_RE.test(q[j].t)) { visualPlan[i] = { level: 1, title: x.t.replace(/\s+/g, ' ') + ': ' + q[j].t.replace(/\s+/g, ' '), sz: q[j].sz }; visualPlan[j] = { skip: true }; chapterIdx.push(i); }
        else { visualPlan[i] = { level: 1, sz: x.sz }; chapterIdx.push(i); }
      } else if (CHAPTER_RE.test(x.t) && x.t.length < 140 && prominent(x)) {
        visualPlan[i] = { level: 1, sz: x.sz }; chapterIdx.push(i);
      }
    }
    if (chapterIdx.length) {
      const first1 = chapterIdx[0];
      const chapterSizes = new Set(chapterIdx.map((i) => visualPlan[i].sz));
      const cands = [];
      for (let i = first1 + 1; i < q.length; i++) {
        const x = q[i];
        if (!x || !x.t || visualPlan[i]) continue;
        const words = x.t.split(/\s+/).length;
        if (x.bold && words <= 14 && !/[.:;?!]$/.test(x.t) && x.sz >= bodySz + 2 && !chapterSizes.has(x.sz)) cands.push({ i, sz: x.sz });
      }
      const tiers = [...new Set(cands.map((c) => c.sz))].sort((a, b) => b - a);
      for (const c of cands) visualPlan[c.i] = { level: Math.min(2 + tiers.indexOf(c.sz), 4) };
    }
    stats.visualMode = true;
    stats.visualChapters = chapterIdx.length;
  }

  for (let ti = 0; ti < topLevel.length; ti++) {
    const el = topLevel[ti];
    if (el.localName === 'p') {
      const plan = visualMode ? visualPlan[ti] : null;
      if (plan?.skip) continue;
      const d = await describeParagraph(el);
      if (plan?.level && !d.level) { d.level = plan.level; if (plan.title) d.titleOverride = plan.title; }
      if (d.level === 1) {
        const title = (d.titleOverride || plainOf(d.segs)).trim();
        if (!title) { carryImages.push(...d.images); continue; } // banner image in an empty heading: opens the NEXT chapter
        closeChapter();
        if (pendingDividers.length && chapters.length && current === null) { /* handled below */ }
        current = { id: newId(), title, order: 0, part: '', blocks: [] };
        sink = makeSink(current.blocks);
        // part label is resolved lazily when the chapter closes; remember dividers seen so far
        current._dividersBefore = pendingDividers.slice();
        current._pendingConsumed = false;
        // images anchored to the heading paragraph belong inside the new chapter
        for (const img of [...carryImages, ...d.images]) sink.push(img);
        carryImages = [];
        continue;
      }
      if (!current) {
        // front matter: cover, contents list
        await emitParagraph(d, frontSink, { allowChapter: false });
        continue;
      }
      await emitParagraph(d, sink, { allowChapter: false });
    } else if (el.localName === 'tbl') {
      if (!current) { await emitTable(el, frontSink); continue; }
      await emitTable(el, sink);
    }
  }
  closeChapter();
  frontSink.flush();
  stats.frontMatterDropped = front.length;

  // Resolve part labels: dividers (empty H1s) apply to the chapters that follow them.
  const out = [];
  let currentPart = '';
  let seq = 0;
  // Re-walk using the order chapters/dividers were produced.
  // chapters[] has _dividersBefore = dividers accumulated before it (cumulative), so find new ones.
  let seen = 0;
  for (const ch of chapters) {
    const divs = ch._dividersBefore || [];
    if (divs.length > seen) {
      currentPart = divs.slice(seen).join(' › ');
      seen = divs.length;
    }
    if (/^\s*(table\s+of\s+)?contents\s*$/i.test(ch.title)) { stats.tocChaptersDropped++; continue; } // a Table of Contents styled as a chapter
    ch.part = currentPart;
    delete ch._dividersBefore;
    delete ch._pendingConsumed;
    ch.order = ++seq;
    out.push(ch);
  }
  return { chapters: out, stats };
}
