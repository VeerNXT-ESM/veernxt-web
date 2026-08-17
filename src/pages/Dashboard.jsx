import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import axios from 'axios';
import { supabase } from '../lib/supabase';
import { BookOpen, Award, Target, ExternalLink, ShieldCheck, MapPin, Briefcase, RefreshCw, ChevronDown, ChevronUp, FileText, PlayCircle, Landmark, Users, MessageSquare, User, Lock, Crown, ArrowRight, Gift } from 'lucide-react';
import { getEffectiveTier, canViewVeerScore, canViewRecommendations, canGenerateCV, higherTier, TIERS } from '../lib/subscriptionAccess';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Select from '../components/ui/Select';
import GuidedStep from '../components/ui/GuidedStep';
import { ChoiceGroup } from '../components/ui/ChoiceGroup';
import { getEmployerInsights } from '../lib/employerInsights';
import { useLocalDraft } from '../lib/useLocalDraft';
import { useInlineUnlock } from '../lib/useInlineUnlock';

const PreparationPanel = ({ exam }) => {
  const [resources, setResources] = useState([]);
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPrepData = async () => {
      setLoading(true);
      try {
        let resData = await supabase.from('resources_v2').select('*').eq('exam_name', exam.exam_name).limit(3);
        let quizData = await supabase.from('quizzes').select('*').eq('exam_name', exam.exam_name).limit(3);
        
        // Fallback: If no direct match, fetch generalized prep for this career track
        if ((!resData.data || resData.data.length === 0) && exam.career_track) {
          let fallbackTerm = exam.exam_name.split(' ')[0]; 
          if (exam.career_track === 'POLICE_CAPF') fallbackTerm = 'Constable';
          else if (exam.career_track === 'SSC') fallbackTerm = 'SSC';
          else if (exam.career_track === 'RAILWAYS') fallbackTerm = 'RRB';
          else if (exam.career_track === 'BANKING') fallbackTerm = 'IBPS';
          else if (exam.career_track === 'DEFENCE') fallbackTerm = 'Defence';
          
          resData = await supabase.from('resources_v2').select('*').ilike('exam_name', `%${fallbackTerm}%`).limit(3);
          quizData = await supabase.from('quizzes').select('*').ilike('exam_name', `%${fallbackTerm}%`).limit(3);
        }
        
        setResources(resData.data || []);
        setQuizzes(quizData.data || []);
      } catch (err) {
        console.error('Error fetching prep materials:', err);
      } finally {
        setLoading(false);
      }
    };
    if (exam && exam.exam_name) fetchPrepData();
  }, [exam]);

  if (loading) return <div style={{ padding: '1rem', textAlign: 'center' }}><RefreshCw className="animate-spin" size={20} color="var(--ios-olive)" /></div>;

  if (resources.length === 0 && quizzes.length === 0) {
    return <div style={{ padding: '1rem', textAlign: 'center', color: '#999', fontSize: '0.9rem' }}>No specific preparation materials found for this exam.</div>;
  }

  return (
    <div className="prep-panel animate-fade-in" style={{ padding: '1rem 0', borderTop: '1px solid rgba(0,0,0,0.05)', marginTop: '1rem' }}>
      <h4 style={{ fontSize: '0.85rem', color: 'var(--ios-olive)', marginBottom: '1rem', fontWeight: '800' }}>RECOMMENDED PREPARATION</h4>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <div className="prep-section">
          <h5 style={{ fontSize: '0.75rem', color: '#888', marginBottom: '0.5rem' }}>STUDY GUIDES</h5>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {resources.map(res => (
              <Link key={res.id} to={`/reader/${res.resource_id}`} className="prep-item">
                <FileText size={14} />
                <span>{res.title}</span>
              </Link>
            ))}
          </div>
        </div>
        <div className="prep-section">
          <h5 style={{ fontSize: '0.75rem', color: '#888', marginBottom: '0.5rem' }}>PRACTICE QUIZZES</h5>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {quizzes.map(quiz => (
              <Link key={quiz.id} to={`/quiz/${quiz.id}`} className="prep-item">
                <PlayCircle size={14} />
                <span>{quiz.title}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const Dashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expandedExamId, setExpandedExamId] = useState(null);
  const [isEmployer, setIsEmployer] = useState(false);
  const [session, setSession] = useState(null);
  const [onboardingSubmitLoading, setOnboardingSubmitLoading] = useState(false);

  // Employer guided-onboarding journey
  const [employerFormData, setEmployerFormData] = useState({
    companyName: '', website: '', contactName: '', designation: '', industry: '', location: '', about: '',
    hiringRoles: '', requiredSkills: '', candidatePreferences: '', hiringReadiness: '',
  });
  const [employerStep, setEmployerStep] = useState(0);
  const { hasDraft: employerHasDraft, loadDraft: loadEmployerDraft, saveDraft: saveEmployerDraft, clearDraft: clearEmployerDraft } = useLocalDraft('veernxt_employer_onboarding_draft_v1');
  const [employerDraftPrompt, setEmployerDraftPrompt] = useState(() => (employerHasDraft ? 'pending' : null));
  const [activePostingsCount, setActivePostingsCount] = useState(0);
  const [shortlistedCount, setShortlistedCount] = useState(0);
  const [activeChatsCount, setActiveChatsCount] = useState(0);
  const [spotlightCandidates, setSpotlightCandidates] = useState([]);
  const [connectionsCount, setConnectionsCount] = useState(0);
  const [effectiveTier, setEffectiveTier] = useState(TIERS.FREE);
  // Set right after a successful in-place purchase (see handleUnlockScore/
  // handleAddCv below) so VeerScore/matches/CV unlock instantly without a
  // reload — merged with the server-fetched tier via higherTier().
  const [localTierOverride, setLocalTierOverride] = useState(null);

  // Edit Profile States
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [editFormData, setEditFormData] = useState({});
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const avatarInputRef = useRef(null);

  const { purchase, statusFor, errorFor } = useInlineUnlock({
    userId: session?.user?.id,
    email: session?.user?.email,
    mobile: session?.user?.user_metadata?.mobile,
    fullName: profile?.full_name,
  });

  const handleUnlockScore = async () => {
    const { ok, tier: newTier } = await purchase('SCORE_UNLOCK');
    if (ok) setLocalTierOverride((prev) => higherTier(prev, newTier));
  };

  const handleAddCv = async () => {
    const { ok, tier: newTier } = await purchase('CV_ADDON');
    if (ok) setLocalTierOverride((prev) => higherTier(prev, newTier));
  };

  useEffect(() => {
    if (employerDraftPrompt === 'pending') return;
    saveEmployerDraft({ formData: employerFormData, step: employerStep });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employerFormData, employerStep, employerDraftPrompt]);

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      try {
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        setSession(currentSession);

        if (currentSession) {
          try {
            const { count: cCount } = await supabase
              .from('connections')
              .select('*', { count: 'exact', head: true })
              .eq('status', 'accepted')
              .or(`sender_id.eq.${currentSession.user.id},receiver_id.eq.${currentSession.user.id}`);
            setConnectionsCount(cCount || 0);
          } catch (e) {
            console.warn("Could not query connections count:", e);
          }
        }

        const metadataRole = currentSession?.user?.user_metadata?.role;
        if (metadataRole === 'candidate') {
          localStorage.removeItem('employer_session');
        }
        const isEmp = metadataRole === 'employer' || (metadataRole !== 'candidate' && !!localStorage.getItem('employer_session'));
        setIsEmployer(isEmp);

        let data = null;
        if (currentSession && currentSession.user.id !== '00000000-0000-0000-0000-000000000000') {
          const tableName = isEmp ? 'employer_profiles' : 'user_profiles';
          const { data: profileData } = await supabase
            .from(tableName)
            .select('*')
            .eq('id', currentSession.user.id)
            .maybeSingle();
          data = profileData;
        }

        if (data) {
          setProfile(data);
          // Compute effective subscription tier
          if (!isEmp) {
            const tier = getEffectiveTier(data.subscription_tier, data.subscription_expires_at);
            setEffectiveTier(tier);
          }
        } else if (!isEmp) {
          // No profile row (or no session at all) — AuthGuard should already
          // have kept us from reaching this page in that state, but if that
          // invariant is ever broken, fail safe by sending the user to
          // profiling rather than fabricating a fake "completed" profile
          // (this page previously showed a hardcoded demo profile here,
          // which would have masked a real user never having onboarded).
          navigate('/profiling');
          return;
        }

        // Fetch employer metrics dynamically
        if (isEmp && currentSession) {
          try {
            const { count: jCount } = await supabase
              .from('jobs')
              .select('*', { count: 'exact', head: true });
            setActivePostingsCount(jCount || 0);
          } catch (e) {
            console.warn("Could not query jobs count:", e);
          }

          try {
            const { data: sentMsgs } = await supabase
              .from('chat_messages')
              .select('receiver_id')
              .eq('sender_id', currentSession.user.id);
            const uniqueReceivers = new Set((sentMsgs || []).map(m => m.receiver_id).filter(Boolean));
            setShortlistedCount(uniqueReceivers.size);
          } catch (e) {
            console.warn("Could not query shortlisted count:", e);
          }

          try {
            const { data: allMsgs } = await supabase
              .from('chat_messages')
              .select('sender_id, receiver_id')
              .or(`sender_id.eq.${currentSession.user.id},receiver_id.eq.${currentSession.user.id}`);
            const activeChatCandidates = new Set();
            (allMsgs || []).forEach(m => {
              if (m.sender_id !== currentSession.user.id) activeChatCandidates.add(m.sender_id);
              if (m.receiver_id !== currentSession.user.id) activeChatCandidates.add(m.receiver_id);
            });
            setActiveChatsCount(activeChatCandidates.size);
          } catch (e) {
            console.warn("Could not query active chats count:", e);
          }

          try {
            const { data: topCandidates } = await supabase
              .from('user_profiles')
              .select('*')
              .eq('profiling_completed', true)
              .order('veer_score', { ascending: false })
              .limit(3);
            
            if (topCandidates && topCandidates.length > 0) {
              const mappedSpotlight = topCandidates.map(c => {
                let parsedSkills = [];
                try {
                  parsedSkills = typeof c.skills === 'string' ? JSON.parse(c.skills) : (c.skills || []);
                } catch (err) {
                  parsedSkills = [];
                }
                const rawData = c.raw_profile_data || {};
                return {
                  name: c.full_name || 'Unnamed Candidate',
                  branch: c.service_branch || 'Indian Army',
                  score: c.veer_score || 0,
                  trade: c.trade || rawData.armCorpsTrade || 'General Service',
                  skills: parsedSkills.slice(0, 3)
                };
              });
              setSpotlightCandidates(mappedSpotlight);
            }
          } catch (e) {
            console.warn("Could not query top candidates for spotlight:", e);
          }
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
    if (isEmployer) {
      setEditFormData({
        contact_name: profile.contact_name || '',
        company_name: profile.company_name || '',
        website: profile.website || '',
        location: profile.location || '',
        designation: profile.designation || '',
        about: profile.about || '',
        avatar_url: profile.avatar_url || ''
      });
    } else {
      let prefStates = [];
      try {
        prefStates = typeof profile.preferred_states === 'string' ? JSON.parse(profile.preferred_states) : (profile.preferred_states || []);
      } catch (e) {
        prefStates = [];
      }
      let candSkills = [];
      try {
        const parsed = typeof profile.skills === 'string' ? JSON.parse(profile.skills) : (profile.skills || []);
        candSkills = Array.isArray(parsed) ? parsed : Object.keys(parsed);
      } catch (e) {
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
    }
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
      const { data, error } = await supabase.storage
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
      const tableName = isEmployer ? 'employer_profiles' : 'user_profiles';
      
      const savePayload = { ...editFormData };
      if (!isEmployer) {
        savePayload.preferred_states = JSON.stringify(savePayload.preferred_states);
        savePayload.skills = JSON.stringify(savePayload.skills);
      }

      const { error } = await supabase
        .from(tableName)
        .update(savePayload)
        .eq('id', session.user.id);

      if (error) throw error;

      if (!isEmployer && profile?.raw_profile_data) {
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
            {isEmployer ? (
              <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', textAlign: 'left' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>Contact Name</label>
                  <input 
                    type="text"
                    required
                    value={editFormData.contact_name || ''}
                    onChange={e => setEditFormData(prev => ({ ...prev, contact_name: e.target.value }))}
                    style={{ border: '1px solid #e2e8f0', borderRadius: 'var(--radius-sm)', padding: '0.6rem 0.75rem', fontSize: '0.9rem' }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', textAlign: 'left' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>Company Name</label>
                  <input 
                    type="text"
                    required
                    value={editFormData.company_name || ''}
                    onChange={e => setEditFormData(prev => ({ ...prev, company_name: e.target.value }))}
                    style={{ border: '1px solid #e2e8f0', borderRadius: 'var(--radius-sm)', padding: '0.6rem 0.75rem', fontSize: '0.9rem' }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', textAlign: 'left' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>Website</label>
                  <input 
                    type="url"
                    value={editFormData.website || ''}
                    onChange={e => setEditFormData(prev => ({ ...prev, website: e.target.value }))}
                    style={{ border: '1px solid #e2e8f0', borderRadius: 'var(--radius-sm)', padding: '0.6rem 0.75rem', fontSize: '0.9rem' }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', textAlign: 'left' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>Designation</label>
                  <input 
                    type="text"
                    value={editFormData.designation || ''}
                    onChange={e => setEditFormData(prev => ({ ...prev, designation: e.target.value }))}
                    style={{ border: '1px solid #e2e8f0', borderRadius: 'var(--radius-sm)', padding: '0.6rem 0.75rem', fontSize: '0.9rem' }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', textAlign: 'left' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>Location</label>
                  <input 
                    type="text"
                    value={editFormData.location || ''}
                    onChange={e => setEditFormData(prev => ({ ...prev, location: e.target.value }))}
                    style={{ border: '1px solid #e2e8f0', borderRadius: 'var(--radius-sm)', padding: '0.6rem 0.75rem', fontSize: '0.9rem' }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', textAlign: 'left' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>Company Description</label>
                  <textarea 
                    value={editFormData.about || ''}
                    onChange={e => setEditFormData(prev => ({ ...prev, about: e.target.value }))}
                    rows="3"
                    style={{ border: '1px solid #e2e8f0', borderRadius: 'var(--radius-sm)', padding: '0.6rem 0.75rem', fontSize: '0.9rem', fontFamily: 'inherit' }}
                  />
                </div>
              </>
            ) : (
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
            )}

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

  const handleEmployerOnboardingSubmit = async () => {
    setOnboardingSubmitLoading(true);
    const d = employerFormData;

    try {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      if (!currentSession) {
        alert('Your session has expired. Please sign in again.');
        navigate('/login');
        return;
      }

      const { error: dbError } = await supabase
        .from('employer_profiles')
        .upsert({
          id: currentSession.user.id,
          company_name: d.companyName,
          website: d.website,
          contact_name: d.contactName,
          designation: d.designation,
          industry: d.industry,
          location: d.location,
          about: d.about,
          updated_at: new Date().toISOString()
        });

      if (dbError) throw dbError;

      // hiring_profile is a newer, additive column (sql/employer_hiring_profile.sql)
      // written as its own request so a database that hasn't run that migration
      // yet still completes onboarding on the 7 core fields above — same
      // defensive pattern as this app's points_balance fallback elsewhere.
      const { error: hiringProfileError } = await supabase
        .from('employer_profiles')
        .update({
          hiring_profile: {
            hiringRoles: d.hiringRoles,
            requiredSkills: d.requiredSkills,
            candidatePreferences: d.candidatePreferences,
            hiringReadiness: d.hiringReadiness,
          },
        })
        .eq('id', currentSession.user.id);
      if (hiringProfileError) {
        console.warn('hiring_profile column not available yet — run sql/employer_hiring_profile.sql in Supabase.', hiringProfileError);
      }

      clearEmployerDraft();

      // Update local state to trigger render
      setProfile({
        id: currentSession.user.id,
        company_name: d.companyName,
        website: d.website,
        contact_name: d.contactName,
        designation: d.designation,
        industry: d.industry,
        location: d.location,
        about: d.about
      });
    } catch (err) {
      console.error('Error during employer onboarding upsert:', err);
      alert('Failed to save profile: ' + err.message);
    } finally {
      setOnboardingSubmitLoading(false);
    }
  };

  const setEmployerField = (name, value) => setEmployerFormData(prev => ({ ...prev, [name]: value }));

  const EMPLOYER_STAGES = [
    { id: 'company', label: 'Company' },
    { id: 'hiring', label: 'Hiring Needs' },
    { id: 'review', label: 'Review' },
  ];
  const EMPLOYER_QUESTION_STAGE = [
    'company', 'company', 'company', 'company', 'company', 'company', 'company',
    'hiring', 'hiring', 'hiring', 'hiring',
    'review',
  ];
  const EMPLOYER_TOTAL_STEPS = EMPLOYER_QUESTION_STAGE.length;
  const EMPLOYER_TITLES = [
    "What's your company called?",
    "What's your company website?",
    "Who's the point of contact?",
    "What's their designation?",
    'Which industry are you in?',
    "Where's your head office?",
    'Tell us about your hiring goals',
    "Which roles are you hiring for right now?",
    'What skills or trade backgrounds matter most?',
    'Any candidate preferences?',
    'How soon are you looking to hire?',
    'Review and confirm',
  ];
  const EMPLOYER_HELP = [
    undefined,
    "We'll link to this from your public listings.",
    'The primary recruiter or hiring manager on this account.',
    undefined,
    'This helps us prioritise which veteran trade backgrounds we surface to you first.',
    undefined,
    'A short overview candidates will see on your listings.',
    'e.g. "Security Supervisor, Logistics Coordinator, IT Support" — free text is fine.',
    'Optional — specific certifications, trade backgrounds, or experience level.',
    'Optional — preferred service branch, rank range, or years of experience.',
    "We'll pace candidate introductions to match your timeline.",
    'Take one last look before we save your hiring profile.',
  ];

  const validateEmployerQuestion = (step) => {
    const d = employerFormData;
    switch (step) {
      case 0: return !!d.companyName;
      case 1: return !!d.website;
      case 2: return !!d.contactName;
      case 3: return !!d.designation;
      case 4: return !!d.industry;
      case 5: return !!d.location;
      case 6: return !!d.about;
      case 7: return !!d.hiringRoles;
      case 8: return true;
      case 9: return true;
      case 10: return !!d.hiringReadiness;
      default: return true;
    }
  };

  const goEmployerNext = () => {
    if (!validateEmployerQuestion(employerStep)) return;
    if (employerStep === EMPLOYER_TOTAL_STEPS - 1) {
      handleEmployerOnboardingSubmit();
      return;
    }
    setEmployerStep(s => s + 1);
    window.scrollTo(0, 0);
  };

  const goEmployerBack = () => {
    if (employerStep === 0) return;
    setEmployerStep(s => s - 1);
    window.scrollTo(0, 0);
  };

  const renderEmployerQuestion = () => {
    const d = employerFormData;
    switch (employerStep) {
      case 0:
        return <input className="vx-field" type="text" value={d.companyName} onChange={e => setEmployerField('companyName', e.target.value)} placeholder="e.g. Tata Motors" autoComplete="organization" autoFocus />;
      case 1:
        return <input className="vx-field" type="url" value={d.website} onChange={e => setEmployerField('website', e.target.value)} placeholder="https://yourcompany.com" autoComplete="url" />;
      case 2:
        return <input className="vx-field" type="text" value={d.contactName} onChange={e => setEmployerField('contactName', e.target.value)} placeholder="e.g. Vikram Sharma" autoComplete="name" />;
      case 3:
        return <input className="vx-field" type="text" value={d.designation} onChange={e => setEmployerField('designation', e.target.value)} placeholder="e.g. Head of Talent Acquisition" />;
      case 4:
        return (
          <Select searchable value={d.industry} onChange={e => setEmployerField('industry', e.target.value)} placeholder="Select or search an industry…"
            options={['IT & Software', 'Security Services', 'Aerospace & Defence', 'Logistics & Supply Chain', 'Manufacturing', 'Finance & Banking', 'Retail & E-commerce', 'Other'].map(i => ({ value: i, label: i }))} />
        );
      case 5:
        return <input className="vx-field" type="text" value={d.location} onChange={e => setEmployerField('location', e.target.value)} placeholder="e.g. Gurugram, India" autoComplete="address-level2" />;
      case 6:
        return <textarea className="vx-field" rows={4} value={d.about} onChange={e => setEmployerField('about', e.target.value)} placeholder="Tell us about the roles you are hiring for and how military talent fits into your team..." />;
      case 7:
        return <input className="vx-field" type="text" value={d.hiringRoles} onChange={e => setEmployerField('hiringRoles', e.target.value)} placeholder="e.g. Security Supervisor, Logistics Coordinator, IT Support" />;
      case 8:
        return <input className="vx-field" type="text" value={d.requiredSkills} onChange={e => setEmployerField('requiredSkills', e.target.value)} placeholder="e.g. Convoy operations, warehouse management, network security" />;
      case 9:
        return <input className="vx-field" type="text" value={d.candidatePreferences} onChange={e => setEmployerField('candidatePreferences', e.target.value)} placeholder="e.g. JCOs with 5+ years, Indian Army preferred" />;
      case 10:
        return (
          <ChoiceGroup columns={1} value={d.hiringReadiness} onChange={(v) => setEmployerField('hiringReadiness', v)}
            options={['Immediately', 'Within 30 days', 'Within 90 days', 'Just exploring'].map(r => ({ value: r, label: r }))} />
        );
      case 11:
        return (
          <div className="pf-summary-card">
            <p><strong>Company:</strong> {d.companyName || '—'}</p>
            <p><strong>Industry:</strong> {d.industry || '—'}</p>
            <p><strong>Hiring for:</strong> {d.hiringRoles || '—'}</p>
            <p><strong>Readiness:</strong> {d.hiringReadiness || '—'}</p>
          </div>
        );
      default:
        return null;
    }
  };

  const renderEmployerOnboarding = () => {
    if (employerDraftPrompt === 'pending') {
      return (
        <div className="pf-draft-prompt">
          <div className="pf-draft-card">
            <h2>Welcome back</h2>
            <p>We saved your onboarding progress from last time. Pick up where you left off, or start fresh.</p>
            <div className="pf-draft-actions">
              <Button variant="secondary" onClick={() => { clearEmployerDraft(); setEmployerDraftPrompt(null); }}>Start fresh</Button>
              <Button onClick={() => {
                const draft = loadEmployerDraft();
                if (draft?.formData) setEmployerFormData(prev => ({ ...prev, ...draft.formData }));
                if (typeof draft?.step === 'number') setEmployerStep(draft.step);
                setEmployerDraftPrompt(null);
              }}>
                Resume onboarding
              </Button>
            </div>
          </div>
          <style>{`
            .pf-draft-prompt { min-height: 70vh; display: flex; align-items: center; justify-content: center; padding: 1.5rem; }
            .pf-draft-card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-md); box-shadow: var(--shadow-2); padding: 2rem; max-width: 420px; text-align: center; }
            .pf-draft-card h2 { margin: 0 0 0.5rem; font-size: 1.3rem; }
            .pf-draft-card p { color: var(--text-secondary); margin: 0 0 1.5rem; font-size: 0.9rem; }
            .pf-draft-actions { display: flex; gap: 0.75rem; justify-content: center; }
          `}</style>
        </div>
      );
    }

    const insights = getEmployerInsights(employerFormData);

    return (
      <div style={{ background: 'var(--ios-bg)', minHeight: '100%' }}>
        <div className="pf-hero">
          <h1>Corporate Partner Onboarding</h1>
          <p>A few focused questions to set up your hiring profile — we'll show you what it means for your candidate matches as you go.</p>
        </div>

        <GuidedStep
          stages={EMPLOYER_STAGES}
          activeStageId={EMPLOYER_QUESTION_STAGE[employerStep]}
          stepNumber={employerStep + 1}
          totalSteps={EMPLOYER_TOTAL_STEPS}
          title={EMPLOYER_TITLES[employerStep]}
          helpText={EMPLOYER_HELP[employerStep]}
          insights={insights}
          onBack={goEmployerBack}
          backDisabled={employerStep === 0}
          onNext={goEmployerNext}
          nextDisabled={!validateEmployerQuestion(employerStep) || (employerStep === EMPLOYER_TOTAL_STEPS - 1 && onboardingSubmitLoading)}
          nextLabel={employerStep === EMPLOYER_TOTAL_STEPS - 1 ? (onboardingSubmitLoading ? 'Saving…' : 'Complete onboarding') : 'Continue'}
          loading={employerStep === EMPLOYER_TOTAL_STEPS - 1 && onboardingSubmitLoading}
        >
          {renderEmployerQuestion()}
        </GuidedStep>

        <style>{`
          .pf-hero { max-width: 920px; margin: 0 auto; padding: 2rem 1.25rem 0; }
          .pf-hero h1 { font-size: 1.75rem; font-weight: 800; color: var(--ios-text); margin: 0 0 0.35rem; letter-spacing: -0.01em; }
          .pf-hero p { color: var(--text-secondary); margin: 0; font-size: 0.95rem; }

          .vx-field {
            width: 100%;
            padding: 0.85rem 1rem;
            border-radius: var(--radius-sm);
            border: 1px solid var(--vx-border, #64748b);
            background: white;
            color: #0f172a;
            outline: none;
            font-family: inherit;
            font-size: 16px;
            box-sizing: border-box;
            transition: border-color 0.15s ease, box-shadow 0.15s ease;
          }
          .vx-field:hover:not(:focus) { --vx-border: #334155; }
          .vx-field:focus { --vx-border: var(--ios-olive); box-shadow: 0 0 0 3px rgba(75,107,50,0.18); }

          .pf-summary-card { background: var(--surface-alt); border-radius: var(--radius-sm); padding: 1.25rem; }
          .pf-summary-card p { margin: 0 0 0.4rem; font-size: 0.9rem; }
          .pf-summary-card p:last-child { margin-bottom: 0; }
        `}</style>
      </div>
    );
  };

  const renderEmployerDashboard = () => {
    const companyName = profile?.company_name || 'Corporate Partner';
    const repName = profile?.contact_name || 'Recruiter';
    const designation = profile?.designation || 'TA Lead';

    const candidatesToRender = spotlightCandidates.length > 0 ? spotlightCandidates : [
      {
        name: 'Rahul Kumar (Clerk SD)',
        branch: 'Indian Army',
        score: 94,
        trade: 'Clerk SD',
        skills: ['Administration', 'Inventory Control', 'Logistics']
      },
      {
        name: 'Amit Singh',
        branch: 'Indian Navy',
        score: 87,
        trade: 'Seaman Branch',
        skills: ['Navigation', 'Physical Security', 'Telecom']
      },
      {
        name: 'Vikram Vardhan',
        branch: 'Indian Air Force',
        score: 91,
        trade: 'Mechanical Fitter',
        skills: ['Engine Overhaul', 'System Inspection', 'Precision Hydraulics']
      }
    ];

    return (
      <div className="dashboard-wrapper" style={{ padding: '2rem 1.5rem', background: 'var(--ios-bg)' }}>
        <div className="dashboard-content animate-fade-in" style={{ maxWidth: '1200px', margin: '0 auto' }}>
          
          <div className="welcome-hero animate-fade-in" style={{
            background: 'linear-gradient(135deg, #1e293b 0%, #1F3A2E 100%)',
            padding: '2.5rem',
            borderRadius: 'var(--radius-lg)',
            color: 'white',
            marginBottom: '2rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            boxShadow: 'var(--shadow-3)',
            flexWrap: 'wrap',
            gap: '1.5rem'
          }}>
            <div style={{ textAlign: 'left', flex: 1, minWidth: '300px' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 800, background: 'rgba(255,255,255,0.15)', padding: '0.4rem 0.8rem', borderRadius: 'var(--radius-pill)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                Recruiter Portal
              </span>
              <h1 style={{ fontSize: '2.25rem', fontWeight: 850, marginTop: '0.75rem', marginBottom: '0.35rem', letterSpacing: '-0.02em' }}>
                Welcome, {repName}
              </h1>
              <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: '1rem', fontWeight: 500, marginBottom: '1.5rem' }}>
                {designation} at <strong style={{ color: 'white' }}>{companyName}</strong>
              </p>
              
              <div style={{ display: 'flex', gap: '1rem' }}>
                <Link to="/find-candidates" className="btn-secondary ios-pill" style={{ textDecoration: 'none', background: 'white', color: '#1F3A2E', fontWeight: 700, padding: '0.75rem 1.5rem' }}>
                  Search Talent
                </Link>
                <Button
                  variant="ghost"
                  onClick={handleOpenEditModal}
                  style={{ background: 'rgba(255,255,255,0.2)', color: 'white', border: '1px solid rgba(255,255,255,0.3)', padding: '0.75rem 1.5rem' }}
                >
                  Edit Profile
                </Button>
              </div>
            </div>

            <div style={{ width: '95px', height: '95px', borderRadius: '50%', background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '3px solid rgba(255,255,255,0.3)', overflow: 'hidden', boxShadow: 'var(--shadow-2)' }}>
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <User size={42} color="white" />
              )}
            </div>
          </div>

          <div className="dashboard-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
            <Card className="score-card" style={{ padding: '1.75rem' }}>
              <div className="card-top" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                <Briefcase size={20} color="var(--ios-olive)" />
                <span className="font-cta" style={{ fontWeight: '800', fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase' }}>Active Postings</span>
              </div>
              <div className="score-display" style={{ fontSize: '2.5rem', fontWeight: 850, color: '#0f172a', textAlign: 'left' }}>{activePostingsCount}</div>
              <p className="card-desc" style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.5rem', textAlign: 'left' }}>Jobs currently posted on the platform</p>
            </Card>

            <Card className="score-card" style={{ padding: '1.75rem' }}>
              <div className="card-top" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                <Users size={20} color="var(--ios-olive)" />
                <span className="font-cta" style={{ fontWeight: '800', fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase' }}>Shortlisted Veterans</span>
              </div>
              <div className="score-display" style={{ fontSize: '2.5rem', fontWeight: 850, color: '#0f172a', textAlign: 'left' }}>{shortlistedCount}</div>
              <p className="card-desc" style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.5rem', textAlign: 'left' }}>Candidates saved for hiring consideration</p>
            </Card>

            <Card className="score-card" style={{ padding: '1.75rem' }}>
              <div className="card-top" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                <MessageSquare size={20} color="var(--ios-olive)" />
                <span className="font-cta" style={{ fontWeight: '800', fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase' }}>Active Chats</span>
              </div>
              <div className="score-display" style={{ fontSize: '2.5rem', fontWeight: 850, color: '#0f172a', textAlign: 'left' }}>{activeChatsCount}</div>
              <p className="card-desc" style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.5rem', textAlign: 'left' }}>Conversations with transition candidates</p>
            </Card>

            <Card className="score-card" style={{ padding: '1.75rem' }}>
              <div className="card-top" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                <Users size={20} color="var(--ios-olive)" />
                <span className="font-cta" style={{ fontWeight: '800', fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase' }}>Network Connections</span>
              </div>
              <div className="score-display" style={{ fontSize: '2.5rem', fontWeight: 850, color: '#0f172a', textAlign: 'left' }}>{connectionsCount}</div>
              <p className="card-desc" style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.5rem', textAlign: 'left' }}>
                <Link to="/network" style={{ color: 'var(--ios-olive)', fontWeight: 700, textDecoration: 'none' }}>
                  Manage Network
                </Link>
              </p>
            </Card>

            <Card className="score-card" style={{ padding: '1.75rem' }}>
              <div className="card-top" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                <Award size={20} color="var(--ios-olive)" />
                <span className="font-cta" style={{ fontWeight: '800', fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase' }}>Trust Verification</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
                <span className="badge" style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem', color: '#1F3A2E', background: '#eef2f0', fontWeight: 800, borderRadius: 'var(--radius-pill)', display: 'inline-block' }}>
                  VERIFIED PARTNER
                </span>
              </div>
              <p className="card-desc" style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '1rem', textAlign: 'left' }}>Verified credentials by national board</p>
            </Card>
          </div>

          <div className="ios-card" style={{ padding: '2.5rem', background: 'white', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-2)', border: '1px solid rgba(0,0,0,0.02)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <div style={{ textAlign: 'left' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em', margin: 0 }}>
                  Veteran Talent Spotlight
                </h2>
                <p style={{ color: '#64748b', fontSize: '0.9rem', marginTop: '0.2rem', margin: 0 }}>
                  Top transitioning military candidates matching corporate requisites
                </p>
              </div>
              <Link to="/find-candidates" style={{ color: 'var(--ios-olive)', fontWeight: 700, fontSize: '0.9rem', textDecoration: 'none' }}>
                View All Candidates →
              </Link>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {candidatesToRender.map((candidate, idx) => (
                <div key={idx} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '1.25rem 1.5rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid #f1f5f9',
                  background: '#f8fafc',
                  transition: 'all 0.2s ease'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: '50%',
                      background: 'rgba(75, 107, 50, 0.1)',
                      color: 'var(--ios-olive)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800,
                      fontSize: '1rem'
                    }}>
                      {candidate.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div style={{ textAlign: 'left' }}>
                      <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                        {candidate.name}
                      </h4>
                      <p style={{ color: '#64748b', fontSize: '0.8rem', margin: '0.2rem 0 0 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span>{candidate.branch}</span> • <span>Trade: {candidate.trade}</span>
                      </p>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                    <div style={{ display: 'flex', gap: '0.25rem' }}>
                      {candidate.skills.map((skill, sIdx) => (
                        <span key={sIdx} style={{
                          fontSize: '0.7rem',
                          background: 'white',
                          border: '1px solid #e2e8f0',
                          padding: '0.25rem 0.5rem',
                          borderRadius: 'var(--radius-sm)',
                          color: '#475569',
                          fontWeight: 600
                        }}>
                          {skill}
                        </span>
                      ))}
                    </div>
                    
                    <div style={{ textAlign: 'right', minWidth: '100px' }}>
                      <span style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--ios-olive)' }}>
                        {candidate.score}% Match
                      </span>
                    </div>

                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => navigate('/find-candidates')}
                      style={{ fontWeight: 700 }}
                    >
                      View Profile
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {renderEditProfileModal()}
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

  // --- EMPLOYER ONBOARDING GATES ---
  if (isEmployer) {
    if (!profile || !profile.company_name) {
      return renderEmployerOnboarding();
    }
    return renderEmployerDashboard();
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

  const recommendations = profile?.recommendations || [];
  const tier = higherTier(effectiveTier, localTierOverride);
  const scoreUnlockStatus = statusFor('SCORE_UNLOCK');
  const cvAddonStatus = statusFor('CV_ADDON');



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
          </div>

          <div className="welcome-actions">
            <Button
              variant="ghost"
              onClick={handleOpenEditModal}
              style={{ background: 'rgba(255,255,255,0.22)', color: 'white', border: '1px solid rgba(255,255,255,0.4)', backdropFilter: 'blur(6px)', whiteSpace: 'nowrap' }}
            >
              Edit Profile
            </Button>
            <Button
              variant="ghost"
              onClick={handleRecalculate}
              disabled={loading}
              style={{ background: 'rgba(255,255,255,0.12)', color: 'white', border: '1px solid rgba(255,255,255,0.3)', backdropFilter: 'blur(6px)', whiteSpace: 'nowrap' }}
            >
              {loading ? <RefreshCw className="animate-spin" size={14} /> : <RefreshCw size={14} />}
              Recalculate
            </Button>
          </div>
        </div>

        <div className="dashboard-grid">
          {/* Veer Score Card */}
          <div className="feature-split-card">
            <div className="feature-split-image">
              {!isEmployer && !canViewVeerScore(tier) ? (
                <img src="/veernxt_assets/promotional/R01_unlock_veerscore.png" alt="" />
              ) : (
                <img src="/veernxt_assets/banners/B02_veerscore.png" alt="" />
              )}
            </div>
            <div className="feature-split-content">
              <div className="card-top" style={{ marginBottom: '1rem' }}>
                <Award size={24} color="var(--ios-olive)" />
                <span className="font-cta" style={{ fontWeight: '700', fontSize: '0.9rem', color: 'var(--ios-olive)' }}>VEER SCORE</span>
              </div>
              {!isEmployer && !canViewVeerScore(tier) ? (
                <>
                  <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', color: '#0f172a' }}>Unlock Your VeerScore</h3>
                  <p className="card-desc" style={{ marginBottom: '1.5rem' }}>See your career readiness score calculated from your military profile.</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                    <Button
                      type="button"
                      icon={Crown}
                      disabled={scoreUnlockStatus === 'processing'}
                      onClick={handleUnlockScore}
                      style={{ whiteSpace: 'nowrap' }}
                    >
                      {scoreUnlockStatus === 'processing' ? 'Processing…' : 'Unlock — ₹9'}
                    </Button>
                    <span style={{ fontSize: '0.8rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Gift size={12} color="var(--ios-olive)" />
                      Plus your CV for just ₹1 more
                    </span>
                  </div>
                  {errorFor('SCORE_UNLOCK') && <p style={{ fontSize: '0.8rem', color: 'var(--danger)', marginTop: '0.75rem' }}>{errorFor('SCORE_UNLOCK')}</p>}
                </>
              ) : (
                <>
                  <div className="score-display" style={{ fontSize: '4rem', fontWeight: 800, color: 'var(--ios-olive)', marginBottom: '0.5rem', lineHeight: 1, letterSpacing: '-0.05em' }}>
                    {profile?.veer_score != null ? Math.round(profile.veer_score) : '—'}
                  </div>
                  <p className="card-desc">Your overall readiness score calculated from service history, skills, and physical standards.</p>
                </>
              )}
            </div>
          </div>

          {/* Learning Center Section */}
          <section>
            <div className="section-banner">
              <img src="/veernxt_assets/banners/B08_learning_path.png" alt="Learning Center" />
              <div className="section-banner-overlay">
                <div className="section-banner-content">
                  <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Learning Center</h2>
                  <p style={{ opacity: 0.9, fontSize: '0.95rem' }}>Access curated textbooks, practice papers, and secure readers.</p>
                </div>
              </div>
            </div>
            <div className="category-grid">
              {[
                { id: 'mock-tests', title: 'Mock Tests', icon: 'S11_mock_test.png', desc: 'Full-length practice exams' },
                { id: 'study-guides', title: 'Study Guides', icon: 'S10_study_guide.png', desc: 'Topic-wise material' },
                { id: 'prev-papers', title: 'Previous Papers', icon: 'S09_learning_center.png', desc: 'Real past questions' }
              ].map(cat => (
                <div key={cat.id} className="category-card" onClick={() => navigate('/learning-center')}>
                  <img src={`/veernxt_assets/icons/${cat.icon}`} alt="" />
                  <div className="category-card-content">
                    <h3>{cat.title}</h3>
                    <p>{cat.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* My Network Section */}
          <section>
            <div className="section-banner">
              <img src="/veernxt_assets/banners/B12_my_network.png" alt="My Network" />
              <div className="section-banner-overlay">
                <div className="section-banner-content">
                  <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>My Network</h2>
                  <p style={{ opacity: 0.9, fontSize: '0.95rem' }}>Connect with peers, transitioning military officers, and corporate recruiters.</p>
                </div>
              </div>
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
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Financial Guidance Section */}
          <section>
            <div className="section-banner">
              <img src="/veernxt_assets/banners/B11_financial_guidance.png" alt="Financial Guidance" />
              <div className="section-banner-overlay">
                <div className="section-banner-content">
                  <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Financial Guidance</h2>
                  <p style={{ opacity: 0.9, fontSize: '0.95rem' }}>Explore tailored financial schemes, low-interest education loans, and start-up seed funding.</p>
                </div>
              </div>
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
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Matches Section */}
          <section>
            <div className="section-banner">
              {!isEmployer && !canViewRecommendations(tier) ? (
                <img src="/veernxt_assets/premium/P03_locked_exam_matches.png" alt="Exam Matches Locked" />
              ) : (
                <img src="/veernxt_assets/banners/B10_exam_matches.png" alt="Exam Matches" />
              )}
              <div className="section-banner-overlay">
                <div className="section-banner-content">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <Target size={24} color="white" />
                    <h2 style={{ fontSize: '1.5rem', margin: 0 }}>Top Exam Matches</h2>
                  </div>
                  <p style={{ opacity: 0.9, fontSize: '0.95rem' }}>Personalised exam recommendations based on your military profile.</p>
                </div>
              </div>
            </div>
            
            <div className="ios-card matches-card" style={{ padding: '1.5rem', position: 'relative' }}>
              {!isEmployer && !canViewRecommendations(tier) ? (
                <div style={{ position: 'relative' }}>
                  {/* Blurred placeholder recommendations */}
                  <div style={{ filter: 'blur(8px)', userSelect: 'none', pointerEvents: 'none', opacity: 0.5 }}>
                    {[{ exam_name: 'SSC Stenographer Grade C & D', career_track: 'SSC', score: 95 },
                      { exam_name: 'RRB Junior Engineer', career_track: 'Railways', score: 88 },
                      { exam_name: 'IBPS Clerk', career_track: 'Banking', score: 82 }].map((rec, idx) => (
                      <div key={idx} className="recommendation-item" style={{ marginBottom: '0.75rem' }}>
                        <div className="rec-rank">{idx + 1}</div>
                        <div className="rec-info">
                          <h3 style={{ fontSize: '1.05rem', marginBottom: '0.2rem' }}>{rec.exam_name}</h3>
                          <div className="rec-meta"><span><Briefcase size={14} /> {rec.career_track}</span></div>
                        </div>
                        <div className="rec-score-section">
                          <div className="score-bar-bg"><div className="score-bar-fill" style={{ width: `${rec.score}%` }}></div></div>
                          <span className="score-text">{rec.score}% Match</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  {/* Lock overlay */}
                  <div style={{
                    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    background: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(2px)',
                    borderRadius: 'var(--radius-md)', zIndex: 2, padding: '2rem', textAlign: 'center',
                  }}>
                    <Lock size={32} color="var(--ios-olive)" style={{ marginBottom: '0.75rem' }} />
                    <p style={{ fontWeight: 700, fontSize: '1.05rem', color: '#0f172a', marginBottom: '0.5rem' }}>Your Exam Matches Are Ready</p>
                    <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '1.25rem', lineHeight: 1.5, maxWidth: '350px' }}>Unlock VeerScore to see your personalised exam recommendations.</p>
                    <Button
                      type="button"
                      icon={Crown}
                      disabled={scoreUnlockStatus === 'processing'}
                      onClick={handleUnlockScore}
                      style={{ whiteSpace: 'nowrap' }}
                    >
                      {scoreUnlockStatus === 'processing' ? 'Processing…' : 'Unlock with VeerScore — ₹9'}
                    </Button>
                  </div>
                </div>
              ) : recommendations.length > 0 ? (
                <div className="recommendations-list">
                  {recommendations.slice(0, 5).map((rec, idx) => (
                    <React.Fragment key={rec.exam_id || idx}>
                      <div className="recommendation-item">
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
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <button 
                          onClick={() => setExpandedExamId(expandedExamId === rec.exam_id ? null : rec.exam_id)}
                          className="btn-secondary ios-pill"
                          style={{ padding: '0.5rem 1rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                        >
                          {expandedExamId === rec.exam_id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          Prepare
                        </button>
                        <a href={rec.website} target="_blank" rel="noopener noreferrer" className="rec-link">
                          <ExternalLink size={18} />
                        </a>
                      </div>
                    </div>
                    {expandedExamId === rec.exam_id && <PreparationPanel exam={rec} />}
                  </React.Fragment>
                ))}
                </div>
              ) : (
                <div className="empty-matches">
                  <p>No matches found yet.</p>
                  <Link to="/profiling" className="btn-primary ios-pill" style={{ textDecoration: 'none' }}>Update Profile</Link>
                </div>
              )}
            </div>
          </section>

          {/* CV / Resume Card */}
          {!isEmployer && (
            <div className="feature-split-card">
              <div className="feature-split-image">
                {canGenerateCV(tier) ? (
                  <img src="/veernxt_assets/banners/B01_industry_fit_cv.png" alt="" />
                ) : canViewVeerScore(tier) ? (
                  <img src="/veernxt_assets/promotional/R04_unlock_industry_fit_cv.png" alt="" />
                ) : (
                  <img src="/veernxt_assets/premium/P04_locked_cv.png" alt="" />
                )}
              </div>
              <div className="feature-split-content">
                <div className="card-top" style={{ marginBottom: '1rem' }}>
                  <FileText size={24} color="var(--ios-olive)" />
                  <span className="font-cta" style={{ fontWeight: '700', fontSize: '0.9rem', color: 'var(--ios-olive)' }}>INDUSTRY-FIT CV</span>
                </div>
                
                {canGenerateCV(tier) ? (
                  <>
                    <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', color: '#0f172a' }}>Your CV is Ready</h3>
                    <p className="card-desc" style={{ marginBottom: '1.5rem' }}>Your personalised industry-fit resume is ready. Download and share your professional profile with recruiters.</p>
                    <Link to="/cv" className="btn-primary ios-pill" style={{ textDecoration: 'none', display: 'inline-flex', width: 'fit-content' }}>
                      Customize & Download CV
                    </Link>
                  </>
                ) : canViewVeerScore(tier) ? (
                  <>
                    <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', color: '#0f172a' }}>Add CV for ₹1</h3>
                    <p className="card-desc" style={{ marginBottom: '1.5rem' }}>You've already unlocked your VeerScore — add professional CV generation for a token ₹1 while it's right here.</p>
                    <Button type="button" disabled={cvAddonStatus === 'processing'} onClick={handleAddCv} style={{ width: 'fit-content', whiteSpace: 'nowrap' }}>
                      {cvAddonStatus === 'processing' ? 'Processing…' : 'Add CV — ₹1'}
                    </Button>
                    {errorFor('CV_ADDON') && <p style={{ fontSize: '0.8rem', color: 'var(--danger)', marginTop: '0.5rem' }}>{errorFor('CV_ADDON')}</p>}
                  </>
                ) : (
                  <>
                    <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', color: '#0f172a' }}>Corporate Ready CV</h3>
                    <p className="card-desc" style={{ marginBottom: '1.5rem' }}>Get a professionally formatted, industry-fit CV generated from your military profile.</p>
                    <Link to="/subscribe?plan=SCORE_CV" className="btn-secondary ios-pill" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', width: 'fit-content', whiteSpace: 'nowrap' }}>
                      <Lock size={14} /> Unlock VeerScore + CV — ₹10
                    </Link>
                  </>
                )}
              </div>
            </div>
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
          gap: 1.25rem;
        }
        .welcome-avatar {
          width: 88px;
          height: 88px;
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
          gap: 1rem;
          flex-wrap: wrap;
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
          gap: 2rem;
        }
        
        .feature-split-card {
          display: flex;
          flex-direction: row;
          background: var(--ios-card);
          border-radius: var(--radius-lg);
          overflow: hidden;
          box-shadow: var(--shadow-2);
          border: 1px solid rgba(0,0,0,0.05);
        }
        .feature-split-image {
          flex: 0 0 40%;
          min-height: 220px;
          position: relative;
          background: #f8fafc; /* Light background for 'contain' if needed */
        }
        .feature-split-image img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          position: absolute;
          inset: 0;
        }
        .feature-split-content {
          flex: 1;
          padding: 2rem;
          display: flex;
          flex-direction: column;
          justify-content: center;
        }

        .section-banner {
          width: 100%;
          height: 180px;
          border-radius: var(--radius-lg);
          overflow: hidden;
          position: relative;
          margin-bottom: 1.5rem;
          box-shadow: var(--shadow-2);
        }
        .section-banner img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .section-banner-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(to right, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.2) 100%);
          display: flex;
          align-items: center;
          padding: 2rem;
        }
        .section-banner-content {
          color: white;
          max-width: 60%;
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
        .rec-link {
          color: #ccc;
          transition: color 0.2s;
        }
        .rec-link:hover {
          color: var(--ios-olive);
        }
        .prep-item {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem;
          background: white;
          border-radius: var(--radius-sm);
          text-decoration: none;
          color: var(--ios-text);
          font-size: 0.8rem;
          font-weight: 600;
          transition: all 0.2s;
          border: 1px solid transparent;
        }
        .prep-item:hover {
          border-color: var(--ios-olive);
          color: var(--ios-olive);
          transform: translateX(4px);
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
          
          .feature-split-card {
            flex-direction: column;
          }
          .feature-split-image {
            height: 200px;
            flex: none;
          }
          .section-banner {
            height: 140px;
          }
          .section-banner-overlay {
            background: linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.3) 100%);
            align-items: flex-end;
            padding: 1.5rem;
          }
          .section-banner-content {
            max-width: 100%;
          }
        }
        @media (max-width: 640px) {
          .welcome-hero {
            padding: 1.5rem;
          }
          .welcome-avatar {
            width: 64px;
            height: 64px;
          }
          .welcome-name {
            font-size: 1.5rem;
          }
          .card-illustration {
            width: 100px;
            height: 100px;
            bottom: -5px;
            right: -5px;
            opacity: 0.7;
          }
        }
      `}} />
    </div>
  );
};

export default Dashboard;
