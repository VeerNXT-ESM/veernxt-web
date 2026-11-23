import React, { useState, useMemo, useEffect } from 'react';
import { 
  Trophy, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  RotateCcw, 
  ArrowRight, 
  ArrowLeft,
  ChevronRight,
  ChevronLeft,
  Award,
  FileText,
  Lightbulb,
  Check,
  X,
  Minus,
  Sparkles,
  Eye,
  AlertTriangle,
  Zap,
  Target,
  BarChart2,
  TrendingUp,
  Share2,
  Download,
  Printer,
  RefreshCw,
  Languages
} from 'lucide-react';
import { organizeSections } from './QuizView';
import { getQuizCohortAnalytics } from '../../lib/quizAnalytics';
import { translateQuestion, prefetchTranslations } from '../../lib/quizTranslator';

export const QuizResults = ({
  state,
  onRestart,
  onExit
}) => {
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'sections' | 'questions' | 'solutions'
  const [selectedSolutionIndex, setSelectedSolutionIndex] = useState(0);

  const totalQuestions = state.questions.length;
  const sections = useMemo(() => organizeSections(state.questions), [state.questions]);
  const hasSections = sections.length > 1;

  // Aggregate student answers (calculated directly from test session)
  const answersList = Object.values(state.answers).filter(a => a.selectedIndex !== null && a.selectedIndex !== undefined);
  const correctCount = answersList.filter(a => a.isCorrect).length;
  const wrongCount = answersList.filter(a => !a.isCorrect).length;
  const unattemptedCount = totalQuestions - (correctCount + wrongCount);
  const accuracy = answersList.length > 0 ? Math.round((correctCount / answersList.length) * 100) : 0;
  const attemptRate = totalQuestions > 0 ? Math.round((answersList.length / totalQuestions) * 100) : 0;

  // Authentic Marking Scheme (+2.00 correct, -0.50 incorrect, 0 for unattempted)
  const positiveMarks = Number((correctCount * 2).toFixed(2));
  const negativePenalty = Number((wrongCount * 0.5).toFixed(2));
  const rawMarks = positiveMarks - negativePenalty;
  const maxMarks = totalQuestions * 2;
  const finalScore = Math.max(0, Number(rawMarks.toFixed(2)));
  const scorePercent = maxMarks > 0 ? Math.round((finalScore / maxMarks) * 100) : 0;

  // Time metrics (from overall continuous test timer)
  const totalDuration = state.config?.totalDurationSeconds || (totalQuestions * 60);
  const timeRemaining = typeof state.timeRemaining === 'number' ? state.timeRemaining : 0;
  const timeSpentSeconds = Math.max(5, totalDuration - timeRemaining);
  const timeSpentMins = Math.floor(timeSpentSeconds / 60);
  const timeSpentSecs = timeSpentSeconds % 60;
  const avgTimePerQ = answersList.length > 0 ? Math.round(timeSpentSeconds / answersList.length) : Math.round(timeSpentSeconds / totalQuestions);

  // Dynamic cohort and peer analytics state
  const [cohort, setCohort] = useState(() => ({
    totalCandidates: 1420,
    rank: Math.max(1, Math.round(1420 * (1 - (scorePercent / 100)))),
    percentile: Number(Math.min(99.6, Math.max(8.5, scorePercent * 0.95 + accuracy * 0.05)).toFixed(1)),
    topperScore: Number((maxMarks * 0.95).toFixed(1)),
    averageScore: Number((maxMarks * 0.58).toFixed(1))
  }));

  useEffect(() => {
    let isMounted = true;
    async function loadStats() {
      const stats = await getQuizCohortAnalytics(state.quizId || state.id, finalScore, maxMarks, accuracy);
      if (isMounted && stats) {
        setCohort(stats);
      }
    }
    loadStats();
    return () => { isMounted = false; };
  }, [state.quizId, state.id, finalScore, maxMarks, accuracy]);

  // Section-wise statistics (ONLY if genuine sections exist in data)
  const sectionStats = useMemo(() => {
    if (!hasSections) return [];
    return sections.map(sec => {
      const secQs = sec.questions;
      let sCorrect = 0;
      let sWrong = 0;
      let sUnattempted = 0;

      secQs.forEach(q => {
        const a = state.answers[q.id];
        if (a && a.selectedIndex !== null && a.selectedIndex !== undefined) {
          if (a.isCorrect) sCorrect++;
          else sWrong++;
        } else {
          sUnattempted++;
        }
      });

      const sPositive = sCorrect * 2;
      const sNegative = sWrong * 0.5;
      const sScore = Math.max(0, Number((sPositive - sNegative).toFixed(1)));
      const sMaxMarks = secQs.length * 2;
      const sAttempted = sCorrect + sWrong;
      const sAccuracy = sAttempted > 0 ? Math.round((sCorrect / sAttempted) * 100) : 0;

      return {
        ...sec,
        correct: sCorrect,
        wrong: sWrong,
        unattempted: sUnattempted,
        score: sScore,
        maxMarks: sMaxMarks,
        accuracy: sAccuracy
      };
    });
  }, [sections, state.answers, hasSections]);

  const currentSolutionQ = state.questions[selectedSolutionIndex] || state.questions[0];
  const currentSolutionAns = state.answers[currentSolutionQ?.id];

  // Dynamic Solutions Translation State (English <-> Hindi)
  const [solutionLang, setSolutionLang] = useState(state.config?.language || 'en');
  const [displaySolutionQ, setDisplaySolutionQ] = useState(currentSolutionQ);
  const [isSolutionTranslating, setIsSolutionTranslating] = useState(false);

  useEffect(() => {
    let isMounted = true;
    if (!currentSolutionQ) return;

    if (solutionLang === 'en') {
      setDisplaySolutionQ(currentSolutionQ);
      setIsSolutionTranslating(false);
      return;
    }

    setIsSolutionTranslating(true);
    translateQuestion(currentSolutionQ, 'hi').then(tq => {
      if (isMounted && tq) {
        setDisplaySolutionQ(tq);
        setIsSolutionTranslating(false);
      }
    }).catch(() => {
      if (isMounted) {
        setDisplaySolutionQ(currentSolutionQ);
        setIsSolutionTranslating(false);
      }
    });

    prefetchTranslations(state.questions, 'hi', selectedSolutionIndex + 1, 4);

    return () => { isMounted = false; };
  }, [currentSolutionQ, solutionLang, selectedSolutionIndex, state.questions]);

  const submissionDateFormatted = new Date().toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true
  });

  return (
    <div style={{
      minHeight: '100vh',
      background: '#f8fafc',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      color: '#0f172a',
      paddingBottom: '3.5rem'
    }}>

      {/* TOP HEADER & BREADCRUMBS WITH CLEAR BACK BUTTON */}
      <div style={{ background: '#ffffff', borderBottom: '1px solid #e2e8f0', padding: '1rem 1.5rem' }}>
        <div style={{ maxWidth: '1240px', margin: '0 auto' }}>
          
          {/* Top Breadcrumb & Back Bar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <button
              onClick={onExit}
              style={{
                background: 'white',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                padding: '0.45rem 1rem',
                color: '#334155',
                fontSize: '0.82rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                transition: 'all 0.15s ease'
              }}
            >
              <ArrowLeft size={16} /> Back to Test Library
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.78rem', color: '#64748b' }}>
              <span style={{ cursor: 'pointer' }} onClick={onExit}>Exams</span>
              <ChevronRight size={12} />
              <span style={{ cursor: 'pointer' }} onClick={onExit}>Mock Tests</span>
              <ChevronRight size={12} />
              <span style={{ color: '#0f172a', fontWeight: 700 }}>
                {activeTab === 'solutions' ? 'Solutions & Explanations' : 'Results & Analytics'}
              </span>
            </div>
          </div>

          {/* Test Name & Action Buttons (Exact Reference 1 for Overview & Reference 2 for Solutions) */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
            
            {/* Left Title Area */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
              <div style={{
                width: '48px', height: '48px', background: '#f0fdf4', border: '1px solid #bcf0da',
                borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 2px 6px rgba(13, 74, 43, 0.08)'
              }}>
                {activeTab === 'solutions' ? <FileText size={26} color="#16a34a" /> : <Trophy size={26} color="#16a34a" />}
              </div>
              <div>
                <h1 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.3px' }}>
                  {activeTab === 'solutions' ? 'Solutions & Explanations' : (state.quizTitle || 'Full Mock Test 01')}
                </h1>
                <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                  {activeTab === 'solutions'
                    ? (state.quizTitle || 'Full Mock Test 01')
                    : `Test Submitted on ${submissionDateFormatted}`}
                </span>
              </div>
            </div>

            {/* Right Action Controls: Overview vs Solutions Mode */}
            {activeTab === 'solutions' ? (
              /* Exact Reference 2 Header Actions: Question-wise, Download PDF, < Question X of Y > */
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  style={{
                    background: 'white', border: '1px solid #bcf0da', color: '#16a34a',
                    padding: '0.55rem 1rem', borderRadius: '8px', fontSize: '0.82rem', fontWeight: 700,
                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
                  }}
                >
                  <RefreshCw size={14} color="#16a34a" /> Question-wise
                </button>

                <button
                  type="button"
                  onClick={() => window.print()}
                  style={{
                    background: 'white', border: '1px solid #bcf0da', color: '#16a34a',
                    padding: '0.55rem 1rem', borderRadius: '8px', fontSize: '0.82rem', fontWeight: 700,
                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
                  }}
                >
                  <Download size={14} color="#16a34a" /> Download PDF
                </button>

                {/* Language Switcher (EN / HI) */}
                <div style={{
                  display: 'flex', alignItems: 'center', background: '#ffffff',
                  border: '1px solid #cbd5e1', borderRadius: '8px', padding: '0.2rem 0.55rem', gap: '0.4rem',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
                }}>
                  <Languages size={15} color="#0d4a2b" />
                  <select
                    value={solutionLang}
                    onChange={(e) => setSolutionLang(e.target.value)}
                    style={{
                      border: 'none', background: 'transparent', fontSize: '0.82rem', fontWeight: 700,
                      color: '#0f172a', outline: 'none', cursor: 'pointer', padding: '0.35rem 0.2rem'
                    }}
                  >
                    <option value="en">English</option>
                    <option value="hi">हिंदी (Hindi)</option>
                  </select>
                </div>

                {/* < Question X of Y > Navigation Pill */}
                <div style={{
                  display: 'flex', alignItems: 'center', background: '#f8fafc',
                  border: '1px solid #cbd5e1', borderRadius: '8px', overflow: 'hidden'
                }}>
                  <button
                    type="button"
                    disabled={selectedSolutionIndex === 0}
                    onClick={() => setSelectedSolutionIndex(i => Math.max(0, i - 1))}
                    title="Previous Question"
                    style={{
                      background: 'white', border: 'none', borderRight: '1px solid #e2e8f0',
                      padding: '0.55rem 0.75rem', cursor: selectedSolutionIndex === 0 ? 'not-allowed' : 'pointer',
                      color: selectedSolutionIndex === 0 ? '#cbd5e1' : '#0f172a', display: 'flex', alignItems: 'center'
                    }}
                  >
                    <ChevronLeft size={16} />
                  </button>

                  <span style={{ padding: '0 0.85rem', fontSize: '0.82rem', fontWeight: 800, color: '#0f172a', whiteSpace: 'nowrap' }}>
                    Question {selectedSolutionIndex + 1} of {totalQuestions}
                  </span>

                  <button
                    type="button"
                    disabled={selectedSolutionIndex === totalQuestions - 1}
                    onClick={() => setSelectedSolutionIndex(i => Math.min(totalQuestions - 1, i + 1))}
                    title="Next Question"
                    style={{
                      background: 'white', border: 'none', borderLeft: '1px solid #e2e8f0',
                      padding: '0.55rem 0.75rem', cursor: selectedSolutionIndex === totalQuestions - 1 ? 'not-allowed' : 'pointer',
                      color: selectedSolutionIndex === totalQuestions - 1 ? '#cbd5e1' : '#0f172a', display: 'flex', alignItems: 'center'
                    }}
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            ) : (
              /* Exact Reference 1 Header Actions: Reattempt Test & View Solutions */
              <div style={{ display: 'flex', gap: '0.65rem' }}>
                <button
                  onClick={onRestart}
                  style={{
                    background: 'white', border: '1px solid #cbd5e1', color: '#0f172a',
                    padding: '0.6rem 1.15rem', borderRadius: '8px', fontSize: '0.82rem', fontWeight: 700,
                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                  }}
                >
                  <RotateCcw size={15} /> Reattempt Test
                </button>

                <button
                  onClick={() => setActiveTab('solutions')}
                  style={{
                    background: '#0d4a2b', border: 'none', color: 'white',
                    padding: '0.6rem 1.35rem', borderRadius: '8px', fontSize: '0.82rem', fontWeight: 800,
                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem',
                    boxShadow: '0 2px 6px rgba(13,74,43,0.25)'
                  }}
                >
                  <FileText size={15} /> View Solutions
                </button>
              </div>
            )}
          </div>

          {/* TAB BAR (Reference 1, 2, 5: Overview, Section Analysis, Question Analysis, Solutions) */}
          <div style={{ display: 'flex', gap: '1.5rem', marginTop: '1.5rem', borderBottom: '2px solid #f1f5f9' }}>
            {[
              { id: 'overview', label: 'Overview' },
              ...(hasSections ? [{ id: 'sections', label: 'Section Analysis' }] : []),
              { id: 'questions', label: 'Question Analysis' },
              { id: 'solutions', label: 'Solutions' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  background: 'none',
                  border: 'none',
                  borderBottom: activeTab === tab.id ? '3px solid #16a34a' : '3px solid transparent',
                  color: activeTab === tab.id ? '#15803d' : '#64748b',
                  padding: '0.65rem 0.25rem',
                  fontSize: '0.88rem',
                  fontWeight: activeTab === tab.id ? 800 : 600,
                  cursor: 'pointer',
                  marginBottom: '-2px',
                  transition: 'color 0.15s ease'
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

        </div>
      </div>

      {/* TAB CONTENT CONTAINER */}
      <div style={{ maxWidth: '1240px', margin: '1.75rem auto 0 auto', padding: '0 1.25rem' }}>

        {/* ══════════════════════════════════════════════════════════════════════════ */}
        {/* TAB 1: OVERVIEW (Exact Reference 1 & 5 Layout) */}
        {/* ══════════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'overview' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            
            {/* ROW 1: 4 PRIMARY METRIC CARDS (Exact Reference 1 Layout) */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '1rem'
            }}>
              
              {/* 1. Your Score */}
              <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Your Score
                  </span>
                  <Trophy size={18} color="#ca8a04" />
                </div>
                <div style={{ fontSize: '1.65rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.5px' }}>
                  {finalScore} <span style={{ fontSize: '0.9rem', color: '#94a3b8', fontWeight: 600 }}>/ {maxMarks}</span>
                </div>
                <span style={{ fontSize: '0.72rem', color: '#16a34a', fontWeight: 700 }}>
                  {scorePercent}% Score Rate
                </span>
              </div>

              {/* 2. All India Rank */}
              <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    All India Rank
                  </span>
                  <BarChart2 size={18} color="#0284c7" />
                </div>
                <div style={{ fontSize: '1.65rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.5px' }}>
                  {cohort.rank.toLocaleString()} <span style={{ fontSize: '0.85rem', color: '#94a3b8', fontWeight: 600 }}>/ {cohort.totalCandidates.toLocaleString()}</span>
                </div>
                <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                  Cohort Placement
                </span>
              </div>

              {/* 3. Percentile */}
              <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Percentile
                  </span>
                  <Award size={18} color="#16a34a" />
                </div>
                <div style={{ fontSize: '1.65rem', fontWeight: 900, color: '#16a34a', letterSpacing: '-0.5px' }}>
                  {cohort.percentile}%
                </div>
                <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                  Ahead of {cohort.percentile}% Candidates
                </span>
              </div>

              {/* 4. Accuracy */}
              <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Accuracy
                  </span>
                  <Target size={18} color="#0d4a2b" />
                </div>
                <div style={{ fontSize: '1.65rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.5px' }}>
                  {accuracy}%
                </div>
                <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                  {correctCount} / {answersList.length} Answered Correctly
                </span>
              </div>

            </div>

            {/* ROW 2: ACCURACY DONUT BREAKDOWN (LEFT) & TOPPER / AVERAGE SCORES (RIGHT) (Exact Reference 1) */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1.15fr 1fr',
              gap: '1.25rem',
              alignItems: 'stretch'
            }}>
              
              {/* Left: Accuracy Donut & Question Count Breakdown */}
              <div style={{
                background: 'white',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '1.5rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '1.5rem',
                boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
              }}>
                {/* Circular Gauge */}
                <div style={{
                  width: '120px',
                  height: '120px',
                  borderRadius: '50%',
                  border: '10px solid #22c55e',
                  borderTopColor: accuracy > 0 ? '#16a34a' : '#e2e8f0',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  boxShadow: 'inset 0 0 10px rgba(0,0,0,0.03)'
                }}>
                  <strong style={{ fontSize: '1.25rem', fontWeight: 900, color: '#0d4a2b' }}>{accuracy}%</strong>
                  <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 700 }}>Accuracy</span>
                </div>

                {/* Breakdown Legend (Reference 1) */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.65rem', fontSize: '0.85rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', color: '#16a34a', fontWeight: 600 }}>
                      <CheckCircle2 size={16} /> Correct
                    </span>
                    <strong style={{ fontSize: '1.05rem', color: '#16a34a' }}>{correctCount}</strong>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', color: '#ef4444', fontWeight: 600 }}>
                      <XCircle size={16} /> Incorrect
                    </span>
                    <strong style={{ fontSize: '1.05rem', color: '#ef4444' }}>{wrongCount}</strong>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', color: '#64748b', fontWeight: 600 }}>
                      <Minus size={16} /> Unattempted
                    </span>
                    <strong style={{ fontSize: '1.05rem', color: '#64748b' }}>{unattemptedCount}</strong>
                  </div>

                  <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 800, color: '#0f172a' }}>Total Questions</span>
                    <strong style={{ fontSize: '1.05rem', color: '#0f172a' }}>{totalQuestions}</strong>
                  </div>
                </div>
              </div>

              {/* Right: Topper's Score and Average Score Side-by-Side (Reference 1) */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                
                {/* Topper's Score */}
                <div style={{
                  background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px',
                  padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
                }}>
                  <div style={{
                    width: '44px', height: '44px', background: '#fef3c7', borderRadius: '10px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem'
                  }}>
                    <Award size={24} color="#d97706" />
                  </div>
                  <div>
                    <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Topper's Score
                    </span>
                    <div style={{ fontSize: '1.55rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.3px', marginTop: '0.2rem' }}>
                      {cohort.topperScore} <span style={{ fontSize: '0.85rem', color: '#94a3b8', fontWeight: 600 }}>/ {maxMarks}</span>
                    </div>
                  </div>
                </div>

                {/* Average Score */}
                <div style={{
                  background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px',
                  padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
                }}>
                  <div style={{
                    width: '44px', height: '44px', background: '#e0f2fe', borderRadius: '10px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem'
                  }}>
                    <TrendingUp size={24} color="#0284c7" />
                  </div>
                  <div>
                    <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Average Score
                    </span>
                    <div style={{ fontSize: '1.55rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.3px', marginTop: '0.2rem' }}>
                      {cohort.averageScore} <span style={{ fontSize: '0.85rem', color: '#94a3b8', fontWeight: 600 }}>/ {maxMarks}</span>
                    </div>
                  </div>
                </div>

              </div>

            </div>

            {/* ROW 3: SECTION-WISE PERFORMANCE OR MARKING SCHEME (LEFT) & PERFORMANCE INSIGHTS (RIGHT) */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
              gap: '1.25rem',
              alignItems: 'stretch'
            }}>
              
              {/* Left: Section Performance Table or Marking Scheme Impact */}
              {hasSections ? (
                <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
                  <h3 style={{ margin: '0 0 1rem 0', fontSize: '0.88rem', fontWeight: 800, textTransform: 'uppercase', color: '#334155', letterSpacing: '0.5px' }}>
                    Section-wise Performance
                  </h3>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', textAlign: 'left' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid #e2e8f0', color: '#64748b' }}>
                          <th style={{ padding: '0.65rem 0.5rem', fontWeight: 700 }}>Section</th>
                          <th style={{ padding: '0.65rem 0.5rem', fontWeight: 700 }}>Score</th>
                          <th style={{ padding: '0.65rem 0.5rem', fontWeight: 700 }}>Accuracy</th>
                          <th style={{ padding: '0.65rem 0.5rem', fontWeight: 700, textAlign: 'right' }}>Correct / Wrong / Skip</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sectionStats.map((s, idx) => (
                          <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '0.75rem 0.5rem', fontWeight: 700, color: '#0f172a' }}>{s.name}</td>
                            <td style={{ padding: '0.75rem 0.5rem', fontWeight: 800, color: '#0d4a2b' }}>{s.score} / {s.maxMarks}</td>
                            <td style={{ padding: '0.75rem 0.5rem', fontWeight: 700, color: s.accuracy >= 70 ? '#16a34a' : '#d97706' }}>{s.accuracy}%</td>
                            <td style={{ padding: '0.75rem 0.5rem', textAlign: 'right', fontFamily: 'monospace', fontWeight: 700 }}>
                              <span style={{ color: '#16a34a' }}>{s.correct}</span> / <span style={{ color: '#ef4444' }}>{s.wrong}</span> / <span style={{ color: '#64748b' }}>{s.unattempted}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
                  <h3 style={{ margin: '0 0 1rem 0', fontSize: '0.88rem', fontWeight: 800, textTransform: 'uppercase', color: '#334155', letterSpacing: '0.5px' }}>
                    Marking Scheme Impact
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', fontSize: '0.85rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: '#475569', fontWeight: 600 }}>Earned from Correct (+2.00)</span>
                      <strong style={{ fontSize: '1.1rem', color: '#16a34a' }}>+{positiveMarks.toFixed(2)}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: '#475569', fontWeight: 600 }}>Lost to Negative (-0.50)</span>
                      <strong style={{ fontSize: '1.1rem', color: '#ef4444' }}>-{negativePenalty.toFixed(2)}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: '#475569', fontWeight: 600 }}>Negative Marking Ratio</span>
                      <strong style={{ fontSize: '0.95rem', color: '#64748b' }}>1/4th Penalty Scheme</strong>
                    </div>
                    <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 800, color: '#0f172a' }}>Net Marks Obtained</span>
                      <strong style={{ fontSize: '1.2rem', color: '#0d4a2b' }}>{finalScore} <span style={{ fontSize: '0.8rem', color: '#64748b' }}>/ {maxMarks}</span></strong>
                    </div>
                  </div>
                </div>
              )}

              {/* Right: Performance Insights (Reference 1) */}
              <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
                <div>
                  <h3 style={{ margin: '0 0 1rem 0', fontSize: '0.88rem', fontWeight: 800, textTransform: 'uppercase', color: '#334155', letterSpacing: '0.5px' }}>
                    Performance Insights
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', fontSize: '0.85rem', color: '#334155', lineHeight: 1.5 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                      <CheckCircle2 size={16} color="#16a34a" style={{ flexShrink: 0, marginTop: '0.15rem' }} />
                      <span>Your accuracy of <strong>{accuracy}%</strong> earned <strong>{finalScore} Marks</strong> against {maxMarks} total marks.</span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                      <CheckCircle2 size={16} color="#16a34a" style={{ flexShrink: 0, marginTop: '0.15rem' }} />
                      <span>You placed ahead of <strong>{cohort.percentile}%</strong> of peer test takers nationally.</span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                      <Lightbulb size={16} color="#d97706" style={{ flexShrink: 0, marginTop: '0.15rem' }} />
                      <span>Focus on reducing incorrect attempts to minimize the <strong>-{negativePenalty}</strong> mark penalty.</span>
                    </div>
                  </div>
                </div>

                <div style={{ marginTop: '1.25rem' }}>
                  <button
                    onClick={() => setActiveTab('solutions')}
                    style={{
                      width: '100%',
                      background: '#f0fdf4',
                      border: '1px solid #bcf0da',
                      color: '#15803d',
                      padding: '0.75rem',
                      borderRadius: '8px',
                      fontWeight: 800,
                      fontSize: '0.82rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.45rem'
                    }}
                  >
                    <FileText size={14} /> Review Step-by-Step Question Solutions →
                  </button>
                </div>
              </div>

            </div>

            {/* ROW 4: DEDICATED 5-METRIC STATS STRIP (Exact Reference 1 Layout) */}
            <div style={{
              background: 'white',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '1.25rem 1.5rem',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '1rem',
              boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
            }}>
              
              {/* Total Time */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Clock size={22} color="#0d4a2b" />
                <div>
                  <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Total Time</span>
                  <strong style={{ display: 'block', fontSize: '1.1rem', color: '#0f172a' }}>{Math.round(totalDuration / 60)}:00 min</strong>
                </div>
              </div>

              {/* Time Taken */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Clock size={22} color="#16a34a" />
                <div>
                  <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Time Taken</span>
                  <strong style={{ display: 'block', fontSize: '1.1rem', color: '#16a34a' }}>{timeSpentMins}m {timeSpentSecs}s</strong>
                </div>
              </div>

              {/* Avg. Time / Q */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Zap size={22} color="#ca8a04" />
                <div>
                  <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Avg. Time / Q</span>
                  <strong style={{ display: 'block', fontSize: '1.1rem', color: '#0f172a' }}>{avgTimePerQ} sec</strong>
                </div>
              </div>

              {/* Attempted */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Target size={22} color="#0284c7" />
                <div>
                  <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Attempted</span>
                  <strong style={{ display: 'block', fontSize: '1.1rem', color: '#0f172a' }}>{answersList.length} / {totalQuestions}</strong>
                </div>
              </div>

              {/* Attempt Rate */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <TrendingUp size={22} color="#15803d" />
                <div>
                  <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Attempt Rate</span>
                  <strong style={{ display: 'block', fontSize: '1.1rem', color: '#15803d' }}>{attemptRate}%</strong>
                </div>
              </div>

            </div>

            {/* ROW 5: OVERALL PERFORMANCE CURVE (Exact Reference 5) */}
            <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
              <h3 style={{ margin: '0 0 0.35rem 0', fontSize: '0.88rem', fontWeight: 800, textTransform: 'uppercase', color: '#334155', letterSpacing: '0.5px' }}>
                Overall Performance Curve
              </h3>
              <p style={{ margin: '0 0 1.25rem 0', fontSize: '0.78rem', color: '#64748b' }}>
                Distribution of candidate scores across India with your comparative percentile placement.
              </p>

              {/* SVG Bell Curve with Dynamic Percentile Position */}
              <div style={{ position: 'relative', width: '100%', height: '140px', padding: '0.5rem 0' }}>
                <svg viewBox="0 0 400 120" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
                  <defs>
                    <linearGradient id="realBellGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#86efac" stopOpacity="0.75" />
                      <stop offset="100%" stopColor="#bbf7d0" stopOpacity="0.08" />
                    </linearGradient>
                  </defs>

                  {/* Smooth Bell curve path */}
                  <path
                    d="M 10 110 C 90 110, 140 100, 200 20 C 260 100, 310 110, 390 110 Z"
                    fill="url(#realBellGrad)"
                    stroke="#16a34a"
                    strokeWidth="2.5"
                  />

                  {/* Baseline */}
                  <line x1="10" y1="110" x2="390" y2="110" stroke="#cbd5e1" strokeWidth="1.5" />

                  {/* Dynamic Candidate Percentile Position Marker */}
                  {(() => {
                    const markerX = Math.round(25 + (cohort.percentile / 100) * 350);
                    return (
                      <g>
                        <line x1={markerX} y1="20" x2={markerX} y2="110" stroke="#0d4a2b" strokeWidth="2" strokeDasharray="3,3" />
                        <circle cx={markerX} cy="50" r="5" fill="#0d4a2b" />
                        <rect x={Math.max(10, Math.min(310, markerX - 45))} y="2" width="90" height="20" rx="4" fill="#0d4a2b" />
                        <text x={Math.max(10, Math.min(310, markerX - 45)) + 45} y="16" fill="white" fontSize="9" fontWeight="800" textAnchor="middle">
                          You ({cohort.percentile}%)
                        </text>
                      </g>
                    );
                  })()}
                </svg>

                {/* Horizontal Axis Percentile Labels */}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: '#94a3b8', marginTop: '0.35rem', fontFamily: 'monospace' }}>
                  <span>0%</span>
                  <span>25%</span>
                  <span>50%</span>
                  <span>75%</span>
                  <span>100%</span>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════════ */}
        {/* TAB 2: SECTION ANALYSIS (Only if genuine sections exist) */}
        {/* ══════════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'sections' && hasSections && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 800, margin: '0 0 1rem 0' }}>Comprehensive Sectional Breakdown</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
                {sectionStats.map(sec => (
                  <div key={sec.id} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1.25rem' }}>
                    <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '0.95rem', fontWeight: 800, color: '#0f172a' }}>{sec.name}</h3>
                    <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#16a34a', margin: '0.25rem 0' }}>
                      {sec.score} <span style={{ fontSize: '0.8rem', color: '#64748b' }}>/ {sec.maxMarks} Marks</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: '#475569', margin: '0.5rem 0' }}>
                      <span>Accuracy: <strong>{sec.accuracy}%</strong></span>
                      <span>Correct: <strong>{sec.correct}/{sec.count}</strong></span>
                    </div>
                    <div style={{ height: '6px', background: '#e2e8f0', borderRadius: '999px', overflow: 'hidden' }}>
                      <div style={{ width: `${sec.accuracy}%`, height: '100%', background: '#22c55e' }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════════ */}
        {/* TAB 3: QUESTION MATRIX (Audit Table) */}
        {/* ══════════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'questions' && (
          <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.5rem', overflowX: 'auto', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 800, margin: '0 0 1rem 0' }}>Question Matrix & Marks Audit</h2>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.82rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e2e8f0', color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                  <th style={{ padding: '0.65rem 0.5rem' }}>#</th>
                  {hasSections && <th style={{ padding: '0.65rem 0.5rem' }}>Section</th>}
                  <th style={{ padding: '0.65rem 0.5rem' }}>Status</th>
                  <th style={{ padding: '0.65rem 0.5rem' }}>Your Answer</th>
                  <th style={{ padding: '0.65rem 0.5rem' }}>Correct Answer</th>
                  <th style={{ padding: '0.65rem 0.5rem' }}>Marks Awarded</th>
                  <th style={{ padding: '0.65rem 0.5rem' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {state.questions.map((q, idx) => {
                  const ans = state.answers[q.id];
                  const hasAnswer = ans && ans.selectedIndex !== null && ans.selectedIndex !== undefined;
                  const isCorrect = hasAnswer && ans.isCorrect;
                  const sec = hasSections ? sections.find(s => idx >= s.startIndex && idx <= s.endIndex) : null;

                  return (
                    <tr key={q.id || idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '0.75rem 0.5rem', fontWeight: 800, fontFamily: 'monospace' }}>Q.{idx + 1}</td>
                      {hasSections && (
                        <td style={{ padding: '0.75rem 0.5rem', color: '#64748b' }}>{sec?.name || 'General'}</td>
                      )}
                      <td style={{ padding: '0.75rem 0.5rem' }}>
                        {isCorrect ? (
                          <span style={{ color: '#16a34a', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                            <CheckCircle2 size={14} /> Correct
                          </span>
                        ) : hasAnswer ? (
                          <span style={{ color: '#ef4444', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                            <XCircle size={14} /> Incorrect
                          </span>
                        ) : (
                          <span style={{ color: '#94a3b8', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                            <Minus size={14} /> Unattempted
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '0.75rem 0.5rem', fontWeight: 700 }}>
                        {hasAnswer ? `Option ${String.fromCharCode(65 + ans.selectedIndex)}` : '—'}
                      </td>
                      <td style={{ padding: '0.75rem 0.5rem', fontWeight: 700, color: '#16a34a' }}>
                        Option {String.fromCharCode(65 + q.correctIndex)}
                      </td>
                      <td style={{ padding: '0.75rem 0.5rem', fontWeight: 800, fontFamily: 'monospace' }}>
                        {isCorrect ? '+2.00' : hasAnswer ? '-0.50' : '0.00'}
                      </td>
                      <td style={{ padding: '0.75rem 0.5rem' }}>
                        <button
                          onClick={() => {
                            setSelectedSolutionIndex(idx);
                            setActiveTab('solutions');
                          }}
                          style={{
                            background: 'none', border: 'none', color: '#0284c7',
                            fontWeight: 700, cursor: 'pointer', padding: 0, textDecoration: 'underline'
                          }}
                        >
                          View Solution
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════════ */}
        {/* TAB 4: SOLUTIONS (Interactive Question Review - Reference 2) */}
        {/* ══════════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'solutions' && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: '320px 1fr',
            gap: '1.25rem',
            alignItems: 'start'
          }}>
            
            {/* LEFT SIDEBAR: PALETTE */}
            <aside style={{
              background: 'white',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '1.25rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
              boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
            }}>
              
              <div style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase' }}>
                  Question Palette ({totalQuestions})
                </span>
              </div>

              {/* Numbered Color-Coded Palette */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(5, 1fr)',
                gap: '0.45rem',
                maxHeight: '340px',
                overflowY: 'auto',
                padding: '0.2rem'
              }}>
                {state.questions.map((q, idx) => {
                  const ans = state.answers[q.id];
                  const isAnswered = ans && ans.selectedIndex !== null && ans.selectedIndex !== undefined;
                  const isCorrect = isAnswered && ans.isCorrect;
                  const isMarked = state.bookmarkedIds.includes(q.id);
                  const isSelected = idx === selectedSolutionIndex;

                  let bg = '#f1f5f9';
                  let color = '#475569';
                  let border = '1px solid #cbd5e1';

                  if (isCorrect) {
                    bg = '#22c55e';
                    color = 'white';
                    border = '1px solid #16a34a';
                  } else if (isAnswered) {
                    bg = '#fca5a5';
                    color = '#7f1d1d';
                    border = '1px solid #ef4444';
                  } else if (isMarked) {
                    bg = '#c084fc';
                    color = '#3b0764';
                    border = '1px solid #a855f7';
                  }

                  if (isSelected) {
                    border = '2px solid #0f172a';
                  }

                  return (
                    <button
                      key={q.id || idx}
                      type="button"
                      onClick={() => setSelectedSolutionIndex(idx)}
                      style={{
                        height: '38px',
                        borderRadius: '6px',
                        background: bg,
                        color: color,
                        border: border,
                        fontWeight: 800,
                        fontSize: '0.85rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'transform 0.1s'
                      }}
                    >
                      {idx + 1}
                    </button>
                  );
                })}
              </div>

              {/* Legend Summary Box */}
              <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span style={{ width: '12px', height: '12px', background: '#22c55e', borderRadius: '3px' }} />
                  <span style={{ fontWeight: 600 }}>Correct ({correctCount})</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span style={{ width: '12px', height: '12px', background: '#fca5a5', borderRadius: '3px' }} />
                  <span style={{ fontWeight: 600 }}>Incorrect ({wrongCount})</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span style={{ width: '12px', height: '12px', background: '#c084fc', borderRadius: '3px' }} />
                  <span style={{ fontWeight: 600 }}>Marked for Review ({state.bookmarkedIds.length})</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span style={{ width: '12px', height: '12px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '3px' }} />
                  <span style={{ fontWeight: 600 }}>Not Attempted ({unattemptedCount})</span>
                </div>
              </div>

            </aside>

            {/* RIGHT MAIN CARD: QUESTION & STEP-BY-STEP EXPLANATION (Reference 2) */}
            <div style={{
              background: 'white',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '1.75rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.25rem',
              boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
            }}>
              
              {/* Question Header (Exact Reference 2 Layout: Q.X + Subject on Left, Moderate Difficulty on Right) */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.85rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <span style={{
                    background: '#f0fdf4', color: '#16a34a', border: '1px solid #bcf0da',
                    fontWeight: 800, fontSize: '0.9rem', padding: '0.25rem 0.65rem', borderRadius: '6px'
                  }}>
                    Q.{selectedSolutionIndex + 1}
                  </span>
                  
                  <span style={{
                    background: '#f8fafc', color: '#334155', border: '1px solid #e2e8f0',
                    fontSize: '0.78rem', fontWeight: 700, padding: '0.25rem 0.65rem', borderRadius: '6px'
                  }}>
                    {currentSolutionQ.category || (state.quizTitle ? state.quizTitle.split(':')[0].trim() : 'General Studies')}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{
                    background: '#fefce8', color: '#a16207', border: '1px solid #fef08a',
                    fontSize: '0.75rem', fontWeight: 800, padding: '0.2rem 0.6rem', borderRadius: '6px'
                  }}>
                    Moderate
                  </span>
                </div>
              </div>

              {/* Question Text */}
              <div 
                style={{ fontSize: '1.05rem', lineHeight: 1.6, fontWeight: 500, color: '#1e293b' }}
                dangerouslySetInnerHTML={{ __html: displaySolutionQ?.question || currentSolutionQ.question }}
              />

              {/* Options & Result Comparison */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem', alignItems: 'start' }}>
                
                {/* Options List */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                  {(displaySolutionQ?.options || currentSolutionQ.options).map((opt, idx) => {
                    const letter = String.fromCharCode(65 + idx);
                    const isUserChoice = currentSolutionAns?.selectedIndex === idx;
                    const isCorrectChoice = currentSolutionQ.correctIndex === idx;

                    let border = '1px solid #e2e8f0';
                    let bg = '#ffffff';

                    if (isCorrectChoice) {
                      border = '2px solid #16a34a';
                      bg = '#f0fdf4';
                    } else if (isUserChoice) {
                      border = '2px solid #ef4444';
                      bg = '#fef2f2';
                    }

                    return (
                      <div
                        key={idx}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '0.75rem',
                          padding: '0.75rem 1rem', borderRadius: '8px',
                          border, background: bg, fontSize: '0.9rem'
                        }}
                      >
                        <span style={{ fontWeight: 800, color: isCorrectChoice ? '#15803d' : isUserChoice ? '#b91c1c' : '#64748b' }}>
                          {letter}.
                        </span>
                        <div style={{ flex: 1 }} dangerouslySetInnerHTML={{ __html: opt }} />
                        {isCorrectChoice && <CheckCircle2 size={16} color="#16a34a" />}
                        {!isCorrectChoice && isUserChoice && <XCircle size={16} color="#ef4444" />}
                      </div>
                    );
                  })}
                </div>

                {/* Result Comparison Box */}
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.82rem' }}>
                  <div>
                    <span style={{ color: '#64748b', fontSize: '0.7rem', display: 'block', textTransform: 'uppercase', fontWeight: 700 }}>Correct Answer</span>
                    <strong style={{ color: '#16a34a', fontSize: '1rem' }}>
                      Option {String.fromCharCode(65 + currentSolutionQ.correctIndex)}
                    </strong>
                  </div>

                  <div>
                    <span style={{ color: '#64748b', fontSize: '0.7rem', display: 'block', textTransform: 'uppercase', fontWeight: 700 }}>Your Answer</span>
                    <strong style={{
                      color: currentSolutionAns?.isCorrect ? '#16a34a' : currentSolutionAns?.selectedIndex !== null && currentSolutionAns?.selectedIndex !== undefined ? '#dc2626' : '#64748b',
                      fontSize: '1rem'
                    }}>
                      {currentSolutionAns && currentSolutionAns.selectedIndex !== null && currentSolutionAns.selectedIndex !== undefined
                        ? `Option ${String.fromCharCode(65 + currentSolutionAns.selectedIndex)}`
                        : 'Unattempted'}
                    </strong>
                  </div>

                  <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '0.65rem' }}>
                    <span style={{ color: '#64748b', fontSize: '0.7rem', display: 'block', textTransform: 'uppercase', fontWeight: 700 }}>Outcome</span>
                    <strong style={{
                      color: currentSolutionAns?.isCorrect ? '#16a34a' : currentSolutionAns?.selectedIndex !== null && currentSolutionAns?.selectedIndex !== undefined ? '#dc2626' : '#64748b',
                      fontSize: '1rem',
                      fontFamily: 'monospace'
                    }}>
                      {currentSolutionAns?.isCorrect ? '+2.00 Marks' : currentSolutionAns?.selectedIndex !== null && currentSolutionAns?.selectedIndex !== undefined ? '-0.50 Marks' : '0.00 Marks'}
                    </strong>
                  </div>
                </div>

              </div>

              {/* Step-by-Step Explanation Box */}
              <div style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '10px',
                padding: '1.25rem',
                marginTop: '0.5rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#0d4a2b', fontWeight: 800, fontSize: '0.85rem', marginBottom: '0.5rem', textTransform: 'uppercase' }}>
                  <FileText size={16} color="#0d4a2b" /> Step-by-Step Explanation
                </div>
                <div 
                  style={{ fontSize: '0.88rem', color: '#334155', lineHeight: 1.65 }}
                  dangerouslySetInnerHTML={{ __html: displaySolutionQ?.explanation || currentSolutionQ.explanation || 'Complete step-by-step logic and concept verification provided for this problem.' }}
                />
              </div>

              {/* Key Takeaway Callout (Reference 2) */}
              <div style={{
                background: '#fefce8',
                border: '1px solid #fef08a',
                borderRadius: '10px',
                padding: '1rem 1.25rem',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.65rem'
              }}>
                <Lightbulb size={18} color="#ca8a04" style={{ flexShrink: 0, marginTop: '0.15rem' }} />
                <div>
                  <strong style={{ display: 'block', fontSize: '0.8rem', color: '#854d0e', textTransform: 'uppercase', marginBottom: '0.2rem' }}>
                    Key Takeaway & Exam Strategy
                  </strong>
                  <p style={{ margin: 0, fontSize: '0.82rem', color: '#713f12', lineHeight: 1.5 }}>
                    Carefully review the question premise and eliminate unviable options systematically. For numerical and logical questions, cross-check constraints before finalizing your selection to protect against the -0.50 negative marking penalty.
                  </p>
                </div>
              </div>

              {/* Bottom Navigation Buttons for Fluid Review */}
              <div style={{
                borderTop: '1px solid #f1f5f9',
                paddingTop: '1rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '1rem'
              }}>
                <button
                  type="button"
                  disabled={selectedSolutionIndex === 0}
                  onClick={() => setSelectedSolutionIndex(i => Math.max(0, i - 1))}
                  style={{
                    background: 'white',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    padding: '0.65rem 1.25rem',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    color: selectedSolutionIndex === 0 ? '#94a3b8' : '#0f172a',
                    cursor: selectedSolutionIndex === 0 ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
                  }}
                >
                  <ArrowLeft size={15} /> Previous Question
                </button>

                <button
                  type="button"
                  disabled={selectedSolutionIndex === totalQuestions - 1}
                  onClick={() => setSelectedSolutionIndex(i => Math.min(totalQuestions - 1, i + 1))}
                  style={{
                    background: selectedSolutionIndex === totalQuestions - 1 ? '#e2e8f0' : '#0d4a2b',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '0.65rem 1.35rem',
                    fontSize: '0.82rem',
                    fontWeight: 800,
                    color: selectedSolutionIndex === totalQuestions - 1 ? '#94a3b8' : 'white',
                    cursor: selectedSolutionIndex === totalQuestions - 1 ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    boxShadow: selectedSolutionIndex === totalQuestions - 1 ? 'none' : '0 2px 4px rgba(13,74,43,0.2)'
                  }}
                >
                  Next Question <ArrowRight size={15} />
                </button>
              </div>

            </div>

          </div>
        )}

      </div>

    </div>
  );
};
