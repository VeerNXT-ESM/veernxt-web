#!/usr/bin/env node
/**
 * scripts/revert_intros_r2.mjs
 *
 * Restores Cloudflare R2 Intro JSON files (chapters/*.json and metadata.json)
 * from a snapshot created by scripts/backup_intros_r2.mjs.
 *
 * Dry-run by default. Pass --execute to actually upload to R2.
 *
 * Usage:
 *   node scripts/revert_intros_r2.mjs --latest
 *   node scripts/revert_intros_r2.mjs --backup scripts/backups/intros_2026-11-23T07-00-00
 *   node scripts/revert_intros_r2.mjs --latest --only <resource_id_or_prefix>
 *   node scripts/revert_intros_r2.mjs --latest --execute
 */
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import pLimit from 'p-limit';
import { getS3Client, uploadToR2 } from './lib/ingest-drive-content.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ARGS = process.argv.slice(2);
const EXECUTE = ARGS.includes('--execute');
const LATEST = ARGS.includes('--latest');
const BACKUP_ARG = (() => {
  const i = ARGS.indexOf('--backup');
  return i >= 0 ? ARGS[i + 1] : null;
})();
const ONLY = (() => {
  const i = ARGS.indexOf('--only');
  return i >= 0 ? ARGS[i + 1] : null;
})();

function resolveBackupDir() {
  if (BACKUP_ARG) {
    return path.isAbsolute(BACKUP_ARG) ? BACKUP_ARG : path.resolve(process.cwd(), BACKUP_ARG);
  }
  if (LATEST) {
    const backupsRoot = path.join(__dirname, 'backups');
    if (!fs.existsSync(backupsRoot)) {
      throw new Error(`No backups directory found at ${backupsRoot}`);
    }
    const dirs = fs
      .readdirSync(backupsRoot, { withFileTypes: true })
      .filter((d) => d.isDirectory() && d.name.startsWith('intros_'))
      .map((d) => d.name)
      .sort();
    if (dirs.length === 0) {
      throw new Error(`No intros_* snapshots found in ${backupsRoot}`);
    }
    return path.join(backupsRoot, dirs[dirs.length - 1]);
  }
  throw new Error('Specify --backup <dir> or --latest');
}

async function main() {
  const backupDir = resolveBackupDir();
  const manifestPath = path.join(backupDir, 'manifest.json');
  if (!fs.existsSync(manifestPath)) {
    throw new Error(`manifest.json not found in ${backupDir}`);
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
  const bucket = process.env.R2_BUCKET_NAME || manifest.r2_bucket;
  if (!bucket) throw new Error('Missing R2_BUCKET_NAME');

  let entries = manifest.entries || [];
  if (ONLY) {
    const needle = ONLY.toLowerCase();
    entries = entries.filter(
      (e) =>
        e.key_prefix.toLowerCase().includes(needle) ||
        (e.resource_ids || []).some((id) => id.toLowerCase().includes(needle))
    );
  }

  const filesToRestore = [];
  for (const entry of entries) {
    for (const f of entry.files || []) {
      const localAbs = path.join(backupDir, f.local_path);
      if (!fs.existsSync(localAbs)) {
        throw new Error(`Missing local backup file: ${localAbs}`);
      }
      const buf = fs.readFileSync(localAbs);
      const actualSha = crypto.createHash('sha256').update(buf).digest('hex');
      if (f.sha256 && actualSha !== f.sha256) {
        throw new Error(`Checksum mismatch on ${localAbs}: expected ${f.sha256}, got ${actualSha}`);
      }
      filesToRestore.push({ key: f.key, buf });
    }
  }

  console.log(`Mode: ${EXECUTE ? 'EXECUTE (restoring to Cloudflare R2)' : 'DRY RUN'}`);
  console.log(`Snapshot: ${backupDir} (created ${manifest.created_at})`);
  console.log(`Bucket: ${bucket}`);
  console.log(`Entries matched: ${entries.length}, Files to restore: ${filesToRestore.length}\n`);

  if (!EXECUTE) {
    console.log('Sample keys that would be restored:');
    for (const f of filesToRestore.slice(0, 10)) {
      console.log(`  ${f.key} (${f.buf.length} bytes)`);
    }
    if (filesToRestore.length > 10) console.log(`  ... and ${filesToRestore.length - 10} more`);
    console.log('\nDry run only -- nothing uploaded. Re-run with --execute to restore R2.');
    return;
  }

  const s3 = getS3Client();
  const limit = pLimit(10);
  let restored = 0;

  await Promise.all(
    filesToRestore.map((f) =>
      limit(async () => {
        await uploadToR2(s3, bucket, f.key, f.buf, 'application/json');
        restored++;
        if (restored % 100 === 0 || restored === filesToRestore.length) {
          console.log(`  Restored ${restored}/${filesToRestore.length} files`);
        }
      })
    )
  );

  console.log(`\nRevert complete! Restored ${restored} files to Cloudflare R2.`);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
