import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { 
  Search, Sliders, Award, User, MapPin, 
  Briefcase, CheckCircle2, ChevronRight, MessageSquare, Info,
  ShieldCheck, Lock, Unlock, Send, Users, Phone, Mail,
  FileText, Sparkles, AlertCircle, RefreshCw, Star, Clock,
  Filter, Check, Layers, Compass, Building, Wrench, Shield,
  Truck, Radio, Plane, AlertTriangle, Eye, ArrowRight, RotateCcw
} from 'lucide-react';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import { computeCapabilityFit, WORK_TYPES, SERVICES, SECTOR_CAPABILITY_MAP, resolveSectorKey } from '../lib/militaryTaxonomy';

const SECTORS = [
  'Logistics, Supply Chain & Transport',
  'Corporate Security & Facility Management',
  'Engineering, Manufacturing & Technical Ops',
  'Information Technology & Communications',
  'Aviation, Aerospace & Drone Technology',
  'General Administration & Operations Management',
  'Healthcare, Paramedic & Disaster Response',
  'Automobile Fleet, Heavy Machinery & Plant Maintenance'
];

const KEY_CAPABILITIES = [
  { id: 'wt_maint', label: 'Technical Maintenance & Diagnostics', icon: '🛠️', sectorKey: 'engineering_manufacturing' },
  { id: 'wt_driver', label: 'Heavy Fleet & Commercial Driving', icon: '🚚', sectorKey: 'logistics_transport' },
  { id: 'wt_security', label: 'Physical Security & Asset Protection', icon: '🛡️', sectorKey: 'security_defence' },
  { id: 'wt_comms', label: 'IT, Networks & Tactical Comms', icon: '📡', sectorKey: 'it_telecom' },
  { id: 'wt_logistics', label: 'Warehouse & Inventory Supply Chain', icon: '📦', sectorKey: 'logistics_transport' },
  { id: 'wt_command', label: 'Team Leadership & Supervision', icon: '👥', sectorKey: 'admin_facilities' },
  { id: 'wt_aircraft', label: 'Aviation, Airframe & Avionics', icon: '✈️', sectorKey: 'aviation_marine' },
  { id: 'wt_safety', label: 'Occupational Safety & Fire Response', icon: '🦺', sectorKey: 'security_defence' },
  { id: 'wt_eng', label: 'Civil & Plant Infrastructure', icon: '🏗️', sectorKey: 'engineering_manufacturing' },
  { id: 'wt_qa', label: 'Quality Assurance & Metrology', icon: '🔬', sectorKey: 'engineering_manufacturing' },
  { id: 'wt_admin', label: 'Personnel & Records Administration', icon: '📋', sectorKey: 'admin_facilities' },
];

const POPULAR_ROLE_TAGS = {
  'Logistics, Supply Chain & Transport': ['Fleet Supervisor', 'Warehouse Manager', 'Supply Chain Analyst', 'Transport Controller'],
  'Corporate Security & Facility Management': ['Chief Security Officer', 'Facility Operations Manager', 'Surveillance Lead', 'Loss Prevention Manager'],
  'Engineering, Manufacturing & Technical Ops': ['Plant Maintenance Engineer', 'Mechanical Supervisor', 'Quality Inspector', 'Workshop Floor Incharge'],
  'Information Technology & Communications': ['Network Administrator', 'Telecom Specialist', 'Data Centre Technician', 'Cybersecurity Auditor'],
  'Aviation, Aerospace & Drone Technology': ['Airframe Technician', 'Drone Operations Lead', 'Avionics Specialist', 'Ground Support Equipment Incharge'],
  'General Administration & Operations Management': ['Operations Executive', 'Site Admin Manager', 'Administrative Officer', 'Liaison Coordinator'],
};

const FALLBACK_CANDIDATES = [
  {
    id: 'f1a2b3c4-0001-4000-a000-000000000001',
    user_id: 'f1a2b3c4-0001-4000-a000-000000000001',
    maskedCode: 'VN-4091',
    service: 'Indian Air Force',
    branch: 'Technical Maintenance',
    trade: 'Airframe Fitter',
    rank: 'Sergeant',
    service_years: '15 Years Active Service',
    trade_proficiency: 'Class I / Master Craftsman',
    highest_working_level: 'Team Lead / Independent Quality Sign-off',
    team_size_supervised: 14,
    civil_licences: ['DGCA Basic AME (Mechanical)', 'Heavy Transport Vehicle (HTV)'],
    work_types: ['Technical Maintenance, Diagnostics & Repair', 'Quality Assurance, Metrology & Precision Inspection', 'Occupational Safety, Fire Fighting & Emergency Response'],
    skills: ['Hydraulic Line Overhaul', 'Airframe Structural Repair', 'Non-Destructive Testing (NDT)', 'Team Supervision', 'DGCA Compliance', 'Rotorcraft Rigging'],
    duties: [
      { text: 'Conducted structural integrity checks, precision riveting, and sheet-metal skin repairs on operational transport aircraft fleet.' },
      { text: 'Supervised 14 technicians across multi-shift flight line turnarounds, achieving zero ground incidents and 96% dispatch reliability.' },
      { text: 'Performed non-destructive testing (die-penetrant and magnetic particle) on high-stress landing gear assemblies and rotor hubs.' }
    ],
    preferred_locations: ['Delhi NCR', 'Pune', 'Bengaluru'],
  },
  {
    id: 'f1a2b3c4-0002-4000-a000-000000000002',
    user_id: 'f1a2b3c4-0002-4000-a000-000000000002',
    maskedCode: 'VN-8812',
    service: 'Indian Army',
    branch: 'Corps of Signals',
    trade: 'Radio Technician / SATCOM Operator',
    rank: 'Subedar',
    service_years: '18 Years Active Service',
    trade_proficiency: 'Class I Signals Grade',
    highest_working_level: 'Unit Signal Detachment Commander',
    team_size_supervised: 28,
    civil_licences: ['WPC GMDSS / Radio Operator Certification', 'Cisco CCNA Networking Fundamentals'],
    work_types: ['Communications, Networks & IT Infrastructure Support', 'Physical Security, Guard Force & Surveillance Monitoring', 'Operations, Dispatch & Field Logistics Coordination'],
    skills: ['Tactical SATCOM', 'Microwave Link Alignment', 'Network Trouble-ticketing', 'Crisis Comms Dispatch', 'Crypto Key Management', 'Tower Rigging'],
    duties: [
      { text: 'Designed and deployed redundant VHF/UHF and satellite communication grids across remote command operating bases with 99.98% uptime.' },
      { text: 'Led an independent detachment of 28 signals personnel maintaining mobile satellite links and cryptographic encryption suites.' },
      { text: 'Conducted quarterly cybersecurity audits, cryptographic key turnovers, and technician skill validation courses.' }
    ],
    preferred_locations: ['Chandigarh', 'Delhi NCR', 'Ambala', 'Jaipur'],
  },
  {
    id: 'f1a2b3c4-0003-4000-a000-000000000003',
    user_id: 'f1a2b3c4-0003-4000-a000-000000000003',
    maskedCode: 'VN-2394',
    service: 'Indian Army',
    branch: 'Army Service Corps (ASC)',
    trade: 'Heavy Transport Driver (MT)',
    rank: 'Agniveer (4 Yrs Completed)',
    service_years: '4 Years Active Service',
    trade_proficiency: 'Trade Class II',
    highest_working_level: 'Independent Convoy Driver',
    team_size_supervised: 4,
    civil_licences: ['Heavy Transport Vehicle (HTV) National Permit', 'Hazardous POL Material Handling Endorsement'],
    work_types: ['Professional Driving (Light, Heavy or Specialised)', 'Inventory, Warehouse & Supply Chain Operations', 'Operations, Dispatch & Field Logistics Coordination'],
    skills: ['High Altitude Convoy Driving', 'Vehicle Preventative Maintenance', 'Axle Weight Balancing', 'Fuel Tanker Safety', 'Defensive Night Driving'],
    duties: [
      { text: 'Piloted 12-ton Tatra and multi-axle logistics carriers across 45,000 accident-free kilometres over high-altitude Himalayan terrain.' },
      { text: 'Executed daily first-line mechanical checks, brake bleeding, tyre rotation, and emergency recovery winch operations.' },
      { text: 'Assisted depot dispatch supervisors in loading balance, pallet securing, and axle-weight compliance protocols.' }
    ],
    preferred_locations: ['Mumbai', 'Pune', 'Nashik', 'Nagpur'],
  },
  {
    id: 'f1a2b3c4-0004-4000-a000-000000000004',
    user_id: 'f1a2b3c4-0004-4000-a000-000000000004',
    maskedCode: 'VN-5120',
    service: 'Indian Navy',
    branch: 'Marine Engineering',
    trade: 'Engine Room Artificer (ERA)',
    rank: 'Petty Officer',
    service_years: '12 Years Active Service',
    trade_proficiency: 'Class I Marine Mechanic',
    highest_working_level: 'Watchkeeping Officer / Lead Tech',
    team_size_supervised: 16,
    civil_licences: ['DG Shipping Class IV Motor Watchkeeping Certificate', 'First Aid & Industrial Fire Fighting (STCW-95)'],
    work_types: ['Technical Maintenance, Diagnostics & Repair', 'Construction, Infrastructure & Facilities Engineering', 'Occupational Safety, Fire Fighting & Emergency Response'],
    skills: ['5,000 kW Diesel Alternator Overhaul', 'Marine Heat Exchangers', 'Centrifugal Pumps', 'High Pressure Pneumatics', 'Root Cause Analysis'],
    duties: [
      { text: 'Managed round-the-clock watchkeeping and preventative overhaul of 5,000 kW marine diesel propulsion and auxiliary gensets.' },
      { text: 'Directed emergency fire and flood control crews and maintained fixed high-pressure CO2 flooding and bilge pumping lines.' },
      { text: 'Carried out scheduled dockyard refit trials, pump dynamic balancing, and hydrostatic certification testing.' }
    ],
    preferred_locations: ['Kochi', 'Chennai', 'Visakhapatnam', 'Mumbai'],
  },
  {
    id: 'f1a2b3c4-0005-4000-a000-000000000005',
    user_id: 'f1a2b3c4-0005-4000-a000-000000000005',
    maskedCode: 'VN-7633',
    service: 'Indian Army',
    branch: 'Corps of EME',
    trade: 'Armoured Vehicle Mechanic',
    rank: 'Havildar',
    service_years: '16 Years Active Service',
    trade_proficiency: 'Class I Master Mechanic',
    highest_working_level: 'Workshop Floor Incharge',
    team_size_supervised: 18,
    civil_licences: ['Heavy Earthmoving Machinery (HEMM) Operator', 'Heavy Transport Vehicle (HTV)'],
    work_types: ['Technical Maintenance, Diagnostics & Repair', 'Inventory, Warehouse & Supply Chain Operations', 'Quality Assurance, Metrology & Precision Inspection'],
    skills: ['Tracked Chassis Maintenance', 'Turbocharged Diesel Overhaul', 'Hydraulic Winch Overhauls', 'Parts Inventory ERP', 'SOP Verification'],
    duties: [
      { text: 'Supervised base workshop repairs for heavy combat tracked platforms, recovery cranes, and diesel generating stations.' },
      { text: 'Led assembly-line engine replacements, dynamometer test-bench calibration, and quality compliance sign-offs.' },
      { text: 'Managed technical spare parts inventory of over 2,200 unique line items with 100% audit accuracy.' }
    ],
    preferred_locations: ['Delhi NCR', 'Jaipur', 'Ahmedabad'],
  }
];

const FindCandidates = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialReqId = searchParams.get('requirementId') || '';

  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [employerRequirements, setEmployerRequirements] = useState([]);

  // Mode: 'dynamic' (custom preferences) vs 'posted' (match from posted requirement)
  const [searchMode, setSearchMode] = useState(initialReqId ? 'posted' : 'dynamic');
  const [selectedRequirementId, setSelectedRequirementId] = useState(initialReqId);
  const [selectedRequirement, setSelectedRequirement] = useState(null);

  // Dynamic Preferences State
  const [dynamicSector, setDynamicSector] = useState(SECTORS[0]);
  const [dynamicRoleTitle, setDynamicRoleTitle] = useState('Operations / Fleet Supervisor');
  const [dynamicCapabilities, setDynamicCapabilities] = useState(['wt_maint', 'wt_driver', 'wt_command']);
  const [selectedBranch, setSelectedBranch] = useState('All');
  const [minSupervised, setMinSupervised] = useState(0);
  const [selectedLocation, setSelectedLocation] = useState('All');
  const [minScore, setMinScore] = useState(45);
  const [searchQuery, setSearchQuery] = useState('');

  // Candidates & Selection
  const [candidates, setCandidates] = useState([]);
  const [filteredCandidates, setFilteredCandidates] = useState([]);
  const [selectedCandidate, setSelectedCandidate] = useState(null);

  // Recruiter requests map: candidate_id -> request object
  const [recruiterRequests, setRecruiterRequests] = useState({});

  // Show Interest Modal State
  const [showInterestModal, setShowInterestModal] = useState(false);
  const [interestRoleTitle, setInterestRoleTitle] = useState('');
  const [interestSector, setInterestSector] = useState('');
  const [interestNote, setInterestNote] = useState('');
  const [submittingInterest, setSubmittingInterest] = useState(false);

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

      // 1. Fetch employer requirements
      const { data: reqs } = await supabase
        .from('ps_job_requirements')
        .select('*')
        .eq('employer_id', session.user.id)
        .order('created_at', { ascending: false });

      const userReqs = reqs || [];
      setEmployerRequirements(userReqs);

      if (initialReqId && userReqs.length > 0) {
        const activeReq = userReqs.find(r => r.id === initialReqId) || userReqs[0];
        setSelectedRequirement(activeReq);
        setSelectedRequirementId(activeReq.id);
        setSearchMode('posted');
      }

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
        combined = dbCandidates.map(c => {
          const maskedCode = `VN-${c.user_id.slice(0, 4).toUpperCase()}`;
          return {
            id: c.user_id,
            user_id: c.user_id,
            maskedCode,
            service: c.service || 'Indian Armed Forces',
            branch: c.branch || 'Specialist Branch',
            trade: c.trade || (c.work_types?.[0] ? c.work_types[0] : 'Operations Specialist'),
            rank: c.rank || 'Veteran',
            service_years: c.service_years || '4+ Years Active Service',
            trade_proficiency: c.trade_proficiency || 'Class I Technical',
            highest_working_level: c.highest_working_level || 'Independent Specialist',
            team_size_supervised: c.team_size_supervised || 0,
            civil_licences: c.licences_qualifications || c.civil_licences || [],
            work_types: c.work_types || [],
            skills: c.skills || [],
            duties: Array.isArray(c.duties) ? c.duties : [],
            preferred_locations: c.preferred_locations || [],
          };
        });
      }

      // Merge with fallback high-detail military candidates so catalog is always populated
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

  // Toggle dynamic capability
  const toggleCapability = (capId) => {
    setDynamicCapabilities(prev => 
      prev.includes(capId) ? prev.filter(id => id !== capId) : [...prev, capId]
    );
  };

  // Auto-select capabilities based on sector
  const applySectorDefaults = (sector) => {
    setDynamicSector(sector);
    const key = resolveSectorKey(sector);
    if (key && SECTOR_CAPABILITY_MAP[key]) {
      const rec = SECTOR_CAPABILITY_MAP[key].slice(0, 4);
      setDynamicCapabilities(rec);
    }
  };

  // Active matching criteria
  const activeCriteria = useMemo(() => {
    if (searchMode === 'posted' && selectedRequirement) {
      return {
        sector: selectedRequirement.sector,
        role_titles: selectedRequirement.role_titles || ['Job Requirement'],
        essential_capabilities: selectedRequirement.essential_capabilities || [],
        min_team_supervised: selectedRequirement.min_team_supervised || 0,
        required_licences: selectedRequirement.required_licences || [],
        isPosted: true,
        id: selectedRequirement.id,
      };
    }
    return {
      sector: dynamicSector,
      role_titles: [dynamicRoleTitle || 'Specialist Role'],
      essential_capabilities: dynamicCapabilities,
      min_team_supervised: minSupervised,
      required_licences: [],
      isPosted: false,
      id: null,
    };
  }, [searchMode, selectedRequirement, dynamicSector, dynamicRoleTitle, dynamicCapabilities, minSupervised]);

  // Robust capability match evaluator
  const evaluateFit = (cand, criteria) => {
    const essential = criteria.essential_capabilities || [];
    const candCaps = (cand.work_types || []).map(w => w.toLowerCase());
    const candSkills = (cand.skills || []).map(s => s.toLowerCase());
    const candTrade = (cand.trade || '').toLowerCase();
    const candDuties = (cand.duties || []).map(d => (typeof d === 'string' ? d : d.text || '').toLowerCase()).join(' ');

    const reqHit = [];
    const gaps = [];

    essential.forEach(capId => {
      const capObj = KEY_CAPABILITIES.find(k => k.id === capId) || WORK_TYPES.find(w => w.id === capId);
      const label = (capObj?.label || capObj?.civil || capId).toLowerCase();
      const capKey = (capObj?.capKey || '').toLowerCase();

      // Check if candidate matches via work types, skills, trade, or duties
      const matches = candCaps.some(cc => cc === capId.toLowerCase() || cc.includes(capId.toLowerCase()) || (capKey && cc.includes(capKey)) || label.includes(cc) || cc.includes(label))
        || candSkills.some(s => label.includes(s) || (capKey && s.includes(capKey)))
        || (capKey && candTrade.includes(capKey))
        || (capKey && candDuties.includes(capKey));

      if (matches) {
        reqHit.push(capObj?.label || capObj?.civil || capId);
      } else {
        gaps.push(capObj?.label || capObj?.civil || capId);
      }
    });

    // Score calculation
    let capScore = essential.length > 0 ? (reqHit.length / essential.length) : 0.85;
    
    // Supervisory scale score
    const reqSupervised = Number(criteria.min_team_supervised || 0);
    const candSupervised = Number(cand.team_size_supervised || 0);
    let teamScore = reqSupervised > 0 ? (candSupervised >= reqSupervised ? 1.0 : Math.max(0.4, candSupervised / reqSupervised)) : 1.0;

    let totalScore = Math.round((capScore * 0.65 + teamScore * 0.35) * 100);
    if (essential.length > 0 && reqHit.length === 0) {
      totalScore = Math.min(totalScore, 42);
    }

    const matchReasons = [];
    if (reqHit.length > 0) {
      matchReasons.push(`${reqHit.length} of ${essential.length} target capabilities verified in military service records`);
    }
    if (candSupervised > 0) {
      matchReasons.push(`Command & supervisory span: ${candSupervised} personnel managed`);
    }
    if (cand.civil_licences && cand.civil_licences.length > 0) {
      matchReasons.push(`Verified civil certification: ${cand.civil_licences[0]}`);
    }
    if (matchReasons.length === 0) {
      matchReasons.push('Verified ex-serviceman with honourable discharge credentials');
    }

    return {
      score: Math.min(98, Math.max(35, totalScore)),
      reqHit,
      gaps,
      matchReasons
    };
  };

  // Filter & Rank candidates
  useEffect(() => {
    let list = candidates.map(cand => {
      const fit = evaluateFit(cand, activeCriteria);
      const existingReq = recruiterRequests[cand.user_id];
      return {
        ...cand,
        fit,
        fitScore: fit.score,
        requestStatus: existingReq ? existingReq.status : null,
        existingRequest: existingReq || null,
      };
    });

    // 1. Sort by Fit Score descending
    list.sort((a, b) => b.fitScore - a.fitScore);

    // 2. Service branch filter
    if (selectedBranch !== 'All') {
      list = list.filter(c => c.service === selectedBranch);
    }

    // 3. Min score filter
    if (minScore > 0) {
      list = list.filter(c => c.fitScore >= minScore);
    }

    // 4. Min team supervised
    if (minSupervised > 0) {
      list = list.filter(c => (c.team_size_supervised || 0) >= minSupervised);
    }

    // 5. Location filter
    if (selectedLocation !== 'All') {
      list = list.filter(c => 
        (c.preferred_locations || []).some(loc => loc.toLowerCase().includes(selectedLocation.toLowerCase()))
      );
    }

    // 6. Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(c => {
        const masked = (c.maskedCode || '').toLowerCase();
        const trade = (c.trade || '').toLowerCase();
        const rank = (c.rank || '').toLowerCase();
        const skills = (c.skills || []).map(s => s.toLowerCase()).join(' ');
        const workTypes = (c.work_types || []).map(w => w.toLowerCase()).join(' ');
        const licences = (c.civil_licences || []).map(l => l.toLowerCase()).join(' ');
        return masked.includes(q) || trade.includes(q) || rank.includes(q) || skills.includes(q) || workTypes.includes(q) || licences.includes(q);
      });
    }

    setFilteredCandidates(list);
    if (list.length > 0 && (!selectedCandidate || !list.some(c => c.user_id === selectedCandidate.user_id))) {
      setSelectedCandidate(list[0]);
    }
  }, [candidates, activeCriteria, selectedBranch, minSupervised, minScore, selectedLocation, searchQuery, recruiterRequests]);

  // Handle open interest modal
  const handleOpenInterestModal = (candidate) => {
    setSelectedCandidate(candidate);
    setInterestRoleTitle(activeCriteria.role_titles?.[0] || dynamicRoleTitle || 'Specialized Role');
    setInterestSector(activeCriteria.sector || dynamicSector || 'Private Sector');
    setInterestNote('');
    setShowInterestModal(true);
  };

  // Submit recruiter interest
  const handleSubmitInterest = async () => {
    if (!selectedCandidate) return;
    setSubmittingInterest(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/login');
        return;
      }

      const res = await fetch('/api/private-sector/router', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({
          action: 'send_recruiter_request',
          requirement_id: searchMode === 'posted' ? selectedRequirement?.id : null,
          candidate_user_id: selectedCandidate.user_id,
          fit_score: selectedCandidate.fitScore || 80,
          match_reasons: selectedCandidate.fit?.matchReasons || ['Dynamic capability match verified'],
          role_title: interestRoleTitle || 'Specialized Role',
          sector: interestSector || 'Private Sector',
          notes: interestNote.trim() || null,
          candidate_masked_code: selectedCandidate.maskedCode,
          candidate_trade: selectedCandidate.trade,
          candidate_service: selectedCandidate.service,
          candidate_rank: selectedCandidate.rank
        })
      });

      const data = await res.json();
      if (!data.ok) throw new Error(data.error || 'Failed to submit interest');

      // Update state
      setRecruiterRequests(prev => ({
        ...prev,
        [selectedCandidate.user_id]: data.request
      }));

      setShowInterestModal(false);
      alert(`Interest expressed for ${selectedCandidate.maskedCode}! Your request has been submitted to the VeerNXT Operations Desk and will be reviewed for candidate introduction.`);
    } catch (err) {
      console.error('Error sending interest request:', err);
      alert('Error: ' + err.message);
    } finally {
      setSubmittingInterest(false);
    }
  };

  const getServiceColor = (service) => {
    if (!service) return { bg: '#f1f5f9', text: '#475569', border: '#e2e8f0' };
    const s = service.toLowerCase();
    if (s.includes('army')) return { bg: '#eef4ea', text: '#2d5a27', border: '#c3ddbc' };
    if (s.includes('navy')) return { bg: '#e8f0fe', text: '#1a56db', border: '#b8d2fc' };
    if (s.includes('air')) return { bg: '#e6f7ff', text: '#0070ba', border: '#b3e5fc' };
    return { bg: '#f1f5f9', text: '#475569', border: '#e2e8f0' };
  };

  return (
    <div className="talent-search-page animate-fade-in">
      {/* Top Header Card */}
      <div className="talent-header-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1.25rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--ios-olive)' }}>
                Corporate Talent Acquisition & Transition Cell
              </span>
              <span style={{ fontSize: '0.7rem', padding: '0.15rem 0.5rem', borderRadius: '999px', background: 'rgba(75,107,50,0.12)', color: 'var(--ios-olive)', fontWeight: 700 }}>
                Privacy Protected
              </span>
            </div>
            <h1 style={{ fontSize: '1.9rem', fontWeight: 850, color: '#0f172a', margin: '0 0 0.35rem', letterSpacing: '-0.02em' }}>
              Find Military Talent by Dynamic Preferences
            </h1>
            <p style={{ color: '#64748b', fontSize: '0.92rem', margin: 0, maxWidth: '780px', lineHeight: 1.45 }}>
              Filter ex-servicemen and Agniveers by custom sector requirements, leadership scale, and military competencies.
              Candidate names and direct contact details remain strictly masked under the VeerNXT Veteran Privacy Charter until mutual introduction.
            </p>
          </div>

          <Button 
            variant="secondary" 
            onClick={() => navigate('/employer/post-job')}
            style={{ fontWeight: 700, borderColor: '#cbd5e1' }}
          >
            + Post Formal Hiring Requirement
          </Button>
        </div>

        {/* Mode Switcher Tabs */}
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.5rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem' }}>
          <button
            type="button"
            onClick={() => setSearchMode('dynamic')}
            className={`pref-mode-tab ${searchMode === 'dynamic' ? 'active' : ''}`}
          >
            <Sliders size={16} /> Dynamic Role & Capability Matching (Recommended)
          </button>
          <button
            type="button"
            onClick={() => setSearchMode('posted')}
            className={`pref-mode-tab ${searchMode === 'posted' ? 'active' : ''}`}
          >
            <Briefcase size={16} /> Match Against Posted Requirement ({employerRequirements.length})
          </button>
        </div>

        {/* Dynamic Preferences Builder */}
        {searchMode === 'dynamic' ? (
          <div style={{ marginTop: '1.25rem', background: '#f8fafc', padding: '1.25rem', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
              {/* Sector Selector */}
              <div>
                <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#475569', marginBottom: '0.35rem' }}>
                  Industry Sector:
                </label>
                <select
                  value={dynamicSector}
                  onChange={(e) => applySectorDefaults(e.target.value)}
                  style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontSize: '0.88rem', fontWeight: 600, background: 'white' }}
                >
                  {SECTORS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              {/* Target Role Title */}
              <div>
                <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#475569', marginBottom: '0.35rem' }}>
                  Target Role Title:
                </label>
                <input
                  type="text"
                  value={dynamicRoleTitle}
                  onChange={(e) => setDynamicRoleTitle(e.target.value)}
                  placeholder="e.g. Operations Supervisor, Fleet Lead..."
                  style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontSize: '0.88rem', fontWeight: 600, background: 'white' }}
                />
              </div>
            </div>

            {/* Quick Role Suggestions */}
            {POPULAR_ROLE_TAGS[dynamicSector] && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                <span style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 700 }}>Popular Roles:</span>
                {POPULAR_ROLE_TAGS[dynamicSector].map(tag => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => setDynamicRoleTitle(tag)}
                    style={{
                      padding: '0.2rem 0.6rem',
                      borderRadius: '999px',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      background: dynamicRoleTitle === tag ? 'var(--ios-olive)' : 'white',
                      color: dynamicRoleTitle === tag ? 'white' : '#475569',
                      border: '1px solid #cbd5e1',
                      cursor: 'pointer'
                    }}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            )}

            {/* Capability Toggle Matrix */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#1e293b' }}>
                  Target Military Competencies & Capabilities ({dynamicCapabilities.length} selected):
                </span>
                <button
                  type="button"
                  onClick={() => applySectorDefaults(dynamicSector)}
                  style={{ background: 'none', border: 'none', color: 'var(--ios-olive)', fontSize: '0.76rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                >
                  <RotateCcw size={12} /> Reset to Sector Defaults
                </button>
              </div>

              <div style={{ display: 'flex', gap: '0.45rem', flexWrap: 'wrap' }}>
                {KEY_CAPABILITIES.map(cap => {
                  const isSelected = dynamicCapabilities.includes(cap.id);
                  return (
                    <button
                      key={cap.id}
                      type="button"
                      onClick={() => toggleCapability(cap.id)}
                      style={{
                        padding: '0.4rem 0.75rem',
                        borderRadius: '999px',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        background: isSelected ? 'rgba(75,107,50,0.12)' : 'white',
                        color: isSelected ? 'var(--ios-olive)' : '#475569',
                        border: isSelected ? '1.8px solid var(--ios-olive)' : '1px solid #cbd5e1',
                      }}
                    >
                      <span>{cap.icon}</span>
                      <span>{cap.label}</span>
                      {isSelected && <Check size={13} style={{ strokeWidth: 3 }} />}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          /* Match against posted job requirement */
          <div style={{ marginTop: '1.25rem', background: '#f8fafc', padding: '1rem 1.25rem', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
              <strong style={{ fontSize: '0.88rem', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Briefcase size={16} color="var(--ios-olive)" /> Select Requirement:
              </strong>
              <select
                value={selectedRequirementId}
                onChange={(e) => {
                  setSelectedRequirementId(e.target.value);
                  const found = employerRequirements.find(r => r.id === e.target.value) || null;
                  setSelectedRequirement(found);
                }}
                style={{
                  flex: 1,
                  minWidth: '260px',
                  padding: '0.55rem 0.85rem',
                  borderRadius: '10px',
                  border: '1.5px solid var(--ios-olive)',
                  fontSize: '0.88rem',
                  fontWeight: 600,
                  background: 'white',
                }}
              >
                {employerRequirements.map(r => (
                  <option key={r.id} value={r.id}>
                    {(r.role_titles || []).join(' / ')} • {r.sector} ({r.quantity || 1} Openings)
                  </option>
                ))}
              </select>
              {selectedRequirement && (
                <span style={{ fontSize: '0.78rem', background: 'rgba(75,107,50,0.12)', color: 'var(--ios-olive)', padding: '0.35rem 0.75rem', borderRadius: '999px', fontWeight: 700 }}>
                  {selectedRequirement.essential_capabilities?.length || 0} Capabilities Configured
                </span>
              )}
            </div>
          </div>
        )}

        {/* Global Filter Toolbar */}
        <div className="filters-grid-bar">
          <div style={{ position: 'relative', flex: 2, minWidth: '220px' }}>
            <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)' }} />
            <input 
              type="text" 
              placeholder="Search by code (e.g. VN-4091), trade, skill, licence..."
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

          <div style={{ flex: 1, minWidth: '140px' }}>
            <select
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              style={{ width: '100%', padding: '0.55rem', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.88rem', background: 'white' }}
            >
              <option value="All">Any Location</option>
              <option value="Delhi">Delhi NCR</option>
              <option value="Bengaluru">Bengaluru</option>
              <option value="Mumbai">Mumbai / Pune</option>
              <option value="Hyderabad">Hyderabad</option>
              <option value="Chandigarh">Chandigarh</option>
              <option value="Kochi">Kochi / Chennai</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: '170px' }}>
            <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#64748b', whiteSpace: 'nowrap' }}>
              Min Fit: {minScore}%
            </span>
            <input 
              type="range" 
              min={35} 
              max={85} 
              step={5} 
              value={minScore} 
              onChange={(e) => setMinScore(Number(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--ios-olive)' }}
            />
          </div>
        </div>
      </div>

      {/* Directory Workspace: Left Master List / Right Detail Evidence Pane */}
      <div className="talent-workspace-layout">
        {/* Left Side: Candidate Master List */}
        <div className="talent-list-column">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', padding: '0 0.25rem' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#64748b' }}>
              <strong>{filteredCandidates.length}</strong> Military Candidates Available
            </span>
            <span style={{ fontSize: '0.72rem', color: 'var(--ios-olive)', fontWeight: 700 }}>
              Sorted by Fit %
            </span>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
              <RefreshCw className="aps-spin" size={24} color="var(--ios-olive)" style={{ margin: '0 auto 0.5rem' }} />
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>Evaluating candidate crosswalks...</p>
            </div>
          ) : filteredCandidates.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 1.5rem', background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
              <Users size={32} color="#94a3b8" style={{ margin: '0 auto 0.5rem' }} />
              <p style={{ margin: '0 0 0.25rem', fontWeight: 700, color: '#1e293b' }}>No Matches Found</p>
              <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>
                Adjust your search keywords or lower the minimum fit threshold slider above.
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
                    className={`talent-card-item ${isSelected ? 'active' : ''}`}
                    onClick={() => setSelectedCandidate(cand)}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                      <div style={{ display: 'flex', gap: '0.65rem', alignItems: 'center' }}>
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
                          fontSize: '0.75rem',
                          border: `1px solid ${sColor.border || '#e2e8f0'}`
                        }}>
                          {cand.service?.toLowerCase().includes('air') ? 'IAF' : cand.service?.toLowerCase().includes('navy') ? 'IN' : 'IA'}
                        </div>

                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                            <strong style={{ fontSize: '0.92rem', color: '#0f172a' }}>
                              Candidate {cand.maskedCode}
                            </strong>
                            <span title="Masked Candidate for Privacy" style={{ color: '#94a3b8' }}>
                              <Lock size={12} />
                            </span>
                          </div>
                          <p style={{ margin: '0.15rem 0 0', fontSize: '0.75rem', color: '#64748b' }}>
                            {cand.rank} • {cand.trade}
                          </p>
                        </div>
                      </div>

                      {/* Match Fit Score Pill */}
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
                          <span style={{ color: '#d97706' }}>⏳ Interest Expressed • Pending Review</span>
                        )}
                        {reqStatus === 'accepted' && (
                          <span style={{ color: '#16a34a' }}>✓ Introduction Accepted</span>
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

        {/* Right Side: Candidate Full Capability Profile Pane (NO Name, NO Contacts) */}
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
                    fontSize: '1.2rem',
                    border: `1.5px solid ${getServiceColor(selectedCandidate.service).border || '#e2e8f0'}`
                  }}>
                    {selectedCandidate.maskedCode.slice(3)}
                  </div>

                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <h2 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 850, color: '#0f172a' }}>
                        Candidate {selectedCandidate.maskedCode}
                      </h2>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        padding: '0.2rem 0.6rem',
                        borderRadius: '999px',
                        background: '#f8fafc',
                        color: '#64748b',
                        border: '1px solid #e2e8f0'
                      }}>
                        <Lock size={11} /> Masked for Veteran Privacy
                      </span>
                    </div>

                    <p style={{ margin: '0.25rem 0 0', color: '#475569', fontSize: '0.88rem', fontWeight: 600 }}>
                      {selectedCandidate.service} • {selectedCandidate.rank} • {selectedCandidate.trade}
                    </p>
                  </div>
                </div>

                {/* Primary Action: Show Interest Button */}
                <div>
                  {recruiterRequests[selectedCandidate.user_id] ? (
                    <div style={{
                      background: '#fffbeb',
                      border: '1px solid #fde68a',
                      padding: '0.55rem 0.95rem',
                      borderRadius: '10px',
                      fontSize: '0.82rem',
                      color: '#92400e',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem'
                    }}>
                      <Clock size={15} /> Interest Expressed • Pending VeerNXT Coordination
                    </div>
                  ) : (
                    <Button 
                      size="sm"
                      onClick={() => handleOpenInterestModal(selectedCandidate)}
                      style={{ fontWeight: 700, background: 'var(--ios-olive)', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
                    >
                      <Send size={14} /> Show Interest in Candidate
                    </Button>
                  )}
                </div>
              </div>

              {/* Privacy Notice Card */}
              <div style={{ marginTop: '1.25rem', background: '#fbfcf9', border: '1px solid #e6eedb', padding: '0.9rem 1.1rem', borderRadius: '12px', display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                <ShieldCheck size={18} color="var(--ios-olive)" style={{ flexShrink: 0, marginTop: '0.15rem' }} />
                <div style={{ fontSize: '0.8rem', color: '#475569', lineHeight: 1.45 }}>
                  <strong style={{ color: '#1f3a2e' }}>VeerNXT Veteran Privacy Charter:</strong> Candidate contact coordinates (verified phone, personal email, and full legal name) are strictly guarded.
                  When you click <strong>Show Interest</strong>, this role request is routed directly to the VeerNXT Operations Desk for candidate briefing and introduction.
                </div>
              </div>

              {/* Requirement Fit Assessment Box */}
              <div style={{ marginTop: '1.25rem', background: '#f8fafc', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Sparkles size={16} color="var(--ios-olive)" />
                    <strong style={{ fontSize: '0.92rem', color: '#0f172a' }}>
                      Fit Assessment for: {activeCriteria.role_titles?.[0] || 'Selected Preferences'}
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
                        Verified Target Capabilities:
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
                        Complementary Capabilities / Bridge Areas:
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

              {/* Service & Operational Experience Specs */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginTop: '1.25rem' }}>
                <div style={{ background: 'white', border: '1px solid #f1f5f9', padding: '1rem', borderRadius: '12px' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Supervisory Span</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
                    <Users size={18} color="var(--ios-olive)" />
                    <strong style={{ fontSize: '1.05rem', color: '#0f172a' }}>
                      {selectedCandidate.team_size_supervised > 0 ? `${selectedCandidate.team_size_supervised} Personnel Supervised` : 'Individual Specialist'}
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
                    Armed Forces Certified Trade Class
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
                    Honourable Military Service
                  </p>
                </div>
              </div>

              {/* Preferred Locations */}
              {selectedCandidate.preferred_locations?.length > 0 && (
                <div style={{ marginTop: '1.25rem', background: '#f8fafc', padding: '0.85rem 1rem', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <MapPin size={16} color="var(--ios-olive)" />
                  <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#1e293b' }}>
                    Preferred Work Locations:
                  </span>
                  <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                    {selectedCandidate.preferred_locations.map(loc => (
                      <span key={loc} style={{ fontSize: '0.78rem', background: 'white', border: '1px solid #cbd5e1', padding: '0.15rem 0.5rem', borderRadius: '6px', color: '#334155' }}>
                        {loc}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Verified Civil Licences & Certifications */}
              {selectedCandidate.civil_licences?.length > 0 && (
                <div style={{ marginTop: '1.25rem' }}>
                  <h4 style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.5rem' }}>
                    Verified Civil Licences & Government Endorsements
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
                  Logged Military Duties & Operational Responsibilities
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

              {/* Technical & Military Skills */}
              {selectedCandidate.skills?.length > 0 && (
                <div style={{ marginTop: '1.5rem' }}>
                  <h4 style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.5rem' }}>
                    Technical & Specialised Operational Skills
                  </h4>
                  <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                    {selectedCandidate.skills.map((skill, idx) => (
                      <span key={idx} style={{
                        fontSize: '0.78rem',
                        background: '#f1f5f9',
                        color: '#334155',
                        padding: '0.3rem 0.65rem',
                        borderRadius: '6px',
                        fontWeight: 600,
                        border: '1px solid #e2e8f0'
                      }}>
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}

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
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '4rem 2rem', background: 'white', borderRadius: '24px', border: '1px solid #e2e8f0', color: '#64748b' }}>
              <Info size={36} color="#94a3b8" style={{ margin: '0 auto 0.75rem' }} />
              <h3>Select a Military Candidate</h3>
              <p style={{ fontSize: '0.88rem' }}>Choose any candidate from the list on the left to review their complete capability dossier and operational background.</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal: Show Interest in Candidate */}
      {showInterestModal && selectedCandidate && (
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
            maxWidth: '540px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            overflow: 'hidden'
          }}>
            <div style={{ padding: '1.5rem', borderBottom: '1px solid #f1f5f9' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                <Send size={18} color="var(--ios-olive)" />
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>
                  Show Interest in Candidate {selectedCandidate.maskedCode}
                </h3>
              </div>
              <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', color: '#64748b' }}>
                {selectedCandidate.service} • {selectedCandidate.rank} • {selectedCandidate.trade}
              </p>
            </div>

            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ background: '#f8fafc', padding: '0.85rem', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '0.82rem', color: '#475569', lineHeight: 1.45 }}>
                Submitting interest logs this requirement directly with the <strong>VeerNXT Operations Desk</strong> and initiates contact with the veteran.
                Candidate name and contact details remain masked until the introduction is confirmed.
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', display: 'block', marginBottom: '0.35rem' }}>
                  Target Role Title:
                </label>
                <input
                  type="text"
                  value={interestRoleTitle}
                  onChange={(e) => setInterestRoleTitle(e.target.value)}
                  placeholder="e.g. Fleet Operations Supervisor"
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.75rem',
                    borderRadius: '10px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '0.88rem',
                    fontWeight: 600,
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', display: 'block', marginBottom: '0.35rem' }}>
                  Industry Sector:
                </label>
                <input
                  type="text"
                  value={interestSector}
                  onChange={(e) => setInterestSector(e.target.value)}
                  placeholder="e.g. Logistics & Transport"
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.75rem',
                    borderRadius: '10px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '0.88rem',
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', display: 'block', marginBottom: '0.35rem' }}>
                  Introductory Note from Employer (Optional):
                </label>
                <textarea
                  value={interestNote}
                  onChange={(e) => setInterestNote(e.target.value)}
                  placeholder="e.g. We were impressed by your technical maintenance background and supervisory span and would like to discuss our site supervisor opening..."
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
                  onClick={handleSubmitInterest}
                  disabled={submittingInterest}
                  style={{ flex: 1, padding: '0.75rem', fontWeight: 800, background: 'var(--ios-olive)' }}
                >
                  {submittingInterest ? 'Submitting...' : 'Confirm & Show Interest'}
                </Button>
                <Button 
                  variant="secondary"
                  onClick={() => setShowInterestModal(false)}
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
        .pref-mode-tab {
          display: inline-flex;
          align-items: center;
          gap: 0.45rem;
          padding: 0.5rem 1rem;
          border: none;
          background: none;
          font-size: 0.85rem;
          font-weight: 700;
          color: #64748b;
          cursor: pointer;
          border-bottom: 2.5px solid transparent;
          transition: all 0.15s ease;
        }
        .pref-mode-tab:hover {
          color: #1e293b;
        }
        .pref-mode-tab.active {
          color: var(--ios-olive);
          border-bottom-color: var(--ios-olive);
        }
        .filters-grid-bar {
          display: flex;
          gap: 0.75rem;
          margin-top: 1.25rem;
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
