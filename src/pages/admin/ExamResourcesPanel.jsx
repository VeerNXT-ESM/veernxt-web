import { useState, useEffect, useCallback, useMemo } from 'react';
import { Plus, Trash2, Search, X, Eye, ExternalLink } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import AdminResourcePreview from './AdminResourcePreview';

const ADMIN_SECRET = import.meta.env.VITE_ADMIN_API_SECRET;

const CATEGORY_ORDER = ['Intro', 'Guide', 'Precis'];

const confidenceColors = {
  high: { bg: 'var(--admin-accent-soft)', color: 'var(--admin-accent)' },
  medium: { bg: 'var(--surface-alt)', color: 'var(--admin-text-muted)' },
  low: { bg: 'var(--admin-danger-bg)', color: 'var(--admin-danger)' },
};

const ConfidenceBadge = ({ confidence }) => {
  const c = confidenceColors[confidence] || confidenceColors.medium;
  return <span className="lc-status-badge" style={{ background: c.bg, color: c.color }}>{confidence || 'n/a'}</span>;
};

/**
 * Full-width section below the Exams workspace grid — shows what's actually
 * mapped to this exam in the live content system (lc_exam_resource_map +
 * resources), the table the candidate-facing Learning Center reads via
 * useExamContent.js. There was no admin visibility into this at all before
 * this panel: the "Subjects in this Exam" section that used to sit here
 * (removed 2026-09-08) read a different, now-dropped legacy table family
 * (lc_resources/lc_subjects) that no candidate route ever queried.
 */
const ExamResourcesPanel = ({ examId }) => {
  const [mappings, setMappings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [addDrawerOpen, setAddDrawerOpen] = useState(false);
  const [previewResourceId, setPreviewResourceId] = useState(null);

  const fetchMappings = async (id) => {
    setLoading(true);
    // lc_exam_resource_map.resource_id has no FK to resources.resource_id
    // (only exam_id is FK'd, to lc_exams) -- so PostgREST can't embed the
    // join with resource:resources(...), it 400s. Two-step fetch + merge
    // in JS instead.
    const { data: rows } = await supabase
      .from('lc_exam_resource_map')
      .select('id, resource_id, category, confidence, source')
      .eq('exam_id', id)
      .order('category', { ascending: true });
    const resourceIds = [...new Set((rows || []).map((r) => r.resource_id))];
    let resourcesById = {};
    if (resourceIds.length) {
      const { data: resourceRows } = await supabase.from('resources').select('resource_id, title, status').in('resource_id', resourceIds);
      resourcesById = (resourceRows || []).reduce((acc, r) => { acc[r.resource_id] = r; return acc; }, {});
    }
    setMappings((rows || []).map((r) => ({ ...r, resource: resourcesById[r.resource_id] || null })));
    setLoading(false);
  };

  useEffect(() => {
    setAddDrawerOpen(false);
    setPreviewResourceId(null);
    if (!examId) { setMappings([]); return; }
    fetchMappings(examId);
  }, [examId]);

  const removeMapping = async (mapping) => {
    if (!window.confirm(`Remove "${mapping.resource?.title || 'this resource'}" from this exam? The resource itself is untouched — this only removes the link.`)) return;
    const { error } = await supabase.from('lc_exam_resource_map').delete().eq('id', mapping.id);
    if (error) { alert('Failed: ' + error.message); return; }
    setMappings((prev) => prev.filter((m) => m.id !== mapping.id));
  };

  const grouped = CATEGORY_ORDER
    .map((category) => ({ category, items: mappings.filter((m) => m.category === category) }))
    .filter((g) => g.items.length > 0);
  const other = mappings.filter((m) => !CATEGORY_ORDER.includes(m.category));

  return (
    <div className="lc-card">
      <div className="lc-card-row-header">
        <h3 style={{ margin: 0 }}>Resources mapped to this exam</h3>
        {examId && <button className="lc-btn" onClick={() => setAddDrawerOpen(true)}><Plus size={14} /> Add Resource</button>}
      </div>

      {!examId ? (
        <span className="lc-muted-note">Save the exam first to view its mapped resources.</span>
      ) : loading ? (
        <span className="lc-muted-note">Loading…</span>
      ) : mappings.length === 0 ? (
        <p className="lc-muted-note">No resources mapped yet — until something's mapped here, the candidate app falls back to matching resources by exam name.</p>
      ) : (
        <>
          {grouped.map((g) => (
            <div key={g.category} style={{ marginTop: '0.85rem' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--admin-text-muted)', marginBottom: '0.4rem' }}>{g.category} ({g.items.length})</label>
              {g.items.map((m) => (
                <ResourceMapRow key={m.id} mapping={m} onRemove={() => removeMapping(m)} onPreview={() => setPreviewResourceId(m.resource?.resource_id)} />
              ))}
            </div>
          ))}
          {other.length > 0 && (
            <div style={{ marginTop: '0.85rem' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--admin-text-muted)', marginBottom: '0.4rem' }}>Other</label>
              {other.map((m) => (
                <ResourceMapRow key={m.id} mapping={m} onRemove={() => removeMapping(m)} onPreview={() => setPreviewResourceId(m.resource?.resource_id)} />
              ))}
            </div>
          )}
        </>
      )}

      {addDrawerOpen && (
        <AddResourceMapDrawer
          examId={examId}
          existingResourceIds={mappings.map((m) => m.resource?.resource_id).filter(Boolean)}
          onClose={() => setAddDrawerOpen(false)}
          onAdded={() => { setAddDrawerOpen(false); fetchMappings(examId); }}
        />
      )}

      {previewResourceId && (
        <div className="lc-drawer-backdrop" onClick={() => setPreviewResourceId(null)}>
          <div className="lc-drawer-panel" style={{ width: 'min(900px, 92vw)', height: '85vh', display: 'flex', flexDirection: 'column' }} onClick={(e) => e.stopPropagation()}>
            <div className="lc-drawer-header">
              <div><h3>Resource Preview</h3></div>
              <button className="lc-close-btn" onClick={() => setPreviewResourceId(null)}><X size={20} /></button>
            </div>
            <AdminResourcePreview resourceId={previewResourceId} />
          </div>
        </div>
      )}
    </div>
  );
};

const ResourceMapRow = ({ mapping, onRemove, onPreview }) => {
  const isBook = mapping.resource?.category && ['Guide', 'Precis'].includes(mapping.resource.category);
  return (
    <div className="lc-drawer-list-item">
      <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}>
        <span className="lc-truncate" title={mapping.resource?.title}>{mapping.resource?.title || 'Untitled resource'}</span>
        <ConfidenceBadge confidence={mapping.confidence} />
        <span className="lc-muted-note">{mapping.source}</span>
        {mapping.resource?.status && mapping.resource.status !== 'Published' && <span className="lc-muted-note">({mapping.resource.status})</span>}
      </span>
      <span style={{ display: 'flex', gap: '0.4rem', flexShrink: 0 }}>
        {isBook && (
          <button
            className="lc-icon-btn"
            title="Open book in new tab"
            onClick={() => window.open(`/admin/books/${mapping.resource.category}/${mapping.resource.resource_id}`, '_blank')}
            style={{ color: 'var(--admin-accent)' }}
          >
            <ExternalLink size={14} />
          </button>
        )}
        <button className="lc-icon-btn" title="Preview" onClick={onPreview}><Eye size={14} /></button>
        <button className="lc-icon-btn danger" title="Remove" onClick={onRemove}><Trash2 size={14} /></button>
      </span>
    </div>
  );
};

const AddResourceMapDrawer = ({ examId, existingResourceIds, onClose, onAdded }) => {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [allResources, setAllResources] = useState([]);
  const [supplementary, setSupplementary] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(new Set());
  const [saving, setSaving] = useState(false);

  // Load canonical books (Guide/Precis) and verified published Intros,
  // excluding unwanted mock tests. The books-list API call, the Intro
  // fetch, and the metadata backfill query don't depend on each other, so
  // they're fired together instead of one after another — the fallback
  // block-books query is the only one that stays sequential, since it's
  // only needed on the rare occasion the API call comes back empty.
  useEffect(() => {
    let cancelled = false;

    const fetchBooksFromApi = async () => {
      try {
        const res = await fetch('/api/admin/save-resource', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-admin-api-secret': ADMIN_SECRET },
          body: JSON.stringify({ type: 'books-list' }),
        });
        const data = await res.json();
        if (data?.ok && Array.isArray(data.books)) {
          return data.books.map((b) => ({
            resource_id: b.resourceId,
            title: b.title.trim(),
            category: b.category,
            conducting_body: '',
            exam_name: '',
            format: 'blocks',
            status: 'Published',
          }));
        }
      } catch (err) {
        console.warn('Failed to fetch books-list from API, falling back to database query:', err);
      }
      return [];
    };

    // Fallback for Guide/Precis: only hit the database directly if the API
    // returned nothing.
    const fetchBlockBooksFromDb = async () => {
      try {
        let blockRows = [];
        for (let from = 0; ; from += 1000) {
          const { data } = await supabase
            .from('resources')
            .select('resource_id, title, category, conducting_body, exam_name, format, status')
            .in('category', ['Guide', 'Precis'])
            .eq('format', 'blocks')
            .range(from, from + 999);
          blockRows = blockRows.concat(data || []);
          if ((data || []).length < 1000) break;
        }
        return blockRows.filter((r) => r.title).map((r) => ({
          resource_id: r.resource_id,
          title: r.title.trim(),
          category: r.category,
          conducting_body: r.conducting_body || '',
          exam_name: r.exam_name || '',
          format: 'blocks',
          status: 'Published',
        }));
      } catch (e) {
        console.error('Error in fallback block books query:', e);
        return [];
      }
    };

    // Published Exam Intros, excluding legacy mock tests/junk.
    const fetchPublishedIntros = async () => {
      try {
        let introRows = [];
        for (let from = 0; ; from += 1000) {
          const { data } = await supabase
            .from('resources')
            .select('resource_id, title, category, conducting_body, exam_name, format, status')
            .eq('category', 'Intro')
            .eq('status', 'Published')
            .range(from, from + 999);
          introRows = introRows.concat(data || []);
          if ((data || []).length < 1000) break;
        }
        return introRows
          .filter((r) => r.title)
          .filter((r) => {
            const t = r.title.trim().toLowerCase();
            return !(t.startsWith('veernxt_mock_test') || t.includes('mock_test') || t.endsWith('.docx 2') || t === 'test');
          })
          .map((r) => ({
            resource_id: r.resource_id,
            title: r.title.trim(),
            category: 'Intro',
            conducting_body: r.conducting_body || '',
            exam_name: r.exam_name || '',
            format: r.format || 'html',
            status: 'Published',
          }));
      } catch (err) {
        console.error('Error loading published Intros:', err);
        return [];
      }
    };

    // conducting_body/exam_name metadata to backfill onto canonical books
    // that are missing it.
    const fetchBookMetadata = async () => {
      try {
        const { data } = await supabase
          .from('resources')
          .select('title, category, conducting_body, exam_name')
          .eq('format', 'blocks')
          .not('conducting_body', 'is', null)
          .limit(1000);
        return data || [];
      } catch (e) {
        console.warn('Could not backfill metadata for books:', e);
        return [];
      }
    };

    const loadAll = async () => {
      setLoading(true);

      const [apiBooks, introRows, metaRows] = await Promise.all([
        fetchBooksFromApi(),
        fetchPublishedIntros(),
        fetchBookMetadata(),
      ]);

      const books = apiBooks.some((r) => r.category === 'Guide' || r.category === 'Precis')
        ? apiBooks
        : await fetchBlockBooksFromDb();

      const seen = new Set();
      const list = [];
      for (const r of [...books, ...introRows]) {
        const key = `${r.category}::${r.title.trim().toLowerCase()}`;
        if (seen.has(key)) continue;
        seen.add(key);
        list.push(r);
      }

      for (const m of metaRows) {
        const key = `${m.category}::${m.title?.trim().toLowerCase()}`;
        const existing = list.find((item) => `${item.category}::${item.title.trim().toLowerCase()}` === key);
        if (existing) {
          if (!existing.conducting_body && m.conducting_body) existing.conducting_body = m.conducting_body;
          if (!existing.exam_name && m.exam_name) existing.exam_name = m.exam_name;
        }
      }

      if (!cancelled) {
        list.sort((a, b) => a.title.localeCompare(b.title));
        setAllResources(list);
        setLoading(false);
      }
    };

    loadAll();
    return () => { cancelled = true; };
  }, []);

  // Supplementary live search if query has 3+ characters (finds any niche published items)
  useEffect(() => {
    const q = search.trim();
    if (!q || q.length < 3) {
      setSupplementary([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        let query = supabase
          .from('resources')
          .select('resource_id, title, category, conducting_body, exam_name, format, status')
          .eq('status', 'Published')
          .ilike('title', `%${q}%`)
          .limit(80);
        if (category) query = query.eq('category', category);
        const { data } = await query;
        // Filter out unwanted mock tests and non-block guides/precis
        const filtered = (data || []).filter((r) => {
          const t = (r.title || '').toLowerCase();
          if (t.includes('mock_test') || t.includes('mock test') || t.endsWith('.docx 2') || t === 'test') return false;
          if ((r.category === 'Guide' || r.category === 'Precis') && r.format !== 'blocks') return false;
          return true;
        });
        setSupplementary(filtered);
      } catch (e) {
        console.warn('Supplementary search error:', e);
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [search, category]);

  // Merge & deduplicate results by category + title, filtering by Format and Search
  const results = useMemo(() => {
    let pool = allResources;

    if (category) {
      pool = pool.filter((r) => r.category === category);
    }

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      pool = pool.filter((r) =>
        (r.title || '').toLowerCase().includes(q) ||
        (r.conducting_body || '').toLowerCase().includes(q) ||
        (r.exam_name || '').toLowerCase().includes(q)
      );
    }

    const seen = new Set();
    const merged = [];

    for (const r of pool) {
      const key = `${r.category}::${r.title.trim().toLowerCase()}`;
      if (!seen.has(key)) {
        seen.add(key);
        merged.push(r);
      }
    }

    for (const r of supplementary) {
      if (category && r.category !== category) continue;
      const key = `${r.category}::${r.title.trim().toLowerCase()}`;
      if (!seen.has(key)) {
        seen.add(key);
        merged.push(r);
      }
    }

    return merged.sort((a, b) => a.title.localeCompare(b.title));
  }, [allResources, supplementary, category, search]);

  const toggle = (resourceId) => setSelected((prev) => {
    const next = new Set(prev);
    if (next.has(resourceId)) next.delete(resourceId); else next.add(resourceId);
    return next;
  });

  const handleAdd = async () => {
    const toAdd = results.filter((r) => selected.has(r.resource_id) && !existingResourceIds.includes(r.resource_id));
    if (toAdd.length === 0) { onClose(); return; }
    setSaving(true);
    const { error } = await supabase.from('lc_exam_resource_map').insert(toAdd.map((r) => ({
      exam_id: examId,
      resource_id: r.resource_id,
      category: r.category,
      confidence: 'high',
      reasoning: 'Manually added by admin',
      source: 'manual',
    })));
    setSaving(false);
    if (error) { alert('Failed: ' + error.message); return; }
    onAdded();
  };

  const handleClearFilters = () => {
    setSearch('');
    setCategory('');
  };

  return (
    <div className="lc-drawer-backdrop" onClick={onClose}>
      <div className="lc-drawer-panel" style={{ width: 'min(580px, 94vw)' }} onClick={(e) => e.stopPropagation()}>
        <div className="lc-drawer-header">
          <div>
            <h3>Add Resource</h3>
            <p>Select canonical books and intros to link to this exam.</p>
          </div>
          <button className="lc-close-btn" onClick={onClose}><X size={20} /></button>
        </div>
        <div className="lc-drawer-body" style={{ gap: '0.85rem' }}>
          {/* Search input */}
          <div className="lc-search-input-wrapper">
            <Search size={16} />
            <input
              type="text"
              placeholder="Search resources by title or keyword..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button
                type="button"
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--admin-text-muted)', padding: '0 4px', display: 'flex' }}
                onClick={() => setSearch('')}
                title="Clear search"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Format pills: All, Intro, Guide, Precis */}
          <div style={{ display: 'flex', gap: '0.4rem', margin: '0.25rem 0' }}>
            {[
              { id: '', label: 'All' },
              { id: 'Intro', label: 'Intro' },
              { id: 'Guide', label: 'Guide' },
              { id: 'Precis', label: 'Precis' },
            ].map(({ id, label }) => (
              <button
                key={id || 'all'}
                type="button"
                className={`lc-btn ${category === id ? 'primary' : ''}`}
                style={{ padding: '0.3rem 0.65rem', fontSize: '0.75rem', borderRadius: '6px' }}
                onClick={() => setCategory(id)}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Active filter badges / reset */}
          {(search || category) && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', fontSize: '0.75rem', color: 'var(--admin-text-muted)', padding: '0.2rem 0' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', alignItems: 'center' }}>
                <span>Filters:</span>
                {category && (
                  <span className="lc-status-badge" style={{ background: 'var(--surface-alt)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    {category}
                    <X size={11} style={{ cursor: 'pointer' }} onClick={() => setCategory('')} />
                  </span>
                )}
                {search && (
                  <span className="lc-status-badge" style={{ background: 'var(--surface-alt)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    "{search}"
                    <X size={11} style={{ cursor: 'pointer' }} onClick={() => setSearch('')} />
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={handleClearFilters}
                style={{ background: 'none', border: 'none', color: 'var(--admin-accent)', cursor: 'pointer', fontSize: '0.75rem', textDecoration: 'underline', padding: 0 }}
              >
                Reset
              </button>
            </div>
          )}

          {loading ? (
            <p className="lc-muted-note" style={{ margin: '1rem 0' }}>Loading available study resources…</p>
          ) : (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.75rem', color: 'var(--admin-text-muted)' }}>
                <span>{results.length} resource{results.length === 1 ? '' : 's'} available</span>
                {category && <span>Filtered by: {category}</span>}
              </div>
              {results.map((r) => {
                const already = existingResourceIds.includes(r.resource_id);
                const rawBody = r.conducting_body ? r.conducting_body.replace(/^\d+\.\s*[^—]+—\s*\d+\.\s*/, '') : '';
                return (
                  <label key={r.resource_id} className="lc-drawer-list-item" style={{ cursor: already ? 'default' : 'pointer', opacity: already ? 0.5 : 1 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}>
                      <input
                        type="checkbox"
                        disabled={already}
                        checked={already || selected.has(r.resource_id)}
                        onChange={() => toggle(r.resource_id)}
                        style={{ marginRight: '0.3rem', flexShrink: 0 }}
                      />
                      <span className="lc-truncate" title={r.title}>{r.title}</span>
                      <span className="lc-muted-note" style={{ flexShrink: 0 }}>· {r.category}</span>
                      {rawBody && (
                        <span
                          className="lc-muted-note lc-truncate"
                          style={{ maxWidth: '140px', fontSize: '0.72rem', background: 'var(--surface-alt)', padding: '0.1rem 0.4rem', borderRadius: '4px', flexShrink: 0 }}
                          title={rawBody}
                        >
                          {rawBody}
                        </span>
                      )}
                    </span>
                    {already && <span className="lc-muted-note" style={{ flexShrink: 0, marginLeft: '0.5rem' }}>Already mapped</span>}
                  </label>
                );
              })}
              {results.length === 0 && <p className="lc-muted-note">No matching published resources found.</p>}
            </div>
          )}
        </div>
        <div className="lc-modal-footer">
          <span style={{ marginRight: 'auto', fontSize: '0.8rem', color: 'var(--admin-text-muted)', alignSelf: 'center' }}>
            {selected.size} resource{selected.size === 1 ? '' : 's'} selected
          </span>
          <button className="lc-btn" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="lc-btn primary" onClick={handleAdd} disabled={saving || selected.size === 0}>
            {saving ? 'Adding…' : 'Add Resources'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExamResourcesPanel;
