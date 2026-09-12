import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, AlertTriangle, CheckCircle2, Plus, Copy, Pencil, Trash2, Archive, ArchiveRestore, ExternalLink } from 'lucide-react';
import { useDebounced } from './lcShared';
import { NewBookModal, DuplicateBookModal, RenameBookModal, ConfirmDeleteModal, ConfirmArchiveModal } from '../../components/admin/BookFormModals';

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

// Book browser/editor over resources (format='blocks') + R2 -- R2 is the
// only source of truth for book content, so there's no local filesystem
// involved anywhere in this feature and it works identically whether the
// admin site is running locally or deployed.
const BooksPage = () => {
  const navigate = useNavigate();
  const [books, setBooks] = useState(null);
  const [error, setError] = useState(null);
  const [category, setCategory] = useState('');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounced(search);
  const [sort, setSort] = useState('issues');
  const [showArchived, setShowArchived] = useState(false);
  const [showNewModal, setShowNewModal] = useState(false);
  const [duplicateSource, setDuplicateSource] = useState(null);
  const [renameSource, setRenameSource] = useState(null);
  const [archiveSource, setArchiveSource] = useState(null);
  const [deleteSource, setDeleteSource] = useState(null);

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

  const openInNewTab = useCallback((b) => {
    window.open(`/admin/books/${b.category}/${b.resourceId}`, '_blank');
  }, []);

  const activeCount = useMemo(() => (books || []).filter((b) => !b.isArchived).length, [books]);
  const archivedCount = useMemo(() => (books || []).filter((b) => b.isArchived).length, [books]);

  const filtered = useMemo(() => {
    if (!books) return [];
    let list = books.filter((b) => (showArchived ? b.isArchived : !b.isArchived));
    if (category) list = list.filter((b) => b.category === category);
    if (debouncedSearch.trim()) {
      const q = debouncedSearch.trim().toLowerCase();
      list = list.filter((b) => b.title.toLowerCase().includes(q));
    }
    const issueScore = (b) => (b.issueCounts?.high || 0) * 1000 + (b.issueCounts?.medium || 0);
    return [...list].sort((a, b) => (sort === 'title' ? a.title.localeCompare(b.title) : issueScore(b) - issueScore(a)));
  }, [books, category, debouncedSearch, sort, showArchived]);

  const totals = useMemo(() => {
    if (!books) return null;
    return {
      count: books.length,
      withIssues: books.filter((b) => !b.isArchived && (b.issueCounts?.high || 0) + (b.issueCounts?.medium || 0) > 0).length,
    };
  }, [books]);

  const handleUnarchive = async (b) => {
    if (!window.confirm(`Restore "${b.title}" back to active books?`)) return;
    try {
      const res = await fetch('/api/admin/save-resource', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-api-secret': ADMIN_SECRET },
        body: JSON.stringify({ type: 'books-unarchive', resourceId: b.resourceId }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || 'Failed to unarchive');
      fetchBooks();
    } catch (err) {
      alert('Restore failed: ' + err.message);
    }
  };

  return (
    <div>
      <div className="lc-section-header">
        <div>
          <h2>{showArchived ? 'Archived Books' : 'Book Content'}</h2>
          <p>
            {showArchived
              ? `Showing ${archivedCount} archived book${archivedCount === 1 ? '' : 's'}. These are hidden from candidates and the active catalog.`
              : totals
              ? `${activeCount} active book${activeCount === 1 ? '' : 's'}, ${totals.withIssues} flagged by the last QA scan.`
              : 'loading…'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
          <button
            className={`lc-btn ${showArchived ? 'primary' : ''}`}
            onClick={() => setShowArchived((prev) => !prev)}
            title={showArchived ? 'Switch to active books' : 'View archived books'}
            style={showArchived ? { background: '#d97706', borderColor: '#d97706', color: 'white' } : undefined}
          >
            <Archive size={16} /> {showArchived ? 'Show Active Books' : `Show Archived (${archivedCount})`}
          </button>
          <button className="lc-btn primary" onClick={() => setShowNewModal(true)}>
            <Plus size={16} /> New Book
          </button>
        </div>
      </div>

      <div className="lc-filter-bar" style={{ gridTemplateColumns: '1fr auto auto' }}>
        <div className="lc-filter-field lc-search-input-wrapper">
          <Search size={16} />
          <input type="text" placeholder="Search book title..." value={search} onChange={(e) => setSearch(e.target.value)} />
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
              <tr
                key={b.resourceId}
                className="clickable"
                onClick={() => navigate(`/admin/books/${b.category}/${b.resourceId}`, { state: { bookTitle: b.title } })}
              >
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span className="lc-table-title">{b.title}</span>
                    {b.isArchived && (
                      <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#b45309', background: '#fffbeb', border: '1px solid #fef3c7', padding: '0.1rem 0.4rem', borderRadius: 4 }}>
                        Archived
                      </span>
                    )}
                  </div>
                  {b.duplicateRowCount > 1 && <span className="lc-table-sub">{b.duplicateRowCount} linked exam entries</span>}
                </td>
                <td>{b.category}</td>
                <td style={{ textAlign: 'right' }}><span className="lc-count-pill">{b.chapterCount ?? '—'}</span></td>
                <td>
                  {(b.issueCounts?.high || 0) > 0 ? (
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
                  <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end' }}>
                    <button
                      className="lc-icon-btn"
                      title="Open in new tab"
                      onClick={(e) => {
                        e.stopPropagation();
                        openInNewTab(b);
                      }}
                      style={{ color: 'var(--admin-accent)' }}
                    >
                      <ExternalLink size={14} />
                    </button>
                    {showArchived ? (
                      <button
                        className="lc-icon-btn"
                        title="Restore / Unarchive this book"
                        onClick={() => handleUnarchive(b)}
                        style={{ color: '#059669' }}
                      >
                        <ArchiveRestore size={14} />
                      </button>
                    ) : (
                      <>
                        <button
                          className="lc-icon-btn"
                          title="Rename this book"
                          onClick={() => setRenameSource(b)}
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          className="lc-icon-btn"
                          title="Archive this book"
                          onClick={() => setArchiveSource(b)}
                          style={{ color: '#d97706' }}
                        >
                          <Archive size={14} />
                        </button>
                      </>
                    )}
                    <button
                      className="lc-icon-btn"
                      title="Duplicate this book"
                      onClick={() => setDuplicateSource(b)}
                    >
                      <Copy size={14} />
                    </button>
                    <button
                      className="lc-icon-btn"
                      title="Delete this book"
                      onClick={() => setDeleteSource(b)}
                      style={{ color: '#dc2626' }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {books === null && !error && <div className="lc-loading-state">Loading books…</div>}
        {books !== null && filtered.length === 0 && (
          <div className="lc-empty-state">
            <p>{showArchived ? 'No archived books.' : 'No books match the current filters.'}</p>
          </div>
        )}
      </div>

      {showNewModal && (
        <NewBookModal
          onClose={() => setShowNewModal(false)}
          onCreated={(cat, resourceId, newTitle) => { setShowNewModal(false); navigate(`/admin/books/${cat}/${resourceId}`, { state: { bookTitle: newTitle } }); }}
        />
      )}
      {duplicateSource && (
        <DuplicateBookModal
          source={duplicateSource}
          onClose={() => setDuplicateSource(null)}
          onDuplicated={(cat, resourceId, newTitle) => { setDuplicateSource(null); fetchBooks(); navigate(`/admin/books/${cat}/${resourceId}`, { state: { bookTitle: newTitle } }); }}
        />
      )}
      {renameSource && (
        <RenameBookModal
          book={renameSource}
          onClose={() => setRenameSource(null)}
          onRenamed={() => { setRenameSource(null); fetchBooks(); }}
        />
      )}
      {archiveSource && (
        <ConfirmArchiveModal
          book={archiveSource}
          onClose={() => setArchiveSource(null)}
          onArchived={() => { setArchiveSource(null); fetchBooks(); }}
        />
      )}
      {deleteSource && (
        <ConfirmDeleteModal
          book={deleteSource}
          onClose={() => setDeleteSource(null)}
          onDeleted={() => { setDeleteSource(null); fetchBooks(); }}
        />
      )}
    </div>
  );
};

export default BooksPage;
