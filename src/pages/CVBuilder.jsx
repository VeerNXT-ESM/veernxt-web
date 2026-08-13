import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { awardPoints } from '../lib/awardPoints';
import { useNavigate } from 'react-router-dom';
import { 
  FileText, Award, Shield, BookOpen, Layers, 
  Settings, Download, Plus, Trash2, ArrowLeft,
  Sparkles, RefreshCw, Briefcase, Mail, Phone, MapPin, Link as LinkIcon
} from 'lucide-react';

const CVBuilder = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Spacing & Styling State
  const [selectedTemplate, setSelectedTemplate] = useState('modern'); // modern, corporate, tech, military, traditional
  const [spacing, setSpacing] = useState('normal'); // compact, normal, spacious
  const [fontFamily, setFontFamily] = useState('Inter'); // Inter, Georgia, Garamond, Roboto
  const [accentColor, setAccentColor] = useState('#4b6b32'); // Olive, Slate (#334155), Navy (#1e3a8a), Burgundy (#7f1d1d)

  // Guided Tour State
  const [runTour, setRunTour] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [tooltipPos, setTooltipPos] = useState({ top: 0, left: 0 });
  const [highlightRect, setHighlightRect] = useState({ top: 0, left: 0, width: 0, height: 0 });

  // Form State
  const [personalDetails, setPersonalDetails] = useState({
    fullName: '',
    email: '',
    phone: '',
    linkedin: '',
    city: '',
    state: '',
    summary: ''
  });

  const [serviceHistory, setServiceHistory] = useState({
    branch: '',
    rank: '',
    regiment: '',
    trade: '',
    years: '',
    discharge: '',
    medals: ''
  });

  const [skills, setSkills] = useState([]);
  const [newSkill, setNewSkill] = useState('');

  const [experience, setExperience] = useState([
    {
      title: 'Operations Manager / Supervisor',
      org: 'Indian Armed Forces',
      location: 'Operational Base',
      start: '2022',
      end: 'Present',
      bullets: 'Led operations coordination and managed tactical security logistics for a division. Supervised multi-functional teams ensuring high operational readiness. Streamlined equipment and assets maintenance workflows.'
    }
  ]);

  const [education, setEducation] = useState([
    {
      degree: 'Senior Secondary (12th)',
      school: 'CBSE',
      year: '2021',
      score: '84%'
    }
  ]);

  const [certifications, setCertifications] = useState([
    {
      title: 'Tactical Security & Operations Management Certificate',
      body: 'Military Training Academy',
      year: '2023'
    }
  ]);

  const tourSteps = [
    {
      targetId: 'tour-template-selector',
      title: '📋 Choose ATS Template',
      desc: 'Select from 5 industry-proven, ATS-optimized CV layouts tailored for military transitions.',
      placement: 'bottom-center'
    },
    {
      targetId: 'tour-format-controls',
      title: '🎨 Format & Style Controls',
      desc: 'Fine-tune line spacing, select premium fonts, and set accent colors to stand out.',
      placement: 'bottom-center'
    },
    {
      targetId: 'tour-save-pdf',
      title: '💾 Save & Print PDF',
      desc: 'Export your completed CV directly to high-quality PDF or print it out on A4 paper.',
      placement: 'bottom-right'
    },
    {
      targetId: 'tour-sidebar-form',
      title: '✍️ Details Builder',
      desc: 'Fill out and verify your contact details, service track, education, and milestones.',
      placement: 'right'
    },
    {
      targetId: 'tour-ai-summary',
      title: '✨ AI Professional Summary',
      desc: 'Click "AI Autogenerate" to instantly translate your military rank & trade into corporate terms.',
      placement: 'right'
    },
    {
      targetId: 'tour-skills',
      title: '🎯 Core Competencies',
      desc: 'Add relevant civilian skills or adjust prefilled keywords to maximize job-matching scores.',
      placement: 'right'
    },
    {
      targetId: 'tour-preview-canvas',
      title: '📄 Live A4 Preview',
      desc: 'Review a pixel-perfect, real-time rendering of your CV exactly as employers will see it.',
      placement: 'left'
    }
  ];

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/login');
        return;
      }

      const { data: userProfile } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', session.user.id)
        .maybeSingle();

      if (userProfile) {
        setProfile(userProfile);
        setPersonalDetails({
          fullName: userProfile.full_name || '',
          email: userProfile.email || '',
          phone: userProfile.raw_profile_data?.phone || userProfile.email?.split('@')[0] || '',
          linkedin: '',
          city: userProfile.raw_profile_data?.district || '',
          state: userProfile.preferred_states?.[0] || '',
          summary: generateDefaultSummary(userProfile)
        });

        setServiceHistory({
          branch: userProfile.service_branch || '',
          rank: userProfile.rank || '',
          regiment: userProfile.regiment || '',
          trade: userProfile.trade || '',
          years: userProfile.years_of_service || '',
          discharge: userProfile.discharge_type || '',
          medals: userProfile.medals || ''
        });

        let parsedSkills = [];
        if (Array.isArray(userProfile.skills)) {
          parsedSkills = userProfile.skills;
        } else if (typeof userProfile.skills === 'string') {
          parsedSkills = userProfile.skills.split(',').map(s => s.trim()).filter(Boolean);
        } else if (userProfile.skills) {
          try {
            const parsed = JSON.parse(userProfile.skills);
            if (Array.isArray(parsed)) {
              parsedSkills = parsed;
            }
          } catch (e) {
            parsedSkills = [String(userProfile.skills)];
          }
        }
        
        if (parsedSkills.length === 0) {
          parsedSkills = ['Tactical Security', 'Operations Leadership', 'Logistics Management'];
        }
        setSkills(parsedSkills);
      }
      setLoading(false);
      
      // Auto-trigger tour on visit
      setRunTour(true);
      setCurrentStep(0);
    };

    fetchProfile();
  }, [navigate]);

  const updateTooltipPosition = () => {
    const step = tourSteps[currentStep];
    if (!step) return;
    const el = document.getElementById(step.targetId);
    if (!el) return;

    // 1. Scroll instantly so element's final client rect is accurate
    el.scrollIntoView({ behavior: 'auto', block: 'center' });

    // 2. Measure updated coordinates relative to viewport
    const rect = el.getBoundingClientRect();
    let top = 0;
    let left = 0;

    if (step.placement === 'bottom-center') {
      top = rect.bottom + 12;
      left = rect.left + rect.width / 2 - 160;
    } else if (step.placement === 'bottom-right') {
      top = rect.bottom + 12;
      left = rect.right - 320;
    } else if (step.placement === 'right') {
      top = rect.top;
      left = rect.right + 16;
    } else if (step.placement === 'left') {
      top = rect.top + 50;
      left = rect.left - 336;
    }

    // Boundary logic
    if (left < 10) left = 10;
    if (left + 320 > window.innerWidth) left = window.innerWidth - 330;
    if (top < 10) top = 10;

    setTooltipPos({ top, left });
    setHighlightRect({
      top: rect.top,
      left: rect.left,
      width: rect.width,
      height: rect.height
    });
  };

  useEffect(() => {
    if (runTour && !loading) {
      const timer = setTimeout(() => {
        updateTooltipPosition();
      }, 300);
      window.addEventListener('resize', updateTooltipPosition);
      return () => {
        clearTimeout(timer);
        window.removeEventListener('resize', updateTooltipPosition);
      };
    }
  }, [runTour, currentStep, loading]);

  const handleTourNext = () => {
    if (currentStep < tourSteps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      setRunTour(false);
    }
  };

  const handleTourPrev = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const generateDefaultSummary = (p) => {
    return `Disciplined and highly motivated transition veteran with ${p.years_of_service || '4'} years of dedicated service in the ${p.service_branch || 'Armed Forces'}. Proven expertise in operations coordination, team supervision, and security logistics. Ready to leverage leadership, stress management, and core technical skills to drive efficiency in corporate business environments.`;
  };

  const autoGenerateSummary = () => {
    const summaryText = `Dedicated and results-oriented professional transitioning from the ${serviceHistory.branch || 'Armed Forces'} as ${serviceHistory.rank || 'Agniveer'} with specialized training in ${serviceHistory.trade || 'Operations'}. Handled tactical security coordination, risk assessment, and resource planning. Exhibited strong leadership, adaptability, and high commitment in volatile environments. Seeking to utilize strategic planning, logistics oversight, and crisis management skills in a corporate operations role.`;
    setPersonalDetails(prev => ({ ...prev, summary: summaryText }));
  };

  const handleAddExperience = () => {
    setExperience([...experience, { title: '', org: '', location: '', start: '', end: '', bullets: '' }]);
  };

  const handleRemoveExperience = (idx) => {
    setExperience(experience.filter((_, i) => i !== idx));
  };

  const handleUpdateExperience = (idx, field, value) => {
    const updated = [...experience];
    updated[idx][field] = value;
    setExperience(updated);
  };

  const handleAddEducation = () => {
    setEducation([...education, { degree: '', school: '', year: '', score: '' }]);
  };

  const handleRemoveEducation = (idx) => {
    setEducation(education.filter((_, i) => i !== idx));
  };

  const handleUpdateEducation = (idx, field, value) => {
    const updated = [...education];
    updated[idx][field] = value;
    setEducation(updated);
  };

  const handleAddCert = () => {
    setCertifications([...certifications, { title: '', body: '', year: '' }]);
  };

  const handleRemoveCert = (idx) => {
    setCertifications(certifications.filter((_, i) => i !== idx));
  };

  const handleUpdateCert = (idx, field, value) => {
    const updated = [...certifications];
    updated[idx][field] = value;
    setCertifications(updated);
  };

  const handleAddSkill = () => {
    if (newSkill.trim() && !skills.includes(newSkill.trim())) {
      setSkills([...skills, newSkill.trim()]);
      setNewSkill('');
    }
  };

  const handleRemoveSkill = (skill) => {
    setSkills(skills.filter(s => s !== skill));
  };

  const handlePrint = () => {
    window.print();
    awardPoints('RESUME_BUILT');
  };

  const getSpacingStyle = () => {
    if (spacing === 'compact') return { padding: '1.25rem', gap: '0.5rem', marginBottom: '0.4rem', lineHeight: 1.3 };
    if (spacing === 'spacious') return { padding: '2.5rem', gap: '1rem', marginBottom: '1rem', lineHeight: 1.8 };
    return { padding: '2rem', gap: '0.75rem', marginBottom: '0.65rem', lineHeight: 1.5 };
  };

  const getFontFamily = () => {
    if (fontFamily === 'Georgia') return 'Georgia, serif';
    if (fontFamily === 'Garamond') return '"EB Garamond", Garamond, serif';
    if (fontFamily === 'Roboto') return '"Roboto", sans-serif';
    return '"Inter", sans-serif';
  };

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: 'var(--ios-bg)' }}>
      <RefreshCw className="animate-spin" size={32} color="var(--ios-olive)" />
    </div>
  );

  return (
    <div className="cv-builder-wrapper">
      {/* Settings Header bar */}
      <div className="builder-header no-print">
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <button onClick={() => navigate('/dashboard')} className="back-btn-builder">
            <ArrowLeft size={16} /> Back
          </button>
          <button
            onClick={() => { setCurrentStep(0); setRunTour(true); }}
            className="back-btn-builder"
            style={{ marginLeft: '0.75rem', background: 'rgba(75, 107, 50, 0.1)', borderColor: 'rgba(75, 107, 50, 0.3)', color: 'var(--ios-olive)' }}
          >
            <Sparkles size={14} /> Replay Tour
          </button>
        </div>
        <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <div>
            <label style={labelHeaderStyle}>Template</label>
            <select id="tour-template-selector" value={selectedTemplate} onChange={e => setSelectedTemplate(e.target.value)} style={selectStyle}>
              <option value="modern">Modern Minimalist</option>
              <option value="corporate">Corporate Executive</option>
              <option value="tech">Tech Specialist</option>
              <option value="military">Military Translator</option>
              <option value="traditional">Elegant Traditional</option>
            </select>
          </div>

          <div id="tour-format-controls" style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <div>
              <label style={labelHeaderStyle}>Spacing</label>
              <select value={spacing} onChange={e => setSpacing(e.target.value)} style={selectStyle}>
                <option value="compact">Compact</option>
                <option value="normal">Normal</option>
                <option value="spacious">Spacious</option>
              </select>
            </div>

            <div>
              <label style={labelHeaderStyle}>Font</label>
              <select value={fontFamily} onChange={e => setFontFamily(e.target.value)} style={selectStyle}>
                <option value="Inter">Inter</option>
                <option value="Roboto">Roboto</option>
                <option value="Georgia">Georgia</option>
                <option value="Garamond">Garamond</option>
              </select>
            </div>

            <div>
              <label style={labelHeaderStyle}>Accent</label>
              <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                {['#4b6b32', '#334155', '#1e3a8a', '#7f1d1d', '#0284c7'].map(c => (
                  <button 
                    key={c} 
                    onClick={() => setAccentColor(c)} 
                    style={{
                      width: '18px', height: '18px', borderRadius: '50%', background: c,
                      border: accentColor === c ? '2px solid white' : 'none',
                      boxShadow: '0 0 4px rgba(0,0,0,0.2)', cursor: 'pointer'
                    }}
                  />
                ))}
              </div>
            </div>
          </div>

          <button id="tour-save-pdf" onClick={handlePrint} className="btn-primary ios-pill print-download-btn">
            <Download size={16} /> Save / Print PDF
          </button>
        </div>
      </div>

      <div className="builder-workspace">
        {/* Forms Sidebar (no-print) */}
        <div id="tour-sidebar-form" className="builder-sidebar no-print">
          <h2 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Settings size={18} color="var(--ios-olive)" /> CV Details Builder
          </h2>

          {/* Form Segment: Personal info */}
          <div className="form-card-segment">
            <h3 className="segment-title">Personal Details</h3>
            <div className="form-grid-inner">
              <input type="text" placeholder="Full Name" value={personalDetails.fullName} onChange={e => setPersonalDetails({ ...personalDetails, fullName: e.target.value })} style={inputFieldStyle} />
              <input type="email" placeholder="Corporate Email" value={personalDetails.email} onChange={e => setPersonalDetails({ ...personalDetails, email: e.target.value })} style={inputFieldStyle} />
              <input type="text" placeholder="Contact Mobile" value={personalDetails.phone} onChange={e => setPersonalDetails({ ...personalDetails, phone: e.target.value })} style={inputFieldStyle} />
              <input type="text" placeholder="LinkedIn Profile URL" value={personalDetails.linkedin} onChange={e => setPersonalDetails({ ...personalDetails, linkedin: e.target.value })} style={inputFieldStyle} />
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input type="text" placeholder="City" value={personalDetails.city} onChange={e => setPersonalDetails({ ...personalDetails, city: e.target.value })} style={{ ...inputFieldStyle, flex: 1 }} />
                <input type="text" placeholder="State" value={personalDetails.state} onChange={e => setPersonalDetails({ ...personalDetails, state: e.target.value })} style={{ ...inputFieldStyle, flex: 1 }} />
              </div>
            </div>
          </div>

          {/* Form Segment: Summary */}
          <div className="form-card-segment">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <h3 className="segment-title" style={{ margin: 0 }}>Professional Summary</h3>
              <button id="tour-ai-summary" onClick={autoGenerateSummary} className="btn-secondary ios-pill ai-suggest-btn">
                <Sparkles size={11} /> AI Autogenerate
              </button>
            </div>
            <textarea placeholder="Write a summary highlighting your discipline, skills, and operations value..." value={personalDetails.summary} onChange={e => setPersonalDetails({ ...personalDetails, summary: e.target.value })} style={textareaFieldStyle} />
          </div>

          {/* Form Segment: Service details */}
          <div className="form-card-segment">
            <h3 className="segment-title">Military Service Track</h3>
            <div className="form-grid-inner">
              <input type="text" placeholder="Service Branch" value={serviceHistory.branch} onChange={e => setServiceHistory({ ...serviceHistory, branch: e.target.value })} style={inputFieldStyle} />
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input type="text" placeholder="Rank" value={serviceHistory.rank} onChange={e => setServiceHistory({ ...serviceHistory, rank: e.target.value })} style={{ ...inputFieldStyle, flex: 1 }} />
                <input type="text" placeholder="Trade / Corps" value={serviceHistory.trade} onChange={e => setServiceHistory({ ...serviceHistory, trade: e.target.value })} style={{ ...inputFieldStyle, flex: 1 }} />
              </div>
              <input type="text" placeholder="Regiment / Unit" value={serviceHistory.regiment} onChange={e => setServiceHistory({ ...serviceHistory, regiment: e.target.value })} style={inputFieldStyle} />
              <input type="text" placeholder="Medals & Commendations" value={serviceHistory.medals} onChange={e => setServiceHistory({ ...serviceHistory, medals: e.target.value })} style={inputFieldStyle} />
            </div>
          </div>

          {/* Form Segment: Skills list */}
          <div id="tour-skills" className="form-card-segment">
            <h3 className="segment-title">Core Competencies</h3>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
              <input type="text" placeholder="Add corporate skill..." value={newSkill} onChange={e => setNewSkill(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddSkill()} style={{ ...inputFieldStyle, margin: 0 }} />
              <button onClick={handleAddSkill} style={addBtnStyle}><Plus size={16} /></button>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
              {skills.map(s => (
                <span key={s} className="skill-item-pill">
                  {s} <Trash2 size={10} onClick={() => handleRemoveSkill(s)} style={{ cursor: 'pointer', marginLeft: '4px' }} />
                </span>
              ))}
            </div>
          </div>

          {/* Form Segment: Work Experience */}
          <div className="form-card-segment">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <h3 className="segment-title" style={{ margin: 0 }}>Experience / Projects</h3>
              <button onClick={handleAddExperience} style={circleAddBtnStyle}><Plus size={14} /></button>
            </div>
            {experience.map((exp, idx) => (
              <div key={idx} className="form-array-item">
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '0.25rem' }}>
                  <Trash2 size={14} color="#ef4444" onClick={() => handleRemoveExperience(idx)} style={{ cursor: 'pointer' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <input type="text" placeholder="Job Title / Assignment" value={exp.title} onChange={e => handleUpdateExperience(idx, 'title', e.target.value)} style={inputFieldStyle} />
                  <input type="text" placeholder="Organization / Regiment" value={exp.org} onChange={e => handleUpdateExperience(idx, 'org', e.target.value)} style={inputFieldStyle} />
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input type="text" placeholder="Start Year" value={exp.start} onChange={e => handleUpdateExperience(idx, 'start', e.target.value)} style={{ ...inputFieldStyle, flex: 1 }} />
                    <input type="text" placeholder="End Year / Present" value={exp.end} onChange={e => handleUpdateExperience(idx, 'end', e.target.value)} style={{ ...inputFieldStyle, flex: 1 }} />
                  </div>
                  <textarea placeholder="Achievements, leadership duties, logistial support details..." value={exp.bullets} onChange={e => handleUpdateExperience(idx, 'bullets', e.target.value)} style={textareaFieldStyle} />
                </div>
              </div>
            ))}
          </div>

          {/* Form Segment: Education */}
          <div className="form-card-segment">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <h3 className="segment-title" style={{ margin: 0 }}>Education</h3>
              <button onClick={handleAddEducation} style={circleAddBtnStyle}><Plus size={14} /></button>
            </div>
            {education.map((edu, idx) => (
              <div key={idx} className="form-array-item">
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '0.25rem' }}>
                  <Trash2 size={14} color="#ef4444" onClick={() => handleRemoveEducation(idx)} style={{ cursor: 'pointer' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <input type="text" placeholder="Degree / Certificate" value={edu.degree} onChange={e => handleUpdateEducation(idx, 'degree', e.target.value)} style={inputFieldStyle} />
                  <input type="text" placeholder="School / University / Board" value={edu.school} onChange={e => handleUpdateEducation(idx, 'school', e.target.value)} style={inputFieldStyle} />
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input type="text" placeholder="Passing Year" value={edu.year} onChange={e => handleUpdateEducation(idx, 'year', e.target.value)} style={{ ...inputFieldStyle, flex: 1 }} />
                    <input type="text" placeholder="Score / %" value={edu.score} onChange={e => handleUpdateEducation(idx, 'score', e.target.value)} style={{ ...inputFieldStyle, flex: 1 }} />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Form Segment: Certifications */}
          <div className="form-card-segment">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <h3 className="segment-title" style={{ margin: 0 }}>Certifications</h3>
              <button onClick={handleAddCert} style={circleAddBtnStyle}><Plus size={14} /></button>
            </div>
            {certifications.map((cert, idx) => (
              <div key={idx} className="form-array-item">
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '0.25rem' }}>
                  <Trash2 size={14} color="#ef4444" onClick={() => handleRemoveCert(idx)} style={{ cursor: 'pointer' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <input type="text" placeholder="Certification Title" value={cert.title} onChange={e => handleUpdateCert(idx, 'title', e.target.value)} style={inputFieldStyle} />
                  <input type="text" placeholder="Issuing Body" value={cert.body} onChange={e => handleUpdateCert(idx, 'body', e.target.value)} style={inputFieldStyle} />
                  <input type="text" placeholder="Date / Year" value={cert.year} onChange={e => handleUpdateCert(idx, 'year', e.target.value)} style={inputFieldStyle} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Live CV Render Window */}
        <div id="tour-preview-canvas" className="builder-preview-canvas">
          <div 
            id="cv-paper" 
            className={`cv-paper-sheet template-${selectedTemplate}`} 
            style={{ 
              fontFamily: getFontFamily(),
              ...getSpacingStyle()
            }}
          >
            {/* ── TEMPLATE 1: MODERN MINIMALIST ── */}
            {selectedTemplate === 'modern' && (
              <>
                <div style={{ borderBottom: `3px solid ${accentColor}`, paddingBottom: '1rem', marginBottom: '1.25rem' }}>
                  <h1 style={{ fontSize: '2.2rem', fontWeight: 800, color: '#1e293b', margin: 0, textTransform: 'uppercase', letterSpacing: '-0.02em' }}>
                    {personalDetails.fullName || 'YOUR NAME'}
                  </h1>
                  <p style={{ color: accentColor, fontWeight: 700, fontSize: '0.95rem', marginTop: '0.25rem', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                    {serviceHistory.rank ? `${serviceHistory.rank} (${serviceHistory.branch})` : 'Transitioning Defense Professional'}
                  </p>
                  
                  <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginTop: '0.75rem', fontSize: '0.8rem', color: '#64748b' }}>
                    {personalDetails.email && <span><Mail size={12} style={iconMini} /> {personalDetails.email}</span>}
                    {personalDetails.phone && <span><Phone size={12} style={iconMini} /> {personalDetails.phone}</span>}
                    {personalDetails.city && <span><MapPin size={12} style={iconMini} /> {personalDetails.city}, {personalDetails.state}</span>}
                    {personalDetails.linkedin && <span><LinkIcon size={12} style={iconMini} /> {personalDetails.linkedin}</span>}
                  </div>
                </div>

                <div style={sectionSpacing}>
                  <p style={{ fontSize: '0.88rem', color: '#334155', lineHeight: 1.6, margin: 0 }}>
                    {personalDetails.summary}
                  </p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '7fr 3fr', gap: '2rem' }}>
                  <div>
                    <h2 style={{ ...sectionTitleStyle, color: '#0f172a', borderBottom: `1px solid #e2e8f0` }}>Experience</h2>
                    {experience.map((exp, idx) => (
                      <div key={idx} style={{ marginBottom: '1rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                          <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#1e293b', margin: 0 }}>{exp.title}</h4>
                          <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>{exp.start} – {exp.end}</span>
                        </div>
                        <p style={{ fontSize: '0.82rem', color: accentColor, fontWeight: 700, margin: '0.1rem 0 0.4rem' }}>{exp.org} • {exp.location}</p>
                        <p style={{ fontSize: '0.82rem', color: '#475569', lineHeight: 1.5, margin: 0 }}>{exp.bullets}</p>
                      </div>
                    ))}
                  </div>

                  <div>
                    <h2 style={{ ...sectionTitleStyle, color: '#0f172a', borderBottom: `1px solid #e2e8f0` }}>Key Competencies</h2>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginBottom: '1.5rem' }}>
                      {skills.map(s => (
                        <span key={s} style={{ background: '#f1f5f9', color: '#334155', fontSize: '0.75rem', padding: '0.25rem 0.5rem', borderRadius: '4px', fontWeight: 600 }}>
                          {s}
                        </span>
                      ))}
                    </div>

                    <h2 style={{ ...sectionTitleStyle, color: '#0f172a', borderBottom: `1px solid #e2e8f0` }}>Education</h2>
                    {education.map((edu, idx) => (
                      <div key={idx} style={{ marginBottom: '0.75rem' }}>
                        <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1e293b', margin: 0 }}>{edu.degree}</h4>
                        <p style={{ fontSize: '0.78rem', color: '#475569', margin: '0.1rem 0 0.15rem' }}>{edu.school}</p>
                        <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: 0 }}>Passed {edu.year} • Marks: {edu.score}</p>
                      </div>
                    ))}

                    {certifications.length > 0 && (
                      <>
                        <h2 style={{ ...sectionTitleStyle, color: '#0f172a', borderBottom: `1px solid #e2e8f0`, marginTop: '1.25rem' }}>Certifications</h2>
                        {certifications.map((cert, idx) => (
                          <div key={idx} style={{ marginBottom: '0.65rem' }}>
                            <h4 style={{ fontSize: '0.8rem', fontWeight: 700, color: '#1e293b', margin: 0 }}>{cert.title}</h4>
                            <p style={{ fontSize: '0.75rem', color: '#64748b', margin: 0 }}>{cert.body} ({cert.year})</p>
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* ── TEMPLATE 2: CORPORATE EXECUTIVE ── */}
            {selectedTemplate === 'corporate' && (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '3fr 7fr', gap: '2rem' }}>
                  {/* Left Column (Sidebar) */}
                  <div style={{ background: '#f8fafc', padding: '1.5rem', borderRadius: '12px', borderLeft: `4px solid ${accentColor}` }}>
                    <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.25rem', letterSpacing: '-0.02em', textTransform: 'uppercase' }}>
                      {personalDetails.fullName || 'YOUR NAME'}
                    </h1>
                    <p style={{ color: accentColor, fontWeight: 700, fontSize: '0.85rem', marginBottom: '1.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      {serviceHistory.rank || 'Transitioning Officer'}
                    </p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', fontSize: '0.78rem', color: '#475569', marginBottom: '1.5rem' }}>
                      {personalDetails.email && <div style={sideInfoBlock}><Mail size={12} style={{ color: accentColor }} /> {personalDetails.email}</div>}
                      {personalDetails.phone && <div style={sideInfoBlock}><Phone size={12} style={{ color: accentColor }} /> {personalDetails.phone}</div>}
                      {personalDetails.city && <div style={sideInfoBlock}><MapPin size={12} style={{ color: accentColor }} /> {personalDetails.city}, {personalDetails.state}</div>}
                      {personalDetails.linkedin && <div style={sideInfoBlock}><LinkIcon size={12} style={{ color: accentColor }} /> {personalDetails.linkedin}</div>}
                    </div>

                    <h3 style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', borderBottom: `2px solid ${accentColor}`, paddingBottom: '0.2rem', marginBottom: '0.5rem' }}>Competencies</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', marginBottom: '1.5rem' }}>
                      {skills.map(s => (
                        <span key={s} style={{ fontSize: '0.78rem', color: '#334155', fontWeight: 500 }}>
                          • {s}
                        </span>
                      ))}
                    </div>

                    <h3 style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', borderBottom: `2px solid ${accentColor}`, paddingBottom: '0.2rem', marginBottom: '0.5rem' }}>Military Credentials</h3>
                    <div style={{ fontSize: '0.75rem', color: '#475569', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                      <div><strong>Branch:</strong> {serviceHistory.branch}</div>
                      <div><strong>Regiment:</strong> {serviceHistory.regiment}</div>
                      <div><strong>Trade:</strong> {serviceHistory.trade}</div>
                      {serviceHistory.medals && <div><strong>Decorations:</strong> {serviceHistory.medals}</div>}
                    </div>
                  </div>

                  {/* Right Column (Main content) */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div>
                      <h2 style={{ ...sectionTitleStyle, color: accentColor }}>Executive Summary</h2>
                      <p style={{ fontSize: '0.85rem', color: '#334155', lineHeight: 1.6, margin: 0 }}>
                        {personalDetails.summary}
                      </p>
                    </div>

                    <div>
                      <h2 style={{ ...sectionTitleStyle, color: accentColor }}>Professional Milestones</h2>
                      {experience.map((exp, idx) => (
                        <div key={idx} style={{ marginBottom: '1.25rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                            <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#1e293b', margin: 0 }}>{exp.title}</h4>
                            <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>{exp.start} – {exp.end}</span>
                          </div>
                          <p style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: 700, margin: '0.15rem 0 0.4rem' }}>
                            {exp.org} • <span style={{ color: accentColor }}>{exp.location}</span>
                          </p>
                          <p style={{ fontSize: '0.82rem', color: '#475569', lineHeight: 1.5, margin: 0 }}>{exp.bullets}</p>
                        </div>
                      ))}
                    </div>

                    <div>
                      <h2 style={{ ...sectionTitleStyle, color: accentColor }}>Education & Academic Track</h2>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        {education.map((edu, idx) => (
                          <div key={idx}>
                            <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1e293b', margin: 0 }}>{edu.degree}</h4>
                            <p style={{ fontSize: '0.78rem', color: '#475569', margin: '0.1rem 0' }}>{edu.school}</p>
                            <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: 0 }}>Passed {edu.year} • Marks: {edu.score}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* ── TEMPLATE 3: TECH SPECIALIST ── */}
            {selectedTemplate === 'tech' && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: `2px solid ${accentColor}`, paddingBottom: '1rem', marginBottom: '1.5rem' }}>
                  <div>
                    <h1 style={{ fontSize: '2rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                      {personalDetails.fullName || 'YOUR NAME'}
                    </h1>
                    <p style={{ color: accentColor, fontWeight: 700, fontSize: '0.9rem', marginTop: '0.2rem' }}>
                      {serviceHistory.trade || 'Systems Analyst / Specialist'}
                    </p>
                  </div>
                  <div style={{ textAlign: 'right', fontSize: '0.78rem', color: '#64748b', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    {personalDetails.email && <span>{personalDetails.email}</span>}
                    {personalDetails.phone && <span>{personalDetails.phone}</span>}
                    {personalDetails.city && <span>{personalDetails.city}, {personalDetails.state}</span>}
                    {personalDetails.linkedin && <span style={{ color: accentColor }}>{personalDetails.linkedin}</span>}
                  </div>
                </div>

                <div style={sectionSpacing}>
                  <p style={{ fontSize: '0.85rem', color: '#334155', lineHeight: 1.6, margin: 0 }}>
                    {personalDetails.summary}
                  </p>
                </div>

                <div style={sectionSpacing}>
                  <h2 style={{ ...sectionTitleStyle, color: accentColor, textTransform: 'uppercase', fontSize: '0.9rem', borderBottom: '1px solid #f1f5f9' }}>Technical Skills & Tools</h2>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                    {skills.map(s => (
                      <span key={s} style={{ background: '#0f172a', color: 'white', fontSize: '0.72rem', padding: '0.3rem 0.6rem', borderRadius: '4px', fontWeight: 600 }}>
                        {s}
                      </span>
                    ))}
                  </div>
                </div>

                <div style={sectionSpacing}>
                  <h2 style={{ ...sectionTitleStyle, color: accentColor, textTransform: 'uppercase', fontSize: '0.9rem', borderBottom: '1px solid #f1f5f9' }}>Operational Experience</h2>
                  {experience.map((exp, idx) => (
                    <div key={idx} style={{ marginBottom: '1.25rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                        <h4 style={{ fontSize: '0.9' + 'rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                          {exp.title} <span style={{ color: '#64748b', fontWeight: 500 }}>at {exp.org}</span>
                        </h4>
                        <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>{exp.start} – {exp.end}</span>
                      </div>
                      <p style={{ fontSize: '0.8rem', color: '#475569', margin: '0.4rem 0 0', lineHeight: 1.5 }}>{exp.bullets}</p>
                    </div>
                  ))}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                  <div>
                    <h2 style={{ ...sectionTitleStyle, color: accentColor, textTransform: 'uppercase', fontSize: '0.9rem', borderBottom: '1px solid #f1f5f9' }}>Education</h2>
                    {education.map((edu, idx) => (
                      <div key={idx} style={{ marginBottom: '0.5rem' }}>
                        <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>{edu.degree}</h4>
                        <p style={{ fontSize: '0.78rem', color: '#475569', margin: '0.1rem 0' }}>{edu.school} ({edu.year}) • {edu.score}</p>
                      </div>
                    ))}
                  </div>

                  <div>
                    <h2 style={{ ...sectionTitleStyle, color: accentColor, textTransform: 'uppercase', fontSize: '0.9rem', borderBottom: '1px solid #f1f5f9' }}>Certifications</h2>
                    {certifications.map((cert, idx) => (
                      <div key={idx} style={{ marginBottom: '0.5rem' }}>
                        <h4 style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>{cert.title}</h4>
                        <p style={{ fontSize: '0.75rem', color: '#475569', margin: 0 }}>{cert.body} • {cert.year}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* ── TEMPLATE 4: MILITARY TRANSLATOR ── */}
            {selectedTemplate === 'military' && (
              <>
                <div style={{ borderLeft: `6px solid ${accentColor}`, paddingLeft: '1.25rem', marginBottom: '1.5rem' }}>
                  <h1 style={{ fontSize: '2.1rem', fontWeight: 900, color: '#111827', margin: 0, textTransform: 'uppercase', letterSpacing: '-0.02em' }}>
                    {personalDetails.fullName || 'YOUR NAME'}
                  </h1>
                  <p style={{ color: '#4b5563', fontWeight: 700, fontSize: '0.95rem', marginTop: '0.2rem' }}>
                    Transitioning Operations Leader • {serviceHistory.rank || 'Armed Forces'}
                  </p>
                  
                  <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginTop: '0.5rem', fontSize: '0.78rem', color: '#6b7280' }}>
                    {personalDetails.email && <span>Email: {personalDetails.email}</span>}
                    {personalDetails.phone && <span>Mob: {personalDetails.phone}</span>}
                    {personalDetails.city && <span>Location: {personalDetails.city}, {personalDetails.state}</span>}
                    {personalDetails.linkedin && <span>LinkedIn: {personalDetails.linkedin}</span>}
                  </div>
                </div>

                <div style={sectionSpacing}>
                  <h2 style={{ ...sectionTitleStyle, color: accentColor, borderBottom: `2px solid ${accentColor}`, paddingBottom: '0.25rem' }}>Professional Profile Summary</h2>
                  <p style={{ fontSize: '0.85rem', color: '#374151', lineHeight: 1.6, margin: 0 }}>
                    {personalDetails.summary}
                  </p>
                </div>

                {/* Military Service & Leadership Table */}
                <div style={sectionSpacing}>
                  <h2 style={{ ...sectionTitleStyle, color: accentColor, borderBottom: `2px solid ${accentColor}`, paddingBottom: '0.25rem' }}>Service Overview</h2>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '1rem', background: '#f9fafb', padding: '1rem', borderRadius: '8px', border: '1px solid #f3f4f6' }}>
                    <div>
                      <span style={{ fontSize: '0.7rem', color: '#9ca3af', fontWeight: 700, textTransform: 'uppercase' }}>Branch</span>
                      <p style={{ fontSize: '0.82rem', fontWeight: 700, color: '#111827', margin: '0.15rem 0 0' }}>{serviceHistory.branch}</p>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.7rem', color: '#9ca3af', fontWeight: 700, textTransform: 'uppercase' }}>Regiment / Unit</span>
                      <p style={{ fontSize: '0.82rem', fontWeight: 700, color: '#111827', margin: '0.15rem 0 0' }}>{serviceHistory.regiment}</p>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.7rem', color: '#9ca3af', fontWeight: 700, textTransform: 'uppercase' }}>Trade Skill</span>
                      <p style={{ fontSize: '0.82rem', fontWeight: 700, color: '#111827', margin: '0.15rem 0 0' }}>{serviceHistory.trade}</p>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.7rem', color: '#9ca3af', fontWeight: 700, textTransform: 'uppercase' }}>Decorations</span>
                      <p style={{ fontSize: '0.82rem', fontWeight: 700, color: '#111827', margin: '0.15rem 0 0' }}>{serviceHistory.medals || 'None Listed'}</p>
                    </div>
                  </div>
                </div>

                <div style={sectionSpacing}>
                  <h2 style={{ ...sectionTitleStyle, color: accentColor, borderBottom: `2px solid ${accentColor}`, paddingBottom: '0.25rem' }}>Core Value-Add Skills (ATS Aligned)</h2>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                    {skills.map(s => (
                      <span key={s} style={{ background: '#f3f4f6', border: '1px solid #e5e7eb', color: '#1f2937', fontSize: '0.75rem', padding: '0.25rem 0.5rem', borderRadius: '6px', fontWeight: 600 }}>
                        {s}
                      </span>
                    ))}
                  </div>
                </div>

                <div style={sectionSpacing}>
                  <h2 style={{ ...sectionTitleStyle, color: accentColor, borderBottom: `2px solid ${accentColor}`, paddingBottom: '0.25rem' }}>Experience Track & Accomplishments</h2>
                  {experience.map((exp, idx) => (
                    <div key={idx} style={{ marginBottom: '1.25rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                        <h4 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#111827', margin: 0 }}>{exp.title}</h4>
                        <span style={{ fontSize: '0.8rem', color: '#4b5563', fontWeight: 600 }}>{exp.start} – {exp.end}</span>
                      </div>
                      <p style={{ fontSize: '0.82rem', color: accentColor, fontWeight: 700, margin: '0.15rem 0' }}>
                        {exp.org} • {exp.location}
                      </p>
                      <p style={{ fontSize: '0.82rem', color: '#374151', lineHeight: 1.5, margin: 0 }}>{exp.bullets}</p>
                    </div>
                  ))}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                  <div>
                    <h2 style={{ ...sectionTitleStyle, color: accentColor, borderBottom: `2px solid ${accentColor}`, paddingBottom: '0.25rem' }}>Education</h2>
                    {education.map((edu, idx) => (
                      <div key={idx} style={{ marginBottom: '0.5rem' }}>
                        <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#111827', margin: 0 }}>{edu.degree}</h4>
                        <p style={{ fontSize: '0.78rem', color: '#475569', margin: '0.1rem 0' }}>{edu.school} ({edu.year}) • {edu.score}</p>
                      </div>
                    ))}
                  </div>

                  <div>
                    <h2 style={{ ...sectionTitleStyle, color: accentColor, borderBottom: `2px solid ${accentColor}`, paddingBottom: '0.25rem' }}>Professional Certifications</h2>
                    {certifications.map((cert, idx) => (
                      <div key={idx} style={{ marginBottom: '0.5rem' }}>
                        <h4 style={{ fontSize: '0.82rem', fontWeight: 700, color: '#111827', margin: 0 }}>{cert.title}</h4>
                        <p style={{ fontSize: '0.75rem', color: '#475569', margin: 0 }}>{cert.body} ({cert.year})</p>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* ── TEMPLATE 5: ELEGANT TRADITIONAL ── */}
            {selectedTemplate === 'traditional' && (
              <>
                <div style={{ textAlign: 'center', marginBottom: '1.5rem', borderBottom: '1px solid #94a3b8', paddingBottom: '1.25rem' }}>
                  <h1 style={{ fontSize: '2rem', fontFamily: 'Georgia, serif', fontWeight: 'normal', color: '#000', margin: '0 0 0.5rem' }}>
                    {personalDetails.fullName || 'YOUR NAME'}
                  </h1>
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem', flexWrap: 'wrap', fontSize: '0.8rem', color: '#475569' }}>
                    {personalDetails.email && <span>{personalDetails.email}</span>}
                    {personalDetails.phone && <span>· {personalDetails.phone}</span>}
                    {personalDetails.city && <span>· {personalDetails.city}, {personalDetails.state}</span>}
                    {personalDetails.linkedin && <span>· {personalDetails.linkedin}</span>}
                  </div>
                  {serviceHistory.branch && (
                    <p style={{ fontStyle: 'italic', fontSize: '0.85rem', color: accentColor, margin: '0.5rem 0 0' }}>
                      {serviceHistory.rank || 'Officer'} • {serviceHistory.branch} • {serviceHistory.trade}
                    </p>
                  )}
                </div>

                <div style={sectionSpacing}>
                  <p style={{ fontSize: '0.85rem', color: '#334155', lineHeight: 1.6, textAlign: 'justify', margin: 0 }}>
                    {personalDetails.summary}
                  </p>
                </div>

                <div style={sectionSpacing}>
                  <h2 style={{ ...sectionTitleStyle, color: '#000', fontFamily: 'Georgia, serif', borderBottom: '1px solid #94a3b8', textTransform: 'uppercase', fontSize: '0.9rem' }}>Professional Experience</h2>
                  {experience.map((exp, idx) => (
                    <div key={idx} style={{ marginBottom: '1.25rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                        <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#000', margin: 0 }}>{exp.title}</h4>
                        <span style={{ fontSize: '0.8rem', color: '#475569', fontStyle: 'italic' }}>{exp.start} – {exp.end}</span>
                      </div>
                      <p style={{ fontSize: '0.8rem', fontWeight: 600, color: accentColor, margin: '0.15rem 0 0.35rem' }}>{exp.org} – {exp.location}</p>
                      <p style={{ fontSize: '0.82rem', color: '#334155', lineHeight: 1.5, textAlign: 'justify', margin: 0 }}>{exp.bullets}</p>
                    </div>
                  ))}
                </div>

                <div style={sectionSpacing}>
                  <h2 style={{ ...sectionTitleStyle, color: '#000', fontFamily: 'Georgia, serif', borderBottom: '1px solid #94a3b8', textTransform: 'uppercase', fontSize: '0.9rem' }}>Education</h2>
                  {education.map((edu, idx) => (
                    <div key={idx} style={{ marginBottom: '0.65rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                        <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#000', margin: 0 }}>{edu.degree}</h4>
                        <span style={{ fontSize: '0.8rem', color: '#475569' }}>Class of {edu.year}</span>
                      </div>
                      <p style={{ fontSize: '0.8rem', color: '#475569', margin: '0.1rem 0' }}>{edu.school} • Grade / Score: {edu.score}</p>
                    </div>
                  ))}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                  <div>
                    <h2 style={{ ...sectionTitleStyle, color: '#000', fontFamily: 'Georgia, serif', borderBottom: '1px solid #94a3b8', textTransform: 'uppercase', fontSize: '0.9rem' }}>Core Skills</h2>
                    <ul style={{ paddingLeft: '1.25rem', fontSize: '0.8rem', color: '#334155', margin: 0 }}>
                      {skills.map(s => <li key={s} style={{ marginBottom: '0.25rem' }}>{s}</li>)}
                    </ul>
                  </div>

                  <div>
                    <h2 style={{ ...sectionTitleStyle, color: '#000', fontFamily: 'Georgia, serif', borderBottom: '1px solid #94a3b8', textTransform: 'uppercase', fontSize: '0.9rem' }}>Certifications</h2>
                    {certifications.map((cert, idx) => (
                      <div key={idx} style={{ marginBottom: '0.5rem', fontSize: '0.8rem' }}>
                        <strong>{cert.title}</strong>
                        <div style={{ color: '#475569', fontSize: '0.75rem' }}>{cert.body} ({cert.year})</div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Guided Tour Spotlight Overlay */}
      {runTour && (
        <>
          {/* Spotlight hole */}
          <div style={{
            position: 'fixed',
            top: highlightRect.top - 4,
            left: highlightRect.left - 4,
            width: highlightRect.width + 8,
            height: highlightRect.height + 8,
            borderRadius: '8px',
            boxShadow: '0 0 0 9999px rgba(15, 23, 42, 0.65), 0 0 15px var(--ios-olive)',
            border: '2px solid var(--ios-olive)',
            zIndex: 100,
            transition: 'all 0.3s ease',
            pointerEvents: 'none'
          }} />

          {/* Floating Tooltip Card */}
          <div style={{
            position: 'fixed',
            top: tooltipPos.top,
            left: tooltipPos.left,
            width: '320px',
            background: 'var(--surface)',
            border: '1px solid var(--border-strong)',
            borderRadius: 'var(--radius-lg)',
            padding: '1.25rem',
            boxShadow: 'var(--shadow-3)',
            zIndex: 101,
            color: 'var(--ios-text)',
            fontFamily: "'Inter', sans-serif",
            transition: 'all 0.3s ease'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.7rem', color: 'var(--ios-olive)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Step {currentStep + 1} of {tourSteps.length}
              </span>
              <button
                onClick={() => setRunTour(false)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 600 }}
              >
                Skip Tour
              </button>
            </div>

            <h4 style={{ fontSize: '0.95rem', fontWeight: 700, margin: '0 0 0.5rem', color: 'var(--ios-text)' }}>
              {tourSteps[currentStep].title}
            </h4>
            <p style={{ fontSize: '0.8rem', color: '#64748b', lineHeight: 1.4, margin: '0 0 1rem' }}>
              {tourSteps[currentStep].desc}
            </p>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button
                onClick={handleTourPrev}
                disabled={currentStep === 0}
                style={{
                  background: 'transparent', border: '1px solid var(--border)',
                  color: currentStep === 0 ? '#cbd5e1' : 'var(--ios-text)',
                  padding: '0.4rem 0.8rem', borderRadius: 'var(--radius-sm)', fontSize: '0.75rem',
                  cursor: currentStep === 0 ? 'default' : 'pointer', fontWeight: 600
                }}
              >
                Back
              </button>

              <button
                onClick={handleTourNext}
                style={{
                  background: 'var(--ios-olive)', border: 'none',
                  color: 'white', padding: '0.4rem 1rem', borderRadius: 'var(--radius-sm)', fontSize: '0.75rem',
                  cursor: 'pointer', fontWeight: 700, boxShadow: 'var(--shadow-1)'
                }}
              >
                {currentStep === tourSteps.length - 1 ? 'Finish' : 'Next'}
              </button>
            </div>
          </div>
        </>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        .cv-builder-wrapper {
          min-height: 100vh;
          background: var(--ios-bg);
          color: var(--ios-text);
          padding-top: 64px;
        }
        .builder-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: var(--surface);
          border-bottom: 1px solid var(--border);
          padding: 0.75rem 2rem;
          position: sticky;
          top: 64px;
          z-index: 40;
        }
        .back-btn-builder {
          background: transparent;
          border: 1px solid var(--border-strong);
          color: var(--ios-text);
          padding: 0.5rem 1rem;
          border-radius: var(--radius-sm);
          cursor: pointer;
          font-weight: 600;
          font-size: 0.85rem;
          display: flex;
          align-items: center;
          gap: 0.4rem;
        }
        .back-btn-builder:hover {
          background: var(--surface-alt);
        }
        .print-download-btn {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          padding: 0.6rem 1.25rem;
          font-size: 0.85rem;
          text-decoration: none;
          color: white;
        }
        .builder-workspace {
          display: grid;
          grid-template-columns: 380px 1fr;
          height: calc(100vh - 114px);
          overflow: hidden;
        }
        .builder-sidebar {
          background: var(--ios-bg);
          border-right: 1px solid var(--border);
          padding: 2rem 1.5rem;
          overflow-y: auto;
        }
        .form-card-segment {
          background: var(--surface);
          border-radius: var(--radius-md);
          padding: 1.25rem;
          margin-bottom: 1.25rem;
          border: 1px solid var(--border);
          box-shadow: var(--shadow-1);
        }
        .segment-title {
          font-size: 0.88rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: #64748b;
          margin-bottom: 0.75rem;
        }
        .form-grid-inner {
          display: flex;
          flex-direction: column;
          gap: 0.65rem;
        }
        .ai-suggest-btn {
          font-size: 0.68rem;
          padding: 0.3rem 0.75rem;
          background: rgba(75, 107, 50, 0.1);
          color: var(--ios-olive);
          border: 1px solid rgba(75, 107, 50, 0.3);
          cursor: pointer;
        }
        .ai-suggest-btn:hover {
          background: rgba(75, 107, 50, 0.2);
        }
        .skill-item-pill {
          background: rgba(75, 107, 50, 0.1);
          color: var(--ios-olive);
          font-size: 0.75rem;
          padding: 0.3rem 0.6rem;
          border-radius: var(--radius-sm);
          display: flex;
          align-items: center;
          gap: 0.25rem;
          font-weight: 600;
        }
        .form-array-item {
          background: var(--surface-alt);
          border-radius: var(--radius-sm);
          padding: 0.75rem;
          margin-bottom: 0.75rem;
          border: 1px solid var(--border);
        }
        .builder-preview-canvas {
          padding: 2.5rem;
          overflow-y: auto;
          background: var(--surface-alt);
          display: flex;
          justify-content: center;
          align-items: flex-start;
        }
        .cv-paper-sheet {
          background: white;
          color: #1e293b;
          width: 210mm; /* A4 standard width */
          min-height: 297mm; /* A4 standard height */
          box-shadow: 0 10px 40px rgba(0,0,0,0.25);
          border-radius: 4px;
          display: flex;
          flex-direction: column;
          text-align: left;
        }
        @media print {
          @page {
            size: A4;
            margin: 0;
          }
          body {
            background: white;
            color: black;
          }
          .linkedin-header {
            display: none !important;
          }
          .no-print {
            display: none !important;
          }
          .cv-builder-wrapper {
            padding-top: 0 !important;
            background: white !important;
          }
          .builder-workspace {
            display: block !important;
            height: auto !important;
            overflow: visible !important;
          }
          .builder-preview-canvas {
            padding: 0 !important;
            background: white !important;
            overflow: visible !important;
          }
          .cv-paper-sheet {
            box-shadow: none !important;
            width: 100% !important;
            height: auto !important;
            min-height: 0 !important;
            padding: 1.5cm !important;
          }
        }
      `}} />
    </div>
  );
};

// Styling structures
const labelHeaderStyle = {
  display: 'block',
  fontSize: '0.68rem',
  fontWeight: 700,
  textTransform: 'uppercase',
  color: '#64748b',
  marginBottom: '0.2rem',
  letterSpacing: '0.05em'
};

const selectStyle = {
  background: 'var(--surface-alt)',
  color: 'var(--ios-text)',
  border: '1px solid var(--border-strong)',
  borderRadius: '8px',
  padding: '0.4rem 0.75rem',
  fontSize: '0.8rem',
  outline: 'none',
  fontWeight: 600,
  cursor: 'pointer'
};

const inputFieldStyle = {
  background: 'var(--surface-alt)',
  color: 'var(--ios-text)',
  border: '1px solid var(--border)',
  borderRadius: '8px',
  padding: '0.55rem 0.75rem',
  fontSize: '0.82rem',
  outline: 'none',
  width: '100%'
};

const textareaFieldStyle = {
  background: 'var(--surface-alt)',
  color: 'var(--ios-text)',
  border: '1px solid var(--border)',
  borderRadius: '8px',
  padding: '0.55rem 0.75rem',
  fontSize: '0.82rem',
  outline: 'none',
  width: '100%',
  minHeight: '80px',
  resize: 'vertical',
  lineHeight: 1.4
};

const addBtnStyle = {
  background: 'var(--ios-olive)',
  border: 'none',
  color: 'white',
  borderRadius: '8px',
  width: '36px',
  height: '36px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  flexShrink: 0
};

const circleAddBtnStyle = {
  background: 'rgba(75, 107, 50, 0.1)',
  border: 'none',
  color: 'var(--ios-olive)',
  borderRadius: '50%',
  width: '24px',
  height: '24px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer'
};

const sectionTitleStyle = {
  fontSize: '0.95rem',
  fontWeight: 800,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  marginBottom: '0.75rem',
  paddingBottom: '0.2rem'
};

const sectionSpacing = {
  marginBottom: '1.25rem'
};

const iconMini = {
  display: 'inline-block',
  verticalAlign: 'middle',
  marginRight: '2px',
  color: '#94a3b8'
};

const sideInfoBlock = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.4rem',
  lineHeight: 1.3
};

export default CVBuilder;
