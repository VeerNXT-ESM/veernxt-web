import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useDebounced } from './lcShared';
import { Search } from 'lucide-react';
import { THUMBNAIL_SUBJECTS } from '../../lib/thumbnailTaxonomy';

const SUBJECT_OPTIONS = Object.values(THUMBNAIL_SUBJECTS).map((s) => s.label).sort();

// Read-only listing + bulk subject-assign for pyq_papers -- a separate
// table from `quizzes`: PYQs are formatted documents, not attempt-able
// quizzes (see QuizzesPage.jsx, AdminQuizEditor.jsx). No per-paper editor
// exists yet -- not requested; this covers the stated need (fix missing
// subjects in bulk).
const PyqPapersPage = () => {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounced(search, 300);
  const [papers, setPapers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkSubject, setBulkSubject] = useState('');
  const [applying, setApplying] = useState(false);

  const reload = async () => {
    setLoading(true);
    let query = supabase.from('pyq_papers').select('id,title,exam_name,subject,total_questions,created_at').order('created_at', { ascending: false }).limit(200);
    if (debouncedSearch) query = query.ilike('title', `%${debouncedSearch}%`);
    const { data, error } = await query;
    if (error) console.error('Error fetching PYQ papers:', error);
    setPapers(data || []);
    setSelectedIds([]);
    setLoading(false);
  };

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

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

  return (
    <div>
      <div className="lc-section-header">
        <div>
          <h2>PYQ Papers</h2>
          <p>Previous year question papers — read-only content, not quizzes.</p>
        </div>
      </div>

      <div className="lc-filter-bar" style={{ gridTemplateColumns: '1fr' }}>
        <div className="lc-filter-field lc-search-input-wrapper">
          <Search size={16} />
          <input type="text" placeholder="Search paper titles..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      {selectedIds.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.6rem 0.9rem', margin: '1rem 0', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>{selectedIds.length} selected</span>
          <select value={bulkSubject} onChange={(e) => setBulkSubject(e.target.value)} style={{ padding: '0.35rem 0.5rem' }}>
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
