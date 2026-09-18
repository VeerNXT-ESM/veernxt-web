#!/usr/bin/env node
/**
 * scripts/exam-mapping/normalize_exam_categories.mjs
 *
 * One-time migration: lc_exams.category was free text (no dropdown on
 * ExamEditorPanel.jsx) and drifted into 180 near-duplicate raw strings
 * across 1,544 exams (BANKING / Banking / Rural Banking / Cooperative
 * Banking all the same real sector). This folds every raw value onto the
 * canonical list in src/lib/examCategoryTaxonomy.js, preserving the
 * original wording in the new lc_exams.category_detail column (added by
 * sql/lc_exams_category_normalize.sql -- run that in the Supabase SQL
 * Editor before --execute).
 *
 * Usage:
 *   node scripts/exam-mapping/normalize_exam_categories.mjs            # dry run
 *   node scripts/exam-mapping/normalize_exam_categories.mjs --execute  # writes
 */
import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { EXAM_CATEGORIES } from '../../src/lib/examCategoryTaxonomy.js';

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

const EXECUTE = process.argv.includes('--execute');

// Raw lc_exams.category string (exact, as found live 2026-09-18) -> canonical
// bucket from EXAM_CATEGORIES. Matched case-insensitively/trimmed as a
// safety net below, but listed here with their original casing for review.
const RAW_TO_CANONICAL = {
  // Banking & Insurance
  'BANKING': 'Banking & Insurance', 'Banking': 'Banking & Insurance',
  'Rural Banking': 'Banking & Insurance', 'Cooperative Banking': 'Banking & Insurance',
  'INSURANCE EXAMS': 'Banking & Insurance',

  // SSC
  'SSC': 'SSC',

  // Railways & Metro
  'INDIAN RAILWAYS': 'Railways & Metro', 'Metro Rail': 'Railways & Metro', 'Metro': 'Railways & Metro',

  // Defence
  'Defence Exams': 'Defence', 'Defence': 'Defence',

  // Police & Security Services
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

  // Judiciary & Legal Services
  'Judicial Services': 'Judiciary & Legal Services', 'Judiciary Exams': 'Judiciary & Legal Services',
  'Judiciary': 'Judiciary & Legal Services', 'Judicial Service': 'Judiciary & Legal Services',
  'High Court Clerk': 'Judiciary & Legal Services', 'High Court Jr Asst': 'Judiciary & Legal Services',
  'Law Service': 'Judiciary & Legal Services', 'Legal Metrology': 'Judiciary & Legal Services',

  // Teaching & Education
  'TEACHING': 'Teaching & Education', 'Teaching': 'Teaching & Education',
  'Teacher Recruitment': 'Teaching & Education', 'Teacher Eligibility': 'Teaching & Education',
  'Education Services': 'Teaching & Education', 'School Education': 'Teaching & Education',
  'Higher Education': 'Teaching & Education', 'TET Primary': 'Teaching & Education',
  'TET Upper Primary': 'Teaching & Education', 'Master Cadre': 'Teaching & Education',
  'Lecturer': 'Teaching & Education',
  'UNIVERSITY GRANTS COMMISSION NATIONAL ELIGIBILITY TEST': 'Teaching & Education',
  'Library Services': 'Teaching & Education',

  // Health, Medical & Nursing Services
  'NURSING': 'Health, Medical & Nursing Services', 'Nursing': 'Health, Medical & Nursing Services',
  'Health Services': 'Health, Medical & Nursing Services', 'Health': 'Health, Medical & Nursing Services',
  'Medical': 'Health, Medical & Nursing Services', 'Medical Services': 'Health, Medical & Nursing Services',
  'Medical Officer': 'Health, Medical & Nursing Services', 'Health Nursing': 'Health, Medical & Nursing Services',
  'Health CHO': 'Health, Medical & Nursing Services', 'NHM Health': 'Health, Medical & Nursing Services',
  'MPW': 'Health, Medical & Nursing Services', 'Pharma Services': 'Health, Medical & Nursing Services',
  'Health Pharma': 'Health, Medical & Nursing Services', 'Drug Control': 'Health, Medical & Nursing Services',
  'Food Safety': 'Health, Medical & Nursing Services',

  // Administrative & Civil Services
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

  // Engineering Services
  'Engineering Services': 'Engineering Services', 'Engineering': 'Engineering Services',
  'Engineering Recruitment': 'Engineering Services', 'JE Engineering': 'Engineering Services',
  'Water Engineering': 'Engineering Services', 'Electricity': 'Engineering Services',
  'Power': 'Engineering Services', 'Power Utilities': 'Engineering Services',
  'Utilities': 'Engineering Services', 'Water': 'Engineering Services',
  'Water Supply': 'Engineering Services', 'Public Works': 'Engineering Services',

  // Agriculture & Rural Development
  'Agriculture Services': 'Agriculture & Rural Development', 'Agriculture Department': 'Agriculture & Rural Development',
  'Agriculture': 'Agriculture & Rural Development', 'Agriculture Supervisor': 'Agriculture & Rural Development',
  'Rural Development': 'Agriculture & Rural Development', 'Animal Husbandry': 'Agriculture & Rural Development',
  'Animal': 'Agriculture & Rural Development', 'Fisheries': 'Agriculture & Rural Development',
  'Veterinary Services': 'Agriculture & Rural Development', 'Veterinary': 'Agriculture & Rural Development',
  'Horticulture': 'Agriculture & Rural Development', 'Soil Conservation': 'Agriculture & Rural Development',
  'Forest Services': 'Agriculture & Rural Development', 'Forest': 'Agriculture & Rural Development',
  'Forest Service': 'Agriculture & Rural Development', 'Forest Guard': 'Agriculture & Rural Development',
  'Forest & Wildlife': 'Agriculture & Rural Development', 'Environment': 'Agriculture & Rural Development',

  // Public Sector Undertakings (PSU)
  'PUBLIC SECTOR UNDERTAKING NAVRATNA': 'Public Sector Undertakings (PSU)',
  'PUBLIC SECTOR UNDERTAKING MAHARATNA': 'Public Sector Undertakings (PSU)',
  'BARC ACCOUNTANT': 'Public Sector Undertakings (PSU)',

  // Postal Services
  'Postal GDS': 'Postal Services',

  // Transport Services
  'Transport': 'Transport Services', 'Transport Services': 'Transport Services',
  'Marine Services': 'Transport Services', 'Marine': 'Transport Services',
  'Ports': 'Transport Services', 'Ports & Shipping': 'Transport Services', 'Shipping': 'Transport Services',

  // IT & Technical Services
  'IT Services': 'IT & Technical Services', 'Technical Services': 'IT & Technical Services',
  'Other Technical Posts': 'IT & Technical Services',

  // Disaster Management
  'Disaster Management': 'Disaster Management', 'Disaster': 'Disaster Management',
  'Disaster Response': 'Disaster Management',

  // Food & Civil Supplies
  'Food & Civil Supplies': 'Food & Civil Supplies', 'Food & Supplies': 'Food & Civil Supplies',
  'Food': 'Food & Civil Supplies',

  // Tourism & Hospitality
  'Tourism': 'Tourism & Hospitality', 'Hostel Management': 'Tourism & Hospitality',

  // Group / Class Posts (Ungraded) -- generic tier labels that don't name a
  // real sector on their own (a state's "Group D Services" could be Police,
  // Health, or Revenue Group D -- can't be resolved by string matching).
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

  // Other Government Exams
  'Other Government Exams': 'Other Government Exams', 'Sports': 'Other Government Exams',
};

// Case/whitespace-insensitive fallback index, built once, so a raw value
// that differs only by casing from something above still resolves instead
// of silently falling into "unmapped".
const FALLBACK_INDEX = new Map();
for (const [raw, canonical] of Object.entries(RAW_TO_CANONICAL)) {
  FALLBACK_INDEX.set(raw.trim().toLowerCase(), canonical);
}

function resolveCanonical(raw) {
  const trimmed = (raw || '').trim();
  if (!trimmed) return null;
  if (RAW_TO_CANONICAL[trimmed]) return RAW_TO_CANONICAL[trimmed];
  return FALLBACK_INDEX.get(trimmed.toLowerCase()) || null;
}

async function fetchAll(supabase, table, columns) {
  let all = [];
  let from = 0;
  while (true) {
    const { data, error } = await supabase.from(table).select(columns).range(from, from + 999);
    if (error) throw error;
    all = all.concat(data);
    if (data.length < 1000) break;
    from += 1000;
  }
  return all;
}

async function main() {
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

  const exams = await fetchAll(supabase, 'lc_exams', 'id,name,category');

  const bucketCounts = {};
  const unmapped = new Map(); // raw value -> count, should end up empty
  const updates = []; // { id, category: canonical, category_detail: original }

  for (const exam of exams) {
    const original = (exam.category || '').trim();
    if (!original) continue; // leave blank categories untouched
    const canonical = resolveCanonical(original);
    if (!canonical) {
      unmapped.set(original, (unmapped.get(original) || 0) + 1);
      continue;
    }
    bucketCounts[canonical] = (bucketCounts[canonical] || 0) + 1;
    if (original !== canonical) {
      updates.push({ id: exam.id, category: canonical, category_detail: original });
    }
  }

  console.log(`Total exams: ${exams.length}`);
  console.log(`Rows that would be updated (category changes): ${updates.length}\n`);
  console.log('Canonical distribution after normalization:');
  for (const c of EXAM_CATEGORIES) {
    console.log(`  ${String(bucketCounts[c] || 0).padStart(4)}  ${c}`);
  }

  if (unmapped.size > 0) {
    console.log(`\n⚠ ${unmapped.size} raw value(s) had no mapping -- these exams are left untouched:`);
    for (const [raw, n] of [...unmapped.entries()].sort((a, b) => b[1] - a[1])) {
      console.log(`  ${String(n).padStart(4)}  "${raw}"`);
    }
  } else {
    console.log('\nAll non-blank raw category values resolved to a canonical bucket.');
  }

  if (!EXECUTE) {
    console.log('\nDry run only -- no writes made. Re-run with --execute to apply.');
    console.log('(Requires lc_exams.category_detail to exist -- run sql/lc_exams_category_normalize.sql first.)');
    return;
  }

  console.log('\nWriting...');
  let written = 0;
  for (const u of updates) {
    const { error } = await supabase.from('lc_exams').update({ category: u.category, category_detail: u.category_detail }).eq('id', u.id);
    if (error) { console.error(`FAILED ${u.id}: ${error.message}`); continue; }
    written++;
  }
  console.log(`Done. Updated ${written}/${updates.length} exams.`);
}

main().catch((err) => { console.error(err); process.exit(1); });
