#!/usr/bin/env node
/**
 * scripts/apply_sql_via_management_api.mjs
 *
 * Runs a .sql file against the project's Postgres database via the
 * Supabase Management API (POST /v1/projects/{ref}/database/query),
 * authenticated with a personal access token (SUPABASE_ACCESS_TOKEN) --
 * not the service-role key, which can't run DDL over PostgREST. This is
 * the one-time path for applying sql/learning_center_schema.sql without
 * needing the Supabase CLI or a direct Postgres connection string.
 *
 * Usage: node scripts/apply_sql_via_management_api.mjs <path-to-sql-file>
 */

import fs from 'node:fs';
import path from 'node:path';

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

function projectRefFromUrl(url) {
  const m = url.match(/https?:\/\/([a-z0-9]+)\.supabase\.co/i);
  if (!m) throw new Error(`Could not parse project ref from SUPABASE_URL: ${url}`);
  return m[1];
}

async function main() {
  const sqlPath = process.argv[2];
  if (!sqlPath) throw new Error('Usage: node scripts/apply_sql_via_management_api.mjs <path-to-sql-file>');
  if (!process.env.SUPABASE_ACCESS_TOKEN) throw new Error('SUPABASE_ACCESS_TOKEN not set in .env');
  if (!process.env.SUPABASE_URL) throw new Error('SUPABASE_URL not set in .env');

  const ref = projectRefFromUrl(process.env.SUPABASE_URL);
  const query = fs.readFileSync(sqlPath, 'utf-8');
  console.log(`Applying ${sqlPath} (${query.length} bytes) to project ${ref} via Management API...`);

  const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.SUPABASE_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query }),
  });

  const text = await res.text();
  let body;
  try { body = JSON.parse(text); } catch { body = text; }

  if (!res.ok) {
    console.error(`FAILED (HTTP ${res.status}):`);
    console.error(typeof body === 'string' ? body : JSON.stringify(body, null, 2));
    process.exit(1);
  }

  console.log('OK. Response:');
  console.log(typeof body === 'string' ? body : JSON.stringify(body, null, 2));
}

main().catch((e) => {
  console.error('FATAL', e);
  process.exit(1);
});
