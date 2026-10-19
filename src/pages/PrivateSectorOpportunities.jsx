import { useEffect, useRef, useState } from 'react';
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
  SlidersHorizontal,
  ArrowUpDown,
  X,
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
  // Display order only ('relevance' = matched-for-you first, then newest) and the
  // phone/tablet filter sheet (the tag filter moves into it below 993px).
  const [sortBy, setSortBy] = useState('relevance');
  const [sheetOpen, setSheetOpen] = useState(false);
  const sheetRef = useRef(null);
  const filtersBtnRef = useRef(null);

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

  // Keep the selected sector chip in view when the strip scrolls sideways.
  useEffect(() => {
    document.querySelector('.ps-chip.selected')?.scrollIntoView({ inline: 'nearest', block: 'nearest' });
  }, [selectedSector, activeTab]);

  // Filter sheet: Escape closes it (focus returns to the Filters button), focus moves
  // inside on open, and the page behind doesn't scroll. All undone on close/unmount.
  useEffect(() => {
    if (!sheetOpen) return undefined;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.body.classList.add('ps-sheet-open');
    sheetRef.current?.querySelector('button')?.focus();
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setSheetOpen(false);
        filtersBtnRef.current?.focus();
      }
    };
    const mq = window.matchMedia('(min-width: 993px)');
    const onChange = () => { if (mq.matches) setSheetOpen(false); };
    document.addEventListener('keydown', onKey);
    mq.addEventListener?.('change', onChange);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.body.classList.remove('ps-sheet-open');
      document.removeEventListener('keydown', onKey);
      mq.removeEventListener?.('change', onChange);
    };
  }, [sheetOpen]);

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

  const sortedOpportunities = [...filtered].sort((a, b) => {
    if (sortBy === 'newest') return new Date(b.created_at || 0) - new Date(a.created_at || 0);
    if (sortBy === 'positions') return (b.quantity || 0) - (a.quantity || 0);
    // relevance: opportunities matched to the candidate first; otherwise keep the fetched (newest-first) order
    return Number(checkMatch(b)) - Number(checkMatch(a));
  });
  const filtersApplied = selectedSector !== 'All' || Boolean(selectedTag) || Boolean(searchQuery.trim());
  const clearAllFilters = () => {
    setSelectedSector('All');
    setSelectedTag('');
    setSearchQuery('');
  };

  // The tag filter: inline on desktop, inside the Filters sheet on tablets/phones (same state either way).
  const renderTagFilter = () => allJobTags.length > 0 && (
    <div className="ps-tags">
      <span className="ps-tags-label">Filter by Tag:</span>
      {selectedTag && (
        <button type="button" className="ps-tag ps-tag-clear" onClick={() => setSelectedTag('')}>
          Clear tag
        </button>
      )}
      {allJobTags.slice(0, 12).map((tag) => {
        const isSelected = selectedTag === tag;
        return (
          <button
            key={tag}
            type="button"
            className={`ps-tag ${isSelected ? 'selected' : ''}`}
            aria-pressed={isSelected}
            onClick={() => setSelectedTag(isSelected ? '' : tag)}
          >
            #{tag}
          </button>
        );
      })}
    </div>
  );

  return (
    <div className="ps-opps">
      <div className="ps-opps-head">
        <h1 className="ps-opps-title">
          Civilian & Corporate Opportunities
        </h1>
        <p className="ps-opps-sub">
          Verified private-sector positions mapped to your military trade experience and supervisory scale.
        </p>
      </div>

      {!profileCompleted && (
        <Card padding="md" style={{ marginBottom: '1.5rem', background: 'var(--c-tint-amber, #fff8f0)', border: '1px solid #f3d9a8' }}>
          <strong style={{ display: 'block', marginBottom: '0.3rem', color: 'var(--c-amber, #7a5a1e)' }}>
            Complete your military profile first
          </strong>
          <p style={{ margin: '0 0 0.75rem', fontSize: '0.85rem', color: 'var(--c-amber, #7a5a1e)' }}>
            To express interest, match with corporate recruiters, and receive direct introduction invitations, set your Tri-Service credentials and logged duties.
          </p>
          <Button size="sm" onClick={() => navigate('/private-sector/profile?returnTo=/private-sector/opportunities')}>
            Build Tri-Service Profile →
          </Button>
        </Card>
      )}

      {/* Main Mode Navigation Tabs */}
      <div className="ps-tabs" role="tablist" aria-label="Opportunity views">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'opportunities'}
          className={`ps-tab ${activeTab === 'opportunities' ? 'active' : ''}`}
          onClick={() => setActiveTab('opportunities')}
        >
          <Building2 size={16} /> <span>Browse Open Roles ({opportunities.length})</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'invitations'}
          className={`ps-tab ${activeTab === 'invitations' ? 'active' : ''}`}
          onClick={() => setActiveTab('invitations')}
        >
          <Bell size={16} /> <span>Direct Employer Invitations</span>
          {pendingInvitationsCount > 0 && (
            <span className="ps-tab-badge">{pendingInvitationsCount} New</span>
          )}
        </button>
      </div>

      {/* VIEW 1: Direct Employer Invitations Tab */}
      {activeTab === 'invitations' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div
            style={{
              background: 'var(--c-bg-1, #f8fafc)',
              border: '1px solid var(--c-line-2, #e2e8f0)',
              borderRadius: '16px',
              padding: '1.25rem',
              display: 'flex',
              gap: '0.85rem',
              alignItems: 'flex-start',
            }}
          >
            <ShieldCheck size={22} color="var(--ios-olive, #4b6b32)" style={{ flexShrink: 0, marginTop: '0.1rem' }} />
            <div style={{ fontSize: '0.85rem', color: 'var(--c-ink-3, #475569)', lineHeight: 1.5 }}>
              <strong style={{ color: 'var(--c-ink-1, #0f172a)' }}>Protected Introduction Workflow:</strong> Employers evaluated your verified trade skills and supervisory experience.
              Your mobile number and email address remain <strong>strictly masked</strong> until you click "Accept Introduction".
            </div>
          </div>

          {inboundRequests.length === 0 ? (
            <Card padding="lg" className="ps-card" style={{ textAlign: 'center', color: 'var(--c-ink-4, #64748b)', padding: '3.5rem 1.5rem' }}>
              <Bell size={36} color="#94a3b8" style={{ margin: '0 auto 0.75rem', opacity: 0.4 }} />
              <h3 style={{ margin: '0 0 0.35rem', color: 'var(--c-ink-1, #0f172a)', fontSize: '1.1rem' }}>No Inbound Employer Requests Yet</h3>
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
                <Card key={req.id} padding="lg" className="ps-card" style={{ border: isPending ? '1.5px solid #d7e6d0' : '1px solid var(--c-line-2, #e2e8f0)', background: isPending ? '#fbfdf9' : 'var(--c-bg-0, white)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                    <div style={{ minWidth: 0, flex: '1 1 0' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.4rem' }}>
                        <span style={{ fontSize: '0.76rem', background: 'var(--c-tint-green, #eef4ea)', color: 'var(--c-green, #2d5a27)', padding: '0.2rem 0.55rem', borderRadius: '4px', fontWeight: 800 }}>
                          Direct Corporate Invitation
                        </span>
                        {req.fit_score && (
                          <span style={{ fontSize: '0.76rem', background: 'rgba(75,107,50,0.12)', color: 'var(--ios-olive, #4b6b32)', padding: '0.2rem 0.55rem', borderRadius: '4px', fontWeight: 800 }}>
                            {req.fit_score}% Capability Match
                          </span>
                        )}
                        <span style={{ fontSize: '0.75rem', color: 'var(--c-ink-4, #64748b)' }}>
                          Received on {new Date(req.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                      </div>

                      <h3 className="ps-card-title" style={{ margin: '0 0 0.35rem', fontSize: '1.25rem', fontWeight: 850, color: 'var(--c-ink-1, #0f172a)' }}>
                        {(job.role_titles || []).join(' / ') || 'Position'}
                      </h3>

                      <p style={{ margin: 0, fontSize: '0.92rem', color: 'var(--c-ink-2, #334155)', fontWeight: 700 }}>
                        {employer.company_name || 'Corporate Hiring Partner'} {employer.industry ? `• ${employer.industry}` : ''}
                      </p>

                      <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap', fontSize: '0.85rem', color: 'var(--c-ink-4, #64748b)', marginTop: '0.65rem' }}>
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
                        <p style={{ margin: '0.75rem 0 0', fontSize: '0.88rem', color: 'var(--c-ink-3, #475569)', lineHeight: 1.45 }}>
                          {job.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Decision status bar */}
                  <div className="ps-decision" style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--c-line-2, #e2e8f0)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                    {isPending ? (
                      <>
                        <div style={{ fontSize: '0.82rem', color: 'var(--c-ink-4, #64748b)', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                          <Lock size={13} /> Your phone & email remain private until you accept.
                        </div>
                        <div className="ps-decision-actions" style={{ display: 'flex', gap: '0.65rem' }}>
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
                            style={{ borderColor: 'var(--c-line-3, #cbd5e1)', color: 'var(--c-ink-4, #64748b)' }}
                          >
                            Decline
                          </Button>
                        </div>
                      </>
                    ) : isAccepted ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--c-green, #15803d)', fontSize: '0.88rem', fontWeight: 700 }}>
                        <CheckCircle2 size={18} /> Introduction Accepted — {employer.company_name || 'The employer'} has received your profile and will contact you directly.
                      </div>
                    ) : (
                      <div style={{ color: 'var(--c-ink-4, #64748b)', fontSize: '0.85rem' }}>
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
          {/* Sector Filter Bar — swipeable on narrow screens; the selected chip is kept in view */}
          <div className="ps-chips" role="group" aria-label="Sectors">
            <div className="ps-chips-inner">
              {['All', ...SECTOR_OPTIONS].map((sec) => {
                const isSelected = selectedSector === sec;
                return (
                  <button
                    key={sec}
                    type="button"
                    className={`ps-chip ${isSelected ? 'selected' : ''}`}
                    aria-pressed={isSelected}
                    onClick={() => setSelectedSector(sec)}
                  >
                    {sec}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Search and Tag filter controls */}
          <div className="ps-controls">
            <div style={{ position: 'relative' }}>
              <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '0.9rem', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text"
                className="vx-search-input"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by role, sector, tags, or location…"
                aria-label="Search opportunities"
                style={{
                  width: '100%',
                  padding: '0.7rem 1rem 0.7rem 2.4rem',
                  borderRadius: '10px',
                  border: '1px solid var(--c-line-3, #cbd5e1)',
                  fontSize: '0.88rem',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Desktop: tag chips inline. */}
            <div className="ps-tags-inline">{renderTagFilter()}</div>

            <div className="ps-toolbar">
              {allJobTags.length > 0 && (
                <button
                  type="button"
                  ref={filtersBtnRef}
                  className="ps-filters-btn"
                  onClick={() => setSheetOpen(true)}
                  aria-expanded={sheetOpen}
                  aria-controls="ps-filter-sheet"
                >
                  <SlidersHorizontal size={16} /> Filters
                  {selectedTag && <span className="ps-count" aria-label="1 filter applied">1</span>}
                </button>
              )}
              <label className="ps-sort">
                <ArrowUpDown size={15} aria-hidden="true" />
                <span className="ps-sort-label">Sort:</span>
                <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} aria-label="Sort opportunities">
                  <option value="relevance">Relevance</option>
                  <option value="newest">Newest</option>
                  <option value="positions">Most positions</option>
                </select>
              </label>
            </div>

            <div className="ps-results-row">
              <span>Showing {sortedOpportunities.length} {sortedOpportunities.length === 1 ? 'opportunity' : 'opportunities'}</span>
              {filtersApplied && (
                <button type="button" className="ps-clear" onClick={clearAllFilters}>Clear filters</button>
              )}
            </div>
          </div>

          {/* Tablets / phones: the tag filter lives in a sheet */}
          {sheetOpen && <div className="ps-sheet-backdrop" onClick={() => setSheetOpen(false)} />}
          {sheetOpen && (
            <div
              id="ps-filter-sheet"
              ref={sheetRef}
              className="ps-sheet"
              role="dialog"
              aria-modal="true"
              aria-label="Filter opportunities"
            >
              <div className="ps-sheet-head">
                <h2>Filters</h2>
                <button type="button" className="ps-sheet-close" onClick={() => { setSheetOpen(false); filtersBtnRef.current?.focus(); }} aria-label="Close filters">
                  <X size={18} />
                </button>
              </div>
              <div className="ps-sheet-body">
                {renderTagFilter()}
              </div>
              <div className="ps-sheet-foot">
                <button type="button" className="ps-sheet-reset" onClick={clearAllFilters}>Reset</button>
                <button type="button" className="ps-sheet-apply" onClick={() => setSheetOpen(false)}>
                  Apply Filters ({sortedOpportunities.length})
                </button>
              </div>
            </div>
          )}

          {/* Opportunities List */}
          {filtered.length === 0 ? (
            <Card padding="lg" className="ps-card ps-empty" style={{ textAlign: 'center', color: 'var(--text-secondary, #64748b)', padding: '3rem' }}>
              No opportunities match your current filters. Try changing your sector or clearing search filters.
            </Card>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {sortedOpportunities.map((opp) => {
                const isInterested = interestedIds.has(opp.id);
                const isMatched = checkMatch(opp);

                return (
                  <Card key={opp.id} padding="lg" className="ps-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-start' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.45rem' }}>
                          {opp.sector && (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.25rem',
                                padding: '0.2rem 0.55rem',
                                borderRadius: '4px',
                                background: 'var(--c-tint-blue, #eff6ff)',
                                color: 'var(--c-blue, #1d4ed8)',
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

                        <h3 className="ps-card-title" style={{ margin: '0 0 0.5rem', fontSize: '1.15rem', fontWeight: 800, color: 'var(--c-ink-1, #0f172a)' }}>
                          {(opp.role_titles || []).join(' / ')}
                        </h3>

                        <div className="ps-meta" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', fontSize: '0.85rem', color: 'var(--c-ink-4, #64748b)', marginBottom: '0.75rem' }}>
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
                          <p style={{ margin: '0 0 0.6rem', fontSize: '0.9rem', color: 'var(--c-ink-2, #334155)', lineHeight: 1.5 }}>
                            {opp.description}
                          </p>
                        )}

                        {opp.requirements_text && (
                          <p style={{ margin: '0 0 0.75rem', fontSize: '0.84rem', color: 'var(--c-ink-4, #64748b)' }}>
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
                                  background: 'var(--c-bg-2, #f1f5f9)',
                                  border: '1px solid var(--c-line-2, #e2e8f0)',
                                  borderRadius: '999px',
                                  fontSize: '0.76rem',
                                  fontWeight: 600,
                                  color: 'var(--c-ink-3, #475569)',
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

                    <div className="ps-opp-actions" style={{ display: 'flex', gap: '0.6rem', marginTop: '1.1rem', paddingTop: '1rem', borderTop: '1px solid var(--c-line-2, #e2e8f0)' }}>
                      {dismissingId === opp.id ? (
                        <span style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-secondary, #64748b)' }}>
                          Got it.
                        </span>
                      ) : isInterested ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.88rem', fontWeight: 700, color: 'var(--c-green, #15803d)' }}>
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

      <style dangerouslySetInnerHTML={{ __html: `
        .ps-opps {
          max-width: 920px;
          margin: 0 auto;
          padding: 2rem 1.25rem 3.5rem;
        }
        .ps-opps-head { margin-bottom: 1.5rem; }
        .ps-opps-title {
          font-size: 1.75rem;
          font-weight: 850;
          margin: 0 0 0.35rem;
          color: var(--c-ink-1, #0f172a);
          letter-spacing: -0.02em;
        }
        .ps-opps-sub {
          color: var(--text-secondary, #64748b);
          margin: 0;
          font-size: 0.94rem;
        }

        /* Tabs */
        .ps-tabs {
          display: flex;
          gap: 0.75rem;
          margin-bottom: 1.5rem;
          border-bottom: 1.5px solid var(--c-line-2, #e2e8f0);
          padding-bottom: 0.75rem;
        }
        .ps-tab {
          background: none;
          border: none;
          padding: 0.4rem 0.75rem;
          font-size: 0.95rem;
          font-weight: 800;
          cursor: pointer;
          color: var(--c-ink-4, #64748b);
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
        }
        .ps-tab.active {
          color: var(--ios-olive, #4b6b32);
          border-bottom: 2.5px solid var(--ios-olive, #4b6b32);
        }
        .ps-tab-badge {
          background: #ef4444;
          color: white;
          font-size: 0.7rem;
          font-weight: 800;
          padding: 0.15rem 0.45rem;
          border-radius: 999px;
          white-space: nowrap;
        }

        /* Sector chips */
        .ps-chips {
          margin-bottom: 1rem;
          overflow-x: auto;
          padding-bottom: 0.35rem;
        }
        .ps-chips-inner {
          display: flex;
          gap: 0.45rem;
          min-width: max-content;
        }
        .ps-chip {
          padding: 0.45rem 0.9rem;
          border-radius: 999px;
          border: 1px solid var(--c-line-3, #cbd5e1);
          background: var(--c-bg-0, #ffffff);
          color: var(--c-ink-2, #334155);
          font-size: 0.82rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s ease;
          white-space: nowrap;
        }
        .ps-chip.selected {
          border: 1.5px solid var(--ios-olive, #4b6b32);
          background: var(--ios-olive-fill, var(--ios-olive, #4b6b32));
          color: #ffffff;
        }

        /* Search, tags, toolbar */
        .ps-controls {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          margin-bottom: 1.5rem;
        }
        .ps-tags {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          flex-wrap: wrap;
        }
        .ps-tags-label {
          font-size: 0.8rem;
          font-weight: 700;
          color: var(--c-ink-4, #64748b);
        }
        .ps-tag {
          padding: 0.25rem 0.6rem;
          border-radius: 999px;
          border: 1px solid var(--c-line-2, #e2e8f0);
          background: var(--c-bg-1, #f8fafc);
          color: var(--c-ink-3, #475569);
          font-size: 0.78rem;
          font-weight: 600;
          cursor: pointer;
        }
        .ps-tag.selected {
          border-color: var(--ios-olive, #4b6b32);
          background: rgba(75, 107, 50, 0.1);
          color: var(--ios-olive, #4b6b32);
        }
        .ps-tag-clear {
          border-color: #94a3b8;
          background: var(--c-bg-3, #e2e8f0);
          color: var(--c-ink-2, #334155);
        }
        .ps-toolbar {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 0.6rem;
        }
        .ps-filters-btn {
          display: none;
          align-items: center;
          gap: 0.45rem;
          min-height: 44px;
          padding: 0 1rem;
          border: 1px solid var(--c-line-3, #cbd5e1);
          border-radius: 12px;
          background: var(--c-bg-0, #ffffff);
          color: var(--c-ink-1, #0f172a);
          font-size: 0.92rem;
          font-weight: 700;
          cursor: pointer;
        }
        .ps-count {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 20px;
          height: 20px;
          padding: 0 6px;
          border-radius: 999px;
          background: var(--ios-olive, #4b6b32);
          color: #fff;
          font-size: 0.72rem;
          font-weight: 800;
        }
        .ps-sort {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          min-height: 40px;
          padding: 0 0.7rem;
          border: 1px solid var(--c-line-3, #cbd5e1);
          border-radius: 10px;
          background: var(--c-bg-0, #ffffff);
          color: var(--c-ink-1, #0f172a);
          font-size: 0.85rem;
          font-weight: 700;
        }
        .ps-sort select {
          border: none;
          background: transparent;
          font: inherit;
          font-weight: 600;
          color: var(--c-ink-2, #334155);
          cursor: pointer;
          padding: 4px 0;
          outline: none;
        }
        .ps-sort:focus-within,
        .ps-filters-btn:focus-visible,
        .ps-chip:focus-visible,
        .ps-tag:focus-visible,
        .ps-tab:focus-visible,
        .ps-clear:focus-visible {
          outline: 2px solid var(--ios-olive, #4b6b32);
          outline-offset: 2px;
        }
        .ps-results-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.75rem;
          font-size: 0.85rem;
          color: var(--c-ink-4, #64748b);
          font-weight: 600;
        }
        .ps-clear {
          background: none;
          border: none;
          padding: 0;
          color: var(--ios-olive, #4b6b32);
          font-size: 0.85rem;
          font-weight: 800;
          cursor: pointer;
        }

        /* Filter sheet: only on tablets / phones */
        .ps-sheet,
        .ps-sheet-backdrop {
          display: none;
        }
        .ps-card-title,
        .ps-meta span,
        .ps-card p {
          overflow-wrap: anywhere;
        }

        @media (max-width: 992px) {
          .ps-tags-inline { display: none; }
          .ps-toolbar { justify-content: space-between; }
          .ps-filters-btn { display: inline-flex; }
          .ps-sheet-backdrop {
            display: block;
            position: fixed;
            inset: 0;
            background: rgba(15, 23, 42, 0.5);
            z-index: 1000;
          }
          .ps-sheet {
            display: flex;
            flex-direction: column;
            position: fixed;
            left: 0;
            right: 0;
            bottom: 0;
            max-height: 85dvh;
            z-index: 1001;
            background: var(--surface, #fff);
            border-radius: 18px 18px 0 0;
            box-shadow: 0 -12px 36px rgba(15, 23, 42, 0.22);
            animation: psSheetUp 0.24s ease-out;
          }
          .ps-sheet-head {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 0.9rem 1rem;
            border-bottom: 1px solid var(--c-line-2, #e2e8f0);
          }
          .ps-sheet-head h2 { margin: 0; font-size: 1.1rem; font-weight: 800; color: var(--c-ink-1, #0f172a); }
          .ps-sheet-close {
            width: 44px;
            height: 44px;
            margin: -6px -8px -6px 0;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            background: none;
            border: none;
            color: var(--c-ink-3, #475569);
            cursor: pointer;
          }
          .ps-sheet-body {
            padding: 1rem;
            overflow-y: auto;
            overscroll-behavior: contain;
          }
          .ps-sheet-body .ps-tag {
            min-height: 40px;
            padding: 0.35rem 0.85rem;
            font-size: 0.88rem;
          }
          .ps-sheet-foot {
            display: grid;
            grid-template-columns: 1fr 1.6fr;
            gap: 0.6rem;
            padding: 0.75rem 1rem calc(0.75rem + env(safe-area-inset-bottom, 0px));
            border-top: 1px solid var(--c-line-2, #e2e8f0);
            background: var(--surface, #fff);
          }
          .ps-sheet-foot button {
            min-height: 46px;
            border-radius: 10px;
            font-size: 0.95rem;
            font-weight: 700;
            cursor: pointer;
          }
          .ps-sheet-reset { background: var(--c-bg-0, #ffffff); border: 1px solid var(--c-line-3, #cbd5e1); color: var(--c-ink-2, #334155); }
          .ps-sheet-apply { background: var(--ios-olive, #4b6b32); border: 1px solid var(--ios-olive, #4b6b32); color: #fff; }
          body.ps-sheet-open .chatbot-fab { display: none !important; }
        }
        @keyframes psSheetUp {
          from { transform: translateY(32px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }

        @media (max-width: 767px) {
          .ps-opps { padding: 1rem 14px 2rem; }
          .ps-opps-head { margin-bottom: 1rem; }
          .ps-opps-title { font-size: 1.45rem; line-height: 1.2; }
          .ps-opps-sub { font-size: 0.95rem; line-height: 1.4; }

          /* Two tabs share the row; labels wrap instead of overflowing */
          .ps-tabs { gap: 0; padding-bottom: 0; margin-bottom: 1rem; }
          .ps-tab {
            flex: 1 1 0;
            min-width: 0;
            min-height: 52px;
            justify-content: center;
            text-align: center;
            padding: 0.4rem 0.35rem;
            font-size: 0.85rem;
            line-height: 1.2;
            border-bottom: 2.5px solid transparent;
            margin-bottom: -1.5px;
            flex-wrap: wrap;
            row-gap: 0.15rem;
          }
          .ps-tab.active { border-bottom-color: var(--ios-olive, #4b6b32); }
          .ps-tab svg { flex-shrink: 0; }

          /* Chips bleed to the screen edge and swipe */
          .ps-chips {
            margin: 0 -14px 0.75rem;
            padding: 0 14px 0.35rem;
            scrollbar-width: none;
            -webkit-overflow-scrolling: touch;
          }
          .ps-chips::-webkit-scrollbar { display: none; }
          .ps-chip { min-height: 40px; font-size: 0.88rem; }

          .ps-opps .vx-search-input {
            font-size: 1rem !important; /* 16px: no iOS zoom on focus */
            min-height: 46px;
          }
          .ps-sort { flex: 1; min-height: 44px; border-radius: 12px; justify-content: flex-start; }
          .ps-sort select { flex: 1; min-width: 0; font-size: 1rem; }
          .ps-filters-btn { flex: 0 0 auto; }

          /* Cards */
          .ps-card { padding: 1rem !important; border-radius: 14px !important; }
          .ps-card-title { font-size: 1.05rem !important; line-height: 1.3; }
          .ps-meta { gap: 0.4rem 0.9rem !important; font-size: 0.88rem !important; }
          .ps-card p { font-size: 0.92rem !important; }
          .ps-empty { padding: 2rem 1rem !important; }

          .ps-opp-actions {
            display: grid !important;
            grid-template-columns: 1.3fr 1fr;
            gap: 0.5rem !important;
            align-items: center;
          }
          .ps-opp-actions button {
            min-height: 46px;
            width: 100%;
            font-size: 0.92rem !important;
            justify-content: center;
          }
          .ps-opp-actions > span { grid-column: 1 / -1; }

          /* Invitations: decisions stack full width */
          .ps-decision { flex-direction: column; align-items: stretch !important; }
          .ps-decision-actions { flex-direction: column; }
          .ps-decision-actions button {
            min-height: 48px;
            width: 100%;
            font-size: 0.92rem !important;
            justify-content: center;
            white-space: normal;
            text-align: center;
          }
        }
        @media (max-width: 359px) {
          .ps-opp-actions { grid-template-columns: 1fr; }
          .ps-sort-label { display: none; }
        }
        @media (prefers-reduced-motion: reduce) {
          .ps-sheet { animation: none; }
        }
      `}} />
    </div>
  );
};

export default PrivateSectorOpportunities;
