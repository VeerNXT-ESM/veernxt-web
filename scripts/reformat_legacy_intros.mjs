#!/usr/bin/env node
/**
 * scripts/reformat_legacy_intros.mjs
 *
 * Approach A from the "are all intros in the new JSON format" investigation:
 * 651 of 838 exams with a working Introduction still point at a legacy
 * (non-'blocks') resource -- rendered via dangerouslySetInnerHTML on a
 * `body_html` string (see SecureReader.jsx), not the structured
 * BlockRenderer component tree the new content uses. This script
 * reformats that existing HTML into the same block schema in place --
 * same resource_id, same storage_base_url, same lc_exam_intro row, so
 * there is zero exam-matching risk (these are already correctly linked).
 * It does NOT re-derive from the original docx (that was Option B,
 * rejected -- see conversation) -- table structure already lost by the
 * old ingestion pipeline (ingest-drive-content.js's processDocxBuffer
 * never parsed docx <w:tbl> elements, only <w:p> paragraphs) stays lost;
 * this only gets the styled heading/paragraph/callout/list rendering the
 * new BlockRenderer path provides, reusing parseHtmlToBlocks from
 * convert_docx_intros_to_blocks.mjs (that function doesn't care whether
 * the HTML came from mammoth or was already stored).
 *
 * Usage:
 *   node scripts/reformat_legacy_intros.mjs                 (dry run)
 *   node scripts/reformat_legacy_intros.mjs --execute
 *   node scripts/reformat_legacy_intros.mjs --execute --limit 10
 */
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { getS3Client, uploadToR2 } from './lib/ingest-drive-content.js';
import { parseHtmlToBlocks, generateId } from './convert_docx_intros_to_blocks.mjs';

const ARGS = process.argv.slice(2);
const EXECUTE = ARGS.includes('--execute');
const LIMIT = (() => {
  const i = ARGS.indexOf('--limit');
  return i >= 0 ? parseInt(ARGS[i + 1], 10) : Infinity;
})();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL;

async function fetchAll(table, select) {
  let all = [];
  let from = 0;
  while (true) {
    const { data, error } = await supabase.from(table).select(select).range(from, from + 999);
    if (error) throw error;
    all = all.concat(data || []);
    if (!data || data.length < 1000) break;
    from += 1000;
  }
  return all;
}

// Same key-prefix extraction as SecureReader's own fetch construction,
// inverted -- storage_base_url is `${R2_PUBLIC_URL}/${key}`.
function keyPrefixFromUrl(storageBaseUrl) {
  const prefix = `${R2_PUBLIC_URL}/`;
  if (!storageBaseUrl.startsWith(prefix)) return null;
  return storageBaseUrl.slice(prefix.length);
}

async function main() {
  console.log(`Mode: ${EXECUTE ? 'EXECUTE (writing to R2 + Supabase)' : 'DRY RUN'}\n`);

  console.log('Finding legacy-format Intro resources actually linked to an exam...');
  const [intros, mapRows, resources] = await Promise.all([
    fetchAll('lc_exam_intro', 'exam_id, source, resource_id'),
    fetchAll('lc_exam_resource_map', 'exam_id, resource_id, category').then((rows) =>
      rows.filter((r) => (r.category || '').trim().toLowerCase() === 'intro')
    ),
    fetchAll('resources', 'resource_id, title, format, category, storage_base_url, chapter_count'),
  ]);

  const resourceById = new Map(resources.map((r) => [r.resource_id, r]));
  const linkedResourceIds = new Set();
  for (const i of intros) if (i.source === 'auto' && i.resource_id) linkedResourceIds.add(i.resource_id);
  for (const m of mapRows) linkedResourceIds.add(m.resource_id);

  // No longer filtered to format!=='blocks' -- the metadata.json backfill
  // below (adding a "chapters" array so admin tooling and this repo's own
  // sandbox reader can read it, since SecureReader itself never fetches
  // metadata.json) needs to run against every linked Intro resource,
  // including ones already in blocks format from elsewhere. Already-good
  // metadata.json gets rewritten with equivalent content -- harmless,
  // just a few hundred extra R2 calls.
  //
  // --include-unlinked additionally processes Intro-category resources no
  // exam currently points to (orphaned duplicate/superseded rows from the
  // older messy ingestion, plus a few genuinely-mislabeled ones like mock
  // test papers that got ingested as category='Intro' by mistake) -- opt
  // in explicitly since converting content nobody can see is a lower-
  // priority completeness pass, not something to do by default.
  const INCLUDE_UNLINKED = ARGS.includes('--include-unlinked');
  const targets = resources.filter((r) => {
    if ((r.category || '').trim().toLowerCase() !== 'intro') return false;
    return INCLUDE_UNLINKED || linkedResourceIds.has(r.resource_id);
  });

  console.log(`${targets.length} linked Intro resources to process.\n`);

  const s3 = EXECUTE ? getS3Client() : null;
  const bucket = process.env.R2_BUCKET_NAME;

  let ok = 0, failed = 0, totalBlocks = 0;
  const failures = [];
  const list = targets.slice(0, LIMIT);

  for (const resource of list) {
    const keyPrefix = keyPrefixFromUrl(resource.storage_base_url);
    if (!keyPrefix) {
      failed++;
      failures.push({ resource, reason: `storage_base_url doesn't start with R2_PUBLIC_URL: ${resource.storage_base_url}` });
      continue;
    }

    try {
      const chapterCount = resource.chapter_count || 1;
      const newChapters = [];

      for (let i = 1; i <= chapterCount; i++) {
        const chapterUrl = `${resource.storage_base_url}chapters/chapter-${i}.json`;
        const res = await fetch(chapterUrl);
        if (!res.ok) throw new Error(`chapter-${i}.json fetch failed: HTTP ${res.status}`);
        const chapter = await res.json();

        if (chapter.blocks) {
          // Already blocks-shaped despite format!=='blocks' on the row --
          // just flip the format flag below, nothing to reformat here.
          newChapters.push({ index: i, chapter, changed: false });
          continue;
        }
        if (!chapter.body_html || !chapter.body_html.trim()) {
          throw new Error(`chapter-${i}.json has neither "blocks" nor a real "body_html"`);
        }

        const { blocks } = parseHtmlToBlocks(chapter.body_html);
        const newChapter = { id: generateId(), title: chapter.title || resource.title, order: chapter.order || i, blocks };
        newChapters.push({ index: i, chapter: newChapter, changed: true });
      }

      const blocksCount = newChapters.reduce((sum, c) => sum + (c.chapter.blocks?.length || 0), 0);
      const changedCount = newChapters.filter((c) => c.changed).length;
      console.log(`[ok] "${resource.title}" -- ${chapterCount} chapter(s), ${blocksCount} total blocks, ${changedCount} reformatted`);
      totalBlocks += blocksCount;
      ok++;

      if (EXECUTE) {
        for (const { index, chapter } of newChapters) {
          const key = `${keyPrefix}chapters/chapter-${index}.json`;
          await uploadToR2(s3, bucket, key, Buffer.from(JSON.stringify(chapter, null, 2)), 'application/json');
        }

        // The legacy pipeline's metadata.json (ingest-drive-content.js's
        // shape: resource_id/exam_name/subject/drive_path/...) has no
        // "chapters" array -- SecureReader (production candidate reader)
        // never reads metadata.json at all, so this didn't block real
        // users, but admin tooling (BookChapterBrowser, AdminResourcePreview)
        // and this repo's own sandbox reader do read it and expect that
        // array. Found live: DevReader.jsx crashed with "Cannot read
        // properties of undefined (reading 'map')" on a reformatted
        // resource before this fix. Preserve every existing field, just
        // add/replace "chapters".
        const metaUrl = `${resource.storage_base_url}metadata.json`;
        const metaRes = await fetch(metaUrl);
        const existingMeta = metaRes.ok ? await metaRes.json() : {};
        const newMeta = {
          ...existingMeta,
          title: existingMeta.title || resource.title,
          category: existingMeta.category || resource.category,
          chapter_count: newChapters.length,
          chapters: newChapters.map(({ index, chapter }) => ({
            title: chapter.title,
            order: chapter.order ?? index,
            enriched: false,
            blocks_count: chapter.blocks?.length || 0,
            file_name: `chapters/chapter-${index}.json`,
          })),
        };
        await uploadToR2(s3, bucket, `${keyPrefix}metadata.json`, Buffer.from(JSON.stringify(newMeta, null, 2)), 'application/json');

        const { error } = await supabase.from('resources').update({ format: 'blocks' }).eq('resource_id', resource.resource_id);
        if (error) throw error;
      }
    } catch (err) {
      failed++;
      failures.push({ resource, reason: err.message });
      console.error(`[FAIL] "${resource.title}" (${resource.resource_id}) -- ${err.message}`);
    }
  }

  console.log('\n--- Summary ---');
  console.log(`Reformatted: ${ok}  Failed: ${failed}`);
  console.log(`Total blocks produced: ${totalBlocks}`);
  if (failures.length) {
    console.log(`\nFailures (first 20):`);
    for (const f of failures.slice(0, 20)) console.log(`  "${f.resource.title}" (${f.resource.resource_id}): ${f.reason}`);
  }
  if (!EXECUTE) console.log('\nDry run only -- nothing written. Re-run with --execute to write to R2 + Supabase.');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
