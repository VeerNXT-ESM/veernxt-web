import { useState, useEffect, useMemo, useRef } from 'react';
import { X, Replace, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

const ADMIN_SECRET = import.meta.env.VITE_ADMIN_API_SECRET;

const backdropStyle = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(15,23,42,0.6)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
  padding: '1rem',
};

const cardStyle = {
  background: 'white',
  borderRadius: 14,
  width: 480,
  maxWidth: '100%',
  boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  overflow: 'hidden',
};

const headerStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '1.1rem 1.4rem',
  borderBottom: '1px solid #e2e8f0',
};

const bodyStyle = {
  padding: '1.3rem 1.4rem',
  display: 'flex',
  flexDirection: 'column',
  gap: '0.9rem',
};

const footerStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'flex-end',
  gap: '0.6rem',
  padding: '1rem 1.4rem',
  borderTop: '1px solid #e2e8f0',
  background: '#f8fafc',
};

const labelStyle = {
  fontSize: '0.75rem',
  fontWeight: 700,
  color: '#475569',
  display: 'block',
  marginBottom: '0.35rem',
};

const inputStyle = {
  width: '100%',
  padding: '0.65rem 0.85rem',
  border: '1px solid #cbd5e1',
  borderRadius: 8,
  fontSize: '0.9rem',
  boxSizing: 'border-box',
  fontFamily: 'inherit',
  color: '#0f172a',
  background: '#f8fafc',
  outline: 'none',
};

// Counts case-insensitive matches inside any chapter/metadata JSON, same
// walk the server does (skips id/type/order) -- so the count shown here
// matches what will actually get replaced.
function countMatches(obj, regex) {
  let count = 0;
  function walk(node) {
    if (typeof node === 'string') {
      const found = node.match(regex);
      if (found) count += found.length;
      return;
    }
    if (Array.isArray(node)) {
      node.forEach(walk);
      return;
    }
    if (node && typeof node === 'object') {
      for (const [k, v] of Object.entries(node)) {
        if (k === 'id' || k === 'type' || k === 'order') continue;
        walk(v);
      }
    }
  }
  walk(obj);
  return count;
}

/**
 * Simple find & replace for a book's content -- one Find field, one
 * Replace field, an optional "just this chapter" checkbox, a live match
 * count, and a single Replace All button. No case/whole-word toggles and
 * no per-match preview list; the server (books-find-replace) still does a
 * plain case-insensitive substring replace either way.
 */
export const FindReplaceModal = ({
  book,
  metadata,
  activeChapterMeta,
  currentChapterData,
  onClose,
  onSuccess,
}) => {
  const [findText, setFindText] = useState('');
  const [replaceText, setReplaceText] = useState('');
  const [chapterOnly, setChapterOnly] = useState(false);

  const [scanning, setScanning] = useState(false);
  const [chaptersCache, setChaptersCache] = useState({});
  const [replacing, setReplacing] = useState(false);
  const [replaceResult, setReplaceResult] = useState(null);
  const [error, setError] = useState(null);

  const searchInputRef = useRef(null);

  useEffect(() => {
    searchInputRef.current?.focus();
  }, []);

  // Pre-populate chapters cache with current chapter if available
  useEffect(() => {
    if (activeChapterMeta?.file_name && currentChapterData) {
      setChaptersCache((prev) => ({ ...prev, [activeChapterMeta.file_name]: currentChapterData }));
    }
  }, [activeChapterMeta, currentChapterData]);

  // Load all chapters into cache when searching across the whole book
  useEffect(() => {
    if (!book?.storageBaseUrl || !metadata?.chapters || !findText.trim() || chapterOnly) return;

    let isMounted = true;
    const missing = metadata.chapters.filter((c) => !chaptersCache[c.file_name]);
    if (missing.length === 0) return;

    (async () => {
      setScanning(true);
      try {
        const fetched = {};
        await Promise.all(
          missing.map(async (c) => {
            try {
              const res = await fetch(`${book.storageBaseUrl}${c.file_name}`);
              if (res.ok) fetched[c.file_name] = await res.json();
            } catch {
              // Ignore single chapter fetch failure during scan preview
            }
          })
        );
        if (isMounted) setChaptersCache((prev) => ({ ...prev, ...fetched }));
      } finally {
        if (isMounted) setScanning(false);
      }
    })();

    return () => { isMounted = false; };
  }, [book, metadata, findText, chapterOnly, chaptersCache]);

  const totalMatches = useMemo(() => {
    if (!findText.trim()) return 0;
    try {
      const escaped = findText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escaped, 'gi');

      const targetChapters = chapterOnly && activeChapterMeta
        ? (metadata?.chapters || []).filter((c) => c.file_name === activeChapterMeta.file_name)
        : metadata?.chapters || [];

      let total = 0;
      for (const chap of targetChapters) {
        const data = chaptersCache[chap.file_name];
        if (data) total += countMatches(data, regex);
      }
      return total;
    } catch {
      return 0;
    }
  }, [findText, chapterOnly, activeChapterMeta, metadata, chaptersCache]);

  const handleExecuteReplace = async () => {
    if (!findText.trim()) return;
    setReplacing(true);
    setError(null);
    setReplaceResult(null);

    try {
      const res = await fetch('/api/admin/save-resource', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-api-secret': ADMIN_SECRET },
        body: JSON.stringify({
          type: 'books-find-replace',
          resourceId: book.resourceId,
          find: findText,
          replace: replaceText,
          scope: chapterOnly ? 'chapter' : 'all',
          chapterFileName: chapterOnly ? activeChapterMeta?.file_name : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || `HTTP ${res.status}`);

      setReplaceResult(data);
      setChaptersCache({}); // reload fresh with updated text next time
      onSuccess?.(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setReplacing(false);
    }
  };

  return (
    <div style={backdropStyle} onClick={onClose}>
      <div style={cardStyle} onClick={(e) => e.stopPropagation()}>
        <div style={headerStyle}>
          <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>Find &amp; Replace</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: '0.3rem', borderRadius: 6 }}>
            <X size={20} />
          </button>
        </div>

        <div style={bodyStyle}>
          {error && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', borderRadius: 8, padding: '0.75rem 1rem', fontSize: '0.82rem' }}>
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          {replaceResult && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', background: '#ecfdf5', border: '1px solid #a7f3d0', color: '#065f46', borderRadius: 8, padding: '0.85rem 1.1rem', fontSize: '0.85rem', fontWeight: 600 }}>
              <CheckCircle2 size={18} style={{ color: '#059669', flexShrink: 0 }} />
              <div>
                Replaced <strong>{replaceResult.totalReplacements}</strong> occurrence(s) across{' '}
                <strong>{replaceResult.chaptersModified}</strong> chapter(s).
              </div>
            </div>
          )}

          <div>
            <label style={labelStyle}>Find</label>
            <input
              ref={searchInputRef}
              type="text"
              style={inputStyle}
              placeholder="Text to find"
              value={findText}
              onChange={(e) => { setFindText(e.target.value); setReplaceResult(null); }}
            />
          </div>

          <div>
            <label style={labelStyle}>Replace with</label>
            <input
              type="text"
              style={inputStyle}
              placeholder="Replacement text (leave empty to delete)"
              value={replaceText}
              onChange={(e) => { setReplaceText(e.target.value); setReplaceResult(null); }}
              onKeyDown={(e) => { if (e.key === 'Enter' && totalMatches > 0 && !replacing) handleExecuteReplace(); }}
            />
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: '#334155', cursor: 'pointer' }}>
            <input type="checkbox" checked={chapterOnly} onChange={(e) => setChapterOnly(e.target.checked)} />
            Only this chapter{activeChapterMeta?.order ? ` (Ch ${activeChapterMeta.order})` : ''}
          </label>

          {findText.trim() && (
            <div style={{ fontSize: '0.82rem', color: totalMatches > 0 ? '#15803d' : '#64748b', fontWeight: 600 }}>
              {scanning ? 'Scanning…' : `${totalMatches} match${totalMatches === 1 ? '' : 'es'} found`}
            </div>
          )}
        </div>

        <div style={footerStyle}>
          <button
            type="button"
            onClick={onClose}
            disabled={replacing}
            style={{ padding: '0.55rem 1.1rem', background: 'white', color: '#64748b', border: '1px solid #e2e8f0', borderRadius: 8, fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer' }}
          >
            {replaceResult ? 'Close' : 'Cancel'}
          </button>
          <button
            type="button"
            onClick={handleExecuteReplace}
            disabled={replacing || totalMatches === 0 || !findText.trim()}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.45rem',
              padding: '0.55rem 1.35rem',
              background: totalMatches > 0 && findText.trim() ? '#1F3A2E' : '#94a3b8',
              color: 'white', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: '0.82rem',
              cursor: totalMatches > 0 && findText.trim() && !replacing ? 'pointer' : 'not-allowed',
            }}
          >
            {replacing ? (
              <><Loader2 size={15} className="animate-spin" /> Replacing…</>
            ) : (
              <><Replace size={15} /> Replace All ({totalMatches})</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default FindReplaceModal;
