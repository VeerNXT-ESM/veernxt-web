import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import mammoth from 'mammoth';

const ASSETS_DIR = path.resolve('../CLIENT ASSETS');
const MANIFEST_PATH = path.resolve('./rewrite_manifest.json');

function hashString(str) {
  return crypto.createHash('sha256').update(str).digest('hex');
}

async function findDocxFiles(dir, fileList = []) {
  if (!fs.existsSync(dir)) return fileList;
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      await findDocxFiles(filePath, fileList);
    } else if (file.endsWith('.docx') && !file.startsWith('~$')) {
      fileList.push(filePath);
    }
  }
  return fileList;
}

async function extractTextFast(filePath) {
  try {
    const result = await mammoth.extractRawText({ path: filePath });
    return result.value.trim();
  } catch (err) {
    console.error(`Failed to extract text from ${filePath}: ${err.message}`);
    return null;
  }
}

async function run() {
  console.log(`Scanning ${ASSETS_DIR} for docx files...`);
  const files = await findDocxFiles(ASSETS_DIR);
  console.log(`Found ${files.length} docx files.`);

  const clusters = {}; // textHash -> array of filePaths
  const manifest = []; // final output

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    process.stdout.write(`\rProcessing ${i + 1}/${files.length} files...`);
    const text = await extractTextFast(file);
    
    if (!text) continue;
    
    // We hash the first 1000 characters to be fast and ignore small trailing variations
    const sample = text.substring(0, 1000);
    const hash = hashString(sample);

    if (!clusters[hash]) {
      clusters[hash] = [];
    }
    clusters[hash].push(file);
  }
  console.log('\nClustering complete.');

  // Build manifest
  for (const hash in clusters) {
    const group = clusters[hash];
    
    // Sort so the shortest path (usually highest level) is the base
    group.sort((a, b) => a.length - b.length);

    // The first file in the cluster is the "canonical" version to proofread
    const baseFile = group[0];
    manifest.push({
      filePath: baseFile,
      mode: 'PROOFREAD',
      clusterHash: hash,
      siblings: group.filter(f => f !== baseFile)
    });

    // The rest need to be rewritten to become unique
    for (let i = 1; i < group.length; i++) {
      manifest.push({
        filePath: group[i],
        mode: 'REWRITE',
        clusterHash: hash,
        siblings: group.filter(f => f !== group[i])
      });
    }
  }

  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));
  console.log(`\nWrote rewrite_manifest.json with ${manifest.length} entries.`);
  
  // Output some stats
  const rewriteCount = manifest.filter(m => m.mode === 'REWRITE').length;
  const proofreadCount = manifest.filter(m => m.mode === 'PROOFREAD').length;
  console.log(`Total PROOFREAD: ${proofreadCount}`);
  console.log(`Total REWRITE: ${rewriteCount}`);
}

run().catch(console.error);
