#!/usr/bin/env node
/**
 * scripts/batch_enrich_books.mjs
 *
 * Runs the full DOCX parsing + Gemini enrichment content pipeline.
 * Loops through the master books, parses them into the VEERNXT semantic block structure,
 * sends each chapter to Gemini for enrichment (generating keyFacts, pullQuotes, examAlerts, comparisonTables, statStrips),
 * and injects them programmatically into the original text block structure (preserving all original paragraphs).
 *
 * Usage:
 *   node scripts/batch_enrich_books.mjs [--limit 2] [--only-book "Cluster_005_ENGLISH.docx"]
 */

import fs from 'node:fs';
import path from 'node:path';
import mammoth from 'mammoth';
import { DOMParser } from '@xmldom/xmldom';

// Load environment variables
function loadEnv() {
  const envPath = path.resolve(process.cwd(), '.env');
  if (!fs.existsSync(envPath)) return;
  const lines = fs.readFileSync(envPath, 'utf-8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (!(key in process.env)) process.env[key] = value;
  }
}
loadEnv();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const MASTER_DOCS_ROOT = 'K:\\H DRIVE\\Quantum Climb\\CLIENT ASSETS\\VeerNXT\\CONTENT\\MASTER DOCUMENTS_superseded_20260819';
const OUTPUT_DIR_ROOT = 'K:\\H DRIVE\\Quantum Climb\\CLIENT ASSETS\\VeerNXT\\CONTENT\\FINAL_CONTENT_ENRICHED';

if (!GEMINI_API_KEY) {
  console.error("Error: GEMINI_API_KEY not set in environment.");
  process.exit(1);
}

const MODEL_NAME = 'gemini-3.6-flash';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${GEMINI_API_KEY}`;

function generateId() {
  return Math.random().toString(36).substring(2, 9);
}

function cleanTitle(fileName) {
  return fileName.replace(/^Cluster_\d+_/, '').replace(/\.[^/.]+$/, '').replace(/\s*\(\d+\)\s*$/, '').trim();
}

// Prompt to only return new decoration blocks
const HYBRID_PROMPT = `You are a professional educational book designer and publisher. Analyze this chapter from a study guide for Indian competitive exams.

Generate highly engaging, visually rich enrichment blocks based strictly on the chapter content:
1. A "statStrip" block: A row of 3-5 key statistics, counts, dates, years, or keywords with relevant icons (e.g. book, calendar, clock, check, award, info).
2. A "keyFacts" block: 3-6 bullet points of the most important takeaways from this chapter.
3. A "pullQuote" block: A single memorable/important sentence (must be an EXACT quote from the text).
4. An "examAlert" block: 2-4 points frequently tested in competitive exams.
5. A "comparisonTable" block (Optional): If the text compares concepts or contrasts items, generate a comparison table. Otherwise, omit this block.

Return ONLY a valid JSON object matching this exact schema. Do not return any markdown code blocks, explanation, or the original chapter paragraphs:
{
  "statStrip": {
    "type": "statStrip",
    "stats": [
      { "label": "Key Category", "value": "Value", "icon": "icon_name" }
    ]
  },
  "keyFacts": {
    "type": "keyFacts",
    "title": "Key Takeaways",
    "items": ["Point 1", "Point 2"]
  },
  "pullQuote": {
    "type": "pullQuote",
    "content": "Exact quote from text..."
  },
  "examAlert": {
    "type": "examAlert",
    "items": ["Alert 1", "Alert 2"]
  },
  "comparisonTable": {
    "type": "comparisonTable",
    "headers": ["Col 1", "Col 2"],
    "rows": [["val 1", "val 2"]]
  }
}
`;

/**
 * Call Gemini to enrich a single chapter.
 */
async function enrichChapter(chapter) {
  // Convert original blocks to plain text for the model to read
  const chapterText = chapter.blocks.map(block => {
    try {
      if (block.type === 'heading' && block.content) return `\n## ${block.content}\n`;
      if (block.content) return block.content.replace(/<[^>]+>/g, '') + '\n';
      if (block.items) return block.items.map(i => `- ${i.replace(/<[^>]+>/g, '')}`).join('\n') + '\n';
    } catch (e) {}
    return '';
  }).join('\n');

  const fullPrompt = HYBRID_PROMPT + `\n\nChapter Title: "${chapter.title}"\n\nChapter Content:\n${chapterText}`;

  let attempts = 3;
  while (attempts > 0) {
    try {
      const response = await fetch(GEMINI_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: fullPrompt }] }],
          generationConfig: {
            temperature: 0.3,
            responseMimeType: 'application/json'
          }
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`    Gemini API error (Status ${response.status}):`, errorText);
        if (response.status === 429) {
          console.log("    Rate limited. Sleeping for 15 seconds...");
          await new Promise(r => setTimeout(r, 15000));
          attempts--;
          continue;
        }
        return chapter;
      }

      const data = await response.json();
      const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) return chapter;

      let parsed;
      try {
        parsed = JSON.parse(rawText);
      } catch {
        const match = rawText.match(/\{[\s\S]*\}/);
        if (match) parsed = JSON.parse(match[0]);
        else return chapter;
      }

      // Merge new blocks into the original locally-parsed blocks
      const mergedBlocks = [...chapter.blocks];

      // 1. Inject statStrip at index 1 (right after the title H1)
      if (parsed.statStrip && parsed.statStrip.stats) {
        parsed.statStrip.id = generateId();
        const insertIdx = Math.min(1, mergedBlocks.length);
        mergedBlocks.splice(insertIdx, 0, parsed.statStrip);
      }

      // 2. Inject keyFacts after the first H2 (or index 2)
      if (parsed.keyFacts && parsed.keyFacts.items) {
        parsed.keyFacts.id = generateId();
        const firstH2 = mergedBlocks.findIndex(b => b.type === 'heading' && b.level === 2);
        const insertIdx = firstH2 !== -1 ? firstH2 + 1 : Math.min(2, mergedBlocks.length);
        mergedBlocks.splice(insertIdx, 0, parsed.keyFacts);
      }

      // 3. Inject pullQuote in the middle (40% mark)
      if (parsed.pullQuote && parsed.pullQuote.content) {
        parsed.pullQuote.id = generateId();
        const middleIdx = Math.floor(mergedBlocks.length * 0.4);
        const insertIdx = Math.min(middleIdx, mergedBlocks.length);
        mergedBlocks.splice(insertIdx, 0, parsed.pullQuote);
      }

      // 4. Inject comparisonTable in the middle (60% mark)
      if (parsed.comparisonTable && parsed.comparisonTable.headers) {
        parsed.comparisonTable.id = generateId();
        const tableIdx = Math.floor(mergedBlocks.length * 0.6);
        const insertIdx = Math.min(tableIdx, mergedBlocks.length);
        mergedBlocks.splice(insertIdx, 0, parsed.comparisonTable);
      }

      // 5. Inject examAlert near the end (85% mark)
      if (parsed.examAlert && parsed.examAlert.items) {
        parsed.examAlert.id = generateId();
        const alertIdx = Math.floor(mergedBlocks.length * 0.85);
        const insertIdx = Math.min(alertIdx, mergedBlocks.length);
        mergedBlocks.splice(insertIdx, 0, parsed.examAlert);
      }

      return {
        ...chapter,
        blocks: mergedBlocks,
        enriched: true
      };

    } catch (err) {
      console.error("    Request failed:", err.message);
      await new Promise(r => setTimeout(r, 5000));
      attempts--;
    }
  }
  return chapter;
}

/**
 * Parses DOCX buffer into semantic block structure locally in Node.js
 */
async function parseDocxToSemanticModelNode(buffer, fileName) {
  const options = {
    styleMap: [
      "p[style-name='Heading 1'] => h1:fresh",
      "p[style-name='Heading 2'] => h2:fresh",
      "p[style-name='Heading 3'] => h3:fresh",
      "p[style-name='Title'] => h1:fresh",
      "p[style-name='Subtitle'] => h2:fresh",
      "p[style-name='Quote'] => blockquote:fresh",
      "p[style-name='Intense Quote'] => blockquote:fresh"
    ]
  };

  const result = await mammoth.convertToHtml({ buffer }, options);
  const html = result.value;

  const wrappedHtml = `<html><body>${html}</body></html>`;
  const parser = new DOMParser();
  const doc = parser.parseFromString(wrappedHtml, 'text/xml');

  const book = {
    id: generateId(),
    title: fileName.replace(/\.[^/.]+$/, ''),
    description: '',
    coverImage: null,
    chapters: []
  };

  let currentChapter = null;
  const imagesDb = []; // Empty for text-only pass

  const ensureChapter = () => {
    if (!currentChapter) {
      currentChapter = {
        id: generateId(),
        title: 'Introduction',
        order: book.chapters.length + 1,
        blocks: []
      };
      book.chapters.push(currentChapter);
    }
  };

  const classifyParagraph = (element) => {
    const text = element.textContent.replace(/\u00A0/g, ' ').trim();
    if (!text) return null;

    const firstChild = element.firstChild;
    if (firstChild && (firstChild.nodeName === 'STRONG' || firstChild.nodeName === 'B')) {
      const prefix = firstChild.textContent.trim().toUpperCase();
      const content = element.innerHTML;
      
      if (prefix.includes('IMPORTANT') || prefix.includes('WARNING')) return { type: 'important', content };
      if (prefix.includes('EXAM TIP') || prefix.includes('TRICK') || prefix.includes('SHORTCUT')) return { type: 'examTip', content };
      if (prefix.includes('DEFINITION') || prefix.includes('CONCEPT')) return { type: 'definition', content };
      if (prefix.includes('EXAMPLE') || prefix.includes('FOR INSTANCE')) return { type: 'example', content };
      if (prefix.includes('NOTE') || prefix.includes('DID YOU KNOW')) return { type: 'callout', content };
    }
    
    const wordCount = text.split(/\s+/).length;
    if (wordCount <= 5 && !text.endsWith('.') && !text.endsWith('?') && !text.endsWith(':') && !text.endsWith(';')) {
      return { type: 'heading', level: 4, content: element.innerHTML };
    }

    return { type: 'paragraph', content: element.innerHTML };
  };

  const elements = Array.from(doc.documentElement.getElementsByTagName('body')[0].childNodes);

  for (const el of elements) {
    if (!el.tagName) continue;
    const nodeName = el.tagName.toUpperCase();

    if (nodeName === 'H1') {
      currentChapter = {
        id: generateId(),
        title: el.textContent.trim() || 'Untitled Chapter',
        order: book.chapters.length + 1,
        blocks: []
      };
      book.chapters.push(currentChapter);
      continue;
    }

    ensureChapter();

    if (nodeName === 'H2') {
      currentChapter.blocks.push({ id: generateId(), type: 'heading', level: 2, content: el.textContent.trim() });
    }
    else if (nodeName === 'H3' || nodeName === 'H4') {
      currentChapter.blocks.push({ id: generateId(), type: 'heading', level: 3, content: el.textContent.trim() });
    }
    else if (nodeName === 'P') {
      const block = classifyParagraph(el);
      if (block) {
        block.id = generateId();
        currentChapter.blocks.push(block);
      }
    }
    else if (nodeName === 'UL') {
      const items = Array.from(el.getElementsByTagName('li')).map(li => li.innerHTML);
      currentChapter.blocks.push({ id: generateId(), type: 'list', items });
    }
    else if (nodeName === 'OL') {
      const items = Array.from(el.getElementsByTagName('li')).map(li => li.innerHTML);
      currentChapter.blocks.push({ id: generateId(), type: 'numberedList', items });
    }
    else if (nodeName === 'BLOCKQUOTE') {
      currentChapter.blocks.push({ id: generateId(), type: 'callout', content: el.innerHTML });
    }
    else if (nodeName === 'TABLE') {
      const rows = [];
      const trs = Array.from(el.getElementsByTagName('tr'));
      let isHeader = true;
      for (const tr of trs) {
        const cells = Array.from(tr.childNodes)
          .filter(n => n.nodeName === 'td' || n.nodeName === 'th')
          .map(td => td.innerHTML);
        rows.push({ isHeader, cells });
        isHeader = false;
      }
      if (rows.length > 0) {
        currentChapter.blocks.push({ id: generateId(), type: 'table', rows });
      }
    }
  }

  // Cleanup
  const hasOtherChapters = book.chapters.some(ch => !ch.title.toLowerCase().includes('introduction'));
  book.chapters = book.chapters.filter(ch => {
    const isIntro = ch.title.toLowerCase().includes('introduction');
    return ch.blocks.length > 0 && (!isIntro || !hasOtherChapters);
  });
  book.chapters.forEach((ch, idx) => {
    ch.order = idx + 1;
  });

  return { book, imagesDb };
}

function walkDocx(dir) {
  let list = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      list = list.concat(walkDocx(full));
    } else if (entry.isFile() && entry.name.endsWith('.docx') && !entry.name.startsWith('~$') && entry.name !== '_PENDING_CONTENT.docx') {
      const relParts = path.relative(MASTER_DOCS_ROOT, dir).split(path.sep);
      list.push({
        fullPath: full,
        fileName: entry.name,
        relPath: path.relative(MASTER_DOCS_ROOT, full),
        folderLevels: relParts.filter(Boolean)
      });
    }
  }
  return list;
}

async function main() {
  const args = process.argv.slice(2);
  let limit = Infinity;
  let onlyBook = null;
  let dryRun = false;
  let processAll = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--limit') limit = parseInt(args[++i], 10);
    else if (args[i] === '--only-book') onlyBook = args[++i];
    else if (args[i] === '--dry-run') dryRun = true;
    else if (args[i] === '--all') processAll = true;
  }

  console.log("=== VEERNXT CONTENT PIPELINE (BATCH ENRICHMENT) ===");
  console.log(`Input Directory:  ${MASTER_DOCS_ROOT}`);
  console.log(`Output Directory: ${OUTPUT_DIR_ROOT}`);
  if (dryRun) console.log("DRY-RUN MODE: Parsing only, Gemini API calls will be skipped.");

  if (!fs.existsSync(MASTER_DOCS_ROOT)) {
    console.error("Error: MASTER DOCUMENTS folder not found.");
    process.exit(1);
  }

  const allFiles = walkDocx(MASTER_DOCS_ROOT);
  let filesToProcess = [];

  const FIRST_5_BOOKS = [
    'Guide\\English\\Cluster_005_ENGLISH.docx',
    'Guide\\GK-GS\\Cluster_006_GS & GK GUIDE BOOK.docx',
    'Guide\\Reasoning\\Cluster_007_REASONING.docx',
    'Guide\\Computer\\Cluster_009_Computer Science guide Book.docx',
    'Guide\\Hindi\\Cluster_010_HINDI.docx'
  ];

  if (onlyBook) {
    filesToProcess = allFiles.filter(f => f.fileName.includes(onlyBook));
    console.log(`Filtering to files matching '${onlyBook}': ${filesToProcess.length} found.`);
  } else if (processAll) {
    filesToProcess = allFiles;
    console.log(`Queueing ALL docx files: ${filesToProcess.length} found.`);
  } else {
    filesToProcess = allFiles.filter(f => {
      const normRel = f.relPath.replace(/\//g, '\\');
      return FIRST_5_BOOKS.some(target => normRel.includes(target) || target.includes(normRel));
    });
    filesToProcess.sort((a, b) => {
      const idxA = FIRST_5_BOOKS.findIndex(target => a.relPath.replace(/\//g, '\\').includes(target));
      const idxB = FIRST_5_BOOKS.findIndex(target => b.relPath.replace(/\//g, '\\').includes(target));
      return idxA - idxB;
    });
    console.log(`Defaulting to processing the first 5 core books: ${filesToProcess.length} found.`);
  }

  filesToProcess = filesToProcess.slice(0, limit);
  console.log(`Total files queued for enrichment: ${filesToProcess.length}`);

  let successCount = 0;

  for (let i = 0; i < filesToProcess.length; i++) {
    const file = filesToProcess[i];
    console.log(`\n------------------------------------------------------------`);
    console.log(`[Book ${i + 1}/${filesToProcess.length}] ${file.fileName}`);
    console.log(`------------------------------------------------------------`);

    const fileBuffer = fs.readFileSync(file.fullPath);
    
    try {
      console.log("  [Parse] Parsing document to semantic block model...");
      const { book, imagesDb } = await parseDocxToSemanticModelNode(fileBuffer, file.fileName);
      console.log(`  [Parse] Complete: parsed ${book.chapters.length} chapters, ${imagesDb.length} images.`);

      const category = file.folderLevels[0] || 'Guide';
      const cleanBookName = cleanTitle(file.fileName);
      const bookFolder = path.join(OUTPUT_DIR_ROOT, category, cleanBookName);
      const chaptersFolder = path.join(bookFolder, 'chapters');

      fs.mkdirSync(chaptersFolder, { recursive: true });

      const enrichedChapters = [];
      for (const ch of book.chapters) {
        console.log(`  [Enrich] Chapter ${ch.order}/${book.chapters.length}: "${ch.title}" (${ch.blocks.length} blocks)...`);
        
        let enrichedCh = ch;
        if (!dryRun) {
          enrichedCh = await enrichChapter(ch);
          await new Promise(r => setTimeout(r, 2000)); // sleep 2 seconds
        } else {
          console.log(`    (Dry Run - Skipping Gemini Enrichment)`);
        }
        enrichedChapters.push(enrichedCh);

        const chapterPath = path.join(chaptersFolder, `chapter-${ch.order}.json`);
        fs.writeFileSync(chapterPath, JSON.stringify(enrichedCh, null, 2));
        console.log(`    Saved to chapters/chapter-${ch.order}.json`);
      }

      const metadata = {
        book_id: book.id,
        title: cleanBookName,
        source_file: file.fileName,
        category,
        chapter_count: enrichedChapters.length,
        image_count: 0,
        chapters: enrichedChapters.map(ch => ({
          title: ch.title,
          order: ch.order,
          enriched: ch.enriched || false,
          blocks_count: ch.blocks.length,
          file_name: `chapters/chapter-${ch.order}.json`
        }))
      };

      fs.writeFileSync(path.join(bookFolder, 'metadata.json'), JSON.stringify(metadata, null, 2));
      console.log(`  [Metadata] Saved metadata.json`);
      console.log(`  [Success] Book completed!`);
      successCount++;

    } catch (err) {
      console.error(`  [Error] Failed to process book ${file.fileName}:`, err);
    }
  }

  console.log(`\n=== PIPELINE SUMMATION ===`);
  console.log(`Processed books: ${successCount}/${filesToProcess.length}`);
}

main().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});
