#!/usr/bin/env node
/**
 * scripts/seed_learning_center_schema.mjs
 *
 * Writes to the lc_-prefixed tables (lc_exams, lc_resources, etc.) --
 * discovered mid-build that bare "exams" and "resources" already exist
 * live in this database (the ex-servicemen profiling engine and the
 * legacy V1 content editor, respectively). See sql/learning_center_schema.sql's
 * header for the full story.
 *
 * Populates the new Learning Center schema (sql/learning_center_schema.sql
 * -- must already be applied via the Supabase SQL editor) entirely from
 * our own already-validated offline sources, NOT from the messy live
 * resources_v2 -- deliberately bypassing that reconciliation problem for
 * this pass:
 *
 *   - conducting_bodies / regions / exams / subjects / exam_subjects
 *     <- exam_master_datamap.json (1,534 rows, deduped, cross-checked
 *        against subject-wise/PwD/logo data this session).
 *   - resources (canonical) <- MASTER DOCUMENTS\MANIFEST.txt (93 docs,
 *        the "culled and placed perfectly" library).
 *
 * Two naming conventions get reconciled onto one canonical subject list:
 * subject_wise_list.json's 12 columns (e.g. "Maths", "Hindi / Regional
 * Language") and MANIFEST.txt's folder-derived subject buckets (e.g.
 * "Mathematics", "Hindi") -- see SUBJECT_ALIASES.
 *
 * Resource-to-exam linking is a deliberate simplification, called out
 * clearly in the run report: for each (subject, resource_type) pair, only
 * the DOMINANT resource (highest exam_count in the manifest) is broadly
 * linked to every exam_subjects row needing that subject. Niche/low-count
 * resources (state-specific SI guides, one-off professional-knowledge
 * docs) are seeded into the library but left unlinked, for the content
 * team to assign manually -- consistent with "flag, don't guess wrong."
 * The 5 real per-UT GS books are the one case linked precisely (via
 * exam_master_datamap.json's own ut_master_content field), not broadly.
 *
 * Purely additive against brand-new, empty tables -- zero risk to
 * resources_v2 or any existing table.
 *
 * Usage:
 *   node scripts/seed_learning_center_schema.mjs            # dry run
 *   node scripts/seed_learning_center_schema.mjs --execute  # writes
 */

import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

function loadEnv() {
  const envPath = path.resolve(process.cwd(), '.env');
  if (!fs.existsSync(envPath)) return;
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

const DATAMAP_PATH = 'K:\\H DRIVE\\Quantum Climb\\CLIENT ASSETS\\VeerNXT\\CONTENT\\1. EXAM LIST\\exam_master_datamap.json';
const MANIFEST_PATH = 'K:\\H DRIVE\\Quantum Climb\\CLIENT ASSETS\\VeerNXT\\CONTENT\\MASTER DOCUMENTS\\MANIFEST.txt';

// Canonical subject name <- every raw spelling seen across subject_wise_list.json
// and MANIFEST.txt's folder-derived subject buckets.
const SUBJECT_ALIASES = {
  'english': 'English',
  'hindi / regional language': 'Hindi / Regional Language',
  'hindi': 'Hindi / Regional Language',
  'general knowledge / gs': 'General Knowledge / GS',
  'gk-gs': 'General Knowledge / GS',
  'general knowledge': 'General Knowledge / GS',
  'reasoning': 'Reasoning',
  'maths': 'Mathematics',
  'mathematics': 'Mathematics',
  'quantitative aptitude': 'Mathematics',
  'general science': 'General Science',
  'computer knowledge': 'Computer Knowledge',
  'computer': 'Computer Knowledge',
  'child dev. & pedagogy': 'Child Dev. & Pedagogy',
  'domain / technical subject': 'Domain / Technical Subject',
  'physical test': 'Physical Test',
  'interview': 'Interview',
  'typing / skill test': 'Typing / Skill Test',
  // 'unlabeled' deliberately excluded -- maps to null, not a fabricated subject
};

function canonicalSubject(raw) {
  if (!raw) return null;
  const key = raw.trim().toLowerCase();
  return SUBJECT_ALIASES[key] || null;
}

function parseArgs() {
  return { execute: process.argv.includes('--execute') };
}

function parseManifest(text) {
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  const clusters = [];
  const clusterLineRe = /^Cluster\s+(\d+)\s*\(\s*(\d+)\s*exams share this\)\s*\|\s*([^/]+)\/([^|]+)\|\s*Cluster_(\d+)_(.+\.docx)$/;
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(clusterLineRe);
    if (!m) continue;
    const [, clusterNum, examCount, category, subjectRaw, clusterIdPadded, filename] = m;
    const sourceLine = lines[i + 1] || '';
    const sourceMatch = sourceLine.match(/source example:\s*\[(\w+)\]\s*(.+)$/);
    clusters.push({
      clusterNum: parseInt(clusterNum, 10),
      examCount: parseInt(examCount, 10),
      category: category.trim(), // 'Guide' | 'Precis' | '_uncategorized'
      subjectRaw: subjectRaw.trim(), // 'English' | 'GK-GS' | 'Unlabeled' | ...
      filename: `Cluster_${clusterIdPadded}_${filename}`,
      sourceLevel: sourceMatch ? sourceMatch[1] : null,
      sourcePath: sourceMatch ? sourceMatch[2] : null,
    });
  }
  return clusters;
}

// The 5 real per-UT GS books -- precise, not broad-assignment (see header).
// state names must normalize-match exam_master_datamap.json's `state` field.
const UT_GS_BOOK_STATE_TO_CLUSTER = {
  'andaman and nicobar islands': 89,
  'chandigarh': 90,
  'dadra and nagar haveli and daman and diu': 91,
  'jammu and kashmir': 92,
  'delhi': 93,
};

function norm(s) {
  return (s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

async function upsertAndMap(supabase, table, rows, conflictCols, selectCols, execute) {
  // Returns a Map from a caller-supplied key to the row's id. Batches of 500.
  const idByRow = [];
  if (!execute) return rows.map(() => null);
  const BATCH = 500;
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    const { data, error } = await supabase.from(table).upsert(batch, { onConflict: conflictCols }).select(selectCols);
    if (error) throw new Error(`${table} upsert failed: ${error.message}`);
    idByRow.push(...data);
  }
  return idByRow;
}

async function main() {
  const { execute } = parseArgs();
  console.log(execute ? '=== EXECUTING (writes to Supabase) ===' : '=== DRY RUN (no writes -- pass --execute to write) ===');

  const datamap = JSON.parse(fs.readFileSync(DATAMAP_PATH, 'utf-8'));
  console.log(`Loaded ${datamap.length} exams from exam_master_datamap.json`);

  const manifestText = fs.readFileSync(MANIFEST_PATH, 'utf-8');
  const clusters = parseManifest(manifestText);
  console.log(`Parsed ${clusters.length} resource clusters from MANIFEST.txt`);

  const supabase = execute
    ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
    : null;

  // ---- Subjects ----
  const subjectNames = new Set(Object.values(SUBJECT_ALIASES));
  const subjectRows = [...subjectNames].sort().map((name) => ({ name }));
  console.log(`\nSubjects: ${subjectRows.length} canonical -> ${subjectRows.map((s) => s.name).join(', ')}`);
  const subjectResult = await upsertAndMap(supabase, 'lc_subjects', subjectRows, 'name', 'id,name', execute);
  const subjectIdByName = new Map(execute ? subjectResult.map((r) => [r.name, r.id]) : subjectRows.map((r) => [r.name, null]));

  // ---- Regions ----
  const regionKey = (level, state) => `${level}::${state || 'Central'}`;
  const regionMap = new Map();
  for (const e of datamap) {
    const name = e.level === 'central' ? 'Central' : (e.state || 'Unknown');
    regionMap.set(regionKey(e.level, e.state), { level: e.level, name });
  }
  const regionRows = [...regionMap.values()];
  console.log(`\nRegions: ${regionRows.length} distinct (level, name) pairs`);
  const regionResult = await upsertAndMap(supabase, 'lc_regions', regionRows, 'level,name', 'id,level,name', execute);
  const regionIdByKey = new Map(
    execute ? regionResult.map((r) => [regionKey(r.level, r.name === 'Central' ? null : r.name), r.id])
      : regionRows.map((r) => [regionKey(r.level, r.name === 'Central' ? null : r.name), null])
  );

  // ---- Conducting bodies ----
  const bodyNames = new Set(datamap.map((e) => e.conducting_body).filter(Boolean));
  const bodyRows = [...bodyNames].sort().map((name) => ({ name }));
  console.log(`\nConducting bodies: ${bodyRows.length} distinct`);
  const bodyResult = await upsertAndMap(supabase, 'lc_conducting_bodies', bodyRows, 'name', 'id,name', execute);
  const bodyIdByName = new Map(execute ? bodyResult.map((r) => [r.name, r.id]) : bodyRows.map((r) => [r.name, null]));

  // ---- Exams ----
  const examRows = datamap.map((e) => ({
    conducting_body_id: bodyIdByName.get(e.conducting_body),
    region_id: regionIdByKey.get(regionKey(e.level, e.state)),
    category: e.category || null,
    name: e.exam_name,
    website: e.website || null,
    status: 'draft',
    also_listed_as: e.also_listed_as && e.also_listed_as.length ? e.also_listed_as : null,
  }));
  console.log(`\nExams: ${examRows.length} rows to insert`);
  let examResult = [];
  if (execute) {
    const BATCH = 500;
    for (let i = 0; i < examRows.length; i += BATCH) {
      const { data, error } = await supabase.from('lc_exams').insert(examRows.slice(i, i + BATCH)).select('id,name');
      if (error) throw new Error(`exams insert failed: ${error.message}`);
      examResult.push(...data);
      console.log(`  inserted ${Math.min(i + BATCH, examRows.length)}/${examRows.length}`);
    }
  }
  // datamap and examResult are in the same order (single insert pass, no reordering) --
  // pair them positionally rather than re-matching by name (names aren't unique alone).
  const examIdByIndex = execute ? examResult.map((r) => r.id) : examRows.map(() => null);

  // ---- exam_subjects (from subject_requirements Yes flags) ----
  const examSubjectRows = [];
  datamap.forEach((e, idx) => {
    const reqs = e.subject_requirements || {};
    let order = 0;
    for (const [rawSubject, val] of Object.entries(reqs)) {
      if (val !== 'Yes') continue;
      const canon = canonicalSubject(rawSubject);
      if (!canon) continue;
      examSubjectRows.push({ examIdx: idx, subjectName: canon, display_order: order++ });
    }
  });
  console.log(`\nexam_subjects: ${examSubjectRows.length} rows to insert (from subject_requirements)`);

  let examSubjectResult = [];
  if (execute) {
    const toInsert = examSubjectRows.map((r) => ({
      exam_id: examIdByIndex[r.examIdx],
      subject_id: subjectIdByName.get(r.subjectName),
      display_order: r.display_order,
    })).filter((r) => r.exam_id && r.subject_id);
    const BATCH = 500;
    for (let i = 0; i < toInsert.length; i += BATCH) {
      const { data, error } = await supabase.from('lc_exam_subjects').insert(toInsert.slice(i, i + BATCH)).select('id,exam_id,subject_id');
      if (error) throw new Error(`exam_subjects insert failed: ${error.message}`);
      examSubjectResult.push(...data);
    }
    console.log(`  inserted ${examSubjectResult.length}`);
  }

  // ---- Resources (from MANIFEST.txt clusters) ----
  const resourceRows = clusters.map((c) => {
    const resourceType = c.category === 'Guide' ? 'Guide' : c.category === 'Precis' ? 'Precis' : 'Other';
    const title = c.filename.replace(/^Cluster_\d+_/, '').replace(/\.docx$/i, '').trim();
    const subjectName = canonicalSubject(c.subjectRaw);
    return {
      clusterNum: c.clusterNum,
      examCount: c.examCount,
      subjectRaw: c.subjectRaw,
      row: {
        title,
        resource_type: resourceType,
        subject_id: subjectName ? subjectIdByName.get(subjectName) : null,
        status: 'draft',
      },
    };
  });
  console.log(`\nResources: ${resourceRows.length} rows to insert (from MANIFEST.txt)`);
  const unlabeled = resourceRows.filter((r) => !canonicalSubject(r.subjectRaw)).length;
  console.log(`  ${unlabeled} have no canonical subject match ("Unlabeled" or unmapped) -- seeded with subject_id = null for manual tagging`);

  let resourceResult = [];
  if (execute) {
    const toInsert = resourceRows.map((r) => r.row);
    const BATCH = 500;
    for (let i = 0; i < toInsert.length; i += BATCH) {
      const { data, error } = await supabase.from('lc_resources').insert(toInsert.slice(i, i + BATCH)).select('id,title,resource_type,subject_id');
      if (error) throw new Error(`resources insert failed: ${error.message}`);
      resourceResult.push(...data);
    }
    console.log(`  inserted ${resourceResult.length}`);
  }
  const resourceIdByIndex = execute ? resourceResult.map((r) => r.id) : resourceRows.map(() => null);

  // ---- subject_resources: dominant resource per (subject, type) -> every matching exam_subjects row ----
  const dominantByKey = new Map(); // "subjectName::type" -> resourceRows index
  resourceRows.forEach((r, idx) => {
    const subjectName = canonicalSubject(r.subjectRaw);
    if (!subjectName) return;
    // Only Guide/Precis are trustworthy broad-assignment buckets. 'Other'
    // (MANIFEST's _uncategorized) includes already-flagged anomalies (e.g.
    // Cluster_059, RAJASTHAN SI GS GUIDE.docx misfiled under an unrelated
    // Manipur exam path, §8) -- never auto-link those, leave them in the
    // library for manual placement even if they'd otherwise "win" a
    // single-item bucket.
    if (r.row.resource_type !== 'Guide' && r.row.resource_type !== 'Precis') return;
    const key = `${subjectName}::${r.row.resource_type}`;
    const existing = dominantByKey.get(key);
    if (existing === undefined || r.examCount > resourceRows[existing].examCount) dominantByKey.set(key, idx);
  });
  console.log(`\nDominant broad-assignment resources: ${dominantByKey.size} (subject, type) pairs`);
  for (const [key, idx] of dominantByKey) {
    console.log(`  ${key} -> Cluster_${String(resourceRows[idx].clusterNum).padStart(3, '0')} (${resourceRows[idx].examCount} exams in source)`);
  }

  if (execute) {
    // Need exam_subjects with their subject name to join against -- refetch mapping.
    const examSubjectsBySubject = new Map(); // subjectName -> [exam_subject_id,...]
    for (const es of examSubjectResult) {
      // find subject name back from id
      const subjName = [...subjectIdByName.entries()].find(([, id]) => id === es.subject_id)?.[0];
      if (!subjName) continue;
      if (!examSubjectsBySubject.has(subjName)) examSubjectsBySubject.set(subjName, []);
      examSubjectsBySubject.get(subjName).push(es.id);
    }

    const subjectResourceRows = [];
    for (const [key, idx] of dominantByKey) {
      const [subjectName, resourceType] = key.split('::');
      const resourceId = resourceIdByIndex[idx];
      if (!resourceId) continue;
      const examSubjectIds = examSubjectsBySubject.get(subjectName) || [];
      for (const esId of examSubjectIds) {
        subjectResourceRows.push({ exam_subject_id: esId, resource_id: resourceId, display_order: resourceType === 'Guide' ? 0 : 1 });
      }
    }

    // The 5 real per-UT GS books: precise link, not broad -- only that UT's
    // exam_subjects rows for "General Knowledge / GS".
    const gsSubjectId = subjectIdByName.get('General Knowledge / GS');
    datamap.forEach((e, idx) => {
      if (e.level !== 'ut') return;
      const stateKey = norm(e.state);
      const clusterNum = Object.entries(UT_GS_BOOK_STATE_TO_CLUSTER).find(([k]) => norm(k) === stateKey)?.[1];
      if (!clusterNum) return;
      const resourceIdx = resourceRows.findIndex((r) => r.clusterNum === clusterNum);
      if (resourceIdx === -1) return;
      const resourceId = resourceIdByIndex[resourceIdx];
      const examId = examIdByIndex[idx];
      const es = examSubjectResult.find((r) => r.exam_id === examId && r.subject_id === gsSubjectId);
      if (es && resourceId) subjectResourceRows.push({ exam_subject_id: es.id, resource_id: resourceId, display_order: 0 });
    });

    console.log(`\nsubject_resources: ${subjectResourceRows.length} rows to insert`);
    const BATCH = 500;
    let inserted = 0;
    for (let i = 0; i < subjectResourceRows.length; i += BATCH) {
      const { error } = await supabase.from('lc_subject_resources').insert(subjectResourceRows.slice(i, i + BATCH));
      if (error) throw new Error(`subject_resources insert failed: ${error.message}`);
      inserted += Math.min(BATCH, subjectResourceRows.length - i);
    }
    console.log(`  inserted ${inserted}`);
  } else {
    console.log('\n(subject_resources count not computed in dry-run -- depends on generated exam_subjects ids)');
  }

  console.log(execute ? '\nDone.' : '\nDry run complete -- rerun with --execute to write.');
}

main().catch((e) => {
  console.error('FATAL', e);
  process.exit(1);
});
