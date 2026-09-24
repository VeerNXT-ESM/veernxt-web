import { useEffect, useState } from 'react';
import { supabase } from './supabase';
import { bundledCategoryThumbnail } from './bundledThumbnails';
import { SUBJECT_THUMBNAIL_FILES } from './thumbnailTaxonomy';

export const bundledSubjectThumbnail = (key) => (SUBJECT_THUMBNAIL_FILES[key] ? `/thumbnails/${encodeURIComponent(SUBJECT_THUMBNAIL_FILES[key])}` : null);

/**
 * Single cached read of the two thumbnail tables the admin CMS manages:
 *   lc_exam_categories.thumbnail_url  -> exam thumbnails (by category name)
 *   lc_subjects.thumbnail_url         -> book / study-material thumbnails (by subject key)
 * Fetched once per page load and shared by every component through
 * useThumbnails(); the admin pages call refreshThumbnails() after an upload.
 * A missing/failed fetch just yields no thumbnails (callers fall back to a
 * solid colour), never an error.
 */
const EMPTY = { categories: {}, subjects: {} };
let cache = null;
let inflight = null;
const listeners = new Set();

async function load() {
  const [cats, subs] = await Promise.all([
    supabase.from('lc_exam_categories').select('name,thumbnail_url'),
    supabase.from('lc_subjects').select('key,thumbnail_url'),
  ]);
  const categories = {};
  for (const r of cats.data || []) if (r.thumbnail_url) categories[r.name.trim()] = r.thumbnail_url;
  const subjects = {};
  for (const r of subs.data || []) if (r.thumbnail_url) subjects[r.key] = r.thumbnail_url;
  return { categories, subjects };
}

function ensureLoaded() {
  if (cache || inflight) return;
  inflight = load()
    .catch(() => EMPTY)
    .then((data) => {
      cache = data;
      inflight = null;
      listeners.forEach((fn) => fn(data));
    });
}

export function refreshThumbnails() {
  cache = null;
  inflight = null;
  ensureLoaded();
}

export function useThumbnails() {
  const [data, setData] = useState(cache);
  useEffect(() => {
    listeners.add(setData);
    if (cache) setData(cache);
    else ensureLoaded();
    return () => { listeners.delete(setData); };
  }, []);
  return {
    ready: !!data,
    // DB value first; the bundled public/ art is the fallback until linked in the DB.
    categoryUrl: (name) => (name && (data?.categories[name.trim()] || bundledCategoryThumbnail(name))) || null,
    subjectUrl: (key) => (key && (data?.subjects[key] || bundledSubjectThumbnail(key))) || null,
  };
}
