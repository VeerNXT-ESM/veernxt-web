import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Clock, 
  Bookmark, 
  BookmarkCheck, 
  ArrowLeft, 
  ArrowRight,
  LogOut,
  HelpCircle,
  Lightbulb
} from 'lucide-react';
import { calculateQuestionScore } from './scoring';

export const QuizView = ({
  state,
  onUpdateAnswer,
  onToggleBookmark,
  onFinishQuiz,
  onExitToMenu
}) => {
  const currentQ = state.questions[state.currentIndex];
  const existingAnswer = state.answers[currentQ.id];
  const isAnswered = existingAnswer !== undefined;

  const [selectedIdx, setSelectedIdx] = useState(existingAnswer?.selectedIndex ?? null);
  const [showExplanation, setShowExplanation] = useState(
    state.config.mode === 'learning' && isAnswered
  );
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  // Time remaining state for timed mode
  const timeLimit = state.config.timeLimitSeconds;
  const [timeLeft, setTimeLeft] = useState(
    state.timeRemaining > 0 ? state.timeRemaining : (timeLimit > 0 ? timeLimit : 0)
  );

  const timerRef = useRef(null);
  const timeSpentRef = useRef(0);

  // Reset when question changes
  useEffect(() => {
    const ans = state.answers[currentQ.id];
    setSelectedIdx(ans?.selectedIndex ?? null);
    setShowExplanation(state.config.mode === 'learning' && ans !== undefined);
    
    if (timeLimit > 0) {
      setTimeLeft(timeLimit);
      timeSpentRef.current = 0;
    }
  }, [state.currentIndex, currentQ.id, state.config.mode, state.answers, timeLimit]);

  // Handle timeout auto-submission
  const handleTimeout = useCallback(() => {
    if (isAnswered) return;

    const scoreCalc = calculateQuestionScore(false, currentQ.difficulty, timeLimit, timeLimit, 0);
    const newAnswer = {
      questionId: currentQ.id,
      selectedIndex: null,
      isCorrect: false,
      timeSpent: timeLimit,
      pointsAwarded: 0,
    };

    const isLast = state.currentIndex === state.questions.length - 1;
    if (state.config.mode === 'learning') {
      onUpdateAnswer(newAnswer, state.currentIndex, state.score, 0, state.maxStreak);
      setShowExplanation(true);
    } else {
      if (isLast) {
        onUpdateAnswer(newAnswer, state.currentIndex, state.score, 0, state.maxStreak);
        onFinishQuiz();
      } else {
        onUpdateAnswer(newAnswer, state.currentIndex + 1, state.score, 0, state.maxStreak);
      }
    }
  }, [isAnswered, currentQ, timeLimit, state, onUpdateAnswer, onFinishQuiz]);

  // Timer interval
  useEffect(() => {
    if (timeLimit <= 0 || isAnswered) return;

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          handleTimeout();
          return 0;
        }
        timeSpentRef.current += 1;
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timeLimit, isAnswered, handleTimeout, state.currentIndex]);

  const handleSelectOption = (index) => {
    if (isAnswered) return;

    setSelectedIdx(index);
    const isCorrect = index === currentQ.correctIndex;
    const timeSpent = timeLimit > 0 ? (timeLimit - timeLeft) : timeSpentRef.current;
    
    const nextStreak = isCorrect ? state.currentStreak + 1 : 0;
    const nextMaxStreak = Math.max(state.maxStreak, nextStreak);

    const scoreCalc = calculateQuestionScore(
      isCorrect,
      currentQ.difficulty,
      timeSpent,
      timeLimit,
      state.currentStreak
    );

    const newScore = state.score + scoreCalc.totalPoints;

    const answer = {
      questionId: currentQ.id,
      selectedIndex: index,
      isCorrect,
      timeSpent,
      pointsAwarded: scoreCalc.totalPoints,
    };

    if (state.config.mode === 'learning') {
      onUpdateAnswer(answer, state.currentIndex, newScore, nextStreak, nextMaxStreak);
      setShowExplanation(true);
    } else {
      // In competitive mode, auto-advance after 500ms brief delay
      setTimeout(() => {
        const isLast = state.currentIndex === state.questions.length - 1;
        if (isLast) {
          onUpdateAnswer(answer, state.currentIndex, newScore, nextStreak, nextMaxStreak);
          onFinishQuiz();
        } else {
          onUpdateAnswer(answer, state.currentIndex + 1, newScore, nextStreak, nextMaxStreak);
        }
      }, 500);
    }
  };

  const isBookmarked = state.bookmarkedIds.includes(currentQ.id);
  const progressPercent = Math.round((state.currentIndex / state.questions.length) * 100);
  const answeredCount = Object.keys(state.answers).length;

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '2rem 1.5rem', fontFamily: "'Inter', sans-serif", color: '#18181b' }}>
      
      {/* 1. Status Bar Panel */}
      <div style={{
        background: '#fff', border: '1px solid #e4e4e7', padding: '1.25rem 1.5rem', marginBottom: '1.5rem',
        display: 'flex', flexDirection: 'column', gap: '0.75rem'
      }}>
        {/* Top line */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          
          {/* Question Counter */}
          <div>
            <span style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#71717a' }}>
              Question {state.currentIndex + 1} of {state.questions.length}
            </span>
          </div>

          {/* Progress Percent */}
          <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#71717a', fontFamily: 'monospace' }}>
            {progressPercent}% Complete
          </span>

          {/* Right Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            
            {/* Score Monospace ticker */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', marginRight: '0.5rem' }}>
              <span style={{ fontSize: '0.55rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#71717a' }}>
                Current Score
              </span>
              <span style={{ fontSize: '1.1rem', fontWeight: 800, fontFamily: 'monospace', letterSpacing: '1px' }}>
                {String(state.score).padStart(5, '0')}
              </span>
            </div>

            {/* Bookmark button */}
            <button
              type="button"
              onClick={() => onToggleBookmark(currentQ.id)}
              style={{
                background: 'white', border: '1px solid #e4e4e7', width: '36px', height: '36px',
                display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                color: isBookmarked ? '#eab308' : '#71717a'
              }}
            >
              {isBookmarked ? <BookmarkCheck size={16} fill="#eab308" color="#eab308" /> : <Bookmark size={16} />}
            </button>

            {/* Save & Exit button */}
            <button
              type="button"
              onClick={() => setShowExitConfirm(true)}
              style={{
                background: 'white', border: '1px solid #e4e4e7', height: '36px', padding: '0 0.85rem',
                display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer',
                fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#71717a'
              }}
            >
              <LogOut size={13} /> Save & Exit
            </button>

          </div>
        </div>

        {/* Flat Linear Progress Bar */}
        <div style={{ height: '3px', background: '#e4e4e7', width: '100%', position: 'relative' }}>
          <div style={{
            height: '100%', background: '#18181b',
            width: `${((state.currentIndex + (isAnswered ? 1 : 0)) / state.questions.length) * 100}%`,
            transition: 'width 0.2s ease'
          }}></div>
        </div>

        {/* Sub-row (Timer & Mode Indicator) */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem' }}>
          {timeLimit > 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: timeLeft <= 5 ? '#ef4444' : '#18181b', fontWeight: 800 }}>
              <Clock size={13} />
              <span>Time Remaining: <strong style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{timeLeft}s</strong></span>
            </div>
          ) : (
            <span style={{ color: '#71717a' }}>No time limit</span>
          )}

          <span style={{ fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#71717a' }}>
            {state.config.mode === 'learning' ? 'Learning Session' : 'Timed Session'}
          </span>
        </div>

      </div>

      {/* 2. Main Question Card Panel */}
      <div style={{
        background: '#fff', border: '1px solid #e4e4e7', padding: '3rem 2.5rem 2.5rem 2.5rem',
        marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.75rem'
      }}>
        {/* Category tags */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', color: '#71717a' }}>
            {(currentQ.category || 'general_knowledge').replace('_', ' ')} / {currentQ.difficulty}
          </span>
          <span style={{
            fontSize: '0.6rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px',
            border: '1px solid #eab308', color: '#ca8a04', padding: '0.15rem 0.4rem',
            fontFamily: 'monospace'
          }}>
            {currentQ.difficulty.toUpperCase()}
          </span>
        </div>

        {/* Question Text */}
        <div style={{ textAlign: 'left' }}>
          <h2 
            style={{ fontSize: '1.6rem', fontWeight: 300, color: '#09090b', margin: 0, lineHeight: 1.4, letterSpacing: '-0.5px' }}
            dangerouslySetInnerHTML={{ __html: currentQ.question }}
          />
        </div>

        {/* Options Grid (2x2 Layout) */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1rem' }}>
          {currentQ.options.map((opt, idx) => {
            const isSelected = selectedIdx === idx;
            const isCorrect = idx === currentQ.correctIndex;
            const letter = String.fromCharCode(65 + idx); // A, B, C, D

            let borderStyle = '1px solid #e4e4e7';
            let prefixBg = '#f4f4f5';
            let prefixColor = '#71717a';
            let contentBg = 'white';

            if (isAnswered) {
              if (isSelected) {
                if (isCorrect) {
                  borderStyle = '2px solid #22c55e';
                  prefixBg = '#22c55e';
                  prefixColor = 'white';
                  contentBg = 'rgba(34, 197, 94, 0.02)';
                } else {
                  borderStyle = '2px solid #ef4444';
                  prefixBg = '#ef4444';
                  prefixColor = 'white';
                  contentBg = 'rgba(239, 68, 68, 0.02)';
                }
              } else if (isCorrect && state.config.mode === 'learning') {
                borderStyle = '2px dashed #22c55e';
              }
            } else if (isSelected) {
              borderStyle = '2px solid #18181b';
              prefixBg = '#18181b';
              prefixColor = 'white';
            }

            return (
              <button
                key={idx}
                disabled={isAnswered}
                onClick={() => handleSelectOption(idx)}
                style={{
                  display: 'flex', alignItems: 'stretch', padding: 0, background: contentBg,
                  border: borderStyle, cursor: isAnswered ? 'default' : 'pointer',
                  textAlign: 'left', font: 'inherit', transition: 'all 0.1s'
                }}
              >
                {/* Prefix cell */}
                <div style={{
                  width: '44px', background: prefixBg, color: prefixColor,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 800, fontFamily: 'monospace', borderRight: borderStyle,
                  flexShrink: 0
                }}>
                  {letter}
                </div>

                {/* Option Text cell */}
                <div style={{ flex: 1, padding: '1rem 1.25rem', fontSize: '0.9rem', fontWeight: 500, color: '#27272a' }}>
                  <div dangerouslySetInnerHTML={{ __html: opt }} />
                </div>
              </button>
            );
          })}
        </div>

        {/* Back and Status prompt row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #e4e4e7', paddingTop: '1.25rem', fontSize: '0.75rem', color: '#71717a' }}>
          
          {state.config.mode === 'learning' ? (
            <button
              type="button"
              disabled={state.currentIndex === 0}
              onClick={() => onUpdateAnswer(null, state.currentIndex - 1, state.score, state.currentStreak, state.maxStreak)}
              style={{
                background: 'none', border: 'none', cursor: state.currentIndex === 0 ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', fontWeight: 800,
                color: state.currentIndex === 0 ? '#d1d1d6' : '#18181b', textTransform: 'uppercase', letterSpacing: '0.5px'
              }}
            >
              ← Previous
            </button>
          ) : (
            <div></div>
          )}

          <span style={{ textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>
            Select Option (A-D) to Register Answer
          </span>
        </div>

        {/* Solution Explanation for Learning Mode */}
        {showExplanation && currentQ.explanation && (
          <div style={{
            background: '#f8fafc', border: '1px solid #e2e8f0', padding: '1.5rem',
            textAlign: 'left', marginTop: '0.5rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--ios-olive)', fontWeight: 800, fontSize: '0.8rem', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              <Lightbulb size={15} /> Insight & Explanation
            </div>
            <div 
              style={{ fontSize: '0.8rem', color: '#475569', lineHeight: 1.6 }}
              dangerouslySetInnerHTML={{ __html: currentQ.explanation }}
            />
          </div>
        )}

      </div>

      {/* 3. Footer Bar with indicators */}
      <div style={{
        background: '#fff', border: '1px solid #e4e4e7', padding: '1rem 1.5rem',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center'
      }}>
        {/* Left Stats */}
        <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#71717a' }}>
          <span>■ Mode: {state.config.mode}</span>
          <span>■ Answered: {answeredCount}/{state.questions.length}</span>
        </div>

        {/* Right Indicators (Square Status Boxes) */}
        <div style={{ display: 'flex', gap: '0.35rem' }}>
          {state.questions.map((q, idx) => {
            const ans = state.answers[q.id];
            const isActive = idx === state.currentIndex;
            
            let bg = '#e4e4e7';
            let border = '1px solid #e4e4e7';

            if (ans) {
              if (state.config.mode === 'learning') {
                bg = ans.isCorrect ? '#22c55e' : '#ef4444';
                border = `1px solid ${ans.isCorrect ? '#22c55e' : '#ef4444'}`;
              } else {
                bg = '#71717a';
                border = '1px solid #71717a';
              }
            }
            if (isActive) {
              border = '2px solid #18181b';
            }

            return (
              <div 
                key={q.id}
                style={{
                  width: '12px', height: '12px', background: bg, border: border,
                  transition: 'all 0.15s'
                }}
                title={`Question ${idx + 1}`}
              />
            );
          })}
        </div>
      </div>

      {/* Baseline Footer */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        fontSize: '0.65rem', color: '#a1a1aa', marginTop: '1rem', padding: '0 0.5rem',
        textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600
      }}>
        <span>Quiz Core • High Contrast Learning & Competition Engine</span>
        <span>State Auto-Saved • Offline Ready</span>
      </div>

      {/* Confirm Exit Dialog */}
      {showExitConfirm && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(9, 9, 11, 0.4)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 100, padding: '1rem'
        }}>
          <div style={{
            background: 'white', border: '1px solid #e4e4e7', padding: '2.5rem 2rem',
            maxWidth: '420px', width: '100%', textAlign: 'center'
          }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#09090b', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '-0.5px' }}>
              Abandon Current Session?
            </h3>
            <p style={{ fontSize: '0.85rem', color: '#71717a', lineHeight: 1.5, marginBottom: '2rem' }}>
              Your progress is automatically saved to the local device storage. You can safely resume this session later.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <button
                onClick={onExitToMenu}
                style={{
                  background: '#ef4444', color: 'white', border: 'none',
                  padding: '0.9rem', fontSize: '0.85rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', cursor: 'pointer'
                }}
              >
                Yes, Save & Exit
              </button>
              <button
                onClick={() => setShowExitConfirm(false)}
                style={{
                  background: 'white', color: '#18181b', border: '1px solid #e4e4e7',
                  padding: '0.8rem', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', cursor: 'pointer'
                }}
              >
                Keep Testing
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Navigation for Answered state */}
      {isAnswered && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
          <button
            onClick={() => {
              const isLast = state.currentIndex === state.questions.length - 1;
              if (isLast) onFinishQuiz();
              else onUpdateAnswer(null, state.currentIndex + 1, state.score, state.currentStreak, state.maxStreak);
            }}
            style={{
              background: '#18181b', color: 'white', border: 'none',
              padding: '0.9rem 1.75rem', fontSize: '0.85rem', fontWeight: 800,
              textTransform: 'uppercase', letterSpacing: '1px', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '0.5rem'
            }}
          >
            {state.currentIndex === state.questions.length - 1 ? 'Finish Assessment' : 'Next Question'} <ArrowRight size={14} />
          </button>
        </div>
      )}

    </div>
  );
};
