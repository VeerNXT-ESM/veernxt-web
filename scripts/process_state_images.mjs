import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const DOWNLOADS_DIR = '/Users/souvik/Downloads';
const OUTPUT_DIR = path.resolve('public/state_images');
const DIST_DIR = path.resolve('dist/state_images');

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}
if (fs.existsSync('dist') && !fs.existsSync(DIST_DIR)) {
  fs.mkdirSync(DIST_DIR, { recursive: true });
}

export const STATE_IMAGE_DEFINITIONS = [
  // 28 States
  { downloadFile: 'state_andhra_pradesh.png', targetName: 'andhra_pradesh.jpg', state: 'Andhra Pradesh' },
  { downloadFile: 'state_arunachal_pradesh.png', targetName: 'arunachal_pradesh.jpg', state: 'Arunachal Pradesh' },
  { downloadFile: 'state_assam.png', targetName: 'assam.jpg', state: 'Assam' },
  { downloadFile: 'state_bihar.png', targetName: 'bihar.jpg', state: 'Bihar' },
  { downloadFile: 'state_chhattisgarh.png', targetName: 'chhattisgarh.jpg', state: 'Chhattisgarh' },
  { downloadFile: 'state_goa.png', targetName: 'goa.jpg', state: 'Goa' },
  { downloadFile: 'state_gujarat.png', targetName: 'gujarat.jpg', state: 'Gujarat' },
  { downloadFile: 'state_haryana.png', targetName: 'haryana.jpg', state: 'Haryana' },
  { downloadFile: 'state_himachal_pradesh.png', targetName: 'himachal_pradesh.jpg', state: 'Himachal Pradesh' },
  { downloadFile: 'state_jharkhand.png', targetName: 'jharkhand.jpg', state: 'Jharkhand' },
  { downloadFile: 'state_karnataka.png', targetName: 'karnataka.jpg', state: 'Karnataka' },
  { downloadFile: 'state_kerala.png', targetName: 'kerala.jpg', state: 'Kerala' },
  { downloadFile: 'state_madhya_pradesh.png', targetName: 'madhya_pradesh.jpg', state: 'Madhya Pradesh' },
  { downloadFile: 'state_maharashtra.png', targetName: 'maharashtra.jpg', state: 'Maharashtra' },
  { downloadFile: 'state_manipur.png', targetName: 'manipur.jpg', state: 'Manipur' },
  { downloadFile: 'state_meghalaya.png', targetName: 'meghalaya.jpg', state: 'Meghalaya' },
  { downloadFile: 'state_mizoram.png', targetName: 'mizoram.jpg', state: 'Mizoram' },
  { downloadFile: 'state_nagaland.png', targetName: 'nagaland.jpg', state: 'Nagaland' },
  { downloadFile: 'state_odisha.png', targetName: 'odisha.jpg', state: 'Odisha' },
  { downloadFile: 'state_punjab.png', targetName: 'punjab.jpg', state: 'Punjab' },
  { downloadFile: 'state_rajasthan.png', targetName: 'rajasthan.jpg', state: 'Rajasthan' },
  { downloadFile: 'state_sikkim.png', targetName: 'sikkim.jpg', state: 'Sikkim' },
  { downloadFile: 'state_tamil_nadu.png', targetName: 'tamil_nadu.jpg', state: 'Tamil Nadu' },
  { downloadFile: 'state_telangana.png', targetName: 'telangana.jpg', state: 'Telangana' },
  { downloadFile: 'state_tripura.png', targetName: 'tripura.jpg', state: 'Tripura' },
  { downloadFile: 'state_uttar_pradesh.png', targetName: 'uttar_pradesh.jpg', state: 'Uttar Pradesh' },
  { downloadFile: 'state_uttarakhand.png', targetName: 'uttarakhand.jpg', state: 'Uttarakhand' },
  { downloadFile: 'state_west_bengal.png', targetName: 'west_bengal.jpg', state: 'West Bengal' },

  // 8 Union Territories
  { downloadFile: 'state_andaman_and_nicobar.png', targetName: 'andaman_and_nicobar.jpg', state: 'Andaman and Nicobar Islands' },
  { downloadFile: 'state_chandigarh.png', targetName: 'chandigarh.jpg', state: 'Chandigarh' },
  { downloadFile: 'state_daman_and_diu.png', targetName: 'daman_and_diu.jpg', state: 'Dadra & Nagar Haveli and Daman & Diu' },
  { downloadFile: 'state_delhi.png', targetName: 'delhi.jpg', state: 'Delhi' },
  { downloadFile: 'state_jammu_and_kashmir.png', targetName: 'jammu_and_kashmir.jpg', state: 'Jammu & Kashmir' },
  { downloadFile: 'state_ladakh.png', targetName: 'ladakh.jpg', state: 'Ladakh' },
  { downloadFile: 'state_lakshadweep.png', targetName: 'lakshadweep.jpg', state: 'Lakshadweep' },
  { downloadFile: 'state_puducherry.png', targetName: 'puducherry.jpg', state: 'Puducherry' },
];

async function processAll() {
  console.log(`Processing ${STATE_IMAGE_DEFINITIONS.length} state & UT images...`);
  let count = 0;
  let totalBytes = 0;

  for (const def of STATE_IMAGE_DEFINITIONS) {
    const srcPath = path.join(DOWNLOADS_DIR, def.downloadFile);
    const destPath = path.join(OUTPUT_DIR, def.targetName);

    if (!fs.existsSync(srcPath)) {
      console.warn(`WARNING: File not found: ${srcPath}`);
      continue;
    }

    // Resize to 1280x720 at quality 86 with mozjpeg for optimal clarity and size
    await sharp(srcPath)
      .resize(1280, 720, { fit: 'cover' })
      .jpeg({ quality: 86, mozjpeg: true, progressive: true })
      .toFile(destPath);

    if (fs.existsSync(DIST_DIR)) {
      fs.copyFileSync(destPath, path.join(DIST_DIR, def.targetName));
    }

    const stat = fs.statSync(destPath);
    totalBytes += stat.size;
    count++;
    console.log(`[${count}/${STATE_IMAGE_DEFINITIONS.length}] Processed ${def.state} -> ${def.targetName} (${(stat.size / 1024).toFixed(1)} KB)`);
  }

  console.log(`\nSuccessfully processed ${count} images! Total size: ${(totalBytes / (1024 * 1024)).toFixed(2)} MB`);
}

processAll().catch(err => {
  console.error('Processing failed:', err);
  process.exit(1);
});
