#!/usr/bin/env node
/**
 * scripts/cutover-r2-urls.js
 *
 * The actual cutover step for the R2 account migration (see
 * migrate-r2-account.js and status_report.md): repoints every
 * resources_v2 row's storage_base_url/metadata_url/thumbnail_url from the
 * old bucket's public URL to the new one. Doesn't touch R2 at all — by
 * this point every object already exists, byte-identical, at the new
 * bucket (verified separately). This is a pure string replace + DB write.
 *
 * Old bucket is left untouched — nothing deleted — so this is instantly
 * reversible by re-running with OLD/NEW swapped if anything looks wrong.
 *
 * Usage: node scripts/cutover-r2-urls.js [--limit N] [--concurrency N]
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

function parseArgs() {
  const args = process.argv.slice(2);
  const out = { limit: Infinity, concurrency: 20 };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--limit') out.limit = parseInt(args[++i], 10);
    else if (args[i] === '--concurrency') out.concurrency = parseInt(args[++i], 10);
  }
  return out;
}

async function mapWithConcurrency(items, limit, fn) {
  let idx = 0;
  async function worker() {
    while (idx < items.length) {
      const current = idx++;
      await fn(items[current], current);
    }
  }
  const workers = Array.from({ length: Math.min(limit, items.length) }, () => worker());
  await Promise.all(workers);
}

async function main() {
  const opts = parseArgs();
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

  const OLD_URL = process.env.R2_PUBLIC_URL;
  const NEW_URL = process.env.R2_NEW_PUBLIC_URL;
  if (!OLD_URL || !NEW_URL) throw new Error('Missing R2_PUBLIC_URL or R2_NEW_PUBLIC_URL in .env');
  console.log(`Repointing ${OLD_URL} -> ${NEW_URL}`);

  const all = [];
  const PAGE = 1000;
  let from = 0;
  for (;;) {
    const { data, error } = await supabase
      .from('resources_v2')
      .select('resource_id, storage_base_url, metadata_url, thumbnail_url')
      .ilike('storage_base_url', `${OLD_URL}%`)
      .range(from, from + PAGE - 1);
    if (error) throw error;
    all.push(...(data || []));
    if (!data || data.length < PAGE) break;
    from += PAGE;
  }
  console.log(`${all.length} rows still pointing at the old URL.`);

  const toProcess = all.slice(0, opts.limit);
  console.log(`Updating ${toProcess.length} rows (concurrency=${opts.concurrency})...\n`);

  let updated = 0;
  const failed = [];

  await mapWithConcurrency(toProcess, opts.concurrency, async (row, i) => {
    try {
      const update = {
        storage_base_url: row.storage_base_url.replace(OLD_URL, NEW_URL),
        metadata_url: row.metadata_url ? row.metadata_url.replace(OLD_URL, NEW_URL) : row.metadata_url,
        thumbnail_url: row.thumbnail_url ? row.thumbnail_url.replace(OLD_URL, NEW_URL) : row.thumbnail_url,
      };
      const { error } = await supabase.from('resources_v2').update(update).eq('resource_id', row.resource_id);
      if (error) throw error;
      updated++;
      if (updated % 500 === 0) console.log(`[${updated}/${toProcess.length}] updated`);
    } catch (err) {
      failed.push({ resource_id: row.resource_id, error: err.message });
      console.error(`FAILED ${row.resource_id}: ${err.message}`);
    }
  });

  console.log('\n=== SUMMARY ===');
  console.log(`Updated: ${updated}`);
  console.log(`Failed: ${failed.length}`);
  if (failed.length > 0) {
    const reportPath = path.resolve(process.cwd(), `cutover-failures-${Date.now()}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(failed, null, 2));
    console.log(`Failure details written to ${reportPath} — re-run to retry (only touches rows still on the old URL).`);
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
