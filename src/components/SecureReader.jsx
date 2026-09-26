import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import {
  ArrowLeft, CheckCircle, Clock, BookOpen, Share2, RefreshCw, Lock, Crown, ChevronLeft, ChevronRight,
  Printer, Maximize, Minimize, ScrollText, BookText,
} from 'lucide-react';
import 'react-quill-new/dist/quill.snow.css';
import { getEffectiveTier, canAccessResource } from '../lib/subscriptionAccess';
import { awardPoints } from '../lib/awardPoints';
import { cleanContentTitle } from '../lib/contentTitle';
import { BlockRenderer } from './book/BlockRenderer';
import { ChapterHeader } from './book/BookBlocks';
import { ReaderThemeProvider } from './book/theme/ReaderThemeProvider';
import { useReaderTheme } from './book/theme/useReaderTheme';
import { FONT_SCALE_STEP, FONT_SCALE_MIN, FONT_SCALE_MAX } from './book/theme/readerThemeTokens';
import ThemeSwitcher from './book/theme/ThemeSwitcher';
import './book/BookBlocks.css';
import '../pages/sandbox/BookReaderV2.css';

// Font-size A-/A+ control -- separate from ThemeSwitcher's own popover
// (ThemeEditor_UI.md keeps the reader picker to just the theme list; this
// sits as its own compact control in the nav, same as the reference
// layout's "A- A+" pair next to the theme dropdown).
function FontSizeControl() {
  const { fontScale, setFontScale } = useReaderTheme();
  return (
    <div className="reader-fontsize-group">
      <button
        type="button"
        className="nav-icon-btn"
        onClick={() => setFontScale(fontScale - FONT_SCALE_STEP)}
        disabled={fontScale <= FONT_SCALE_MIN}
        aria-label="Decrease font size"
        title="Decrease font size"
      >
        A-
      </button>
      <button
        type="button"
        className="nav-icon-btn"
        onClick={() => setFontScale(fontScale + FONT_SCALE_STEP)}
        disabled={fontScale >= FONT_SCALE_MAX}
        aria-label="Increase font size"
        title="Increase font size"
      >
        A+
      </button>
    </div>
  );
}

const SecureReader = () => {
  const { id } = useParams(); // This is now resource_id
  const navigate = useNavigate();
  const location = useLocation();
  const [resource, setResource] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isRead, setIsRead] = useState(false);
  const [chapters, setChapters] = useState(null);
  const [activeChapterIndex, setActiveChapterIndex] = useState(0);
  const [effectiveTier, setEffectiveTier] = useState('FREE');
  const chapterCache = React.useRef({});

  // "Flipbook" has no real page-turn implementation anywhere in this
  // codebase yet (confirmed -- only Scroll actually renders content); the
  // toggle is honest about that rather than pretending to switch modes.
  const [readerMode] = useState('scroll');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const readerRootRef = React.useRef(null);

  useEffect(() => {
    const handleFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      readerRootRef.current?.requestFullscreen?.();
    }
  };

  const handleBack = () => {
    if (location.state?.from) {
      // replace, not push -- otherwise this reader page stays on the
      // history stack and a second "back" press (browser button or this
      // same button again from the exam page) lands right back in it
      // instead of continuing on to Dashboard/Learning Center.
      navigate(location.state.from, { replace: true });
    } else if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/learning-center');
    }
  };

  // Fetch resource metadata from resources and user subscription
  useEffect(() => {
    const fetchResource = async () => {
      let tier = 'FREE';
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const { data: profile } = await supabase
            .from('user_profiles')
            .select('subscription_tier, subscription_expires_at')
            .eq('id', session.user.id)
            .maybeSingle();
          if (profile) {
            tier = getEffectiveTier(profile.subscription_tier, profile.subscription_expires_at);
            setEffectiveTier(tier);
          }
        }
      } catch (err) {
        console.error('Error fetching subscription tier:', err);
      }

      const { data } = await supabase
        .from('resources')
        .select('*')
        .eq('resource_id', id)
        .single();
      
      if (!data) {
        setLoading(false);
        return;
      }

      setResource(data);
      awardPoints('RESOURCE_OPENED', { refId: data.resource_id });

      // Create chapter stubs from chapter_count
      const count = data.chapter_count || 1;
      const stubs = Array.from({ length: count }, (_, i) => ({
        index: i,
        title: `Chapter ${i + 1}`,
        body_html: null, // Will be loaded lazily
        loaded: false
      }));
      setChapters(stubs);
      setLoading(false);

      // Immediately load the first chapter if allowed
      if (canAccessResource(tier, data.category, 0).allowed) {
        loadChapter(data, 0, stubs);
      }
    };

    fetchResource();

    // Prevent context menu
    const handleContextMenu = (e) => e.preventDefault();
    document.addEventListener('contextmenu', handleContextMenu);
    
    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [id]);

  // Load a chapter from R2 storage
  const loadChapter = async (res, index, currentChapters) => {
    const cacheKey = `${res.resource_id}_${index}`;
    if (chapterCache.current[cacheKey]) {
      // Already cached — update chapters state with cached data
      setChapters(prev => {
        if (!prev) return prev;
        const updated = [...prev];
        updated[index] = { ...updated[index], ...chapterCache.current[cacheKey], loaded: true };
        return updated;
      });
      return;
    }

    try {
      // Cache-bust: R2 uploads (including chapter re-saves) all carry a
      // 1-year Cache-Control (scripts/lib/ingest-drive-content.js's
      // uploadToR2), with nothing purging a browser's or Cloudflare's
      // cached copy of this exact URL when the underlying content is
      // edited in place. Without this, a candidate who opened this chapter
      // once keeps seeing whatever it looked like on that first load,
      // indefinitely, even after a real content edit -- confirmed live
      // 2026-09-15 against a just-enriched Intro (see docs/status_report.md).
      const chapterUrl = `${res.storage_base_url}chapters/chapter-${index + 1}.json?t=${Date.now()}`;
      const response = await fetch(chapterUrl);
      if (!response.ok) throw new Error(`Failed to load chapter ${index + 1}`);
      
      const chapterData = await response.json();

      // Cache the loaded chapter
      chapterCache.current[cacheKey] = chapterData;

      // Two chapter-N.json shapes can come back depending on
      // resources.format: 'html' (legacy) is {title, body_html, images};
      // 'blocks' (new enriched-content pipeline) is {title, order, blocks}.
      // Storing whichever fields are present lets the render branch below
      // pick the right one without needing to know format up front.
      setChapters(prev => {
        if (!prev) return prev;
        const updated = [...prev];
        updated[index] = {
          ...updated[index],
          title: chapterData.title || `Chapter ${index + 1}`,
          body_html: chapterData.body_html || '',
          images: chapterData.images || [],
          blocks: Array.isArray(chapterData.blocks) ? chapterData.blocks : null,
          loaded: true
        };
        return updated;
      });
    } catch (err) {
      console.error(`Error loading chapter ${index + 1}:`, err);
      setChapters(prev => {
        if (!prev) return prev;
        const updated = [...prev];
        updated[index] = {
          ...updated[index],
          body_html: '<div class="empty-state"><p>Unable to load this chapter. Please try again.</p></div>',
          loaded: true
        };
        return updated;
      });
    }
  };

  // Load chapter content when user navigates to a new chapter
  useEffect(() => {
    if (resource && chapters && !chapters[activeChapterIndex]?.loaded) {
      if (canAccessResource(effectiveTier, resource.category, activeChapterIndex).allowed) {
        loadChapter(resource, activeChapterIndex, chapters);
      }
    }
  }, [activeChapterIndex, resource, effectiveTier]);

  const handleMarkAsRead = () => {
    setIsRead(true);
  };

  const resolveImageSources = (html, baseUrl) => {
    if (!html || !baseUrl) return html;
    const normalizedBaseUrl = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
    return html.replace(
      /<img\s+([^>]*?)\bsrc=["']([^"']+)["']/gi,
      (match, attributes, src) => {
        if (src.startsWith('http://') || src.startsWith('https://') || src.startsWith('data:') || src.startsWith('/')) {
          return match;
        }
        return `<img ${attributes}src="${normalizedBaseUrl}${src}"`;
      }
    );
  };

  const activeChapter = chapters ? chapters[activeChapterIndex] : null;
  const activeBlocks = activeChapter?.blocks || null;
  const rawContent = activeChapter?.body_html || '';
  const currentContent = resource ? resolveImageSources(rawContent, resource.storage_base_url) : rawContent;
  const isLastChapter = chapters ? activeChapterIndex === chapters.length - 1 : true;
  const access = resource ? canAccessResource(effectiveTier, resource.category, activeChapterIndex) : { allowed: true };
  const isBlocksFormat = resource?.format === 'blocks';

  const goToChapter = (index) => {
    setActiveChapterIndex(index);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const lockedOverlay = (
    <div style={{
      padding: '4rem 2rem',
      textAlign: 'center',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '300px',
      background: 'rgba(255, 255, 255, 0.9)',
    }}>
      <div style={{
        width: '60px', height: '60px', borderRadius: '50%',
        background: 'rgba(239, 68, 68, 0.08)', display: 'flex',
        alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem'
      }}>
        <Lock size={30} color="#ef4444" />
      </div>
      <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.75rem' }}>
        Premium Content Locked
      </h3>
      <p style={{ color: '#64748b', fontSize: '0.9rem', maxWidth: '380px', margin: '0 auto 1.75rem', lineHeight: 1.5 }}>
        {access.reason || 'Upgrade to a paid plan to unlock full guidebooks, precis covers, and advanced mock test resources.'}
      </p>
      <Link to="/subscribe" className="btn-primary ios-pill" style={{
        textDecoration: 'none', padding: '0.85rem 2rem', fontSize: '0.95rem',
        display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
        color: 'white',
      }}>
        <Crown size={16} /> View Upgrade Options
      </Link>
    </div>
  );

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: 'var(--ios-bg)' }}>
      <RefreshCw className="animate-spin" size={32} color="var(--ios-olive)" />
    </div>
  );
  
  if (!resource) return <div style={{ padding: '4rem', textAlign: 'center' }}>Document not found.</div>;

  return (
    <ReaderThemeProvider
      theme={resource?.reader_theme_id || undefined}
      subjectAccent={resource?.subject_accent || null}
      className="reader-container animate-fade-in"
    >
      <div className="reader-body-root" ref={readerRootRef}>
      <div className="reader-nav">
        <div className="nav-inner">
          <div className="nav-left-group">
            <button
              type="button"
              onClick={handleBack}
              className="back-link"
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: 0,
                font: 'inherit',
                color: 'inherit',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              <ArrowLeft size={18} /> Back
            </button>
            {chapters && chapters.length > 1 && (
              <span className="nav-chapter-counter">Chapter {activeChapterIndex + 1} of {chapters.length}</span>
            )}
          </div>
          <div className="nav-actions">
            <ThemeSwitcher />
            <FontSizeControl />
            <div className="reader-mode-toggle">
              <button type="button" className={`reader-mode-btn ${readerMode === 'scroll' ? 'active' : ''}`} title="Scroll view">
                <ScrollText size={14} /> Scroll
              </button>
              <button type="button" className="reader-mode-btn" disabled title="3D Flipbook — coming soon">
                <BookText size={14} /> Flipbook
              </button>
            </div>
            <button onClick={() => window.print()} className="nav-icon-btn" title="Print" aria-label="Print"><Printer size={18} /></button>
            <button className="nav-icon-btn" title="Share" aria-label="Share"><Share2 size={18} /></button>
            <button onClick={toggleFullscreen} className="nav-icon-btn" title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'} aria-label={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}>
              {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
            </button>
          </div>
        </div>
      </div>

      {isBlocksFormat ? (
        <div className="bk-reader-layout" style={{ minHeight: 'auto' }}>
          <aside className="bk-sidebar" style={{ position: 'sticky', top: '80px', height: 'calc(100vh - 80px)', maxHeight: 'calc(100vh - 80px)', overflowY: 'auto', alignSelf: 'flex-start' }}>
            <div className="bk-sidebar-header">
              <BookOpen size={20} style={{ color: '#0f766e', flexShrink: 0 }} />
              <h3>{cleanContentTitle(resource.title, resource.exam_name)}</h3>
            </div>
            <nav className="bk-toc">
              {(chapters || []).map((chap, idx) => {
                const chapAccess = canAccessResource(effectiveTier, resource.category, idx);
                return (
                  <button
                    key={chap.id || idx}
                    onClick={() => goToChapter(idx)}
                    className={`bk-toc-item ${activeChapterIndex === idx ? 'active' : ''}`}
                  >
                    <span className="bk-toc-number">{chapAccess.allowed ? idx + 1 : <Lock size={11} />}</span>
                    <span className="bk-toc-title">{chap.title}</span>
                  </button>
                );
              })}
            </nav>
          </aside>

          <main className="bk-main-content">
            <article className="bk-article">
              {!access.allowed ? lockedOverlay : !activeChapter?.loaded ? (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '4rem' }}>
                  <RefreshCw className="animate-spin" size={28} color="var(--ios-olive)" />
                </div>
              ) : (
                <>
                  <ChapterHeader title={activeChapter?.title} order={activeChapterIndex + 1} />
                  <div className="bk-blocks-container">
                    {(activeBlocks || []).map((block) => <BlockRenderer key={block.id} block={block} />)}
                  </div>

                  <nav className="bk-pagination">
                    <button
                      className="bk-page-btn bk-page-prev"
                      onClick={() => goToChapter(activeChapterIndex - 1)}
                      disabled={activeChapterIndex === 0}
                    >
                      <ChevronLeft size={20} />
                      <span>
                        <small>Previous</small>
                        <strong>{activeChapterIndex > 0 ? chapters[activeChapterIndex - 1].title : ''}</strong>
                      </span>
                    </button>

                    <div className="bk-page-counter">
                      <span>{activeChapterIndex + 1}</span>
                      <span className="bk-page-sep">of</span>
                      <span>{chapters?.length || 1}</span>
                    </div>

                    {isLastChapter ? (
                      <button
                        className="bk-page-btn bk-page-next"
                        onClick={handleMarkAsRead}
                        disabled={isRead}
                      >
                        <span>
                          <small>{isRead ? 'Completed' : 'Finish'}</small>
                          <strong>{isRead ? 'Marked as read' : 'Mark as Finished'}</strong>
                        </span>
                        {isRead ? <CheckCircle size={20} /> : <BookOpen size={20} />}
                      </button>
                    ) : (
                      <button
                        className="bk-page-btn bk-page-next"
                        onClick={() => goToChapter(activeChapterIndex + 1)}
                      >
                        <span>
                          <small>Next</small>
                          <strong>{chapters[activeChapterIndex + 1]?.title || ''}</strong>
                        </span>
                        <ChevronRight size={20} />
                      </button>
                    )}
                  </nav>
                </>
              )}
            </article>
          </main>
        </div>
      ) : (
        <div className="reader-main">
          <header className="reader-header">
            <div className="resource-meta">
              <span className="subject-tag">{resource.subject}</span>
              <span className="category-tag">{resource.category}</span>
            </div>
            <h1 className="resource-title">{cleanContentTitle(resource.title, resource.exam_name)}</h1>
            <div className="reading-time">
              <Clock size={16} /> <span>{chapters ? `${chapters.length} Chapters` : '12 min read'}</span>
            </div>
          </header>

          <div className="reader-layout">
            {chapters && chapters.length > 1 && (
              <div className="toc-tabs">
                <div className="tabs-container">
                  {chapters.map((chap, idx) => {
                    const chapAccess = canAccessResource(effectiveTier, resource.category, idx);
                    return (
                      <button
                        key={chap.id || idx}
                        className={`tab-btn ${activeChapterIndex === idx ? 'active' : ''}`}
                        onClick={() => goToChapter(idx)}
                        style={!chapAccess.allowed ? { opacity: 0.6 } : {}}
                      >
                        <span className="chap-num" style={!chapAccess.allowed ? { background: '#ef4444' } : {}}>
                          {!chapAccess.allowed ? <Lock size={10} color="white" /> : idx + 1}
                        </span>
                        <span className="tab-title">{chap.title}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="glass-panel reader-card">
              <div className="reader-content ql-snow">
                {!access.allowed ? lockedOverlay : !chapters?.[activeChapterIndex]?.loaded ? (
                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '4rem' }}>
                    <RefreshCw className="animate-spin" size={28} color="var(--ios-olive)" />
                  </div>
                ) : (
                  <div className="ql-editor" dangerouslySetInnerHTML={{ __html: currentContent || '<div class="empty-state"><p>Content is being securely processed. Please check back shortly.</p></div>' }} />
                )}
              </div>

              {access.allowed && (
                <div className="reader-footer">
                  {chapters && activeChapterIndex > 0 && (
                    <button
                      onClick={() => goToChapter(activeChapterIndex - 1)}
                      className="btn-paginate"
                    >
                      <ArrowLeft size={16} /> Previous
                    </button>
                  )}

                  {isLastChapter ? (
                    <button
                      onClick={handleMarkAsRead}
                      className={`mark-read-btn ${isRead ? 'completed' : ''}`}
                      disabled={isRead}
                    >
                      {isRead ? (
                        <><CheckCircle size={20} /> Completed</>
                      ) : (
                        <><BookOpen size={20} /> Mark as Finished</>
                      )}
                    </button>
                  ) : (
                    <button
                      onClick={() => goToChapter(activeChapterIndex + 1)}
                      className="btn-paginate primary"
                    >
                      Next Chapter <ArrowLeft size={16} style={{ transform: 'rotate(180deg)' }} />
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        .reader-container {
          min-height: 100vh;
          background: var(--reader-background, #f8fafc);
        }
        .reader-body-root { padding-bottom: 5rem; padding-top: 80px; }
        .reader-nav {
          background: var(--reader-surface, white);
          border-bottom: 1px solid var(--reader-border, rgba(0,0,0,0.05));
          padding: 1rem 0;
          margin-bottom: 3rem;
          font-family: var(--reader-ui-font, 'Inter', sans-serif);
        }
        .nav-inner {
          max-width: var(--reader-content-width, 1000px);
          margin: 0 auto;
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0 1.5rem;
          flex-wrap: wrap;
          gap: 0.75rem;
        }
        .nav-left-group { display: flex; align-items: center; gap: 1rem; }
        .nav-chapter-counter {
          font-size: 0.82rem; font-weight: 600; color: var(--reader-text-muted, #94a3b8);
          padding-left: 1rem; border-left: 1px solid var(--reader-border, #e2e8f0);
        }
        .back-link {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: var(--reader-text-muted, #64748b);
          text-decoration: none;
          font-weight: 600;
          font-size: 0.9rem;
          transition: color 0.2s;
        }
        .back-link:hover { color: var(--reader-primary, var(--ios-olive)); }
        .nav-actions { display: flex; gap: 0.4rem; align-items: center; flex-wrap: wrap; }
        .nav-icon-btn {
          background: none;
          border: none;
          color: var(--reader-text-muted, #94a3b8);
          cursor: pointer;
          padding: 0.5rem;
          border-radius: var(--reader-radius-sm, 8px);
          transition: all 0.2s;
          font-size: 0.8rem;
          font-weight: 800;
          font-family: inherit;
        }
        .nav-icon-btn:hover:not(:disabled) { background: var(--reader-surface-alt, #f1f5f9); color: var(--reader-primary, var(--ios-olive)); }
        .nav-icon-btn:disabled { opacity: 0.4; cursor: default; }
        .reader-fontsize-group { display: flex; gap: 0.15rem; align-items: center; border: 1px solid var(--reader-border, #e2e8f0); border-radius: var(--reader-radius-sm, 8px); padding: 0.1rem; }
        .reader-mode-toggle { display: flex; border: 1px solid var(--reader-border, #e2e8f0); border-radius: var(--reader-radius-sm, 8px); overflow: hidden; }
        .reader-mode-btn {
          display: flex; align-items: center; gap: 0.35rem; background: none; border: none; padding: 0.5rem 0.75rem;
          font-size: 0.78rem; font-weight: 700; color: var(--reader-text-muted, #94a3b8); cursor: pointer; font-family: inherit;
        }
        .reader-mode-btn.active { background: var(--reader-primary-soft, rgba(75,107,50,0.1)); color: var(--reader-primary, var(--ios-olive)); }
        .reader-mode-btn:disabled { opacity: 0.4; cursor: default; }

        .reader-main {
          max-width: var(--reader-content-width, 1000px);
          margin: 0 auto;
          padding: 0 1.5rem;
        }
        .reader-header {
          margin-bottom: 2.5rem;
          text-align: center;
        }
        .resource-meta {
          display: flex;
          justify-content: center;
          gap: 0.75rem;
          margin-bottom: 1rem;
        }
        .subject-tag {
          background: var(--reader-primary-soft, rgba(75, 107, 50, 0.1));
          color: var(--reader-primary, var(--ios-olive));
          padding: 0.25rem 0.75rem;
          border-radius: 99px;
          font-size: 0.75rem;
          font-weight: 700;
          text-transform: uppercase;
        }
        .category-tag {
          color: var(--reader-text-muted, #94a3b8);
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .resource-title {
          font-family: var(--reader-heading-font, 'Inter', sans-serif);
          font-size: var(--reader-h1-size, 2.5rem);
          font-weight: var(--reader-heading-weight, 800);
          color: var(--reader-heading, #1e293b);
          line-height: 1.2;
          margin-bottom: 1rem;
          letter-spacing: -0.03em;
        }
        .reading-time {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          color: var(--reader-text-muted, #94a3b8);
          font-size: 0.85rem;
        }

        .reader-card {
          padding: 4rem 5rem;
          user-select: none;
          background: var(--reader-surface, #ffffff);
          box-shadow: var(--reader-shadow-md, 0 4px 6px -1px rgba(0, 0, 0, 0.05));
          border-radius: var(--reader-radius-lg, 12px);
          border: 1px solid var(--reader-border, #e2e8f0);
          min-width: 0;
          overflow-wrap: break-word;
          word-wrap: break-word;
        }
        .reader-content {
          font-family: var(--reader-body-font, 'Merriweather', serif);
          line-height: var(--reader-body-line-height, 1.8);
          font-size: var(--reader-body-size, 1.1rem);
          color: var(--reader-text, #1e293b);
        }
        .reader-content h1, .reader-content h2, .reader-content h3, .reader-content h4 {
          font-family: var(--reader-heading-font, 'Inter', sans-serif);
          color: var(--reader-primary, var(--ios-olive));
          font-weight: var(--reader-heading-weight, 700);
          letter-spacing: -0.02em;
          margin-top: 2.5rem;
          margin-bottom: 1.25rem;
          line-height: 1.3;
        }
        .reader-content h1 { font-size: var(--reader-h2-size, 2.25rem); border-bottom: 1px solid var(--reader-border, #e2e8f0); padding-bottom: 0.5rem; }
        .reader-content h2 { font-size: 1.75rem; }
        .reader-content h3 { font-size: var(--reader-h3-size, 1.4rem); }

        .reader-content p { margin-bottom: 1.5rem; }

        /* Drop Cap for first paragraph of a chapter */
        .reader-content > p:first-of-type::first-letter {
          float: left;
          font-size: 4.5rem;
          line-height: 0.8;
          padding-top: 4px;
          padding-right: 8px;
          padding-left: 3px;
          font-family: var(--reader-dropcap-font, 'Inter', sans-serif);
          font-weight: 800;
          color: var(--reader-primary, var(--ios-olive));
        }

        /* Premium Blockquote / Pull Quote styling */
        .reader-content blockquote {
          margin: 2.5rem -1.5rem;
          padding: 1.5rem 2rem;
          background: var(--reader-background, #f8fafc);
          border-left: 4px solid var(--reader-primary, var(--ios-olive));
          font-style: italic;
          color: var(--reader-text, #334155);
          font-size: 1.25rem;
          line-height: 1.6;
          box-shadow: var(--reader-shadow-sm, 0 4px 6px -1px rgba(0, 0, 0, 0.02));
        }

        /* Educational Callout Boxes (e.g. DID YOU KNOW?) */
        .reader-content blockquote:has(strong:first-child:contains('DID YOU KNOW')),
        .reader-content blockquote:has(strong:first-child:contains('💡')) {
          margin: 2.5rem 0;
          padding: 1.5rem;
          background: var(--reader-primary-soft, rgba(75, 107, 50, 0.05));
          border: 1px solid var(--reader-border-strong, rgba(75, 107, 50, 0.2));
          border-left: 4px solid var(--reader-primary, var(--ios-olive));
          border-radius: var(--reader-radius-md, 8px);
          font-style: normal;
          color: var(--reader-text, #1e293b);
          font-size: 1.05rem;
        }

        .reader-content blockquote p:last-child { margin-bottom: 0; }

        /* Highlight EX / Solution bolding */
        .reader-content p strong:first-child {
          color: var(--reader-primary, var(--ios-olive));
        }

        /* Lists */
        .reader-content ul, .reader-content ol {
          margin-bottom: 1.5rem;
          padding-left: 1.5rem;
        }
        .reader-content li { margin-bottom: 0.5rem; }
        .reader-content li::marker { color: var(--reader-primary, var(--ios-olive)); font-weight: 600; }

        /* Inline code */
        .reader-content code {
          background: var(--reader-surface-alt, #f1f5f9);
          padding: 0.2rem 0.4rem;
          border-radius: 4px;
          font-family: monospace;
          font-size: 0.9em;
          color: var(--reader-danger, #ef4444);
        }

        /* Image Styling - Magazine layout */
        .reader-content img {
          max-width: calc(100% + 3rem);
          width: calc(100% + 3rem);
          margin: 2.5rem -1.5rem;
          height: auto;
          border-radius: 0;
          box-shadow: var(--reader-shadow-md, 0 4px 15px rgba(0, 0, 0, 0.08));
          display: block;
        }

        @media (min-width: 768px) {
          .reader-content img {
            max-width: 100%;
            width: 100%;
            margin: 3rem 0;
            border-radius: var(--reader-radius-lg, 12px);
          }
          .reader-content blockquote {
            margin: 2.5rem 0;
            border-radius: 0 var(--reader-radius-md, 8px) var(--reader-radius-md, 8px) 0;
          }
        }

        /* Image Captions (if italic text follows image) */
        .reader-content img + p > em {
          display: block;
          text-align: center;
          font-size: 0.9rem;
          color: var(--reader-text-muted, #64748b);
          margin-top: -1.5rem;
          margin-bottom: 2.5rem;
        }

        .reader-content pre {
          white-space: pre-wrap;
          word-break: break-all;
          overflow-x: auto;
          max-width: 100%;
          background: var(--reader-heading, #0f172a);
          color: var(--reader-background, #f8fafc);
          padding: 1.5rem;
          border-radius: var(--reader-radius-md, 8px);
          font-family: monospace;
          font-size: 0.95rem;
          margin-bottom: 1.5rem;
        }

        /* Table Styling - Premium */
        .reader-content .table-responsive-wrapper {
          width: 100%;
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
          margin: 2.5rem 0;
          box-shadow: var(--reader-shadow-sm, 0 4px 6px -1px rgba(0,0,0,0.05));
          border-radius: var(--reader-radius-lg, 12px);
          border: 1px solid var(--reader-border, #e2e8f0);
        }

        .reader-content table {
          width: 100%;
          border-collapse: separate;
          border-spacing: 0;
          font-family: var(--reader-heading-font, 'Inter', sans-serif);
          font-size: 0.95rem;
          min-width: 600px;
        }
        .reader-content th, .reader-content td {
          padding: 1rem 1.25rem;
          text-align: left;
          border-bottom: 1px solid var(--reader-border, #e2e8f0);
          border-right: 1px solid var(--reader-border, #e2e8f0);
        }
        .reader-content th:last-child, .reader-content td:last-child {
          border-right: none;
        }
        .reader-content tr:last-child td {
          border-bottom: none;
        }
        .reader-content th {
          background-color: var(--reader-background, #f8fafc);
          font-weight: 600;
          color: var(--reader-secondary, #334155);
        }
        .reader-content tr:nth-child(even) td {
          background-color: var(--reader-surface-alt, #fcfcfd);
        }

        .reader-footer {
          margin-top: 4rem;
          padding-top: 2rem;
          border-top: 1px solid var(--reader-border, #f1f5f9);
          display: flex;
          justify-content: center;
        }
        .mark-read-btn {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 1rem 2.5rem;
          font-size: 1rem;
          font-weight: 700;
          border-radius: 99px;
          border: none;
          background: var(--reader-primary, var(--ios-olive));
          color: white;
          cursor: pointer;
          transition: all 0.3s;
          box-shadow: var(--reader-shadow-md, 0 10px 20px rgba(75, 107, 50, 0.2));
        }
        .mark-read-btn:hover { transform: translateY(-2px); box-shadow: var(--reader-shadow-lg, 0 15px 25px rgba(75, 107, 50, 0.3)); }
        .mark-read-btn.completed {
          background: var(--reader-success, #22c55e);
          cursor: default;
          box-shadow: none;
        }

        .empty-state {
          text-align: center;
          padding: 4rem 2rem;
          background: var(--reader-background, #f8fafc);
          border-radius: var(--reader-radius-lg, 16px);
          border: 2px dashed var(--reader-border, #e2e8f0);
          color: var(--reader-text-muted, #94a3b8);
        }

        .reader-layout { display: flex; flex-direction: column; gap: 1.5rem; align-items: stretch; }

        .toc-tabs {
          width: 100%;
          overflow-x: auto;
          scrollbar-width: none;
          -ms-overflow-style: none;
          padding-bottom: 0.5rem;
        }
        .toc-tabs::-webkit-scrollbar { display: none; }
        .tabs-container {
          display: flex;
          gap: 0.75rem;
          min-width: max-content;
        }
        .tab-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.6rem 1.25rem;
          border-radius: 99px;
          border: 1px solid var(--reader-border, #e2e8f0);
          background: var(--reader-surface, white);
          color: var(--reader-secondary, #475569);
          font-size: 0.9rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          white-space: nowrap;
          box-shadow: 0 2px 4px rgba(0,0,0,0.02);
        }
        .tab-btn:hover { background: var(--reader-background, #f8fafc); color: var(--reader-primary, var(--ios-olive)); border-color: var(--reader-border-strong, #cbd5e1); }
        .tab-btn.active { background: var(--reader-primary, var(--ios-olive)); color: white; border-color: var(--reader-primary, var(--ios-olive)); box-shadow: var(--reader-shadow-sm); }
        .tab-btn .chap-num { width: 22px; height: 22px; background: var(--reader-border, #e2e8f0); border-radius: 100px; display: flex; align-items: center; justify-content: center; font-size: 0.7rem; color: var(--reader-text-muted, #64748b); }
        .tab-btn.active .chap-num { background: rgba(255,255,255,0.25); color: white; }

        .chapter-title { font-size: 2rem; color: var(--reader-heading, #0f172a); margin-bottom: 2rem; padding-bottom: 1rem; border-bottom: 1px solid var(--reader-border, #f1f5f9); }

        .btn-paginate {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 1rem 2rem;
          border-radius: 99px;
          border: 1px solid var(--reader-border, #e2e8f0);
          background: var(--reader-surface, white);
          color: var(--reader-secondary, #475569);
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
        }
        .btn-paginate:hover { background: var(--reader-background, #f8fafc); color: var(--reader-primary, var(--ios-olive)); }
        .btn-paginate.primary { background: var(--reader-primary, var(--ios-olive)); color: white; border: none; box-shadow: var(--reader-shadow-sm); }
        .btn-paginate.primary:hover { transform: translateY(-2px); box-shadow: var(--reader-shadow-md); color: white; }

        @media (max-width: 600px) {
          .reader-card { padding: 2rem 1.5rem; }
          .resource-title { font-size: 1.75rem; }
          .reader-footer { flex-direction: column; gap: 1rem; }
          .reader-footer button { width: 100%; justify-content: center; }
          .nav-inner { flex-wrap: wrap; }
        }
      `}} />
      </div>
    </ReaderThemeProvider>
  );
};

export default SecureReader;
