import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { Plus, GripVertical, Trash2, Search, ChevronDown, ChevronUp, X } from 'lucide-react';

/**
 * Full-width Subjects section below the Exams workspace grid —
 * self-contained by examId, same pattern ExamIntroCard/ExamStatusCard
 * already use, so it works independently of the editor panel's load
 * state and can occupy the page's full width instead of the narrow
 * editor column.
 */
const ExamSubjectsPanel = ({ examId, onChanged }) => {
  const [examSubjects, setExamSubjects] = useState([]);
  const [subjectsDirtyOrder, setSubjectsDirtyOrder] = useState(false);
  const dragIndexRef = useRef(null);

  const [addSubjectDrawer, setAddSubjectDrawer] = useState(false);
  const [addResourceDrawerFor, setAddResourceDrawerFor] = useState(null);

  useEffect(() => {
    setSubjectsDirtyOrder(false);
    if (!examId) { setExamSubjects([]); return; }
    refetchSubjects(examId);
  }, [examId]);

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
    onChanged?.();
  };

  return (
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

      {addSubjectDrawer && examId && (
        <AddSubjectDrawer examId={examId} existingSubjectIds={examSubjects.map((es) => es.subject_id)} nextOrder={examSubjects.length} onClose={() => setAddSubjectDrawer(false)} onAdded={() => { setAddSubjectDrawer(false); refetchSubjects(examId); onChanged?.(); }} />
      )}
      {addResourceDrawerFor && (
        <AddResourceDrawer examSubject={addResourceDrawerFor} onClose={() => setAddResourceDrawerFor(null)} onAdded={() => { setAddResourceDrawerFor(null); refetchSubjects(examId); onChanged?.(); }} />
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

export default ExamSubjectsPanel;
