#!/usr/bin/env node
/**
 * scripts/dedupe_english_links.mjs   (Guide/Precis links only; never Intro, resources or quizzes)
 *
 * Exams hold two overlapping sets of English links (docs/status_report.md, 2026-09-26 session):
 *   Guide : Cluster_087_ENGLISH 26ch (canonical)   vs  Cluster_005_ENGLISH 23ch (Gemini 08-23)
 *   Precis: ENGLISH.docx        30ch (canonical)   vs  Cluster_005_ENGLISH  1ch (Gemini 08-23)
 * Rule: delete the older link ONLY when the same exam already holds the canonical one in that category,
 * so no exam ever loses its English Guide/Precis. Exams with just the 1ch Precis (no 30ch) and the
 * 8 exams with the 23ch mislabelled-as-Precis are left alone. Resources are never touched.
 * Dry run by default; --execute writes <ROOT>/<ts>/english_links_deleted.json first (restore = upsert on id).
 */
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
const EXECUTE = process.argv.includes('--execute');
const ROOT = process.env.DB_BACKUP_ROOT || String.raw`K:\tmp\db_backups`;
const sb = createClient(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const all = async (t, sel, f) => { const o = []; for (let i = 0; ; i += 1000) { let data, error; for (let a = 0; a < 5; a++) { let q = sb.from(t).select(sel).order('id').range(i, i + 999); if (f) q = f(q); ({ data, error } = await q); if (!error) break; await new Promise((r) => setTimeout(r, 2000 * (a + 1))); } if (error) throw new Error(error.message); o.push(...data); if (data.length < 1000) break; } return o; };
const links = await all('lc_exam_resource_map', '*', (q) => q.in('category', ['Guide', 'Precis']));
const R = new Map((await all('resources', 'id,resource_id,title,status,source_file,chapter_count', (q) => q.ilike('title', '%english%'))).map((r) => [r.resource_id, r]));
const isEng = (r) => r && r.status === 'Published' && /^\s*english\s*$/i.test(r.title);
const has = (r, f, ch) => (r.source_file || '').includes(f) && r.chapter_count === ch;
const kind = (l) => { const r = R.get(l.resource_id); if (!isEng(r)) return null;
  if (l.category === 'Guide' && has(r, 'Cluster_087_ENGLISH', 26)) return 'guide-canon';
  if (l.category === 'Guide' && has(r, 'Cluster_005_ENGLISH', 23)) return 'guide-old';
  if (l.category === 'Precis' && has(r, 'ENGLISH.docx', 30) && !r.source_file.includes('Cluster')) return 'precis-canon';
  if (l.category === 'Precis' && has(r, 'Cluster_005_ENGLISH', 1)) return 'precis-old'; return null; };
const byExam = new Map();
for (const l of links) { const k = kind(l); if (!k) continue; const e = byExam.get(l.exam_id) || {}; (e[k] ||= []).push(l); byExam.set(l.exam_id, e); }
const del = [], keepOnly = { guide: 0, precis: 0 };
for (const e of byExam.values()) {
  if (e['guide-old']) { if (e['guide-canon']) del.push(...e['guide-old']); else keepOnly.guide++; }
  if (e['precis-old']) { if (e['precis-canon']) del.push(...e['precis-old']); else keepOnly.precis++; }
}
const cnt = (f) => del.reduce((m, r) => { const k = f(r); m[k] = (m[k] || 0) + 1; return m; }, {});
console.log(`${EXECUTE ? 'EXECUTE' : 'DRY RUN'}: ${del.length} links across ${new Set(del.map((l) => l.exam_id)).size} exams`);
console.log('by book:', cnt((l) => `${l.category} ${kind(l)}`));
console.log(`Left alone: ${keepOnly.guide} exams have only the old 23ch Guide (no 26ch); ${keepOnly.precis} exams have only the 1ch Precis (no 30ch).`);
if (EXECUTE) {
  const dir = path.join(ROOT, new Date().toISOString().replace(/[:.]/g, '-')); fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'english_links_deleted.json'), JSON.stringify(del, null, 1)); console.log('Backup:', path.join(dir, 'english_links_deleted.json'));
  for (let i = 0; i < del.length; i += 100) { const { error } = await sb.from('lc_exam_resource_map').delete().in('id', del.slice(i, i + 100).map((l) => l.id)).in('category', ['Guide', 'Precis']); if (error) throw new Error(error.message); }
  console.log('Done.');
} else console.log('Dry run only -- add --execute to apply.');
