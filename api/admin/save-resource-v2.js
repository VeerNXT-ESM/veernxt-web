import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  if (!supabaseUrl) {
    return res.status(500).json({ error: 'Missing Supabase URL' });
  }

  try {
    // Use service role key if available to bypass RLS, otherwise fallback to standard client
    const supabase = createClient(supabaseUrl, supabaseServiceKey || process.env.VITE_SUPABASE_ANON_KEY);
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
      console.error('Supabase Upsert Error:', error);
      return res.status(400).json({ error: error.message });
    }

    return res.status(200).json({ success: true, data });
  } catch (err) {
    console.error('Save Resource V2 Error:', err);
    return res.status(500).json({ error: err.message });
  }
}
