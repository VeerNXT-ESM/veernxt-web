#!/usr/bin/env node
/**
 * scripts/ingest_master_documents.mjs
 *
 * Ingests the FINAL_CONTENT master documents (already deduplicated by an
 * earlier content-team pass -- one file per shared subject document,
 * unlike the old per-exam-duplicated resources_v2 rows) into resources_v2,
 * per the confirmed approach: upload each physical file to R2 exactly
 * once, then write one resources_v2 row per exam that needs it, all
 * pointing at the SAME shared storage_base_url. No re-uploading, no
 * per-exam file duplication -- just DB rows referencing shared content,
 * using the existing (working) resources_v2/SecureReader delivery path
 * rather than lc_resources (which still has no real file storage).
 *
 * Scope for this pass (deliberately narrower than the full 88-cluster
 * manifest -- see status_report.md this session's Phase 1 reconciliation):
 *   - 6 core-subject Guide + 6 core-subject Precis documents, each linked
 *     to every exam carrying that subject (via the freshly-rebuilt
 *     lc_exam_subjects / exams.subject_requirements).
 *   - 25 state + 8 UT-specific GS Guide books, each linked only to exams
 *     in that specific region with the GK/GS subject.
 * Niche single-purpose documents (bank SO specialist guides, PSC-specific
 * SI/Constable variants under 15 exams each) are skipped this pass --
 * lower value, ambiguous subject mapping, can be added later without
 * touching what this script does.
 *
 * Usage:
 *   node scripts/ingest_master_documents.mjs            # dry run
 *   node scripts/ingest_master_documents.mjs --execute  # writes
 */
import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { processDocxBuffer, getS3Client, uploadToR2, generateSimpleHash } from './ingest-drive-content.js';

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
const MASTER_DOCS_ROOT = 'K:\\H DRIVE\\Quantum Climb\\CLIENT ASSETS\\VeerNXT\\CONTENT\\FINAL_CONTENT\\Final Documents\\MASTER DOCUMENTS';

// Cluster filename -> clean display title (strips "Cluster_NNN_" + extension).
function cleanTitle(fileName) {
  return fileName.replace(/^Cluster_\d+_/, '').replace(/\.[^/.]+$/, '').replace(/\s*\(\d+\)\s*$/, '').trim();
}

// --- Core-subject documents: linked to every exam with that subject ---
const CORE_DOCS = [
  { rel: 'Guide/English/Cluster_005_ENGLISH.docx', subject: 'English', category: 'Guide' },
  { rel: 'Guide/GK-GS/Cluster_006_GS & GK GUIDE BOOK.docx', subject: 'General Knowledge / GS', category: 'Guide' },
  { rel: 'Guide/Reasoning/Cluster_007_REASONING.docx', subject: 'Reasoning', category: 'Guide' },
  { rel: 'Guide/Computer/Cluster_009_Computer Science guide Book.docx', subject: 'Computer Knowledge', category: 'Guide' },
  { rel: 'Guide/Hindi/Cluster_010_HINDI.docx', subject: 'Hindi / Regional Language', category: 'Guide' },
  { rel: 'Guide/Mathematics/Cluster_008_MATHEMATICS.docx', subject: 'Mathematics', category: 'Guide' },
  { rel: 'Precis/English/Cluster_005_ENGLISH.docx', subject: 'English', category: 'Precis' },
  { rel: 'Precis/GK-GS/Cluster_001_SSC COMPLETE GK.docx', subject: 'General Knowledge / GS', category: 'Precis' },
  { rel: 'Precis/Reasoning/Cluster_004_REASONING.docx', subject: 'Reasoning', category: 'Precis' },
  { rel: 'Precis/Computer/Cluster_040_Computer Science guide Book.docx', subject: 'Computer Knowledge', category: 'Precis' },
  { rel: 'Precis/Hindi/Cluster_012_HINDI.docx', subject: 'Hindi / Regional Language', category: 'Precis' },
  { rel: 'Precis/Mathematics/Cluster_003_MATHEMATICS.docx', subject: 'Mathematics', category: 'Precis' },
];

// --- State/UT GS books: linked only to exams in that specific region ---
const REGION_DOCS = [
  { rel: 'Guide/GS BOOK STATE/Assam_GS (1).docx', region: 'Assam' },
  { rel: 'Guide/GS BOOK STATE/Bihar_GS (1).docx', region: 'Bihar' },
  { rel: 'Guide/GS BOOK STATE/Goa GS (1).docx', region: 'Goa' },
  { rel: 'Guide/GS BOOK STATE/Gujarat_GS (1).docx', region: 'Gujarat' },
  { rel: 'Guide/GS BOOK STATE/Haryana_GS (1).docx', region: 'Haryana' },
  { rel: 'Guide/GS BOOK STATE/Jharkhand_GS_Book (1).docx', region: 'Jharkhand' },
  { rel: 'Guide/GS BOOK STATE/MAHARSHTRA GS (1).docx', region: 'Maharashtra' },
  { rel: 'Guide/GS BOOK STATE/Madhya_Pradesh_GS (1).docx', region: 'Madhya Pradesh' },
  { rel: 'Guide/GS BOOK STATE/Manipur_GS_Book.docx', region: 'Manipur' },
  { rel: 'Guide/GS BOOK STATE/Meghalaya_GS_Book.docx', region: 'Meghalaya' },
  { rel: 'Guide/GS BOOK STATE/Mizoram_GS_Book (1).docx', region: 'Mizoram' },
  { rel: 'Guide/GS BOOK STATE/RAJASTHAN SI GS GUIDE (1).docx', region: 'Rajasthan' },
  { rel: 'Guide/GS BOOK STATE/WB_Police_ SI.docx', region: 'West Bengal' },
  // The remaining GS BOOK STATE files use a SI/CONSTABLE-suffixed name for
  // states where a dedicated *_GS.docx wasn't produced (verified this
  // session: content is genuine state GS material regardless of suffix).
  { rel: 'Guide/GS BOOK STATE/ARUNACHAL PRADESH SI (1).docx', region: 'Arunachal Pradesh' },
  { rel: 'Guide/GS BOOK STATE/Andhra_Pradesh CONSTABLE (1).docx', region: 'Andhra Pradesh' },
  { rel: 'Guide/GS BOOK STATE/Chhattisgarh_SI (1).docx', region: 'Chhattisgarh' },
  { rel: 'Guide/GS BOOK STATE/Himachal_Pradesh_CONSTABLE (1).docx', region: 'Himachal Pradesh' },
  { rel: 'Guide/GS BOOK STATE/KERALA CONSTABLE (1).docx', region: 'Kerala' },
  { rel: 'Guide/GS BOOK STATE/Karnataka_CONSTABLE (1).docx', region: 'Karnataka' },
  { rel: 'Guide/GS BOOK STATE/Odisha CONSTABLE (1).docx', region: 'Odisha' },
  { rel: 'Guide/GS BOOK STATE/TamilNadu CONSTABLE (1).docx', region: 'Tamil Nadu' },
  { rel: 'Guide/GS BOOK STATE/Telangana_CONSTABLE.docx', region: 'Telangana' },
  { rel: 'Guide/GS BOOK STATE/Tripura_CONSTABLE.docx', region: 'Tripura' },
  { rel: 'Guide/GS BOOK STATE/Uttarakhand_CONSTABLE (1).docx', region: 'Uttarakhand' },
  { rel: 'Guide/GS BOOK STATE/punjab si guide book (1).docx', region: 'Punjab' },
  { rel: 'Guide/GS BOOK UT/Andaman_Nicobar_GS_Book (1).docx', region: 'Andaman and Nicobar Islands' },
  { rel: 'Guide/GS BOOK UT/Chandigarh_GS_Book.docx', region: 'Chandigarh' },
  { rel: 'Guide/GS BOOK UT/Dadra_Nagar_Haveli_Daman_Diu_GS_Book.docx', region: 'Dadra & Nagar Haveli and Daman & Diu' },
  { rel: 'Guide/GS BOOK UT/Delhi_GS_Book.docx', region: 'Delhi' },
  { rel: 'Guide/GS BOOK UT/Jammu_Kashmir_GS_Book.docx', region: 'Jammu & Kashmir' },
  { rel: 'Guide/GS BOOK UT/Ladakh_GS_Book.docx', region: 'Ladakh' },
  { rel: 'Guide/GS BOOK UT/Lakshadweep_GS_Book.docx', region: 'Lakshadweep' },
  { rel: 'Guide/GS BOOK UT/Puducherry_GS_Book.docx', region: 'Puducherry' },
];

async function fetchAll(supabase, table, columns, filterFn) {
  let all = [];
  let from = 0;
  while (true) {
    let q = supabase.from(table).select(columns).range(from, from + 999);
    if (filterFn) q = filterFn(q);
    const { data, error } = await q;
    if (error) throw error;
    all = all.concat(data);
    if (data.length < 1000) break;
    from += 1000;
  }
  return all;
}

async function main() {
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

  const [exams, subjects, examSubjects, existingByPath] = await Promise.all([
    fetchAll(supabase, 'exams', 'exam_id,exam_name,conducting_body,region_id,region:lc_regions(name)'),
    fetchAll(supabase, 'lc_subjects', 'id,name'),
    fetchAll(supabase, 'lc_exam_subjects', 'exam_id,subject_id'),
    fetchAll(supabase, 'resources_v2', 'exam_name,subject,category,source_file'),
  ]);

  const subjectNameToId = new Map(subjects.map((s) => [s.name, s.id]));
  const examById = new Map(exams.map((e) => [e.exam_id, e]));
  const examIdsBySubject = new Map(); // subjectId -> Set(exam_id)
  for (const es of examSubjects) {
    if (!examIdsBySubject.has(es.subject_id)) examIdsBySubject.set(es.subject_id, new Set());
    examIdsBySubject.get(es.subject_id).add(es.exam_id);
  }
  const alreadyIngested = new Set(existingByPath.map((r) => `${r.source_file}::${r.exam_name}`));

  const s3 = EXECUTE ? getS3Client() : null;
  const bucket = process.env.R2_BUCKET_NAME;
  const publicUrl = process.env.R2_PUBLIC_URL;

  let totalDocsUploaded = 0;
  let totalRowsPlanned = 0;
  let totalRowsWritten = 0;
  const unmatchedRegions = [];

  async function processOneDoc(relPath, examList, docLabel) {
    const fullPath = path.join(MASTER_DOCS_ROOT, relPath.replace(/\//g, path.sep));
    if (!fs.existsSync(fullPath)) { console.log(`  MISSING FILE: ${relPath}`); return; }
    const fileName = path.basename(relPath);
    const title = cleanTitle(fileName);
    const category = relPath.startsWith('Precis') ? 'Precis' : 'Guide';

    const rowsToWrite = examList.filter((e) => !alreadyIngested.has(`${fileName}::${e.exam_name}`));
    console.log(`${docLabel}: "${title}" (${category}) -> ${examList.length} exams (${rowsToWrite.length} new, ${examList.length - rowsToWrite.length} already ingested)`);
    totalRowsPlanned += rowsToWrite.length;
    if (rowsToWrite.length === 0) return;

    if (!EXECUTE) return;

    const buffer = fs.readFileSync(fullPath);
    const stat = fs.statSync(fullPath);
    const processed = await processDocxBuffer(buffer, fileName, stat.size, {
      examName: title, category, subject: title.toUpperCase(), conductingBody: 'Master Document', drivePath: `master_documents/${category}`,
    });

    for (const rf of processed.r2Files) {
      await uploadToR2(s3, bucket, rf.key, rf.body, rf.contentType);
    }
    totalDocsUploaded++;
    const storageBaseUrl = `${publicUrl}/${processed.r2Prefix}/`;
    const thumbnailUrl = processed.thumbnailKey ? `${publicUrl}/${processed.thumbnailKey}` : null;

    const CHUNK = 200;
    for (let i = 0; i < rowsToWrite.length; i += CHUNK) {
      const chunk = rowsToWrite.slice(i, i + CHUNK).map((exam) => ({
        resource_id: `${processed.metadata.resource_id}_${generateSimpleHash(exam.exam_id).slice(0, 8)}`,
        file_hash: processed.metadata.file_hash,
        source_file: fileName,
        title,
        exam_name: exam.exam_name,
        subject: title.toUpperCase(),
        category,
        conducting_body: exam.conducting_body,
        website_url: '',
        chapter_count: processed.metadata.chapter_count,
        storage_base_url: storageBaseUrl,
        metadata_url: `${storageBaseUrl}metadata.json`,
        thumbnail_url: thumbnailUrl,
        is_freemium: category === 'Guide',
        is_locked: category === 'Precis',
        status: 'Published',
        updated_at: new Date().toISOString(),
      }));
      const { error } = await supabase.from('resources_v2').upsert(chunk, { onConflict: 'resource_id' });
      if (error) { console.error(`  FAILED chunk: ${error.message}`); continue; }
      totalRowsWritten += chunk.length;
    }
  }

  console.log('=== Core-subject documents (all exams with that subject) ===');
  for (const doc of CORE_DOCS) {
    const subjectId = subjectNameToId.get(doc.subject);
    if (!subjectId) { console.log(`  Unknown subject: ${doc.subject}`); continue; }
    const examIds = examIdsBySubject.get(subjectId) || new Set();
    const examList = [...examIds].map((id) => examById.get(id)).filter(Boolean);
    await processOneDoc(doc.rel, examList, doc.subject);
  }

  console.log('\n=== State/UT GS books (region-scoped) ===');
  const gkSubjectId = subjectNameToId.get('General Knowledge / GS');
  const gkExamIds = examIdsBySubject.get(gkSubjectId) || new Set();
  for (const doc of REGION_DOCS) {
    const examList = [...gkExamIds]
      .map((id) => examById.get(id))
      .filter((e) => e && e.region?.name === doc.region);
    if (examList.length === 0) unmatchedRegions.push(doc.region);
    await processOneDoc(doc.rel, examList, doc.region);
  }

  if (unmatchedRegions.length) console.log(`\nRegions with zero matching exams (check region name spelling): ${unmatchedRegions.join(', ')}`);

  console.log(`\n=== TOTALS ===`);
  console.log(`Rows planned: ${totalRowsPlanned}`);
  if (EXECUTE) {
    console.log(`Documents uploaded to R2: ${totalDocsUploaded}`);
    console.log(`Rows written: ${totalRowsWritten}`);
  } else {
    console.log('\nDry run only -- no writes made. Re-run with --execute to apply.');
  }
}

main().catch((err) => { console.error(err); process.exit(1); });
