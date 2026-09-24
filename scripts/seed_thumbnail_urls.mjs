#!/usr/bin/env node
/**
 * scripts/seed_thumbnail_urls.mjs
 *
 * One-time seed after sql/lc_thumbnails.sql: fills lc_subjects from the
 * taxonomy in src/lib/thumbnailTaxonomy.js, and points each subject/category
 * at the art already shipped in public/thumbnails/ and
 * public/category_thumbnails/<level>/. Never overwrites a thumbnail_url that
 * is already set (e.g. one uploaded from the admin pages). Idempotent.
 *
 * Usage: node scripts/seed_thumbnail_urls.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { THUMBNAIL_SUBJECTS, SUBJECT_THUMBNAIL_FILES } from '../src/lib/thumbnailTaxonomy.js';

function loadEnv() {
  const lines = fs.readFileSync(path.resolve(process.cwd(), '.env'), 'utf-8').split('\n');
  for (const line of lines) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq === -1) continue;
    const key = t.slice(0, eq).trim();
    if (!(key in process.env)) process.env[key] = t.slice(eq + 1).trim();
  }
}
loadEnv();

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

async function main() {
  const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

  // Subjects
  const { data: existingSubjects, error: subjErr } = await sb.from('lc_subjects').select('key,thumbnail_url');
  if (subjErr) throw subjErr;
  const have = new Map((existingSubjects || []).map((r) => [r.key, r.thumbnail_url]));
  const rows = Object.entries(THUMBNAIL_SUBJECTS).map(([key, s]) => ({
    key,
    label: s.label,
    color_family: s.family,
    // Keep an uploaded (R2) thumbnail; refresh anything still pointing at a bundled /thumbnails/ file.
    thumbnail_url: (have.get(key) && !have.get(key).startsWith('/thumbnails/') ? have.get(key) : null) || (SUBJECT_THUMBNAIL_FILES[key] ? `/thumbnails/${encodeURIComponent(SUBJECT_THUMBNAIL_FILES[key])}` : null),
  }));
  const { error: upErr } = await sb.from('lc_subjects').upsert(rows, { onConflict: 'key' });
  if (upErr) throw upErr;
  console.log(`subjects: ${rows.length} upserted, ${rows.filter((r) => r.thumbnail_url).length} with a thumbnail`);

  // Categories
  const bySlug = {};
  for (const level of ['central', 'state', 'ut']) {
    for (const f of fs.readdirSync(path.resolve('public/category_thumbnails', level))) {
      if (f.endsWith('.webp')) bySlug[f.replace('.webp', '')] = `/category_thumbnails/${level}/${f}`;
    }
  }
  const { data: cats, error: catErr } = await sb.from('lc_exam_categories').select('id,name,thumbnail_url');
  if (catErr) throw catErr;
  let set = 0, missing = [];
  for (const c of cats) {
    if (c.thumbnail_url) continue;
    const url = bySlug[slug(c.name)];
    if (!url) { missing.push(c.name); continue; }
    const { error } = await sb.from('lc_exam_categories').update({ thumbnail_url: url }).eq('id', c.id);
    if (error) throw error;
    set++;
  }
  console.log(`categories: ${set} linked to existing art, ${missing.length} without a thumbnail`);
  if (missing.length) console.log(missing.join(', '));
}

main().catch((e) => { console.error(e); process.exit(1); });
