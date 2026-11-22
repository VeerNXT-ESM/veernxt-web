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
    } catch (_) {
      // not JSON, fallback to comma/pipe separation
    }
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

  // Extract recommended exams if candidate completed profiling
  const candidateRecs = Array.isArray(profile.recommendations)
    ? profile.recommendations
    : Array.isArray(profile.raw_profile_data?.recommendations)
      ? profile.raw_profile_data.recommendations
      : [];

  // Score each job
  const scoredJobs = jobs.map(job => {
    const reasons = [];
    let score = 0;
    let alignedExamName = null;

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

    // ── Signal 6: Candidate Recommended Exam Alignment (bonus up to 25 pts) ──
    if (candidateRecs.length > 0) {
      for (const rec of candidateRecs.slice(0, 5)) {
        const rName = (rec.exam_name || '').toLowerCase();
        const rBody = (rec.conducting_body || '').toLowerCase();
        const rId   = rec.exam_id || rec.lc_exam_id;

        const isIdMatch = rId && (job.exam_id === rId || job.lc_exam_id === rId || job.id === rId);
        const isNameMatch = rName && rName.length > 3 && (titleLower.includes(rName) || allText.includes(rName));
        const isBodyMatch = rBody && rBody.length > 3 && (bodyLower.includes(rBody) || allText.includes(rBody));

        if (isIdMatch || isNameMatch || isBodyMatch) {
          score += 25;
          alignedExamName = rec.exam_name;
          reasons.unshift(`🎯 Aligned with: ${rec.exam_name}`);
          break;
        }
      }
    }

    return {
      ...job,
      _matchScore: Math.min(score, 100),
      _matchReasons: reasons,
      _recommendedExam: alignedExamName,
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

/**
 * Intelligent matcher linking jobs_v2 records directly to a recommended exam.
 */
export function matchJobsV2ForExam(allJobs, exam) {
  if (!allJobs || !allJobs.length || !exam) return [];

  const recId = exam.exam_id || exam.lc_exam_id || exam.id;
  const examName = (exam.exam_name || exam.name || '').toLowerCase();
  const conductingBody = (exam.conducting_body || exam.conductingBody || '').toLowerCase();
  const careerTrack = (exam.career_track || exam.careerTrack || '').toUpperCase();

  const bodyWords = conductingBody
    .split(/[\s,./()-]+/)
    .filter(w => w.length > 2 && !['the', 'and', 'for', 'board', 'commission', 'govt', 'india', 'state', 'department', 'recruitment'].includes(w));
  const examWords = examName
    .split(/[\s,./()-]+/)
    .filter(w => w.length > 2 && !['recruitment', 'exam', 'examination', 'level', 'post', 'posts', 'online', 'form', 'various'].includes(w));

  return allJobs
    .map(job => {
      const titleLower = (job.title || '').toLowerCase();
      const tagsList = Array.isArray(job.tags) ? job.tags : [];
      const tagsText = tagsList.join(' ').toLowerCase();
      const jobTrack = (job.career_track || job.careerTrack || '').toUpperCase();
      const descSnippet = (job.ai_description || job.aiDescription || job.description || '').slice(0, 400).toLowerCase();
      const fullText = `${titleLower} ${tagsText} ${descSnippet}`;

      let score = 0;
      const reasons = [];

      // 1. Direct link by exam_id
      if (recId && (job.exam_id === recId || job.lc_exam_id === recId || job.id === recId)) {
        score += 60;
        reasons.push('Linked Exam ID');
      }

      // 2. Conducting authority match (e.g. IBPS, SSC, Navy, Army, Railway, UPSC)
      const matchedBody = bodyWords.filter(w => fullText.includes(w));
      if (matchedBody.length > 0) {
        score += Math.min(40, matchedBody.length * 20);
        reasons.push(`Authority: ${matchedBody.slice(0, 2).join(', ')}`);
      }

      // 3. Exam role keyword match (e.g. Clerk, Constable, PO, Havildar, Apprentice)
      const matchedExam = examWords.filter(w => fullText.includes(w));
      if (matchedExam.length > 0) {
        score += Math.min(35, matchedExam.length * 15);
        reasons.push(`Role: ${matchedExam.slice(0, 2).join(', ')}`);
      }

      // 4. Career track alignment
      if (careerTrack && jobTrack) {
        if (careerTrack === jobTrack) {
          score += 20;
          reasons.push(`Track: ${careerTrack}`);
        } else if (
          (careerTrack === 'BANKING' && fullText.includes('bank')) ||
          (careerTrack === 'RAILWAYS' && fullText.includes('railway')) ||
          (careerTrack === 'DEFENCE' && (fullText.includes('army') || fullText.includes('navy') || fullText.includes('air force') || fullText.includes('defence') || fullText.includes('agniveer'))) ||
          (careerTrack === 'POLICE_CAPF' && (fullText.includes('police') || fullText.includes('cisf') || fullText.includes('crpf') || fullText.includes('bsf') || fullText.includes('constable')))
        ) {
          score += 15;
          reasons.push(`Aligned: ${careerTrack}`);
        }
      }

      // 5. Ex-servicemen quota priority
      if (tagsList.includes('ex_servicemen_job') || fullText.includes('ex-servicemen') || fullText.includes('esm')) {
        score += 10;
        reasons.push('ESM Quota Mentioned');
      }

      return {
        ...job,
        _matchScore: Math.min(99, score),
        _matchReasons: reasons,
        _recommendedExam: exam.exam_name || exam.name,
      };
    })
    .filter(j => j._matchScore >= 45)
    .sort((a, b) => b._matchScore - a._matchScore)
    .slice(0, 3);
}

/**
 * Match live jobs against the candidate's top recommended exams and background.
 */
export function matchJobsV2ForRecommendations(allJobs, recommendations, profile) {
  if (!allJobs || !allJobs.length) return [];
  if (!recommendations || !recommendations.length) return [];

  const seenIds = new Set();
  const collected = [];

  recommendations.forEach(rec => {
    const examJobs = matchJobsV2ForExam(allJobs, rec);
    examJobs.forEach(job => {
      const key = job.job_id || job.id || job.url;
      if (!seenIds.has(key)) {
        seenIds.add(key);
        collected.push({
          ...job,
          _recommendedExam: rec.exam_name || rec.name,
          _examRank: rec.rank || 1,
        });
      }
    });
  });

  if (collected.length >= 10) {
    return collected.slice(0, 10);
  }

  // Supplement if fewer than 10 matched directly to the top exams
  const candidateTracks = (profile?.careerPreferences || profile?.preferred_sectors || []).map(t => String(t).toUpperCase());
  const candidateTrade = (profile?.armCorpsTrade || profile?.trade || '').toLowerCase();

  const supplement = allJobs
    .filter(j => !seenIds.has(j.job_id || j.id || j.url))
    .map(job => {
      const fullText = `${job.title} ${(job.tags || []).join(' ')} ${job.ai_description || ''}`.toLowerCase();
      let score = 35;
      const reasons = [];

      const jobTrack = (job.career_track || job.careerTrack || '').toUpperCase();
      if (candidateTracks.some(t => t === jobTrack || fullText.includes(t.toLowerCase()))) {
        score += 25;
        reasons.push(`Career Preference: ${jobTrack}`);
      }
      if (candidateTrade && fullText.includes(candidateTrade)) {
        score += 25;
        reasons.push(`Trade Match: ${profile.armCorpsTrade || profile.trade}`);
      }
      if ((job.tags || []).includes('ex_servicemen_job') || fullText.includes('ex-servicemen') || fullText.includes('esm')) {
        score += 15;
        reasons.push('ESM Quota Available');
      }

      return {
        ...job,
        _matchScore: Math.min(95, score),
        _matchReasons: reasons.length ? reasons : ['Eligible Government Opening'],
      };
    })
    .filter(j => j._matchScore >= 35)
    .sort((a, b) => b._matchScore - a._matchScore);

  return [...collected, ...supplement].slice(0, 10);
}

/**
 * Returns trade-aligned civilian & government job recommendations for candidates,
 * ensuring 10 high-value career roles are always available post-profiling.
 */
export function getRecommendedCivilianRoles(profile = {}) {
  const _branch = (profile.serviceBranch || '').toLowerCase();
  const trade = (profile.armCorpsTrade || profile.trade || '').toLowerCase();
  const role = (profile.roleAppointment || profile.rank || '').toLowerCase();
  const skills = (profile.specificSkills || []).map(s => String(s).toLowerCase());
  const loc = profile.stateOfDomicile || 'All India';

  const roles = [];

  if (trade.includes('signal') || trade.includes('telecommunication') || trade.includes('communication') || skills.some(s => s.includes('computer') || s.includes('radio') || s.includes('network'))) {
    roles.push({
      id: 'role-telecom-sup',
      title: 'Telecom & Network Operations Supervisor',
      company: 'PSU Telecom & Tower Infrastructure (BSNL / Indus / Jio)',
      career_track: 'ENGINEERING & TELECOM',
      location: loc,
      salary: '₹4.8L – ₹7.5L / year',
      matchScore: 96,
      reason: 'Direct match for your Signals, Radio & Communications technical background.',
      tags: ['Signals Match', 'Technical Supervision', 'High Demand'],
    });
    roles.push({
      id: 'role-datacenter-spec',
      title: 'Data Center & Command Room Systems Specialist',
      company: 'Corporate IT, Defence PSUs & Cloud Facilities',
      career_track: 'IT & CYBER',
      location: 'Metro & Tier-1 Hubs',
      salary: '₹5.2L – ₹8.5L / year',
      matchScore: 93,
      reason: 'Aligned with secure communications, network monitoring, and electronics maintenance.',
      tags: ['IT & Cyber', '24x7 Command Ops', 'ESM Preferred'],
    });
  }

  if (trade.includes('infantry') || trade.includes('general duty') || trade.includes('armoured') || trade.includes('artillery') || trade.includes('combat') || trade.includes('commando') || skills.some(s => s.includes('weapon') || s.includes('security'))) {
    roles.push({
      id: 'role-sec-ops-lead',
      title: 'Security Operations & Executive Protection Lead',
      company: 'MNC Corporate Campuses, Airports & Strategic Assets',
      career_track: 'CORPORATE SECURITY',
      location: loc,
      salary: '₹4.5L – ₹7.2L / year',
      matchScore: 97,
      reason: 'Direct match for your combat arm leadership, tactical vigilance, and weapons handling.',
      tags: ['Combat Leadership', 'ESM Priority', 'Immediate Hiring'],
    });
    roles.push({
      id: 'role-psu-sec-officer',
      title: 'Chief Security Cum Vigilance Supervisor',
      company: 'Public Sector Undertakings (ONGC, IOCL, NTPC, BHEL)',
      career_track: 'PSU SECURITY',
      location: 'All India PSU Units',
      salary: '₹5.5L – ₹8.8L / year',
      matchScore: 95,
      reason: 'PSUs reserve dedicated supervisory security quotas for Armed Forces & CAPF veterans.',
      tags: ['PSU Pay Scale', 'ESM Quota', 'Perimeter Defence'],
    });
  }

  if (/\beme\b/i.test(trade) || trade.includes('workshop') || trade.includes('technical') || trade.includes('yantrik') || trade.includes('engineer') || skills.some(s => s.includes('mechanical') || s.includes('electrical') || s.includes('machinery'))) {
    roles.push({
      id: 'role-plant-maint',
      title: 'Plant Maintenance & Heavy Machinery Supervisor',
      company: 'Defence Manufacturing (HAL, BEL, L&T Defence, Tata Advanced)',
      career_track: 'ENGINEERING & PSU',
      location: 'Industrial & Defence Corridors',
      salary: '₹5.0L – ₹8.0L / year',
      matchScore: 95,
      reason: 'Direct match for your EME/Technical workshop and equipment maintenance expertise.',
      tags: ['Defence OEM', 'Technical Trade', 'High Growth'],
    });
    roles.push({
      id: 'role-rail-tech',
      title: 'Senior Technician & Rolling Stock Inspector',
      company: 'Indian Railways / Metro Rail Corporations (DMRC, MMRCL)',
      career_track: 'RAILWAYS & METRO',
      location: loc,
      salary: '₹4.4L – ₹6.8L / year',
      matchScore: 92,
      reason: 'Strong technical trade equivalence for electrical, mechanical, and instrumentation fitters.',
      tags: ['Metro & Railways', 'ESM Reservation', 'Technical'],
    });
  }

  if (trade.includes('medical') || trade.includes('nursing') || trade.includes('hospital') || trade.includes('veterinary') || role.includes('pharmacist') || role.includes('medic') || skills.some(s => s.includes('medical') || s.includes('first aid'))) {
    roles.push({
      id: 'role-emergency-med',
      title: 'Emergency Trauma & Occupational Health Officer',
      company: 'Multi-Specialty Hospitals, Industrial Plants & Oil Rigs',
      career_track: 'HEALTHCARE & MEDICAL',
      location: loc,
      salary: '₹4.2L – ₹7.0L / year',
      matchScore: 95,
      reason: 'Direct match for your battlefield nursing, paramedical, and emergency triage training.',
      tags: ['Paramedical Fit', 'Healthcare', 'High Stability'],
    });
  }

  if (trade.includes('asc') || trade.includes('aoc') || trade.includes('store') || trade.includes('logistics') || skills.some(s => s.includes('store') || s.includes('logistics') || s.includes('supply'))) {
    roles.push({
      id: 'role-supply-chain',
      title: 'Warehouse & Supply Chain Operations Manager',
      company: 'E-Commerce, 3PL & Defence Logistics Hubs',
      career_track: 'LOGISTICS & SUPPLY',
      location: loc,
      salary: '₹4.5L – ₹7.2L / year',
      matchScore: 94,
      reason: 'Direct match for your military ordnance, stores accounting, and inventory control experience.',
      tags: ['Supply Chain', 'Inventory Control', 'Corporate Leadership'],
    });
  }

  if (trade.includes('clerk') || trade.includes('admin') || trade.includes('office') || skills.some(s => s.includes('office') || s.includes('admin') || s.includes('hr'))) {
    roles.push({
      id: 'role-admin-hr',
      title: 'Administration, Compliance & HR Operations Executive',
      company: 'Banking, NBFCs & Corporate Enterprises',
      career_track: 'BANKING & ADMIN',
      location: loc,
      salary: '₹4.0L – ₹6.5L / year',
      matchScore: 93,
      reason: 'Aligned with your clerical accuracy, roster management, and official documentation record.',
      tags: ['Clerical & HR', 'Office Admin', 'Banking Fit'],
    });
  }

  if (trade.includes('driver') || trade.includes('transport') || skills.some(s => s.includes('driving') || s.includes('fleet'))) {
    roles.push({
      id: 'role-fleet-mgr',
      title: 'Fleet Operations & Convoy Logistics Controller',
      company: 'National Logistics, Aviation Ground Support & Mining',
      career_track: 'TRANSPORT & FLEET',
      location: loc,
      salary: '₹4.0L – ₹6.2L / year',
      matchScore: 93,
      reason: 'Leverages heavy vehicle expertise, preventive maintenance, and convoy discipline.',
      tags: ['Fleet Control', 'Transport Ops', 'Immediate Fit'],
    });
  }

  if (trade.includes('water wing') || trade.includes('marine') || trade.includes('navik') || _branch.includes('navy') || _branch.includes('coast guard') || skills.some(s => s.includes('marine') || s.includes('shipboard'))) {
    roles.push({
      id: 'role-maritime-ops',
      title: 'Port Security & Marine Terminal Operations Officer',
      company: 'Adani Ports, Cochin Shipyard, Mazagon Dock & Shipping Lines',
      career_track: 'MARITIME & PORTS',
      location: 'Coastal & Port Hubs',
      salary: '₹5.0L – ₹8.5L / year',
      matchScore: 95,
      reason: 'Tailored for Naval, Coast Guard, and Water Wing personnel with seamanship expertise.',
      tags: ['Maritime & Ports', 'Vessel Ops', 'High CTC'],
    });
  }

  if (trade.includes('fire') || skills.some(s => s.includes('firefighting') || s.includes('emergency'))) {
    roles.push({
      id: 'role-fire-safety',
      title: 'Fire & Industrial HSE Safety Officer',
      company: 'Airports (AAI / GMR), Refineries & Chemical Plants',
      career_track: 'FIRE & SAFETY',
      location: loc,
      salary: '₹4.5L – ₹7.5L / year',
      matchScore: 96,
      reason: 'Direct match for fire safety, rescue operations, and hazard response training.',
      tags: ['Fire & HSE', 'Airport & Refinery', 'Critical Role'],
    });
  }

  // Baseline high-value roles applicable across all disciplined veterans & Agniveers
  const baselinePool = [
    {
      id: 'role-bank-armoured-guard',
      title: 'Armed Security & Currency Chest Officer (ESM Quota)',
      company: 'SBI, PNB, Bank of Baroda & Public Sector Banks',
      career_track: 'BANKING & PSU',
      location: loc,
      salary: '₹4.2L – ₹6.8L / year',
      matchScore: 94,
      reason: 'Public Sector Banks reserve direct entry quotas for Ex-Servicemen and Agniveers with exemplary character.',
      tags: ['14.5% ESM Quota', 'PSU Bank Pay', 'Home State Posting'],
    },
    {
      id: 'role-capf-constable-si',
      title: 'CAPF & State Police Tactical Cadre (Agniveer Reservation)',
      company: 'CISF, BSF, CRPF, ITBP & State Police Forces',
      career_track: 'POLICE & CAPF',
      location: 'All India / Home State',
      salary: '₹4.0L – ₹6.5L / year',
      matchScore: 95,
      reason: '10% horizontal reservation and 3–5 year age relaxation specifically notified for trained Agniveers.',
      tags: ['10% Agniveer Quota', 'Physical Exemption', 'Central Pay Level'],
    },
    {
      id: 'role-corp-sec-mgr',
      title: 'Corporate Security & Asset Protection Officer',
      company: 'IT Parks, Banking Headquarters & Hospitality Chains',
      career_track: 'CORPORATE & PRIVATE',
      location: loc,
      salary: '₹4.2L – ₹6.8L / year',
      matchScore: 90,
      reason: 'High corporate preference for military veterans with proven team leadership and crisis readiness.',
      tags: ['Corporate Management', 'Team Supervision', 'Fast-Track Growth'],
    },
    {
      id: 'role-facility-ops',
      title: 'Operations & Facility Management Supervisor',
      company: 'Commercial Real Estate, Smart Cities & Infrastructure',
      career_track: 'OPERATIONS',
      location: loc,
      salary: '₹3.8L – ₹6.0L / year',
      matchScore: 88,
      reason: 'Leverages structured task execution, vendor coordination, and manpower supervision skills.',
      tags: ['Facility Ops', 'Manpower Lead', 'Civilian Transition'],
    },
    {
      id: 'role-rail-rpf-groupc',
      title: 'Railway Protection & Technical Operations Cadre',
      company: 'Indian Railways (RRB / RPF / Level 1–5 Posts)',
      career_track: 'RAILWAYS',
      location: 'Zonal Railways',
      salary: '₹3.9L – ₹6.2L / year',
      matchScore: 89,
      reason: '20% ESM/Agniveer reservation in Level-1 and 10% in Level-2+ posts with Central Government perks.',
      tags: ['20% Railway Quota', 'Central Govt Benefits', 'Job Security'],
    },
    {
      id: 'role-disaster-emergency',
      title: 'Disaster Response & Industrial Safety Coordinator',
      company: 'State Disaster Management, Metro Rail & Manufacturing',
      career_track: 'SAFETY & HSE',
      location: loc,
      salary: '₹4.0L – ₹6.5L / year',
      matchScore: 87,
      reason: 'Strong fit for field endurance, emergency evacuation protocols, and rapid decision-making.',
      tags: ['Emergency Response', 'HSE Compliance', 'Field Leadership'],
    },
    {
      id: 'role-supply-warehouse',
      title: 'Regional Hub & Inventory Control Supervisor',
      company: 'E-Commerce Fulfilment, FMCG & Retail Supply Chains',
      career_track: 'LOGISTICS',
      location: loc,
      salary: '₹3.8L – ₹5.8L / year',
      matchScore: 86,
      reason: 'Military discipline in shift management, dispatch timelines, and zero-loss asset tracking.',
      tags: ['Hub Operations', 'Shift In-Charge', 'Private Sector'],
    },
    {
      id: 'role-Fleet-convoy',
      title: 'Fleet & Transit Operations Controller',
      company: 'Surface Transport, Ports & Aviation Ground Services',
      career_track: 'TRANSPORT',
      location: 'Regional & Airport Hubs',
      salary: '₹3.8L – ₹5.8L / year',
      matchScore: 85,
      reason: 'High demand for disciplined route planning, vehicle turnaround, and crew supervision.',
      tags: ['Transit Control', 'Aviation & Ports', 'Operations'],
    },
    {
      id: 'role-training-instructor',
      title: 'Physical Training, Drill & Security Academy Instructor',
      company: 'Private Security Academies, Sainik Schools & Colleges',
      career_track: 'TRAINING & EDUCATION',
      location: loc,
      salary: '₹3.6L – ₹5.5L / year',
      matchScore: 84,
      reason: 'Directly monetizes drill mastery, physical fitness standards, and instructional leadership.',
      tags: ['Instruction & Drill', 'Academy Role', 'Respectable Career'],
    },
    {
      id: 'role-govt-ssc-cgl-chsl',
      title: 'Central Secretariat, Preventive & Inspector Cadre',
      company: 'SSC (CGL / CHSL / MTS / Havildar CBIC & CBN)',
      career_track: 'SSC & CENTRAL GOVT',
      location: 'All India',
      salary: '₹4.2L – ₹8.0L / year',
      matchScore: 88,
      reason: 'Dedicated ESM reservation across Group B & C central ministries and customs/excise departments.',
      tags: ['Central Ministries', 'ESM Age Relaxation', 'Prestigious Cadre'],
    },
  ];

  const existingIds = new Set(roles.map(r => r.id));
  for (const baseRole of baselinePool) {
    if (roles.length >= 12) break;
    if (!existingIds.has(baseRole.id)) {
      roles.push(baseRole);
      existingIds.add(baseRole.id);
    }
  }

  return roles.sort((a, b) => b.matchScore - a.matchScore).slice(0, 10);
}

/**
 * Builds a unified list of 10 recommended jobs for the candidate:
 * Prioritizes live database openings (`jobs_v2`) matched to their profile/exams,
 * and fills the remaining slots up to 10 with trade-aligned career roles.
 */
export function getTop10RecommendedJobs(liveJobs = [], recommendations = [], profile = {}) {
  const matchedLive = matchJobsV2ForRecommendations(liveJobs, recommendations, profile).map((job, idx) => ({
    ...job,
    _isLiveOpening: true,
    _displayRank: idx + 1,
    _trackLabel: job.career_track || job.careerTrack || 'GOVT OPENING',
    _matchScore: job._matchScore || 88,
  }));

  if (matchedLive.length >= 10) {
    return matchedLive.slice(0, 10);
  }

  const civilianRoles = getRecommendedCivilianRoles(profile);
  const needed = 10 - matchedLive.length;
  const roleItems = civilianRoles.slice(0, needed).map((role, idx) => ({
    id: role.id || `civilian-role-${idx}`,
    title: role.title,
    company: role.company,
    location: role.location,
    salary: role.salary,
    career_track: role.career_track || 'CAREER ROLE',
    _trackLabel: role.career_track || 'CAREER ROLE',
    _matchScore: role.matchScore,
    _matchReasons: role.tags || ['Trade Aligned', 'ESM Suitable'],
    ai_description: role.reason,
    _isLiveOpening: false,
    _displayRank: matchedLive.length + idx + 1,
  }));

  return [...matchedLive, ...roleItems];
}

