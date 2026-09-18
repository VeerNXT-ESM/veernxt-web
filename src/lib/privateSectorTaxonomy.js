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
      { role: 'Security Personnel', jobClass: 'blue_collar' },
      { role: 'Security Supervisor', jobClass: 'black_collar' },
      { role: 'Armed Guard / PSO (Personal Security)', jobClass: 'blue_collar' },
      { role: 'CCTV & Control Room Operator', jobClass: 'blue_collar' },
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
      { role: 'Driver', jobClass: 'blue_collar' },
      { role: 'Delivery Personnel', jobClass: 'blue_collar' },
      { role: 'Fleet Supervisor', jobClass: 'black_collar' },
      { role: 'Warehouse Personnel', jobClass: 'blue_collar' },
      { role: 'Warehouse Supervisor', jobClass: 'black_collar' },
      { role: 'Inventory Controller / Storekeeper', jobClass: 'blue_collar' },
      { role: 'Forklift & Equipment Operator', jobClass: 'blue_collar' },
      { role: 'Logistics & Dispatch Coordinator', jobClass: 'black_collar' },
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
      { role: 'Mechanic', jobClass: 'blue_collar' },
      { role: 'Technician', jobClass: 'blue_collar' },
      { role: 'Electrical Technician / Electrician', jobClass: 'blue_collar' },
      { role: 'Machine Operator', jobClass: 'blue_collar' },
      { role: 'Welder / Fabricator', jobClass: 'blue_collar' },
      { role: 'Maintenance Engineer / Supervisor', jobClass: 'black_collar' },
      { role: 'QA/QC Inspector', jobClass: 'black_collar' },
      { role: 'Plant Operations Supervisor', jobClass: 'black_collar' },
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
      { role: 'Facility Staff', jobClass: 'blue_collar' },
      { role: 'Field Staff', jobClass: 'blue_collar' },
      { role: 'Facility Supervisor', jobClass: 'black_collar' },
      { role: 'Operations Supervisor', jobClass: 'black_collar' },
      { role: 'Site Manager', jobClass: 'black_collar' },
      { role: 'Administrative Officer / Clerk', jobClass: 'black_collar' },
      { role: 'Procurement & Vendor Executive', jobClass: 'black_collar' },
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

// Find sector object by label or id
export function findSector(sectorLabelOrId) {
  if (!sectorLabelOrId) return null;
  const s = String(sectorLabelOrId).trim().toLowerCase();
  return SECTOR_TAXONOMY.find((sec) => sec.id.toLowerCase() === s || sec.label.toLowerCase() === s) || null;
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
