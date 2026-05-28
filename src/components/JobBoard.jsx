import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { 
  Briefcase, Calendar, ExternalLink, RefreshCw, Search, AlertCircle, Clock, 
  MapPin, ArrowLeft, ChevronLeft, ChevronRight, X, Sliders, Bookmark, 
  BarChart2, CheckCircle2, Award, ChevronDown, Sparkles
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const JobBoard = ({ isAdmin = false }) => {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedJob, setSelectedJob] = useState(null);
  const [userProfileName, setUserProfileName] = useState('Rahul Kumar');
  const [profileData, setProfileData] = useState(null);
  const [dismissedJobIds, setDismissedJobIds] = useState([]);
  const [showAllProfileMatched, setShowAllProfileMatched] = useState(false);

  const ENGINE_URL = import.meta.env.VITE_ENGINE_URL || 'https://veernxt-profiling-engine.onrender.com';

  const fetchJobs = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${ENGINE_URL}/api/jobs`);
      if (response.data.ok) {
        const loadedJobs = response.data.jobs || [];
        setJobs(loadedJobs);
        if (loadedJobs.length > 0) {
          setSelectedJob(loadedJobs[0]);
        }
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
    
    // Fetch profile dynamically from Supabase
    const fetchProfile = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session && session.user.id !== '00000000-0000-0000-0000-000000000000') {
          const { data } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();
          if (data) {
            setProfileData(data);
            if (data.full_name) {
              setUserProfileName(data.full_name);
            }
          }
        }
      } catch (e) {
        console.warn("Could not load user profile for job board details");
      }
    };
    fetchProfile();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

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

  const dismissJob = (jobId) => {
    setDismissedJobIds(prev => [...prev, jobId]);
  };

  const calculateDaysAgo = (publishedOn) => {
    if (!publishedOn) return 'Recent';
    const diffTime = Math.abs(new Date() - new Date(publishedOn));
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays <= 1) return 'Today';
    if (diffDays === 2) return '1 day ago';
    if (diffDays < 30) return `${diffDays - 1} days ago`;
    const months = Math.floor(diffDays / 30);
    return months === 1 ? '1 month ago' : `${months} months ago`;
  };

  const getAvatarColor = (name) => {
    if (!name) return '#1F3A2E';
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const colors = [
      '#1F3A2E', '#2b5c43', '#0a66c2', '#b24020', '#6f7e58', 
      '#3f3f46', '#0369a1', '#b45309', '#0d9488', '#4f46e5'
    ];
    return colors[Math.abs(hash) % colors.length];
  };

  const getInitials = (name) => {
    if (!name) return 'AJ';
    return name
      .split(' ')
      .filter(Boolean)
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  const getProfileHeadline = () => {
    if (profileData) {
      const p = profileData.profile_data;
      if (p) {
        const role = p.roleAppointment || '';
        const trade = p.armCorpsTrade || '';
        const branch = profileData.service_branch || p.serviceBranch || 'Indian Army';
        const duration = p.totalServiceDuration ? `(${p.totalServiceDuration} service)` : '';
        const parts = [role, trade, branch].filter(Boolean);
        if (parts.length > 0) {
          return `${parts.join(', ')} ${duration}`.trim();
        }
      }
      if (profileData.service_branch) {
        return `Agniveer | ${profileData.service_branch}`;
      }
    }
    return "Agniveer | Indian Army";
  };

  const getProfileLocation = () => {
    if (profileData && profileData.profile_data) {
      const p = profileData.profile_data;
      if (p.district || p.stateOfDomicile) {
        return [p.district, p.stateOfDomicile].filter(Boolean).join(', ');
      }
    }
    return "Chennai, Tamil Nadu";
  };

  const filteredJobs = jobs.filter(job => {
    if (!job) return false;
    const jobId = job.id || job._id || job.title || 'unknown';
    return !dismissedJobIds.includes(jobId) && (
      job.title?.toLowerCase().includes(search.toLowerCase()) || 
      job.body?.toLowerCase().includes(search.toLowerCase())
    );
  });


  // Pagination compilation for admin/search views
  const itemsPerPage = 10;
  const totalPages = Math.ceil(filteredJobs.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedJobs = filteredJobs.slice(startIndex, endIndex);

  // Separate jobs for LinkedIn feeds
  const candidateKeywords = ['developer', 'graphic', 'game', 'designer', 'creative', 'artist', 'lip sync', 'dubbing', 'ai', 'intern', 'operations', 'video'];
  const matchedList = filteredJobs.filter(job => 
    job && job.title && candidateKeywords.some(keyword => job.title.toLowerCase().includes(keyword))
  );
  const profileMatchedList = matchedList.length > 0 ? matchedList : filteredJobs;
  const profileMatchedJobs = showAllProfileMatched ? profileMatchedList : profileMatchedList.slice(0, 4);

  // More jobs for you - filter out matched ones that are visible in first card
  const matchedVisibleIds = profileMatchedList.slice(0, 4).filter(Boolean).map(p => p.id || p._id || p.title || 'unknown');
  const moreJobsList = filteredJobs.filter(job => job && !matchedVisibleIds.includes(job.id || job._id || job.title || 'unknown'));

  const moreJobsItemsPerPage = 10;
  const moreJobsTotalPages = Math.ceil(moreJobsList.length / moreJobsItemsPerPage) || 1;
  const moreJobsStartIndex = (currentPage - 1) * moreJobsItemsPerPage;
  const paginatedMoreJobs = moreJobsList.slice(moreJobsStartIndex, moreJobsStartIndex + moreJobsItemsPerPage);



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
      ) : isAdmin ? (
        /* Admin View: Row list / Table */
        <div className="admin-jobs-wrapper">
          <div className="table-responsive">
            <table className="admin-jobs-table">
              <thead>
                <tr>
                  <th>Conducting Body</th>
                  <th>Notification / Vacancy Details</th>
                  <th>Published Date</th>
                  <th>Last Date</th>
                  <th>Vacancies</th>
                  <th style={{ textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {paginatedJobs.length > 0 ? (
                  paginatedJobs.map((job, idx) => (
                    <tr key={idx} onClick={() => setSelectedJob(job)} style={{ cursor: 'pointer' }}>
                      <td>
                        <span className="body-badge" style={{ background: '#f0fdf4', color: '#1F3A2E', border: '1px solid #dcfce7' }}>
                          {job.body}
                        </span>
                      </td>
                      <td>
                        <div className="job-title-col">
                          <span className="admin-job-title" title={job.title}>{job.title}</span>
                          {job.url && <span className="admin-job-link-text">{job.url.substring(0, 70)}...</span>}
                        </div>
                      </td>
                      <td>
                        <span className="date-text">
                          {job.publishedOn ? new Date(job.publishedOn).toLocaleDateString() : 'Recent'}
                        </span>
                      </td>
                      <td>
                        <span className={`last-date-badge ${job.lastDate ? 'warning' : 'none'}`}>
                          {job.lastDate ? new Date(job.lastDate).toLocaleDateString() : 'N/A'}
                        </span>
                      </td>
                      <td>
                        <span className="vacancies-text">{job.vacancies || 'N/A'}</span>
                      </td>
                      <td style={{ textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                        <button className="btn-curate" onClick={() => setSelectedJob(job)}>
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', padding: '3rem' }}>
                      <Search size={32} color="#ccc" style={{ marginBottom: '1rem' }} />
                      <p style={{ margin: 0, color: '#888' }}>No vacancies found matching "{search}"</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="pagination-bar">
              <button 
                className="pagination-btn" 
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft size={14} />
                <span>Previous</span>
              </button>
              
              <div className="pagination-pages">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <button
                    key={page}
                    className={`pagination-page-btn ${currentPage === page ? 'active' : ''}`}
                    onClick={() => setCurrentPage(page)}
                  >
                    {page}
                  </button>
                ))}
              </div>

              <button 
                className="pagination-btn" 
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
              >
                <span>Next</span>
                <ChevronRight size={14} />
              </button>
            </div>
          )}
        </div>
      ) : (
        /* Restructured Agniveer Split-Screen Layout: Left Related Feed, Right Detail Review Sheet */
        <div className="candidate-splitscreen-workspace">
          {/* Left Column: Related / Available Jobs List */}
          <div className="splitscreen-left-list">
            <h3 className="section-small-title">JOBS FOR YOU</h3>
            <div className="scrollable-jobs-feed">
              {filteredJobs.length > 0 ? (
                filteredJobs.map((job, idx) => {
                  const jobId = job.id || job._id || job.title;
                  const isActive = (selectedJob?.id || selectedJob?._id || selectedJob?.title) === jobId;
                  
                  return (
                    <div 
                      key={idx} 
                      className={`splitscreen-job-feed-card ${isActive ? 'active' : ''}`}
                      onClick={() => setSelectedJob(job)}
                    >
                      <div className="splitscreen-card-header">
                        <div className="mini-company-avatar" style={{ backgroundColor: getAvatarColor(job.body) }}>
                          {job.body ? job.body.substring(0, 2).toUpperCase() : 'JO'}
                        </div>
                        <div className="card-header-right">
                          <h4 className="job-feed-card-title">{job.title}</h4>
                          <p className="job-feed-card-company">{job.body}</p>
                          <p className="job-feed-card-location">Chennai (On-site)</p>
                        </div>
                        <button className="card-dismiss-btn" onClick={(e) => { e.stopPropagation(); dismissJob(jobId); }}>
                          <X size={14} />
                        </button>
                      </div>

                      {/* Matching Insight Badges */}
                      <div style={{ display: 'flex', gap: '0.35rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                        {idx % 3 === 0 && (
                          <div className="mini-insight-badge active">
                            <Award size={10} />
                            <span>Actively reviewing</span>
                          </div>
                        )}
                        <span className="mini-time-text">
                          {job.publishedOn ? calculateDaysAgo(job.publishedOn) : '2 weeks ago'}
                        </span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>
                  No available jobs matching search.
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Premium Interactive Job Detail Sheet & Company Insights */}
          <div className="splitscreen-right-detail-sheet">
            {selectedJob ? (
              <div className="premium-job-detail-card animate-fade-in">
                {/* Header Section */}
                <div className="detail-card-header">
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <div className="large-company-logo" style={{ backgroundColor: getAvatarColor(selectedJob.body) }}>
                      {selectedJob.body ? selectedJob.body.substring(0, 2).toUpperCase() : 'JO'}
                    </div>
                    <div>
                      <h2 className="premium-job-headline-title">{selectedJob.title}</h2>
                      <p className="premium-job-subtitle-line">
                        {selectedJob.body} • Chennai, Tamil Nadu, India • {selectedJob.publishedOn ? calculateDaysAgo(selectedJob.publishedOn) : '2 weeks ago'}
                      </p>
                    </div>
                  </div>
                  
                  <div className="detail-actions-row" style={{ marginTop: '1.25rem' }}>
                    <span className="fulltime-badge">✓ Full-time</span>
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
                      {selectedJob.url ? (
                        <a href={selectedJob.url} target="_blank" rel="noopener noreferrer" className="btn-primary ios-pill premium-apply-btn">
                          Apply <ExternalLink size={14} />
                        </a>
                      ) : (
                        <button className="btn-primary ios-pill premium-apply-btn" onClick={() => alert('Application successfully submitted!')}>
                          Easy Apply
                        </button>
                      )}
                      <button className="btn-secondary ios-pill premium-save-btn">Save</button>
                    </div>
                  </div>
                </div>

                {/* Match & Stands Out interactive cards block */}
                <div className="premium-match-n-stand-out-block">
                  <h4 className="block-title">Determine your fit and how to stand out</h4>
                  <div className="chips-row">
                    <button className="insight-chip"><Sparkles size={14} /> Show match details</button>
                    <button className="insight-chip"><Sliders size={14} /> Tailor my resume</button>
                    <button className="insight-chip"><Award size={14} /> Help me stand out</button>
                  </div>
                </div>

                {/* About the Job section */}
                <div className="premium-about-job-section">
                  <h3 className="section-header-title">About the job</h3>
                  <div className="requisition-details-grid">
                    <p><strong>REQUISITION ID:</strong> {selectedJob.id || '11766'}</p>
                    <p><strong>LOCATION:</strong> Chennai (On-site)</p>
                    <p><strong>DEPARTMENTS:</strong> Service Technical Backoffice & Operations Support</p>
                    <p style={{ marginTop: '0.5rem', color: '#4b5563' }}>
                      {selectedJob.notes || 'This post represents transition pathway recommendations for active Agniveers having strong aptitude, leadership indices, and physical endurance.'}
                    </p>
                  </div>
                </div>

                {/* About the Company section */}
                <div className="premium-about-company-section">
                  <h3 className="section-header-title">About the company</h3>
                  <div className="company-branding-header">
                    <div className="small-company-logo" style={{ backgroundColor: getAvatarColor(selectedJob.body) }}>
                      {selectedJob.body ? selectedJob.body.substring(0, 2).toUpperCase() : 'JO'}
                    </div>
                    <div>
                      <h4 className="company-name-bold">{selectedJob.body}</h4>
                      <p className="company-followers">351,889 followers</p>
                    </div>
                    <button className="btn-secondary ios-pill follow-company-btn">+ Follow</button>
                  </div>

                  <p className="company-meta-bullets">
                    Renewable Energy Equipment Manufacturing • 10,001+ employees • 7,696 on VeerNXT
                  </p>
                  
                  <p className="company-description-paragraph">
                    The development, manufacture, project management, and servicing of turbines has been the core competence and passion of our corporate group and its more than 10,900 employees worldwide for over 40 years. We actively welcome Ex-Servicemen and transitioning Agniveers under specialized reservation quotas.
                  </p>
                </div>
              </div>
            ) : (
              <div className="empty-right-details-placeholder">
                <Briefcase size={48} style={{ opacity: 0.2 }} />
                <h3>No Job Selected</h3>
                <p>Select any vacancy card from the left panel to review comprehensive job details and company credentials.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Details View Modal inside the Admin Panel */}
      {isAdmin && selectedJob && (
        <div className="modal-overlay animate-fade-in" onClick={() => setSelectedJob(null)}>
          <div className="details-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-badge">{selectedJob.body}</span>
              <button className="modal-close-btn" onClick={() => setSelectedJob(null)}>
                <X size={20} />
              </button>
            </div>
            
            <h2 className="modal-job-title">{selectedJob.title}</h2>
            
            <div className="modal-details-grid">
              <div className="modal-detail-card">
                <span className="detail-label">Conducting Body</span>
                <span className="detail-val">{selectedJob.body}</span>
              </div>
              <div className="modal-detail-card">
                <span className="detail-label">Published On</span>
                <span className="detail-val">
                  {selectedJob.publishedOn ? new Date(selectedJob.publishedOn).toLocaleDateString() : 'Recent'}
                </span>
              </div>
              <div className="modal-detail-card">
                <span className="detail-label">Last Date to Apply</span>
                <span className={`detail-val ${selectedJob.lastDate ? 'warning-text' : ''}`}>
                  {selectedJob.lastDate ? new Date(selectedJob.lastDate).toLocaleDateString() : 'Continuous Recruitment'}
                </span>
              </div>
              <div className="modal-detail-card">
                <span className="detail-label">Available Vacancies</span>
                <span className="detail-val">{selectedJob.vacancies || 'As per notification rules'}</span>
              </div>
              {selectedJob.ageRange && (
                <div className="modal-detail-card">
                  <span className="detail-label">Eligible Age Bracket</span>
                  <span className="detail-val">{selectedJob.ageRange}</span>
                </div>
              )}
            </div>

            {selectedJob.notes && (
              <div className="modal-notes-section">
                <h4>Official Notes & Remarks</h4>
                <p>{selectedJob.notes}</p>
              </div>
            )}

            <div className="modal-footer-row">
              <button className="btn-secondary" onClick={() => setSelectedJob(null)} style={{ padding: '0.65rem 1.5rem', borderRadius: '10px', border: '1px solid #cbd5e1', cursor: 'pointer', background: 'white', fontWeight: 700 }}>
                Close Details
              </button>
              {selectedJob.url && (
                <a href={selectedJob.url} target="_blank" rel="noopener noreferrer" className="btn-primary ios-pill" style={{ textDecoration: 'none', padding: '0.65rem 1.5rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: '#1F3A2E', color: 'white', borderRadius: '99px', fontWeight: 700 }}>
                  Open Official Source <ExternalLink size={14} />
                </a>
              )}
            </div>
          </div>
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
        /* Admin Jobs Table Styles */
        .admin-jobs-wrapper {
          background: white;
          padding: 1.5rem;
          border-radius: 20px;
          border: 1px solid #f1f5f9;
          box-shadow: 0 4px 20px rgba(0,0,0,0.01);
          margin-top: 1.5rem;
        }
        .table-responsive {
          width: 100%;
          overflow-x: auto;
        }
        .admin-jobs-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
        }
        .admin-jobs-table th {
          padding: 1rem 1.25rem;
          font-size: 0.72rem;
          font-weight: 800;
          color: #475569;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          border-bottom: 2px solid #f1f5f9;
        }
        .admin-jobs-table tr {
          transition: background 0.2s;
        }
        .admin-jobs-table tbody tr:hover {
          background: #f8fafc;
        }
        .admin-jobs-table td {
          padding: 1rem 1.25rem;
          border-bottom: 1px solid #f1f5f9;
          font-size: 0.88rem;
          color: #334155;
          vertical-align: middle;
        }
        .job-title-col {
          display: flex;
          flex-direction: column;
          gap: 0.2rem;
        }
        .admin-job-title {
          font-weight: 700;
          color: #0f172a;
          line-height: 1.4;
          display: -webkit-box;
          -webkit-line-clamp: 1;
          -webkit-box-orient: vertical;
          overflow: hidden;
          max-width: 450px;
        }
        .admin-job-link-text {
          font-size: 0.68rem;
          color: #94a3b8;
          font-family: monospace;
        }
        .date-text {
          font-weight: 600;
          color: #64748b;
          font-size: 0.8rem;
        }
        .last-date-badge {
          display: inline-block;
          font-size: 0.75rem;
          font-weight: 700;
          padding: 0.25rem 0.5rem;
          border-radius: 6px;
        }
        .last-date-badge.warning {
          background: #fff7ed;
          color: #c2410c;
        }
        .last-date-badge.none {
          background: #f1f5f9;
          color: #64748b;
        }
        .vacancies-text {
          font-weight: 700;
          color: #0f172a;
        }
        
        .btn-curate {
          padding: 0.4rem 0.85rem;
          background: white;
          border: 1px solid #cbd5e1;
          color: #475569;
          font-weight: 700;
          font-size: 0.75rem;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .btn-curate:hover {
          border-color: #1F3A2E;
          color: #1F3A2E;
          background: #f8fafc;
        }

        /* Modal Overlay Styles */
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(15, 23, 42, 0.4);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 1.5rem;
        }
        .details-modal {
          background: white;
          border-radius: 24px;
          width: 100%;
          max-width: 650px;
          padding: 2.25rem;
          box-shadow: 0 20px 50px rgba(15,23,42,0.15);
          text-align: left;
          position: relative;
        }
        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.25rem;
        }
        .modal-badge {
          background: #ecfdf5;
          color: #10b981;
          padding: 0.35rem 0.75rem;
          border-radius: 99px;
          font-size: 0.72rem;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .modal-close-btn {
          background: none;
          border: none;
          color: #94a3b8;
          cursor: pointer;
          padding: 4px;
          border-radius: 99px;
          display: flex;
          transition: background 0.2s, color 0.2s;
        }
        .modal-close-btn:hover {
          background: #f1f5f9;
          color: #334155;
        }
        .modal-job-title {
          font-size: 1.4rem;
          font-weight: 800;
          color: #0f172a;
          line-height: 1.35;
          margin-bottom: 2rem;
          letter-spacing: -0.02em;
        }
        .modal-details-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1.25rem;
          margin-bottom: 2rem;
        }
        .modal-detail-card {
          background: #f8fafc;
          padding: 1rem 1.25rem;
          border-radius: 14px;
          border: 1px solid #f1f5f9;
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
        }
        .detail-label {
          font-size: 0.68rem;
          font-weight: 800;
          color: #94a3b8;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .detail-val {
          font-size: 0.95rem;
          font-weight: 750;
          color: #1e293b;
        }
        .detail-val.warning-text {
          color: #c2410c;
        }
        .modal-notes-section {
          background: #fffbeb;
          border: 1px solid #fef3c7;
          padding: 1.25rem;
          border-radius: 16px;
          margin-bottom: 2rem;
        }
        .modal-notes-section h4 {
          margin: 0 0 0.5rem 0;
          color: #b45309;
          font-weight: 800;
          font-size: 0.85rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .modal-notes-section p {
          margin: 0;
          color: #78350f;
          font-size: 0.88rem;
          line-height: 1.5;
        }
        .modal-footer-row {
          display: flex;
          justify-content: flex-end;
          align-items: center;
          gap: 1rem;
          border-top: 1px solid #f1f5f9;
          padding-top: 1.5rem;
        }

        /* Pagination Bar in Jobs */
        .pagination-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1.25rem 0.25rem 0.25rem 0.25rem;
          border-top: 1px solid #f1f5f9;
          margin-top: 1rem;
        }
        .pagination-btn {
          padding: 0.45rem 1rem;
          background: white;
          border: 1px solid #cbd5e1;
          color: #475569;
          font-weight: 700;
          font-size: 0.8rem;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s;
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
        }
        .pagination-btn:hover:not(:disabled) {
          border-color: #1F3A2E;
          color: #1F3A2E;
          background: #f8fafc;
        }
        .pagination-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }
        .pagination-pages {
          display: flex;
          align-items: center;
          gap: 0.35rem;
        }
        .pagination-page-btn {
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: white;
          border: 1px solid #cbd5e1;
          color: #475569;
          font-weight: 700;
          font-size: 0.8rem;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .pagination-page-btn:hover:not(.active) {
          border-color: #1F3A2E;
          color: #1F3A2E;
          background: #f8fafc;
        }
        .pagination-page-btn.active {
          background: #1F3A2E;
          color: white;
          border-color: #1F3A2E;
          box-shadow: 0 2px 6px rgba(31,58,46,0.15);
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

        /* LinkedIn Two-Column Layout Styles */
        .linkedin-layout {
          display: grid;
          grid-template-columns: 280px 1fr;
          gap: 1.5rem;
          margin-top: 1.5rem;
          align-items: start;
          font-family: -apple-system, system-ui, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        }
        .linkedin-sidebar {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }
        .linkedin-feed {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }
        .linkedin-card {
          background: white;
          border-radius: 10px;
          border: 1px solid #eef3f8;
          overflow: hidden;
          box-shadow: 0 0 0 1px rgba(0,0,0,0.015), 0 2px 4px rgba(0,0,0,0.025);
          text-align: left;
        }
        
        /* Profile Sidebar Card */
        .profile-card {
          position: relative;
        }
        .profile-cover {
          height: 60px;
          background: linear-gradient(135deg, #1F3A2E 0%, #3a5f4e 100%);
          position: relative;
        }
        .profile-cover::after {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0; bottom: 0;
          opacity: 0.1;
          background-image: radial-gradient(circle, #fff 10%, transparent 11%), radial-gradient(circle, #fff 10%, transparent 11%);
          background-size: 10px 10px;
          background-position: 0 0, 5px 5px;
        }
        .profile-avatar-container {
          position: relative;
          margin-top: -38px;
          padding-left: 1.25rem;
          margin-bottom: 0.5rem;
          display: inline-block;
        }
        .profile-avatar {
          width: 72px;
          height: 72px;
          border-radius: 50%;
          border: 4px solid white;
          background: #edf3f8;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 2px 6px rgba(0,0,0,0.08);
          overflow: hidden;
        }
        .avatar-initials {
          font-size: 1.6rem;
          font-weight: 800;
          color: #1F3A2E;
          letter-spacing: -0.05em;
        }
        .profile-score-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          margin-top: 0.75rem;
          background: rgba(31, 58, 46, 0.08);
          border: 1.5px solid rgba(31, 58, 46, 0.15);
          padding: 0.35rem 0.75rem;
          border-radius: 8px;
          color: #1F3A2E;
        }
        .score-label {
          font-size: 0.65rem;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .score-value {
          font-size: 0.95rem;
          font-weight: 800;
        }
        .profile-info {
          padding: 0.5rem 1.25rem 1.25rem 1.25rem;
        }
        .profile-name {
          font-size: 1.1rem;
          font-weight: 700;
          color: #000000e6;
          margin: 0 0 0.25rem 0;
          letter-spacing: -0.01em;
        }
        .profile-headline {
          font-size: 0.76rem;
          color: #000000b3;
          line-height: 1.35;
          margin: 0 0 0.5rem 0;
        }
        .profile-location {
          font-size: 0.72rem;
          color: #00000099;
          margin: 0;
        }

        /* Sidebar Footer */
        .linkedin-sidebar-footer {
          padding: 0.75rem;
          text-align: center;
        }
        .footer-links-grid {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 0.5rem 0.75rem;
          margin-bottom: 0.75rem;
        }
        .footer-links-grid span {
          font-size: 0.7rem;
          color: #00000099;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
        }
        .footer-links-grid span:hover {
          color: #0a66c2;
          text-decoration: underline;
        }
        .footer-copyright {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.35rem;
          font-size: 0.7rem;
          color: #000000e6;
          font-weight: 550;
        }
        .linkedin-footer-logo {
          color: #0a66c2;
          font-weight: 800;
          font-size: 0.72rem;
        }
        .linkedin-footer-logo .logo-in {
          background: #0a66c2;
          color: white;
          padding: 0 2px;
          border-radius: 2px;
          margin-left: 1px;
          font-size: 0.65rem;
        }

        /* Feed Columns & Cards */
        .feed-card {
          margin-bottom: 0.75rem;
        }
        .card-header-section {
          padding: 1.25rem 1.25rem 0.75rem 1.25rem;
          border-bottom: 1px solid #eef3f8;
        }
        .feed-card-title {
          font-size: 1rem;
          font-weight: 700;
          color: #000000e6;
          margin: 0 0 0.15rem 0;
        }
        .feed-card-subtitle {
          font-size: 0.76rem;
          color: #00000099;
          margin: 0;
        }
        .feed-job-list {
          display: flex;
          flex-direction: column;
        }
        .feed-job-row {
          display: flex;
          justify-content: space-between;
          padding: 1.25rem;
          border-bottom: 1px solid #eef3f8;
          transition: background 0.15s;
          cursor: pointer;
          position: relative;
        }
        .feed-job-row:hover {
          background: #f8fafc;
        }
        .feed-job-row:last-child {
          border-bottom: none;
        }
        .feed-job-left {
          display: flex;
          gap: 0.75rem;
          flex: 1;
        }
        .company-avatar-circle {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 0.95rem;
          font-weight: 800;
          flex-shrink: 0;
          box-shadow: inset 0 2px 4px rgba(0,0,0,0.1);
        }
        .feed-job-details {
          display: flex;
          flex-direction: column;
          gap: 0.2rem;
          text-align: left;
        }
        .feed-job-title-link {
          font-size: 0.92rem;
          font-weight: 700;
          color: #0a66c2;
          margin: 0;
          line-height: 1.3;
        }
        .feed-job-title-link:hover {
          text-decoration: underline;
        }
        .feed-job-company {
          font-size: 0.78rem;
          color: #000000b3;
          margin: 0;
        }
        .feed-job-time {
          font-size: 0.72rem;
          color: #00000099;
          margin: 0.1rem 0 0 0;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .dismiss-job-btn {
          background: transparent;
          border: none;
          color: #00000099;
          cursor: pointer;
          padding: 4px;
          border-radius: 50%;
          display: flex;
          align-self: flex-start;
          transition: background 0.15s, color 0.15s;
        }
        .dismiss-job-btn:hover {
          background: #eef3f8;
          color: #000000e6;
        }

        /* Insight Badges */
        .insight-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          font-size: 0.74rem;
          font-weight: 600;
          padding: 0.15rem 0.5rem;
          border-radius: 4px;
          margin-top: 0.15rem;
          width: fit-content;
        }
        .insight-badge.gold {
          background: #fdf2e9;
          color: #843d11;
          border: 1px solid #fbe5d3;
        }
        .insight-badge.green {
          background: #f0fdf4;
          color: #14532d;
          border: 1px solid #dcfce7;
        }
        .insight-icon {
          flex-shrink: 0;
        }
        .easy-apply-badge {
          font-weight: 750;
          color: #0a66c2;
          background: rgba(10, 102, 194, 0.06);
          padding: 0.1rem 0.35rem;
          border-radius: 3px;
          font-size: 0.68rem;
          display: inline-flex;
          align-items: center;
        }
        
        .no-jobs-feed {
          padding: 3rem 1rem;
          text-align: center;
          color: #00000099;
        }
        .no-jobs-feed p {
          margin: 0.5rem 0 0 0;
          font-size: 0.88rem;
        }

        .feed-card-footer {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.35rem;
          padding: 0.85rem;
          border-top: 1px solid #eef3f8;
          cursor: pointer;
          color: #0a66c2;
          font-size: 0.85rem;
          font-weight: 700;
          transition: background 0.15s;
        }
        .feed-card-footer:hover {
          background: rgba(10, 102, 194, 0.05);
        }

        /* See All CTA Card */
        .see-all-cta-card {
          padding: 1.5rem;
          display: flex;
          align-items: center;
          gap: 1.5rem;
          background: linear-gradient(135deg, #ffffff 0%, #f6f8fa 100%);
          border: 1px solid #eef3f8;
          margin-bottom: 0.75rem;
        }
        .cta-avatar-stack {
          display: flex;
          position: relative;
          width: 80px;
          height: 48px;
          flex-shrink: 0;
        }
        .cta-avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          border: 2px solid white;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          position: absolute;
        }
        .bg-avatar-1 {
          background: #4f46e5;
          z-index: 3;
          left: 0;
        }
        .bg-avatar-2 {
          background: #0ea5e9;
          z-index: 2;
          left: 20px;
        }
        .bg-avatar-3 {
          background: #ec4899;
          z-index: 1;
          left: 40px;
        }
        .bg-avatar-1::after { content: 'RT'; display: flex; align-items: center; justify-content: center; height: 100%; color: white; font-size: 0.72rem; font-weight: 800; }
        .bg-avatar-2::after { content: 'VS'; display: flex; align-items: center; justify-content: center; height: 100%; color: white; font-size: 0.72rem; font-weight: 800; }
        .bg-avatar-3::after { content: 'MJ'; display: flex; align-items: center; justify-content: center; height: 100%; color: white; font-size: 0.72rem; font-weight: 800; }

        .cta-content {
          text-align: left;
        }
        .cta-title {
          font-size: 0.92rem;
          font-weight: 700;
          color: #000000e6;
          margin: 0 0 0.25rem 0;
        }
        .cta-text {
          font-size: 0.76rem;
          color: #000000b3;
          margin: 0 0 0.75rem 0;
        }
        .reactivate-premium-btn {
          background: #f8c055;
          color: #1a1a1a;
          border: none;
          font-weight: 700;
          font-size: 0.8rem;
          padding: 0.45rem 1.25rem;
          border-radius: 20px;
          cursor: pointer;
          transition: background 0.15s;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        .reactivate-premium-btn:hover {
          background: #f5b130;
        }
        .cta-subtext {
          font-size: 0.68rem;
          color: #00000099;
          margin: 0.35rem 0 0 0;
        }

        @media (max-width: 992px) {
          .linkedin-layout {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 768px) {
          .jobs-header { flex-direction: column; align-items: flex-start; gap: 1.5rem; }
          .search-bar-wrapper { flex-direction: column; align-items: stretch; gap: 1rem; }
          .jobs-grid { grid-template-columns: 1fr; }
        }

        /* Restructured Splitscreen candidate feed and detail pane layout styles */
        .candidate-splitscreen-workspace {
          display: grid;
          grid-template-columns: 380px 1fr;
          gap: 2rem;
          margin-top: 1.5rem;
          align-items: start;
          height: calc(100vh - 280px);
        }
        .splitscreen-left-list {
          display: flex;
          flex-direction: column;
          background: white;
          border-radius: 20px;
          border: 1px solid #f1f5f9;
          height: 100%;
          overflow: hidden;
          padding: 1.25rem 0.5rem;
          box-shadow: 0 4px 20px rgba(0,0,0,0.02);
        }
        .section-small-title {
          font-size: 0.72rem;
          font-weight: 800;
          color: #475569;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: 0.75rem;
          padding: 0 0.75rem;
        }
        .scrollable-jobs-feed {
          flex: 1;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          padding-right: 0.25rem;
        }
        .splitscreen-job-feed-card {
          padding: 1rem;
          background: white;
          border-radius: 12px;
          border: 1.5px solid #f1f5f9;
          cursor: pointer;
          transition: all 0.2s;
          position: relative;
        }
        .splitscreen-job-feed-card:hover {
          background: #fafafa;
          border-color: #e2e8f0;
        }
        .splitscreen-job-feed-card.active {
          background: #eef2eb;
          border-color: #d7e6d0;
        }
        .splitscreen-card-header {
          display: flex;
          gap: 0.75rem;
          position: relative;
        }
        .mini-company-avatar {
          width: 38px;
          height: 38px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: 800;
          font-size: 0.8rem;
          flex-shrink: 0;
        }
        .card-header-right {
          flex: 1;
          min-width: 0;
          text-align: left;
        }
        .job-feed-card-title {
          font-size: 0.88rem;
          font-weight: 850;
          color: #0f172a;
          line-height: 1.3;
          margin: 0;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .job-feed-card-company {
          font-size: 0.75rem;
          color: #64748b;
          font-weight: 600;
          margin-top: 0.15rem;
        }
        .job-feed-card-location {
          font-size: 0.7rem;
          color: #94a3b8;
        }
        .card-dismiss-btn {
          background: none;
          border: none;
          color: #94a3b8;
          cursor: pointer;
          align-self: flex-start;
          padding: 2px;
          border-radius: 4px;
        }
        .card-dismiss-btn:hover {
          background: #f1f5f9;
          color: #0f172a;
        }
        .mini-insight-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
          font-size: 0.65rem;
          font-weight: 800;
          padding: 0.15rem 0.4rem;
          border-radius: 4px;
        }
        .mini-insight-badge.active {
          background: #ecfdf5;
          color: #047857;
        }
        .mini-time-text {
          font-size: 0.65rem;
          color: #94a3b8;
          margin-left: auto;
          align-self: center;
        }

        .splitscreen-right-detail-sheet {
          background: white;
          border-radius: 20px;
          border: 1px solid #f1f5f9;
          height: 100%;
          overflow-y: auto;
          box-shadow: 0 4px 20px rgba(0,0,0,0.02);
        }
        .premium-job-detail-card {
          padding: 2rem;
          text-align: left;
        }
        .detail-card-header {
          border-bottom: 1px solid #f1f5f9;
          padding-bottom: 1.5rem;
        }
        .large-company-logo {
          width: 56px;
          height: 56px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 1.25rem;
          font-weight: 850;
        }
        .premium-job-headline-title {
          font-size: 1.5rem;
          font-weight: 850;
          color: #0f172a;
          letter-spacing: -0.02em;
          margin: 0;
        }
        .premium-job-subtitle-line {
          font-size: 0.85rem;
          color: #64748b;
          font-weight: 600;
          margin-top: 0.25rem;
        }
        .fulltime-badge {
          font-size: 0.72rem;
          background: #f1f5f9;
          color: #475569;
          font-weight: 800;
          padding: 0.25rem 0.6rem;
          border-radius: 6px;
        }
        .premium-apply-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.88rem;
          padding: 0.6rem 1.5rem;
        }
        .premium-save-btn {
          font-size: 0.88rem;
          padding: 0.6rem 1.5rem;
          border: 1.5px solid #1F3A2E;
          background: transparent;
          color: #1F3A2E;
        }
        .premium-save-btn:hover {
          background: rgba(31,58,46,0.05);
        }
        .premium-match-n-stand-out-block {
          background: #fffbeb;
          border: 1px solid #fef3c7;
          border-radius: 16px;
          padding: 1.25rem;
          margin-top: 1.5rem;
        }
        .block-title {
          font-size: 0.85rem;
          font-weight: 800;
          color: #b45309;
          margin: 0 0 0.75rem 0;
        }
        .chips-row {
          display: flex;
          gap: 0.5rem;
          flex-wrap: wrap;
        }
        .insight-chip {
          background: white;
          border: 1px solid #fde68a;
          color: #78350f;
          padding: 0.4rem 0.85rem;
          border-radius: 99px;
          font-size: 0.78rem;
          font-weight: 700;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          transition: background 0.2s;
        }
        .insight-chip:hover {
          background: #fffbeb;
        }
        .premium-about-job-section, .premium-about-company-section {
          margin-top: 2rem;
          border-top: 1px solid #f1f5f9;
          padding-top: 1.5rem;
        }
        .section-header-title {
          font-size: 1.1rem;
          font-weight: 850;
          color: #0f172a;
          margin-bottom: 1rem;
        }
        .requisition-details-grid {
          font-size: 0.88rem;
          color: #334155;
          line-height: 1.6;
        }
        .company-branding-header {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 1rem;
        }
        .small-company-logo {
          width: 42px;
          height: 42px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: 800;
          font-size: 0.95rem;
        }
        .company-name-bold {
          font-size: 0.95rem;
          font-weight: 800;
          color: #0f172a;
          margin: 0;
        }
        .company-followers {
          font-size: 0.75rem;
          color: #64748b;
        }
        .follow-company-btn {
          margin-left: auto;
          font-size: 0.8rem;
          padding: 0.4rem 1.25rem;
          border: 1.5px solid #1F3A2E;
          background: transparent;
          color: #1F3A2E;
        }
        .company-meta-bullets {
          font-size: 0.8rem;
          color: #64748b;
          font-weight: 600;
          margin-bottom: 0.75rem;
        }
        .company-description-paragraph {
          font-size: 0.88rem;
          line-height: 1.6;
          color: #334155;
        }
        .empty-right-details-placeholder {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          color: #94a3b8;
          padding: 4rem;
          text-align: center;
        }
        .empty-right-details-placeholder h3 {
          margin-top: 1rem;
          font-size: 1.1rem;
        }

        @media (max-width: 900px) {
          .candidate-splitscreen-workspace {
            grid-template-columns: 1fr;
            height: auto;
          }
          .splitscreen-left-list {
            max-height: 350px;
          }
        }
      `}} />
    </div>
  );
};

export default JobBoard;
