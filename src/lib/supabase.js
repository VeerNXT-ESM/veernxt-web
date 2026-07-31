import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://jtcyeufhvpieyngracpo.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp0Y3lldWZodnBpZXluZ3JhY3BvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Njk2Mjk1NiwiZXhwIjoyMDkyNTM4OTU2fQ.yoV9_lKyHM5o-69k5HcOppfqIwUhNSMbtA_j2eQzL78';

// Real Supabase client — no more mock overrides
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
