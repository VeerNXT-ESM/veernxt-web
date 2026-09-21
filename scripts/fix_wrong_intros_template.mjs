#!/usr/bin/env node
/**
 * scripts/fix_wrong_intros_template.mjs
 *
 * Reusable template for the Drive-vs-DB Introduction audit
 * (docs/status_report.md, "Drive-vs-DB Introduction audit"). Copy this to
 * scripts/_tmp_fix_<category>_intros.mjs per category, point PLAN_PATH at
 * that category's _tmp_<category>_plan.json ({ relink: [{examId,
 * examLabel, conductingBody, docxPath}] }), and run dry then --execute.
 *
 * Title rule: never leaves underscores in a generated title (user
 * directive) -- strips them from the raw docx-filename-derived title
 * unconditionally, and falls back to "<conductingBody> - <examLabel>"
 * whenever the raw filename is just "Introduction" (extremely common --
 * most category folders use a generic "Introduction.docx" filename).
 *
 * Usage:
 *   node scripts/_tmp_fix_<category>_intros.mjs              (dry run)
 *   node scripts/_tmp_fix_<category>_intros.mjs --execute
 */
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import mammoth from 'mammoth';
import { createClient } from '@supabase/supabase-js';
import { getS3Client, uploadToR2 } from './lib/ingest-drive-content.js';
import { parseHtmlToBlocks, generateId, STYLE_MAP } from './convert_docx_intros_to_blocks.mjs';

const EXECUTE = process.argv.includes('--execute');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const PLAN_PATH = 'scripts/_tmp_REPLACE_plan.json'; // <-- point this at the category's plan file
const plan = JSON.parse(fs.readFileSync(PLAN_PATH, 'utf-8'));

const UNLINK_ONLY = []; // [{ examId, examLabel, conductingBody, currentTitle }]

function cleanTitle(rawTitle, conductingBody, examLabel) {
  if (/^introduction$/i.test(rawTitle)) return `${conductingBody} - ${examLabel}`;
  return rawTitle.replace(/_/g, ' ').replace(/\s+/g, ' ').trim();
}

async function publish(item, s3, bucket, publicUrl) {
  if (!fs.existsSync(item.docxPath)) throw new Error('docx not found at plan-time path');
  const result = await mammoth.convertToHtml({ path: item.docxPath }, { styleMap: STYLE_MAP });
  const { blocks, imagesSkipped } = parseHtmlToBlocks(result.value);
  const tableCount = blocks.filter((b) => b.type === 'table').length;
  const rawTitle = path.basename(item.docxPath).replace(/\.[^/.]+$/, '');
  const title = cleanTitle(rawTitle, item.conductingBody, item.examLabel);

  console.log(`  -> ${blocks.length} blocks, ${tableCount} table(s)${imagesSkipped ? `, ${imagesSkipped} image(s) dropped` : ''} (title: "${title}")`);

  if (!EXECUTE) return;

  const chapter = { id: generateId(), title, order: 1, blocks };
  const metadata = {
    book_id: generateId(),
    title,
    source_file: path.relative('G:\\My Drive\\VeerNXT_Final_Content', item.docxPath),
    category: 'Intro',
    chapter_count: 1,
    image_count: 0,
    chapters: [{ title, order: 1, enriched: false, blocks_count: blocks.length, file_name: 'chapters/chapter-1.json' }],
  };

  const resourceId = crypto.randomUUID();
  const prefix = `structured_resources/blocks/Intro/${resourceId}`;
  await uploadToR2(s3, bucket, `${prefix}/metadata.json`, Buffer.from(JSON.stringify(metadata, null, 2)), 'application/json');
  await uploadToR2(s3, bucket, `${prefix}/chapters/chapter-1.json`, Buffer.from(JSON.stringify(chapter, null, 2)), 'application/json');

  const storageBaseUrl = `${publicUrl}/${prefix}/`;
  const { error: resErr } = await supabase.from('resources').insert({
    resource_id: resourceId,
    file_hash: crypto.createHash('sha256').update(JSON.stringify(chapter)).digest('hex'),
    source_file: metadata.source_file,
    title,
    exam_name: item.examLabel,
    subject: 'General',
    category: 'Intro',
    conducting_body: item.conductingBody || '',
    website_url: '',
    chapter_count: 1,
    format: 'blocks',
    storage_base_url: storageBaseUrl,
    metadata_url: `${storageBaseUrl}metadata.json`,
    thumbnail_url: null,
    is_freemium: true,
    is_locked: false,
    status: 'Published',
    updated_at: new Date().toISOString(),
  });
  if (resErr) throw resErr;

  const { error: introErr } = await supabase.from('lc_exam_intro').upsert(
    { exam_id: item.examId, resource_id: resourceId, manual_title: null, manual_body: null, source: 'auto', updated_at: new Date().toISOString() },
    { onConflict: 'exam_id' }
  );
  if (introErr) throw introErr;
}

async function main() {
  console.log(`Mode: ${EXECUTE ? 'EXECUTE (writes to R2 + Supabase)' : 'DRY RUN (no writes)'}\n`);
  const s3 = EXECUTE ? getS3Client() : null;
  const bucket = process.env.R2_BUCKET_NAME;
  const publicUrl = process.env.R2_PUBLIC_URL;

  console.log(`--- RELINK/NEW-LINK (${plan.relink.length}) ---`);
  for (const item of plan.relink) {
    console.log(`[${item.conductingBody} / ${item.examLabel}]  exam_id=${item.examId}`);
    try {
      await publish(item, s3, bucket, publicUrl);
    } catch (err) {
      console.error(`  [FAIL] ${err.message}`);
    }
  }

  if (UNLINK_ONLY.length) {
    console.log(`\n--- UNLINK ONLY (${UNLINK_ONLY.length}) ---`);
    for (const item of UNLINK_ONLY) {
      console.log(`[${item.conductingBody} / ${item.examLabel}]  exam_id=${item.examId} -- removing wrong intro "${item.currentTitle}", reverting to No Intro`);
      if (EXECUTE) {
        const { error } = await supabase.from('lc_exam_intro').delete().eq('exam_id', item.examId);
        if (error) console.error(`  [FAIL] ${error.message}`);
      }
    }
  }

  if (!EXECUTE) console.log('\nDry run only -- nothing written. Re-run with --execute to apply.');
}

main().catch((err) => { console.error('Fatal error:', err); process.exit(1); });
