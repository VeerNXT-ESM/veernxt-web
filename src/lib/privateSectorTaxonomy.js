// Private Sector module — sector, role, skill, and tags taxonomy shared between
// the employer requirement wizard (PostJobRequirement.jsx), employer onboarding (EmployerOnboarding.jsx),
// candidate profile journey (PrivateSectorProfile.jsx), candidate opportunities feed (PrivateSectorOpportunities.jsx),
// and the admin HR console (AdminPrivateSector.jsx).
//
// job_class is an internal-only property of the ROLE, used for admin HR reporting only.
// It is never rendered directly in candidate- or employer-facing UI.

export const SECTOR_TAXONOMY = [
  {
    id: 'it_telecom',
    label: 'IT, Software & Telecom',
    description: 'IT support, networking, cyber security, systems administration, telecom and software',
    roles: [
      { role: 'IT Support & Desktop Engineer', jobClass: 'blue_collar' },
      { role: 'Network Administrator / Engineer', jobClass: 'black_collar' },
      { role: 'Cyber Security Analyst / SOC', jobClass: 'black_collar' },
      { role: 'Telecom / RF Technician', jobClass: 'blue_collar' },
      { role: 'System / Linux Administrator', jobClass: 'black_collar' },
      { role: 'Software / Web Developer', jobClass: 'black_collar' },
      { role: 'Data Entry & MIS Executive', jobClass: 'blue_collar' },
      { role: 'Cloud & DevOps Specialist', jobClass: 'black_collar' },
      { role: 'Other IT Role', jobClass: null },
    ],
    tags: [
      'Networking', 'Desktop Support', 'Cybersecurity', 'Linux', 'Windows Server',
      'Cisco CCNA', 'Cloud/AWS', 'Python', 'MIS & Excel', 'Telecom & RF',
      'Hardware Maintenance', 'Helpdesk', 'Immediate Joiner', 'Day Shift', 'Night Shift'
    ],
    skills: [
      'Network Troubleshooting', 'Hardware Maintenance', 'Cyber Security / SOC',
      'Linux / Unix Administration', 'Telecom Comms Protocol', 'Database Management',
      'Helpdesk Management', 'Customer Technical Support'
    ],
  },
  {
    id: 'security_defence',
    label: 'Security, Defence & Surveillance',
    description: 'Physical security, VIP protection, CCTV surveillance, safety, vigilance and defence tech',
    roles: [
      { role: 'Chief Security Officer', jobClass: 'black_collar' },
      { role: 'Security Supervisor', jobClass: 'black_collar' },
      { role: 'Security Personnel', jobClass: 'blue_collar' },
      { role: 'Armed Guard / PSO (Personal Security)', jobClass: 'blue_collar' },
      { role: 'CCTV & Control Room Operator', jobClass: 'blue_collar' },
      { role: 'Surveillance Lead', jobClass: 'black_collar' },
      { role: 'Fire & Industrial Safety Officer', jobClass: 'black_collar' },
      { role: 'Loss Prevention / Vigilance Executive', jobClass: 'black_collar' },
      { role: 'Defence Tech / Armament Specialist', jobClass: 'black_collar' },
      { role: 'Other Security Role', jobClass: null },
    ],
    tags: [
      'PSARA Certified', 'Armed Escort / PSO', 'CCTV Monitoring', 'Fire Safety',
      'VIP Protection', 'Crisis Management', 'Access Control', 'Vigilance & Audit',
      'Ex-Army', 'Ex-Navy', 'Ex-Airforce', 'Immediate Joiner', 'Day Shift', 'Night Shift'
    ],
    skills: [
      'Physical Security', 'CCTV & Surveillance', 'Fire Safety', 'First Aid',
      'Crisis Management', 'Access Control Systems', 'VIP Escort & Protocol', 'Vigilance Auditing'
    ],
  },
  {
    id: 'logistics_transport',
    label: 'Logistics, Supply Chain & Transport',
    description: 'Commercial driving, fleet supervision, warehouse, inventory and dispatch management',
    roles: [
      { role: 'Warehouse Manager', jobClass: 'black_collar' },
      { role: 'Fleet Supervisor', jobClass: 'black_collar' },
      { role: 'Warehouse Supervisor', jobClass: 'black_collar' },
      { role: 'Logistics & Dispatch Coordinator', jobClass: 'black_collar' },
      { role: 'Inventory Controller / Storekeeper', jobClass: 'blue_collar' },
      { role: 'Driver', jobClass: 'blue_collar' },
      { role: 'Forklift & Equipment Operator', jobClass: 'blue_collar' },
      { role: 'Delivery Personnel', jobClass: 'blue_collar' },
      { role: 'Other Logistics Role', jobClass: null },
    ],
    tags: [
      'HMV License', 'LMV License', 'Forklift Certified', 'Fleet Management (GPS)',
      'Warehouse ERP', 'Dispatch Operations', 'Cold Storage', 'Route Planning',
      'Heavy Machinery', 'Immediate Joiner', 'Day Shift', 'Night Shift'
    ],
    skills: [
      'Driving (LMV)', 'Driving (HMV)', 'Fleet Supervision', 'Warehouse/Inventory Management',
      'Forklift Operation', 'Logistics Coordination', 'Dispatch Protocol', 'Route Optimization'
    ],
  },
  {
    id: 'engineering_manufacturing',
    label: 'Engineering, Technical & Manufacturing',
    description: 'Mechanical, electrical, fabrication, machine operation, QA/QC and plant maintenance',
    roles: [
      { role: 'Maintenance Engineer / Supervisor', jobClass: 'black_collar' },
      { role: 'Plant Operations Supervisor', jobClass: 'black_collar' },
      { role: 'QA/QC Inspector', jobClass: 'black_collar' },
      { role: 'Electrical Technician / Electrician', jobClass: 'blue_collar' },
      { role: 'Mechanic', jobClass: 'blue_collar' },
      { role: 'Technician', jobClass: 'blue_collar' },
      { role: 'Machine Operator', jobClass: 'blue_collar' },
      { role: 'Welder / Fabricator', jobClass: 'blue_collar' },
      { role: 'Other Technical Role', jobClass: null },
    ],
    tags: [
      'Electrical Wiring', 'Welding / Fabrication', 'CNC / Lathe Operation', 'Preventive Maintenance',
      'Hydraulics & Pneumatics', 'HVAC Systems', 'Quality Inspection', 'Industrial Safety',
      'Immediate Joiner', 'Day Shift', 'Night Shift'
    ],
    skills: [
      'Vehicle Maintenance', 'Electrical Work', 'Plumbing', 'Welding',
      'Machine Maintenance', 'Hydraulics & Pneumatics', 'Quality Assurance', 'Tool Calibration'
    ],
  },
  {
    id: 'admin_facilities',
    label: 'Administration, Operations & Facility Management',
    description: 'Facility operations, site supervision, office administration, procurement and coordination',
    roles: [
      { role: 'Facility Operations Manager', jobClass: 'black_collar' },
      { role: 'Operations Supervisor', jobClass: 'black_collar' },
      { role: 'Site Manager', jobClass: 'black_collar' },
      { role: 'Facility Supervisor', jobClass: 'black_collar' },
      { role: 'Administrative Officer / Clerk', jobClass: 'black_collar' },
      { role: 'Procurement & Vendor Executive', jobClass: 'black_collar' },
      { role: 'Facility Staff', jobClass: 'blue_collar' },
      { role: 'Field Staff', jobClass: 'blue_collar' },
      { role: 'Other Admin Role', jobClass: null },
    ],
    tags: [
      'Facility Maintenance', 'Office Administration', 'Vendor Management', 'Team Leadership',
      'MS Office / Excel', 'Site Supervision', 'Billing & Compliance', 'Immediate Joiner'
    ],
    skills: [
      'Team Supervision', 'Facility Staff Management', 'Vendor Coordination',
      'Inventory Control', 'Office Administration', 'Report Generation', 'Budget Tracking'
    ],
  },
  {
    id: 'aviation_marine',
    label: 'Aviation, Aerospace & Marine',
    description: 'Aircraft maintenance, airfield safety, ground handling, avionics and marine operations',
    roles: [
      { role: 'Aircraft Maintenance Technician', jobClass: 'black_collar' },
      { role: 'Ground Handling & Ramp Personnel', jobClass: 'blue_collar' },
      { role: 'Airfield Safety & Marshal Officer', jobClass: 'black_collar' },
      { role: 'Avionics & Radar Technician', jobClass: 'black_collar' },
      { role: 'Marine / Vessel Operations Specialist', jobClass: 'black_collar' },
      { role: 'Other Aviation Role', jobClass: null },
    ],
    tags: [
      'Aviation Safety', 'DGCA Aware', 'Ground Handling', 'Radar & Comms',
      'Marine Vessel Maint', 'Flight Line Protocol', 'Ex-Airforce', 'Ex-Navy', 'Immediate Joiner'
    ],
    skills: [
      'Aviation Ground Operations', 'Radar Diagnostics', 'Avionics Maintenance',
      'Marine Vessel Protocol', 'Airfield Safety Standards'
    ],
  },
  {
    id: 'healthcare_hospitality',
    label: 'Healthcare, Emergency & Hospitality',
    description: 'Paramedic support, emergency disaster response, hospitality, catering and mess operations',
    roles: [
      { role: 'Paramedic / Emergency Medical Assistant', jobClass: 'blue_collar' },
      { role: 'First Aid & Disaster Response Specialist', jobClass: 'black_collar' },
      { role: 'Hospitality / Mess Supervisor', jobClass: 'black_collar' },
      { role: 'Food & Facility Operations Staff', jobClass: 'blue_collar' },
      { role: 'Other Healthcare / Hospitality Role', jobClass: null },
    ],
    tags: [
      'First Aid Certified', 'BLS / CPR', 'Disaster Response', 'Mess Supervision',
      'Food Hygiene', 'Hospitality Ops', 'Immediate Joiner'
    ],
    skills: [
      'First Aid', 'Emergency Triage', 'Kitchen & Mess Supervision',
      'Health & Sanitation Compliance', 'Patient Handling'
    ],
  },
  {
    id: 'corporate_sales',
    label: 'Corporate, HR, Sales & Field Services',
    description: 'Human resources, business development, field operations, customer relations and accounts',
    roles: [
      { role: 'HR & Veteran Talent Recruiter', jobClass: 'black_collar' },
      { role: 'Field Operations Executive', jobClass: 'blue_collar' },
      { role: 'Business Development / Sales Executive', jobClass: 'black_collar' },
      { role: 'Customer Service & Relations Executive', jobClass: 'blue_collar' },
      { role: 'Accounts & Billing Assistant', jobClass: 'black_collar' },
      { role: 'Other Corporate Role', jobClass: null },
    ],
    tags: [
      'Veteran Recruitment', 'Field Operations', 'B2B Sales', 'Client Communication',
      'Tally / Accounting', 'Customer Relationship', 'Immediate Joiner'
    ],
    skills: [
      'Customer Service', 'Team Supervision', 'Communication', 'Client Handling',
      'Recruitment & Onboarding', 'Field Coordination'
    ],
  },
];

// Unified list of all roles across all sectors (and legacy fallbacks)
const roleTaxonomyMap = new Map();
SECTOR_TAXONOMY.forEach((sector) => {
  sector.roles.forEach((r) => {
    if (!roleTaxonomyMap.has(r.role)) {
      roleTaxonomyMap.set(r.role, { role: r.role, jobClass: r.jobClass, sector: sector.label });
    }
  });
});
// Fallback for generic 'Other'
if (!roleTaxonomyMap.has('Other')) {
  roleTaxonomyMap.set('Other', { role: 'Other', jobClass: null, sector: 'Other' });
}

export const ROLE_TAXONOMY = Array.from(roleTaxonomyMap.values());
export const ROLE_OPTIONS = ROLE_TAXONOMY.map((r) => r.role);

export const SECTOR_OPTIONS = SECTOR_TAXONOMY.map((s) => s.label);

const ROLE_TO_JOB_CLASS = Object.fromEntries(ROLE_TAXONOMY.map((r) => [r.role, r.jobClass]));

// Helper to look up job class for admin console
export function getJobClass(roleTitle) {
  return ROLE_TO_JOB_CLASS[roleTitle] || null;
}

// Admin helper: summarizes job classes present in a role list
export function summarizeJobClasses(roleTitles = []) {
  const classes = new Set(roleTitles.map(getJobClass).filter(Boolean));
  return [...classes];
}

// Find sector object by label or id (supports exact match and alias keywords)
export function findSector(sectorLabelOrId) {
  if (!sectorLabelOrId) return null;
  const s = String(sectorLabelOrId).trim().toLowerCase();
  
  // 1. Direct ID or Label match
  const direct = SECTOR_TAXONOMY.find((sec) => sec.id.toLowerCase() === s || sec.label.toLowerCase() === s);
  if (direct) return direct;

  // 2. Keyword / Alias match
  if (s.includes('security') || s.includes('surveillance') || s.includes('defence')) {
    return SECTOR_TAXONOMY.find(x => x.id === 'security_defence');
  }
  if (s.includes('logistic') || s.includes('transport') || s.includes('supply chain') || s.includes('fleet') || s.includes('warehouse')) {
    return SECTOR_TAXONOMY.find(x => x.id === 'logistics_transport');
  }
  if (s.includes('engineer') || s.includes('manufacturing') || s.includes('plant') || s.includes('machinery')) {
    return SECTOR_TAXONOMY.find(x => x.id === 'engineering_manufacturing');
  }
  if (s.includes('it') || s.includes('telecom') || s.includes('software') || s.includes('network')) {
    return SECTOR_TAXONOMY.find(x => x.id === 'it_telecom');
  }
  if (s.includes('facility') || s.includes('admin') || s.includes('operations')) {
    return SECTOR_TAXONOMY.find(x => x.id === 'admin_facilities');
  }
  if (s.includes('aviation') || s.includes('marine') || s.includes('aerospace') || s.includes('drone')) {
    return SECTOR_TAXONOMY.find(x => x.id === 'aviation_marine');
  }
  if (s.includes('health') || s.includes('hospitality') || s.includes('paramedic') || s.includes('disaster') || s.includes('emergency')) {
    return SECTOR_TAXONOMY.find(x => x.id === 'healthcare_hospitality');
  }
  if (s.includes('corporate') || s.includes('hr') || s.includes('sales') || s.includes('recruiter')) {
    return SECTOR_TAXONOMY.find(x => x.id === 'corporate_sales');
  }

  return null;
}

// Get roles specifically for one sector
export function getRolesForSector(sectorLabelOrId) {
  const sec = findSector(sectorLabelOrId);
  if (!sec) return [];
  return sec.roles.map((r) => r.role);
}

// Get roles for multiple sectors (or all if empty)
export function getRolesForSectors(sectors = []) {
  if (!sectors || sectors.length === 0) return ROLE_OPTIONS;
  const rolesSet = new Set();
  sectors.forEach((secName) => {
    const rList = getRolesForSector(secName);
    rList.forEach((r) => rolesSet.add(r));
  });
  if (rolesSet.size === 0) return ROLE_OPTIONS;
  rolesSet.add('Other');
  return Array.from(rolesSet);
}

// Get curated tags for one sector
export function getTagsForSector(sectorLabelOrId) {
  const sec = findSector(sectorLabelOrId);
  if (!sec) return [];
  return sec.tags || [];
}

// Get curated tags for multiple sectors
export function getTagsForSectors(sectors = []) {
  if (!sectors || sectors.length === 0) {
    const allTags = new Set();
    SECTOR_TAXONOMY.forEach((s) => s.tags.forEach((t) => allTags.add(t)));
    return Array.from(allTags);
  }
  const tagsSet = new Set();
  sectors.forEach((secName) => {
    const tList = getTagsForSector(secName);
    tList.forEach((t) => tagsSet.add(t));
  });
  return Array.from(tagsSet);
}

// Get suggested skills for given sectors
export function getSkillsForSectors(sectors = []) {
  if (!sectors || sectors.length === 0) return SKILL_OPTIONS;
  const skillsSet = new Set();
  sectors.forEach((secName) => {
    const sec = findSector(secName);
    if (sec && sec.skills) {
      sec.skills.forEach((sk) => skillsSet.add(sk));
    }
  });
  if (skillsSet.size === 0) return SKILL_OPTIONS;
  skillsSet.add('Other');
  return Array.from(skillsSet);
}

// Common global skills list
export const SKILL_OPTIONS = [
  'Network Troubleshooting', 'Hardware Maintenance', 'Cyber Security / SOC', 'Physical Security',
  'CCTV & Surveillance', 'Fire Safety', 'First Aid', 'Driving (LMV)', 'Driving (HMV)',
  'Vehicle Maintenance', 'Electrical Work', 'Welding', 'Warehouse/Inventory Management',
  'Forklift Operation', 'Team Supervision', 'Logistics Coordination', 'Customer Service', 'Other',
];

export const AVAILABILITY_OPTIONS = [
  'Immediately', 'Within 15 days', 'Within 30 days', 'Notice period (specify below)',
];

export const LICENCE_OPTIONS = [
  'Driving Licence — LMV', 'Driving Licence — HMV', 'Heavy Equipment Operator Licence',
  'Security Guard Licence (PSARA)', 'Fire Safety Certification', 'First Aid Certification',
  'Cisco / Networking Certification', 'Electrical Wireman License', 'Other',
];

// Comprehensive mapping from Roles to Responsibilities, Requirements, and Military Capabilities
export const ROLE_SPECIFICATIONS = {
  // Security, Defence & Surveillance
  'Chief Security Officer': {
    sectorId: 'security_defence',
    sector: 'Security, Defence & Surveillance',
    responsibilities: [
      'Formulate organization-wide physical security, surveillance, and loss prevention strategy',
      'Oversee multi-site guard force deployment, perimeter defence, and electronic access systems',
      'Establish incident containment, disaster recovery, and crisis evacuation procedures',
      'Direct liaison with local law enforcement, civil authorities, and regulatory bodies'
    ],
    requirements: [
      '15+ years active military / defence service (Subedar / Major / Warrant Officer or higher)',
      'Proven command experience directing 50+ armed/unarmed security personnel',
      'Deep expertise in PSARA statutory norms, risk auditing, and threat vulnerability assessments',
      'Exemplary military service record with flawless conduct documentation'
    ],
    capabilities: ['wt_guard', 'wt_command', 'wt_intel', 'wt_weapon'],
    defaultMinSupervised: 25,
    recommendedLicences: ['Security Guard Licence (PSARA)', 'Fire Safety Certification', 'First Aid Certification']
  },
  'Security Supervisor': {
    sectorId: 'security_defence',
    sector: 'Security, Defence & Surveillance',
    responsibilities: [
      'Supervise shift-wise security sentry postings, perimeter patrols, and gate pass enforcement',
      'Conduct random access audits, vehicle undercarriage checks, and baggage scanner monitoring',
      'Lead quick reaction response during emergency alarms, intrusions, or medical distress',
      'Maintain daily shift turnover logs, incident registers, and guard attendance files'
    ],
    requirements: [
      '5+ years military / paramilitary service (Havildar / JCO / NCO or equivalent)',
      'Verified experience managing guard squads, sentries, or security platoons',
      'Practical knowledge of CCTV consoles, fire alarm panels, and access turnstiles'
    ],
    capabilities: ['wt_guard', 'wt_command', 'wt_intel'],
    defaultMinSupervised: 8,
    recommendedLicences: ['Security Guard Licence (PSARA)', 'First Aid Certification']
  },
  'Armed Guard / PSO (Personal Security)': {
    sectorId: 'security_defence',
    sector: 'Security, Defence & Surveillance',
    responsibilities: [
      'Provide close personal protection (PSO) escort for designated executives or dignitaries',
      'Maintain round-the-clock weapon readiness adhering to civilian firearm safety statutes',
      'Execute tactical convoy escort, route reconnaissance, and counter-surveillance checks'
    ],
    requirements: [
      'Ex-serviceman with verified small arms proficiency and combat weapon qualification',
      'Valid civilian arms licence or eligible for private security armed endorsement',
      'High situational awareness, physical fitness, and unarmed combat background'
    ],
    capabilities: ['wt_weapon', 'wt_guard', 'wt_driver'],
    defaultMinSupervised: 0,
    recommendedLicences: ['Arms Licence / Endorsement', 'Driving Licence — LMV', 'Security Guard Licence (PSARA)']
  },
  'CCTV & Control Room Operator': {
    sectorId: 'security_defence',
    sector: 'Security, Defence & Surveillance',
    responsibilities: [
      'Monitor multi-screen CCTV surveillance feeds, video management systems, and thermal cameras',
      'Dispatch quick reaction teams (QRT) or site patrol units upon detecting perimeter breaches',
      'Archive footage for security investigations and maintain digital incident registers'
    ],
    requirements: [
      'Military signals, radar, or air defense surveillance tracking background',
      'Experience operating electronic control room consoles and two-way radio dispatch nets'
    ],
    capabilities: ['wt_guard', 'wt_comms', 'wt_intel'],
    defaultMinSupervised: 0,
    recommendedLicences: ['Security Guard Licence (PSARA)', 'CCTV Monitoring & Control Room Certification']
  },
  'Surveillance Lead': {
    sectorId: 'security_defence',
    sector: 'Security, Defence & Surveillance',
    responsibilities: [
      'Direct central control room operations, CCTV uptime, and access telemetry monitoring',
      'Audit surveillance coverage, eliminate blind spots, and coordinate camera maintenance',
      'Conduct forensic video analysis for accident investigations or theft reports'
    ],
    requirements: [
      'Senior signals / surveillance operator or military police investigation background',
      'Supervisory experience leading control room shifts and communications networks'
    ],
    capabilities: ['wt_guard', 'wt_comms', 'wt_intel', 'wt_command'],
    defaultMinSupervised: 5,
    recommendedLicences: ['Security Guard Licence (PSARA)', 'CCTV & VMS Specialist Certification']
  },
  'Fire & Industrial Safety Officer': {
    sectorId: 'security_defence',
    sector: 'Security, Defence & Surveillance',
    responsibilities: [
      'Conduct regular plant fire safety audits, hydrant checks, and hazard risk assessments',
      'Lead industrial emergency response teams during chemical, gas, or electrical fires',
      'Conduct hands-on fire drill trainings, extinguisher drills, and evacuation simulations'
    ],
    requirements: [
      'Military fire fighting, damage control, or combat engineer / EOD background',
      'Certified knowledge of factory safety standards, NBC norms, and OSHA guidelines',
      'Hands-on experience conducting industrial evacuation drills and first-aid response'
    ],
    capabilities: ['wt_eod', 'wt_medic', 'wt_command'],
    defaultMinSupervised: 5,
    recommendedLicences: ['Fire Safety Certification', 'First Aid Certification']
  },
  'Loss Prevention / Vigilance Executive': {
    sectorId: 'security_defence',
    sector: 'Security, Defence & Surveillance',
    responsibilities: [
      'Conduct internal loss prevention audits, inventory shrinkage checks, and fraud reviews',
      'Perform background vetting of high-risk contractors, supply handlers, and drivers',
      'Prepare confidential inquiry reports and suggest vulnerability mitigation protocols'
    ],
    requirements: [
      'Corps of Military Police (CMP), Intelligence Corps, or Provost service record',
      'Demonstrated investigative acumen, evidence gathering, and formal interview skills',
      'Unblemished military conduct record with high ethical standards'
    ],
    capabilities: ['wt_intel', 'wt_guard', 'wt_admin'],
    defaultMinSupervised: 2,
    recommendedLicences: ['Security Guard Licence (PSARA)', 'Vigilance & Risk Investigation Certification']
  },
  'Security Personnel': {
    sectorId: 'security_defence',
    sector: 'Security, Defence & Surveillance',
    responsibilities: [
      'Manning static sentry posts, main gates, turnstiles, and vehicle check-posts',
      'Conducting visitor identity checks, badge issuance, and vehicle register entries',
      'Executing regular perimeter foot patrols and boundary wall integrity checks'
    ],
    requirements: [
      'Honourable military or paramilitary discharge with physical security experience',
      'Disciplined, alert demeanor with verified police clearance and clear discharge book'
    ],
    capabilities: ['wt_guard'],
    defaultMinSupervised: 0,
    recommendedLicences: ['Security Guard Licence (PSARA)']
  },

  // Logistics, Supply Chain & Transport
  'Warehouse Manager': {
    sectorId: 'logistics_transport',
    sector: 'Logistics, Supply Chain & Transport',
    responsibilities: [
      'Direct overall warehouse storage layout, rack safety, dock throughput, and inventory accuracy',
      'Manage inbound goods receipt, pallet staging, cross-docking, and dispatch lines',
      'Lead warehouse staff, forklift operators, and dock supervisors across multiple shifts',
      'Enforce FIFO/LIFO rules, cycle count audits, and ERP warehouse management reconciliation'
    ],
    requirements: [
      '8+ years in military supply depots (AOC / ASC / Air Force Stores / Naval Victualling)',
      'Working knowledge of ERP warehouse systems (SAP/WMS/TDS) and barcode/RFID logging',
      'Supervised 15+ personnel in high-volume depot, POL, or technical spare parts storage'
    ],
    capabilities: ['wt_store', 'wt_facility', 'wt_command'],
    defaultMinSupervised: 12,
    recommendedLicences: ['Warehouse & Supply Chain Certification', 'Heavy Equipment Operator Licence']
  },
  'Fleet Supervisor': {
    sectorId: 'logistics_transport',
    sector: 'Logistics, Supply Chain & Transport',
    responsibilities: [
      'Manage commercial fleet dispatch, route scheduling, GPS tracking, and driver rosters',
      'Enforce preventative maintenance schedules, tyre health, fitness tests, and fuel logs',
      'Conduct driver safety briefings, turn-around time (TAT) monitoring, and breakdown recovery'
    ],
    requirements: [
      'Army ASC MT, Air Force MT, or Naval Transport transport supervisor background',
      'Extensive experience managing commercial or military multi-axle vehicle convoys',
      'Strong command of vehicle diagnostics, logbooks, and fleet telematics'
    ],
    capabilities: ['wt_driver', 'wt_command', 'wt_maint'],
    defaultMinSupervised: 8,
    recommendedLicences: ['Driving Licence — HMV', 'Fleet Management & Telematics Certification']
  },
  'Warehouse Supervisor': {
    sectorId: 'logistics_transport',
    sector: 'Logistics, Supply Chain & Transport',
    responsibilities: [
      'Supervise floor inventory picking, packing, staging, and truck loading operations',
      'Ensure bin card accuracy, tally sheet matching, and damaged stock segregation',
      'Monitor shift staff safety, material handling plant usage, and dispatch turnaround'
    ],
    requirements: [
      'Military depot storekeeper, ammunition/ration depot NCO, or supply platoon lead',
      'Direct experience supervising warehouse floor labor and material movements'
    ],
    capabilities: ['wt_store', 'wt_command', 'wt_facility'],
    defaultMinSupervised: 6,
    recommendedLicences: ['Storekeeping & Warehouse Operations Certificate']
  },
  'Logistics & Dispatch Coordinator': {
    sectorId: 'logistics_transport',
    sector: 'Logistics, Supply Chain & Transport',
    responsibilities: [
      'Coordinate freight movement orders, e-way bills, dock booking, and consignment transit',
      'Liaise with transport carriers, drivers, and consignees for on-time delivery tracking',
      'Resolve en-route vehicle transit bottlenecks, route diversions, or document discrepancies'
    ],
    requirements: [
      'Military movement control (MCO / ASC / AOC) or dispatch logistics background',
      'Familiarity with transport logistics documentation, ERP shipments, and carrier tracking'
    ],
    capabilities: ['wt_store', 'wt_admin', 'wt_command'],
    defaultMinSupervised: 3,
    recommendedLicences: ['Logistics / Supply Chain Certification']
  },
  'Inventory Controller / Storekeeper': {
    sectorId: 'logistics_transport',
    sector: 'Logistics, Supply Chain & Transport',
    responsibilities: [
      'Receive, verify, label, and shelve raw materials, components, or finished goods',
      'Maintain inventory ledgers, bin cards, and computerized stock databases',
      'Conduct weekly/monthly stock reconciliations and report shortages or expiry dates'
    ],
    requirements: [
      'Military storekeeper, technical spare parts custodian, or ammunition/ration store in-charge',
      'High accuracy in stock documentation, physical verification, and ledger maintenance'
    ],
    capabilities: ['wt_store', 'wt_admin'],
    defaultMinSupervised: 0,
    recommendedLicences: ['Storekeeping & Inventory Management Certification']
  },
  'Driver': {
    sectorId: 'logistics_transport',
    sector: 'Logistics, Supply Chain & Transport',
    responsibilities: [
      'Operate heavy commercial vehicles, multi-axle trucks, or delivery vans safely',
      'Perform daily pre-trip mechanical checks (oil, coolant, tyres, air brakes, winches)',
      'Ensure safe, timely cargo delivery adhering to speed restrictions and transit route maps'
    ],
    requirements: [
      'Valid Commercial HMV or LMV licence with clean accident-free military driving history',
      'Trained in defensive driving, convoy protocols, night operations, and extreme terrain'
    ],
    capabilities: ['wt_driver'],
    defaultMinSupervised: 0,
    recommendedLicences: ['Driving Licence — HMV', 'Driving Licence — LMV']
  },
  'Forklift & Equipment Operator': {
    sectorId: 'logistics_transport',
    sector: 'Logistics, Supply Chain & Transport',
    responsibilities: [
      'Operate reach trucks, counterbalance forklifts, and battery pallet trucks safely',
      'Stack and retrieve palletized cargo from high-bay racking systems and dock containers',
      'Execute daily equipment checks including battery charging and hydraulic leak inspections'
    ],
    requirements: [
      'Valid Heavy Equipment / Forklift operator certification or military MHE qualification',
      'Demonstrated precision operating in narrow aisles and high-turnover dock bays'
    ],
    capabilities: ['wt_armour', 'wt_driver'],
    defaultMinSupervised: 0,
    recommendedLicences: ['Heavy Equipment Operator Licence']
  },

  // Engineering, Technical & Manufacturing
  'Maintenance Engineer / Supervisor': {
    sectorId: 'engineering_manufacturing',
    sector: 'Engineering, Technical & Manufacturing',
    responsibilities: [
      'Plan and execute plant preventative maintenance for mechanical and electrical machinery',
      'Troubleshoot and overhaul hydraulic systems, compressors, pumps, motors, and transmissions',
      'Manage maintenance technician shift rosters, spare parts inventory, and workplace safety'
    ],
    requirements: [
      'Corps of EME, Navy Marine/Electrical Engineering, or Air Force Technical trade background',
      '10+ years electro-mechanical maintenance and diagnostics experience (Artificer / Tech NCO)',
      'Strong leadership managing technician crews in high-uptime plant environments'
    ],
    capabilities: ['wt_maint', 'wt_engineer', 'wt_command'],
    defaultMinSupervised: 10,
    recommendedLicences: ['Electrical Wireman License', 'Industrial Maintenance Certification']
  },
  'Plant Operations Supervisor': {
    sectorId: 'engineering_manufacturing',
    sector: 'Engineering, Technical & Manufacturing',
    responsibilities: [
      'Supervise production floor machine throughput, shift changeovers, and target metrics',
      'Enforce standard operating procedures (SOP), 5S workplace organisation, and PPE adherence',
      'Resolve machine stoppages, line balancing issues, and coordinate with maintenance'
    ],
    requirements: [
      'Military base repair workshop, technical depot, or naval dockyard production in-charge',
      'Demonstrated leadership in multi-shift manufacturing, assembly, or overhaul lines'
    ],
    capabilities: ['wt_maint', 'wt_command', 'wt_facility'],
    defaultMinSupervised: 12,
    recommendedLicences: ['Industrial Safety Certification', '5S / Lean Manufacturing Certification']
  },
  'QA/QC Inspector': {
    sectorId: 'engineering_manufacturing',
    sector: 'Engineering, Technical & Manufacturing',
    responsibilities: [
      'Perform dimensional, metallurgical, and visual quality inspections on components',
      'Operate precision measuring tools (vernier calipers, micrometers, height gauges, NDT probes)',
      'Generate inspection reports, quarantine non-conforming items, and maintain ISO standards'
    ],
    requirements: [
      'Military technical quality inspection, metrology, or aviation/naval refit trial background',
      'Expertise reading engineering drawings, tolerances, and quality compliance sign-offs'
    ],
    capabilities: ['wt_maint', 'wt_survey'],
    defaultMinSupervised: 2,
    recommendedLicences: ['Non-Destructive Testing (NDT) Level I/II', 'ISO Quality Auditor Certification']
  },
  'Electrical Technician / Electrician': {
    sectorId: 'engineering_manufacturing',
    sector: 'Engineering, Technical & Manufacturing',
    responsibilities: [
      'Install, test, and repair high/low voltage electrical switchboards, transformers, and DG sets',
      'Troubleshoot industrial motor starters, PLC panels, wiring circuits, and earthing grids',
      'Carry out scheduled thermal imaging audits and statutory electrical safety checks'
    ],
    requirements: [
      'Military electrician / electrical artificer / MES electrical installer background',
      'Valid state electrical wireman or supervisor licence'
    ],
    capabilities: ['wt_engineer', 'wt_maint'],
    defaultMinSupervised: 0,
    recommendedLicences: ['Electrical Wireman License']
  },
  'Mechanic': {
    sectorId: 'engineering_manufacturing',
    sector: 'Engineering, Technical & Manufacturing',
    responsibilities: [
      'Perform engine overhauls, gearbox repairs, brake servicing, and suspension rebuilds',
      'Diagnose fuel injection, hydraulic pump, and pneumatic circuit faults',
      'Maintain workshop tools, dynamometer test benches, and service records'
    ],
    requirements: [
      'Army EME Vehicle Mechanic, Air Force Workshop Fitter, or Navy Engine Room Artificer',
      'Thorough expertise with diesel engines, transmission systems, and automotive mechanics'
    ],
    capabilities: ['wt_maint'],
    defaultMinSupervised: 0,
    recommendedLicences: ['Automotive Service Technician Certification']
  },
  'Technician': {
    sectorId: 'engineering_manufacturing',
    sector: 'Engineering, Technical & Manufacturing',
    responsibilities: [
      'Execute preventive maintenance routines on industrial plant equipment',
      'Replace worn components, bearings, seals, belts, and filters per manufacturer specs',
      'Log diagnostic readings, operating temperatures, and vibration analyses'
    ],
    requirements: [
      'Military technical tradesman with trade proficiency Class I or Class II',
      'Strong practical acumen with hand tools, power tools, and basic electrical circuits'
    ],
    capabilities: ['wt_maint'],
    defaultMinSupervised: 0,
    recommendedLicences: ['Technical ITI / Trade Certificate']
  },

  // Administration, Operations & Facility Management
  'Facility Operations Manager': {
    sectorId: 'admin_facilities',
    sector: 'Administration, Operations & Facility Management',
    responsibilities: [
      'Direct comprehensive facility operations across HVAC, power backup, plumbing, housekeeping, and security',
      'Manage vendor contracts, annual maintenance contracts (AMC), SLAs, and facility OPEX budgets',
      'Ensure building statutory compliances, fire NOCs, environmental safety, and energy audits',
      'Lead facility engineering teams and supervise multi-shift maintenance desk operations'
    ],
    requirements: [
      '10+ years military infrastructure administration (Corps of Engineers / MES / Air Force Works / Station Quartermaster)',
      'Substantial experience supervising large cantonment facilities, site infrastructure, or commercial complexes',
      'Proven team leadership managing 20+ technician, security, and housekeeping staff'
    ],
    capabilities: ['wt_facility', 'wt_command', 'wt_engineer'],
    defaultMinSupervised: 15,
    recommendedLicences: ['Facility Management Professional (FMP)', 'Fire Safety Certification']
  },
  'Facility Supervisor': {
    sectorId: 'admin_facilities',
    sector: 'Administration, Operations & Facility Management',
    responsibilities: [
      'Supervise day-to-day building upkeep, janitorial services, cafeteria, and utility operations',
      'Conduct daily site rounds, inspect MEP installations, and log maintenance tickets',
      'Coordinate with external repair technicians and ensure swift ticket turnaround'
    ],
    requirements: [
      'Military Quartermaster, MES superintendent, or barracks administration background',
      'Demonstrated capability supervising frontline facility crews and resolving site complaints'
    ],
    capabilities: ['wt_facility', 'wt_command'],
    defaultMinSupervised: 8,
    recommendedLicences: ['First Aid Certification', 'Fire Safety Certification']
  },
  'Operations Supervisor': {
    sectorId: 'admin_facilities',
    sector: 'Administration, Operations & Facility Management',
    responsibilities: [
      'Plan daily shift operations, duty rosters, resource allocation, and task execution',
      'Monitor Key Performance Indicators (KPIs), workflow bottlenecks, and process compliance',
      'Enforce discipline, punctuality, safety standards, and team morale across frontline staff'
    ],
    requirements: [
      'Military JCO / NCO with verified section, platoon, or detachment leadership experience',
      'Proven record managing 10 to 30 personnel under demanding operational conditions'
    ],
    capabilities: ['wt_command', 'wt_admin'],
    defaultMinSupervised: 10,
    recommendedLicences: ['Operations Management Certification']
  },
  'Site Manager': {
    sectorId: 'admin_facilities',
    sector: 'Administration, Operations & Facility Management',
    responsibilities: [
      'Exercise end-to-end operational authority over a designated site, branch, or field project',
      'Coordinate security, logistics, administration, contractor liaison, and local authority relations',
      'Deliver scheduled project milestones within allotted budget, time, and safety guidelines'
    ],
    requirements: [
      'Commissioned officer or Senior JCO (Subedar / Subedar Major / Master Warrant Officer)',
      'Independent site leadership, emergency response capability, and multi-agency coordination'
    ],
    capabilities: ['wt_command', 'wt_facility', 'wt_admin'],
    defaultMinSupervised: 20,
    recommendedLicences: ['Project Management Certification']
  },
  'Administrative Officer / Clerk': {
    sectorId: 'admin_facilities',
    sector: 'Administration, Operations & Facility Management',
    responsibilities: [
      'Manage office documentation, official correspondence, filing systems, and service records',
      'Process employee attendance, leave records, payroll inputs, and compliance registers',
      'Coordinate stationery procurement, travel bookings, and office equipment upkeep'
    ],
    requirements: [
      'Army Clerk SD/GD, Naval Writer, or Air Force Administration airman background',
      'Strong proficiency in MS Office (Word, Excel), official drafting, and meticulous record-keeping'
    ],
    capabilities: ['wt_admin'],
    defaultMinSupervised: 0,
    recommendedLicences: ['MS Office / Computer Applications Certification']
  },

  // IT, Software & Telecom
  'Network Administrator / Engineer': {
    sectorId: 'it_telecom',
    sector: 'IT, Software & Telecom',
    responsibilities: [
      'Configure, monitor, and maintain enterprise switches, routers, firewalls, and VPN tunnels',
      'Diagnose LAN/WAN latency, packet drop, IP address allocations, and link redundancy',
      'Execute network firmware patches, backup configurations, and vulnerability assessments'
    ],
    requirements: [
      'Corps of Signals, Naval Comms, or Air Force Signals background with networking credentials',
      'Proficiency in Cisco / Juniper CLI, routing protocols (OSPF, BGP), VLANs, and cabling standards'
    ],
    capabilities: ['wt_comms'],
    defaultMinSupervised: 2,
    recommendedLicences: ['Cisco / Networking Certification (CCNA)']
  },
  'Cyber Security Analyst / SOC': {
    sectorId: 'it_telecom',
    sector: 'IT, Software & Telecom',
    responsibilities: [
      'Monitor Security Operations Center (SOC) dashboards, SIEM alerts, and suspicious telemetry',
      'Triage and contain security incidents, unauthorized access attempts, and malware infections',
      'Perform periodic vulnerability scans, access policy audits, and incident reporting'
    ],
    requirements: [
      'Military cyber cell, electronic warfare, or signal intelligence (SIGINT/Cipher) background',
      'Understanding of network security protocols, firewall rules, and security incident response'
    ],
    capabilities: ['wt_comms', 'wt_intel'],
    defaultMinSupervised: 0,
    recommendedLicences: ['CompTIA Security+ / CEH / CCNA Security']
  },
  'Telecom / RF Technician': {
    sectorId: 'it_telecom',
    sector: 'IT, Software & Telecom',
    responsibilities: [
      'Install, align, and maintain RF antennas, microwave towers, satellite dishes, and transceivers',
      'Carry out optical fibre splicing, OTDR testing, and tower climbing safety protocols',
      'Troubleshoot wireless signal degradation, power standing wave ratios (VSWR), and cable losses'
    ],
    requirements: [
      'Military telecom mechanic, radio technician, or SATCOM terminal operator',
      'Hands-on experience with RF test equipment, spectrum analyzers, and optical time-domain reflectometers'
    ],
    capabilities: ['wt_comms', 'wt_maint'],
    defaultMinSupervised: 0,
    recommendedLicences: ['Wireless Planning & Coordination (WPC) / RF Certification']
  },
  'IT Support & Desktop Engineer': {
    sectorId: 'it_telecom',
    sector: 'IT, Software & Telecom',
    responsibilities: [
      'Provide first and second-line hardware and software support for employee workstations and laptops',
      'Install and configure Windows/Linux OS, office productivity tools, antivirus, and peripherals',
      'Resolve network connectivity, printer setup, and user account access tickets'
    ],
    requirements: [
      'Military IT operator or trade technician with computer maintenance background',
      'Strong customer service orientation, problem diagnostics, and hardware replacement skills'
    ],
    capabilities: ['wt_comms', 'wt_maint'],
    defaultMinSupervised: 0,
    recommendedLicences: ['CompTIA A+ / Desktop Support Certification']
  },

  // Aviation, Aerospace & Marine
  'Aircraft Maintenance Technician': {
    sectorId: 'aviation_marine',
    sector: 'Aviation, Aerospace & Marine',
    responsibilities: [
      'Execute scheduled airframe, powerplant, landing gear, and flight control inspections',
      'Carry out precision component replacements, hydraulic bleeding, and structural sheet metal repairs',
      'Sign off pre-flight and post-flight maintenance logs adhering to aviation regulatory standards'
    ],
    requirements: [
      'IAF Airframe / Propulsion Fitter, Army Aviation, or Naval Air Squadron technician',
      '10+ years military aircraft maintenance experience with Class I trade certificate',
      'Understanding of DGCA CAR-66 / CAR-145 maintenance documentation and hangar safety'
    ],
    capabilities: ['wt_maint', 'wt_aviation'],
    defaultMinSupervised: 6,
    recommendedLicences: ['DGCA Basic AME License / CAR-66 Module Credits']
  },
  'Avionics & Radar Technician': {
    sectorId: 'aviation_marine',
    sector: 'Aviation, Aerospace & Marine',
    responsibilities: [
      'Maintain aircraft avionics, weather radar, VHF/UHF navigation radios, and flight instruments',
      'Perform line-replaceable unit (LRU) bench diagnostics, wiring harness loom repairs, and calibration',
      'Test transponders, flight data recorders (FDR), and emergency locator transmitters (ELT)'
    ],
    requirements: [
      'IAF Electrical / Instrument / Radar Fitter or Naval Aviation Electrical Artificer',
      'Deep expertise in avionics bus architectures, high-frequency radar, and instrument calibration'
    ],
    capabilities: ['wt_maint', 'wt_comms', 'wt_aviation'],
    defaultMinSupervised: 4,
    recommendedLicences: ['DGCA Basic AME (Avionics) / Radar Specialist Certification']
  },
  'Airfield Safety & Marshal Officer': {
    sectorId: 'aviation_marine',
    sector: 'Aviation, Aerospace & Marine',
    responsibilities: [
      'Perform aircraft marshalling, runway Foreign Object Debris (FOD) sweeps, and apron safety checks',
      'Direct aircraft towing, pushback tractors, chocking, and ground power unit (GPU) connections',
      'Enforce airside speed regulations, emergency access lanes, and refuelling safety zones'
    ],
    requirements: [
      'Air Force or Naval Air Station airfield ground crew, marshaller, or flight line controller',
      'Extensive airside ramp safety knowledge and incident containment protocols'
    ],
    capabilities: ['wt_aviation', 'wt_command'],
    defaultMinSupervised: 4,
    recommendedLicences: ['Airside Driving & Safety Permit']
  },
  'Marine / Vessel Operations Specialist': {
    sectorId: 'aviation_marine',
    sector: 'Aviation, Aerospace & Marine',
    responsibilities: [
      'Manage shipboard bridge watchkeeping, helm steering, mooring line operations, and deck safety',
      'Maintain ship auxiliary engines, bilge pumps, ballast systems, and firefighting lines',
      'Coordinate port entry/exit berthing, cargo lashing, and port authority vessel clearances'
    ],
    requirements: [
      'Indian Navy Seaman / Quartermaster / Engine Room Artificer with active sea-time service',
      'Familiarity with STCW-95 conventions, port operations, and marine salvage safety'
    ],
    capabilities: ['wt_seamanship', 'wt_maint'],
    defaultMinSupervised: 6,
    recommendedLicences: ['DG Shipping CDC / Watchkeeping Certificate / STCW-95']
  },

  // Healthcare, Emergency & Hospitality
  'Paramedic / Emergency Medical Assistant': {
    sectorId: 'healthcare_hospitality',
    sector: 'Healthcare, Emergency & Hospitality',
    responsibilities: [
      'Administer emergency trauma care, basic life support (BLS), wound suturing, and vitals assessment',
      'Operate emergency ambulance equipment (defibrillators, oxygen delivery, spine boards, IV lines)',
      'Accompany critical patient transfers to tertiary care facilities with continuous monitoring'
    ],
    requirements: [
      'Army Medical Corps (AMC) Nursing Assistant, Naval Sick Berth Attendant, or Air Force Medic',
      'Extensive field medical experience handling acute trauma, resuscitation, and casualty evacuation'
    ],
    capabilities: ['wt_medic', 'wt_medical'],
    defaultMinSupervised: 2,
    recommendedLicences: ['BLS / ACLS Certification', 'State Nursing / Paramedic Registration']
  },
  'First Aid & Disaster Response Specialist': {
    sectorId: 'healthcare_hospitality',
    sector: 'Healthcare, Emergency & Hospitality',
    responsibilities: [
      'Design corporate and industrial disaster response, mass casualty, and evacuation plans',
      'Conduct certified first aid and CPR training for workplace safety wardens',
      'Coordinate rapid response during natural disasters, industrial leaks, or stampedes'
    ],
    requirements: [
      'Military disaster response / NDRF deputation / Combat medic / EOD engineer background',
      'Proven expertise in incident command system (ICS) and emergency triage under crisis conditions'
    ],
    capabilities: ['wt_eod', 'wt_medic', 'wt_command'],
    defaultMinSupervised: 6,
    recommendedLicences: ['First Aid Certification', 'Disaster Management Certification']
  },
  'Hospitality / Mess Supervisor': {
    sectorId: 'healthcare_hospitality',
    sector: 'Healthcare, Emergency & Hospitality',
    responsibilities: [
      'Direct large-scale catering operations, meal preparation for 500+ personnel, and kitchen hygiene',
      'Manage dry/cold ration procurement, menu planning, food cost accounting, and quality inspections',
      'Lead cooks, stewards, and cleaning crews adhering to FSSAI standards and food safety norms'
    ],
    requirements: [
      'Army ASC Catering, Naval Galley In-charge, or Air Force Mess Manager',
      'Experience running high-volume dining halls, banquet services, and hygienic food logistics'
    ],
    capabilities: ['wt_catering', 'wt_command', 'wt_store'],
    defaultMinSupervised: 12,
    recommendedLicences: ['FSSAI Food Safety Supervisor Certification']
  },

  // Corporate, HR, Sales & Field Services
  'HR & Veteran Talent Recruiter': {
    sectorId: 'corporate_sales',
    sector: 'Corporate, HR, Sales & Field Services',
    responsibilities: [
      'Source, screen, and interview transitioning military veterans and Agniveers for corporate roles',
      'Translate military service records, trade proficiencies, and conduct books into civilian skills',
      'Manage onboarding journeys, orientation programs, and mentor-buddy integrations'
    ],
    requirements: [
      'Military administration, personnel management, or regimental recruiting office background',
      'Deep understanding of military ranks, service trades, discharge credentials, and corporate needs'
    ],
    capabilities: ['wt_admin', 'wt_command', 'wt_intel'],
    defaultMinSupervised: 2,
    recommendedLicences: ['HR / Talent Acquisition Certification']
  },
  'Field Operations Executive': {
    sectorId: 'corporate_sales',
    sector: 'Corporate, HR, Sales & Field Services',
    responsibilities: [
      'Execute on-ground territory verifications, field audits, and business asset inspections',
      'Manage regional merchant / customer field relationships and resolve service tickets on-site',
      'Coordinate field vendor compliance, spot audits, and submit geotagged inspection reports'
    ],
    requirements: [
      'Ex-serviceman with active field mobility, geographical familiarity, and high integrity',
      'Possession of two-wheeler / four-wheeler driving licence and smartphone data logging proficiency'
    ],
    capabilities: ['wt_driver', 'wt_admin', 'wt_command'],
    defaultMinSupervised: 0,
    recommendedLicences: ['Driving Licence — LMV']
  },
  'Accounts & Billing Assistant': {
    sectorId: 'corporate_sales',
    sector: 'Corporate, HR, Sales & Field Services',
    responsibilities: [
      'Process vendor invoices, employee expense claims, travel bills, and purchase orders',
      'Reconcile bank statements, ledger entries, GST input registers, and audit vouchers',
      'Generate monthly pay summaries, contractor billing records, and tax deduction files'
    ],
    requirements: [
      'Military Pay & Accounts clerk (AOC / ASC / Naval Writer / Air Force Accounts)',
      'High numerical precision, working knowledge of Tally / ERP accounts, and audit compliance'
    ],
    capabilities: ['wt_admin'],
    defaultMinSupervised: 0,
    recommendedLicences: ['Tally / Accounting Certification']
  }
};

// Helper to look up full role specification with responsibilities, requirements, and capabilities
export function getRoleSpecification(roleTitle, sectorLabelOrId = null) {
  if (!roleTitle) return null;
  const target = String(roleTitle).trim().toLowerCase();

  // 1. Exact match in ROLE_SPECIFICATIONS
  for (const [key, spec] of Object.entries(ROLE_SPECIFICATIONS)) {
    if (key.toLowerCase() === target) {
      return { role: key, ...spec };
    }
  }

  // 2. Partial match in ROLE_SPECIFICATIONS
  for (const [key, spec] of Object.entries(ROLE_SPECIFICATIONS)) {
    if (target.includes(key.toLowerCase()) || key.toLowerCase().includes(target)) {
      return { role: key, ...spec };
    }
  }

  // 3. Fallback specification dynamically composed from sector and role keywords
  const sec = findSector(sectorLabelOrId);
  const inferredCaps = [];

  if (target.includes('secur') || target.includes('guard') || target.includes('protection') || target.includes('vigilance')) {
    inferredCaps.push('wt_guard');
  }
  if (target.includes('supervis') || target.includes('lead') || target.includes('manager') || target.includes('incharge')) {
    inferredCaps.push('wt_command');
  }
  if (target.includes('fleet') || target.includes('driver') || target.includes('transport') || target.includes('convoy')) {
    inferredCaps.push('wt_driver');
  }
  if (target.includes('warehouse') || target.includes('store') || target.includes('inventory') || target.includes('supply')) {
    inferredCaps.push('wt_store');
  }
  if (target.includes('maint') || target.includes('repair') || target.includes('technician') || target.includes('mechanic')) {
    inferredCaps.push('wt_maint');
  }
  if (target.includes('facility') || target.includes('site') || target.includes('premises')) {
    inferredCaps.push('wt_facility');
  }
  if (target.includes('telecom') || target.includes('network') || target.includes('comms') || target.includes('cctv')) {
    inferredCaps.push('wt_comms');
  }
  if (target.includes('admin') || target.includes('clerk') || target.includes('record') || target.includes('payroll')) {
    inferredCaps.push('wt_admin');
  }
  if (target.includes('medic') || target.includes('first aid') || target.includes('emergency')) {
    inferredCaps.push('wt_medic');
  }

  // If still empty, use sector default capabilities
  if (inferredCaps.length === 0) {
    if (sec?.id === 'security_defence') inferredCaps.push('wt_guard', 'wt_command');
    else if (sec?.id === 'logistics_transport') inferredCaps.push('wt_store', 'wt_driver');
    else if (sec?.id === 'engineering_manufacturing') inferredCaps.push('wt_maint', 'wt_engineer');
    else if (sec?.id === 'admin_facilities') inferredCaps.push('wt_facility', 'wt_command');
    else if (sec?.id === 'it_telecom') inferredCaps.push('wt_comms');
    else if (sec?.id === 'aviation_marine') inferredCaps.push('wt_aviation', 'wt_maint');
    else if (sec?.id === 'healthcare_hospitality') inferredCaps.push('wt_medical', 'wt_catering');
    else inferredCaps.push('wt_command');
  }

  return {
    role: roleTitle,
    sectorId: sec?.id || 'general',
    sector: sec?.label || 'General Operations',
    responsibilities: [
      `Execute ${roleTitle} daily responsibilities adhering to company standards and regulatory guidelines`,
      'Coordinate team workflows, resource deployment, and task completion timelines',
      'Maintain operational logs, safety protocols, and incident escalation channels'
    ],
    requirements: [
      'Honourable military discharge with relevant trade experience or transferable technical skills',
      'Proven discipline, situational judgment, and adherence to standard operating procedures'
    ],
    capabilities: Array.from(new Set(inferredCaps)),
    defaultMinSupervised: target.includes('manager') || target.includes('lead') || target.includes('supervisor') ? 6 : 0,
    recommendedLicences: []
  };
}

