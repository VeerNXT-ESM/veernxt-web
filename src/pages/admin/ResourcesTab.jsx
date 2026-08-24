import { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import Select from '../../components/ui/Select';
import { PAGE_SIZE, RESOURCE_TYPES, useDebounced, StatusBadge } from './lcShared';
import { Search, Plus, ChevronLeft, ChevronRight, X, ShieldAlert, Pencil, Check } from 'lucide-react';

const ResourcesTab = ({ subjects }) => {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounced(search);
  const [typeFilter, setTypeFilter] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('');
  const [page, setPage] = useState(1);
  const [resources, setResources] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [detailResource, setDetailResource] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => { setPage(1); }, [debouncedSearch, typeFilter, subjectFilter]);

  // Same out-of-order-response guard as ExamsTab.fetchExams.
  const requestIdRef = useRef(0);

  const fetchResources = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setResources([]); // avoid showing the previous (differently filtered) page while this query is in flight
    try {
      let query = supabase.from('lc_resources').select('id,title,resource_type,status,subject:lc_subjects(id,name)', { count: 'exact' });
      if (debouncedSearch) query = query.ilike('title', `%${debouncedSearch}%`);
      if (typeFilter) query = query.eq('resource_type', typeFilter);
      if (subjectFilter) query = query.eq('subject_id', subjectFilter);

      const from = (page - 1) * PAGE_SIZE;
      query = query.order('title', { ascending: true }).range(from, from + PAGE_SIZE - 1);

      const { data, count, error } = await query;
      if (error) throw error;
      if (requestId !== requestIdRef.current) return; // a newer request superseded this one

      const ids = (data || []).map((r) => r.id);
      let usageById = {};
      if (ids.length) {
        const { data: usage } = await supabase.from('lc_resource_usage').select('*').in('resource_id', ids);
        usageById = Object.fromEntries((usage || []).map((u) => [u.resource_id, u]));
      }
      if (requestId !== requestIdRef.current) return;

      setResources((data || []).map((r) => ({ ...r, exam_count: usageById[r.id]?.exam_count || 0 })));
      setTotal(count || 0);
    } catch (err) {
      console.error('Error fetching resources:', err);
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }, [debouncedSearch, typeFilter, subjectFilter, page]);

  useEffect(() => { fetchResources(); }, [fetchResources]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div>
      <div className="lc-section-header">
        <div>
          <h2>Resource Library</h2>
          <p>The master canonical content database — every book/guide exists here exactly once.</p>
        </div>
        <button className="lc-btn primary" onClick={() => setShowCreateModal(true)}><Plus size={16} /> New Resource</button>
      </div>

      <div className="lc-filter-bar">
        <div className="lc-filter-field lc-search-input-wrapper">
          <Search size={16} />
          <input type="text" placeholder="Search resource titles..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="lc-filter-field">
          <label>Type</label>
          <Select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} options={[{ value: '', label: 'All Types' }, ...RESOURCE_TYPES.map((t) => ({ value: t, label: t }))]} />
        </div>
        <div className="lc-filter-field">
          <label>Subject</label>
          <Select searchable value={subjectFilter} onChange={(e) => setSubjectFilter(e.target.value)} options={[{ value: '', label: 'All Subjects' }, ...subjects.map((s) => ({ value: s.id, label: s.name }))]} />
        </div>
      </div>

      <div className="lc-table-responsive">
        <table className="lc-table">
          <thead>
            <tr>
              <th>Resource</th>
              <th>Type</th>
              <th>Subject</th>
              <th style={{ textAlign: 'right' }}>Used By Exams</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {resources.map((r) => (
              <tr key={r.id} className="clickable" onClick={() => setDetailResource(r)}>
                <td><span className="lc-table-title">{r.title}</span></td>
                <td>{r.resource_type}</td>
                <td>{r.subject?.name || '—'}</td>
                <td style={{ textAlign: 'right' }}><span className="lc-count-pill">{r.exam_count}</span></td>
                <td><StatusBadge status={r.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>

        {loading && <div className="lc-loading-state">Loading resources…</div>}
        {!loading && resources.length === 0 && <div className="lc-empty-state"><p>No resources match the current filters.</p></div>}

        {!loading && resources.length > 0 && (
          <div className="lc-pagination-bar">
            <span className="lc-pagination-info">{total} resource{total === 1 ? '' : 's'} — page {page} of {totalPages}</span>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button className="lc-pagination-btn" disabled={page === 1} onClick={() => setPage((p) => p - 1)}><ChevronLeft size={14} /> Prev</button>
              <button className="lc-pagination-btn" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>Next <ChevronRight size={14} /></button>
            </div>
          </div>
        )}
      </div>

      {detailResource && (
        <ResourceDetailDrawer
          resource={detailResource}
          subjects={subjects}
          onClose={() => setDetailResource(null)}
          onUpdated={(patch) => { setDetailResource((r) => ({ ...r, ...patch })); fetchResources(); }}
        />
      )}
      {showCreateModal && (
        <CreateResourceModal
          subjects={subjects}
          onClose={() => setShowCreateModal(false)}
          onCreated={() => { setShowCreateModal(false); fetchResources(); }}
          onUseExisting={(r) => { setShowCreateModal(false); setDetailResource(r); }}
        />
      )}
    </div>
  );
};

const ResourceDetailDrawer = ({ resource, subjects, onClose, onUpdated }) => {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(resource.title);
  const [resourceType, setResourceType] = useState(resource.resource_type);
  const [subjectId, setSubjectId] = useState(resource.subject?.id || '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: subjectResources } = await supabase
        .from('lc_subject_resources')
        .select('exam_subject:lc_exam_subjects(exam:lc_exams(id,name,status))')
        .eq('resource_id', resource.id);
      const seen = new Set();
      const examList = (subjectResources || [])
        .map((sr) => sr.exam_subject?.exam)
        .filter((e) => e && !seen.has(e.id) && seen.add(e.id));
      setExams(examList);
      setLoading(false);
    })();
  }, [resource.id]);

  const startEditing = () => {
    setTitle(resource.title);
    setResourceType(resource.resource_type);
    setSubjectId(resource.subject?.id || '');
    setEditing(true);
  };

  const handleSave = async () => {
    if (!title.trim()) return;
    setSaving(true);
    try {
      const patch = { title: title.trim(), resource_type: resourceType, subject_id: subjectId || null };
      const { error } = await supabase.from('lc_resources').update(patch).eq('id', resource.id);
      if (error) throw error;
      onUpdated({ ...patch, subject: subjects.find((s) => s.id === subjectId) || null });
      setEditing(false);
    } catch (err) {
      alert('Failed to save: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="lc-drawer-backdrop" onClick={onClose}>
      <div className="lc-drawer-panel" onClick={(e) => e.stopPropagation()}>
        {editing ? (
          <div className="lc-drawer-header">
            <div style={{ width: '100%' }}>
              <div className="lc-input-group" style={{ marginBottom: '0.6rem' }}>
                <label>Title</label>
                <input type="text" autoFocus value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <div className="lc-input-group" style={{ flex: 1 }}>
                  <label>Resource Type</label>
                  <Select value={resourceType} onChange={(e) => setResourceType(e.target.value)} options={RESOURCE_TYPES.map((t) => ({ value: t, label: t }))} />
                </div>
                <div className="lc-input-group" style={{ flex: 1 }}>
                  <label>Subject</label>
                  <Select searchable value={subjectId} onChange={(e) => setSubjectId(e.target.value)} options={[{ value: '', label: 'No subject' }, ...subjects.map((s) => ({ value: s.id, label: s.name }))]} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.85rem' }}>
                <button className="lc-btn primary" onClick={handleSave} disabled={saving || !title.trim()}><Check size={14} /> {saving ? 'Saving…' : 'Save'}</button>
                <button className="lc-btn" onClick={() => setEditing(false)} disabled={saving}>Cancel</button>
              </div>
            </div>
            <button className="lc-close-btn" onClick={onClose}><X size={20} /></button>
          </div>
        ) : (
          <div className="lc-drawer-header">
            <div>
              <h3>{resource.title}</h3>
              <p>{resource.resource_type} · {resource.subject?.name || 'No subject'}</p>
            </div>
            <div style={{ display: 'flex', gap: '0.4rem' }}>
              <button className="lc-icon-btn" title="Edit" onClick={startEditing}><Pencil size={14} /></button>
              <button className="lc-close-btn" onClick={onClose}><X size={20} /></button>
            </div>
          </div>
        )}
        <div className="lc-drawer-body">
          <div className="lc-drawer-section">
            <h4>Metadata</h4>
            <div className="lc-drawer-list-item"><span>Status</span><StatusBadge status={resource.status} /></div>
            <div className="lc-drawer-list-item"><span>Resource ID</span><code style={{ fontSize: '0.72rem' }}>{resource.id.substring(0, 8)}…</code></div>
          </div>
          <div className="lc-drawer-section">
            <h4>Exams using this resource {!loading && `(${exams.length})`}</h4>
            {loading && <div className="lc-loading-state">Loading…</div>}
            {!loading && exams.length === 0 && <p style={{ fontSize: '0.82rem', color: 'var(--admin-text-muted)' }}>Not assigned to any exam yet.</p>}
            {!loading && exams.map((e) => (
              <Link key={e.id} to={`/admin/exams?exam=${e.id}`} className="lc-drawer-list-item" style={{ textDecoration: 'none', color: 'inherit' }}>
                <span>{e.name}</span>
                <StatusBadge status={e.status} />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const CreateResourceModal = ({ subjects, onClose, onCreated, onUseExisting }) => {
  const [title, setTitle] = useState('');
  const debouncedTitle = useDebounced(title, 300);
  const [matches, setMatches] = useState([]);
  const [checking, setChecking] = useState(false);
  const [proceedAnyway, setProceedAnyway] = useState(false);
  const [resourceType, setResourceType] = useState('Guide');
  const [subjectId, setSubjectId] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!debouncedTitle || debouncedTitle.trim().length < 3) { setMatches([]); return; }
    (async () => {
      setChecking(true);
      const { data } = await supabase.from('lc_resources').select('id,title,resource_type,status,subject:lc_subjects(id,name)').ilike('title', `%${debouncedTitle.trim()}%`).limit(5);
      setMatches(data || []);
      setChecking(false);
    })();
  }, [debouncedTitle]);

  const handleCreate = async () => {
    if (!title.trim()) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('lc_resources').insert({
        title: title.trim(), resource_type: resourceType, subject_id: subjectId || null, status: 'draft',
      });
      if (error) throw error;
      onCreated();
    } catch (err) {
      alert('Failed to create resource: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const showDuplicateWarning = matches.length > 0 && !proceedAnyway;

  return (
    <div className="lc-modal-backdrop" onClick={onClose}>
      <div className="lc-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="lc-modal-header">
          <h3>New Resource</h3>
          <button className="lc-close-btn" onClick={onClose}><X size={20} /></button>
        </div>
        <div className="lc-modal-body">
          <div className="lc-input-group">
            <label>Title</label>
            <input type="text" autoFocus value={title} onChange={(e) => { setTitle(e.target.value); setProceedAnyway(false); }} placeholder="e.g. Objective General English" />
          </div>

          {checking && <span style={{ fontSize: '0.78rem', color: 'var(--admin-text-muted)' }}>Checking for existing resources…</span>}

          {showDuplicateWarning && (
            <div className="lc-notice warn">
              <ShieldAlert size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
              <div style={{ width: '100%' }}>
                <strong>This resource may already exist.</strong>
                <div style={{ marginTop: '0.6rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  {matches.map((m) => (
                    <div key={m.id} className="lc-drawer-list-item" style={{ background: 'var(--surface)' }}>
                      <span>{m.title} <span style={{ color: 'var(--admin-text-muted)' }}>· {m.resource_type}</span></span>
                      <button className="lc-btn" style={{ padding: '0.3rem 0.6rem', fontSize: '0.72rem' }} onClick={() => onUseExisting(m)}>Use Existing</button>
                    </div>
                  ))}
                </div>
                <button className="lc-btn" style={{ marginTop: '0.75rem', fontSize: '0.75rem' }} onClick={() => setProceedAnyway(true)}>Create Anyway — this is genuinely different</button>
              </div>
            </div>
          )}

          {!showDuplicateWarning && (
            <>
              <div className="lc-input-group">
                <label>Resource Type</label>
                <Select value={resourceType} onChange={(e) => setResourceType(e.target.value)} options={RESOURCE_TYPES.map((t) => ({ value: t, label: t }))} />
              </div>
              <div className="lc-input-group">
                <label>Subject</label>
                <Select searchable value={subjectId} onChange={(e) => setSubjectId(e.target.value)} options={[{ value: '', label: 'No subject yet' }, ...subjects.map((s) => ({ value: s.id, label: s.name }))]} />
              </div>
            </>
          )}
        </div>
        <div className="lc-modal-footer">
          <button className="lc-btn" onClick={onClose} disabled={saving}>Cancel</button>
          {!showDuplicateWarning && (
            <button className="lc-btn primary" onClick={handleCreate} disabled={saving || !title.trim()}>{saving ? 'Creating…' : 'Create Resource'}</button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResourcesTab;
