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
  Zap, Calendar, Users,
} from 'lucide-react';
import { getProfilingInsights, getTransferableSkills } from '../lib/profilingInsights';
import { matchJobsV2ForExam, matchJobsV2ForRecommendations } from '../lib/jobMatcher';
import { JobDescriptionModal } from '../components/JobDescriptionModal';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';

// Human-readable labels for the positive factors scoreExam() records in
// backend/engine/scoring.js's breakdown object — used to explain "why this
// matches you" instead of just showing a bare percentage.
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

function topFactors(breakdown = {}, count = 3) {
  return Object.entries(breakdown)
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, count)
    .map(([key]) => BREAKDOWN_LABELS[key] || key);
}

// Same matching logic as Dashboard.jsx's PreparationPanel, lifted here so
// each top exam match gets its own prep section on the results page.
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
        // Exact link first (quizzes.lc_exam_id); use the resolved lc_exam_id from the recommendation.
        let quizData = { data: [] };
        if (exam.lc_exam_id) {
          quizData = await supabase.from('quizzes').select('id, title').eq('lc_exam_id', exam.lc_exam_id).eq('category', 'Mock Test').gte('playable_questions', MIN_PLAYABLE_QUESTIONS).order('title').limit(3);
        } else if (exam.exam_id) {
          // Legacy fallback: try matching by old exam_id stored in quizzes.lc_exam_id
          quizData = await supabase.from('quizzes').select('id, title').eq('lc_exam_id', exam.exam_id).eq('category', 'Mock Test').gte('playable_questions', MIN_PLAYABLE_QUESTIONS).order('title').limit(3);
        }
        if (!quizData.data || quizData.data.length === 0) {
          quizData = await supabase.from('quizzes').select('id, title').is('lc_exam_id', null).eq('exam_name', exam.exam_name).eq('category', 'Mock Test').limit(3);
        }

        // resources/quizzes exam_name carries a "N. " ordinal prefix from
        // the CMS ingestion that the recommendation engine's exam_name never
        // has, so the exact match above misses real, published content.
        // Retry as a substring match before falling back to the much looser
        // career_track keyword below.
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
      <Card padding="sm" elevated={false} className="results-prep-panel">
        <div className="results-prep-loading"><RefreshCw className="results-animate-spin" size={18} color="var(--ios-olive)" /></div>
      </Card>
    );
  }

  if (resources.length === 0 && quizzes.length === 0) {
    return (
      <Card padding="sm" elevated={false} className="results-prep-panel">
        <p className="results-prep-empty">No specific preparation materials found for this exam yet — browse the Learning Center for general resources.</p>
      </Card>
    );
  }

  return (
    <Card padding="sm" elevated={false} className="results-prep-panel">
      <div className="results-prep-grid">
        <div>
          <h5>STUDY GUIDES</h5>
          <div className="results-prep-list">
            {resources.length === 0 && <span className="results-prep-none">None yet</span>}
            {resources.map(res => (
              <Link key={res.id} to={`/reader/${res.resource_id}`} state={{ from: window.location.pathname + window.location.search }} className="results-prep-item">
                <FileText size={14} /> <span>{res.title}</span>
              </Link>
            ))}
          </div>
        </div>
        <div>
          <h5>PRACTICE QUIZZES</h5>
          <div className="results-prep-list">
            {quizzes.length === 0 && <span className="results-prep-none">None yet</span>}
            {quizzes.map(quiz => (
              <Link key={quiz.id} to={`/quiz/${quiz.id}`} className="results-prep-item">
                <PlayCircle size={14} /> <span>{quiz.title}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
};

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
  const [matchedJobs, setMatchedJobs] = useState([]);

  // Sets the candidate's active preparation target and navigates to the Exam Journey.
  // Uses lc_exam_id (UUID from lc_exams table) — NOT the old varchar exam_id.
  const handleStartPreparing = async (rec) => {
    // lc_exam_id comes from the recommend.js lc_exam_legacy_map resolution.
    // Fall back to exam_id for display but we can't set a target without lc_exam_id.
    const targetId = rec?.lc_exam_id || rec?.exam_id;
    if (!targetId) return;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      navigate('/login');
      return;
    }
    setPreparingExamId(targetId);
    try {
      if (rec.lc_exam_id) {
        // Demote-then-upsert done atomically server-side
        await supabase.rpc('set_primary_exam_target', { p_exam_id: rec.lc_exam_id });
      }
    } catch (err) {
      console.warn('Could not save exam target:', err);
      // Navigate anyway — the journey page can still show content.
    } finally {
      setPreparingExamId(null);
      if (rec.lc_exam_id) {
        navigate(`/exam/${rec.lc_exam_id}`);
      } else {
        // No LC exam linked yet — go to learning center as fallback
        navigate('/learning-center');
      }
    }
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const { data: { session: currentSession } } = await supabase.auth.getSession();

        if (currentSession?.user) {
          const { data: profile } = await supabase
            .from('user_profiles')
            .select('subscription_tier, subscription_expires_at, full_name, recommendations, veer_score, raw_profile_data')
            .eq('id', currentSession.user.id)
            .maybeSingle();

          if (profile) {
            setFullName(profile.full_name || '');
            setRawProfile(profile.raw_profile_data || null);

            // Prefer the payload just returned by /api/profile/recommend
            // (passed via router state) to avoid a duplicate fetch; fall
            // back to the persisted profile for refreshes/back-navigation.
            const stateRecs = location.state?.recommendations;
            const stateScore = location.state?.summary?.overall_match_score;
            const rawRecs = stateRecs?.length ? stateRecs : (profile.recommendations || []);
            const userProfileObj = profile.raw_profile_data || profile;

            // Fetch live jobs_v2 records in parallel to enrich recommendations and profile matches
            let liveJobs = [];
            try {
              const jobsRes = await axios.get('/api/jobs-v2');
              if (jobsRes.data?.ok && Array.isArray(jobsRes.data.jobs)) {
                liveJobs = jobsRes.data.jobs;
              }
            } catch (jobsErr) {
              console.warn('Jobs_v2 fetch in profiling results warning:', jobsErr.message);
            }

            // Map matching jobs_v2 records directly to each recommended exam
            const enrichedRecs = rawRecs.map(rec => ({
              ...rec,
              matchedJobsV2: matchJobsV2ForExam(liveJobs, rec)
            }));

            setRecommendations(enrichedRecs);
            setVeerScore(stateScore != null ? Math.round(stateScore) : profile.veer_score);

            // Compute candidate's live matched jobs from jobs_v2
            const matched = matchJobsV2ForRecommendations(liveJobs, enrichedRecs, userProfileObj);
            setMatchedJobs(matched);

            // pointsAwarded/pointsBalance only exist in router state right
            // after a fresh /api/profile/recommend call (see recommend.js);
            // on refresh/back-nav, fall back to the persisted balance.
            // Own try/catch: points_balance won't exist until
            // sql/points_system.sql has been run against the database.
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
              } catch (e) {
                console.warn('Points system not yet available', e);
              }
            }
          }
        }
      } catch (err) {
        console.error('Error loading profiling results:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [location.state]);

  if (loading) {
    return (
      <div className="results-loading">
        <RefreshCw className="results-animate-spin" size={28} color="var(--ios-olive)" />
      </div>
    );
  }

  const topMatches = recommendations.slice(0, 5);

  const insights = rawProfile ? getProfilingInsights(rawProfile, { context: 'results' }) : [];
  const careerDirection = insights.find((i) => i.label === 'Career Alignment');
  const topStrengths = insights.filter((i) => i.label !== 'Career Alignment').slice(0, 3);
  const transferableSkills = rawProfile ? getTransferableSkills(rawProfile) : [];
  const pathsCount = location.state?.totalEligible ?? recommendations.length;
  const skillGaps = location.state?.skillGaps || [];

  return (
    <div className="results-wrapper">
      <motion.div
        className="results-hero"
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
      >
        <Sparkles size={40} color="white" style={{ opacity: 0.9, marginBottom: '0.75rem' }} />
        <h1>Your VeerNXT Profile is Ready{fullName ? `, ${fullName.split(' ')[0]}` : ''}!</h1>
        <p>We&apos;ve analysed your military background against every eligible exam. Here&apos;s what we found — before anything is locked behind a paywall.</p>
        {(pointsAwarded > 0 || pointsBalance != null) && (
          <motion.div
            className="results-points-badge"
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: 0.35, ease: 'easeOut' }}
          >
            {pointsAwarded > 0 && <span className="results-points-delta">+{pointsAwarded} points</span>}
            {pointsBalance != null && <span className="results-points-total">{pointsBalance.toLocaleString()} total</span>}
          </motion.div>
        )}
      </motion.div>

      {/* Free insights — strengths, career direction, transferable skills, paths count */}
      <motion.div
        className="results-insights-grid"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.05, ease: 'easeOut' }}
      >
        <Card padding="sm" className="results-insight-card">
          <div className="card-top"><CheckCircle2 size={18} color="var(--ios-olive)" /><span className="results-card-label">TOP STRENGTHS</span></div>
          {topStrengths.length > 0 ? (
            <ul className="results-insight-list">
              {topStrengths.map((s, i) => <li key={i}><strong>{s.label}.</strong> {s.detail}</li>)}
            </ul>
          ) : <p className="results-prep-empty">Strengths will appear here once your profile is loaded.</p>}
        </Card>
        <Card padding="sm" className="results-insight-card">
          <div className="card-top"><Compass size={18} color="var(--ios-olive)" /><span className="results-card-label">CAREER DIRECTION</span></div>
          <p className="card-desc">{careerDirection?.detail || 'Set your career preferences during profiling to see your direction here.'}</p>
        </Card>
        <Card padding="sm" className="results-insight-card">
          <div className="card-top"><ListChecks size={18} color="var(--ios-olive)" /><span className="results-card-label">TRANSFERABLE SKILLS</span></div>
          <ul className="results-insight-list">
            {transferableSkills.map((s, i) => <li key={i}>{s}</li>)}
          </ul>
        </Card>
        <Card padding="sm" className="results-insight-card results-paths-card">
          <div className="card-top"><Target size={18} color="var(--ios-olive)" /><span className="results-card-label">CAREER PATHS IDENTIFIED</span></div>
          <div className="results-paths-stat">{pathsCount}</div>
          <p className="card-desc">exams &amp; roles you&apos;re eligible for, based on your profile.</p>
        </Card>
      </motion.div>

      <div className="results-grid">
        {/* VeerScore */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.1, ease: 'easeOut' }}
        >
          <Card className="results-score-card">
            <div className="card-top">
              <Award size={22} color="var(--ios-olive)" />
              <span className="results-card-label">VEER SCORE</span>
            </div>
            <motion.div
              className="results-score-display"
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: 0.25, ease: 'easeOut' }}
            >
              {veerScore != null ? veerScore : '—'}
            </motion.div>
            <p className="card-desc">Your overall readiness score, calculated from service history, skills, and physical standards.</p>
          </Card>
        </motion.div>

        {/* Top matches */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.15, ease: 'easeOut' }}
        >
          <Card className="results-matches-card">
            <div className="card-top" style={{ marginBottom: '1.5rem' }}>
              <Target size={22} color="var(--ios-olive)" />
              <h2 className="results-matches-title">Your Top Exam Matches</h2>
            </div>

            {topMatches.length > 0 ? (
              <div className="results-rec-list">
                {topMatches.map((rec, idx) => (
                  <motion.div
                    key={rec.exam_id || idx}
                    className="results-rec-block"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.1 + idx * 0.06, ease: 'easeOut' }}
                  >
                    <Card padding="sm" elevated={false} className="results-rec-item">
                      <div className="results-rec-main-row">
                        <div className="results-rec-rank">{idx + 1}</div>
                        <div className="results-rec-info">
                          <h3>{rec.exam_name}</h3>
                          <div className="results-rec-meta">
                            <span><Briefcase size={14} /> {rec.career_track}</span>
                            {rec.state_ut && <span><MapPin size={14} /> {rec.state_ut}</span>}
                          </div>
                          {topFactors(rec.breakdown).length > 0 && (
                            <div className="results-chips">
                              {topFactors(rec.breakdown).map((label, i) => (
                                <span key={i} className="results-chip">{label}</span>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="results-rec-score">
                          <div className="results-score-bar-bg"><div className="results-score-bar-fill" style={{ width: `${Math.min(rec.score, 100)}%` }} /></div>
                          <span>{Math.min(Math.round(rec.score), 100)}% Match</span>
                        </div>
                        <div className="results-rec-actions">
                          <button
                            type="button"
                            className="results-start-preparing-btn"
                            onClick={() => handleStartPreparing(rec)}
                            disabled={preparingExamId === (rec.lc_exam_id || rec.exam_id)}
                          >
                            {preparingExamId === (rec.lc_exam_id || rec.exam_id) ? (
                              <RefreshCw size={14} className="results-animate-spin" />
                            ) : (
                              <Rocket size={14} />
                            )}
                            Start Preparing
                          </button>
                          {rec.website && (
                            <a href={rec.website} target="_blank" rel="noopener noreferrer" className="results-rec-link">
                              <ExternalLink size={16} />
                            </a>
                          )}
                        </div>
                      </div>

                      {/* Live jobs_v2 Openings Matched to this Recommended Exam */}
                      {rec.matchedJobsV2 && rec.matchedJobsV2.length > 0 && (
                        <div className="results-matched-jobs-panel">
                          <div className="results-matched-jobs-header">
                            <span className="results-matched-jobs-title">
                              <Zap size={13} style={{ color: 'var(--c-green, #16a34a)' }} /> Active Openings from jobs_v2 ({rec.matchedJobsV2.length})
                            </span>
                            <span className="results-matched-jobs-sub">Live Database Matches</span>
                          </div>

                          <div className="results-matched-jobs-list">
                            {rec.matchedJobsV2.map((j) => (
                              <div key={j.job_id || j.id || j.url} className="results-matched-job-row">
                                <div className="results-matched-job-info">
                                  <div className="results-matched-job-name">{j.title}</div>
                                  <div className="results-matched-job-meta">
                                    {j.vacancies && (
                                      <span className="results-job-vacancies">
                                        👥 {Number(j.vacancies).toLocaleString()} Vacancies
                                      </span>
                                    )}
                                    {j.last_date && (
                                      <span>📅 Last Date: {new Date(j.last_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                                    )}
                                    <span className="results-job-score">{j._matchScore}% Match</span>
                                  </div>
                                </div>

                                <div className="results-matched-job-actions">
                                  <button
                                    type="button"
                                    className="results-job-desc-btn"
                                    onClick={() => setSelectedJobModal(j)}
                                  >
                                    <FileText size={12} style={{ color: 'var(--c-green, #16a34a)' }} /> Description
                                  </button>
                                  {j.url && (
                                    <a
                                      href={j.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="results-job-notice-btn"
                                    >
                                      Notice <ExternalLink size={11} />
                                    </a>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </Card>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="results-empty">
                <p>No matches found yet.</p>
                <Link to="/profiling" className="results-btn-link">Update Profile</Link>
              </div>
            )}
          </Card>
        </motion.div>
      </div>

      {/* Dynamic Live Job Matches from jobs_v2 */}
      {matchedJobs.length > 0 && (
        <motion.div
          className="results-live-jobs-container"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.2, ease: 'easeOut' }}
        >
          <Card className="results-live-jobs-card">
            <div className="results-live-jobs-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <Briefcase size={22} color="var(--ios-olive)" />
                <h2 className="results-matches-title" style={{ margin: 0 }}>
                  Live Job Matches from jobs_v2 ({matchedJobs.length})
                </h2>
              </div>
              <span className="results-live-jobs-badge">
                Filtered by Recommended Exams &amp; Trade Profiles
              </span>
            </div>

            <div className="results-live-jobs-grid">
              {matchedJobs.map((job) => (
                <div key={job.job_id || job.id || job.url} className="results-live-job-item">
                  <div>
                    <div className="results-live-job-top">
                      <div style={{ display: 'flex', gap: '4px', alignItems: 'center', flexWrap: 'wrap' }}>
                        <span className="results-job-track-chip">
                          {job.career_track || job.careerTrack || 'GOVT'}
                        </span>
                        <span className="results-job-v2-chip">jobs_v2</span>
                      </div>
                      <span className="results-job-match-badge">
                        {job._matchScore || 85}% Match
                      </span>
                    </div>

                    <h4 className="results-live-job-title">{job.title}</h4>

                    {job._recommendedExam && (
                      <div className="results-live-job-aligned">
                        🎯 Aligned with: {job._recommendedExam}
                      </div>
                    )}

                    <div className="results-live-job-stats">
                      {job.vacancies && (
                        <span className="results-job-vacancies">
                          👥 {Number(job.vacancies).toLocaleString()} Vacancies
                        </span>
                      )}
                      {job.last_date && (
                        <span>
                          📅 Last Date: {new Date(job.last_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                        </span>
                      )}
                    </div>

                    {job.ai_description && (
                      <p className="results-live-job-desc">
                        {job.ai_description.replace(/About the Recruitment\s*/i, '').replace(/Available Posts & Vacancies\s*/i, '')}
                      </p>
                    )}

                    <div className="results-live-job-chips">
                      {job._matchReasons?.slice(0, 3).map((reason, i) => (
                        <span key={i} className="results-live-job-chip">{reason}</span>
                      ))}
                    </div>
                  </div>

                  <div className="results-live-job-actions">
                    <button
                      type="button"
                      className="results-job-desc-btn"
                      onClick={() => setSelectedJobModal(job)}
                    >
                      <FileText size={12} style={{ color: 'var(--c-green, #16a34a)' }} /> Description
                    </button>
                    {job.url && (
                      <a
                        href={job.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="results-job-notice-btn"
                      >
                        Notice <ExternalLink size={11} />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </motion.div>
      )}

      {/* Career Opportunities reveal — skill gaps, CV, subscription */}
      <motion.div
        className="results-opportunities"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
      >
        {skillGaps.length > 0 && (
          <Card className="results-gap-card">
            <div className="card-top"><AlertCircle size={20} color="var(--ios-olive)" /><h3 className="results-matches-title">Where to Focus Next</h3></div>
            <div className="results-gap-list">
              {skillGaps.map((gap, i) => (
                <div key={i} className="results-gap-item">
                  <strong>{gap.label}</strong>
                  <p>{gap.detail}</p>
                </div>
              ))}
            </div>
          </Card>
        )}

        <div className="results-cta-row">
          <Card as={Link} to="/cv" interactive className="results-cta-card">
            <FileText size={22} color="var(--ios-olive)" />
            <div>
              <h4>Build Your Resume</h4>
              <p>Turn your service record into an industry-fit CV.</p>
            </div>
            <ArrowRight size={18} className="results-cta-arrow" />
          </Card>
          <Card as={Link} to="/learning-center" interactive className="results-cta-card">
            <PlayCircle size={22} color="var(--ios-olive)" />
            <div>
              <h4>Explore the Learning Center</h4>
              <p>Study guides and quizzes for every matched exam.</p>
            </div>
            <ArrowRight size={18} className="results-cta-arrow" />
          </Card>
          <Card as={Link} to="/v2/me" interactive className="results-cta-card">
            <Target size={22} color="var(--ios-olive)" />
            <div>
              <h4>Go to Dashboard</h4>
              <p>See everything in one place, anytime.</p>
            </div>
            <ArrowRight size={18} className="results-cta-arrow" />
          </Card>
        </div>

        <Card className="results-subscribe-card">
          <Crown size={24} color="white" />
          <div>
            <h3>Ready to act on these opportunities?</h3>
            <p>Get unlimited mock tests, the full study library, and ongoing exam alerts — everything you need to prepare, not just discover.</p>
          </div>
          <Link to="/subscribe?from=profiling&plan=ANNUAL" className="results-btn-link results-btn-light">
            View Subscription Plans <ArrowRight size={16} />
          </Link>
        </Card>
      </motion.div>

      {/* Job Description Modal */}
      {selectedJobModal && (
        <JobDescriptionModal
          job={selectedJobModal}
          onClose={() => setSelectedJobModal(null)}
        />
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        .results-loading {
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: calc(100vh - 64px);
        }
        .results-wrapper {
          width: 100%;
          max-width: 1800px;
          margin: 0 auto;
          padding: 2.5rem clamp(1.25rem, 3vw, 2.5rem);
        }
        .results-hero {
          margin-bottom: 2rem;
          background: linear-gradient(135deg, var(--ios-olive-fill, var(--ios-olive)) 0%, #2f4a1f 100%);
          padding: 3.5rem 3rem;
          border-radius: var(--radius-lg);
          text-align: center;
          color: white;
          box-shadow: var(--shadow-3);
        }
        .results-hero h1 {
          color: white;
          font-size: 2.25rem;
          margin-bottom: 0.5rem;
        }
        .results-hero p {
          color: rgba(255,255,255,0.85);
          font-size: 1.05rem;
          max-width: 560px;
          margin: 0 auto;
        }
        .results-points-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.75rem;
          margin-top: 1.25rem;
          padding: 0.5rem 1.1rem;
          background: rgba(255,255,255,0.15);
          border: 1px solid rgba(255,255,255,0.3);
          border-radius: var(--radius-pill);
        }
        .results-points-delta {
          font-weight: 800;
          font-size: 0.95rem;
          color: #d9f2b0;
        }
        .results-points-total {
          font-size: 0.8rem;
          color: rgba(255,255,255,0.8);
        }
        .results-insights-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 1rem;
          margin-bottom: 1.5rem;
        }
        .results-insight-card { display: flex; flex-direction: column; }
        .results-insight-list {
          margin: 0;
          padding-left: 1.1rem;
          font-size: 0.82rem;
          color: var(--c-ink-3, #555);
          line-height: 1.5;
          display: flex;
          flex-direction: column;
          gap: 0.4rem;
        }
        .results-insight-list strong { color: var(--ios-text); }
        .results-paths-card { align-items: flex-start; }
        .results-paths-stat {
          font-size: 2.5rem;
          font-weight: 800;
          color: var(--ios-olive);
          line-height: 1;
          margin-bottom: 0.35rem;
        }
        .results-grid {
          display: grid;
          grid-template-columns: 1fr 2fr;
          gap: 1.5rem;
          margin-bottom: 1.5rem;
        }
        .card-top {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 1.25rem;
        }
        .card-desc {
          color: var(--c-ink-4, #777);
          font-size: 0.95rem;
          line-height: 1.5;
        }
        .results-card-label {
          font-family: inherit;
          font-weight: 700;
          font-size: 0.9rem;
          color: var(--ios-olive);
        }
        .results-matches-title {
          font-size: 1.25rem;
          margin: 0;
        }
        .results-score-display {
          font-size: 4.5rem;
          font-weight: 800;
          letter-spacing: -0.05em;
          line-height: 1;
          margin-bottom: 1rem;
          color: var(--ios-olive);
        }
        .results-btn-link {
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          color: white;
          background: var(--ios-olive-fill, var(--ios-olive));
          font-family: "Quicksand", sans-serif;
          font-weight: 700;
          font-size: 0.85rem;
          padding: 0.65rem 1.25rem;
          border-radius: var(--radius-sm);
          box-shadow: var(--shadow-1);
          transition: opacity 0.2s ease, transform 0.2s ease;
        }
        .results-btn-link:hover { opacity: 0.9; transform: translateY(-1px); }
        .results-btn-light {
          background: var(--c-bg-0, white);
          color: var(--ios-olive);
        }
        .results-rec-list {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }
        .results-rec-item {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          padding: 1rem;
          background: var(--ios-secondary);
          border-radius: var(--radius-md);
        }
        .results-rec-main-row {
          display: flex;
          align-items: center;
          gap: 1.25rem;
          width: 100%;
        }
        .results-matched-jobs-panel {
          margin-top: 0.15rem;
          padding-top: 0.65rem;
          border-top: 1px dashed rgba(0,0,0,0.1);
          width: 100%;
        }
        .results-matched-jobs-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 0.45rem;
        }
        .results-matched-jobs-title {
          font-size: 11px;
          font-weight: 700;
          color: var(--c-green, #166534);
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .results-matched-jobs-sub {
          font-size: 10px;
          color: var(--c-ink-4, #64748b);
        }
        .results-matched-jobs-list {
          display: flex;
          flex-direction: column;
          gap: 0.4rem;
        }
        .results-matched-job-row {
          background: var(--c-bg-0, white);
          border: 1px solid var(--c-line-2, #e2e8f0);
          border-radius: 6px;
          padding: 0.45rem 0.65rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 0.6rem;
        }
        .results-matched-job-info {
          min-width: 0;
          flex: 1;
        }
        .results-matched-job-name {
          font-size: 12px;
          font-weight: 600;
          color: var(--c-ink-1, #0f172a);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .results-matched-job-meta {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 10px;
          color: var(--c-ink-4, #64748b);
          margin-top: 2px;
          flex-wrap: wrap;
        }
        .results-job-vacancies {
          color: var(--c-green, #15803d);
          font-weight: 700;
          background: var(--c-tint-green, #dcfce7);
          padding: 1px 5px;
          border-radius: 3px;
        }
        .results-job-score {
          color: var(--c-blue, #0284c7);
          font-weight: 600;
        }
        .results-matched-job-actions {
          display: flex;
          align-items: center;
          gap: 6px;
          flex-shrink: 0;
        }
        .results-job-desc-btn {
          font-size: 11px;
          font-weight: 600;
          color: var(--c-ink-1, #0f172a);
          background: var(--c-bg-0, #FFFFFF);
          border: 1px solid var(--c-line-3, #cbd5e1);
          border-radius: 4px;
          padding: 4px 8px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 3px;
          transition: background 0.15s ease;
        }
        .results-job-desc-btn:hover {
          background: var(--c-bg-1, #f8fafc);
        }
        .results-job-notice-btn {
          font-size: 11px;
          font-weight: 700;
          color: var(--c-green, #1a472a);
          background: var(--c-tint-green, #f0fdf4);
          border: 1px solid #bbf7d0;
          border-radius: 4px;
          padding: 4px 8px;
          text-decoration: none;
          display: flex;
          align-items: center;
          gap: 3px;
          transition: background 0.15s ease;
        }
        .results-job-notice-btn:hover {
          background: var(--c-tint-green, #dcfce7);
        }

        /* Live Jobs Grid Section */
        .results-live-jobs-container {
          margin-bottom: 1.5rem;
        }
        .results-live-jobs-card {
          padding: 1.5rem;
        }
        .results-live-jobs-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.25rem;
          flex-wrap: wrap;
          gap: 0.5rem;
        }
        .results-live-jobs-badge {
          font-size: 11px;
          font-weight: 600;
          color: var(--c-green, #166534);
          background: var(--c-tint-green, #f0fdf4);
          padding: 3px 8px;
          border-radius: 6px;
          border: 1px solid #bbf7d0;
        }
        .results-live-jobs-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 0.85rem;
        }
        .results-live-job-item {
          background: var(--c-bg-0, #ffffff);
          padding: 1rem;
          border-radius: 9px;
          border: 1px solid var(--c-line-2, #e2e8f0);
          box-shadow: 0 1px 3px rgba(0,0,0,0.04);
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          transition: transform 0.15s ease, box-shadow 0.15s ease;
        }
        .results-live-job-item:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 6px -1px rgba(0,0,0,0.07);
        }
        .results-live-job-top {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 0.4rem;
        }
        .results-job-track-chip {
          font-size: 10px;
          padding: 1px 5px;
          border-radius: 3px;
          background: var(--c-bg-2, #f1f5f9);
          color: var(--c-ink-3, #475569);
          font-weight: 600;
        }
        .results-job-v2-chip {
          font-size: 9px;
          padding: 1px 4px;
          border-radius: 3px;
          background: var(--c-tint-blue, #e0e7ff);
          color: var(--c-blue, #3730a3);
          font-weight: 700;
        }
        .results-job-match-badge {
          font-size: 11px;
          font-weight: 800;
          color: var(--c-green, #1a472a);
          background: var(--c-tint-green, #f0fdf4);
          padding: 1px 6px;
          border-radius: 3px;
          border: 1px solid #bbf7d0;
        }
        .results-live-job-title {
          font-size: 13.5px;
          font-weight: 700;
          margin: 0 0 0.3rem 0;
          color: var(--c-ink-1, #0f172a);
          line-height: 1.35;
        }
        .results-live-job-aligned {
          font-size: 11px;
          color: var(--c-green, #166534);
          font-weight: 600;
          margin-bottom: 0.35rem;
        }
        .results-live-job-stats {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          font-size: 11px;
          color: var(--c-ink-4, #64748b);
          margin-bottom: 0.45rem;
        }
        .results-live-job-desc {
          font-size: 11.5px;
          color: var(--c-ink-3, #475569);
          margin: 0 0 0.5rem 0;
          line-height: 1.45;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .results-live-job-chips {
          display: flex;
          flex-wrap: wrap;
          gap: 3px;
          margin-bottom: 0.65rem;
        }
        .results-live-job-chip {
          font-size: 10px;
          padding: 1px 5px;
          border-radius: 3px;
          background: var(--c-tint-blue, #e0f2fe);
          color: var(--c-blue, #0369a1);
          font-weight: 600;
        }
        .results-live-job-actions {
          display: flex;
          gap: 6px;
          margin-top: 0.45rem;
        }
        .results-live-job-actions .results-job-desc-btn,
        .results-live-job-actions .results-job-notice-btn {
          flex: 1;
          justify-content: center;
          padding: 6px 10px;
        }
        .results-rec-rank {
          width: 32px;
          height: 32px;
          background: var(--c-bg-0, white);
          border-radius: var(--radius-sm);
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          color: var(--ios-olive);
          font-size: 0.9rem;
          flex-shrink: 0;
        }
        .results-rec-info { flex: 1; min-width: 0; }
        .results-rec-info h3 { font-size: 1.05rem; margin: 0 0 0.2rem; }
        .results-rec-meta {
          display: flex;
          gap: 1rem;
          font-size: 0.75rem;
          color: #888;
        }
        .results-rec-meta span { display: flex; align-items: center; gap: 0.25rem; }
        .results-chips {
          display: flex;
          flex-wrap: wrap;
          gap: 0.4rem;
          margin-top: 0.5rem;
        }
        .results-chip {
          font-size: 0.68rem;
          font-weight: 700;
          color: var(--ios-olive);
          background: rgba(75, 107, 50, 0.1);
          padding: 0.25rem 0.6rem;
          border-radius: var(--radius-pill);
        }
        .results-rec-score {
          width: 130px;
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
          flex-shrink: 0;
        }
        .results-score-bar-bg {
          height: 6px;
          background: rgba(0,0,0,0.05);
          border-radius: 3px;
          overflow: hidden;
        }
        .results-score-bar-fill {
          height: 100%;
          background: var(--ios-olive-fill, var(--ios-olive));
          border-radius: 3px;
        }
        .results-rec-score span {
          font-size: 0.7rem;
          font-weight: 700;
          color: var(--ios-olive);
          text-align: right;
        }
        .results-rec-actions {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          flex-shrink: 0;
        }
        .results-rec-link { color: #ccc; }
        .results-rec-link:hover { color: var(--ios-olive); }
        .results-start-preparing-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          background: var(--ios-olive-fill, var(--ios-olive));
          color: white;
          border: none;
          border-radius: var(--radius-pill);
          padding: 0.55rem 1.1rem;
          font-size: 0.82rem;
          font-weight: 700;
          cursor: pointer;
          transition: background 0.15s, transform 0.15s, opacity 0.15s;
          white-space: nowrap;
        }
        .results-start-preparing-btn:hover:not(:disabled) {
          background: #2d411e;
          transform: translateY(-1px);
        }
        .results-start-preparing-btn:active:not(:disabled) {
          transform: translateY(0);
        }
        .results-start-preparing-btn:disabled {
          opacity: 0.65;
          cursor: not-allowed;
        }
        .results-prep-loading, .results-prep-empty {
          padding: 1rem;
          text-align: center;
          color: var(--c-ink-5, #999);
          font-size: 0.85rem;
        }
        .results-empty { text-align: center; padding: 2rem; }
        .results-opportunities {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
          margin-bottom: 1.5rem;
        }
        .results-gap-card { }
        .results-gap-list {
          display: flex;
          flex-direction: column;
          gap: 0.85rem;
        }
        .results-gap-item {
          padding: 0.85rem 1rem;
          background: var(--warning-bg);
          border-radius: var(--radius-sm);
        }
        .results-gap-item strong { font-size: 0.85rem; color: var(--warning); }
        .results-gap-item p { margin: 0.25rem 0 0; font-size: 0.82rem; color: var(--c-ink-4, #666); line-height: 1.5; }
        .results-cta-row {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1.5rem;
        }
        .results-cta-card {
          display: flex;
          align-items: center;
          gap: 1rem;
          text-decoration: none;
          color: inherit;
        }
        .results-cta-card h4 { font-size: 0.95rem; margin: 0 0 0.2rem; }
        .results-cta-card p { font-size: 0.8rem; color: #888; margin: 0; }
        .results-cta-arrow { margin-left: auto; color: #ccc; flex-shrink: 0; }
        .results-subscribe-card {
          display: flex;
          align-items: center;
          gap: 1.5rem;
          background: linear-gradient(135deg, var(--ios-olive-fill, var(--ios-olive)) 0%, #2f4a1f 100%);
          color: white;
        }
        .results-subscribe-card h3 { color: white; font-size: 1.1rem; margin: 0 0 0.4rem; }
        .results-subscribe-card p { color: rgba(255,255,255,0.8); font-size: 0.85rem; margin: 0; line-height: 1.5; }
        .results-subscribe-card > div { flex: 1; }
        .results-subscribe-card .results-btn-link { flex-shrink: 0; }
        .results-animate-spin { animation: results-spin 1s linear infinite; }
        @keyframes results-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @media (max-width: 850px) {
          .results-insights-grid { grid-template-columns: 1fr 1fr; }
          .results-grid { grid-template-columns: 1fr; }
          .results-cta-row { grid-template-columns: 1fr; }
          .results-rec-item { flex-wrap: wrap; }
          .results-rec-score { width: 100%; order: 3; }
          .results-prep-grid { grid-template-columns: 1fr; }
          .results-subscribe-card { flex-direction: column; align-items: flex-start; }
        }
        @media (max-width: 560px) {
          .results-insights-grid { grid-template-columns: 1fr; }
        }
      `}} />
    </div>
  );
};

export default ProfilingResults;
