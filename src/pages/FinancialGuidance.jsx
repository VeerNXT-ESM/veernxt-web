import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import {
  QUESTIONS,
  AMOUNT_OPTIONS,
  PROFILES,
  FIVE_LAWS,
  GOLDEN_RULES,
  getProfile,
  getAllocation,
  formatINR,
  buildWhatsAppLink,
} from '../data/financialProfiles';
import {
  ShieldCheck,
  ArrowRight,
  ArrowLeft,
  ChevronRight,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  MessageCircle,
  Landmark,
  TrendingUp,
  Award,
  Download,
  Sparkles,
  Target,
  Heart,
  XCircle,
} from 'lucide-react';
import './FinancialGuidance.css';

// ─── Phase Constants ────────────────────────────────────────────
const PHASE = {
  LANDING: 'landing',
  QUIZ: 'quiz',
  RESULT: 'result',
  SUBMITTED: 'submitted',
  PORTAL: 'portal',
};

const FinancialGuidance = () => {
  const [phase, setPhase] = useState(PHASE.LANDING);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [corpusAmount, setCorpusAmount] = useState(null);
  const [profileKey, setProfileKey] = useState(null);
  const [allocation, setAllocation] = useState(null);
  const [userName, setUserName] = useState('Agniveer');
  const [userPhone, setUserPhone] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userId, setUserId] = useState(null);
  const [saving, setSaving] = useState(false);

  // Load user profile from Supabase session
  useEffect(() => {
    const loadUser = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setUserId(session.user.id);
          setUserEmail(session.user.email || '');

          const { data: profile } = await supabase
            .from('user_profiles')
            .select('full_name, mobile')
            .eq('id', session.user.id)
            .single();

          if (profile) {
            setUserName(profile.full_name || 'Agniveer');
            setUserPhone(profile.mobile || '');
          }
        }
      } catch (err) {
        console.error('Error loading user profile:', err);
      }
    };
    loadUser();
    setTimeout(() => {
      const el = document.getElementById('quiz-section');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 400);
  }, []);

  const scrollToQuiz = () => {
    setTimeout(() => {
      const el = document.getElementById('quiz-section');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  };

  // ─── Handlers ─────────────────────────────────────────────────
  const startQuiz = () => {
    setPhase(PHASE.QUIZ);
    setStep(0);
    setAnswers({});
    setCorpusAmount(null);
    setProfileKey(null);
    setAllocation(null);
    scrollToQuiz();
  };

  const selectOption = (qid, key) => {
    setAnswers(prev => ({ ...prev, [qid]: key }));
  };

  const selectAmount = (val) => {
    setCorpusAmount(val);
  };

  const nextStep = () => {
    if (step < QUESTIONS.length - 1) {
      setStep(s => s + 1);
    }
  };

  const prevStep = () => {
    if (step > 0) {
      setStep(s => s - 1);
    }
  };

  const finishQuiz = () => {
    if (!corpusAmount) return;
    const pKey = getProfile(answers);
    const alloc = getAllocation(pKey, corpusAmount);
    setProfileKey(pKey);
    setAllocation(alloc);
    setPhase(PHASE.RESULT);
    scrollToQuiz();
  };

  const restartQuiz = () => {
    setPhase(PHASE.LANDING);
    setStep(0);
    setAnswers({});
    setCorpusAmount(null);
    setProfileKey(null);
    setAllocation(null);
    scrollToQuiz();
  };

  // Save to Supabase + open WhatsApp
  const handleConsultantHandoff = useCallback(async () => {
    setSaving(true);
    try {
      // Save to Supabase (best-effort, don't block WhatsApp)
      if (userId) {
        await supabase.from('financial_profiles').insert({
          user_id: userId,
          user_name: userName,
          user_email: userEmail,
          user_phone: userPhone,
          answers,
          profile_key: profileKey,
          profile_name: PROFILES[profileKey]?.name || '',
          corpus_amount: corpusAmount,
          allocation: allocation?.items || [],
        }).then(({ error }) => {
          if (error) console.warn('Supabase save warning:', error.message);
        });
      }

      // Build WhatsApp link and open
      const waLink = buildWhatsAppLink({
        userName,
        userPhone,
        profileKey,
        profileName: PROFILES[profileKey]?.name || '',
        corpusAmount,
        allocation,
        answers,
      });

      window.open(waLink, '_blank');
      setPhase(PHASE.SUBMITTED);
    } catch (err) {
      console.error('Handoff error:', err);
      // Still open WhatsApp even if Supabase fails
      const waLink = buildWhatsAppLink({
        userName,
        userPhone,
        profileKey,
        profileName: PROFILES[profileKey]?.name || '',
        corpusAmount,
        allocation,
        answers,
      });
      window.open(waLink, '_blank');
      setPhase(PHASE.SUBMITTED);
    } finally {
      setSaving(false);
    }
  }, [userId, userName, userEmail, userPhone, answers, profileKey, corpusAmount, allocation]);

  // Print-friendly PDF download
  const handleDownload = () => {
    window.print();
  };

  const currentQuestion = QUESTIONS[step];
  const profile = profileKey ? PROFILES[profileKey] : null;

  // ─── RENDER: PORTAL ──────────────────────────────────────────
  if (phase === PHASE.PORTAL) {
    return (
      <div className="finance-site-root">
        <ClientNavbar onGoPortal={() => setPhase(PHASE.PORTAL)} onGoLanding={() => setPhase(PHASE.LANDING)} isPortalView />
        <InvestorPortal onBack={() => setPhase(PHASE.LANDING)} />
        <ClientFooter />
        <FinancialGuidanceStyles />
      </div>
    );
  }

  // ─── RENDER: MAIN GUIDANCE PAGE WITH EMBEDDED QUIZ/RESULT ────
  return (
    <div className="finance-site-root">
      <ClientNavbar
        onGoPortal={() => { setPhase(PHASE.PORTAL); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
        onGoLanding={() => { setPhase(PHASE.LANDING); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
      />
      <ClientLandingPage
        onStartQuiz={startQuiz}
        onGoPortal={() => { setPhase(PHASE.PORTAL); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
        phase={phase}
        setPhase={setPhase}
        step={step}
        nextStep={nextStep}
        prevStep={prevStep}
        selectOption={selectOption}
        selectAmount={selectAmount}
        answers={answers}
        corpusAmount={corpusAmount}
        finishQuiz={finishQuiz}
        restartQuiz={restartQuiz}
        profile={profile}
        allocation={allocation}
        userName={userName}
        setUserName={setUserName}
        userPhone={userPhone}
        setUserPhone={setUserPhone}
        userEmail={userEmail}
        setUserEmail={setUserEmail}
        saving={saving}
        handleSubmitProfile={handleConsultantHandoff}
        profileKey={profileKey}
        currentQuestion={QUESTIONS[step] || QUESTIONS[0]}
        QUESTIONS={QUESTIONS}
        AMOUNT_OPTIONS={AMOUNT_OPTIONS}
        PROFILES={PROFILES}
        formatINR={formatINR}
      />
      <ClientFooter />
      <FinancialGuidanceStyles />
    </div>
  );

};

// ─── CLIENT NAVBAR ──────────────────────────────────────────────
const ClientNavbar = ({ onGoPortal, onGoLanding, isPortalView }) => (
  <nav className="nav" role="navigation" aria-label="Main navigation">
    <div className="nav-inner">
      <div className="nav-logo" onClick={onGoLanding} style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
        <img src="/logo.png" alt="VeerNXT Logo" style={{ height: '60px', width: 'auto', objectFit: 'contain' }} />
      </div>
      <ul className="nav-links">
        <li><a href="/" style={{ color: 'var(--g)', fontWeight: 700 }}>← Main Site</a></li>
        <li><a href="#pillars" onClick={onGoLanding}>What We Offer</a></li>
        <li><a href="#tools" onClick={onGoLanding}>Tools</a></li>
        <li><a href="#quiz-section" onClick={onGoLanding}>Quiz</a></li>
        <li><a href="#community" onClick={onGoLanding}>Community</a></li>
        <li><a href="#seva-dividend" onClick={onGoLanding}>Seva Dividend</a></li>
        <li>
          {isPortalView ? (
            <button className="nav-cta" onClick={onGoLanding}>← Back to Guidance</button>
          ) : (
            <button className="nav-cta" onClick={onGoPortal}>Go to Finance Portal</button>
          )}
        </li>
      </ul>
      <div className="nav-right" style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <span className="nav-amfi" aria-label="AMFI Registration" style={{ fontSize: '11px', color: '#777', fontWeight: 500, letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>
          AMFI ARN – 362619
        </span>
        <img src="/finance/AOG%20logo.jpeg" alt="AOG Logo" style={{ height: '54px', width: 'auto', objectFit: 'contain', borderRadius: '4px' }} />
      </div>
    </div>
  </nav>
);

// ─── CLIENT FOOTER ──────────────────────────────────────────────
const ClientFooter = () => (
  <footer className="footer" role="contentinfo">
    <div className="container">
      <div className="footer-grid">
        <div className="footer-brand">
          <div className="footer-logo">Veer<span>NXT</span></div>
          <p>
            An Agniveer &amp; Ex-Serviceman empowerment platform.
            Built by veterans. Advised by service chiefs. Serving those who served.
          </p>
          <div className="footer-tagline">सेवा से समृद्ध कल की ओर</div>
          <div style={{ marginTop: '12px', fontSize: '12px', color: 'var(--mid)' }}>
            <strong>AMFI ARN – 362619</strong> | Regulated Financial Distribution
          </div>
        </div>
        <div className="footer-col">
          <h4>Platform</h4>
          <ul>
            <li><a href="#mission">The Mission</a></li>
            <li><a href="#profiling">Agniveer Profiling</a></li>
            <li><a href="#pillars">Six Pillars</a></li>
            <li><a href="#tools">Calculators</a></li>
          </ul>
        </div>
        <div className="footer-col">
          <h4>Community &amp; Operations</h4>
          <ul>
            <li><a href="#seva-dividend">Sewa Labh / Rewards</a></li>
            <li><a href="#quiz-section">Interactive Guidance Quiz</a></li>
            <li><strong>Company Operating Base (COB):</strong> #227</li>
            <li><strong>Working Hours:</strong> Operational 24×7</li>
          </ul>
        </div>
        <div className="footer-col">
          <h4>Regulatory &amp; Legal</h4>
          <ul>
            <li><a href="#partners">AMFI &amp; SEBI Disclosure</a></li>
            <li><a href="#login">Prudent Execution</a></li>
            <li><a href="#disclaimer">Risk Disclaimer</a></li>
          </ul>
        </div>
      </div>
      <div className="footer-bottom">
        &copy; {new Date().getFullYear()} VeerNXT. All rights reserved. • Veteran Works Foundation • AMFI ARN – 362619
      </div>
    </div>
  </footer>
);

// ─── INVESTOR PORTAL COMPONENT (PHASE.PORTAL) ───────────────────
const InvestorPortal = ({ onBack }) => (
  <div className="portal-container animate-fade-in">
    <button className="portal-back-btn" onClick={onBack}>
      <ArrowLeft size={16} /> Back to Financial Guidance
    </button>
    
    <div>
      <span className="portal-badge">INVESTOR PORTAL</span>
      <h1 className="portal-title">Portfolio Login</h1>
    </div>

    <div className="portal-cards-grid">
      {/* New Investor Registration */}
      <div className="portal-card">
        <div className="portal-logo-box">
          <img src="/logo.png" alt="VeerNXT Logo" style={{ height: '70px', width: 'auto', objectFit: 'contain' }} />
        </div>
        <div className="portal-card-brand">FundzBazar</div>
        <div className="portal-card-sub">New Investor Registration</div>
        <a
          href="https://fundzbazar.com/Link/vI0QeHtSo8Y"
          target="_blank"
          rel="noopener noreferrer"
          className="portal-action-btn"
        >
          Click To Register <ArrowRight size={16} />
        </a>
      </div>

      {/* Existing Client Login */}
      <div className="portal-card">
        <div className="portal-logo-box">
          <img src="/logo.png" alt="VeerNXT Logo" style={{ height: '70px', width: 'auto', objectFit: 'contain' }} />
        </div>
        <div className="portal-card-brand">FundzBazar</div>
        <div className="portal-card-sub">Existing Client Login</div>
        <a
          href="https://fundzbazar.com/Link/w_VNahzPG5U"
          target="_blank"
          rel="noopener noreferrer"
          className="portal-action-btn"
        >
          Click To Login <ArrowRight size={16} />
        </a>
      </div>
    </div>

    <div className="portal-scan-section">
      <h2 className="portal-scan-title">Scan to Access FundzBazar</h2>
      <p className="portal-scan-sub">
        Quickly access the FundzBazar website or download the mobile application by scanning the QR codes below with your smartphone.
      </p>

      <div className="portal-qr-grid">
        {/* Website QR */}
        <div className="portal-qr-card">
          <div className="portal-qr-title">FundzBazar Website</div>
          <div className="portal-qr-frame">
            <img src="/finance/WebQR.jpeg" alt="FundzBazar Website QR Code" />
          </div>
          <div className="portal-qr-footer">Scan to visit the web portal</div>
        </div>

        {/* Mobile App QR */}
        <div className="portal-qr-card">
          <div className="portal-qr-title">FundzBazar Mobile App</div>
          <div className="portal-qr-frame">
            <img src="/finance/MobileQR.jpeg" alt="FundzBazar Mobile App QR Code" />
          </div>
          <div className="portal-qr-footer">Scan to download the app</div>
        </div>
      </div>
    </div>
  </div>
);

// ─── EMBEDDED GUIDANCE QUIZ & RESULTS COMPONENT ─────────────────
const EmbeddedQuizSection = ({
  phase,
  setPhase,
  step,
  nextStep,
  prevStep,
  selectOption,
  selectAmount,
  answers,
  corpusAmount,
  finishQuiz,
  restartQuiz,
  profile,
  allocation,
  userName,
  setUserName,
  userPhone,
  setUserPhone,
  userEmail,
  setUserEmail,
  saving,
  handleSubmitProfile,
  profileKey,
  currentQuestion,
  QUESTIONS,
  AMOUNT_OPTIONS,
  PROFILES,
  formatINR
}) => {
  const isLast = step === QUESTIONS.length - 1;
  const selectedAnswer = currentQuestion ? answers[currentQuestion.id] : null;

  // 1. SUBMITTED VIEW
  if (phase === PHASE.SUBMITTED) {
    return (
      <div className="fg-submitted-container animate-fade-in" style={{ margin: '0 auto', maxWidth: '760px' }}>
        <div className="fg-success-icon">
          <CheckCircle size={64} color="#1D9E75" />
        </div>
        <h3 className="fg-success-title" style={{ fontSize: '28px', marginTop: '16px' }}>
          You're All Set, {userName.split(' ')[0]}!
        </h3>
        <p className="fg-success-sub" style={{ marginBottom: '24px' }}>
          Your financial profile has been shared with our team. A VeerNXT financial consultant will contact you within 24 hours to create your detailed plan.
        </p>

        <div className="fg-submitted-summary">
          <div className="fg-sub-item">
            <span className="fg-sub-label">Profile</span>
            <span className="fg-sub-val">{PROFILES[profileKey]?.name || profileKey}</span>
          </div>
          <div className="fg-sub-item">
            <span className="fg-sub-label">Corpus</span>
            <span className="fg-sub-val">{formatINR(corpusAmount)}</span>
          </div>
          <div className="fg-sub-item">
            <span className="fg-sub-label">Recommended SIP</span>
            <span className="fg-sub-val">{formatINR(Math.max(Math.round(corpusAmount * 0.05 / 12), 500))}/mo</span>
          </div>
        </div>

        <div className="fg-submitted-actions" style={{ marginTop: '32px' }}>
          <button className="fg-cta-btn fg-cta-outline" onClick={() => setPhase(PHASE.RESULT)}>
            View My Allocation <ArrowRight size={16} />
          </button>
          <button className="fg-cta-btn" onClick={restartQuiz}>
            <RefreshCw size={16} /> New Profile
          </button>
        </div>
      </div>
    );
  }

  // 2. RESULT VIEW
  if (phase === PHASE.RESULT && profile && allocation) {
    const sipMonthly = Math.max(Math.round(corpusAmount * 0.05 / 12), 500);

    return (
      <div className="fg-result-container animate-fade-in" style={{ margin: '0 auto', maxWidth: '960px' }}>
        {/* Profile Header */}
        <div className="fg-profile-header" style={{ background: profile.bgColor, borderColor: profile.borderColor }}>
          <div className="fg-profile-tag" style={{ background: profile.color, color: '#fff' }}>
            <Award size={14} /> {profileKey}
          </div>
          <h3 className="fg-profile-name" style={{ color: profile.color, fontSize: '32px', margin: '12px 0 8px' }}>
            {profile.name}
          </h3>
          <p className="fg-profile-tagline" style={{ fontWeight: '600', marginBottom: '8px' }}>{profile.tagline}</p>
          <p className="fg-profile-desc">{profile.description}</p>
        </div>

        {/* Total Corpus Display */}
        <div className="fg-corpus-card">
          <div className="fg-corpus-left">
            <span className="fg-corpus-label">Your Seva Nidhi Corpus</span>
            <span className="fg-corpus-amount">{formatINR(corpusAmount)}</span>
            <span className="fg-corpus-tax">100% Tax-Free • Yours to Keep</span>
          </div>
          <div className="fg-corpus-right">
            <span className="fg-sip-label">Recommended Monthly SIP</span>
            <span className="fg-sip-amount">{formatINR(sipMonthly)}/mo</span>
            <span className="fg-sip-sub">5% of corpus • Build recurring wealth</span>
          </div>
        </div>

        {/* Allocation Table */}
        <div className="fg-section animate-fade-in" style={{ animationDelay: '0.15s', marginTop: '32px' }}>
          <h3 className="fg-section-title" style={{ fontSize: '22px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <TrendingUp size={22} color="var(--g)" />
            Recommended Rupee-Level Allocation
          </h3>
          <p className="fg-section-sub" style={{ marginBottom: '20px', color: 'var(--mid)' }}>
            Specific distribution across SEBI-regulated instruments for maximum growth and security.
          </p>

          <div className="fg-table-wrapper">
            <table className="fg-allocation-table">
              <thead>
                <tr>
                  <th>Instrument / Category</th>
                  <th>Share</th>
                  <th>Amount (₹)</th>
                  <th>Why This Instrument</th>
                  <th>Priority</th>
                </tr>
              </thead>
              <tbody>
                {allocation.map((item, idx) => (
                  <tr key={idx}>
                    <td>
                      <div className="fg-inst-name">{item.name}</div>
                      <div className="fg-inst-cat">{item.category}</div>
                    </td>
                    <td className="fg-td-pct">
                      <span className="fg-pct-badge" style={{ backgroundColor: item.color + '18', color: item.color }}>
                        {item.percentage}%
                      </span>
                    </td>
                    <td className="fg-td-amt">{formatINR(item.amount)}</td>
                    <td className="fg-td-why">{item.rationale}</td>
                    <td>
                      <span className={`fg-priority-flag ${item.priority.toLowerCase()}`}>
                        {item.priority}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 3 Golden Rules */}
        <div className="fg-section animate-fade-in" style={{ animationDelay: '0.25s', marginTop: '40px' }}>
          <h3 className="fg-section-title" style={{ fontSize: '22px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldCheck size={22} color="var(--g)" />
            3 Rules for Your Seva Nidhi
          </h3>
          <div className="fg-rules-grid">
            {GOLDEN_RULES.map((rule, idx) => (
              <div key={idx} className="fg-rule-card">
                <div className="fg-rule-num">Rule 0{idx + 1}</div>
                <h4 className="fg-rule-title">{rule.title}</h4>
                <p className="fg-rule-text">{rule.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* WhatsApp Consultant CTA Box */}
        <div className="fg-handoff-card animate-fade-in" style={{ animationDelay: '0.35s', marginTop: '40px' }}>
          <div className="fg-handoff-header">
            <div className="fg-handoff-icon">
              <MessageCircle size={28} color="#25D366" />
            </div>
            <div>
              <h3 className="fg-handoff-title" style={{ fontSize: '24px' }}>Get Your Custom Investment Plan on WhatsApp</h3>
              <p className="fg-handoff-sub">
                A VeerNXT financial consultant will review your profile and send a step-by-step execution guide. Zero spam. 100% free for Agniveers.
              </p>
            </div>
          </div>

          <div className="fg-handoff-form">
            <div className="fg-form-row">
              <div className="fg-input-group">
                <label>Your Name</label>
                <input
                  type="text"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  placeholder="e.g. Havildar Rajesh"
                />
              </div>
              <div className="fg-input-group">
                <label>WhatsApp Number</label>
                <input
                  type="tel"
                  value={userPhone}
                  onChange={(e) => setUserPhone(e.target.value)}
                  placeholder="e.g. 9876543210"
                />
              </div>
            </div>
            <div className="fg-input-group">
              <label>Email (for PDF report)</label>
              <input
                type="email"
                value={userEmail}
                onChange={(e) => setUserEmail(e.target.value)}
                placeholder="e.g. rajesh@veernxt.com"
              />
            </div>

            <div className="fg-handoff-actions">
              <button
                className="fg-cta-btn btn-whatsapp"
                onClick={handleSubmitProfile}
                disabled={saving || !userPhone}
              >
                <MessageCircle size={18} />
                {saving ? 'Connecting...' : 'Connect with a Consultant on WhatsApp'}
              </button>
              <button
                className="fg-cta-btn fg-cta-outline"
                onClick={restartQuiz}
              >
                <RefreshCw size={16} /> Retake Quiz
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 3. QUIZ VIEW (DEFAULT: PHASE.LANDING or PHASE.QUIZ)
  if (!currentQuestion) return null;
  return (
    <div className="fg-quiz-container animate-fade-in" style={{ margin: '0 auto', maxWidth: '760px', background: '#fff', padding: '36px', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
      {/* Progress Bar */}
      <div className="fg-progress-header">
        <div className="fg-progress-bar">
          {QUESTIONS.map((_, i) => (
            <div
              key={i}
              className={`fg-progress-step ${i < step ? 'done' : i === step ? 'active' : ''}`}
            />
          ))}
        </div>
        <span className="fg-progress-label">{step + 1} of {QUESTIONS.length}</span>
      </div>

      {/* Question Card */}
      <div className="fg-question-card" style={{ marginTop: '24px' }}>
        <div className="fg-q-label">{currentQuestion.label}</div>
        <h3 className="fg-q-text" style={{ fontSize: '26px', marginTop: '6px', color: 'var(--ink)' }}>{currentQuestion.text}</h3>
        <p className="fg-q-sub">{currentQuestion.sub}</p>

        {/* Amount selector */}
        {currentQuestion.isAmount ? (
          <div className="fg-amount-grid">
            {AMOUNT_OPTIONS.map(a => (
              <div
                key={a.value}
                className={`fg-amt-card ${corpusAmount === a.value ? 'selected' : ''}`}
                onClick={() => selectAmount(a.value)}
              >
                <div className="fg-amt-main">{a.label}</div>
                <div className="fg-amt-sub">{a.sub}</div>
              </div>
            ))}
          </div>
        ) : (
          /* Option selector */
          <div className="fg-options">
            {currentQuestion.options.map(opt => (
              <div
                key={opt.key}
                className={`fg-option ${selectedAnswer === opt.key ? 'selected' : ''}`}
                onClick={() => selectOption(currentQuestion.id, opt.key)}
              >
                <div className={`fg-opt-key ${selectedAnswer === opt.key ? 'selected' : ''}`}>
                  {opt.key}
                </div>
                <div className="fg-opt-body">
                  <div className="fg-opt-title">{opt.title}</div>
                  {opt.sub && <div className="fg-opt-sub">{opt.sub}</div>}
                </div>
                {selectedAnswer === opt.key && (
                  <CheckCircle size={18} color="#1D9E75" style={{ flexShrink: 0 }} />
                )}
              </div>
            ))}
          </div>
        )}

        {/* Navigation buttons */}
        <div className="fg-q-nav" style={{ marginTop: '32px' }}>
          <button
            className="fg-nav-btn fg-nav-prev"
            onClick={prevStep}
            disabled={step === 0}
          >
            <ArrowLeft size={16} /> Previous
          </button>

          {isLast ? (
            <button
              className="fg-cta-btn"
              onClick={finishQuiz}
              disabled={!corpusAmount}
            >
              See My Allocation <ArrowRight size={18} />
            </button>
          ) : (
            <button
              className="fg-cta-btn fg-nav-next"
              onClick={nextStep}
              disabled={!answers[currentQuestion.id]}
            >
              Next <ArrowRight size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── CLIENT LANDING PAGE COMPONENT ──────────────────────────────
const ClientLandingPage = ({
  onStartQuiz,
  onGoPortal,
  phase,
  setPhase,
  step,
  nextStep,
  prevStep,
  selectOption,
  selectAmount,
  answers,
  corpusAmount,
  finishQuiz,
  restartQuiz,
  profile,
  allocation,
  userName,
  setUserName,
  userPhone,
  setUserPhone,
  userEmail,
  setUserEmail,
  saving,
  handleSubmitProfile,
  profileKey,
  currentQuestion,
  QUESTIONS,
  AMOUNT_OPTIONS,
  PROFILES,
  formatINR
}) => {
  const [calcTab, setCalcTab] = useState('sip');
  const [sipAmt, setSipAmt] = useState(500);
  const [sipYr, setSipYr] = useState(10);
  const [corpAmt, setCorpAmt] = useState(1000000);
  const [corpYr, setCorpYr] = useState(5);

  // Math calculations
  const sipR = 12 / 100 / 12;
  const sipN = sipYr * 12;
  const sipFV = Math.round(sipAmt * ((Math.pow(1 + sipR, sipN) - 1) / sipR) * (1 + sipR));
  const sipInvested = Math.round(sipAmt * sipN);
  const sipGain = sipFV - sipInvested;

  const corpR = 7.5 / 100;
  const corpN = corpYr;
  const corpFV = Math.round(corpAmt * Math.pow(1 + corpR, corpN));
  const corpGain = corpFV - corpAmt;

  return (
    <div>
      {/* ── VERIFIED AGNIVEER STRIP ─────────────────────────────── */}
      <div className="verified-strip" role="banner">
        <div className="verified-strip-inner">
          <p>🎖️ Built By Veterans. For Veterans, ESM and Agniveers — <strong>AMFI ARN – 362619</strong> <a href="#quiz-section">Start My Mission Profile →</a></p>
        </div>
      </div>

      {/* ── HERO ────────────────────────────────────────────────── */}
      <section className="hero" aria-labelledby="hero-headline">
        <div className="hero-inner">
          <div className="hero-left">
            <div className="hero-eyebrow" aria-hidden="true">
              <span className="hero-dot"></span>
              <span className="hero-eyebrow-text">Built By Veterans. For Veterans, ESM and Agniveers</span>
            </div>
            <h1 className="hero-headline" id="hero-headline">
              The parade is over.<br />
              Your <em>second mission</em><br />
              starts here.
            </h1>
            <p className="hero-hindi" lang="hi" aria-label="Sewa se samriddh kal ki or">सेवा से समृद्ध कल की ओर</p>
            <p className="hero-sub">
              You wore the uniform. You served this Nation with Honour.<br />
              VeerNXT exists to make sure that same commitment now builds you
              <strong> a career, a community, and a prosperous future.</strong><br />
              One platform. Built for every soldier who ever served.
            </p>


            <div className="hero-actions">
              <button onClick={onStartQuiz} className="btn btn-gold">
                <span>🎯</span> Start My Mission Profile
              </button>
              <a href="#mission" className="btn btn-outline">See How it Works</a>
            </div>
            <div className="hero-trust" aria-label="Trust signals">
              <span className="trust-item"><span className="trust-icon" aria-hidden="true">🛡️</span> AMFI ARN – 362619</span>
              <span className="trust-item"><span className="trust-icon" aria-hidden="true">🏦</span> Execution via Prudent (BSE/NSE Listed)</span>
              <span className="trust-item"><span className="trust-icon" aria-hidden="true">✅</span> Zero cost to Agniveer &amp; ESM</span>
            </div>
          </div>

          <div className="hero-right" aria-hidden="true">
            <div className="stat-card" style={{ background: 'linear-gradient(135deg, rgba(201,168,76,0.15), rgba(26,92,42,0.25))', border: '1px solid var(--gold)' }}>
              <div className="stat-card-num" style={{ fontSize: '26px' }}>₹10L | ₹25L | ₹50L | ₹1Cr</div>
              <div className="stat-card-label" style={{ fontWeight: 700, color: 'var(--gold)' }}>Sewa Nidhi • Gratuity • Pension • Savings</div>
              <div className="stat-card-sub">VeerNXT helps you to deploy it right and work as hard as you did</div>
            </div>
            <div className="stat-grid">
              <div className="stat-card">
                <div className="stat-card-num">50K+</div>
                <div className="stat-card-label">Agniveers released every year</div>
              </div>
              <div className="stat-card">
                <div className="stat-card-num">4 Yrs</div>
                <div className="stat-card-label">Of discipline. Now applied to wealth.</div>
              </div>
              <div className="stat-card">
                <div className="stat-card-num">8</div>
                <div className="stat-card-label">Distinct Agniveer profiles mapped</div>
              </div>
              <div className="stat-card">
                <div className="stat-card-num">Zero</div>
                <div className="stat-card-label">Competing platforms. VeerNXT is first.</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── SITUATION & ETHOS ────────────────────────────────────── */}
      <section className="situation" id="mission" aria-labelledby="situation-headline">
        <div className="container">
          <div className="section-eyebrow">Life Situation — The Situation Changes</div>
          <h2 className="section-headline" id="situation-headline">The soldier who served his country without hesitation deserves a structured transition without compromise.</h2>
          <p className="section-sub">
            A plan. A community. A good advice. A platform that understands him. In his language. And at the moment he needs it the most.<br />
            <strong>They deserved it then. VeerNXT delivers it now</strong>
          </p>
          
          <div className="situation-grid">
            <div className="situation-left">
              <div className="fact-list">
                <div className="fact-item">
                  <div className="fact-num">01</div>
                  <div className="fact-text"><strong>Zero income on Day 1</strong>After structured service, monthly income pauses. Your financial runway is your Seva Nidhi &amp; Gratuity — and it must last.</div>
                </div>
                <div className="fact-item">
                  <div className="fact-num">02</div>
                  <div className="fact-text"><strong>Predatory advisors are waiting</strong>The moment you receive your corpus, local agents offer plans serving their commission, not your future.</div>
                </div>
                <div className="fact-item">
                  <div className="fact-num">03</div>
                  <div className="fact-text"><strong>No structured civilian pathway</strong>Thousands of disconnected opportunities with no single map to navigate them — until now.</div>
                </div>
                <div className="fact-item">
                  <div className="fact-num">04</div>
                  <div className="fact-text"><strong>The critical 18-month window</strong>Decisions made in the first 18 months define the next 40 years. This is the window VeerNXT was built for.</div>
                </div>
              </div>
            </div>

            <div className="situation-right">
              <p className="situation-quote">"A soldier should not have to rediscover direction the day the uniform comes off."</p>
              <div className="three-stats">
                <div className="mini-stat">
                  <div className="mini-stat-num">50K+</div>
                  <div className="mini-stat-label">Finest soldiers released every year</div>
                </div>
                <div className="mini-stat">
                  <div className="mini-stat-num">₹500Cr+</div>
                  <div className="mini-stat-label">Seva Nidhi entering civilian market annually</div>
                </div>
                <div className="mini-stat">
                  <div className="mini-stat-num">Zero</div>
                  <div className="mini-stat-label">Platform fees charged to soldiers</div>
                </div>
              </div>
              <div className="truth-box">
                <p>VeerNXT helps you deploy your corpus right and work as hard as you did during your service.</p>
                <cite>VeerNXT — Standing Orders from Day One</cite>
              </div>


            </div>
          </div>

          {/* ── ETHOS CARDS (One Uniform, Only One, Built for You, Gratitude Card) ── */}
          <div style={{ marginTop: '48px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1rem))', gap: '20px' }}>
            <div className="ethos-card" style={{ background: '#fff', padding: '24px', borderRadius: '16px', border: '1px solid var(--warm)', borderTop: '4px solid var(--g)' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--g)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>CORE VALUE</div>
              <h3 style={{ fontSize: '20px', margin: '8px 0 12px', color: 'var(--ink)' }}>One Uniform</h3>
              <ul style={{ paddingLeft: '18px', margin: 0, fontSize: '14px', color: 'var(--mid)', lineHeight: '1.8' }}>
                <li>Trained.</li>
                <li>Proven.</li>
                <li>Ready and deployed.</li>
                <li><strong>For prosperity.</strong></li>
              </ul>
            </div>

            <div className="ethos-card" style={{ background: '#fff', padding: '24px', borderRadius: '16px', border: '1px solid var(--warm)', borderTop: '4px solid var(--gold)' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--gold)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>STANDBY ORDER</div>
              <h3 style={{ fontSize: '20px', margin: '8px 0 12px', color: 'var(--ink)' }}>Only One</h3>
              <ul style={{ paddingLeft: '18px', margin: 0, fontSize: '14px', color: 'var(--mid)', lineHeight: '1.8' }}>
                <li>First to serve, last to be...</li>
                <li>No one left behind.</li>
                <li><strong>Not even after the uniform.</strong></li>
              </ul>
            </div>

            <div className="ethos-card" style={{ background: '#fff', padding: '24px', borderRadius: '16px', border: '1px solid var(--warm)', borderTop: '4px solid var(--g-dk)' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--g-dk)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>PURPOSE</div>
              <h3 style={{ fontSize: '20px', margin: '8px 0 12px', color: 'var(--ink)' }}>Built for You</h3>
              <ul style={{ paddingLeft: '18px', margin: 0, fontSize: '14px', color: 'var(--mid)', lineHeight: '1.8' }}>
                <li>Not for an institution.</li>
                <li>But because...</li>
                <li><strong>Nation comes first.</strong></li>
              </ul>
            </div>

            <div className="ethos-card" style={{ background: 'linear-gradient(135deg, #1C1C1C 0%, #0F3A1A 100%)', color: '#fff', padding: '24px', borderRadius: '16px' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--gold)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>HONOUR CARD</div>
              <h3 style={{ fontSize: '20px', margin: '8px 0 12px', color: '#fff' }}>Gratitude Card</h3>
              <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.85)', lineHeight: '1.6', margin: 0 }}>
                "A nation's gratitude appears every time returning soldiers choose its nation's way of saying <strong>'Thank You.'</strong>"
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── PROFILING PATHWAY ────────────────────────────────────── */}
      <section className="section" id="profiling" aria-labelledby="profiling-headline">
        <div className="container">
          <div className="section-eyebrow">How it works</div>
          <h2 className="section-headline" id="profiling-headline">VeerNXT walks you through, step by step.</h2>
          <p className="section-sub">No jargon. No pressure. No advisor earning commission before you understand what you are investing in.</p>
          <div className="profiling-steps" role="list" aria-label="VeerNXT pathway steps">
            <div className="pstep active" role="listitem">
              <div className="pstep-num">1</div>
              <div className="pstep-label">Profile</div>
              <div className="pstep-sub">7-question financial &amp; life profiling</div>
              <div className="pstep-arrow" aria-hidden="true"></div>
            </div>
            <div className="pstep" role="listitem">
              <div className="pstep-num">2</div>
              <div className="pstep-label">Match</div>
              <div className="pstep-sub">Mapped to 1 of 8 Agniveer/ESM profiles</div>
              <div className="pstep-arrow" aria-hidden="true"></div>
            </div>
            <div className="pstep" role="listitem">
              <div className="pstep-num">3</div>
              <div className="pstep-label">Prepare</div>
              <div className="pstep-sub">Exam prep + career guidance</div>
              <div className="pstep-arrow" aria-hidden="true"></div>
            </div>
            <div className="pstep" role="listitem">
              <div className="pstep-num">4</div>
              <div className="pstep-label">Invest</div>
              <div className="pstep-sub">Rupee-level plan via Prudent</div>
              <div className="pstep-arrow" aria-hidden="true"></div>
            </div>
            <div className="pstep" role="listitem">
              <div className="pstep-num">5</div>
              <div className="pstep-label">Prosper</div>
              <div className="pstep-sub">Reviewed every 6 months as life changes</div>
            </div>
          </div>
          <div style={{ marginTop: '32px', textAlign: 'center' }}>
            <button onClick={onStartQuiz} className="btn btn-green">
              Start My Mission Profile <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </section>

      {/* ── SIX PILLARS ─────────────────────────────────────────── */}
      <section className="section section-alt" id="pillars" aria-labelledby="pillars-headline">
        <div className="container">
          <div className="section-eyebrow">What We Offer</div>
          <h2 className="section-headline" id="pillars-headline">Six Pillars. One Mission.</h2>
          <p className="section-sub">Our complete suite of services, smart tools and insights to help you make better financial decisions on the go.</p>
          <div className="pillars-grid">
            <div className="pillar-card pop-out-card">
              <div className="pillar-icon" aria-hidden="true">🗺️</div>
              <h3><span>Opportunity</span> Mapping</h3>
              <p>Profiled against your training, trade, Arm/Service background, domicile and goals. The right pathways — not thousands of disconnected options.</p>
              <div className="pillar-tag"><span className="badge badge-green">EdTech</span></div>
            </div>
            <div className="pillar-card pop-out-card">
              <div className="pillar-icon" aria-hidden="true">📋</div>
              <h3><span>Exam</span> Intelligence</h3>
              <p>Central and State Govt opportunities, eligibility, reservations, notifications and personalised alerts — matched to who you are.</p>
              <div className="pillar-tag"><span className="badge badge-green">EdTech</span></div>
            </div>
            <div className="pillar-card pop-out-card">
              <div className="pillar-icon" aria-hidden="true">📚</div>
              <h3><span>Exam</span> Preparation</h3>
              <p>Guidebook, précis, 10-year PYQ, 10 mock tests — for every relevant exam. Hindi-first content. Structured for how a soldier learns.</p>
              <div className="pillar-tag"><span className="badge badge-green">EdTech</span></div>
            </div>
            <div className="pillar-card pop-out-card">
              <div className="pillar-icon" aria-hidden="true">💼</div>
              <h3><span>Career</span> Transition</h3>
              <p>Military experience translated into civilian employability. Skill mapping, CV building, interview prep, employer linkage.</p>
              <div className="pillar-tag"><span className="badge badge-green">EdTech</span></div>
            </div>
            <div className="pillar-card pop-out-card">
              <div className="pillar-icon" aria-hidden="true">📈</div>
              <h3><span>Financial</span> Empowerment</h3>
              <p>Intelligent risk profiling → rupee-level investment plan → execution via Prudent. MF, NPS, insurance, post office. Zero cost to you.</p>
              <div className="pillar-tag"><span className="badge badge-gold">FinTech</span></div>
            </div>
            <div className="pillar-card pop-out-card">
              <div className="pillar-icon" aria-hidden="true">🤝</div>
              <h3><span>Community</span> &amp; Mentorship</h3>
              <p>A network of Agniveers navigating the same road. Mentors who have walked ahead. What is Community &amp; What is it doing?</p>
              <div className="pillar-tag"><span className="badge badge-green">Both</span></div>
            </div>
          </div>
        </div>
      </section>

      {/* ── TOOLS / CALCULATORS & GOAL PLANNING ────────────────── */}
      <section className="section" id="tools" aria-labelledby="tools-headline">
        <div className="container">
          <div className="section-eyebrow">Free Tools</div>
          <h2 className="section-headline" id="tools-headline">See your money's future. Before you invest a rupee.</h2>
          <p className="section-sub">Interactive calculators built with the real corpus in mind. No login needed.</p>

          {/* Goal Planning Pop-Out Box */}
          <div style={{ background: 'linear-gradient(135deg, var(--g-dk) 0%, #162B1C 100%)', color: '#fff', padding: '28px 36px', borderRadius: '16px', marginBottom: '32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '20px', border: '1px solid var(--gold)' }}>
            <div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--gold)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>VEERNXT GOAL PLANNING</div>
              <h3 style={{ fontSize: '24px', margin: '4px 0 6px', color: '#fff' }}>Let's start creating goals</h3>
              <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.8)', margin: 0 }}>Define your home, education, and family security milestones with tailored tools.</p>
            </div>
            <a href="#quiz-section" className="btn btn-gold" style={{ padding: '12px 24px', fontSize: '14px' }}>
              Click here to see all our Goal Planning Tools →
            </a>
          </div>

          <div className="calc-wrapper">
            <div>
              <div className="calc-tabs" role="tablist" aria-label="Calculator type">
                <button
                  className={`calc-tab ${calcTab === 'sip' ? 'active' : ''}`}
                  role="tab"
                  aria-selected={calcTab === 'sip'}
                  onClick={() => setCalcTab('sip')}
                >
                  SIP Calculator
                </button>
                <button
                  className={`calc-tab ${calcTab === 'corpus' ? 'active' : ''}`}
                  role="tab"
                  aria-selected={calcTab === 'corpus'}
                  onClick={() => setCalcTab('corpus')}
                >
                  Corpus Planner
                </button>
                <button
                  className={`calc-tab ${calcTab === 'seva' ? 'active' : ''}`}
                  role="tab"
                  aria-selected={calcTab === 'seva'}
                  onClick={() => setCalcTab('seva')}
                >
                  Seva Nidhi &amp; Gratuity
                </button>
              </div>

              {/* SIP Calculator */}
              {calcTab === 'sip' && (
                <div className="calc-box">
                  <div className="calc-field">
                    <label>Monthly SIP amount <span>₹{sipAmt.toLocaleString('en-IN')}</span></label>
                    <input
                      type="range" min="500" max="10000" step="500"
                      value={sipAmt} onChange={e => setSipAmt(Number(e.target.value))}
                      aria-label="Monthly SIP amount"
                    />
                  </div>
                  <div className="calc-field">
                    <label>Expected return (p.a.) <span>12%</span></label>
                    <input type="range" min="8" max="18" step="1" value="12" disabled aria-label="Expected return" />
                  </div>
                  <div className="calc-field">
                    <label>Time period <span>{sipYr} years</span></label>
                    <input
                      type="range" min="3" max="25" step="1"
                      value={sipYr} onChange={e => setSipYr(Number(e.target.value))}
                      aria-label="Time period in years"
                    />
                  </div>
                  <div className="calc-result">
                    <div className="cr-item">
                      <div className="cr-label">Total Invested</div>
                      <div className="cr-val">₹{sipInvested.toLocaleString('en-IN')}</div>
                    </div>
                    <div className="cr-item">
                      <div className="cr-label">Estimated Gains</div>
                      <div className="cr-val gold">₹{sipGain.toLocaleString('en-IN')}</div>
                    </div>
                    <div className="cr-item">
                      <div className="cr-label">Total Value</div>
                      <div className="cr-val">₹{sipFV.toLocaleString('en-IN')}</div>
                    </div>
                  </div>
                  <p style={{ fontSize: '11px', color: 'var(--mid)', marginTop: '12px', lineHeight: '1.6' }}>
                    Projections are indicative. Actual returns depend on market conditions. AMFI Registered Distributor (ARN – 362619).
                  </p>
                </div>
              )}

              {/* Corpus Planner */}
              {calcTab === 'corpus' && (
                <div className="calc-box">
                  <div className="calc-field">
                    <label>Corpus amount <span>₹{corpAmt.toLocaleString('en-IN')}</span></label>
                    <input
                      type="range" min="300000" max="5000000" step="100000"
                      value={corpAmt} onChange={e => setCorpAmt(Number(e.target.value))}
                      aria-label="Corpus amount"
                    />
                  </div>
                  <div className="calc-field">
                    <label>Conservative return (p.a.) <span>7.5%</span></label>
                    <input type="range" min="5" max="12" step="0.5" value="7.5" disabled aria-label="Expected return" />
                  </div>
                  <div className="calc-field">
                    <label>Time period <span>{corpYr} years</span></label>
                    <input
                      type="range" min="1" max="15" step="1"
                      value={corpYr} onChange={e => setCorpYr(Number(e.target.value))}
                      aria-label="Time period"
                    />
                  </div>
                  <div className="calc-result">
                    <div className="cr-item">
                      <div className="cr-label">Principal</div>
                      <div className="cr-val">₹{corpAmt.toLocaleString('en-IN')}</div>
                    </div>
                    <div className="cr-item">
                      <div className="cr-label">Interest Earned</div>
                      <div className="cr-val gold">₹{corpGain.toLocaleString('en-IN')}</div>
                    </div>
                    <div className="cr-item">
                      <div className="cr-label">Total Value</div>
                      <div className="cr-val">₹{corpFV.toLocaleString('en-IN')}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Seva Nidhi Breakdown */}
              {calcTab === 'seva' && (
                <div className="calc-box">
                  <p style={{ fontSize: '14px', color: 'var(--mid)', lineHeight: '1.7', marginBottom: '16px' }}>
                    Your Seva Nidhi &amp; Gratuity corpus is approximately <strong>₹10L – ₹1Cr</strong> depending on service duration. 100% tax-free.
                  </p>
                  <div className="calc-result">
                    <div className="cr-item">
                      <div className="cr-label">1 Year (Liquid/FD)</div>
                      <div className="cr-val">₹10.7L</div>
                    </div>
                    <div className="cr-item">
                      <div className="cr-label">3 Years (Balanced)</div>
                      <div className="cr-val gold">₹13.4L</div>
                    </div>
                    <div className="cr-item">
                      <div className="cr-label">5 Years (Growth)</div>
                      <div className="cr-val">₹16.8L</div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '20px', color: 'var(--ink)', marginBottom: '8px' }}>More Planning Tools</h3>
              <p style={{ fontSize: '13px', color: 'var(--mid)', marginBottom: '20px' }}>All free. No login needed. Built for the soldier's real numbers.</p>
              <div className="calc-tools-grid">
                <div className="tool-chip">
                  <div className="tool-chip-icon" aria-hidden="true">💰</div>
                  <div>
                    <div className="tool-chip-label">Seva Nidhi Splitter</div>
                    <div className="tool-chip-sub">Spend / Save / Invest ratios</div>
                  </div>
                </div>
                <div className="tool-chip">
                  <div className="tool-chip-icon" aria-hidden="true">🏡</div>
                  <div>
                    <div className="tool-chip-label">Home / Plot Goal</div>
                    <div className="tool-chip-sub">Timeline &amp; SIP needed</div>
                  </div>
                </div>
                <div className="tool-chip">
                  <div className="tool-chip-icon" aria-hidden="true">🎓</div>
                  <div>
                    <div className="tool-chip-label">Higher Ed Planner</div>
                    <div className="tool-chip-sub">Course fee + stipend math</div>
                  </div>
                </div>
                <div className="tool-chip">
                  <div className="tool-chip-icon" aria-hidden="true">🛡️</div>
                  <div>
                    <div className="tool-chip-label">Term Insurance Check</div>
                    <div className="tool-chip-sub">How much cover do you need?</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── EMBEDDED GUIDANCE QUIZ & RESULTS ─────────────────────── */}
      <section className="section section-alt" id="quiz-section" aria-labelledby="quiz-headline">
        <div className="container">
          <div className="section-eyebrow" style={{ color: 'var(--g)' }}>Interactive Financial Guidance</div>
          <h2 className="section-headline" id="quiz-headline">
            {phase === PHASE.RESULT && "Your Personalised Allocation Plan"}
            {phase === PHASE.SUBMITTED && "Profile Submitted Successfully"}
            {(phase !== PHASE.RESULT && phase !== PHASE.SUBMITTED) && "Discover Your Personalised Investment Plan"}
          </h2>
          <p className="section-sub">
            {phase === PHASE.RESULT && "Unbiased, military-tailored investment breakdown based on your responses."}
            {phase === PHASE.SUBMITTED && "A VeerNXT financial consultant will reach out within 24 hours to create your detailed plan."}
            {(phase !== PHASE.RESULT && phase !== PHASE.SUBMITTED) && "Answer 7 simple questions to unlock your custom asset allocation. Free permanently for Agniveers & ESMs."}
          </p>

          <div style={{ marginTop: '32px' }}>
            <EmbeddedQuizSection
              phase={phase}
              setPhase={setPhase}
              step={step}
              nextStep={nextStep}
              prevStep={prevStep}
              selectOption={selectOption}
              selectAmount={selectAmount}
              answers={answers}
              corpusAmount={corpusAmount}
              finishQuiz={finishQuiz}
              restartQuiz={restartQuiz}
              profile={profile}
              allocation={allocation}
              userName={userName}
              setUserName={setUserName}
              userPhone={userPhone}
              setUserPhone={setUserPhone}
              userEmail={userEmail}
              setUserEmail={setUserEmail}
              saving={saving}
              handleSubmitProfile={handleSubmitProfile}
              profileKey={profileKey}
              currentQuestion={currentQuestion}
              QUESTIONS={QUESTIONS}
              AMOUNT_OPTIONS={AMOUNT_OPTIONS}
              PROFILES={PROFILES}
              formatINR={formatINR}
            />
          </div>
        </div>
      </section>

      {/* ── COMMUNITY & STATS ────────────────────────────────────── */}
      <section className="section section-dark" id="community" aria-labelledby="community-headline">
        <div className="container">
          <div className="section-eyebrow" style={{ color: 'var(--gold)' }}>Community</div>
          <h2 className="section-headline section-headline-white" id="community-headline">You are not walking this road alone.</h2>
          <p className="section-sub section-sub-white">Thousands of Agniveers and ESMs across India are making the same transition.</p>

          <div className="community-strip">
            <div>
              <div className="cs-num">50K+</div>
              <div className="cs-label">Soldier Community Insight</div>
            </div>
            <div>
              <div className="cs-num">100%</div>
              <div className="cs-label">0 ₹ Charged to Soldiers</div>
            </div>
            <div>
              <div className="cs-num">24/7</div>
              <div className="cs-label">Operational Support (COB #227)</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── SEWA LABH / REWARD — THREE STEP MODEL ────────────────── */}
      <section className="section seva-section" id="seva-dividend" aria-labelledby="seva-headline">
        <div className="container">
          <div className="section-eyebrow" style={{ color: 'var(--gold)' }}>Our Core Ethos</div>
          <h2 className="section-headline section-headline-white" id="seva-headline">Sewa Labh / Reward</h2>
          <div className="seva-sub-head" style={{ color: 'rgba(255,255,255,0.9)', fontStyle: 'italic', marginBottom: '28px' }}>
            "Standing orders from Day One were granted. VeerNXT was built on one standing order — this platform would never profit from soldiers."
          </div>

          <div className="seva-intro-grid">
            <div className="seva-intro-text">
              <p>Everything you invest goes back to you — because it was always yours. We simply make sure it finds its way back.</p>
              <p style={{ marginTop: '14px' }}>
                We do not call this generosity. We call it <strong>Sewa Labh / Reward</strong> because the soldier community was always owed everything in return.
              </p>
            </div>
            <div className="seva-pull-quote-wrap">
              <blockquote className="seva-pull-quote">
                <span className="seva-quote-hindi" lang="hi">सेवालाभ</span>
                <p style={{ fontStyle: 'italic', color: 'rgba(255,255,255,.9)', margin: 0, fontSize: '14px' }}>
                  "The return that flows back to those who served."
                </p>
              </blockquote>
            </div>
          </div>

          {/* Three-Step Model */}
          <div className="seva-steps" style={{ marginTop: '40px' }}>
            <div className="seva-step">
              <div className="seva-step-top">
                <div className="seva-step-num">Step 1</div>
                <div className="seva-step-icon" aria-hidden="true">🎯</div>
                <div className="seva-step-title">You use VeerNXT</div>
                <div className="seva-step-body">
                  Free platform access. Prepare for exams, map opportunities, and invest your corpus.
                </div>
              </div>
              <span className="seva-step-tag" style={{ background: 'rgba(255,255,255,0.15)', color: '#fff' }}>Badge: Zero Cost to You</span>
            </div>
            <div className="seva-step-arrow" aria-hidden="true">→</div>
            <div className="seva-step">
              <div className="seva-step-top">
                <div className="seva-step-num">Step 2</div>
                <div className="seva-step-icon" aria-hidden="true">🏦</div>
                <div className="seva-step-title">You Earn Your Bonuses</div>
                <div className="seva-step-body">
                  Your investment comes back to you with maximum transparency and zero platform markup.
                </div>
              </div>
              <span className="seva-step-tag" style={{ background: 'var(--gold)', color: '#000' }}>Badge: Only One</span>
            </div>
            <div className="seva-step-arrow" aria-hidden="true">→</div>
            <div className="seva-step featured">
              <div className="seva-step-top">
                <div className="seva-step-num">Step 3</div>
                <div className="seva-step-icon" aria-hidden="true">🌱</div>
                <div className="seva-step-title">Sewa Labh / Reward</div>
                <div className="seva-step-body">
                  The platform funds scholarships, emergency grants and transition support for the community.
                </div>
              </div>
              <span className="seva-step-tag featured-tag">Badge: Shared with Community</span>
            </div>
          </div>

          {/* Sewa Labh / Reward Core Principles */}
          <div className="seva-commitments" style={{ marginTop: '48px' }}>
            <span className="section-eyebrow" style={{ marginBottom: 0 }}>Sewa Labh / Reward</span>
            <div style={{ marginTop: '16px' }}>
              <div className="seva-commit-item">
                <div className="seva-commit-num">1</div>
                <div className="seva-commit-body">
                  <strong>Standing orders from Day One were granted.</strong>
                </div>
              </div>
              <div className="seva-commit-item">
                <div className="seva-commit-num">2</div>
                <div className="seva-commit-body">
                  <strong>VeerNXT was built on one standing order</strong> — this platform would never profit from soldiers.
                </div>
              </div>
              <div className="seva-commit-item">
                <div className="seva-commit-num">3</div>
                <div className="seva-commit-body">
                  <strong>Everything you invest goes back to you</strong> — because it was always yours. We simply make sure it finds its way back.
                </div>
              </div>
              <div className="seva-commit-item">
                <div className="seva-commit-num">4</div>
                <div className="seva-commit-body">
                  <strong>We do not call this generosity. We call it Sewa Labh / Reward.</strong>
                </div>
              </div>
              <div className="seva-commit-item">
                <div className="seva-commit-num">5</div>
                <div className="seva-commit-body">
                  <strong>Because the soldier community was always owed everything in return.</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── PARTNERS & COB BRIEFING ──────────────────────────────── */}
      <section className="section section-alt" id="partners" aria-labelledby="partners-headline">
        <div className="container" style={{ textAlign: 'center' }}>
          <div className="section-eyebrow" style={{ justifyContent: 'center' }}>Company Operating Base (COB) #227</div>
          <h2 className="section-headline" id="partners-headline" style={{ margin: '0 auto 8px' }}>Operational 24×7</h2>
          <p className="section-sub" style={{ margin: '0 auto 24px' }}>
            Let's Start the Mission and Request Your Briefing. AMFI ARN – 362619 registered distributor.
          </p>

          <div style={{ display: 'flex', gap: '14px', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '32px' }}>
            <button onClick={onStartQuiz} className="btn btn-green">
              Let's Start the Mission and Request Your Briefing <ArrowRight size={16} />
            </button>
          </div>

          <div className="partners-grid-rows" style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center' }}>
            <div className="partners-row" style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <div className="partner-chip">🏦 Prudent Corporate Advisory — BSE &amp; NSE Listed</div>
              <div className="partner-chip">📜 SEBI Regulated Execution</div>
              <div className="partner-chip">🔒 256-Bit Bank-Grade Encryption</div>
            </div>
            <div className="partners-row" style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <div className="partner-chip">🏛️ Company Operating Base #227</div>
              <div className="partner-chip">⏱️ Operational 24×7</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── DISCLAIMER ────────────────────────────────────────────── */}
      <section id="disclaimer" aria-label="Regulatory Disclaimer">
        <div className="container" style={{ padding: '40px 20px' }}>
          <div className="disclaimer-box">
            <p><strong>REGULATORY &amp; LEGAL DISCLAIMER:</strong> VeerNXT is a technology and educational guidance platform operated for the benefit of Agniveers and ex-servicemen. VeerNXT is registered with the Association of Mutual Funds in India (AMFI) as a Mutual Fund Distributor (AMFI ARN – 362619). Investment execution services are provided through <strong>Prudent Corporate Advisory Services Ltd</strong>, a SEBI-registered entity listed on BSE and NSE. Mutual Fund investments are subject to market risks, read all scheme-related documents carefully before investing. Company Operating Base (COB) #227 • Operational 24×7.</p>
          </div>
        </div>
      </section>
    </div>
  );
};

// ─── FINANCIAL GUIDANCE STYLES (QUIZ & RESULT) ──────────────────
const FinancialGuidanceStyles = () => (
  <style dangerouslySetInnerHTML={{ __html: `
    /* ══════════════════════════════════════════════════════════
       FINANCIAL GUIDANCE — SCOPED STYLES
       ══════════════════════════════════════════════════════════ */

    .fg-wrapper {
      min-height: 100vh;
      background: var(--ios-bg);
      padding-bottom: 4rem;
    }

    /* ─── HERO ─────────────────────────────────────────────── */
    .fg-hero {
      background: linear-gradient(145deg, #0c1523 0%, #162032 40%, #1a2a3e 100%);
      padding: 5rem 2rem 4rem;
      color: white;
      text-align: center;
      position: relative;
      overflow: hidden;
    }

    .fg-hero::before {
      content: '';
      position: absolute;
      top: -50%; left: -50%; right: -50%; bottom: -50%;
      background:
        radial-gradient(circle at 30% 20%, rgba(75, 107, 50, 0.35) 0%, transparent 50%),
        radial-gradient(circle at 70% 80%, rgba(251, 191, 36, 0.15) 0%, transparent 40%);
      animation: heroGlow 8s ease-in-out infinite alternate;
    }

    @keyframes heroGlow {
      from { transform: scale(1) rotate(0deg); }
      to { transform: scale(1.1) rotate(3deg); }
    }

    .fg-hero-content {
      max-width: 720px;
      margin: 0 auto;
      position: relative;
      z-index: 2;
    }

    .fg-hero-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.15);
      padding: 0.5rem 1.25rem;
      border-radius: 100px;
      font-size: 0.8rem;
      font-weight: 700;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      color: #fbbf24;
      margin-bottom: 2rem;
    }

    .fg-hero h1 {
      font-size: 3.25rem;
      font-weight: 800;
      letter-spacing: -0.04em;
      line-height: 1.1;
      margin-bottom: 1.25rem;
      color: white;
      background: linear-gradient(135deg, #ffffff 0%, #e2e8f0 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .fg-hero-sub {
      font-size: 1.15rem;
      color: #94a3b8;
      line-height: 1.7;
      max-width: 540px;
      margin: 0 auto 2.5rem;
    }

    .fg-hero-stats {
      display: flex;
      gap: 3rem;
      justify-content: center;
      margin-bottom: 3rem;
    }

    .fg-stat {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.4rem;
    }

    .fg-stat-num {
      font-size: 2.25rem;
      font-weight: 800;
      color: white;
      line-height: 1;
      font-family: 'Quicksand', sans-serif;
    }

    .fg-stat-label {
      font-size: 0.78rem;
      color: #64748b;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.06em;
    }

    .fg-cta-btn {
      display: inline-flex;
      align-items: center;
      gap: 0.6rem;
      background: linear-gradient(135deg, var(--ios-olive) 0%, #3d5a28 100%);
      color: white;
      padding: 1rem 2.25rem;
      border-radius: 100px;
      font-size: 1.05rem;
      font-weight: 700;
      font-family: 'Quicksand', sans-serif;
      border: none;
      cursor: pointer;
      transition: all 0.25s;
      box-shadow: 0 8px 24px rgba(75, 107, 50, 0.3);
    }

    .fg-cta-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 12px 32px rgba(75, 107, 50, 0.4);
    }

    .fg-cta-outline {
      background: transparent;
      border: 2px solid var(--ios-olive);
      color: var(--ios-olive);
      box-shadow: none;
    }

    .fg-cta-outline:hover {
      background: var(--ios-olive);
      color: white;
    }

    /* ─── CONTAINER ────────────────────────────────────────── */
    .fg-container {
      max-width: 860px;
      margin: 0 auto;
      padding: 0 1.5rem;
      position: relative;
      z-index: 10;
      margin-top: -1.5rem;
    }

    /* ─── TRUST BANNER ─────────────────────────────────────── */
    .fg-trust-banner {
      background: white;
      border-radius: 16px;
      padding: 1.25rem 1.75rem;
      display: flex;
      align-items: center;
      gap: 1.25rem;
      box-shadow: 0 4px 20px rgba(0,0,0,0.04);
      margin-bottom: 2.5rem;
      border: 1px solid #f1f5f9;
    }

    .fg-trust-text {
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
    }

    .fg-trust-text strong {
      color: #0f172a;
      font-size: 1rem;
    }

    .fg-trust-text span {
      color: #64748b;
      font-size: 0.9rem;
      line-height: 1.5;
    }

    /* ─── SECTIONS ─────────────────────────────────────────── */
    .fg-section {
      margin-bottom: 2.5rem;
    }

    .fg-section-title {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      font-size: 1.2rem;
      font-weight: 700;
      margin-bottom: 1.25rem;
      color: var(--ios-text);
    }

    .fg-section-subtitle {
      font-size: 0.8rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #64748b;
      margin-bottom: 1rem;
    }

    /* ─── GOLDEN RULES GRID ────────────────────────────────── */
    .fg-rules-grid {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .fg-rule-card {
      display: flex;
      align-items: flex-start;
      gap: 1rem;
      background: white;
      padding: 1.25rem 1.5rem;
      border-radius: 14px;
      border: 1px solid #FEE2E2;
      transition: transform 0.15s;
    }

    .fg-rule-card:hover {
      transform: translateX(4px);
    }

    .fg-rule-icon {
      width: 36px;
      height: 36px;
      border-radius: 10px;
      background: #FEF2F2;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      margin-top: 2px;
    }

    .fg-rule-title {
      font-size: 0.95rem;
      font-weight: 700;
      color: #991B1B;
      margin-bottom: 0.2rem;
    }

    .fg-rule-desc {
      font-size: 0.85rem;
      color: #64748b;
      line-height: 1.5;
    }

    /* ─── 5 LAWS ───────────────────────────────────────────── */
    .fg-laws-list {
      background: white;
      border-radius: 16px;
      border: 1px solid #f1f5f9;
      overflow: hidden;
    }

    .fg-law-item {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 1rem 1.5rem;
      border-bottom: 1px solid #f8fafc;
      font-size: 0.93rem;
      color: var(--ios-text);
      font-weight: 500;
      transition: background 0.15s;
    }

    .fg-law-item:last-child {
      border-bottom: none;
    }

    .fg-law-item:hover {
      background: #f8fafc;
    }

    .fg-law-num {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background: var(--ios-olive);
      color: white;
      font-size: 0.75rem;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    /* ─── BOTTOM CTA ───────────────────────────────────────── */
    .fg-bottom-cta {
      text-align: center;
      padding: 3rem 2rem;
      background: white;
      border-radius: 20px;
      border: 1px solid #f1f5f9;
      box-shadow: 0 4px 20px rgba(0,0,0,0.03);
    }

    .fg-bottom-cta h3 {
      font-size: 1.5rem;
      font-weight: 800;
      margin-bottom: 0.5rem;
    }

    .fg-bottom-cta p {
      color: #64748b;
      margin-bottom: 1.75rem;
      font-size: 1rem;
    }

    /* ═══════════════════════════════════════════════════════════
       QUIZ PHASE
       ═══════════════════════════════════════════════════════════ */
    .fg-quiz-container {
      max-width: 680px;
      margin: 0 auto;
      padding: 2rem 1.5rem;
    }

    .fg-progress-header {
      display: flex;
      align-items: center;
      gap: 1rem;
      margin-bottom: 1.5rem;
    }

    .fg-progress-bar {
      display: flex;
      gap: 5px;
      flex: 1;
    }

    .fg-progress-step {
      height: 4px;
      flex: 1;
      border-radius: 2px;
      background: #e2e8f0;
      transition: background 0.4s;
    }

    .fg-progress-step.done {
      background: #1D9E75;
    }

    .fg-progress-step.active {
      background: linear-gradient(90deg, #1D9E75, #EF9F27);
    }

    .fg-progress-label {
      font-size: 0.78rem;
      font-weight: 700;
      color: #94a3b8;
      white-space: nowrap;
    }

    .fg-question-card {
      background: white;
      border-radius: 20px;
      padding: 2.5rem 2rem;
      box-shadow: 0 4px 24px rgba(0,0,0,0.04);
      border: 1px solid #f1f5f9;
    }

    .fg-q-label {
      font-size: 0.72rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--ios-olive);
      margin-bottom: 0.75rem;
    }

    .fg-q-text {
      font-size: 1.35rem;
      font-weight: 700;
      line-height: 1.4;
      color: var(--ios-text);
      margin-bottom: 0.5rem;
    }

    .fg-q-sub {
      font-size: 0.88rem;
      color: #64748b;
      line-height: 1.5;
      margin-bottom: 2rem;
    }

    /* ─── OPTIONS ───────────────────────────────────────────── */
    .fg-options {
      display: flex;
      flex-direction: column;
      gap: 0.65rem;
    }

    .fg-option {
      display: flex;
      align-items: center;
      gap: 0.9rem;
      padding: 1rem 1.25rem;
      border: 1.5px solid #e2e8f0;
      border-radius: 14px;
      cursor: pointer;
      transition: all 0.2s;
      background: white;
    }

    .fg-option:hover {
      border-color: #1D9E75;
      background: #f8fdf9;
    }

    .fg-option.selected {
      border-color: #1D9E75;
      background: #E1F5EE;
      box-shadow: 0 0 0 1px #1D9E75;
    }

    .fg-opt-key {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: #f1f5f9;
      border: 1.5px solid #e2e8f0;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.8rem;
      font-weight: 700;
      color: #64748b;
      flex-shrink: 0;
      transition: all 0.2s;
    }

    .fg-opt-key.selected {
      background: #1D9E75;
      border-color: #1D9E75;
      color: white;
    }

    .fg-opt-body {
      flex: 1;
    }

    .fg-opt-title {
      font-size: 0.95rem;
      font-weight: 600;
      color: var(--ios-text);
    }

    .fg-opt-sub {
      font-size: 0.8rem;
      color: #94a3b8;
      margin-top: 0.15rem;
      line-height: 1.4;
    }

    /* ─── AMOUNT GRID ──────────────────────────────────────── */
    .fg-amount-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
      gap: 0.65rem;
    }

    .fg-amt-card {
      border: 1.5px solid #e2e8f0;
      border-radius: 14px;
      padding: 1.15rem 1rem;
      text-align: center;
      cursor: pointer;
      transition: all 0.2s;
      background: white;
    }

    .fg-amt-card:hover {
      border-color: #1D9E75;
      background: #f8fdf9;
    }

    .fg-amt-card.selected {
      border-color: #1D9E75;
      background: #E1F5EE;
      box-shadow: 0 0 0 1px #1D9E75;
    }

    .fg-amt-main {
      font-size: 1.1rem;
      font-weight: 700;
      color: var(--ios-text);
    }

    .fg-amt-card.selected .fg-amt-main {
      color: #085041;
    }

    .fg-amt-sub {
      font-size: 0.72rem;
      color: #94a3b8;
      margin-top: 0.25rem;
    }

    /* ─── NAVIGATION ───────────────────────────────────────── */
    .fg-nav-row {
      display: flex;
      gap: 0.75rem;
      margin-top: 2rem;
      align-items: center;
    }

    .fg-nav-btn {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.85rem 1.75rem;
      border-radius: 100px;
      font-size: 0.92rem;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.2s;
      border: 1.5px solid #e2e8f0;
      background: white;
      color: var(--ios-text);
      font-family: 'Quicksand', sans-serif;
    }

    .fg-nav-back:hover {
      background: #f8fafc;
    }

    .fg-nav-primary {
      background: var(--ios-olive);
      border-color: var(--ios-olive);
      color: white;
      box-shadow: 0 4px 12px rgba(75, 107, 50, 0.2);
    }

    .fg-nav-primary:hover:not(.disabled) {
      transform: translateY(-1px);
      box-shadow: 0 6px 16px rgba(75, 107, 50, 0.3);
    }

    .fg-nav-primary.disabled {
      opacity: 0.35;
      cursor: not-allowed;
      transform: none;
      box-shadow: none;
    }

    /* ═══════════════════════════════════════════════════════════
       RESULT PHASE
       ═══════════════════════════════════════════════════════════ */
    .fg-result-container {
      max-width: 780px;
      margin: 0 auto;
      padding: 2rem 1.5rem;
    }

    .fg-profile-header {
      border-radius: 20px;
      padding: 2.5rem;
      border: 1.5px solid;
      margin-bottom: 2rem;
      text-align: center;
    }

    .fg-profile-emoji {
      font-size: 3rem;
      margin-bottom: 1rem;
    }

    .fg-profile-badge {
      font-size: 0.75rem;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      margin-bottom: 0.5rem;
    }

    .fg-profile-name {
      font-size: 2rem;
      font-weight: 800;
      letter-spacing: -0.03em;
      margin-bottom: 0.75rem;
    }

    .fg-profile-desc {
      font-size: 0.95rem;
      color: #334155;
      line-height: 1.7;
      max-width: 580px;
      margin: 0 auto 1.25rem;
    }

    .fg-profile-meta {
      display: flex;
      gap: 0.6rem;
      justify-content: center;
      flex-wrap: wrap;
    }

    .fg-meta-pill {
      padding: 0.4rem 1rem;
      border-radius: 100px;
      font-size: 0.8rem;
      font-weight: 600;
    }

    /* ─── URGENCY PILLS ────────────────────────────────────── */
    .fg-urgency-strip {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
    }

    .fg-urgency-pill {
      font-size: 0.78rem;
      font-weight: 600;
      padding: 0.4rem 0.85rem;
      border-radius: 100px;
      border: 1px solid;
    }

    .fg-urgency-pill.critical {
      background: #FEF2F2;
      border-color: #FECACA;
      color: #991B1B;
    }

    .fg-urgency-pill.high {
      background: #FEF3C7;
      border-color: #FDE68A;
      color: #92400E;
    }

    .fg-urgency-pill.medium {
      background: #E1F5EE;
      border-color: #A7F3D0;
      color: #065F46;
    }

    /* ─── SIP BOX ──────────────────────────────────────────── */
    .fg-sip-box {
      background: #f8fdf9;
      border-left: 4px solid #1D9E75;
      border-radius: 0 14px 14px 0;
      padding: 1.5rem 1.75rem;
      margin-bottom: 2rem;
    }

    .fg-sip-label {
      font-size: 0.78rem;
      font-weight: 600;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 0.4rem;
    }

    .fg-sip-val {
      font-size: 1.75rem;
      font-weight: 800;
      color: #085041;
      font-family: 'Quicksand', sans-serif;
    }

    .fg-sip-sub {
      font-size: 0.82rem;
      color: #64748b;
      margin-top: 0.4rem;
      line-height: 1.5;
    }

    /* ─── ALLOCATION GRID ──────────────────────────────────── */
    .fg-alloc-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
      gap: 0.75rem;
    }

    .fg-alloc-card {
      border: 1px solid #f1f5f9;
      border-radius: 14px;
      padding: 1.25rem;
      background: white;
      transition: transform 0.15s, box-shadow 0.15s;
    }

    .fg-alloc-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 20px rgba(0,0,0,0.04);
    }

    .fg-alloc-pct {
      font-size: 1.5rem;
      font-weight: 800;
      font-family: 'Quicksand', sans-serif;
      margin-bottom: 0.25rem;
    }

    .fg-alloc-product {
      font-size: 0.88rem;
      font-weight: 600;
      color: var(--ios-text);
      margin-bottom: 0.2rem;
    }

    .fg-alloc-amt {
      font-size: 0.82rem;
      font-weight: 700;
      color: #64748b;
      margin-bottom: 0.5rem;
    }

    .fg-alloc-why {
      font-size: 0.78rem;
      color: #94a3b8;
      line-height: 1.5;
    }

    /* ─── ALLOCATION BAR ───────────────────────────────────── */
    .fg-alloc-bar-container {
      margin-bottom: 2.5rem;
    }

    .fg-alloc-bar {
      display: flex;
      height: 12px;
      border-radius: 6px;
      overflow: hidden;
      margin-bottom: 1rem;
      box-shadow: inset 0 1px 3px rgba(0,0,0,0.08);
    }

    .fg-alloc-bar-segment {
      transition: width 0.5s ease;
    }

    .fg-alloc-bar-labels {
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem;
    }

    .fg-alloc-bar-label {
      display: flex;
      align-items: center;
      gap: 0.35rem;
      font-size: 0.72rem;
      color: #64748b;
    }

    .fg-bar-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      flex-shrink: 0;
    }

    /* ─── PILLARS ──────────────────────────────────────────── */
    .fg-pillars {
      border-radius: 16px;
      padding: 1.5rem 1.75rem;
      margin-bottom: 2.5rem;
      border: 1.5px solid;
    }

    .fg-pillars-title {
      font-size: 0.75rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      margin-bottom: 1rem;
      color: #334155;
    }

    .fg-pillar-row {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      margin-bottom: 0.6rem;
      font-size: 0.88rem;
      font-weight: 500;
      color: #334155;
    }

    .fg-pillar-row:last-child {
      margin-bottom: 0;
    }

    .fg-pillar-num {
      width: 24px;
      height: 24px;
      border-radius: 50%;
      color: white;
      font-size: 0.7rem;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    /* ─── CONSULTANT CTA ───────────────────────────────────── */
    .fg-consultant-cta {
      background: linear-gradient(145deg, #0c1523, #1a2a3e);
      border-radius: 20px;
      padding: 3rem 2.5rem;
      text-align: center;
      color: white;
      margin-bottom: 2rem;
    }

    .fg-consultant-icon {
      width: 64px;
      height: 64px;
      border-radius: 50%;
      background: linear-gradient(135deg, #25D366, #128C7E);
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 1.25rem;
    }

    .fg-consultant-cta h3 {
      font-size: 1.5rem;
      font-weight: 800;
      color: white;
      margin-bottom: 0.75rem;
    }

    .fg-consultant-cta > p {
      color: #94a3b8;
      font-size: 0.95rem;
      line-height: 1.6;
      margin-bottom: 2rem;
      max-width: 480px;
      margin-left: auto;
      margin-right: auto;
    }

    .fg-consultant-user-info {
      display: flex;
      gap: 1.5rem;
      justify-content: center;
      flex-wrap: wrap;
      margin-bottom: 2rem;
    }

    .fg-user-detail {
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
      text-align: left;
      background: rgba(255,255,255,0.06);
      padding: 0.75rem 1.25rem;
      border-radius: 12px;
      border: 1px solid rgba(255,255,255,0.08);
    }

    .fg-user-label {
      font-size: 0.68rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #64748b;
    }

    .fg-user-value {
      font-size: 0.95rem;
      font-weight: 600;
      color: white;
    }

    .fg-wa-btn {
      display: inline-flex;
      align-items: center;
      gap: 0.65rem;
      background: linear-gradient(135deg, #25D366, #128C7E);
      color: white;
      padding: 1rem 2.5rem;
      border-radius: 100px;
      font-size: 1.05rem;
      font-weight: 700;
      font-family: 'Quicksand', sans-serif;
      border: none;
      cursor: pointer;
      transition: all 0.25s;
      box-shadow: 0 8px 24px rgba(37, 211, 102, 0.25);
    }

    .fg-wa-btn:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 12px 32px rgba(37, 211, 102, 0.35);
    }

    .fg-wa-btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .fg-wa-note {
      font-size: 0.78rem;
      color: #64748b;
      margin-top: 1rem;
      line-height: 1.5;
    }

    /* ─── ACTION ROW ───────────────────────────────────────── */
    .fg-action-row {
      display: flex;
      gap: 0.75rem;
      justify-content: center;
    }

    .fg-action-btn {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.75rem 1.5rem;
      border-radius: 100px;
      font-size: 0.88rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      border: 1.5px solid #e2e8f0;
      background: white;
      color: var(--ios-text);
      font-family: 'Quicksand', sans-serif;
    }

    .fg-action-btn:hover {
      background: #f8fafc;
      border-color: #cbd5e1;
    }

    .fg-action-restart {
      color: var(--ios-olive);
      border-color: var(--ios-olive);
    }

    .fg-action-restart:hover {
      background: var(--ios-olive);
      color: white;
    }

    /* ═══════════════════════════════════════════════════════════
       SUBMITTED PHASE
       ═══════════════════════════════════════════════════════════ */
    .fg-submitted-container {
      max-width: 560px;
      margin: 0 auto;
      padding: 4rem 1.5rem;
      text-align: center;
    }

    .fg-success-icon {
      margin-bottom: 1.5rem;
      animation: scaleIn 0.5s cubic-bezier(0.22, 1, 0.36, 1);
    }

    @keyframes scaleIn {
      from { transform: scale(0.5); opacity: 0; }
      to { transform: scale(1); opacity: 1; }
    }

    .fg-success-title {
      font-size: 2rem;
      font-weight: 800;
      letter-spacing: -0.03em;
      margin-bottom: 0.75rem;
    }

    .fg-success-sub {
      font-size: 1.05rem;
      color: #64748b;
      line-height: 1.7;
      margin-bottom: 2.5rem;
    }

    .fg-success-card {
      background: white;
      border-radius: 16px;
      padding: 1.5rem;
      border: 1px solid #f1f5f9;
      box-shadow: 0 4px 12px rgba(0,0,0,0.03);
      margin-bottom: 2.5rem;
      text-align: left;
    }

    .fg-success-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.75rem 0;
      border-bottom: 1px solid #f8fafc;
    }

    .fg-success-row:last-child {
      border-bottom: none;
    }

    .fg-success-label {
      font-size: 0.85rem;
      color: #94a3b8;
      font-weight: 500;
    }

    .fg-success-value {
      font-size: 0.95rem;
      font-weight: 700;
      color: var(--ios-text);
    }

    .fg-success-actions {
      display: flex;
      gap: 0.75rem;
      justify-content: center;
      flex-wrap: wrap;
    }

    /* ─── PRINT STYLES ─────────────────────────────────────── */
    @media print {
      .fg-consultant-cta, .fg-action-row, .fg-wa-btn, .fg-nav-row,
      .fg-hero, .fg-trust-banner, .fg-bottom-cta, header, footer { display: none !important; }
      .fg-wrapper { background: white !important; }
      .fg-result-container { padding: 1rem !important; }
    }

    /* ─── RESPONSIVE ───────────────────────────────────────── */
    @media (max-width: 768px) {
      .fg-hero { padding: 3.5rem 1.5rem 3rem; }
      .fg-hero h1 { font-size: 2.25rem; }
      .fg-hero-stats { flex-direction: row; gap: 1.5rem; }
      .fg-hero-sub { font-size: 1rem; }
      .fg-trust-banner { flex-direction: column; text-align: center; }
      .fg-question-card { padding: 1.75rem 1.25rem; }
      .fg-q-text { font-size: 1.15rem; }
      .fg-profile-header { padding: 2rem 1.5rem; }
      .fg-profile-name { font-size: 1.5rem; }
      .fg-consultant-cta { padding: 2rem 1.5rem; }
      .fg-consultant-cta h3 { font-size: 1.25rem; }
      .fg-consultant-user-info { flex-direction: column; align-items: stretch; }
      .fg-alloc-grid { grid-template-columns: 1fr; }
      .fg-amount-grid { grid-template-columns: repeat(2, 1fr); }
      .fg-nav-row { flex-wrap: wrap; }
      .fg-success-actions { flex-direction: column; }
    }

    @media (max-width: 480px) {
      .fg-hero h1 { font-size: 1.75rem; }
      .fg-stat-num { font-size: 1.75rem; }
      .fg-amount-grid { grid-template-columns: repeat(2, 1fr); }
      .fg-profile-emoji { font-size: 2rem; }
    }
  `}} />
);

export default FinancialGuidance;
