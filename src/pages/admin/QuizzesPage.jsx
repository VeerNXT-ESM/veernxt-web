import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import Select from '../../components/ui/Select';
import { useDebounced } from './lcShared';
import { Search, Plus, Save, X } from 'lucide-react';
import { THUMBNAIL_SUBJECTS } from '../../lib/thumbnailTaxonomy';

const CATEGORY_TABS = ['All', 'Mock Test', 'Topic Test'];
const SUBJECT_OPTIONS = Object.values(THUMBNAIL_SUBJECTS).map((s) => s.label).sort();

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

// Minimal browse/open list for the `quizzes` table — a separate, still-live
// system from the lc_* Learning Center schema, unaffected by this
// rearchitecture. This page only replaces the "find an existing quiz"
// capability that used to live inside the removed Content Catalog tab;
// AdminQuizEditor.jsx (the actual editor) is untouched.
const QuizzesPage = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounced(search, 300);
  const [categoryTab, setCategoryTab] = useState('All');
  const [levelFilter, setLevelFilter] = useState('');
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkSubject, setBulkSubject] = useState('');
  const [applying, setApplying] = useState(false);

  // Same lc_regions/lc_conducting_bodies tables Book Content and Exams
  // already read, for the identical Level -> State/UT cascade and
  // Conducting Body picker.
  const [regions, setRegions] = useState([]);
  const [conductingBodies, setConductingBodies] = useState([]);
  useEffect(() => {
    (async () => {
      const [{ data: regionRows }, { data: bodyRows }] = await Promise.all([
        supabase.from('lc_regions').select('id,name,level').order('name'),
        supabase.from('lc_conducting_bodies').select('id,name').order('name'),
      ]);
      setRegions(regionRows || []);
      setConductingBodies(bodyRows || []);
    })();
  }, []);

  // Every inline-editable tag is staged here per row id rather than
  // written on each dropdown change -- one explicit Save per row commits
  // to the DB, same pattern as Book Content.
  const [pendingEdits, setPendingEdits] = useState({});
  const [savingRowId, setSavingRowId] = useState(null);

  const reload = async () => {
    setLoading(true);
    let query = supabase.from('quizzes').select('id,title,exam_name,category,subject,is_locked,total_questions,level,state_ut,conducting_body,created_at').order('created_at', { ascending: false }).limit(200);
    if (debouncedSearch) query = query.ilike('title', `%${debouncedSearch}%`);
    if (categoryTab !== 'All') query = query.eq('category', categoryTab);
    if (levelFilter) query = query.eq('level', levelFilter);
    const { data, error } = await query;
    if (error) console.error('Error fetching quizzes:', error);
    setQuizzes(data || []);
    setSelectedIds([]);
    setLoading(false);
  };

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, categoryTab, levelFilter]);

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

  const baseValue = (q, field) => q[field] || '';
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
    if ('level' in pending && pending.level !== baseValue(q, 'level')) patch.level = pending.level || null;
    if ('stateUt' in pending && pending.stateUt !== baseValue(q, 'stateUt')) patch.state_ut = pending.stateUt || null;
    if ('conductingBody' in pending && pending.conductingBody !== baseValue(q, 'conductingBody')) patch.conducting_body = pending.conductingBody || null;
    if (Object.keys(patch).length === 0) { handleDiscardRow(q); return; }

    setSavingRowId(q.id);
    try {
      const { error } = await supabase.from('quizzes').update(patch).eq('id', q.id);
      if (error) throw error;
      setQuizzes((prev) => prev.map((x) => (x.id === q.id ? {
        ...x,
        level: 'level' in patch ? patch.level : x.level,
        state_ut: 'state_ut' in patch ? patch.state_ut : x.state_ut,
        conducting_body: 'conducting_body' in patch ? patch.conducting_body : x.conducting_body,
      } : x)));
      handleDiscardRow(q);
    } catch (err) {
      alert('Save failed: ' + err.message);
    } finally {
      setSavingRowId(null);
    }
  };

  return (
    <div>
      <div className="lc-section-header">
        <div>
          <h2>Quizzes</h2>
          <p>Manually authored assessments — a separate system from the canonical content library.</p>
        </div>
        <Link to="/admin/quiz" className="lc-btn primary"><Plus size={16} /> New Quiz</Link>
      </div>

      <div className="lc-filter-bar-single">
        <div className="lc-filter-field lc-filter-search lc-search-input-wrapper">
          <Search size={16} />
          <input type="text" placeholder="Search quiz titles..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="lc-filter-field">
          <label>Level</label>
          <select value={levelFilter} onChange={(e) => setLevelFilter(e.target.value)} style={{ padding: '0.6rem 0.75rem', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface-alt)', color: 'var(--admin-text)' }}>
            {LEVEL_FILTER_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.4rem', margin: '0.75rem 0 1rem' }}>
        {CATEGORY_TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setCategoryTab(tab)}
            className="lc-btn"
            style={{
              background: categoryTab === tab ? 'var(--admin-accent, #4b6b32)' : 'transparent',
              color: categoryTab === tab ? 'white' : 'inherit',
              fontWeight: categoryTab === tab ? 700 : 500,
            }}
          >
            {tab}
          </button>
        ))}
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
              <th>Quiz</th>
              <th>Exam</th>
              <th>Category</th>
              <th>Subject</th>
              <th style={{ textAlign: 'right' }}>Questions</th>
              <th>Access</th>
              <th>Level</th>
              <th>State/UT</th>
              <th>Conducting Body</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {quizzes.map((q) => (
              <tr key={q.id} className="clickable">
                <td onClick={(e) => e.stopPropagation()}>
                  <input type="checkbox" checked={selectedIds.includes(q.id)} onChange={() => toggleSelected(q.id)} />
                </td>
                <td onClick={() => navigate(`/admin/quiz/${q.id}`)}><span className="lc-table-title">{q.title || 'Untitled'}</span></td>
                <td onClick={() => navigate(`/admin/quiz/${q.id}`)}>{q.exam_name || '—'}</td>
                <td onClick={() => navigate(`/admin/quiz/${q.id}`)}>{q.category || '—'}</td>
                <td onClick={() => navigate(`/admin/quiz/${q.id}`)}>{q.subject || <span style={{ color: '#ef4444' }}>Unassigned</span>}</td>
                <td onClick={() => navigate(`/admin/quiz/${q.id}`)} style={{ textAlign: 'right' }}><span className="lc-count-pill">{q.total_questions || 0}</span></td>
                <td onClick={() => navigate(`/admin/quiz/${q.id}`)}>
                  <span className="lc-status-badge" style={{ background: q.is_locked ? 'var(--admin-warn-bg)' : 'var(--admin-accent-soft)', color: q.is_locked ? 'var(--admin-warn)' : 'var(--admin-accent)' }}>
                    {q.is_locked ? 'Premium' : 'Free'}
                  </span>
                </td>
                <td onClick={(e) => e.stopPropagation()}>
                  <select
                    value={effectiveValue(q, 'level')}
                    disabled={savingRowId === q.id}
                    onChange={(e) => updatePendingEdit(q, 'level', e.target.value)}
                    title="Tag this quiz's level"
                    style={{ padding: '0.35rem 0.5rem', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface-alt)', color: 'var(--admin-text)', fontSize: '0.82rem' }}
                  >
                    {LEVEL_TAG_OPTIONS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </td>
                <td onClick={(e) => e.stopPropagation()}>
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
                        style={{ padding: '0.35rem 0.5rem', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface-alt)', color: 'var(--admin-text)', fontSize: '0.82rem' }}
                      >
                        <option value="">— Untagged</option>
                        {options.map((r) => <option key={r.id} value={r.name}>{r.name}</option>)}
                      </select>
                    );
                  })()}
                </td>
                <td onClick={(e) => e.stopPropagation()} style={{ minWidth: '200px' }}>
                  <Select
                    searchable
                    placeholder="— None"
                    value={effectiveValue(q, 'conductingBody')}
                    onChange={(e) => updatePendingEdit(q, 'conductingBody', e.target.value)}
                    options={[{ value: '', label: '— None' }, ...conductingBodies.map((cb) => ({ value: cb.name, label: cb.name }))]}
                  />
                </td>
                <td onClick={(e) => e.stopPropagation()}>
                  {hasPending(q) && (
                    <div style={{ display: 'flex', gap: '0.4rem' }}>
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
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {loading && <div className="lc-loading-state">Loading quizzes…</div>}
        {!loading && quizzes.length === 0 && <div className="lc-empty-state"><p>No quizzes match "{search}".</p></div>}
      </div>
    </div>
  );
};

export default QuizzesPage;
