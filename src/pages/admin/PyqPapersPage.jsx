import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import Select from '../../components/ui/Select';
import { useDebounced } from './lcShared';
import { Search, Save, X, ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';
import { THUMBNAIL_SUBJECTS } from '../../lib/thumbnailTaxonomy';

const SUBJECT_OPTIONS = Object.values(THUMBNAIL_SUBJECTS).map((s) => s.label).sort();
const PAGE_SIZE = 10;

// Same Level/State-UT/Conducting Body vocabulary as Book Content
// (BooksPage.jsx) -- reused verbatim so a paper's tags line up with the
// same names books and exams use, not a parallel taxonomy to reconcile
// later. "All Levels" is a real, useful filter state here (most rows are
// untagged so far), unlike a required drill-down.
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

// Editable listing + bulk subject-assign for pyq_papers -- a separate
// table from `quizzes`: PYQs are formatted documents, not attempt-able
// quizzes (see QuizzesPage.jsx, AdminQuizEditor.jsx). No full per-paper
// editor exists yet; this covers title/exam/details/taxonomy-subject
// fixes plus Level/State-UT/Conducting Body tagging, all inline.
//
// `subject` used to hold free-text paper-section content (e.g.
// "Part-A-General Intelligence and Reasoning"), not a real taxonomy
// label -- 90% of existing rows didn't match SUBJECT_OPTIONS at all when
// checked live. That old text was copied into a new `details` column
// (nothing deleted) so `subject` can be a clean taxonomy-constrained
// field going forward; a row whose old `subject` already WAS a valid
// taxonomy value (a minority) still shows correctly selected.
const PyqPapersPage = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounced(search, 300);
  const [levelFilter, setLevelFilter] = useState('');
  const [papers, setPapers] = useState([]);
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
      .from('pyq_papers')
      .select('id,title,exam_name,lc_exam_id,subject,details,total_questions,level,state_ut,conducting_body,created_at', { count: 'exact' })
      .order('created_at', { ascending: false });
    if (debouncedSearch) query = query.ilike('title', `%${debouncedSearch}%`);
    if (levelFilter) query = query.eq('level', levelFilter);
    const from = (page - 1) * PAGE_SIZE;
    query = query.range(from, from + PAGE_SIZE - 1);
    const { data, count, error } = await query;
    if (error) console.error('Error fetching PYQ papers:', error);
    setPapers(data || []);
    setTotalCount(count || 0);
    setSelectedIds([]);
    setLoading(false);
  };

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, levelFilter, page]);

  useEffect(() => { setPage(1); }, [debouncedSearch, levelFilter]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const toggleSelected = (id) => {
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  const toggleSelectAll = () => {
    setSelectedIds((prev) => prev.length === papers.length ? [] : papers.map((p) => p.id));
  };

  const applyBulkSubject = async () => {
    if (!bulkSubject || selectedIds.length === 0) return;
    setApplying(true);
    const { error } = await supabase.from('pyq_papers').update({ subject: bulkSubject }).in('id', selectedIds);
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
  const baseValue = (p, field) => p[FIELD_TO_COLUMN[field] || field] || '';
  const effectiveValue = (p, field) => {
    const pending = pendingEdits[p.id];
    return pending && field in pending ? pending[field] : baseValue(p, field);
  };
  const hasPending = (p) => {
    const pending = pendingEdits[p.id];
    if (!pending) return false;
    return Object.keys(pending).some((field) => pending[field] !== baseValue(p, field));
  };
  const updatePendingEdit = (p, field, value) => {
    setPendingEdits((prev) => {
      const next = { ...(prev[p.id] || {}), [field]: value };
      if (field === 'level' && value !== 'state' && value !== 'ut') next.stateUt = '';
      return { ...prev, [p.id]: next };
    });
  };
  // Picking a real exam also syncs the free-text exam_name display field to
  // match -- exam_name stays independently editable afterward (candidate-
  // facing code still matches on it by name, not yet on lc_exam_id).
  const handleExamPick = (p, examId) => {
    const picked = examsById[examId];
    setPendingEdits((prev) => {
      const next = { ...(prev[p.id] || {}), lcExamId: examId };
      if (picked) next.examName = picked.name;
      return { ...prev, [p.id]: next };
    });
  };
  const handleDiscardRow = (p) => {
    setPendingEdits((prev) => {
      const next = { ...prev };
      delete next[p.id];
      return next;
    });
  };
  const handleSaveRow = async (p) => {
    const pending = pendingEdits[p.id];
    if (!pending) return;
    const patch = {};
    for (const [field, column] of Object.entries(FIELD_TO_COLUMN)) {
      if (field in pending && pending[field] !== baseValue(p, field)) {
        patch[column] = pending[field] || null;
      }
    }
    if (patch.title === null) { alert('Title cannot be empty.'); return; }
    if (Object.keys(patch).length === 0) { handleDiscardRow(p); return; }

    setSavingRowId(p.id);
    try {
      const { error } = await supabase.from('pyq_papers').update(patch).eq('id', p.id);
      if (error) throw error;
      setPapers((prev) => prev.map((x) => (x.id === p.id ? { ...x, ...patch } : x)));
      handleDiscardRow(p);
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
          <h2>PYQ Papers</h2>
        </div>
      </div>

      <div className="lc-filter-bar-single">
        <div className="lc-filter-field lc-filter-search lc-search-input-wrapper">
          <Search size={16} />
          <input type="text" placeholder="Search paper titles..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="lc-filter-field">
          <label>Level</label>
          <select value={levelFilter} onChange={(e) => setLevelFilter(e.target.value)} style={{ padding: '0.6rem 0.75rem', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface-alt)', color: 'var(--admin-text)' }}>
            {LEVEL_FILTER_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      </div>

      {selectedIds.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.6rem 0.9rem', margin: '1rem 0', background: '#f8fafc', border: '1px solid #e2e8f0', color: '#0f172a' }}>
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
                <input type="checkbox" checked={papers.length > 0 && selectedIds.length === papers.length} onChange={toggleSelectAll} />
              </th>
              <th style={{ minWidth: '220px' }}>Paper / Details</th>
              <th style={{ minWidth: '160px' }}>Exam</th>
              <th style={{ minWidth: '160px' }}>Subject</th>
              <th style={{ textAlign: 'right' }}>Questions</th>
              <th>Level</th>
              <th>State/UT</th>
              <th style={{ minWidth: '180px' }}>Conducting Body</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {papers.map((p) => (
              <tr key={p.id}>
                <td onClick={(e) => e.stopPropagation()}>
                  <input type="checkbox" checked={selectedIds.includes(p.id)} onChange={() => toggleSelected(p.id)} />
                </td>
                <td>
                  <input
                    type="text"
                    value={effectiveValue(p, 'title')}
                    disabled={savingRowId === p.id}
                    onChange={(e) => updatePendingEdit(p, 'title', e.target.value)}
                    placeholder="Untitled"
                    title="Paper title"
                    style={{ ...inputStyle, fontWeight: 700, marginBottom: '0.3rem' }}
                  />
                  <input
                    type="text"
                    value={effectiveValue(p, 'details')}
                    disabled={savingRowId === p.id}
                    onChange={(e) => updatePendingEdit(p, 'details', e.target.value)}
                    placeholder="Details (paper section, topics covered, etc.)"
                    title="Free-text details -- not the taxonomy subject"
                    style={{ ...inputStyle, fontSize: '0.75rem', color: 'var(--admin-text-muted)' }}
                  />
                </td>
                <td style={{ minWidth: '200px' }}>
                  <input
                    type="text"
                    value={effectiveValue(p, 'examName')}
                    disabled={savingRowId === p.id}
                    onChange={(e) => updatePendingEdit(p, 'examName', e.target.value)}
                    placeholder="—"
                    title="Exam name (display text)"
                    style={{ ...inputStyle, marginBottom: '0.3rem' }}
                  />
                  <Select
                    searchable
                    placeholder="Link to exam..."
                    value={effectiveValue(p, 'lcExamId')}
                    onChange={(e) => handleExamPick(p, e.target.value)}
                    options={[{ value: '', label: '— Not linked' }, ...exams.map((ex) => ({ value: ex.id, label: ex.name }))]}
                  />
                </td>
                <td>
                  <select
                    value={effectiveValue(p, 'subject')}
                    disabled={savingRowId === p.id}
                    onChange={(e) => updatePendingEdit(p, 'subject', e.target.value)}
                    title="Taxonomy subject"
                    style={inputStyle}
                  >
                    <option value="">— Unassigned</option>
                    {SUBJECT_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </td>
                <td style={{ textAlign: 'right' }}><span className="lc-count-pill">{p.total_questions || 0}</span></td>
                <td>
                  <select
                    value={effectiveValue(p, 'level')}
                    disabled={savingRowId === p.id}
                    onChange={(e) => updatePendingEdit(p, 'level', e.target.value)}
                    title="Tag this paper's level"
                    style={inputStyle}
                  >
                    {LEVEL_TAG_OPTIONS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </td>
                <td>
                  {(() => {
                    const currentLevel = effectiveValue(p, 'level');
                    if (currentLevel !== 'state' && currentLevel !== 'ut') return <span className="lc-table-sub">—</span>;
                    const options = regions.filter((r) => r.level === currentLevel);
                    return (
                      <select
                        value={effectiveValue(p, 'stateUt')}
                        disabled={savingRowId === p.id}
                        onChange={(e) => updatePendingEdit(p, 'stateUt', e.target.value)}
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
                    value={effectiveValue(p, 'conductingBody')}
                    onChange={(e) => updatePendingEdit(p, 'conductingBody', e.target.value)}
                    options={[{ value: '', label: '— None' }, ...conductingBodies.map((cb) => ({ value: cb.name, label: cb.name }))]}
                  />
                </td>
                <td>
                  <div style={{ display: 'flex', gap: '0.4rem' }}>
                    {hasPending(p) && (
                      <>
                        <button
                          className="lc-btn primary"
                          title="Save changes to the database"
                          disabled={savingRowId === p.id}
                          onClick={() => handleSaveRow(p)}
                          style={{ padding: '0.35rem 0.7rem', fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                        >
                          <Save size={13} /> {savingRowId === p.id ? 'Saving…' : 'Save'}
                        </button>
                        <button
                          className="lc-icon-btn"
                          title="Discard unsaved changes"
                          disabled={savingRowId === p.id}
                          onClick={() => handleDiscardRow(p)}
                        >
                          <X size={14} />
                        </button>
                      </>
                    )}
                    <button
                      className="lc-icon-btn"
                      title="Open paper preview/question editor"
                      onClick={() => navigate(`/admin/pyq/${p.id}`)}
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
        {loading && <div className="lc-loading-state">Loading PYQ papers…</div>}
        {!loading && papers.length === 0 && <div className="lc-empty-state"><p>No PYQ papers match the current filters.</p></div>}
      </div>

      {totalCount > 0 && (
        <div className="lc-pagination-bar">
          <span className="lc-pagination-info">{totalCount} paper{totalCount === 1 ? '' : 's'} — page {page} of {totalPages}</span>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="lc-pagination-btn" disabled={page === 1} onClick={() => setPage((p) => p - 1)}><ChevronLeft size={14} /></button>
            <button className="lc-pagination-btn" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}><ChevronRight size={14} /></button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PyqPapersPage;
