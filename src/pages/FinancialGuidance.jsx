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

// ─── Phase Constants ────────────────────────────────────────────
const PHASE = {
  LANDING: 'landing',
  QUIZ: 'quiz',
  RESULT: 'result',
  SUBMITTED: 'submitted',
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
  }, []);

  // ─── Handlers ─────────────────────────────────────────────────
  const startQuiz = () => {
    setPhase(PHASE.QUIZ);
    setStep(0);
    setAnswers({});
    setCorpusAmount(null);
    setProfileKey(null);
    setAllocation(null);
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
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const restartQuiz = () => {
    setPhase(PHASE.LANDING);
    setStep(0);
    setAnswers({});
    setCorpusAmount(null);
    setProfileKey(null);
    setAllocation(null);
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

  // ─── RENDER: LANDING ─────────────────────────────────────────
  if (phase === PHASE.LANDING) {
    return (
      <div className="fg-wrapper">
        {/* Hero */}
        <div className="fg-hero">
          <div className="fg-hero-content animate-fade-in">
            <div className="fg-hero-badge">
              <Sparkles size={14} /> Financial Guidance
            </div>
            <h1>Discover Your Financial Profile</h1>
            <p className="fg-hero-sub">
              Your Seva Nidhi took 4 years to earn. Answer 7 simple questions and get a personalised investment plan — designed specifically for Agniveers.
            </p>
            <div className="fg-hero-stats">
              <div className="fg-stat">
                <span className="fg-stat-num">7</span>
                <span className="fg-stat-label">Questions</span>
              </div>
              <div className="fg-stat">
                <span className="fg-stat-num">8</span>
                <span className="fg-stat-label">Profiles</span>
              </div>
              <div className="fg-stat">
                <span className="fg-stat-num">₹0</span>
                <span className="fg-stat-label">Cost</span>
              </div>
            </div>
            <button className="fg-cta-btn" onClick={startQuiz}>
              Start My Financial Profile <ArrowRight size={18} />
            </button>
          </div>
        </div>

        {/* Trust Section */}
        <div className="fg-container">
          <div className="fg-trust-banner animate-fade-in" style={{ animationDelay: '0.15s' }}>
            <ShieldCheck size={24} color="var(--ios-olive)" />
            <div className="fg-trust-text">
              <strong>VeerNXT Financial Guidance</strong>
              <span>Free, personalised, and built by experts who understand the Agniveer journey. No product selling — only unbiased guidance.</span>
            </div>
          </div>

          {/* Golden Rules */}
          <div className="fg-section animate-fade-in" style={{ animationDelay: '0.25s' }}>
            <h2 className="fg-section-title">
              <AlertTriangle size={20} color="#DC2626" />
              The 5 Things Every Agniveer Must Avoid
            </h2>
            <div className="fg-rules-grid">
              {GOLDEN_RULES.map((rule, i) => (
                <div key={i} className="fg-rule-card">
                  <div className="fg-rule-icon">
                    <XCircle size={18} color="#DC2626" />
                  </div>
                  <div>
                    <h4 className="fg-rule-title">{rule.title}</h4>
                    <p className="fg-rule-desc">{rule.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 5 Laws */}
          <div className="fg-section animate-fade-in" style={{ animationDelay: '0.35s' }}>
            <h2 className="fg-section-title">
              <ShieldCheck size={20} color="var(--ios-olive)" />
              The 5 Laws That Never Change
            </h2>
            <div className="fg-laws-list">
              {FIVE_LAWS.map((law, i) => (
                <div key={i} className="fg-law-item">
                  <div className="fg-law-num">{i + 1}</div>
                  <span>{law}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom CTA */}
          <div className="fg-bottom-cta animate-fade-in" style={{ animationDelay: '0.45s' }}>
            <h3>Ready to discover your profile?</h3>
            <p>7 questions. 2 minutes. A personalised plan for your future.</p>
            <button className="fg-cta-btn" onClick={startQuiz}>
              Start Now <ArrowRight size={18} />
            </button>
          </div>
        </div>

        <FinancialGuidanceStyles />
      </div>
    );
  }

  // ─── RENDER: QUIZ ─────────────────────────────────────────────
  if (phase === PHASE.QUIZ) {
    const q = currentQuestion;
    const isLast = step === QUESTIONS.length - 1;
    const selectedAnswer = answers[q.id];

    return (
      <div className="fg-wrapper">
        <div className="fg-quiz-container animate-fade-in">
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

          {/* Question */}
          <div className="fg-question-card">
            <div className="fg-q-label">{q.label}</div>
            <h2 className="fg-q-text">{q.text}</h2>
            <p className="fg-q-sub">{q.sub}</p>

            {/* Amount selector */}
            {q.isAmount ? (
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
                {q.options.map(opt => (
                  <div
                    key={opt.key}
                    className={`fg-option ${selectedAnswer === opt.key ? 'selected' : ''}`}
                    onClick={() => selectOption(q.id, opt.key)}
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

            {/* Navigation */}
            <div className="fg-nav-row">
              {step > 0 && (
                <button className="fg-nav-btn fg-nav-back" onClick={prevStep}>
                  <ArrowLeft size={16} /> Back
                </button>
              )}
              <div style={{ flex: 1 }} />
              {isLast ? (
                <button
                  className={`fg-nav-btn fg-nav-primary ${!corpusAmount ? 'disabled' : ''}`}
                  onClick={finishQuiz}
                  disabled={!corpusAmount}
                >
                  See My Plan <Target size={16} />
                </button>
              ) : (
                <button
                  className={`fg-nav-btn fg-nav-primary ${!selectedAnswer ? 'disabled' : ''}`}
                  onClick={nextStep}
                  disabled={!selectedAnswer}
                >
                  Next <ArrowRight size={16} />
                </button>
              )}
            </div>
          </div>
        </div>

        <FinancialGuidanceStyles />
      </div>
    );
  }

  // ─── RENDER: RESULT ───────────────────────────────────────────
  if (phase === PHASE.RESULT && profile && allocation) {
    const sipMonthly = Math.max(Math.round(corpusAmount * 0.05 / 12), 500);

    return (
      <div className="fg-wrapper">
        <div className="fg-result-container animate-fade-in">
          {/* Profile Header */}
          <div className="fg-profile-header" style={{ background: profile.bgColor, borderColor: profile.borderColor }}>
            <div className="fg-profile-emoji">{profile.emoji}</div>
            <div className="fg-profile-badge" style={{ color: profile.color }}>{profile.badge} — {formatINR(corpusAmount)} corpus</div>
            <h1 className="fg-profile-name" style={{ color: profile.color }}>{profile.name}</h1>
            <p className="fg-profile-desc">{profile.desc}</p>
            <div className="fg-profile-meta">
              <span className="fg-meta-pill" style={{ background: profile.color, color: 'white' }}>
                ⚖️ {profile.risk}
              </span>
              <span className="fg-meta-pill" style={{ background: 'rgba(0,0,0,0.06)' }}>
                ⏱️ {profile.horizon}
              </span>
            </div>
          </div>

          {/* Urgency Flags */}
          <div className="fg-section">
            <h3 className="fg-section-subtitle">Priority Flags</h3>
            <div className="fg-urgency-strip">
              {profile.urgencies.map((u, i) => (
                <span
                  key={i}
                  className={`fg-urgency-pill ${u.level}`}
                >
                  {u.text}
                </span>
              ))}
            </div>
          </div>

          {/* SIP Box */}
          <div className="fg-sip-box">
            <div className="fg-sip-label">Minimum SIP to start — regardless of everything else</div>
            <div className="fg-sip-val">{formatINR(sipMonthly)} / month</div>
            <div className="fg-sip-sub">The Agniveer served with discipline for 4 years. This SIP is that same discipline — applied to wealth.</div>
          </div>

          {/* Allocation Grid */}
          <div className="fg-section">
            <h3 className="fg-section-subtitle">{allocation.label} — {formatINR(corpusAmount)}</h3>
            <div className="fg-alloc-grid">
              {allocation.items.map((item, i) => (
                <div key={i} className="fg-alloc-card">
                  <div className="fg-alloc-pct" style={{ color: profile.color }}>{item.pct}%</div>
                  <div className="fg-alloc-product">{item.product}</div>
                  <div className="fg-alloc-amt">{formatINR(item.amount)}</div>
                  <div className="fg-alloc-why">{item.why}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Visual Allocation Bar */}
          <div className="fg-alloc-bar-container">
            <div className="fg-alloc-bar">
              {allocation.items.map((item, i) => {
                const colors = ['#1D9E75', '#EF9F27', '#2563EB', '#7C3AED', '#DC2626'];
                return (
                  <div
                    key={i}
                    className="fg-alloc-bar-segment"
                    style={{ width: `${item.pct}%`, background: colors[i % colors.length] }}
                    title={`${item.product}: ${item.pct}%`}
                  />
                );
              })}
            </div>
            <div className="fg-alloc-bar-labels">
              {allocation.items.map((item, i) => {
                const colors = ['#1D9E75', '#EF9F27', '#2563EB', '#7C3AED', '#DC2626'];
                return (
                  <div key={i} className="fg-alloc-bar-label">
                    <span className="fg-bar-dot" style={{ background: colors[i % colors.length] }} />
                    <span className="fg-bar-text">{item.product.split('(')[0].trim()}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 5 Laws */}
          <div className="fg-pillars" style={{ borderColor: profile.borderColor, background: profile.bgColor }}>
            <div className="fg-pillars-title">Five laws that never change — for any profile</div>
            {FIVE_LAWS.map((law, i) => (
              <div key={i} className="fg-pillar-row">
                <div className="fg-pillar-num" style={{ background: profile.color }}>{i + 1}</div>
                <span>{law}</span>
              </div>
            ))}
          </div>

          {/* Consultant CTA */}
          <div className="fg-consultant-cta">
            <div className="fg-consultant-icon">
              <MessageCircle size={32} color="white" />
            </div>
            <h3>Talk to a VeerNXT Financial Consultant</h3>
            <p>Our SEBI-registered advisors will review your profile and create a detailed, actionable plan — completely free.</p>
            <div className="fg-consultant-user-info">
              <div className="fg-user-detail">
                <span className="fg-user-label">Name</span>
                <span className="fg-user-value">{userName}</span>
              </div>
              {userPhone && (
                <div className="fg-user-detail">
                  <span className="fg-user-label">Phone</span>
                  <span className="fg-user-value">{userPhone}</span>
                </div>
              )}
              {userEmail && (
                <div className="fg-user-detail">
                  <span className="fg-user-label">Email</span>
                  <span className="fg-user-value">{userEmail}</span>
                </div>
              )}
            </div>
            <button
              className="fg-wa-btn"
              onClick={handleConsultantHandoff}
              disabled={saving}
            >
              {saving ? (
                <><RefreshCw size={18} className="animate-spin" /> Connecting...</>
              ) : (
                <><MessageCircle size={18} /> Connect on WhatsApp</>
              )}
            </button>
            <p className="fg-wa-note">
              Your profile summary will be shared with our team. A financial consultant will contact you within 24 hours.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="fg-action-row">
            <button className="fg-action-btn" onClick={handleDownload}>
              <Download size={16} /> Download Plan
            </button>
            <button className="fg-action-btn fg-action-restart" onClick={restartQuiz}>
              <RefreshCw size={16} /> Start Again
            </button>
          </div>
        </div>

        <FinancialGuidanceStyles />
      </div>
    );
  }

  // ─── RENDER: SUBMITTED ────────────────────────────────────────
  if (phase === PHASE.SUBMITTED) {
    return (
      <div className="fg-wrapper">
        <div className="fg-submitted-container animate-fade-in">
          <div className="fg-success-icon">
            <CheckCircle size={64} color="#1D9E75" />
          </div>
          <h1 className="fg-success-title">You're All Set, {userName.split(' ')[0]}!</h1>
          <p className="fg-success-sub">
            Your financial profile has been shared with our team. A VeerNXT financial consultant will contact you within 24 hours to create your detailed plan.
          </p>

          <div className="fg-success-card">
            <div className="fg-success-row">
              <span className="fg-success-label">Your Profile</span>
              <span className="fg-success-value">{profile?.emoji} {profile?.name}</span>
            </div>
            <div className="fg-success-row">
              <span className="fg-success-label">Corpus</span>
              <span className="fg-success-value">{formatINR(corpusAmount)}</span>
            </div>
            <div className="fg-success-row">
              <span className="fg-success-label">Risk Level</span>
              <span className="fg-success-value">{profile?.risk}</span>
            </div>
          </div>

          <div className="fg-success-actions">
            <button className="fg-cta-btn fg-cta-outline" onClick={() => setPhase(PHASE.RESULT)}>
              <ArrowLeft size={16} /> View My Plan Again
            </button>
            <button className="fg-cta-btn" onClick={restartQuiz}>
              <RefreshCw size={16} /> New Profile
            </button>
          </div>
        </div>

        <FinancialGuidanceStyles />
      </div>
    );
  }

  return null;
};

// ─── Scoped Styles Component ────────────────────────────────────
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
