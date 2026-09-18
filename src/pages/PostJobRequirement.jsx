import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import {
  CheckCircle2,
  Tag,
  Plus,
  X,
  Briefcase,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Award,
  Users,
  Building2,
  Lock,
  Search,
  Filter,
  Sparkles,
} from 'lucide-react';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Select from '../components/ui/Select';
import GuidedStep from '../components/ui/GuidedStep';
import { MultiChoiceGroup, ChoiceGroup } from '../components/ui/ChoiceGroup';
import { STATE_DISTRICTS } from '../lib/districts';
import {
  SECTOR_TAXONOMY,
  SECTOR_OPTIONS,
  getRolesForSector,
  getTagsForSector,
} from '../lib/privateSectorTaxonomy';
import {
  WORK_TYPES,
  QUALIFICATION_AREAS,
  SECTOR_CAPABILITY_MAP,
  SECTOR_DEFAULT_CAPS,
  resolveSectorKey,
  getRecommendedWorkTypeIds,
  getRecommendedWorkTypes,
} from '../lib/militaryTaxonomy';

const STAGES = [
  { id: 'role', label: 'Role & Scope' },
  { id: 'capabilities', label: 'Capabilities' },
  { id: 'experience', label: 'Experience & Scale' },
  { id: 'terms', label: 'Terms & Ethics' },
  { id: 'review', label: 'Review' },
];

const TOTAL_STEPS = 5;

const TITLES = [
  'Define the Civilian Role & Industry',
  'Select Essential & Desirable Capabilities',
  'Team Leadership, Licences & Experience Band',
  'Employment Terms & Fair Hiring Charter',
  'Review & Submit Hiring Mission',
];

const HELP = [
  'Describe the civilian work. VeerNXT will search transferable evidence across the Army, Navy, and Air Force.',
  'Choose capabilities, not military trades. VeerNXT matches evidence from all three Services.',
  'Specify team supervision scale and mandatory civil licences.',
  'Candidates must see complete compensation and conditions before contact details are requested.',
  'Confirm details before submitting this requirement to our talent matching pipeline.',
];

const PostJobRequirement = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [expandedMil, setExpandedMil] = useState({});
  const [capFilterTab, setCapFilterTab] = useState('recommended'); // 'recommended' | 'all' | 'selected'
  const [capSearchQuery, setCapSearchQuery] = useState('');

  const [formData, setFormData] = useState({
    sector: 'Logistics, Supply Chain & Transport',
    roleTitles: ['Fleet Supervisor'],
    customRole: '',
    tags: [],
    quantity: '5',
    locations: ['Across India'],
    salaryRange: '₹35,000 to ₹45,000 per month',
    salaryMin: '35000',
    salaryMax: '45000',
    description: '',
    jdFile: null,
    jdFileName: '',
    // Capability-based fields
    essential_capabilities: ['wt_driver', 'wt_command'],
    desired_capabilities: ['wt_maint'],
    min_team_supervised: 6,
    experience_band: '3-8',
    required_licences: ['Civil HMV (Heavy Motor Vehicle)'],
    shift_pattern: 'Rotational shifts',
    service_preference: 'All',
    bridge_training_available: true,
    relocation_support: true,
    // Fair hiring confirmation
    fair_no_fee: true,
    fair_disclose: true,
    fair_consent: true,
    fair_no_rank_bias: true,
  });

  // Pre-fill sector from employer profile if available
  useEffect(() => {
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        const { data: profile } = await supabase
          .from('employer_profiles')
          .select('industry')
          .eq('id', session.user.id)
          .maybeSingle();

        if (profile?.industry) {
          const matched = SECTOR_OPTIONS.find(
            (s) =>
              s.toLowerCase().includes(profile.industry.toLowerCase()) ||
              profile.industry.toLowerCase().includes(s.toLowerCase())
          );
          if (matched) {
            const secKey = resolveSectorKey(matched);
            const defaults = secKey && SECTOR_DEFAULT_CAPS[secKey]
              ? SECTOR_DEFAULT_CAPS[secKey]
              : null;
            const defaultRoles = getRolesForSector(matched);

            setFormData((prev) => ({
              ...prev,
              sector: matched,
              roleTitles: defaultRoles.length > 0 ? [defaultRoles[0]] : prev.roleTitles,
              ...(defaults ? {
                essential_capabilities: defaults.essential || [],
                desired_capabilities: defaults.desired || [],
              } : {})
            }));
          }
        }
      } catch (err) {
        console.warn('Could not pre-fetch employer industry:', err);
      }
    })();
  }, []);

  const handleSectorChange = (newSector) => {
    const roles = getRolesForSector(newSector);
    const secKey = resolveSectorKey(newSector);
    const defaults = secKey && SECTOR_DEFAULT_CAPS[secKey]
      ? SECTOR_DEFAULT_CAPS[secKey]
      : { essential: ['wt_command'], desired: [] };

    setFormData((prev) => ({
      ...prev,
      sector: newSector,
      roleTitles: roles.length > 0 ? [roles[0]] : [],
      customRole: '',
      essential_capabilities: defaults.essential || [],
      desired_capabilities: defaults.desired || [],
    }));
    setCapFilterTab('recommended');
    setCapSearchQuery('');
  };

  const setField = (name, value) => setFormData((prev) => ({ ...prev, [name]: value }));

  const toggleRole = (val) =>
    setFormData((prev) => ({
      ...prev,
      roleTitles: prev.roleTitles.includes(val)
        ? prev.roleTitles.filter((r) => r !== val)
        : [...prev.roleTitles, val],
    }));

  const toggleEssentialCap = (id) =>
    setFormData((prev) => {
      const exists = prev.essential_capabilities.includes(id);
      const nextEssential = exists
        ? prev.essential_capabilities.filter((c) => c !== id)
        : [...prev.essential_capabilities, id];
      // remove from desired if added to essential
      const nextDesired = prev.desired_capabilities.filter((c) => c !== id);
      return {
        ...prev,
        essential_capabilities: nextEssential,
        desired_capabilities: nextDesired,
      };
    });

  const toggleDesiredCap = (id) =>
    setFormData((prev) => {
      const exists = prev.desired_capabilities.includes(id);
      const nextDesired = exists
        ? prev.desired_capabilities.filter((c) => c !== id)
        : [...prev.desired_capabilities, id];
      // remove from essential if added to desired
      const nextEssential = prev.essential_capabilities.filter((c) => c !== id);
      return {
        ...prev,
        essential_capabilities: nextEssential,
        desired_capabilities: nextDesired,
      };
    });

  const toggleMilDetail = (id) => {
    setExpandedMil((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const availableRoles = getRolesForSector(formData.sector);
  const recommendedIds = new Set(getRecommendedWorkTypeIds(formData.sector));
  const selectedCount = (formData.essential_capabilities?.length || 0) + (formData.desired_capabilities?.length || 0);

  const displayedWorkTypes = WORK_TYPES.filter((w) => {
    // 1. Filter by Tab
    if (capFilterTab === 'recommended') {
      if (!recommendedIds.has(w.id)) return false;
    } else if (capFilterTab === 'selected') {
      const isSelected = formData.essential_capabilities.includes(w.id) || formData.desired_capabilities.includes(w.id);
      if (!isSelected) return false;
    }

    // 2. Filter by search query
    if (capSearchQuery.trim()) {
      const q = capSearchQuery.toLowerCase().trim();
      const matchCivil = w.civil.toLowerCase().includes(q);
      const matchDesc = w.civilDesc?.toLowerCase().includes(q);
      const matchArmy = w.mil?.army?.covers?.toLowerCase().includes(q) || w.mil?.army?.label?.toLowerCase().includes(q);
      const matchNavy = w.mil?.navy?.covers?.toLowerCase().includes(q) || w.mil?.navy?.label?.toLowerCase().includes(q);
      const matchAf = w.mil?.airforce?.covers?.toLowerCase().includes(q) || w.mil?.airforce?.label?.toLowerCase().includes(q);
      return matchCivil || matchDesc || matchArmy || matchNavy || matchAf;
    }

    return true;
  });

  const validateStep = () => {
    switch (step) {
      case 0:
        return formData.roleTitles.length > 0 || !!formData.customRole.trim();
      case 1:
        return formData.essential_capabilities.length > 0;
      case 2:
        return true;
      case 3:
        return (
          formData.fair_no_fee &&
          formData.fair_disclose &&
          formData.fair_consent &&
          formData.fair_no_rank_bias
        );
      case 4:
        return true;
      default:
        return true;
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        navigate('/login');
        return;
      }

      let jdDocPath = null;
      if (formData.jdFile) {
        setUploading(true);
        const ext = formData.jdFile.name.split('.').pop();
        const path = `${session.user.id}/${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from('ps-job-documents')
          .upload(path, formData.jdFile, { cacheControl: '3600' });
        if (uploadError) throw uploadError;
        jdDocPath = path;
        setUploading(false);
      }

      const roleTitles = [...formData.roleTitles];
      if (formData.customRole.trim() && !roleTitles.includes(formData.customRole.trim())) {
        roleTitles.push(formData.customRole.trim());
      }

      const salaryRangeFormatted = formData.salaryMin && formData.salaryMax
        ? `₹${Number(formData.salaryMin).toLocaleString('en-IN')} to ₹${Number(formData.salaryMax).toLocaleString('en-IN')} / month`
        : formData.salaryRange || 'Disclosed during interview';

      const payload = {
        action: 'submit_requirement',
        sector: formData.sector,
        role_titles: roleTitles,
        tags: formData.essential_capabilities,
        quantity: parseInt(formData.quantity, 10) || 1,
        locations: formData.locations.filter(Boolean).length > 0 ? formData.locations : ['Across India'],
        salary_range: salaryRangeFormatted,
        description: formData.description || `Hiring for ${roleTitles.join(', ')} with verified technical and leadership capability.`,
        jd_document_path: jdDocPath,
        requirements_text: `Essential Capabilities: ${formData.essential_capabilities.join(', ')}. Licences: ${formData.required_licences.join(', ')}. Minimum Team Handled: ${formData.min_team_supervised}. Shift: ${formData.shift_pattern}`,
        // Tri-Service & Capability Fields
        job_family: formData.sector,
        essential_capabilities: formData.essential_capabilities,
        desired_capabilities: formData.desired_capabilities,
        min_team_supervised: Number(formData.min_team_supervised || 0),
        required_licences: formData.required_licences,
        experience_band: formData.experience_band,
        shift_pattern: formData.shift_pattern,
        bridge_training_available: formData.bridge_training_available,
        relocation_support: formData.relocation_support,
        service_preference: formData.service_preference,
      };

      const res = await fetch('/api/private-sector/router', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!data.ok) throw new Error(data.error || 'Failed to submit requirement');

      setSubmitted(true);
    } catch (err) {
      console.error('Submit requirement error:', err);
      alert('Error submitting requirement: ' + err.message);
    } finally {
      setSubmitting(false);
      setUploading(false);
    }
  };

  const goNext = () => {
    if (!validateStep()) return;
    if (step === TOTAL_STEPS - 1) {
      handleSubmit();
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

  if (submitted) {
    return (
      <div style={{ maxWidth: '680px', margin: '3rem auto', padding: '0 1rem' }}>
        <Card style={{ padding: '2.5rem', textAlign: 'center', borderRadius: '16px' }}>
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
              margin: '0 auto 1.25rem',
            }}
          >
            <CheckCircle2 size={36} />
          </div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.5rem' }}>
            Hiring Mission Submitted
          </h2>
          <p style={{ color: '#64748b', fontSize: '0.95rem', lineHeight: 1.5, marginBottom: '2rem' }}>
            Your requirement is now in review with our veteran matching team. Once approved, you can search anonymized
            talent, evaluate explainable fit scores, and send introduction requests.
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
            <Button variant="outline" onClick={() => navigate('/employer/dashboard')}>
              Employer Dashboard
            </Button>
            <Button variant="primary" onClick={() => navigate('/employer/candidates')}>
              Browse Matching Candidates $\rightarrow$
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', padding: '2rem 1rem 4rem' }}>
      <div style={{ maxWidth: '840px', margin: '0 auto' }}>
        {/* Step Rail */}
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

        {/* Form Card */}
        <Card style={{ padding: '2rem', background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 20px rgba(0,0,0,0.04)' }}>
          <div style={{ marginBottom: '1.5rem' }}>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.35rem' }}>
              {TITLES[step]}
            </h1>
            <p style={{ fontSize: '0.88rem', color: '#64748b', margin: 0 }}>
              {HELP[step]}
            </p>
          </div>

          {/* STEP 0: ROLE & SCOPE */}
          {step === 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '0.4rem' }}>
                  Industry / Sector
                </label>
                <select
                  value={formData.sector}
                  onChange={(e) => handleSectorChange(e.target.value)}
                  style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff' }}
                >
                  {SECTOR_OPTIONS.map((sec) => (
                    <option key={sec} value={sec}>{sec}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '0.4rem' }}>
                  Target Civilian Role(s)
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  {availableRoles.map((role) => {
                    const isSel = formData.roleTitles.includes(role);
                    return (
                      <button
                        key={role}
                        type="button"
                        onClick={() => toggleRole(role)}
                        style={{
                          padding: '0.5rem 0.9rem',
                          borderRadius: '20px',
                          fontSize: '0.82rem',
                          border: isSel ? '1.5px solid var(--ios-olive, #4b6b32)' : '1px solid #cbd5e1',
                          background: isSel ? 'var(--ios-olive, #4b6b32)' : '#f8fafc',
                          color: isSel ? '#fff' : '#334155',
                          fontWeight: isSel ? 700 : 500,
                          cursor: 'pointer',
                        }}
                      >
                        {isSel ? '✓ ' : ''}{role}
                      </button>
                    );
                  })}
                </div>

                <input
                  type="text"
                  placeholder="Need a specific custom role title? (e.g. Senior Regional Fleet Manager)"
                  value={formData.customRole}
                  onChange={(e) => setField('customRole', e.target.value)}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '0.4rem' }}>
                    Number of Open Positions
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.quantity}
                    onChange={(e) => setField('quantity', e.target.value)}
                    style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '0.4rem' }}>
                    Primary Work Location
                  </label>
                  <input
                    type="text"
                    value={formData.locations[0] || ''}
                    onChange={(e) => setField('locations', [e.target.value])}
                    placeholder="e.g. Pune, NCR, or Across India"
                    style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 1: CAPABILITIES (ESSENTIAL & DESIRED) */}
          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Sector Specific Smart Filter Header */}
              <div
                style={{
                  background: 'linear-gradient(135deg, rgba(75,107,50,0.08) 0%, #f8fafc 100%)',
                  border: '1px solid rgba(75,107,50,0.22)',
                  borderRadius: '10px',
                  padding: '0.9rem 1.1rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '0.75rem',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                    <Sparkles size={16} color="var(--ios-olive, #4b6b32)" />
                    <strong style={{ fontSize: '0.88rem', color: '#0f172a' }}>
                      Filtered for: {formData.sector}
                    </strong>
                    <span
                      style={{
                        fontSize: '0.7rem',
                        padding: '0.15rem 0.5rem',
                        borderRadius: '12px',
                        background: 'rgba(75,107,50,0.15)',
                        color: 'var(--ios-olive, #4b6b32)',
                        fontWeight: 700,
                      }}
                    >
                      Smart Relevance Active
                    </span>
                  </div>
                  <p style={{ margin: '0.25rem 0 0', fontSize: '0.78rem', color: '#475569' }}>
                    Irrelevant capabilities (such as weapons or heavy vehicle handling) are filtered out for this sector. Mark at least 1 Essential capability.
                  </p>
                </div>
              </div>

              {/* Filter Tabs & Search Bar */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '0.75rem',
                  background: '#f8fafc',
                  padding: '0.65rem 0.85rem',
                  borderRadius: '10px',
                  border: '1px solid #e2e8f0',
                }}
              >
                {/* Mode Pills */}
                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => setCapFilterTab('recommended')}
                    style={{
                      padding: '0.35rem 0.75rem',
                      borderRadius: '20px',
                      fontSize: '0.78rem',
                      fontWeight: capFilterTab === 'recommended' ? 700 : 500,
                      border: capFilterTab === 'recommended' ? '1.5px solid var(--ios-olive, #4b6b32)' : '1px solid #cbd5e1',
                      background: capFilterTab === 'recommended' ? 'var(--ios-olive, #4b6b32)' : '#fff',
                      color: capFilterTab === 'recommended' ? '#fff' : '#334155',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    🎯 Recommended for Sector ({recommendedIds.size})
                  </button>

                  <button
                    type="button"
                    onClick={() => setCapFilterTab('all')}
                    style={{
                      padding: '0.35rem 0.75rem',
                      borderRadius: '20px',
                      fontSize: '0.78rem',
                      fontWeight: capFilterTab === 'all' ? 700 : 500,
                      border: capFilterTab === 'all' ? '1.5px solid var(--ios-olive, #4b6b32)' : '1px solid #cbd5e1',
                      background: capFilterTab === 'all' ? 'var(--ios-olive, #4b6b32)' : '#fff',
                      color: capFilterTab === 'all' ? '#fff' : '#334155',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    🌐 All Military Capabilities ({WORK_TYPES.length})
                  </button>

                  <button
                    type="button"
                    onClick={() => setCapFilterTab('selected')}
                    style={{
                      padding: '0.35rem 0.75rem',
                      borderRadius: '20px',
                      fontSize: '0.78rem',
                      fontWeight: capFilterTab === 'selected' ? 700 : 500,
                      border: capFilterTab === 'selected' ? '1.5px solid var(--ios-olive, #4b6b32)' : '1px solid #cbd5e1',
                      background: capFilterTab === 'selected' ? 'var(--ios-olive, #4b6b32)' : '#fff',
                      color: capFilterTab === 'selected' ? '#fff' : '#334155',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    ✓ Selected ({selectedCount})
                  </button>
                </div>

                {/* Instant Search Box */}
                <div style={{ position: 'relative', width: '260px', maxWidth: '100%' }}>
                  <Search
                    size={14}
                    style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}
                  />
                  <input
                    type="text"
                    placeholder="Search capabilities or trades..."
                    value={capSearchQuery}
                    onChange={(e) => setCapSearchQuery(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.4rem 1.8rem 0.4rem 2rem',
                      borderRadius: '20px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.78rem',
                      background: '#fff',
                      outline: 'none',
                    }}
                  />
                  {capSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setCapSearchQuery('')}
                      style={{
                        position: 'absolute',
                        right: '8px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        color: '#94a3b8',
                        cursor: 'pointer',
                        padding: 0,
                        fontSize: '0.8rem',
                      }}
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem' }}>
                  <strong style={{ fontSize: '0.9rem', color: '#0f172a' }}>
                    {capFilterTab === 'recommended'
                      ? `Recommended Capabilities for ${formData.sector}`
                      : capFilterTab === 'selected'
                      ? `Your Selected Capabilities (${selectedCount})`
                      : 'All 21 Tri-Service Capability Areas'}
                  </strong>
                  <span style={{ fontSize: '0.76rem', color: '#64748b' }}>
                    Showing {displayedWorkTypes.length} result{displayedWorkTypes.length === 1 ? '' : 's'}
                  </span>
                </div>

                {/* Empty Search / Tab Result */}
                {displayedWorkTypes.length === 0 && (
                  <div
                    style={{
                      textAlign: 'center',
                      padding: '2rem 1rem',
                      background: '#f8fafc',
                      borderRadius: '10px',
                      border: '1px dashed #cbd5e1',
                    }}
                  >
                    <p style={{ margin: '0 0 0.5rem', color: '#475569', fontSize: '0.85rem' }}>
                      {capFilterTab === 'selected'
                        ? 'No capabilities marked yet. Click "Recommended" or "All Military Capabilities" to select required skills.'
                        : `No capabilities matching "${capSearchQuery}".`}
                    </p>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>
                      {capSearchQuery && (
                        <button
                          type="button"
                          onClick={() => setCapSearchQuery('')}
                          style={{
                            padding: '0.35rem 0.75rem',
                            borderRadius: '6px',
                            background: '#e2e8f0',
                            border: 'none',
                            fontSize: '0.78rem',
                            cursor: 'pointer',
                            fontWeight: 600,
                          }}
                        >
                          Clear Search
                        </button>
                      )}
                      {capFilterTab !== 'all' && (
                        <button
                          type="button"
                          onClick={() => {
                            setCapFilterTab('all');
                            setCapSearchQuery('');
                          }}
                          style={{
                            padding: '0.35rem 0.75rem',
                            borderRadius: '6px',
                            background: 'var(--ios-olive, #4b6b32)',
                            color: '#fff',
                            border: 'none',
                            fontSize: '0.78rem',
                            cursor: 'pointer',
                            fontWeight: 600,
                          }}
                        >
                          View All Military Capabilities
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Capability Cards List */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                  {displayedWorkTypes.map((w) => {
                    const isEssential = formData.essential_capabilities.includes(w.id);
                    const isDesired = formData.desired_capabilities.includes(w.id);
                    const isExpanded = !!expandedMil[w.id];
                    const isRecommended = recommendedIds.has(w.id);

                    return (
                      <div
                        key={w.id}
                        style={{
                          border: isEssential
                            ? '2px solid var(--ios-olive, #4b6b32)'
                            : isDesired
                            ? '1.5px solid #9C7A2E'
                            : '1px solid #cbd5e1',
                          borderRadius: '10px',
                          padding: '0.85rem 1rem',
                          background: isEssential
                            ? 'rgba(75,107,50,0.05)'
                            : isDesired
                            ? 'rgba(156,122,46,0.05)'
                            : '#fff',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem' }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
                              <strong style={{ fontSize: '0.92rem', color: '#0f172a' }}>{w.civil}</strong>
                              {isRecommended && capFilterTab === 'all' && (
                                <span
                                  style={{
                                    fontSize: '0.68rem',
                                    padding: '0.1rem 0.45rem',
                                    borderRadius: '10px',
                                    background: 'rgba(75,107,50,0.12)',
                                    color: 'var(--ios-olive, #4b6b32)',
                                    fontWeight: 700,
                                  }}
                                >
                                  Recommended for {formData.sector}
                                </span>
                              )}
                              {isEssential && (
                                <span
                                  style={{
                                    fontSize: '0.68rem',
                                    padding: '0.1rem 0.45rem',
                                    borderRadius: '10px',
                                    background: 'var(--ios-olive, #4b6b32)',
                                    color: '#fff',
                                    fontWeight: 700,
                                  }}
                                >
                                  Essential ✓
                                </span>
                              )}
                              {isDesired && (
                                <span
                                  style={{
                                    fontSize: '0.68rem',
                                    padding: '0.1rem 0.45rem',
                                    borderRadius: '10px',
                                    background: '#F2E9D3',
                                    color: '#5c4b20',
                                    fontWeight: 700,
                                  }}
                                >
                                  Desired ✓
                                </span>
                              )}
                            </div>
                            <p style={{ fontSize: '0.78rem', color: '#64748b', margin: '0.25rem 0 0' }}>{w.civilDesc}</p>
                          </div>

                          <div style={{ display: 'flex', gap: '0.35rem', flexShrink: 0 }}>
                            <button
                              type="button"
                              onClick={() => toggleEssentialCap(w.id)}
                              style={{
                                padding: '0.35rem 0.65rem',
                                borderRadius: '6px',
                                fontSize: '0.75rem',
                                border: isEssential ? '1px solid var(--ios-olive, #4b6b32)' : '1px solid #cbd5e1',
                                background: isEssential ? 'var(--ios-olive, #4b6b32)' : '#f8fafc',
                                color: isEssential ? '#fff' : '#334155',
                                fontWeight: isEssential ? 700 : 500,
                                cursor: 'pointer',
                              }}
                            >
                              {isEssential ? 'Essential ✓' : 'Mark Essential'}
                            </button>

                            <button
                              type="button"
                              onClick={() => toggleDesiredCap(w.id)}
                              style={{
                                padding: '0.35rem 0.65rem',
                                borderRadius: '6px',
                                fontSize: '0.75rem',
                                border: isDesired ? '1px solid #9C7A2E' : '1px solid #cbd5e1',
                                background: isDesired ? '#F2E9D3' : '#f8fafc',
                                color: isDesired ? '#5c4b20' : '#334155',
                                fontWeight: isDesired ? 700 : 500,
                                cursor: 'pointer',
                              }}
                            >
                              {isDesired ? 'Desired ✓' : 'Mark Desired'}
                            </button>
                          </div>
                        </div>

                        {/* Military background cross-reference toggle */}
                        <div style={{ marginTop: '0.5rem', borderTop: '1px solid #f1f5f9', paddingTop: '0.4rem' }}>
                          <button
                            type="button"
                            onClick={() => toggleMilDetail(w.id)}
                            style={{ background: 'none', border: 'none', color: '#2563eb', fontSize: '0.74rem', cursor: 'pointer', padding: 0 }}
                          >
                            {isExpanded ? 'Hide verified military background ▲' : 'View verified military background ▼'}
                          </button>

                          {isExpanded && (
                            <div style={{ marginTop: '0.4rem', padding: '0.5rem 0.75rem', background: '#f8fafc', borderRadius: '6px', fontSize: '0.74rem', color: '#475569' }}>
                              {w.mil.army && <div><strong>Army:</strong> {w.mil.army.label} ({w.mil.army.covers})</div>}
                              {w.mil.navy && <div><strong>Navy:</strong> {w.mil.navy.label} ({w.mil.navy.covers})</div>}
                              {w.mil.airforce && <div><strong>Air Force:</strong> {w.mil.airforce.label} ({w.mil.airforce.covers})</div>}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Switch to All Capabilities Helper Footer */}
                {capFilterTab === 'recommended' && !capSearchQuery && (
                  <div
                    style={{
                      textAlign: 'center',
                      padding: '0.9rem',
                      background: '#f8fafc',
                      borderRadius: '8px',
                      border: '1px dashed #cbd5e1',
                      marginTop: '0.75rem',
                    }}
                  >
                    <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                      Looking for cross-functional or technical capabilities outside {formData.sector}?
                    </span>
                    <div>
                      <button
                        type="button"
                        onClick={() => setCapFilterTab('all')}
                        style={{
                          marginTop: '0.3rem',
                          background: 'none',
                          border: 'none',
                          color: 'var(--ios-olive, #4b6b32)',
                          fontSize: '0.8rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          textDecoration: 'underline',
                        }}
                      >
                        View all {WORK_TYPES.length} military capabilities & specialised trades →
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 2: EXPERIENCE, SCALE & LICENCES */}
          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '0.4rem' }}>
                    Minimum Team Supervised
                  </label>
                  <select
                    value={formData.min_team_supervised}
                    onChange={(e) => setField('min_team_supervised', Number(e.target.value))}
                    style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff' }}
                  >
                    <option value={0}>No team supervision required (Individual contributor)</option>
                    <option value={4}>Small team (2 to 5 personnel)</option>
                    <option value={6}>Section / Shift lead (6 to 15 personnel)</option>
                    <option value={16}>Large detachment (16 to 30 personnel)</option>
                    <option value={31}>High-scale leadership (30+ personnel)</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '0.4rem' }}>
                    Experience Band
                  </label>
                  <select
                    value={formData.experience_band}
                    onChange={(e) => setField('experience_band', e.target.value)}
                    style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff' }}
                  >
                    <option value="0-4">0 to 4 years (Agniveer)</option>
                    <option value="3-8">3 to 8 years (Experienced soldier / Junior NCO)</option>
                    <option value="9+">9+ years (Senior NCO / JCO / Specialist)</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '0.4rem' }}>
                  Mandatory Civil Licence or Qualification
                </label>
                <select
                  value={formData.required_licences[0] || 'No mandatory licence'}
                  onChange={(e) => setField('required_licences', [e.target.value])}
                  style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff' }}
                >
                  <option value="No mandatory licence">No mandatory civil licence</option>
                  <option value="Civil HMV (Heavy Motor Vehicle)">Civil HMV (Heavy Motor Vehicle)</option>
                  <option value="Civil LMV (Light Motor Vehicle)">Civil LMV (Light Motor Vehicle)</option>
                  <option value="Commercial Transport Authorisation">Commercial Transport Authorisation</option>
                  <option value="National Trade Certificate (ITI)">National Trade Certificate (ITI)</option>
                  <option value="First Aid / Basic Life Support (BLS)">First Aid / Basic Life Support (BLS)</option>
                  <option value="DGCA Drone Pilot Certificate">DGCA Drone Pilot Certificate</option>
                  <option value="Industrial Safety & EHS Certificate">Industrial Safety & EHS Certificate</option>
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '0.4rem' }}>
                    Shift Pattern
                  </label>
                  <select
                    value={formData.shift_pattern}
                    onChange={(e) => setField('shift_pattern', e.target.value)}
                    style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff' }}
                  >
                    <option>Day shift only</option>
                    <option>Rotational shifts</option>
                    <option>Night shift acceptable</option>
                    <option>Flexible hours</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '0.4rem' }}>
                    Service Preference
                  </label>
                  <select
                    value={formData.service_preference}
                    onChange={(e) => setField('service_preference', e.target.value)}
                    style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff' }}
                  >
                    <option value="All">All three Services (Match capability)</option>
                    <option value="Indian Army">Indian Army</option>
                    <option value="Indian Navy">Indian Navy</option>
                    <option value="Indian Air Force">Indian Air Force</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', marginTop: '0.5rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', fontSize: '0.85rem', color: '#334155', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={formData.bridge_training_available}
                    onChange={(e) => setField('bridge_training_available', e.target.checked)}
                    style={{ width: '17px', height: '17px', accentColor: 'var(--ios-olive, #4b6b32)' }}
                  />
                  <span>Employer-funded technical bridge training available</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', fontSize: '0.85rem', color: '#334155', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={formData.relocation_support}
                    onChange={(e) => setField('relocation_support', e.target.checked)}
                    style={{ width: '17px', height: '17px', accentColor: 'var(--ios-olive, #4b6b32)' }}
                  />
                  <span>Relocation or initial accommodation assistance provided</span>
                </label>
              </div>
            </div>
          )}

          {/* STEP 3: TERMS & FAIR HIRING CHARTER */}
          {step === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '0.4rem' }}>
                    Min Monthly Fixed Salary (₹)
                  </label>
                  <input
                    type="number"
                    value={formData.salaryMin}
                    onChange={(e) => setField('salaryMin', e.target.value)}
                    placeholder="35000"
                    style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '0.4rem' }}>
                    Max Monthly Fixed Salary (₹)
                  </label>
                  <input
                    type="number"
                    value={formData.salaryMax}
                    onChange={(e) => setField('salaryMax', e.target.value)}
                    placeholder="45000"
                    style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '0.4rem' }}>
                  Attach Detailed Job Description Document (Optional)
                </label>
                <input
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) setFormData((prev) => ({ ...prev, jdFile: file, jdFileName: file.name }));
                  }}
                  style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', border: '1px dashed #cbd5e1' }}
                />
              </div>

              {/* Fair Hiring Code of Ethics */}
              <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '1.25rem', border: '1px solid #cbd5e1' }}>
                <strong style={{ fontSize: '0.92rem', color: '#0f172a', display: 'block', marginBottom: '0.75rem' }}>
                  VeerNXT Fair Hiring Code of Ethics (Mandatory)
                </strong>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', fontSize: '0.85rem', color: '#334155', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={formData.fair_no_fee}
                      onChange={(e) => setField('fair_no_fee', e.target.checked)}
                      style={{ width: '17px', height: '17px', accentColor: 'var(--ios-olive, #4b6b32)' }}
                    />
                    <span>No fee will be charged to candidates at any stage of hiring</span>
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', fontSize: '0.85rem', color: '#334155', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={formData.fair_disclose}
                      onChange={(e) => setField('fair_disclose', e.target.checked)}
                      style={{ width: '17px', height: '17px', accentColor: 'var(--ios-olive, #4b6b32)' }}
                    />
                    <span>Compensation and shift conditions will be clearly disclosed in the introduction</span>
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', fontSize: '0.85rem', color: '#334155', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={formData.fair_consent}
                      onChange={(e) => setField('fair_consent', e.target.checked)}
                      style={{ width: '17px', height: '17px', accentColor: 'var(--ios-olive, #4b6b32)' }}
                    />
                    <span>Candidate contact details will only be unmasked upon candidate consent</span>
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', fontSize: '0.85rem', color: '#334155', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={formData.fair_no_rank_bias}
                      onChange={(e) => setField('fair_no_rank_bias', e.target.checked)}
                      style={{ width: '17px', height: '17px', accentColor: 'var(--ios-olive, #4b6b32)' }}
                    />
                    <span>Candidates are evaluated on capability evidence, not military rank alone</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: REVIEW & CONFIRM */}
          {step === 4 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ border: '1px solid #cbd5e1', borderRadius: '12px', padding: '1.25rem', background: '#fff' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                  <div>
                    <span style={{ fontSize: '0.78rem', color: '#64748b', display: 'block' }}>Target Role</span>
                    <strong style={{ fontSize: '1rem', color: '#0f172a' }}>{formData.roleTitles.join(', ')}</strong>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.78rem', color: '#64748b', display: 'block' }}>Open Positions</span>
                    <strong style={{ fontSize: '1rem', color: '#0f172a' }}>{formData.quantity} Openings</strong>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.78rem', color: '#64748b', display: 'block' }}>Location</span>
                    <strong style={{ fontSize: '1rem', color: '#0f172a' }}>{formData.locations.join(', ')}</strong>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.78rem', color: '#64748b', display: 'block' }}>Fixed Compensation</span>
                    <strong style={{ fontSize: '1rem', color: '#0f172a' }}>
                      ₹{Number(formData.salaryMin || 0).toLocaleString('en-IN')} to ₹{Number(formData.salaryMax || 0).toLocaleString('en-IN')} / mo
                    </strong>
                  </div>
                </div>

                <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '0.85rem' }}>
                  <span style={{ fontSize: '0.78rem', color: '#64748b', display: 'block', marginBottom: '0.35rem' }}>
                    Essential Capabilities Matched
                  </span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                    {formData.essential_capabilities.map((id) => {
                      const w = WORK_TYPES.find((x) => x.id === id);
                      return (
                        <span key={id} style={{ fontSize: '0.75rem', padding: '0.2rem 0.55rem', background: 'rgba(75,107,50,0.1)', color: 'var(--ios-olive, #4b6b32)', borderRadius: '12px', fontWeight: 600 }}>
                          {w ? w.civil : id}
                        </span>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Nav Buttons */}
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
              disabled={step === 0 || submitting}
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

            <Button
              variant="primary"
              onClick={goNext}
              disabled={!validateStep() || submitting}
            >
              {submitting ? 'Submitting Requirement...' : step === TOTAL_STEPS - 1 ? 'Submit Hiring Mission' : 'Continue $\rightarrow$'}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default PostJobRequirement;
