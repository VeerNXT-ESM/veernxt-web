import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useDebounced } from './lcShared';
import { Search } from 'lucide-react';

const GRAPH_VIEWS = [
  { value: 'reuse', label: 'Resource Reuse' },
  { value: 'structure', label: 'Exam Structure' },
  { value: 'subjectCoverage', label: 'Subject Coverage' },
  { value: 'regional', label: 'Regional Distribution' },
  { value: 'gaps', label: 'Content Gaps' },
  { value: 'heatmap', label: 'Resource Heatmap' },
];

const ContentGraphTab = ({ navigate }) => {
  const [view, setView] = useState('reuse');
  return (
    <div>
      <div className="lc-section-header">
        <div>
          <h2>Content Graph</h2>
          <p>Every node here is real and clickable — this shows how canonical content is actually reused, not decoration.</p>
        </div>
      </div>
      <div className="lc-graph-nav">
        {GRAPH_VIEWS.map((v) => (
          <button key={v.value} className={view === v.value ? 'active' : ''} onClick={() => setView(v.value)}>{v.label}</button>
        ))}
      </div>
      {view === 'reuse' && <ResourceReuseView navigate={navigate} />}
      {view === 'structure' && <ExamStructureView navigate={navigate} />}
      {view === 'subjectCoverage' && <SubjectCoverageView />}
      {view === 'regional' && <RegionalDistributionView />}
      {view === 'gaps' && <ContentGapsView navigate={navigate} />}
      {view === 'heatmap' && <ResourceHeatmapView />}
    </div>
  );
};

const ResourceReuseView = () => {
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [expandedExams, setExpandedExams] = useState([]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: usage } = await supabase.from('lc_resource_usage').select('*').order('exam_count', { ascending: false }).limit(30);
      const ids = (usage || []).map((u) => u.resource_id);
      if (!ids.length) { setResources([]); setLoading(false); return; }
      const { data: res } = await supabase.from('lc_resources').select('id,title,resource_type').in('id', ids);
      const resById = Object.fromEntries((res || []).map((r) => [r.id, r]));
      setResources((usage || []).filter((u) => u.exam_count > 0).map((u) => ({ ...resById[u.resource_id], exam_count: u.exam_count })).filter((r) => r.id));
      setLoading(false);
    })();
  }, []);

  const toggleExpand = async (resource) => {
    if (expandedId === resource.id) { setExpandedId(null); return; }
    setExpandedId(resource.id);
    const { data: subjectResources } = await supabase
      .from('lc_subject_resources')
      .select('exam_subject:lc_exam_subjects(exam:lc_exams(id,name), subject:lc_subjects(name))')
      .eq('resource_id', resource.id);
    const seen = new Set();
    const rows = (subjectResources || [])
      .filter((sr) => sr.exam_subject?.exam)
      .map((sr) => ({ exam: sr.exam_subject.exam, subject: sr.exam_subject.subject }))
      .filter((r) => !seen.has(r.exam.id) && seen.add(r.exam.id));
    setExpandedExams(rows);
  };

  if (loading) return <div className="lc-loading-state">Loading…</div>;

  return (
    <div className="lc-card">
      <h3>Top Shared Resources</h3>
      {resources.map((r) => (
        <div key={r.id} style={{ borderBottom: '1px solid var(--border)', padding: '0.75rem 0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }} onClick={() => toggleExpand(r)}>
            <div>
              <span style={{ fontWeight: 700 }}>{r.title}</span>
              <span style={{ color: 'var(--admin-text-muted)', fontSize: '0.78rem', marginLeft: '0.5rem' }}>{r.resource_type}</span>
            </div>
            <span className="lc-count-pill">used by {r.exam_count} exams</span>
          </div>
          {expandedId === r.id && (
            <div style={{ marginTop: '0.6rem' }}>
              {expandedExams.map((row) => (
                <Link key={row.exam.id} to={`/admin/exams?exam=${row.exam.id}`} className="lc-link-chip" style={{ textDecoration: 'none' }}>
                  {row.exam.name} <span style={{ color: 'var(--admin-text-muted)' }}>→ {row.subject?.name}</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      ))}
      {resources.length === 0 && <p style={{ color: 'var(--admin-text-muted)', fontSize: '0.85rem' }}>No shared resources yet.</p>}
    </div>
  );
};

const ExamStructureView = () => {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounced(search, 300);
  const [candidates, setCandidates] = useState([]);
  const [selectedExam, setSelectedExam] = useState(null);
  const [tree, setTree] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!debouncedSearch || debouncedSearch.trim().length < 2) { setCandidates([]); return; }
    (async () => {
      const { data } = await supabase.from('lc_exams').select('id,name').ilike('name', `%${debouncedSearch.trim()}%`).limit(10);
      setCandidates(data || []);
    })();
  }, [debouncedSearch]);

  const selectExam = async (exam) => {
    setSelectedExam(exam);
    setCandidates([]);
    setSearch('');
    setLoading(true);
    const { data: examSubjects } = await supabase
      .from('lc_exam_subjects')
      .select('id, subject:lc_subjects(id,name)')
      .eq('exam_id', exam.id)
      .order('display_order');
    const subjectIds = (examSubjects || []).map((es) => es.id);
    let resourcesByExamSubject = {};
    if (subjectIds.length) {
      const { data: subjectResources } = await supabase
        .from('lc_subject_resources')
        .select('exam_subject_id, resource:lc_resources(id,title)')
        .in('exam_subject_id', subjectIds);
      resourcesByExamSubject = (subjectResources || []).reduce((acc, sr) => {
        (acc[sr.exam_subject_id] ||= []).push(sr.resource);
        return acc;
      }, {});
    }
    setTree((examSubjects || []).map((es) => ({ subject: es.subject, resources: resourcesByExamSubject[es.id] || [] })));
    setLoading(false);
  };

  return (
    <div className="lc-card">
      <h3>Exam Structure</h3>
      <div className="lc-search-input-wrapper" style={{ marginBottom: '1rem', position: 'relative' }}>
        <Search size={16} />
        <input type="text" placeholder="Search for an exam..." value={search} onChange={(e) => setSearch(e.target.value)} />
        {candidates.length > 0 && (
          <div style={{ position: 'absolute', top: '110%', left: 0, right: 0, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, boxShadow: 'var(--shadow-3)', zIndex: 10 }}>
            {candidates.map((c) => (
              <div key={c.id} style={{ padding: '0.6rem 0.85rem', cursor: 'pointer', fontSize: '0.85rem' }} onClick={() => selectExam(c)}>{c.name}</div>
            ))}
          </div>
        )}
      </div>

      {loading && <div className="lc-loading-state">Loading…</div>}
      {selectedExam && !loading && (
        <div>
          <div style={{ fontWeight: 800, color: 'var(--admin-text)', marginBottom: '0.75rem' }}>{selectedExam.name}</div>
          {tree.map((node) => (
            <div key={node.subject?.id} style={{ marginLeft: '1rem', marginBottom: '0.75rem', paddingLeft: '0.75rem', borderLeft: '2px solid var(--border)' }}>
              <div style={{ fontWeight: 700, color: 'var(--admin-text)' }}>↳ {node.subject?.name}</div>
              <div style={{ marginLeft: '1rem', marginTop: '0.35rem' }}>
                {node.resources.length === 0 && <span style={{ fontSize: '0.8rem', color: 'var(--admin-text-muted)' }}>No resources assigned</span>}
                {node.resources.map((r) => <div key={r.id} className="lc-link-chip">↳ {r.title}</div>)}
              </div>
            </div>
          ))}
          {tree.length === 0 && <p style={{ color: 'var(--admin-text-muted)', fontSize: '0.85rem' }}>No subjects assigned to this exam yet.</p>}
        </div>
      )}
      {!selectedExam && !loading && <p style={{ color: 'var(--admin-text-muted)', fontSize: '0.85rem' }}>Search for an exam above to see its full structure.</p>}
    </div>
  );
};

const SubjectCoverageView = () => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    (async () => {
      const [{ data: subs }, { data: stats }] = await Promise.all([
        supabase.from('lc_subjects').select('id,name'),
        supabase.from('lc_subject_stats').select('*'),
      ]);
      const statsById = Object.fromEntries((stats || []).map((s) => [s.subject_id, s]));
      setRows((subs || []).map((s) => ({ ...s, resource_count: statsById[s.id]?.resource_count || 0 })).sort((a, b) => b.resource_count - a.resource_count));
      setLoading(false);
    })();
  }, []);
  if (loading) return <div className="lc-loading-state">Loading…</div>;
  const max = Math.max(1, ...rows.map((r) => r.resource_count));
  return (
    <div className="lc-card">
      <h3>Subjects by Resource Count</h3>
      {rows.map((r) => (
        <div key={r.id} className="lc-bar-row">
          <div className="lc-bar-row-label"><span className="name">{r.name}</span><span className="count">{r.resource_count}</span></div>
          <div className="lc-bar-track"><div className="lc-bar-fill" style={{ width: `${(r.resource_count / max) * 100}%` }} /></div>
        </div>
      ))}
    </div>
  );
};

const RegionalDistributionView = () => {
  const [groups, setGroups] = useState({ central: [], state: [], ut: [] });
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    (async () => {
      const [{ data: regions }, { data: stats }] = await Promise.all([
        supabase.from('lc_regions').select('id,name,level'),
        supabase.from('lc_region_stats').select('*'),
      ]);
      const statsById = Object.fromEntries((stats || []).map((s) => [s.region_id, s]));
      const merged = (regions || []).map((r) => ({ ...r, exam_count: statsById[r.id]?.exam_count || 0 }));
      setGroups({
        central: merged.filter((r) => r.level === 'central').sort((a, b) => b.exam_count - a.exam_count),
        state: merged.filter((r) => r.level === 'state').sort((a, b) => b.exam_count - a.exam_count),
        ut: merged.filter((r) => r.level === 'ut').sort((a, b) => b.exam_count - a.exam_count),
      });
      setLoading(false);
    })();
  }, []);
  if (loading) return <div className="lc-loading-state">Loading…</div>;
  const max = Math.max(1, ...['central', 'state', 'ut'].flatMap((k) => groups[k].map((r) => r.exam_count)));
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
      {['central', 'state', 'ut'].map((level) => (
        <div key={level} className="lc-card">
          <h3 style={{ textTransform: 'capitalize' }}>{level}</h3>
          {groups[level].slice(0, 12).map((r) => (
            <div key={r.id} className="lc-bar-row">
              <div className="lc-bar-row-label"><span className="name">{r.name}</span><span className="count">{r.exam_count}</span></div>
              <div className="lc-bar-track"><div className="lc-bar-fill" style={{ width: `${(r.exam_count / max) * 100}%` }} /></div>
            </div>
          ))}
          {groups[level].length === 0 && <p style={{ color: 'var(--admin-text-muted)', fontSize: '0.82rem' }}>No regions.</p>}
        </div>
      ))}
    </div>
  );
};

const ContentGapsView = () => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    (async () => {
      const { data: stats } = await supabase.from('lc_exam_stats').select('*').order('resource_count', { ascending: true }).limit(30);
      const ids = (stats || []).map((s) => s.exam_id);
      let exams = [];
      if (ids.length) {
        const { data } = await supabase.from('lc_exams').select('id,name,status,conducting_body:lc_conducting_bodies(name)').in('id', ids);
        exams = data || [];
      }
      const examById = Object.fromEntries(exams.map((e) => [e.id, e]));
      setRows((stats || []).map((s) => ({ ...s, exam: examById[s.exam_id] })).filter((r) => r.exam));
      setLoading(false);
    })();
  }, []);
  if (loading) return <div className="lc-loading-state">Loading…</div>;
  return (
    <div className="lc-card">
      <h3>Exams With the Least Content Coverage</h3>
      <p style={{ fontSize: '0.82rem', color: 'var(--admin-text-muted)', marginTop: '-0.5rem', marginBottom: '1rem' }}>Lowest resource count first — the exams most in need of subject/resource assignment.</p>
      {rows.map((r) => (
        <Link key={r.exam_id} to={`/admin/exams?exam=${r.exam_id}`} className="lc-drawer-list-item" style={{ textDecoration: 'none', color: 'inherit' }}>
          <span>{r.exam.name} <span style={{ color: 'var(--admin-text-muted)' }}>· {r.exam.conducting_body?.name}</span></span>
          <span className="lc-count-pill">{r.subject_count} subjects · {r.resource_count} resources</span>
        </Link>
      ))}
      {rows.length === 0 && <p style={{ color: 'var(--admin-text-muted)', fontSize: '0.85rem' }}>No exams found.</p>}
    </div>
  );
};

// Resource × Subject heatmap (not Resource × Exam — see plan notes: 93×1,534
// cells wouldn't render or mean anything; this answers the same underlying
// question — where is canonical content concentrated — at a legible scale).
const ResourceHeatmapView = () => {
  const [loading, setLoading] = useState(true);
  const [subjects, setSubjects] = useState([]);
  const [resources, setResources] = useState([]);
  const [matrix, setMatrix] = useState({});

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [{ data: subs }, { data: res }] = await Promise.all([
        supabase.from('lc_subjects').select('id,name').order('name'),
        supabase.from('lc_resources').select('id,title').order('title'),
      ]);
      setSubjects(subs || []);
      setResources(res || []);

      // Page through lc_subject_resources -> lc_exam_subjects (subject_id, exam_id)
      // 1000 rows at a time — the whole table is ~9.4k rows, small enough to
      // aggregate client-side once per view-open, not per-render.
      const cellExamSets = {}; // `${resourceId}::${subjectId}` -> Set(examId)
      let from = 0;
      const pageSize = 1000;
      while (true) {
        const { data, error } = await supabase
          .from('lc_subject_resources')
          .select('resource_id, exam_subject:lc_exam_subjects(subject_id, exam_id)')
          .range(from, from + pageSize - 1);
        if (error) { console.error(error); break; }
        for (const row of data || []) {
          const subjectId = row.exam_subject?.subject_id;
          const examId = row.exam_subject?.exam_id;
          if (!subjectId || !examId) continue;
          const key = `${row.resource_id}::${subjectId}`;
          (cellExamSets[key] ||= new Set()).add(examId);
        }
        if (!data || data.length < pageSize) break;
        from += pageSize;
      }
      const counts = {};
      for (const key of Object.keys(cellExamSets)) counts[key] = cellExamSets[key].size;
      setMatrix(counts);
      setLoading(false);
    })();
  }, []);

  if (loading) return <div className="lc-loading-state">Building heatmap…</div>;

  const maxCount = Math.max(1, ...Object.values(matrix));
  const cellColor = (count) => {
    if (!count) return 'transparent';
    const alpha = 0.15 + 0.7 * (count / maxCount);
    return `rgba(16, 185, 129, ${alpha.toFixed(2)})`;
  };

  return (
    <div className="lc-card">
      <h3>Resource × Subject Heatmap</h3>
      <p style={{ fontSize: '0.82rem', color: 'var(--admin-text-muted)', marginTop: '-0.5rem', marginBottom: '1rem' }}>
        Cell = number of distinct exams (within that subject) using that resource. Scoped to Resource × Subject rather than Resource × Exam — 93 × 12 is legible, 93 × 1,534 is not.
      </p>
      <div className="lc-heatmap-wrapper">
        <table className="lc-heatmap-table">
          <thead>
            <tr>
              <th className="row-label">Resource</th>
              {subjects.map((s) => <th key={s.id}>{s.name}</th>)}
            </tr>
          </thead>
          <tbody>
            {resources.map((r) => (
              <tr key={r.id}>
                <th className="row-label">{r.title}</th>
                {subjects.map((s) => {
                  const count = matrix[`${r.id}::${s.id}`] || 0;
                  return (
                    <td key={s.id} className={count ? '' : 'cell-empty'} style={{ background: cellColor(count) }} title={`${r.title} × ${s.name}: ${count}`}>
                      {count || '·'}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ContentGraphTab;
