import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Eye, Download, Archive, RotateCcw } from 'lucide-react';
import { StatusBadge } from './lcShared';

/**
 * Right-hand rail of the Exams workspace — small, dense, contextual panels
 * for whichever exam is selected (CMS mockup §18: "Contextual Information
 * Rail"). Self-contained: fetches its own data by examId rather than
 * depending on the editor panel's internal state, so Quick Actions work
 * even while the editor is mid-load.
 */
const ExamContextRail = ({ examId, onChanged }) => {
  const [loading, setLoading] = useState(true);
  const [exam, setExam] = useState(null);
  const [byType, setByType] = useState([]);
  const [bySubject, setBySubject] = useState([]);

  useEffect(() => {
    if (!examId) { setExam(null); setLoading(false); return; }
    (async () => {
      setLoading(true);
      const { data: examRow } = await supabase.from('lc_exams').select('*').eq('id', examId).single();
      const { data: stats } = await supabase.from('lc_exam_stats').select('*').eq('exam_id', examId).maybeSingle();
      setExam(examRow ? { ...examRow, stats: stats || { subject_count: 0, resource_count: 0 } } : null);

      const { data: examSubjects } = await supabase
        .from('lc_exam_subjects')
        .select('id, subject:lc_subjects(name)')
        .eq('exam_id', examId);
      const esIds = (examSubjects || []).map((es) => es.id);
      const nameByEs = Object.fromEntries((examSubjects || []).map((es) => [es.id, es.subject?.name || 'Unnamed']));

      let subjectResources = [];
      if (esIds.length) {
        const { data } = await supabase
          .from('lc_subject_resources')
          .select('exam_subject_id, resource:lc_resources(id,resource_type)')
          .in('exam_subject_id', esIds);
        subjectResources = data || [];
      }

      const typeCounts = {};
      const subjectCounts = {};
      for (const row of subjectResources) {
        if (!row.resource) continue;
        typeCounts[row.resource.resource_type] = (typeCounts[row.resource.resource_type] || 0) + 1;
        const sName = nameByEs[row.exam_subject_id];
        subjectCounts[sName] = (subjectCounts[sName] || 0) + 1;
      }
      setByType(Object.entries(typeCounts).sort((a, b) => b[1] - a[1]));
      setBySubject(Object.entries(subjectCounts).sort((a, b) => b[1] - a[1]));
      setLoading(false);
    })();
  }, [examId]);

  const handleExport = () => {
    if (!exam) return;
    const blob = new Blob([JSON.stringify(exam, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(exam.name || 'exam').replace(/[^a-z0-9]+/gi, '_')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleArchiveToggle = async () => {
    if (!exam) return;
    const willArchive = exam.status !== 'archived';
    if (!window.confirm(`${willArchive ? 'Archive' : 'Restore to draft'} "${exam.name}"?`)) return;
    const { error } = await supabase.from('lc_exams').update({ status: willArchive ? 'archived' : 'draft' }).eq('id', examId);
    if (error) { alert('Failed: ' + error.message); return; }
    setExam((e) => ({ ...e, status: willArchive ? 'archived' : 'draft' }));
    onChanged?.();
  };

  if (!examId) {
    return <div className="lc-card"><p className="lc-muted-note">Select an exam to see its summary.</p></div>;
  }
  if (loading || !exam) {
    return <div className="lc-card"><div className="lc-loading-state">Loading…</div></div>;
  }

  const totalResources = byType.reduce((sum, [, c]) => sum + c, 0);
  const maxType = Math.max(1, ...byType.map(([, c]) => c));
  const maxSubject = Math.max(1, ...bySubject.map(([, c]) => c));

  return (
    <div className="lc-rail">
      <div className="lc-card">
        <h3>Exam Summary</h3>
        <div className="lc-drawer-list-item"><span>Total Subjects</span><span>{exam.stats.subject_count}</span></div>
        <div className="lc-drawer-list-item"><span>Total Resources</span><span>{exam.stats.resource_count}</span></div>
        <div className="lc-drawer-list-item"><span>Last Updated</span><span>{exam.updated_at ? new Date(exam.updated_at).toLocaleDateString() : '—'}</span></div>
        <div className="lc-drawer-list-item"><span>Status</span><StatusBadge status={exam.status} /></div>
      </div>

      <div className="lc-card">
        <h3>Content Overview</h3>
        <div className="lc-donut-total">{totalResources}<span>resources</span></div>
        {byType.map(([type, count]) => (
          <div key={type} className="lc-bar-row">
            <div className="lc-bar-row-label"><span className="name">{type}</span><span className="count">{count}</span></div>
            <div className="lc-bar-track"><div className="lc-bar-fill" style={{ width: `${(count / maxType) * 100}%` }} /></div>
          </div>
        ))}
        {byType.length === 0 && <p className="lc-muted-note">No resources assigned yet.</p>}
      </div>

      <div className="lc-card">
        <h3>Subject Distribution</h3>
        {bySubject.map(([name, count]) => (
          <div key={name} className="lc-bar-row">
            <div className="lc-bar-row-label"><span className="name">{name}</span><span className="count">{count}</span></div>
            <div className="lc-bar-track"><div className="lc-bar-fill" style={{ width: `${(count / maxSubject) * 100}%` }} /></div>
          </div>
        ))}
        {bySubject.length === 0 && <p className="lc-muted-note">No subjects assigned yet.</p>}
      </div>

      <div className="lc-card">
        <h3>Quick Actions</h3>
        <div className="lc-quick-actions">
          <button className="lc-quick-action" onClick={() => alert('Public exam preview is not built yet.')}><Eye size={15} /> Preview Exam</button>
          <button className="lc-quick-action" onClick={handleExport}><Download size={15} /> Export Exam Data</button>
          <button className="lc-quick-action danger" onClick={handleArchiveToggle}>
            {exam.status === 'archived' ? <RotateCcw size={15} /> : <Archive size={15} />}
            {exam.status === 'archived' ? 'Restore to Draft' : 'Archive Exam'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExamContextRail;
