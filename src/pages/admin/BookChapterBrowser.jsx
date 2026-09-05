import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, AlertTriangle, RefreshCw, Pencil, Eye, Save, X, Copy, Trash2 } from 'lucide-react';
import { BlockRenderer } from '../../components/book/BlockRenderer';
import { ChapterHeader } from '../../components/book/BookBlocks';
import '../../components/book/BookBlocks.css';
import BlockEditForm, { BlockTypePicker, createBlock, genBlockId } from '../../components/admin/BlockEditForm';
import { DuplicateBookModal, ConfirmDeleteModal } from '../../components/admin/BookFormModals';

const ADMIN_SECRET = import.meta.env.VITE_ADMIN_API_SECRET;

const SEVERITY_STYLE = {
  high: { border: '#dc2626', bg: '#fef2f2', label: '#b91c1c' },
  medium: { border: '#d97706', bg: '#fffbeb', label: '#b45309' },
  low: { border: '#94a3b8', bg: '#f8fafc', label: '#64748b' },
};

const cloneBlocks = (blocks) => JSON.parse(JSON.stringify(blocks || []));

async function postBooksAction(body) {
  const res = await fetch('/api/admin/save-resource', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-admin-api-secret': ADMIN_SECRET },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok || !data.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

// Full-page chapter browser/editor for one book. R2 is the only source of
// truth for book content -- this reads metadata.json/chapter JSON straight
// from the book's storage_base_url (a public R2 URL, same as the
// candidate-facing reader fetches from) and saves go straight back to R2,
// so there's no local filesystem step and no separate "Publish" action:
// Save Chapter *is* live immediately. Lives outside AdminShell, same as
// AdminContentEditor.jsx, since a chapter sidebar + content pane wants the
// full viewport width.
const BookChapterBrowser = () => {
  const { category, book: resourceId } = useParams();
  const navigate = useNavigate();
  const [book, setBook] = useState(null); // { resourceId, title, category, storageBaseUrl }
  const [bookError, setBookError] = useState(null);
  const [metadata, setMetadata] = useState(null);
  const [issues, setIssues] = useState([]);
  const [activeOrder, setActiveOrder] = useState(null);
  const [chapterData, setChapterData] = useState(null);
  const [chapterLoading, setChapterLoading] = useState(false);
  const [chapterError, setChapterError] = useState(null);

  const [mode, setMode] = useState('preview'); // 'preview' | 'edit'
  const [editTitle, setEditTitle] = useState('');
  const [editBlocks, setEditBlocks] = useState([]);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [topPickerOpen, setTopPickerOpen] = useState(false);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem('admin_session')) navigate('/admin/login');
  }, [navigate]);

  useEffect(() => {
    // Reset immediately -- resourceId changing means a full navigation to a
    // different book (e.g. after Duplicate/New Book), and this component
    // instance stays mounted across that route change.
    setBook(null);
    setMetadata(null);
    setActiveOrder(null);
    setBookError(null);
    (async () => {
      try {
        const data = await postBooksAction({ type: 'books-get', resourceId });
        setBook(data);
        const meta = await fetch(`${data.storageBaseUrl}metadata.json`).then((r) => {
          if (!r.ok) throw new Error(`HTTP ${r.status}`);
          return r.json();
        });
        setMetadata(meta);
        const chapters = meta.chapters || [];
        if (chapters.length > 0) setActiveOrder(chapters[0].order);
      } catch (err) {
        setBookError(err.message);
      }
    })();
  }, [resourceId]);

  useEffect(() => {
    if (!book) return;
    (async () => {
      try {
        const data = await postBooksAction({ type: 'books-issues', category: book.category, title: book.title });
        setIssues(data.issues || []);
      } catch {
        // QA report is a nice-to-have overlay -- browsing still works without it
      }
    })();
  }, [book]);

  const issuesByChapterFile = useMemo(() => {
    const map = {};
    for (const iss of issues) {
      const key = iss.chapterFile;
      if (!key) continue;
      if (!map[key]) map[key] = [];
      map[key].push(iss);
    }
    return map;
  }, [issues]);

  const issuesByBlockId = useMemo(() => {
    const map = {};
    for (const iss of issues) {
      if (!iss.blockId) continue;
      const key = `${iss.chapterFile}::${iss.blockId}`;
      if (!map[key]) map[key] = [];
      map[key].push(iss);
    }
    return map;
  }, [issues]);

  const activeChapterMeta = useMemo(
    () => metadata?.chapters?.find((c) => c.order === activeOrder),
    [metadata, activeOrder],
  );

  useEffect(() => {
    if (!activeChapterMeta || !book) return;
    (async () => {
      setChapterLoading(true);
      setChapterError(null);
      setChapterData(null);
      setMode('preview');
      setDirty(false);
      setSaveError(null);
      try {
        const res = await fetch(`${book.storageBaseUrl}${activeChapterMeta.file_name}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setChapterData(data);
      } catch (err) {
        setChapterError(err.message);
      } finally {
        setChapterLoading(false);
      }
    })();
  }, [activeChapterMeta, book]);

  const selectChapter = (order) => {
    if (dirty && !window.confirm('Discard unsaved changes to this chapter?')) return;
    setActiveOrder(order);
  };

  const enterEditMode = () => {
    setEditTitle(chapterData.title || '');
    setEditBlocks(cloneBlocks(chapterData.blocks));
    setDirty(false);
    setSaveError(null);
    setMode('edit');
  };

  const cancelEdit = () => {
    if (dirty && !window.confirm('Discard unsaved changes to this chapter?')) return;
    setMode('preview');
  };

  const markDirty = (nextBlocks) => { setEditBlocks(nextBlocks); setDirty(true); };

  const updateBlock = (idx, updated) => markDirty(editBlocks.map((b, i) => (i === idx ? updated : b)));
  const deleteBlock = (idx) => markDirty(editBlocks.filter((_, i) => i !== idx));
  const duplicateBlock = (idx) => {
    const copy = { ...JSON.parse(JSON.stringify(editBlocks[idx])), id: genBlockId() };
    const next = [...editBlocks];
    next.splice(idx + 1, 0, copy);
    markDirty(next);
  };
  const moveBlock = (idx, dir) => {
    const next = [...editBlocks];
    const target = idx + dir;
    if (target < 0 || target >= next.length) return;
    [next[idx], next[target]] = [next[target], next[idx]];
    markDirty(next);
  };
  const insertBlockAt = (idx, type) => {
    const next = [...editBlocks];
    next.splice(idx, 0, createBlock(type));
    markDirty(next);
  };

  const saveChapter = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      const payload = { id: chapterData.id, title: editTitle, order: chapterData.order, blocks: editBlocks };
      await postBooksAction({ type: 'books-save-chapter', resourceId: book.resourceId, fileName: activeChapterMeta.file_name, chapterData: payload });

      setChapterData(payload);
      setMetadata((prev) => ({
        ...prev,
        chapters: prev.chapters.map((c) => (c.file_name === activeChapterMeta.file_name ? { ...c, title: editTitle, blocks_count: editBlocks.length } : c)),
      }));
      setDirty(false);
      setMode('preview');
    } catch (err) {
      setSaveError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const chapterLevelIssues = activeChapterMeta
    ? (issuesByChapterFile[activeChapterMeta.file_name.replace('chapters/', '')] || []).filter((i) => !i.blockId)
    : [];

  return (
    <div style={{ minHeight: '100vh', background: '#f4f5f7', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem 2rem', background: 'white', borderBottom: '1px solid #e2e8f0', position: 'sticky', top: 0, zIndex: 50 }}>
        <button onClick={() => { if (dirty && !window.confirm('Discard unsaved changes?')) return; navigate('/admin/books'); }} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'transparent', border: 'none', color: '#64748b', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}>
          <ArrowLeft size={18} /> Book Content
        </button>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: '1.15rem', margin: 0, fontWeight: 800, color: '#0f172a' }}>{book?.title || resourceId}</h1>
          <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>{category}</div>
        </div>
        {issues.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: '#b91c1c', fontWeight: 700 }}>
            <AlertTriangle size={16} /> {issues.filter((i) => i.severity === 'high').length} high · {issues.filter((i) => i.severity === 'medium').length} medium
          </div>
        )}
        {book && mode === 'preview' && (
          <>
            <button onClick={() => setShowDuplicateModal(true)} title="Duplicate this book" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 0.85rem', background: 'white', color: '#64748b', border: '1px solid #e2e8f0', borderRadius: 8, fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer' }}>
              <Copy size={14} /> Duplicate
            </button>
            <button onClick={() => setShowDeleteModal(true)} title="Delete this book" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 0.85rem', background: 'white', color: '#dc2626', border: '1px solid #fecaca', borderRadius: 8, fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer' }}>
              <Trash2 size={14} /> Delete
            </button>
          </>
        )}
        {chapterData && mode === 'preview' && (
          <button onClick={enterEditMode} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 1rem', background: '#1F3A2E', color: 'white', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer' }}>
            <Pencil size={14} /> Edit Chapter
          </button>
        )}
        {mode === 'edit' && (
          <>
            <button onClick={cancelEdit} disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 1rem', background: 'white', color: '#64748b', border: '1px solid #e2e8f0', borderRadius: 8, fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer' }}>
              <X size={14} /> Cancel
            </button>
            <button onClick={saveChapter} disabled={saving || !dirty} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 1.25rem', background: dirty ? '#1F3A2E' : '#cbd5e1', color: 'white', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: '0.8rem', cursor: dirty ? 'pointer' : 'not-allowed' }}>
              <Save size={14} /> {saving ? 'Saving…' : 'Save Chapter'}
            </button>
          </>
        )}
      </div>

      {bookError && <div style={{ padding: '2rem' }}>Failed to load this book: {bookError}</div>}

      {metadata && book && (
        <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', minHeight: 'calc(100vh - 65px)' }}>
          <aside style={{ borderRight: '1px solid #e2e8f0', background: 'white', overflowY: 'auto', padding: '0.75rem' }}>
            {(metadata.chapters || []).map((c) => {
              const chapterIssues = issuesByChapterFile[c.file_name.replace('chapters/', '')] || [];
              const highCount = chapterIssues.filter((i) => i.severity === 'high').length;
              const mediumCount = chapterIssues.filter((i) => i.severity === 'medium').length;
              return (
                <div
                  key={c.order}
                  onClick={() => selectChapter(c.order)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.55rem 0.6rem', borderRadius: 8, cursor: 'pointer', marginBottom: '0.25rem',
                    background: activeOrder === c.order ? '#eef2eb' : 'transparent',
                    border: activeOrder === c.order ? '1px solid rgba(75,107,50,0.2)' : '1px solid transparent',
                  }}
                >
                  <div style={{ width: 22, height: 22, borderRadius: 100, background: activeOrder === c.order ? '#4b6b32' : '#f1f5f9', color: activeOrder === c.order ? 'white' : '#475569', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 700, flexShrink: 0 }}>
                    {c.order}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.title}</div>
                    <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{c.blocks_count} blocks</div>
                  </div>
                  {highCount > 0 && <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#b91c1c', background: '#fef2f2', borderRadius: 4, padding: '0.1rem 0.4rem' }}>{highCount}</span>}
                  {highCount === 0 && mediumCount > 0 && <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#b45309', background: '#fffbeb', borderRadius: 4, padding: '0.1rem 0.4rem' }}>{mediumCount}</span>}
                </div>
              );
            })}
          </aside>

          <main style={{ padding: '2rem', overflowY: 'auto' }}>
            <div style={{ background: 'white', borderRadius: 16, padding: '2rem', boxShadow: '0 2px 20px rgba(0,0,0,0.04)', border: '1px solid #e8eaed', maxWidth: 820, margin: '0 auto' }}>
              {chapterLoading && <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}><RefreshCw className="animate-spin" size={24} /></div>}
              {chapterError && <p>Unable to load this chapter ({chapterError}).</p>}

              {chapterData && !chapterLoading && mode === 'preview' && (
                <>
                  <ChapterHeader title={chapterData.title} order={chapterData.order} />
                  {chapterLevelIssues.length > 0 && (
                    <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '0.85rem 1rem', marginBottom: '1.25rem' }}>
                      <strong style={{ color: '#b91c1c', fontSize: '0.82rem' }}>Chapter-level issues</strong>
                      <ul style={{ margin: '0.4rem 0 0', paddingLeft: '1.1rem', fontSize: '0.78rem', color: '#7f1d1d' }}>
                        {chapterLevelIssues.map((iss, i) => <li key={i}>{iss.issue}: {iss.detail}</li>)}
                      </ul>
                    </div>
                  )}
                  {(chapterData.blocks || []).map((block, idx) => {
                    const blockIssues = issuesByBlockId[`${activeChapterMeta.file_name.replace('chapters/', '')}::${block.id}`] || [];
                    const worst = blockIssues.find((i) => i.severity === 'high') || blockIssues[0];
                    const style = worst ? SEVERITY_STYLE[worst.severity] : null;
                    return (
                      <div
                        key={block.id || idx}
                        style={style ? { border: `1.5px dashed ${style.border}`, background: style.bg, borderRadius: 8, padding: '0.6rem 0.75rem', marginBottom: '0.5rem' } : undefined}
                      >
                        {blockIssues.length > 0 && (
                          <div style={{ fontSize: '0.7rem', fontWeight: 800, color: SEVERITY_STYLE[worst.severity].label, marginBottom: '0.3rem', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                            <AlertTriangle size={11} style={{ verticalAlign: '-1px', marginRight: 4 }} />
                            {blockIssues.map((i) => i.issue).join(', ')}
                          </div>
                        )}
                        <BlockRenderer block={block} />
                      </div>
                    );
                  })}
                  {(chapterData.blocks || []).length === 0 && <p style={{ color: '#94a3b8' }}>This chapter has no blocks.</p>}
                </>
              )}

              {chapterData && !chapterLoading && mode === 'edit' && (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', color: '#4b6b32', fontSize: '0.78rem', fontWeight: 700 }}>
                    <Eye size={14} /> Edit mode — Save Chapter publishes these changes immediately.
                  </div>
                  {saveError && (
                    <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', borderRadius: 8, padding: '0.6rem 0.85rem', marginBottom: '1rem', fontSize: '0.8rem' }}>
                      Save failed: {saveError}
                    </div>
                  )}
                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748b', display: 'block', marginBottom: '0.25rem' }}>Chapter title</label>
                    <input
                      type="text" value={editTitle}
                      onChange={(e) => { setEditTitle(e.target.value); setDirty(true); }}
                      style={{ width: '100%', padding: '0.6rem 0.75rem', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: '0.95rem', fontWeight: 700, boxSizing: 'border-box' }}
                    />
                  </div>

                  {editBlocks.length === 0 && <p style={{ color: '#94a3b8' }}>This chapter has no blocks yet.</p>}

                  {editBlocks.map((block, idx) => (
                    <BlockEditForm
                      key={block.id || idx}
                      block={block}
                      onChange={(updated) => updateBlock(idx, updated)}
                      onDelete={() => deleteBlock(idx)}
                      onDuplicate={() => duplicateBlock(idx)}
                      onMoveUp={() => moveBlock(idx, -1)}
                      onMoveDown={() => moveBlock(idx, 1)}
                      canMoveUp={idx > 0}
                      canMoveDown={idx < editBlocks.length - 1}
                      onInsertAfter={(type) => insertBlockAt(idx + 1, type)}
                    />
                  ))}

                  <div style={{ marginTop: '0.75rem' }}>
                    {topPickerOpen ? (
                      <BlockTypePicker onPick={(type) => { insertBlockAt(editBlocks.length, type); setTopPickerOpen(false); }} onCancel={() => setTopPickerOpen(false)} />
                    ) : (
                      <button
                        type="button" onClick={() => setTopPickerOpen(true)}
                        style={{ width: '100%', padding: '0.6rem', border: '1px dashed #cbd5e1', borderRadius: 8, background: 'transparent', color: '#64748b', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer' }}
                      >
                        + Add block at end
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          </main>
        </div>
      )}

      {showDuplicateModal && book && (
        <DuplicateBookModal
          source={book}
          onClose={() => setShowDuplicateModal(false)}
          onDuplicated={(cat, newResourceId) => { setShowDuplicateModal(false); navigate(`/admin/books/${cat}/${newResourceId}`); }}
        />
      )}
      {showDeleteModal && book && (
        <ConfirmDeleteModal
          book={book}
          onClose={() => setShowDeleteModal(false)}
          onDeleted={() => navigate('/admin/books')}
        />
      )}
    </div>
  );
};

export default BookChapterBrowser;
