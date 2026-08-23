import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { ArrowLeft, CheckCircle, Clock, BookOpen, Share2, RefreshCw, Lock, Crown } from 'lucide-react';
import 'react-quill-new/dist/quill.snow.css';
import { getEffectiveTier, canAccessResource } from '../lib/subscriptionAccess';
import { awardPoints } from '../lib/awardPoints';
import { cleanContentTitle } from '../lib/contentTitle';

const SecureReader = () => {
  const { id } = useParams(); // This is now resource_id
  const [resource, setResource] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isRead, setIsRead] = useState(false);
  const [chapters, setChapters] = useState(null);
  const [activeChapterIndex, setActiveChapterIndex] = useState(0);
  const [chapterLoading, setChapterLoading] = useState(false);
  const [effectiveTier, setEffectiveTier] = useState('FREE');
  const chapterCache = React.useRef({});

  // Fetch resource metadata from resources_v2 and user subscription
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
        .from('resources_v2')
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

    setChapterLoading(true);
    try {
      const chapterUrl = `${res.storage_base_url}chapters/chapter-${index + 1}.json`;
      const response = await fetch(chapterUrl);
      if (!response.ok) throw new Error(`Failed to load chapter ${index + 1}`);
      
      const chapterData = await response.json();
      
      // Cache the loaded chapter
      chapterCache.current[cacheKey] = chapterData;

      // Update the specific chapter in state
      setChapters(prev => {
        if (!prev) return prev;
        const updated = [...prev];
        updated[index] = {
          ...updated[index],
          title: chapterData.title || `Chapter ${index + 1}`,
          body_html: chapterData.body_html || '',
          images: chapterData.images || [],
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
    } finally {
      setChapterLoading(false);
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

  const rawContent = chapters && chapters[activeChapterIndex]?.body_html || '';
  const currentContent = resource ? resolveImageSources(rawContent, resource.storage_base_url) : rawContent;
  const isLastChapter = chapters ? activeChapterIndex === chapters.length - 1 : true;
  const access = resource ? canAccessResource(effectiveTier, resource.category, activeChapterIndex) : { allowed: true };

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: 'var(--ios-bg)' }}>
      <RefreshCw className="animate-spin" size={32} color="var(--ios-olive)" />
    </div>
  );
  
  if (!resource) return <div style={{ padding: '4rem', textAlign: 'center' }}>Document not found.</div>;

  return (
    <div className="reader-container animate-fade-in">
      <div className="reader-nav">
        <div className="nav-inner">
          <Link to="/learning-center" className="back-link">
            <ArrowLeft size={18} /> Back to Library
          </Link>
          <div className="nav-actions">
            <button onClick={() => window.print()} className="nav-icon-btn"><Clock size={18} /></button>
            <button className="nav-icon-btn"><Share2 size={18} /></button>
          </div>
        </div>
      </div>
      
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
                      onClick={() => {
                        setActiveChapterIndex(idx);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
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
              {!access.allowed ? (
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
              ) : chapterLoading && !chapters?.[activeChapterIndex]?.loaded ? (
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
                    onClick={() => {
                      setActiveChapterIndex(activeChapterIndex - 1);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
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
                    onClick={() => {
                      setActiveChapterIndex(activeChapterIndex + 1);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
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

      <style dangerouslySetInnerHTML={{ __html: `
        .reader-container {
          min-height: 100vh;
          background: #f8fafc;
          padding-bottom: 5rem;
          padding-top: 80px;
        }
        .scroll-progress-container {
          position: fixed;
          top: 64px; /* Header height */
          left: 0;
          width: 100%;
          height: 4px;
          background: rgba(0,0,0,0.05);
          z-index: 100;
        }
        .scroll-progress-bar {
          height: 100%;
          background: var(--ios-olive);
          transition: width 0.1s ease-out;
        }
        .reader-nav {
          background: white;
          border-bottom: 1px solid rgba(0,0,0,0.05);
          padding: 1rem 0;
          margin-bottom: 3rem;
        }
        .nav-inner {
          max-width: 1000px;
          margin: 0 auto;
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0 1.5rem;
        }
        .back-link {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: #64748b;
          text-decoration: none;
          font-weight: 600;
          font-size: 0.9rem;
          transition: color 0.2s;
        }
        .back-link:hover { color: var(--ios-olive); }
        .nav-actions { display: flex; gap: 0.5rem; }
        .nav-icon-btn {
          background: none;
          border: none;
          color: #94a3b8;
          cursor: pointer;
          padding: 0.5rem;
          border-radius: 8px;
          transition: all 0.2s;
        }
        .nav-icon-btn:hover { background: #f1f5f9; color: var(--ios-olive); }
        
        .reader-main {
          max-width: 1000px;
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
          background: rgba(75, 107, 50, 0.1);
          color: var(--ios-olive);
          padding: 0.25rem 0.75rem;
          border-radius: 99px;
          font-size: 0.75rem;
          font-weight: 700;
          text-transform: uppercase;
        }
        .category-tag {
          color: #94a3b8;
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .resource-title {
          font-size: 2.5rem;
          font-weight: 800;
          color: #1e293b;
          line-height: 1.2;
          margin-bottom: 1rem;
          letter-spacing: -0.03em;
        }
        .reading-time {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          color: #94a3b8;
          font-size: 0.85rem;
        }
        
        .reader-card {
          padding: 4rem 5rem;
          user-select: none;
          background: #ffffff;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);
          border-radius: 12px;
          border: 1px solid #e2e8f0;
          min-width: 0;
          overflow-wrap: break-word;
          word-wrap: break-word;
        }
        .reader-content {
          font-family: 'Merriweather', serif;
          line-height: 1.8;
          font-size: 1.1rem;
          color: #1e293b;
        }
        .reader-content h1, .reader-content h2, .reader-content h3, .reader-content h4 {
          font-family: 'Inter', sans-serif;
          color: var(--ios-olive);
          font-weight: 700;
          letter-spacing: -0.02em;
          margin-top: 2.5rem;
          margin-bottom: 1.25rem;
          line-height: 1.3;
        }
        .reader-content h1 { font-size: 2.25rem; border-bottom: 1px solid #e2e8f0; padding-bottom: 0.5rem; }
        .reader-content h2 { font-size: 1.75rem; }
        .reader-content h3 { font-size: 1.4rem; }
        
        .reader-content p { margin-bottom: 1.5rem; }
        
        /* Drop Cap for first paragraph of a chapter */
        .reader-content > p:first-of-type::first-letter {
          float: left;
          font-size: 4.5rem;
          line-height: 0.8;
          padding-top: 4px;
          padding-right: 8px;
          padding-left: 3px;
          font-family: 'Inter', sans-serif;
          font-weight: 800;
          color: var(--ios-olive);
        }
        
        /* Premium Blockquote / Pull Quote styling */
        .reader-content blockquote {
          margin: 2.5rem -1.5rem;
          padding: 1.5rem 2rem;
          background: #f8fafc;
          border-left: 4px solid var(--ios-olive);
          font-style: italic;
          color: #334155;
          font-size: 1.25rem;
          line-height: 1.6;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.02);
        }
        
        /* Educational Callout Boxes (e.g. DID YOU KNOW?) */
        .reader-content blockquote:has(strong:first-child:contains('DID YOU KNOW')),
        .reader-content blockquote:has(strong:first-child:contains('💡')) {
          margin: 2.5rem 0;
          padding: 1.5rem;
          background: rgba(75, 107, 50, 0.05);
          border: 1px solid rgba(75, 107, 50, 0.2);
          border-left: 4px solid var(--ios-olive);
          border-radius: 8px;
          font-style: normal;
          color: #1e293b;
          font-size: 1.05rem;
        }
        
        .reader-content blockquote p:last-child { margin-bottom: 0; }
        
        /* Highlight EX / Solution bolding */
        .reader-content p strong:first-child {
          color: var(--ios-olive);
        }
        
        /* Lists */
        .reader-content ul, .reader-content ol {
          margin-bottom: 1.5rem;
          padding-left: 1.5rem;
        }
        .reader-content li { margin-bottom: 0.5rem; }
        .reader-content li::marker { color: var(--ios-olive); font-weight: 600; }
        
        /* Inline code */
        .reader-content code {
          background: #f1f5f9;
          padding: 0.2rem 0.4rem;
          border-radius: 4px;
          font-family: monospace;
          font-size: 0.9em;
          color: #ef4444;
        }

        /* Image Styling - Magazine layout */
        .reader-content img { 
          max-width: calc(100% + 3rem); 
          width: calc(100% + 3rem);
          margin: 2.5rem -1.5rem; 
          height: auto; 
          border-radius: 0; 
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.08); 
          display: block;
        }
        
        @media (min-width: 768px) {
          .reader-content img {
            max-width: 100%;
            width: 100%;
            margin: 3rem 0;
            border-radius: 12px;
          }
          .reader-content blockquote {
            margin: 2.5rem 0;
            border-radius: 0 8px 8px 0;
          }
        }
        
        /* Image Captions (if italic text follows image) */
        .reader-content img + p > em {
          display: block;
          text-align: center;
          font-size: 0.9rem;
          color: #64748b;
          margin-top: -1.5rem;
          margin-bottom: 2.5rem;
        }
        
        .reader-content pre { 
          white-space: pre-wrap; 
          word-break: break-all; 
          overflow-x: auto; 
          max-width: 100%; 
          background: #0f172a;
          color: #f8fafc;
          padding: 1.5rem;
          border-radius: 8px;
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
          box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
          border-radius: 12px;
          border: 1px solid #e2e8f0;
        }
        
        .reader-content table { 
          width: 100%; 
          border-collapse: separate; 
          border-spacing: 0;
          font-family: 'Inter', sans-serif;
          font-size: 0.95rem;
          min-width: 600px;
        }
        .reader-content th, .reader-content td { 
          padding: 1rem 1.25rem; 
          text-align: left; 
          border-bottom: 1px solid #e2e8f0;
          border-right: 1px solid #e2e8f0;
        }
        .reader-content th:last-child, .reader-content td:last-child {
          border-right: none;
        }
        .reader-content tr:last-child td {
          border-bottom: none;
        }
        .reader-content th { 
          background-color: #f8fafc; 
          font-weight: 600; 
          color: #334155; 
        }
        .reader-content tr:nth-child(even) td {
          background-color: #fcfcfd;
        }
        
        .reader-footer {
          margin-top: 4rem;
          padding-top: 2rem;
          border-top: 1px solid #f1f5f9;
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
          background: var(--ios-olive);
          color: white;
          cursor: pointer;
          transition: all 0.3s;
          box-shadow: 0 10px 20px rgba(75, 107, 50, 0.2);
        }
        .mark-read-btn:hover { transform: translateY(-2px); box-shadow: 0 15px 25px rgba(75, 107, 50, 0.3); }
        .mark-read-btn.completed {
          background: #22c55e;
          cursor: default;
          box-shadow: none;
        }
        
        .empty-state {
          text-align: center;
          padding: 4rem 2rem;
          background: #f8fafc;
          border-radius: 16px;
          border: 2px dashed #e2e8f0;
          color: #94a3b8;
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
          border: 1px solid #e2e8f0;
          background: white;
          color: #475569;
          font-size: 0.9rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          white-space: nowrap;
          box-shadow: 0 2px 4px rgba(0,0,0,0.02);
        }
        .tab-btn:hover { background: #f8fafc; color: var(--ios-olive); border-color: #cbd5e1; }
        .tab-btn.active { background: var(--ios-olive); color: white; border-color: var(--ios-olive); box-shadow: 0 4px 10px rgba(75, 107, 50, 0.25); }
        .tab-btn .chap-num { width: 22px; height: 22px; background: #e2e8f0; border-radius: 100px; display: flex; align-items: center; justify-content: center; font-size: 0.7rem; color: #64748b; }
        .tab-btn.active .chap-num { background: rgba(255,255,255,0.25); color: white; }
        
        .chapter-title { font-size: 2rem; color: #0f172a; margin-bottom: 2rem; padding-bottom: 1rem; border-bottom: 1px solid #f1f5f9; }
        
        .btn-paginate {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 1rem 2rem;
          border-radius: 99px;
          border: 1px solid #e2e8f0;
          background: white;
          color: #475569;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
        }
        .btn-paginate:hover { background: #f8fafc; color: var(--ios-olive); }
        .btn-paginate.primary { background: var(--ios-olive); color: white; border: none; box-shadow: 0 4px 6px -1px rgba(75, 107, 50, 0.2); }
        .btn-paginate.primary:hover { transform: translateY(-2px); box-shadow: 0 10px 15px -3px rgba(75, 107, 50, 0.3); color: white; }
        
        @media (max-width: 600px) {
          .reader-card { padding: 2rem 1.5rem; }
          .resource-title { font-size: 1.75rem; }
          .reader-footer { flex-direction: column; gap: 1rem; }
          .reader-footer button { width: 100%; justify-content: center; }
        }
      `}} />
    </div>
  );
};

export default SecureReader;
