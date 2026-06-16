/**
 * Military Trade / Arm / Corps  →  Civilian Career Track mapping.
 *
 * Upgraded to dynamically ingest the compiled Tri-Service Designations
 * database (Service_Detail.csv) to support granular role-to-arm mapping.
 */

import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const TRADE_MAP = {
  // ---- Combat Arms ----
  'Infantry':        { strong: ['POLICE_CAPF'],           soft: ['SSC','DEFENCE','FIRE','SECURITY'] },
  'Armoured':        { strong: ['POLICE_CAPF','ENGINEERING'], soft: ['TRANSPORT','SSC'] },
  'Artillery':       { strong: ['POLICE_CAPF'],           soft: ['ENGINEERING','SSC'] },
  'Mechanised Infantry': { strong: ['POLICE_CAPF'],       soft: ['ENGINEERING','SSC'] },

  // ---- Combat Support ----
  'Signals':         { strong: ['ENGINEERING','RAILWAYS','PSU'], soft: ['SSC','BANKING','METRO'] },
  'Engineers':       { strong: ['ENGINEERING','PSU','RAILWAYS'], soft: ['SSC','MUNICIPAL'] },
  'Army Aviation':   { strong: ['ENGINEERING','PSU'],     soft: ['TRANSPORT'] },
  'Intelligence':    { strong: ['POLICE_CAPF','CIVIL_SERVICES'], soft: ['SSC'] },

  // ---- Services ----
  'EME':             { strong: ['ENGINEERING','PSU','RAILWAYS'], soft: ['SSC','TRANSPORT'] },
  'ASC':             { strong: ['POSTAL','RAILWAYS','PSU'],       soft: ['SSC','ACCOUNTING','ADMINISTRATIVE'] },
  'AOC':             { strong: ['POSTAL','ACCOUNTING','ADMINISTRATIVE'], soft: ['SSC','BANKING'] },
  'AMC':             { strong: ['HEALTH','NURSING'],      soft: ['SSC'] },
  'AEC':             { strong: ['TEACHING','ADMINISTRATIVE'], soft: ['SSC','BANKING'] },
  'RVC':             { strong: ['ANIMAL_HUSBANDRY'],      soft: ['AGRICULTURE','SSC'] },

  // ---- Common trades ----
  'Clerk':           { strong: ['SSC','BANKING','ACCOUNTING','ADMINISTRATIVE','SECRETARIAT','POSTAL'],
                        soft:   ['INSURANCE','RAILWAYS'] },
  'Storekeeper':     { strong: ['ACCOUNTING','ADMINISTRATIVE','POSTAL'], soft: ['SSC','RAILWAYS'] },
  'Radio Operator':  { strong: ['ENGINEERING','RAILWAYS'], soft: ['SSC','PSU'] },
  'Driver':          { strong: ['TRANSPORT','RAILWAYS','POLICE_CAPF'], soft: ['SSC','PSU'] },
  'Driver MT':       { strong: ['TRANSPORT','RAILWAYS','POLICE_CAPF'], soft: ['SSC','PSU'] },
  'Chef':            { strong: ['RAILWAYS','TOURISM'],    soft: ['SSC','HEALTH'] },
  'Cook':            { strong: ['RAILWAYS','TOURISM'],    soft: ['SSC'] },
  'Washerman':       { strong: ['MUNICIPAL'],             soft: ['SSC','RAILWAYS'] },
  'Steward':         { strong: ['RAILWAYS','TOURISM'],    soft: ['SSC','BANKING'] },
  'Barber':          { strong: ['MUNICIPAL','SSC'],       soft: [] },
  'Tradesman':       { strong: ['ENGINEERING','RAILWAYS','PSU','MUNICIPAL'], soft: ['SSC'] },
  'General Duty':    { strong: ['POLICE_CAPF'],           soft: ['SSC','DEFENCE','FIRE'] },
  'Rifleman':        { strong: ['POLICE_CAPF'],           soft: ['SSC','FIRE'] },
  'Sepoy':           { strong: ['POLICE_CAPF'],           soft: ['SSC','DEFENCE'] },

  // ---- Navy ----
  'Logistics (Navy)':    { strong: ['BANKING','ACCOUNTING','ADMINISTRATIVE','POSTAL'], soft: ['SSC'] },
  'Engineering (Navy)':  { strong: ['ENGINEERING','PSU'], soft: ['SSC','RAILWAYS'] },
  'Electrical (Navy)':   { strong: ['ENGINEERING','PSU','RAILWAYS'], soft: ['SSC'] },
  'Seaman':              { strong: ['TRANSPORT','POLICE_CAPF'], soft: ['SSC'] },
  'Hydro':               { strong: ['ENVIRONMENT','ENGINEERING'], soft: ['SSC'] },

  // ---- Air Force ----
  'Automobile Technician': { strong: ['ENGINEERING','RAILWAYS','PSU','TRANSPORT'], soft: ['SSC'] },
  'Electronics Fitter':    { strong: ['ENGINEERING','RAILWAYS','PSU'], soft: ['SSC'] },
  'Mechanical Fitter':     { strong: ['ENGINEERING','RAILWAYS','PSU'], soft: ['SSC'] },
  'IAF(X) Group':          { strong: ['ENGINEERING','PSU'], soft: ['SSC'] },
  'IAF(Y) Group':          { strong: ['ADMINISTRATIVE','SSC'], soft: ['BANKING','POSTAL'] },
  'Weapons Fitter':        { strong: ['ENGINEERING','POLICE_CAPF'], soft: ['SSC'] },

  // ---- Skill-based (from questionnaire "Specific Skills Handled") ----
  'Weapons Handling':        { strong: ['POLICE_CAPF'],   soft: ['DEFENCE','FIRE'] },
  'Inventory/Store Management': { strong: ['ACCOUNTING','ADMINISTRATIVE','POSTAL'], soft: ['SSC','BANKING'] },
  'Technical Repair/Maintenance': { strong: ['ENGINEERING','RAILWAYS','PSU'], soft: ['SSC'] },
  'Driving (LMV/HMV)':       { strong: ['TRANSPORT','RAILWAYS','POLICE_CAPF'], soft: ['SSC'] },
  'Office Admin/Computer Work': { strong: ['SSC','BANKING','ADMINISTRATIVE','SECRETARIAT','ACCOUNTING'], soft: ['INSURANCE','RAILWAYS'] },
  'Instruction/Training':    { strong: ['TEACHING','ADMINISTRATIVE'], soft: ['SSC'] },
};

// Map the raw Arm/Corps names from Service_Detail.csv to standard TRADE_MAP keys
const ARM_CORPS_MAP = {
  // Army Combat
  'INFANTRY': 'Infantry',
  'MECHANISED INFANTRY': 'Mechanised Infantry',
  'ARMOURED CORPS': 'Armoured',
  'ARTILLERY': 'Artillery',
  'AIR DEFENCE ARTILLERY': 'Artillery',
  'SPECIAL FORCES': 'Infantry',
  
  // Army Support & Services
  'ARMY AVIATION CORPS': 'Army Aviation',
  'CORPS OF ENGINEERS': 'Engineers',
  'CORPS OF SIGNALS': 'Signals',
  'ARMY SERVICE CORPS (ASC)': 'ASC',
  'ARMY ORDNANCE CORPS (AOC)': 'AOC',
  'ELECTRICAL AND MECHANICAL ENGINEERS (EME)': 'EME',
  'ARMY MEDICAL CORPS (AMC)': 'AMC',
  'ARMY DENTAL CORPS (ADC)': 'AMC',
  'REMOUNT AND VETERINARY CORPS (RVC)': 'RVC',
  'INTELLIGENCE CORPS': 'Intelligence',
  'ARMY POSTAL SERVICE (APS)': 'ASC',
  'PIONEER CORPS': 'Engineers',
  'DEFENCE SECURITY CORPS (DSC)': 'General Duty',
  'CORPS OF MILITARY POLICE (CMP)': 'General Duty',
  'ARMY PAY CORPS (APC)': 'Clerk',
  'REMOUNT TRAINING CENTRE': 'RVC',
  
  // Navy Branches
  'EXECUTIVE BRANCH (Seamen Branch)': 'Seaman',
  'COMMUNICATIONS BRANCH': 'Signals',
  'ENGINEERING BRANCH (Marine Engineering)': 'Engineering (Navy)',
  'WEAPON BRANCH (Seaman Specialist / Gunnery)': 'Seaman',
  'NAVAL AIR ARM (Aviation Branch)': 'Army Aviation',
  'SUBMARINE BRANCH': 'Seaman',
  'NAVAL MEDICAL BRANCH': 'AMC',
  'SURVEY BRANCH (Hydrographic)': 'Hydro',
  'NAVAL EDUCATION & METEOROLOGY': 'AEC',
  'INDIAN COAST GUARD (Aligned with Navy)': 'Seaman',
  
  // Air Force Branches
  'FLYING BRANCH': 'Army Aviation',
  'GROUND DUTY TECHNICAL (Airmen)': 'Mechanical Fitter',
  'GROUND DUTY NON-TECHNICAL (Admin / Logistics)': 'Clerk',
  'IAF MEDICAL BRANCH (Airmen)': 'AMC',
  'METEOROLOGY BRANCH (Airmen)': 'AEC',
  'IAF REGIMENT (Ground Defence)': 'General Duty',
  'IAF SIGNALS BRANCH': 'Signals',
  'IAF EDUCATION BRANCH': 'AEC',
  'IAF FIRE SERVICES': 'General Duty',
  'IAF PIONEER & WORKS SERVICES': 'Engineers',
  'IAF CATERING BRANCH': 'Cook',
  'IAF MUSIC BRANCH (Bands)': 'General Duty'
};

// Ingest compiled designations at startup
let compiledDesignations = [];
try {
  const jsonPath = resolve(__dirname, 'data', 'designations.json');
  if (existsSync(jsonPath)) {
    compiledDesignations = JSON.parse(readFileSync(jsonPath, 'utf-8')).designations;
  }
} catch (err) {
  // Graceful fallback to avoid crashes if parser has not run
  console.warn('Warning: Could not load designations.json from path, fallback to empty lookup:', err.message);
}

/**
 * Resolve trade to tracks with graceful fallback for partial string matches.
 * Hierarchically checks specific designations, resolving their parent Arms/Corps
 * to civilian career tracks.
 */
export function resolveTradeTracks(tradeString = '', skills = []) {
  const inputs = [tradeString, ...skills]
    .filter(Boolean)
    .map(s => s.toLowerCase().trim());
  
  const matched = { strong: new Set(), soft: new Set() };

  // 1. Hierarchical specific designation match
  compiledDesignations.forEach(des => {
    const desLower = des.trade.toLowerCase().trim();
    
    // Check if user inputs match specific designation (substring match)
    if (inputs.some(s => s.includes(desLower) || desLower.includes(s))) {
      const parentArmKey = ARM_CORPS_MAP[des.arm_corps];
      if (parentArmKey && TRADE_MAP[parentArmKey]) {
        TRADE_MAP[parentArmKey].strong.forEach(t => matched.strong.add(t));
        TRADE_MAP[parentArmKey].soft.forEach(t => matched.soft.add(t));
      }
    }
  });

  // 2. Direct default TRADE_MAP key match (preserves backwards compatibility)
  for (const key of Object.keys(TRADE_MAP)) {
    const k = key.toLowerCase();
    if (inputs.some(s => s.includes(k) || k.includes(s))) {
      TRADE_MAP[key].strong.forEach(t => matched.strong.add(t));
      TRADE_MAP[key].soft.forEach(t => matched.soft.add(t));
    }
  }

  return {
    strong: [...matched.strong],
    soft:   [...matched.soft],
  };
}
