import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Bot,
  X,
  Send,
  RotateCcw,
  Minus,
  ChevronRight,
  User,
  Briefcase,
  GraduationCap,
  Coins,
  Scale,
  Users,
  Info,
  LogIn,
  ArrowLeftRight,
  Sparkles,
  ShieldCheck,
  Paperclip,
  MessageCircle,
  Mountain,
  Quote
} from 'lucide-react';
import { supabase } from '../lib/supabase';

// Presentational metadata only (icon + colorway + short description) for the
// richer "action card" options — derived from each option's own existing
// title/answer content (CATEGORY_OVERVIEWS / SPECIFIC_KNOWLEDGE_NODES below),
// never new facts. Keyed by option id or categoryKey. Anything not listed
// here (e.g. plain sub-topic chips) renders as a plain title+arrow card.
// `nav_network` and `cat_about` extend the candidate welcome to 6 cards,
// both routing to real, already-existing pages (/network, the About topic).
const OPTION_META = {
  // Candidate personalized options
  p_career: { icon: Briefcase, color: 'green', desc: 'Build an ATS-ready CV and explore corporate roles' },
  p_exams: { icon: GraduationCap, color: 'gold', desc: 'Government exams, mock tests and PYQs' },
  p_sewa: { icon: Coins, color: 'blue', desc: 'Plan your Sewa Nidhi corpus and long-term wealth' },
  p_legal: { icon: Scale, color: 'purple', desc: 'OROP, SPARSH, ECHS/CSD and legal support' },
  nav_network: { icon: Users, color: 'green', desc: 'Connect with veterans, mentors and recruiters' },
  cat_about: { icon: Info, color: 'red', desc: 'Our mission, services and contact support' },
  // Employer options
  emp_search: { icon: Users, color: 'green', desc: 'Match verified veteran and Agniveer profiles' },
  emp_post: { icon: Briefcase, color: 'gold', desc: 'Reach qualified veteran talent through VeerNXT' },
  emp_rank_map: { icon: ArrowLeftRight, color: 'blue', desc: 'Equivalent corporate roles, skills and experience' },
  // Logged-out options
  cat_exams: { icon: GraduationCap, color: 'gold', desc: 'Syllabi, mock tests and past papers' },
  cat_finance: { icon: Coins, color: 'blue', desc: 'Sewa Nidhi planning frameworks' },
  cat_jobs: { icon: Briefcase, color: 'green', desc: 'ATS CV builder and the job board' },
  g_login: { icon: LogIn, color: 'purple', desc: 'Sign in for guidance personalized to your profile' },
  // Top-level categories (by categoryKey) — used when browsing/answers list all topics
  exams: { icon: GraduationCap, color: 'gold', desc: 'Mock tests, PYQs and exam prep' },
  finance: { icon: Coins, color: 'blue', desc: 'Sewa Nidhi and wealth planning' },
  legal: { icon: Scale, color: 'purple', desc: 'Pension, OROP and legal aid' },
  jobs: { icon: Briefcase, color: 'green', desc: 'ATS CV and the corporate job board' },
  pricing: { icon: Sparkles, color: 'teal', desc: 'Compare FREE, PLUS and PRO plans' },
  about: { icon: Info, color: 'red', desc: 'Mission, HQ and support contact' }
};

// Popular Questions — real, verified-routing prompts that reach a genuine
// keyword-matched answer through the existing synthesizeIntelligentResponse /
// SPECIFIC_KNOWLEDGE_NODES pipeline below (same engine as free-form typing).
const POPULAR_QUESTIONS = [
  'How do I build an ATS resume?',
  'Latest government job notifications',
  'What is Sewa Nidhi and how to invest?',
  'How can I get legal support for OROP?'
];

// Pulls a short, real excerpt from an existing knowledge node's own answer
// (the line right after its bold heading) instead of inventing new copy.
function getNodeSummary(nodeId) {
  const node = SPECIFIC_KNOWLEDGE_NODES.find(n => n.id === nodeId);
  if (!node) return null;
  const secondLine = node.answer
    .split('\n')
    .filter(l => l.trim())
    .map(l => l.replace(/\*\*/g, '').replace(/^[-•]\s*/, ''))[1];
  return secondLine ? secondLine.slice(0, 78).trim() : null;
}

/**
 * Dedicated Category Overview Answers
 */
const CATEGORY_OVERVIEWS = {
  exams: {
    title: 'Exams, Mock Tests & PYQs Overview',
    answer: `**500+ Supported Competitive Examinations & Practice**\n\nVeerNXT offers specialized preparation for civil service and government entrance exams:\n- **Railways (RRB)**: RRB NTPC, RRB JE (Civil/Mech/Elec/IT), RRB ALP, Group D, & Nursing Superintendent.\n- **Staff Selection Commission (SSC)**: SSC Selection Post (Matric/Inter/Graduate), CGL, CHSL, & Stenographer.\n- **Police & Paramilitary**: RPF Constable & Sub-Inspector (SI), State Police Services.\n- **Mock Test Engine**: 450+ Tests with Learning Mode (instant solutions) and Speed Mode (timed conditions).\n- **PYQ Repository**: 400+ authentic past papers with official keys.\n\nSelect an option below for specific details!`,
    navLink: '/quiz-center',
    navLabel: 'Explore Mock Test Center',
    secondaryLink: '/pyq-center',
    secondaryLabel: 'Browse PYQ Center'
  },
  finance: {
    title: 'Sewa Nidhi & Wealth Preservation',
    answer: `**Sewa Nidhi & Wealth Growth Strategy**\n\nProtect and compound your military separation package (**₹10–12 Lakh Agniveer corpus**):\n- **15% Emergency Fund**: High-yield liquid savings & fixed deposits.\n- **55% Wealth Growth**: SEBI-regulated equity mutual funds for 10-15% annual compounding.\n- **20% Capital Protection**: Sovereign Gold Bonds (SGB) & Government Securities.\n- **10% Skill Re-investment**: Certifications & higher education.\n- **100% SEBI Regulated**: All advisory operates strictly through SEBI-compliant partners.\n- **Entrepreneurship**: Mudra loans (up to ₹10 Lakhs) & business setup.\n\nSelect an option below for detailed guidance!`,
    navLink: '/financial-guidance',
    navLabel: 'Plan Your Sewa Nidhi'
  },
  legal: {
    title: 'Legal Aid Cell for Ex-Servicemen',
    answer: `**Legal Aid Cell for Ex-Servicemen & Families**\n\nPro-bono legal advocacy and documentation assistance for veterans:\n- **OROP & Pension Disputes**: Rank-wise One Rank One Pension arrears, SPARSH portal resolution, & disability pension claims in Armed Forces Tribunal (AFT).\n- **Service Documentation**: Assistance with ECHS 64KB smart cards, CSD canteen cards, & discharge book corrections.\n- **Civil & Land Rights**: Legal counsel for veteran property disputes and local police administration.\n\nSelect an option below to consult!`,
    navLink: '/legal-aid',
    navLabel: 'Visit Legal Aid Cell'
  },
  jobs: {
    title: 'Corporate Jobs & ATS CV Builder',
    answer: `**Corporate Jobs & Defense ATS Resume Builder**\n\nCorporate career transition for veterans & Agniveers:\n- **Defense Trade Translation**: Converts military terms into corporate executive titles:\n  • **Signals Officer** -> Telecom & IT Operations Manager\n  • **Quartermaster / Storekeeper** -> Supply Chain & Logistics Supervisor\n  • **MT In-charge** -> Fleet Operations Manager\n  • **Squad Commander** -> Operations Team Lead\n- **Corporate Job Board**: Direct hiring pipelines in Logistics, Aviation Security, Defense Tech, & Facility Management.\n\nSelect an option below!`,
    navLink: '/cv',
    navLabel: 'Build Defense ATS Resume',
    secondaryLink: '/jobs',
    secondaryLabel: 'Browse Job Openings'
  },
  pricing: {
    title: 'Subscriptions & Tiers',
    answer: `**VeerNXT Membership Tiers & Pricing**\n\n- **FREE Tier (₹0)**: Profile Diagnostic Scan, Standard Exam Syllabi, & 1 Free Mock Test attempt.\n- **PLUS Tier**: Unlimited Mock Tests + Complete access to 400+ PYQ Papers.\n- **PRO Tier**: Unlimited Mock Tests + Priority Legal Aid Cell Consultation + Dedicated 1-on-1 Wealth Advisor.\n\nSelect an option below for plan details!`,
    navLink: '/subscribe',
    navLabel: 'View Subscription Plans'
  },
  about: {
    title: 'About VeerNXT Platform',
    answer: `**About VeerNXT Platform & Headquarters**\n\n- **Registered Entity**: Veteran Works Private Limited\n- **Mission**: Premier Defence Reintegration EdTech platform for Agniveers, Ex-Servicemen, & Dependants.\n- **Bengaluru HQ**: 225, 3rd C Cross Rd, Block 2, 3rd Stage, Basaveshwar Nagar, Bengaluru, Karnataka 560079, India.\n- **Support Email**: support@veernxt.com / contact@veernxt.com\n- **Government Alignment**: Aligned with civil service recruitment frameworks & DGR directives.\n\nSelect an option below for more details!`,
    navLink: '/support',
    navLabel: 'Contact Support Desk'
  }
};

/**
 * Detailed Specific Sub-Topic Knowledge Nodes
 */
const SPECIFIC_KNOWLEDGE_NODES = [
  {
    id: 'rrb_je',
    keywords: ['rrb je', 'junior engineer', 'diploma engineer', 'technical exam', 'railway je'],
    title: 'RRB Junior Engineer (JE)',
    answer: `**RRB Junior Engineer (JE) Exam**\n\n- **Eligibility**: Diploma/Degree in Engineering (Civil, Mechanical, Electrical, Electronics, IT).\n- **CBT-1**: 100 Marks (Math 30, Reasoning 25, Science 30, GA 15) - 90 Mins.\n- **CBT-2**: Technical Abilities (100 Marks) + Physics/Chemistry & Environment.\n- **VeerNXT Support**: Practice subject-wise technical mock tests and past papers.`,
    navLink: '/quiz-center',
    navLabel: 'Practice RRB JE Tests'
  },
  {
    id: 'rrb_ntpc',
    keywords: ['rrb ntpc', 'ntpc', 'station master', 'goods guard', 'commercial clerk'],
    title: 'RRB NTPC Examination',
    answer: `**RRB NTPC Examination Guide**\n\n- **Posts**: Station Master, Goods Guard, Commercial Apprentice, Senior Clerk.\n- **CBT-1**: 100 Qs (GA 40, Math 30, Reasoning 30) - 90 Minutes.\n- **CBT-2**: 120 Qs (GA 50, Math 35, Reasoning 35).\n- **VeerNXT Feature**: Full-length test simulations with negative marking calculation (-0.33).`,
    navLink: '/quiz-center',
    navLabel: 'Practice RRB NTPC Tests'
  },
  {
    id: 'rrb_alp',
    keywords: ['rrb alp', 'loco pilot', 'assistant loco pilot', 'technician'],
    title: 'RRB Assistant Loco Pilot (ALP)',
    answer: `**RRB ALP & Technician Exam Guide**\n\n- **Eligibility**: ITI / Diploma / Engineering in relevant trades.\n- **Stage 1**: 75 Qs (Math 20, Reasoning 25, Science 20, GA 10) in 60 mins.\n- **Stage 2**: Part A (Math, Reasoning, Engineering) + Part B (Trade Qualification).`,
    navLink: '/quiz-center',
    navLabel: 'Practice ALP Tests'
  },
  {
    id: 'ssc_post',
    keywords: ['ssc', 'ssc selection post', 'cgl', 'chsl', 'steno', 'stenographer'],
    title: 'SSC Examination Suite',
    answer: `**SSC Exam Suite & Ex-Servicemen Quotas**\n\n- **Exams Covered**: SSC Selection Post (Phase X/XI/XII), SSC CGL, SSC CHSL, SSC Stenographer.\n- **Pattern**: Reasoning (25 Qs), GA (25 Qs), Quant (25 Qs), English (25 Qs).\n- **ESM Reservation**: High quota allocation for Ex-Servicemen candidates.`,
    navLink: '/quiz-center',
    navLabel: 'Practice SSC Tests'
  },
  {
    id: 'rpf_police',
    keywords: ['rpf', 'constable', 'sub inspector', 'si', 'police', 'state police'],
    title: 'RPF & Police Recruitment',
    answer: `**RPF Constable & Sub-Inspector (SI)**\n\n- **CBT Pattern**: 120 Qs (GA 50, Arithmetic 35, Reasoning 35).\n- **Physical PET**: 1600m Run, High Jump, Long Jump.\n- **Age Relaxation**: Full military service duration deduction + 3 years.`,
    navLink: '/quiz-center',
    navLabel: 'Practice RPF Tests'
  },
  {
    id: 'mock_tests',
    keywords: ['mock test', 'test series', 'quiz', 'learning mode', 'speed mode', 'scoring', 'streak'],
    title: 'Mock Test Engine & Modes',
    answer: `**VeerNXT Mock Test Engine (450+ Tests)**\n\n- **Learning Mode**: Immediate answer explanations revealed after each question. Unlimited time.\n- **Speed Mode**: Realistic timed exam conditions (30s, 60s, 90s) with complete scorecard.\n- **Scoring**: Easy (+10 pts), Medium (+20 pts), Hard (+30 pts) + Time Bonus + Streak Multiplier.`,
    navLink: '/quiz-center',
    navLabel: 'Access Mock Tests'
  },
  {
    id: 'pyqs',
    keywords: ['pyq', 'past year', 'previous year', 'paper', 'old paper', 'question bank'],
    title: 'Past Year Question (PYQ) Repository',
    answer: `**Past Year Question (PYQ) Center (400+ Papers)**\n\n- **Authentic Collection**: Official scanned papers from past 5 years for RRB JE, NTPC, SSC Selection Post, RPF, and Defense exams.\n- **Interactive Reader**: Clean PDF document viewer with zoom, page navigation, and official answer keys.`,
    navLink: '/pyq-center',
    navLabel: 'Browse PYQ Center'
  },
  {
    id: 'sewa_nidhi',
    keywords: ['sewa nidhi', 'corpus', '10 lakh', '12 lakh', 'package', '4-pillar', 'allocation'],
    title: '₹10–12L 4-Pillar Sewa Nidhi Strategy',
    answer: `**₹10–12 Lakh 4-Pillar Sewa Nidhi Strategy**\n\n1. **15% Emergency Safety Net**: Liquid high-yield savings & fixed deposits.\n2. **55% Long-Term Wealth Growth**: SEBI-regulated equity mutual funds for compounding.\n3. **20% Capital Protection**: Sovereign Gold Bonds (SGB) & Government Securities.\n4. **10% Skill Re-Investment**: Certifications & higher education.`,
    navLink: '/financial-guidance',
    navLabel: 'Plan Your Sewa Nidhi'
  },
  {
    id: 'mutual_funds',
    keywords: ['mutual fund', 'sebi', 'safety', 'invest', 'sip', 'stock market'],
    title: 'SEBI Investment Safety & Mutual Funds',
    answer: `**SEBI Safety & Mutual Fund Advisory**\n\n- **100% Regulated**: VeerNXT does not pool user funds directly. All investments execute through SEBI-compliant and IRDAI-registered financial partners.\n- **SIP Wealth Growth**: Monthly Systematic Investment Plans (SIP) tailored for veterans.`,
    navLink: '/financial-guidance',
    navLabel: 'View Financial Suites'
  },
  {
    id: 'business_loan',
    keywords: ['business', 'entrepreneurship', 'mudra loan', 'startup', 'msme'],
    title: 'Entrepreneurship & Mudra Loans',
    answer: `**Veteran Entrepreneurship & Mudra Loans**\n\n- **Mudra Loans**: Guidance for Shishu, Kishor, and Tarun loan applications up to ₹10 Lakhs.\n- **MSME Registration**: Complete setup assistance for veteran-owned business enterprises.`,
    navLink: '/financial-guidance',
    navLabel: 'Explore Business Support'
  },
  {
    id: 'orop_pension',
    keywords: ['orop', 'pension', 'disability pension', 'one rank one pension', 'sparsh', 'aft'],
    title: 'OROP & Disability Pension Claims',
    answer: `**OROP & Disability Pension Assistance**\n\n- **One Rank One Pension (OROP)**: Guidance on rank-wise pension revision tables and arrears.\n- **Disability Pension Claims**: Legal assistance for attribution, aggravation, and Armed Forces Tribunal (AFT) representation.\n- **SPARSH Support**: Assistance with SPARSH portal logins and pension discrepancies.`,
    navLink: '/legal-aid',
    navLabel: 'Contact Legal Aid Cell'
  },
  {
    id: 'echs_csd',
    keywords: ['echs', 'csd', 'canteen', 'smart card', 'discharge certificate', 'service record'],
    title: 'ECHS 64KB & CSD Smart Cards',
    answer: `**ECHS & CSD Documentation Support**\n\n- **ECHS Enrolment**: Guidance for 64KB ECHS smart card application and polyclinic attachment.\n- **CSD Cards**: Online registration for grocery and liquor canteen smart cards.\n- **Service Records**: Resolution for clerical errors in discharge books.`,
    navLink: '/legal-aid',
    navLabel: 'Visit Legal Aid Cell'
  },
  {
    id: 'ats_cv',
    keywords: ['cv', 'resume', 'ats', 'defense resume', 'trade translation', 'signals', 'quartermaster', 'mt'],
    title: 'Defense ATS Resume Builder',
    answer: `**Defense ATS Resume Builder**\n\n- **Military Trade Translation**:\n  • **Signals Officer** -> Telecommunications & IT Operations Manager\n  • **Quartermaster / Storekeeper** -> Supply Chain & Logistics Supervisor\n  • **MT In-charge** -> Fleet Operations Manager\n  • **Squad Commander** -> Team Lead & Project Supervisor\n- **ATS Standard**: Formatted to pass corporate Applicant Tracking Systems (ATS).`,
    navLink: '/cv',
    navLabel: 'Build ATS Resume'
  },
  {
    id: 'jobs_board',
    keywords: ['job', 'jobs', 'hiring', 'recruitment', 'employer', 'salary', 'vacancies'],
    title: 'Ex-Servicemen Job Board',
    answer: `**VeerNXT Corporate Job Board**\n\n- **Direct Hiring**: Direct recruitment with verified corporate employers in Logistics, Aviation Security, Defense Tech, Telecommunications, and Operations.\n- **Search Filters**: Filter by military rank, trade background, city, and salary band.`,
    navLink: '/jobs',
    navLabel: 'Browse Job Openings'
  },
  {
    id: 'pricing_free',
    keywords: ['free tier', 'free plan', 'free test'],
    title: 'FREE Tier Benefits',
    answer: `**FREE Tier Package (₹0 Forever)**\n\n- **Includes**: Profile Diagnostic Scan, Standard Exam Syllabi, 1 Free Mock Test attempt, & Basic Financial Blueprint.`,
    navLink: '/subscribe',
    navLabel: 'View Subscription Plans'
  },
  {
    id: 'pricing_plus',
    keywords: ['plus tier', 'plus plan', 'unlimited tests'],
    title: 'PLUS Tier Benefits',
    answer: `**PLUS Tier Membership**\n\n- **Includes**: Unlimited Mock Tests + Full Access to 400+ Past Year Question (PYQ) Papers + Complete Learning Center Modules.`,
    navLink: '/subscribe',
    navLabel: 'Upgrade to PLUS'
  },
  {
    id: 'pricing_pro',
    keywords: ['pro tier', 'pro plan', 'wealth advisor', 'legal priority'],
    title: 'PRO Tier Benefits',
    answer: `**PRO Tier Membership**\n\n- **Includes**: Unlimited Mock Tests + Priority 1-on-1 Legal Aid Cell Consultation + Dedicated Personal Wealth Advisor + Unlimited Resume Exports.`,
    navLink: '/subscribe',
    navLabel: 'Upgrade to PRO'
  },
  {
    id: 'veernxt_overview',
    keywords: ['veernxt', 'what is veernxt', 'about veernxt', 'mission', 'veteran works'],
    title: 'Platform Overview',
    answer: `**VeerNXT Platform Overview**\n\n- **Entity**: Veteran Works Private Limited\n- **Mission**: Premier Defence Reintegration EdTech platform for Agniveers, Ex-Servicemen, & Dependants.\n- **Features**: Algorithmic job mapping, 500+ civil exam prep, Sewa Nidhi wealth growth, & legal aid advocacy.`,
    navLink: '/dashboard',
    navLabel: 'Open Dashboard'
  },
  {
    id: 'eligibility',
    keywords: ['eligible', 'eligibility', 'who can use', 'agniveer', 'esm'],
    title: 'Eligibility Requirements',
    answer: `**Eligibility Requirements**\n\n- Serving & Demobilized Agniveers (Army, Navy, Air Force).\n- Ex-Servicemen (ESM) & Veterans.\n- Defence Dependants & Family members.\n- Corporate Employers & Recruiters.`,
    navLink: '/profiling',
    navLabel: 'Start Eligibility Scan'
  },
  {
    id: 'contact_hq',
    keywords: ['address', 'location', 'headquarters', 'hq', 'bengaluru', 'contact', 'email'],
    title: 'Headquarters & Support Contact',
    answer: `**Headquarters & Support Contact**\n\n- **Address**: 225, 3rd C Cross Rd, Block 2, 3rd Stage, Basaveshwar Nagar, Bengaluru, Karnataka 560079, India.\n- **Support Email**: support@veernxt.com / contact@veernxt.com`,
    navLink: '/support',
    navLabel: 'Open Support Desk'
  }
];

// Top Level Category Chips
const TOPIC_CATEGORIES = [
  { id: 'cat_exams', label: 'Exams, Mock Tests & PYQs', categoryKey: 'exams' },
  { id: 'cat_finance', label: 'Sewa Nidhi & Wealth Growth', categoryKey: 'finance' },
  { id: 'cat_legal', label: 'Legal Aid Cell for ESM', categoryKey: 'legal' },
  { id: 'cat_jobs', label: 'Corporate Jobs & ATS CV', categoryKey: 'jobs' },
  { id: 'cat_pricing', label: 'Subscriptions & Tiers', categoryKey: 'pricing' },
  { id: 'cat_about', label: 'About VeerNXT & HQ Address', categoryKey: 'about' }
];

// Sub-topic option chips per category
const SUB_TOPIC_CHIPS = {
  exams: [
    { id: 'rrb_je', label: 'RRB Junior Engineer (JE)' },
    { id: 'rrb_ntpc', label: 'RRB NTPC Exam' },
    { id: 'rrb_alp', label: 'RRB Loco Pilot (ALP)' },
    { id: 'ssc_post', label: 'SSC Selection Post & CGL' },
    { id: 'rpf_police', label: 'RPF Constable & SI' },
    { id: 'mock_tests', label: 'Mock Test Engine & Modes' },
    { id: 'pyqs', label: '400+ PYQ Paper Documents' }
  ],
  finance: [
    { id: 'sewa_nidhi', label: '₹10–12L 4-Pillar Sewa Nidhi Strategy' },
    { id: 'mutual_funds', label: 'SEBI Safety & Mutual Funds' },
    { id: 'business_loan', label: 'Mudra Loans & Business Setup' }
  ],
  legal: [
    { id: 'orop_pension', label: 'OROP & Disability Pension Claims' },
    { id: 'echs_csd', label: 'ECHS 64KB & CSD Smart Cards' }
  ],
  jobs: [
    { id: 'ats_cv', label: 'Military Trade ATS CV Translation' },
    { id: 'jobs_board', label: 'Corporate Job Openings for ESM' }
  ],
  pricing: [
    { id: 'pricing_free', label: 'FREE Tier Benefits' },
    { id: 'pricing_plus', label: 'PLUS Tier Benefits' },
    { id: 'pricing_pro', label: 'PRO Tier Benefits' }
  ],
  about: [
    { id: 'veernxt_overview', label: 'Platform Overview & Mission' },
    { id: 'eligibility', label: 'Eligibility Requirements' },
    { id: 'contact_hq', label: 'Bengaluru HQ Address & Contact' }
  ]
};

/**
 * Formatted Text Renderer
 */
function renderFormattedMessage(text) {
  if (!text) return null;

  const lines = text.split('\n');

  return lines.map((line, lineIdx) => {
    const isBullet = line.trim().startsWith('- ') || line.trim().startsWith('• ');
    let cleanLine = line.trim();
    if (isBullet) {
      cleanLine = cleanLine.replace(/^[-•]\s*/, '');
    }

    const parts = cleanLine.split(/(\*\*?[^*]+\*\*?)/g);
    const lineElements = parts.map((part, partIdx) => {
      if ((part.startsWith('**') && part.endsWith('**') && part.length > 4) ||
          (part.startsWith('*') && part.endsWith('*') && part.length > 2)) {
        const cleanWord = part.replace(/^\*+|\*+$/g, '');
        return <strong key={partIdx} className="chat-bold">{cleanWord}</strong>;
      }
      return part;
    });

    if (isBullet) {
      return (
        <div key={lineIdx} className="chat-bullet-item">
          <span className="bullet-dot">•</span>
          <span className="bullet-content">{lineElements}</span>
        </div>
      );
    }

    if (cleanLine === '') {
      return <div key={lineIdx} className="chat-spacer" />;
    }

    return (
      <p key={lineIdx} className="chat-paragraph">
        {lineElements}
      </p>
    );
  });
}

export default function AiChatbotWidget() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [userProfile, setUserProfile] = useState(null); // null = loading, object = loaded
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [launcherPosition, setLauncherPosition] = useState(null);
  const chatEndRef = useRef(null);
  const launcherDragRef = useRef(null);

  // Fetch logged in user profile from Supabase
  const fetchUserProfile = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user || session.user.id === '00000000-0000-0000-0000-000000000000') {
        return { isLoggedIn: false };
      }

      const metadataRole = session.user?.user_metadata?.role;
      const isEmployer = metadataRole === 'employer' || (metadataRole !== 'candidate' && !!localStorage.getItem('employer_session'));

      if (isEmployer) {
        const { data } = await supabase
          .from('employer_profiles')
          .select('*')
          .eq('id', session.user.id)
          .maybeSingle();

        return {
          isLoggedIn: true,
          isEmployer: true,
          name: data?.contact_name || 'Employer',
          companyName: data?.company_name || '',
          industry: data?.industry || 'Defense & Corporate Hiring'
        };
      }

      const { data } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', session.user.id)
        .maybeSingle();

      return {
        isLoggedIn: true,
        isEmployer: false,
        name: data?.full_name || 'Veteran',
        rank: data?.rank_designation || 'Ex-Serviceman',
        branch: data?.service_branch || 'Indian Armed Forces',
        corps: data?.corps_arm || '',
        targetRole: data?.target_role || 'Corporate Reintegration',
        yearsOfService: data?.years_of_service || 4,
        education: data?.education_level || 'Graduate',
        skills: data?.skills || [],
        veerScore: data?.veer_score || 750,
        profilingCompleted: !!data?.profiling_completed
      };
    } catch (err) {
      console.warn('Error loading user profile in AiChatbotWidget:', err);
      return { isLoggedIn: false };
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    fetchUserProfile().then(prof => {
      if (isMounted) setUserProfile(prof);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      fetchUserProfile().then(prof => {
        if (isMounted) setUserProfile(prof);
      });
    });

    return () => {
      isMounted = false;
      subscription?.unsubscribe();
    };
  }, [fetchUserProfile]);

  // Remember the last loaded profile so later edits can be detected and reset the chat greeting.
  const prevProfileRef = useRef(null);

  useEffect(() => {
    if (prevProfileRef.current && userProfile) {
      const prev = prevProfileRef.current;
      const changed =
        prev.isLoggedIn !== userProfile.isLoggedIn ||
        prev.isEmployer !== userProfile.isEmployer ||
        prev.name !== userProfile.name ||
        prev.rank !== userProfile.rank ||
        prev.corps !== userProfile.corps ||
        prev.targetRole !== userProfile.targetRole;
      if (changed) {
        setMessages([]);
      }
    }
    if (userProfile) prevProfileRef.current = userProfile;
  }, [userProfile]);

  // Re-fetch the profile every time the drawer opens so profile changes made
  // elsewhere (profiling re-run, dashboard edits) are picked up immediately.
  useEffect(() => {
    if (isOpen && prevProfileRef.current) {
      fetchUserProfile().then(prof => setUserProfile(prof));
    }
  }, [isOpen, fetchUserProfile]);

  // Initialize or reset initial welcome message based on profile
  useEffect(() => {
    if (messages.length === 0 && userProfile !== null) {
      resetChatToInitial(userProfile);
    }
  }, [userProfile, messages.length]);

  useEffect(() => {
    if (isOpen && (messages.length > 1 || isTyping)) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, isTyping]);

  const resetChatToInitial = (prof) => {
    let initialMsg;

    if (prof?.isLoggedIn && !prof.isEmployer) {
      const rankName = `${prof.rank && prof.rank !== 'Ex-Serviceman' ? prof.rank + ' ' : ''}${prof.name || 'Veteran'}`;

      initialMsg = {
        id: 'msg-init',
        sender: 'bot',
        isAi: true,
        text: `Hi ${rankName}! 👋\nI'm your VeerNXT Assistant.\n\nI can help you with exams, career transition, Sewa Nidhi planning, legal aid, and much more. Choose a topic below or ask me anything.`,
        options: [
          { id: 'p_career', label: `Career & ATS CV`, optionType: 'personalized' },
          { id: 'p_exams', label: `Exams & Mock Tests`, optionType: 'personalized' },
          { id: 'p_sewa', label: `Sewa Nidhi Plan`, optionType: 'personalized' },
          { id: 'p_legal', label: `Pension & Legal Aid`, optionType: 'personalized' },
          { id: 'nav_network', label: 'Network & Community', optionType: 'route', routeTo: '/network' },
          { id: 'cat_about', label: 'About VeerNXT', categoryKey: 'about' },
          { id: 'browse_all', label: 'Browse all VeerNXT topics', optionType: 'show_all_categories' }
        ],
        timestamp: new Date()
      };
    } else if (prof?.isLoggedIn && prof.isEmployer) {
      initialMsg = {
        id: 'msg-init',
        sender: 'bot',
        isAi: true,
        text: `Hi ${prof.name || 'Employer'}! 👋\nI'm your VeerNXT Assistant.\n\nI can help with veteran recruitment, job postings and rank-to-corporate mapping. Choose a topic below or ask me anything.`,
        options: [
          { id: 'emp_search', label: `Match Verified Veterans`, optionType: 'employer' },
          { id: 'emp_post', label: `Post Job Opening`, optionType: 'employer' },
          { id: 'emp_rank_map', label: `Rank to Corporate Mapping`, optionType: 'employer' },
          { id: 'browse_all', label: 'Browse all VeerNXT topics', optionType: 'show_all_categories' }
        ],
        timestamp: new Date()
      };
    } else {
      initialMsg = {
        id: 'msg-init',
        sender: 'bot',
        isAi: true,
        text: `Welcome to VeerNXT! 👋\nI'm your VeerNXT Assistant.\n\nI can help with competitive exams, Sewa Nidhi, corporate careers and veteran support. Log in for guidance personalized to your profile.`,
        options: [
          { id: 'cat_exams', label: 'Exams & Mock Tests', categoryKey: 'exams' },
          { id: 'cat_finance', label: 'Sewa Nidhi Planning', categoryKey: 'finance' },
          { id: 'cat_jobs', label: 'Corporate Jobs & CV', categoryKey: 'jobs' },
          { id: 'g_login', label: 'Log In / Sign Up', optionType: 'login' }
        ],
        timestamp: new Date()
      };
    }

    setMessages([initialMsg]);
  };

  // Helper to trigger typing state
  const triggerThinkingResponse = (userMsgText, botResponseGenerator) => {
    if (isTyping) return;

    // 1. Instantly append user message if provided
    if (userMsgText) {
      const userMsg = {
        id: 'msg-' + Date.now(),
        sender: 'user',
        text: userMsgText,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, userMsg]);
    }

    // 2. Start typing indicator
    setIsTyping(true);

    // 3. Snappy, natural typing delay
    const delayMs = Math.floor(Math.random() * 250) + 450; // 450ms - 700ms

    setTimeout(() => {
      const botMsg = botResponseGenerator();
      setMessages(prev => [...prev, botMsg]);
      setIsTyping(false);
    }, delayMs);
  };

  // Handle Personalized Option Click
  const handlePersonalizedOptionClick = (optId, labelText) => {
    if (isTyping) return;

    triggerThinkingResponse(
      labelText,
      () => {
        let botText = '';
        let navLink = null;
        let navLabel = null;
        let secondaryLink = null;
        let secondaryLabel = null;
        let options = TOPIC_CATEGORIES;
        const personalized = optId !== 'p_all';

        if (optId === 'p_career') {
          botText = `**Personalized Career Blueprint for ${userProfile?.rank || ''} ${userProfile?.name || 'Veteran'}**\n\nBased on your service in **${userProfile?.branch || 'Armed Forces'}** ${userProfile?.corps ? '(' + userProfile.corps + ')' : ''}:\n- **Industry Alignment**: Telecom, Defense Tech, Supply Chain & Logistics, Corporate Operations.\n- **Veer Score Match**: High eligibility rating (${userProfile?.veerScore || 750}+ Points).\n- **Action Recommended**: Translate military service terms into corporate ATS keywords and explore verified corporate job openings.`;
          navLink = '/cv';
          navLabel = 'Build Defense ATS Resume';
          secondaryLink = '/jobs';
          secondaryLabel = 'Explore Jobs';
        } else if (optId === 'p_ats') {
          botText = `**Military Trade ATS CV Translation**\n\nYour profile (**${userProfile?.branch} - ${userProfile?.corps || 'Defence Trade'}**) automatically translates into corporate executive credentials:\n- **Military Rank/Trade**: ${userProfile?.rank} (${userProfile?.corps || userProfile?.branch})\n- **Core Executive Skills**: Leadership under pressure, Fleet/Inventory Control, Operational Security, Cross-functional Management.\n\nGenerate your recruiter-ready PDF resume now!`;
          navLink = '/cv';
          navLabel = 'Open ATS Resume Builder';
        } else if (optId === 'p_sewa') {
          botText = `**Sewa Nidhi Strategy for ${userProfile?.name}**\n\nTailored for **${userProfile?.yearsOfService || 4} Years** of military service in **${userProfile?.branch}**:\n- **Estimated Seva Nidhi Package**: ₹10.04 – ₹11.71 Lakhs\n- **15% Liquid Emergency Fund**: ₹1.5–1.8L in liquid yields.\n- **55% Equity Growth**: ₹5.5–6.5L in SEBI-regulated mutual funds for 12-15% CAGR compounding.\n- **20% Sovereign Protection**: ₹2.0–2.3L in SGBs / G-Secs.\n- **10% Skill Re-investment**: ₹1.0L for executive certifications.\n\nAll recommendations are strictly 100% SEBI-compliant.`;
          navLink = '/financial-guidance';
          navLabel = 'Plan Sewa Nidhi Portfolio';
        } else if (optId === 'p_exams') {
          botText = `**Recommended Civil Service & Government Exams**\n\nMatched to your **${userProfile?.education || 'Graduate'}** education level and **Ex-Servicemen (ESM)** quota:\n- **RRB Junior Engineer (JE)**: If Diploma/Degree in Engg held.\n- **RRB NTPC (Station Master / Goods Guard)**: High ESM reservation quota.\n- **SSC Selection Post & CGL**: Age relaxation equal to full service length + 3 years.\n- **RPF Sub-Inspector & Constable**: Direct recruitment with physical PET relaxations.`;
          navLink = '/quiz-center';
          navLabel = 'Practice Mock Tests';
          secondaryLink = '/pyq-center';
          secondaryLabel = 'Browse 400+ PYQs';
        } else if (optId === 'p_legal') {
          botText = `**Legal Aid & Pension Desk for ${userProfile?.rank} ${userProfile?.name}**\n\nPro-bono veteran legal advocacy services:\n- **OROP Revision & Arrears**: Verify rank-wise calculation tables.\n- **Disability Pension Claims**: Representation in Armed Forces Tribunal (AFT).\n- **SPARSH & ECHS**: SPARSH portal logins & 64KB Smart Card corrections.\n- **Civil & Land Disputes**: Advisory for home-town property disputes.`;
          navLink = '/legal-aid';
          navLabel = 'Consult Legal Cell';
        } else if (optId === 'emp_search') {
          botText = `**Find Verified Veteran Candidates**\n\nBrowse pre-screened Agniveer and Ex-Servicemen profiles matching your industry (**${userProfile?.industry || 'All Industries'}**):\n- **Algorithmic Skill Matching**: Filter candidates by military trade, rank, and preferred city.\n- **Instant ATS CV View**: Review recruiter-ready candidate profiles.`;
          navLink = '/find-candidates';
          navLabel = 'Search Veteran Candidates';
        } else if (optId === 'emp_post') {
          botText = `**Post a Corporate Job Opening**\n\nDirectly target demobilized Agniveers and Ex-Servicemen candidates across India:\n- **Automated Trade Translation**: Our platform matches your job requirements with equivalent military trades automatically.`;
          navLink = '/employer/dashboard';
          navLabel = 'Open Employer Portal';
        } else if (optId === 'emp_rank_map') {
          botText = `**Military Rank to Corporate Executive Matrix**\n\n- **Signals / IT Officer** -> Telecom & Network Operations Manager\n- **Quartermaster / ASC** -> Supply Chain & Inventory Director\n- **MT In-charge / EME** -> Fleet Operations & Logistics Supervisor\n- **Subedar / Warrant Officer** -> General Operations & Site Security Manager`;
          navLink = '/find-candidates';
          navLabel = 'Browse Candidate Matrix';
        } else if (optId === 'p_all') {
          botText = `Here are all main platform categories you can explore:`;
          options = TOPIC_CATEGORIES;
        }

        return {
          id: 'msg-' + Date.now(),
          sender: 'bot',
          isAi: true,
          text: botText,
          options,
          navLink,
          navLabel,
          secondaryLink,
          secondaryLabel,
          personalized,
          timestamp: new Date()
        };
      },
      `Analyzing ${userProfile?.name || 'user'}'s profile & generating personalized response...`
    );
  };

  // Handle Main Category Chip Click
  const handleCategoryClick = (catKey, labelText) => {
    if (isTyping) return;

    triggerThinkingResponse(
      labelText,
      () => {
        const subChips = SUB_TOPIC_CHIPS[catKey] || SUB_TOPIC_CHIPS.exams;
        const catOverview = CATEGORY_OVERVIEWS[catKey] || CATEGORY_OVERVIEWS.exams;

        return {
          id: 'msg-' + Date.now(),
          sender: 'bot',
          isAi: true,
          text: catOverview.answer,
          options: subChips,
          navLink: catOverview.navLink,
          navLabel: catOverview.navLabel,
          secondaryLink: catOverview.secondaryLink,
          secondaryLabel: catOverview.secondaryLabel,
          timestamp: new Date()
        };
      },
      `Querying ${labelText} knowledge graph...`
    );
  };

  // Handle Sub-Topic Item Click
  const handleSubTopicClick = (subId, labelText) => {
    if (isTyping) return;

    triggerThinkingResponse(
      labelText,
      () => {
        const item = SPECIFIC_KNOWLEDGE_NODES.find(k => k.id === subId) || SPECIFIC_KNOWLEDGE_NODES[0];

        return {
          id: 'msg-' + Date.now(),
          sender: 'bot',
          isAi: true,
          text: item.answer,
          options: TOPIC_CATEGORIES,
          navLink: item.navLink,
          navLabel: item.navLabel,
          secondaryLink: item.secondaryLink,
          secondaryLabel: item.secondaryLabel,
          timestamp: new Date()
        };
      },
      `Synthesizing guidance for ${labelText}...`
    );
  };

/**
 * Comprehensive NLU Intelligence Synthesizer
 * Dynamically parses user query, detects multi-layered intent,
 * and synthesizes explicit, crystal-clear, structured answers with profile context.
 */
function synthesizeIntelligentResponse(query, profile) {
  const q = query.toLowerCase().trim();
  const rank = profile?.rank || 'Veteran / Agniveer';
  const name = profile?.name || '';
  const branch = profile?.branch || 'Armed Forces';
  const corps = profile?.corps || '';
  const years = profile?.yearsOfService || 4;

  // 1. CAREER, SALARY, ATS & TRADE TRANSLATION
  if (
    q.includes('job') || q.includes('salary') || q.includes('pay') || 
    q.includes('corporate') || q.includes('career') || q.includes('resume') || 
    q.includes('cv') || q.includes('ats') || q.includes('trade') || 
    q.includes('hiring') || q.includes('interview') || q.includes('package') ||
    q.includes('scope') || q.includes('opportunity')
  ) {
    let salaryRange = '₹6.5L – ₹12.5L per annum';
    if (rank.includes('Officer') || rank.includes('Captain') || rank.includes('Major')) salaryRange = '₹16L – ₹28L per annum';
    else if (rank.includes('Subedar') || rank.includes('Havildar')) salaryRange = '₹9.5L – ₹15L per annum';

    let text = `**Corporate Career & Salary Guidance**\n\n`;
    text += `Based on your request regarding **"${query}"**:\n\n`;
    text += `- **Expected Corporate Package**: **${salaryRange}** (varies by company size & city tier).\n`;
    text += `- **Defense Trade Advantage**: Your background in **${branch} ${corps ? '(' + corps + ')' : ''}** qualifies you for executive roles in Supply Chain, Telecom & IT Infrastructure, Corporate Security, and Fleet Operations.\n`;
    text += `- **ATS Resume Optimizer**: Standard corporate HR portals use Applicant Tracking Systems (ATS). Our tool automatically converts military terms like *"Squad Commander / MT In-charge"* into recruiter-preferred keywords.\n`;
    if (name) {
      text += `\n**Note**: Open the ATS Resume Builder below to convert your ${branch} service experience into a PDF CV.`;
    }

    return {
      text,
      navLink: '/cv',
      navLabel: 'Build Defense ATS CV',
      secondaryLink: '/jobs',
      secondaryLabel: 'Explore Jobs',
      options: SUB_TOPIC_CHIPS.jobs
    };
  }

  // 2. EXAMS, MOCKS, PYQS & RESERVATIONS
  if (
    q.includes('exam') || q.includes('rrb') || q.includes('ntpc') || 
    q.includes('je') || q.includes('alp') || q.includes('ssc') || 
    q.includes('cgl') || q.includes('chsl') || q.includes('rpf') || 
    q.includes('police') || q.includes('upsc') || q.includes('mock') || 
    q.includes('quiz') || q.includes('test') || q.includes('pyq') || 
    q.includes('paper') || q.includes('syllabus') || q.includes('quota') || 
    q.includes('age') || q.includes('relaxation') || q.includes('cutoff')
  ) {
    let text = `**Civil Service & Competitive Exam Guide**\n\n`;
    text += `Regarding **"${query}"**:\n\n`;
    text += `- **Ex-Servicemen (ESM) Quotas**: Government rules allocate **10% reservation** in Group C & D civil posts (RRB, SSC, Police, & PSUs).\n`;
    text += `- **Age Relaxation Policy**: ESM candidates deduct their total military service duration from their current age, plus an additional **3-year bonus relaxation**.\n`;
    text += `- **Featured Exams**: \n`;
    text += `  • **RRB NTPC & JE**: Technical & administrative civil posts with high ESM intake.\n`;
    text += `  • **SSC Selection Post & CGL**: Non-technical corporate & central ministry officers.\n`;
    text += `  • **RPF Sub-Inspector & Constable**: Direct recruitment with physical PET relaxations.\n`;
    text += `- **VeerNXT Test Engine**: Access 450+ interactive Mock Tests (Learning & Speed Modes) and 400+ authentic Past Year Papers with official answer keys.\n`;
    if (name) {
      text += `\n**Note**: Your profile is already set up for exam eligibility matching.`;
    }

    return {
      text,
      navLink: '/quiz-center',
      navLabel: 'Practice Mock Tests',
      secondaryLink: '/pyq-center',
      secondaryLabel: 'Browse 400+ PYQs',
      options: SUB_TOPIC_CHIPS.exams
    };
  }

  // 3. SEWA NIDHI & FINANCIAL GUIDANCE
  if (
    q.includes('sewa') || q.includes('seva') || q.includes('nidhi') || 
    q.includes('corpus') || q.includes('invest') || q.includes('mutual') || 
    q.includes('fund') || q.includes('sip') || q.includes('gold') || 
    q.includes('sgb') || q.includes('money') || q.includes('wealth') || 
    q.includes('mudra') || q.includes('loan') || q.includes('business') || 
    q.includes('bank') || q.includes('sebi') || q.includes('fd')
  ) {
    let text = `**Sewa Nidhi & Wealth Preservation Strategy**\n\n`;
    text += `In response to **"${query}"**:\n\n`;
    text += `- **₹10.04L–₹11.71L Agniveer Package**: Your demobilization corpus is tax-free and ready for compounding.\n`;
    text += `- **4-Pillar Allocation Framework**:\n`;
    text += `  1. **15% Emergency Liquid Fund**: ₹1.5L–₹1.8L in high-yield liquid FDs.\n`;
    text += `  2. **55% Equity Compounder**: ₹5.5L–₹6.5L in SEBI-regulated mutual funds for 12–15% CAGR compounding.\n`;
    text += `  3. **20% Capital Safety**: Sovereign Gold Bonds (SGB) & G-Secs.\n`;
    text += `  4. **10% Skill Investment**: Certifications for executive upskilling.\n`;
    text += `- **Entrepreneurship Loans**: Mudra Shishu/Kishor/Tarun business loans up to **₹10 Lakhs** for veteran startups.\n`;
    text += `- **SEBI Regulated**: 100% compliant advisory operating through certified institutional partners.\n`;

    return {
      text,
      navLink: '/financial-guidance',
      navLabel: 'Plan Sewa Nidhi Portfolio',
      options: SUB_TOPIC_CHIPS.finance
    };
  }

  // 4. LEGAL AID, PENSION, SPARSH, ECHS & CSD
  if (
    q.includes('legal') || q.includes('orop') || q.includes('pension') || 
    q.includes('disability') || q.includes('sparsh') || q.includes('echs') || 
    q.includes('csd') || q.includes('canteen') || q.includes('smart card') || 
    q.includes('discharge') || q.includes('record') || q.includes('aft') || 
    q.includes('court') || q.includes('advocate') || q.includes('arrears')
  ) {
    let text = `**Legal Aid Cell & Pension Guidance**\n\n`;
    text += `Addressing your question on **"${query}"**:\n\n`;
    text += `- **OROP & Pension Arrears**: Verified rank-wise One Rank One Pension tables and arrears calculation support.\n`;
    text += `- **SPARSH Portal Resolution**: Assistance with pension discrepancies, login credential recovery, and digital life certificate submission.\n`;
    text += `- **ECHS 64KB Smart Card**: Complete enrolment assistance, polyclinic transfer, & dependent entitlement updates.\n`;
    text += `- **CSD Canteen Smart Card**: Online registration for liquor & grocery canteen cards.\n`;
    text += `- **Pro-Bono Legal Advocacy**: Representation in Armed Forces Tribunal (AFT) for disability pension claims and civil/land disputes.\n`;
    if (name) {
      text += `\n**Note**: You can request 1-on-1 legal advocacy through the Legal Cell.`;
    }

    return {
      text,
      navLink: '/legal-aid',
      navLabel: 'Consult Legal Aid Cell',
      options: SUB_TOPIC_CHIPS.legal
    };
  }

  // 5. EMPLOYER / RECRUITER INQUIRIES
  if (
    q.includes('employer') || q.includes('recruiter') || q.includes('hire') || 
    q.includes('post job') || q.includes('candidate') || q.includes('talent')
  ) {
    let text = `**Corporate Employer & Recruitment Solutions**\n\n`;
    text += `Regarding **"${query}"**:\n\n`;
    text += `- **Pre-Screened Talent Pool**: Access verified Agniveer & Ex-Servicemen profiles nationwide.\n`;
    text += `- **Algorithmic Trade Mapping**: Match corporate requirements directly with equivalent military trade backgrounds.\n`;
    text += `- **Direct Hiring**: Post job openings and schedule candidate interviews with zero recruitment commission fees.\n`;

    return {
      text,
      navLink: '/find-candidates',
      navLabel: 'Search Veteran Candidates',
      secondaryLink: '/employer/dashboard',
      secondaryLabel: 'Employer Dashboard',
      options: SUB_TOPIC_CHIPS.jobs
    };
  }

  // 6. DYNAMIC GENERAL QUERY SYNTHESIZER (Fallback for specific questions)
  const lowerQ = q.replace(/[^a-z0-9\s]/g, '').trim();
  const queryWords = lowerQ.split(/\s+/).filter(w => w.length > 2);
  let bestMatch = null;
  let highestScore = 0;

  SPECIFIC_KNOWLEDGE_NODES.forEach(item => {
    let score = 0;
    item.keywords.forEach(kw => {
      if (lowerQ.includes(kw)) score += kw.includes(' ') ? 3 : 2;
      else queryWords.forEach(w => { if (kw.includes(w)) score += 1; });
    });
    if (score > highestScore) {
      highestScore = score;
      bestMatch = item;
    }
  });

  if (highestScore > 0 && bestMatch) {
    let botText = bestMatch.answer;
    if (profile?.isLoggedIn && !profile.isEmployer) {
      botText += `\n\n**Note**: As a ${rank} (${branch}), you qualify for direct ESM quotas and preferential matching on VeerNXT.`;
    }
    return {
      text: botText,
      navLink: bestMatch.navLink,
      navLabel: bestMatch.navLabel,
      secondaryLink: bestMatch.secondaryLink,
      secondaryLabel: bestMatch.secondaryLabel,
      options: TOPIC_CATEGORIES
    };
  }

  // 7. COMPREHENSIVE INTELLIGENT SYNTHESIS FOR ANY OTHER QUERY
  let dynamicAnswer = `**VeerNXT Guidance Breakdown for "${query}"**\n\n`;
  dynamicAnswer += `1. **Core Recommendation**: VeerNXT offers targeted solutions for military transition, competitive exam prep, wealth growth, and veteran rights.\n`;
  dynamicAnswer += `2. **Key Capabilities Available**:\n`;
  dynamicAnswer += `   - **Defense ATS CV**: Convert military trade terms into corporate executive credentials.\n`;
  dynamicAnswer += `   - **500+ Exam Suite**: Practice RRB NTPC/JE, SSC, & Police mock tests with instant scorecards.\n`;
  dynamicAnswer += `   - **Sewa Nidhi Portfolio**: Compound your separation package in SEBI-regulated funds.\n`;
  dynamicAnswer += `   - **Legal Cell Advocacy**: Claim OROP arrears, resolve SPARSH pension issues, & apply for ECHS/CSD cards.\n`;
  if (name) {
    dynamicAnswer += `\n3. **Profile Status**: Synced with **${rank} ${name}** (${branch}). Select a specialized path below or contact our Bengaluru HQ support team!`;
  } else {
    dynamicAnswer += `\n3. **Action Step**: Select a category below or log in to generate profile-personalized guidance.`;
  }

  return {
    text: dynamicAnswer,
    navLink: '/support',
    navLabel: 'Contact Support Desk',
    secondaryLink: '/dashboard',
    secondaryLabel: 'Open Dashboard',
    options: TOPIC_CATEGORIES
  };
}

  // Smart Query Search Engine for Free-Form Typed Questions
  // Shared free-form query pipeline — used by both the input composer and the
  // Popular Questions prompts, so canned prompts get exactly the same real
  // routing/answers as anything a user types themselves.
  const processQuery = (query) => {
    if (!query || isTyping) return;

    triggerThinkingResponse(
      query,
      () => {
        if (!userProfile?.isLoggedIn) {
          return {
            id: 'msg-' + Date.now(),
            sender: 'bot',
            isAi: true,
            text: `**Login Required**\n\nTo get an answer for "${query}", please log in. Your profile (rank, service branch, education) lets VeerNXT give accurate guidance for exams, careers, Sewa Nidhi, and legal aid.`,
            options: [
              { id: 'g_login', label: 'Log In / Sign Up', optionType: 'login' }
            ],
            timestamp: new Date()
          };
        }

        const lowerQ = query.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();

        // 1. CONVERSATIONAL INTENT HANDLERS (Affirmations, Greetings, Thanks, Bye)
        const GREETINGS = ['hi', 'hello', 'hey', 'jai hind', 'good morning', 'good afternoon', 'good evening', 'greetings'];
        const AFFIRMATIONS = ['ok', 'okay', 'thanks', 'thank you', 'thanks a lot', 'got it', 'great', 'sure', 'nice', 'cool', 'k', 'kk', 'alright', 'understood', 'perfect'];
        const FAREWELLS = ['bye', 'goodbye', 'see ya', 'take care', 'cya'];

        let botText = '';
        let isConversational = false;

        if (GREETINGS.includes(lowerQ)) {
          botText = userProfile?.isLoggedIn
            ? `Hi ${userProfile.rank} ${userProfile.name}, how can I help? Pick a category below or ask a question.`
            : `Hi! How can I help? Pick a category below or ask a question.`;
          isConversational = true;
        } else if (AFFIRMATIONS.includes(lowerQ)) {
          botText = `You're welcome. Let me know if you need help with exams, Sewa Nidhi planning, legal aid, or resume building.`;
          isConversational = true;
        } else if (FAREWELLS.includes(lowerQ)) {
          botText = `Take care, and good luck with your career.`;
          isConversational = true;
        }

        if (isConversational) {
          return {
            id: 'msg-' + Date.now(),
            sender: 'bot',
            isAi: true,
            text: botText,
            options: TOPIC_CATEGORIES,
            timestamp: new Date()
          };
        }

        // 2. ADVANCED NLU INTELLIGENCE SYNTHESIZER
        const synthesizedResult = synthesizeIntelligentResponse(query, userProfile);

        return {
          id: 'msg-' + Date.now(),
          sender: 'bot',
          text: synthesizedResult.text,
          isAi: true,
          options: synthesizedResult.options || TOPIC_CATEGORIES,
          navLink: synthesizedResult.navLink,
          navLabel: synthesizedResult.navLabel,
          secondaryLink: synthesizedResult.secondaryLink,
          secondaryLabel: synthesizedResult.secondaryLabel,
          timestamp: new Date()
        };
      },
      `VeerNXT AI is evaluating "${query.slice(0, 24)}..."`
    );
  };

  const handleSendMessage = (e) => {
    e?.preventDefault();
    const query = inputText.trim();
    if (!query || isTyping) return;
    setInputText('');
    processQuery(query);
  };

  const handleResetChat = () => {
    resetChatToInitial(userProfile);
  };

  const handleLauncherPointerDown = (event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    launcherDragRef.current = {
      pointerId: event.pointerId,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
      moved: false,
    };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  const handleLauncherPointerMove = (event) => {
    const drag = launcherDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const size = 58;
    const margin = 12;
    const left = Math.min(Math.max(margin, event.clientX - drag.offsetX), window.innerWidth - size - margin);
    const top = Math.min(Math.max(margin, event.clientY - drag.offsetY), window.innerHeight - size - margin);
    drag.moved = true;
    setLauncherPosition({ left, top });
  };

  const handleLauncherPointerUp = (event) => {
    const drag = launcherDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    event.currentTarget.releasePointerCapture?.(event.pointerId);
  };

  const handleLauncherClick = () => {
    if (launcherDragRef.current?.moved) {
      launcherDragRef.current = null;
      return;
    }
    setIsOpen((open) => !open);
  };

  // This widget is candidate-facing (exam prep / Sewa Nidhi / job-search
  // guidance) -- it's mounted globally in App.jsx so it's available on
  // every candidate route without threading it through each page, but that
  // means it also renders on /admin/* unless explicitly excluded here.
  if (location.pathname.startsWith('/admin')) return null;

  return (
    <>
      {/* Floating Chatbot Launcher Button */}
      <button
        onClick={handleLauncherClick}
        onPointerDown={handleLauncherPointerDown}
        onPointerMove={handleLauncherPointerMove}
        onPointerUp={handleLauncherPointerUp}
        aria-label="Toggle VeerNXT AI Support"
        aria-pressed={isOpen}
        title="Drag to move • Tap to chat"
        className={`chatbot-fab ${isOpen ? 'active' : ''}`}
        style={launcherPosition ? { left: `${launcherPosition.left}px`, top: `${launcherPosition.top}px`, right: 'auto', bottom: 'auto' } : undefined}
      >
        {isOpen ? (
          <X size={24} />
        ) : (
          <Bot size={26} />
        )}
      </button>

      {/* Chat Drawer */}
      {isOpen && (
        <div className="chatbot-drawer">
          <div className="drawer-header">
            <span className="header-ribbon">For Veterans<br />By Veterans</span>
            <div className="header-left">
              <div className="bot-avatar">
                <Bot size={19} />
              </div>
              <div className="bot-titles">
                <h3>VeerNXT Assistant</h3>
                <span className="online-indicator">
                  <span className="dot" /> Online • Here to help 24/7
                </span>
              </div>
            </div>

            <div className="header-right">
              <button
                onClick={handleResetChat}
                className="btn-icon-head"
                title="Reset Conversation"
                aria-label="Reset conversation"
                disabled={isTyping}
              >
                <RotateCcw size={14} />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="btn-icon-head"
                title="Minimize"
                aria-label="Minimize assistant"
              >
                <Minus size={16} />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="btn-icon-head"
                title="Close"
                aria-label="Close assistant"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Messages Stream */}
          <div className="drawer-body">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`chat-bubble-row ${msg.sender === 'user' ? 'user-row' : 'bot-row'}`}
              >
                {msg.sender === 'bot' && (
                  <div className="msg-avatar bot">
                    <Bot size={14} />
                  </div>
                )}

                <div className={`msg-bubble ${msg.sender} ${msg.id === 'msg-init' ? 'msg-bubble-plain' : ''}`}>
                  {msg.id === 'msg-init' ? (
                    <div className="chat-greeting-box">
                      <div className="msg-text-content">
                        {renderFormattedMessage(msg.text)}
                      </div>
                    </div>
                  ) : (
                    <div className="msg-text-content">
                      {renderFormattedMessage(msg.text)}
                    </div>
                  )}

                  {msg.id === 'msg-init' && (
                    <div className="chat-quote-card">
                      <Quote size={16} className="chat-quote-mark" />
                      <p>New beginnings. Same discipline.<br />Let's build your next chapter together.</p>
                      <Mountain size={40} className="chat-quote-illustration" />
                    </div>
                  )}

                  {/* Internal Navigation Action Buttons */}
                  {(msg.navLink || msg.secondaryLink) && (
                    <div className="msg-actions-wrap">
                      {msg.navLink && (
                        <button
                          onClick={() => { navigate(msg.navLink); setIsOpen(false); }}
                          className="btn-nav-action primary"
                        >
                          <span>{msg.navLabel || 'Open Section'}</span>
                          <ChevronRight size={13} />
                        </button>
                      )}
                      {msg.secondaryLink && (
                        <button
                          onClick={() => { navigate(msg.secondaryLink); setIsOpen(false); }}
                          className="btn-nav-action secondary"
                        >
                          <span>{msg.secondaryLabel || 'View Details'}</span>
                          <ChevronRight size={13} />
                        </button>
                      )}
                    </div>
                  )}

                  {/* Options: rich color-coded action cards for top-level/personalized/
                      employer/login/route choices (2-column grid), plain topic cards
                      for sub-topic drill-downs (single column), and a slim "browse
                      all" link when present. */}
                  {msg.options && msg.options.length > 0 && (() => {
                    const realOptions = msg.options.filter(o => o.optionType !== 'show_all_categories');
                    const allCards = realOptions.every(o =>
                      o.categoryKey !== undefined || o.optionType === 'personalized' ||
                      o.optionType === 'employer' || o.optionType === 'login' || o.optionType === 'route'
                    );

                    return (
                      <div className={`chat-topic-grid ${allCards ? 'cards-2col' : ''}`}>
                        {realOptions.map(opt => {
                          const isCat = opt.categoryKey !== undefined;
                          const isPersonalized = opt.optionType === 'personalized' || opt.optionType === 'employer';
                          const isLogin = opt.optionType === 'login';
                          const isRoute = opt.optionType === 'route';
                          const meta = OPTION_META[opt.id] || (isCat ? OPTION_META[opt.categoryKey] : null);
                          const Icon = meta?.icon;
                          const desc = meta?.desc || (!isCat && !isPersonalized && !isLogin && !isRoute ? getNodeSummary(opt.id) : null);
                          const isCard = !!meta || isCat || isPersonalized || isRoute;

                          return (
                            <button
                              key={opt.id}
                              type="button"
                              disabled={isTyping}
                              onClick={() => {
                                if (isLogin) {
                                  navigate('/login');
                                  setIsOpen(false);
                                } else if (isRoute) {
                                  navigate(opt.routeTo);
                                  setIsOpen(false);
                                } else if (isPersonalized) {
                                  handlePersonalizedOptionClick(opt.id, opt.label);
                                } else if (isCat) {
                                  handleCategoryClick(opt.categoryKey, opt.label);
                                } else {
                                  handleSubTopicClick(opt.id, opt.label);
                                }
                              }}
                              className={isCard ? `chat-action-card color-${meta?.color || 'green'}` : 'chat-topic-card'}
                            >
                              {isCard && Icon && (
                                <span className={`chat-action-icon color-${meta?.color || 'green'}`}><Icon size={17} /></span>
                              )}
                              <span className="chat-action-body">
                                <span className="chat-action-title">{opt.label}</span>
                                {desc && <span className="chat-action-desc">{desc}</span>}
                              </span>
                              <ChevronRight size={15} className="chat-action-chevron" />
                            </button>
                          );
                        })}

                        {msg.options.some(o => o.optionType === 'show_all_categories') && (
                          <button
                            type="button"
                            className="chat-browse-all"
                            disabled={isTyping}
                            onClick={() => handlePersonalizedOptionClick('p_all', 'Browse all VeerNXT topics')}
                          >
                            Browse all VeerNXT topics <ChevronRight size={13} />
                          </button>
                        )}
                      </div>
                    );
                  })()}

                  {msg.id === 'msg-init' && (
                    <div className="chat-popular-questions">
                      <div className="chat-popular-divider"><span>Popular Questions</span></div>
                      <div className="chat-popular-grid">
                        {POPULAR_QUESTIONS.map(q => (
                          <button
                            key={q}
                            type="button"
                            className="chat-popular-pill"
                            disabled={isTyping}
                            onClick={() => processQuery(q)}
                          >
                            <MessageCircle size={13} />
                            <span>{q}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {msg.sender === 'user' && (
                  <div className="msg-avatar user">
                    <User size={14} />
                  </div>
                )}
              </div>
            ))}

            {/* Typing Indicator */}
            {isTyping && (
              <div className="chat-bubble-row bot-row">
                <div className="msg-avatar bot">
                  <Bot size={14} />
                </div>
                <div className="msg-bubble bot typing-bubble">
                  <span>VeerNXT Assistant is thinking</span>
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                </div>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          {/* Footer Input */}
          <div className="drawer-footer-wrap">
            <form onSubmit={handleSendMessage} className="drawer-footer">
              <div className="chat-input-shell">
                <Paperclip size={15} className="chat-input-clip" />
                <input
                  type="text"
                  aria-label="Ask the VeerNXT Assistant"
                  placeholder={userProfile?.isLoggedIn ? "Ask anything about exams, jobs, Sewa Nidhi, legal aid..." : "Ask about exams, careers or veteran support..."}
                  value={inputText}
                  disabled={isTyping}
                  onChange={(e) => setInputText(e.target.value)}
                  className="chat-input"
                />
              </div>
              <button
                type="submit"
                disabled={!inputText.trim() || isTyping}
                className="btn-send"
                aria-label="Send query"
              >
                <Send size={15} />
              </button>
            </form>
            <div className="chat-trust-line">
              <ShieldCheck size={12} /> Trusted • Accurate • Veteran Focused
            </div>
          </div>
        </div>
      )}

      {/* VeerNXT Assistant — premium presentation layer. Uses `!important` to
          opt out of the app-wide `* { border-radius: 0 !important }` rule
          (src/index.css) the same way this widget already did before this
          redesign — a floating chat widget reads better with soft, rounded
          chrome regardless of the flat page chrome around it. */}
      <style dangerouslySetInnerHTML={{ __html: `
        .chatbot-fab {
          position: fixed;
          bottom: 85px;
          right: 24px;
          width: 58px;
          height: 58px;
          border-radius: 50% !important;
          background: linear-gradient(135deg, var(--ios-olive, #54733a), #2e4a1f) !important;
          color: #FFFFFF !important;
          border: none !important;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 8px 24px rgba(20, 46, 31, 0.32), 0 2px 8px rgba(0, 0, 0, 0.1) !important;
          z-index: 9999;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
          touch-action: none;
          user-select: none;
        }

        .chatbot-fab::after {
          content: '';
          position: absolute;
          inset: -5px;
          border: 1px solid rgba(84, 115, 58, 0.28);
          border-radius: 50% !important;
          animation: assistantPulse 2.8s ease-out infinite;
          pointer-events: none;
        }

        @keyframes assistantPulse {
          0%, 65%, 100% { transform: scale(1); opacity: 0; }
          15% { opacity: 0.7; }
          45% { transform: scale(1.18); opacity: 0; }
        }

        .chatbot-fab:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 30px rgba(20, 46, 31, 0.4), 0 4px 10px rgba(0, 0, 0, 0.14) !important;
        }

        .chatbot-fab.active {
          background: #16281a !important;
        }
        .chatbot-fab.active::after { display: none; }

        /* Drawer */
        .chatbot-drawer {
          position: fixed;
          bottom: 155px;
          right: 24px;
          width: min(420px, calc(100vw - 28px));
          height: min(700px, calc(100vh - 190px));
          background: var(--surface, #fff) !important;
          border-radius: 18px !important;
          border: 1px solid var(--border-strong);
          box-shadow: 0 24px 60px rgba(15, 40, 28, 0.20), 0 4px 16px rgba(15, 40, 28, 0.08) !important;
          display: flex;
          flex-direction: column;
          z-index: 9998;
          overflow: hidden !important;
          animation: assistantOpen 0.22s cubic-bezier(0.16, 1, 0.3, 1);
        }

        @keyframes assistantOpen {
          from { opacity: 0; transform: translateY(12px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }

        @media (max-width: 480px) {
          .chatbot-drawer {
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            width: 100vw;
            height: 100dvh;
            max-height: 100dvh;
            border-radius: 0 !important;
          }
          .chatbot-fab { bottom: 20px; right: 20px; }
        }

        /* Header */
        .drawer-header {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.5rem;
          padding: 0.9rem 1rem 1.5rem;
          background: linear-gradient(120deg, var(--ios-olive, #54733a), #1f331a) !important;
          color: #FFFFFF !important;
          overflow: hidden;
        }
        .drawer-header::after {
          content: '';
          position: absolute;
          width: 150px;
          height: 150px;
          right: -65px;
          top: -92px;
          border: 1px solid rgba(255,255,255,0.16);
          border-radius: 50% !important;
          box-shadow: 0 0 0 24px rgba(255,255,255,0.05), 0 0 0 48px rgba(255,255,255,0.035);
          pointer-events: none;
        }

        .header-ribbon {
          position: absolute;
          bottom: 0.3rem;
          right: 0.85rem;
          font-family: 'Brush Script MT', 'Segoe Script', cursive;
          font-size: 0.72rem;
          line-height: 1.05;
          color: rgba(255, 255, 255, 0.35) !important;
          text-align: right;
          transform: rotate(-3deg);
          pointer-events: none;
        }

        @media (max-width: 480px) {
          .header-ribbon { display: none; }
        }

        .header-left {
          display: flex;
          align-items: center;
          gap: 0.65rem;
          min-width: 0;
        }

        .bot-avatar {
          width: 36px;
          height: 36px;
          border-radius: 10px !important;
          background: rgba(255, 255, 255, 0.16) !important;
          border: 1px solid rgba(255, 255, 255, 0.3) !important;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #FFFFFF !important;
          flex-shrink: 0;
        }

        .bot-titles {
          display: flex;
          flex-direction: column;
          gap: 1px;
          min-width: 0;
        }

        .bot-titles h3 {
          margin: 0;
          font-size: 0.92rem;
          font-weight: 800;
          color: #FFFFFF !important;
          line-height: 1.2;
        }

        .header-right {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          flex-shrink: 0;
        }

        .online-indicator {
          display: flex;
          align-items: center;
          gap: 0.3rem;
          font-size: 0.68rem;
          color: rgba(255, 255, 255, 0.85) !important;
        }

        .online-indicator .dot {
          width: 6px;
          height: 6px;
          border-radius: 50% !important;
          background: #A3E635 !important;
          box-shadow: 0 0 5px #A3E635 !important;
        }

        .btn-icon-head {
          background: rgba(255, 255, 255, 0.14) !important;
          border: none !important;
          color: #FFFFFF !important;
          width: 28px;
          height: 28px;
          border-radius: 8px !important;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: background-color 0.15s ease;
        }

        .btn-icon-head:hover:not(:disabled) {
          background: rgba(255, 255, 255, 0.26) !important;
        }

        .btn-icon-head:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        /* Body & Messages */
        .drawer-body {
          flex: 1;
          padding: 1rem;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 0.8rem;
          background:
            radial-gradient(circle at top right, rgba(84, 115, 58, 0.06), transparent 40%),
            var(--surface-alt, #f5f7f5) !important;
        }

        .drawer-body::-webkit-scrollbar { width: 6px; }
        .drawer-body::-webkit-scrollbar-thumb { background: rgba(84, 115, 58, 0.28); border-radius: 999px !important; }

        .chat-bubble-row {
          display: flex;
          align-items: flex-start;
          gap: 0.5rem;
          max-width: 92%;
        }

        .chat-bubble-row.user-row {
          align-self: flex-end;
          flex-direction: row-reverse;
        }

        .chat-bubble-row.bot-row {
          align-self: flex-start;
          max-width: 96%;
        }

        .msg-avatar {
          width: 26px;
          height: 26px;
          border-radius: 8px !important;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          margin-top: 2px;
        }

        .msg-avatar.bot {
          background: var(--ios-olive, #54733a) !important;
          color: #FFFFFF !important;
        }

        .msg-avatar.user {
          background: #9aa39a !important;
          color: #FFFFFF !important;
        }

        .msg-bubble {
          padding: 0.7rem 0.9rem;
          border-radius: 14px !important;
          font-size: 0.83rem;
          line-height: 1.5;
          word-break: break-word;
          animation: assistantMsgIn 0.18s ease-out;
        }

        @keyframes assistantMsgIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .msg-bubble.bot {
          background: var(--surface, #fff) !important;
          color: var(--ios-text, #16221b) !important;
          border: 1px solid var(--border-strong) !important;
          border-top-left-radius: 4px !important;
          box-shadow: var(--shadow-1);
        }

        .msg-bubble.user {
          background: #e8efe5 !important;
          color: #1f3928 !important;
          border-top-right-radius: 4px !important;
        }

        .chat-bold {
          font-weight: 700;
          color: inherit;
        }

        .chat-bullet-item {
          display: flex;
          align-items: flex-start;
          gap: 0.4rem;
          margin: 0.15rem 0;
        }

        .bullet-dot {
          color: var(--ios-olive, #54733a) !important;
          font-weight: bold;
        }

        .chat-spacer {
          height: 0.3rem;
        }

        .chat-paragraph {
          margin: 0 0 0.25rem 0;
        }

        .chat-paragraph:last-child {
          margin-bottom: 0;
        }

        /* Welcome message: no boxed bubble — its content (quote card, action
           cards, popular questions) sits directly on the drawer background
           instead of nested inside one bordered container. */
        .msg-bubble.bot.msg-bubble-plain {
          background: transparent !important;
          border: none !important;
          box-shadow: none !important;
          padding: 0 !important;
          border-radius: 0 !important;
        }

        .chat-greeting-box {
          display: inline-block;
          background: var(--success-bg, rgba(26, 156, 94, 0.1));
          border-radius: 12px !important;
          padding: 0.6rem 0.8rem;
        }

        /* Nav Action Buttons */
        .msg-actions-wrap {
          display: flex;
          flex-wrap: wrap;
          gap: 0.4rem;
          margin-top: 0.6rem;
          padding-top: 0.5rem;
          border-top: 1px solid var(--border);
        }

        .btn-nav-action {
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
          padding: 0.4rem 0.7rem;
          border-radius: 8px !important;
          font-size: 0.74rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .btn-nav-action.primary {
          background: var(--ios-olive, #54733a) !important;
          color: #FFFFFF !important;
          border: none !important;
        }

        .btn-nav-action.primary:hover {
          background: #3f612c !important;
        }

        .btn-nav-action.secondary {
          background: var(--surface-alt) !important;
          color: var(--ios-olive, #54733a) !important;
          border: 1px solid var(--border-strong) !important;
        }

        .btn-nav-action.secondary:hover {
          background: var(--border) !important;
        }

        /* Motivational quote card (welcome message only) */
        .chat-quote-card {
          position: relative;
          overflow: hidden;
          background: var(--success-bg, rgba(26, 156, 94, 0.08));
          border: 1px solid var(--border-strong);
          border-radius: 12px !important;
          padding: 0.75rem 0.9rem;
          margin: 0.7rem 0;
        }

        .chat-quote-mark {
          color: var(--ios-olive, #54733a);
          opacity: 0.5;
          margin-bottom: 0.2rem;
        }

        .chat-quote-card p {
          margin: 0;
          font-size: 0.8rem;
          font-style: italic;
          font-weight: 600;
          color: var(--ios-text);
          line-height: 1.45;
          max-width: 80%;
        }

        .chat-quote-illustration {
          position: absolute;
          right: 0.6rem;
          bottom: 0.5rem;
          color: var(--ios-olive, #54733a);
          opacity: 0.16;
        }

        /* Action cards (top-level / personalized / employer / login / route options) */
        .chat-topic-grid {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          margin-top: 0.6rem;
        }

        .chat-topic-grid.cards-2col {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0.55rem;
        }

        .chat-action-card, .chat-topic-card {
          position: relative;
          display: flex;
          align-items: center;
          gap: 0.65rem;
          width: 100%;
          text-align: left;
          background: var(--surface, #fff) !important;
          border: 1px solid var(--border-strong) !important;
          border-radius: 12px !important;
          padding: 0.65rem 0.75rem;
          cursor: pointer;
          transition: border-color 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease;
        }

        .cards-2col .chat-action-card {
          flex-direction: column;
          align-items: flex-start;
          gap: 0.5rem;
          padding: 0.75rem 0.7rem;
        }

        .cards-2col .chat-action-chevron {
          position: absolute;
          top: 0.7rem;
          right: 0.65rem;
        }

        .chat-action-card:hover:not(:disabled), .chat-topic-card:hover:not(:disabled) {
          border-color: var(--ios-olive, #54733a) !important;
          box-shadow: var(--shadow-1);
          transform: translateY(-1px);
        }

        .chat-action-card:disabled, .chat-topic-card:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .chat-action-icon {
          width: 34px;
          height: 34px;
          flex-shrink: 0;
          border-radius: 9px !important;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .chat-action-icon.color-green { background: rgba(26, 156, 94, 0.12); color: #1a7a4a; }
        .chat-action-icon.color-gold { background: rgba(217, 166, 42, 0.16); color: #a3760f; }
        .chat-action-icon.color-blue { background: rgba(37, 99, 235, 0.12); color: #2054c4; }
        .chat-action-icon.color-purple { background: rgba(147, 51, 234, 0.12); color: #7e22ce; }
        .chat-action-icon.color-red { background: rgba(220, 38, 38, 0.1); color: #dc2626; }
        .chat-action-icon.color-teal { background: rgba(13, 148, 136, 0.12); color: #0d9488; }

        .chat-action-body {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 0.1rem;
        }

        .cards-2col .chat-action-body { padding-right: 1rem; }

        .chat-action-title {
          font-size: 0.82rem;
          font-weight: 700;
          color: var(--ios-text);
        }

        .chat-action-desc {
          font-size: 0.72rem;
          color: var(--text-secondary, #718078);
          line-height: 1.35;
        }

        .chat-action-chevron {
          flex-shrink: 0;
          color: var(--text-secondary, #718078);
        }

        /* Popular Questions */
        .chat-popular-questions {
          margin-top: 0.9rem;
        }

        .chat-popular-divider {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          margin-bottom: 0.6rem;
        }

        .chat-popular-divider::before, .chat-popular-divider::after {
          content: '';
          flex: 1;
          height: 1px;
          background: var(--border-strong);
        }

        .chat-popular-divider span {
          font-size: 0.64rem;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--text-secondary, #718078);
          white-space: nowrap;
        }

        .chat-popular-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0.5rem;
        }

        .chat-popular-pill {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          background: var(--surface, #fff) !important;
          border: 1px solid var(--border-strong) !important;
          border-radius: 999px !important;
          padding: 0.5rem 0.7rem;
          font-size: 0.7rem;
          font-weight: 600;
          color: var(--ios-text);
          cursor: pointer;
          text-align: left;
          transition: border-color 0.15s ease, background 0.15s ease;
        }

        .chat-popular-pill svg {
          color: var(--ios-olive, #54733a);
          flex-shrink: 0;
        }

        .chat-popular-pill:hover:not(:disabled) {
          border-color: var(--ios-olive, #54733a) !important;
          background: var(--surface-alt) !important;
        }

        .chat-popular-pill:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        @media (max-width: 380px) {
          .chat-topic-grid.cards-2col, .chat-popular-grid { grid-template-columns: 1fr; }
        }

        @media (prefers-reduced-motion: reduce) {
          .chatbot-fab::after,
          .msg-bubble,
          .chatbot-drawer,
          .typing-dot { animation: none !important; }
        }

        .chat-browse-all {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.3rem;
          background: none !important;
          border: none !important;
          color: var(--ios-olive, #54733a) !important;
          font-size: 0.76rem;
          font-weight: 700;
          padding: 0.4rem;
          cursor: pointer;
          align-self: center;
        }

        .chat-browse-all:hover:not(:disabled) {
          text-decoration: underline;
        }

        /* Typing indicator */
        .typing-bubble {
          display: flex !important;
          align-items: center;
          gap: 6px;
          padding: 0.65rem 0.9rem !important;
          width: fit-content;
          font-size: 0.76rem;
          color: var(--text-secondary, #718078);
        }

        .typing-dot {
          width: 5px;
          height: 5px;
          border-radius: 50% !important;
          background: var(--ios-olive, #54733a) !important;
          display: inline-block;
          animation: typingBounce 1.2s infinite ease-in-out both;
        }

        .typing-dot:nth-child(2) { animation-delay: -0.32s; }
        .typing-dot:nth-child(3) { animation-delay: -0.16s; }
        .typing-dot:nth-child(4) { animation-delay: 0s; }

        @keyframes typingBounce {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.35; }
          40% { transform: scale(1); opacity: 1; }
        }

        /* Drawer Footer */
        .drawer-footer-wrap {
          background: var(--surface, #fff) !important;
          border-top: 1px solid var(--border);
        }

        .drawer-footer {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 0.85rem 0.4rem;
        }

        .chat-input-shell {
          flex: 1;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          min-width: 0;
          padding: 0 0.75rem;
          border: 1px solid var(--border-strong) !important;
          border-radius: 10px !important;
          background: var(--surface-alt, #f5f7f5) !important;
          transition: border-color 0.15s ease, box-shadow 0.15s ease;
        }

        .chat-input-shell:focus-within {
          border-color: var(--ios-olive, #54733a) !important;
          background: var(--surface, #fff) !important;
          box-shadow: 0 0 0 2px rgba(84, 115, 58, 0.15) !important;
        }

        .chat-input-clip {
          color: var(--text-secondary, #9CA3AF);
          flex-shrink: 0;
        }

        .chat-input {
          flex: 1;
          min-width: 0;
          padding: 0.6rem 0;
          border: none !important;
          outline: none;
          font-size: 0.83rem;
          background: transparent !important;
          color: var(--ios-text);
        }

        .chat-input::placeholder {
          color: var(--text-secondary, #9CA3AF);
        }

        .chat-trust-line {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.35rem;
          font-size: 0.66rem;
          font-weight: 600;
          color: var(--text-secondary, #718078);
          padding: 0.3rem 0 0.65rem;
        }

        .chat-trust-line svg {
          color: var(--ios-olive, #54733a);
        }

        .btn-send {
          width: 38px;
          height: 38px;
          border-radius: 10px !important;
          background: var(--ios-olive, #54733a) !important;
          color: #FFFFFF !important;
          border: none !important;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: background-color 0.15s ease;
          flex-shrink: 0;
        }

        .btn-send:hover:not(:disabled) {
          background: #3f612c !important;
        }

        .btn-send:disabled {
          background: var(--border-strong) !important;
          color: #9CA3AF !important;
          cursor: not-allowed;
        }
      `}} />
    </>
  );
}
