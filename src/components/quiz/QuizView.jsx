import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Clock,
  Bookmark,
  BookmarkCheck,
  ArrowLeft,
  ArrowRight,
  RotateCcw,
  Send,
  Maximize2,
  Minimize2,
  ChevronDown,
  ChevronUp,
  Check,
  X,
  Languages,
  LogOut,
  AlertCircle,
  Info,
  RefreshCw
} from 'lucide-react';
import { translateQuestion, prefetchTranslations, getCachedQuestion } from '../../lib/quizTranslator';

/**
 * Organizes questions into sections ONLY if questions carry real section tags.
 * If questions have no explicit section metadata, returns an empty array
 * so the test renders as a unified exam without fabricated sections.
 */
export function organizeSections(questions) {
  if (!questions || questions.length === 0) return [];

  const hasRealSections = questions.some(q => q.section || q.section_name || q.subject_tag);
  if (!hasRealSections) {
    return [];
  }

  const groupMap = new Map();
  questions.forEach((q, idx) => {
    const secName = q.section || q.section_name || q.subject_tag || 'General';
    if (!groupMap.has(secName)) groupMap.set(secName, []);
    groupMap.get(secName).push({ ...q, globalIndex: idx });
  });

  let curStart = 0;
  return Array.from(groupMap.entries()).map(([name, qs], sIdx) => {
    const start = curStart;
    const end = curStart + qs.length - 1;
    curStart += qs.length;
    return {
      id: `sec-${sIdx}`,
      name,
      questions: qs,
      startIndex: start,
      endIndex: end,
      count: qs.length
    };
  });
}

export const QuizView = ({
  state,
  onUpdateAnswer,
  onToggleBookmark,
  onFinishQuiz,
  onExitToMenu
}) => {
  const totalQuestions = state.questions.length;
  const sections = useMemo(() => organizeSections(state.questions), [state.questions]);
  const hasSections = sections.length > 1;

  // Track visited questions (index in set)
  const [visitedIndices, setVisitedIndices] = useState(() => new Set([0]));
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [paletteExpanded, setPaletteExpanded] = useState(true);
  const [selectedLanguage, setSelectedLanguage] = useState(state.config?.language || 'en');

  // Overall Continuous Countdown Timer
  const totalDuration = state.config?.totalDurationSeconds || (totalQuestions * 60);
  const [timeLeft, setTimeLeft] = useState(() => {
    if (typeof state.timeRemaining === 'number' && state.timeRemaining > 0) {
      return state.timeRemaining;
    }
    return totalDuration;
  });

  const currentQ = state.questions[state.currentIndex];
  const existingAnswer = state.answers[currentQ?.id];
  const [selectedIdx, setSelectedIdx] = useState(existingAnswer?.selectedIndex ?? null);

  // Dynamic Hindi/English translation state
  const [displayQ, setDisplayQ] = useState(currentQ);
  const [isTranslating, setIsTranslating] = useState(false);

  // Synchronize and translate question according to selected language
  useEffect(() => {
    let isMounted = true;
    if (!currentQ) return;

    if (selectedLanguage === 'en') {
      setDisplayQ(currentQ);
      setIsTranslating(false);
      return;
    }

    // Instant render if cached in memory or localStorage
    const cached = getCachedQuestion(currentQ, 'hi');
    if (cached) {
      setDisplayQ(cached);
      setIsTranslating(false);
    } else {
      setIsTranslating(true);
      translateQuestion(currentQ, 'hi').then(tq => {
        if (isMounted && tq) {
          setDisplayQ(tq);
          setIsTranslating(false);
        }
      }).catch(() => {
        if (isMounted) setIsTranslating(false);
      });
    }

    // Prefetch upcoming questions in Hindi for instant navigation
    prefetchTranslations(state.questions, 'hi', state.currentIndex + 1, 4);

    return () => { isMounted = false; };
  }, [currentQ, selectedLanguage, state.questions, state.currentIndex]);

  // Active section based on current question (if real sections exist)
  const activeSection = useMemo(() => {
    if (!hasSections) return null;
    return sections.find(s => state.currentIndex >= s.startIndex && state.currentIndex <= s.endIndex) || sections[0];
  }, [sections, state.currentIndex, hasSections]);

  // Update selected option when index changes
  useEffect(() => {
    const ans = state.answers[currentQ?.id];
    setSelectedIdx(ans?.selectedIndex ?? null);
    setVisitedIndices(prev => new Set(prev).add(state.currentIndex));
  }, [state.currentIndex, currentQ?.id, state.answers]);

  // Run overall countdown timer
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          onFinishQuiz();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [onFinishQuiz]);

  const formatTimer = (secs) => {
    if (secs <= 0) return '00:00:00';
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  // Toggle fullscreen
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => { });
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => { });
      setIsFullscreen(false);
    }
  };

  // Selection handlers
  const handleSelectOption = (index) => {
    setSelectedIdx(index);
    const isCorrect = index === currentQ.correctIndex;
    const answerObj = {
      questionId: currentQ.id,
      selectedIndex: index,
      isCorrect,
      timeSpent: 0,
      pointsAwarded: isCorrect ? 2 : 0,
    };
    onUpdateAnswer(answerObj, state.currentIndex, state.score, 0, 0, timeLeft);
  };

  const handleClear = () => {
    setSelectedIdx(null);
    const clearObj = {
      questionId: currentQ.id,
      selectedIndex: null,
      isCorrect: false,
      timeSpent: 0,
      pointsAwarded: 0,
    };
    onUpdateAnswer(clearObj, state.currentIndex, state.score, 0, 0, timeLeft);
  };

  const handleJump = (targetIdx) => {
    if (targetIdx >= 0 && targetIdx < totalQuestions) {
      onUpdateAnswer(null, targetIdx, state.score, 0, 0, timeLeft);
    }
  };

  const handleNext = () => {
    if (state.currentIndex < totalQuestions - 1) {
      handleJump(state.currentIndex + 1);
    } else {
      setShowSubmitModal(true);
    }
  };

  const handlePrev = () => {
    if (state.currentIndex > 0) {
      handleJump(state.currentIndex - 1);
    }
  };

  // Question Status Helper for Palette (5 States per Reference 3 & 4)
  const getQuestionStatus = (idx) => {
    const q = state.questions[idx];
    if (!q) return 'not_visited';
    const ans = state.answers[q.id];
    const hasAnswered = ans && ans.selectedIndex !== null && ans.selectedIndex !== undefined;
    const isMarked = state.bookmarkedIds.includes(q.id);
    const isVisited = visitedIndices.has(idx);

    if (hasAnswered && isMarked) return 'answered_marked'; // Purple with small green indicator
    if (isMarked) return 'marked';                         // Purple
    if (hasAnswered) return 'answered';                     // Green
    if (isVisited) return 'not_answered';                   // Salmon/Red
    return 'not_visited';                                   // White/Gray
  };

  // Compute status aggregates
  const counts = useMemo(() => {
    let answered = 0;
    let notAnswered = 0;
    let marked = 0;
    let answeredMarked = 0;
    let notVisited = 0;

    state.questions.forEach((q, idx) => {
      const st = getQuestionStatus(idx);
      if (st === 'answered') answered++;
      else if (st === 'not_answered') notAnswered++;
      else if (st === 'marked') marked++;
      else if (st === 'answered_marked') answeredMarked++;
      else notVisited++;
    });

    return { answered, notAnswered, marked, answeredMarked, notVisited };
  }, [state.questions, state.answers, state.bookmarkedIds, visitedIndices]);

  const isCurrentMarked = state.bookmarkedIds.includes(currentQ?.id);
  const totalAnswered = counts.answered + counts.answeredMarked;
  const overallProgressPercent = totalQuestions > 0 ? Math.round((totalAnswered / totalQuestions) * 100) : 0;

  // Section-specific question count and progress
  const sectionQuestions = hasSections && activeSection ? activeSection.questions : state.questions;
  const currentQuestionNumber = hasSections && activeSection && currentQ
    ? (currentQ.globalIndex - activeSection.startIndex + 1)
    : (state.currentIndex + 1);
  const currentTotalInView = hasSections && activeSection ? activeSection.count : totalQuestions;

  return (
    <div style={{
      minHeight: '100vh',
      background: '#f8fafc',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      color: '#0f172a',
      display: 'flex',
      flexDirection: 'column'
    }}>

      {/* TOP HEADER BAR (Exact Reference 3 & 4 Layout - Single Clean Row) */}
      <header style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        background: '#0d4a2b',
        color: 'white',
        padding: '0.55rem 1.25rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'nowrap',
        gap: '0.75rem',
        borderBottom: '2px solid #09371f',
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        minHeight: '56px'
      }}>

        {/* Left Side: Exit Button + VeerNXT Brand + Test Title (Reference 4) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', minWidth: 0, flexShrink: 1 }}>
          <button
            type="button"
            onClick={() => setShowExitModal(true)}
            title="Exit / Leave Test"
            style={{
              background: 'rgba(255,255,255,0.14)',
              border: '1px solid rgba(255,255,255,0.25)',
              color: 'white',
              borderRadius: '6px',
              padding: '0.35rem 0.65rem',
              fontSize: '0.78rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.3rem',
              whiteSpace: 'nowrap',
              flexShrink: 0,
              transition: 'background 0.15s ease'
            }}
          >
            <ArrowLeft size={14} /> Exit
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: 900, letterSpacing: '-0.5px', fontSize: '1.15rem', flexShrink: 0 }}>
            <span style={{ color: '#86efac' }}>Veer</span>NXT
          </div>
          <span style={{ opacity: 0.4, margin: '0 0.2rem', flexShrink: 0 }}>|</span>
          <h1 style={{
            margin: 0,
            fontSize: '0.9rem',
            fontWeight: 700,
            letterSpacing: '0.2px',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            maxWidth: '380px'
          }}>
            {state.quizTitle || 'Full Mock Test 01'}
          </h1>
        </div>

        {/* Center Metadata Chips (Reference 4: Compact Single Row) */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.65rem',
          fontSize: '0.74rem',
          opacity: 0.9,
          whiteSpace: 'nowrap',
          flexShrink: 0
        }}>
          <span><strong>{totalQuestions}</strong> Qs</span>
          <span>•</span>
          <span><strong>{totalQuestions * 2}</strong> Marks</span>
          <span>•</span>
          <span><strong>{Math.round(totalDuration / 60)}</strong> Mins</span>
          <span>•</span>
          <span style={{ background: 'rgba(255,255,255,0.18)', padding: '0.15rem 0.45rem', borderRadius: '4px', fontWeight: 800 }}>
            +2.00 / -0.50
          </span>
        </div>

        {/* Right Controls: Language Selector, Fullscreen Toggle, Timer Pill, Submit Test Button (Exact Reference 3 & 4) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', flexWrap: 'nowrap', flexShrink: 0 }}>

          {/* Language Switcher Pill (EN | HI) */}
          <div style={{
            display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.15)',
            border: '1px solid rgba(255,255,255,0.25)', borderRadius: '6px', padding: '0.2rem 0.5rem',
            fontSize: '0.78rem', fontWeight: 800, color: 'white', gap: '0.35rem', whiteSpace: 'nowrap'
          }}>
            <Languages size={15} color="#86efac" />
            <select
              value={selectedLanguage}
              onChange={(e) => {
                const newLang = e.target.value;
                setSelectedLanguage(newLang);
                try { localStorage.setItem('veernxt_pref_lang', newLang); } catch (e) {}
              }}
              title="Change Question Language"
              style={{
                background: 'transparent', border: 'none', color: 'white',
                fontSize: '0.78rem', fontWeight: 800, outline: 'none', cursor: 'pointer'
              }}
            >
              <option value="en" style={{ color: '#0f172a' }}>English</option>
              <option value="hi" style={{ color: '#0f172a' }}>हिंदी (Hindi)</option>
            </select>
          </div>

          <button
            type="button"
            onClick={toggleFullscreen}
            title="Toggle Fullscreen"
            style={{
              background: 'rgba(255,255,255,0.12)', border: 'none', color: 'white',
              width: '32px', height: '32px', borderRadius: '6px', display: 'flex',
              alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0
            }}
          >
            {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
          </button>

          {/* Time Left Clock Pill (Reference 3 & 4) */}
          <div style={{
            background: 'white', color: '#0d4a2b', borderRadius: '6px',
            padding: '0.38rem 0.8rem', display: 'flex', alignItems: 'center', gap: '0.45rem',
            fontWeight: 800, fontFamily: 'monospace', fontSize: '0.92rem', boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
            whiteSpace: 'nowrap'
          }}>
            <Clock size={15} color="#0d4a2b" />
            <span style={{ fontSize: '0.7rem', fontFamily: "'Inter', sans-serif", fontWeight: 700, color: '#475569' }}>Time Left:</span>
            <span>{formatTimer(timeLeft)}</span>
          </div>

          {/* Submit Test Button (Reference 3 & 4: Solid Green in Top-Right Header) */}
          <button
            type="button"
            onClick={() => setShowSubmitModal(true)}
            style={{
              background: '#22c55e', color: 'white', border: 'none',
              padding: '0.45rem 1.25rem', borderRadius: '6px', fontWeight: 800,
              fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem',
              boxShadow: '0 2px 6px rgba(0,0,0,0.25)', whiteSpace: 'nowrap',
              transition: 'all 0.15s ease'
            }}
          >
            <Send size={14} /> Submit Test
          </button>
        </div>
      </header>

      {/* SECTION TABS (Only if genuine sections exist) */}
      {hasSections && (
        <nav style={{
          background: 'white',
          borderBottom: '1px solid #e2e8f0',
          padding: '0 1.25rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          overflowX: 'auto'
        }}>
          {sections.map((sec) => {
            const isActive = sec.id === activeSection?.id;
            return (
              <button
                key={sec.id}
                onClick={() => handleJump(sec.startIndex)}
                style={{
                  background: isActive ? '#f0fdf4' : 'transparent',
                  border: 'none',
                  borderBottom: isActive ? '3px solid #16a34a' : '3px solid transparent',
                  color: isActive ? '#15803d' : '#475569',
                  padding: '0.75rem 1rem',
                  fontSize: '0.82rem',
                  fontWeight: isActive ? 800 : 600,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem'
                }}
              >
                <span>{sec.name}</span>
                <span style={{
                  background: isActive ? '#22c55e' : '#e2e8f0',
                  color: isActive ? 'white' : '#64748b',
                  fontSize: '0.7rem',
                  padding: '0.1rem 0.4rem',
                  borderRadius: '999px',
                  fontWeight: 700
                }}>
                  {sec.count}
                </span>
              </button>
            );
          })}
        </nav>
      )}

      {/* MAIN EXAM WORKSPACE: 2-COLUMN LAYOUT (Question Area & Question Palette) */}
      <main style={{
        flex: 1,
        maxWidth: '1440px',
        width: '100%',
        margin: '0 auto',
        padding: '1.25rem',
        display: 'grid',
        gridTemplateColumns: '1fr 340px',
        gap: '1.25rem',
        alignItems: 'start'
      }}>

        {/* LEFT COLUMN: QUESTION CARD & ACTION CONTROLS */}
        <div style={{
          background: 'white',
          border: '1px solid #e2e8f0',
          borderRadius: '8px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          display: 'flex',
          flexDirection: 'column',
          minHeight: '560px'
        }}>

          {/* Question Header: Number on Left, Marks & Bookmark on Right (Reference 3 & 4) */}
          <div style={{
            padding: '1.25rem 1.5rem',
            borderBottom: '1px solid #f1f5f9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
                Question {currentQuestionNumber} of {currentTotalInView}
              </span>
              {isTranslating && (
                <span style={{
                  background: '#f0fdf4', color: '#16a34a', border: '1px solid #bcf0da',
                  fontSize: '0.7rem', fontWeight: 700, padding: '0.15rem 0.5rem', borderRadius: '4px',
                  display: 'flex', alignItems: 'center', gap: '0.35rem'
                }}>
                  <RefreshCw size={11} className="animate-spin" /> Translating to Hindi...
                </span>
              )}
              {hasSections && (
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                  (Overall Q.{state.currentIndex + 1})
                </span>
              )}
            </div>

            {/* Marking Scheme (+2.00 / -0.50) & Bookmark Ribbon on Right (Reference 3 & 4) */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{
                background: '#f0fdf4', color: '#16a34a', border: '1px solid #bcf0da',
                fontSize: '0.72rem', fontWeight: 800, padding: '0.15rem 0.45rem', borderRadius: '4px'
              }}>
                +2.00
              </span>
              <span style={{
                background: '#fef2f2', color: '#ef4444', border: '1px solid #fecaca',
                fontSize: '0.72rem', fontWeight: 800, padding: '0.15rem 0.45rem', borderRadius: '4px'
              }}>
                -0.50
              </span>
              <button
                type="button"
                onClick={() => onToggleBookmark(currentQ.id)}
                title={isCurrentMarked ? 'Remove Bookmark' : 'Bookmark Question'}
                style={{
                  background: isCurrentMarked ? '#fefce8' : 'transparent',
                  border: `1px solid ${isCurrentMarked ? '#fde047' : '#e2e8f0'}`,
                  borderRadius: '4px', width: '32px', height: '30px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', color: isCurrentMarked ? '#ca8a04' : '#64748b'
                }}
              >
                {isCurrentMarked ? <BookmarkCheck size={16} fill="#ca8a04" /> : <Bookmark size={16} />}
              </button>
            </div>
          </div>

          {/* Question Body */}
          <div style={{ padding: '1.5rem', flex: 1, display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

            {/* Question Text */}
            <div
              style={{
                fontSize: '1.05rem',
                lineHeight: 1.6,
                color: '#1e293b',
                fontWeight: 500
              }}
              dangerouslySetInnerHTML={{ __html: displayQ?.question || currentQ.question }}
            />

            {/* Options List (Radio Selection per Reference 3 & 4) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.5rem' }}>
              {(displayQ?.options || currentQ.options).map((option, idx) => {
                const isSelected = selectedIdx === idx;
                const letter = String.fromCharCode(65 + idx);

                return (
                  <div
                    key={idx}
                    onClick={() => handleSelectOption(idx)}
                    style={{
                      border: isSelected ? '2px solid #16a34a' : '1px solid #e2e8f0',
                      background: isSelected ? '#f0fdf4' : 'white',
                      borderRadius: '8px',
                      padding: '0.85rem 1.25rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.85rem',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {/* Radio Bubble */}
                    <div style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      border: isSelected ? '6px solid #16a34a' : '2px solid #cbd5e1',
                      background: 'white',
                      flexShrink: 0,
                      transition: 'border 0.15s ease'
                    }} />

                    {/* Option Label & Text */}
                    <span style={{ fontWeight: 800, fontSize: '0.9rem', color: isSelected ? '#15803d' : '#64748b' }}>
                      {letter}.
                    </span>

                    <div
                      style={{
                        flex: 1,
                        fontSize: '0.92rem',
                        color: isSelected ? '#0d4a2b' : '#334155',
                        fontWeight: isSelected ? 600 : 400
                      }}
                      dangerouslySetInnerHTML={{ __html: option }}
                    />
                  </div>
                );
              })}
            </div>

          </div>

          {/* ACTION FOOTER BAR (Exact Position per Reference 3 & 4) */}
          {/* Left: Mark for Review (i) | Right: Clear, Previous, Save & Next */}
          <div style={{
            padding: '1rem 1.5rem',
            borderTop: '1px solid #f1f5f9',
            background: '#fafafa',
            borderRadius: '0 0 8px 8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0.75rem'
          }}>

            {/* Mark for Review Checkbox with Info Icon on Left (Reference 3 & 4) */}
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, color: '#334155' }}>
              <input
                type="checkbox"
                checked={isCurrentMarked}
                onChange={() => onToggleBookmark(currentQ.id)}
                style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#a855f7' }}
              />
              <span>Mark for Review</span>
              <Info size={14} color="#94a3b8" />
            </label>

            {/* Navigation & Action Buttons: Clear, Previous, Save & Next on Right (Reference 3 & 4) */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <button
                type="button"
                onClick={handleClear}
                style={{
                  background: 'white', border: '1px solid #cbd5e1', borderRadius: '6px',
                  padding: '0.55rem 1.15rem', fontSize: '0.82rem', fontWeight: 700, color: '#475569',
                  cursor: 'pointer', boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
                }}
              >
                Clear
              </button>

              <button
                type="button"
                disabled={state.currentIndex === 0}
                onClick={handlePrev}
                style={{
                  background: 'white', border: '1px solid #cbd5e1', borderRadius: '6px',
                  padding: '0.55rem 1.25rem', fontSize: '0.82rem', fontWeight: 700,
                  color: state.currentIndex === 0 ? '#94a3b8' : '#0f172a',
                  cursor: state.currentIndex === 0 ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', gap: '0.25rem',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
                }}
              >
                Previous
              </button>

              <button
                type="button"
                onClick={handleNext}
                style={{
                  background: '#16a34a', border: 'none', borderRadius: '6px',
                  padding: '0.55rem 1.5rem', fontSize: '0.82rem', fontWeight: 800,
                  color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem',
                  boxShadow: '0 2px 4px rgba(22,163,74,0.25)'
                }}
              >
                Save & Next <ArrowRight size={14} />
              </button>
            </div>

          </div>

        </div>

        {/* RIGHT COLUMN: QUESTION PALETTE (Reference 3 & 4) */}
        <aside style={{
          background: 'white',
          border: '1px solid #e2e8f0',
          borderRadius: '8px',
          padding: '1.25rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem'
        }}>

          {/* Palette Header with Collapse Toggle */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.65rem' }}>
            <h3 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 800, color: '#0f172a' }}>
              Question Palette
            </h3>
            <button
              onClick={() => setPaletteExpanded(v => !v)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: 0 }}
            >
              {paletteExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
          </div>

          {paletteExpanded && (
            <>
              {/* 5-Status Counters Legend (Reference 3 & 4) */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.4rem', fontSize: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ width: '24px', height: '20px', borderRadius: '4px', background: '#22c55e', color: 'white', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {counts.answered}
                  </span>
                  <span style={{ color: '#334155', fontWeight: 600 }}>Answered</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ width: '24px', height: '20px', borderRadius: '4px', background: '#fca5a5', color: '#991b1b', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {counts.notAnswered}
                  </span>
                  <span style={{ color: '#334155', fontWeight: 600 }}>Not Answered</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ width: '24px', height: '20px', borderRadius: '4px', background: '#c084fc', color: '#581c87', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {counts.marked}
                  </span>
                  <span style={{ color: '#334155', fontWeight: 600 }}>Marked for Review</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ width: '24px', height: '20px', borderRadius: '4px', background: '#9333ea', color: 'white', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {counts.answeredMarked}
                  </span>
                  <span style={{ color: '#334155', fontWeight: 600 }}>Answered & Marked for Review</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ width: '24px', height: '20px', borderRadius: '4px', background: '#f1f5f9', border: '1px solid #cbd5e1', color: '#475569', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {counts.notVisited}
                  </span>
                  <span style={{ color: '#334155', fontWeight: 600 }}>Not Visited</span>
                </div>
              </div>

              {/* Subheader / Selector (Reference 3 & 4) */}
              <div style={{
                background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px',
                padding: '0.45rem 0.75rem', fontSize: '0.78rem', fontWeight: 700, color: '#0f172a',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between'
              }}>
                <span>{hasSections && activeSection ? activeSection.name : 'All Questions'} ({currentTotalInView})</span>
                <ChevronDown size={14} color="#64748b" />
              </div>

              {/* Numbered 5x5 Question Matrix */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(5, 1fr)',
                gap: '0.45rem',
                maxHeight: '260px',
                overflowY: 'auto',
                padding: '0.2rem'
              }}>
                {sectionQuestions.map((q, sIdx) => {
                  const globalIdx = hasSections ? q.globalIndex : sIdx;
                  const isCurrent = globalIdx === state.currentIndex;
                  const st = getQuestionStatus(globalIdx);

                  let bg = '#ffffff';
                  let color = '#475569';
                  let border = '1px solid #cbd5e1';

                  if (st === 'answered') {
                    bg = '#22c55e';
                    color = 'white';
                    border = '1px solid #16a34a';
                  } else if (st === 'not_answered') {
                    bg = '#fca5a5';
                    color = '#7f1d1d';
                    border = '1px solid #ef4444';
                  } else if (st === 'marked') {
                    bg = '#c084fc';
                    color = '#3b0764';
                    border = '1px solid #a855f7';
                  } else if (st === 'answered_marked') {
                    bg = '#9333ea';
                    color = 'white';
                    border = '1px solid #7e22ce';
                  }

                  if (isCurrent) {
                    border = '2px solid #0f172a';
                  }

                  return (
                    <button
                      key={q.id || globalIdx}
                      type="button"
                      onClick={() => handleJump(globalIdx)}
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
                        position: 'relative',
                        transition: 'transform 0.1s'
                      }}
                    >
                      {globalIdx + 1}
                      {st === 'answered_marked' && (
                        <span style={{
                          position: 'absolute', bottom: '2px', right: '2px',
                          width: '6px', height: '6px', borderRadius: '50%', background: '#22c55e'
                        }} />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Progress Bar Card (Reference 3 & 4) */}
              <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '0.85rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.45rem' }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#475569' }}>
                    {hasSections ? 'Section Progress' : 'Test Progress'}
                  </span>
                  <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#0d4a2b', fontFamily: 'monospace' }}>
                    {totalAnswered} / {totalQuestions} &nbsp; ({overallProgressPercent}%)
                  </span>
                </div>
                <div style={{ height: '7px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ width: `${overallProgressPercent}%`, height: '100%', background: '#16a34a', transition: 'width 0.2s ease' }} />
                </div>
              </div>
            </>
          )}

        </aside>

      </main>

      {/* PAUSE & EXIT CONFIRMATION MODAL */}
      {showExitModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.75)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 99999, padding: '1.5rem'
        }}>
          <div style={{
            background: 'white', borderRadius: '14px', padding: '2rem',
            maxWidth: '460px', width: '100%', boxShadow: '0 20px 40px rgba(0,0,0,0.25)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <AlertCircle size={22} color="#d97706" />
              </div>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' }}>
                Exit Exam Practice?
              </h3>
            </div>

            <p style={{ margin: '0 0 1.5rem 0', fontSize: '0.88rem', color: '#475569', lineHeight: 1.55 }}>
              Your progress, selected answers, and remaining time are <strong>safely saved</strong> in this browser. You can return and resume your test anytime from the Mock Test Library.
            </p>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setShowExitModal(false)}
                style={{
                  flex: 1, background: '#0d4a2b', color: 'white', border: 'none',
                  borderRadius: '8px', padding: '0.75rem 1rem', fontSize: '0.85rem', fontWeight: 800,
                  cursor: 'pointer', boxShadow: '0 2px 4px rgba(13,74,43,0.25)'
                }}
              >
                Resume Exam
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowExitModal(false);
                  onExitToMenu();
                }}
                style={{
                  flex: 1, background: 'white', border: '1px solid #cbd5e1',
                  borderRadius: '8px', padding: '0.75rem 1rem', fontSize: '0.85rem', fontWeight: 700,
                  color: '#ef4444', cursor: 'pointer'
                }}
              >
                Save & Exit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SUBMISSION CONFIRMATION MODAL */}
      {showSubmitModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 9999, padding: '1.5rem'
        }}>
          <div style={{
            background: 'white', borderRadius: '12px', padding: '2rem',
            maxWidth: '480px', width: '100%', boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
          }}>
            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>
              Ready to submit your test?
            </h3>
            <p style={{ margin: '0 0 1.5rem 0', fontSize: '0.88rem', color: '#64748b', lineHeight: 1.5 }}>
              Please review your question attempt summary before submitting. Once submitted, your responses cannot be edited.
            </p>

            <div style={{
              background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px',
              padding: '1rem', display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem', marginBottom: '1.75rem'
            }}>
              <div>
                <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Answered</span>
                <strong style={{ display: 'block', fontSize: '1.15rem', color: '#16a34a' }}>{counts.answered + counts.answeredMarked}</strong>
              </div>
              <div>
                <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Not Answered</span>
                <strong style={{ display: 'block', fontSize: '1.15rem', color: '#ef4444' }}>{counts.notAnswered}</strong>
              </div>
              <div>
                <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Marked for Review</span>
                <strong style={{ display: 'block', fontSize: '1.15rem', color: '#a855f7' }}>{counts.marked}</strong>
              </div>
              <div>
                <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Not Visited</span>
                <strong style={{ display: 'block', fontSize: '1.15rem', color: '#64748b' }}>{counts.notVisited}</strong>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => setShowSubmitModal(false)}
                style={{
                  flex: 1, background: 'white', border: '1px solid #cbd5e1', borderRadius: '6px',
                  padding: '0.75rem', fontSize: '0.85rem', fontWeight: 700, color: '#334155', cursor: 'pointer'
                }}
              >
                Resume Test
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowSubmitModal(false);
                  onFinishQuiz();
                }}
                style={{
                  flex: 1, background: '#16a34a', border: 'none', borderRadius: '6px',
                  padding: '0.75rem', fontSize: '0.85rem', fontWeight: 800, color: 'white', cursor: 'pointer',
                  boxShadow: '0 2px 4px rgba(22,163,74,0.3)'
                }}
              >
                Confirm & Submit
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
