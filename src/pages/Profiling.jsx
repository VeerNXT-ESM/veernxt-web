import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { supabase } from '../lib/supabase';
import { STATE_DISTRICTS } from '../lib/districts';
import designationsData from '../data/designations.json';
import GuidedStep from '../components/ui/GuidedStep';
import Select from '../components/ui/Select';
import Button from '../components/ui/Button';
import Sheet from '../components/ui/Sheet';
import { ChoiceGroup, MultiChoiceGroup } from '../components/ui/ChoiceGroup';
import { getProfilingInsights } from '../lib/profilingInsights';
import { useLocalDraft } from '../lib/useLocalDraft';

const STAGES = [
  { id: 'identity', label: 'Identity' },
  { id: 'service', label: 'Service' },
  { id: 'academics', label: 'Academics' },
  { id: 'physical', label: 'Physical' },
  { id: 'career', label: 'Career' },
  { id: 'interests', label: 'Interests' },
  { id: 'review', label: 'Review' },
];

// One entry per question — index in this array IS the step number.
// stageId drives the progress-rail highlight; everything else about
// rendering/validating that question lives in renderQuestion()/
// validateQuestion() below, keyed by the same index.
const QUESTION_STAGE = [
  'identity', 'identity', 'identity', 'identity', 'identity', 'identity', 'identity', 'identity',
  'service', 'service', 'service', 'service', 'service',
  'academics', 'academics',
  'physical',
  'career',
  'interests',
  'review',
];
const TOTAL_STEPS = QUESTION_STAGE.length;

const DRAFT_KEY = 'veernxt_profiling_draft_v1';

const Profiling = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [showFullApplication, setShowFullApplication] = useState(false);
  const { hasDraft, loadDraft, saveDraft, clearDraft } = useLocalDraft(DRAFT_KEY);
  const [draftPrompt, setDraftPrompt] = useState(() => (hasDraft ? 'pending' : null)); // null | 'pending'

  const [formData, setFormData] = useState({
    fullName: '',
    dobDay: '',
    dobMonth: '',
    dobYear: '',
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
    serviceYears: '',
    serviceMonths: '',
    militaryCourses: [],
    characterOnDischarge: '',
    specificSkills: [],
    highestQualification: '',
    completedDuringService: false,
    nccCertification: 'None',
    sportsAchievement: 'None',
    mathInClass12: false,
    heightCm: '',
    weightKg: '',
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
    consent: false,
  });

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      if (session?.user) {
        setFormData(prev => ({
          ...prev,
          fullName: session.user.user_metadata?.full_name || prev.fullName,
          email: session.user.email || prev.email,
        }));
      }

      const userId = session?.user?.id;
      if (userId && userId !== '00000000-0000-0000-0000-000000000000') {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', userId)
          .single();

        if (profile && profile.raw_profile_data) {
          const cleanData = Object.fromEntries(
            Object.entries(profile.raw_profile_data).map(([k, v]) => [k, v === null || v === undefined ? '' : v])
          );

          setFormData(prev => ({
            ...prev,
            ...cleanData,
            fullName: profile.full_name || cleanData.fullName || prev.fullName,
          }));
        }
      }
    };
    fetchUser();
  }, []);

  // Autosave whenever an answer changes, once the draft prompt is resolved.
  useEffect(() => {
    if (draftPrompt === 'pending') return;
    saveDraft({ formData, currentStep });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData, currentStep, draftPrompt]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => {
      const updates = { [name]: type === 'checkbox' ? checked : value };
      if (name === 'stateOfDomicile' && value !== prev.stateOfDomicile) {
        updates.district = '';
      }
      if (name === 'serviceBranch' && value !== prev.serviceBranch) {
        updates.armCorpsTrade = '';
        updates.roleAppointment = '';
      }
      if (name === 'armCorpsTrade' && value !== prev.armCorpsTrade) {
        updates.roleAppointment = '';
      }
      return { ...prev, ...updates };
    });
  };

  const setField = (name, value) => handleChange({ target: { name, value, type: 'text' } });

  const handleMultiSelect = (name, val) => {
    setFormData(prev => {
      const current = prev[name];
      return current.includes(val)
        ? { ...prev, [name]: current.filter(i => i !== val) }
        : { ...prev, [name]: [...current, val] };
    });
  };

  const validateQuestion = (step) => {
    const d = formData;
    switch (step) {
      case 0: return !!d.fullName;
      case 1: return !!(d.dobDay && d.dobMonth && d.dobYear);
      case 2: return !!d.category;
      case 3: return !!d.maritalStatus;
      case 4: return !!d.stateOfDomicile;
      case 5: return true; // district — optional
      case 6: return !!d.email;
      case 7: return !!d.mobile;
      case 8: return !!d.serviceBranch;
      case 9: return !!d.armCorpsTrade;
      case 10: return !!d.roleAppointment;
      case 11: return d.serviceYears !== '' && d.serviceMonths !== '';
      case 12: return !!d.characterOnDischarge;
      case 13: return !!d.highestQualification;
      case 14: return true; // NCC — optional
      case 15: return !!(d.heightCm && d.weightKg && d.chestCm && d.chestExpansion);
      case 16: return d.careerPreferences.length > 0;
      case 17: return true; // interests — optional
      case 18: return d.consent;
      default: return true;
    }
  };

  const goNext = () => {
    if (!validateQuestion(currentStep)) return;
    if (currentStep === TOTAL_STEPS - 1) {
      handleSubmit();
      return;
    }
    setCurrentStep(s => s + 1);
    window.scrollTo(0, 0);
  };

  const goBack = () => {
    if (currentStep === 0) return;
    setCurrentStep(s => s - 1);
    window.scrollTo(0, 0);
  };

  const handleSubmit = async () => {
    if (!formData.consent) return;

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const recommendResponse = await axios.post('/api/profile/recommend', {
        ...formData,
        dateOfBirth: `${formData.dobYear}-${formData.dobMonth}-${formData.dobDay}`,
        totalServiceDuration: `${formData.serviceYears} years ${formData.serviceMonths} months`,
        heightCm: parseInt(formData.heightCm),
        weightKg: parseInt(formData.weightKg),
        chestCm: parseInt(formData.chestCm),
        chestExpansion: parseInt(formData.chestExpansion),
      }, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      });

      if (!recommendResponse.data.ok) throw new Error(recommendResponse.data.error || 'Failed to get recommendations');

      clearDraft();
      navigate('/profiling/results', { state: recommendResponse.data });
    } catch (error) {
      console.error('Error submitting profile:', error);
      alert('Error: ' + (error.response?.data?.error || error.message));
    } finally {
      setLoading(false);
    }
  };

  const insights = getProfilingInsights(formData);

  const renderQuestion = () => {
    const d = formData;

    switch (currentStep) {
      case 0:
        return (
          <input className="vx-field" type="text" name="fullName" value={d.fullName} onChange={handleChange}
            placeholder="Your full name" autoComplete="name" autoFocus />
        );

      case 1: {
        const currentYear = new Date().getFullYear();
        const yearOptions = [];
        for (let y = currentYear - 18; y >= currentYear - 50; y--) yearOptions.push({ value: String(y), label: String(y) });
        const monthOptions = [
          { value: '01', label: 'January' }, { value: '02', label: 'February' }, { value: '03', label: 'March' },
          { value: '04', label: 'April' }, { value: '05', label: 'May' }, { value: '06', label: 'June' },
          { value: '07', label: 'July' }, { value: '08', label: 'August' }, { value: '09', label: 'September' },
          { value: '10', label: 'October' }, { value: '11', label: 'November' }, { value: '12', label: 'December' },
        ];
        const dayOptions = [...Array(31).keys()].map(i => ({ value: String(i + 1).padStart(2, '0'), label: String(i + 1) }));
        return (
          <div className="pf-inline-3">
            <Select name="dobDay" value={d.dobDay} onChange={handleChange} placeholder="Day" options={dayOptions} />
            <Select name="dobMonth" value={d.dobMonth} onChange={handleChange} placeholder="Month" options={monthOptions} />
            <Select name="dobYear" value={d.dobYear} onChange={handleChange} placeholder="Year" options={yearOptions} />
          </div>
        );
      }

      case 2:
        return (
          <ChoiceGroup columns={3} value={d.category} onChange={(v) => setField('category', v)}
            options={['General', 'OBC', 'SC', 'ST', 'EWS'].map(c => ({ value: c, label: c }))} />
        );

      case 3:
        return (
          <ChoiceGroup columns={2} value={d.maritalStatus} onChange={(v) => setField('maritalStatus', v)}
            options={['Single', 'Married'].map(m => ({ value: m, label: m }))} />
        );

      case 4:
        return (
          <Select name="stateOfDomicile" value={d.stateOfDomicile} onChange={handleChange} searchable
            placeholder="Start typing your state…" options={Object.keys(STATE_DISTRICTS).sort().map(s => ({ value: s, label: s }))} />
        );

      case 5:
        return d.stateOfDomicile && STATE_DISTRICTS[d.stateOfDomicile] ? (
          <Select name="district" value={d.district} onChange={handleChange} searchable
            placeholder="Start typing your district…" options={STATE_DISTRICTS[d.stateOfDomicile].map(dist => ({ value: dist, label: dist }))} />
        ) : (
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>No district list available for {d.stateOfDomicile || 'this state'} — you can skip this.</p>
        );

      case 6:
        return (
          <input className="vx-field" type="email" name="email" value={d.email} onChange={handleChange}
            placeholder="you@example.com" autoComplete="email" />
        );

      case 7:
        return (
          <input className="vx-field" type="tel" inputMode="tel" name="mobile" value={d.mobile} onChange={handleChange}
            placeholder="10-digit mobile number" autoComplete="tel" />
        );

      case 8:
        return (
          <ChoiceGroup columns={1} value={d.serviceBranch} onChange={(v) => setField('serviceBranch', v)}
            options={['Indian Army', 'Indian Navy', 'Indian Air Force'].map(s => ({ value: s, label: s }))} />
        );

      case 9: {
        const availableArms = d.serviceBranch
          ? [...new Set(designationsData.designations.filter(x => x.service === d.serviceBranch).map(x => x.arm_corps))]
          : [];
        return (
          <Select name="armCorpsTrade" value={d.armCorpsTrade} onChange={handleChange} searchable
            placeholder="Start typing your arm/corps…" options={availableArms.map(arm => ({ value: arm, label: arm }))} />
        );
      }

      case 10: {
        const availableRoles = d.armCorpsTrade
          ? designationsData.designations.filter(x => x.service === d.serviceBranch && x.arm_corps === d.armCorpsTrade).map(x => x.trade)
          : [];
        return (
          <Select name="roleAppointment" value={d.roleAppointment} onChange={handleChange} searchable
            placeholder="Start typing your role/appointment…" options={availableRoles.map(role => ({ value: role, label: role }))} />
        );
      }

      case 11:
        return (
          <div className="pf-inline-2">
            <Select name="serviceYears" value={d.serviceYears} onChange={handleChange} placeholder="Years"
              options={[...Array(35).keys()].map(y => ({ value: y.toString(), label: `${y} years` }))} />
            <Select name="serviceMonths" value={d.serviceMonths} onChange={handleChange} placeholder="Months"
              options={[...Array(12).keys()].map(m => ({ value: m.toString(), label: `${m} months` }))} />
          </div>
        );

      case 12:
        return (
          <ChoiceGroup columns={1} value={d.characterOnDischarge} onChange={(v) => setField('characterOnDischarge', v)}
            options={['Exemplary', 'Very Good', 'Good'].map(c => ({ value: c, label: c }))} />
        );

      case 13:
        return (
          <ChoiceGroup columns={2} value={d.highestQualification} onChange={(v) => setField('highestQualification', v)}
            options={['Class 10', 'Class 12', 'Graduate', 'Post-Graduate'].map(q => ({ value: q, label: q }))} />
        );

      case 14:
        return (
          <ChoiceGroup columns={2} value={d.nccCertification} onChange={(v) => setField('nccCertification', v)}
            options={['None', 'A Certificate', 'B Certificate', 'C Certificate'].map(c => ({ value: c, label: c }))} />
        );

      case 15:
        return (
          <div className="pf-vitals-grid">
            <div className="pf-vitals-field">
              <label htmlFor="pf-height">Height (cm)</label>
              <input id="pf-height" className="vx-field" type="number" inputMode="numeric" min="140" max="220" name="heightCm" value={d.heightCm} onChange={handleChange} placeholder="e.g. 172" />
            </div>
            <div className="pf-vitals-field">
              <label htmlFor="pf-weight">Weight (kg)</label>
              <input id="pf-weight" className="vx-field" type="number" inputMode="numeric" min="40" max="150" name="weightKg" value={d.weightKg} onChange={handleChange} placeholder="e.g. 68" />
            </div>
            <div className="pf-vitals-field">
              <label htmlFor="pf-chest">Chest (cm)</label>
              <input id="pf-chest" className="vx-field" type="number" inputMode="numeric" min="60" max="130" name="chestCm" value={d.chestCm} onChange={handleChange} placeholder="e.g. 90" />
            </div>
            <div className="pf-vitals-field">
              <label htmlFor="pf-expansion">Chest expansion (cm)</label>
              <input id="pf-expansion" className="vx-field" type="number" inputMode="numeric" min="0" max="20" name="chestExpansion" value={d.chestExpansion} onChange={handleChange} placeholder="e.g. 5" />
            </div>
          </div>
        );

      case 16:
        return (
          <MultiChoiceGroup columns={2} values={d.careerPreferences} onToggle={(v) => handleMultiSelect('careerPreferences', v)}
            options={['POLICE_CAPF', 'SSC', 'BANKING', 'RAILWAYS', 'TEACHING', 'ENGINEERING', 'NURSING'].map(p => ({ value: p, label: p.replace('_', ' ') }))} />
        );

      case 17:
        return (
          <MultiChoiceGroup columns={2} values={d.sewaNidhiInterests} onToggle={(v) => handleMultiSelect('sewaNidhiInterests', v)}
            options={['Agriculture', 'Small Business', 'Security Agency', 'Transport', 'Skill Training', 'Tourism'].map(i => ({ value: i, label: i }))} />
        );

      case 18:
        return (
          <div>
            <div className="pf-summary-card">
              <p><strong>Name:</strong> {d.fullName || '—'}</p>
              <p><strong>Service branch:</strong> {d.serviceBranch || '—'}</p>
              <p><strong>Qualification:</strong> {d.highestQualification || '—'}</p>
            </div>
            <Button type="button" variant="ghost" size="sm" onClick={() => setShowFullApplication(true)} style={{ marginBottom: '1.25rem' }}>
              View full application
            </Button>
            <label className="pf-consent">
              <input type="checkbox" name="consent" checked={d.consent} onChange={handleChange} />
              <span>I confirm all the information I've provided is accurate.</span>
            </label>
          </div>
        );

      default:
        return null;
    }
  };

  if (draftPrompt === 'pending') {
    return (
      <div className="pf-draft-prompt">
        <div className="pf-draft-card">
          <h2>Welcome back</h2>
          <p>We saved your progress from last time. Pick up where you left off, or start fresh.</p>
          <div className="pf-draft-actions">
            <Button variant="secondary" onClick={() => { clearDraft(); setDraftPrompt(null); }}>Start fresh</Button>
            <Button onClick={() => {
              const draft = loadDraft();
              if (draft?.formData) setFormData(prev => ({ ...prev, ...draft.formData }));
              if (typeof draft?.currentStep === 'number') setCurrentStep(draft.currentStep);
              setDraftPrompt(null);
            }}>
              Resume my profile
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

  return (
    <div style={{ background: 'var(--ios-bg)', minHeight: '100%' }}>
      <div className="pf-hero">
        <h1>Career Profiling</h1>
        <p>A few focused questions — we'll surface what we're learning as you go, then match you against every eligible exam.</p>
      </div>

      <GuidedStep
        stages={STAGES}
        activeStageId={QUESTION_STAGE[currentStep]}
        stepNumber={currentStep + 1}
        totalSteps={TOTAL_STEPS}
        title={QUESTION_TITLES[currentStep]}
        helpText={QUESTION_HELP[currentStep]}
        insights={insights}
        onBack={goBack}
        backDisabled={currentStep === 0}
        onNext={goNext}
        nextDisabled={!validateQuestion(currentStep) || (currentStep === TOTAL_STEPS - 1 && loading)}
        nextLabel={currentStep === TOTAL_STEPS - 1 ? (loading ? 'Submitting…' : 'Complete profile') : 'Continue'}
        loading={currentStep === TOTAL_STEPS - 1 && loading}
      >
        {renderQuestion()}
      </GuidedStep>

      {showFullApplication && (
        <Sheet open={showFullApplication} onClose={() => setShowFullApplication(false)} title="Your application so far" maxWidth="700px">
          <ApplicationSummary d={formData} />
        </Sheet>
      )}

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

        .pf-inline-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; }
        .pf-inline-3 { display: grid; grid-template-columns: 1fr 1.3fr 1fr; gap: 0.75rem; }
        @media (max-width: 480px) { .pf-inline-3 { grid-template-columns: 1fr; } }

        .pf-vitals-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
        .pf-vitals-field label { display: block; font-size: 0.8rem; font-weight: 600; color: #334155; margin-bottom: 0.35rem; }

        .pf-summary-card { background: var(--surface-alt); border-radius: var(--radius-sm); padding: 1.25rem; margin-bottom: 1rem; }
        .pf-summary-card p { margin: 0 0 0.4rem; font-size: 0.9rem; }
        .pf-summary-card p:last-child { margin-bottom: 0; }

        .pf-consent {
          display: flex;
          align-items: flex-start;
          gap: 0.75rem;
          cursor: pointer;
          background: rgba(75,107,50,0.05);
          padding: 1rem;
          border-radius: var(--radius-sm);
        }
        .pf-consent input { margin-top: 0.2rem; }
        .pf-consent span { font-size: 0.9rem; font-weight: 600; }
      `}</style>
    </div>
  );
};

const QUESTION_TITLES = [
  "What's your full name?",
  'When were you born?',
  'Which reservation category do you belong to?',
  "What's your marital status?",
  "What's your state of domicile?",
  'Which district?',
  "What's your email address?",
  "What's your mobile number?",
  'Which service branch did you serve in?',
  'Which arm or corps were you part of?',
  'What was your role or appointment?',
  'How long did you serve?',
  'What was your character on discharge?',
  "What's your highest qualification?",
  'Do you hold an NCC certification?',
  'A few physical fitness details',
  "Which career tracks interest you most?",
  'Interested in Sewa Nidhi opportunities?',
  'Review and confirm',
];

const QUESTION_HELP = [
  'This is how your name will appear on your VeerNXT profile.',
  undefined,
  'Used only to check eligibility for reservation-based exam quotas.',
  undefined,
  "We'll flag exams that give preference to your home state.",
  'Optional — helps narrow domicile-based eligibility further.',
  "We'll use this to keep you updated on your matches.",
  'Used for OTP-based account recovery and updates.',
  undefined,
  'This narrows down to the arms/corps that exist within your branch.',
  'This is filtered to roles that exist within your arm/corps.',
  'Total time in service — a strong signal on many exams.',
  undefined,
  undefined,
  'Optional — NCC certification is a small scoring bonus on many exams.',
  'These map against physical eligibility standards for specific exams.',
  'Select every track you would seriously consider — the more, the better we can match you.',
  'Optional — entrepreneurship and reintegration support programmes.',
  "Take one last look before we calculate your VeerScore and matches.",
];

function ApplicationSummarySection({ title, rows }) {
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '1.25rem' }}>
      <h4 style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--ios-olive)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 0.85rem' }}>{title}</h4>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.85rem' }}>
        {rows.map(([label, value]) => (
          <div key={label}>
            <div style={{ fontSize: '0.68rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>{label}</div>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a' }}>{value || '—'}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ApplicationSummary({ d }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <ApplicationSummarySection title="Identity" rows={[
        ['Full name', d.fullName],
        ['Date of birth', d.dobDay && d.dobMonth && d.dobYear ? `${d.dobDay}-${d.dobMonth}-${d.dobYear}` : ''],
        ['Category', d.category],
        ['Marital status', d.maritalStatus],
        ['State of domicile', d.stateOfDomicile],
        ['District', d.district],
        ['Email', d.email],
        ['Mobile', d.mobile],
      ]} />
      <ApplicationSummarySection title="Service record" rows={[
        ['Service branch', d.serviceBranch],
        ['Arm / Corps / Trade', d.armCorpsTrade],
        ['Role / Appointment', d.roleAppointment],
        ['Service duration', (d.serviceYears || d.serviceMonths) ? `${d.serviceYears || 0} years, ${d.serviceMonths || 0} months` : ''],
        ['Character on discharge', d.characterOnDischarge],
      ]} />
      <ApplicationSummarySection title="Academics" rows={[
        ['Highest qualification', d.highestQualification],
        ['NCC certification', d.nccCertification],
      ]} />
      <ApplicationSummarySection title="Physical" rows={[
        ['Height', d.heightCm ? `${d.heightCm} cm` : ''],
        ['Weight', d.weightKg ? `${d.weightKg} kg` : ''],
        ['Chest', d.chestCm && d.chestExpansion ? `${d.chestCm} cm (+${d.chestExpansion} cm expansion)` : ''],
      ]} />
      <ApplicationSummarySection title="Career & interests" rows={[
        ['Career preferences', d.careerPreferences?.length ? d.careerPreferences.join(', ') : ''],
        ['Sewa Nidhi interests', d.sewaNidhiInterests?.length ? d.sewaNidhiInterests.join(', ') : ''],
      ]} />
    </div>
  );
}

export default Profiling;
