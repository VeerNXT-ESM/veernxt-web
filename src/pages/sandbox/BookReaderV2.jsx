import React, { useState, useRef, useCallback } from 'react';
import { Upload, Book, X, Menu, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { parseDocxToSemanticModel } from '../../lib/mammothParser';
import { enrichChapterWithGemini } from '../../lib/geminiEnricher';
import {
  ParagraphBlock,
  HeadingBlock,
  ImageBlock,
  ImportantBlock,
  ExamTipBlock,
  DefinitionBlock,
  ExampleBlock,
  GenericCalloutBlock,
  ListBlock,
  NumberedListBlock,
  TableBlock,
  ChapterHeader,
  KeyFactsBlock,
  PullQuoteBlock,
  ExamAlertBlock,
  ComparisonTableBlock,
  StatStripBlock,
} from '../../components/book/BookBlocks';
import './BookReaderV2.css';

const BlockRenderer = ({ block }) => {
  switch (block.type) {
    case 'heading':        return <HeadingBlock level={block.level} content={block.content} />;
    case 'paragraph':      return <ParagraphBlock content={block.content} />;
    case 'image':          return <ImageBlock src={block.src} alt={block.alt} caption={block.caption} />;
    case 'important':      return <ImportantBlock content={block.content} />;
    case 'examTip':        return <ExamTipBlock content={block.content} />;
    case 'definition':     return <DefinitionBlock content={block.content} />;
    case 'example':        return <ExampleBlock content={block.content} />;
    case 'callout':        return <GenericCalloutBlock content={block.content} />;
    case 'list':           return <ListBlock items={block.items} />;
    case 'numberedList':   return <NumberedListBlock items={block.items} />;
    case 'table':          return <TableBlock rows={block.rows} />;
    // AI-enriched types
    case 'keyFacts':       return <KeyFactsBlock title={block.title} items={block.items} />;
    case 'pullQuote':      return <PullQuoteBlock content={block.content} />;
    case 'examAlert':      return <ExamAlertBlock items={block.items} />;
    case 'comparisonTable':return <ComparisonTableBlock headers={block.headers} rows={block.rows} />;
    case 'statStrip':      return <StatStripBlock stats={block.stats} />;
    default:               return null;
  }
};

export default function BookReaderV2() {
  const [book, setBook] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeChapterIndex, setActiveChapterIndex] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [enrichingChapters, setEnrichingChapters] = useState(new Set());
  const fileInputRef = useRef(null);
  const mainRef = useRef(null);

  const parseBook = async (arrayBuffer, fileName) => {
    const { book: parsedBook } = await parseDocxToSemanticModel(arrayBuffer, fileName);
    setBook(parsedBook);
    setActiveChapterIndex(0);
    // Enrich Chapter 1 immediately on load
    if (parsedBook.chapters.length > 0) {
      enrichChapter(parsedBook, 0);
    }
  };

  const enrichChapter = useCallback(async (currentBook, chapterIndex) => {
    const chapter = currentBook.chapters[chapterIndex];
    if (!chapter || chapter.enriched) return;

    setEnrichingChapters(prev => new Set(prev).add(chapter.id));
    const enriched = await enrichChapterWithGemini(chapter);

    setBook(prev => {
      if (!prev) return prev;
      const newChapters = [...prev.chapters];
      newChapters[chapterIndex] = enriched;
      return { ...prev, chapters: newChapters };
    });

    setEnrichingChapters(prev => {
      const next = new Set(prev);
      next.delete(chapter.id);
      return next;
    });
  }, []);

  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setIsLoading(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      await parseBook(arrayBuffer, file.name);
    } catch (err) {
      console.error(err);
      alert('Failed to parse the DOCX file.');
    } finally { setIsLoading(false); }
  };

  const handleDragOver = (e) => e.preventDefault();
  const handleDrop = async (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file?.name.endsWith('.docx')) return;
    setIsLoading(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      await parseBook(arrayBuffer, file.name);
    } catch (err) { console.error(err); }
    finally { setIsLoading(false); }
  };

  const loadDemoBook = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/test-book.docx');
      const arrayBuffer = await response.arrayBuffer();
      await parseBook(arrayBuffer, 'Cluster_001_SSC COMPLETE GK.docx');
    } catch (err) {
      console.error(err);
      alert('Failed to load demo book.');
    } finally { setIsLoading(false); }
  };

  const navigateTo = (index) => {
    if (!book || index < 0 || index >= book.chapters.length) return;
    setActiveChapterIndex(index);
    setMobileMenuOpen(false);
    if (mainRef.current) mainRef.current.scrollTo(0, 0);
    // Pre-enrich the target chapter
    enrichChapter(book, index);
    // Also pre-enrich the next chapter for smooth navigation
    if (index + 1 < book.chapters.length) {
      enrichChapter(book, index + 1);
    }
  };

  // ── UPLOAD SCREEN ──────────────────────────────────────────────
  if (!book) {
    return (
      <div className="bk-upload-container">
        <div className="bk-upload-box" onDragOver={handleDragOver} onDrop={handleDrop}>
          <Upload size={48} className="bk-upload-icon" />
          <h2>VEERNXT Book Importer</h2>
          <p>Drag and drop a <strong>.docx</strong> file — content is automatically AI-enriched.</p>
          <input type="file" accept=".docx" onChange={handleFileUpload} ref={fileInputRef} style={{ display: 'none' }} />
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button className="bk-upload-btn" onClick={() => fileInputRef.current.click()} disabled={isLoading}>
              {isLoading ? 'Parsing Document...' : 'Select DOCX File'}
            </button>
            <button className="bk-upload-btn" onClick={loadDemoBook} disabled={isLoading} style={{ backgroundColor: '#475569' }}>
              {isLoading ? 'Loading...' : 'Load GK Master Book'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const chapter = book.chapters[activeChapterIndex];
  const isEnriching = enrichingChapters.has(chapter?.id);
  const totalChapters = book.chapters.length;

  return (
    <div className="bk-reader-layout">

      {/* Mobile Top Bar */}
      <div className="bk-mobile-topbar">
        <button className="bk-menu-btn" onClick={() => setMobileMenuOpen(true)}><Menu size={24} /></button>
        <span className="bk-mobile-title">{book.title}</span>
      </div>

      {/* Sidebar TOC */}
      <aside className={`bk-sidebar ${mobileMenuOpen ? 'open' : ''}`}>
        <div className="bk-sidebar-header">
          <Book size={20} style={{ color: '#0f766e' }} />
          <h3>{book.title}</h3>
          <button className="bk-close-btn" onClick={() => setMobileMenuOpen(false)}><X size={20} /></button>
        </div>
        <nav className="bk-toc">
          {book.chapters.map((ch, idx) => (
            <button
              key={ch.id}
              className={`bk-toc-item ${activeChapterIndex === idx ? 'active' : ''}`}
              onClick={() => navigateTo(idx)}
            >
              <span className="bk-toc-number">{ch.order}</span>
              <span className="bk-toc-title">{ch.title}</span>
              {ch.enriched && <span className="bk-toc-enriched" title="AI Enriched">✦</span>}
            </button>
          ))}
        </nav>
      </aside>

      {/* Mobile Overlay */}
      {mobileMenuOpen && <div className="bk-mobile-overlay" onClick={() => setMobileMenuOpen(false)} />}

      {/* Main Content Area */}
      <main className="bk-main-content" ref={mainRef}>
        <article className="bk-article">

          {/* AI Enrichment badge */}
          {isEnriching && (
            <div className="bk-enriching">
              <span className="bk-enriching-dot" />
              <span className="bk-enriching-dot" />
              <span className="bk-enriching-dot" />
              <Sparkles size={14} style={{ marginLeft: '0.25rem', color: '#0f766e' }} />
              <span>AI is enriching this chapter…</span>
            </div>
          )}

          {chapter && (
            <>
              <ChapterHeader title={chapter.title} order={chapter.order} />
              <div className="bk-blocks-container">
                {chapter.blocks.map(block => <BlockRenderer key={block.id} block={block} />)}
              </div>
            </>
          )}

          {/* Chapter Pagination */}
          <nav className="bk-pagination">
            <button
              className="bk-page-btn bk-page-prev"
              onClick={() => navigateTo(activeChapterIndex - 1)}
              disabled={activeChapterIndex === 0}
            >
              <ChevronLeft size={20} />
              <span>
                <small>Previous</small>
                <strong>{activeChapterIndex > 0 ? book.chapters[activeChapterIndex - 1].title : ''}</strong>
              </span>
            </button>

            <div className="bk-page-counter">
              <span>{activeChapterIndex + 1}</span>
              <span className="bk-page-sep">of</span>
              <span>{totalChapters}</span>
            </div>

            <button
              className="bk-page-btn bk-page-next"
              onClick={() => navigateTo(activeChapterIndex + 1)}
              disabled={activeChapterIndex === totalChapters - 1}
            >
              <span>
                <small>Next</small>
                <strong>{activeChapterIndex < totalChapters - 1 ? book.chapters[activeChapterIndex + 1].title : ''}</strong>
              </span>
              <ChevronRight size={20} />
            </button>
          </nav>

        </article>
      </main>
    </div>
  );
}
