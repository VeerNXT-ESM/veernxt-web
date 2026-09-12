import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FileText, BookOpen, ScrollText, ListChecks, PlayCircle, Lock, Unlock, RefreshCw, ArrowRight, CheckCircle2, Check, X } from 'lucide-react';
import { isResourceLockedForUser, canTakeQuiz } from '../lib/subscriptionAccess';
import { useExamContent } from '../hooks/useExamContent';
import { cleanContentTitle } from '../lib/contentTitle';
import { resolveSubjectForTitle, getFamilyHex, getSubjectThumbnailImage } from '../lib/thumbnailTaxonomy';

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

function ResourceRow({ resource, examName, locked, isCompleted, onToggleComplete }) {
  return (
    <div
      style={{
        display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.65rem 0.9rem',
        borderRadius: 'var(--radius-sm, 10px)',
        border: isCompleted ? '1px solid #bbf7d0' : '1px solid var(--border, #e2e8f0)',
        marginBottom: '0.5rem', background: isCompleted ? '#f0fdf4' : '#fff',
      }}
    >
      {onToggleComplete && (
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
      <FileText size={15} color={isCompleted ? "#16a34a" : "var(--ios-olive)"} style={{ flexShrink: 0 }} />
      <Link
        to={`/reader/${resource.resource_id}`}
        style={{ flex: 1, fontSize: '0.85rem', textDecoration: 'none', color: 'inherit', fontWeight: isCompleted ? 600 : 400 }}
      >
        {cleanContentTitle(resource.title, examName)}
      </Link>
      {isCompleted && <span style={{ fontSize: '0.7rem', color: '#16a34a', fontWeight: 700, background: '#dcfce7', padding: '0.15rem 0.5rem', borderRadius: '999px' }}>Done</span>}
      {locked ? <Lock size={13} color="#ef4444" /> : <Unlock size={13} color="#16a34a" />}
    </div>
  );
}

// One thumbnail per resource (not per subject) for `variant="subjects"` —
// colour/art comes from resolveSubjectForTitle, same taxonomy the old
// subject-tile grouping used, just applied per-document instead of once
// per subject so a Guide and its sibling Précis each get their own tile
// and label instead of sharing one tile captioned "Guide • Précis".
function ResourceTile({ resource, examName, locked, isCompleted, onToggleComplete }) {
  const subject = resolveSubjectForTitle(resource.title);
  const bg = getFamilyHex(subject.family);
  const image = getSubjectThumbnailImage(subject.key);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
      <Link to={`/reader/${resource.resource_id}`} style={{ position: 'relative', display: 'block', textDecoration: 'none' }}>
        <span
          style={{
            aspectRatio: '3 / 4', borderRadius: '10px', display: 'flex', alignItems: 'flex-end',
            padding: '0.5rem', fontWeight: 800, fontSize: '0.62rem', color: '#fff', textTransform: 'uppercase',
            textShadow: image ? '0 1px 4px rgba(0,0,0,0.65)' : 'none',
            background: image ? `linear-gradient(160deg, ${bg}40 0%, ${bg}59 100%), url("${image}")` : `linear-gradient(160deg, ${bg} 0%, ${bg}cc 100%)`,
            backgroundSize: image ? 'cover' : undefined,
            backgroundPosition: image ? 'center' : undefined,
            boxShadow: isCompleted ? '0 0 0 3px #16a34a' : 'none',
          }}
        >
          {subject.label}
        </span>
        <span style={{
          position: 'absolute', top: '0.4rem', right: '0.4rem', width: '20px', height: '20px', borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center', background: locked ? '#ef4444' : '#16a34a',
        }}>
          {locked ? <Lock size={11} color="white" /> : <Unlock size={11} color="white" />}
        </span>
      </Link>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.4rem' }}>
        <button
          type="button"
          onClick={() => onToggleComplete(resource.resource_id, !isCompleted)}
          title={isCompleted ? 'Marked as Complete — click to undo' : 'Mark as Complete'}
          style={{
            background: isCompleted ? '#16a34a' : 'transparent',
            border: isCompleted ? 'none' : '2px solid #cbd5e1',
            borderRadius: '50%', width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', padding: 0, flexShrink: 0, marginTop: '0.1rem',
          }}
        >
          {isCompleted && <Check size={11} color="#fff" strokeWidth={3} />}
        </button>
        <span style={{ fontSize: '0.74rem', fontWeight: isCompleted ? 600 : 500, lineHeight: 1.3, color: isCompleted ? '#16a34a' : '#0f172a' }}>
          {cleanContentTitle(resource.title, examName)}
        </span>
      </div>
    </div>
  );
}

// Book-tile look for a manual (docx-uploaded, HTML-body) Introduction --
// same cover/lock-badge/title layout as ResourceTile above so Intro sits
// in the grid looking like just another book, but since there's no
// resource_id to route to /reader/:id, clicking it opens the content in
// a lightweight in-page overlay instead.
function IntroManualTile({ intro, locked }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
        <div onClick={() => setOpen(true)} style={{ position: 'relative', display: 'block', cursor: 'pointer' }}>
          <span
            style={{
              aspectRatio: '3 / 4', borderRadius: '10px', display: 'flex', alignItems: 'flex-end',
              padding: '0.5rem', fontWeight: 800, fontSize: '0.62rem', color: '#fff', textTransform: 'uppercase',
              background: 'linear-gradient(160deg, var(--ios-olive) 0%, #33481f 100%)',
            }}
          >
            Intro
          </span>
          <span style={{
            position: 'absolute', top: '0.4rem', right: '0.4rem', width: '20px', height: '20px', borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center', background: locked ? '#ef4444' : '#16a34a',
          }}>
            {locked ? <Lock size={11} color="white" /> : <Unlock size={11} color="white" />}
          </span>
        </div>
        <span style={{ fontSize: '0.74rem', fontWeight: 500, lineHeight: 1.3, color: '#0f172a' }}>
          {intro.title || 'Introduction'}
        </span>
      </div>

      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ background: '#fff', borderRadius: '14px', width: 'min(760px, 100%)', maxHeight: '85vh', overflowY: 'auto', padding: '2rem', position: 'relative' }}
          >
            <button
              onClick={() => setOpen(false)}
              style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b' }}
            >
              <X size={20} />
            </button>
            {intro.title && <h3 style={{ marginTop: 0, color: 'var(--ios-olive)' }}>{intro.title}</h3>}
            <div className="intro-manual-body" style={{ fontSize: '0.95rem', color: '#334155' }} dangerouslySetInnerHTML={{ __html: intro.body || '' }} />
            <style dangerouslySetInnerHTML={{ __html: `
              .intro-manual-body img { max-width: 100%; height: auto; border-radius: 8px; display: block; margin: 0.75rem 0; }
              .intro-manual-body p { margin: 0 0 0.75rem; }
              .intro-manual-body h1, .intro-manual-body h2, .intro-manual-body h3, .intro-manual-body h4 { color: var(--ios-olive); margin: 1rem 0 0.5rem; }
              .intro-manual-body table { width: 100%; border-collapse: collapse; margin: 0.75rem 0; }
              .intro-manual-body th, .intro-manual-body td { border: 1px solid var(--border, #e2e8f0); padding: 0.5rem 0.65rem; text-align: left; }
            `}} />
          </div>
        </div>
      )}
    </>
  );
}

function QuizRow({ quiz, examName, locked }) {
  return (
    <Link
      to={`/quiz/${quiz.id}`}
      style={{
        display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.65rem 0.9rem',
        borderRadius: 'var(--radius-sm, 10px)', textDecoration: 'none', color: 'inherit',
        border: '1px solid var(--border, #e2e8f0)', marginBottom: '0.5rem', background: '#fff',
      }}
    >
      <PlayCircle size={15} color="var(--ios-olive)" style={{ flexShrink: 0 }} />
      <span style={{ flex: 1, fontSize: '0.85rem' }}>{cleanContentTitle(quiz.title, examName)}</span>
      {locked ? <Lock size={13} color="#ef4444" /> : <Unlock size={13} color="#16a34a" />}
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
const ExamContentPreview = ({ examId, examName, careerTrack, tier, freeQuizUsed, splitPyqQuiz = false, showEmptyCategories = false, variant = 'tiles' }) => {
  const { byCategory, quizzes, intro, completedResourceIds, markAsCompleted, loading, error } = useExamContent(examName, careerTrack, examId);

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
    const hasAnything = LIST_SECTIONS.some(({ key }) => (byCategory[key]?.length || 0) > 0) || quizzes.length > 0;

    if (!hasAnything) {
      return <p style={{ color: '#94a3b8', fontSize: '0.85rem', padding: '0.5rem 0' }}>No preparation materials found for this exam yet.</p>;
    }

    return (
      <div style={{ padding: '0.5rem 0 0' }}>
        {LIST_SECTIONS.map(({ key, label }) => {
          const items = byCategory[key] || [];
          if (items.length === 0) return null;
          return (
            <div key={key} style={{ marginBottom: '1.1rem' }}>
              <h4 style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700, marginBottom: '0.5rem', textTransform: 'uppercase' }}>{label}</h4>
              {items.map((res) => (
                <ResourceRow
                  key={res.id || res.resource_id}
                  resource={res}
                  examName={examName}
                  locked={isResourceLockedForUser(tier, res.category)}
                  isCompleted={completedResourceIds?.has(res.resource_id)}
                  onToggleComplete={(id, completed) => markAsCompleted(id, null, completed)}
                />
              ))}
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

        <Link
          to="/subscribe"
          style={{
            display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.85rem 1rem',
            borderRadius: 'var(--radius-md, 12px)', border: '1px solid var(--border, #e2e8f0)',
            textDecoration: 'none', color: 'inherit', background: '#f8fafc',
          }}
        >
          <BookOpen size={18} color="var(--ios-olive)" />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>Unlock the full library</div>
            <div style={{ fontSize: '0.75rem', color: '#888' }}>Précis, PYQs, and unlimited mock tests for every matched exam.</div>
          </div>
          <ArrowRight size={16} />
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
                    isCompleted={completedResourceIds?.has(res.resource_id)}
                    onToggleComplete={(id, completed) => markAsCompleted(id, resolveSubjectForTitle(res.title).key, completed)}
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
