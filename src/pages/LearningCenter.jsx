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
  const [selectedExams, setSelectedExams] = useState(['all']);
  const [selectedCategories, setSelectedCategories] = useState(['all']);
  const [searchQuery, setSearchQuery] = useState('');
  
  const AVAILABLE_CATEGORIES = [
    'Intro',
    'Guide Book',
    'Precis',
    '10 Years PYQ',
    'Test Series'
  ];

  const handleCategoryCheckboxChange = (category) => {
    setSelectedCategories(prev => {
      if (category === 'all') return ['all'];
      let newSelection = prev.filter(c => c !== 'all');
      if (newSelection.includes(category)) {
        newSelection = newSelection.filter(c => c !== category);
      } else {
        newSelection.push(category);
      }
      if (newSelection.length === 0) return ['all'];
      return newSelection;
    });
  };

  const handleExamCheckboxChange = (examName) => {
    setSelectedExams(prev => {
      if (examName === 'all') {
        return ['all'];
      }
      let newSelection = prev.filter(e => e !== 'all');
      if (newSelection.includes(examName)) {
        newSelection = newSelection.filter(e => e !== examName);
      } else {
        newSelection.push(examName);
      }
      if (newSelection.length === 0) {
        return ['all'];
      }
      return newSelection;
    });
  };

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
    setResources([]);
    setQuizzes([]);
    
    try {
      let resQuery = supabase.from('resources').select('*').eq('status', 'Published');
      let quizQuery = supabase.from('quizzes').select('*').eq('status', 'Published');

      if (!selectedExams.includes('all')) {
        resQuery = resQuery.in('exam_name', selectedExams);
        quizQuery = quizQuery.in('exam_name', selectedExams);
      }

      if (!selectedCategories.includes('all')) {
        const catFilters = selectedCategories.map(c => {
          if (c === '10 Years PYQ') return 'category.ilike."%PYQ%"';
          if (c === 'Test Series') return 'category.ilike."%Mock Test%"';
          if (c === 'Guide Book') return 'category.ilike."%Guide%"';
          return `category.ilike."%${c}%"`;
        }).join(',');
        resQuery = resQuery.or(catFilters);
        quizQuery = quizQuery.or(catFilters);
      }

      if (searchQuery) {
        const filter = `title.ilike."%${searchQuery}%",subject.ilike."%${searchQuery}%",exam_name.ilike."%${searchQuery}%"`;
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
  }, [searchQuery, selectedExams, selectedCategories]);

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
            <span className="tag-olive">{item.category || (type === 'resource' ? 'Study Material' : 'Mock Test')}</span>
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
                <span className="price-current" style={{ color: '#4b6b32' }}>FREE</span>
              )}
            </div>
          </div>
        </div>
      </Link>
    );
  };

  return (
    <div className="learning-wrapper">
      <div className="learning-layout">
        {/* Left Sidebar */}
        <aside className="sidebar">
          <div className="sidebar-section">
            <h3 className="sidebar-title">Filters</h3>
            
            <div className="filter-group">
              <h4 className="filter-subtitle">Content Type</h4>
              <div className="checkbox-filter-group">
                <label className="checkbox-label">
                  <input 
                    type="checkbox" 
                    checked={selectedCategories.includes('all')} 
                    onChange={() => handleCategoryCheckboxChange('all')} 
                  />
                  <span className="checkbox-custom"></span>
                  <span className="checkbox-text">All Content</span>
                </label>
                {AVAILABLE_CATEGORIES.map(category => (
                  <label key={category} className="checkbox-label">
                    <input 
                      type="checkbox" 
                      checked={selectedCategories.includes(category)} 
                      onChange={() => handleCategoryCheckboxChange(category)} 
                    />
                    <span className="checkbox-custom"></span>
                    <span className="checkbox-text">{category}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="sidebar-section">
            <h4 className="filter-subtitle">Important Exams</h4>
            <div className="checkbox-filter-group">
              <label className="checkbox-label">
                <input 
                  type="checkbox" 
                  checked={selectedExams.includes('all')} 
                  onChange={() => handleExamCheckboxChange('all')} 
                />
                <span className="checkbox-custom"></span>
                <span className="checkbox-text">All Exams</span>
              </label>
              {exams.map(exam => (
                <label key={exam} className="checkbox-label">
                  <input 
                    type="checkbox" 
                    checked={selectedExams.includes(exam)} 
                    onChange={() => handleExamCheckboxChange(exam)} 
                  />
                  <span className="checkbox-custom"></span>
                  <span className="checkbox-text">{exam}</span>
                </label>
              ))}
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="main-content">
          <div className="content-header">
            <h1 className="main-title">
              {selectedExams.includes('all') ? 'Government Exams' : selectedExams.join(', ')} Study Material 2026, Study Plan, Notes
            </h1>
            <p className="main-subtitle">
              Prepare effectively with the latest {selectedExams.includes('all') ? '' : selectedExams.join(', ')} study notes and comprehensive mock tests.
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
              
              {resources.length > 0 && (
                <div className="course-section">
                  <div className="section-header">
                    <h2>{selectedExams.includes('all') ? 'All' : selectedExams.join(', ')} Study Materials ({resources.length})</h2>
                    <button className="view-all">View All</button>
                  </div>
                  <div className="course-grid">
                    {resources.map(item => renderCard(item, 'resource'))}
                  </div>
                </div>
              )}

              {quizzes.length > 0 && (
                <div className="course-section">
                  <div className="section-header">
                    <h2>{selectedExams.includes('all') ? 'All' : selectedExams.join(', ')} Mock Tests ({quizzes.length})</h2>
                    <button className="view-all">View All</button>
                  </div>
                  <div className="course-grid">
                    {quizzes.map(item => renderCard(item, 'quiz'))}
                  </div>
                </div>
              )}

              {resources.length === 0 && quizzes.length === 0 ? (
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
          .sidebar { display: none; } /* Hide on mobile for simplicity */
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
        
        /* Premium Custom Checkboxes */
        .checkbox-label {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          font-size: 0.9rem;
          color: #475569;
          cursor: pointer;
          user-select: none;
          position: relative;
          transition: color 0.2s;
        }
        .checkbox-label input[type="checkbox"] {
          position: absolute;
          opacity: 0;
          cursor: pointer;
          height: 0;
          width: 0;
        }
        .checkbox-custom {
          width: 18px;
          height: 18px;
          border: 2px solid #cbd5e1;
          border-radius: 4px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background-color: #fff;
          transition: all 0.2s ease;
          flex-shrink: 0;
        }
        .checkbox-label:hover .checkbox-custom {
          border-color: #4b6b32;
        }
        .checkbox-label input:checked ~ .checkbox-custom {
          background-color: #4b6b32;
          border-color: #4b6b32;
        }
        .checkbox-custom::after {
          content: "";
          display: none;
          width: 5px;
          height: 9px;
          border: solid white;
          border-width: 0 2px 2px 0;
          transform: rotate(45deg);
          margin-bottom: 2px;
        }
        .checkbox-label input:checked ~ .checkbox-custom::after {
          display: block;
        }
        .checkbox-label input:checked ~ .checkbox-text {
          color: #1F3A2E;
          font-weight: 600;
        }
        .checkbox-filter-group {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

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
          border-color: #4b6b32;
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
          color: #4b6b32;
          font-size: 0.9rem;
          font-weight: 600;
          background: none;
          border: none;
          cursor: pointer;
          transition: color 0.2s;
        }
        .view-all:hover {
          color: #2d411e;
          text-decoration: underline;
        }

        .course-grid {
          display: grid;
          grid-template-columns: repeat(1, 1fr);
          gap: 1.5rem;
        }
        @media (min-width: 600px) {
          .course-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        @media (min-width: 1024px) {
          .course-grid {
            grid-template-columns: repeat(4, 1fr);
          }
        }

        /* Flat Course Card */
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
          aspect-ratio: 3 / 4; /* Portrait book cover shape */
          background: #f8fafc;
          overflow: hidden;
        }
        .course-image {
          width: 100%;
          height: 100%;
          background-size: contain; /* Ensure the full cover thumbnail is fully visible */
          background-repeat: no-repeat;
          background-position: center;
          background-color: #f8fafc;
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
          background: #4b6b32;
          color: #fff;
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
          background: #eef2eb;
          color: #4b6b32;
          border: 1px solid rgba(75, 107, 50, 0.2);
          font-size: 0.7rem;
          font-weight: 800;
          padding: 0.25rem 0.75rem;
          border-radius: 12px;
          white-space: nowrap;
          box-shadow: 0 2px 4px rgba(0,0,0,0.02);
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
        .tag-olive {
          background: #eef2eb;
          color: #4b6b32;
          font-size: 0.65rem;
          font-weight: 600;
          padding: 0.2rem 0.4rem;
          border-radius: 4px;
        }
        .heart-icon {
          margin-left: auto;
          color: #cbd5e1;
          transition: color 0.2s, fill 0.2s;
        }
        .heart-icon:hover {
          color: #4b6b32;
          fill: #4b6b32;
        }

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
          color: #4b6b32;
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

