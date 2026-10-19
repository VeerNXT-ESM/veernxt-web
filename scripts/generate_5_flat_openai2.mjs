
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

// ============================================================
// CONFIGURATION
// ============================================================

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

// Use a genuine flat FRONT COVER reference image.
// Set this in your .env file.
const REFERENCE_IMAGE_PATH =
  process.env.REFERENCE_IMAGE_PATH ||
  './reference/veernxt-reference.png';

const OUT_DIR = path.resolve('raw_book_covers/test2');

// Reference-conditioned image generation.
// Check model availability and input_references support
// for your selected OpenRouter endpoint before running.
const MODEL = 'openai/gpt-image-1';

const WIDTH = 1024;
const HEIGHT = 1536;

if (!OPENROUTER_API_KEY) {
  console.error('Missing OPENROUTER_API_KEY in .env');
  process.exit(1);
}

if (!fs.existsSync(REFERENCE_IMAGE_PATH)) {
  console.error(
    `Reference image not found: ${REFERENCE_IMAGE_PATH}\n` +
    'Set REFERENCE_IMAGE_PATH in .env to your approved flat cover.'
  );
  process.exit(1);
}

fs.mkdirSync(OUT_DIR, { recursive: true });

// ============================================================
// FIXED SERIES CONTENT
// ============================================================

const fiveBooks = [
  {
    slug: 'rajasthan-gs',
    stateName: 'RAJASTHAN GS',
    title1: 'RAJASTHAN',
    title2: 'GS',
    examsLabel:
      'For\nRPSC, RSMSSB, REET\nand Other\nRajasthan State Exams',
    topics: [
      'History & Culture',
      'Geography of Rajasthan',
      'Society & People',
      'Economy & Development',
      'Polity & Schemes',
      'Current Affairs (Rajasthan Specific)'
    ],
    bullets: [
      'Comprehensive & Exam-Oriented Theory',
      'State Specific Facts, Maps & Data',
      'Topic-wise Practice Questions',
      'Previous Year Questions',
      'Rajasthan Specific Current Affairs',
      'Updated with Latest Schemes',
      'Easy Language & Quick Revision Notes'
    ],
    dioramaScene:
      'A photorealistic Rajasthan landscape with Hawa Mahal, ' +
      'Mehrangarh Fort, realistic golden Thar Desert dunes, ' +
      'and authentic Rajasthani bandhani textile. Include ' +
      'five carefully composed premium academic books with ' +
      'dark green, brown and cream covers.'
  },
  {
    slug: 'madhya-pradesh-gs',
    stateName: 'MADHYA PRADESH GS',
    title1: 'MADHYA PRADESH',
    title2: 'GS',
    examsLabel:
      'For\nMPPSC, MP Police, Vyapam\nand Other\nMP State Exams',
    topics: [
      'History & Dynasties',
      'Narmada & MP Geography',
      'Tribal Culture & Gond Art',
      'Forests & Wildlife',
      'Polity & Administration',
      'Current Affairs (MP Specific)'
    ],
    bullets: [
      'Comprehensive & Exam-Oriented Theory',
      'MP Specific Facts, Maps & Data',
      'Topic-wise Practice Questions',
      'Previous Year MPPSC Questions',
      'Madhya Pradesh Current Affairs',
      'Updated with Latest MP Schemes',
      'Easy Language & Quick Revision Notes'
    ],
    dioramaScene:
      'A photorealistic composition featuring the Great Stupa ' +
      'of Sanchi, its historic carved gateway, Khajuraho ' +
      'sandstone temples and authentic central Indian ' +
      'forest scenery. Include realistic stone textures ' +
      'and premium academic books.'
  },
  {
    slug: 'maharashtra-gs',
    stateName: 'MAHARASHTRA GS',
    title1: 'MAHARASHTRA',
    title2: 'GS',
    examsLabel:
      'For\nMPSC, Maharashtra Police\nand Other\nState Exams',
    topics: [
      'Maratha History',
      'Deccan Geography',
      'Social Reformers',
      'Economy & Industry',
      'Polity & Local Bodies',
      'Current Affairs (Maharashtra Specific)'
    ],
    bullets: [
      'Comprehensive & Exam-Oriented Theory',
      'Maharashtra Facts, Maps & Data',
      'Topic-wise Practice Questions',
      'Previous Year MPSC Questions',
      'Maharashtra Current Affairs',
      'Updated with Latest State Schemes',
      'Easy Language & Quick Revision Notes'
    ],
    dioramaScene:
      'A photorealistic Maharashtra scene featuring the ' +
      'Gateway of India, Raigad Fort, authentic Maratha ' +
      'architectural details and finely woven Paithani ' +
      'silk fabric with subtle gold borders.'
  },
  {
    slug: 'gujarat-gs',
    stateName: 'GUJARAT GS',
    title1: 'GUJARAT',
    title2: 'GS',
    examsLabel:
      'For\nGPSC, GSSSB, Talati\nand Other\nGujarat State Exams',
    topics: [
      'History & Solankis',
      'Geography & Coastline',
      'Trade & Industry',
      'Culture & Garba',
      'Polity & Governance',
      'Current Affairs (Gujarat Specific)'
    ],
    bullets: [
      'Comprehensive & Exam-Oriented Theory',
      'Gujarat Specific Facts, Maps & Data',
      'Topic-wise Practice Questions',
      'Previous Year GPSC Questions',
      'Gujarat Specific Current Affairs',
      'Updated with Latest Gujarat Schemes',
      'Easy Language & Quick Revision Notes'
    ],
    dioramaScene:
      'A photorealistic Gujarat landscape featuring the ' +
      'intricately carved Rani ki Vav stepwell, Modhera Sun ' +
      'Temple, the white salt flats of the Rann of Kutch ' +
      'and subtle authentic Gujarati textiles.'
  },
  {
    slug: 'gs-gk-complete-guide',
    stateName: 'GS & GK COMPLETE GUIDE',
    title1: 'GENERAL STUDIES & GK',
    title2: 'ALL INDIA',
    examsLabel:
      'For\nUPSC, SSC, Railways\nBanking, Defense & State\nGovt. Examinations',
    topics: [
      'Indian History',
      'Geography',
      'Polity & Constitution',
      'Indian Economy',
      'General Science',
      'Current Affairs (National & Int.)'
    ],
    bullets: [
      'Comprehensive All-India Theory',
      '10,000+ High-Yield Facts & Infographics',
      'Topic-wise Practice Questions',
      'Previous 15 Years Solved Papers',
      'National & International Affairs',
      'Updated with Latest Govt Schemes',
      'Easy Language & Quick Revision Notes'
    ],
    dioramaScene:
      'A photorealistic editorial composition featuring ' +
      'the Parliament of India, an authentic Constitution ' +
      'of India book, a brass terrestrial globe and a ' +
      'tastefully presented Indian tricolour, with premium ' +
      'academic books and realistic desk materials.'
  }
];

// ============================================================
// FIXED DESIGN SYSTEM
// ============================================================

function buildFlatPrompt(book) {
  const topics = book.topics
    .map((topic, index) => `${index + 1}. ${topic}`)
    .join('\n');

  const bullets = book.bullets
    .map(item => `- ${item}`)
    .join('\n');

  return `
Create a premium, photorealistic, print-quality FRONT COVER
for the VeerNXT competitive examination book series.

IMPORTANT:
The supplied reference image is the authoritative visual
reference. Inspect it and reproduce its design language,
colour relationships, typography hierarchy, proportions,
spacing and overall composition.

Do not invent a new cover design.

The reference image controls the visual template.
This prompt controls the book-specific content.

==================================================
A. REFERENCE IMAGE PRIORITY
==================================================

MATCH THE REFERENCE IMAGE.
MATCH THE REFERENCE IMAGE.
MATCH THE REFERENCE IMAGE.

Use the reference as the actual visual guide, not merely
as inspiration.

Preserve its:
- Front-cover composition.
- Compact top header.
- Blank top-left logo reservation.
- Brand position and proportions.
- Curved top-right examination panel.
- Main title scale and alignment.
- Complete Guide banner.
- Six-column subject grid.
- Checklist and exam-pattern seal.
- Lower scenic composition.
- Overall visual balance and typography hierarchy.

Keep the same layout across every book in the series.

Only the book title, exam information, subject labels,
feature list and state-specific lower scenery may change.

Do not copy the reference's book-specific text when
it differs from the supplied content.

==================================================
B. OUTPUT: FLAT FRONT ARTWORK ONLY
==================================================

Create one flat, straight-on, 2D front-cover design.

Portrait aspect ratio: 2:3.
Target output: ${WIDTH} x ${HEIGHT} pixels.

The artwork must reach all four canvas edges.

NO book mockup.
NO spine.
NO page edges.
NO perspective.
NO rotation.
NO tabletop outside the printed cover.
NO external background.
NO outer border.
NO padding around the cover.
NO drop shadow outside the artwork.

The cover itself fills the complete canvas.

Keep the content close to the left and right edges,
following the reference image's proportions.

Do not shrink the whole design into a narrow column.

==================================================
C. PHOTOGRAPHIC REALISM — HIGHEST PRIORITY
==================================================

The cover must look like a premium commercially published
Indian competitive-examination guide with a professionally
photographed scenic lower illustration.

The architecture, landscape, textiles, books and materials
must appear photographic and physically realistic.

For the lower scenery, use:
- Real architectural photography aesthetics.
- Natural stone, brick, wood and fabric textures.
- Realistic vegetation and terrain.
- Physically plausible sunlight and shadows.
- Natural atmospheric depth.
- Fine photographic detail.
- Realistic foreground and background separation.
- Professional editorial colour grading.
- High-resolution commercial publishing quality.

The scenic artwork should look like a carefully art-directed
photographic composite assembled from authentic photographs.

It must NOT look like:
- A hand-drawn illustration.
- A children's storybook.
- A cartoon.
- Vector artwork.
- Watercolour.
- Oil painting.
- Digital concept art.
- A 3D-rendered game environment.
- A flat illustrated landscape.
- A heavily AI-stylised fantasy scene.

Architecture must have realistic geometry and materials.
Books must have realistic paper, cloth and leather textures.
Fabric must show natural folds and woven detail.

Use realism rather than decorative exaggeration.

==================================================
D. PRECISE COLOUR AND LIGHTING CONTROL
==================================================

The previous outputs were too yellow, too orange and
too illustrative. Correct that problem.

Use this restrained, consistent palette:

Background ivory: #F5F0E4
Deep bottle green: #073B29
Dark text green: #102E23
Antique muted gold: #A77B2B
Champagne beige: #E7D3A0
Pale sage: #DCE2C9
Body text: #17241C

These values are visual targets, not permission to
add strong colour casts.

BACKGROUND:
Use a clean, natural warm ivory similar to premium
uncoated book-cover stock.

Keep the ivory neutral and creamy.
Do not turn the entire background yellow.
Do not add a strong yellow filter.

GREEN:
Use deep, rich bottle green.
Never use neon green, teal or saturated emerald.

GOLD:
Use muted antique gold with restrained metallic detail.
Gold should look refined and slightly earthy.
Never use bright lemon yellow or orange-gold everywhere.

SAGE:
Use pale, desaturated sage-green circles.

LIGHTING:
Use balanced, neutral natural daylight with gentle warmth.
Keep the whites and ivory areas visibly neutral.

The lower scene may contain natural sunset colours where
geographically appropriate, but sunset lighting must
not tint the entire cover orange or yellow.

Avoid excessive golden-hour effects, orange haze,
yellow colour grading, oversaturation and artificial glow.

Maintain good contrast between green text and ivory.

MATCH THE REFERENCE COLOURS.
MATCH THE REFERENCE COLOURS.
MATCH THE REFERENCE COLOURS.

==================================================
E. FIXED TOP HEADER AND BLANK LOGO SPACE
==================================================

Brand spelling must be exactly:

VeerNXT®

Tagline:

From Service to a Prosperous Tomorrow

Reserve a compact blank logo area at the extreme
top-left of the cover.

The reserved area should occupy approximately:
15–17% of canvas width.
9–11% of canvas height.

It must be plain background ivory.

CRITICAL LOGO RULES:
- Completely blank.
- No logo.
- No generated emblem.
- No shield.
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

Do not turn it into a large empty block.

Place VeerNXT® immediately to the right of the reserved
logo area, following the reference header proportions.

Use bold, clean, dark-green sans-serif lettering.

Place the exact tagline directly underneath in smaller,
readable dark-green text.

Add a thin antique-gold horizontal accent below it.

Keep the complete header compact.

NEVER write "Veer Next".
NEVER write "Veer Next®".
NEVER change VeerNXT® to another spelling.

==================================================
F. FIXED TOP-RIGHT EXAM PANEL
==================================================

Create the same curved, deep bottle-green panel at
the upper-right, with a restrained antique-gold edge.

The panel must remain in the same location and use
the same approximate proportions on every cover.

Use cream and restrained muted-gold typography.

Exact copy:

${book.examsLabel}

Use sensible line breaks and clean alignment.

Do not overlap the brand.
Do not invade the blank logo reservation.
Do not redesign the panel as a different shape.
Do not use a bright yellow background.

==================================================
G. LARGE MAIN TITLE
==================================================

Main title:
${book.title1}

Secondary title:
${book.title2}

Use elegant, high-contrast editorial serif typography,
similar to the premium reference cover.

Main title: deep bottle green.
Secondary title: antique muted gold.

The title must be the dominant typographic element.

Use nearly the full available cover width.
Keep left and right margins narrow and balanced.

Match the reference title's scale and hierarchy.

Long titles may wrap naturally, but retain the same
dominant serif style and strong visual presence.

Never compress the complete design to accommodate a title.
Adjust only the title size and line breaks as necessary.

Avoid collisions with the exam panel.

==================================================
H. COMPLETE GUIDE BANNER
==================================================

Immediately beneath the title, create a wide,
rounded champagne-beige banner.

Exact wording:

COMPLETE GUIDE

Use dark bottle-green uppercase sans-serif lettering
with restrained tracking.

The banner should extend across nearly the full
usable width and match the reference proportions.

Do not use bright yellow.
Do not add extra wording.

==================================================
I. EXACTLY SIX SUBJECT COLUMNS
==================================================

Create exactly six equal-width columns in one
horizontal row directly below the banner.

Use these labels in this exact order:

${topics}

Each column contains:
- One simple dark-green line icon.
- One pale-sage circular icon background.
- One centred label beneath the icon.
- Thin muted-gold vertical dividers.

Keep all six columns evenly distributed across
nearly the full cover width.

Icons must be consistent in style and size.
Labels must be readable and properly aligned.

Long labels may wrap naturally.

Do not add or remove columns.
Do not cluster them in the centre.
Do not create a narrow central grid.

==================================================
J. FEATURES CHECKLIST
==================================================

Display the following wording exactly:

${bullets}

Position the checklist below the subject row,
aligned to the left.

Use antique-gold circular checkmarks and clean,
readable dark-green sans-serif text.

Maintain consistent vertical spacing.

Use approximately 60–65% of the usable width,
leaving the right side available for the seal.

Do not invent, omit or rewrite features.

==================================================
K. EXAM-PATTERN SEAL
==================================================

Place one circular antique-gold seal on the right side
of the checklist region.

Use refined gold detailing, restrained highlights
and dark-green lettering.

Exact wording:

BASED ON
LATEST
EXAM PATTERN
★★★

Match the reference's approximate position and size.

Do not overlap the checklist.
Do not make the seal oversized.
Do not add extra badges.

==================================================
L. PHOTOREALISTIC LOWER SCENE
==================================================

Create this book-specific scenic composition:

${book.dioramaScene}

The lower artwork must span almost the entire cover width.

Its composition should look like professional editorial
photography assembled for a premium printed book.

Use realistic:
- Architectural structures.
- Natural landscapes.
- Trees, flowers and terrain.
- Cultural textiles and materials.
- Academic books with realistic covers and page edges.
- Natural depth, perspective and lighting.

Use restrained, authentic regional details.

The scene should blend naturally into the ivory
cover design rather than appearing inside a separate frame.

Keep the same overall lower-scene height across
the entire series.

Do not cover the checklist or exam-pattern seal.

The scenic region should be visually rich but not cluttered.
The title and information above it must remain dominant.

Do not let decorative books consume the whole scene.

==================================================
M. SERIES CONSISTENCY
==================================================

All five books must look like members of the same
professionally art-directed publishing series.

Lock these elements:

1. Full-bleed portrait canvas.
2. Compact blank top-left logo area.
3. VeerNXT® brand position.
4. Tagline and gold accent.
5. Curved top-right exam panel.
6. Large serif title.
7. Complete Guide banner.
8. Exactly six subject columns.
9. Left-aligned feature checklist.
10. Circular gold exam-pattern seal.
11. Neutral warm ivory background.
12. Deep bottle-green and muted-gold palette.
13. Photorealistic lower scene.

Only book-specific content and lower scenery change.

Do not independently redesign any cover.
Do not randomly change the layout between generations.

==================================================
N. NEGATIVE INSTRUCTIONS
==================================================

NO yellow colour cast.
NO orange filter.
NO cartoon appearance.
NO drawing.
NO painting.
NO vector landscape.
NO fantasy architecture.
NO excessive gradients.
NO neon green.
NO bright yellow gold.
NO pure-white background.
NO unnecessary ornaments.
NO generated logo.
NO placeholder border.
NO incorrect brand spelling.
NO excessive side padding.
NO narrow central composition.
NO tiny title.
NO extra subject columns.
NO missing subject columns.
NO overlapping text.
NO random lettering.
NO mockup.
NO spine.
NO perspective.
NO external background.

==================================================
FINAL ART DIRECTION
==================================================

Create a photorealistic, premium Indian competitive-exam
book cover that follows the supplied reference image.

The design must look like the SAME PUBLISHING SERIES,
not a newly invented template.

Prioritise photographic realism, accurate colours,
large professional typography and faithful composition.

Reference image first.
Photographic realism second.
Supplied book-specific content third.

Generate only the flat front-cover artwork.
`;
}

// ============================================================
// REFERENCE IMAGE ENCODING
// ============================================================

function getReferenceDataUrl(filePath) {
  const ext = path.extname(filePath).toLowerCase();

  const mimeTypes = {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp'
  };

  const mime = mimeTypes[ext];

  if (!mime) {
    throw new Error(
      `Unsupported reference image format: ${ext}. ` +
      'Use PNG, JPG, JPEG or WebP.'
    );
  }

  const base64 = fs.readFileSync(filePath).toString('base64');

  return `data:${mime};base64,${base64}`;
}

// ============================================================
// GENERATE ONE COVER
// ============================================================

async function generateCover(book, index, referenceDataUrl) {
  const dest = path.join(OUT_DIR, `${book.slug}.png`);

  console.log(
    `\n[${index + 1}/${fiveBooks.length}] ` +
    `Generating ${book.stateName}...`
  );

  const response = await fetch(
    'https://openrouter.ai/api/v1/images',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: MODEL,
        prompt: buildFlatPrompt(book),
        aspect_ratio: '2:3',

        // Actual visual reference, not text-only prompting.
        input_references: [
          {
            type: 'image_url',
            image_url: {
              url: referenceDataUrl
            }
          }
        ]
      }),
      signal: AbortSignal.timeout(180000)
    }
  );

  if (!response.ok) {
    const errorBody = await response.text();

    throw new Error(
      `OpenRouter HTTP ${response.status}: ${errorBody}`
    );
  }

  const json = await response.json();
  const item = json.data?.[0];

  let imageBuffer;

  if (item?.b64_json) {
    imageBuffer = Buffer.from(item.b64_json, 'base64');
  } else if (item?.url) {
    const imageResponse = await fetch(item.url);

    if (!imageResponse.ok) {
      throw new Error(
        `Image download failed: HTTP ${imageResponse.status}`
      );
    }

    imageBuffer = Buffer.from(
      await imageResponse.arrayBuffer()
    );
  } else {
    throw new Error(
      `No image data returned: ${JSON.stringify(json).slice(0, 2000)}`
    );
  }

  // Avoid silently saving an empty response.
  if (imageBuffer.length === 0) {
    throw new Error('The generated image file is empty.');
  }

  fs.writeFileSync(dest, imageBuffer);

  console.log(`✓ Saved: ${dest}`);
  console.log(
    `  File size: ${(imageBuffer.length / 1024 / 1024).toFixed(2)} MB`
  );
}

// ============================================================
// GENERATE THE SERIES
// ============================================================

async function run() {
  console.log('==============================================');
  console.log('VeerNXT | Premium Reference-Based Cover Series');
  console.log('==============================================');
  console.log(`Model: ${MODEL}`);
  console.log(`Reference: ${REFERENCE_IMAGE_PATH}`);
  console.log(`Output: ${OUT_DIR}`);
  console.log(`Aspect ratio: 2:3`);
  console.log('Logo reservation: blank, plain ivory');
  console.log('Style: photographic, not illustrated');
  console.log('Colour: neutral ivory, bottle green, muted gold');
  console.log('==============================================');

  // Read the reference once and reuse it for every book.
  const referenceDataUrl = getReferenceDataUrl(
    REFERENCE_IMAGE_PATH
  );

  let successful = 0;
  let failed = 0;

  for (let i = 0; i < fiveBooks.length; i++) {
    try {
      await generateCover(
        fiveBooks[i],
        i,
        referenceDataUrl
      );

      successful++;
    } catch (error) {
      failed++;

      console.error(
        `\n✗ Failed: ${fiveBooks[i].stateName}\n` +
        `${error.message}\n`
      );
    }

    if (i < fiveBooks.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1500));
    }
  }

  console.log('\n==============================================');
  console.log('GENERATION SUMMARY');
  console.log('==============================================');
  console.log(`Successful: ${successful}`);
  console.log(`Failed: ${failed}`);
  console.log(`Output directory: ${OUT_DIR}`);
  console.log('==============================================');

  if (failed > 0) {
    process.exitCode = 1;
  }
}

run().catch(error => {
  console.error('Fatal error:', error);
  process.exitCode = 1;
});
