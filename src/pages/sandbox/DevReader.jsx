import { Fragment, useState, useEffect, useRef } from 'react';
import { Book, ChevronLeft, ChevronRight, Menu, X, Loader2 } from 'lucide-react';
import { ChapterHeader } from '../../components/book/BookBlocks';
import { BlockRenderer } from '../../components/book/BlockRenderer';
import { useThumbnails } from '../../lib/thumbnailStore';
import { resolveCanonicalSubjectLabel, getFamilyHex } from '../../lib/thumbnailTaxonomy';
import '../../components/book/BookBlocksClassic.css';
import './BookReaderV2.css';

// Sample books served straight from R2 (production storage) rather than a
// local public/books/ copy -- that local copy was 1.3GB sitting in the
// deploy bundle for exactly one consumer (this page), so it was moved out
// of public/ entirely. English/Hindi don't have a blocks-format "Guide"
// row, so their samples here are the closest blocks-format equivalent
// (Précis) instead -- still real, representative content for exercising
// the reader, just not the identical title the old local copy had.
const PREVIEW_BASE = 'https://pub-8c123d43246448199bbe4a14bffa2c06.r2.dev/structured_resources/blocks/Preview';
const AVAILABLE_BOOKS = [
  // Content-team review copies: parsed straight from the DOCX (no AI enrichment). These are NEW books
  // ("<title> 2026 NEW"); once signed off the suffix is dropped and they replace the old books.
  // Links: /dev-reader?book=gsgk-guide-2026-new   /dev-reader?book=gsgk-precis-2026-new   (add &ch=N for a chapter)
  { id: 'gsgk-guide-2026-new', title: 'GS & GK Guide 2026 NEW', path: `${PREVIEW_BASE}/gsgk-guide-2026-new` },
  { id: 'gsgk-precis-2026-new', title: 'GS & GK Precis 2026 NEW', path: `${PREVIEW_BASE}/gsgk-precis-2026-new` },
  { id: 'english', title: 'English Précis (sample)', path: 'https://pub-8c123d43246448199bbe4a14bffa2c06.r2.dev/structured_resources/blocks/Precis/1b0cedf2-7476-4747-a747-1b0cedf27476' },
  { id: 'gs-gk', title: 'GS & GK Guide Book', path: 'https://pub-8c123d43246448199bbe4a14bffa2c06.r2.dev/structured_resources/blocks/Guide/4f39098f-651c-4651-a651-4f39098f651c' },
  { id: 'reasoning', title: 'Reasoning Guide Book', path: 'https://pub-8c123d43246448199bbe4a14bffa2c06.r2.dev/structured_resources/blocks/Guide/272dbb7c-12ac-412a-a12a-272dbb7c12ac' },
  { id: 'computer', title: 'Computer Science Guide', path: 'https://pub-8c123d43246448199bbe4a14bffa2c06.r2.dev/structured_resources/blocks/Guide/1359761c-5d2b-45d2-a5d2-1359761c5d2b' },
  { id: 'hindi', title: 'Hindi Précis (sample)', path: 'https://pub-8c123d43246448199bbe4a14bffa2c06.r2.dev/structured_resources/blocks/Precis/16e4d9bb-0eea-40ee-a0ee-16e4d9bb0eea' }
];

// Section names come from the DOCX ("SECTION B: INDIAN POLITY", "SSC COMPLETE HISTORY BOOK",
// "GENERAL SCIENCE › SECTION A : PHYSICS"). Strip the decoration, then reuse the app's subject resolver
// so the cover comes from lc_subjects (editable on Admin > Subjects).
function subjectForPart(name) {
  const cleaned = (name || '').split('›').pop()
    .replace(/^\s*section\s+[a-z]\s*[-:–]\s*/i, '')
    .replace(/^\s*ssc\s+/i, '')
    .replace(/\b(complete|book)\b/gi, '')
    .replace(/\s+/g, ' ').trim();
  return resolveCanonicalSubjectLabel(cleaned);
}

export default function DevReader() {
  const { subjectUrl } = useThumbnails();
  const params = new URLSearchParams(window.location.search);
  const [selectedBook, setSelectedBook] = useState(AVAILABLE_BOOKS.find((b) => b.id === params.get('book')) || AVAILABLE_BOOKS[0]);
  const [metadata, setMetadata] = useState(null);
  const [chapter, setChapter] = useState(null);
  const [activeChapterIndex, setActiveChapterIndex] = useState(Math.max(0, (parseInt(params.get('ch'), 10) || 1) - 1));
  const firstLoad = useRef(true);
  const [loading, setLoading] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  // Entering a subject shows: cover (full page) -> contents -> first chapter. stageState remembers how far we got.
  const [stageState, setStageState] = useState({ part: '', stage: '' });
  
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
        if (firstLoad.current) firstLoad.current = false; else setActiveChapterIndex(0);
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

  useEffect(() => {
    const u = new URL(window.location.href);
    u.searchParams.set('book', selectedBook.id);
    u.searchParams.set('ch', String(activeChapterIndex + 1));
    window.history.replaceState(null, '', u);
  }, [selectedBook, activeChapterIndex]);

  const navigateTo = (index) => {
    if (!metadata || index < 0 || index >= metadata.chapters.length) return;
    setActiveChapterIndex(index);
    setMobileMenuOpen(false);
  };

  const totalChapters = metadata?.chapters?.length || 0;

  // Subjects: books with several subjects carry chapter.part (from the DOCX's empty Heading 1 dividers).
  const chapters = metadata?.chapters || [];
  const partOf = (i) => chapters[i]?.part || '';
  const partList = [...new Set(chapters.map((c) => c.part || '').filter(Boolean))];
  const activePart = partOf(activeChapterIndex);
  const isPartStart = !!metadata && !!activePart && (activeChapterIndex === 0 || partOf(activeChapterIndex - 1) !== activePart);
  const stage = isPartStart ? (stageState.part === activePart ? stageState.stage : 'cover') : 'done';
  const subj = activePart ? subjectForPart(activePart) : null;
  const coverHex = getFamilyHex(subj?.family);
  const coverImg = subj ? subjectUrl(subj.key) : null;
  const goStage = (st) => setStageState({ part: activePart, stage: st });
  useEffect(() => { if (mainRef.current) mainRef.current.scrollTo(0, 0); }, [stage, activePart]);
  const inPartNumber = (i) => (partOf(i) ? chapters.slice(0, i).filter((c) => (c.part || '') === partOf(i)).length + 1 : chapters[i]?.order);
  const partSize = (p) => chapters.filter((c) => (c.part || '') === p).length;
  const counterTotal = activePart ? partSize(activePart) : totalChapters;
  const counterNow = activePart ? inPartNumber(activeChapterIndex) : activeChapterIndex + 1;

  return (
    <div className="bk-reader-layout bk-classic">
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
              <Fragment key={idx}>
                {ch.part && ch.part !== partOf(idx - 1) && (
                  <div style={{ padding: '14px 16px 6px', fontSize: 11, fontWeight: 800, letterSpacing: '.1em', textTransform: 'uppercase', color: '#0f766e', borderTop: idx ? '1px solid #e2e8f0' : 'none', marginTop: idx ? 8 : 0 }}>
                    {ch.part}
                  </div>
                )}
                <button
                  onClick={() => { if (ch.part) setStageState({ part: ch.part, stage: 'done' }); navigateTo(idx); }}
                  className={`bk-toc-item ${activeChapterIndex === idx ? 'active' : ''}`}
                >
                  <span className="bk-toc-number">{inPartNumber(idx)}</span>
                  <span className="bk-toc-title">{ch.title}</span>
                  {ch.enriched && <span className="bk-toc-enriched" title="AI Enriched">✦</span>}
                </button>
              </Fragment>
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
        {stage === 'cover' ? (
          /* 1. Subject cover: a full page of its own (image from lc_subjects, Admin > Subjects) */
          <section style={{ width: '100%', minHeight: '100%', display: 'flex', flexDirection: 'column', background: coverHex, color: '#fff' }}>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20, padding: '2rem 1.25rem 1rem', textAlign: 'center' }}>
              <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '.22em', opacity: 0.85 }}>
                SUBJECT {partList.indexOf(activePart) + 1} OF {partList.length}
              </div>
              {coverImg ? (
                <img
                  src={coverImg}
                  alt={subj?.label || activePart}
                  style={{ width: 'min(300px, 78vw)', maxHeight: '58vh', aspectRatio: '2 / 3', objectFit: 'cover', boxShadow: '0 24px 50px -12px rgba(0,0,0,.55)', display: 'block' }}
                />
              ) : null}
              <h1 style={{ fontFamily: 'Inter, sans-serif', fontSize: 'clamp(1.9rem, 6vw, 3.25rem)', fontWeight: 900, lineHeight: 1.05, letterSpacing: '-0.03em', margin: 0, maxWidth: 760, overflowWrap: 'anywhere' }}>
                {activePart}
              </h1>
              <div style={{ fontSize: 15, opacity: 0.9 }}>{partSize(activePart)} chapters</div>
            </div>
            <nav style={{ display: 'flex', gap: 12, padding: '1rem 1.25rem 1.5rem', justifyContent: 'space-between' }}>
              <button
                onClick={() => navigateTo(activeChapterIndex - 1)}
                disabled={activeChapterIndex === 0}
                style={{ minHeight: 48, padding: '0 16px', background: 'rgba(255,255,255,.16)', color: '#fff', border: '1px solid rgba(255,255,255,.4)', cursor: activeChapterIndex === 0 ? 'default' : 'pointer', opacity: activeChapterIndex === 0 ? 0.35 : 1, display: 'flex', alignItems: 'center', gap: 6, fontSize: 15, fontWeight: 600 }}
              >
                <ChevronLeft size={20} /> Previous
              </button>
              <button
                onClick={() => goStage('contents')}
                style={{ minHeight: 48, padding: '0 20px', background: '#fff', color: '#0f172a', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 15, fontWeight: 700 }}
              >
                Contents <ChevronRight size={20} />
              </button>
            </nav>
          </section>
        ) : (
        <article className="bk-article">
          {stage === 'contents' ? (
            /* 2. Subject contents page */
            <section style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '.2em', color: '#64748b' }}>
                SUBJECT {partList.indexOf(activePart) + 1} OF {partList.length} &middot; CONTENTS
              </div>
              <h1 style={{ fontFamily: 'Inter, sans-serif', fontSize: 'clamp(1.7rem, 5.5vw, 2.5rem)', fontWeight: 900, lineHeight: 1.1, letterSpacing: '-0.03em', color: '#0f172a', margin: 0, overflowWrap: 'anywhere' }}>
                {activePart}
              </h1>
              <div style={{ height: 4, width: 96, background: coverHex }} />
              <ol style={{ margin: 0, padding: 0, listStyle: 'none', display: 'grid', gap: 2 }}>
                {chapters.map((c, i) => (c.part === activePart ? (
                  <li key={i}>
                    <button
                      onClick={() => { goStage('done'); navigateTo(i); }}
                      style={{ background: 'none', border: 'none', padding: '10px 0', minHeight: 44, cursor: 'pointer', textAlign: 'left', fontSize: 16, color: '#0f172a', width: '100%', display: 'flex', gap: 12 }}
                    >
                      <span style={{ color: coverHex, fontWeight: 800, minWidth: 28 }}>{inPartNumber(i)}</span>
                      <span style={{ overflowWrap: 'anywhere' }}>{c.title}</span>
                    </button>
                  </li>
                ) : null))}
              </ol>
              <nav className="bk-pagination">
                <button className="bk-page-btn bk-page-prev" onClick={() => setStageState({ part: '', stage: '' })}>
                  <ChevronLeft size={20} />
                  <span>
                    <small>Previous</small>
                    <strong>Cover</strong>
                  </span>
                </button>
                <div className="bk-page-counter" />
                <button className="bk-page-btn bk-page-next" onClick={() => goStage('done')}>
                  <span>
                    <small>Next</small>
                    <strong>{chapters[activeChapterIndex]?.title}</strong>
                  </span>
                  <ChevronRight size={20} />
                </button>
              </nav>
            </section>
          ) : loading ? (
            <div className="loading-state" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '50vh', gap: '1rem' }}>
              <Loader2 className="spinner" style={{ animation: 'spin 1s linear infinite', color: '#0f766e' }} />
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
              <p style={{ color: '#64748b' }}>Loading enriched chapter...</p>
            </div>
          ) : chapter ? (
            <>
              <ChapterHeader title={chapter.title} part={chapter.part} />
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
                  <span>{counterNow}</span>
                  <span className="bk-page-sep">of</span>
                  <span>{counterTotal}</span>
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
        )}
      </main>
    </div>
  );
}
