import { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import {
  RefreshCw, X, Mail, ChevronDown, ChevronUp, Scale,
  AlertTriangle, Clock, CheckCircle2, MessageSquare, Send,
} from 'lucide-react';

const ADMIN_SECRET = import.meta.env.VITE_ADMIN_API_SECRET;

const apiCall = (method, body = {}) =>
  axios({
    method,
    url: '/api/admin/legal-aid',
    data: body,
    headers: { 'x-admin-api-secret': ADMIN_SECRET },
  }).then((r) => r.data);

const STATUS_META = {
  new:        { label: 'New',        color: '#ef4444', bg: '#fef2f2' },
  in_review:  { label: 'In Review',  color: '#f59e0b', bg: '#fffbeb' },
  responded:  { label: 'Responded',  color: '#22c55e', bg: '#f0fdf4' },
  closed:     { label: 'Closed',     color: '#64748b', bg: '#f1f5f9' },
};

const URGENCY_META = {
  'Urgent':         { icon: '🔴', color: '#dc2626' },
  'Priority review':{ icon: '🟡', color: '#d97706' },
  'Standard':       { icon: '🟢', color: '#16a34a' },
};

const CATEGORY_LABELS = {
  pension:    'Pension / Pay',
  housing:    'Housing / Land',
  service_matter: 'Service Matter',
  fraud:      'Fraud / Cyber',
  family:     'Family / Succession',
  disability: 'Disability',
  court:      'Court / Legal Proceedings',
  unknown:    'Not Classified',
};

function buildEmailSubject(query) {
  const cat = CATEGORY_LABELS[query.category] || query.category || 'Query';
  return `Re: Legal Aid Query [${query.case_ref}] — ${cat}`;
}

function buildEmailBody(query) {
  const name = query.mobile ? `Dear Veteran,` : `Dear VeerNXT Member,`;
  return `${name}

Thank you for reaching out to the VeerNXT Legal Aid Cell.

We have received your query (Case Reference: ${query.case_ref}) regarding ${CATEGORY_LABELS[query.category] || query.category || 'your legal concern'}.

Our support team is reviewing your case and a qualified coordinator will be in touch with you shortly via your preferred contact method (${query.contact_method === 'phone' ? 'phone call' : 'WhatsApp'}).

In the meantime, please ensure you have the following available:
- Any relevant documents related to your case
- Your service documents and identity proof

If you have any urgent updates, please do not hesitate to contact us at support@veernxt.in or call +91-7889530025.

Warm regards,
VeerNXT Legal Support Desk
VETERAN WORKS PRIVATE LIMITED`;
}

const StatusBadge = ({ status }) => {
  const m = STATUS_META[status] || STATUS_META.new;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      fontSize: 11, fontWeight: 700, padding: '3px 8px',
      borderRadius: 999, color: m.color, background: m.bg,
      border: `1px solid ${m.color}30`,
    }}>
      {m.label}
    </span>
  );
};

const UrgencyBadge = ({ urgency }) => {
  const m = URGENCY_META[urgency] || URGENCY_META['Standard'];
  return (
    <span style={{ fontSize: 12, fontWeight: 600, color: m.color }}>
      {m.icon} {urgency || 'Standard'}
    </span>
  );
};

const AdminLegalAid = () => {
  const [queries, setQueries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [emailTo, setEmailTo] = useState('');
  const [emailExtra, setEmailExtra] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState(null);
  const [expandedQA, setExpandedQA] = useState(false);

  const fetchQueries = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiCall('get');
      setQueries(data.queries || []);
    } catch (err) {
      console.error('Failed to load legal aid queries:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchQueries(); }, [fetchQueries]);

  const openQuery = (q) => {
    setSelected(q);
    setEmailTo(q.email || '');
    setEmailExtra('');
    setEmailSubject(buildEmailSubject(q));
    setEmailBody(buildEmailBody(q));
    setSendResult(null);
    setExpandedQA(false);
  };

  const closeDrawer = () => setSelected(null);

  const sendEmail = async () => {
    if (!emailTo && !emailExtra) {
      alert('Please enter at least one recipient email address.');
      return;
    }
    setSending(true);
    setSendResult(null);
    try {
      const res = await apiCall('post', {
        action: 'send_email',
        id: selected.id,
        to: emailTo,
        extra_email: emailExtra,
        subject: emailSubject,
        body: emailBody,
      });
      setSendResult({ ok: true, message: res.message });
      // Refresh list to show 'responded' status
      await fetchQueries();
      setSelected((prev) => prev ? { ...prev, status: 'responded' } : null);
    } catch (err) {
      setSendResult({ ok: false, message: err.response?.data?.error || err.message });
    } finally {
      setSending(false);
    }
  };

  const updateStatus = async (id, status) => {
    try {
      await apiCall('post', { action: 'update_status', id, status });
      await fetchQueries();
      if (selected?.id === id) setSelected((prev) => prev ? { ...prev, status } : null);
    } catch (err) {
      alert(err.response?.data?.error || err.message);
    }
  };

  const filtered = queries.filter((q) => {
    const matchSearch = !search ||
      (q.case_ref || '').toLowerCase().includes(search.toLowerCase()) ||
      (q.email || '').toLowerCase().includes(search.toLowerCase()) ||
      (q.mobile || '').includes(search) ||
      (q.category || '').toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || q.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const counts = {
    total: queries.length,
    new: queries.filter((q) => q.status === 'new').length,
    in_review: queries.filter((q) => q.status === 'in_review').length,
    responded: queries.filter((q) => q.status === 'responded').length,
  };

  return (
    <div style={{ padding: '0 0 40px 0', position: 'relative' }}>

      {/* Stats bar */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
        {[
          { label: 'Total Queries', value: counts.total, icon: Scale, color: '#4b6b32' },
          { label: 'New', value: counts.new, icon: AlertTriangle, color: '#ef4444' },
          { label: 'In Review', value: counts.in_review, icon: Clock, color: '#f59e0b' },
          { label: 'Responded', value: counts.responded, icon: CheckCircle2, color: '#22c55e' },
        ].map((stat) => (
          <div key={stat.label} style={{
            background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12,
            padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12,
            minWidth: 160, flex: '1 1 160px',
          }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: `${stat.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <stat.icon size={20} color={stat.color} />
            </div>
            <div>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#0f172a' }}>{stat.value}</div>
              <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{stat.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        <input
          type="text"
          placeholder="Search by case ref, email, mobile, category…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            flex: '1 1 280px', padding: '9px 14px', borderRadius: 8,
            border: '1px solid #e2e8f0', fontSize: 13, outline: 'none',
          }}
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{ padding: '9px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, background: '#fff' }}
        >
          <option value="all">All Statuses</option>
          <option value="new">New</option>
          <option value="in_review">In Review</option>
          <option value="responded">Responded</option>
          <option value="closed">Closed</option>
        </select>
        <button
          onClick={fetchQueries}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 14px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
        >
          <RefreshCw size={14} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} /> Refresh
        </button>
      </div>

      {/* Query Table */}
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
              {['Case Ref', 'Date', 'Category', 'Urgency', 'Contact', 'Status', 'Actions'].map((h) => (
                <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} style={{ padding: 32, textAlign: 'center', color: '#94a3b8' }}>Loading queries…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={7} style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>⚖️</div>
                <div style={{ fontWeight: 600 }}>No legal aid queries found</div>
                <div style={{ fontSize: 12, marginTop: 4 }}>Queries submitted by users from /legal-aid will appear here</div>
              </td></tr>
            ) : (
              filtered.map((q) => (
                <tr key={q.id} style={{ borderBottom: '1px solid #f1f5f9', cursor: 'pointer', transition: 'background 0.15s' }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
                  onMouseLeave={(e) => e.currentTarget.style.background = ''}
                >
                  <td style={{ padding: '12px 14px' }}>
                    <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 12, color: '#334155' }}>{q.case_ref}</span>
                  </td>
                  <td style={{ padding: '12px 14px', color: '#64748b' }}>
                    {new Date(q.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    <span style={{ fontWeight: 600, color: '#334155' }}>{CATEGORY_LABELS[q.category] || q.category || '—'}</span>
                    {q.situation && <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{q.situation}</div>}
                  </td>
                  <td style={{ padding: '12px 14px' }}><UrgencyBadge urgency={q.urgency} /></td>
                  <td style={{ padding: '12px 14px', color: '#64748b' }}>
                    <div style={{ fontSize: 12 }}>{q.contact_method === 'phone' ? '📞 Phone' : '💬 WhatsApp'}</div>
                    {q.mobile && <div style={{ fontSize: 11, color: '#94a3b8' }}>{q.mobile}</div>}
                    {q.email && <div style={{ fontSize: 11, color: '#4b6b32', marginTop: 1 }}>{q.email}</div>}
                  </td>
                  <td style={{ padding: '12px 14px' }}><StatusBadge status={q.status} /></td>
                  <td style={{ padding: '12px 14px' }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        onClick={() => openQuery(q)}
                        style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 6, border: '1px solid #4b6b32', background: '#f0f7ea', color: '#4b6b32', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
                      >
                        <Mail size={12} /> Respond
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Detail & Email Composer Drawer */}
      {selected && (
        <>
          {/* Overlay */}
          <div
            onClick={closeDrawer}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 100, backdropFilter: 'blur(2px)' }}
          />

          {/* Drawer */}
          <div style={{
            position: 'fixed', right: 0, top: 0, bottom: 0, width: 'min(600px, 95vw)',
            background: '#fff', zIndex: 101, overflowY: 'auto',
            boxShadow: '-8px 0 32px rgba(0,0,0,0.12)',
            display: 'flex', flexDirection: 'column',
          }}>
            {/* Drawer Header */}
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'sticky', top: 0, background: '#fff', zIndex: 10 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Legal Aid Query</div>
                <div style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: 16, color: '#0f172a' }}>{selected.case_ref}</div>
                <div style={{ display: 'flex', gap: 8, marginTop: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                  <StatusBadge status={selected.status} />
                  <UrgencyBadge urgency={selected.urgency} />
                  <span style={{ fontSize: 11, color: '#94a3b8' }}>
                    {new Date(selected.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                  </span>
                </div>
              </div>
              <button onClick={closeDrawer} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#64748b' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: '20px 24px', flex: 1 }}>

              {/* Case Info Grid */}
              <div style={{ background: '#f8fafc', borderRadius: 12, padding: 16, marginBottom: 20, border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b', marginBottom: 12 }}>Case Details</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 16px' }}>
                  {[
                    ['Profile', selected.profile?.replace(/_/g, ' ')],
                    ['Service', selected.service],
                    ['Category', CATEGORY_LABELS[selected.category] || selected.category],
                    ['Situation', selected.situation?.replace(/_/g, ' ')],
                    ['Contact Method', selected.contact_method === 'phone' ? '📞 Phone' : '💬 WhatsApp'],
                    ['Mobile', selected.mobile || '—'],
                    ['Email', selected.email || '—'],
                    ['Recommended Route', selected.route],
                  ].map(([k, v]) => (
                    <div key={k}>
                      <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: '#94a3b8', letterSpacing: '0.04em', marginBottom: 2 }}>{k}</div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>{v || '—'}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Q&A Summary */}
              {selected.qa_summary && Object.keys(selected.qa_summary).length > 0 && (
                <div style={{ background: '#f0f7ea', borderRadius: 12, padding: 16, marginBottom: 20, border: '1px solid #c3ddb5' }}>
                  <button
                    onClick={() => setExpandedQA((v) => !v)}
                    style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                  >
                    <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#2d5a27' }}>
                      <MessageSquare size={12} style={{ marginRight: 6, verticalAlign: 'middle' }} />
                      Q&amp;A Summary ({Object.keys(selected.qa_summary).length} answers)
                    </span>
                    {expandedQA ? <ChevronUp size={14} color="#4b6b32" /> : <ChevronDown size={14} color="#4b6b32" />}
                  </button>
                  {expandedQA && (
                    <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {Object.entries(selected.qa_summary).map(([k, v]) => (
                        <div key={k} style={{ background: '#fff', borderRadius: 8, padding: '8px 12px', border: '1px solid #d0e8c0' }}>
                          <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: '#4b6b32', marginBottom: 2, letterSpacing: '0.03em' }}>{k}</div>
                          <div style={{ fontSize: 13, color: '#1e3a1e', fontWeight: 500 }}>
                            {Array.isArray(v) ? v.join(', ') : String(v)}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Status changer */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.05em', marginBottom: 8 }}>Update Status</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {Object.entries(STATUS_META).map(([key, meta]) => (
                    <button
                      key={key}
                      onClick={() => updateStatus(selected.id, key)}
                      style={{
                        padding: '5px 12px', borderRadius: 999, fontSize: 12, fontWeight: 700, cursor: 'pointer',
                        border: `1.5px solid ${selected.status === key ? meta.color : '#e2e8f0'}`,
                        background: selected.status === key ? meta.bg : '#fff',
                        color: selected.status === key ? meta.color : '#64748b',
                      }}
                    >
                      {meta.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Email Composer */}
              <div style={{ border: '1.5px solid #e2e8f0', borderRadius: 14, overflow: 'hidden' }}>
                <div style={{ padding: '12px 16px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Mail size={15} color="#4b6b32" />
                  <span style={{ fontWeight: 700, fontSize: 13, color: '#0f172a' }}>Compose Email Response</span>
                </div>

                <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.04em' }}>To: (User Email)</span>
                    <input
                      type="email"
                      value={emailTo}
                      onChange={(e) => setEmailTo(e.target.value)}
                      placeholder="user@example.com"
                      style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, outline: 'none' }}
                    />
                  </label>

                  <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.04em' }}>
                      Additional Recipient <span style={{ fontWeight: 400, textTransform: 'none' }}>(CC / Legal Professional)</span>
                    </span>
                    <input
                      type="email"
                      value={emailExtra}
                      onChange={(e) => setEmailExtra(e.target.value)}
                      placeholder="lawyer@example.com (optional)"
                      style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, outline: 'none' }}
                    />
                  </label>

                  <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.04em' }}>Subject</span>
                    <input
                      type="text"
                      value={emailSubject}
                      onChange={(e) => setEmailSubject(e.target.value)}
                      style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, outline: 'none' }}
                    />
                  </label>

                  <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.04em' }}>Message Body</span>
                    <textarea
                      value={emailBody}
                      onChange={(e) => setEmailBody(e.target.value)}
                      rows={12}
                      style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, resize: 'vertical', fontFamily: 'inherit', outline: 'none', lineHeight: 1.6 }}
                    />
                  </label>

                  {sendResult && (
                    <div style={{
                      padding: '10px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                      background: sendResult.ok ? '#f0fdf4' : '#fef2f2',
                      color: sendResult.ok ? '#16a34a' : '#dc2626',
                      border: `1px solid ${sendResult.ok ? '#bbf7d0' : '#fecaca'}`,
                    }}>
                      {sendResult.ok ? '✅ ' : '❌ '}{sendResult.message}
                    </div>
                  )}

                  <button
                    onClick={sendEmail}
                    disabled={sending}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                      padding: '11px 20px', borderRadius: 10, border: 'none', cursor: sending ? 'not-allowed' : 'pointer',
                      background: sending ? '#94a3b8' : '#4b6b32', color: '#fff',
                      fontSize: 14, fontWeight: 700, transition: 'background 0.2s',
                    }}
                  >
                    <Send size={16} />
                    {sending ? 'Sending…' : 'Send Email'}
                  </button>

                  <p style={{ fontSize: 11, color: '#94a3b8', textAlign: 'center', margin: 0 }}>
                    Sent via VeerNXT SMTP (veernxtitofficial@gmail.com). Status will be updated to "Responded".
                  </p>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default AdminLegalAid;
