import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Link, useNavigate } from 'react-router-dom';
import {
  Users, UserPlus, MessageSquare, Search, Briefcase, Award, ArrowRight,
  ShieldCheck, Mail, RefreshCw, AlertCircle, MoreVertical, Menu, X, Lightbulb
} from 'lucide-react';

const ROLE_STRIP = [
  { icon: Users, title: 'Fellow Veterans', desc: 'Connect with your batchmates and service peers' },
  { icon: Briefcase, title: 'Industry Experts', desc: 'Learn from professionals in your field' },
  { icon: ShieldCheck, title: 'Recruiters', desc: 'Get noticed by top employers' },
  { icon: Award, title: 'Mentors', desc: 'Seek guidance from experienced professionals' },
];

const NETWORKING_TIPS = [
  'Complete your profile',
  'Add your skills and interests',
  'Send a personalized message',
  'Check People You May Know regularly',
  'Be active and build relationships',
];

const scrollToId = (id) => {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

const PersonCard = ({ person, actionLoading, onConnect }) => (
  <div className="person-card">
    <div className="person-avatar">{person.initials}</div>
    <h4 className="person-name">{person.name}</h4>
    <span className="person-role">{person.role === 'employer' ? 'Recruiter' : 'Veteran'}</span>
    <p className="person-headline">{person.headline}</p>
    <button
      type="button"
      className="network-btn-secondary person-connect-btn"
      onClick={() => onConnect(person.id)}
      disabled={actionLoading[person.id]}
    >
      {actionLoading[person.id] ? (
        <><RefreshCw size={14} className="animate-spin" /> Connecting...</>
      ) : (
        <><UserPlus size={14} /> Connect</>
      )}
    </button>
  </div>
);

const ConnectionCard = ({ conn, menuOpen, onToggleMenu, onMessage, onRemove }) => (
  <div className="connection-card">
    <button
      type="button"
      className="connection-menu-btn"
      onClick={(e) => { e.stopPropagation(); onToggleMenu(conn.connectionId); }}
      aria-label={`More options for ${conn.profile.name}`}
    >
      <MoreVertical size={16} />
    </button>
    {menuOpen && (
      <div className="connection-menu">
        <button
          type="button"
          className="connection-menu-remove"
          onClick={() => onRemove(conn.connectionId)}
          aria-label={`Remove connection with ${conn.profile.name}`}
        >
          Remove connection
        </button>
      </div>
    )}
    <div className="person-avatar">{conn.profile.initials}</div>
    <h4 className="person-name">{conn.profile.name}</h4>
    <span className="person-role">{conn.profile.role === 'employer' ? 'Recruiter' : 'Veteran'}</span>
    <p className="person-headline">{conn.profile.headline}</p>
    <button type="button" className="network-btn-primary connection-message-btn" onClick={onMessage}>
      <MessageSquare size={14} /> Message
    </button>
  </div>
);

const Network = () => {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [connections, setConnections] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [profiles, setProfiles] = useState({});
  const [actionLoading, setActionLoading] = useState({});
  const [search, setSearch] = useState('');
  const [navOpen, setNavOpen] = useState(false);
  const [openMenuId, setOpenMenuId] = useState(null);

  const loadNetworkData = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/login');
        return;
      }
      const user = session.user;
      setCurrentUser(user);

      // 1. Fetch all candidate and employer profiles for lookup
      const { data: candProfiles } = await supabase
        .from('user_profiles')
        .select('id, full_name, service_branch, trade, raw_profile_data, veer_score');

      const { data: empProfiles } = await supabase
        .from('employer_profiles')
        .select('id, company_name, contact_name, designation');

      const lookup = {};
      if (candProfiles) {
        candProfiles.forEach(c => {
          lookup[c.id] = {
            id: c.id,
            name: c.full_name || 'Unnamed Candidate',
            headline: `${c.trade || 'Veteran'} • ${c.service_branch || 'Armed Forces'}`,
            role: 'candidate',
            veerScore: c.veer_score,
            initials: (c.full_name || 'C').split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2)
          };
        });
      }
      if (empProfiles) {
        empProfiles.forEach(e => {
          lookup[e.id] = {
            id: e.id,
            name: e.contact_name || 'Unnamed Recruiter',
            headline: `${e.designation || 'Recruiter'} at ${e.company_name || 'Partner'}`,
            role: 'employer',
            initials: (e.contact_name || 'E').split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2)
          };
        });
      }
      setProfiles(lookup);

      // 2. Fetch all connections involving current user
      const { data: connRecords, error: connError } = await supabase
        .from('connections')
        .select('*')
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`);

      if (connError) throw connError;

      const activeConns = [];
      const incomingRequests = [];
      const connectedSet = new Set([user.id]);

      if (connRecords) {
        connRecords.forEach(c => {
          connectedSet.add(c.sender_id);
          connectedSet.add(c.receiver_id);

          if (c.status === 'accepted') {
            const otherId = c.sender_id === user.id ? c.receiver_id : c.sender_id;
            activeConns.push({
              connectionId: c.id,
              userId: otherId,
              profile: lookup[otherId] || { id: otherId, name: 'VeerNXT Member', headline: 'Member', role: 'unknown', initials: 'VM' }
            });
          } else if (c.status === 'pending' && c.receiver_id === user.id) {
            incomingRequests.push({
              connectionId: c.id,
              userId: c.sender_id,
              profile: lookup[c.sender_id] || { id: c.sender_id, name: 'VeerNXT Member', headline: 'Member', role: 'unknown', initials: 'VM' }
            });
          }
        });
      }

      setConnections(activeConns);
      setPendingRequests(incomingRequests);

      // 3. Generate suggestions ("People You May Know")
      const rawSuggestions = [];
      // Add candidates not connected
      if (candProfiles) {
        candProfiles.forEach(c => {
          if (!connectedSet.has(c.id)) {
            rawSuggestions.push(lookup[c.id]);
          }
        });
      }
      // Add employers not connected
      if (empProfiles) {
        empProfiles.forEach(e => {
          if (!connectedSet.has(e.id)) {
            rawSuggestions.push(lookup[e.id]);
          }
        });
      }
      setSuggestions(rawSuggestions);

    } catch (err) {
      console.error("Error loading network data:", err);
      setError("We couldn't load your network right now.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNetworkData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate]);

  const handleSendRequest = async (targetUserId) => {
    setActionLoading(prev => ({ ...prev, [targetUserId]: true }));
    try {
      const { error } = await supabase
        .from('connections')
        .insert({
          sender_id: currentUser.id,
          receiver_id: targetUserId,
          status: 'pending'
        });

      if (error) throw error;

      // Update local state: remove from suggestions or show pending state
      setSuggestions(prev => prev.filter(item => item.id !== targetUserId));
      alert('Connection request sent!');
    } catch (err) {
      console.error('Error sending request:', err);
      alert('Failed to send request: ' + err.message);
    } finally {
      setActionLoading(prev => ({ ...prev, [targetUserId]: false }));
    }
  };

  const handleAcceptRequest = async (connectionId, senderId) => {
    setActionLoading(prev => ({ ...prev, [connectionId]: true }));
    try {
      const { error } = await supabase
        .from('connections')
        .update({ status: 'accepted' })
        .eq('id', connectionId);

      if (error) throw error;

      // Update state
      setPendingRequests(prev => prev.filter(r => r.connectionId !== connectionId));
      setConnections(prev => [
        ...prev,
        {
          connectionId,
          userId: senderId,
          profile: profiles[senderId] || { id: senderId, name: 'Member', headline: 'Member', role: 'unknown', initials: 'VM' }
        }
      ]);
    } catch (err) {
      console.error('Error accepting request:', err);
      alert('Failed to accept request: ' + err.message);
    } finally {
      setActionLoading(prev => ({ ...prev, [connectionId]: false }));
    }
  };

  const handleIgnoreRequest = async (connectionId) => {
    setActionLoading(prev => ({ ...prev, [connectionId]: true }));
    try {
      const { error } = await supabase
        .from('connections')
        .delete()
        .eq('id', connectionId);

      if (error) throw error;

      setPendingRequests(prev => prev.filter(r => r.connectionId !== connectionId));
    } catch (err) {
      console.error('Error ignoring request:', err);
      alert('Failed to ignore request: ' + err.message);
    } finally {
      setActionLoading(prev => ({ ...prev, [connectionId]: false }));
    }
  };

  const handleRemoveConnection = async (connectionId) => {
    setOpenMenuId(null);
    if (!confirm('Are you sure you want to remove this connection?')) return;
    try {
      const { error } = await supabase
        .from('connections')
        .delete()
        .eq('id', connectionId);

      if (error) throw error;

      setConnections(prev => prev.filter(c => c.connectionId !== connectionId));
      loadNetworkData(); // reload suggestions
    } catch (err) {
      console.error('Error removing connection:', err);
      alert('Failed to remove connection: ' + err.message);
    }
  };

  // Close any open connection-card overflow menu on an outside click.
  useEffect(() => {
    if (!openMenuId) return;
    const handler = () => setOpenMenuId(null);
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [openMenuId]);

  const goTo = (path) => {
    setNavOpen(false);
    navigate(path);
  };

  const goToSection = (id) => {
    setNavOpen(false);
    scrollToId(id);
  };

  const filteredSuggestions = suggestions.filter((person) => {
    const query = search.trim().toLowerCase();
    if (!query) return true;
    return (
      person.name?.toLowerCase().includes(query) ||
      person.headline?.toLowerCase().includes(query)
    );
  });

  const myProfile = profiles[currentUser?.id];
  const myName = myProfile?.name || currentUser?.email?.split('@')[0] || 'Member';
  const myInitials = myProfile?.initials || 'ME';
  const myVeerScore = myProfile?.veerScore != null ? Math.round(myProfile.veerScore) : '—';

  return (
    <div className="network-page">
      <section className="network-hero">
        <div className="network-hero-content">
          <span className="network-eyebrow">Network</span>
          <h1 className="network-hero-title">Connect. Collaborate. <span>Grow Together.</span></h1>
          <p className="network-hero-copy">
            Build meaningful professional relationships with fellow veterans, government professionals and industry partners.
          </p>
          <div className="network-search">
            <Search size={18} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, organization, role or keyword..."
            />
            <button type="button" onClick={() => scrollToId('network-suggestions')}>Search</button>
          </div>
        </div>
      </section>

      <div className="network-role-strip">
        {ROLE_STRIP.map(({ icon: Icon, title, desc }) => (
          <div key={title} className="network-role-card">
            <Icon size={20} />
            <div>
              <h4>{title}</h4>
              <p>{desc}</p>
            </div>
          </div>
        ))}
      </div>

      <button type="button" className="network-nav-toggle" onClick={() => setNavOpen(true)}>
        <Menu size={16} /> My Network
      </button>

      {navOpen && <div className="network-nav-backdrop" onClick={() => setNavOpen(false)} />}

      <div className="network-layout">
        <aside className={`network-sidebar ${navOpen ? 'open' : ''}`}>
          <div className="network-sidebar-close-row">
            <button type="button" className="network-nav-close" onClick={() => setNavOpen(false)} aria-label="Close menu">
              <X size={16} />
            </button>
          </div>

          <div className="network-profile-summary">
            <div className="network-profile-avatar">{myInitials}</div>
            <h3>{myName}</h3>
            <Link to="/profiling/results" className="network-link" onClick={() => setNavOpen(false)}>
              View Profile <ArrowRight size={12} />
            </Link>
            <div className="network-profile-stats">
              <div>
                <strong>{myVeerScore}</strong>
                <span>Veer Score</span>
              </div>
              <div>
                <strong>{connections.length}</strong>
                <span>Connections</span>
              </div>
            </div>
          </div>

          <nav className="network-nav">
            <button type="button" className="active" onClick={() => { setNavOpen(false); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>
              My Network
            </button>
            <button type="button" onClick={() => goToSection('network-suggestions')}>Suggested Connections</button>
            <button type="button" onClick={() => goToSection('network-pending')}>
              Pending Invitations {pendingRequests.length > 0 && <span className="network-nav-badge">{pendingRequests.length}</span>}
            </button>
            <button type="button" onClick={() => goToSection('network-suggestions')}>Find People</button>
            <button type="button" onClick={() => goTo('/messaging')}>Messages</button>
          </nav>

          <div className="network-verify-card">
            <ShieldCheck size={28} />
            <h4>Complete Your Profile</h4>
            <p>Build trust and unlock more networking opportunities.</p>
            <Link to="/profiling" className="network-btn-primary" onClick={() => setNavOpen(false)}>
              Get Verified <ArrowRight size={14} />
            </Link>
          </div>
        </aside>

        <main className="network-main">
          {error ? (
            <div className="network-card network-error-state">
              <AlertCircle size={40} />
              <h3>We couldn't load your network</h3>
              <p>Please try again.</p>
              <button type="button" className="network-btn-primary" onClick={loadNetworkData}>
                <RefreshCw size={14} /> Retry
              </button>
            </div>
          ) : loading ? (
            <>
              <div className="network-card network-skeleton-card">
                <div className="network-skeleton-line network-skeleton-line-wide" />
                <div className="network-skeleton-line network-skeleton-line-mid" />
              </div>
              <div className="network-card network-skeleton-card">
                <div className="network-skeleton-line network-skeleton-line-wide" />
                <div className="network-skeleton-line network-skeleton-line-mid" />
                <div className="network-skeleton-line network-skeleton-line-narrow" />
              </div>
            </>
          ) : (
            <>
              {pendingRequests.length > 0 && (
                <div className="network-card" id="network-pending">
                  <h3 className="network-card-title">Pending Invitations ({pendingRequests.length})</h3>
                  <div className="pending-list">
                    {pendingRequests.map((req) => (
                      <div key={req.connectionId} className="pending-row">
                        <div className="pending-row-left">
                          <div className="person-avatar">{req.profile.initials}</div>
                          <div>
                            <h4>{req.profile.name}</h4>
                            <p>{req.profile.headline}</p>
                          </div>
                        </div>
                        <div className="pending-row-actions">
                          <button
                            type="button"
                            className="network-btn-primary"
                            onClick={() => handleAcceptRequest(req.connectionId, req.userId)}
                            disabled={actionLoading[req.connectionId]}
                          >
                            {actionLoading[req.connectionId] ? 'Accepting...' : 'Accept'}
                          </button>
                          <button
                            type="button"
                            className="network-btn-secondary"
                            onClick={() => handleIgnoreRequest(req.connectionId)}
                            disabled={actionLoading[req.connectionId]}
                          >
                            {actionLoading[req.connectionId] ? 'Ignoring...' : 'Ignore'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="network-card" id="network-connections">
                <h3 className="network-card-title">My Connections ({connections.length})</h3>
                {connections.length === 0 ? (
                  <div className="network-empty-state">
                    <Mail size={40} />
                    <h4>No Connections Yet</h4>
                    <p>Build your professional network by connecting with veterans, mentors and corporate partners.</p>
                    <button type="button" className="network-btn-primary" onClick={() => scrollToId('network-suggestions')}>
                      Find People <ArrowRight size={14} />
                    </button>
                  </div>
                ) : (
                  <div className="network-person-grid">
                    {connections.map((conn) => (
                      <ConnectionCard
                        key={conn.connectionId}
                        conn={conn}
                        menuOpen={openMenuId === conn.connectionId}
                        onToggleMenu={(id) => setOpenMenuId(prev => prev === id ? null : id)}
                        onMessage={() => navigate('/messaging')}
                        onRemove={handleRemoveConnection}
                      />
                    ))}
                  </div>
                )}
              </div>

              <div className="network-card" id="network-suggestions">
                <h3 className="network-card-title">People You May Know</h3>
                {filteredSuggestions.length === 0 ? (
                  <p className="network-empty-text">
                    {search.trim() ? 'No matching people found.' : 'No new suggestions at this time.'}
                  </p>
                ) : (
                  <div className="network-person-grid">
                    {filteredSuggestions.map((item) => (
                      <PersonCard key={item.id} person={item} actionLoading={actionLoading} onConnect={handleSendRequest} />
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </main>

        <aside className="network-aside">
          <div className="network-card">
            <h3 className="network-card-title">Network Overview</h3>
            <div className="network-overview-grid">
              <div className="network-overview-stat">
                <strong>{connections.length}</strong>
                <span>Connections</span>
              </div>
              <div className="network-overview-stat">
                <strong>{pendingRequests.length}</strong>
                <span>Pending Invites</span>
              </div>
              <div className="network-overview-stat">
                <strong>—</strong>
                <span>Profile Views</span>
              </div>
              <div className="network-overview-stat">
                <strong>—</strong>
                <span>Messages</span>
              </div>
            </div>
          </div>

          <div className="network-cta-card">
            <h4>A Stronger Network Builds Greater Opportunities.</h4>
            <p>Connect with veterans, industry leaders and recruiters.</p>
            <button type="button" className="network-btn-accent" onClick={() => scrollToId('network-suggestions')}>
              Find People <ArrowRight size={14} />
            </button>
          </div>

          <div className="network-card">
            <h3 className="network-card-title">Quick Actions</h3>
            <div className="network-quick-actions">
              <button type="button" onClick={() => scrollToId('network-suggestions')}>
                <Search size={16} />
                <div>
                  <strong>Find People</strong>
                  <span>Search and connect</span>
                </div>
              </button>
              <button type="button" onClick={() => navigate('/messaging')}>
                <MessageSquare size={16} />
                <div>
                  <strong>Messages</strong>
                  <span>Reach your connections</span>
                </div>
              </button>
            </div>
          </div>

          <div className="network-tips-card">
            <h3><Lightbulb size={16} /> Networking Tips</h3>
            <ul>
              {NETWORKING_TIPS.map((tip) => <li key={tip}>{tip}</li>)}
            </ul>
          </div>
        </aside>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .network-page {
          width: 100%;
          max-width: 1800px;
          margin: 0 auto;
          padding: 2rem clamp(1.25rem, 3vw, 2.5rem);
        }

        /* Hero */
        .network-hero {
          background: linear-gradient(100deg, rgba(10, 33, 23, 0.92) 0%, rgba(16, 43, 32, 0.85) 45%, rgba(84, 115, 58, 0.55) 100%),
            url('/veernxt_assets/banners/B12_my_network.png');
          background-size: cover;
          background-position: center;
          padding: 3rem;
          margin-bottom: 1.25rem;
          box-shadow: var(--shadow-3);
        }
        .network-hero-content {
          max-width: 760px;
        }
        .network-eyebrow {
          display: inline-block;
          font-size: 0.72rem;
          font-weight: 800;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--accent-gold, #fbbf24);
          margin-bottom: 0.75rem;
        }
        .network-hero-title {
          margin: 0 0 0.75rem 0;
          font-size: clamp(1.9rem, 3.6vw, 3rem);
          line-height: 1.08;
          font-weight: 800;
          letter-spacing: -0.02em;
          color: #ffffff;
        }
        .network-hero-title span {
          color: var(--accent-gold, #fbbf24);
        }
        .network-hero-copy {
          margin: 0 0 1.75rem 0;
          font-size: 1rem;
          line-height: 1.55;
          color: rgba(255, 255, 255, 0.82);
          max-width: 560px;
        }
        .network-search {
          max-width: 700px;
          display: grid;
          grid-template-columns: auto minmax(0, 1fr) auto;
          align-items: center;
          gap: 0.5rem;
          background: var(--surface, #fff);
          padding: 0.5rem 0.5rem 0.5rem 0.9rem;
          box-shadow: var(--shadow-3);
        }
        .network-search svg { color: var(--text-secondary); flex-shrink: 0; }
        .network-search input {
          border: none;
          outline: none;
          font: inherit;
          min-width: 0;
          padding: 0.4rem 0;
        }
        .network-search button {
          border: none;
          background: var(--ios-olive);
          color: #fff;
          padding: 0.75rem 1.3rem;
          font-weight: 700;
          font-size: 0.85rem;
          cursor: pointer;
        }
        @media (max-width: 600px) {
          .network-search { grid-template-columns: minmax(0, 1fr) auto; }
        }

        /* Role strip */
        .network-role-strip {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 1rem;
          margin-bottom: 1.25rem;
        }
        .network-role-card {
          display: flex;
          align-items: flex-start;
          gap: 0.75rem;
          background: var(--surface, #fff);
          border: 1px solid var(--border);
          padding: 1rem;
        }
        .network-role-card svg { color: var(--ios-olive); flex-shrink: 0; margin-top: 0.15rem; }
        .network-role-card h4 { margin: 0 0 0.2rem 0; font-size: 0.88rem; font-weight: 750; color: var(--ios-text); }
        .network-role-card p { margin: 0; font-size: 0.76rem; color: var(--text-secondary); line-height: 1.4; }
        @media (max-width: 900px) {
          .network-role-strip { grid-template-columns: repeat(2, 1fr); }
        }
        @media (max-width: 560px) {
          .network-role-strip { grid-template-columns: 1fr; }
        }

        /* Nav toggle (mobile) */
        .network-nav-toggle {
          display: none;
          align-items: center;
          gap: 0.4rem;
          background: var(--surface, #fff);
          border: 1px solid var(--border-strong);
          padding: 0.6rem 1rem;
          font-weight: 700;
          font-size: 0.85rem;
          cursor: pointer;
          margin-bottom: 1rem;
        }
        .network-nav-backdrop {
          display: none;
        }

        /* Layout */
        .network-layout {
          display: grid;
          grid-template-columns: 250px minmax(0, 1fr) 290px;
          gap: 1.25rem;
          align-items: start;
        }

        /* Sidebar */
        .network-sidebar {
          background: var(--surface, #fff);
          border: 1px solid var(--border);
          padding: 1.25rem;
          position: sticky;
          top: 1rem;
        }
        .network-sidebar-close-row { display: none; }
        .network-profile-summary {
          text-align: center;
          padding-bottom: 1.1rem;
          border-bottom: 1px solid var(--border);
          margin-bottom: 0.9rem;
        }
        .network-profile-avatar {
          width: 56px;
          height: 56px;
          margin: 0 auto 0.6rem;
          background: var(--surface-alt);
          color: var(--ios-olive);
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          font-size: 1.1rem;
        }
        .network-profile-summary h3 {
          margin: 0 0 0.3rem 0;
          font-size: 1rem;
          font-weight: 800;
          color: var(--ios-text);
        }
        .network-link {
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
          font-size: 0.78rem;
          font-weight: 700;
          color: var(--ios-olive);
          text-decoration: none;
        }
        .network-profile-stats {
          display: flex;
          justify-content: center;
          gap: 1.5rem;
          margin-top: 0.9rem;
        }
        .network-profile-stats strong { display: block; font-size: 1.1rem; font-weight: 800; color: var(--ios-text); }
        .network-profile-stats span { font-size: 0.7rem; color: var(--text-secondary); font-weight: 600; }
        .network-nav {
          display: flex;
          flex-direction: column;
          gap: 0.15rem;
          margin-bottom: 1.1rem;
        }
        .network-nav button {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.5rem;
          background: none;
          border: none;
          text-align: left;
          padding: 0.55rem 0.6rem;
          font-size: 0.85rem;
          font-weight: 600;
          color: var(--ios-text);
          cursor: pointer;
        }
        .network-nav button:hover { background: var(--surface-alt); }
        .network-nav button.active { background: var(--surface-alt); color: var(--ios-olive); font-weight: 700; }
        .network-nav-badge {
          background: var(--ios-olive);
          color: #fff;
          font-size: 0.68rem;
          font-weight: 800;
          padding: 0.05rem 0.4rem;
        }
        .network-verify-card {
          background: var(--surface-alt);
          border: 1px solid var(--border);
          padding: 1rem;
          text-align: left;
        }
        .network-verify-card svg { color: var(--ios-olive); margin-bottom: 0.4rem; }
        .network-verify-card h4 { margin: 0 0 0.3rem 0; font-size: 0.85rem; font-weight: 800; color: var(--ios-text); }
        .network-verify-card p { margin: 0 0 0.75rem 0; font-size: 0.76rem; color: var(--text-secondary); line-height: 1.4; }

        /* Buttons */
        .network-btn-primary, .network-btn-secondary, .network-btn-accent {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.4rem;
          font-size: 0.82rem;
          font-weight: 700;
          padding: 0.55rem 1rem;
          cursor: pointer;
          text-decoration: none;
        }
        .network-btn-primary { background: var(--ios-olive); color: #fff; border: none; }
        .network-btn-secondary { background: var(--surface, #fff); color: var(--ios-text); border: 1px solid var(--border-strong); }
        .network-btn-accent { background: var(--accent-gold, #fbbf24); color: #1c281f; border: none; }
        .network-btn-primary:disabled, .network-btn-secondary:disabled { opacity: 0.6; cursor: not-allowed; }

        /* Cards */
        .network-card {
          background: var(--surface, #fff);
          border: 1px solid var(--border);
          padding: 1.5rem;
          box-shadow: var(--shadow-1);
          margin-bottom: 1.25rem;
        }
        .network-card:last-child { margin-bottom: 0; }
        .network-card-title {
          margin: 0 0 1.1rem 0;
          font-size: 1.05rem;
          font-weight: 800;
          color: var(--ios-text);
        }

        /* Pending invitations */
        .pending-list { display: flex; flex-direction: column; gap: 0.75rem; }
        .pending-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 0.75rem;
          background: var(--surface-alt);
          border: 1px solid var(--border);
          padding: 0.85rem 1rem;
        }
        .pending-row-left { display: flex; align-items: center; gap: 0.85rem; }
        .pending-row-left h4 { margin: 0; font-size: 0.9rem; font-weight: 700; color: var(--ios-text); }
        .pending-row-left p { margin: 0.1rem 0 0 0; font-size: 0.78rem; color: var(--text-secondary); }
        .pending-row-actions { display: flex; gap: 0.5rem; }

        /* Person / connection grid */
        .network-person-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 1rem;
        }
        .person-card, .connection-card {
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          background: var(--surface-alt);
          border: 1px solid var(--border);
          padding: 1.25rem 1rem;
        }
        .person-avatar {
          width: 52px;
          height: 52px;
          background: var(--surface, #fff);
          color: var(--ios-olive);
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          font-size: 1.05rem;
          margin-bottom: 0.65rem;
        }
        .person-name { margin: 0 0 0.25rem 0; font-size: 0.92rem; font-weight: 750; color: var(--ios-text); }
        .person-role {
          font-size: 0.66rem;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.03em;
          color: var(--ios-olive);
          background: var(--surface, #fff);
          padding: 0.15rem 0.5rem;
          margin-bottom: 0.5rem;
        }
        .person-headline { margin: 0 0 1rem 0; font-size: 0.76rem; color: var(--text-secondary); line-height: 1.4; min-height: 2.2em; }
        .person-connect-btn, .connection-message-btn { width: 100%; }
        .connection-menu-btn {
          position: absolute;
          top: 0.5rem;
          right: 0.5rem;
          background: none;
          border: none;
          color: var(--text-secondary);
          cursor: pointer;
          padding: 0.2rem;
        }
        .connection-menu {
          position: absolute;
          top: 2rem;
          right: 0.5rem;
          background: var(--surface, #fff);
          border: 1px solid var(--border-strong);
          box-shadow: var(--shadow-2);
          z-index: 5;
        }
        .connection-menu-remove {
          background: none;
          border: none;
          color: var(--danger);
          font-size: 0.78rem;
          font-weight: 700;
          padding: 0.6rem 1rem;
          cursor: pointer;
          white-space: nowrap;
        }
        @media (max-width: 1200px) {
          .network-person-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        }

        /* Empty / error / skeleton states */
        .network-empty-state, .network-error-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          padding: 2.5rem 1rem;
          color: var(--text-secondary);
        }
        .network-empty-state svg, .network-error-state svg { color: var(--ios-olive); opacity: 0.4; margin-bottom: 0.75rem; }
        .network-error-state svg { color: var(--danger); opacity: 1; }
        .network-empty-state h4, .network-error-state h3 { margin: 0 0 0.3rem 0; color: var(--ios-text); }
        .network-empty-state p, .network-error-state p { margin: 0 0 1rem 0; font-size: 0.85rem; max-width: 360px; }
        .network-empty-text { color: var(--text-secondary); font-size: 0.85rem; margin: 0; }
        .network-skeleton-card { display: flex; flex-direction: column; gap: 0.6rem; }
        .network-skeleton-line {
          height: 12px;
          background: linear-gradient(90deg, var(--surface-alt) 25%, var(--border) 50%, var(--surface-alt) 75%);
          background-size: 200% 100%;
          animation: network-shimmer 1.4s ease-in-out infinite;
        }
        .network-skeleton-line-wide { width: 45%; }
        .network-skeleton-line-mid { width: 30%; }
        .network-skeleton-line-narrow { width: 18%; }
        @keyframes network-shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        .animate-spin { animation: network-spin 1s linear infinite; }
        @keyframes network-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

        /* Right aside */
        .network-overview-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 0.85rem;
        }
        .network-overview-stat {
          background: var(--surface-alt);
          border: 1px solid var(--border);
          padding: 0.75rem;
          text-align: center;
        }
        .network-overview-stat strong { display: block; font-size: 1.3rem; font-weight: 800; color: var(--ios-text); }
        .network-overview-stat span { font-size: 0.7rem; color: var(--text-secondary); font-weight: 600; }
        .network-cta-card {
          background: linear-gradient(135deg, var(--ios-olive) 0%, #14210f 100%);
          color: #fff;
          padding: 1.25rem;
          margin-bottom: 1.25rem;
        }
        .network-cta-card h4 { margin: 0 0 0.5rem 0; font-size: 1rem; font-weight: 800; line-height: 1.3; }
        .network-cta-card p { margin: 0 0 1rem 0; font-size: 0.8rem; color: rgba(255,255,255,0.82); line-height: 1.4; }
        .network-quick-actions { display: flex; flex-direction: column; gap: 0.5rem; }
        .network-quick-actions button {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          background: none;
          border: 1px solid var(--border);
          padding: 0.65rem 0.75rem;
          text-align: left;
          cursor: pointer;
        }
        .network-quick-actions button:hover { background: var(--surface-alt); }
        .network-quick-actions svg { color: var(--ios-olive); flex-shrink: 0; }
        .network-quick-actions strong { display: block; font-size: 0.82rem; color: var(--ios-text); }
        .network-quick-actions span { font-size: 0.72rem; color: var(--text-secondary); }
        .network-tips-card {
          background: #fdf8ec;
          border: 1px solid var(--accent-gold, #fbbf24);
          padding: 1.1rem;
        }
        .network-tips-card h3 {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          margin: 0 0 0.75rem 0;
          font-size: 0.8rem;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.03em;
          color: #92640a;
        }
        .network-tips-card svg { color: #d9a62a; }
        .network-tips-card ul { margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 0.5rem; }
        .network-tips-card li {
          font-size: 0.8rem;
          color: var(--ios-text);
          padding-left: 1.1rem;
          position: relative;
        }
        .network-tips-card li::before {
          content: '✓';
          position: absolute;
          left: 0;
          color: #d9a62a;
          font-weight: 800;
        }

        /* Responsive collapse */
        @media (max-width: 992px) {
          .network-layout {
            grid-template-columns: minmax(0, 1fr);
          }
          .network-nav-toggle { display: inline-flex; }
          .network-sidebar {
            display: none;
          }
          .network-sidebar.open {
            display: block;
            position: fixed;
            top: 107px;
            left: 0;
            bottom: 0;
            width: min(320px, 85vw);
            z-index: 60;
            overflow-y: auto;
          }
          .network-sidebar-close-row { display: flex; justify-content: flex-end; margin-bottom: 0.5rem; }
          .network-nav-close { background: none; border: none; cursor: pointer; color: var(--text-secondary); }
          .network-nav-backdrop {
            display: block;
            position: fixed;
            inset: 0;
            background: rgba(15, 23, 42, 0.45);
            z-index: 55;
          }
          .network-aside { order: 3; }
        }
        @media (max-width: 768px) {
          .network-hero { padding: 2.25rem 1.5rem; }
          .network-person-grid { grid-template-columns: 1fr; }
        }
      `}} />
    </div>
  );
};

export default Network;
