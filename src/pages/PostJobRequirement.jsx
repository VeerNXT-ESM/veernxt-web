import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { CheckCircle2 } from 'lucide-react';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Select from '../components/ui/Select';
import GuidedStep from '../components/ui/GuidedStep';
import { MultiChoiceGroup, ChoiceGroup } from '../components/ui/ChoiceGroup';
import { STATE_DISTRICTS } from '../lib/districts';
import { ROLE_OPTIONS } from '../lib/privateSectorTaxonomy';

// 5-screen employer requirement wizard, per
// docs/VeerNXT_Private_Sector_Implementation_Improvements.md §2. Submits a
// ps_job_requirements row with status='submitted' — not a live listing
// until VeerNXT HR approves it in the admin console.
const STAGES = [
  { id: 'who', label: 'Who' },
  { id: 'details', label: 'Details' },
  { id: 'review', label: 'Review' },
];
const STEP_STAGE = ['who', 'who', 'details', 'details', 'review'];
const TOTAL_STEPS = STEP_STAGE.length;
const TITLES = [
  'Who are you hiring?',
  'How many people do you need?',
  'Where?',
  'Tell us about the job',
  'Review & Submit',
];
const HELP = [
  'Select all roles that apply.',
  undefined,
  'One location, or multiple.',
  'Upload a job requirement document, or describe it in your own words.',
  'Take one last look before we send this to our HR team.',
];

const PostJobRequirement = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    roleTitles: [],
    quantity: '',
    locationMode: 'one',
    locations: [''],
    salaryRange: '',
    jdMode: 'describe',
    description: '',
    jdFile: null,
    jdFileName: '',
    requirementsText: '',
  });

  const setField = (name, value) => setFormData((prev) => ({ ...prev, [name]: value }));
  const toggleRole = (val) => setFormData((prev) => ({
    ...prev,
    roleTitles: prev.roleTitles.includes(val) ? prev.roleTitles.filter((r) => r !== val) : [...prev.roleTitles, val],
  }));
  const setLocationAt = (idx, value) => setFormData((prev) => {
    const next = [...prev.locations];
    next[idx] = value;
    return { ...prev, locations: next };
  });

  const validateStep = () => {
    const d = formData;
    switch (step) {
      case 0: return d.roleTitles.length > 0;
      case 1: return !!d.quantity && Number(d.quantity) > 0;
      case 2: return d.locations.filter(Boolean).length > 0;
      case 3: return d.jdMode === 'upload' ? !!d.jdFile : !!d.description.trim();
      default: return true;
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate('/login'); return; }

      let jdDocumentPath = null;
      if (formData.jdMode === 'upload' && formData.jdFile) {
        setUploading(true);
        const ext = formData.jdFile.name.split('.').pop();
        const path = `${session.user.id}/${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage.from('ps-job-documents').upload(path, formData.jdFile, { cacheControl: '3600' });
        setUploading(false);
        if (uploadError) throw uploadError;
        jdDocumentPath = path;
      }

      const res = await fetch('/api/private-sector/router', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({
          action: 'submit_requirement',
          role_titles: formData.roleTitles,
          quantity: Number(formData.quantity),
          locations: formData.locations.filter(Boolean),
          salary_range: formData.salaryRange || null,
          description: formData.jdMode === 'describe' ? formData.description : null,
          jd_document_path: jdDocumentPath,
          requirements_text: formData.requirementsText || null,
        }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || 'Failed to submit requirement');
      setSubmitted(true);
    } catch (err) {
      console.error('Failed to submit requirement:', err);
      alert('Failed to submit: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const goNext = () => {
    if (!validateStep()) return;
    if (step === TOTAL_STEPS - 1) { handleSubmit(); return; }
    setStep((s) => s + 1);
    window.scrollTo(0, 0);
  };
  const goBack = () => {
    if (step === 0) return;
    setStep((s) => s - 1);
    window.scrollTo(0, 0);
  };

  const renderQuestion = () => {
    const d = formData;
    switch (step) {
      case 0:
        return <MultiChoiceGroup columns={2} values={d.roleTitles} onToggle={toggleRole} options={ROLE_OPTIONS.map((r) => ({ value: r, label: r }))} />;
      case 1:
        return <input className="vx-field" type="number" min="1" value={d.quantity} onChange={(e) => setField('quantity', e.target.value)} placeholder="e.g. 25" autoFocus />;
      case 2:
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <ChoiceGroup columns={2} value={d.locationMode} onChange={(v) => setField('locationMode', v)}
              options={[{ value: 'one', label: 'One location' }, { value: 'multiple', label: 'Multiple locations' }]} />
            {d.locations.map((loc, idx) => (
              <Select key={idx} searchable value={loc} onChange={(e) => setLocationAt(idx, e.target.value)}
                placeholder="City / state…" options={Object.keys(STATE_DISTRICTS).sort().map((s) => ({ value: s, label: s }))} />
            ))}
            {d.locationMode === 'multiple' && (
              <button type="button" onClick={() => setField('locations', [...d.locations, ''])}
                style={{ alignSelf: 'flex-start', background: 'none', border: 'none', color: 'var(--ios-olive)', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer' }}>
                + Add another location
              </button>
            )}
          </div>
        );
      case 3:
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <ChoiceGroup columns={2} value={d.jdMode} onChange={(v) => setField('jdMode', v)}
              options={[{ value: 'upload', label: 'Upload Job Requirement' }, { value: 'describe', label: 'Describe the job' }]} />
            {d.jdMode === 'upload' ? (
              <input className="vx-field" type="file" accept=".pdf,.doc,.docx,image/*"
                onChange={(e) => { const f = e.target.files[0]; setField('jdFile', f); setField('jdFileName', f?.name || ''); }} />
            ) : (
              <textarea className="vx-field" rows={4} value={d.description} onChange={(e) => setField('description', e.target.value)}
                placeholder="Tell us briefly about the job, responsibilities, working hours and what you're looking for." />
            )}
            <input className="vx-field" type="text" value={d.salaryRange} onChange={(e) => setField('salaryRange', e.target.value)} placeholder="Salary / range (optional)" />
            <textarea className="vx-field" rows={2} value={d.requirementsText} onChange={(e) => setField('requirementsText', e.target.value)} placeholder="Any specific requirements candidates should know about? (optional)" />
          </div>
        );
      case 4:
        return (
          <div className="pf-summary-card">
            <p><strong>Hiring for:</strong> {d.roleTitles.join(', ') || '—'}</p>
            <p><strong>Positions:</strong> {d.quantity || '—'}</p>
            <p><strong>Location:</strong> {d.locations.filter(Boolean).join(', ') || '—'}</p>
            <p><strong>Salary:</strong> {d.salaryRange || '—'}</p>
            <p><strong>Details:</strong> {d.jdMode === 'upload' ? (d.jdFileName || '—') : (d.description || '—')}</p>
            {d.requirementsText && <p><strong>Requirements:</strong> {d.requirementsText}</p>}
          </div>
        );
      default:
        return null;
    }
  };

  if (submitted) {
    return (
      <div style={{ background: 'var(--ios-bg)', minHeight: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
        <Card padding="lg" style={{ maxWidth: 480, width: '100%', textAlign: 'center' }}>
          <CheckCircle2 size={48} color="var(--ios-olive)" style={{ marginBottom: '1rem' }} />
          <h2 style={{ margin: '0 0 0.5rem' }}>Requirement received</h2>
          <p style={{ color: 'var(--text-secondary)', margin: '0 0 1.5rem' }}>
            Our HR team will review your requirement and begin identifying suitable candidates.
          </p>
          <Button size="lg" onClick={() => navigate('/employer/dashboard')}>Go to Dashboard</Button>
        </Card>
      </div>
    );
  }

  return (
    <div style={{ background: 'var(--ios-bg)', minHeight: '100%' }}>
      <div className="pf-hero">
        <h1>Post a Job</h1>
        <p>A few quick screens and our HR team takes it from here.</p>
      </div>
      <GuidedStep
        stages={STAGES}
        activeStageId={STEP_STAGE[step]}
        stepNumber={step + 1}
        totalSteps={TOTAL_STEPS}
        title={TITLES[step]}
        helpText={HELP[step]}
        onBack={goBack}
        backDisabled={step === 0}
        onNext={goNext}
        nextDisabled={!validateStep() || submitting || uploading}
        nextLabel={step === TOTAL_STEPS - 1 ? (submitting || uploading ? 'Submitting…' : 'Submit Requirement') : 'Continue'}
        loading={submitting || uploading}
      >
        {renderQuestion()}
      </GuidedStep>
      <style dangerouslySetInnerHTML={{ __html: `
        .pf-hero { max-width: 920px; margin: 0 auto; padding: 2rem 1.25rem 0; }
        .pf-hero h1 { font-size: 1.75rem; font-weight: 800; color: var(--ios-text); margin: 0 0 0.35rem; letter-spacing: -0.01em; }
        .pf-hero p { color: var(--text-secondary); margin: 0; font-size: 0.95rem; }
        .vx-field { width: 100%; padding: 0.85rem 1rem; border-radius: var(--radius-sm); border: 1px solid var(--vx-border, #64748b); background: white; color: #0f172a; outline: none; font-family: inherit; font-size: 16px; box-sizing: border-box; }
        .vx-field:focus { --vx-border: var(--ios-olive); box-shadow: 0 0 0 3px rgba(75,107,50,0.18); }
        .pf-summary-card { background: var(--surface-alt); border-radius: var(--radius-sm); padding: 1.25rem; }
        .pf-summary-card p { margin: 0 0 0.4rem; font-size: 0.9rem; }
        .pf-summary-card p:last-child { margin-bottom: 0; }
      `}} />
    </div>
  );
};

export default PostJobRequirement;
