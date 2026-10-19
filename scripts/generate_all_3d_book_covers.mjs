import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import sharp from 'sharp';
import pLimit from 'p-limit';

dotenv.config();

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
if (!OPENROUTER_API_KEY) {
  console.error('ERROR: Missing OPENROUTER_API_KEY in .env');
  process.exit(1);
}

const OUT_DIR = path.resolve('public/thumbnails/books');
if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

const CONCURRENCY = 3; // Safe rate for OpenRouter
const limit = pLimit(CONCURRENCY);

const specsPath = path.resolve('scripts/all_book_specs.json');
const allBooks = JSON.parse(fs.readFileSync(specsPath, 'utf8'));

console.log(`\n======================================================`);
console.log(` VEERNXT 3D BOOK COVER GENERATOR (OPENROUTER AI)`);
console.log(` Total books defined: ${allBooks.length}`);
console.log(` Output folder: ${OUT_DIR}`);
console.log(`======================================================\n`);

let completedCount = 0;
let skippedCount = 0;
let failedCount = 0;

async function generateCoverForBook(book, index) {
  const destPath = path.join(OUT_DIR, `${book.slug}.webp`);

  if (fs.existsSync(destPath)) {
    console.log(`[${index + 1}/${allBooks.length}] [SKIPPED] ${book.title} (already exists at ${destPath})`);
    skippedCount++;
    return;
  }

  console.log(`[${index + 1}/${allBooks.length}] [STARTING] ${book.title}...`);

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const startTime = Date.now();
      const res = await fetch('https://openrouter.ai/api/v1/images', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'recraft/recraft-v4.1-flash',
          prompt: book.prompt,
          aspect_ratio: '3:4'
        })
      });

      if (res.status === 429) {
        console.warn(`[429 Rate Limit] Backing off 3s for ${book.title} (attempt ${attempt})...`);
        await new Promise(r => setTimeout(r, 3000 * attempt));
        continue;
      }

      if (!res.ok) {
        const err = await res.text();
        throw new Error(`OpenRouter HTTP ${res.status}: ${err}`);
      }

      const result = await res.json();
      const b64 = result.data?.[0]?.b64_json;
      if (!b64) {
        throw new Error('No b64_json in response: ' + JSON.stringify(result));
      }

      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      const rawBuffer = Buffer.from(b64, 'base64');

      // Auto-trim pure and near-white margins so the book fills frame tightly with no excess border
      const trimmedBuffer = await sharp(rawBuffer)
        .trim({ background: '#ffffff', threshold: 18 })
        .toBuffer();

      const meta = await sharp(trimmedBuffer).metadata();

      // Convert to WebP
      const webpBuffer = await sharp(trimmedBuffer)
        .webp({ quality: 88, effort: 4 })
        .toBuffer();

      fs.writeFileSync(destPath, webpBuffer);
      completedCount++;

      console.log(`[${index + 1}/${allBooks.length}] [SUCCESS] ${book.title} -> ${meta.width}x${meta.height} WebP (${(webpBuffer.length / 1024).toFixed(1)} KB) in ${elapsed}s`);
      return;
    } catch (err) {
      console.error(`[Attempt ${attempt} Failed] for ${book.title}:`, err.message);
      if (attempt === 3) {
        failedCount++;
      } else {
        await new Promise(r => setTimeout(r, 2000));
      }
    }
  }
}

async function run() {
  const tasks = allBooks.map((book, idx) => limit(() => generateCoverForBook(book, idx)));
  await Promise.all(tasks);

  console.log(`\n======================================================`);
  console.log(` GENERATION BATCH COMPLETE`);
  console.log(` Total Completed: ${completedCount}`);
  console.log(` Total Skipped:   ${skippedCount}`);
  console.log(` Total Failed:    ${failedCount}`);
  console.log(`======================================================\n`);

  // Build the book covers map
  buildCoverMap();
}

function buildCoverMap() {
  const files = fs.readdirSync(OUT_DIR).filter(f => f.endsWith('.webp'));
  const mapCode = `// Generated 3D Book Covers Map for VeerNXT
export const BOOK_3D_COVERS = {
${files.map(f => {
  const slug = f.replace('.webp', '');
  return `  '${slug}': '/thumbnails/books/${f}',`;
}).join('\n')}
};

export function getBook3DCover(slugOrTitle) {
  if (!slugOrTitle) return null;
  const norm = String(slugOrTitle).toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  if (BOOK_3D_COVERS[norm]) return BOOK_3D_COVERS[norm];
  
  // Partial matches
  for (const [key, url] of Object.entries(BOOK_3D_COVERS)) {
    if (norm.includes(key) || key.includes(norm)) return url;
  }
  return null;
}
`;

  fs.writeFileSync('src/lib/book3dCoversMap.js', mapCode);
  console.log(`Generated src/lib/book3dCoversMap.js with ${files.length} covers mapped.`);
}

run().catch(console.error);
