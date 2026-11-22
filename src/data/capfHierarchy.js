/**
 * VeerNXT — CAPF and Coast Guard: Branches, Wings & Trades Hierarchy
 * Extracted directly from official force structure and recruitment cadres.
 */

export const CAPF_FORCES = [
  {
    "key": "ASSAM RIFLES (AR)",
    "code": "AR",
    "shortName": "Assam Rifles",
    "fullName": "Assam Rifles (AR)",
    "summary": "Sentinels of the Northeast \u2014 Counter-insurgency and guarding the 1,643 km Indo-Myanmar border under Indian Army operational control.",
    "badge": "7 Branches",
    "branchesCount": 7
  },
  {
    "key": "BORDER SECURITY FORCE (BSF)",
    "code": "BSF",
    "shortName": "Border Security Force",
    "fullName": "Border Security Force (BSF)",
    "summary": "First Line of Defence \u2014 World\u2019s largest border guarding force securing Pakistan and Bangladesh borders with Land, Water Wing, and Air Wing.",
    "badge": "5 Branches",
    "branchesCount": 5
  },
  {
    "key": "CENTRAL INDUSTRIAL SECURITY FORCE (CISF)",
    "code": "CISF",
    "shortName": "CISF",
    "fullName": "Central Industrial Security Force (CISF)",
    "summary": "Strategic & Infrastructure Security \u2014 Protecting 350+ national infrastructure assets, 68 airports, Delhi Metro, VIP protection, and Fire Services.",
    "badge": "7 Branches",
    "branchesCount": 7
  },
  {
    "key": "CENTRAL RESERVE POLICE FORCE (CRPF)",
    "code": "CRPF",
    "shortName": "CRPF",
    "fullName": "Central Reserve Police Force (CRPF)",
    "summary": "Peacekeepers of the Nation \u2014 India\u2019s primary internal security force for counter-insurgency, anti-Naxal ops (CoBRA), and riot control (RAF).",
    "badge": "8 Branches",
    "branchesCount": 8
  },
  {
    "key": "INDO-TIBETAN BORDER POLICE (ITBP)",
    "code": "ITBP",
    "shortName": "ITBP",
    "fullName": "Indo-Tibetan Border Police (ITBP)",
    "summary": "Himveers \u2014 High-altitude border guarding force securing 3,488 km Indo-China border (LAC) from Ladakh to Arunachal Pradesh.",
    "badge": "9 Branches",
    "branchesCount": 9
  },
  {
    "key": "NATIONAL SECURITY GUARD (NSG)",
    "code": "NSG",
    "shortName": "National Security Guard",
    "fullName": "National Security Guard (NSG)",
    "summary": "Black Cats \u2014 Elite federal contingency counter-terrorism and anti-hijack commando force (SAG, SRG, Regional Hubs).",
    "badge": "5 Wings",
    "branchesCount": 5
  },
  {
    "key": "SASHASTRA SEEMA BAL (SSB)",
    "code": "SSB",
    "shortName": "Sashastra Seema Bal",
    "fullName": "Sashastra Seema Bal (SSB)",
    "summary": "Service, Security & Brotherhood \u2014 Guarding open borders with Nepal and Bhutan with specialized Intelligence and Civic Action outreach.",
    "badge": "7 Branches",
    "branchesCount": 7
  },
  {
    "key": "INDIAN COAST GUARD (ICG) \u2014 SAILORS (ENROLLED PERSONNEL)",
    "code": "ICG",
    "shortName": "Indian Coast Guard",
    "fullName": "Indian Coast Guard (ICG)",
    "summary": "Vayam Rakshamah \u2014 Maritime armed force protecting India\u2019s 7,516 km coastline, Exclusive Economic Zone (EEZ), and coastal security.",
    "badge": "3 Branches",
    "branchesCount": 3
  }
];

export const CAPF_HIERARCHY = {
  "ASSAM RIFLES (AR)": {
    "GENERAL DUTY (RIFLEMEN)": {
      "category": "COMBAT / GENERAL DUTY",
      "trades": [
        "Rifleman (GD)",
        "Riflewoman (GD)"
      ]
    },
    "SIGNALS & COMMUNICATION": {
      "category": "COMMUNICATION / TECHNICAL",
      "trades": [
        "Cipher",
        "Radio Mechanic (RM)",
        "Electrical Fitter (Signal)",
        "Lineman (Field)",
        "Instrument Mechanic"
      ]
    },
    "VEHICLE & EQUIPMENT WORKSHOP (EME-TYPE)": {
      "category": "TECHNICAL",
      "trades": [
        "Vehicle Mechanic",
        "Electrician (Motor Vehicle)",
        "Engineer Equipment Mechanic",
        "Recovery Vehicle Mechanic",
        "Armourer",
        "Metalsmith",
        "Welder",
        "Upholster",
        "Store Keeper (Technical, EME)"
      ]
    },
    "ENGINEERING, WORKS & SURVEY": {
      "category": "ENGINEERING / PIONEER",
      "trades": [
        "Mason",
        "Plumber",
        "Electrician",
        "Bridge and Road",
        "Draughtsman",
        "Surveyor"
      ]
    },
    "MEDICAL & VETERINARY": {
      "category": "MEDICAL / PARAMEDICAL",
      "trades": [
        "Operation Theatre Technician",
        "Physiotherapist",
        "X-Ray Assistant",
        "Pharmacist",
        "Veterinary Field Assistant"
      ]
    },
    "ADMINISTRATION & OFFICE": {
      "category": "CLERICAL",
      "trades": [
        "Clerk",
        "Personal Assistant"
      ]
    },
    "TRADESMEN & SERVICES (SUPPORT)": {
      "category": "TRADESMAN",
      "trades": [
        "Cook",
        "Masalchi",
        "Barber",
        "Safai Karmachari (Sanitation)"
      ]
    }
  },
  "BORDER SECURITY FORCE (BSF)": {
    "GENERAL DUTY (BORDER GUARD)": {
      "category": "COMBAT / GENERAL DUTY",
      "trades": [
        "Constable (GD)"
      ]
    },
    "SPECIAL UNITS (POSTING OPTIONS)": {
      "category": "SPECIAL UNITS",
      "trades": [
        "Artillery Units",
        "Air Wing",
        "Camel Contingent"
      ]
    },
    "WATER WING (MARINE)": {
      "category": "WATER WING",
      "trades": [
        "Sub-Inspector (Master)",
        "Sub-Inspector (Engine Driver)",
        "Head Constable (Master)",
        "Head Constable (Engine Driver)",
        "Head Constable (Workshop)",
        "Constable (Crew)"
      ]
    },
    "SIGNALS & COMMUNICATION": {
      "category": "COMMUNICATION / TECHNICAL",
      "trades": [
        "Head Constable (Radio Operator)",
        "Head Constable (Radio Mechanic)"
      ]
    },
    "TRADESMEN & SUPPORT SERVICES": {
      "category": "TRADESMAN",
      "trades": [
        "Cook",
        "Water Carrier",
        "Barber",
        "Washerman",
        "Sweeper",
        "Cobbler",
        "Tailor",
        "Waiter",
        "Carpenter",
        "Mason",
        "Painter",
        "Electrician",
        "Plumber",
        "Mali (Gardener)"
      ]
    }
  },
  "CENTRAL INDUSTRIAL SECURITY FORCE (CISF)": {
    "GENERAL DUTY (INDUSTRIAL & AIRPORT SECURITY)": {
      "category": "COMBAT / GENERAL DUTY",
      "trades": [
        "Constable (GD)"
      ]
    },
    "SPECIALISED VERTICALS (POSTING OPTIONS)": {
      "category": "SPECIAL UNITS",
      "trades": [
        "Airport Security",
        "Delhi Metro Security",
        "Parliament House Complex",
        "VIP Security (Special Security Group)",
        "Consultancy & Private-Industry Deployment"
      ]
    },
    "FIRE SERVICES": {
      "category": "FIRE SERVICES",
      "trades": [
        "Constable (Fire) / Fireman"
      ]
    },
    "DRIVERS": {
      "category": "TECHNICAL",
      "trades": [
        "Constable (Driver)",
        "Constable (Driver-cum-Pump Operator)"
      ]
    },
    "TRADESMEN & TECHNICAL SUPPORT": {
      "category": "TRADESMAN",
      "trades": [
        "Barber",
        "Boot Maker / Cobbler",
        "Tailor",
        "Cook",
        "Carpenter",
        "Mali (Gardener)",
        "Painter",
        "Charge Mechanic",
        "Washer Man",
        "Welder",
        "Electrician",
        "Motor Pump Attendant",
        "Sweeper"
      ]
    },
    "MEDICAL & PARAMEDICAL": {
      "category": "MEDICAL / PARAMEDICAL",
      "trades": [
        "ASI (Pharmacist)",
        "ASI (X-Ray Technician)",
        "ASI (Laboratory Technician)"
      ]
    },
    "SPORTS": {
      "category": "SPORTS QUOTA",
      "trades": [
        "Head Constable (Sportsperson)"
      ]
    }
  },
  "CENTRAL RESERVE POLICE FORCE (CRPF)": {
    "GENERAL DUTY (COMBAT)": {
      "category": "COMBAT / GENERAL DUTY",
      "trades": [
        "Constable (GD)"
      ]
    },
    "SPECIAL UNITS (POSTING OPTIONS)": {
      "category": "SPECIAL UNITS",
      "trades": [
        "Rapid Action Force (RAF)",
        "CoBRA (Commando Battalion for Resolute Action)",
        "Mahila (Women's) Battalions",
        "Signal Battalions",
        "VIP Security",
        "241 Bastariya Battalion"
      ]
    },
    "TECHNICAL (DRIVERS & MECHANICS)": {
      "category": "TECHNICAL",
      "trades": [
        "Driver",
        "Motor Mechanic (Vehicle)"
      ]
    },
    "TRADESMEN & BAND": {
      "category": "TRADESMAN",
      "trades": [
        "Cook",
        "Bugler",
        "Water Carrier",
        "Safai Karmachari",
        "Washerman / Washerwoman",
        "Barber / Hair Dresser",
        "Tailor",
        "Carpenter",
        "Cobbler",
        "Mali (Gardener)",
        "Painter",
        "Brass Band",
        "Pipe Band"
      ]
    },
    "PIONEER WING": {
      "category": "ENGINEERING / PIONEER",
      "trades": [
        "Mason (Pioneer Wing)",
        "Electrician (Pioneer Wing)"
      ]
    },
    "MEDICAL & PARAMEDICAL (HOSPITALS)": {
      "category": "MEDICAL / PARAMEDICAL",
      "trades": [
        "Dietician",
        "Staff Nurse",
        "Radiographer",
        "Pharmacist",
        "Physiotherapist",
        "Dental Technician",
        "Laboratory Technician",
        "ECG Technician",
        "Physiotherapy Assistant / Nursing Assistant / Medic",
        "ANM / Midwife",
        "Dialysis Technician",
        "Junior X-Ray Assistant",
        "Laboratory Assistant"
      ]
    },
    "VETERINARY": {
      "category": "VETERINARY",
      "trades": [
        "Veterinary (Head Constable)",
        "Veterinary Laboratory Technician",
        "Veterinary Radiographer"
      ]
    },
    "HOSPITAL & MESS SUPPORT": {
      "category": "TRADESMAN",
      "trades": [
        "Steward",
        "Electrician (Head Constable)",
        "Masalchi",
        "Table Boy"
      ]
    }
  },
  "INDO-TIBETAN BORDER POLICE (ITBP)": {
    "GENERAL DUTY (HIMALAYAN BORDER)": {
      "category": "COMBAT / GENERAL DUTY",
      "trades": [
        "Constable (GD)"
      ]
    },
    "SPECIAL ROLES (POSTING OPTIONS)": {
      "category": "SPECIAL UNITS",
      "trades": [
        "Mountaineering & Rescue",
        "Skiing",
        "Disaster Relief"
      ]
    },
    "ANIMAL TRANSPORT & VETERINARY": {
      "category": "VETERINARY / ANIMAL TRANSPORT",
      "trades": [
        "Constable (Animal Transport)",
        "Head Constable (Dresser Veterinary)"
      ]
    },
    "DRIVERS & VEHICLE TECHNICAL": {
      "category": "TECHNICAL",
      "trades": [
        "Constable (Driver)",
        "Constable (Motor Mechanic)",
        "Head Constable (Motor Mechanic)"
      ]
    },
    "TELECOMMUNICATION": {
      "category": "COMMUNICATION / TECHNICAL",
      "trades": [
        "Constable (Telecommunication)",
        "Head Constable (Telecommunication)",
        "Sub-Inspector (Telecommunication)"
      ]
    },
    "PIONEER (ENGINEERING)": {
      "category": "ENGINEERING / PIONEER",
      "trades": [
        "Constable (Carpenter)",
        "Constable (Plumber)",
        "Constable (Mason)",
        "Constable (Electrician)",
        "Sub-Inspector (Overseer)"
      ]
    },
    "TRADESMEN & KITCHEN SERVICES": {
      "category": "TRADESMAN",
      "trades": [
        "Constable (Kitchen Services)",
        "Cook",
        "Water Carrier",
        "Barber",
        "Washerman",
        "Safai Karamchari",
        "Tailor",
        "Gardener",
        "Cobbler"
      ]
    },
    "MEDICAL & PARAMEDICAL": {
      "category": "MEDICAL / PARAMEDICAL",
      "trades": [
        "Head Constable (Midwife)",
        "ASI (Pharmacist)",
        "ASI (Laboratory Technician)",
        "ASI (Radiographer)",
        "Sub-Inspector (Staff Nurse)"
      ]
    },
    "EDUCATION, COUNSELLING & LANGUAGE": {
      "category": "EDUCATION / WELFARE",
      "trades": [
        "Head Constable (Education & Stress Counsellor)",
        "Sub-Inspector (Hindi Translator)"
      ]
    }
  },
  "NATIONAL SECURITY GUARD (NSG)": {
    "SPECIAL ACTION GROUPS (SAG)": {
      "category": "COMMANDO / COUNTER-TERROR",
      "trades": [
        "51 SAG",
        "52 SAG"
      ]
    },
    "SPECIAL RANGER GROUPS (SRG)": {
      "category": "COMMANDO / SUPPORT",
      "trades": [
        "11 SRG",
        "12 and 13 SRG"
      ]
    },
    "SPECIAL COMPOSITE GROUPS (REGIONAL HUBS)": {
      "category": "REGIONAL RESPONSE",
      "trades": [
        "Regional Hubs (SCG)"
      ]
    },
    "SPECIALISED SKILLS": {
      "category": "SPECIALIST TRAINING",
      "trades": [
        "Sniper",
        "Close-Quarter Combat",
        "Counter-Drone Operations",
        "Bomb Disposal & Explosives Data"
      ]
    },
    "HOW TO JOIN (DEPUTATION)": {
      "category": "ENTRY ROUTE",
      "trades": [
        "From the Indian Army",
        "From CAPFs and Assam Rifles",
        "Selection & Training"
      ]
    }
  },
  "SASHASTRA SEEMA BAL (SSB)": {
    "GENERAL DUTY (BORDER)": {
      "category": "COMBAT / GENERAL DUTY",
      "trades": [
        "Constable (GD)"
      ]
    },
    "SPECIAL FUNCTIONS (POSTING OPTIONS)": {
      "category": "SPECIAL UNITS",
      "trades": [
        "Intelligence Wing",
        "Civic Action & Border Outreach"
      ]
    },
    "COMMUNICATION & TECHNICAL": {
      "category": "TECHNICAL",
      "trades": [
        "Constable (Driver)",
        "Head Constable (Communication)",
        "Head Constable (Electrician)",
        "Sub-Inspector (Communication)"
      ]
    },
    "PIONEER (ENGINEERING)": {
      "category": "ENGINEERING / PIONEER",
      "trades": [
        "Sub-Inspector (Pioneer)",
        "Constable (Carpenter)"
      ]
    },
    "TRADESMEN & MESS SERVICES": {
      "category": "TRADESMAN",
      "trades": [
        "Constable (Gardener)",
        "Constable (Water Carrier)",
        "Constable (Cobbler)",
        "Constable (Tailor)",
        "Constable (Washerman)",
        "Constable (Barber)",
        "Constable (Waiter)",
        "Head Constable (Steward)"
      ]
    },
    "VETERINARY": {
      "category": "VETERINARY",
      "trades": [
        "Constable (Veterinary)",
        "Head Constable (Veterinary)"
      ]
    },
    "MEDICAL & PARAMEDICAL": {
      "category": "MEDICAL / PARAMEDICAL",
      "trades": [
        "Constable (Nursing Orderly)",
        "Constable (Nursing Assistant)",
        "Head Constable (Laboratory Assistant)",
        "Head Constable (Physiotherapy Assistant)",
        "ASI (Radiographer)",
        "ASI (Pharmacist)",
        "ASI (Operation Theatre Technician)",
        "ASI (Dental Technician)",
        "Sub-Inspector (Staff Nurse)"
      ]
    }
  },
  "INDIAN COAST GUARD (ICG) \u2014 SAILORS (ENROLLED PERSONNEL)": {
    "NAVIK (GENERAL DUTY) \u2014 PAY LEVEL 3": {
      "category": "SAILOR / GENERAL DUTY",
      "trades": [
        "Navik (General Duty)"
      ]
    },
    "NAVIK (DOMESTIC BRANCH) \u2014 PAY LEVEL 3": {
      "category": "SAILOR / SUPPORT SERVICES",
      "trades": [
        "Cook",
        "Steward"
      ]
    },
    "YANTRIK \u2014 PAY LEVEL 5": {
      "category": "SAILOR / TECHNICAL",
      "trades": [
        "Yantrik (Mechanical)",
        "Yantrik (Electrical)",
        "Yantrik (Electronics / Telecommunication)"
      ]
    }
  }
};

export function resolveForceKey(forceIdentifier) {
  if (!forceIdentifier) return null;
  const target = String(forceIdentifier).trim().toLowerCase();
  
  for (const k of Object.keys(CAPF_HIERARCHY)) {
    if (k.toLowerCase() === target || k.toLowerCase().includes(target) || target.includes(k.toLowerCase())) {
      return k;
    }
  }
  
  for (const f of CAPF_FORCES) {
    if (
      (f.key && f.key.toLowerCase() === target) ||
      (f.code && f.code.toLowerCase() === target) ||
      (f.shortName && f.shortName.toLowerCase() === target) ||
      (f.fullName && f.fullName.toLowerCase() === target) ||
      (f.fullName && target.includes(f.fullName.toLowerCase())) ||
      (f.shortName && target.includes(f.shortName.toLowerCase()))
    ) {
      return f.key;
    }
  }
  return null;
}

/**
 * Returns branches/wings for a given force key or code.
 */
export function getCapfBranches(forceIdentifier) {
  const forceKey = resolveForceKey(forceIdentifier);
  if (!forceKey || !CAPF_HIERARCHY[forceKey]) return [];
  return Object.keys(CAPF_HIERARCHY[forceKey]);
}

/**
 * Returns trades for a given force and branch.
 */
export function getCapfTrades(forceIdentifier, branchName) {
  const forceKey = resolveForceKey(forceIdentifier);
  if (!forceKey || !CAPF_HIERARCHY[forceKey] || !branchName) return [];
  
  const targetBranch = String(branchName).trim().toLowerCase();
  for (const [bName, data] of Object.entries(CAPF_HIERARCHY[forceKey])) {
    if (bName.toLowerCase() === targetBranch || bName.toLowerCase().includes(targetBranch) || targetBranch.includes(bName.toLowerCase())) {
      return data.trades || [];
    }
  }
  return [];
}

/**
 * Returns category for a given branch in a force.
 */
export function getCapfBranchCategory(forceIdentifier, branchName) {
  const forceKey = resolveForceKey(forceIdentifier);
  if (!forceKey || !CAPF_HIERARCHY[forceKey] || !branchName) return '';
  
  const targetBranch = String(branchName).trim().toLowerCase();
  for (const [bName, data] of Object.entries(CAPF_HIERARCHY[forceKey])) {
    if (bName.toLowerCase() === targetBranch || bName.toLowerCase().includes(targetBranch) || targetBranch.includes(bName.toLowerCase())) {
      return data.category || '';
    }
  }
  return '';
}

/**
 * Checks if a branch is part of Paramilitary/CAPF/Coast Guard.
 */
export function isCapfBranch(serviceBranch) {
  if (!serviceBranch) return false;
  const s = serviceBranch.toLowerCase();
  return s.includes('paramilitary') || s.includes('capf') || s.includes('coast guard');
}
