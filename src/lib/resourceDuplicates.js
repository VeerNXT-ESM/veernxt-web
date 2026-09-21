import { supabase } from './supabase';

/**
 * Stops the same Guide/Precis being linked to an exam twice.
 *
 * Two resource rows are "the same resource" -- even with different
 * resource_ids -- when they share a file_hash (identical bytes), or serve the
 * identical stored content (same storage_base_url + chapter_count + title; the
 * hash differs only because the source .docx was ingested twice under
 * different file names). Same TITLE with different content is deliberately NOT
 * treated as a duplicate (it is a different book that happens to share a name;
 * the content team reviews those separately). This is the exact rule
 * scripts/exam-mapping/dedupe_exam_resources.mjs used to clean the existing data.
 */
const normTitle = (s) => (s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

export function isSameResource(a, b) {
  if (!a || !b) return false;
  if (a.resource_id && a.resource_id === b.resource_id) return true;
  if (a.file_hash && a.file_hash === b.file_hash) return true;
  return Boolean(
    a.storage_base_url && a.storage_base_url === b.storage_base_url
    && a.chapter_count === b.chapter_count
    && normTitle(a.title) === normTitle(b.title),
  );
}

const CHUNK = 100;

async function inChunks(table, column, values, select, extra) {
  const out = [];
  for (let i = 0; i < values.length; i += CHUNK) {
    let q = supabase.from(table).select(select).in(column, values.slice(i, i + CHUNK));
    if (extra) q = extra(q);
    const { data, error } = await q;
    if (error) throw error;
    out.push(...(data || []));
  }
  return out;
}

/** resource_id -> { resource_id, title, file_hash, storage_base_url, chapter_count } */
export async function loadResourceKeys(resourceIds) {
  const ids = [...new Set(resourceIds.filter(Boolean))];
  const rows = await inChunks('resources', 'resource_id', ids, 'resource_id,title,file_hash,storage_base_url,chapter_count');
  return new Map(rows.map((r) => [r.resource_id, r]));
}

/**
 * Which of `examIds` already have `resourceId` -- or an identical resource --
 * linked under `category`? Returns Map(examId -> title of the existing twin).
 * Fails open (returns an empty Map and logs) if the check itself errors, so a
 * transient read failure never blocks legitimate linking; the DB unique index
 * on (exam_id, resource_id) still backstops exact repeats.
 */
export async function examsAlreadyHavingResource(resourceId, examIds, category) {
  const dupes = new Map();
  if (!resourceId || examIds.length === 0) return dupes;
  try {
    const links = await inChunks('lc_exam_resource_map', 'exam_id', examIds, 'exam_id,resource_id', (q) => q.eq('category', category));
    const keys = await loadResourceKeys([resourceId, ...links.map((l) => l.resource_id)]);
    const candidate = keys.get(resourceId) || { resource_id: resourceId };
    for (const l of links) {
      const existing = keys.get(l.resource_id);
      if (existing && isSameResource(candidate, existing) && !dupes.has(l.exam_id)) dupes.set(l.exam_id, existing.title);
    }
  } catch (err) {
    console.warn('Duplicate-resource check failed (continuing):', err);
  }
  return dupes;
}
