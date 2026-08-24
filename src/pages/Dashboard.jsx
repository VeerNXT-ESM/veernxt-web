import { useEffect, useState, useRef } from 'react';
import { useNavigate, useLocation, Link, Navigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { ShieldCheck, MapPin, Briefcase, RefreshCw, ChevronDown, ChevronUp, FileText, User, ArrowRight, CheckCircle2, Compass, ListChecks } from 'lucide-react';
import { getProfilingInsights, getTransferableSkills } from '../lib/profilingInsights';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { useExamContent } from '../hooks/useExamContent';
import { resolveSubjectForTitle } from '../lib/thumbnailTaxonomy';

const Dashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEmployer, setIsEmployer] = useState(false);
  const [session, setSession] = useState(null);
  const [showCareerAnalysis, setShowCareerAnalysis] = useState(false);
  const [openedResourceIds, setOpenedResourceIds] = useState(() => new Set());

  // Top exam match — drives the "Your Next Step" module. Computed here
  // (rather than after the onboarding/loading gates further down) because
  // useExamContent below is a hook and can't follow a conditional return.
  const recommendations = profile?.recommendations || [];
  const topExam = recommendations[0] || null;
  const { byCategory: topExamByCategory, loading: topExamContentLoading } = useExamContent(topExam?.exam_name, topExam?.career_track, topExam?.exam_id);

  useEffect(() => {
    if (!session?.user || isEmployer) return;
    let cancelled = false;
    supabase
      .from('point_transactions')
      .select('ref_id')
      .eq('user_id', session.user.id)
      .eq('action_code', 'RESOURCE_OPENED')
      .then(({ data }) => {
        if (cancelled) return;
        setOpenedResourceIds(new Set((data || []).map((o) => o.ref_id).filter(Boolean)));
      });
    return () => { cancelled = true; };
  }, [session, isEmployer]);

  // Edit Profile States
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [editFormData, setEditFormData] = useState({});
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const avatarInputRef = useRef(null);

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      try {
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        setSession(currentSession);

        const metadataRole = currentSession?.user?.user_metadata?.role;
        if (metadataRole === 'candidate') {
          localStorage.removeItem('employer_session');
        }
        const isEmp = metadataRole === 'employer' || (metadataRole !== 'candidate' && !!localStorage.getItem('employer_session'));
        setIsEmployer(isEmp);
        // Employer sessions redirect to /employer/dashboard below (which
        // does its own profile/metrics fetch) — nothing else in this effect
        // is relevant to them.
        if (isEmp) return;

        let data = null;
        if (currentSession && currentSession.user.id !== '00000000-0000-0000-0000-000000000000') {
          const { data: profileData } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('id', currentSession.user.id)
            .maybeSingle();
          data = profileData;
        }

        if (data) {
          setProfile(data);
        } else {
          // No profile row (or no session at all) — AuthGuard should already
          // have kept us from reaching this page in that state, but if that
          // invariant is ever broken, fail safe by sending the user to
          // profiling rather than fabricating a fake "completed" profile
          // (this page previously showed a hardcoded demo profile here,
          // which would have masked a real user never having onboarded).
          navigate('/profiling');
          return;
        }
      } catch (err) {
        console.error('Error fetching profile:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [navigate]);

  const handleRecalculate = () => {
    navigate('/profiling');
  };

  const handleOpenEditModal = () => {
    if (!profile) return;
    let prefStates;
    try {
      prefStates = typeof profile.preferred_states === 'string' ? JSON.parse(profile.preferred_states) : (profile.preferred_states || []);
    } catch {
      prefStates = [];
    }
    let candSkills;
    try {
      const parsed = typeof profile.skills === 'string' ? JSON.parse(profile.skills) : (profile.skills || []);
      candSkills = Array.isArray(parsed) ? parsed : Object.keys(parsed);
    } catch {
      candSkills = [];
    }
    setEditFormData({
      full_name: profile.full_name || '',
      service_branch: profile.service_branch || '',
      rank: profile.rank || '',
      years_of_service: profile.years_of_service || 0,
      education_level: profile.education_level || '',
      preferred_states: prefStates,
      skills: candSkills,
      avatar_url: profile.avatar_url || ''
    });
    setAvatarPreview(profile.avatar_url || null);
    setShowEditProfileModal(true);
  };

  // The account menu's "Edit Profile" action deep-links here with
  // `state: { openEditProfile: true }` instead of duplicating this page's
  // edit modal elsewhere — open it once profile data is available, then
  // clear the nav state via `replace` so it doesn't reopen on re-renders.
  useEffect(() => {
    if (!profile || !location.state?.openEditProfile) return;
    // One-time deep-link consumption, not a hot-path effect — the immediate
    // setState here (opening the modal) is intentional and self-limiting,
    // since the replace navigation below clears the triggering state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    handleOpenEditModal();
    navigate('/dashboard', { replace: true, state: {} });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, location.state]);

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setAvatarUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${session?.user?.id}_${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;
      const { error } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { cacheControl: '3600', overwrite: true });

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      setAvatarPreview(publicUrl);
      setEditFormData(prev => ({ ...prev, avatar_url: publicUrl }));
    } catch (err) {
      console.error("Avatar upload failed:", err);
      alert("Failed to upload avatar: " + err.message);
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const savePayload = {
        ...editFormData,
        preferred_states: JSON.stringify(editFormData.preferred_states),
        skills: JSON.stringify(editFormData.skills),
      };

      const { error } = await supabase
        .from('user_profiles')
        .update(savePayload)
        .eq('id', session.user.id);

      if (error) throw error;

      if (profile?.raw_profile_data) {
        const updatedRawData = {
          ...profile.raw_profile_data,
          fullName: editFormData.full_name,
          serviceBranch: editFormData.service_branch,
          rank: editFormData.rank,
          serviceYears: editFormData.years_of_service,
          educationLevel: editFormData.education_level
        };
        await supabase
          .from('user_profiles')
          .update({ raw_profile_data: updatedRawData })
          .eq('id', session.user.id);
      }

      alert("Profile updated successfully!");
      setShowEditProfileModal(false);
      window.location.reload();
    } catch (err) {
      console.error("Failed to save profile:", err);
      alert("Error saving profile: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const renderEditProfileModal = () => {
    if (!showEditProfileModal) return null;
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(15, 23, 42, 0.6)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 9999,
        padding: '1rem',
        overflowY: 'auto'
      }}>
        <div className="ios-card" style={{
          background: 'white',
          borderRadius: 'var(--radius-lg)',
          width: '100%',
          maxWidth: '550px',
          boxShadow: 'var(--shadow-3)',
          maxHeight: '90vh',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column'
        }}>
          {/* Modal Header */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '1.5rem 1.75rem',
            borderBottom: '1px solid #f1f5f9'
          }}>
            <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>
              Edit Profile Details
            </h3>
            <button 
              onClick={() => setShowEditProfileModal(false)}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '1.5rem',
                fontWeight: 700,
                color: '#64748b',
                cursor: 'pointer'
              }}
            >
              &times;
            </button>
          </div>

          {/* Modal Form Content */}
          <form onSubmit={handleSaveProfile} style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            
            {!isEmployer && (
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 'var(--radius-md)', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                  <ShieldCheck size={18} color="var(--ios-olive)" style={{ marginTop: '2px', flexShrink: 0 }} />
                  <p style={{ margin: 0, fontSize: '0.85rem', color: '#475569', lineHeight: 1.5 }}>
                    Only basic identity details can be updated here. To update your physical standards, career preferences, or service details, you must recalculate your profile.
                  </p>
                </div>
                <Button type="button" variant="secondary" onClick={() => navigate('/profiling')} style={{ width: '100%' }}>
                  Recalculate Full Profile
                </Button>
              </div>
            )}
            
            {/* Avatar Upload block */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', background: '#f8fafc', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid #e2e8f0' }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#cbd5e1', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid var(--ios-olive)', position: 'relative' }}>
                {avatarPreview ? (
                  <img src={avatarPreview} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <User size={30} color="white" />
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', alignItems: 'flex-start' }}>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => avatarInputRef.current?.click()}
                  disabled={avatarUploading}
                  style={{ borderColor: '#cbd5e1', color: '#0f172a' }}
                >
                  {avatarUploading ? 'Uploading...' : 'Upload Profile Picture'}
                </Button>
                <span style={{ fontSize: '0.7rem', color: '#64748b' }}>JPG, PNG or WEBP. Max 2MB.</span>
                <input 
                  type="file"
                  ref={avatarInputRef}
                  onChange={handleAvatarUpload}
                  accept="image/*"
                  style={{ display: 'none' }}
                />
              </div>
            </div>

            {/* Conditional Inputs */}
            <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', textAlign: 'left' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>Full Name</label>
                  <input 
                    type="text"
                    required
                    value={editFormData.full_name || ''}
                    onChange={e => setEditFormData(prev => ({ ...prev, full_name: e.target.value }))}
                    style={{ border: '1px solid #e2e8f0', borderRadius: 'var(--radius-sm)', padding: '0.6rem 0.75rem', fontSize: '0.9rem' }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', textAlign: 'left' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>Service Branch</label>
                  <select 
                    value={editFormData.service_branch || ''}
                    onChange={e => setEditFormData(prev => ({ ...prev, service_branch: e.target.value }))}
                    style={{ border: '1px solid #e2e8f0', borderRadius: 'var(--radius-sm)', padding: '0.6rem 0.75rem', fontSize: '0.9rem', background: 'white' }}
                  >
                    <option value="Indian Army">Indian Army</option>
                    <option value="Indian Navy">Indian Navy</option>
                    <option value="Indian Air Force">Indian Air Force</option>
                  </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', textAlign: 'left' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>Rank</label>
                  <input 
                    type="text"
                    value={editFormData.rank || ''}
                    onChange={e => setEditFormData(prev => ({ ...prev, rank: e.target.value }))}
                    style={{ border: '1px solid #e2e8f0', borderRadius: 'var(--radius-sm)', padding: '0.6rem 0.75rem', fontSize: '0.9rem' }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', textAlign: 'left' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>Years of Service</label>
                  <input 
                    type="number"
                    required
                    min="0"
                    value={editFormData.years_of_service || 0}
                    onChange={e => setEditFormData(prev => ({ ...prev, years_of_service: parseInt(e.target.value) || 0 }))}
                    style={{ border: '1px solid #e2e8f0', borderRadius: 'var(--radius-sm)', padding: '0.6rem 0.75rem', fontSize: '0.9rem' }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', textAlign: 'left' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>Education Level</label>
                  <select 
                    value={editFormData.education_level || ''}
                    onChange={e => setEditFormData(prev => ({ ...prev, education_level: e.target.value }))}
                    style={{ border: '1px solid #e2e8f0', borderRadius: 'var(--radius-sm)', padding: '0.6rem 0.75rem', fontSize: '0.9rem', background: 'white' }}
                  >
                    <option value="Class 10">Class 10</option>
                    <option value="Class 12">Class 12</option>
                    <option value="Graduate">Graduate</option>
                    <option value="Post Graduate">Post Graduate</option>
                  </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', textAlign: 'left' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>Preferred States (comma-separated)</label>
                  <input 
                    type="text"
                    value={Array.isArray(editFormData.preferred_states) ? editFormData.preferred_states.join(', ') : ''}
                    onChange={e => setEditFormData(prev => ({ ...prev, preferred_states: e.target.value.split(',').map(s => s.trim()).filter(Boolean) }))}
                    style={{ border: '1px solid #e2e8f0', borderRadius: 'var(--radius-sm)', padding: '0.6rem 0.75rem', fontSize: '0.9rem' }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', textAlign: 'left' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>Skills (comma-separated)</label>
                  <input 
                    type="text"
                    value={Array.isArray(editFormData.skills) ? editFormData.skills.join(', ') : ''}
                    onChange={e => setEditFormData(prev => ({ ...prev, skills: e.target.value.split(',').map(s => s.trim()).filter(Boolean) }))}
                    style={{ border: '1px solid #e2e8f0', borderRadius: 'var(--radius-sm)', padding: '0.6rem 0.75rem', fontSize: '0.9rem' }}
                  />
                </div>
              </>

            {/* Submit Buttons */}
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1.25rem' }}>
              <Button
                type="submit"
                style={{ flex: 1, padding: '0.75rem', fontSize: '0.95rem' }}
              >
                Save Changes
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setShowEditProfileModal(false)}
                style={{ flex: 1, padding: '0.75rem', borderColor: '#cbd5e1', color: '#0f172a', fontSize: '0.95rem' }}
              >
                Cancel
              </Button>
            </div>

          </form>
        </div>
      </div>
    );
  };


  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: 'var(--ios-bg)' }}>
        <div style={{ textAlign: 'center' }}>
          <RefreshCw className="animate-spin" size={32} color="var(--ios-olive)" />
          <p style={{ marginTop: '1rem', color: 'var(--text-secondary)' }}>Loading your profile...</p>
        </div>
      </div>
    );
  }

  // Employer sessions get their own dedicated pages now (src/pages/
  // EmployerOnboarding.jsx / EmployerDashboard.jsx) — those do their own
  // profile/onboarding-completeness check, so a blind redirect to the
  // dashboard is enough here.
  if (isEmployer) {
    return <Navigate to="/employer/dashboard" replace />;
  }

  // --- CANDIDATE ONBOARDING GATES ---
  if (profile && !profile.profiling_completed) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 'calc(100vh - 64px)', padding: '2rem' }}>
        <div className="ios-card animate-fade-in" style={{ maxWidth: '500px', textAlign: 'center' }}>
          <ShieldCheck size={64} color="var(--ios-olive)" style={{ marginBottom: '1.5rem', opacity: 0.2 }} />
          <h2 style={{ fontSize: '1.5rem' }}>Complete Your Profile</h2>
          <p style={{ marginBottom: '2rem', color: 'var(--text-secondary)' }}>We need a few details to calculate your Veer Score and find the best exam matches for you.</p>
          <Link to="/profiling" className="btn-primary ios-pill" style={{ textDecoration: 'none', display: 'inline-block' }}>Start Profiling</Link>
        </div>
      </div>
    );
  }

  const rawProfile = profile?.raw_profile_data;
  const insights = rawProfile ? getProfilingInsights(rawProfile, { context: 'dashboard' }) : [];
  const careerDirection = insights.find((i) => i.label === 'Career Alignment');
  const topStrengths = insights.filter((i) => i.label !== 'Career Alignment').slice(0, 3);
  const transferableSkills = rawProfile ? getTransferableSkills(rawProfile) : [];
  const examMatchesCount = recommendations.length;
  const careerTracksCount = new Set(recommendations.map((r) => r.career_track).filter(Boolean)).size;

  const topExamResources = Object.values(topExamByCategory || {}).flat();
  const topExamTotal = topExamResources.length;
  const topExamExplored = topExamResources.filter((r) => openedResourceIds.has(r.resource_id)).length;
  const topExamProgress = topExamTotal > 0 ? Math.round((topExamExplored / topExamTotal) * 100) : null;
  const topExamSubjects = (() => {
    const seen = new Map();
    topExamResources.forEach((res) => {
      const subject = resolveSubjectForTitle(res.title);
      if (!seen.has(subject.key)) seen.set(subject.key, subject.label);
    });
    return [...seen.values()];
  })();


  return (
    <div className="dashboard-wrapper">
      <div className="dashboard-content animate-fade-in">
        <div className="welcome-hero animate-fade-in">
          <div className="welcome-profile-row">
            <div className="welcome-avatar">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <User size={38} color="white" />
              )}
            </div>
            <div className="welcome-identity">
              <h1 className="welcome-name">{profile?.full_name || 'Agniveer'}</h1>
              <span className="welcome-status">
                <span className={`welcome-status-dot ${profile?.profiling_completed ? 'ok' : 'pending'}`} />
                {profile?.profiling_completed ? 'Profile Complete' : 'Profile Incomplete'}
              </span>
            </div>

            <div className="welcome-actions">
              <Button
                variant="ghost"
                onClick={handleOpenEditModal}
                style={{ background: 'rgba(255,255,255,0.22)', color: 'white', border: '1px solid rgba(255,255,255,0.4)', backdropFilter: 'blur(6px)', whiteSpace: 'nowrap' }}
              >
                Edit Profile
              </Button>
              {!isEmployer && (
                <Button
                  variant="ghost"
                  onClick={handleRecalculate}
                  disabled={loading}
                  style={{ background: 'rgba(255,255,255,0.12)', color: 'white', border: '1px solid rgba(255,255,255,0.3)', backdropFilter: 'blur(6px)', whiteSpace: 'nowrap' }}
                >
                  {loading ? <RefreshCw className="animate-spin" size={14} /> : <RefreshCw size={14} />}
                  Recalculate Matches
                </Button>
              )}
            </div>
          </div>

          {!isEmployer && (
            <>
              <div className="welcome-stat-row">
                <div className="welcome-stat">
                  <span className="welcome-stat-value">{profile?.veer_score != null ? Math.round(profile.veer_score) : '—'}</span>
                  <span className="welcome-stat-label">Veer Score</span>
                </div>
                <div className="welcome-stat">
                  <span className="welcome-stat-value">{careerTracksCount}</span>
                  <span className="welcome-stat-label">Career Paths</span>
                </div>
                <div className="welcome-stat">
                  <span className="welcome-stat-value">{examMatchesCount}</span>
                  <span className="welcome-stat-label">Exam Matches</span>
                </div>
                <div className="welcome-stat">
                  <span className="welcome-stat-value">{transferableSkills.length}</span>
                  <span className="welcome-stat-label">Skills</span>
                </div>
              </div>
              <button type="button" className="welcome-analysis-toggle" onClick={() => setShowCareerAnalysis((v) => !v)}>
                {showCareerAnalysis ? 'Hide' : 'View'} Career Analysis {showCareerAnalysis ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
            </>
          )}
        </div>

        {/* Longer-form insights — collapsed by default so the dashboard opens
            on decisions, not a wall of text; still one click away. */}
        {!isEmployer && showCareerAnalysis && (
          <div className="dashboard-insights-grid animate-fade-in" style={{ marginBottom: '2rem' }}>
            <Card padding="sm" className="dashboard-insight-card">
              <div className="card-top" style={{ marginBottom: '0.75rem' }}><CheckCircle2 size={18} color="var(--ios-olive)" /><span className="dashboard-card-label" style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--ios-olive)' }}>TOP STRENGTHS</span></div>
              {topStrengths.length > 0 ? (
                <ul className="dashboard-insight-list">
                  {topStrengths.map((s, i) => <li key={i}><strong>{s.label}.</strong> {s.detail}</li>)}
                </ul>
              ) : <p className="card-desc">Strengths will appear here once your profile is loaded.</p>}
            </Card>
            <Card padding="sm" className="dashboard-insight-card">
              <div className="card-top" style={{ marginBottom: '0.75rem' }}><Compass size={18} color="var(--ios-olive)" /><span className="dashboard-card-label" style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--ios-olive)' }}>CAREER DIRECTION</span></div>
              <p className="card-desc">{careerDirection?.detail || 'Set your career preferences during profiling to see your direction here.'}</p>
            </Card>
            <Card padding="sm" className="dashboard-insight-card">
              <div className="card-top" style={{ marginBottom: '0.75rem' }}><ListChecks size={18} color="var(--ios-olive)" /><span className="dashboard-card-label" style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--ios-olive)' }}>TRANSFERABLE SKILLS</span></div>
              <ul className="dashboard-insight-list">
                {transferableSkills.map((s, i) => <li key={i}>{s}</li>)}
              </ul>
            </Card>
          </div>
        )}

        <div className="dashboard-grid">
          {/* Your Next Step — the single highest-priority action, front and
              center. Absent for employers and for anyone with no matches. */}
          {!isEmployer && topExam && (
            <section>
              <div className="section-header-plain"><h2>Your Next Step</h2></div>
              <div className="next-step-card">
                <div className="next-step-top">
                  <div>
                    <span className="next-step-eyebrow">Prepare for</span>
                    <h3>{topExam.exam_name}</h3>
                    {topExam.career_track && <p className="next-step-body"><Briefcase size={13} /> {topExam.career_track}</p>}
                  </div>
                  {topExam.score != null && <span className="exam-match-score">{Math.min(Math.round(topExam.score), 100)}% Match</span>}
                </div>

                {topExamProgress != null ? (
                  <div className="next-step-progress">
                    <div className="score-bar-bg"><div className="score-bar-fill" style={{ width: `${topExamProgress}%` }}></div></div>
                    <span>{topExamProgress}% prepared — {topExamExplored} of {topExamTotal} resources explored</span>
                  </div>
                ) : topExamTotal > 0 && (
                  <p className="card-desc">You have {topExamTotal} resource{topExamTotal === 1 ? '' : 's'} available.</p>
                )}

                {!topExamContentLoading && topExamSubjects.length > 0 && (
                  <div className="next-step-subjects">
                    {topExamSubjects.map((label) => (
                      <span key={label} className="next-step-subject"><CheckCircle2 size={13} color="#16a34a" /> {label}</span>
                    ))}
                  </div>
                )}

                {topExam.exam_id && (
                  <Link to={`/exam/${topExam.exam_id}`} className="btn-primary ios-pill next-step-cta">
                    Continue Preparation <ArrowRight size={16} />
                  </Link>
                )}
              </div>
            </section>
          )}

          {/* Learning Center Section */}
          <section>
            <div className="section-header-plain">
              <h2>Learning Center</h2>
              <p>Your preparation resources</p>
            </div>
            <div className="category-grid">
              {[
                { id: 'study-guides', title: 'Study Guides', icon: 'S10_study_guide.png', desc: 'Guides & précis' },
                { id: 'pyq', title: 'PYQ Center', icon: 'S09_learning_center.png', desc: 'Coming soon' },
                { id: 'quiz', title: 'Quiz Center', icon: 'S11_mock_test.png', desc: 'Coming soon' }
              ].map(cat => (
                <div key={cat.id} className="category-card" onClick={() => navigate('/learning-center')}>
                  <img src={`/veernxt_assets/icons/${cat.icon}`} alt="" />
                  <div className="category-card-content">
                    <h3>{cat.title}</h3>
                    <p>{cat.desc}</p>
                    <span className="nav-card-cta">Explore <ArrowRight size={12} /></span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Top Exam Matches — capped at 3; the full list lives on the
              Learning Center page (Search Results / My Exams) now, so this
              stays a teaser rather than duplicating that whole interface. */}
          <section>
            <div className="section-header-plain">
              <h2>Top Exam Matches</h2>
              <p>Personalised exam recommendations based on your profile</p>
            </div>
            {recommendations.length > 0 ? (
              <>
                <div className="recommendations-list">
                  {recommendations.slice(0, 3).map((rec, idx) => (
                    <Link
                      key={rec.exam_id || idx}
                      to={rec.exam_id ? `/exam/${rec.exam_id}` : '/learning-center'}
                      className="recommendation-item"
                    >
                      <div className="rec-rank">{idx + 1}</div>
                      <div className="rec-info">
                        <h3 style={{ fontSize: '1.05rem', marginBottom: '0.2rem' }}>{rec.exam_name}</h3>
                        <div className="rec-meta">
                          <span><Briefcase size={14} /> {rec.career_track}</span>
                          {rec.state_ut && <span><MapPin size={14} /> {rec.state_ut}</span>}
                        </div>
                      </div>
                      <div className="rec-score-section">
                        <div className="score-bar-bg">
                          <div className="score-bar-fill" style={{ width: `${Math.min(rec.score, 100)}%` }}></div>
                        </div>
                        <span className="score-text">{Math.min(Math.round(rec.score), 100)}% Match</span>
                      </div>
                      <ArrowRight size={16} color="var(--ios-olive)" />
                    </Link>
                  ))}
                </div>
                <Link to="/learning-center" className="view-all-link">View all exam matches <ArrowRight size={14} /></Link>
              </>
            ) : (
              <div className="empty-matches">
                <p>No matches found yet.</p>
                <Link to="/profiling" className="btn-primary ios-pill" style={{ textDecoration: 'none' }}>Update Profile</Link>
              </div>
            )}
          </section>

          {/* My Network Section */}
          <section>
            <div className="section-header-plain">
              <h2>My Network</h2>
              <p>Build connections that help your transition</p>
            </div>
            <div className="category-grid">
              {[
                { id: 'peers', title: 'Peers', icon: 'S30_peer_network.png', desc: 'Fellow transitioning veterans' },
                { id: 'mentors', title: 'Mentorship', icon: 'S26_mentor.png', desc: 'Guidance from veterans' },
                { id: 'recruiters', title: 'Recruiters', icon: 'S29_recruiter.png', desc: 'Direct corporate connections' }
              ].map(cat => (
                <div key={cat.id} className="category-card" onClick={() => navigate('/network')}>
                  <img src={`/veernxt_assets/icons/${cat.icon}`} alt="" />
                  <div className="category-card-content">
                    <h3>{cat.title}</h3>
                    <p>{cat.desc}</p>
                    <span className="nav-card-cta">Explore <ArrowRight size={12} /></span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Financial Guidance Section */}
          <section>
            <div className="section-header-plain">
              <h2>Financial Guidance</h2>
              <p>Schemes, loans, and pension support</p>
            </div>
            <div className="category-grid">
              {[
                { id: 'loans', title: 'Education Loans', icon: 'S32_education_loan.png', desc: 'Low-interest rates' },
                { id: 'seed', title: 'Start-up Funding', icon: 'S35_business_funding.png', desc: 'Seed capital schemes' },
                { id: 'pension', title: 'Pension Guidance', icon: 'S36_financial_readiness.png', desc: 'Maximize your benefits' }
              ].map(cat => (
                <div key={cat.id} className="category-card" onClick={() => navigate('/financial-guidance')}>
                  <img src={`/veernxt_assets/icons/${cat.icon}`} alt="" />
                  <div className="category-card-content">
                    <h3>{cat.title}</h3>
                    <p>{cat.desc}</p>
                    <span className="nav-card-cta">Explore <ArrowRight size={12} /></span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Career Kit */}
          {!isEmployer && (
            <section>
              <div className="section-header-plain"><h2>Career Kit</h2></div>
              <div className="career-kit-card">
                <div className="card-top" style={{ marginBottom: '0.75rem' }}>
                  <FileText size={22} color="var(--ios-olive)" />
                  <span className="font-cta" style={{ fontWeight: '700', fontSize: '0.9rem', color: 'var(--ios-olive)' }}>INDUSTRY-READY CV</span>
                </div>
                <p className="card-desc" style={{ marginBottom: '1.25rem' }}>Your personalised CV is ready. Download it, or update your profile to refresh it.</p>
                <Link to="/cv" className="btn-primary ios-pill" style={{ textDecoration: 'none', display: 'inline-flex', width: 'fit-content' }}>
                  Preview &amp; Download CV
                </Link>
              </div>
            </section>
          )}
        </div>
      </div>

      {renderEditProfileModal()}

      <style dangerouslySetInnerHTML={{ __html: `
        .dashboard-wrapper {
          padding: 3rem 1.5rem;
          max-width: 1100px;
          margin: 0 auto;
        }
        .welcome-hero {
          margin-bottom: 3rem;
          background-image: linear-gradient(rgba(10,30,10,0.7), rgba(10,30,10,0.7)), url("/veernxt_assets/banners/B14_next_chapter.png");
          background-size: cover;
          background-position: center;
          padding: 2rem;
          border-radius: var(--radius-lg);
          position: relative;
          overflow: hidden;
          box-shadow: var(--shadow-3);
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }
        .welcome-profile-row {
          position: relative;
          z-index: 2;
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 1.25rem;
        }
        .welcome-avatar {
          width: 72px;
          height: 72px;
          flex-shrink: 0;
          border-radius: 50%;
          background: rgba(255,255,255,0.15);
          display: flex;
          align-items: center;
          justify-content: center;
          border: 3px solid rgba(255,255,255,0.35);
          overflow: hidden;
          box-shadow: var(--shadow-2);
        }
        .welcome-identity {
          display: flex;
          flex-direction: column;
          gap: 0.4rem;
          min-width: 0;
          margin-right: auto;
        }
        .welcome-name {
          font-size: 1.9rem;
          font-weight: 800;
          letter-spacing: -0.02em;
          color: white;
          margin: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .welcome-status {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          font-size: 0.85rem;
          font-weight: 600;
          color: rgba(255,255,255,0.85);
          width: fit-content;
        }
        .welcome-status-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          flex-shrink: 0;
        }
        .welcome-status-dot.ok {
          background: #8BD17C;
        }
        .welcome-status-dot.pending {
          background: #fbbf24;
        }
        .welcome-actions {
          position: relative;
          z-index: 2;
          display: flex;
          gap: 0.75rem;
          flex-wrap: wrap;
        }
        .welcome-stat-row {
          position: relative;
          z-index: 2;
          display: flex;
          flex-wrap: wrap;
          gap: 1.75rem;
          padding-top: 1.25rem;
          border-top: 1px solid rgba(255,255,255,0.18);
        }
        .welcome-stat {
          display: flex;
          flex-direction: column;
          gap: 0.15rem;
        }
        .welcome-stat-value {
          font-size: 1.9rem;
          font-weight: 800;
          color: #fff;
          line-height: 1;
          letter-spacing: -0.03em;
        }
        .welcome-stat-label {
          font-size: 0.75rem;
          font-weight: 600;
          color: rgba(255,255,255,0.7);
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }
        .welcome-analysis-toggle {
          position: relative;
          z-index: 2;
          align-self: flex-start;
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          background: none;
          border: none;
          padding: 0;
          color: rgba(255,255,255,0.85);
          font-size: 0.82rem;
          font-weight: 700;
          cursor: pointer;
        }
        .welcome-analysis-toggle:hover {
          color: #fff;
          text-decoration: underline;
        }
        .card-illustration {
          position: absolute;
          bottom: -10px;
          right: -10px;
          width: 180px;
          height: 180px;
          object-fit: contain;
          object-position: bottom right;
          opacity: 0.9;
          pointer-events: none;
          z-index: 0;
        }
        .dashboard-grid {
          /* Single-column row stack — simpler and more predictable than a
             multi-column grid (which was leaving cards half-width with an
             empty column beside them at some viewport/zoom combinations). */
          display: flex;
          flex-direction: column;
          gap: 2.5rem;
        }

        /* Compact plain-text section headers, replacing the old cinematic
           image banners on every section — those are reserved for the
           profile header only now (see .welcome-hero). */
        .section-header-plain {
          margin-bottom: 1rem;
        }
        .section-header-plain h2 {
          font-size: 1.15rem;
          font-weight: 700;
          color: var(--ios-text);
          margin: 0 0 0.2rem;
        }
        .section-header-plain p {
          font-size: 0.85rem;
          color: #64748b;
          margin: 0;
        }

        .next-step-card {
          background: var(--ios-card);
          border: 1px solid rgba(0,0,0,0.05);
          border-radius: var(--radius-lg);
          padding: 1.5rem;
          box-shadow: var(--shadow-2);
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        .next-step-top {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 1rem;
          flex-wrap: wrap;
        }
        .next-step-eyebrow {
          display: block;
          font-size: 0.72rem;
          font-weight: 700;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: var(--ios-olive);
          margin-bottom: 0.2rem;
        }
        .next-step-top h3 {
          font-size: 1.3rem;
          font-weight: 800;
          color: var(--ios-text);
          margin: 0;
        }
        .next-step-body {
          display: flex;
          align-items: center;
          gap: 0.35rem;
          color: #64748b;
          font-size: 0.85rem;
          margin: 0.3rem 0 0;
        }
        .next-step-progress {
          display: flex;
          flex-direction: column;
          gap: 0.4rem;
        }
        .next-step-progress span {
          font-size: 0.78rem;
          color: #64748b;
          font-weight: 600;
        }
        .next-step-subjects {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem 1.25rem;
        }
        .next-step-subject {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          font-size: 0.85rem;
          color: var(--ios-text);
          font-weight: 600;
        }
        .next-step-cta {
          align-self: flex-start;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
        }

        .nav-card-cta {
          display: inline-flex;
          align-items: center;
          gap: 0.3rem;
          margin-top: 0.35rem;
          color: var(--ios-olive);
          font-size: 0.78rem;
          font-weight: 700;
        }

        .view-all-link {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          margin-top: 0.85rem;
          color: var(--ios-olive);
          font-size: 0.85rem;
          font-weight: 700;
          text-decoration: none;
        }
        .view-all-link:hover {
          text-decoration: underline;
        }

        .career-kit-card {
          background: var(--ios-card);
          border: 1px solid rgba(0,0,0,0.05);
          border-radius: var(--radius-lg);
          padding: 1.5rem;
          box-shadow: var(--shadow-1);
          display: flex;
          flex-direction: column;
        }

        .category-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 1rem;
        }
        .category-card {
          background: var(--ios-card);
          border-radius: var(--radius-md);
          padding: 1rem;
          display: flex;
          align-items: center;
          gap: 1.25rem;
          transition: transform 0.2s, box-shadow 0.2s;
          cursor: pointer;
          border: 1px solid rgba(0,0,0,0.05);
          box-shadow: var(--shadow-1);
        }
        .category-card:hover {
          transform: translateY(-2px);
          border-color: var(--ios-olive);
          box-shadow: var(--shadow-2);
        }
        .category-card img {
          width: 80px;
          height: 80px;
          object-fit: contain;
          border-radius: var(--radius-sm);
        }
        .category-card-content h3 {
          font-size: 1rem;
          margin-bottom: 0.25rem;
          color: var(--ios-text);
        }
        .category-card-content p {
          font-size: 0.8rem;
          color: #64748b;
          margin: 0;
        }
        
        .card-top {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 1.25rem;
        }
        .score-card .score-display {
          font-size: 5rem;
          font-weight: 800;
          letter-spacing: -0.05em;
          line-height: 1;
          margin-bottom: 1rem;
          color: var(--ios-olive);
        }
        .card-desc {
          color: #777;
          font-size: 0.95rem;
          line-height: 1.5;
        }
        .library-card {
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }
        .offer-card {
          background: linear-gradient(135deg, rgba(75,107,50,0.08) 0%, rgba(75,107,50,0.03) 100%);
          border: 1px dashed var(--ios-olive);
          border-radius: var(--radius-md);
          padding: 1.5rem;
          box-shadow: var(--shadow-1);
        }
        .recommendations-list {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }
        .recommendation-item {
          display: flex;
          align-items: center;
          gap: 1.25rem;
          padding: 1rem;
          background: var(--ios-secondary);
          border-radius: var(--radius-md);
          transition: transform 0.2s;
          text-decoration: none;
          color: inherit;
        }
        .recommendation-item:hover {
          transform: scale(1.01);
        }
        .rec-rank {
          width: 32px;
          height: 32px;
          background: white;
          border-radius: var(--radius-sm);
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          color: var(--ios-olive);
          font-size: 0.9rem;
        }
        .rec-info {
          flex: 1;
        }
        .rec-meta {
          display: flex;
          gap: 1rem;
          font-size: 0.75rem;
          color: #888;
        }
        .rec-meta span {
          display: flex;
          align-items: center;
          gap: 0.25rem;
        }
        .rec-score-section {
          width: 140px;
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
        }
        .score-bar-bg {
          height: 6px;
          background: rgba(0,0,0,0.05);
          border-radius: 3px;
          overflow: hidden;
        }
        .score-bar-fill {
          height: 100%;
          background: var(--ios-olive);
          border-radius: 3px;
        }
        .score-text {
          font-size: 0.7rem;
          font-weight: 700;
          color: var(--ios-olive);
          text-align: right;
        }
        .animate-spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @media (max-width: 850px) {
          .recommendation-item { flex-wrap: wrap; gap: 0.75rem; }
          .rec-score-section { width: 100%; order: 3; }
        }
        @media (max-width: 640px) {
          .welcome-hero {
            padding: 1.5rem;
          }
          .welcome-avatar {
            width: 56px;
            height: 56px;
          }
          .welcome-name {
            font-size: 1.5rem;
          }
          .welcome-stat-row {
            gap: 1.25rem;
          }
          .card-illustration {
            width: 100px;
            height: 100px;
            bottom: -5px;
            right: -5px;
            opacity: 0.7;
          }
        }

        .dashboard-insights-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 1rem;
        }
        @media (max-width: 640px) {
          .dashboard-insights-grid {
            grid-template-columns: 1fr;
          }
        }
        .dashboard-insight-card { display: flex; flex-direction: column; }
        .dashboard-insight-list {
          margin: 0;
          padding-left: 1.1rem;
          font-size: 0.82rem;
          color: #555;
          line-height: 1.5;
          display: flex;
          flex-direction: column;
          gap: 0.4rem;
        }
        .dashboard-insight-list strong { color: var(--ios-text); }
      `}} />
    </div>
  );
};

export default Dashboard;
