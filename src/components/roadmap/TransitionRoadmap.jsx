import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Link } from 'react-router-dom';
import {
  Compass,
  BookOpen,
  ListChecks,
  PlayCircle,
  RefreshCw,
  Rocket,
  Bell,
  CheckCircle2,
  ArrowRight,
  Shield,
  Zap,
  Target,
  FileText,
  Award,
  ChevronRight,
  Calendar,
  Sparkles,
} from 'lucide-react';

const STAGES = [
  {
    id: 'explore',
    number: '01',
    name: 'Explore',
    title: 'Explore & Map Opportunities',
    tagline: 'Translate military service into civilian quotas, cadres & syllabus paths',
    icon: Compass,
    badge: 'TACTICAL RECON',
    duration: 'Week 1 – 2',
    overview:
      'Begin by auditing your military trade alignment, age concessions, and reservation quotas across Central Police (CAPF), State Police, Indian Railways, and Banking cadres. Knowing your legal entitlements gives you an immediate competitive advantage over civilian candidates.',
    pillars: [
      {
        title: 'ESM Horizontal Reservation',
        desc: '10% to 20% horizontal reservation in Group C/D posts across CAPF, SSC GD, Railways (RRB), and Public Sector Banks.',
        icon: Shield,
      },
      {
        title: 'Age Relaxation Matrix',
        desc: 'Deduct total completed service years + 3 years from actual age. Most government exams extend eligibility up to 30–35+ years.',
        icon: Target,
      },
      {
        title: 'Physical Standard Waivers',
        desc: 'Relaxation in PST/PET running and height requirements for ex-servicemen in select state and paramilitary recruitments.',
        icon: Zap,
      },
      {
        title: 'Trade & Technical Equivalency',
        desc: 'Military specialisations (Signals, Logistics, EME, Armour) map directly to specialized civilian technician and security posts.',
        icon: Award,
      },
    ],
    checklist: [
      'Audit your service record & obtain Ex-Servicemen / Agniveer certificate',
      'Review Top 10 Recommended Jobs and shortlist target openings',
      'Download exam notifications and note eligibility cutoffs',
      'Confirm domicile-based reservation benefits in your home state',
    ],
    actionType: 'jobs',
    actionLabel: 'View 10 Recommended Jobs',
  },
  {
    id: 'learn',
    number: '02',
    name: 'Learn',
    title: 'Learn Concepts & Core Syllabus',
    tagline: 'Master fundamentals through concise study guides & textbook précis',
    icon: BookOpen,
    badge: 'CONCEPT MASTERY',
    duration: 'Week 3 – 6',
    overview:
      'Civilian competitive exams test speed and academic recall. Rebuild core academic discipline with structured, veteran-tailored study blocks covering Quantitative Aptitude, Logical Reasoning, General Awareness, and English/Hindi.',
    pillars: [
      {
        title: 'Curated Textbooks & Précis',
        desc: 'Access chapter-by-chapter summaries and core concepts without getting lost in 800-page bulky civilian guidebooks.',
        icon: BookOpen,
      },
      {
        title: 'General Awareness Radar',
        desc: 'High-yield capsules covering Indian Polity, Modern History, Geography, Defense Current Affairs, and Economy.',
        icon: Target,
      },
      {
        title: 'Aptitude & Mental Arithmetic',
        desc: 'Shortcut Vedic arithmetic methods, percentage-ratio tricks, and algebra foundations tailored for non-math backgrounds.',
        icon: Zap,
      },
      {
        title: 'Reasoning & Logic Mastery',
        desc: 'Coding-decoding, blood relations, non-verbal patterns, and syllogisms broken down with clear visual steps.',
        icon: CheckCircle2,
      },
    ],
    checklist: [
      'Complete Quantitative Aptitude foundations (Percentages, Ratios, Speed-Distance)',
      'Read Indian Polity & Constitution summary in VeerNXT Learning Center',
      'Maintain a daily 30-minute current affairs & defense news habit',
      'Bookmark formula cheat sheets for instant daily revision',
    ],
    actionType: 'link',
    actionUrl: '/learning-center',
    actionLabel: 'Open Learning Center & Guides',
  },
  {
    id: 'practise',
    number: '03',
    name: 'Practise',
    title: 'Practise Topic-Wise PYQs',
    tagline: 'Solve 5,000+ Previous Year Questions with step-by-step solutions',
    icon: ListChecks,
    badge: 'HIGH-VOLUME DRILLS',
    duration: 'Week 7 – 9',
    overview:
      'Theory alone does not clear exams; muscle memory does. Daily topic-wise question sprints bridge the gap between understanding a concept and solving it under 45 seconds under pressure.',
    pillars: [
      {
        title: '10+ Years Previous Papers',
        desc: 'Real exam questions from SSC GD/CGL, CAPF AC/CISF, RRB NTPC, and State Police boards categorized by topic.',
        icon: ListChecks,
      },
      {
        title: 'Step-by-Step Hindi & English Keys',
        desc: 'Every question includes verified step-by-step explanation with shortcut formulas and common trap warnings.',
        icon: FileText,
      },
      {
        title: '10-Minute Micro Drills',
        desc: 'Bite-sized 10-question sprints you can solve on your phone during transit or between daily schedules.',
        icon: Zap,
      },
      {
        title: 'Accuracy Tracking',
        desc: 'Real-time telemetry showing your strike rate, speed per question, and common calculation mistakes.',
        icon: Target,
      },
    ],
    checklist: [
      'Solve at least 50 Previous Year Questions daily across 2 subjects',
      'Maintain an "Error Log" notebook for every question answered incorrectly',
      'Master option elimination tricks for General Awareness questions',
      'Achieve 85%+ accuracy in Reasoning and Verbal ability',
    ],
    actionType: 'link',
    actionUrl: '/quiz',
    actionLabel: 'Start Topic Practice Drills',
  },
  {
    id: 'test',
    number: '04',
    name: 'Test',
    title: 'Test in Exam Simulations',
    tagline: 'Full-length timed mock tests with negative marking and All-India ranks',
    icon: PlayCircle,
    badge: 'EXAM SIMULATION',
    duration: 'Week 10 – 12',
    overview:
      'Simulate the exact environment of Computer Based Tests (CBT). Experience real ticking timers, question palettes, negative marking penalties, and pressure management so the actual exam day feels like routine training.',
    pillars: [
      {
        title: 'Exact CBT Interface',
        desc: 'Standard government exam layout: mark for review, question status palette, and strict section countdown timers.',
        icon: PlayCircle,
      },
      {
        title: 'Negative Marking Penalty Simulation',
        desc: 'Enforces tactical discipline—trains you when to commit, when to eliminate, and when to leave an uncertain question.',
        icon: Shield,
      },
      {
        title: 'All-India Veteran Benchmark',
        desc: 'Compare your performance against fellow Agniveers and veterans preparing for the same recruitment track.',
        icon: Award,
      },
      {
        title: 'Sectional Cutoff Clearance',
        desc: 'Verify that you comfortably clear both overall and sectional qualifying thresholds mandated for ESM quotas.',
        icon: Target,
      },
    ],
    checklist: [
      'Attempt 1 full-length timed mock test every Saturday morning',
      'Never pause or restart during the mock test window',
      'Analyze sectional time allocation (max 30s on GK, 60s on Math)',
      'Clear sectional cutoffs in 3 consecutive mock exams',
    ],
    actionType: 'link',
    actionUrl: '/quiz',
    actionLabel: 'Take Full-Length Mock Test',
  },
  {
    id: 'repeat',
    number: '05',
    name: 'Repeat',
    title: 'Repeat & Master Weak Areas',
    tagline: 'Targeted diagnosis to eliminate error patterns and elevate score by 15+',
    icon: RefreshCw,
    badge: 'DIAGNOSTIC LOOP',
    duration: 'Continuous',
    overview:
      'In military operations, debriefing is mandatory. Treat every mock test the same way: diagnose why an error occurred (knowledge gap, calculation rush, or misread question) and re-drill that exact topic until 100% resolved.',
    pillars: [
      {
        title: 'AI Error Classification',
        desc: 'Instant diagnostic breaking down misses into "Concept Gap", "Calculation Slip", or "Time Pressure Rush".',
        icon: RefreshCw,
      },
      {
        title: 'Spaced Retesting Loop',
        desc: 'Incorrectly answered questions are automatically served back to you after 3 and 7 days to guarantee retention.',
        icon: ListChecks,
      },
      {
        title: 'Score Elevation Trajectory',
        desc: 'Iterative improvement path designed to boost your aggregate score by 10 to 15 marks within 3 cycles.',
        icon: Target,
      },
      {
        title: 'Confidence Reinforcement',
        desc: 'Focus on high-weightage topics to maximize marks return per hour invested.',
        icon: Sparkles,
      },
    ],
    checklist: [
      'Spend at least 60 minutes reviewing the solutions of every mock test',
      'Re-attempt all flagged incorrect questions without looking at solutions',
      'Revise the underlying theory notes in Learning Center for recurring errors',
      'Verify score trajectory rises above 78% in repeat tests',
    ],
    actionType: 'link',
    actionUrl: '/learning-center',
    actionLabel: 'Review Study Notes for Weak Topics',
  },
  {
    id: 'apply',
    number: '06',
    name: 'Apply',
    title: 'Apply Strategically with ATS CV',
    tagline: 'Submit error-free government forms and dispatch your corporate ATS resume',
    icon: Rocket,
    badge: 'MISSION DISPATCH',
    duration: 'Notification Window',
    overview:
      'Maximize your deployment options by running parallel tracks: apply for government notifications under Ex-Servicemen quotas, while simultaneously pitching your translated military profile to top defense, aerospace, and logistics employers.',
    pillars: [
      {
        title: 'Quota Application Protocol',
        desc: 'Guidelines for correctly claiming ESM codes, fee exemptions, Annexure certificates, and physical relaxations.',
        icon: Shield,
      },
      {
        title: 'Military-to-Civilian ATS Resume',
        desc: 'One-click tool converting your rank, operational duties, and commendations into corporate-friendly ATS keywords.',
        icon: FileText,
      },
      {
        title: 'Private Defense & PSU Routing',
        desc: 'Direct career pathways into HAL, BEL, Ordnance factories, Larsen & Toubro Defense, and private logistics giants.',
        icon: Rocket,
      },
      {
        title: 'Document Dossier Readiness',
        desc: 'Checklists ensuring your Discharge Book, PPO, identity card, and educational certificates are formatted correctly.',
        icon: CheckCircle2,
      },
    ],
    checklist: [
      'Generate your corporate ATS resume with translated military skills',
      'Keep digital copies of Class 10/12/Degree marks sheets, Domicile & Discharge Book',
      'Submit government exam applications at least 3 days before the closing deadline',
      'Apply to at least 3 trade-aligned private and PSU roles',
    ],
    actionType: 'link',
    actionUrl: '/cv',
    actionLabel: 'Build ATS Military Resume',
  },
  {
    id: 'update',
    number: '07',
    name: 'Stay Updated',
    title: 'Stay Updated on Deadlines & Results',
    tagline: 'Real-time radar for admit cards, PET/PST dates, answer keys & new openings',
    icon: Bell,
    badge: 'LIVE RADAR',
    duration: 'Ongoing',
    overview:
      'Never let an opportunity slip through administrative oversight. Get proactive alerts on application release windows, admit card releases, PET physical endurance dates, answer key objections, and merit lists.',
    pillars: [
      {
        title: 'Active Recruitment Radar',
        desc: 'Continuous tracking across 200+ central and state recruitment portals, police commissions, and defense PSUs.',
        icon: Bell,
      },
      {
        title: 'PST / PET Physical Schedule Alerts',
        desc: 'Advance notice for physical efficiency tests, giving you 4-6 weeks to ramp up running and endurance conditioning.',
        icon: Zap,
      },
      {
        title: 'Document Verification Alerts',
        desc: 'Detailed briefs on required original certificates and affidavits before interview or reporting stages.',
        icon: CheckCircle2,
      },
      {
        title: 'WhatsApp & SMS Flash Updates',
        desc: 'Critical deadline alerts sent directly to your phone so you stay informed even during travel or field duties.',
        icon: Sparkles,
      },
    ],
    checklist: [
      'Enable browser / WhatsApp notification alerts on VeerNXT',
      'Sync target exam application closing dates to your phone calendar',
      'Monitor PET/PST physical reporting dates for Police & CAPF matches',
      'Track official answer keys and raise challenges within the 72-hour window',
    ],
    actionType: 'link',
    actionUrl: '/private-sector/opportunities',
    actionLabel: 'Explore Live Opportunities & Alerts',
  },
];

export const TransitionRoadmap = ({
  rawProfile,
  onNavigateToJobs,
  onNavigateToExams,
}) => {
  const [activeStageIndex, setActiveStageIndex] = useState(0);
  const [completedItems, setCompletedItems] = useState({});

  const currentStage = STAGES[activeStageIndex];
  const serviceBranch = rawProfile?.serviceBranch || rawProfile?.branch || 'Armed Forces';
  const armCorpsTrade = rawProfile?.armCorpsTrade || rawProfile?.trade || 'General Duty';

  const toggleChecklist = (stageId, itemIdx) => {
    const key = `${stageId}_${itemIdx}`;
    setCompletedItems(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const getStageCompletedCount = (stageId) => {
    const stage = STAGES.find(s => s.id === stageId);
    if (!stage) return 0;
    return stage.checklist.filter((_, idx) => completedItems[`${stageId}_${idx}`]).length;
  };

  const handleStageAction = (stage) => {
    if (stage.actionType === 'jobs') {
      if (onNavigateToJobs) onNavigateToJobs();
    } else if (stage.actionType === 'exams') {
      if (onNavigateToExams) onNavigateToExams();
    }
  };

  return (
    <div className="tr-roadmap-root">
      {/* ─── SECTION HEADER ─── */}
      <div className="tr-roadmap-head">
        <div>
          <div className="tr-roadmap-eyebrow">
            <Sparkles size={14} /> MILITARY-TO-CIVILIAN TRANSITION PIPELINE
          </div>
          <h2 className="tr-roadmap-title">Complete 7-Stage Transition Roadmap</h2>
          <p className="tr-roadmap-sub">
            A disciplined, tactical roadmap designed specifically for your{' '}
            <strong>{serviceBranch}</strong> background ({armCorpsTrade}) to navigate civilian exams and corporate hiring.
          </p>
        </div>

        <div className="tr-stage-counter-pill">
          <span className="tr-counter-current">Stage {activeStageIndex + 1} of 7</span>
          <span className="tr-counter-name">{currentStage.name}</span>
        </div>
      </div>

      {/* ─── INTERACTIVE STEPPER TRACK ─── */}
      <div className="tr-stepper-wrap">
        <div className="tr-stepper-scroll">
          <div className="tr-stepper-track">
            {/* Background connecting progress line */}
            <div className="tr-track-line-bg" />
            <div
              className="tr-track-line-fill"
              style={{
                width: `${(activeStageIndex / (STAGES.length - 1)) * 100}%`,
              }}
            />

            {STAGES.map((stage, idx) => {
              const IconComp = stage.icon;
              const isActive = idx === activeStageIndex;
              const isPast = idx < activeStageIndex;
              const completedCount = getStageCompletedCount(stage.id);
              const isFullyDone = completedCount === stage.checklist.length;

              return (
                <button
                  key={stage.id}
                  type="button"
                  className={`tr-step-btn ${isActive ? 'active' : ''} ${isPast ? 'past' : ''}`}
                  onClick={() => setActiveStageIndex(idx)}
                >
                  <div className="tr-step-node">
                    {isFullyDone ? (
                      <CheckCircle2 size={18} className="tr-step-check" />
                    ) : (
                      <IconComp size={18} />
                    )}
                    {isActive && <span className="tr-node-ping" />}
                  </div>
                  <div className="tr-step-text-wrap">
                    <span className="tr-step-num">{stage.number}</span>
                    <span className="tr-step-label">{stage.name}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ─── ACTIVE STAGE CARD CONTAINER ─── */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStage.id}
          className="tr-stage-card"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3 }}
        >
          {/* Stage Top Bar */}
          <div className="tr-stage-banner">
            <div className="tr-stage-banner-left">
              <div className="tr-stage-badge-row">
                <span className="tr-stage-pill">{currentStage.badge}</span>
                <span className="tr-stage-duration">
                  <Calendar size={12} /> {currentStage.duration}
                </span>
                <span className="tr-stage-step-tag">STEP {currentStage.number} / 07</span>
              </div>
              <h3 className="tr-stage-heading">{currentStage.title}</h3>
              <p className="tr-stage-tagline">{currentStage.tagline}</p>
            </div>

            <div className="tr-stage-nav-controls">
              <button
                type="button"
                className="tr-nav-prev"
                disabled={activeStageIndex === 0}
                onClick={() => setActiveStageIndex((prev) => Math.max(0, prev - 1))}
              >
                ← Prev
              </button>
              <button
                type="button"
                className="tr-nav-next"
                disabled={activeStageIndex === STAGES.length - 1}
                onClick={() => setActiveStageIndex((prev) => Math.min(STAGES.length - 1, prev + 1))}
              >
                Next →
              </button>
            </div>
          </div>

          {/* Overview text */}
          <div className="tr-stage-overview-box">
            <p>{currentStage.overview}</p>
          </div>

          {/* Tactical Pillars Grid */}
          <div className="tr-pillars-grid">
            {currentStage.pillars.map((pillar, pIdx) => {
              const PillarIcon = pillar.icon;
              return (
                <div key={pIdx} className="tr-pillar-card">
                  <div className="tr-pillar-head">
                    <div className="tr-pillar-icon">
                      <PillarIcon size={16} />
                    </div>
                    <h4 className="tr-pillar-title">{pillar.title}</h4>
                  </div>
                  <p className="tr-pillar-desc">{pillar.desc}</p>
                </div>
              );
            })}
          </div>

          {/* Action & Milestones Checklist Section */}
          <div className="tr-bottom-split">
            {/* Interactive Checklist */}
            <div className="tr-checklist-box">
              <div className="tr-checklist-head">
                <div className="tr-checklist-title">
                  <CheckCircle2 size={16} /> Actionable Milestones
                </div>
                <span className="tr-checklist-progress">
                  {getStageCompletedCount(currentStage.id)} / {currentStage.checklist.length} Done
                </span>
              </div>

              <div className="tr-checklist-items">
                {currentStage.checklist.map((task, tIdx) => {
                  const isChecked = !!completedItems[`${currentStage.id}_${tIdx}`];
                  return (
                    <label
                      key={tIdx}
                      className={`tr-check-row ${isChecked ? 'checked' : ''}`}
                      onClick={() => toggleChecklist(currentStage.id, tIdx)}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}} // handled by parent label onClick
                      />
                      <span className="tr-check-box-fake">
                        {isChecked && <CheckCircle2 size={14} />}
                      </span>
                      <span className="tr-check-label">{task}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Direct Tool Launch Action Box */}
            <div className="tr-action-box">
              <div className="tr-action-content">
                <div className="tr-action-icon-wrap">
                  <Rocket size={24} />
                </div>
                <div>
                  <h4 className="tr-action-title">Ready for Stage {currentStage.number}?</h4>
                  <p className="tr-action-desc">
                    Launch the specialized tool designed for the <strong>{currentStage.name}</strong> phase.
                  </p>
                </div>
              </div>

              <div className="tr-action-buttons">
                {currentStage.actionType === 'link' ? (
                  <Link to={currentStage.actionUrl} className="tr-btn-primary">
                    {currentStage.actionLabel} <ArrowRight size={15} />
                  </Link>
                ) : (
                  <button
                    type="button"
                    className="tr-btn-primary"
                    onClick={() => handleStageAction(currentStage)}
                  >
                    {currentStage.actionLabel} <ArrowRight size={15} />
                  </button>
                )}

                {activeStageIndex < STAGES.length - 1 && (
                  <button
                    type="button"
                    className="tr-btn-secondary"
                    onClick={() => setActiveStageIndex((prev) => prev + 1)}
                  >
                    Next: Stage {activeStageIndex + 2} ({STAGES[activeStageIndex + 1].name})
                    <ChevronRight size={14} />
                  </button>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      <style dangerouslySetInnerHTML={{ __html: `
        .tr-roadmap-root {
          margin-bottom: 2.5rem;
        }

        .tr-roadmap-head {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 1rem;
          margin-bottom: 1.5rem;
        }

        .tr-roadmap-eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          font-size: 0.72rem;
          font-weight: 800;
          letter-spacing: 0.06em;
          color: var(--ios-olive, #4b6b32);
          margin-bottom: 0.25rem;
        }

        .tr-roadmap-title {
          font-size: 1.45rem;
          font-weight: 800;
          margin: 0 0 0.25rem;
          color: var(--ios-text, #111827);
        }

        .tr-roadmap-sub {
          font-size: 0.88rem;
          color: var(--text-secondary, #6b7280);
          margin: 0;
          max-width: 720px;
        }

        .tr-stage-counter-pill {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          background: rgba(75, 107, 50, 0.1);
          border: 1px solid rgba(75, 107, 50, 0.25);
          padding: 0.4rem 0.85rem;
          border-radius: 999px;
          font-size: 0.76rem;
        }

        .tr-counter-current {
          font-weight: 700;
          color: var(--text-secondary, #6b7280);
        }

        .tr-counter-name {
          font-weight: 800;
          color: var(--ios-olive, #4b6b32);
        }

        /* ─── STEPPER BAR ─── */
        .tr-stepper-wrap {
          background: var(--surface, #ffffff);
          border: 1px solid var(--border, #e5e7eb);
          border-radius: 18px;
          padding: 1.25rem 1.5rem;
          margin-bottom: 1.5rem;
          box-shadow: var(--shadow-1, 0 1px 3px rgba(0,0,0,0.06));
        }

        .tr-stepper-scroll {
          overflow-x: auto;
          scrollbar-width: none;
          -ms-overflow-style: none;
          padding: 0.4rem 0;
        }

        .tr-stepper-scroll::-webkit-scrollbar {
          display: none;
        }

        .tr-stepper-track {
          display: flex;
          align-items: center;
          justify-content: space-between;
          position: relative;
          min-width: 680px;
        }

        .tr-track-line-bg {
          position: absolute;
          top: 22px;
          left: 30px;
          right: 30px;
          height: 3px;
          background: var(--border, #e5e7eb);
          z-index: 1;
        }

        .tr-track-line-fill {
          position: absolute;
          top: 22px;
          left: 30px;
          height: 3px;
          background: linear-gradient(90deg, #4b6b32 0%, #84cc16 100%);
          z-index: 2;
          transition: width 0.35s ease;
        }

        .tr-step-btn {
          position: relative;
          z-index: 3;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.5rem;
          background: none;
          border: none;
          cursor: pointer;
          padding: 0.2rem 0.5rem;
          transition: transform 0.15s ease;
        }

        .tr-step-btn:hover {
          transform: translateY(-2px);
        }

        .tr-step-node {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background: var(--surface, #ffffff);
          border: 2px solid var(--border-strong, #d1d5db);
          color: var(--text-secondary, #6b7280);
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          transition: all 0.2s ease;
        }

        .tr-step-btn.past .tr-step-node {
          background: #f0fdf4;
          border-color: #86efac;
          color: #16a34a;
        }

        .tr-step-btn.active .tr-step-node {
          background: var(--ios-olive, #4b6b32);
          border-color: #2d5530;
          color: #ffffff;
          box-shadow: 0 0 0 4px rgba(75, 107, 50, 0.2);
        }

        .tr-node-ping {
          position: absolute;
          inset: -4px;
          border-radius: 50%;
          border: 2px solid #84cc16;
          animation: tr-ping-kf 1.6s cubic-bezier(0, 0, 0.2, 1) infinite;
        }

        @keyframes tr-ping-kf {
          75%, 100% {
            transform: scale(1.35);
            opacity: 0;
          }
        }

        .tr-step-check {
          color: #16a34a;
        }

        .tr-step-text-wrap {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1px;
        }

        .tr-step-num {
          font-size: 0.65rem;
          font-weight: 800;
          color: var(--text-secondary, #9ca3af);
        }

        .tr-step-label {
          font-size: 0.78rem;
          font-weight: 700;
          color: var(--ios-text, #374151);
          white-space: nowrap;
        }

        .tr-step-btn.active .tr-step-label {
          color: var(--ios-olive, #4b6b32);
          font-weight: 800;
        }

        /* ─── STAGE CARD ─── */
        .tr-stage-card {
          background: var(--surface, #ffffff);
          border: 1px solid var(--border, #e5e7eb);
          border-radius: 20px;
          padding: clamp(1.25rem, 2.5vw, 2rem);
          box-shadow: var(--shadow-2, 0 4px 16px rgba(0,0,0,0.06));
        }

        .tr-stage-banner {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 1rem;
          margin-bottom: 1.25rem;
          padding-bottom: 1.15rem;
          border-bottom: 1px solid var(--border, #e5e7eb);
        }

        .tr-stage-banner-left {
          flex: 1;
          min-width: 280px;
        }

        .tr-stage-badge-row {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 0.5rem;
          margin-bottom: 0.5rem;
        }

        .tr-stage-pill {
          font-size: 0.68rem;
          font-weight: 800;
          letter-spacing: 0.05em;
          padding: 0.2rem 0.6rem;
          border-radius: 999px;
          background: rgba(75, 107, 50, 0.12);
          color: var(--ios-olive, #4b6b32);
        }

        .tr-stage-duration {
          display: inline-flex;
          align-items: center;
          gap: 0.3rem;
          font-size: 0.72rem;
          font-weight: 600;
          color: var(--text-secondary, #6b7280);
          background: var(--surface-alt, #f9fafb);
          padding: 0.2rem 0.55rem;
          border-radius: 6px;
        }

        .tr-stage-step-tag {
          font-size: 0.68rem;
          font-weight: 800;
          color: var(--text-secondary, #9ca3af);
        }

        .tr-stage-heading {
          font-size: 1.35rem;
          font-weight: 800;
          color: var(--ios-text, #111827);
          margin: 0 0 0.35rem;
        }

        .tr-stage-tagline {
          font-size: 0.88rem;
          color: var(--text-secondary, #6b7280);
          margin: 0;
        }

        .tr-stage-nav-controls {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .tr-nav-prev,
        .tr-nav-next {
          padding: 0.45rem 0.85rem;
          border-radius: 8px;
          font-size: 0.76rem;
          font-weight: 700;
          cursor: pointer;
          border: 1px solid var(--border-strong, #d1d5db);
          background: var(--surface, #ffffff);
          color: var(--ios-text, #374151);
          transition: all 0.15s ease;
        }

        .tr-nav-prev:hover:not(:disabled),
        .tr-nav-next:hover:not(:disabled) {
          border-color: var(--ios-olive, #4b6b32);
          color: var(--ios-olive, #4b6b32);
        }

        .tr-nav-prev:disabled,
        .tr-nav-next:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        .tr-stage-overview-box {
          background: var(--surface-alt, #f9fafb);
          border-left: 3px solid var(--ios-olive, #4b6b32);
          border-radius: 10px;
          padding: 0.85rem 1.15rem;
          margin-bottom: 1.5rem;
        }

        .tr-stage-overview-box p {
          margin: 0;
          font-size: 0.86rem;
          line-height: 1.55;
          color: var(--ios-text, #374151);
        }

        /* Pillars Grid */
        .tr-pillars-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1rem;
          margin-bottom: 1.5rem;
        }

        .tr-pillar-card {
          background: var(--surface-alt, #f9fafb);
          border: 1px solid var(--border, #e5e7eb);
          border-radius: 12px;
          padding: 1rem;
          transition: border-color 0.15s ease;
        }

        .tr-pillar-card:hover {
          border-color: rgba(75, 107, 50, 0.4);
        }

        .tr-pillar-head {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          margin-bottom: 0.45rem;
        }

        .tr-pillar-icon {
          width: 30px;
          height: 30px;
          border-radius: 8px;
          background: rgba(75, 107, 50, 0.12);
          color: var(--ios-olive, #4b6b32);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .tr-pillar-title {
          font-size: 0.88rem;
          font-weight: 800;
          color: var(--ios-text, #111827);
          margin: 0;
        }

        .tr-pillar-desc {
          margin: 0;
          font-size: 0.8rem;
          line-height: 1.48;
          color: var(--text-secondary, #6b7280);
        }

        /* Bottom Split: Checklist + Action Box */
        .tr-bottom-split {
          display: grid;
          grid-template-columns: 1.2fr 1fr;
          gap: 1.25rem;
          align-items: stretch;
        }

        .tr-checklist-box {
          background: #fdfdfd;
          border: 1px solid var(--border, #e5e7eb);
          border-radius: 14px;
          padding: 1.15rem;
        }

        .tr-checklist-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 0.85rem;
          padding-bottom: 0.65rem;
          border-bottom: 1px solid var(--border, #e5e7eb);
        }

        .tr-checklist-title {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          font-size: 0.82rem;
          font-weight: 800;
          color: var(--ios-text, #111827);
        }

        .tr-checklist-progress {
          font-size: 0.74rem;
          font-weight: 700;
          color: var(--ios-olive, #4b6b32);
          background: rgba(75, 107, 50, 0.1);
          padding: 0.15rem 0.5rem;
          border-radius: 999px;
        }

        .tr-checklist-items {
          display: flex;
          flex-direction: column;
          gap: 0.55rem;
        }

        .tr-check-row {
          display: flex;
          align-items: flex-start;
          gap: 0.65rem;
          padding: 0.45rem 0.65rem;
          border-radius: 8px;
          cursor: pointer;
          transition: background 0.12s ease;
          user-select: none;
        }

        .tr-check-row:hover {
          background: var(--surface-alt, #f9fafb);
        }

        .tr-check-row input[type="checkbox"] {
          display: none;
        }

        .tr-check-box-fake {
          width: 18px;
          height: 18px;
          border-radius: 5px;
          border: 1.5px solid var(--border-strong, #9ca3af);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          margin-top: 1px;
          color: #ffffff;
          transition: all 0.15s ease;
        }

        .tr-check-row.checked .tr-check-box-fake {
          background: var(--ios-olive, #4b6b32);
          border-color: var(--ios-olive, #4b6b32);
        }

        .tr-check-label {
          font-size: 0.8rem;
          line-height: 1.42;
          color: var(--ios-text, #374151);
        }

        .tr-check-row.checked .tr-check-label {
          color: var(--text-secondary, #9ca3af);
          text-decoration: line-through;
        }

        /* Action Launch Box */
        .tr-action-box {
          background: linear-gradient(135deg, #132a17 0%, #1e3f23 100%);
          color: #ffffff;
          border-radius: 14px;
          padding: 1.25rem;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          gap: 1rem;
        }

        .tr-action-content {
          display: flex;
          align-items: flex-start;
          gap: 0.85rem;
        }

        .tr-action-icon-wrap {
          width: 42px;
          height: 42px;
          border-radius: 10px;
          background: rgba(217, 249, 157, 0.15);
          color: #d9f99d;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .tr-action-title {
          font-size: 0.98rem;
          font-weight: 800;
          color: #ffffff;
          margin: 0 0 0.25rem;
        }

        .tr-action-desc {
          margin: 0;
          font-size: 0.78rem;
          line-height: 1.42;
          color: rgba(255, 255, 255, 0.82);
        }

        .tr-action-desc strong {
          color: #d9f99d;
        }

        .tr-action-buttons {
          display: flex;
          flex-direction: column;
          gap: 0.55rem;
        }

        .tr-btn-primary {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.45rem;
          background: #d9f99d;
          color: #132a17;
          border: none;
          border-radius: 9px;
          padding: 0.65rem 1rem;
          font-size: 0.82rem;
          font-weight: 800;
          text-decoration: none;
          cursor: pointer;
          transition: transform 0.15s ease, opacity 0.15s ease;
        }

        .tr-btn-primary:hover {
          transform: translateY(-1px);
          opacity: 0.95;
        }

        .tr-btn-secondary {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.35rem;
          background: rgba(255, 255, 255, 0.1);
          color: rgba(255, 255, 255, 0.9);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 9px;
          padding: 0.5rem 0.85rem;
          font-size: 0.75rem;
          font-weight: 700;
          cursor: pointer;
          transition: background 0.15s ease;
        }

        .tr-btn-secondary:hover {
          background: rgba(255, 255, 255, 0.18);
        }

        @media (max-width: 900px) {
          .tr-pillars-grid {
            grid-template-columns: 1fr;
          }
          .tr-bottom-split {
            grid-template-columns: 1fr;
          }
        }
      `}} />
    </div>
  );
};
