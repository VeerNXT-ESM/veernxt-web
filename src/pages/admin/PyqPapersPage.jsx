import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import Select from '../../components/ui/Select';
import { useDebounced } from './lcShared';
import { Search, Save, X } from 'lucide-react';
import { THUMBNAIL_SUBJECTS } from '../../lib/thumbnailTaxonomy';

const SUBJECT_OPTIONS = Object.values(THUMBNAIL_SUBJECTS).map((s) => s.label).sort();

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

// Read-only listing + bulk subject-assign for pyq_papers -- a separate
// table from `quizzes`: PYQs are formatted documents, not attempt-able
// quizzes (see QuizzesPage.jsx, AdminQuizEditor.jsx). No per-paper editor
// exists yet -- not requested; this covers the stated need (fix missing
// subjects in bulk) plus Level/State-UT/Conducting Body tagging.
const PyqPapersPage = () => {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounced(search, 300);
  const [levelFilter, setLevelFilter] = useState('');
  const [papers, setPapers] = useState([]);
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
    let query = supabase.from('pyq_papers').select('id,title,exam_name,subject,total_questions,level,state_ut,conducting_body,created_at').order('created_at', { ascending: false }).limit(200);
    if (debouncedSearch) query = query.ilike('title', `%${debouncedSearch}%`);
    if (levelFilter) query = query.eq('level', levelFilter);
    const { data, error } = await query;
    if (error) console.error('Error fetching PYQ papers:', error);
    setPapers(data || []);
    setSelectedIds([]);
    setLoading(false);
  };

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, levelFilter]);

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

  const baseValue = (p, field) => p[field] || '';
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
    if ('level' in pending && pending.level !== baseValue(p, 'level')) patch.level = pending.level || null;
    if ('stateUt' in pending && pending.stateUt !== baseValue(p, 'stateUt')) patch.state_ut = pending.stateUt || null;
    if ('conductingBody' in pending && pending.conductingBody !== baseValue(p, 'conductingBody')) patch.conducting_body = pending.conductingBody || null;
    if (Object.keys(patch).length === 0) { handleDiscardRow(p); return; }

    setSavingRowId(p.id);
    try {
      const { error } = await supabase.from('pyq_papers').update(patch).eq('id', p.id);
      if (error) throw error;
      setPapers((prev) => prev.map((x) => (x.id === p.id ? {
        ...x,
        level: 'level' in patch ? patch.level : x.level,
        state_ut: 'state_ut' in patch ? patch.state_ut : x.state_ut,
        conducting_body: 'conducting_body' in patch ? patch.conducting_body : x.conducting_body,
      } : x)));
      handleDiscardRow(p);
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
          <h2>PYQ Papers</h2>
          <p>Previous year question papers — read-only content, not quizzes.</p>
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
              <th>Paper</th>
              <th>Exam</th>
              <th>Subject</th>
              <th style={{ textAlign: 'right' }}>Questions</th>
              <th>Level</th>
              <th>State/UT</th>
              <th>Conducting Body</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {papers.map((p) => (
              <tr key={p.id}>
                <td onClick={(e) => e.stopPropagation()}>
                  <input type="checkbox" checked={selectedIds.includes(p.id)} onChange={() => toggleSelected(p.id)} />
                </td>
                <td><span className="lc-table-title">{p.title || 'Untitled'}</span></td>
                <td>{p.exam_name || '—'}</td>
                <td>{p.subject || <span style={{ color: '#ef4444' }}>Unassigned</span>}</td>
                <td style={{ textAlign: 'right' }}><span className="lc-count-pill">{p.total_questions || 0}</span></td>
                <td>
                  <select
                    value={effectiveValue(p, 'level')}
                    disabled={savingRowId === p.id}
                    onChange={(e) => updatePendingEdit(p, 'level', e.target.value)}
                    title="Tag this paper's level"
                    style={{ padding: '0.35rem 0.5rem', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface-alt)', color: 'var(--admin-text)', fontSize: '0.82rem' }}
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
                        style={{ padding: '0.35rem 0.5rem', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface-alt)', color: 'var(--admin-text)', fontSize: '0.82rem' }}
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
                  {hasPending(p) && (
                    <div style={{ display: 'flex', gap: '0.4rem' }}>
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
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {loading && <div className="lc-loading-state">Loading PYQ papers…</div>}
        {!loading && papers.length === 0 && <div className="lc-empty-state"><p>No PYQ papers match "{search}".</p></div>}
      </div>
    </div>
  );
};

export default PyqPapersPage;
