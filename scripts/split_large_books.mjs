import fs from 'node:fs';
import path from 'node:path';
import mammoth from 'mammoth';
import { DOMParser, XMLSerializer } from '@xmldom/xmldom';

const MASTER_DOCS_ROOT = 'K:\\H DRIVE\\Quantum Climb\\CLIENT ASSETS\\VeerNXT\\CONTENT\\MASTER DOCUMENTS_superseded_20260819';
const SPLIT_BOOKS_DIR = 'K:\\H DRIVE\\Quantum Climb\\CLIENT ASSETS\\VeerNXT\\CONTENT\\split_books';

const TARGET_FILES = [
  { relPath: 'Precis/GK-GS/Cluster_014_SSC COMPLETE GK.docx', type: 'SSC' },
  { relPath: 'Precis/GK-GS/Cluster_047_SSC COMPLETE GK.docx', type: 'SSC' },
  { relPath: 'Precis/GK-GS/Cluster_075_SSC COMPLETE GK.docx', type: 'SSC' },
  { relPath: 'Precis/GK-GS/Cluster_079_RRB COMPLETE GK.docx', type: 'RRB' }
];

function generateId() {
  return Math.random().toString(36).substring(2, 9);
}

const serializer = new XMLSerializer();
function getInnerHtml(node) {
  let str = "";
  if (node && node.childNodes) {
    for (let i = 0; i < node.childNodes.length; i++) {
      str += serializer.serializeToString(node.childNodes[i]);
    }
  }
  return str;
}

/**
 * Parses DOCX into semantic blocks with images extracted inline.
 */
async function parseDocxWithImages(docxPath, bookFolder) {
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
      const content = getInnerHtml(element);
      if (prefix.includes('IMPORTANT') || prefix.includes('WARNING')) return { type: 'important', content };
      if (prefix.includes('EXAM TIP') || prefix.includes('TRICK') || prefix.includes('SHORTCUT')) return { type: 'examTip', content };
      if (prefix.includes('DEFINITION') || prefix.includes('CONCEPT')) return { type: 'definition', content };
      if (prefix.includes('EXAMPLE') || prefix.includes('FOR INSTANCE')) return { type: 'example', content };
      if (prefix.includes('NOTE') || prefix.includes('DID YOU KNOW')) return { type: 'callout', content };
    }
    
    const wordCount = text.split(/\s+/).length;
    if (wordCount <= 5 && !text.endsWith('.') && !text.endsWith('?') && !text.endsWith(':') && !text.endsWith(';')) {
      return { type: 'heading', level: 4, content: getInnerHtml(element) };
    }
    return { type: 'paragraph', content: getInnerHtml(element) };
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
      const block = classifyParagraph(el);
      if (block) {
        block.id = generateId();
        currentChapter.blocks.push(block);
      }
    }
    else if (nodeName === 'UL') {
      const items = Array.from(el.getElementsByTagName('li')).map(li => getInnerHtml(li));
      currentChapter.blocks.push({ id: generateId(), type: 'list', items });
    }
    else if (nodeName === 'OL') {
      const items = Array.from(el.getElementsByTagName('li')).map(li => getInnerHtml(li));
      currentChapter.blocks.push({ id: generateId(), type: 'numberedList', items });
    }
    else if (nodeName === 'BLOCKQUOTE') {
      currentChapter.blocks.push({ id: generateId(), type: 'callout', content: getInnerHtml(el) });
    }
    else if (nodeName === 'TABLE') {
      const rows = [];
      const trs = Array.from(el.getElementsByTagName('tr'));
      let isHeader = true;
      for (const tr of trs) {
        const cells = Array.from(tr.childNodes)
          .filter(n => n.nodeName === 'td' || n.nodeName === 'th')
          .map(td => getInnerHtml(td));
        rows.push({ isHeader, cells });
        isHeader = false;
      }
      if (rows.length > 0) {
        currentChapter.blocks.push({ id: generateId(), type: 'table', rows });
      }
    }
  }

  // Filter empty chapters (keep subject headers)
  const hasOtherChapters = book.chapters.some(ch => !ch.title.toLowerCase().includes('introduction'));
  book.chapters = book.chapters.filter(ch => {
    const isIntro = ch.title.toLowerCase().includes('introduction');
    return !isIntro || !hasOtherChapters;
  });
  book.chapters.forEach((ch, idx) => {
    ch.order = idx + 1;
  });

  return { book, extractedImages };
}

/**
 * Splits chapters of SSC COMPLETE GK into 7 subjects.
 */
function splitSSCChapters(chapters) {
  const subjects = {
    Geography: [],
    History: [],
    Polity: [],
    Economics: [],
    Physics: [],
    Chemistry: [],
    Biology: []
  };

  let currentSubject = 'Geography';

  for (const ch of chapters) {
    const title = ch.title.trim().toUpperCase();

    if (title.includes('SSC GEOGRAPHY')) {
      currentSubject = 'Geography';
      continue;
    } else if (title.includes('CHAPTER 1: PREHISTORIC AGE')) {
      currentSubject = 'History';
    } else if (title.includes('INDIAN POLITY')) {
      currentSubject = 'Polity';
      continue;
    } else if (title.includes('SSC ECONOMICS')) {
      currentSubject = 'Economics';
      continue;
    } else if (title.includes('SSC PHYSICS')) {
      currentSubject = 'Physics';
      continue;
    } else if (title.includes('SSC CHEMISTRY')) {
      currentSubject = 'Chemistry';
      continue;
    } else if (title.includes('SSC BIOLOGY')) {
      currentSubject = 'Biology';
      continue;
    }

    subjects[currentSubject].push(ch);
  }

  return subjects;
}

/**
 * Splits chapters of RRB COMPLETE GK into 4 subjects.
 */
function splitRRBChapters(chapters) {
  const subjects = {
    Geography: [],
    Economics: [],
    Polity: [],
    History: []
  };

  let currentSubject = 'Geography';

  for (const ch of chapters) {
    const title = ch.title.trim().toUpperCase();

    if (title.includes('RRB GEOGRAPHY')) {
      currentSubject = 'Geography';
      continue;
    } else if (title.includes('RRB ECONOMICS')) {
      currentSubject = 'Economics';
      continue;
    } else if (title.includes('INDIAN POLITY-RRB') || title.includes('INDIAN POLITY')) {
      currentSubject = 'Polity';
      continue;
    } else if (title.includes('RRB HISTORY')) {
      currentSubject = 'History';
      continue;
    }

    subjects[currentSubject].push(ch);
  }

  return subjects;
}

async function run() {
  console.log("=== VEERNXT BOOK SPLITTING PIPELINE ===");
  fs.mkdirSync(SPLIT_BOOKS_DIR, { recursive: true });

  for (const target of TARGET_FILES) {
    const docxPath = path.join(MASTER_DOCS_ROOT, target.relPath);
    if (!fs.existsSync(docxPath)) {
      console.warn(`[Warning] Missing file: ${docxPath}`);
      continue;
    }

    const baseName = path.basename(docxPath, '.docx');
    console.log(`\nParsing and Ingesting: ${baseName}...`);

    try {
      const { book, extractedImages } = await parseDocxWithImages(docxPath, baseName);
      console.log(`  Extracted ${book.chapters.length} chapters and ${extractedImages.length} images.`);

      let splitGroups = {};
      if (target.type === 'SSC') {
        splitGroups = splitSSCChapters(book.chapters);
      } else {
        splitGroups = splitRRBChapters(book.chapters);
      }

      for (const [subjectName, chList] of Object.entries(splitGroups)) {
        if (chList.length === 0) continue;

        // Clean name, e.g. "Cluster_014_SSC-GK-Geography"
        const isSSC = target.type === 'SSC';
        const displayTitle = isSSC ? `SSC-GK-${subjectName}` : `RRB-GK-${subjectName}`;
        const prefix = baseName.split('_').slice(0, 2).join('_');
        const splitBookFolder = `${prefix}_${displayTitle}`;
        const splitBookPath = path.join(SPLIT_BOOKS_DIR, splitBookFolder);
        console.log(`  Writing split subject: "${displayTitle}" (${chList.length} chapters) -> ${splitBookFolder}`);

        fs.mkdirSync(splitBookPath, { recursive: true });
        const imagesDir = path.join(splitBookPath, 'images');
        fs.mkdirSync(imagesDir, { recursive: true });

        // Find and copy images referenced in these chapters
        const referencedImageIds = new Set();
        const jsonStr = JSON.stringify(chList);
        const matches = [...jsonStr.matchAll(/__IMG_REF__:([a-z0-9]+)/g)];
        for (const m of matches) {
          referencedImageIds.add(m[1]);
        }

        // Copy matching images
        let subjectImageCount = 0;
        for (const img of extractedImages) {
          if (referencedImageIds.has(img.id)) {
            const fileName = `image_${img.id}.${img.extension}`;
            fs.writeFileSync(path.join(imagesDir, fileName), img.buffer);
            subjectImageCount++;
          }
        }

        // Rewrite image references inside JSON
        let updatedJsonStr = jsonStr;
        for (const imgId of referencedImageIds) {
          const imgObj = extractedImages.find(img => img.id === imgId);
          const ext = imgObj ? imgObj.extension : 'png';
          const oldRef = `__IMG_REF__:${imgId}`;
          const newRef = `/books/Precis/${splitBookFolder}/images/image_${imgId}.${ext}`;
          updatedJsonStr = updatedJsonStr.replaceAll(oldRef, newRef);
        }
        const updatedChList = JSON.parse(updatedJsonStr);

        // Renumber orders in the split chapters
        updatedChList.forEach((ch, idx) => {
          ch.order = idx + 1;
        });

        // Write chapters
        const chaptersDir = path.join(splitBookPath, 'chapters');
        fs.mkdirSync(chaptersDir, { recursive: true });
        for (const ch of updatedChList) {
          const chFileName = `chapter-${ch.order}.json`;
          fs.writeFileSync(path.join(chaptersDir, chFileName), JSON.stringify(ch, null, 2), 'utf-8');
        }

        // Write metadata
        const metadata = {
          book_id: generateId(),
          title: displayTitle,
          source_file: target.relPath,
          category: 'Precis',
          chapter_count: updatedChList.length,
          image_count: subjectImageCount,
          chapters: updatedChList.map(ch => ({
            title: ch.title,
            order: ch.order,
            enriched: false, // Will be enriched in next stage
            blocks_count: ch.blocks.length,
            file_name: `chapters/chapter-${ch.order}.json`
          }))
        };
        fs.writeFileSync(path.join(splitBookPath, 'metadata.json'), JSON.stringify(metadata, null, 2), 'utf-8');
      }

    } catch (err) {
      console.error(`  [Error] Failed to process ${baseName}:`, err.message);
    }
  }
  console.log("\n=== SPLITTING COMPLETED SUCCESSFULLY ===");
}

run();
