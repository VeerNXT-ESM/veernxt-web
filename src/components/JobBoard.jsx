import React, { useEffect, useState } from 'react';
import axios from 'axios';
import {
  Briefcase, ExternalLink, RefreshCw, Search, AlertCircle, Clock,
  MapPin, X, Sliders, Award, ChevronDown, ChevronUp, Sparkles, BookOpen,
  Building2, ShieldCheck, ArrowLeft
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { getEffectiveTier } from '../lib/subscriptionAccess';
import ExamContentPreview from './ExamContentPreview';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { CAREER_TRACK_META, CAREER_TRACK_ORDER, hexToRgba } from '../lib/careerTrack';

const RESULTS_PER_PAGE = 10;

// Ex-servicemen reservation quotas are well established in Defence, PSU,
// Railways, and Police/CAPF recruitment in India. No scraped "veteran
// friendly" field exists on the job row, so this is a heuristic tag derived
// from careerTrack, not a fact pulled from the listing itself.
const VETERAN_FRIENDLY_TRACKS = ['DEFENCE', 'PSU', 'RAILWAYS', 'POLICE_CAPF'];
const isVeteranFriendly = (job) => VETERAN_FRIENDLY_TRACKS.includes(job?.careerTrack);

const CategoryTag = ({ track, style }) => {
  const meta = CAREER_TRACK_META[track];
  if (!meta) return null;
  return (
    <span
      className="category-tag"
      style={{ background: hexToRgba(meta.hue, 0.08), color: meta.hue, borderColor: hexToRgba(meta.hue, 0.2), ...style }}
    >
      {meta.label}
    </span>
  );
};

const FilterSection = ({ title, children, defaultOpen = false, disabled = false }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={`jobs-filter-section ${disabled ? 'disabled' : ''}`}>
      <button
        type="button"
        className="jobs-filter-section-header"
        onClick={() => !disabled && setOpen((o) => !o)}
      >
        <span>{title}</span>
        {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>
      {open && <div className="jobs-filter-section-body">{children}</div>}
    </div>
  );
};

const JobCard = ({ job, idx, isActive, onSelect, onDismiss, getAvatarColor, calculateDaysAgo }) => {
  const deadlineLabel = job.publishedOn ? calculateDaysAgo(job.publishedOn) : 'Recent';
  return (
    <div className={`job-card ${isActive ? 'active' : ''}`} onClick={onSelect}>
      <div className="job-card-logo" style={{ backgroundColor: getAvatarColor(job.body) }}>
        {job.body ? job.body.substring(0, 2).toUpperCase() : 'JO'}
      </div>
      <div className="job-card-body">
        <div className="job-card-top-row">
          <h4 className="job-card-title">{job.title}</h4>
          <button type="button" className="job-card-dismiss" onClick={(e) => { e.stopPropagation(); onDismiss(); }} aria-label="Dismiss job">
            <X size={14} />
          </button>
        </div>
        <p className="job-card-company">{job.body}</p>

        <div className="job-card-tags">
          {job.careerTrack && <CategoryTag track={job.careerTrack} />}
          {isVeteranFriendly(job) && (
            <span className="job-veteran-badge"><ShieldCheck size={11} /> Veteran Friendly</span>
          )}
          {idx % 3 === 0 && (
            <span className="job-card-insight-badge"><Award size={11} /> Actively reviewing</span>
          )}
        </div>

        <div className="job-card-footer">
          <span className="job-card-deadline"><Clock size={12} /> {deadlineLabel}</span>
          <div className="job-card-actions">
            <button type="button" className="btn-secondary job-card-view-btn" onClick={(e) => { e.stopPropagation(); onSelect(); }}>
              View Details
            </button>
            {job.url ? (
              <a
                href={job.url}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary job-card-apply-btn"
                onClick={(e) => e.stopPropagation()}
              >
                Apply <ExternalLink size={12} />
              </a>
            ) : (
              <button
                type="button"
                className="btn-primary job-card-apply-btn"
                onClick={(e) => { e.stopPropagation(); alert('Application successfully submitted!'); }}
              >
                Easy Apply
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const JobDetailPanel = ({
  job, profileData, detailTab, setDetailTab, examAccordionOpen, setExamAccordionOpen,
  getAvatarColor, calculateDaysAgo, navigate, onBack
}) => {
  if (!job) {
    return (
      <aside className="job-detail-panel">
        <div className="job-detail-empty">
          <Briefcase size={40} />
          <h3>No Job Selected</h3>
          <p>Select any vacancy card from the list to review comprehensive job details.</p>
        </div>
      </aside>
    );
  }

  const veteranFriendly = isVeteranFriendly(job);
  const hasStandardDetails = !!job.standard_details;

  return (
    <aside className="job-detail-panel">
      {onBack && (
        <button type="button" className="job-detail-back" onClick={onBack}>
          <ArrowLeft size={18} /> Back to jobs
        </button>
      )}
      <div className="job-detail-header">
        <div className="job-detail-logo" style={{ backgroundColor: getAvatarColor(job.body) }}>
          {job.body ? job.body.substring(0, 2).toUpperCase() : 'JO'}
        </div>
        <div className="job-detail-heading">
          <h2>{job.title}</h2>
          <p className="job-detail-subline">
            {job.body}{job.publishedOn ? ` • ${calculateDaysAgo(job.publishedOn)}` : ''}
          </p>
          <div className="job-detail-tags">
            {job.careerTrack && <CategoryTag track={job.careerTrack} />}
            {veteranFriendly && <span className="job-veteran-badge"><ShieldCheck size={11} /> Veteran Friendly</span>}
          </div>
          {job.examId && (
            <button
              type="button"
              onClick={() => setExamAccordionOpen((open) => !open)}
              className="job-detail-exam-toggle"
            >
              <BookOpen size={13} /> Associated exam: {job.examName || 'View syllabus'}
              {examAccordionOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          )}
          {examAccordionOpen && job.examId && (
            <ExamContentPreview
              examId={job.examId}
              examName={job.examName}
              tier={getEffectiveTier(profileData?.subscription_tier, profileData?.subscription_expires_at)}
              freeQuizUsed={!!profileData?.free_quiz_used}
            />
          )}
        </div>
      </div>

      <div className="job-detail-actions">
        {job.url ? (
          <a href={job.url} target="_blank" rel="noopener noreferrer" className="btn-primary job-detail-apply-btn">
            Apply <ExternalLink size={14} />
          </a>
        ) : (
          <button type="button" className="btn-primary job-detail-apply-btn" onClick={() => alert('Application successfully submitted!')}>
            Easy Apply
          </button>
        )}
      </div>

      {veteranFriendly && (
        <div className="job-veteran-highlight">
          <ShieldCheck size={20} />
          <div>
            <h4>Veteran Friendly Opportunity</h4>
            <p>Ex-servicemen and transitioning Agniveers are encouraged to apply — your discipline, leadership and service experience are relevant to this recruitment.</p>
          </div>
        </div>
      )}

      <div className="job-match-block">
        {profileData ? (
          <>
            <h4>Determine your fit and how to stand out</h4>
            <div className="job-match-chips">
              <button type="button" className="job-match-chip"><Sparkles size={14} /> Show match details</button>
              <button type="button" className="job-match-chip"><Sliders size={14} /> Tailor my resume</button>
              <button type="button" className="job-match-chip"><Award size={14} /> Help me stand out</button>
            </div>
          </>
        ) : (
          <>
            <h4>Find out if you are a match</h4>
            <div className="job-match-chips">
              <button type="button" className="job-match-chip" onClick={() => navigate('/profiling')}><Sparkles size={14} /> Go to Profiling Engine</button>
            </div>
          </>
        )}
      </div>

      <div className="job-detail-tabs">
        <button className={detailTab === 'overview' ? 'active' : ''} onClick={() => setDetailTab('overview')}>Overview</button>
        <button className={detailTab === 'eligibility' ? 'active' : ''} onClick={() => setDetailTab('eligibility')}>Eligibility</button>
        <button className={detailTab === 'selection' ? 'active' : ''} onClick={() => setDetailTab('selection')}>Selection Process</button>
        <button className={detailTab === 'dates' ? 'active' : ''} onClick={() => setDetailTab('dates')}>Important Dates</button>
      </div>

      <div className="job-detail-tab-body">
        {detailTab === 'overview' && (
          <div className="job-detail-section">
            <h3>About the role</h3>
            <p className="job-detail-notes">
              {job.notes || 'No additional overview was provided for this listing.'}
            </p>
            {!hasStandardDetails && job.detailed_markdown && (
              <div className="markdown-body">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{job.detailed_markdown}</ReactMarkdown>
              </div>
            )}
            <div className="job-fact-grid">
              {job.id && <div className="job-fact"><span>Requisition ID</span><strong>{job.id}</strong></div>}
              {job.standard_details?.exam_centers && <div className="job-fact"><span>Location</span><strong>{job.standard_details.exam_centers}</strong></div>}
              {job.vacancies != null && <div className="job-fact"><span>Vacancies</span><strong>{job.vacancies}</strong></div>}
              {job.lastDate && <div className="job-fact"><span>Last Date</span><strong>{new Date(job.lastDate).toLocaleDateString('en-IN')}</strong></div>}
            </div>
          </div>
        )}

        {detailTab === 'eligibility' && (
          <div className="job-detail-section">
            <h3>Eligibility & Documents</h3>
            {Array.isArray(job.standard_details?.documents_needed) && job.standard_details.documents_needed.length > 0 ? (
              <ul className="job-detail-list">
                {job.standard_details.documents_needed.map((doc, i) => <li key={i}>{doc}</li>)}
              </ul>
            ) : (
              <p className="job-detail-empty-text">No eligibility document details were extracted for this listing yet.</p>
            )}
          </div>
        )}

        {detailTab === 'selection' && (
          <div className="job-detail-section">
            <h3>Selection Process</h3>
            {job.examId ? (
              <ExamContentPreview
                examId={job.examId}
                examName={job.examName}
                tier={getEffectiveTier(profileData?.subscription_tier, profileData?.subscription_expires_at)}
                freeQuizUsed={!!profileData?.free_quiz_used}
              />
            ) : (
              <p className="job-detail-empty-text">No linked exam or selection-process breakdown is available for this listing yet.</p>
            )}
          </div>
        )}

        {detailTab === 'dates' && (
          <div className="job-detail-section">
            <h3>Important Dates</h3>
            <div className="job-fact-grid">
              <div className="job-fact"><span>Exam Dates</span><strong>{job.standard_details?.exam_dates || 'Not specified'}</strong></div>
              <div className="job-fact"><span>Last Date to Apply</span><strong>{job.standard_details?.last_date_for_application || 'Not specified'}</strong></div>
              <div className="job-fact"><span>Exam Fees</span><strong>{job.standard_details?.exam_fees || 'Not specified'}</strong></div>
              {job.lastDate && <div className="job-fact"><span>Deadline (recorded)</span><strong>{new Date(job.lastDate).toLocaleDateString('en-IN')}</strong></div>}
            </div>
          </div>
        )}
      </div>

      <div className="job-detail-company">
        <h3>About the organization</h3>
        <div className="job-detail-company-header">
          <div className="job-detail-company-logo" style={{ backgroundColor: getAvatarColor(job.body) }}>
            {job.body ? job.body.substring(0, 2).toUpperCase() : 'JO'}
          </div>
          <div>
            <h4>{job.body}</h4>
            {job.careerTrack && <p>{CAREER_TRACK_META[job.careerTrack]?.label}</p>}
          </div>
        </div>
        <p className="job-detail-company-notes">
          {job.notes || `Recruitment listing sourced and tracked by VeerNXT for ${job.body || 'this organization'}.`}
        </p>
      </div>
    </aside>
  );
};

const JobBoard = () => {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [bodySearch, setBodySearch] = useState('');
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedJob, setSelectedJob] = useState(null);
  const [profileData, setProfileData] = useState(null);
  const [dismissedJobIds, setDismissedJobIds] = useState([]);
  const [examAccordionOpen, setExamAccordionOpen] = useState(false);
  const [detailTab, setDetailTab] = useState('overview');
  const [resultTab, setResultTab] = useState('recommended');
  const [sortBy, setSortBy] = useState('relevance');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);

  const fetchJobs = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/jobs');
      if (response.data.ok) {
        // Sort by when the job was added/scraped (created_at) — newest first.
        // publishedOn is the application deadline, NOT the notification date.
        const sortedJobs = (response.data.jobs || []).sort((a, b) => {
          const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
          const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
          return dateB - dateA;
        });
        setJobs(sortedJobs);
        if (sortedJobs.length > 0) {
          setSelectedJob(sortedJobs[0]);
        }
      }
    } catch (err) {
      console.error('Failed to fetch jobs:', err);
      setError('Could not load jobs from database. Please try again later.');
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
  }, [search, categoryFilter, bodySearch, resultTab, sortBy]);

  useEffect(() => {
    setExamAccordionOpen(false);
    setDetailTab('overview');
  }, [selectedJob?.id]);

  const dismissJob = (jobId) => {
    setDismissedJobIds(prev => [...prev, jobId]);
  };

  const calculateDaysAgo = (publishedOn) => {
    if (!publishedOn) return 'Recent';
    const now = new Date();
    const date = new Date(publishedOn);
    const diffMs = date - now; // positive = future, negative = past
    const diffDays = Math.ceil(Math.abs(diffMs) / (1000 * 60 * 60 * 24));

    // Future date = application deadline
    if (diffMs > 0) {
      if (diffDays <= 1) return 'Closes today';
      if (diffDays <= 7) return `Closes in ${diffDays} days`;
      const weeks = Math.ceil(diffDays / 7);
      return weeks === 1 ? 'Closes in 1 week' : `Closes in ${weeks} weeks`;
    }

    // Past date = when it was posted
    if (diffDays <= 1) return 'Today';
    if (diffDays < 30) return `${diffDays} days ago`;
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

  const searchMatchedJobs = jobs.filter(job => {
    if (!job) return false;
    const jobId = job.id || job._id || job.title || 'unknown';
    return !dismissedJobIds.includes(jobId) && (
      job.title?.toLowerCase().includes(search.toLowerCase()) ||
      job.body?.toLowerCase().includes(search.toLowerCase())
    );
  });

  // Category counts reflect the active search but not the active category
  // pill itself, so switching categories doesn't make the other counts vanish.
  const categoryCounts = searchMatchedJobs.reduce((acc, job) => {
    const track = job.careerTrack || 'STATE_GOVT';
    acc[track] = (acc[track] || 0) + 1;
    return acc;
  }, {});

  const filteredJobs = searchMatchedJobs.filter(job =>
    categoryFilter === 'ALL' || (job.careerTrack || 'STATE_GOVT') === categoryFilter
  );

  const visibleJobs = filteredJobs.filter(job =>
    !bodySearch.trim() || (job.body || '').toLowerCase().includes(bodySearch.trim().toLowerCase())
  );

  const candidateKeywords = ['developer', 'graphic', 'game', 'designer', 'creative', 'artist', 'lip sync', 'dubbing', 'ai', 'intern', 'operations', 'video'];
  const matchedList = visibleJobs.filter(job =>
    job && job.title && candidateKeywords.some(keyword => job.title.toLowerCase().includes(keyword))
  );
  const profileMatchedList = matchedList.length > 0 ? matchedList : visibleJobs;

  const closingSoonJobs = visibleJobs.filter(job => /^Closes/.test(calculateDaysAgo(job.publishedOn)));
  const veteranFriendlyJobs = visibleJobs.filter(isVeteranFriendly);
  const veteranFriendlyEmployerCount = new Set(veteranFriendlyJobs.map(j => j.body)).size;

  const resultTabJobs =
    resultTab === 'recommended' ? profileMatchedList :
    resultTab === 'closing' ? closingSoonJobs :
    resultTab === 'veteran' ? veteranFriendlyJobs :
    visibleJobs;

  const sortedResultJobs = [...resultTabJobs].sort((a, b) => {
    if (sortBy === 'newest') {
      return (a.created_at ? new Date(a.created_at).getTime() : 0) < (b.created_at ? new Date(b.created_at).getTime() : 0) ? 1 : -1;
    }
    if (sortBy === 'closing') {
      const da = a.publishedOn ? new Date(a.publishedOn).getTime() : Infinity;
      const db = b.publishedOn ? new Date(b.publishedOn).getTime() : Infinity;
      return da - db;
    }
    return 0; // relevance = keep incoming order (already newest-scraped-first)
  });

  const totalPages = Math.ceil(sortedResultJobs.length / RESULTS_PER_PAGE) || 1;
  const pageStartIndex = (currentPage - 1) * RESULTS_PER_PAGE;
  const paginatedResultJobs = sortedResultJobs.slice(pageStartIndex, pageStartIndex + RESULTS_PER_PAGE);

  const clearFilters = () => {
    setSearch('');
    setCategoryFilter('ALL');
    setBodySearch('');
  };

  const selectJob = (job) => {
    setSelectedJob(job);
    if (window.matchMedia('(max-width: 768px)').matches) {
      setMobileDetailOpen(true);
    }
  };

  return (
    <div className={`jobs-page ${mobileDetailOpen ? 'mobile-job-detail-open' : ''}`}>
      <section className="jobs-hero">
        <div className="jobs-hero-content">
          <span className="jobs-hero-eyebrow">Careers for Veterans</span>
          <h1 className="jobs-hero-title">Discover Your Next Mission</h1>
          <p className="jobs-hero-subtitle">
            Explore government, PSU and veteran-friendly opportunities that value your service, skills and leadership.
          </p>

          <div className="jobs-search-panel">
            <div className="jobs-search-field">
              <Search size={16} className="jobs-search-icon" />
              <input
                type="text"
                placeholder="Search by role, department or exam..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="jobs-search-static"><MapPin size={14} /> All India</div>
            <div className="jobs-search-static">All Types</div>
            <button
              type="button"
              className="btn-primary jobs-search-btn"
              onClick={() => document.getElementById('jobs-results-anchor')?.scrollIntoView({ behavior: 'smooth' })}
            >
              Search Jobs
            </button>
          </div>
        </div>
      </section>

      {loading ? (
        <div className="jobs-skeleton-wrap">
          {[0, 1, 2, 3].map(i => (
            <div key={i} className="jobs-skeleton-card">
              <div className="jobs-skeleton-line jobs-skeleton-line-wide" />
              <div className="jobs-skeleton-line jobs-skeleton-line-mid" />
              <div className="jobs-skeleton-line jobs-skeleton-line-narrow" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="jobs-error-state">
          <AlertCircle size={40} />
          <h3>Unable to load current opportunities</h3>
          <p>{error}</p>
          <button type="button" className="btn-primary" onClick={fetchJobs}>
            <RefreshCw size={14} /> Try Again
          </button>
        </div>
      ) : (
        <>
          <div className="jobs-stats">
            <div className="jobs-stat-card">
              <Briefcase size={20} className="jobs-stat-icon" />
              <div className="jobs-stat-value">{filteredJobs.length}</div>
              <div className="jobs-stat-label">Active Opportunities</div>
            </div>
            <div className="jobs-stat-card">
              <Sparkles size={20} className="jobs-stat-icon" />
              <div className="jobs-stat-value">{profileMatchedList.length}</div>
              <div className="jobs-stat-label">Recommended for You</div>
            </div>
            <div className="jobs-stat-card">
              <Clock size={20} className="jobs-stat-icon" />
              <div className="jobs-stat-value">{closingSoonJobs.length}</div>
              <div className="jobs-stat-label">Closing Soon</div>
            </div>
            <div className="jobs-stat-card jobs-stat-card-veteran">
              <ShieldCheck size={20} className="jobs-stat-icon" />
              <div className="jobs-stat-value">{veteranFriendlyEmployerCount}</div>
              <div className="jobs-stat-label">Veteran Friendly Employers</div>
            </div>
          </div>

          <div className="jobs-discovery-shell">
            <button type="button" className="jobs-filter-toggle" onClick={() => setSidebarOpen(o => !o)}>
              <Sliders size={16} /> Filters
            </button>

            {sidebarOpen && <div className="jobs-filter-backdrop" onClick={() => setSidebarOpen(false)} />}

            <aside className={`jobs-filter-sidebar ${sidebarOpen ? 'open' : ''}`}>
              <div className="jobs-filter-sidebar-header">
                <h3>Filter Results</h3>
                <div className="jobs-filter-sidebar-header-actions">
                  <button type="button" className="jobs-filter-clear" onClick={clearFilters}>Clear All</button>
                  <button type="button" className="jobs-filter-close" onClick={() => setSidebarOpen(false)} aria-label="Close filters">
                    <X size={16} />
                  </button>
                </div>
              </div>

              <FilterSection title="Category" defaultOpen>
                <label className="jobs-filter-checkbox">
                  <input type="checkbox" checked={categoryFilter === 'ALL'} onChange={() => setCategoryFilter('ALL')} />
                  All Categories <span>{searchMatchedJobs.length}</span>
                </label>
                {CAREER_TRACK_ORDER.filter(track => categoryCounts[track] > 0).map(track => (
                  <label key={track} className="jobs-filter-checkbox">
                    <input
                      type="checkbox"
                      checked={categoryFilter === track}
                      onChange={() => setCategoryFilter(categoryFilter === track ? 'ALL' : track)}
                    />
                    {CAREER_TRACK_META[track].label} <span>{categoryCounts[track]}</span>
                  </label>
                ))}
              </FilterSection>

              <FilterSection title="Conducting Body">
                <div className="jobs-filter-search">
                  <Building2 size={14} />
                  <input
                    type="text"
                    placeholder="Search organization..."
                    value={bodySearch}
                    onChange={(e) => setBodySearch(e.target.value)}
                  />
                </div>
              </FilterSection>
            </aside>

            <main className="jobs-results" id="jobs-results-anchor">
              <div className="jobs-results-toolbar">
                <div className="jobs-result-tabs">
                  <button className={resultTab === 'recommended' ? 'active' : ''} onClick={() => setResultTab('recommended')}>Recommended for You</button>
                  <button className={resultTab === 'all' ? 'active' : ''} onClick={() => setResultTab('all')}>All Opportunities</button>
                  <button className={resultTab === 'closing' ? 'active' : ''} onClick={() => setResultTab('closing')}>Closing Soon</button>
                  <button className={resultTab === 'veteran' ? 'active' : ''} onClick={() => setResultTab('veteran')}>Veteran Friendly</button>
                </div>
                <div className="jobs-sort">
                  <label htmlFor="jobs-sort-select">Sort by</label>
                  <select id="jobs-sort-select" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                    <option value="relevance">Relevance</option>
                    <option value="newest">Newest</option>
                    <option value="closing">Closing Soon</option>
                  </select>
                </div>
              </div>

              <p className="jobs-results-subtitle">
                {resultTab === 'recommended' && 'Jobs that match your profile, skills and career preferences'}
                {resultTab === 'all' && `${visibleJobs.length} opportunities across government, PSU and state sector`}
                {resultTab === 'closing' && 'Apply before the deadline'}
                {resultTab === 'veteran' && 'Employers recognized for hiring veterans'}
              </p>

              <div className="jobs-card-list">
                {paginatedResultJobs.length > 0 ? paginatedResultJobs.map((job, idx) => {
                  const jobId = job.id || job._id || job.title || 'unknown';
                  const isActive = (selectedJob?.id || selectedJob?._id || selectedJob?.title) === jobId;
                  return (
                    <JobCard
                      key={jobId}
                      job={job}
                      idx={idx}
                      isActive={isActive}
                      onSelect={() => selectJob(job)}
                      onDismiss={() => dismissJob(jobId)}
                      getAvatarColor={getAvatarColor}
                      calculateDaysAgo={calculateDaysAgo}
                    />
                  );
                }) : (
                  <div className="jobs-empty-state">
                    <Briefcase size={40} />
                    <h3>No opportunities found</h3>
                    <p>Try changing the search term or filters.</p>
                    <button type="button" className="btn-secondary" onClick={clearFilters}>Clear Filters</button>
                  </div>
                )}
              </div>

              {sortedResultJobs.length > RESULTS_PER_PAGE && (
                <div className="jobs-pagination">
                  <button type="button" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}>Previous</button>
                  <span>Page {currentPage} of {totalPages}</span>
                  <button type="button" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)}>Next</button>
                </div>
              )}
            </main>

            <JobDetailPanel
              job={selectedJob}
              profileData={profileData}
              detailTab={detailTab}
              setDetailTab={setDetailTab}
              examAccordionOpen={examAccordionOpen}
              setExamAccordionOpen={setExamAccordionOpen}
              getAvatarColor={getAvatarColor}
              calculateDaysAgo={calculateDaysAgo}
              navigate={navigate}
              onBack={mobileDetailOpen ? () => setMobileDetailOpen(false) : undefined}
            />
          </div>
        </>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        .jobs-page {
          width: 100%;
          max-width: 1800px;
          margin: 0 auto;
          padding: 2rem clamp(1.25rem, 3vw, 2.5rem) 4rem;
        }

        /* Hero */
        .jobs-hero {
          position: relative;
          background: linear-gradient(120deg, rgba(11, 33, 24, 0.88) 0%, rgba(31, 58, 46, 0.82) 45%, rgba(75, 107, 50, 0.55) 100%),
            url('/veernxt_assets/banners/B13_next_mission.png');
          background-size: cover;
          background-position: right center;
          padding: 1.8rem 2rem;
          box-shadow: var(--shadow-3);
        }
        .jobs-hero-content {
          max-width: 760px;
        }
        .jobs-hero-eyebrow {
          display: inline-block;
          font-size: 0.72rem;
          font-weight: 800;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--accent-gold, #fbbf24);
          margin-bottom: 0.45rem;
        }
        .jobs-hero-title {
          margin: 0 0 0.45rem 0;
          font-size: clamp(1.65rem, 3vw, 2.45rem);
          line-height: 1.08;
          font-weight: 800;
          letter-spacing: -0.02em;
          color: #ffffff;
        }
        .jobs-hero-subtitle {
          margin: 0 0 1rem 0;
          font-size: 0.9rem;
          line-height: 1.45;
          color: rgba(255, 255, 255, 0.82);
          max-width: 560px;
        }
        .jobs-search-panel {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 150px 130px auto;
          gap: 2px;
          background: rgba(255, 255, 255, 0.14);
          padding: 4px;
        }
        .jobs-search-field {
          position: relative;
          display: flex;
          align-items: center;
          background: var(--surface, #fff);
        }
        .jobs-search-icon {
          position: absolute;
          left: 0.9rem;
          color: var(--text-secondary, #64748b);
        }
        .jobs-search-field input {
          width: 100%;
          border: none;
          background: transparent;
          padding: 0.7rem 0.8rem 0.7rem 2.4rem;
          font-size: 0.84rem;
          color: var(--ios-text, #1f2937);
        }
        .jobs-search-field input:focus {
          outline: none;
        }
        .jobs-search-static {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.35rem;
          background: var(--surface, #fff);
          font-size: 0.82rem;
          font-weight: 600;
          color: var(--text-secondary, #64748b);
          padding: 0.7rem 0.5rem;
        }
        .jobs-search-btn {
          padding: 0.7rem 1.15rem;
          font-size: 0.82rem;
          font-weight: 700;
          border: none;
          cursor: pointer;
        }

        /* Stats */
        .jobs-stats {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 1rem;
          margin-top: 1.75rem;
        }
        .jobs-stat-card {
          background: var(--surface, #fff);
          border: 1px solid var(--border);
          padding: 1.1rem 1rem;
          box-shadow: var(--shadow-1);
          transition: box-shadow 0.15s, transform 0.15s;
        }
        .jobs-stat-card:hover {
          box-shadow: var(--shadow-2);
          transform: translateY(-2px);
        }
        .jobs-stat-icon {
          color: var(--ios-olive);
          margin-bottom: 0.5rem;
        }
        .jobs-stat-card-veteran .jobs-stat-icon {
          color: var(--accent-gold, #fbbf24);
        }
        .jobs-stat-value {
          font-size: 1.5rem;
          font-weight: 800;
          color: var(--ios-text);
          letter-spacing: -0.02em;
        }
        .jobs-stat-label {
          font-size: 0.76rem;
          color: var(--text-secondary, #64748b);
          font-weight: 600;
          margin-top: 0.2rem;
        }
        @media (max-width: 900px) {
          .jobs-stats { grid-template-columns: repeat(3, 1fr); }
        }
        @media (max-width: 600px) {
          .jobs-stats { grid-template-columns: repeat(2, 1fr); }
        }

        /* Discovery shell */
        .jobs-discovery-shell {
          display: grid;
          grid-template-columns: 260px minmax(0, 1fr) 420px;
          gap: 1.5rem;
          align-items: start;
          margin-top: 1.75rem;
        }
        .jobs-filter-toggle {
          display: none;
          align-items: center;
          gap: 0.4rem;
          background: var(--surface, #fff);
          border: 1px solid var(--border-strong);
          padding: 0.6rem 1rem;
          font-weight: 700;
          font-size: 0.85rem;
          cursor: pointer;
          margin-bottom: 1rem;
          grid-column: 1 / -1;
        }
        .jobs-filter-backdrop {
          display: none;
        }

        /* Filter sidebar */
        .jobs-filter-sidebar {
          background: var(--surface, #fff);
          border: 1px solid var(--border);
          padding: 1.25rem;
          position: sticky;
          top: 1rem;
        }
        .jobs-filter-sidebar-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 0.75rem;
        }
        .jobs-filter-sidebar-header h3 {
          margin: 0;
          font-size: 0.8rem;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--ios-text);
        }
        .jobs-filter-sidebar-header-actions {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .jobs-filter-clear {
          background: none;
          border: none;
          color: var(--ios-olive);
          font-size: 0.78rem;
          font-weight: 700;
          cursor: pointer;
          padding: 0;
        }
        .jobs-filter-close {
          display: none;
          background: none;
          border: none;
          cursor: pointer;
          color: var(--text-secondary);
        }
        .jobs-filter-section {
          border-top: 1px solid var(--border);
          padding: 0.85rem 0;
        }
        .jobs-filter-section:first-of-type {
          border-top: none;
          padding-top: 0;
        }
        .jobs-filter-section-header {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: none;
          border: none;
          font-size: 0.85rem;
          font-weight: 700;
          color: var(--ios-text);
          cursor: pointer;
          padding: 0;
        }
        .jobs-filter-section.disabled .jobs-filter-section-header {
          color: var(--text-secondary);
          cursor: default;
        }
        .jobs-filter-section-body {
          margin-top: 0.75rem;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        .jobs-filter-checkbox {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.83rem;
          color: var(--ios-text);
          cursor: pointer;
        }
        .jobs-filter-checkbox span {
          margin-left: auto;
          color: var(--text-secondary);
          font-size: 0.76rem;
          font-weight: 700;
        }
        .jobs-filter-search {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          border: 1px solid var(--border-strong);
          padding: 0.5rem 0.7rem;
          color: var(--text-secondary);
        }
        .jobs-filter-search input {
          border: none;
          outline: none;
          background: transparent;
          font-size: 0.82rem;
          width: 100%;
          color: var(--ios-text);
        }
        .jobs-filter-soon {
          font-size: 0.78rem;
          color: var(--text-secondary);
          margin: 0;
          font-style: italic;
        }

        /* Results toolbar */
        .jobs-results-toolbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 0.75rem;
          margin-bottom: 0.5rem;
        }
        .jobs-result-tabs {
          display: flex;
          flex-wrap: wrap;
          gap: 0.4rem;
        }
        .jobs-result-tabs button {
          background: var(--surface-alt);
          border: 1px solid var(--border);
          color: var(--text-secondary);
          font-size: 0.78rem;
          font-weight: 700;
          padding: 0.5rem 0.85rem;
          cursor: pointer;
        }
        .jobs-result-tabs button.active {
          background: var(--ios-olive);
          border-color: var(--ios-olive);
          color: #fff;
        }
        .jobs-sort {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.8rem;
          color: var(--text-secondary);
          font-weight: 600;
        }
        .jobs-sort select {
          border: 1px solid var(--border-strong);
          padding: 0.4rem 0.6rem;
          font-size: 0.8rem;
          background: var(--surface, #fff);
          color: var(--ios-text);
        }
        .jobs-results-subtitle {
          font-size: 0.82rem;
          color: var(--text-secondary);
          margin: 0 0 1rem 0;
        }

        /* Job cards */
        .jobs-card-list {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }
        .job-card {
          display: flex;
          gap: 1rem;
          background: var(--surface, #fff);
          border: 1px solid var(--border);
          padding: 1.1rem;
          cursor: pointer;
          transition: box-shadow 0.15s, border-color 0.15s;
        }
        .job-card:hover {
          box-shadow: var(--shadow-2);
          border-color: var(--border-strong);
        }
        .job-card.active {
          border-color: var(--ios-olive);
          box-shadow: 0 0 0 1px var(--ios-olive);
        }
        .job-card-logo {
          width: 46px;
          height: 46px;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #fff;
          font-weight: 800;
          font-size: 0.85rem;
        }
        .job-card-body {
          flex: 1;
          min-width: 0;
        }
        .job-card-top-row {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 0.5rem;
        }
        .job-card-title {
          margin: 0;
          font-size: 0.95rem;
          font-weight: 750;
          color: var(--ios-text);
          line-height: 1.35;
        }
        .job-card-dismiss {
          background: none;
          border: none;
          color: var(--text-secondary);
          cursor: pointer;
          flex-shrink: 0;
          padding: 2px;
        }
        .job-card-dismiss:hover {
          color: var(--danger);
        }
        .job-card-company {
          margin: 0.2rem 0 0.55rem 0;
          font-size: 0.8rem;
          color: var(--text-secondary);
          font-weight: 600;
        }
        .job-card-tags {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 0.4rem;
          margin-bottom: 0.75rem;
        }
        .job-veteran-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.3rem;
          background: var(--success-bg);
          color: var(--success);
          font-size: 0.68rem;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.02em;
          padding: 0.2rem 0.5rem;
          border: 1px solid var(--success);
        }
        .job-card-insight-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.3rem;
          background: var(--warning-bg);
          color: var(--warning);
          font-size: 0.68rem;
          font-weight: 800;
          padding: 0.2rem 0.5rem;
        }
        .job-card-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 0.6rem;
        }
        .job-card-deadline {
          display: inline-flex;
          align-items: center;
          gap: 0.3rem;
          font-size: 0.76rem;
          color: var(--warning);
          font-weight: 700;
        }
        .job-card-actions {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .job-card-save-btn {
          background: none;
          border: 1px solid var(--border-strong);
          color: var(--text-secondary);
          padding: 0.45rem;
          cursor: pointer;
          display: flex;
        }
        .job-card-save-btn.saved {
          color: var(--accent-gold, #fbbf24);
          border-color: var(--accent-gold, #fbbf24);
        }
        .job-card-view-btn, .job-card-apply-btn {
          font-size: 0.78rem;
          font-weight: 700;
          padding: 0.5rem 0.9rem;
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          text-decoration: none;
          cursor: pointer;
        }

        /* Empty / error / skeleton states */
        .jobs-empty-state, .jobs-error-state {
          padding: 4rem 1.5rem;
          text-align: center;
          background: var(--surface, #fff);
          border: 1px solid var(--border);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.85rem;
          color: var(--text-secondary);
        }
        .jobs-error-state {
          color: var(--danger);
        }
        .jobs-error-state h3, .jobs-empty-state h3 {
          margin: 0;
          color: var(--ios-text);
        }
        .jobs-error-state button, .jobs-empty-state button {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          cursor: pointer;
        }
        .jobs-skeleton-wrap {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }
        .jobs-skeleton-card {
          background: var(--surface, #fff);
          border: 1px solid var(--border);
          padding: 1.1rem;
          display: flex;
          flex-direction: column;
          gap: 0.6rem;
        }
        .jobs-skeleton-line {
          height: 12px;
          background: linear-gradient(90deg, var(--surface-alt) 25%, var(--border) 50%, var(--surface-alt) 75%);
          background-size: 200% 100%;
          animation: jobs-shimmer 1.4s ease-in-out infinite;
        }
        .jobs-skeleton-line-wide { width: 55%; }
        .jobs-skeleton-line-mid { width: 35%; }
        .jobs-skeleton-line-narrow { width: 20%; }
        @keyframes jobs-shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        .animate-spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

        /* Pagination */
        .jobs-pagination {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 1rem;
          margin-top: 1.25rem;
          font-size: 0.82rem;
          color: var(--text-secondary);
        }
        .jobs-pagination button {
          background: var(--surface, #fff);
          border: 1px solid var(--border-strong);
          padding: 0.45rem 1rem;
          cursor: pointer;
          font-weight: 700;
        }
        .jobs-pagination button:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        /* Job detail panel */
        .job-detail-panel {
          background: var(--surface, #fff);
          border: 1px solid var(--border);
          padding: 1.75rem;
          position: sticky;
          top: 1rem;
          max-height: calc(100vh - 2rem);
          overflow-y: auto;
        }
        .job-detail-back {
          display: none;
          align-items: center;
          gap: 0.4rem;
          background: none;
          border: none;
          color: var(--ios-text);
          font-size: 0.88rem;
          font-weight: 750;
          padding: 0;
          margin: 0 0 1rem;
          cursor: pointer;
        }
        .job-detail-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: 4rem 1.5rem;
          color: var(--text-secondary);
        }
        .job-detail-empty h3 {
          margin: 1rem 0 0.4rem 0;
          color: var(--ios-text);
        }
        .job-detail-header {
          display: flex;
          gap: 1rem;
          border-bottom: 1px solid var(--border);
          padding-bottom: 1.25rem;
        }
        .job-detail-logo {
          width: 56px;
          height: 56px;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #fff;
          font-weight: 800;
          font-size: 1.1rem;
        }
        .job-detail-heading { min-width: 0; }
        .job-detail-heading h2 {
          margin: 0;
          font-size: 1.25rem;
          font-weight: 800;
          color: var(--ios-text);
          letter-spacing: -0.01em;
        }
        .job-detail-subline {
          margin: 0.25rem 0 0.6rem 0;
          font-size: 0.82rem;
          color: var(--text-secondary);
          font-weight: 600;
        }
        .job-detail-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 0.4rem;
          margin-bottom: 0.5rem;
        }
        .job-detail-exam-toggle {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          background: none;
          border: none;
          color: var(--ios-olive);
          font-size: 0.8rem;
          font-weight: 700;
          cursor: pointer;
          padding: 0;
        }
        .job-detail-actions {
          display: flex;
          gap: 0.6rem;
          margin-top: 1.25rem;
        }
        .job-detail-apply-btn, .job-detail-save-btn {
          flex: 1;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.4rem;
          padding: 0.7rem 1rem;
          font-size: 0.86rem;
          font-weight: 700;
          text-decoration: none;
          cursor: pointer;
        }
        .job-veteran-highlight {
          display: flex;
          gap: 0.75rem;
          background: var(--success-bg);
          border: 1px solid var(--success);
          padding: 1rem;
          margin-top: 1.25rem;
          color: var(--success);
        }
        .job-veteran-highlight h4 {
          margin: 0 0 0.25rem 0;
          font-size: 0.85rem;
        }
        .job-veteran-highlight p {
          margin: 0;
          font-size: 0.8rem;
          line-height: 1.5;
          color: var(--ios-text);
        }
        .job-match-block {
          background: var(--surface-alt);
          border: 1px solid var(--border);
          padding: 1.1rem;
          margin-top: 1.25rem;
        }
        .job-match-block h4 {
          margin: 0 0 0.65rem 0;
          font-size: 0.82rem;
          font-weight: 800;
          color: var(--ios-text);
        }
        .job-match-chips {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
        }
        .job-match-chip {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          background: var(--surface, #fff);
          border: 1px solid var(--border-strong);
          color: var(--ios-text);
          font-size: 0.76rem;
          font-weight: 700;
          padding: 0.45rem 0.8rem;
          cursor: pointer;
        }
        .job-detail-tabs {
          display: flex;
          gap: 0.25rem;
          border-bottom: 1px solid var(--border);
          margin-top: 1.5rem;
          overflow-x: auto;
        }
        .job-detail-tabs button {
          background: none;
          border: none;
          border-bottom: 2px solid transparent;
          padding: 0.65rem 0.15rem;
          margin-right: 0.9rem;
          font-size: 0.78rem;
          font-weight: 700;
          color: var(--text-secondary);
          cursor: pointer;
          white-space: nowrap;
        }
        .job-detail-tabs button.active {
          color: var(--ios-olive);
          border-bottom-color: var(--ios-olive);
        }
        .job-detail-tab-body {
          padding-top: 1.25rem;
        }
        .job-detail-section h3 {
          margin: 0 0 0.75rem 0;
          font-size: 0.95rem;
          font-weight: 800;
          color: var(--ios-text);
        }
        .job-detail-notes {
          font-size: 0.86rem;
          line-height: 1.6;
          color: var(--ios-text);
          margin: 0 0 1rem 0;
        }
        .job-detail-empty-text {
          font-size: 0.84rem;
          color: var(--text-secondary);
          font-style: italic;
        }
        .job-detail-list {
          margin: 0;
          padding-left: 1.25rem;
          font-size: 0.84rem;
          color: var(--ios-text);
          line-height: 1.7;
        }
        .job-fact-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 0.75rem;
          margin-top: 1rem;
        }
        .job-fact {
          background: var(--surface-alt);
          border: 1px solid var(--border);
          padding: 0.75rem 0.9rem;
        }
        .job-fact span {
          display: block;
          font-size: 0.68rem;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          color: var(--text-secondary);
          font-weight: 700;
          margin-bottom: 0.2rem;
        }
        .job-fact strong {
          font-size: 0.86rem;
          color: var(--ios-text);
          font-weight: 700;
        }
        .job-detail-company {
          border-top: 1px solid var(--border);
          margin-top: 1.5rem;
          padding-top: 1.25rem;
        }
        .job-detail-company-header {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 0.75rem;
        }
        .job-detail-company-logo {
          width: 42px;
          height: 42px;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #fff;
          font-weight: 800;
          font-size: 0.9rem;
        }
        .job-detail-company-header h4 {
          margin: 0;
          font-size: 0.9rem;
          font-weight: 800;
          color: var(--ios-text);
        }
        .job-detail-company-header p {
          margin: 0.1rem 0 0 0;
          font-size: 0.76rem;
          color: var(--text-secondary);
        }
        .job-detail-company-notes {
          font-size: 0.84rem;
          line-height: 1.6;
          color: var(--ios-text);
          margin: 0;
        }

        .category-tag {
          display: inline-flex;
          align-items: center;
          padding: 0.2rem 0.55rem;
          border: 1px solid;
          font-size: 0.68rem;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.03em;
          white-space: nowrap;
        }

        /* Responsive collapse of the three-column shell */
        @media (max-width: 1200px) {
          .jobs-discovery-shell {
            grid-template-columns: 220px minmax(0, 1fr) 380px;
          }
        }
        @media (max-width: 992px) {
          .jobs-discovery-shell {
            grid-template-columns: 1fr;
          }
          .jobs-filter-toggle {
            display: inline-flex;
          }
          .jobs-filter-sidebar {
            display: none;
          }
          .jobs-filter-sidebar.open {
            display: block;
            position: fixed;
            /* Global Header (.linkedin-header) is sticky at z-index: 100, above
               this drawer's z-index: 60 — start below it so the drawer's own
               title/close button aren't rendered underneath it. */
            top: 107px;
            left: 0;
            bottom: 0;
            width: min(320px, 85vw);
            z-index: 60;
            overflow-y: auto;
          }
          .jobs-filter-close {
            display: inline-flex;
          }
          .jobs-filter-backdrop {
            display: block;
            position: fixed;
            inset: 0;
            background: rgba(15, 23, 42, 0.45);
            z-index: 55;
          }
          .job-detail-panel {
            position: static;
            max-height: none;
          }
        }
        @media (max-width: 768px) {
          .jobs-page { padding: 0.9rem 0.75rem calc(5.5rem + env(safe-area-inset-bottom, 0px)); }
          .jobs-hero { padding: 1.25rem 1rem; border-radius: 12px; }
          .jobs-hero-eyebrow { margin-bottom: 0.25rem; font-size: 0.64rem; }
          .jobs-hero-title { font-size: clamp(1.45rem, 6.5vw, 1.8rem); margin-bottom: 0.3rem; line-height: 1.1; }
          .jobs-hero-subtitle { margin-bottom: 0.65rem; font-size: 0.8rem; line-height: 1.35; max-width: 35ch; }
          
          /* Compact unified mobile search bar */
          .jobs-search-panel {
            display: flex;
            align-items: center;
            background: #ffffff;
            border-radius: 8px;
            padding: 0.2rem 0.25rem 0.2rem 0.65rem;
            box-shadow: 0 4px 14px rgba(0, 0, 0, 0.2);
            min-height: 38px;
            gap: 0.4rem;
            width: 100%;
            box-sizing: border-box;
          }
          .jobs-search-static {
            display: none;
          }
          .jobs-search-field {
            flex: 1;
            min-width: 0;
            display: flex;
            align-items: center;
            background: transparent;
            position: relative;
          }
          .jobs-search-icon {
            position: static;
            margin-right: 0.45rem;
            width: 15px;
            height: 15px;
            flex-shrink: 0;
          }
          .jobs-search-field input {
            width: 100%;
            border: none;
            background: transparent;
            padding: 0.4rem 0;
            font-size: 0.8rem;
            color: var(--ios-text, #0f172a);
          }
          .jobs-search-field input::placeholder {
            font-size: 0.8rem;
          }
          .jobs-search-btn {
            padding: 0.4rem 0.8rem;
            font-size: 0.78rem;
            font-weight: 700;
            border-radius: 6px;
            flex-shrink: 0;
            min-height: 30px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
          }

          .jobs-stats { display: none; }
          .job-fact-grid { grid-template-columns: 1fr; }
          .mobile-job-detail-open { padding: 0; }
          .mobile-job-detail-open .jobs-hero,
          .mobile-job-detail-open .jobs-stats,
          .mobile-job-detail-open .jobs-filter-toggle,
          .mobile-job-detail-open .jobs-filter-sidebar,
          .mobile-job-detail-open .jobs-results { display: none; }
          .mobile-job-detail-open .jobs-discovery-shell { display: block; margin-top: 0; }
          .mobile-job-detail-open .job-detail-panel { border: none; padding: 1rem; }
          .mobile-job-detail-open .job-detail-back { display: inline-flex; }
        }
        @media (max-width: 420px) {
          .jobs-hero { padding: 1rem 0.85rem; }
          .jobs-hero-title { font-size: 1.35rem; }
          .jobs-hero-subtitle { display: none; }
          .jobs-search-panel { margin-top: 0.45rem; }
          .jobs-search-btn { padding-inline: 0.7rem; }
        }
      `}} />
    </div>
  );
};

export default JobBoard;
