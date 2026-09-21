import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

const SPLIT_BOOKS_DIR = 'K:\\H DRIVE\\Quantum Climb\\CLIENT ASSETS\\VeerNXT\\CONTENT\\split_books';
const APP_PUBLIC_BOOKS_DIR = path.resolve(process.cwd(), 'public', 'books', 'Precis');
const ENRICHED_ASSETS_DIR = 'K:\\H DRIVE\\Quantum Climb\\CLIENT ASSETS\\VeerNXT\\CONTENT\\FINAL_CONTENT_ENRICHED\\Precis';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
  console.error("Error: GEMINI_API_KEY not set in environment.");
  process.exit(1);
}

const MODEL_NAME = 'gemini-3.6-flash';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${GEMINI_API_KEY}`;
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

function generateId() {
  return Math.random().toString(36).substring(2, 9);
}

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

async function enrichChapter(chapter) {
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
          },
          serviceTier: "flex"
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`    Gemini API error (Status ${response.status}):`, errorText);
        if (response.status === 429 || response.status === 503 || response.status === 500) {
          console.log(`    API issue (Status ${response.status}). Sleeping for 15 seconds...`);
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

      const mergedBlocks = [...chapter.blocks];

      if (parsed.statStrip && parsed.statStrip.stats) {
        parsed.statStrip.id = generateId();
        const insertIdx = Math.min(1, mergedBlocks.length);
        mergedBlocks.splice(insertIdx, 0, parsed.statStrip);
      }

      if (parsed.keyFacts && parsed.keyFacts.items) {
        parsed.keyFacts.id = generateId();
        const firstH2 = mergedBlocks.findIndex(b => b.type === 'heading' && b.level === 2);
        const insertIdx = firstH2 !== -1 ? firstH2 + 1 : Math.min(2, mergedBlocks.length);
        mergedBlocks.splice(insertIdx, 0, parsed.keyFacts);
      }

      if (parsed.pullQuote && parsed.pullQuote.content) {
        parsed.pullQuote.id = generateId();
        const middleIdx = Math.floor(mergedBlocks.length * 0.4);
        const insertIdx = Math.min(middleIdx, mergedBlocks.length);
        mergedBlocks.splice(insertIdx, 0, parsed.pullQuote);
      }

      if (parsed.comparisonTable && parsed.comparisonTable.headers) {
        parsed.comparisonTable.id = generateId();
        const tableIdx = Math.floor(mergedBlocks.length * 0.6);
        const insertIdx = Math.min(tableIdx, mergedBlocks.length);
        mergedBlocks.splice(insertIdx, 0, parsed.comparisonTable);
      }

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

// Copy directory recursively
function copyDirSync(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

async function registerInSupabase(folderName, metadata) {
  const isSSC = folderName.includes('SSC-GK');
  const conductingBody = isSSC ? 'Staff Selection Commission (SSC)' : 'Railway Recruitment Board (RRB)';
  const examName = isSSC ? 'SSC COMPLETE GK' : 'RRB COMPLETE GK';
  
  // Extract subject, e.g. "Geography" from "SSC-GK-Geography"
  const parts = metadata.title.split('-');
  const subject = parts[parts.length - 1];

  const storageBaseUrl = `${process.env.R2_PUBLIC_URL}/books/Precis/${folderName}/`;

  const record = {
    resource_id: metadata.book_id,
    file_hash: generateId() + generateId(),
    source_file: metadata.source_file,
    title: metadata.title,
    exam_name: examName,
    subject: subject,
    category: 'Precis',
    conducting_body: conductingBody,
    website_url: null,
    chapter_count: metadata.chapter_count,
    storage_base_url: storageBaseUrl,
    metadata_url: `${storageBaseUrl}metadata.json`,
    thumbnail_url: null,
    is_freemium: false,
    is_locked: true,
    status: 'Published',
    updated_at: new Date().toISOString()
  };

  console.log(`  [Database] Upserting resource row in Supabase: "${metadata.title}" (ID: ${metadata.book_id})`);
  const { error } = await supabase.from('resources').upsert(record, { onConflict: 'resource_id' });
  if (error) {
    console.error(`  [Database Error] Failed to register:`, error.message);
  }
}

async function run() {
  console.log("=== VEERNXT SPLIT BOOKS ENRICHMENT PIPELINE (FLEX TIER) ===");
  
  if (!fs.existsSync(SPLIT_BOOKS_DIR)) {
    console.error("No split books folder found!");
    return;
  }

  const folders = fs.readdirSync(SPLIT_BOOKS_DIR).filter(f => {
    // Only process Cluster_014 (SSC) and Cluster_079 (RRB) directly to save cost
    return f.startsWith('Cluster_014_SSC-GK-') || f.startsWith('Cluster_079_RRB-GK-');
  });

  console.log(`Found ${folders.length} unique split books to enrich.`);

  for (const folder of folders) {
    const folderPath = path.join(SPLIT_BOOKS_DIR, folder);
    const metadataPath = path.join(folderPath, 'metadata.json');
    if (!fs.existsSync(metadataPath)) continue;

    const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
    console.log(`\n📖 Enriching Book: "${metadata.title}" (${metadata.chapter_count} chapters)...`);

    let anyUpdated = false;

    for (const chRef of metadata.chapters) {
      const chPath = path.join(folderPath, chRef.file_name);
      if (!fs.existsSync(chPath)) continue;

      const chData = JSON.parse(fs.readFileSync(chPath, 'utf-8'));

      if (chRef.enriched) {
        console.log(`  [Skip] Chapter ${chRef.order}/${metadata.chapter_count}: "${chRef.title}" already enriched.`);
        continue;
      }

      console.log(`  [Enriching] Chapter ${chRef.order}/${metadata.chapter_count}: "${chRef.title}"...`);
      const enrichedCh = await enrichChapter(chData);
      
      fs.writeFileSync(chPath, JSON.stringify(enrichedCh, null, 2), 'utf-8');
      
      chRef.enriched = true;
      chRef.blocks_count = enrichedCh.blocks.length;
      anyUpdated = true;
      
      // Yield to prevent heavy rate limits
      await new Promise(r => setTimeout(r, 2000));
    }

    if (anyUpdated) {
      fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2), 'utf-8');
      console.log(`  Saved updated metadata.json.`);
    }

    // Now copy the finished unique folder to target destinations!
    console.log(`\n  [Publishing] Copying assets locally...`);
    const appBooksDir = path.join(APP_PUBLIC_BOOKS_DIR, folder);
    const enrichedAssetsDir = path.join(ENRICHED_ASSETS_DIR, folder);

    copyDirSync(folderPath, appBooksDir);
    copyDirSync(folderPath, enrichedAssetsDir);

    // Supabase Registration for unique book
    await registerInSupabase(folder, metadata);

    // If it's an SSC book (Cluster_014), duplicate it for Cluster_047 and Cluster_075!
    if (folder.startsWith('Cluster_014_SSC-GK-')) {
      const dupClusters = ['Cluster_047', 'Cluster_075'];
      for (const targetCluster of dupClusters) {
        const dupFolder = folder.replace('Cluster_014', targetCluster);
        console.log(`  [Duplicating] Creating duplicate for ${targetCluster} -> "${dupFolder}"`);

        const dupFolderPath = path.join(SPLIT_BOOKS_DIR, dupFolder);
        fs.mkdirSync(dupFolderPath, { recursive: true });
        copyDirSync(folderPath, dupFolderPath);

        // Update the dup folder's metadata with a new book_id and updated source_file reference
        const dupMetadataPath = path.join(dupFolderPath, 'metadata.json');
        const dupMetadata = JSON.parse(fs.readFileSync(dupMetadataPath, 'utf-8'));
        dupMetadata.book_id = generateId() + generateId();
        dupMetadata.source_file = dupMetadata.source_file.replace('Cluster_014', targetCluster);
        fs.writeFileSync(dupMetadataPath, JSON.stringify(dupMetadata, null, 2), 'utf-8');

        // Copy dup folder locally
        copyDirSync(dupFolderPath, path.join(APP_PUBLIC_BOOKS_DIR, dupFolder));
        copyDirSync(dupFolderPath, path.join(ENRICHED_ASSETS_DIR, dupFolder));

        // Supabase Registration for duplicated book
        await registerInSupabase(dupFolder, dupMetadata);
      }
    }
  }

  console.log("\n=== PIPELINE ENRICHMENT COMPLETED SUCCESSFULLY ===");
}

run();
