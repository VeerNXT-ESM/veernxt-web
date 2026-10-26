import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import {
  BookOpen,
  ScrollText,
  FileText,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
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
  Lightbulb,
  Filter,
  SlidersHorizontal,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import ExamThumbnail from '../pages/admin/ExamThumbnail';
import { ResourceTile, IntroManualTile } from './ExamContentPreview';
import { useExamContent } from '../hooks/useExamContent';
import SecureReader from './SecureReader';
import { ReaderThemeProvider } from './book/theme/ReaderThemeProvider';
import { normalizeReaderCategory } from './book/theme/customThemeStore';
import { getEffectiveTier, isResourceLockedForUser } from '../lib/subscriptionAccess';
import {
  getCategoryBannerImage,
  getCategoryKicker,
  getCategoryTitleParts,
} from '../lib/categoryBannerHelper';
import examCardImages from '../lib/examCardImages.json';
import './CategoryExplorerPortal.css';

// "Expanded" is the sidebar's normal resting state, except on laptop-width screens (1101-1199px)
// where it rests as the icon rail so the content keeps enough width for three columns.
const laptopRailDefault = () => typeof window !== 'undefined' && window.innerWidth > 1100 && window.innerWidth < 1200;

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
      if (res.ok) {
        const data = await res.json();
        if (data?.ok && Array.isArray(data.jobs) && data.jobs.length > 0) {
          jobsV2Cache = data.jobs;
          return jobsV2Cache;
        }
      }
    } catch {
      // Fallback silently to direct Supabase query
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
          body: (typeof job.conducting_body === 'string' ? job.conducting_body : job.conducting_body?.name) || job.raw_json?.conducting_body || 'Government Department',
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

  // 8. Photographic Banner and Motivational Quote (AI Generated on Cloudflare R2)
  let cardImage = exam.card_image_url || exam.banner_url || exam.metadata?.card_image_url || '';
  let cardQuote = exam.card_quote || exam.metadata?.card_quote || '';

  const examId = exam.exam_id || exam.id;
  if (!cardImage && examCardImages && examId && examCardImages[examId]?.url) {
    cardImage = examCardImages[examId].url;
    cardQuote = examCardImages[examId].quote;
  }

  if (!cardImage && examCardImages) {
    const keyMap = [
      { match: () => nameLower.includes('tier 2') || nameLower.includes('tier-2'), key: 'ssc-cgl-tier-2' },
      { match: () => nameLower.includes('delhi police'), key: 'delhi-police-constable' },
      { match: () => nameLower.includes('mts') || nameLower.includes('multi tasking'), key: 'ssc-mts' },
      { match: () => nameLower.includes('cgl'), key: 'ssc-cgl' },
      { match: () => nameLower.includes('gd constable') || nameLower.includes('general duty'), key: 'ssc-gd-constable' },
      { match: () => nameLower.includes('chsl'), key: 'ssc-chsl' },
      { match: () => nameLower.includes('jht') || nameLower.includes('translator'), key: 'ssc-jht' },
      { match: () => nameLower.includes('steno'), key: 'ssc-stenographer' },
      { match: () => nameLower.includes('selection post'), key: 'ssc-selection-post' },
      { match: () => nameLower.includes('cpo'), key: 'ssc-cpo' },
      { match: () => nameLower.includes('po') || nameLower.includes('probationary') || nameLower.includes('ibps'), key: 'ibps-po' },
      { match: () => nameLower.includes('civil service') || nameLower.includes('upsc') || nameLower.includes('ias') || nameLower.includes('ips'), key: 'upsc-civil-services' },
    ];

    for (const item of keyMap) {
      if (item.match()) {
        const itemData = examCardImages[item.key];
        if (itemData) {
          cardImage = itemData.url;
          cardQuote = itemData.quote;
          break;
        }
      }
    }

    if (!cardImage) {
      const cat = (categoryName || '').toLowerCase();
      if (cat.includes('bank') || cat.includes('finance')) {
        cardImage = examCardImages['ibps-po']?.url;
        cardQuote = examCardImages['ibps-po']?.quote;
      } else if (cat.includes('police') || cat.includes('defence')) {
        cardImage = examCardImages['delhi-police-constable']?.url || examCardImages['ssc-gd-constable']?.url;
        cardQuote = 'Serve Protect Build India';
      } else if (cat.includes('civil') || cat.includes('administrative')) {
        cardImage = examCardImages['upsc-civil-services']?.url;
        cardQuote = examCardImages['upsc-civil-services']?.quote;
      } else {
        cardImage = examCardImages['ssc-cgl']?.url;
        cardQuote = 'Your Next Step Higher';
      }
    }
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
    cardImage,
    cardQuote,
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

// Global per-division cache to ensure Central, State, and UT filters remain completely independent
const divisionFilterCache = {
  central: { qualFilter: 'all', sortBy: 'relevance', overviewSearch: '', overviewQualFilter: 'all', examSearch: '' },
  state: { qualFilter: 'all', sortBy: 'relevance', overviewSearch: '', overviewQualFilter: 'all', examSearch: '' },
  ut: { qualFilter: 'all', sortBy: 'relevance', overviewSearch: '', overviewQualFilter: 'all', examSearch: '' },
};

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
  globalSearch = '',
  onClearGlobalSearch,
}) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();

  // Internal navigation depth tracker so in-app back pops history
  const internalPortalDepthRef = useRef(0);

  const urlViewParam = searchParams.get('view');
  const urlExamParam = searchParams.get('exam');
  const urlResourceParam = searchParams.get('resource');
  const urlManualParam = searchParams.get('manual');

  const divKey = (division || 'central').toLowerCase();
  const cachedForDiv = divisionFilterCache[divKey] || divisionFilterCache.central;

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Phones: About / Top Exams / Related Exams / Why Choose become accordions (state is
  // ignored on larger screens, where every section is always open).
  const [isPhone, setIsPhone] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches
  );
  const [openSections, setOpenSections] = useState({ about: true, top: true, related: false, why: true });
  const [aboutExpanded, setAboutExpanded] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const onChange = () => setIsPhone(mq.matches);
    mq.addEventListener?.('change', onChange);
    return () => mq.removeEventListener?.('change', onChange);
  }, []);
  const [viewTransitioning, setViewTransitioning] = useState(false);
  const [showAllExams, setShowAllExams] = useState(urlViewParam === 'all');
  const [currentPage, setCurrentPage] = useState(1);
  const EXAMS_PER_PAGE = 12;
  const [localDbExams, setLocalDbExams] = useState([]);

  // Multi-facet filter & search states scoped independently per division
  const [qualFilter, setQualFilterState] = useState(cachedForDiv.qualFilter);
  const [sortBy, setSortByState] = useState(cachedForDiv.sortBy);
  const [overviewSearch, setOverviewSearchState] = useState(cachedForDiv.overviewSearch);
  const [overviewQualFilter, setOverviewQualFilterState] = useState(cachedForDiv.overviewQualFilter);
  const [examSearch, setExamSearchState] = useState(cachedForDiv.examSearch);
  const [materialSearch, setMaterialSearch] = useState('');
  const [jobSearch, setJobSearch] = useState('');

  const setQualFilter = useCallback((val) => {
    setQualFilterState(val);
    if (divisionFilterCache[divKey]) divisionFilterCache[divKey].qualFilter = val;
  }, [divKey]);

  const setSortBy = useCallback((val) => {
    setSortByState(val);
    if (divisionFilterCache[divKey]) divisionFilterCache[divKey].sortBy = val;
  }, [divKey]);

  const setOverviewSearch = useCallback((val) => {
    setOverviewSearchState(val);
    if (divisionFilterCache[divKey]) divisionFilterCache[divKey].overviewSearch = val;
  }, [divKey]);

  const setOverviewQualFilter = useCallback((val) => {
    setOverviewQualFilterState(val);
    if (divisionFilterCache[divKey]) divisionFilterCache[divKey].overviewQualFilter = val;
  }, [divKey]);

  const setExamSearch = useCallback((val) => {
    setExamSearchState(val);
    if (divisionFilterCache[divKey]) divisionFilterCache[divKey].examSearch = val;
  }, [divKey]);

  // Sync global search into portal searches
  useEffect(() => {
    if (globalSearch !== undefined && globalSearch !== null && globalSearch.trim()) {
      setExamSearch(globalSearch);
      setOverviewSearch(globalSearch);
    }
  }, [globalSearch, setExamSearch, setOverviewSearch]);

  // Sequential drilldown states
  const [selectedExam, setSelectedExam] = useState(null);
  const [activeReadingResource, setActiveReadingResource] = useState(null);
  const [activeResourceTab, setActiveResourceTab] = useState('intro');
  const [isIntroExpanded, setIsIntroExpanded] = useState(true);
  const [examJobs, setExamJobs] = useState([]);
  const [jobsLoading, setJobsLoading] = useState(false);
  const [effectiveTier, setEffectiveTier] = useState('FREE');

  // URL search parameter updater helper
  const updatePortalParams = useCallback((updates, { replace = false } = {}) => {
    if (!replace) {
      internalPortalDepthRef.current += 1;
    }
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      Object.entries(updates).forEach(([k, v]) => {
        if (v === undefined || v === null || v === '') {
          next.delete(k);
        } else {
          next.set(k, String(v));
        }
      });
      return next;
    }, { replace });
  }, [setSearchParams]);

  // Track browser popstate (back button, forward button, or swipe gesture)
  useEffect(() => {
    const handlePopState = () => {
      if (internalPortalDepthRef.current > 0) {
        internalPortalDepthRef.current -= 1;
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleViewAllExams = () => {
    setViewTransitioning(true);
    setTimeout(() => {
      setShowAllExams(true);
      setCurrentPage(1);
      updatePortalParams({ view: 'all' });
      onSetSidebarCollapsed?.(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      const rail = document.querySelector('.lc-content-rail');
      if (rail) rail.scrollTo({ top: 0, behavior: 'smooth' });
      setViewTransitioning(false);
    }, 320);
  };

  const handleBackToOverview = () => {
    setViewTransitioning(true);
    setTimeout(() => {
      if (internalPortalDepthRef.current > 0) {
        internalPortalDepthRef.current -= 1;
        navigate(-1);
      } else {
        setShowAllExams(false);
        updatePortalParams({ view: undefined }, { replace: true });
        onSetSidebarCollapsed?.(laptopRailDefault());
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
      const rail = document.querySelector('.lc-content-rail');
      if (rail) rail.scrollTo({ top: 0, behavior: 'smooth' });
      setViewTransitioning(false);
    }, 320);
  };

  const handleBackFromExam = () => {
    setViewTransitioning(true);
    setTimeout(() => {
      if (internalPortalDepthRef.current > 0) {
        internalPortalDepthRef.current -= 1;
        navigate(-1);
      } else {
        setSelectedExam(null);
        updatePortalParams({ exam: undefined }, { replace: true });
        if (urlViewParam !== 'all') onSetSidebarCollapsed?.(laptopRailDefault());
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
      const rail = document.querySelector('.lc-content-rail');
      if (rail) rail.scrollTo({ top: 0, behavior: 'smooth' });
      setViewTransitioning(false);
    }, 320);
  };

  const handleBackFromReader = () => {
    if (internalPortalDepthRef.current > 0) {
      internalPortalDepthRef.current -= 1;
      navigate(-1);
    } else {
      setActiveReadingResource(null);
      updatePortalParams({ resource: undefined, manual: undefined }, { replace: true });
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
    const rail = document.querySelector('.lc-content-rail');
    if (rail) rail.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Sync showAllExams when URL view param changes
  useEffect(() => {
    const isAll = urlViewParam === 'all';
    setShowAllExams(isAll);
    if (isAll && !urlExamParam) {
      onSetSidebarCollapsed?.(true);
    }
  }, [urlViewParam, urlExamParam, onSetSidebarCollapsed]);

  // Reset states when switching category or division
  useEffect(() => {
    setExamSearch('');
    setCurrentPage(1);
    if (!urlExamParam) setSelectedExam(null);
    if (!urlResourceParam && urlManualParam !== '1') setActiveReadingResource(null);
    setActiveResourceTab('intro');
    if (!urlViewParam) {
      setShowAllExams(false);
      onSetSidebarCollapsed?.(laptopRailDefault());
    }
    const rail = document.querySelector('.lc-content-rail');
    if (rail) rail.scrollTo({ top: 0, behavior: 'smooth' });
  }, [categoryName, division, urlExamParam, urlResourceParam, urlManualParam, urlViewParam, onSetSidebarCollapsed]);

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
          .select('id, name, category, conducting_body_id, conducting_body:lc_conducting_bodies(id,name), region:lc_regions(id,name,level)')
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
      const startTime = Date.now();
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
          const elapsed = Date.now() - startTime;
          const remainingDelay = Math.max(0, 380 - elapsed);
          setTimeout(() => {
            if (isMounted) setLoading(false);
          }, remainingDelay);
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

  // Sync selectedExam with URL exam param (on popstate / browser back / gesture back)
  useEffect(() => {
    if (!urlExamParam) {
      if (selectedExam !== null) {
        setSelectedExam(null);
        if (urlViewParam !== 'all') {
          onSetSidebarCollapsed?.(laptopRailDefault());
        }
      }
      return;
    }

    if (selectedExam && String(selectedExam.id || selectedExam.exam_id) === String(urlExamParam)) {
      return;
    }

    const pool = [...allCategoryExams, ...(levelExams || []), ...(allCatalog || []), ...localDbExams];
    const match = pool.find(
      (e) =>
        String(e.id || e.exam_id) === String(urlExamParam) ||
        String(e.name || e.title || '').toLowerCase() === String(urlExamParam).toLowerCase()
    );

    if (match) {
      setSelectedExam(match);
    } else {
      let cancelled = false;
      supabase
        .from('lc_exams')
        .select('id, name, category, conducting_body_id, conducting_body:lc_conducting_bodies(id,name), region:lc_regions(id,name,level)')
        .eq('id', urlExamParam)
        .maybeSingle()
        .then(({ data, error }) => {
          if (!cancelled && data && !error) setSelectedExam(data);
        })
        .catch((err) => console.warn('Could not fetch exam for URL param:', err));
      return () => { cancelled = true; };
    }
  }, [urlExamParam, allCategoryExams, levelExams, allCatalog, localDbExams, urlViewParam, onSetSidebarCollapsed]);

  // Sync activeReadingResource with URL resource and manual params
  useEffect(() => {
    if (!urlResourceParam && urlManualParam !== '1') {
      if (activeReadingResource !== null) {
        setActiveReadingResource(null);
      }
      return;
    }

    if (urlManualParam === '1') {
      if (!activeReadingResource?.isManual && selectedExam) {
        setActiveReadingResource({
          isManual: true,
          title: intro?.title || `${selectedExam.name} - Official Syllabus & Guide`,
          body: intro?.body || '',
          category: 'Intro',
        });
      }
      return;
    }

    if (urlResourceParam) {
      if (activeReadingResource?.resource_id === urlResourceParam) return;

      const allRes = [...guideItems, ...precisItems, ...pyqItems, ...(intro?.resource ? [intro.resource] : [])];
      const found = allRes.find((r) => String(r.resource_id) === String(urlResourceParam));
      if (found) {
        setActiveReadingResource(found);
      } else {
        setActiveReadingResource({
          resource_id: urlResourceParam,
          title: 'Study Material',
          category: selectedExam?.category || 'Guide',
        });
      }
    }
  }, [urlResourceParam, urlManualParam, guideItems, precisItems, pyqItems, intro, selectedExam]);

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

  // Helper matchers for qualifications and levels
  const matchesQualification = (exam, qual) => {
    if (!qual || qual === 'all') return true;
    const text = `${exam.name || ''} ${exam.category || ''} ${exam.qualification || ''} ${exam.eligibility || ''} ${exam.qualification_level || ''} ${exam.minimum_qualification || ''}`.toLowerCase();
    if (qual === 'graduate') {
      return text.includes('graduate') || text.includes('degree') || text.includes('cgl') || text.includes('cpo') || text.includes('post-graduate') || text.includes('bachelor');
    }
    if (qual === '10+2') {
      return text.includes('10+2') || text.includes('12th') || text.includes('higher secondary') || text.includes('chsl') || text.includes('intermediate') || text.includes('stenographer');
    }
    if (qual === 'matric') {
      return text.includes('matric') || text.includes('10th') || text.includes('mts') || text.includes('gd') || text.includes('secondary');
    }
    if (qual === 'technical') {
      return text.includes('tech') || text.includes('je') || text.includes('engineer') || text.includes('diploma') || text.includes('iti') || text.includes('scientific');
    }
    return true;
  };

  // Search & multi-facet filter for all exams grid view
  const filteredAllExams = useMemo(() => {
    let list = allCategoryExams;
    if (examSearch.trim()) {
      const q = examSearch.toLowerCase().trim();
      list = list.filter((e) => {
        const n = (e.name || '').toLowerCase();
        const c = (e.category || '').toLowerCase();
        const b = (e.conducting_body?.name || '').toLowerCase();
        const r = (e.region?.name || '').toLowerCase();
        return n.includes(q) || c.includes(q) || b.includes(q) || r.includes(q);
      });
    }
    if (qualFilter !== 'all') {
      list = list.filter((e) => matchesQualification(e, qualFilter));
    }
    if (sortBy === 'az') {
      list = [...list].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    } else if (sortBy === 'za') {
      list = [...list].sort((a, b) => (b.name || '').localeCompare(a.name || ''));
    }
    return list;
  }, [allCategoryExams, examSearch, qualFilter, sortBy]);

  // Overview filtered exams (matches overview search & qualification chips)
  const filteredOverviewExams = useMemo(() => {
    let list = allCategoryExams;
    if (overviewSearch.trim()) {
      const q = overviewSearch.toLowerCase().trim();
      list = list.filter((e) => {
        const n = (e.name || '').toLowerCase();
        const c = (e.category || '').toLowerCase();
        const b = (e.conducting_body?.name || '').toLowerCase();
        return n.includes(q) || c.includes(q) || b.includes(q);
      });
    }
    if (overviewQualFilter !== 'all') {
      list = list.filter((e) => matchesQualification(e, overviewQualFilter));
    }
    return list;
  }, [allCategoryExams, overviewSearch, overviewQualFilter]);

  // Study materials (guidebooks) search filter
  const filteredGuideItems = useMemo(() => {
    if (!materialSearch.trim()) return guideItems;
    const q = materialSearch.toLowerCase().trim();
    return guideItems.filter((res) => {
      const t = (res.title || '').toLowerCase();
      const s = (res.subject || res.module || '').toLowerCase();
      const d = (res.description || '').toLowerCase();
      return t.includes(q) || s.includes(q) || d.includes(q);
    });
  }, [guideItems, materialSearch]);

  // Précis revision notes search filter
  const filteredPrecisItems = useMemo(() => {
    if (!materialSearch.trim()) return precisItems;
    const q = materialSearch.toLowerCase().trim();
    return precisItems.filter((res) => {
      const t = (res.title || '').toLowerCase();
      const s = (res.subject || res.module || '').toLowerCase();
      const d = (res.description || '').toLowerCase();
      return t.includes(q) || s.includes(q) || d.includes(q);
    });
  }, [precisItems, materialSearch]);

  // Exam matching jobs search filter
  const filteredJobs = useMemo(() => {
    if (!jobSearch.trim()) return examJobs;
    const q = jobSearch.toLowerCase().trim();
    return examJobs.filter((job) => {
      const t = (job.title || job.role || '').toLowerCase();
      const c = (job.company || job.organization || '').toLowerCase();
      const l = (job.location || '').toLowerCase();
      const s = (job.skills || []).join(' ').toLowerCase();
      return t.includes(q) || c.includes(q) || l.includes(q) || s.includes(q);
    });
  }, [examJobs, jobSearch]);

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

  if (loading || !profile || viewTransitioning) {
    return (
      <div className="cep-loading-skeleton" aria-live="polite">
        <div className="cep-skeleton-hero">
          <div className="cep-skeleton-hero-inner">
            <div className="cep-skeleton-hero-badge" />
            <div className="cep-skeleton-hero-title" />
            <div className="cep-skeleton-hero-desc" />
          </div>
        </div>
        <div className="cep-skeleton-toolbar">
          <div className="cep-skeleton-search" />
          <div className="cep-skeleton-chip" />
          <div className="cep-skeleton-chip" />
          <div className="cep-skeleton-chip" />
        </div>
        <div className="cep-skeleton-grid">
          <div className="cep-skeleton-card">
            <div className="cep-skeleton-card-badge" />
            <div className="cep-skeleton-card-title" />
            <div className="cep-skeleton-card-line" />
            <div className="cep-skeleton-card-line" style={{ width: '60%' }} />
          </div>
          <div className="cep-skeleton-card">
            <div className="cep-skeleton-card-badge" />
            <div className="cep-skeleton-card-title" />
            <div className="cep-skeleton-card-line" />
            <div className="cep-skeleton-card-line" style={{ width: '60%' }} />
          </div>
          <div className="cep-skeleton-card">
            <div className="cep-skeleton-card-badge" />
            <div className="cep-skeleton-card-title" />
            <div className="cep-skeleton-card-line" />
            <div className="cep-skeleton-card-line" style={{ width: '60%' }} />
          </div>
          <div className="cep-skeleton-card">
            <div className="cep-skeleton-card-badge" />
            <div className="cep-skeleton-card-title" />
            <div className="cep-skeleton-card-line" />
            <div className="cep-skeleton-card-line" style={{ width: '60%' }} />
          </div>
          <div className="cep-skeleton-card">
            <div className="cep-skeleton-card-badge" />
            <div className="cep-skeleton-card-title" />
            <div className="cep-skeleton-card-line" />
            <div className="cep-skeleton-card-line" style={{ width: '60%' }} />
          </div>
          <div className="cep-skeleton-card">
            <div className="cep-skeleton-card-badge" />
            <div className="cep-skeleton-card-title" />
            <div className="cep-skeleton-card-line" />
            <div className="cep-skeleton-card-line" style={{ width: '60%' }} />
          </div>
        </div>
      </div>
    );
  }

  // Level 1: Top & Related fallback lists (responsive to overview filters)
  const isOverviewFiltered = Boolean(overviewSearch.trim() || overviewQualFilter !== 'all');
  const topExamsPool = isOverviewFiltered ? filteredOverviewExams : allCategoryExams;

  const topExams =
    topExamsPool.length > 0
      ? topExamsPool.slice(0, 5).map((e) => ({
          title: e.name,
          subtitle: e.conducting_body?.name || e.category || 'Commission',
          examId: e.id,
        }))
      : !isOverviewFiltered && Array.isArray(profile.top_exams) && profile.top_exams.length > 0
        ? profile.top_exams
        : [];

  const relatedExams =
    topExamsPool.slice(5, 11).length > 0
      ? topExamsPool.slice(5, 11).map((e) => ({
          title: e.name,
          badge: e.category || 'Competitive Exam',
          examId: e.id,
        }))
      : !isOverviewFiltered && Array.isArray(profile.related_exams) && profile.related_exams.length > 0
        ? profile.related_exams
        : topExamsPool.slice(0, 6).map((e) => ({
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

  // Open Resource handler: transitions to Level 3 Reader
  const handleOpenResource = (r) => {
    setViewTransitioning(true);
    setTimeout(() => {
      setActiveReadingResource(r);
      updatePortalParams({ resource: r.resource_id, manual: undefined });
      window.scrollTo({ top: 0, behavior: 'smooth' });
      const rail = document.querySelector('.lc-content-rail');
      if (rail) rail.scrollTo({ top: 0, behavior: 'smooth' });
      setViewTransitioning(false);
    }, 280);
  };

  // Continue Prep button handler: transitions to Level 2
  const handleContinuePrep = (exam) => {
    setViewTransitioning(true);
    setTimeout(() => {
      setSelectedExam(exam);
      const examId = exam.id || exam.exam_id;
      updatePortalParams({ exam: examId });
      setActiveReadingResource(null);
      setActiveResourceTab('intro');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      const rail = document.querySelector('.lc-content-rail');
      if (rail) rail.scrollTo({ top: 0, behavior: 'smooth' });
      setViewTransitioning(false);
    }, 320);
  };

  // Open Introduction handler: transitions to Level 3
  const handleIntroCardClick = () => {
    if (intro?.source === 'auto' && intro.resource) {
      handleOpenResource(intro.resource);
    } else if (intro?.source === 'manual') {
      setViewTransitioning(true);
      setTimeout(() => {
        setActiveReadingResource({
          isManual: true,
          title: intro.title || `${selectedExam?.name || 'Exam'} - Introduction & Syllabus`,
          body: intro.body,
          category: 'Intro',
        });
        updatePortalParams({ manual: '1', resource: undefined });
        window.scrollTo({ top: 0, behavior: 'smooth' });
        const rail = document.querySelector('.lc-content-rail');
        if (rail) rail.scrollTo({ top: 0, behavior: 'smooth' });
        setViewTransitioning(false);
      }, 280);
    } else {
      setViewTransitioning(true);
      setTimeout(() => {
        setActiveReadingResource({
          isManual: true,
          title: `${selectedExam?.name || 'Exam'} - Official Syllabus & Examination Guide`,
          body: `
            <div style="font-size: 15px; line-height: 1.8;">
              <p><strong>Conducting Body:</strong> ${selectedExam?.conducting_body?.name || selectedExam?.conductingBody || 'Government Selection Board'}</p>
              <p><strong>Category:</strong> ${selectedExam?.category || profile?.category_name || 'Competitive Examination'}</p>
              <p><strong>Recruitment Level:</strong> ${selectedExam?.region?.level || selectedExam?.level || 'Central / State'}</p>
              <hr style="margin: 20px 0; border: none; border-top: 1px solid var(--c-line-2, #e2e8f0);" />
              <h3 style="color: var(--c-green, #065f46); font-size: 19px; margin-bottom: 8px;">Examination Overview</h3>
              <p>${selectedExam?.description || profile?.about_text || 'Comprehensive exam preparation syllabus provided by Veer Next.'}</p>
              <h3 style="color: var(--c-green, #065f46); font-size: 19px; margin-top: 24px; margin-bottom: 8px;">Selection Process & Pattern</h3>
              <p>The recruitment process comprises multi-stage evaluations including Computer-Based Written Tests (CBT), skill assessments, and document verification. Structured module notes and previous year papers are compiled below.</p>
              <h3 style="color: var(--c-green, #065f46); font-size: 19px; margin-top: 24px; margin-bottom: 8px;">Recommended Preparation Strategy</h3>
              <p>1. Complete the core topic chapters in the Guidebooks.<br/>2. Revise key formulae and summary points via Préci.<br/>3. Benchmark timing using full-length Mock Tests.</p>
            </div>
          `,
          category: 'Intro',
        });
        updatePortalParams({ manual: '1', resource: undefined });
        window.scrollTo({ top: 0, behavior: 'smooth' });
        const rail = document.querySelector('.lc-content-rail');
        if (rail) rail.scrollTo({ top: 0, behavior: 'smooth' });
        setViewTransitioning(false);
      }, 280);
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
          <span className="cep-bc-link" onClick={handleBackToOverview}>
            Home
          </span>
          <ChevronRight size={13} className="cep-bc-sep" />
          <span className="cep-bc-link" onClick={handleBackFromExam}>
            {profile.category_name}
          </span>
          <ChevronRight size={13} className="cep-bc-sep" />
          <span className="cep-bc-link" onClick={handleBackFromReader}>
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
              onClick={handleBackFromReader}
            >
              <ArrowLeft size={16} />
              <span>Back to {selectedExam.name} Overview</span>
            </button>
            <div className="cep-reader-title-badge">
              <BookOpen size={17} style={{ color: 'var(--c-green, #065f46)' }} />
              <span style={{ fontWeight: 700, color: 'var(--c-ink-1, #0f172a)' }}>
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
                onBack={handleBackFromReader}
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
    const conductingName = typeof selectedExam.conducting_body === 'string'
      ? selectedExam.conducting_body
      : selectedExam.conducting_body?.name || selectedExam.conductingBody || 'Staff Selection Commission';
    const regionName = typeof selectedExam.region === 'string'
      ? selectedExam.region
      : selectedExam.region?.name || selectedExam.regionLevel || selectedExam.level || 'Central';
    const safeRegionLevel = typeof selectedExam.region === 'string'
      ? selectedExam.region
      : selectedExam.region?.level || selectedExam.region?.name || selectedExam.level || selectedExam.state || 'All India';

    return (
      <div className="cep-container">
        {/* Breadcrumb Navigation */}
        <nav className="cep-breadcrumbs cep-breadcrumbs-exam" aria-label="Breadcrumb">
          <span className="cep-bc-link" onClick={handleBackToOverview}>
            Home
          </span>
          <ChevronRight size={13} className="cep-bc-sep" />
          <span className="cep-bc-link" onClick={handleBackFromExam}>
            {profile.category_name}
          </span>
          <ChevronRight size={13} className="cep-bc-sep" />
          <span className="cep-bc-current">{selectedExam.name || selectedExam.title || 'Examination'}</span>
        </nav>

        <section className="cep-exam-hub-card">
          {/* Top Bar with Back Link */}
          <div className="cep-exam-hub-topbar">
            <div className="cep-exam-hub-crumbs">
              <button
                type="button"
                className="cep-exam-back-btn"
                onClick={handleBackFromExam}
              >
                <ArrowLeft size={14} />
                <span>Back to {showAllExams ? `All ${profile.category_name} Exams` : `${profile.category_name} Overview`}</span>
              </button>
              <span className="cep-crumb-pipe">|</span>
              <span className="cep-crumb-trail">{profile.category_name}</span>
              <ChevronRight size={13} className="cep-bc-sep" />
              <span className="cep-crumb-active">{selectedExam.name || selectedExam.title || 'Examination'}</span>
            </div>
          </div>

          {/* Exam Hero Showcase Banner */}
          <div className="cep-exam-showcase-banner">
            <div className="cep-exam-showcase-left-wrap">
              <div className="cep-exam-showcase-main">
                <div className="cep-exam-showcase-title-row">
                  <h2 className="cep-exam-showcase-title">{selectedExam.name || selectedExam.title || 'Official Examination'}</h2>
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
                    `Comprehensive preparation curriculum for ${selectedExam.name || selectedExam.title || 'this examination'}. Master core subjects, practice previous year papers and evaluate preparedness with timed mocks.`}
                </p>
              </div>
            </div>

            {/* Right side visual: same image and gradient fade style as category hero card */}
            <div className="cep-exam-banner-visual-wrap">
              <div className="cep-hero-image-box">
                <img
                  src={
                    profile?.hero_image_url ||
                    getCategoryBannerImage(selectedExam.category || profile?.category_name, profile?.division, stateName)
                  }
                  alt={`${selectedExam.name} Preparation`}
                  className="cep-hero-img"
                  loading="eager"
                />
                <div className="cep-hero-gradient-overlay" />
              </div>
            </div>
          </div>

          {/* ── The 5 Action Cards Row (Visual Showcase with Real Working Links) ── */}
          <div className="cep-modules-head"><span>Study Resource Modules</span><span>5 Sections</span></div>
          <div className="cep-actions-grid" aria-label="Exam Preparation Modules">
            {/* 1. Introduction -> Expands and scrolls to collapsible introduction section */}
            <div
              className={`cep-action-card cep-card-peach cep-action-card-clickable ${isIntroExpanded ? 'cep-action-card-active' : ''}`}
              onClick={() => {
                setIsIntroExpanded(true);
                const elem = document.querySelector('.cep-intro-collapsible-section');
                if (elem) elem.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
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

            {/* 2. Guidebooks -> Opens Dedicated Study Materials Guidebooks Page */}
            <div
              className={`cep-action-card cep-card-mint cep-action-card-clickable ${activeResourceTab === 'guide' ? 'cep-action-card-active' : ''}`}
              onClick={() => {
                const cat = profile?.category_name || selectedExam?.category || 'SSC';
                const examId = selectedExam?.id || '';
                const examName = selectedExam?.name || selectedExam?.title || '';
                navigate(`/study-materials?category=${encodeURIComponent(cat)}&type=guide&exam=${encodeURIComponent(examId)}&examName=${encodeURIComponent(examName)}`);
              }}
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

            {/* 3. Preci -> Opens Dedicated Study Materials Préci Page */}
            <div
              className={`cep-action-card cep-card-rose cep-action-card-clickable ${activeResourceTab === 'precis' ? 'cep-action-card-active' : ''}`}
              onClick={() => {
                const cat = profile?.category_name || selectedExam?.category || 'SSC';
                const examId = selectedExam?.id || '';
                const examName = selectedExam?.name || selectedExam?.title || '';
                navigate(`/study-materials?category=${encodeURIComponent(cat)}&type=precis&exam=${encodeURIComponent(examId)}&examName=${encodeURIComponent(examName)}`);
              }}
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
              onClick={() => navigate(`/pyq-center?exam=${examTargetId}`, { state: { from: location.pathname + location.search } })}
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
              onClick={() => navigate(`/quiz-center?exam=${examTargetId}`, { state: { from: location.pathname + location.search } })}
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

          {/* ── Collapsible Examination Introduction & Overview Section ── */}
          <section className="cep-intro-collapsible-section" aria-label={`Introduction for ${selectedExam.name}`}>
            <div
              className="cep-intro-collapsible-header"
              onClick={() => setIsIntroExpanded(!isIntroExpanded)}
              role="button"
              tabIndex={0}
              aria-expanded={isIntroExpanded}
            >
              <div className="cep-intro-header-left">
                <div className="cep-intro-header-icon-wrap">
                  <BookOpen size={20} />
                </div>
                <div>
                  <div className="cep-intro-header-title-row">
                    <span className="cep-header-bar green-bar" />
                    <h3 className="cep-intro-header-title">
                      Official Introduction & Examination Overview
                    </h3>
                    <span className="cep-intro-header-badge">
                      {intro ? 'Official Handbook' : 'Curated Overview'}
                    </span>
                  </div>
                  <p className="cep-intro-header-desc">
                    Pattern, eligibility criteria, stages of examination and key requirements for {selectedExam.name}
                  </p>
                </div>
              </div>

              <div className="cep-intro-toggle-wrap">
                <span className="cep-intro-toggle-text">
                  {isIntroExpanded ? 'Collapse' : 'Expand'}
                </span>
                <div className={`cep-intro-toggle-arrow ${isIntroExpanded ? 'open' : ''}`}>
                  <ChevronDown size={18} />
                </div>
              </div>
            </div>

            {isIntroExpanded && (
              <div className="cep-intro-collapsible-body animate-fade-in">
                {contentLoading ? (
                  <div className="cep-intro-loading">
                    <RefreshCw size={18} className="animate-spin" />
                    <span>Loading examination introduction…</span>
                  </div>
                ) : intro?.source === 'manual' && intro?.body ? (
                  <div className="cep-intro-manual-container">
                    <div
                      className="intro-manual-body cep-manual-content"
                      dangerouslySetInnerHTML={{ __html: intro.body }}
                    />
                  </div>
                ) : intro?.source === 'auto' && intro?.resource ? (
                  <div className="cep-intro-auto-container">
                    <div className="cep-intro-auto-banner">
                      <div className="cep-intro-auto-info">
                        <span className="cep-intro-auto-kicker">COMPREHENSIVE HANDBOOK</span>
                        <h4 className="cep-intro-auto-title">
                          {intro.resource.title || `${selectedExam.name} Official Introduction`}
                        </h4>
                        <p className="cep-intro-auto-desc">
                          Complete introduction covering recruitment notice, syllabus breakdown, qualification requirements, pattern, marking scheme, and cutoff trends.
                        </p>
                      </div>
                      <button
                        type="button"
                        className="cep-intro-read-btn"
                        onClick={handleIntroCardClick}
                      >
                        <BookOpen size={16} />
                        <span>Read in Book Reader</span>
                        <ArrowRight size={14} />
                      </button>
                    </div>

                    {/* Key Highlights Grid */}
                    <div className="cep-intro-highlights-grid">
                      <div className="cep-intro-highlight-card">
                        <span className="cep-highlight-label">Conducting Body</span>
                        <span className="cep-highlight-value">{conductingName}</span>
                      </div>
                      <div className="cep-intro-highlight-card">
                        <span className="cep-highlight-label">Examination Tier / Level</span>
                        <span className="cep-highlight-value">{safeRegionLevel || 'Central Level'}</span>
                      </div>
                      <div className="cep-intro-highlight-card">
                        <span className="cep-highlight-label">Minimum Qualification</span>
                        <span className="cep-highlight-value">{selectedExam.educational_qualification || selectedExam.qualification || 'Graduate / 10+2 / Secondary'}</span>
                      </div>
                      <div className="cep-intro-highlight-card">
                        <span className="cep-highlight-label">Selection Framework</span>
                        <span className="cep-highlight-value">Computer Based Test (CBT) + Skill/Interview</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Fallback Comprehensive Overview when intro document is in processing */
                  <div className="cep-intro-fallback-container">
                    <div className="cep-intro-highlights-grid">
                      <div className="cep-intro-highlight-card">
                        <span className="cep-highlight-label">Examination</span>
                        <span className="cep-highlight-value">{selectedExam.name || selectedExam.title || 'Examination'}</span>
                      </div>
                      <div className="cep-intro-highlight-card">
                        <span className="cep-highlight-label">Cadre & Category</span>
                        <span className="cep-highlight-value">{selectedExam.category || profile.category_name}</span>
                      </div>
                      <div className="cep-intro-highlight-card">
                        <span className="cep-highlight-label">Level & Region</span>
                        <span className="cep-highlight-value">{safeRegionLevel || 'All India'}</span>
                      </div>
                      <div className="cep-intro-highlight-card">
                        <span className="cep-highlight-label">Mode of Test</span>
                        <span className="cep-highlight-value">Computer Based Examination (CBT)</span>
                      </div>
                    </div>

                    <div className="cep-intro-overview-prose">
                      <h4 className="cep-prose-title">About {selectedExam.name}</h4>
                      <p>
                        {selectedExam.description ||
                          `The ${selectedExam.name} is a premier government competitive examination offering coveted career opportunities with structured pay scales, medical benefits, and long-term security. Candidates are evaluated across general intelligence, awareness, quantitative aptitude, and core domain comprehension.`}
                      </p>

                      <div className="cep-intro-prose-boxes">
                        <div className="cep-prose-box">
                          <h5>Examination Stages</h5>
                          <ul>
                            <li><strong>Tier / Phase 1:</strong> Preliminary screening test evaluating core aptitude and speed.</li>
                            <li><strong>Tier / Phase 2:</strong> In-depth descriptive or sectional domain knowledge assessment.</li>
                            <li><strong>Final Verification:</strong> Document verification and requisite medical/physical assessment.</li>
                          </ul>
                        </div>
                        <div className="cep-prose-box">
                          <h5>Recommended Strategy</h5>
                          <ul>
                            <li>Master fundamentals with the dedicated <strong>Guidebooks</strong>.</li>
                            <li>Review high-yield formulas with concise <strong>Préci Notes</strong>.</li>
                            <li>Solve authentic <strong>Previous Year Questions (PYQs)</strong> to identify trends.</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>

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
              <div className="cep-jobs-head-right">
                <div className="cep-jobs-search-box">
                  <Search size={14} className="cep-search-icon" />
                  <input
                    type="text"
                    placeholder="Filter openings by role..."
                    value={jobSearch}
                    onChange={(e) => setJobSearch(e.target.value)}
                    className="cep-jobs-search-input"
                    aria-label="Filter job openings"
                  />
                  {jobSearch && (
                    <button
                      type="button"
                      className="cep-search-clear-btn"
                      onClick={() => setJobSearch('')}
                      aria-label="Clear job search"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>
                <span className="cep-jobs-count-tag">
                  {filteredJobs.length} {filteredJobs.length === 1 ? 'Opportunity Found' : 'Opportunities Found'}
                </span>
              </div>
            </div>

            {jobsLoading ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '24px 0', color: 'var(--c-ink-4, #64748b)' }}>
                <RefreshCw size={18} className="animate-spin" />
                <span>Searching active recruitment openings…</span>
              </div>
            ) : filteredJobs.length > 0 ? (
              <div className="cep-jobs-grid">
                {filteredJobs.map((job, idx) => {
                  const jobCompany = typeof job.body === 'string' && job.body
                    ? job.body
                    : (typeof job.conducting_body === 'string' ? job.conducting_body : job.conducting_body?.name) ||
                      (typeof job.raw_json?.conducting_body === 'string' ? job.raw_json.conducting_body : job.raw_json?.conducting_body?.name) ||
                      conductingName ||
                      'Government Department';
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
                          <span className="cep-job-tag cep-job-tag-vacancies" style={{ background: 'var(--c-tint-green, #ecfdf5)', color: 'var(--c-green, #065f46)', fontWeight: 700 }}>
                            {job.vacancies} {typeof job.vacancies === 'number' ? 'Posts' : ''}
                          </span>
                        )}
                        {(job.careerTrack || job.career_track) && (
                          <span className="cep-job-tag cep-job-tag-track" style={{ background: 'var(--c-tint-blue, #eff6ff)', color: 'var(--c-blue, #1d4ed8)', fontWeight: 600 }}>
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
                            <span className="cep-job-tag">{typeof job.state === 'string' ? job.state : job.state?.name || regionName || 'All India'}</span>
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
                <Briefcase size={32} style={{ color: 'var(--c-green, #059669)', marginBottom: '8px' }} />
                <p style={{ fontWeight: 600, color: 'var(--c-ink-1, #0f172a)', margin: '0 0 4px' }}>
                  No active recruitment notifications for {selectedExam.name} right now.
                </p>
                <p style={{ color: 'var(--c-ink-4, #64748b)', fontSize: '12.5px', margin: '0 0 14px' }}>
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
  const renderColHeader = (key, title) => {
    if (!isPhone) {
      return (
        <div className="cep-col-header">
          <span className="cep-header-bar green-bar" />
          <h3 className="cep-col-title">{title}</h3>
        </div>
      );
    }
    const open = openSections[key];
    return (
      <h3 className="cep-col-title cep-acc-h">
        <button
          type="button"
          className="cep-acc-toggle"
          aria-expanded={open}
          aria-controls={`cep-acc-${key}`}
          onClick={() => setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }))}
        >
          <span className="cep-header-bar green-bar" aria-hidden="true" />
          <span className="cep-acc-title">{title}</span>
          <ChevronDown size={18} className="cep-acc-chev" aria-hidden="true" />
        </button>
      </h3>
    );
  };

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

      {/* ── Hero Banner Section (VeerNext Dark Green to Category Image Gradient Blend) ── */}
      {(() => {
        const bannerImage =
          profile.hero_image_url || getCategoryBannerImage(profile.category_name, profile.division, stateName);
        const bannerKicker = getCategoryKicker(profile.category_name, profile.full_name, stateName);
        const titleParts = getCategoryTitleParts(profile.category_name);

        return (
          <section className="cep-hero-card" aria-label={`${profile.category_name} Overview Banner`}>
            <div className="cep-hero-content">
              <span className="cep-hero-kicker">{bannerKicker}</span>

              <h1 className="cep-hero-title">
                <span className="cep-hero-title-accent">{titleParts.accentWord}</span>
                <span className="cep-hero-title-main">{titleParts.mainWords}</span>
              </h1>

              <div className="cep-hero-accent-line" />

              <p className="cep-hero-tagline">{displayTagline}</p>

              <div className="cep-hero-pills-row" role="list" aria-label="Category Key Offerings">
                <div
                  className="cep-hero-pill"
                  role="listitem"
                  onClick={() => {
                    navigate(`/study-materials?category=${encodeURIComponent(profile?.category_name || 'SSC')}&type=guide`);
                  }}
                  title="Explore Study Material & Books"
                >
                  <div className="cep-hero-pill-icon">
                    <BookOpen size={15} />
                  </div>
                  <div className="cep-hero-pill-texts">
                    <span className="cep-hero-pill-title">Study Material</span>
                    <span className="cep-hero-pill-sub">Notes & PDFs</span>
                  </div>
                </div>

                <div
                  className="cep-hero-pill"
                  role="listitem"
                  onClick={() => onExploreContent?.('pyqs', profile)}
                  title="Practice Solved Previous Year Questions"
                >
                  <div className="cep-hero-pill-icon">
                    <FileText size={15} />
                  </div>
                  <div className="cep-hero-pill-texts">
                    <span className="cep-hero-pill-title">Previous Year Papers</span>
                    <span className="cep-hero-pill-sub">Solved PYQs</span>
                  </div>
                </div>

                <div
                  className="cep-hero-pill"
                  role="listitem"
                  onClick={() => onExploreContent?.('mocks', profile)}
                  title="Take Simulated Mock Tests"
                >
                  <div className="cep-hero-pill-icon">
                    <CheckCircle2 size={15} />
                  </div>
                  <div className="cep-hero-pill-texts">
                    <span className="cep-hero-pill-title">Mock Tests</span>
                    <span className="cep-hero-pill-sub">Practice & Analysis</span>
                  </div>
                </div>

                <div
                  className="cep-hero-pill"
                  role="listitem"
                  onClick={() => {
                    const whyChooseElem = document.querySelector('.cep-why-choose-section');
                    if (whyChooseElem) {
                      whyChooseElem.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                  }}
                  title="Preparation Guidance & Strategy"
                >
                  <div className="cep-hero-pill-icon">
                    <Lightbulb size={15} />
                  </div>
                  <div className="cep-hero-pill-texts">
                    <span className="cep-hero-pill-title">Expert Guidance</span>
                    <span className="cep-hero-pill-sub">Strategy & Updates</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Hero Banner Visual with smooth gradient blend */}
            <div className="cep-hero-visual-wrap">
              <div className="cep-hero-image-box">
                <img
                  src={bannerImage}
                  alt={`${profile.category_name} Headquarters`}
                  className="cep-hero-img"
                  loading="eager"
                />
                <div className="cep-hero-gradient-overlay" />
              </div>
            </div>
          </section>
        );
      })()}


      {/* ── Conditional: Full Width All Exams View OR 3-Column Overview ── */}
      {showAllExams ? (
        <div className="cep-q">
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
                <div className="cep-search-icon-pill">
                  <Search size={15} />
                </div>
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
                    onClick={() => {
                      setExamSearch('');
                      if (onClearGlobalSearch) onClearGlobalSearch();
                    }}
                    aria-label="Clear search"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* ── Multi-Facet Filter & Sort Toolbar for All Exams ── */}
          <div className="cep-all-exams-filter-bar">
            <div className="cep-filter-head">
              <span className="cep-filter-label"><Filter size={13} /> <span className="cep-filter-label-text">Qualification:</span></span>
              <div className="cep-sort-group">
                <label htmlFor="cep-sort-select" className="cep-filter-label">Sort:</label>
                <select
                  id="cep-sort-select"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="cep-sort-select"
                >
                  <option value="relevance">Default Order</option>
                  <option value="az">Name: A to Z</option>
                  <option value="za">Name: Z to A</option>
                </select>
              </div>
            </div>

            <div className="cep-filter-chips-group" role="group" aria-label="Filter by qualification">
              {[
                { id: 'all', label: 'All Roles' },
                { id: 'graduate', label: 'Graduate' },
                { id: '10+2', label: '10+2 Level' },
                { id: 'matric', label: 'Matriculation' },
                { id: 'technical', label: 'Technical' },
              ].map((q) => (
                <button
                  key={q.id}
                  type="button"
                  className={`cep-filter-chip ${qualFilter === q.id ? 'active' : ''}`}
                  aria-pressed={qualFilter === q.id}
                  onClick={() => {
                    setQualFilter(q.id);
                    setCurrentPage(1);
                  }}
                >
                  {q.label}
                </button>
              ))}
            </div>

            {(examSearch || qualFilter !== 'all') && (
              <button
                type="button"
                className="cep-filter-clear-all"
                onClick={() => {
                  setExamSearch('');
                  setQualFilter('all');
                  setSortBy('relevance');
                  setCurrentPage(1);
                  if (onClearGlobalSearch) onClearGlobalSearch();
                }}
              >
                Clear all filters
              </button>
            )}
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
                      {/* Top 16:9 Photographic Banner with Motivational Quote Overlay */}
                      <div className="cep-card-image-wrap">
                        {cardData.cardImage ? (
                          <img
                            src={cardData.cardImage}
                            alt={cardData.displayTitle}
                            className="cep-card-image"
                            loading="lazy"
                          />
                        ) : (
                          <div className={`cep-card-image-placeholder cep-badge-${cardData.theme}`}>
                            {renderCardIcon(cardData.iconName)}
                          </div>
                        )}
                        {cardData.cardQuote && (
                          <span className="cep-card-image-quote">
                            {cardData.cardQuote}
                          </span>
                        )}
                      </div>

                      {/* Card Content Details */}
                      <div className="cep-card-content">
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
        </div>
      ) : (
        <>
          {/* Quick Overview Search & Filter Toolbar */}
          <div className="cep-overview-search-toolbar">
            <div className="cep-overview-search-box">
              <div className="cep-search-icon-pill">
                <Search size={16} />
              </div>
              <input
                type="text"
                placeholder={`Search ${profile.category_name} exams (e.g. MTS, CGL, Constable, JE)...`}
                value={overviewSearch}
                onChange={(e) => setOverviewSearch(e.target.value)}
                className="cep-overview-search-input"
                aria-label="Search exams in this category"
              />
              {overviewSearch && (
                <button
                  type="button"
                  className="cep-search-clear-btn"
                  onClick={() => {
                    setOverviewSearch('');
                    if (onClearGlobalSearch) onClearGlobalSearch();
                  }}
                  aria-label="Clear overview search"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            <div className="cep-overview-filter-row">
              <div className="cep-overview-qual-chips">
                <span className="cep-filter-label"><Filter size={13} /> Filter:</span>
                {[
                  { id: 'all', label: 'All Qualifications' },
                  { id: 'graduate', label: 'Graduate' },
                  { id: '10+2', label: '10+2 Level' },
                  { id: 'matric', label: 'Matriculation' },
                  { id: 'technical', label: 'Technical' },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    className={`cep-filter-chip ${overviewQualFilter === opt.id ? 'active' : ''}`}
                    onClick={() => setOverviewQualFilter(opt.id)}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              {(overviewSearch || overviewQualFilter !== 'all') && (
                <div className="cep-overview-active-actions">
                  <span className="cep-filtered-count-badge">
                    {filteredOverviewExams.length} {filteredOverviewExams.length === 1 ? 'Exam' : 'Exams'} Found
                  </span>
                  <button
                    type="button"
                    className="cep-filter-clear-all"
                    onClick={() => {
                      setOverviewSearch('');
                      setOverviewQualFilter('all');
                      if (onClearGlobalSearch) onClearGlobalSearch();
                    }}
                  >
                    Reset
                  </button>
                  <button
                    type="button"
                    className="cep-view-all-filtered-btn"
                    onClick={() => {
                      setExamSearch(overviewSearch);
                      setQualFilter(overviewQualFilter);
                      setShowAllExams(true);
                    }}
                  >
                    <span>View in Grid</span>
                    <ArrowRight size={13} />
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="cep-q">
          <section className="cep-details-card" aria-label={`${profile.category_name} Overview`}>
          {/* Column 1: About Category */}
          <div className="cep-about-col">
            {renderColHeader('about', `About ${profile.category_name}`)}

            <div className="cep-acc-body" id="cep-acc-about" hidden={isPhone && !openSections.about}>
            <p className={`cep-about-text ${aboutExpanded ? 'expanded' : ''}`}>{profile.about_text}</p>
            <button type="button" className="cep-about-more-btn" aria-expanded={aboutExpanded} onClick={() => setAboutExpanded(v => !v)}>
              <span>{aboutExpanded ? 'Show less' : 'Read more'}</span>
              <ArrowRight size={13} />
            </button>

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
          </div>

          {/* Column 2: Top Exams */}
          <div className="cep-top-exams-col">
            {renderColHeader('top', 'Top Exams')}

            <div className="cep-acc-body" id="cep-acc-top" hidden={isPhone && !openSections.top}>
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
          </div>

          {/* Column 3: Related Exams */}
          <div className="cep-related-exams-col">
            {renderColHeader('related', 'Related Exams')}

            <div className="cep-acc-body" id="cep-acc-related" hidden={isPhone && !openSections.related}>
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
          </div>
          </section>
          </div>
        </>
      )}

      {/* ── Bottom Section: Why Choose Veer Next ── */}
      <div className="cep-q">
      <section className="cep-why-choose-card">
        <div className="cep-why-header">
          {renderColHeader('why', `Why Choose Veer Next for ${profile.category_name}?`)}
          <p className="cep-why-subtitle" hidden={isPhone && !openSections.why}>Everything you need for your preparation — at one place.</p>
        </div>

        <div className="cep-why-pillars-grid" id="cep-acc-why" hidden={isPhone && !openSections.why}>
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

      {/* ── Section 10: Promotional Banner (brought below Why Choose Veer Next) ── */}
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
                onClick={handleViewAllExams}
              >
                Explore All Courses <ArrowRight size={17} />
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
