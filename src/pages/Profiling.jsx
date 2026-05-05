import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { supabase } from '../lib/supabase';
import { Check, ChevronRight, ChevronLeft, Loader2, Award, Target, BookOpen, Clock, Shield, Briefcase, GraduationCap, Heart } from 'lucide-react';

const ENGINE_URL = import.meta.env.VITE_ENGINE_URL || 'https://veernxt-profiling-engine.onrender.com';

const STEPS = [
  { id: 'identity', label: 'Identity', icon: Shield },
  { id: 'service', label: 'Service', icon: Briefcase },
  { id: 'academics', label: 'Academics', icon: GraduationCap },
  { id: 'physical', label: 'Physical', icon: Heart },
  { id: 'career', label: 'Career', icon: Target },
  { id: 'interests', label: 'Interests', icon: BookOpen },
  { id: 'review', label: 'Review', icon: Check }
];

const Profiling = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    fullName: '',
    dateOfBirth: '',
    category: '',
    stateOfDomicile: '',
    district: '',
    maritalStatus: '',
    email: '',
    mobile: '',
    serviceBranch: '',
    armCorpsTrade: '',
    roleAppointment: '',
    totalServiceDuration: '',
    militaryCourses: [],
    characterOnDischarge: '',
    specificSkills: [],
    highestQualification: '',
    completedDuringService: false,
    nccCertification: 'None',
    sportsAchievement: 'None',
    mathInClass12: false,
    heightCm: '',
    chestCm: '',
    chestExpansion: '',
    vision: '',
    colourBlind: false,
    medicalCategory: 'SHAPE-1',
    physicalProficiency: 'Good',
    careerPreferences: [],
    relocation: 'Home State',
    englishComfort: 'Basic',
    sewaNidhiInterests: [],
    consent: false
  });

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      // 1. Pre-fill from session (Auth metadata)
      if (session?.user) {
        setFormData(prev => ({
          ...prev,
          fullName: session.user.user_metadata?.full_name || prev.fullName,
          email: session.user.email || prev.email
        }));
      }

      // 2. Pre-fill from existing profile table
      const userId = session?.user?.id || '00000000-0000-0000-0000-000000000000';
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profile && profile.raw_profile_data) {
        console.log("Pre-filling with existing profile data:", profile.raw_profile_data);
        setFormData(prev => ({
          ...prev,
          ...profile.raw_profile_data,
          // Ensure display names match what's in the table if they differ
          fullName: profile.full_name || profile.raw_profile_data.fullName
        }));
      }
    };
    fetchUser();
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleMultiSelect = (name, val) => {
    setFormData(prev => {
      const current = prev[name];
      if (current.includes(val)) {
        return { ...prev, [name]: current.filter(i => i !== val) };
      } else {
        return { ...prev, [name]: [...current, val] };
      }
    });
  };

  const validateStep = (step) => {
    const d = formData;
    if (step === 0) return d.fullName && d.dateOfBirth && d.category && d.stateOfDomicile && d.maritalStatus && d.email && d.mobile;
    if (step === 1) return d.serviceBranch && d.armCorpsTrade && d.roleAppointment && d.totalServiceDuration && d.characterOnDischarge;
    if (step === 2) return d.highestQualification;
    if (step === 3) return d.heightCm;
    if (step === 4) return d.careerPreferences.length > 0;
    if (step === 6) return d.consent;
    return true;
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      if (currentStep < STEPS.length - 1) {
        setCurrentStep(prev => prev + 1);
        window.scrollTo(0, 0);
      }
    } else {
      alert('Please fill all required fields before proceeding.');
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
      window.scrollTo(0, 0);
    }
  };

  const handleSubmit = async () => {
    if (!formData.consent) {
      alert('Please provide your consent to proceed.');
      return;
    }

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const recommendResponse = await axios.post(`${ENGINE_URL}/api/recommend`, {
        ...formData,
        heightCm: parseInt(formData.heightCm),
        chestCm: formData.chestCm ? parseInt(formData.chestCm) : null,
        chestExpansion: formData.chestExpansion ? parseInt(formData.chestExpansion) : null,
      });

      if (!recommendResponse.data.ok) throw new Error(recommendResponse.data.error || 'Failed to get recommendations');
      const resultsData = recommendResponse.data;

      const { error } = await supabase
        .from('user_profiles')
        .upsert({
          id: session.user.id,
          full_name: formData.fullName,
          service_branch: formData.serviceBranch,
          years_of_service: parseInt(formData.totalServiceDuration) || 0,
          education_level: formData.highestQualification,
          profile_data: formData,
          recommendations: resultsData.recommendations,
          veer_score: resultsData.summary?.overall_match_score || 0,
          profiling_completed: true,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;
      navigate('/dashboard');
    } catch (error) {
      console.error('Error submitting profile:', error);
      alert('Error: ' + (error.response?.data?.error || error.message));
    } finally {
      setLoading(false);
    }
  };

  const renderStepContent = () => {
    const d = formData;
    switch (currentStep) {
      case 0:
        return (
          <div className="form-section animate-fade-in">
            <h3 style={{ borderBottom: '1px solid #eee', paddingBottom: '0.5rem', marginBottom: '1.5rem', color: 'var(--ios-olive)' }}>Section A — Identity</h3>
            <div className="grid-2">
              <div className="field">
                <label>Full Name *</label>
                <input type="text" name="fullName" value={d.fullName} onChange={handleChange} required />
              </div>
              <div className="field">
                <label>Date of Birth *</label>
                <input type="date" name="dateOfBirth" value={d.dateOfBirth} onChange={handleChange} required />
              </div>
              <div className="field">
                <label>Category *</label>
                <select name="category" value={d.category} onChange={handleChange} required>
                  <option value="">Select</option>
                  <option>General</option><option>OBC</option><option>SC</option><option>ST</option><option>EWS</option>
                </select>
              </div>
              <div className="field">
                <label>State of Domicile *</label>
                <select name="stateOfDomicile" value={d.stateOfDomicile} onChange={handleChange} required>
                  <option value="">Select State</option>
                  {['Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal', 'Delhi', 'J&K', 'Ladakh'].map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div className="field">
                <label>Marital Status *</label>
                <select name="maritalStatus" value={d.maritalStatus} onChange={handleChange} required>
                  <option value="">Select</option>
                  <option>Single</option><option>Married</option>
                </select>
              </div>
              <div className="field">
                <label>District</label>
                <input type="text" name="district" value={d.district} onChange={handleChange} />
              </div>
              <div className="field">
                <label>Email *</label>
                <input type="email" name="email" value={d.email} onChange={handleChange} required />
              </div>
              <div className="field">
                <label>Mobile *</label>
                <input type="tel" name="mobile" value={d.mobile} onChange={handleChange} required />
              </div>
            </div>
          </div>
        );
      case 1:
        return (
          <div className="form-section animate-fade-in">
            <h3 style={{ borderBottom: '1px solid #eee', paddingBottom: '0.5rem', marginBottom: '1.5rem', color: 'var(--ios-olive)' }}>Section B — Service Record</h3>
            <div className="grid-2">
              <div className="field">
                <label>Service Branch *</label>
                <select name="serviceBranch" value={d.serviceBranch} onChange={handleChange} required>
                  <option value="">Select</option>
                  <option value="Indian Army">Indian Army</option>
                  <option value="Indian Navy">Indian Navy</option>
                  <option value="Indian Air Force">Indian Air Force</option>
                </select>
              </div>
              <div className="field">
                <label>Arm / Corps / Trade *</label>
                <input type="text" name="armCorpsTrade" value={d.armCorpsTrade} onChange={handleChange} placeholder="e.g. Infantry, Signals" required />
              </div>
              <div className="field">
                <label>Role / Appointment *</label>
                <input type="text" name="roleAppointment" value={d.roleAppointment} onChange={handleChange} placeholder="e.g. Rifleman" required />
              </div>
              <div className="field">
                <label>Total Duration *</label>
                <input type="text" name="totalServiceDuration" value={d.totalServiceDuration} onChange={handleChange} placeholder="e.g. 4 years 0 months" required />
              </div>
              <div className="field">
                <label>Character on Discharge *</label>
                <select name="characterOnDischarge" value={d.characterOnDischarge} onChange={handleChange} required>
                  <option value="">Select</option>
                  <option>Exemplary</option><option>Very Good</option><option>Good</option>
                </select>
              </div>
            </div>
          </div>
        );
      case 2:
        return (
          <div className="form-section animate-fade-in">
            <h3 style={{ borderBottom: '1px solid #eee', paddingBottom: '0.5rem', marginBottom: '1.5rem', color: 'var(--ios-olive)' }}>Section C — Academics</h3>
            <div className="grid-2">
              <div className="field">
                <label>Highest Qualification *</label>
                <select name="highestQualification" value={d.highestQualification} onChange={handleChange} required>
                  <option value="">Select</option>
                  <option>Class 10</option><option>Class 12</option><option>Graduate</option><option>Post-Graduate</option>
                </select>
              </div>
              <div className="field">
                <label>NCC Certification</label>
                <select name="nccCertification" value={d.nccCertification} onChange={handleChange}>
                  <option>None</option><option>A Certificate</option><option>B Certificate</option><option>C Certificate</option>
                </select>
              </div>
            </div>
          </div>
        );
      case 3:
        return (
          <div className="form-section animate-fade-in">
            <h3 style={{ borderBottom: '1px solid #eee', paddingBottom: '0.5rem', marginBottom: '1.5rem', color: 'var(--ios-olive)' }}>Section D — Physical</h3>
            <div className="grid-3">
              <div className="field">
                <label>Height (cm) *</label>
                <input type="number" name="heightCm" value={d.heightCm} onChange={handleChange} required />
              </div>
              <div className="field">
                <label>Chest (cm)</label>
                <input type="number" name="chestCm" value={d.chestCm} onChange={handleChange} />
              </div>
              <div className="field">
                <label>Expansion (cm)</label>
                <input type="number" name="chestExpansion" value={d.chestExpansion} onChange={handleChange} />
              </div>
            </div>
          </div>
        );
      case 4:
        return (
          <div className="form-section animate-fade-in">
            <h3 style={{ borderBottom: '1px solid #eee', paddingBottom: '0.5rem', marginBottom: '1.5rem', color: 'var(--ios-olive)' }}>Section E — Career Intent</h3>
            <div className="field">
              <label>Career Preferences (Select at least one) *</label>
              <div className="checkbox-cloud">
                {['POLICE_CAPF', 'SSC', 'BANKING', 'RAILWAYS', 'TEACHING', 'ENGINEERING', 'NURSING'].map(p => (
                  <button key={p} type="button" className={d.careerPreferences.includes(p) ? 'active' : ''} onClick={() => handleMultiSelect('careerPreferences', p)}>{p.replace('_', ' ')}</button>
                ))}
              </div>
            </div>
          </div>
        );
      case 5:
        return (
          <div className="form-section animate-fade-in">
            <h3 style={{ borderBottom: '1px solid #eee', paddingBottom: '0.5rem', marginBottom: '1.5rem', color: 'var(--ios-olive)' }}>Section F — Interests</h3>
            <div className="field">
              <label>Sewa Nidhi Interests</label>
              <div className="checkbox-cloud">
                {['Agriculture', 'Small Business', 'Security Agency', 'Transport', 'Skill Training', 'Tourism'].map(i => (
                  <button key={i} type="button" className={d.sewaNidhiInterests.includes(i) ? 'active' : ''} onClick={() => handleMultiSelect('sewaNidhiInterests', i)}>{i}</button>
                ))}
              </div>
            </div>
          </div>
        );
      case 6:
        return (
          <div className="form-section animate-fade-in">
            <h3 style={{ borderBottom: '1px solid #eee', paddingBottom: '0.5rem', marginBottom: '1.5rem', color: 'var(--ios-olive)' }}>Section G — Review</h3>
            <div style={{ background: 'var(--ios-secondary)', padding: '1.5rem', borderRadius: '16px', marginBottom: '2rem' }}>
              <p><strong>Name:</strong> {d.fullName}</p>
              <p><strong>Branch:</strong> {d.serviceBranch}</p>
              <p><strong>Qualification:</strong> {d.highestQualification}</p>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', background: 'rgba(75, 107, 50, 0.05)', padding: '1rem', borderRadius: '12px' }}>
              <input type="checkbox" name="consent" checked={d.consent} onChange={handleChange} />
              <span style={{ fontSize: '0.9rem', fontWeight: '600' }}>I confirm all information provided is accurate.</span>
            </label>
          </div>
        );
      default: return null;
    }
  };

  return (
    <div className="profiling-wrapper">
      <div className="profiling-content animate-fade-in">
        <div className="profiling-hero">
          <div style={{ textAlign: 'center', position: 'relative', zIndex: 2 }}>
            <h1 style={{ fontSize: '2.5rem', tracking: '-0.03em', color: 'white' }}>Career Profiling</h1>
            <p style={{ color: 'rgba(255,255,255,0.8)' }}>Identify your strengths and match with ideal career tracks.</p>
          </div>
        </div>

        <div className="steps-container">
          {STEPS.map((step, idx) => {
            const Icon = step.icon;
            return (
              <div key={step.id} className={`step-node ${idx === currentStep ? 'active' : ''} ${idx < currentStep ? 'done' : ''}`}>
                <div className="node-icon">
                  {idx < currentStep ? <Check size={14} /> : <Icon size={14} />}
                </div>
                <span className="node-label">{step.label}</span>
              </div>
            );
          })}
        </div>

        <div className="ios-card form-card">
          {renderStepContent()}

          <div className="form-nav">
            <button className="btn-secondary ios-pill" onClick={prevStep} disabled={currentStep === 0 || loading}>
              <ChevronLeft size={18} />
            </button>
            
            <div style={{ fontSize: '0.8rem', fontWeight: '700', color: '#999' }}>STEP {currentStep + 1} OF 7</div>

            {currentStep === STEPS.length - 1 ? (
              <button className="btn-primary ios-pill" onClick={handleSubmit} disabled={loading} style={{ padding: '0.75rem 2rem' }}>
                {loading ? <Loader2 className="animate-spin" size={18} /> : 'Complete'}
              </button>
            ) : (
              <button className="btn-primary ios-pill" onClick={nextStep} style={{ width: '44px', height: '44px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ChevronRight size={20} />
              </button>
            )}
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .profiling-hero {
          margin-bottom: 3rem;
          background-image: linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.5)), url("/hero/hero_image.png");
          background-size: cover;
          background-position: center;
          padding: 4rem 2rem;
          border-radius: 24px;
          position: relative;
          overflow: hidden;
          box-shadow: 0 20px 40px rgba(0,0,0,0.1);
        }
        .profiling-wrapper {
          padding: 4rem 1.5rem;
          max-width: 800px;
          margin: 0 auto;
        }
        .steps-container {
          display: flex;
          justify-content: space-between;
          margin-bottom: 3rem;
          position: relative;
        }
        .steps-container::before {
          content: '';
          position: absolute;
          top: 18px;
          left: 0;
          right: 0;
          height: 2px;
          background: #eee;
          z-index: 0;
        }
        .step-node {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.5rem;
          z-index: 1;
          flex: 1;
        }
        .node-icon {
          width: 36px;
          height: 36px;
          background: white;
          border: 2px solid #eee;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #ccc;
          transition: all 0.3s;
        }
        .step-node.active .node-icon {
          border-color: var(--ios-olive);
          color: var(--ios-olive);
          transform: scale(1.1);
          box-shadow: 0 0 0 4px rgba(75, 107, 50, 0.1);
        }
        .step-node.done .node-icon {
          background: var(--ios-olive);
          border-color: var(--ios-olive);
          color: white;
        }
        .node-label {
          font-size: 0.65rem;
          font-weight: 700;
          text-transform: uppercase;
          color: #bbb;
        }
        .step-node.active .node-label { color: var(--ios-olive); }
        
        .form-card {
          padding: 2.5rem;
          min-height: 400px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }
        .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 1.25rem; }
        .grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; }
        .field { display: flex; flex-direction: column; gap: 0.4rem; margin-bottom: 1rem; }
        .field label { font-size: 0.8rem; font-weight: 700; color: #555; }
        .field input, .field select {
          padding: 0.8rem;
          border-radius: 12px;
          border: 1px solid #eee;
          background: var(--ios-secondary);
          font-family: inherit;
          font-size: 0.95rem;
        }
        .field input:focus, .field select:focus {
          outline: none;
          border-color: var(--ios-olive);
          background: white;
        }
        .checkbox-cloud { display: flex; flex-wrap: wrap; gap: 0.5rem; }
        .checkbox-cloud button {
          padding: 0.5rem 1rem;
          border-radius: 12px;
          border: 1px solid #eee;
          background: white;
          font-size: 0.8rem;
          color: #666;
        }
        .checkbox-cloud button.active {
          background: var(--ios-olive);
          color: white;
          border-color: var(--ios-olive);
        }
        .form-nav {
          margin-top: 3rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-top: 1px solid #eee;
          padding-top: 1.5rem;
        }
        @media (max-width: 600px) {
          .grid-2, .grid-3 { grid-template-columns: 1fr; }
          .node-label { display: none; }
        }
      `}} />
    </div>
  );
};

export default Profiling;
