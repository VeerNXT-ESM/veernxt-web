import { useState, useEffect, useMemo } from 'react';
import { X, RefreshCw, CheckCircle2, AlertCircle, Search, Layers, ArrowRight } from 'lucide-react';
import { normTitle, syncBookPairLinks } from '../../lib/resourceDuplicates';

const ADMIN_SECRET = import.meta.env.VITE_ADMIN_API_SECRET;

export default function BatchSyncBooksModal({ onClose, onCompleted }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pairs, setPairs] = useState([]);
  const [filterDiffOnly, setFilterDiffOnly] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedTitles, setSelectedTitles] = useState(new Set());
  const [syncing, setSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState({ current: 0, total: 0, currentTitle: '' });
  const [syncResults, setSyncResults] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const loadPairs = async () => {
      setLoading(true);
      setError(null);
      try {
        const [guideRes, precisRes] = await Promise.all([
          fetch('/api/admin/save-resource', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-admin-api-secret': ADMIN_SECRET },
            body: JSON.stringify({ type: 'books-list', category: 'Guide' }),
          }),
          fetch('/api/admin/save-resource', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-admin-api-secret': ADMIN_SECRET },
            body: JSON.stringify({ type: 'books-list', category: 'Precis' }),
          }),
        ]);

        const [guideData, precisData] = await Promise.all([guideRes.json(), precisRes.json()]);
        if (!guideData.ok) throw new Error(guideData.error || 'Failed to load Guides');
        if (!precisData.ok) throw new Error(precisData.error || 'Failed to load Precis');

        const guides = (guideData.books || []).filter((b) => !b.isArchived);
        const precis = (precisData.books || []).filter((b) => !b.isArchived);

        // Map Precis by normalized title
        const precisByNorm = new Map();
        for (const p of precis) {
          const norm = normTitle(p.title);
          if (norm && !precisByNorm.has(norm)) {
            precisByNorm.set(norm, p);
          }
        }

        const matchedPairs = [];
        for (const g of guides) {
          const norm = normTitle(g.title);
          const p = precisByNorm.get(norm);
          if (p) {
            const guideCount = g.linkedExamCount ?? 0;
            const precisCount = p.linkedExamCount ?? 0;
            matchedPairs.push({
              key: norm,
              title: g.title,
              guide: g,
              precis: p,
              guideCount,
              precisCount,
              isSynced: guideCount === precisCount && guideCount > 0,
            });
          }
        }

        matchedPairs.sort((a, b) => {
          if (a.isSynced !== b.isSynced) return a.isSynced ? 1 : -1;
          return a.title.localeCompare(b.title);
        });

        if (!cancelled) {
          setPairs(matchedPairs);
          // Pre-select all pairs that differ
          const initialSelected = new Set(matchedPairs.filter((p) => !p.isSynced).map((p) => p.key));
          setSelectedTitles(initialSelected);
        }
      } catch (err) {
        if (!cancelled) setError(err.message || 'Failed to load books');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadPairs();
    return () => { cancelled = true; };
  }, []);

  const filteredPairs = useMemo(() => {
    let list = pairs;
    if (filterDiffOnly) {
      list = list.filter((p) => !p.isSynced);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((p) => p.title.toLowerCase().includes(q));
    }
    return list;
  }, [pairs, filterDiffOnly, search]);

  const toggleSelect = (key) => {
    setSelectedTitles((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const selectAll = () => {
    setSelectedTitles(new Set(filteredPairs.map((p) => p.key)));
  };

  const deselectAll = () => {
    setSelectedTitles(new Set());
  };

  const handleStartSync = async () => {
    const toSync = pairs.filter((p) => selectedTitles.has(p.key));
    if (toSync.length === 0) return;

    setSyncing(true);
    setSyncProgress({ current: 0, total: toSync.length, currentTitle: '' });
    setError(null);

    let completed = 0;
    let totalAdded = 0;
    const errors = [];

    for (const pair of toSync) {
      setSyncProgress({ current: completed + 1, total: toSync.length, currentTitle: pair.title });
      try {
        const res = await syncBookPairLinks(pair.guide, pair.precis);
        totalAdded += (res.guideAdded || 0) + (res.precisAdded || 0);
      } catch (err) {
        console.error(`Failed to sync "${pair.title}":`, err);
        errors.push({ title: pair.title, error: err.message });
      }
      completed += 1;
    }

    setSyncing(false);
    setSyncResults({
      completedCount: completed - errors.length,
      totalCount: toSync.length,
      totalAdded,
      errors,
    });
  };

  return (
    <div className="lc-drawer-backdrop" onClick={() => !syncing && onClose()}>
      <div
        className="lc-drawer-panel"
        style={{ width: 'min(720px, 95vw)', height: '85vh', maxHeight: '800px', display: 'flex', flexDirection: 'column' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="lc-drawer-header">
          <div>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Layers size={18} style={{ color: 'var(--admin-accent, #3b82f6)' }} />
              Sync Same-Named Guide &amp; Precis Links
            </h3>
            <p>Automatically match Guide &amp; Precis books by title and synchronize their linked exams.</p>
          </div>
          {!syncing && <button className="lc-close-btn" onClick={onClose}><X size={20} /></button>}
        </div>

        <div className="lc-drawer-body" style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          {error && (
            <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', borderRadius: '8px', padding: '0.75rem', color: '#ef4444', fontSize: '0.85rem' }}>
              {error}
            </div>
          )}

          {loading ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--admin-text-muted)' }}>
              <RefreshCw className="animate-spin" size={24} style={{ margin: '0 auto 0.75rem' }} />
              <div>Analyzing Guide and Precis book pairs...</div>
            </div>
          ) : syncResults ? (
            <div style={{ textAlign: 'center', padding: '2.5rem 1rem' }}>
              <CheckCircle2 size={48} style={{ color: '#10b981', margin: '0 auto 1rem' }} />
              <h3 style={{ margin: '0 0 0.5rem 0' }}>Synchronization Complete!</h3>
              <p style={{ color: 'var(--admin-text-muted)', fontSize: '0.9rem', maxWidth: '450px', margin: '0 auto 1.5rem' }}>
                Successfully synchronized {syncResults.completedCount} of {syncResults.totalCount} book pairs ({syncResults.totalAdded} new exam links created).
              </p>
              {syncResults.errors?.length > 0 && (
                <div style={{ textAlign: 'left', background: 'var(--surface-alt)', borderRadius: '8px', padding: '0.75rem', margin: '1rem auto', maxWidth: '500px', fontSize: '0.8rem' }}>
                  <div style={{ fontWeight: 600, color: '#ef4444', marginBottom: '0.4rem' }}>Errors encountered ({syncResults.errors.length}):</div>
                  {syncResults.errors.map((e, idx) => (
                    <div key={idx} style={{ color: 'var(--admin-text-muted)' }}>• {e.title}: {e.error}</div>
                  ))}
                </div>
              )}
              <button
                type="button"
                className="lc-btn-primary"
                onClick={() => {
                  onCompleted?.();
                  onClose();
                }}
              >
                Done
              </button>
            </div>
          ) : (
            <>
              {/* Stats Bar */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
                <div style={{ background: 'var(--surface-alt)', border: '1px solid var(--border)', borderRadius: '8px', padding: '0.75rem', textAlign: 'center' }}>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--admin-text)' }}>{pairs.length}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--admin-text-muted)' }}>Matching Pairs Found</div>
                </div>
                <div style={{ background: 'var(--surface-alt)', border: '1px solid var(--border)', borderRadius: '8px', padding: '0.75rem', textAlign: 'center' }}>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#ef4444' }}>{pairs.filter((p) => !p.isSynced).length}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--admin-text-muted)' }}>Differ / Need Sync</div>
                </div>
                <div style={{ background: 'var(--surface-alt)', border: '1px solid var(--border)', borderRadius: '8px', padding: '0.75rem', textAlign: 'center' }}>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#10b981' }}>{pairs.filter((p) => p.isSynced).length}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--admin-text-muted)' }}>Already in Sync</div>
                </div>
              </div>

              {/* Controls */}
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
                <div className="lc-search-input-wrapper" style={{ flex: 1, minWidth: '200px' }}>
                  <Search size={15} />
                  <input
                    type="text"
                    placeholder="Search matching pairs..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                  {search && (
                    <button type="button" onClick={() => setSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--admin-text-muted)' }}>
                      <X size={13} />
                    </button>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                  <button
                    type="button"
                    className={`lc-btn-secondary ${filterDiffOnly ? 'active' : ''}`}
                    onClick={() => setFilterDiffOnly(!filterDiffOnly)}
                    style={{ fontSize: '0.78rem', padding: '0.35rem 0.65rem' }}
                  >
                    {filterDiffOnly ? 'Showing Differing Only' : 'Showing All'}
                  </button>
                  <button type="button" onClick={selectAll} className="lc-btn-secondary" style={{ fontSize: '0.78rem', padding: '0.35rem 0.6rem' }}>
                    Select All
                  </button>
                  <button type="button" onClick={deselectAll} className="lc-btn-secondary" style={{ fontSize: '0.78rem', padding: '0.35rem 0.6rem' }}>
                    Clear
                  </button>
                </div>
              </div>

              {/* Pairs List */}
              <div style={{ flex: 1, border: '1px solid var(--border)', borderRadius: '8px', overflowY: 'auto', background: 'var(--surface)' }}>
                {filteredPairs.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--admin-text-muted)', fontSize: '0.85rem' }}>
                    No matching book pairs found.
                  </div>
                ) : (
                  filteredPairs.map((p) => {
                    const isChecked = selectedTitles.has(p.key);
                    return (
                      <div
                        key={p.key}
                        onClick={() => toggleSelect(p.key)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '0.65rem 0.85rem',
                          borderBottom: '1px solid var(--border)',
                          cursor: 'pointer',
                          background: isChecked ? 'rgba(59, 130, 246, 0.05)' : 'transparent',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', minWidth: 0 }}>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {}}
                            style={{ cursor: 'pointer' }}
                          />
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontWeight: 600, fontSize: '0.84rem', color: 'var(--admin-text)' }} className="lc-truncate">
                              {p.title}
                            </div>
                            <div style={{ display: 'flex', gap: '0.6rem', fontSize: '0.74rem', color: 'var(--admin-text-muted)', marginTop: '2px' }}>
                              <span>Guide: <strong>{p.guideCount}</strong> exams</span>
                              <span>•</span>
                              <span>Precis: <strong>{p.precisCount}</strong> exams</span>
                            </div>
                          </div>
                        </div>

                        <div>
                          {p.isSynced ? (
                            <span style={{ fontSize: '0.72rem', color: '#10b981', fontWeight: 600, background: 'rgba(16, 185, 129, 0.1)', padding: '0.2rem 0.5rem', borderRadius: '999px' }}>
                              In Sync
                            </span>
                          ) : (
                            <span style={{ fontSize: '0.72rem', color: '#ef4444', fontWeight: 600, background: 'rgba(239, 68, 68, 0.1)', padding: '0.2rem 0.5rem', borderRadius: '999px' }}>
                              Differs ({p.guideCount} vs {p.precisCount})
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </>
          )}
        </div>

        {!loading && !syncResults && (
          <div className="lc-drawer-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border)', padding: '0.85rem' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--admin-text-muted)' }}>
              {selectedTitles.size} pair{selectedTitles.size === 1 ? '' : 's'} selected
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button type="button" className="lc-btn-secondary" onClick={onClose} disabled={syncing}>
                Cancel
              </button>
              <button
                type="button"
                className="lc-btn-primary"
                onClick={handleStartSync}
                disabled={syncing || selectedTitles.size === 0}
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              >
                {syncing && <RefreshCw size={14} className="animate-spin" />}
                {syncing
                  ? `Syncing (${syncProgress.current}/${syncProgress.total})...`
                  : `Sync ${selectedTitles.size} Selected Pair${selectedTitles.size === 1 ? '' : 's'}`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
