#!/usr/bin/env node
/**
 * scripts/reconvert_legacy_intro_tables.mjs
 *
 * Fixes the "tables came in as flat text" bug found in ~712 legacy
 * Introduction resources: the original ingestion pipeline
 * (ingest-drive-content.js's processDocxBuffer, or an even older
 * predecessor) only ever walked <w:p> paragraphs in the source docx,
 * never <w:tbl> -- so a table's cells got flattened into a sequence of
 * plain paragraphs with all row/column structure discarded before the
 * "blocks" format ever existed. reformat_legacy_intros.mjs already tried
 * to fix this by re-parsing the stored HTML into blocks, but that can't
 * recover a table that was never captured in the first place.
 *
 * This script instead re-derives the chapter from the ORIGINAL docx (docx
 * -> mammoth -> parseHtmlToBlocks, the same table-aware path
 * convert_docx_intros_to_blocks.mjs uses) and overwrites chapter-1.json
 * (+ metadata.json's blocks_count) AT THE SAME storage_base_url.
 *
 * Deliberately does NOT touch: resource_id, exam_id, lc_exam_intro, the
 * resources row's title/exam_name/format (already 'blocks'), or any
 * exam-matching logic -- see scripts/link_intros_to_exams.mjs for what
 * that risk looks like. This script only runs against resources ALREADY
 * linked to an exam (input list is pre-filtered to exam_id != null), so
 * there is nothing to match: same resource_id in, same resource_id out,
 * just better blocks. The existing chapter's own title/order/id are kept
 * as-is; only "blocks" is replaced.
 *
 * Input: scripts/_tmp_resolved_intro_sources.json, produced by the
 * read-only audit that (a) found which live Intro resources have zero
 * 'table' blocks and (b) located each one's original docx on disk by
 * repairing a missing CENTRAL/STATE/UT EXAMS path segment -- see
 * conversation history. Every row in that file resolved to exactly ONE
 * file on disk (0 ambiguous, 0 missing), so there's no fuzzy matching here
 * either, just reading the file at the path already verified to exist.
 *
 * Usage:
 *   node scripts/reconvert_legacy_intro_tables.mjs                (dry run, no writes anywhere)
 *   node scripts/reconvert_legacy_intro_tables.mjs --execute
 *   node scripts/reconvert_legacy_intro_tables.mjs --execute --limit 5
 *   node scripts/reconvert_legacy_intro_tables.mjs --only "SBI"
 */
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mammoth from 'mammoth';
import { getS3Client, uploadToR2 } from './lib/ingest-drive-content.js';
import { parseHtmlToBlocks, STYLE_MAP } from './convert_docx_intros_to_blocks.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ARGS = process.argv.slice(2);
const EXECUTE = ARGS.includes('--execute');
const LIMIT = (() => {
  const i = ARGS.indexOf('--limit');
  return i >= 0 ? parseInt(ARGS[i + 1], 10) : Infinity;
})();
const ONLY = (() => {
  const i = ARGS.indexOf('--only');
  return i >= 0 ? ARGS[i + 1] : null;
})();

const INPUT_PATH = path.join(__dirname, '_tmp_resolved_intro_sources.json');

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

  if (!fs.existsSync(INPUT_PATH)) {
    console.error(`Missing input file: ${INPUT_PATH}\nRe-run the audit script that produces it first.`);
    process.exit(1);
  }
  let rows = JSON.parse(fs.readFileSync(INPUT_PATH, 'utf-8'));
  rows = rows.filter((r) => r.exam_id); // only resources already linked to a real exam -- see file docstring
  if (ONLY) rows = rows.filter((r) => r.title.toLowerCase().includes(ONLY.toLowerCase()));
  if (rows.length > LIMIT) rows = rows.slice(0, LIMIT);

  console.log(`${rows.length} exam-linked, table-less resource(s) to reconvert.\n`);

  const s3 = EXECUTE ? getS3Client() : null;
  const bucket = process.env.R2_BUCKET_NAME;

  let ok = 0, failed = 0, stillNoTable = 0, skipped = 0;
  const failures = [];
  const stillNoTableList = [];

  for (const row of rows) {
    try {
      if (!fs.existsSync(row.docx_path)) {
        // Shouldn't happen (audit verified this), but the drive can change
        // between the audit run and this one -- never guess a substitute.
        failed++;
        failures.push({ row, reason: 'docx no longer exists at previously-verified path' });
        continue;
      }

      const [oldChapter, oldMeta] = await Promise.all([
        fetchJson(`${row.storage_base_url}chapters/chapter-1.json`),
        fetchJson(`${row.storage_base_url}metadata.json`),
      ]);
      const oldTableCount = countTables(oldChapter.blocks);
      if (oldTableCount > 0) {
        // Live data moved on since the audit snapshot (e.g. already fixed
        // by an earlier partial run) -- don't reprocess, don't overwrite.
        skipped++;
        continue;
      }

      const result = await mammoth.convertToHtml({ path: row.docx_path }, { styleMap: STYLE_MAP });
      const { blocks, imagesSkipped } = parseHtmlToBlocks(result.value);
      const newTableCount = countTables(blocks);

      const newChapter = {
        ...oldChapter,
        blocks, // same id/title/order as before -- only content changes
      };

      console.log(
        `[${EXECUTE ? 'ok' : 'dry'}] "${row.title}" -- old: ${(oldChapter.blocks || []).length} blocks/0 tables` +
        ` -> new: ${blocks.length} blocks/${newTableCount} tables` +
        `${imagesSkipped ? `, ${imagesSkipped} image(s) dropped` : ''}` +
        `${result.messages.length ? `, ${result.messages.length} mammoth warning(s)` : ''}`
      );

      if (newTableCount === 0) {
        // Conversion ran clean but the docx genuinely has no table (or
        // mammoth failed to detect one) -- worth a human glance, not a
        // silent overwrite-and-hope.
        stillNoTable++;
        stillNoTableList.push(row.title);
      }

      if (EXECUTE) {
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
      failures.push({ row, reason: err.message });
      console.error(`[FAIL] "${row.title}" -- ${err.message}`);
    }
  }

  console.log('\n--- Summary ---');
  console.log(`Reconverted: ${ok}  Failed: ${failed}  Skipped (already has a table, moved on since audit): ${skipped}`);
  console.log(`Of the reconverted ones, still zero tables after reconversion (needs a human look): ${stillNoTable}`);
  if (stillNoTableList.length) {
    console.log(`\nStill-zero-tables titles (first 20):`);
    for (const t of stillNoTableList.slice(0, 20)) console.log(`  ${t}`);
  }
  if (failures.length) {
    console.log(`\nFailures (first 20):`);
    for (const f of failures.slice(0, 20)) console.log(`  "${f.row.title}": ${f.reason}`);
  }
  if (!EXECUTE) console.log('\nDry run only -- nothing written. Re-run with --execute to overwrite R2 content in place.');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
