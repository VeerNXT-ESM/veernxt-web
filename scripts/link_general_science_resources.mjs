#!/usr/bin/env node
/**
 * scripts/link_general_science_resources.mjs
 *
 * "General Science" is a real, distinct lc_subjects row with 232 real
 * lc_exam_subjects slots -- but scripts/populate_lc_subject_resources.mjs's
 * hardcoded title map never targeted it (only "General Knowledge / GS"),
 * so all 232 slots show zero linked resources in the admin picker.
 *
 * Per explicit decision: keep "General Science" as its own subject label
 * (don't merge/retire it), and close the gap by reusing the exact same
 * content already linked to "General Knowledge / GS" -- the two universal
 * core docs (GS & GK GUIDE BOOK, SSC COMPLETE GK) plus, where the exam's
 * region has one, its region-specific state GS book. This creates NO new
 * lc_resources rows -- purely additional lc_subject_resources links onto
 * the 232 already-existing General Science lc_exam_subjects rows. Same
 * two-pass (core then region) linking logic as
 * populate_lc_subject_resources.mjs, just re-targeted at a different
 * subject_id. Run dedupe_lc_resources.mjs first so this links against
 * surviving canonical resource ids, not a row about to be deleted.
 *
 * Usage:
 *   node scripts/link_general_science_resources.mjs            # dry run
 *   node scripts/link_general_science_resources.mjs --execute  # writes
 */
import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

function loadEnv() {
  const lines = fs.readFileSync(path.resolve(process.cwd(), '.env'), 'utf-8').split('\n');
  for (const line of lines) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq === -1) continue;
    const k = t.slice(0, eq).trim();
    const v = t.slice(eq + 1).trim();
    if (!(k in process.env)) process.env[k] = v;
  }
}
loadEnv();

const EXECUTE = process.argv.includes('--execute');

// Same 33 state/UT GS-book titles -> region name as
// populate_lc_subject_resources.mjs's REGION_DOC_TITLE. Must stay in sync
// with that file's list.
const REGION_DOC_TITLE = {
  'Assam_GS': 'Assam', 'Bihar_GS': 'Bihar', 'Goa GS': 'Goa', 'Gujarat_GS': 'Gujarat',
  'Haryana_GS': 'Haryana', 'Jharkhand_GS_Book': 'Jharkhand', 'MAHARSHTRA GS': 'Maharashtra',
  'Madhya_Pradesh_GS': 'Madhya Pradesh', 'Manipur_GS_Book': 'Manipur', 'Meghalaya_GS_Book': 'Meghalaya',
  'Mizoram_GS_Book': 'Mizoram', 'RAJASTHAN SI GS GUIDE': 'Rajasthan', 'WB_Police_ SI': 'West Bengal',
  'ARUNACHAL PRADESH SI': 'Arunachal Pradesh', 'Andhra_Pradesh CONSTABLE': 'Andhra Pradesh',
  'Chhattisgarh_SI': 'Chhattisgarh', 'Himachal_Pradesh_CONSTABLE': 'Himachal Pradesh',
  'KERALA CONSTABLE': 'Kerala', 'Karnataka_CONSTABLE': 'Karnataka', 'Odisha CONSTABLE': 'Odisha',
  'TamilNadu CONSTABLE': 'Tamil Nadu', 'Telangana_CONSTABLE': 'Telangana', 'Tripura_CONSTABLE': 'Tripura',
  'Uttarakhand_CONSTABLE': 'Uttarakhand', 'punjab si guide book': 'Punjab',
  'Andaman_Nicobar_GS_Book': 'Andaman and Nicobar Islands', 'Chandigarh_GS_Book': 'Chandigarh',
  'Dadra_Nagar_Haveli_Daman_Diu_GS_Book': 'Dadra & Nagar Haveli and Daman & Diu', 'Delhi_GS_Book': 'Delhi',
  'Jammu_Kashmir_GS_Book': 'Jammu & Kashmir', 'Ladakh_GS_Book': 'Ladakh',
  'Lakshadweep_GS_Book': 'Lakshadweep', 'Puducherry_GS_Book': 'Puducherry',
};
const CORE_TITLES = ['GS & GK GUIDE BOOK', 'SSC COMPLETE GK'];

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

  const [subjects, lcResources, examSubjects, exams, regions] = await Promise.all([
    fetchAll(supabase, 'lc_subjects', 'id,name'),
    fetchAll(supabase, 'lc_resources', 'id,title'),
    fetchAll(supabase, 'lc_exam_subjects', 'id,exam_id,subject_id'),
    fetchAll(supabase, 'exams', 'exam_id,region_id'),
    fetchAll(supabase, 'lc_regions', 'id,name'),
  ]);

  const gsSubject = subjects.find((s) => s.name === 'General Science');
  if (!gsSubject) throw new Error('"General Science" subject not found in lc_subjects');

  const resourceIdByTitle = new Map(lcResources.map((r) => [r.title, r.id]));
  const examRegionById = new Map(exams.map((e) => [e.exam_id, e.region_id]));
  const regionIdByName = new Map(regions.map((r) => [r.name, r.id]));

  const coreResourceIds = CORE_TITLES.map((t) => resourceIdByTitle.get(t)).filter(Boolean);
  const missingCore = CORE_TITLES.filter((t) => !resourceIdByTitle.get(t));
  const regionResourceByRegionId = new Map();
  const missingRegionDocs = [];
  for (const [title, regionName] of Object.entries(REGION_DOC_TITLE)) {
    const resourceId = resourceIdByTitle.get(title);
    const regionId = regionIdByName.get(regionName);
    if (!resourceId) { missingRegionDocs.push(title); continue; }
    if (!regionId) continue;
    regionResourceByRegionId.set(regionId, resourceId);
  }

  const gsExamSubjects = examSubjects.filter((es) => es.subject_id === gsSubject.id);

  console.log(`General Science subject id: ${gsSubject.id}`);
  console.log(`General Science lc_exam_subjects rows: ${gsExamSubjects.length}`);
  console.log(`Core resource ids resolved: ${coreResourceIds.length}/${CORE_TITLES.length}${missingCore.length ? ` (missing: ${missingCore.join(', ')})` : ''}`);
  console.log(`Region-book resource ids resolved: ${regionResourceByRegionId.size}/${Object.keys(REGION_DOC_TITLE).length}${missingRegionDocs.length ? ` (missing titles: ${missingRegionDocs.join(', ')})` : ''}`);

  const linkRows = [];
  let withRegionBook = 0;
  for (const es of gsExamSubjects) {
    for (const resourceId of coreResourceIds) {
      linkRows.push({ exam_subject_id: es.id, resource_id: resourceId, display_order: 0 });
    }
    const regionId = examRegionById.get(es.exam_id);
    const regionResourceId = regionId ? regionResourceByRegionId.get(regionId) : null;
    if (regionResourceId) {
      linkRows.push({ exam_subject_id: es.id, resource_id: regionResourceId, display_order: 1 });
      withRegionBook++;
    }
  }

  console.log(`\n${gsExamSubjects.length} exam-subject slots -> ${withRegionBook} also get a region-specific book, ${gsExamSubjects.length - withRegionBook} get only the ${coreResourceIds.length} universal core docs.`);
  console.log(`Total lc_subject_resources link rows to write: ${linkRows.length}`);
  console.log('\n--- Sample (5) ---');
  for (const l of linkRows.slice(0, 5)) console.log(`  exam_subject_id=${l.exam_subject_id.slice(0, 8)}… -> resource_id=${l.resource_id.slice(0, 8)}…`);

  if (!EXECUTE) {
    console.log('\nDry run only — no writes made. Re-run with --execute to apply.');
    return;
  }

  console.log('\nWriting lc_subject_resources rows...');
  const CHUNK = 500;
  let written = 0;
  for (let i = 0; i < linkRows.length; i += CHUNK) {
    const chunk = linkRows.slice(i, i + CHUNK);
    const { error } = await supabase.from('lc_subject_resources').upsert(chunk, { onConflict: 'exam_subject_id,resource_id' });
    if (error) { console.error(`FAILED chunk at ${i}: ${error.message}`); continue; }
    written += chunk.length;
  }
  console.log(`Done. Wrote ${written}/${linkRows.length} lc_subject_resources rows.`);
}

main().catch((err) => { console.error(err); process.exit(1); });
