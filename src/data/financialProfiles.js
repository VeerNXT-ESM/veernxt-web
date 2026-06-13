/**
 * VeerNXT — Agniveer Financial Profiling Data Module
 * 
 * All questionnaire content, profile definitions, allocation plans,
 * and scoring logic extracted from FINANCE1.md and FINANCE2.md.
 */

// ─── 7-Step Questionnaire ───────────────────────────────────────
export const QUESTIONS = [
  {
    id: 'q1',
    label: 'Step 1 of 7 — Primary Goal',
    text: 'What is your primary goal right now, after completing your Agniveer service?',
    sub: 'This is the most important question. Think about what you want to achieve in the next 1–2 years.',
    options: [
      { key: 'A', title: 'Clear a government job exam', sub: 'UPSC, SSC, State PSC, Police, Railways, Defence', profile: 'P1' },
      { key: 'B', title: 'Start or grow a business', sub: 'I have an idea or skill I want to monetise', profile: 'P2' },
      { key: 'C', title: 'Provide for my family first', sub: 'Marriage, house, children\'s education are priorities', profile: 'P3' },
      { key: 'D', title: 'Complete my education', sub: 'Degree, diploma, technical course, MBA', profile: 'P4' },
    ],
  },
  {
    id: 'q2',
    label: 'Step 2 of 7 — Family Background',
    text: 'What best describes your family situation?',
    sub: 'This shapes how your corpus should be protected and deployed.',
    options: [
      { key: 'A', title: 'Farming family — we own land', sub: 'Agriculture is the primary income, I may return to the farm', profile: 'P5' },
      { key: 'B', title: 'Urban or semi-urban family', sub: 'Someone in government or private sector job at home', profile: 'P6' },
      { key: 'C', title: 'I am the only earning member', sub: 'Large family depending entirely on me', profile: 'P7' },
      { key: 'D', title: 'Well-settled family — I am investing surplus', sub: 'Family is financially stable, I can take a longer view', profile: 'P8' },
    ],
  },
  {
    id: 'q3',
    label: 'Step 3 of 7 — Marital Status',
    text: 'What is your current marital status?',
    sub: 'This affects how much protection coverage you need and how urgently.',
    options: [
      { key: 'A', title: 'Single, not yet married', sub: 'Lower immediate family liability' },
      { key: 'B', title: 'Married, no children yet', sub: 'Medium-term family planning likely' },
      { key: 'C', title: 'Married with children', sub: 'Amplifies protection and education needs significantly' },
      { key: 'D', title: 'Single, supporting parents/siblings', sub: 'High responsibility despite no spouse' },
    ],
  },
  {
    id: 'q4',
    label: 'Step 4 of 7 — Education',
    text: 'What is your highest educational qualification?',
    sub: 'Guides whether upskilling or higher education is a near-term financial need.',
    options: [
      { key: 'A', title: 'Class 10 or 12', sub: 'Vocational or further schooling may be a goal' },
      { key: 'B', title: 'Diploma or ITI', sub: 'Technical skills already in place' },
      { key: 'C', title: 'Graduate (any stream)', sub: 'Can pursue PG, MBA, or professional certifications' },
      { key: 'D', title: 'Post-graduate or professional degree', sub: 'Higher education need is likely fulfilled' },
    ],
  },
  {
    id: 'q5',
    label: 'Step 5 of 7 — Risk Comfort',
    text: 'How do you feel about market fluctuations in your investments?',
    sub: 'Be honest. There is no wrong answer — this only helps make your plan more suitable.',
    options: [
      { key: 'A', title: 'Not comfortable at all', sub: 'I cannot sleep if my money goes down, even temporarily' },
      { key: 'B', title: 'Somewhat comfortable', sub: 'Short dips are okay as long as it grows over 3–5 years' },
      { key: 'C', title: 'Comfortable with volatility', sub: 'I understand markets and can wait 7–10 years' },
      { key: 'D', title: 'Very comfortable', sub: 'I want maximum growth even if it swings significantly' },
    ],
  },
  {
    id: 'q6',
    label: 'Step 6 of 7 — Investment Window',
    text: 'When do you think you will need this money back?',
    sub: 'This determines whether we invest in short, medium, or long-horizon instruments.',
    options: [
      { key: 'A', title: 'Within 1 year', sub: 'Job prep, emergency, immediate family need' },
      { key: 'B', title: '1 to 3 years', sub: 'Business setup, marriage, house down payment' },
      { key: 'C', title: '3 to 7 years', sub: 'Education fund, growing business, medium goal' },
      { key: 'D', title: '7+ years — building long-term wealth', sub: 'Retirement, children\'s future, generational wealth' },
    ],
  },
  {
    id: 'q7',
    label: 'Step 7 of 7 — Corpus to Invest',
    text: 'How much of your Seva Nidhi package do you want to invest now?',
    sub: 'You do not have to invest everything. A portion for emergency fund and immediate needs should be kept aside.',
    isAmount: true,
  },
];

// ─── Amount Grid Options ────────────────────────────────────────
export const AMOUNT_OPTIONS = [
  { value: 50000,  label: '₹50,000',    sub: 'Conservative start' },
  { value: 100000, label: '₹1,00,000',  sub: 'Balanced start' },
  { value: 150000, label: '₹1,50,000',  sub: 'Moderate deployment' },
  { value: 200000, label: '₹2,00,000',  sub: 'Confident deployment' },
  { value: 300000, label: '₹3,00,000',  sub: 'Growth-focused' },
  { value: 400000, label: '₹4,00,000',  sub: 'High deployment' },
  { value: 500000, label: '₹5,00,000',  sub: 'Full corpus deployment' },
  { value: 600000, label: '₹6,00,000+', sub: 'Full Seva Nidhi +' },
];

// ─── 8 Agniveer Investor Profiles ───────────────────────────────
export const PROFILES = {
  P1: {
    name: 'The Government Job Seeker',
    badge: 'Profile 1',
    emoji: '📋',
    desc: 'Your Seva Nidhi is your runway. You need capital preservation for 1–2 years while you prepare and clear your exam. No risk, maximum liquidity. Your investment plan protects the corpus while you secure your income.',
    urgencies: [
      { text: 'Emergency fund', level: 'critical' },
      { text: 'Capital safety', level: 'critical' },
      { text: 'No lock-in products', level: 'critical' },
      { text: 'Exam prep runway', level: 'high' },
    ],
    risk: 'Conservative',
    horizon: 'Short (1–2 years)',
    color: '#1D9E75',
    bgColor: '#E1F5EE',
    borderColor: '#5DCAA5',
  },
  P2: {
    name: 'The Entrepreneur',
    badge: 'Profile 2',
    emoji: '🚀',
    desc: 'You have a business vision and need working capital. Part of your corpus is future business investment. Your financial plan must separate personal safety net from business risk capital — the two must never mix.',
    urgencies: [
      { text: 'Personal emergency fund', level: 'high' },
      { text: 'Term insurance', level: 'high' },
      { text: 'Business seed fund', level: 'high' },
      { text: 'Market risk okay', level: 'medium' },
    ],
    risk: 'Moderate',
    horizon: 'Medium (2–5 years)',
    color: '#D97706',
    bgColor: '#FEF3C7',
    borderColor: '#F59E0B',
  },
  P3: {
    name: 'The Family Man',
    badge: 'Profile 3',
    emoji: '👨‍👩‍👧',
    desc: 'Family is your first responsibility. Marriage, home, children — these are your milestones. Your plan must protect your family first, then build for their future through disciplined SIPs and goal-based investing.',
    urgencies: [
      { text: 'Term insurance', level: 'critical' },
      { text: 'Family emergency fund', level: 'critical' },
      { text: 'Family goal savings', level: 'high' },
      { text: 'Education fund', level: 'medium' },
    ],
    risk: 'Conservative-Moderate',
    horizon: 'Medium (3–7 years)',
    color: '#2563EB',
    bgColor: '#DBEAFE',
    borderColor: '#60A5FA',
  },
  P4: {
    name: 'The Higher Education Seeker',
    badge: 'Profile 4',
    emoji: '🎓',
    desc: 'Education is your investment in yourself. Your corpus needs to partly fund your education and partly be preserved for after. You need a short-term safe allocation for fees and a longer-term SIP for post-education wealth.',
    urgencies: [
      { text: 'Education fee fund', level: 'critical' },
      { text: 'Course living expenses', level: 'high' },
      { text: 'Capital safety', level: 'high' },
      { text: 'Long-term SIP', level: 'medium' },
    ],
    risk: 'Conservative',
    horizon: 'Short-Medium (2–4 years)',
    color: '#7C3AED',
    bgColor: '#EDE9FE',
    borderColor: '#A78BFA',
  },
  P5: {
    name: 'The Rural Inheritor',
    badge: 'Profile 5',
    emoji: '🌾',
    desc: 'You have land — that is your biggest asset and your biggest anchor. Your plan should complement the farm, not compete with it. Liquid savings, crop insurance, and slow-building mutual fund SIPs are your path.',
    urgencies: [
      { text: 'Liquid emergency fund', level: 'critical' },
      { text: 'Farm/weather risk buffer', level: 'high' },
      { text: 'Family protection', level: 'high' },
      { text: 'Slow SIP build', level: 'medium' },
    ],
    risk: 'Conservative',
    horizon: 'Long (7+ years)',
    color: '#059669',
    bgColor: '#D1FAE5',
    borderColor: '#34D399',
  },
  P6: {
    name: 'The Urban Aspirant',
    badge: 'Profile 6',
    emoji: '🏙️',
    desc: 'You come from a stable background and have realistic ambitions — a better job, a house in 5 years, financial independence. You can take moderate risk. Balanced funds and equity SIPs will build your future.',
    urgencies: [
      { text: 'Equity SIP', level: 'high' },
      { text: 'Aspirational goal', level: 'high' },
      { text: 'Term cover', level: 'medium' },
      { text: 'Emergency fund', level: 'medium' },
    ],
    risk: 'Moderate',
    horizon: 'Medium-Long (5–10 years)',
    color: '#0891B2',
    bgColor: '#CFFAFE',
    borderColor: '#22D3EE',
  },
  P7: {
    name: 'The Support Pillar',
    badge: 'Profile 7',
    emoji: '🛡️',
    desc: 'Your entire family depends on you. Every rupee must work harder. Protection comes before everything. Then a stable, non-volatile savings plan. Your money cannot afford to be lost — your family cannot afford that.',
    urgencies: [
      { text: 'Term insurance', level: 'critical' },
      { text: 'Family emergency fund', level: 'critical' },
      { text: 'Stable debt instruments', level: 'high' },
      { text: 'SIP only after above', level: 'medium' },
    ],
    risk: 'Conservative',
    horizon: 'Medium (3–5 years)',
    color: '#DC2626',
    bgColor: '#FEE2E2',
    borderColor: '#FCA5A5',
  },
  P8: {
    name: 'The Wealth Builder',
    badge: 'Profile 8',
    emoji: '📈',
    desc: 'You have the rarest gift in personal finance — stability and time. Your family is settled, you have no immediate crisis. This corpus can be put to work seriously. Equity-heavy, long-horizon, compounding is your ally.',
    urgencies: [
      { text: 'Equity-heavy allocation', level: 'high' },
      { text: 'ELSS + Flexi cap', level: 'high' },
      { text: 'Basic protection check', level: 'medium' },
      { text: 'NPS top-up', level: 'medium' },
    ],
    risk: 'Aggressive',
    horizon: 'Long (10+ years)',
    color: '#EA580C',
    bgColor: '#FFF7ED',
    borderColor: '#FB923C',
  },
};

// ─── Per-Profile Allocation Plans (from FINANCE2.md) ────────────
export const ALLOCATION_PLANS = {
  P1: {
    label: 'Capital Preservation Plan',
    items: [
      { pct: 20, product: 'Emergency Fund (Liquid MF)', why: 'Immediate access, no lock-in — your income replacement for exam prep' },
      { pct: 30, product: 'Short-Term Debt Fund', why: 'Safe 6–12 month parking at 6.5–7% returns' },
      { pct: 30, product: 'FD / RD (Post Office or SFB)', why: 'Sovereign safety, guaranteed 7–8.5% return' },
      { pct: 15, product: 'Overnight / Ultra-Short MF', why: 'Exam fee + living cost buffer, instant liquidity' },
      { pct: 5,  product: 'Large Cap Index SIP', why: 'Even ₹500/month — do not stop the SIP habit' },
    ],
  },
  P2: {
    label: 'Entrepreneur Launchpad Plan',
    items: [
      { pct: 25, product: 'Emergency Fund (Liquid MF)', why: 'Personal safety before business risk — non-negotiable' },
      { pct: 25, product: 'Business Capital Reserve (RD/FD)', why: 'Separate business seed — never mix personal and business' },
      { pct: 25, product: 'Short-Term Debt MF', why: '6–18 month liquidity for setup costs' },
      { pct: 15, product: 'Flexi-Cap Equity SIP', why: 'Long-term personal wealth independent of business' },
      { pct: 10, product: 'ELSS (Tax Saving)', why: '80C benefit + equity growth — saves tax from Day 1' },
    ],
  },
  P3: {
    label: 'Family Protection First Plan',
    items: [
      { pct: 20, product: 'Emergency Fund (Liquid MF)', why: '6 months family expenses — non-negotiable safety net' },
      { pct: 25, product: 'Term Insurance Premium Reserve', why: 'Family cover is the first investment — ₹1 crore cover' },
      { pct: 25, product: 'Conservative Hybrid / Balanced Fund', why: 'Stable growth for medium-term family goals' },
      { pct: 20, product: 'Child Education SIP', why: 'Start early — compounding does the work for 15+ years' },
      { pct: 10, product: 'Sovereign Gold Bond', why: 'Cultural hedge + real asset + 2.5% annual interest' },
    ],
  },
  P4: {
    label: 'Education Runway Plan',
    items: [
      { pct: 35, product: 'Liquid / Ultra-Short MF', why: 'Course fees accessible within 1 working day' },
      { pct: 25, product: 'FD (1–2 Year)', why: 'Living expenses during the study period' },
      { pct: 20, product: 'Short-Term Debt Fund', why: 'Post-education buffer until employment secured' },
      { pct: 15, product: 'ELSS SIP (Small)', why: 'Tax saving + long horizon wealth building starts now' },
      { pct: 5,  product: 'Sovereign Gold Bond', why: 'Inflation hedge, 8-year maturity aligns post-study' },
    ],
  },
  P5: {
    label: 'Rural Stability Plan',
    items: [
      { pct: 30, product: 'Post Office Savings / Liquid MF', why: 'Crop failure or family emergency buffer — familiar, trusted' },
      { pct: 25, product: 'Kisan Vikas Patra / NSC', why: 'Sovereign, safe instrument your family already trusts' },
      { pct: 20, product: 'Conservative Debt MF', why: 'Better than FD over 3+ years — 7–8% returns' },
      { pct: 15, product: 'Large Cap Index SIP', why: 'Start slow — consistency matters more than amount' },
      { pct: 10, product: 'Sovereign Gold Bond', why: 'Culturally understood — gold that earns interest' },
    ],
  },
  P6: {
    label: 'Urban Aspirant Growth Plan',
    items: [
      { pct: 15, product: 'Emergency Fund (Liquid MF)', why: '3 months expenses — you have family support backup' },
      { pct: 30, product: 'Flexi-Cap Equity SIP', why: 'Core long-term wealth builder — 12–15% expected CAGR' },
      { pct: 20, product: 'Balanced Advantage Fund', why: 'Navigates market cycles automatically — medium risk' },
      { pct: 20, product: 'ELSS (Tax Saving)', why: '80C + equity returns — best combo for tax efficiency' },
      { pct: 15, product: 'NPS Tier 1', why: 'Pension habit + additional ₹50,000 tax benefit under 80CCD' },
    ],
  },
  P7: {
    label: 'Family Safety Pillar Plan',
    items: [
      { pct: 30, product: 'Emergency Fund (Liquid MF)', why: '1 year family expenses — your family has no backup' },
      { pct: 20, product: 'Term Insurance Premium Reserve', why: 'Highest priority — largest coverage needed, ₹1 crore minimum' },
      { pct: 25, product: 'Post Office MIS / Debt MF', why: 'Monthly income-like stability — ₹1,500/month for family' },
      { pct: 15, product: 'Conservative Hybrid Fund SIP', why: 'Growth without steep downside — family cannot afford loss' },
      { pct: 10, product: 'Sovereign Gold Bond', why: 'Cultural safety net, highly liquid, government-backed' },
    ],
  },
  P8: {
    label: 'Wealth Builder Compounding Plan',
    items: [
      { pct: 10, product: 'Emergency Fund (Liquid MF)', why: 'You have family support — smaller buffer needed' },
      { pct: 35, product: 'Flexi-Cap / Mid-Cap Equity SIP', why: 'Maximum long-term compounding engine — 14–18% CAGR' },
      { pct: 20, product: 'ELSS (Tax Saving)', why: 'Mandatory 80C + 12–15% expected CAGR' },
      { pct: 20, product: 'Index Fund (Nifty 50)', why: 'Low cost, market return, no fund manager risk' },
      { pct: 15, product: 'NPS Tier 1 + Tier 2', why: 'Pension corpus + additional equity allocation + tax benefit' },
    ],
  },
};

// ─── Scoring Algorithm ──────────────────────────────────────────
/**
 * Determines the best-fit profile from questionnaire answers.
 * Uses weighted scoring across all 7 questions.
 * 
 * @param {Object} answers - { q1: 'A', q2: 'C', q3: 'B', ... }
 * @returns {string} Profile key e.g. 'P3'
 */
export function getProfile(answers) {
  const scores = { P1: 0, P2: 0, P3: 0, P4: 0, P5: 0, P6: 0, P7: 0, P8: 0 };

  // Q1 — Primary goal (heaviest weight: 3 points)
  const q1Map = { A: 'P1', B: 'P2', C: 'P3', D: 'P4' };
  if (answers.q1 && q1Map[answers.q1]) scores[q1Map[answers.q1]] += 3;

  // Q2 — Family background (heavy weight: 3 points)
  const q2Map = { A: 'P5', B: 'P6', C: 'P7', D: 'P8' };
  if (answers.q2 && q2Map[answers.q2]) scores[q2Map[answers.q2]] += 3;

  // Q3 — Marital status (amplifiers)
  if (answers.q3 === 'C') { scores.P3 += 2; scores.P7 += 1; }
  if (answers.q3 === 'D') { scores.P7 += 2; }
  if (answers.q3 === 'B') { scores.P3 += 1; }

  // Q4 — Education (amplifiers)
  if (answers.q4 === 'A') { scores.P4 += 1; scores.P5 += 1; }
  if (answers.q4 === 'B') { scores.P2 += 1; scores.P5 += 1; }
  if (answers.q4 === 'C' || answers.q4 === 'D') { scores.P6 += 1; scores.P8 += 1; }

  // Q5 — Risk comfort
  if (answers.q5 === 'A') { scores.P1 += 1; scores.P5 += 1; scores.P7 += 1; }
  if (answers.q5 === 'B') { scores.P2 += 1; scores.P3 += 1; scores.P4 += 1; }
  if (answers.q5 === 'C') { scores.P6 += 1; scores.P8 += 1; }
  if (answers.q5 === 'D') { scores.P6 += 1; scores.P8 += 2; }

  // Q6 — Investment window
  if (answers.q6 === 'A') { scores.P1 += 1; scores.P4 += 1; }
  if (answers.q6 === 'B') { scores.P2 += 1; scores.P3 += 1; }
  if (answers.q6 === 'C') { scores.P3 += 1; scores.P5 += 1; }
  if (answers.q6 === 'D') { scores.P8 += 1; scores.P6 += 1; scores.P5 += 1; }

  // Find highest scoring profile
  let best = 'P1';
  let bestScore = 0;
  for (const key in scores) {
    if (scores[key] > bestScore) {
      bestScore = scores[key];
      best = key;
    }
  }
  return best;
}

/**
 * Returns allocation breakdown for a profile and corpus amount.
 */
export function getAllocation(profileKey, amount) {
  const plan = ALLOCATION_PLANS[profileKey] || ALLOCATION_PLANS.P1;
  return {
    label: plan.label,
    items: plan.items.map(item => ({
      ...item,
      amount: Math.round(amount * item.pct / 100),
    })),
  };
}

// ─── Currency Formatter ─────────────────────────────────────────
export function formatINR(n) {
  return '₹' + Math.round(n).toLocaleString('en-IN');
}

// ─── The 5 Universal Laws (from FINANCE1.md) ────────────────────
export const FIVE_LAWS = [
  'Protection before investment — always.',
  'Emergency fund before anything else — always.',
  'Never invest in what you cannot understand — always.',
  'Never put all corpus in one product — always.',
  'Never stop the SIP — no matter how small — always.',
];

// ─── The 5 Things an Agniveer Must Never Do ─────────────────────
export const GOLDEN_RULES = [
  { title: 'Never put corpus into a chit fund', desc: 'No matter how trusted the organiser. Chit funds are unregulated.' },
  { title: 'Never buy land or property immediately', desc: 'Real estate is illiquid and ties up your entire corpus in one asset.' },
  { title: 'Never buy LIC endowment or money-back plan as investment', desc: 'These give 4–5% returns. Inflation is 6%. You lose money in real terms.' },
  { title: 'Never lend corpus to anyone', desc: 'Not to friends, family, or fellow Agniveers. You cannot control or liquidate it.' },
  { title: 'Never invest in crypto or forex trading', desc: '90% of retail traders lose money. Your Seva Nidhi took 4 years to earn.' },
];

// ─── WhatsApp Handoff ───────────────────────────────────────────
const VEERNXT_WHATSAPP = '917889530025';

/**
 * Builds a wa.me URL with pre-filled message containing the user's
 * financial profile summary, for consultant handoff.
 */
export function buildWhatsAppLink({ userName, userPhone, profileKey, profileName, corpusAmount, allocation, answers }) {
  const profile = PROFILES[profileKey];
  const alloc = allocation || getAllocation(profileKey, corpusAmount);

  const lines = [
    `🏛️ *VeerNXT Financial Guidance — New Lead*`,
    ``,
    `👤 *Name:* ${userName}`,
    `📱 *Phone:* ${userPhone}`,
    ``,
    `📊 *Profile:* ${profile?.badge} — ${profileName}`,
    `💰 *Corpus to Invest:* ${formatINR(corpusAmount)}`,
    `⚖️ *Risk Level:* ${profile?.risk}`,
    `⏱️ *Horizon:* ${profile?.horizon}`,
    ``,
    `📋 *Recommended Allocation:*`,
    ...alloc.items.map(item => `  • ${item.product}: ${item.pct}% (${formatINR(item.amount)})`),
    ``,
    `📌 *Questionnaire Answers:*`,
    `  Q1 (Goal): ${answers.q1 || '—'}`,
    `  Q2 (Family): ${answers.q2 || '—'}`,
    `  Q3 (Marital): ${answers.q3 || '—'}`,
    `  Q4 (Education): ${answers.q4 || '—'}`,
    `  Q5 (Risk): ${answers.q5 || '—'}`,
    `  Q6 (Horizon): ${answers.q6 || '—'}`,
    `  Q7 (Amount): ${formatINR(corpusAmount)}`,
    ``,
    `🕐 *Submitted:* ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`,
    ``,
    `_This lead was generated from the VeerNXT Financial Guidance tool._`,
  ];

  const message = encodeURIComponent(lines.join('\n'));
  return `https://wa.me/${VEERNXT_WHATSAPP}?text=${message}`;
}
