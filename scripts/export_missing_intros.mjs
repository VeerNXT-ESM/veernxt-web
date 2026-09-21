#!/usr/bin/env node
/**
 * scripts/export_missing_intros.mjs
 *
 * One-off export: every exam with no working Introduction (same
 * "does this exam have a real Intro" test as link_intros_to_exams.mjs's
 * examAlreadyHasIntro / audit_exam_intros.mjs), written to an .xlsx for
 * the content team to work through directly rather than a terminal dump.
 *
 * Usage: node scripts/export_missing_intros.mjs
 */
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';
import xlsx from 'xlsx';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// docs/, not public/ -- anything under public/ ships with the deployed
// app, and this internal punch-list spreadsheet would otherwise become
// publicly fetchable at <site>/exams_missing_intro.xlsx once built.
const OUT_PATH = path.join(__dirname, '..', 'docs', 'exams_missing_intro.xlsx');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

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

async function main() {
  console.log('Loading exams, lc_exam_intro, lc_exam_resource_map, resources...');
  const [exams, intros, mapRows, resources] = await Promise.all([
    fetchAll('exams', 'exam_id, exam_name, conducting_body, career_track, state_ut, metadata'),
    fetchAll('lc_exam_intro', 'exam_id, source, resource_id'),
    fetchAll('lc_exam_resource_map', 'exam_id, resource_id, category').then((rows) =>
      rows.filter((r) => (r.category || '').trim().toLowerCase() === 'intro')
    ),
    fetchAll('resources', 'resource_id'),
  ]);

  const resourceIds = new Set(resources.map((r) => r.resource_id));
  const introByExamId = new Map(intros.map((i) => [i.exam_id, i]));
  const fallbackExamIds = new Set(mapRows.filter((r) => resourceIds.has(r.resource_id)).map((r) => r.exam_id));

  function hasIntro(examId) {
    const intro = introByExamId.get(examId);
    if (intro?.source === 'manual') return true;
    if (intro?.source === 'auto' && intro.resource_id && resourceIds.has(intro.resource_id)) return true;
    if (fallbackExamIds.has(examId)) return true;
    return false;
  }

  const missing = exams
    .filter((e) => !hasIntro(e.exam_id))
    .map((e) => ({
      'Exam Name': e.exam_name || '',
      'Conducting Body': e.conducting_body || '',
      'Career Track': e.career_track || '',
      'Level': e.metadata?.level || '',
      'State/UT': e.state_ut || '',
      'Exam ID': e.exam_id,
    }))
    .sort((a, b) => a['Career Track'].localeCompare(b['Career Track']) || a['Exam Name'].localeCompare(b['Exam Name']));

  console.log(`${exams.length} total exams, ${missing.length} missing an Introduction.`);

  const sheet = xlsx.utils.json_to_sheet(missing);
  sheet['!cols'] = [{ wch: 42 }, { wch: 32 }, { wch: 20 }, { wch: 10 }, { wch: 18 }, { wch: 38 }];
  sheet['!autofilter'] = { ref: `A1:F${missing.length + 1}` };

  const book = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(book, sheet, 'Missing Intros');
  xlsx.writeFile(book, OUT_PATH);

  console.log(`Written to ${OUT_PATH}`);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
