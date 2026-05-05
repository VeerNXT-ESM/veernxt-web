import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Book, FileText, Lock, PlayCircle, RefreshCw, Search } from 'lucide-react';

const LearningCenter = () => {
  const [resources, setResources] = useState([]);
  const [quizzes, setQuizzes] = useState([]);
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('resources');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedExam, setSelectedExam] = useState('all');

  useEffect(() => {
    const fetchInitialData = async () => {
      setLoading(true);
      try {
        const { data: examData } = await supabase
          .from('exams')
          .select('exam_name')
          .order('exam_name');
        if (examData) {
          // Unique exams only
          const uniqueExams = [...new Set(examData.map(e => e.exam_name))];
          setExams(uniqueExams);
        }
        await fetchContent();
      } catch (err) {
        console.error('Error in initial load:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchInitialData();
  }, []);

  const fetchContent = async () => {
    setLoading(true);
    try {
      let resQuery = supabase.from('resources').select('*');
      let quizQuery = supabase.from('quizzes').select('*');

      if (selectedExam !== 'all') {
        resQuery = resQuery.eq('exam_name', selectedExam);
        quizQuery = quizQuery.eq('exam_name', selectedExam);
      }

      if (searchQuery) {
        const filter = `title.ilike.%${searchQuery}%,subject.ilike.%${searchQuery}%,exam_name.ilike.%${searchQuery}%`;
        resQuery = resQuery.or(filter);
        quizQuery = quizQuery.or(filter);
      }

      const [resData, quizData] = await Promise.all([
        resQuery.order('created_at', { ascending: false }).limit(40),
        quizQuery.order('created_at', { ascending: false }).limit(40)
      ]);
      
      setResources(resData.data || []);
      setQuizzes(quizData.data || []);
    } catch (err) {
      console.error('Error fetching learning content:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchContent();
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery, selectedExam, activeTab]);

  const items = activeTab === 'resources' ? resources : quizzes;

  return (
    <div className="learning-wrapper">
      <div className="learning-content animate-fade-in">
        <div className="learning-header">
          <h1 className="header-title">Learning Center</h1>
          <p className="header-subtitle">Comprehensive study materials for your targeted government exams.</p>
          
          <div className="filter-controls">
            <div className="search-box">
              <Search size={18} className="search-icon" />
              <input 
                type="text"
                placeholder="Search by title, subject or exam..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <select 
              value={selectedExam}
              onChange={(e) => setSelectedExam(e.target.value)}
              className="exam-select"
            >
              <option value="all">All Exams</option>
              {exams.map((name, i) => (
                <option key={i} value={name}>{name}</option>
              ))}
            </select>
          </div>

          <div className="tab-switcher">
            <button 
              className={activeTab === 'resources' ? 'active' : ''} 
              onClick={() => setActiveTab('resources')}
            >
              <Book size={16} /> Study Guides
            </button>
            <button 
              className={activeTab === 'quizzes' ? 'active' : ''} 
              onClick={() => setActiveTab('quizzes')}
            >
              <PlayCircle size={16} /> Interactive Quizzes
            </button>
          </div>
        </div>

        {loading ? (
          <div className="loading-state">
            <RefreshCw className="animate-spin" size={32} />
            <p>Loading library...</p>
          </div>
        ) : (
          <div className="library-grid">
            {items.length > 0 ? (
              items.map((item) => (
                <Link 
                  key={item.id} 
                  to={activeTab === 'resources' ? `/reader/${item.id}` : `/quiz/${item.id}`} 
                  className="kindle-card"
                >
                  <div className="book-cover-wrapper">
                    <div className="book-cover">
                      <div className="book-spine"></div>
                      <div className="book-overlay"></div>
                      <div className="book-content">
                        <div className="book-tag">{item.subject || 'General'}</div>
                        <div className="book-main-title">{item.title}</div>
                        <div className="book-exam-name">{item.exam_name || 'Multi-Exam'}</div>
                      </div>
                      {item.is_locked ? (
                        <div className="book-badge locked"><Lock size={10} /> PREMIUM</div>
                      ) : (
                        <div className="book-badge free">FREE</div>
                      )}
                    </div>
                  </div>
                  <div className="book-details">
                    <h3 className="item-title">{item.title}</h3>
                    <p className="item-meta">{item.subject || 'Study Material'}</p>
                  </div>
                </Link>
              ))
            ) : (
              <div className="empty-library">
                <Book size={64} />
                <h3>No materials found</h3>
                <p>Try adjusting your search or filters to find what you're looking for.</p>
              </div>
            )}
          </div>
        )}
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .learning-wrapper {
          background: #fff;
          min-height: 100vh;
        }
        .learning-content {
          max-width: 1200px;
          margin: 0 auto;
          padding: 4rem 1.5rem;
        }
        .header-title {
          font-size: 3rem;
          font-weight: 800;
          letter-spacing: -0.04em;
          margin-bottom: 0.5rem;
        }
        .header-subtitle {
          color: #64748b;
          font-size: 1.1rem;
          margin-bottom: 3rem;
        }

        .filter-controls {
          display: flex;
          gap: 1rem;
          margin-bottom: 2rem;
          flex-wrap: wrap;
        }

        .search-box {
          flex: 1;
          min-width: 300px;
          position: relative;
        }
        .search-icon {
          position: absolute;
          left: 1.25rem;
          top: 50%;
          transform: translateY(-50%);
          color: #94a3b8;
        }
        .search-box input {
          width: 100%;
          padding: 1rem 1rem 1rem 3.5rem;
          border-radius: 16px;
          border: 1px solid #e2e8f0;
          background: #f8fafc;
          font-size: 1rem;
          transition: all 0.2s;
        }
        .search-box input:focus {
          background: #fff;
          border-color: var(--ios-olive);
          box-shadow: 0 0 0 4px rgba(75, 107, 50, 0.1);
          outline: none;
        }

        .exam-select {
          padding: 0 1.5rem;
          border-radius: 16px;
          border: 1px solid #e2e8f0;
          background: #f8fafc;
          font-weight: 600;
          color: #475569;
          cursor: pointer;
          max-width: 300px;
        }

        .tab-switcher {
          display: flex;
          gap: 0.5rem;
          background: #f1f5f9;
          padding: 0.4rem;
          border-radius: 14px;
          width: fit-content;
          margin-top: 1rem;
        }
        .tab-switcher button {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          padding: 0.75rem 1.5rem;
          border-radius: 10px;
          font-weight: 700;
          font-size: 0.9rem;
          transition: all 0.2s;
          color: #64748b;
        }
        .tab-switcher button.active {
          background: #fff;
          color: var(--ios-olive);
          box-shadow: 0 4px 12px rgba(0,0,0,0.05);
        }

        .library-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 3rem 2rem;
          margin-top: 4rem;
        }

        .kindle-card {
          text-decoration: none;
          transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        .kindle-card:hover {
          transform: translateY(-12px);
        }

        .book-cover-wrapper {
          perspective: 1000px;
        }

        .book-cover {
          aspect-ratio: 2/3;
          background: linear-gradient(135deg, #4b6b32 0%, #2d411e 100%);
          border-radius: 4px 12px 12px 4px;
          position: relative;
          display: flex;
          box-shadow: 15px 15px 30px rgba(0,0,0,0.1), 2px 2px 5px rgba(0,0,0,0.05);
          overflow: hidden;
          transform-style: preserve-3d;
        }

        .book-spine {
          width: 15px;
          height: 100%;
          background: rgba(0,0,0,0.3);
          border-right: 1px solid rgba(255,255,255,0.1);
        }

        .book-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(90deg, rgba(255,255,255,0.1) 0%, transparent 10%, transparent 90%, rgba(0,0,0,0.1) 100%);
          pointer-events: none;
        }

        .book-content {
          flex: 1;
          padding: 2rem 1.25rem;
          display: flex;
          flex-direction: column;
          justify-content: center;
          text-align: center;
          color: white;
        }

        .book-tag {
          font-size: 0.65rem;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.15em;
          margin-bottom: 0.75rem;
          color: rgba(255,255,255,0.6);
        }

        .book-main-title {
          font-size: 1.15rem;
          font-weight: 800;
          line-height: 1.3;
          margin-bottom: 1.5rem;
          display: -webkit-box;
          -webkit-line-clamp: 4;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .book-exam-name {
          font-size: 0.6rem;
          opacity: 0.7;
          font-weight: 600;
          text-transform: uppercase;
        }

        .book-badge {
          position: absolute;
          top: 0.75rem;
          right: 0.75rem;
          font-size: 0.6rem;
          font-weight: 900;
          padding: 0.3rem 0.6rem;
          border-radius: 6px;
        }
        .book-badge.free { background: #22c55e; color: white; }
        .book-badge.locked { background: #fbbf24; color: #000; }

        .book-details {
          margin-top: 1.25rem;
        }
        .item-title {
          font-size: 1rem;
          font-weight: 700;
          color: #1e293b;
          margin-bottom: 0.25rem;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .item-meta {
          font-size: 0.85rem;
          color: #94a3b8;
          font-weight: 500;
        }

        .loading-state {
          text-align: center;
          padding: 6rem 0;
          color: #94a3b8;
        }
        .loading-state p { margin-top: 1rem; font-weight: 600; }

        .empty-library {
          grid-column: 1 / -1;
          text-align: center;
          padding: 8rem 0;
          color: #94a3b8;
        }
        .empty-library h3 { color: #1e293b; margin: 1.5rem 0 0.5rem; }

        @media (max-width: 600px) {
          .library-grid { grid-template-columns: repeat(2, 1fr); gap: 2rem 1.5rem; }
          .header-title { font-size: 2rem; }
        }
      `}} />
    </div>
  );
};

export default LearningCenter;
