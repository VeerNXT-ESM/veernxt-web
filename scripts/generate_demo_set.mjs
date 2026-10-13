import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import sharp from 'sharp';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, R2_PUBLIC_URL } = process.env;
const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

const DEMO_EXAMS = [
  {
    slug: 'ssc-mts',
    name: 'SSC MTS',
    quote: 'Small Steps Big Dreams',
    prompt: 'Cinematic photograph of stacked academic study books and a dark leather notebook embossed with Government of India emblem, warm amber reading lamp, neat study desk, shallow depth of field, 8k commercial photography',
  },
  {
    slug: 'ssc-cgl',
    name: 'SSC CGL',
    quote: 'Your Next Step Higher',
    prompt: 'Cinematic photography of a modern wooden study desk, open dark blue notebook with SSC CGL embossed on cover, hardcover reference books, elegant warm desk lamp, laptop keyboard, shallow depth of field, realistic studio lighting',
  },
  {
    slug: 'ssc-gd-constable',
    name: 'SSC GD Constable',
    quote: 'Serve Protect Build India',
    prompt: 'Cinematic rear-view portrait of an Indian uniform patrol officer looking towards golden sunrise horizon, tricolor flag waving softly in distant background, disciplined outdoor parade ground, warm morning sunbeams, award-winning photography',
  },
  {
    slug: 'ssc-chsl',
    name: 'SSC CHSL',
    quote: 'Hard Work Creates Opportunities',
    prompt: 'Clean organized study desk with open notepad titled SSC CHSL, fountain pen, modern sleek laptop on side, morning sunlight through window, crisp clear commercial stock photography',
  },
  {
    slug: 'ssc-jht',
    name: 'SSC JHT',
    quote: 'Translation Connects Cultures',
    prompt: 'Stacked hardcover books titled HINDI and ENGLISH prominently on spines, open notebook with bilingual dictionary notes, elegant study glasses, warm study desk lamp, realistic cinematic stock photo',
  },
  {
    slug: 'ssc-stenographer',
    name: 'SSC Stenographer',
    quote: 'Accuracy Speed Career',
    prompt: 'Top-angle close-up shot of skilled hands typing on a stenotype mechanical keyboard, notebook with shorthand transcription, vintage desk lamp, warm atmospheric study lighting, 8k detail',
  },
  {
    slug: 'ssc-selection-post',
    name: 'SSC Selection Post',
    quote: 'Multiple Posts One Goal',
    prompt: 'Stacked textbooks labeled General Studies, Reasoning, Quantitative Aptitude, English on table next to open notebook titled Selection Post, warm study desk, 8k commercial stock photo',
  },
  {
    slug: 'ssc-cpo',
    name: 'SSC CPO',
    quote: 'Law & Order Our Priority',
    prompt: 'Indian Police service peaked cap with golden brass insignia resting on polished mahogany wooden desk, service handcuffs, official case register file, cinematic side lighting, realistic depth of field',
  },
  {
    slug: 'ssc-cgl-tier-2',
    name: 'SSC CGL (Tier 2)',
    quote: 'Higher Level Bigger Goals',
    prompt: 'Cinematic study workspace with notebook featuring written text Higher Level Bigger Goals, financial calculator, laptop keyboard, warm study lamp, dark moody atmosphere',
  },
  {
    slug: 'delhi-police-constable',
    name: 'Delhi Police Constable',
    quote: 'Duty Discipline Service',
    prompt: 'Delhi Police peaked uniform cap with badge insignia on polished wood duty desk, brass buckle, clean law enforcement headquarters ambiance, cinematic warm lighting',
  },
  {
    slug: 'ibps-po',
    name: 'IBPS PO',
    quote: 'Your Skills Our Future',
    prompt: 'Cinematic view of a modern prestigious commercial bank glass building facade in background, executive wooden table in foreground with financial ledger paper and fountain pen, warm professional ambiance',
  },
  {
    slug: 'upsc-civil-services',
    name: 'UPSC Civil Services',
    quote: 'Nation First',
    prompt: 'Majestic architectural perspective of Indian government administrative stone dome with National Emblem Lion Capital of Ashoka sculpture, Indian national tricolor flag waving in clear blue sky, regal cinematic sunlight',
  },
];

async function generateAndUpload(exam) {
  console.log(`[Start] Generating image for ${exam.name} (${exam.slug})...`);
  const t0 = Date.now();

  try {
    const res = await fetch('https://openrouter.ai/api/v1/images', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'recraft/recraft-v4.1-flash',
        prompt: exam.prompt,
        aspect_ratio: '16:9',
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`OpenRouter HTTP ${res.status}: ${err}`);
    }

    const data = await res.json();
    const b64 = data.data?.[0]?.b64ima_json;
    if (!b64) throw new Error('No b64_json returned');

    // Optimize with sharp: 720x405 16:9 WebP
    const webpBuffer = await sharp(Buffer.from(b64, 'base64'))
      .resize(720, 405, { fit: 'cover' })
      .webp({ quality: 82, effort: 4 })
      .toBuffer();

    const key = `exam-cards/${exam.slug}.webp`;
    await s3.send(new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
      Body: webpBuffer,
      ContentType: 'image/webp',
      CacheControl: 'public, max-age=31536000, immutable',
    }));

    const publicUrl = `${R2_PUBLIC_URL.replace(/\/+$/, '')}/${key}`;
    const duration = ((Date.now() - t0) / 1000).toFixed(1);
    const sizeKb = (webpBuffer.length / 1024).toFixed(1);

    console.log(`[Success] ${exam.name}: ${publicUrl} (${sizeKb} KB in ${duration}s)`);
    return {
      slug: exam.slug,
      name: exam.name,
      quote: exam.quote,
      url: publicUrl,
      sizeKb,
    };
  } catch (err) {
    console.error(`[Error] ${exam.name}:`, err.message);
    return null;
  }
}

async function runDemo() {
  console.log(`=== Starting Demo Generation for ${DEMO_EXAMS.length} Exams ===\n`);
  const outPath = path.resolve('src/lib/examCardImages.json');
  let results = {};
  if (fs.existsSync(outPath)) {
    try { results = JSON.parse(fs.readFileSync(outPath, 'utf8')); } catch (e) {}
  }

  const toGenerate = DEMO_EXAMS.filter(e => !results[e.slug]?.url);
  console.log(`Already have ${Object.keys(results).length} images, need to generate ${toGenerate.length} more.`);

  // Run in chunks of 3 for speed and rate-limit friendliness
  for (let i = 0; i < toGenerate.length; i += 3) {
    const chunk = toGenerate.slice(i, i + 3);
    const chunkResults = await Promise.all(chunk.map(generateAndUpload));
    for (const r of chunkResults) {
      if (r) {
        results[r.slug] = {
          url: r.url,
          quote: r.quote,
          sizeKb: r.sizeKb,
        };
      }
    }
  }

  // Save to src/lib/examCardImages.json for instant frontend consumption
  fs.writeFileSync(outPath, JSON.stringify(results, null, 2));
  console.log(`\nSaved mapping to ${outPath}`);
  console.log(`Demo generation complete: ${Object.keys(results).length}/${DEMO_EXAMS.length} succeeded!`);
}

runDemo().catch(console.error);
