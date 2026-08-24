import { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import Select from '../../components/ui/Select';
import { PAGE_SIZE, useDebounced } from './lcShared';
import { CAREER_TRACK_META, CAREER_TRACK_ORDER, hexToRgba } from '../../lib/careerTrack';
import { Search, ChevronLeft, ChevronRight, X, Pencil, Check, Trash2, Link as LinkIcon } from 'lucide-react';

const CategoryTag = ({ track }) => {
  const meta = CAREER_TRACK_META[track];
  if (!meta) return null;
  return (
    <span className="lc-category-tag" style={{ background: hexToRgba(meta.hueDark, 0.14), color: meta.hueDark }}>
      {meta.label}
    </span>
  );
};

const AdminJobs = () => {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounced(search);
  const [trackFilter, setTrackFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [detailJob, setDetailJob] = useState(null);

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await axios.get('/api/jobs');
      setJobs(data?.jobs || []);
    } catch (err) {
      console.error('Failed to fetch jobs:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchJobs(); }, [fetchJobs]);
  useEffect(() => { setPage(1); }, [debouncedSearch, trackFilter]);

  const searchFiltered = useMemo(() => jobs.filter((j) => {
    if (!debouncedSearch) return true;
    const q = debouncedSearch.toLowerCase();
    return j.title?.toLowerCase().includes(q) || j.body?.toLowerCase().includes(q);
  }), [jobs, debouncedSearch]);

  // Reflects the active search but not the active track pill, so switching
  // tracks doesn't make the other counts vanish — same pattern as the
  // candidate-facing career-track filter this was lifted from.
  const trackCounts = useMemo(() => searchFiltered.reduce((acc, j) => {
    const t = j.careerTrack || 'STATE_GOVT';
    acc[t] = (acc[t] || 0) + 1;
    return acc;
  }, {}), [searchFiltered]);

  const filtered = useMemo(
    () => searchFiltered.filter((j) => trackFilter === 'ALL' || (j.careerTrack || 'STATE_GOVT') === trackFilter),
    [searchFiltered, trackFilter]
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleUpdated = (jobId, patch) => {
    setJobs((prev) => prev.map((j) => (j.id === jobId ? { ...j, ...patch } : j)));
    setDetailJob((d) => (d && d.id === jobId ? { ...d, ...patch } : d));
  };

  const handleDeleted = (jobId) => {
    setJobs((prev) => prev.filter((j) => j.id !== jobId));
    setDetailJob(null);
  };

  return (
    <div>
      <div className="lc-section-header">
        <div>
          <h2>Job Board</h2>
          <p>Aggregated vacancy notifications from SSC, IBPS, Railways, and State PSCs.</p>
        </div>
      </div>

      <div className="lc-filter-bar">
        <div className="lc-filter-field lc-search-input-wrapper">
          <Search size={16} />
          <input type="text" placeholder="Search by title or conducting body..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="lc-category-pills">
        <button
          className="lc-category-pill"
          style={trackFilter === 'ALL' ? { background: 'var(--admin-accent-soft)', color: 'var(--admin-accent)', borderColor: 'var(--admin-accent)' } : undefined}
          onClick={() => setTrackFilter('ALL')}
        >
          All <span className="lc-category-pill-count">{searchFiltered.length}</span>
        </button>
        {CAREER_TRACK_ORDER.filter((t) => trackCounts[t] > 0).map((t) => {
          const meta = CAREER_TRACK_META[t];
          const active = trackFilter === t;
          return (
            <button
              key={t}
              className="lc-category-pill"
              style={active ? { background: hexToRgba(meta.hueDark, 0.16), color: meta.hueDark, borderColor: meta.hueDark } : undefined}
              onClick={() => setTrackFilter(t)}
            >
              {meta.label} <span className="lc-category-pill-count">{trackCounts[t]}</span>
            </button>
          );
        })}
      </div>

      <div className="lc-table-responsive">
        <table className="lc-table">
          <thead>
            <tr>
              <th>Conducting Body</th>
              <th>Notification</th>
              <th>Published</th>
              <th>Last Date</th>
              <th style={{ textAlign: 'right' }}>Vacancies</th>
              <th>Track</th>
            </tr>
          </thead>
          <tbody>
            {pageRows.map((job) => (
              <tr key={job.id} className="clickable" onClick={() => setDetailJob(job)}>
                <td>
                  <span className="lc-table-title">{job.body}</span>
                  {job.examName && <span className="lc-table-sub">Exam: {job.examName}</span>}
                </td>
                <td><span className="lc-truncate" style={{ maxWidth: '360px', display: 'block' }} title={job.title}>{job.title}</span></td>
                <td>{job.publishedOn ? new Date(job.publishedOn).toLocaleDateString() : 'Recent'}</td>
                <td>{job.lastDate ? new Date(job.lastDate).toLocaleDateString() : 'N/A'}</td>
                <td style={{ textAlign: 'right' }}><span className="lc-count-pill">{job.vacancies || '—'}</span></td>
                <td>{job.careerTrack && <CategoryTag track={job.careerTrack} />}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {loading && <div className="lc-loading-state">Loading jobs…</div>}
        {!loading && pageRows.length === 0 && <div className="lc-empty-state"><p>No jobs match the current filters.</p></div>}

        {!loading && pageRows.length > 0 && (
          <div className="lc-pagination-bar">
            <span className="lc-pagination-info">{filtered.length} job{filtered.length === 1 ? '' : 's'} — page {page} of {totalPages}</span>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button className="lc-pagination-btn" disabled={page === 1} onClick={() => setPage((p) => p - 1)}><ChevronLeft size={14} /> Prev</button>
              <button className="lc-pagination-btn" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>Next <ChevronRight size={14} /></button>
            </div>
          </div>
        )}
      </div>

      {detailJob && (
        <JobDetailDrawer
          job={detailJob}
          onClose={() => setDetailJob(null)}
          onUpdated={(patch) => handleUpdated(detailJob.id, patch)}
          onDeleted={() => handleDeleted(detailJob.id)}
        />
      )}
    </div>
  );
};

const toDateInputValue = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
};

const JobDetailDrawer = ({ job, onClose, onUpdated, onDeleted }) => {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [title, setTitle] = useState(job.title || '');
  const [careerTrack, setCareerTrack] = useState(job.careerTrack || 'STATE_GOVT');
  const [lastDate, setLastDate] = useState(toDateInputValue(job.lastDate));
  const [vacancies, setVacancies] = useState(job.vacancies || '');
  const [examId, setExamId] = useState(job.examId || null);
  const [examName, setExamName] = useState(job.examName || '');
  const [examSearch, setExamSearch] = useState('');
  const debouncedExamSearch = useDebounced(examSearch, 300);
  const [examMatches, setExamMatches] = useState([]);

  useEffect(() => {
    if (!debouncedExamSearch || debouncedExamSearch.trim().length < 2) { setExamMatches([]); return; }
    (async () => {
      const { data } = await supabase.from('lc_exams').select('id,name').ilike('name', `%${debouncedExamSearch.trim()}%`).limit(8);
      setExamMatches(data || []);
    })();
  }, [debouncedExamSearch]);

  const startEditing = () => {
    setTitle(job.title || '');
    setCareerTrack(job.careerTrack || 'STATE_GOVT');
    setLastDate(toDateInputValue(job.lastDate));
    setVacancies(job.vacancies || '');
    setExamId(job.examId || null);
    setExamName(job.examName || '');
    setExamSearch('');
    setExamMatches([]);
    setEditing(true);
  };

  const handleSave = async () => {
    if (!title.trim()) return;
    setSaving(true);
    try {
      const dbPatch = {
        title: title.trim(),
        career_track: careerTrack,
        last_date: lastDate || null,
        vacancies: vacancies || null,
        lc_exam_id: examId || null,
      };
      const { error } = await supabase.from('jobs').update(dbPatch).eq('job_id', job.id);
      if (error) throw error;
      onUpdated({ title: dbPatch.title, careerTrack, lastDate: dbPatch.last_date, vacancies: dbPatch.vacancies, examId, examName: examId ? examName : null });
      setEditing(false);
    } catch (err) {
      alert('Failed to save: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this job posting? This cannot be undone.')) return;
    setDeleting(true);
    try {
      const { error } = await supabase.from('jobs').delete().eq('job_id', job.id);
      if (error) throw error;
      onDeleted();
    } catch (err) {
      alert('Failed to delete: ' + err.message);
      setDeleting(false);
    }
  };

  return (
    <div className="lc-drawer-backdrop" onClick={onClose}>
      <div className="lc-drawer-panel" onClick={(e) => e.stopPropagation()}>
        {editing ? (
          <div className="lc-drawer-header">
            <div style={{ width: '100%' }}>
              <div className="lc-input-group" style={{ marginBottom: '0.6rem' }}>
                <label>Title</label>
                <input type="text" autoFocus value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <div className="lc-input-group" style={{ flex: 1 }}>
                  <label>Career Track</label>
                  <Select value={careerTrack} onChange={(e) => setCareerTrack(e.target.value)} options={CAREER_TRACK_ORDER.map((t) => ({ value: t, label: CAREER_TRACK_META[t].label }))} />
                </div>
                <div className="lc-input-group" style={{ flex: 1 }}>
                  <label>Vacancies</label>
                  <input type="text" value={vacancies} onChange={(e) => setVacancies(e.target.value)} />
                </div>
              </div>
              <div className="lc-input-group" style={{ marginTop: '0.6rem' }}>
                <label>Last Date to Apply</label>
                <input type="date" value={lastDate} onChange={(e) => setLastDate(e.target.value)} />
              </div>

              <div className="lc-input-group" style={{ marginTop: '0.6rem' }}>
                <label>Associated Exam</label>
                {examId ? (
                  <div className="lc-drawer-list-item">
                    <span>{examName}</span>
                    <button className="lc-icon-btn" title="Clear exam link" onClick={() => { setExamId(null); setExamName(''); }}><X size={14} /></button>
                  </div>
                ) : (
                  <>
                    <input type="text" placeholder="Search exams to link..." value={examSearch} onChange={(e) => setExamSearch(e.target.value)} />
                    {examMatches.map((ex) => (
                      <div key={ex.id} className="lc-drawer-list-item" style={{ cursor: 'pointer' }} onClick={() => { setExamId(ex.id); setExamName(ex.name); setExamSearch(''); setExamMatches([]); }}>
                        <span>{ex.name}</span>
                        <LinkIcon size={12} />
                      </div>
                    ))}
                  </>
                )}
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.85rem' }}>
                <button className="lc-btn primary" onClick={handleSave} disabled={saving || !title.trim()}><Check size={14} /> {saving ? 'Saving…' : 'Save'}</button>
                <button className="lc-btn" onClick={() => setEditing(false)} disabled={saving}>Cancel</button>
              </div>
            </div>
            <button className="lc-close-btn" onClick={onClose}><X size={20} /></button>
          </div>
        ) : (
          <div className="lc-drawer-header">
            <div>
              <h3>{job.body}</h3>
              <p>{job.title}</p>
            </div>
            <div style={{ display: 'flex', gap: '0.4rem' }}>
              <button className="lc-icon-btn" title="Edit" onClick={startEditing}><Pencil size={14} /></button>
              <button className="lc-close-btn" onClick={onClose}><X size={20} /></button>
            </div>
          </div>
        )}
        <div className="lc-drawer-body">
          <div className="lc-drawer-section">
            <h4>Details</h4>
            {job.careerTrack && <div className="lc-drawer-list-item"><span>Career Track</span><CategoryTag track={job.careerTrack} /></div>}
            <div className="lc-drawer-list-item"><span>Published On</span><span>{job.publishedOn ? new Date(job.publishedOn).toLocaleDateString() : 'Recent'}</span></div>
            <div className="lc-drawer-list-item"><span>Last Date to Apply</span><span>{job.lastDate ? new Date(job.lastDate).toLocaleDateString() : 'Continuous'}</span></div>
            <div className="lc-drawer-list-item"><span>Vacancies</span><span>{job.vacancies || 'N/A'}</span></div>
            {job.ageRange && <div className="lc-drawer-list-item"><span>Age Bracket</span><span>{job.ageRange}</span></div>}
          </div>
          <div className="lc-drawer-section">
            <h4>Associated Exam</h4>
            {job.examId
              ? <Link to={`/admin/exams?exam=${job.examId}`} className="lc-drawer-list-item" style={{ textDecoration: 'none', color: 'inherit' }}>{job.examName}</Link>
              : <p style={{ fontSize: '0.82rem', color: 'var(--admin-text-muted)' }}>Not linked to any exam yet.</p>}
          </div>
          {job.notes && (
            <div className="lc-drawer-section">
              <h4>Notes</h4>
              <p style={{ fontSize: '0.85rem', color: 'var(--admin-text)' }}>{job.notes}</p>
            </div>
          )}
          <div className="lc-drawer-section">
            {job.url && <a href={job.url} target="_blank" rel="noopener noreferrer" className="lc-btn" style={{ marginBottom: '0.6rem', width: '100%', justifyContent: 'center' }}>Open Official Source</a>}
            <button className="lc-btn danger" style={{ width: '100%', justifyContent: 'center' }} onClick={handleDelete} disabled={deleting}>
              <Trash2 size={14} /> {deleting ? 'Deleting…' : 'Delete Job'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminJobs;
