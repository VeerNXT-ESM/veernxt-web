import { useState, useEffect, useMemo } from 'react';
import { Search, X, ChevronDown, ChevronRight } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { examsAlreadyHavingResource, loadBookLinks } from '../../lib/resourceDuplicates';
import Select from '../../components/ui/Select';
import { CENTRAL_EXAM_CATEGORIES } from '../../lib/centralExamCategories';
import { STATE_EXAM_CATEGORIES } from '../../lib/stateExamCategories';
import { UT_EXAM_CATEGORIES } from '../../lib/utExamCategories';

// Blue marks everything that is already linked to the book, so it's easy to tell
// apart from the rest of the list. rgba tints so it reads on dark and light admin themes.
const LINKED_BLUE = '#3b82f6';
const LINKED_TINT = 'rgba(59, 130, 246, 0.12)';
const LINKED_BORDER = 'rgba(59, 130, 246, 0.45)';

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
 * preload-then-filter list, same `lc_exam_resource_map` insert shape.
 * Built for Guide/Precis, where a book is genuinely shared across many
 * exams; never offered for Intro, which is strictly one exam per resource
 * (see BooksPage.jsx's own guard on the button that opens this).
 *
 * Already-linked exams show up checked, not disabled -- unlike the first
 * version of this drawer, which greyed them out. Unchecking one un-links
 * it; this is a full manage-links view (add and remove together), not
 * add-only, since the admin may as easily need to drop a few exams from a
 * book with hundreds of links as add new ones.
 */
const LinkExamsDrawer = ({ book, onClose, onLinked }) => {
  const [search, setSearch] = useState('');
  const [level, setLevel] = useState('');
  const [examCategory, setExamCategory] = useState('');
  // Separate State and UT pickers, always visible (not gated behind the
  // Level pills) -- same reasoning ExamsPage.jsx's own State/UT split uses.
  // Picking one sets `level` to match and clears the other.
  const [examState, setExamState] = useState('');
  const [examUt, setExamUt] = useState('');
  const [conductingBody, setConductingBody] = useState('');
  const [allExams, setAllExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [existingExamIds, setExistingExamIds] = useState([]);
  // resources rows that carry at least one of this book's links -- an unlink has to target these, not just book.resourceId
  const [linkedResourceIds, setLinkedResourceIds] = useState([]);
  const [selected, setSelected] = useState(new Set());
  // The already-linked exams can run to the hundreds/thousands, so that section is
  // collapsed by default -- the admin is usually here to add new links.
  const [showLinked, setShowLinked] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // Total exam catalog is ~1,500-2,000 rows -- comfortably one preload, no
  // pagination needed (same reasoning AddResourceMapDrawer's books-list
  // preload uses on the other side of this same table).
  //
  // ...except a single select() still silently undercounts: PostgREST caps
  // a response at 1000 rows regardless of the client's own .limit(), so an
  // ordered-by-name fetch of ~1,587 rows dropped every exam whose name
  // sorted past row 1000 -- e.g. every "SSC ..." exam, which is why SSC
  // appeared as a selectable Category but never actually listed anything.
  // Same bug CategoriesPage.jsx's own fetchExamRows already had to page
  // around; mirrored here.
  useEffect(() => {
    let cancelled = false;
    const fetchAllExams = async () => {
      const pageSize = 1000;
      let all = [];
      for (let from = 0; ; from += pageSize) {
        const { data, error } = await supabase
          .from('lc_exams')
          .select('id, name, category, conducting_body_id, conducting_body:lc_conducting_bodies(id, name), region:lc_regions(name, level)')
          .order('name')
          .range(from, from + pageSize - 1);
        if (error) return { data: null, error };
        all = all.concat(data || []);
        if (!data || data.length < pageSize) return { data: all, error: null };
      }
    };
    (async () => {
      setLoading(true);
      try {
        const [{ data: exams, error: fetchErr }, links] = await Promise.all([
          fetchAllExams(),
          loadBookLinks(book),
        ]);
        if (fetchErr) throw fetchErr;
        if (!cancelled) {
          setAllExams(exams || []);
          setExistingExamIds(links.examIds);
          setLinkedResourceIds(links.resourceIds);
          setSelected(new Set(links.examIds)); // pre-checked, not disabled -- see the component's own doc comment
        }
      } catch (err) {
        if (!cancelled) setError(`Could not load this book's linked exams: ${err.message}`);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [book]);

  // lc_exams.category -- the ~21-value Banking/Agriculture/Police/etc.
  // classification ExamsPage.jsx's own Category filter already uses, not
  // the book's Guide/Precis/Intro category (an unrelated field despite the
  // shared column name).
  const categoryOptions = useMemo(() => {
    const pool = level ? allExams.filter((e) => e.region?.level === level) : allExams;
    const live = new Set(pool.map((e) => (e.category || '').trim()).filter(Boolean));
    // Union with the canonical Central/State/UT taxonomy (src/lib/*ExamCategories.js
    // -- the same source CategoriesPage.jsx's own Level filter uses) so a real
    // category like "SSC" is always selectable here even when the exam pool
    // currently visible (e.g. a sparsely-tagged level) doesn't yet contain one.
    const canonical =
      level === 'state' ? STATE_EXAM_CATEGORIES :
      level === 'ut' ? UT_EXAM_CATEGORIES :
      level === 'central' ? CENTRAL_EXAM_CATEGORIES :
      [...CENTRAL_EXAM_CATEGORIES, ...STATE_EXAM_CATEGORIES, ...UT_EXAM_CATEGORIES];
    canonical.forEach((c) => live.add(c));
    return [...live].sort();
  }, [allExams, level]);

  // State/UT names -- derived from the same preloaded exams list rather than
  // a separate lc_regions fetch, since every region in play already shows up
  // on at least one exam here. Independent of the Level pills, so both are
  // always populated and pickable.
  const stateOptions = useMemo(() => {
    const pool = allExams.filter((e) => e.region?.level === 'state');
    return [...new Set(pool.map((e) => e.region?.name).filter(Boolean))].sort();
  }, [allExams]);
  const utOptions = useMemo(() => {
    const pool = allExams.filter((e) => e.region?.level === 'ut');
    return [...new Set(pool.map((e) => e.region?.name).filter(Boolean))].sort();
  }, [allExams]);

  // Conducting Body names -- same live-derived, level-scoped pattern as
  // Category/State/UT above, deduped by id (a body's name alone isn't
  // guaranteed unique) the same way ExamsPage.jsx's own body filter does.
  const conductingBodyOptions = useMemo(() => {
    const pool = level ? allExams.filter((e) => e.region?.level === level) : allExams;
    const seen = new Map();
    for (const e of pool) {
      if (e.conducting_body?.id && !seen.has(e.conducting_body.id)) seen.set(e.conducting_body.id, e.conducting_body.name);
    }
    return [...seen.entries()].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [allExams, level]);

  const examRegion = examState || examUt;

  const results = useMemo(() => {
    let pool = allExams;
    if (level) pool = pool.filter((e) => e.region?.level === level);
    if (examCategory) pool = pool.filter((e) => (e.category || '').trim() === examCategory);
    if (examRegion) pool = pool.filter((e) => e.region?.name === examRegion);
    if (conductingBody) pool = pool.filter((e) => e.conducting_body?.id === conductingBody);
    const q = search.trim().toLowerCase();
    if (q) pool = pool.filter((e) => e.name.toLowerCase().includes(q) || e.conducting_body?.name?.toLowerCase().includes(q));
    // Already-linked exams first so a book with hundreds of candidates doesn't
    // bury its links, then A-Z. Keyed on the *saved* links (existingExamIds),
    // not the live checkbox state, so ticking a box doesn't make the row jump
    // out from under the cursor; it moves to the top once saved and reopened.
    const linked = new Set(existingExamIds);
    return [...pool].sort((a, b) => (linked.has(b.id) - linked.has(a.id)) || a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
  }, [allExams, existingExamIds, level, examCategory, examRegion, conductingBody, search]);

  // `results` is already linked-first (see above); split it so the linked
  // block can be collapsed on its own.
  const linkedSet = useMemo(() => new Set(existingExamIds), [existingExamIds]);
  const linkedResults = useMemo(() => results.filter((e) => linkedSet.has(e.id)), [results, linkedSet]);
  const otherResults = useMemo(() => results.filter((e) => !linkedSet.has(e.id)), [results, linkedSet]);

  const toggle = (examId) => setSelected((prev) => {
    const next = new Set(prev);
    if (next.has(examId)) next.delete(examId); else next.add(examId);
    return next;
  });

  // Scoped to a given (already-filtered) list, never the whole catalog --
  // narrowing to a Category/Body before selecting all doesn't select exams
  // the admin can't even see. Called separately for the "Already linked"
  // and "Other exams" groups (see the render below) so the two work
  // independently: selecting/deselecting one group never touches the
  // other's checkboxes.
  const selectAllIn = (list) => setSelected((prev) => new Set([...prev, ...list.map((e) => e.id)]));
  const deselectAllIn = (list) => setSelected((prev) => {
    const next = new Set(prev);
    list.forEach((e) => next.delete(e.id));
    return next;
  });

  const toAdd = [...selected].filter((id) => !existingExamIds.includes(id));
  const toRemove = existingExamIds.filter((id) => !selected.has(id));
  const hasChanges = toAdd.length > 0 || toRemove.length > 0;

  const handleSave = async () => {
    if (!hasChanges) { onClose(); return; }
    setSaving(true);
    setError(null);
    // Skip exams that already have this resource under another resource_id
    // (identical file/content) -- linking it again would show it twice.
    const dupes = toAdd.length > 0 ? await examsAlreadyHavingResource(book.resourceId, toAdd, book.category) : new Map();
    const addable = toAdd.filter((id) => !dupes.has(id));
    if (dupes.size > 0) {
      const names = allExams.filter((e) => dupes.has(e.id)).map((e) => e.name);
      alert(`${dupes.size} exam${dupes.size === 1 ? '' : 's'} already ha${dupes.size === 1 ? 's' : 've'} an identical copy of this resource and ${dupes.size === 1 ? 'was' : 'were'} skipped: ${names.slice(0, 8).join(', ')}${names.length > 8 ? ` +${names.length - 8} more` : ''}`);
    }
    if (addable.length > 0) {
      const { error: insErr } = await supabase.from('lc_exam_resource_map').insert(addable.map((examId) => ({
        exam_id: examId,
        resource_id: book.resourceId,
        category: book.category,
        confidence: 'high',
        reasoning: 'Manually added by admin',
        source: 'manual',
      })));
      if (insErr) { setSaving(false); setError(insErr.message); return; }
    }
    if (toRemove.length > 0) {
      // Links can sit on any resources row serving this book's content, so unlink across all of them.
      const { error: delErr } = await supabase.from('lc_exam_resource_map').delete()
        .in('resource_id', linkedResourceIds).eq('category', book.category).in('exam_id', toRemove);
      if (delErr) { setSaving(false); setError(delErr.message); return; }
    }
    setSaving(false);
    onLinked(addable.length - toRemove.length);
  };

  const pickExamState = (name) => { setExamState(name); setExamUt(''); if (name) setLevel('state'); };
  const pickExamUt = (name) => { setExamUt(name); setExamState(''); if (name) setLevel('ut'); };
  const handleClearFilters = () => { setSearch(''); setLevel(''); setExamCategory(''); setExamState(''); setExamUt(''); setConductingBody(''); };

  const renderExamRow = (exam, inLinkedSection = false) => {
    const wasLinked = linkedSet.has(exam.id);
    const isChecked = selected.has(exam.id);
    return (
      <label
        key={exam.id}
        className="lc-drawer-list-item"
        style={inLinkedSection
          ? { cursor: 'pointer', background: LINKED_TINT, borderLeft: `3px solid ${LINKED_BLUE}` }
          : { cursor: 'pointer' }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}>
          <input
            type="checkbox"
            checked={isChecked}
            onChange={() => toggle(exam.id)}
            style={{ marginRight: '0.3rem', flexShrink: 0 }}
          />
          <span className="lc-truncate" title={exam.name}>{exam.name}</span>
          {exam.conducting_body?.name && (
            <span className="lc-muted-note lc-truncate" style={{ maxWidth: '140px', fontSize: '0.72rem', background: 'var(--surface-alt)', padding: '0.1rem 0.4rem', borderRadius: '4px', flexShrink: 0 }} title={exam.conducting_body.name}>
              {exam.conducting_body.name}
            </span>
          )}
          {exam.category && <span className="lc-muted-note" style={{ flexShrink: 0 }}>· {exam.category}</span>}
          {exam.region?.level && <span className="lc-muted-note" style={{ flexShrink: 0 }}>· {exam.region.level}{exam.region.name ? ` (${exam.region.name})` : ''}</span>}
        </span>
        {wasLinked && isChecked && <span style={{ flexShrink: 0, marginLeft: '0.5rem', fontSize: '0.72rem', color: LINKED_BLUE, fontWeight: 700 }}>Linked</span>}
        {wasLinked && !isChecked && <span style={{ flexShrink: 0, marginLeft: '0.5rem', fontSize: '0.72rem', color: '#dc2626', fontWeight: 700 }}>Will unlink</span>}
        {!wasLinked && isChecked && <span style={{ flexShrink: 0, marginLeft: '0.5rem', fontSize: '0.72rem', color: '#059669', fontWeight: 700 }}>Will link</span>}
      </label>
    );
  };

  return (
    <div className="lc-drawer-backdrop" onClick={onClose}>
      <div className="lc-drawer-panel" style={{ width: 'min(580px, 94vw)' }} onClick={(e) => e.stopPropagation()}>
        <div className="lc-drawer-header">
          <div>
            <h3>Link Exams</h3>
            <p>Check exams to link <strong>&quot;{book.title}&quot;</strong> to, uncheck to unlink -- in bulk.</p>
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
                onClick={() => { setLevel(id); setExamCategory(''); setExamState(''); setExamUt(''); setConductingBody(''); }}
              >
                {label}
              </button>
            ))}
            <div style={{ minWidth: 170 }}>
              <Select
                searchable
                value={examCategory}
                onChange={(e) => setExamCategory(e.target.value)}
                placeholder={`All Categories (${categoryOptions.length})`}
                options={[{ value: '', label: 'All Categories' }, ...categoryOptions.map((c) => ({ value: c, label: c }))]}
              />
            </div>
            <div style={{ minWidth: 170 }}>
              <Select
                searchable
                value={conductingBody}
                onChange={(e) => setConductingBody(e.target.value)}
                placeholder={`All Conducting Bodies (${conductingBodyOptions.length})`}
                options={[{ value: '', label: 'All Conducting Bodies' }, ...conductingBodyOptions.map((b) => ({ value: b.id, label: b.name }))]}
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

          {(search || level || examCategory || examState || examUt || conductingBody) && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', fontSize: '0.75rem', color: 'var(--admin-text-muted)', padding: '0.2rem 0' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', alignItems: 'center' }}>
                <span>Filters:</span>
                {level && (
                  <span className="lc-status-badge" style={{ background: 'var(--surface-alt)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    {LEVEL_PILLS.find((p) => p.id === level)?.label}
                    <X size={11} style={{ cursor: 'pointer' }} onClick={() => setLevel('')} />
                  </span>
                )}
                {examCategory && (
                  <span className="lc-status-badge" style={{ background: 'var(--surface-alt)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    {examCategory}
                    <X size={11} style={{ cursor: 'pointer' }} onClick={() => setExamCategory('')} />
                  </span>
                )}
                {conductingBody && (
                  <span className="lc-status-badge" style={{ background: 'var(--surface-alt)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    {conductingBodyOptions.find((b) => b.id === conductingBody)?.name || 'Conducting Body'}
                    <X size={11} style={{ cursor: 'pointer' }} onClick={() => setConductingBody('')} />
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
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', fontSize: '0.75rem', color: 'var(--admin-text-muted)' }}>
                <span>{results.length} exam{results.length === 1 ? '' : 's'}</span>
                {level && <span>Filtered by: {LEVEL_PILLS.find((p) => p.id === level)?.label}</span>}
              </div>
              {linkedResults.length > 0 && (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0.25rem 0' }}>
                    <button
                      type="button"
                      onClick={() => setShowLinked((v) => !v)}
                      aria-expanded={showLinked}
                      style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flex: 1, minWidth: 0, background: LINKED_TINT, border: `1px solid ${LINKED_BORDER}`, borderRadius: 8, padding: '0.5rem 0.7rem', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 700, color: LINKED_BLUE, textAlign: 'left' }}
                    >
                      {showLinked ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                      Already linked ({linkedResults.length})
                    </button>
                    {/* Independent of the "Other exams" pair below -- only ever
                        touches linkedResults, so it never selects/deselects
                        anything in the Other exams group. */}
                    <button
                      type="button"
                      onClick={() => selectAllIn(linkedResults)}
                      style={{ background: 'none', border: 'none', color: 'var(--admin-accent)', cursor: 'pointer', fontSize: '0.72rem', textDecoration: 'underline', padding: 0, flexShrink: 0 }}
                    >
                      Select all
                    </button>
                    <button
                      type="button"
                      onClick={() => deselectAllIn(linkedResults)}
                      style={{ background: 'none', border: 'none', color: 'var(--admin-accent)', cursor: 'pointer', fontSize: '0.72rem', textDecoration: 'underline', padding: 0, flexShrink: 0 }}
                    >
                      Deselect all
                    </button>
                  </div>
                  {showLinked && linkedResults.map((exam) => renderExamRow(exam, true))}
                </>
              )}
              {otherResults.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', margin: linkedResults.length > 0 ? '0.6rem 0 0.25rem' : '0 0 0.25rem' }}>
                  <span className="lc-muted-note" style={{ fontSize: '0.75rem', fontWeight: 700 }}>
                    {linkedResults.length > 0 ? `Other exams (${otherResults.length})` : `Exams (${otherResults.length})`}
                  </span>
                  {/* Independent of the "Already linked" pair above -- only
                      ever touches otherResults. */}
                  <span style={{ display: 'flex', gap: '0.6rem' }}>
                    <button
                      type="button"
                      onClick={() => selectAllIn(otherResults)}
                      style={{ background: 'none', border: 'none', color: 'var(--admin-accent)', cursor: 'pointer', fontSize: '0.72rem', textDecoration: 'underline', padding: 0 }}
                    >
                      Select all
                    </button>
                    <button
                      type="button"
                      onClick={() => deselectAllIn(otherResults)}
                      style={{ background: 'none', border: 'none', color: 'var(--admin-accent)', cursor: 'pointer', fontSize: '0.72rem', textDecoration: 'underline', padding: 0 }}
                    >
                      Deselect all
                    </button>
                  </span>
                </div>
              )}
              {otherResults.map((exam) => renderExamRow(exam))}
              {results.length === 0 && <p className="lc-muted-note">No matching exams found.</p>}
            </div>
          )}
        </div>
        <div className="lc-modal-footer">
          <span style={{ marginRight: 'auto', fontSize: '0.8rem', color: 'var(--admin-text-muted)', alignSelf: 'center' }}>
            {selected.size} exam{selected.size === 1 ? '' : 's'} selected
            {hasChanges && ` (${toAdd.length ? `+${toAdd.length}` : ''}${toAdd.length && toRemove.length ? ' / ' : ''}${toRemove.length ? `-${toRemove.length}` : ''})`}
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

export default LinkExamsDrawer;
