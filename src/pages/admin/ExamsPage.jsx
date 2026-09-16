import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import Select from '../../components/ui/Select';
import ExamThumbnail from './ExamThumbnail';
import ExamEditorPanel from './ExamEditorPanel';
import ExamResourcesPanel from './ExamResourcesPanel';
import { useDebounced, StatusBadge } from './lcShared';
import { Search, Plus, ChevronLeft, ChevronRight, ShieldAlert } from 'lucide-react';

// Deliberately smaller than the shared lcShared.PAGE_SIZE (20, used by
// AdminJobs.jsx etc.) — the dense card-row layout here reads better with
// fewer rows per page, not a site-wide pagination change.
const EXAMS_PAGE_SIZE = 10;

// No "All Levels" — Level is a required drill-down step, not an optional
// filter, so the exam list never has to render the whole 1,500+ row
// catalog unscoped.
const LEVELS = [
  { value: 'central', label: 'Central' },
  { value: 'state', label: 'State' },
  { value: 'ut', label: 'UT' },
];
const LEVEL_LABELS = { central: 'Central', state: 'State', ut: 'UT' };

/**
 * The Exams workspace — a persistent three-column master-detail-summary
 * layout (Exam List | Basic Information | Resources). Selecting a row never
 * navigates away; the editor and resources panel beside it just update in
 * place. Dense by design: pagination instead of an internal scrollbar on
 * the list, and all three columns stretch to the same height.
 */
const ExamsPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const [level, setLevel] = useState('central');
  const [category, setCategory] = useState('');
  const [bodyId, setBodyId] = useState('');
  const [regionId, setRegionId] = useState('');

  // Whole lc_exams catalog, fetched once — Category/Conducting Body options
  // are derived from it client-side, cascaded to whichever Level/Category
  // is currently selected (conducting bodies aren't region-scoped in the
  // schema, so this is re-derived from live data rather than assumed static).
  const [catalog, setCatalog] = useState([]);
  useEffect(() => {
    (async () => {
      let allExams = [];
      for (let from = 0; ; from += 1000) {
        const { data } = await supabase
          .from('lc_exams')
          .select('id,name,category,conducting_body_id,conducting_body:lc_conducting_bodies(id,name),region:lc_regions(id,name,level)')
          .range(from, from + 999);
        allExams = allExams.concat(data || []);
        if (!data || data.length < 1000) break;
      }
      setCatalog(allExams);
    })();
  }, []);

  // All regions, fetched once — same table/shape ExamEditorPanel.jsx's own
  // Level -> State/UT cascade already uses, so the two stay consistent.
  const [regions, setRegions] = useState([]);
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('lc_regions').select('id,name,level').order('name');
      setRegions(data || []);
    })();
  }, []);

  const levelExams = useMemo(() => catalog.filter((exam) => exam.region?.level === level), [catalog, level]);

  // State/UT filter only makes sense once Level narrows to 'state' or 'ut' —
  // Central has exactly one fixed region, same reasoning ExamEditorPanel.jsx
  // uses to hide its own State/UT field for Central-level exams.
  const regionOptions = useMemo(() => regions.filter((r) => r.level === level), [regions, level]);

  const categoryOptions = useMemo(() => {
    const seen = new Set();
    for (const exam of levelExams) {
      const c = (exam.category || '').trim();
      if (c) seen.add(c);
    }
    return [...seen].sort((a, b) => a.localeCompare(b));
  }, [levelExams]);

  const bodyOptions = useMemo(() => {
    const pool = category
      ? levelExams.filter((exam) => (exam.category || '').trim() === category)
      : levelExams;
    const seen = new Map();
    for (const exam of pool) {
      if (exam.conducting_body && !seen.has(exam.conducting_body.id)) seen.set(exam.conducting_body.id, exam.conducting_body);
    }
    return [...seen.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [levelExams, category]);

  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounced(search);
  const [page, setPage] = useState(1);
  const [exams, setExams] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const [selectedExamId, setSelectedExamId] = useState(searchParams.get('exam') || null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);

  useEffect(() => { setPage(1); }, [debouncedSearch, bodyId, category, level, regionId]);

  // Same out-of-order-response guard used elsewhere in this CMS.
  const requestIdRef = useRef(0);

  const fetchExams = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    try {
      let query = supabase
        .from('lc_exams')
        .select('id,name,category,status,accent_color,thumbnail_subject,conducting_body:lc_conducting_bodies(id,name),region:lc_regions!inner(id,name,level)', { count: 'exact' })
        .eq('region.level', level);

      if (debouncedSearch) query = query.ilike('name', `%${debouncedSearch}%`);
      if (bodyId) query = query.eq('conducting_body_id', bodyId);
      if (category) query = query.eq('category', category);
      if (regionId) query = query.eq('region_id', regionId);

      const from = (page - 1) * EXAMS_PAGE_SIZE;
      query = query.order('name', { ascending: true }).range(from, from + EXAMS_PAGE_SIZE - 1);

      const { data, count, error } = await query;
      if (error) throw error;
      if (requestId !== requestIdRef.current) return;

      setExams(data || []);
      setTotal(count || 0);
    } catch (err) {
      console.error('Error fetching exams:', err);
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }, [debouncedSearch, bodyId, category, level, regionId, page]);

  useEffect(() => { fetchExams(); }, [fetchExams]);

  const totalPages = Math.max(1, Math.ceil(total / EXAMS_PAGE_SIZE));

  const selectExam = (id) => {
    setIsCreatingNew(false);
    setSelectedExamId(id);
    setSearchParams(id ? { exam: id } : {}, { replace: true });
  };

  const startNewExam = () => {
    setIsCreatingNew(true);
    setSelectedExamId(null);
    setSearchParams({}, { replace: true });
  };

  const chooseLevel = (v) => { setLevel(v); setCategory(''); setBodyId(''); setRegionId(''); };
  const chooseCategory = (v) => { setCategory(v); setBodyId(''); };

  return (
    <div>
      <div className="lc-filter-bar-single">
        <div className="lc-filter-field lc-filter-search">
          <label>Search Exam Name</label>
          <div className="lc-search-input-wrapper">
            <Search size={16} />
            <input type="text" placeholder="e.g. AFCAT, CDS, NDA..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>
        <div className="lc-filter-field">
          <label>Category</label>
          <Select searchable placeholder="All Categories" value={category} onChange={(e) => chooseCategory(e.target.value)} options={[{ value: '', label: 'All Categories' }, ...categoryOptions.map((c) => ({ value: c, label: c }))]} />
        </div>
        <div className="lc-filter-field">
          <label>Conducting Body</label>
          <Select searchable placeholder={category ? `Bodies for ${category} (${bodyOptions.length})` : 'All Conducting Bodies'} value={bodyId} onChange={(e) => setBodyId(e.target.value)} options={[{ value: '', label: 'All Conducting Bodies' }, ...bodyOptions.map((b) => ({ value: b.id, label: b.name }))]} />
        </div>
        <div className="lc-filter-field">
          <label>Level</label>
          <Select value={level} onChange={(e) => chooseLevel(e.target.value)} options={LEVELS} />
        </div>
        {level !== 'central' && (
          <div className="lc-filter-field">
            <label>{level === 'state' ? 'State' : 'UT'}</label>
            <Select
              searchable
              placeholder={`All ${level === 'state' ? 'States' : 'UTs'}`}
              value={regionId}
              onChange={(e) => setRegionId(e.target.value)}
              options={[{ value: '', label: `All ${level === 'state' ? 'States' : 'UTs'}` }, ...regionOptions.map((r) => ({ value: r.id, label: r.name }))]}
            />
          </div>
        )}
        <button className="lc-btn primary" onClick={startNewExam}><Plus size={16} /> Add Exam</button>
      </div>

      <div className="lc-exams-workspace">
        <div className="lc-exams-list-col">
          <div className="lc-card-row-header" style={{ marginBottom: '0.6rem' }}>
            <h3 style={{ margin: 0 }}>Exams ({total})</h3>
            <span className="lc-muted-note">Sort by: Name A-Z</span>
          </div>

          <div className="lc-exam-row-list">
            {exams.map((exam) => (
              <div key={exam.id} className={`lc-exam-row ${selectedExamId === exam.id ? 'selected' : ''}`} onClick={() => selectExam(exam.id)}>
                <ExamThumbnail conductingBodyName={exam.conducting_body?.name} thumbnailSubject={exam.thumbnail_subject} accentColor={exam.accent_color} size="sm" />
                <div className="lc-exam-row-body">
                  <span className="lc-exam-row-name lc-truncate" title={exam.name}>{exam.name}</span>
                  <span className="lc-exam-row-meta lc-truncate">{exam.conducting_body?.name || '—'}</span>
                  <span className="lc-exam-row-meta">{[exam.category, LEVEL_LABELS[exam.region?.level]].filter(Boolean).join(' • ')}</span>
                </div>
                <span className="lc-exam-row-badge"><StatusBadge status={exam.status} /></span>
              </div>
            ))}

            {loading && <div className="lc-loading-state">Loading exams…</div>}
            {!loading && exams.length === 0 && (
              <div className="lc-empty-state"><ShieldAlert size={22} style={{ marginBottom: '0.5rem' }} /><p>No exams match the current filters.</p></div>
            )}
          </div>

          {!loading && exams.length > 0 && (
            <div className="lc-pagination-bar">
              <span className="lc-pagination-info">{total} exam{total === 1 ? '' : 's'}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <button className="lc-pagination-btn" disabled={page === 1} onClick={() => setPage((p) => p - 1)} title="Previous page"><ChevronLeft size={14} /></button>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem', color: 'var(--admin-text-muted)' }}>
                  <span>Page</span>
                  <select
                    value={page}
                    onChange={(e) => setPage(Number(e.target.value))}
                    className="lc-pagination-select"
                  >
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                      <option key={p} value={p}>
                        {p} of {totalPages}
                      </option>
                    ))}
                  </select>
                </div>
                <button className="lc-pagination-btn" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)} title="Next page"><ChevronRight size={14} /></button>
              </div>
            </div>
          )}
        </div>

        <div className="lc-exams-editor-col">
          {(selectedExamId || isCreatingNew) ? (
            <ExamEditorPanel
              key={selectedExamId || 'new'}
              examId={selectedExamId}
              onCreated={(newExam) => { selectExam(newExam.id); fetchExams(); }}
              onSaved={fetchExams}
              onDeleted={(deletedId) => {
                setCatalog((prev) => prev.filter((e) => e.id !== deletedId));
                selectExam(null);
                fetchExams();
              }}
            />
          ) : (
            <div className="lc-card lc-empty-editor" style={{ flex: 1 }}>
              <p className="lc-muted-note">Select an exam from the list to view and edit it, or click "Add Exam" to create one.</p>
            </div>
          )}
        </div>

        <div className="lc-exams-rail-col">
          <ExamResourcesPanel examId={selectedExamId} />
        </div>
      </div>
    </div>
  );
};

export default ExamsPage;
