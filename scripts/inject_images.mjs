import fs from 'node:fs';
import path from 'node:path';
import mammoth from 'mammoth';
import { DOMParser } from '@xmldom/xmldom';

const MASTER_DOCS_ROOT = 'K:\\H DRIVE\\Quantum Climb\\CLIENT ASSETS\\VeerNXT\\CONTENT\\MASTER DOCUMENTS_superseded_20260819';
const ENRICHED_ROOT = 'K:\\H DRIVE\\Quantum Climb\\CLIENT ASSETS\\VeerNXT\\CONTENT\\FINAL_CONTENT_ENRICHED';
const WEB_BOOKS_ROOT = path.resolve(process.cwd(), 'public', 'books');

function generateId() {
  return Math.random().toString(36).substring(2, 9);
}

// Global lookup map of all DOCX files in MASTER_DOCS_ROOT
const docxFileMap = new Map();
function scanMasterDocs(dir) {
  if (!fs.existsSync(dir)) return;
  const items = fs.readdirSync(dir);
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      scanMasterDocs(fullPath);
    } else if (item.toLowerCase().endsWith('.docx')) {
      docxFileMap.set(item.toLowerCase(), fullPath);
    }
  }
}

/**
 * Parses DOCX into semantic blocks with images extracted inline.
 */
async function parseDocxWithImages(docxPath, bookType, bookFolder) {
  const extractedImages = [];
  
  const options = {
    styleMap: [
      "p[style-name='Heading 1'] => h1:fresh",
      "p[style-name='Heading 2'] => h2:fresh",
      "p[style-name='Heading 3'] => h3:fresh",
      "p[style-name='Title'] => h1:fresh",
      "p[style-name='Subtitle'] => h2:fresh",
      "p[style-name='Quote'] => blockquote:fresh",
      "p[style-name='Intense Quote'] => blockquote:fresh"
    ],
    convertImage: mammoth.images.inline((element) => {
      return element.read().then((imageBuffer) => {
        const imgId = generateId();
        const extension = element.contentType.split('/')[1] || 'png';
        extractedImages.push({
          id: imgId,
          buffer: imageBuffer,
          extension
        });
        return {
          src: `__IMG_REF__:${imgId}`
        };
      });
    })
  };

  const buffer = fs.readFileSync(docxPath);
  const result = await mammoth.convertToHtml({ buffer }, options);
  const html = result.value;
  const wrappedHtml = `<html><body>${html}</body></html>`;
  
  const parser = new DOMParser();
  const doc = parser.parseFromString(wrappedHtml, 'text/xml');

  const book = {
    title: path.basename(docxPath, '.docx'),
    chapters: []
  };

  let currentChapter = null;
  const ensureChapter = () => {
    if (!currentChapter) {
      currentChapter = {
        title: 'Introduction',
        order: book.chapters.length + 1,
        blocks: []
      };
      book.chapters.push(currentChapter);
    }
  };

  const classifyParagraph = (element) => {
    const text = element.textContent.replace(/\u00A0/g, ' ').trim();
    if (!text) return null;

    const firstChild = element.firstChild;
    if (firstChild && (firstChild.nodeName === 'STRONG' || firstChild.nodeName === 'B')) {
      const prefix = firstChild.textContent.trim().toUpperCase();
      const content = element.innerHTML;
      if (prefix.includes('IMPORTANT') || prefix.includes('WARNING')) return { type: 'important', content };
      if (prefix.includes('EXAM TIP') || prefix.includes('TRICK') || prefix.includes('SHORTCUT')) return { type: 'examTip', content };
      if (prefix.includes('DEFINITION') || prefix.includes('CONCEPT')) return { type: 'definition', content };
      if (prefix.includes('EXAMPLE') || prefix.includes('FOR INSTANCE')) return { type: 'example', content };
      if (prefix.includes('NOTE') || prefix.includes('DID YOU KNOW')) return { type: 'callout', content };
    }
    
    const wordCount = text.split(/\s+/).length;
    if (wordCount <= 5 && !text.endsWith('.') && !text.endsWith('?') && !text.endsWith(':') && !text.endsWith(';')) {
      return { type: 'heading', level: 4, content: element.innerHTML };
    }
    return { type: 'paragraph', content: element.innerHTML };
  };

  const getAttributesString = (node) => {
    let str = "";
    if (node.attributes) {
      for (let i = 0; i < node.attributes.length; i++) {
        const attr = node.attributes[i];
        str += ` ${attr.name}="${attr.value}"`;
      }
    }
    return str;
  };

  const parseParagraphToBlocks = (el) => {
    const imgs = el.getElementsByTagName('img');
    if (imgs.length === 0) {
      const block = classifyParagraph(el);
      if (block) {
        block.id = generateId();
        return [block];
      }
      return [];
    }

    const blocks = [];
    let currentTextBuffer = "";

    const flushText = () => {
      if (currentTextBuffer.trim()) {
        const tempEl = doc.createElement('p');
        tempEl.innerHTML = currentTextBuffer;
        const block = classifyParagraph(tempEl);
        if (block) {
          block.id = generateId();
          blocks.push(block);
        }
        currentTextBuffer = "";
      }
    };

    const walk = (node) => {
      if (node.nodeType === 3) { // Text node
        currentTextBuffer += node.nodeValue;
      } else if (node.nodeType === 1) { // Element node
        const name = node.tagName.toUpperCase();
        if (name === 'IMG') {
          const src = node.getAttribute('src');
          if (src && src.startsWith('__IMG_REF__:')) {
            flushText();
            const imgId = src.replace('__IMG_REF__:', '');
            const imgObj = extractedImages.find(img => img.id === imgId);
            const ext = imgObj ? imgObj.extension : 'png';
            blocks.push({
              id: generateId(),
              type: 'image',
              imageId: imgId,
              src: `/books/${bookType}/${bookFolder}/images/image_${imgId}.${ext}`
            });
          }
        } else {
          const outerOpen = `<${node.tagName.toLowerCase()}${getAttributesString(node)}>`;
          const outerClose = `</${node.tagName.toLowerCase()}>`;
          currentTextBuffer += outerOpen;
          for (let i = 0; i < node.childNodes.length; i++) {
            walk(node.childNodes[i]);
          }
          currentTextBuffer += outerClose;
        }
      }
    };

    for (let i = 0; i < el.childNodes.length; i++) {
      walk(el.childNodes[i]);
    }
    flushText();
    return blocks;
  };

  const elements = Array.from(doc.documentElement.getElementsByTagName('body')[0].childNodes);

  for (const el of elements) {
    if (!el.tagName) continue;
    const nodeName = el.tagName.toUpperCase();

    if (nodeName === 'H1') {
      currentChapter = {
        title: el.textContent.trim() || 'Untitled Chapter',
        order: book.chapters.length + 1,
        blocks: []
      };
      book.chapters.push(currentChapter);
      continue;
    }

    ensureChapter();

    if (nodeName === 'H2') {
      currentChapter.blocks.push({ id: generateId(), type: 'heading', level: 2, content: el.textContent.trim() });
    }
    else if (nodeName === 'H3' || nodeName === 'H4') {
      currentChapter.blocks.push({ id: generateId(), type: 'heading', level: 3, content: el.textContent.trim() });
    }
    else if (nodeName === 'P') {
      const blocks = parseParagraphToBlocks(el);
      currentChapter.blocks.push(...blocks);
    }
    else if (nodeName === 'UL') {
      const items = Array.from(el.getElementsByTagName('li')).map(li => li.innerHTML);
      currentChapter.blocks.push({ id: generateId(), type: 'list', items });
    }
    else if (nodeName === 'OL') {
      const items = Array.from(el.getElementsByTagName('li')).map(li => li.innerHTML);
      currentChapter.blocks.push({ id: generateId(), type: 'numberedList', items });
    }
    else if (nodeName === 'BLOCKQUOTE') {
      currentChapter.blocks.push({ id: generateId(), type: 'callout', content: el.innerHTML });
    }
    else if (nodeName === 'TABLE') {
      const rows = [];
      const trs = Array.from(el.getElementsByTagName('tr'));
      let isHeader = true;
      for (const tr of trs) {
        const cells = Array.from(tr.childNodes)
          .filter(n => n.nodeName === 'td' || n.nodeName === 'th')
          .map(td => td.innerHTML);
        rows.push({ isHeader, cells });
        isHeader = false;
      }
      if (rows.length > 0) {
        currentChapter.blocks.push({ id: generateId(), type: 'table', rows });
      }
    }
  }

  // Filter empty chapters
  const hasOtherChapters = book.chapters.some(ch => !ch.title.toLowerCase().includes('introduction'));
  book.chapters = book.chapters.filter(ch => {
    const isIntro = ch.title.toLowerCase().includes('introduction');
    return ch.blocks.length > 0 && (!isIntro || !hasOtherChapters);
  });
  book.chapters.forEach((ch, idx) => {
    ch.order = idx + 1;
  });

  return { book, extractedImages };
}

/**
 * Aligns and injects image blocks into enriched blocks list.
 */
function injectImagesIntoEnrichedBlocks(originalBlocks, enrichedBlocks) {
  const newEnrichedBlocks = enrichedBlocks.filter(b => b.type !== 'image');
  const imagesToInject = [];

  for (let i = 0; i < originalBlocks.length; i++) {
    const block = originalBlocks[i];
    if (block.type === 'image') {
      let anchorBlock = null;
      for (let j = i - 1; j >= 0; j--) {
        if (originalBlocks[j].type !== 'image') {
          anchorBlock = originalBlocks[j];
          break;
        }
      }
      imagesToInject.push({
        imageBlock: block,
        anchorBlock
      });
    }
  }

  for (const item of imagesToInject) {
    const { imageBlock, anchorBlock } = item;
    if (!anchorBlock) {
      // Prepend to start if no anchor
      if (!newEnrichedBlocks.some(b => b.type === 'image' && b.imageId === imageBlock.imageId)) {
        newEnrichedBlocks.unshift(imageBlock);
      }
    } else {
      const cleanText = (str) => {
        if (!str) return '';
        return str
          .replace(/<[^>]+>/g, '') // Strip HTML tags
          .replace(/&nbsp;/g, ' ') // Replace HTML non-breaking spaces
          .replace(/\s+/g, ' ')    // Normalize whitespace
          .trim();
      };

      const anchorIdx = newEnrichedBlocks.findIndex(b => {
        if (b.type !== anchorBlock.type) return false;
        if (['paragraph', 'heading', 'important', 'examTip', 'definition', 'example', 'callout'].includes(b.type)) {
          return cleanText(b.content) === cleanText(anchorBlock.content);
        }
        if (['list', 'numberedList'].includes(b.type)) {
          const cleanBItems = (b.items || []).map(cleanText);
          const cleanAnchorItems = (anchorBlock.items || []).map(cleanText);
          return JSON.stringify(cleanBItems) === JSON.stringify(cleanAnchorItems);
        }
        return false;
      });

      if (anchorIdx !== -1) {
        // Insert right after anchor if not already injected
        if (!newEnrichedBlocks.some(b => b.type === 'image' && b.imageId === imageBlock.imageId)) {
          newEnrichedBlocks.splice(anchorIdx + 1, 0, imageBlock);
        }
      } else {
        // Append at the end if anchor not found
        if (!newEnrichedBlocks.some(b => b.type === 'image' && b.imageId === imageBlock.imageId)) {
          newEnrichedBlocks.push(imageBlock);
        }
      }
    }
  }

  return newEnrichedBlocks;
}

async function run() {
  console.log("=== VEERNXT BOOK IMAGE INJECTION SYSTEM ===");
  console.log("Scanning MASTER DOCUMENTS for original source files...");
  scanMasterDocs(MASTER_DOCS_ROOT);
  console.log(`Indexed ${docxFileMap.size} source docx files.`);

  // We scan public/books/Guide/ and public/books/Precis/ for completed books
  const bookTypes = ['Guide', 'Precis'];
  
  for (const bookType of bookTypes) {
    const typeDir = path.join(WEB_BOOKS_ROOT, bookType);
    if (!fs.existsSync(typeDir)) continue;

    const bookFolders = fs.readdirSync(typeDir);
    for (const folder of bookFolders) {
      const metadataPath = path.join(typeDir, folder, 'metadata.json');
      if (!fs.existsSync(metadataPath)) continue;

      const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
      const sourceFile = metadata.source_file;
      if (!sourceFile) continue;

      const docxPath = docxFileMap.get(sourceFile.toLowerCase());
      if (!docxPath) {
        console.warn(`[Warning] Original file not found for ${sourceFile} in MASTER DOCUMENTS.`);
        continue;
      }

      console.log(`\nProcessing Book: "${metadata.title}" (${bookType})`);
      console.log(`  Source File: ${docxPath}`);

      try {
        // 1. Parse original DOCX and extract image buffers
        const { book: originalBook, extractedImages } = await parseDocxWithImages(docxPath, bookType, folder);
        console.log(`  Extracted ${extractedImages.length} images.`);

        if (extractedImages.length === 0) {
          console.log(`  No images to inject. Skipping.`);
          continue;
        }

        // 2. Save image buffers to both public/books/ and CLIENT ASSETS/
        const webImagesDir = path.join(typeDir, folder, 'images');
        const assetsImagesDir = path.join(ENRICHED_ROOT, bookType, folder, 'images');
        
        fs.mkdirSync(webImagesDir, { recursive: true });
        fs.mkdirSync(assetsImagesDir, { recursive: true });

        for (const img of extractedImages) {
          const fileName = `image_${img.id}.${img.extension}`;
          fs.writeFileSync(path.join(webImagesDir, fileName), img.buffer);
          fs.writeFileSync(path.join(assetsImagesDir, fileName), img.buffer);
        }

        // 3. Align and inject images into JSON chapter files
        let totalBookImages = 0;
        
        for (const chInfo of metadata.chapters) {
          const originalCh = originalBook.chapters.find(c => c.title === chInfo.title || c.order === chInfo.order);
          if (!originalCh) {
            console.warn(`    [Warning] Original chapter not found for: "${chInfo.title}"`);
            continue;
          }

          // Read enriched chapter JSON from public/books
          const webChapterPath = path.join(typeDir, folder, chInfo.file_name);
          const assetsChapterPath = path.join(ENRICHED_ROOT, bookType, folder, chInfo.file_name);

          if (!fs.existsSync(webChapterPath)) continue;
          const chapterData = JSON.parse(fs.readFileSync(webChapterPath, 'utf-8'));

          // Inject images
          const updatedBlocks = injectImagesIntoEnrichedBlocks(originalCh.blocks, chapterData.blocks);
          
          const chImagesCount = updatedBlocks.filter(b => b.type === 'image').length;
          totalBookImages += chImagesCount;

          chapterData.blocks = updatedBlocks;
          
          // Write updated chapter JSON to both locations
          fs.mkdirSync(path.dirname(assetsChapterPath), { recursive: true });
          fs.writeFileSync(webChapterPath, JSON.stringify(chapterData, null, 2), 'utf-8');
          fs.writeFileSync(assetsChapterPath, JSON.stringify(chapterData, null, 2), 'utf-8');
        }

        // 4. Update metadata.json image counts
        metadata.image_count = totalBookImages;
        
        const assetsMetadataPath = path.join(ENRICHED_ROOT, bookType, folder, 'metadata.json');
        fs.mkdirSync(path.dirname(assetsMetadataPath), { recursive: true });
        fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2), 'utf-8');
        fs.writeFileSync(assetsMetadataPath, JSON.stringify(metadata, null, 2), 'utf-8');

        console.log(`  [Success] Injected ${totalBookImages} images successfully.`);

      } catch (err) {
        console.error(`  [Error] Failed to process ${sourceFile}:`, err.message);
      }
    }
  }
  console.log("\n=== IMAGE INJECTION COMPLETED SUCCESSFULLY ===");
}

run();
