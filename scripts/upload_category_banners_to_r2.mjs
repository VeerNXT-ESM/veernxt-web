import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import sharp from 'sharp';
import pLimit from 'p-limit';
import JSZip from 'jszip';
import { DOMParser } from '@xmldom/xmldom';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

// Load environment variables from .env
dotenv.config();

const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, R2_PUBLIC_URL } = process.env;

const isDryRun = process.argv.includes('--dry-run');
const isForce = process.argv.includes('--force');

// Parse --input argument if provided
const inputArgIdx = process.argv.indexOf('--input');
const BASE_INPUT_DIR = inputArgIdx !== -1 && process.argv[inputArgIdx + 1]
  ? path.resolve(process.argv[inputArgIdx + 1])
  : '/Users/souvik/Downloads/Category Images';

// Concurrency
const concurrencyArgIdx = process.argv.indexOf('--concurrency');
const CONCURRENCY = concurrencyArgIdx !== -1 && parseInt(process.argv[concurrencyArgIdx + 1], 10)
  ? parseInt(process.argv[concurrencyArgIdx + 1], 10)
  : 6;

if (!isDryRun) {
  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET_NAME) {
    console.error('\n❌ ERROR: Cloudflare R2 credentials missing in .env!');
    console.error('Please verify R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME.\n');
    process.exit(1);
  }
}

const PUBLIC_BASE_URL = (R2_PUBLIC_URL || `https://${R2_BUCKET_NAME}.r2.cloudflarestorage.com`).replace(/\/+$/, '');

const s3 = isDryRun ? null : new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

const MANIFEST_PATH = path.resolve('src/lib/categoryBannersManifest.json');

function slugify(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function cleanRegionName(filename) {
  let name = path.basename(filename, '.xlsx');
  name = name.replace(/_All_Exam_Thumbnails(_Agniveer_Updated|-1|-2|-3)?$/, '');
  name = decodeURIComponent(name).replace(/_/g, ' ').trim();

  // Normalize common variations
  const lower = name.toLowerCase();
  if (lower === 'andaman nicobar' || lower === 'andaman and nicobar') return 'Andaman and Nicobar Islands';
  if (lower === 'arunachal') return 'Arunachal Pradesh';
  if (lower === 'himachal pradesh') return 'Himachal Pradesh';
  if (lower === 'jammu kashmir') return 'Jammu & Kashmir';
  if (lower === 'madhya pradesh') return 'Madhya Pradesh';
  if (lower === 'tamil nadu') return 'Tamil Nadu';
  if (lower === 'uttar pradesh') return 'Uttar Pradesh';
  if (lower === 'west bengal') return 'West Bengal';

  return name;
}

function renderProgressBar(current, total, width = 28) {
  const percent = total > 0 ? (current / total) * 100 : 0;
  const filled = Math.min(width, Math.round((percent / 100) * width));
  const empty = Math.max(0, width - filled);
  const bar = '█'.repeat(filled) + '░'.repeat(empty);
  return `[${bar}] ${percent.toFixed(1).padStart(5, ' ')}% (${current}/${total})`;
}

async function extractCategoriesFromWorkbook(filePath, division, regionName) {
  const fileBuffer = fs.readFileSync(filePath);
  const zip = await JSZip.loadAsync(fileBuffer);

  // 1. Read workbook.xml to find Gallery sheet
  const wbXml = await zip.file('xl/workbook.xml')?.async('text');
  if (!wbXml) return [];
  const wbDoc = new DOMParser().parseFromString(wbXml, 'text/xml');
  const sheetNodes = wbDoc.getElementsByTagName('sheet');

  let gallerySheetId = null;
  let gallerySheetName = null;

  for (let i = 0; i < sheetNodes.length; i++) {
    const sName = sheetNodes[i].getAttribute('name') || '';
    if (sName.toLowerCase().includes('gallery') || sName.toLowerCase().includes('thumb')) {
      gallerySheetId = sheetNodes[i].getAttribute('r:id');
      gallerySheetName = sName;
      break;
    }
  }

  if (!gallerySheetId) {
    // If not explicitly named gallery, for 1-sheet or 2-sheet check sheet 1 or 2
    for (let i = 0; i < sheetNodes.length; i++) {
      gallerySheetId = sheetNodes[i].getAttribute('r:id');
      gallerySheetName = sheetNodes[i].getAttribute('name');
      break;
    }
  }

  if (!gallerySheetId) return [];

  // 2. Resolve worksheet path from workbook.xml.rels
  const wbRelsXml = await zip.file('xl/_rels/workbook.xml.rels')?.async('text');
  if (!wbRelsXml) return [];
  const wbRelsDoc = new DOMParser().parseFromString(wbRelsXml, 'text/xml');
  const relNodes = wbRelsDoc.getElementsByTagName('Relationship');

  let wsPath = null;
  for (let i = 0; i < relNodes.length; i++) {
    if (relNodes[i].getAttribute('Id') === gallerySheetId) {
      const target = relNodes[i].getAttribute('Target').replace(/^\//, '');
      wsPath = target.startsWith('xl/') ? target : `xl/${target}`;
      break;
    }
  }

  if (!wsPath || !zip.file(wsPath)) return [];

  // 3. Resolve drawing path from worksheet rels
  const wsRelsPath = wsPath.replace('worksheets/', 'worksheets/_rels/') + '.rels';
  const wsRelsXml = await zip.file(wsRelsPath)?.async('text');
  if (!wsRelsXml) return [];
  const wsRelsDoc = new DOMParser().parseFromString(wsRelsXml, 'text/xml');
  const wsRelNodes = wsRelsDoc.getElementsByTagName('Relationship');

  let drawingPath = null;
  for (let i = 0; i < wsRelNodes.length; i++) {
    const type = wsRelNodes[i].getAttribute('Type') || '';
    if (type.includes('drawing')) {
      const target = wsRelNodes[i].getAttribute('Target').replace(/^\//, '');
      drawingPath = target.startsWith('xl/drawings/') ? target : `xl/drawings/${path.basename(target)}`;
      break;
    }
  }

  if (!drawingPath || !zip.file(drawingPath)) return [];

  // 4. Drawing relationship map (rId -> media path)
  const drawingRelsPath = drawingPath.replace('drawings/', 'drawings/_rels/') + '.rels';
  const drawingRelsXml = await zip.file(drawingRelsPath)?.async('text');
  const mediaRelMap = {};
  if (drawingRelsXml) {
    const dRelsDoc = new DOMParser().parseFromString(drawingRelsXml, 'text/xml');
    const dRelNodes = dRelsDoc.getElementsByTagName('Relationship');
    for (let i = 0; i < dRelNodes.length; i++) {
      const rId = dRelNodes[i].getAttribute('Id');
      const target = dRelNodes[i].getAttribute('Target').replace(/^\//, '');
      mediaRelMap[rId] = target.startsWith('xl/') ? target : `xl/${target}`;
    }
  }

  // 5. Drawing anchors (row -> media path)
  const drawingXml = await zip.file(drawingPath).async('text');
  const drawingDoc = new DOMParser().parseFromString(drawingXml, 'text/xml');

  const rowToMedia = {};
  const anchors = [
    ...Array.from(drawingDoc.getElementsByTagName('xdr:twoCellAnchor')),
    ...Array.from(drawingDoc.getElementsByTagName('xdr:oneCellAnchor')),
    ...Array.from(drawingDoc.getElementsByTagName('twoCellAnchor')),
    ...Array.from(drawingDoc.getElementsByTagName('oneCellAnchor')),
  ];

  for (const anchor of anchors) {
    const fromNodes = anchor.getElementsByTagName('xdr:from');
    const fromNode = fromNodes.length > 0 ? fromNodes[0] : anchor.getElementsByTagName('from')[0];
    if (!fromNode) continue;

    const rowNodes = fromNode.getElementsByTagName('xdr:row');
    const rowNode = rowNodes.length > 0 ? rowNodes[0] : fromNode.getElementsByTagName('row')[0];
    if (!rowNode) continue;
    const rowNum = parseInt(rowNode.textContent, 10);

    const blips = [
      ...Array.from(anchor.getElementsByTagName('a:blip')),
      ...Array.from(anchor.getElementsByTagName('blip')),
    ];
    if (blips.length === 0) continue;
    const embedId = blips[0].getAttribute('r:embed') || blips[0].getAttribute('embed');
    if (embedId && mediaRelMap[embedId]) {
      rowToMedia[rowNum] = mediaRelMap[embedId];
    }
  }

  // 6. Shared strings
  const strings = [];
  const sstringsXml = await zip.file('xl/sharedStrings.xml')?.async('text');
  if (sstringsXml) {
    const sDoc = new DOMParser().parseFromString(sstringsXml, 'text/xml');
    const siNodes = sDoc.getElementsByTagName('si');
    for (let i = 0; i < siNodes.length; i++) {
      strings.push(siNodes[i].textContent || '');
    }
  }

  // 7. Parse Worksheet rows
  const wsXml = await zip.file(wsPath).async('text');
  const wsDoc = new DOMParser().parseFromString(wsXml, 'text/xml');
  const rowElements = wsDoc.getElementsByTagName('row');

  const results = [];

  for (let i = 0; i < rowElements.length; i++) {
    const rEl = rowElements[i];
    const rNum = parseInt(rEl.getAttribute('r'), 10);

    const cellElements = rEl.getElementsByTagName('c');
    let categoryName = '';

    for (let j = 0; j < cellElements.length; j++) {
      const cEl = cellElements[j];
      const cellRef = cEl.getAttribute('r') || '';
      const colLetter = cellRef.replace(/[0-9]/g, '');

      // Category is typically in column B
      if (colLetter === 'B') {
        const valEl = cEl.getElementsByTagName('v')[0];
        const isEl = cEl.getElementsByTagName('t')[0];
        const type = cEl.getAttribute('t');

        if (isEl) {
          categoryName = isEl.textContent.trim();
        } else if (valEl) {
          const valText = valEl.textContent.trim();
          if (type === 's') {
            const idx = parseInt(valText, 10);
            categoryName = (strings[idx] || '').trim();
          } else {
            categoryName = valText;
          }
        }
      }
    }

    if (!categoryName) continue;

    // Filter out header titles
    const catLower = categoryName.toLowerCase();
    if (
      catLower === 'category' ||
      catLower === 'exam category' ||
      catLower === 'category of exam' ||
      catLower === 'category / institutional theme' ||
      catLower.startsWith('original exam') ||
      catLower.includes('thumbnail gallery') ||
      catLower.includes('exam category thumbnail')
    ) {
      continue;
    }

    // Match row index (0-indexed anchor row usually equals rNum - 1)
    const mediaTarget = rowToMedia[rNum - 1] || rowToMedia[rNum] || rowToMedia[rNum - 2];
    if (!mediaTarget) continue;

    const mediaZipFile = zip.file(mediaTarget);
    if (!mediaZipFile) continue;

    const imageBuffer = await mediaZipFile.async('nodebuffer');

    // Key generation
    const catSlug = slugify(categoryName);
    let r2Key = '';
    if (division === 'central') {
      r2Key = `category-banners/central/${catSlug}.webp`;
    } else if (division === 'state') {
      const stateSlug = slugify(regionName);
      r2Key = `category-banners/states/${stateSlug}/${catSlug}.webp`;
    } else {
      const utSlug = slugify(regionName);
      r2Key = `category-banners/uts/${utSlug}/${catSlug}.webp`;
    }

    results.push({
      division,
      regionName: regionName || 'Central',
      categoryName,
      catSlug,
      r2Key,
      imageBuffer,
      originalExt: path.extname(mediaTarget).toLowerCase(),
    });
  }

  return results;
}

async function main() {
  console.log('\n=============================================================');
  console.log('  🚀 VeerNXT Category Banners -> Cloudflare R2 Pipeline');
  console.log('=============================================================');
  console.log(`📁 Input Directory: ${BASE_INPUT_DIR}`);
  console.log(`⚡ Mode:             ${isDryRun ? 'DRY RUN (No uploads)' : 'LIVE UPLOAD to R2'}`);
  console.log(`🔄 Force Overwrite: ${isForce ? 'YES' : 'NO (skips already uploaded)'}`);
  console.log(`🧵 Concurrency:     ${CONCURRENCY}`);
  console.log('=============================================================\n');

  if (!fs.existsSync(BASE_INPUT_DIR)) {
    console.error(`❌ Input directory not found: ${BASE_INPUT_DIR}`);
    process.exit(1);
  }

  // Load existing manifest if present
  let manifest = { central: {}, states: {}, uts: {}, flat: {} };
  if (fs.existsSync(MANIFEST_PATH)) {
    try {
      manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf-8'));
      if (!manifest.flat) manifest.flat = {};
      if (!manifest.central) manifest.central = {};
      if (!manifest.states) manifest.states = {};
      if (!manifest.uts) manifest.uts = {};
    } catch {
      // fresh manifest
    }
  }

  // 1. Gather all workbooks
  const workbooks = [];

  // Central
  const centralFile = path.join(BASE_INPUT_DIR, 'Central_Exams_21_Institution_Thumbnails.xlsx');
  if (fs.existsSync(centralFile)) {
    workbooks.push({ path: centralFile, division: 'central', region: 'Central' });
  }

  // States
  const stateDir = path.join(BASE_INPUT_DIR, 'Image List State');
  if (fs.existsSync(stateDir)) {
    const stateFiles = fs.readdirSync(stateDir).filter(f => f.endsWith('.xlsx'));
    // Deduplicate: If Arunachal-3 exists, skip Arunachal-2
    const seenStates = new Set();
    const sortedStateFiles = [...stateFiles].sort().reverse(); // picks -3 before -2
    for (const f of sortedStateFiles) {
      const rName = cleanRegionName(f);
      if (seenStates.has(rName)) continue;
      seenStates.add(rName);
      workbooks.push({ path: path.join(stateDir, f), division: 'state', region: rName });
    }
  }

  // UTs
  const utDir = path.join(BASE_INPUT_DIR, 'Image List UT');
  if (fs.existsSync(utDir)) {
    const utFiles = fs.readdirSync(utDir).filter(f => f.endsWith('.xlsx'));
    // Deduplicate: picks -1 before non-dash
    const seenUts = new Set();
    const sortedUtFiles = [...utFiles].sort().reverse();
    for (const f of sortedUtFiles) {
      const rName = cleanRegionName(f);
      if (seenUts.has(rName)) continue;
      seenUts.add(rName);
      workbooks.push({ path: path.join(utDir, f), division: 'ut', region: rName });
    }
  }

  console.log(`📋 Found ${workbooks.length} distinct workbooks to process:`);
  console.log(`   • Central: 1`);
  console.log(`   • States:  ${workbooks.filter(w => w.division === 'state').length}`);
  console.log(`   • UTs:     ${workbooks.filter(w => w.division === 'ut').length}\n`);

  console.log('🔍 Scanning workbooks and extracting category thumbnails...');
  const allItems = [];

  for (const wb of workbooks) {
    try {
      const items = await extractCategoriesFromWorkbook(wb.path, wb.division, wb.region);
      allItems.push(...items);
    } catch (err) {
      console.error(`⚠️ Failed to parse ${wb.region} (${path.basename(wb.path)}): ${err.message}`);
    }
  }

  const total = allItems.length;
  console.log(`\n✨ Discovered ${total} category banner images across all regions.\n`);

  if (total === 0) {
    console.log('No category banners found. Please check Excel sheet layouts.');
    return;
  }

  let completedCount = 0;
  let uploadedCount = 0;
  let skippedCount = 0;
  let failedCount = 0;
  const startTime = Date.now();

  const limit = pLimit(CONCURRENCY);

  const tasks = allItems.map(item => {
    return limit(async () => {
      const publicUrl = `${PUBLIC_BASE_URL}/${item.r2Key}`;
      const flatKey = `${item.division.toLowerCase()}::${item.regionName.toLowerCase()}::${item.categoryName.toLowerCase()}`;

      // Check if already in manifest
      const alreadyInManifest = manifest.flat && manifest.flat[flatKey];

      if (alreadyInManifest && !isForce && !isDryRun) {
        skippedCount++;
        completedCount++;
        const prog = renderProgressBar(completedCount, total);
        console.log(`${prog} | ⏩ SKIPPED: ${item.regionName} → "${item.categoryName}"`);
        return;
      }

      if (isDryRun) {
        completedCount++;
        const prog = renderProgressBar(completedCount, total);
        console.log(`${prog} | 🔍 [DRY-RUN]: ${item.regionName} → "${item.categoryName}" -> ${item.r2Key}`);
        return;
      }

      try {
        // Compress to high-quality WebP
        const webpBuffer = await sharp(item.imageBuffer)
          .webp({ quality: 86, effort: 4 })
          .toBuffer();

        // Upload to Cloudflare R2
        await s3.send(
          new PutObjectCommand({
            Bucket: R2_BUCKET_NAME,
            Key: item.r2Key,
            Body: webpBuffer,
            ContentType: 'image/webp',
            CacheControl: 'public, max-age=31536000, immutable',
          })
        );

        // Record in manifest
        const manifestEntry = {
          url: publicUrl,
          name: item.categoryName,
          region: item.regionName,
          division: item.division,
          key: item.r2Key,
          updatedAt: new Date().toISOString(),
        };

        if (item.division === 'central') {
          manifest.central[item.catSlug] = manifestEntry;
        } else if (item.division === 'state') {
          const sSlug = slugify(item.regionName);
          if (!manifest.states[sSlug]) manifest.states[sSlug] = {};
          manifest.states[sSlug][item.catSlug] = manifestEntry;
        } else if (item.division === 'ut') {
          const uSlug = slugify(item.regionName);
          if (!manifest.uts[uSlug]) manifest.uts[uSlug] = {};
          manifest.uts[uSlug][item.catSlug] = manifestEntry;
        }

        manifest.flat[flatKey] = publicUrl;

        uploadedCount++;
        completedCount++;

        const kb = (webpBuffer.length / 1024).toFixed(1);
        const prog = renderProgressBar(completedCount, total);
        console.log(`${prog} | ⚡ UPLOADED: ${item.regionName} → "${item.categoryName}" (${kb} KB)`);
      } catch (err) {
        failedCount++;
        completedCount++;
        const prog = renderProgressBar(completedCount, total);
        console.error(`${prog} | ❌ FAILED: ${item.regionName} → "${item.categoryName}": ${err.message}`);
      }
    });
  });

  await Promise.all(tasks);

  // Write updated manifest
  if (!isDryRun) {
    fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2), 'utf-8');
    console.log(`\n💾 Saved category banner manifest to: ${MANIFEST_PATH}`);
  }

  const durationSec = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log('\n=============================================================');
  console.log('  🎉 PIPELINE SUMMARY');
  console.log('=============================================================');
  console.log(`  • Total Discovered: ${total}`);
  console.log(`  • Uploaded:         ${uploadedCount}`);
  console.log(`  • Skipped:          ${skippedCount}`);
  console.log(`  • Failed:           ${failedCount}`);
  console.log(`  • Time Taken:       ${durationSec}s`);
  console.log('=============================================================\n');
}

main().catch(err => {
  console.error('\n❌ Fatal execution error:', err);
  process.exit(1);
});
