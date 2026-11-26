import { useEffect, useState } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import axios from 'axios';
import { supabase } from '../lib/supabase';
import { MIN_PLAYABLE_QUESTIONS } from '../lib/quizQuality';
import {
  Award, Target, Briefcase, MapPin, ExternalLink, Crown,
  FileText, PlayCircle, Sparkles, ArrowRight, RefreshCw,
  Compass, ListChecks, AlertCircle, CheckCircle2, Rocket,
  Zap, Calendar, Users, Shield, GraduationCap, Building2,
  BookOpen, ChevronDown, ChevronUp, Layers, TrendingUp,
} from 'lucide-react';
import { getProfilingInsights, getTransferableSkills } from '../lib/profilingInsights';
import {
  matchJobsV2ForExam,
  getTop10RecommendedJobs,
} from '../lib/jobMatcher';
import { JobDescriptionModal } from '../components/JobDescriptionModal';
import { TransitionRoadmap } from '../components/roadmap/TransitionRoadmap';
import Card from '../components/ui/Card';
import { isTierAtLeast, isTesterModeActive, getEffectiveTier } from '../lib/subscriptionAccess';

const BREAKDOWN_LABELS = {
  ex_servicemen_quota: 'Ex-Servicemen Quota',
  priority_track: 'Priority Track Match',
  trade_strong_match: 'Strong Trade Match',
  trade_soft_match: 'Trade Match',
  qualification_exact: 'Qualification Match',
  qualification_over: 'Exceeds Qualification',
  domicile_home: 'Home State Advantage',
  category_reservation: 'Category Reservation',
  character_required_track: 'Discharge Character Bonus',
  character_general: 'Discharge Character Bonus',
  ncc: 'NCC Certification',
  sports_quota: 'Sports Quota',
  math: 'Math Proficiency',
  english: 'English Proficiency',
  physical_fit: 'Physical Fitness Match',
  full_term: 'Full Service Term',
  technical_trade_alignment: 'Technical Trade Alignment',
  preference_central_govt: 'Central Govt. Preference',
  preference_state_govt: 'State Govt. Preference',
  preference_banking_psu: 'Banking/PSU Preference',
  preference_private: 'Private Sector Preference',
  preference_entrepreneurship: 'Entrepreneurship Preference',
  banking_security_strong: 'Direct ESM Banking Quota',
  banking_security_soft: 'Banking Security Alignment',
  banking_clerk_strong: 'Clerical Cadre ESM Preference',
  banking_clerk_moderate: 'Banking Clerical Fit',
  banking_officer_strong: 'Officer Cadre Graduate Fit',
  combat_trade_security_affinity: 'Combat Veteran Security Fit',
};

const TRACK_LABELS = {
  POLICE_CAPF: 'Police & CAPF',
  SSC: 'SSC & Central Govt',
  BANKING: 'Banking & Finance',
  RAILWAYS: 'Indian Railways',
  DEFENCE: 'Defence & Security',
  ENGINEERING: 'Engineering & Technical',
  PSU: 'Public Sector (PSU)',
  CIVIL_SERVICES: 'Civil Services & State PSC',
  TEACHING: 'Teaching & Education',
  NURSING: 'Healthcare & Medical',
  GROUP_C: 'State Govt (Group C/D)',
  AGRICULTURE: 'Agriculture & Forest',
  PRIVATE: 'Corporate & Private',
};

function topFactors(breakdown = {}, count = 4) {
  return Object.entries(breakdown)
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, count)
    .map(([key]) => BREAKDOWN_LABELS[key] || key);
}

const ExamPrepSection = ({ exam }) => {
  const [resources, setResources] = useState([]);
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const fetchPrepData = async () => {
      setLoading(true);
      try {
        let resData = await supabase.from('resources').select('id, resource_id, title').eq('exam_name', exam.exam_name).limit(3);
        let quizData = { data: [] };
        if (exam.lc_exam_id) {
          quizData = await supabase.from('quizzes').select('id, title').eq('lc_exam_id', exam.lc_exam_id).eq('category', 'Mock Test').gte('playable_questions', MIN_PLAYABLE_QUESTIONS).order('title').limit(3);
        } else if (exam.exam_id) {
          quizData = await supabase.from('quizzes').select('id, title').eq('lc_exam_id', exam.exam_id).eq('category', 'Mock Test').gte('playable_questions', MIN_PLAYABLE_QUESTIONS).order('title').limit(3);
        }
        if (!quizData.data || quizData.data.length === 0) {
          quizData = await supabase.from('quizzes').select('id, title').is('lc_exam_id', null).eq('exam_name', exam.exam_name).eq('category', 'Mock Test').limit(3);
        }

        if (!resData.data || resData.data.length === 0) {
          const escaped = exam.exam_name.replace(/[%_]/g, (c) => `\\${c}`);
          resData = await supabase.from('resources').select('id, resource_id, title').ilike('exam_name', `%${escaped}%`).limit(3);
        }
        if (!quizData.data || quizData.data.length === 0) {
          const escaped = exam.exam_name.replace(/[%_]/g, (c) => `\\${c}`);
          quizData = await supabase.from('quizzes').select('id, title').is('lc_exam_id', null).ilike('exam_name', `%${escaped}%`).eq('category', 'Mock Test').limit(3);
        }

        if ((!resData.data || resData.data.length === 0) && exam.career_track) {
          let fallbackTerm = exam.exam_name.split(' ')[0];
          if (exam.career_track === 'POLICE_CAPF') fallbackTerm = 'Constable';
          else if (exam.career_track === 'SSC') fallbackTerm = 'SSC';
          else if (exam.career_track === 'RAILWAYS') fallbackTerm = 'RRB';
          else if (exam.career_track === 'BANKING') fallbackTerm = 'IBPS';
          else if (exam.career_track === 'DEFENCE') fallbackTerm = 'Defence';

          resData = await supabase.from('resources').select('id, resource_id, title').ilike('exam_name', `%${fallbackTerm}%`).limit(3);
          quizData = await supabase.from('quizzes').select('id, title').is('lc_exam_id', null).ilike('exam_name', `%${fallbackTerm}%`).eq('category', 'Mock Test').limit(3);
        }

        if (mounted) {
          setResources(resData.data || []);
          setQuizzes(quizData.data || []);
        }
      } catch (err) {
        console.error('Error fetching prep materials:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    if (exam?.exam_name) fetchPrepData();
    return () => { mounted = false; };
  }, [exam]);

  if (loading) {
    return (
      <div className="pr-prep-drawer">
        <div className="pr-prep-loading"><RefreshCw className="pr-spin" size={16} /> Loading study materials…</div>
      </div>
    );
  }

  if (resources.length === 0 && quizzes.length === 0) {
    return (
      <div className="pr-prep-drawer">
        <p className="pr-prep-empty">General syllabus guides and mock tests are available in the Learning Center.</p>
      </div>
    );
  }

  return (
    <div className="pr-prep-drawer">
      <div className="pr-prep-cols">
        <div>
          <div className="pr-prep-col-title"><BookOpen size={13} /> STUDY GUIDES</div>
          <div className="pr-prep-links">
            {resources.length === 0 && <span className="pr-prep-none">Coming soon</span>}
            {resources.map(res => (
              <Link key={res.id} to={`/reader/${res.resource_id}`} state={{ from: window.location.pathname + window.location.search }} className="pr-prep-link">
                <FileText size={13} /> <span>{res.title}</span>
              </Link>
            ))}
          </div>
        </div>
        <div>
          <div className="pr-prep-col-title"><PlayCircle size={13} /> MOCK TESTS</div>
          <div className="pr-prep-links">
            {quizzes.length === 0 && <span className="pr-prep-none">Coming soon</span>}
            {quizzes.map(quiz => (
              <Link key={quiz.id} to={`/quiz/${quiz.id}`} className="pr-prep-link">
                <PlayCircle size={13} /> <span>{quiz.title}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

function computeDynamicVeerScore(profile, recommendations = []) {
  // Compute data-driven multi-pillar readiness score (realistic 79–93 band, never static 100)
  let servicePts = 14;
  const char = (profile?.characterOnDischarge || '').toLowerCase();
  if (char.includes('exemplary')) servicePts += 4;
  else if (char.includes('very good')) servicePts += 2;
  if (Array.isArray(profile?.militaryCourses) && profile.militaryCourses.length > 0) {
    servicePts += Math.min(2, profile.militaryCourses.length);
  }

  let tradePts = 18;
  const trade = (profile?.armCorpsTrade || profile?.trade || '').toLowerCase();
  if (trade && !trade.includes('general duty')) {
    tradePts += 4;
  } else {
    tradePts += 1;
  }
  if (Array.isArray(profile?.specificSkills) && profile.specificSkills.length > 0) {
    tradePts += Math.min(2, profile.specificSkills.length);
  }

  let eduPts = 13;
  const qual = (profile?.highestQualification || profile?.qualification || '').toLowerCase();
  if (qual.includes('post-graduate')) eduPts = 18;
  else if (qual.includes('graduate')) eduPts = 16;
  else if (qual.includes('12')) eduPts = 14;
  else eduPts = 12;

  if (profile?.mathInClass12) eduPts += 1;
  const eng = (profile?.englishComfort || '').toLowerCase();
  if (eng.includes('fluent')) eduPts += 2;
  else if (eng.includes('intermediate')) eduPts += 1;

  let physPts = 14;
  if ((profile?.medicalCategory || 'SHAPE-1').includes('SHAPE-1')) physPts += 2;
  const phys = (profile?.physicalProficiency || '').toLowerCase();
  if (phys.includes('excellent')) physPts += 2;
  else if (phys.includes('good')) physPts += 1;

  let recsPts = 12;
  if (recommendations && recommendations.length > 0) {
    recsPts = Math.min(16, 10 + Math.round(recommendations.length / 4));
  }

  const rawTotal = servicePts + tradePts + eduPts + physPts + recsPts;
  return Math.max(78, Math.min(93, rawTotal));
}

const ProfilingResults = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [recommendations, setRecommendations] = useState([]);
  const [veerScore, setVeerScore] = useState(null);
  const [fullName, setFullName] = useState('');
  const [rawProfile, setRawProfile] = useState(null);
  const [pointsAwarded, setPointsAwarded] = useState(0);
  const [pointsBalance, setPointsBalance] = useState(null);
  const [preparingExamId, setPreparingExamId] = useState(null);
  const [selectedJobModal, setSelectedJobModal] = useState(null);
  const [effectiveTier, setEffectiveTier] = useState(() => isTesterModeActive() ? 'TESTER' : 'FREE');
  const [recommendedJobs10, setRecommendedJobs10] = useState([]);
  const [activeTab, setActiveTab] = useState('roadmap'); // 'roadmap' | 'jobs' | 'exams'
  const [jobCategoryFilter, setJobCategoryFilter] = useState('ALL');
  const [expandedPrepExamId, setExpandedPrepExamId] = useState(null);

  const handleStartPreparing = async (rec) => {
    const targetId = rec?.lc_exam_id || rec?.exam_id;
    if (!targetId && !rec?.exam_name) return;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      navigate('/login');
      return;
    }
    setPreparingExamId(targetId || rec.exam_name);
    let resolvedLcId = rec.lc_exam_id || null;
    try {
      if (!resolvedLcId && rec.exam_name) {
        const cleanName = rec.exam_name.replace(/\([^)]*\)/g, '').trim();
        const { data: lcMatches } = await supabase
          .from('lc_exams')
          .select('id, name, region:lc_regions(name, level)')
          .ilike('name', `%${cleanName || rec.exam_name}%`)
          .limit(10);
        if (lcMatches && lcMatches.length > 0) {
          const targetState = (rec.state_ut || '').toLowerCase().trim();
          const exact = lcMatches.find((m) => m.name.toLowerCase() === rec.exam_name.toLowerCase());
          const stateMatch = targetState
            ? lcMatches.find((m) => (m.region?.name || '').toLowerCase() === targetState)
            : null;
          resolvedLcId = (stateMatch || exact || lcMatches[0]).id;
        }
      }
      if (resolvedLcId) {
        await supabase.rpc('set_primary_exam_target', { p_exam_id: resolvedLcId });
      }
    } catch (err) {
      console.warn('Could not save exam target:', err);
    } finally {
      setPreparingExamId(null);
      if (resolvedLcId) {
        navigate(`/learning-center?exam=${encodeURIComponent(resolvedLcId)}`);
      } else if (rec.exam_name) {
        navigate(`/learning-center?exam=${encodeURIComponent(rec.exam_name)}`);
      } else {
        navigate('/learning-center');
      }
    }
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const { data: { session: currentSession } } = await supabase.auth.getSession();

        // Try loading local draft as fallback if not authenticated or profile row missing
        let localDraftProfile = null;
        try {
          const savedDraft = localStorage.getItem('veernxt_profiling_draft_v1');
          if (savedDraft) {
            localDraftProfile = JSON.parse(savedDraft)?.data?.formData || null;
          }
        } catch (_) {}

        let liveJobs = [];
        try {
          const jobsRes = await axios.get('/api/jobs-v2');
          if (jobsRes.data?.ok && Array.isArray(jobsRes.data.jobs)) {
            liveJobs = jobsRes.data.jobs;
          }
        } catch (jobsErr) {
          console.warn('Jobs_v2 fetch in profiling results warning:', jobsErr.message);
        }

        let resolvedProfileData = location.state?.profileSummary || localDraftProfile || null;
        let resolvedRecs = location.state?.recommendations || [];
        let resolvedScore = location.state?.summary?.overall_match_score != null
          ? Math.round(location.state.summary.overall_match_score)
          : null;

        if (currentSession?.user) {
          const { data: profile } = await supabase
            .from('user_profiles')
            .select('subscription_tier, subscription_expires_at, full_name, recommendations, veer_score, raw_profile_data')
            .eq('id', currentSession.user.id)
            .maybeSingle();

          if (profile) {
            setFullName(profile.full_name || profile.raw_profile_data?.fullName || '');
            resolvedProfileData = profile.raw_profile_data || resolvedProfileData || profile;
            setRawProfile(resolvedProfileData);
            setEffectiveTier(isTesterModeActive() ? 'TESTER' : getEffectiveTier(profile.subscription_tier, profile.subscription_expires_at));

            if (!resolvedRecs.length && Array.isArray(profile.recommendations)) {
              resolvedRecs = profile.recommendations;
            }
            if (resolvedScore == null && profile.veer_score != null) {
              resolvedScore = profile.veer_score;
            }

            if (location.state?.pointsAwarded != null) {
              setPointsAwarded(location.state.pointsAwarded);
              setPointsBalance(location.state.pointsBalance);
            } else {
              try {
                const { data: pointsData } = await supabase
                  .from('user_profiles')
                  .select('points_balance')
                  .eq('id', currentSession.user.id)
                  .maybeSingle();
                if (pointsData && pointsData.points_balance != null) {
                  setPointsBalance(pointsData.points_balance);
                }
              } catch (_) {}
            }
          }
        }

        if (!rawProfile && resolvedProfileData) {
          setRawProfile(resolvedProfileData);
          if (!fullName && (resolvedProfileData.fullName || resolvedProfileData.name)) {
            setFullName(resolvedProfileData.fullName || resolvedProfileData.name);
          }
        }

        const enrichedRecs = resolvedRecs.map(rec => ({
          ...rec,
          matchedJobsV2: matchJobsV2ForExam(liveJobs, rec)
        }));

        setRecommendations(enrichedRecs);
        const dynamicCalculated = computeDynamicVeerScore(resolvedProfileData, enrichedRecs);
        const calibratedScore = (resolvedScore != null && resolvedScore < 98 && resolvedScore >= 70)
          ? resolvedScore
          : dynamicCalculated;
        setVeerScore(calibratedScore);

        // Always compute 10 recommended jobs for the candidate
        const top10Jobs = getTop10RecommendedJobs(liveJobs, enrichedRecs, resolvedProfileData || {});
        setRecommendedJobs10(top10Jobs);
      } catch (err) {
        console.error('Error loading profiling results:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state]);

  if (loading) {
    return (
      <div className="pr-loading">
        <div className="pr-loading-box">
          <RefreshCw className="pr-spin" size={32} color="var(--ios-olive)" />
          <p>Compiling your VeerScore, Top 10 Job Matches &amp; Eligible Exams…</p>
        </div>
      </div>
    );
  }

  const topExams = recommendations.slice(0, 10);
  const insights = rawProfile ? getProfilingInsights(rawProfile, { context: 'results' }) : [];
  const careerDirection = insights.find((i) => i.label === 'Career Alignment');
  const topStrengths = insights.filter((i) => i.label !== 'Career Alignment').slice(0, 4);
  const transferableSkills = rawProfile ? getTransferableSkills(rawProfile) : [
    'Leadership and team coordination under high-pressure operations',
    'Structured execution of mission-critical protocols and SOPs',
    'Crisis response, discipline, and operational readiness',
  ];
  const pathsCount = location.state?.totalEligible ?? (recommendations.length || 24);
  const skillGaps = location.state?.skillGaps || [];

  const displayScore = veerScore != null ? Math.min(100, Math.max(0, veerScore)) : 88;
  const readinessLabel = displayScore >= 85 ? 'ELITE READINESS' : displayScore >= 70 ? 'HIGH READINESS' : 'SOLID FOUNDATION';
  const circumference = 2 * Math.PI * 52;
  const strokeDashoffset = circumference - (displayScore / 100) * circumference;

  const servicePhase = rawProfile?.servicePhase || 'Agniveer / Veteran';
  const serviceBranch = rawProfile?.serviceBranch || rawProfile?.branch || 'Armed Forces';
  const armCorpsTrade = rawProfile?.armCorpsTrade || rawProfile?.trade || 'General Duty';
  const roleAppointment = rawProfile?.roleAppointment || rawProfile?.rank || '';
  const qualification = rawProfile?.highestQualification || rawProfile?.qualification || 'Class 12 / Graduate';
  const domicile = rawProfile?.stateOfDomicile || rawProfile?.domicile || 'All India';

  const filteredJobs = recommendedJobs10.filter(job => {
    if (jobCategoryFilter === 'ALL') return true;
    const t = `${job._trackLabel || ''} ${job.career_track || ''} ${job.title || ''}`.toUpperCase();
    if (jobCategoryFilter === 'CAPF_SECURITY') return /POLICE|CAPF|SECURITY|DEFENCE|FIRE/.test(t);
    if (jobCategoryFilter === 'PSU_GOVT') return /PSU|SSC|CENTRAL|STATE|GOVT|RAILWAY|METRO/.test(t);
    if (jobCategoryFilter === 'TECH_ENG') return /ENGINEER|TECH|TELECOM|IT|CYBER|MARINE|FLEET|TRANSPORT/.test(t);
    if (jobCategoryFilter === 'BANK_CORP') return /BANK|ADMIN|LOGISTICS|OPERATIONS|CORPORATE|HEALTH|TRAINING/.test(t);
    return true;
  });

  const handleOpenJobModal = (job) => {
    setSelectedJobModal({
      ...job,
      title: job.title,
      career_track: job._trackLabel || job.career_track || 'CAREER MATCH',
      ai_description: job.ai_description || `Recommended for your ${serviceBranch} (${armCorpsTrade}) background. Expected compensation: ${job.salary || 'As per pay matrix'}.`,
    });
  };

  return (
    <div className="pr-page">
      {/* ─── ZONE 1: TACTICAL DOSSIER EXECUTIVE HERO ─── */}
      <motion.section
        className="pr-hero"
        initial={{ opacity: 0, y: -14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
      >
        <div className="pr-hero-left">
          <div className="pr-hero-badges">
            <span className="pr-dossier-pill">
              <Shield size={13} /> MILITARY-TO-CIVILIAN CAREER DOSSIER
            </span>
            {(pointsAwarded > 0 || pointsBalance != null) && (
              <span className="pr-points-pill">
                <Sparkles size={13} />
                {pointsAwarded > 0 && <strong>+{pointsAwarded} pts</strong>}
                {pointsBalance != null && <span>({pointsBalance.toLocaleString()} total)</span>}
              </span>
            )}
          </div>

          <h1 className="pr-hero-title">
            Jai Hind{fullName ? `, ${fullName.split(' ')[0]}` : ''}! Your Career Transition Roadmap is Ready.
          </h1>
          <p className="pr-hero-sub">
            We evaluated your service record, branch specialisation, physical standards, and preferences to curate your <strong>Top 10 Recommended Jobs</strong> and <strong>TopMatched Government Exams</strong>.
          </p>

          {/* Service Identity Strip */}
          <div className="pr-identity-strip">
            <div className="pr-id-chip">
              <span className="pr-id-label">STATUS</span>
              <span className="pr-id-val">{servicePhase}</span>
            </div>
            <div className="pr-id-chip">
              <span className="pr-id-label">FORCE / BRANCH</span>
              <span className="pr-id-val">{serviceBranch}</span>
            </div>
            <div className="pr-id-chip">
              <span className="pr-id-label">ARM / WING</span>
              <span className="pr-id-val">{armCorpsTrade}</span>
            </div>
            {roleAppointment && (
              <div className="pr-id-chip">
                <span className="pr-id-label">ROLE / TRADE</span>
                <span className="pr-id-val">{roleAppointment}</span>
              </div>
            )}
            <div className="pr-id-chip">
              <span className="pr-id-label">EDUCATION</span>
              <span className="pr-id-val">{qualification}</span>
            </div>
            <div className="pr-id-chip">
              <span className="pr-id-label">DOMICILE</span>
              <span className="pr-id-val">{domicile}</span>
            </div>
          </div>

          {/* Quick Hero Actions */}
          <div className="pr-hero-actions">
            <button
              type="button"
              className="pr-btn-gold"
              onClick={() => {
                setActiveTab('jobs');
                document.getElementById('pr-workspace')?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              <Briefcase size={16} /> View 10 Recommended Jobs
            </button>
            <button
              type="button"
              className="pr-btn-glass"
              onClick={() => {
                setActiveTab('exams');
                document.getElementById('pr-workspace')?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              <Target size={16} /> View Top Exam Matches ({topExams.length})
            </button>
            <Link to="/profiling" className="pr-btn-glass">
              <RefreshCw size={15} /> Edit Profile
            </Link>
          </div>
        </div>

        {/* Right Side: Radial VeerScore & Telemetry */}
        <div className="pr-hero-right">
          <div className="pr-score-widget">
            <div className="pr-score-header">
              <span className="pr-score-tag"><Award size={14} /> VEER READINESS SCORE</span>
              <span className="pr-readiness-tier">{readinessLabel}</span>
            </div>

            <div className="pr-gauge-row">
              <div className="pr-gauge-wrap">
                <svg width="124" height="124" viewBox="0 0 124 124">
                  <circle
                    cx="62"
                    cy="62"
                    r="52"
                    fill="none"
                    stroke="rgba(255, 255, 255, 0.14)"
                    strokeWidth="10"
                  />
                  <circle
                    cx="62"
                    cy="62"
                    r="52"
                    fill="none"
                    stroke="#d9f99d"
                    strokeWidth="10"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    transform="rotate(-90 62 62)"
                    style={{ transition: 'stroke-dashoffset 0.8s ease-out' }}
                  />
                </svg>
                <div className="pr-gauge-center">
                  <span className="pr-gauge-num">{displayScore}</span>
                  <span className="pr-gauge-max">/ 100</span>
                </div>
              </div>

              <div className="pr-telemetry-col">
                <div className="pr-telemetry-item">
                  <span className="pr-tel-num">{recommendedJobs10.length}</span>
                  <span className="pr-tel-label">Recommended Jobs</span>
                </div>
                <div className="pr-telemetry-item">
                  <span className="pr-tel-num">{pathsCount}</span>
                  <span className="pr-tel-label">Eligible Govt Exams</span>
                </div>
                <div className="pr-telemetry-item">
                  <span className="pr-tel-num">{transferableSkills.length}</span>
                  <span className="pr-tel-label">Core Military Skills</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.section>

      {/* ─── ZONE 2: 3-COLUMN TACTICAL INTELLIGENCE BENTO GRID ─── */}
      <motion.section
        className="pr-bento-grid"
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.08 }}
      >
        {/* Bento 1: Top Service Strengths */}
        <Card className="pr-bento-card">
          <div className="pr-bento-head">
            <div className="pr-bento-icon"><CheckCircle2 size={18} /></div>
            <div>
              <span className="pr-bento-eyebrow">PROFILE ADVANTAGES</span>
              <h3 className="pr-bento-title">Your Core Service Strengths</h3>
            </div>
          </div>
          {topStrengths.length > 0 ? (
            <div className="pr-strengths-list">
              {topStrengths.map((s, i) => (
                <div key={i} className="pr-strength-item">
                  <div className="pr-strength-dot" />
                  <div>
                    <strong>{s.label}:</strong> <span>{s.detail}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="pr-strengths-list">
              <div className="pr-strength-item">
                <div className="pr-strength-dot" />
                <div><strong>ESM &amp; Agniveer Reservation:</strong> Eligible for horizontal reservation and age relaxation across CAPF, State Police, Railways, and PSU Banks.</div>
              </div>
              <div className="pr-strength-item">
                <div className="pr-strength-dot" />
                <div><strong>Operational Trade Fit:</strong> Your {armCorpsTrade} background maps directly to high-demand technical and security cadres.</div>
              </div>
            </div>
          )}
        </Card>

        {/* Bento 2: Transferable Skills & Career Direction */}
        <Card className="pr-bento-card">
          <div className="pr-bento-head">
            <div className="pr-bento-icon"><Compass size={18} /></div>
            <div>
              <span className="pr-bento-eyebrow">CIVILIAN EQUIVALENCY</span>
              <h3 className="pr-bento-title">Transferable Skills &amp; Alignment</h3>
            </div>
          </div>
          {careerDirection?.detail && (
            <p className="pr-direction-box">{careerDirection.detail}</p>
          )}
          <div className="pr-skill-tags">
            {transferableSkills.map((skill, i) => (
              <div key={i} className="pr-skill-pill">
                <CheckCircle2 size={13} color="var(--ios-olive)" style={{ flexShrink: 0, marginTop: '2px' }} />
                <span>{skill}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Bento 3: Action Playbook & Focus Areas */}
        <Card className="pr-bento-card">
          <div className="pr-bento-head">
            <div className="pr-bento-icon"><TrendingUp size={18} /></div>
            <div>
              <span className="pr-bento-eyebrow">NEXT MILESTONES</span>
              <h3 className="pr-bento-title">Where to Focus Next</h3>
            </div>
          </div>
          {skillGaps.length > 0 ? (
            <div className="pr-gaps-stack">
              {skillGaps.map((gap, i) => (
                <div key={i} className="pr-gap-box">
                  <div className="pr-gap-title"><AlertCircle size={14} /> {gap.label}</div>
                  <p>{gap.detail}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="pr-playbook-list">
              <div
                className="pr-playbook-step"
                style={{ cursor: 'pointer' }}
                onClick={() => {
                  setActiveTab('exams');
                  document.getElementById('pr-workspace')?.scrollIntoView({ behavior: 'smooth' });
                }}
              >
                <span className="pr-step-num">01</span>
                <div>
                  <strong>Lock Your #1 Exam Target</strong>
                  <p>Click &ldquo;Start Preparing&rdquo; on your top matched exam to unlock syllabus books &amp; mock tests.</p>
                </div>
              </div>
              <div
                className="pr-playbook-step"
                style={{ cursor: 'pointer' }}
                onClick={() => {
                  setActiveTab('jobs');
                  document.getElementById('pr-workspace')?.scrollIntoView({ behavior: 'smooth' });
                }}
              >
                <span className="pr-step-num">02</span>
                <div>
                  <strong>Apply to Top 10 Recommended Jobs</strong>
                  <p>Prioritize roles with 10%–20% Agniveer/ESM horizontal reservation and direct trade equivalence.</p>
                </div>
              </div>
              <Link to="/cv" className="pr-playbook-step" style={{ textDecoration: 'none', color: 'inherit' }}>
                <span className="pr-step-num">03</span>
                <div>
                  <strong>Generate Your Corporate ATS Resume</strong>
                  <p>Translate your military service record into an industry-ready CV in one click.</p>
                </div>
              </Link>
            </div>
          )}
        </Card>
      </motion.section>

      {/* ─── ZONE 3: DUAL WORKSPACE NAVIGATION BAR ─── */}
      <div id="pr-workspace" className="pr-workspace-bar">
        <div className="pr-tabs">
          <button
            type="button"
            className={`pr-tab ${activeTab === 'roadmap' ? 'active' : ''}`}
            onClick={() => setActiveTab('roadmap')}
          >
            <Layers size={16} /> Complete Roadmap
          </button>
          <button
            type="button"
            className={`pr-tab ${activeTab === 'jobs' ? 'active' : ''}`}
            onClick={() => setActiveTab('jobs')}
          >
            <Briefcase size={16} /> 10 Recommended Jobs
            <span className="pr-tab-count">{recommendedJobs10.length}</span>
          </button>
          <button
            type="button"
            className={`pr-tab ${activeTab === 'exams' ? 'active' : ''}`}
            onClick={() => setActiveTab('exams')}
          >
            <Target size={16} /> Top Exam Matches
            <span className="pr-tab-count">{topExams.length}</span>
          </button>
        </div>

        <div className="pr-workspace-hint">
          Showing personalized matches for <strong>{serviceBranch}</strong> • <strong>{armCorpsTrade}</strong>
        </div>
      </div>

      {/* ─── TAB 1: COMPLETE ANIMATED TRANSITION ROADMAP ─── */}
      {activeTab === 'roadmap' && (
        <TransitionRoadmap
          rawProfile={rawProfile}
          onNavigateToJobs={() => {
            setActiveTab('jobs');
            document.getElementById('pr-workspace')?.scrollIntoView({ behavior: 'smooth' });
          }}
          onNavigateToExams={() => {
            setActiveTab('exams');
            document.getElementById('pr-workspace')?.scrollIntoView({ behavior: 'smooth' });
          }}
        />
      )}

      {/* ─── TAB 2: 10 RECOMMENDED JOBS FOR YOUR PROFILE ─── */}
      {activeTab === 'jobs' && (
        <motion.section
          className="pr-section"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
        >
          <div className="pr-section-header">
            <div>
              <div className="pr-section-eyebrow">
                <Briefcase size={14} /> CURATED CAREER &amp; JOB OPPORTUNITIES
              </div>
              <h2 className="pr-section-title">10 Recommended Jobs for Your Profile</h2>
              <p className="pr-section-sub">
                Ranked by trade equivalence ({armCorpsTrade}), Ex-Servicemen/Agniveer quota eligibility, and compensation potential.
              </p>
            </div>

            {/* Category Filter Chips */}
            <div className="pr-filter-pills">
              {[
                { id: 'ALL', label: `All Jobs (${recommendedJobs10.length})` },
                { id: 'CAPF_SECURITY', label: 'Police, CAPF & Security' },
                { id: 'PSU_GOVT', label: 'PSU, Railways & Govt' },
                { id: 'TECH_ENG', label: 'Technical & Fleet' },
                { id: 'BANK_CORP', label: 'Banking & Corporate' },
              ].map(f => (
                <button
                  key={f.id}
                  type="button"
                  className={`pr-filter-pill ${jobCategoryFilter === f.id ? 'active' : ''}`}
                  onClick={() => setJobCategoryFilter(f.id)}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <div className="pr-jobs-grid">
            {filteredJobs.map((job, idx) => {
              const rankNum = job._displayRank || idx + 1;
              const rawScore = job._matchScore || (94 - idx * 2);
              const matchPct = Math.min(95, Math.max(78, Math.round(rawScore > 95 ? 94 - idx * 1.5 : rawScore)));
              const isTop3 = rankNum <= 3;

              return (
                <motion.div
                  key={job.job_id || job.id || job.url || idx}
                  className={`pr-job-card ${isTop3 ? 'pr-job-card-featured' : ''}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, delay: idx * 0.03 }}
                >
                  <div className="pr-job-card-body">
                    <div className="pr-job-top-bar">
                      <div className="pr-job-badges-left">
                        <span className={`pr-rank-pill ${isTop3 ? 'top' : ''}`}>#{rankNum}</span>
                        <span className="pr-track-badge">
                          {TRACK_LABELS[job._trackLabel] || job._trackLabel || 'GOVT & PSU'}
                        </span>
                        {job._isLiveOpening ? (
                          <span className="pr-live-pill"><Zap size={11} /> Live Opening</span>
                        ) : (
                          <span className="pr-role-pill">Trade-Aligned Role</span>
                        )}
                      </div>

                      <div className="pr-match-pill">
                        <span>{matchPct}% Match</span>
                      </div>
                    </div>

                    <h3 className="pr-job-title">{job.title}</h3>

                    <div className="pr-job-org-row">
                      {job.company && (
                        <span><Building2 size={13} /> {job.company}</span>
                      )}
                      {job.location && (
                        <span><MapPin size={13} /> {job.location}</span>
                      )}
                      {job._recommendedExam && (
                        <span><Target size={13} /> Exam: {job._recommendedExam}</span>
                      )}
                    </div>

                    {/* Key Metrics Strip */}
                    <div className="pr-job-metrics">
                      {job.vacancies && (
                        <span className="pr-metric-green">
                          <Users size={12} /> {Number(job.vacancies).toLocaleString()} Vacancies
                        </span>
                      )}
                      {job.salary && (
                        <span className="pr-metric-green">
                          💰 {job.salary}
                        </span>
                      )}
                      {job.last_date ? (
                        <span className="pr-metric-neutral">
                          <Calendar size={12} /> Apply by {new Date(job.last_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                      ) : (
                        <span className="pr-metric-neutral">
                          <CheckCircle2 size={12} /> Year-Round / Quota Entry
                        </span>
                      )}
                    </div>

                    {job.ai_description && (
                      <p className="pr-job-desc">
                        {job.ai_description
                          .replace(/About the Recruitment\s*/i, '')
                          .replace(/Available Posts & Vacancies\s*/i, '')}
                      </p>
                    )}

                    {job._matchReasons && job._matchReasons.length > 0 && (
                      <div className="pr-reason-chips">
                        {job._matchReasons.slice(0, 3).map((reason, i) => (
                          <span key={i} className="pr-reason-chip">{reason}</span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="pr-job-footer">
                    <button
                      type="button"
                      className="pr-job-btn-secondary"
                      onClick={() => handleOpenJobModal(job)}
                    >
                      <FileText size={13} /> Role Brief &amp; Eligibility
                    </button>

                    {job.url ? (
                      <a
                        href={job.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="pr-job-btn-primary"
                      >
                        Official Notice <ExternalLink size={13} />
                      </a>
                    ) : (
                      <Link
                        to="/private-sector/opportunities"
                        className="pr-job-btn-primary"
                      >
                        Explore Openings <ArrowRight size={13} />
                      </Link>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.section>
      )}

      {/* ─── TAB 3: TOP 10 MATCHED GOVERNMENT EXAMS ─── */}
      {activeTab === 'exams' && (
        <motion.section
          className="pr-section"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.05 }}
        >
          <div className="pr-section-header">
            <div>
              <div className="pr-section-eyebrow">
                <Target size={14} /> ELIGIBILITY-VERIFIED EXAM MATCHES
              </div>
              <h2 className="pr-section-title">
                Your Top {topExams.length} Matched Government Exams
              </h2>
              <p className="pr-section-sub">
                Filtered by your age, qualification ({qualification}), physical standards, and Ex-Servicemen quota rules.
              </p>
            </div>
            <Link to="/learning-center" className="pr-link-all">
              Browse Full Exam Catalog <ArrowRight size={14} />
            </Link>
          </div>

          {topExams.length > 0 ? (
            <div className="pr-exams-grid">
              {topExams.map((rec, idx) => {
                const examKey = rec.exam_id || rec.lc_exam_id || idx;
                const basePct = Math.min(95, Math.max(78, Math.round((rec.score || 88) * 0.92 - idx * 1.5 + (rec.breakdown ? Object.keys(rec.breakdown).length * 0.4 : 0))));
                const matchPct = idx === 0 ? Math.min(95, basePct) : Math.min(94 - idx * 2, basePct);
                const factors = topFactors(rec.breakdown, 3);
                const isPrepExpanded = expandedPrepExamId === examKey;
                const isTop3 = idx < 3;

                return (
                  <motion.div
                    key={examKey}
                    className={`pr-exam-card ${isTop3 ? 'pr-exam-card-top' : ''}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25, delay: idx * 0.03 }}
                  >
                    <div className="pr-exam-top">
                      <div className="pr-exam-rank-wrap">
                        <span className={`pr-rank-pill ${isTop3 ? 'top' : ''}`}>#{idx + 1}</span>
                        <span className="pr-track-badge">
                          {TRACK_LABELS[rec.career_track] || rec.career_track || 'CENTRAL GOVT'}
                        </span>
                        {rec.state_ut ? (
                          <span className="pr-level-chip"><MapPin size={11} /> {rec.state_ut}</span>
                        ) : (
                          <span className="pr-level-chip">All India</span>
                        )}
                      </div>

                      <div className="pr-exam-score-block">
                        <span className="pr-exam-score-num">{matchPct}% Match</span>
                        <div className="pr-exam-bar-bg">
                          <div className="pr-exam-bar-fill" style={{ width: `${matchPct}%` }} />
                        </div>
                      </div>
                    </div>

                    <h3 className="pr-exam-title">{rec.exam_name}</h3>
                    {rec.conducting_body && (
                      <div className="pr-exam-body-name">
                        <GraduationCap size={13} /> {rec.conducting_body}
                      </div>
                    )}

                    {factors.length > 0 && (
                      <div className="pr-exam-factors">
                        {factors.map((label, i) => (
                          <span key={i} className="pr-factor-chip">✓ {label}</span>
                        ))}
                      </div>
                    )}

                    {/* Matched Live Openings inside Exam Card */}
                    {rec.matchedJobsV2 && rec.matchedJobsV2.length > 0 && (
                      <div className="pr-exam-live-box">
                        <div className="pr-exam-live-head">
                          <span><Zap size={12} /> {rec.matchedJobsV2.length} Active Notification{rec.matchedJobsV2.length > 1 ? 's' : ''}</span>
                        </div>
                        {rec.matchedJobsV2.slice(0, 2).map((j) => (
                          <div key={j.job_id || j.id || j.url} className="pr-exam-live-row">
                            <span className="pr-exam-live-title">{j.title}</span>
                            <div className="pr-exam-live-btns">
                              <button type="button" onClick={() => handleOpenJobModal(j)}>Brief</button>
                              {j.url && <a href={j.url} target="_blank" rel="noopener noreferrer">Notice ↗</a>}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Expandable Study Guides & Mock Tests Drawer */}
                    {isPrepExpanded && <ExamPrepSection exam={rec} />}

                    <div className="pr-exam-footer">
                      <button
                        type="button"
                        className="pr-exam-prep-toggle"
                        onClick={() => setExpandedPrepExamId(isPrepExpanded ? null : examKey)}
                      >
                        <BookOpen size={13} />
                        {isPrepExpanded ? 'Hide Study Material' : 'Study Guides & Mock Tests'}
                        {isPrepExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                      </button>

                      <div className="pr-exam-cta-group">
                        {rec.website && (
                          <a
                            href={rec.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="pr-exam-ext-link"
                            title="Official Exam Portal"
                          >
                            <ExternalLink size={15} />
                          </a>
                        )}
                        <button
                          type="button"
                          className="pr-exam-start-btn"
                          onClick={() => handleStartPreparing(rec)}
                          disabled={preparingExamId === (rec.lc_exam_id || rec.exam_id)}
                        >
                          {preparingExamId === (rec.lc_exam_id || rec.exam_id) ? (
                            <RefreshCw size={14} className="pr-spin" />
                          ) : (
                            <Rocket size={14} />
                          )}
                          Start Preparing
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <Card className="pr-empty-card">
              <Target size={32} color="var(--ios-olive)" />
              <h3>Complete Your Profiling Questionnaire</h3>
              <p>Answer the service and academic questions so we can compute your exact exam eligibility and rank your top 10 matches.</p>
              <Link to="/profiling" className="pr-exam-start-btn" style={{ textDecoration: 'none', marginTop: '0.75rem' }}>
                Go to Career Profiling <ArrowRight size={14} />
              </Link>
            </Card>
          )}
        </motion.section>
      )}

      {/* ─── ZONE 4: TRANSITION LAUNCHPAD & SUBSCRIPTION ─── */}
      <motion.section
        className="pr-launchpad"
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.1 }}
      >
        <div className="pr-cta-grid">
          <Card as={Link} to="/cv" interactive className="pr-launch-card">
            <div className="pr-launch-icon"><FileText size={22} /></div>
            <div className="pr-launch-body">
              <h4>Build Your ATS Resume</h4>
              <p>Convert your {serviceBranch} service record into a corporate-ready CV.</p>
            </div>
            <ArrowRight size={18} className="pr-launch-arrow" />
          </Card>

          <Card as={Link} to="/learning-center" interactive className="pr-launch-card">
            <div className="pr-launch-icon"><PlayCircle size={22} /></div>
            <div className="pr-launch-body">
              <h4>Learning Center &amp; PYQs</h4>
              <p>Access full textbooks, chapter précis, and mock tests for your matched exams.</p>
            </div>
            <ArrowRight size={18} className="pr-launch-arrow" />
          </Card>

          <Card as={Link} to="/financial-guidance" interactive className="pr-launch-card">
            <div className="pr-launch-icon"><Award size={22} /></div>
            <div className="pr-launch-body">
              <h4>Seva Nidhi &amp; Corpus Planner</h4>
              <p>Get a customized Rupee-level allocation plan and AI Financial Coach briefing.</p>
            </div>
            <ArrowRight size={18} className="pr-launch-arrow" />
          </Card>
        </div>

        {!isTierAtLeast(effectiveTier, 'MONTHLY') && (
          <div className="pr-pro-banner">
            <div className="pr-pro-left">
              <div className="pr-pro-crown"><Crown size={24} /></div>
              <div>
                <h3>Unlock Unlimited Mock Tests, Study Guides &amp; Priority Job Alerts</h3>
                <p>Everything you need to crack your top exam match and transition with confidence.</p>
              </div>
            </div>
            <Link to="/subscribe?from=profiling&plan=ANNUAL" className="pr-pro-btn">
              View Pro Plans <ArrowRight size={16} />
            </Link>
          </div>
        )}
      </motion.section>

      {selectedJobModal && (
        <JobDescriptionModal
          job={selectedJobModal}
          onClose={() => setSelectedJobModal(null)}
        />
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        .pr-loading {
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: calc(100vh - 64px);
          background: var(--ios-bg, #F4F4F8);
        }
        .pr-loading-box {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1rem;
          color: var(--text-secondary);
          font-weight: 600;
        }
        .pr-spin {
          animation: pr-spin-kf 1s linear infinite;
        }
        @keyframes pr-spin-kf {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .pr-page {
          width: 100%;
          max-width: 1380px;
          margin: 0 auto;
          padding: 2rem clamp(1rem, 2.5vw, 2.25rem) 4rem;
        }

        /* ─── ZONE 1: HERO ─── */
        .pr-hero {
          display: grid;
          grid-template-columns: 1.55fr 1fr;
          gap: 2rem;
          align-items: center;
          background: linear-gradient(135deg, #132a17 0%, #1e3f23 55%, #2d5530 100%);
          border-radius: 20px;
          padding: clamp(1.5rem, 3vw, 2.5rem);
          color: #ffffff;
          box-shadow: 0 16px 40px rgba(15, 38, 20, 0.18);
          margin-bottom: 1.75rem;
          position: relative;
          overflow: hidden;
        }
        .pr-hero-badges {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 0.65rem;
          margin-bottom: 0.9rem;
        }
        .pr-dossier-pill {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          font-size: 0.72rem;
          font-weight: 800;
          letter-spacing: 0.06em;
          padding: 0.35rem 0.75rem;
          border-radius: 999px;
          background: rgba(217, 249, 157, 0.16);
          border: 1px solid rgba(217, 249, 157, 0.35);
          color: #d9f99d;
        }
        .pr-points-pill {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          font-size: 0.75rem;
          padding: 0.32rem 0.75rem;
          border-radius: 999px;
          background: rgba(251, 191, 36, 0.18);
          border: 1px solid rgba(251, 191, 36, 0.45);
          color: #fde68a;
        }
        .pr-hero-title {
          font-size: clamp(1.5rem, 2.4vw, 2.15rem);
          font-weight: 800;
          line-height: 1.22;
          margin: 0 0 0.65rem;
          color: #ffffff;
          letter-spacing: -0.015em;
        }
        .pr-hero-sub {
          font-size: 0.95rem;
          line-height: 1.55;
          color: rgba(255, 255, 255, 0.84);
          margin: 0 0 1.25rem;
          max-width: 680px;
        }
        .pr-identity-strip {
          display: flex;
          flex-wrap: wrap;
          gap: 0.55rem;
          margin-bottom: 1.4rem;
        }
        .pr-id-chip {
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.16);
          border-radius: 10px;
          padding: 0.4rem 0.75rem;
          display: flex;
          flex-direction: column;
          gap: 0.1rem;
        }
        .pr-id-label {
          font-size: 0.62rem;
          font-weight: 700;
          letter-spacing: 0.05em;
          color: rgba(255, 255, 255, 0.6);
        }
        .pr-id-val {
          font-size: 0.8rem;
          font-weight: 700;
          color: #ffffff;
        }
        .pr-hero-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 0.65rem;
        }
        .pr-btn-gold {
          display: inline-flex;
          align-items: center;
          gap: 0.45rem;
          background: #d9f99d;
          color: #132a17;
          border: none;
          border-radius: 10px;
          padding: 0.68rem 1.15rem;
          font-size: 0.84rem;
          font-weight: 800;
          cursor: pointer;
          transition: transform 0.15s ease, box-shadow 0.15s ease;
        }
        .pr-btn-gold:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
        }
        .pr-btn-glass {
          display: inline-flex;
          align-items: center;
          gap: 0.45rem;
          background: rgba(255, 255, 255, 0.12);
          color: #ffffff;
          border: 1px solid rgba(255, 255, 255, 0.25);
          border-radius: 10px;
          padding: 0.65rem 1.05rem;
          font-size: 0.83rem;
          font-weight: 700;
          text-decoration: none;
          cursor: pointer;
          transition: background 0.15s ease;
        }
        .pr-btn-glass:hover {
          background: rgba(255, 255, 255, 0.2);
        }

        /* VeerScore Right Card */
        .pr-score-widget {
          background: rgba(0, 0, 0, 0.22);
          border: 1px solid rgba(255, 255, 255, 0.16);
          border-radius: 16px;
          padding: 1.35rem 1.5rem;
          backdrop-filter: blur(8px);
        }
        .pr-score-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 1.1rem;
          gap: 0.5rem;
        }
        .pr-score-tag {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          font-size: 0.72rem;
          font-weight: 800;
          letter-spacing: 0.05em;
          color: rgba(255, 255, 255, 0.85);
        }
        .pr-readiness-tier {
          font-size: 0.68rem;
          font-weight: 800;
          padding: 0.22rem 0.6rem;
          border-radius: 999px;
          background: rgba(217, 249, 157, 0.2);
          color: #d9f99d;
          letter-spacing: 0.04em;
        }
        .pr-gauge-row {
          display: flex;
          align-items: center;
          gap: 1.35rem;
        }
        .pr-gauge-wrap {
          position: relative;
          width: 124px;
          height: 124px;
          flex-shrink: 0;
        }
        .pr-gauge-center {
          position: absolute;
          inset: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }
        .pr-gauge-num {
          font-size: 2.2rem;
          font-weight: 900;
          line-height: 1;
          color: #ffffff;
        }
        .pr-gauge-max {
          font-size: 0.72rem;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.65);
          margin-top: 2px;
        }
        .pr-telemetry-col {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 0.55rem;
        }
        .pr-telemetry-item {
          background: rgba(255, 255, 255, 0.07);
          border-radius: 10px;
          padding: 0.45rem 0.85rem;
          display: flex;
          align-items: baseline;
          justify-content: space-between;
        }
        .pr-tel-num {
          font-size: 1.25rem;
          font-weight: 800;
          color: #d9f99d;
        }
        .pr-tel-label {
          font-size: 0.75rem;
          color: rgba(255, 255, 255, 0.8);
          font-weight: 600;
        }

        /* ─── ZONE 2: BENTO GRID ─── */
        .pr-bento-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1.25rem;
          margin-bottom: 2rem;
        }
        .pr-bento-card {
          display: flex;
          flex-direction: column;
          padding: 1.35rem;
          border-radius: 16px;
        }
        .pr-bento-head {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 1rem;
        }
        .pr-bento-icon {
          width: 38px;
          height: 38px;
          border-radius: 10px;
          background: rgba(75, 107, 50, 0.12);
          color: var(--ios-olive);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .pr-bento-eyebrow {
          font-size: 0.65rem;
          font-weight: 800;
          letter-spacing: 0.06em;
          color: var(--ios-olive);
          display: block;
        }
        .pr-bento-title {
          font-size: 1.02rem;
          font-weight: 800;
          margin: 0;
          color: var(--ios-text);
        }
        .pr-strengths-list {
          display: flex;
          flex-direction: column;
          gap: 0.65rem;
        }
        .pr-strength-item {
          display: flex;
          align-items: flex-start;
          gap: 0.6rem;
          font-size: 0.83rem;
          line-height: 1.48;
          color: var(--text-secondary);
        }
        .pr-strength-item strong {
          color: var(--ios-text);
        }
        .pr-strength-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: var(--ios-olive);
          margin-top: 6px;
          flex-shrink: 0;
        }
        .pr-direction-box {
          font-size: 0.81rem;
          line-height: 1.45;
          color: var(--text-secondary);
          background: var(--surface-alt);
          padding: 0.65rem 0.85rem;
          border-radius: 10px;
          margin: 0 0 0.8rem;
          border-left: 3px solid var(--ios-olive);
        }
        .pr-skill-tags {
          display: flex;
          flex-direction: column;
          gap: 0.45rem;
        }
        .pr-skill-pill {
          display: flex;
          align-items: flex-start;
          gap: 0.45rem;
          font-size: 0.81rem;
          line-height: 1.4;
          color: var(--ios-text);
          background: var(--surface-alt);
          padding: 0.45rem 0.7rem;
          border-radius: 8px;
          font-weight: 600;
        }
        .pr-playbook-list {
          display: flex;
          flex-direction: column;
          gap: 0.65rem;
        }
        .pr-playbook-step {
          display: flex;
          align-items: flex-start;
          gap: 0.7rem;
          background: var(--surface-alt);
          padding: 0.6rem 0.75rem;
          border-radius: 10px;
        }
        .pr-step-num {
          font-size: 0.72rem;
          font-weight: 900;
          background: var(--ios-olive);
          color: #ffffff;
          padding: 0.2rem 0.45rem;
          border-radius: 6px;
          flex-shrink: 0;
        }
        .pr-playbook-step strong {
          font-size: 0.82rem;
          color: var(--ios-text);
          display: block;
        }
        .pr-playbook-step p {
          font-size: 0.76rem;
          color: var(--text-secondary);
          margin: 0.15rem 0 0;
          line-height: 1.4;
        }
        .pr-gaps-stack {
          display: flex;
          flex-direction: column;
          gap: 0.65rem;
        }
        .pr-gap-box {
          background: var(--warning-bg);
          padding: 0.7rem 0.85rem;
          border-radius: 10px;
        }
        .pr-gap-title {
          display: flex;
          align-items: center;
          gap: 0.35rem;
          font-size: 0.82rem;
          font-weight: 800;
          color: var(--warning);
        }
        .pr-gap-box p {
          margin: 0.25rem 0 0;
          font-size: 0.78rem;
          color: var(--text-secondary);
          line-height: 1.42;
        }

        /* ─── ZONE 3: WORKSPACE TABS ─── */
        .pr-workspace-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 1rem;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 14px;
          padding: 0.75rem 1.1rem;
          margin-bottom: 1.75rem;
          box-shadow: var(--shadow-1);
        }
        .pr-tabs {
          display: flex;
          flex-wrap: wrap;
          gap: 0.45rem;
        }
        .pr-tab {
          display: inline-flex;
          align-items: center;
          gap: 0.45rem;
          padding: 0.55rem 1rem;
          border-radius: 10px;
          border: 1px solid transparent;
          background: transparent;
          color: var(--text-secondary);
          font-size: 0.85rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .pr-tab:hover {
          background: var(--surface-alt);
          color: var(--ios-text);
        }
        .pr-tab.active {
          background: var(--ios-olive);
          color: #ffffff;
        }
        .pr-tab-count {
          font-size: 0.72rem;
          font-weight: 800;
          padding: 0.1rem 0.45rem;
          border-radius: 999px;
          background: rgba(0, 0, 0, 0.15);
        }
        .pr-workspace-hint {
          font-size: 0.8rem;
          color: var(--text-secondary);
        }

        /* ─── SECTIONS & HEADERS ─── */
        .pr-section {
          margin-bottom: 2.5rem;
        }
        .pr-section-header {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 1rem;
          margin-bottom: 1.25rem;
        }
        .pr-section-eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          font-size: 0.72rem;
          font-weight: 800;
          letter-spacing: 0.06em;
          color: var(--ios-olive);
          margin-bottom: 0.25rem;
        }
        .pr-section-title {
          font-size: 1.45rem;
          font-weight: 800;
          margin: 0 0 0.25rem;
          color: var(--ios-text);
        }
        .pr-section-sub {
          font-size: 0.88rem;
          color: var(--text-secondary);
          margin: 0;
        }
        .pr-filter-pills {
          display: flex;
          flex-wrap: wrap;
          gap: 0.4rem;
        }
        .pr-filter-pill {
          padding: 0.42rem 0.85rem;
          border-radius: 999px;
          border: 1px solid var(--border-strong);
          background: var(--surface);
          color: var(--text-secondary);
          font-size: 0.76rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .pr-filter-pill:hover {
          border-color: var(--ios-olive);
          color: var(--ios-olive);
        }
        .pr-filter-pill.active {
          background: var(--ios-olive);
          border-color: var(--ios-olive);
          color: #ffffff;
        }
        .pr-link-all {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          font-size: 0.84rem;
          font-weight: 700;
          color: var(--ios-olive);
          text-decoration: none;
        }
        .pr-link-all:hover {
          text-decoration: underline;
        }

        /* ─── 10 RECOMMENDED JOBS 2-COLUMN GRID ─── */
        .pr-jobs-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1.15rem;
        }
        .pr-job-card {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 16px;
          padding: 1.25rem;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          box-shadow: var(--shadow-1);
          transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
        }
        .pr-job-card:hover {
          transform: translateY(-2px);
          box-shadow: var(--shadow-2);
          border-color: rgba(75, 107, 50, 0.35);
        }
        .pr-job-card-featured {
          border-left: 4px solid var(--ios-olive);
        }
        .pr-job-top-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.5rem;
          margin-bottom: 0.65rem;
          flex-wrap: wrap;
        }
        .pr-job-badges-left {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          flex-wrap: wrap;
        }
        .pr-rank-pill {
          font-size: 0.72rem;
          font-weight: 900;
          padding: 0.18rem 0.55rem;
          border-radius: 6px;
          background: var(--surface-alt);
          color: var(--ios-text);
        }
        .pr-rank-pill.top {
          background: var(--ios-olive);
          color: #ffffff;
        }
        .pr-track-badge {
          font-size: 0.68rem;
          font-weight: 800;
          letter-spacing: 0.03em;
          padding: 0.2rem 0.55rem;
          border-radius: 6px;
          background: rgba(75, 107, 50, 0.1);
          color: var(--ios-olive);
          text-transform: uppercase;
        }
        .pr-live-pill {
          display: inline-flex;
          align-items: center;
          gap: 3px;
          font-size: 0.68rem;
          font-weight: 700;
          padding: 0.18rem 0.5rem;
          border-radius: 6px;
          background: #dcfce7;
          color: #166534;
        }
        .pr-role-pill {
          font-size: 0.68rem;
          font-weight: 700;
          padding: 0.18rem 0.5rem;
          border-radius: 6px;
          background: #e0f2fe;
          color: #075985;
        }
        .pr-match-pill {
          font-size: 0.76rem;
          font-weight: 800;
          padding: 0.22rem 0.65rem;
          border-radius: 999px;
          background: #f0fdf4;
          color: #15803d;
          border: 1px solid #bbf7d0;
        }
        .pr-job-title {
          font-size: 1.05rem;
          font-weight: 800;
          color: var(--ios-text);
          margin: 0 0 0.4rem;
          line-height: 1.35;
        }
        .pr-job-org-row {
          display: flex;
          flex-wrap: wrap;
          gap: 0.85rem;
          font-size: 0.78rem;
          color: var(--text-secondary);
          margin-bottom: 0.65rem;
        }
        .pr-job-org-row span {
          display: inline-flex;
          align-items: center;
          gap: 0.3rem;
        }
        .pr-job-metrics {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
          margin-bottom: 0.65rem;
        }
        .pr-metric-green {
          display: inline-flex;
          align-items: center;
          gap: 0.3rem;
          font-size: 0.75rem;
          font-weight: 700;
          color: #166534;
          background: #f0fdf4;
          padding: 0.22rem 0.6rem;
          border-radius: 6px;
        }
        .pr-metric-neutral {
          display: inline-flex;
          align-items: center;
          gap: 0.3rem;
          font-size: 0.74rem;
          font-weight: 600;
          color: var(--text-secondary);
          background: var(--surface-alt);
          padding: 0.22rem 0.6rem;
          border-radius: 6px;
        }
        .pr-job-desc {
          font-size: 0.82rem;
          line-height: 1.48;
          color: var(--text-secondary);
          margin: 0 0 0.7rem;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .pr-reason-chips {
          display: flex;
          flex-wrap: wrap;
          gap: 0.35rem;
          margin-bottom: 0.85rem;
        }
        .pr-reason-chip {
          font-size: 0.69rem;
          font-weight: 700;
          padding: 0.2rem 0.55rem;
          border-radius: 6px;
          background: var(--surface-alt);
          color: var(--ios-text);
        }
        .pr-job-footer {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          padding-top: 0.85rem;
          border-top: 1px solid var(--border);
        }
        .pr-job-btn-secondary {
          flex: 1;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.35rem;
          padding: 0.55rem 0.85rem;
          border-radius: 8px;
          border: 1px solid var(--border-strong);
          background: var(--surface);
          color: var(--ios-text);
          font-size: 0.78rem;
          font-weight: 700;
          cursor: pointer;
          transition: background 0.15s ease;
        }
        .pr-job-btn-secondary:hover {
          background: var(--surface-alt);
        }
        .pr-job-btn-primary {
          flex: 1;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.35rem;
          padding: 0.55rem 0.85rem;
          border-radius: 8px;
          border: none;
          background: var(--ios-olive);
          color: #ffffff;
          font-size: 0.78rem;
          font-weight: 700;
          text-decoration: none;
          cursor: pointer;
          transition: opacity 0.15s ease;
        }
        .pr-job-btn-primary:hover {
          opacity: 0.92;
        }

        /* ─── TOP 10 EXAMS 2-COLUMN GRID ─── */
        .pr-exams-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1.15rem;
        }
        .pr-exam-card {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 16px;
          padding: 1.25rem;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          box-shadow: var(--shadow-1);
          transition: transform 0.18s ease, box-shadow 0.18s ease;
        }
        .pr-exam-card:hover {
          transform: translateY(-2px);
          box-shadow: var(--shadow-2);
        }
        .pr-exam-card-top {
          border-left: 4px solid var(--ios-olive);
        }
        .pr-exam-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.75rem;
          margin-bottom: 0.65rem;
          flex-wrap: wrap;
        }
        .pr-exam-rank-wrap {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          flex-wrap: wrap;
        }
        .pr-level-chip {
          display: inline-flex;
          align-items: center;
          gap: 3px;
          font-size: 0.68rem;
          font-weight: 600;
          color: var(--text-secondary);
          background: var(--surface-alt);
          padding: 0.18rem 0.5rem;
          border-radius: 6px;
        }
        .pr-exam-score-block {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 3px;
          min-width: 105px;
        }
        .pr-exam-score-num {
          font-size: 0.76rem;
          font-weight: 800;
          color: var(--ios-olive);
        }
        .pr-exam-bar-bg {
          width: 100%;
          height: 6px;
          background: var(--surface-alt);
          border-radius: 999px;
          overflow: hidden;
        }
        .pr-exam-bar-fill {
          height: 100%;
          background: var(--ios-olive);
          border-radius: 999px;
        }
        .pr-exam-title {
          font-size: 1.05rem;
          font-weight: 800;
          color: var(--ios-text);
          margin: 0 0 0.3rem;
          line-height: 1.35;
        }
        .pr-exam-body-name {
          display: flex;
          align-items: center;
          gap: 0.35rem;
          font-size: 0.78rem;
          color: var(--text-secondary);
          margin-bottom: 0.65rem;
        }
        .pr-exam-factors {
          display: flex;
          flex-wrap: wrap;
          gap: 0.35rem;
          margin-bottom: 0.8rem;
        }
        .pr-factor-chip {
          font-size: 0.69rem;
          font-weight: 700;
          padding: 0.2rem 0.55rem;
          border-radius: 6px;
          background: rgba(75, 107, 50, 0.1);
          color: var(--ios-olive);
        }
        .pr-exam-live-box {
          background: var(--surface-alt);
          border-radius: 10px;
          padding: 0.6rem 0.75rem;
          margin-bottom: 0.8rem;
        }
        .pr-exam-live-head {
          font-size: 0.7rem;
          font-weight: 800;
          color: #166534;
          margin-bottom: 0.35rem;
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .pr-exam-live-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.5rem;
          font-size: 0.76rem;
          padding: 0.25rem 0;
        }
        .pr-exam-live-title {
          font-weight: 600;
          color: var(--ios-text);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .pr-exam-live-btns {
          display: flex;
          gap: 0.35rem;
          flex-shrink: 0;
        }
        .pr-exam-live-btns button,
        .pr-exam-live-btns a {
          font-size: 0.68rem;
          font-weight: 700;
          padding: 2px 6px;
          border-radius: 4px;
          border: 1px solid var(--border-strong);
          background: var(--surface);
          color: var(--ios-text);
          text-decoration: none;
          cursor: pointer;
        }

        /* Prep Drawer */
        .pr-prep-drawer {
          background: var(--surface-alt);
          border-radius: 10px;
          padding: 0.85rem;
          margin-bottom: 0.8rem;
        }
        .pr-prep-loading,
        .pr-prep-empty {
          font-size: 0.78rem;
          color: var(--text-secondary);
          display: flex;
          align-items: center;
          gap: 0.4rem;
          margin: 0;
        }
        .pr-prep-cols {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0.85rem;
        }
        .pr-prep-col-title {
          display: flex;
          align-items: center;
          gap: 0.3rem;
          font-size: 0.68rem;
          font-weight: 800;
          color: var(--ios-olive);
          margin-bottom: 0.45rem;
        }
        .pr-prep-links {
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
        }
        .pr-prep-link {
          display: flex;
          align-items: center;
          gap: 0.35rem;
          font-size: 0.76rem;
          font-weight: 600;
          color: var(--ios-text);
          text-decoration: none;
          background: var(--surface);
          padding: 0.35rem 0.55rem;
          border-radius: 6px;
          border: 1px solid var(--border);
        }
        .pr-prep-link:hover {
          border-color: var(--ios-olive);
          color: var(--ios-olive);
        }
        .pr-prep-none {
          font-size: 0.74rem;
          color: var(--text-secondary);
          font-style: italic;
        }

        .pr-exam-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.5rem;
          padding-top: 0.8rem;
          border-top: 1px solid var(--border);
          flex-wrap: wrap;
        }
        .pr-exam-prep-toggle {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          background: transparent;
          border: 1px solid var(--border-strong);
          color: var(--ios-text);
          padding: 0.48rem 0.75rem;
          border-radius: 8px;
          font-size: 0.75rem;
          font-weight: 700;
          cursor: pointer;
        }
        .pr-exam-prep-toggle:hover {
          background: var(--surface-alt);
        }
        .pr-exam-cta-group {
          display: flex;
          align-items: center;
          gap: 0.45rem;
        }
        .pr-exam-ext-link {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 34px;
          height: 34px;
          border-radius: 8px;
          border: 1px solid var(--border-strong);
          color: var(--text-secondary);
        }
        .pr-exam-ext-link:hover {
          color: var(--ios-olive);
          border-color: var(--ios-olive);
        }
        .pr-exam-start-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          background: var(--ios-olive);
          color: #ffffff;
          border: none;
          border-radius: 8px;
          padding: 0.52rem 1rem;
          font-size: 0.78rem;
          font-weight: 700;
          cursor: pointer;
          transition: opacity 0.15s ease;
        }
        .pr-exam-start-btn:hover:not(:disabled) {
          opacity: 0.92;
        }

        .pr-empty-card {
          text-align: center;
          padding: 2.5rem;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.5rem;
        }

        /* ─── ZONE 4: LAUNCHPAD & PRO BANNER ─── */
        .pr-launchpad {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
          margin-top: 1rem;
        }
        .pr-cta-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1.25rem;
        }
        .pr-launch-card {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1.25rem;
          text-decoration: none;
          border-radius: 16px;
        }
        .pr-launch-icon {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          background: rgba(75, 107, 50, 0.12);
          color: var(--ios-olive);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .pr-launch-body {
          flex: 1;
        }
        .pr-launch-body h4 {
          margin: 0 0 0.2rem;
          font-size: 0.96rem;
          font-weight: 800;
          color: var(--ios-text);
        }
        .pr-launch-body p {
          margin: 0;
          font-size: 0.8rem;
          color: var(--text-secondary);
          line-height: 1.4;
        }
        .pr-launch-arrow {
          color: var(--text-secondary);
          flex-shrink: 0;
        }
        .pr-pro-banner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1.5rem;
          background: linear-gradient(135deg, #132a17 0%, #2d5530 100%);
          color: #ffffff;
          padding: 1.5rem 2rem;
          border-radius: 16px;
          flex-wrap: wrap;
        }
        .pr-pro-left {
          display: flex;
          align-items: center;
          gap: 1rem;
        }
        .pr-pro-crown {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          background: rgba(217, 249, 157, 0.16);
          color: #d9f99d;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .pr-pro-left h3 {
          margin: 0 0 0.25rem;
          font-size: 1.12rem;
          font-weight: 800;
          color: #ffffff;
        }
        .pr-pro-left p {
          margin: 0;
          font-size: 0.85rem;
          color: rgba(255, 255, 255, 0.82);
        }
        .pr-pro-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.45rem;
          background: #d9f99d;
          color: #132a17;
          padding: 0.7rem 1.25rem;
          border-radius: 10px;
          font-size: 0.85rem;
          font-weight: 800;
          text-decoration: none;
          white-space: nowrap;
        }

        /* ─── RESPONSIVE BREAKPOINTS ─── */
        @media (max-width: 1024px) {
          .pr-hero {
            grid-template-columns: 1fr;
          }
          .pr-bento-grid {
            grid-template-columns: 1fr;
          }
          .pr-jobs-grid,
          .pr-exams-grid {
            grid-template-columns: 1fr;
          }
          .pr-cta-grid {
            grid-template-columns: 1fr;
          }
        }
        @media (max-width: 600px) {
          .pr-gauge-row {
            flex-direction: column;
            align-items: stretch;
          }
          .pr-gauge-wrap {
            margin: 0 auto;
          }
          .pr-prep-cols {
            grid-template-columns: 1fr;
          }
        }
      `}} />
    </div>
  );
};

export default ProfilingResults;
