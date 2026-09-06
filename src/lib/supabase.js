import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://jtcyeufhvpieyngracpo.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseAnonKey) {
  throw new Error('VITE_SUPABASE_ANON_KEY is not set — refusing to start without it rather than falling back to a hardcoded key.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Helper: get the profiling engine URL.
 * Uses the local Vercel API route (merged engine) by default.
 * Falls back to the Render instance if VITE_ENGINE_URL is set.
 */
export function getEngineUrl() {
  const envUrl = import.meta.env.VITE_ENGINE_URL;
  if (envUrl && envUrl.trim() !== '') return envUrl;
  // Use local Vercel API route — no CORS, no cold start
  return '';
}
