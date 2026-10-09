import { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import {
  Book,
  RefreshCw,
  Search,
  ChevronDown,
  ChevronUp,
  BookOpen,
  ScrollText,
  X,
  Target,
  Rocket,
  ArrowRight,
  Shield,
  ShieldAlert,
  ShieldCheck,
  FileText,
  ChevronLeft,
  ChevronRight,
  Layers,
  Play,
  CheckCircle2,
  MoreVertical,
  SlidersHorizontal,
  Filter,
  Compass,
  Sparkles,
  Train,
  HeartPulse,
  Umbrella,
  GraduationCap,
  Cog,
  Landmark,
  Building,
  Scale,
  ClipboardList,
  Mail,
  Cpu,
  Atom,
  MapPin,
} from 'lucide-react';
import { getTransferableSkills } from '../lib/profilingInsights';
import { getSubjectByKey, getFamilyHex } from '../lib/thumbnailTaxonomy';
import { useThumbnails } from '../lib/thumbnailStore';
import { getEffectiveTier } from '../lib/subscriptionAccess';
import { ReaderThemeProvider } from '../components/book/theme/ReaderThemeProvider';
import ExamContentPreview from '../components/ExamContentPreview';
import CategoryExplorerPortal from '../components/CategoryExplorerPortal';
import { useExamContent, getExamResourceCount } from '../hooks/useExamContent';
import { cleanContentTitle } from '../lib/contentTitle';
import './LearningCenter.css';

// A handful of representative subjects for the Syllabus teaser card's chip
// row — this page has no single exam in context, so it can't show a real
// per-exam subject grid (that lives on ExamSyllabus.jsx); this is just a
// preview of the taxonomy used there.
const TEASER_SUBJECT_KEYS = ['english', 'gk_general_awareness', 'reasoning', 'mathematics', 'general_studies', 'computer_science'];

// What every exam card's coverage line reads, replacing the old made-up
// "Full Course" / "Tier 1 & Tier 2" style labels with what's actually
// available for every exam: syllabus, notes, mock tests and PYQs.
const CONTENT_COVERAGE_LABEL = 'Syllabus + Notes + Mock Test + PYQ';

// Dynamic color palette fallback for any newly added categories
const DYNAMIC_PALETTE = [
  { color: '#0284c7', bg: '#e0f2fe' },
  { color: '#15803d', bg: '#dcfce7' },
  { color: '#7c3aed', bg: '#ede9fe' },
  { color: '#d97706', bg: '#fef3c7' },
  { color: '#e11d48', bg: '#ffe4e6' },
  { color: '#0891b2', bg: '#cffafe' },
  { color: '#4338ca', bg: '#e0e7ff' },
  { color: '#0d9488', bg: '#ccfbf1' },
  { color: '#b45309', bg: '#fef3c7' },
  { color: '#475569', bg: '#f1f5f9' },
];

// Comprehensive icon and styling mapper for ALL categories in the left panel
function getCategoryIconMeta(cat) {
  const c = (cat || '').toLowerCase();
  if (c.includes('ssc')) return { icon: ShieldCheck, color: '#d97706', bg: '#fef3c7' };
  if (c.includes('civil') || c.includes('upsc')) return { icon: Landmark, color: '#1e3a8a', bg: '#dbeafe' };
  if (c.includes('psc') || c.includes('state')) return { icon: Building, color: '#047857', bg: '#d1fae5' };
  if (c.includes('bank') || c.includes('finance') || c.includes('commerce') || c.includes('account')) return { icon: Landmark, color: '#0284c7', bg: '#e0f2fe' };
  if (c.includes('railway') || c.includes('metro') || c.includes('train')) return { icon: Train, color: '#4338ca', bg: '#e0e7ff' };
  if (c.includes('defence') || c.includes('army') || c.includes('navy') || c.includes('air') || c.includes('armed')) return { icon: Shield, color: '#15803d', bg: '#dcfce7' };
  if (c.includes('police') || c.includes('cpo') || c.includes('si') || c.includes('constable') || c.includes('guard') || c.includes('intel')) return { icon: ShieldAlert, color: '#1d4ed8', bg: '#dbeafe' };
  if (c.includes('teach') || c.includes('educat') || c.includes('lectur') || c.includes('master') || c.includes('ugc') || c.includes('net')) return { icon: GraduationCap, color: '#7c3aed', bg: '#ede9fe' };
  if (c.includes('nurs') || c.includes('medic') || c.includes('health') || c.includes('pharma') || c.includes('cho') || c.includes('hospital')) return { icon: HeartPulse, color: '#e11d48', bg: '#ffe4e6' };
  if (c.includes('engin') || c.includes('je') || c.includes('technic') || c.includes(' it')) return { icon: Cog, color: '#475569', bg: '#f1f5f9' };
  if (c.includes('barc') || c.includes('drdo') || c.includes('isro') || c.includes('atom') || c.includes('research')) return { icon: Atom, color: '#0284c7', bg: '#e0f2fe' };
  if (c.includes('nic') || c.includes('computer') || c.includes('software')) return { icon: Cpu, color: '#0369a1', bg: '#e0f2fe' };
  if (c.includes('post') || c.includes('mail')) return { icon: Mail, color: '#b45309', bg: '#fef3c7' };
  if (c.includes('psu') || c.includes('maharatna') || c.includes('navratna')) return { icon: Building, color: '#0d9488', bg: '#ccfbf1' };
  if (c.includes('insur') || c.includes('lic') || c.includes('gic')) return { icon: Umbrella, color: '#0891b2', bg: '#cffafe' };
  if (c.includes('judic') || c.includes('court') || c.includes('law') || c.includes('legal')) return { icon: Scale, color: '#b45309', bg: '#fef3c7' };
  if (c.includes('forest') || c.includes('agri') || c.includes('hortic') || c.includes('fisher') || c.includes('icar') || c.includes('iari')) return { icon: Compass, color: '#059669', bg: '#d1fae5' };
  if (c.includes('panchayat') || c.includes('rural') || c.includes('admin')) return { icon: Building, color: '#0284c7', bg: '#e0f2fe' };

  // Dynamic hashing fallback for any newly added category
  let hash = 0;
  for (let i = 0; i < c.length; i++) hash = (hash * 31 + c.charCodeAt(i)) >>> 0;
  const palette = DYNAMIC_PALETTE[hash % DYNAMIC_PALETTE.length];
  return { icon: ClipboardList, color: palette.color, bg: palette.bg };
}

// State images mapping for generated state landscape banners
const STATE_IMAGES = {
  'Andhra Pradesh': '/state_images/andhra_pradesh.jpg',
  'Arunachal Pradesh': '/state_images/arunachal_pradesh.jpg',
  'Assam': '/state_images/assam.jpg',
  'Bihar': '/state_images/bihar.jpg',
  'Chhattisgarh': '/state_images/chhattisgarh.jpg',
};

// Rich state branding metadata for monogram badges, commission names and zone filters
const STATE_META = {
  'Rajasthan': { code: 'RJ', body: 'RPSC · RSMSSB', color: '#b45309', bg: '#fef3c7', zone: 'central_west' },
  'Uttar Pradesh': { code: 'UP', body: 'UPPSC · UPSSSC', color: '#1d4ed8', bg: '#dbeafe', zone: 'north' },
  'Bihar': { code: 'BR', body: 'BPSC · BSSC', color: '#15803d', bg: '#dcfce7', zone: 'east' },
  'Maharashtra': { code: 'MH', body: 'MPSC', color: '#0284c7', bg: '#e0f2fe', zone: 'central_west' },
  'Madhya Pradesh': { code: 'MP', body: 'MPPSC · MPESB', color: '#0d9488', bg: '#ccfbf1', zone: 'central_west' },
  'Tamil Nadu': { code: 'TN', body: 'TNPSC · TNUSRB', color: '#be123c', bg: '#ffe4e6', zone: 'south' },
  'Karnataka': { code: 'KA', body: 'KPSC · KSP', color: '#6d28d9', bg: '#ede9fe', zone: 'south' },
  'West Bengal': { code: 'WB', body: 'WBPSC · WBP', color: '#0891b2', bg: '#cffafe', zone: 'east' },
  'Gujarat': { code: 'GJ', body: 'GPSC · GSSSB', color: '#c2410c', bg: '#ffedd5', zone: 'central_west' },
  'Punjab': { code: 'PB', body: 'PPSC · PSSSB', color: '#b45309', bg: '#fef3c7', zone: 'north' },
  'Haryana': { code: 'HR', body: 'HPSC · HSSC', color: '#4338ca', bg: '#e0e7ff', zone: 'north' },
  'Kerala': { code: 'KL', body: 'Kerala PSC', color: '#047857', bg: '#d1fae5', zone: 'south' },
  'Andhra Pradesh': { code: 'AP', body: 'APPSC · SLPRB', color: '#0369a1', bg: '#e0f2fe', zone: 'south' },
  'Telangana': { code: 'TS', body: 'TSPSC · TSLPRB', color: '#7c3aed', bg: '#ede9fe', zone: 'south' },
  'Odisha': { code: 'OD', body: 'OPSC · OSSSC', color: '#0f766e', bg: '#ccfbf1', zone: 'east' },
  'Jharkhand': { code: 'JH', body: 'JPSC · JSSC', color: '#166534', bg: '#dcfce7', zone: 'east' },
  'Chhattisgarh': { code: 'CG', body: 'CGPSC · CG Vyapam', color: '#b45309', bg: '#fef3c7', zone: 'central_west' },
  'Assam': { code: 'AS', body: 'APSC · SLPRB', color: '#059669', bg: '#d1fae5', zone: 'northeast' },
  'Himachal Pradesh': { code: 'HP', body: 'HPPSC · HPSSC', color: '#0284c7', bg: '#e0f2fe', zone: 'north' },
  'Uttarakhand': { code: 'UK', body: 'UKPSC · UKSSSC', color: '#0369a1', bg: '#e0f2fe', zone: 'north' },
  'Goa': { code: 'GA', body: 'GPSC', color: '#0d9488', bg: '#ccfbf1', zone: 'central_west' },
  'Tripura': { code: 'TR', body: 'TPSC', color: '#7c3aed', bg: '#ede9fe', zone: 'northeast' },
  'Meghalaya': { code: 'ML', body: 'MPSC', color: '#047857', bg: '#d1fae5', zone: 'northeast' },
  'Manipur': { code: 'MN', body: 'MPSC', color: '#0891b2', bg: '#cffafe', zone: 'northeast' },
  'Nagaland': { code: 'NL', body: 'NPSC', color: '#b45309', bg: '#fef3c7', zone: 'northeast' },
  'Mizoram': { code: 'MZ', body: 'MPSC', color: '#15803d', bg: '#dcfce7', zone: 'northeast' },
  'Arunachal Pradesh': { code: 'AR', body: 'APPSC', color: '#0f766e', bg: '#ccfbf1', zone: 'northeast' },
  'Sikkim': { code: 'SK', body: 'SPSC', color: '#0284c7', bg: '#e0f2fe', zone: 'northeast' },
  // UTs
  'Delhi': { code: 'DL', body: 'DSSSB', color: '#b91c1c', bg: '#fee2e2', zone: 'north' },
  'Jammu & Kashmir': { code: 'JK', body: 'JKPSC · JKSSB', color: '#0284c7', bg: '#e0f2fe', zone: 'north' },
  'Ladakh': { code: 'LA', body: 'LAHD-SSRB', color: '#0369a1', bg: '#e0f2fe', zone: 'north' },
  'Chandigarh': { code: 'CH', body: 'Chandigarh Admin', color: '#4338ca', bg: '#e0e7ff', zone: 'north' },
  'Puducherry': { code: 'PY', body: 'Puducherry PSC', color: '#7c3aed', bg: '#ede9fe', zone: 'south' },
  'Andaman and Nicobar Islands': { code: 'AN', body: 'A&N Administration', color: '#0d9488', bg: '#ccfbf1', zone: 'south' },
  'Dadra & Nagar Haveli and Daman & Diu': { code: 'DN', body: 'DD Administration', color: '#b45309', bg: '#fef3c7', zone: 'central_west' },
  'Lakshadweep': { code: 'LD', body: 'Lakshadweep Admin', color: '#0891b2', bg: '#cffafe', zone: 'south' },
};

function getStateMeta(name) {
  if (STATE_META[name]) return STATE_META[name];
  const words = (name || '').trim().split(/\s+/);
  const code = words.length > 1 ? (words[0][0] + words[1][0]).toUpperCase() : (name || '').slice(0, 2).toUpperCase();
  let hash = 0;
  for (let i = 0; i < (name || '').length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  const palette = DYNAMIC_PALETTE[hash % DYNAMIC_PALETTE.length];
  return {
    code,
    body: `${name} Public Service Commission`,
    color: palette.color,
    bg: palette.bg,
    zone: 'all',
  };
}

const STATE_ZONES = [
  { id: 'all', label: 'All States' },
  { id: 'north', label: 'North' },
  { id: 'south', label: 'South' },
  { id: 'east', label: 'East' },
  { id: 'central_west', label: 'West & Central' },
  { id: 'northeast', label: 'North-East' },
];

const RECOMMENDED_EXAMS = [
  {
    id: 'ssc-cgl-prep',
    searchTerm: 'cgl',
    title: 'SSC CGL Complete Preparation',
    conductingBody: 'SSC · Central Government',
    badge: 'Popular',
    badgeBg: '#fef3c7',
    badgeColor: '#92400e',
    category: 'SSC',
  },
  {
    id: 'delhi-police-guide',
    // Was just 'police' -- matched whichever police exam happened to come
    // first in the fetched catalog (e.g. a different state's Police exam),
    // so clicking this card could open a completely unrelated exam. Every
    // state runs its own Police recruitment, so the term has to name the
    // state to stay unambiguous.
    searchTerm: 'delhi police',
    title: 'Delhi Police Constable Complete Guide',
    conductingBody: 'SSC',
    badge: 'New',
    badgeBg: '#e0e7ff',
    badgeColor: '#3730a3',
    category: 'Police (UT)',
  },
  // 'railway-ntpc-prep' removed: confirmed live (searching "NTPC" and
  // "railway" in Learning Center both return zero exams) that there is no
  // Railway exam in the catalog at all yet, so this card could never open a
  // real exam page. Re-add it once a Railway/NTPC exam exists in lc_exams --
  // pick a searchTerm from that exam's actual name at that point.
  {
    id: 'agri-dept-exams',
    searchTerm: 'agriculture',
    title: 'Agriculture Department Exams',
    conductingBody: 'State PSC',
    badge: 'Trending',
    badgeBg: '#dcfce7',
    badgeColor: '#166534',
    category: 'Agriculture Department',
  },
  {
    id: 'cs-comp-exams',
    searchTerm: 'computer',
    title: 'Computer Science for Competitive Exams',
    conductingBody: 'Multiple Exams',
    badge: 'Featured',
    badgeBg: '#f3e8ff',
    badgeColor: '#6b21a8',
    category: 'NIC',
  },
  {
    id: 'banking-prep',
    searchTerm: 'bank',
    title: 'Banking & Financial Sector Exams',
    conductingBody: 'IBPS / State Bank of India',
    badge: 'High Vacancy',
    badgeBg: '#fef9c3',
    badgeColor: '#854d0e',
    category: 'Banking',
  },
];

const ACTIVE_LEARNING_STORAGE_KEY = 'veernxt_active_learning_courses';

const getInitialActiveLearning = () => {
  try {
    const raw = localStorage.getItem(ACTIVE_LEARNING_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.warn('Could not parse active learning from localStorage:', e);
  }
  return [];
};

const formatTimeAgo = (timestamp) => {
  if (!timestamp) return 'Recently';
  const diff = Date.now() - Number(timestamp);
  const minutes = Math.floor(diff / 60000);
  if (minutes < 2) return 'Just now';
  if (minutes < 60) return `${minutes} mins ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  return `${Math.floor(days / 7)}w ago`;
};

const POPULAR_EXAM_TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'syllabus', label: 'Syllabus' },
  { key: 'mock', label: 'Mock Tests & Quizzes' },
  { key: 'pyq', label: 'PYQs' },
];

const POPULAR_EXAMS = [
  {
    id: 'pop-upsc',
    name: 'UPSC Civil Services',
    subtitle: 'Union Public Service Commission (UPSC)',
    description: 'UPSC conducts the Civil Services Examination for premier administrative, diplomatic, and police roles across India. It is the gold standard for public service leadership and nation-building.',
    aboutText: 'The Union Public Service Commission (UPSC) conducts the Civil Services Examination (CSE) annually to select officers for all-India and premier central services. The exam features Preliminary, Mains, and Personality Test stages.',
    aboutHighlights: [
      'Premier administrative & diplomatic services in the country',
      'High policy impact and direct governance responsibilities',
      'Open to graduates across all academic disciplines',
      'Prestigious cadre progression with national recognition',
      'Structured 3-stage objective & subjective evaluation',
    ],
    topPosts: [
      'Indian Administrative Service (IAS)',
      'Indian Police Service (IPS)',
      'Indian Foreign Service (IFS)',
      'Indian Revenue Service (IRS)',
      'Indian Audit & Accounts Service (IAAS)',
      'Assistant Commandant (CAPF)',
    ],
    relatedExamsList: [
      { name: 'UPSC Civil Services', level: 'Graduate Level', image: '/homepage/F4_A.png' },
      { name: 'UPSC CAPF (AC)', level: 'Graduate Level', image: '/homepage/F5A.png' },
      { name: 'UPSC CDS Exam', level: 'Graduate Level', image: '/thumbnails/Reasoning.png' },
      { name: 'UPSC NDA Exam', level: '12th Pass', image: '/thumbnails/English.png' },
      { name: 'Indian Economic Service', level: 'Post Graduate', image: '/thumbnails/Financial Awareness.png' },
    ],
    conductingBody: 'Union Public Service Commission (UPSC)',
    badge: 'Premier',
    badgeBg: '#fef3c7',
    badgeColor: '#92400e',
    category: 'Civil Services',
    matchCategory: 'Civil Services',
    matchNameHint: 'civil service',
    searchQuery: 'upsc',
  },
  {
    id: 'pop-ssc',
    name: 'SSC Examinations',
    subtitle: 'Staff Selection Commission (SSC)',
    description: 'SSC conducts various recruitment examinations for Group B and Group C posts in central government ministries, departments and organizations. These exams provide excellent opportunities for a stable and rewarding career in public service.',
    aboutText: 'The Staff Selection Commission (SSC) conducts recruitment exams like CGL, CHSL, MTS, CPO, GD Constable and more. These exams recruit candidates for various Group B and Group C posts across central government ministries and departments.',
    aboutHighlights: [
      'High number of vacancies every year',
      'Wide range of job profiles across central departments',
      'Opportunity for candidates from diverse educational backgrounds',
      'Stable career with growth & departmental promotion paths',
      'Exams conducted in multiple stages with objective pattern',
    ],
    topPosts: [
      'Assistant Section Officer (CGL)',
      'Lower Division Clerk (CHSL)',
      'Sub-Inspector (CPO)',
      'Multi Tasking Staff (MTS)',
      'Constable (GD)',
      'Junior Secretariat Assistant (JSA)',
    ],
    relatedExamsList: [
      { name: 'SSC CGL', level: 'Graduate Level', image: '/homepage/F4_A.png' },
      { name: 'SSC CHSL', level: '12th Pass', image: '/homepage/F5A.png' },
      { name: 'SSC MTS', level: '10th Pass', image: '/thumbnails/Reasoning.png' },
      { name: 'SSC GD Constable', level: '10th Pass', image: '/homepage/F4_A.png' },
      { name: 'SSC CPO', level: 'Graduate Level', image: '/thumbnails/Agriculture.png' },
    ],
    conductingBody: 'Staff Selection Commission (SSC)',
    badge: 'High Vacancy',
    badgeBg: '#dcfce7',
    badgeColor: '#166534',
    category: 'SSC',
    searchQuery: 'ssc',
  },
  {
    id: 'pop-state-psc',
    name: 'State PSC Exams',
    subtitle: 'State Administrative & Police Services',
    description: 'State Public Service Commissions conduct recruitment for prestigious administrative, executive, and provincial civil service roles across states.',
    aboutText: 'State PSCs (such as BPSC, UPPSC, MPPSC, MPSC, TNPSC, KPSC, etc.) recruit executive officers to drive state administration, revenue management, policing, and local governance.',
    aboutHighlights: [
      'Executive cadre posts directly under state government',
      'Key administrative authority across districts and tehsils',
      'State language and general studies oriented syllabus',
      'Fast-track promotions to IAS/IPS cadre nominations',
      'Regular recruitment cycles for provincial civil services',
    ],
    topPosts: [
      'Deputy Collector / SDM',
      'Deputy Superintendent of Police (DSP)',
      'Block Development Officer (BDO)',
      'Commercial Tax Officer (CTO)',
      'Assistant Conservator of Forests (ACF)',
      'Naib Tehsildar',
    ],
    relatedExamsList: [
      { name: 'Combined State Civil Services', level: 'Graduate Level', image: '/homepage/F4_A.png' },
      { name: 'State Judicial Services', level: 'Law Graduate', image: '/thumbnails/Reasoning.png' },
      { name: 'State Forest Service', level: 'Science Graduate', image: '/thumbnails/Agriculture.png' },
      { name: 'State Assistant Engineer', level: 'B.Tech / B.E.', image: '/thumbnails/Computer Science.png' },
      { name: 'State Revenue Inspector', level: 'Graduate Level', image: '/thumbnails/General Studies.png' },
    ],
    conductingBody: 'State Public Service Commissions',
    badge: 'State Level',
    badgeBg: '#e0e7ff',
    badgeColor: '#3730a3',
    category: 'Administrative Services',
    searchQuery: 'psc',
  },
  {
    id: 'pop-police',
    name: 'Police Examinations',
    subtitle: 'State & Central Police Boards',
    description: 'Police recruitment boards conduct regular examinations for Constables, Sub-Inspectors, and CAPF personnel ensuring law enforcement, safety, and security.',
    aboutText: 'Police recruitment examinations select personnel for state police forces, central armed police forces (BSF, CRPF, CISF, ITBP, SSB), and specialized enforcement bureaus.',
    aboutHighlights: [
      'Direct law enforcement, public safety, and border security duties',
      'Well-suited for defense personnel and ESM transitioning out',
      'Physical efficiency and objective written examination pattern',
      'Special reservations and age relaxations for veterans',
      'Stable salary, accommodation, and defense canteen facilities',
    ],
    topPosts: [
      'Sub-Inspector (Civil Police)',
      'Head Constable / Constable',
      'Assistant Sub-Inspector (ASI)',
      'CAPF Sub-Inspector',
      'Armed Police Constable',
      'Wireless Operator / Driver',
    ],
    relatedExamsList: [
      { name: 'Delhi Police Constable & SI', level: '12th / Graduate', image: '/thumbnails/Reasoning.png' },
      { name: 'State Police SI Exam', level: 'Graduate Level', image: '/homepage/F4_A.png' },
      { name: 'SSC GD Paramilitary', level: '10th Pass', image: '/homepage/F5A.png' },
      { name: 'RPF SI & Constable', level: '10th / Graduate', image: '/thumbnails/General Studies.png' },
      { name: 'State Police Constable', level: '12th Pass', image: '/thumbnails/English.png' },
    ],
    conductingBody: 'State & Central Police Boards',
    badge: 'Veteran Favorite',
    badgeBg: '#fee2e2',
    badgeColor: '#991b1b',
    category: 'Police',
    searchQuery: 'police',
  },
  {
    id: 'pop-banking',
    name: 'Banking & Insurance',
    subtitle: 'IBPS / State Bank of India',
    description: 'Banking examinations recruit Probationary Officers, Clerks, and Specialist Officers for public sector banks, RBI, NABARD, and national insurance corporations.',
    aboutText: 'The Institute of Banking Personnel Selection (IBPS) and SBI conduct fast-paced recruitment exams with predictable schedules, objective tests, and swift joining timelines.',
    aboutHighlights: [
      'Fastest recruitment timelines from prelims to final allotment',
      'Lucrative allowances, perks, and performance incentives',
      'Clear career progression to managerial and leadership ranks',
      'Ex-servicemen quota available across clerical and PO cadres',
      'Nationwide postings with public sector banking benefits',
    ],
    topPosts: [
      'Probationary Officer (PO)',
      'Clerk / Junior Associate',
      'Specialist Officer (IT / Law / Agri)',
      'RBI Grade B Officer',
      'NABARD Grade A Officer',
      'RRB Office Assistant',
    ],
    relatedExamsList: [
      { name: 'SBI PO & Clerk', level: 'Graduate Level', image: '/thumbnails/Financial Awareness.png' },
      { name: 'IBPS PO & Clerk', level: 'Graduate Level', image: '/homepage/F5A.png' },
      { name: 'RBI Grade B Officer', level: 'Graduate (60%)', image: '/homepage/F4_A.png' },
      { name: 'IBPS RRB Scale I & Asst', level: 'Graduate Level', image: '/thumbnails/English.png' },
      { name: 'LIC AAO & ADO', level: 'Graduate Level', image: '/thumbnails/Reasoning.png' },
    ],
    conductingBody: 'IBPS / State Bank of India',
    badge: 'Fast Track',
    badgeBg: '#fef9c3',
    badgeColor: '#854d0e',
    category: 'Banking',
    searchQuery: 'bank',
  },
  {
    id: 'pop-teaching',
    name: 'Teaching Exams',
    subtitle: 'CBSE & Central/State Boards',
    description: 'National and state teacher eligibility tests and recruitment drives for faculty positions in Kendriya Vidyalayas, Navodaya Vidyalayas, and state government schools.',
    aboutText: 'Central and state teacher eligibility tests (CTET, State TET) certify candidates for teaching positions from primary to senior secondary levels with stable hours and societal impact.',
    aboutHighlights: [
      'Balanced work-life schedule with stable government benefits',
      'National recognition through CTET qualification',
      'Opportunities in premier schools like KVS, NVS, and Army Public Schools',
      'Merit-based selection with specialized subject focus',
      'Lifelong validity for central teacher eligibility certificates',
    ],
    topPosts: [
      'Primary Teacher (PRT)',
      'Trained Graduate Teacher (TGT)',
      'Post Graduate Teacher (PGT)',
      'Kendriya Vidyalaya Faculty',
      'Navodaya Vidyalaya Teacher',
      'Special Education Teacher',
    ],
    relatedExamsList: [
      { name: 'CTET (Paper 1 & Paper 2)', level: 'D.El.Ed / B.Ed', image: '/thumbnails/English.png' },
      { name: 'KVS PRT, TGT & PGT', level: 'Graduate + B.Ed', image: '/thumbnails/General Studies.png' },
      { name: 'NVS Teacher Recruitment', level: 'Graduate + B.Ed', image: '/homepage/F4_A.png' },
      { name: 'State TET Exams', level: 'Teacher Training', image: '/thumbnails/Reasoning.png' },
      { name: 'Army Public School CSB', level: 'Graduate + B.Ed', image: '/thumbnails/English.png' },
    ],
    conductingBody: 'CBSE & Central/State Boards',
    badge: 'Popular',
    badgeBg: '#f3e8ff',
    badgeColor: '#6b21a8',
    category: 'Teaching & Education',
    searchQuery: 'teaching',
  },
];

// Built entirely from real lc_exams fields (name/category/conducting body/
// region) -- never guesses at content, but guarantees the Overview tab always
// has at least one honest sentence instead of sitting empty for the many
// exams that don't have a curated lc_exam_intro row yet.
function buildExamSummary({ examName, category, conductingBodyName, regionLevel }) {
  const levelLabel = regionLevel === 'central' ? 'central' : regionLevel === 'state' ? 'state' : regionLevel === 'ut' ? 'union territory' : null;
  let sentence = conductingBodyName ? `${conductingBodyName} conducts ${examName}` : `${examName} is a recruitment exam`;
  if (category) sentence += ` under the ${category} category`;
  if (levelLabel) sentence += `, at the ${levelLabel} level`;
  return `${sentence}.`;
}

// 3-column Overview tab for the Popular Exams details panel
function PopularExamOverview({ exam, relatedExams, navigate }) {
  const { categoryUrl } = useThumbnails();
  const { intro, loading } = useExamContent(exam?.matchedName, undefined, exam?.examId);

  return (
    <div className="lc-exam-overview-grid-3col">
      {/* Col 1: About the Exam */}
      <div className="lc-overview-col">
        <h4 className="lc-overview-col-title">About the Exam</h4>
        <p className="lc-overview-col-desc">
          {exam?.aboutText || buildExamSummary({ examName: exam?.matchedName, category: exam?.category, conductingBodyName: exam?.conductingBodyName, regionLevel: exam?.regionLevel })}
        </p>

        {exam?.aboutHighlights?.length > 0 && (
          <ul className="lc-overview-highlights-list">
            {exam.aboutHighlights.map((hl, i) => (
              <li key={i} className="lc-overview-highlight-item">
                <CheckCircle2 size={16} className="lc-highlight-check" />
                <span>{hl}</span>
              </li>
            ))}
          </ul>
        )}

        {intro?.source === 'manual' && intro.body && (
          <ReaderThemeProvider category="Intro" style={{ background: 'transparent' }}>
            <div className="lc-exam-intro-text" dangerouslySetInnerHTML={{ __html: intro.body }} />
          </ReaderThemeProvider>
        )}
      </div>

      {/* Col 2: Top Posts */}
      <div className="lc-overview-col">
        <h4 className="lc-overview-col-title">Top Posts</h4>
        <div className="lc-overview-posts-list">
          {(exam?.topPosts || ['Assistant Section Officer', 'Sub-Inspector', 'Multi Tasking Staff', 'Junior Secretariat Assistant', 'Executive Officer']).map((post, i) => (
            <div key={i} className="lc-overview-post-card">
              <CheckCircle2 size={15} className="lc-post-check-icon" />
              <span className="lc-post-card-title">{post}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Col 3: Related Exams */}
      <div className="lc-overview-col">
        <h4 className="lc-overview-col-title">Related Exams</h4>
        <div className="lc-overview-related-list">
          {exam?.relatedExamsList?.length > 0 ? (
            exam.relatedExamsList.map((rel, i) => (
              <div
                key={i}
                className="lc-related-exam-card"
                onClick={() => {
                  if (exam?.examId) {
                    navigate(`/exam/${exam.examId}`, { state: { from: '/learning-center' } });
                  }
                }}
              >
                <img src={categoryUrl(exam?.category) || ''} alt={rel.name} className="lc-related-exam-img" onError={(ev) => { ev.target.style.visibility = 'hidden'; }} />
                <div className="lc-related-exam-info">
                  <div className="lc-related-exam-name">{rel.name}</div>
                  <div className="lc-related-exam-level">{rel.level}</div>
                </div>
              </div>
            ))
          ) : relatedExams?.length > 0 ? (
            relatedExams.map((e) => (
              <div
                key={e.id}
                className="lc-related-exam-card"
                onClick={() => navigate(`/exam/${e.id}`, { state: { from: '/learning-center' } })}
              >
                <img src={categoryUrl(e.category) || ''} alt={e.name} className="lc-related-exam-img" onError={(ev) => { ev.target.style.visibility = 'hidden'; }} />
                <div className="lc-related-exam-info">
                  <div className="lc-related-exam-name">{e.name}</div>
                  <div className="lc-related-exam-level">{e.category || 'Competitive Exam'}</div>
                </div>
              </div>
            ))
          ) : (
            <p className="lc-exam-details-empty-inline">No related exams found yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * One coherent flow: Search + Filters -> Recommended For You -> Search Results -> My Exams ->
 * Preparation Centers (Syllabus / PYQ / Quiz) -> Skill Development.
 */
const LearningCenter = () => {
  // Exam thumbnails come from the category's thumbnail (admin > Categories).
  const { categoryUrl } = useThumbnails();
  const cardImage = (card) => card.image || categoryUrl(card.category) || '';
  const navigate = useNavigate();
  const recommendedScrollRef = useRef(null);
  const continueScrollRef = useRef(null);
  const popularExamsScrollRef = useRef(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState(null);

  // Personalization signals
  const [examMatches, setExamMatches] = useState([]);
  const [transferableSkills, setTransferableSkills] = useState([]);
  const [examProgress, setExamProgress] = useState({});
  const [authUserId, setAuthUserId] = useState(null);

  // Primary preparation target (from user_exam_targets)
  const [primaryTarget, setPrimaryTarget] = useState(null); // { exam_id, exam_name, conducting_body, ... }
  const [allTargetIds, setAllTargetIds] = useState(new Set()); // all saved exam IDs
  const [preparingExamId, setPreparingExamId] = useState(null); // loading state for CTA

  // Sidebar accordions open state
  const [openFilters, setOpenFilters] = useState({
    category: true,
    body: true,
  });

  // Mobile side-drawer filter state (mobile/tablet <1100px only)
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [openDrawerFilters, setOpenDrawerFilters] = useState({
    category: true,
    body: false,
  });

  // Active learning courses (courses/exams the candidate has started learning)
  const [activeLearningCourses, setActiveLearningCourses] = useState(getInitialActiveLearning);

  // Persist course in activeLearningCourses (state + localStorage)
  const recordActiveLearning = useCallback((courseData) => {
    setActiveLearningCourses((prev) => {
      const filtered = prev.filter(
        (c) =>
          c.id !== courseData.id &&
          (!courseData.examId || c.examId !== courseData.examId) &&
          c.title !== courseData.title
      );
      const updatedItem = {
        ...courseData,
        lastAccessedAt: courseData.lastAccessedAt || Date.now(),
        progress: courseData.progress ?? 0,
      };
      const nextList = [updatedItem, ...filtered];
      try {
        localStorage.setItem(ACTIVE_LEARNING_STORAGE_KEY, JSON.stringify(nextList));
      } catch (err) {
        console.warn('Failed to persist active learning courses:', err);
      }
      return nextList;
    });
  }, []);

  // Checks if a recommended card is currently in progress
  const isLearningCard = useCallback(
    (card) => {
      return activeLearningCourses.some(
        (c) =>
          c.id === card.id ||
          (c.title && c.title.toLowerCase() === card.title.toLowerCase()) ||
          (c.searchTerm && card.searchTerm && c.searchTerm.toLowerCase() === card.searchTerm.toLowerCase())
      );
    },
    [activeLearningCourses]
  );

  // Secondary sidebar filter criteria
  const [bodySearch, setBodySearch] = useState('');
  const [showAllBodies, setShowAllBodies] = useState(false);
  const [showAllCategories, setShowAllCategories] = useState(false);

  // Catalog + filters. The whole lc_exams catalog (~1.5k rows) is fetched
  // paginated; every filter/level/derived list comes from it client-side.
  const [regionMode, setRegionMode] = useState('central'); // 'central' | 'state' | 'ut'
  const [catalog, setCatalog] = useState([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState(null);
  const [regionFilterId, setRegionFilterId] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [rightTab, setRightTab] = useState('explorer'); // 'explorer' | 'recommended'
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [selectedBodyId, setSelectedBodyId] = useState('');
  const [searchText, setSearchText] = useState('');
  const [stateSearchText, setStateSearchText] = useState('');
  const [selectedZone, setSelectedZone] = useState('all');

  const [expandedExamId, setExpandedExamId] = useState(null);

  // Popular Exams inline details panel — clicking a card selects it and
  // expands its real data below the carousel, instead of navigating away.
  const [selectedPopularExamId, setSelectedPopularExamId] = useState(null);
  const [activePopularExamTab, setActivePopularExamTab] = useState('overview');

  const [profile, setProfile] = useState(null);
  const effectiveTier = getEffectiveTier(profile?.subscription_tier, profile?.subscription_expires_at);
  const freeQuizUsed = !!profile?.free_quiz_used;

  const toggleExpanded = (examId) => setExpandedExamId((prev) => (prev === examId ? null : examId));

  const toggleFilterGroup = (key) => {
    setOpenFilters((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const scrollTrack = (ref, direction) => {
    if (ref && ref.current) {
      const scrollAmount = direction === 'left' ? -300 : 300;
      ref.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  const handlePopularExamSelect = (exam) => {
    setSelectedPopularExamId((prev) => (prev === exam.id ? null : exam.id));
    setActivePopularExamTab('overview');
  };

  const handleResumeCourse = (course) => {
    recordActiveLearning({
      ...course,
      lastAccessedAt: Date.now(),
    });
    if (course.examId) {
      navigate(`/exam/${course.examId}`, { state: { from: '/learning-center' } });
    } else if (course.searchTerm) {
      const match = findCatalogMatch(course.searchTerm);
      if (match) {
        navigate(`/exam/${match.id}`, { state: { from: '/learning-center' } });
      } else {
        setSearchText(course.searchTerm);
        const resultsEl = document.getElementById('lc-search-results-section');
        if (resultsEl) {
          resultsEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }
    } else {
      const resultsEl = document.getElementById('lc-search-results-section');
      if (resultsEl) {
        resultsEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  };

  const handleExploreAllCourses = () => {
    handleClearFilters();
    window.scrollTo({ top: 480, behavior: 'smooth' });
  };

  const handleStartCardExam = (card) => {
    // Real catalog-backed cards (shown once Category/Conducting Body
    // filters are active) already carry their own exam id — no need to
    // fuzzy-match a title against the catalog.
    if (card.examId) {
      recordActiveLearning({
        id: card.id,
        examId: card.examId,
        title: card.title,
        category: card.category || card.conductingBody || 'Central Exam',
        image: cardImage(card),
        progress: 0,
        lastAccessedAt: Date.now(),
      });
      handleStartPreparing(card.examId, card.title);
      return;
    }

    const match = findCatalogMatch(card.searchTerm);
    const examId = match?.id || null;
    const examName = match?.name || card.title;

    recordActiveLearning({
      id: card.id,
      examId,
      title: card.title,
      category: match?.category || card.category || card.conductingBody || 'Central Exam',
      image: cardImage(card),
      progress: 0,
      lastAccessedAt: Date.now(),
      searchTerm: card.searchTerm,
    });

    if (match) {
      handleStartPreparing(match.id, match.name);
    } else if (searchResults.length > 0) {
      handleStartPreparing(searchResults[0].id, searchResults[0].name);
    } else {
      // No catalog match for this card's term at all -- rather than
      // silently updating the (possibly off-screen) search box and doing
      // nothing else visible, which reads as "the card is broken", fall
      // back to showing the filtered search results so the click always
      // does *something* the person can see.
      setSearchText(card.searchTerm);
      const resultsEl = document.getElementById('lc-search-results-section');
      if (resultsEl) {
        resultsEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  };

  // Saves the exam as the candidate's primary target and navigates to its journey.
  const handleStartPreparing = useCallback(async (examId, examName) => {
    if (!examId) return;

    const examItem = catalog.find((e) => e.id === examId);
    recordActiveLearning({
      id: examId,
      examId,
      title: examName || examItem?.name || 'Competitive Exam',
      category: examItem?.conducting_body?.name || examItem?.category || 'Central Exam',
      image: categoryUrl(examItem?.category) || '/homepage/F5A.png',
      progress: 0,
      lastAccessedAt: Date.now(),
      searchTerm: examName || examItem?.name,
    });

    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      navigate(`/exam/${examId}`, { state: { from: '/learning-center' } });
      return;
    }
    setPreparingExamId(examId);
    try {
      // Demote-then-upsert done atomically server-side (sql/user_learning_journey_fixes.sql)
      // so a dropped connection can't leave the account with zero or two primaries.
      await supabase.rpc('set_primary_exam_target', { p_exam_id: examId });
    } catch (err) {
      console.warn('Could not save exam target:', err);
    } finally {
      setPreparingExamId(null);
      navigate(`/exam/${examId}`, { state: { from: '/learning-center' } });
    }
  }, [navigate, catalog, recordActiveLearning, categoryUrl]);

  const handleRegionModeChange = (mode) => {
    setRegionMode(mode);
    setRegionFilterId('');
    setCategoryFilter('');
    setSelectedBodyId('');
  };

  const handleCategoryFilterChange = (category) => {
    setCategoryFilter(category);
    setSelectedBodyId('');
    if (category) {
      setRightTab('explorer');
    }
  };

  const handleClearFilters = () => {
    setRegionMode('central');
    setRegionFilterId('');
    setCategoryFilter('');
    setSelectedBodyId('');
    setSearchText('');
    setBodySearch('');
    setRightTab('recommended');
  };

  // Lock body scrolling when mobile drawer is open
  useEffect(() => {
    if (mobileDrawerOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileDrawerOpen]);

  // Escape key closes mobile filter drawer
  useEffect(() => {
    if (!mobileDrawerOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setMobileDrawerOpen(false);
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [mobileDrawerOpen]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setCatalogLoading(true);
      try {
        // Supabase caps unpaginated selects at 1000 rows. Paginate to fetch all ~1,530 exams.
        let allExams = [];
        for (let from = 0; ; from += 1000) {
          const { data, error: catErr } = await supabase
            .from('lc_exams')
            .select('id,name,category,accent_color,thumbnail_subject,conducting_body_id,conducting_body:lc_conducting_bodies(id,name),region:lc_regions(id,name,level)')
            .range(from, from + 999);
          if (catErr) throw catErr;
          allExams = allExams.concat(data || []);
          if (!data || data.length < 1000) break;
        }

        if (!cancelled) {
          setCatalog(allExams);
          setCatalogLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          console.error('Failed to load exam catalog:', err);
          setCatalogError('Unable to load the exam catalog.');
          setCatalogLoading(false);
        }
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Dynamic state/UT regions list derived from catalog
  const stateList = useMemo(() => {
    if (regionMode !== 'state' && regionMode !== 'ut') return [];
    const map = new Map();
    for (const exam of catalog) {
      if (exam.region && exam.region.level === regionMode) {
        if (!map.has(exam.region.id)) {
          map.set(exam.region.id, {
            id: exam.region.id,
            name: exam.region.name,
            count: 0,
            categories: new Set(),
            image: STATE_IMAGES[exam.region.name] || null,
          });
        }
        const item = map.get(exam.region.id);
        item.count += 1;
        if (exam.category) item.categories.add(exam.category.trim());
      }
    }
    return [...map.values()]
      .map((item) => ({
        ...item,
        categories: [...item.categories].sort((a, b) => a.localeCompare(b)),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [catalog, regionMode]);

  const filteredStateList = useMemo(() => {
    let list = stateList;
    if (selectedZone !== 'all') {
      list = list.filter((s) => {
        const meta = getStateMeta(s.name);
        return meta.zone === selectedZone;
      });
    }
    const q = stateSearchText.trim().toLowerCase();
    if (!q) return list;
    return list.filter((s) => s.name.toLowerCase().includes(q));
  }, [stateList, stateSearchText, selectedZone]);

  const activeState = useMemo(() => {
    if (!regionFilterId) return null;
    return stateList.find((s) => s.id === regionFilterId) || null;
  }, [stateList, regionFilterId]);

  const handleSelectState = (stateItem) => {
    setRegionFilterId(stateItem.id);
    setCategoryFilter('');
    setStateSearchText('');
  };

  const handleBackToStates = () => {
    setRegionFilterId('');
    setCategoryFilter('');
  };

  // Exams satisfying the level gate (Central / State / UT)
  const levelExams = useMemo(() => catalog.filter((exam) => {
    if (!exam.region) return false;
    if (regionMode === 'central') return exam.region.level === 'central';
    if (!regionFilterId) return exam.region.level === regionMode;
    return exam.region.id === regionFilterId;
  }), [catalog, regionMode, regionFilterId]);

  const categoryOptions = useMemo(() => {
    const seen = new Set();
    for (const exam of levelExams) {
      const c = (exam.category || '').trim();
      if (c) seen.add(c);
    }
    return [...seen].sort((a, b) => a.localeCompare(b));
  }, [levelExams]);

  const categoryCounts = useMemo(() => {
    const counts = {};
    for (const exam of levelExams) {
      const c = (exam.category || '').trim();
      if (c) counts[c] = (counts[c] || 0) + 1;
    }
    return counts;
  }, [levelExams]);

  const activeCategoryForExplorer = useMemo(() => {
    if (categoryFilter && categoryOptions.includes(categoryFilter)) return categoryFilter;
    if (regionMode === 'central') {
      return categoryOptions.includes('SSC') ? 'SSC' : categoryOptions[0] || '';
    }
    return categoryOptions[0] || '';
  }, [categoryFilter, categoryOptions, regionMode]);

  const explorerCategoryList = useMemo(() => {
    return categoryOptions.map((cat) => {
      const meta = getCategoryIconMeta(cat);
      return {
        key: cat,
        label: cat,
        count: categoryCounts[cat] || 0,
        ...meta,
      };
    });
  }, [categoryOptions, categoryCounts]);

  const bodyOptions = useMemo(() => {
    const pool = categoryFilter
      ? levelExams.filter((exam) => (exam.category || '').trim() === categoryFilter)
      : levelExams;
    const seen = new Map();
    for (const exam of pool) {
      if (exam.conducting_body && !seen.has(exam.conducting_body.id)) seen.set(exam.conducting_body.id, exam.conducting_body);
    }
    return [...seen.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [levelExams, categoryFilter]);

  const filteredBodyOptions = useMemo(() => {
    const q = bodySearch.trim().toLowerCase();
    if (!q) return bodyOptions;
    return bodyOptions.filter((b) => b.name.toLowerCase().includes(q));
  }, [bodyOptions, bodySearch]);

  // The single result list driving "Search Results"
  const searchResults = useMemo(() => {
    let pool = categoryFilter
      ? levelExams.filter((exam) => (exam.category || '').trim() === categoryFilter)
      : levelExams;
    if (selectedBodyId) pool = pool.filter((exam) => exam.conducting_body_id === selectedBodyId);
    const q = searchText.trim().toLowerCase();
    if (q) {
      pool = pool.filter((exam) =>
        exam.name.toLowerCase().includes(q) ||
        (exam.conducting_body?.name || '').toLowerCase().includes(q) ||
        (exam.category || '').toLowerCase().includes(q)
      );
    }
    return pool.slice().sort((a, b) => a.name.localeCompare(b.name));
  }, [levelExams, categoryFilter, selectedBodyId, searchText]);

  const filtersActive =
    regionMode !== 'central' ||
    Boolean(searchText.trim()) ||
    Boolean(regionFilterId) ||
    Boolean(categoryFilter) ||
    Boolean(selectedBodyId);

  // Count of active Filter Results sidebar controls specifically (not the
  // hero search box), shown on the mobile "Filters" toggle so it's clear
  // something is applied before the sidebar is even opened.
  const activeFilterCount = [
    regionMode !== 'central',
    Boolean(regionFilterId),
    Boolean(categoryFilter),
    Boolean(selectedBodyId),
  ].filter(Boolean).length;

  // "Recommended for you" shows the curated marketing cards by default, but
  // the moment the person actually searches or narrows things down by
  // Category / Conducting Body, it should reflect *their* results instead of
  // always showing the same five cards — so it switches to real catalog
  // matches and doubles as the page's search results, rather than showing a
  // separate "Search Results" section underneath.
  const recommendedFiltersActive = Boolean(categoryFilter) || Boolean(selectedBodyId) || Boolean(searchText.trim());

  const examToRecommendedCard = useCallback((exam) => {
    const subject = getSubjectByKey(exam.thumbnail_subject);
    const familyHex = getFamilyHex(subject.family);
    const resourcesCount = examProgress[exam.name]?.total ?? null;
    return {
      id: exam.id,
      examId: exam.id,
      title: exam.name,
      conductingBody: exam.conducting_body?.name || (exam.region?.level ? `${exam.region.level.toUpperCase()} Exam` : 'Central Exam'),
      badge: exam.category || subject.label,
      badgeBg: `${familyHex}22`,
      badgeColor: familyHex,
      resourcesCount,
      type: CONTENT_COVERAGE_LABEL,
      category: exam.category,
    };
  }, [examProgress]);

  // The curated "Recommended for you" / "Popular Exams" cards are written by
  // hand (title, badge, image) but don't carry a real resource count — this
  // finds the real catalog exam each one is standing in for (same fuzzy
  // match used when the card is actually clicked) so the real published
  // resource total can be shown instead of a made-up number.
  // Single source of truth for every "curated card -> real catalog exam"
  // lookup on this page (recommended/popular card previews, Resume/Continue
  // Learning, and the actual navigate-on-click handlers below all call this
  // instead of each rolling their own .find()). A single-word term like
  // 'police' or 'railway' used to substring-match the exam_name and return
  // whichever exam happened to sit first in the fetched catalog order --
  // e.g. clicking the "Delhi Police" card could silently open a different
  // state's Police exam because that one's name happened to come first.
  // Splitting into words and requiring every word to appear (in any order)
  // means a term like 'delhi police' only matches exams whose name actually
  // contains both "delhi" and "police" -- still not a database-level fix,
  // but it stops a generic single word from resolving to an unrelated exam.
  const findCatalogMatch = useCallback((term) => {
    if (!term || catalog.length === 0) return null;
    const words = term.toLowerCase().split(/\s+/).filter(Boolean);
    if (words.length === 0) return null;
    return catalog.find((e) => {
      const name = e.name.toLowerCase();
      return words.every((w) => name.includes(w));
    }) || null;
  }, [catalog]);

  const getCourseImage = useCallback((course) => {
    const match = (course.examId && catalog.find((e) => e.id === course.examId))
      || (course.title && catalog.find((e) => e.name.toLowerCase() === course.title.toLowerCase()))
      || findCatalogMatch(course.searchTerm || course.title);

    if (match?.category) {
      const url = categoryUrl(match.category);
      if (url) return url;
    }
    if (course.category) {
      const url = categoryUrl(course.category);
      if (url) return url;
    }
    if (course.image && course.image !== '/homepage/F5A.png') {
      return course.image;
    }
    return '/homepage/F5A.png';
  }, [catalog, findCatalogMatch, categoryUrl]);

  const recToRecommendedCard = useCallback((rec, index) => {
    let match = null;
    if (rec.exam_id) {
      match = catalog.find((e) => e.id === rec.exam_id);
    }
    if (!match && rec.exam_name) {
      const nameLower = rec.exam_name.trim().toLowerCase();
      match = catalog.find((e) => e.name.trim().toLowerCase() === nameLower);
    }
    if (!match && rec.exam_name) {
      match = findCatalogMatch(rec.exam_name);
    }

    const subject = match?.thumbnail_subject ? getSubjectByKey(match.thumbnail_subject) : null;
    const familyHex = subject ? getFamilyHex(subject.family) : '#466931';
    const examName = match?.name || rec.exam_name;
    const resourcesCount = examName ? (examProgress[examName]?.total ?? null) : null;

    const scorePercent = rec.score ? Math.min(Math.round(rec.score), 100) : null;
    const badgeLabel = scorePercent
      ? `${scorePercent}% Match`
      : (match?.category || rec.career_track || 'Recommended');

    return {
      id: match?.id || rec.exam_id || `rec-${index}`,
      examId: match?.id || rec.exam_id,
      title: examName,
      conductingBody:
        match?.conducting_body?.name ||
        rec.conducting_body ||
        (match?.region?.level ? `${match.region.level.toUpperCase()} Exam` : 'Central Exam'),
      badge: badgeLabel,
      badgeBg: scorePercent ? '#dcfce7' : `${familyHex}22`,
      badgeColor: scorePercent ? '#166534' : familyHex,
      resourcesCount,
      type: CONTENT_COVERAGE_LABEL,
      category: match?.category,
      searchTerm: examName,
      score: rec.score,
    };
  }, [catalog, findCatalogMatch, examProgress]);

  const recommendedCards = useMemo(() => {
    // Driven by a real search/filter -- show every match, not just a
    // 5-card teaser, since this is now also acting as the page's search
    // results (see the section render below).
    if (recommendedFiltersActive) {
      return searchResults.map(examToRecommendedCard);
    }

    // 1. Personalised: Show top 5 exams based on candidate's joining/profiling
    if (examMatches && examMatches.length > 0) {
      const topRecs = examMatches.slice(0, 5).map((rec, i) => recToRecommendedCard(rec, i));
      if (topRecs.length < 5 && catalog.length > 0) {
        const existingIds = new Set(topRecs.map((r) => r.id));
        for (const exam of catalog) {
          if (!existingIds.has(exam.id)) {
            topRecs.push(examToRecommendedCard(exam));
            existingIds.add(exam.id);
            if (topRecs.length >= 5) break;
          }
        }
      }
      return topRecs;
    }

    // 2. Secondary: If raw profile data exists with preferences/domicile
    if (profile?.raw_profile_data && catalog.length > 0) {
      const prefs = (profile.raw_profile_data.careerPreferences || []).map((p) => p.toLowerCase());
      const state = (profile.raw_profile_data.stateOfDomicile || '').toLowerCase();
      const matchedFromPrefs = catalog.filter((e) => {
        const cat = (e.category || '').toLowerCase();
        const name = (e.name || '').toLowerCase();
        const reg = (e.region?.name || '').toLowerCase();
        const matchesPref = prefs.some((p) => cat.includes(p) || name.includes(p));
        const matchesState = state && reg.includes(state);
        return matchesPref || matchesState;
      });
      if (matchedFromPrefs.length > 0) {
        const prefCards = matchedFromPrefs.slice(0, 5).map(examToRecommendedCard);
        if (prefCards.length < 5) {
          const existingIds = new Set(prefCards.map((r) => r.id));
          for (const card of RECOMMENDED_EXAMS) {
            const match = findCatalogMatch(card.searchTerm);
            if (match && !existingIds.has(match.id)) {
              prefCards.push(examToRecommendedCard(match));
              existingIds.add(match.id);
              if (prefCards.length >= 5) break;
            }
          }
        }
        return prefCards.slice(0, 5);
      }
    }

    // 3. Fallback: 5 curated exams for guests or un-profiled candidates
    return RECOMMENDED_EXAMS.slice(0, 5).map((card) => {
      const match = findCatalogMatch(card.searchTerm);
      const resourcesCount = match ? (examProgress[match.name]?.total ?? null) : null;
      return { ...card, type: CONTENT_COVERAGE_LABEL, resourcesCount };
    });
  }, [
    recommendedFiltersActive,
    searchResults,
    examMatches,
    profile,
    catalog,
    recToRecommendedCard,
    examToRecommendedCard,
    findCatalogMatch,
    examProgress,
  ]);

  const popularExamCards = useMemo(() => {
    return POPULAR_EXAMS.map((exam) => {
      let match = null;
      if (exam.matchCategory) {
        const inCategory = catalog.filter((e) => e.category === exam.matchCategory);
        // Prefer the exam whose own name reads as the flagship of the
        // category (e.g. "Civil Service examination" over "Indian Economic
        // Service" under category "Civil Services") -- falls back to the
        // first real row in that category either way.
        match = inCategory.find((e) => e.name.toLowerCase().includes(exam.matchNameHint || exam.searchQuery)) || inCategory[0] || null;
      }
      if (!match) match = findCatalogMatch(exam.searchQuery);
      const resourcesCount = match ? (examProgress[match.name]?.total ?? null) : null;
      return {
        ...exam,
        type: CONTENT_COVERAGE_LABEL,
        resourcesCount,
        examId: match?.id || null,
        matchedName: match?.name || null,
        category: match?.category || null,
        conductingBodyName: match?.conducting_body?.name || null,
        regionLevel: match?.region?.level || null,
      };
    });
  }, [catalog, findCatalogMatch, examProgress]);

  const selectedPopularExam = useMemo(
    () => popularExamCards.find((e) => e.id === selectedPopularExamId) || null,
    [popularExamCards, selectedPopularExamId]
  );

  // Other catalog exams sharing the selected exam's real category — the
  // only honest basis for "related exams" this data model supports (no
  // curated relation table exists).
  const relatedPopularExams = useMemo(() => {
    if (!selectedPopularExam?.category || !selectedPopularExam?.examId) return [];
    return catalog
      .filter((e) => e.category === selectedPopularExam.category && e.id !== selectedPopularExam.examId)
      .sort((a, b) => a.name.localeCompare(b.name))
      .slice(0, 5);
  }, [catalog, selectedPopularExam]);

  // Real published-resource counts for the exams behind the curated/recommended
  // cards, fetched once the catalog is loaded and merged into examProgress.
  // Carries each exam's real id alongside its name so the count can use the
  // same mapped-resources-first resolution useExamContent uses (see
  // getExamResourceCount) instead of a plain resources.exam_name exact
  // match, which undercounts (often to 0) because resources.exam_name
  // carries a "N. " ordinal prefix the catalog's exam name never has.
  const staticCardExamRefs = useMemo(() => {
    const refs = new Map(); // exam name -> exam id (best known)
    const addRef = (name, id) => {
      if (!name) return;
      if (id || !refs.has(name)) refs.set(name, id || refs.get(name) || null);
    };
    recommendedCards.forEach((card) => {
      addRef(card.title, card.examId);
      if (card.searchTerm) {
        const match = findCatalogMatch(card.searchTerm);
        if (match) addRef(match.name, match.id);
      }
    });
    popularExamCards.forEach((card) => {
      addRef(card.matchedName, card.examId);
    });
    [...RECOMMENDED_EXAMS, ...POPULAR_EXAMS].forEach((card) => {
      const match = findCatalogMatch(card.searchTerm || card.searchQuery);
      if (match) addRef(match.name, match.id);
    });
    return Array.from(refs.entries()).map(([name, id]) => ({ name, id }));
  }, [recommendedCards, popularExamCards, findCatalogMatch]);

  const fetchResourceTotals = async (examRefs) => {
    const targets = examRefs.filter((r) => r.name);
    if (!targets.length) return;
    try {
      const results = await Promise.all(
        targets.map(async ({ name, id }) => ({ name, total: await getExamResourceCount(id, name) }))
      );
      setExamProgress((prev) => {
        const next = { ...prev };
        results.forEach(({ name, total }) => {
          next[name] = {
            total,
            explored: prev[name]?.explored || 0,
          };
        });
        return next;
      });
    } catch (err) {
      console.warn('Could not load resource counts for featured exams:', err);
    }
  };

  useEffect(() => {
    const missing = staticCardExamRefs.filter((ref) => !(ref.name in examProgress));
    if (missing.length === 0) return;
    fetchResourceTotals(missing);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [staticCardExamRefs]);

  const matchByExamId = useMemo(() => {
    const m = new Map();
    for (const match of examMatches) if (match.exam_id) m.set(match.exam_id, match);
    return m;
  }, [examMatches]);

  const myExams = useMemo(
    () => examMatches.filter((m) => (examProgress[m.exam_name]?.explored || 0) > 0),
    [examMatches, examProgress]
  );

  // Real, resource-open-backed progress. `extraExamNames` lets callers pull
  // in exams the person has actually started (Continue Learning) even when
  // they aren't one of the top profile matches, so "resume" always reflects
  // documents they've genuinely opened rather than a made-up number.
  const loadPersonalization = async (userId, matches, extraExamRefs = []) => {
    let openedIds = [];
    try {
      const { data: reads } = await supabase
        .from('user_resource_reads')
        .select('resource_id')
        .eq('user_id', userId)
        .in('status', ['in_progress', 'completed']);

      if (reads && reads.length > 0) {
        openedIds = reads.map((r) => r.resource_id).filter(Boolean);
      } else {
        const { data: opens, error: opensErr } = await supabase
          .from('point_transactions')
          .select('ref_id, created_at')
          .eq('user_id', userId)
          .eq('action_code', 'RESOURCE_OPENED')
          .order('created_at', { ascending: false })
          .limit(50);

        if (!opensErr && opens) {
          openedIds = opens.map((o) => o.ref_id).filter(Boolean);
        }
      }
    } catch (err) {
      console.warn('Could not load learning personalization signals:', err);
    }

    // Carries each exam's real id (when known) alongside its name so the
    // count below can use getExamResourceCount's mapped-resources-first
    // resolution instead of a plain exact-name match against
    // resources.exam_name (see staticCardExamRefs above for why that
    // undercounts).
    const refsByName = new Map();
    matches.slice(0, 5).forEach((m) => {
      if (m.exam_name) refsByName.set(m.exam_name, m.exam_id || refsByName.get(m.exam_name) || null);
    });
    extraExamRefs.filter((r) => r?.name).forEach((r) => {
      if (r.id || !refsByName.has(r.name)) refsByName.set(r.name, r.id || refsByName.get(r.name) || null);
    });
    const allExamRefs = Array.from(refsByName.entries()).map(([name, id]) => ({ name, id }));

    try {
      const exploredRes = openedIds.length
        ? await supabase.from('resources').select('resource_id, exam_name').in('resource_id', openedIds)
        : { data: [] };

      const exploredByExam = {};
      (exploredRes?.data || []).forEach(r => {
        if (!r.exam_name) return;
        exploredByExam[r.exam_name] = (exploredByExam[r.exam_name] || 0) + 1;
      });

      if (allExamRefs.length) {
        const counts = await Promise.all(
          allExamRefs.map(({ id, name }) => getExamResourceCount(id, name))
        );
        const progress = {};
        allExamRefs.forEach(({ name }, i) => {
          progress[name] = {
            total: counts[i] ?? null,
            explored: exploredByExam[name] || 0,
          };
        });
        // Merge rather than overwrite — this can be called again as new
        // "Continue Learning" courses show up, and earlier results (e.g.
        // for profile-matched exams) should stick around.
        setExamProgress((prev) => ({ ...prev, ...progress }));
      }
    } catch (err) {
      console.warn('Could not load learning personalization resources:', err);
    }
  };

  useEffect(() => {
    const fetchInitialData = async () => {
      setInitialLoading(true);
      setError(null);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setAuthUserId(session.user.id);
          const { data: profileRow } = await supabase
            .from('user_profiles')
            .select('recommendations, raw_profile_data, subscription_tier, subscription_expires_at, free_quiz_used')
            .eq('id', session.user.id)
            .maybeSingle();
          if (profileRow) {
            setProfile(profileRow);
            const matches = Array.isArray(profileRow.recommendations) ? profileRow.recommendations : [];
            setExamMatches(matches);
            if (profileRow.raw_profile_data) {
              setTransferableSkills(getTransferableSkills(profileRow.raw_profile_data));
            }
            // Also pull real progress for anything already sitting in Continue
            // Learning from a previous session (persisted in localStorage).
            loadPersonalization(session.user.id, matches, activeLearningCourses.map((c) => ({ name: c.title, id: c.examId || null })));
          }

          // Load the candidate's exam targets (primary + all saved)
          try {
            const { data: targets } = await supabase
              .from('user_exam_targets')
              .select('exam_id, is_primary, status, exam:lc_exams(id, name, category, conducting_body:lc_conducting_bodies(name))')
              .eq('user_id', session.user.id)
              .eq('status', 'active');
            if (targets?.length) {
              setAllTargetIds(new Set(targets.map((t) => t.exam_id)));
              const primary = targets.find((t) => t.is_primary);
              if (primary?.exam) {
                setPrimaryTarget({
                  exam_id: primary.exam_id,
                  exam_name: primary.exam.name,
                  conducting_body: primary.exam.conducting_body?.name || '',
                });
              }

              // Also sync targets into activeLearningCourses
              setActiveLearningCourses((currentList) => {
                const existingIds = new Set(currentList.map((c) => c.examId || c.id));
                const newItems = targets
                  .filter((t) => t.exam && !existingIds.has(t.exam_id))
                  .map((t) => ({
                    id: t.exam_id,
                    examId: t.exam_id,
                    title: t.exam.name,
                    category: t.exam.category || t.exam.conducting_body?.name || 'Central Exam',
                    image: categoryUrl(t.exam.category) || '',
                    progress: 0,
                    lastAccessedAt: Date.now(),
                    searchTerm: t.exam.name,
                  }));
                if (newItems.length > 0) {
                  const combined = [...currentList, ...newItems];
                  try {
                    localStorage.setItem(ACTIVE_LEARNING_STORAGE_KEY, JSON.stringify(combined));
                  } catch (err) {
                    console.warn(err);
                  }
                  return combined;
                }
                return currentList;
              });
            }
          } catch (e) {
            // user_exam_targets may not exist yet; gracefully ignore
            console.warn('Could not load exam targets (migration may be pending):', e);
          }
        }
      } catch (err) {
        console.error('Error in initial load:', err);
        setError('Unable to connect to the learning database. Please check your connection and try again.');
      } finally {
        setInitialLoading(false);
      }
    };
    fetchInitialData();
  }, []);

  // Whenever a new course lands in "Continue Learning" — pressing Start
  // Learning on a card, or a saved exam target syncing in — fetch its real
  // progress (resources opened vs. published) so it can show an honest
  // percentage instead of a placeholder. Runs once per exam name; results
  // are merged into examProgress, never re-fetched once known.
  useEffect(() => {
    if (!authUserId) return;
    const missingRefs = activeLearningCourses
      .map((c) => ({ name: c.title, id: c.examId || null }))
      .filter((ref) => ref.name && !(ref.name in examProgress));
    if (missingRefs.length === 0) return;
    loadPersonalization(authUserId, examMatches, missingRefs);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeLearningCourses, authUserId]);

  const topExam = myExams[0] || examMatches[0] || null;
  const topExamId = topExam?.exam_id || searchResults[0]?.id || null;
  const topExamName = topExam?.exam_name || searchResults[0]?.name || null;
  const topExamCareerTrack = topExam?.career_track;

  // Shared by "Recommended for you" and "Search Results" so both sections
  // render the identical card, instead of two copies of this JSX drifting
  // apart over time.
  const renderExamCard = (card) => (
    <div key={card.id} className="lc-exam-card">
      <div
        className="lc-card-thumb-wrap"
        style={{ cursor: 'pointer' }}
        onClick={() => handleStartCardExam(card)}
      >
        <img
          src={cardImage(card)}
          alt={card.title}
          className="lc-card-thumb-img"
          loading="lazy"
          onError={(e) => {
            e.target.style.display = 'none';
            e.target.parentElement.classList.add('lc-thumb-fallback');
          }}
        />
        <div
          className="lc-card-badge"
          style={{ backgroundColor: card.badgeBg, color: card.badgeColor }}
        >
          {card.badge}
        </div>
      </div>

      <div className="lc-card-body">
        <h3
          className="lc-card-title"
          title={card.title}
          style={{ cursor: 'pointer' }}
          onClick={() => handleStartCardExam(card)}
        >
          {card.title}
        </h3>
        <p className="lc-card-conductor">{card.conductingBody}</p>

        <div className="lc-card-meta-row">
          {card.resourcesCount != null && (
            <span className="lc-card-meta-item">
              <FileText size={13} /> {card.resourcesCount} resources
            </span>
          )}
          <span className="lc-card-meta-item">
            <Layers size={13} /> {card.type}
          </span>
        </div>

        <button
          type="button"
          className="lc-card-start-btn"
          onClick={() => handleStartCardExam(card)}
        >
          Start Learning
        </button>
      </div>
    </div>
  );

  return (
    <div className="learning-wrapper">
      <div className={`learning-layout-full ${rightTab === 'explorer' ? 'learning-layout-explorer' : ''}`}>
        <main className="main-content">
          {/* Hero: Your Learning Center (Only shown in Recommended mode so Explorer mode is flush at top) */}
          {rightTab === 'recommended' && (
            <section className="lc-hero-banner" aria-label="Learning Center Hero">
              <div className="lc-hero-bg-layer" />
              <div className="lc-hero-overlay" />
              <div className="lc-hero-watermark">
                <span className="lc-script-line1">New Skills</span>
                <span className="lc-script-line2">New Horizons</span>
              </div>

              <div className="lc-hero-content">
                <h1 className="lc-hero-title">Your Learning Center</h1>
                <p className="lc-hero-tagline">Prepare. Learn. Grow. Serve Beyond.</p>
                <p className="lc-hero-description">
                  Find exams, study material and skills training tailored to your profile.
                </p>

                <form
                  className="lc-hero-search-bar"
                  onSubmit={(e) => {
                    e.preventDefault();
                    document.getElementById('lc-search-results-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }}
                  role="search"
                >
                  <div className="lc-hero-search-input-wrap">
                    <Search size={16} className="lc-hero-search-icon" aria-hidden="true" />
                    <input
                      type="text"
                      className="lc-hero-search-input"
                      placeholder="Search exams, subjects, skills..."
                      value={searchText}
                      onChange={(e) => setSearchText(e.target.value)}
                      aria-label="Search exams, subjects, conducting bodies or skills"
                    />
                  </div>
                  <button type="submit" className="lc-hero-search-btn">
                    Search
                  </button>
                </form>

                <div className="lc-hero-chips" role="tablist" aria-label="Exam Region Level">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={regionMode === 'central'}
                    onClick={() => handleRegionModeChange('central')}
                    className={`lc-hero-chip ${regionMode === 'central' ? 'active' : ''}`}
                  >
                    Central Exams
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={regionMode === 'state'}
                    onClick={() => handleRegionModeChange('state')}
                    className={`lc-hero-chip ${regionMode === 'state' ? 'active' : ''}`}
                  >
                    State Exams
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={regionMode === 'ut'}
                    onClick={() => handleRegionModeChange('ut')}
                    className={`lc-hero-chip ${regionMode === 'ut' ? 'active' : ''}`}
                  >
                    UT Exams
                  </button>
                </div>
              </div>
            </section>
          )}

          {/* ── Mobile Filters Trigger Section (Mobile <1100px only in recommended mode) ── */}
          {rightTab === 'recommended' && (
            <div className="lc-mobile-filter-bar" aria-label="Mobile Filters">
              <button
                type="button"
                className={`lc-mobile-filter-trigger-btn ${filtersActive ? 'active' : ''}`}
                onClick={() => setMobileDrawerOpen(true)}
                aria-label="Open Filter Results"
              >
                <SlidersHorizontal size={15} />
                <span>Filters</span>
                {activeFilterCount > 0 && (
                  <span className="lc-mobile-filter-badge">{activeFilterCount}</span>
                )}
              </button>

              <div className="lc-mobile-active-chips-scroll">
                {categoryFilter && (
                  <span className="lc-mobile-active-chip">
                    <span>{categoryFilter}</span>
                    <button
                      type="button"
                      onClick={() => setCategoryFilter('')}
                      aria-label={`Remove ${categoryFilter} filter`}
                    >
                      <X size={12} />
                    </button>
                  </span>
                )}
                {selectedBodyId && (
                  <span className="lc-mobile-active-chip">
                    <span>{bodyOptions.find((b) => b.id === selectedBodyId)?.name || 'Conducting Body'}</span>
                    <button
                      type="button"
                      onClick={() => setSelectedBodyId('')}
                      aria-label="Remove conducting body filter"
                    >
                      <X size={12} />
                    </button>
                  </span>
                )}
                {filtersActive && (
                  <button
                    type="button"
                    className="lc-mobile-clear-btn"
                    onClick={handleClearFilters}
                  >
                    Clear all
                  </button>
                )}
              </div>
            </div>
          )}

          <div className={`lc-main-grid ${isSidebarCollapsed ? 'sidebar-collapsed' : ''} ${rightTab === 'explorer' ? 'lc-main-grid-explorer' : ''}`}>
            {/* Left Column: Sidebar — Explorer Nav in explorer mode, Filter Sidebar in recommended mode */}
            <aside
              className={`lc-filter-sidebar ${rightTab === 'explorer' ? 'lc-explorer-sidebar' : ''} ${isSidebarCollapsed ? 'lc-explorer-sidebar-collapsed' : ''}`}
              aria-label={rightTab === 'explorer' ? 'Exam Categories' : 'Filter Results'}
            >
              {rightTab === 'explorer' ? (
                /* ── Explorer Mode: Clean Category Nav List with Collapse Option & SVG Icons ── */
                <>
                  {/* Case A: State/UT mode AND no state selected yet: show list of States */}
                  {(regionMode === 'state' || regionMode === 'ut') && !regionFilterId ? (
                    <>
                      <div className="lc-explorer-sidebar-header">
                        <button
                          type="button"
                          className="lc-explorer-collapse-toggle"
                          onClick={() => setIsSidebarCollapsed((prev) => !prev)}
                          aria-label={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                          title={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                        >
                          {isSidebarCollapsed ? <ChevronRight size={17} /> : <ChevronLeft size={17} />}
                        </button>
                        {!isSidebarCollapsed && (
                          <div className="lc-explorer-title-box">
                            <span className="lc-explorer-sidebar-title">
                              {regionMode === 'ut' ? 'UT Exams' : 'State Exams'}
                            </span>
                            <span className="lc-explorer-sidebar-count">({stateList.length})</span>
                          </div>
                        )}
                      </div>

                      {!isSidebarCollapsed && (
                        <div className="lc-explorer-search-bar">
                          <Search size={14} className="lc-explorer-search-icon" />
                          <input
                            type="text"
                            placeholder={`Filter ${regionMode === 'ut' ? 'UT' : 'state'}...`}
                            value={stateSearchText}
                            onChange={(e) => setStateSearchText(e.target.value)}
                            className="lc-explorer-search-input"
                          />
                          {stateSearchText && (
                            <button
                              type="button"
                              onClick={() => setStateSearchText('')}
                              className="lc-explorer-search-clear"
                            >
                              <X size={12} />
                            </button>
                          )}
                        </div>
                      )}

                      <nav className="lc-explorer-nav" aria-label="States list">
                        {filteredStateList.map((st) => {
                          const stMeta = getStateMeta(st.name);
                          return (
                            <button
                              key={st.id}
                              type="button"
                              className="lc-explorer-nav-item"
                              onClick={() => handleSelectState(st)}
                              title={`${st.name} (${st.count} Exams)`}
                            >
                              <span
                                className="lc-explorer-nav-icon-wrap lc-explorer-nav-state-code"
                                style={{ backgroundColor: stMeta.bg, color: stMeta.color }}
                              >
                                {stMeta.code}
                              </span>
                              {!isSidebarCollapsed && (
                                <>
                                  <span className="lc-explorer-nav-label">{st.name}</span>
                                  <span className="lc-explorer-nav-count">({st.count})</span>
                                  <ChevronRight size={14} className="lc-explorer-nav-chevron" />
                                </>
                              )}
                            </button>
                          );
                        })}
                      </nav>
                    </>
                  ) : (
                    /* Case B: Central mode OR State/UT with a selected state: show Categories list */
                    <>
                      <div className={`lc-explorer-sidebar-header ${(regionMode === 'state' || regionMode === 'ut') && activeState ? 'lc-explorer-state-header' : ''}`}>
                        {(regionMode === 'state' || regionMode === 'ut') && activeState ? (
                          <button
                            type="button"
                            className="lc-explorer-back-btn"
                            onClick={handleBackToStates}
                            title="Back to all states"
                          >
                            <ChevronLeft size={16} />
                            <span>All {regionMode === 'ut' ? 'UTs' : 'States'}</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="lc-explorer-collapse-toggle"
                            onClick={() => setIsSidebarCollapsed((prev) => !prev)}
                            aria-label={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                            title={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                          >
                            {isSidebarCollapsed ? <ChevronRight size={17} /> : <ChevronLeft size={17} />}
                          </button>
                        )}

                        {!isSidebarCollapsed && (
                          (regionMode === 'state' || regionMode === 'ut') && activeState ? (
                            <button
                              type="button"
                              className="lc-explorer-collapse-toggle"
                              onClick={() => setIsSidebarCollapsed((prev) => !prev)}
                              aria-label={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                              title={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                            >
                              {isSidebarCollapsed ? <ChevronRight size={17} /> : <ChevronLeft size={17} />}
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="lc-explorer-title-btn"
                              onClick={() => setIsSidebarCollapsed(true)}
                              title="Collapse sidebar"
                            >
                              <span className="lc-explorer-sidebar-title">All Exams</span>
                            </button>
                          )
                        )}
                      </div>

                      {/* Active State Pill Header inside sidebar if State is chosen */}
                      {!isSidebarCollapsed && (regionMode === 'state' || regionMode === 'ut') && activeState && (
                        <div className="lc-explorer-state-badge">
                          <div className="lc-explorer-state-pill">
                            <MapPin size={13} />
                            <span className="lc-explorer-state-name">{activeState.name}</span>
                          </div>
                          <span className="lc-explorer-state-exams-count">{activeState.count} Exams</span>
                        </div>
                      )}

                      <nav className="lc-explorer-nav" aria-label="Exam categories">
                        {explorerCategoryList.map((item) => {
                          const currentCategory = categoryFilter || activeCategoryForExplorer;
                          const isActive =
                            Boolean(currentCategory) &&
                            currentCategory.toLowerCase() === item.key.toLowerCase();
                          const IconComponent = item.icon || ClipboardList;

                          return (
                            <button
                              key={item.key}
                              type="button"
                              className={`lc-explorer-nav-item ${isActive ? 'lc-explorer-nav-active' : ''}`}
                              onClick={() => {
                                setCategoryFilter(item.key);
                              }}
                              title={item.label}
                              aria-current={isActive ? 'page' : undefined}
                            >
                              <span
                                className="lc-explorer-nav-icon-wrap"
                                style={{
                                  backgroundColor: isActive ? '#fef3c7' : item.bg || '#f1f5f9',
                                  color: isActive ? '#b45309' : item.color || '#475569',
                                }}
                              >
                                <IconComponent size={17} strokeWidth={2.2} />
                              </span>
                              {!isSidebarCollapsed && (
                                <>
                                  <span className="lc-explorer-nav-label">{item.label}</span>
                                  {item.count !== undefined && (
                                    <span className="lc-explorer-nav-count">({item.count})</span>
                                  )}
                                  <ChevronRight size={14} className="lc-explorer-nav-chevron" />
                                </>
                              )}
                            </button>
                          );
                        })}
                      </nav>
                    </>
                  )}
                </>
              ) : (
                /* ── Recommended Mode: Filter Accordions with Category Icons ── */
                <>
                  <div className="lc-filter-sidebar-header">
                    <h3 className="lc-filter-sidebar-title">Filter Results</h3>
                    {filtersActive && (
                      <button
                        type="button"
                        onClick={handleClearFilters}
                        className="lc-filter-clear-btn"
                      >
                        Clear all
                      </button>
                    )}
                  </div>

                  {/* Accordion 1: Category */}
                  <div className="lc-filter-accordion">
                    <button
                      type="button"
                      className="lc-accordion-btn"
                      onClick={() => toggleFilterGroup('category')}
                      aria-expanded={openFilters.category}
                    >
                      <span>Category</span>
                      {openFilters.category ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                    {openFilters.category && (
                      <div className="lc-accordion-content">
                        <label className={`lc-checkbox-item ${!categoryFilter ? 'active-cat-item' : ''}`}>
                          <input
                            type="checkbox"
                            checked={!categoryFilter}
                            onChange={() => {
                              setCategoryFilter('');
                            }}
                          />
                          <span className="lc-checkbox-box" />
                          <span className="lc-checkbox-text">All categories</span>
                          <span className="lc-filter-count">({levelExams.length})</span>
                        </label>
                        {(showAllCategories ? categoryOptions : categoryOptions.slice(0, 10)).map((cat) => {
                          const meta = getCategoryIconMeta(cat);
                          const IconCmp = meta.icon || ClipboardList;
                          return (
                            <label
                              key={cat}
                              className={`lc-checkbox-item ${categoryFilter === cat ? 'active-cat-item' : ''}`}
                            >
                              <input
                                type="checkbox"
                                checked={categoryFilter === cat}
                                onChange={() => {
                                  const next = categoryFilter === cat ? '' : cat;
                                  setCategoryFilter(next);
                                }}
                              />
                              <span className="lc-checkbox-box" />
                              <span
                                className="lc-filter-cat-icon-badge"
                                style={{ color: meta.color, backgroundColor: meta.bg }}
                              >
                                <IconCmp size={13} strokeWidth={2.2} />
                              </span>
                              <span className="lc-checkbox-text">{cat}</span>
                              <span className="lc-filter-count">({categoryCounts[cat] || 0})</span>
                              {categoryFilter === cat && <ChevronRight size={14} className="lc-cat-active-chevron" />}
                            </label>
                          );
                        })}
                        {categoryOptions.length > 10 && (
                          <button
                            type="button"
                            className="lc-show-more-btn"
                            onClick={() => setShowAllCategories(!showAllCategories)}
                          >
                            {showAllCategories ? 'Show less' : `Show more (${categoryOptions.length - 10})`}
                            {showAllCategories ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Accordion 2: Conducting Body */}
                  <div className="lc-filter-accordion">
                    <button
                      type="button"
                      className="lc-accordion-btn"
                      onClick={() => toggleFilterGroup('body')}
                      aria-expanded={openFilters.body}
                    >
                      <span>Conducting Body</span>
                      {openFilters.body ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                    {openFilters.body && (
                      <div className="lc-accordion-content">
                        <div className="lc-filter-search-box">
                          <Search size={14} className="lc-filter-search-icon" />
                          <input
                            type="text"
                            placeholder="Search conducting body..."
                            value={bodySearch}
                            onChange={(e) => setBodySearch(e.target.value)}
                            className="lc-filter-search-input"
                          />
                        </div>
                        <div className="lc-filter-scroll-list">
                          {(showAllBodies ? filteredBodyOptions : filteredBodyOptions.slice(0, 8)).map((body) => (
                            <label key={body.id} className="lc-checkbox-item">
                              <input
                                type="checkbox"
                                checked={selectedBodyId === body.id}
                                onChange={() => setSelectedBodyId(selectedBodyId === body.id ? '' : body.id)}
                              />
                              <span className="lc-checkbox-box" />
                              <span className="lc-checkbox-text">{body.name}</span>
                            </label>
                          ))}
                          {filteredBodyOptions.length === 0 && (
                            <p className="filter-empty-note">No bodies found.</p>
                          )}
                        </div>
                        {filteredBodyOptions.length > 8 && (
                          <button
                            type="button"
                            className="lc-show-more-btn"
                            onClick={() => setShowAllBodies(!showAllBodies)}
                          >
                            {showAllBodies ? 'Show less' : `Show more (${filteredBodyOptions.length - 8})`}
                            {showAllBodies ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </>
              )}
            </aside>

            {/* Right Column: Content Rail */}
            <section className="lc-content-rail">
              {/* ── Top Bar: Mode Tabs + Region Selector Pills ── */}
              <div className="lc-explorer-top-bar">
                <div className="lc-top-tabs-bar" role="tablist" aria-label="Learning View Mode">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={rightTab === 'explorer'}
                    className={`lc-top-tab-btn ${rightTab === 'explorer' ? 'active' : ''}`}
                    onClick={() => setRightTab('explorer')}
                  >
                    <Compass size={16} className="lc-top-tab-icon" />
                    <span>Explorer Mode</span>
                    <span className="lc-top-tab-pill">
                      {categoryFilter || activeCategoryForExplorer}
                    </span>
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={rightTab === 'recommended'}
                    className={`lc-top-tab-btn ${rightTab === 'recommended' ? 'active' : ''}`}
                    onClick={() => setRightTab('recommended')}
                  >
                    <Sparkles size={16} className="lc-top-tab-icon" />
                    <span>Recommended Exams</span>
                  </button>
                </div>

                {rightTab === 'explorer' && (
                  <div className="lc-explorer-region-chips" role="tablist" aria-label="Exam Region Level">
                    <button
                      type="button"
                      role="tab"
                      aria-selected={regionMode === 'central'}
                      onClick={() => handleRegionModeChange('central')}
                      className={`lc-region-chip ${regionMode === 'central' ? 'active' : ''}`}
                    >
                      Central Exams
                    </button>
                    <button
                      type="button"
                      role="tab"
                      aria-selected={regionMode === 'state'}
                      onClick={() => handleRegionModeChange('state')}
                      className={`lc-region-chip ${regionMode === 'state' ? 'active' : ''}`}
                    >
                      State Exams
                    </button>
                    <button
                      type="button"
                      role="tab"
                      aria-selected={regionMode === 'ut'}
                      onClick={() => handleRegionModeChange('ut')}
                      className={`lc-region-chip ${regionMode === 'ut' ? 'active' : ''}`}
                    >
                      UT Exams
                    </button>
                  </div>
                )}
              </div>

              {/* View 1: Explorer Mode (Rich Portal matching Design Reference) */}
              {rightTab === 'explorer' ? (
                (regionMode === 'state' || regionMode === 'ut') && !regionFilterId ? (
                  /* State/UT Directory Landing Grid when user is on State mode and hasn't picked a state yet */
                  <div className="lc-state-directory-container">
                    <div className="lc-state-directory-hero">
                      <div className="lc-state-hero-overlay" />
                      <div className="lc-state-hero-content">
                        <div className="lc-state-hero-badge">
                          <MapPin size={14} />
                          <span>{regionMode === 'ut' ? 'Union Territory Examinations' : 'State Level Examinations'} · {stateList.length} {regionMode === 'ut' ? 'UTs' : 'States'} & 521+ Exams</span>
                        </div>
                        <h1 className="lc-state-directory-title">
                          Select a {regionMode === 'ut' ? 'Union Territory' : 'State'} to Explore Examinations
                        </h1>
                        <p className="lc-state-directory-subtitle">
                          Official state recruitment portals, localized syllabus breakdowns, previous year papers, and curated study materials across {stateList.length} {regionMode === 'ut' ? 'union territories' : 'states'}.
                        </p>

                        <div className="lc-state-search-box">
                          <Search size={18} className="lc-state-search-icon" />
                          <input
                            type="text"
                            className="lc-state-search-input"
                            placeholder={`Search ${regionMode === 'ut' ? 'union territory' : 'state'} (e.g. Rajasthan, UP, Bihar, Maharashtra)...`}
                            value={stateSearchText}
                            onChange={(e) => setStateSearchText(e.target.value)}
                          />
                          {stateSearchText && (
                            <button
                              type="button"
                              className="lc-state-search-clear"
                              onClick={() => setStateSearchText('')}
                            >
                              <X size={16} />
                            </button>
                          )}
                        </div>

                        {/* Zone Filter Chips */}
                        <div className="lc-state-zone-chips">
                          {STATE_ZONES.map((zone) => (
                            <button
                              key={zone.id}
                              type="button"
                              className={`lc-state-zone-chip ${selectedZone === zone.id ? 'active' : ''}`}
                              onClick={() => setSelectedZone(zone.id)}
                            >
                              {zone.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="lc-state-directory-grid">
                      {filteredStateList.map((st) => {
                        const stMeta = getStateMeta(st.name);
                        return (
                          <button
                            key={st.id}
                            type="button"
                            className="lc-state-card"
                            onClick={() => handleSelectState(st)}
                          >
                            <div className="lc-state-card-image-wrap">
                              {st.image ? (
                                <img
                                  src={st.image}
                                  alt={st.name}
                                  className="lc-state-card-img"
                                  loading="lazy"
                                />
                              ) : (
                                <div
                                  className="lc-state-card-placeholder-banner"
                                  style={{
                                    background: `linear-gradient(135deg, ${stMeta.bg} 0%, ${stMeta.color}33 50%, ${stMeta.bg} 100%)`,
                                  }}
                                >
                                  <span
                                    className="lc-state-watermark-text"
                                    style={{ color: `${stMeta.color}25` }}
                                  >
                                    {stMeta.code}
                                  </span>
                                </div>
                              )}
                              {/* 20% smooth gradient fade into the card */}
                              <div className="lc-state-card-image-fade" />

                              {/* Floating badges on top of image */}
                              <div className="lc-state-card-floating-bar">
                                <span
                                  className="lc-state-code-badge"
                                  style={{
                                    color: stMeta.color,
                                  }}
                                >
                                  {stMeta.code}
                                </span>
                                <span className="lc-state-card-count-badge">
                                  {st.count} Exams
                                </span>
                              </div>
                            </div>

                            <div className="lc-state-card-body">
                              <div className="lc-state-card-header-row">
                                <h3 className="lc-state-card-name">{st.name}</h3>
                                <span className="lc-state-card-meta-line">{stMeta.body}</span>
                              </div>

                              <div className="lc-state-card-categories">
                                {st.categories.slice(0, 3).map((cat) => {
                                  const catMeta = getCategoryIconMeta(cat);
                                  const CatIcon = catMeta.icon || ClipboardList;
                                  return (
                                    <span key={cat} className="lc-state-cat-pill">
                                      <CatIcon size={11} style={{ color: catMeta.color }} />
                                      <span>{cat}</span>
                                    </span>
                                  );
                                })}
                                {st.categories.length > 3 && (
                                  <span className="lc-state-cat-more">+{st.categories.length - 3} more</span>
                                )}
                              </div>

                              <div className="lc-state-card-footer">
                                <span className="lc-state-card-cta">Explore State Categories</span>
                                <ArrowRight size={14} className="lc-state-card-arrow" />
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <CategoryExplorerPortal
                    categoryName={categoryFilter || activeCategoryForExplorer}
                    stateName={activeState?.name || ''}
                    division={regionMode}
                    levelExams={levelExams}
                    allCatalog={catalog}
                    isSidebarCollapsed={isSidebarCollapsed}
                    onSetSidebarCollapsed={setIsSidebarCollapsed}
                    onSelectExam={(exam) => {
                      const id = exam.examId || exam.id;
                      if (id) {
                        navigate(`/exam/${id}`, { state: { from: '/learning-center' } });
                      } else {
                        setSearchText(exam.title || exam.name || '');
                        setRightTab('recommended');
                      }
                    }}
                    onExploreContent={(contentType, profileData) => {
                      if (contentType === 'pyqs') {
                        navigate('/pyq-center');
                      } else if (contentType === 'mocks') {
                        navigate('/quiz-center');
                      } else {
                        const firstId = profileData?.top_exams?.[0]?.examId;
                        if (firstId) {
                          navigate(`/exam/${firstId}`, { state: { from: '/learning-center' } });
                        } else {
                          setSearchText(profileData?.category_name || '');
                          setRightTab('recommended');
                        }
                      }
                    }}
                  />
                )
              ) : (
                /* View 2: Recommended For You Section */
                <div className="lc-section-box" id="lc-search-results-section">
                <div className="lc-section-header">
                  <div className="lc-section-header-left">
                    <h2 className="lc-section-title">Recommended for you</h2>
                    {recommendedFiltersActive ? (
                      <p className="lc-section-subtitle">
                        {recommendedCards.length} exam{recommendedCards.length === 1 ? '' : 's'} found
                        {searchText.trim() && ` for "${searchText.trim()}"`}
                        {(categoryFilter || selectedBodyId) && ` · ${[categoryFilter && 'Category', selectedBodyId && 'Conducting Body'].filter(Boolean).join(' & ')} filter applied`}
                      </p>
                    ) : (
                      examMatches && examMatches.length > 0 ? (
                        <p className="lc-section-subtitle">
                          Top 5 exams tailored to your profiling and background
                        </p>
                      ) : null
                    )}
                  </div>
                  <div className="lc-section-header-right">
                    {recommendedFiltersActive && (
                      <button
                        type="button"
                        className="lc-view-all-link"
                        onClick={handleClearFilters}
                      >
                        Clear filters
                      </button>
                    )}
                    {!recommendedFiltersActive && (
                      <button
                        type="button"
                        className="lc-view-all-link"
                        onClick={() => {
                          handleClearFilters();
                          window.scrollTo({ top: 680, behavior: 'smooth' });
                        }}
                      >
                        View all
                      </button>
                    )}
                    {!recommendedFiltersActive && (
                      <div className="lc-carousel-controls">
                        <button
                          type="button"
                          className="lc-carousel-arrow-btn"
                          onClick={() => scrollTrack(recommendedScrollRef, 'left')}
                          aria-label="Scroll left"
                        >
                          <ChevronLeft size={16} />
                        </button>
                        <button
                          type="button"
                          className="lc-carousel-arrow-btn"
                          onClick={() => scrollTrack(recommendedScrollRef, 'right')}
                          aria-label="Scroll right"
                        >
                          <ChevronRight size={16} />
                        </button>
                      </div>
                    )}

                    {/* Tablet/mobile (<1100px) filter button in header */}
                    <button
                      type="button"
                      className="lc-mobile-header-filter-btn"
                      aria-label="Open filter results"
                      onClick={() => setMobileDrawerOpen(true)}
                    >
                      <SlidersHorizontal size={17} />
                      {activeFilterCount > 0 && (
                        <span className="lc-overflow-badge">{activeFilterCount}</span>
                      )}
                    </button>
                  </div>
                </div>

                {recommendedFiltersActive && recommendedCards.length === 0 ? (
                  <div className="filter-empty-note">
                    No exams match your search or filters. Try a different combination or{' '}
                    <button type="button" className="lc-view-all-link" style={{ display: 'inline', padding: 0 }} onClick={handleClearFilters}>
                      clear filters
                    </button>.
                  </div>
                ) : recommendedFiltersActive ? (
                  <div className="lc-search-results-grid">
                    {recommendedCards.map(renderExamCard)}
                  </div>
                ) : (
                  <div className="lc-cards-carousel" ref={recommendedScrollRef}>
                    {recommendedCards.map(renderExamCard)}
                  </div>
                )}
              </div>
              )}

              {/* ── Continue Learning & Popular Exams (Only in Recommended Mode, hidden in Explorer Mode) ── */}
              {rightTab !== 'explorer' && (
                <>
                  {/* ── Continue Learning Section ── */}
                  <div className="lc-section-box">
                    <div className="lc-section-header">
                  <div className="lc-section-header-left">
                    <h2 className="lc-section-title">Continue Learning</h2>
                    <p className="lc-section-subtitle">Pick up right where you left off</p>
                  </div>
                  {activeLearningCourses.length > 0 && (
                    <div className="lc-section-header-right">
                      <div className="lc-carousel-controls">
                        <button
                          type="button"
                          className="lc-carousel-arrow-btn"
                          onClick={() => scrollTrack(continueScrollRef, 'left')}
                          aria-label="Scroll left"
                        >
                          <ChevronLeft size={16} />
                        </button>
                        <button
                          type="button"
                          className="lc-carousel-arrow-btn"
                          onClick={() => scrollTrack(continueScrollRef, 'right')}
                          aria-label="Scroll right"
                        >
                          <ChevronRight size={16} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {activeLearningCourses.length === 0 ? (
                  <div className="lc-continue-empty-state">
                    <div className="lc-cont-empty-icon">
                      <BookOpen size={26} />
                    </div>
                    <div className="lc-cont-empty-info">
                      <h4>No courses in progress yet</h4>
                      <p>
                        Click <strong>Start Learning</strong> on any recommended exam above to begin your preparation.
                        Once you start, your courses will appear here with your progress so you can resume anytime.
                      </p>
                    </div>
                    <button
                      type="button"
                      className="lc-cont-empty-btn"
                      onClick={() => {
                        if (recommendedScrollRef && recommendedScrollRef.current) {
                          recommendedScrollRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                        }
                      }}
                    >
                      Browse Recommended
                    </button>
                  </div>
                ) : (
                  <div className="lc-cards-carousel" ref={continueScrollRef}>
                    {activeLearningCourses.map((course) => {
                      const prog = examProgress[course.title];
                      const pct = prog?.total
                        ? Math.round((prog.explored / prog.total) * 100)
                        : (course.progress ?? 0);
                      const timeAgo = formatTimeAgo(course.lastAccessedAt);

                      return (
                        <div key={course.id || course.examId || course.title} className="lc-continue-card">
                          <div className="lc-cont-thumb-wrap" onClick={() => handleResumeCourse(course)}>
                            <img
                              src={getCourseImage(course)}
                              alt={course.title}
                              className="lc-cont-thumb-img"
                              loading="lazy"
                              onError={(e) => {
                                e.target.style.display = 'none';
                                e.target.parentElement.classList.add('lc-thumb-fallback');
                              }}
                            />
                          </div>

                          <div className="lc-cont-body">
                            <div className="lc-cont-cat-row">
                              <span className="lc-cont-category">{course.category || 'Exam Prep'}</span>
                              <span className="lc-cont-accessed">{timeAgo}</span>
                            </div>

                            <h3
                              className="lc-cont-title"
                              title={course.title}
                              onClick={() => handleResumeCourse(course)}
                            >
                              {course.title}
                            </h3>

                            <div className="lc-cont-progress-wrap">
                              <div className="lc-cont-progress-labels">
                                <span className="lc-cont-progress-txt">Progress</span>
                                <span className="lc-cont-progress-pct">{pct}%</span>
                              </div>
                              <div className="lc-cont-progress-track">
                                <div
                                  className="lc-cont-progress-fill"
                                  style={{ width: `${Math.max(pct, 6)}%` }}
                                />
                              </div>
                            </div>

                            <button
                              type="button"
                              className="lc-cont-resume-btn"
                              onClick={() => handleResumeCourse(course)}
                            >
                              <Play size={13} fill="currentColor" /> Resume
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* ── Popular Exams Section ── */}
              <div className="lc-section-box">
                <div className="lc-section-header">
                  <div className="lc-section-header-left">
                    <h2 className="lc-section-title">Popular Exams</h2>
                    <p className="lc-section-subtitle">Top central and state opportunities for defence veterans</p>
                  </div>
                  <div className="lc-section-header-right">
                    <div className="lc-carousel-controls">
                      <button
                        type="button"
                        className="lc-carousel-arrow-btn"
                        onClick={() => scrollTrack(popularExamsScrollRef, 'left')}
                        aria-label="Scroll left"
                      >
                        <ChevronLeft size={16} />
                      </button>
                      <button
                        type="button"
                        className="lc-carousel-arrow-btn"
                        onClick={() => scrollTrack(popularExamsScrollRef, 'right')}
                        aria-label="Scroll right"
                      >
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="lc-cards-carousel" ref={popularExamsScrollRef}>
                  {popularExamCards.map((exam) => {
                    const isSelected = selectedPopularExamId === exam.id;
                    return (
                      <div
                        key={exam.id}
                        className={`lc-exam-card lc-popular-exam-card ${isSelected ? 'active' : ''}`}
                        role="button"
                        tabIndex={0}
                        aria-pressed={isSelected}
                        onClick={() => handlePopularExamSelect(exam)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            handlePopularExamSelect(exam);
                          }
                        }}
                      >
                        <div className="lc-card-thumb-wrap">
                          {cardImage(exam) ? (
                            <img
                              src={cardImage(exam)}
                              alt={exam.name}
                              className="lc-card-thumb-img"
                              loading="lazy"
                              onError={(e) => {
                                e.target.style.display = 'none';
                                e.target.parentElement.classList.add('lc-thumb-fallback');
                              }}
                            />
                          ) : (
                            <div className="lc-card-thumb-img lc-thumb-fallback" />
                          )}
                          <div
                            className="lc-card-badge"
                            style={{ backgroundColor: exam.badgeBg, color: exam.badgeColor }}
                          >
                            {exam.badge}
                          </div>
                        </div>

                        <div className="lc-card-body">
                          <h3 className="lc-card-title" title={exam.name}>
                            {exam.name}
                          </h3>
                          <p className="lc-card-conductor">{exam.subtitle}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {selectedPopularExam && (
                  <div className="lc-exam-details-panel">
                    <div className="lc-exam-details-header">
                      <div className="lc-exam-details-logo-wrap">
                        <img
                          src={cardImage(selectedPopularExam)}
                          alt={selectedPopularExam.name}
                          className="lc-exam-details-img"
                          onError={(e) => { e.target.style.display = 'none'; }}
                        />
                      </div>
                      <div className="lc-exam-details-headline">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap', marginBottom: '0.2rem' }}>
                          <h3 style={{ margin: 0 }}>{selectedPopularExam.name}</h3>
                          {selectedPopularExam.badge && (
                            <span
                              className="lc-exam-details-badge"
                              style={{
                                backgroundColor: selectedPopularExam.badgeBg || '#dcfce7',
                                color: selectedPopularExam.badgeColor || '#166534',
                              }}
                            >
                              {selectedPopularExam.badge}
                            </span>
                          )}
                        </div>
                        <p className="lc-exam-details-conductor">
                          {selectedPopularExam.conductingBodyName || selectedPopularExam.conductingBody}
                        </p>
                        {selectedPopularExam.description && (
                          <p className="lc-exam-details-desc">
                            {selectedPopularExam.description}
                          </p>
                        )}
                        <div className="lc-exam-details-meta-row">
                          {selectedPopularExam.category && (
                            <span className="lc-exam-meta-chip">{selectedPopularExam.category}</span>
                          )}
                          {selectedPopularExam.regionLevel && (
                            <span className="lc-exam-meta-chip">
                              {selectedPopularExam.regionLevel === 'central'
                                ? 'Central'
                                : selectedPopularExam.regionLevel === 'state'
                                ? 'State'
                                : 'UT'}{' '}
                              Level
                            </span>
                          )}
                          <span className="lc-exam-meta-chip">Full Course Coverage</span>
                          <span className="lc-exam-meta-chip">Syllabus + Notes + Tests + PYQs</span>
                        </div>
                      </div>
                      <div className="lc-exam-details-header-right">
                        <button
                          type="button"
                          className="lc-exam-details-close"
                          onClick={() => setSelectedPopularExamId(null)}
                          aria-label="Close exam details"
                        >
                          <X size={18} />
                        </button>
                        {selectedPopularExam.examId && (
                          <div className="lc-exam-details-actions-stacked">
                            <button
                              type="button"
                              className="lc-exam-details-primary-btn"
                              onClick={() => handleStartPreparing(selectedPopularExam.examId, selectedPopularExam.matchedName)}
                              disabled={preparingExamId === selectedPopularExam.examId}
                            >
                              <Play size={14} /> Start Learning
                            </button>
                            <button
                              type="button"
                              className="lc-exam-details-secondary-btn"
                              onClick={() => navigate(`/exam/${selectedPopularExam.examId}`, { state: { from: '/learning-center' } })}
                            >
                              View Syllabus
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {!selectedPopularExam.examId ? (
                      <p className="lc-exam-details-empty">This exam isn't in our catalog yet — check back soon.</p>
                    ) : (
                      <>
                        <div className="lc-exam-details-tabs">
                          {POPULAR_EXAM_TABS.map((tab) => (
                            <button
                              key={tab.key}
                              type="button"
                              className={`lc-exam-details-tab ${activePopularExamTab === tab.key ? 'active' : ''}`}
                              onClick={() => setActivePopularExamTab(tab.key)}
                            >
                              {tab.label}
                            </button>
                          ))}
                        </div>

                        <div className="lc-exam-details-tab-content">
                          {activePopularExamTab === 'overview' && (
                            <PopularExamOverview
                              exam={selectedPopularExam}
                              relatedExams={relatedPopularExams}
                              navigate={navigate}
                            />
                          )}
                          {activePopularExamTab === 'syllabus' && (
                            <ExamContentPreview
                              examId={selectedPopularExam.examId}
                              examName={selectedPopularExam.matchedName}
                              tier={effectiveTier}
                              freeQuizUsed={freeQuizUsed}
                              variant="list"
                              categories={['Guide', 'Precis']}
                              showMockTests={false}
                            />
                          )}
                          {activePopularExamTab === 'mock' && (
                            <ExamContentPreview
                              examId={selectedPopularExam.examId}
                              examName={selectedPopularExam.matchedName}
                              tier={effectiveTier}
                              freeQuizUsed={freeQuizUsed}
                              variant="list"
                              categories={[]}
                              showMockTests
                            />
                          )}
                          {activePopularExamTab === 'pyq' && (
                            <ExamContentPreview
                              examId={selectedPopularExam.examId}
                              examName={selectedPopularExam.matchedName}
                              tier={effectiveTier}
                              freeQuizUsed={freeQuizUsed}
                              variant="list"
                              categories={['PYQ']}
                              showMockTests={false}
                            />
                          )}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </section>
          </div>

          {/* ── Section 10: Full-Width Promotional Banner (Only in Recommended Mode, since Explorer Mode has it inside portal below Why Choose Veer Next) ── */}
          {rightTab === 'recommended' && (
            <section className="lc-promo-banner" aria-label="VeerNXT Career Progression">
              <div className="lc-promo-bg-layer" />
              <div className="lc-promo-overlay" />
              <div className="lc-promo-content">
                <div className="lc-promo-left">
                  <span className="lc-promo-eyebrow">
                    <ShieldCheck size={16} className="lc-promo-eyebrow-icon" /> VeerNXT Career Transition
                  </span>
                  <h2 className="lc-promo-title">
                    Discipline built you.
                    <span className="lc-promo-highlight"> Learning takes you further.</span>
                  </h2>
                  <p className="lc-promo-desc">
                    Access structured courses, practice tests and expert content to achieve your next career goal.
                    Built specifically for armed forces personnel transitioning into civilian leadership and public service.
                  </p>

                  <div className="lc-promo-stats">
                    <div className="lc-promo-stat-item">
                      <CheckCircle2 size={16} className="lc-promo-stat-icon" />
                      <span>1,500+ Curated Resources</span>
                    </div>
                    <div className="lc-promo-stat-item">
                      <CheckCircle2 size={16} className="lc-promo-stat-icon" />
                      <span>50+ Government Exams</span>
                    </div>
                    <div className="lc-promo-stat-item">
                      <CheckCircle2 size={16} className="lc-promo-stat-icon" />
                      <span>100% Free for Ex-Servicemen</span>
                    </div>
                  </div>

                  <div className="lc-promo-actions">
                    <button
                      type="button"
                      className="lc-promo-cta-btn"
                      onClick={handleExploreAllCourses}
                    >
                      Explore All Courses <ArrowRight size={17} />
                    </button>
                  </div>
                </div>
              </div>
            </section>
          )}
        </main>

        {/* ── Mobile Slide-In Filter Drawer (Sideways from left, Mobile <1100px Only) ── */}
        <div
          className={`lc-mobile-drawer-root ${mobileDrawerOpen ? 'is-open' : ''}`}
          aria-hidden={!mobileDrawerOpen}
        >
          <div
            className="lc-mobile-drawer-backdrop"
            onClick={() => setMobileDrawerOpen(false)}
            aria-label="Close filters backdrop"
          />
          <aside className="lc-mobile-drawer-panel" role="dialog" aria-modal="true" aria-label="Filter Results">
            {/* Drawer Header */}
            <div className="lc-mobile-drawer-header">
              <h3 className="lc-mobile-drawer-title">FILTER RESULTS</h3>
              <div className="lc-mobile-drawer-header-actions">
                {filtersActive && (
                  <button
                    type="button"
                    className="lc-mobile-drawer-clear-btn"
                    onClick={handleClearFilters}
                  >
                    Clear All
                  </button>
                )}
                <button
                  type="button"
                  className="lc-mobile-drawer-close-btn"
                  onClick={() => setMobileDrawerOpen(false)}
                  aria-label="Close filter drawer"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Drawer Body */}
            <div className="lc-mobile-drawer-body">
              {/* Category Accordion */}
              <div className="lc-mobile-drawer-accordion">
                <button
                  type="button"
                  className="lc-mobile-accordion-header"
                  onClick={() => setOpenDrawerFilters((prev) => ({ ...prev, category: !prev.category }))}
                  aria-expanded={openDrawerFilters.category}
                >
                  <span className="lc-mobile-accordion-title">Category</span>
                  {openDrawerFilters.category ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </button>

                {openDrawerFilters.category && (
                  <div className="lc-mobile-accordion-list">
                    <label className="lc-mobile-checkbox-item">
                      <input
                        type="checkbox"
                        checked={!categoryFilter}
                        onChange={() => setCategoryFilter('')}
                      />
                      <span className="lc-mobile-checkbox-box" />
                      <span className="lc-mobile-checkbox-text">All Categories</span>
                      <span className="lc-mobile-checkbox-count">{levelExams.length}</span>
                    </label>

                    {categoryOptions.map((cat) => (
                      <label key={cat} className="lc-mobile-checkbox-item">
                        <input
                          type="checkbox"
                          checked={categoryFilter === cat}
                          onChange={() => {
                            const next = categoryFilter === cat ? '' : cat;
                            setCategoryFilter(next);
                            if (next) {
                              setRightTab('explorer');
                              setMobileDrawerOpen(false);
                            }
                          }}
                        />
                        <span className="lc-mobile-checkbox-box" />
                        <span className="lc-mobile-checkbox-text">{cat}</span>
                        <span className="lc-mobile-checkbox-count">{categoryCounts[cat] || 0}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* Conducting Body Accordion */}
              <div className="lc-mobile-drawer-accordion">
                <button
                  type="button"
                  className="lc-mobile-accordion-header"
                  onClick={() => setOpenDrawerFilters((prev) => ({ ...prev, body: !prev.body }))}
                  aria-expanded={openDrawerFilters.body}
                >
                  <span className="lc-mobile-accordion-title">Conducting Body</span>
                  {openDrawerFilters.body ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </button>

                {openDrawerFilters.body && (
                  <div className="lc-mobile-accordion-list">
                    <div className="lc-mobile-drawer-search-box">
                      <Search size={14} className="lc-mobile-drawer-search-icon" />
                      <input
                        type="text"
                        placeholder="Search conducting body..."
                        value={bodySearch}
                        onChange={(e) => setBodySearch(e.target.value)}
                        className="lc-mobile-drawer-search-input"
                      />
                      {bodySearch && (
                        <button
                          type="button"
                          className="lc-mobile-search-clear-btn"
                          onClick={() => setBodySearch('')}
                          aria-label="Clear body search"
                        >
                          <X size={13} />
                        </button>
                      )}
                    </div>

                    <div className="lc-mobile-body-scroll-list">
                      <label className="lc-mobile-checkbox-item">
                        <input
                          type="checkbox"
                          checked={!selectedBodyId}
                          onChange={() => setSelectedBodyId('')}
                        />
                        <span className="lc-mobile-checkbox-box" />
                        <span className="lc-mobile-checkbox-text">All Bodies</span>
                        <span className="lc-mobile-checkbox-count">{bodyOptions.length}</span>
                      </label>

                      {filteredBodyOptions.map((body) => (
                        <label key={body.id} className="lc-mobile-checkbox-item">
                          <input
                            type="checkbox"
                            checked={selectedBodyId === body.id}
                            onChange={() => setSelectedBodyId(selectedBodyId === body.id ? '' : body.id)}
                          />
                          <span className="lc-mobile-checkbox-box" />
                          <span className="lc-mobile-checkbox-text">{body.name}</span>
                        </label>
                      ))}
                      {filteredBodyOptions.length === 0 && (
                        <p className="filter-empty-note">No bodies found.</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Drawer Footer */}
            <div className="lc-mobile-drawer-footer">
              <button
                type="button"
                className="lc-mobile-drawer-apply-btn"
                onClick={() => setMobileDrawerOpen(false)}
              >
                View {recommendedCards.length} Result{recommendedCards.length === 1 ? '' : 's'}
              </button>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};

export default LearningCenter;
