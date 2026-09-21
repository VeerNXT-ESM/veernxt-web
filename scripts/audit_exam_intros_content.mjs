#!/usr/bin/env node
/**
 * scripts/audit_exam_intros_content.mjs
 *
 * Follow-up to audit_exam_intros.mjs, which only checked structural
 * validity (does lc_exam_intro.resource_id resolve at all). This checks
 * whether the resolved resource actually belongs to the exam it's
 * attached to -- i.e. lc_exam_intro.resource_id or the lc_exam_resource_map
 * fallback points at a `resources` row whose category isn't 'Intro', or
 * whose own exam_name doesn't plausibly match the exam's name. That's the
 * "mapped to the wrong thing" failure mode the content team is likely
 * flagging, distinct from "nothing mapped".
 *
 * Usage: node scripts/audit_exam_intros_content.mjs
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

function normalize(s) {
  return (s || '')
    .toLowerCase()
    .replace(/^\d+\.\s*/, '') // strip "12. " CMS ordinal prefix
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function plausibleMatch(examName, resourceExamName) {
  const a = normalize(examName);
  const b = normalize(resourceExamName);
  if (!a || !b) return false;
  if (a === b) return true;
  if (a.includes(b) || b.includes(a)) return true;
  const aWords = new Set(a.split(' ').filter((w) => w.length > 2));
  const bWords = new Set(b.split(' ').filter((w) => w.length > 2));
  let overlap = 0;
  for (const w of aWords) if (bWords.has(w)) overlap++;
  const smaller = Math.min(aWords.size, bWords.size) || 1;
  return overlap / smaller >= 0.5;
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

  const wrongCategory = [];
  const nameMismatch = [];
  let checked = 0;

  for (const exam of exams) {
    const intro = introByExamId.get(exam.exam_id);
    let resource = null;

    if (intro?.source === 'auto' && intro.resource_id) {
      resource = resourceById.get(intro.resource_id) || null;
    } else if (!intro || intro.source === 'unset') {
      const fb = (fallbackByExamId.get(exam.exam_id) || [])[0];
      if (fb) resource = resourceById.get(fb.resource_id) || null;
    }

    if (!resource) continue;
    checked++;

    if ((resource.category || '').trim().toLowerCase() !== 'intro') {
      wrongCategory.push({ exam, resource });
    }
    if (!plausibleMatch(exam.exam_name, resource.exam_name)) {
      nameMismatch.push({ exam, resource });
    }
  }

  console.log(`\nChecked ${checked} exams with a resolvable Intro resource (manual/no-resource intros skipped).\n`);

  console.log(`=== WRONG_CATEGORY (linked resource's own category isn't 'Intro') : ${wrongCategory.length} ===`);
  for (const { exam, resource } of wrongCategory.slice(0, 50)) {
    console.log(`  exam="${exam.exam_name}" (${exam.exam_id})  ->  resource "${resource.title}" category="${resource.category}" (${resource.resource_id})`);
  }
  if (wrongCategory.length > 50) console.log(`  ... and ${wrongCategory.length - 50} more`);

  console.log(`\n=== NAME_MISMATCH (linked resource's exam_name doesn't plausibly match the exam) : ${nameMismatch.length} ===`);
  for (const { exam, resource } of nameMismatch.slice(0, 80)) {
    console.log(`  exam="${exam.exam_name}"  ->  resource.exam_name="${resource.exam_name}"  title="${resource.title}"`);
  }
  if (nameMismatch.length > 80) console.log(`  ... and ${nameMismatch.length - 80} more`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
