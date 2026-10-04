#!/usr/bin/env node
/**
 * Ingest ONE structured (table-template) mock-test .docx as a quiz + questions.
 * Parser: scripts/lib/structured_mock_parser.mjs. Dry-run by default; nothing is written without --execute.
 *
 *  - figures are uploaded to R2 (quiz_images/<docx hash>/<image hash>.<ext>) and referenced by URL
 *  - exam link + metadata are copied from an existing sibling quiz (--like "<title>")
 *  - ALL parsed questions are stored; defects ride in questions.review_flags and the player already
 *    hides blocking ones (src/lib/quizQuality.js). question_number = body position (printed numbers repeat).
 *  - idempotent on title: an existing quiz of that title has its questions replaced (backed up first)
 *
 * Usage: node scripts/ingest_structured_mock.mjs <file.docx> --title="<quiz title>" --like="<existing quiz title>" [--execute]
 */
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { parseStructuredMock } from './lib/structured_mock_parser.mjs';
import { getS3Client, uploadToR2 } from './lib/ingest-drive-content.js';
import { BLOCKING_QUESTION_FLAGS } from '../src/lib/quizQuality.js';

const args = process.argv.slice(2);
const EXECUTE = args.includes('--execute');
const opt = (n) => (args.find((a) => a.startsWith(`--${n}=`)) || '').slice(n.length + 3);
const file = args.find((a) => !a.startsWith('--'));
const title = opt('title'), like = opt('like');
if (!file || !title) { console.error('Usage: node scripts/ingest_structured_mock.mjs <file.docx> --title="..." [--like="existing quiz title"] [--execute]'); process.exit(1); }

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const docHash = crypto.createHash('sha1').update(fs.readFileSync(file)).digest('hex').slice(0, 8);
const imgKey = (img) => `quiz_images/${docHash}/${crypto.createHash('sha1').update(img.buffer).digest('hex').slice(0, 12)}${path.extname(img.name)}`;
const publicBase = (process.env.R2_PUBLIC_URL || '').replace(/\/$/, '');

const parsed = await parseStructuredMock(file, { imageMode: 'url', imageUrl: (img) => `${publicBase}/${imgKey(img)}` });
const playable = parsed.questions.filter((q) => q.answer && !q.flags.some((f) => BLOCKING_QUESTION_FLAGS.includes(f))).length;

let base = {};
if (like) {
  const { data, error } = await supabase.from('quizzes').select('*').eq('title', like).limit(1).maybeSingle();
  if (error || !data) { console.error(`--like quiz not found: ${like}`); process.exit(1); }
  base = { subject: data.subject, exam_name: data.exam_name, conducting_body: data.conducting_body, lc_exam_id: data.lc_exam_id, level: data.level, state_ut: data.state_ut, is_freemium: data.is_freemium, is_locked: data.is_locked, unlock_cost: data.unlock_cost };
}
const row = { title, description: null, category: 'Mock Test', source_file: file, total_questions: parsed.questions.length, file_hash: docHash, ...base };
const { data: existing } = await supabase.from('quizzes').select('id').eq('title', title).maybeSingle();

console.log(`${EXECUTE ? 'EXECUTE' : 'DRY-RUN'}: "${title}" <- ${path.basename(file)}`);
console.log(`questions ${parsed.questions.length} (declared ${parsed.declared}) | playable ${playable} | images ${parsed.images.length} | ${existing ? 'REPLACES existing ' + existing.id : 'new quiz'}`);
console.log('linked to:', JSON.stringify({ exam: base.exam_name, body: base.conducting_body, lc_exam_id: base.lc_exam_id, locked: base.is_locked }));
console.log('paper issues:', parsed.issues.length ? '\n  - ' + parsed.issues.join('\n  - ') : 'none');
if (!EXECUTE) { console.log('\nNo changes made. Re-run with --execute.'); process.exit(0); }

const probe = await supabase.from('questions').select('review_flags').limit(1);
if (probe.error) { console.error('questions.review_flags missing:', probe.error.message); process.exit(1); }

// backup (only matters when replacing) + rollback id
const bdir = path.join('K:/tmp/db_backups', `structured_mock_${new Date().toISOString().replace(/[:.]/g, '-')}`);
fs.mkdirSync(bdir, { recursive: true });
if (existing) {
  const q = await supabase.from('questions').select('*').eq('quiz_id', existing.id);
  const z = await supabase.from('quizzes').select('*').eq('id', existing.id);
  fs.writeFileSync(path.join(bdir, 'questions_replaced.json'), JSON.stringify(q.data)); fs.writeFileSync(path.join(bdir, 'quizzes_replaced.json'), JSON.stringify(z.data));
}

const s3 = getS3Client();
for (const img of parsed.images) await uploadToR2(s3, process.env.R2_BUCKET_NAME, imgKey(img), img.buffer, img.mime);
console.log(`Uploaded ${parsed.images.length} image(s) to R2 under quiz_images/${docHash}/`);

let quizId;
if (existing) {
  quizId = existing.id;
  const d = await supabase.from('questions').delete().eq('quiz_id', quizId); if (d.error) throw new Error(d.error.message);
  const u = await supabase.from('quizzes').update(row).eq('id', quizId); if (u.error) throw new Error(u.error.message);
} else {
  const i = await supabase.from('quizzes').insert(row).select('id').single(); if (i.error) throw new Error(i.error.message);
  quizId = i.data.id; fs.writeFileSync(path.join(bdir, 'created_quiz_ids.json'), JSON.stringify([quizId]));
}
const qrows = parsed.questions.map((q) => ({ quiz_id: quizId, question_number: q.position, question_text: q.stem, options: q.options, correct_answer: q.answer, explanation: q.explanation, review_flags: q.flags }));
for (let i = 0; i < qrows.length; i += 100) { const r = await supabase.from('questions').insert(qrows.slice(i, i + 100)); if (r.error) throw new Error(`questions: ${r.error.message}`); }
const pq = await supabase.from('quizzes').update({ playable_questions: playable }).eq('id', quizId); if (pq.error) throw new Error(pq.error.message);
console.log(`Done. quiz id ${quizId} | ${qrows.length} questions | ${playable} playable.\nRollback: delete from questions/quizzes where id/quiz_id = '${quizId}' (ids in ${bdir})`);
