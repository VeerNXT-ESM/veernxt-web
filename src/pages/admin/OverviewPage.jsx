import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

// The admin home. Built from the Learning Center CMS's former "Analytics"
// tab (lc_* data — this is the canonical, master-documents-only content
// now), plus one live count (registered users) carried over from the old
// AdminDashboard stat cards. The old cards' resources_v2-sourced "Ingested
// Books"/"Target Exams" numbers are deliberately dropped, not replaced —
// they measured a table this CMS no longer manages.
const OverviewPage = () => {
  const [loading, setLoading] = useState(true);
  const [totals, setTotals] = useState({ exams: 0, resources: 0, subjects: 0, bodies: 0, users: 0 });
  const [reuseRate, setReuseRate] = useState(0);
  const [byType, setByType] = useState([]);
  const [byRegion, setByRegion] = useState([]);
  const [topShared, setTopShared] = useState([]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [examsCount, resourcesCount, subjectsCount, bodiesCount, usersCount, allResources, allUsage, regionStats, regions] = await Promise.all([
        supabase.from('lc_exams').select('*', { count: 'exact', head: true }),
        supabase.from('lc_resources').select('*', { count: 'exact', head: true }),
        supabase.from('lc_subjects').select('*', { count: 'exact', head: true }),
        supabase.from('lc_conducting_bodies').select('*', { count: 'exact', head: true }),
        supabase.from('user_profiles').select('*', { count: 'exact', head: true }),
        supabase.from('lc_resources').select('resource_type'),
        supabase.from('lc_resource_usage').select('*'),
        supabase.from('lc_region_stats').select('*'),
        supabase.from('lc_regions').select('id,level'),
      ]);

      setTotals({
        exams: examsCount.count || 0,
        resources: resourcesCount.count || 0,
        subjects: subjectsCount.count || 0,
        bodies: bodiesCount.count || 0,
        users: usersCount.count || 0,
      });

      const usageRows = allUsage.data || [];
      const usedByMultiple = usageRows.filter((u) => u.exam_count > 1).length;
      setReuseRate(usageRows.length ? Math.round((usedByMultiple / usageRows.length) * 100) : 0);

      const typeCounts = {};
      for (const r of allResources.data || []) typeCounts[r.resource_type] = (typeCounts[r.resource_type] || 0) + 1;
      setByType(Object.entries(typeCounts).sort((a, b) => b[1] - a[1]));

      const statsById = Object.fromEntries((regionStats.data || []).map((s) => [s.region_id, s.exam_count]));
      const levelCounts = { central: 0, state: 0, ut: 0 };
      for (const r of regions.data || []) levelCounts[r.level] = (levelCounts[r.level] || 0) + (statsById[r.id] || 0);
      setByRegion(Object.entries(levelCounts));

      const sortedUsage = [...usageRows].sort((a, b) => b.exam_count - a.exam_count).slice(0, 8);
      const ids = sortedUsage.map((u) => u.resource_id);
      let titlesById = {};
      if (ids.length) {
        const { data: res } = await supabase.from('lc_resources').select('id,title').in('id', ids);
        titlesById = Object.fromEntries((res || []).map((r) => [r.id, r.title]));
      }
      setTopShared(sortedUsage.map((u) => ({ id: u.resource_id, title: titlesById[u.resource_id] || 'Untitled', exam_count: u.exam_count })));

      setLoading(false);
    })();
  }, []);

  if (loading) return <div className="lc-loading-state">Loading overview…</div>;

  const maxType = Math.max(1, ...byType.map(([, c]) => c));
  const maxRegion = Math.max(1, ...byRegion.map(([, c]) => c));
  const maxShared = Math.max(1, ...topShared.map((r) => r.exam_count));

  return (
    <div>
      <div className="lc-section-header">
        <div>
          <h2>Overview</h2>
          <p>Lightweight, real numbers — not decoration.</p>
        </div>
      </div>

      <div className="lc-stat-grid">
        <div className="lc-stat-card"><div className="value">{totals.exams}</div><div className="label">Total Exams</div></div>
        <div className="lc-stat-card"><div className="value">{totals.resources}</div><div className="label">Unique Resources</div></div>
        <div className="lc-stat-card"><div className="value">{totals.subjects}</div><div className="label">Subjects</div></div>
        <div className="lc-stat-card"><div className="value">{totals.bodies}</div><div className="label">Conducting Bodies</div></div>
        <div className="lc-stat-card"><div className="value">{totals.users}</div><div className="label">Registered Users</div></div>
        <div className="lc-stat-card"><div className="value">{reuseRate}%</div><div className="label">Resource Reuse Rate</div></div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <div className="lc-card">
          <h3>Resources by Type</h3>
          {byType.map(([type, count]) => (
            <div key={type} className="lc-bar-row">
              <div className="lc-bar-row-label"><span className="name">{type}</span><span className="count">{count}</span></div>
              <div className="lc-bar-track"><div className="lc-bar-fill" style={{ width: `${(count / maxType) * 100}%` }} /></div>
            </div>
          ))}
        </div>
        <div className="lc-card">
          <h3>Exams by Region</h3>
          {byRegion.map(([level, count]) => (
            <div key={level} className="lc-bar-row">
              <div className="lc-bar-row-label"><span className="name" style={{ textTransform: 'capitalize' }}>{level}</span><span className="count">{count}</span></div>
              <div className="lc-bar-track"><div className="lc-bar-fill" style={{ width: `${(count / maxRegion) * 100}%` }} /></div>
            </div>
          ))}
        </div>
        <div className="lc-card" style={{ gridColumn: 'span 2' }}>
          <h3>Top Shared Resources</h3>
          {topShared.map((r) => (
            <div key={r.id} className="lc-bar-row">
              <div className="lc-bar-row-label"><span className="name">{r.title}</span><span className="count">{r.exam_count} exams</span></div>
              <div className="lc-bar-track"><div className="lc-bar-fill" style={{ width: `${(r.exam_count / maxShared) * 100}%` }} /></div>
            </div>
          ))}
          {topShared.length === 0 && <p style={{ color: 'var(--admin-text-muted)', fontSize: '0.85rem' }}>No usage data yet.</p>}
        </div>
      </div>
    </div>
  );
};

export default OverviewPage;
