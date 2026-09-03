import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { RefreshCw, Briefcase, ShieldCheck, CheckCircle2, Circle } from 'lucide-react';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Select from '../components/ui/Select';
import GuidedStep from '../components/ui/GuidedStep';
import { ChoiceGroup, MultiChoiceGroup } from '../components/ui/ChoiceGroup';
import { STATE_DISTRICTS } from '../lib/districts';
import { ROLE_OPTIONS, SKILL_OPTIONS, AVAILABILITY_OPTIONS, LICENCE_OPTIONS } from '../lib/privateSectorTaxonomy';

// One unified "Private Sector Profile" journey, not two disconnected
// components, per docs/VeerNXT_Private_Sector_Implementation_Improvements.md §4:
// path choice -> (operational questions only) -> service verification ->
// done. Professional-path candidates skip straight from the path choice to
// verification.
const STAGES = [
  { id: 'path', label: 'Path' },
  { id: 'preferences', label: 'Preferences' },
  { id: 'verification', label: 'Verification' },
];

const PrivateSectorProfile = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const returnTo = searchParams.get('returnTo');
  const [checking, setChecking] = useState(true);
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState(0);

  const [formData, setFormData] = useState({
    path: '',
    work_types: [],
    skills: [],
    skillsOther: '',
    locationState: '',
    locationCity: '',
    licences_qualifications: [],
    availability: '',
    availabilityDate: '',
    other_preferences: '',
  });
  const [verification, setVerification] = useState({ service_number: '', file: null, fileName: '' });
  const [existingVerification, setExistingVerification] = useState(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      if (!currentSession) { navigate('/login'); return; }

      const { data: profile } = await supabase
        .from('ps_candidate_profiles').select('*').eq('user_id', currentSession.user.id).maybeSingle();
      if (profile) {
        setFormData((prev) => ({
          ...prev,
          path: profile.path || '',
          work_types: profile.work_types || [],
          skills: (profile.skills || []).filter((s) => SKILL_OPTIONS.includes(s)),
          skillsOther: (profile.skills || []).filter((s) => !SKILL_OPTIONS.includes(s)).join(', '),
          locationState: profile.preferred_locations?.[0]?.state || '',
          locationCity: profile.preferred_locations?.[0]?.city || '',
          licences_qualifications: profile.licences_qualifications || [],
          availability: profile.availability || '',
          other_preferences: profile.other_preferences || '',
        }));
        if (profile.profile_completed && !returnTo) {
          // Already fully done — send them to the opportunities feed instead
          // of re-running the journey, unless they arrived to top up something.
        }
      }

      const { data: latestVerification } = await supabase
        .from('ps_verifications').select('*').eq('user_id', currentSession.user.id)
        .order('created_at', { ascending: false }).limit(1).maybeSingle();
      setExistingVerification(latestVerification || null);

      setChecking(false);
    })();
  }, [navigate, returnTo]);

  const setField = (name, value) => setFormData((prev) => ({ ...prev, [name]: value }));
  const toggleMulti = (name, val) => setFormData((prev) => {
    const current = prev[name];
    return current.includes(val) ? { ...prev, [name]: current.filter((i) => i !== val) } : { ...prev, [name]: [...current, val] };
  });

  const isOperational = formData.path === 'operational';
  const isProfessional = formData.path === 'professional';

  // Step map depends on the chosen path — professional skips straight from
  // the path choice (step 0) to verification.
  const operationalSteps = ['path', 'work_types', 'skills', 'location', 'licences', 'availability', 'verification', 'done'];
  const professionalSteps = ['path', 'verification', 'done'];
  const stepIds = isProfessional ? professionalSteps : operationalSteps;
  const totalSteps = stepIds.length - 1; // "done" isn't counted as a question
  const currentStepId = stepIds[step] || 'path';

  const stageForStep = () => {
    if (currentStepId === 'path') return 'path';
    if (currentStepId === 'verification' || currentStepId === 'done') return 'verification';
    return 'preferences';
  };

  const verificationSubmitted = !!existingVerification;
  const verificationStatus = existingVerification?.status;

  const checklist = [
    { done: !!formData.path, label: 'Path selected' },
    ...(isOperational ? [
      { done: formData.work_types.length > 0, label: 'Work preferences' },
      { done: formData.skills.length > 0 || !!formData.skillsOther, label: 'Skills & experience' },
      { done: !!formData.locationState && !!formData.locationCity, label: 'Preferred location' },
    ] : []),
    { done: verificationSubmitted, label: 'Service verification' },
  ];
  const completedCount = checklist.filter((c) => c.done).length;
  const progressPct = Math.round((completedCount / checklist.length) * 100);

  const validateStep = () => {
    switch (currentStepId) {
      case 'path': return !!formData.path;
      case 'work_types': return formData.work_types.length > 0;
      case 'skills': return true;
      case 'location': return !!formData.locationState && !!formData.locationCity;
      case 'licences': return true;
      case 'availability': return !!formData.availability;
      case 'verification': return verificationSubmitted || (!!verification.service_number && !!verification.file);
      default: return true;
    }
  };

  const saveProfile = async (overrides = {}) => {
    setSaving(true);
    try {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      if (!currentSession) { navigate('/login'); return false; }

      const skills = formData.skillsOther ? [...formData.skills.filter((s) => s !== 'Other'), formData.skillsOther] : formData.skills;
      const body = {
        action: 'save_profile',
        path: formData.path,
        work_types: isOperational ? formData.work_types : [],
        skills: isOperational ? skills : [],
        preferred_locations: isOperational && formData.locationState ? [{ state: formData.locationState, city: formData.locationCity }] : [],
        licences_qualifications: isOperational ? formData.licences_qualifications : [],
        availability: isOperational ? formData.availability : '',
        other_preferences: formData.other_preferences,
        profile_completed: false,
        ...overrides,
      };

      const res = await fetch('/api/private-sector/router', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${currentSession.access_token}` },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || 'Failed to save profile');
      return true;
    } catch (err) {
      console.error('Failed to save private sector profile:', err);
      alert('Failed to save: ' + err.message);
      return false;
    } finally {
      setSaving(false);
    }
  };

  const submitVerification = async () => {
    if (verificationSubmitted) return true;
    setUploading(true);
    try {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      const ext = verification.file.name.split('.').pop();
      const path = `${currentSession.user.id}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from('ps-verification-docs').upload(path, verification.file, { cacheControl: '3600' });
      if (uploadError) throw uploadError;

      const res = await fetch('/api/private-sector/router', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${currentSession.access_token}` },
        body: JSON.stringify({ action: 'submit_verification', service_number: verification.service_number, document_path: path }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || 'Failed to submit verification');
      setExistingVerification(data.verification);
      return true;
    } catch (err) {
      console.error('Verification submit failed:', err);
      alert('Failed to submit verification: ' + err.message);
      return false;
    } finally {
      setUploading(false);
    }
  };

  const goNext = async () => {
    if (!validateStep()) return;

    if (currentStepId === 'path' && isProfessional) {
      const ok = await saveProfile();
      if (!ok) return;
    }

    if (currentStepId === 'verification') {
      const ok = await submitVerification();
      if (!ok) return;
      const savedOk = await saveProfile({ profile_completed: true });
      if (!savedOk) return;
      setStep((s) => s + 1);
      window.scrollTo(0, 0);
      return;
    }

    if (step === totalSteps - 1) {
      setStep((s) => s + 1);
      return;
    }
    setStep((s) => s + 1);
    window.scrollTo(0, 0);
  };

  const goBack = () => {
    if (step === 0) return;
    setStep((s) => s - 1);
    window.scrollTo(0, 0);
  };

  const finish = () => {
    if (returnTo) navigate(returnTo, { replace: true });
    else navigate(isProfessional ? '/private-sector' : '/private-sector/opportunities', { replace: true });
  };

  const renderQuestion = () => {
    switch (currentStepId) {
      case 'path':
        return (
          <div style={{ display: 'grid', gap: '0.9rem' }}>
            <button type="button" onClick={() => setField('path', 'operational')}
              style={{ textAlign: 'left', padding: '1.25rem', borderRadius: 'var(--radius-md)', border: formData.path === 'operational' ? '2px solid var(--ios-olive)' : '1.5px solid var(--border-strong)', background: formData.path === 'operational' ? 'rgba(75,107,50,0.08)' : 'var(--surface)', cursor: 'pointer' }}>
              <strong style={{ display: 'block', fontSize: '1.02rem', marginBottom: '0.3rem' }}>Operational & Skilled Work</strong>
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>Driving, logistics, security, technical, field and hands-on roles.</span>
            </button>
            <button type="button" onClick={() => setField('path', 'professional')}
              style={{ textAlign: 'left', padding: '1.25rem', borderRadius: 'var(--radius-md)', border: formData.path === 'professional' ? '2px solid var(--ios-olive)' : '1.5px solid var(--border-strong)', background: formData.path === 'professional' ? 'rgba(75,107,50,0.08)' : 'var(--surface)', cursor: 'pointer' }}>
              <strong style={{ display: 'block', fontSize: '1.02rem', marginBottom: '0.3rem' }}>Professional / Management Opportunities</strong>
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>Management, leadership, consulting and specialist positions.</span>
            </button>
          </div>
        );
      case 'work_types':
        return <MultiChoiceGroup columns={2} values={formData.work_types} onToggle={(v) => toggleMulti('work_types', v)} options={ROLE_OPTIONS.map((r) => ({ value: r, label: r }))} />;
      case 'skills':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <MultiChoiceGroup columns={2} values={formData.skills} onToggle={(v) => toggleMulti('skills', v)} options={SKILL_OPTIONS.map((s) => ({ value: s, label: s }))} />
            {formData.skills.includes('Other') && (
              <input className="vx-field" type="text" value={formData.skillsOther} onChange={(e) => setField('skillsOther', e.target.value)} placeholder="Tell us which other skill(s)" />
            )}
          </div>
        );
      case 'location':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <Select searchable value={formData.locationState} onChange={(e) => { setField('locationState', e.target.value); setField('locationCity', ''); }}
              placeholder="Start typing your state…" options={Object.keys(STATE_DISTRICTS).sort().map((s) => ({ value: s, label: s }))} />
            {formData.locationState && STATE_DISTRICTS[formData.locationState] && (
              <Select searchable value={formData.locationCity} onChange={(e) => setField('locationCity', e.target.value)}
                placeholder="Start typing your city/district…" options={STATE_DISTRICTS[formData.locationState].map((c) => ({ value: c, label: c }))} />
            )}
          </div>
        );
      case 'licences':
        return <MultiChoiceGroup columns={2} values={formData.licences_qualifications} onToggle={(v) => toggleMulti('licences_qualifications', v)} options={LICENCE_OPTIONS.map((l) => ({ value: l, label: l }))} />;
      case 'availability':
        return <ChoiceGroup columns={1} value={formData.availability} onChange={(v) => setField('availability', v)} options={AVAILABILITY_OPTIONS.map((a) => ({ value: a, label: a }))} />;
      case 'verification':
        if (verificationSubmitted) {
          return (
            <div style={{ padding: '1.25rem', borderRadius: 'var(--radius-md)', background: 'var(--surface-alt)', display: 'flex', gap: '0.85rem', alignItems: 'flex-start' }}>
              <ShieldCheck size={22} color={verificationStatus === 'verified' ? '#15803d' : verificationStatus === 'rejected' ? '#b91c1c' : '#b45309'} style={{ flexShrink: 0, marginTop: '0.1rem' }} />
              <div>
                <strong style={{ display: 'block', marginBottom: '0.2rem' }}>
                  {verificationStatus === 'verified' ? '🛡 VeerNXT Verified' : verificationStatus === 'rejected' ? 'Verification Requires Attention' : 'Verification Pending'}
                </strong>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  {verificationStatus === 'verified' && 'Your service has been verified by the VeerNXT team.'}
                  {verificationStatus === 'pending' && 'Our team is reviewing your submission. This usually takes 1–2 business days.'}
                  {verificationStatus === 'rejected' && (existingVerification?.rejection_reason || 'Please contact support or re-submit your document.')}
                </span>
              </div>
            </div>
          );
        }
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
              Service number
              <input className="vx-field" style={{ marginTop: '0.4rem' }} type="text" value={verification.service_number}
                onChange={(e) => setVerification((v) => ({ ...v, service_number: e.target.value }))} placeholder="Enter your service number" />
            </label>
            <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
              Service document (upload, or take a photo)
              <input className="vx-field" style={{ marginTop: '0.4rem' }} type="file" accept="image/*,.pdf" capture="environment"
                onChange={(e) => {
                  const file = e.target.files[0];
                  setVerification((v) => ({ ...v, file, fileName: file?.name || '' }));
                }} />
            </label>
            <div style={{ padding: '0.9rem 1rem', borderRadius: 'var(--radius-sm)', background: '#fff8f0', border: '1px solid #f3d9a8', fontSize: '0.8rem', color: '#7a5a1e', lineHeight: 1.5 }}>
              Please keep your original service documents available. You may be asked to present the originals during an interview or verification process.
              <br /><br />
              🔒 Do not upload classified, restricted, operational or security-sensitive documents.
            </div>
          </div>
        );
      case 'done':
        return (
          <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
            <CheckCircle2 size={48} color="var(--ios-olive)" style={{ marginBottom: '1rem' }} />
            <h2 style={{ margin: '0 0 0.5rem' }}>{isProfessional ? 'Sent to VeerNXT HR' : "You're all set"}</h2>
            <p style={{ color: 'var(--text-secondary)', margin: '0 0 1.5rem' }}>
              {isProfessional
                ? 'Your profile has been referred to our HR team for professional/management opportunities. We\'ll be in touch.'
                : 'Your Private Sector Profile is complete. You can now browse and express interest in opportunities.'}
            </p>
            <Button size="lg" onClick={finish}>{isProfessional ? 'Back to Private Sector' : 'View Opportunities →'}</Button>
          </div>
        );
      default:
        return null;
    }
  };

  if (checking) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: 'var(--ios-bg)' }}>
        <RefreshCw className="animate-spin" size={32} color="var(--ios-olive)" />
      </div>
    );
  }

  const insights = [
    { icon: Briefcase, label: `Private Sector Profile — ${progressPct}% complete` },
    ...checklist.map((c) => ({ icon: c.done ? CheckCircle2 : Circle, label: c.label, detail: c.done ? 'Complete' : 'Pending' })),
  ];

  if (currentStepId === 'done') {
    return (
      <div style={{ background: 'var(--ios-bg)', minHeight: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
        <Card padding="lg" style={{ maxWidth: 480, width: '100%' }}>{renderQuestion()}</Card>
      </div>
    );
  }

  const titleFor = () => {
    if (currentStepId === 'path') return 'What kind of private-sector opportunity are you looking for?';
    if (currentStepId === 'work_types') return 'What kind of work are you interested in?';
    if (currentStepId === 'skills') return 'What are your key skills and experience?';
    if (currentStepId === 'location') return 'Where would you like to work?';
    if (currentStepId === 'licences') return 'Any relevant licences or qualifications?';
    if (currentStepId === 'availability') return 'When are you available to start?';
    if (currentStepId === 'verification') return verificationSubmitted ? 'Service verification' : 'Verify your service';
    return '';
  };
  const helpFor = () => {
    if (currentStepId === 'work_types') return 'Pick as many as apply.';
    if (currentStepId === 'skills') return 'Optional — pick any that apply, or choose "Other".';
    if (currentStepId === 'licences') return 'Optional — pick any that apply.';
    if (currentStepId === 'verification') return 'This creates an additional layer of confidence for employers and helps VeerNXT build a verified pool of former service personnel.';
    return undefined;
  };
  const nextLabel = currentStepId === 'path' && isProfessional ? 'Send My Profile to VeerNXT HR →' : (currentStepId === 'verification' ? 'Complete Verification →' : 'Continue');

  return (
    <div style={{ background: 'var(--ios-bg)', minHeight: '100%' }}>
      <div className="pf-hero">
        <h1>Private Sector Profile</h1>
        <p>Complete your profile to discover opportunities that match your skills, experience and aspirations.</p>
      </div>

      <GuidedStep
        stages={STAGES}
        activeStageId={stageForStep()}
        stepNumber={step + 1}
        totalSteps={totalSteps}
        title={titleFor()}
        helpText={helpFor()}
        insights={insights}
        onBack={goBack}
        backDisabled={step === 0}
        onNext={goNext}
        nextDisabled={!validateStep() || saving || uploading}
        nextLabel={saving || uploading ? 'Please wait…' : nextLabel}
        loading={saving || uploading}
      >
        {renderQuestion()}
      </GuidedStep>

      <style dangerouslySetInnerHTML={{ __html: `
        .pf-hero { max-width: 920px; margin: 0 auto; padding: 2rem 1.25rem 0; }
        .pf-hero h1 { font-size: 1.75rem; font-weight: 800; color: var(--ios-text); margin: 0 0 0.35rem; letter-spacing: -0.01em; }
        .pf-hero p { color: var(--text-secondary); margin: 0; font-size: 0.95rem; }
        .vx-field { width: 100%; padding: 0.85rem 1rem; border-radius: var(--radius-sm); border: 1px solid var(--vx-border, #64748b); background: white; color: #0f172a; outline: none; font-family: inherit; font-size: 16px; box-sizing: border-box; }
        .vx-field:focus { --vx-border: var(--ios-olive); box-shadow: 0 0 0 3px rgba(75,107,50,0.18); }
      `}} />
    </div>
  );
};

export default PrivateSectorProfile;
