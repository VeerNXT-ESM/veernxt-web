#!/usr/bin/env node
/**
 * scripts/fix_ut_wrong_intros.mjs
 *
 * Fixes the "Wrong Intro" rows from the client's own
 * "UT LIST INTRO UPDATE STATUS.xlsx" audit: 30 UT-level exams (expanding
 * to 38 exam_ids once combined role labels like "Clerk / Assistant /
 * Non-Teaching Staff" are matched to individual DB rows) were auto-linked
 * to a generic same-role intro written for a DIFFERENT exam entirely --
 * e.g. Andaman & Nicobar's "Medical Officer / Specialist" was showing the
 * "Nagaland Medical Officer" intro, which literally opens "conducted by
 * the Department of Health & Family Welfare, Nagaland". Confirmed via
 * scripts/_tmp_find_ut_replacements.mjs (kept as an artifact of this
 * investigation, not re-run by this script) that real UT-specific docx
 * source files exist on disk for 36 of the 38 -- this script converts
 * those (docx -> mammoth -> table-aware blocks, the same path
 * convert_docx_intros_to_blocks.mjs uses) and REPLACES the wrong
 * resource_id on lc_exam_intro with a new correct one.
 *
 * For the remaining 2 (J&K Civil Defence Volunteer, J&K Agniveer), the
 * source folder only contains a placeholder "*_README.txt", no real docx
 * -- confirmed by hand, not guessed. Per explicit instruction ("only
 * unlink where none exist"), those two get their lc_exam_intro row
 * DELETED instead, reverting them to "No Intro" rather than continuing to
 * show wrong content.
 *
 * This does NOT touch the exam row itself, and does not use any fuzzy
 * exam-matching at write time -- the exam_id <-> docx pairing was already
 * fixed by the read-only investigation (see
 * scripts/_tmp_ut_wrong_intro_fix_plan.json), this script just executes
 * exactly those pairings.
 *
 * Generalized to take any --plan file of the same {found, notFound} shape
 * -- reused as-is for the follow-up state-level "Wrong Intro" audit
 * (Arunachal-to-Kerala doc), which found the opposite mix: only 1 of 37
 * had real content ready, the other 36 were still literal
 * "_PENDING_CONTENT.docx" placeholders the content team hasn't written yet.
 *
 * Usage:
 *   node scripts/fix_ut_wrong_intros.mjs                                    (dry run, no writes)
 *   node scripts/fix_ut_wrong_intros.mjs --execute
 *   node scripts/fix_ut_wrong_intros.mjs --plan _tmp_state_wrong_intro_fix_plan.json --execute
 */
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import mammoth from 'mammoth';
import { createClient } from '@supabase/supabase-js';
import { getS3Client, uploadToR2 } from './lib/ingest-drive-content.js';
import { parseHtmlToBlocks, generateId, STYLE_MAP } from './convert_docx_intros_to_blocks.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EXECUTE = process.argv.includes('--execute');
const PLAN_ARG = (() => {
  const i = process.argv.indexOf('--plan');
  return i >= 0 ? process.argv[i + 1] : '_tmp_ut_wrong_intro_fix_plan.json';
})();
const PLAN_PATH = path.join(__dirname, PLAN_ARG);

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  console.log(`Mode: ${EXECUTE ? 'EXECUTE (writes to R2 + Supabase)' : 'DRY RUN (no writes)'}\n`);

  const { found, notFound } = JSON.parse(fs.readFileSync(PLAN_PATH, 'utf-8'));
  console.log(`${found.length} exams to relink to a real UT-specific intro.`);
  console.log(`${notFound.length} exams to unlink (no real content exists).\n`);

  const s3 = EXECUTE ? getS3Client() : null;
  const bucket = process.env.R2_BUCKET_NAME;
  const publicUrl = process.env.R2_PUBLIC_URL;

  let relinkOk = 0, relinkFailed = 0, unlinkOk = 0, unlinkFailed = 0;

  console.log('--- Relinking to real content ---');
  for (const item of found) {
    try {
      if (!fs.existsSync(item.candidate.docxPath)) throw new Error('docx no longer exists at previously-verified path');

      const result = await mammoth.convertToHtml({ path: item.candidate.docxPath }, { styleMap: STYLE_MAP });
      const { blocks, imagesSkipped } = parseHtmlToBlocks(result.value);
      const tableCount = blocks.filter((b) => b.type === 'table').length;

      console.log(
        `[${EXECUTE ? 'ok' : 'dry'}] "${item.conducting_body} / ${item.exam_name}"` +
        ` -- was "${item.currentIntro.title}" -> now real content: ${blocks.length} blocks, ${tableCount} table(s)` +
        `${imagesSkipped ? `, ${imagesSkipped} image(s) dropped` : ''}`
      );

      if (EXECUTE) {
        const title = path.basename(item.candidate.docxPath).replace(/\.[^/.]+$/, '');
        const chapter = { id: generateId(), title, order: 1, blocks };
        const metadata = {
          book_id: generateId(),
          title,
          source_file: item.candidate.folderRel,
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
          source_file: item.candidate.folderRel,
          title,
          exam_name: item.exam_name,
          subject: 'General',
          category: 'Intro',
          conducting_body: item.conducting_body || '',
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
      relinkOk++;
    } catch (err) {
      relinkFailed++;
      console.error(`[FAIL] "${item.conducting_body} / ${item.exam_name}" -- ${err.message}`);
    }
  }

  console.log('\n--- Unlinking (no real content exists) ---');
  for (const item of notFound) {
    console.log(`[${EXECUTE ? 'ok' : 'dry'}] "${item.conducting_body} / ${item.exam_name}" -- removing wrong intro "${item.currentIntro.title}", reverting to No Intro`);
    if (EXECUTE) {
      const { error } = await supabase.from('lc_exam_intro').delete().eq('exam_id', item.examId);
      if (error) { unlinkFailed++; console.error(`[FAIL] ${error.message}`); continue; }
    }
    unlinkOk++;
  }

  console.log('\n--- Summary ---');
  console.log(`Relinked to real content: ${relinkOk}  Failed: ${relinkFailed}`);
  console.log(`Unlinked (no content): ${unlinkOk}  Failed: ${unlinkFailed}`);
  if (!EXECUTE) console.log('\nDry run only -- nothing written. Re-run with --execute to apply.');
}
main().catch((err) => { console.error('Fatal error:', err); process.exit(1); });
