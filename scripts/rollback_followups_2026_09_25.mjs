#!/usr/bin/env node
/**
 * scripts/rollback_followups_2026_09_25.mjs
 *
 * Follow-ups to the 09-25 GK-split rollback:
 *  1. Set the 7 now-unlinked GK split books (Precis) to Draft -- the content team wants only the combined GK book.
 *  2. The original 33-chapter "Descriptive Writing Bank Exams" Guide (source Cluster_080_Descriptive_Writing_Bank_Exams.docx)
 *     was retitled "Reasoning" when the separate 12-chapter reasoning book sharing its old title was renamed
 *     (title-level rename). Rename ONLY the rows that are still titled "Reasoning" AND come from that source file back.
 * Dry run by default; --execute writes a backup of the affected rows first.
 * Undo: set the same resource_ids back (backup file lists them with their previous title/status).
 */
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

const EXECUTE = process.argv.includes('--execute');
const sb = createClient(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const SPLIT = ['4d91ed46-0c77-4767-b5fd-dc4e8ec3609f', '403bf624-0abe-44f0-a3cd-e41a8ee33722', '53b5a406-eea4-4a6a-80eb-40039334911e', 'a76e58c1-521d-434f-91ca-a1f4c7631469', 'b2500197-f17a-4d4c-9860-2d81f8551a2b', '870ffdb1-0bc2-49c4-b3d6-7131f2da6ead', 'c7fd0e2a-188b-47ae-a3fe-635138735ce7'];
const BACKUP_ROOT = process.env.DB_BACKUP_ROOT || String.raw`K:\tmp\db_backups`;

const { data: splits, error: e1 } = await sb.from('resources').select('*').in('resource_id', SPLIT);
if (e1) throw new Error(e1.message);
const { count: links } = await sb.from('lc_exam_resource_map').select('id', { count: 'exact', head: true }).in('resource_id', SPLIT);

let dw = []; // paged: many Draft duplicates share the title
for (let f = 0; ; f += 1000) {
  const { data, error } = await sb.from('resources').select('*').eq('title', 'Reasoning').ilike('source_file', '%Descriptive_Writing_Bank_Exams%').range(f, f + 999);
  if (error) throw new Error(error.message);
  dw = dw.concat(data);
  if (data.length < 1000) break;
}

console.log(`Mode: ${EXECUTE ? 'EXECUTE' : 'DRY RUN'}`);
console.log(`1) GK split books: ${splits.length} rows (${splits.map((s) => `${s.title}:${s.status}`).join(', ')}) | exam links still on them: ${links} (must be 0)`);
console.log(`2) Rows titled "Reasoning" from the Descriptive Writing source: ${dw.length} (${JSON.stringify(dw.reduce((a, r) => (a[r.status] = (a[r.status] || 0) + 1, a), {}))}, ${new Set(dw.map((r) => r.chapter_count))} ch)`);
if (links) throw new Error('Split books still have links -- refusing.');
if (!EXECUTE) { console.log('\nDry run only -- re-run with --execute.'); process.exit(0); }

const dir = path.join(BACKUP_ROOT, new Date().toISOString().replace(/[:.]/g, '-'));
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, 'followups_before.json'), JSON.stringify({ splits, descriptiveWriting: dw }, null, 1));
console.log(`[backup] ${dir}`);
const { error: u1 } = await sb.from('resources').update({ status: 'Draft' }).in('resource_id', SPLIT);
if (u1) throw new Error(u1.message);
for (let i = 0; i < dw.length; i += 100) {
  const { error } = await sb.from('resources').update({ title: 'Descriptive Writing Bank Exams' }).in('resource_id', dw.slice(i, i + 100).map((r) => r.resource_id)).eq('title', 'Reasoning');
  if (error) throw new Error(error.message);
}
console.log(`[DB] split books -> Draft; ${dw.length} rows retitled "Descriptive Writing Bank Exams"`);
