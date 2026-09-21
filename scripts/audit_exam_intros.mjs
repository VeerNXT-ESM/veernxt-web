#!/usr/bin/env node
/**
 * scripts/audit_exam_intros.mjs
 *
 * Content team reported many exam Introductions are "not mapped
 * correctly". This walks every exam and classifies its Introduction
 * status against the same resolution chain the app uses
 * (src/hooks/useExamContent.js fetchExamIntro, src/pages/admin/ExamIntroCard.jsx):
 *
 *   1. lc_exam_intro row with source='manual'  -> curated doc, OK
 *   2. lc_exam_intro row with source='auto' + resource_id -> check the
 *      resource_id actually resolves to a live row in `resources`
 *   3. lc_exam_intro row with source='unset' (or missing) -> falls back to
 *      lc_exam_resource_map category='Intro' for that exam_id, if any
 *   4. Neither exists -> exam has literally no Introduction
 *
 * Flags:
 *   - AUTO_DANGLING: source='auto' but resource_id doesn't resolve
 *   - AUTO_EMPTY: source='auto' but resource_id is null
 *   - FALLBACK_MULTI: unset/missing AND lc_exam_resource_map has >1 'Intro'
 *     row for that exam (ambiguous, admin card just takes the first)
 *   - NO_INTRO: no dedicated row and no fallback resource either
 *
 * Usage: node scripts/audit_exam_intros.mjs
 */
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function fetchAll(table, select) {
  let all = [];
  let from = 0;
  const pageSize = 1000;
  while (true) {
    const { data, error } = await supabase.from(table).select(select).range(from, from + pageSize - 1);
    if (error) throw error;
    all = all.concat(data || []);
    if (!data || data.length < pageSize) break;
    from += pageSize;
  }
  return all;
}

async function main() {
  console.log('Loading exams, lc_exam_intro, lc_exam_resource_map, resources...');
  const [exams, intros, mapRows, resources] = await Promise.all([
    fetchAll('exams', 'exam_id, exam_name, career_track'),
    fetchAll('lc_exam_intro', '*'),
    fetchAll('lc_exam_resource_map', 'exam_id, resource_id, category').then((rows) =>
      rows.filter((r) => (r.category || '').trim().toLowerCase() === 'intro')
    ),
    fetchAll('resources', 'resource_id, title, category, exam_name'),
  ]);

  const resourceById = new Map(resources.map((r) => [r.resource_id, r]));
  const introByExamId = new Map(intros.map((i) => [i.exam_id, i]));
  const fallbackByExamId = new Map();
  for (const row of mapRows) {
    if (!fallbackByExamId.has(row.exam_id)) fallbackByExamId.set(row.exam_id, []);
    fallbackByExamId.get(row.exam_id).push(row);
  }

  console.log(`exams: ${exams.length}, lc_exam_intro rows: ${intros.length}, Intro-category map rows: ${mapRows.length}, resources: ${resources.length}\n`);

  const buckets = {
    manual_ok: [],
    auto_ok: [],
    auto_dangling: [],
    auto_empty: [],
    fallback_ok: [],
    fallback_multi: [],
    no_intro: [],
  };

  for (const exam of exams) {
    const intro = introByExamId.get(exam.exam_id);
    const fallbacks = fallbackByExamId.get(exam.exam_id) || [];

    if (intro?.source === 'manual') {
      if (intro.manual_title || intro.manual_body) {
        buckets.manual_ok.push(exam);
      } else {
        buckets.no_intro.push({ ...exam, reason: 'source=manual but empty title+body' });
      }
      continue;
    }

    if (intro?.source === 'auto') {
      if (!intro.resource_id) {
        buckets.auto_empty.push(exam);
      } else if (!resourceById.has(intro.resource_id)) {
        buckets.auto_dangling.push({ ...exam, resource_id: intro.resource_id });
      } else {
        buckets.auto_ok.push(exam);
      }
      continue;
    }

    // source is 'unset', missing row entirely, or some other value
    if (fallbacks.length === 0) {
      buckets.no_intro.push({ ...exam, reason: intro ? `source='${intro.source}', no fallback` : 'no lc_exam_intro row, no fallback' });
    } else {
      const validFallbacks = fallbacks.filter((f) => resourceById.has(f.resource_id));
      if (validFallbacks.length === 0) {
        buckets.no_intro.push({ ...exam, reason: `fallback resource_id(s) dangling: ${fallbacks.map((f) => f.resource_id).join(', ')}` });
      } else if (validFallbacks.length > 1) {
        buckets.fallback_multi.push({ ...exam, resource_ids: validFallbacks.map((f) => f.resource_id) });
      } else {
        buckets.fallback_ok.push(exam);
      }
    }
  }

  const total = exams.length;
  console.log('=== Summary ===');
  console.log(`manual (curated .docx)      : ${buckets.manual_ok.length}`);
  console.log(`auto, resolves fine         : ${buckets.auto_ok.length}`);
  console.log(`fallback via Add Resource   : ${buckets.fallback_ok.length}`);
  console.log('--- problems ---');
  console.log(`AUTO_DANGLING (bad resource_id) : ${buckets.auto_dangling.length}`);
  console.log(`AUTO_EMPTY (source=auto, null id): ${buckets.auto_empty.length}`);
  console.log(`FALLBACK_MULTI (ambiguous)      : ${buckets.fallback_multi.length}`);
  console.log(`NO_INTRO (nothing at all)       : ${buckets.no_intro.length}`);
  const problemCount = buckets.auto_dangling.length + buckets.auto_empty.length + buckets.fallback_multi.length + buckets.no_intro.length;
  console.log(`\nTOTAL EXAMS: ${total}  |  PROBLEM EXAMS: ${problemCount} (${((problemCount / total) * 100).toFixed(1)}%)\n`);

  if (buckets.auto_dangling.length) {
    console.log('=== AUTO_DANGLING (lc_exam_intro.resource_id points at a resource row that no longer exists) ===');
    for (const e of buckets.auto_dangling) console.log(`  ${e.exam_id}  ${e.exam_name}  -> resource_id ${e.resource_id}`);
    console.log();
  }
  if (buckets.auto_empty.length) {
    console.log('=== AUTO_EMPTY (source=auto but resource_id is null) ===');
    for (const e of buckets.auto_empty) console.log(`  ${e.exam_id}  ${e.exam_name}`);
    console.log();
  }
  if (buckets.fallback_multi.length) {
    console.log('=== FALLBACK_MULTI (multiple Intro-category resources mapped, admin card silently picks one) ===');
    for (const e of buckets.fallback_multi) console.log(`  ${e.exam_id}  ${e.exam_name}  -> ${e.resource_ids.join(', ')}`);
    console.log();
  }
  if (buckets.no_intro.length) {
    console.log('=== NO_INTRO (candidate sees no Introduction section at all) ===');
    for (const e of buckets.no_intro) console.log(`  ${e.exam_id}  ${e.exam_name}  (${e.reason})`);
    console.log();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
