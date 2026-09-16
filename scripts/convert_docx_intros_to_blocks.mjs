#!/usr/bin/env node
/**
 * scripts/convert_docx_intros_to_blocks.mjs
 *
 * Converts the client's source Introduction docx files (one per exam,
 * living in a "*INTRO*" folder under <exam folder> under
 * K:\...\CONTENT\ORIGINAL CONTENT -- the file itself is NOT consistently
 * named "Introduction.docx", most are named after the exam, e.g.
 * "CGL.docx", "SSC MTS.docx") into the same blocks-JSON format the
 * Guide/Precis books already use (public/books/{Guide,Precis}/<title>/
 * metadata.json + chapters/chapter-1.json -- see BlockRenderer.jsx /
 * BookBlocks.jsx for the block types this must match). No AI/Gemini
 * involved: this is a deterministic docx -> HTML (mammoth) -> blocks walk,
 * ported from the browser-only src/lib/mammothParser.js (used today only
 * by the sandbox reader) to run here in Node against real files, using
 * mammoth's own bundled @xmldom/xmldom for DOMParser instead of the
 * browser's.
 *
 * Each Introduction becomes exactly ONE chapter (order 1) -- unlike a
 * multi-chapter Guide/Precis book, an Introduction is "a single simple
 * document" (see ExamIntroCard.jsx's own docstring), so Word H1/H2/H3
 * headings all become heading blocks at different levels rather than
 * triggering new chapters the way mammothParser.js's sandbox version does.
 *
 * Deliberately dropped: embedded images. Every sample Introduction docx
 * inspected so far embeds one large base64 letterhead/logo image at the
 * top (multi-MB) and nothing else visual -- inlining that into JSON would
 * bloat every file for zero reading value. Images are counted and reported
 * per file so a human can sanity-check nothing real got skipped; add real
 * image upload (R2, like migrate_resources_to_blocks.mjs does) if a future
 * batch of Introductions turns out to have real inline figures.
 *
 * Paragraph classification (heading vs. paragraph vs. callout) heuristic,
 * differs from mammothParser.js in one way found live on real content: a
 * bold-led paragraph is only classified as important/examTip/definition/
 * example/callout when there is BODY TEXT after the bold lead-in (e.g.
 * "**IMPORTANT:** don't forget X"). A bold-only paragraph like
 * "**Important Links**" falls through to the short-heading heuristic
 * instead of becoming a misleading warning-styled callout box -- this was
 * a real misclassification seen on scripts/_tmp_test... testing against
 * CENTRAL EXAMS\06.NURSING\...\RRB\...\Staff Nurse\1. INTRO\Introduction.docx.
 *
 * This script only WRITES local JSON (public/FINAL_INTROS_STRUCTURED/) --
 * it does not touch Supabase, upload to R2, or link anything to an exam.
 * That's a deliberately separate follow-up step (see
 * scripts/content/migrate_resources_to_blocks.mjs for the shape that step
 * would take).
 *
 * Usage:
 *   node scripts/convert_docx_intros_to_blocks.mjs                 (dry run, reports what it would do)
 *   node scripts/convert_docx_intros_to_blocks.mjs --execute        (writes the JSON files)
 *   node scripts/convert_docx_intros_to_blocks.mjs --execute --limit 5   (only the first 5, for spot-checking)
 *   node scripts/convert_docx_intros_to_blocks.mjs --execute --only "Staff Nurse"  (path must contain this substring)
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import mammoth from 'mammoth';
import { DOMParser, XMLSerializer } from '@xmldom/xmldom';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ARGS = process.argv.slice(2);
const EXECUTE = ARGS.includes('--execute');
const LIMIT = (() => {
  const i = ARGS.indexOf('--limit');
  return i >= 0 ? parseInt(ARGS[i + 1], 10) : Infinity;
})();
const ONLY = (() => {
  const i = ARGS.indexOf('--only');
  return i >= 0 ? ARGS[i + 1] : null;
})();
const ROOT_OVERRIDE = (() => {
  const i = ARGS.indexOf('--root');
  return i >= 0 ? ARGS[i + 1] : null;
})();

// Defaults to the K: drive mirror; pass --root to point at another copy of
// the same tree (e.g. a synced Google Drive folder) without editing this
// file -- both are expected to share the CENTRAL/STATE/UT EXAMS layout.
const CONTENT_ROOT = ROOT_OVERRIDE || String.raw`K:\H DRIVE\Quantum Climb\CLIENT ASSETS\VeerNXT\CONTENT\ORIGINAL CONTENT`;
// Deliberately NOT under public/ -- anything there ships with the deployed
// app, and this is local intermediate conversion output (already uploaded
// to R2 by link_intros_to_exams.mjs), not something meant to be publicly
// fetchable at <site>/FINAL_INTROS_STRUCTURED/... once built.
const OUTPUT_ROOT = path.join(__dirname, '..', 'FINAL_INTROS_STRUCTURED');

export const STYLE_MAP = [
  "p[style-name='Heading 1'] => h1:fresh",
  "p[style-name='Heading 2'] => h2:fresh",
  "p[style-name='Heading 3'] => h3:fresh",
  "p[style-name='Title'] => h1:fresh",
  "p[style-name='Subtitle'] => h2:fresh",
  "p[style-name='Quote'] => blockquote:fresh",
  "p[style-name='Intense Quote'] => blockquote:fresh",
];

// ── filesystem walk ──────────────────────────────────────────────
// Live count against CENTRAL EXAMS (2026-09-12): 443 folders named
// "*INTRO*" -- 181 have only a .docx, 178 have a .docx AND a .txt, 84 have
// only a .txt (out of scope here, no docx to convert), 0 are empty. Content
// team does NOT name these files "Introduction.docx" consistently -- most
// are named after the exam itself (e.g. "CGL.docx", "SSC MTS.docx"), so
// matching on filename (as this script originally did, finding only 150)
// undercounts by more than half. Match on the FOLDER name instead, and
// pick the right file once inside.
function findIntroFolders(root) {
  const found = [];
  const stack = [root];
  while (stack.length) {
    const dir = stack.pop();
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (/intro/i.test(entry.name)) found.push(full);
        stack.push(full); // still descend -- an INTRO folder never itself contains another INTRO folder, but cheap to be safe
      }
    }
  }
  return found.sort();
}

function tokenize(name) {
  return new Set(
    name
      .toLowerCase()
      .replace(/\.[^.]+$/, '') // strip extension
      .replace(/[^a-z0-9]+/g, ' ')
      .split(' ')
      .filter((w) => w.length > 1)
  );
}

// Picks the docx to convert for one INTRO folder. Word lock files
// ("~$Foo.docx", created while the real file is open in Word) are never
// real content.
//
// When more than one real docx remains, this is NOT safely resolved by
// size alone -- live testing across the full CONTENT tree (not just
// CENTRAL EXAMS) found a folder named "...\Medical Officer - Specialist\
// 1. INTRODUCTION" containing BOTH the correct
// "Lakshadweep_Medical_Officer_Specialist_Introduction.docx" AND a
// larger, misfiled "Lakshadweep_District_Court_Clerk_..._Introduction.docx"
// left over from a different exam -- picking by size alone would have
// silently attached the wrong exam's content. Score each candidate by
// word-token overlap against the exam's own folder name instead (the
// filename almost always echoes at least some of the folder name even
// when the convention otherwise varies -- "SSC DELHI POLICE
// CONSTABL_DRIVER_MALE.docx" for folder "SSC Constable (Driver) in Delhi
// Police"), tie-break by size, and if NO candidate shares even one word
// with the folder name (e.g. a folder that turned out to contain only
// "VeerNXT_Mock_Test_*.docx" files, no real Introduction at all) refuse to
// guess -- return unresolved for a human to look at instead of attaching
// unrelated content.
function pickDocxInFolder(dir) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return null;
  }
  const candidates = entries
    .filter((e) => e.isFile() && /\.docx$/i.test(e.name) && !e.name.startsWith('~$'))
    .map((e) => {
      const full = path.join(dir, e.name);
      return { full, name: e.name, size: fs.statSync(full).size };
    });
  if (candidates.length === 0) return null;
  if (candidates.length === 1) return { path: candidates[0].full, ambiguous: false, allNames: [candidates[0].name] };

  const postName = path.basename(path.dirname(dir)).replace(/^\d+[.\s]*/, '');
  const postTokens = tokenize(postName);
  for (const c of candidates) {
    const fileTokens = tokenize(c.name);
    c.score = [...fileTokens].filter((t) => postTokens.has(t)).length;
  }
  candidates.sort((a, b) => b.score - a.score || b.size - a.size);

  const allNames = candidates.map((c) => c.name);
  if (candidates[0].score === 0) {
    return { path: null, unresolved: true, allNames };
  }
  return { path: candidates[0].full, ambiguous: true, allNames };
}

// Derives a human title + a filesystem-safe slug from the docx's own
// folder chain, e.g. ".../06.NURSING/01. RRB (Railway Recruitment Board)/02. Staff Nurse/1. INTRO/Introduction.docx"
// -> "RRB (Railway Recruitment Board) - Staff Nurse", slug "rrb-railway-recruitment-board-staff-nurse".
function deriveIdentity(docxPath) {
  const introDir = path.dirname(docxPath); // ".../1. INTRO"
  const postDir = path.dirname(introDir); // ".../02. Staff Nurse"
  const bodyDir = path.dirname(postDir); // ".../01. RRB (...)"
  const stripOrdinal = (name) => name.replace(/^\d+[.\s]*/, '').trim();
  const post = stripOrdinal(path.basename(postDir));
  const body = stripOrdinal(path.basename(bodyDir));
  const title = body && body !== post ? `${body} - ${post}` : post;
  const relPath = path.relative(CONTENT_ROOT, docxPath);
  const baseSlug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100) || 'untitled-intro';
  // A short hash of the full source path is appended unconditionally (not
  // just on a detected collision) -- at 359 folders across the whole CENTRAL
  // EXAMS tree, two different bodies can plausibly share the same stripped
  // title, and running unattended at this scale there's no per-file review
  // to catch a silent overwrite the way the earlier 3-file spot check had.
  const hash = crypto.createHash('sha1').update(relPath).digest('hex').slice(0, 6);
  const slug = `${baseSlug}-${hash}`;
  return { title, slug, relPath };
}

// ── mammoth -> DOM ───────────────────────────────────────────────
const serializer = new XMLSerializer();
function innerHTML(el) {
  let out = '';
  for (const child of Array.from(el.childNodes)) out += serializer.serializeToString(child);
  return out.replace(/ xmlns="[^"]*"/g, '');
}
function firstMeaningfulChild(el) {
  let node = el.firstChild;
  while (node && node.nodeType === 3 /* TEXT_NODE */ && !node.textContent.trim()) node = node.nextSibling;
  return node;
}

let idCounter = 0;
export function generateId() {
  idCounter += 1;
  return Math.random().toString(36).substring(2, 9) + idCounter.toString(36);
}

const HEADING_KEYWORDS = [
  { match: (p) => p.includes('IMPORTANT') || p.includes('WARNING'), type: 'important' },
  { match: (p) => p.includes('EXAM TIP') || p.includes('TRICK') || p.includes('SHORTCUT'), type: 'examTip' },
  { match: (p) => p.includes('DEFINITION') || p.includes('CONCEPT'), type: 'definition' },
  { match: (p) => p.includes('EXAMPLE') || p.includes('FOR INSTANCE'), type: 'example' },
  { match: (p) => p.includes('NOTE') || p.includes('DID YOU KNOW'), type: 'callout' },
];

function classifyParagraph(el) {
  const text = el.textContent.replace(/\u00a0/g, ' ').trim();
  if (!text) return null;

  const firstChild = firstMeaningfulChild(el);
  if (firstChild && (firstChild.nodeName === 'strong' || firstChild.nodeName === 'b' || firstChild.nodeName === 'STRONG' || firstChild.nodeName === 'B')) {
    const boldText = firstChild.textContent.trim();
    const restText = text.slice(boldText.length).trim();
    // Only treat as a callout when there's real body text after the bold
    // lead-in -- a bold-only short line ("**Important Links**") is a
    // section header, not a warning box. See file docstring.
    if (restText.length > 0) {
      const prefix = boldText.toUpperCase();
      for (const { match, type } of HEADING_KEYWORDS) {
        if (match(prefix)) return { type, content: innerHTML(el) };
      }
    }
  }

  const wordCount = text.split(/\s+/).filter(Boolean).length;
  // A URL/link line ("Official Website: https://...") reads as short by
  // word count alone but is body text, not a section header -- seen live
  // on the "IMPORTANT LINKS" block of the KVS Assistant Commissioner intro.
  if (wordCount <= 5 && !/[.?:;]$/.test(text) && !/https?:\/\/|www\./i.test(text)) {
    return { type: 'heading', level: 4, content: innerHTML(el) };
  }

  return { type: 'paragraph', content: innerHTML(el) };
}

export function parseHtmlToBlocks(html) {
  const doc = new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html');
  const body = doc.documentElement.nodeName === 'body' ? doc.documentElement : doc.getElementsByTagName('body')[0];
  const blocks = [];
  let imagesSkipped = 0;

  for (const el of Array.from(body.childNodes)) {
    if (el.nodeType !== 1 /* ELEMENT_NODE */) continue;
    const tag = el.nodeName.toLowerCase();

    if (tag === 'h1') {
      blocks.push({ id: generateId(), type: 'heading', level: 1, content: innerHTML(el) });
    } else if (tag === 'h2') {
      blocks.push({ id: generateId(), type: 'heading', level: 2, content: innerHTML(el) });
    } else if (tag === 'h3' || tag === 'h4') {
      blocks.push({ id: generateId(), type: 'heading', level: 3, content: innerHTML(el) });
    } else if (tag === 'p') {
      const imgs = el.getElementsByTagName('img');
      if (imgs.length > 0 && !el.textContent.trim()) {
        imagesSkipped += imgs.length;
        continue;
      }
      const block = classifyParagraph(el);
      if (block) {
        block.id = generateId();
        blocks.push(block);
      }
    } else if (tag === 'ul') {
      const items = Array.from(el.childNodes).filter((n) => n.nodeType === 1).map((li) => innerHTML(li));
      if (items.length) blocks.push({ id: generateId(), type: 'list', items });
    } else if (tag === 'ol') {
      const items = Array.from(el.childNodes).filter((n) => n.nodeType === 1).map((li) => innerHTML(li));
      if (items.length) blocks.push({ id: generateId(), type: 'numberedList', items });
    } else if (tag === 'blockquote') {
      blocks.push({ id: generateId(), type: 'callout', content: innerHTML(el) });
    } else if (tag === 'table') {
      const trs = Array.from(el.getElementsByTagName('tr'));
      const rows = trs.map((tr) => {
        const cells = Array.from(tr.childNodes).filter((n) => n.nodeType === 1);
        const isHeader = cells.some((c) => c.nodeName.toLowerCase() === 'th');
        return { isHeader, cells: cells.map((c) => innerHTML(c)) };
      });
      if (rows.length) blocks.push({ id: generateId(), type: 'table', rows });
    } else if (tag === 'img') {
      imagesSkipped += 1;
    }
    // anything else (e.g. stray text-only wrapper tags) is silently skipped
  }

  return { blocks, imagesSkipped };
}

// ── per-file conversion ──────────────────────────────────────────
async function convertOne(docxPath) {
  const { title, slug, relPath } = deriveIdentity(docxPath);
  const result = await mammoth.convertToHtml({ path: docxPath }, { styleMap: STYLE_MAP });
  const { blocks, imagesSkipped } = parseHtmlToBlocks(result.value);

  const chapter = {
    id: generateId(),
    title,
    order: 1,
    blocks,
  };

  const metadata = {
    book_id: generateId(),
    title,
    source_file: relPath,
    category: 'Intro',
    chapter_count: 1,
    image_count: 0,
    chapters: [
      { title, order: 1, enriched: false, blocks_count: blocks.length, file_name: 'chapters/chapter-1.json' },
    ],
  };

  return { slug, title, relPath, metadata, chapter, blocksCount: blocks.length, imagesSkipped, mammothWarnings: result.messages };
}

// ── main ─────────────────────────────────────────────────────────
async function main() {
  console.log(`Mode: ${EXECUTE ? 'EXECUTE (writing JSON files)' : 'DRY RUN'}`);
  console.log(`Scanning for *INTRO* folders under: ${CONTENT_ROOT}\n`);

  let folders = findIntroFolders(CONTENT_ROOT);
  if (ONLY) folders = folders.filter((f) => f.toLowerCase().includes(ONLY.toLowerCase()));

  const picks = folders.map((dir) => ({ dir, pick: pickDocxInFolder(dir) }));
  const txtOnly = picks.filter((p) => !p.pick).map((p) => path.relative(CONTENT_ROOT, p.dir));
  const unresolved = picks.filter((p) => p.pick?.unresolved).map((p) => ({ dir: path.relative(CONTENT_ROOT, p.dir), allNames: p.pick.allNames }));
  let usable = picks.filter((p) => p.pick && !p.pick.unresolved);
  if (usable.length > LIMIT) usable = usable.slice(0, LIMIT);

  console.log(`${folders.length} INTRO folder(s) found; ${usable.length} have a usable .docx to convert; ${txtOnly.length} have no docx (txt-only or empty); ${unresolved.length} have multiple docx none of which name-match the folder (skipped, needs a human look).\n`);

  let ok = 0, failed = 0, totalBlocks = 0, totalImagesSkipped = 0, totalWarnings = 0;
  const emptyBlocks = [];
  const slugCollisions = new Map();
  const ambiguousPicks = [];

  for (const { dir, pick } of usable) {
    try {
      const result = await convertOne(pick.path);
      ok++;
      totalBlocks += result.blocksCount;
      totalImagesSkipped += result.imagesSkipped;
      totalWarnings += result.mammothWarnings.length;
      if (result.blocksCount === 0) emptyBlocks.push(result.relPath);
      if (pick.ambiguous) ambiguousPicks.push({ dir: path.relative(CONTENT_ROOT, dir), chosen: path.basename(pick.path), allNames: pick.allNames });

      if (slugCollisions.has(result.slug)) {
        slugCollisions.get(result.slug).push(result.relPath);
      } else {
        slugCollisions.set(result.slug, [result.relPath]);
      }

      console.log(`[ok] "${result.title}" — ${result.blocksCount} blocks, ${result.imagesSkipped} image(s) dropped${result.mammothWarnings.length ? `, ${result.mammothWarnings.length} mammoth warning(s)` : ''}${pick.ambiguous ? ` [multiple docx in folder, chose "${path.basename(pick.path)}"]` : ''}`);

      if (EXECUTE) {
        const outDir = path.join(OUTPUT_ROOT, result.slug);
        fs.mkdirSync(path.join(outDir, 'chapters'), { recursive: true });
        fs.writeFileSync(path.join(outDir, 'metadata.json'), JSON.stringify(result.metadata, null, 2));
        fs.writeFileSync(path.join(outDir, 'chapters', 'chapter-1.json'), JSON.stringify(result.chapter, null, 2));
      }
    } catch (err) {
      failed++;
      console.error(`[FAIL] ${pick.path}\n       ${err.message}`);
    }
  }

  console.log('\n--- Summary ---');
  console.log(`Converted: ${ok}  Failed: ${failed}  Skipped (no docx): ${txtOnly.length}  Skipped (unresolved pick): ${unresolved.length}`);
  console.log(`Total blocks produced: ${totalBlocks}  (avg ${(totalBlocks / (ok || 1)).toFixed(1)}/doc)`);
  console.log(`Total images dropped (letterheads/logos, not uploaded): ${totalImagesSkipped}`);
  console.log(`Total mammoth conversion warnings: ${totalWarnings}`);
  if (emptyBlocks.length) {
    console.log(`\n${emptyBlocks.length} file(s) produced ZERO blocks (needs a manual look):`);
    for (const f of emptyBlocks) console.log(`  ${f}`);
  }
  if (ambiguousPicks.length) {
    console.log(`\n${ambiguousPicks.length} folder(s) had multiple .docx files -- picked by name-match to the folder (tie-break: size), worth a manual double-check:`);
    for (const a of ambiguousPicks) console.log(`  ${a.dir}: chose "${a.chosen}" over [${a.allNames.filter((n) => n !== a.chosen).join(', ')}]`);
  }
  if (unresolved.length) {
    console.log(`\n${unresolved.length} folder(s) had multiple .docx files, NONE sharing a word with the folder name -- skipped rather than guessed, needs a human to pick (or the folder may not actually contain an Introduction at all):`);
    for (const u of unresolved) console.log(`  ${u.dir}: [${u.allNames.join(', ')}]`);
  }
  const dupes = [...slugCollisions.entries()].filter(([, paths]) => paths.length > 1);
  if (dupes.length) {
    console.log(`\n${dupes.length} slug collision(s) despite the path hash -- investigate:`);
    for (const [slug, paths] of dupes) {
      console.log(`  ${slug}:`);
      for (const p of paths) console.log(`    ${p}`);
    }
  }
  if (txtOnly.length) {
    console.log(`\n${txtOnly.length} folder(s) skipped -- no .docx present (likely .txt-only source, a different format this script doesn't parse):`);
    for (const f of txtOnly.slice(0, 20)) console.log(`  ${f}`);
    if (txtOnly.length > 20) console.log(`  ... and ${txtOnly.length - 20} more`);
  }
  if (!EXECUTE) console.log('\nDry run only -- no files written. Re-run with --execute to write to ' + OUTPUT_ROOT);
}

// Guard so other scripts (e.g. reformat_legacy_intros.mjs, reusing
// parseHtmlToBlocks/generateId for already-ingested legacy HTML) can
// `import` from this file without also triggering this file's own CLI run.
const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  main().catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
}
