import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import Select from '../../components/ui/Select';
import ExamThumbnail from './ExamThumbnail';
import AdminResourcePreview from './AdminResourcePreview';
import {
  Save, Plus, X, GripVertical, Trash2, Search, ChevronDown, ChevronUp,
  Eye, Copy, FileText,
} from 'lucide-react';

const STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft' },
  { value: 'published', label: 'Published' },
  { value: 'archived', label: 'Archived' },
];

const ACCENT_COLORS = ['#4b6b32', '#1F3A2E', '#b89047', '#2563eb', '#7c3aed', '#dc2626'];

const EDITOR_TABS = [
  { value: 'syllabus', label: 'Syllabus & Resources' },
  { value: 'info', label: 'Exam Info' },
  { value: 'settings', label: 'Exam Settings' },
];

/**
 * Embeddable exam editor — the centre pane of the Exams master-detail-summary
 * workspace. No page chrome of its own (no header/back-link): the user
 * should never leave the Exams workspace to edit an exam (CMS mockup §11/§24).
 *
 * examId === null means "creating a new exam" (isNew mode).
 */
const ExamEditorPanel = ({ examId, onCreated, onSaved, onDuplicated }) => {
  const isNew = !examId;
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState('syllabus');

  const [conductingBodies, setConductingBodies] = useState([]);
  const [regions, setRegions] = useState([]);
  const [thumbnailTemplates, setThumbnailTemplates] = useState([]);
  const [allTags, setAllTags] = useState([]);

  const [form, setForm] = useState({
    conducting_body_id: '', region_id: '', name: '', category: '', website: '',
    status: 'draft', thumbnail_template_id: '', accent_color: ACCENT_COLORS[0],
  });
  const [examMeta, setExamMeta] = useState(null); // created_at/updated_at/also_listed_as, read-only
  const [examTags, setExamTags] = useState([]);
  const [tagInput, setTagInput] = useState('');

  const [examSubjects, setExamSubjects] = useState([]);
  const [subjectsDirtyOrder, setSubjectsDirtyOrder] = useState(false);
  const dragIndexRef = useRef(null);

  const [examIntro, setExamIntro] = useState(null); // lc_exam_intro row, or null if none exists yet
  const [introResourceTitle, setIntroResourceTitle] = useState(null); // joined from resources_v2 when auto-populated
  const [introOverriding, setIntroOverriding] = useState(false);
  const [introTitleDraft, setIntroTitleDraft] = useState('');
  const [introBodyDraft, setIntroBodyDraft] = useState('');
  const [introSaving, setIntroSaving] = useState(false);
  const [introPreviewOpen, setIntroPreviewOpen] = useState(false);

  const [addSubjectDrawer, setAddSubjectDrawer] = useState(false);
  const [addResourceDrawerFor, setAddResourceDrawerFor] = useState(null);

  useEffect(() => {
    loadReferenceData();
  }, []);

  useEffect(() => {
    setTab('syllabus');
    if (examId) {
      fetchExam(examId);
    } else {
      setForm({ conducting_body_id: '', region_id: '', name: '', category: '', website: '', status: 'draft', thumbnail_template_id: '', accent_color: ACCENT_COLORS[0] });
      setExamMeta(null);
      setExamTags([]);
      setExamSubjects([]);
      setExamIntro(null);
      setIntroResourceTitle(null);
      setIntroOverriding(false);
      setIntroTitleDraft('');
      setIntroBodyDraft('');
      setIntroPreviewOpen(false);
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
        status: exam.status || 'draft',
        thumbnail_template_id: exam.thumbnail_template_id || '',
        thumbnail_subject: exam.thumbnail_subject || '',
        accent_color: exam.accent_color || ACCENT_COLORS[0],
      });
      setExamMeta({ created_at: exam.created_at, updated_at: exam.updated_at, also_listed_as: exam.also_listed_as });

      const { data: tagLinks } = await supabase.from('lc_exam_tags').select('tag:lc_tags(id,name)').eq('exam_id', id);
      setExamTags((tagLinks || []).map((t) => t.tag).filter(Boolean));

      await Promise.all([refetchSubjects(id), fetchIntro(id)]);
    } catch (err) {
      alert('Failed to load exam: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchIntro = async (id) => {
    const { data: intro } = await supabase.from('lc_exam_intro').select('*').eq('exam_id', id).maybeSingle();
    setExamIntro(intro || null);
    setIntroOverriding(false);
    setIntroTitleDraft(intro?.manual_title || '');
    setIntroBodyDraft(intro?.manual_body || '');
    if (intro?.resource_id) {
      const { data: resource } = await supabase.from('resources_v2').select('title').eq('resource_id', intro.resource_id).maybeSingle();
      setIntroResourceTitle(resource?.title || null);
    } else {
      setIntroResourceTitle(null);
    }
  };

  const saveIntro = async () => {
    if (!examId) return;
    setIntroSaving(true);
    try {
      const payload = {
        exam_id: examId,
        resource_id: null,
        manual_title: introTitleDraft.trim() || null,
        manual_body: introBodyDraft.trim() || null,
        source: 'manual',
        updated_at: new Date().toISOString(),
      };
      const { error } = await supabase.from('lc_exam_intro').upsert(payload, { onConflict: 'exam_id' });
      if (error) throw error;
      await fetchIntro(examId);
    } catch (err) {
      alert('Failed to save Introduction: ' + err.message);
    } finally {
      setIntroSaving(false);
    }
  };

  const refetchSubjects = async (id) => {
    const { data: rows } = await supabase
      .from('lc_exam_subjects')
      .select('id, subject_id, display_order, subject:lc_subjects(id,name)')
      .eq('exam_id', id)
      .order('display_order', { ascending: true });

    const examSubjectIds = (rows || []).map((r) => r.id);
    let resourcesByEs = {};
    if (examSubjectIds.length) {
      const { data: sr } = await supabase
        .from('lc_subject_resources')
        .select('exam_subject_id, resource:lc_resources(id,title,resource_type)')
        .in('exam_subject_id', examSubjectIds);
      resourcesByEs = (sr || []).reduce((acc, row) => {
        (acc[row.exam_subject_id] ||= []).push(row.resource);
        return acc;
      }, {});
    }
    setExamSubjects((rows || []).map((r) => ({ ...r, resources: resourcesByEs[r.id] || [] })));
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
        status: form.status,
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

  const handleDuplicate = async () => {
    if (!examId || !window.confirm(`Duplicate "${form.name}" as a new draft exam?`)) return;
    try {
      const { data: original } = await supabase.from('lc_exams').select('*').eq('id', examId).single();
      const { data: newExam, error: insertErr } = await supabase.from('lc_exams').insert({
        conducting_body_id: original.conducting_body_id,
        region_id: original.region_id,
        category: original.category,
        name: `${original.name} (Copy)`,
        website: original.website,
        status: 'draft',
        thumbnail_template_id: original.thumbnail_template_id,
        accent_color: original.accent_color,
      }).select().single();
      if (insertErr) throw insertErr;

      const { data: origSubjects } = await supabase.from('lc_exam_subjects').select('*').eq('exam_id', examId);
      for (const s of origSubjects || []) {
        const { data: newSubj } = await supabase.from('lc_exam_subjects').insert({
          exam_id: newExam.id, subject_id: s.subject_id, display_order: s.display_order,
        }).select().single();
        const { data: origResources } = await supabase.from('lc_subject_resources').select('*').eq('exam_subject_id', s.id);
        if (origResources?.length) {
          await supabase.from('lc_subject_resources').insert(
            origResources.map((r) => ({ exam_subject_id: newSubj.id, resource_id: r.resource_id, display_order: r.display_order }))
          );
        }
      }
      onDuplicated?.(newExam.id);
    } catch (err) {
      alert('Duplicate failed: ' + err.message);
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

  // --- Subjects: drag reorder -----------------------------------------
  const handleDragStart = (index) => { dragIndexRef.current = index; };
  const handleDragOver = (e) => e.preventDefault();
  const handleDrop = (index) => {
    const from = dragIndexRef.current;
    if (from === null || from === index) return;
    setExamSubjects((prev) => {
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(index, 0, moved);
      return next;
    });
    dragIndexRef.current = null;
    setSubjectsDirtyOrder(true);
  };

  const saveSubjectOrder = async () => {
    await Promise.all(examSubjects.map((es, idx) => supabase.from('lc_exam_subjects').update({ display_order: idx }).eq('id', es.id)));
    setSubjectsDirtyOrder(false);
  };

  const removeSubject = async (examSubject) => {
    if (!window.confirm(`Remove "${examSubject.subject?.name}" from this exam? Its resource assignments for this exam will also be removed (the canonical resources themselves are untouched).`)) return;
    const { error } = await supabase.from('lc_exam_subjects').delete().eq('id', examSubject.id);
    if (error) { alert('Failed: ' + error.message); return; }
    setExamSubjects((prev) => prev.filter((es) => es.id !== examSubject.id));
    onSaved?.();
  };

  if (loading) return <div className="lc-card"><div className="lc-loading-state">Loading exam…</div></div>;

  const bodyName = conductingBodies.find((b) => b.id === form.conducting_body_id)?.name;

  return (
    <div className="lc-editor-panel">
      <div className="lc-editor-toolbar">
        <h2>{isNew ? 'New Exam' : 'Exam Details'}</h2>
        <div className="lc-editor-toolbar-actions">
          <button className="lc-btn" onClick={() => alert('Public exam preview is not built yet.')}><Eye size={14} /> Preview</button>
          {!isNew && <button className="lc-btn" onClick={handleDuplicate}><Copy size={14} /> Duplicate</button>}
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

      <div className="lc-editor-tabs">
        {EDITOR_TABS.map((t) => (
          <button key={t.value} className={tab === t.value ? 'active' : ''} onClick={() => setTab(t.value)}>{t.label}</button>
        ))}
      </div>

      {tab === 'syllabus' && (
        <>
        <div className="lc-card">
          <div className="lc-card-row-header">
            <h3 style={{ margin: 0 }}>Introduction</h3>
          </div>
          {!examId ? (
            <span className="lc-muted-note">Save the exam first — an Introduction slot is created automatically.</span>
          ) : examIntro?.source === 'auto' && examIntro?.resource_id && !introOverriding ? (
            <div>
              <p style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0 0 0.75rem' }}>
                <FileText size={15} color="var(--ios-olive)" /> {introResourceTitle || 'Untitled resource'}
              </p>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button className="lc-btn" onClick={() => setIntroPreviewOpen(true)}><Eye size={14} /> Preview</button>
                <button className="lc-btn" onClick={() => setIntroOverriding(true)}>Override</button>
              </div>
            </div>
          ) : (
            <div>
              {examIntro?.source === 'unset' && !introOverriding && (
                <p className="lc-muted-note" style={{ marginTop: 0 }}>No Intro document found for this exam yet — write one below.</p>
              )}
              <div className="lc-input-group">
                <label>Title</label>
                <input type="text" value={introTitleDraft} onChange={(e) => setIntroTitleDraft(e.target.value)} placeholder="Introduction title" />
              </div>
              <div className="lc-input-group">
                <label>Body</label>
                <textarea rows={6} value={introBodyDraft} onChange={(e) => setIntroBodyDraft(e.target.value)} placeholder="Write the introduction content..." />
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button className="lc-btn primary" disabled={introSaving} onClick={saveIntro}>{introSaving ? 'Saving…' : 'Save Introduction'}</button>
                {examIntro?.source === 'auto' && <button className="lc-btn" onClick={() => setIntroOverriding(false)}>Cancel Override</button>}
              </div>
            </div>
          )}
        </div>

        <div className="lc-card">
          <div className="lc-card-row-header">
            <h3 style={{ margin: 0 }}>Subjects in this Exam</h3>
            {!examId ? (
              <span className="lc-muted-note">Save the exam first to add subjects.</span>
            ) : (
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {subjectsDirtyOrder && <button className="lc-btn primary" onClick={saveSubjectOrder}>Save Order</button>}
                <button className="lc-btn" onClick={() => setAddSubjectDrawer(true)}><Plus size={14} /> Add Subject</button>
              </div>
            )}
          </div>

          {examId && examSubjects.length === 0 && <p className="lc-muted-note">No subjects yet. An exam should reference subjects, not duplicate books directly.</p>}

          {examSubjects.map((es, index) => (
            <SubjectRow key={es.id} examSubject={es} index={index} onDragStart={handleDragStart} onDragOver={handleDragOver} onDrop={handleDrop} onRemove={() => removeSubject(es)} onAddResource={() => setAddResourceDrawerFor(es)} />
          ))}
        </div>
        </>
      )}

      {tab === 'info' && (
        <div className="lc-card">
          <div className="lc-input-group">
            <label>Website</label>
            <input type="text" value={form.website} onChange={(e) => updateForm({ website: e.target.value })} placeholder="Official conducting-body website (optional)" />
          </div>
          {examMeta && (
            <>
              <div className="lc-drawer-list-item"><span>Created</span><span>{examMeta.created_at ? new Date(examMeta.created_at).toLocaleString() : '—'}</span></div>
              <div className="lc-drawer-list-item"><span>Last Updated</span><span>{examMeta.updated_at ? new Date(examMeta.updated_at).toLocaleString() : '—'}</span></div>
              {examMeta.also_listed_as && Array.isArray(examMeta.also_listed_as) && examMeta.also_listed_as.length > 0 && (
                <div style={{ marginTop: '1rem' }}>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--admin-text-muted)', marginBottom: '0.5rem' }}>Also listed as (folded during exam-list dedup)</label>
                  {examMeta.also_listed_as.map((a, i) => <div key={i} className="lc-link-chip">{a.level}/{a.state || ''}/{a.exam_name || JSON.stringify(a)}</div>)}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {tab === 'settings' && (
        <div className="lc-card">
          <div className="lc-input-group" style={{ maxWidth: 260 }}>
            <label>Status</label>
            <Select value={form.status} onChange={(e) => updateForm({ status: e.target.value })} options={STATUS_OPTIONS} />
          </div>
          <p className="lc-muted-note" style={{ marginTop: '0.85rem' }}>Duplicate, export, and archive live in the toolbar above and the Quick Actions panel on the right.</p>
        </div>
      )}

      {addSubjectDrawer && examId && (
        <AddSubjectDrawer examId={examId} existingSubjectIds={examSubjects.map((es) => es.subject_id)} nextOrder={examSubjects.length} onClose={() => setAddSubjectDrawer(false)} onAdded={() => { setAddSubjectDrawer(false); refetchSubjects(examId); onSaved?.(); }} />
      )}
      {addResourceDrawerFor && (
        <AddResourceDrawer examSubject={addResourceDrawerFor} onClose={() => setAddResourceDrawerFor(null)} onAdded={() => { setAddResourceDrawerFor(null); refetchSubjects(examId); onSaved?.(); }} />
      )}
      {introPreviewOpen && examIntro?.resource_id && (
        <div className="lc-drawer-backdrop" onClick={() => setIntroPreviewOpen(false)}>
          <div className="lc-drawer-panel" style={{ width: 'min(900px, 92vw)', height: '85vh', display: 'flex', flexDirection: 'column' }} onClick={(e) => e.stopPropagation()}>
            <div className="lc-drawer-header">
              <div><h3>Introduction Preview</h3><p>{introResourceTitle || 'Untitled resource'}</p></div>
              <button className="lc-close-btn" onClick={() => setIntroPreviewOpen(false)}><X size={20} /></button>
            </div>
            <AdminResourcePreview resourceId={examIntro.resource_id} />
          </div>
        </div>
      )}
    </div>
  );
};

const SubjectRow = ({ examSubject, index, onDragStart, onDragOver, onDrop, onRemove, onAddResource }) => {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="lc-subject-row" draggable onDragStart={() => onDragStart(index)} onDragOver={onDragOver} onDrop={() => onDrop(index)}>
      <div className="lc-subject-row-head">
        <GripVertical size={16} className="grip" />
        <span className="name">{String(index + 1).padStart(2, '0')} — {examSubject.subject?.name}</span>
        <span className="count">{examSubject.resources.length} resource{examSubject.resources.length === 1 ? '' : 's'}</span>
        <button className="lc-icon-btn" title="Add resources" onClick={onAddResource}><Plus size={14} /></button>
        <button className="lc-icon-btn" title={expanded ? 'Collapse' : 'Manage'} onClick={() => setExpanded((v) => !v)}>
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
        <button className="lc-icon-btn danger" title="Remove subject" onClick={onRemove}><Trash2 size={14} /></button>
      </div>
      {expanded && (
        <div className="lc-subject-resources">
          {examSubject.resources.length === 0 && <span className="lc-muted-note">No resources assigned.</span>}
          {examSubject.resources.map((r) => <span key={r.id} className="lc-link-chip">{r.title}</span>)}
        </div>
      )}
    </div>
  );
};

const AddSubjectDrawer = ({ examId, existingSubjectIds, nextOrder, onClose, onAdded }) => {
  const [subjects, setSubjects] = useState([]);
  const [search, setSearch] = useState('');
  const [newSubjectName, setNewSubjectName] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => { (async () => { const { data } = await supabase.from('lc_subjects').select('id,name').order('name'); setSubjects(data || []); })(); }, []);

  const available = subjects.filter((s) => !existingSubjectIds.includes(s.id) && (!search || s.name.toLowerCase().includes(search.toLowerCase())));

  const attach = async (subjectId) => {
    setSaving(true);
    const { error } = await supabase.from('lc_exam_subjects').insert({ exam_id: examId, subject_id: subjectId, display_order: nextOrder });
    setSaving(false);
    if (error) { alert('Failed: ' + error.message); return; }
    onAdded();
  };

  const createAndAttach = async () => {
    const trimmed = newSubjectName.trim();
    if (!trimmed) return;
    setSaving(true);
    const { data: subject, error } = await supabase.from('lc_subjects').insert({ name: trimmed }).select().single();
    if (error) { alert('Failed to create subject: ' + error.message); setSaving(false); return; }
    await attach(subject.id);
  };

  return (
    <div className="lc-drawer-backdrop" onClick={onClose}>
      <div className="lc-drawer-panel" onClick={(e) => e.stopPropagation()}>
        <div className="lc-drawer-header">
          <div><h3>Add Subject</h3><p>Attach an existing subject, or create a new one.</p></div>
          <button className="lc-close-btn" onClick={onClose}><X size={20} /></button>
        </div>
        <div className="lc-drawer-body">
          <div className="lc-search-input-wrapper">
            <Search size={16} />
            <input type="text" placeholder="Search subjects..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div>
            {available.map((s) => (
              <div key={s.id} className="lc-drawer-list-item">
                <span>{s.name}</span>
                <button className="lc-btn" style={{ padding: '0.3rem 0.6rem', fontSize: '0.72rem' }} disabled={saving} onClick={() => attach(s.id)}>Add</button>
              </div>
            ))}
            {available.length === 0 && <p className="lc-muted-note">No matching subjects.</p>}
          </div>
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
            <div className="lc-input-group" style={{ marginBottom: '0.6rem' }}>
              <label>Or create a new subject</label>
              <input type="text" value={newSubjectName} onChange={(e) => setNewSubjectName(e.target.value)} placeholder="e.g. General Science" />
            </div>
            <button className="lc-btn primary" disabled={saving || !newSubjectName.trim()} onClick={createAndAttach}>Create &amp; Add</button>
          </div>
        </div>
      </div>
    </div>
  );
};

const AddResourceDrawer = ({ examSubject, onClose, onAdded }) => {
  const [search, setSearch] = useState('');
  const [showAllSubjects, setShowAllSubjects] = useState(false);
  const [results, setResults] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [existingResourceIds, setExistingResourceIds] = useState(new Set());
  const [saving, setSaving] = useState(false);

  const runSearch = useCallback(async () => {
    let query = supabase.from('lc_resources').select('id,title,resource_type,subject:lc_subjects(name)').order('title').limit(40);
    if (search) query = query.ilike('title', `%${search}%`);
    // Default to only this subject's resources -- otherwise every resource in
    // the library shows up regardless of relevance. Toggle off to reach
    // cross-subject resources (or the ones with no subject_id set at all).
    if (!showAllSubjects) query = query.eq('subject_id', examSubject.subject_id);
    const { data } = await query;
    setResults(data || []);
  }, [search, showAllSubjects, examSubject.subject_id]);

  useEffect(() => { (async () => { const { data } = await supabase.from('lc_subject_resources').select('resource_id').eq('exam_subject_id', examSubject.id); setExistingResourceIds(new Set((data || []).map((r) => r.resource_id))); })(); }, [examSubject.id]);
  useEffect(() => { const t = setTimeout(runSearch, 300); return () => clearTimeout(t); }, [runSearch]);

  const toggle = (resourceId) => setSelected((prev) => { const next = new Set(prev); if (next.has(resourceId)) next.delete(resourceId); else next.add(resourceId); return next; });

  const handleAdd = async () => {
    const toAdd = [...selected].filter((rid) => !existingResourceIds.has(rid));
    if (toAdd.length === 0) { onClose(); return; }
    setSaving(true);
    const { error } = await supabase.from('lc_subject_resources').insert(toAdd.map((resourceId, idx) => ({ exam_subject_id: examSubject.id, resource_id: resourceId, display_order: idx })));
    setSaving(false);
    if (error) { alert('Failed: ' + error.message); return; }
    onAdded();
  };

  return (
    <div className="lc-drawer-backdrop" onClick={onClose}>
      <div className="lc-drawer-panel" onClick={(e) => e.stopPropagation()}>
        <div className="lc-drawer-header">
          <div><h3>Add Resources to {examSubject.subject?.name}</h3><p>Selecting references the existing canonical resource — never creates a copy.</p></div>
          <button className="lc-close-btn" onClick={onClose}><X size={20} /></button>
        </div>
        <div className="lc-drawer-body">
          <div className="lc-search-input-wrapper"><Search size={16} /><input type="text" placeholder="Search resources..." value={search} onChange={(e) => setSearch(e.target.value)} /></div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.78rem', color: 'var(--admin-text-muted)', margin: '0.75rem 0' }}>
            <input type="checkbox" checked={showAllSubjects} onChange={(e) => setShowAllSubjects(e.target.checked)} />
            Show resources from all subjects (not just {examSubject.subject?.name})
          </label>
          <div>
            {results.map((r) => {
              const already = existingResourceIds.has(r.id);
              return (
                <label key={r.id} className="lc-drawer-list-item" style={{ cursor: already ? 'default' : 'pointer', opacity: already ? 0.5 : 1 }}>
                  <span><input type="checkbox" disabled={already} checked={already || selected.has(r.id)} onChange={() => toggle(r.id)} style={{ marginRight: '0.6rem' }} />{r.title} <span className="lc-muted-note">· {r.resource_type}{showAllSubjects ? ` · ${r.subject?.name || 'No subject'}` : ''}</span></span>
                  {already && <span className="lc-muted-note">Already added</span>}
                </label>
              );
            })}
            {results.length === 0 && (
              <p className="lc-muted-note">
                No resources found{!showAllSubjects ? ` for ${examSubject.subject?.name}` : ''}.
                {!showAllSubjects && ' Try "Show resources from all subjects" above.'}
              </p>
            )}
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

export default ExamEditorPanel;
