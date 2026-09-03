// Private Sector module — role and preference option lists shared between
// the employer requirement wizard (PostJobRequirement.jsx) and the
// candidate profile journey (PrivateSectorProfile.jsx), plus the internal
// Blue Collar / Black Collar job-class taxonomy.
//
// job_class is a property of the ROLE, not something set per candidate or
// per requirement -- fixed here, never candidate/employer/admin-assigned.
// It is internal-only: never rendered anywhere in candidate- or
// employer-facing UI (docs/VeerNXT_Private_Sector_Implementation_Improvements.md §13).
// getJobClass()/summarizeJobClasses() exist for the admin HR console only.

export const ROLE_TAXONOMY = [
  { role: 'Driver', jobClass: 'blue_collar' },
  { role: 'Delivery Personnel', jobClass: 'blue_collar' },
  { role: 'Mechanic', jobClass: 'blue_collar' },
  { role: 'Warehouse Personnel', jobClass: 'blue_collar' },
  { role: 'Technician', jobClass: 'blue_collar' },
  { role: 'Machine Operator', jobClass: 'blue_collar' },
  { role: 'Security Personnel', jobClass: 'blue_collar' },
  { role: 'Facility Staff', jobClass: 'blue_collar' },
  { role: 'Field Staff', jobClass: 'blue_collar' },
  { role: 'Security Supervisor', jobClass: 'black_collar' },
  { role: 'Facility Supervisor', jobClass: 'black_collar' },
  { role: 'Operations Supervisor', jobClass: 'black_collar' },
  { role: 'Fleet Supervisor', jobClass: 'black_collar' },
  { role: 'Site Manager', jobClass: 'black_collar' },
  { role: 'Other', jobClass: null },
];

export const ROLE_OPTIONS = ROLE_TAXONOMY.map((r) => r.role);

const ROLE_TO_JOB_CLASS = Object.fromEntries(ROLE_TAXONOMY.map((r) => [r.role, r.jobClass]));

// Internal-only helper — for admin reporting/matching, never for
// candidate/employer-facing copy.
export function getJobClass(roleTitle) {
  return ROLE_TO_JOB_CLASS[roleTitle] || null;
}

// Given an array of role titles (a requirement's role_titles, or a
// candidate's work_types), returns which job classes are represented —
// used by the admin console only.
export function summarizeJobClasses(roleTitles = []) {
  const classes = new Set(roleTitles.map(getJobClass).filter(Boolean));
  return [...classes];
}

export const SKILL_OPTIONS = [
  'Driving (LMV)', 'Driving (HMV)', 'Vehicle Maintenance', 'Electrical Work',
  'Plumbing', 'Welding', 'Warehouse/Inventory Management', 'Forklift Operation',
  'Physical Security', 'CCTV/Surveillance', 'Fire Safety', 'First Aid',
  'Team Supervision', 'Logistics Coordination', 'Customer Service', 'Other',
];

export const AVAILABILITY_OPTIONS = [
  'Immediately', 'Within 15 days', 'Within 30 days', 'Notice period (specify below)',
];

export const LICENCE_OPTIONS = [
  'Driving Licence — LMV', 'Driving Licence — HMV', 'Heavy Equipment Operator Licence',
  'Security Guard Licence (PSARA)', 'Fire Safety Certification', 'First Aid Certification', 'Other',
];
