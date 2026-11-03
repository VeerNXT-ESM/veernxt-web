#!/usr/bin/env node
/**
 * scripts/fix_missing_book_chapters.mjs
 *
 * Updates published rows in `resources` for books that were previously ingested
 * with only 1 flat chapter, repointing them to the verified multi-chapter block storage:
 *   - Bihar GS (Guide): 1 -> 11 chapters
 *   - Assam GS (Guide): 1 -> 10 chapters
 *   - REASONING (Precis): 1 -> 15 chapters
 *   - ELECTRICAL ENGINEERING (Precis): 1 -> 20 chapters
 *
 * Saves full backups to backups/missing_chapters_fix_<timestamp>.json before touching any rows.
 * Dry run by default. Use --execute to apply changes.
 */
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

const EXECUTE = process.argv.includes('--execute');
const URL_ = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const sb = createClient(URL_, process.env.SUPABASE_SERVICE_ROLE_KEY);
const anon = createClient(URL_, process.env.VITE_SUPABASE_ANON_KEY);

const TARGETS = [
  {
    title: 'Bihar GS',
    category: 'Guide',
    newStorageUrl: 'https://pub-8c123d43246448199bbe4a14bffa2c06.r2.dev/structured_resources/blocks/Guide/225a86b4-0a2c-40a2-a0a2-225a86b40a2c/',
    newChapterCount: 11,
  },
  {
    title: 'Assam GS',
    category: 'Guide',
    newStorageUrl: 'https://pub-8c123d43246448199bbe4a14bffa2c06.r2.dev/structured_resources/blocks/Guide/4ecd2c29-2fcd-42fc-a2fc-4ecd2c292fcd/',
    newChapterCount: 10,
  },
  {
    title: 'REASONING',
    category: 'Precis',
    newStorageUrl: 'https://pub-8c123d43246448199bbe4a14bffa2c06.r2.dev/structured_resources/blocks/Precis/36dcf839-0c80-40c8-a0c8-36dcf8390c80/',
    newChapterCount: 15,
  },
  {
    title: 'ELECTRICAL ENGINEERING',
    category: 'Precis',
    newStorageUrl: 'https://pub-8c123d43246448199bbe4a14bffa2c06.r2.dev/structured_resources/blocks/Precis/01fca38c-7561-4756-a756-01fca38c7561/',
    newChapterCount: 20,
  },
];

async function main() {
  console.log(`=== Fix Missing Book Chapters ===`);
  console.log(`Mode: ${EXECUTE ? 'EXECUTE' : 'DRY RUN (pass --execute to apply)'}\n`);

  const backupDir = path.resolve('backups');
  if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
  const backupFile = path.join(backupDir, `missing_chapters_fix_${new Date().toISOString().replace(/[:.]/g, '-')}.json`);

  const allBackups = [];

  for (const t of TARGETS) {
    let rows = [];
    let page = 0;
    while (true) {
      const { data: pageRows, error } = await sb
        .from('resources')
        .select('resource_id, title, category, format, chapter_count, storage_base_url, status')
        .eq('title', t.title)
        .eq('category', t.category)
        .eq('format', 'blocks')
        .range(page * 1000, (page + 1) * 1000 - 1);

      if (error) {
        console.error(`Error fetching ${t.title}:`, error.message);
        break;
      }
      if (!pageRows || pageRows.length === 0) break;
      rows.push(...pageRows);
      if (pageRows.length < 1000) break;
      page++;
    }

    console.log(`[${t.category}] "${t.title}": found ${rows.length} rows.`);
    const needUpdate = (rows || []).filter(
      (r) => r.storage_base_url !== t.newStorageUrl || r.chapter_count !== t.newChapterCount || r.status !== 'Published'
    );
    console.log(`  -> ${needUpdate.length} rows need chapter count & storage URL upgrade to ${t.newChapterCount} chapters.`);

    for (const r of needUpdate) {
      allBackups.push({
        ...r,
        targetUpdate: {
          storage_base_url: t.newStorageUrl,
          chapter_count: t.newChapterCount,
          status: 'Published',
        },
      });
    }

    if (EXECUTE && needUpdate.length > 0) {
      const ids = needUpdate.map((r) => r.resource_id);
      // Batch update in chunks of 100
      for (let i = 0; i < ids.length; i += 100) {
        const batch = ids.slice(i, i + 100);
        const { error: updErr } = await sb
          .from('resources')
          .update({
            storage_base_url: t.newStorageUrl,
            chapter_count: t.newChapterCount,
            status: 'Published',
          })
          .in('resource_id', batch);

        if (updErr) {
          console.error(`  Error updating batch for ${t.title}:`, updErr.message);
        } else {
          console.log(`  Updated batch of ${batch.length} rows for "${t.title}".`);
        }
      }
    }
  }

  fs.writeFileSync(backupFile, JSON.stringify(allBackups, null, 2));
  console.log(`\nBackup saved to: ${backupFile} (${allBackups.length} rows)`);

  // Verify through ANON key
  if (EXECUTE) {
    console.log(`\n--- Verifying with ANON Key (RLS Check) ---`);
    for (const t of TARGETS) {
      const { data: anonRows } = await anon
        .from('resources')
        .select('resource_id, title, category, chapter_count, status')
        .eq('title', t.title)
        .eq('category', t.category)
        .limit(1);

      if (anonRows && anonRows.length > 0) {
        const a = anonRows[0];
        console.log(`  ✓ ANON verified [${a.category}] "${a.title}": status=${a.status}, chapters=${a.chapter_count}`);
      } else {
        console.warn(`  ✗ ANON could not fetch [${t.category}] "${t.title}"! Check RLS policies.`);
      }
    }
  }

  console.log(`\nFinished.`);
}

main().catch(console.error);
