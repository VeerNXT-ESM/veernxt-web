import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Bot, 
  X, 
  Send, 
  RotateCcw, 
  ChevronRight,
  User
} from 'lucide-react';
import { supabase } from '../lib/supabase';

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
  const [isOpen, setIsOpen] = useState(false);
  const [userProfile, setUserProfile] = useState(null); // null = loading, object = loaded
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef(null);

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
        text: `Hi ${rankName}, how can I help you today? Ask any question or choose a topic:`,
        options: [
          { id: 'p_career', label: `Career & ATS CV`, optionType: 'personalized' },
          { id: 'p_sewa', label: `Sewa Nidhi Plan`, optionType: 'personalized' },
          { id: 'p_exams', label: `Exams & Mock Tests`, optionType: 'personalized' },
          { id: 'p_legal', label: `Pension & Legal Aid`, optionType: 'personalized' }
        ],
        timestamp: new Date()
      };
    } else if (prof?.isLoggedIn && prof.isEmployer) {
      initialMsg = {
        id: 'msg-init',
        sender: 'bot',
        isAi: true,
        text: `Hi ${prof.name || 'Employer'}, how can I help with veteran recruitment today?`,
        options: [
          { id: 'emp_search', label: `Match Verified Veterans`, optionType: 'employer' },
          { id: 'emp_post', label: `Post Job Opening`, optionType: 'employer' },
          { id: 'emp_rank_map', label: `Rank to Corporate Mapping`, optionType: 'employer' }
        ],
        timestamp: new Date()
      };
    } else {
      initialMsg = {
        id: 'msg-init',
        sender: 'bot',
        isAi: true,
        text: `Welcome to VeerNXT. Ask about competitive exams, Sewa Nidhi, corporate careers, or legal aid.`,
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
  const handleSendMessage = (e) => {
    e?.preventDefault();
    const query = inputText.trim();
    if (!query || isTyping) return;

    setInputText('');

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

  const handleResetChat = () => {
    resetChatToInitial(userProfile);
  };

  return (
    <>
      {/* Floating Chatbot Launcher Button - Circular with Open App Olive (#4B6B32) */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Toggle VeerNXT AI Support"
        className={`chatbot-fab ${isOpen ? 'active' : ''}`}
      >
        {isOpen ? (
          <X size={22} />
        ) : (
          <Bot size={24} />
        )}
      </button>

      {/* Chat Drawer */}
      {isOpen && (
        <div className="chatbot-drawer">
          {/* Clean, Simple Header */}
          <div className="drawer-header">
            <div className="header-left">
              <div className="bot-avatar">
                <Bot size={18} />
              </div>
              <div className="bot-titles">
                <h3>VeerNXT Assistant</h3>
                <span className="online-indicator">
                  <span className="dot" />
                  <span>Online</span>
                </span>
              </div>
            </div>

            <div className="header-right">
              <button 
                onClick={handleResetChat} 
                className="btn-icon-head" 
                title="Reset Conversation"
                disabled={isTyping}
              >
                <RotateCcw size={15} />
              </button>
              <button 
                onClick={() => setIsOpen(false)} 
                className="btn-icon-head" 
                title="Close"
              >
                <X size={17} />
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

                <div className={`msg-bubble ${msg.sender}`}>
                  {/* Formatted Text */}
                  <div className="msg-text-content">
                    {renderFormattedMessage(msg.text)}
                  </div>

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

                  {/* Option Chips as Clean, Minimalist Pills */}
                  {msg.options && msg.options.length > 0 && (
                    <div className="msg-chips-wrap">
                      {msg.options.map(opt => {
                        const isCat = opt.categoryKey !== undefined;
                        const isPersonalized = opt.optionType === 'personalized' || opt.optionType === 'employer';
                        const isShowAll = opt.optionType === 'show_all_categories';

                        return (
                          <button
                            key={opt.id}
                            disabled={isTyping}
                            onClick={() => {
                              if (opt.optionType === 'login') {
                                navigate('/login');
                                setIsOpen(false);
                              } else if (isPersonalized) {
                                handlePersonalizedOptionClick(opt.id, opt.label);
                              } else if (isShowAll) {
                                handlePersonalizedOptionClick('p_all', opt.label);
                              } else if (isCat) {
                                handleCategoryClick(opt.categoryKey, opt.label);
                              } else {
                                handleSubTopicClick(opt.id, opt.label);
                              }
                            }}
                            className="chip-pill"
                          >
                            <span>{opt.label}</span>
                          </button>
                        );
                      })}
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

            {/* Minimalist 3-Dot Typing Indicator */}
            {isTyping && (
              <div className="chat-bubble-row bot-row">
                <div className="msg-avatar bot">
                  <Bot size={14} />
                </div>
                <div className="msg-bubble bot typing-bubble">
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                </div>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          {/* Footer Input */}
          <form onSubmit={handleSendMessage} className="drawer-footer">
            <input
              type="text"
              placeholder={userProfile?.isLoggedIn ? "Ask about exams, Sewa Nidhi, ATS CV..." : "Ask any question..."}
              value={inputText}
              disabled={isTyping}
              onChange={(e) => setInputText(e.target.value)}
              className="chat-input"
            />
            <button
              type="submit"
              disabled={!inputText.trim() || isTyping}
              className="btn-send"
              aria-label="Send query"
            >
              <Send size={15} />
            </button>
          </form>
        </div>
      )}

      {/* Modern, Clean & Simple Styles with Open App Olive (#4B6B32) */}
      <style dangerouslySetInnerHTML={{ __html: `
        /* Launcher Floating Action Button - Plain Circle in Open App Olive */
        .chatbot-fab {
          position: fixed;
          bottom: 85px;
          right: 24px;
          width: 56px;
          height: 56px;
          border-radius: 50% !important;
          background: linear-gradient(135deg, #5A803D 0%, #4B6B32 50%, #3D5728 100%) !important;
          color: #FFFFFF !important;
          border: 2px solid rgba(255, 255, 255, 0.3) !important;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 10px 26px rgba(75, 107, 50, 0.42), 0 2px 6px rgba(0, 0, 0, 0.12) !important;
          z-index: 9999;
          transition: transform 0.2s ease, box-shadow 0.2s ease, filter 0.2s ease;
        }

        .chatbot-fab:hover {
          transform: translateY(-3px) scale(1.06);
          box-shadow: 0 14px 32px rgba(75, 107, 50, 0.52), 0 4px 10px rgba(0, 0, 0, 0.16) !important;
          filter: brightness(1.05);
        }

        .chatbot-fab.active {
          background: #2E421E !important;
          box-shadow: 0 6px 18px rgba(0, 0, 0, 0.3) !important;
        }

        /* Drawer Styling */
        .chatbot-drawer {
          position: fixed;
          bottom: 155px;
          right: 24px;
          width: 380px;
          max-width: calc(100vw - 32px);
          height: 550px;
          max-height: calc(100vh - 180px);
          background: #FFFFFF !important;
          border-radius: 18px !important;
          border: 1px solid rgba(0, 0, 0, 0.08) !important;
          box-shadow: 0 16px 48px rgba(0, 0, 0, 0.14) !important;
          display: flex;
          flex-direction: column;
          z-index: 9998;
          overflow: hidden !important;
          animation: drawerSlideUp 0.24s cubic-bezier(0.16, 1, 0.3, 1);
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        }

        @keyframes drawerSlideUp {
          from { opacity: 0; transform: translateY(12px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }

        /* Header in Open App Olive */
        .drawer-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.85rem 1rem;
          background: #4B6B32 !important;
          color: #FFFFFF !important;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1) !important;
        }

        .header-left {
          display: flex;
          align-items: center;
          gap: 0.65rem;
        }

        .bot-avatar {
          width: 34px;
          height: 34px;
          border-radius: 50% !important;
          background: rgba(255, 255, 255, 0.2) !important;
          border: 1px solid rgba(255, 255, 255, 0.35) !important;
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
        }

        .bot-titles h3 {
          margin: 0;
          font-size: 0.92rem;
          font-weight: 700;
          color: #FFFFFF !important;
          line-height: 1.2;
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

        .header-right {
          display: flex;
          gap: 0.35rem;
        }

        .btn-icon-head {
          background: rgba(255, 255, 255, 0.15) !important;
          border: none !important;
          color: #FFFFFF !important;
          width: 28px;
          height: 28px;
          border-radius: 50% !important;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: background-color 0.15s ease;
        }

        .btn-icon-head:hover:not(:disabled) {
          background: rgba(255, 255, 255, 0.28) !important;
        }

        .btn-icon-head:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        /* Body & Messages */
        .drawer-body {
          flex: 1;
          padding: 0.9rem;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          background: #FAFBF9 !important;
        }

        .chat-bubble-row {
          display: flex;
          align-items: flex-start;
          gap: 0.5rem;
          max-width: 90%;
        }

        .chat-bubble-row.user-row {
          align-self: flex-end;
          flex-direction: row-reverse;
        }

        .chat-bubble-row.bot-row {
          align-self: flex-start;
        }

        .msg-avatar {
          width: 26px;
          height: 26px;
          border-radius: 50% !important;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          margin-top: 2px;
        }

        .msg-avatar.bot {
          background: #4B6B32 !important;
          color: #FFFFFF !important;
        }

        .msg-avatar.user {
          background: #1F2937 !important;
          color: #FFFFFF !important;
        }

        .msg-bubble {
          padding: 0.65rem 0.85rem;
          border-radius: 14px !important;
          font-size: 0.82rem;
          line-height: 1.45;
          word-break: break-word;
        }

        .msg-bubble.bot {
          background: #FFFFFF !important;
          color: #1F2937 !important;
          border: 1px solid #E5E7EB !important;
          border-top-left-radius: 3px !important;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04) !important;
        }

        .msg-bubble.user {
          background: #4B6B32 !important;
          color: #FFFFFF !important;
          border-top-right-radius: 3px !important;
        }

        .chat-bold {
          font-weight: 700;
          color: #111827;
        }

        .user .chat-bold {
          color: #FFFFFF;
        }

        .chat-bullet-item {
          display: flex;
          align-items: flex-start;
          gap: 0.4rem;
          margin: 0.15rem 0;
        }

        .bullet-dot {
          color: #4B6B32 !important;
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

        /* Nav Action Buttons */
        .msg-actions-wrap {
          display: flex;
          flex-wrap: wrap;
          gap: 0.35rem;
          margin-top: 0.55rem;
          padding-top: 0.45rem;
          border-top: 1px solid #F3F4F6 !important;
        }

        .btn-nav-action {
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
          padding: 0.35rem 0.65rem;
          border-radius: 8px !important;
          font-size: 0.72rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .btn-nav-action.primary {
          background: #4B6B32 !important;
          color: #FFFFFF !important;
          border: none !important;
        }

        .btn-nav-action.primary:hover {
          background: #3D5728 !important;
        }

        .btn-nav-action.secondary {
          background: #F3F4F6 !important;
          color: #374151 !important;
          border: 1px solid #E5E7EB !important;
        }

        .btn-nav-action.secondary:hover {
          background: #E5E7EB !important;
        }

        /* Option Chips as Clean, Rounded Pills */
        .msg-chips-wrap {
          display: flex;
          flex-wrap: wrap;
          gap: 0.35rem;
          margin-top: 0.55rem;
        }

        .chip-pill {
          display: inline-flex;
          align-items: center;
          padding: 0.32rem 0.65rem;
          background: #F4F7F0 !important;
          border: 1px solid #D5E1CE !important;
          border-radius: 9999px !important;
          font-size: 0.72rem;
          font-weight: 500;
          color: #364D24 !important;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .chip-pill:hover:not(:disabled) {
          background: #4B6B32 !important;
          border-color: #4B6B32 !important;
          color: #FFFFFF !important;
        }

        .chip-pill:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        /* Minimal 3-Dot Typing Bubble */
        .typing-bubble {
          display: flex !important;
          align-items: center;
          gap: 5px;
          padding: 0.6rem 0.8rem !important;
          width: fit-content;
        }

        .typing-dot {
          width: 6px;
          height: 6px;
          border-radius: 50% !important;
          background: #4B6B32 !important;
          display: inline-block;
          animation: typingBounce 1.2s infinite ease-in-out both;
        }

        .typing-dot:nth-child(1) { animation-delay: -0.32s; }
        .typing-dot:nth-child(2) { animation-delay: -0.16s; }
        .typing-dot:nth-child(3) { animation-delay: 0s; }

        @keyframes typingBounce {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.35; }
          40% { transform: scale(1); opacity: 1; }
        }

        /* Drawer Footer */
        .drawer-footer {
          display: flex;
          align-items: center;
          gap: 0.45rem;
          padding: 0.65rem 0.85rem;
          background: #FFFFFF !important;
          border-top: 1px solid #E5E7EB !important;
        }

        .chat-input {
          flex: 1;
          padding: 0.55rem 0.8rem;
          border: 1px solid #D1D5DB !important;
          border-radius: 20px !important;
          font-size: 0.82rem;
          outline: none;
          background: #F9FAFB !important;
          transition: border-color 0.15s ease, box-shadow 0.15s ease;
        }

        .chat-input::placeholder {
          color: #9CA3AF;
        }

        .chat-input:focus {
          border-color: #4B6B32 !important;
          background: #FFFFFF !important;
          box-shadow: 0 0 0 2px rgba(75, 107, 50, 0.15) !important;
        }

        .btn-send {
          width: 34px;
          height: 34px;
          border-radius: 50% !important;
          background: #4B6B32 !important;
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
          background: #3D5728 !important;
        }

        .btn-send:disabled {
          background: #E5E7EB !important;
          color: #9CA3AF !important;
          cursor: not-allowed;
        }
      `}} />
    </>
  );
}
