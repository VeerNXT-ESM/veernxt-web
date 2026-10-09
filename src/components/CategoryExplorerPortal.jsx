import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BookOpen,
  ScrollText,
  FileText,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  ChevronRight,
  ChevronLeft,
  Shield,
  ShieldCheck,
  Layers,
  Award,
  Users,
  Compass,
  Briefcase,
  Monitor,
  Calendar,
  GraduationCap,
  BarChart3,
  Trophy,
  Target,
  Search,
  X,
  MapPin,
  Landmark,
  ExternalLink,
  Sparkles,
  Clock,
  ArrowUpRight,
  RefreshCw,
  Lock,
  Unlock,
  Settings,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import ExamThumbnail from '../pages/admin/ExamThumbnail';
import { ResourceTile, IntroManualTile } from './ExamContentPreview';
import { useExamContent } from '../hooks/useExamContent';
import SecureReader from './SecureReader';
import { ReaderThemeProvider } from './book/theme/ReaderThemeProvider';
import { normalizeReaderCategory } from './book/theme/customThemeStore';
import { getEffectiveTier, isResourceLockedForUser } from '../lib/subscriptionAccess';
import './CategoryExplorerPortal.css';

let jobsV2Cache = null;
let jobsV2FetchPromise = null;

async function getJobsV2Cached() {
  if (jobsV2Cache && jobsV2Cache.length > 0) return jobsV2Cache;
  if (jobsV2FetchPromise) return jobsV2FetchPromise;

  jobsV2FetchPromise = (async () => {
    try {
      let res = await fetch('/api/jobs-v2');
      if (!res.ok) {
        res = await fetch('/api/jobs?source=v2');
      }
      const data = await res.json();
      if (data?.ok && Array.isArray(data.jobs) && data.jobs.length > 0) {
        jobsV2Cache = data.jobs;
        return jobsV2Cache;
      }
    } catch (err) {
      console.warn('Jobs_v2 API fetch warning, attempting fallback:', err);
    }

    try {
      const { data: dbJobs, error } = await supabase
        .from('jobs_v2')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(350);

      if (!error && dbJobs && dbJobs.length > 0) {
        jobsV2Cache = dbJobs.map(job => ({
          ...job,
          id: job.id || job.job_id,
          body: job.conducting_body || job.raw_json?.conducting_body || 'Government Department',
          careerTrack: job.career_track,
          publishedOn: job.published_on,
          lastDate: job.last_date,
          tags: Array.isArray(job.tags) ? job.tags : [],
          aiDescription: job.ai_description,
          _source: 'jobs_v2'
        }));
        return jobsV2Cache;
      }
    } catch (err2) {
      console.warn('Direct supabase jobs_v2 fallback warning:', err2);
    }

    return [];
  })();

  const result = await jobsV2FetchPromise;
  jobsV2FetchPromise = null;
  return result;
}

// Intelligent matcher connecting jobs_v2 to selected exams based on tags, roles, authority & metadata
function matchJobsForExam(allJobs, selectedExam) {
  if (!allJobs || !allJobs.length || !selectedExam) return [];

  const examId = selectedExam.id || selectedExam.exam_id;
  const examName = (selectedExam.name || selectedExam.title || '').toLowerCase();
  const conductingName = (
    typeof selectedExam.conducting_body === 'string'
      ? selectedExam.conducting_body
      : selectedExam.conducting_body?.name || selectedExam.conductingBody || ''
  ).toLowerCase();
  const conductingShort = (
    typeof selectedExam.conducting_body === 'object'
      ? selectedExam.conducting_body?.short_name || ''
      : ''
  ).toLowerCase();
  const categoryName = (selectedExam.category || '').toLowerCase();
  const regionName = (
    typeof selectedExam.region === 'string'
      ? selectedExam.region
      : selectedExam.region?.name || ''
  ).toLowerCase();

  const stopWords = new Set([
    'and', 'for', 'the', 'exam', 'examination', 'recruitment', 'level',
    'post', 'posts', 'online', 'form', 'various', 'tier', 'cbt', 'phase',
    'combined', 'all', 'india'
  ]);
  const examTokens = examName
    .split(/[\s,./()\-]+/)
    .filter(w => w.length >= 2 && !stopWords.has(w));

  const conductingTokens = [conductingName, conductingShort]
    .join(' ')
    .split(/[\s,./()\-]+/)
    .filter(w => w.length >= 2 && !['board', 'commission', 'govt', 'india', 'state', 'department', 'recruitment', 'and', 'for', 'the'].includes(w));

  const scored = allJobs.map(job => {
    const titleLower = (job.title || '').toLowerCase();
    const tagsList = Array.isArray(job.tags) ? job.tags.map(t => String(t).toLowerCase()) : [];
    const tagsText = tagsList.join(' ');
    const bodyLower = (job.body || job.conducting_body || job.raw_json?.conducting_body || '').toLowerCase();
    const trackLower = (job.careerTrack || job.career_track || '').toLowerCase();
    const descSnippet = (job.aiDescription || job.ai_description || '').slice(0, 400).toLowerCase();
    const fullText = `${titleLower} ${tagsText} ${bodyLower} ${descSnippet}`;

    let score = 0;
    const reasons = [];

    // 1. Direct exam ID link
    if (examId && (job.exam_id === examId || job.lc_exam_id === examId || job.id === examId)) {
      score += 100;
      reasons.push('Linked Exam ID');
    }

    // 2. Exact match of exam title tokens
    for (const token of examTokens) {
      if (token.length <= 2) {
        const regex = new RegExp(`\\b${token}\\b`, 'i');
        if (regex.test(titleLower)) {
          score += 40;
          reasons.push(`Title (${token.toUpperCase()})`);
        } else if (regex.test(fullText)) {
          score += 20;
          reasons.push(`Text (${token.toUpperCase()})`);
        }
      } else {
        if (titleLower.includes(token)) {
          score += 35;
          reasons.push(`Title: ${token}`);
        } else if (tagsText.includes(token)) {
          score += 25;
          reasons.push(`Tag: ${token}`);
        } else if (fullText.includes(token)) {
          score += 15;
          reasons.push(`Matched: ${token}`);
        }
      }
    }

    // 3. Conducting Body match
    for (const cTok of conductingTokens) {
      if (cTok.length <= 2) {
        const regex = new RegExp(`\\b${cTok}\\b`, 'i');
        if (regex.test(titleLower) || regex.test(bodyLower)) {
          score += 30;
          reasons.push(`Authority (${cTok.toUpperCase()})`);
        }
      } else {
        if (titleLower.includes(cTok) || bodyLower.includes(cTok)) {
          score += 25;
          reasons.push(`Authority: ${cTok}`);
        } else if (fullText.includes(cTok)) {
          score += 15;
          reasons.push(`Authority: ${cTok}`);
        }
      }
    }

    // 4. Role-based tag mappings
    if (examName.includes('mts') || examName.includes('multi tasking')) {
      if (tagsList.includes('peon_job') || fullText.includes('mts') || fullText.includes('multi tasking')) {
        score += 30;
        reasons.push('MTS/Peon Role');
      }
    }
    if (examName.includes('constable')) {
      if (tagsList.includes('constable_job') || titleLower.includes('constable')) {
        score += 30;
        reasons.push('Constable Role');
      }
    }
    if (examName.includes('clerk')) {
      if (tagsList.includes('clerk_job') || titleLower.includes('clerk')) {
        score += 30;
        reasons.push('Clerk Role');
      }
    }
    if (examName.includes('inspector') || examName.includes('sub inspector') || examName.includes(' si ')) {
      if (tagsList.includes('sub_inspector_job') || titleLower.includes('inspector')) {
        score += 30;
        reasons.push('Inspector Role');
      }
    }
    if (examName.includes('officer') || examName.includes('po') || examName.includes('apo')) {
      if (tagsList.includes('officer_job') || titleLower.includes('officer')) {
        score += 25;
        reasons.push('Officer Role');
      }
    }
    if (examName.includes('stenographer') || examName.includes('steno')) {
      if (tagsList.includes('stenographer_job') || fullText.includes('stenographer')) {
        score += 35;
        reasons.push('Stenographer Role');
      }
    }
    if (examName.includes('engineer') || examName.includes('je')) {
      if (tagsList.includes('engineering_job') || fullText.includes('engineer')) {
        score += 30;
        reasons.push('Engineering Role');
      }
    }
    if (examName.includes('teacher') || examName.includes('tet')) {
      if (tagsList.includes('teaching_job') || fullText.includes('teacher')) {
        score += 35;
        reasons.push('Teaching Role');
      }
    }

    // 5. Category & Track matches
    if (categoryName.includes('ssc') || conductingTokens.some(t => t.includes('ssc'))) {
      if (tagsList.includes('ssc_job')) { score += 25; reasons.push('SSC Tag'); }
    }
    if (categoryName.includes('railway') || conductingTokens.some(t => t.includes('railway') || t.includes('rrb'))) {
      if (tagsList.includes('railway_job') || trackLower === 'railways') { score += 30; reasons.push('Railways Track'); }
    }
    if (categoryName.includes('police') || examName.includes('police')) {
      if (tagsList.includes('police_job') || trackLower.includes('police')) { score += 30; reasons.push('Police Track'); }
    }
    if (categoryName.includes('bank') || conductingTokens.some(t => t.includes('ibps') || t.includes('sbi'))) {
      if (tagsList.includes('banking_job') || trackLower === 'banking') { score += 30; reasons.push('Banking Track'); }
    }
    if (categoryName.includes('defence') || conductingTokens.some(t => t.includes('defence') || t.includes('army') || t.includes('navy') || t.includes('air force'))) {
      if (tagsList.includes('defence_job') || trackLower === 'defence') { score += 30; reasons.push('Defence Track'); }
    }
    if (categoryName.includes('civil') || categoryName.includes('upsc')) {
      if (tagsList.includes('upsc_job') || titleLower.includes('upsc')) { score += 30; reasons.push('UPSC Tag'); }
    }

    // 6. Region / State alignment
    if (regionName && regionName !== 'all-india' && regionName !== 'central') {
      if (titleLower.includes(regionName) || fullText.includes(regionName)) {
        score += 25;
        reasons.push(`State: ${regionName}`);
      }
    }

    // 7. ESM quota bonus
    if (tagsList.includes('ex_servicemen_job') || fullText.includes('ex-servicemen') || fullText.includes('esm')) {
      score += 10;
      reasons.push('ESM Quota');
    }

    return { job, score, reasons };
  });

  const directMatches = scored.filter(s => s.score >= 35).sort((a, b) => b.score - a.score);
  if (directMatches.length > 0) {
    return directMatches.slice(0, 8).map(s => ({ ...s.job, _matchScore: s.score, _matchReasons: s.reasons }));
  }

  const secondary = scored.filter(s => s.score >= 20).sort((a, b) => b.score - a.score);
  if (secondary.length > 0) {
    return secondary.slice(0, 6).map(s => ({ ...s.job, _matchScore: s.score, _matchReasons: s.reasons }));
  }

  const fallback = scored.filter(s => s.score > 0).sort((a, b) => b.score - a.score);
  if (fallback.length > 0) {
    return fallback.slice(0, 4).map(s => ({ ...s.job, _matchScore: s.score, _matchReasons: s.reasons }));
  }

  return [];
}

// Helper: Generates pixel-perfect card metadata matching reference design
function getExamRichCardData(exam, categoryName, division) {
  const rawName = exam.name || exam.title || '';
  const nameLower = rawName.toLowerCase();
  const conducting = exam.conducting_body?.name || exam.conductingBody || '';
  const regionLevel = exam.region?.name || exam.region?.level || exam.level || (division === 'central' ? 'Central' : 'State');

  // 1. Short Display Title matching reference design
  let displayTitle = rawName;
  if (nameLower.startsWith('ssc cgl')) displayTitle = 'SSC CGL';
  else if (nameLower.startsWith('ssc chsl')) displayTitle = 'SSC CHSL';
  else if (nameLower.startsWith('ssc mts')) displayTitle = 'SSC MTS & Havaldar';
  else if (nameLower.startsWith('ssc gd')) displayTitle = 'SSC GD Constable';
  else if (nameLower.includes('junior engineer') || nameLower.startsWith('ssc je')) displayTitle = 'SSC Junior Engineer (JE)';
  else if (nameLower.startsWith('ssc steno')) displayTitle = 'SSC Stenographer';
  else if (nameLower.startsWith('ssc cpo')) displayTitle = 'SSC CPO';
  else if (nameLower.startsWith('ssc jht')) displayTitle = 'SSC JHT';
  else if (nameLower.startsWith('ssc selection post')) displayTitle = 'SSC Selection Post';
  else if (nameLower.includes('scientific assistant')) displayTitle = 'SSC Scientific Assistant';
  else if (nameLower.startsWith('nda')) displayTitle = 'NDA – National Defence Academy';
  else if (nameLower.startsWith('cds')) displayTitle = 'CDS – Combined Defense Services';
  else if (nameLower.startsWith('afcat')) displayTitle = 'AFCAT – Air Force Common Admission Test';
  else if (nameLower.startsWith('capf')) displayTitle = 'CAPF – Central Armed Police Force';
  else if (nameLower.startsWith('ibps po')) displayTitle = 'IBPS PO';
  else if (nameLower.startsWith('ibps clerk')) displayTitle = 'IBPS Clerk';
  else if (nameLower.startsWith('sbi po')) displayTitle = 'SBI PO';
  else if (nameLower.startsWith('sbi clerk')) displayTitle = 'SBI Clerk';
  else {
    const stripped = rawName.replace(/\s*\([^)]*\)$/, '').trim();
    displayTitle = stripped.length >= 4 ? stripped : rawName;
  }

  // 2. Comprehensive Description matching reference design
  let description = '';
  if (nameLower.includes('cgl')) {
    description = 'Combined Graduate Level Examination for various Group B & C posts.';
  } else if (nameLower.includes('chsl')) {
    description = 'Combined Higher Secondary Level Examination for LDC, JSA, DEO etc.';
  } else if (nameLower.includes('mts') || nameLower.includes('multi tasking')) {
    description = 'Multi-Tasking (Non-Technical) Staff and Havaldar (CBIC & CBN) Examination.';
  } else if (nameLower.includes('gd constable') || nameLower.includes('general duty')) {
    description = 'Constable (General Duty) in CAPFs, SSF, Rifleman (ASSAM RIFLES) and NCB.';
  } else if (nameLower.includes('engineer') || nameLower.includes('je ')) {
    description = 'Junior Engineer Examination for Civil, Mechanical, Electrical and Quantity Surveying.';
  } else if (nameLower.includes('steno')) {
    description = 'Stenographer Grade ‘C’ & ‘D’ Examination in various Ministries/Departments.';
  } else if (nameLower.includes('cpo')) {
    description = 'Sub-Inspector in Delhi Police, CAPFs and Central Armed Police Forces.';
  } else if (nameLower.includes('jht') || nameLower.includes('translator')) {
    description = 'Junior Hindi Translator, Junior Translator and Senior Hindi Translator Exam.';
  } else if (nameLower.includes('selection post')) {
    description = 'Selection Posts Examination for Phase recruitments across Union Ministries.';
  } else if (nameLower.includes('scientific assistant')) {
    description = 'Scientific Assistant in India Meteorological Department (IMD) Recruitment.';
  } else if (nameLower.includes('nda')) {
    description = 'National Defence Academy & Naval Academy Examination for Officer Entry.';
  } else if (nameLower.includes('cds')) {
    description = 'Combined Defence Services Examination for Commissioned Officers in Armed Forces.';
  } else if (nameLower.includes('afcat')) {
    description = 'Air Force Common Admission Test for Flying and Ground Duty Branches.';
  } else if (nameLower.includes('capf')) {
    description = 'Central Armed Police Forces Assistant Commandants Competitive Examination.';
  } else if (nameLower.includes('jag') || nameLower.includes('advocate general')) {
    description = 'Judge Advocate General Entry Scheme for Law Graduates in the Indian Army.';
  } else if (nameLower.includes('po') || nameLower.includes('probationary')) {
    description = 'Probationary Officer / Management Trainee recruitment across Nationalized Banks.';
  } else if (nameLower.includes('clerk') || nameLower.includes('assistant')) {
    description = 'Clerical Cadre and Junior Associate Examination for Banking Operations.';
  } else if (nameLower.includes('constable')) {
    description = 'Executive Constable recruitment examination for law enforcement and security services.';
  } else if (nameLower.includes('sub inspector') || nameLower.includes(' si ')) {
    description = 'Sub-Inspector executive cadre competitive examination for investigation & law enforcement.';
  } else if (nameLower.includes('teacher') || nameLower.includes('tgt') || nameLower.includes('pgt') || nameLower.includes('prt')) {
    description = 'Teaching recruitment qualification examination for government schools and educational institutions.';
  } else {
    description = `Recruitment examination conducted by ${conducting || 'Commission'} for ${categoryName || 'Government'} cadres.`;
  }

  // 3. Icon and Color Theme
  let theme = 'green';
  let iconName = 'file';
  if (nameLower.includes('chsl') || nameLower.includes('clerk') || nameLower.includes('computer')) {
    theme = 'orange';
    iconName = 'monitor';
  } else if (nameLower.includes('mts') || nameLower.includes('group d') || nameLower.includes('staff')) {
    theme = 'purple';
    iconName = 'users';
  } else if (nameLower.includes('constable') || nameLower.includes('police') || nameLower.includes('defence') || nameLower.includes('army') || nameLower.includes('navy') || nameLower.includes('air force') || nameLower.includes('capf') || nameLower.includes('nda') || nameLower.includes('cds')) {
    theme = 'blue';
    iconName = 'shield';
  } else if (nameLower.includes('engineer') || nameLower.includes('technical') || nameLower.includes('je ') || nameLower.includes('scientific')) {
    theme = 'teal';
    iconName = 'settings';
  } else if (nameLower.includes('steno') || nameLower.includes('typist') || nameLower.includes('jht') || nameLower.includes('translator')) {
    theme = 'red';
    iconName = 'scroll';
  } else if (nameLower.includes('cgl') || nameLower.includes('graduate') || nameLower.includes('officer') || nameLower.includes('po ') || nameLower.includes('civil')) {
    theme = 'green';
    iconName = 'file';
  } else {
    const themes = ['green', 'orange', 'purple', 'blue', 'teal', 'red'];
    const charSum = rawName.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
    theme = themes[charSum % themes.length];
    iconName = ['file', 'monitor', 'users', 'shield', 'settings', 'scroll'][charSum % 6];
  }

  // 4. Qualification Pill
  let qualText = 'Graduate Level';
  let qualTheme = 'qual-green';
  let qualIcon = 'grad';
  if (nameLower.includes('10+2') || nameLower.includes('chsl') || nameLower.includes('clerk') || nameLower.includes('intermediate') || nameLower.includes('stenographer')) {
    qualText = '10+2 Level';
    qualTheme = 'qual-orange';
    qualIcon = 'grad';
  } else if (nameLower.includes('mts') || nameLower.includes('matric') || nameLower.includes('group d') || nameLower.includes('peon')) {
    qualText = 'Matriculation';
    qualTheme = 'qual-purple';
    qualIcon = 'grad';
  } else if (nameLower.includes('gd constable') || nameLower.includes('police') || nameLower.includes('defence') || nameLower.includes('constable')) {
    qualText = 'Police & Defence';
    qualTheme = 'qual-blue';
    qualIcon = 'shield';
  } else if (nameLower.includes('engineer') || nameLower.includes('je ') || nameLower.includes('technical') || nameLower.includes('scientific')) {
    qualText = 'Technical';
    qualTheme = 'qual-teal';
    qualIcon = 'settings';
  } else if (nameLower.includes('cgl') || nameLower.includes('po') || nameLower.includes('officer') || nameLower.includes('civil') || nameLower.includes('cds')) {
    qualText = 'Graduate Level';
    qualTheme = 'qual-green';
    qualIcon = 'grad';
  } else {
    qualText = 'Eligible Candidates';
    qualTheme = 'qual-green';
    qualIcon = 'grad';
  }

  // 5. Region / Level Pill
  let levelText = 'Central';
  if (typeof regionLevel === 'string' && regionLevel.toLowerCase().includes('central')) {
    levelText = 'Central';
  } else if (division === 'central') {
    levelText = 'Central';
  } else if (typeof regionLevel === 'string' && regionLevel.trim()) {
    levelText = regionLevel;
  } else {
    levelText = division === 'ut' ? 'UT' : division === 'state' ? 'State' : 'Central';
  }

  // 6. Role / Posts Info (Footer Left)
  let postText = 'Various Posts';
  if (nameLower.includes('cgl')) postText = 'Various Posts';
  else if (nameLower.includes('chsl')) postText = 'LDC, JSA, DEO';
  else if (nameLower.includes('mts')) postText = 'MTS, Havaldar';
  else if (nameLower.includes('gd constable') || nameLower.includes('constable')) postText = 'Constable (GD)';
  else if (nameLower.includes('engineer') || nameLower.includes('je ')) postText = 'JE (Civil/Mech/Elec)';
  else if (nameLower.includes('steno')) postText = 'Stenographer';
  else if (nameLower.includes('cpo')) postText = 'Sub-Inspector';
  else if (nameLower.includes('nda')) postText = 'Army, Navy, Air Force';
  else if (nameLower.includes('cds')) postText = 'IMA, INA, AFA, OTA';
  else if (nameLower.includes('po')) postText = 'Scale I Officers';
  else if (nameLower.includes('clerk')) postText = 'Clerical Cadre';
  else postText = conducting || 'Recruitment Posts';

  // 7. Frequency Info
  let freqText = 'Once a Year';
  if (nameLower.includes('nda') || nameLower.includes('cds') || nameLower.includes('afcat')) {
    freqText = 'Twice a Year';
  }

  return {
    displayTitle,
    description,
    theme,
    iconName,
    qualText,
    qualTheme,
    qualIcon,
    levelText,
    postText,
    freqText,
  };
}

function renderCardIcon(iconName) {
  switch (iconName) {
    case 'monitor':
      return <Monitor size={24} strokeWidth={2.2} />;
    case 'users':
      return <Users size={24} strokeWidth={2.2} />;
    case 'shield':
      return <Shield size={24} strokeWidth={2.2} />;
    case 'settings':
      return <Settings size={24} strokeWidth={2.2} />;
    case 'scroll':
      return <ScrollText size={24} strokeWidth={2.2} />;
    case 'file':
    default:
      return <FileText size={24} strokeWidth={2.2} />;
  }
}

function renderQualIcon(qualIcon) {
  switch (qualIcon) {
    case 'shield':
      return <Shield size={12} strokeWidth={2.2} />;
    case 'settings':
      return <Settings size={12} strokeWidth={2.2} />;
    case 'grad':
    default:
      return <GraduationCap size={12} strokeWidth={2.2} />;
  }
}

/**
 * CategoryExplorerPortal
 *
 * Implements the rich category landing view matching the design reference,
 * with sequential in-place drill-downs:
 *   Level 1: Category / All Exams List (with "Continue Prep ->")
 *   Level 2: Selected Exam Details & Hub (5 Action Cards + Resources + Matching Jobs)
 *   Level 3: In-Place Interactive Book Reader
 */
export default function CategoryExplorerPortal({
  categoryName,
  stateName = '',
  division = 'central',
  levelExams = [],
  allCatalog = [],
  isSidebarCollapsed,
  onSetSidebarCollapsed,
  onSelectExam,
  onExploreContent,
}) {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAllExams, setShowAllExams] = useState(false);
  const [examSearch, setExamSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const EXAMS_PER_PAGE = 6;
  const [localDbExams, setLocalDbExams] = useState([]);

  // Sequential drilldown states
  const [selectedExam, setSelectedExam] = useState(null);
  const [activeReadingResource, setActiveReadingResource] = useState(null);
  const [activeResourceTab, setActiveResourceTab] = useState('intro');
  const [examJobs, setExamJobs] = useState([]);
  const [jobsLoading, setJobsLoading] = useState(false);
  const [effectiveTier, setEffectiveTier] = useState('FREE');

  const handleViewAllExams = () => {
    setShowAllExams(true);
    setCurrentPage(1);
    onSetSidebarCollapsed?.(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBackToOverview = () => {
    setShowAllExams(false);
    onSetSidebarCollapsed?.(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Reset states when switching category or division
  useEffect(() => {
    setShowAllExams(false);
    setExamSearch('');
    setCurrentPage(1);
    setSelectedExam(null);
    setActiveReadingResource(null);
    setActiveResourceTab('intro');
    onSetSidebarCollapsed?.(false);
  }, [categoryName, division]);

  // Fetch subscription tier
  useEffect(() => {
    let isMounted = true;
    async function fetchTier() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user || !isMounted) return;
        const { data: uProf } = await supabase
          .from('user_profiles')
          .select('subscription_tier, subscription_expires_at')
          .eq('id', session.user.id)
          .maybeSingle();
        if (isMounted && uProf) {
          setEffectiveTier(getEffectiveTier(uProf.subscription_tier, uProf.subscription_expires_at));
        }
      } catch (err) {
        console.warn('Subscription check error:', err);
      }
    }
    fetchTier();
    return () => { isMounted = false; };
  }, []);

  // Fallback load exams from Supabase if parent hasn't loaded catalog
  useEffect(() => {
    if ((levelExams && levelExams.length > 0) || (allCatalog && allCatalog.length > 0)) {
      return;
    }
    let isMounted = true;
    async function fetchFallbackExams() {
      try {
        const { data, error } = await supabase
          .from('lc_exams')
          .select('id, name, category, conducting_body:lc_conducting_bodies(id, name), region:lc_regions(id, name, level)')
          .limit(1000);
        if (!error && data && isMounted) {
          setLocalDbExams(data);
        }
      } catch (e) {
        console.warn('Failed to load fallback exams:', e);
      }
    }
    fetchFallbackExams();
    return () => {
      isMounted = false;
    };
  }, [levelExams, allCatalog]);

  // Load category profile
  useEffect(() => {
    let isMounted = true;
    async function fetchProfile() {
      if (!categoryName) return;
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('lc_category_profiles')
          .select('*')
          .eq('category_name', categoryName)
          .eq('division', division)
          .maybeSingle();

        if (error) {
          console.warn('Error fetching category profile:', error);
        }

        if (isMounted) {
          if (data) {
            setProfile(data);
          } else {
            const { data: anyDivData } = await supabase
              .from('lc_category_profiles')
              .select('*')
              .eq('category_name', categoryName)
              .maybeSingle();

            if (anyDivData && isMounted) {
              setProfile({
                ...anyDivData,
                division,
              });
            } else if (isMounted) {
              setProfile({
                category_name: categoryName,
                division,
                abbreviation: categoryName.slice(0, 4).toUpperCase(),
                tagline: `Your Gateway to a Stable and Rewarding Government Career in ${stateName || categoryName}`,
                badges: [
                  'Multiple Job Opportunities',
                  stateName ? `${stateName} Recruitment` : 'All India Recruitment',
                  'Graduate & 10+2 Level Exams',
                  'Stable Career & Growth',
                ],
                about_text: `The ${stateName ? `${stateName} ` : ''}${categoryName} recruitment portal provides comprehensive study materials, official notifications, previous year question papers, and full-length timed mock tests for competitive examination aspirants with Veer Next.`,
                exam_mode: 'Online (CBT) / Offline',
                post_level: stateName ? 'State Group A, B & C' : 'Group B & C',
                eligibility: '10+2 / Graduate',
                major_exams: categoryName,
                top_exams: [],
                related_exams: [],
                why_choose: [],
              });
            }
          }
          setLoading(false);
        }
      } catch (err) {
        console.error('Failed to load category profile:', err);
        if (isMounted) setLoading(false);
      }
    }

    fetchProfile();
    return () => {
      isMounted = false;
    };
  }, [categoryName, division, stateName]);

  // Compute all exams belonging to this category
  const allCategoryExams = useMemo(() => {
    const pool =
      levelExams && levelExams.length > 0
        ? levelExams
        : allCatalog && allCatalog.length > 0
          ? allCatalog
          : localDbExams;

    const cLow = (categoryName || profile?.category_name || '').toLowerCase().trim();
    if (!cLow) return [];

    const matched = pool.filter((e) => {
      const ec = (e.category || '').toLowerCase().trim();
      return ec === cLow;
    });

    const seenIds = new Set();
    const result = [];

    matched.forEach((m) => {
      const idKey = m.id || m.name;
      if (!seenIds.has(idKey)) {
        seenIds.add(idKey);
        result.push(m);
      }
    });

    return result;
  }, [levelExams, allCatalog, localDbExams, categoryName, profile]);

  // Hook for selected exam resources (Level 2 & 3)
  const examTargetId = selectedExam?.id || selectedExam?.examId;
  const {
    byCategory,
    quizzes,
    intro,
    completedResourceIds,
    markAsCompleted,
    loading: contentLoading,
    error: contentError,
  } = useExamContent(selectedExam?.name, selectedExam?.careerTrack, examTargetId);

  const guideItems = byCategory?.Guide || [];
  const precisItems = byCategory?.Precis || [];
  const pyqItems = byCategory?.PYQ || [];
  const introCount = intro ? 1 : 0;
  const mockCount = quizzes?.length || 0;

  // Default to guide tab if exam has no intro but has guidebooks
  useEffect(() => {
    if (selectedExam && !contentLoading) {
      if (!intro && guideItems.length > 0 && activeResourceTab === 'intro') {
        setActiveResourceTab('guide');
      }
    }
  }, [selectedExam, intro, guideItems.length, contentLoading]);

  // Fetch jobs matched to selectedExam from jobs_v2
  useEffect(() => {
    if (!selectedExam) {
      setExamJobs([]);
      return;
    }
    let isMounted = true;
    async function loadJobs() {
      setJobsLoading(true);
      try {
        const allJobs = await getJobsV2Cached();
        if (isMounted) {
          const matched = matchJobsForExam(allJobs, selectedExam);
          setExamJobs(matched);
        }
      } catch (err) {
        console.warn('Jobs_v2 load error:', err);
      } finally {
        if (isMounted) setJobsLoading(false);
      }
    }
    loadJobs();
    return () => { isMounted = false; };
  }, [selectedExam]);

  // Search filter for all exams
  const filteredAllExams = useMemo(() => {
    if (!examSearch.trim()) return allCategoryExams;
    const q = examSearch.toLowerCase().trim();
    return allCategoryExams.filter((e) => {
      const n = (e.name || '').toLowerCase();
      const c = (e.category || '').toLowerCase();
      const b = (e.conducting_body?.name || '').toLowerCase();
      const r = (e.region?.name || '').toLowerCase();
      return n.includes(q) || c.includes(q) || b.includes(q) || r.includes(q);
    });
  }, [allCategoryExams, examSearch]);

  const handleSearchChange = (e) => {
    setExamSearch(e.target.value);
    setCurrentPage(1);
  };

  const totalPages = Math.max(1, Math.ceil(filteredAllExams.length / EXAMS_PER_PAGE));
  const paginatedExams = useMemo(() => {
    const start = (currentPage - 1) * EXAMS_PER_PAGE;
    return filteredAllExams.slice(start, start + EXAMS_PER_PAGE);
  }, [filteredAllExams, currentPage]);

  const startIndex = filteredAllExams.length > 0 ? (currentPage - 1) * EXAMS_PER_PAGE + 1 : 0;
  const endIndex = Math.min(currentPage * EXAMS_PER_PAGE, filteredAllExams.length);

  const pageNumbers = useMemo(() => {
    if (totalPages <= 5) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    const pages = [];
    pages.push(1);
    if (currentPage > 3) pages.push('...');
    for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
      pages.push(i);
    }
    if (currentPage < totalPages - 2) pages.push('...');
    pages.push(totalPages);
    return pages;
  }, [currentPage, totalPages]);

  if (loading || !profile) {
    return (
      <div className="cep-loading-skeleton" aria-live="polite">
        <div className="cep-skeleton-hero" />
        <div className="cep-skeleton-grid">
          <div className="cep-skeleton-card" />
          <div className="cep-skeleton-card" />
          <div className="cep-skeleton-card" />
          <div className="cep-skeleton-card" />
          <div className="cep-skeleton-card" />
        </div>
      </div>
    );
  }

  // Level 1: Top & Related fallback lists
  const topExams =
    allCategoryExams.length > 0
      ? allCategoryExams.slice(0, 5).map((e) => ({
          title: e.name,
          subtitle: e.conducting_body?.name || e.category || 'Commission',
          examId: e.id,
        }))
      : Array.isArray(profile.top_exams) && profile.top_exams.length > 0
        ? profile.top_exams
        : [
            { title: `${profile.category_name} Exam`, subtitle: 'Competitive Examination', examId: '' },
          ];

  const relatedExams =
    allCategoryExams.slice(5, 11).length > 0
      ? allCategoryExams.slice(5, 11).map((e) => ({
          title: e.name,
          badge: e.category || 'Competitive Exam',
          examId: e.id,
        }))
      : Array.isArray(profile.related_exams) && profile.related_exams.length > 0
        ? profile.related_exams
        : allCategoryExams.slice(0, 6).map((e) => ({
            title: e.name,
            badge: e.category || 'Competitive Exam',
            examId: e.id,
          }));

  const whyChooseList = [
    {
      title: 'Expert-Curated Study Material',
      desc: 'Updated as per latest syllabus',
      icon: Compass,
      color: 'green',
    },
    {
      title: 'Preci for Quick Revision',
      desc: 'Short and precise notes',
      icon: FileText,
      color: 'blue',
    },
    {
      title: 'Practice & Evaluation',
      desc: 'Topic-wise and full-length mock tests',
      icon: Target,
      color: 'indigo',
    },
    {
      title: 'Mentorship & Support',
      desc: 'Learn from experts and get guidance at every step',
      icon: Users,
      color: 'purple',
    },
  ];

  // Continue Prep button handler: transitions to Level 2
  const handleContinuePrep = (exam) => {
    setSelectedExam(exam);
    setActiveReadingResource(null);
    setActiveResourceTab('intro');
  };

  // Open Introduction handler: transitions to Level 3
  const handleIntroCardClick = () => {
    if (intro?.source === 'auto' && intro.resource) {
      setActiveReadingResource(intro.resource);
    } else if (intro?.source === 'manual') {
      setActiveReadingResource({
        isManual: true,
        title: intro.title || `${selectedExam.name} - Introduction & Syllabus`,
        body: intro.body,
        category: 'Intro',
      });
    } else {
      setActiveReadingResource({
        isManual: true,
        title: `${selectedExam.name} - Official Syllabus & Examination Guide`,
        body: `
          <div style="font-size: 15px; line-height: 1.8;">
            <p><strong>Conducting Body:</strong> ${selectedExam.conducting_body?.name || selectedExam.conductingBody || 'Government Selection Board'}</p>
            <p><strong>Category:</strong> ${selectedExam.category || profile?.category_name || 'Competitive Examination'}</p>
            <p><strong>Recruitment Level:</strong> ${selectedExam.region?.level || selectedExam.level || 'Central / State'}</p>
            <hr style="margin: 20px 0; border: none; border-top: 1px solid #e2e8f0;" />
            <h3 style="color: #065f46; font-size: 19px; margin-bottom: 8px;">Examination Overview</h3>
            <p>${selectedExam.description || profile?.about_text || 'Comprehensive exam preparation syllabus provided by Veer Next.'}</p>
            <h3 style="color: #065f46; font-size: 19px; margin-top: 24px; margin-bottom: 8px;">Selection Process & Pattern</h3>
            <p>The recruitment process comprises multi-stage evaluations including Computer-Based Written Tests (CBT), skill assessments, and document verification. Structured module notes and previous year papers are compiled below.</p>
            <h3 style="color: #065f46; font-size: 19px; margin-top: 24px; margin-bottom: 8px;">Recommended Preparation Strategy</h3>
            <p>1. Complete the core topic chapters in the Guidebooks.<br/>2. Revise key formulae and summary points via Préci.<br/>3. Benchmark timing using full-length Mock Tests.</p>
          </div>
        `,
        category: 'Intro',
      });
    }
  };

  const displayMajorExams =
    profile.category_name === 'SSC' && (!profile.major_exams || profile.major_exams.includes('SSC, SSC'))
      ? 'CGL, CHSL, MTS, CPO, GD, JE, etc.'
      : profile.major_exams && profile.major_exams !== profile.category_name
        ? profile.major_exams
        : allCategoryExams.length > 0
          ? allCategoryExams.slice(0, 4).map((e) => e.name).join(', ')
          : profile.category_name;

  const displayTagline = profile.tagline
    ? profile.tagline.replace(/\s+in\s+([A-Za-z\s&]+)$/i, '').trim() || profile.tagline
    : 'Your Gateway to a Stable and Rewarding Government Career';

  // ══════════════════════════════════════════════════════════════════════════
  // LEVEL 3: IN-PLACE BOOK / READER INTERFACE
  // ══════════════════════════════════════════════════════════════════════════
  if (activeReadingResource && selectedExam) {
    return (
      <div className="cep-container">
        {/* Breadcrumb Navigation */}
        <nav className="cep-breadcrumbs" aria-label="Breadcrumb">
          <span className="cep-bc-link" onClick={() => { setSelectedExam(null); setActiveReadingResource(null); }}>
            {profile.category_name}
          </span>
          <ChevronRight size={13} className="cep-bc-sep" />
          <span className="cep-bc-link" onClick={() => setActiveReadingResource(null)}>
            {selectedExam.name}
          </span>
          <ChevronRight size={13} className="cep-bc-sep" />
          <span className="cep-bc-current">{activeReadingResource.title || 'Book Reader'}</span>
        </nav>

        <section className="cep-in-place-reader-section">
          <div className="cep-reader-top-bar">
            <button
              type="button"
              className="cep-back-to-exam-btn"
              onClick={() => setActiveReadingResource(null)}
            >
              <ArrowLeft size={16} />
              <span>Back to {selectedExam.name} Overview</span>
            </button>
            <div className="cep-reader-title-badge">
              <BookOpen size={17} style={{ color: '#065f46' }} />
              <span style={{ fontWeight: 700, color: '#0f172a' }}>
                {activeReadingResource.title || 'Study Material'}
              </span>
              <span className="cep-reader-cat-pill">
                {activeReadingResource.category || 'Guide'}
              </span>
            </div>
          </div>

          <div className="cep-reader-frame">
            {activeReadingResource.isManual ? (
              <ReaderThemeProvider
                category={activeReadingResource.category || 'Intro'}
                className="reader-container animate-fade-in reader-container-embedded"
              >
                <div className="reader-body-root cep-manual-reader-body">
                  <div className="cep-manual-reader-header">
                    <h2 className="cep-manual-title">{activeReadingResource.title}</h2>
                    <div className="cep-manual-meta">
                      <span>{selectedExam.name}</span>
                      <span>•</span>
                      <span>Official Veer Next Guidebook</span>
                    </div>
                  </div>
                  <div
                    className="intro-manual-body cep-manual-content"
                    dangerouslySetInnerHTML={{ __html: activeReadingResource.body }}
                  />
                </div>
              </ReaderThemeProvider>
            ) : (
              <SecureReader
                resourceId={activeReadingResource.resource_id}
                isEmbedded={true}
                onBack={() => setActiveReadingResource(null)}
              />
            )}
          </div>
        </section>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // LEVEL 2: SELECTED EXAM PREVIEW & HUB (5 CARDS + RESOURCES + JOBS)
  // ══════════════════════════════════════════════════════════════════════════
  if (selectedExam) {
    const conductingName = selectedExam.conducting_body?.name || selectedExam.conductingBody || 'Staff Selection Commission';
    const regionName = selectedExam.region?.name || selectedExam.regionLevel || selectedExam.level || 'Central';

    return (
      <div className="cep-container">
        {/* Breadcrumb Navigation */}
        <nav className="cep-breadcrumbs" aria-label="Breadcrumb">
          <span className="cep-bc-link" onClick={() => setSelectedExam(null)}>
            Home
          </span>
          <ChevronRight size={13} className="cep-bc-sep" />
          <span className="cep-bc-link" onClick={() => setSelectedExam(null)}>
            {profile.category_name}
          </span>
          <ChevronRight size={13} className="cep-bc-sep" />
          <span className="cep-bc-current">{selectedExam.name}</span>
        </nav>

        <section className="cep-exam-hub-card">
          {/* Top Bar with Back Link */}
          <div className="cep-exam-hub-topbar">
            <div className="cep-exam-hub-crumbs">
              <button
                type="button"
                className="cep-exam-back-btn"
                onClick={() => {
                  setSelectedExam(null);
                  if (!showAllExams) onSetSidebarCollapsed?.(false);
                }}
              >
                <ArrowLeft size={14} />
                <span>Back to {showAllExams ? `All ${profile.category_name} Exams` : `${profile.category_name} Overview`}</span>
              </button>
              <span className="cep-crumb-pipe">|</span>
              <span className="cep-crumb-trail">{profile.category_name}</span>
              <ChevronRight size={13} className="cep-bc-sep" />
              <span className="cep-crumb-active">{selectedExam.name}</span>
            </div>
          </div>

          {/* Exam Hero Showcase Banner */}
          <div className="cep-exam-showcase-banner">
            <div className="cep-exam-showcase-left-wrap">
              <div className="cep-exam-thumb-holder">
                <ExamThumbnail
                  label={selectedExam.name}
                  conductingBodyName={conductingName}
                  thumbnailSubject={selectedExam.thumbnailSubject}
                  accentColor={selectedExam.accentColor}
                  categoryName={selectedExam.category || profile.category_name}
                  level={selectedExam.region?.level || selectedExam.level}
                  size="lg"
                />
              </div>

              <div className="cep-exam-showcase-main">
                <div className="cep-exam-showcase-title-row">
                  <h2 className="cep-exam-showcase-title">{selectedExam.name}</h2>
                  <span className="cep-exam-primary-pill">
                    <Target size={13} /> Active Preparation
                  </span>
                </div>

                <div className="cep-exam-meta-pills-row">
                  {conductingName && (
                    <span className="cep-meta-pill-item">
                      <Landmark size={14} />
                      <span>{conductingName}</span>
                    </span>
                  )}
                  {regionName && (
                    <span className="cep-meta-pill-item">
                      <MapPin size={14} />
                      <span style={{ textTransform: 'capitalize' }}>{regionName}</span>
                    </span>
                  )}
                  <span className="cep-meta-pill-item">
                    <GraduationCap size={14} />
                    <span>{selectedExam.category || profile.category_name}</span>
                  </span>
                </div>

                <p className="cep-exam-showcase-desc">
                  {selectedExam.description ||
                    `Comprehensive preparation curriculum for ${selectedExam.name}. Master core subjects, practice previous year papers and evaluate preparedness with timed mocks.`}
                </p>
              </div>
            </div>

            {/* Right side visual: same image and gradient fade style as category hero card */}
            <div className="cep-exam-banner-visual-wrap">
              {profile?.hero_image_url ? (
                <div className="cep-hero-image-box">
                  <img
                    src={profile.hero_image_url}
                    alt={`${selectedExam.name} Preparation`}
                    className="cep-hero-img"
                    loading="eager"
                  />
                  <div className="cep-hero-gradient-overlay" />
                  <div className="cep-hero-script-overlay">
                    <span className="cep-script-line">Prepare</span>
                    <span className="cep-script-line">Practice</span>
                    <span className="cep-script-line">Progress</span>
                    <span className="cep-script-brand">with Veer Next</span>
                  </div>
                </div>
              ) : (
                <div className="cep-hero-placeholder-box">
                  <div className="cep-hero-ph-emblem">
                    <Shield size={64} className="cep-ph-shield" />
                  </div>
                  <div className="cep-hero-script-overlay">
                    <span className="cep-script-line">Prepare</span>
                    <span className="cep-script-line">Practice</span>
                    <span className="cep-script-line">Progress</span>
                    <span className="cep-script-brand">with Veer Next</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── The 5 Action Cards Row (Visual Showcase with Real Working Links) ── */}
          <div className="cep-actions-grid" aria-label="Exam Preparation Modules">
            {/* 1. Introduction -> Opens Book Reader */}
            <div
              className={`cep-action-card cep-card-peach cep-action-card-clickable ${activeResourceTab === 'intro' ? 'cep-action-card-active' : ''}`}
              onClick={handleIntroCardClick}
              role="button"
              tabIndex={0}
            >
              <div className="cep-action-icon-wrap icon-peach">
                <BookOpen size={26} strokeWidth={2.2} />
              </div>
              <h3 className="cep-action-title">Introduction</h3>
              <p className="cep-action-desc">
                Exam overview, posts, eligibility, pattern and important dates
              </p>
              <span className="cep-action-card-badge badge-peach">
                {introCount > 0 ? '1 Comprehensive Guide' : 'Read Overview'}
              </span>
              <div className="cep-action-arrow-circle btn-peach" aria-hidden="true">
                <ArrowRight size={15} strokeWidth={2.5} />
              </div>
            </div>

            {/* 2. Guidebooks -> Filters / Scrolls to Study Books */}
            <div
              className={`cep-action-card cep-card-mint cep-action-card-clickable ${activeResourceTab === 'guide' ? 'cep-action-card-active' : ''}`}
              onClick={() => setActiveResourceTab('guide')}
              role="button"
              tabIndex={0}
            >
              <div className="cep-action-icon-wrap icon-mint">
                <Layers size={26} strokeWidth={2.2} />
              </div>
              <h3 className="cep-action-title">Guidebooks</h3>
              <p className="cep-action-desc">
                Complete study material as per latest syllabus
              </p>
              <span className="cep-action-card-badge badge-mint">
                {guideItems.length} Study Books
              </span>
              <div className="cep-action-arrow-circle btn-mint" aria-hidden="true">
                <ArrowRight size={15} strokeWidth={2.5} />
              </div>
            </div>

            {/* 3. Preci -> Filters / Scrolls to Revision Notes */}
            <div
              className={`cep-action-card cep-card-rose cep-action-card-clickable ${activeResourceTab === 'precis' ? 'cep-action-card-active' : ''}`}
              onClick={() => setActiveResourceTab('precis')}
              role="button"
              tabIndex={0}
            >
              <div className="cep-action-icon-wrap icon-rose">
                <Target size={26} strokeWidth={2.2} />
              </div>
              <h3 className="cep-action-title">Preci</h3>
              <p className="cep-action-desc">
                Topic-wise concise notes for quick revision
              </p>
              <span className="cep-action-card-badge badge-rose">
                {precisItems.length} Revision Notes
              </span>
              <div className="cep-action-arrow-circle btn-rose" aria-hidden="true">
                <ArrowRight size={15} strokeWidth={2.5} />
              </div>
            </div>

            {/* 4. PYQs -> Links to PYQ Center */}
            <div
              className={`cep-action-card cep-card-sky cep-action-card-clickable ${activeResourceTab === 'pyq' ? 'cep-action-card-active' : ''}`}
              onClick={() => navigate(`/pyq-center?exam=${examTargetId}`)}
              role="button"
              tabIndex={0}
            >
              <div className="cep-action-icon-wrap icon-sky">
                <FileText size={26} strokeWidth={2.2} />
              </div>
              <h3 className="cep-action-title">Previous Year Papers (PYQs)</h3>
              <p className="cep-action-desc">
                Year-wise papers with detailed solutions
              </p>
              <span className="cep-action-card-badge badge-sky">
                {pyqItems.length > 0 ? `${pyqItems.length} Papers` : 'Solved PYQs'}
              </span>
              <div className="cep-action-arrow-circle btn-sky" aria-hidden="true">
                <ArrowRight size={15} strokeWidth={2.5} />
              </div>
            </div>

            {/* 5. Mock Tests & Quizzes -> Links to Quiz Center */}
            <div
              className={`cep-action-card cep-card-lavender cep-action-card-clickable ${activeResourceTab === 'mock' ? 'cep-action-card-active' : ''}`}
              onClick={() => navigate(`/quiz-center?exam=${examTargetId}`)}
              role="button"
              tabIndex={0}
            >
              <div className="cep-action-icon-wrap icon-lavender">
                <CheckCircle2 size={26} strokeWidth={2.2} />
              </div>
              <h3 className="cep-action-title">Mock Tests & Quizzes</h3>
              <p className="cep-action-desc">
                Topic-wise, section-wise and full-length tests
              </p>
              <span className="cep-action-card-badge badge-lavender">
                {mockCount > 0 ? `${mockCount} Tests` : 'Timed Mocks'}
              </span>
              <div className="cep-action-arrow-circle btn-lavender" aria-hidden="true">
                <ArrowRight size={15} strokeWidth={2.5} />
              </div>
            </div>
          </div>

          {/* ── Study Materials Showcase Grid (with authentic book cover thumbnails) ── */}
          <div className="cep-materials-section">
            <div className="cep-materials-header">
              <div className="cep-materials-title-row">
                <span className="cep-header-bar green-bar" />
                <h4 className="cep-materials-title">
                  Study Materials for {selectedExam.name}
                </h4>
              </div>

              <div className="cep-materials-tabs-row">
                <button
                  type="button"
                  className={`cep-material-tab-btn ${activeResourceTab === 'intro' ? 'active' : ''}`}
                  onClick={() => setActiveResourceTab('intro')}
                >
                  Introduction ({introCount})
                </button>
                <button
                  type="button"
                  className={`cep-material-tab-btn ${activeResourceTab === 'guide' ? 'active' : ''}`}
                  onClick={() => setActiveResourceTab('guide')}
                >
                  Guidebooks ({guideItems.length})
                </button>
                <button
                  type="button"
                  className={`cep-material-tab-btn ${activeResourceTab === 'precis' ? 'active' : ''}`}
                  onClick={() => setActiveResourceTab('precis')}
                >
                  Préci ({precisItems.length})
                </button>
              </div>
            </div>

            {contentLoading ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '24px 0', color: '#64748b' }}>
                <RefreshCw size={18} className="animate-spin" />
                <span>Loading examination study materials…</span>
              </div>
            ) : (
              <div className="cep-materials-grid">
                {/* 1. Introduction Tile */}
                {activeResourceTab === 'intro' && (
                  intro ? (
                    intro.source === 'auto' ? (
                      <ResourceTile
                        key="intro-auto"
                        resource={intro.resource}
                        examName={selectedExam.name}
                        locked={isResourceLockedForUser(effectiveTier, 'Intro')}
                        isCompleted={completedResourceIds?.has(intro.resource?.resource_id)}
                        onToggleComplete={(id, comp) => markAsCompleted?.(id, null, comp)}
                        onOpenResource={(r) => setActiveReadingResource(r)}
                      />
                    ) : (
                      <IntroManualTile
                        key="intro-manual"
                        intro={intro}
                        locked={isResourceLockedForUser(effectiveTier, 'Intro')}
                        onOpen={(i) => {
                          setActiveReadingResource({
                            isManual: true,
                            title: i.title || `${selectedExam.name} - Introduction`,
                            body: i.body || '',
                            category: 'Intro',
                          });
                        }}
                      />
                    )
                  ) : (
                    <div className="cep-materials-empty" style={{ gridColumn: '1 / -1' }}>
                      <BookOpen size={28} style={{ color: '#059669', marginBottom: '8px' }} />
                      <p style={{ fontWeight: 600, color: '#0f172a', margin: '0 0 4px' }}>
                        Introduction guide is being prepared
                      </p>
                      <p style={{ color: '#64748b', fontSize: '12.5px', margin: 0 }}>
                        Check out the Guidebooks and Préci tabs for available study material.
                      </p>
                    </div>
                  )
                )}

                {/* 2. Guidebook Tiles */}
                {activeResourceTab === 'guide' && (
                  guideItems.length > 0 ? (
                    guideItems.map((res) => (
                      <ResourceTile
                        key={res.id || res.resource_id}
                        resource={res}
                        examName={selectedExam.name}
                        locked={isResourceLockedForUser(effectiveTier, 'Guide')}
                        isCompleted={completedResourceIds?.has(res.resource_id)}
                        onToggleComplete={(id, comp) => markAsCompleted?.(id, null, comp)}
                        onOpenResource={(r) => setActiveReadingResource(r)}
                      />
                    ))
                  ) : (
                    <div className="cep-materials-empty" style={{ gridColumn: '1 / -1' }}>
                      <Layers size={28} style={{ color: '#059669', marginBottom: '8px' }} />
                      <p style={{ fontWeight: 600, color: '#0f172a', margin: '0 0 4px' }}>
                        No guidebooks available yet
                      </p>
                      <p style={{ color: '#64748b', fontSize: '12.5px', margin: 0 }}>
                        Study books for this examination are being uploaded soon.
                      </p>
                    </div>
                  )
                )}

                {/* 3. Preci Tiles */}
                {activeResourceTab === 'precis' && (
                  precisItems.length > 0 ? (
                    precisItems.map((res) => (
                      <ResourceTile
                        key={res.id || res.resource_id}
                        resource={res}
                        examName={selectedExam.name}
                        locked={isResourceLockedForUser(effectiveTier, 'Precis')}
                        isCompleted={completedResourceIds?.has(res.resource_id)}
                        onToggleComplete={(id, comp) => markAsCompleted?.(id, null, comp)}
                        onOpenResource={(r) => setActiveReadingResource(r)}
                      />
                    ))
                  ) : (
                    <div className="cep-materials-empty" style={{ gridColumn: '1 / -1' }}>
                      <Target size={28} style={{ color: '#059669', marginBottom: '8px' }} />
                      <p style={{ fontWeight: 600, color: '#0f172a', margin: '0 0 4px' }}>
                        No précis revision notes available yet
                      </p>
                      <p style={{ color: '#64748b', fontSize: '12.5px', margin: 0 }}>
                        Concise summary notes for this examination are being prepared.
                      </p>
                    </div>
                  )
                )}
              </div>
            )}
          </div>

          {/* ── Jobs Based on This Exam Section ── */}
          <div className="cep-exam-jobs-container">
            <div className="cep-jobs-head">
              <div className="cep-jobs-head-left">
                <div className="cep-jobs-icon-badge">
                  <Briefcase size={20} />
                </div>
                <div>
                  <h4 className="cep-jobs-title">
                    Jobs Based on {selectedExam.name}
                  </h4>
                  <p className="cep-jobs-sub">
                    Direct employment opportunities & recruitment vacancies linked to this qualification
                  </p>
                </div>
              </div>
              <span className="cep-jobs-count-tag">
                {examJobs.length} {examJobs.length === 1 ? 'Opportunity Found' : 'Opportunities Found'}
              </span>
            </div>

            {jobsLoading ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '24px 0', color: '#64748b' }}>
                <RefreshCw size={18} className="animate-spin" />
                <span>Searching active recruitment openings…</span>
              </div>
            ) : examJobs.length > 0 ? (
              <div className="cep-jobs-grid">
                {examJobs.map((job, idx) => {
                  const jobCompany = job.body || job.conducting_body || job.raw_json?.conducting_body || conductingName || 'Government Department';
                  const rawDate = job.last_date || job.lastDate || job.published_on || job.publishedOn;
                  const isLastDate = Boolean(job.last_date || job.lastDate);
                  const dateStr = rawDate
                    ? `${isLastDate ? 'Last Date: ' : ''}${new Date(rawDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`
                    : 'Active Recruitment';

                  const cleanTags = Array.isArray(job.tags)
                    ? job.tags.filter(t => !['government_job', 'no_exam_job'].includes(t))
                    : [];

                  return (
                    <div key={job.id || job.job_id || idx} className="cep-job-card">
                      <div className="cep-job-card-top">
                        <div>
                          <h5 className="cep-job-card-title">{job.title}</h5>
                          <div className="cep-job-card-dept">{jobCompany}</div>
                        </div>
                      </div>

                      <div className="cep-job-card-tags">
                        {job.vacancies && (
                          <span className="cep-job-tag cep-job-tag-vacancies" style={{ background: '#ecfdf5', color: '#065f46', fontWeight: 700 }}>
                            {job.vacancies} {typeof job.vacancies === 'number' ? 'Posts' : ''}
                          </span>
                        )}
                        {(job.careerTrack || job.career_track) && (
                          <span className="cep-job-tag cep-job-tag-track" style={{ background: '#eff6ff', color: '#1d4ed8', fontWeight: 600 }}>
                            {String(job.careerTrack || job.career_track).replace(/_/g, ' ')}
                          </span>
                        )}
                        {cleanTags.slice(0, 3).map((tag, tidx) => (
                          <span key={tidx} className="cep-job-tag">
                            #{tag.replace(/_job$/, '').replace(/_/g, ' ')}
                          </span>
                        ))}
                        {cleanTags.length === 0 && (
                          <>
                            <span className="cep-job-tag">{job.category || 'Central Govt'}</span>
                            <span className="cep-job-tag">{job.state || regionName || 'All India'}</span>
                          </>
                        )}
                      </div>

                      <div className="cep-job-card-footer">
                        <span className="cep-job-date">
                          <Calendar size={13} />
                          {dateStr}
                        </span>
                        <a
                          href={job.url || job.apply_link || '/jobs'}
                          target={job.url ? '_blank' : '_self'}
                          rel="noreferrer"
                          className="cep-job-apply-btn"
                        >
                          <span>Apply / Details</span>
                          <ArrowUpRight size={13} />
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="cep-jobs-empty">
                <Briefcase size={32} style={{ color: '#059669', marginBottom: '8px' }} />
                <p style={{ fontWeight: 600, color: '#0f172a', margin: '0 0 4px' }}>
                  No active recruitment notifications for {selectedExam.name} right now.
                </p>
                <p style={{ color: '#64748b', fontSize: '12.5px', margin: '0 0 14px' }}>
                  New notices are aggregated regularly. You can also browse the full Jobs board.
                </p>
                <button
                  type="button"
                  className="cep-detailed-info-btn"
                  onClick={() => navigate('/jobs')}
                >
                  <span>Browse All Jobs</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            )}
          </div>
        </section>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // LEVEL 1: DEFAULT CATEGORY PORTAL & ALL EXAMINATIONS LIST
  // ══════════════════════════════════════════════════════════════════════════
  return (
    <div className="cep-container" aria-label={`${profile.category_name} Exam Preparation Portal`}>
      {/* ── Breadcrumb Bar ── */}
      <nav className="cep-breadcrumbs" aria-label="Breadcrumb">
        <span className="cep-bc-link">Home</span>
        <ChevronRight size={13} className="cep-bc-sep" />
        <span className="cep-bc-link">Exams</span>
        <ChevronRight size={13} className="cep-bc-sep" />
        {stateName && (
          <>
            <span className="cep-bc-link">{stateName}</span>
            <ChevronRight size={13} className="cep-bc-sep" />
          </>
        )}
        <span className="cep-bc-current">{profile.category_name}</span>
      </nav>

      {/* ── Hero Banner Section (Clean White Card + Building Photo Seamless Blend) ── */}
      <section className="cep-hero-card">
        <div className="cep-hero-content">
          <div className="cep-hero-title-row">
            <h1 className="cep-hero-abbr">{profile.category_name}</h1>
          </div>
          <h2 className="cep-hero-fullname">
            {profile.full_name || (stateName ? `${stateName} ` : '') + profile.category_name}
          </h2>
          <p className="cep-hero-tagline">{displayTagline}</p>

          <div className="cep-hero-badges-row">
            {(profile.badges || [
              'Multiple Job Opportunities',
              'All India Recruitment',
              'Graduate & 10+2 Level Exams',
              'Stable Career & Growth',
            ]).map((badge, idx) => (
              <span key={idx} className="cep-hero-badge-pill">
                {idx === 0 && <Users size={15} className="cep-badge-icon badge-orange" />}
                {idx === 1 && <BarChart3 size={15} className="cep-badge-icon badge-yellow" />}
                {idx === 2 && <ShieldCheck size={15} className="cep-badge-icon badge-amber" />}
                {idx === 3 && <Trophy size={15} className="cep-badge-icon badge-gold" />}
                <span>{badge}</span>
              </span>
            ))}
          </div>
        </div>

        {/* Hero Banner Visual with smooth gradient blend */}
        <div className="cep-hero-visual-wrap">
          {profile.hero_image_url ? (
            <div className="cep-hero-image-box">
              <img
                src={profile.hero_image_url}
                alt={`${profile.category_name} Headquarters`}
                className="cep-hero-img"
                loading="eager"
              />
              <div className="cep-hero-gradient-overlay" />
              <div className="cep-hero-script-overlay">
                <span className="cep-script-line">Prepare</span>
                <span className="cep-script-line">Practice</span>
                <span className="cep-script-line">Progress</span>
                <span className="cep-script-brand">with Veer Next</span>
              </div>
            </div>
          ) : (
            <div className="cep-hero-placeholder-box">
              <div className="cep-hero-ph-emblem">
                <Shield size={64} className="cep-ph-shield" />
              </div>
              <div className="cep-hero-script-overlay">
                <span className="cep-script-line">Prepare</span>
                <span className="cep-script-line">Practice</span>
                <span className="cep-script-line">Progress</span>
                <span className="cep-script-brand">with Veer Next</span>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ── 5 Quick Action Cards Row (Visual Showcase matching Reference Image) ── */}
      <section className="cep-actions-grid" aria-label="Exam Preparation Modules">
        {/* 1. Introduction */}
        <div
          className="cep-action-card cep-card-peach cep-action-card-clickable"
          onClick={() => {
            if (topExams[0]?.examId) {
              handleContinuePrep(topExams[0]);
            } else {
              handleViewAllExams();
            }
          }}
        >
          <div className="cep-action-icon-wrap icon-peach">
            <BookOpen size={26} strokeWidth={2.2} />
          </div>
          <h3 className="cep-action-title">Introduction</h3>
          <p className="cep-action-desc">
            Exam overview, posts, eligibility, pattern and important dates
          </p>
          <div className="cep-action-arrow-circle btn-peach" aria-hidden="true">
            <ArrowRight size={15} strokeWidth={2.5} />
          </div>
        </div>

        {/* 2. Guidebooks */}
        <div
          className="cep-action-card cep-card-mint cep-action-card-clickable"
          onClick={handleViewAllExams}
        >
          <div className="cep-action-icon-wrap icon-mint">
            <Layers size={26} strokeWidth={2.2} />
          </div>
          <h3 className="cep-action-title">Guidebooks</h3>
          <p className="cep-action-desc">
            Complete study material as per latest syllabus
          </p>
          <div className="cep-action-arrow-circle btn-mint" aria-hidden="true">
            <ArrowRight size={15} strokeWidth={2.5} />
          </div>
        </div>

        {/* 3. Préci */}
        <div
          className="cep-action-card cep-card-rose cep-action-card-clickable"
          onClick={handleViewAllExams}
        >
          <div className="cep-action-icon-wrap icon-rose">
            <Target size={26} strokeWidth={2.2} />
          </div>
          <h3 className="cep-action-title">Preci</h3>
          <p className="cep-action-desc">
            Topic-wise concise notes for quick revision
          </p>
          <div className="cep-action-arrow-circle btn-rose" aria-hidden="true">
            <ArrowRight size={15} strokeWidth={2.5} />
          </div>
        </div>

        {/* 4. PYQs */}
        <div
          className="cep-action-card cep-card-sky cep-action-card-clickable"
          onClick={() => navigate('/pyq-center')}
        >
          <div className="cep-action-icon-wrap icon-sky">
            <FileText size={26} strokeWidth={2.2} />
          </div>
          <h3 className="cep-action-title">Previous Year Papers (PYQs)</h3>
          <p className="cep-action-desc">
            Year-wise papers with detailed solutions
          </p>
          <div className="cep-action-arrow-circle btn-sky" aria-hidden="true">
            <ArrowRight size={15} strokeWidth={2.5} />
          </div>
        </div>

        {/* 5. Mock Tests & Quizzes */}
        <div
          className="cep-action-card cep-card-lavender cep-action-card-clickable"
          onClick={() => navigate('/quiz-center')}
        >
          <div className="cep-action-icon-wrap icon-lavender">
            <CheckCircle2 size={26} strokeWidth={2.2} />
          </div>
          <h3 className="cep-action-title">Mock Tests & Quizzes</h3>
          <p className="cep-action-desc">
            Topic-wise, section-wise and full-length tests
          </p>
          <div className="cep-action-arrow-circle btn-lavender" aria-hidden="true">
            <ArrowRight size={15} strokeWidth={2.5} />
          </div>
        </div>
      </section>

      {/* ── Conditional: Full Width All Exams View OR 3-Column Overview ── */}
      {showAllExams ? (
        <section className="cep-all-exams-card" aria-label={`All ${profile.category_name} Examinations`}>
          <div className="cep-all-exams-header">
            <div className="cep-all-exams-header-left">
              <button
                type="button"
                className="cep-back-to-overview-btn"
                onClick={handleBackToOverview}
              >
                <ArrowLeft size={14} />
                <span>Back to Overview</span>
              </button>
              <div className="cep-all-exams-title-row">
                <span className="cep-header-bar green-bar" />
                <h3 className="cep-col-title">All {profile.category_name} Examinations</h3>
                <span className="cep-all-exams-count-badge">
                  {allCategoryExams.length} {allCategoryExams.length === 1 ? 'Exam' : 'Exams'}
                </span>
              </div>
            </div>

            <div className="cep-all-exams-header-right">
              <div className="cep-all-exams-search-box">
                <Search size={15} className="cep-search-icon" />
                <input
                  type="text"
                  placeholder={`Search ${profile.category_name} exams...`}
                  value={examSearch}
                  onChange={(e) => setExamSearch(e.target.value)}
                  className="cep-search-input"
                />
                {examSearch && (
                  <button
                    type="button"
                    className="cep-search-clear-btn"
                    onClick={() => setExamSearch('')}
                    aria-label="Clear search"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>
            </div>
          </div>

          {filteredAllExams.length > 0 ? (
            <>
              <div className="cep-exams-card-grid">
                {paginatedExams.map((exam, idx) => {
                  const cardData = getExamRichCardData(exam, profile.category_name, division);
                  return (
                    <div
                      key={exam.id || exam.examId || idx}
                      className="cep-exam-card"
                      onClick={() => handleContinuePrep(exam)}
                      role="button"
                      tabIndex={0}
                    >
                      <div className="cep-card-header-row">
                        <div className={`cep-card-icon-badge cep-badge-${cardData.theme}`}>
                          {renderCardIcon(cardData.iconName)}
                        </div>
                        <div className="cep-card-title-box">
                          <h4 className="cep-card-title">{cardData.displayTitle}</h4>
                          <p className="cep-card-desc">{cardData.description}</p>

                          <div className="cep-card-pills-row">
                            <span className={`cep-pill ${cardData.qualTheme}`}>
                              {renderQualIcon(cardData.qualIcon)}
                              <span>{cardData.qualText}</span>
                            </span>
                            <span className="cep-pill cep-pill-level">
                              <Landmark size={12} strokeWidth={2.2} />
                              <span>{cardData.levelText}</span>
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="cep-card-footer-row">
                        <div className="cep-card-meta-left">
                          <div className="cep-meta-item">
                            <Users size={13} className="cep-meta-icon" />
                            <span>{cardData.postText}</span>
                          </div>
                          <span className="cep-meta-divider">|</span>
                          <div className="cep-meta-item">
                            <Calendar size={13} className="cep-meta-icon" />
                            <span>{cardData.freqText}</span>
                          </div>
                        </div>

                        <button
                          type="button"
                          className="cep-card-circle-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleContinuePrep(exam);
                          }}
                          aria-label={`View ${cardData.displayTitle}`}
                        >
                          <ArrowRight size={15} strokeWidth={2.4} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="cep-pagination-bar">
                <div className="cep-pagination-info">
                  Showing {startIndex} – {endIndex} of {filteredAllExams.length} examinations
                </div>
                {totalPages > 1 && (
                  <div className="cep-pagination-controls">
                    <button
                      type="button"
                      className="cep-page-nav-btn"
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      aria-label="Previous page"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    {pageNumbers.map((p, pIdx) => {
                      if (p === '...') {
                        return (
                          <span key={`dots-${pIdx}`} className="cep-page-dots">
                            ...
                          </span>
                        );
                      }
                      return (
                        <button
                          key={p}
                          type="button"
                          className={`cep-page-num-btn ${currentPage === p ? 'active' : ''}`}
                          onClick={() => setCurrentPage(p)}
                        >
                          {p}
                        </button>
                      );
                    })}
                    <button
                      type="button"
                      className="cep-page-nav-btn"
                      disabled={currentPage === totalPages}
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      aria-label="Next page"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="cep-all-exams-empty">
              <Search size={32} className="cep-empty-icon" />
              <p className="cep-empty-title">No exams found</p>
              <p className="cep-empty-desc">
                No examinations matched &ldquo;{examSearch}&rdquo; in {profile.category_name}.
              </p>
              <button
                type="button"
                className="cep-reset-search-btn"
                onClick={() => {
                  setExamSearch('');
                  setCurrentPage(1);
                }}
              >
                Clear search filter
              </button>
            </div>
          )}
        </section>
      ) : (
        <section className="cep-details-card" aria-label={`${profile.category_name} Overview`}>
          {/* Column 1: About Category */}
          <div className="cep-about-col">
            <div className="cep-col-header">
              <span className="cep-header-bar green-bar" />
              <h3 className="cep-col-title">About {profile.category_name}</h3>
            </div>

            <p className="cep-about-text">{profile.about_text}</p>

            <div className="cep-meta-grid">
              <div className="cep-meta-cell">
                <div className="cep-meta-icon-box">
                  <Monitor size={17} />
                </div>
                <div className="cep-meta-info">
                  <span className="cep-meta-label">Exam Mode</span>
                  <span className="cep-meta-value">{profile.exam_mode || 'Online (CBT)'}</span>
                </div>
              </div>

              <div className="cep-meta-cell">
                <div className="cep-meta-icon-box">
                  <Award size={17} />
                </div>
                <div className="cep-meta-info">
                  <span className="cep-meta-label">Post Level</span>
                  <span className="cep-meta-value">{profile.post_level || 'Group B & C'}</span>
                </div>
              </div>

              <div className="cep-meta-cell">
                <div className="cep-meta-icon-box">
                  <GraduationCap size={17} />
                </div>
                <div className="cep-meta-info">
                  <span className="cep-meta-label">Eligibility</span>
                  <span className="cep-meta-value">{profile.eligibility || 'Graduate / 10+2'}</span>
                </div>
              </div>

              <div className="cep-meta-cell">
                <div className="cep-meta-icon-box">
                  <Calendar size={17} />
                </div>
                <div className="cep-meta-info">
                  <span className="cep-meta-label">Major Exams</span>
                  <span className="cep-meta-value highlight-value" title={displayMajorExams}>
                    {displayMajorExams}
                  </span>
                </div>
              </div>
            </div>

            <button
              type="button"
              className="cep-see-all-exams-btn"
              onClick={handleViewAllExams}
            >
              <span>View all {allCategoryExams.length} examinations</span>
              <ArrowRight size={15} />
            </button>
          </div>

          {/* Column 2: Top Exams */}
          <div className="cep-top-exams-col">
            <div className="cep-col-header">
              <span className="cep-header-bar green-bar" />
              <h3 className="cep-col-title">Top Exams</h3>
            </div>

            <div className="cep-exams-list">
              {topExams.map((exam, idx) => (
                <div
                  key={idx}
                  className="cep-exam-item-row"
                  onClick={() => handleContinuePrep(exam)}
                  role="button"
                  tabIndex={0}
                >
                  <div className="cep-check-icon-wrap">
                    <CheckCircle2 size={17} className="cep-check-icon" />
                  </div>
                  <div className="cep-exam-text-box">
                    <h4 className="cep-exam-row-title">{exam.title}</h4>
                    {exam.subtitle && (
                      <span className="cep-exam-row-subtitle">
                        ({exam.subtitle})
                      </span>
                    )}
                  </div>
                  <ChevronRight size={15} className="cep-row-chevron" />
                </div>
              ))}
            </div>
          </div>

          {/* Column 3: Related Exams */}
          <div className="cep-related-exams-col">
            <div className="cep-col-header">
              <span className="cep-header-bar green-bar" />
              <h3 className="cep-col-title">Related Exams</h3>
            </div>

            <div className="cep-exams-list">
              {relatedExams.map((rel, idx) => (
                <div
                  key={idx}
                  className="cep-exam-item-row"
                  onClick={() => handleContinuePrep(rel)}
                  role="button"
                  tabIndex={0}
                >
                  <div className="cep-seal-icon-wrap">
                    <div className="cep-gold-seal">
                      <Shield size={14} />
                    </div>
                  </div>
                  <div className="cep-exam-text-box">
                    <h4 className="cep-exam-row-title">{rel.title}</h4>
                    <span className="cep-exam-level-sub">
                      {rel.badge || 'Graduate Level'}
                    </span>
                  </div>
                  <ChevronRight size={15} className="cep-row-chevron" />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Bottom Section: Why Choose Veer Next ── */}
      <section className="cep-why-choose-card">
        <div className="cep-why-header">
          <div className="cep-col-header">
            <span className="cep-header-bar green-bar" />
            <h3 className="cep-col-title">Why Choose Veer Next for {profile.category_name}?</h3>
          </div>
          <p className="cep-why-subtitle">Everything you need for your preparation — at one place.</p>
        </div>

        <div className="cep-why-pillars-grid">
          {whyChooseList.map((item, idx) => {
            const IconComponent = item.icon;
            return (
              <div key={idx} className="cep-why-pillar-item">
                <div className={`cep-why-icon-bubble bubble-${item.color}`}>
                  <IconComponent size={19} />
                </div>
                <div className="cep-why-info">
                  <h4 className="cep-why-item-title">{item.title}</h4>
                  <p className="cep-why-item-desc">{item.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
