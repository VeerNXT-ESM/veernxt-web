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

/**
 * Every exam link of a book, across ALL resources rows that serve its content.
 *
 * A "book" in Book Content is identified by its stored content
 * (storage_base_url), but the links to exams are spread over however many
 * resources rows share that content (the legacy one-row-per-link pattern plus
 * newer rows), so reading links for just the canonical resource_id misses most
 * of them. Returns { examIds, resourceIds } where resourceIds are only the rows
 * that actually carry at least one link -- the set an unlink has to target.
 */
export async function loadBookLinks(book) {
  const siblingIds = new Set([book.resourceId]);
  if (book.storageBaseUrl) {
    for (let from = 0; ; from += 1000) {
      const { data, error } = await supabase
        .from('resources')
        .select('resource_id')
        .eq('category', book.category)
        .eq('storage_base_url', book.storageBaseUrl)
        .range(from, from + 999);
      if (error) throw error;
      (data || []).forEach((r) => siblingIds.add(r.resource_id));
      if (!data || data.length < 1000) break;
    }
  }

  const ids = [...siblingIds];
  const chunks = [];
  for (let i = 0; i < ids.length; i += CHUNK) chunks.push(ids.slice(i, i + CHUNK));
  const perChunk = await Promise.all(chunks.map(async (chunk) => {
    const rows = [];
    for (let from = 0; ; from += 1000) {
      const { data, error } = await supabase
        .from('lc_exam_resource_map')
        .select('exam_id,resource_id')
        .eq('category', book.category)
        .in('resource_id', chunk)
        .range(from, from + 999);
      if (error) throw error;
      rows.push(...(data || []));
      if (!data || data.length < 1000) break;
    }
    return rows;
  }));

  const examIds = new Set();
  const resourceIds = new Set();
  for (const r of perChunk.flat()) { examIds.add(r.exam_id); resourceIds.add(r.resource_id); }
  return { examIds: [...examIds], resourceIds: [...resourceIds] };
}
