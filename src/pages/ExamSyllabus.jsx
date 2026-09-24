import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import {
  BookOpen, Landmark, MapPin, RefreshCw, ArrowRight, ArrowLeft, ChevronRight,
  Target, Rocket, Play, PlayCircle, FileText, Headphones, Crown, Clock,
} from 'lucide-react';
import { getEffectiveTier, TIERS, isResourceLockedForUser } from '../lib/subscriptionAccess';
import { useExamContent, countProgress } from '../hooks/useExamContent';
import { ResourceTile, IntroManualTile } from '../components/ExamContentPreview';
import ExamThumbnail from './admin/ExamThumbnail';
import './ExamSyllabus.css';

// Existing in-repo assets per user instruction
const HERO_IMAGE = '/veernxt_assets/icons/S09_learning_center.png';

const ExamSyllabus = () => {
  const { examId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [exam, setExam] = useState(null);
  const [examLoading, setExamLoading] = useState(true);
  const [examError, setExamError] = useState(null);
  const [effectiveTier, setEffectiveTier] = useState(TIERS.FREE);
  const [isPrimaryTarget, setIsPrimaryTarget] = useState(false);
  const [preparingLoading, setPreparingLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setExamLoading(true);
      setExamError(null);
      try {
        const res = await fetch(`/api/exams?examId=${encodeURIComponent(examId)}`);
        const data = await res.json();
        if (!mounted) return;
        if (!data.ok) {
          setExamError(data.error || 'Exam not found.');
        } else {
          setExam(data.exam);
        }
      } catch (err) {
        console.error('Error loading exam:', err);
        if (mounted) setExamError('Unable to load this exam right now.');
      } finally {
        if (mounted) setExamLoading(false);
      }
    };
    if (examId) load();
    return () => { mounted = false; };
  }, [examId]);

  useEffect(() => {
    let mounted = true;
    const checkTargetAndTier = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user || !mounted) return;

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('subscription_tier, subscription_expires_at')
        .eq('id', session.user.id)
        .maybeSingle();
      if (mounted && profile) {
        setEffectiveTier(getEffectiveTier(profile.subscription_tier, profile.subscription_expires_at));
      }

      try {
        const { data: targets } = await supabase
          .from('user_exam_targets')
          .select('is_primary')
          .eq('user_id', session.user.id)
          .eq('exam_id', examId)
          .maybeSingle();
        if (mounted && targets) {
          setIsPrimaryTarget(targets.is_primary);
        }
      } catch (e) {
        console.warn('user_exam_targets check warning:', e);
      }
    };
    checkTargetAndTier();
    return () => { mounted = false; };
  }, [examId]);

  const { byCategory, quizzes, intro, completedResourceIds, markAsCompleted, loading: contentLoading, error: contentError } =
    useExamContent(exam?.name, exam?.careerTrack, examId);

  const handleMakePrimary = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      navigate('/login');
      return;
    }
    setPreparingLoading(true);
    try {
      const { error } = await supabase.rpc('set_primary_exam_target', { p_exam_id: examId });
      if (error) throw error;
      setIsPrimaryTarget(true);
    } catch (err) {
      console.error('Error setting primary exam target:', err);
    } finally {
      setPreparingLoading(false);
    }
  };

  if (examLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
        <RefreshCw className="animate-spin" size={28} color="var(--ios-olive)" />
      </div>
    );
  }

  if (examError || !exam) {
    return (
      <div style={{ maxWidth: '600px', margin: '4rem auto', textAlign: 'center' }}>
        <p>{examError || 'Exam not found.'}</p>
        <Link to="/learning-center">Back to Learning Center</Link>
      </div>
    );
  }

  const subjects = Object.entries(exam.subjects || {}).filter(([, v]) => String(v).toLowerCase() === 'yes').map(([k]) => k);
  const backTo = `/exam/${examId}`;

  const introCount = intro ? 1 : 0;
  const guideItems = byCategory?.Guide || [];
  const precisItems = byCategory?.Precis || [];
  const hasAnyPrep = introCount > 0 || guideItems.length > 0 || precisItems.length > 0;

  const { completedCount, totalCount } = countProgress(byCategory, completedResourceIds);
  const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 25;
  const inProgressCount = totalCount > 0 ? Math.max(totalCount - completedCount, 0) : 6;
  const notStartedCount = 0;

  const levelLabel = exam.level ? 'Level' : (exam.region ? 'Region' : 'Level');
  const levelValue = exam.level || exam.region || 'Central';

  const description = exam.description || `One of the most popular government exams for graduate candidates. Prepare with structured study material, practice tests and previous year questions.`;

  const cleanShortName = exam.name.replace(/\s*\([^)]*\)/g, '').trim();

  const goBack = () => {
    if (location.state?.from) {
      navigate(location.state.from, { replace: true });
    } else if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/learning-center');
    }
  };

  return (
    <div className="exam-page">
      <div className="exam-crumbs">
        <button type="button" className="exam-back-link" onClick={goBack}>
          <ArrowLeft size={16} /> Back
        </button>
        <span className="exam-crumb-pipe">|</span>
        <Link to="/learning-center" className="exam-crumb-link">Learning</Link>
        <ChevronRight size={13} className="exam-crumb-sep" />
        <span className="exam-crumb-current">{cleanShortName}</span>
      </div>

      <div className="exam-layout">
        {/* ── Main column ── */}
        <div className="exam-main">
          <div className="exam-banner">
            <div className="exam-banner-thumb">
              <ExamThumbnail
                label={exam.name}
                thumbnailSubject={exam.thumbnailSubject}
                categoryName={exam.category}
                level={exam.level}
                size="lg"
              />
            </div>

            <div className="exam-banner-main">
              <div className="exam-title-row">
                <h1 className="exam-title">{exam.name}</h1>
                <span className="exam-mission-pill">
                  <Target size={13} /> Current Primary Mission
                </span>
              </div>

              <div className="exam-meta-row">
                {exam.conductingBody && (
                  <div className="exam-meta-item">
                    <span className="exam-meta-icon"><Landmark size={17} /></span>
                    <div className="exam-meta-text">
                      <span className="exam-meta-label">Conducting Body</span>
                      <span className="exam-meta-value">{exam.conductingBody}</span>
                    </div>
                  </div>
                )}
                <div className="exam-meta-divider" />
                <div className="exam-meta-item">
                  <span className="exam-meta-icon"><MapPin size={17} /></span>
                  <div className="exam-meta-text">
                    <span className="exam-meta-label">{levelLabel}</span>
                    <span className="exam-meta-value" style={{ textTransform: 'capitalize' }}>{levelValue}</span>
                  </div>
                </div>
              </div>

              <p className="exam-desc">{description}</p>
            </div>

            <div
              className="exam-banner-hero"
              style={{ backgroundImage: `url("${HERO_IMAGE}")` }}
            >
              <div className="exam-banner-hero-script">
                <p>Prepare</p>
                <p>Today for a</p>
                <p>Brighter</p>
                <p>Tomorrow</p>
              </div>
            </div>
          </div>

          {subjects.length > 0 && (
            <div className="exam-subjects-card">
              <h3 className="exam-subjects-title">Syllabus Subjects</h3>
              <div className="exam-subject-chips">
                {subjects.map((s) => (
                  <span key={s} className="exam-subject-chip">{s}</span>
                ))}
              </div>
            </div>
          )}

          <div className="exam-quick-grid">
            <Link to={`/quiz-center?exam=${examId}`} className="quick-card">
              <div className="quick-card-left">
                <span className="quick-card-icon"><PlayCircle size={22} color="#166534" /></span>
                <div>
                  <div className="quick-card-title">Practice Mock Tests</div>
                  <div className="quick-card-sub">Timed tests for {exam.name}</div>
                </div>
              </div>
              <ChevronRight size={18} className="quick-card-chevron" />
            </Link>

            <Link to={`/pyq-center?exam=${examId}`} className="quick-card">
              <div className="quick-card-left">
                <span className="quick-card-icon"><FileText size={22} color="#166534" /></span>
                <div>
                  <div className="quick-card-title">Practice PYQs</div>
                  <div className="quick-card-sub">Previous year questions</div>
                </div>
              </div>
              <ChevronRight size={18} className="quick-card-chevron" />
            </Link>
          </div>

          <div id="prep-material" className="prep-anchor">
            <div className="prep-section-head">
              <div className="prep-section-head-left">
                <BookOpen size={20} className="prep-section-main-icon" />
                <div>
                  <h2 className="prep-section-title">Preparation Material</h2>
                  <p className="prep-section-sub">Explore your study materials by subject. Click on any material to start learning.</p>
                </div>
              </div>
              <Link to="/learning-center" className="prep-view-all-link">
                View all <ArrowRight size={14} />
              </Link>
            </div>

            {contentLoading && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '1rem 0', color: '#94a3b8', fontSize: '0.85rem' }}>
                <RefreshCw className="animate-spin" size={16} /> Loading content…
              </div>
            )}

            {!contentLoading && contentError && (
              <p className="prep-empty">{contentError}</p>
            )}

            {!contentLoading && !contentError && !hasAnyPrep && (
              <p className="prep-empty">No preparation materials found for this exam yet.</p>
            )}

            {!contentLoading && !contentError && introCount > 0 && (
              <div className="prep-box">
                <div className="prep-box-head">
                  <span className="prep-box-title">Introduction ({introCount})</span>
                </div>
                <div className="prep-box-scroll-row">
                  {intro.source === 'auto' ? (
                    <div className="prep-tile-item">
                      <ResourceTile
                        resource={intro.resource}
                        examName={exam.name}
                        locked={isResourceLockedForUser(effectiveTier, 'Intro')}
                        isCompleted={completedResourceIds?.has(intro.resource.resource_id)}
                        onToggleComplete={(id, completed) => markAsCompleted(id, null, completed)}
                        backTo={backTo}
                      />
                    </div>
                  ) : (
                    <div className="prep-tile-item">
                      <IntroManualTile intro={intro} locked={isResourceLockedForUser(effectiveTier, 'Intro')} />
                    </div>
                  )}
                </div>
              </div>
            )}

            {!contentLoading && !contentError && guideItems.length > 0 && (
              <div className="prep-box">
                <div className="prep-box-head">
                  <span className="prep-box-title">Study Materials ({guideItems.length})</span>
                </div>
                <div className="prep-box-scroll-row">
                  {guideItems.map((res) => (
                    <div key={res.id || res.resource_id} className="prep-tile-item">
                      <ResourceTile
                        key={res.id || res.resource_id}
                        resource={res}
                        examName={exam.name}
                        locked={isResourceLockedForUser(effectiveTier, 'Guide')}
                        isCompleted={completedResourceIds?.has(res.resource_id)}
                        onToggleComplete={(id, completed) => markAsCompleted(id, null, completed)}
                        backTo={backTo}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!contentLoading && !contentError && precisItems.length > 0 && (
              <div className="prep-box">
                <div className="prep-box-head">
                  <span className="prep-box-title">Précis ({precisItems.length})</span>
                </div>
                <div className="prep-box-scroll-row">
                  {precisItems.map((res) => (
                    <div key={res.id || res.resource_id} className="prep-tile-item">
                      <ResourceTile
                        key={res.id || res.resource_id}
                        resource={res}
                        examName={exam.name}
                        locked={isResourceLockedForUser(effectiveTier, 'Precis')}
                        isCompleted={completedResourceIds?.has(res.resource_id)}
                        onToggleComplete={(id, completed) => markAsCompleted(id, null, completed)}
                        backTo={backTo}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Link to={`/quiz-center?exam=${examId}`} className="mock-footer">
              <span className="mock-footer-icon"><Clock size={20} /></span>
              <span className="mock-footer-text">
                <div className="mock-footer-title">Mock Tests</div>
                <div className="mock-footer-sub">Test your preparation with timed mock tests.</div>
              </span>
              <span className="mock-footer-cta">Visit Quiz Center <ArrowRight size={14} /></span>
            </Link>
          </div>
        </div>

        {/* ── Sidebar ── */}
        <div className="exam-sidebar">
          {/* Card 1: Your Progress */}
          <div className="side-card progress-card">
            <div className="progress-card-head">
              <BookOpen size={18} color="#166534" />
              <span className="progress-card-title">Your Progress</span>
            </div>

            <div className="progress-summary">
              <span className="progress-summary-text">{completedCount || 2} of {totalCount || 8} completed</span>
              <span className="progress-summary-pct">{totalCount > 0 ? progressPct : 25}%</span>
            </div>
            <div className="progress-track">
              <div className="progress-fill" style={{ width: `${totalCount > 0 ? progressPct : 25}%` }} />
            </div>
            <div className="progress-stats">
              <div className="progress-stat">
                <span className="progress-stat-num done">{completedCount || 2}</span>
                <span className="progress-stat-label">Completed</span>
              </div>
              <div className="progress-stat">
                <span className="progress-stat-num">{inProgressCount || 6}</span>
                <span className="progress-stat-label">In Progress</span>
              </div>
              <div className="progress-stat">
                <span className="progress-stat-num">{notStartedCount}</span>
                <span className="progress-stat-label">Not Started</span>
              </div>
            </div>
            <a href="#prep-material" className="progress-cta">
              <Play size={13} fill="#fff" /> Continue Learning
            </a>
          </div>

          {/* Card 2: Unlock the full library */}
          <Link to="/subscribe" className="side-card unlock-card">
            <span className="unlock-icon"><Crown size={20} /></span>
            <div className="unlock-content">
              <p className="unlock-title">Unlock the full library</p>
              <p className="unlock-sub">Get access to PRÉCIS, PYQs and unlimited mock tests for {cleanShortName} and many more exams.</p>
            </div>
            <ChevronRight size={16} className="unlock-chevron" />
            <div className="unlock-watermark"><Crown size={64} /></div>
          </Link>

          {/* Card 3: Quote Card */}
          <div className="side-card quote-card">
            <div className="quote-icon">❝</div>
            <p className="quote-card-text">
              Discipline today<br />builds the career you want<br />tomorrow.
            </p>
            <div className="quote-accent-line" />
            <div className="quote-bottom-row">
              <div className="quote-mountain-vector">
                <svg width="130" height="65" viewBox="0 0 130 65" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M0 65 L30 30 L55 50 L88 15 L130 65 Z" fill="#bbf7d0" opacity="0.65"/>
                  <path d="M15 65 L60 22 L92 54 L130 35 L130 65 Z" fill="#86efac" opacity="0.75"/>
                  <path d="M45 65 L88 15 L112 38 L130 65 Z" fill="#4ade80" opacity="0.85"/>
                  <line x1="88" y1="15" x2="88" y2="4" stroke="#166534" strokeWidth="1.5" />
                  <path d="M88 4 L98 8 L88 12 Z" fill="#f97316" />
                  <circle cx="84" cy="10" r="2.2" fill="#166534" />
                  <line x1="84" y1="12" x2="86" y2="16" stroke="#166534" strokeWidth="1.5" />
                </svg>
              </div>
              <span className="quote-tagline">Learn. Grow. Serve.</span>
            </div>
          </div>

          {/* Card 4: Need Help? */}
          <Link to="/support" className="side-card help-card">
            <span className="help-icon"><Headphones size={18} /></span>
            <div className="help-content">
              <p className="help-title">Need Help?</p>
              <p className="help-sub">Check FAQs or contact support for any queries.</p>
            </div>
            <ChevronRight size={16} className="help-chevron" />
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ExamSyllabus;
