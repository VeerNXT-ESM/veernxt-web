import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import sharp from 'sharp';

dotenv.config();

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const REFERENCE_IMAGE_PATH = process.env.REFERENCE_IMAGE_PATH || './reference/veernxt-reference.png';
const MODEL = 'openai/gpt-image-1';

if (!OPENROUTER_API_KEY) {
  console.error('Missing OPENROUTER_API_KEY in .env');
  process.exit(1);
}
if (!fs.existsSync(REFERENCE_IMAGE_PATH)) {
  console.error(`Reference image not found: ${REFERENCE_IMAGE_PATH}`);
  process.exit(1);
}

const book = {
  slug: 'central-gs-complete-guide',
  stateName: 'CENTRAL GS & GK COMPLETE GUIDE',
  title1: 'GENERAL STUDIES & GK',
  title2: 'CENTRAL EXAMS',
  examsLabel: 'For\nUPSC, SSC, Railways\nBanking, Defense &\nCentral Govt. Exams',
  topics: [
    'Indian History',
    'Geography',
    'Polity & Constitution',
    'Indian Economy',
    'General Science',
    'Current Affairs (National & Int.)',
  ],
  bullets: [
    'Comprehensive Central-Exam Theory',
    '10,000+ High-Yield Facts & Infographics',
    'Topic-wise Practice Questions',
    'Previous 15 Years Solved Papers',
    'National & International Affairs',
    'Updated with Latest Govt Schemes',
    'Easy Language & Quick Revision Notes',
  ],
  dioramaScene:
    'A photorealistic editorial composition featuring the Parliament of India, an authentic Constitution of India book, a brass terrestrial globe and a tastefully presented Indian tricolour, with premium academic books and realistic desk materials.',
};

function buildFlatPrompt(b) {
  const topics = b.topics.map((t, i) => `${i + 1}. ${t}`).join('\n');
  const bullets = b.bullets.map((x) => `✓ ${x}`).join('\n');
  return `
Replicate the exact cover layout, visual hierarchy, color palette, typography proportions, and graphic structure of the supplied reference image, replacing ONLY the book-specific text and the lower scenic illustration.

==================================================
A. STRICT CANVAS & ORIENTATION
==================================================
- Vertical flat 2D front cover artwork ONLY (no 3D book perspective, no spine, no drop shadow, no white outer margin).
- Aspect ratio: 2:3.

==================================================
B. BACKGROUND & FRAMING
==================================================
- Warm ivory/parchment background (#F8F4EA) with subtle paper grain and restrained antique-gold corner/border accents matching the reference.

==================================================
E. HEADER & LOGO SPACE
==================================================
- Reserve a clean, empty space to the left of VeerNXT® for the official crest:
- No crest.
- No icon.
- No placeholder symbol.
- No visible rectangle.
- No border or outline.
- No text.
- No shadow.
- No decorative ornament.

The reserved area must blend naturally into the background.
It is intended for adding the official logo later.

Place VeerNXT® immediately to the right of the reserved logo area, following the reference header proportions.
Use bold, clean, dark-green sans-serif lettering.
Place the tagline "From Service to Prosperous Tomorrow" directly underneath in smaller, readable dark-green text.
Add a thin antique-gold horizontal accent below it.
Keep the complete header compact.

==================================================
F. FIXED TOP-RIGHT EXAM PANEL
==================================================
Create the same curved, deep bottle-green panel at the upper-right, with a restrained antique-gold edge.
Use cream and restrained muted-gold typography.
Exact copy:

${b.examsLabel}

==================================================
G. LARGE MAIN TITLE
==================================================
Main title:
${b.title1}

Secondary title:
${b.title2}

Use elegant, high-contrast editorial serif typography, similar to the premium reference cover.
Main title: deep bottle green.
Secondary title: antique muted gold.
The title must be the dominant typographic element.

==================================================
H. COMPLETE GUIDE BANNER
==================================================
Immediately beneath the title, create a wide, rounded champagne-beige banner.
Exact wording:

COMPLETE GUIDE

Use dark bottle-green uppercase sans-serif lettering.

==================================================
I. EXACTLY SIX SUBJECT COLUMNS
==================================================
Create exactly six equal-width columns in one horizontal row directly below the banner.
Use these labels in this exact order:

${topics}

Each column contains:
- One simple dark-green line icon.
- One pale-sage circular icon background.
- One centred label beneath the icon.
- Thin muted-gold vertical dividers.

==================================================
J. FEATURES CHECKLIST
==================================================
Display the following wording exactly:

${bullets}

Position the checklist below the subject row, aligned to the left.
Use antique-gold circular checkmarks and clean, readable dark-green sans-serif text.

==================================================
K. EXAM-PATTERN SEAL
==================================================
Place one circular antique-gold seal on the right side of the checklist region.
Exact wording:

BASED ON
LATEST
EXAM
PATTERN
★★★

==================================================
L. PHOTOREALISTIC LOWER SCENE
==================================================
Create this book-specific scenic composition:

${b.dioramaScene}

The lower artwork must span almost the entire cover width.
Its composition should look like professional editorial photography assembled for a premium printed book.

==================================================
FINAL ART DIRECTION
==================================================
Create a photorealistic, premium Indian competitive-exam book cover that follows the supplied reference image.
Generate only the flat front-cover artwork.
`;
}

async function getReferenceDataUrl(filePath) {
  const buf = await sharp(filePath)
    .resize({ width: 1024, withoutEnlargement: true })
    .jpeg({ quality: 88 })
    .toBuffer();
  return `data:image/jpeg;base64,${buf.toString('base64')}`;
}

async function main() {
  const rawOutDir = path.resolve('raw_book_covers/test2');
  const webpOutDir = path.resolve('public/thumbnails/books');
  fs.mkdirSync(rawOutDir, { recursive: true });
  fs.mkdirSync(webpOutDir, { recursive: true });

  console.log(`Generating ${book.slug} via ${MODEL}...`);
  const t0 = Date.now();
  const referenceDataUrl = await getReferenceDataUrl(REFERENCE_IMAGE_PATH);

  let json;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const response = await fetch('https://openrouter.ai/api/v1/images', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: MODEL,
          prompt: buildFlatPrompt(book),
          aspect_ratio: '2:3',
          input_references: [
            {
              type: 'image_url',
              image_url: { url: referenceDataUrl },
            },
          ],
        }),
        signal: AbortSignal.timeout(180000),
      });

      if (!response.ok) {
        throw new Error(`OpenRouter HTTP ${response.status}: ${await response.text()}`);
      }
      json = await response.json();
      break;
    } catch (err) {
      console.warn(`Attempt ${attempt} failed: ${err.message}`);
      if (attempt === 3) throw err;
      await new Promise((r) => setTimeout(r, 3000 * attempt));
    }
  }
  const item = json.data?.[0];
  let imageBuffer;
  if (item?.b64_json) {
    imageBuffer = Buffer.from(item.b64_json, 'base64');
  } else if (item?.url) {
    const imgRes = await fetch(item.url);
    if (!imgRes.ok) throw new Error(`Image download failed: HTTP ${imgRes.status}`);
    imageBuffer = Buffer.from(await imgRes.arrayBuffer());
  } else {
    throw new Error(`No image data returned: ${JSON.stringify(json).slice(0, 800)}`);
  }

  const rawPath = path.join(rawOutDir, `${book.slug}.png`);
  const webpPath = path.join(webpOutDir, `${book.slug}.webp`);
  fs.writeFileSync(rawPath, imageBuffer);

  const webpBuffer = await sharp(imageBuffer)
    .webp({ quality: 88, effort: 4 })
    .toBuffer();
  fs.writeFileSync(webpPath, webpBuffer);

  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`Saved raw PNG: ${rawPath}`);
  console.log(`Saved WebP: ${webpPath} (${(webpBuffer.length / 1024).toFixed(1)} KB) in ${elapsed}s`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
