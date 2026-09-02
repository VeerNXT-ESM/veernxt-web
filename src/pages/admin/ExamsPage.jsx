import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import Select from '../../components/ui/Select';
import ExamThumbnail from './ExamThumbnail';
import ExamEditorPanel from './ExamEditorPanel';
import ExamIntroCard from './ExamIntroCard';
import ExamStatusCard from './ExamStatusCard';
import ExamSubjectsPanel from './ExamSubjectsPanel';
import { PAGE_SIZE, useDebounced, StatusBadge } from './lcShared';
import { Search, Plus, ChevronLeft, ChevronRight, ShieldAlert } from 'lucide-react';

const LEVELS = [
  { value: '', label: 'All Levels' },
  { value: 'central', label: 'Central' },
  { value: 'state', label: 'State' },
  { value: 'ut', label: 'UT' },
];

/**
 * The Exams workspace — a persistent three-zone master-detail-summary
 * layout (Exam List | Exam Editor | Contextual Information Rail), per the
 * client mockup ("VEERNXT - CMS Mockup Design.pdf"). Selecting a row never
 * navigates away; the editor and rail beside it just update in place.
 *
 * Filtering is a drill-down, per explicit direction (supersedes the mockup's
 * literal "Conducting Body → Region" ordering): Level (Central/State/UT) is
 * the primary filter, then State/UT within it, then Conducting Body — since
 * conducting bodies aren't region-scoped in the schema (a handful legitimately
 * span regions), the body list is re-queried from live exam data every time
 * the level/state filter changes, rather than assumed static.
 */
const ExamsPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const [level, setLevel] = useState('');
  const [regionId, setRegionId] = useState('');
  const [bodyId, setBodyId] = useState('');
  const [regionOptions, setRegionOptions] = useState([]);
  const [bodyOptions, setBodyOptions] = useState([]);

  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounced(search);
  const [page, setPage] = useState(1);
  const [exams, setExams] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const [selectedExamId, setSelectedExamId] = useState(searchParams.get('exam') || null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);

  // States/UTs available under the current level (empty when level is
  // '' or 'central' — Central has no sub-region picker).
  useEffect(() => {
    if (level !== 'state' && level !== 'ut') { setRegionOptions([]); return; }
    (async () => {
      const { data } = await supabase.from('lc_regions').select('id,name').eq('level', level).order('name');
      setRegionOptions(data || []);
    })();
  }, [level]);

  // Conducting bodies are deliberately not region-scoped in the schema (a
  // few genuinely span regions) — re-derive the live set from lc_exams for
  // whatever level/region is currently selected, rather than assume a
  // fixed body→region mapping.
  useEffect(() => {
    (async () => {
      let query = supabase.from('lc_exams').select('conducting_body_id, conducting_body:lc_conducting_bodies(id,name), region:lc_regions!inner(level)');
      if (regionId) query = query.eq('region_id', regionId);
      else if (level) query = query.eq('region.level', level);
      const { data } = await query;
      const seen = new Map();
      for (const row of data || []) {
        if (row.conducting_body && !seen.has(row.conducting_body.id)) seen.set(row.conducting_body.id, row.conducting_body);
      }
      setBodyOptions([...seen.values()].sort((a, b) => a.name.localeCompare(b.name)));
    })();
  }, [level, regionId]);

  useEffect(() => { setPage(1); }, [debouncedSearch, bodyId, regionId, level]);

  // Same out-of-order-response guard used elsewhere in this CMS.
  const requestIdRef = useRef(0);

  const fetchExams = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    try {
      let query = supabase
        .from('lc_exams')
        .select('id,name,category,status,accent_color,thumbnail_subject,conducting_body:lc_conducting_bodies(id,name),region:lc_regions!inner(id,name,level)', { count: 'exact' });

      if (debouncedSearch) query = query.ilike('name', `%${debouncedSearch}%`);
      if (bodyId) query = query.eq('conducting_body_id', bodyId);
      if (regionId) query = query.eq('region_id', regionId);
      else if (level) query = query.eq('region.level', level);

      const from = (page - 1) * PAGE_SIZE;
      query = query.order('name', { ascending: true }).range(from, from + PAGE_SIZE - 1);

      const { data, count, error } = await query;
      if (error) throw error;
      if (requestId !== requestIdRef.current) return;

      const ids = (data || []).map((e) => e.id);
      let statsById = {};
      if (ids.length) {
        const { data: stats } = await supabase.from('lc_exam_stats').select('*').in('exam_id', ids);
        statsById = Object.fromEntries((stats || []).map((s) => [s.exam_id, s]));
      }
      if (requestId !== requestIdRef.current) return;

      setExams((data || []).map((e) => ({ ...e, stats: statsById[e.id] || { subject_count: 0, resource_count: 0 } })));
      setTotal(count || 0);
    } catch (err) {
      console.error('Error fetching exams:', err);
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }, [debouncedSearch, bodyId, regionId, level, page]);

  useEffect(() => { fetchExams(); }, [fetchExams]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

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

  const chooseLevel = (v) => { setLevel(v); setRegionId(''); setBodyId(''); };
  const chooseRegion = (v) => { setRegionId(v); setBodyId(''); };

  const clearFilters = () => { setSearch(''); setBodyId(''); setRegionId(''); setLevel(''); };

  return (
    <div>
      <div className="lc-section-header">
        <div>
          <h2>Exams</h2>
          <p>Central / State / UT → State → Conducting Body — drill down, not a flat list.</p>
        </div>
      </div>

      <div className="lc-filter-bar-primary">
        <div className="lc-level-pills">
          {LEVELS.map((l) => (
            <button key={l.value} className={level === l.value ? 'active' : ''} onClick={() => chooseLevel(l.value)}>{l.label}</button>
          ))}
        </div>
        <button className="lc-btn" onClick={clearFilters}>Clear Filters</button>
      </div>

      <div className="lc-filter-bar lc-filter-bar-secondary">
        {(level === 'state' || level === 'ut') && (
          <div className="lc-filter-field">
            <label>{level === 'state' ? 'State' : 'UT'}</label>
            <Select searchable placeholder={`All ${level === 'state' ? 'States' : 'UTs'}`} value={regionId} onChange={(e) => chooseRegion(e.target.value)} options={[{ value: '', label: `All ${level === 'state' ? 'States' : 'UTs'}` }, ...regionOptions.map((r) => ({ value: r.id, label: r.name }))]} />
          </div>
        )}
        <div className="lc-filter-field">
          <label>Conducting Body</label>
          <Select searchable placeholder="All Conducting Bodies" value={bodyId} onChange={(e) => setBodyId(e.target.value)} options={[{ value: '', label: 'All Conducting Bodies' }, ...bodyOptions.map((b) => ({ value: b.id, label: b.name }))]} />
        </div>
        <div className="lc-filter-field">
          <label>Search Exam Name</label>
          <div className="lc-search-input-wrapper">
            <Search size={16} />
            <input type="text" placeholder="e.g. CGL, PO, AFCAT..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>
      </div>

      <div className="lc-exams-workspace">
        <div className="lc-exams-list-col">
          <div className="lc-card-row-header" style={{ marginBottom: '0.85rem' }}>
            <h3 style={{ margin: 0 }}>Exams ({total})</h3>
            <button className="lc-btn primary" onClick={startNewExam}><Plus size={16} /> Add Exam</button>
          </div>

          <div className="lc-table-responsive lc-exams-list-scroll">
            <table className="lc-table lc-table-compact">
              <thead>
                <tr>
                  <th style={{ width: '42%' }}>Exam</th>
                  <th style={{ width: '28%' }}>Body</th>
                  <th style={{ width: '10%', textAlign: 'right' }}>Subj.</th>
                  <th style={{ width: '10%', textAlign: 'right' }}>Res.</th>
                  <th style={{ width: '10%' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {exams.map((exam) => (
                  <tr key={exam.id} className={`clickable ${selectedExamId === exam.id ? 'selected' : ''}`} onClick={() => selectExam(exam.id)}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', minWidth: 0 }}>
                        <ExamThumbnail conductingBodyName={exam.conducting_body?.name} thumbnailSubject={exam.thumbnail_subject} accentColor={exam.accent_color} size="sm" />
                        <div style={{ minWidth: 0 }}>
                          <span className="lc-table-title lc-truncate" title={exam.name}>{exam.name}</span>
                          {exam.category && <span className="lc-table-sub lc-truncate" title={exam.category}>{exam.category}</span>}
                        </div>
                      </div>
                    </td>
                    <td className="lc-table-sub lc-truncate" title={exam.conducting_body?.name}>{exam.conducting_body?.name || '—'}</td>
                    <td style={{ textAlign: 'right' }}><span className="lc-count-pill">{exam.stats.subject_count}</span></td>
                    <td style={{ textAlign: 'right' }}><span className="lc-count-pill">{exam.stats.resource_count}</span></td>
                    <td><StatusBadge status={exam.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>

            {loading && <div className="lc-loading-state">Loading exams…</div>}
            {!loading && exams.length === 0 && (
              <div className="lc-empty-state"><ShieldAlert size={22} style={{ marginBottom: '0.5rem' }} /><p>No exams match the current filters.</p></div>
            )}
          </div>

          {!loading && exams.length > 0 && (
            <div className="lc-pagination-bar">
              <span className="lc-pagination-info">{total} exam{total === 1 ? '' : 's'} — page {page} of {totalPages}</span>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button className="lc-pagination-btn" disabled={page === 1} onClick={() => setPage((p) => p - 1)}><ChevronLeft size={14} /></button>
                <button className="lc-pagination-btn" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}><ChevronRight size={14} /></button>
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
            />
          ) : (
            <div className="lc-card lc-empty-editor">
              <p className="lc-muted-note">Select an exam from the list to view and edit it, or click "Add Exam" to create one.</p>
            </div>
          )}
        </div>

        <div className="lc-exams-rail-col">
          <div className="lc-rail">
            <ExamIntroCard examId={selectedExamId} />
            <ExamStatusCard examId={selectedExamId} />
          </div>
        </div>
      </div>

      {selectedExamId && <ExamSubjectsPanel examId={selectedExamId} onChanged={fetchExams} />}
    </div>
  );
};

export default ExamsPage;
