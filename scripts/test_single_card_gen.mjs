import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import sharp from 'sharp';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

dotenv.config();

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, R2_PUBLIC_URL } = process.env;

const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

async function generateSingleImage(prompt, slug) {
  console.log(`Generating image for ${slug}...`);
  console.log(`Prompt: ${prompt}`);

  const startTime = Date.now();
  const response = await fetch('https://openrouter.ai/api/v1/images', {
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

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`OpenRouter error ${response.status}: ${errText}`);
  }

  const result = await response.json();
  const b64Data = result.data?.[0]?.b64_json;
  if (!b64Data) {
    throw new Error('No b64_json in OpenRouter response: ' + JSON.stringify(result));
  }

  console.log(`Generation completed in ${((Date.now() - startTime) / 1000).toFixed(1)}s`);

  // Optimize with sharp: resize to 720x405, convert to webp quality 82
  const rawBuffer = Buffer.from(b64Data, 'base64');
  const webpBuffer = await sharp(rawBuffer)
    .resize(720, 405, { fit: 'cover' })
    .webp({ quality: 82, effort: 4 })
    .toBuffer();

  console.log(`Raw size: ${(rawBuffer.length / 1024).toFixed(1)} KB -> Optimized WebP: ${(webpBuffer.length / 1024).toFixed(1)} KB`);

  // Upload to Cloudflare R2
  const key = `exam-cards/${slug}.webp`;
  await s3.send(new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
    Body: webpBuffer,
    ContentType: 'image/webp',
    CacheControl: 'public, max-age=31536000, immutable',
  }));

  const publicUrl = `${R2_PUBLIC_URL.replace(/\/+$/, '')}/${key}`;
  console.log(`Uploaded to R2: ${publicUrl}`);
  return publicUrl;
}

// Quick test with SSC CGL
generateSingleImage(
  'A cinematic photography of a modern wooden study desk, open notebook with SSC CGL embossed on cover, hardcover reference books, elegant warm desk lamp, shallow depth of field, high resolution, realistic studio lighting',
  'ssc-cgl'
).then(url => {
  console.log('SUCCESS! Test URL:', url);
  process.exit(0);
}).catch(err => {
  console.error('FAILED:', err);
  process.exit(1);
});
