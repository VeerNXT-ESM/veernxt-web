import mammoth from 'mammoth';

// Helper to generate a unique ID
function generateId() {
  return Math.random().toString(36).substring(2, 9);
}

/**
 * Parses a DOCX ArrayBuffer into the VEERNXT Semantic Content Model
 * @param {ArrayBuffer} arrayBuffer - The DOCX file content
 * @param {string} fileName - Original filename
 * @returns {Promise<Object>} The structured book JSON
 */
export async function parseDocxToSemanticModel(arrayBuffer, fileName) {
  // 1. Configure Mammoth to generate clean semantic HTML with base64 images
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
    convertImage: mammoth.images.imgElement(function(image) {
      return image.read("base64").then(function(imageBuffer) {
        return {
          src: "data:" + image.contentType + ";base64," + imageBuffer
        };
      });
    })
  };

  const result = await mammoth.convertToHtml({ arrayBuffer }, options);
  const html = result.value;
  
  // 2. Parse the HTML into a DOM tree
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  // 3. Initialize the VEERNXT Content Model
  const book = {
    id: generateId(),
    title: fileName.replace(/\.[^/.]+$/, ''),
    description: '',
    coverImage: null,
    chapters: []
  };

  let currentChapter = null;
  const imagesDb = []; // Store images independently as requested

  // Helper to ensure we have an active chapter
  const ensureChapter = () => {
    if (!currentChapter) {
      currentChapter = {
        id: generateId(),
        title: 'Introduction',
        order: book.chapters.length + 1,
        blocks: []
      };
      book.chapters.push(currentChapter);
    }
  };

  // Helper to classify paragraphs
  const classifyParagraph = (element) => {
    // Remove non-breaking spaces as well to catch "empty" paragraphs
    const text = element.textContent.replace(/\u00A0/g, ' ').trim();
    if (!text) return null;

    // Check for bold prefixes (e.g. "IMPORTANT:", "NOTE:")
    const firstChild = element.firstChild;
    if (firstChild && (firstChild.nodeName === 'STRONG' || firstChild.nodeName === 'B')) {
      const prefix = firstChild.textContent.trim().toUpperCase();
      const content = element.innerHTML;
      
      if (prefix.includes('IMPORTANT') || prefix.includes('WARNING')) {
        return { type: 'important', content };
      }
      if (prefix.includes('EXAM TIP') || prefix.includes('TRICK') || prefix.includes('SHORTCUT')) {
        return { type: 'examTip', content };
      }
      if (prefix.includes('DEFINITION') || prefix.includes('CONCEPT')) {
        return { type: 'definition', content };
      }
      if (prefix.includes('EXAMPLE') || prefix.includes('FOR INSTANCE')) {
        return { type: 'example', content };
      }
      if (prefix.includes('NOTE') || prefix.includes('DID YOU KNOW')) {
        return { type: 'callout', content };
      }
    }
    
    // Auto-detect subheadings: If a paragraph is very short and doesn't end in punctuation
    const wordCount = text.split(/\s+/).length;
    if (wordCount <= 5 && !text.endsWith('.') && !text.endsWith('?') && !text.endsWith(':') && !text.endsWith(';')) {
      return { type: 'heading', level: 4, content: element.innerHTML };
    }

    return { type: 'paragraph', content: element.innerHTML };
  };

  // 4. Walk the top-level elements and map to blocks
  const elements = Array.from(doc.body.children);
  
  for (const el of elements) {
    const nodeName = el.nodeName;

    // Process Headings
    if (nodeName === 'H1') {
      currentChapter = {
        id: generateId(),
        title: el.textContent.trim() || 'Untitled Chapter',
        order: book.chapters.length + 1,
        blocks: []
      };
      book.chapters.push(currentChapter);
      continue;
    }

    ensureChapter();

    if (nodeName === 'H2') {
      currentChapter.blocks.push({
        id: generateId(),
        type: 'heading',
        level: 2,
        content: el.textContent.trim()
      });
    }
    else if (nodeName === 'H3' || nodeName === 'H4') {
      currentChapter.blocks.push({
        id: generateId(),
        type: 'heading',
        level: 3,
        content: el.textContent.trim()
      });
    }
    else if (nodeName === 'P') {
      // Check if it's purely an image
      const imgs = el.getElementsByTagName('img');
      if (imgs.length > 0 && el.textContent.trim() === '') {
        for (const img of Array.from(imgs)) {
          const imgId = generateId();
          imagesDb.push({
            id: imgId,
            type: 'image',
            src: img.src,
            alt: img.alt || '',
            caption: ''
          });
          currentChapter.blocks.push({
            id: generateId(),
            type: 'image',
            imageId: imgId,
            src: img.src // Store direct src for now in sandbox
          });
        }
      } else {
        const block = classifyParagraph(el);
        if (block) {
          block.id = generateId();
          currentChapter.blocks.push(block);
        }
      }
    }
    else if (nodeName === 'UL') {
      const items = Array.from(el.children).map(li => li.innerHTML);
      currentChapter.blocks.push({
        id: generateId(),
        type: 'list',
        items
      });
    }
    else if (nodeName === 'OL') {
      const items = Array.from(el.children).map(li => li.innerHTML);
      currentChapter.blocks.push({
        id: generateId(),
        type: 'numberedList',
        items
      });
    }
    else if (nodeName === 'BLOCKQUOTE') {
      currentChapter.blocks.push({
        id: generateId(),
        type: 'callout',
        content: el.innerHTML
      });
    }
    else if (nodeName === 'TABLE') {
      // Convert HTML table back to a simple nested array structure
      const rows = [];
      const trs = Array.from(el.getElementsByTagName('tr'));
      
      let isHeader = true; // First row is header by default
      for (const tr of trs) {
        const cells = Array.from(tr.children).map(td => td.innerHTML);
        rows.push({
          isHeader,
          cells
        });
        isHeader = false; 
      }

      if (rows.length > 0) {
        currentChapter.blocks.push({
          id: generateId(),
          type: 'table',
          rows
        });
      }
    }
  }

  // Cleanup empty chapters and completely strip the Introduction chapter
  book.chapters = book.chapters.filter(ch => ch.blocks.length > 0 && !ch.title.toLowerCase().includes('introduction'));

  // Re-order remaining chapters starting from 1
  book.chapters.forEach((ch, idx) => {
    ch.order = idx + 1;
  });

  return { book, imagesDb, rawHtml: html };
}
