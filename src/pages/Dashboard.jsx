import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { supabase } from '../lib/supabase';
import { BookOpen, Award, Target, ExternalLink, ShieldCheck, MapPin, Briefcase, RefreshCw, ChevronDown, ChevronUp, FileText, PlayCircle, Landmark, Users, MessageSquare, User, Lock, Crown, ArrowRight } from 'lucide-react';
import { getEffectiveTier, canViewVeerScore, canViewRecommendations, canGenerateCV, TIERS } from '../lib/subscriptionAccess';

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

const inputStyle = {
  width: '100%',
  padding: '0.85rem 1rem',
  borderRadius: '12px',
  border: '1px solid #cbd5e1',
  background: 'white',
  color: '#0f172a',
  outline: 'none',
  fontFamily: 'inherit',
  fontSize: '0.95rem',
  transition: 'all 0.2s ease',
  boxSizing: 'border-box',
};

const selectStyle = {
  width: '100%',
  padding: '0.85rem 1rem',
  borderRadius: '12px',
  border: '1px solid #cbd5e1',
  background: 'white',
  color: '#0f172a',
  outline: 'none',
  fontFamily: 'inherit',
  fontSize: '0.95rem',
  transition: 'all 0.2s ease',
  boxSizing: 'border-box',
  height: '48px',
};

const textareaStyle = {
  width: '100%',
  padding: '0.85rem 1rem',
  borderRadius: '12px',
  border: '1px solid #cbd5e1',
  background: 'white',
  color: '#0f172a',
  outline: 'none',
  fontFamily: 'inherit',
  fontSize: '0.95rem',
  transition: 'all 0.2s ease',
  boxSizing: 'border-box',
  resize: 'vertical',
};

const labelStyle = {
  fontSize: '0.75rem',
  fontWeight: '800',
  color: '#64748b',
  textTransform: 'uppercase',
  marginBottom: '0.5rem',
  display: 'block',
  letterSpacing: '0.05em',
};

const Dashboard = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expandedExamId, setExpandedExamId] = useState(null);
  const [isEmployer, setIsEmployer] = useState(false);
  const [session, setSession] = useState(null);
  const [onboardingSubmitLoading, setOnboardingSubmitLoading] = useState(false);
  const [activePostingsCount, setActivePostingsCount] = useState(0);
  const [shortlistedCount, setShortlistedCount] = useState(0);
  const [activeChatsCount, setActiveChatsCount] = useState(0);
  const [spotlightCandidates, setSpotlightCandidates] = useState([]);
  const [connectionsCount, setConnectionsCount] = useState(0);
  const [effectiveTier, setEffectiveTier] = useState(TIERS.FREE);

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
          // Fallback to mock profile for dummy testing
          setProfile({
            full_name: 'Rahul Kumar',
            veer_score: 92,
            profiling_completed: true,
            subscription_tier: 'FREE',
            recommendations: [
              {
                exam_name: "SSC Stenographer Grade ‘C’ & ‘D’",
                match_score: 95,
                career_track: "SSC",
                website: "https://ssc.gov.in"
              },
              {
                exam_name: "RRB Jr. Engineer",
                match_score: 88,
                career_track: "Railways",
                website: "https://indianrailways.gov.in"
              }
            ]
          });
          setEffectiveTier(TIERS.FREE);
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

  const handleRecalculate = async () => {
    if (!profile?.raw_profile_data) {
      navigate('/profiling');
      return;
    }

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const formData = profile.raw_profile_data;
      
      // Transform raw formData to match engine schema (same as Profiling.jsx does)
      const payload = {
        ...formData,
        dateOfBirth: `${formData.dobYear}-${formData.dobMonth}-${formData.dobDay}`,
        totalServiceDuration: `${formData.serviceYears} years ${formData.serviceMonths} months`,
        heightCm: parseInt(formData.heightCm) || 0,
        weightKg: parseInt(formData.weightKg) || 0,
        chestCm: parseInt(formData.chestCm) || 0,
        chestExpansion: parseInt(formData.chestExpansion) || 0,
      };

      const response = await axios.post('/api/profile/recommend', payload, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      
      if (response.data.ok) {
        window.location.reload(); // Refresh to show new results
      }
    } catch (err) {
      console.error('Recalculation failed:', err);
      alert('Failed to recalculate: ' + err.message);
    } finally {
      setLoading(false);
    }
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
      let candSkills = {};
      try {
        candSkills = typeof profile.skills === 'string' ? JSON.parse(profile.skills) : (profile.skills || {});
      } catch (e) {
        candSkills = {};
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
          borderRadius: '24px',
          width: '100%',
          maxWidth: '550px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', background: '#f8fafc', padding: '1rem', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#cbd5e1', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid var(--ios-olive)', position: 'relative' }}>
                {avatarPreview ? (
                  <img src={avatarPreview} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <User size={30} color="white" />
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', alignItems: 'flex-start' }}>
                <button 
                  type="button"
                  onClick={() => avatarInputRef.current?.click()}
                  disabled={avatarUploading}
                  className="btn-secondary ios-pill"
                  style={{ padding: '0.4rem 1rem', fontSize: '0.8rem', background: 'white', borderColor: '#cbd5e1', color: '#0f172a', cursor: 'pointer' }}
                >
                  {avatarUploading ? 'Uploading...' : 'Upload Profile Picture'}
                </button>
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
                    style={{ border: '1px solid #e2e8f0', borderRadius: '10px', padding: '0.6rem 0.75rem', fontSize: '0.9rem' }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', textAlign: 'left' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>Company Name</label>
                  <input 
                    type="text"
                    required
                    value={editFormData.company_name || ''}
                    onChange={e => setEditFormData(prev => ({ ...prev, company_name: e.target.value }))}
                    style={{ border: '1px solid #e2e8f0', borderRadius: '10px', padding: '0.6rem 0.75rem', fontSize: '0.9rem' }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', textAlign: 'left' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>Website</label>
                  <input 
                    type="url"
                    value={editFormData.website || ''}
                    onChange={e => setEditFormData(prev => ({ ...prev, website: e.target.value }))}
                    style={{ border: '1px solid #e2e8f0', borderRadius: '10px', padding: '0.6rem 0.75rem', fontSize: '0.9rem' }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', textAlign: 'left' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>Designation</label>
                  <input 
                    type="text"
                    value={editFormData.designation || ''}
                    onChange={e => setEditFormData(prev => ({ ...prev, designation: e.target.value }))}
                    style={{ border: '1px solid #e2e8f0', borderRadius: '10px', padding: '0.6rem 0.75rem', fontSize: '0.9rem' }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', textAlign: 'left' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>Location</label>
                  <input 
                    type="text"
                    value={editFormData.location || ''}
                    onChange={e => setEditFormData(prev => ({ ...prev, location: e.target.value }))}
                    style={{ border: '1px solid #e2e8f0', borderRadius: '10px', padding: '0.6rem 0.75rem', fontSize: '0.9rem' }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', textAlign: 'left' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>Company Description</label>
                  <textarea 
                    value={editFormData.about || ''}
                    onChange={e => setEditFormData(prev => ({ ...prev, about: e.target.value }))}
                    rows="3"
                    style={{ border: '1px solid #e2e8f0', borderRadius: '10px', padding: '0.6rem 0.75rem', fontSize: '0.9rem', fontFamily: 'inherit' }}
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
                    style={{ border: '1px solid #e2e8f0', borderRadius: '10px', padding: '0.6rem 0.75rem', fontSize: '0.9rem' }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', textAlign: 'left' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>Service Branch</label>
                  <select 
                    value={editFormData.service_branch || ''}
                    onChange={e => setEditFormData(prev => ({ ...prev, service_branch: e.target.value }))}
                    style={{ border: '1px solid #e2e8f0', borderRadius: '10px', padding: '0.6rem 0.75rem', fontSize: '0.9rem', background: 'white' }}
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
                    style={{ border: '1px solid #e2e8f0', borderRadius: '10px', padding: '0.6rem 0.75rem', fontSize: '0.9rem' }}
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
                    style={{ border: '1px solid #e2e8f0', borderRadius: '10px', padding: '0.6rem 0.75rem', fontSize: '0.9rem' }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', textAlign: 'left' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>Education Level</label>
                  <select 
                    value={editFormData.education_level || ''}
                    onChange={e => setEditFormData(prev => ({ ...prev, education_level: e.target.value }))}
                    style={{ border: '1px solid #e2e8f0', borderRadius: '10px', padding: '0.6rem 0.75rem', fontSize: '0.9rem', background: 'white' }}
                  >
                    <option value="Class 10">Class 10</option>
                    <option value="Class 12">Class 12</option>
                    <option value="Graduate">Graduate</option>
                    <option value="Post Graduate">Post Graduate</option>
                  </select>
                </div>
              </>
            )}

            {/* Submit Buttons */}
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1.25rem' }}>
              <button 
                type="submit"
                className="btn-primary ios-pill"
                style={{ flex: 1, padding: '0.75rem', border: 'none', fontSize: '0.95rem', cursor: 'pointer' }}
              >
                Save Changes
              </button>
              <button 
                type="button"
                onClick={() => setShowEditProfileModal(false)}
                className="btn-secondary ios-pill"
                style={{ flex: 1, padding: '0.75rem', border: '1px solid #cbd5e1', background: 'white', color: '#0f172a', fontSize: '0.95rem', cursor: 'pointer' }}
              >
                Cancel
              </button>
            </div>

          </form>
        </div>
      </div>
    );
  };

  const handleEmployerOnboardingSubmit = async (e) => {
    e.preventDefault();
    setOnboardingSubmitLoading(true);

    const formData = new FormData(e.target);
    const companyName = formData.get('companyName');
    const contactName = formData.get('contactName');
    const designation = formData.get('designation');
    const industry = formData.get('industry');
    const website = formData.get('website');
    const locationName = formData.get('location');
    const about = formData.get('about');

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
          company_name: companyName,
          website: website,
          contact_name: contactName,
          designation: designation,
          industry: industry,
          location: locationName,
          about: about,
          updated_at: new Date().toISOString()
        });

      if (dbError) throw dbError;

      // Update local state to trigger render
      setProfile({
        id: currentSession.user.id,
        company_name: companyName,
        website: website,
        contact_name: contactName,
        designation: designation,
        industry: industry,
        location: locationName,
        about: about
      });
    } catch (err) {
      console.error('Error during employer onboarding upsert:', err);
      alert('Failed to save profile: ' + err.message);
    } finally {
      setOnboardingSubmitLoading(false);
    }
  };

  const renderEmployerOnboarding = () => {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: 'calc(100vh - 80px)',
        background: 'var(--ios-bg)',
        padding: '2rem 1.5rem'
      }}>
        <div className="ios-card animate-fade-in" style={{
          maxWidth: '650px',
          width: '100%',
          padding: '2.5rem',
          background: 'rgba(255, 255, 255, 0.9)',
          backdropFilter: 'blur(20px)',
          borderRadius: '24px',
          boxShadow: '0 20px 40px rgba(0,0,0,0.06)',
          border: '1px solid rgba(0,0,0,0.05)'
        }}>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.5rem', letterSpacing: '-0.02em', textAlign: 'center' }}>
            Corporate Partner Onboarding
          </h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', fontSize: '0.925rem', textAlign: 'center' }}>
            Complete your profile to start hiring transitioning Agniveers and Ex-Servicemen.
          </p>

          <form onSubmit={handleEmployerOnboardingSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', textAlign: 'left' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
              <div>
                <label style={labelStyle}>Company Name</label>
                <input type="text" placeholder="e.g. Tata Motors" name="companyName" required style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Company Website</label>
                <input type="url" placeholder="e.g. https://tata.com" name="website" required style={inputStyle} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
              <div>
                <label style={labelStyle}>Representative Name</label>
                <input type="text" placeholder="e.g. Vikram Sharma" name="contactName" required style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Designation</label>
                <input type="text" placeholder="e.g. Head of Talent Acquisition" name="designation" required style={inputStyle} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
              <div>
                <label style={labelStyle}>Industry / Sector</label>
                <select name="industry" required style={selectStyle}>
                  <option value="">Select Industry</option>
                  <option value="IT & Software">IT & Software</option>
                  <option value="Security Services">Security Services</option>
                  <option value="Aerospace & Defence">Aerospace & Defence</option>
                  <option value="Logistics & Supply Chain">Logistics & Supply Chain</option>
                  <option value="Manufacturing">Manufacturing</option>
                  <option value="Finance & Banking">Finance & Banking</option>
                  <option value="Retail & E-commerce">Retail & E-commerce</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>Head Office Location</label>
                <input type="text" placeholder="e.g. Gurugram, India" name="location" required style={inputStyle} />
              </div>
            </div>

            <div>
              <label style={labelStyle}>Hiring Requirements & Sourcing Goals</label>
              <textarea placeholder="Tell us about the roles you are hiring for and how military talent fits into your team..." name="about" required style={textareaStyle} rows={4} />
            </div>

            <button type="submit" className="btn-primary ios-pill" disabled={onboardingSubmitLoading} style={{ padding: '0.9rem', fontSize: '0.95rem', background: 'var(--ios-olive)', width: '100%', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
              {onboardingSubmitLoading ? 'Saving Profile...' : 'Complete Onboarding'}
            </button>
          </form>
        </div>
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
            borderRadius: '24px',
            color: 'white',
            marginBottom: '2rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
            flexWrap: 'wrap',
            gap: '1.5rem'
          }}>
            <div style={{ textAlign: 'left', flex: 1, minWidth: '300px' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 800, background: 'rgba(255,255,255,0.15)', padding: '0.4rem 0.8rem', borderRadius: '100px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
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
                <button 
                  onClick={handleOpenEditModal} 
                  className="btn-secondary ios-pill" 
                  style={{ background: 'rgba(255,255,255,0.2)', color: 'white', borderColor: 'rgba(255,255,255,0.3)', padding: '0.75rem 1.5rem', cursor: 'pointer' }}
                >
                  Edit Profile
                </button>
              </div>
            </div>

            <div style={{ width: '95px', height: '95px', borderRadius: '50%', background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '3px solid rgba(255,255,255,0.3)', overflow: 'hidden', boxShadow: '0 8px 24px rgba(0,0,0,0.1)' }}>
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <User size={42} color="white" />
              )}
            </div>
          </div>

          <div className="dashboard-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
            <div className="ios-card score-card" style={{ padding: '1.75rem', background: 'white', borderRadius: '20px', boxShadow: '0 10px 30px rgba(0,0,0,0.03)' }}>
              <div className="card-top" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                <Briefcase size={20} color="var(--ios-olive)" />
                <span className="font-cta" style={{ fontWeight: '800', fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase' }}>Active Postings</span>
              </div>
              <div className="score-display" style={{ fontSize: '2.5rem', fontWeight: 850, color: '#0f172a', textAlign: 'left' }}>{activePostingsCount}</div>
              <p className="card-desc" style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.5rem', textAlign: 'left' }}>Jobs currently posted on the platform</p>
            </div>

            <div className="ios-card score-card" style={{ padding: '1.75rem', background: 'white', borderRadius: '20px', boxShadow: '0 10px 30px rgba(0,0,0,0.03)' }}>
              <div className="card-top" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                <Users size={20} color="var(--ios-olive)" />
                <span className="font-cta" style={{ fontWeight: '800', fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase' }}>Shortlisted Veterans</span>
              </div>
              <div className="score-display" style={{ fontSize: '2.5rem', fontWeight: 850, color: '#0f172a', textAlign: 'left' }}>{shortlistedCount}</div>
              <p className="card-desc" style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.5rem', textAlign: 'left' }}>Candidates saved for hiring consideration</p>
            </div>

            <div className="ios-card score-card" style={{ padding: '1.75rem', background: 'white', borderRadius: '20px', boxShadow: '0 10px 30px rgba(0,0,0,0.03)' }}>
              <div className="card-top" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                <MessageSquare size={20} color="var(--ios-olive)" />
                <span className="font-cta" style={{ fontWeight: '800', fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase' }}>Active Chats</span>
              </div>
              <div className="score-display" style={{ fontSize: '2.5rem', fontWeight: 850, color: '#0f172a', textAlign: 'left' }}>{activeChatsCount}</div>
              <p className="card-desc" style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.5rem', textAlign: 'left' }}>Conversations with transition candidates</p>
            </div>

            <div className="ios-card score-card" style={{ padding: '1.75rem', background: 'white', borderRadius: '20px', boxShadow: '0 10px 30px rgba(0,0,0,0.03)' }}>
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
            </div>

            <div className="ios-card score-card" style={{ padding: '1.75rem', background: 'white', borderRadius: '20px', boxShadow: '0 10px 30px rgba(0,0,0,0.03)' }}>
              <div className="card-top" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                <Award size={20} color="var(--ios-olive)" />
                <span className="font-cta" style={{ fontWeight: '800', fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase' }}>Trust Verification</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
                <span className="badge" style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem', color: '#1F3A2E', background: '#eef2f0', fontWeight: 800, borderRadius: '100px', display: 'inline-block' }}>
                  VERIFIED PARTNER
                </span>
              </div>
              <p className="card-desc" style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '1rem', textAlign: 'left' }}>Verified credentials by national board</p>
            </div>
          </div>

          <div className="ios-card" style={{ padding: '2.5rem', background: 'white', borderRadius: '24px', boxShadow: '0 20px 40px rgba(0,0,0,0.03)', border: '1px solid rgba(0,0,0,0.02)' }}>
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
                  borderRadius: '16px',
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
                          borderRadius: '6px',
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

                    <button 
                      onClick={() => navigate('/find-candidates')}
                      className="btn-secondary ios-pill"
                      style={{ padding: '0.5rem 1rem', fontSize: '0.8rem', fontWeight: 700 }}
                    >
                      View Profile
                    </button>
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



  return (
    <div className="dashboard-wrapper">
      <div className="dashboard-content animate-fade-in">
        <div className="welcome-hero animate-fade-in" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.5rem' }}>
          <div className="welcome-content" style={{ flex: 1, minWidth: '300px' }}>
            <h1 style={{ fontSize: '2.5rem', tracking: '-0.03em', color: 'white' }}>Hello, {profile?.full_name?.split(' ')[0] || 'Agniveer'}</h1>
            <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '1.1rem', marginBottom: '1.5rem' }}>Here are your top career recommendations based on your military profile.</p>
            
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button 
                onClick={handleOpenEditModal} 
                className="btn-secondary ios-pill" 
                style={{ background: 'rgba(255,255,255,0.2)', color: 'white', borderColor: 'rgba(255,255,255,0.3)', cursor: 'pointer' }}
              >
                Edit Profile
              </button>
              <button 
                onClick={handleRecalculate} 
                disabled={loading}
                className="btn-secondary ios-pill" 
                style={{ background: 'rgba(255,255,255,0.1)', color: 'white', borderColor: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}
              >
                {loading ? <RefreshCw className="animate-spin" size={14} /> : <RefreshCw size={14} />} 
                Recalculate
              </button>
            </div>
          </div>

          <div style={{ width: '95px', height: '95px', borderRadius: '50%', background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '3px solid rgba(255,255,255,0.3)', overflow: 'hidden', boxShadow: '0 8px 24px rgba(0,0,0,0.1)' }}>
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <User size={42} color="white" />
            )}
          </div>
        </div>

        <div className="dashboard-grid">
          {/* Veer Score Card */}
          <div className="ios-card score-card" style={{ position: 'relative', overflow: 'hidden' }}>
            <div className="card-top">
              <Award size={24} color="var(--ios-olive)" />
              <span className="font-cta" style={{ fontWeight: '700', fontSize: '0.9rem', color: 'var(--ios-olive)' }}>VEER SCORE</span>
            </div>
            {!isEmployer && !canViewVeerScore(effectiveTier) ? (
              <>
                <div className="score-display" style={{ filter: 'blur(12px)', userSelect: 'none', pointerEvents: 'none' }}>
                  {profile?.veer_score != null ? Math.round(profile.veer_score) : '87'}
                </div>
                <div style={{
                  position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(4px)',
                  borderRadius: 'inherit', zIndex: 2, padding: '1.5rem', textAlign: 'center',
                }}>
                  <Lock size={28} color="var(--ios-olive)" style={{ marginBottom: '0.75rem' }} />
                  <p style={{ fontWeight: 700, fontSize: '0.95rem', color: '#0f172a', marginBottom: '0.5rem' }}>Unlock Your VeerScore</p>
                  <p style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '1rem', lineHeight: 1.5 }}>See your career readiness score calculated from your military profile.</p>
                  <Link to="/subscribe?plan=SCORE_UNLOCK" className="btn-primary ios-pill" style={{
                    textDecoration: 'none', fontSize: '0.8rem', padding: '0.6rem 1.25rem',
                    display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                    color: 'white',
                  }}>
                    <Crown size={14} /> Unlock — ₹9
                  </Link>
                </div>
              </>
            ) : (
              <>
                <div className="score-display">
                  {profile?.veer_score != null ? Math.round(profile.veer_score) : '—'}
                </div>
                <p className="card-desc">Your overall readiness score calculated from service history, skills, and physical standards.</p>
              </>
            )}
          </div>

          {/* Learning Center CTA */}
          <div className="ios-card library-card">
            <div className="card-top">
              <BookOpen size={24} color="var(--ios-olive)" />
              <span className="font-cta" style={{ fontWeight: '700', fontSize: '0.9rem', color: 'var(--ios-olive)' }}>LEARNING CENTER</span>
            </div>
            <p className="card-desc" style={{ marginBottom: '1.5rem' }}>
              Access curated textbooks, practice papers, and secure readers for your targeted exams.
            </p>
            <Link to="/learning-center" className="btn-primary ios-pill" style={{ textDecoration: 'none', textAlign: 'center', fontSize: '0.9rem' }}>
              Enter Library
            </Link>
          </div>

          {/* My Network CTA */}
          <div className="ios-card library-card">
            <div className="card-top">
              <Users size={24} color="var(--ios-olive)" />
              <span className="font-cta" style={{ fontWeight: '700', fontSize: '0.9rem', color: 'var(--ios-olive)' }}>MY NETWORK</span>
            </div>
            <p className="card-desc" style={{ marginBottom: '1.5rem' }}>
              Connect with peers, transitioning military officers, and corporate recruiters.
            </p>
            <Link to="/network" className="btn-primary ios-pill" style={{ textDecoration: 'none', textAlign: 'center', fontSize: '0.9rem' }}>
              View Connections ({connectionsCount})
            </Link>
          </div>

          {/* Financial Guidance CTA */}
          <div className="ios-card library-card" style={{ gridColumn: 'span 2' }}>
            <div className="card-top">
              <Landmark size={24} color="var(--ios-olive)" />
              <span className="font-cta" style={{ fontWeight: '700', fontSize: '0.9rem', color: 'var(--ios-olive)' }}>FINANCIAL GUIDANCE</span>
            </div>
            <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
              <p className="card-desc" style={{ flex: 1 }}>
                Explore tailored financial schemes, low-interest education loans, and start-up seed funding designed for candidates and transitioning service members.
              </p>
              <Link to="/financial-guidance" className="btn-primary ios-pill" style={{ textDecoration: 'none', whiteSpace: 'nowrap', fontSize: '0.9rem' }}>
                View Schemes
              </Link>
            </div>
          </div>

          {/* Matches Section */}
          <div className="ios-card matches-card" style={{ position: 'relative', overflow: 'hidden' }}>
            <div className="card-top" style={{ marginBottom: '2rem' }}>
              <Target size={24} color="var(--ios-olive)" />
              <h2 style={{ fontSize: '1.25rem', margin: 0 }}>Top Exam Matches</h2>
            </div>
            
            {!isEmployer && !canViewRecommendations(effectiveTier) ? (
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
                  borderRadius: '12px', zIndex: 2, padding: '2rem', textAlign: 'center',
                }}>
                  <Lock size={32} color="var(--ios-olive)" style={{ marginBottom: '0.75rem' }} />
                  <p style={{ fontWeight: 700, fontSize: '1.05rem', color: '#0f172a', marginBottom: '0.5rem' }}>Your Exam Matches Are Ready</p>
                  <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '1.25rem', lineHeight: 1.5, maxWidth: '350px' }}>See your personalised exam recommendations based on your military profile.</p>
                  <Link to="/subscribe?plan=SCORE_UNLOCK" className="btn-primary ios-pill" style={{
                    textDecoration: 'none', fontSize: '0.85rem', padding: '0.7rem 1.5rem',
                    display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                    color: 'white',
                  }}>
                    <Crown size={14} /> Unlock — ₹9 one-time
                  </Link>
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

          {/* CV / Resume Card */}
          {!isEmployer && (
            <div className="ios-card library-card" style={{ gridColumn: 'span 2', position: 'relative', overflow: 'hidden' }}>
              <div className="card-top">
                <FileText size={24} color="var(--ios-olive)" />
                <span className="font-cta" style={{ fontWeight: '700', fontSize: '0.9rem', color: 'var(--ios-olive)' }}>INDUSTRY-FIT CV</span>
              </div>
              {canGenerateCV(effectiveTier) ? (
                <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
                  <p className="card-desc" style={{ flex: 1 }}>
                    Your personalised industry-fit resume is ready. Download and share your professional profile with recruiters.
                  </p>
                  <Link to="/cv" className="btn-primary ios-pill" style={{ textDecoration: 'none', whiteSpace: 'nowrap', fontSize: '0.9rem', cursor: 'pointer', color: 'white', display: 'inline-flex', alignItems: 'center' }}>
                    Customize & Download CV
                  </Link>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
                  <div style={{ flex: 1 }}>
                    <p className="card-desc" style={{ marginBottom: '0.75rem' }}>
                      Get a professionally formatted, industry-fit CV generated from your military profile — tailored for the corporate world.
                    </p>
                    <Link to="/subscribe?plan=SCORE_CV" style={{
                      display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                      color: 'var(--ios-olive)', fontWeight: 700, fontSize: '0.85rem',
                      textDecoration: 'none',
                    }}>
                      <Lock size={14} /> Unlock CV — ₹10 one-time <ArrowRight size={14} />
                    </Link>
                  </div>
                </div>
              )}
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
          background-image: linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.5)), url("/hero/hero_image.png");
          background-size: cover;
          background-position: center;
          padding: 4rem 3rem;
          border-radius: 24px;
          position: relative;
          overflow: hidden;
          box-shadow: 0 20px 40px rgba(0,0,0,0.1);
        }
        .welcome-content {
          position: relative;
          z-index: 2;
        }
        .dashboard-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1.5rem;
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
        .matches-card {
          grid-column: span 2;
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
          border-radius: 16px;
          transition: transform 0.2s;
        }
        .recommendation-item:hover {
          transform: scale(1.01);
        }
        .rec-rank {
          width: 32px;
          height: 32px;
          background: white;
          border-radius: 8px;
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
          border-radius: 8px;
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
          .dashboard-grid { grid-template-columns: 1fr; }
          .matches-card { grid-column: auto; }
          .recommendation-item { flex-wrap: wrap; gap: 0.75rem; }
          .rec-score-section { width: 100%; order: 3; }
        }
      `}} />
    </div>
  );
};

export default Dashboard;
