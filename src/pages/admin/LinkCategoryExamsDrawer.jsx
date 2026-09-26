import { useState, useEffect, useMemo } from 'react';
import { Search, X, ArrowRight, Undo2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import Select from '../../components/ui/Select';
import { adminFrom } from '../../lib/adminDb';

const LEVEL_PILLS = [
  { id: '', label: 'All' },
  { id: 'central', label: 'Central' },
  { id: 'state', label: 'State' },
  { id: 'ut', label: 'UT' },
];

/**
 * The "reverse" side of category linking -- CategoriesPage.jsx's own
 * "Manage Exams" button, mirroring LinkExamsDrawer.jsx's book-side
 * bulk-link drawer, but for categories instead of books. The direct side
 * (an exam picking its own category) is ExamEditorPanel.jsx's Category
 * dropdown.
 *
 * Unlike book<->exam (a real many-to-many via lc_exam_resource_map),
 * category<->exam is one required text field on lc_exams -- an exam can't
 * be "unlinked" into nothing. So unchecking an exam that's already in this
 * category doesn't remove it outright; it opens an inline picker asking
 * which OTHER category to move it to, and the move only takes effect once
 * that's chosen (re-checking cancels the pending move). Checking an exam
 * currently in a different category just queues it to move into this one.
 */
const LinkCategoryExamsDrawer = ({ category, allCategories, onClose, onLinked }) => {
  const [search, setSearch] = useState('');
  const [level, setLevel] = useState('');
  const [currentCategoryFilter, setCurrentCategoryFilter] = useState('');
  const [examState, setExamState] = useState('');
  const [examUt, setExamUt] = useState('');
  const [allExams, setAllExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const [selected, setSelected] = useState(new Set()); // exam ids that should end up in `category` after save
  const [replacements, setReplacements] = useState(new Map()); // exam id -> chosen replacement category (for exams being moved OUT)
  const [pickingReplacementFor, setPickingReplacementFor] = useState(null); // exam id whose inline picker is open

  // Total exam catalog is ~1,500-2,000 rows -- one preload, same reasoning
  // LinkExamsDrawer.jsx's own preload uses.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data: exams } = await supabase
        .from('lc_exams')
        .select('id, name, category, conducting_body:lc_conducting_bodies(name), region:lc_regions(name, level)')
        .order('name')
        .limit(2000);
      if (!cancelled) {
        setAllExams(exams || []);
        const existing = (exams || []).filter((e) => e.category === category.name).map((e) => e.id);
        setSelected(new Set(existing));
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [category.name]);

  const originalCategorySet = useMemo(
    () => new Set(allExams.filter((e) => e.category === category.name).map((e) => e.id)),
    [allExams, category.name]
  );

  const currentCategoryOptions = useMemo(
    () => [...new Set(allExams.map((e) => (e.category || '').trim()).filter(Boolean))].sort(),
    [allExams]
  );
  const stateOptions = useMemo(() => {
    const pool = allExams.filter((e) => e.region?.level === 'state');
    return [...new Set(pool.map((e) => e.region?.name).filter(Boolean))].sort();
  }, [allExams]);
  const utOptions = useMemo(() => {
    const pool = allExams.filter((e) => e.region?.level === 'ut');
    return [...new Set(pool.map((e) => e.region?.name).filter(Boolean))].sort();
  }, [allExams]);

  const examRegion = examState || examUt;

  const results = useMemo(() => {
    let pool = allExams;
    if (level) pool = pool.filter((e) => e.region?.level === level);
    if (currentCategoryFilter) pool = pool.filter((e) => (e.category || '').trim() === currentCategoryFilter);
    if (examRegion) pool = pool.filter((e) => e.region?.name === examRegion);
    const q = search.trim().toLowerCase();
    if (q) pool = pool.filter((e) => e.name.toLowerCase().includes(q) || e.conducting_body?.name?.toLowerCase().includes(q));
    return pool;
  }, [allExams, level, currentCategoryFilter, examRegion, search]);

  const toggle = (examId) => {
    if (selected.has(examId)) {
      if (originalCategorySet.has(examId)) {
        // Was already in this category -- can't uncheck into nothing, ask where it should go instead.
        setPickingReplacementFor(examId);
        return;
      }
      setSelected((prev) => { const next = new Set(prev); next.delete(examId); return next; });
    } else {
      setSelected((prev) => new Set(prev).add(examId));
      setReplacements((prev) => { if (!prev.has(examId)) return prev; const next = new Map(prev); next.delete(examId); return next; });
      if (pickingReplacementFor === examId) setPickingReplacementFor(null);
    }
  };

  const confirmReplacement = (examId, newCategory) => {
    if (!newCategory) return;
    setReplacements((prev) => new Map(prev).set(examId, newCategory));
    setSelected((prev) => { const next = new Set(prev); next.delete(examId); return next; });
    setPickingReplacementFor(null);
  };

  const toAdd = [...selected].filter((id) => !originalCategorySet.has(id));
  const hasChanges = toAdd.length > 0 || replacements.size > 0;

  const handleSave = async () => {
    if (!hasChanges) { onClose(); return; }
    setSaving(true);
    setError(null);
    if (toAdd.length > 0) {
      const { error: addErr } = await adminFrom('lc_exams').update({ category: category.name }).in('id', toAdd);
      if (addErr) { setSaving(false); setError(addErr.message); return; }
    }
    for (const [examId, newCategory] of replacements) {
      const { error: moveErr } = await adminFrom('lc_exams').update({ category: newCategory }).eq('id', examId);
      if (moveErr) { setSaving(false); setError(moveErr.message); return; }
    }
    setSaving(false);
    onLinked({ added: toAdd.length, moved: replacements.size });
  };

  const pickExamState = (name) => { setExamState(name); setExamUt(''); if (name) setLevel('state'); };
  const pickExamUt = (name) => { setExamUt(name); setExamState(''); if (name) setLevel('ut'); };
  const handleClearFilters = () => { setSearch(''); setLevel(''); setCurrentCategoryFilter(''); setExamState(''); setExamUt(''); };

  const replacementOptions = allCategories.filter((c) => c.name !== category.name).map((c) => ({ value: c.name, label: c.name }));

  return (
    <div className="lc-drawer-backdrop" onClick={onClose}>
      <div className="lc-drawer-panel" style={{ width: 'min(620px, 94vw)' }} onClick={(e) => e.stopPropagation()}>
        <div className="lc-drawer-header">
          <div>
            <h3>Manage Exams — {category.name}</h3>
            <p>Check exams to move them into <strong>&quot;{category.name}&quot;</strong>. Uncheck one already here to move it to a different category instead.</p>
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

          <div style={{ display: 'flex', gap: '0.4rem', margin: '0.25rem 0', flexWrap: 'wrap', alignItems: 'center' }}>
            {LEVEL_PILLS.map(({ id, label }) => (
              <button
                key={id || 'all'}
                type="button"
                className={`lc-btn ${level === id ? 'primary' : ''}`}
                style={{ padding: '0.3rem 0.65rem', fontSize: '0.75rem', borderRadius: '6px' }}
                onClick={() => { setLevel(id); setExamState(''); setExamUt(''); }}
              >
                {label}
              </button>
            ))}
            <div style={{ minWidth: 190 }}>
              <Select
                searchable
                value={currentCategoryFilter}
                onChange={(e) => setCurrentCategoryFilter(e.target.value)}
                placeholder={`Current Category (${currentCategoryOptions.length})`}
                options={[{ value: '', label: 'Any Current Category' }, ...currentCategoryOptions.map((c) => ({ value: c, label: c }))]}
              />
            </div>
            <div style={{ minWidth: 150 }}>
              <Select
                searchable
                value={examState}
                onChange={(e) => pickExamState(e.target.value)}
                placeholder={`All States (${stateOptions.length})`}
                options={[{ value: '', label: 'All States' }, ...stateOptions.map((r) => ({ value: r, label: r }))]}
              />
            </div>
            <div style={{ minWidth: 150 }}>
              <Select
                searchable
                value={examUt}
                onChange={(e) => pickExamUt(e.target.value)}
                placeholder={`All UTs (${utOptions.length})`}
                options={[{ value: '', label: 'All UTs' }, ...utOptions.map((r) => ({ value: r, label: r }))]}
              />
            </div>
          </div>

          {(search || level || currentCategoryFilter || examState || examUt) && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', fontSize: '0.75rem', color: 'var(--admin-text-muted)', padding: '0.2rem 0' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', alignItems: 'center' }}>
                <span>Filters:</span>
                {level && (
                  <span className="lc-status-badge" style={{ background: 'var(--surface-alt)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    {LEVEL_PILLS.find((p) => p.id === level)?.label}
                    <X size={11} style={{ cursor: 'pointer' }} onClick={() => setLevel('')} />
                  </span>
                )}
                {currentCategoryFilter && (
                  <span className="lc-status-badge" style={{ background: 'var(--surface-alt)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    {currentCategoryFilter}
                    <X size={11} style={{ cursor: 'pointer' }} onClick={() => setCurrentCategoryFilter('')} />
                  </span>
                )}
                {examState && (
                  <span className="lc-status-badge" style={{ background: 'var(--surface-alt)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    {examState}
                    <X size={11} style={{ cursor: 'pointer' }} onClick={() => setExamState('')} />
                  </span>
                )}
                {examUt && (
                  <span className="lc-status-badge" style={{ background: 'var(--surface-alt)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    {examUt}
                    <X size={11} style={{ cursor: 'pointer' }} onClick={() => setExamUt('')} />
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
              </div>
              {results.map((exam) => {
                const wasHere = originalCategorySet.has(exam.id);
                const isChecked = selected.has(exam.id);
                const isMoving = replacements.has(exam.id);
                const isPickingReplacement = pickingReplacementFor === exam.id;

                return (
                  <div key={exam.id} className="lc-drawer-list-item" style={{ flexDirection: 'column', alignItems: 'stretch', gap: isPickingReplacement ? '0.4rem' : 0 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0, cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggle(exam.id)}
                        style={{ marginRight: '0.3rem', flexShrink: 0 }}
                      />
                      <span className="lc-truncate" title={exam.name} style={{ flex: 1, minWidth: 0 }}>{exam.name}</span>
                      {exam.conducting_body?.name && (
                        <span className="lc-muted-note lc-truncate" style={{ maxWidth: '140px', fontSize: '0.72rem', background: 'var(--surface-alt)', padding: '0.1rem 0.4rem', borderRadius: '4px', flexShrink: 0 }} title={exam.conducting_body.name}>
                          {exam.conducting_body.name}
                        </span>
                      )}
                      {!wasHere && exam.category && <span className="lc-muted-note" style={{ flexShrink: 0 }}>· {exam.category}</span>}
                      {exam.region?.level && <span className="lc-muted-note" style={{ flexShrink: 0 }}>· {exam.region.level}{exam.region.name ? ` (${exam.region.name})` : ''}</span>}

                      {wasHere && isChecked && <span className="lc-muted-note" style={{ flexShrink: 0, marginLeft: '0.5rem' }}>Already here</span>}
                      {!wasHere && isChecked && (
                        <span style={{ flexShrink: 0, marginLeft: '0.5rem', fontSize: '0.72rem', color: '#059669', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                          <ArrowRight size={11} /> Moving in{exam.category ? ` from ${exam.category}` : ''}
                        </span>
                      )}
                      {isMoving && (
                        <span style={{ flexShrink: 0, marginLeft: '0.5rem', fontSize: '0.72rem', color: '#dc2626', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                          <ArrowRight size={11} /> Moving to {replacements.get(exam.id)}
                          <button
                            type="button"
                            title="Undo -- keep it here"
                            onClick={(e) => { e.preventDefault(); toggle(exam.id); }}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', padding: 0, display: 'flex' }}
                          >
                            <Undo2 size={12} />
                          </button>
                        </span>
                      )}
                    </label>
                    {isPickingReplacement && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', paddingLeft: '1.7rem' }}>
                        <span className="lc-muted-note" style={{ fontSize: '0.75rem', flexShrink: 0 }}>Move to:</span>
                        <div style={{ minWidth: 220 }}>
                          <Select
                            searchable
                            value=""
                            onChange={(e) => confirmReplacement(exam.id, e.target.value)}
                            placeholder="Choose a category..."
                            options={replacementOptions}
                          />
                        </div>
                        <button
                          type="button"
                          className="lc-icon-btn"
                          title="Cancel -- keep it here"
                          onClick={() => setPickingReplacementFor(null)}
                        >
                          <X size={13} />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
              {results.length === 0 && <p className="lc-muted-note">No matching exams found.</p>}
            </div>
          )}
        </div>
        <div className="lc-modal-footer">
          <span style={{ marginRight: 'auto', fontSize: '0.8rem', color: 'var(--admin-text-muted)', alignSelf: 'center' }}>
            {hasChanges
              ? `${toAdd.length ? `${toAdd.length} moving in` : ''}${toAdd.length && replacements.size ? ', ' : ''}${replacements.size ? `${replacements.size} moving out` : ''}`
              : `${selected.size} exam${selected.size === 1 ? '' : 's'} in this category`}
          </span>
          <button className="lc-btn" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="lc-btn primary" onClick={handleSave} disabled={saving || !hasChanges}>
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default LinkCategoryExamsDrawer;
