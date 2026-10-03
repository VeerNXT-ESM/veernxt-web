import { supabase } from '../../../lib/supabase';
import { DEFAULT_TOKENS } from './readerThemeTokens';
import { getRegistryTheme } from './readerThemeRegistry';
import { adminFrom } from '../../../lib/adminDb';

export const READER_CATEGORIES = ['Intro', 'Precis', 'Guide'];

export const DEFAULT_CATEGORY_THEMES = {
  Intro: 'modern',
  Precis: 'examPrep',
  Guide: 'academic',
};

export function normalizeReaderCategory(category, title = '') {
  const cat = String(category || '').trim().toLowerCase();
  if (cat === 'intro' || cat.startsWith('intro')) return 'Intro';
  if (cat === 'precis' || cat.startsWith('precis')) return 'Precis';
  if (cat === 'guide' || cat.startsWith('guide')) return 'Guide';

  // Only if category is not explicitly provided, deduce from title safely
  const t = String(title || '').trim().toLowerCase();
  if (/\b(intro|introduction)\b/i.test(t) || t.startsWith('1.intro') || t.startsWith('intro')) return 'Intro';
  if (/\bprecis\b/i.test(t)) return 'Precis';
  return 'Guide';
}

function getCategoryStorageKey(category) {
  return `veernxt_category_theme_${normalizeReaderCategory(category).toLowerCase()}`;
}

function rowToTheme(row) {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description || '',
    isSystem: false,
    isDefault: !!row.is_default,
    category: row.category || row.tokens?.category || 'All',
    tokens: { ...DEFAULT_TOKENS, ...(row.tokens || {}) },
    updatedAt: row.updated_at,
  };
}

function slugify(name) {
  return (name || 'theme').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'theme';
}

const ADMIN_SECRET = import.meta.env.VITE_ADMIN_API_SECRET;

async function callAdminApi(body) {
  try {
    const res = await fetch('/api/admin/save-resource', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-api-secret': ADMIN_SECRET || '',
      },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    return { ok: res.ok && json.ok, data: json.data, themes: json.themes, categoryDefaults: json.categoryDefaults, error: json.error };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

export async function checkTableExists() {
  try {
    const apiRes = await callAdminApi({ type: 'theme-fetch-all' });
    if (apiRes.ok) return true;
  } catch {
    // fallback
  }
  const { error } = await supabase.from('lc_reader_themes').select('id').limit(1);
  return !error;
}

export function getCategoryDefaultThemeId(category) {
  const norm = normalizeReaderCategory(category);
  try {
    const stored = localStorage.getItem(getCategoryStorageKey(norm));
    if (stored) return stored;
  } catch {
    // localStorage unavailable
  }
  return DEFAULT_CATEGORY_THEMES[norm] || 'academic';
}

export async function setCategoryDefaultTheme(category, themeId) {
  const norm = normalizeReaderCategory(category);
  try {
    localStorage.setItem(getCategoryStorageKey(norm), themeId);
  } catch {
    // ignore
  }

  // Sync to database via admin backend API (bypasses RLS)
  const apiRes = await callAdminApi({
    type: 'theme-category-default',
    category: norm,
    themeId,
  });

  if (!apiRes.ok) {
    // Direct fallback if API not reached
    try {
      const slug = `category-default-${norm.toLowerCase()}`;
      await adminFrom('lc_reader_themes').upsert({
        slug,
        name: `${norm} Active Theme`,
        description: `Active reader theme preset for all ${norm} content`,
        is_default: false,
        is_system: true,
        tokens: { category: norm, targetThemeId: themeId },
        updated_at: new Date().toISOString(),
      }, { onConflict: 'slug' });
    } catch (err) {
      console.warn(`Could not sync ${norm} default theme to database:`, err.message);
    }
  }
}

export async function fetchCategoryDefaultThemes() {
  const defaults = {
    Intro: getCategoryDefaultThemeId('Intro'),
    Precis: getCategoryDefaultThemeId('Precis'),
    Guide: getCategoryDefaultThemeId('Guide'),
  };

  // 1. First attempt via public backend route (service role - bypasses RLS)
  try {
    const res = await fetch('/api/admin/save-resource', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'theme-fetch-all' }),
    });
    if (res.ok) {
      const json = await res.json();
      if (json.ok && json.categoryDefaults) {
        Object.entries(json.categoryDefaults).forEach(([cat, targetId]) => {
          const norm = normalizeReaderCategory(cat);
          if (targetId) {
            defaults[norm] = targetId;
            try {
              localStorage.setItem(getCategoryStorageKey(norm), targetId);
            } catch {
              // ignore
            }
          }
        });
        return defaults;
      }
    }
  } catch (err) {
    console.warn('API theme defaults fetch fallback:', err.message);
  }

  // 2. Direct Supabase query fallback
  try {
    const { data } = await supabase
      .from('lc_reader_themes')
      .select('slug, tokens')
      .in('slug', ['category-default-intro', 'category-default-precis', 'category-default-guide']);

    if (data) {
      data.forEach((row) => {
        const cat = row.tokens?.category;
        const target = row.tokens?.targetThemeId;
        if (cat && target) {
          const norm = normalizeReaderCategory(cat);
          defaults[norm] = target;
          try {
            localStorage.setItem(getCategoryStorageKey(norm), target);
          } catch {
            // ignore
          }
        }
      });
    }
  } catch (err) {
    console.warn('Could not fetch category default themes from database:', err.message);
  }

  return defaults;
}

export async function fetchCustomThemes() {
  // 1. First attempt via public backend route (service role - bypasses RLS)
  try {
    const res = await fetch('/api/admin/save-resource', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'theme-fetch-all' }),
    });
    if (res.ok) {
      const json = await res.json();
      if (json.ok && Array.isArray(json.themes)) {
        return json.themes.map(rowToTheme);
      }
    }
  } catch (err) {
    console.warn('API custom themes fetch fallback:', err.message);
  }

  // 2. Direct Supabase query fallback
  try {
    const { data, error } = await supabase
      .from('lc_reader_themes')
      .select('*')
      .not('slug', 'like', 'category-default-%')
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
    const allCustom = await fetchCustomThemes();
    const match = allCustom.find((t) => t.id === id);
    if (match) return match;
  } catch {
    // fallback
  }

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

export async function saveCustomTheme(theme, targetCategory = null) {
  const category = targetCategory || theme.category || theme.tokens?.category || 'Guide';
  const tokens = { ...theme.tokens, category };

  const themePayload = {
    id: theme.id && !getRegistryTheme(theme.id) ? theme.id : undefined,
    name: theme.name,
    slug: theme.slug || slugify(theme.name),
    description: theme.description || '',
    tokens,
  };

  // 1. Try via Admin Backend API (service role bypasses RLS)
  const apiRes = await callAdminApi({
    type: 'theme-save',
    theme: themePayload,
  });

  if (apiRes.ok && apiRes.data) {
    return rowToTheme(apiRes.data);
  }

  // 2. Direct client fallback
  const row = {
    name: themePayload.name,
    slug: themePayload.slug,
    description: themePayload.description,
    is_system: false,
    tokens,
    updated_at: new Date().toISOString(),
  };

  if (themePayload.id) {
    row.id = themePayload.id;
  }

  const { data, error } = await adminFrom('lc_reader_themes').upsert(row).select().single();
  if (error) throw new Error(apiRes.error || error.message);
  return rowToTheme(data);
}

export async function deleteCustomTheme(id) {
  const apiRes = await callAdminApi({ type: 'theme-delete', id });
  if (apiRes.ok) return;

  const { error } = await adminFrom('lc_reader_themes').delete().eq('id', id);
  if (error) throw new Error(apiRes.error || error.message);
}

export async function setDefaultTheme(id, category = null) {
  if (category) {
    await setCategoryDefaultTheme(category, id);
  }

  const { error: clearErr } = await adminFrom('lc_reader_themes')
    .update({ is_default: false })
    .neq('id', id);
  if (clearErr) console.warn('Could not clear previous default:', clearErr.message);

  const { data, error } = await adminFrom('lc_reader_themes')
    .update({ is_default: true })
    .eq('id', id)
    .select()
    .single();
  if (error) console.warn('Could not mark default in DB:', error.message);
  return data ? rowToTheme(data) : null;
}
