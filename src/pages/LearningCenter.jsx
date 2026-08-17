import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Book, Lock, Eye, Unlock, PlayCircle, RefreshCw, Search, CheckCircle, ArrowRight, Layers } from 'lucide-react';
import { getEffectiveTier, isResourceLockedForUser, canTakeQuiz, TIERS } from '../lib/subscriptionAccess';
import { cleanContentTitle } from '../lib/contentTitle';
import { getTransferableSkills } from '../lib/profilingInsights';
import Card from '../components/ui/Card';
import { useLearningContent } from '../hooks/useLearningContent';
import './LearningCenter.css';

const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", 
  "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", 
  "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", 
  "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", 
  "Uttar Pradesh", "Uttarakhand", "West Bengal"
];

const INDIAN_UTS = [
  "Andaman and Nicobar Islands", "Chandigarh", "Dadra and Nagar Haveli", "Daman and Diu", 
  "Delhi", "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry"
];

const FILTER_CHIPS = [
  { key: 'all', label: 'All' },
  { key: 'my-exams', label: 'My Exams' },
  { key: 'mock-tests', label: 'Mock Tests' },
  { key: 'study-guides', label: 'Study Guides' },
];

const LearningCenter = () => {
  const [exams, setExams] = useState([]);
  const [effectiveTier, setEffectiveTier] = useState(TIERS.FREE);
  const [freeQuizUsed, setFreeQuizUsed] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  // Personalization signals
  const [examMatches, setExamMatches] = useState([]);
  const [transferableSkills, setTransferableSkills] = useState([]);
  const [continueItem, setContinueItem] = useState(null);
  const [recommendedItems, setRecommendedItems] = useState([]);
  const [examProgress, setExamProgress] = useState({});
  const [activeFilterChip, setActiveFilterChip] = useState('all');

  const [regionMode, setRegionMode] = useState('central'); // 'central' or 'state'
  const [selectedStateMap, setSelectedStateMap] = useState('');

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

  // Custom hook for data fetching
  const {
    resources,
    quizzes,
    loading: contentLoading,
    error,
    setError,
    loadingMore,
    hasMore,
    totalResourceCount,
    totalQuizCount,
    fetchContent,
    loadNextPage
  } = useLearningContent({
    regionMode,
    selectedStateMap,
    selectedCategories,
    searchQuery
  });

  const toggleFilterSelection = (item, currentSelection, setSelection) => {
    setActiveFilterChip('all');
    setSelection(prev => {
      if (item === 'all') return ['all'];
      let newSelection = prev.filter(x => x !== 'all');
      if (newSelection.includes(item)) {
        newSelection = newSelection.filter(x => x !== item);
      } else {
        newSelection.push(item);
      }
      return newSelection.length === 0 ? ['all'] : newSelection;
    });
  };

  const handleCategoryCheckboxChange = (category) => toggleFilterSelection(category, selectedCategories, setSelectedCategories);
  const handleExamCheckboxChange = (examName) => toggleFilterSelection(examName, selectedExams, setSelectedExams);

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
          return;
        }

        if (examData) {
          const uniqueExams = [...new Set(examData.map(e => e.exam_name).filter(Boolean))].sort();
          setExams(uniqueExams);
        }
      } catch (err) {
        console.error('Error in initial load:', err);
        setError('Unable to connect to the learning database. Please check your connection and try again.');
      } finally {
        setInitialLoading(false);
      }
    };
    fetchInitialData();
  }, [setError]);

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
      const quizAccess = canTakeQuiz(effectiveTier, freeQuizUsed);
      isLocked = !quizAccess.allowed;
    }

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
  
  // Overall loading state combines initial fetch and content hook loading
  const isLoading = initialLoading || contentLoading;
  const heroReady = !isLoading || totalResourceCount != null;

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

            <div className="region-toggle">
              <button 
                onClick={() => setRegionMode('central')}
                className={`region-toggle-btn ${regionMode === 'central' ? 'active' : ''}`}
              >
                Central Exams
              </button>
              <button 
                onClick={() => { setRegionMode('state'); setSelectedStateMap(''); }}
                className={`region-toggle-btn ${regionMode === 'state' ? 'active' : ''}`}
              >
                State Exams
              </button>
              <button 
                onClick={() => { setRegionMode('ut'); setSelectedStateMap(''); }}
                className={`region-toggle-btn ${regionMode === 'ut' ? 'active' : ''}`}
              >
                UT Exams
              </button>
            </div>

            {(regionMode === 'state' || regionMode === 'ut') && (
              <div className="state-grid-section">
                <h3 className="state-grid-title">
                  Select {regionMode === 'state' ? 'State' : 'Union Territory'}
                </h3>
                <div className="state-grid">
                  {(regionMode === 'state' ? INDIAN_STATES : INDIAN_UTS).map(loc => {
                    const isSelected = selectedStateMap === loc;
                    return (
                      <button
                        key={loc}
                        onClick={() => {
                          setSelectedStateMap(loc);
                          document.getElementById('full-library')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }}
                        className={`state-grid-btn ${isSelected ? 'active' : ''}`}
                      >
                        {loc}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

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
            <div className="empty-library">
              <Book size={64} style={{ color: '#ef4444' }} />
              <h3 style={{ color: '#0f172a' }}>Unable to Load Resources</h3>
              <p style={{ color: '#64748b', maxWidth: '500px', margin: '0.5rem auto 1.5rem' }}>{error}</p>
              <button
                className="retry-btn"
                onClick={() => { setError(null); fetchContent(); }}
              >
                <RefreshCw size={16} /> Try Again
              </button>
            </div>
          ) : isLoading ? (
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

                {resources.length === 0 && quizzes.length === 0 && !isLoading ? (
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
    </div>
  );
};

export default LearningCenter;
