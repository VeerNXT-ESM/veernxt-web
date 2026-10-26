import { useEffect, useState } from 'react';
import { supabase } from './supabase';

/**
 * CMS-managed banners for the signed-in pages.
 *
 * BANNER_SLOTS is the single list of banner slots: where each one appears, the
 * size uploads are cropped to, which text fields the admin can edit, and the
 * built-in default image/text. The site_banners table (sql/site_banners.sql)
 * only stores overrides -- an empty column falls back to the default here, so
 * with no rows every page looks exactly as it did before.
 *
 * Rows are fetched once per page load and shared through useBanner(). The last
 * fetched rows are also kept in localStorage so a returning visitor sees the
 * custom banner immediately instead of the default flashing first.
 */

export const BANNER_TEXT_FIELDS = {
  eyebrow: 'Eyebrow (small label)',
  title: 'Title',
  title_highlight: 'Title highlight (accent colour)',
  subtitle: 'Tagline',
  description: 'Description',
  cta_label: 'Button text',
};

export const BANNER_SLOTS = [
  {
    key: 'lc.hero',
    page: 'Learning Center',
    path: '/learning-center',
    label: 'Top hero banner',
    width: 1920,
    height: 640,
    defaults: {
      image: '/hero/hero_image.jpg',
      title: 'Your Learning Center',
      subtitle: 'Prepare. Learn. Grow. Serve Beyond.',
      description: 'Find exams, study material and skills training tailored to your profile.',
    },
  },
  {
    key: 'lc.promo',
    page: 'Learning Center',
    path: '/learning-center',
    label: 'Career promo banner (bottom of Recommended view)',
    width: 1920,
    height: 640,
    defaults: {
      image: '/hero/hero_image.jpg',
      eyebrow: 'VeerNXT Career Transition',
      title: 'Discipline built you.',
      title_highlight: 'Learning takes you further.',
      description:
        'Access structured courses, practice tests and expert content to achieve your next career goal. Built specifically for armed forces personnel transitioning into civilian leadership and public service.',
      cta_label: 'Explore All Courses',
    },
  },
  {
    key: 'lc.state_directory',
    page: 'Learning Center',
    path: '/learning-center',
    label: 'State / UT directory banner (image only)',
    width: 1920,
    height: 560,
    defaults: { image: '/category_banners/state_psc.jpg' },
  },
  {
    key: 'dashboard.welcome',
    page: 'Dashboard',
    path: '/dashboard',
    label: 'Welcome banner behind the profile card (image only)',
    width: 1920,
    height: 560,
    defaults: { image: '/veernxt_assets/banners/B14_next_chapter.png' },
  },
  {
    key: 'dashboard.learning_promo',
    page: 'Dashboard',
    path: '/dashboard',
    label: 'Learning Center promo card (right rail)',
    width: 800,
    height: 600,
    defaults: {
      image: '/veernxt_assets/banners/B08_learning_path.png',
      title: 'Keep Learning.',
      title_highlight: 'Keep Moving Forward.',
      subtitle: 'Every small step builds a bigger future.',
      cta_label: 'Explore Learning Center',
    },
  },
  {
    key: 'jobs.hero',
    page: 'Jobs',
    path: '/jobs',
    label: 'Job board hero banner',
    width: 1920,
    height: 560,
    defaults: {
      image: '/veernxt_assets/banners/B13_next_mission.png',
      eyebrow: 'Careers for Veterans',
      title: 'Discover Your Next Mission',
      description: 'Explore government, PSU and veteran-friendly opportunities that value your service, skills and leadership.',
    },
  },
  {
    key: 'network.hero',
    page: 'Network',
    path: '/network',
    label: 'Network hero banner',
    width: 1920,
    height: 560,
    defaults: {
      image: '/veernxt_assets/banners/B12_my_network.png',
      eyebrow: 'Network',
      title: 'Connect. Collaborate.',
      title_highlight: 'Grow Together.',
      description: 'Build meaningful professional relationships with fellow veterans, government professionals and industry partners.',
    },
  },
];

export const BANNER_SLOT_MAP = Object.fromEntries(BANNER_SLOTS.map((s) => [s.key, s]));

/** Text fields a slot exposes = the ones it has a default for. */
export const slotTextFields = (slot) => Object.keys(BANNER_TEXT_FIELDS).filter((f) => slot.defaults[f] !== undefined);

const STORAGE_KEY = 'site_banners_cache_v1';

function readStored() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeStored(rows) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
  } catch {
    // storage unavailable (private mode, quota) -- the network copy still works
  }
}

let cache = readStored(); // { [key]: row }
let fresh = false;
let inflight = null;
const listeners = new Set();

async function load() {
  const { data, error } = await supabase.from('site_banners').select('*');
  if (error) throw error;
  return Object.fromEntries((data || []).map((r) => [r.key, r]));
}

function ensureLoaded() {
  if (fresh || inflight) return;
  inflight = load()
    .then((rows) => {
      writeStored(rows);
      return rows;
    })
    // A failed fetch (table not created yet, offline) keeps whatever we had -- defaults at worst.
    .catch(() => cache || {})
    .then((rows) => {
      cache = rows;
      fresh = true;
      inflight = null;
      listeners.forEach((fn) => fn(rows));
    });
}

export function refreshBanners() {
  fresh = false;
  inflight = null;
  ensureLoaded();
}

const filled = (v) => typeof v === 'string' && v.trim() !== '';

/** Merges a slot's stored overrides over its defaults. */
export function resolveBanner(key, rows) {
  const slot = BANNER_SLOT_MAP[key];
  if (!slot) throw new Error(`Unknown banner slot: ${key}`);
  const row = rows?.[key] || {};
  const out = { key, customImage: filled(row.image_url), image: filled(row.image_url) ? row.image_url : slot.defaults.image };
  for (const f of Object.keys(BANNER_TEXT_FIELDS)) {
    if (slot.defaults[f] !== undefined) out[f] = filled(row[f]) ? row[f] : slot.defaults[f];
  }
  return out;
}

/** CSS url() value that survives quotes/brackets in the URL. */
export const cssUrl = (url) => `url("${String(url).replace(/["\\\n]/g, encodeURIComponent)}")`;

/**
 * Inline style that sets a CSS custom property to the banner image -- only when
 * a custom image is uploaded, so the stylesheet's own url() stays the fallback.
 */
export const bannerImageStyle = (banner, cssVar, extra = {}) =>
  banner.customImage ? { [cssVar]: cssUrl(banner.image), ...extra } : undefined;

export function useBanner(key) {
  const [rows, setRows] = useState(cache);
  useEffect(() => {
    listeners.add(setRows);
    if (fresh) setRows(cache);
    else ensureLoaded();
    return () => {
      listeners.delete(setRows);
    };
  }, []);
  return resolveBanner(key, rows);
}

/** All rows, for the admin page. */
export function useBannerRows() {
  const [rows, setRows] = useState(cache);
  useEffect(() => {
    listeners.add(setRows);
    refreshBanners();
    return () => {
      listeners.delete(setRows);
    };
  }, []);
  return { rows: rows || {}, ready: fresh };
}
