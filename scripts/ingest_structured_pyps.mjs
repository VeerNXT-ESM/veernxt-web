import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

const STRUCTURED_PYPS_DIR = 'K:\\H DRIVE\\Quantum Climb\\CLIENT ASSETS\\VeerNXT\\CONTENT\\FINAL_PYPS_STRUCTURED';
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const EXECUTE = process.argv.includes('--execute');

// Stable UUID generator for idempotency
function stableUuid(str) {
  const hash = crypto.createHash('md5').update(str).digest('hex');
  return [
    hash.substring(0, 8),
    hash.substring(8, 12),
    hash.substring(12, 16),
    hash.substring(16, 20),
    hash.substring(20, 32)
  ].join('-');
}

function cleanTitle(filename) {
  return filename
    .replace(/^PYPs_/, '')
    .replace(/\.json$/, '')
    .replace(/_Fallback_Extracted_/g, ' Set ')
    .replace(/_PYP_/g, ' Set ')
    .replace(/_PYQ_/g, ' Set ')
    .replace(/_/g, ' ')
    .trim();
}

function extractExamName(filename) {
  let name = filename.replace(/^PYPs_/, '').replace(/\.json$/, '');
  name = name.replace(/_Fallback_Extracted_\d+$/, '')
             .replace(/_PYP_\d+$/, '')
             .replace(/_PYQ_\d+$/, '')
             .replace(/_/g, ' ');
  return name.trim();
}

function modeSubject(questions) {
  const counts = new Map();
  for (const q of questions) {
    const s = (q.subject || '').trim();
    if (!s) continue;
    counts.set(s, (counts.get(s) || 0) + 1);
  }
  let best = null;
  let bestCount = 0;
  for (const [subject, count] of counts) {
    if (count > bestCount) {
      best = subject;
      bestCount = count;
    }
  }
  return best || 'General Studies';
}

function parseOptions(optionsArray) {
  const opts = { A: '', B: '', C: '', D: '' };
  if (Array.isArray(optionsArray)) {
    optionsArray.forEach(opt => {
      const match = opt.match(/^\s*([A-D])[\)\.\s\-]+([\s\S]*)$/i);
      if (match) {
        const key = match[1].toUpperCase();
        opts[key] = match[2].trim();
      }
    });
    
    // Fallback if regex match fails
    if (!opts.A && optionsArray[0]) opts.A = optionsArray[0].replace(/^\s*[A-D][\)\.\s\-]+/i, '').trim();
    if (!opts.B && optionsArray[1]) opts.B = optionsArray[1].replace(/^\s*[A-D][\)\.\s\-]+/i, '').trim();
    if (!opts.C && optionsArray[2]) opts.C = optionsArray[2].replace(/^\s*[A-D][\)\.\s\-]+/i, '').trim();
    if (!opts.D && optionsArray[3]) opts.D = optionsArray[3].replace(/^\s*[A-D][\)\.\s\-]+/i, '').trim();
  } else if (typeof optionsArray === 'object' && optionsArray !== null) {
    return optionsArray;
  }
  return opts;
}

async function main() {
  console.log("=== VEERNXT STRUCTURED PYP INGESTION PIPELINE ===");
  console.log(`Mode: ${EXECUTE ? 'EXECUTE (writing to Supabase)' : 'DRY RUN'}\n`);

  if (!fs.existsSync(STRUCTURED_PYPS_DIR)) {
    console.error(`Error: Directory not found: ${STRUCTURED_PYPS_DIR}`);
    process.exit(1);
  }

  const files = fs.readdirSync(STRUCTURED_PYPS_DIR).filter(f => f.endsWith('.json'));
  console.log(`Found ${files.length} structured JSON papers to ingest.\n`);

  let successCount = 0;
  let errorCount = 0;

  for (const filename of files) {
    const filePath = path.join(STRUCTURED_PYPS_DIR, filename);
    
    try {
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      const data = JSON.parse(fileContent);

      const quizTitle = data.metadata?.title || cleanTitle(filename);
      const examName = extractExamName(filename);
      
      // Flatten all questions across all sections
      const allQuestions = [];
      let qNum = 1;
      
      (data.sections || []).forEach(section => {
        const subject = section.section_name || 'General Studies';
        (section.questions || []).forEach(q => {
          allQuestions.push({
            question_number: qNum++,
            question_text: q.question_text || '',
            options: parseOptions(q.options),
            correct_answer: (q.correct_option || 'A').toUpperCase().substring(0, 1),
            explanation: q.explanation || '',
            subject: subject
          });
        });
      });

      if (allQuestions.length === 0) {
        console.log(`[Skip] "${quizTitle}" — 0 questions extracted.`);
        continue;
      }

      const paperId = stableUuid(filename);
      const subject = modeSubject(allQuestions);

      console.log(`[Ingesting] "${quizTitle}" (${allQuestions.length} Qs, Exam: "${examName}", Subject: "${subject}")`);

      if (EXECUTE) {
        // 1. Upsert paper metadata
        const paperRecord = {
          id: paperId,
          title: quizTitle,
          exam_name: examName,
          subject,
          total_questions: allQuestions.length,
          source_file: filename,
          created_at: new Date().toISOString()
        };

        const { error: paperError } = await supabase
          .from('pyq_papers')
          .upsert(paperRecord, { onConflict: 'id' });

        if (paperError) {
          console.error(`  [Error] Failed to upsert paper: ${paperError.message}`);
          errorCount++;
          continue;
        }

        // 2. Clear old questions to avoid duplicates/collisions
        const { error: deleteError } = await supabase
          .from('pyq_questions')
          .delete()
          .eq('paper_id', paperId);

        if (deleteError) {
          console.error(`  [Error] Failed to delete old questions: ${deleteError.message}`);
          errorCount++;
          continue;
        }

        // 3. Bulk insert questions (pyq_questions has no `subject` column —
        // that's derived onto the paper record only, via modeSubject() above)
        const questionsToInsert = allQuestions.map(({ subject: _subject, ...q }) => ({
          ...q,
          paper_id: paperId
        }));

        // Batch inserts to prevent hitting payload limit for huge exams
        const batchSize = 100;
        for (let i = 0; i < questionsToInsert.length; i += batchSize) {
          const batch = questionsToInsert.slice(i, i + batchSize);
          const { error: questionsError } = await supabase
            .from('pyq_questions')
            .insert(batch);

          if (questionsError) {
            console.error(`  [Error] Failed to insert questions batch: ${questionsError.message}`);
            throw new Error(questionsError.message);
          }
        }

        console.log(`  -> Successfully upserted Paper and ${allQuestions.length} Questions.`);
      }
      
      successCount++;
    } catch (e) {
      console.error(`  [Fatal Error] Failed processing file "${filename}": ${e.message}`);
      errorCount++;
    }
  }

  console.log("\n=== INGESTION SUMMARY ===");
  console.log(`Successfully Processed: ${successCount}`);
  console.log(`Failed with Errors:      ${errorCount}`);
  if (!EXECUTE) {
    console.log("\nDry run completed. Run with --execute to commit to Supabase.");
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
