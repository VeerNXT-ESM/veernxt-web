import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, RefreshCw, X, Package, Truck, CheckCircle2, Ban } from 'lucide-react';

const ADMIN_SECRET = import.meta.env.VITE_ADMIN_API_SECRET;

const TABS = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'approved', label: 'Approved' },
  { key: 'shipped', label: 'Shipped' },
  { key: 'delivered', label: 'Delivered' },
  { key: 'cancelled', label: 'Cancelled' },
];

const AdminRewardsQueue = () => {
  const navigate = useNavigate();
  const [redemptions, setRedemptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pending');
  const [selected, setSelected] = useState(null);
  const [formState, setFormState] = useState({ tracking_number: '', courier_name: '', admin_notes: '', cancelled_reason: '' });
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState('');

  const fetchRedemptions = async () => {
    try {
      const res = await axios.get('/api/admin/redemptions', {
        headers: { 'x-admin-api-secret': ADMIN_SECRET },
      });
      setRedemptions(res.data.redemptions || []);
    } catch (err) {
      console.error('Error fetching redemptions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const session = localStorage.getItem('admin_session');
    if (!session) { navigate('/admin/login'); return; }
    (async () => { await fetchRedemptions(); })();
  }, [navigate]);

  const openRow = (row) => {
    setSelected(row);
    setFormState({
      tracking_number: row.tracking_number || '',
      courier_name: row.courier_name || '',
      admin_notes: row.admin_notes || '',
      cancelled_reason: '',
    });
    setActionError('');
  };

  const updateStatus = async (status) => {
    if (!selected) return;
    setSaving(true);
    setActionError('');
    try {
      const res = await axios.post('/api/admin/redemptions', {
        redemption_id: selected.id,
        status,
        tracking_number: formState.tracking_number,
        courier_name: formState.courier_name,
        admin_notes: formState.admin_notes,
        cancelled_reason: formState.cancelled_reason,
      }, {
        headers: { 'x-admin-api-secret': ADMIN_SECRET },
      });
      if (!res.data.ok) throw new Error(res.data.error || 'Update failed');
      setSelected(null);
      fetchRedemptions();
    } catch (err) {
      setActionError(err.response?.data?.error || err.message || 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  const filtered = activeTab === 'all' ? redemptions : redemptions.filter(r => r.status === activeTab);

  return (
    <div className="arq-wrapper">
      <header className="arq-header">
        <Link to="/admin" className="arq-back"><ArrowLeft size={16} /> Back to Admin</Link>
        <h1>Rewards Redemption Queue</h1>
        <button type="button" className="arq-refresh" onClick={fetchRedemptions}>
          <RefreshCw size={14} className={loading ? 'arq-spin' : ''} /> Refresh
        </button>
      </header>

      <div className="arq-tabs">
        {TABS.map(tab => (
          <button
            key={tab.key}
            className={`arq-tab ${activeTab === tab.key ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
            <span className="arq-tab-count">
              {tab.key === 'all' ? redemptions.length : redemptions.filter(r => r.status === tab.key).length}
            </span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="arq-loading"><RefreshCw className="arq-spin" size={24} /></div>
      ) : (
        <table className="arq-table">
          <thead>
            <tr>
              <th>Reward</th>
              <th>Candidate</th>
              <th>Points</th>
              <th>Status</th>
              <th>Requested</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(row => (
              <tr key={row.id} onClick={() => openRow(row)} className="arq-row">
                <td>
                  <div className="arq-item-title">
                    <Package size={16} />
                    {row.rewards?.name || 'Reward'}{row.size ? ` (${row.size})` : ''}
                  </div>
                </td>
                <td>
                  <div>{row.user_profiles?.full_name || row.shipping_name}</div>
                  <div className="arq-muted">{row.user_profiles?.mobile || row.shipping_phone}</div>
                </td>
                <td>{row.points_spent}</td>
                <td><span className={`arq-status arq-status-${row.status}`}>{row.status}</span></td>
                <td className="arq-muted">{new Date(row.requested_at).toLocaleDateString()}</td>
                <td className="arq-view">View →</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={6} className="arq-empty">No redemptions in this status.</td></tr>
            )}
          </tbody>
        </table>
      )}

      {selected && (
        <div className="arq-modal-backdrop" onClick={() => setSelected(null)}>
          <div className="arq-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="arq-modal-header">
              <h3>{selected.rewards?.name}{selected.size ? ` — ${selected.size}` : ''}</h3>
              <button type="button" onClick={() => setSelected(null)} className="arq-modal-close"><X size={20} /></button>
            </div>

            <div className="arq-modal-body">
              <div className="arq-detail-row"><span>Status</span><span className={`arq-status arq-status-${selected.status}`}>{selected.status}</span></div>
              <div className="arq-detail-row"><span>Points spent</span><span>{selected.points_spent}</span></div>
              <div className="arq-detail-row"><span>Ship to</span><span>{selected.shipping_name} · {selected.shipping_phone}</span></div>
              <div className="arq-detail-row">
                <span>Address</span>
                <span>
                  {selected.shipping_address_line1}{selected.shipping_address_line2 ? `, ${selected.shipping_address_line2}` : ''}, {selected.shipping_city}, {selected.shipping_state} {selected.shipping_pincode}
                </span>
              </div>

              <div className="arq-field">
                <label>Tracking Number</label>
                <input value={formState.tracking_number} onChange={(e) => setFormState(p => ({ ...p, tracking_number: e.target.value }))} />
              </div>
              <div className="arq-field">
                <label>Courier</label>
                <input value={formState.courier_name} onChange={(e) => setFormState(p => ({ ...p, courier_name: e.target.value }))} />
              </div>
              <div className="arq-field">
                <label>Admin Notes</label>
                <textarea rows={2} value={formState.admin_notes} onChange={(e) => setFormState(p => ({ ...p, admin_notes: e.target.value }))} />
              </div>
              {selected.status !== 'cancelled' && (
                <div className="arq-field">
                  <label>Cancellation Reason (if cancelling)</label>
                  <input value={formState.cancelled_reason} onChange={(e) => setFormState(p => ({ ...p, cancelled_reason: e.target.value }))} />
                </div>
              )}

              {actionError && <p className="arq-error">{actionError}</p>}
            </div>

            <div className="arq-modal-footer">
              {selected.status === 'pending' && (
                <button disabled={saving} onClick={() => updateStatus('approved')} className="arq-btn arq-btn-primary"><CheckCircle2 size={14} /> Approve</button>
              )}
              {(selected.status === 'pending' || selected.status === 'approved') && (
                <button disabled={saving} onClick={() => updateStatus('shipped')} className="arq-btn arq-btn-primary"><Truck size={14} /> Mark Shipped</button>
              )}
              {selected.status === 'shipped' && (
                <button disabled={saving} onClick={() => updateStatus('delivered')} className="arq-btn arq-btn-primary"><CheckCircle2 size={14} /> Mark Delivered</button>
              )}
              {selected.status !== 'cancelled' && selected.status !== 'delivered' && (
                <button disabled={saving} onClick={() => updateStatus('cancelled')} className="arq-btn arq-btn-danger"><Ban size={14} /> Cancel & Refund</button>
              )}
            </div>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        .arq-wrapper {
          padding: 2.5rem;
          max-width: 1200px;
          margin: 0 auto;
          font-family: -apple-system, system-ui, BlinkMacSystemFont, sans-serif;
        }
        .arq-header {
          display: flex;
          align-items: center;
          gap: 1.5rem;
          margin-bottom: 1.5rem;
        }
        .arq-header h1 { font-size: 1.4rem; margin: 0; flex: 1; }
        .arq-back {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          color: #64748b;
          text-decoration: none;
          font-size: 0.85rem;
          font-weight: 600;
        }
        .arq-back:hover { color: #0f172a; }
        .arq-refresh {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          background: #f1f5f9;
          border: none;
          padding: 0.5rem 1rem;
          border-radius: 8px;
          font-size: 0.8rem;
          font-weight: 700;
          color: #475569;
          cursor: pointer;
        }
        .arq-tabs {
          display: flex;
          gap: 0.5rem;
          margin-bottom: 1.5rem;
          flex-wrap: wrap;
        }
        .arq-tab {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          padding: 0.5rem 1rem;
          border-radius: 999px;
          border: 1px solid #e2e8f0;
          background: white;
          font-size: 0.8rem;
          font-weight: 700;
          color: #64748b;
          cursor: pointer;
        }
        .arq-tab.active {
          background: #1F3A2E;
          border-color: #1F3A2E;
          color: white;
        }
        .arq-tab-count {
          background: rgba(0,0,0,0.08);
          border-radius: 999px;
          padding: 0.05rem 0.5rem;
          font-size: 0.7rem;
        }
        .arq-tab.active .arq-tab-count { background: rgba(255,255,255,0.2); }
        .arq-loading, .arq-empty { text-align: center; padding: 3rem; color: #94a3b8; }
        .arq-table {
          width: 100%;
          border-collapse: collapse;
          background: white;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 1px 3px rgba(0,0,0,0.05);
        }
        .arq-table th {
          background: #f8fafc;
          padding: 0.85rem 1rem;
          font-size: 0.72rem;
          font-weight: 800;
          color: #475569;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          border-bottom: 2px solid #e2e8f0;
          text-align: left;
        }
        .arq-table td {
          padding: 1rem;
          border-bottom: 1px solid #f1f5f9;
          font-size: 0.85rem;
          color: #334155;
        }
        .arq-row { cursor: pointer; }
        .arq-row:hover { background: #f8fafc; }
        .arq-item-title { display: flex; align-items: center; gap: 0.5rem; font-weight: 700; color: #0f172a; }
        .arq-muted { color: #94a3b8; font-size: 0.78rem; }
        .arq-view { color: #1F3A2E; font-weight: 700; font-size: 0.78rem; text-align: right; }
        .arq-status {
          font-size: 0.68rem;
          font-weight: 800;
          padding: 0.25rem 0.6rem;
          border-radius: 999px;
          text-transform: uppercase;
        }
        .arq-status-pending { background: #fef3c7; color: #92400e; }
        .arq-status-approved { background: #dbeafe; color: #1e40af; }
        .arq-status-shipped { background: #e0e7ff; color: #4338ca; }
        .arq-status-delivered { background: #d1fae5; color: #065f46; }
        .arq-status-cancelled { background: #fee2e2; color: #991b1b; }
        .arq-spin { animation: arq-spin 1s linear infinite; }
        @keyframes arq-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .arq-modal-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(15,23,42,0.45);
          backdrop-filter: blur(6px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 1.5rem;
        }
        .arq-modal-card {
          background: white;
          border-radius: 24px;
          width: 100%;
          max-width: 520px;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 30px 60px -15px rgba(0,0,0,0.3);
        }
        .arq-modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1.5rem 1.75rem;
          border-bottom: 1px solid #f1f5f9;
        }
        .arq-modal-header h3 { font-size: 1.05rem; margin: 0; color: #0f172a; }
        .arq-modal-close { background: none; border: none; color: #94a3b8; cursor: pointer; }
        .arq-modal-body { padding: 1.5rem 1.75rem; display: flex; flex-direction: column; gap: 1rem; }
        .arq-detail-row {
          display: flex;
          justify-content: space-between;
          gap: 1rem;
          font-size: 0.82rem;
          color: #334155;
        }
        .arq-detail-row > span:first-child { color: #94a3b8; font-weight: 700; flex-shrink: 0; }
        .arq-detail-row > span:last-child { text-align: right; }
        .arq-field label { display: block; font-size: 0.72rem; font-weight: 800; color: #475569; margin-bottom: 0.35rem; }
        .arq-field input, .arq-field textarea {
          width: 100%;
          padding: 0.65rem 0.85rem;
          border-radius: 10px;
          border: 1px solid #cbd5e1;
          font-size: 0.85rem;
          font-family: inherit;
          outline: none;
        }
        .arq-error {
          background: #fef2f2;
          color: #ef4444;
          border: 1px solid #fee2e2;
          padding: 0.6rem 0.85rem;
          border-radius: 10px;
          font-size: 0.8rem;
        }
        .arq-modal-footer {
          display: flex;
          flex-wrap: wrap;
          gap: 0.6rem;
          padding: 1.25rem 1.75rem;
          border-top: 1px solid #f1f5f9;
        }
        .arq-btn {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          padding: 0.6rem 1rem;
          border-radius: 999px;
          border: none;
          font-size: 0.8rem;
          font-weight: 700;
          cursor: pointer;
        }
        .arq-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .arq-btn-primary { background: #1F3A2E; color: white; }
        .arq-btn-danger { background: #fef2f2; color: #ef4444; }
      `}} />
    </div>
  );
};

export default AdminRewardsQueue;
