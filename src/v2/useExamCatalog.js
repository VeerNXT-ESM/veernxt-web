import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

/**
 * The whole lc_exams catalog (~1.5k rows), fetched once per page load and
 * shared by every v2 learning screen. Same query LearningCenter.jsx runs,
 * but cached at module level so moving Home -> Browse doesn't refetch.
 */
let cache = null;
let inflight = null;

async function loadCatalog() {
  // Supabase caps unpaginated selects at 1000 rows, so page through.
  let all = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from('lc_exams')
      .select('id,name,category,accent_color,thumbnail_subject,conducting_body_id,conducting_body:lc_conducting_bodies(id,name),region:lc_regions(id,name,level)')
      .range(from, from + 999);
    if (error) throw error;
    all = all.concat(data || []);
    if (!data || data.length < 1000) break;
  }
  return all;
}

export function useExamCatalog() {
  const [state, setState] = useState({
    catalog: cache || [],
    loading: !cache,
    error: null,
  });

  useEffect(() => {
    if (cache) return undefined;
    let cancelled = false;
    inflight = inflight || loadCatalog();
    inflight
      .then((rows) => {
        cache = rows;
        if (!cancelled) setState({ catalog: rows, loading: false, error: null });
      })
      .catch((err) => {
        inflight = null;
        console.error('Failed to load exam catalog:', err);
        if (!cancelled) setState({ catalog: [], loading: false, error: 'Unable to load the exam catalog.' });
      });
    return () => { cancelled = true; };
  }, []);

  return state;
}

export const LEVELS = {
  central: { key: 'central', label: 'Central Exams', short: 'Central', filterTitle: 'Categories' },
  state: { key: 'state', label: 'State Exams', short: 'State', filterTitle: 'States' },
  ut: { key: 'ut', label: 'UT Exams', short: 'Union Territory', filterTitle: 'Union Territories' },
};

/** Group a level's exams by region -> [{ id, name, count }] sorted by name. */
export function regionsForLevel(catalog, level) {
  const map = new Map();
  for (const exam of catalog) {
    if (exam.region?.level !== level) continue;
    const entry = map.get(exam.region.id) || { id: exam.region.id, name: exam.region.name, count: 0 };
    entry.count += 1;
    map.set(exam.region.id, entry);
  }
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
}

/** Group a level's exams by category -> [{ name, count }], preferred order first. */
export function categoriesForLevel(catalog, level, preferredOrder = []) {
  const counts = {};
  for (const exam of catalog) {
    if (exam.region?.level !== level) continue;
    const c = (exam.category || '').trim();
    if (c) counts[c] = (counts[c] || 0) + 1;
  }
  const rank = (n) => {
    const i = preferredOrder.indexOf(n);
    return i === -1 ? preferredOrder.length : i;
  };
  return Object.keys(counts)
    .sort((a, b) => rank(a) - rank(b) || a.localeCompare(b))
    .map((name) => ({ name, count: counts[name] }));
}
