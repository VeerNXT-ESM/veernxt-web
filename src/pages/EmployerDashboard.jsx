import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { 
  Award, Briefcase, MessageSquare, Plus, RefreshCw, ShieldCheck, 
  User, Users, Phone, Mail, CheckCircle2, Clock, ChevronRight,
  Unlock, Lock, Sparkles, Filter, ExternalLink
} from 'lucide-react';
import Button from '../components/ui/Button';
import { hexToRgba } from '../lib/careerTrack';

// Friendly, employer-facing status labels
const REQUIREMENT_STATUS_LABEL = {
  submitted: 'Under Review',
  under_review: 'Under Review',
  approved: 'Matching Active',
  rejected: 'Not Approved',
  filled: 'Filled',
  closed: 'Closed',
};

const BRANCH_TAG = {
  'Indian Army': '#15803d',
  'Indian Navy': '#1d4ed8',
  'Indian Air Force': '#0891b2',
};
const DEFAULT_BRANCH_HUE = '#475569';

const BranchTag = ({ branch }) => {
  const hue = BRANCH_TAG[branch] || DEFAULT_BRANCH_HUE;
  return (
    <span style={{ fontSize: '0.7rem', fontWeight: 800, padding: '0.2rem 0.55rem', borderRadius: 999, background: hexToRgba(hue, 0.1), color: hue, border: `1px solid ${hexToRgba(hue, 0.25)}`, whiteSpace: 'nowrap' }}>
      {branch}
    </span>
  );
};

const FALLBACK_SPOTLIGHT = [
  { name: 'Rahul Kumar (Clerk SD)', branch: 'Indian Army', score: 94, trade: 'Clerk SD', skills: ['Administration', 'Inventory Control', 'Logistics'] },
  { name: 'Amit Singh', branch: 'Indian Navy', score: 87, trade: 'Seaman Branch', skills: ['Navigation', 'Physical Security', 'Telecom'] },
  { name: 'Vikram Vardhan', branch: 'Indian Air Force', score: 91, trade: 'Mechanical Fitter', skills: ['Engine Overhaul', 'System Inspection', 'Precision Hydraulics'] },
];

const EmployerDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [activePostingsCount, setActivePostingsCount] = useState(0);
  const [shortlistedCount, setShortlistedCount] = useState(0);
  const [activeChatsCount, setActiveChatsCount] = useState(0);
  const [connectionsCount, setConnectionsCount] = useState(0);
  const [spotlightCandidates, setSpotlightCandidates] = useState([]);
  const [requirements, setRequirements] = useState([]);

  // Recruiter pipeline requests state
  const [pipelineRequests, setPipelineRequests] = useState([]);
  const [pipelineFilter, setPipelineFilter] = useState('all');
  const [pipelineActionLoading, setPipelineActionLoading] = useState({});

  const [showEditModal, setShowEditModal] = useState(false);
  const [editFormData, setEditFormData] = useState({});
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const avatarInputRef = useRef(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        if (!currentSession) { navigate('/login'); return; }
        setSession(currentSession);

        const { data: profileData } = await supabase
          .from('employer_profiles').select('*').eq('id', currentSession.user.id).maybeSingle();

        if (!profileData?.company_name) { navigate('/employer/onboarding', { replace: true }); return; }
        setProfile(profileData);

        const [{ count: cCount }, { count: jCount }] = await Promise.all([
          supabase.from('connections').select('*', { count: 'exact', head: true }).eq('status', 'accepted').or(`sender_id.eq.${currentSession.user.id},receiver_id.eq.${currentSession.user.id}`).then((r) => r, () => ({ count: 0 })),
          supabase.from('jobs').select('*', { count: 'exact', head: true }).then((r) => r, () => ({ count: 0 })),
        ]);
        setConnectionsCount(cCount || 0);
        setActivePostingsCount(jCount || 0);

        // Fetch requirements
        const { data: requirementRows } = await supabase
          .from('ps_job_requirements').select('id, role_titles, sector, tags, quantity, status, created_at').eq('employer_id', currentSession.user.id).order('created_at', { ascending: false });
        setRequirements(requirementRows || []);

        // Fetch recruiter pipeline requests
        try {
          const res = await fetch('/api/private-sector/router', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${currentSession.access_token}`
            },
            body: JSON.stringify({ action: 'get_recruiter_requests' })
          });
          const reqData = await res.json();
          if (reqData.ok) {
            setPipelineRequests(reqData.requests || []);
          }
        } catch (e) {
          console.warn('Failed to load pipeline requests:', e);
        }

        const { data: sentMsgs } = await supabase.from('chat_messages').select('receiver_id').eq('sender_id', currentSession.user.id);
        setShortlistedCount(new Set((sentMsgs || []).map((m) => m.receiver_id).filter(Boolean)).size);

        const { data: allMsgs } = await supabase.from('chat_messages').select('sender_id, receiver_id').or(`sender_id.eq.${currentSession.user.id},receiver_id.eq.${currentSession.user.id}`);
        const activeChatCandidates = new Set();
        (allMsgs || []).forEach((m) => {
          if (m.sender_id !== currentSession.user.id) activeChatCandidates.add(m.sender_id);
          if (m.receiver_id !== currentSession.user.id) activeChatCandidates.add(m.receiver_id);
        });
        setActiveChatsCount(activeChatCandidates.size);

        const { data: topCandidates } = await supabase
          .from('user_profiles').select('*').eq('profiling_completed', true).order('veer_score', { ascending: false }).limit(3);
        if (topCandidates?.length) {
          setSpotlightCandidates(topCandidates.map((c) => {
            let parsedSkills;
            try { parsedSkills = typeof c.skills === 'string' ? JSON.parse(c.skills) : (c.skills || []); } catch { parsedSkills = []; }
            const rawData = c.raw_profile_data || {};
            return {
              name: c.full_name || 'Unnamed Candidate',
              branch: c.service_branch || 'Indian Army',
              score: c.veer_score || 0,
              trade: c.trade || rawData.armCorpsTrade || 'General Service',
              skills: parsedSkills.slice(0, 3),
            };
          }));
        }
      } catch (err) {
        console.error('Error loading employer dashboard:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, [navigate]);

  const handleUpdatePipelineStatus = async (requestId, newStatus) => {
    setPipelineActionLoading(prev => ({ ...prev, [requestId]: true }));
    try {
      const { error } = await supabase
        .from('ps_recruiter_requests')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', requestId);

      if (error) throw error;

      setPipelineRequests(prev => prev.map(r => r.id === requestId ? { ...r, status: newStatus } : r));
    } catch (err) {
      alert('Error updating status: ' + err.message);
    } finally {
      setPipelineActionLoading(prev => ({ ...prev, [requestId]: false }));
    }
  };

  const handleOpenEditModal = () => {
    if (!profile) return;
    setEditFormData({
      contact_name: profile.contact_name || '',
      company_name: profile.company_name || '',
      website: profile.website || '',
      location: profile.location || '',
      designation: profile.designation || '',
      about: profile.about || '',
      avatar_url: profile.avatar_url || '',
    });
    setAvatarPreview(profile.avatar_url || null);
    setShowEditModal(true);
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setAvatarUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${session?.user?.id}_${Date.now()}.${fileExt}`;
      const { error } = await supabase.storage.from('avatars').upload(filePath, file, { cacheControl: '3600', overwrite: true });
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath);
      setAvatarPreview(publicUrl);
      setEditFormData((prev) => ({ ...prev, avatar_url: publicUrl }));
    } catch (err) {
      console.error('Avatar upload failed:', err);
      alert('Failed to upload avatar: ' + err.message);
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.from('employer_profiles').update(editFormData).eq('id', session.user.id);
      if (error) throw error;
      alert('Profile updated successfully!');
      setShowEditModal(false);
      window.location.reload();
    } catch (err) {
      console.error('Failed to save profile:', err);
      alert('Error saving profile: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: 'var(--ios-bg)' }}>
        <div style={{ textAlign: 'center' }}>
          <RefreshCw className="animate-spin" size={32} color="var(--ios-olive)" />
          <p style={{ marginTop: '1rem', color: 'var(--text-secondary)' }}>Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  const companyName = profile?.company_name || 'Corporate Partner';
  const repName = profile?.contact_name || 'Recruiter';
  const designation = profile?.designation || 'TA Lead';
  const candidatesToRender = spotlightCandidates.length > 0 ? spotlightCandidates : FALLBACK_SPOTLIGHT;

  // Filter pipeline requests
  const filteredPipeline = pipelineRequests.filter(r => {
    if (pipelineFilter === 'all') return true;
    if (pipelineFilter === 'pending') return r.status === 'interest_sent';
    if (pipelineFilter === 'unlocked') return ['accepted', 'interview', 'hired'].includes(r.status);
    if (pipelineFilter === 'interview') return r.status === 'interview';
    if (pipelineFilter === 'hired') return r.status === 'hired';
    return true;
  });

  const unlockedCount = pipelineRequests.filter(r => ['accepted', 'interview', 'hired'].includes(r.status)).length;
  const pendingCount = pipelineRequests.filter(r => r.status === 'interest_sent').length;

  return (
    <div className="dashboard-wrapper">
      <div className="dashboard-content animate-fade-in">
        {/* Recruiter Hero Header */}
        <div className="emp-hero animate-fade-in">
          <div className="emp-hero-row">
            <div className="emp-avatar">
              {profile?.avatar_url ? <img src={profile.avatar_url} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <User size={38} color="white" />}
            </div>
            <div className="emp-identity">
              <span className="emp-eyebrow">Recruiter & Corporate Talent Portal</span>
              <h1 className="emp-name">{repName}</h1>
              <span className="emp-subtitle">{designation} at <strong>{companyName}</strong></span>
            </div>
            <div className="emp-actions">
              <Link to="/find-candidates" className="btn-secondary ios-pill emp-search-btn" style={{ textDecoration: 'none', background: 'var(--c-bg-0, white)', color: 'var(--c-green, #1F3A2E)', fontWeight: 700, padding: '0.65rem 1.25rem' }}>
                Search Military Talent
              </Link>
              <Button variant="ghost" onClick={handleOpenEditModal} style={{ background: 'rgba(255,255,255,0.15)', color: 'white', border: '1px solid rgba(255,255,255,0.3)' }}>
                Edit Profile
              </Button>
              <Button variant="ghost" onClick={() => navigate('/employer/onboarding?edit=true')} style={{ background: 'rgba(255,255,255,0.15)', color: 'white', border: '1px solid rgba(255,255,255,0.3)' }}>
                Redo Onboarding
              </Button>
            </div>
          </div>

          <div className="emp-stat-row">
            <div className="emp-stat">
              <span className="emp-stat-value">{requirements.length}</span>
              <span className="emp-stat-label"><Briefcase size={11} /> Requirements</span>
            </div>
            <div className="emp-stat">
              <span className="emp-stat-value">{pipelineRequests.length}</span>
              <span className="emp-stat-label"><Users size={11} /> Requests Sent</span>
            </div>
            <div className="emp-stat">
              <span className="emp-stat-value" style={{ color: '#86efac' }}>{unlockedCount}</span>
              <span className="emp-stat-label"><Unlock size={11} /> Unlocked Profiles</span>
            </div>
            <div className="emp-stat">
              <span className="emp-stat-value">{activeChatsCount}</span>
              <span className="emp-stat-label"><MessageSquare size={11} /> Active Chats</span>
            </div>
            <div className="emp-stat">
              <span className="emp-stat-value" style={{ fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Award size={16} /> Verified</span>
              <span className="emp-stat-label"><ShieldCheck size={11} /> Fair Hiring Partner</span>
            </div>
          </div>
        </div>

        {/* Recruiter Talent Pipeline & Introductions Section */}
        <div className="ios-card emp-card" style={{ padding: '2rem', background: 'var(--c-bg-0, white)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-2)', border: '1px solid rgba(0,0,0,0.02)', marginBottom: '1.5rem' }}>
          <div className="emp-sec-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Sparkles size={18} color="var(--ios-olive)" />
                <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--c-ink-1, #0f172a)', letterSpacing: '-0.02em', margin: 0 }}>
                  Candidate Pipeline & Introductions
                </h2>
              </div>
              <p style={{ color: 'var(--c-ink-4, #64748b)', fontSize: '0.86rem', margin: '0.2rem 0 0' }}>
                Veterans you have invited for introductions. Contact details unlock immediately upon candidate acceptance.
              </p>
            </div>

            {/* Pipeline status filter tabs */}
            <div className="emp-filter-tabs" role="group" aria-label="Filter candidates by status" style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
              {[
                { id: 'all', label: `All (${pipelineRequests.length})` },
                { id: 'pending', label: `Pending Consent (${pendingCount})` },
                { id: 'unlocked', label: `Unlocked / Accepted (${unlockedCount})` },
                { id: 'interview', label: 'Interviewing' },
                { id: 'hired', label: 'Hired' },
              ].map(tab => (
                <button
                  key={tab.id}
                  aria-pressed={pipelineFilter === tab.id}
                  onClick={() => setPipelineFilter(tab.id)}
                  style={{
                    padding: '0.35rem 0.75rem',
                    borderRadius: '999px',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    border: pipelineFilter === tab.id ? '1.5px solid var(--ios-olive)' : '1px solid #e2e8f0',
                    background: pipelineFilter === tab.id ? 'rgba(75, 107, 50, 0.1)' : '#f8fafc',
                    color: pipelineFilter === tab.id ? 'var(--ios-olive)' : '#475569',
                    cursor: 'pointer'
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {pipelineRequests.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2.5rem 1rem', background: 'var(--c-bg-1, #f8fafc)', borderRadius: '16px', border: '1px dashed var(--c-line-3, #cbd5e1)' }}>
              <Users size={32} color="#94a3b8" style={{ margin: '0 auto 0.5rem' }} />
              <h4 style={{ margin: '0 0 0.35rem', color: 'var(--c-ink-1, #0f172a)' }}>Your Talent Pipeline is Empty</h4>
              <p style={{ fontSize: '0.85rem', color: 'var(--c-ink-4, #64748b)', margin: '0 0 1rem', maxWidth: '480px', marginLeft: 'auto', marginRight: 'auto' }}>
                Search through verified military profiles and send introduction requests. Candidates will be notified on WhatsApp.
              </p>
              <Button size="sm" onClick={() => navigate('/find-candidates')}>Search Candidate Profiles</Button>
            </div>
          ) : filteredPipeline.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--c-ink-4, #64748b)', fontSize: '0.88rem' }}>
              No candidate requests in the "{pipelineFilter}" tab.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {filteredPipeline.map(item => {
                const c = item.candidate || {};
                const isUnlocked = c.is_unlocked || ['accepted', 'interview', 'hired'].includes(item.status);
                const reqTitle = (item.ps_job_requirements?.role_titles || []).join(' / ') || 'General Role';

                return (
                  <div 
                    key={item.id}
                    className="emp-pipe-item"
                    style={{
                      background: isUnlocked ? 'var(--c-tint-green, #fcfdfa)' : 'var(--c-bg-0, #ffffff)',
                      border: isUnlocked ? '1.5px solid #cce5c4' : '1px solid var(--c-line-2, #e2e8f0)',
                      borderRadius: '16px',
                      padding: '1.15rem 1.35rem',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: '1rem'
                    }}
                  >
                    <div className="emp-pipe-main" style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                      <div style={{
                        flexShrink: 0,
                        width: '44px',
                        height: '44px',
                        borderRadius: '12px',
                        background: isUnlocked ? 'var(--c-tint-green, #eef4ea)' : 'var(--c-bg-2, #f1f5f9)',
                        color: isUnlocked ? 'var(--c-green, #2d5a27)' : 'var(--c-ink-4, #64748b)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 800,
                        fontSize: '0.95rem'
                      }}>
                        {isUnlocked ? (c.name || 'VN').slice(0, 2).toUpperCase() : (c.maskedCode || 'VN').slice(3)}
                      </div>

                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                          <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: 'var(--c-ink-1, #0f172a)' }}>
                            {c.name || `Candidate ${c.maskedCode}`}
                          </h4>
                          {isUnlocked ? (
                            <span style={{ fontSize: '0.72rem', background: 'var(--c-tint-green, #dcfce7)', color: 'var(--c-green, #15803d)', padding: '0.15rem 0.5rem', borderRadius: '999px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                              <Unlock size={11} /> Contact Unlocked
                            </span>
                          ) : (
                            <span style={{ fontSize: '0.72rem', background: 'var(--c-tint-amber, #fef3c7)', color: 'var(--c-amber, #92400e)', padding: '0.15rem 0.5rem', borderRadius: '999px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                              <Clock size={11} /> Awaiting Veteran Consent
                            </span>
                          )}
                          {item.fit_score && (
                            <span style={{ fontSize: '0.72rem', background: 'var(--c-tint-green, #eef4ea)', color: 'var(--c-green, #2d5a27)', padding: '0.15rem 0.5rem', borderRadius: '999px', fontWeight: 800 }}>
                              {item.fit_score}% Fit
                            </span>
                          )}
                        </div>

                        <p style={{ margin: '0.2rem 0 0', fontSize: '0.82rem', color: 'var(--c-ink-3, #475569)' }}>
                          Role: <strong>{reqTitle}</strong> • {c.service || 'Armed Forces'} • {c.rank || 'Veteran'} ({c.trade || 'Specialist'})
                        </p>

                        {/* Unmasked Contact info */}
                        {isUnlocked && (c.mobile || c.email) && (
                          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginTop: '0.4rem', fontSize: '0.82rem', color: 'var(--c-green, #15803d)' }}>
                            {c.mobile && (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontWeight: 700 }}>
                                <Phone size={13} /> {c.mobile}
                              </span>
                            )}
                            {c.email && (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontWeight: 600 }}>
                                <Mail size={13} /> {c.email}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Pipeline Actions */}
                    <div className="emp-pipe-actions" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                      {isUnlocked ? (
                        <>
                          {c.mobile && (
                            <a
                              href={`tel:${c.mobile}`}
                              className="btn-primary"
                              style={{ textDecoration: 'none', padding: '0.45rem 0.85rem', fontSize: '0.8rem', borderRadius: '8px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                            >
                              <Phone size={13} /> Call
                            </a>
                          )}
                          {item.status !== 'interview' && item.status !== 'hired' && (
                            <Button 
                              size="sm" 
                              variant="secondary"
                              onClick={() => handleUpdatePipelineStatus(item.id, 'interview')}
                              disabled={pipelineActionLoading[item.id]}
                              style={{ fontSize: '0.8rem', fontWeight: 700 }}
                            >
                              Advance to Interview
                            </Button>
                          )}
                          {item.status !== 'hired' && (
                            <Button 
                              size="sm"
                              onClick={() => handleUpdatePipelineStatus(item.id, 'hired')}
                              disabled={pipelineActionLoading[item.id]}
                              style={{ fontSize: '0.8rem', fontWeight: 700, background: '#15803d' }}
                            >
                              Mark as Hired
                            </Button>
                          )}
                          {item.status === 'hired' && (
                            <span style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--c-green, #15803d)', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                              <CheckCircle2 size={16} /> Hired via VeerNXT
                            </span>
                          )}
                        </>
                      ) : (
                        <span style={{ fontSize: '0.78rem', color: 'var(--c-ink-4, #64748b)' }}>
                          Notified via WhatsApp
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Active Requirements Card */}
        <div className="ios-card emp-card" style={{ padding: '2rem', background: 'var(--c-bg-0, white)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-2)', border: '1px solid rgba(0,0,0,0.02)', marginBottom: '1.5rem' }}>
          <div className="emp-sec-head emp-sec-head-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--c-ink-1, #0f172a)', letterSpacing: '-0.02em', margin: 0 }}>Active Job Requirements</h2>
            <Button size="sm" icon={Plus} onClick={() => navigate('/employer/post-job')}>Post Another Job</Button>
          </div>
          {requirements.length === 0 ? (
            <p style={{ color: 'var(--c-ink-4, #64748b)', fontSize: '0.9rem', margin: 0 }}>No requirements posted yet — tell us who you're hiring for and our HR team will get started.</p>
          ) : (
            <div className="emp-req-wrap" style={{ overflowX: 'auto' }}>
              <table className="emp-req-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
                <thead>
                  <tr style={{ textAlign: 'left', color: 'var(--c-ink-4, #64748b)', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                    <th style={{ padding: '0.5rem 0.75rem 0.5rem 0' }}>Role & Sector</th>
                    <th style={{ padding: '0.5rem 0.75rem' }}>Tags</th>
                    <th style={{ padding: '0.5rem 0.75rem', textAlign: 'right' }}>Positions</th>
                    <th style={{ padding: '0.5rem 0.75rem', textAlign: 'center' }}>Status</th>
                    <th style={{ padding: '0.5rem 0 0.5rem 0.75rem', textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {requirements.map((r) => (
                    <tr key={r.id} style={{ borderTop: '1px solid var(--c-line-1, #f1f5f9)' }}>
                      <td data-cell="role" style={{ padding: '0.65rem 0.75rem 0.65rem 0', color: 'var(--c-ink-1, #0f172a)' }}>
                        <div style={{ fontWeight: 700 }}>{Array.isArray(r.role_titles) ? r.role_titles.map(rt => typeof rt === 'string' ? rt : (rt?.title || '')).filter(Boolean).join(' / ') : (typeof r.role_titles === 'string' ? r.role_titles : 'Role')}</div>
                        {r.sector && typeof r.sector === 'string' && (
                          <div style={{ fontSize: '0.75rem', color: 'var(--ios-olive)', fontWeight: 600, marginTop: '0.15rem' }}>
                            {r.sector}
                          </div>
                        )}
                      </td>
                      <td data-cell="tags" style={{ padding: '0.65rem 0.75rem' }}>
                        {Array.isArray(r.tags) && r.tags.length > 0 ? (
                          <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
                            {r.tags.slice(0, 3).map((t, tIdx) => {
                              const label = typeof t === 'string' ? t : (t?.label || t?.name || '');
                              return label ? (
                                <span key={tIdx} style={{ fontSize: '0.7rem', background: 'var(--c-bg-2, #f1f5f9)', border: '1px solid var(--c-line-2, #e2e8f0)', padding: '0.15rem 0.4rem', borderRadius: '4px', color: 'var(--c-ink-3, #475569)' }}>
                                  #{label}
                                </span>
                              ) : null;
                            })}
                            {r.tags.length > 3 && <span style={{ fontSize: '0.7rem', color: 'var(--c-ink-5, #94a3b8)' }}>+{r.tags.length - 3}</span>}
                          </div>
                        ) : (
                          <span style={{ fontSize: '0.75rem', color: 'var(--c-ink-5, #94a3b8)' }}>—</span>
                        )}
                      </td>
                      <td data-cell="positions" style={{ padding: '0.65rem 0.75rem', textAlign: 'right', fontWeight: 600 }}>{r.quantity}<span className="emp-pos-word"> {Number(r.quantity) === 1 ? 'position' : 'positions'}</span></td>
                      <td data-cell="status" style={{ padding: '0.65rem 0.75rem', textAlign: 'center' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '0.2rem 0.6rem', borderRadius: 999, background: 'rgba(75,107,50,0.1)', color: 'var(--ios-olive)' }}>
                          {REQUIREMENT_STATUS_LABEL[r.status] || r.status}
                        </span>
                      </td>
                      <td data-cell="action" style={{ padding: '0.65rem 0 0.65rem 0.75rem', textAlign: 'right' }}>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => navigate(`/find-candidates?requirementId=${r.id}`)}
                          style={{ fontSize: '0.78rem', padding: '0.25rem 0.6rem' }}
                        >
                          Find Matches →
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Veteran Talent Spotlight Card */}
        <div className="ios-card emp-card" style={{ padding: '2rem', background: 'var(--c-bg-0, white)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-2)', border: '1px solid rgba(0,0,0,0.02)' }}>
          <div className="emp-sec-head emp-sec-head-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div style={{ textAlign: 'left' }}>
              <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--c-ink-1, #0f172a)', letterSpacing: '-0.02em', margin: 0 }}>Veteran Talent Spotlight</h2>
              <p style={{ color: 'var(--c-ink-4, #64748b)', fontSize: '0.88rem', margin: '0.2rem 0 0' }}>Top transitioning military candidates matching corporate requisites</p>
            </div>
            <Link to="/find-candidates" style={{ color: 'var(--ios-olive)', fontWeight: 700, fontSize: '0.88rem', textDecoration: 'none' }}>View All Candidates →</Link>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
            {candidatesToRender.map((candidate, idx) => (
              <div key={idx} className="emp-spot-item" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', padding: '1.1rem 1.35rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--c-line-1, #f1f5f9)', background: 'var(--c-bg-1, #f8fafc)' }}>
                <div className="emp-spot-id" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: 'rgba(75, 107, 50, 0.1)', color: 'var(--ios-olive)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.95rem', flexShrink: 0 }}>
                    {candidate.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div style={{ textAlign: 'left', minWidth: 0 }}>
                    <h4 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--c-ink-1, #0f172a)', margin: 0 }}>{candidate.name}</h4>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.3rem', flexWrap: 'wrap' }}>
                      <BranchTag branch={candidate.branch} />
                      <span style={{ color: 'var(--c-ink-4, #64748b)', fontSize: '0.78rem' }}>Trade: {candidate.trade}</span>
                    </div>
                  </div>
                </div>

                <div className="emp-spot-meta" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap' }}>
                  <div className="emp-spot-skills" style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
                    {candidate.skills.map((skill, sIdx) => (
                      <span key={sIdx} style={{ fontSize: '0.68rem', background: 'var(--c-bg-0, white)', border: '1px solid var(--c-line-2, #e2e8f0)', padding: '0.22rem 0.5rem', borderRadius: 'var(--radius-sm)', color: 'var(--c-ink-3, #475569)', fontWeight: 600 }}>{skill}</span>
                    ))}
                  </div>
                  <span className="emp-spot-score" style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--ios-olive)', minWidth: '80px', textAlign: 'right' }}>{candidate.score}% Match</span>
                  <Button variant="secondary" size="sm" onClick={() => navigate('/find-candidates')} style={{ fontWeight: 700 }}>View Profile</Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {showEditModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(8px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999, padding: '1rem', overflowY: 'auto' }}>
          <div className="ios-card" style={{ background: 'var(--c-bg-0, white)', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: '550px', boxShadow: 'var(--shadow-3)', maxHeight: '90vh', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.5rem 1.75rem', borderBottom: '1px solid var(--c-line-1, #f1f5f9)' }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: 'var(--c-ink-1, #0f172a)' }}>Edit Company Profile</h3>
              <button onClick={() => setShowEditModal(false)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', fontWeight: 700, color: 'var(--c-ink-4, #64748b)', cursor: 'pointer' }}>&times;</button>
            </div>

            <form onSubmit={handleSaveProfile} style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', background: 'var(--c-bg-1, #f8fafc)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--c-line-2, #e2e8f0)' }}>
                <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#cbd5e1', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid var(--ios-olive)' }}>
                  {avatarPreview ? <img src={avatarPreview} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <User size={30} color="white" />}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', alignItems: 'flex-start' }}>
                  <Button type="button" variant="secondary" size="sm" onClick={() => avatarInputRef.current?.click()} disabled={avatarUploading} style={{ borderColor: 'var(--c-line-3, #cbd5e1)', color: 'var(--c-ink-1, #0f172a)' }}>
                    {avatarUploading ? 'Uploading...' : 'Upload Logo'}
                  </Button>
                  <span style={{ fontSize: '0.7rem', color: 'var(--c-ink-4, #64748b)' }}>JPG, PNG or WEBP. Max 2MB.</span>
                  <input type="file" ref={avatarInputRef} onChange={handleAvatarUpload} accept="image/*" style={{ display: 'none' }} />
                </div>
              </div>

              {[
                ['contact_name', 'Contact Name', 'text', true],
                ['company_name', 'Company Name', 'text', true],
                ['website', 'Website', 'url', false],
                ['designation', 'Designation', 'text', false],
                ['location', 'Location', 'text', false],
              ].map(([field, label, type, required]) => (
                <div key={field} style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', textAlign: 'left' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--c-ink-3, #475569)', textTransform: 'uppercase' }}>{label}</label>
                  <input type={type} required={required} value={editFormData[field] || ''} onChange={(e) => setEditFormData((prev) => ({ ...prev, [field]: e.target.value }))}
                    style={{ border: '1px solid var(--c-line-2, #e2e8f0)', borderRadius: 'var(--radius-sm)', padding: '0.6rem 0.75rem', fontSize: '0.9rem' }} />
                </div>
              ))}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', textAlign: 'left' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--c-ink-3, #475569)', textTransform: 'uppercase' }}>Company Description</label>
                <textarea value={editFormData.about || ''} onChange={(e) => setEditFormData((prev) => ({ ...prev, about: e.target.value }))} rows="3"
                  style={{ border: '1px solid var(--c-line-2, #e2e8f0)', borderRadius: 'var(--radius-sm)', padding: '0.6rem 0.75rem', fontSize: '0.9rem', fontFamily: 'inherit' }} />
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1.25rem' }}>
                <Button type="submit" style={{ flex: 1, padding: '0.75rem', fontSize: '0.95rem' }}>Save Changes</Button>
                <Button type="button" variant="secondary" onClick={() => setShowEditModal(false)} style={{ flex: 1, padding: '0.75rem', borderColor: 'var(--c-line-3, #cbd5e1)', color: 'var(--c-ink-1, #0f172a)', fontSize: '0.95rem' }}>Cancel</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        .dashboard-wrapper { width: 100%; max-width: 1800px; margin: 0 auto; padding: 2.5rem clamp(1.25rem, 3vw, 2.5rem); }
        .emp-hero {
          margin-bottom: 2.5rem;
          background: linear-gradient(135deg, #0d1f0d 0%, #1F3A2E 100%);
          padding: 2rem;
          border-radius: var(--radius-lg);
          box-shadow: var(--shadow-3);
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }
        .emp-hero-row { display: flex; align-items: center; flex-wrap: wrap; gap: 1.25rem; }
        .emp-avatar {
          width: 64px; height: 64px; flex-shrink: 0; border-radius: 50%;
          background: rgba(255,255,255,0.15); display: flex; align-items: center; justify-content: center;
          border: 3px solid rgba(255,255,255,0.35); overflow: hidden; box-shadow: var(--shadow-2);
        }
        .emp-identity { display: flex; flex-direction: column; gap: 0.15rem; min-width: 0; margin-right: auto; }
        .emp-eyebrow { font-size: 0.7rem; font-weight: 800; letter-spacing: 0.05em; text-transform: uppercase; color: rgba(255,255,255,0.65); }
        .emp-name { font-size: 1.6rem; font-weight: 800; letter-spacing: -0.02em; color: white; margin: 0; }
        .emp-subtitle { font-size: 0.88rem; color: rgba(255,255,255,0.75); }
        .emp-subtitle strong { color: white; }
        .emp-actions { display: flex; gap: 0.6rem; flex-wrap: wrap; }
        .emp-stat-row { display: flex; flex-wrap: wrap; gap: 1.75rem; padding-top: 1.15rem; border-top: 1px solid rgba(255,255,255,0.18); }
        .emp-stat { display: flex; flex-direction: column; gap: 0.2rem; }
        .emp-stat-value { font-size: 1.7rem; font-weight: 800; color: #fff; line-height: 1; letter-spacing: -0.03em; }
        .emp-stat-label { font-size: 0.7rem; font-weight: 600; color: rgba(255,255,255,0.7); text-transform: uppercase; letter-spacing: 0.04em; display: inline-flex; align-items: center; gap: 0.3rem; }
        .emp-pos-word { display: none; }
        .emp-req-table td[data-cell="action"] button, .emp-req-table td[data-cell="status"] span { white-space: nowrap; }
        .emp-hero-row, .emp-actions, .emp-identity { min-width: 0; }
        .dashboard-wrapper a:focus-visible, .dashboard-wrapper button:focus-visible { outline: 3px solid var(--accent-gold, #fbbf24); outline-offset: 2px; }

        /* Tablet: tighter padding; filter chips scroll inside their own row */
        @media (max-width: 900px) {
          .emp-hero { padding: 1.5rem; }
          .emp-card { padding: 1.5rem !important; }
          .emp-stat-row { gap: 1rem 1.75rem; }
          .emp-filter-tabs { flex-wrap: nowrap !important; overflow-x: auto; max-width: 100%; padding-bottom: 2px; scrollbar-width: none; -webkit-overflow-scrolling: touch; }
          .emp-filter-tabs::-webkit-scrollbar { display: none; }
          .emp-filter-tabs button { flex: 0 0 auto; white-space: nowrap; }
        }

        /* Job requirements become stacked cards below 640px (the table is kept above that) */
        @media (max-width: 640px) {
          .emp-req-wrap { overflow-x: visible !important; }
          .emp-req-table, .emp-req-table tbody { display: block; width: 100%; }
          .emp-req-table thead { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); } /* headings stay for screen readers */
          .emp-req-table tr {
            display: grid;
            grid-template-columns: minmax(0, 1fr) auto;
            grid-template-areas: "role role" "tags tags" "positions status" "action action";
            gap: 0.5rem 0.75rem;
            align-items: center;
            padding: 0.85rem 0;
            border-top: 1px solid var(--c-line-1, #f1f5f9);
          }
          .emp-req-table td { display: block; padding: 0 !important; text-align: left !important; min-width: 0; }
          .emp-req-table td[data-cell="role"] { grid-area: role; overflow-wrap: anywhere; }
          .emp-req-table td[data-cell="tags"] { grid-area: tags; }
          .emp-req-table td[data-cell="positions"] { grid-area: positions; font-size: 0.85rem; color: var(--c-ink-3, #475569); }
          .emp-req-table td[data-cell="status"] { grid-area: status; justify-self: end; }
          .emp-req-table td[data-cell="action"] { grid-area: action; }
          .emp-pos-word { display: inline; }
          .emp-req-table td[data-cell="action"] button { width: 100%; min-height: 44px; font-size: 0.88rem !important; justify-content: center; }
        }

        /* Phone */
        @media (max-width: 600px) {
          .dashboard-wrapper { padding: 0.75rem 12px 1.5rem; }
          .emp-card { padding: 1rem !important; border-radius: 16px !important; margin-bottom: 1rem !important; }
          .emp-sec-head { flex-direction: column; flex-wrap: nowrap !important; align-items: stretch !important; gap: 0.6rem !important; margin-bottom: 0.9rem !important; min-width: 0; }
          .emp-sec-head > * { min-width: 0; max-width: 100%; }
          .emp-sec-head h2 { font-size: 1.1rem !important; }
          .emp-sec-head-row { flex-direction: row; flex-wrap: wrap !important; align-items: center !important; }
          .emp-sec-head-row > a, .emp-sec-head-row > button { flex-shrink: 0; }
          .emp-filter-tabs { margin: 0 -1rem; padding: 2px 1rem 4px; max-width: none; }
          .emp-filter-tabs button { min-height: 40px; }

          /* Hero: identity, stats (2 across), then Search Military Talent and the two secondary actions */
          .emp-hero { display: grid; grid-template-columns: 56px minmax(0, 1fr); gap: 0.9rem 0.85rem; padding: 1.1rem 1rem; margin-bottom: 1rem; border-radius: 18px; }
          .emp-hero-row { display: contents; }
          .emp-avatar { grid-area: 1 / 1; width: 56px; height: 56px; border-width: 2px; }
          .emp-identity { grid-area: 1 / 2; align-self: center; margin-right: 0; }
          .emp-name { font-size: 1.3rem; overflow-wrap: anywhere; }
          .emp-subtitle { overflow-wrap: anywhere; }
          .emp-stat-row { grid-area: 2 / 1 / 3 / 3; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.85rem 0.75rem; padding-top: 0.9rem; }
          .emp-stat:last-child { grid-column: 1 / -1; flex-direction: row; align-items: center; justify-content: flex-start; gap: 0.75rem; }
          .emp-stat-value { font-size: 1.45rem; }
          .emp-actions { grid-area: 3 / 1 / 4 / 3; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.6rem; }
          .emp-actions > :first-child { grid-column: 1 / -1; }
          .emp-actions a, .emp-actions button { width: 100%; min-height: 44px; justify-content: center; text-align: center; box-sizing: border-box; display: inline-flex; align-items: center; padding-left: 0.5rem !important; padding-right: 0.5rem !important; }

          /* Candidate pipeline rows */
          .emp-pipe-item { padding: 0.9rem !important; gap: 0.75rem !important; }
          .emp-pipe-main { align-items: flex-start !important; gap: 0.75rem !important; flex: 1 1 100%; min-width: 0; }
          .emp-pipe-main p, .emp-pipe-main h4, .emp-pipe-main span { overflow-wrap: anywhere; }
          .emp-pipe-actions { flex: 1 1 100%; display: grid !important; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 0.5rem !important; }
          .emp-pipe-actions a, .emp-pipe-actions button { min-height: 44px; justify-content: center; width: 100%; box-sizing: border-box; }

          /* Veteran Talent Spotlight rows */
          .emp-spot-item { flex-direction: column; align-items: stretch !important; padding: 0.9rem !important; }
          .emp-spot-id { min-width: 0; gap: 0.75rem !important; }
          .emp-spot-meta { display: flex; flex-wrap: wrap; gap: 0.6rem 0.75rem !important; align-items: center; }
          .emp-spot-skills { flex: 1 1 100%; }
          .emp-spot-score { flex: 1 1 auto; text-align: left !important; min-width: 0 !important; }
          .emp-spot-meta > button { min-height: 44px; flex: 0 0 auto; }
        }
      `}} />
    </div>
  );
};

export default EmployerDashboard;
