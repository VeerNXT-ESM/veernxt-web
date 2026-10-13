import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import sharp from 'sharp';
import pLimit from 'p-limit';
import { S3Client, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
if (!OPENROUTER_API_KEY) {
  console.error('ERROR: Missing OPENROUTER_API_KEY in environment variables.');
  process.exit(1);
}

const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, R2_PUBLIC_URL } = process.env;
if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET_NAME) {
  console.error('ERROR: Missing Cloudflare R2 credentials in environment variables.');
  process.exit(1);
}

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('ERROR: Missing Supabase credentials in environment variables.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

// Settings
const CONCURRENCY = 5; // Balanced speed without triggering provider rate-limits
const limit = pLimit(CONCURRENCY);
const MANIFEST_PATH = path.resolve('src/lib/examCardImages.json');

// Distinct camera and lighting palettes to ensure procedural variety across images
const LIGHTING_MOODS = [
  'warm morning golden hour sunlight streaming across the desk',
  'cinematic amber desk lamp with soft moody shadows',
  'bright crisp executive studio daylight with clear sharp detail',
  'evening study atmosphere with subtle warm side illumination',
  'natural diffused window light with elegant bokeh',
];

const COMPOSITIONS = [
  'shallow depth of field close-up with soft background blur',
  'isometric 45-degree tabletop perspective with clean layout',
  'eye-level realistic still-life composition',
  'cinematic dramatic macro shot with razor-sharp focal point',
];

// Context-aware prompt generator tailored strictly to the exam
function generateDistinctPrompt(exam, index) {
  const name = exam.exam_name || 'Competitive Examination';
  const track = (exam.career_track || '').toUpperCase();
  const body = exam.conducting_body || '';
  const state = exam.state_ut || '';
  const nameLower = name.toLowerCase();

  const lighting = LIGHTING_MOODS[index % LIGHTING_MOODS.length];
  const composition = COMPOSITIONS[index % COMPOSITIONS.length];

  let motif = '';
  let quote = 'Dedicated Preparation';

  if (track.includes('POLICE') || nameLower.includes('constable') || nameLower.includes('police') || nameLower.includes('cpo') || nameLower.includes('si')) {
    motif = `Indian Police executive peaked cap with brass emblem badge resting on a polished mahogany duty desk, paired with service handcuffs and an official police case dossier`;
    quote = 'Duty Discipline Service';
  } else if (track.includes('DEFENCE') || track.includes('ARMY') || nameLower.includes('agniveer') || nameLower.includes('nda') || nameLower.includes('cds') || nameLower.includes('afcat')) {
    motif = `Crisp military regimental beret with golden insignia, brass navigational compass, and topographic field strategy map on a rugged wooden table`;
    quote = 'Serve Protect Build India';
  } else if (track.includes('BANKING') || nameLower.includes('bank') || nameLower.includes('ibps') || nameLower.includes('sbi') || nameLower.includes('po ') || nameLower.includes('clerk')) {
    motif = `Prestigious glass-walled commercial banking headquarters in background, foreground executive banker desk with leather ledger, fountain pen, and financial calculator`;
    quote = 'Your Skills Our Future';
  } else if (track.includes('CIVIL SERVICES') || track.includes('ADMINISTRATIVE') || nameLower.includes('upsc') || nameLower.includes('civil service') || nameLower.includes('pcs') || nameLower.includes('ias')) {
    motif = `Stately administrative secretariat desk featuring the National Emblem Lion Capital of Ashoka sculpture, leather-bound Constitution of India, and an official red-ribbon government dossier`;
    quote = 'Nation First';
  } else if (track.includes('RAILWAY') || nameLower.includes('rrb') || nameLower.includes('railway') || nameLower.includes('loco') || nameLower.includes('ntpc')) {
    motif = `Railway engineering blueprints, brass vintage railway signal lantern, and precision track gauge instrument resting on a station master wooden desk`;
    quote = 'Connecting The Nation';
  } else if (track.includes('JUDICIAR') || track.includes('LEGAL') || track.includes('COURT') || nameLower.includes('judge') || nameLower.includes('law')) {
    motif = `Polished wooden judge gavel resting on sound block, brass scales of justice, and thick bound legal case law books on an oak courtroom desk`;
    quote = 'Justice & Integrity';
  } else if (track.includes('TEACH') || track.includes('EDUCATION') || nameLower.includes('tet') || nameLower.includes('prt') || nameLower.includes('tgt') || nameLower.includes('pgt')) {
    motif = `Teacher desk with hardcover educational reference encyclopedia, neat notebooks, chalk, and an elegant brass study globe`;
    quote = 'Empowering Minds';
  } else if (track.includes('HEALTH') || track.includes('NURS') || track.includes('MEDIC') || nameLower.includes('nurse') || nameLower.includes('doctor')) {
    motif = `Modern medical clinical workstation with stainless steel stethoscope, clinical medicine textbook, and caduceus medical insignia`;
    quote = 'Healing With Honour';
  } else if (track.includes('ENGINEER') || track.includes('TECHNICAL') || nameLower.includes('je ') || nameLower.includes('engineer')) {
    motif = `Architectural technical blueprints, precision steel vernier caliper, drafting compass, and engineering workstation stationery`;
    quote = 'Precision & Innovation';
  } else if (track.includes('FOREST') || nameLower.includes('ranger') || nameLower.includes('wildlife')) {
    motif = `Forest ranger service badge, brass binoculars, topographic contour forest map, and botanical handbook on rustic cedar desk`;
    quote = 'Protecting Nature';
  } else if (track.includes('REVENUE') || track.includes('PANCHAYAT') || nameLower.includes('patwari') || nameLower.includes('lekhpal')) {
    motif = `Official cadastral revenue land survey maps, brass measuring chain, revenue seal stamp, and administrative register`;
    quote = 'Grassroots Governance';
  } else if (track.includes('SECRETARIAL') || nameLower.includes('steno') || nameLower.includes('typist')) {
    motif = `Mechanical typewriter keyboard, open shorthand stenography notepad, desktop timer stopwatch, and fountain pen`;
    quote = 'Accuracy Speed Career';
  } else if (nameLower.includes('cgl')) {
    motif = `Prestigious dark blue leather journal embossed with gold Indian National Emblem and text SSC CGL on the cover, resting beside a modern silver laptop keyboard`;
    quote = 'Your Next Step Higher';
  } else if (nameLower.includes('chsl')) {
    motif = `Clean organized study desk with open notepad titled SSC CHSL, fountain pen, modern sleek laptop on side`;
    quote = 'Hard Work Creates Opportunities';
  } else if (nameLower.includes('mts')) {
    motif = `Stacked academic study books and dark leather notebook embossed with Government of India emblem`;
    quote = 'Small Steps Big Dreams';
  } else {
    motif = `Modern scholarly study workspace with thick hardcover reference books for ${body || 'Government Commission'}, personalized examination journal, and fountain pen`;
    quote = 'Discipline Breeds Success';
  }

  const regionalTouch = state ? `, with subtle regional state emblem and cultural aesthetic of ${state}` : '';
  const prompt = `Cinematic commercial stock photography for the "${name}" examination, featuring ${motif}${regionalTouch}. Setting illuminated by ${lighting}, captured with ${composition}. Authentic realistic textures, 8k resolution, professional photography, crisp studio lighting, no artificial distortion.`;

  return { prompt, quote };
}

// Fetch all exams with paged cursor to prevent 1000-row cap
async function fetchAllExamsFromDb() {
  console.log('Fetching all exams from Supabase...');
  const allRows = [];
  const pageSize = 1000;
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from('exams')
      .select('exam_id, exam_name, conducting_body, career_track, state_ut, metadata')
      .order('exam_id')
      .range(from, from + pageSize - 1);

    if (error) throw new Error('Supabase fetch error: ' + error.message);
    if (!data || data.length === 0) break;

    allRows.push(...data);
    if (data.length < pageSize) break;
    from += pageSize;
  }

  console.log(`Successfully fetched ${allRows.length} total exams from database.`);
  return allRows;
}

// Main execution function
async function main() {
  const isDryRun = process.argv.includes('--dry-run');
  const targetLimitArg = process.argv.find(a => a.startsWith('--limit='));
  const targetLimit = targetLimitArg ? parseInt(targetLimitArg.split('=')[1], 10) : null;

  console.log('====================================================');
  console.log(' VEERNXT EXAM CARD MASS IMAGE GENERATOR (OPENROUTER)');
  console.log('====================================================');
  console.log(`Concurrency: ${CONCURRENCY} workers`);
  console.log(`Dry run: ${isDryRun ? 'YES' : 'NO'}`);
  if (targetLimit) console.log(`Limit: First ${targetLimit} exams`);

  // Load existing manifest if present to resume without duplication
  let manifest = {};
  if (fs.existsSync(MANIFEST_PATH)) {
    try { manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8')); } catch (e) {}
  }
  console.log(`Loaded existing manifest with ${Object.keys(manifest).length} cached exam images.`);

  const exams = await fetchAllExamsFromDb();
  const examsToProcess = targetLimit ? exams.slice(0, targetLimit) : exams;

  let completedCount = 0;
  let skippedCount = 0;
  let failedCount = 0;
  const total = examsToProcess.length;

  console.log(`\nProcessing ${total} exams...\n`);

  const tasks = examsToProcess.map((exam, index) => {
    return limit(async () => {
      const examId = exam.exam_id;
      const key = `exam-cards/${examId}.webp`;

      // 1. Check if already exists in manifest or Supabase metadata
      if ((manifest[examId]?.url || exam.metadata?.card_image_url) && !process.argv.includes('--force')) {
        if (!manifest[examId]?.url && exam.metadata?.card_image_url) {
          manifest[examId] = {
            url: exam.metadata.card_image_url,
            quote: exam.metadata.card_quote || 'Dedicated Preparation',
            name: exam.exam_name,
          };
        }
        skippedCount++;
        return;
      }

      const { prompt, quote } = generateDistinctPrompt(exam, index);

      if (isDryRun) {
        console.log(`[DRY RUN] [${index + 1}/${total}] ${exam.exam_name} -> Prompt: ${prompt.slice(0, 80)}...`);
        return;
      }

      // Generate with OpenRouter (with 1 automatic retry on rate-limit)
      let b64 = null;
      const startTime = Date.now();

      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          const res = await fetch('https://openrouter.ai/api/v1/images', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'recraft/recraft-v4.1-flash',
              prompt: prompt,
              aspect_ratio: '16:9',
            }),
          });

          if (res.status === 429) {
            console.warn(`[Rate Limit] Backing off 3s for ${exam.exam_name} (attempt ${attempt})...`);
            await new Promise(r => setTimeout(r, 3000 * attempt));
            continue;
          }

          if (!res.ok) {
            const err = await res.text();
            if (res.status === 402) {
              console.error(`[Credit Limit / Payment Required] OpenRouter 402 for ${exam.exam_name}: ${err}`);
              failedCount++;
              return;
            }
            throw new Error(`OpenRouter HTTP ${res.status}: ${err}`);
          }

          const data = await res.json();
          b64 = data.data?.[0]?.b64_json;
          if (b64) break;
        } catch (err) {
          if (attempt === 3) {
            console.error(`[Fail] ${exam.exam_name} (${examId}): ${err.message}`);
            failedCount++;
            return;
          }
          await new Promise(r => setTimeout(r, 1500));
        }
      }

      if (!b64) {
        failedCount++;
        return;
      }

      try {
        // Optimize to 720x405 WebP via sharp
        const webpBuffer = await sharp(Buffer.from(b64, 'base64'))
          .resize(720, 405, { fit: 'cover' })
          .webp({ quality: 82, effort: 4 })
          .toBuffer();

        // Upload to Cloudflare R2
        await s3.send(new PutObjectCommand({
          Bucket: R2_BUCKET_NAME,
          Key: key,
          Body: webpBuffer,
          ContentType: 'image/webp',
          CacheControl: 'public, max-age=31536000, immutable',
        }));

        const publicUrl = `${R2_PUBLIC_URL.replace(/\/+$/, '')}/${key}`;
        const duration = ((Date.now() - startTime) / 1000).toFixed(1);
        const sizeKb = (webpBuffer.length / 1024).toFixed(1);

        // Update in-memory manifest
        manifest[examId] = {
          url: publicUrl,
          quote: quote,
          sizeKb: sizeKb,
          name: exam.exam_name,
        };

        // Update database record metadata
        const updatedMetadata = {
          ...(exam.metadata || {}),
          card_image_url: publicUrl,
          card_quote: quote,
        };

        await supabase
          .from('exams')
          .update({ metadata: updatedMetadata })
          .eq('exam_id', examId);

        completedCount++;
        const pct = (((completedCount + skippedCount) / total) * 100).toFixed(1);
        console.log(`[${completedCount + skippedCount}/${total}] (${pct}%) ${exam.exam_name} -> ${publicUrl} (${sizeKb} KB, ${duration}s)`);

        // Save manifest every 25 images for safety
        if (completedCount % 25 === 0) {
          fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));
        }
      } catch (uploadErr) {
        console.error(`[Upload Error] ${exam.exam_name}: ${uploadErr.message}`);
        failedCount++;
      }
    });
  });

  await Promise.all(tasks);

  // Final manifest save
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));
  console.log('\n====================================================');
  console.log(' MASS IMAGE GENERATION FINISHED');
  console.log('====================================================');
  console.log(`Total Exams:    ${total}`);
  console.log(`New Generated:  ${completedCount}`);
  console.log(`Skipped/Cached: ${skippedCount}`);
  console.log(`Failed:         ${failedCount}`);
  console.log(`Saved to manifest: ${MANIFEST_PATH}`);
}

main().catch(console.error);
