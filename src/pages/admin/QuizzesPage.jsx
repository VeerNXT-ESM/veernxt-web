import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useDebounced } from './lcShared';
import { Search, Plus } from 'lucide-react';
import { THUMBNAIL_SUBJECTS } from '../../lib/thumbnailTaxonomy';

const CATEGORY_TABS = ['All', 'Mock Test', 'PYQ', 'Topic Test'];
const SUBJECT_OPTIONS = Object.values(THUMBNAIL_SUBJECTS).map((s) => s.label).sort();

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
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkSubject, setBulkSubject] = useState('');
  const [applying, setApplying] = useState(false);

  const reload = async () => {
    setLoading(true);
    let query = supabase.from('quizzes').select('id,title,exam_name,category,subject,is_locked,total_questions,created_at').order('created_at', { ascending: false }).limit(200);
    if (debouncedSearch) query = query.ilike('title', `%${debouncedSearch}%`);
    if (categoryTab !== 'All') query = query.eq('category', categoryTab);
    const { data, error } = await query;
    if (error) console.error('Error fetching quizzes:', error);
    setQuizzes(data || []);
    setSelectedIds([]);
    setLoading(false);
  };

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, categoryTab]);

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

  return (
    <div>
      <div className="lc-section-header">
        <div>
          <h2>Quizzes</h2>
          <p>Manually authored assessments — a separate system from the canonical content library.</p>
        </div>
        <Link to="/admin/quiz" className="lc-btn primary"><Plus size={16} /> New Quiz</Link>
      </div>

      <div className="lc-filter-bar" style={{ gridTemplateColumns: '1fr' }}>
        <div className="lc-filter-field lc-search-input-wrapper">
          <Search size={16} />
          <input type="text" placeholder="Search quiz titles..." value={search} onChange={(e) => setSearch(e.target.value)} />
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.6rem 0.9rem', marginBottom: '1rem', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
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
                <input type="checkbox" checked={quizzes.length > 0 && selectedIds.length === quizzes.length} onChange={toggleSelectAll} />
              </th>
              <th>Quiz</th>
              <th>Exam</th>
              <th>Category</th>
              <th>Subject</th>
              <th style={{ textAlign: 'right' }}>Questions</th>
              <th>Access</th>
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
