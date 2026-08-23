#!/usr/bin/env node
/**
 * scripts/populate_lc_subject_resources.mjs
 *
 * The admin CMS reads lc_exams/lc_exam_subjects/lc_subject_resources, not
 * exams/resources_v2 -- so even though scripts/ingest_master_documents.mjs
 * got real content in front of users via resources_v2, the CMS's own
 * Resources/Syllabus/Content Graph pages still showed zero books mapped
 * (lc_subject_resources was empty; it was cascaded away when
 * lc_exam_subjects got rebuilt in §27.6 and never repopulated).
 *
 * This creates one clean lc_resources row per document (12 core-subject +
 * 33 state/UT GS books -- same 45 documents from
 * scripts/ingest_master_documents.mjs), with a REAL storage_base_url
 * recovered from the matching resources_v2 row (already uploaded to R2,
 * same file) -- finally giving lc_resources real file backing, not just
 * metadata. Then links each one via lc_subject_resources to every
 * lc_exam_subjects row for the exams that need it (same core-subject /
 * region-scoped targeting as the resources_v2 ingestion).
 *
 * Usage:
 *   node scripts/populate_lc_subject_resources.mjs            # dry run
 *   node scripts/populate_lc_subject_resources.mjs --execute  # writes
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

// title -> { subjectName, category } for the 12 core-subject documents.
const CORE_DOC_SUBJECT = {
  'ENGLISH': 'English',
  'GS & GK GUIDE BOOK': 'General Knowledge / GS',
  'SSC COMPLETE GK': 'General Knowledge / GS',
  'REASONING': 'Reasoning',
  'Computer Science guide Book': 'Computer Knowledge',
  'HINDI': 'Hindi / Regional Language',
  'MATHEMATICS': 'Mathematics',
};

// title -> region name, for the 33 state/UT GS books (all Guide category).
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

  const [resources, subjects, examSubjects, exams, existingLcResources] = await Promise.all([
    fetchAll(supabase, 'resources_v2', 'title,category,storage_base_url,metadata_url,thumbnail_url,chapter_count,file_hash,source_file'),
    fetchAll(supabase, 'lc_subjects', 'id,name'),
    fetchAll(supabase, 'lc_exam_subjects', 'id,exam_id,subject_id'),
    fetchAll(supabase, 'exams', 'exam_id,region_id'),
    fetchAll(supabase, 'lc_resources', 'id,title'),
  ]);

  const subjectNameToId = new Map(subjects.map((s) => [s.name, s.id]));
  const examRegionById = new Map(exams.map((e) => [e.exam_id, e.region_id]));
  const examSubjectsByExamSubject = new Map(); // `${exam_id}::${subject_id}` -> lc_exam_subjects.id
  for (const es of examSubjects) examSubjectsByExamSubject.set(`${es.exam_id}::${es.subject_id}`, es.id);

  // One representative resources_v2 row per (title, category) -- gives us
  // the real storage_base_url/metadata_url/thumbnail_url/chapter_count that
  // were already uploaded once for that shared document.
  const repByTitleCategory = new Map();
  for (const r of resources) {
    const key = `${r.title}::${r.category}`;
    if (!repByTitleCategory.has(key)) repByTitleCategory.set(key, r);
  }

  const docs = [];
  for (const [title, subjectName] of Object.entries(CORE_DOC_SUBJECT)) {
    for (const category of ['Guide', 'Precis']) {
      const rep = repByTitleCategory.get(`${title}::${category}`);
      if (!rep) continue;
      docs.push({ title, category, subjectName, region: null, rep });
    }
  }
  for (const [title, region] of Object.entries(REGION_DOC_TITLE)) {
    const rep = repByTitleCategory.get(`${title}::Guide`);
    if (!rep) continue;
    docs.push({ title, category: 'Guide', subjectName: 'General Knowledge / GS', region, rep });
  }

  console.log(`Documents to ensure lc_resources rows for: ${docs.length}`);

  const existingByTitle = new Map(existingLcResources.map((r) => [r.title, r]));
  const resourcesToCreate = [];
  const resourceIdByDoc = new Map();
  for (const doc of docs) {
    const key = `clean::${doc.title}::${doc.category}`;
    const existing = existingByTitle.get(`[shared] ${doc.title}`);
    if (existing) { resourceIdByDoc.set(key, existing.id); continue; }
    resourcesToCreate.push(doc);
  }
  console.log(`New lc_resources rows to create: ${resourcesToCreate.length} (rest already exist from a prior run)`);

  console.log('\n--- Sample ---');
  for (const d of docs.slice(0, 5)) console.log(`  "${d.title}" (${d.category}) -> subject "${d.subjectName}"${d.region ? `, region "${d.region}"` : ''}`);

  if (!EXECUTE) {
    console.log('\nDry run only -- no writes made. Re-run with --execute to apply.');
    return;
  }

  console.log('\nCreating lc_resources rows...');
  let created = 0;
  for (const doc of resourcesToCreate) {
    const key = `clean::${doc.title}::${doc.category}`;
    const { data, error } = await supabase.from('lc_resources').insert({
      title: `[shared] ${doc.title}`,
      resource_type: doc.category,
      subject_id: subjectNameToId.get(doc.subjectName),
      storage_base_url: doc.rep.storage_base_url,
      metadata_url: doc.rep.metadata_url,
      thumbnail_url: doc.rep.thumbnail_url,
      file_hash: doc.rep.file_hash,
      status: 'published',
    }).select('id').single();
    if (error) { console.error(`FAILED to create lc_resources for "${doc.title}": ${error.message}`); continue; }
    resourceIdByDoc.set(key, data.id);
    created++;
  }
  console.log(`Created ${created}/${resourcesToCreate.length} new lc_resources rows.`);

  console.log('\nLinking via lc_subject_resources...');
  const linkRows = [];
  for (const doc of docs) {
    const key = `clean::${doc.title}::${doc.category}`;
    const resourceId = resourceIdByDoc.get(key);
    if (!resourceId) continue;
    const subjectId = subjectNameToId.get(doc.subjectName);
    if (!subjectId) continue;

    for (const es of examSubjects) {
      if (es.subject_id !== subjectId) continue;
      if (doc.region) {
        // region-scoped: only link exams whose region name matches (need region name, not id)
        continue; // handled below with a name-keyed pass for efficiency
      }
      linkRows.push({ exam_subject_id: es.id, resource_id: resourceId, display_order: 0 });
    }
  }

  // Region-scoped docs: build region name -> region_id once, then link.
  const regionRows = await fetchAll(supabase, 'lc_regions', 'id,name');
  const regionIdByName = new Map(regionRows.map((r) => [r.name, r.id]));
  for (const doc of docs) {
    if (!doc.region) continue;
    const key = `clean::${doc.title}::${doc.category}`;
    const resourceId = resourceIdByDoc.get(key);
    if (!resourceId) continue;
    const subjectId = subjectNameToId.get(doc.subjectName);
    const regionId = regionIdByName.get(doc.region);
    if (!subjectId || !regionId) continue;
    for (const es of examSubjects) {
      if (es.subject_id !== subjectId) continue;
      if (examRegionById.get(es.exam_id) !== regionId) continue;
      linkRows.push({ exam_subject_id: es.id, resource_id: resourceId, display_order: 0 });
    }
  }

  console.log(`Link rows to write: ${linkRows.length}`);
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
