import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import Select from '../../components/ui/Select';
import ExamThumbnail from './ExamThumbnail';
import { Save, Plus, X } from 'lucide-react';

const ACCENT_COLORS = ['#4b6b32', '#1F3A2E', '#b89047', '#2563eb', '#7c3aed', '#dc2626'];

/**
 * Embeddable exam editor — the centre pane of the Exams master-detail-summary
 * workspace. No page chrome of its own (no header/back-link): the user
 * should never leave the Exams workspace to edit an exam (CMS mockup §11/§24).
 *
 * examId === null means "creating a new exam" (isNew mode).
 */
const ExamEditorPanel = ({ examId, onCreated, onSaved }) => {
  const isNew = !examId;
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);

  const [conductingBodies, setConductingBodies] = useState([]);
  const [regions, setRegions] = useState([]);
  const [thumbnailTemplates, setThumbnailTemplates] = useState([]);
  const [allTags, setAllTags] = useState([]);

  const [form, setForm] = useState({
    conducting_body_id: '', region_id: '', name: '', category: '', website: '',
    thumbnail_template_id: '', accent_color: ACCENT_COLORS[0],
  });
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
      setExamTags([]);
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
      const { data: exam, error } = await supabase.from('lc_exams').select('*').eq('id', id).single();
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

      const { data: tagLinks } = await supabase.from('lc_exam_tags').select('tag:lc_tags(id,name)').eq('exam_id', id);
      setExamTags((tagLinks || []).map((t) => t.tag).filter(Boolean));
    } catch (err) {
      alert('Failed to load exam: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const updateForm = (patch) => setForm((f) => ({ ...f, ...patch }));

  const handleSave = async () => {
    if (!form.conducting_body_id || !form.region_id || !form.name.trim()) {
      alert('Conducting Body, Region, and Exam Name are required.');
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

  if (loading) return <div className="lc-card"><div className="lc-loading-state">Loading exam…</div></div>;

  const bodyName = conductingBodies.find((b) => b.id === form.conducting_body_id)?.name;

  return (
    <div className="lc-editor-panel">
      <div className="lc-editor-toolbar">
        <h2>{isNew ? 'New Exam' : 'Exam Details'}</h2>
        <div className="lc-editor-toolbar-actions">
          <button className="lc-btn primary" onClick={handleSave} disabled={saving}><Save size={14} /> {saving ? 'Saving…' : 'Save Changes'}</button>
        </div>
      </div>

      <div className="lc-editor-identity">
        <div className="lc-editor-identity-fields">
          <div className="lc-input-group">
            <label>Conducting Body *</label>
            <Select searchable placeholder="Select conducting body..." value={form.conducting_body_id} onChange={(e) => updateForm({ conducting_body_id: e.target.value })} options={conductingBodies.map((b) => ({ value: b.id, label: b.name }))} />
          </div>
          <div className="lc-input-group">
            <label>Region *</label>
            <Select searchable placeholder="Select region..." value={form.region_id} onChange={(e) => updateForm({ region_id: e.target.value })} options={regions.map((r) => ({ value: r.id, label: `${r.name} (${r.level})` }))} />
          </div>
          <div className="lc-input-group">
            <label>Exam Name *</label>
            <input type="text" value={form.name} onChange={(e) => updateForm({ name: e.target.value })} placeholder="e.g. Combined Graduate Level" />
          </div>
          <div className="lc-input-group">
            <label>Category</label>
            <input type="text" value={form.category} onChange={(e) => updateForm({ category: e.target.value })} placeholder="e.g. SSC, Banking (optional)" />
          </div>
          <div className="lc-input-group">
            <label>Website</label>
            <input type="text" value={form.website} onChange={(e) => updateForm({ website: e.target.value })} placeholder="Official conducting-body website (optional)" />
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
        </div>
      </div>
    </div>
  );
};

export default ExamEditorPanel;
