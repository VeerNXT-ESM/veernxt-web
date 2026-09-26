#!/usr/bin/env node
/**
 * Re-inserts Guide/Precis links from a links_deleted.json backup (written by rollback_guide_precis_links_to.mjs)
 * that were created at or before --upto. Upsert on id; nothing else is touched. Dry run unless --execute.
 *   node scripts/restore_guide_precis_links_from_backup.mjs --file=<links_deleted.json> --upto=2026-09-23T09:00:00Z [--execute]
 */
import 'dotenv/config';
import fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';
const arg = (n) => (process.argv.find((a) => a.startsWith(`--${n}=`)) || '').split('=')[1];
const file = arg('file'), upto = arg('upto'), EXECUTE = process.argv.includes('--execute');
if (!file || !upto) { console.error('Usage: --file=<json> --upto=<ISO> [--execute]'); process.exit(1); }
const sb = createClient(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const rows = JSON.parse(fs.readFileSync(file, 'utf8')).filter((r) => ['Guide', 'Precis'].includes(r.category) && new Date(r.created_at) <= new Date(upto));
console.log(`${EXECUTE ? 'EXECUTE' : 'DRY RUN'}: ${rows.length} links to restore (created <= ${upto})`);
if (EXECUTE) for (let i = 0; i < rows.length; i += 200) { const { error } = await sb.from('lc_exam_resource_map').upsert(rows.slice(i, i + 200), { onConflict: 'id' }); if (error) throw new Error(error.message); }
const { count } = await sb.from('lc_exam_resource_map').select('*', { count: 'exact', head: true }).in('category', ['Guide', 'Precis']);
console.log(`Guide/Precis links now: ${count}`);
