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
import { SECTOR_OPTIONS, getRolesForSector, getSkillsForSectors, getRoleSpecification } from '../lib/privateSectorTaxonomy';

const SECTORS = SECTOR_OPTIONS;

// Domain-accurate sector configuration mapping:
// Roles, popular suggestions, domain-curated capabilities, and default active capabilities
export const SECTOR_CONFIG = {
  it_telecom: {
    sectorLabel: 'IT, Software & Telecom',
    defaultRole: 'Network Administrator / Engineer',
    popularRoles: [
      'Network Administrator / Engineer',
      'IT Support & Desktop Engineer',
      'Cyber Security Analyst / SOC',
      'System / Linux Administrator',
      'Cloud & DevOps Specialist',
      'Telecom / RF Technician'
    ],
    defaultSelectedCaps: ['wt_comms', 'wt_intel', 'wt_maint'],
    capabilities: [
      { id: 'wt_comms', label: 'IT, Networks & Tactical Comms', icon: '📡' },
      { id: 'wt_intel', label: 'Cyber Security, SOC & Threat Analysis', icon: '🛡️' },
      { id: 'wt_maint', label: 'Hardware Diagnostics & Systems Tech', icon: '💻' },
      { id: 'wt_admin', label: 'MIS, Database & Records Admin', icon: '📑' },
      { id: 'wt_command', label: 'IT Project & Team Leadership', icon: '👥' },
      { id: 'wt_instructor', label: 'Technical Training & Instruction', icon: '👨‍🏫' },
      { id: 'wt_survey', label: 'RF Testing & Technical Instrumentation', icon: '🛰️' }
    ]
  },
  security_defence: {
    sectorLabel: 'Security, Defence & Surveillance',
    defaultRole: 'Security Supervisor',
    popularRoles: [
      'Security Supervisor',
      'Chief Security Officer',
      'CCTV & Control Room Operator',
      'Loss Prevention / Vigilance Executive',
      'Fire & Industrial Safety Officer',
      'Armed Guard / PSO'
    ],
    defaultSelectedCaps: ['wt_guard', 'wt_intel', 'wt_command'],
    capabilities: [
      { id: 'wt_guard', label: 'Physical Security & Access Control', icon: '🛡️' },
      { id: 'wt_intel', label: 'CCTV Surveillance & Loss Prevention', icon: '🔍' },
      { id: 'wt_command', label: 'Guard Force Supervision & Shift Lead', icon: '👥' },
      { id: 'wt_eod', label: 'Industrial Safety & Fire Response', icon: '🦺' },
      { id: 'wt_weapon', label: 'Armed Escort & Weapon Protocol', icon: '🎯' },
      { id: 'wt_facility', label: 'Facility Protection & Asset Security', icon: '🏢' },
      { id: 'wt_animal', label: 'K9 Handling & Perimeter Patrols', icon: '🐕' },
      { id: 'wt_comms', label: 'Control Room Comms & Dispatch', icon: '📻' }
    ]
  },
  logistics_transport: {
    sectorLabel: 'Logistics, Supply Chain & Transport',
    defaultRole: 'Fleet Supervisor',
    popularRoles: [
      'Fleet Supervisor',
      'Warehouse Supervisor',
      'Logistics & Dispatch Coordinator',
      'Inventory Controller / Storekeeper',
      'Forklift & Equipment Operator',
      'Driver (HMV/LMV)'
    ],
    defaultSelectedCaps: ['wt_driver', 'wt_store', 'wt_command'],
    capabilities: [
      { id: 'wt_driver', label: 'Heavy Fleet & Commercial Driving', icon: '🚚' },
      { id: 'wt_store', label: 'Warehouse & Inventory ERP Systems', icon: '📦' },
      { id: 'wt_command', label: 'Fleet Operations & Shift Leadership', icon: '👥' },
      { id: 'wt_armour', label: 'Heavy Machinery & MHE Operation', icon: '🚜' },
      { id: 'wt_facility', label: 'Depot & Dispatch Center In-Charge', icon: '🏭' },
      { id: 'wt_maint', label: 'Fleet Preventive Maintenance', icon: '🛠️' },
      { id: 'wt_admin', label: 'Transit Documentation & Compliance', icon: '📋' }
    ]
  },
  engineering_manufacturing: {
    sectorLabel: 'Engineering, Technical & Manufacturing',
    defaultRole: 'Maintenance Engineer / Supervisor',
    popularRoles: [
      'Maintenance Engineer / Supervisor',
      'Plant Operations Supervisor',
      'Electrical Technician / Electrician',
      'QA/QC Inspector',
      'Mechanical Technician',
      'Welder / Fabricator'
    ],
    defaultSelectedCaps: ['wt_maint', 'wt_engineer', 'wt_survey'],
    capabilities: [
      { id: 'wt_maint', label: 'Technical Maintenance & Overhaul', icon: '🛠️' },
      { id: 'wt_engineer', label: 'Plant & Electrical Infrastructure', icon: '🏗️' },
      { id: 'wt_survey', label: 'QA/QC Inspection & Metrology', icon: '🔬' },
      { id: 'wt_armour', label: 'Heavy Plant & Machinery Operation', icon: '⚙️' },
      { id: 'wt_facility', label: 'Workshop Floor & Bay Management', icon: '🏭' },
      { id: 'wt_command', label: 'Technical Shift & Crew Supervision', icon: '👥' },
      { id: 'wt_instructor', label: 'Technical Trade & Safety Training', icon: '👨‍🏫' }
    ]
  },
  admin_facilities: {
    sectorLabel: 'Administration, Operations & Facility Management',
    defaultRole: 'Facility Supervisor',
    popularRoles: [
      'Facility Supervisor',
      'Site Manager',
      'Administrative Officer / Clerk',
      'Operations Supervisor',
      'Procurement & Vendor Executive',
      'Quartermaster / Store Incharge'
    ],
    defaultSelectedCaps: ['wt_facility', 'wt_admin', 'wt_command'],
    capabilities: [
      { id: 'wt_facility', label: 'Facility Operations & Site In-Charge', icon: '🏢' },
      { id: 'wt_admin', label: 'Office Administration & Records', icon: '📋' },
      { id: 'wt_command', label: 'Operations & Team Leadership', icon: '👥' },
      { id: 'wt_store', label: 'Stores, Inventory & Asset Registry', icon: '📦' },
      { id: 'wt_engineer', label: 'Facility Infrastructure & Civil Works', icon: '🔌' },
      { id: 'wt_guard', label: 'Site Security & Access Coordination', icon: '🛡️' }
    ]
  },
  aviation_marine: {
    sectorLabel: 'Aviation, Aerospace & Marine',
    defaultRole: 'Aircraft Maintenance Technician',
    popularRoles: [
      'Aircraft Maintenance Technician',
      'Avionics & Radar Technician',
      'Airfield Safety & Marshal Officer',
      'Ground Handling & Ramp Personnel',
      'Drone Operator / Specialist',
      'Marine Vessel Operations Specialist'
    ],
    defaultSelectedCaps: ['wt_aviation', 'wt_maint', 'wt_comms'],
    capabilities: [
      { id: 'wt_aviation', label: 'Airfield Ramp & Ground Handling', icon: '✈️' },
      { id: 'wt_maint', label: 'Airframe, Engine & Marine Overhaul', icon: '🔧' },
      { id: 'wt_comms', label: 'Avionics, Radar & Air Traffic Comms', icon: '📡' },
      { id: 'wt_seamanship', label: 'Marine Deck & Vessel Operations', icon: '⚓' },
      { id: 'wt_survey', label: 'Drone Operations & Precision Testing', icon: '🛰️' },
      { id: 'wt_command', label: 'Flight Deck & Hangar Shift Lead', icon: '👥' },
      { id: 'wt_medic', label: 'Airfield & Vessel Emergency Response', icon: '🦺' }
    ]
  },
  healthcare_hospitality: {
    sectorLabel: 'Healthcare, Emergency & Hospitality',
    defaultRole: 'First Aid & Disaster Response Specialist',
    popularRoles: [
      'First Aid & Disaster Response Specialist',
      'Paramedic / Emergency Medical Assistant',
      'Hospitality / Mess Supervisor',
      'Ambulance & Patient Transport Driver',
      'Health & Sanitation Inspector'
    ],
    defaultSelectedCaps: ['wt_medic', 'wt_medical', 'wt_catering'],
    capabilities: [
      { id: 'wt_medic', label: 'Emergency Trauma & Disaster Response', icon: '🚑' },
      { id: 'wt_medical', label: 'Clinical, Paramedical & Lab Support', icon: '🩺' },
      { id: 'wt_catering', label: 'Institutional Mess & Hospitality Ops', icon: '🍲' },
      { id: 'wt_driver', label: 'Ambulance & Emergency Transport', icon: '🚐' },
      { id: 'wt_facility', label: 'Hospital & Ward Facility Support', icon: '🏥' },
      { id: 'wt_command', label: 'Medical Detachment & Shift Lead', icon: '👥' }
    ]
  },
  corporate_sales: {
    sectorLabel: 'Corporate, HR, Sales & Field Services',
    defaultRole: 'HR & Veteran Talent Recruiter',
    popularRoles: [
      'HR & Veteran Talent Recruiter',
      'Field Operations Executive',
      'Business Development / Sales Executive',
      'Accounts & Billing Assistant',
      'Customer Relations Executive'
    ],
    defaultSelectedCaps: ['wt_admin', 'wt_intel', 'wt_command'],
    capabilities: [
      { id: 'wt_admin', label: 'HR, Talent Onboarding & Payroll', icon: '📋' },
      { id: 'wt_intel', label: 'Field Verification & Risk Auditing', icon: '📊' },
      { id: 'wt_command', label: 'Field Team & Client Relationship Lead', icon: '👥' },
      { id: 'wt_instructor', label: 'Corporate Training Delivery', icon: '🗣️' },
      { id: 'wt_comms', label: 'Client Communications & Helpdesk', icon: '📞' }
    ]
  }
};

// Unified map of all known capabilities for lookups and cross-domain references
export const ALL_CAPABILITIES_MAP = {};
Object.values(SECTOR_CONFIG).forEach(sec => {
  sec.capabilities.forEach(c => {
    if (!ALL_CAPABILITIES_MAP[c.id]) {
      ALL_CAPABILITIES_MAP[c.id] = c;
    }
  });
});
export const ALL_CAPABILITIES_LIST = Object.values(ALL_CAPABILITIES_MAP);

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
  },
  {
    id: 'f1a2b3c4-0006-4000-a000-000000000006',
    user_id: 'f1a2b3c4-0006-4000-a000-000000000006',
    maskedCode: 'VN-6140',
    service: 'Indian Army',
    branch: 'Corps of Military Police (CMP)',
    trade: 'Security & Vigilance Supervisor',
    rank: 'Havildar',
    service_years: '17 Years Active Service',
    trade_proficiency: 'Class I Military Police / Security',
    highest_working_level: 'Base Security Detachment Commander',
    team_size_supervised: 24,
    civil_licences: ['PSARA Certified Security Supervisor', 'Industrial Fire Safety & First Aid'],
    work_types: ['Physical Security, Surveillance & Access Control', 'Frontline Team Leadership, Shift & Crew Supervision', 'Risk Investigation, Vigilance & Information Analysis', 'Facility, Stores & Site In-Charge / Quartermaster'],
    skills: ['Access Control Systems', 'CCTV & Perimeter Monitoring', 'Incident Triage & Crisis Response', 'VIP Protection Protocol', 'Fire & Industrial Safety', 'Vigilance & Loss Prevention'],
    duties: [
      { text: 'Supervised armed perimeter security detachment of 24 personnel across high-security defence cantonment and ammunition depot.' },
      { text: 'Implemented 24/7 CCTV surveillance room protocol, biometric access control logs, and visitor vehicle inspection systems.' },
      { text: 'Executed monthly industrial fire fighting drills, emergency evacuation readiness plans, and security threat audits.' }
    ],
    preferred_locations: ['Delhi NCR', 'Chandigarh', 'Lucknow', 'Jaipur'],
  },
  {
    id: 'f1a2b3c4-0007-4000-a000-000000000007',
    user_id: 'f1a2b3c4-0007-4000-a000-000000000007',
    maskedCode: 'VN-3319',
    service: 'Indian Air Force',
    branch: 'Administration & Accounts',
    trade: 'Office Administration & Records In-Charge',
    rank: 'Junior Warrant Officer (JWO)',
    service_years: '16 Years Active Service',
    trade_proficiency: 'Class I Admin & Accounts',
    highest_working_level: 'Station Administrative Officer Assistant',
    team_size_supervised: 12,
    civil_licences: ['Advanced Office Management & ERP Certification', 'Commercial Accounting & Payroll Fundamentals'],
    work_types: ['Office Administration, Records & Payroll Management', 'Facility, Stores & Site In-Charge / Quartermaster', 'Frontline Team Leadership, Shift & Crew Supervision'],
    skills: ['Personnel Records Management', 'Payroll Processing', 'Vendor Billing & Invoicing', 'Office Administration', 'Compliance Audits', 'Team Supervision'],
    duties: [
      { text: 'Directed administrative office managing documentation, service records, and attendance for 350+ base personnel.' },
      { text: 'Audited monthly vendor billing, supply contracts, and expenditure registers with zero audit objections.' },
      { text: 'Coordinated station facility maintenance allocations, accommodation records, and annual compliance paperwork.' }
    ],
    preferred_locations: ['Bengaluru', 'Delhi NCR', 'Hyderabad', 'Pune'],
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

  // Dynamic Preferences State initialized to domain-accurate sector defaults
  const initialSector = SECTORS[0] || 'IT, Software & Telecom';
  const initialSecKey = resolveSectorKey(initialSector) || 'it_telecom';
  const initialConfig = SECTOR_CONFIG[initialSecKey] || SECTOR_CONFIG.it_telecom;

  const [dynamicSector, setDynamicSector] = useState(initialSector);
  const [dynamicRoleTitle, setDynamicRoleTitle] = useState(initialConfig.defaultRole);
  const [dynamicCapabilities, setDynamicCapabilities] = useState([...initialConfig.defaultSelectedCaps]);
  const [showAllCaps, setShowAllCaps] = useState(false);
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

  // Handle sector change: updates sector, default role title, and domain-curated capabilities
  const handleSectorChange = (newSector) => {
    setDynamicSector(newSector);
    const secKey = resolveSectorKey(newSector) || 'it_telecom';
    const cfg = SECTOR_CONFIG[secKey] || SECTOR_CONFIG.it_telecom;
    setDynamicRoleTitle(cfg.defaultRole);
    setDynamicCapabilities([...cfg.defaultSelectedCaps]);
  };

  // Reset capabilities to the active sector's defaults
  const handleResetSectorDefaults = () => {
    const secKey = resolveSectorKey(dynamicSector) || 'it_telecom';
    const cfg = SECTOR_CONFIG[secKey] || SECTOR_CONFIG.it_telecom;
    setDynamicCapabilities([...cfg.defaultSelectedCaps]);
  };

  // Select a role: updates target role and automatically maps domain capabilities
  const handleSelectRole = (roleTitle) => {
    setDynamicRoleTitle(roleTitle);
    const spec = getRoleSpecification(roleTitle, dynamicSector);
    if (spec?.capabilities && spec.capabilities.length > 0) {
      setDynamicCapabilities(spec.capabilities);
    }
  };

  // Active role specification (responsibilities, requirements, licenses)
  const activeRoleSpec = useMemo(() => {
    return getRoleSpecification(dynamicRoleTitle, dynamicSector);
  }, [dynamicRoleTitle, dynamicSector]);

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

  // Robust domain-intelligent capability match evaluator
  const evaluateFit = (cand, criteria) => {
    const essential = criteria.essential_capabilities || [];
    const candCaps = (cand.work_types || []).map(w => w.toLowerCase());
    const candSkills = (cand.skills || []).map(s => s.toLowerCase());
    const candTrade = (cand.trade || '').toLowerCase();
    const candDuties = (cand.duties || []).map(d => (typeof d === 'string' ? d : d.text || '').toLowerCase()).join(' ');
    const candLicences = (cand.civil_licences || []).map(l => l.toLowerCase()).join(' ');
    const candBranch = (cand.branch || '').toLowerCase();
    const candService = (cand.service || '').toLowerCase();

    const reqHit = [];
    const gaps = [];

    // Domain keywords dictionary for bulletproof military-to-civilian crosswalk
    const CAP_KEYWORDS = {
      wt_comms: ['signal', 'satcom', 'radio', 'telecom', 'network', 'ccna', 'cisco', 'lan', 'wan', 'cipher', 'it', 'computer', 'rf', 'data', 'tcp', 'ip', 'ethernet'],
      wt_intel: ['cyber', 'soc', 'surveillance', 'intelligence', 'vigilance', 'threat', 'investigation', 'audit', 'vetting', 'cctv', 'loss prevention', 'security audit', 'counter intel'],
      wt_maint: ['maintenance', 'diagnostics', 'overhaul', 'repair', 'mechanic', 'fitter', 'electrical', 'technician', 'artificer', 'preventive', 'breakdown', 'tool', 'machinist'],
      wt_driver: ['driver', 'driving', 'transport', 'convoy', 'htv', 'hmv', 'lmv', 'mt', 'vehicle', 'bowser', 'fleet', 'haulage', 'truck', 'carrier'],
      wt_store: ['store', 'warehouse', 'inventory', 'supply', 'logistics', 'depot', 'erp', 'dispatch', 'sap', 'stock', 'storekeeper', 'pallet', 'cargo'],
      wt_guard: ['security', 'guard', 'sentry', 'access control', 'patrol', 'dsc', 'police', 'provost', 'psara', 'asset protection', 'perimeter', 'vip escort'],
      wt_command: ['leadership', 'commander', 'supervisor', 'havildar', 'subedar', 'sergeant', 'nco', 'jco', 'lead', 'incharge', 'crew', 'shift', 'warrant officer', 'officer'],
      wt_eod: ['fire', 'firefighting', 'safety', 'hazard', 'eod', 'demolition', 'cbrn', 'ehs', 'industrial safety', 'first aid', 'stcw', 'emergency response'],
      wt_facility: ['facility', 'site', 'quartermaster', 'depot', 'barracks', 'infrastructure', 'caretaker', 'camp', 'premises', 'kote'],
      wt_aviation: ['aviation', 'airframe', 'airfield', 'flight line', 'ramp', 'aircraft', 'avionics', 'marshaller', 'dgca', 'drone', 'rotorcraft', 'hangar'],
      wt_survey: ['survey', 'metrology', 'inspection', 'qa', 'qc', 'quality', 'radar', 'synoptic', 'gis', 'calibration', 'theodolite', 'ndt', 'testing'],
      wt_medic: ['medic', 'paramedical', 'nursing', 'first aid', 'trauma', 'hospital', 'ambulance', 'triage', 'casevac', 'clinical', 'bls'],
      wt_medical: ['medic', 'paramedical', 'nursing', 'clinical', 'pharmacy', 'laboratory', 'pathology', 'hospital'],
      wt_catering: ['catering', 'mess', 'kitchen', 'food', 'hospitality', 'ration', 'cook', 'chef', 'steward', 'dining'],
      wt_weapon: ['weapon', 'gunnery', 'rifleman', 'marksman', 'firing', 'armament', 'armorer', 'support weapon', 'small arms'],
      wt_seamanship: ['marine', 'vessel', 'ship', 'naval', 'sea', 'seamanship', 'port', 'dockyard', 'watchkeeping', 'deck'],
      wt_admin: ['admin', 'clerk', 'payroll', 'records', 'office', 'documentation', 'accounts', 'mis', 'ledger', 'compliance', 'excel'],
      wt_engineer: ['construction', 'civil', 'infrastructure', 'bridge', 'mes', 'electrical', 'wireman', 'plumbing', 'structural', 'plant'],
      wt_armour: ['armoured', 'tank', 'bmp', 'tracked', 'heavy machinery', 'hemm', 'winch', 'crane', 'recovery vehicle', 'forklift', 'mhe'],
      wt_animal: ['k9', 'dog', 'animal', 'veterinary', 'farrier', 'patrol dog'],
      wt_instructor: ['instructor', 'training', 'drill', 'lecturer', 'teaching', 'cadre', 'coaching', 'trade training']
    };

    essential.forEach(capId => {
      const capObj = ALL_CAPABILITIES_MAP[capId] || WORK_TYPES.find(w => w.id === capId);
      const capName = capObj?.label || capObj?.civil || capId;
      const label = capName.toLowerCase();
      const capKey = (capObj?.capKey || '').toLowerCase();
      const keywords = CAP_KEYWORDS[capId] || [];

      // Check direct candidate work types match
      const workTypeMatch = candCaps.some(cc => 
        cc === capId.toLowerCase() || 
        cc.includes(capId.toLowerCase()) || 
        (capKey && cc.includes(capKey)) || 
        label.includes(cc) || 
        cc.includes(label)
      );

      // Check keywords against trade, branch, skills, duties, licences
      const keywordMatch = keywords.some(kw => 
        candTrade.includes(kw) ||
        candBranch.includes(kw) ||
        candSkills.some(s => s.includes(kw)) ||
        candDuties.includes(kw) ||
        candLicences.includes(kw)
      );

      if (workTypeMatch || keywordMatch) {
        reqHit.push(capName);
      } else {
        gaps.push(capName);
      }
    });

    // Score calculation
    let capScore = essential.length > 0 ? (reqHit.length / essential.length) : 0.85;
    
    // Supervisory scale score
    const reqSupervised = Number(criteria.min_team_supervised || 0);
    const candSupervised = Number(cand.team_size_supervised || 0);
    let teamScore = reqSupervised > 0 ? (candSupervised >= reqSupervised ? 1.0 : Math.max(0.4, candSupervised / reqSupervised)) : 1.0;

    // Role title alignment bonus
    const targetRole = (criteria.role_titles?.[0] || '').toLowerCase();
    let roleBonus = 0;
    if (targetRole) {
      const roleTokens = targetRole.split(/[\s/,-]+/).filter(t => t.length > 3);
      const hasRoleOverlap = roleTokens.some(t => candTrade.includes(t) || candDuties.includes(t) || candSkills.some(s => s.includes(t)));
      if (hasRoleOverlap) roleBonus = 0.06;
    }

    let totalScore = Math.round(((capScore * 0.65 + teamScore * 0.30 + roleBonus) * 100));
    if (essential.length > 0 && reqHit.length === 0) {
      totalScore = Math.min(totalScore, 38);
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
                  onChange={(e) => handleSectorChange(e.target.value)}
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
                  placeholder="e.g. Network Administrator, Security Lead..."
                  style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontSize: '0.88rem', fontWeight: 600, background: 'white' }}
                />
              </div>
            </div>

            {/* Quick Role Suggestions */}
            {(() => {
              const secKey = resolveSectorKey(dynamicSector) || 'it_telecom';
              const cfg = SECTOR_CONFIG[secKey] || SECTOR_CONFIG.it_telecom;
              const rolesList = cfg.popularRoles || [];
              if (rolesList.length === 0) return null;
              return (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.9rem' }}>
                  <span style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 700 }}>Popular {cfg.sectorLabel} Roles:</span>
                  {rolesList.map(tag => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => handleSelectRole(tag)}
                      style={{
                        padding: '0.22rem 0.65rem',
                        borderRadius: '999px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        background: dynamicRoleTitle === tag ? 'var(--ios-olive)' : 'white',
                        color: dynamicRoleTitle === tag ? 'white' : '#475569',
                        border: dynamicRoleTitle === tag ? '1px solid var(--ios-olive)' : '1px solid #cbd5e1',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              );
            })()}

            {/* Role Responsibilities & Requirements Banner */}
            {activeRoleSpec && (
              <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '0.85rem 1rem', marginBottom: '1.1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.45rem', flexWrap: 'wrap', gap: '0.4rem' }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <Briefcase size={14} color="var(--ios-olive)" /> Domain Scope: {activeRoleSpec.role}
                  </span>
                  {activeRoleSpec.recommendedLicences?.length > 0 && (
                    <span style={{ fontSize: '0.72rem', color: '#475569', background: '#f1f5f9', padding: '0.15rem 0.5rem', borderRadius: '6px', fontWeight: 600 }}>
                      Recommended: {activeRoleSpec.recommendedLicences.join(', ')}
                    </span>
                  )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '0.75rem', fontSize: '0.78rem' }}>
                  {activeRoleSpec.responsibilities?.length > 0 && (
                    <div>
                      <strong style={{ color: '#334155', display: 'block', marginBottom: '0.2rem', fontSize: '0.72rem', textTransform: 'uppercase' }}>Key Responsibilities:</strong>
                      <ul style={{ margin: 0, paddingLeft: '1.1rem', color: '#475569', lineHeight: 1.35 }}>
                        {activeRoleSpec.responsibilities.slice(0, 2).map((r, i) => (
                          <li key={i}>{r}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {activeRoleSpec.requirements?.length > 0 && (
                    <div>
                      <strong style={{ color: '#334155', display: 'block', marginBottom: '0.2rem', fontSize: '0.72rem', textTransform: 'uppercase' }}>Military / Trade Requirements:</strong>
                      <ul style={{ margin: 0, paddingLeft: '1.1rem', color: '#475569', lineHeight: 1.35 }}>
                        {activeRoleSpec.requirements.slice(0, 2).map((req, i) => (
                          <li key={i}>{req}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Capability Toggle Matrix */}
            {(() => {
              const secKey = resolveSectorKey(dynamicSector) || 'it_telecom';
              const cfg = SECTOR_CONFIG[secKey] || SECTOR_CONFIG.it_telecom;
              const capabilitiesList = showAllCaps ? ALL_CAPABILITIES_LIST : cfg.capabilities;

              return (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <div>
                      <span style={{ fontSize: '0.78rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#1e293b' }}>
                        Target Military Competencies & Capabilities ({dynamicCapabilities.length} selected):
                      </span>
                      <span style={{ display: 'block', fontSize: '0.72rem', color: '#64748b', fontWeight: 600, marginTop: '2px' }}>
                        {showAllCaps ? 'Showing all military capability areas across services' : `Curated specifically for ${cfg.sectorLabel} domain`}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <button
                        type="button"
                        onClick={handleResetSectorDefaults}
                        style={{ background: 'none', border: 'none', color: 'var(--ios-olive)', fontSize: '0.76rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                      >
                        <RotateCcw size={12} /> Reset to Sector Defaults
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowAllCaps(prev => !prev)}
                        style={{
                          background: showAllCaps ? '#e2e8f0' : 'white',
                          border: '1px solid #cbd5e1',
                          borderRadius: '8px',
                          padding: '0.25rem 0.6rem',
                          color: '#334155',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        {showAllCaps ? 'Show Sector Curated Only' : 'Show All Military Capabilities'}
                      </button>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.45rem', flexWrap: 'wrap' }}>
                    {capabilitiesList.map(cap => {
                      const isSelected = dynamicCapabilities.includes(cap.id);
                      return (
                        <button
                          key={cap.id}
                          type="button"
                          onClick={() => toggleCapability(cap.id)}
                          style={{
                            padding: '0.42rem 0.75rem',
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
              );
            })()}
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
