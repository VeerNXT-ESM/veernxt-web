import { createClient } from '@supabase/supabase-js';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

/**
 * POST /api/admin/save-resource with { type: 'r2-upload', key, contentType, dataBase64 }
 *
 * Proxies a single file to Cloudflare R2 using backend-only env vars.
 * Used by src/lib/r2Uploader.js — that file used to hold the R2 account ID,
 * access key, and secret access key as literal strings, which shipped them
 * into the browser bundle (a live write-credential leak into a public repo).
 * Gated by the same shared x-admin-api-secret header as the redemption
 * admin endpoints; not real auth (see AdminLogin.jsx), just closes this off
 * from being a fully public write API.
 */
async function handleR2Upload(req, res) {
  const expectedSecret = process.env.ADMIN_API_SECRET;
  if (!expectedSecret || req.headers['x-admin-api-secret'] !== expectedSecret) {
    return res.status(401).json({ ok: false, error: 'Unauthorized' });
  }

  const { key, contentType, dataBase64 } = req.body;
  if (!key || !dataBase64) {
    return res.status(400).json({ ok: false, error: 'Missing key or file data' });
  }

  const r2AccountId = process.env.R2_ACCOUNT_ID;
  const r2Bucket = process.env.R2_BUCKET_NAME;
  const r2AccessKeyId = process.env.R2_ACCESS_KEY_ID;
  const r2SecretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const r2PublicUrl = process.env.R2_PUBLIC_URL;
  if (!r2AccountId || !r2Bucket || !r2AccessKeyId || !r2SecretAccessKey || !r2PublicUrl) {
    console.error('[admin/save-resource] Missing R2 env vars on server');
    return res.status(500).json({ ok: false, error: 'Server misconfiguration: R2 credentials not set' });
  }

  try {
    const s3Client = new S3Client({
      region: 'auto',
      endpoint: `https://${r2AccountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId: r2AccessKeyId, secretAccessKey: r2SecretAccessKey },
    });

    await s3Client.send(new PutObjectCommand({
      Bucket: r2Bucket,
      Key: key,
      Body: Buffer.from(dataBase64, 'base64'),
      ContentType: contentType || 'application/octet-stream',
      CacheControl: 'public, max-age=31536000',
    }));

    return res.status(200).json({ ok: true, url: `${r2PublicUrl}/${key}` });
  } catch (err) {
    console.error('[admin/save-resource] R2 upload error:', err.message);
    return res.status(500).json({ ok: false, error: 'Failed to upload to R2' });
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  if (req.body?.type === 'r2-upload') {
    return handleR2Upload(req, res);
  }

  if (!supabaseUrl) {
    return res.status(500).json({ error: 'Missing Supabase credentials on server' });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey || process.env.VITE_SUPABASE_ANON_KEY);

    // Check if this is a V2 resource save call
    if (req.body.metadata || req.body.version === 2) {
      const { metadata, r2Urls } = req.body;
      if (!metadata || !metadata.resource_id) {
        return res.status(400).json({ error: 'Invalid resource metadata provided' });
      }

      const record = {
        resource_id: metadata.resource_id,
        file_hash: metadata.file_hash || '',
        source_file: metadata.source_file || '',
        title: metadata.title,
        exam_name: metadata.exam_name || 'General Exam',
        subject: metadata.subject || 'General',
        category: metadata.category || 'Guide',
        conducting_body: metadata.conducting_body || '',
        website_url: metadata.website_url || '',
        chapter_count: metadata.chapter_count || 0,
        storage_base_url: r2Urls?.storage_base_url || `${process.env.R2_PUBLIC_URL || 'https://pub-82194047da2d4c1c8ff3a6284533ac21.r2.dev'}/structured_resources/${metadata.resource_id}/`,
        metadata_url: r2Urls?.metadata_url || `${process.env.R2_PUBLIC_URL || 'https://pub-82194047da2d4c1c8ff3a6284533ac21.r2.dev'}/structured_resources/${metadata.resource_id}/metadata.json`,
        thumbnail_url: r2Urls?.thumbnail_url || `${process.env.R2_PUBLIC_URL || 'https://pub-82194047da2d4c1c8ff3a6284533ac21.r2.dev'}/structured_resources/${metadata.resource_id}/thumbnail.png`,
        is_freemium: metadata.is_freemium || false,
        is_locked: metadata.is_locked !== undefined ? metadata.is_locked : true,
        status: 'Published',
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('resources_v2')
        .upsert(record, { onConflict: 'resource_id' })
        .select();

      if (error) {
        console.error('Supabase V2 Upsert Error:', error);
        return res.status(400).json({ error: error.message });
      }

      return res.status(200).json({ success: true, data });
    }

    // Standard V1 resource save call
    const { id, dataToSave } = req.body;
    if (!dataToSave) {
      return res.status(400).json({ error: 'No data provided' });
    }

    let result;
    if (id) {
      result = await supabase
        .from('resources')
        .update(dataToSave)
        .eq('id', id)
        .select();
    } else {
      result = await supabase
        .from('resources')
        .insert([dataToSave])
        .select();
    }

    const { data, error } = result;
    if (error) {
      return res.status(400).json({ error: error.message });
    }

    return res.status(200).json({ data });
  } catch (err) {
    console.error('Save Resource Error:', err);
    return res.status(500).json({ error: err.message });
  }
}
