import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BookOpen,
  ScrollText,
  FileText,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  ChevronRight,
  Shield,
  ShieldCheck,
  Layers,
  Award,
  Users,
  Compass,
  Briefcase,
  Monitor,
  Calendar,
  GraduationCap,
  BarChart3,
  Trophy,
  Target,
  Search,
  X,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import './CategoryExplorerPortal.css';

/**
 * CategoryExplorerPortal
 *
 * Implements the rich category landing view matching the design reference.
 * Fetches category details directly from Supabase (lc_category_profiles table).
 */
export default function CategoryExplorerPortal({
  categoryName,
  division = 'central',
  levelExams = [],
  allCatalog = [],
  onSelectExam,
  onExploreContent,
}) {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAllExams, setShowAllExams] = useState(false);
  const [examSearch, setExamSearch] = useState('');
  const [localDbExams, setLocalDbExams] = useState([]);

  // Reset state when switching category or division
  useEffect(() => {
    setShowAllExams(false);
    setExamSearch('');
  }, [categoryName, division]);

  // Fallback load exams from Supabase if parent hasn't loaded catalog
  useEffect(() => {
    if ((levelExams && levelExams.length > 0) || (allCatalog && allCatalog.length > 0)) {
      return;
    }
    let isMounted = true;
    async function fetchFallbackExams() {
      try {
        const { data, error } = await supabase
          .from('lc_exams')
          .select('id, name, category, conducting_body:lc_conducting_bodies(id, name), region:lc_regions(id, name, level)')
          .limit(1000);
        if (!error && data && isMounted) {
          setLocalDbExams(data);
        }
      } catch (e) {
        console.warn('Failed to load fallback exams:', e);
      }
    }
    fetchFallbackExams();
    return () => {
      isMounted = false;
    };
  }, [levelExams, allCatalog]);

  useEffect(() => {
    let isMounted = true;
    async function fetchProfile() {
      if (!categoryName) return;
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('lc_category_profiles')
          .select('*')
          .eq('category_name', categoryName)
          .eq('division', division)
          .maybeSingle();

        if (error) {
          console.warn('Error fetching category profile:', error);
        }

        if (isMounted) {
          if (data) {
            setProfile(data);
          } else {
            // Fallback: query without division constraint or create default
            const { data: anyDiv } = await supabase
              .from('lc_category_profiles')
              .select('*')
              .eq('category_name', categoryName)
              .maybeSingle();

            if (isMounted && anyDiv) {
              setProfile(anyDiv);
            } else {
              setProfile({
                category_name: categoryName,
                division,
                full_name: categoryName,
                tagline: `Your Gateway to a Stable and Rewarding Government Career in ${categoryName}`,
                badges: [
                  'Multiple Job Opportunities',
                  'All India Recruitment',
                  'Graduate & 10+2 Level Exams',
                  'Stable Career & Growth',
                ],
                about_text: `The ${categoryName} recruitment portal provides comprehensive study materials, official notifications, previous year question papers, and full-length timed mock tests for competitive examination aspirants with Veer Next.`,
                exam_mode: 'Online (CBT)',
                post_level: 'Group B & C',
                eligibility: '10+2 / Graduate',
                major_exams: categoryName,
                top_exams: [],
                related_exams: [],
                why_choose: [],
              });
            }
          }
          setLoading(false);
        }
      } catch (err) {
        console.error('Failed to load category profile:', err);
        if (isMounted) setLoading(false);
      }
    }

    fetchProfile();
    return () => {
      isMounted = false;
    };
  }, [categoryName, division]);

  // Compute all exams belonging to this category (Unconditional hook at top level)
  const allCategoryExams = useMemo(() => {
    const pool =
      levelExams && levelExams.length > 0
        ? levelExams
        : allCatalog && allCatalog.length > 0
          ? allCatalog
          : localDbExams;

    const cLow = (categoryName || profile?.category_name || '').toLowerCase().trim();
    if (!cLow) return [];

    const matched = pool.filter((e) => {
      const ec = (e.category || '').toLowerCase().trim();
      const en = (e.name || '').toLowerCase().trim();
      const cb = (e.conducting_body?.name || '').toLowerCase().trim();
      if (ec === cLow) return true;
      if (ec.includes(cLow) || cLow.includes(ec)) return true;
      if (cLow === 'banking' && (ec.includes('bank') || en.includes('bank') || cb.includes('ibps') || cb.includes('sbi') || cb.includes('rbi'))) return true;
      if (cLow === 'ssc' && (ec.includes('ssc') || en.includes('ssc') || cb.includes('ssc'))) return true;
      if ((cLow === 'civil services' || cLow === 'upsc') && (ec.includes('civil') || ec.includes('upsc') || en.includes('upsc') || en.includes('ias') || cb.includes('upsc'))) return true;
      if (cLow === 'defence' && (ec.includes('defence') || ec.includes('defense') || en.includes('nda') || en.includes('cds') || en.includes('afcat') || en.includes('navy') || en.includes('army'))) return true;
      if (cLow === 'railways' && (ec.includes('rail') || en.includes('rrb') || en.includes('railway') || cb.includes('railway') || cb.includes('rrb'))) return true;
      if (cLow === 'police' && (ec.includes('police') || en.includes('police') || en.includes('constable') || en.includes('si '))) return true;
      if (cLow === 'teaching' && (ec.includes('teach') || ec.includes('education') || en.includes('tet') || en.includes('pgt') || en.includes('tgt') || en.includes('ctet'))) return true;
      if (cLow === 'judiciary' && (ec.includes('judic') || ec.includes('court') || en.includes('judge') || en.includes('law'))) return true;
      return false;
    });

    const seenIds = new Set();
    const result = [];

    matched.forEach((m) => {
      const idKey = m.id || m.name;
      if (!seenIds.has(idKey)) {
        seenIds.add(idKey);
        result.push(m);
      }
    });

    // Also include profile top_exams & related_exams if not already in result
    const profileExtras = [...(profile?.top_exams || []), ...(profile?.related_exams || [])];
    profileExtras.forEach((extra) => {
      const eId = extra.examId;
      const titleKey = extra.title;
      if (eId && !seenIds.has(eId) && !seenIds.has(titleKey)) {
        seenIds.add(eId);
        result.push({
          id: eId,
          name: extra.title,
          category: profile?.category_name || categoryName,
          subtitle: extra.subtitle || extra.badge,
          conducting_body: { name: extra.subtitle || profile?.category_name || categoryName },
        });
      }
    });

    return result;
  }, [categoryName, profile, levelExams, allCatalog, localDbExams]);

  // Filter by user's search within the full-width view (Unconditional hook at top level)
  const filteredAllExams = useMemo(() => {
    if (!examSearch.trim()) return allCategoryExams;
    const q = examSearch.toLowerCase().trim();
    return allCategoryExams.filter(
      (e) =>
        (e.name || '').toLowerCase().includes(q) ||
        (e.category || '').toLowerCase().includes(q) ||
        (e.conducting_body?.name || '').toLowerCase().includes(q) ||
        (e.subtitle || '').toLowerCase().includes(q)
    );
  }, [allCategoryExams, examSearch]);

  if (loading) {
    return (
      <div className="cep-loading-box">
        <div className="cep-spinner" />
        <p>Loading {categoryName} preparation portal...</p>
      </div>
    );
  }

  if (!profile) return null;

  const badges = Array.isArray(profile.badges) && profile.badges.length > 0
    ? profile.badges
    : [
        'Multiple Job Opportunities',
        'All India Recruitment',
        'Graduate & 10+2 Level Exams',
        'Stable Career & Growth',
      ];

  const topExams = Array.isArray(profile.top_exams) && profile.top_exams.length > 0
    ? profile.top_exams
    : [
        { title: `${profile.category_name} CGL`, subtitle: 'Combined Graduate Level', examId: '' },
        { title: `${profile.category_name} CHSL`, subtitle: 'Combined Higher Secondary Level', examId: '' },
        { title: `${profile.category_name} MTS`, subtitle: 'Multi Tasking Staff', examId: '' },
        { title: `${profile.category_name} CPO`, subtitle: 'Central Police Organization', examId: '' },
        { title: `${profile.category_name} GD Constable`, subtitle: 'General Duty', examId: '' },
        { title: `${profile.category_name} JE`, subtitle: 'Junior Engineer', examId: '' },
      ];

  const relatedExams = Array.isArray(profile.related_exams) && profile.related_exams.length > 0
    ? profile.related_exams
    : [
        { title: `${profile.category_name} CGL`, badge: 'Graduate Level', examId: '' },
        { title: `${profile.category_name} CHSL`, badge: '12th Pass', examId: '' },
        { title: `${profile.category_name} MTS`, badge: '10th Pass', examId: '' },
        { title: `${profile.category_name} CPO`, badge: 'Graduate Level', examId: '' },
        { title: `${profile.category_name} GD Constable`, badge: '10th Pass', examId: '' },
        { title: `${profile.category_name} JE`, badge: 'Diploma/Graduate', examId: '' },
      ];

  const whyChooseList = [
    {
      title: 'Expert-Curated Study Material',
      desc: 'Updated as per latest syllabus',
      icon: Compass,
      color: 'green',
    },
    {
      title: 'Preci for Quick Revision',
      desc: 'Short and precise notes',
      icon: FileText,
      color: 'blue',
    },
    {
      title: 'Practice & Evaluation',
      desc: 'Topic-wise and full-length mock tests',
      icon: Target,
      color: 'indigo',
    },
    {
      title: 'Mentorship & Support',
      desc: 'Learn from experts and get guidance at every step',
      icon: Users,
      color: 'purple',
    },
  ];

  const handleActionClick = (contentType) => {
    if (onExploreContent) {
      onExploreContent(contentType, profile);
    } else {
      if (contentType === 'pyqs') {
        navigate('/pyq-center');
      } else if (contentType === 'mocks') {
        navigate('/quiz-center');
      } else {
        const firstExamId = topExams[0]?.examId;
        if (firstExamId) {
          navigate(`/exam/${firstExamId}`);
        } else {
          navigate('/learning-center');
        }
      }
    }
  };

  const handleExamClick = (exam) => {
    const targetId = exam.id || exam.examId;
    if (onSelectExam) {
      onSelectExam({ ...exam, id: targetId, examId: targetId, title: exam.name || exam.title });
    } else if (targetId) {
      navigate(`/exam/${targetId}`, { state: { from: '/learning-center' } });
    }
  };

  // Clean major exams display string if needed
  const displayMajorExams =
    profile.category_name === 'SSC' && (!profile.major_exams || profile.major_exams.includes('SSC, SSC'))
      ? 'CGL, CHSL, MTS, CPO, GD, JE, etc.'
      : profile.major_exams || profile.category_name;

  // Clean tagline to match reference design
  const displayTagline = profile.tagline
    ? profile.tagline.replace(/\s+in\s+([A-Za-z\s&]+)$/i, '').trim() || profile.tagline
    : 'Your Gateway to a Stable and Rewarding Government Career';

  return (
    <div className="cep-container" aria-label={`${profile.category_name} Exam Preparation Portal`}>
      {/* ── Breadcrumb Bar ── */}
      <nav className="cep-breadcrumbs" aria-label="Breadcrumb">
        <span className="cep-bc-link">Home</span>
        <ChevronRight size={13} className="cep-bc-sep" />
        <span className="cep-bc-link">Exams</span>
        <ChevronRight size={13} className="cep-bc-sep" />
        <span className="cep-bc-current">{profile.category_name}</span>
      </nav>

      {/* ── Hero Banner Section (Clean White Card + Building Photo Seamless Blend) ── */}
      <section className="cep-hero-card">
        <div className="cep-hero-content">
          <div className="cep-hero-title-row">
            <h1 className="cep-hero-abbr">{profile.category_name}</h1>
          </div>
          <h2 className="cep-hero-fullname">{profile.full_name}</h2>
          <p className="cep-hero-tagline">{displayTagline}</p>

          <div className="cep-hero-badges-row">
            {badges.map((badge, idx) => (
              <span key={idx} className="cep-hero-badge-pill">
                {idx === 0 && <Users size={15} className="cep-badge-icon badge-orange" />}
                {idx === 1 && <BarChart3 size={15} className="cep-badge-icon badge-yellow" />}
                {idx === 2 && <ShieldCheck size={15} className="cep-badge-icon badge-amber" />}
                {idx === 3 && <Trophy size={15} className="cep-badge-icon badge-gold" />}
                <span>{badge}</span>
              </span>
            ))}
          </div>
        </div>

        {/* Hero Banner Visual with smooth gradient blend */}
        <div className="cep-hero-visual-wrap">
          {profile.hero_image_url ? (
            <div className="cep-hero-image-box">
              <img
                src={profile.hero_image_url}
                alt={`${profile.category_name} Headquarters`}
                className="cep-hero-img"
                loading="eager"
              />
              <div className="cep-hero-gradient-overlay" />
              <div className="cep-hero-script-overlay">
                <span className="cep-script-line">Prepare</span>
                <span className="cep-script-line">Practice</span>
                <span className="cep-script-line">Progress</span>
                <span className="cep-script-brand">with Veer Next</span>
              </div>
            </div>
          ) : (
            <div className="cep-hero-placeholder-box">
              <div className="cep-hero-ph-emblem">
                <Shield size={64} className="cep-ph-shield" />
              </div>
              <div className="cep-hero-script-overlay">
                <span className="cep-script-line">Prepare</span>
                <span className="cep-script-line">Practice</span>
                <span className="cep-script-line">Progress</span>
                <span className="cep-script-brand">with Veer Next</span>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ── 5 Quick Action Cards Row (Visual Showcase matching Reference Image) ── */}
      <section className="cep-actions-grid" aria-label="Exam Preparation Modules">
        {/* 1. Introduction */}
        <div className="cep-action-card cep-card-peach">
          <div className="cep-action-icon-wrap icon-peach">
            <BookOpen size={26} strokeWidth={2.2} />
          </div>
          <h3 className="cep-action-title">Introduction</h3>
          <p className="cep-action-desc">
            Exam overview, posts, eligibility, pattern and important dates
          </p>
          <div className="cep-action-arrow-circle btn-peach" aria-hidden="true">
            <ArrowRight size={15} strokeWidth={2.5} />
          </div>
        </div>

        {/* 2. Guidebooks */}
        <div className="cep-action-card cep-card-mint">
          <div className="cep-action-icon-wrap icon-mint">
            <Layers size={26} strokeWidth={2.2} />
          </div>
          <h3 className="cep-action-title">Guidebooks</h3>
          <p className="cep-action-desc">
            Complete study material as per latest syllabus
          </p>
          <div className="cep-action-arrow-circle btn-mint" aria-hidden="true">
            <ArrowRight size={15} strokeWidth={2.5} />
          </div>
        </div>

        {/* 3. Préci */}
        <div className="cep-action-card cep-card-rose">
          <div className="cep-action-icon-wrap icon-rose">
            <Target size={26} strokeWidth={2.2} />
          </div>
          <h3 className="cep-action-title">Preci</h3>
          <p className="cep-action-desc">
            Topic-wise concise notes for quick revision
          </p>
          <div className="cep-action-arrow-circle btn-rose" aria-hidden="true">
            <ArrowRight size={15} strokeWidth={2.5} />
          </div>
        </div>

        {/* 4. PYQs */}
        <div className="cep-action-card cep-card-sky">
          <div className="cep-action-icon-wrap icon-sky">
            <FileText size={26} strokeWidth={2.2} />
          </div>
          <h3 className="cep-action-title">Previous Year Papers (PYQs)</h3>
          <p className="cep-action-desc">
            Year-wise papers with detailed solutions
          </p>
          <div className="cep-action-arrow-circle btn-sky" aria-hidden="true">
            <ArrowRight size={15} strokeWidth={2.5} />
          </div>
        </div>

        {/* 5. Mock Tests & Quizzes */}
        <div className="cep-action-card cep-card-lavender">
          <div className="cep-action-icon-wrap icon-lavender">
            <CheckCircle2 size={26} strokeWidth={2.2} />
          </div>
          <h3 className="cep-action-title">Mock Tests & Quizzes</h3>
          <p className="cep-action-desc">
            Topic-wise, section-wise and full-length tests
          </p>
          <div className="cep-action-arrow-circle btn-lavender" aria-hidden="true">
            <ArrowRight size={15} strokeWidth={2.5} />
          </div>
        </div>
      </section>

      {/* ── Conditional: Full Width All Exams View OR 3-Column Overview ── */}
      {showAllExams ? (
        <section className="cep-all-exams-card" aria-label={`All ${profile.category_name} Examinations`}>
          <div className="cep-all-exams-header">
            <div className="cep-all-exams-header-left">
              <button
                type="button"
                className="cep-back-to-overview-btn"
                onClick={() => setShowAllExams(false)}
              >
                <ArrowLeft size={14} />
                <span>Back to Overview</span>
              </button>
              <div className="cep-all-exams-title-row">
                <span className="cep-header-bar green-bar" />
                <h3 className="cep-col-title">All {profile.category_name} Examinations</h3>
                <span className="cep-all-exams-count-badge">
                  {allCategoryExams.length} {allCategoryExams.length === 1 ? 'Exam' : 'Exams'}
                </span>
              </div>
            </div>

            <div className="cep-all-exams-header-right">
              <div className="cep-all-exams-search-box">
                <Search size={15} className="cep-search-icon" />
                <input
                  type="text"
                  placeholder={`Search ${profile.category_name} exams...`}
                  value={examSearch}
                  onChange={(e) => setExamSearch(e.target.value)}
                  className="cep-search-input"
                />
                {examSearch && (
                  <button
                    type="button"
                    className="cep-search-clear-btn"
                    onClick={() => setExamSearch('')}
                    aria-label="Clear search"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="cep-all-exams-list">
            {filteredAllExams.length > 0 ? (
              filteredAllExams.map((exam, idx) => {
                const conductingName = exam.conducting_body?.name;
                const regionName = exam.region?.name;
                const subtitle = exam.subtitle || exam.category;

                return (
                  <div
                    key={exam.id || exam.examId || idx}
                    className="cep-full-exam-row"
                    onClick={() => handleExamClick(exam)}
                    role="button"
                    tabIndex={0}
                  >
                    <div className="cep-full-exam-icon-wrap">
                      <GraduationCap size={20} className="cep-full-exam-icon" />
                    </div>

                    <div className="cep-full-exam-info">
                      <div className="cep-full-exam-title-row">
                        <h4 className="cep-full-exam-title">{exam.name || exam.title}</h4>
                        {subtitle && subtitle !== (exam.name || exam.title) && (
                          <span className="cep-full-exam-subtitle-tag">{subtitle}</span>
                        )}
                      </div>

                      <div className="cep-full-exam-tags-row">
                        {conductingName && (
                          <span className="cep-full-exam-tag conducting-tag">
                            <Briefcase size={12} />
                            {conductingName}
                          </span>
                        )}
                        <span className="cep-full-exam-tag category-tag">
                          {exam.category || profile.category_name}
                        </span>
                        {regionName && (
                          <span className="cep-full-exam-tag region-tag">
                            {regionName}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="cep-full-exam-action">
                      <button
                        type="button"
                        className="cep-continue-prep-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleExamClick(exam);
                        }}
                      >
                        <span>Continue Prep</span>
                        <ArrowRight size={14} />
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="cep-all-exams-empty">
                <Search size={32} className="cep-empty-icon" />
                <p className="cep-empty-title">No exams found</p>
                <p className="cep-empty-desc">
                  No examinations matched &ldquo;{examSearch}&rdquo; in {profile.category_name}.
                </p>
                <button
                  type="button"
                  className="cep-reset-search-btn"
                  onClick={() => setExamSearch('')}
                >
                  Clear search filter
                </button>
              </div>
            )}
          </div>
        </section>
      ) : (
        /* ── 3-Column Content Details Section (Single White Rounded Card Container) ── */
        <section className="cep-details-card">
          {/* Column 1: About Category */}
          <div className="cep-about-col">
            <div className="cep-col-header">
              <span className="cep-header-bar green-bar" />
              <h3 className="cep-col-title">About {profile.category_name}</h3>
            </div>
            <p className="cep-about-paragraph">{profile.about_text}</p>

            {/* Meta Grid with Icons, including Total Exam count */}
            <div className="cep-meta-grid">
              <div className="cep-meta-box cep-meta-box-highlight">
                <div className="cep-meta-icon-box cep-meta-icon-green">
                  <Award size={17} className="cep-meta-icon" />
                </div>
                <div className="cep-meta-info">
                  <span className="cep-meta-label">Total Exams</span>
                  <span className="cep-meta-value highlight-value">
                    {allCategoryExams.length} {allCategoryExams.length === 1 ? 'Exam' : 'Exams'}
                  </span>
                </div>
              </div>

              <div className="cep-meta-box">
                <div className="cep-meta-icon-box">
                  <Monitor size={17} className="cep-meta-icon" />
                </div>
                <div className="cep-meta-info">
                  <span className="cep-meta-label">Exam Mode</span>
                  <span className="cep-meta-value">{profile.exam_mode || 'Online (CBT)'}</span>
                </div>
              </div>

              <div className="cep-meta-box">
                <div className="cep-meta-icon-box">
                  <Users size={17} className="cep-meta-icon" />
                </div>
                <div className="cep-meta-info">
                  <span className="cep-meta-label">Post Level</span>
                  <span className="cep-meta-value">{profile.post_level || 'Group B & C'}</span>
                </div>
              </div>

              <div className="cep-meta-box">
                <div className="cep-meta-icon-box">
                  <GraduationCap size={17} className="cep-meta-icon" />
                </div>
                <div className="cep-meta-info">
                  <span className="cep-meta-label">Eligibility</span>
                  <span className="cep-meta-value">{profile.eligibility || '10+2 / Graduate'}</span>
                </div>
              </div>

              <div className="cep-meta-box span-2">
                <div className="cep-meta-icon-box">
                  <Calendar size={17} className="cep-meta-icon" />
                </div>
                <div className="cep-meta-info">
                  <span className="cep-meta-label">Major Exams</span>
                  <span className="cep-meta-value" title={displayMajorExams}>
                    {displayMajorExams}
                  </span>
                </div>
              </div>
            </div>

            <button
              type="button"
              className="cep-detailed-info-btn cep-see-all-exams-btn"
              onClick={() => setShowAllExams(true)}
            >
              <span>See All Exams ({allCategoryExams.length})</span>
              <ArrowRight size={15} />
            </button>
          </div>

          {/* Column 2: Top Exams */}
          <div className="cep-top-exams-col">
            <div className="cep-col-header">
              <span className="cep-header-bar green-bar" />
              <h3 className="cep-col-title">Top {profile.category_name} Exams</h3>
            </div>

            <div className="cep-exams-list">
              {topExams.map((exam, idx) => (
                <div
                  key={idx}
                  className="cep-exam-item-row"
                  onClick={() => handleExamClick(exam)}
                  role="button"
                  tabIndex={0}
                >
                  <div className="cep-check-icon-wrap">
                    <CheckCircle2 size={17} className="cep-check-icon" />
                  </div>
                  <div className="cep-exam-text-box">
                    <h4 className="cep-exam-row-title">{exam.title}</h4>
                    {exam.subtitle && (
                      <span className="cep-exam-row-subtitle">
                        ({exam.subtitle})
                      </span>
                    )}
                  </div>
                  <ChevronRight size={15} className="cep-row-chevron" />
                </div>
              ))}
            </div>
          </div>

          {/* Column 3: Related Exams */}
          <div className="cep-related-exams-col">
            <div className="cep-col-header">
              <span className="cep-header-bar green-bar" />
              <h3 className="cep-col-title">Related Exams</h3>
            </div>

            <div className="cep-exams-list">
              {relatedExams.map((rel, idx) => (
                <div
                  key={idx}
                  className="cep-exam-item-row"
                  onClick={() => handleExamClick(rel)}
                  role="button"
                  tabIndex={0}
                >
                  <div className="cep-seal-icon-wrap">
                    <div className="cep-gold-seal">
                      <Shield size={14} />
                    </div>
                  </div>
                  <div className="cep-exam-text-box">
                    <h4 className="cep-exam-row-title">{rel.title}</h4>
                    <span className="cep-exam-level-sub">
                      {rel.badge || 'Graduate Level'}
                    </span>
                  </div>
                  <ChevronRight size={15} className="cep-row-chevron" />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Bottom Section: Why Choose Veer Next (Clean Rounded White Card + 4 Pillars) ── */}
      <section className="cep-why-choose-card">
        <div className="cep-why-header">
          <div className="cep-col-header">
            <span className="cep-header-bar green-bar" />
            <h3 className="cep-col-title">Why Choose Veer Next for {profile.category_name}?</h3>
          </div>
          <p className="cep-why-subtitle">Everything you need for your preparation — at one place.</p>
        </div>

        <div className="cep-why-pillars-grid">
          {whyChooseList.map((item, idx) => {
            const IconComponent = item.icon;
            return (
              <div key={idx} className="cep-why-pillar-item">
                <div className={`cep-why-icon-bubble bubble-${item.color}`}>
                  <IconComponent size={19} />
                </div>
                <div className="cep-why-info">
                  <h4 className="cep-why-item-title">{item.title}</h4>
                  <p className="cep-why-item-desc">{item.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

