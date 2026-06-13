import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  if (!supabaseUrl || !supabaseServiceKey) {
    return res.status(500).json({ error: 'Missing Supabase credentials on server' });
  }

  try {
    // We use the Service Role key here to completely bypass Row Level Security (RLS)
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
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
