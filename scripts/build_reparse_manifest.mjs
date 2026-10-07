#!/usr/bin/env node
/**
 * scripts/build_reparse_manifest.mjs
 *
 * READ-ONLY. Builds the manifest for bulk_reparse_books.mjs: one entry per LINKED Guide/Precis book
 * (Published, blocks format, linked to at least one exam), with the source DOCX resolved from
 * MASTER DOCUMENTS and the display fields to copy onto the new "<title> 2026 NEW" Draft row.
 * Writes nothing to Supabase or R2.
 *
 * Usage: node scripts/build_reparse_manifest.mjs [--out FINAL_BOOKS_STRUCTURED/_bulk/manifest.json]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
for (const line of fs.readFileSync(path.join(__dirname, '..', '.env'), 'utf-8').split('\n')) {
  const t = line.trim(); if (!t || t.startsWith('#')) continue;
  const eq = t.indexOf('='); if (eq === -1) continue;
  const k = t.slice(0, eq).trim(); if (!(k in process.env)) process.env[k] = t.slice(eq + 1).trim();
}
const arg = (f) => { const i = process.argv.indexOf(f); return i > -1 ? process.argv[i + 1] : null; };
const OUT = arg('--out') || path.join(__dirname, '..', 'FINAL_BOOKS_STRUCTURED', '_bulk', 'manifest.json');
const MASTER = String.raw`K:\H DRIVE\Quantum Climb\CLIENT ASSETS\VeerNXT\CONTENT\FINAL_CONTENT\Final Documents\MASTER DOCUMENTS`;
const SUFFIX = ' 2026 NEW';

const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function all(table, select) {
  let rows = [], from = 0;
  for (;;) {
    const { data, error } = await sb.from(table).select(select).range(from, from + 999);
    if (error) throw new Error(`${table}: ${error.message}`);
    rows = rows.concat(data);
    if (data.length < 1000) return rows;
    from += 1000;
  }
}

// ── master DOCX index ─────────────────────────────────────────
const master = [];
(function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p); else if (/\.docx$/i.test(e.name) && !e.name.startsWith('~$')) master.push(p);
  }
})(MASTER);
const byName = {};
for (const p of master) (byName[path.basename(p).toLowerCase()] ??= []).push(p);

const resources = await all('resources', 'resource_id,title,category,status,format,source_file,storage_base_url,chapter_count,subject,level,state_ut,conducting_body,website_url,thumbnail_url,reader_theme_id,subject_accent,is_freemium,is_locked,unlock_cost,created_at');
const maps = await all('lc_exam_resource_map', 'exam_id,resource_id');
const links = {};
for (const m of maps) (links[m.resource_id] ??= new Set()).add(m.exam_id);

const linked = resources.filter((r) => ['Guide', 'Precis'].includes(r.category) && r.status === 'Published' && r.format === 'blocks' && links[r.resource_id]);
const groups = new Map();
for (const r of linked) {
  const k = `${r.category}|${r.storage_base_url}`;
  if (!groups.has(k)) groups.set(k, { rows: [], exams: new Set() });
  const g = groups.get(k); g.rows.push(r); links[r.resource_id].forEach((e) => g.exams.add(e));
}

const variantOf = (file) => (/(constable|\bsi\b|_si\b|\bgs\b|_gs\b)/i.exec(file || '')?.[1] || '').replace(/[_\s]/g, '').toUpperCase();
const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

const entries = [];
for (const [k, g] of groups) {
  // canonical row: the Published row used by the most exams (then the oldest)
  const rows = g.rows.slice().sort((a, b) => (links[b.resource_id].size - links[a.resource_id].size) || (new Date(a.created_at) - new Date(b.created_at)));
  const canon = rows[0];
  const candidates = [...new Set(rows.map((r) => r.source_file).filter(Boolean))];
  entries.push({
    category: canon.category, oldTitle: canon.title, oldResourceId: canon.resource_id, oldStorageBaseUrl: canon.storage_base_url,
    examsLinked: g.exams.size, oldRowCount: rows.length, oldChapterCount: canon.chapter_count, liveSourceFiles: candidates,
    copy: Object.fromEntries(['subject', 'level', 'state_ut', 'conducting_body', 'website_url', 'thumbnail_url', 'reader_theme_id', 'subject_accent', 'is_freemium', 'is_locked', 'unlock_cost'].map((f) => [f, canon[f] ?? null])),
  });
}

// source resolution
const DONE_SOURCES = {
  'Guide|GS & GK': 'GSGK GUIDE 2026.docx',
  'Precis|GS & GK': 'GSGK PRECIS 2026.docx',
};
for (const e of entries) {
  e.source = null; e.status = 'source_needed'; e.note = '';
  const key = `${e.category}|${e.oldTitle}`;
  if (e.category === 'Precis' && e.oldTitle === '2026 GK-GS') { e.status = 'covered'; e.note = 'old Gemini copy of the GS & GK Precis; replaced by "GS & GK 2026 NEW" (Precis), no separate book'; continue; }
  const pick = (names) => {
    for (const n of names) {
      const hits = (byName[n.toLowerCase()] || []).filter((p) => p.includes(path.sep + e.category + path.sep));
      const any = hits.length ? hits : (byName[n.toLowerCase()] || []);
      if (any.length) return any[0];
    }
    return null;
  };
  const names = DONE_SOURCES[key] ? [DONE_SOURCES[key]] : e.liveSourceFiles;
  const p = pick(names);
  if (p) { e.source = p; e.status = 'ready'; }
  else e.note = `no file named ${names.map((n) => `"${n}"`).join(' / ')} in MASTER DOCUMENTS; the content team must name the final DOCX`;
}

// titles and slugs (unique per category)
const seen = new Map();
entries.sort((a, b) => b.examsLinked - a.examsLinked);
for (const e of entries) {
  let t = e.oldTitle.trim();
  const k = `${e.category}|${t.toLowerCase()}`;
  if (seen.has(k)) { const v = variantOf(path.basename(e.source || e.liveSourceFiles[0] || '')) || 'ALT'; t = `${t} (${v})`; }
  seen.set(`${e.category}|${t.toLowerCase()}`, true); seen.set(k, true);
  e.newTitle = t + SUFFIX;
  e.id = `${e.category.toLowerCase()}-${slugify(t)}-2026-new`;
}
entries.sort((a, b) => (a.category + a.newTitle).localeCompare(b.category + b.newTitle));

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify({ built: new Date().toISOString(), suffix: SUFFIX, entries }, null, 2));
const c = {};
for (const e of entries) c[e.status] = (c[e.status] || 0) + 1;
console.log('entries', entries.length, c, '->', OUT);
for (const e of entries.filter((x) => x.status !== 'ready')) console.log(' ', e.status.padEnd(13), e.category.padEnd(6), e.oldTitle, '|', e.note.slice(0, 110));
