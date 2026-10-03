import { useState, useEffect } from 'react';
import { CENTRAL_EXAM_CATEGORIES } from '../../lib/centralExamCategories';
import { STATE_EXAM_CATEGORIES } from '../../lib/stateExamCategories';
import { UT_EXAM_CATEGORIES } from '../../lib/utExamCategories';
import { supabase } from '../../lib/supabase';
import Select from '../../components/ui/Select';
import ExamThumbnail from './ExamThumbnail';
import { Save, Plus, X, Trash2, Copy, ExternalLink, Eye } from 'lucide-react';
import { adminFrom } from '../../lib/adminDb';

const ACCENT_COLORS = ['#4b6b32', '#1F3A2E', '#b89047', '#2563eb', '#7c3aed', '#dc2626'];
const LEVEL_OPTIONS = [
  { value: 'central', label: 'Central' },
  { value: 'state', label: 'State' },
  { value: 'ut', label: 'UT' },
];

const CONTENT_CATEGORY_ORDER = ['Intro', 'Guide', 'Precis'];

const TABS = [
  { key: 'basic', label: 'Basic Details' },
  { key: 'syllabus', label: 'Syllabus' },
  { key: 'pattern', label: 'Exam Pattern' },
  { key: 'resources', label: 'Resources' },
  { key: 'mapping', label: 'Content Mapping' },
  { key: 'settings', label: 'Settings' },
];

/**
 * Embeddable exam editor — the centre pane of the Exams workspace ("Basic
 * Information"). No page chrome of its own (no header/back-link): the user
 * should never leave the Exams workspace to edit an exam.
 *
 * examId === null means "creating a new exam" (isNew mode).
 *
 * Published status now lives here (moved off the old, now-removed
 * ExamStatusCard rail card) as a header toggle that saves immediately, same
 * as it did there — independent of the "Save Changes" button, which only
 * covers the form fields below.
 */
const ExamEditorPanel = ({ examId, onCreated, onSaved, onDeleted }) => {
  const isNew = !examId;
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [duplicating, setDuplicating] = useState(false);
  const [status, setStatus] = useState('draft');
  const [statusSaving, setStatusSaving] = useState(false);

  const [conductingBodies, setConductingBodies] = useState([]);
  const [regions, setRegions] = useState([]);
  const [allTags, setAllTags] = useState([]);
  // lc_exam_categories -- editable by the content team from CategoriesPage.jsx,
  // not a hardcoded list. Read live here so a category added there shows up
  // in this dropdown immediately, no code change or deploy needed.
  const [categoryOptions, setCategoryOptions] = useState([]);

  const [form, setForm] = useState({
    conducting_body_id: '', region_id: '', name: '', category: '', category_detail: '', website: '',
    thumbnail_template_id: '', accent_color: ACCENT_COLORS[0],
  });
  // UI-only: which region.level is selected, so the State/UT dropdown can
  // cascade to just the regions under it. Derived from the loaded exam's
  // own region on fetch, not persisted separately (region_id already
  // encodes the level via its own row).
  const [level, setLevel] = useState('central');
  const [examTags, setExamTags] = useState([]);
  const [tagInput, setTagInput] = useState('');
  const [activeTab, setActiveTab] = useState('basic');

  // Read-only view of lc_exam_resource_map + resources, shared by the
  // Syllabus/Resources/Content Mapping tabs — the same table the Resources
  // rail (ExamResourcesPanel.jsx) manages, just summarised for reading here
  // rather than duplicating its add/remove UI in the centre panel too.
  const [resourceMap, setResourceMap] = useState([]);
  const [resourceMapLoading, setResourceMapLoading] = useState(false);

  const fetchResourceMap = async (id) => {
    setResourceMapLoading(true);
    const { data: rows } = await supabase.from('lc_exam_resource_map').select('id, resource_id, category').eq('exam_id', id);
    const resourceIds = [...new Set((rows || []).map((r) => r.resource_id).filter(Boolean))];
    let resourcesById = {};
    if (resourceIds.length) {
      const { data: resourceRows } = await supabase.from('resources').select('resource_id, title, status').in('resource_id', resourceIds);
      resourcesById = (resourceRows || []).reduce((acc, r) => { acc[r.resource_id] = r; return acc; }, {});
    }
    setResourceMap((rows || []).map((r) => ({ ...r, resource: resourcesById[r.resource_id] || null })));
    setResourceMapLoading(false);
  };

  useEffect(() => {
    loadReferenceData();
  }, []);

  useEffect(() => {
    setActiveTab('basic');
    if (examId) {
      fetchExam(examId);
      fetchResourceMap(examId);
    } else {
      setForm({ conducting_body_id: '', region_id: '', name: '', category: '', category_detail: '', website: '', thumbnail_template_id: '', accent_color: ACCENT_COLORS[0] });
      setLevel('central');
      setStatus('draft');
      setExamTags([]);
      setResourceMap([]);
      setLoading(false);
    }
  }, [examId]);

  const loadReferenceData = async () => {
    const [{ data: bodies }, { data: regs }, { data: tags }, { data: cats }] = await Promise.all([
      supabase.from('lc_conducting_bodies').select('id,name').order('name'),
      supabase.from('lc_regions').select('id,name,level').order('name'),
      supabase.from('lc_tags').select('id,name').order('name'),
      supabase.from('lc_exam_categories').select('name').order('name'),
    ]);
    setConductingBodies(bodies || []);
    setRegions(regs || []);
    setAllTags(tags || []);
    setCategoryOptions((cats || []).map((c) => ({ value: c.name, label: c.name })));
  };

  const fetchExam = async (id) => {
    setLoading(true);
    try {
      const { data: exam, error } = await supabase.from('lc_exams').select('*, region:lc_regions(id,name,level)').eq('id', id).single();
      if (error) throw error;
      setForm({
        conducting_body_id: exam.conducting_body_id || '',
        region_id: exam.region_id || '',
        name: exam.name || '',
        category: exam.category || '',
        category_detail: exam.category_detail || '',
        website: exam.website || '',
        thumbnail_template_id: exam.thumbnail_template_id || '',
        thumbnail_subject: exam.thumbnail_subject || '',
        accent_color: exam.accent_color || ACCENT_COLORS[0],
      });
      setLevel(exam.region?.level || 'central');
      setStatus(exam.status || 'draft');

      const { data: tagLinks } = await supabase.from('lc_exam_tags').select('tag:lc_tags(id,name)').eq('exam_id', id);
      setExamTags((tagLinks || []).map((t) => t.tag).filter(Boolean));
    } catch (err) {
      alert('Failed to load exam: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const updateForm = (patch) => setForm((f) => ({ ...f, ...patch }));

  // Level drives which regions the State/UT dropdown offers. Central has
  // exactly one region row ("Central") in the schema, so picking it
  // auto-selects that region rather than making the admin pick from a
  // list of one.
  const regionsForLevel = regions.filter((r) => r.level === level);

  // Each level has its own category list, taken from its own source doc, so
  // the three never overlap. An exam's saved category is always kept
  // selectable so editing a legacy row never silently blanks the dropdown.
  const LEVEL_CATEGORIES = { central: CENTRAL_EXAM_CATEGORIES, state: STATE_EXAM_CATEGORIES, ut: UT_EXAM_CATEGORIES };
  const LEVEL_LABEL = { central: 'Central', state: 'State', ut: 'UT' };
  const allowedCategoryOptions = categoryOptions.filter((o) => (LEVEL_CATEGORIES[level] || []).includes(o.value));
  const visibleCategoryOptions = form.category && !allowedCategoryOptions.some((o) => o.value === form.category)
    ? [...allowedCategoryOptions, { value: form.category, label: `${form.category} (not a ${LEVEL_LABEL[level] || ''} category)` }]
    : allowedCategoryOptions;

  // Also runs on its own (not just from changeLevel below) -- the "new
  // exam" reset effect defaults level to 'central' directly, and `regions`
  // may still be loading at that moment, so region_id can be left blank
  // with no visible field to fix it (State/UT is hidden for Central). That
  // silently failed Save with "Conducting Body, State/UT, and Exam Name are
  // required" even though all three looked filled in. This picks up the
  // Central region id as soon as both level==='central' and regions have
  // loaded, however that state was reached.
  useEffect(() => {
    if (level === 'central' && !form.region_id && regions.length > 0) {
      const centralRegion = regions.find((r) => r.level === 'central');
      if (centralRegion) updateForm({ region_id: centralRegion.id });
    }
  }, [level, regions, form.region_id]);

  const changeLevel = (newLevel) => {
    setLevel(newLevel);
    if (newLevel === 'central') {
      const centralRegion = regions.find((r) => r.level === 'central');
      updateForm({ region_id: centralRegion?.id || '' });
    } else {
      updateForm({ region_id: '' });
    }
  };

  const handleSave = async () => {
    if (!form.conducting_body_id || !form.region_id || !form.name.trim()) {
      alert('Conducting Body, State/UT, and Exam Name are required.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        conducting_body_id: form.conducting_body_id,
        region_id: form.region_id,
        name: form.name.trim(),
        category: form.category.trim() || null,
        category_detail: form.category_detail.trim() || null,
        website: form.website.trim() || null,
        thumbnail_template_id: form.thumbnail_template_id || null,
        accent_color: form.accent_color,
      };

      if (isNew) {
        const { data, error } = await adminFrom('lc_exams').insert(payload).select().single();
        if (error) throw error;
        onCreated?.(data);
      } else {
        const { error } = await adminFrom('lc_exams').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', examId);
        if (error) throw error;
        onSaved?.();
        fetchExam(examId);
      }
    } catch (err) {
      alert('Save failed: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteExam = async () => {
    if (!examId) return;
    const confirmMessage = `Are you sure you want to delete "${form.name || 'this exam'}"?\n\nThis will remove the exam along with its linked tags, intros, and resource links.`;
    if (!window.confirm(confirmMessage)) return;

    setDeleting(true);
    try {
      await adminFrom('lc_exam_tags').delete().eq('exam_id', examId);
      await adminFrom('lc_exam_resource_map').delete().eq('exam_id', examId);
      await adminFrom('lc_exam_intro').delete().eq('exam_id', examId);
      await adminFrom('lc_exam_quiz_map').delete().eq('exam_id', examId);

      const { error } = await adminFrom('lc_exams').delete().eq('id', examId);
      if (error) throw error;

      onDeleted?.(examId);
    } catch (err) {
      alert('Failed to delete exam: ' + err.message);
    } finally {
      setDeleting(false);
    }
  };

  // Duplicates the core identity fields into a brand-new exam (own id,
  // starts as Draft) so the admin can adjust before publishing. Deliberately
  // does NOT copy tags, resource mappings, or the Introduction document —
  // those are specific to the original exam, not safe to blindly clone.
  const handleDuplicate = async () => {
    if (!examId) return;
    setDuplicating(true);
    try {
      const payload = {
        conducting_body_id: form.conducting_body_id,
        region_id: form.region_id,
        name: `${form.name} (Copy)`,
        category: form.category.trim() || null,
        category_detail: form.category_detail.trim() || null,
        website: form.website.trim() || null,
        thumbnail_template_id: form.thumbnail_template_id || null,
        accent_color: form.accent_color,
        status: 'draft',
      };
      const { data, error } = await adminFrom('lc_exams').insert(payload).select().single();
      if (error) throw error;
      onCreated?.(data);
    } catch (err) {
      alert('Duplicate failed: ' + err.message);
    } finally {
      setDuplicating(false);
    }
  };

  const toggleStatus = async (e) => {
    if (!examId) return;
    const nextStatus = e.target.checked ? 'published' : 'draft';
    setStatus(nextStatus);
    setStatusSaving(true);
    const { error } = await adminFrom('lc_exams').update({ status: nextStatus, updated_at: new Date().toISOString() }).eq('id', examId);
    setStatusSaving(false);
    if (error) { alert('Failed to update status: ' + error.message); setStatus((s) => (s === 'published' ? 'draft' : 'published')); }
  };

  // --- Tags ---------------------------------------------------------
  const addTag = async (name) => {
    const trimmed = name.trim();
    if (!trimmed || !examId) return;
    setTagInput('');
    let tag = allTags.find((t) => t.name.toLowerCase() === trimmed.toLowerCase());
    if (!tag) {
      const { data, error } = await adminFrom('lc_tags').insert({ name: trimmed }).select().single();
      if (error) { alert('Failed to create tag: ' + error.message); return; }
      tag = data;
      setAllTags((prev) => [...prev, tag]);
    }
    if (examTags.some((t) => t.id === tag.id)) return;
    const { error } = await adminFrom('lc_exam_tags').insert({ exam_id: examId, tag_id: tag.id });
    if (error) { alert('Failed to attach tag: ' + error.message); return; }
    setExamTags((prev) => [...prev, tag]);
  };

  const removeTag = async (tag) => {
    await adminFrom('lc_exam_tags').delete().eq('exam_id', examId).eq('tag_id', tag.id);
    setExamTags((prev) => prev.filter((t) => t.id !== tag.id));
  };

  if (loading) return <div className="lc-card" style={{ flex: 1 }}><div className="lc-loading-state">Loading exam…</div></div>;

  const bodyName = conductingBodies.find((b) => b.id === form.conducting_body_id)?.name;
  const regionName = regions.find((r) => r.id === form.region_id)?.name;

  return (
    <div className="lc-editor-panel">
      <div className="lc-editor-toolbar">
        <div>
          <h2>{isNew ? 'New Exam' : (form.name || 'Exam Details')}</h2>
          {!isNew && (
            <p className="lc-editor-toolbar-subtitle">
              {[bodyName, form.category, regionName].filter(Boolean).join(' • ')}
            </p>
          )}
        </div>
        <div className="lc-editor-toolbar-actions">
          {!isNew && (
            <label className="lc-toggle" title="Published / Draft">
              <input type="checkbox" checked={status === 'published'} disabled={statusSaving} onChange={toggleStatus} />
              <span className="lc-toggle-track"><span className="lc-toggle-thumb" /></span>
              <span className="lc-toggle-label">{status === 'published' ? 'Published' : 'Draft'}</span>
            </label>
          )}
          {!isNew && (
            <button className="lc-btn" onClick={() => window.open(`/exam/${examId}`, '_blank')} title="Preview this exam's public page">
              <Eye size={14} /> Preview
            </button>
          )}
          {!isNew && (
            <button className="lc-btn" onClick={handleDuplicate} disabled={duplicating || saving || deleting} title="Duplicate this exam">
              <Copy size={14} /> {duplicating ? 'Duplicating…' : 'Duplicate'}
            </button>
          )}
          {!isNew && (
            <button className="lc-btn danger" onClick={handleDeleteExam} disabled={deleting || saving} title="Delete this exam">
              <Trash2 size={14} /> {deleting ? 'Deleting…' : 'Delete'}
            </button>
          )}
          <button className="lc-btn primary" onClick={handleSave} disabled={saving || deleting}>
            <Save size={14} /> {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>

      <div className="lc-editor-tabs">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            className={`lc-editor-tab ${activeTab === tab.key ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
            disabled={tab.key !== 'basic' && isNew}
            title={tab.key !== 'basic' && isNew ? 'Save the exam first' : undefined}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'basic' && (
      <div className="lc-editor-identity">
        <div className="lc-editor-identity-fields">
          <div className="lc-input-group">
            <label>Conducting Body *</label>
            <Select searchable placeholder="Select conducting body..." value={form.conducting_body_id} onChange={(e) => updateForm({ conducting_body_id: e.target.value })} options={conductingBodies.map((b) => ({ value: b.id, label: b.name }))} />
          </div>
          <div className="lc-input-group">
            <label>Exam Name *</label>
            <input type="text" value={form.name} onChange={(e) => updateForm({ name: e.target.value })} placeholder="e.g. Combined Graduate Level" />
          </div>

          {/* State/UT only shown when it's a real choice (State/UT level) --
              for Central it's a single fixed region auto-selected by
              changeLevel(), so a disabled dropdown just showing "Central"
              a second time (next to Level, which already says Central) was
              pure redundant clutter. */}
          <div className={level === 'central' ? 'lc-editor-identity-row2' : 'lc-editor-identity-row3'}>
            <div className="lc-input-group">
              <label>Category *</label>
              <Select
                searchable
                placeholder="Select category..."
                value={form.category}
                onChange={(e) => updateForm({ category: e.target.value })}
                options={visibleCategoryOptions}
              />
            </div>
            <div className="lc-input-group">
              <label>Level *</label>
              <Select value={level} onChange={(e) => changeLevel(e.target.value)} options={LEVEL_OPTIONS} />
            </div>
            {level !== 'central' && (
              <div className="lc-input-group">
                <label>State/UT *</label>
                <Select
                  searchable
                  placeholder="Select state/UT..."
                  value={form.region_id}
                  onChange={(e) => updateForm({ region_id: e.target.value })}
                  options={regionsForLevel.map((r) => ({ value: r.id, label: r.name }))}
                />
              </div>
            )}
          </div>

          <div className="lc-input-group">
            <label>Category Detail</label>
            <input
              type="text"
              value={form.category_detail}
              onChange={(e) => updateForm({ category_detail: e.target.value })}
              placeholder="Optional — the specific post/sub-type, e.g. &quot;Police SI&quot; (Category itself stays a fixed list for clean filtering)"
            />
          </div>

          <div className="lc-input-group">
            <label>Website</label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input type="text" style={{ flex: 1 }} value={form.website} onChange={(e) => updateForm({ website: e.target.value })} placeholder="Official conducting-body website (optional)" />
              {form.website && (
                <a className="lc-icon-btn" href={form.website} target="_blank" rel="noreferrer" title="Open website">
                  <ExternalLink size={14} />
                </a>
              )}
            </div>
          </div>

        </div>

        <div className="lc-editor-thumbnail">
          <ExamThumbnail label={form.name} thumbnailSubject={form.thumbnail_subject} accentColor={form.accent_color} categoryName={form.category} level={level} size="lg" />

          <div className="lc-input-group" style={{ marginTop: '1.25rem' }}>
            <label>Tags</label>
            {!examId ? (
              <span className="lc-muted-note">Save the exam first to add tags.</span>
            ) : (
              <>
                <div className="lc-tag-row">
                  {examTags.map((t) => (
                    <span key={t.id} className="lc-link-chip">{t.name}<X size={12} style={{ marginLeft: '0.4rem', cursor: 'pointer' }} onClick={() => removeTag(t)} /></span>
                  ))}
                  {examTags.length === 0 && <span className="lc-muted-note">No tags yet.</span>}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <input type="text" list="lc-tag-suggestions" value={tagInput} onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(tagInput); } }}
                    placeholder="Government, Graduate, Defence..." className="lc-inline-input" style={{ width: '100%', boxSizing: 'border-box' }} />
                  <datalist id="lc-tag-suggestions">{allTags.map((t) => <option key={t.id} value={t.name} />)}</datalist>
                  <button className="lc-btn" onClick={() => addTag(tagInput)} disabled={!tagInput.trim()} style={{ justifyContent: 'center' }}><Plus size={14} /> Add Tag</button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
      )}

      {activeTab === 'syllabus' && (
        <div className="lc-card" style={{ flex: 1 }}>
          <h3>Syllabus</h3>
          <p className="lc-muted-note" style={{ marginTop: '-0.6rem', marginBottom: '1rem' }}>
            Syllabus content for this exam is delivered through its Guide and Précis resources, not a separate syllabus field.
          </p>
          {resourceMapLoading ? (
            <span className="lc-muted-note">Loading…</span>
          ) : (
            <>
              {['Guide', 'Precis'].map((cat) => {
                const items = resourceMap.filter((m) => m.category === cat);
                return (
                  <div key={cat} className="lc-mapping-group">
                    <label className="lc-mapping-group-label">{cat} ({items.length})</label>
                    {items.length === 0 && <p className="lc-muted-note" style={{ margin: 0 }}>None assigned yet — use the Resources panel to assign one.</p>}
                    {items.map((m) => (
                      <div key={m.id} className="lc-drawer-list-item">
                        <span className="lc-truncate" title={m.resource?.title}>{m.resource?.title || 'Untitled resource'}</span>
                        {m.resource?.resource_id && (
                          <a className="lc-icon-btn" href={`/admin/books/${cat}/${m.resource.resource_id}`} target="_blank" rel="noreferrer" title="Open book">
                            <ExternalLink size={14} />
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                );
              })}
            </>
          )}
        </div>
      )}

      {activeTab === 'pattern' && (
        <div className="lc-card lc-empty-editor" style={{ flex: 1 }}>
          <p className="lc-muted-note">Exam pattern details (stages, sections, marking scheme) aren't tracked in the system yet.</p>
        </div>
      )}

      {activeTab === 'resources' && (
        <div className="lc-card" style={{ flex: 1 }}>
          <h3>Resources</h3>
          {resourceMapLoading ? (
            <span className="lc-muted-note">Loading…</span>
          ) : (
            <>
              <p className="lc-muted-note" style={{ marginTop: '-0.6rem', marginBottom: '1rem' }}>
                {resourceMap.length} resource{resourceMap.length === 1 ? '' : 's'} assigned to this exam. Use the Resources panel on the right to add or remove one.
              </p>
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                {CONTENT_CATEGORY_ORDER.map((cat) => (
                  <span key={cat} className="lc-status-badge" style={{ background: 'var(--surface-alt)' }}>
                    {cat}: {resourceMap.filter((m) => m.category === cat).length}
                  </span>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {activeTab === 'mapping' && (
        <div className="lc-card" style={{ flex: 1 }}>
          <h3>Content Mapping</h3>
          {resourceMapLoading ? (
            <span className="lc-muted-note">Loading…</span>
          ) : resourceMap.length === 0 ? (
            <p className="lc-muted-note">No content mapped to this exam yet.</p>
          ) : (
            CONTENT_CATEGORY_ORDER.concat(
              [...new Set(resourceMap.map((m) => m.category))].filter((c) => !CONTENT_CATEGORY_ORDER.includes(c))
            ).map((cat) => {
              const items = resourceMap.filter((m) => m.category === cat);
              if (items.length === 0) return null;
              return (
                <div key={cat} className="lc-mapping-group">
                  <label className="lc-mapping-group-label">{cat} ({items.length})</label>
                  {items.map((m) => (
                    <div key={m.id} className="lc-drawer-list-item">
                      <span className="lc-truncate" title={m.resource?.title}>{m.resource?.title || 'Untitled resource'}</span>
                      {m.resource?.status && m.resource.status !== 'Published' && <span className="lc-muted-note">({m.resource.status})</span>}
                    </div>
                  ))}
                </div>
              );
            })
          )}
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="lc-card" style={{ flex: 1 }}>
          <h3>Settings</h3>
          <div className="lc-input-group">
            <label>Accent Color</label>
            <div className="lc-color-swatches">
              {ACCENT_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`lc-color-swatch ${form.accent_color === c ? 'active' : ''}`}
                  style={{ background: c }}
                  onClick={() => updateForm({ accent_color: c })}
                  title={c}
                />
              ))}
            </div>
            <p className="lc-muted-note" style={{ marginTop: '0.6rem' }}>Used as the thumbnail background color for this exam. Save Changes to apply.</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExamEditorPanel;
