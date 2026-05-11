import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Briefcase, Calendar, ExternalLink, RefreshCw, Search, AlertCircle, Clock, MapPin, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const JobBoard = ({ isAdmin = false }) => {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [error, setError] = useState(null);

  const ENGINE_URL = import.meta.env.VITE_ENGINE_URL || 'https://veernxt-profiling-engine.onrender.com';

  const fetchJobs = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${ENGINE_URL}/api/jobs`);
      if (response.data.ok) {
        setJobs(response.data.jobs);
      }
    } catch (err) {
      console.error('Failed to fetch jobs:', err);
      setError('Could not connect to the job engine. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const response = await axios.post(`${ENGINE_URL}/api/jobs/refresh`);
      if (response.data.ok) {
        alert(`Refresh complete! Found ${response.data.newEntriesCount} new entries.`);
        fetchJobs();
      }
    } catch (err) {
      console.error('Refresh failed:', err);
      alert('Refresh failed: ' + err.message);
    } finally {
      setRefreshing(false);
    }
  };

  const filteredJobs = jobs.filter(job => 
    job.title.toLowerCase().includes(search.toLowerCase()) || 
    job.body.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="jobs-container animate-fade-in">
      <div className="jobs-header">
          {isAdmin && (
            <button 
              onClick={() => navigate('/admin')} 
              className="btn-secondary ios-pill" 
              style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
            >
              <ArrowLeft size={14} /> Back to Admin
            </button>
          )}
          <h1 style={{ fontSize: '2.5rem', fontWeight: '800', tracking: '-0.03em' }}>Live Job Board</h1>
          <p style={{ color: '#666', fontSize: '1.1rem' }}>Aggregated notifications from SSC, IBPS, Railways, and State PSCs.</p>
        </div>
        
        {isAdmin && (
          <button 
            onClick={handleRefresh} 
            disabled={refreshing}
            className="btn-secondary ios-pill"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'white' }}
          >
            {refreshing ? <RefreshCw className="animate-spin" size={16} /> : <RefreshCw size={16} />}
            {refreshing ? 'Scraping...' : 'Refresh Job Board'}
          </button>
        )}
      </div>

      <div className="search-bar-wrapper">
        <div className="search-input-container">
          <Search size={18} className="search-icon" />
          <input 
            type="text" 
            placeholder="Search by exam name, department or keyword..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="ios-input"
          />
        </div>
        <div className="job-count">
          Showing {filteredJobs.length} active notifications
        </div>
      </div>

      {loading ? (
        <div className="loading-state">
          <RefreshCw className="animate-spin" size={48} color="var(--ios-olive)" />
          <p>Syncing latest vacancies...</p>
        </div>
      ) : error ? (
        <div className="error-state">
          <AlertCircle size={48} color="#ef4444" />
          <p>{error}</p>
          <button onClick={fetchJobs} className="btn-primary ios-pill">Retry</button>
        </div>
      ) : (
        <div className="jobs-grid">
          {filteredJobs.length > 0 ? (
            filteredJobs.map((job, idx) => (
              <div key={idx} className="job-card ios-card animate-fade-in" style={{ animationDelay: `${idx * 0.05}s` }}>
                <div className="job-card-top">
                  <div className="body-badge">{job.body}</div>
                  {job.lastDate && (
                    <div className="date-badge warning">
                      <Clock size={12} />
                      Last Date: {new Date(job.lastDate).toLocaleDateString()}
                    </div>
                  )}
                </div>
                
                <h3 className="job-title">{job.title}</h3>
                
                <div className="job-details">
                  <div className="detail-item">
                    <Calendar size={14} />
                    <span>Posted: {job.publishedOn ? new Date(job.publishedOn).toLocaleDateString() : 'Recent'}</span>
                  </div>
                  {job.vacancies && (
                    <div className="detail-item">
                      <Briefcase size={14} />
                      <span>{job.vacancies} Vacancies</span>
                    </div>
                  )}
                </div>

                <div className="job-footer">
                  <a href={job.url} target="_blank" rel="noopener noreferrer" className="btn-primary ios-pill view-btn">
                    View Notification <ExternalLink size={14} />
                  </a>
                </div>
              </div>
            ))
          ) : (
            <div className="no-results">
              <Search size={48} color="#ccc" />
              <h3>No jobs found matching "{search}"</h3>
              <p>Try different keywords or refresh the board.</p>
            </div>
          )}
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        .jobs-container {
          padding: 4rem 2rem;
          max-width: 1200px;
          margin: 0 auto;
        }
        .jobs-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          margin-bottom: 3rem;
        }
        .search-bar-wrapper {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
          gap: 2rem;
        }
        .search-input-container {
          position: relative;
          flex: 1;
        }
        .search-icon {
          position: absolute;
          left: 1.25rem;
          top: 50%;
          transform: translateY(-50%);
          color: #999;
        }
        .ios-input {
          width: 100%;
          padding: 1rem 1rem 1rem 3.5rem;
          border-radius: 16px;
          border: 1px solid rgba(0,0,0,0.1);
          background: white;
          font-size: 1rem;
          transition: all 0.2s;
        }
        .ios-input:focus {
          outline: none;
          border-color: var(--ios-olive);
          box-shadow: 0 0 0 4px rgba(111, 126, 88, 0.1);
        }
        .job-count {
          font-size: 0.9rem;
          color: #888;
          font-weight: 600;
          white-space: nowrap;
        }
        .jobs-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
          gap: 1.5rem;
        }
        .job-card {
          display: flex;
          flex-direction: column;
          padding: 1.5rem;
          transition: transform 0.2s, box-shadow 0.2s;
          border: 1px solid transparent;
        }
        .job-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 30px rgba(0,0,0,0.08);
          border-color: rgba(111, 126, 88, 0.2);
        }
        .job-card-top {
          display: flex;
          justify-content: space-between;
          margin-bottom: 1rem;
        }
        .body-badge {
          background: var(--ios-secondary);
          color: var(--ios-olive);
          padding: 0.35rem 0.75rem;
          border-radius: 8px;
          font-size: 0.75rem;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .date-badge {
          display: flex;
          align-items: center;
          gap: 0.35rem;
          font-size: 0.75rem;
          font-weight: 700;
          padding: 0.35rem 0.75rem;
          border-radius: 8px;
        }
        .date-badge.warning {
          background: #fff7ed;
          color: #c2410c;
        }
        .job-title {
          font-size: 1.15rem;
          font-weight: 700;
          line-height: 1.4;
          margin-bottom: 1.25rem;
          color: #1a1a1a;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          min-height: 3.2rem;
        }
        .job-details {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          margin-bottom: 1.5rem;
          flex-grow: 1;
        }
        .detail-item {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          font-size: 0.85rem;
          color: #666;
          font-weight: 500;
        }
        .view-btn {
          width: 100%;
          text-decoration: none;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          font-size: 0.9rem;
          font-weight: 700;
        }
        .loading-state, .error-state, .no-results {
          padding: 6rem 2rem;
          text-align: center;
          background: white;
          border-radius: 24px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1.5rem;
          box-shadow: 0 4px 20px rgba(0,0,0,0.02);
        }
        .error-state p { color: #ef4444; font-weight: 600; }
        .no-results h3 { font-weight: 800; margin: 0; }
        .no-results p { color: #888; }
        
        .animate-spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

        @media (max-width: 768px) {
          .jobs-header { flex-direction: column; align-items: flex-start; gap: 1.5rem; }
          .search-bar-wrapper { flex-direction: column; align-items: stretch; gap: 1rem; }
          .jobs-grid { grid-template-columns: 1fr; }
        }
      `}} />
    </div>
  );
};

export default JobBoard;
