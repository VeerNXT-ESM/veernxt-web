import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search, Plus, Copy, Pencil, Trash2, Archive, ArchiveRestore, ExternalLink, ChevronLeft, ChevronRight, Link2, Save, X, Columns3, Eye } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import Select from '../../components/ui/Select';
import { useDebounced } from './lcShared';
import AdminResourcePreview from './AdminResourcePreview';
import LinkExamsDrawer from './LinkExamsDrawer';
import { NewBookModal, DuplicateBookModal, RenameBookModal, ConfirmDeleteModal, ConfirmArchiveModal } from '../../components/admin/BookFormModals';

const ADMIN_SECRET = import.meta.env.VITE_ADMIN_API_SECRET;
const BOOKS_PAGE_SIZE = 10;

const COLUMN_CONFIG = [
  { key: 'category', label: 'Category' },
  { key: 'level', label: 'Level' },
  { key: 'stateUt', label: 'State/UT' },
  { key: 'conductingBody', label: 'Conducting Body' },
  { key: 'chapters', label: 'Chapters' },
  { key: 'linkedExams', label: 'Linked Exam Entries' },
];

const DEFAULT_VISIBLE_COLUMNS = {
  category: true,
  level: false,
  stateUt: false,
  conductingBody: false,
  chapters: true,
  linkedExams: true,
};

// No "All" tab -- Type is a required drill-down, same reasoning
// ExamsPage.jsx's Level field uses: the list shouldn't render every
// category unscoped, and a single active pill always makes it obvious
// which type is currently on screen.
const CATEGORY_TABS = [
  { value: 'Guide', label: 'Guide' },
  { value: 'Precis', label: 'Precis' },
  { value: 'Intro', label: 'Intro' },
];

// Unlike Type, most books have no Level tag yet -- "All Levels" is a
// real, useful state here (not an unscoped-render footgun), since Type
// already keeps the list bounded to one content type at a time.
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

const SORT_OPTIONS = [
  { value: 'issues', label: 'Most issues first' },
  { value: 'title', label: 'Title (A-Z)' },
];

// Page (and which Type tab was open) survive a browser refresh via
// sessionStorage -- per-tab, cleared when the tab closes, which is right
// for "stay where I was" without permanently squatting on localStorage.
// Switching tabs still resets to page 1 (see the isFirstPageResetRun guard
// below on the reset effect -- it only skips the reset on the initial
// mount that restores these values, not on a real tab click).
const STORAGE_KEY_CATEGORY = 'admin-books-category';
const STORAGE_KEY_PAGE = 'admin-books-page';
const readStoredCategory = () => {
  try { return sessionStorage.getItem(STORAGE_KEY_CATEGORY) || 'Guide'; } catch { return 'Guide'; }
};
const readStoredPage = () => {
  try {
    const saved = Number(sessionStorage.getItem(STORAGE_KEY_PAGE));
    return saved > 0 ? saved : 1;
  } catch { return 1; }
};

// Book browser/editor over resources (format='blocks') + R2 -- R2 is the
// only source of truth for book content, so there's no local filesystem
// involved anywhere in this feature and it works identically whether the
// admin site is running locally or deployed.
const BooksPage = () => {
  const navigate = useNavigate();
  const [booksByCategory, setBooksByCategory] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [category, setCategory] = useState(readStoredCategory);
  const [levelFilter, setLevelFilter] = useState('');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounced(search);
  const [sort, setSort] = useState('issues');
  const [showArchived, setShowArchived] = useState(false);
  const [page, setPage] = useState(readStoredPage);
  const [showNewModal, setShowNewModal] = useState(false);
  const [duplicateSource, setDuplicateSource] = useState(null);
  const [renameSource, setRenameSource] = useState(null);
  const [archiveSource, setArchiveSource] = useState(null);
  const [deleteSource, setDeleteSource] = useState(null);
  const [previewBook, setPreviewBook] = useState(null);
  const [selectedBookId, setSelectedBookId] = useState(null);
  const [linkExamsSource, setLinkExamsSource] = useState(null); // book to bulk-link exams to -- never offered for Intro, see the button's own guard below

  const transformText = (text, transformType) => {
    if (!text) return '';
    switch (transformType) {
      case 'uppercase':
        return text.toUpperCase();
      case 'sentence': {
        const lower = text.toLowerCase();
        return lower.charAt(0).toUpperCase() + lower.slice(1);
      }
      case 'lowercase':
        return text.toLowerCase();
      case 'titlecase':
        return text
          .toLowerCase()
          .split(' ')
          .map((word) => (word ? word.charAt(0).toUpperCase() + word.slice(1) : ''))
          .join(' ');
      case 'remove-hyphen':
        return text.replace(/-/g, ' ').replace(/\s+/g, ' ').trim();
      case 'remove-underscore':
        return text.replace(/_/g, ' ').replace(/\s+/g, ' ').trim();
      default:
        return text;
    }
  };

  const applyTextTransform = (transformType) => {
    const targetBook = selectedBookId
      ? paginated.find((b) => b.resourceId === selectedBookId) || (books || []).find((b) => b.resourceId === selectedBookId)
      : null;

    if (!targetBook) {
      alert('Please tap on a book title first to format it.');
      return;
    }

    const currentTitle = effectiveValue(targetBook, 'title');
    const newTitle = transformText(currentTitle, transformType);
    if (newTitle !== currentTitle) {
      updatePendingEdit(targetBook, 'title', newTitle);
    }
  };

  const [visibleColumns, setVisibleColumns] = useState(() => {
    try {
      const saved = localStorage.getItem('admin_books_visible_cols');
      if (saved) {
        return { ...DEFAULT_VISIBLE_COLUMNS, ...JSON.parse(saved) };
      }
    } catch (e) {}
    return DEFAULT_VISIBLE_COLUMNS;
  });
  const [showColPicker, setShowColPicker] = useState(false);
  const colPickerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (colPickerRef.current && !colPickerRef.current.contains(e.target)) {
        setShowColPicker(false);
      }
    };
    if (showColPicker) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showColPicker]);

  const toggleColumn = (colKey) => {
    setVisibleColumns((prev) => {
      const next = { ...prev, [colKey]: !prev[colKey] };
      try {
        localStorage.setItem('admin_books_visible_cols', JSON.stringify(next));
      } catch (e) {}
      return next;
    });
  };

  const resetColumns = () => {
    setVisibleColumns(DEFAULT_VISIBLE_COLUMNS);
    try {
      localStorage.setItem('admin_books_visible_cols', JSON.stringify(DEFAULT_VISIBLE_COLUMNS));
    } catch (e) {}
  };

  const showAllColumns = () => {
    const all = {
      category: true,
      level: true,
      stateUt: true,
      conductingBody: true,
      chapters: true,
      linkedExams: true,
    };
    setVisibleColumns(all);
    try {
      localStorage.setItem('admin_books_visible_cols', JSON.stringify(all));
    } catch (e) {}
  };

  // Every inline-editable tag (Category, Level, State/UT, Conducting Body)
  // is staged here per resourceId rather than written on each dropdown
  // change -- the user asked for one explicit "Save" per row so it's clear
  // when something actually commits to the DB, rather than each field
  // firing its own silent round trip.
  const [pendingEdits, setPendingEdits] = useState({});
  const [savingRowId, setSavingRowId] = useState(null);

  // Same lc_regions/lc_conducting_bodies tables ExamsPage.jsx already reads
  // for the identical Level->State/UT cascade and Conducting Body picker --
  // reused here so a book's tags line up with the same names exams use,
  // which is the whole point ("better mapping later").
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

  const fetchBooks = useCallback(async (targetCat = category, force = false) => {
    if (!force && booksByCategory[targetCat]) return;
    setLoading(true);
    try {
      const res = await fetch('/api/admin/save-resource', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-api-secret': ADMIN_SECRET },
        body: JSON.stringify({ type: 'books-list', category: targetCat }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setBooksByCategory((prev) => ({ ...prev, [targetCat]: data.books }));
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [category, booksByCategory]);

  useEffect(() => {
    fetchBooks(category);
  }, [category, fetchBooks]);

  const refreshCurrentCategory = useCallback(() => {
    fetchBooks(category, true);
  }, [category, fetchBooks]);

  const openInNewTab = useCallback((b) => {
    window.open(`/admin/books/${b.category}/${b.resourceId}`, '_blank');
  }, []);

  const books = booksByCategory[category] || null;

  const archivedCount = useMemo(() => (books || []).filter((b) => b.isArchived).length, [books]);

  const filtered = useMemo(() => {
    if (!books) return [];
    let list = books.filter((b) => (showArchived ? b.isArchived : !b.isArchived));
    if (levelFilter) list = list.filter((b) => b.level === levelFilter);
    if (debouncedSearch.trim()) {
      const q = debouncedSearch.trim().toLowerCase();
      list = list.filter((b) => b.title.toLowerCase().includes(q));
    }
    const issueScore = (b) => (b.issueCounts?.high || 0) * 1000 + (b.issueCounts?.medium || 0);
    return [...list].sort((a, b) => (sort === 'title' ? a.title.localeCompare(b.title) : issueScore(b) - issueScore(a)));
  }, [books, levelFilter, debouncedSearch, sort, showArchived]);

  // Reset to page 1 only when one of these actually CHANGES from its
  // previous value -- not merely "this effect has run before". A plain
  // "skip the first run" ref breaks under React 18 StrictMode (used in
  // main.jsx): dev mode intentionally mounts, discards, and remounts once,
  // running this effect twice on load with identical values -- a "have I
  // run before" flag would consume its skip on the throwaway first pass and
  // then fire a real reset on the second, wiping the just-restored page
  // straight back to 1 before the admin does anything. Comparing the actual
  // values sidesteps that: both StrictMode passes see the same values, so
  // neither looks like a change.
  const prevResetKeyRef = useRef(null);
  useEffect(() => {
    const key = JSON.stringify([category, levelFilter, debouncedSearch, sort, showArchived]);
    if (prevResetKeyRef.current === null) {
      prevResetKeyRef.current = key;
      return;
    }
    if (prevResetKeyRef.current !== key) {
      prevResetKeyRef.current = key;
      setPage(1);
    }
  }, [category, levelFilter, debouncedSearch, sort, showArchived]);

  useEffect(() => {
    try { sessionStorage.setItem(STORAGE_KEY_CATEGORY, category); } catch { /* storage unavailable -- fall back silently */ }
  }, [category]);
  useEffect(() => {
    try { sessionStorage.setItem(STORAGE_KEY_PAGE, String(page)); } catch { /* storage unavailable -- fall back silently */ }
  }, [page]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / BOOKS_PAGE_SIZE));
  // Only clamp once books have actually loaded -- while `books` is still
  // null, `filtered` is `[]` and totalPages is the placeholder value 1,
  // which would otherwise stomp a restored page (e.g. 6) back to 1 before
  // the real data ever arrives.
  useEffect(() => {
    if (books !== null && page > totalPages) setPage(totalPages);
  }, [books, totalPages, page]);
  const paginated = useMemo(() => {
    const from = (page - 1) * BOOKS_PAGE_SIZE;
    return filtered.slice(from, from + BOOKS_PAGE_SIZE);
  }, [filtered, page]);

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
      refreshCurrentCategory();
    } catch (err) {
      alert('Restore failed: ' + err.message);
    }
  };

  // Current on-screen value for a tag field -- the pending edit if the
  // Current on-screen value for an editable field (Title, Category, Level, State/UT, Conducting Body)
  const baseValue = (b, field) => {
    if (field === 'category') return b.category;
    if (field === 'title') return b.title;
    return b[field] || '';
  };
  const effectiveValue = (b, field) => {
    const pending = pendingEdits[b.resourceId];
    return pending && field in pending ? pending[field] : baseValue(b, field);
  };
  const hasPending = (b) => {
    const pending = pendingEdits[b.resourceId];
    if (!pending) return false;
    return Object.keys(pending).some((field) => pending[field] !== baseValue(b, field));
  };

  const updatePendingEdit = (b, field, value) => {
    setPendingEdits((prev) => {
      const next = { ...(prev[b.resourceId] || {}), [field]: value };
      // A book that's no longer State/UT-level doesn't keep a stale state tag.
      if (field === 'level' && value !== 'state' && value !== 'ut') next.stateUt = '';
      return { ...prev, [b.resourceId]: next };
    });
  };

  const handleDiscardRow = (b) => {
    setPendingEdits((prev) => {
      const next = { ...prev };
      delete next[b.resourceId];
      return next;
    });
  };

  // The one place any of Title/Category/Level/State-UT/Conducting Body actually
  // reaches the DB -- everything else just stages a local edit. Fixes the
  // "wrongly assigned to Precis when it's a Guide" case too: a category
  // change re-labels the book in place (content stays exactly where it is
  // in R2, see the API's own docstring) rather than requiring a delete-
  // and-recreate.
  const handleSaveRow = async (b) => {
    const pending = pendingEdits[b.resourceId];
    if (!pending) return;
    const patch = {};
    for (const field of Object.keys(pending)) {
      if (pending[field] !== baseValue(b, field)) {
        if (field === 'title' && !pending[field]?.trim()) {
          alert('Book title cannot be empty.');
          return;
        }
        patch[field] = pending[field] || (field === 'category' ? b.category : null);
      }
    }
    if (Object.keys(patch).length === 0) { handleDiscardRow(b); return; }

    if (patch.category && patch.category !== b.category && b.duplicateRowCount > 1) {
      const ok = window.confirm(`"${b.title}" has ${b.duplicateRowCount} linked exam entries. Moving it to ${patch.category} re-labels all of them. Continue?`);
      if (!ok) return;
    }

    setSavingRowId(b.resourceId);
    try {
      const res = await fetch('/api/admin/save-resource', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-api-secret': ADMIN_SECRET },
        body: JSON.stringify({ type: 'books-save-tags', resourceId: b.resourceId, ...patch }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || 'Failed to save changes');
      setBooksByCategory((prev) => {
        const next = { ...prev };
        if (patch.category && patch.category !== b.category) {
          if (next[b.category]) {
            next[b.category] = next[b.category].filter((x) => x.resourceId !== b.resourceId);
          }
          delete next[patch.category];
        } else if (next[b.category]) {
          next[b.category] = next[b.category].map((x) => (x.resourceId === b.resourceId ? {
            ...x,
            title: patch.title ? patch.title.trim() : x.title,
            category: patch.category ?? x.category,
            level: 'level' in patch ? patch.level : x.level,
            stateUt: 'stateUt' in patch ? patch.stateUt : x.stateUt,
            conductingBody: 'conductingBody' in patch ? patch.conductingBody : x.conductingBody,
          } : x));
        }
        return next;
      });
      handleDiscardRow(b);
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
          <h2>{showArchived ? 'Archived Books' : 'Book Content'}</h2>
        </div>
      </div>

      <div className="lc-filter-bar-single">
        <div className="lc-filter-field lc-filter-search lc-search-input-wrapper">
          <Search size={16} />
          <input type="text" placeholder="Search book title..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="lc-filter-field">
          <label>Type</label>
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
          <label>Level</label>
          <select value={levelFilter} onChange={(e) => setLevelFilter(e.target.value)} style={{ padding: '0.6rem 0.75rem', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface-alt)', color: 'var(--admin-text)' }}>
            {LEVEL_FILTER_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div className="lc-filter-field">
          <label>Format Title</label>
          <select
            value=""
            onChange={(e) => {
              if (e.target.value) {
                applyTextTransform(e.target.value);
              }
            }}
            title={selectedBookId ? 'Transform the title of the selected book' : 'Tap on a book title first to format it'}
            style={{
              padding: '0.6rem 0.75rem',
              borderRadius: 8,
              border: selectedBookId ? '1px solid var(--admin-accent)' : '1px solid var(--border)',
              background: 'var(--surface-alt)',
              color: selectedBookId ? 'var(--admin-text)' : 'var(--admin-text-muted)',
              cursor: 'pointer',
            }}
          >
            <option value="" disabled>
              {selectedBookId ? '— Format Title —' : '— Tap a book first —'}
            </option>
            <option value="uppercase">CAPITAL CASE</option>
            <option value="sentence">sentence case</option>
            <option value="lowercase">smallcase</option>
            <option value="titlecase">Title Case</option>
            <option value="remove-hyphen">Remove Hyphen</option>
            <option value="remove-underscore">Remove Underscore</option>
          </select>
        </div>
        <div className="lc-filter-field">
          <label>Sort</label>
          <select value={sort} onChange={(e) => setSort(e.target.value)} style={{ padding: '0.6rem 0.75rem', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface-alt)', color: 'var(--admin-text)' }}>
            {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>

        {/* Columns filter dropdown */}
        <div className="lc-col-picker-wrapper" ref={colPickerRef}>
          <button
            type="button"
            className="lc-btn"
            onClick={() => setShowColPicker((prev) => !prev)}
            title="Choose which columns to show or hide"
            style={showColPicker ? { borderColor: 'var(--admin-accent)', color: 'var(--admin-accent)' } : undefined}
          >
            <Columns3 size={15} /> Columns
          </button>
          {showColPicker && (
            <div className="lc-col-picker-menu">
              <div className="lc-col-picker-header">
                <span>Display Columns</span>
              </div>
              {COLUMN_CONFIG.map((col) => (
                <label key={col.key} className="lc-col-picker-item">
                  <input
                    type="checkbox"
                    checked={!!visibleColumns[col.key]}
                    onChange={() => toggleColumn(col.key)}
                  />
                  <span>{col.label}</span>
                </label>
              ))}
              <div className="lc-col-picker-actions">
                <button type="button" className="lc-col-picker-action-btn" onClick={resetColumns}>
                  Reset
                </button>
                <button type="button" className="lc-col-picker-action-btn" onClick={showAllColumns}>
                  Show All
                </button>
              </div>
            </div>
          )}
        </div>

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

      {error && <div className="lc-empty-state">Failed to load books: {error}</div>}

      <div className="lc-table-responsive">
        <table className="lc-table">
          <thead>
            <tr>
              <th className="lc-col-book">Book</th>
              {visibleColumns.category && <th className="lc-col-nowrap">Category</th>}
              {visibleColumns.level && <th className="lc-col-nowrap">Level</th>}
              {visibleColumns.stateUt && <th className="lc-col-nowrap">State/UT</th>}
              {visibleColumns.conductingBody && <th style={{ minWidth: '150px', maxWidth: '220px' }}>Conducting Body</th>}
              {visibleColumns.chapters && <th style={{ textAlign: 'right' }}>Chapters</th>}
              {visibleColumns.linkedExams && <th className="lc-col-nowrap" style={{ textAlign: 'right' }}>Linked Exam Entries</th>}
              <th className="lc-col-nowrap"></th>
            </tr>
          </thead>
          <tbody>
            {paginated.map((b) => (
              <tr key={b.resourceId}>
                <td className="lc-col-book">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                    <input
                      type="text"
                      value={effectiveValue(b, 'title')}
                      disabled={savingRowId === b.resourceId}
                      onFocus={() => setSelectedBookId(b.resourceId)}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedBookId(b.resourceId);
                      }}
                      onChange={(e) => {
                        setSelectedBookId(b.resourceId);
                        updatePendingEdit(b, 'title', e.target.value);
                      }}
                      placeholder="Book title..."
                      title="Click to edit or format title"
                      style={{
                        padding: '0.35rem 0.55rem',
                        borderRadius: 6,
                        border: selectedBookId === b.resourceId ? '1px solid var(--admin-accent)' : '1px solid var(--border)',
                        background: selectedBookId === b.resourceId ? 'rgba(16, 185, 129, 0.08)' : 'var(--surface-alt)',
                        color: 'var(--admin-text)',
                        fontSize: '0.84rem',
                        fontWeight: 700,
                        width: '100%',
                        boxSizing: 'border-box',
                        transition: 'border-color 0.15s, background 0.15s',
                      }}
                    />
                    {b.isArchived && (
                      <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#b45309', background: '#fffbeb', border: '1px solid #fef3c7', padding: '0.1rem 0.4rem', borderRadius: 4, flexShrink: 0 }}>
                        Archived
                      </span>
                    )}
                  </div>
                </td>
                {visibleColumns.category && (
                  <td className="lc-col-nowrap" onClick={(e) => e.stopPropagation()}>
                    <select
                      value={effectiveValue(b, 'category')}
                      disabled={savingRowId === b.resourceId}
                      onChange={(e) => updatePendingEdit(b, 'category', e.target.value)}
                      title="Change this book's category"
                      style={{ padding: '0.35rem 0.5rem', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface-alt)', color: 'var(--admin-text)', fontSize: '0.82rem' }}
                    >
                      {CATEGORY_TABS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </td>
                )}
                {visibleColumns.level && (
                  <td className="lc-col-nowrap" onClick={(e) => e.stopPropagation()}>
                    <select
                      value={effectiveValue(b, 'level')}
                      disabled={savingRowId === b.resourceId}
                      onChange={(e) => updatePendingEdit(b, 'level', e.target.value)}
                      title="Tag this book's level"
                      style={{ padding: '0.35rem 0.5rem', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface-alt)', color: 'var(--admin-text)', fontSize: '0.82rem' }}
                    >
                      {LEVEL_TAG_OPTIONS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </td>
                )}
                {visibleColumns.stateUt && (
                  <td className="lc-col-nowrap" onClick={(e) => e.stopPropagation()}>
                    {(() => {
                      const currentLevel = effectiveValue(b, 'level');
                      if (currentLevel !== 'state' && currentLevel !== 'ut') {
                        return <span className="lc-table-sub">—</span>;
                      }
                      const options = regions.filter((r) => r.level === currentLevel);
                      return (
                        <select
                          value={effectiveValue(b, 'stateUt')}
                          disabled={savingRowId === b.resourceId}
                          onChange={(e) => updatePendingEdit(b, 'stateUt', e.target.value)}
                          title="Tag which state/UT"
                          style={{ padding: '0.35rem 0.5rem', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface-alt)', color: 'var(--admin-text)', fontSize: '0.82rem' }}
                        >
                          <option value="">— Untagged</option>
                          {options.map((r) => <option key={r.id} value={r.name}>{r.name}</option>)}
                        </select>
                      );
                    })()}
                  </td>
                )}
                {visibleColumns.conductingBody && (
                  <td onClick={(e) => e.stopPropagation()} style={{ minWidth: '150px', maxWidth: '220px' }}>
                    <Select
                      searchable
                      placeholder="— None"
                      value={effectiveValue(b, 'conductingBody')}
                      onChange={(e) => updatePendingEdit(b, 'conductingBody', e.target.value)}
                      options={[{ value: '', label: '— None' }, ...conductingBodies.map((cb) => ({ value: cb.name, label: cb.name }))]}
                    />
                  </td>
                )}
                {visibleColumns.chapters && (
                  <td style={{ textAlign: 'right' }}><span className="lc-count-pill">{b.chapterCount ?? '—'}</span></td>
                )}
                {visibleColumns.linkedExams && (
                  <td className="lc-col-nowrap" style={{ textAlign: 'right' }}>
                    <span className="lc-count-pill" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                      <Link2 size={11} />{b.duplicateRowCount}
                    </span>
                  </td>
                )}
                <td className="lc-col-nowrap" onClick={(e) => e.stopPropagation()}>
                  <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end' }}>
                    {hasPending(b) && (
                      <>
                        <button
                          className="lc-btn primary"
                          title="Save changes to the database"
                          disabled={savingRowId === b.resourceId}
                          onClick={() => handleSaveRow(b)}
                          style={{ padding: '0.35rem 0.7rem', fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                        >
                          <Save size={13} /> {savingRowId === b.resourceId ? 'Saving…' : 'Save'}
                        </button>
                        <button
                          className="lc-icon-btn"
                          title="Discard unsaved changes"
                          disabled={savingRowId === b.resourceId}
                          onClick={() => handleDiscardRow(b)}
                        >
                          <X size={14} />
                        </button>
                      </>
                    )}
                    <button
                      className="lc-icon-btn"
                      title="Preview book content"
                      onClick={(e) => {
                        e.stopPropagation();
                        setPreviewBook(b);
                      }}
                      style={{ color: '#0284c7' }}
                    >
                      <Eye size={14} />
                    </button>
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
                    <button
                      className="lc-icon-btn"
                      title={b.category === 'Intro' ? "Intro can only link to one exam — use Publish Content or the exam's own Resources panel instead" : 'Link this book to exams in bulk'}
                      disabled={b.category === 'Intro'}
                      onClick={() => setLinkExamsSource(b)}
                      style={{ color: b.category === 'Intro' ? undefined : '#7c3aed' }}
                    >
                      <Link2 size={14} />
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

      {filtered.length > 0 && (
        <div className="lc-pagination-bar">
          <span className="lc-pagination-info">{filtered.length} book{filtered.length === 1 ? '' : 's'}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button className="lc-pagination-btn" disabled={page === 1} onClick={() => setPage((p) => p - 1)} title="Previous page">
              <ChevronLeft size={14} />
            </button>
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
            <button className="lc-pagination-btn" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)} title="Next page">
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}

      {showNewModal && (
        <NewBookModal
          onClose={() => setShowNewModal(false)}
          onCreated={(cat, resourceId, newTitle) => {
            setShowNewModal(false);
            setBooksByCategory((prev) => {
              const next = { ...prev };
              delete next[cat];
              return next;
            });
            navigate(`/admin/books/${cat}/${resourceId}`, { state: { bookTitle: newTitle } });
          }}
        />
      )}
      {duplicateSource && (
        <DuplicateBookModal
          source={duplicateSource}
          onClose={() => setDuplicateSource(null)}
          onDuplicated={(cat, resourceId, newTitle) => {
            setDuplicateSource(null);
            setBooksByCategory((prev) => {
              const next = { ...prev };
              delete next[cat];
              return next;
            });
            navigate(`/admin/books/${cat}/${resourceId}`, { state: { bookTitle: newTitle } });
          }}
        />
      )}
      {renameSource && (
        <RenameBookModal
          book={renameSource}
          onClose={() => setRenameSource(null)}
          onRenamed={() => { setRenameSource(null); refreshCurrentCategory(); }}
        />
      )}
      {archiveSource && (
        <ConfirmArchiveModal
          book={archiveSource}
          onClose={() => setArchiveSource(null)}
          onArchived={() => { setArchiveSource(null); refreshCurrentCategory(); }}
        />
      )}
      {deleteSource && (
        <ConfirmDeleteModal
          book={deleteSource}
          onClose={() => setDeleteSource(null)}
          onDeleted={() => { setDeleteSource(null); refreshCurrentCategory(); }}
        />
      )}

      {linkExamsSource && (
        <LinkExamsDrawer
          book={linkExamsSource}
          onClose={() => setLinkExamsSource(null)}
          onLinked={(addedCount) => {
            setBooksByCategory((prev) => {
              const catBooks = prev[linkExamsSource.category];
              if (!catBooks) return prev;
              return {
                ...prev,
                [linkExamsSource.category]: catBooks.map((x) => (
                  x.resourceId === linkExamsSource.resourceId
                    ? { ...x, duplicateRowCount: x.duplicateRowCount + addedCount }
                    : x
                )),
              };
            });
            setLinkExamsSource(null);
          }}
        />
      )}

      {previewBook && (
        <div className="lc-drawer-backdrop" onClick={() => setPreviewBook(null)}>
          <div
            className="lc-drawer-panel"
            style={{ width: '100vw', height: '100vh', maxWidth: 'none', display: 'flex', flexDirection: 'column' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="lc-drawer-header">
              <div>
                <h3>{previewBook.title || 'Book Preview'}</h3>
                <p>{previewBook.category} • {previewBook.chapterCount ?? 1} chapter{previewBook.chapterCount === 1 ? '' : 's'}</p>
              </div>
              <button className="lc-close-btn" onClick={() => setPreviewBook(null)}><X size={20} /></button>
            </div>
            <AdminResourcePreview resourceId={previewBook.resourceId} />
          </div>
        </div>
      )}
    </div>
  );
};

export default BooksPage;
