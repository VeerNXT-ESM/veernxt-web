import { useState, useEffect, useMemo } from 'react';
import { Search, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';

const LEVEL_PILLS = [
  { id: '', label: 'All' },
  { id: 'central', label: 'Central' },
  { id: 'state', label: 'State' },
  { id: 'ut', label: 'UT' },
];

/**
 * The mirror image of ExamResourcesPanel.jsx's own AddResourceMapDrawer:
 * that one is exam-centric (fixed exam, multi-select resources), this one
 * is resource-centric (fixed book, multi-select exams) -- same
 * preload-then-filter list, same checkbox-with-"already linked" pattern,
 * same lc_exam_resource_map insert shape. Built for Guide/Precis, where a
 * book is genuinely shared across many exams; never offered for Intro,
 * which is strictly one exam per resource (see BooksPage.jsx's own guard
 * on the button that opens this).
 */
const LinkExamsDrawer = ({ book, onClose, onLinked }) => {
  const [search, setSearch] = useState('');
  const [level, setLevel] = useState('');
  const [allExams, setAllExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [existingExamIds, setExistingExamIds] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // Total exam catalog is ~1,500-2,000 rows -- comfortably one preload, no
  // pagination needed (same reasoning AddResourceMapDrawer's books-list
  // preload uses on the other side of this same table).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [{ data: exams }, { data: mapRows }] = await Promise.all([
        supabase
          .from('lc_exams')
          .select('id, name, conducting_body:lc_conducting_bodies(name), region:lc_regions(name, level)')
          .order('name')
          .limit(2000),
        supabase.from('lc_exam_resource_map').select('exam_id').eq('resource_id', book.resourceId).eq('category', book.category),
      ]);
      if (!cancelled) {
        setAllExams(exams || []);
        setExistingExamIds((mapRows || []).map((r) => r.exam_id));
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [book.resourceId, book.category]);

  const results = useMemo(() => {
    let pool = allExams;
    if (level) pool = pool.filter((e) => e.region?.level === level);
    const q = search.trim().toLowerCase();
    if (q) pool = pool.filter((e) => e.name.toLowerCase().includes(q) || e.conducting_body?.name?.toLowerCase().includes(q));
    return pool;
  }, [allExams, level, search]);

  const toggle = (examId) => setSelected((prev) => {
    const next = new Set(prev);
    if (next.has(examId)) next.delete(examId); else next.add(examId);
    return next;
  });

  const handleLink = async () => {
    const toAdd = [...selected].filter((id) => !existingExamIds.includes(id));
    if (toAdd.length === 0) { onClose(); return; }
    setSaving(true);
    setError(null);
    const { error: insErr } = await supabase.from('lc_exam_resource_map').insert(toAdd.map((examId) => ({
      exam_id: examId,
      resource_id: book.resourceId,
      category: book.category,
      confidence: 'high',
      reasoning: 'Manually added by admin',
      source: 'manual',
    })));
    setSaving(false);
    if (insErr) { setError(insErr.message); return; }
    onLinked(toAdd.length);
  };

  const handleClearFilters = () => { setSearch(''); setLevel(''); };

  return (
    <div className="lc-drawer-backdrop" onClick={onClose}>
      <div className="lc-drawer-panel" style={{ width: 'min(580px, 94vw)' }} onClick={(e) => e.stopPropagation()}>
        <div className="lc-drawer-header">
          <div>
            <h3>Link Exams</h3>
            <p>Select exams to link <strong>&quot;{book.title}&quot;</strong> to, in bulk.</p>
          </div>
          <button className="lc-close-btn" onClick={onClose}><X size={20} /></button>
        </div>
        <div className="lc-drawer-body" style={{ gap: '0.85rem' }}>
          <div className="lc-search-input-wrapper">
            <Search size={16} />
            <input
              type="text"
              placeholder="Search exams by name or conducting body..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button type="button" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--admin-text-muted)', padding: '0 4px', display: 'flex' }} onClick={() => setSearch('')} title="Clear search">
                <X size={14} />
              </button>
            )}
          </div>

          <div style={{ display: 'flex', gap: '0.4rem', margin: '0.25rem 0' }}>
            {LEVEL_PILLS.map(({ id, label }) => (
              <button
                key={id || 'all'}
                type="button"
                className={`lc-btn ${level === id ? 'primary' : ''}`}
                style={{ padding: '0.3rem 0.65rem', fontSize: '0.75rem', borderRadius: '6px' }}
                onClick={() => setLevel(id)}
              >
                {label}
              </button>
            ))}
          </div>

          {(search || level) && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', fontSize: '0.75rem', color: 'var(--admin-text-muted)', padding: '0.2rem 0' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', alignItems: 'center' }}>
                <span>Filters:</span>
                {level && (
                  <span className="lc-status-badge" style={{ background: 'var(--surface-alt)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    {LEVEL_PILLS.find((p) => p.id === level)?.label}
                    <X size={11} style={{ cursor: 'pointer' }} onClick={() => setLevel('')} />
                  </span>
                )}
                {search && (
                  <span className="lc-status-badge" style={{ background: 'var(--surface-alt)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    &quot;{search}&quot;
                    <X size={11} style={{ cursor: 'pointer' }} onClick={() => setSearch('')} />
                  </span>
                )}
              </div>
              <button type="button" onClick={handleClearFilters} style={{ background: 'none', border: 'none', color: 'var(--admin-accent)', cursor: 'pointer', fontSize: '0.75rem', textDecoration: 'underline', padding: 0 }}>
                Reset
              </button>
            </div>
          )}

          {error && (
            <div style={{ padding: '0.65rem 0.9rem', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, fontSize: '0.8rem', color: '#b91c1c' }}>
              {error}
            </div>
          )}

          {loading ? (
            <p className="lc-muted-note" style={{ margin: '1rem 0' }}>Loading exams…</p>
          ) : (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.75rem', color: 'var(--admin-text-muted)' }}>
                <span>{results.length} exam{results.length === 1 ? '' : 's'}</span>
                {level && <span>Filtered by: {LEVEL_PILLS.find((p) => p.id === level)?.label}</span>}
              </div>
              {results.map((exam) => {
                const already = existingExamIds.includes(exam.id);
                return (
                  <label key={exam.id} className="lc-drawer-list-item" style={{ cursor: already ? 'default' : 'pointer', opacity: already ? 0.5 : 1 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}>
                      <input
                        type="checkbox"
                        disabled={already}
                        checked={already || selected.has(exam.id)}
                        onChange={() => toggle(exam.id)}
                        style={{ marginRight: '0.3rem', flexShrink: 0 }}
                      />
                      <span className="lc-truncate" title={exam.name}>{exam.name}</span>
                      {exam.conducting_body?.name && (
                        <span className="lc-muted-note lc-truncate" style={{ maxWidth: '140px', fontSize: '0.72rem', background: 'var(--surface-alt)', padding: '0.1rem 0.4rem', borderRadius: '4px', flexShrink: 0 }} title={exam.conducting_body.name}>
                          {exam.conducting_body.name}
                        </span>
                      )}
                      {exam.region?.level && <span className="lc-muted-note" style={{ flexShrink: 0 }}>· {exam.region.level}{exam.region.name ? ` (${exam.region.name})` : ''}</span>}
                    </span>
                    {already && <span className="lc-muted-note" style={{ flexShrink: 0, marginLeft: '0.5rem' }}>Already linked</span>}
                  </label>
                );
              })}
              {results.length === 0 && <p className="lc-muted-note">No matching exams found.</p>}
            </div>
          )}
        </div>
        <div className="lc-modal-footer">
          <span style={{ marginRight: 'auto', fontSize: '0.8rem', color: 'var(--admin-text-muted)', alignSelf: 'center' }}>
            {selected.size} exam{selected.size === 1 ? '' : 's'} selected
          </span>
          <button className="lc-btn" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="lc-btn primary" onClick={handleLink} disabled={saving || selected.size === 0}>
            {saving ? 'Linking…' : 'Link'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default LinkExamsDrawer;
