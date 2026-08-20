import fs from 'fs';
import { promises as fsPromises } from 'fs';
import path from 'path';
import axios from 'axios';
import * as cheerio from 'cheerio';
import sharp from 'sharp';

const BASE_DIR = path.resolve('../../');
const PRIORITY_JSON_PATH = path.join(BASE_DIR, 'logo_priority_copy.json');
const MANIFEST_PATH = path.join(BASE_DIR, 'exam-logos', 'manifest.json');
const EMBLEMS_DIR = path.join(BASE_DIR, 'exam-logos', 'state-emblems');
const REPORT_PATH = path.join(BASE_DIR, 'logo_sourcing_report.md');
const LOGOS_BASE_DIR = path.join(BASE_DIR, 'exam-logos');

const USER_AGENT = 'VeerNXT-Logo-Sourcer/1.0 (admin@veernxt.com) Node.js Script';

const http = axios.create({
  headers: {
    'User-Agent': USER_AGENT
  },
  timeout: 10000
});

function slugify(text) {
  if (!text) return '';
  return text.toString().toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}

function isGeneric(name) {
  const genericKeywords = [
    'government', 'administration', 'department', 'directorate',
    'ministry', 'secretariat'
  ];
  const lowerName = name.toLowerCase();
  
  // Exclude some bodies that have these words but are usually distinct
  if (lowerName.includes('police') || lowerName.includes('education board') || lowerName.includes('staff selection')) {
      return false; // Err towards distinct
  }

  return genericKeywords.some(kw => lowerName.includes(kw));
}

async function getWikipediaLogo(entityName) {
  try {
    // 1. Search Wikipedia
    const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(entityName)}&utf8=&format=json`;
    const searchRes = await http.get(searchUrl);
    
    if (!searchRes.data.query.search || searchRes.data.query.search.length === 0) {
      return null;
    }
    
    const pageTitle = searchRes.data.query.search[0].title;
    
    // 2. Get page content
    const pageUrl = `https://en.wikipedia.org/wiki/${encodeURIComponent(pageTitle)}`;
    const pageRes = await http.get(pageUrl);
    const $ = cheerio.load(pageRes.data);
    
    // 3. Find image in infobox
    const infoboxImg = $('.infobox img').first();
    if (infoboxImg.length > 0) {
      let imgSrc = infoboxImg.attr('src');
      if (imgSrc.startsWith('//')) imgSrc = 'https:' + imgSrc;
      // Get higher res version if available (change width in thumb url)
      imgSrc = imgSrc.replace(/\/\d+px-/, '/500px-');
      return { url: imgSrc, source: 'Wikipedia' };
    }
    return null;
  } catch (error) {
    console.error(`  - Wikipedia search failed for ${entityName}: ${error.message}`);
    return null;
  }
}

async function getWikidataLogo(entityName) {
    try {
        const searchUrl = `https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encodeURIComponent(entityName)}&language=en&format=json`;
        const searchRes = await http.get(searchUrl);
        if (!searchRes.data.search || searchRes.data.search.length === 0) return null;

        const entityId = searchRes.data.search[0].id;
        const entityUrl = `https://www.wikidata.org/w/api.php?action=wbgetclaims&entity=${entityId}&format=json`;
        const claimsRes = await http.get(entityUrl);
        const claims = claimsRes.data.claims;

        let imageName = null;
        if (claims.P154) { // Logo
            imageName = claims.P154[0].mainsnak.datavalue.value;
        } else if (claims.P41) { // Flag/Seal
            imageName = claims.P41[0].mainsnak.datavalue.value;
        }

        if (imageName) {
            // Reconstruct Wikimedia commons URL
            const filename = imageName.replace(/ /g, '_');
            // Wikimedia commons uses MD5 hash for folder structure, but special:filepath works better
            const imgUrl = `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(filename)}?width=800`;
            return { url: imgUrl, source: 'Wikidata' };
        }
        return null;

    } catch (e) {
        console.error(`  - Wikidata search failed for ${entityName}: ${e.message}`);
        return null;
    }
}


async function getSeeklogo(entityName) {
    try {
        const searchUrl = `https://seeklogo.com/search?q=${encodeURIComponent(entityName)}`;
        const res = await http.get(searchUrl);
        const $ = cheerio.load(res.data);
        const firstResult = $('.logo-item a').first();
        if (firstResult.length > 0) {
            const pageUrl = firstResult.attr('href');
            // Scraping seeklogo download is hard without headless browser.
            // We can just get the thumbnail for now if needed, but it's low res.
            const imgEl = firstResult.find('img');
            let imgUrl = imgEl.attr('src') || imgEl.attr('data-src');
            if (imgUrl) {
                return { url: imgUrl, source: 'seeklogo (low-res)' };
            }
        }
        return null;
    } catch(e) {
        // seeklogo might block requests
        console.error(`  - Seeklogo failed for ${entityName}: ${e.message}`);
        return null;
    }
}


async function downloadAndValidateImage(url) {
    try {
        const response = await http.get(url, { responseType: 'arraybuffer' });
        const buffer = Buffer.from(response.data, 'binary');
        
        // Validation using Sharp
        const metadata = await sharp(buffer).metadata();
        
        return { buffer, format: metadata.format };
    } catch (error) {
        console.error(`  - Download/Validation failed: ${error.message}`);
        return null;
    }
}

async function upscaleLocalLogo(existingPath, outputPath) {
    try {
        const absoluteExistingPath = path.join(LOGOS_BASE_DIR, existingPath);
        if (!await fsPromises.stat(absoluteExistingPath).catch(() => false)) {
            return false;
        }

        const buffer = await fsPromises.readFile(absoluteExistingPath);
        const metadata = await sharp(buffer).metadata();
        
        // Upscale by 4x using lanczos3
        await sharp(buffer)
            .resize({
                width: metadata.width * 4,
                kernel: sharp.kernel.lanczos3
            })
            .png()
            .toFile(outputPath);
        
        return true;
    } catch (e) {
        console.error(`  - Upscale failed: ${e.message}`);
        return false;
    }
}


async function main() {
    console.log("Starting Logo Sourcing...");
    const priorityData = JSON.parse(await fsPromises.readFile(PRIORITY_JSON_PATH, 'utf-8'));
    const manifest = JSON.parse(await fsPromises.readFile(MANIFEST_PATH, 'utf-8'));
    
    // Build map for quick manifest lookup
    const manifestMap = new Map();
    manifest.forEach((item, index) => {
        const key = `${item.level}-${item.state}-${item.conducting_body}`;
        manifestMap.set(key, { item, index });
    });

    const stateEmblems = await fsPromises.readdir(EMBLEMS_DIR);
    
    let report = {
        wikidata: 0,
        wikipedia: 0,
        seeklogo: 0,
        upscale: 0,
        stateEmblemFallback: 0,
        manualReview: 0,
        uncertainList: []
    };

    // Make dirs
    await fsPromises.mkdir(path.join(LOGOS_BASE_DIR, 'central')).catch(()=>{});
    await fsPromises.mkdir(path.join(LOGOS_BASE_DIR, 'state')).catch(()=>{});
    await fsPromises.mkdir(path.join(LOGOS_BASE_DIR, 'ut')).catch(()=>{});

    for (const body of priorityData.needs_work_ranked) {
        console.log(`Processing: ${body.conducting_body} (${body.level} - ${body.state})`);
        const slug = slugify(body.conducting_body);
        let finalPath = null;
        let sourceUsed = null;

        const isGen = isGeneric(body.conducting_body);

        if (isGen) {
            // Find state emblem
            const stateSlug = body.state ? slugify(body.state) : 'india_national';
            const emblemFile = stateEmblems.find(f => f.startsWith(stateSlug));
            if (emblemFile) {
                finalPath = `state-emblems/${emblemFile}`;
                sourceUsed = 'stateEmblemFallback';
                report.stateEmblemFallback++;
                console.log(`  -> Generic: mapped to state emblem ${emblemFile}`);
            }
        }

        if (!finalPath) {
            // Try Wikidata
            let logoInfo = await getWikidataLogo(body.conducting_body);
            if (logoInfo) { sourceUsed = 'wikidata'; report.wikidata++; }

            // Try Wikipedia
            if (!logoInfo) {
                logoInfo = await getWikipediaLogo(body.conducting_body);
                if (logoInfo) { sourceUsed = 'wikipedia'; report.wikipedia++; }
            }

            // Try Seeklogo
            if (!logoInfo) {
                logoInfo = await getSeeklogo(body.conducting_body);
                if (logoInfo) { sourceUsed = 'seeklogo'; report.seeklogo++; }
            }

            if (logoInfo) {
                console.log(`  -> Found via ${logoInfo.source}: ${logoInfo.url}`);
                const imgData = await downloadAndValidateImage(logoInfo.url);
                if (imgData) {
                    const ext = imgData.format === 'svg' ? 'svg' : 'png';
                    const relativePath = `${body.level}/${slug}.${ext}`;
                    const absolutePath = path.join(LOGOS_BASE_DIR, relativePath);
                    
                    if (imgData.format === 'svg') {
                        await fsPromises.writeFile(absolutePath, imgData.buffer);
                    } else {
                        await sharp(imgData.buffer).png().toFile(absolutePath);
                    }
                    finalPath = relativePath;
                } else {
                     console.log(`  -> Invalid image downloaded, fallback needed.`);
                     logoInfo = null; // force fallback
                }
            }

            // Fallback Upscale
            if (!finalPath) {
                const manifestKey = `${body.level}-${body.state}-${body.conducting_body}`;
                const manifestEntry = manifestMap.get(manifestKey);
                if (manifestEntry && manifestEntry.item.logo && !manifestEntry.item.logo.includes('state-emblems')) {
                    const relativePath = `${body.level}/${slug}_upscaled.png`;
                    const absolutePath = path.join(LOGOS_BASE_DIR, relativePath);
                    console.log(`  -> Fallback upscaling existing logo: ${manifestEntry.item.logo}`);
                    const success = await upscaleLocalLogo(manifestEntry.item.logo, absolutePath);
                    if (success) {
                        finalPath = relativePath;
                        sourceUsed = 'upscale';
                        report.upscale++;
                    }
                }
            }
        }

        if (finalPath) {
            // Update manifest
            const manifestKey = `${body.level}-${body.state}-${body.conducting_body}`;
            const manifestEntry = manifestMap.get(manifestKey);
            if (manifestEntry) {
                manifest[manifestEntry.index].logo = finalPath;
            }
        } else {
            console.log(`  -> UNRESOLVED: flagged for manual review.`);
            report.manualReview++;
            report.uncertainList.push(`${body.conducting_body} (${body.level}, ${body.state})`);
        }
        
        // Write manifest periodically to save progress
        await fsPromises.writeFile(MANIFEST_PATH, JSON.stringify(manifest, null, 2));
    }

    // Generate Report
    let reportMd = `# Logo Sourcing Report\n\n`;
    reportMd += `## Resolution Breakdown\n`;
    reportMd += `- **Wikidata**: ${report.wikidata}\n`;
    reportMd += `- **Wikipedia**: ${report.wikipedia}\n`;
    reportMd += `- **Seeklogo**: ${report.seeklogo} (Requires licensing check)\n`;
    reportMd += `- **Upscale (Lanczos3)**: ${report.upscale} (Interim upscale, not AI-upscaled)\n`;
    reportMd += `- **State Emblem Fallback**: ${report.stateEmblemFallback}\n`;
    reportMd += `- **Unresolved (Manual Review)**: ${report.manualReview}\n\n`;
    
    if (report.uncertainList.length > 0) {
        reportMd += `## Flagged for Manual Review\n`;
        report.uncertainList.forEach(item => {
            reportMd += `- ${item}\n`;
        });
    }

    await fsPromises.writeFile(REPORT_PATH, reportMd);
    console.log("Finished sourcing logos.");
}

main().catch(console.error);
