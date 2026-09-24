import { supabase } from '../../../lib/supabase';
import { DEFAULT_TOKENS } from './readerThemeTokens';
import { getRegistryTheme } from './readerThemeRegistry';

function rowToTheme(row) {
  return {
    id: row.id,
    name: row.name,
    description: row.description || '',
    isSystem: false,
    isDefault: !!row.is_default,
    tokens: { ...DEFAULT_TOKENS, ...(row.tokens || {}) },
    updatedAt: row.updated_at,
  };
}

function slugify(name) {
  return (name || 'theme').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'theme';
}

export async function checkTableExists() {
  const { error } = await supabase.from('lc_reader_themes').select('id').limit(1);
  return !error;
}

export async function fetchCustomThemes() {
  try {
    const { data, error } = await supabase
      .from('lc_reader_themes')
      .select('*')
      .order('created_at', { ascending: true });
    if (error) throw error;
    return (data || []).map(rowToTheme);
  } catch (err) {
    console.warn('Could not load custom reader themes from Supabase:', err.message);
    return [];
  }
}

export async function fetchThemeById(id) {
  const system = getRegistryTheme(id);
  if (system) return system;
  try {
    const { data, error } = await supabase
      .from('lc_reader_themes')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return data ? rowToTheme(data) : null;
  } catch (err) {
    console.warn('Could not load reader theme from Supabase:', err.message);
    return null;
  }
}

export async function saveCustomTheme(theme) {
  const row = {
    name: theme.name,
    slug: theme.slug || slugify(theme.name),
    description: theme.description || '',
    is_system: false,
    tokens: theme.tokens,
    updated_at: new Date().toISOString(),
  };

  // If existing custom theme with UUID, include id
  if (theme.id && !getRegistryTheme(theme.id)) {
    row.id = theme.id;
  }

  const { data, error } = await supabase.from('lc_reader_themes').upsert(row).select().single();
  if (error) throw error;
  return rowToTheme(data);
}

export async function deleteCustomTheme(id) {
  const { error } = await supabase.from('lc_reader_themes').delete().eq('id', id);
  if (error) throw error;
}

export async function setDefaultTheme(id) {
  const { error: clearErr } = await supabase
    .from('lc_reader_themes')
    .update({ is_default: false })
    .neq('id', id);
  if (clearErr) throw clearErr;

  const { data, error } = await supabase
    .from('lc_reader_themes')
    .update({ is_default: true })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return rowToTheme(data);
}
