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

  const [counting, setCounting] = useState(false);
  const [bookMatches, setBookMatches] = useState(null);
  const [replacing, setReplacing] = useState(false);
  const [replaceResult, setReplaceResult] = useState(null);
  const [error, setError] = useState(null);

  const searchInputRef = useRef(null);

  useEffect(() => {
    searchInputRef.current?.focus();
  }, []);

  // Instant count for active chapter (0ms)
  const chapterMatches = useMemo(() => {
    if (!findText.trim() || !currentChapterData) return 0;
    try {
      const escaped = findText.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escaped, 'gi');
      return countMatches(currentChapterData, regex);
    } catch {
      return 0;
    }
  }, [findText, currentChapterData]);

  // Fast server-side count across the whole book (single 150ms request)
  useEffect(() => {
    if (chapterOnly || !book?.resourceId || !findText.trim()) {
      setBookMatches(null);
      setCounting(false);
      return;
    }

    let isMounted = true;
    setCounting(true);

    const timer = setTimeout(async () => {
      try {
        const res = await fetch('/api/admin/save-resource', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-admin-api-secret': ADMIN_SECRET },
          body: JSON.stringify({
            type: 'books-find-count',
            resourceId: book.resourceId,
            find: findText.trim(),
            scope: 'all',
          }),
        });
        const data = await res.json();
        if (isMounted) {
          if (res.ok && data.ok) {
            setBookMatches(data.totalMatches);
          } else {
            setBookMatches(0);
          }
        }
      } catch {
        if (isMounted) setBookMatches(0);
      } finally {
        if (isMounted) setCounting(false);
      }
    }, 200);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [findText, chapterOnly, book?.resourceId]);

  const activeMatches = chapterOnly ? chapterMatches : (bookMatches ?? 0);

  const handleExecuteReplace = async () => {
    if (!findText.trim() || replacing || counting) return;
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
          find: findText.trim(),
          replace: replaceText,
          scope: chapterOnly ? 'chapter' : 'all',
          chapterFileName: chapterOnly ? activeChapterMeta?.file_name : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || `HTTP ${res.status}`);

      setReplaceResult(data);
      setBookMatches(0);
      onSuccess?.(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setReplacing(false);
    }
  };

  const isButtonDisabled = replacing || counting || !findText.trim() || activeMatches === 0;

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
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', color: '#059669', fontSize: '0.85rem', fontWeight: 600 }}>
              <CheckCircle2 size={16} style={{ color: '#059669', flexShrink: 0 }} />
              <span>{replaceText ? 'Successfully replaced' : 'Successfully deleted'}</span>
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
              onKeyDown={(e) => { if (e.key === 'Enter' && !isButtonDisabled) handleExecuteReplace(); }}
            />
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: '#334155', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={chapterOnly}
              onChange={(e) => { setChapterOnly(e.target.checked); setReplaceResult(null); }}
            />
            Only this chapter{activeChapterMeta?.order ? ` (Ch ${activeChapterMeta.order})` : ''}
          </label>

          {findText.trim() && (
            <div style={{ fontSize: '0.82rem', fontWeight: 600 }}>
              {counting ? (
                <span style={{ color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <Loader2 size={13} className="animate-spin" /> Counting matches…
                </span>
              ) : activeMatches > 0 ? (
                <span style={{ color: '#15803d' }}>
                  {activeMatches} match{activeMatches === 1 ? '' : 'es'} found {chapterOnly ? 'in this chapter' : 'across book'}
                </span>
              ) : (
                <span style={{ color: '#94a3b8' }}>No matches found</span>
              )}
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
            disabled={isButtonDisabled}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.45rem',
              padding: '0.55rem 1.35rem',
              background: !isButtonDisabled ? '#1F3A2E' : '#94a3b8',
              color: 'white', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: '0.82rem',
              cursor: !isButtonDisabled ? 'pointer' : 'not-allowed',
            }}
          >
            {replacing ? (
              <><Loader2 size={15} className="animate-spin" /> Replacing…</>
            ) : (
              <><Replace size={15} /> {chapterOnly ? 'Replace in Chapter' : 'Replace All'} {activeMatches > 0 && !counting ? `(${activeMatches})` : ''}</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default FindReplaceModal;
