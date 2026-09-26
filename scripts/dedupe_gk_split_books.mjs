#!/usr/bin/env node
/**
 * scripts/dedupe_gk_split_books.mjs
 *
 * The SSC "GK" book was split by subject (Biology, Chemistry, Economics, Geography,
 * History, Physics, Polity) and each split was ingested several times. This keeps ONE
 * Published block-format Precis per subject and archives (status='Draft') the rest of the
 * PUBLISHED copies: the differently-cased / "cluster-" folder block duplicates and the
 * html-format SSC-GK-* copies.
 *
 * KEEP (the 2026-09-13 uuid-folder copies, whose text has the "SSC" brand removed so the
 * book fits any exam):  GK Biology, GK Chemistry, GK Economics, GK Geography, GK History,
 * GK Physics, and Cluster_014_SSC-GK-Polity (renamed "GK Polity").
 *
 * RRB-GK-* splits are a different book (Polity 442 ch, Geography 236 ch) and are NOT touched.
 * Rows already Draft are left alone.
 *
 * Safety asserted before any write: every row to archive has zero lc_exam_resource_map /
 * lc_exam_intro links, and no lc_exams name matches the html rows' exam_name (so the legacy
 * exam_name fallback cannot be serving them). Dry run by default; --execute backs up first,
 * then verifies through the ANON key.
 *
 * Usage: node scripts/dedupe_gk_split_books.mjs [--execute]
 */
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

const EXECUTE = process.argv.includes('--execute');
const URL_ = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const sb = createClient(URL_, process.env.SUPABASE_SERVICE_ROLE_KEY);
const anon = createClient(URL_, process.env.VITE_SUPABASE_ANON_KEY);
const BACKUP_ROOT = process.env.DB_BACKUP_ROOT || String.raw`K:\tmp\db_backups`;

const KEEP = {
  biology: '4d91ed46-0c77-4767-b5fd-dc4e8ec3609f',
  chemistry: '403bf624-0abe-44f0-a3cd-e41a8ee33722',
  economics: '53b5a406-eea4-4a6a-80eb-40039334911e',
  geography: 'a76e58c1-521d-434f-91ca-a1f4c7631469',
  history: 'b2500197-f17a-4d4c-9860-2d81f8551a2b',
  physics: '870ffdb1-0bc2-49c4-b3d6-7131f2da6ead',
  polity: 'c7fd0e2a-188b-47ae-a3fe-635138735ce7',
};
const keepIds = new Set(Object.values(KEEP));
const subject = (t) => (String(t).match(/(biology|chemistry|economics|geography|history|physics|polity)/i) || [])[1]?.toLowerCase();
const chunks = (a, n) => Array.from({ length: Math.ceil(a.length / n) }, (_, i) => a.slice(i * n, i * n + n));

async function all(build) {
  let out = [];
  for (let f = 0; ; f += 1000) {
    const { data, error } = await build().range(f, f + 999);
    if (error) throw new Error(error.message);
    out = out.concat(data || []);
    if (!data || data.length < 1000) break;
  }
  return out;
}

const cand = await all(() => sb.from('resources').select('*').eq('category', 'Precis').eq('status', 'Published').or('title.ilike.GK %,title.ilike.%SSC-GK-%'));
const ssc = cand.filter((r) => subject(r.title) && !/RRB/i.test(r.title) && r.title.length < 40);
const missing = Object.entries(KEEP).filter(([, id]) => !ssc.some((r) => r.resource_id === id));
if (missing.length) throw new Error(`KEEP row not Published/found: ${missing.map((m) => m[0]).join(', ')}`);
const toArchive = ssc.filter((r) => !keepIds.has(r.resource_id));
const ids = toArchive.map((r) => r.resource_id);

let links = 0;
for (const c of chunks(ids, 40)) {
  links += (await sb.from('lc_exam_resource_map').select('id', { count: 'exact', head: true }).in('resource_id', c)).count;
  links += (await sb.from('lc_exam_intro').select('exam_id', { count: 'exact', head: true }).in('resource_id', c)).count;
}
const examNames = [...new Set(toArchive.map((r) => r.exam_name).filter(Boolean))];
let nameHits = 0;
for (const n of examNames) nameHits += (await sb.from('lc_exams').select('id', { count: 'exact', head: true }).ilike('name', `%${n}%`)).count || 0;

console.log(`Mode: ${EXECUTE ? 'EXECUTE' : 'DRY RUN'}`);
console.log(`SSC GK-split Published rows: ${ssc.length} -> keep ${keepIds.size}, archive ${toArchive.length} (${toArchive.filter((r) => r.format === 'html').length} html, ${toArchive.filter((r) => r.format === 'blocks').length} block)`);
for (const r of toArchive.filter((x) => x.format === 'blocks')) console.log(`   archive block: ${r.title}  ${r.resource_id}`);
console.log(`Exam links on the rows to archive: ${links} (must be 0) | lc_exams matching html exam_name ${JSON.stringify(examNames)}: ${nameHits} (must be 0)`);
if (links || nameHits) throw new Error('Safety check failed -- refusing to continue.');

if (!EXECUTE) { console.log('\nDry run only -- re-run with --execute.'); process.exit(0); }

const dir = path.join(BACKUP_ROOT, new Date().toISOString().replace(/[:.]/g, '-'));
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, 'gk_split_dedupe_rows.json'), JSON.stringify(ssc, null, 1));
console.log(`[backup] ${dir}`);

for (const c of chunks(ids, 100)) {
  const { error } = await sb.from('resources').update({ status: 'Draft' }).in('resource_id', c);
  if (error) throw new Error(error.message);
}
const { error: rn } = await sb.from('resources').update({ title: 'GK Polity' }).eq('resource_id', KEEP.polity);
if (rn) throw new Error(rn.message);
console.log(`[DB] archived ${ids.length} duplicate rows; renamed the kept Polity split to "GK Polity"`);

const seen = await all(() => anon.from('resources').select('resource_id,title,format').eq('category', 'Precis').or('title.ilike.GK %,title.ilike.%SSC-GK-%'));
const bySub = {};
for (const r of seen.filter((x) => subject(x.title) && !/RRB/i.test(x.title))) (bySub[subject(r.title)] ||= []).push(`${r.title}(${r.format})`);
console.log('[verify via anon] visible SSC-split rows per subject (expect exactly 1 each):', bySub);
