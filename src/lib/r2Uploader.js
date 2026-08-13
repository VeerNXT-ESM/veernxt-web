// Cloudflare R2 public base URL — not secret, safe to keep client-side.
// The write credentials (account ID, access key, secret key) used to be
// hardcoded literals right here, which shipped them into the browser
// bundle. Uploads now go through api/admin/save-resource.js
// (type: 'r2-upload'), which holds the real credentials as backend-only
// env vars that never reach the client. Fallback literal covers local dev
// if VITE_R2_PUBLIC_URL isn't set in .env yet.
export const R2_PUBLIC_URL = import.meta.env.VITE_R2_PUBLIC_URL || 'https://pub-82194047da2d4c1c8ff3a6284533ac21.r2.dev';

const ADMIN_SECRET = import.meta.env.VITE_ADMIN_API_SECRET;

function arrayBufferToBase64(arrayBuffer) {
  const bytes = new Uint8Array(arrayBuffer);
  let binary = '';
  const chunkSize = 0x8000; // avoid call-stack blowup from String.fromCharCode.apply on large arrays
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

async function uploadOneFileToR2(fileObj) {
  let arrayBuffer;
  if (fileObj.body instanceof Blob) {
    arrayBuffer = await fileObj.body.arrayBuffer();
  } else if (fileObj.body instanceof ArrayBuffer) {
    arrayBuffer = fileObj.body;
  } else if (typeof fileObj.body === 'string') {
    arrayBuffer = new TextEncoder().encode(fileObj.body).buffer;
  } else {
    arrayBuffer = fileObj.body;
  }

  const res = await fetch('/api/admin/save-resource', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-admin-api-secret': ADMIN_SECRET },
    body: JSON.stringify({
      type: 'r2-upload',
      key: fileObj.key,
      contentType: fileObj.contentType || 'application/octet-stream',
      dataBase64: arrayBufferToBase64(arrayBuffer),
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.ok) {
    throw new Error(data.error || `Failed to upload ${fileObj.key} (HTTP ${res.status})`);
  }
  return data.url;
}

/**
 * Upload array of files to Cloudflare R2, one at a time via the server
 * proxy (see api/admin/save-resource.js), reporting progress the same way
 * the previous direct-to-R2 version did.
 * r2Files: Array of { key: string, body: Blob, contentType: string }
 */
export async function uploadFilesToR2(r2Files, onProgress) {
  const uploadedUrls = {};
  let completed = 0;

  for (const fileObj of r2Files) {
    try {
      uploadedUrls[fileObj.key] = await uploadOneFileToR2(fileObj);
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
