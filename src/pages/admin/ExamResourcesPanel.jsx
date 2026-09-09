import { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, Search, X, Eye } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import AdminResourcePreview from './AdminResourcePreview';

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

const ResourceMapRow = ({ mapping, onRemove, onPreview }) => (
  <div className="lc-drawer-list-item">
    <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}>
      <span className="lc-truncate" title={mapping.resource?.title}>{mapping.resource?.title || 'Untitled resource'}</span>
      <ConfidenceBadge confidence={mapping.confidence} />
      <span className="lc-muted-note">{mapping.source}</span>
      {mapping.resource?.status && mapping.resource.status !== 'Published' && <span className="lc-muted-note">({mapping.resource.status})</span>}
    </span>
    <span style={{ display: 'flex', gap: '0.4rem', flexShrink: 0 }}>
      <button className="lc-icon-btn" title="Preview" onClick={onPreview}><Eye size={14} /></button>
      <button className="lc-icon-btn danger" title="Remove" onClick={onRemove}><Trash2 size={14} /></button>
    </span>
  </div>
);

const AddResourceMapDrawer = ({ examId, existingResourceIds, onClose, onAdded }) => {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [results, setResults] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [saving, setSaving] = useState(false);

  const runSearch = useCallback(async () => {
    let query = supabase.from('resources').select('resource_id, title, category, status').eq('status', 'Published').order('title').limit(40);
    if (search) query = query.ilike('title', `%${search}%`);
    if (category) query = query.eq('category', category);
    const { data } = await query;
    setResults(data || []);
  }, [search, category]);

  useEffect(() => { const t = setTimeout(runSearch, 300); return () => clearTimeout(t); }, [runSearch]);

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

  return (
    <div className="lc-drawer-backdrop" onClick={onClose}>
      <div className="lc-drawer-panel" onClick={(e) => e.stopPropagation()}>
        <div className="lc-drawer-header">
          <div><h3>Add Resource</h3><p>Selecting links the existing canonical resource — never creates a copy.</p></div>
          <button className="lc-close-btn" onClick={onClose}><X size={20} /></button>
        </div>
        <div className="lc-drawer-body">
          <div className="lc-search-input-wrapper"><Search size={16} /><input type="text" placeholder="Search resources..." value={search} onChange={(e) => setSearch(e.target.value)} /></div>
          <div style={{ display: 'flex', gap: '0.4rem', margin: '0.75rem 0' }}>
            {['', 'Intro', 'Guide', 'Precis'].map((c) => (
              <button key={c || 'all'} className={`lc-btn ${category === c ? 'primary' : ''}`} style={{ padding: '0.3rem 0.6rem', fontSize: '0.72rem' }} onClick={() => setCategory(c)}>{c || 'All'}</button>
            ))}
          </div>
          <div>
            {results.map((r) => {
              const already = existingResourceIds.includes(r.resource_id);
              return (
                <label key={r.resource_id} className="lc-drawer-list-item" style={{ cursor: already ? 'default' : 'pointer', opacity: already ? 0.5 : 1 }}>
                  <span><input type="checkbox" disabled={already} checked={already || selected.has(r.resource_id)} onChange={() => toggle(r.resource_id)} style={{ marginRight: '0.6rem' }} />{r.title} <span className="lc-muted-note">· {r.category}</span></span>
                  {already && <span className="lc-muted-note">Already mapped</span>}
                </label>
              );
            })}
            {results.length === 0 && <p className="lc-muted-note">No matching published resources.</p>}
          </div>
        </div>
        <div className="lc-modal-footer">
          <span style={{ marginRight: 'auto', fontSize: '0.8rem', color: 'var(--admin-text-muted)', alignSelf: 'center' }}>{selected.size} resource{selected.size === 1 ? '' : 's'} selected</span>
          <button className="lc-btn" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="lc-btn primary" onClick={handleAdd} disabled={saving || selected.size === 0}>{saving ? 'Adding…' : 'Add Resources'}</button>
        </div>
      </div>
    </div>
  );
};

export default ExamResourcesPanel;
