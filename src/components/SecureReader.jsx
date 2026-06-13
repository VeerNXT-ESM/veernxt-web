import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { ArrowLeft, CheckCircle, Clock, BookOpen, Share2, RefreshCw } from 'lucide-react';
import 'react-quill-new/dist/quill.snow.css';

const SecureReader = () => {
  const { id } = useParams();
  const [resource, setResource] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isRead, setIsRead] = useState(false);
  const [chapters, setChapters] = useState(null);
  const [activeChapterIndex, setActiveChapterIndex] = useState(0);

  useEffect(() => {
    const fetchResource = async () => {
      const { data } = await supabase
        .from('resources')
        .select('*')
        .eq('id', id)
        .single();
      
      setResource(data);
      console.log('[DEBUG VIEWER] raw body_html snippet:', data?.body_html?.substring(0, 300));
      
      let parsedChapters = null;

      if (data && data.body_html && data.body_html.trim().startsWith('[')) {
        try {
          const parsed = JSON.parse(data.body_html);
          if (Array.isArray(parsed) && parsed.length > 0) {
            parsedChapters = parsed;
          }
        } catch (e) {
          // Fallback to raw HTML
        }
      }

      if (parsedChapters && parsedChapters.length > 0) {
        setChapters(parsedChapters);
      } else {
        setChapters([{ id: 'page-1', title: 'Content', content: data?.body_html || '' }]);
      }
      
      setLoading(false);
    };

    fetchResource();

    // Prevent context menu
    const handleContextMenu = (e) => e.preventDefault();
    document.addEventListener('contextmenu', handleContextMenu);
    
    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [id]);

  const handleMarkAsRead = () => {
    setIsRead(true);
  };

  const currentContent = chapters ? chapters[activeChapterIndex].content : '';
  const isLastChapter = chapters ? activeChapterIndex === chapters.length - 1 : true;

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
          <h1 className="resource-title">{resource.title}</h1>
          <div className="reading-time">
            <Clock size={16} /> <span>{chapters ? `${chapters.length} Chapters` : '12 min read'}</span>
          </div>
        </header>

        <div className="reader-layout">
          {chapters && chapters.length > 1 && (
            <div className="toc-tabs">
              <div className="tabs-container">
                {chapters.map((chap, idx) => (
                  <button 
                    key={chap.id || idx} 
                    className={`tab-btn ${activeChapterIndex === idx ? 'active' : ''}`}
                    onClick={() => {
                      setActiveChapterIndex(idx);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                  >
                    <span className="chap-num">{idx + 1}</span> 
                    <span className="tab-title">{chap.title}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="glass-panel reader-card">
            <div className="reader-content ql-snow">
              <div className="ql-editor" dangerouslySetInnerHTML={{ __html: currentContent || '<div class="empty-state"><p>Content is being securely processed. Please check back shortly.</p></div>' }} />
            </div>
            
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
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .reader-container {
          min-height: 100vh;
          background: #f8fafc;
          padding-bottom: 5rem;
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
          max-width: 800px;
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
          max-width: 800px;
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
          padding: 4rem;
          user-select: none;
          line-height: 1.8;
          font-size: 1.15rem;
          color: #334155;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.05);
          min-width: 0; /* Prevent flex overflow */
          overflow-wrap: break-word;
          word-wrap: break-word;
        }
        .reader-content h2, .reader-content h3 {
          margin: 2rem 0 1rem;
          color: #0f172a;
        }
        .reader-content p { margin-bottom: 1.5rem; }
        .reader-content img { max-width: 100%; height: auto; border-radius: 8px; }
        .reader-content pre { white-space: pre-wrap; word-break: break-all; overflow-x: auto; max-width: 100%; }
        .reader-content table { width: 100%; table-layout: fixed; word-wrap: break-word; }
        
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
