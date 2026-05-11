import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Plus, Book, FileText, HelpCircle, ChevronRight, Search, Briefcase, RefreshCw } from 'lucide-react';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ resources: 0, quizzes: 0, exams: 0, jobs: 0 });
  const [recentExams, setRecentExams] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const session = localStorage.getItem('admin_session');
    if (!session) {
      navigate('/admin/login');
      return;
    }
    fetchDashboardData();
  }, [navigate]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [resCount, quizCount, resources] = await Promise.all([
        supabase.from('resources').select('*', { count: 'exact', head: true }),
        supabase.from('quizzes').select('*', { count: 'exact', head: true }),
        supabase.from('resources').select('id, title, exam_name, category').order('created_at', { ascending: false }).limit(10)
      ]);

      // Count unique exams from all resources
      const { data: allResources } = await supabase.from('resources').select('exam_name');
      const uniqueExams = allResources ? new Set(allResources.map(r => r.exam_name)).size : 0;

      // Fetch Jobs count from Engine
      let jobsCount = 0;
      try {
        const ENGINE_URL = import.meta.env.VITE_ENGINE_URL || 'https://veernxt-profiling-engine.onrender.com';
        const jobRes = await fetch(`${ENGINE_URL}/api/jobs`);
        const jobData = await jobRes.json();
        if (jobData.ok) jobsCount = jobData.count;
      } catch (e) {
        console.warn('Could not fetch jobs count for stats');
      }

      setStats({
        resources: resCount.count || 0,
        quizzes: quizCount.count || 0,
        exams: uniqueExams,
        jobs: jobsCount
      });
      setRecentExams(resources.data || []);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-container">
      <div className="admin-header">
        <div className="header-content">
          <h1>Content Factory</h1>
          <p>Rapidly populate the VeerNXT Learning Center</p>
        </div>
        <div className="header-actions">
          <Link to="/admin/content" className="btn-action primary">
            <Plus size={18} /> New Resource
          </Link>
          <Link to="/admin/quiz" className="btn-action">
            <Plus size={18} /> New Quiz
          </Link>
          <Link to="/admin/jobs" className="btn-action primary">
            <RefreshCw size={18} /> Run Scraper
          </Link>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon res"><Book size={20} /></div>
          <div className="stat-info">
            <span className="stat-label">Total Resources</span>
            <span className="stat-value">{stats.resources}</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon quiz"><HelpCircle size={20} /></div>
          <div className="stat-info">
            <span className="stat-label">Total Quizzes</span>
            <span className="stat-value">{stats.quizzes}</span>
          </div>
        </div>
          <div className="stat-card">
            <div className="stat-icon exam"><Search size={20} /></div>
            <div className="stat-info">
              <span className="stat-label">Subject Categories</span>
              <span className="stat-value">{stats.exams}</span>
            </div>
          </div>
          <div className="stat-card" onClick={() => navigate('/admin/jobs')} style={{ cursor: 'pointer' }}>
            <div className="stat-icon res" style={{ background: 'var(--ios-olive)' }}><Briefcase size={20} /></div>
            <div className="stat-info">
              <span className="stat-label">Live Notifications</span>
              <span className="stat-value">{stats.jobs}</span>
            </div>
          </div>
        </div>

      <div className="content-section">
        <div className="section-header">
          <h2>Recent Activity</h2>
          <div className="search-box">
            <Search size={18} />
            <input 
              type="text" 
              placeholder="Search resources..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="exam-list">
          {recentExams.filter(item => !searchTerm || item.title?.toLowerCase().includes(searchTerm.toLowerCase())).map((item, idx) => (
            <div key={idx} className="exam-item">
              <div className="exam-main">
                <h3>{item.title || 'Untitled Resource'}</h3>
                <span>{item.exam_name} • {item.category}</span>
              </div>
              <div className="exam-actions">
                <button className="btn-outline" onClick={() => navigate(`/admin/content/${item.id}`)}>Manage Content</button>
                <ChevronRight size={20} />
              </div>
            </div>
          ))}
          {loading && <div className="loading-state">Syncing factory data...</div>}
        </div>
      </div>

      <style>{`
        .admin-container { padding: 2rem; max-width: 1200px; margin: 0 auto; }
        .admin-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 3rem; }
        .header-content h1 { font-size: 2rem; font-weight: 800; color: #0f172a; }
        .header-content p { color: #64748b; }
        
        .header-actions { display: flex; gap: 1rem; }
        .btn-action {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1.5rem;
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          color: #0f172a;
          font-weight: 700;
          text-decoration: none;
          transition: all 0.2s;
        }
        .btn-action.primary { background: var(--ios-olive); color: white; border: none; }
        .btn-action:hover { transform: translateY(-2px); box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }

        .stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.5rem; margin-bottom: 3rem; }
        .stat-card {
          background: white;
          padding: 1.5rem;
          border-radius: 20px;
          display: flex;
          align-items: center;
          gap: 1rem;
          border: 1px solid #f1f5f9;
        }
        .stat-icon {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
        }
        .stat-icon.res { background: #3b82f6; }
        .stat-icon.quiz { background: #8b5cf6; }
        .stat-icon.exam { background: #f59e0b; }
        .stat-label { display: block; font-size: 0.8rem; color: #64748b; font-weight: 600; }
        .stat-value { font-size: 1.5rem; font-weight: 800; color: #0f172a; }

        .content-section { background: white; padding: 2rem; border-radius: 24px; border: 1px solid #f1f5f9; }
        .section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; }
        .search-box {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background: #f8fafc;
          padding: 0.5rem 1rem;
          border-radius: 100px;
          border: 1px solid #e2e8f0;
          width: 300px;
        }
        .search-box input { background: transparent; border: none; outline: none; flex: 1; font-size: 0.9rem; }
        
        .exam-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1.25rem;
          border-bottom: 1px solid #f1f5f9;
          transition: background 0.2s;
        }
        .exam-item:hover { background: #f8fafc; }
        .exam-main h3 { font-size: 1rem; color: #0f172a; margin-bottom: 0.25rem; }
        .exam-main span { font-size: 0.8rem; color: #64748b; font-weight: 600; }
        
        .exam-actions { display: flex; align-items: center; gap: 1rem; color: #cbd5e1; }
        .btn-outline {
          padding: 0.5rem 1rem;
          background: transparent;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          font-size: 0.8rem;
          font-weight: 700;
          color: #475569;
          cursor: pointer;
        }
        .loading-state { padding: 2rem; text-align: center; color: #64748b; font-weight: 600; }
      `}</style>
    </div>
  );
};

export default AdminDashboard;
