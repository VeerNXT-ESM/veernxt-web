#!/usr/bin/env node
/**
 * scripts/audit_esm_excel_matches.mjs
 *
 * Parses the 3 ESM/Paramilitary Excel files and matches each row against
 * Supabase `exams` + resolved Intro resources (`lc_exam_intro` /
 * `lc_exam_resource_map` -> `resources`). Read-only audit.
 *
 * Usage:
 *   node scripts/audit_esm_excel_matches.mjs
 */
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import XLSX from 'xlsx';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const EXCEL_FILES = [
  {
    scope: 'central',
    path: '/Users/souvik/Projects/VeerNext/Central_Exams_List_ESM.xlsx',
    sheet: 'Central Exams',
    cols: {
      category: 'Category',
      conducting_body: 'Conducting Body',
      exam_name: 'Name of Examination',
      esm_reservation: 'Ex-Servicemen (ESM) Reservation',
      esm_age: 'ESM Age Relaxation',
      paramilitary: 'Paramilitary (Ex-CAPF / Assam Rifles) Service – Reservation / Age Relaxation',
    },
  },
  {
    scope: 'ut',
    path: '/Users/souvik/Projects/VeerNext/UT_Exams_ESM.xlsx',
    sheet: 'UT Exams',
    cols: {
      state: 'State',
      category: 'Category of Exam',
      conducting_body: 'Conducting Body',
      exam_name: 'Name of the Examination',
      esm_reservation: 'Ex-Servicemen (ESM) Reservation',
      esm_age: 'ESM Age Relaxation',
      paramilitary: 'Paramilitary (Ex-CAPF / Assam Rifles) Service – Reservation / Age Relaxation',
    },
  },
  {
    scope: 'state',
    path: '/Users/souvik/Projects/VeerNext/State_List_ESM.xlsx .xlsx',
    sheet: 'Sheet1',
    cols: {
      state: 'State',
      category: 'Category of Exam',
      conducting_body: 'Conducting Body',
      exam_name: 'Name of the Examination',
      esm_reservation: 'Ex-Servicemen (ESM) Reservation',
      esm_age: 'ESM Age Relaxation',
      paramilitary: 'Paramilitary (Ex-CAPF / Assam Rifles) Service – Reservation / Age Relaxation',
    },
  },
];

function cleanStr(v) {
  return String(v ?? '').replace(/\s+/g, ' ').trim();
}

export function parseAllExcelRows() {
  const allRows = [];
  for (const cfg of EXCEL_FILES) {
    if (!fs.existsSync(cfg.path)) {
      throw new Error(`Missing Excel file: ${cfg.path}`);
    }
    const wb = XLSX.readFile(cfg.path);
    const ws = wb.Sheets[cfg.sheet] || wb.Sheets[wb.SheetNames[0]];
    const raw = XLSX.utils.sheet_to_json(ws, { defval: '' });

    let lastState = '';
    let lastCategory = '';
    let lastBody = '';

    for (let idx = 0; idx < raw.length; idx++) {
      const r = raw[idx];
      const examName = cleanStr(r[cfg.cols.exam_name]);
      const esmRes = cleanStr(r[cfg.cols.esm_reservation]);
      const esmAge = cleanStr(r[cfg.cols.esm_age]);
      const para = cleanStr(r[cfg.cols.paramilitary]);

      if (cfg.cols.state) {
        const st = cleanStr(r[cfg.cols.state]);
        if (st) lastState = st;
      }
      if (cfg.cols.category) {
        const cat = cleanStr(r[cfg.cols.category]);
        if (cat) lastCategory = cat;
      }
      if (cfg.cols.conducting_body) {
        const body = cleanStr(r[cfg.cols.conducting_body]);
        if (body) lastBody = body;
      }

      if (!examName) continue;
      if (!esmRes && !esmAge && !para) continue;

      allRows.push({
        scope: cfg.scope,
        source_file: path.basename(cfg.path),
        excel_row: idx + 2,
        state: cfg.scope === 'central' ? '' : lastState,
        category: lastCategory,
        conducting_body: lastBody,
        exam_name: examName,
        esm_reservation: esmRes,
        esm_age_relaxation: esmAge,
        paramilitary_info: para,
      });
    }
  }
  return allRows;
}

export function normalizeName(s) {
  return cleanStr(s)
    .toLowerCase()
    .replace(/^\d+\.\s*/, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function normalizeState(s) {
  const n = normalizeName(s);
  if (n === 'andaman and nicobar' || n === 'andaman nicobar' || n === 'andaman and nicobar islands') {
    return 'andaman and nicobar islands';
  }
  if (n.includes('dadra') && n.includes('daman')) return 'dadra and nagar haveli and daman and diu';
  if (n === 'jammu and kashmir' || n === 'j and k' || n === 'jk') return 'jammu and kashmir';
  if (n === 'delhi' || n === 'nct of delhi' || n === 'new delhi') return 'delhi';
  if (n === 'puducherry' || n === 'pondicherry') return 'puducherry';
  return n;
}

function scoreMatch(row, exam) {
  const rowNorm = normalizeName(row.exam_name);
  const examNorm = normalizeName(exam.exam_name);
  if (!rowNorm || !examNorm) return 0;

  // State/scope compatibility
  const examState = normalizeState(exam.state_ut || '');
  const rowState = normalizeState(row.state || '');
  if (row.scope === 'central') {
    if (examState && examState !== 'all india' && examState !== 'central') return 0;
  } else {
    if (rowState && examState && rowState !== examState) return 0;
    if (rowState && !examState) return 0;
  }

  if (rowNorm === examNorm) return 100;

  // Strip parentheticals for secondary exact match
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
  const excelRows = parseAllExcelRows();
  console.log(`Parsed ${excelRows.length} Excel rows across 3 files:`);
  for (const s of ['central', 'ut', 'state']) {
    console.log(`  ${s}: ${excelRows.filter((r) => r.scope === s).length}`);
  }

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

  let matchedR2 = 0;
  let matchedManual = 0;
  let matchedNoIntro = 0;
  const unmatched = [];
  const manualList = [];
  const noIntroList = [];

  for (const row of excelRows) {
    let bestExam = null;
    let bestScore = 0;
    for (const exam of exams) {
      const sc = scoreMatch(row, exam);
      if (sc > bestScore) {
        bestScore = sc;
        bestExam = exam;
      }
    }
    if (!bestExam || bestScore < 65) {
      unmatched.push({ row, bestExam, bestScore });
      continue;
    }

    const intro = introByExamId.get(bestExam.exam_id);
    if (intro?.source === 'manual') {
      matchedManual++;
      manualList.push({ row, exam: bestExam, score: bestScore });
      continue;
    }

    let res = null;
    if (intro?.source === 'auto' && intro.resource_id) {
      res = resourceById.get(intro.resource_id) || null;
    } else {
      const fb = (fallbackByExamId.get(bestExam.exam_id) || [])[0];
      if (fb) res = resourceById.get(fb.resource_id) || null;
    }

    if (!res || !res.storage_base_url) {
      matchedNoIntro++;
      noIntroList.push({ row, exam: bestExam, score: bestScore });
    } else {
      matchedR2++;
    }
  }

  console.log('\n--- Match Summary ---');
  console.log(`Matched -> R2 Intro:     ${matchedR2}`);
  console.log(`Matched -> Manual Intro: ${matchedManual}`);
  console.log(`Matched -> No Intro:     ${matchedNoIntro}`);
  console.log(`Unmatched Excel rows:    ${unmatched.length}`);

  if (unmatched.length) {
    console.log('\nSample Unmatched (first 25):');
    for (const u of unmatched.slice(0, 25)) {
      console.log(
        `  [${u.row.scope}${u.row.state ? ':' + u.row.state : ''}] "${u.row.exam_name}" (best=${u.bestScore}: "${u.bestExam?.exam_name || ''}" [${u.bestExam?.state_ut || ''}])`
      );
    }
  }
  if (manualList.length) {
    console.log('\nManual Intros (first 15):');
    for (const m of manualList.slice(0, 15)) {
      console.log(`  [${m.row.scope}${m.row.state ? ':' + m.row.state : ''}] "${m.exam.exam_name}" (${m.exam.exam_id})`);
    }
  }
  if (noIntroList.length) {
    console.log('\nMatched Exams with NO Intro (first 15):');
    for (const n of noIntroList.slice(0, 15)) {
      console.log(`  [${n.row.scope}${n.row.state ? ':' + n.row.state : ''}] "${n.exam.exam_name}" (${n.exam.exam_id})`);
    }
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
}
