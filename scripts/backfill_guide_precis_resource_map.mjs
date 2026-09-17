#!/usr/bin/env node
/**
 * Backfills lc_exam_resource_map for the ~533 Guide/Precis book titles that
 * currently have zero real map row and are served entirely through
 * useExamContent.js's legacy exam_name text-match fallback (see
 * docs/status_report.md's 2026-09-17 audit -- 14,044 of 14,655 Guide/Precis
 * `resources` rows are duplicate legacy rows, one per exam from the old
 * ingestion pattern, all sharing one real R2 location per title).
 *
 * Grouped by (category, title, storage_base_url) -- NOT title alone. A
 * shared title does not always mean shared content: some titles (e.g.
 * "ENGLISH", "REASONING", "GENERAL KNOWLEDGE") turned out to have dozens or
 * hundreds of genuinely DIFFERENT real books (different storage_base_url)
 * sharing one generic title -- an earlier version of this script grouped
 * by title alone and would have picked one arbitrary "canonical" resource
 * for the whole title, silently cross-linking exams to the wrong book's
 * content. That's the exact same cross-contamination bug the PYQ audit
 * already found once (docs/status_report.md §58.4, generic exam_name
 * values shared by unrelated exams) -- caught here before any writes by
 * checking distinct storage_base_url counts per title first.
 *
 * Per (category, title, storage_base_url) group -- i.e. genuinely the same
 * physical content:
 *   1. Pick a CANONICAL resource_id -- prefer one an existing map row
 *      already points at (keeps consistency with whatever's already
 *      linked); else whichever resource_id in the group is first (all rows
 *      in the group share the same storage_base_url by construction, so
 *      any of them is an equally valid representative).
 *   2. For every row in the group, resolve its exam_name to a real
 *      lc_exams.id the same conservative way
 *      scripts/backfill_pyq_lc_exam_id.mjs already does: exact normalized
 *      match -> conducting_body+exam_name combo -> unique prefix match.
 *      Anything matching 0 or 2+ candidates is left alone, never guessed.
 *   3. Insert one lc_exam_resource_map row per resolved exam pointing at
 *      the CANONICAL resource_id (never the row's own resource_id -- that
 *      would just recreate the sprawl in the map table instead of
 *      cleaning it up).
 *   4. Archive (status='Draft') every non-canonical row in the group --
 *      by construction they're byte-for-byte the same content as the
 *      canonical, safe to retire now that the real link exists. Rows with
 *      no storage_base_url at all are skipped entirely (nothing real to
 *      link or archive).
 *
 * Usage:
 *   node scripts/backfill_guide_precis_resource_map.mjs              (dry run)
 *   node scripts/backfill_guide_precis_resource_map.mjs --execute
 */
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const EXECUTE = process.argv.includes('--execute');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function fetchAll(table, select, filters = (q) => q) {
  let all = []; let from = 0;
  while (true) {
    let q = supabase.from(table).select(select).range(from, from + 999);
    q = filters(q);
    const { data, error } = await q;
    if (error) throw error;
    all = all.concat(data || []);
    if (!data || data.length < 1000) break;
    from += 1000;
  }
  return all;
}

function normalize(s) {
  return (s || '').toLowerCase().replace(/^\d+\.\s*/, '').replace(/[^a-z0-9]+/g, ' ').trim();
}

function indexBy(list, keyFn) {
  const map = new Map();
  for (const item of list) {
    const key = keyFn(item);
    if (!key) continue;
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(item);
  }
  return map;
}

async function main() {
  console.log(`Mode: ${EXECUTE ? 'EXECUTE (writes lc_exam_resource_map + archives duplicates)' : 'DRY RUN (no writes)'}\n`);

  const exams = await fetchAll('lc_exams', 'id, name, conducting_body:lc_conducting_bodies(name)');
  const examsFlat = exams.map((e) => ({ id: e.id, name: e.name, conducting_body: e.conducting_body?.name || '' }));
  const byName = indexBy(examsFlat, (e) => normalize(e.name));
  const byCombo = indexBy(examsFlat, (e) => normalize(`${e.conducting_body} ${e.name}`));
  const examsWithNorm = examsFlat.map((e) => ({ e, norm: normalize(e.name) })).filter((x) => x.norm.length > 0);

  const resourceRows = await fetchAll('resources', 'resource_id, title, category, exam_name, storage_base_url', (q) => q.in('category', ['Guide', 'Precis']));
  const existingMapRows = await fetchAll('lc_exam_resource_map', 'exam_id, resource_id, category', (q) => q.in('category', ['Guide', 'Precis']));
  const mappedResourceIds = new Set(existingMapRows.map((r) => r.resource_id));
  const existingLinkKeys = new Set(existingMapRows.map((r) => `${r.exam_id}::${r.resource_id}::${r.category}`));

  const groups = new Map(); // "category::title::storage_base_url" -> rows[]
  let skippedNoStorage = 0;
  for (const r of resourceRows) {
    if (!r.title) continue;
    if (!r.storage_base_url) { skippedNoStorage++; continue; }
    const key = `${r.category}::${r.title.trim().toLowerCase()}::${r.storage_base_url}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(r);
  }

  // Just for the report -- how many titles actually turned out to be
  // several genuinely different books sharing a name (worth knowing, even
  // though each is now handled correctly and independently above).
  const titleStorageCounts = new Map(); // "category::title" -> Set(storage_base_url)
  for (const r of resourceRows) {
    if (!r.title || !r.storage_base_url) continue;
    const tKey = `${r.category}::${r.title.trim().toLowerCase()}`;
    if (!titleStorageCounts.has(tKey)) titleStorageCounts.set(tKey, new Set());
    titleStorageCounts.get(tKey).add(r.storage_base_url);
  }
  const multiContentTitles = [...titleStorageCounts.entries()].filter(([, urls]) => urls.size > 1);

  let resolvedExact = 0, resolvedCombo = 0, resolvedPrefix = 0, ambiguous = 0, noMatch = 0, alreadyLinked = 0;
  const mapInserts = []; // { exam_id, resource_id, category }
  const archiveResourceIds = new Set();

  for (const [, rows] of groups) {
    const category = rows[0].category;

    // Canonical: prefer a resource_id this exact (title, content) already
    // has a real map row for. Sorted (not .find()'s array order) so the
    // pick is stable across repeat runs -- .find() picked whichever
    // already-mapped row happened to come back first from Postgres, which
    // isn't a stable order, so a second run could pick a DIFFERENT
    // resource_id as canonical than the first run did and generate a
    // second, redundant set of links to it instead of recognizing the
    // first run's links as already covering these exams.
    const mappedCandidates = rows.filter((r) => mappedResourceIds.has(r.resource_id)).sort((a, b) => a.resource_id.localeCompare(b.resource_id));
    const canonicalId = mappedCandidates[0]?.resource_id || [...rows].sort((a, b) => a.resource_id.localeCompare(b.resource_id))[0].resource_id;

    for (const r of rows) {
      // Resolve this row's exam_name -> a real exam, same 3-tier conservative chain.
      const pNorm = normalize(r.exam_name);
      let resolved = null;
      const exactList = pNorm ? byName.get(pNorm) : null;
      if (exactList && exactList.length === 1) { resolved = exactList[0]; resolvedExact++; }
      else if (exactList && exactList.length > 1) ambiguous++;

      if (!resolved && pNorm) {
        const comboList = byCombo.get(pNorm);
        if (comboList && comboList.length === 1) { resolved = comboList[0]; resolvedCombo++; }
        else if (comboList && comboList.length > 1) ambiguous++;
      }

      if (!resolved && pNorm && !(exactList && exactList.length > 1)) {
        const prefixCandidates = examsWithNorm.filter((x) => pNorm.startsWith(x.norm));
        if (prefixCandidates.length === 1) { resolved = prefixCandidates[0].e; resolvedPrefix++; }
        else if (prefixCandidates.length > 1) ambiguous++;
        else if (pNorm) noMatch++;
      }

      if (resolved) {
        const linkKey = `${resolved.id}::${canonicalId}::${category}`;
        if (existingLinkKeys.has(linkKey)) {
          alreadyLinked++;
        } else {
          existingLinkKeys.add(linkKey); // dedupe within this same run too
          mapInserts.push({ exam_id: resolved.id, resource_id: canonicalId, category, examName: resolved.name, sourceExamName: r.exam_name });
        }
      }

      // A non-canonical row is safe to archive only if the exam it belongs
      // to has SOME other real path to this content -- either (a) its
      // resource_id is itself already referenced by an existing map row
      // (mappedResourceIds -- a different exam's admin already linked
      // straight to this specific duplicate before this script ever ran),
      // or (b) THIS row's own exam_name resolved to a real exam above,
      // meaning that exam is getting a fresh explicit link this run (to
      // the canonical resource_id) and no longer needs the fallback.
      // Anything else -- exam_name ambiguous, no match, or blank -- has NO
      // other path: `resources.status='Draft'` is hidden from the anon key
      // by RLS, so useExamContent.js's exam-name fallback (the only way
      // these exams were ever finding this content) goes completely blind
      // for them the moment their row is archived. Missed this the first
      // time (2026-09-17): the first execute run archived 3,420 such rows
      // industry-wide before it was caught live ("the ENGLISH book is
      // missing" -- one of the 7 different real books sharing that title,
      // its own exam_name-tagged row was one of the 3,420). Fixed after the
      // fact (docs/status_report.md §60.8/§60.9); this check is what
      // prevents both this and the earlier pre-existing-link bug recurring.
      const hasOtherPath = mappedResourceIds.has(r.resource_id) || !!resolved;
      if (r.resource_id !== canonicalId && !hasOtherPath && pNorm) archiveResourceIds.add(r.resource_id);
    }
  }

  console.log(`(category,title,content) groups processed: ${groups.size}`);
  console.log(`Rows skipped for having no storage_base_url at all: ${skippedNoStorage}`);
  console.log(`Titles that turned out to be 2+ genuinely different books sharing a name: ${multiContentTitles.length}`);
  console.log(`Duplicate resource rows resolved to a real exam:`);
  console.log(`  exact name match:   ${resolvedExact}`);
  console.log(`  combo match:        ${resolvedCombo}`);
  console.log(`  unique prefix:      ${resolvedPrefix}`);
  console.log(`  already linked (skipped, no-op): ${alreadyLinked}`);
  console.log(`  ambiguous (2+ candidates, skipped): ${ambiguous}`);
  console.log(`  no match at all (skipped):      ${noMatch}`);
  console.log(`  TOTAL new lc_exam_resource_map rows to insert: ${mapInserts.length}`);
  console.log(`  TOTAL duplicate resources rows to archive (status='Draft'): ${archiveResourceIds.size}\n`);

  if (multiContentTitles.length > 0) {
    console.log('Titles with 2+ genuinely different books sharing a name (sample of 15 -- each handled independently above, just worth knowing about):');
    for (const [tKey, urls] of multiContentTitles.slice(0, 15)) {
      const [category, title] = tKey.split('::');
      console.log(`  "${title}" (${category}) -- ${urls.size} distinct real books under this one title`);
    }
    console.log('');
  }

  if (!EXECUTE) {
    console.log('Sample of map rows that would be inserted:');
    for (const u of mapInserts.slice(0, 20)) console.log(`  "${u.sourceExamName}" -> exam "${u.examName}" (${u.category})`);
    console.log('\nDry run only -- nothing written. Re-run with --execute to apply.');
    return;
  }

  // lc_exam_resource_map has a unique constraint on (exam_id, resource_id)
  // alone, not (exam_id, resource_id, category) -- a plain .insert() fails
  // the WHOLE batch on a single conflict (e.g. an exam already linked to
  // this same resource_id under a different category from earlier admin
  // work), silently discarding otherwise-valid rows in the same batch.
  // ignoreDuplicates makes a real conflict a no-op for just that one row.
  let mapWritten = 0;
  for (let i = 0; i < mapInserts.length; i += 500) {
    const batch = mapInserts.slice(i, i + 500).map((u) => ({
      exam_id: u.exam_id, resource_id: u.resource_id, category: u.category,
      confidence: 'high', reasoning: 'Backfilled from legacy exam_name duplicate row', source: 'manual',
    }));
    const { error, count } = await supabase.from('lc_exam_resource_map').upsert(batch, { onConflict: 'exam_id,resource_id', ignoreDuplicates: true, count: 'exact' });
    if (error) { console.error(`  [FAIL] batch starting at ${i}: ${error.message}`); continue; }
    mapWritten += batch.length; // upsert doesn't report which rows were skipped as dupes vs written -- batch.length is an upper bound
  }
  console.log(`Upserted (attempted) ${mapWritten}/${mapInserts.length} lc_exam_resource_map rows (some may have been no-op skips on a pre-existing exam_id+resource_id pair under a different category).`);

  const archiveIds = [...archiveResourceIds];
  let archived = 0;
  for (let i = 0; i < archiveIds.length; i += 500) {
    const batch = archiveIds.slice(i, i + 500);
    const { error } = await supabase.from('resources').update({ status: 'Draft', updated_at: new Date().toISOString() }).in('resource_id', batch);
    if (error) { console.error(`  [FAIL] archive batch starting at ${i}: ${error.message}`); continue; }
    archived += batch.length;
  }
  console.log(`Archived ${archived}/${archiveIds.length} duplicate resources rows.`);
}

main().catch((err) => { console.error('Fatal error:', err); process.exit(1); });
