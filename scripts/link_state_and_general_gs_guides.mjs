#!/usr/bin/env node
/**
 * scripts/link_state_and_general_gs_guides.mjs
 *
 * Ensures all State & UT exams have BOTH:
 *  1. State-specific GS Guidebook (for their state)
 *  2. General GS & GK Guidebook
 * linked in `lc_exam_resource_map`.
 *
 * Saves a full backup of inserted pairs before execution.
 * Dry run by default. Pass --execute to apply.
 */
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

const EXECUTE = process.argv.includes('--execute');
const URL_ = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const sb = createClient(URL_, process.env.SUPABASE_SERVICE_ROLE_KEY);
const anon = createClient(URL_, process.env.VITE_SUPABASE_ANON_KEY);

async function main() {
  console.log(`=== Link State & General GS Guides ===`);
  console.log(`Mode: ${EXECUTE ? 'EXECUTE' : 'DRY RUN (pass --execute to apply)'}\n`);

  const { data: regions } = await sb.from('lc_regions').select('id, name, level');
  const regMap = Object.fromEntries(regions.map((r) => [r.id, r]));

  // Canonical General GS Guide
  const { data: genGuides } = await sb
    .from('resources')
    .select('resource_id, title, status')
    .eq('title', 'GS & GK')
    .eq('category', 'Guide')
    .eq('format', 'blocks')
    .eq('status', 'Published')
    .limit(1);
  const canonicalGenGuideId = genGuides[0]?.resource_id;

  // Published State GS Guides map: region normalized name -> resource_id
  const { data: guides } = await sb
    .from('resources')
    .select('resource_id, title, status, format, chapter_count')
    .eq('category', 'Guide')
    .eq('format', 'blocks')
    .eq('status', 'Published');

  const stateGuides = guides.filter(
    (g) =>
      ![
        'gs & gk',
        'english',
        'hindi',
        'mathematics',
        'reasoning',
        'computer science',
        'metro_technical_knowledge',
        '2026 descriptive writing bank exams',
        '2026 iti technical trade literacy',
        'psu navaratna base',
        'gen awareness',
        'rrb general science guide book',
        'law officer',
        'agricultural and rural development',
      ].includes(g.title.toLowerCase().trim())
  );

  const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');

  const regToStateGuideId = {};
  for (const reg of regions) {
    if (reg.level === 'central') continue;
    const nReg = norm(reg.name);
    const match = stateGuides.find((g) => {
      const nG = norm(g.title);
      return nG.includes(nReg) || nReg.includes(nG.replace(/gs|book|si|constable|police/g, ''));
    });
    if (match) {
      regToStateGuideId[reg.id] = match.resource_id;
    }
  }

  // Get all State and UT exams
  let exams = [];
  let page = 0;
  while (true) {
    const { data: exRows } = await sb
      .from('lc_exams')
      .select('id, name, category, region_id')
      .range(page * 1000, (page + 1) * 1000 - 1);
    if (!exRows || exRows.length === 0) break;
    exams.push(...exRows);
    if (exRows.length < 1000) break;
    page++;
  }
  const stateExams = exams.filter((e) => {
    const l = regMap[e.region_id]?.level;
    return l === 'state' || l === 'ut';
  });

  // Get all existing Guide mappings
  let maps = [];
  page = 0;
  while (true) {
    const { data: mRows } = await sb
      .from('lc_exam_resource_map')
      .select('exam_id, resource_id, category')
      .eq('category', 'Guide')
      .range(page * 1000, (page + 1) * 1000 - 1);
    if (!mRows || mRows.length === 0) break;
    maps.push(...mRows);
    if (mRows.length < 1000) break;
    page++;
  }
  const mapsByExam = {};
  for (const m of maps) {
    if (!mapsByExam[m.exam_id]) mapsByExam[m.exam_id] = new Set();
    mapsByExam[m.exam_id].add(m.resource_id);
  }

  const resById = Object.fromEntries(guides.map((r) => [r.resource_id, r]));

  const toInsert = [];

  for (const ex of stateExams) {
    const linkedIds = mapsByExam[ex.id] || new Set();
    const linkedRes = Array.from(linkedIds).map((id) => resById[id]).filter(Boolean);

    const hasGen = linkedRes.some((r) => /^(gs & gk|general knowledge|2026 gk-gs|ssc complete gk|general awareness)/i.test(r.title));
    const hasState = linkedRes.some(
      (r) =>
        /(gs|si|constable|police)/i.test(r.title) &&
        !/^(gs & gk|general knowledge|2026 gk-gs|ssc complete gk|general awareness|mathematics|reasoning|english|hindi|computer)/i.test(r.title)
    );

    const stateGuideId = regToStateGuideId[ex.region_id];

    if (!hasGen && hasState && canonicalGenGuideId && !linkedIds.has(canonicalGenGuideId)) {
      toInsert.push({
        exam_id: ex.id,
        resource_id: canonicalGenGuideId,
        category: 'Guide',
        confidence: 'high',
        source: 'manual',
      });
    }
    if (hasGen && !hasState && stateGuideId && !linkedIds.has(stateGuideId)) {
      toInsert.push({
        exam_id: ex.id,
        resource_id: stateGuideId,
        category: 'Guide',
        confidence: 'high',
        source: 'manual',
      });
    }
  }

  console.log(`Evaluated ${stateExams.length} State & UT exams.`);
  console.log(`New (exam, resource) link mappings to insert: ${toInsert.length}`);

  const backupDir = path.resolve('backups');
  if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
  const backupFile = path.join(backupDir, `link_state_general_gs_backup_${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
  fs.writeFileSync(backupFile, JSON.stringify(toInsert, null, 2));
  console.log(`Backup saved to: ${backupFile}`);

  if (EXECUTE && toInsert.length > 0) {
    // Insert in chunks of 100
    let inserted = 0;
    for (let i = 0; i < toInsert.length; i += 100) {
      const batch = toInsert.slice(i, i + 100);
      const { error: insErr } = await sb
        .from('lc_exam_resource_map')
        .insert(batch);

      if (insErr) {
        console.error(`Error inserting batch:`, insErr.message);
      } else {
        inserted += batch.length;
        console.log(`  Inserted batch of ${batch.length} (total: ${inserted}/${toInsert.length})`);
      }
    }
    console.log(`\nSuccessfully inserted ${inserted} links into lc_exam_resource_map.`);

    // Verify with ANON key
    const sample = toInsert[0];
    const { data: anonCheck } = await anon
      .from('lc_exam_resource_map')
      .select('id, exam_id, resource_id, category')
      .eq('exam_id', sample.exam_id)
      .eq('resource_id', sample.resource_id);

    console.log(`ANON check on newly inserted mapping:`, anonCheck?.length ? '✓ SUCCESS' : '✗ FAILED');
  }

  console.log(`\nDone.`);
}

main().catch(console.error);
