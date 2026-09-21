import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Config
const APP_PUBLIC_BOOKS_DIR = path.resolve(process.cwd(), 'public', 'books', 'Precis');
const ENRICHED_ASSETS_DIR = 'K:\\H DRIVE\\Quantum Climb\\CLIENT ASSETS\\VeerNXT\\CONTENT\\FINAL_CONTENT_ENRICHED\\Precis';

const SUBJECTS = ['Geography', 'History', 'Polity', 'Economics', 'Physics', 'Chemistry', 'Biology'];
const SOURCE_CLUSTER = 'Cluster_014';
const DEST_CLUSTERS = ['Cluster_047', 'Cluster_075'];

function copyDirSync(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function run() {
  console.log("=== VEERNXT BOOK REPLICATION & REBRANDING TOOL ===");

  for (const subject of SUBJECTS) {
    const sourceDirName = `${SOURCE_CLUSTER}_SSC-GK-${subject}`;
    const sourcePath = path.join(APP_PUBLIC_BOOKS_DIR, sourceDirName);

    if (!fs.existsSync(sourcePath)) {
      console.log(`[Warning] Source folder not found: ${sourcePath}. Skipping.`);
      continue;
    }

    console.log(`\nReplicating Subject: "${subject}"...`);

    for (const destCluster of DEST_CLUSTERS) {
      const destDirName = `${destCluster}_SSC-GK-${subject}`;
      
      // Target paths
      const destAppPath = path.join(APP_PUBLIC_BOOKS_DIR, destDirName);
      const destEnrichedPath = path.join(ENRICHED_ASSETS_DIR, destDirName);

      console.log(`  -> Copying to public/books/Precis/${destDirName}...`);
      copyDirSync(sourcePath, destAppPath);

      console.log(`  -> Copying to FINAL_CONTENT_ENRICHED/Precis/${destDirName}...`);
      copyDirSync(sourcePath, destEnrichedPath);

      // Rebrand metadata in APP folder
      const appMetadataPath = path.join(destAppPath, 'metadata.json');
      if (fs.existsSync(appMetadataPath)) {
        const metadata = JSON.parse(fs.readFileSync(appMetadataPath, 'utf-8'));
        metadata.book_id = destDirName;
        metadata.title = `${destCluster}_SSC-GK-${subject}`;
        fs.writeFileSync(appMetadataPath, JSON.stringify(metadata, null, 2), 'utf-8');
        console.log(`    [Metadata updated] book_id set to "${metadata.book_id}"`);
      }

      // Rebrand metadata in ENRICHED folder
      const enrichedMetadataPath = path.join(destEnrichedPath, 'metadata.json');
      if (fs.existsSync(enrichedMetadataPath)) {
        const metadata = JSON.parse(fs.readFileSync(enrichedMetadataPath, 'utf-8'));
        metadata.book_id = destDirName;
        metadata.title = `${destCluster}_SSC-GK-${subject}`;
        fs.writeFileSync(enrichedMetadataPath, JSON.stringify(metadata, null, 2), 'utf-8');
      }
    }
  }

  console.log("\nReplication and rebranding complete!");
}

run();
