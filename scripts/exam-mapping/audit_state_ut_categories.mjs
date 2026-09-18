#!/usr/bin/env node
/**
 * scripts/exam-mapping/audit_state_ut_categories.mjs
 *
 * Category-only correctness audit for State/UT exams, mirroring
 * audit_central_exams.mjs's approach but scoped to just the category field
 * (per explicit instruction -- subject_requirements in the datamap is a
 * separate, untouched concern). Source of truth is
 * "CLIENT ASSETS/.../CONTENT/1. EXAM LIST/exam_master_datamap.json" -- a
 * prior session's already-reconciled merge of the State and UT exam-list
 * docx files (no need to re-parse those docx directly). Its raw `category`
 * values are the exact same 180-ish free-text strings
 * normalize_exam_categories.mjs already mapped for the whole lc_exams
 * table; this reuses that same mapping (plus the 3-way splits from
 * split_merged_categories.mjs) to compute what each State/UT exam's
 * category SHOULD be, and diffs it against the live value.
 *
 * Read-only -- writes a JSON report, never touches the DB.
 *
 * Usage:
 *   node scripts/exam-mapping/audit_state_ut_categories.mjs [outPath]
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

const DATAMAP_PATH = 'K:/H DRIVE/Quantum Climb/CLIENT ASSETS/VeerNXT/CONTENT/1. EXAM LIST/exam_master_datamap.json';
const OUT_PATH = process.argv[2] || 'state_ut_category_audit.json';

// Same table as normalize_exam_categories.mjs (raw -> merged bucket), with
// the three merged buckets that split_merged_categories.mjs later split
// resolved directly to their final split name instead of the old merged
// one -- see that script's SPLITS table for the split rationale.
const RAW_TO_FINAL = {
  'BANKING': 'Banking', 'Banking': 'Banking', 'Rural Banking': 'Banking', 'Cooperative Banking': 'Banking',
  'INSURANCE EXAMS': 'Insurance',
  'SSC': 'SSC',
  'INDIAN RAILWAYS': 'Railways', 'Metro Rail': 'Metro Rail', 'Metro': 'Metro Rail',
  'Defence Exams': 'Defence', 'Defence': 'Defence',
  'Police Services': 'Police & Security Services', 'POLICE EXAMS': 'Police & Security Services',
  'Police': 'Police & Security Services', 'POLICE': 'Police & Security Services',
  'Police Recruitment': 'Police & Security Services', 'Police SI': 'Police & Security Services',
  'Police Constable': 'Police & Security Services', 'Armed Police': 'Police & Security Services',
  'ABHAD Constable': 'Police & Security Services', 'Intelligence SI': 'Police & Security Services',
  'Civil Security': 'Police & Security Services', 'Home Guard Services': 'Police & Security Services',
  'Home Guards': 'Police & Security Services', 'Home Guard': 'Police & Security Services',
  'Fire Services': 'Police & Security Services', 'Jail Services': 'Police & Security Services',
  'Prison Services': 'Police & Security Services', 'Enforcement': 'Police & Security Services',
  'Emergency Services': 'Police & Security Services',
  'Judicial Services': 'Judiciary & Legal Services', 'Judiciary Exams': 'Judiciary & Legal Services',
  'Judiciary': 'Judiciary & Legal Services', 'Judicial Service': 'Judiciary & Legal Services',
  'High Court Clerk': 'Judiciary & Legal Services', 'High Court Jr Asst': 'Judiciary & Legal Services',
  'Law Service': 'Judiciary & Legal Services', 'Legal Metrology': 'Judiciary & Legal Services',
  'TEACHING': 'Teaching & Education', 'Teaching': 'Teaching & Education',
  'Teacher Recruitment': 'Teaching & Education', 'Teacher Eligibility': 'Teaching & Education',
  'Education Services': 'Teaching & Education', 'School Education': 'Teaching & Education',
  'Higher Education': 'Teaching & Education', 'TET Primary': 'Teaching & Education',
  'TET Upper Primary': 'Teaching & Education', 'Master Cadre': 'Teaching & Education',
  'Lecturer': 'Teaching & Education',
  'UNIVERSITY GRANTS COMMISSION NATIONAL ELIGIBILITY TEST': 'Teaching & Education',
  'Library Services': 'Teaching & Education',
  'NURSING': 'Nursing', 'Nursing': 'Nursing', 'Health Nursing': 'Nursing',
  'Health Services': 'Health & Medical Services', 'Health': 'Health & Medical Services',
  'Medical': 'Health & Medical Services', 'Medical Services': 'Health & Medical Services',
  'Medical Officer': 'Health & Medical Services', 'Health CHO': 'Health & Medical Services',
  'NHM Health': 'Health & Medical Services', 'MPW': 'Health & Medical Services',
  'Pharma Services': 'Health & Medical Services', 'Health Pharma': 'Health & Medical Services',
  'Drug Control': 'Health & Medical Services', 'Food Safety': 'Health & Medical Services',
  'Administrative Services': 'Administrative & Civil Services', 'Administrative': 'Administrative & Civil Services',
  'ADMINISTRATIVE': 'Administrative & Civil Services', 'Administration': 'Administrative & Civil Services',
  'State Civil Services': 'Administrative & Civil Services', 'CIVIL SERVICES': 'Administrative & Civil Services',
  'Civil Services': 'Administrative & Civil Services', 'Central Govt': 'Administrative & Civil Services',
  'Secretarial Services': 'Administrative & Civil Services', 'Accounts Services': 'Administrative & Civil Services',
  'Accounting & Commerce': 'Administrative & Civil Services', 'Accounts': 'Administrative & Civil Services',
  'Finance Service': 'Administrative & Civil Services', 'Revenue Services': 'Administrative & Civil Services',
  'Revenue': 'Administrative & Civil Services', 'Revenue Land': 'Administrative & Civil Services',
  'Excise': 'Administrative & Civil Services', 'Excise Services': 'Administrative & Civil Services',
  'Excise & Taxation': 'Administrative & Civil Services', 'Panchayat': 'Administrative & Civil Services',
  'Panchayat Services': 'Administrative & Civil Services', 'Panchayat Raj Services': 'Administrative & Civil Services',
  'Panchayat/Rural Development': 'Administrative & Civil Services', 'Municipal': 'Administrative & Civil Services',
  'Municipal Admin': 'Administrative & Civil Services', 'Municipal Engineering': 'Administrative & Civil Services',
  'Municipal Health': 'Administrative & Civil Services', 'Hill Council': 'Administrative & Civil Services',
  'Election Management': 'Administrative & Civil Services', 'Census Operations': 'Administrative & Civil Services',
  'Research': 'Administrative & Civil Services', 'Social Welfare': 'Administrative & Civil Services',
  'Social Welfare Services': 'Administrative & Civil Services', 'Social Services': 'Administrative & Civil Services',
  'Labour Services': 'Administrative & Civil Services', 'Cooperative Services': 'Administrative & Civil Services',
  'Housing': 'Administrative & Civil Services', 'Junior Scale Officer': 'Administrative & Civil Services',
  'Storekeeper': 'Administrative & Civil Services', 'Professional Entrance': 'Administrative & Civil Services',
  'Engineering Services': 'Engineering Services', 'Engineering': 'Engineering Services',
  'Engineering Recruitment': 'Engineering Services', 'JE Engineering': 'Engineering Services',
  'Water Engineering': 'Engineering Services', 'Electricity': 'Engineering Services',
  'Power': 'Engineering Services', 'Power Utilities': 'Engineering Services',
  'Utilities': 'Engineering Services', 'Water': 'Engineering Services',
  'Water Supply': 'Engineering Services', 'Public Works': 'Engineering Services',
  'Agriculture Services': 'Agriculture & Rural Development', 'Agriculture Department': 'Agriculture & Rural Development',
  'Agriculture': 'Agriculture & Rural Development', 'Agriculture Supervisor': 'Agriculture & Rural Development',
  'Rural Development': 'Agriculture & Rural Development', 'Animal Husbandry': 'Agriculture & Rural Development',
  'Animal': 'Agriculture & Rural Development', 'Fisheries': 'Agriculture & Rural Development',
  'Veterinary Services': 'Agriculture & Rural Development', 'Veterinary': 'Agriculture & Rural Development',
  'Horticulture': 'Agriculture & Rural Development', 'Soil Conservation': 'Agriculture & Rural Development',
  'Forest Services': 'Agriculture & Rural Development', 'Forest': 'Agriculture & Rural Development',
  'Forest Service': 'Agriculture & Rural Development', 'Forest Guard': 'Agriculture & Rural Development',
  'Forest & Wildlife': 'Agriculture & Rural Development', 'Environment': 'Agriculture & Rural Development',
  'PUBLIC SECTOR UNDERTAKING NAVRATNA': 'Public Sector Undertakings (PSU)',
  'PUBLIC SECTOR UNDERTAKING MAHARATNA': 'Public Sector Undertakings (PSU)',
  'BARC ACCOUNTANT': 'Public Sector Undertakings (PSU)',
  'Postal GDS': 'Postal Services',
  'Transport': 'Transport Services', 'Transport Services': 'Transport Services',
  'Marine Services': 'Transport Services', 'Marine': 'Transport Services',
  'Ports': 'Transport Services', 'Ports & Shipping': 'Transport Services', 'Shipping': 'Transport Services',
  'IT Services': 'IT & Technical Services', 'Technical Services': 'IT & Technical Services',
  'Other Technical Posts': 'IT & Technical Services',
  'Disaster Management': 'Disaster Management', 'Disaster': 'Disaster Management',
  'Disaster Response': 'Disaster Management',
  'Food & Civil Supplies': 'Food & Civil Supplies', 'Food & Supplies': 'Food & Civil Supplies',
  'Food': 'Food & Civil Supplies',
  'Tourism': 'Tourism & Hospitality', 'Hostel Management': 'Tourism & Hospitality',
  'Group D Services': 'Group / Class Posts (Ungraded)', 'Group C Posts': 'Group / Class Posts (Ungraded)',
  'Group Posts': 'Group / Class Posts (Ungraded)', 'Group B Services': 'Group / Class Posts (Ungraded)',
  'Group C Services': 'Group / Class Posts (Ungraded)', 'GROUP C SERVICES': 'Group / Class Posts (Ungraded)',
  'Group C/D Posts': 'Group / Class Posts (Ungraded)', 'Class III Posts': 'Group / Class Posts (Ungraded)',
  'Group B/C Posts': 'Group / Class Posts (Ungraded)', 'Group IV Services': 'Group / Class Posts (Ungraded)',
  'Group I Services': 'Group / Class Posts (Ungraded)', 'Group II Services': 'Group / Class Posts (Ungraded)',
  'Group III Services': 'Group / Class Posts (Ungraded)', 'Grade III/IV Posts': 'Group / Class Posts (Ungraded)',
  'Group B/C': 'Group / Class Posts (Ungraded)', 'Group B/C Clerk': 'Group / Class Posts (Ungraded)',
  'Group D': 'Group / Class Posts (Ungraded)', 'Group III Posts': 'Group / Class Posts (Ungraded)',
  'Group IV Posts': 'Group / Class Posts (Ungraded)', 'Group C': 'Group / Class Posts (Ungraded)',
  'Other Government Exams': 'Other Government Exams', 'Sports': 'Other Government Exams',
};
const FALLBACK_INDEX = new Map();
for (const [raw, canonical] of Object.entries(RAW_TO_FINAL)) FALLBACK_INDEX.set(raw.trim().toLowerCase(), canonical);
function resolveFinal(raw) {
  const trimmed = (raw || '').trim();
  if (!trimmed) return null;
  return RAW_TO_FINAL[trimmed] || FALLBACK_INDEX.get(trimmed.toLowerCase()) || null;
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

async function fetchAllStateUtExams(supabase) {
  let all = [];
  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from('lc_exams')
      .select('id,name,category,region:lc_regions!inner(name,level)')
      .in('region.level', ['state', 'ut'])
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

  const datamap = JSON.parse(fs.readFileSync(DATAMAP_PATH, 'utf-8'));
  const docRecords = datamap.filter((r) => r.level === 'state' || r.level === 'ut');
  const dbExams = await fetchAllStateUtExams(supabase);

  console.log(`Datamap State/UT records: ${docRecords.length}`);
  console.log(`DB State/UT exams: ${dbExams.length}\n`);

  // Index DB exams by normalized name + region name (state/UT name), since
  // the same generic exam name (e.g. "Constable") repeats once per state --
  // region disambiguates it, unlike the Central-only audit which had no
  // region axis to use.
  const dbByKey = new Map();
  for (const exam of dbExams) {
    const key = `${normalizeName(exam.name)}::${normalizeName(exam.region?.name)}`;
    if (!dbByKey.has(key)) dbByKey.set(key, []);
    dbByKey.get(key).push(exam);
  }

  const unresolvedRaw = new Map(); // datamap raw category with no RAW_TO_FINAL entry
  const docUnmatched = [];
  const categoryMismatches = [];
  const matchedDbIds = new Set();
  let matchedCount = 0;

  for (const rec of docRecords) {
    const finalCategory = resolveFinal(rec.category);
    if (!finalCategory) {
      unresolvedRaw.set(rec.category, (unresolvedRaw.get(rec.category) || 0) + 1);
      continue;
    }

    // The datamap's State exam_name values carry a leading "N. " list
    // number from the source docx (e.g. "1. APPSC Group 1") that was never
    // stripped when it was built -- lc_exams has no such prefix.
    const cleanExamName = (rec.exam_name || '').replace(/^\d+[.)]\s*/, '');
    const key = `${normalizeName(cleanExamName)}::${normalizeName(rec.state)}`;
    const candidates = dbByKey.get(key) || [];
    if (candidates.length === 0) {
      docUnmatched.push({ level: rec.level, state: rec.state, category: rec.category, examName: cleanExamName });
      continue;
    }

    // Ambiguous same-name-same-state candidates are rare (unlike Central's
    // cross-state collisions) -- just take the first and flag if its
    // category also disagrees, rather than silently skipping.
    const dbExam = candidates[0];
    matchedCount++;
    matchedDbIds.add(dbExam.id);

    if (dbExam.category !== finalCategory) {
      categoryMismatches.push({
        level: rec.level, state: rec.state, examName: dbExam.name,
        docRawCategory: rec.category, expectedCategory: finalCategory, dbCategory: dbExam.category,
        dbId: dbExam.id,
      });
    }
  }

  const dbUnmatched = dbExams.filter((e) => !matchedDbIds.has(e.id));

  console.log('Summary:', JSON.stringify({
    matched: matchedCount,
    docUnmatched: docUnmatched.length,
    dbUnmatched: dbUnmatched.length,
    categoryMismatches: categoryMismatches.length,
    unresolvedRawCategories: unresolvedRaw.size,
  }, null, 2));

  if (unresolvedRaw.size > 0) {
    console.log('\nUnresolved raw categories (no RAW_TO_FINAL entry):');
    for (const [raw, n] of [...unresolvedRaw.entries()].sort((a, b) => b[1] - a[1])) {
      console.log(`  ${String(n).padStart(4)}  "${raw}"`);
    }
  }

  const report = {
    summary: { matched: matchedCount, docUnmatched: docUnmatched.length, dbUnmatched: dbUnmatched.length, categoryMismatches: categoryMismatches.length, unresolvedRawCategories: unresolvedRaw.size },
    categoryMismatches,
    docUnmatched,
    dbUnmatched: dbUnmatched.map((e) => ({ id: e.id, name: e.name, category: e.category, region: e.region?.name, level: e.region?.level })),
    unresolvedRawCategories: [...unresolvedRaw.entries()].map(([raw, count]) => ({ raw, count })),
  };
  fs.writeFileSync(OUT_PATH, JSON.stringify(report, null, 2));
  console.log(`\nFull report written to ${OUT_PATH}`);
}

main().catch((err) => { console.error(err); process.exit(1); });
