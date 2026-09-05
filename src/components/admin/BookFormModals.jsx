import { useState } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';

const ADMIN_SECRET = import.meta.env.VITE_ADMIN_API_SECRET;

// Phase 3 of the book-content-editor plan: New Book / Duplicate Book
// modals. Styled with plain inline styles (not the lc-* / AdminCMS.css
// classes) on purpose -- those classes' CSS variables are scoped to
// `.admin-shell`, but this modal is also opened from BookChapterBrowser.jsx,
// which is a standalone full-page route outside AdminShell (same as
// AdminContentEditor.jsx) and never loads that stylesheet.

const backdropStyle = { position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' };
const cardStyle = { background: 'white', borderRadius: 14, width: 520, maxWidth: '100%', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.3)', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' };
const headerStyle = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.1rem 1.4rem', borderBottom: '1px solid #e2e8f0' };
const bodyStyle = { padding: '1.4rem', display: 'flex', flexDirection: 'column', gap: '0.9rem' };
const footerStyle = { display: 'flex', justifyContent: 'flex-end', gap: '0.6rem', padding: '1rem 1.4rem', borderTop: '1px solid #e2e8f0' };
const labelStyle = { fontSize: '0.75rem', fontWeight: 700, color: '#64748b', display: 'block', marginBottom: '0.3rem' };
const fieldStyle = { width: '100%', padding: '0.6rem 0.75rem', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: '0.88rem', boxSizing: 'border-box', fontFamily: 'inherit' };
const btnPrimary = { padding: '0.55rem 1.2rem', background: '#1F3A2E', color: 'white', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer' };
const btnSecondary = { padding: '0.55rem 1.2rem', background: 'white', color: '#64748b', border: '1px solid #e2e8f0', borderRadius: 8, fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer' };
const errorStyle = { background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', borderRadius: 8, padding: '0.6rem 0.85rem', fontSize: '0.8rem' };

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

const ModalShell = ({ title, onClose, children, footer }) => (
  <div style={backdropStyle} onClick={onClose}>
    <div style={cardStyle} onClick={(e) => e.stopPropagation()}>
      <div style={headerStyle}>
        <h3 style={{ margin: 0, fontSize: '1.05rem', color: '#0f172a' }}>{title}</h3>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}><X size={20} /></button>
      </div>
      <div style={bodyStyle}>{children}</div>
      <div style={footerStyle}>{footer}</div>
    </div>
  </div>
);

export const NewBookModal = ({ onClose, onCreated }) => {
  const [category, setCategory] = useState('Guide');
  const [title, setTitle] = useState('');
  const [folder, setFolder] = useState('');
  const [folderTouched, setFolderTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const handleTitleChange = (v) => {
    setTitle(v);
    if (!folderTouched) setFolder(v.trim());
  };

  const handleCreate = async () => {
    if (!title.trim() || !folder.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const data = await postBooksAction({ type: 'books-create', category, folder: folder.trim(), title: title.trim() });
      onCreated(data.category, data.folder);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalShell
      title="New Book"
      onClose={onClose}
      footer={<>
        <button style={btnSecondary} onClick={onClose} disabled={saving}>Cancel</button>
        <button style={{ ...btnPrimary, opacity: title.trim() && folder.trim() ? 1 : 0.5 }} onClick={handleCreate} disabled={saving || !title.trim() || !folder.trim()}>
          {saving ? 'Creating…' : 'Create Book'}
        </button>
      </>}
    >
      {error && <div style={errorStyle}>{error}</div>}
      <div>
        <label style={labelStyle}>Category</label>
        <select style={fieldStyle} value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="Guide">Guide</option>
          <option value="Precis">Precis</option>
        </select>
      </div>
      <div>
        <label style={labelStyle}>Title</label>
        <input type="text" style={fieldStyle} value={title} onChange={(e) => handleTitleChange(e.target.value)} placeholder="e.g. Uttarakhand GS" autoFocus />
      </div>
      <div>
        <label style={labelStyle}>Folder name (public/books/{category}/…)</label>
        <input type="text" style={fieldStyle} value={folder} onChange={(e) => { setFolder(e.target.value); setFolderTouched(true); }} />
      </div>
      <p style={{ fontSize: '0.78rem', color: '#94a3b8', margin: 0 }}>Creates a blank book with one empty chapter — you'll write content in the chapter editor.</p>
    </ModalShell>
  );
};

export const DuplicateBookModal = ({ source, onClose, onDuplicated }) => {
  const [destCategory, setDestCategory] = useState(source.category);
  const [destFolder, setDestFolder] = useState(`${source.folder}_copy`);
  const [newTitle, setNewTitle] = useState(`${source.title} (Copy)`);
  const [findReplace, setFindReplace] = useState([{ find: '', replace: '' }]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const updatePair = (idx, patch) => setFindReplace((prev) => prev.map((p, i) => (i === idx ? { ...p, ...patch } : p)));
  const removePair = (idx) => setFindReplace((prev) => prev.filter((_, i) => i !== idx));
  const addPair = () => setFindReplace((prev) => [...prev, { find: '', replace: '' }]);

  const handleDuplicate = async () => {
    if (!destFolder.trim() || !newTitle.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const data = await postBooksAction({
        type: 'books-duplicate',
        sourceCategory: source.category,
        sourceFolder: source.folder,
        destCategory,
        destFolder: destFolder.trim(),
        newTitle: newTitle.trim(),
        findReplace: findReplace.filter((p) => p.find.trim()),
      });
      onDuplicated(data.category, data.folder);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalShell
      title={`Duplicate "${source.title}"`}
      onClose={onClose}
      footer={<>
        <button style={btnSecondary} onClick={onClose} disabled={saving}>Cancel</button>
        <button style={{ ...btnPrimary, opacity: destFolder.trim() && newTitle.trim() ? 1 : 0.5 }} onClick={handleDuplicate} disabled={saving || !destFolder.trim() || !newTitle.trim()}>
          {saving ? 'Duplicating…' : 'Duplicate Book'}
        </button>
      </>}
    >
      {error && <div style={errorStyle}>{error}</div>}
      <div>
        <label style={labelStyle}>Destination category</label>
        <select style={fieldStyle} value={destCategory} onChange={(e) => setDestCategory(e.target.value)}>
          <option value="Guide">Guide</option>
          <option value="Precis">Precis</option>
        </select>
      </div>
      <div>
        <label style={labelStyle}>New title</label>
        <input type="text" style={fieldStyle} value={newTitle} onChange={(e) => setNewTitle(e.target.value)} autoFocus />
      </div>
      <div>
        <label style={labelStyle}>Destination folder name</label>
        <input type="text" style={fieldStyle} value={destFolder} onChange={(e) => setDestFolder(e.target.value)} />
      </div>
      <div>
        <label style={labelStyle}>Find &amp; replace across all chapters (optional)</label>
        <p style={{ fontSize: '0.76rem', color: '#94a3b8', margin: '0 0 0.5rem' }}>Useful for state-variant books — e.g. replace "Bihar" with "Jharkhand" everywhere in the clone.</p>
        {findReplace.map((pair, idx) => (
          <div key={idx} style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.4rem' }}>
            <input type="text" style={fieldStyle} placeholder="Find" value={pair.find} onChange={(e) => updatePair(idx, { find: e.target.value })} />
            <input type="text" style={fieldStyle} placeholder="Replace with" value={pair.replace} onChange={(e) => updatePair(idx, { replace: e.target.value })} />
            <button type="button" onClick={() => removePair(idx)} style={{ ...btnSecondary, padding: '0.4rem 0.6rem' }}><Trash2 size={14} /></button>
          </div>
        ))}
        <button type="button" onClick={addPair} style={{ ...btnSecondary, fontSize: '0.75rem', padding: '0.35rem 0.7rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
          <Plus size={13} /> Add replacement
        </button>
      </div>
    </ModalShell>
  );
};

export const ConfirmDeleteModal = ({ book, onClose, onDeleted }) => {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [confirmText, setConfirmText] = useState('');

  const handleDelete = async () => {
    setSaving(true);
    setError(null);
    try {
      await postBooksAction({ type: 'books-delete', category: book.category, folder: book.folder });
      onDeleted();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalShell
      title="Delete book"
      onClose={onClose}
      footer={<>
        <button style={btnSecondary} onClick={onClose} disabled={saving}>Cancel</button>
        <button
          style={{ ...btnPrimary, background: confirmText === book.folder ? '#dc2626' : '#fca5a5', cursor: confirmText === book.folder ? 'pointer' : 'not-allowed' }}
          onClick={handleDelete} disabled={saving || confirmText !== book.folder}
        >
          {saving ? 'Deleting…' : 'Delete Permanently'}
        </button>
      </>}
    >
      {error && <div style={errorStyle}>{error}</div>}
      <p style={{ margin: 0, fontSize: '0.88rem', color: '#334155' }}>
        This permanently deletes <strong>{book.category}/{book.folder}</strong> ("{book.title}") from disk. This cannot be undone unless it was already committed to git.
      </p>
      <div>
        <label style={labelStyle}>Type the folder name to confirm: <code>{book.folder}</code></label>
        <input type="text" style={fieldStyle} value={confirmText} onChange={(e) => setConfirmText(e.target.value)} autoFocus />
      </div>
    </ModalShell>
  );
};

// Phase 4: pushes the book's current local JSON to R2 and upserts its
// resources_v2 row(s) -- the one action in this whole editor that reaches
// past the local machine into the live app, so it gets its own explicit
// confirm step rather than living behind the same click as Save.
export const PublishModal = ({ book, onClose, onPublished }) => {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  const handlePublish = async () => {
    setSaving(true);
    setError(null);
    try {
      const data = await postBooksAction({ type: 'books-publish', category: book.category, folder: book.folder });
      setResult(data);
      onPublished?.(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalShell
      title={result ? 'Published' : `Publish "${book.title}" to R2`}
      onClose={onClose}
      footer={result ? (
        <>
          {result.resourceId && (
            <a href={`/reader/${result.resourceId}`} target="_blank" rel="noreferrer" style={{ ...btnSecondary, textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>
              View Live
            </a>
          )}
          <button style={btnPrimary} onClick={onClose}>Done</button>
        </>
      ) : (
        <>
          <button style={btnSecondary} onClick={onClose} disabled={saving}>Cancel</button>
          <button style={btnPrimary} onClick={handlePublish} disabled={saving}>{saving ? 'Publishing…' : 'Publish to R2'}</button>
        </>
      )}
    >
      {error && <div style={errorStyle}>{error}</div>}
      {!result ? (
        <>
          <p style={{ margin: 0, fontSize: '0.88rem', color: '#334155' }}>
            This uploads every chapter and image in <strong>{book.category}/{book.folder}</strong> to Cloudflare R2 and updates its resources_v2 database row(s) — the same thing <code>node scripts/sync_books_to_r2.mjs --execute</code> does, scoped to just this book.
          </p>
          <p style={{ margin: 0, fontSize: '0.82rem', color: '#b45309', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: '0.6rem 0.85rem' }}>
            This is the one action here that reaches the live app — candidates using this resource will see the update immediately.
          </p>
        </>
      ) : (
        <>
          <p style={{ margin: 0, fontSize: '0.88rem', color: '#166534', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '0.6rem 0.85rem' }}>
            Uploaded {result.chapterCount} chapter{result.chapterCount === 1 ? '' : 's'} and {result.imageCount} image{result.imageCount === 1 ? '' : 's'}.
          </p>
          <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
            <div><strong>Storage:</strong> {result.storageBaseUrl}</div>
            {result.resourceId && <div><strong>Resource ID:</strong> {result.resourceId}</div>}
            {result.group === 'consolidated' && <div style={{ color: '#b45309', marginTop: '0.4rem' }}>Note: multiple existing database rows for this title were consolidated to one storage location.</div>}
          </div>
        </>
      )}
    </ModalShell>
  );
};
