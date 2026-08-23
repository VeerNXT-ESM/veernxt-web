import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Search, ChevronDown, ChevronUp } from 'lucide-react';

const SyllabusTab = () => {
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [expandedData, setExpandedData] = useState(null);
  const [expandLoading, setExpandLoading] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [{ data: subs }, { data: stats }] = await Promise.all([
        supabase.from('lc_subjects').select('*').order('name'),
        supabase.from('lc_subject_stats').select('*'),
      ]);
      const statsById = Object.fromEntries((stats || []).map((s) => [s.subject_id, s]));
      setSubjects((subs || []).map((s) => ({ ...s, stats: statsById[s.id] || { resource_count: 0, exam_count: 0 } })));
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(
    () => subjects.filter((s) => !search || s.name.toLowerCase().includes(search.toLowerCase())),
    [subjects, search]
  );

  const toggleExpand = async (subject) => {
    if (expandedId === subject.id) { setExpandedId(null); setExpandedData(null); return; }
    setExpandedId(subject.id);
    setExpandLoading(true);
    try {
      const { data: examSubjects } = await supabase
        .from('lc_exam_subjects')
        .select('id, exam:lc_exams(id,name)')
        .eq('subject_id', subject.id);

      const examSubjectIds = (examSubjects || []).map((es) => es.id);
      let resources = [];
      if (examSubjectIds.length) {
        const { data: subjectResources } = await supabase
          .from('lc_subject_resources')
          .select('resource:lc_resources(id,title,resource_type)')
          .in('exam_subject_id', examSubjectIds);
        const seen = new Set();
        resources = (subjectResources || [])
          .map((r) => r.resource)
          .filter((r) => r && !seen.has(r.id) && seen.add(r.id));
      }

      const seenExams = new Set();
      const exams = (examSubjects || [])
        .map((es) => es.exam)
        .filter((e) => e && !seenExams.has(e.id) && seenExams.add(e.id));

      setExpandedData({ resources, exams });
    } catch (err) {
      console.error('Error expanding subject:', err);
    } finally {
      setExpandLoading(false);
    }
  };

  return (
    <div>
      <div className="lc-section-header">
        <div>
          <h2>Syllabus</h2>
          <p>Inspect subjects independently of any one exam — a second way of navigating the same data.</p>
        </div>
      </div>

      <div className="lc-filter-bar" style={{ gridTemplateColumns: '1fr' }}>
        <div className="lc-filter-field lc-search-input-wrapper">
          <Search size={16} />
          <input type="text" placeholder="Search subjects..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      {loading && <div className="lc-loading-state">Loading syllabus…</div>}

      {!loading && filtered.map((subject) => (
        <div key={subject.id} className="lc-card" style={{ marginBottom: '0.85rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }} onClick={() => toggleExpand(subject)}>
            <div>
              <div style={{ fontWeight: 700, color: 'var(--admin-text)' }}>{subject.name}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--admin-text-muted)', marginTop: '0.2rem' }}>
                {subject.stats.resource_count} resource{subject.stats.resource_count === 1 ? '' : 's'} · used across {subject.stats.exam_count} exam{subject.stats.exam_count === 1 ? '' : 's'}
              </div>
            </div>
            {expandedId === subject.id ? <ChevronUp size={18} color="var(--admin-text-muted)" /> : <ChevronDown size={18} color="var(--admin-text-muted)" />}
          </div>

          {expandedId === subject.id && (
            <div style={{ marginTop: '1rem', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
              {expandLoading && <div className="lc-loading-state">Loading…</div>}
              {!expandLoading && expandedData && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                  <div>
                    <h4 style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--admin-text-muted)', marginBottom: '0.6rem' }}>Resources</h4>
                    {expandedData.resources.length === 0 && <p style={{ fontSize: '0.82rem', color: 'var(--admin-text-muted)' }}>None assigned yet.</p>}
                    {expandedData.resources.map((r) => <div key={r.id} className="lc-link-chip">{r.title}</div>)}
                  </div>
                  <div>
                    <h4 style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--admin-text-muted)', marginBottom: '0.6rem' }}>Exams using this subject</h4>
                    {expandedData.exams.length === 0 && <p style={{ fontSize: '0.82rem', color: 'var(--admin-text-muted)' }}>None yet.</p>}
                    {expandedData.exams.map((e) => (
                      <Link key={e.id} to={`/admin/exams?exam=${e.id}`} className="lc-link-chip" style={{ textDecoration: 'none' }}>{e.name}</Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      ))}

      {!loading && filtered.length === 0 && (
        <div className="lc-empty-state"><p>No subjects match "{search}".</p></div>
      )}
    </div>
  );
};

export default SyllabusTab;
