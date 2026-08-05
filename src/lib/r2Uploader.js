import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const R2_ACCOUNT_ID = '3d586cada95b2d9c88eb1621d8cd0dc9';
const R2_BUCKET_NAME = 'veernxt-resources';
const R2_ACCESS_KEY_ID = '94db7ae5187ab2ffe386af1235789ec1';
const R2_SECRET_ACCESS_KEY = '5d353112e8337dc2a2f8089f8eaf70a9927bc73e2c04f7f4524cff9f46b2f42f';
export const R2_PUBLIC_URL = 'https://pub-82194047da2d4c1c8ff3a6284533ac21.r2.dev';

// Create Cloudflare R2 S3 Client
const s3Client = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

/**
 * Upload array of files to Cloudflare R2
 * r2Files: Array of { key: string, body: Blob, contentType: string }
 */
export async function uploadFilesToR2(r2Files, onProgress) {
  const uploadedUrls = {};
  let completed = 0;

  for (const fileObj of r2Files) {
    try {
      let arrayBuffer;
      if (fileObj.body instanceof Blob) {
        arrayBuffer = await fileObj.body.arrayBuffer();
      } else if (fileObj.body instanceof ArrayBuffer) {
        arrayBuffer = fileObj.body;
      } else if (typeof fileObj.body === 'string') {
        arrayBuffer = new TextEncoder().encode(fileObj.body);
      } else {
        arrayBuffer = fileObj.body;
      }

      const uint8Array = new Uint8Array(arrayBuffer);

      const command = new PutObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: fileObj.key,
        Body: uint8Array,
        ContentType: fileObj.contentType || 'application/octet-stream',
        CacheControl: 'public, max-age=31536000',
      });

      await s3Client.send(command);

      const publicUrl = `${R2_PUBLIC_URL}/${fileObj.key}`;
      uploadedUrls[fileObj.key] = publicUrl;

      completed++;
      if (onProgress) {
        onProgress(completed, r2Files.length, fileObj.key);
      }
    } catch (err) {
      console.error(`Failed to upload ${fileObj.key} to R2:`, err);
      throw err;
    }
  }

  return uploadedUrls;
}

/**
 * Generate public R2 URLs for a resource ID
 */
export function buildResourceR2Urls(resourceId, chapterCount = 0) {
  const base = `${R2_PUBLIC_URL}/resources/${resourceId}`;
  return {
    storage_base_url: `${base}/`,
    metadata_url: `${base}/metadata.json`,
    thumbnail_url: `${base}/thumbnail.png`,
    chapters: Array.from({ length: chapterCount }, (_, i) => `${base}/chapters/chapter-${i + 1}.json`)
  };
}
