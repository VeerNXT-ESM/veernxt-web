#!/usr/bin/env node
/**
 * scripts/preview_conducting_body_names.mjs
 *
 * Read-only preview (no writes) of the proposed conducting-body naming
 * cleanup: shows every name that WOULD change under the rule set below,
 * for user review before it's baked into the rebuild. Most of the 673
 * current lc_conducting_bodies names are already short departmental
 * names (e.g. "AIIMS Delhi", "AP High Court") -- only three patterns
 * actually need shortening:
 *   A. Name already ends in "(ABBR)" (2-6 caps) -> use ABBR alone
 *   A2. Name is "ABBR (Full Expansion)" -> use ABBR alone
 *   B. "{State} {Public Service Commission|Staff Selection
 *      Commission|Staff Selection Board|Subordinate Staff Selection
 *      Commission}" -> "{StateInitials}{PSC|SSC|SSB}" (the real,
 *      commonly-used short forms -- BPSC, UPPSC, HPSC, etc.)
 *   C. A small curated list of well-known central bodies that don't
 *      have an embedded abbreviation at all.
 * Everything else is left exactly as-is.
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

const STOPWORDS = new Set(['of', 'and', '&', 'the']);
function stateInitials(state) {
  return state
    .split(/\s+/)
    .filter((w) => !STOPWORDS.has(w.toLowerCase()))
    .map((w) => w[0].toUpperCase())
    .join('');
}

const PSC_SUFFIXES = [
  { pattern: /^(.+?) Subordinate Staff Selection Commission$/, abbr: 'SSSC' },
  { pattern: /^(.+?) Public Service Commission$/, abbr: 'PSC' },
  { pattern: /^(.+?) Staff Selection Commission$/, abbr: 'SSC' },
  { pattern: /^(.+?) Staff Selection Board$/, abbr: 'SSB' },
];

const CENTRAL_CURATED = {
  'Staff Selection Commission': 'SSC',
  'Union Public Service Commission': 'UPSC',
  'Reserve Bank of India': 'RBI',
  'Intelligence Bureau': 'IB',
  'Railway Recruitment Board': 'RRB',
  'RRB (Railway Recruitment Board)': 'RRB',
};

// User decision on the 4 collision groups found in the first preview run:
// keep every colliding state PSC at its full name rather than picking a
// "winner" for the shared abbreviation.
const EXCLUDE_FROM_SHORTENING = new Set([
  'Andhra Pradesh Public Service Commission',
  'Arunachal Pradesh Public Service Commission',
  'Goa Public Service Commission',
  'Gujarat Public Service Commission',
  'Karnataka Public Service Commission',
  'Kerala Public Service Commission',
  'Maharashtra Public Service Commission',
  'Manipur Public Service Commission',
  'Meghalaya Public Service Commission',
  'Mizoram Public Service Commission',
]);

function proposeName(name) {
  if (EXCLUDE_FROM_SHORTENING.has(name)) return null;

  // Rule A: trailing "(ABBR)"
  const trailingAbbr = name.match(/^(.*?)\s*\(([A-Z]{2,6})\)\s*$/);
  if (trailingAbbr) return { newName: trailingAbbr[2], rule: 'A: trailing (ABBR)' };

  // Rule A2: "ABBR (Full Expansion)"
  const leadingAbbr = name.match(/^([A-Z]{2,6})\s*\(.+\)$/);
  if (leadingAbbr) return { newName: leadingAbbr[1], rule: 'A2: ABBR (expansion)' };

  // Rule B: state + PSC/SSC/SSB pattern
  for (const { pattern, abbr } of PSC_SUFFIXES) {
    const m = name.match(pattern);
    if (m) return { newName: `${stateInitials(m[1])}${abbr}`, rule: 'B: state+PSC/SSC/SSB' };
  }

  // Rule C: curated central bodies
  if (CENTRAL_CURATED[name]) return { newName: CENTRAL_CURATED[name], rule: 'C: curated central' };

  return null;
}

const EXECUTE = process.argv.includes('--execute');

async function main() {
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  let { data } = await supabase.from('lc_conducting_bodies').select('id,name').order('name');

  // "Railway Recruitment Board" and "RRB (Railway Recruitment Board)" are the
  // same real body under two different rows (name has a unique constraint,
  // so both can't become "RRB" without merging first). Repoint any lc_exams
  // on the duplicate onto the canonical row, then drop the duplicate.
  const rrbFull = data.find((r) => r.name === 'Railway Recruitment Board');
  const rrbDup = data.find((r) => r.name === 'RRB (Railway Recruitment Board)');
  if (rrbFull && rrbDup) {
    console.log(`Merging duplicate conducting body: "${rrbDup.name}" -> "${rrbFull.name}"`);
    if (EXECUTE) {
      const { error: repointErr } = await supabase.from('lc_exams').update({ conducting_body_id: rrbFull.id }).eq('conducting_body_id', rrbDup.id);
      if (repointErr) throw repointErr;
      const { error: repointErr2 } = await supabase.from('exams').update({ conducting_body_id: rrbFull.id }).eq('conducting_body_id', rrbDup.id);
      if (repointErr2) throw repointErr2;
      const { error: delErr } = await supabase.from('lc_conducting_bodies').delete().eq('id', rrbDup.id);
      if (delErr) throw delErr;
    }
    data = data.filter((r) => r.id !== rrbDup.id);
  }

  const changes = [];
  for (const row of data) {
    const proposal = proposeName(row.name);
    if (proposal && proposal.newName !== row.name) {
      changes.push({ id: row.id, old: row.name, new: proposal.newName, rule: proposal.rule });
    }
  }

  console.log(`Total conducting bodies: ${data.length}`);
  console.log(`Proposed changes: ${changes.length}`);
  console.log(`Unchanged (already short/no rule applies): ${data.length - changes.length}`);

  // Check for collisions: would two different old names map to the same new name?
  const byNew = new Map();
  for (const c of changes) {
    if (!byNew.has(c.new)) byNew.set(c.new, []);
    byNew.get(c.new).push(c.old);
  }
  const collisions = [...byNew.entries()].filter(([, olds]) => olds.length > 1);
  if (collisions.length) {
    console.log(`\n!!! COLLISIONS (${collisions.length}) -- these would make two different bodies share one name:`);
    for (const [newName, olds] of collisions) console.log(`  "${newName}" <- ${olds.join(' | ')}`);
  } else {
    console.log('\nNo collisions -- every proposed new name is unique.');
  }

  console.log('\n--- Full change list ---');
  for (const c of changes.sort((a, b) => a.rule.localeCompare(b.rule))) {
    console.log(`  [${c.rule}] ${c.old}  ->  ${c.new}`);
  }

  if (!EXECUTE) {
    console.log('\nDry run only -- no writes made. Re-run with --execute to apply.');
    return;
  }

  console.log('\nApplying renames...');
  let renamed = 0;
  for (const c of changes) {
    const { error } = await supabase.from('lc_conducting_bodies').update({ name: c.new }).eq('id', c.id);
    if (error) { console.error(`FAILED "${c.old}" -> "${c.new}": ${error.message}`); continue; }
    renamed++;
  }
  console.log(`Done. Renamed ${renamed}/${changes.length} conducting bodies.`);
}

main().catch((err) => { console.error(err); process.exit(1); });
