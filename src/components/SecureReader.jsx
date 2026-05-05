import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { ArrowLeft, CheckCircle, Clock, BookOpen, Share2, RefreshCw } from 'lucide-react';

const SecureReader = () => {
  const { id } = useParams();
  const [resource, setResource] = useState(null);
  const [loading, setLoading] = useState(true);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [isRead, setIsRead] = useState(false);

  useEffect(() => {
    const fetchResource = async () => {
      const { data } = await supabase
        .from('resources')
        .select('*')
        .eq('id', id)
        .single();
      
      setResource(data);
      setLoading(false);
    };

    fetchResource();

    const handleScroll = () => {
      const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = (window.scrollY / totalHeight) * 100;
      setScrollProgress(progress);
    };

    window.addEventListener('scroll', handleScroll);
    
    // Prevent context menu
    const handleContextMenu = (e) => e.preventDefault();
    document.addEventListener('contextmenu', handleContextMenu);
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
      document.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [id]);

  const handleMarkAsRead = () => {
    setIsRead(true);
    // In a real app, you'd update a 'user_resource_progress' table here
  };

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: 'var(--ios-bg)' }}>
      <RefreshCw className="animate-spin" size={32} color="var(--ios-olive)" />
    </div>
  );
  
  if (!resource) return <div style={{ padding: '4rem', textAlign: 'center' }}>Document not found.</div>;

  return (
    <div className="reader-container animate-fade-in">
      {/* Progress Bar */}
      <div className="scroll-progress-container">
        <div className="scroll-progress-bar" style={{ width: `${scrollProgress}%` }}></div>
      </div>

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
            <Clock size={16} /> <span>12 min read</span>
          </div>
        </header>

        <div className="glass-panel reader-card">
          <div 
            className="reader-content"
            dangerouslySetInnerHTML={{ __html: resource.body_html || '<div class="empty-state"><p>Content is being securely processed. Please check back shortly.</p></div>' }} 
          />
          
          <div className="reader-footer">
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
        }
        .reader-content h2, .reader-content h3 {
          margin: 2rem 0 1rem;
          color: #0f172a;
        }
        .reader-content p { margin-bottom: 1.5rem; }
        
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
        
        @media (max-width: 600px) {
          .reader-card { padding: 2rem 1.5rem; }
          .resource-title { font-size: 1.75rem; }
        }
      `}} />
    </div>
  );
};

export default SecureReader;
