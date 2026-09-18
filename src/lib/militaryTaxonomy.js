// Tri-Service Military Capability and Civilian Employability Taxonomy
// Extracted and unified from VeerNXT civilian transition specifications.

export const SERVICES = ['Indian Army', 'Indian Navy', 'Indian Air Force'];

export const RANK_OPTIONS = {
  'Indian Army': [
    'Agniveer', 'Sepoy', 'Naik', 'Havildar', 'Naib Subedar', 'Subedar', 'Subedar Major'
  ],
  'Indian Navy': [
    'Agniveer (SSR)', 'Agniveer (MR)', 'Seaman', 'Leading Seaman', 'Petty Officer', 'Chief Petty Officer', 'Master Chief Petty Officer'
  ],
  'Indian Air Force': [
    'Agniveervayu', 'Aircraftman', 'Leading Aircraftman', 'Corporal', 'Sergeant', 'Junior Warrant Officer', 'Warrant Officer', 'Master Warrant Officer'
  ]
};

export const SERVICE_TAXONOMY = {
  'Indian Army': {
    'INFANTRY': {
      category: 'COMBAT ARM',
      trades: [
        { name: 'Rifleman (Rifle/LMG)', description: 'Core infantry soldier. INSAS/AK-203 rifle, JVPC LMG.', caps: ['security', 'weapons'] },
        { name: 'MMG / HMG Gunner', description: 'PKM MMG and 12.7mm HMG operator for sustained fire support.', caps: ['equipment', 'weapons', 'safety'] },
        { name: 'Grenadier / UGL Operator', description: 'Under-barrel grenade launcher operator.', caps: ['equipment', 'weapons'] },
        { name: 'ATGM Operator', description: 'Anti-Tank Guided Missile: Konkurs, Milan, Spike.', caps: ['equipment', 'weapons'] },
        { name: 'Rocket Launcher Operator', description: 'RPG-7, Carl Gustaf 84mm against armour and fortifications.', caps: ['equipment', 'weapons'] },
        { name: 'Sniper', description: 'Long-range precision marksman: Dragunov SVD, Barak.', caps: ['weapons', 'security'] },
        { name: 'Signaller (Infantry)', description: 'Platoon/company radio operator: tactical radios.', caps: ['equipment', 'communications'] },
        { name: 'Pioneer (Infantry)', description: 'Mine laying/clearance, obstacle construction, basic demolitions.', caps: ['weapons', 'engineering', 'safety'] },
        { name: 'Combat Medic (Infantry)', description: 'Battlefield first aid and casualty evacuation.', caps: ['medical', 'safety'] },
        { name: 'Mortar Operator', description: '51mm and 81mm mortar operation: indirect fire support.', caps: ['equipment', 'weapons', 'safety'] },
        { name: 'MANPADS Operator', description: 'Igla-S against low-flying aircraft.', caps: ['equipment', 'aviation', 'weapons'] },
        { name: 'Recce Trooper', description: 'Forward reconnaissance: enemy positions and terrain.', caps: ['security', 'intelligence'] },
        { name: 'Dog Handler (Infantry)', description: 'Military patrol and explosive-detection dog operator.', caps: ['security', 'animals', 'safety'] },
        { name: 'Parachutist', description: 'HALO/HAHO/Static line qualified: Parachute Regiment.', caps: ['security', 'aviation'] }
      ]
    },
    'MECHANISED INFANTRY': {
      category: 'COMBAT ARM',
      trades: [
        { name: 'IFV Commander', description: 'Commands BMP-II / Sarath IFV.', caps: ['leadership', 'fleet', 'weapons'] },
        { name: 'IFV Gunner', description: '73mm gun and co-axial PKT MG operator.', caps: ['equipment', 'weapons'] },
        { name: 'IFV Driver', description: 'Drives and maintains BMP-II in all terrain.', caps: ['fleet', 'maintenance'] },
        { name: 'IFV Radio Operator / Loader', description: 'Radio, main gun loading, ammunition handling.', caps: ['equipment', 'weapons', 'communications'] },
        { name: 'Rifleman (Mech Inf)', description: 'Dismount soldier: fights from and around IFV.', caps: ['security', 'weapons'] },
        { name: 'LMG Gunner (Mech Inf)', description: 'Dismounted fire support after de-bussing.', caps: ['equipment', 'weapons', 'safety'] }
      ]
    },
    'ARMOURED CORPS': {
      category: 'COMBAT ARM',
      trades: [
        { name: 'Tank Commander', description: 'Commands T-90/T-72/Arjun MBT.', caps: ['leadership', 'fleet', 'weapons'] },
        { name: 'Tank Gunner', description: 'Main gun (125mm/120mm) and co-axial MG.', caps: ['equipment', 'weapons'] },
        { name: 'Tank Driver', description: 'MBT driver: all terrain including extreme altitude.', caps: ['fleet', 'maintenance'] },
        { name: 'Tank Radio Operator', description: 'Armoured formation radio nets.', caps: ['equipment', 'communications'] },
        { name: 'Recovery Operator', description: 'Armoured Recovery Vehicle (ARVE/BREM-1).', caps: ['fleet', 'equipment', 'maintenance'] }
      ]
    },
    'ARTILLERY': {
      category: 'COMBAT ARM',
      trades: [
        { name: 'Gunner (Field Artillery)', description: 'Bofors FH-77B, Dhanush 155mm, M777 ULH.', caps: ['equipment', 'weapons', 'safety'] },
        { name: 'Gunner (Self-Propelled)', description: 'K9 Vajra-T 155mm SPH operator.', caps: ['equipment', 'weapons', 'fleet'] },
        { name: 'Rocket Launcher Operator (MBRL)', description: 'Pinaka Multi-Barrel Rocket Launcher.', caps: ['equipment', 'weapons'] },
        { name: 'Survey Instrument Mechanic (SIM)', description: 'Theodolite, GPS, laser rangefinder for gun positioning.', caps: ['maintenance', 'weapons', 'survey', 'quality'] },
        { name: 'Sound Ranger / Radar Operator', description: 'Acoustic and radar detection of enemy artillery.', caps: ['equipment', 'intelligence', 'survey'] },
        { name: 'Signaller (Artillery)', description: 'Artillery radio nets: FOO and gun line.', caps: ['weapons', 'communications'] },
        { name: 'Ammunition Handler', description: 'Fusing, handling, and accounting of artillery ammunition.', caps: ['weapons', 'logistics', 'safety'] },
        { name: 'Driver (Artillery)', description: 'Gun towers and ammunition vehicles.', caps: ['fleet', 'weapons'] }
      ]
    },
    'AIR DEFENCE ARTILLERY': {
      category: 'COMBAT ARM',
      trades: [
        { name: 'Missile Operator (Akash/Spyder SAM)', description: 'Surface-to-air missile systems.', caps: ['equipment', 'weapons', 'safety'] },
        { name: 'Gun Operator (L70/ZU-23-2)', description: 'Anti-aircraft guns.', caps: ['equipment', 'weapons', 'aviation'] },
        { name: 'Radar Operator (AD)', description: 'Acquisition and tracking radars.', caps: ['equipment', 'communications', 'survey'] },
        { name: 'Missile Technician', description: 'SAM assembly, pre-fire checks, maintenance.', caps: ['maintenance', 'weapons', 'safety'] }
      ]
    },
    'ARMY AVIATION CORPS': {
      category: 'COMBAT ARM',
      trades: [
        { name: 'Aviation Mechanic (Engine)', description: 'Helicopter engines: Ardiden, Shakti, Turbomeca.', caps: ['maintenance', 'aviation', 'quality'] },
        { name: 'Aviation Mechanic (Airframe)', description: 'Rotor systems, hydraulics, undercarriage.', caps: ['maintenance', 'aviation'] },
        { name: 'Avionics Technician', description: 'Navigation, comms, displays, sensor systems.', caps: ['maintenance', 'aviation', 'communications'] },
        { name: 'ATC Operator (Army Aviation)', description: 'Controls aircraft at Army Aviation airfields.', caps: ['equipment', 'aviation', 'communications'] },
        { name: 'Ground Crew / Marshaller', description: 'Landing/takeoff guidance, refuelling, rearming.', caps: ['logistics', 'aviation', 'safety'] },
        { name: 'Crash Rescue Crew', description: 'Aircraft emergency response and fire fighting.', caps: ['aviation', 'safety', 'medical'] }
      ]
    },
    'SPECIAL FORCES': {
      category: 'COMBAT ARM: ELITE',
      trades: [
        { name: 'Special Forces Operator (Para SF)', description: 'Direct action, special recon, COIN.', caps: ['security', 'leadership', 'weapons'] },
        { name: 'Combat Diver', description: 'Maritime special operations, underwater insertion.', caps: ['equipment', 'maritime', 'safety'] },
        { name: 'HAHO / HALO Parachutist', description: 'High altitude parachute insertions.', caps: ['aviation', 'safety'] },
        { name: 'EOD Operator', description: 'IED and booby trap neutralisation.', caps: ['equipment', 'safety', 'engineering'] },
        { name: 'CQB Instructor', description: 'Breaching, room clearance, hostage rescue.', caps: ['leadership', 'safety', 'training'] }
      ]
    },
    'CORPS OF ENGINEERS': {
      category: 'COMBAT SUPPORT ARM',
      trades: [
        { name: 'Combat Engineer', description: 'Breaching, mine laying, field defences.', caps: ['weapons', 'engineering', 'safety'] },
        { name: 'Construction Engineer', description: 'Roads, bridges, military buildings.', caps: ['engineering', 'quality'] },
        { name: 'Bridge Builder / Pontoon Operator', description: 'Assault bridges and river crossings.', caps: ['equipment', 'engineering'] },
        { name: 'IED Disposal / EOD Operator', description: 'Improvised Explosive Device neutralisation.', caps: ['equipment', 'engineering', 'safety'] },
        { name: 'Survey Instrument Mechanic', description: 'Topographic survey: theodolite, GPS, laser.', caps: ['maintenance', 'engineering', 'survey', 'quality'] },
        { name: 'Electrician (Engineers)', description: 'Electrical systems in field and permanent areas.', caps: ['engineering', 'maintenance'] },
        { name: 'Water Purification Operator', description: 'ROWPU water purification systems.', caps: ['equipment', 'engineering'] }
      ]
    },
    'CORPS OF SIGNALS': {
      category: 'COMBAT SUPPORT ARM',
      trades: [
        { name: 'Radio Operator (Signaller)', description: 'Tactical radios, communication nets.', caps: ['equipment', 'communications'] },
        { name: 'Cable Layer (OFC)', description: 'Optical fibre cable laying and splicing.', caps: ['communications', 'engineering'] },
        { name: 'Cipher Operator', description: 'Encryption/decryption, secure comms.', caps: ['equipment', 'communications', 'security'] },
        { name: 'IT Operator / Network Admin', description: 'Military computer networks: AWAN.', caps: ['equipment', 'communications', 'engineering'] },
        { name: 'SATCOM Operator', description: 'VSAT and strategic satellite communication.', caps: ['equipment', 'communications'] },
        { name: 'Telecom Mechanic', description: 'Radios, telephones, exchanges: maintenance.', caps: ['maintenance', 'communications'] },
        { name: 'Cyber Operator', description: 'Cyber defence and network security operations.', caps: ['security', 'equipment', 'communications'] }
      ]
    },
    'ARMY SERVICE CORPS (ASC)': {
      category: 'CSS',
      trades: [
        { name: 'Driver MT (HMV)', description: 'Heavy military transport: 10-tonne trucks.', caps: ['fleet', 'logistics', 'safety'] },
        { name: 'Driver MT (LMV)', description: 'Light vehicles: Jonga, Gypsy, Tata, Mahindra.', caps: ['fleet', 'logistics'] },
        { name: 'Driver MT (MHE)', description: 'Forklifts, cranes, material handling equipment.', caps: ['fleet', 'equipment', 'logistics'] },
        { name: 'Supply Assistant', description: 'Rations, dry rations, clothing stores.', caps: ['logistics', 'administration'] },
        { name: 'POL Operator', description: 'Fuel depots, bulk fuel handling, pipeline ops.', caps: ['equipment', 'logistics', 'safety'] },
        { name: 'Stores Keeper (ASC)', description: 'Ration stores accounts and supply documentation.', caps: ['logistics', 'administration'] },
        { name: 'Cook / Catering', description: 'Field kitchens: meals for troops.', caps: ['hospitality'] }
      ]
    },
    'ARMY ORDNANCE CORPS (AOC)': {
      category: 'CSS',
      trades: [
        { name: 'Storekeeper Tech (General)', description: 'Clothing, equipment, general military stores.', caps: ['equipment', 'weapons', 'logistics'] },
        { name: 'Storekeeper Tech (Ammunition)', description: 'Weapons and ammunition storage and accounting.', caps: ['weapons', 'logistics', 'safety'] },
        { name: 'Vehicle Stores Operator', description: 'Spare parts for wheeled and tracked vehicles.', caps: ['fleet', 'equipment', 'logistics'] },
        { name: 'Computer Operator (AOC)', description: 'Computerised inventory: SAP-based.', caps: ['equipment', 'communications', 'logistics'] }
      ]
    },
    'ELECTRICAL AND MECHANICAL ENGINEERS (EME)': {
      category: 'CSS',
      trades: [
        { name: 'Artificer (Automobile)', description: 'Wheeled vehicles: trucks, jeeps, BMP.', caps: ['fleet', 'maintenance', 'engineering'] },
        { name: 'Artificer (Tracked / AFV)', description: 'Armoured vehicles: T-90, T-72, Arjun.', caps: ['fleet', 'maintenance', 'engineering'] },
        { name: 'Artificer (Armament)', description: 'Guns, mortars, RCLs, guided weapons.', caps: ['maintenance', 'weapons', 'engineering'] },
        { name: 'Artificer (Electronics)', description: 'Radar, night vision, fire control electronics.', caps: ['maintenance', 'weapons', 'engineering', 'safety'] },
        { name: 'Metalsmith / Welder', description: 'Welding, fabrication, metal repair.', caps: ['maintenance', 'engineering'] },
        { name: 'Machinist', description: 'Lathes, milling, CNC in base workshops.', caps: ['maintenance', 'engineering'] },
        { name: 'Generator Mechanic', description: 'DG sets 5 KVA to 500 KVA.', caps: ['maintenance', 'engineering'] },
        { name: 'Recovery Mechanic', description: 'Battlefield recovery and towing.', caps: ['fleet', 'maintenance', 'equipment'] }
      ]
    },
    'ARMY MEDICAL CORPS (AMC)': {
      category: 'CSS',
      trades: [
        { name: 'Nursing Assistant (NA)', description: 'Primary clinical care: RAP and field medical.', caps: ['medical', 'safety'] },
        { name: 'Pharmacist / Dispenser', description: 'Medicine dispensing and pharmaceutical stores.', caps: ['logistics', 'medical'] },
        { name: 'Laboratory Technician', description: 'Pathological and diagnostic tests.', caps: ['maintenance', 'medical', 'quality'] },
        { name: 'Radiographer', description: 'X-ray and imaging equipment.', caps: ['equipment', 'medical'] },
        { name: 'Ambulance Driver', description: 'Military ambulances for CASEVAC.', caps: ['fleet', 'medical', 'safety'] },
        { name: 'Sanitary Inspector / Hygiene Tech', description: 'Preventive medicine: water, sanitation, vectors.', caps: ['medical', 'safety'] }
      ]
    },
    'DEFENCE SECURITY CORPS (DSC)': {
      category: 'CSS',
      trades: [
        { name: 'Security Guard (Armed)', description: 'Armed security at military/defence installations.', caps: ['security', 'weapons'] },
        { name: 'Security Guard (Unarmed)', description: 'Unarmed guard and access control.', caps: ['security'] },
        { name: 'Security Supervisor / JCO', description: 'Guard platoon supervision.', caps: ['leadership', 'security'] }
      ]
    },
    'CORPS OF MILITARY POLICE (CMP)': {
      category: 'Combat Support',
      trades: [
        { name: 'Military Policeman (Provost)', description: 'Military law, discipline enforcement.', caps: ['security', 'leadership', 'logistics'] },
        { name: 'Traffic Controller', description: 'Military traffic control in operations.', caps: ['security', 'logistics', 'fleet'] },
        { name: 'Close Protection Officer (CPO)', description: 'Personal protection for senior officers.', caps: ['security', 'safety'] },
        { name: 'Dog Handler (CMP)', description: 'Patrol and drug/explosive detection dogs.', caps: ['security', 'animals', 'safety'] }
      ]
    }
  },

  'Indian Navy': {
    'EXECUTIVE BRANCH (Seamen)': {
      category: 'WARFARE / COMMAND',
      trades: [
        { name: 'Seaman (General Service)', description: 'Watchkeeping, lookout, helmsman, line handling, damage control.', caps: ['maritime', 'safety'] },
        { name: 'Quartermaster (QM)', description: 'Navigation instruments, helm, navigational watch.', caps: ['maritime', 'quality'] },
        { name: 'Signalman (Visual Comms)', description: 'Signal lamp, semaphore, visual communication.', caps: ['communications', 'maritime'] },
        { name: 'Regulating Petty Officer', description: 'Naval law, discipline, and order on board.', caps: ['leadership', 'security', 'maritime'] },
        { name: 'Physical Training Instructor', description: 'Fitness training, sports, swimming.', caps: ['leadership', 'training'] },
        { name: 'Cook / Steward', description: 'Galley operations, mess and catering services.', caps: ['maritime', 'hospitality'] },
        { name: 'Writer (Clerk)', description: 'Administrative and clerical duties: records on board.', caps: ['maritime', 'administration'] },
        { name: 'Stores Assistant', description: 'Onboard stores: victualling, clothing, spare parts.', caps: ['logistics', 'maritime'] }
      ]
    },
    'COMMUNICATIONS BRANCH': {
      category: 'COMMUNICATIONS & EW',
      trades: [
        { name: 'Radio Operator (Communication)', description: 'HF/VHF/UHF/SATCOM radio systems.', caps: ['equipment', 'communications', 'maritime'] },
        { name: 'Tele-Communication Mechanic', description: 'Maintains naval radio and electronic systems.', caps: ['maintenance', 'communications', 'maritime'] },
        { name: 'Radar Plotter', description: 'Radar systems for surveillance, navigation, fire control.', caps: ['weapons', 'communications', 'intelligence', 'maritime'] },
        { name: 'Electronic Warfare (EW) Operator', description: 'EW suites: detection, jamming, counter-jamming.', caps: ['equipment', 'communications', 'maritime'] },
        { name: 'Cipher Operator', description: 'Classified encryption/decryption.', caps: ['equipment', 'communications', 'security'] },
        { name: 'SATCOM Operator', description: 'Naval SATCOM terminals for strategic communication.', caps: ['equipment', 'communications', 'maritime'] }
      ]
    },
    'ENGINEERING BRANCH': {
      category: 'PROPULSION & ENGINEERING',
      trades: [
        { name: 'Engine Room Artificer (ERA)', description: 'Main propulsion: gas turbines, diesel, steam turbines.', caps: ['maintenance', 'engineering', 'maritime'] },
        { name: 'Electrical Artificer (EA)', description: 'Shipboard power: generators, switchboards, motors.', caps: ['maintenance', 'engineering', 'maritime'] },
        { name: 'Damage Control Operator', description: 'Flooding, fire fighting, ship survivability.', caps: ['equipment', 'engineering', 'maritime', 'safety'] },
        { name: 'Shipwright', description: 'Ship hull, structural integrity, underwater inspection.', caps: ['maintenance', 'engineering', 'maritime', 'quality'] },
        { name: 'Refrigeration & AC Mechanic', description: 'AC, refrigeration, cold storage on warships.', caps: ['maintenance', 'engineering', 'maritime'] },
        { name: 'Machinery Control Room Operator', description: 'Automated platform management systems.', caps: ['equipment', 'engineering', 'maritime'] }
      ]
    },
    'WEAPON BRANCH': {
      category: 'WEAPONS & ORDNANCE',
      trades: [
        { name: 'Gunner (Naval)', description: 'Ship-borne guns: 76mm OTO Melara, 30mm AK-630.', caps: ['equipment', 'weapons', 'maritime'] },
        { name: 'Missile Operator', description: 'Barak-8 SAM, BrahMos SSM systems.', caps: ['equipment', 'weapons', 'maritime'] },
        { name: 'Torpedo Operator', description: 'Torpedo launch systems and maintenance.', caps: ['equipment', 'maintenance', 'weapons', 'maritime'] },
        { name: 'Diver (Naval)', description: 'Underwater inspection, salvage, mine clearance.', caps: ['equipment', 'maritime', 'quality', 'safety'] },
        { name: 'Ordnance Artificer (OA)', description: 'Maintains naval weapons, guns, missiles, torpedoes.', caps: ['equipment', 'maintenance', 'weapons', 'maritime'] }
      ]
    },
    'NAVAL AIR ARM': {
      category: 'NAVAL AVIATION',
      trades: [
        { name: 'Aircraft Mechanic (Airframe/Engine)', description: 'Helicopter and patrol aircraft mechanics.', caps: ['maintenance', 'engineering', 'aviation', 'maritime'] },
        { name: 'Aircraft Mechanic (Avionics)', description: 'Naval aircraft avionics, radar, dipping sonar.', caps: ['maintenance', 'communications', 'aviation', 'maritime'] },
        { name: 'ATC Operator (Naval)', description: 'Air traffic control at Naval Air Stations.', caps: ['equipment', 'aviation', 'maritime'] },
        { name: 'Aircraft Marshaller / Flight Deck', description: 'Carrier flight deck ops: launch/recovery, refuelling.', caps: ['equipment', 'aviation', 'maritime', 'safety'] }
      ]
    },
    'SUBMARINE BRANCH': {
      category: 'SUBMARINE WARFARE',
      trades: [
        { name: 'Submarine Operator (General)', description: 'Qualified submariner: all submarine systems.', caps: ['equipment', 'maritime', 'safety'] },
        { name: 'Submarine Sonar Operator', description: 'Passive/active sonar detection and tracking.', caps: ['equipment', 'maritime', 'intelligence'] },
        { name: 'Submarine Electrical / ERA', description: 'Propulsion, battery banks, atmosphere scrubbers.', caps: ['maintenance', 'engineering', 'maritime'] }
      ]
    },
    'NAVAL MEDICAL BRANCH': {
      category: 'MEDICAL & DENTAL',
      trades: [
        { name: 'Sick Berth Attendant (SBA)', description: 'Primary medical care on ships and naval hospitals.', caps: ['medical', 'maritime', 'safety'] },
        { name: 'Pharmacist (Naval)', description: 'Medicine dispensing and medical stores.', caps: ['logistics', 'medical', 'maritime'] }
      ]
    },
    'SURVEY BRANCH (Hydrographic)': {
      category: 'SURVEY & OCEANOGRAPHY',
      trades: [
        { name: 'Survey Recorder', description: 'Hydrographic survey data, depth, tidal measurement.', caps: ['maritime', 'survey', 'weather', 'administration'] },
        { name: 'Hydrographic Surveyor', description: 'Marine survey using echo sounders, GPS, GIS.', caps: ['maritime', 'survey', 'quality'] }
      ]
    }
  },

  'Indian Air Force': {
    'GROUND DUTY TECHNICAL': {
      category: 'AIRCRAFT MAINTENANCE & TECHNICAL',
      trades: [
        { name: 'Airman (Air Engine Fitter)', description: 'Fighter and transport aircraft engine maintenance.', caps: ['maintenance', 'aviation', 'quality'] },
        { name: 'Airman (Airframe Fitter)', description: 'Structure, hydraulics, fuel systems maintenance.', caps: ['maintenance', 'logistics', 'aviation'] },
        { name: 'Airman (Avionics / Electrical Fitter)', description: 'Aircraft wiring, generators, electronic systems.', caps: ['maintenance', 'engineering', 'aviation'] },
        { name: 'Airman (Armament Fitter)', description: 'Aircraft weapons, missile pylons, bomb racks, fuzes.', caps: ['maintenance', 'weapons', 'aviation'] },
        { name: 'Airman (Radar / Radio Fitter)', description: 'Onboard radars, communication radios, IFF.', caps: ['maintenance', 'communications', 'aviation'] },
        { name: 'Airman (Mechanical Transport: Fitter)', description: 'IAF vehicles: crash tenders, fuel bowsers, trucks.', caps: ['fleet', 'maintenance', 'logistics'] },
        { name: 'Airman (Workshop Fitter)', description: 'Sheet metal, welding, machining, overhaul.', caps: ['maintenance', 'engineering'] },
        { name: 'Airman (Safety Equipment Fitter)', description: 'Ejection seats, parachutes, oxygen systems.', caps: ['equipment', 'maintenance', 'aviation', 'safety'] },
        { name: 'Airman (MT Driver)', description: 'Drives bowsers, towing tractors, crash tenders.', caps: ['fleet', 'logistics', 'safety'] }
      ]
    },
    'GROUND DUTY NON-TECHNICAL': {
      category: 'ADMINISTRATION / LOGISTICS',
      trades: [
        { name: 'Airman (Administration / Clerk)', description: 'Pay, documentation, correspondence, HR admin.', caps: ['administration'] },
        { name: 'Airman (Accounts)', description: 'Financial accounts, budget, audit, pension.', caps: ['quality', 'administration'] },
        { name: 'Airman (Stores: General / Tech)', description: 'Aviation technical stores and inventory control.', caps: ['logistics', 'aviation', 'administration'] },
        { name: 'Airman (Intelligence / Imagery)', description: 'Air intelligence, imagery analysis, mission support.', caps: ['intelligence', 'survey', 'administration'] }
      ]
    },
    'IAF REGIMENT (Ground Defence)': {
      category: 'AIRFIELD DEFENCE / SECURITY',
      trades: [
        { name: 'Airman (Regiment: Rifleman)', description: 'Defends airfields and bases from attack.', caps: ['security', 'aviation', 'weapons'] },
        { name: 'Airman (Regiment: LMG / MANPADS)', description: 'Perimeter defence and low-level air defence.', caps: ['security', 'weapons', 'aviation', 'safety'] },
        { name: 'Airman (Regiment: Dog Handler)', description: 'Explosive-detection and patrol dogs.', caps: ['security', 'animals', 'safety'] }
      ]
    },
    'IAF SIGNALS & RADAR': {
      category: 'COMMUNICATIONS & RADAR',
      trades: [
        { name: 'Airman (Radar Operator: Ground)', description: 'Air Defence surveillance radars: Rohini, Arudhra.', caps: ['equipment', 'communications', 'aviation'] },
        { name: 'Airman (Radio Operator / SATCOM)', description: 'Ground-to-air comms and satellite terminals.', caps: ['equipment', 'communications'] },
        { name: 'Airman (Signals: Telecom Mechanic)', description: 'Ground communication and exchange equipment.', caps: ['equipment', 'maintenance', 'communications'] }
      ]
    },
    'IAF FIRE SERVICES': {
      category: 'CRASH FIRE RESCUE',
      trades: [
        { name: 'Airman (Fire Fighter / Crash Rescue)', description: 'Aircraft crash rescue, ARFF vehicles, fuel fires.', caps: ['fleet', 'logistics', 'aviation', 'safety', 'medical'] },
        { name: 'Airman (Fire Fighting Mechanic)', description: 'Maintains crash tenders, foam systems, pumps.', caps: ['fleet', 'equipment', 'maintenance', 'safety'] }
      ]
    },
    'IAF MEDICAL BRANCH': {
      category: 'MEDICAL & DENTAL',
      trades: [
        { name: 'Airman (Medical Assistant)', description: 'Primary healthcare at Air Force stations.', caps: ['medical', 'safety'] },
        { name: 'Airman (Ambulance Driver)', description: 'Medical response vehicles and ambulances.', caps: ['fleet', 'medical', 'safety'] }
      ]
    },
    'METEOROLOGY BRANCH': {
      category: 'WEATHER SERVICES',
      trades: [
        { name: 'Airman (Meteorological Observer)', description: 'Weather instruments, synoptic observations, radar.', caps: ['communications', 'quality', 'weather', 'survey'] }
      ]
    }
  }
};

// 22 Shared Cross-Service Civilian Work Types
export const WORK_TYPES = [
  {
    id: 'wt_weapon',
    path: 'A',
    civil: 'Armed Security & Weapons Handling',
    civilDesc: 'Trained and experienced handling firearms and support weapons under strict safety protocols.',
    capKey: 'weapons',
    mil: {
      army: { label: 'Combat / Weapon System Operator', desc: 'Operated direct-fire or support weapon systems in field or combat roles.', covers: 'Rifleman, MMG/HMG, Grenadier, ATGM, Rocket Launcher, Sniper, Mortar' },
      navy: { label: 'Naval Gunnery & Missile Systems Operator', desc: 'Operated ship-borne or submarine weapon systems.', covers: 'Gunner (Naval), Missile Operator, Torpedo Operator' },
      airforce: { label: 'Airfield Defence Weapon Operator', desc: 'Ground-based weapon systems defending air installations.', covers: 'IAF Regiment Rifleman, LMG Gunner, MANPADS' }
    }
  },
  {
    id: 'wt_armour',
    path: 'A',
    civil: 'Heavy Vehicle & Specialised Equipment Crew',
    civilDesc: 'Crewing and operating heavy tracked, armoured or recovery vehicles.',
    capKey: 'equipment',
    mil: {
      army: { label: 'Armoured / Mechanised Platform Crew', desc: 'Served as commander, gunner, driver or operator on tanks or IFVs.', covers: 'Tank/IFV Commander, Driver, Gunner, Recovery Vehicle Operator' },
      navy: { label: 'Specialised Vessel & Heavy Machinery Crew', desc: 'Operated specialised marine heavy equipment and winches.', covers: 'Deck Machinery, Shipwright' },
      airforce: { label: 'Heavy Airfield Equipment Operator', desc: 'Operated runway repair, earth moving or heavy towing plant.', covers: 'Airman Works, MT Towing' }
    }
  },
  {
    id: 'wt_driver',
    path: 'A',
    civil: 'Professional Driving (Light, Heavy or Specialised)',
    civilDesc: 'Licensed and experienced operating light vehicles, heavy commercial trucks, or material handling equipment.',
    capKey: 'fleet',
    mil: {
      army: { label: 'Driver, Motor Transport (MT)', desc: 'Driven LMV, HMV, convoy towing or specialised material handling vehicles.', covers: 'Driver MT (LMV/HMV/MHE), Ambulance Driver' },
      navy: { label: 'Naval Transport & Handling Driver', desc: 'Operated naval station transport, heavy tenders, and cargo vehicles.', covers: 'Base Transport Driver, Forklift Operator' },
      airforce: { label: 'Air Force MT & Specialized Bowser Driver', desc: 'Driven fuel bowsers, crash tenders, towing tractors, heavy trucks.', covers: 'Airman MT Driver, Aircraft Towing' }
    }
  },
  {
    id: 'wt_maint',
    path: 'A',
    civil: 'Technical Maintenance, Diagnostics & Repair',
    civilDesc: 'Hands-on experience maintaining and overhauling vehicles, electronics, hydraulics, or machinery.',
    capKey: 'maintenance',
    mil: {
      army: { label: 'Equipment Maintenance & EME Artificer', desc: 'Repaired arms, tracked/wheeled vehicles, radar, electronics, or DG sets.', covers: 'EME Artificer trades, Armament Artificer, Metalsmith, Machinist' },
      navy: { label: 'Marine Engineering & Technical Maintenance', desc: 'Maintained ship propulsion, electrical, weapon, or aircraft systems.', covers: 'Engine Room Artificer (ERA), Electrical Artificer (EA), Shipwright' },
      airforce: { label: 'Aircraft & Ground Equipment Maintenance', desc: 'Maintained aircraft engines, airframes, avionics, radar, or workshop machines.', covers: 'Air Engine Fitter, Airframe Fitter, Avionics Fitter, Workshop Fitter' }
    }
  },
  {
    id: 'wt_comms',
    path: 'A',
    civil: 'Communications, Networks & IT Infrastructure Support',
    civilDesc: 'Operating, configuring, and repairing radio, optical fibre, satellite, or computer network systems.',
    capKey: 'communications',
    mil: {
      army: { label: 'Corps of Signals Comms / IT Operator', desc: 'Operated tactical radio nets, satellite links, cipher, and military LAN/WAN.', covers: 'Signaller, Radio Operator, SATCOM, Cyber Operator, Telecom Mechanic' },
      navy: { label: 'Naval Communications & EW Specialist', desc: 'Operated shipboard/shore radio, radar plotting, EW suites, and SATCOM.', covers: 'Radio Operator, Radar Plotter, EW Operator, SATCOM' },
      airforce: { label: 'Air Defence Comms & Ground Radar Operator', desc: 'Operated Air Defence radars, ground-to-air radio, and station telecom.', covers: 'Radar Operator (Ground), Radio Operator, Signals Telecom' }
    }
  },
  {
    id: 'wt_store',
    path: 'A',
    civil: 'Inventory, Warehouse & Supply Chain Operations',
    civilDesc: 'Managing storehouses, equipment receipt/dispatch, barcode/ERP inventory accounting, and stock audits.',
    capKey: 'logistics',
    mil: {
      army: { label: 'Storekeeper / Supply Depot Operator', desc: 'Managed clothing, ammunition, spare parts, rations, or POL inventory.', covers: 'Storekeeper Tech (AOC), Supply Assistant (ASC), POL Operator' },
      navy: { label: 'Naval Stores & Victualling Management', desc: 'Managed onboard or shore naval stores, spare parts, and supply accounts.', covers: 'Stores Assistant, Air Stores Accountant' },
      airforce: { label: 'Air Force Stores & Spare Parts Handling', desc: 'Managed technical aircraft rotables, general stores, and ERP accounts.', covers: 'Airman Stores (General/Technical)' }
    }
  },
  {
    id: 'wt_engineer',
    path: 'A',
    civil: 'Construction, Infrastructure & Facilities Engineering',
    civilDesc: 'Building, inspecting, or maintaining physical infrastructure, electrical installations, roads, or bridges.',
    capKey: 'engineering',
    mil: {
      army: { label: 'Field Engineering & Construction (MES/Engineers)', desc: 'Built roads, bridges, field fortifications, electrical and water supply.', covers: 'Combat Engineer, Bridge Builder, Electrician, Carpenter, Draughtsman' },
      navy: { label: 'Shipwright & Marine Structural Upkeep', desc: 'Maintained hull structural integrity, carpentry, and shipyard repair.', covers: 'Shipwright, Hull Technician' },
      airforce: { label: 'Airfield Infrastructure & Works Services', desc: 'Maintained airfield electrical, AC/refrigeration, and civil facilities.', covers: 'Airman Works (Electrical/Civil), DG Set Operator' }
    }
  },
  {
    id: 'wt_eod',
    path: 'A',
    civil: 'Explosives Safety, Demolitions & Hazard Response',
    civilDesc: 'Specialised experience in explosive ordnance disposal, hazardous materials, and industrial demolitions.',
    capKey: 'safety',
    mil: {
      army: { label: 'Explosives & Mine Clearance (EOD)', desc: 'Handled mine clearance, IED disposal, obstacle breaching, demolitions.', covers: 'IED Disposal/EOD Operator, Mine Clearance' },
      navy: { label: 'Naval Mine Warfare & Damage Control', desc: 'Handled sea mines, torpedoes, and shipboard NBC decontamination.', covers: 'Mine Warfare, Damage Control Operator' },
      airforce: { label: 'Airfield Hazard, CBRN & Bomb Disposal', desc: 'Handled airfield unexploded ordnance, CBRN, and safety hazard disposal.', covers: 'Regiment NBC Operator, Crash Rescue' }
    }
  },
  {
    id: 'wt_guard',
    path: 'A',
    civil: 'Physical Security, Surveillance & Access Control',
    civilDesc: 'Armed or unarmed perimeter security, access control, CCTV monitoring, and vigilance.',
    capKey: 'security',
    mil: {
      army: { label: 'Guard, Sentry & Military Police Duties', desc: 'Station perimeter security, VIP escort, access control, traffic enforcement.', covers: 'DSC Security Guard, Military Policeman, Close Protection' },
      navy: { label: 'Naval Security & Discipline (Provost)', desc: 'Enforced naval base security, naval police, dockyard access control.', covers: 'Regulating Petty Officer, Base Security' },
      airforce: { label: 'Airfield Perimeter Defence & Ground Security', desc: 'Perimeter defence, quick reaction teams, access control at air bases.', covers: 'IAF Regiment Rifleman, Security Platoon' }
    }
  },
  {
    id: 'wt_medical',
    path: 'A',
    civil: 'Clinical, Paramedical & Laboratory Support',
    civilDesc: 'Providing nursing, pharmacy, pathology laboratory, radiography, or dental clinic support.',
    capKey: 'medical',
    mil: {
      army: { label: 'AMC Nursing / Paramedical Assistant', desc: 'Primary clinical care, hospital wards, pharmacy, diagnostic lab.', covers: 'Nursing Assistant (NA), Pharmacist, Lab Tech, Radiographer' },
      navy: { label: 'Naval Medical & Sick Berth Duties', desc: 'Primary care aboard ships, naval hospitals, pathology, dispensing.', covers: 'Sick Berth Attendant (SBA), Naval Lab Tech' },
      airforce: { label: 'Air Force Medical Assistant', desc: 'Primary healthcare and medical testing at Air Force stations.', covers: 'Airman Medical Assistant, Lab Technician' }
    }
  },
  {
    id: 'wt_medic',
    path: 'A',
    civil: 'Emergency Medical Response & Patient Transport',
    civilDesc: 'First aid, trauma stabilization, patient evacuation, and emergency ambulance operations.',
    capKey: 'medical',
    mil: {
      army: { label: 'Combat Medic / Casualty Evacuation', desc: 'Field first aid, casualty evacuation (CASEVAC), trauma care under fire.', covers: 'Combat Medic, Stretcher Bearer, Ambulance Driver' },
      navy: { label: 'Emergency First Response & Shipboard Medic', desc: 'Immediate trauma response for burns, smoke inhalation, and ship casualties.', covers: 'Sick Berth Attendant, Damage Control First Aid' },
      airforce: { label: 'Emergency Medical & Crash Response', desc: 'Flight line medical response and station ambulance operations.', covers: 'Airman Ambulance Driver / Medic' }
    }
  },
  {
    id: 'wt_catering',
    path: 'A',
    civil: 'Institutional Catering, Kitchen & Hospitality Management',
    civilDesc: 'Large-scale food preparation, hygiene standards, dining facility management, and storekeeping.',
    capKey: 'hospitality',
    mil: {
      army: { label: 'ASC Catering & Messing', desc: 'Troop kitchens, mess operations, ration planning, field cookery.', covers: 'Cook, Chef, Baker, Water Supply Operator' },
      navy: { label: 'Naval Galley & Mess Services', desc: 'Shipboard galley operations, wardroom hospitality, canteen.', covers: 'Naval Cook, Steward, Canteen Manager' },
      airforce: { label: 'Air Force Mess & Catering Support', desc: 'Station mess management, food preparation, dining hygiene.', covers: 'Airman Cook, Steward, Mess Manager' }
    }
  },
  {
    id: 'wt_animal',
    path: 'A',
    civil: 'K9 Handling, Animal Care & Security Patrols',
    civilDesc: 'Training, handling, and caring for patrol, search-and-rescue, or explosive-detection working dogs.',
    capKey: 'animals',
    mil: {
      army: { label: 'RVC / Infantry Dog Handler', desc: 'Handled military patrol, tracking, and explosive-detection dogs.', covers: 'Dog Handler (RVC/Infantry), Farrier, Veterinary Asst' },
      navy: { label: 'Naval Base K9 Handler', desc: 'Handled explosive detection and patrol dogs at naval bases.', covers: 'Dog Handler' },
      airforce: { label: 'Airfield K9 Patrol Handler', desc: 'Handled perimeter patrol and sniffing dogs for base defence.', covers: 'Regiment Dog Handler' }
    }
  },
  {
    id: 'wt_aviation',
    path: 'A',
    civil: 'Airport Ramp, Flight Line & Ground Handling Support',
    civilDesc: 'Aircraft marshalling, ramp safety, ground support equipment, baggage/cargo rigging, and airside logistics.',
    capKey: 'aviation',
    mil: {
      army: { label: 'Army Aviation Ground Support', desc: 'Helicopter landing grounds, refuelling, arming, cargo slinging.', covers: 'Ground Crew, Marshaller, Air Despatch Rigger' },
      navy: { label: 'Flight Deck & Naval Air Station Ground Crew', desc: 'Carrier flight deck operations, launch/arresting gear, marshalling.', covers: 'Aircraft Marshaller, Flight Deck Operator, Air Stores' },
      airforce: { label: 'Airfield Flight Line & Air Traffic Support', desc: 'Flight line handling, towing, ramp safety, parachute rigging.', covers: 'Ground Handling, Marshaller, Parachute Packer' }
    }
  },
  {
    id: 'wt_survey',
    path: 'A',
    civil: 'Surveying, GIS Mapping & Technical Instrumentation',
    civilDesc: 'Operating total stations, GPS survey instruments, laser rangefinders, weather sensors, and mapping.',
    capKey: 'survey',
    mil: {
      army: { label: 'Artillery / Engineer Survey & Met Operator', desc: 'Operated theodolites, laser instruments, ballistics radar, mapping.', covers: 'Survey Instrument Mechanic (SIM), Sound Ranger, Met Radar' },
      navy: { label: 'Hydrographic Survey & Oceanographic Observer', desc: 'Conducted depth soundings, bathymetry, nautical chart preparation.', covers: 'Survey Recorder, Hydrographic Surveyor' },
      airforce: { label: 'Meteorological Observer & Radar Plotter', desc: 'Operated weather radars, synoptic plotting, atmospheric sensors.', covers: 'Meteorological Observer, Radar Plotter' }
    }
  },
  {
    id: 'wt_seamanship',
    path: 'A',
    civil: 'Marine Vessel Operations, Deck Duties & Port Handling',
    civilDesc: 'Watchkeeping, helm operation, line handling, vessel upkeep, port safety, and small boat operations.',
    capKey: 'maritime',
    mil: {
      navy: { label: 'Seamanship & Bridge Watchkeeping', desc: 'Performed navigation watch, helm, line handling, boat work on warships.', covers: 'Seaman (General Service), Quartermaster (QM)' },
      army: { label: 'Inland Water Transport / Pontoon Operator', desc: 'Operated river craft, assault boats, pontoon ferries.', covers: 'Engineers Boat Operator' }
    }
  },
  {
    id: 'wt_command',
    path: 'B',
    civil: 'Frontline Team Leadership, Shift & Crew Supervision',
    civilDesc: 'Directly commanded or supervised a team, section, crew, or shift; responsible for task execution, discipline, and safety.',
    capKey: 'leadership',
    mil: {
      army: { label: 'Section / Platoon Commander / JCO', desc: 'Commanded a section (10 men), platoon (30 men), or shift in field/ops.', covers: 'Section Commander, Platoon Havildar, Naib Subedar, Subedar' },
      navy: { label: 'Naval Petty Officer / Watch Supervisor', desc: 'Supervised a department, division, or watch crew aboard ship.', covers: 'Petty Officer, Chief Petty Officer' },
      airforce: { label: 'Airman Section In-Charge / NCO', desc: 'Supervised a flight line section, maintenance bay, or shift.', covers: 'Corporal, Sergeant, Junior Warrant Officer, Warrant Officer' }
    }
  },
  {
    id: 'wt_instructor',
    path: 'B',
    civil: 'Training, Instruction & Technical Skill Delivery',
    civilDesc: 'Delivered structured training in technical trades, safety drills, vehicle operation, or physical conditioning.',
    capKey: 'training',
    mil: {
      army: { label: 'Instructor / Training Cadre', desc: 'Taught recruits or trained soldiers in weapon handling, driving, physical training, or technical trades.', covers: 'Education Havildar, Vocational Instructor, PTI' },
      navy: { label: 'Naval Training Instructor', desc: 'Instructed junior sailors at INS Chilka, INS Shivaji, or specialty schools.', covers: 'Physical Training Instructor, Communication Instructor' },
      airforce: { label: 'Air Force Training Instructor', desc: 'Delivered technical trade or physical training at IAF training schools.', covers: 'Airman Education Instructor, PTI' }
    }
  },
  {
    id: 'wt_admin',
    path: 'B',
    civil: 'Office Administration, Records & Payroll Management',
    civilDesc: 'Maintaining personnel records, payroll processing, official correspondence, compliance, and office management.',
    capKey: 'administration',
    mil: {
      army: { label: 'Clerk / Pay Accountant (SD/GD)', desc: 'Handled battalion documentation, pay ledgers, service records, audit.', covers: 'Clerk SD, Pay Accountant, Cashier, Postal Assistant' },
      navy: { label: 'Naval Writer / Pay & Accounts', desc: 'Processed ship company documentation, pay, allowances, service books.', covers: 'Writer (Clerk), Pay & Accounts Writer' },
      airforce: { label: 'Air Force Administration & Accounts', desc: 'Handled station administration, documentation, pay, and audit papers.', covers: 'Airman Administration, Airman Accounts' }
    }
  },
  {
    id: 'wt_facility',
    path: 'B',
    civil: 'Facility, Stores & Site In-Charge / Quartermaster',
    civilDesc: 'Accountable custodian of a site, facility, warehouse, or equipment depot including maintenance and asset register.',
    capKey: 'leadership',
    mil: {
      army: { label: 'Quartermaster / Facility In-Charge', desc: 'Held formal charge of building, barracks, arms kote, or supply yard.', covers: 'Quartermaster Havildar, Kote NCO, Facility Supervisor' },
      navy: { label: 'Ship / Shore Facility In-Charge', desc: 'Held accountable charge of naval departmental stores, mess, or depot.', covers: 'Senior Stores In-Charge, Galley Supervisor' },
      airforce: { label: 'Hangar / Facility Supervisor', desc: 'Supervised airfield hangars, equipment rooms, or mess facilities.', covers: 'Hangar In-Charge, Mess Manager' }
    }
  },
  {
    id: 'wt_intel',
    path: 'B',
    civil: 'Risk Investigation, Vigilance & Information Analysis',
    civilDesc: 'Conducting investigations, background vetting, data collection, loss analysis, and reporting.',
    capKey: 'intelligence',
    mil: {
      army: { label: 'Intelligence Corps / SIB Investigator', desc: 'Gathered information, conducted security vetting, investigated incidents.', covers: 'HUMINT/SIGINT Operator, SIB Investigator, Counter Intel' },
      navy: { label: 'Naval Intelligence & Base Security Vetting', desc: 'Assessed security threats, conducted personnel vetting and reporting.', covers: 'Naval Intelligence Support' },
      airforce: { label: 'Air Intelligence & Imagery Interpretation', desc: 'Processed mission imagery, reconnaissance data, and security vetting.', covers: 'Airman Intelligence, Airman Imagery' }
    }
  }
];

// Sector-to-Work-Type relevance mapping for employer role requirements & smart filtering
export const SECTOR_CAPABILITY_MAP = {
  it_telecom: ['wt_comms', 'wt_intel', 'wt_maint', 'wt_admin', 'wt_survey', 'wt_command', 'wt_instructor'],
  security_defence: ['wt_guard', 'wt_weapon', 'wt_intel', 'wt_animal', 'wt_eod', 'wt_command', 'wt_facility', 'wt_instructor', 'wt_comms'],
  logistics_transport: ['wt_store', 'wt_driver', 'wt_facility', 'wt_armour', 'wt_command', 'wt_admin', 'wt_aviation'],
  engineering_manufacturing: ['wt_maint', 'wt_engineer', 'wt_armour', 'wt_survey', 'wt_facility', 'wt_command', 'wt_instructor'],
  admin_facilities: ['wt_facility', 'wt_admin', 'wt_guard', 'wt_engineer', 'wt_store', 'wt_command', 'wt_catering'],
  aviation_marine: ['wt_aviation', 'wt_seamanship', 'wt_maint', 'wt_comms', 'wt_survey', 'wt_medic', 'wt_command'],
  healthcare_hospitality: ['wt_medical', 'wt_medic', 'wt_catering', 'wt_driver', 'wt_facility', 'wt_command'],
  corporate_sales: ['wt_admin', 'wt_intel', 'wt_command', 'wt_instructor', 'wt_comms', 'wt_driver']
};

export const SECTOR_DEFAULT_CAPS = {
  it_telecom: { essential: ['wt_comms'], desired: ['wt_intel'] },
  security_defence: { essential: ['wt_guard'], desired: ['wt_command'] },
  logistics_transport: { essential: ['wt_store', 'wt_driver'], desired: ['wt_facility'] },
  engineering_manufacturing: { essential: ['wt_maint'], desired: ['wt_engineer'] },
  admin_facilities: { essential: ['wt_facility', 'wt_admin'], desired: ['wt_command'] },
  aviation_marine: { essential: ['wt_aviation'], desired: ['wt_maint'] },
  healthcare_hospitality: { essential: ['wt_medical'], desired: ['wt_medic'] },
  corporate_sales: { essential: ['wt_admin'], desired: ['wt_command'] }
};

export function resolveSectorKey(sectorLabelOrId) {
  if (!sectorLabelOrId) return null;
  const s = String(sectorLabelOrId).trim().toLowerCase();
  if (s.includes('it') || s.includes('telecom') || s.includes('software')) return 'it_telecom';
  if (s.includes('security') || s.includes('defence') || s.includes('surveillance')) return 'security_defence';
  if (s.includes('logistic') || s.includes('transport') || s.includes('supply chain')) return 'logistics_transport';
  if (s.includes('engineer') || s.includes('manufacturing') || s.includes('technical')) return 'engineering_manufacturing';
  if (s.includes('facility') || s.includes('admin') || s.includes('operations')) return 'admin_facilities';
  if (s.includes('aviation') || s.includes('marine') || s.includes('aerospace')) return 'aviation_marine';
  if (s.includes('health') || s.includes('hospitality') || s.includes('emergency')) return 'healthcare_hospitality';
  if (s.includes('corporate') || s.includes('hr') || s.includes('sales')) return 'corporate_sales';
  return null;
}

export function getRecommendedWorkTypeIds(sectorLabelOrId) {
  const key = resolveSectorKey(sectorLabelOrId);
  return key && SECTOR_CAPABILITY_MAP[key] ? SECTOR_CAPABILITY_MAP[key] : WORK_TYPES.map((w) => w.id);
}

export function getRecommendedWorkTypes(sectorLabelOrId) {
  const ids = new Set(getRecommendedWorkTypeIds(sectorLabelOrId));
  return WORK_TYPES.filter((w) => ids.has(w.id));
}


// Duty Evidence Groups
export const DUTY_GROUPS = {
  leadership: {
    title: 'Team Leadership and Supervision',
    civil: 'Frontline supervision & shift leadership',
    items: [
      'Buddy pair or small-team leader',
      'Section, platoon or crew commander',
      'Detachment commander',
      'Vehicle or equipment commander',
      'Shift supervisor',
      'Security supervisor',
      'Workshop or technical supervisor',
      'Stores or logistics supervisor',
      'Training supervisor',
      'Administrative supervisor',
      'Personnel welfare and discipline',
      'Task planning and allocation',
      'Performance monitoring and reporting',
      'Coordination with multiple teams'
    ]
  },
  security: {
    title: 'Field Operations, Security and Protection',
    civil: 'Security, surveillance & incident response',
    items: [
      'Field and operational duties',
      'Guard and sentry duties',
      'Access control',
      'Perimeter security',
      'Patrolling',
      'Observation and surveillance',
      'Reconnaissance',
      'Quick-reaction duties',
      'Convoy protection',
      'Installation security',
      'Close protection',
      'Control-room duties',
      'Crowd and traffic management',
      'Incident response',
      'Search operations'
    ]
  },
  fleet: {
    title: 'Driving, Fleet and Transport Operations',
    civil: 'Fleet, transport & material handling',
    items: [
      'Light motor vehicles (LMV)',
      'Heavy motor vehicles (HMV)',
      'Passenger vehicles',
      'Ambulances',
      'Fuel or POL tankers',
      'Water tankers',
      'Specialist military vehicles',
      'Material-handling equipment (MHE)',
      'Cranes and forklifts',
      'Earth moving equipment',
      'Tracked vehicles',
      'Armoured fighting vehicles',
      'Recovery vehicles',
      'Route planning',
      'Convoy movement',
      'Fleet scheduling',
      'Driver supervision'
    ]
  },
  maintenance: {
    title: 'Technical Maintenance, Diagnostics & Overhaul',
    civil: 'Plant, vehicle & equipment maintenance',
    items: [
      'Light vehicle maintenance',
      'Heavy vehicle maintenance',
      'Tracked vehicle maintenance',
      'Hydraulic and pneumatic systems',
      'Small-arms maintenance',
      'Artillery or weapon system maintenance',
      'Radio and telecom maintenance',
      'Radar or electronics maintenance',
      'Optical instrument repair',
      'Engine maintenance',
      'Generator maintenance',
      'Welding and fabrication',
      'Machining or lathe work',
      'Electrical installation and repair',
      'Preventive maintenance',
      'Fault diagnosis and troubleshooting',
      'Aircraft engine maintenance',
      'Airframe maintenance',
      'Avionics maintenance'
    ]
  },
  weapons: {
    title: 'Weapons Handling & Safety Protocols',
    civil: 'Safety-critical protocol execution',
    items: [
      'Individual weapon handling',
      'Crew-served weapon operation',
      'Mortar operation',
      'Artillery gun operation',
      'Precision or sniper duties',
      'Fire-control duties',
      'Observation and target acquisition',
      'Weapon safety & range drills',
      'Ammunition handling',
      'Ammunition storage & accounting'
    ]
  },
  communications: {
    title: 'Communications, Networks & Cyber',
    civil: 'Telecom, networks & IT support',
    items: [
      'Radio communication',
      'Field telephone systems',
      'Optical-fibre cable laying & splicing',
      'Satellite communication (VSAT)',
      'Network administration',
      'Computer operations',
      'Hardware support',
      'Software or application support',
      'Cybersecurity operations',
      'Signal monitoring',
      'Secure communication / encryption',
      'User helpdesk & troubleshooting'
    ]
  },
  logistics: {
    title: 'Logistics, Stores and Supply Chain',
    civil: 'Warehouse, inventory & dispatch management',
    items: [
      'General stores',
      'Technical stores',
      'Vehicle spare parts',
      'Ration stores',
      'Medical or pharmaceutical stores',
      'Ammunition stores',
      'Fuel and lubricant stores',
      'Warehouse operations',
      'Receipt and issue of material',
      'Inventory accounting',
      'Stock verification & audit',
      'Procurement support',
      'Dispatch and distribution',
      'Computerised inventory systems',
      'Store or warehouse supervision'
    ]
  },
  engineering: {
    title: 'Engineering, Construction & Infrastructure',
    civil: 'Construction, civil & facilities operations',
    items: [
      'Road construction',
      'Building construction',
      'Bridge construction',
      'Field fortifications',
      'Earthwork and excavation',
      'Airfield construction',
      'Electrical installation',
      'Water supply or purification',
      'Plumbing or drainage',
      'Carpentry and formwork',
      'Welding and fabrication',
      'Surveying',
      'Draughtsmanship',
      'Infrastructure maintenance',
      'Worksite supervision',
      'Quality inspection'
    ]
  },
  aviation: {
    title: 'Aviation Ground Support & Airside Safety',
    civil: 'Aviation ground & airside operations',
    items: [
      'Flight-line duties',
      'Ground handling',
      'Aircraft marshalling',
      'Aircraft refuelling',
      'Air-traffic support',
      'Airfield operations',
      'Aviation safety',
      'Aircraft fire and rescue',
      'Air despatch & cargo slinging',
      'Parachute packing',
      'Aircraft maintenance support',
      'Aviation tool control'
    ]
  },
  medical: {
    title: 'Medical, Healthcare and Emergency Response',
    civil: 'Emergency response, clinical & paramedical support',
    items: [
      'First aid & Basic Life Support (BLS)',
      'Combat first aid & trauma triage',
      'Casualty evacuation (CASEVAC)',
      'Ambulance duties',
      'Patient-care assistance',
      'Nursing assistance',
      'Pharmacy & dispensary management',
      'Laboratory testing',
      'Radiography / X-ray',
      'Sterilisation & OT assistance',
      'Wound dressing',
      'Sanitation & hygiene inspection',
      'Emergency response'
    ]
  },
  administration: {
    title: 'Administration, Accounts and Records',
    civil: 'Business administration & records management',
    items: [
      'Personnel administration',
      'Office administration',
      'Record keeping & filing',
      'Data entry',
      'Computer operations',
      'Official correspondence & drafting',
      'Report preparation',
      'Pay and allowance processing',
      'Accounts and ledger maintenance',
      'Cash handling',
      'Audit assistance',
      'Pension processing',
      'Office supervision'
    ]
  },
  training: {
    title: 'Training, Instruction & Physical Coaching',
    civil: 'Training delivery & workforce development',
    items: [
      'Recruit instruction',
      'Trade instruction',
      'Equipment instruction',
      'Weapon instruction',
      'Driving instruction',
      'Technical training',
      'Classroom teaching',
      'On-the-job training',
      'Physical training & fitness',
      'Sports coaching',
      'Lesson preparation',
      'Mentoring junior personnel'
    ]
  },
  animals: {
    title: 'Animal Care & Working K9 Duties',
    civil: 'K9 handling & animal care',
    items: [
      'Dog handling',
      'Dog training',
      'Kennel management',
      'Explosive-detection dog duties',
      'Search-and-rescue dog duties',
      'Horse handling & stable management',
      'Veterinary assistance',
      'Farrier duties'
    ]
  },
  hospitality: {
    title: 'Food Service, Catering & Hospitality',
    civil: 'Catering & food facility operations',
    items: [
      'Cooking',
      'Field-kitchen operations',
      'Baking',
      'Food storage & hygiene',
      'Mess services',
      'Catering support',
      'Menu and ration planning',
      'Food-safety standards',
      'Kitchen supervision',
      'Canteen or retail management'
    ]
  },
  maritime: {
    title: 'Marine Vessel Operations & Deck Duties',
    civil: 'Marine, port & vessel operations',
    items: [
      'Shipboard watchkeeping',
      'Lookout and bridge support',
      'Helm or quartermaster duties',
      'Line handling and seamanship',
      'Small boat operations',
      'Flight-deck support',
      'Engine-room watchkeeping',
      'Damage control & ship survivability',
      'Port or harbour support'
    ]
  },
  safety: {
    title: 'Industrial Safety, Fire & Hazard Management',
    civil: 'EHS, firefighting & industrial safety',
    items: [
      'Structural firefighting',
      'Industrial crash rescue',
      'Fuel-fire response',
      'Shipboard firefighting',
      'Hazard identification',
      'Permit-to-work awareness',
      'Safety drills & evacuation',
      'PPE inspection',
      'Incident reporting'
    ]
  },
  quality: {
    title: 'Quality Assurance, Calibration & Technical Assurance',
    civil: 'Quality assurance & compliance inspection',
    items: [
      'Pre-use inspection',
      'Preventive inspection',
      'Technical documentation',
      'Tool calibration',
      'Fault reporting',
      'Maintenance quality checks',
      'Stores quality verification',
      'Audit support'
    ]
  },
  survey: {
    title: 'Surveying, GIS & Technical Instrumentation',
    civil: 'Surveying, GIS & geospatial data',
    items: [
      'Land survey support',
      'Hydrographic depth measurement',
      'GPS field survey',
      'Survey instrument operation',
      'Chart or drawing preparation',
      'Draughtsmanship',
      'GIS data recording'
    ]
  },
  weather: {
    title: 'Meteorology & Environmental Observation',
    civil: 'Weather & environmental monitoring',
    items: [
      'Weather observation',
      'Meteorological instrument operation',
      'Synoptic chart plotting',
      'Doppler radar support',
      'Environmental monitoring'
    ]
  },
  intelligence: {
    title: 'Risk Investigation & Information Analysis',
    civil: 'Information analysis & vigilance',
    items: [
      'Observation and surveillance',
      'Information collection & reporting',
      'Security vetting',
      'Incident investigation',
      'Interviewing and debriefing',
      'Confidential-record handling'
    ]
  }
};

// Recognized Civil Licences & Certifications
export const QUALIFICATION_AREAS = {
  'Civil Driving & Machinery Licences': [
    'Civil LMV (Light Motor Vehicle)',
    'Civil HMV (Heavy Motor Vehicle)',
    'Commercial Transport Authorisation',
    'Hazardous-Goods Endorsement',
    'Forklift / Crane Operator Licence',
    'Earth Moving Machinery Licence'
  ],
  'National Skill Qualifications': [
    'National Trade Certificate (ITI)',
    'NSQF / Skill India Certificate',
    'Recognition of Prior Learning (RPL)',
    'Sector Skill Council Certificate',
    'Agniveer Skill Certificate'
  ],
  'Safety & Emergency Licences': [
    'First Aid / Basic Life Support (BLS)',
    'Industrial Firefighting Certificate',
    'Industrial Safety & EHS Certificate',
    'Disaster Response Certificate'
  ],
  'Specialist Civil Credentials': [
    'DGCA Drone Pilot Certificate',
    'State Electrical Wireman Licence',
    'Pharmacy Registration',
    'Nursing / Paramedic Registration',
    'Airport Security (AVSEC) / Seafarer CDC'
  ],
  'Service Trade Proficiencies': [
    'Class I Trade Proficiency',
    'Class II Trade Proficiency',
    'Class III Trade Proficiency',
    'Junior NCOs Cadre',
    'Senior NCOs Cadre',
    'JCO Promotion Course',
    'Qualified Instructor Course'
  ],
  'DGR & Technology Courses': [
    'DGR Resettlement Course (Security)',
    'DGR Resettlement Course (Supply Chain)',
    'DGR Resettlement Course (IT & Cyber)',
    'Basic Computer Literacy / CCC',
    'SAP / ERP Logistics Certificate'
  ]
};

// Matching Engine: compute explainable fit score
export function computeCapabilityFit(requirement, candidate) {
  if (!requirement || !candidate) {
    return { score: 50, reqHit: [], desHit: [], gaps: [], licenceGap: null, matchReasons: [] };
  }

  const reqCaps = requirement.essential_capabilities || [];
  const desCaps = requirement.desired_capabilities || [];
  const candidateCaps = candidate.caps || candidate.work_types || [];
  const candidateLicences = candidate.licences || candidate.licences_qualifications || [];
  const candidateTeam = Number(candidate.team_size_supervised || candidate.team || 0);

  // 1. Essential capabilities overlap
  const reqHit = reqCaps.filter((c) => candidateCaps.includes(c));
  const gaps = reqCaps.filter((c) => !candidateCaps.includes(c));
  const reqScore = reqCaps.length > 0 ? reqHit.length / reqCaps.length : 1;

  // 2. Desired capabilities overlap
  const desHit = desCaps.filter((c) => candidateCaps.includes(c));
  const desScore = desCaps.length > 0 ? desHit.length / desCaps.length : 1;

  // 3. Team size requirement
  const minTeam = Number(requirement.min_team_supervised || 0);
  let teamScore = 1;
  if (minTeam > 0) {
    teamScore = candidateTeam >= minTeam ? 1 : Math.max(0.3, candidateTeam / minTeam);
  }

  // 4. Civil licence check
  const requiredLicence = (requirement.required_licences || [])[0];
  let licenceScore = 1;
  let licenceGap = null;
  if (requiredLicence && requiredLicence !== 'None' && requiredLicence !== 'No mandatory licence') {
    const hasLicence = candidateLicences.some((l) =>
      l.toLowerCase().includes(requiredLicence.toLowerCase()) ||
      requiredLicence.toLowerCase().includes(l.toLowerCase())
    );
    if (!hasLicence) {
      licenceScore = 0.4;
      licenceGap = requiredLicence;
    }
  }

  // Weighted score calculation
  // 50% essential capabilities, 20% desired, 15% leadership/team scale, 15% licence
  let totalScore = Math.round(
    (0.50 * reqScore + 0.20 * desScore + 0.15 * teamScore + 0.15 * licenceScore) * 100
  );

  // Penalize if essential overlap is less than 50%
  if (reqCaps.length > 0 && reqHit.length === 0) {
    totalScore = Math.min(totalScore, 45);
  } else if (reqCaps.length > 0 && reqScore < 0.5) {
    totalScore = Math.min(totalScore, 65);
  }

  // Generate explainable match reasons
  const matchReasons = [];
  if (reqHit.length > 0) {
    matchReasons.push(`${reqHit.length} essential capability area${reqHit.length > 1 ? 's' : ''} verified`);
  }
  if (desHit.length > 0) {
    matchReasons.push(`${desHit.length} desirable capability area${desHit.length > 1 ? 's' : ''}`);
  }
  if (minTeam > 0 && candidateTeam >= minTeam) {
    matchReasons.push(`Team leadership scale met (${candidateTeam} personnel)`);
  }
  if (requiredLicence && !licenceGap) {
    matchReasons.push(`Mandatory licence verified (${requiredLicence})`);
  }

  return {
    score: Math.min(98, Math.max(25, totalScore)),
    reqHit,
    desHit,
    gaps,
    licenceGap,
    matchReasons
  };
}
