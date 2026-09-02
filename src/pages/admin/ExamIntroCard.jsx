import { useState, useEffect } from 'react';
import { Eye, FileText, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import AdminResourcePreview from './AdminResourcePreview';

/**
 * Rail card for the exam's Introduction (lc_exam_intro) — self-contained,
 * fetches its own data by examId rather than depending on the editor
 * panel's internal state, same pattern ExamStatusCard/ExamSubjectsPanel
 * already use so this keeps working while the editor is mid-load.
 */
const ExamIntroCard = ({ examId }) => {
  const [examIntro, setExamIntro] = useState(null); // lc_exam_intro row, or null if none exists yet
  const [introResourceTitle, setIntroResourceTitle] = useState(null); // joined from resources_v2 when auto-populated
  const [editing, setEditing] = useState(false);
  const [introTitleDraft, setIntroTitleDraft] = useState('');
  const [introBodyDraft, setIntroBodyDraft] = useState('');
  const [introSaving, setIntroSaving] = useState(false);
  const [introPreviewOpen, setIntroPreviewOpen] = useState(false);

  useEffect(() => {
    setIntroPreviewOpen(false);
    if (!examId) {
      setExamIntro(null);
      setIntroResourceTitle(null);
      setEditing(false);
      setIntroTitleDraft('');
      setIntroBodyDraft('');
      return;
    }
    fetchIntro(examId);
  }, [examId]);

  const fetchIntro = async (id) => {
    const { data: intro } = await supabase.from('lc_exam_intro').select('*').eq('exam_id', id).maybeSingle();
    setExamIntro(intro || null);
    setEditing(!intro || intro.source === 'unset');
    setIntroTitleDraft(intro?.manual_title || '');
    setIntroBodyDraft(intro?.manual_body || '');
    if (intro?.resource_id) {
      const { data: resource } = await supabase.from('resources_v2').select('title').eq('resource_id', intro.resource_id).maybeSingle();
      setIntroResourceTitle(resource?.title || null);
    } else {
      setIntroResourceTitle(null);
    }
  };

  const cancelEditing = () => {
    setEditing(false);
    setIntroTitleDraft(examIntro?.manual_title || '');
    setIntroBodyDraft(examIntro?.manual_body || '');
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

  return (
    <div className="lc-card">
      <h3>Introduction</h3>
      {!examId ? (
        <span className="lc-muted-note">Save the exam first — an Introduction slot is created automatically.</span>
      ) : examIntro?.source === 'auto' && examIntro?.resource_id && !editing ? (
        <div>
          <p style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0 0 0.75rem' }}>
            <FileText size={15} color="var(--ios-olive)" /> {introResourceTitle || 'Untitled resource'}
          </p>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="lc-btn" onClick={() => setIntroPreviewOpen(true)}><Eye size={14} /> Preview</button>
            <button className="lc-btn" onClick={() => setEditing(true)}>Edit</button>
          </div>
        </div>
      ) : examIntro?.source === 'manual' && !editing ? (
        <div>
          <div style={{ padding: '0.9rem 1rem', borderRadius: 'var(--radius-sm, 10px)', border: '1px solid var(--border, #e2e8f0)', background: 'var(--surface-alt)', marginBottom: '0.75rem' }}>
            {examIntro.manual_title && <h5 style={{ margin: '0 0 0.5rem', fontSize: '0.9rem' }}>{examIntro.manual_title}</h5>}
            {examIntro.manual_body && <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--admin-text-muted)', whiteSpace: 'pre-wrap' }}>{examIntro.manual_body}</p>}
          </div>
          <button className="lc-btn" onClick={() => setEditing(true)}>Edit</button>
        </div>
      ) : (
        <div>
          {examIntro?.source === 'unset' && <p className="lc-muted-note" style={{ marginTop: 0 }}>No Intro document found for this exam yet — write one below.</p>}
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
            {examIntro?.source && examIntro.source !== 'unset' && <button className="lc-btn" onClick={cancelEditing}>Cancel</button>}
          </div>
        </div>
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

export default ExamIntroCard;
