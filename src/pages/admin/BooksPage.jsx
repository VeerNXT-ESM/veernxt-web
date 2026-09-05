import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, AlertTriangle, CheckCircle2, FolderOpen, Plus, Copy } from 'lucide-react';
import { useDebounced } from './lcShared';
import { NewBookModal, DuplicateBookModal } from '../../components/admin/BookFormModals';

const ADMIN_SECRET = import.meta.env.VITE_ADMIN_API_SECRET;

const CATEGORY_TABS = [
  { value: '', label: 'All' },
  { value: 'Guide', label: 'Guide' },
  { value: 'Precis', label: 'Precis' },
];

const SORT_OPTIONS = [
  { value: 'issues', label: 'Most issues first' },
  { value: 'title', label: 'Title (A-Z)' },
];

// Read-only book/chapter browser over public/books/{Guide,Precis} -- Phase 1
// of the book-content-editor plan. This is deliberately a different data
// model from ResourcesTab.jsx (lc_resources, admin-only, incomplete) and
// AdminContentEditor.jsx (resources.body_html, Quill HTML) -- see
// project-dual-admin-content-systems memory. This page browses the
// block-JSON books that scripts/sync_books_to_r2.mjs actually ships to
// candidates.
const BooksPage = () => {
  const navigate = useNavigate();
  const [books, setBooks] = useState(null);
  const [error, setError] = useState(null);
  const [category, setCategory] = useState('');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounced(search);
  const [sort, setSort] = useState('issues');
  const [showNewModal, setShowNewModal] = useState(false);
  const [duplicateSource, setDuplicateSource] = useState(null);

  const fetchBooks = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/save-resource', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-api-secret': ADMIN_SECRET },
        body: JSON.stringify({ type: 'books-list' }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setBooks(data.books);
    } catch (err) {
      setError(err.message);
    }
  }, []);

  useEffect(() => { fetchBooks(); }, [fetchBooks]);

  const filtered = useMemo(() => {
    if (!books) return [];
    let list = books;
    if (category) list = list.filter((b) => b.category === category);
    if (debouncedSearch.trim()) {
      const q = debouncedSearch.trim().toLowerCase();
      list = list.filter((b) => b.title.toLowerCase().includes(q) || b.folder.toLowerCase().includes(q));
    }
    const issueScore = (b) => (b.issueCounts?.high || 0) * 1000 + (b.issueCounts?.medium || 0) + (b.empty ? 100000 : 0);
    return [...list].sort((a, b) => (sort === 'title' ? a.title.localeCompare(b.title) : issueScore(b) - issueScore(a)));
  }, [books, category, debouncedSearch, sort]);

  const totals = useMemo(() => {
    if (!books) return null;
    return {
      count: books.length,
      empty: books.filter((b) => b.empty).length,
      withIssues: books.filter((b) => (b.issueCounts?.high || 0) + (b.issueCounts?.medium || 0) > 0).length,
    };
  }, [books]);

  return (
    <div>
      <div className="lc-section-header">
        <div>
          <h2>Book Content</h2>
          <p>Guide &amp; Precis books shipped from public/books — {totals ? `${totals.count} books, ${totals.withIssues} flagged by the last QA scan, ${totals.empty} empty.` : 'loading…'}</p>
        </div>
        <button className="lc-btn primary" onClick={() => setShowNewModal(true)}><Plus size={16} /> New Book</button>
      </div>

      <div className="lc-filter-bar" style={{ gridTemplateColumns: '1fr auto auto' }}>
        <div className="lc-filter-field lc-search-input-wrapper">
          <Search size={16} />
          <input type="text" placeholder="Search book title or folder..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="lc-filter-field">
          <label>Category</label>
          <div style={{ display: 'flex', gap: '0.4rem' }}>
            {CATEGORY_TABS.map((t) => (
              <button
                key={t.value}
                className="lc-btn"
                style={category === t.value ? { background: 'var(--admin-accent)', borderColor: 'var(--admin-accent)', color: '#06281c' } : undefined}
                onClick={() => setCategory(t.value)}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
        <div className="lc-filter-field">
          <label>Sort</label>
          <select value={sort} onChange={(e) => setSort(e.target.value)} style={{ padding: '0.6rem 0.75rem', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface-alt)', color: 'var(--admin-text)' }}>
            {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      </div>

      {error && <div className="lc-empty-state">Failed to load books: {error}</div>}

      <div className="lc-table-responsive">
        <table className="lc-table">
          <thead>
            <tr>
              <th>Book</th>
              <th>Category</th>
              <th style={{ textAlign: 'right' }}>Chapters</th>
              <th>QA Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((b) => (
              <tr key={`${b.category}/${b.folder}`} className="clickable" onClick={() => navigate(`/admin/books/${b.category}/${encodeURIComponent(b.folder)}`)}>
                <td>
                  <span className="lc-table-title">{b.title}</span>
                  {b.title !== b.folder && <span className="lc-table-sub">{b.folder}</span>}
                </td>
                <td>{b.category}</td>
                <td style={{ textAlign: 'right' }}><span className="lc-count-pill">{b.chapters?.length ?? 0}</span></td>
                <td>
                  {b.empty ? (
                    <span className="lc-status-badge" style={{ background: 'var(--admin-danger-bg)', color: 'var(--admin-danger)' }}>
                      <FolderOpen size={12} style={{ verticalAlign: '-2px', marginRight: 4 }} />Empty folder
                    </span>
                  ) : (b.issueCounts?.high || 0) > 0 ? (
                    <span className="lc-status-badge" style={{ background: 'var(--admin-danger-bg)', color: 'var(--admin-danger)' }}>
                      <AlertTriangle size={12} style={{ verticalAlign: '-2px', marginRight: 4 }} />{b.issueCounts.high} high
                    </span>
                  ) : (b.issueCounts?.medium || 0) > 0 ? (
                    <span className="lc-status-badge" style={{ background: '#fdf6e2', color: '#b89047' }}>
                      {b.issueCounts.medium} to review
                    </span>
                  ) : b.issueCounts ? (
                    <span className="lc-status-badge" style={{ background: 'var(--admin-accent-soft)', color: 'var(--admin-accent)' }}>
                      <CheckCircle2 size={12} style={{ verticalAlign: '-2px', marginRight: 4 }} />Clean
                    </span>
                  ) : (
                    <span className="lc-table-sub">Not scanned</span>
                  )}
                </td>
                <td onClick={(e) => e.stopPropagation()}>
                  <button
                    className="lc-icon-btn" title="Duplicate this book"
                    onClick={() => setDuplicateSource(b)}
                  >
                    <Copy size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {books === null && !error && <div className="lc-loading-state">Loading books…</div>}
        {books !== null && filtered.length === 0 && <div className="lc-empty-state"><p>No books match the current filters.</p></div>}
      </div>

      {showNewModal && (
        <NewBookModal
          onClose={() => setShowNewModal(false)}
          onCreated={(cat, folder) => { setShowNewModal(false); navigate(`/admin/books/${cat}/${encodeURIComponent(folder)}`); }}
        />
      )}
      {duplicateSource && (
        <DuplicateBookModal
          source={duplicateSource}
          onClose={() => setDuplicateSource(null)}
          onDuplicated={(cat, folder) => { setDuplicateSource(null); fetchBooks(); navigate(`/admin/books/${cat}/${encodeURIComponent(folder)}`); }}
        />
      )}
    </div>
  );
};

export default BooksPage;
