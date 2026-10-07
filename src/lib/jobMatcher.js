/**
 * jobMatcher.js — Dynamic Job Relevance Scoring Engine for VeerNXT
 *
 * Replaces the hardcoded keyword filter in JobBoard.jsx.
 * Scores each job against a candidate profile on 5 real signals:
 *   1. Career track preference alignment (35 pts max)
 *   2. Military trade / skill match via title keywords (30 pts max)
 *   3. Qualification-tier eligibility (20 pts max)
 *   4. Location / domicile match (15 pts max)
 *   5. ESM reservation flag heuristic (bonus up to 10 pts)
 *
 * Returns a sorted list with score + match explanation labels.
 */

// ─── Career Track → Preference Bucket alignment ─────────────────────────────
const TRACK_TO_PREFERENCE_BUCKET = {
  POLICE_CAPF:    ['CENTRAL_GOVT', 'STATE_GOVT'],
  SSC:            ['CENTRAL_GOVT'],
  RAILWAYS:       ['CENTRAL_GOVT'],
  BANKING:        ['BANKING_PSU', 'CENTRAL_GOVT'],
  INSURANCE:      ['BANKING_PSU'],
  PSU:            ['BANKING_PSU', 'CENTRAL_GOVT'],
  ENGINEERING:    ['CENTRAL_GOVT', 'PRIVATE'],
  CIVIL_SERVICES: ['CENTRAL_GOVT', 'STATE_GOVT'],
  TEACHING:       ['STATE_GOVT'],
  REVENUE:        ['STATE_GOVT'],
  FOREST:         ['STATE_GOVT'],
  HEALTH:         ['STATE_GOVT'],
  NURSING:        ['STATE_GOVT'],
  AGRICULTURE:    ['STATE_GOVT'],
  MUNICIPAL:      ['STATE_GOVT'],
  FIRE:           ['STATE_GOVT'],
  GROUP_C:        ['STATE_GOVT'],
  GROUP_D:        ['STATE_GOVT'],
  TRANSPORT:      ['PRIVATE', 'STATE_GOVT'],
  SECURITY:       ['PRIVATE', 'CENTRAL_GOVT'],
  DEFENCE:        ['CENTRAL_GOVT'],
  POSTAL:         ['CENTRAL_GOVT'],
  ACCOUNTING:     ['CENTRAL_GOVT', 'STATE_GOVT', 'BANKING_PSU'],
  ADMINISTRATIVE: ['CENTRAL_GOVT', 'STATE_GOVT'],
};

// ─── Form preference code → internal bucket ─────────────────────────────────
const FORM_CODE_TO_BUCKET = {
  POLICE_CAPF:    'CENTRAL_GOVT',
  SSC:            'CENTRAL_GOVT',
  RAILWAYS:       'CENTRAL_GOVT',
  ENGINEERING:    'CENTRAL_GOVT',
  CIVIL_SERVICES: 'CENTRAL_GOVT',
  DEFENCE:        'CENTRAL_GOVT',
  POSTAL:         'CENTRAL_GOVT',
  PSU:            'BANKING_PSU',
  BANKING:        'BANKING_PSU',
  INSURANCE:      'BANKING_PSU',
  TEACHING:       'STATE_GOVT',
  NURSING:        'STATE_GOVT',
  REVENUE:        'STATE_GOVT',
  FOREST:         'STATE_GOVT',
  HEALTH:         'STATE_GOVT',
  AGRICULTURE:    'STATE_GOVT',
  MUNICIPAL:      'STATE_GOVT',
  FIRE:           'STATE_GOVT',
  GROUP_C:        'STATE_GOVT',
  GROUP_D:        'STATE_GOVT',
  PRIVATE:        'PRIVATE',
  TRANSPORT:      'PRIVATE',
  ENTREPRENEURSHIP: 'ENTREPRENEURSHIP',
};

/**
 * Normalise a candidate's careerPreferences array (form codes OR human-readable labels)
 * to a set of internal preference bucket strings.
 */
function normalisePreferences(prefs = []) {
  const out = new Set();
  for (const p of prefs) {
    const upper = (p || '').trim().toUpperCase().replace(/\s+/g, '_');
    if (FORM_CODE_TO_BUCKET[upper]) {
      out.add(FORM_CODE_TO_BUCKET[upper]);
      continue;
    }
    const s = (p || '').toLowerCase();
    if (s.includes('central'))              out.add('CENTRAL_GOVT');
    else if (s.includes('state'))           out.add('STATE_GOVT');
    else if (s.includes('bank') || s.includes('psu') || s.includes('insurance')) out.add('BANKING_PSU');
    else if (s.includes('private'))         out.add('PRIVATE');
    else if (s.includes('entrepren'))       out.add('ENTREPRENEURSHIP');
  }
  return [...out];
}

// ─── Military Trade → Job Title Keywords ────────────────────────────────────
// These map a soldier's background to the civilian job title vocabulary commonly
// used in govt/private job listings that are a good fit for them.
const TRADE_JOB_KEYWORDS = {
  // Admin / Clerical trades
  Clerk: ['clerk', 'office assistant', 'steno', 'data entry', 'mts', 'multi tasking', 'secretariat', 'ldc', 'junior assistant', 'cashier'],
  'Office Admin/Computer Work': ['clerk', 'data entry', 'office assistant', 'computer operator', 'ldc', 'junior assistant'],
  'Inventory/Store Management': ['storekeeper', 'inventory', 'store assistant', 'stock keeper', 'material handler', 'supply assistant'],
  Storekeeper: ['storekeeper', 'inventory', 'store assistant', 'stock keeper', 'material handler'],
  AOC: ['accounts', 'store', 'ordnance', 'inventory', 'procurement'],
  ASC: ['supply', 'logistics', 'transport', 'postal', 'dispatch'],

  // Technical trades
  EME: ['technical', 'mechanic', 'fitter', 'maintenance', 'technician', 'engineer', 'workshop'],
  Signals: ['telecom', 'signals', 'communications', 'radio', 'network', 'it support', 'technical'],
  Engineers: ['engineering', 'civil', 'construction', 'works', 'municipal', 'jee', 'technical'],
  'Technical Repair/Maintenance': ['technical', 'mechanic', 'fitter', 'technician', 'maintenance', 'repair'],
  'Electronics Fitter': ['electronics', 'electrical', 'fitter', 'technician'],
  'Mechanical Fitter': ['mechanical', 'fitter', 'machine operator', 'maintenance'],
  'Automobile Technician': ['automobile', 'motor mechanic', 'vehicle', 'driver mechanic'],

  // Combat / Security trades
  Infantry: ['constable', 'guard', 'security', 'police', 'armed guard', 'watchman', 'home guard', 'fire', 'capf'],
  'General Duty': ['constable', 'guard', 'security', 'police', 'home guard', 'fire'],
  'Weapons Handling': ['constable', 'guard', 'armed', 'security', 'police'],
  Rifleman: ['constable', 'guard', 'security', 'police', 'armed'],
  Sepoy: ['constable', 'guard', 'security', 'police', 'peon', 'group d'],
  Armoured: ['constable', 'security', 'police', 'transport', 'vehicle'],
  Artillery: ['constable', 'police', 'security', 'defence'],

  // Drivers / Transport
  Driver: ['driver', 'transport', 'lmv', 'hmv', 'vehicle', 'chauffeur'],
  'Driver MT': ['driver', 'transport', 'lmv', 'hmv', 'vehicle'],
  'Driving (LMV/HMV)': ['driver', 'lmv', 'hmv', 'transport', 'vehicle operator'],
  ASC_driver: ['driver', 'transport', 'logistics'],

  // Healthcare
  AMC: ['medical', 'health', 'nursing', 'hospital', 'ward', 'staff nurse', 'pharmacist', 'lab assistant'],
  Nursing: ['nurse', 'nursing', 'health', 'hospital', 'medical'],

  // Finance / Banking specific
  Banking: ['bank', 'banking', 'clerk', 'officer', 'financial', 'ibps', 'sbi', 'canara'],
  Accounting: ['accounts', 'auditor', 'accountant', 'finance', 'tax'],

  // Teaching
  AEC: ['teacher', 'instructor', 'coaching', 'education', 'tet'],
  'Instruction/Training': ['teacher', 'trainer', 'instructor', 'coach'],

  // Navy / Seaman
  Seaman: ['coast guard', 'marine', 'port', 'dock', 'shipping'],
  Hydro: ['survey', 'hydrographic', 'environment', 'water'],

  // Air Force specific
  'IAF(X) Group': ['technical', 'engineer', 'aircraft', 'aerospace', 'psu'],
  'IAF(Y) Group': ['admin', 'logistics', 'clerk', 'office', 'accounts'],
};

// ─── State name normalization (simple version) ───────────────────────────────
function normalizeState(s) {
  return (s || '').toLowerCase().trim().replace(/\s+/g, ' ');
}

// ─── Indian states lookup for city/location matching ─────────────────────────
const STATE_CITY_HINTS = {
  'uttar pradesh': ['lucknow', 'kanpur', 'agra', 'varanasi', 'prayagraj', 'noida', 'ghaziabad', 'meerut'],
  'rajasthan': ['jaipur', 'jodhpur', 'udaipur', 'kota', 'ajmer', 'bikaner'],
  'maharashtra': ['mumbai', 'pune', 'nagpur', 'nashik', 'aurangabad', 'thane'],
  'karnataka': ['bangalore', 'bengaluru', 'mysore', 'hubli', 'mangalore'],
  'tamil nadu': ['chennai', 'coimbatore', 'madurai', 'salem', 'tiruchirappalli'],
  'west bengal': ['kolkata', 'howrah', 'durgapur', 'asansol', 'siliguri'],
  'gujarat': ['ahmedabad', 'surat', 'vadodara', 'rajkot', 'gandhinagar'],
  'andhra pradesh': ['hyderabad', 'visakhapatnam', 'vijayawada', 'guntur'],
  'telangana': ['hyderabad', 'warangal', 'karimnagar', 'nizamabad'],
  'madhya pradesh': ['bhopal', 'indore', 'gwalior', 'jabalpur'],
  'bihar': ['patna', 'muzaffarpur', 'gaya', 'bhagalpur'],
  'punjab': ['chandigarh', 'ludhiana', 'amritsar', 'jalandhar', 'patiala'],
  'haryana': ['gurgaon', 'faridabad', 'chandigarh', 'panipat', 'ambala'],
  'kerala': ['thiruvananthapuram', 'kochi', 'kozhikode', 'thrissur'],
  'odisha': ['bhubaneswar', 'cuttack', 'rourkela', 'berhampur'],
  'jharkhand': ['ranchi', 'jamshedpur', 'dhanbad', 'bokaro'],
  'assam': ['guwahati', 'dibrugarh', 'silchar'],
  'himachal pradesh': ['shimla', 'dharamshala', 'manali'],
  'uttarakhand': ['dehradun', 'haridwar', 'rishikesh', 'nainital'],
};

/**
 * Main function: score a list of jobs against a candidate profile.
 * Returns a copy of the job list with a `_matchScore` and `_matchReasons` appended,
 * sorted highest score first.
 *
 * @param {object[]} jobs — array from api/jobs or api/jobs-v2
 * @param {object|null} profile — user_profiles row from Supabase (or null)
 * @returns {object[]} scored & sorted job list
 */
function safeArray(val) {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  if (typeof val === 'string') {
    try {
      const parsed = JSON.parse(val);
      if (Array.isArray(parsed)) return parsed;
    } catch (_) {}
    return val.split(/[,|]/).map(s => s.trim()).filter(Boolean);
  }
  return [];
}

export function scoreJobsForProfile(jobs, profile) {
  if (!profile || !jobs || jobs.length === 0) return jobs || [];

  const rawPrefs   = safeArray(profile.preferred_sectors || profile.careerPreferences);
  const rawSkills  = safeArray(profile.skills || profile.specificSkills || profile.militaryCourses);
  const rawStates  = safeArray(profile.preferred_states || (profile.stateOfDomicile ? [profile.stateOfDomicile] : []));
  const relocation = profile.relocation || (safeArray(profile.preferred_job_types)[0]) || 'Home State';
  const trade      = profile.trade || profile.armCorpsTrade || profile.roleAppointment || '';
  const qual       = profile.education_level || profile.highestQualification || '';
  const domicile   = normalizeState(rawStates[0] || profile.stateOfDomicile || '');

  const prefBuckets = new Set(normalisePreferences(rawPrefs));
  // "Anywhere in India" always unlocks Central Govt preference
  if (relocation === 'Anywhere in India') prefBuckets.add('CENTRAL_GOVT');

  // Build trade keyword set from the profile's trade + skills
  const tradeKeywords = new Set();
  const allTradeInputs = [trade, ...rawSkills].filter(Boolean);
  for (const input of allTradeInputs) {
    const inputLower = input.toLowerCase();
    for (const [tradeKey, keywords] of Object.entries(TRADE_JOB_KEYWORDS)) {
      if (
        inputLower === tradeKey.toLowerCase() ||
        inputLower.includes(tradeKey.toLowerCase()) ||
        tradeKey.toLowerCase().includes(inputLower)
      ) {
        keywords.forEach(kw => tradeKeywords.add(kw));
      }
    }
  }

  // Qualification tier: maps education level to seniority weight
  const QUAL_TIER = {
    'Class 10': 1,
    'Class 12': 2,
    'Graduate': 3,
    'Post-Graduate': 4,
  };
  const userTier = QUAL_TIER[qual] || 2;

  // Veteran-friendly career tracks (where ESM quota exists or Agniveer preference is strong)
  const ESM_FRIENDLY_TRACKS = new Set(['DEFENCE', 'PSU', 'RAILWAYS', 'POLICE_CAPF', 'SECURITY', 'BANKING']);

  // Score each job
  const scoredJobs = jobs.map(job => {
    const reasons = [];
    let score = 0;

    const titleLower   = (job.title || '').toLowerCase();
    const bodyLower    = (job.body || '').toLowerCase();
    const notesLower   = (job.notes || '').toLowerCase();
    const tagsText     = Array.isArray(job.tags) ? job.tags.join(' ').toLowerCase() : '';
    const allText      = `${titleLower} ${bodyLower} ${notesLower} ${tagsText}`;
    const careerTrack  = job.careerTrack || job.career_track || null;

    // ── Signal 1: Career Track × Preference Alignment (max 35 pts) ──────────
    if (careerTrack) {
      const trackBuckets = TRACK_TO_PREFERENCE_BUCKET[careerTrack] || [];
      const matchedBuckets = trackBuckets.filter(b => prefBuckets.has(b));
      if (matchedBuckets.length > 0) {
        score += 35;
        reasons.push('Matches your career preference');
      } else if (prefBuckets.size > 0 && trackBuckets.length > 0) {
        // Partial: track exists but not in user's selected buckets
        score += 5;
      }
    }

    // ── Signal 2: Trade / Skill Keyword Match (max 30 pts) ──────────────────
    if (tradeKeywords.size > 0) {
      let kwMatches = 0;
      for (const kw of tradeKeywords) {
        if (titleLower.includes(kw)) {
          kwMatches += 2; // title match is stronger
        } else if (allText.includes(kw)) {
          kwMatches += 1;
        }
      }
      if (kwMatches >= 4) {
        score += 30;
        reasons.push('Strong match for your military trade');
      } else if (kwMatches >= 2) {
        score += 18;
        reasons.push('Partial match with your trade skills');
      } else if (kwMatches >= 1) {
        score += 8;
      }
    }

    // ── Signal 3: Qualification-tier fit (max 20 pts) ────────────────────────
    // Heuristics for job seniority from title
    const isGroupD    = /peon|helper|group[-\s]?d|mts|multi.?tasking|chowkidar|sweeper/i.test(titleLower);
    const isGroupC    = /clerk|ldc|assistant|constable|guard|operator|data entry|junior/i.test(titleLower);
    const isGroupB    = /officer|inspector|sub.?inspector|manager|executive|analyst|engineer|po\b|so\b/i.test(titleLower);
    const isGroupA    = /director|superintendent|commissioner|ias|ips|ifs|grade.?a|class.?i/i.test(titleLower);

    let jobMinTier = 1;
    if (isGroupD)        jobMinTier = 1;
    else if (isGroupC)   jobMinTier = 1; // Class 10 can apply; Grad has advantage
    else if (isGroupB)   jobMinTier = 3; // Graduate needed
    else if (isGroupA)   jobMinTier = 4; // Post-Graduate

    if (userTier >= jobMinTier) {
      if (userTier === jobMinTier) {
        score += 20; // exact match
        reasons.push('Qualification match');
      } else if (userTier === jobMinTier + 1) {
        score += 15; // slight over-qualification is fine
        reasons.push('Well qualified');
      } else {
        score += 8; // highly over-qualified (still eligible)
      }
    } else {
      score -= 15; // under-qualified penalty
    }

    // ── Signal 4: Location / Domicile Match (max 15 pts) ─────────────────────
    if (relocation === 'Anywhere in India') {
      score += 8; // flexible candidates get a base location bonus
      // All-India jobs get an extra boost
      if (/all.?india|national|central|headquarters|hq/i.test(allText)) {
        score += 7;
        reasons.push('All-India eligible');
      }
    } else if (domicile) {
      const cityHints = STATE_CITY_HINTS[domicile] || [];
      const stateNorm = normalizeState(domicile);

      // Check if job mentions the user's state or a city in their state
      const stateWords = stateNorm.split(' ');
      const hasStateRef = stateWords.some(w => w.length > 3 && allText.includes(w));
      const hasCityRef  = cityHints.some(city => allText.includes(city));

      if (hasStateRef || hasCityRef) {
        score += 15;
        reasons.push(`Job in ${rawStates[0] || 'your state'}`);
      } else if (/all.?india|national|pan.?india|anywhere/i.test(allText)) {
        score += 8;
        reasons.push('Available across India');
      }
    }

    // ── Signal 5: ESM / Veteran Friendliness Bonus (max 10 pts) ─────────────
    const hasESMTag = /ex.?service|veteran|agniveer|esm|military|defence.?quota/i.test(allText);
    if (hasESMTag) {
      score += 10;
      reasons.push('ESM quota / veteran-friendly');
    } else if (careerTrack && ESM_FRIENDLY_TRACKS.has(careerTrack)) {
      score += 5; // implicit ESM friendliness from track type
    }

    return {
      ...job,
      _matchScore: Math.min(score, 100),
      _matchReasons: reasons,
      _isPersonalized: score > 10,
    };
  });

  // Sort by score descending, break ties by recency
  scoredJobs.sort((a, b) => {
    if (b._matchScore !== a._matchScore) return b._matchScore - a._matchScore;
    const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
    const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
    return dateB - dateA;
  });

  return scoredJobs;
}

/**
 * Quick check: did we produce a genuinely personalized result list?
 * Returns true if at least the top 3 results have distinct scores
 * or different career tracks, false if they're all the same.
 */
export function isPersonalizationActive(scoredJobs) {
  if (!scoredJobs || scoredJobs.length < 3) return false;
  const top3 = scoredJobs.slice(0, 3);
  // Check if all 3 are identical score
  const allSameScore = top3.every(j => j._matchScore === top3[0]._matchScore);
  if (!allSameScore) return true;
  // Check if at least some tracks differ
  const tracks = new Set(top3.map(j => j.careerTrack || j.career_track));
  return tracks.size > 1;
}
