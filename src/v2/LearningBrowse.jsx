import { useMemo, useState } from 'react';
import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom';
import { Search, SlidersHorizontal, X, GraduationCap } from 'lucide-react';
import SectionBanner from './SectionBanner';
import { ExamCard } from './ExamCard';
import { useExamCatalog, LEVELS, regionsForLevel, categoriesForLevel } from './useExamCatalog';
import { CENTRAL_EXAM_CATEGORIES } from '../lib/centralExamCategories';

const PAGE_SIZE = 60;

/**
 * One browse screen for all three levels, driven by the URL:
 *   /v2/learning/central?category=SSC   side filter = Central categories
 *   /v2/learning/state?region=<id>      side filter = states
 *   /v2/learning/ut?region=<id>         side filter = union territories
 *   /v2/learning/all?q=...              search across every level; side filter = level
 */
export default function LearningBrowse() {
  const { level } = useParams();
  const [params, setParams] = useSearchParams();
  const { catalog, loading, error } = useExamCatalog();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [visible, setVisible] = useState(PAGE_SIZE);

  const isAll = level === 'all';
  const meta = LEVELS[level];
  const category = params.get('category') || '';
  const regionId = params.get('region') || '';
  const q = params.get('q') || '';

  const setParam = (key, value) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value); else next.delete(key);
    setParams(next, { replace: true });
    setVisible(PAGE_SIZE);
    setFiltersOpen(false);
  };

  const levelExams = useMemo(
    () => (isAll ? catalog.filter((e) => e.region) : catalog.filter((e) => e.region?.level === level)),
    [catalog, level, isAll]
  );

  const sideItems = useMemo(() => {
    if (level === 'central') return categoriesForLevel(catalog, 'central', CENTRAL_EXAM_CATEGORIES).map((c) => ({ id: c.name, name: c.name, count: c.count }));
    if (level === 'state' || level === 'ut') return regionsForLevel(catalog, level);
    return [];
  }, [catalog, level]);

  const results = useMemo(() => {
    let pool = levelExams;
    if (level === 'central' && category) pool = pool.filter((e) => (e.category || '').trim() === category);
    if ((level === 'state' || level === 'ut') && regionId) pool = pool.filter((e) => e.region.id === regionId);
    const text = q.trim().toLowerCase();
    if (text) {
      pool = pool.filter((e) =>
        e.name.toLowerCase().includes(text) ||
        (e.conducting_body?.name || '').toLowerCase().includes(text) ||
        (e.category || '').toLowerCase().includes(text) ||
        (e.region?.name || '').toLowerCase().includes(text));
    }
    return pool.slice().sort((a, b) => a.name.localeCompare(b.name));
  }, [levelExams, level, category, regionId, q]);

  if (!isAll && !meta) return <Navigate to="/v2/learning" replace />;

  const selectedId = level === 'central' ? category : regionId;
  const selectedName = sideItems.find((i) => i.id === selectedId)?.name;
  const title = isAll ? 'All Exams' : meta.label;
  const crumbs = [
    { label: 'Home', to: '/v2' },
    { label: 'Learning', to: '/v2/learning' },
    { label: title, to: selectedName ? `/v2/learning/${level}` : undefined },
    ...(selectedName ? [{ label: selectedName }] : []),
  ];

  const sideTitle = isAll ? 'Exam levels' : meta.filterTitle;
  const filterParam = level === 'central' ? 'category' : 'region';

  const sidebar = (
    <aside className={`v2-side ${filtersOpen ? 'open' : ''}`} aria-label={sideTitle}>
      <div className="v2-side-head">
        <h2>{sideTitle}</h2>
        <button type="button" className="v2-side-close" onClick={() => setFiltersOpen(false)} aria-label="Close filters"><X size={18} /></button>
      </div>
      <ul>
        {isAll
          ? Object.values(LEVELS).map((l) => (
              <li key={l.key}><Link to={`/v2/learning/${l.key}`}>{l.label}</Link></li>
            ))
          : (
            <>
              <li>
                <button type="button" className={!selectedId ? 'active' : ''} onClick={() => setParam(filterParam, '')}>
                  All <span>{levelExams.length}</span>
                </button>
              </li>
              {sideItems.map((i) => (
                <li key={i.id}>
                  <button type="button" className={selectedId === i.id ? 'active' : ''} onClick={() => setParam(filterParam, i.id)}>
                    {i.name} <span>{i.count}</span>
                  </button>
                </li>
              ))}
            </>
          )}
      </ul>
    </aside>
  );

  return (
    <>
      <SectionBanner
        icon={GraduationCap}
        title={selectedName ? `${selectedName} — ${title}` : title}
        subtitle={isAll ? (q ? `Results for “${q}”` : 'Every exam in the catalog.') : `Browse ${meta.short.toLowerCase()} exams by ${filterParam === 'category' ? 'category' : meta.filterTitle.toLowerCase().replace(/s$/, '')}.`}
        crumbs={crumbs}
      >
        <div className="v2-level-tabs" role="tablist">
          {Object.values(LEVELS).map((l) => (
            <Link key={l.key} to={`/v2/learning/${l.key}`} role="tab" aria-selected={level === l.key} className={level === l.key ? 'active' : ''}>
              {l.short}
            </Link>
          ))}
        </div>
      </SectionBanner>

      <div className="v2-container v2-browse">
        {sidebar}
        {filtersOpen && <div className="v2-side-scrim" onClick={() => setFiltersOpen(false)} role="presentation" />}

        <div className="v2-results">
          <div className="v2-results-bar">
            <button type="button" className="v2-filter-btn" onClick={() => setFiltersOpen(true)}>
              <SlidersHorizontal size={16} /> Filters
            </button>
            <div className="v2-inline-search">
              <Search size={18} aria-hidden="true" />
              <input
                type="search"
                value={q}
                onChange={(e) => setParam('q', e.target.value)}
                placeholder="Search within these exams…"
                aria-label="Search within results"
              />
            </div>
            <span className="v2-count">{loading ? 'Loading…' : `${results.length} ${results.length === 1 ? 'exam' : 'exams'}`}</span>
          </div>

          {error && <p className="v2-error" role="alert">{error}</p>}
          {!loading && !error && results.length === 0 && <p className="v2-empty">No exams match these filters.</p>}

          <div className="v2-exam-grid">
            {loading && Array.from({ length: 9 }).map((_, i) => <div key={i} className="v2-exam-card v2-skeleton" />)}
            {results.slice(0, visible).map((e) => (
              <ExamCard key={e.id} exam={e} from={`/v2/learning/${level}`} />
            ))}
          </div>

          {results.length > visible && (
            <button type="button" className="v2-more" onClick={() => setVisible((v) => v + PAGE_SIZE)}>
              Show more ({results.length - visible} remaining)
            </button>
          )}
        </div>
      </div>
    </>
  );
}
