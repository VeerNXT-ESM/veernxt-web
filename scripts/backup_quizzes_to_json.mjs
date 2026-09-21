#!/usr/bin/env node
/**
 * scripts/backup_quizzes_to_json.mjs
 *
 * Local JSON backup of the `quizzes` + `questions` tables (451 quizzes /
 * 43,930 questions live). Unlike Books (public/books/) and PYQs
 * (FINAL_PYPS_STRUCTURED/*.json), quizzes have no local file backup at
 * all today -- their only trace of a source file points into a different
 * project's directory entirely, so a Supabase-side loss would be
 * unrecoverable. This is read-only against Supabase (SELECT only) and
 * only ever writes new local files -- it cannot affect production data.
 *
 * One JSON file per quiz, nesting its questions -- same shape convention
 * as pyq_papers/pyq_questions -> FINAL_PYPS_STRUCTURED/*.json. Written
 * alongside the other content backups on the K: drive rather than inside
 * the git repo, per the user's own storage convention for this content
 * (FINAL_PYPS_STRUCTURED, FINAL_CONTENT_ENRICHED, etc. all live there,
 * none of them committed).
 *
 * Usage:
 *   node scripts/backup_quizzes_to_json.mjs             # dry run, prints counts only
 *   node scripts/backup_quizzes_to_json.mjs --execute    # writes the backup
 */
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

const EXECUTE = process.argv.includes('--execute');
const OUTPUT_DIR = 'K:\\H DRIVE\\Quantum Climb\\CLIENT ASSETS\\VeerNXT\\CONTENT\\FINAL_QUIZZES_BACKUP';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function fetchAllRows(table, columns, filter) {
  let all = [];
  let from = 0;
  const pageSize = 1000;
  while (true) {
    let query = supabase.from(table).select(columns).range(from, from + pageSize - 1);
    if (filter) query = filter(query);
    const { data, error } = await query;
    if (error) throw new Error(`${table}: ${error.message}`);
    all = all.concat(data);
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return all;
}

function sanitizeFilename(s) {
  return (s || 'untitled')
    .replace(/[\\/:*?"<>|]/g, '_')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 100);
}

async function main() {
  console.log(`Mode: ${EXECUTE ? 'EXECUTE (writing backup)' : 'DRY RUN (counts only)'}`);
  console.log('Fetching quizzes...');
  const quizzes = await fetchAllRows('quizzes', '*');
  console.log(`Fetching questions (${quizzes.length} quizzes to cover)...`);
  const questions = await fetchAllRows('questions', '*');

  const questionsByQuiz = new Map();
  for (const q of questions) {
    if (!questionsByQuiz.has(q.quiz_id)) questionsByQuiz.set(q.quiz_id, []);
    questionsByQuiz.get(q.quiz_id).push(q);
  }

  console.log(`\n${quizzes.length} quizzes, ${questions.length} questions total.`);

  const orphanedQuestions = questions.filter((q) => !quizzes.some((qz) => qz.id === q.quiz_id));
  if (orphanedQuestions.length > 0) {
    console.log(`[warn] ${orphanedQuestions.length} questions reference a quiz_id with no matching quiz row -- included in output but flagged here.`);
  }

  if (!EXECUTE) {
    console.log('\nDry run only -- re-run with --execute to write the backup.');
    return;
  }

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const manifest = {
    exported_at: new Date().toISOString(),
    quiz_count: quizzes.length,
    question_count: questions.length,
    files: [],
  };

  for (const quiz of quizzes) {
    const quizQuestions = (questionsByQuiz.get(quiz.id) || [])
      .sort((a, b) => (a.question_number || 0) - (b.question_number || 0))
      .map(({ quiz_id, ...rest }) => rest); // quiz_id is redundant once nested under the quiz

    const fileName = `${sanitizeFilename(quiz.title)}__${quiz.id}.json`;
    const record = { ...quiz, questions: quizQuestions };
    fs.writeFileSync(path.join(OUTPUT_DIR, fileName), JSON.stringify(record, null, 2), 'utf-8');
    manifest.files.push({ id: quiz.id, title: quiz.title, question_count: quizQuestions.length, file_name: fileName });
  }

  fs.writeFileSync(path.join(OUTPUT_DIR, '_manifest.json'), JSON.stringify(manifest, null, 2), 'utf-8');

  console.log(`\n[WRITTEN] ${quizzes.length} quiz files + _manifest.json -> ${OUTPUT_DIR}`);
}

main().catch((err) => { console.error('Fatal error:', err); process.exit(1); });
