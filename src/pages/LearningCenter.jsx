import { useMemo, useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Book, RefreshCw, Search, ChevronDown, ChevronUp, BookOpen, ScrollText, Brain, X, Target, Rocket, ArrowRight } from 'lucide-react';
import { getTransferableSkills } from '../lib/profilingInsights';
import { getSubjectByKey, getFamilyHex } from '../lib/thumbnailTaxonomy';
import { getEffectiveTier } from '../lib/subscriptionAccess';
import Select from '../components/ui/Select';
import ExamContentPreview from '../components/ExamContentPreview';
import './LearningCenter.css';

// A handful of representative subjects for the Syllabus teaser card's chip
// row — this page has no single exam in context, so it can't show a real
// per-exam subject grid (that lives on ExamSyllabus.jsx); this is just a
// preview of the taxonomy used there.
const TEASER_SUBJECT_KEYS = ['english', 'gk_general_awareness', 'reasoning', 'mathematics', 'general_studies', 'computer_science'];

/**
 * One coherent flow: Search + Filters -> Search Results -> My Exams ->
 * Preparation Centers (Syllabus / PYQ / Quiz) -> Skill Development. Search
 * Results is a single unified list — it shows real catalog matches once any
 * filter/search/conducting-body is active, and falls back to the profile's
 * personalized matches when nothing is. Nothing goes between the filters
 * and the results; browsing hierarchy (level -> state -> conducting body)
 * is now just filter facets on that one result list, not a separate
 * multi-step drill-down with its own results section.
 */
const LearningCenter = () => {
  const navigate = useNavigate();
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState(null);

  // Personalization signals
  const [examMatches, setExamMatches] = useState([]);
  const [transferableSkills, setTransferableSkills] = useState([]);
  const [examProgress, setExamProgress] = useState({});

  // Primary preparation target (from user_exam_targets)
  const [primaryTarget, setPrimaryTarget] = useState(null); // { exam_id, exam_name, conducting_body, ... }
  const [allTargetIds, setAllTargetIds] = useState(new Set()); // all saved exam IDs
  const [preparingExamId, setPreparingExamId] = useState(null); // loading state for CTA

  // Catalog + filters. The whole lc_exams catalog (~1k rows) is fetched
  // once; every filter/level/derived list comes from it client-side.
  const [regionMode, setRegionMode] = useState('central'); // 'central' | 'state' | 'ut'
  const [catalog, setCatalog] = useState([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState(null);
  const [regionFilterId, setRegionFilterId] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [selectedBodyId, setSelectedBodyId] = useState('');
  const [searchText, setSearchText] = useState('');

  const [expandedExamId, setExpandedExamId] = useState(null);
  const [profile, setProfile] = useState(null);
  const effectiveTier = getEffectiveTier(profile?.subscription_tier, profile?.subscription_expires_at);
  const freeQuizUsed = !!profile?.free_quiz_used;

  const toggleExpanded = (examId) => setExpandedExamId((prev) => (prev === examId ? null : examId));

  // Saves the exam as the candidate's primary target and navigates to its journey.
  const handleStartPreparing = useCallback(async (examId, examName) => {
    if (!examId) return;
    setPreparingExamId(examId);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        // Demote any existing primary, then upsert this exam as primary.
        await supabase
          .from('user_exam_targets')
          .update({ is_primary: false })
          .eq('user_id', session.user.id)
          .eq('is_primary', true);
        await supabase.from('user_exam_targets').upsert({
          user_id: session.user.id,
          exam_id: examId,
          is_primary: true,
          status: 'active',
          last_activity_at: new Date().toISOString(),
        }, { onConflict: 'user_id,exam_id' });
      }
    } catch (err) {
      console.warn('Could not save exam target:', err);
    } finally {
      setPreparingExamId(null);
      navigate(`/exam/${examId}`);
    }
  }, [navigate]);

  const handleRegionModeChange = (mode) => {
    setRegionMode(mode);
    setRegionFilterId('');
    setCategoryFilter('');
    setSelectedBodyId('');
  };

  const handleRegionFilterChange = (regionId) => {
    setRegionFilterId(regionId);
    setCategoryFilter('');
    setSelectedBodyId('');
  };

  const handleCategoryFilterChange = (category) => {
    setCategoryFilter(category);
    setSelectedBodyId('');
  };

  const handleClearFilters = () => {
    setRegionFilterId('');
    setCategoryFilter('');
    setSelectedBodyId('');
    setSearchText('');
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setCatalogLoading(true);
      const { data, error: catErr } = await supabase
        .from('lc_exams')
        .select('id,name,category,accent_color,thumbnail_subject,conducting_body_id,conducting_body:lc_conducting_bodies(id,name),region:lc_regions(id,name,level)');
      if (cancelled) return;
      if (catErr) setCatalogError('Unable to load the exam catalog.');
      else setCatalog(data || []);
      setCatalogLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  // State/UT filter options: scoped to the active level's own regions in
  // State/UT mode (picking one is required there), but spans both in
  // Central mode since it's an optional cross-filter onto bodies that also
  // run a state-linked exam.
  const regionFilterOptions = useMemo(() => {
    const seen = new Map();
    for (const exam of catalog) {
      if (!exam.region) continue;
      const relevant = regionMode === 'central'
        ? (exam.region.level === 'state' || exam.region.level === 'ut')
        : exam.region.level === regionMode;
      if (relevant && !seen.has(exam.region.id)) seen.set(exam.region.id, exam.region);
    }
    return [...seen.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [catalog, regionMode]);

  // Exams satisfying the level gate: Central takes every central exam;
  // State/UT requires a specific region pick first.
  const levelExams = useMemo(() => catalog.filter((exam) => {
    if (!exam.region) return false;
    if (regionMode === 'central') return exam.region.level === 'central';
    return exam.region.id === regionFilterId;
  }), [catalog, regionMode, regionFilterId]);

  const categoryOptions = useMemo(() => {
    const seen = new Set();
    for (const exam of levelExams) {
      const c = (exam.category || '').trim();
      if (c) seen.add(c);
    }
    return [...seen].sort((a, b) => a.localeCompare(b));
  }, [levelExams]);

  const bodyOptions = useMemo(() => {
    const pool = categoryFilter
      ? levelExams.filter((exam) => (exam.category || '').trim() === categoryFilter)
      : levelExams;
    const seen = new Map();
    for (const exam of pool) {
      if (exam.conducting_body && !seen.has(exam.conducting_body.id)) seen.set(exam.conducting_body.id, exam.conducting_body);
    }
    let bodies = [...seen.values()];
    if (regionMode === 'central' && regionFilterId) {
      const crossBodyIds = new Set(catalog.filter((exam) => exam.region?.id === regionFilterId).map((exam) => exam.conducting_body_id));
      bodies = bodies.filter((b) => crossBodyIds.has(b.id));
    }
    return bodies.sort((a, b) => a.name.localeCompare(b.name));
  }, [levelExams, categoryFilter, regionMode, regionFilterId, catalog]);

  // The single result list driving "Search Results" — always computed
  // (cheap, memoized); whether it's actually shown vs. the personalized
  // fallback is decided by filtersActive below.
  const searchResults = useMemo(() => {
    if (regionMode !== 'central' && !regionFilterId) return [];
    let pool = categoryFilter
      ? levelExams.filter((exam) => (exam.category || '').trim() === categoryFilter)
      : levelExams;
    if (selectedBodyId) pool = pool.filter((exam) => exam.conducting_body_id === selectedBodyId);
    if (regionMode === 'central' && regionFilterId) {
      const crossBodyIds = new Set(catalog.filter((exam) => exam.region?.id === regionFilterId).map((exam) => exam.conducting_body_id));
      pool = pool.filter((exam) => crossBodyIds.has(exam.conducting_body_id));
    }
    const q = searchText.trim().toLowerCase();
    if (q) {
      pool = pool.filter((exam) =>
        exam.name.toLowerCase().includes(q) ||
        (exam.conducting_body?.name || '').toLowerCase().includes(q) ||
        (exam.category || '').toLowerCase().includes(q)
      );
    }
    return pool.slice().sort((a, b) => a.name.localeCompare(b.name));
  }, [regionMode, regionFilterId, levelExams, categoryFilter, selectedBodyId, catalog, searchText]);

  const filtersActive = regionMode !== 'central' || Boolean(searchText.trim()) || Boolean(regionFilterId) || Boolean(categoryFilter) || Boolean(selectedBodyId);

  const matchByExamId = useMemo(() => {
    const m = new Map();
    for (const match of examMatches) if (match.exam_id) m.set(match.exam_id, match);
    return m;
  }, [examMatches]);

  const myExams = useMemo(
    () => examMatches.filter((m) => (examProgress[m.exam_name]?.explored || 0) > 0),
    [examMatches, examProgress]
  );

  const loadPersonalization = async (userId, matches) => {
    let openedIds = [];
    try {
      const { data: opens, error: opensErr } = await supabase
        .from('point_transactions')
        .select('ref_id, created_at')
        .eq('user_id', userId)
        .eq('action_code', 'RESOURCE_OPENED')
        .order('created_at', { ascending: false })
        .limit(50);

      if (opensErr) {
         console.warn('Supabase error loading personalization signals:', opensErr.message);
      } else if (opens) {
         openedIds = opens.map(o => o.ref_id).filter(Boolean);
      }
    } catch (err) {
      console.warn('Could not load learning personalization signals (point_transactions may not exist):', err);
    }

    const matchExamNames = matches.slice(0, 4).map(m => m.exam_name).filter(Boolean);

    try {
      const exploredRes = openedIds.length
        ? await supabase.from('resources_v2').select('resource_id, exam_name').in('resource_id', openedIds)
        : { data: [] };

      const exploredByExam = {};
      (exploredRes?.data || []).forEach(r => {
        if (!r.exam_name) return;
        exploredByExam[r.exam_name] = (exploredByExam[r.exam_name] || 0) + 1;
      });

      if (matchExamNames.length) {
        const counts = await Promise.all(
          matchExamNames.map(name =>
            supabase.from('resources_v2').select('*', { count: 'exact', head: true }).eq('status', 'Published').eq('exam_name', name)
          )
        );
        const progress = {};
        matchExamNames.forEach((name, i) => {
          progress[name] = {
            total: counts[i]?.count ?? null,
            explored: exploredByExam[name] || 0,
          };
        });
        setExamProgress(progress);
      }
    } catch (err) {
      console.warn('Could not load learning personalization resources:', err);
    }
  };

  useEffect(() => {
    const fetchInitialData = async () => {
      setInitialLoading(true);
      setError(null);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const { data: profileRow } = await supabase
            .from('user_profiles')
            .select('recommendations, raw_profile_data, subscription_tier, subscription_expires_at, free_quiz_used')
            .eq('id', session.user.id)
            .maybeSingle();
          if (profileRow) {
            setProfile(profileRow);
            const matches = Array.isArray(profileRow.recommendations) ? profileRow.recommendations : [];
            setExamMatches(matches);
            if (profileRow.raw_profile_data) {
              setTransferableSkills(getTransferableSkills(profileRow.raw_profile_data));
            }
            loadPersonalization(session.user.id, matches);
          }

          // Load the candidate's exam targets (primary + all saved)
          try {
            const { data: targets } = await supabase
              .from('user_exam_targets')
              .select('exam_id, is_primary, status, exam:lc_exams(id, name, conducting_body:lc_conducting_bodies(name))')
              .eq('user_id', session.user.id)
              .eq('status', 'active');
            if (targets?.length) {
              setAllTargetIds(new Set(targets.map((t) => t.exam_id)));
              const primary = targets.find((t) => t.is_primary);
              if (primary?.exam) {
                setPrimaryTarget({
                  exam_id: primary.exam_id,
                  exam_name: primary.exam.name,
                  conducting_body: primary.exam.conducting_body?.name || '',
                });
              }
            }
          } catch (e) {
            // user_exam_targets may not exist yet; gracefully ignore
            console.warn('Could not load exam targets (migration may be pending):', e);
          }
        }
      } catch (err) {
        console.error('Error in initial load:', err);
        setError('Unable to connect to the learning database. Please check your connection and try again.');
      } finally {
        setInitialLoading(false);
      }
    };
    fetchInitialData();
  }, []);

  const topExam = myExams[0] || examMatches[0] || null;
  const topExamId = topExam?.exam_id || searchResults[0]?.id || null;
  const topExamName = topExam?.exam_name || searchResults[0]?.name || null;
  const topExamCareerTrack = topExam?.career_track;

  return (
    <div className="learning-wrapper">
      <div className="learning-layout-full">
        <main className="main-content">
          <div className="content-header">
            <span className="hero-eyebrow">Your Learning Path</span>
            <h1 className="main-title">Prepare for your next career move.</h1>
            <p className="main-subtitle">Find exams and preparation material matched to your profile.</p>

            <div className="search-box">
              <Search size={18} className="search-icon" />
              <input
                type="text"
                placeholder="Search exams, conducting bodies or categories..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
              />
            </div>

            <div className="region-toggle">
              <button
                onClick={() => handleRegionModeChange('central')}
                className={`region-toggle-btn ${regionMode === 'central' ? 'active' : ''}`}
              >
                Central Exams
              </button>
              <button
                onClick={() => handleRegionModeChange('state')}
                className={`region-toggle-btn ${regionMode === 'state' ? 'active' : ''}`}
              >
                State Exams
              </button>
              <button
                onClick={() => handleRegionModeChange('ut')}
                className={`region-toggle-btn ${regionMode === 'ut' ? 'active' : ''}`}
              >
                UT Exams
              </button>
            </div>

            <div className="browse-group filter-row">
              <div className="filter-col">
                <h4 className="browse-group-title">{regionMode === 'central' ? 'State / UT (optional)' : regionMode === 'state' ? 'State' : 'Union Territory'}</h4>
                <Select
                  searchable
                  value={regionFilterId}
                  onChange={(e) => handleRegionFilterChange(e.target.value)}
                  placeholder={regionMode === 'central' ? 'All States/UTs' : `Select a ${regionMode === 'state' ? 'state' : 'UT'}...`}
                  options={[{ value: '', label: regionMode === 'central' ? 'All States/UTs' : `Select a ${regionMode === 'state' ? 'state' : 'UT'}...` }, ...regionFilterOptions.map(r => ({ value: r.id, label: r.name }))]}
                />
              </div>
              <div className="filter-col">
                <h4 className="browse-group-title">Category</h4>
                <Select
                  searchable
                  value={categoryFilter}
                  onChange={(e) => handleCategoryFilterChange(e.target.value)}
                  placeholder="All categories"
                  disabled={categoryOptions.length === 0}
                  options={[{ value: '', label: 'All categories' }, ...categoryOptions.map(c => ({ value: c, label: c }))]}
                />
              </div>
            </div>

            {(regionMode === 'central' || regionFilterId) && (
              <div className="browse-group">
                <h4 className="browse-group-title">Conducting Body</h4>
                {catalogLoading ? (
                  <p className="filter-empty-note">Loading…</p>
                ) : catalogError ? (
                  <p className="filter-empty-note">{catalogError}</p>
                ) : (
                  <div className="body-grid">
                    {bodyOptions.map(body => (
                      <button
                        key={body.id}
                        onClick={() => setSelectedBodyId(selectedBodyId === body.id ? '' : body.id)}
                        className={`body-grid-btn ${selectedBodyId === body.id ? 'active' : ''}`}
                      >
                        {body.name}
                      </button>
                    ))}
                    {bodyOptions.length === 0 && <p className="filter-empty-note">No conducting bodies match these filters.</p>}
                  </div>
                )}
              </div>
            )}

            {regionMode !== 'central' && !regionFilterId && (
              <p className="filter-empty-note" style={{ marginTop: '1.5rem' }}>Pick a {regionMode === 'state' ? 'state' : 'UT'} above to see its conducting bodies.</p>
            )}
          </div>

          {error ? (
            <div className="empty-library">
              <Book size={64} style={{ color: '#ef4444' }} />
              <h3 style={{ color: '#0f172a' }}>Unable to Load Resources</h3>
              <p style={{ color: '#64748b', maxWidth: '500px', margin: '0.5rem auto 1.5rem' }}>{error}</p>
              <button className="retry-btn" onClick={() => window.location.reload()}>
                <RefreshCw size={16} /> Try Again
              </button>
            </div>
          ) : initialLoading ? (
            <div className="loading-state">
              <RefreshCw className="animate-spin" size={32} />
              <p>Fetching latest courses...</p>
            </div>
          ) : (
            <div className="course-sections">

              {/* ── Current Preparation Hero ── */}
              {primaryTarget && (
                <div className="lc-prep-hero">
                  <div className="lc-prep-hero-left">
                    <span className="lc-prep-hero-eyebrow">Your Current Mission</span>
                    <h2 className="lc-prep-hero-title">{primaryTarget.exam_name}</h2>
                    {primaryTarget.conducting_body && (
                      <p className="lc-prep-hero-body">{primaryTarget.conducting_body}</p>
                    )}
                  </div>
                  <div className="lc-prep-hero-right">
                    <Link
                      to={`/exam/${primaryTarget.exam_id}`}
                      className="lc-prep-hero-continue-btn"
                    >
                      Continue Preparing <ArrowRight size={15} />
                    </Link>
                  </div>
                </div>
              )}

              <div className="course-section">
                <div className="section-header">
                  <h2>Search Results</h2>
                </div>
                <p className="skill-section-subtitle" style={{ marginTop: '-0.5rem', marginBottom: '1rem' }}>
                  {filtersActive ? 'Exams matching your filters' : 'Recommended for you'}
                  {filtersActive && (
                    <button type="button" onClick={handleClearFilters} className="clear-filters-link">
                      <X size={13} /> Clear filters
                    </button>
                  )}
                </p>

                {catalogLoading && filtersActive ? (
                  <div className="loading-state">
                    <RefreshCw className="animate-spin" size={24} />
                  </div>
                ) : (
                  <div className="result-list">
                    {(filtersActive ? searchResults : examMatches.slice(0, 8)).map((item) => {
                      const isCatalogItem = filtersActive;
                      const examId = isCatalogItem ? item.id : item.exam_id;
                      const name = isCatalogItem ? item.name : item.exam_name;
                      const conductingBody = isCatalogItem ? item.conducting_body?.name : item.conducting_body;
                      const match = isCatalogItem ? matchByExamId.get(item.id) : item;
                      const score = match?.score;
                      const careerTrack = match?.career_track;
                      const resourceCount = examProgress[name]?.total;
                      const isExpanded = expandedExamId === examId;
                      if (!examId) return null;
                      return (
                        <div key={examId} className="result-card">
                          <button type="button" className="result-card-clickable" onClick={() => toggleExpanded(examId)}>
                            <div className="result-card-top">
                              <h3>{name}</h3>
                              {score != null && <span className="exam-match-score">{Math.round(score)}% Match</span>}
                            </div>
                            {conductingBody && <p className="result-card-body">{conductingBody}</p>}
                            <div className="result-card-bottom">
                              <span>{resourceCount != null ? `${resourceCount} resource${resourceCount === 1 ? '' : 's'} available` : ''}</span>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <button
                                  type="button"
                                  className="lc-start-preparing-btn"
                                  onClick={(e) => { e.stopPropagation(); handleStartPreparing(examId, name); }}
                                  disabled={preparingExamId === examId}
                                >
                                  {preparingExamId === examId
                                    ? <RefreshCw size={12} className="animate-spin" />
                                    : <Rocket size={12} />}
                                  {allTargetIds.has(examId) ? 'Continue' : 'Start Preparing'}
                                </button>
                                <span className="result-card-cta" onClick={() => toggleExpanded(examId)} style={{cursor:'pointer'}}>
                                  {isExpanded ? 'Hide' : 'Details'} {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                </span>
                              </div>
                            </div>
                          </button>
                          {isExpanded && (
                            <div className="result-card-expanded">
                              <ExamContentPreview
                                examId={examId}
                                examName={name}
                                careerTrack={careerTrack}
                                tier={effectiveTier}
                                freeQuizUsed={freeQuizUsed}
                                variant="subjects"
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                    {(filtersActive ? searchResults.length === 0 : examMatches.length === 0) && (
                      <div className="empty-library">
                        <Book size={48} />
                        <h3>No exams found</h3>
                        <p>
                          {regionMode !== 'central' && !regionFilterId
                            ? `Pick a ${regionMode === 'state' ? 'state' : 'UT'} above to see its exams.`
                            : filtersActive
                              ? 'Try a different search or clear your filters.'
                              : 'Update your profile to get personalized exam matches.'}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* ── My Exams (saved targets) ── */}
              <div className="course-section">
                <div className="section-header">
                  <h2>My Exams</h2>
                </div>
                <p className="skill-section-subtitle" style={{ marginTop: '-0.5rem', marginBottom: '1rem' }}>Exams you're preparing for</p>
                {myExams.length > 0 ? (
                  <div className="my-exams-grid">
                    {myExams.map((match) => {
                      const prog = examProgress[match.exam_name];
                      const isExpanded = expandedExamId === match.exam_id;
                      const isPrimary = primaryTarget?.exam_id === match.exam_id;
                      return (
                        <div key={match.exam_id || match.exam_name} className={`my-exam-card ${isExpanded ? 'my-exam-card-expanded' : ''}`}>
                          <button type="button" className="my-exam-card-clickable" onClick={() => toggleExpanded(match.exam_id)}>
                            <h3>{match.exam_name}</h3>
                            {match.conducting_body && <p className="exam-progress-body">{match.conducting_body}</p>}
                            <div className="my-exam-card-footer">
                              {match.score != null && <span className="exam-match-score">{Math.round(match.score)}% Match</span>}
                              {prog?.total ? <span className="exam-progress-explored">{prog.explored} of {prog.total} explored</span> : null}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.5rem' }}>
                              <button
                                type="button"
                                className="lc-start-preparing-btn"
                                onClick={(e) => { e.stopPropagation(); handleStartPreparing(match.exam_id, match.exam_name); }}
                                disabled={preparingExamId === match.exam_id}
                              >
                                {preparingExamId === match.exam_id
                                  ? <RefreshCw size={12} className="animate-spin" />
                                  : <Rocket size={12} />}
                                {isPrimary ? 'Current Mission' : 'Make Primary'}
                              </button>
                              <span className="result-card-cta">{isExpanded ? 'Hide' : 'Details'} {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}</span>
                            </div>
                          </button>
                          {isExpanded && (
                            <div className="result-card-expanded">
                              <ExamContentPreview
                                examId={match.exam_id}
                                examName={match.exam_name}
                                careerTrack={match.career_track}
                                tier={effectiveTier}
                                freeQuizUsed={freeQuizUsed}
                                variant="subjects"
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="filter-empty-note">No exams saved yet. Click <strong>Start Preparing</strong> on any exam above to begin your journey.</p>
                )}
              </div>

              {/* ── Preparation Centers (global hubs, always visible) ── */}
              <div className="course-section">
                <div className="section-header">
                  <h2>Preparation Centers</h2>
                </div>
                <div className="prep-centers-grid">
                  <div className="prep-card prep-card-wide">
                    <div className="prep-card-icon"><BookOpen size={22} /></div>
                    <h3>Syllabus</h3>
                    <p>Explore your preparation material by subject.</p>
                    <div className="subject-chip-row">
                      {TEASER_SUBJECT_KEYS.map((key) => {
                        const subject = getSubjectByKey(key);
                        return (
                          <span key={key} className="subject-chip" style={{ background: getFamilyHex(subject.family) }}>
                            {subject.label}
                          </span>
                        );
                      })}
                    </div>
                    {topExamId ? (
                      <button type="button" className="result-card-cta prep-inline-cta" onClick={() => toggleExpanded(topExamId)}>
                        {expandedExamId === topExamId ? 'Hide syllabus' : 'View syllabus'} {expandedExamId === topExamId ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </button>
                    ) : (
                      <span className="filter-empty-note">Pick an exam above to view its syllabus.</span>
                    )}
                    {topExamId && expandedExamId === topExamId && (
                      <div className="result-card-expanded">
                        <ExamContentPreview
                          examId={topExamId}
                          examName={topExamName}
                          careerTrack={topExamCareerTrack}
                          tier={effectiveTier}
                          freeQuizUsed={freeQuizUsed}
                          variant="subjects"
                        />
                      </div>
                    )}
                  </div>

                  <div className="prep-card">
                    <div className="prep-card-icon"><ScrollText size={22} /></div>
                    <h3>PYQ Center</h3>
                    <p>Practice with questions from previous examinations.</p>
                    <Link to={primaryTarget ? `/pyq-center?exam=${primaryTarget.exam_id}` : '/pyq-center'} className="ios-btn-primary" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', padding: '0.65rem 1rem', width: '100%', marginTop: 'auto', fontSize: '0.85rem', fontWeight: 'bold' }}>
                      Visit PYQ Center
                    </Link>
                  </div>

                  <div className="prep-card">
                    <div className="prep-card-icon"><Brain size={22} /></div>
                    <h3>Quiz Center</h3>
                    <p>Test your knowledge with subject-wise quizzes and exam simulations.</p>
                    <Link to={primaryTarget ? `/quiz-center?exam=${primaryTarget.exam_id}` : '/quiz-center'} className="ios-btn-primary" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', padding: '0.65rem 1rem', width: '100%', marginTop: 'auto', fontSize: '0.85rem', fontWeight: 'bold' }}>
                      Visit Quiz Center
                    </Link>
                  </div>
                </div>
              </div>

              {transferableSkills.length > 0 && (
                <div className="course-section">
                  <div className="section-header">
                    <h2>Skill Development</h2>
                  </div>
                  <p className="skill-section-subtitle">Skills identified from your service profile.</p>
                  <ul className="skill-list">
                    {transferableSkills.map((skill, i) => <li key={i}>{skill}</li>)}
                  </ul>
                </div>
              )}

            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default LearningCenter;

