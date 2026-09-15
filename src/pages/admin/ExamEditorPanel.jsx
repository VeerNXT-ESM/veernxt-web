import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import Select from '../../components/ui/Select';
import ExamThumbnail from './ExamThumbnail';
import { Save, Plus, X, Trash2, Copy, ExternalLink } from 'lucide-react';

const ACCENT_COLORS = ['#4b6b32', '#1F3A2E', '#b89047', '#2563eb', '#7c3aed', '#dc2626'];
const LEVEL_OPTIONS = [
  { value: 'central', label: 'Central' },
  { value: 'state', label: 'State' },
  { value: 'ut', label: 'UT' },
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
  const [showImageControls, setShowImageControls] = useState(false);

  const [conductingBodies, setConductingBodies] = useState([]);
  const [regions, setRegions] = useState([]);
  const [thumbnailTemplates, setThumbnailTemplates] = useState([]);
  const [allTags, setAllTags] = useState([]);

  const [form, setForm] = useState({
    conducting_body_id: '', region_id: '', name: '', category: '', website: '',
    thumbnail_template_id: '', accent_color: ACCENT_COLORS[0],
  });
  // UI-only: which region.level is selected, so the State/UT dropdown can
  // cascade to just the regions under it. Derived from the loaded exam's
  // own region on fetch, not persisted separately (region_id already
  // encodes the level via its own row).
  const [level, setLevel] = useState('central');
  const [examTags, setExamTags] = useState([]);
  const [tagInput, setTagInput] = useState('');

  useEffect(() => {
    loadReferenceData();
  }, []);

  useEffect(() => {
    if (examId) {
      fetchExam(examId);
    } else {
      setForm({ conducting_body_id: '', region_id: '', name: '', category: '', website: '', thumbnail_template_id: '', accent_color: ACCENT_COLORS[0] });
      setLevel('central');
      setStatus('draft');
      setExamTags([]);
      setShowImageControls(false);
      setLoading(false);
    }
  }, [examId]);

  const loadReferenceData = async () => {
    const [{ data: bodies }, { data: regs }, { data: templates }, { data: tags }] = await Promise.all([
      supabase.from('lc_conducting_bodies').select('id,name').order('name'),
      supabase.from('lc_regions').select('id,name,level').order('name'),
      supabase.from('lc_thumbnail_templates').select('id,name,background_image_path').order('name'),
      supabase.from('lc_tags').select('id,name').order('name'),
    ]);
    setConductingBodies(bodies || []);
    setRegions(regs || []);
    setThumbnailTemplates(templates || []);
    setAllTags(tags || []);
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
        website: exam.website || '',
        thumbnail_template_id: exam.thumbnail_template_id || '',
        thumbnail_subject: exam.thumbnail_subject || '',
        accent_color: exam.accent_color || ACCENT_COLORS[0],
      });
      setLevel(exam.region?.level || 'central');
      setStatus(exam.status || 'draft');
      setShowImageControls(false);

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
        website: form.website.trim() || null,
        thumbnail_template_id: form.thumbnail_template_id || null,
        accent_color: form.accent_color,
      };

      if (isNew) {
        const { data, error } = await supabase.from('lc_exams').insert(payload).select().single();
        if (error) throw error;
        onCreated?.(data);
      } else {
        const { error } = await supabase.from('lc_exams').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', examId);
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
      await supabase.from('lc_exam_tags').delete().eq('exam_id', examId);
      await supabase.from('lc_exam_resource_map').delete().eq('exam_id', examId);
      await supabase.from('lc_exam_intro').delete().eq('exam_id', examId);
      await supabase.from('lc_exam_quiz_map').delete().eq('exam_id', examId);

      const { error } = await supabase.from('lc_exams').delete().eq('id', examId);
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
        website: form.website.trim() || null,
        thumbnail_template_id: form.thumbnail_template_id || null,
        accent_color: form.accent_color,
        status: 'draft',
      };
      const { data, error } = await supabase.from('lc_exams').insert(payload).select().single();
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
    const { error } = await supabase.from('lc_exams').update({ status: nextStatus, updated_at: new Date().toISOString() }).eq('id', examId);
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
      const { data, error } = await supabase.from('lc_tags').insert({ name: trimmed }).select().single();
      if (error) { alert('Failed to create tag: ' + error.message); return; }
      tag = data;
      setAllTags((prev) => [...prev, tag]);
    }
    if (examTags.some((t) => t.id === tag.id)) return;
    const { error } = await supabase.from('lc_exam_tags').insert({ exam_id: examId, tag_id: tag.id });
    if (error) { alert('Failed to attach tag: ' + error.message); return; }
    setExamTags((prev) => [...prev, tag]);
  };

  const removeTag = async (tag) => {
    await supabase.from('lc_exam_tags').delete().eq('exam_id', examId).eq('tag_id', tag.id);
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
              <input type="text" value={form.category} onChange={(e) => updateForm({ category: e.target.value })} placeholder="e.g. SSC, Banking" />
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

          <div className="lc-input-group">
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
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input type="text" list="lc-tag-suggestions" value={tagInput} onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(tagInput); } }}
                    placeholder="Government, Graduate, Defence..." className="lc-inline-input" />
                  <datalist id="lc-tag-suggestions">{allTags.map((t) => <option key={t.id} value={t.name} />)}</datalist>
                  <button className="lc-btn" onClick={() => addTag(tagInput)} disabled={!tagInput.trim()}><Plus size={14} /> Add</button>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="lc-editor-thumbnail">
          <ExamThumbnail label={form.category || form.name} conductingBodyName={bodyName} thumbnailSubject={form.thumbnail_subject} accentColor={form.accent_color} size="lg" />
          <button className="lc-btn" style={{ marginTop: '0.85rem' }} onClick={() => setShowImageControls((v) => !v)}>
            {showImageControls ? 'Hide Image Options' : 'Change Image'}
          </button>
          {showImageControls && (
            <>
              <div className="lc-input-group" style={{ marginTop: '0.85rem' }}>
                <label>Template</label>
                <Select placeholder="No thumbnail" value={form.thumbnail_template_id} onChange={(e) => updateForm({ thumbnail_template_id: e.target.value })} options={[{ value: '', label: 'No thumbnail' }, ...thumbnailTemplates.map((t) => ({ value: t.id, label: t.name }))]} />
              </div>
              <div className="lc-input-group">
                <label>Accent Color</label>
                <div className="lc-color-swatches">
                  {ACCENT_COLORS.map((c) => (
                    <button key={c} onClick={() => updateForm({ accent_color: c })} className={`lc-color-swatch ${form.accent_color === c ? 'active' : ''}`} style={{ background: c }} />
                  ))}
                </div>
              </div>
              <p className="lc-muted-note">Colour-coded for now — generated image thumbnails come later.</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ExamEditorPanel;
