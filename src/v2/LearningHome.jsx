import { useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, ChevronLeft, ChevronRight, GraduationCap, BookOpen, Target, FileText } from 'lucide-react';
import SectionBanner from './SectionBanner';
import { GroupTile } from './ExamCard';
import { useExamCatalog, LEVELS, regionsForLevel, categoriesForLevel } from './useExamCatalog';
import { CENTRAL_EXAM_CATEGORIES } from '../lib/centralExamCategories';
import { useSeo } from '../lib/useSeo';

const FEATURES = [
  { icon: BookOpen, title: 'Comprehensive Study Material', text: 'Syllabus, notes and guides', to: null },
  { icon: Target, title: 'Exam-Focused Mock Tests', text: 'Practise in exam format', to: '/quiz-center' },
  { icon: FileText, title: 'Previous Year Papers', text: 'Solve real past papers', to: '/pyq-center' },
];

function Row({ level, items, loading, buildTo, imageCategory }) {
  const trackRef = useRef(null);
  const scroll = (dir) => trackRef.current?.scrollBy({ left: dir * 320, behavior: 'smooth' });
  const meta = LEVELS[level];

  return (
    <section className="v2-row" aria-label={meta.label}>
      <div className="v2-row-head">
        <h2>{meta.label}</h2>
        <div className="v2-row-actions">
          <Link to={`/v2/learning/${level}`} className="v2-link">View all</Link>
          <button type="button" className="v2-arrow" onClick={() => scroll(-1)} aria-label={`Scroll ${meta.label} left`}><ChevronLeft size={18} /></button>
          <button type="button" className="v2-arrow" onClick={() => scroll(1)} aria-label={`Scroll ${meta.label} right`}><ChevronRight size={18} /></button>
        </div>
      </div>
      <div className="v2-row-track" ref={trackRef}>
        {loading && Array.from({ length: 6 }).map((_, i) => <div key={i} className="v2-tile v2-skeleton" />)}
        {!loading && items.length === 0 && <p className="v2-empty">No exams listed yet.</p>}
        {!loading && items.map((it) => (
          <GroupTile key={it.key} to={buildTo(it)} name={it.name} count={it.count} imageCategory={imageCategory ? it.name : null} />
        ))}
      </div>
    </section>
  );
}

export default function LearningHome() {
  useSeo({ noindex: true });
  const navigate = useNavigate();
  const { catalog, loading, error } = useExamCatalog();
  const [query, setQuery] = useState('');

  const central = useMemo(
    () => categoriesForLevel(catalog, 'central', CENTRAL_EXAM_CATEGORIES).map((c) => ({ key: c.name, ...c })),
    [catalog]
  );
  const states = useMemo(() => regionsForLevel(catalog, 'state').map((r) => ({ key: r.id, ...r })), [catalog]);
  const uts = useMemo(() => regionsForLevel(catalog, 'ut').map((r) => ({ key: r.id, ...r })), [catalog]);

  const onSearch = (e) => {
    e.preventDefault();
    const q = query.trim();
    navigate(q ? `/v2/learning/all?q=${encodeURIComponent(q)}` : '/v2/learning/all');
  };

  return (
    <>
      <SectionBanner
        icon={GraduationCap}
        title="Learning Center"
        subtitle="Quality study material, expert guidance and complete support for every competitive exam — all at one place."
        crumbs={[{ label: 'Home', to: '/v2' }, { label: 'Learning' }]}
      >
        <form className="v2-search" onSubmit={onSearch} role="search">
          <Search size={20} aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search exams, conducting bodies, categories…"
            aria-label="Search exams"
          />
          <button type="submit">Search</button>
        </form>
      </SectionBanner>

      <div className="v2-container">
        <div className="v2-features">
          {FEATURES.map((f) => {
            const Icon = f.icon;
            const body = (
              <>
                <span className="v2-feature-icon"><Icon size={22} /></span>
                <span><strong>{f.title}</strong><small>{f.text}</small></span>
              </>
            );
            return f.to
              ? <Link key={f.title} to={f.to} className="v2-feature">{body}</Link>
              : <div key={f.title} className="v2-feature">{body}</div>;
          })}
        </div>

        {error && <p className="v2-error" role="alert">{error}</p>}

        <Row
          level="central"
          items={central}
          loading={loading}
          imageCategory
          buildTo={(it) => `/v2/learning/central?category=${encodeURIComponent(it.name)}`}
        />
        <Row
          level="state"
          items={states}
          loading={loading}
          buildTo={(it) => `/v2/learning/state?region=${it.id}`}
        />
        <Row
          level="ut"
          items={uts}
          loading={loading}
          buildTo={(it) => `/v2/learning/ut?region=${it.id}`}
        />
      </div>
    </>
  );
}
