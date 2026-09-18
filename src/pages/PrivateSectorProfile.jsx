import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import {
  RefreshCw,
  Briefcase,
  ShieldCheck,
  CheckCircle2,
  Circle,
  Tag,
  Plus,
  X,
  Building2,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Lock,
  ArrowRight,
  Eye,
  Award,
  Users,
  Compass,
} from 'lucide-react';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Select from '../components/ui/Select';
import GuidedStep from '../components/ui/GuidedStep';
import { ChoiceGroup, MultiChoiceGroup } from '../components/ui/ChoiceGroup';
import { STATE_DISTRICTS } from '../lib/districts';
import {
  SERVICES,
  SERVICE_TAXONOMY,
  RANK_OPTIONS,
  WORK_TYPES,
  DUTY_GROUPS,
  QUALIFICATION_AREAS,
} from '../lib/militaryTaxonomy';

const STAGES = [
  { id: 'service', label: 'Service Record' },
  { id: 'duties', label: 'Duty Evidence' },
  { id: 'responsibility', label: 'Responsibility' },
  { id: 'qualifications', label: 'Qualifications' },
  { id: 'preferences', label: 'Preferences' },
  { id: 'translation', label: 'Civilian Profile' },
  { id: 'verification', label: 'Verification' },
];

const STEP_IDS = [
  'service',
  'duties',
  'responsibility',
  'qualifications',
  'preferences',
  'translation',
  'verification',
  'done',
];

const PrivateSectorProfile = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const returnTo = searchParams.get('returnTo');
  const [checking, setChecking] = useState(true);
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState(0);
  const [openDutyAccordion, setOpenDutyAccordion] = useState({ leadership: true, security: true });

  const [formData, setFormData] = useState({
    // Tri-Service Record
    service: 'Indian Army',
    service_category: 'COMBAT ARM',
    branch: 'INFANTRY',
    trade: 'Rifleman (Rifle/LMG)',
    rank: 'Agniveer',
    service_years: 'Up to 4 years',
    trade_proficiency: 'Class I',
    // Duties & Responsibility
    duties: [],
    team_size_supervised: 0,
    highest_working_level: 'Worked independently',
    // Qualifications & Licences
    civil_licences: [],
    licences_qualifications: [],
    // Work Preferences
    path: 'operational',
    work_types: [],
    sectors: [],
    skills: [],
    tags: [],
    locationMode: 'state',
    locationState: '',
    locationCity: '',
    availability: 'Immediately',
    other_preferences: '',
    // Privacy & Consent Controls
    consent_masked: true,
    consent_contact: true,
  });

  const [verification, setVerification] = useState({ service_number: '', file: null, fileName: '' });
  const [existingVerification, setExistingVerification] = useState(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    (async () => {
      const {
        data: { session: currentSession },
      } = await supabase.auth.getSession();
      if (!currentSession) {
        navigate('/login');
        return;
      }

      const { data: profile } = await supabase
        .from('ps_candidate_profiles')
        .select('*')
        .eq('user_id', currentSession.user.id)
        .maybeSingle();

      if (profile) {
        setFormData((prev) => ({
          ...prev,
          service: profile.service || prev.service,
          service_category: profile.service_category || prev.service_category,
          branch: profile.branch || prev.branch,
          trade: profile.trade || prev.trade,
          rank: profile.rank || prev.rank,
          service_years: profile.service_years || prev.service_years,
          trade_proficiency: profile.trade_proficiency || prev.trade_proficiency,
          duties: profile.duties || [],
          team_size_supervised: profile.team_size_supervised || 0,
          highest_working_level: profile.highest_working_level || prev.highest_working_level,
          civil_licences: profile.civil_licences || [],
          licences_qualifications: profile.licences_qualifications || [],
          path: profile.path || 'operational',
          work_types: profile.work_types || [],
          sectors: profile.sectors || [],
          skills: profile.skills || [],
          tags: profile.tags || [],
          locationState: profile.preferred_locations?.[0]?.state || '',
          locationCity: profile.preferred_locations?.[0]?.city || '',
          availability: profile.availability || 'Immediately',
          other_preferences: profile.other_preferences || '',
          consent_masked: profile.consent_masked !== false,
          consent_contact: profile.consent_contact !== false,
        }));
      }

      const { data: latestVerification } = await supabase
        .from('ps_verifications')
        .select('*')
        .eq('user_id', currentSession.user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      setExistingVerification(latestVerification || null);

      setChecking(false);
    })();
  }, [navigate]);

  const setField = (name, value) => setFormData((prev) => ({ ...prev, [name]: value }));

  const handleServiceChange = (service) => {
    const branches = Object.keys(SERVICE_TAXONOMY[service] || {});
    const firstBranch = branches[0] || '';
    const branchData = SERVICE_TAXONOMY[service]?.[firstBranch] || {};
    const firstTrade = branchData.trades?.[0]?.name || '';
    const ranks = RANK_OPTIONS[service] || [];

    setFormData((prev) => ({
      ...prev,
      service,
      service_category: branchData.category || '',
      branch: firstBranch,
      trade: firstTrade,
      rank: ranks[0] || 'Agniveer',
      duties: [],
    }));
  };

  const handleBranchChange = (branch) => {
    const branchData = SERVICE_TAXONOMY[formData.service]?.[branch] || {};
    const firstTrade = branchData.trades?.[0]?.name || '';

    setFormData((prev) => ({
      ...prev,
      branch,
      service_category: branchData.category || prev.service_category,
      trade: firstTrade,
      duties: [],
    }));
  };

  const handleTradeChange = (tradeName) => {
    const trades = SERVICE_TAXONOMY[formData.service]?.[formData.branch]?.trades || [];
    const matched = trades.find((t) => t.name === tradeName);
    const suggestedDuties = [];
    if (matched && matched.caps) {
      matched.caps.forEach((capKey) => {
        const group = DUTY_GROUPS[capKey];
        if (group && group.items[0]) {
          suggestedDuties.push(`${capKey}|${group.items[0]}`);
        }
      });
    }

    setFormData((prev) => ({
      ...prev,
      trade: tradeName,
      duties: suggestedDuties.length > 0 ? suggestedDuties : prev.duties,
    }));
  };

  const toggleDuty = (capKey, item) => {
    const dutyTag = `${capKey}|${item}`;
    setFormData((prev) => {
      const exists = prev.duties.includes(dutyTag);
      const nextDuties = exists ? prev.duties.filter((d) => d !== dutyTag) : [...prev.duties, dutyTag];

      // Derive mapped work types from selected duty capability keys
      const capKeys = [...new Set(nextDuties.map((d) => d.split('|')[0]))];
      const derivedWorkTypes = WORK_TYPES.filter((w) => capKeys.includes(w.capKey)).map((w) => w.id);

      return {
        ...prev,
        duties: nextDuties,
        work_types: derivedWorkTypes,
      };
    });
  };

  const toggleLicence = (licence) => {
    setFormData((prev) => {
      const exists = prev.civil_licences.includes(licence);
      const next = exists ? prev.civil_licences.filter((l) => l !== licence) : [...prev.civil_licences, licence];
      return {
        ...prev,
        civil_licences: next,
        licences_qualifications: next,
      };
    });
  };

  const toggleDutyAccordion = (key) => {
    setOpenDutyAccordion((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const currentStepId = STEP_IDS[step] || 'service';
  const totalSteps = STEP_IDS.length - 1;

  const currentBranchOptions = Object.keys(SERVICE_TAXONOMY[formData.service] || {});
  const currentTradeOptions = (
    SERVICE_TAXONOMY[formData.service]?.[formData.branch]?.trades || []
  ).map((t) => t.name);

  // Derive duty categories active in duties
  const activeCapKeys = [...new Set(formData.duties.map((d) => d.split('|')[0]))];
  const translatedCapabilities = activeCapKeys.map((key) => ({
    key,
    title: DUTY_GROUPS[key]?.title || key,
    civil: DUTY_GROUPS[key]?.civil || key,
    dutyCount: formData.duties.filter((d) => d.startsWith(`${key}|`)).length,
  }));

  const verificationSubmitted = !!existingVerification;

  const validateStep = () => {
    switch (currentStepId) {
      case 'service':
        return !!formData.service && !!formData.branch && !!formData.trade;
      case 'duties':
        return formData.duties.length > 0;
      case 'responsibility':
        return true;
      case 'qualifications':
        return true;
      case 'preferences':
        return !!formData.availability;
      case 'translation':
        return true;
      case 'verification':
        return verificationSubmitted || (!!verification.service_number && !!verification.file);
      default:
        return true;
    }
  };

  const saveProfile = async (overrides = {}) => {
    setSaving(true);
    try {
      const {
        data: { session: currentSession },
      } = await supabase.auth.getSession();
      if (!currentSession) {
        navigate('/login');
        return false;
      }

      const body = {
        action: 'save_profile',
        service: formData.service,
        service_category: formData.service_category,
        branch: formData.branch,
        trade: formData.trade,
        rank: formData.rank,
        service_years: formData.service_years,
        trade_proficiency: formData.trade_proficiency,
        duties: formData.duties,
        team_size_supervised: Number(formData.team_size_supervised || 0),
        highest_working_level: formData.highest_working_level,
        civil_licences: formData.civil_licences,
        licences_qualifications: formData.civil_licences,
        path: formData.path || 'operational',
        work_types: formData.work_types,
        sectors: formData.sectors,
        skills: formData.skills,
        tags: formData.tags,
        preferred_locations: formData.locationState
          ? [{ state: formData.locationState, city: formData.locationCity }]
          : [],
        availability: formData.availability,
        other_preferences: formData.other_preferences,
        consent_masked: formData.consent_masked,
        consent_contact: formData.consent_contact,
        profile_completed: false,
        ...overrides,
      };

      const res = await fetch('/api/private-sector/router', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${currentSession.access_token}`,
        },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || 'Failed to save profile');
      return true;
    } catch (err) {
      console.error('Failed to save profile:', err);
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
      const {
        data: { session: currentSession },
      } = await supabase.auth.getSession();
      const ext = verification.file.name.split('.').pop();
      const path = `${currentSession.user.id}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('ps-verification-docs')
        .upload(path, verification.file, { cacheControl: '3600' });
      if (uploadError) throw uploadError;

      const res = await fetch('/api/private-sector/router', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${currentSession.access_token}`,
        },
        body: JSON.stringify({
          action: 'submit_verification',
          service_number: verification.service_number,
          document_path: path,
        }),
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

    if (currentStepId === 'verification') {
      const ok = await submitVerification();
      if (!ok) return;
      const savedOk = await saveProfile({ profile_completed: true });
      if (!savedOk) return;
      setStep((s) => s + 1);
      window.scrollTo(0, 0);
      return;
    }

    // Auto-save on moving past translation step
    if (currentStepId === 'translation') {
      await saveProfile({ profile_completed: false });
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
    else navigate('/private-sector/opportunities', { replace: true });
  };

  if (checking) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem 1rem' }}>
        <RefreshCw className="animate-spin" size={28} color="var(--ios-olive, #4b6b32)" />
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', paddingBottom: '4rem' }}>
      {/* OpSec Information Discipline Banner */}
      <div
        style={{
          background: '#fef3c7',
          borderBottom: '1px solid #fde68a',
          padding: '0.65rem 1.25rem',
          fontSize: '0.82rem',
          color: '#92400e',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.5rem',
          textAlign: 'center',
        }}
      >
        <Lock size={15} />
        <span>
          <strong>Information Discipline:</strong> Do not enter classified operations, sensitive deployment locations,
          or restricted equipment specifications.
        </span>
      </div>

      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '1.5rem 1rem' }}>
        {/* Header */}
        <div style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
          <span
            style={{
              display: 'inline-block',
              fontSize: '0.75rem',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: '#b28a32',
              fontWeight: 800,
              marginBottom: '0.35rem',
            }}
          >
            VeerNXT Tri-Service Capability Bridge
          </span>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.4rem' }}>
            Build Your Civilian Capability Profile
          </h1>
          <p style={{ fontSize: '0.92rem', color: '#64748b', maxWidth: '640px', margin: '0 auto' }}>
            Answer in your familiar military terms. VeerNXT translates your service evidence into corporate employability
            while keeping your personal identity and contact details protected.
          </p>
        </div>

        {/* Step Progress Rail */}
        {currentStepId !== 'done' && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginBottom: '1.75rem', flexWrap: 'wrap' }}>
            {STAGES.map((s, idx) => {
              const isActive = idx === step;
              const isDone = idx < step;
              return (
                <div
                  key={s.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    fontSize: '0.8rem',
                    fontWeight: isActive ? 700 : 500,
                    color: isActive ? 'var(--ios-olive, #4b6b32)' : isDone ? '#0f172a' : '#94a3b8',
                    padding: '0.35rem 0.65rem',
                    borderRadius: '20px',
                    background: isActive ? 'rgba(75,107,50,0.1)' : 'transparent',
                  }}
                >
                  <span
                    style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      background: isDone ? 'var(--ios-olive, #4b6b32)' : isActive ? 'var(--ios-olive, #4b6b32)' : '#e2e8f0',
                      color: isDone || isActive ? '#fff' : '#64748b',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.72rem',
                    }}
                  >
                    {isDone ? '✓' : idx + 1}
                  </span>
                  <span>{s.label}</span>
                </div>
              );
            })}
          </div>
        )}

        {/* Form Container */}
        <Card style={{ padding: '2rem', background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 20px rgba(0,0,0,0.04)' }}>
          {/* STEP 1: SERVICE RECORD */}
          {currentStepId === 'service' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.25rem' }}>
                  1. Confirm Your Service Background
                </h2>
                <p style={{ fontSize: '0.86rem', color: '#64748b', margin: 0 }}>
                  Select the branch, trade, and rank of your service.
                </p>
              </div>

              {/* Service Tabs */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
                {SERVICES.map((s) => {
                  const sel = formData.service === s;
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => handleServiceChange(s)}
                      style={{
                        padding: '1rem',
                        borderRadius: '10px',
                        border: sel ? '2px solid var(--ios-olive, #4b6b32)' : '1px solid #cbd5e1',
                        background: sel ? 'rgba(75,107,50,0.08)' : '#fff',
                        fontWeight: 700,
                        fontSize: '0.95rem',
                        color: sel ? 'var(--ios-olive, #4b6b32)' : '#334155',
                        cursor: 'pointer',
                      }}
                    >
                      {s}
                    </button>
                  );
                })}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                    Arm, Corps or Branch
                  </label>
                  <select
                    value={formData.branch}
                    onChange={(e) => handleBranchChange(e.target.value)}
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff' }}
                  >
                    {currentBranchOptions.map((b) => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                    Trade / Specialisation
                  </label>
                  <select
                    value={formData.trade}
                    onChange={(e) => handleTradeChange(e.target.value)}
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff' }}
                  >
                    {currentTradeOptions.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                    Rank at Release
                  </label>
                  <select
                    value={formData.rank}
                    onChange={(e) => setField('rank', e.target.value)}
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff' }}
                  >
                    {(RANK_OPTIONS[formData.service] || []).map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                    Total Service Duration
                  </label>
                  <select
                    value={formData.service_years}
                    onChange={(e) => setField('service_years', e.target.value)}
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff' }}
                  >
                    <option>Up to 4 years (Agniveer)</option>
                    <option>5 to 9 years</option>
                    <option>10 to 15 years</option>
                    <option>16 to 20 years</option>
                    <option>More than 20 years</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: DUTY EVIDENCE */}
          {currentStepId === 'duties' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.25rem' }}>
                  2. Duty Evidence: What Work Did You Actually Perform?
                </h2>
                <p style={{ fontSize: '0.86rem', color: '#64748b', margin: 0 }}>
                  Select all duty areas you have hands-on experience in. Recruiters match capability evidence, not just trade titles.
                </p>
              </div>

              <div style={{ padding: '0.75rem 1rem', background: '#f1f5f9', borderRadius: '8px', fontSize: '0.82rem', color: '#334155' }}>
                Selected Trade: <strong>{formData.trade}</strong> ({formData.service}, {formData.branch}).
                Confirm duties below.
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {Object.entries(DUTY_GROUPS).map(([capKey, group]) => {
                  const isOpen = !!openDutyAccordion[capKey];
                  const selectedInGroup = formData.duties.filter((d) => d.startsWith(`${capKey}|`));

                  return (
                    <div
                      key={capKey}
                      style={{
                        border: '1px solid #cbd5e1',
                        borderRadius: '10px',
                        overflow: 'hidden',
                        background: '#fff',
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => toggleDutyAccordion(capKey)}
                        style={{
                          width: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '0.85rem 1.15rem',
                          background: isOpen ? '#f8fafc' : '#fff',
                          border: 'none',
                          cursor: 'pointer',
                          textAlign: 'left',
                        }}
                      >
                        <div>
                          <strong style={{ fontSize: '0.92rem', color: '#0f172a' }}>{group.title}</strong>
                          <span style={{ fontSize: '0.78rem', color: '#64748b', display: 'block' }}>{group.civil}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          {selectedInGroup.length > 0 && (
                            <span style={{ fontSize: '0.75rem', padding: '0.15rem 0.5rem', background: 'rgba(75,107,50,0.15)', color: 'var(--ios-olive, #4b6b32)', borderRadius: '12px', fontWeight: 700 }}>
                              {selectedInGroup.length} selected
                            </span>
                          )}
                          {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                        </div>
                      </button>

                      {isOpen && (
                        <div style={{ padding: '1rem 1.15rem', borderTop: '1px solid #f1f5f9', display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                          {group.items.map((item) => {
                            const isChecked = formData.duties.includes(`${capKey}|${item}`);
                            return (
                              <button
                                key={item}
                                type="button"
                                onClick={() => toggleDuty(capKey, item)}
                                style={{
                                  padding: '0.45rem 0.85rem',
                                  borderRadius: '20px',
                                  fontSize: '0.8rem',
                                  border: isChecked ? '1.5px solid var(--ios-olive, #4b6b32)' : '1px solid #cbd5e1',
                                  background: isChecked ? 'var(--ios-olive, #4b6b32)' : '#f8fafc',
                                  color: isChecked ? '#fff' : '#334155',
                                  fontWeight: isChecked ? 700 : 500,
                                  cursor: 'pointer',
                                  transition: 'all 0.15s ease',
                                }}
                              >
                                {isChecked ? '✓ ' : ''}{item}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 3: RESPONSIBILITY & APPOINTMENTS */}
          {currentStepId === 'responsibility' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.25rem' }}>
                  3. What Scale of Responsibility Did You Carry?
                </h2>
                <p style={{ fontSize: '0.86rem', color: '#64748b', margin: 0 }}>
                  Agniveers and NCOs often supervise teams, vehicles, or expensive military equipment.
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                    Largest Team / Crew Supervised
                  </label>
                  <select
                    value={formData.team_size_supervised}
                    onChange={(e) => setField('team_size_supervised', Number(e.target.value))}
                    style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff' }}
                  >
                    <option value={0}>Individual operator (No formal supervision)</option>
                    <option value={4}>Small team / Buddy pair (2 to 5 personnel)</option>
                    <option value={10}>Section / Crew (6 to 15 personnel)</option>
                    <option value={25}>Platoon / Shift (16 to 30 personnel)</option>
                    <option value={40}>Company / Detachment (More than 30 personnel)</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                    Highest Working Level
                  </label>
                  <select
                    value={formData.highest_working_level}
                    onChange={(e) => setField('highest_working_level', e.target.value)}
                    style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff' }}
                  >
                    <option>Worked under supervision</option>
                    <option>Worked independently</option>
                    <option>Supervised people or operational assets</option>
                    <option>Inspected, audited or quality-checked work</option>
                    <option>Instructed and trained others</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                  Brief Operational Duty Example (Without classified details)
                </label>
                <textarea
                  value={formData.other_preferences}
                  onChange={(e) => setField('other_preferences', e.target.value)}
                  placeholder="e.g. Supervised eight drivers and fleet vehicle readiness, maintained shift logs, inspected safety gear."
                  rows={3}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontFamily: 'inherit' }}
                />
              </div>
            </div>
          )}

          {/* STEP 4: QUALIFICATIONS & CIVIL LICENCES */}
          {currentStepId === 'qualifications' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.25rem' }}>
                  4. Qualifications, Licences & Certifications
                </h2>
                <p style={{ fontSize: '0.86rem', color: '#64748b', margin: 0 }}>
                  Select all valid civil licences and recognized service qualifications you hold.
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {Object.entries(QUALIFICATION_AREAS).map(([groupName, items]) => (
                  <div key={groupName} style={{ border: '1px solid #cbd5e1', borderRadius: '10px', padding: '1rem', background: '#fff' }}>
                    <strong style={{ fontSize: '0.9rem', color: '#0f172a', display: 'block', marginBottom: '0.65rem' }}>
                      {groupName}
                    </strong>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                      {items.map((licence) => {
                        const isChecked = formData.civil_licences.includes(licence);
                        return (
                          <button
                            key={licence}
                            type="button"
                            onClick={() => toggleLicence(licence)}
                            style={{
                              padding: '0.45rem 0.85rem',
                              borderRadius: '20px',
                              fontSize: '0.8rem',
                              border: isChecked ? '1.5px solid #9C7A2E' : '1px solid #cbd5e1',
                              background: isChecked ? '#F2E9D3' : '#f8fafc',
                              color: isChecked ? '#5c4b20' : '#334155',
                              fontWeight: isChecked ? 700 : 500,
                              cursor: 'pointer',
                            }}
                          >
                            {isChecked ? '✓ ' : ''}{licence}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* STEP 5: CAREER PREFERENCES */}
          {currentStepId === 'preferences' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.25rem' }}>
                  5. Work Preferences & Availability
                </h2>
                <p style={{ fontSize: '0.86rem', color: '#64748b', margin: 0 }}>
                  Specify where you want to work and when you can join.
                </p>
              </div>

              {/* Path Option */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
                <button
                  type="button"
                  onClick={() => setField('path', 'operational')}
                  style={{
                    padding: '1.15rem',
                    borderRadius: '10px',
                    textAlign: 'left',
                    border: formData.path === 'operational' ? '2px solid var(--ios-olive, #4b6b32)' : '1px solid #cbd5e1',
                    background: formData.path === 'operational' ? 'rgba(75,107,50,0.08)' : '#fff',
                    cursor: 'pointer',
                  }}
                >
                  <strong style={{ display: 'block', fontSize: '0.95rem', color: '#0f172a', marginBottom: '0.25rem' }}>
                    Field & Operational Roles
                  </strong>
                  <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                    Hands-on driving, technician, security, plant, logistics, warehouse operations.
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setField('path', 'professional')}
                  style={{
                    padding: '1.15rem',
                    borderRadius: '10px',
                    textAlign: 'left',
                    border: formData.path === 'professional' ? '2px solid var(--ios-olive, #4b6b32)' : '1px solid #cbd5e1',
                    background: formData.path === 'professional' ? 'rgba(75,107,50,0.08)' : '#fff',
                    cursor: 'pointer',
                  }}
                >
                  <strong style={{ display: 'block', fontSize: '0.95rem', color: '#0f172a', marginBottom: '0.25rem' }}>
                    Supervisory & Management
                  </strong>
                  <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                    Frontline supervision, facility in-charge, technical training, admin coordination.
                  </span>
                </button>
              </div>

              {/* Location & Availability */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                    Preferred State
                  </label>
                  <select
                    value={formData.locationState}
                    onChange={(e) => {
                      setField('locationState', e.target.value);
                      setField('locationCity', '');
                    }}
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff' }}
                  >
                    <option value="">Anywhere in India</option>
                    {Object.keys(STATE_DISTRICTS).map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                    Preferred District
                  </label>
                  <select
                    value={formData.locationCity}
                    onChange={(e) => setField('locationCity', e.target.value)}
                    disabled={!formData.locationState}
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff' }}
                  >
                    <option value="">All districts in state</option>
                    {(STATE_DISTRICTS[formData.locationState] || []).map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                    When Can You Start?
                  </label>
                  <select
                    value={formData.availability}
                    onChange={(e) => setField('availability', e.target.value)}
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff' }}
                  >
                    <option value="Immediately">Immediately</option>
                    <option value="Within 30 days">Within 30 days</option>
                    <option value="Within 60 days">Within 60 days</option>
                    <option value="More than 60 days">More than 60 days</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* STEP 6: CIVILIAN TRANSLATION & PRIVACY CONTROLS */}
          {currentStepId === 'translation' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.25rem' }}>
                  6. Your Civilian Capability Translation
                </h2>
                <p style={{ fontSize: '0.86rem', color: '#64748b', margin: 0 }}>
                  This is how your verified service evidence will read to corporate employers and recruiters.
                </p>
              </div>

              {/* Translation Summary Box */}
              <div style={{ border: '1px solid #cbd5e1', borderRadius: '12px', overflow: 'hidden' }}>
                <div style={{ padding: '0.85rem 1.15rem', background: '#f1f5f9', borderBottom: '1px solid #cbd5e1', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong style={{ fontSize: '0.9rem', color: '#0f172a' }}>Military Evidence $\rightarrow$ Civilian Capability</strong>
                  <span style={{ fontSize: '0.78rem', color: 'var(--ios-olive, #4b6b32)', fontWeight: 700 }}>
                    {translatedCapabilities.length} Capability Areas
                  </span>
                </div>

                <div style={{ padding: '1rem 1.15rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  {translatedCapabilities.map((cap) => (
                    <div
                      key={cap.key}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 30px 1fr',
                        alignItems: 'center',
                        gap: '0.75rem',
                        paddingBottom: '0.75rem',
                        borderBottom: '1px solid #f1f5f9',
                      }}
                    >
                      <div>
                        <strong style={{ fontSize: '0.85rem', color: '#1e293b' }}>{cap.title}</strong>
                        <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block' }}>
                          {cap.dutyCount} duty item{cap.dutyCount > 1 ? 's' : ''} confirmed
                        </span>
                      </div>
                      <div style={{ textAlign: 'center', color: '#9C7A2E', fontWeight: 700 }}>$\rightarrow$</div>
                      <div>
                        <strong style={{ fontSize: '0.85rem', color: 'var(--ios-olive, #4b6b32)' }}>{cap.civil}</strong>
                        <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block' }}>
                          Evidence backed by {formData.service} ({formData.branch})
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Privacy & Consent Protocol */}
              <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '1.25rem', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  <Lock size={18} color="var(--ios-olive, #4b6b32)" />
                  <strong style={{ fontSize: '0.92rem', color: '#0f172a' }}>Candidate Privacy & Consent Protocol</strong>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', fontSize: '0.85rem', color: '#334155', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={formData.consent_masked}
                      onChange={(e) => setField('consent_masked', e.target.checked)}
                      style={{ width: '17px', height: '17px', accentColor: 'var(--ios-olive, #4b6b32)' }}
                    />
                    <span>
                      <strong>Masked Profile:</strong> Keep my name, mobile number, and email masked to employers during talent search.
                    </span>
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', fontSize: '0.85rem', color: '#334155', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={formData.consent_contact}
                      onChange={(e) => setField('consent_contact', e.target.checked)}
                      style={{ width: '17px', height: '17px', accentColor: 'var(--ios-olive, #4b6b32)' }}
                    />
                    <span>
                      <strong>Consent Gate:</strong> Only reveal my contact details after I review and accept an employer's specific introduction request.
                    </span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* STEP 7: SERVICE VERIFICATION */}
          {currentStepId === 'verification' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.25rem' }}>
                  7. Service Document Verification
                </h2>
                <p style={{ fontSize: '0.86rem', color: '#64748b', margin: 0 }}>
                  Upload your Release Certificate, Discharge Book, or Agniveer Card to earn the Verified Veteran badge.
                </p>
              </div>

              {verificationSubmitted ? (
                <div style={{ padding: '1.25rem', borderRadius: '10px', background: 'rgba(75,107,50,0.08)', border: '1px solid var(--ios-olive, #4b6b32)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <ShieldCheck size={24} color="var(--ios-olive, #4b6b32)" />
                  <div>
                    <strong style={{ fontSize: '0.95rem', color: '#0f172a' }}>Verification Document Submitted</strong>
                    <span style={{ fontSize: '0.82rem', color: '#64748b', display: 'block' }}>
                      Status: <strong>{existingVerification.status?.toUpperCase()}</strong> ({existingVerification.service_number})
                    </span>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                      Army / Navy / Air Force Service Number
                    </label>
                    <input
                      type="text"
                      value={verification.service_number}
                      onChange={(e) => setVerification((v) => ({ ...v, service_number: e.target.value }))}
                      placeholder="e.g. 15689452X"
                      style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                      Discharge Book / Release Certificate (PDF or Image)
                    </label>
                    <input
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) setVerification((v) => ({ ...v, file, fileName: file.name }));
                      }}
                      style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', border: '1px dashed #cbd5e1' }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 8: DONE / PROFILE LIVE */}
          {currentStepId === 'done' && (
            <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  background: 'rgba(75,107,50,0.12)',
                  color: 'var(--ios-olive, #4b6b32)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 1rem',
                }}
              >
                <CheckCircle2 size={36} />
              </div>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.4rem' }}>
                Your Civilian Profile Is Live
              </h2>
              <p style={{ fontSize: '0.9rem', color: '#64748b', maxWidth: '520px', margin: '0 auto 1.5rem' }}>
                Corporate partners can now match against your verified capabilities. Your contact information remains
                strictly protected until you accept an employer's introduction request.
              </p>

              <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem' }}>
                <Button variant="primary" onClick={finish}>
                  Explore Matched Opportunities $\rightarrow$
                </Button>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          {currentStepId !== 'done' && (
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginTop: '2rem',
                paddingTop: '1.25rem',
                borderTop: '1px solid #e2e8f0',
              }}
            >
              <button
                type="button"
                onClick={goBack}
                disabled={step === 0 || saving || uploading}
                style={{
                  background: 'none',
                  border: 'none',
                  color: step === 0 ? '#cbd5e1' : '#64748b',
                  cursor: step === 0 ? 'not-allowed' : 'pointer',
                  fontWeight: 600,
                  fontSize: '0.88rem',
                }}
              >
                $\leftarrow$ Back
              </button>

              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <Button
                  variant="primary"
                  onClick={goNext}
                  disabled={!validateStep() || saving || uploading}
                >
                  {saving || uploading ? (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <RefreshCw size={16} className="animate-spin" /> Saving...
                    </span>
                  ) : currentStepId === 'verification' ? (
                    'Submit & Activate Profile'
                  ) : (
                    'Save & Continue $\rightarrow$'
                  )}
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default PrivateSectorProfile;
