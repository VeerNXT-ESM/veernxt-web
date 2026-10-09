import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FileText, BookOpen, ScrollText, ListChecks, PlayCircle, Lock, Unlock, RefreshCw, ArrowRight, CheckCircle2, Check, X, Crown, ChevronRight, Shield } from 'lucide-react';
import { isResourceLockedForUser, canTakeQuiz } from '../lib/subscriptionAccess';
import { useExamContent } from '../hooks/useExamContent';
import { cleanContentTitle } from '../lib/contentTitle';
import { resolveSubjectForTitle, getFamilyHex } from '../lib/thumbnailTaxonomy';
import { useThumbnails } from '../lib/thumbnailStore';
import { ReaderThemeProvider } from './book/theme/ReaderThemeProvider';
import './book/Book3D.css';

const BUCKETS = [
  { key: 'Intro', label: 'Intro', icon: FileText, anchor: 'section-intro' },
  { key: 'Guide', label: 'Guidebook', icon: BookOpen, anchor: 'section-guide' },
  { key: 'Precis', label: 'Précis', icon: ScrollText, anchor: 'section-precis' },
];

// Full-name sections for `variant="list"` — same categories ExamSyllabus.jsx
// renders on its own page, reused here so the dropdown can show the actual
// resource names inline instead of only teaser tiles that link out.
const LIST_SECTIONS = [
  { key: 'Intro', label: 'Introduction' },
  { key: 'Guide', label: 'Guidebook' },
  { key: 'Precis', label: 'Précis' },
  { key: 'PYQ', label: 'Previous Year Questions' },
];

// `variant="subjects"` sections resources by category (Intro/Guide/Precis/
// PYQ) — every resource is visible immediately, no subject-tile click-
// through step. Each resource still gets its own subject-colour thumbnail
// (English, Reasoning, ...), resolved per-resource from its title via the
// shared thumbnail taxonomy, via ResourceTile below.
const SUBJECT_CATEGORY_ORDER = ['Intro', 'Guide', 'Precis', 'PYQ'];
const SUBJECT_CATEGORY_LABELS = { Intro: 'Intro', Guide: 'Guide', Precis: 'Précis', PYQ: 'PYQ' };

const CATEGORY_BADGES = {
  Guide: { label: 'Guidebook', bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' },
  Precis: { label: 'Précis', bg: '#faf5ff', color: '#7e22ce', border: '#e9d5ff' },
  PYQ: { label: 'PYQ', bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0' },
  Intro: { label: 'Introduction', bg: '#fffbeb', color: '#b45309', border: '#fde68a' },
  Mock: { label: 'Mock Test', bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0' },
};

function ResourceRow({ resource, examName, locked, isCompleted, onToggleComplete, backTo, badgeLabel, examId }) {
  const cat = badgeLabel || resource.category || 'Guide';
  const badgeConfig = CATEGORY_BADGES[cat] || { label: cat, bg: '#f1f5f9', color: '#475569', border: '#e2e8f0' };
  const isPyq = cat === 'PYQ' || resource.category === 'PYQ';
  const targetLink = isPyq
    ? (resource.link || `/pyq-center?exam=${encodeURIComponent(examId || examName || '')}`)
    : (resource.link || `/reader/${resource.resource_id}`);

  return (
    <div
      style={{
        display: 'flex', alignItems: 'center', gap: '0.65rem', padding: '0.65rem 0.9rem',
        borderRadius: 'var(--radius-sm, 10px)',
        border: (isCompleted && !isPyq) ? '1px solid #bbf7d0' : '1px solid var(--border, #e2e8f0)',
        marginBottom: '0.5rem', background: (isCompleted && !isPyq) ? '#f0fdf4' : '#fff',
        minWidth: 0,
        boxSizing: 'border-box',
      }}
    >
      {onToggleComplete && !isPyq && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleComplete(resource.resource_id, !isCompleted);
          }}
          title={isCompleted ? "Marked as Complete — click to undo" : "Mark as Complete"}
          style={{
            background: isCompleted ? '#16a34a' : 'transparent',
            border: isCompleted ? 'none' : '2px solid #cbd5e1',
            borderRadius: '50%',
            width: '22px',
            height: '22px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            padding: 0,
            flexShrink: 0,
          }}
        >
          {isCompleted && <Check size={13} color="#fff" strokeWidth={3} />}
        </button>
      )}
      <FileText size={15} color={(isCompleted && !isPyq) ? "#16a34a" : "var(--ios-olive)"} style={{ flexShrink: 0 }} />
      <span
        style={{
          fontSize: '0.68rem',
          fontWeight: 700,
          padding: '0.15rem 0.45rem',
          borderRadius: '4px',
          background: badgeConfig.bg,
          color: badgeConfig.color,
          border: `1px solid ${badgeConfig.border}`,
          textTransform: 'uppercase',
          letterSpacing: '0.02em',
          flexShrink: 0,
        }}
      >
        {badgeConfig.label}
      </span>
      <Link
        to={targetLink}
        state={backTo ? { from: backTo } : undefined}
        style={{
          flex: 1,
          minWidth: 0,
          fontSize: '0.85rem',
          textDecoration: 'none',
          color: 'inherit',
          fontWeight: (isCompleted && !isPyq) ? 600 : 500,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {cleanContentTitle(resource.title, examName)}
      </Link>
      {isCompleted && !isPyq && <span style={{ fontSize: '0.7rem', color: '#16a34a', fontWeight: 700, background: '#dcfce7', padding: '0.15rem 0.5rem', borderRadius: '999px', flexShrink: 0 }}>Done</span>}
      {locked ? <Lock size={13} color="#ef4444" style={{ flexShrink: 0 }} /> : <Unlock size={13} color="#16a34a" style={{ flexShrink: 0 }} />}
    </div>
  );
}

// One thumbnail per resource (not per subject) for `variant="subjects"` —
// colour/art comes from resolveSubjectForTitle, same taxonomy the old
// subject-tile grouping used, just applied per-document instead of once
// per subject so a Guide and its sibling Précis each get their own tile
// and label instead of sharing one tile captioned "Guide • Précis".
export function ResourceTile({ resource, examName, locked, isCompleted, onToggleComplete, backTo, onOpenResource }) {
  const subject = resolveSubjectForTitle(resource.title, resource.category);
  const bg = getFamilyHex(subject.family);
  const { subjectUrl } = useThumbnails();
  const image = subjectUrl(subject.key);
  const cleanTitle = cleanContentTitle(resource.title, examName);

  return (
    <div className="vn-book-3d-scene">
      <Link
        to={`/reader/${resource.resource_id}`}
        state={backTo ? { from: backTo } : undefined}
        onClick={onOpenResource ? (e) => { e.preventDefault(); onOpenResource(resource); } : undefined}
        style={{ textDecoration: 'none', width: '100%', display: 'block' }}
      >
        <div className="vn-book-3d-item">
          {/* Rear hardcover base */}
          <div className="vn-book-3d-back" style={{ background: bg || '#042f28' }} />

          {/* Left extruded spine */}
          <div className="vn-book-3d-spine" style={{ background: bg || '#042f28' }}>
            <div className="vn-book-spine-gold-ring" />
            <span className="vn-book-3d-spine-text">{cleanTitle || subject.label}</span>
            <div className="vn-book-spine-gold-ring" />
            <div className="vn-book-3d-spine-light" />
          </div>

          {/* Right paper block thickness */}
          <div className="vn-book-3d-pages-right" />

          {/* Bottom paper block thickness */}
          <div className="vn-book-3d-pages-bottom" />

          {/* Front cover */}
          <div
            className="vn-book-3d-front"
            style={{
              backgroundImage: image
                ? `linear-gradient(180deg, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.45) 55%, rgba(0,0,0,0.85) 100%), url("${image}")`
                : `linear-gradient(160deg, ${bg || '#065f46'} 0%, #042f28 100%)`,
            }}
          >
            {/* Hardcover hinge crease line */}
            <div className="vn-book-3d-crease" />

            {/* Glossy light reflection sheen */}
            <div className="vn-book-3d-sheen" />

            {/* Top header: VeerNXT emblem + Lock Pill */}
            <div className="vn-book-cover-header">
              <div className="vn-book-cover-crest-badge">
                <Shield size={10} style={{ color: '#b45309' }} />
                <span className="vn-book-cover-crest-text">VEERNXT</span>
              </div>
              <div className={`vn-book-lock-pill ${locked ? 'locked' : 'unlocked'}`}>
                {locked ? <Lock size={11} color="white" /> : <Unlock size={11} color="white" />}
              </div>
            </div>

            {/* Center Cover Typography Banner */}
            <div className="vn-book-cover-center-banner">
              <span className="vn-book-cover-exam-tag">{examName || 'EXAM PREP'}</span>
              <h4 className="vn-book-cover-main-title">{cleanTitle}</h4>
              <span className="vn-book-cover-sub-bar">{subject.label || 'COMPLETE GUIDE'}</span>
            </div>

            {/* Bottom Category Chip */}
            <div className="vn-book-cover-footer">
              <span className="vn-book-cover-category-chip">{resource.category || 'GUIDEBOOK'}</span>
            </div>
          </div>
        </div>
      </Link>

      {/* Ground cast shadow */}
      <div className="vn-book-3d-ground-shadow" />

      {/* Bottom Checkbox & Title Row */}
      <div className="vn-book-bottom-info">
        <button
          type="button"
          onClick={() => onToggleComplete?.(resource.resource_id, !isCompleted)}
          title={isCompleted ? 'Marked as Complete — click to undo' : 'Mark as Complete'}
          className={`vn-book-checkbox ${isCompleted ? 'completed' : ''}`}
        >
          {isCompleted && <Check size={11} color="#fff" strokeWidth={3.5} />}
        </button>
        <span className={`vn-book-title-label ${isCompleted ? 'completed' : ''}`}>
          {cleanTitle}
        </span>
      </div>
    </div>
  );
}

// 3D Book look for a manual (docx-uploaded, HTML-body) Introduction
export function IntroManualTile({ intro, locked, onOpen }) {
  const [open, setOpen] = useState(false);
  const handleClick = () => {
    if (onOpen) onOpen(intro);
    else setOpen(true);
  };

  return (
    <>
      <div className="vn-book-3d-scene">
        <div onClick={handleClick} style={{ width: '100%', cursor: 'pointer' }}>
          <div className="vn-book-3d-item">
            <div className="vn-book-3d-back" style={{ background: '#042f28' }} />

            <div className="vn-book-3d-spine" style={{ background: '#042f28' }}>
              <div className="vn-book-spine-gold-ring" />
              <span className="vn-book-3d-spine-text">{intro.title || 'INTRODUCTION'}</span>
              <div className="vn-book-spine-gold-ring" />
              <div className="vn-book-3d-spine-light" />
            </div>

            <div className="vn-book-3d-pages-right" />
            <div className="vn-book-3d-pages-bottom" />

            <div
              className="vn-book-3d-front"
              style={{
                background: 'linear-gradient(160deg, #0d9488 0%, #115e59 50%, #042f28 100%)',
              }}
            >
              <div className="vn-book-3d-crease" />
              <div className="vn-book-3d-sheen" />

              <div className="vn-book-cover-header">
                <div className="vn-book-cover-crest-badge">
                  <Shield size={10} style={{ color: '#b45309' }} />
                  <span className="vn-book-cover-crest-text">VEERNXT</span>
                </div>
                <div className={`vn-book-lock-pill ${locked ? 'locked' : 'unlocked'}`}>
                  {locked ? <Lock size={11} color="white" /> : <Unlock size={11} color="white" />}
                </div>
              </div>

              <div className="vn-book-cover-center-banner">
                <span className="vn-book-cover-exam-tag">OFFICIAL SYLLABUS</span>
                <h4 className="vn-book-cover-main-title">{intro.title || 'INTRODUCTION'}</h4>
                <span className="vn-book-cover-sub-bar">STUDY GUIDE</span>
              </div>

              <div className="vn-book-cover-footer">
                <span className="vn-book-cover-category-chip">MANUAL</span>
              </div>
            </div>
          </div>
        </div>

        <div className="vn-book-3d-ground-shadow" />

        <div className="vn-book-bottom-info">
          <span
            style={{
              width: '16px',
              height: '16px',
              border: '1.5px solid #cbd5e1',
              borderRadius: '4px',
              display: 'inline-block',
              flexShrink: 0,
              marginTop: '2px',
            }}
          />
          <span className="vn-book-title-label">
            {intro.title || 'Introduction'}
          </span>
        </div>
      </div>

      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}
        >
          <ReaderThemeProvider category="Intro" style={{ background: 'var(--reader-surface, #fff)', borderRadius: '14px', width: 'min(760px, 100%)', maxHeight: '85vh', overflowY: 'auto', padding: '2rem', position: 'relative' }}>
            <div onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => setOpen(false)}
                style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={20} />
              </button>
              {intro.title && <h3 style={{ marginTop: 0, color: 'var(--reader-heading, var(--ios-olive))', fontFamily: 'var(--reader-font-heading, inherit)' }}>{intro.title}</h3>}
              <div className="intro-manual-body" style={{ fontSize: 'var(--reader-font-size, 0.95rem)', color: 'var(--reader-text, #334155)', fontFamily: 'var(--reader-font-body, inherit)', lineHeight: 'var(--reader-line-height, 1.6)' }} dangerouslySetInnerHTML={{ __html: intro.body || '' }} />
              <style dangerouslySetInnerHTML={{ __html: `
                .intro-manual-body img { max-width: 100%; height: auto; border-radius: 8px; display: block; margin: 0.75rem 0; }
                .intro-manual-body p { margin: 0 0 0.75rem; }
                .intro-manual-body h1, .intro-manual-body h2, .intro-manual-body h3, .intro-manual-body h4 { color: var(--reader-heading, var(--ios-olive)); margin: 1rem 0 0.5rem; font-family: var(--reader-font-heading, inherit); }
                .intro-manual-body table { width: 100%; border-collapse: collapse; margin: 0.75rem 0; }
                .intro-manual-body th, .intro-manual-body td { border: 1px solid var(--reader-border, #e2e8f0); padding: 0.5rem 0.65rem; text-align: left; }
              `}} />
            </div>
          </ReaderThemeProvider>
        </div>
      )}
    </>
  );
}

function QuizRow({ quiz, examName, locked, examId }) {
  const isFallbackMock = quiz.id && String(quiz.id).startsWith('mock-');
  const targetUrl = quiz.link || (isFallbackMock ? `/quiz-center?exam=${encodeURIComponent(examId || examName || '')}` : `/quiz/${quiz.id}`);

  return (
    <Link
      to={targetUrl}
      style={{
        display: 'flex', alignItems: 'center', gap: '0.65rem', padding: '0.65rem 0.9rem',
        borderRadius: 'var(--radius-sm, 10px)', textDecoration: 'none', color: 'inherit',
        border: '1px solid var(--border, #e2e8f0)', marginBottom: '0.5rem', background: '#fff',
        minWidth: 0,
        boxSizing: 'border-box',
      }}
    >
      <PlayCircle size={15} color="var(--ios-olive)" style={{ flexShrink: 0 }} />
      <span
        style={{
          fontSize: '0.68rem',
          fontWeight: 700,
          padding: '0.15rem 0.45rem',
          borderRadius: '4px',
          background: '#f0fdf4',
          color: '#15803d',
          border: '1px solid #bbf7d0',
          textTransform: 'uppercase',
          letterSpacing: '0.02em',
          flexShrink: 0,
        }}
      >
        Mock Test
      </span>
      <span
        style={{
          flex: 1,
          minWidth: 0,
          fontSize: '0.85rem',
          fontWeight: 500,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {cleanContentTitle(quiz.title, examName)}
      </span>
      {locked ? <Lock size={13} color="#ef4444" style={{ flexShrink: 0 }} /> : <Unlock size={13} color="#16a34a" style={{ flexShrink: 0 }} />}
    </Link>
  );
}

/**
 * Content-type thumbnails for an exam — used by JobBoard.jsx's "Associated
 * Exam" accordion and Dashboard.jsx's "Top Exam Matches" accordion to prove
 * an exam's content mapping is real, without leaving the row/card it's
 * attached to. Every thumbnail routes into the full syllabus page
 * (ExamSyllabus.jsx) — never a single guessed file — since a bucket
 * routinely holds several documents (e.g. one exam's Guidebook can be 5
 * separate subject files).
 *
 * `splitPyqQuiz`/`showEmptyCategories` default false so JobBoard.jsx's
 * existing call site (4 cards, PYQ+Quiz combined, empty categories omitted)
 * is unaffected — Dashboard.jsx opts into both for its 5-category view.
 */
const ExamContentPreview = ({ examId, examName, careerTrack, tier, freeQuizUsed, splitPyqQuiz = false, showEmptyCategories = false, variant = 'tiles', categories = null, showMockTests = true }) => {
  const { byCategory, quizzes, intro, completedResourceIds, markAsCompleted, loading, error } = useExamContent(examName, careerTrack, examId);

  // Where the reader's own Back button should return to: the "list" variant
  // is always rendered inline on Learning Center itself (LearningCenter.jsx's
  // expandable "my exam" cards), so its books' natural back target is the
  // Learning Center page; "subjects" is ExamSyllabus.jsx's full-page grid,
  // so its books should return to that specific exam's page, not wherever
  // the user was before that (see SecureReader.jsx's handleBack, which reads
  // this from location.state.from before falling back to browser history).
  const readerBackTo = variant === 'list' ? '/learning-center' : (examId ? `/exam/${examId}` : undefined);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '1rem 0', color: '#94a3b8', fontSize: '0.85rem' }}>
        <RefreshCw className="animate-spin" size={16} /> Loading content…
      </div>
    );
  }

  if (error) {
    return <p style={{ color: '#94a3b8', fontSize: '0.85rem', padding: '0.5rem 0' }}>{error}</p>;
  }

  if (variant === 'list') {
    const quizAccess = canTakeQuiz(tier, freeQuizUsed);
    const visibleSections = categories ? LIST_SECTIONS.filter(({ key }) => categories.includes(key)) : LIST_SECTIONS;

    // Fallback Mock Tests list if none found in DB for this exam
    const mockTestList = quizzes.length > 0 ? quizzes : (showMockTests ? [
      { id: `mock-${examId || 'general'}-1`, title: `${examName} Full Length Mock Test 1`, link: `/quiz-center?exam=${encodeURIComponent(examId || examName || '')}` },
      { id: `mock-${examId || 'general'}-2`, title: `${examName} Sectional Test (General Studies & Reasoning)`, link: `/quiz-center?exam=${encodeURIComponent(examId || examName || '')}` },
      { id: `mock-${examId || 'general'}-3`, title: `${examName} Speed Practice Test`, link: `/quiz-center?exam=${encodeURIComponent(examId || examName || '')}` },
    ] : []);

    return (
      <div style={{ padding: '0.5rem 0 0' }}>
        {visibleSections.map(({ key, label }) => {
          let items = byCategory[key] || [];
          if (key === 'PYQ' && items.length === 0) {
            items = [
              { resource_id: `pyq-${examId || 'general'}-1`, title: `${examName} Previous Year Solved Paper (Prelims / Tier 1)`, category: 'PYQ', link: `/pyq-center?exam=${encodeURIComponent(examId || examName || '')}` },
              { resource_id: `pyq-${examId || 'general'}-2`, title: `${examName} 5-Year Question Bank with Explanations`, category: 'PYQ', link: `/pyq-center?exam=${encodeURIComponent(examId || examName || '')}` },
              { resource_id: `pyq-${examId || 'general'}-3`, title: `${examName} Official Model Paper Set`, category: 'PYQ', link: `/pyq-center?exam=${encodeURIComponent(examId || examName || '')}` },
            ];
          }
          if (items.length === 0) return null;
          return (
            <div key={key} style={{ marginBottom: '1.1rem' }}>
              <h4 style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700, marginBottom: '0.5rem', textTransform: 'uppercase' }}>{label}</h4>
              {items.map((res) => (
                <ResourceRow
                  key={res.id || res.resource_id}
                  resource={res}
                  examName={examName}
                  examId={examId}
                  locked={isResourceLockedForUser(tier, res.category)}
                  isCompleted={key !== 'PYQ' && completedResourceIds?.has(res.resource_id)}
                  onToggleComplete={key === 'PYQ' ? null : ((id, completed) => markAsCompleted(id, null, completed))}
                  backTo={readerBackTo}
                />
              ))}
              {key === 'PYQ' && (
                <Link
                  to={`/pyq-center?exam=${encodeURIComponent(examId || examName || '')}`}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.5rem 0.9rem',
                    borderRadius: '8px', textDecoration: 'none', color: '#166534',
                    border: '1px dashed #86efac', marginTop: '0.4rem', background: '#f0fdf4',
                    fontSize: '0.8rem', fontWeight: 700
                  }}
                >
                  <ScrollText size={14} />
                  <span>Explore All {examName} PYQs in PYQ Center</span>
                </Link>
              )}
            </div>
          );
        })}

        {showMockTests && mockTestList.length > 0 && (
          <div style={{ marginBottom: '1.1rem' }}>
            <h4 style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700, marginBottom: '0.5rem', textTransform: 'uppercase' }}>Mock Tests</h4>
            {mockTestList.map((quiz) => (
              <QuizRow
                key={quiz.id}
                quiz={quiz}
                examName={examName}
                examId={examId}
                locked={!quizAccess.allowed}
              />
            ))}
            <Link
              to={`/quiz-center?exam=${examId || examName}`}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.5rem 0.9rem',
                borderRadius: '8px', textDecoration: 'none', color: '#166534',
                border: '1px dashed #86efac', marginTop: '0.4rem', background: '#f0fdf4',
                fontSize: '0.8rem', fontWeight: 700
              }}
            >
              <PlayCircle size={14} />
              <span>Explore All {examName} Tests in Quiz Center</span>
            </Link>
          </div>
        )}

        <Link
          to="/subscribe"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.85rem',
            padding: '0.9rem 1.15rem',
            borderRadius: '12px',
            border: '1px solid #86efac',
            textDecoration: 'none',
            color: 'inherit',
            background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
            position: 'relative',
            overflow: 'hidden',
            marginTop: '0.75rem',
            boxShadow: '0 2px 8px rgba(22, 101, 52, 0.08)',
          }}
        >
          <div
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              background: '#bbf7d0',
              color: '#15803d',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Crown size={20} />
          </div>
          <div style={{ flex: 1, zIndex: 1 }}>
            <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#14532d', marginBottom: '0.15rem' }}>
              Unlock the full library
            </div>
            <div style={{ fontSize: '0.75rem', color: '#166534', lineHeight: 1.35 }}>
              Get access to PRÉCIS, PYQs, and unlimited mock tests for every exam.
            </div>
          </div>
          <ChevronRight size={18} color="#15803d" style={{ flexShrink: 0, zIndex: 1 }} />
          <Crown
            size={68}
            style={{
              position: 'absolute',
              right: '-10px',
              bottom: '-12px',
              color: '#16a34a',
              opacity: 0.12,
              pointerEvents: 'none',
            }}
          />
        </Link>
      </div>
    );
  }

  if (variant === 'subjects') {
    const hasAnything = SUBJECT_CATEGORY_ORDER.some((c) => (byCategory[c]?.length || 0) > 0) || quizzes.length > 0 || !!intro;

    if (!hasAnything) {
      return <p style={{ color: '#94a3b8', fontSize: '0.85rem', padding: '0.5rem 0' }}>No preparation materials found for this exam yet.</p>;
    }

    return (
      <div style={{ padding: '0.5rem 0 0' }}>
        {intro && (
          <div id="section-intro" style={{ marginBottom: '1.5rem', scrollMarginTop: '1.5rem' }}>
            <h4 style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700, marginBottom: '0.75rem', textTransform: 'uppercase' }}>Introduction</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: '0.85rem' }}>
              {intro.source === 'auto' ? (
                <ResourceTile
                  resource={intro.resource}
                  examName={examName}
                  locked={isResourceLockedForUser(tier, 'Intro')}
                  isCompleted={completedResourceIds?.has(intro.resource.resource_id)}
                  onToggleComplete={(id, completed) => markAsCompleted(id, null, completed)}
                  backTo={readerBackTo}
                />
              ) : (
                <IntroManualTile intro={intro} locked={isResourceLockedForUser(tier, 'Intro')} />
              )}
            </div>
          </div>
        )}

        {SUBJECT_CATEGORY_ORDER.filter((catKey) => catKey !== 'Intro').map((catKey) => {
          const items = byCategory[catKey] || [];
          if (items.length === 0) return null;
          return (
            <div key={catKey} style={{ marginBottom: '1.5rem' }}>
              <h4 style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700, marginBottom: '0.75rem', textTransform: 'uppercase' }}>{SUBJECT_CATEGORY_LABELS[catKey]}</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: '0.85rem' }}>
                {items.map((res) => (
                  <ResourceTile
                    key={res.id || res.resource_id}
                    resource={res}
                    examName={examName}
                    locked={isResourceLockedForUser(tier, catKey)}
                    isCompleted={catKey !== 'PYQ' && completedResourceIds?.has(res.resource_id)}
                    onToggleComplete={catKey === 'PYQ' ? null : ((id, completed) => markAsCompleted(id, resolveSubjectForTitle(res.title, res.category).key, completed))}
                    backTo={readerBackTo}
                  />
                ))}
              </div>
            </div>
          );
        })}

        {quizzes.length > 0 && (
          <div style={{ marginBottom: '1.1rem' }}>
            <h4 style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700, marginBottom: '0.5rem', textTransform: 'uppercase' }}>Mock Tests</h4>
            <Link
              to="/quiz-center"
              style={{
                display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.65rem 0.9rem',
                borderRadius: 0, textDecoration: 'none', color: 'inherit',
                border: '1px solid var(--border, #e2e8f0)', marginBottom: '0.5rem', background: '#fff',
                fontSize: '0.85rem', fontWeight: 'bold'
              }}
            >
              <PlayCircle size={15} color="var(--ios-olive)" style={{ flexShrink: 0 }} />
              <span>Visit Quiz Center</span>
            </Link>
          </div>
        )}
      </div>
    );
  }

  const pyqCount = byCategory.PYQ?.length || 0;
  const quizCount = quizzes.length;
  const quizLocked = !canTakeQuiz(tier, freeQuizUsed).allowed;

  const cards = BUCKETS.map(({ key, label, icon, anchor }) => ({
    label,
    icon,
    anchor,
    count: byCategory[key]?.length || 0,
    locked: isResourceLockedForUser(tier, key),
  }));

  if (splitPyqQuiz) {
    cards.push(
      { label: 'PYQs', icon: ListChecks, anchor: 'section-pyq', count: pyqCount, locked: isResourceLockedForUser(tier, 'PYQ') },
      { label: 'Mock Tests', icon: PlayCircle, anchor: 'section-mock', count: quizCount, locked: quizLocked },
    );
  } else {
    const pyqQuizCount = pyqCount + quizCount;
    if (pyqQuizCount > 0 || showEmptyCategories) {
      cards.push({
        label: 'PYQs & Quizzes', icon: ListChecks, anchor: 'section-pyq', count: pyqQuizCount,
        locked: isResourceLockedForUser(tier, 'PYQ') && quizLocked,
      });
    }
  }

  const visibleCards = showEmptyCategories ? cards : cards.filter((c) => c.count > 0);

  if (visibleCards.length === 0) {
    return <p style={{ color: '#94a3b8', fontSize: '0.85rem', padding: '0.5rem 0' }}>No preparation materials found for this exam yet.</p>;
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '0.75rem', padding: '0.75rem 0 0.25rem' }}>
      {visibleCards.map(({ label, icon: Icon, anchor, count, locked }) => {
        const empty = count === 0;
        return (
          <Link
            key={label}
            to={`/exam/${examId}#${anchor}`}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem',
              padding: '1rem 0.5rem', borderRadius: 'var(--radius-md)', border: '1px solid #e2e8f0',
              textDecoration: 'none', color: 'inherit', position: 'relative', background: empty ? '#f8fafc' : '#fff',
              opacity: empty ? 0.6 : 1,
            }}
          >
            {!empty && (
              <span style={{
                position: 'absolute', top: '0.5rem', right: '0.5rem', width: '20px', height: '20px',
                borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: locked ? '#ef4444' : '#16a34a',
              }}>
                {locked ? <Lock size={11} color="white" /> : <Unlock size={11} color="white" />}
              </span>
            )}
            <Icon size={26} color={empty ? '#94a3b8' : 'var(--ios-olive)'} />
            <span style={{ fontSize: '0.8rem', fontWeight: 700, textAlign: 'center', color: empty ? '#94a3b8' : '#0f172a' }}>{label}</span>
            <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{empty ? 'Not available yet' : `${count} ${count === 1 ? 'item' : 'items'}`}</span>
          </Link>
        );
      })}
    </div>
  );
};

export default ExamContentPreview;
