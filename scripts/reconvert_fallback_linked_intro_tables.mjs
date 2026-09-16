#!/usr/bin/env node
/**
 * scripts/reconvert_fallback_linked_intro_tables.mjs
 *
 * Sibling to reconvert_legacy_intro_tables.mjs, for the small remainder it
 * deliberately excluded: resources with no lc_exam_intro row but that ARE
 * shown to real users via a lc_exam_resource_map(category='intro')
 * fallback row -- see the orphaned-resource classification audit. Exactly
 * the same in-place fix (docx -> mammoth -> table-aware blocks, overwrite
 * chapter-1.json + metadata.json at the SAME storage_base_url), just
 * sourced from _tmp_orphaned_intro_classification.json's
 * "reachableViaFallback" list instead of requiring an exam_id. No
 * resource_id/exam linkage is touched -- these 13 are already correctly
 * wired to their exam via the map table.
 *
 * Usage:
 *   node scripts/reconvert_fallback_linked_intro_tables.mjs             (dry run)
 *   node scripts/reconvert_fallback_linked_intro_tables.mjs --execute
 */
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mammoth from 'mammoth';
import { getS3Client, uploadToR2 } from './lib/ingest-drive-content.js';
import { parseHtmlToBlocks, STYLE_MAP } from './convert_docx_intros_to_blocks.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EXECUTE = process.argv.includes('--execute');
const INPUT_PATH = path.join(__dirname, '_tmp_orphaned_intro_classification.json');

function countTables(blocks) {
  return (blocks || []).filter((b) => b.type === 'table').length;
}
async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${url}`);
  return res.json();
}

async function main() {
  console.log(`Mode: ${EXECUTE ? 'EXECUTE (overwriting chapter-1.json + metadata.json in R2, same resource_id)' : 'DRY RUN (no writes)'}\n`);

  const { reachableViaFallback } = JSON.parse(fs.readFileSync(INPUT_PATH, 'utf-8'));
  console.log(`${reachableViaFallback.length} fallback-linked, table-less resource(s) to reconvert.\n`);

  const s3 = EXECUTE ? getS3Client() : null;
  const bucket = process.env.R2_BUCKET_NAME;

  let ok = 0, failed = 0, skipped = 0;
  for (const row of reachableViaFallback) {
    try {
      if (!fs.existsSync(row.docx_path)) {
        failed++;
        console.error(`[FAIL] "${row.title}" -- docx no longer exists at previously-verified path`);
        continue;
      }
      const [oldChapter, oldMeta] = await Promise.all([
        fetchJson(`${row.storage_base_url}chapters/chapter-1.json`),
        fetchJson(`${row.storage_base_url}metadata.json`),
      ]);
      if (countTables(oldChapter.blocks) > 0) { skipped++; continue; }

      const result = await mammoth.convertToHtml({ path: row.docx_path }, { styleMap: STYLE_MAP });
      const { blocks, imagesSkipped } = parseHtmlToBlocks(result.value);
      const newTableCount = countTables(blocks);

      console.log(
        `[${EXECUTE ? 'ok' : 'dry'}] "${row.title}" -- old: ${(oldChapter.blocks || []).length} blocks/0 tables` +
        ` -> new: ${blocks.length} blocks/${newTableCount} tables` +
        `${imagesSkipped ? `, ${imagesSkipped} image(s) dropped` : ''}`
      );

      if (EXECUTE) {
        const newChapter = { ...oldChapter, blocks };
        const keyPrefix = row.storage_base_url.replace(process.env.R2_PUBLIC_URL + '/', '');
        await uploadToR2(s3, bucket, `${keyPrefix}chapters/chapter-1.json`, Buffer.from(JSON.stringify(newChapter, null, 2)), 'application/json');
        const newMeta = {
          ...oldMeta,
          chapters: (oldMeta.chapters || [{ title: oldChapter.title, order: oldChapter.order || 1, enriched: false, file_name: 'chapters/chapter-1.json' }]).map((c, i) =>
            i === 0 ? { ...c, blocks_count: blocks.length } : c
          ),
        };
        await uploadToR2(s3, bucket, `${keyPrefix}metadata.json`, Buffer.from(JSON.stringify(newMeta, null, 2)), 'application/json');
      }
      ok++;
    } catch (err) {
      failed++;
      console.error(`[FAIL] "${row.title}" -- ${err.message}`);
    }
  }

  console.log('\n--- Summary ---');
  console.log(`Reconverted: ${ok}  Failed: ${failed}  Skipped (already has a table): ${skipped}`);
  if (!EXECUTE) console.log('\nDry run only -- nothing written. Re-run with --execute to overwrite R2 content in place.');
}
main().catch((err) => { console.error('Fatal error:', err); process.exit(1); });
