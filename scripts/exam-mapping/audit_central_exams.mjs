#!/usr/bin/env node
/**
 * scripts/exam-mapping/audit_central_exams.mjs
 *
 * Diffs the parsed "Central Exams List" document (see
 * parse_central_exams_doc.mjs) against every lc_exams row at Central level,
 * to find category/conducting-body/website mismatches and exams present in
 * one source but not the other. Read-only -- writes a JSON+text report,
 * never touches the DB. A human (or a follow-up --execute script once this
 * report is reviewed) decides what to actually change.
 *
 * Usage:
 *   node scripts/exam-mapping/audit_central_exams.mjs <parsedJsonPath> [outPrefix]
 */
import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

function loadEnv() {
  const envPath = path.resolve(process.cwd(), '.env');
  const lines = fs.readFileSync(envPath, 'utf-8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (!(key in process.env)) process.env[key] = value;
  }
}
loadEnv();

const PARSED_PATH = process.argv[2];
const OUT_PREFIX = process.argv[3] || 'central_exams_audit';
if (!PARSED_PATH) { console.error('Usage: node audit_central_exams.mjs <parsedJsonPath> [outPrefix]'); process.exit(1); }

// Doc category header -> this app's canonical lc_exam_categories name
// (verified 1:1 against the live 23-value table -- see
// src/lib/examCategoryTaxonomy.js).
const DOC_CATEGORY_TO_CANONICAL = {
  'SSC': 'SSC',
  'BANKING': 'Banking',
  'TEACHING': 'Teaching & Education',
  'INDIAN RAILWAYS': 'Railways',
  'UNIVERSITY GRANTS COMMISSION NATIONAL ELIGIBILITY TEST': 'Teaching & Education',
  'NURSING': 'Nursing',
  'CIVIL SERVICES': 'Administrative & Civil Services',
  'Engineering Recruitment': 'Engineering Services',
  'Defence Exams': 'Defence',
  'Judiciary Exams': 'Judiciary & Legal Services',
  'INSURANCE EXAMS': 'Insurance',
  'Other Government Exams': 'Other Government Exams',
  'Accounting & Commerce': 'Administrative & Civil Services',
  'POLICE EXAMS': 'Police & Security Services',
  'PUBLIC SECTOR UNDERTAKING MAHARATNA': 'Public Sector Undertakings (PSU)',
  'PUBLIC SECTOR UNDERTAKING NAVRATNA': 'Public Sector Undertakings (PSU)',
  'Metro Rail': 'Metro Rail',
};

const STOP_WORDS = new Set(['of', 'and', 'the', 'for']);
function initials(s) {
  return normalizeName(s)
    .split(' ')
    .filter((w) => w && !STOP_WORDS.has(w))
    .map((w) => w[0])
    .join('');
}
// Same real-world body, different naming convention (doc spells it out in
// full, DB stores the short form Conducting Bodies is keyed on) -- not a
// data error. Covers "Staff Selection Commission" vs "SSC", "Reserve Bank
// of India" vs "RBI", etc.
function sameConductingBody(docName, dbName) {
  const docKey = normalizeName(docName);
  const dbKey = normalizeName(dbName);
  if (!docKey || !dbKey) return false;
  if (docKey.includes(dbKey) || dbKey.includes(docKey)) return true;
  if (initials(docName) === dbKey.replace(/\s+/g, '')) return true;
  if (initials(dbName) === docKey.replace(/\s+/g, '')) return true;
  return false;
}

function normalizeName(s) {
  return (s || '')
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/[–—]/g, '-')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

async function fetchAllCentralExams(supabase) {
  let all = [];
  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from('lc_exams')
      .select('id,name,category,website,conducting_body:lc_conducting_bodies(id,name),region:lc_regions!inner(level)')
      .eq('region.level', 'central')
      .range(from, from + 999);
    if (error) throw error;
    all = all.concat(data);
    if (data.length < 1000) break;
    from += 1000;
  }
  return all;
}

async function main() {
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

  const docRecords = JSON.parse(fs.readFileSync(PARSED_PATH, 'utf-8'));
  const dbExams = await fetchAllCentralExams(supabase);

  console.log(`Doc records: ${docRecords.length}`);
  console.log(`DB Central exams: ${dbExams.length}\n`);

  // Index DB exams by normalized name. A handful of exam names repeat
  // across different conducting bodies (e.g. "ANM" appears once per
  // state-run recruiting body even though ANM itself is a Central-doc
  // Nursing entry) -- keep every DB row per normalized name, matched
  // against doc rows by conducting-body-name similarity as a tiebreaker.
  const dbByName = new Map();
  for (const exam of dbExams) {
    const key = normalizeName(exam.name);
    if (!dbByName.has(key)) dbByName.set(key, []);
    dbByName.get(key).push(exam);
  }

  const matched = [];
  const docUnmatched = [];
  const ambiguous = []; // multiple DB rows share this exam name and none of them clearly correspond to the doc's conducting body -- can't safely pick one, not reported as a mismatch
  const categoryMismatches = [];
  const websiteMismatches = [];
  const conductingBodyMismatches = [];
  const matchedDbIds = new Set();

  for (const rec of docRecords) {
    const canonicalCategory = DOC_CATEGORY_TO_CANONICAL[rec.category] || null;
    const key = normalizeName(rec.examName);
    const candidates = dbByName.get(key) || [];

    let dbExam = null;
    let wasAmbiguous = false;
    if (candidates.length === 1) {
      dbExam = candidates[0];
    } else if (candidates.length > 1) {
      dbExam = candidates.find((c) => sameConductingBody(rec.conductingBody, c.conducting_body?.name || '')) || null;
      if (!dbExam) wasAmbiguous = true;
    }

    if (!dbExam) {
      if (wasAmbiguous) ambiguous.push({ ...rec, candidateCount: candidates.length });
      else docUnmatched.push(rec);
      continue;
    }

    matched.push({ rec, dbExam });
    matchedDbIds.add(dbExam.id);

    if (canonicalCategory && dbExam.category !== canonicalCategory) {
      categoryMismatches.push({ examName: rec.name, dbName: dbExam.name, docCategory: rec.category, canonicalCategory, dbCategory: dbExam.category, dbId: dbExam.id });
    }

    if (!sameConductingBody(rec.conductingBody, dbExam.conducting_body?.name || '')) {
      conductingBodyMismatches.push({ examName: dbExam.name, docBody: rec.conductingBody, dbBody: dbExam.conducting_body?.name || '(none)', dbId: dbExam.id });
    }

    if (rec.website && !dbExam.website) {
      websiteMismatches.push({ examName: dbExam.name, docWebsite: rec.website, dbWebsite: '(blank)', dbId: dbExam.id });
    }
  }

  const dbUnmatched = dbExams.filter((e) => !matchedDbIds.has(e.id));

  const report = {
    summary: {
      docRecords: docRecords.length,
      dbCentralExams: dbExams.length,
      matched: matched.length,
      docUnmatched: docUnmatched.length,
      ambiguous: ambiguous.length,
      dbUnmatched: dbUnmatched.length,
      categoryMismatches: categoryMismatches.length,
      conductingBodyMismatches: conductingBodyMismatches.length,
      websiteMismatches: websiteMismatches.length,
    },
    categoryMismatches,
    conductingBodyMismatches,
    websiteMismatches,
    docUnmatched: docUnmatched.map((r) => ({ category: r.category, conductingBody: r.conductingBody, examName: r.examName, website: r.website })),
    ambiguous: ambiguous.map((r) => ({ category: r.category, conductingBody: r.conductingBody, examName: r.examName, candidateCount: r.candidateCount })),
    dbUnmatched: dbUnmatched.map((e) => ({ id: e.id, name: e.name, category: e.category, conductingBody: e.conducting_body?.name || null })),
  };

  console.log('Summary:', JSON.stringify(report.summary, null, 2));

  fs.writeFileSync(`${OUT_PREFIX}.json`, JSON.stringify(report, null, 2));
  console.log(`\nFull report written to ${OUT_PREFIX}.json`);
}

main().catch((err) => { console.error(err); process.exit(1); });
