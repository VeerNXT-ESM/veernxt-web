import { useEffect, useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../lib/supabase';
import {
  Award, Target, Briefcase, MapPin, ExternalLink, Lock, Crown,
  FileText, PlayCircle, Sparkles, ArrowRight, ChevronDown, ChevronUp, RefreshCw,
  Gift, Compass, ListChecks, AlertCircle, CheckCircle2,
} from 'lucide-react';
import { getEffectiveTier, canViewVeerScore, canViewRecommendations, canGenerateCV, higherTier } from '../lib/subscriptionAccess';
import { getProfilingInsights, getTransferableSkills } from '../lib/profilingInsights';
import { useInlineUnlock } from '../lib/useInlineUnlock';
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
};

// What VeerScore actually measures — shown on the locked preview so the
// paywall explains itself instead of just blurring a number.
const VEERSCORE_FACTORS = [
  'Service history, rank & discharge character',
  'Qualification & trade alignment with each exam',
  'Domicile, category & reservation eligibility',
  'Physical standards, NCC & sports credentials',
  'Career preference alignment across sectors',
];

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
        let resData = await supabase.from('resources_v2').select('*').eq('exam_name', exam.exam_name).limit(3);
        let quizData = await supabase.from('quizzes').select('*').eq('exam_name', exam.exam_name).limit(3);

        // resources_v2/quizzes exam_name carries a "N. " ordinal prefix from
        // the CMS ingestion that the recommendation engine's exam_name never
        // has, so the exact match above misses real, published content.
        // Retry as a substring match before falling back to the much looser
        // career_track keyword below.
        if (!resData.data || resData.data.length === 0) {
          const escaped = exam.exam_name.replace(/[%_]/g, (c) => `\\${c}`);
          resData = await supabase.from('resources_v2').select('*').ilike('exam_name', `%${escaped}%`).limit(3);
        }
        if (!quizData.data || quizData.data.length === 0) {
          const escaped = exam.exam_name.replace(/[%_]/g, (c) => `\\${c}`);
          quizData = await supabase.from('quizzes').select('*').ilike('exam_name', `%${escaped}%`).limit(3);
        }

        if ((!resData.data || resData.data.length === 0) && exam.career_track) {
          let fallbackTerm = exam.exam_name.split(' ')[0];
          if (exam.career_track === 'POLICE_CAPF') fallbackTerm = 'Constable';
          else if (exam.career_track === 'SSC') fallbackTerm = 'SSC';
          else if (exam.career_track === 'RAILWAYS') fallbackTerm = 'RRB';
          else if (exam.career_track === 'BANKING') fallbackTerm = 'IBPS';
          else if (exam.career_track === 'DEFENCE') fallbackTerm = 'Defence';

          resData = await supabase.from('resources_v2').select('*').ilike('exam_name', `%${fallbackTerm}%`).limit(3);
          quizData = await supabase.from('quizzes').select('*').ilike('exam_name', `%${fallbackTerm}%`).limit(3);
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
              <Link key={res.id} to={`/reader/${res.resource_id}`} className="results-prep-item">
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
  const [loading, setLoading] = useState(true);
  const [recommendations, setRecommendations] = useState([]);
  const [veerScore, setVeerScore] = useState(null);
  const [fullName, setFullName] = useState('');
  const [effectiveTier, setEffectiveTier] = useState('FREE');
  const [localTierOverride, setLocalTierOverride] = useState(null);
  const [rawProfile, setRawProfile] = useState(null);
  const [session, setSession] = useState(null);
  const [expandedExamId, setExpandedExamId] = useState(null);
  const [pointsAwarded, setPointsAwarded] = useState(0);
  const [pointsBalance, setPointsBalance] = useState(null);

  const { purchase, statusFor, errorFor } = useInlineUnlock({
    userId: session?.user?.id,
    email: session?.user?.email,
    mobile: session?.user?.user_metadata?.mobile,
    fullName,
  });

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        setSession(currentSession);
        let tier = 'FREE';

        if (currentSession?.user) {
          const { data: profile } = await supabase
            .from('user_profiles')
            .select('subscription_tier, subscription_expires_at, full_name, recommendations, veer_score, raw_profile_data')
            .eq('id', currentSession.user.id)
            .maybeSingle();

          if (profile) {
            tier = getEffectiveTier(profile.subscription_tier, profile.subscription_expires_at);
            setFullName(profile.full_name || '');
            setRawProfile(profile.raw_profile_data || null);

            // Prefer the payload just returned by /api/profile/recommend
            // (passed via router state) to avoid a duplicate fetch; fall
            // back to the persisted profile for refreshes/back-navigation.
            const stateRecs = location.state?.recommendations;
            const stateScore = location.state?.summary?.overall_match_score;

            setRecommendations(stateRecs?.length ? stateRecs : (profile.recommendations || []));
            setVeerScore(stateScore != null ? Math.round(stateScore) : profile.veer_score);

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
        setEffectiveTier(tier);
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
  const tier = higherTier(effectiveTier, localTierOverride);
  const canSeeScore = canViewVeerScore(tier);
  const canSeeMatches = canViewRecommendations(tier);
  const canSeeCv = canGenerateCV(tier);
  const unlockStatus = statusFor('SCORE_UNLOCK');
  const cvAddonStatus = statusFor('CV_ADDON');

  const insights = rawProfile ? getProfilingInsights(rawProfile, { context: 'results' }) : [];
  const careerDirection = insights.find((i) => i.label === 'Career Alignment');
  const topStrengths = insights.filter((i) => i.label !== 'Career Alignment').slice(0, 3);
  const transferableSkills = rawProfile ? getTransferableSkills(rawProfile) : [];
  const pathsCount = location.state?.totalEligible ?? recommendations.length;
  const skillGaps = location.state?.skillGaps || [];

  const handleUnlockScore = async () => {
    const { ok, tier: newTier } = await purchase('SCORE_UNLOCK');
    if (ok) setLocalTierOverride((prev) => higherTier(prev, newTier));
  };

  const handleAddCv = async () => {
    const { ok, tier: newTier } = await purchase('CV_ADDON');
    if (ok) setLocalTierOverride((prev) => higherTier(prev, newTier));
  };

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
            {!canSeeScore ? (
              <div className="results-locked">
                <div className="results-score-display results-blurred">{veerScore != null ? veerScore : '87'}</div>
                <div className="results-lock-overlay">
                  <Lock size={26} color="var(--ios-olive)" />
                  <p className="results-lock-title">Discover Your VeerScore</p>
                  <p className="results-lock-desc">Your career readiness score, calculated from:</p>
                  <ul className="results-explain-list">
                    {VEERSCORE_FACTORS.map((f, i) => <li key={i}>{f}</li>)}
                  </ul>
                  <Button
                    type="button"
                    icon={Crown}
                    disabled={unlockStatus === 'processing'}
                    onClick={handleUnlockScore}
                  >
                    {unlockStatus === 'processing' ? 'Processing…' : 'Reveal My VeerScore — ₹9'}
                  </Button>
                  <p className="results-onetime-note">One-time career analysis — not a subscription.</p>
                  {errorFor('SCORE_UNLOCK') && <p className="results-error-text">{errorFor('SCORE_UNLOCK')}</p>}
                </div>
              </div>
            ) : (
              <>
                <motion.div
                  className="results-score-display"
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.4, delay: 0.25, ease: 'easeOut' }}
                >
                  {veerScore != null ? veerScore : '—'}
                </motion.div>
                <p className="card-desc">Your overall readiness score, calculated from service history, skills, and physical standards.</p>
              </>
            )}
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

            {!canSeeMatches ? (
              <div className="results-locked">
                <div className="results-blurred">
                  {[{ exam_name: 'SSC Stenographer Grade C & D', career_track: 'SSC', score: 95 },
                    { exam_name: 'RRB Junior Engineer', career_track: 'Railways', score: 88 }].map((rec, idx) => (
                    <div key={idx} className="results-rec-item">
                      <div className="results-rec-rank">{idx + 1}</div>
                      <div className="results-rec-info">
                        <h3>{rec.exam_name}</h3>
                        <div className="results-rec-meta"><span><Briefcase size={14} /> {rec.career_track}</span></div>
                      </div>
                      <div className="results-rec-score">
                        <div className="results-score-bar-bg"><div className="results-score-bar-fill" style={{ width: `${rec.score}%` }} /></div>
                        <span>{rec.score}% Match</span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="results-lock-overlay">
                  <Lock size={30} color="var(--ios-olive)" />
                  <p className="results-lock-title">Your Exam Matches Are Ready</p>
                  <p className="results-lock-desc">Ranked, personalised exam recommendations from the {pathsCount} paths we identified.</p>
                  <Button
                    type="button"
                    variant="secondary"
                    icon={Crown}
                    disabled={unlockStatus === 'processing'}
                    onClick={handleUnlockScore}
                  >
                    {unlockStatus === 'processing' ? 'Processing…' : 'Unlock with VeerScore — ₹9'}
                  </Button>
                </div>
              </div>
            ) : topMatches.length > 0 ? (
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
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          icon={expandedExamId === rec.exam_id ? ChevronUp : ChevronDown}
                          className="results-prep-toggle"
                          onClick={() => setExpandedExamId(expandedExamId === rec.exam_id ? null : rec.exam_id)}
                        >
                          Prepare
                        </Button>
                        {rec.website && (
                          <a href={rec.website} target="_blank" rel="noopener noreferrer" className="results-rec-link">
                            <ExternalLink size={16} />
                          </a>
                        )}
                      </div>
                    </Card>
                    {expandedExamId === rec.exam_id && (
                      <motion.div
                        initial={{ opacity: 0, y: -6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2, ease: 'easeOut' }}
                      >
                        <ExamPrepSection exam={rec} />
                      </motion.div>
                    )}
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

      {/* Career Opportunities reveal — skill gaps, CV add-on, subscription */}
      <AnimatePresence>
        {canSeeScore && (
          <motion.div
            className="results-opportunities"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
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
              {canSeeCv ? (
                <Card as={Link} to="/cv" interactive className="results-cta-card">
                  <FileText size={22} color="var(--ios-olive)" />
                  <div>
                    <h4>Build Your Resume</h4>
                    <p>Turn your service record into an industry-fit CV.</p>
                  </div>
                  <ArrowRight size={18} className="results-cta-arrow" />
                </Card>
              ) : (
                <Card className="results-addon-card">
                  <Gift size={22} color="var(--ios-olive)" />
                  <div>
                    <h4>Add your personalised CV for just ₹1 more</h4>
                    <p>You&apos;ve unlocked your VeerScore — add CV generation as a bonus.</p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    disabled={cvAddonStatus === 'processing'}
                    onClick={handleAddCv}
                  >
                    {cvAddonStatus === 'processing' ? 'Processing…' : 'Add CV — ₹1'}
                  </Button>
                  {errorFor('CV_ADDON') && <p className="results-error-text">{errorFor('CV_ADDON')}</p>}
                </Card>
              )}
              <Card as={Link} to="/learning-center" interactive className="results-cta-card">
                <PlayCircle size={22} color="var(--ios-olive)" />
                <div>
                  <h4>Explore the Learning Center</h4>
                  <p>Study guides and quizzes for every matched exam.</p>
                </div>
                <ArrowRight size={18} className="results-cta-arrow" />
              </Card>
              <Card as={Link} to="/dashboard" interactive className="results-cta-card">
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
        )}
      </AnimatePresence>

      {!canSeeScore && (
        <div className="results-cta-row results-cta-row-locked">
          <Card as={Link} to="/learning-center" interactive className="results-cta-card">
            <PlayCircle size={22} color="var(--ios-olive)" />
            <div>
              <h4>Explore the Learning Center</h4>
              <p>Study guides and quizzes for every matched exam.</p>
            </div>
            <ArrowRight size={18} className="results-cta-arrow" />
          </Card>
          <Card as={Link} to="/dashboard" interactive className="results-cta-card">
            <Target size={22} color="var(--ios-olive)" />
            <div>
              <h4>Go to Dashboard</h4>
              <p>See everything in one place, anytime.</p>
            </div>
            <ArrowRight size={18} className="results-cta-arrow" />
          </Card>
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        .results-loading {
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: calc(100vh - 64px);
        }
        .results-wrapper {
          padding: 3rem 1.5rem;
          max-width: 1100px;
          margin: 0 auto;
        }
        .results-hero {
          margin-bottom: 2rem;
          background: linear-gradient(135deg, var(--ios-olive) 0%, #2f4a1f 100%);
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
          color: #555;
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
          color: #777;
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
        .results-blurred {
          filter: blur(10px);
          user-select: none;
          pointer-events: none;
          opacity: 0.6;
        }
        .results-locked {
          position: relative;
          min-height: 220px;
        }
        .results-lock-overlay {
          position: absolute;
          top: 0; left: 0; right: 0; bottom: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: rgba(255,255,255,0.9);
          backdrop-filter: blur(3px);
          border-radius: var(--radius-md);
          padding: 1.5rem;
          text-align: center;
        }
        .results-lock-title {
          font-weight: 700;
          font-size: 1rem;
          color: #0f172a;
          margin-bottom: 0.4rem;
        }
        .results-lock-desc {
          font-size: 0.85rem;
          color: #64748b;
          margin-bottom: 0.6rem;
          line-height: 1.5;
          max-width: 320px;
        }
        .results-explain-list {
          text-align: left;
          font-size: 0.78rem;
          color: #64748b;
          margin: 0 0 1.1rem;
          padding-left: 1.1rem;
          max-width: 300px;
          line-height: 1.6;
        }
        .results-onetime-note {
          font-size: 0.72rem;
          color: #94a3b8;
          margin-top: 0.6rem;
        }
        .results-error-text {
          font-size: 0.75rem;
          color: var(--danger, #dc2626);
          margin-top: 0.5rem;
        }
        .results-btn-link {
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          color: white;
          background: var(--ios-olive);
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
          background: white;
          color: var(--ios-olive);
        }
        .results-rec-list {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }
        .results-rec-item {
          display: flex;
          align-items: center;
          gap: 1.25rem;
          padding: 1rem;
          background: var(--ios-secondary);
          border-radius: var(--radius-md);
        }
        .results-rec-rank {
          width: 32px;
          height: 32px;
          background: white;
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
          background: var(--ios-olive);
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
        .results-prep-panel {
          margin-top: 0.5rem;
        }
        .results-prep-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
        }
        .results-prep-grid h5 {
          font-size: 0.72rem;
          color: #888;
          margin-bottom: 0.5rem;
        }
        .results-prep-list {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        .results-prep-item {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.6rem 0.75rem;
          background: white;
          border-radius: var(--radius-sm);
          text-decoration: none;
          color: var(--ios-text);
          font-size: 0.8rem;
          font-weight: 600;
          border: 1px solid rgba(0,0,0,0.05);
        }
        .results-prep-item:hover { border-color: var(--ios-olive); color: var(--ios-olive); }
        .results-prep-none { font-size: 0.8rem; color: #aaa; }
        .results-prep-loading, .results-prep-empty {
          padding: 1rem;
          text-align: center;
          color: #999;
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
        .results-gap-item p { margin: 0.25rem 0 0; font-size: 0.82rem; color: #666; line-height: 1.5; }
        .results-cta-row {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1.5rem;
        }
        .results-cta-row-locked { margin-bottom: 1.5rem; grid-template-columns: repeat(2, 1fr); }
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
        .results-addon-card {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          background: linear-gradient(135deg, rgba(75,107,50,0.08) 0%, rgba(75,107,50,0.03) 100%);
          border: 1px dashed var(--ios-olive);
        }
        .results-addon-card h4 { font-size: 0.95rem; margin: 0 0 0.2rem; }
        .results-addon-card p { font-size: 0.8rem; color: #888; margin: 0; }
        .results-subscribe-card {
          display: flex;
          align-items: center;
          gap: 1.5rem;
          background: linear-gradient(135deg, var(--ios-olive) 0%, #2f4a1f 100%);
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
          .results-cta-row, .results-cta-row-locked { grid-template-columns: 1fr; }
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
