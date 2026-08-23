#!/usr/bin/env node
/**
 * scripts/map_conducting_body_logos.mjs
 *
 * Matches exam-logos/manifest.json (805 entries: level, state, conducting_body,
 * logo path, exam_count) against lc_conducting_bodies.name and writes the
 * matched logo's public URL into lc_conducting_bodies.logo_path -- a column
 * that's existed in the schema since sql/learning_center_schema.sql but was
 * never populated.
 *
 * Three match tiers only, deliberately no fuzzy/substring tier: an earlier
 * substring-containment attempt produced false positives like "Jammu
 * Kashmir Public Service Commission" -> "LIC" (because "lic" is literally
 * a substring of "pubLICservicecommission") -- the same "single shared
 * token inflates similarity" trap already documented in
 * scripts/match_jobs_to_lc_exams.mjs for job matching. Leaving a body
 * unmatched is better than assigning it the wrong org's logo.
 *   1. exact  — normalized-case exact name match.
 *   2. normalized — punctuation/whitespace-insensitive exact match.
 *   3. abbr-exact — the manifest name's parenthesized abbreviation, e.g.
 *      "Institute of Banking Personnel Selection (IBPS)" -> "IBPS", matched
 *      exactly against lc_conducting_bodies.name.
 *
 * Assumes logo files have already been uploaded and are reachable at
 * `${LOGO_BASE_URL}/${manifestEntry.logo}` (see scripts/upload_logos_to_r2.mjs
 * for the upload step, run first).
 *
 * Usage:
 *   node scripts/map_conducting_body_logos.mjs            (dry run)
 *   node scripts/map_conducting_body_logos.mjs --execute
 */

import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EXECUTE = process.argv.includes('--execute');
const LOGO_BASE_URL = process.env.LOGO_BASE_URL || `${process.env.R2_PUBLIC_URL}/exam-logos`;

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

function normalize(s) {
  return (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

async function fetchAllRows(table, columns) {
  let all = [];
  let from = 0;
  const pageSize = 1000;
  while (true) {
    const { data, error } = await supabase.from(table).select(columns).range(from, from + pageSize - 1);
    if (error) throw error;
    all = all.concat(data);
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return all;
}

function buildMatcher(bodies) {
  const byExact = new Map(bodies.map((b) => [b.name.trim().toLowerCase(), b]));
  const byNorm = new Map(bodies.map((b) => [normalize(b.name), b]));

  return (conductingBodyName) => {
    const exactKey = conductingBodyName.trim().toLowerCase();
    if (byExact.has(exactKey)) return { body: byExact.get(exactKey), tier: 'exact' };

    const normKey = normalize(conductingBodyName);
    if (byNorm.has(normKey)) return { body: byNorm.get(normKey), tier: 'normalized' };

    const abbrMatch = conductingBodyName.match(/\(([A-Za-z&]{2,10})\)/);
    if (abbrMatch) {
      const abbrKey = abbrMatch[1].trim().toLowerCase();
      if (byExact.has(abbrKey)) return { body: byExact.get(abbrKey), tier: 'abbr-exact' };
    }

    return null;
  };
}

async function main() {
  console.log(`Mode: ${EXECUTE ? 'EXECUTE (writing lc_conducting_bodies.logo_path)' : 'DRY RUN'}`);
  console.log(`Logo base URL: ${LOGO_BASE_URL}\n`);

  const manifestPath = path.join(__dirname, '..', 'exam-logos', 'manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
  const bodies = await fetchAllRows('lc_conducting_bodies', 'id,name,logo_path');
  const findMatch = buildMatcher(bodies);

  const tierCounts = {};
  const unmatched = [];
  const updates = []; // { id, logo_path, name }
  const seenBodyIds = new Set();

  for (const entry of manifest) {
    if (!entry.logo) continue;
    const match = findMatch(entry.conducting_body);
    if (!match) {
      unmatched.push(entry.state ? `${entry.state} | ${entry.conducting_body}` : entry.conducting_body);
      continue;
    }
    if (seenBodyIds.has(match.body.id)) continue; // a body could theoretically appear twice in the manifest
    seenBodyIds.add(match.body.id);
    tierCounts[match.tier] = (tierCounts[match.tier] || 0) + 1;
    updates.push({ id: match.body.id, name: match.body.name, logo_path: `${LOGO_BASE_URL}/${entry.logo}` });
  }

  console.log('Match tiers:', tierCounts);
  console.log(`Matched: ${updates.length}, unmatched: ${unmatched.length}\n`);
  if (unmatched.length > 0) {
    console.log('Unmatched (no corresponding lc_conducting_bodies row — left alone):');
    console.log(unmatched.join('\n'));
  }

  if (EXECUTE) {
    console.log(`\nWriting ${updates.length} logo_path values...`);
    for (const u of updates) {
      const { error } = await supabase.from('lc_conducting_bodies').update({ logo_path: u.logo_path }).eq('id', u.id);
      if (error) console.error(`  [error] "${u.name}": ${error.message}`);
    }
    console.log('Done.');
  } else {
    console.log('\nDry run — no writes. Re-run with --execute to write.');
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
