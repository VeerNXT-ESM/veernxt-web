import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Award, Briefcase, MessageSquare, RefreshCw, ShieldCheck, User, Users } from 'lucide-react';
import Button from '../components/ui/Button';
import { hexToRgba } from '../lib/careerTrack';

// Military branch -> tag colour, for the Veteran Talent Spotlight list.
// Deliberately separate from careerTrack.js's CAREER_TRACK_META (that's
// civilian job-sector tags for the Job Board; these are service branches).
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

  return (
    <div className="dashboard-wrapper">
      <div className="dashboard-content animate-fade-in">
        <div className="emp-hero animate-fade-in">
          <div className="emp-hero-row">
            <div className="emp-avatar">
              {profile?.avatar_url ? <img src={profile.avatar_url} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <User size={38} color="white" />}
            </div>
            <div className="emp-identity">
              <span className="emp-eyebrow">Recruiter Portal</span>
              <h1 className="emp-name">{repName}</h1>
              <span className="emp-subtitle">{designation} at <strong>{companyName}</strong></span>
            </div>
            <div className="emp-actions">
              <Link to="/find-candidates" className="btn-secondary ios-pill" style={{ textDecoration: 'none', background: 'white', color: '#1F3A2E', fontWeight: 700, padding: '0.65rem 1.25rem' }}>
                Search Talent
              </Link>
              <Button variant="ghost" onClick={handleOpenEditModal} style={{ background: 'rgba(255,255,255,0.15)', color: 'white', border: '1px solid rgba(255,255,255,0.3)' }}>
                Edit Profile
              </Button>
            </div>
          </div>

          <div className="emp-stat-row">
            <div className="emp-stat">
              <span className="emp-stat-value">{activePostingsCount}</span>
              <span className="emp-stat-label"><Briefcase size={11} /> Active Postings</span>
            </div>
            <div className="emp-stat">
              <span className="emp-stat-value">{shortlistedCount}</span>
              <span className="emp-stat-label"><Users size={11} /> Shortlisted</span>
            </div>
            <div className="emp-stat">
              <span className="emp-stat-value">{activeChatsCount}</span>
              <span className="emp-stat-label"><MessageSquare size={11} /> Active Chats</span>
            </div>
            <div className="emp-stat">
              <Link to="/network" className="emp-stat-value" style={{ color: '#fff', textDecoration: 'none' }}>{connectionsCount}</Link>
              <span className="emp-stat-label"><Users size={11} /> Network</span>
            </div>
            <div className="emp-stat">
              <span className="emp-stat-value" style={{ fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Award size={16} /> Verified</span>
              <span className="emp-stat-label"><ShieldCheck size={11} /> Trust Status</span>
            </div>
          </div>
        </div>

        <div className="ios-card" style={{ padding: '2rem', background: 'white', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-2)', border: '1px solid rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div style={{ textAlign: 'left' }}>
              <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em', margin: 0 }}>Veteran Talent Spotlight</h2>
              <p style={{ color: '#64748b', fontSize: '0.88rem', margin: '0.2rem 0 0' }}>Top transitioning military candidates matching corporate requisites</p>
            </div>
            <Link to="/find-candidates" style={{ color: 'var(--ios-olive)', fontWeight: 700, fontSize: '0.88rem', textDecoration: 'none' }}>View All Candidates →</Link>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
            {candidatesToRender.map((candidate, idx) => (
              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', padding: '1.1rem 1.35rem', borderRadius: 'var(--radius-md)', border: '1px solid #f1f5f9', background: '#f8fafc' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: 'rgba(75, 107, 50, 0.1)', color: 'var(--ios-olive)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.95rem', flexShrink: 0 }}>
                    {candidate.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div style={{ textAlign: 'left' }}>
                    <h4 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>{candidate.name}</h4>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.3rem', flexWrap: 'wrap' }}>
                      <BranchTag branch={candidate.branch} />
                      <span style={{ color: '#64748b', fontSize: '0.78rem' }}>Trade: {candidate.trade}</span>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
                    {candidate.skills.map((skill, sIdx) => (
                      <span key={sIdx} style={{ fontSize: '0.68rem', background: 'white', border: '1px solid #e2e8f0', padding: '0.22rem 0.5rem', borderRadius: 'var(--radius-sm)', color: '#475569', fontWeight: 600 }}>{skill}</span>
                    ))}
                  </div>
                  <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--ios-olive)', minWidth: '80px', textAlign: 'right' }}>{candidate.score}% Match</span>
                  <Button variant="secondary" size="sm" onClick={() => navigate('/find-candidates')} style={{ fontWeight: 700 }}>View Profile</Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {showEditModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(8px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999, padding: '1rem', overflowY: 'auto' }}>
          <div className="ios-card" style={{ background: 'white', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: '550px', boxShadow: 'var(--shadow-3)', maxHeight: '90vh', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.5rem 1.75rem', borderBottom: '1px solid #f1f5f9' }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>Edit Company Profile</h3>
              <button onClick={() => setShowEditModal(false)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', fontWeight: 700, color: '#64748b', cursor: 'pointer' }}>&times;</button>
            </div>

            <form onSubmit={handleSaveProfile} style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', background: '#f8fafc', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid #e2e8f0' }}>
                <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#cbd5e1', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid var(--ios-olive)' }}>
                  {avatarPreview ? <img src={avatarPreview} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <User size={30} color="white" />}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', alignItems: 'flex-start' }}>
                  <Button type="button" variant="secondary" size="sm" onClick={() => avatarInputRef.current?.click()} disabled={avatarUploading} style={{ borderColor: '#cbd5e1', color: '#0f172a' }}>
                    {avatarUploading ? 'Uploading...' : 'Upload Logo'}
                  </Button>
                  <span style={{ fontSize: '0.7rem', color: '#64748b' }}>JPG, PNG or WEBP. Max 2MB.</span>
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
                  <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>{label}</label>
                  <input type={type} required={required} value={editFormData[field] || ''} onChange={(e) => setEditFormData((prev) => ({ ...prev, [field]: e.target.value }))}
                    style={{ border: '1px solid #e2e8f0', borderRadius: 'var(--radius-sm)', padding: '0.6rem 0.75rem', fontSize: '0.9rem' }} />
                </div>
              ))}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', textAlign: 'left' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>Company Description</label>
                <textarea value={editFormData.about || ''} onChange={(e) => setEditFormData((prev) => ({ ...prev, about: e.target.value }))} rows="3"
                  style={{ border: '1px solid #e2e8f0', borderRadius: 'var(--radius-sm)', padding: '0.6rem 0.75rem', fontSize: '0.9rem', fontFamily: 'inherit' }} />
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1.25rem' }}>
                <Button type="submit" style={{ flex: 1, padding: '0.75rem', fontSize: '0.95rem' }}>Save Changes</Button>
                <Button type="button" variant="secondary" onClick={() => setShowEditModal(false)} style={{ flex: 1, padding: '0.75rem', borderColor: '#cbd5e1', color: '#0f172a', fontSize: '0.95rem' }}>Cancel</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        .dashboard-wrapper { padding: 3rem 1.5rem; max-width: 1100px; margin: 0 auto; }
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
      `}} />
    </div>
  );
};

export default EmployerDashboard;
