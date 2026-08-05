import JSZip from 'jszip';

/**
 * Content Engine V2 - JS Processor
 * Converts a DOCX file into structured JSON chapters, extracted WebP/PNG images,
 * and standard metadata matching content-engine-v2 format.
 */

// Generate simple hash for unique resource ID
function generateSimpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  const hex = Math.abs(hash).toString(16).padStart(8, '0');
  return hex;
}

function generateResourceId(filename, examName, category, subject) {
  const timestamp = Date.now();
  const seed = `${examName}_${category}_${subject}_${filename}_${timestamp}_${Math.random()}`;
  const h1 = generateSimpleHash(seed);
  const h2 = generateSimpleHash(seed + '_2');
  const h3 = generateSimpleHash(seed + '_3');
  const h4 = generateSimpleHash(seed + '_4');
  
  // Return UUID format: 8-4-4-4-12
  return `${h1.slice(0, 8)}-${h2.slice(0, 4)}-4${h3.slice(0, 3)}-a${h4.slice(0, 3)}-${h1}${h2.slice(0, 4)}`;
}

/**
 * Parse relationship IDs from word/_rels/document.xml.rels
 */
function parseRelationships(relsXmlText) {
  const rels = {};
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(relsXmlText, 'text/xml');
  const relElements = xmlDoc.getElementsByTagName('Relationship');

  for (let i = 0; i < relElements.length; i++) {
    const id = relElements[i].getAttribute('Id');
    const target = relElements[i].getAttribute('Target');
    const type = relElements[i].getAttribute('Type');
    if (id && target) {
      let cleanTarget = target.startsWith('/') ? target.substring(1) : target;
      if (cleanTarget.startsWith('word/')) {
        cleanTarget = cleanTarget.substring(5);
      }
      rels[id] = { target: cleanTarget, type };
    }
  }
  return rels;
}

/**
 * Convert Image Blob to WebP via Canvas
 */
async function convertToWebP(blob, quality = 0.85) {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(blob);
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      canvas.toBlob((webpBlob) => {
        URL.revokeObjectURL(url);
        resolve(webpBlob || blob);
      }, 'image/webp', quality);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(blob);
    };
    img.src = url;
  });
}

/**
 * Create a portrait thumbnail PNG from cover image blob
 */
async function makeThumbnail(blob, width = 400, height = 566) {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(blob);
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      
      // White background
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, width, height);

      // Fit aspect ratio
      const scale = Math.min(width / img.width, height / img.height);
      const w = img.width * scale;
      const h = img.height * scale;
      const x = (width - w) / 2;
      const y = (height - h) / 2;

      ctx.drawImage(img, x, y, w, h);
      canvas.toBlob((thumbBlob) => {
        URL.revokeObjectURL(url);
        resolve(thumbBlob);
      }, 'image/png');
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    img.src = url;
  });
}

/**
 * Main DOCX Processor function
 */
export async function processDocxFile(file, options = {}) {
  const {
    examName = 'General Exam',
    category = 'Guide',
    subject = 'General',
    conductingBody = '',
    websiteUrl = '',
  } = options;

  const zip = new JSZip();
  const zipContent = await zip.loadAsync(file);

  // 1. Read rels
  let rels = {};
  const relsFile = zipContent.file('word/_rels/document.xml.rels');
  if (relsFile) {
    const relsText = await relsFile.async('text');
    rels = parseRelationships(relsText);
  }

  // 2. Read document.xml
  const docFile = zipContent.file('word/document.xml');
  if (!docFile) {
    throw new Error('Invalid .docx file: word/document.xml missing.');
  }
  const docXmlText = await docFile.async('text');
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(docXmlText, 'text/xml');

  // 3. Process images and extract media files from zip
  const extractedImages = {}; 
  const imageRIdMap = {};     
  let imageCounter = 0;
  let coverBlob = null;

  const blips = Array.from(xmlDoc.getElementsByTagNameNS('*', 'blip'));
  const imagedatas = Array.from(xmlDoc.getElementsByTagNameNS('*', 'imagedata'));

  const imageElements = [...blips, ...imagedatas];
  for (const el of imageElements) {
    const rId = el.getAttribute('r:embed') || el.getAttribute('r:id') || el.getAttribute('id');
    if (rId && rels[rId] && !imageRIdMap[rId]) {
      const relPath = 'word/' + rels[rId].target;
      const mediaZipFile = zipContent.file(relPath);
      if (mediaZipFile) {
        imageCounter++;
        const rawBlob = await mediaZipFile.async('blob');
        if (!coverBlob) {
          coverBlob = rawBlob;
        }

        const webpBlob = await convertToWebP(rawBlob);
        const webpFileName = `fig-${imageCounter}-${generateSimpleHash(rId)}.webp`;
        extractedImages[`images/${webpFileName}`] = webpBlob;
        imageRIdMap[rId] = webpFileName;
      }
    }
  }

  // Save cover image if present
  if (coverBlob) {
    const coverWebp = await convertToWebP(coverBlob);
    extractedImages['images/cover.webp'] = coverWebp;
  }

  // 4. Generate Thumbnail (custom theme with caption, or extracted cover image)
  let thumbnailBlob = options.customThumbnailBlob || null;
  if (!thumbnailBlob && coverBlob) {
    thumbnailBlob = await makeThumbnail(coverBlob);
  }

  // 5. Parse paragraphs into chapters
  const paragraphs = Array.from(xmlDoc.getElementsByTagNameNS('*', 'p'));
  const chapters = [];
  let currentChapter = {
    title: 'Introduction',
    order: 1,
    body_html: '',
    images: []
  };
  let htmlParts = [];

  for (const para of paragraphs) {
    let pStyle = '';
    const styleEl = para.getElementsByTagNameNS('*', 'pStyle')[0];
    if (styleEl) {
      pStyle = (styleEl.getAttribute('w:val') || styleEl.getAttribute('val') || '').toLowerCase();
    }

    const isHeading1 = pStyle.includes('heading1') || pStyle.includes('heading 1') || pStyle === 'title';
    const isHeading2 = pStyle.includes('heading2') || pStyle.includes('heading 2');
    const isHeading3 = pStyle.includes('heading3') || pStyle.includes('heading 3');

    const runs = Array.from(para.getElementsByTagNameNS('*', 'r'));
    let paraHtmlParts = [];

    for (const run of runs) {
      const isBold = run.getElementsByTagNameNS('*', 'b').length > 0;
      const isItalic = run.getElementsByTagNameNS('*', 'i').length > 0;

      const tEls = Array.from(run.getElementsByTagNameNS('*', 't'));
      let textContent = tEls.map(t => t.textContent).join('');

      const runBlips = Array.from(run.getElementsByTagNameNS('*', 'blip'));
      const runImagedatas = Array.from(run.getElementsByTagNameNS('*', 'imagedata'));
      for (const imgEl of [...runBlips, ...runImagedatas]) {
        const rId = imgEl.getAttribute('r:embed') || imgEl.getAttribute('r:id') || imgEl.getAttribute('id');
        if (rId && imageRIdMap[rId]) {
          const webpName = imageRIdMap[rId];
          paraHtmlParts.push(`<img src="images/${webpName}" alt="figure"/>`);
        }
      }

      if (textContent) {
        textContent = textContent.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
        if (isBold && isItalic) {
          paraHtmlParts.push(`<strong><em>${textContent}</em></strong>`);
        } else if (isBold) {
          paraHtmlParts.push(`<strong>${textContent}</strong>`);
        } else if (isItalic) {
          paraHtmlParts.push(`<em>${textContent}</em>`);
        } else {
          paraHtmlParts.push(textContent);
        }
      }
    }

    const paraInner = paraHtmlParts.join('').trim();
    if (!paraInner) continue;

    const rawText = para.textContent ? para.textContent.trim() : '';

    if (isHeading1 && rawText) {
      if (htmlParts.length > 0) {
        currentChapter.body_html = htmlParts.join('\n');
        const imgs = Array.from(currentChapter.body_html.matchAll(/src="([^"]+\.webp)"/g)).map(m => m[1]);
        currentChapter.images = Array.from(new Set(imgs));
        chapters.push(currentChapter);
      }

      currentChapter = {
        title: rawText,
        order: chapters.length + 1,
        body_html: '',
        images: []
      };
      htmlParts = [`<h1>${paraInner}</h1>`];
    } else {
      if (isHeading2) {
        htmlParts.push(`<h2>${paraInner}</h2>`);
      } else if (isHeading3) {
        htmlParts.push(`<h3>${paraInner}</h3>`);
      } else {
        htmlParts.push(`<p>${paraInner}</p>`);
      }
    }
  }

  if (htmlParts.length > 0) {
    currentChapter.body_html = htmlParts.join('\n');
    const imgs = Array.from(currentChapter.body_html.matchAll(/src="([^"]+\.webp)"/g)).map(m => m[1]);
    currentChapter.images = Array.from(new Set(imgs));
    chapters.push(currentChapter);
  }

  if (chapters.length === 0) {
    chapters.push({
      title: 'Content',
      order: 1,
      body_html: '<p>Document content parsed.</p>',
      images: []
    });
  }

  chapters.forEach((ch, idx) => {
    ch.order = idx + 1;
  });

  const resourceId = generateResourceId(file.name, examName, category, subject);
  const docTitle = file.name.replace(/\.[^/.]+$/, '');

  const metadata = {
    resource_id: resourceId,
    title: docTitle,
    exam_name: examName,
    subject: subject,
    category: category,
    conducting_body: conductingBody,
    drive_path: options.drivePath || '',
    website_url: websiteUrl,
    source_file: file.name,
    file_hash: generateSimpleHash(file.name + file.size),
    chapter_count: chapters.length,
    is_freemium: category.toLowerCase() === 'intro',
    is_locked: category.toLowerCase() !== 'intro',
    created_at: new Date().toISOString()
  };

  // Construct R2 key prefix matching the drive folder path under structured_resources
  const cleanDrivePath = (options.drivePath || '')
    .split('/')
    .map(s => s.trim())
    .filter(Boolean)
    .join('/');
  
  const r2Prefix = cleanDrivePath 
    ? `structured_resources/${cleanDrivePath}/${resourceId}` 
    : `structured_resources/${resourceId}`;

  const r2Files = [];

  const metadataJsonStr = JSON.stringify(metadata, null, 2);
  r2Files.push({
    key: `${r2Prefix}/metadata.json`,
    body: new Blob([metadataJsonStr], { type: 'application/json' }),
    contentType: 'application/json'
  });

  if (thumbnailBlob) {
    r2Files.push({
      key: `${r2Prefix}/thumbnail.png`,
      body: thumbnailBlob,
      contentType: 'image/png'
    });
  }

  chapters.forEach((ch) => {
    const chJsonStr = JSON.stringify(ch, null, 2);
    r2Files.push({
      key: `${r2Prefix}/chapters/chapter-${ch.order}.json`,
      body: new Blob([chJsonStr], { type: 'application/json' }),
      contentType: 'application/json'
    });
  });

  for (const [imgPath, imgBlob] of Object.entries(extractedImages)) {
    const mimeType = imgPath.endsWith('.webp') ? 'image/webp' : 'image/png';
    r2Files.push({
      key: `${r2Prefix}/${imgPath}`,
      body: imgBlob,
      contentType: mimeType
    });
  }

  return {
    resourceId,
    r2Prefix,
    metadata,
    chapters,
    r2Files,
    hasThumbnail: !!thumbnailBlob,
    imageCount: Object.keys(extractedImages).length
  };
}

/**
 * Dynamically renders gold caption text over a selected Royal Thumbnail Theme PNG.
 */
export async function renderCustomThumbnailCanvas(themePath, captionText, width = 400, height = 566) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');

      // 1. Draw base theme background
      ctx.drawImage(img, 0, 0, width, height);

      // 2. Draw gold caption below VeerNXT logo text if provided
      if (captionText && captionText.trim()) {
        const lines = captionText.trim().split('\n');
        const maxLen = Math.max(...lines.map(l => l.length));

        // Proportional font sizing relative to canvas width & max string length
        const baseFactor = width / 400;
        const fontSize = Math.max(Math.floor(10 * baseFactor), Math.min(Math.floor(18 * baseFactor), Math.floor((220 * baseFactor) / (maxLen || 1))));
        ctx.font = `bold ${fontSize}px "Georgia", "Times New Roman", serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const lineHeight = fontSize * 1.35;
        const totalHeight = lines.length * lineHeight;

        // Position text in open space below VeerNXT logo (60.5% to 72.5% of total height)
        const boxStart = height * 0.605;
        const boxEnd = height * 0.725;
        const boxHeight = boxEnd - boxStart;
        let currentY = boxStart + ((boxHeight - totalHeight) / 2) + (lineHeight / 2);

        lines.forEach((line) => {
          const textLine = line.trim().toUpperCase();

          // Dark drop shadow offset for contrast
          ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
          ctx.fillText(textLine, (width / 2) + (1.5 * baseFactor), currentY + (1.5 * baseFactor));

          // Rich Gold Gradient text
          const goldGradient = ctx.createLinearGradient(0, currentY - fontSize, 0, currentY + fontSize);
          goldGradient.addColorStop(0, '#FFF5C0');
          goldGradient.addColorStop(0.3, '#F3D274');
          goldGradient.addColorStop(0.7, '#D4AF37');
          goldGradient.addColorStop(1, '#AA7C11');

          ctx.fillStyle = goldGradient;
          ctx.fillText(textLine, width / 2, currentY);

          currentY += lineHeight;
        });
      }

      canvas.toBlob((blob) => {
        resolve(blob);
      }, 'image/png');
    };
    img.onerror = (err) => reject(err);
    img.src = themePath;
  });
}
