#!/usr/bin/env node
/**
 * scripts/dedupe_lc_resources.mjs
 *
 * lc_resources (the admin CMS's canonical resource library, 138 rows) has
 * the same class of scattered-duplicate problem the file-system 88-master-
 * document dedup (dedupe_exam_list.py-adjacent work) solved for the content
 * library on disk -- confirmed live: 26 duplicate-title groups covering
 * 63/138 rows (46%). The concrete case that surfaced it: two "Delhi_GS_Book"
 * rows, one an orphaned draft with no file content and 0 linked exams
 * (created first), the other published with real R2-backed content and 38
 * linked exams (created later). Usage/content, not chronology, decides which
 * row survives.
 *
 * For each duplicate-title group:
 *   1. Pick a canonical row: highest lc_resource_usage.exam_count first,
 *      then non-null storage_base_url, then earliest created_at.
 *   2. For every other row in the group, re-point its lc_subject_resources
 *      links onto the canonical row's id (or drop them if the canonical is
 *      already linked to that same exam_subject_id -- the CASCADE on delete
 *      would remove them anyway).
 *   3. Only then delete the duplicate lc_resources row -- lc_subject_resources
 *      .resource_id is ON DELETE CASCADE (sql/learning_center_schema.sql),
 *      so deleting first would silently lose any not-yet-repointed links,
 *      exactly like the already-known §30.5 cascade case.
 *
 * "RRB GENERAL SCIENCE GUIDE BOOK" (draft, no file, 0 exams, tagged under
 * the General Knowledge / GS subject rather than General Science) is not a
 * title-duplicate of anything and is deliberately left untouched -- flagged
 * in the report instead.
 *
 * Usage:
 *   node scripts/dedupe_lc_resources.mjs            # dry run
 *   node scripts/dedupe_lc_resources.mjs --execute   # writes
 */
import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

function loadEnv() {
  const lines = fs.readFileSync(path.resolve(process.cwd(), '.env'), 'utf-8').split('\n');
  for (const line of lines) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq === -1) continue;
    const k = t.slice(0, eq).trim();
    const v = t.slice(eq + 1).trim();
    if (!(k in process.env)) process.env[k] = v;
  }
}
loadEnv();

const EXECUTE = process.argv.includes('--execute');

function normalizedKey(title, resourceType) {
  const t = title.trim().toLowerCase().replace(/\s*\(\d+\)\s*$/, '').trim();
  return `${t}::${resourceType}`;
}

async function main() {
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

  const [{ data: resources, error: rErr }, { data: usage, error: uErr }] = await Promise.all([
    supabase.from('lc_resources').select('id,title,resource_type,file_hash,storage_base_url,status,subject_id,created_at'),
    supabase.from('lc_resource_usage').select('resource_id,exam_count'),
  ]);
  if (rErr) throw rErr;
  if (uErr) throw uErr;

  const usageById = new Map((usage || []).map((u) => [u.resource_id, u.exam_count || 0]));

  const groups = new Map();
  for (const r of resources) {
    const key = normalizedKey(r.title, r.resource_type);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push({ ...r, exam_count: usageById.get(r.id) || 0 });
  }

  const dupGroups = [...groups.entries()].filter(([, rows]) => rows.length > 1);
  const flaggedNotTouched = resources.find((r) => r.title === 'RRB GENERAL SCIENCE GUIDE BOOK');

  console.log(`lc_resources total: ${resources.length}`);
  console.log(`Duplicate-title groups found: ${dupGroups.length} (${dupGroups.reduce((n, [, rows]) => n + rows.length, 0)} rows)\n`);

  let totalDeletes = 0;
  let totalRepointed = 0;
  let totalDropped = 0;
  const plan = [];

  for (const [key, rows] of dupGroups) {
    const sorted = [...rows].sort((a, b) => {
      if (b.exam_count !== a.exam_count) return b.exam_count - a.exam_count;
      const aHas = a.storage_base_url ? 1 : 0;
      const bHas = b.storage_base_url ? 1 : 0;
      if (bHas !== aHas) return bHas - aHas;
      return new Date(a.created_at) - new Date(b.created_at);
    });
    const canonical = sorted[0];
    const dups = sorted.slice(1);
    plan.push({ key, canonical, dups });
    totalDeletes += dups.length;
  }

  console.log('--- Plan (first 10 groups) ---');
  for (const { key, canonical, dups } of plan.slice(0, 10)) {
    console.log(`\n[${key}]`);
    console.log(`  KEEP:   "${canonical.title}" (${canonical.id.slice(0, 8)}…) — ${canonical.exam_count} exams, content=${canonical.storage_base_url ? 'yes' : 'NO'}, status=${canonical.status}`);
    for (const d of dups) {
      console.log(`  DELETE: "${d.title}" (${d.id.slice(0, 8)}…) — ${d.exam_count} exams, content=${d.storage_base_url ? 'yes' : 'NO'}, status=${d.status}`);
    }
  }
  if (plan.length > 10) console.log(`\n… and ${plan.length - 10} more groups.`);

  console.log(`\nRows to delete: ${totalDeletes}`);
  if (flaggedNotTouched) {
    console.log(`\nFlagged, NOT auto-touched: "${flaggedNotTouched.title}" (${flaggedNotTouched.id.slice(0, 8)}…) — not a title-duplicate of anything, has no real file content, mistagged subject. Worth a manual look.`);
  }

  if (!EXECUTE) {
    console.log('\nDry run only — no writes made. Re-run with --execute to apply.');
    return;
  }

  console.log('\nExecuting…');
  for (const { canonical, dups } of plan) {
    const { data: canonicalLinks } = await supabase.from('lc_subject_resources').select('exam_subject_id').eq('resource_id', canonical.id);
    const canonicalExamSubjectIds = new Set((canonicalLinks || []).map((l) => l.exam_subject_id));

    for (const dup of dups) {
      const { data: dupLinks } = await supabase.from('lc_subject_resources').select('id,exam_subject_id').eq('resource_id', dup.id);
      for (const link of dupLinks || []) {
        if (canonicalExamSubjectIds.has(link.exam_subject_id)) {
          totalDropped++; // canonical already covers this exam_subject — cascade will clean it up on delete
          continue;
        }
        const { error: repointErr } = await supabase.from('lc_subject_resources').update({ resource_id: canonical.id }).eq('id', link.id);
        if (repointErr) { console.error(`FAILED to repoint link ${link.id}: ${repointErr.message}`); continue; }
        canonicalExamSubjectIds.add(link.exam_subject_id);
        totalRepointed++;
      }

      const { error: delErr } = await supabase.from('lc_resources').delete().eq('id', dup.id);
      if (delErr) { console.error(`FAILED to delete "${dup.title}" (${dup.id}): ${delErr.message}`); continue; }
    }
  }

  console.log(`\nDone. Repointed ${totalRepointed} links, dropped ${totalDropped} redundant links, deleted ${totalDeletes} duplicate rows.`);
}

main().catch((err) => { console.error(err); process.exit(1); });
