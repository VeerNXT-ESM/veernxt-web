import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Book, FileText, Lock, PlayCircle, RefreshCw, Search, Heart, Video, CheckCircle } from 'lucide-react';

const LearningCenter = () => {
  const [resources, setResources] = useState([]);
  const [quizzes, setQuizzes] = useState([]);
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [selectedExam, setSelectedExam] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Sidebar Checkboxes
  const [showResources, setShowResources] = useState(true);
  const [showQuizzes, setShowQuizzes] = useState(true);

  useEffect(() => {
    const fetchInitialData = async () => {
      setLoading(true);
      try {
        const { data: examData } = await supabase
          .from('resources')
          .select('exam_name');
        if (examData) {
          const uniqueExams = [...new Set(examData.map(e => e.exam_name).filter(Boolean))].sort();
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
  }, [searchQuery, selectedExam]);

  const renderCard = (item, type) => {
    const isPremium = item.is_locked;
    return (
      <Link 
        key={item.id} 
        to={type === 'resource' ? `/reader/${item.id}` : `/quiz/${item.id}`} 
        className="course-card"
      >
        <div className="course-image-wrapper">
          <div 
            className="course-image"
            style={item.thumbnail_url ? { 
              backgroundImage: `url(${item.thumbnail_url})` 
            } : {
              background: 'linear-gradient(135deg, #4b6b32 0%, #2d411e 100%)'
            }}
          >
            {!item.thumbnail_url && (
              <div className="course-image-fallback">
                <span className="fallback-exam">{item.exam_name || 'Multi-Exam'}</span>
                <span className="fallback-title">{item.title}</span>
              </div>
            )}
          </div>
          {/* Top Right Badges */}
          <div className="course-badges">
            <span className="badge-alpha">A</span>
          </div>
          {/* Bottom Tags */}
          <div className="course-bottom-tags">
             <span className="tag-sale">{isPremium ? 'PREMIUM' : 'FREE ACCESS'}</span>
          </div>
        </div>

        <div className="course-content">
          <div className="course-tags">
            <span className="tag-light">{item.subject || 'General'}</span>
            <span className="tag-blue">{item.category || (type === 'resource' ? 'Study Material' : 'Mock Test')}</span>
            <Heart size={16} className="heart-icon" />
          </div>

          <h3 className="course-title" title={item.title}>
            {item.title}
          </h3>

          <div className="course-features">
            {type === 'resource' ? (
              <>
                <span><FileText size={12} /> {item.subject || 'Comprehensive Notes'}</span>
                <span><Video size={12} /> Video Solutions</span>
              </>
            ) : (
              <>
                <span><CheckCircle size={12} /> Latest Pattern</span>
                <span><PlayCircle size={12} /> Detailed Analysis</span>
              </>
            )}
          </div>

          <div className="course-footer">
            <div className="price-section">
              {isPremium ? (
                <>
                  <span className="price-current">₹999</span>
                  <span className="price-original">₹2999</span>
                  <span className="price-discount">(66% off)</span>
                </>
              ) : (
                <span className="price-current" style={{ color: '#22c55e' }}>FREE</span>
              )}
            </div>
          </div>
        </div>
      </Link>
    );
  };

  return (
    <div className="learning-wrapper">
      {/* Top Navigation Tabs */}
      <div className="top-nav-tabs">
        <div className="tabs-container">
          <button 
            className={`tab-item ${selectedExam === 'all' ? 'active' : ''}`}
            onClick={() => setSelectedExam('all')}
          >
            All Exams
          </button>
          {exams.map(exam => (
            <button 
              key={exam}
              className={`tab-item ${selectedExam === exam ? 'active' : ''}`}
              onClick={() => setSelectedExam(exam)}
            >
              {exam}
            </button>
          ))}
        </div>
      </div>

      <div className="learning-layout">
        {/* Left Sidebar */}
        <aside className="sidebar">
          <div className="sidebar-section">
            <h3 className="sidebar-title">Filters</h3>
            
            <div className="filter-group">
              <h4 className="filter-subtitle">Product Category</h4>
              <label className="checkbox-label">
                <input 
                  type="checkbox" 
                  checked={showResources} 
                  onChange={(e) => setShowResources(e.target.checked)} 
                />
                Study Materials
              </label>
              <label className="checkbox-label">
                <input 
                  type="checkbox" 
                  checked={showQuizzes} 
                  onChange={(e) => setShowQuizzes(e.target.checked)} 
                />
                Mock Tests
              </label>
            </div>
          </div>

          <div className="sidebar-section">
            <h4 className="filter-subtitle">Important Exams</h4>
            <div className="exam-links">
              <button 
                className={`exam-link ${selectedExam === 'all' ? 'active' : ''}`}
                onClick={() => setSelectedExam('all')}
              >
                All Exams
              </button>
              {exams.map(exam => (
                <button 
                  key={exam}
                  className={`exam-link ${selectedExam === exam ? 'active' : ''}`}
                  onClick={() => setSelectedExam(exam)}
                >
                  {exam} Coaching
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="main-content">
          <div className="content-header">
            <h1 className="main-title">
              {selectedExam === 'all' ? 'Government Exams' : selectedExam} Study Material 2026, Study Plan, Notes
            </h1>
            <p className="main-subtitle">
              Prepare effectively with the latest {selectedExam === 'all' ? '' : selectedExam} study notes and comprehensive mock tests.
            </p>
            
            <div className="search-box">
              <Search size={18} className="search-icon" />
              <input 
                type="text"
                placeholder="Search for courses, exams, or subjects..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {loading ? (
            <div className="loading-state">
              <RefreshCw className="animate-spin" size={32} />
              <p>Fetching latest courses...</p>
            </div>
          ) : (
            <div className="course-sections">
              
              {showResources && resources.length > 0 && (
                <div className="course-section">
                  <div className="section-header">
                    <h2>{selectedExam === 'all' ? 'All' : selectedExam} Study Materials ({resources.length})</h2>
                    <button className="view-all">View All</button>
                  </div>
                  <div className="course-grid">
                    {resources.map(item => renderCard(item, 'resource'))}
                  </div>
                </div>
              )}

              {showQuizzes && quizzes.length > 0 && (
                <div className="course-section">
                  <div className="section-header">
                    <h2>{selectedExam === 'all' ? 'All' : selectedExam} Mock Tests ({quizzes.length})</h2>
                    <button className="view-all">View All</button>
                  </div>
                  <div className="course-grid">
                    {quizzes.map(item => renderCard(item, 'quiz'))}
                  </div>
                </div>
              )}

              {(!showResources && !showQuizzes) || (resources.length === 0 && quizzes.length === 0) ? (
                <div className="empty-library">
                  <Book size={64} />
                  <h3>No courses found</h3>
                  <p>Try adjusting your search or filters.</p>
                </div>
              ) : null}

            </div>
          )}
        </main>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .learning-wrapper {
          background: #f8fafc;
          min-height: 100vh;
          font-family: 'Inter', system-ui, sans-serif;
        }

        /* Top Nav Tabs */
        .top-nav-tabs {
          background: #fff;
          border-bottom: 1px solid #e2e8f0;
          position: sticky;
          top: 64px; /* Adjust based on your App Navbar height */
          z-index: 40;
        }
        .tabs-container {
          max-width: 1400px;
          margin: 0 auto;
          display: flex;
          overflow-x: auto;
          scrollbar-width: none;
          padding: 0 1rem;
        }
        .tabs-container::-webkit-scrollbar { display: none; }
        .tab-item {
          padding: 1rem 1.5rem;
          white-space: nowrap;
          color: #64748b;
          font-weight: 600;
          font-size: 0.9rem;
          border-bottom: 3px solid transparent;
          transition: all 0.2s;
        }
        .tab-item:hover { color: #1e293b; }
        .tab-item.active {
          color: #ef4444; /* Red accent matching screenshot */
          border-bottom-color: #ef4444;
        }

        /* Layout */
        .learning-layout {
          max-width: 1400px;
          margin: 0 auto;
          display: flex;
          gap: 2rem;
          padding: 2rem 1rem;
        }

        /* Sidebar */
        .sidebar {
          width: 260px;
          flex-shrink: 0;
          display: flex;
          flex-direction: column;
          gap: 2rem;
        }
        @media (max-width: 900px) {
          .sidebar { display: none; } /* Hide on mobile for simplicity, could add a drawer later */
        }
        .sidebar-section {
          background: #fff;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 1.5rem;
        }
        .sidebar-title {
          font-size: 1.1rem;
          font-weight: 700;
          color: #0f172a;
          margin-bottom: 1.5rem;
          padding-bottom: 0.75rem;
          border-bottom: 1px solid #f1f5f9;
        }
        .filter-subtitle {
          font-size: 0.9rem;
          font-weight: 700;
          color: #334155;
          margin-bottom: 1rem;
        }
        .filter-group {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }
        .checkbox-label {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          font-size: 0.9rem;
          color: #475569;
          cursor: pointer;
        }
        .checkbox-label input[type="checkbox"] {
          width: 16px;
          height: 16px;
          accent-color: var(--ios-olive, #4b6b32);
          cursor: pointer;
        }

        .exam-links {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        .exam-link {
          text-align: left;
          font-size: 0.9rem;
          color: #3b82f6;
          padding: 0.5rem;
          border-radius: 6px;
          transition: background 0.2s;
        }
        .exam-link:hover { background: #eff6ff; }
        .exam-link.active { font-weight: 700; background: #eff6ff; }

        /* Main Content */
        .main-content {
          flex: 1;
          min-width: 0;
        }
        .content-header {
          margin-bottom: 2rem;
        }
        .main-title {
          font-size: 1.75rem;
          font-weight: 700;
          color: #0f172a;
          margin-bottom: 0.5rem;
        }
        .main-subtitle {
          color: #64748b;
          font-size: 0.95rem;
          margin-bottom: 1.5rem;
        }

        .search-box {
          position: relative;
          max-width: 600px;
        }
        .search-icon {
          position: absolute;
          left: 1rem;
          top: 50%;
          transform: translateY(-50%);
          color: #94a3b8;
        }
        .search-box input {
          width: 100%;
          padding: 1rem 1rem 1rem 3rem;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
          background: #fff;
          font-size: 1rem;
          box-shadow: 0 2px 4px rgba(0,0,0,0.02);
          transition: all 0.2s;
        }
        .search-box input:focus {
          border-color: var(--ios-olive, #4b6b32);
          box-shadow: 0 0 0 3px rgba(75, 107, 50, 0.1);
          outline: none;
        }

        /* Course Sections */
        .course-sections {
          display: flex;
          flex-direction: column;
          gap: 3rem;
        }
        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.25rem;
        }
        .section-header h2 {
          font-size: 1.25rem;
          font-weight: 700;
          color: #0f172a;
        }
        .view-all {
          color: #3b82f6;
          font-size: 0.9rem;
          font-weight: 600;
        }
        .view-all:hover { text-decoration: underline; }

        .course-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
          gap: 1.5rem;
        }

        /* Flat Course Card (Screenshot 2 Match) */
        .course-card {
          background: #fff;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          text-decoration: none;
          color: inherit;
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .course-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 24px rgba(0,0,0,0.06);
        }
        
        .course-image-wrapper {
          position: relative;
          aspect-ratio: 1 / 1;
          background: #f1f5f9;
        }
        .course-image {
          width: 100%;
          height: 100%;
          background-size: cover;
          background-position: center;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .course-image-fallback {
          padding: 1.5rem;
          text-align: center;
          color: white;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        .fallback-exam {
          font-size: 0.75rem;
          font-weight: 800;
          letter-spacing: 0.05em;
          color: rgba(255,255,255,0.8);
          background: rgba(0,0,0,0.3);
          padding: 0.2rem 0.5rem;
          border-radius: 4px;
          display: inline-block;
          margin: 0 auto;
        }
        .fallback-title {
          font-size: 1.25rem;
          font-weight: 800;
          line-height: 1.2;
        }

        .course-badges {
          position: absolute;
          top: 0.5rem;
          right: 0.5rem;
        }
        .badge-alpha {
          background: #000;
          color: #fbbf24; /* Yellow A */
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          font-size: 0.8rem;
          border-radius: 4px;
        }

        .course-bottom-tags {
          position: absolute;
          bottom: -10px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 10;
        }
        .tag-sale {
          background: #fbbf24;
          color: #000;
          font-size: 0.7rem;
          font-weight: 800;
          padding: 0.25rem 0.75rem;
          border-radius: 12px;
          white-space: nowrap;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        .course-content {
          padding: 1.5rem 1.25rem 1.25rem;
          display: flex;
          flex-direction: column;
          flex: 1;
        }
        .course-tags {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 0.75rem;
        }
        .tag-light {
          background: #f1f5f9;
          color: #475569;
          font-size: 0.65rem;
          font-weight: 600;
          padding: 0.2rem 0.4rem;
          border-radius: 4px;
        }
        .tag-blue {
          background: #eff6ff;
          color: #3b82f6;
          font-size: 0.65rem;
          font-weight: 600;
          padding: 0.2rem 0.4rem;
          border-radius: 4px;
        }
        .heart-icon {
          margin-left: auto;
          color: #cbd5e1;
        }
        .heart-icon:hover { color: #ef4444; fill: #ef4444; }

        .course-title {
          font-size: 0.95rem;
          font-weight: 700;
          color: #0f172a;
          line-height: 1.4;
          margin-bottom: 1rem;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .course-features {
          display: flex;
          gap: 1rem;
          margin-bottom: 1.25rem;
        }
        .course-features span {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          font-size: 0.75rem;
          color: #64748b;
        }

        .course-footer {
          margin-top: auto;
          padding-top: 1rem;
          border-top: 1px dashed #e2e8f0;
        }
        .price-section {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .price-current {
          font-size: 1.1rem;
          font-weight: 800;
          color: #0f172a;
        }
        .price-original {
          font-size: 0.8rem;
          color: #94a3b8;
          text-decoration: line-through;
        }
        .price-discount {
          font-size: 0.8rem;
          color: #22c55e;
          font-weight: 600;
        }

        .loading-state, .empty-library {
          text-align: center;
          padding: 6rem 0;
          color: #94a3b8;
        }
        .loading-state p { margin-top: 1rem; font-weight: 600; }
        .empty-library h3 { color: #1e293b; margin: 1.5rem 0 0.5rem; }
      `}} />
    </div>
  );
};

export default LearningCenter;

