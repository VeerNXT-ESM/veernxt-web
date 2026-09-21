#!/usr/bin/env node
/**
 * scripts/split_orphaned_state_books.mjs
 *
 * Parses the 18 genuinely-orphaned state/UT books -- source .docx files
 * that only exist under FINAL_CONTENT\Final Documents\MASTER DOCUMENTS
 * (never carried into the Cluster_-numbered pipeline everything else went
 * through) -- into the same public/books/Guide/{title}/{chapters,metadata}
 * shape sync_books_to_r2.mjs expects, using the same mammoth+xmldom parsing
 * engine already proven in split_large_books.mjs (H1-style-driven chapter
 * detection, inline image extraction via mammoth.images.inline).
 *
 * Scope note: a raw file-existence diff against the Cluster_ source pool
 * found 33 candidate filenames, but live-checking resources first found
 * 15 of those already have a 'blocks'-format row today (via a differently
 * numbered Cluster_ counterpart that already went through processing) --
 * those are deliberately excluded here to avoid clobbering good content
 * with an older draft. Only the 18 confirmed still-'html'-or-missing rows
 * are targeted:
 *   15 exist as resources rows on format='html' -- output folder titles
 *   below match those existing row titles EXACTLY (including their quirks:
 *   "MAHARSHTRA GS", "WB_Police_ SI") so sync_books_to_r2.mjs flips the
 *   SAME row in place instead of creating a duplicate.
 *   3 (Ladakh/Lakshadweep/Puducherry) have no row at all -- new ingest.
 *
 * This script only parses/splits -- no Gemini enrichment, no R2/DB writes.
 * Run scripts/sync_books_to_r2.mjs --execute separately afterward.
 *
 * Usage:
 *   node scripts/split_orphaned_state_books.mjs             # dry run
 *   node scripts/split_orphaned_state_books.mjs --execute    # writes public/books/Guide/*
 */
import fs from 'node:fs';
import path from 'node:path';
import mammoth from 'mammoth';
import { DOMParser, XMLSerializer } from '@xmldom/xmldom';

const EXECUTE = process.argv.includes('--execute');

const SOURCE_ROOT = 'K:\\H DRIVE\\Quantum Climb\\CLIENT ASSETS\\VeerNXT\\CONTENT\\FINAL_CONTENT\\Final Documents\\MASTER DOCUMENTS';
const OUTPUT_ROOT = path.resolve('public/books/Guide');

const TARGETS = [
  { relPath: 'Guide/GS BOOK STATE/Andhra_Pradesh CONSTABLE (1).docx', title: 'Andhra_Pradesh CONSTABLE' },
  { relPath: 'Guide/GS BOOK STATE/Himachal_Pradesh_CONSTABLE (1).docx', title: 'Himachal_Pradesh_CONSTABLE' },
  { relPath: 'Guide/GS BOOK STATE/Jharkhand_GS_Book (1).docx', title: 'Jharkhand_GS_Book' },
  { relPath: 'Guide/GS BOOK STATE/Karnataka_CONSTABLE (1).docx', title: 'Karnataka_CONSTABLE' },
  { relPath: 'Guide/GS BOOK STATE/MAHARSHTRA GS (1).docx', title: 'MAHARSHTRA GS' },
  { relPath: 'Guide/GS BOOK STATE/Madhya_Pradesh_GS (1).docx', title: 'Madhya_Pradesh_GS' },
  { relPath: 'Guide/GS BOOK STATE/Manipur_GS_Book.docx', title: 'Manipur_GS_Book' },
  { relPath: 'Guide/GS BOOK STATE/Meghalaya_GS_Book.docx', title: 'Meghalaya_GS_Book' },
  { relPath: 'Guide/GS BOOK STATE/Mizoram_GS_Book (1).docx', title: 'Mizoram_GS_Book' },
  { relPath: 'Guide/GS BOOK STATE/Odisha CONSTABLE (1).docx', title: 'Odisha CONSTABLE' },
  { relPath: 'Guide/GS BOOK STATE/RAJASTHAN SI GS GUIDE (1).docx', title: 'RAJASTHAN SI GS GUIDE' },
  { relPath: 'Guide/GS BOOK STATE/TamilNadu CONSTABLE (1).docx', title: 'TamilNadu CONSTABLE' },
  { relPath: 'Guide/GS BOOK STATE/Telangana_CONSTABLE.docx', title: 'Telangana_CONSTABLE' },
  { relPath: 'Guide/GS BOOK STATE/Tripura_CONSTABLE.docx', title: 'Tripura_CONSTABLE' },
  { relPath: 'Guide/GS BOOK STATE/WB_Police_ SI.docx', title: 'WB_Police_ SI' },
  { relPath: 'Guide/GS BOOK UT/Ladakh_GS_Book.docx', title: 'Ladakh_GS_Book' },
  { relPath: 'Guide/GS BOOK UT/Lakshadweep_GS_Book.docx', title: 'Lakshadweep_GS_Book' },
  { relPath: 'Guide/GS BOOK UT/Puducherry_GS_Book.docx', title: 'Puducherry_GS_Book' },
];

function generateId() {
  return Math.random().toString(36).substring(2, 9);
}

const serializer = new XMLSerializer();
function getInnerHtml(node) {
  let str = '';
  if (node && node.childNodes) {
    for (let i = 0; i < node.childNodes.length; i++) {
      str += serializer.serializeToString(node.childNodes[i]);
    }
  }
  return str;
}

function classifyParagraph(element) {
  const text = element.textContent.replace(/\u00A0/g, ' ').trim();
  if (!text) return null;

  const firstChild = element.firstChild;
  if (firstChild && (firstChild.nodeName === 'STRONG' || firstChild.nodeName === 'B')) {
    const prefix = firstChild.textContent.trim().toUpperCase();
    const content = getInnerHtml(element);
    if (prefix.includes('IMPORTANT') || prefix.includes('WARNING')) return { type: 'important', content };
    if (prefix.includes('EXAM TIP') || prefix.includes('TRICK') || prefix.includes('SHORTCUT')) return { type: 'examTip', content };
    if (prefix.includes('DEFINITION') || prefix.includes('CONCEPT')) return { type: 'definition', content };
    if (prefix.includes('EXAMPLE') || prefix.includes('FOR INSTANCE')) return { type: 'example', content };
    if (prefix.includes('NOTE') || prefix.includes('DID YOU KNOW')) return { type: 'callout', content };
  }

  const wordCount = text.split(/\s+/).length;
  if (wordCount <= 5 && !text.endsWith('.') && !text.endsWith('?') && !text.endsWith(':') && !text.endsWith(';')) {
    return { type: 'heading', level: 4, content: getInnerHtml(element) };
  }
  return { type: 'paragraph', content: getInnerHtml(element) };
}

/** Parses a DOCX into { book: {title, chapters:[{title,order,blocks}]}, extractedImages }. Same engine as split_large_books.mjs. */
async function parseDocxWithImages(docxPath) {
  const extractedImages = [];
  const options = {
    styleMap: [
      "p[style-name='Heading 1'] => h1:fresh",
      "p[style-name='Heading 2'] => h2:fresh",
      "p[style-name='Heading 3'] => h3:fresh",
      "p[style-name='Title'] => h1:fresh",
      "p[style-name='Subtitle'] => h2:fresh",
      "p[style-name='Quote'] => blockquote:fresh",
      "p[style-name='Intense Quote'] => blockquote:fresh",
    ],
    convertImage: mammoth.images.inline((element) =>
      element.read().then((imageBuffer) => {
        const imgId = generateId();
        const extension = element.contentType.split('/')[1] || 'png';
        extractedImages.push({ id: imgId, buffer: imageBuffer, extension });
        return { src: `__IMG_REF__:${imgId}` };
      })
    ),
  };

  const buffer = fs.readFileSync(docxPath);
  const result = await mammoth.convertToHtml({ buffer }, options);
  const wrappedHtml = `<html><body>${result.value}</body></html>`;
  const doc = new DOMParser().parseFromString(wrappedHtml, 'text/xml');

  const book = { title: path.basename(docxPath, '.docx'), chapters: [] };
  let currentChapter = null;
  const ensureChapter = () => {
    if (!currentChapter) {
      currentChapter = { title: 'Introduction', order: book.chapters.length + 1, blocks: [] };
      book.chapters.push(currentChapter);
    }
  };

  // Headings use el.textContent for their title text, which silently drops
  // any <img> nested inside the same heading run (verified live: 11 of 14
  // images in one source doc are embedded directly inside H1/H2 elements
  // alongside the heading text, e.g. a small icon next to a chapter title
  // -- not in a separate paragraph at all). Push those as explicit image
  // blocks into whichever blocks array the caller is currently building.
  function pushEmbeddedImages(el, blocksArray) {
    for (const img of Array.from(el.getElementsByTagName('img'))) {
      const src = img.getAttribute('src') || '';
      const imgId = src.startsWith('__IMG_REF__:') ? src.slice('__IMG_REF__:'.length) : null;
      if (imgId) blocksArray.push({ id: generateId(), type: 'image', imageId: imgId, src });
    }
  }

  const elements = Array.from(doc.documentElement.getElementsByTagName('body')[0].childNodes);
  for (const el of elements) {
    if (!el.tagName) continue;
    const nodeName = el.tagName.toUpperCase();

    if (nodeName === 'H1') {
      currentChapter = { title: el.textContent.trim() || 'Untitled Chapter', order: book.chapters.length + 1, blocks: [] };
      book.chapters.push(currentChapter);
      pushEmbeddedImages(el, currentChapter.blocks);
      continue;
    }

    ensureChapter();

    if (nodeName === 'H2') {
      currentChapter.blocks.push({ id: generateId(), type: 'heading', level: 2, content: el.textContent.trim() });
      pushEmbeddedImages(el, currentChapter.blocks);
    } else if (nodeName === 'H3' || nodeName === 'H4') {
      currentChapter.blocks.push({ id: generateId(), type: 'heading', level: 3, content: el.textContent.trim() });
      pushEmbeddedImages(el, currentChapter.blocks);
    } else if (nodeName === 'P') {
      // An image sitting alone in its own paragraph (no caption/text) has
      // empty .textContent, so classifyParagraph() returns null for it and
      // the image is silently dropped. Handle it as an explicit image
      // block, matching the {id,type:'image',imageId,src} shape already
      // used elsewhere (e.g. Bihar_GS's chapter-1.json).
      if (!el.textContent.trim() && el.getElementsByTagName('img').length > 0) {
        pushEmbeddedImages(el, currentChapter.blocks);
      } else {
        const block = classifyParagraph(el);
        if (block) { block.id = generateId(); currentChapter.blocks.push(block); }
      }
    } else if (nodeName === 'UL') {
      const items = Array.from(el.getElementsByTagName('li')).map((li) => getInnerHtml(li));
      currentChapter.blocks.push({ id: generateId(), type: 'list', items });
    } else if (nodeName === 'OL') {
      const items = Array.from(el.getElementsByTagName('li')).map((li) => getInnerHtml(li));
      currentChapter.blocks.push({ id: generateId(), type: 'numberedList', items });
    } else if (nodeName === 'BLOCKQUOTE') {
      currentChapter.blocks.push({ id: generateId(), type: 'callout', content: getInnerHtml(el) });
    } else if (nodeName === 'TABLE') {
      const rows = [];
      let isHeader = true;
      for (const tr of Array.from(el.getElementsByTagName('tr'))) {
        const cells = Array.from(tr.childNodes).filter((n) => n.nodeName === 'td' || n.nodeName === 'th').map((td) => getInnerHtml(td));
        rows.push({ isHeader, cells });
        isHeader = false;
      }
      if (rows.length > 0) currentChapter.blocks.push({ id: generateId(), type: 'table', rows });
    }
  }

  // Exact match only -- a real chapter titled e.g. "CHAPTER 1: ODISHA –
  // INTRODUCTION & BASIC FACTS" must never be confused with the literal
  // ensureChapter() fallback title "Introduction" (a substring check here
  // silently dropped that real chapter entirely -- caught live before
  // writing anything, via a dry run showing Odisha/Rajasthan missing their
  // Chapter 1).
  const isFallbackIntro = (title) => title.trim().toLowerCase() === 'introduction';
  const hasOtherChapters = book.chapters.some((ch) => !isFallbackIntro(ch.title));
  book.chapters = book.chapters.filter((ch) => {
    return ch.blocks.length > 0 && (!isFallbackIntro(ch.title) || !hasOtherChapters);
  });
  book.chapters.forEach((ch, idx) => { ch.order = idx + 1; });

  return { book, extractedImages };
}

const IMAGE_EXT_TO_CONTENT_TYPE = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg' };

async function processTarget(target) {
  const docxPath = path.join(SOURCE_ROOT, target.relPath);
  console.log(`\n=== "${target.title}" ===`);
  if (!fs.existsSync(docxPath)) {
    console.log(`  [SKIP] source not found: ${docxPath}`);
    return;
  }

  const { book, extractedImages } = await parseDocxWithImages(docxPath);
  if (book.chapters.length === 0) {
    console.log(`  [SKIP] parsed to zero chapters -- something's wrong with this source file.`);
    return;
  }

  console.log(`  Parsed ${book.chapters.length} chapters, ${extractedImages.length} images.`);
  book.chapters.forEach((ch) => console.log(`    ${ch.order}. "${ch.title}" — ${ch.blocks.length} blocks`));

  if (!EXECUTE) return;

  const bookDir = path.join(OUTPUT_ROOT, target.title);
  const chaptersDir = path.join(bookDir, 'chapters');
  const imagesDir = path.join(bookDir, 'images');
  fs.mkdirSync(chaptersDir, { recursive: true });
  fs.mkdirSync(imagesDir, { recursive: true });

  // Rewrite __IMG_REF__ placeholders to local relative paths and save image files.
  const jsonStr = JSON.stringify(book.chapters);
  const referencedImageIds = new Set([...jsonStr.matchAll(/__IMG_REF__:([a-z0-9]+)/g)].map((m) => m[1]));
  let updatedJsonStr = jsonStr;
  let savedImages = 0;
  for (const img of extractedImages) {
    if (!referencedImageIds.has(img.id)) continue;
    const fileName = `image_${img.id}.${img.extension}`;
    fs.writeFileSync(path.join(imagesDir, fileName), img.buffer);
    updatedJsonStr = updatedJsonStr.replaceAll(`__IMG_REF__:${img.id}`, `/books/Guide/${target.title}/images/${fileName}`);
    savedImages++;
  }
  const finalChapters = JSON.parse(updatedJsonStr);

  for (const ch of finalChapters) {
    const chapterOut = { id: generateId(), title: ch.title, order: ch.order, blocks: ch.blocks, enriched: false };
    fs.writeFileSync(path.join(chaptersDir, `chapter-${ch.order}.json`), JSON.stringify(chapterOut, null, 2));
  }

  const metadata = {
    book_id: generateId(),
    title: target.title,
    source_file: target.relPath,
    category: 'Guide',
    chapter_count: finalChapters.length,
    image_count: savedImages,
    chapters: finalChapters.map((ch) => ({
      title: ch.title, order: ch.order, enriched: false, blocks_count: ch.blocks.length, file_name: `chapters/chapter-${ch.order}.json`,
    })),
  };
  fs.writeFileSync(path.join(bookDir, 'metadata.json'), JSON.stringify(metadata, null, 2));
  console.log(`  [WRITTEN] ${finalChapters.length} chapters, ${savedImages} images -> ${bookDir}`);
}

async function main() {
  console.log(`Mode: ${EXECUTE ? 'EXECUTE (writing public/books/Guide/*)' : 'DRY RUN (no writes)'}`);
  for (const target of TARGETS) await processTarget(target);
  if (!EXECUTE) console.log('\nDry run only -- re-run with --execute to write.');
}

main().catch((err) => { console.error('Fatal error:', err); process.exit(1); });
