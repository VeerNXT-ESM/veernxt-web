import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Users, UserPlus, UserCheck, UserX, MessageSquare, 
  Search, Briefcase, Award, ArrowRight, ShieldCheck, Mail, RefreshCw
} from 'lucide-react';

const Network = () => {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [connections, setConnections] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [profiles, setProfiles] = useState({});
  const [actionLoading, setActionLoading] = useState({});

  const loadNetworkData = async () => {
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
        .select('id, full_name, service_branch, trade, raw_profile_data');

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
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNetworkData();
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

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 'calc(100vh - 64px)', background: 'var(--ios-bg)' }}>
        <div className="ios-spinner" style={{ borderLeftColor: 'var(--ios-olive)' }}></div>
      </div>
    );
  }

  return (
    <div style={{ background: 'var(--ios-bg)', minHeight: 'calc(100vh - 64px)', padding: '2rem 1.5rem' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'grid', gridTemplateColumns: '300px 1fr', gap: '2rem' }}>
        
        {/* Left Side: Connection Sidebar Card */}
        <div>
          <div className="ios-card" style={{ padding: '1.5rem', background: 'white', borderRadius: '24px', boxShadow: '0 10px 30px rgba(0,0,0,0.02)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
              <Users size={24} color="var(--ios-olive)" />
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, color: '#0f172a' }}>My Network</h3>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.75rem' }}>
                <span style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: 500 }}>Connections</span>
                <span style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>{connections.length}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.75rem' }}>
                <span style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: 500 }}>Pending Invites</span>
                <span style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>{pendingRequests.length}</span>
              </div>
            </div>

            <div style={{ marginTop: '2rem', padding: '1rem', background: 'rgba(75, 107, 50, 0.05)', borderRadius: '16px' }}>
              <ShieldCheck size={36} color="var(--ios-olive)" style={{ marginBottom: '0.5rem', opacity: 0.8 }} />
              <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 800, color: '#1F3A2E' }}>Verified Security</h4>
              <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.75rem', color: '#64748b', lineHeight: 1.4 }}>
                Connect with verified military veterans, officers, and corporate hiring partners.
              </p>
            </div>
          </div>
        </div>

        {/* Right Side: Connections / Suggestions Area */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {/* Pending Invitations Section */}
          {pendingRequests.length > 0 && (
            <div className="ios-card" style={{ padding: '2rem', background: 'white', borderRadius: '24px', boxShadow: '0 10px 30px rgba(0,0,0,0.02)' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', margin: '0 0 1.5rem 0', textAlign: 'left' }}>
                Pending Invitations ({pendingRequests.length})
              </h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {pendingRequests.map((req) => (
                  <div key={req.connectionId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', border: '1px solid #f1f5f9', borderRadius: '16px', background: '#f8fafc' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'rgba(75,107,50,0.1)', color: 'var(--ios-olive)', display: 'flex', alignItems: 'center', justifyContext: 'center', fontWeight: 800, fontSize: '1rem', justifyContent: 'center' }}>
                        {req.profile.initials}
                      </div>
                      <div style={{ textAlign: 'left' }}>
                        <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>{req.profile.name}</h4>
                        <p style={{ margin: '0.15rem 0 0 0', fontSize: '0.8rem', color: '#64748b' }}>{req.profile.headline}</p>
                      </div>
                    </div>
                    
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button 
                        onClick={() => handleAcceptRequest(req.connectionId, req.userId)} 
                        disabled={actionLoading[req.connectionId]}
                        className="btn-primary ios-pill" 
                        style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', background: 'var(--ios-olive)', color: 'white', cursor: 'pointer', border: 'none' }}
                      >
                        {actionLoading[req.connectionId] ? 'Accepting...' : 'Accept'}
                      </button>
                      <button 
                        onClick={() => handleIgnoreRequest(req.connectionId)} 
                        disabled={actionLoading[req.connectionId]}
                        className="btn-secondary ios-pill" 
                        style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', background: '#f1f5f9', color: '#64748b', cursor: 'pointer', border: 'none' }}
                      >
                        {actionLoading[req.connectionId] ? 'Ignoring...' : 'Ignore'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Active Connections Section */}
          <div className="ios-card" style={{ padding: '2rem', background: 'white', borderRadius: '24px', boxShadow: '0 10px 30px rgba(0,0,0,0.02)' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', margin: '0 0 1.5rem 0', textAlign: 'left' }}>
              My Connections ({connections.length})
            </h3>

            {connections.length === 0 ? (
              <div style={{ padding: '3rem 1rem', textAlign: 'center', color: '#64748b' }}>
                <Mail size={48} color="var(--ios-olive)" style={{ opacity: 0.3, marginBottom: '1rem' }} />
                <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#0f172a' }}>No Connections Yet</h4>
                <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem' }}>Grow your network by sending requests to candidates or corporate partners below.</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1rem' }}>
                {connections.map((conn) => (
                  <div key={conn.connectionId} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '1.5rem 1rem', border: '1px solid #f1f5f9', borderRadius: '20px', background: '#f8fafc', position: 'relative' }}>
                    
                    <button 
                      onClick={() => handleRemoveConnection(conn.connectionId)}
                      style={{ position: 'absolute', top: '10px', right: '10px', background: 'none', border: 'none', color: '#ef4444', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}
                    >
                      Remove
                    </button>

                    <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(75,107,50,0.1)', color: 'var(--ios-olive)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '1.2rem', marginBottom: '0.75rem' }}>
                      {conn.profile.initials}
                    </div>

                    <h4 style={{ margin: '0 0 0.25rem 0', fontSize: '1rem', fontWeight: 700, color: '#0f172a', textAlign: 'center' }}>
                      {conn.profile.name}
                    </h4>

                    <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--ios-olive)', textTransform: 'uppercase', marginBottom: '0.5rem', background: 'rgba(75,107,50,0.08)', padding: '0.2rem 0.6rem', borderRadius: '100px' }}>
                      {conn.profile.role === 'employer' ? 'Recruiter' : 'Veteran'}
                    </span>

                    <p style={{ margin: '0 0 1rem 0', fontSize: '0.8rem', color: '#64748b', textAlign: 'center', minHeight: '38px', lineHeight: 1.3 }}>
                      {conn.profile.headline}
                    </p>

                    <button 
                      onClick={() => navigate('/messaging')}
                      className="btn-primary ios-pill" 
                      style={{ width: '100%', padding: '0.5rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem', border: 'none', background: 'var(--ios-olive)', color: 'white', cursor: 'pointer' }}
                    >
                      <MessageSquare size={14} /> Message
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Sugguestions Section */}
          <div className="ios-card" style={{ padding: '2rem', background: 'white', borderRadius: '24px', boxShadow: '0 10px 30px rgba(0,0,0,0.02)' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', margin: '0 0 1.5rem 0', textAlign: 'left' }}>
              People You May Know
            </h3>

            {suggestions.length === 0 ? (
              <p style={{ color: '#64748b', fontSize: '0.85rem' }}>No new suggestions at this time.</p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1rem' }}>
                {suggestions.map((item) => (
                  <div key={item.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '1.5rem 1rem', border: '1px solid #f1f5f9', borderRadius: '20px', background: 'white', boxShadow: '0 4px 12px rgba(0,0,0,0.01)' }}>
                    <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: 'rgba(75,107,50,0.05)', color: 'var(--ios-olive)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '1.1rem', marginBottom: '0.75rem' }}>
                      {item.initials}
                    </div>

                    <h4 style={{ margin: '0 0 0.25rem 0', fontSize: '0.95rem', fontWeight: 700, color: '#0f172a', textAlign: 'center' }}>
                      {item.name}
                    </h4>

                    <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                      {item.role === 'employer' ? 'Partner Recruiter' : 'Veteran Candidate'}
                    </span>

                    <p style={{ margin: '0 0 1.25rem 0', fontSize: '0.75rem', color: '#64748b', textAlign: 'center', minHeight: '38px', lineHeight: 1.3 }}>
                      {item.headline}
                    </p>

                    <button 
                      onClick={() => handleSendRequest(item.id)}
                      disabled={actionLoading[item.id]}
                      className="btn-secondary ios-pill" 
                      style={{ width: '100%', padding: '0.5rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem', border: '1px solid #cbd5e1', background: 'white', color: '#0f172a', cursor: 'pointer' }}
                    >
                      {actionLoading[item.id] ? (
                        <>
                          <RefreshCw size={14} className="animate-spin" />
                          <span>Connecting...</span>
                        </>
                      ) : (
                        <>
                          <UserPlus size={14} />
                          <span>Connect</span>
                        </>
                      )}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
};

export default Network;
