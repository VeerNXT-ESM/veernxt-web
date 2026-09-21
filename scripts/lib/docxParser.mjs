/**
 * scripts/docxParser.mjs
 *
 * Shared docx -> semantic block model parser, extracted out of
 * scripts/batch_enrich_books.mjs so it can be reused by
 * scripts/repair_chapter_content.mjs without re-running (or duplicating)
 * the Gemini enrichment pipeline -- batch_enrich_books.mjs runs `main()`
 * unconditionally at the bottom of the file, so it can't be imported
 * directly without triggering the whole CLI.
 *
 * Fixes a real content-loss bug that was in this logic previously: every
 * paragraph, table cell, and list item was read via `element.innerHTML`,
 * but @xmldom/xmldom (an XML DOM implementation, not a browser DOM) never
 * implements `innerHTML` -- it silently returns `undefined` rather than
 * throwing, which JSON.stringify then drops (as an object property) or
 * turns into `null` (as an array element). Confirmed live against the
 * actual source .docx files: `.textContent` returns the real text on the
 * exact same elements. Fixed here by walking each element's child nodes
 * and rebuilding an HTML-ish string (serializeInner), which preserves
 * inline formatting (bold/italic/etc.) the way the original innerHTML
 * calls intended, instead of flattening to plain text.
 */
import mammoth from 'mammoth';
import { DOMParser } from '@xmldom/xmldom';

export function generateId() {
  return Math.random().toString(36).substring(2, 9);
}

const ELEMENT_NODE = 1;
const TEXT_NODE = 3;

function escapeHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Reconstructs an element's inner HTML from its child nodes (xmldom has no .innerHTML). */
export function serializeInner(el) {
  let out = '';
  for (const child of Array.from(el.childNodes || [])) {
    if (child.nodeType === TEXT_NODE) {
      out += escapeHtml(child.nodeValue || '');
    } else if (child.nodeType === ELEMENT_NODE) {
      const tag = child.tagName.toLowerCase();
      out += `<${tag}>${serializeInner(child)}</${tag}>`;
    }
  }
  return out;
}

function classifyParagraph(element) {
  const text = element.textContent.replace(/ /g, ' ').trim();
  if (!text) return null;

  const firstChild = element.firstChild;
  if (firstChild && (firstChild.nodeName === 'STRONG' || firstChild.nodeName === 'B')) {
    const prefix = firstChild.textContent.trim().toUpperCase();
    const content = serializeInner(element);

    if (prefix.includes('IMPORTANT') || prefix.includes('WARNING')) return { type: 'important', content };
    if (prefix.includes('EXAM TIP') || prefix.includes('TRICK') || prefix.includes('SHORTCUT')) return { type: 'examTip', content };
    if (prefix.includes('DEFINITION') || prefix.includes('CONCEPT')) return { type: 'definition', content };
    if (prefix.includes('EXAMPLE') || prefix.includes('FOR INSTANCE')) return { type: 'example', content };
    if (prefix.includes('NOTE') || prefix.includes('DID YOU KNOW')) return { type: 'callout', content };
  }

  const wordCount = text.split(/\s+/).length;
  if (wordCount <= 5 && !text.endsWith('.') && !text.endsWith('?') && !text.endsWith(':') && !text.endsWith(';')) {
    return { type: 'heading', level: 4, content: serializeInner(element) };
  }

  return { type: 'paragraph', content: serializeInner(element) };
}

/**
 * Parses a DOCX buffer into the semantic block structure locally in Node.js.
 * Returns { book, imagesDb } -- imagesDb is always empty here (text-only pass).
 * Pass `{ onImage }` to also get `image` blocks (see the opt-in note inside).
 */
export async function parseDocxToSemanticModelNode(buffer, fileName, { onImage } = {}) {
  const options = {
    styleMap: [
      "p[style-name='Heading 1'] => h1:fresh",
      "p[style-name='Heading 2'] => h2:fresh",
      "p[style-name='Heading 3'] => h3:fresh",
      "p[style-name='Title'] => h1:fresh",
      "p[style-name='Subtitle'] => h2:fresh",
      "p[style-name='Quote'] => blockquote:fresh",
      "p[style-name='Intense Quote'] => blockquote:fresh"
    ]
  };
  // Opt-in image support. By default images are dropped (an image-only paragraph
  // has no text, so it never becomes a block) -- existing callers are unchanged.
  // With `onImage(buffer, contentType)` (may be async) returning the final URL,
  // each image becomes an `image` block at its place in the document.
  if (onImage) {
    options.convertImage = mammoth.images.inline(async (element) => {
      const bytes = await element.read();
      return { src: await onImage(bytes, element.contentType) };
    });
  }

  const result = await mammoth.convertToHtml({ buffer }, options);
  const html = result.value;

  const wrappedHtml = `<html><body>${html}</body></html>`;
  const parser = new DOMParser();
  const doc = parser.parseFromString(wrappedHtml, 'text/xml');

  const book = {
    id: generateId(),
    title: fileName.replace(/\.[^/.]+$/, ''),
    description: '',
    coverImage: null,
    chapters: []
  };

  let currentChapter = null;
  const imagesDb = [];
  // The one auto-created "Introduction" chapter that collects whatever sits
  // before the book's first Heading 1 (cover, contents page). Tracked by
  // identity so cleanup below can drop exactly this chapter -- not any real
  // chapter that merely has "introduction" in its title.
  let frontMatterPlaceholder = null;

  const ensureChapter = () => {
    if (!currentChapter) {
      currentChapter = {
        id: generateId(),
        title: 'Introduction',
        order: book.chapters.length + 1,
        blocks: []
      };
      frontMatterPlaceholder = currentChapter;
      book.chapters.push(currentChapter);
    }
  };

  const elements = Array.from(doc.documentElement.getElementsByTagName('body')[0].childNodes);

  for (const el of elements) {
    if (!el.tagName) continue;
    const nodeName = el.tagName.toUpperCase();

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
      } else if (onImage) {
        // A paragraph with no text that holds picture(s): emit them as image blocks.
        for (const img of Array.from(el.getElementsByTagName('img'))) {
          const src = img.getAttribute('src');
          if (src) currentChapter.blocks.push({ id: generateId(), type: 'image', imageId: generateId(), src });
        }
      }
    }
    else if (nodeName === 'UL') {
      const items = Array.from(el.getElementsByTagName('li')).map((li) => serializeInner(li));
      currentChapter.blocks.push({ id: generateId(), type: 'list', items });
    }
    else if (nodeName === 'OL') {
      const items = Array.from(el.getElementsByTagName('li')).map((li) => serializeInner(li));
      currentChapter.blocks.push({ id: generateId(), type: 'numberedList', items });
    }
    else if (nodeName === 'BLOCKQUOTE') {
      currentChapter.blocks.push({ id: generateId(), type: 'callout', content: serializeInner(el) });
    }
    else if (nodeName === 'TABLE') {
      const rows = [];
      const trs = Array.from(el.getElementsByTagName('tr'));
      let isHeader = true;
      for (const tr of trs) {
        const cells = Array.from(tr.childNodes)
          .filter((n) => n.tagName && (n.tagName.toLowerCase() === 'td' || n.tagName.toLowerCase() === 'th'))
          .map((td) => serializeInner(td));
        rows.push({ isHeader, cells });
        isHeader = false;
      }
      if (rows.length > 0) {
        currentChapter.blocks.push({ id: generateId(), type: 'table', rows });
      }
    }
  }

  // Cleanup: drop empty chapters, and drop the auto-created front-matter
  // placeholder if real chapters exist alongside it. This used to drop ANY
  // chapter whose title merely contained "introduction" (batch_enrich_books.mjs's
  // original rule), which silently deleted real content such as "Chapter 1:
  // Introduction to Andhra Pradesh" or a book's "N.1 Introduction" sections.
  const hasOtherChapters = book.chapters.some((ch) => ch !== frontMatterPlaceholder);
  book.chapters = book.chapters.filter((ch) => {
    if (ch.blocks.length === 0) return false;
    return ch !== frontMatterPlaceholder || !hasOtherChapters;
  });
  book.chapters.forEach((ch, idx) => { ch.order = idx + 1; });

  return { book, imagesDb };
}
