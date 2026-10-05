#!/usr/bin/env node
/**
 * scripts/reparse_book_direct.mjs
 *
 * Re-parses ONE book DOCX with the WYSIWYG direct parser (scripts/lib/docxDirectParser.mjs)
 * into a local folder. Does NOT touch Supabase or R2 -- upload/replace is a separate step.
 *
 * Usage:
 *   node scripts/reparse_book_direct.mjs --src "<file.docx>" --title "GKGS 2026" --category Guide [--out <dir>]
 *
 * Output (default FINAL_BOOKS_STRUCTURED/<category>/<slug>/):
 *   metadata.json, chapters/chapter-N.json, images/image_NNN.ext, parse_report.json, preview.html
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseDocxDirect } from './lib/docxDirectParser.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const arg = (f) => { const i = process.argv.indexOf(f); return i > -1 ? process.argv[i + 1] : null; };
const SRC = arg('--src');
const TITLE = arg('--title');
const CATEGORY = arg('--category') || 'Guide';
if (!SRC || !TITLE) { console.error('Usage: --src <docx> --title <title> [--category Guide|Precis] [--out dir]'); process.exit(1); }

const slug = `${CATEGORY.toLowerCase()}-${TITLE.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')}`;
const OUT = arg('--out') || path.join(__dirname, '..', 'FINAL_BOOKS_STRUCTURED', CATEGORY, slug);
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(path.join(OUT, 'chapters'), { recursive: true });
fs.mkdirSync(path.join(OUT, 'images'), { recursive: true });

const { chapters, stats } = await parseDocxDirect(fs.readFileSync(SRC), {
  onImage: async ({ bytes, ext, name }) => {
    const file = `${name}.${ext}`;
    fs.writeFileSync(path.join(OUT, 'images', file), bytes);
    return `images/${file}`; // relative; rewritten to the R2 URL at upload time
  },
});

const typeCounts = {};
for (const ch of chapters) {
  fs.writeFileSync(path.join(OUT, 'chapters', `chapter-${ch.order}.json`), JSON.stringify(ch, null, 2));
  for (const b of ch.blocks) typeCounts[b.type] = (typeCounts[b.type] || 0) + 1;
}
const metadata = {
  book_id: slug,
  title: TITLE,
  source_file: path.basename(SRC),
  source_path: SRC,
  category: CATEGORY,
  parser: 'docxDirectParser v1 (no AI enrichment)',
  chapter_count: chapters.length,
  image_count: stats.images,
  chapters: chapters.map((ch) => ({ title: ch.title, order: ch.order, part: ch.part, enriched: false, blocks_count: ch.blocks.length, file_name: `chapters/chapter-${ch.order}.json` })),
};
fs.writeFileSync(path.join(OUT, 'metadata.json'), JSON.stringify(metadata, null, 2));
fs.writeFileSync(path.join(OUT, 'parse_report.json'), JSON.stringify({ stats, typeCounts }, null, 2));

// ── static preview (same tags/classes the reader uses, minimal CSS) ──
const blockHtml = (b) => {
  switch (b.type) {
    case 'heading': return `<h${b.level} class="bk-heading bk-h${b.level}">${b.content}</h${b.level}>`;
    case 'paragraph': return `<div class="bk-paragraph">${b.content}</div>`;
    case 'image': return `<figure class="bk-image-block"><img src="${b.src}" alt="${b.alt || ''}"></figure>`;
    case 'list': return `<ul class="bk-list">${b.items.map((i) => `<li>${i}</li>`).join('')}</ul>`;
    case 'numberedList': return `<ol class="bk-numbered-list">${b.items.map((i) => `<li>${i}</li>`).join('')}</ol>`;
    case 'table': return `<div class="bk-table-wrapper"><table class="bk-table"><tbody>${b.rows.map((r) => `<tr>${r.cells.map((c) => (r.isHeader ? `<th>${c}</th>` : `<td>${c}</td>`)).join('')}</tr>`).join('')}</tbody></table></div>`;
    default: return `<pre>${b.type}</pre>`;
  }
};
const toc = chapters.map((c) => `<li><a href="#c${c.order}">${c.part ? `<small>${c.part} &rsaquo;</small> ` : ''}${c.title}</a></li>`).join('');
const html = `<!doctype html><meta charset="utf-8"><title>${TITLE} preview</title>
<style>body{font:15px/1.55 system-ui,sans-serif;max-width:900px;margin:0 auto;padding:24px;color:#0f172a}
h1.ch{border-top:3px solid #F14C35;padding-top:18px;margin-top:48px}h2{font-size:20px}h3{font-size:17px}h4{font-size:15px}
img{max-width:100%;height:auto}figure{margin:12px 0}table{border-collapse:collapse;width:100%;margin:12px 0}
td,th{border:1px solid #cbd5e1;padding:6px 8px;vertical-align:top;text-align:left}th{background:#f1f5f9}
ul,ol{padding-left:24px}li ul,li ol{margin:2px 0}p{margin:0}small{color:#64748b}</style>
<h1>${TITLE} <small>(${chapters.length} chapters, ${stats.images} images)</small></h1><ol>${toc}</ol>
${chapters.map((c) => `<h1 class="ch" id="c${c.order}">${c.part ? `<small>${c.part}</small><br>` : ''}${c.title}</h1>${c.blocks.map(blockHtml).join('\n')}`).join('\n')}`;
fs.writeFileSync(path.join(OUT, 'preview.html'), html);

console.log('Output:', OUT);
console.log('Chapters:', chapters.length, '| images:', stats.images);
console.log('Block types:', typeCounts);
console.log('Stats:', stats);
