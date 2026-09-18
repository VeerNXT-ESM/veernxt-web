import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import {
  RefreshCw,
  MapPin,
  Users,
  IndianRupee,
  CheckCircle2,
  Tag,
  Search,
  Sparkles,
  Building2,
  ShieldCheck,
  Lock,
  Unlock,
  Bell,
  Clock,
  ThumbsUp,
  ThumbsDown,
  ChevronRight,
} from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { SECTOR_OPTIONS } from '../lib/privateSectorTaxonomy';

const PrivateSectorOpportunities = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState(null);
  const [profileCompleted, setProfileCompleted] = useState(false);
  const [candidateProfile, setCandidateProfile] = useState(null);
  const [opportunities, setOpportunities] = useState([]);
  const [interestedIds, setInterestedIds] = useState(new Set());
  const [dismissedIds, setDismissedIds] = useState(new Set());
  const [dismissingId, setDismissingId] = useState(null);
  const [busyId, setBusyId] = useState(null);

  // Inbound recruiter requests (Direct Employer Invitations)
  const [inboundRequests, setInboundRequests] = useState([]);
  const [respondingId, setRespondingId] = useState(null);

  // Active view tab: 'opportunities' | 'invitations'
  const [activeTab, setActiveTab] = useState('opportunities');

  // Filters
  const [selectedSector, setSelectedSector] = useState('All');
  const [selectedTag, setSelectedTag] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    (async () => {
      const {
        data: { session: currentSession },
      } = await supabase.auth.getSession();
      if (!currentSession) {
        navigate('/login');
        return;
      }
      setSession(currentSession);

      const { data: profile } = await supabase
        .from('ps_candidate_profiles')
        .select('*')
        .eq('user_id', currentSession.user.id)
        .maybeSingle();
      setProfileCompleted(!!profile?.profile_completed);
      setCandidateProfile(profile || null);

      // Fetch public approved requirements
      const { data: requirements } = await supabase
        .from('ps_job_requirements')
        .select('*')
        .eq('status', 'approved')
        .order('created_at', { ascending: false });
      setOpportunities(requirements || []);

      // Fetch candidate interest records
      const { data: interests } = await supabase
        .from('ps_candidate_interest')
        .select('requirement_id')
        .eq('user_id', currentSession.user.id);
      setInterestedIds(new Set((interests || []).map((i) => i.requirement_id)));

      // Fetch inbound employer introduction requests
      try {
        const res = await fetch('/api/private-sector/router', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${currentSession.access_token}`,
          },
          body: JSON.stringify({ action: 'get_recruiter_requests', mode: 'candidate' }),
        });
        const reqData = await res.json();
        if (reqData.ok) {
          const reqs = reqData.requests || [];
          setInboundRequests(reqs);
          // If candidate has pending invitations, auto-focus invitations tab
          if (reqs.some((r) => r.status === 'interest_sent')) {
            setActiveTab('invitations');
          }
        }
      } catch (e) {
        console.warn('Failed to load inbound requests:', e);
      }

      setLoading(false);
    })();
  }, [navigate]);

  const handleRespondRequest = async (requestId, decision) => {
    setRespondingId(requestId);
    try {
      const res = await fetch('/api/private-sector/router', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          action: 'respond_recruiter_request',
          request_id: requestId,
          decision,
        }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || 'Failed to respond');

      setInboundRequests((prev) =>
        prev.map((r) =>
          r.id === requestId ? { ...r, status: decision === 'accepted' ? 'accepted' : 'declined' } : r
        )
      );

      if (decision === 'accepted') {
        alert('Introduction accepted! Your verified military profile and contact details have been securely shared with the employer.');
      }
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setRespondingId(null);
    }
  };

  const expressInterest = async (requirementId) => {
    if (!profileCompleted) {
      navigate(`/private-sector/profile?returnTo=/private-sector/opportunities`);
      return;
    }
    setBusyId(requirementId);
    try {
      const res = await fetch('/api/private-sector/router', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ action: 'express_interest', requirement_id: requirementId }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || 'Failed to express interest');
      setInterestedIds((prev) => new Set([...prev, requirementId]));
    } catch (err) {
      console.error('Failed to express interest:', err);
      alert(err.message);
    } finally {
      setBusyId(null);
    }
  };

  const dismiss = (requirementId) => {
    setDismissingId(requirementId);
    setTimeout(() => {
      setDismissedIds((prev) => new Set([...prev, requirementId]));
      setDismissingId(null);
    }, 900);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <RefreshCw className="animate-spin" size={32} color="var(--ios-olive, #4b6b32)" />
      </div>
    );
  }

  // Calculate unique tags available across all active jobs
  const allJobTags = Array.from(
    new Set(opportunities.flatMap((o) => o.tags || []).filter(Boolean))
  );

  // Filter opportunities by sector, tag, search query, and dismissed list
  const filtered = opportunities.filter((opp) => {
    if (dismissedIds.has(opp.id)) return false;

    // Sector filter
    if (selectedSector !== 'All') {
      if (opp.sector !== selectedSector) return false;
    }

    // Tag filter
    if (selectedTag) {
      if (!(opp.tags || []).includes(selectedTag)) return false;
    }

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const rolesMatch = (opp.role_titles || []).some((r) => r.toLowerCase().includes(q));
      const sectorMatch = (opp.sector || '').toLowerCase().includes(q);
      const locMatch = (opp.locations || []).some((l) => l.toLowerCase().includes(q));
      const descMatch = (opp.description || '').toLowerCase().includes(q);
      const tagsMatch = (opp.tags || []).some((t) => t.toLowerCase().includes(q));
      if (!rolesMatch && !sectorMatch && !locMatch && !descMatch && !tagsMatch) return false;
    }

    return true;
  });

  const checkMatch = (opp) => {
    if (!candidateProfile) return false;
    const candSectors = candidateProfile.sectors || [];
    const candRoles = candidateProfile.work_types || [];
    const candTags = candidateProfile.tags || [];

    const sectorMatched = opp.sector && candSectors.includes(opp.sector);
    const roleMatched = (opp.role_titles || []).some((r) => candRoles.includes(r));
    const tagMatched = (opp.tags || []).some((t) => candTags.includes(t));

    return sectorMatched || roleMatched || tagMatched;
  };

  const pendingInvitationsCount = inboundRequests.filter((r) => r.status === 'interest_sent').length;

  return (
    <div style={{ maxWidth: 920, margin: '0 auto', padding: '2rem 1.25rem 3.5rem' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 850, margin: '0 0 0.35rem', color: '#0f172a', letterSpacing: '-0.02em' }}>
          Civilian & Corporate Opportunities
        </h1>
        <p style={{ color: 'var(--text-secondary, #64748b)', margin: 0, fontSize: '0.94rem' }}>
          Verified private-sector positions mapped to your military trade experience and supervisory scale.
        </p>
      </div>

      {!profileCompleted && (
        <Card padding="md" style={{ marginBottom: '1.5rem', background: '#fff8f0', border: '1px solid #f3d9a8' }}>
          <strong style={{ display: 'block', marginBottom: '0.3rem', color: '#7a5a1e' }}>
            Complete your military profile first
          </strong>
          <p style={{ margin: '0 0 0.75rem', fontSize: '0.85rem', color: '#7a5a1e' }}>
            To express interest, match with corporate recruiters, and receive direct introduction invitations, set your Tri-Service credentials and logged duties.
          </p>
          <Button size="sm" onClick={() => navigate('/private-sector/profile?returnTo=/private-sector/opportunities')}>
            Build Tri-Service Profile →
          </Button>
        </Card>
      )}

      {/* Main Mode Navigation Tabs */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', borderBottom: '1.5px solid #e2e8f0', paddingBottom: '0.75rem' }}>
        <button
          type="button"
          onClick={() => setActiveTab('opportunities')}
          style={{
            background: 'none',
            border: 'none',
            padding: '0.4rem 0.75rem',
            fontSize: '0.95rem',
            fontWeight: 800,
            cursor: 'pointer',
            color: activeTab === 'opportunities' ? 'var(--ios-olive, #4b6b32)' : '#64748b',
            borderBottom: activeTab === 'opportunities' ? '2.5px solid var(--ios-olive, #4b6b32)' : 'none',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
          }}
        >
          <Building2 size={16} /> Browse Open Roles ({opportunities.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('invitations')}
          style={{
            background: 'none',
            border: 'none',
            padding: '0.4rem 0.75rem',
            fontSize: '0.95rem',
            fontWeight: 800,
            cursor: 'pointer',
            color: activeTab === 'invitations' ? 'var(--ios-olive, #4b6b32)' : '#64748b',
            borderBottom: activeTab === 'invitations' ? '2.5px solid var(--ios-olive, #4b6b32)' : 'none',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.45rem',
          }}
        >
          <Bell size={16} /> Direct Employer Invitations
          {pendingInvitationsCount > 0 && (
            <span
              style={{
                background: '#ef4444',
                color: 'white',
                fontSize: '0.7rem',
                fontWeight: 800,
                padding: '0.15rem 0.45rem',
                borderRadius: '999px',
              }}
            >
              {pendingInvitationsCount} New
            </span>
          )}
        </button>
      </div>

      {/* VIEW 1: Direct Employer Invitations Tab */}
      {activeTab === 'invitations' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div
            style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '16px',
              padding: '1.25rem',
              display: 'flex',
              gap: '0.85rem',
              alignItems: 'flex-start',
            }}
          >
            <ShieldCheck size={22} color="var(--ios-olive, #4b6b32)" style={{ flexShrink: 0, marginTop: '0.1rem' }} />
            <div style={{ fontSize: '0.85rem', color: '#475569', lineHeight: 1.5 }}>
              <strong style={{ color: '#0f172a' }}>Protected Introduction Workflow:</strong> Employers evaluated your verified trade skills and supervisory experience.
              Your mobile number and email address remain <strong>strictly masked</strong> until you click "Accept Introduction".
            </div>
          </div>

          {inboundRequests.length === 0 ? (
            <Card padding="lg" style={{ textAlign: 'center', color: '#64748b', padding: '3.5rem 1.5rem' }}>
              <Bell size={36} color="#94a3b8" style={{ margin: '0 auto 0.75rem', opacity: 0.4 }} />
              <h3 style={{ margin: '0 0 0.35rem', color: '#0f172a', fontSize: '1.1rem' }}>No Inbound Employer Requests Yet</h3>
              <p style={{ fontSize: '0.88rem', maxWidth: '480px', margin: '0 auto 1.25rem' }}>
                Corporate recruiters search VeerNXT for military talent daily. Complete your profile with all logged duties to increase visibility.
              </p>
              <Button size="sm" onClick={() => navigate('/private-sector/profile')}>Update Service Profile</Button>
            </Card>
          ) : (
            inboundRequests.map((req) => {
              const job = req.ps_job_requirements || {};
              const employer = job.employer_profiles || {};
              const isPending = req.status === 'interest_sent';
              const isAccepted = ['accepted', 'interview', 'hired'].includes(req.status);
              const isDeclined = req.status === 'declined';

              return (
                <Card key={req.id} padding="lg" style={{ border: isPending ? '1.5px solid #d7e6d0' : '1px solid #e2e8f0', background: isPending ? '#fbfdf9' : 'white' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.4rem' }}>
                        <span style={{ fontSize: '0.76rem', background: '#eef4ea', color: '#2d5a27', padding: '0.2rem 0.55rem', borderRadius: '4px', fontWeight: 800 }}>
                          Direct Corporate Invitation
                        </span>
                        {req.fit_score && (
                          <span style={{ fontSize: '0.76rem', background: 'rgba(75,107,50,0.12)', color: 'var(--ios-olive, #4b6b32)', padding: '0.2rem 0.55rem', borderRadius: '4px', fontWeight: 800 }}>
                            {req.fit_score}% Capability Match
                          </span>
                        )}
                        <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                          Received on {new Date(req.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                      </div>

                      <h3 style={{ margin: '0 0 0.35rem', fontSize: '1.25rem', fontWeight: 850, color: '#0f172a' }}>
                        {(job.role_titles || []).join(' / ') || 'Position'}
                      </h3>

                      <p style={{ margin: 0, fontSize: '0.92rem', color: '#334155', fontWeight: 700 }}>
                        {employer.company_name || 'Corporate Hiring Partner'} {employer.industry ? `• ${employer.industry}` : ''}
                      </p>

                      <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap', fontSize: '0.85rem', color: '#64748b', marginTop: '0.65rem' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                          <MapPin size={14} /> {(job.locations || []).join(', ') || 'Multiple Locations'}
                        </span>
                        {job.salary_range && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                            <IndianRupee size={14} /> {job.salary_range}
                          </span>
                        )}
                        {job.sector && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                            <Building2 size={14} /> {job.sector}
                          </span>
                        )}
                      </div>

                      {job.description && (
                        <p style={{ margin: '0.75rem 0 0', fontSize: '0.88rem', color: '#475569', lineHeight: 1.45 }}>
                          {job.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Decision status bar */}
                  <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                    {isPending ? (
                      <>
                        <div style={{ fontSize: '0.82rem', color: '#64748b', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                          <Lock size={13} /> Your phone & email remain private until you accept.
                        </div>
                        <div style={{ display: 'flex', gap: '0.65rem' }}>
                          <Button
                            size="sm"
                            onClick={() => handleRespondRequest(req.id, 'accepted')}
                            disabled={respondingId === req.id}
                            style={{ fontWeight: 700, background: 'var(--ios-olive, #4b6b32)' }}
                          >
                            <Unlock size={14} style={{ marginRight: '0.35rem' }} /> Accept Introduction & Share Profile
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => handleRespondRequest(req.id, 'declined')}
                            disabled={respondingId === req.id}
                            style={{ borderColor: '#cbd5e1', color: '#64748b' }}
                          >
                            Decline
                          </Button>
                        </div>
                      </>
                    ) : isAccepted ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#15803d', fontSize: '0.88rem', fontWeight: 700 }}>
                        <CheckCircle2 size={18} /> Introduction Accepted — {employer.company_name || 'The employer'} has received your profile and will contact you directly.
                      </div>
                    ) : (
                      <div style={{ color: '#64748b', fontSize: '0.85rem' }}>
                        You declined this introduction.
                      </div>
                    )}
                  </div>
                </Card>
              );
            })
          )}
        </div>
      )}

      {/* VIEW 2: Browse Public Approved Requirements Tab */}
      {activeTab === 'opportunities' && (
        <div>
          {/* Sector Filter Bar */}
          <div style={{ marginBottom: '1rem', overflowX: 'auto', paddingBottom: '0.35rem' }}>
            <div style={{ display: 'flex', gap: '0.45rem', minWidth: 'max-content' }}>
              {['All', ...SECTOR_OPTIONS].map((sec) => {
                const isSelected = selectedSector === sec;
                return (
                  <button
                    key={sec}
                    type="button"
                    onClick={() => setSelectedSector(sec)}
                    style={{
                      padding: '0.45rem 0.9rem',
                      borderRadius: '999px',
                      border: isSelected ? '1.5px solid var(--ios-olive, #4b6b32)' : '1px solid #cbd5e1',
                      background: isSelected ? 'var(--ios-olive, #4b6b32)' : '#ffffff',
                      color: isSelected ? '#ffffff' : '#334155',
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {sec}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Search and Tag filter controls */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <div style={{ position: 'relative' }}>
              <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '0.9rem', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text"
                className="vx-search-input"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by role, sector, tags, or location…"
                style={{
                  width: '100%',
                  padding: '0.7rem 1rem 0.7rem 2.4rem',
                  borderRadius: '10px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.88rem',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {allJobTags.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b' }}>Filter by Tag:</span>
                {selectedTag && (
                  <button
                    type="button"
                    onClick={() => setSelectedTag('')}
                    style={{
                      padding: '0.25rem 0.6rem',
                      borderRadius: '999px',
                      border: '1px solid #94a3b8',
                      background: '#e2e8f0',
                      color: '#334155',
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Clear tag
                  </button>
                )}
                {allJobTags.slice(0, 12).map((tag) => {
                  const isSelected = selectedTag === tag;
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => setSelectedTag(isSelected ? '' : tag)}
                      style={{
                        padding: '0.25rem 0.6rem',
                        borderRadius: '999px',
                        border: isSelected ? '1px solid var(--ios-olive, #4b6b32)' : '1px solid #e2e8f0',
                        background: isSelected ? 'rgba(75,107,50,0.1)' : '#f8fafc',
                        color: isSelected ? 'var(--ios-olive, #4b6b32)' : '#475569',
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      #{tag}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Opportunities List */}
          {filtered.length === 0 ? (
            <Card padding="lg" style={{ textAlign: 'center', color: 'var(--text-secondary, #64748b)', padding: '3rem' }}>
              No opportunities match your current filters. Try changing your sector or clearing search filters.
            </Card>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {filtered.map((opp) => {
                const isInterested = interestedIds.has(opp.id);
                const isMatched = checkMatch(opp);

                return (
                  <Card key={opp.id} padding="lg">
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-start' }}>
                      <div style={{ flex: 1, minWidth: 240 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.45rem' }}>
                          {opp.sector && (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.25rem',
                                padding: '0.2rem 0.55rem',
                                borderRadius: '4px',
                                background: '#eff6ff',
                                color: '#1d4ed8',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                              }}
                            >
                              <Building2 size={12} />
                              {opp.sector}
                            </span>
                          )}
                          {isMatched && (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.25rem',
                                padding: '0.2rem 0.55rem',
                                borderRadius: '4px',
                                background: 'rgba(75,107,50,0.12)',
                                color: 'var(--ios-olive, #4b6b32)',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                              }}
                            >
                              <Sparkles size={12} />
                              Matched for You
                            </span>
                          )}
                        </div>

                        <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>
                          {(opp.role_titles || []).join(' / ')}
                        </h3>

                        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', fontSize: '0.85rem', color: '#64748b', marginBottom: '0.75rem' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                            <Users size={14} /> {opp.quantity} positions
                          </span>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                            <MapPin size={14} /> {(opp.locations || []).join(', ')}
                          </span>
                          {opp.salary_range && (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                              <IndianRupee size={14} /> {opp.salary_range}
                            </span>
                          )}
                        </div>

                        {opp.description && (
                          <p style={{ margin: '0 0 0.6rem', fontSize: '0.9rem', color: '#334155', lineHeight: 1.5 }}>
                            {opp.description}
                          </p>
                        )}

                        {opp.requirements_text && (
                          <p style={{ margin: '0 0 0.75rem', fontSize: '0.84rem', color: '#64748b' }}>
                            <strong>Requirements:</strong> {opp.requirements_text}
                          </p>
                        )}

                        {/* Render Tags */}
                        {opp.tags && opp.tags.length > 0 && (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginTop: '0.4rem' }}>
                            {opp.tags.map((tag) => (
                              <span
                                key={tag}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.2rem',
                                  padding: '0.2rem 0.5rem',
                                  background: '#f1f5f9',
                                  border: '1px solid #e2e8f0',
                                  borderRadius: '999px',
                                  fontSize: '0.76rem',
                                  fontWeight: 600,
                                  color: '#475569',
                                }}
                              >
                                <Tag size={10} />
                                #{tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '0.6rem', marginTop: '1.1rem', paddingTop: '1rem', borderTop: '1px solid #e2e8f0' }}>
                      {dismissingId === opp.id ? (
                        <span style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-secondary, #64748b)' }}>
                          Got it.
                        </span>
                      ) : isInterested ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.88rem', fontWeight: 700, color: '#15803d' }}>
                          <CheckCircle2 size={16} /> Interest expressed — VeerNXT HR will be in touch
                        </span>
                      ) : (
                        <>
                          <Button size="sm" onClick={() => expressInterest(opp.id)} disabled={busyId === opp.id}>
                            {busyId === opp.id ? 'Please wait…' : "I'm Interested"}
                          </Button>
                          <Button size="sm" variant="secondary" onClick={() => dismiss(opp.id)}>
                            Not for me
                          </Button>
                        </>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PrivateSectorOpportunities;
