import { useEffect, useState, useMemo } from 'react';
import { Link, useParams, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { 
  Shield, 
  MapPin, 
  RefreshCw, 
  ArrowRight, 
  Target, 
  Rocket, 
  PlayCircle, 
  HelpCircle, 
  Check, 
  Lock, 
  Unlock, 
  ArrowLeft,
  BookOpen,
  Book,
  ScrollText,
  FileText,
  Landmark,
  Edit3,
  Scale,
  HeartPulse,
  Laptop,
  X
} from 'lucide-react';
import { getEffectiveTier, TIERS, canAccessResource } from '../lib/subscriptionAccess';
import { useExamContent } from '../hooks/useExamContent';
import { cleanContentTitle } from '../lib/contentTitle';
import { resolveSubjectForTitle } from '../lib/thumbnailTaxonomy';
import './ExamSyllabus.css';

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
  const [activeIntroModal, setActiveIntroModal] = useState(null);

  // Load Exam Metadata
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setExamLoading(true);
      setExamError(null);
      try {
        let loadedExam = null;
        try {
          const res = await fetch(`/api/exams?examId=${encodeURIComponent(examId)}`);
          const data = await res.json();
          if (data?.ok && data?.exam) {
            loadedExam = data.exam;
          }
        } catch (apiErr) {
          console.warn('API /api/exams request failed, attempting direct Supabase query:', apiErr);
        }

        // Direct Supabase fallback if API did not find or failed
        if (!loadedExam) {
          const { data: lcRow, error: lcErr } = await supabase
            .from('lc_exams')
            .select('id, name, category, website, accent_color, thumbnail_subject, conducting_body:lc_conducting_bodies(id, name), region:lc_regions(id, name, level)')
            .eq('id', examId)
            .maybeSingle();

          if (lcRow) {
            loadedExam = {
              id: lcRow.id,
              name: lcRow.name,
              conductingBody: lcRow.conducting_body?.name || '',
              region: lcRow.region?.name || '',
              level: lcRow.region?.level || null,
              careerTrack: lcRow.category || '',
              category: lcRow.category || '',
              website: lcRow.website || '',
              thumbnailSubject: lcRow.thumbnail_subject || null,
              subjects: {},
            };
          } else if (lcErr) {
            console.error('Supabase lc_exams error:', lcErr);
          }
        }

        if (!mounted) return;
        if (loadedExam) {
          setExam(loadedExam);
        } else {
          setExamError('Exam not found.');
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

  // Load User Tier and Primary Target Status
  useEffect(() => {
    let mounted = true;
    const checkTargetAndTier = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user || !mounted) return;

      // Tier check
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('subscription_tier, subscription_expires_at, free_quiz_used')
        .eq('id', session.user.id)
        .maybeSingle();
      if (mounted && profile) {
        setEffectiveTier(getEffectiveTier(profile.subscription_tier, profile.subscription_expires_at));
      }

      // Exam target check
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

  // Set Exam as Primary Target
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

  // Load Exam Content / Study Materials
  const { byCategory, quizzes, intro, completedResourceIds, markAsCompleted } = useExamContent(
    exam?.name || '',
    exam?.careerTrack || exam?.category || '',
    exam?.id || examId
  );

  // Calculate Progress Stats
  const { totalCount, completedCount, progressPercent } = useMemo(() => {
    let total = 0;
    let completed = 0;

    // Intro count
    if (intro?.body || (byCategory?.['Intro'] && byCategory['Intro'].length > 0)) {
      total += 1;
      const introRes = byCategory?.['Intro']?.[0];
      if (introRes && completedResourceIds?.has(introRes.resource_id)) {
        completed += 1;
      }
    }

    // Guide count
    (byCategory?.['Guide'] || []).forEach((r) => {
      total += 1;
      if (completedResourceIds?.has(r.resource_id)) completed += 1;
    });

    // Precis count
    (byCategory?.['Precis'] || []).forEach((r) => {
      total += 1;
      if (completedResourceIds?.has(r.resource_id)) completed += 1;
    });

    // PYQ count
    (byCategory?.['PYQ'] || []).forEach((r) => {
      total += 1;
      if (completedResourceIds?.has(r.resource_id)) completed += 1;
    });

    const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { totalCount: total, completedCount: completed, progressPercent: pct };
  }, [intro, byCategory, completedResourceIds]);

  if (examLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '5rem 0', color: 'var(--olive-700)' }}>
        <RefreshCw className="animate-spin" size={32} />
      </div>
    );
  }

  if (examError || !exam) {
    return (
      <div style={{ maxWidth: '600px', margin: '4rem auto', textAlign: 'center', padding: '2rem' }}>
        <h3 style={{ color: '#0f172a', marginBottom: '0.5rem' }}>{examError || 'Exam not found.'}</h3>
        <Link to="/learning-center" style={{ color: 'var(--olive-700)', fontWeight: 700, textDecoration: 'none' }}>
          ← Back to Learning Path
        </Link>
      </div>
    );
  }

  const subjects = Object.entries(exam.subjects || {})
    .filter(([, v]) => String(v).toLowerCase() === 'yes')
    .map(([k]) => k);

  // Helper for subject icon and background gradient matching the screenshot
  const getSubjectIconAndColor = (subjectKey, title = '') => {
    const t = (title || '').toLowerCase();
    if (/descriptive|writing|essay|letter/i.test(t) || subjectKey === 'descriptive_writing') {
      return {
        bg: 'linear-gradient(135deg, #5f6b52, #7c8a6c)',
        icon: <Edit3 size={28} strokeWidth={1.8} color="#fff" />,
      };
    }
    if (/math|quantitative|arithmetic/i.test(t) || subjectKey === 'mathematics') {
      return {
        bg: 'linear-gradient(135deg, #2557a7, #3d75d6)',
        icon: <FileText size={28} strokeWidth={1.8} color="#fff" />,
      };
    }
    if (/reasoning|aptitude|logic/i.test(t) || subjectKey === 'reasoning') {
      return {
        bg: 'linear-gradient(135deg, #6c4bb6, #8f6bd9)',
        icon: <HelpCircle size={28} strokeWidth={1.8} color="#fff" />,
      };
    }
    if (/law|legal|judic/i.test(t) || subjectKey === 'law') {
      return {
        bg: 'linear-gradient(135deg, #6c4bb6, #8f6bd9)',
        icon: <Scale size={28} strokeWidth={1.8} color="#fff" />,
      };
    }
    if (/nurse|nursing|health|medical/i.test(t) || subjectKey === 'nursing') {
      return {
        bg: 'linear-gradient(135deg, #be123c, #e11d48)',
        icon: <HeartPulse size={28} strokeWidth={1.8} color="#fff" />,
      };
    }
    if (/computer|it\b|software/i.test(t) || subjectKey === 'computer_science' || subjectKey === 'information_technology') {
      return {
        bg: 'linear-gradient(135deg, #0891b2, #06b6d4)',
        icon: <Laptop size={28} strokeWidth={1.8} color="#fff" />,
      };
    }
    // Default GK / GS / General
    return {
      bg: 'linear-gradient(135deg, #12786b, #1ea08f)',
      icon: <Book size={28} strokeWidth={1.8} color="#fff" />,
    };
  };

  // Render individual material item card
  const renderMaterialCard = (resource, categoryName) => {
    const subject = resolveSubjectForTitle(resource.title);
    const theme = getSubjectIconAndColor(subject.key, resource.title);
    const isCompleted = completedResourceIds?.has(resource.resource_id);
    const access = canAccessResource(effectiveTier, categoryName);
    const isLocked = !access.allowed;

    return (
      <div key={resource.resource_id} className="exam-material-card">
        <Link
          to={`/reader/${resource.resource_id}`}
          state={{ from: `/exam/${examId}` }}
          className="exam-material-thumb"
          style={{ background: theme.bg }}
        >
          {theme.icon}
          <span className={`exam-status-badge ${isCompleted ? 'done' : isLocked ? 'locked' : 'free'}`}>
            {isCompleted ? (
              <Check size={12} strokeWidth={3} />
            ) : isLocked ? (
              <Lock size={12} />
            ) : (
              <Unlock size={12} />
            )}
          </span>
        </Link>
        <div className="exam-material-body">
          <Link
            to={`/reader/${resource.resource_id}`}
            state={{ from: `/exam/${examId}` }}
            className="exam-material-label"
          >
            {cleanContentTitle(resource.title, exam.name)}
          </Link>
          <button
            type="button"
            className={`exam-material-toggle ${isCompleted ? 'checked' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              markAsCompleted(resource.resource_id, !isCompleted);
            }}
          >
            <span className="box">
              {isCompleted && <Check size={10} strokeWidth={3} color="#fff" />}
            </span>
            {isCompleted ? 'Completed' : 'Mark complete'}
          </button>
        </div>
      </div>
    );
  };

  const guideItems = byCategory?.['Guide'] || [];
  const precisItems = byCategory?.['Precis'] || [];
  const pyqItems = byCategory?.['PYQ'] || [];
  const introItems = byCategory?.['Intro'] || [];
  const effectiveIntroItems = introItems.length > 0 ? introItems : (intro?.resource ? [intro.resource] : []);
  const hasIntro = intro?.body || intro?.resource || effectiveIntroItems.length > 0;

  return (
    <main className="exam-detail-page">
      {/* ── Backlink ── */}
      <button
        type="button"
        className="exam-backlink"
        onClick={() => {
          if (location.state?.from) {
            navigate(location.state.from, { replace: true });
          } else if (window.history.length > 1) {
            navigate(-1);
          } else {
            navigate('/learning-center');
          }
        }}
      >
        <ArrowLeft size={16} /> Back to Learning Path
      </button>

      {/* ── Hero Banner ── */}
      <div className="exam-hero">
        <div className="exam-hero-top">
          <div className="exam-hero-icon">
            <Shield size={32} />
          </div>
          <div className="exam-hero-info">
            {isPrimaryTarget ? (
              <span className="exam-mission-badge">
                <Target size={12} /> Current Primary Mission
              </span>
            ) : (
              <button
                type="button"
                className="exam-make-primary-btn"
                onClick={handleMakePrimary}
                disabled={preparingLoading}
              >
                <Rocket size={12} /> {preparingLoading ? 'Updating…' : 'Make Primary Mission'}
              </button>
            )}
            <h1>{exam.name}</h1>
            <div className="exam-hero-meta">
              {exam.conductingBody && (
                <span>
                  <Landmark size={14} /> {exam.conductingBody}
                </span>
              )}
              {exam.region && (
                <span>
                  <MapPin size={14} /> {exam.region} {exam.level ? `(${exam.level.toUpperCase()})` : ''}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="exam-hero-stats">
          <div className="exam-hero-stat-chip">
            <b>{subjects.length > 0 ? subjects.length : 5}</b>
            <span>Syllabus Subjects</span>
          </div>
          <div className="exam-hero-stat-chip">
            <b>{completedCount} / {totalCount > 0 ? totalCount : 8}</b>
            <span>Materials Completed</span>
          </div>
          <div className="exam-hero-stat-chip">
            <b>{quizzes?.length > 0 ? quizzes.length : 'Unlimited'}</b>
            <span>Mock Tests</span>
          </div>
        </div>
      </div>

      {/* ── Syllabus Subjects Panel ── */}
      <div className="exam-panel">
        <div className="exam-panel-title">Syllabus Subjects</div>
        <div className="exam-chip-row">
          {(subjects.length > 0 ? subjects : ['Mathematics', 'Reasoning', 'General Studies', 'English', 'General Science']).map((subj) => (
            <span key={subj} className="exam-subj-chip">
              <BookOpen size={14} /> {subj}
            </span>
          ))}
        </div>
      </div>

      {/* ── Practice Row ── */}
      <div className="exam-practice-row">
        <Link to={`/quiz-center?exam=${exam.id || examId}`} className="exam-practice-card">
          <div className="exam-practice-icon a">
            <PlayCircle size={22} />
          </div>
          <div className="exam-practice-body">
            <h3>Practice Mock Tests</h3>
            <p>{quizzes?.length > 0 ? `${quizzes.length} tests available` : '20 timed tests · 60 mins each'}</p>
          </div>
          <div className="exam-practice-arrow">
            <ArrowRight size={18} />
          </div>
        </Link>

        <Link to={`/pyq-center?exam=${exam.id || examId}`} className="exam-practice-card">
          <div className="exam-practice-icon b">
            <HelpCircle size={22} />
          </div>
          <div className="exam-practice-body">
            <h3>Practice PYQs</h3>
            <p>150+ previous year questions</p>
          </div>
          <div className="exam-practice-arrow">
            <ArrowRight size={18} />
          </div>
        </Link>
      </div>

      {/* ── Preparation Material Panel ── */}
      <div className="exam-panel">
        <div className="exam-prep-head">
          <h2>Preparation Material</h2>
          <p>Explore your study materials by subject. Tap the checkbox on any card to track your progress.</p>
        </div>

        <div className="exam-progress-bar-wrap">
          <div className="exam-progress-track">
            <div className="exam-progress-fill" style={{ width: `${progressPercent}%` }} />
          </div>
          <span className="exam-progress-label">
            {completedCount} of {totalCount} completed
          </span>
        </div>

        {/* 1. Introduction Subsection */}
        {hasIntro && (
          <div className="exam-subsection">
            <div className="exam-subsection-head">
              <h3><FileText size={15} /> Introduction</h3>
              <span className="exam-subsection-count">
                {introItems[0] && completedResourceIds?.has(introItems[0].resource_id) ? '1 / 1' : '0 / 1'}
              </span>
            </div>
            <div className="exam-material-grid">
              {effectiveIntroItems.length > 0 ? (
                effectiveIntroItems.map((r) => renderMaterialCard(r, 'Intro'))
              ) : intro?.body ? (
                <div className="exam-material-card">
                  <div
                    className="exam-material-thumb"
                    onClick={() => setActiveIntroModal(intro)}
                    style={{
                      background: 'linear-gradient(135deg, #12786b, #1ea08f)',
                    }}
                  >
                    <Book size={28} strokeWidth={1.8} color="#fff" />
                    <span className="exam-status-badge free">
                      <Unlock size={12} />
                    </span>
                  </div>
                  <div className="exam-material-body">
                    <div
                      className="exam-material-label"
                      onClick={() => setActiveIntroModal(intro)}
                      style={{ cursor: 'pointer' }}
                    >
                      {intro.title || `${exam.name} Overview`}
                    </div>
                    <div className="exam-material-toggle">
                      <span className="box" />
                      Study Overview
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        )}

        {/* 2. Guide Subsection */}
        {guideItems.length > 0 && (
          <div className="exam-subsection">
            <div className="exam-subsection-head">
              <h3><BookOpen size={15} /> Guide</h3>
              <span className="exam-subsection-count">
                {guideItems.filter((r) => completedResourceIds?.has(r.resource_id)).length} / {guideItems.length}
              </span>
            </div>
            <div className="exam-material-grid">
              {guideItems.map((r) => renderMaterialCard(r, 'Guide'))}
            </div>
          </div>
        )}

        {/* 3. Précis Subsection */}
        {precisItems.length > 0 && (
          <div className="exam-subsection">
            <div className="exam-subsection-head">
              <h3><ScrollText size={15} /> Précis</h3>
              <span className="exam-subsection-count">
                {precisItems.filter((r) => completedResourceIds?.has(r.resource_id)).length} / {precisItems.length}
              </span>
            </div>
            <div className="exam-material-grid">
              {precisItems.map((r) => renderMaterialCard(r, 'Precis'))}
            </div>
          </div>
        )}

        {/* 4. PYQ Subsection */}
        {pyqItems.length > 0 && (
          <div className="exam-subsection">
            <div className="exam-subsection-head">
              <h3><HelpCircle size={15} /> Previous Year Papers</h3>
              <span className="exam-subsection-count">
                {pyqItems.filter((r) => completedResourceIds?.has(r.resource_id)).length} / {pyqItems.length}
              </span>
            </div>
            <div className="exam-material-grid">
              {pyqItems.map((r) => renderMaterialCard(r, 'PYQ'))}
            </div>
          </div>
        )}

        {/* 5. Mock Tests Subsection */}
        <div className="exam-subsection" style={{ marginBottom: 0 }}>
          <div className="exam-subsection-head">
            <h3>Mock Tests</h3>
          </div>
          <Link to={`/quiz-center?exam=${exam.id || examId}`} className="exam-quiz-row">
            <div className="exam-practice-icon">
              <PlayCircle size={22} />
            </div>
            <div className="exam-practice-body">
              <h3>Visit Quiz Center</h3>
              <span className="sub">Jump straight into a full-length timed simulation for {exam.name}</span>
            </div>
            <div className="exam-practice-arrow">
              <ArrowRight size={18} />
            </div>
          </Link>
        </div>
      </div>

      {/* ── Unlock Banner (for Free / Non-Premium users) ── */}
      {effectiveTier === TIERS.FREE && (
        <div className="exam-unlock-banner">
          <div className="exam-unlock-left">
            <div className="exam-unlock-icon">
              <BookOpen size={24} />
            </div>
            <div>
              <h3>Unlock the full library</h3>
              <p>Précis, PYQs, and unlimited mock tests for every matched exam.</p>
              <div className="exam-unlock-perks">
                <span className="exam-perk">Précis</span>
                <span className="exam-perk">PYQs</span>
                <span className="exam-perk">Unlimited Mock Tests</span>
              </div>
            </div>
          </div>
          <Link to="/subscribe" className="exam-unlock-btn">
            Upgrade Now <ArrowRight size={15} />
          </Link>
        </div>
      )}

      {/* ── Intro Modal Popup (for HTML Introduction bodies) ── */}
      {activeIntroModal && (
        <div
          onClick={() => setActiveIntroModal(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15,23,42,0.6)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.5rem',
            backdropFilter: 'blur(4px)',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#fff',
              borderRadius: '16px',
              width: 'min(780px, 100%)',
              maxHeight: '85vh',
              overflowY: 'auto',
              padding: '2rem',
              position: 'relative',
              boxShadow: 'var(--shadow-lg)',
            }}
          >
            <button
              onClick={() => setActiveIntroModal(null)}
              style={{
                position: 'absolute',
                top: '1.25rem',
                right: '1.25rem',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: '#64748b',
              }}
            >
              <X size={22} />
            </button>
            <h2 style={{ marginTop: 0, color: 'var(--olive-800)', fontSize: '1.4rem' }}>
              {activeIntroModal.title || `${exam.name} — Overview`}
            </h2>
            <div
              className="intro-manual-body"
              style={{ fontSize: '0.95rem', color: '#334155', lineHeight: 1.6 }}
              dangerouslySetInnerHTML={{ __html: activeIntroModal.body || '' }}
            />
          </div>
        </div>
      )}
    </main>
  );
};

export default ExamSyllabus;
