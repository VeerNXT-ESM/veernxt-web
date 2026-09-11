// Reports how many Intro / Guide / Precis resources actually load into the
// admin "Add Resource" drawer (ExamResourcesPanel.jsx -> AddResourceMapDrawer),
// by replicating its loadAll() logic exactly:
//
//   1. Canonical Guide/Precis books -- same query + grouping + "resolvable
//      storage location" filter as api/admin/save-resource.js's
//      handleBooksList (uses the service-role key server-side, so this
//      script does too when SUPABASE_SERVICE_ROLE_KEY is set -- otherwise
//      it falls back to the anon key and results may undercount any
//      unpublished/RLS-hidden rows).
//   2. Published resources across every category, capped at 1000 rows
//      (the drawer's own query has no pagination past that), added for
//      any (category, title) not already covered by step 1.
//
// Usage (from the repo root, with a populated .env):
//   node scripts/check_add_resource_counts.mjs

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY;
const r2PublicUrl = process.env.VITE_R2_PUBLIC_URL || process.env.R2_PUBLIC_URL;

if (!supabaseUrl || !(serviceKey || anonKey)) {
  console.error('Missing VITE_SUPABASE_URL and/or a Supabase key in .env');
  process.exit(1);
}
if (!serviceKey) {
  console.warn('SUPABASE_SERVICE_ROLE_KEY not set -- falling back to the anon key. ' +
    'The real books-list API runs with the service role, so this run may undercount ' +
    'any Guide/Precis rows RLS hides from anon (e.g. drafts).');
}

const supabase = createClient(supabaseUrl, serviceKey || anonKey);

const BOOK_CATEGORIES = ['Guide', 'Precis'];

function pickCanonicalStorageBaseUrl(rows) {
  const counts = new Map();
  for (const r of rows) {
    if (!r.storage_base_url) continue;
    counts.set(r.storage_base_url, (counts.get(r.storage_base_url) || 0) + 1);
  }
  let best = null, bestCount = 0;
  for (const [url, count] of counts) {
    if (count > bestCount) { best = url; bestCount = count; }
  }
  return best;
}

function prefixFromStorageBaseUrl(storageBaseUrl, publicUrl) {
  if (!storageBaseUrl || !publicUrl) return null;
  const base = publicUrl.replace(/\/$/, '') + '/';
  if (!storageBaseUrl.startsWith(base)) return null;
  return storageBaseUrl.slice(base.length).replace(/\/$/, '');
}

async function fetchBooksList() {
  let rows = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from('resources')
      .select('resource_id,title,category,storage_base_url,chapter_count')
      .in('category', BOOK_CATEGORIES)
      .eq('format', 'blocks')
      .range(from, from + 999);
    if (error) throw new Error(`books-list query failed: ${error.message}`);
    rows = rows.concat(data);
    if (data.length < 1000) break;
  }

  const groups = new Map();
  for (const r of rows) {
    if (!r.title) continue;
    const key = `${r.category}::${r.title.trim().toLowerCase()}`;
    if (!groups.has(key)) groups.set(key, { title: r.title.trim(), category: r.category, rows: [] });
    groups.get(key).rows.push(r);
  }

  const books = [];
  let skippedUnresolvable = 0;
  for (const group of groups.values()) {
    const canonicalUrl = pickCanonicalStorageBaseUrl(group.rows);
    if (!canonicalUrl || !prefixFromStorageBaseUrl(canonicalUrl, r2PublicUrl)) { skippedUnresolvable++; continue; }
    books.push({ title: group.title, category: group.category });
  }
  return { books, skippedUnresolvable, totalGroups: groups.size };
}

async function fetchPublishedResources() {
  const { data, error } = await supabase
    .from('resources')
    .select('resource_id, title, category, conducting_body, exam_name, status')
    .eq('status', 'Published')
    .order('title')
    .limit(1000);
  if (error) throw new Error(`published-resources query failed: ${error.message}`);
  return data || [];
}

(async () => {
  console.log(`Supabase project: ${supabaseUrl}`);
  console.log(`Using ${serviceKey ? 'service role' : 'anon'} key\n`);

  const { books, skippedUnresolvable, totalGroups } = await fetchBooksList();
  const published = await fetchPublishedResources();

  const seen = new Set();
  const allResources = [];

  for (const b of books) {
    const key = `${b.category}::${b.title.trim().toLowerCase()}`;
    if (!seen.has(key)) { seen.add(key); allResources.push(b); }
  }
  for (const r of published) {
    if (!r.title) continue;
    const key = `${r.category}::${r.title.trim().toLowerCase()}`;
    if (!seen.has(key)) { seen.add(key); allResources.push({ title: r.title, category: r.category }); }
  }

  const counts = new Map();
  for (const r of allResources) {
    const c = r.category || '(no category)';
    counts.set(c, (counts.get(c) || 0) + 1);
  }

  console.log(`books-list: ${totalGroups} distinct Guide/Precis titles found, ${skippedUnresolvable} skipped as unresolvable (broken storage link)`);
  console.log(`published resources fetched: ${published.length}${published.length === 1000 ? '  (hit the 1000-row cap -- there may be more)' : ''}`);
  console.log(`\nTotal distinct resources loaded in the Add Resource drawer: ${allResources.length}\n`);

  console.log('By category:');
  for (const cat of ['Intro', 'Guide', 'Precis']) {
    console.log(`  ${cat}: ${counts.get(cat) || 0}`);
  }
  const others = [...counts.keys()].filter((c) => !['Intro', 'Guide', 'Precis'].includes(c));
  if (others.length) {
    console.log('\nOther categories present:');
    for (const c of others.sort()) console.log(`  ${c}: ${counts.get(c)}`);
  }
})().catch((err) => {
  console.error('Failed:', err.message);
  process.exit(1);
});
