import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useDebounced } from './lcShared';
import { Search, Plus } from 'lucide-react';

// Minimal browse/open list for the `quizzes` table — a separate, still-live
// system from the lc_* Learning Center schema, unaffected by this
// rearchitecture. This page only replaces the "find an existing quiz"
// capability that used to live inside the removed Content Catalog tab;
// AdminQuizEditor.jsx (the actual editor) is untouched.
const QuizzesPage = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounced(search, 300);
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      let query = supabase.from('quizzes').select('id,title,exam_name,category,is_locked,total_questions,created_at').order('created_at', { ascending: false }).limit(200);
      if (debouncedSearch) query = query.ilike('title', `%${debouncedSearch}%`);
      const { data, error } = await query;
      if (error) console.error('Error fetching quizzes:', error);
      setQuizzes(data || []);
      setLoading(false);
    })();
  }, [debouncedSearch]);

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

      <div className="lc-table-responsive">
        <table className="lc-table">
          <thead>
            <tr>
              <th>Quiz</th>
              <th>Exam</th>
              <th>Category</th>
              <th style={{ textAlign: 'right' }}>Questions</th>
              <th>Access</th>
            </tr>
          </thead>
          <tbody>
            {quizzes.map((q) => (
              <tr key={q.id} className="clickable" onClick={() => navigate(`/admin/quiz/${q.id}`)}>
                <td><span className="lc-table-title">{q.title || 'Untitled'}</span></td>
                <td>{q.exam_name || '—'}</td>
                <td>{q.category || '—'}</td>
                <td style={{ textAlign: 'right' }}><span className="lc-count-pill">{q.total_questions || 0}</span></td>
                <td>
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
