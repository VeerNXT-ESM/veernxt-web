import { useEffect, useState } from 'react';
import { supabase } from './supabase';

/**
 * CMS-managed YouTube videos for the landing page, one per language.
 * DEFAULT_VIDEOS are the built-in ids; the site_videos table (sql/site_videos.sql) only stores overrides,
 * so with no rows the page plays exactly the videos it always did.
 */
export const VIDEO_LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'hi', name: 'हिन्दी (Hindi)' },
  { code: 'ta', name: 'தமிழ் (Tamil)' },
  { code: 'mr', name: 'मराठी (Marathi)' },
  { code: 'te', name: 'తెలుగు (Telugu)' },
  { code: 'kn', name: 'ಕನ್ನಡ (Kannada)' },
];

export const DEFAULT_VIDEOS = {
  en: '3HBSfoM2Sls',
  hi: 'wG--TwXf6yI',
  mr: 'VXhSDvpQOPk',
  te: 'LMnM9SU5rAM',
  ta: 'OdeYjGGomXY',
  kn: 'mgT1G9y8J3E',
};

/** Accepts a full YouTube link (watch, youtu.be, embed, shorts, live) or a bare 11-character id. */
export function parseYouTubeId(input) {
  const v = String(input || '').trim();
  if (!v) return null;
  if (/^[A-Za-z0-9_-]{11}$/.test(v)) return v;
  try {
    const u = new URL(/^https?:\/\//i.test(v) ? v : `https://${v}`);
    const host = u.hostname.replace(/^www\./, '').replace(/^m\./, '');
    let id = null;
    if (host === 'youtu.be') id = u.pathname.split('/')[1];
    else if (host.endsWith('youtube.com') || host.endsWith('youtube-nocookie.com')) {
      if (u.searchParams.get('v')) id = u.searchParams.get('v');
      else {
        const m = u.pathname.match(/^\/(?:embed|shorts|live|v)\/([^/?]+)/);
        if (m) id = m[1];
      }
    }
    return id && /^[A-Za-z0-9_-]{11}$/.test(id) ? id : null;
  } catch {
    return null;
  }
}

const STORAGE_KEY = 'site_videos_cache_v1';
const readStored = () => { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'); } catch { return null; } };
const writeStored = (rows) => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(rows)); } catch { /* storage unavailable */ } };

let cache = readStored(); // { [lang]: row }
let fresh = false;
let inflight = null;
const listeners = new Set();

async function load() {
  const { data, error } = await supabase.from('site_videos').select('*');
  if (error) throw error;
  return Object.fromEntries((data || []).map((r) => [r.lang, r]));
}

function ensureLoaded(force = false) {
  if (!force && (fresh || inflight)) return;
  inflight = load()
    .then((rows) => { cache = rows; fresh = true; writeStored(rows); listeners.forEach((l) => l(rows)); })
    .catch((err) => { console.warn('site_videos not available, using default videos:', err?.message || err); fresh = true; listeners.forEach((l) => l(cache)); })
    .finally(() => { inflight = null; });
}

export const refreshVideos = () => ensureLoaded(true);

export function useVideoRows() {
  const [rows, setRows] = useState(cache);
  useEffect(() => {
    listeners.add(setRows);
    ensureLoaded();
    return () => { listeners.delete(setRows); };
  }, []);
  return { rows: rows || {}, ready: fresh };
}

/** The video id to play for a language: custom if set, else the built-in default, else English. */
export function resolveVideoId(lang, rows = {}) {
  return rows[lang]?.youtube_id || DEFAULT_VIDEOS[lang] || rows.en?.youtube_id || DEFAULT_VIDEOS.en;
}

export const useLandingVideoId = (lang) => resolveVideoId(lang, useVideoRows().rows);
