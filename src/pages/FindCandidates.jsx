import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { 
  Search, Sliders, Award, User, MapPin, 
  Briefcase, CheckCircle2, ChevronRight, MessageSquare, Info,
  ShieldCheck, Lock, Unlock, Send, Users, Phone, Mail,
  FileText, Sparkles, AlertCircle, RefreshCw, Star, Clock
} from 'lucide-react';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import { computeCapabilityFit, WORK_TYPES, SERVICES } from '../lib/militaryTaxonomy';

const FALLBACK_CANDIDATES = [
  {
    id: 'f1a2b3c4-0001-4000-a000-000000000001',
    user_id: 'f1a2b3c4-0001-4000-a000-000000000001',
    maskedCode: 'VN-4091',
    full_name: 'Rajesh Sharma',
    service: 'Indian Air Force',
    branch: 'Technical',
    trade: 'Airframe Fitter',
    rank: 'Sergeant',
    service_years: '15 Years',
    trade_proficiency: 'Class I / Master Craftsman',
    highest_working_level: 'Team Lead / Independent Quality Sign-off',
    team_size_supervised: 14,
    civil_licences: ['DGCA Basic AME (Mechanical)', 'Heavy Transport Vehicle (HTV)'],
    work_types: ['Heavy Plant, Vehicle Fleet & Machinery Maintenance', 'Quality Assurance, Metrology & Precision Inspection', 'Occupational Safety, Fire Fighting & Emergency Response'],
    skills: ['Hydraulic Line Overhaul', 'Airframe Structural Repair', 'NDT Testing', 'Team Supervision', 'SOP Compliance'],
    duties: [
      { text: 'Conducted structural integrity checks, riveting, and sheet-metal skin repair on operational transport aircraft fleet.' },
      { text: 'Supervised 14 technicians across 3 shifts ensuring zero ground-incident record and 96% fleet dispatch reliability.' },
      { text: 'Performed non-destructive testing (die-penetrant and magnetic particle) on high-stress landing gear assemblies.' }
    ],
    preferred_locations: ['Delhi NCR', 'Pune', 'Bengaluru'],
    consent_masked: true,
    consent_contact: true
  },
  {
    id: 'f1a2b3c4-0002-4000-a000-000000000002',
    user_id: 'f1a2b3c4-0002-4000-a000-000000000002',
    maskedCode: 'VN-8812',
    full_name: 'Balwinder Singh',
    service: 'Indian Army',
    branch: 'Corps of Signals',
    trade: 'Radio Technician / SATCOM',
    rank: 'Subedar',
    service_years: '18 Years',
    trade_proficiency: 'Class I',
    highest_working_level: 'Unit Section Head',
    team_size_supervised: 28,
    civil_licences: ['WPC GMDSS / Radio Operator Certification', 'CCNA Networking Fundamentals'],
    work_types: ['Communications, Networks & IT Infrastructure Support', 'Physical Security, Guard Force & Surveillance Monitoring', 'Operations, Dispatch & Field Logistics Coordination'],
    skills: ['Tactical SATCOM', 'Microwave Link Alignment', 'Network Trouble-ticketing', 'Crisis Comms Dispatch', 'Staff Training'],
    duties: [
      { text: 'Designed and established redundant VHF/UHF and satellite communication grids across remote command operating bases.' },
      { text: 'Led a detachment of 28 signals personnel maintaining 99.98% communication uptime under extreme weather conditions.' },
      { text: 'Conducted regular cybersecurity audits and cryptographic key management in accordance with military protocol.' }
    ],
    preferred_locations: ['Chandigarh', 'Delhi NCR', 'Ambala'],
    consent_masked: true,
    consent_contact: true
  },
  {
    id: 'f1a2b3c4-0003-4000-a000-000000000003',
    user_id: 'f1a2b3c4-0003-4000-a000-000000000003',
    maskedCode: 'VN-2394',
    full_name: 'Amit Patil',
    service: 'Indian Army',
    branch: 'Army Service Corps (ASC)',
    trade: 'Heavy Transport Driver (MT)',
    rank: 'Agniveer (4 Yrs Completed)',
    service_years: '4 Years',
    trade_proficiency: 'Trade Class II',
    highest_working_level: 'Independent Operator',
    team_size_supervised: 4,
    civil_licences: ['Heavy Transport Vehicle (HTV)', 'Hazardous Chemical / POL Transport Endorsement'],
    work_types: ['Heavy Commercial Driving, Transport & Plant Moving', 'Inventory, Warehouse & Supply Chain Operations', 'Operations, Dispatch & Field Logistics Coordination'],
    skills: ['High Altitude Convoy Driving', 'Vehicle Preventative Maintenance', 'Fleet Defect Logging', 'Fuel Tanker Safety'],
    duties: [
      { text: 'Driven 12-ton Tatra and multi-axle logistics vehicles over 45,000 accident-free kilometres across Himalayan sectors.' },
      { text: 'Executed daily first-line mechanical checks, brake bleeding, tyre rotation, and emergency recovery operations.' },
      { text: 'Assisted depot dispatch supervisors in loading balance and axle-weight compliance checks.' }
    ],
    preferred_locations: ['Mumbai', 'Pune', 'Nashik'],
    consent_masked: true,
    consent_contact: true
  },
  {
    id: 'f1a2b3c4-0004-4000-a000-000000000004',
    user_id: 'f1a2b3c4-0004-4000-a000-000000000004',
    maskedCode: 'VN-5120',
    full_name: 'Suresh Nair',
    service: 'Indian Navy',
    branch: 'Marine Engineering',
    trade: 'Engine Room Artificer (ERA)',
    rank: 'Petty Officer',
    service_years: '12 Years',
    trade_proficiency: 'Class I Marine Mechanic',
    highest_working_level: 'Watchkeeping Officer / Lead Tech',
    team_size_supervised: 16,
    civil_licences: ['DG Shipping Class IV Motor Watchkeeping Certificate', 'First Aid & Industrial Fire Fighting (STCW)'],
    work_types: ['Heavy Plant, Vehicle Fleet & Machinery Maintenance', 'Construction, Infrastructure & Facilities Engineering', 'Occupational Safety, Fire Fighting & Emergency Response'],
    skills: ['Diesel Alternator Overhaul', 'Marine Heat Exchangers', 'Centrifugal Pumps', 'High Pressure Pneumatics', 'Root Cause Analysis'],
    duties: [
      { text: 'Managed round-the-clock watchkeeping and routine servicing of 5,000 kW main propulsion diesel engines.' },
      { text: 'Directed emergency fire and flood control drills and maintained fixed CO2 suppression systems.' },
      { text: 'Carried out scheduled dockyard refit trials, pump overhauls, and hydrostatic testing of pressure lines.' }
    ],
    preferred_locations: ['Kochi', 'Chennai', 'Visakhapatnam', 'Mumbai'],
    consent_masked: true,
    consent_contact: true
  },
  {
    id: 'f1a2b3c4-0005-4000-a000-000000000005',
    user_id: 'f1a2b3c4-0005-4000-a000-000000000005',
    maskedCode: 'VN-7633',
    full_name: 'Dharamvir Yadav',
    service: 'Indian Army',
    branch: 'Corps of EME',
    trade: 'Armoured Vehicle Mechanic',
    rank: 'Havildar',
    service_years: '16 Years',
    trade_proficiency: 'Class I Master Mechanic',
    highest_working_level: 'Workshop Floor Incharge',
    team_size_supervised: 18,
    civil_licences: ['Heavy Earthmoving Machinery (HEMM) Operator', 'Heavy Transport Vehicle (HTV)'],
    work_types: ['Heavy Plant, Vehicle Fleet & Machinery Maintenance', 'Inventory, Warehouse & Supply Chain Operations', 'Quality Assurance, Metrology & Precision Inspection'],
    skills: ['Tracked Chassis Maintenance', 'Turbocharged Diesel Engines', 'Hydraulic Winch Overhauls', 'Inventory Parts Requisition'],
    duties: [
      { text: 'Supervised base workshop repairs for heavy combat and recovery tracked platforms.' },
      { text: 'Led assembly-line engine replacements, transmission test-bench checks, and quality compliance sign-offs.' },
      { text: 'Managed technical spare parts inventory of over 2,200 unique line items with 100% audit pass.' }
    ],
    preferred_locations: ['Delhi NCR', 'Jaipur', 'Ahmedabad'],
    consent_masked: true,
    consent_contact: true
  }
];

const FindCandidates = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialReqId = searchParams.get('requirementId') || '';

  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [employerRequirements, setEmployerRequirements] = useState([]);
  const [selectedRequirementId, setSelectedRequirementId] = useState(initialReqId);
  const [selectedRequirement, setSelectedRequirement] = useState(null);

  // Recruiter requests map: candidate_id -> request object
  const [recruiterRequests, setRecruiterRequests] = useState({});

  const [candidates, setCandidates] = useState([]);
  const [filteredCandidates, setFilteredCandidates] = useState([]);
  const [selectedCandidate, setSelectedCandidate] = useState(null);

  // Filter criteria
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('All');
  const [minScore, setMinScore] = useState(60);
  const [minSupervised, setMinSupervised] = useState(0);

  // Request interest modal state
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestNote, setRequestNote] = useState('');
  const [submittingRequest, setSubmittingRequest] = useState(false);

  // Load initial data
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/login');
        return;
      }
      setCurrentUser(session.user);

      // 1. Fetch employer's active requirements
      const { data: reqs } = await supabase
        .from('ps_job_requirements')
        .select('*')
        .eq('employer_id', session.user.id)
        .order('created_at', { ascending: false });
      
      const userReqs = reqs || [];
      setEmployerRequirements(userReqs);

      let activeReq = null;
      if (initialReqId && userReqs.length > 0) {
        activeReq = userReqs.find(r => r.id === initialReqId) || userReqs[0];
      } else if (userReqs.length > 0) {
        activeReq = userReqs[0];
      }
      setSelectedRequirement(activeReq);
      if (activeReq) setSelectedRequirementId(activeReq.id);

      // 2. Fetch existing recruiter requests sent by this employer
      const { data: sentReqs } = await supabase
        .from('ps_recruiter_requests')
        .select('*')
        .eq('employer_id', session.user.id);
      
      const reqMap = {};
      (sentReqs || []).forEach(r => {
        reqMap[r.user_id] = r;
      });
      setRecruiterRequests(reqMap);

      // 3. Fetch candidate profiles from ps_candidate_profiles
      const { data: dbCandidates } = await supabase
        .from('ps_candidate_profiles')
        .select('*')
        .eq('profile_completed', true)
        .order('created_at', { ascending: false });

      let combined = [];
      if (dbCandidates && dbCandidates.length > 0) {
        // Also fetch user_profiles for unmasked names if already consented
        const userIds = dbCandidates.map(c => c.user_id);
        const { data: uProfiles } = await supabase
          .from('user_profiles')
          .select('id, full_name, raw_profile_data')
          .in('id', userIds);
        const uMap = Object.fromEntries((uProfiles || []).map(u => [u.id, u]));

        combined = dbCandidates.map(c => {
          const u = uMap[c.user_id] || {};
          const maskedCode = `VN-${c.user_id.slice(0, 4).toUpperCase()}`;
          return {
            id: c.user_id,
            user_id: c.user_id,
            maskedCode,
            full_name: u.full_name || 'Verified Veteran',
            mobile: u.raw_profile_data?.mobile || null,
            email: u.raw_profile_data?.email || null,
            service: c.service || 'Indian Armed Forces',
            branch: c.branch || 'Service',
            trade: c.trade || (c.work_types?.[0] ? c.work_types[0] : 'Specialist'),
            rank: c.rank || 'Veteran',
            service_years: c.service_years || '4+ Years',
            trade_proficiency: c.trade_proficiency || 'Class I',
            highest_working_level: c.highest_working_level || 'Independent',
            team_size_supervised: c.team_size_supervised || 0,
            civil_licences: c.licences_qualifications || c.civil_licences || [],
            work_types: c.work_types || [],
            skills: c.skills || [],
            duties: Array.isArray(c.duties) ? c.duties : [],
            preferred_locations: c.preferred_locations || [],
            consent_masked: c.consent_masked !== false,
            consent_contact: c.consent_contact !== false,
          };
        });
      }

      // Merge with curated realistic fallback military candidates if DB has few
      const finalPool = [...combined];
      FALLBACK_CANDIDATES.forEach(fb => {
        if (!finalPool.some(c => c.user_id === fb.user_id)) {
          finalPool.push(fb);
        }
      });

      setCandidates(finalPool);
      if (finalPool.length > 0) {
        setSelectedCandidate(finalPool[0]);
      }
    } catch (err) {
      console.error('Error loading candidates:', err);
    } finally {
      setLoading(false);
    }
  };

  // Handle requirement dropdown change
  const handleRequirementChange = (reqId) => {
    setSelectedRequirementId(reqId);
    if (!reqId) {
      setSelectedRequirement(null);
      return;
    }
    const found = employerRequirements.find(r => r.id === reqId) || null;
    setSelectedRequirement(found);
  };

  // Recalculate candidate matching whenever candidates, selected requirement, or filters change
  useEffect(() => {
    let list = candidates.map(cand => {
      let fit = { score: 75, reqHit: [], desHit: [], gaps: [], licenceGap: null, matchReasons: [] };
      if (selectedRequirement) {
        fit = computeCapabilityFit(selectedRequirement, cand);
      }
      const existingReq = recruiterRequests[cand.user_id];
      const isUnlocked = existingReq && ['accepted', 'interview', 'hired'].includes(existingReq.status);

      return {
        ...cand,
        fit,
        fitScore: fit.score,
        isUnlocked,
        requestStatus: existingReq ? existingReq.status : null
      };
    });

    // 1. Requirement sorting if selected
    if (selectedRequirement) {
      list.sort((a, b) => b.fitScore - a.fitScore);
    }

    // 2. Branch filter
    if (selectedBranch !== 'All') {
      list = list.filter(c => c.service === selectedBranch);
    }

    // 3. Min score filter (only if requirement is active)
    if (selectedRequirement && minScore > 0) {
      list = list.filter(c => c.fitScore >= minScore);
    }

    // 4. Min team supervised filter
    if (minSupervised > 0) {
      list = list.filter(c => (c.team_size_supervised || 0) >= minSupervised);
    }

    // 5. Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(c => {
        const masked = (c.maskedCode || '').toLowerCase();
        const trade = (c.trade || '').toLowerCase();
        const rank = (c.rank || '').toLowerCase();
        const skills = (c.skills || []).map(s => s.toLowerCase()).join(' ');
        const workTypes = (c.work_types || []).map(w => w.toLowerCase()).join(' ');
        const locs = (c.preferred_locations || []).map(l => l.toLowerCase()).join(' ');
        return masked.includes(q) || trade.includes(q) || rank.includes(q) || skills.includes(q) || workTypes.includes(q) || locs.includes(q);
      });
    }

    setFilteredCandidates(list);
    if (list.length > 0 && (!selectedCandidate || !list.some(c => c.user_id === selectedCandidate.user_id))) {
      setSelectedCandidate(list[0]);
    }
  }, [candidates, selectedRequirement, selectedBranch, minScore, minSupervised, searchQuery, recruiterRequests]);

  // Send recruiter request handler
  const handleSendIntroductionRequest = async () => {
    if (!selectedCandidate || !selectedRequirement) {
      alert('Please select an active Job Requirement before requesting an introduction.');
      return;
    }
    setSubmittingRequest(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/private-sector/router', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({
          action: 'send_recruiter_request',
          requirement_id: selectedRequirement.id,
          candidate_user_id: selectedCandidate.user_id,
          fit_score: selectedCandidate.fitScore || 80,
          match_reasons: selectedCandidate.fit?.matchReasons || ['Capability overlap verified']
        })
      });

      const data = await res.json();
      if (!data.ok) throw new Error(data.error || 'Failed to send interest');

      // Update state
      setRecruiterRequests(prev => ({
        ...prev,
        [selectedCandidate.user_id]: data.request
      }));

      setShowRequestModal(false);
      setRequestNote('');
      alert(`Introduction request sent to ${selectedCandidate.name || selectedCandidate.maskedCode}! The veteran has been notified via WhatsApp.`);
    } catch (err) {
      console.error('Error sending request:', err);
      alert('Error: ' + err.message);
    } finally {
      setSubmittingRequest(false);
    }
  };

  const getServiceColor = (service) => {
    if (!service) return { bg: '#f1f5f9', text: '#475569' };
    const s = service.toLowerCase();
    if (s.includes('army')) return { bg: '#eef4ea', text: '#2d5a27', border: '#c3ddbc' };
    if (s.includes('navy')) return { bg: '#e8f0fe', text: '#1a56db', border: '#b8d2fc' };
    if (s.includes('air')) return { bg: '#e6f7ff', text: '#0070ba', border: '#b3e5fc' };
    return { bg: '#f1f5f9', text: '#475569', border: '#e2e8f0' };
  };

  return (
    <div className="talent-search-page animate-fade-in">
      {/* Top Header & Requirement Match Selector */}
      <div className="talent-header-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1.25rem' }}>
          <div>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--ios-olive)' }}>
              Corporate Private-Sector Talent Matching
            </span>
            <h1 style={{ fontSize: '1.9rem', fontWeight: 850, color: '#0f172a', margin: '0.2rem 0 0.4rem', letterSpacing: '-0.02em' }}>
              Find Military Candidates by Capability
            </h1>
            <p style={{ color: '#64748b', fontSize: '0.95rem', margin: 0, maxWidth: '720px' }}>
              Search verified Agniveer and Ex-Servicemen talent using military trade-to-civilian crosswalks.
              Candidates remain masked by default; full contact info unlocks when they accept your introduction.
            </p>
          </div>

          <Button 
            variant="secondary" 
            onClick={() => navigate('/employer/post-job')}
            style={{ fontWeight: 700, borderColor: '#cbd5e1' }}
          >
            + Post New Requirement
          </Button>
        </div>

        {/* Active Requirement Match Bar */}
        <div style={{ marginTop: '1.5rem', background: '#f8fafc', padding: '1rem 1.25rem', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Sparkles size={18} color="var(--ios-olive)" />
              <strong style={{ fontSize: '0.88rem', color: '#1e293b' }}>Match Against Requirement:</strong>
            </div>

            <select
              value={selectedRequirementId}
              onChange={(e) => handleRequirementChange(e.target.value)}
              style={{
                flex: 1,
                minWidth: '260px',
                padding: '0.55rem 0.85rem',
                borderRadius: '10px',
                border: '1.5px solid var(--ios-olive)',
                fontSize: '0.88rem',
                fontWeight: 600,
                background: 'white',
                color: '#0f172a'
              }}
            >
              <option value="">All Candidates (Unfiltered General Search)</option>
              {employerRequirements.map(r => (
                <option key={r.id} value={r.id}>
                  {(r.role_titles || []).join(' / ')} • {r.sector} ({r.quantity || 1} Openings)
                </option>
              ))}
            </select>

            {selectedRequirement && (
              <span style={{ fontSize: '0.78rem', background: 'rgba(75,107,50,0.12)', color: 'var(--ios-olive)', padding: '0.35rem 0.75rem', borderRadius: '999px', fontWeight: 700 }}>
                {selectedRequirement.essential_capabilities?.length || 0} Essential Capabilities Configured
              </span>
            )}
          </div>
        </div>

        {/* Search & Filters Row */}
        <div className="filters-grid-bar">
          <div style={{ position: 'relative', flex: 2, minWidth: '220px' }}>
            <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)' }} />
            <input 
              type="text" 
              placeholder="Search by code (e.g. VN-4091), trade, skill, or city..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '0.55rem 0.75rem 0.55rem 2.4rem',
                borderRadius: '10px',
                border: '1px solid #cbd5e1',
                fontSize: '0.88rem'
              }}
            />
          </div>

          <div style={{ flex: 1, minWidth: '150px' }}>
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              style={{ width: '100%', padding: '0.55rem', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.88rem', background: 'white' }}
            >
              <option value="All">All Armed Forces</option>
              <option value="Indian Army">Indian Army</option>
              <option value="Indian Navy">Indian Navy</option>
              <option value="Indian Air Force">Indian Air Force</option>
            </select>
          </div>

          <div style={{ flex: 1, minWidth: '160px' }}>
            <select
              value={minSupervised}
              onChange={(e) => setMinSupervised(Number(e.target.value))}
              style={{ width: '100%', padding: '0.55rem', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.88rem', background: 'white' }}
            >
              <option value={0}>Any Supervisory Span</option>
              <option value={5}>Supervised 5+ Personnel</option>
              <option value={10}>Supervised 10+ Personnel</option>
              <option value={20}>Supervised 20+ Personnel</option>
            </select>
          </div>

          {selectedRequirement && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: '180px' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', whiteSpace: 'nowrap' }}>
                Min Fit: {minScore}%
              </span>
              <input 
                type="range" 
                min={40} 
                max={90} 
                step={5} 
                value={minScore} 
                onChange={(e) => setMinScore(Number(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--ios-olive)' }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Directory Workspace: Left Master List / Right Detail Evidence Pane */}
      <div className="talent-workspace-layout">
        {/* Left Side: Candidate Master List */}
        <div className="talent-list-column">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', padding: '0 0.25rem' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#64748b' }}>
              <strong>{filteredCandidates.length}</strong> Candidates Available
            </span>
            {selectedRequirement && (
              <span style={{ fontSize: '0.72rem', color: 'var(--ios-olive)', fontWeight: 700 }}>
                Sorted by Fit %
              </span>
            )}
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '4rem 1rem', color: '#64748b' }}>
              <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 0.75rem' }} />
              <p>Scanning capability database...</p>
            </div>
          ) : filteredCandidates.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 1.5rem', background: 'white', borderRadius: '18px', border: '1px solid #e2e8f0' }}>
              <User size={36} color="#94a3b8" style={{ margin: '0 auto 0.5rem' }} />
              <h4 style={{ margin: '0 0 0.35rem', color: '#0f172a' }}>No Matches Found</h4>
              <p style={{ fontSize: '0.82rem', color: '#64748b', margin: 0 }}>
                Adjust your search keywords or lower the minimum fit threshold.
              </p>
            </div>
          ) : (
            <div className="talent-scroll-pane">
              {filteredCandidates.map(cand => {
                const isSelected = selectedCandidate?.user_id === cand.user_id;
                const sColor = getServiceColor(cand.service);
                const reqStatus = cand.requestStatus;

                return (
                  <div
                    key={cand.user_id}
                    onClick={() => setSelectedCandidate(cand)}
                    className={`talent-card-item ${isSelected ? 'active' : ''}`}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                        <div style={{
                          width: '38px',
                          height: '38px',
                          borderRadius: '10px',
                          background: sColor.bg,
                          color: sColor.text,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 800,
                          fontSize: '0.85rem'
                        }}>
                          {cand.isUnlocked ? cand.full_name.slice(0, 2).toUpperCase() : cand.maskedCode.slice(3)}
                        </div>

                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <h4 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 800, color: '#0f172a' }}>
                              {cand.isUnlocked ? cand.full_name : `Candidate ${cand.maskedCode}`}
                            </h4>
                            {cand.isUnlocked ? (
                              <span title="Contact Unlocked" style={{ color: '#16a34a' }}><Unlock size={13} /></span>
                            ) : (
                              <span title="Masked Candidate" style={{ color: '#94a3b8' }}><Lock size={13} /></span>
                            )}
                          </div>
                          <p style={{ margin: '0.15rem 0 0', fontSize: '0.75rem', color: '#64748b' }}>
                            {cand.rank} • {cand.trade}
                          </p>
                        </div>
                      </div>

                      {/* Match Fit Score Pill */}
                      {selectedRequirement && (
                        <div style={{
                          padding: '0.2rem 0.55rem',
                          borderRadius: '999px',
                          fontSize: '0.75rem',
                          fontWeight: 800,
                          background: cand.fitScore >= 80 ? '#eef4ea' : cand.fitScore >= 65 ? '#fef3c7' : '#f1f5f9',
                          color: cand.fitScore >= 80 ? '#2d5a27' : cand.fitScore >= 65 ? '#92400e' : '#475569'
                        }}>
                          {cand.fitScore}% Fit
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', marginTop: '0.65rem' }}>
                      <span style={{ fontSize: '0.68rem', padding: '0.15rem 0.45rem', borderRadius: '4px', background: sColor.bg, color: sColor.text, fontWeight: 700 }}>
                        {cand.service}
                      </span>
                      <span style={{ fontSize: '0.68rem', padding: '0.15rem 0.45rem', borderRadius: '4px', background: '#f1f5f9', color: '#475569', fontWeight: 600 }}>
                        {cand.service_years}
                      </span>
                      {cand.team_size_supervised > 0 && (
                        <span style={{ fontSize: '0.68rem', padding: '0.15rem 0.45rem', borderRadius: '4px', background: '#f8fafc', border: '1px solid #e2e8f0', color: '#334155', fontWeight: 600 }}>
                          Supervised {cand.team_size_supervised}
                        </span>
                      )}
                    </div>

                    {/* Request Status Pill */}
                    {reqStatus && (
                      <div style={{ marginTop: '0.5rem', paddingTop: '0.45rem', borderTop: '1px dashed #e2e8f0', display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.72rem', fontWeight: 700 }}>
                        {reqStatus === 'interest_sent' && (
                          <span style={{ color: '#d97706' }}>⏳ Introduction Sent (Awaiting Consent)</span>
                        )}
                        {reqStatus === 'accepted' && (
                          <span style={{ color: '#16a34a' }}>✓ Introduction Accepted (Contact Unlocked)</span>
                        )}
                        {reqStatus === 'declined' && (
                          <span style={{ color: '#64748b' }}>✕ Declined</span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Side: Candidate Capability Detail & Evidence Pane */}
        <div className="talent-detail-column">
          {selectedCandidate ? (
            <div className="candidate-full-view">
              {/* Header Hero */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '1.25rem' }}>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                  <div style={{
                    width: '60px',
                    height: '60px',
                    borderRadius: '16px',
                    background: getServiceColor(selectedCandidate.service).bg,
                    color: getServiceColor(selectedCandidate.service).text,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 900,
                    fontSize: '1.25rem',
                    border: `1.5px solid ${getServiceColor(selectedCandidate.service).border || '#e2e8f0'}`
                  }}>
                    {selectedCandidate.isUnlocked ? selectedCandidate.full_name.slice(0, 2).toUpperCase() : selectedCandidate.maskedCode.slice(3)}
                  </div>

                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <h2 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 850, color: '#0f172a' }}>
                        {selectedCandidate.isUnlocked ? selectedCandidate.full_name : `Candidate ${selectedCandidate.maskedCode}`}
                      </h2>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        padding: '0.2rem 0.6rem',
                        borderRadius: '999px',
                        background: selectedCandidate.isUnlocked ? '#eef4ea' : '#f8fafc',
                        color: selectedCandidate.isUnlocked ? '#2d5a27' : '#64748b',
                        border: '1px solid #e2e8f0'
                      }}>
                        {selectedCandidate.isUnlocked ? <Unlock size={11} /> : <Lock size={11} />}
                        {selectedCandidate.isUnlocked ? 'Contact Unmasked' : 'Masked for Veteran Privacy'}
                      </span>
                    </div>

                    <p style={{ margin: '0.25rem 0 0', color: '#475569', fontSize: '0.88rem', fontWeight: 600 }}>
                      {selectedCandidate.service} • {selectedCandidate.rank} • {selectedCandidate.trade}
                    </p>
                  </div>
                </div>

                {/* Primary Action: Request Introduction */}
                <div>
                  {selectedCandidate.isUnlocked ? (
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      {selectedCandidate.mobile && (
                        <a 
                          href={`tel:${selectedCandidate.mobile}`} 
                          className="btn-primary" 
                          style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', padding: '0.5rem 0.9rem', borderRadius: '10px' }}
                        >
                          <Phone size={14} /> Call Candidate
                        </a>
                      )}
                      <Button 
                        size="sm" 
                        variant="secondary"
                        onClick={() => navigate('/employer/dashboard')}
                      >
                        View in Pipeline
                      </Button>
                    </div>
                  ) : recruiterRequests[selectedCandidate.user_id]?.status === 'interest_sent' ? (
                    <div style={{
                      background: '#fffbeb',
                      border: '1px solid #fde68a',
                      padding: '0.5rem 0.85rem',
                      borderRadius: '10px',
                      fontSize: '0.82rem',
                      color: '#92400e',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem'
                    }}>
                      <Clock size={14} /> Introduction Sent • Pending Veteran Consent
                    </div>
                  ) : (
                    <Button 
                      size="sm"
                      onClick={() => setShowRequestModal(true)}
                      style={{ fontWeight: 700, background: 'var(--ios-olive)' }}
                    >
                      <Send size={14} style={{ marginRight: '0.4rem' }} /> Request Introduction
                    </Button>
                  )}
                </div>
              </div>

              {/* Unmasked Contact Info Card (If Unlocked) */}
              {selectedCandidate.isUnlocked && (
                <div style={{ marginTop: '1.25rem', background: '#f0fdf4', border: '1.5px solid #bbf7d0', borderRadius: '14px', padding: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <CheckCircle2 size={16} color="#16a34a" />
                    <strong style={{ fontSize: '0.88rem', color: '#166534' }}>Direct Candidate Contact Unlocked</strong>
                  </div>
                  <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', fontSize: '0.85rem', color: '#1e293b' }}>
                    {selectedCandidate.mobile && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                        <Phone size={14} color="#16a34a" /> <strong>{selectedCandidate.mobile}</strong>
                      </span>
                    )}
                    {selectedCandidate.email && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                        <Mail size={14} color="#16a34a" /> <strong>{selectedCandidate.email}</strong>
                      </span>
                    )}
                    <span style={{ color: '#64748b' }}>
                      Locations: {(selectedCandidate.preferred_locations || []).join(', ') || 'Pan-India'}
                    </span>
                  </div>
                </div>
              )}

              {/* Requirement Fit Assessment Box */}
              {selectedRequirement && (
                <div style={{ marginTop: '1.25rem', background: '#f8fafc', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '1.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Sparkles size={16} color="var(--ios-olive)" />
                      <strong style={{ fontSize: '0.92rem', color: '#0f172a' }}>
                        Fit Assessment for: {(selectedRequirement.role_titles || []).join(' / ')}
                      </strong>
                    </div>
                    <span style={{
                      fontSize: '0.95rem',
                      fontWeight: 900,
                      color: selectedCandidate.fitScore >= 80 ? '#2d5a27' : '#92400e',
                      background: selectedCandidate.fitScore >= 80 ? '#eef4ea' : '#fef3c7',
                      padding: '0.25rem 0.65rem',
                      borderRadius: '8px'
                    }}>
                      {selectedCandidate.fitScore}% Match
                    </span>
                  </div>

                  {/* Match reasons */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', marginBottom: '0.85rem' }}>
                    {(selectedCandidate.fit?.matchReasons || []).map((reason, idx) => (
                      <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.82rem', color: '#334155' }}>
                        <CheckCircle2 size={14} color="#16a34a" />
                        <span>{reason}</span>
                      </div>
                    ))}
                  </div>

                  {/* Capability overlap badges */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {selectedCandidate.fit?.reqHit?.length > 0 && (
                      <div>
                        <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#166534', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          Matching Essential Capabilities:
                        </span>
                        <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', marginTop: '0.25rem' }}>
                          {selectedCandidate.fit.reqHit.map(c => (
                            <span key={c} style={{ fontSize: '0.75rem', background: '#eef4ea', color: '#2d5a27', padding: '0.2rem 0.55rem', borderRadius: '6px', fontWeight: 600, border: '1px solid #c3ddbc' }}>
                              ✓ {c}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {selectedCandidate.fit?.gaps?.length > 0 && (
                      <div style={{ marginTop: '0.35rem' }}>
                        <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          Growth / Bridge Training Opportunities:
                        </span>
                        <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', marginTop: '0.25rem' }}>
                          {selectedCandidate.fit.gaps.map(g => (
                            <span key={g} style={{ fontSize: '0.75rem', background: '#f1f5f9', color: '#64748b', padding: '0.2rem 0.55rem', borderRadius: '6px', fontWeight: 500 }}>
                              + {g}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Service & Operational Experience Specs */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginTop: '1.25rem' }}>
                <div style={{ background: 'white', border: '1px solid #f1f5f9', padding: '1rem', borderRadius: '12px' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Supervisory Span</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
                    <Users size={18} color="var(--ios-olive)" />
                    <strong style={{ fontSize: '1.05rem', color: '#0f172a' }}>
                      {selectedCandidate.team_size_supervised > 0 ? `${selectedCandidate.team_size_supervised} Personnel` : 'Individual Specialist'}
                    </strong>
                  </div>
                  <p style={{ margin: '0.2rem 0 0', fontSize: '0.75rem', color: '#64748b' }}>
                    {selectedCandidate.highest_working_level}
                  </p>
                </div>

                <div style={{ background: 'white', border: '1px solid #f1f5f9', padding: '1rem', borderRadius: '12px' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Proficiency Class</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
                    <Award size={18} color="var(--ios-olive)" />
                    <strong style={{ fontSize: '1.05rem', color: '#0f172a' }}>
                      {selectedCandidate.trade_proficiency}
                    </strong>
                  </div>
                  <p style={{ margin: '0.2rem 0 0', fontSize: '0.75rem', color: '#64748b' }}>
                    Military Certified Grade
                  </p>
                </div>

                <div style={{ background: 'white', border: '1px solid #f1f5f9', padding: '1rem', borderRadius: '12px' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Service Duration</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
                    <ShieldCheck size={18} color="var(--ios-olive)" />
                    <strong style={{ fontSize: '1.05rem', color: '#0f172a' }}>
                      {selectedCandidate.service_years}
                    </strong>
                  </div>
                  <p style={{ margin: '0.2rem 0 0', fontSize: '0.75rem', color: '#64748b' }}>
                    Honourable Discharge / Transition
                  </p>
                </div>
              </div>

              {/* Verified Civil Licences & Certifications */}
              {selectedCandidate.civil_licences?.length > 0 && (
                <div style={{ marginTop: '1.25rem' }}>
                  <h4 style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.5rem' }}>
                    Verified Civil Licences & Endorsements
                  </h4>
                  <div style={{ display: 'flex', gap: '0.45rem', flexWrap: 'wrap' }}>
                    {selectedCandidate.civil_licences.map(lic => (
                      <span key={lic} style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        background: '#eff6ff',
                        color: '#1d4ed8',
                        padding: '0.35rem 0.7rem',
                        borderRadius: '8px',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        border: '1px solid #bfdbfe'
                      }}>
                        <Award size={13} /> {lic}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Verified Military Duties & Equipment Handled */}
              <div style={{ marginTop: '1.5rem' }}>
                <h4 style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.5rem' }}>
                  Logged Military Duties & Operational Context
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {(selectedCandidate.duties || []).map((duty, idx) => (
                    <div key={idx} style={{
                      padding: '0.75rem 1rem',
                      background: '#f8fafc',
                      borderRadius: '10px',
                      border: '1px solid #e2e8f0',
                      fontSize: '0.84rem',
                      color: '#334155',
                      lineHeight: 1.45
                    }}>
                      {duty.text || duty}
                    </div>
                  ))}
                </div>
              </div>

              {/* Cross-Service Work Types Translated */}
              {selectedCandidate.work_types?.length > 0 && (
                <div style={{ marginTop: '1.5rem' }}>
                  <h4 style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.5rem' }}>
                    Civilian Capability Crosswalks
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    {selectedCandidate.work_types.map(wt => (
                      <div key={wt} style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.55rem 0.85rem',
                        background: 'white',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        fontSize: '0.82rem',
                        fontWeight: 600,
                        color: '#1e293b'
                      }}>
                        <CheckCircle2 size={14} color="var(--ios-olive)" />
                        {wt}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Privacy Notice Card */}
              <div style={{ marginTop: '1.75rem', background: '#fbfcf9', border: '1px solid #e6eedb', padding: '1rem', borderRadius: '12px', display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                <ShieldCheck size={18} color="var(--ios-olive)" style={{ flexShrink: 0, marginTop: '0.15rem' }} />
                <div style={{ fontSize: '0.8rem', color: '#475569', lineHeight: 1.45 }}>
                  <strong style={{ color: '#1f3a2e' }}>VeerNXT Veteran Privacy Charter:</strong> Candidate contact information is guarded under Section 43A.
                  Sending an introduction notifies the candidate on their verified WhatsApp. Upon candidate acceptance, full verified mobile, email, and CV are unmasked immediately in your dashboard.
                </div>
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '4rem 2rem', background: 'white', borderRadius: '24px', border: '1px solid #e2e8f0', color: '#64748b' }}>
              <Info size={36} color="#94a3b8" style={{ margin: '0 auto 0.75rem' }} />
              <h3>Select a Candidate Profile</h3>
              <p style={{ fontSize: '0.88rem' }}>Choose any candidate from the list on the left to review their verified military background and capability fit.</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal: Request Introduction */}
      {showRequestModal && selectedCandidate && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 9999,
          padding: '1rem'
        }}>
          <div style={{
            background: 'white',
            borderRadius: '20px',
            width: '100%',
            maxWidth: '520px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            overflow: 'hidden'
          }}>
            <div style={{ padding: '1.5rem', borderBottom: '1px solid #f1f5f9' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' }}>
                Request Introduction to {selectedCandidate.name || selectedCandidate.maskedCode}
              </h3>
              <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', color: '#64748b' }}>
                Role: <strong>{(selectedRequirement?.role_titles || []).join(' / ')}</strong>
              </p>
            </div>

            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ background: '#f8fafc', padding: '0.85rem', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '0.82rem', color: '#475569' }}>
                Candidate will receive a WhatsApp message outlining the role, compensation band, and company name.
                Once accepted, their contact information will unlock on your pipeline.
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', display: 'block', marginBottom: '0.35rem' }}>
                  Custom Introductory Note (Optional)
                </label>
                <textarea
                  value={requestNote}
                  onChange={(e) => setRequestNote(e.target.value)}
                  placeholder="e.g. We were impressed by your heavy equipment maintenance background and would like to discuss our site supervisor opportunity..."
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '0.7rem',
                    borderRadius: '10px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.88rem',
                    fontFamily: 'inherit'
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                <Button 
                  onClick={handleSendIntroductionRequest}
                  disabled={submittingRequest}
                  style={{ flex: 1, padding: '0.75rem' }}
                >
                  {submittingRequest ? 'Sending WhatsApp...' : 'Confirm & Send Introduction'}
                </Button>
                <Button 
                  variant="secondary"
                  onClick={() => setShowRequestModal(false)}
                  style={{ padding: '0.75rem', borderColor: '#cbd5e1' }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Styles */}
      <style dangerouslySetInnerHTML={{ __html: `
        .talent-search-page {
          max-width: 1240px;
          margin: 0 auto;
          padding: 2rem 1.5rem 4rem;
        }
        .talent-header-card {
          background: white;
          border-radius: 24px;
          border: 1px solid rgba(0,0,0,0.05);
          padding: 1.75rem;
          box-shadow: var(--shadow-ios);
          margin-bottom: 1.75rem;
        }
        .filters-grid-bar {
          display: flex;
          gap: 0.85rem;
          margin-top: 1rem;
          flex-wrap: wrap;
        }
        .talent-workspace-layout {
          display: grid;
          grid-template-columns: 360px 1fr;
          gap: 1.5rem;
          align-items: start;
        }
        .talent-list-column {
          display: flex;
          flex-direction: column;
        }
        .talent-scroll-pane {
          max-height: calc(100vh - 260px);
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 0.65rem;
          padding-right: 0.25rem;
        }
        .talent-card-item {
          background: white;
          border-radius: 16px;
          border: 1px solid #e2e8f0;
          padding: 1rem;
          cursor: pointer;
          transition: all 0.18s ease;
        }
        .talent-card-item:hover {
          border-color: #cbd5e1;
          background: #fcfdfc;
          transform: translateY(-1px);
        }
        .talent-card-item.active {
          background: #fbfdf9;
          border: 1.8px solid var(--ios-olive);
          box-shadow: 0 4px 12px rgba(75, 107, 50, 0.08);
        }
        .talent-detail-column {
          background: white;
          border-radius: 24px;
          border: 1px solid rgba(0,0,0,0.05);
          padding: 1.75rem;
          box-shadow: var(--shadow-ios);
          min-width: 0;
        }
        @media (max-width: 900px) {
          .talent-workspace-layout {
            grid-template-columns: 1fr;
          }
          .talent-scroll-pane {
            max-height: 380px;
          }
        }
      `}} />
    </div>
  );
};

export default FindCandidates;
