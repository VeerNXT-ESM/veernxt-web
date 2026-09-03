import { useEffect, useState } from 'react';
import axios from 'axios';
import { RefreshCw, X, CheckCircle2, Ban, FileText, Users, ShieldCheck, Briefcase, Bell } from 'lucide-react';
import { summarizeJobClasses } from '../../lib/privateSectorTaxonomy';

const ADMIN_SECRET = import.meta.env.VITE_ADMIN_API_SECRET;

const call = (action, body = {}) =>
  axios.post('/api/private-sector/router', { action, ...body }, { headers: { 'x-admin-api-secret': ADMIN_SECRET } }).then((r) => r.data);

const SECTIONS = [
  { key: 'requirements', label: 'Requirements', icon: Briefcase },
  { key: 'verifications', label: 'Verification', icon: ShieldCheck },
  { key: 'interest', label: 'Candidate Interest', icon: Users },
  { key: 'senior', label: 'Senior / Professional', icon: FileText },
  { key: 'notifications', label: 'Notification Log', icon: Bell },
];

const REQUIREMENT_STATUSES = ['submitted', 'under_review', 'approved', 'rejected', 'filled', 'closed'];
const PIPELINE_STATUSES = ['new', 'hr_reviewing', 'shortlisted', 'candidate_contacted', 'employer_contacted', 'interview', 'offer', 'joined', 'not_selected', 'withdrawn'];

const AdminPrivateSector = () => {
  const [section, setSection] = useState('requirements');
  const [loading, setLoading] = useState(true);
  const [requirements, setRequirements] = useState([]);
  const [verifications, setVerifications] = useState([]);
  const [interest, setInterest] = useState([]);
  const [seniorProfiles, setSeniorProfiles] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [selected, setSelected] = useState(null);
  const [saving, setSaving] = useState(false);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [reqs, vers, ints, seniors, notifs] = await Promise.all([
        call('admin_list_requirements'),
        call('admin_list_verifications'),
        call('admin_list_interest'),
        call('admin_list_senior_review'),
        call('admin_list_notifications'),
      ]);
      setRequirements(reqs.requirements || []);
      setVerifications(vers.verifications || []);
      setInterest(ints.interest || []);
      setSeniorProfiles(seniors.profiles || []);
      setNotifications(notifs.events || []);
    } catch (err) {
      console.error('Failed to load private sector admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  const updateRequirement = async (id, status) => {
    setSaving(true);
    try {
      await call('admin_update_requirement', { id, status });
      setSelected(null);
      await fetchAll();
    } catch (err) {
      alert(err.response?.data?.error || err.message);
    } finally {
      setSaving(false);
    }
  };

  const updateVerification = async (id, status, rejection_reason) => {
    setSaving(true);
    try {
      await call('admin_update_verification', { id, status, rejection_reason });
      setSelected(null);
      await fetchAll();
    } catch (err) {
      alert(err.response?.data?.error || err.message);
    } finally {
      setSaving(false);
    }
  };

  const updateInterest = async (id, pipeline_status) => {
    setSaving(true);
    try {
      await call('admin_update_interest', { id, pipeline_status });
      setSelected(null);
      await fetchAll();
    } catch (err) {
      alert(err.response?.data?.error || err.message);
    } finally {
      setSaving(false);
    }
  };

  const viewVerificationDoc = async (id) => {
    try {
      const data = await call('admin_get_verification_url', { id });
      if (data.ok) window.open(data.url, '_blank');
    } catch (err) {
      alert('Could not load document: ' + (err.response?.data?.error || err.message));
    }
  };

  const viewRequirementDoc = async (id) => {
    try {
      const data = await call('admin_get_requirement_doc_url', { id });
      if (data.ok) window.open(data.url, '_blank');
    } catch (err) {
      alert('Could not load document: ' + (err.response?.data?.error || err.message));
    }
  };

  return (
    <div className="aps-wrapper">
      <header className="aps-header">
        <h1>Private Sector — HR Console</h1>
        <button type="button" className="aps-refresh" onClick={fetchAll}>
          <RefreshCw size={14} className={loading ? 'aps-spin' : ''} /> Refresh
        </button>
      </header>

      <div className="aps-tabs">
        {SECTIONS.map((s) => {
          const Icon = s.icon;
          const counts = { requirements: requirements.length, verifications: verifications.filter((v) => v.status === 'pending').length, interest: interest.length, senior: seniorProfiles.length, notifications: notifications.length };
          return (
            <button key={s.key} className={`aps-tab ${section === s.key ? 'active' : ''}`} onClick={() => setSection(s.key)}>
              <Icon size={14} /> {s.label} <span className="aps-tab-count">{counts[s.key]}</span>
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="aps-loading"><RefreshCw className="aps-spin" size={24} /></div>
      ) : (
        <>
          {section === 'requirements' && (
            <table className="aps-table">
              <thead><tr><th>Role(s)</th><th>Positions</th><th>Locations</th><th>Employer</th><th>Job Class</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {requirements.map((r) => (
                  <tr key={r.id} className="aps-row" onClick={() => setSelected({ type: 'requirement', row: r })}>
                    <td className="aps-strong">{(r.role_titles || []).join(', ')}</td>
                    <td>{r.quantity}</td>
                    <td>{(r.locations || []).join(', ')}</td>
                    <td>{r.employer_profiles?.company_name || '—'}</td>
                    <td className="aps-muted">{summarizeJobClasses(r.role_titles).join(', ') || '—'}</td>
                    <td><span className={`aps-status aps-status-${r.status}`}>{r.status}</span></td>
                    <td className="aps-view">Review →</td>
                  </tr>
                ))}
                {requirements.length === 0 && <tr><td colSpan={7} className="aps-empty">No requirements submitted yet.</td></tr>}
              </tbody>
            </table>
          )}

          {section === 'verifications' && (
            <table className="aps-table">
              <thead><tr><th>Candidate</th><th>Service Number</th><th>Submitted</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {verifications.map((v) => (
                  <tr key={v.id} className="aps-row" onClick={() => setSelected({ type: 'verification', row: v })}>
                    <td className="aps-strong">{v.candidate_name || v.user_id.slice(0, 8)}</td>
                    <td>{v.service_number}</td>
                    <td className="aps-muted">{new Date(v.created_at).toLocaleDateString()}</td>
                    <td><span className={`aps-status aps-status-${v.status}`}>{v.status}</span></td>
                    <td className="aps-view">Review →</td>
                  </tr>
                ))}
                {verifications.length === 0 && <tr><td colSpan={5} className="aps-empty">No verification submissions yet.</td></tr>}
              </tbody>
            </table>
          )}

          {section === 'interest' && (
            <table className="aps-table">
              <thead><tr><th>Candidate</th><th>Requirement</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {interest.map((i) => (
                  <tr key={i.id} className="aps-row" onClick={() => setSelected({ type: 'interest', row: i })}>
                    <td className="aps-strong">{i.candidate_name || i.user_id.slice(0, 8)}</td>
                    <td>{(i.ps_job_requirements?.role_titles || []).join(', ')}</td>
                    <td><span className={`aps-status aps-status-${i.pipeline_status}`}>{i.pipeline_status.replace(/_/g, ' ')}</span></td>
                    <td className="aps-view">Update →</td>
                  </tr>
                ))}
                {interest.length === 0 && <tr><td colSpan={4} className="aps-empty">No candidate interest yet.</td></tr>}
              </tbody>
            </table>
          )}

          {section === 'senior' && (
            <table className="aps-table">
              <thead><tr><th>Candidate</th><th>Mobile</th><th>Submitted</th></tr></thead>
              <tbody>
                {seniorProfiles.map((p) => (
                  <tr key={p.id}>
                    <td className="aps-strong">{p.candidate_name || p.user_id.slice(0, 8)}</td>
                    <td>{p.raw_profile?.mobile || '—'}</td>
                    <td className="aps-muted">{new Date(p.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
                {seniorProfiles.length === 0 && <tr><td colSpan={3} className="aps-empty">No senior/professional referrals yet.</td></tr>}
              </tbody>
            </table>
          )}

          {section === 'notifications' && (
            <table className="aps-table">
              <thead><tr><th>Subject</th><th>Channel</th><th>Status</th><th>When</th></tr></thead>
              <tbody>
                {notifications.map((n) => (
                  <tr key={n.id}>
                    <td className="aps-strong">{n.subject}</td>
                    <td>{n.channel}</td>
                    <td><span className={`aps-status aps-status-${n.status}`}>{n.status}</span></td>
                    <td className="aps-muted">{new Date(n.created_at).toLocaleString()}</td>
                  </tr>
                ))}
                {notifications.length === 0 && <tr><td colSpan={4} className="aps-empty">No notifications yet.</td></tr>}
              </tbody>
            </table>
          )}
        </>
      )}

      {selected && (
        <div className="aps-modal-backdrop" onClick={() => setSelected(null)}>
          <div className="aps-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="aps-modal-header">
              <h3>
                {selected.type === 'requirement' && (selected.row.role_titles || []).join(', ')}
                {selected.type === 'verification' && (selected.row.candidate_name || 'Verification')}
                {selected.type === 'interest' && (selected.row.candidate_name || 'Candidate interest')}
              </h3>
              <button type="button" onClick={() => setSelected(null)} className="aps-modal-close"><X size={20} /></button>
            </div>

            <div className="aps-modal-body">
              {selected.type === 'requirement' && (
                <>
                  <div className="aps-detail-row"><span>Positions</span><span>{selected.row.quantity}</span></div>
                  <div className="aps-detail-row"><span>Locations</span><span>{(selected.row.locations || []).join(', ')}</span></div>
                  {selected.row.salary_range && <div className="aps-detail-row"><span>Salary</span><span>{selected.row.salary_range}</span></div>}
                  {selected.row.description && <div className="aps-detail-row"><span>Description</span><span>{selected.row.description}</span></div>}
                  {selected.row.requirements_text && <div className="aps-detail-row"><span>Requirements</span><span>{selected.row.requirements_text}</span></div>}
                  {selected.row.jd_document_path && (
                    <button type="button" className="aps-link-btn" onClick={() => viewRequirementDoc(selected.row.id)}>View uploaded JD document</button>
                  )}
                  <div className="aps-detail-row"><span>Job class</span><span>{summarizeJobClasses(selected.row.role_titles).join(', ') || '—'} <em style={{ color: 'var(--admin-text-muted)' }}>(internal only)</em></span></div>
                </>
              )}
              {selected.type === 'verification' && (
                <>
                  <div className="aps-detail-row"><span>Service number</span><span>{selected.row.service_number}</span></div>
                  <button type="button" className="aps-link-btn" onClick={() => viewVerificationDoc(selected.row.id)}>View uploaded document</button>
                </>
              )}
              {selected.type === 'interest' && (
                <div className="aps-detail-row"><span>Requirement</span><span>{(selected.row.ps_job_requirements?.role_titles || []).join(', ')}</span></div>
              )}
            </div>

            <div className="aps-modal-footer">
              {selected.type === 'requirement' && REQUIREMENT_STATUSES.map((s) => (
                <button key={s} disabled={saving} onClick={() => updateRequirement(selected.row.id, s)} className={`aps-btn ${s === 'approved' ? 'aps-btn-primary' : s === 'rejected' ? 'aps-btn-danger' : ''}`}>{s.replace(/_/g, ' ')}</button>
              ))}
              {selected.type === 'verification' && (
                <>
                  <button disabled={saving} onClick={() => updateVerification(selected.row.id, 'verified')} className="aps-btn aps-btn-primary"><CheckCircle2 size={14} /> Verify</button>
                  <button disabled={saving} onClick={() => updateVerification(selected.row.id, 'rejected', prompt('Reason (shown to candidate):') || '')} className="aps-btn aps-btn-danger"><Ban size={14} /> Reject</button>
                </>
              )}
              {selected.type === 'interest' && PIPELINE_STATUSES.map((s) => (
                <button key={s} disabled={saving} onClick={() => updateInterest(selected.row.id, s)} className="aps-btn">{s.replace(/_/g, ' ')}</button>
              ))}
            </div>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        .aps-wrapper { font-family: 'Inter', -apple-system, system-ui, BlinkMacSystemFont, sans-serif; color: var(--admin-text); }
        .aps-header { display: flex; align-items: center; gap: 1.5rem; margin-bottom: 1.5rem; }
        .aps-header h1 { font-size: 1.4rem; margin: 0; flex: 1; color: var(--admin-text); }
        .aps-refresh { display: flex; align-items: center; gap: 0.4rem; background: var(--surface-alt); border: 1px solid var(--border); padding: 0.5rem 1rem; border-radius: 8px; font-size: 0.8rem; font-weight: 700; color: var(--admin-text-muted); cursor: pointer; }
        .aps-tabs { display: flex; gap: 0.5rem; margin-bottom: 1.5rem; flex-wrap: wrap; }
        .aps-tab { display: flex; align-items: center; gap: 0.4rem; padding: 0.5rem 1rem; border-radius: 999px; border: 1px solid var(--border); background: var(--surface); font-size: 0.8rem; font-weight: 700; color: var(--admin-text-muted); cursor: pointer; }
        .aps-tab.active { background: var(--admin-accent); border-color: var(--admin-accent); color: #06281c; }
        .aps-tab-count { background: rgba(255,255,255,0.08); border-radius: 999px; padding: 0.05rem 0.5rem; font-size: 0.7rem; }
        .aps-tab.active .aps-tab-count { background: rgba(6,40,28,0.2); }
        .aps-loading, .aps-empty { text-align: center; padding: 3rem; color: var(--admin-text-muted); }
        .aps-table { width: 100%; border-collapse: collapse; background: var(--surface); border: 1px solid var(--border); border-radius: 12px; overflow: hidden; }
        .aps-table th { background: var(--surface-alt); padding: 0.85rem 1rem; font-size: 0.72rem; font-weight: 800; color: var(--admin-text-muted); text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid var(--border); text-align: left; }
        .aps-table td { padding: 1rem; border-bottom: 1px solid var(--border); font-size: 0.85rem; color: var(--admin-text); }
        .aps-row { cursor: pointer; }
        .aps-row:hover { background: var(--surface-alt); }
        .aps-strong { font-weight: 700; }
        .aps-muted { color: var(--admin-text-muted); font-size: 0.78rem; }
        .aps-view { color: var(--admin-accent); font-weight: 700; font-size: 0.78rem; text-align: right; }
        .aps-status { font-size: 0.68rem; font-weight: 800; padding: 0.25rem 0.6rem; border-radius: 999px; text-transform: uppercase; background: rgba(96,165,250,0.15); color: #93c5fd; }
        .aps-status-approved, .aps-status-verified, .aps-status-joined, .aps-status-sent { background: var(--admin-accent-soft); color: var(--admin-accent); }
        .aps-status-pending, .aps-status-submitted, .aps-status-new { background: var(--admin-warn-bg); color: var(--admin-warn); }
        .aps-status-rejected, .aps-status-not_selected, .aps-status-failed { background: var(--admin-danger-bg); color: var(--admin-danger); }
        .aps-spin { animation: aps-spin 1s linear infinite; }
        @keyframes aps-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .aps-modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.6); backdrop-filter: blur(6px); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 1.5rem; }
        .aps-modal-card { background: var(--surface); border: 1px solid var(--border); border-radius: 18px; width: 100%; max-width: 560px; max-height: 90vh; overflow-y: auto; box-shadow: var(--shadow-3); }
        .aps-modal-header { display: flex; justify-content: space-between; align-items: center; padding: 1.5rem 1.75rem; border-bottom: 1px solid var(--border); }
        .aps-modal-header h3 { font-size: 1.05rem; margin: 0; color: var(--admin-text); }
        .aps-modal-close { background: none; border: none; color: var(--admin-text-muted); cursor: pointer; }
        .aps-modal-body { padding: 1.5rem 1.75rem; display: flex; flex-direction: column; gap: 1rem; }
        .aps-detail-row { display: flex; justify-content: space-between; gap: 1rem; font-size: 0.82rem; color: var(--admin-text); }
        .aps-detail-row > span:first-child { color: var(--admin-text-muted); font-weight: 700; flex-shrink: 0; }
        .aps-detail-row > span:last-child { text-align: right; }
        .aps-link-btn { align-self: flex-start; background: none; border: none; color: var(--admin-accent); font-weight: 700; font-size: 0.82rem; cursor: pointer; text-decoration: underline; padding: 0; }
        .aps-modal-footer { display: flex; flex-wrap: wrap; gap: 0.5rem; padding: 1.25rem 1.75rem; border-top: 1px solid var(--border); }
        .aps-btn { display: flex; align-items: center; gap: 0.4rem; padding: 0.5rem 0.85rem; border-radius: 999px; border: 1px solid var(--border); background: var(--surface-alt); color: var(--admin-text); font-size: 0.76rem; font-weight: 700; cursor: pointer; text-transform: capitalize; }
        .aps-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .aps-btn-primary { background: var(--admin-accent); color: #06281c; border-color: var(--admin-accent); }
        .aps-btn-danger { background: var(--admin-danger-bg); color: var(--admin-danger); border-color: var(--admin-danger-bg); }
      `}} />
    </div>
  );
};

export default AdminPrivateSector;
