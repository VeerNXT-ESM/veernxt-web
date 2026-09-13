import { useState, useEffect, useRef } from 'react';
import { Book, ChevronLeft, ChevronRight, Menu, X, Loader2 } from 'lucide-react';
import { ChapterHeader } from '../../components/book/BookBlocks';
import { BlockRenderer } from '../../components/book/BlockRenderer';
import './BookReaderV2.css';

// Sample books served straight from R2 (production storage) rather than a
// local public/books/ copy -- that local copy was 1.3GB sitting in the
// deploy bundle for exactly one consumer (this page), so it was moved out
// of public/ entirely. English/Hindi don't have a blocks-format "Guide"
// row, so their samples here are the closest blocks-format equivalent
// (Précis) instead -- still real, representative content for exercising
// the reader, just not the identical title the old local copy had.
const AVAILABLE_BOOKS = [
  { id: 'english', title: 'English Précis (sample)', path: 'https://pub-8c123d43246448199bbe4a14bffa2c06.r2.dev/structured_resources/blocks/Precis/1b0cedf2-7476-4747-a747-1b0cedf27476' },
  { id: 'gs-gk', title: 'GS & GK Guide Book', path: 'https://pub-8c123d43246448199bbe4a14bffa2c06.r2.dev/structured_resources/blocks/Guide/4f39098f-651c-4651-a651-4f39098f651c' },
  { id: 'reasoning', title: 'Reasoning Guide Book', path: 'https://pub-8c123d43246448199bbe4a14bffa2c06.r2.dev/structured_resources/blocks/Guide/272dbb7c-12ac-412a-a12a-272dbb7c12ac' },
  { id: 'computer', title: 'Computer Science Guide', path: 'https://pub-8c123d43246448199bbe4a14bffa2c06.r2.dev/structured_resources/blocks/Guide/1359761c-5d2b-45d2-a5d2-1359761c5d2b' },
  { id: 'hindi', title: 'Hindi Précis (sample)', path: 'https://pub-8c123d43246448199bbe4a14bffa2c06.r2.dev/structured_resources/blocks/Precis/16e4d9bb-0eea-40ee-a0ee-16e4d9bb0eea' }
];

export default function DevReader() {
  const [selectedBook, setSelectedBook] = useState(AVAILABLE_BOOKS[0]);
  const [metadata, setMetadata] = useState(null);
  const [chapter, setChapter] = useState(null);
  const [activeChapterIndex, setActiveChapterIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  const mainRef = useRef(null);

  // Fetch book metadata
  useEffect(() => {
    const fetchMetadata = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${selectedBook.path}/metadata.json`);
        if (!res.ok) throw new Error('Failed to load metadata');
        const data = await res.json();
        setMetadata(data);
        setActiveChapterIndex(0);
      } catch (err) {
        console.error(err);
        setMetadata(null);
      } finally {
        setLoading(false);
      }
    };
    fetchMetadata();
  }, [selectedBook]);

  // Fetch active chapter content
  useEffect(() => {
    if (!metadata || metadata.chapters.length === 0) return;
    const fetchChapter = async () => {
      setLoading(true);
      try {
        const chapterNum = activeChapterIndex + 1;
        const res = await fetch(`${selectedBook.path}/chapters/chapter-${chapterNum}.json`);
        if (!res.ok) throw new Error('Failed to load chapter');
        const data = await res.json();
        setChapter(data);
        if (mainRef.current) mainRef.current.scrollTo(0, 0);
      } catch (err) {
        console.error(err);
        setChapter(null);
      } finally {
        setLoading(false);
      }
    };
    fetchChapter();
  }, [metadata, activeChapterIndex, selectedBook]);

  const navigateTo = (index) => {
    if (!metadata || index < 0 || index >= metadata.chapters.length) return;
    setActiveChapterIndex(index);
    setMobileMenuOpen(false);
  };

  const totalChapters = metadata?.chapters?.length || 0;

  return (
    <div className="bk-reader-layout">
      {/* Mobile Top Bar */}
      <div className="bk-mobile-topbar">
        <button className="bk-menu-btn" onClick={() => setMobileMenuOpen(true)}>
          <Menu size={24} />
        </button>
        <span className="bk-mobile-title">{metadata?.title || selectedBook.title}</span>
      </div>

      {/* Sidebar */}
      <aside className={`bk-sidebar ${mobileMenuOpen ? 'open' : ''}`}>
        <div className="bk-sidebar-header">
          <Book size={20} style={{ color: '#0f766e' }} />
          <h3>VeerNXT Bookshelf</h3>
          <button className="bk-close-btn" onClick={() => setMobileMenuOpen(false)}>
            <X size={20} />
          </button>
        </div>

        {/* Book Selector */}
        <div className="bk-book-selector">
          <label>Select Book</label>
          <select 
            value={selectedBook.id} 
            onChange={(e) => {
              const book = AVAILABLE_BOOKS.find(b => b.id === e.target.value);
              if (book) setSelectedBook(book);
            }}
          >
            {AVAILABLE_BOOKS.map(b => (
              <option key={b.id} value={b.id}>{b.title}</option>
            ))}
          </select>
        </div>

        <nav className="bk-toc">
          {metadata ? (
            metadata.chapters.map((ch, idx) => (
              <button
                key={idx}
                onClick={() => navigateTo(idx)}
                className={`bk-toc-item ${activeChapterIndex === idx ? 'active' : ''}`}
              >
                <span className="bk-toc-number">{ch.order}</span>
                <span className="bk-toc-title">{ch.title}</span>
                {ch.enriched && <span className="bk-toc-enriched" title="AI Enriched">✦</span>}
              </button>
            ))
          ) : (
            <div style={{ padding: '1rem', color: '#64748b' }}>Loading bookshelf...</div>
          )}
        </nav>
      </aside>

      {/* Mobile Overlay */}
      {mobileMenuOpen && <div className="bk-mobile-overlay" onClick={() => setMobileMenuOpen(false)} />}

      {/* Main Content Area */}
      <main className="bk-main-content" ref={mainRef}>
        <article className="bk-article">
          {loading ? (
            <div className="loading-state" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '50vh', gap: '1rem' }}>
              <Loader2 className="spinner" style={{ animation: 'spin 1s linear infinite', color: '#0f766e' }} />
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
              <p style={{ color: '#64748b' }}>Loading enriched chapter...</p>
            </div>
          ) : chapter ? (
            <>
              <ChapterHeader title={chapter.title} order={chapter.order} />
              <div className="bk-blocks-container">
                {chapter.blocks && chapter.blocks.map((block) => (
                  <BlockRenderer key={block.id} block={block} />
                ))}
              </div>

              {/* Pagination */}
              <nav className="bk-pagination">
                <button
                  className="bk-page-btn bk-page-prev"
                  onClick={() => navigateTo(activeChapterIndex - 1)}
                  disabled={activeChapterIndex === 0}
                >
                  <ChevronLeft size={20} />
                  <span>
                    <small>Previous</small>
                    <strong>{activeChapterIndex > 0 ? metadata.chapters[activeChapterIndex - 1].title : ''}</strong>
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
                    <strong>{activeChapterIndex < totalChapters - 1 ? metadata.chapters[activeChapterIndex + 1].title : ''}</strong>
                  </span>
                  <ChevronRight size={20} />
                </button>
              </nav>
            </>
          ) : (
            <div className="empty-state">
              <p>Please select a book and chapter to start reading.</p>
            </div>
          )}
        </article>
      </main>
    </div>
  );
}
