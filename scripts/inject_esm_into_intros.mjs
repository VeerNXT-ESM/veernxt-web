#!/usr/bin/env node
/**
 * scripts/inject_esm_into_intros.mjs
 *
 * Inserts Ex-Servicemen (ESM) Reservation, ESM Age Relaxation, and
 * Paramilitary (Ex-CAPF / Assam Rifles) details from the 3 ESM Excel files
 * into existing exam Introduction JSON files (`chapters/chapter-1.json` +
 * `metadata.json`) in Cloudflare R2.
 *
 * Dry-run by default! Pass --execute to write to Cloudflare R2.
 * Always run `node scripts/backup_intros_r2.mjs` before `--execute`.
 *
 * Usage:
 *   node scripts/inject_esm_into_intros.mjs
 *   node scripts/inject_esm_into_intros.mjs --only "SSC CGL"
 *   node scripts/inject_esm_into_intros.mjs --limit 10
 *   node scripts/inject_esm_into_intros.mjs --execute
 */
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import pLimit from 'p-limit';
import { createClient } from '@supabase/supabase-js';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { getS3Client, uploadToR2 } from './lib/ingest-drive-content.js';
import { parseAllExcelRows, normalizeName } from './audit_esm_excel_matches.mjs';

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

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});
const R2_PUBLIC_URL = (process.env.R2_PUBLIC_URL || '').replace(/\/+$/, '');
const R2_BUCKET = process.env.R2_BUCKET_NAME;

function normalizeStateFix(s) {
  const n = normalizeName(s).replace(/\s+/g, ' ');
  if (n === 'lakshadwee p' || n === 'lakshadweep') return 'lakshadweep';
  if (n === 'andaman and nicobar' || n === 'andaman nicobar' || n === 'andaman and nicobar islands') {
    return 'andaman and nicobar islands';
  }
  if (n.includes('dadra') && n.includes('daman')) return 'dadra and nagar haveli and daman and diu';
  if (n === 'jammu and kashmir' || n === 'j and k' || n === 'jk') return 'jammu and kashmir';
  if (n === 'delhi' || n === 'nct of delhi' || n === 'new delhi') return 'delhi';
  if (n === 'puducherry' || n === 'pondicherry') return 'puducherry';
  return n;
}

function scoreExamMatch(row, exam, allowCrossScope = false) {
  const rowNorm = normalizeName(row.exam_name);
  const examNorm = normalizeName(exam.exam_name);
  if (!rowNorm || !examNorm) return 0;

  const examState = normalizeStateFix(exam.state_ut || '');
  const rowState = normalizeStateFix(row.state || '');

  if (!allowCrossScope) {
    if (row.scope === 'central') {
      if (examState && examState !== 'all india' && examState !== 'central') return 0;
    } else {
      if (rowState && examState && rowState !== examState) return 0;
      if (rowState && !examState) return 0;
    }
  }

  if (rowNorm === examNorm) return 100;

  // Handle UT GDS alias: "GDS / Postal Assistant" -> "<UT> GDS (Gramin Dak Sevak)"
  if (rowNorm.includes('gds') && examNorm.includes('gds')) return 90;

  const rowNoParen = normalizeName(row.exam_name.replace(/\([^)]*\)/g, ''));
  const examNoParen = normalizeName(exam.exam_name.replace(/\([^)]*\)/g, ''));
  if (rowNoParen && examNoParen && rowNoParen === examNoParen) return 92;

  if (examNorm.includes(rowNorm) || rowNorm.includes(examNorm)) {
    const ratio = Math.min(rowNorm.length, examNorm.length) / Math.max(rowNorm.length, examNorm.length);
    if (ratio >= 0.55) return 75 + Math.round(ratio * 15);
  }

  const aWords = new Set(rowNorm.split(' ').filter((w) => w.length > 1));
  const bWords = new Set(examNorm.split(' ').filter((w) => w.length > 1));
  let overlap = 0;
  for (const w of aWords) if (bWords.has(w)) overlap++;
  const union = new Set([...aWords, ...bWords]).size || 1;
  const jaccard = overlap / union;
  if (jaccard >= 0.65) return Math.round(jaccard * 75);
  return 0;
}

function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function stripTags(html) {
  return String(html || '').replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').trim();
}

const FOOTER_HEADING_RE = /^(?:\d+\.\s*)?(?:important\s+(?:website\s+)?links?|important\s+web\s*site\s+links?|website|official\s+website|preparation\s+tips|pro-?tips|important\s+note|medical\s+standards)\b/i;

const AGNIVEER_SUBHEADING_RE = /^(?:[1-9]\.\s*(?:age\s+relaxation|reservation|physical|skill|fee|other\s+concessions)|10%\s+horizontal|age\s+relaxation|physical\s+efficiency|preference\s+in\s+tie|important\s+steps\s+for\s+2026)/i;

function detectSectionHeadingLevel(blocks) {
  const counts = new Map();
  for (const b of blocks) {
    if (b.type === 'heading' && b.level) {
      counts.set(b.level, (counts.get(b.level) || 0) + 1);
    }
  }
  let bestLevel = 4;
  let bestCount = -1;
  for (const [lvl, cnt] of counts) {
    if (cnt > bestCount) {
      bestCount = cnt;
      bestLevel = lvl;
    }
  }
  return bestLevel;
}

export function buildEsmBlocks(row, sectionLevel) {
  return [
    {
      id: 'esm-heading-1',
      type: 'heading',
      level: sectionLevel,
      content: 'Ex-Servicemen (ESM) &amp; Paramilitary (Ex-CAPF / Assam Rifles) Provisions',
    },
    {
      id: 'esm-table-1',
      type: 'table',
      rows: [
        {
          isHeader: true,
          cells: ['Category / Provision', 'Applicable Details'],
        },
        {
          isHeader: false,
          cells: [
            '<strong>Ex-Servicemen (ESM) Reservation</strong>',
            escapeHtml(row.esm_reservation || 'Not specified'),
          ],
        },
        {
          isHeader: false,
          cells: [
            '<strong>ESM Age Relaxation</strong>',
            escapeHtml(row.esm_age_relaxation || 'Not specified'),
          ],
        },
        {
          isHeader: false,
          cells: [
            '<strong>Paramilitary (Ex-CAPF / Assam Rifles)</strong>',
            escapeHtml(row.paramilitary_info || 'Not specified'),
          ],
        },
      ],
    },
  ];
}

export function upsertEsmBlocks(existingBlocks, row) {
  // Remove any previously injected ESM blocks for idempotency
  const cleaned = existingBlocks.filter((b) => !(b.id && String(b.id).startsWith('esm-')));
  const sectionLevel = detectSectionHeadingLevel(cleaned);
  const newBlocks = buildEsmBlocks(row, sectionLevel);

  // 1. Try inserting right after the Agniveer section (and all its sub-blocks)
  const agniveerIdx = cleaned.findIndex(
    (b) => b.type === 'heading' && /agniveer/i.test(stripTags(b.content))
  );
  if (agniveerIdx >= 0) {
    let insertAt = agniveerIdx + 1;
    while (insertAt < cleaned.length) {
      const b = cleaned[insertAt];
      if (b.type === 'heading') {
        const text = stripTags(b.content);
        if (FOOTER_HEADING_RE.test(text)) break;
        if (!AGNIVEER_SUBHEADING_RE.test(text) && !/agniveer/i.test(text)) break;
      }
      insertAt++;
    }
    const out = [...cleaned.slice(0, insertAt), ...newBlocks, ...cleaned.slice(insertAt)];
    return { blocks: out, placement: `after-agniveer@${insertAt}` };
  }

  // 2. Try inserting right after Reservation Policy / Notes section
  const resIdx = cleaned.findIndex(
    (b) => b.type === 'heading' && /reservation/i.test(stripTags(b.content))
  );
  if (resIdx >= 0) {
    const resLevel = cleaned[resIdx].level || sectionLevel;
    let insertAt = resIdx + 1;
    while (insertAt < cleaned.length) {
      const b = cleaned[insertAt];
      if (b.type === 'heading' && (b.level || sectionLevel) <= resLevel) break;
      insertAt++;
    }
    const out = [...cleaned.slice(0, insertAt), ...newBlocks, ...cleaned.slice(insertAt)];
    return { blocks: out, placement: `after-reservation@${insertAt}` };
  }

  // 3. Otherwise insert right before Important Links / Website / Preparation Tips / Important Note
  const footerIdx = cleaned.findIndex(
    (b) => b.type === 'heading' && FOOTER_HEADING_RE.test(stripTags(b.content))
  );
  if (footerIdx >= 0) {
    const out = [...cleaned.slice(0, footerIdx), ...newBlocks, ...cleaned.slice(footerIdx)];
    return { blocks: out, placement: `before-footer@${footerIdx}` };
  }

  // 4. Fallback: append at the end
  return { blocks: [...cleaned, ...newBlocks], placement: `end@${cleaned.length}` };
}

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

function keyPrefixFromUrl(storageBaseUrl) {
  if (!storageBaseUrl) return null;
  const clean = storageBaseUrl.replace(/\/+$/, '') + '/';
  const prefix = `${R2_PUBLIC_URL}/`;
  if (!clean.startsWith(prefix)) return null;
  return clean.slice(prefix.length);
}

async function getJsonFromR2(s3, key) {
  try {
    const out = await s3.send(new GetObjectCommand({ Bucket: R2_BUCKET, Key: key }));
    const str = await out.Body.transformToString('utf-8');
    return JSON.parse(str);
  } catch (err) {
    if (err.name === 'NoSuchKey' || err.$metadata?.httpStatusCode === 404) return null;
    throw err;
  }
}

async function main() {
  console.log(`Mode: ${EXECUTE ? 'EXECUTE (writing to Cloudflare R2)' : 'DRY RUN'}\n`);

  const excelRows = parseAllExcelRows();
  const [exams, intros, mapRows, resources] = await Promise.all([
    fetchAll('exams', 'exam_id, exam_name, conducting_body, career_track, state_ut'),
    fetchAll('lc_exam_intro', 'exam_id, source, resource_id'),
    fetchAll('lc_exam_resource_map', 'exam_id, resource_id, category').then((rows) =>
      rows.filter((r) => (r.category || '').trim().toLowerCase() === 'intro')
    ),
    fetchAll('resources', 'resource_id, title, category, format, storage_base_url, chapter_count'),
  ]);

  const resourceById = new Map(resources.map((r) => [r.resource_id, r]));
  const introByExamId = new Map(intros.map((i) => [i.exam_id, i]));
  const fallbackByExamId = new Map();
  for (const m of mapRows) {
    if (!fallbackByExamId.has(m.exam_id)) fallbackByExamId.set(m.exam_id, []);
    fallbackByExamId.get(m.exam_id).push(m);
  }

  // Map each Excel row to its best exam + R2 keyPrefix
  const byPrefix = new Map();
  for (const row of excelRows) {
    let bestExam = null;
    let bestScore = 0;
    for (const exam of exams) {
      const sc = scoreExamMatch(row, exam, false);
      if (sc > bestScore) {
        bestScore = sc;
        bestExam = exam;
      }
    }
    // Secondary pass for Central-sheet rows that are actually state-tagged in `exams` (e.g. UP PGT, HP TET, WBSSC SLST)
    if ((!bestExam || bestScore < 65) && row.scope === 'central') {
      for (const exam of exams) {
        const sc = scoreExamMatch(row, exam, true);
        if (sc >= 90 && sc > bestScore) {
          bestScore = sc;
          bestExam = exam;
        }
      }
    }
    if (!bestExam || bestScore < 65) continue;

    const intro = introByExamId.get(bestExam.exam_id);
    if (intro?.source === 'manual') continue;

    let res = null;
    if (intro?.source === 'auto' && intro.resource_id) {
      res = resourceById.get(intro.resource_id) || null;
    } else {
      const fb = (fallbackByExamId.get(bestExam.exam_id) || [])[0];
      if (fb) res = resourceById.get(fb.resource_id) || null;
    }
    if (!res?.storage_base_url) continue;

    const keyPrefix = keyPrefixFromUrl(res.storage_base_url);
    if (!keyPrefix) continue;

    if (ONLY) {
      const needle = ONLY.toLowerCase();
      if (
        !bestExam.exam_name.toLowerCase().includes(needle) &&
        !bestExam.exam_id.toLowerCase().includes(needle) &&
        !keyPrefix.toLowerCase().includes(needle)
      ) {
        continue;
      }
    }

    const existing = byPrefix.get(keyPrefix);
    if (!existing || bestScore > existing.score) {
      byPrefix.set(keyPrefix, { keyPrefix, exam: bestExam, resource: res, row, score: bestScore });
    }
  }

  let targets = Array.from(byPrefix.values());
  if (targets.length > LIMIT) targets = targets.slice(0, LIMIT);
  console.log(`Targets to process: ${targets.length} unique R2 Intro resources\n`);

  const s3 = getS3Client();
  const limit = pLimit(10);
  let ok = 0;
  let skipped = 0;
  let failed = 0;
  const placements = {};
  const samples = [];

  await Promise.all(
    targets.map((t) =>
      limit(async () => {
        const chapterKey = `${t.keyPrefix}chapters/chapter-1.json`;
        const metaKey = `${t.keyPrefix}metadata.json`;
        try {
          const chapter = await getJsonFromR2(s3, chapterKey);
          if (!chapter || !Array.isArray(chapter.blocks)) {
            skipped++;
            return;
          }

          const { blocks: updatedBlocks, placement } = upsertEsmBlocks(chapter.blocks, t.row);
          const pType = placement.split('@')[0];
          placements[pType] = (placements[pType] || 0) + 1;

          const updatedChapter = { ...chapter, blocks: updatedBlocks };

          if (samples.length < 3) {
            samples.push({
              exam: t.exam.exam_name,
              state_ut: t.exam.state_ut || 'Central',
              placement,
              beforeCount: chapter.blocks.length,
              afterCount: updatedBlocks.length,
              inserted: updatedBlocks.filter((b) => String(b.id).startsWith('esm-')),
            });
          }

          if (EXECUTE) {
            await uploadToR2(
              s3,
              R2_BUCKET,
              chapterKey,
              Buffer.from(JSON.stringify(updatedChapter, null, 2)),
              'application/json'
            );

            const meta = await getJsonFromR2(s3, metaKey);
            if (meta) {
              const updatedMeta = {
                ...meta,
                chapters: Array.isArray(meta.chapters)
                  ? meta.chapters.map((ch, idx) =>
                      idx === 0 ? { ...ch, blocks_count: updatedBlocks.length } : ch
                    )
                  : meta.chapters,
              };
              await uploadToR2(
                s3,
                R2_BUCKET,
                metaKey,
                Buffer.from(JSON.stringify(updatedMeta, null, 2)),
                'application/json'
              );
            }
          }

          ok++;
          if (ok % 100 === 0) console.log(`  Processed ${ok}/${targets.length}...`);
        } catch (err) {
          failed++;
          console.error(`[FAIL] ${t.exam.exam_name} (${chapterKey}): ${err.message}`);
        }
      })
    )
  );

  console.log('\n--- Summary ---');
  console.log(`Processed OK: ${ok}, Skipped (no blocks): ${skipped}, Failed: ${failed}`);
  console.log('Placement breakdown:', placements);
  if (samples.length) {
    console.log('\nSample updates:');
    for (const s of samples) {
      console.log(`  Exam: "${s.exam}" [${s.state_ut}] | placement=${s.placement} | blocks ${s.beforeCount} -> ${s.afterCount}`);
    }
  }
  if (!EXECUTE) {
    console.log('\nDry run only -- nothing written to R2. Re-run with --execute to apply.');
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
