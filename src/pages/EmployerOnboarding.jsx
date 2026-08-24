import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { RefreshCw } from 'lucide-react';
import Button from '../components/ui/Button';
import Select from '../components/ui/Select';
import GuidedStep from '../components/ui/GuidedStep';
import { ChoiceGroup } from '../components/ui/ChoiceGroup';
import { getEmployerInsights } from '../lib/employerInsights';
import { useLocalDraft } from '../lib/useLocalDraft';

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

const EmployerOnboarding = () => {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [formData, setFormData] = useState({
    companyName: '', website: '', contactName: '', designation: '', industry: '', location: '', about: '',
    hiringRoles: '', requiredSkills: '', candidatePreferences: '', hiringReadiness: '',
  });
  const [step, setStep] = useState(0);
  const { hasDraft, loadDraft, saveDraft, clearDraft } = useLocalDraft('veernxt_employer_onboarding_draft_v1');
  const [draftPrompt, setDraftPrompt] = useState(() => (hasDraft ? 'pending' : null));

  // Already-onboarded employers land here from a stale link/bookmark — send
  // them straight to their dashboard instead of re-running onboarding.
  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate('/login'); return; }
      const { data } = await supabase.from('employer_profiles').select('company_name').eq('id', session.user.id).maybeSingle();
      if (data?.company_name) { navigate('/employer/dashboard', { replace: true }); return; }
      setChecking(false);
    })();
  }, [navigate]);

  useEffect(() => {
    if (draftPrompt === 'pending') return;
    saveDraft({ formData, step });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData, step, draftPrompt]);

  const setField = (name, value) => setFormData((prev) => ({ ...prev, [name]: value }));

  const validateQuestion = (s) => {
    const d = formData;
    switch (s) {
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

  const handleSubmit = async () => {
    setSubmitLoading(true);
    const d = formData;
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
          updated_at: new Date().toISOString(),
        });
      if (dbError) throw dbError;

      // hiring_profile is a newer, additive column (sql/employer_hiring_profile.sql)
      // written as its own request so a database that hasn't run that migration
      // yet still completes onboarding on the 7 core fields above.
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

      clearDraft();
      navigate('/employer/dashboard', { replace: true });
    } catch (err) {
      console.error('Error during employer onboarding upsert:', err);
      alert('Failed to save profile: ' + err.message);
    } finally {
      setSubmitLoading(false);
    }
  };

  const goNext = () => {
    if (!validateQuestion(step)) return;
    if (step === EMPLOYER_TOTAL_STEPS - 1) { handleSubmit(); return; }
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
        return <input className="vx-field" type="text" value={d.companyName} onChange={(e) => setField('companyName', e.target.value)} placeholder="e.g. Tata Motors" autoComplete="organization" autoFocus />;
      case 1:
        return <input className="vx-field" type="url" value={d.website} onChange={(e) => setField('website', e.target.value)} placeholder="https://yourcompany.com" autoComplete="url" />;
      case 2:
        return <input className="vx-field" type="text" value={d.contactName} onChange={(e) => setField('contactName', e.target.value)} placeholder="e.g. Vikram Sharma" autoComplete="name" />;
      case 3:
        return <input className="vx-field" type="text" value={d.designation} onChange={(e) => setField('designation', e.target.value)} placeholder="e.g. Head of Talent Acquisition" />;
      case 4:
        return (
          <Select searchable value={d.industry} onChange={(e) => setField('industry', e.target.value)} placeholder="Select or search an industry…"
            options={['IT & Software', 'Security Services', 'Aerospace & Defence', 'Logistics & Supply Chain', 'Manufacturing', 'Finance & Banking', 'Retail & E-commerce', 'Other'].map((i) => ({ value: i, label: i }))} />
        );
      case 5:
        return <input className="vx-field" type="text" value={d.location} onChange={(e) => setField('location', e.target.value)} placeholder="e.g. Gurugram, India" autoComplete="address-level2" />;
      case 6:
        return <textarea className="vx-field" rows={4} value={d.about} onChange={(e) => setField('about', e.target.value)} placeholder="Tell us about the roles you are hiring for and how military talent fits into your team..." />;
      case 7:
        return <input className="vx-field" type="text" value={d.hiringRoles} onChange={(e) => setField('hiringRoles', e.target.value)} placeholder="e.g. Security Supervisor, Logistics Coordinator, IT Support" />;
      case 8:
        return <input className="vx-field" type="text" value={d.requiredSkills} onChange={(e) => setField('requiredSkills', e.target.value)} placeholder="e.g. Convoy operations, warehouse management, network security" />;
      case 9:
        return <input className="vx-field" type="text" value={d.candidatePreferences} onChange={(e) => setField('candidatePreferences', e.target.value)} placeholder="e.g. JCOs with 5+ years, Indian Army preferred" />;
      case 10:
        return (
          <ChoiceGroup columns={1} value={d.hiringReadiness} onChange={(v) => setField('hiringReadiness', v)}
            options={['Immediately', 'Within 30 days', 'Within 90 days', 'Just exploring'].map((r) => ({ value: r, label: r }))} />
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

  if (checking) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: 'var(--ios-bg)' }}>
        <RefreshCw className="animate-spin" size={32} color="var(--ios-olive)" />
      </div>
    );
  }

  if (draftPrompt === 'pending') {
    return (
      <div className="pf-draft-prompt">
        <div className="pf-draft-card">
          <h2>Welcome back</h2>
          <p>We saved your onboarding progress from last time. Pick up where you left off, or start fresh.</p>
          <div className="pf-draft-actions">
            <Button variant="secondary" onClick={() => { clearDraft(); setDraftPrompt(null); }}>Start fresh</Button>
            <Button onClick={() => {
              const draft = loadDraft();
              if (draft?.formData) setFormData((prev) => ({ ...prev, ...draft.formData }));
              if (typeof draft?.step === 'number') setStep(draft.step);
              setDraftPrompt(null);
            }}>
              Resume onboarding
            </Button>
          </div>
        </div>
        <style dangerouslySetInnerHTML={{ __html: `
          .pf-draft-prompt { min-height: 70vh; display: flex; align-items: center; justify-content: center; padding: 1.5rem; }
          .pf-draft-card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-md); box-shadow: var(--shadow-2); padding: 2rem; max-width: 420px; text-align: center; }
          .pf-draft-card h2 { margin: 0 0 0.5rem; font-size: 1.3rem; }
          .pf-draft-card p { color: var(--text-secondary); margin: 0 0 1.5rem; font-size: 0.9rem; }
          .pf-draft-actions { display: flex; gap: 0.75rem; justify-content: center; }
        `}} />
      </div>
    );
  }

  const insights = getEmployerInsights(formData);

  return (
    <div style={{ background: 'var(--ios-bg)', minHeight: '100%' }}>
      <div className="pf-hero">
        <h1>Corporate Partner Onboarding</h1>
        <p>A few focused questions to set up your hiring profile — we'll show you what it means for your candidate matches as you go.</p>
      </div>

      <GuidedStep
        stages={EMPLOYER_STAGES}
        activeStageId={EMPLOYER_QUESTION_STAGE[step]}
        stepNumber={step + 1}
        totalSteps={EMPLOYER_TOTAL_STEPS}
        title={EMPLOYER_TITLES[step]}
        helpText={EMPLOYER_HELP[step]}
        insights={insights}
        onBack={goBack}
        backDisabled={step === 0}
        onNext={goNext}
        nextDisabled={!validateQuestion(step) || (step === EMPLOYER_TOTAL_STEPS - 1 && submitLoading)}
        nextLabel={step === EMPLOYER_TOTAL_STEPS - 1 ? (submitLoading ? 'Saving…' : 'Complete onboarding') : 'Continue'}
        loading={step === EMPLOYER_TOTAL_STEPS - 1 && submitLoading}
      >
        {renderQuestion()}
      </GuidedStep>

      <style dangerouslySetInnerHTML={{ __html: `
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
      `}} />
    </div>
  );
};

export default EmployerOnboarding;
