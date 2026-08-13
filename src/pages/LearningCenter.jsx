import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Book, Lock, Eye, Unlock, PlayCircle, RefreshCw, Search, CheckCircle, ArrowRight, Layers } from 'lucide-react';
import { getEffectiveTier, isResourceLockedForUser, canTakeQuiz, TIERS } from '../lib/subscriptionAccess';
import { cleanContentTitle } from '../lib/contentTitle';
import { getTransferableSkills } from '../lib/profilingInsights';
import Card from '../components/ui/Card';

const FILTER_CHIPS = [
  { key: 'all', label: 'All' },
  { key: 'my-exams', label: 'My Exams' },
  { key: 'mock-tests', label: 'Mock Tests' },
  { key: 'study-guides', label: 'Study Guides' },
];

const LearningCenter = () => {
  const [resources, setResources] = useState([]);
  const [quizzes, setQuizzes] = useState([]);
  const [exams, setExams] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [effectiveTier, setEffectiveTier] = useState(TIERS.FREE);
  const [freeQuizUsed, setFreeQuizUsed] = useState(false);

  // Real personalization signals — everything here comes from data that
  // genuinely exists (profiling recommendations, transferable-skills copy,
  // the points ledger's RESOURCE_OPENED events). Nothing here is a fabricated
  // percentage; sections simply don't render when the backing data is empty.
  const [examMatches, setExamMatches] = useState([]);
  const [transferableSkills, setTransferableSkills] = useState([]);
  const [continueItem, setContinueItem] = useState(null);
  const [recommendedItems, setRecommendedItems] = useState([]);
  const [examProgress, setExamProgress] = useState({});
  const [activeFilterChip, setActiveFilterChip] = useState('all');

  // Infinite scroll state
  const PAGE_SIZE = 20;
  const [page, setPage] = useState(0);
  const [hasMoreResources, setHasMoreResources] = useState(true);
  const [hasMoreQuizzes, setHasMoreQuizzes] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [totalResourceCount, setTotalResourceCount] = useState(null);
  const [totalQuizCount, setTotalQuizCount] = useState(null);

  // Filters
  const [selectedExams, setSelectedExams] = useState(['all']);
  const [selectedCategories, setSelectedCategories] = useState(['all']);
  const [searchQuery, setSearchQuery] = useState('');

  const AVAILABLE_CATEGORIES = [
    'Intro',
    'Guide',
    'Precis',
    'PYQ',
    'Mock Test'
  ];

  const handleCategoryCheckboxChange = (category) => {
    setActiveFilterChip('all');
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
    setActiveFilterChip('all');
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

  const applyFilterChip = (key) => {
    setActiveFilterChip(key);
    if (key === 'my-exams') {
      const names = examMatches.map(m => m.exam_name).filter(Boolean);
      setSelectedExams(names.length ? names : ['all']);
      setSelectedCategories(['all']);
    } else if (key === 'mock-tests') {
      setSelectedExams(['all']);
      setSelectedCategories(['Mock Test']);
    } else if (key === 'study-guides') {
      setSelectedExams(['all']);
      setSelectedCategories(['Guide', 'Precis', 'Intro']);
    } else {
      setSelectedExams(['all']);
      setSelectedCategories(['all']);
    }
  };

  const filterToExam = (examName) => {
    setActiveFilterChip('all');
    setSelectedExams([examName]);
    setSelectedCategories(['all']);
    document.getElementById('full-library')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // Best-effort personalization: exam matches + transferable skills come
  // straight off the profile row; "Continue Learning" / "Recommended" /
  // per-exam explored counts all key off the point_transactions ledger,
  // which may not exist yet if sql/points_system.sql hasn't been run —
  // this fails silently (empty sections) rather than showing an error,
  // matching the same defensive pattern useAccountSummary.js uses.
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
      if (!opensErr && opens) openedIds = opens.map(o => o.ref_id).filter(Boolean);
    } catch {
      // points system not migrated yet — no activity signal available
    }

    const matchExamNames = matches.slice(0, 4).map(m => m.exam_name).filter(Boolean);

    try {
      const [continueRes, recommendedRes, exploredRes] = await Promise.all([
        openedIds[0]
          ? supabase.from('resources_v2').select('*').eq('resource_id', openedIds[0]).maybeSingle()
          : Promise.resolve({ data: null }),
        matchExamNames.length
          ? supabase.from('resources_v2').select('*').eq('status', 'Published').in('exam_name', matchExamNames).order('created_at', { ascending: false }).limit(20)
          : Promise.resolve({ data: [] }),
        openedIds.length
          ? supabase.from('resources_v2').select('resource_id, exam_name').in('resource_id', openedIds)
          : Promise.resolve({ data: [] }),
      ]);

      if (continueRes?.data) setContinueItem(continueRes.data);

      const openedSet = new Set(openedIds);
      setRecommendedItems((recommendedRes?.data || []).filter(r => !openedSet.has(r.resource_id)).slice(0, 4));

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
      console.warn('Could not load learning personalization signals', err);
    }
  };

  useEffect(() => {
    const fetchInitialData = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const { data: profile } = await supabase
            .from('user_profiles')
            .select('subscription_tier, subscription_expires_at, free_quiz_used, recommendations, raw_profile_data')
            .eq('id', session.user.id)
            .maybeSingle();
          if (profile) {
            const tier = getEffectiveTier(profile.subscription_tier, profile.subscription_expires_at);
            setEffectiveTier(tier);
            setFreeQuizUsed(!!profile.free_quiz_used);

            const matches = Array.isArray(profile.recommendations) ? profile.recommendations : [];
            setExamMatches(matches);
            if (profile.raw_profile_data) {
              setTransferableSkills(getTransferableSkills(profile.raw_profile_data));
            }
            loadPersonalization(session.user.id, matches);
          }
        }

        const { data: examData, error: examError } = await supabase
          .from('resources_v2')
          .select('exam_name');

        if (examError) {
          console.error('Supabase exam fetch error:', examError);
          setError(`Failed to load exams: ${examError.message}`);
          setLoading(false);
          return;
        }

        if (examData) {
          const uniqueExams = [...new Set(examData.map(e => e.exam_name).filter(Boolean))].sort();
          setExams(uniqueExams);
        }
        await fetchContent();
      } catch (err) {
        console.error('Error in initial load:', err);
        setError('Unable to connect to the learning database. Please check your connection and try again.');
      } finally {
        setLoading(false);
      }
    };
    fetchInitialData();
  }, []);

  const buildQuery = (table, isCount = false) => {
    let query;
    if (isCount) {
      query = supabase.from(table).select('*', { count: 'exact', head: true });
    } else {
      query = supabase.from(table).select('*');
    }
    if (table === 'resources_v2') query = query.eq('status', 'Published');

    if (!selectedExams.includes('all')) {
      query = query.in('exam_name', selectedExams);
    }
    if (!selectedCategories.includes('all')) {
      const catFilters = selectedCategories.map(c => `category.eq.${c}`).join(',');
      query = query.or(catFilters);
    }
    if (searchQuery) {
      const filter = `title.ilike."%${searchQuery}%",subject.ilike."%${searchQuery}%",exam_name.ilike."%${searchQuery}%"`;
      query = query.or(filter);
    }
    return query;
  };

  const fetchPage = async (pageNum, isInitial = false) => {
    if (isInitial) {
      setLoading(true);
      setResources([]);
      setQuizzes([]);
      setError(null);
      setHasMoreResources(true);
      setHasMoreQuizzes(true);
      setTotalResourceCount(null);
      setTotalQuizCount(null);
    } else {
      setLoadingMore(true);
    }

    const from = pageNum * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    try {
      // Build data queries with range
      const resQuery = buildQuery('resources_v2').order('created_at', { ascending: false }).range(from, to);
      const quizQuery = buildQuery('quizzes').order('created_at', { ascending: false }).range(from, to);

      const fetches = [resQuery, quizQuery];

      // On initial load, also fetch total counts for display
      if (isInitial) {
        fetches.push(buildQuery('resources_v2', true));
        fetches.push(buildQuery('quizzes', true));
      }

      const results = await Promise.all(fetches);
      const [resData, quizData] = results;

      if (resData.error || quizData.error) {
        const errMsg = resData.error?.message || quizData.error?.message || 'Unknown database error';
        console.error('Supabase query error:', resData.error || quizData.error);
        setError(`Database retrieval failed: ${errMsg}`);
        return;
      }

      const newResources = resData.data || [];
      const newQuizzes = quizData.data || [];

      if (isInitial) {
        setResources(newResources);
        setQuizzes(newQuizzes);
        // Set total counts from count queries
        const resCount = results[2];
        const quizCount = results[3];
        if (resCount && !resCount.error) setTotalResourceCount(resCount.count);
        if (quizCount && !quizCount.error) setTotalQuizCount(quizCount.count);
      } else {
        setResources(prev => [...prev, ...newResources]);
        setQuizzes(prev => [...prev, ...newQuizzes]);
      }

      // Determine if there's more to load
      if (newResources.length < PAGE_SIZE) setHasMoreResources(false);
      if (newQuizzes.length < PAGE_SIZE) setHasMoreQuizzes(false);
    } catch (err) {
      console.error('Error fetching learning content:', err);
      setError('Unable to fetch learning resources. Please try again.');
    } finally {
      if (isInitial) setLoading(false);
      setLoadingMore(false);
    }
  };

  const fetchContent = async () => {
    setPage(0);
    await fetchPage(0, true);
  };

  const hasMore = hasMoreResources || hasMoreQuizzes;

  const loadNextPage = () => {
    if (loadingMore || !hasMore) return;
    const nextPage = page + 1;
    setPage(nextPage);
    fetchPage(nextPage, false);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchContent();
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery, selectedExams, selectedCategories]);

  const renderCard = (item, type) => {
    let isLocked = false;
    let isPartial = false;

    if (type === 'resource') {
      isLocked = isResourceLockedForUser(effectiveTier, item.category);
      const cat = (item.category || '').toLowerCase().trim();
      if (cat === 'guide' || cat === 'precis') {
        if (effectiveTier === TIERS.FREE || effectiveTier === TIERS.SCORE_UNLOCK || effectiveTier === TIERS.SCORE_CV) {
          isPartial = true;
        }
      }
    } else {
      // Quiz / Mock Test
      const quizAccess = canTakeQuiz(effectiveTier, freeQuizUsed);
      isLocked = !quizAccess.allowed;
    }

    // One status, one badge — isLocked and isPartial used to be checked
    // independently and could both be true at once (Guide/Precis on a free
    // tier), stacking two lock icons on the same corner.
    const status = isPartial ? 'preview' : isLocked ? 'premium' : 'free';
    const STATUS_BADGE = {
      premium: { icon: Lock, background: '#ef4444', label: 'Premium — upgrade to unlock' },
      preview: { icon: Eye, background: '#f59e0b', label: 'Preview available, full access needs an upgrade' },
      free: { icon: Unlock, background: '#16a34a', label: 'Free' },
    }[status];

    return (
      <Card
        key={item.id}
        as={Link}
        to={type === 'resource' ? `/reader/${item.resource_id}` : `/quiz/${item.id}`}
        interactive
        elevated={false}
        padding="none"
        className="course-card"
      >
        {item.thumbnail_url && (
          <div className="course-image-wrapper">
            <div className="course-image" style={{ backgroundImage: `url(${item.thumbnail_url})` }} />
            <span className="status-badge" style={{ background: STATUS_BADGE.background }} title={STATUS_BADGE.label}>
              <STATUS_BADGE.icon size={13} color="white" />
            </span>
          </div>
        )}

        <div className="course-content">
          <div className="course-tags">
            <span className="tag-exam" title={item.exam_name}>{item.exam_name || 'Multi-Exam'}</span>
            <span className="tag-olive">{item.category || (type === 'resource' ? 'Study Material' : 'Mock Test')}</span>
            {!item.thumbnail_url && (
              <span className="status-badge-inline" style={{ background: STATUS_BADGE.background }} title={STATUS_BADGE.label}>
                <STATUS_BADGE.icon size={11} color="white" />
              </span>
            )}
          </div>

          <h3 className="course-title" title={item.title}>
            {cleanContentTitle(item.title, item.exam_name)}
          </h3>

          <div className="course-features">
            {type === 'resource' && item.chapter_count ? (
              <span><Layers size={12} /> {item.chapter_count} {item.chapter_count === 1 ? 'chapter' : 'chapters'}</span>
            ) : null}
            {type === 'quiz' && (
              <>
                <span><CheckCircle size={12} /> Latest Pattern</span>
                <span><PlayCircle size={12} /> Detailed Analysis</span>
              </>
            )}
          </div>
        </div>
      </Card>
    );
  };

  const matchedExamNames = examMatches.map(m => m.exam_name).filter(Boolean);
  const heroSkillsCount = transferableSkills.length;
  const heroReady = !loading || totalResourceCount != null;

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
            <span className="hero-eyebrow">Your Learning Path</span>
            <h1 className="main-title">Prepare for your next career move.</h1>
            <p className="main-subtitle">
              {matchedExamNames.length
                ? "We've selected learning material based on your profile and career matches."
                : "Study guides, precis, previous-year papers and mock tests for every exam you're matched with."}
            </p>

            {heroReady && (matchedExamNames.length > 0 || totalResourceCount != null || heroSkillsCount > 0) && (
              <div className="hero-stat-line">
                {matchedExamNames.length > 0 && <span><strong>{matchedExamNames.length}</strong> exam match{matchedExamNames.length === 1 ? '' : 'es'}</span>}
                {totalResourceCount != null && <span><strong>{totalResourceCount}</strong> resources</span>}
                {heroSkillsCount > 0 && <span><strong>{heroSkillsCount}</strong> transferable skill{heroSkillsCount === 1 ? '' : 's'} identified</span>}
              </div>
            )}

            <div className="search-box">
              <Search size={18} className="search-icon" />
              <input
                type="text"
                placeholder="Search courses, exams, skills..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="filter-chip-row">
              {FILTER_CHIPS.map(chip => (
                (chip.key !== 'my-exams' || matchedExamNames.length > 0) && (
                  <button
                    key={chip.key}
                    type="button"
                    className={`filter-chip ${activeFilterChip === chip.key ? 'active' : ''}`}
                    onClick={() => applyFilterChip(chip.key)}
                  >
                    {chip.label}
                  </button>
                )
              ))}
            </div>
          </div>

          {error ? (
            <div className="empty-library" style={{ color: '#ef4444' }}>
              <Book size={64} />
              <h3 style={{ color: '#0f172a' }}>Unable to Load Resources</h3>
              <p style={{ color: '#64748b', maxWidth: '500px', margin: '0.5rem auto 1.5rem' }}>{error}</p>
              <button
                onClick={() => { setError(null); fetchContent(); }}
                style={{
                  background: '#4b6b32',
                  color: 'white',
                  border: 'none',
                  padding: '0.75rem 2rem',
                  borderRadius: 'var(--radius-sm)',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontSize: '0.9rem',
                }}
              >
                <RefreshCw size={16} /> Try Again
              </button>
            </div>
          ) : loading ? (
            <div className="loading-state">
              <RefreshCw className="animate-spin" size={32} />
              <p>Fetching latest courses...</p>
            </div>
          ) : (
            <div className="course-sections">

              {continueItem && (
                <div className="course-section">
                  <div className="section-header">
                    <h2>Continue Learning</h2>
                  </div>
                  <Link to={`/reader/${continueItem.resource_id}`} className="continue-card">
                    <div className="continue-card-icon"><Book size={22} color="#fff" /></div>
                    <div className="continue-card-body">
                      <span className="tag-exam">{continueItem.exam_name || 'Multi-Exam'}</span>
                      <h3>{cleanContentTitle(continueItem.title, continueItem.exam_name)}</h3>
                      <span className="continue-card-meta">Resume where you left off</span>
                    </div>
                    <ArrowRight size={20} className="continue-card-arrow" />
                  </Link>
                </div>
              )}

              {recommendedItems.length > 0 && (
                <div className="course-section">
                  <div className="section-header">
                    <h2>Recommended For You</h2>
                  </div>
                  <div className="course-grid">
                    {recommendedItems.map(item => renderCard(item, 'resource'))}
                  </div>
                </div>
              )}

              {examMatches.length > 0 && (
                <div className="course-section">
                  <div className="section-header">
                    <h2>Your Exams</h2>
                  </div>
                  <div className="exam-progress-grid">
                    {examMatches.slice(0, 3).map(match => {
                      const prog = examProgress[match.exam_name];
                      return (
                        <div key={match.exam_id || match.exam_name} className="exam-progress-card">
                          <div className="exam-progress-header">
                            <h3>{match.exam_name}</h3>
                            {match.score != null && <span className="exam-match-score">{Math.round(match.score)}% match</span>}
                          </div>
                          {match.conducting_body && <p className="exam-progress-body">{match.conducting_body}</p>}
                          <p className="exam-progress-explored">
                            {prog && prog.total
                              ? `${prog.explored} of ${prog.total} resource${prog.total === 1 ? '' : 's'} explored`
                              : 'Resources available in the full library below'}
                          </p>
                          <button type="button" className="exam-progress-cta" onClick={() => filterToExam(match.exam_name)}>
                            View Resources <ArrowRight size={14} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {transferableSkills.length > 0 && (
                <div className="course-section">
                  <div className="section-header">
                    <h2>Skill Development</h2>
                  </div>
                  <p className="skill-section-subtitle">Strengths identified from your service profile.</p>
                  <ul className="skill-list">
                    {transferableSkills.map((skill, i) => <li key={i}>{skill}</li>)}
                  </ul>
                </div>
              )}

              <div id="full-library" className="course-section">
                <div className="section-header">
                  <h2>Full Library</h2>
                </div>

                {resources.length > 0 && (
                  <div className="course-grid">
                    {resources.map(item => renderCard(item, 'resource'))}
                  </div>
                )}

                {quizzes.length > 0 && (
                  <div className="course-grid" style={{ marginTop: resources.length > 0 ? '1.5rem' : 0 }}>
                    {quizzes.map(item => renderCard(item, 'quiz'))}
                  </div>
                )}

                {/* Load More / End indicator */}
                <div className="load-more-section">
                  {loadingMore ? (
                    <div className="loading-more">
                      <RefreshCw className="animate-spin" size={20} />
                      <span>Loading more resources...</span>
                    </div>
                  ) : hasMore && (resources.length > 0 || quizzes.length > 0) ? (
                    <button className="load-more-btn" onClick={loadNextPage}>
                      Load More Resources
                      <span className="load-more-count">
                        Showing {resources.length + quizzes.length} of {(totalResourceCount || '?') + ' + ' + (totalQuizCount || '?')}
                      </span>
                    </button>
                  ) : !hasMore && (resources.length > 0 || quizzes.length > 0) ? (
                    <div className="end-of-results">
                      <p>You've reached the end — all {(totalResourceCount || resources.length) + (totalQuizCount || quizzes.length)} resources loaded.</p>
                    </div>
                  ) : null}
                </div>

                {resources.length === 0 && quizzes.length === 0 && !loading ? (
                  <div className="empty-library">
                    <Book size={64} />
                    <h3>No courses found</h3>
                    <p>Try adjusting your search or filters.</p>
                  </div>
                ) : null}
              </div>

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
          border-radius: var(--radius-md);
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
          border-radius: var(--radius-sm);
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
        .hero-eyebrow {
          display: inline-block;
          font-size: 0.72rem;
          font-weight: 800;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #4b6b32;
          margin-bottom: 0.5rem;
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
          margin-bottom: 1rem;
        }
        .hero-stat-line {
          display: flex;
          flex-wrap: wrap;
          gap: 0.4rem 1.25rem;
          font-size: 0.85rem;
          color: #475569;
          margin-bottom: 1.5rem;
        }
        .hero-stat-line strong {
          color: #1F3A2E;
          font-weight: 800;
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
          border-radius: var(--radius-sm);
          border: 1px solid #e2e8f0;
          background: #fff;
          font-size: 1rem;
          box-shadow: var(--shadow-1);
          transition: all 0.2s;
        }
        .search-box input:focus {
          border-color: #4b6b32;
          box-shadow: 0 0 0 3px rgba(75, 107, 50, 0.1);
          outline: none;
        }

        .filter-chip-row {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
          margin-top: 1rem;
        }
        .filter-chip {
          background: #fff;
          border: 1px solid #e2e8f0;
          color: #475569;
          font-size: 0.82rem;
          font-weight: 600;
          padding: 0.45rem 0.9rem;
          border-radius: var(--radius-pill);
          cursor: pointer;
          transition: all 0.15s;
        }
        .filter-chip:hover {
          border-color: #4b6b32;
          color: #1F3A2E;
        }
        .filter-chip.active {
          background: #4b6b32;
          border-color: #4b6b32;
          color: #fff;
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

        /* Continue Learning */
        .continue-card {
          display: flex;
          align-items: center;
          gap: 1rem;
          background: linear-gradient(135deg, #4b6b32 0%, #2d411e 100%);
          border-radius: var(--radius-md);
          padding: 1.25rem 1.5rem;
          text-decoration: none;
          box-shadow: var(--shadow-1);
          transition: transform 0.15s, box-shadow 0.2s;
        }
        .continue-card:hover {
          transform: translateY(-2px);
          box-shadow: var(--shadow-2);
        }
        .continue-card-icon {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background: rgba(255,255,255,0.15);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .continue-card-body {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
        }
        .continue-card-body h3 {
          color: #fff;
          font-size: 1.05rem;
          font-weight: 700;
          margin: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .continue-card-meta {
          color: rgba(255,255,255,0.75);
          font-size: 0.8rem;
          font-weight: 600;
        }
        .continue-card .tag-exam {
          background: rgba(255,255,255,0.18);
          color: #fff;
          align-self: flex-start;
        }
        .continue-card-arrow {
          color: #fff;
          flex-shrink: 0;
        }

        /* Your Exams */
        .exam-progress-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
          gap: 1.25rem;
        }
        .exam-progress-card {
          background: #fff;
          border: 1px solid #e2e8f0;
          border-radius: var(--radius-md);
          padding: 1.25rem;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        .exam-progress-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 0.5rem;
        }
        .exam-progress-header h3 {
          font-size: 0.95rem;
          font-weight: 700;
          color: #0f172a;
          line-height: 1.35;
        }
        .exam-match-score {
          flex-shrink: 0;
          background: rgba(75, 107, 50, 0.14);
          color: #2d411e;
          font-size: 0.72rem;
          font-weight: 800;
          padding: 0.2rem 0.55rem;
          border-radius: var(--radius-pill);
          white-space: nowrap;
        }
        .exam-progress-body {
          color: #64748b;
          font-size: 0.82rem;
        }
        .exam-progress-explored {
          color: #475569;
          font-size: 0.82rem;
          font-weight: 600;
        }
        .exam-progress-cta {
          margin-top: 0.5rem;
          align-self: flex-start;
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          background: none;
          border: none;
          color: #4b6b32;
          font-size: 0.85rem;
          font-weight: 700;
          cursor: pointer;
          padding: 0;
        }
        .exam-progress-cta:hover {
          color: #2d411e;
          text-decoration: underline;
        }

        /* Skill Development */
        .skill-section-subtitle {
          color: #64748b;
          font-size: 0.85rem;
          margin-bottom: 1rem;
        }
        .skill-list {
          list-style: none;
          margin: 0;
          padding: 0;
          display: flex;
          flex-direction: column;
          gap: 0.6rem;
        }
        .skill-list li {
          background: #fff;
          border: 1px solid #e2e8f0;
          border-radius: var(--radius-sm);
          padding: 0.75rem 1rem;
          font-size: 0.88rem;
          color: #334155;
          position: relative;
          padding-left: 2.25rem;
        }
        .skill-list li::before {
          content: '';
          position: absolute;
          left: 1rem;
          top: 50%;
          transform: translateY(-50%);
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #4b6b32;
        }

        .course-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1rem;
        }
        @media (min-width: 600px) {
          .course-grid {
            grid-template-columns: repeat(3, 1fr);
            gap: 1.5rem;
          }
        }
        @media (min-width: 1024px) {
          .course-grid {
            grid-template-columns: repeat(4, 1fr);
          }
        }

        /* Flat Course Card */
        /* background/border/radius/shadow/hover now come from the shared <Card> primitive */
        .course-card {
          overflow: hidden;
          display: flex;
          flex-direction: column;
          text-decoration: none;
          color: inherit;
        }

        .course-image-wrapper {
          position: relative;
          aspect-ratio: 16 / 9;
          background: #f8fafc;
          overflow: hidden;
        }
        .course-image {
          width: 100%;
          height: 100%;
          background-size: cover;
          background-repeat: no-repeat;
          background-position: center;
          background-color: #f8fafc;
        }

        .status-badge {
          position: absolute;
          top: 0.5rem;
          right: 0.5rem;
          width: 26px;
          height: 26px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          box-shadow: var(--shadow-1);
        }
        .status-badge-inline {
          width: 18px;
          height: 18px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          margin-left: auto;
        }

        .course-content {
          padding: 1.25rem 1.25rem 1.25rem;
          display: flex;
          flex-direction: column;
          flex: 1;
        }
        .course-tags {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 0.4rem;
          margin-bottom: 0.75rem;
        }
        .tag-exam {
          background: rgba(75, 107, 50, 0.14);
          color: #2d411e;
          font-size: 0.66rem;
          font-weight: 800;
          padding: 0.22rem 0.5rem;
          border-radius: var(--radius-pill);
          white-space: normal;
          line-height: 1.3;
        }
        .tag-olive {
          background: #eef2eb;
          color: #4b6b32;
          font-size: 0.65rem;
          font-weight: 600;
          padding: 0.2rem 0.4rem;
          border-radius: var(--radius-pill);
        }

        .course-title {
          font-size: 0.95rem;
          font-weight: 700;
          color: #0f172a;
          line-height: 1.4;
          margin-bottom: 0.75rem;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .course-features {
          display: flex;
          gap: 1rem;
          margin-top: auto;
        }
        .course-features span {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          font-size: 0.75rem;
          color: #64748b;
        }

        .loading-state, .empty-library {
          text-align: center;
          padding: 6rem 0;
          color: #94a3b8;
        }
        .loading-state p { margin-top: 1rem; font-weight: 600; }
        .empty-library h3 { color: #1e293b; margin: 1.5rem 0 0.5rem; }

        /* Load More */
        .load-more-section {
          padding: 2rem 0 1rem;
          text-align: center;
        }
        .load-more-btn {
          display: inline-flex;
          flex-direction: column;
          align-items: center;
          gap: 0.35rem;
          background: #4b6b32;
          color: #fff;
          border: none;
          padding: 0.9rem 2.5rem;
          border-radius: var(--radius-sm);
          font-size: 1rem;
          font-weight: 700;
          cursor: pointer;
          transition: background 0.2s, transform 0.15s, box-shadow 0.2s;
          box-shadow: var(--shadow-1);
        }
        .load-more-btn:hover {
          background: #3d5828;
          transform: translateY(-2px);
          box-shadow: var(--shadow-2);
        }
        .load-more-btn:active {
          transform: translateY(0);
          box-shadow: var(--shadow-1);
        }
        .load-more-count {
          font-size: 0.7rem;
          font-weight: 500;
          opacity: 0.8;
        }
        .loading-more {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.75rem;
          color: #64748b;
          font-size: 0.9rem;
          font-weight: 600;
          padding: 1.5rem 0;
        }
        .loading-more svg {
          color: #4b6b32;
        }
        .end-of-results {
          text-align: center;
          padding: 1.5rem 0;
          color: #94a3b8;
          font-size: 0.85rem;
          border-top: 1px dashed #e2e8f0;
          margin-top: 1rem;
        }
        .end-of-results p {
          margin: 0;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin {
          animation: spin 1s linear infinite;
        }
      `}} />
    </div>
  );
};

export default LearningCenter;
