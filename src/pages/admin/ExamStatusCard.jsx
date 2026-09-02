import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

/**
 * Rail card below Introduction — Status toggle + read-only exam metadata
 * (Created/Last Updated/Also-listed-as). Self-contained by examId, same
 * pattern as ExamIntroCard. The toggle saves immediately on change rather
 * than waiting for the editor's own Save Changes, since it now lives
 * outside that form entirely.
 */
const ExamStatusCard = ({ examId }) => {
  const [exam, setExam] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!examId) { setExam(null); return; }
    fetchExam(examId);
  }, [examId]);

  const fetchExam = async (id) => {
    const { data } = await supabase.from('lc_exams').select('status,created_at,updated_at,also_listed_as').eq('id', id).maybeSingle();
    setExam(data || null);
  };

  const toggleStatus = async (e) => {
    const nextStatus = e.target.checked ? 'published' : 'draft';
    setExam((prev) => ({ ...prev, status: nextStatus }));
    setSaving(true);
    const { error } = await supabase.from('lc_exams').update({ status: nextStatus, updated_at: new Date().toISOString() }).eq('id', examId);
    setSaving(false);
    if (error) { alert('Failed to update status: ' + error.message); return; }
    fetchExam(examId);
  };

  return (
    <div className="lc-card">
      <h3>Status</h3>
      {!examId ? (
        <span className="lc-muted-note">Save the exam first to set its status.</span>
      ) : !exam ? (
        <span className="lc-muted-note">Loading…</span>
      ) : (
        <>
          <div className="lc-input-group">
            <label className="lc-toggle">
              <input type="checkbox" checked={exam.status === 'published'} disabled={saving} onChange={toggleStatus} />
              <span className="lc-toggle-track"><span className="lc-toggle-thumb" /></span>
              <span className="lc-toggle-label">{exam.status === 'published' ? 'Published' : 'Draft'}</span>
            </label>
          </div>
          <div className="lc-input-group">
            <label>Details</label>
            <div className="lc-drawer-list-item"><span>Created</span><span>{exam.created_at ? new Date(exam.created_at).toLocaleString() : '—'}</span></div>
            <div className="lc-drawer-list-item"><span>Last Updated</span><span>{exam.updated_at ? new Date(exam.updated_at).toLocaleString() : '—'}</span></div>
            {exam.also_listed_as && Array.isArray(exam.also_listed_as) && exam.also_listed_as.length > 0 && (
              <div style={{ marginTop: '0.75rem' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--admin-text-muted)', marginBottom: '0.5rem' }}>Also listed as (folded during exam-list dedup)</label>
                {exam.also_listed_as.map((a, i) => <div key={i} className="lc-link-chip">{a.level}/{a.state || ''}/{a.exam_name || JSON.stringify(a)}</div>)}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default ExamStatusCard;
