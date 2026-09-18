import { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import {
  RefreshCw, X, Mail, ChevronDown, ChevronUp, Scale,
  AlertTriangle, Clock, CheckCircle2, MessageSquare, Send, UserCheck,
} from 'lucide-react';

const ADMIN_SECRET = import.meta.env.VITE_ADMIN_API_SECRET;

const apiCall = (method, body = {}) =>
  axios({
    method,
    url: '/api/admin/legal-aid',
    data: body,
    headers: { 'x-admin-api-secret': ADMIN_SECRET },
  }).then((r) => r.data);

/* ─── Theme tokens (matches AdminCMS.css dark theme) ─── */
const T = {
  bg:        '#0d1117',
  surface:   '#141a21',
  surfaceAlt:'#1b232c',
  border:    'rgba(255,255,255,0.08)',
  borderStr: 'rgba(255,255,255,0.16)',
  text:      '#e6edf3',
  muted:     '#8b949e',
  accent:    '#10b981',
  accentSoft:'rgba(16,185,129,0.14)',
  danger:    '#f87171',
  dangerBg:  'rgba(248,113,113,0.12)',
  warn:      '#e3b341',
  warnBg:    'rgba(227,179,65,0.12)',
};

/* ─── Status & urgency metadata ─── */
const STATUS_META = {
  new:       { label: 'New',        color: T.danger,  bg: T.dangerBg  },
  in_review: { label: 'In Review',  color: T.warn,    bg: T.warnBg    },
  responded: { label: 'Responded',  color: T.accent,  bg: T.accentSoft},
  closed:    { label: 'Closed',     color: T.muted,   bg: 'rgba(139,148,158,0.12)' },
};

const URGENCY_META = {
  'Urgent':          { icon: '🔴', color: T.danger },
  'Priority review': { icon: '🟡', color: T.warn   },
  'Standard':        { icon: '🟢', color: T.accent  },
};

const CATEGORY_LABELS = {
  pension:        'Pension / Pay',
  housing:        'Housing / Land',
  service_matter: 'Service Matter',
  fraud:          'Fraud / Cyber',
  family:         'Family / Succession',
  disability:     'Disability',
  court:          'Court / Legal Proceedings',
  unknown:        'Not Classified',
};

/* ─── Pre-filled email bodies ─── */
function buildVeteranSubject(q) {
  const cat = CATEGORY_LABELS[q.category] || q.category || 'Query';
  return `Re: Legal Aid Query [${q.case_ref}] — ${cat}`;
}

function buildVeteranBody(q) {
  return `Dear VeerNXT Member,

Thank you for reaching out to the VeerNXT Legal Aid Cell.

We have received your query (Case Reference: ${q.case_ref}) regarding ${CATEGORY_LABELS[q.category] || q.category || 'your legal concern'}.

Our support team is reviewing your case and a qualified coordinator will be in touch with you shortly via your preferred contact method (${q.contact_method === 'phone' ? 'phone call' : 'WhatsApp'}).

In the meantime, please keep the following available:
  • Service documents and identity proof
  • Any correspondence, orders or notices related to your case
  • Bank statements or payment records (if applicable)

If this matter is urgent or there has been any update from your end, please do not hesitate to contact us at support@veernxt.in or call +91-7889530025.

We stand with our veterans.

Warm regards,
VeerNXT Legal Support Desk
VETERAN WORKS PRIVATE LIMITED
CIN: U85499KA2024PTC184428`;
}

function buildAdvocateSubject(q) {
  const cat = CATEGORY_LABELS[q.category] || q.category || 'Legal Matter';
  return `Referral — Armed Forces Veteran Legal Aid Case [${q.case_ref}]: ${cat}`;
}

function buildAdvocateBody(q) {
  const qaLines = q.qa_summary && Object.keys(q.qa_summary).length > 0
    ? Object.entries(q.qa_summary)
        .map(([k, v]) => `  • ${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
        .join('\n')
    : '  (No specific Q&A recorded)';

  return `Dear Advocate / Legal Professional,

I am writing to you on behalf of the VeerNXT Legal Aid Cell (operated by VETERAN WORKS PRIVATE LIMITED, CIN: U85499KA2024PTC184428), a platform dedicated to supporting Indian Armed Forces veterans, Agniveers, and their families in legal and administrative matters.

We are referring a veteran case to your office for professional legal review and guidance.

─────────────────────────────────────────
CASE REFERENCE: ${q.case_ref}
─────────────────────────────────────────
Profile       : ${(q.profile || '').replace(/_/g, ' ')}
Service Arm   : ${q.service || '—'}
Category      : ${CATEGORY_LABELS[q.category] || q.category || '—'}
Specific Issue: ${(q.situation || '').replace(/_/g, ' ')}
Urgency Level : ${q.urgency || 'Standard'}
Recommended Route: ${q.route || '—'}

Contact Preference: ${q.contact_method === 'phone' ? 'Phone Call' : 'WhatsApp'}
Mobile        : ${q.mobile || 'Not provided'}
Email         : ${q.email || 'Not provided'}

─────────────────────────────────────────
CASE DETAILS (as reported by the veteran)
─────────────────────────────────────────
${qaLines}

─────────────────────────────────────────

We request your professional assessment of this matter, particularly regarding:
  1. Applicable legal remedies under service/pension law or civil law
  2. Any time-bound filing requirements (appeals, representations, etc.)
  3. Your willingness to take this matter on brief or pro bono basis

The veteran has consented to their case summary being shared with authorised legal personnel under the VeerNXT Veteran Privacy Charter.

Please reply to this email or contact our support desk at support@veernxt.in / +91-7889530025 to proceed.

With respect,
VeerNXT Legal Aid Cell
VETERAN WORKS PRIVATE LIMITED`;
}

/* ─── Reusable small components ─── */
const Pill = ({ children, color, bg }) => (
  <span style={{
    display: 'inline-flex', alignItems: 'center', gap: 4,
    fontSize: 11, fontWeight: 700, padding: '3px 9px',
    borderRadius: 999, color, background: bg,
    border: `1px solid ${color}40`,
    lineHeight: 1.2,
  }}>{children}</span>
);

const StatusBadge = ({ status }) => {
  const m = STATUS_META[status] || STATUS_META.new;
  return <Pill color={m.color} bg={m.bg}>{m.label}</Pill>;
};

const UrgencyBadge = ({ urgency }) => {
  const m = URGENCY_META[urgency] || URGENCY_META['Standard'];
  return <span style={{ fontSize: 12, fontWeight: 600, color: m.color }}>{m.icon} {urgency || 'Standard'}</span>;
};

/* ════════════════════════════════════════════════════════════ */
/*  Main component                                             */
/* ════════════════════════════════════════════════════════════ */
const AdminLegalAid = () => {
  const [queries, setQueries]       = useState([]);
  const [loading, setLoading]       = useState(true);
  const [selected, setSelected]     = useState(null);
  const [search, setSearch]         = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [expandedQA, setExpandedQA] = useState(false);

  /* Email tabs: 'veteran' | 'advocate' */
  const [emailTab, setEmailTab]     = useState('veteran');
  const [veteranTo, setVeteranTo]   = useState('');
  const [veteranSubj, setVeteranSubj] = useState('');
  const [veteranBody, setVeteranBody] = useState('');
  const [advocateEmail, setAdvocateEmail] = useState('');
  const [advocateSubj, setAdvocateSubj]   = useState('');
  const [advocateBody, setAdvocateBody]   = useState('');

  const [sending, setSending]       = useState(false);
  const [sendResult, setSendResult] = useState(null);

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
    setEmailTab('veteran');
    setVeteranTo(q.email || '');
    setVeteranSubj(buildVeteranSubject(q));
    setVeteranBody(buildVeteranBody(q));
    setAdvocateEmail('');
    setAdvocateSubj(buildAdvocateSubject(q));
    setAdvocateBody(buildAdvocateBody(q));
    setSendResult(null);
    setExpandedQA(false);
  };

  const sendEmail = async () => {
    const to   = emailTab === 'veteran' ? veteranTo   : advocateEmail;
    const subj = emailTab === 'veteran' ? veteranSubj : advocateSubj;
    const body = emailTab === 'veteran' ? veteranBody : advocateBody;

    if (!to) { alert('Please enter a recipient email address.'); return; }
    setSending(true);
    setSendResult(null);
    try {
      const res = await apiCall('post', {
        action: 'send_email',
        id: selected.id,
        to,
        subject: subj,
        body,
      });
      setSendResult({ ok: true, message: res.message });
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
    } catch (err) { alert(err.response?.data?.error || err.message); }
  };

  const filtered = queries.filter((q) => {
    const s = search.toLowerCase();
    const matchSearch = !s ||
      (q.case_ref || '').toLowerCase().includes(s) ||
      (q.email || '').toLowerCase().includes(s) ||
      (q.mobile || '').includes(s) ||
      (q.category || '').toLowerCase().includes(s);
    return matchSearch && (statusFilter === 'all' || q.status === statusFilter);
  });

  const counts = {
    total:     queries.length,
    new:       queries.filter((q) => q.status === 'new').length,
    in_review: queries.filter((q) => q.status === 'in_review').length,
    responded: queries.filter((q) => q.status === 'responded').length,
  };

  /* ── Drawer inline styles ── */
  const drawer = {
    wrap: {
      position: 'fixed', right: 0, top: 0, bottom: 0,
      width: 'min(640px, 95vw)', background: T.surface,
      zIndex: 101, overflowY: 'auto',
      boxShadow: '-8px 0 40px rgba(0,0,0,0.5)',
      display: 'flex', flexDirection: 'column',
      borderLeft: `1px solid ${T.borderStr}`,
    },
    header: {
      padding: '18px 22px', borderBottom: `1px solid ${T.border}`,
      display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
      position: 'sticky', top: 0, background: T.surface, zIndex: 10,
    },
    section: {
      background: T.surfaceAlt, borderRadius: 10, padding: 14,
      marginBottom: 16, border: `1px solid ${T.border}`,
    },
    sectionTitle: {
      fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
      letterSpacing: '0.07em', color: T.muted, marginBottom: 10,
    },
    label: {
      fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
      letterSpacing: '0.05em', color: T.muted, marginBottom: 3,
    },
    val: { fontSize: 13, fontWeight: 600, color: T.text },
    input: {
      width: '100%', padding: '8px 11px', borderRadius: 7,
      border: `1px solid ${T.border}`, background: T.bg,
      color: T.text, fontSize: 13, outline: 'none',
      boxSizing: 'border-box',
    },
    textarea: {
      width: '100%', padding: '10px 11px', borderRadius: 7,
      border: `1px solid ${T.border}`, background: T.bg,
      color: T.text, fontSize: 13, resize: 'vertical',
      fontFamily: 'inherit', lineHeight: 1.65, outline: 'none',
      boxSizing: 'border-box',
    },
  };

  /* ─── Tab button helper ─── */
  const TabBtn = ({ id, icon: Icon, label, sub }) => {
    const active = emailTab === id;
    return (
      <button
        onClick={() => { setEmailTab(id); setSendResult(null); }}
        style={{
          flex: 1, padding: '10px 8px', border: 'none', cursor: 'pointer',
          borderRadius: 8, fontWeight: active ? 700 : 600,
          fontSize: 12, display: 'flex', alignItems: 'center', gap: 7,
          background: active ? T.accentSoft : 'transparent',
          color: active ? T.accent : T.muted,
          outline: active ? `1.5px solid ${T.accent}40` : 'none',
          transition: 'all 0.15s',
        }}
      >
        <Icon size={14} />
        <span style={{ textAlign: 'left' }}>
          <div style={{ lineHeight: 1.2 }}>{label}</div>
          {sub && <div style={{ fontSize: 10, fontWeight: 400, opacity: 0.7 }}>{sub}</div>}
        </span>
      </button>
    );
  };

  /* ════════════ RENDER ════════════ */
  return (
    <div style={{ padding: '0 0 40px', position: 'relative', color: T.text }}>

      {/* ── Stats bar ── */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        {[
          { label: 'Total Queries', value: counts.total,     icon: Scale,        color: T.accent },
          { label: 'New',           value: counts.new,        icon: AlertTriangle, color: T.danger },
          { label: 'In Review',     value: counts.in_review,  icon: Clock,         color: T.warn   },
          { label: 'Responded',     value: counts.responded,  icon: CheckCircle2,  color: T.accent },
        ].map((s) => (
          <div key={s.label} style={{
            background: T.surface, border: `1px solid ${T.border}`,
            borderRadius: 10, padding: '14px 18px',
            display: 'flex', alignItems: 'center', gap: 12,
            flex: '1 1 140px', minWidth: 140,
          }}>
            <div style={{ width: 36, height: 36, borderRadius: 9, background: `${s.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <s.icon size={18} color={s.color} />
            </div>
            <div>
              <div style={{ fontSize: 22, fontWeight: 800, color: T.text, lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: 10, color: T.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', marginTop: 2 }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Toolbar ── */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
        <input
          type="text" placeholder="Search case ref, email, mobile, category…"
          value={search} onChange={(e) => setSearch(e.target.value)}
          style={{ ...drawer.input, flex: '1 1 240px', borderRadius: 8 }}
        />
        <select
          value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          style={{ ...drawer.input, flex: '0 0 auto', width: 'auto', cursor: 'pointer' }}
        >
          <option value="all">All Statuses</option>
          <option value="new">New</option>
          <option value="in_review">In Review</option>
          <option value="responded">Responded</option>
          <option value="closed">Closed</option>
        </select>
        <button onClick={fetchQueries} style={{
          display: 'flex', alignItems: 'center', gap: 6, padding: '8px 13px',
          borderRadius: 8, border: `1px solid ${T.border}`, background: T.surface,
          color: T.muted, cursor: 'pointer', fontSize: 13, fontWeight: 600,
        }}>
          <RefreshCw size={13} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          Refresh
        </button>
      </div>

      {/* ── Query table ── */}
      <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: T.surfaceAlt, borderBottom: `1px solid ${T.border}` }}>
              {['Case Ref', 'Date', 'Category', 'Urgency', 'Contact', 'Status', ''].map((h) => (
                <th key={h} style={{ padding: '10px 13px', textAlign: 'left', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: T.muted }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} style={{ padding: 32, textAlign: 'center', color: T.muted }}>Loading queries…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={7} style={{ padding: 48, textAlign: 'center', color: T.muted }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>⚖️</div>
                <div style={{ fontWeight: 600, color: T.text }}>No legal aid queries</div>
                <div style={{ fontSize: 12, marginTop: 4 }}>Queries submitted from /legal-aid will appear here</div>
              </td></tr>
            ) : filtered.map((q) => (
              <tr key={q.id}
                style={{ borderBottom: `1px solid ${T.border}`, cursor: 'pointer', transition: 'background 0.12s' }}
                onMouseEnter={(e) => e.currentTarget.style.background = T.surfaceAlt}
                onMouseLeave={(e) => e.currentTarget.style.background = ''}
              >
                <td style={{ padding: '11px 13px' }}>
                  <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 12, color: T.accent }}>{q.case_ref}</span>
                </td>
                <td style={{ padding: '11px 13px', color: T.muted, fontSize: 12 }}>
                  {new Date(q.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                </td>
                <td style={{ padding: '11px 13px' }}>
                  <div style={{ fontWeight: 600, color: T.text, fontSize: 12 }}>{CATEGORY_LABELS[q.category] || q.category || '—'}</div>
                  {q.situation && <div style={{ fontSize: 10, color: T.muted, marginTop: 1 }}>{q.situation.replace(/_/g, ' ')}</div>}
                </td>
                <td style={{ padding: '11px 13px' }}><UrgencyBadge urgency={q.urgency} /></td>
                <td style={{ padding: '11px 13px' }}>
                  <div style={{ fontSize: 12, color: T.muted }}>{q.contact_method === 'phone' ? '📞 Phone' : '💬 WhatsApp'}</div>
                  {q.email && <div style={{ fontSize: 11, color: T.accent, marginTop: 1 }}>{q.email}</div>}
                </td>
                <td style={{ padding: '11px 13px' }}><StatusBadge status={q.status} /></td>
                <td style={{ padding: '11px 13px' }}>
                  <button onClick={() => openQuery(q)} style={{
                    display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px',
                    borderRadius: 6, border: `1px solid ${T.accent}50`, background: T.accentSoft,
                    color: T.accent, fontSize: 11, fontWeight: 700, cursor: 'pointer',
                  }}>
                    <Mail size={11} /> Open
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Drawer ── */}
      {selected && (
        <>
          <div onClick={() => setSelected(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 100, backdropFilter: 'blur(3px)' }} />

          <div style={drawer.wrap}>
            {/* Header */}
            <div style={drawer.header}>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: T.muted, marginBottom: 4 }}>Legal Aid Query</div>
                <div style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: 17, color: T.accent }}>{selected.case_ref}</div>
                <div style={{ display: 'flex', gap: 8, marginTop: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                  <StatusBadge status={selected.status} />
                  <UrgencyBadge urgency={selected.urgency} />
                  <span style={{ fontSize: 11, color: T.muted }}>
                    {new Date(selected.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                  </span>
                </div>
              </div>
              <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.muted, padding: 4 }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: '16px 22px', flex: 1 }}>

              {/* Case Details */}
              <div style={drawer.section}>
                <div style={drawer.sectionTitle}>Case Details</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 18px' }}>
                  {[
                    ['Profile',    (selected.profile || '').replace(/_/g, ' ')],
                    ['Service',    selected.service],
                    ['Category',   CATEGORY_LABELS[selected.category] || selected.category],
                    ['Situation',  (selected.situation || '').replace(/_/g, ' ')],
                    ['Contact',    selected.contact_method === 'phone' ? '📞 Phone' : '💬 WhatsApp'],
                    ['Mobile',     selected.mobile || '—'],
                    ['Email',      selected.email  || '—'],
                    ['Route',      selected.route  || '—'],
                  ].map(([k, v]) => (
                    <div key={k}>
                      <div style={drawer.label}>{k}</div>
                      <div style={{ ...drawer.val, wordBreak: 'break-all' }}>{v || '—'}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Q&A accordion */}
              {selected.qa_summary && Object.keys(selected.qa_summary).length > 0 && (
                <div style={{ ...drawer.section, marginBottom: 16 }}>
                  <button onClick={() => setExpandedQA((v) => !v)} style={{
                    width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                  }}>
                    <span style={{ ...drawer.sectionTitle, margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <MessageSquare size={11} color={T.accent} /> Q&A Summary ({Object.keys(selected.qa_summary).length} answers)
                    </span>
                    {expandedQA ? <ChevronUp size={13} color={T.muted} /> : <ChevronDown size={13} color={T.muted} />}
                  </button>
                  {expandedQA && (
                    <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 7 }}>
                      {Object.entries(selected.qa_summary).map(([k, v]) => (
                        <div key={k} style={{ background: T.bg, borderRadius: 7, padding: '7px 10px', border: `1px solid ${T.border}` }}>
                          <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: T.accent, marginBottom: 2, letterSpacing: '0.04em' }}>{k}</div>
                          <div style={{ fontSize: 12, color: T.text }}>{Array.isArray(v) ? v.join(', ') : String(v)}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Status updater */}
              <div style={{ marginBottom: 16 }}>
                <div style={drawer.sectionTitle}>Update Status</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {Object.entries(STATUS_META).map(([key, meta]) => (
                    <button key={key} onClick={() => updateStatus(selected.id, key)} style={{
                      padding: '5px 12px', borderRadius: 999, fontSize: 12, fontWeight: 700, cursor: 'pointer',
                      border: `1.5px solid ${selected.status === key ? meta.color : T.border}`,
                      background: selected.status === key ? meta.bg : 'transparent',
                      color: selected.status === key ? meta.color : T.muted,
                      transition: 'all 0.15s',
                    }}>
                      {meta.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* ── Email Composer with 2 tabs ── */}
              <div style={{ border: `1.5px solid ${T.border}`, borderRadius: 12, overflow: 'hidden' }}>

                {/* Tab header */}
                <div style={{ padding: '10px 12px', background: T.surfaceAlt, borderBottom: `1px solid ${T.border}` }}>
                  <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: T.muted, marginBottom: 8 }}>Compose Email</div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <TabBtn id="veteran"  icon={Mail}      label="Reply to Veteran"  sub="Acknowledgement & next steps" />
                    <TabBtn id="advocate" icon={UserCheck} label="Forward to Advocate" sub="Case brief for legal counsel"  />
                  </div>
                </div>

                {/* Tab content */}
                <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {emailTab === 'veteran' ? (
                    <>
                      <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <span style={drawer.label}>To: (Veteran Email)</span>
                        <input type="email" value={veteranTo} onChange={(e) => setVeteranTo(e.target.value)} placeholder="veteran@email.com" style={drawer.input} />
                      </label>
                      <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <span style={drawer.label}>Subject</span>
                        <input type="text" value={veteranSubj} onChange={(e) => setVeteranSubj(e.target.value)} style={drawer.input} />
                      </label>
                      <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <span style={drawer.label}>Message Body</span>
                        <textarea rows={12} value={veteranBody} onChange={(e) => setVeteranBody(e.target.value)} style={drawer.textarea} />
                      </label>
                    </>
                  ) : (
                    <>
                      <div style={{ background: T.bg, border: `1px solid ${T.warn}30`, borderRadius: 8, padding: '8px 11px', fontSize: 12, color: T.warn }}>
                        ⚖️ This email is professionally framed as a formal legal referral. Paste or type the advocate's email address below.
                      </div>
                      <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <span style={drawer.label}>Advocate / Lawyer Email</span>
                        <input type="email" value={advocateEmail} onChange={(e) => setAdvocateEmail(e.target.value)} placeholder="advocate@lawfirm.com" style={drawer.input} />
                      </label>
                      <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <span style={drawer.label}>Subject</span>
                        <input type="text" value={advocateSubj} onChange={(e) => setAdvocateSubj(e.target.value)} style={drawer.input} />
                      </label>
                      <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <span style={drawer.label}>Case Brief (editable)</span>
                        <textarea rows={14} value={advocateBody} onChange={(e) => setAdvocateBody(e.target.value)} style={drawer.textarea} />
                      </label>
                    </>
                  )}

                  {sendResult && (
                    <div style={{
                      padding: '9px 13px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                      background: sendResult.ok ? T.accentSoft : T.dangerBg,
                      color: sendResult.ok ? T.accent : T.danger,
                      border: `1px solid ${sendResult.ok ? T.accent : T.danger}40`,
                    }}>
                      {sendResult.ok ? '✅ ' : '❌ '}{sendResult.message}
                    </div>
                  )}

                  <button onClick={sendEmail} disabled={sending} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    padding: '11px 20px', borderRadius: 9, border: 'none',
                    cursor: sending ? 'not-allowed' : 'pointer',
                    background: sending ? T.muted : T.accent,
                    color: '#0d1117', fontSize: 14, fontWeight: 800,
                    transition: 'all 0.2s',
                  }}>
                    <Send size={15} />
                    {sending ? 'Sending…' : emailTab === 'veteran' ? 'Send to Veteran' : 'Forward to Advocate'}
                  </button>

                  <p style={{ fontSize: 11, color: T.muted, textAlign: 'center', margin: 0 }}>
                    Sent via VeerNXT SMTP (veernxtitofficial@gmail.com)
                    {emailTab === 'veteran' ? ' — Status will update to "Responded".' : ' — Case forwarded to legal professional.'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default AdminLegalAid;
