import { useMemo, useState } from 'react';
import { X, Search, ArrowRightLeft, AlertTriangle, CheckCircle2 } from 'lucide-react';

const ADMIN_SECRET = import.meta.env.VITE_ADMIN_API_SECRET;

// Inline styles on purpose (same reason as BookFormModals.jsx): the card must
// look the same regardless of AdminShell's theme variables.
const backdrop = { position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' };
const card = { background: '#fff', color: '#0f172a', borderRadius: 14, width: 640, maxWidth: '100%', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.3)', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' };
const header = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.1rem 1.4rem', borderBottom: '1px solid #e2e8f0' };
const body = { padding: '1.2rem 1.4rem', display: 'flex', flexDirection: 'column', gap: '0.8rem' };
const footer = { display: 'flex', justifyContent: 'flex-end', gap: '0.6rem', padding: '1rem 1.4rem', borderTop: '1px solid #e2e8f0' };
const btnPrimary = { padding: '0.55rem 1.2rem', background: '#1F3A2E', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer' };
const btnSecondary = { padding: '0.55rem 1.2rem', background: '#fff', color: '#64748b', border: '1px solid #e2e8f0', borderRadius: 8, fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer' };
const errorBox = { background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', borderRadius: 8, padding: '0.6rem 0.85rem', fontSize: '0.8rem' };
const warnBox = { background: '#fffbeb', border: '1px solid #fde68a', color: '#92400e', borderRadius: 8, padding: '0.6rem 0.85rem', fontSize: '0.8rem', display: 'flex', gap: 8 };

async function post(payload) {
  const res = await fetch('/api/admin/save-resource', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-admin-api-secret': ADMIN_SECRET },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

// "Computer Science 2026 NEW" and "Computer Science" share a stem, so the
// reparsed copy of a live book floats to the top of the list.
const stem = (t) => String(t || '').toLowerCase().replace(/\b2026\b|\bnew\b|\(replaced[^)]*\)/g, '').replace(/[^a-z0-9]+/g, ' ').trim();

export default function ReplaceWithExistingModal({ book, allBooks, onClose, onReplaced }) {
  const [search, setSearch] = useState('');
  const [showLive, setShowLive] = useState(false);
  const [picked, setPicked] = useState(null);
  const [renameToOld, setRenameToOld] = useState(true);
  const [plan, setPlan] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [done, setDone] = useState(null);

  const candidates = useMemo(() => {
    const s = search.trim().toLowerCase();
    const oldStem = stem(book.title);
    return (allBooks || [])
      .filter((b) => b.category === book.category && b.resourceId !== book.resourceId)
      .filter((b) => showLive || b.isArchived)
      .filter((b) => !s || b.title.toLowerCase().includes(s))
      .map((b) => ({ ...b, similar: stem(b.title) === oldStem }))
      .sort((a, b) => Number(b.similar) - Number(a.similar) || a.title.localeCompare(b.title));
  }, [allBooks, book, search, showLive]);

  const preview = async (candidate, rename = renameToOld) => {
    setPicked(candidate);
    setPlan(null);
    setError(null);
    setBusy(true);
    try {
      const out = await post({ type: 'books-replace-with-existing', oldResourceId: book.resourceId, newResourceId: candidate.resourceId, renameToOld: rename, dryRun: true });
      setPlan(out.plan);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const execute = async () => {
    setBusy(true);
    setError(null);
    try {
      const out = await post({ type: 'books-replace-with-existing', oldResourceId: book.resourceId, newResourceId: picked.resourceId, renameToOld, dryRun: false });
      setDone(out);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={backdrop} onClick={onClose}>
      <div style={card} onClick={(e) => e.stopPropagation()}>
        <div style={header}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 800, fontSize: '1rem' }}>
            <ArrowRightLeft size={18} /> Replace with an existing book
          </div>
          <button type="button" onClick={onClose} style={{ border: 0, background: 'transparent', cursor: 'pointer', color: '#64748b' }} aria-label="Close"><X size={18} /></button>
        </div>

        {done ? (
          <>
            <div style={body}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', color: '#15803d', fontWeight: 700 }}><CheckCircle2 size={18} /> Replaced.</div>
              <div style={{ fontSize: '0.85rem', lineHeight: 1.6 }}>
                <strong>{done.plan.newTitle}</strong> is now live{done.plan.rename ? <> as <strong>{done.plan.rename.newBookTitle}</strong></> : null}, serving {done.plan.linksRepointed} exam{done.plan.linksRepointed === 1 ? '' : 's'}.
                The old book was archived{done.plan.rename ? <> as <strong>{done.plan.rename.oldBookTitle}</strong></> : null}.
              </div>
              {done.logKey
                ? <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Rollback log saved to R2: <code>{done.logKey}</code></div>
                : <div style={warnBox}><AlertTriangle size={16} /> The rollback log could not be written to R2. Note the numbers above before closing.</div>}
            </div>
            <div style={footer}><button type="button" style={btnPrimary} onClick={onReplaced}>Done</button></div>
          </>
        ) : (
          <>
            <div style={body}>
              <div style={{ fontSize: '0.85rem' }}>
                Replace <strong>{book.title}</strong> ({book.category}, {book.linkedExamCount ?? 0} linked exam{book.linkedExamCount === 1 ? '' : 's'}) with a book that is already in the system.
                Its exams move to the new book and the old one is archived.
              </div>

              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <div style={{ position: 'relative', flex: 1 }}>
                  <Search size={14} style={{ position: 'absolute', left: 10, top: 11, color: '#94a3b8' }} />
                  <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search books…"
                    style={{ width: '100%', padding: '0.55rem 0.75rem 0.55rem 2rem', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: '0.85rem', boxSizing: 'border-box', color: '#0f172a', background: '#fff' }} />
                </div>
                <label style={{ fontSize: '0.78rem', display: 'flex', gap: 6, alignItems: 'center', whiteSpace: 'nowrap' }}>
                  <input type="checkbox" checked={showLive} onChange={(e) => setShowLive(e.target.checked)} /> Include live books
                </label>
              </div>

              <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, maxHeight: 240, overflowY: 'auto' }}>
                {candidates.length === 0 && <div style={{ padding: '1rem', fontSize: '0.82rem', color: '#64748b' }}>No matching {showLive ? '' : 'archived/draft '}books.</div>}
                {candidates.map((c) => (
                  <button key={c.resourceId} type="button" onClick={() => preview(c)} disabled={busy}
                    style={{ display: 'flex', width: '100%', textAlign: 'left', gap: 10, alignItems: 'center', padding: '0.55rem 0.8rem', border: 0, borderBottom: '1px solid #f1f5f9', background: picked?.resourceId === c.resourceId ? '#ecfdf5' : '#fff', color: '#0f172a', cursor: 'pointer', fontSize: '0.84rem' }}>
                    <span style={{ flex: 1 }}>{c.title}</span>
                    {c.similar && <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#15803d', background: '#dcfce7', borderRadius: 99, padding: '1px 8px' }}>likely match</span>}
                    <span style={{ fontSize: '0.72rem', color: '#64748b' }}>{c.chapterCount ?? '?'} ch · {c.isArchived ? 'draft' : 'live'}</span>
                  </button>
                ))}
              </div>

              {picked && (
                <label style={{ fontSize: '0.8rem', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                  <input type="checkbox" checked={renameToOld} style={{ marginTop: 3 }}
                    onChange={(e) => { setRenameToOld(e.target.checked); preview(picked, e.target.checked); }} />
                  <span>Give the new book the old book&apos;s title (the old book is renamed “… (replaced date)” so the two never share a title).</span>
                </label>
              )}

              {busy && !plan && <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Checking…</div>}
              {error && <div style={errorBox}>{error}</div>}

              {plan && (
                <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: '0.8rem 1rem', fontSize: '0.82rem', lineHeight: 1.7, background: '#f8fafc' }}>
                  <div style={{ fontWeight: 800, marginBottom: 4 }}>What will happen</div>
                  <div>• <strong>{plan.newTitle}</strong> ({plan.newChapters ?? '?'} chapters, {plan.newRowCount} row{plan.newRowCount === 1 ? '' : 's'}) is published{plan.rename ? <> and renamed to <strong>{plan.rename.newBookTitle}</strong></> : null}.</div>
                  <div>• <strong>{plan.oldTitle}</strong> ({plan.oldChapters ?? '?'} chapters, {plan.oldRowCount} row{plan.oldRowCount === 1 ? '' : 's'}) is archived{plan.rename ? <> as <strong>{plan.rename.oldBookTitle}</strong></> : null}.</div>
                  <div>• {plan.linksRepointed} exam link{plan.linksRepointed === 1 ? '' : 's'} move to the new book{plan.linksDropped ? `; ${plan.linksDropped} duplicate link${plan.linksDropped === 1 ? '' : 's'} removed` : ''}.</div>
                  {plan.tagsCopied.length > 0 && <div>• Copied from the old book: {plan.tagsCopied.join(', ')}.</div>}
                  {plan.warnings.map((w) => <div key={w} style={{ ...warnBox, marginTop: 6 }}><AlertTriangle size={16} style={{ flexShrink: 0 }} /> {w}</div>)}
                </div>
              )}
            </div>
            <div style={footer}>
              <button type="button" style={btnSecondary} onClick={onClose}>Cancel</button>
              <button type="button" style={{ ...btnPrimary, opacity: plan && !busy ? 1 : 0.5 }} disabled={!plan || busy} onClick={execute}>
                {busy && plan ? 'Replacing…' : 'Replace book'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
