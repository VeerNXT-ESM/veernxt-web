import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FileText, BookOpen, ScrollText, ListChecks, PlayCircle, Lock, Unlock, RefreshCw, ArrowRight } from 'lucide-react';
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

// `variant="subjects"` groups the same resources one level differently:
// by subject (English, Reasoning, ...) resolved per-resource from its
// title via the shared thumbnail taxonomy, rather than by category — a
// subject usually has both a Guide and a Précis, so category-first lists
// split the same subject's material across two lists.
const SUBJECT_CATEGORY_ORDER = ['Intro', 'Guide', 'Precis', 'PYQ'];
const SUBJECT_CATEGORY_LABELS = { Intro: 'Intro', Guide: 'Guide', Precis: 'Précis', PYQ: 'PYQ' };

function buildSubjectGroups(byCategory) {
  const groups = new Map();
  for (const catKey of SUBJECT_CATEGORY_ORDER) {
    for (const res of byCategory[catKey] || []) {
      const subject = resolveSubjectForTitle(res.title);
      if (!groups.has(subject.key)) groups.set(subject.key, { ...subject, categories: new Map() });
      const group = groups.get(subject.key);
      if (!group.categories.has(catKey)) group.categories.set(catKey, []);
      group.categories.get(catKey).push(res);
    }
  }
  return [...groups.values()];
}

function ResourceRow({ resource, examName, locked }) {
  return (
    <Link
      to={`/reader/${resource.resource_id}`}
      style={{
        display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.65rem 0.9rem',
        borderRadius: 'var(--radius-sm, 10px)', textDecoration: 'none', color: 'inherit',
        border: '1px solid var(--border, #e2e8f0)', marginBottom: '0.5rem', background: '#fff',
      }}
    >
      <FileText size={15} color="var(--ios-olive)" style={{ flexShrink: 0 }} />
      <span style={{ flex: 1, fontSize: '0.85rem' }}>{cleanContentTitle(resource.title, examName)}</span>
      {locked ? <Lock size={13} color="#ef4444" /> : <Unlock size={13} color="#16a34a" />}
    </Link>
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
  const { byCategory, quizzes, intro, loading, error } = useExamContent(examName, careerTrack, examId);
  const [openSubjectKey, setOpenSubjectKey] = useState(null);

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
                <ResourceRow key={res.id} resource={res} examName={examName} locked={isResourceLockedForUser(tier, res.category)} />
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
    const quizAccess = canTakeQuiz(tier, freeQuizUsed);
    const subjectGroups = buildSubjectGroups(byCategory);
    const openGroup = subjectGroups.find((g) => g.key === openSubjectKey) || null;
    const hasAnything = subjectGroups.length > 0 || quizzes.length > 0 || !!intro;

    if (!hasAnything) {
      return <p style={{ color: '#94a3b8', fontSize: '0.85rem', padding: '0.5rem 0' }}>No preparation materials found for this exam yet.</p>;
    }

    return (
      <div style={{ padding: '0.5rem 0 0' }}>
        {intro && (
          <div id="section-intro" style={{ marginBottom: '1.1rem', scrollMarginTop: '1.5rem' }}>
            <h4 style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700, marginBottom: '0.5rem', textTransform: 'uppercase' }}>Introduction</h4>
            {intro.source === 'auto' ? (
              <ResourceRow resource={intro.resource} examName={examName} locked={false} />
            ) : (
              <div style={{ padding: '0.9rem 1rem', borderRadius: 'var(--radius-sm, 10px)', border: '1px solid var(--border, #e2e8f0)', background: '#fff' }}>
                {intro.title && <h5 style={{ margin: '0 0 0.5rem', fontSize: '0.9rem' }}>{intro.title}</h5>}
                {intro.body && <p style={{ margin: 0, fontSize: '0.85rem', color: '#334155', whiteSpace: 'pre-wrap' }}>{intro.body}</p>}
              </div>
            )}
          </div>
        )}

        {subjectGroups.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: '0.75rem', marginBottom: '1.1rem' }}>
            {subjectGroups.map((group) => {
              const bg = getFamilyHex(group.family);
              const image = getSubjectThumbnailImage(group.key);
              const active = openSubjectKey === group.key;
              const availableCats = SUBJECT_CATEGORY_ORDER.filter((c) => group.categories.has(c));
              return (
                <button
                  key={group.key}
                  type="button"
                  onClick={() => setOpenSubjectKey(active ? null : group.key)}
                  style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left', font: 'inherit' }}
                >
                  <span
                    style={{
                      aspectRatio: '3 / 4', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      textAlign: 'center', padding: '0.6rem', fontWeight: 800, fontSize: '0.72rem', color: '#fff',
                      textShadow: image ? '0 1px 4px rgba(0,0,0,0.65)' : 'none',
                      background: image ? `linear-gradient(160deg, ${bg}40 0%, ${bg}59 100%), url("${image}")` : `linear-gradient(160deg, ${bg} 0%, ${bg}cc 100%)`,
                      backgroundSize: image ? 'cover' : undefined,
                      backgroundPosition: image ? 'center' : undefined,
                      boxShadow: active ? '0 0 0 3px var(--ios-olive, #4b6b32)' : 'none',
                    }}
                  >
                    {group.label.toUpperCase()}
                  </span>
                  <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#0f172a' }}>{group.label}</span>
                  <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>{availableCats.map((c) => SUBJECT_CATEGORY_LABELS[c]).join(' • ')}</span>
                </button>
              );
            })}
          </div>
        )}

        {openGroup && (
          <div style={{ marginBottom: '1.1rem', borderTop: '1px solid var(--border, #e2e8f0)', paddingTop: '1rem' }}>
            <h4 style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.65rem' }}>{openGroup.label}</h4>
            {SUBJECT_CATEGORY_ORDER.filter((c) => openGroup.categories.has(c)).map((catKey) => (
              <div key={catKey} style={{ marginBottom: '0.85rem' }}>
                <h5 style={{ fontSize: '0.68rem', color: '#94a3b8', fontWeight: 700, marginBottom: '0.4rem', textTransform: 'uppercase' }}>{SUBJECT_CATEGORY_LABELS[catKey]}</h5>
                {openGroup.categories.get(catKey).map((res) => (
                  <ResourceRow key={res.id} resource={res} examName={examName} locked={isResourceLockedForUser(tier, catKey)} />
                ))}
              </div>
            ))}
          </div>
        )}

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
