import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import Select from '../../components/ui/Select';
import { useDebounced } from './lcShared';
import { Search, Plus, Save, X, ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';
import { THUMBNAIL_SUBJECTS } from '../../lib/thumbnailTaxonomy';

const CATEGORY_TABS = ['All', 'Mock Test', 'Topic Test'];
const SUBJECT_OPTIONS = Object.values(THUMBNAIL_SUBJECTS).map((s) => s.label).sort();
const PAGE_SIZE = 10;

// Same Level/State-UT/Conducting Body vocabulary as Book Content
// (BooksPage.jsx) and PyqPapersPage.jsx -- reused verbatim so a quiz's
// tags line up with the same names books/papers/exams use.
const LEVEL_FILTER_OPTIONS = [
  { value: '', label: 'All Levels' },
  { value: 'central', label: 'Central' },
  { value: 'state', label: 'State' },
  { value: 'ut', label: 'UT' },
];
const LEVEL_TAG_OPTIONS = [
  { value: '', label: '— Untagged' },
  { value: 'central', label: 'Central' },
  { value: 'state', label: 'State' },
  { value: 'ut', label: 'UT' },
];

// Minimal browse/edit list for the `quizzes` table — a separate, still-live
// system from the lc_* Learning Center schema. AdminQuizEditor.jsx (the
// full question-by-question editor) is untouched; this covers inline
// title/exam/details/taxonomy-subject fixes plus Level/State-UT/
// Conducting Body tagging, same as PyqPapersPage.jsx and Book Content.
const QuizzesPage = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounced(search, 300);
  const [categoryTab, setCategoryTab] = useState('All');
  const [levelFilter, setLevelFilter] = useState('');
  // Separate State and UT filters, always visible (not gated behind
  // Level) -- same split ExamsPage.jsx's own State/UT filter uses.
  const [stateFilter, setStateFilter] = useState('');
  const [utFilter, setUtFilter] = useState('');
  const stateUtFilter = stateFilter || utFilter;
  const [quizzes, setQuizzes] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkSubject, setBulkSubject] = useState('');
  const [applying, setApplying] = useState(false);

  // Same lc_regions/lc_conducting_bodies tables Book Content and Exams
  // already read, for the identical Level -> State/UT cascade and
  // Conducting Body picker. lc_exams (not the separate, service-role-only
  // `exams` table -- see sql/pyq_quizzes_lc_exam_link.sql) is the same
  // 1,536-row catalog ExamsPage.jsx/ExamEditorPanel.jsx/AdminJobs.jsx
  // already treat as canonical and browser-readable.
  const [regions, setRegions] = useState([]);
  const [conductingBodies, setConductingBodies] = useState([]);
  const [exams, setExams] = useState([]);
  useEffect(() => {
    (async () => {
      const [{ data: regionRows }, { data: bodyRows }, { data: examRows }] = await Promise.all([
        supabase.from('lc_regions').select('id,name,level').order('name'),
        supabase.from('lc_conducting_bodies').select('id,name').order('name'),
        supabase.from('lc_exams').select('id,name').order('name'),
      ]);
      setRegions(regionRows || []);
      setConductingBodies(bodyRows || []);
      setExams(examRows || []);
    })();
  }, []);
  const examsById = {};
  for (const e of exams) examsById[e.id] = e;

  // Every inline-editable field is staged here per row id rather than
  // written on each keystroke/dropdown change -- one explicit Save per
  // row commits everything at once, same pattern as Book Content.
  const [pendingEdits, setPendingEdits] = useState({});
  const [savingRowId, setSavingRowId] = useState(null);

  const reload = async () => {
    setLoading(true);
    let query = supabase
      .from('quizzes')
      .select('id,title,exam_name,lc_exam_id,category,subject,details,is_locked,total_questions,level,state_ut,conducting_body,created_at', { count: 'exact' })
      .order('created_at', { ascending: false });
    if (debouncedSearch) query = query.ilike('title', `%${debouncedSearch}%`);
    if (categoryTab !== 'All') query = query.eq('category', categoryTab);
    if (levelFilter) query = query.eq('level', levelFilter);
    if (stateUtFilter) query = query.eq('state_ut', stateUtFilter);
    const from = (page - 1) * PAGE_SIZE;
    query = query.range(from, from + PAGE_SIZE - 1);
    const { data, count, error } = await query;
    if (error) console.error('Error fetching quizzes:', error);
    setQuizzes(data || []);
    setTotalCount(count || 0);
    setSelectedIds([]);
    setLoading(false);
  };

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, categoryTab, levelFilter, stateUtFilter, page]);

  useEffect(() => { setPage(1); }, [debouncedSearch, categoryTab, levelFilter, stateUtFilter]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const toggleSelected = (id) => {
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  const toggleSelectAll = () => {
    setSelectedIds((prev) => prev.length === quizzes.length ? [] : quizzes.map((q) => q.id));
  };

  const applyBulkSubject = async () => {
    if (!bulkSubject || selectedIds.length === 0) return;
    setApplying(true);
    const { error } = await supabase.from('quizzes').update({ subject: bulkSubject }).in('id', selectedIds);
    setApplying(false);
    if (error) {
      alert('Error applying subject: ' + error.message);
      return;
    }
    await reload();
  };

  // Pending-edit keys are camelCase (stateUt, conductingBody, examName) but
  // the actual row columns are snake_case -- this is the one place that
  // mapping is defined, reused by every read/write below it.
  const FIELD_TO_COLUMN = { title: 'title', examName: 'exam_name', lcExamId: 'lc_exam_id', subject: 'subject', details: 'details', level: 'level', stateUt: 'state_ut', conductingBody: 'conducting_body' };
  const baseValue = (q, field) => q[FIELD_TO_COLUMN[field] || field] || '';
  const effectiveValue = (q, field) => {
    const pending = pendingEdits[q.id];
    return pending && field in pending ? pending[field] : baseValue(q, field);
  };
  const hasPending = (q) => {
    const pending = pendingEdits[q.id];
    if (!pending) return false;
    return Object.keys(pending).some((field) => pending[field] !== baseValue(q, field));
  };
  const updatePendingEdit = (q, field, value) => {
    setPendingEdits((prev) => {
      const next = { ...(prev[q.id] || {}), [field]: value };
      if (field === 'level' && value !== 'state' && value !== 'ut') next.stateUt = '';
      return { ...prev, [q.id]: next };
    });
  };
  // Picking a real exam also syncs the free-text exam_name display field to
  // match -- exam_name stays independently editable afterward (candidate-
  // facing code still matches on it by name, not yet on lc_exam_id).
  const handleExamPick = (q, examId) => {
    const picked = examsById[examId];
    setPendingEdits((prev) => {
      const next = { ...(prev[q.id] || {}), lcExamId: examId };
      if (picked) next.examName = picked.name;
      return { ...prev, [q.id]: next };
    });
  };
  const handleDiscardRow = (q) => {
    setPendingEdits((prev) => {
      const next = { ...prev };
      delete next[q.id];
      return next;
    });
  };
  const handleSaveRow = async (q) => {
    const pending = pendingEdits[q.id];
    if (!pending) return;
    const patch = {};
    for (const [field, column] of Object.entries(FIELD_TO_COLUMN)) {
      if (field in pending && pending[field] !== baseValue(q, field)) {
        patch[column] = pending[field] || null;
      }
    }
    if (patch.title === null) { alert('Title cannot be empty.'); return; }
    if (Object.keys(patch).length === 0) { handleDiscardRow(q); return; }

    setSavingRowId(q.id);
    try {
      const { error } = await supabase.from('quizzes').update(patch).eq('id', q.id);
      if (error) throw error;
      setQuizzes((prev) => prev.map((x) => (x.id === q.id ? { ...x, ...patch } : x)));
      handleDiscardRow(q);
    } catch (err) {
      alert('Save failed: ' + err.message);
    } finally {
      setSavingRowId(null);
    }
  };

  const inputStyle = { padding: '0.35rem 0.5rem', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface-alt)', color: 'var(--admin-text)', fontSize: '0.82rem', width: '100%', boxSizing: 'border-box' };

  return (
    <div>
      <div className="lc-section-header">
        <div>
          <h2>Quizzes</h2>
        </div>
      </div>

      <div className="lc-filter-bar-single">
        <div className="lc-filter-field lc-filter-search lc-search-input-wrapper">
          <Search size={16} />
          <input type="text" placeholder="Search quiz titles..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="lc-filter-field">
          <label>Type</label>
          <div style={{ display: 'flex', gap: '0.4rem' }}>
            {CATEGORY_TABS.map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setCategoryTab(tab)}
                className="lc-btn"
                style={{
                  background: categoryTab === tab ? 'var(--admin-accent, #4b6b32)' : undefined,
                  color: categoryTab === tab ? 'white' : undefined,
                  fontWeight: categoryTab === tab ? 700 : 500,
                }}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
        <div className="lc-filter-field">
          <label>Level</label>
          <select value={levelFilter} onChange={(e) => { setLevelFilter(e.target.value); setStateFilter(''); setUtFilter(''); }} style={{ padding: '0.6rem 0.75rem', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface-alt)', color: 'var(--admin-text)' }}>
            {LEVEL_FILTER_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div className="lc-filter-field">
          <label>State</label>
          <div style={{ minWidth: 150 }}>
            <Select
              searchable
              value={stateFilter}
              onChange={(e) => { setStateFilter(e.target.value); setUtFilter(''); if (e.target.value) setLevelFilter('state'); }}
              placeholder="All States"
              options={[{ value: '', label: 'All States' }, ...regions.filter((r) => r.level === 'state').map((r) => ({ value: r.name, label: r.name }))]}
            />
          </div>
        </div>
        <div className="lc-filter-field">
          <label>UT</label>
          <div style={{ minWidth: 150 }}>
            <Select
              searchable
              value={utFilter}
              onChange={(e) => { setUtFilter(e.target.value); setStateFilter(''); if (e.target.value) setLevelFilter('ut'); }}
              placeholder="All UTs"
              options={[{ value: '', label: 'All UTs' }, ...regions.filter((r) => r.level === 'ut').map((r) => ({ value: r.name, label: r.name }))]}
            />
          </div>
        </div>
        <Link to="/admin/quiz" className="lc-btn primary"><Plus size={16} /> New Quiz</Link>
      </div>

      {selectedIds.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.6rem 0.9rem', marginBottom: '1rem', background: '#f8fafc', border: '1px solid #e2e8f0', color: '#0f172a' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>{selectedIds.length} selected</span>
          <select value={bulkSubject} onChange={(e) => setBulkSubject(e.target.value)} style={{ padding: '0.35rem 0.5rem', color: '#0f172a', background: '#fff' }}>
            <option value="">Set subject...</option>
            {SUBJECT_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <button type="button" className="lc-btn primary" disabled={!bulkSubject || applying} onClick={applyBulkSubject}>
            {applying ? 'Applying...' : `Apply to ${selectedIds.length} selected`}
          </button>
        </div>
      )}

      <div className="lc-table-responsive">
        <table className="lc-table">
          <thead>
            <tr>
              <th style={{ width: '2rem' }}>
                <input type="checkbox" checked={quizzes.length > 0 && selectedIds.length === quizzes.length} onChange={toggleSelectAll} />
              </th>
              <th style={{ minWidth: '220px' }}>Quiz / Details</th>
              <th style={{ minWidth: '160px' }}>Exam</th>
              <th>Category</th>
              <th style={{ minWidth: '160px' }}>Subject</th>
              <th style={{ textAlign: 'right' }}>Questions</th>
              <th>Access</th>
              <th>Level</th>
              <th>State/UT</th>
              <th style={{ minWidth: '180px' }}>Conducting Body</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {quizzes.map((q) => (
              <tr key={q.id}>
                <td onClick={(e) => e.stopPropagation()}>
                  <input type="checkbox" checked={selectedIds.includes(q.id)} onChange={() => toggleSelected(q.id)} />
                </td>
                <td>
                  <input
                    type="text"
                    value={effectiveValue(q, 'title')}
                    disabled={savingRowId === q.id}
                    onChange={(e) => updatePendingEdit(q, 'title', e.target.value)}
                    placeholder="Untitled"
                    title="Quiz title"
                    style={{ ...inputStyle, fontWeight: 700, marginBottom: '0.3rem' }}
                  />
                  <input
                    type="text"
                    value={effectiveValue(q, 'details')}
                    disabled={savingRowId === q.id}
                    onChange={(e) => updatePendingEdit(q, 'details', e.target.value)}
                    placeholder="Details"
                    title="Free-text details -- not the taxonomy subject"
                    style={{ ...inputStyle, fontSize: '0.75rem', color: 'var(--admin-text-muted)' }}
                  />
                </td>
                <td style={{ minWidth: '200px' }}>
                  <input
                    type="text"
                    value={effectiveValue(q, 'examName')}
                    disabled={savingRowId === q.id}
                    onChange={(e) => updatePendingEdit(q, 'examName', e.target.value)}
                    placeholder="—"
                    title="Exam name (display text)"
                    style={{ ...inputStyle, marginBottom: '0.3rem' }}
                  />
                  <Select
                    searchable
                    placeholder="Link to exam..."
                    value={effectiveValue(q, 'lcExamId')}
                    onChange={(e) => handleExamPick(q, e.target.value)}
                    options={[{ value: '', label: '— Not linked' }, ...exams.map((ex) => ({ value: ex.id, label: ex.name }))]}
                  />
                </td>
                <td>{q.category || '—'}</td>
                <td>
                  <select
                    value={effectiveValue(q, 'subject')}
                    disabled={savingRowId === q.id}
                    onChange={(e) => updatePendingEdit(q, 'subject', e.target.value)}
                    title="Taxonomy subject"
                    style={inputStyle}
                  >
                    <option value="">— Unassigned</option>
                    {SUBJECT_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </td>
                <td style={{ textAlign: 'right' }}><span className="lc-count-pill">{q.total_questions || 0}</span></td>
                <td>
                  <span className="lc-status-badge" style={{ background: q.is_locked ? 'var(--admin-warn-bg)' : 'var(--admin-accent-soft)', color: q.is_locked ? 'var(--admin-warn)' : 'var(--admin-accent)' }}>
                    {q.is_locked ? 'Premium' : 'Free'}
                  </span>
                </td>
                <td>
                  <select
                    value={effectiveValue(q, 'level')}
                    disabled={savingRowId === q.id}
                    onChange={(e) => updatePendingEdit(q, 'level', e.target.value)}
                    title="Tag this quiz's level"
                    style={inputStyle}
                  >
                    {LEVEL_TAG_OPTIONS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </td>
                <td>
                  {(() => {
                    const currentLevel = effectiveValue(q, 'level');
                    if (currentLevel !== 'state' && currentLevel !== 'ut') return <span className="lc-table-sub">—</span>;
                    const options = regions.filter((r) => r.level === currentLevel);
                    return (
                      <select
                        value={effectiveValue(q, 'stateUt')}
                        disabled={savingRowId === q.id}
                        onChange={(e) => updatePendingEdit(q, 'stateUt', e.target.value)}
                        title="Tag which state/UT"
                        style={inputStyle}
                      >
                        <option value="">— Untagged</option>
                        {options.map((r) => <option key={r.id} value={r.name}>{r.name}</option>)}
                      </select>
                    );
                  })()}
                </td>
                <td style={{ minWidth: '200px' }}>
                  <Select
                    searchable
                    placeholder="— None"
                    value={effectiveValue(q, 'conductingBody')}
                    onChange={(e) => updatePendingEdit(q, 'conductingBody', e.target.value)}
                    options={[{ value: '', label: '— None' }, ...conductingBodies.map((cb) => ({ value: cb.name, label: cb.name }))]}
                  />
                </td>
                <td>
                  <div style={{ display: 'flex', gap: '0.4rem' }}>
                    {hasPending(q) && (
                      <>
                        <button
                          className="lc-btn primary"
                          title="Save changes to the database"
                          disabled={savingRowId === q.id}
                          onClick={() => handleSaveRow(q)}
                          style={{ padding: '0.35rem 0.7rem', fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                        >
                          <Save size={13} /> {savingRowId === q.id ? 'Saving…' : 'Save'}
                        </button>
                        <button
                          className="lc-icon-btn"
                          title="Discard unsaved changes"
                          disabled={savingRowId === q.id}
                          onClick={() => handleDiscardRow(q)}
                        >
                          <X size={14} />
                        </button>
                      </>
                    )}
                    <button
                      className="lc-icon-btn"
                      title="Open full quiz editor"
                      onClick={() => navigate(`/admin/quiz/${q.id}`)}
                      style={{ color: 'var(--admin-accent)' }}
                    >
                      <ExternalLink size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {loading && <div className="lc-loading-state">Loading quizzes…</div>}
        {!loading && quizzes.length === 0 && <div className="lc-empty-state"><p>No quizzes match the current filters.</p></div>}
      </div>

      {totalCount > 0 && (
        <div className="lc-pagination-bar">
          <span className="lc-pagination-info">{totalCount} quiz{totalCount === 1 ? '' : 'zes'}</span>
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
  );
};

export default QuizzesPage;
