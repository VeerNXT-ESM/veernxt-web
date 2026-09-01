import React from 'react';
import { 
  Trophy, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Zap, 
  Flame, 
  Lightbulb, 
  RotateCcw,
  ArrowRight
} from 'lucide-react';
import { getRankTier } from './scoring';

export const QuizResults = ({
  state,
  onRestart,
  onExit
}) => {
  const totalQ = state.questions.length;
  const answersList = Object.values(state.answers);
  const correctCount = answersList.filter(a => a.isCorrect).length;
  const accuracy = Math.round((correctCount / totalQ) * 100);
  
  // Calculate average time spent
  const totalTime = answersList.reduce((sum, a) => sum + a.timeSpent, 0);
  const avgTime = Math.round(totalTime / (answersList.length || 1));

  // Determine Rank Tier
  const tier = getRankTier(accuracy, state.score, totalQ);

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '2rem 1.5rem', fontFamily: "'Inter', sans-serif", color: '#18181b' }}>
      
      {/* 1. Results Summary Header Panel */}
      <div style={{
        background: 'white', border: '1px solid #e4e4e7', padding: '3rem 2.5rem', textAlign: 'center',
        position: 'relative'
      }}>
        <div style={{
          width: '70px', height: '70px', background: 'rgba(245, 158, 11, 0.08)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem',
          border: '1px solid rgba(245, 158, 11, 0.2)'
        }}>
          <Trophy size={36} color="#f59e0b" />
        </div>

        <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '1.5px' }}>
          Assessment Final Report
        </span>
        <h2 style={{ fontSize: '2.2rem', fontWeight: 300, margin: '0.25rem 0 0.5rem 0', color: '#09090b', letterSpacing: '-0.5px' }}>
          Mock Assessment Completed
        </h2>
        <p style={{ margin: 0, fontSize: '0.9rem', color: '#71717a' }}>
          Your performance metrics have been calibrated and logged.
        </p>

        {/* Tier Rank Display Box */}
        <div style={{
          margin: '2rem auto 0 auto', padding: '1.25rem', background: '#f8fafc',
          border: '1px solid #e4e4e7', maxWidth: '440px',
          display: 'flex', alignItems: 'center', gap: '1.25rem', textAlign: 'left'
        }}>
          <div style={{
            width: '60px', height: '60px', background: '#18181b', color: 'white',
            fontWeight: 900, fontSize: '1.8rem', display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontFamily: 'monospace', flexShrink: 0
          }}>
            {tier.badge}
          </div>
          <div>
            <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 800, textTransform: 'uppercase', color: '#18181b', letterSpacing: '0.5px' }}>
              Rank Tier: {tier.title}
            </h4>
            <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.75rem', color: '#71717a', lineHeight: 1.3 }}>
              {tier.description}
            </p>
          </div>
        </div>
      </div>

      {/* 2. Numerical Metrics Grid */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', margin: '1rem 0'
      }}>
        
        {/* Accuracy */}
        <div style={{ background: 'white', border: '1px solid #e4e4e7', padding: '1.5rem', textAlign: 'left' }}>
          <span style={{ display: 'block', fontSize: '0.7rem', fontWeight: 800, color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.5rem' }}>
            Score Accuracy
          </span>
          <strong style={{ fontSize: '2.2rem', fontWeight: 800, color: '#18181b', fontFamily: 'monospace' }}>
            {accuracy}%
          </strong>
          <span style={{ display: 'block', fontSize: '0.7rem', color: '#71717a', marginTop: '0.25rem' }}>
            {correctCount} / {totalQ} Correct Answers
          </span>
        </div>

        {/* Points */}
        <div style={{ background: 'white', border: '1px solid #e4e4e7', padding: '1.5rem', textAlign: 'left' }}>
          <span style={{ display: 'block', fontSize: '0.7rem', fontWeight: 800, color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.5rem' }}>
            Points Earned
          </span>
          <strong style={{ fontSize: '2.2rem', fontWeight: 800, color: '#18181b', fontFamily: 'monospace' }}>
            {String(state.score).padStart(5, '0')}
          </strong>
          <span style={{ display: 'block', fontSize: '0.7rem', color: '#71717a', marginTop: '0.25rem' }}>
            XP Logged to Profile
          </span>
        </div>

        {/* Avg Pace */}
        <div style={{ background: 'white', border: '1px solid #e4e4e7', padding: '1.5rem', textAlign: 'left' }}>
          <span style={{ display: 'block', fontSize: '0.7rem', fontWeight: 800, color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.5rem' }}>
            Average Pace / Q
          </span>
          <strong style={{ fontSize: '2.2rem', fontWeight: 800, color: '#18181b', fontFamily: 'monospace' }}>
            {avgTime}s
          </strong>
          <span style={{ display: 'block', fontSize: '0.7rem', color: '#71717a', marginTop: '0.25rem' }}>
            Total Duration: {totalTime}s
          </span>
        </div>

        {/* Max Streak */}
        <div style={{ background: 'white', border: '1px solid #e4e4e7', padding: '1.5rem', textAlign: 'left' }}>
          <span style={{ display: 'block', fontSize: '0.7rem', fontWeight: 800, color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.5rem' }}>
            Max Answer Streak
          </span>
          <strong style={{ fontSize: '2.2rem', fontWeight: 800, color: '#ef4444', display: 'flex', alignItems: 'center', gap: '0.4rem', fontFamily: 'monospace' }}>
            <Flame size={26} fill="#ef4444" /> {state.maxStreak}
          </strong>
          <span style={{ display: 'block', fontSize: '0.7rem', color: '#71717a', marginTop: '0.25rem' }}>
            Consecutive Correct Answers
          </span>
        </div>

      </div>

      {/* 3. Question Solutions & Review Panel */}
      <div style={{
        background: 'white', border: '1px solid #e4e4e7', padding: '2.5rem', marginTop: '1.5rem'
      }}>
        <h3 style={{ fontSize: '0.9rem', fontWeight: 800, color: '#18181b', textTransform: 'uppercase', letterSpacing: '1px', borderBottom: '1px solid #e4e4e7', paddingBottom: '0.75rem', marginBottom: '1.5rem', margin: 0 }}>
          Question Review & Solutions
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginTop: '1.5rem' }}>
          {state.questions.map((q, idx) => {
            const ans = state.answers[q.id];
            const isCorrect = ans?.isCorrect ?? false;
            
            // Map selected indices back to letters
            const userLetter = ans?.selectedIndex !== null && ans?.selectedIndex !== undefined ? String.fromCharCode(65 + ans.selectedIndex) : 'N/A';
            const correctLetter = String.fromCharCode(65 + q.correctIndex);
            
            const selectedText = ans?.selectedIndex !== null && ans?.selectedIndex !== undefined ? q.options[ans.selectedIndex] : 'Not Answered';
            const correctText = q.options[q.correctIndex];

            return (
              <div key={q.id} style={{
                padding: '1.5rem', border: `1px solid ${isCorrect ? '#22c55e' : '#ef4444'}`,
                background: isCorrect ? 'rgba(34,197,94,0.01)' : 'rgba(239,68,68,0.01)',
                borderLeft: `6px solid ${isCorrect ? '#22c55e' : '#ef4444'}`
              }}>
                {/* Question Info */}
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start', marginBottom: '1rem' }}>
                  <span style={{ fontWeight: 800, color: '#71717a', fontSize: '0.85rem', fontFamily: 'monospace' }}>Q{idx + 1}.</span>
                  <div 
                    style={{ fontWeight: 700, fontSize: '0.95rem', color: '#18181b', textAlign: 'left', lineHeight: 1.4 }}
                    dangerouslySetInnerHTML={{ __html: q.question }}
                  />
                </div>

                {/* Answers Comparison */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.8rem', paddingLeft: '1.5rem', marginBottom: '1rem' }}>
                  
                  {/* User Answer */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span style={{ color: '#71717a' }}>Your Answer:</span>
                    <strong style={{
                      color: isCorrect ? '#16a34a' : '#dc2626', background: isCorrect ? '#f0fdf4' : '#fef2f2',
                      padding: '0.1rem 0.4rem', border: `1px solid ${isCorrect ? '#bcf0da' : '#fecaca'}`,
                      fontFamily: 'monospace'
                    }}>
                      [{userLetter}]
                    </strong>
                    <span style={{ color: isCorrect ? '#15803d' : '#b91c1c' }} dangerouslySetInnerHTML={{ __html: selectedText }} />
                    {isCorrect ? <CheckCircle size={14} color="#22c55e" /> : <XCircle size={14} color="#ef4444" />}
                  </div>

                  {/* Correct Answer */}
                  {!isCorrect && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <span style={{ color: '#71717a' }}>Correct Answer:</span>
                      <strong style={{
                        color: '#16a34a', background: '#f0fdf4',
                        padding: '0.1rem 0.4rem', border: '1px solid #bcf0da',
                        fontFamily: 'monospace'
                      }}>
                        [{correctLetter}]
                      </strong>
                      <span style={{ color: '#15803d' }} dangerouslySetInnerHTML={{ __html: correctText }} />
                    </div>
                  )}

                </div>

                {/* Solution Explanation */}
                {q.explanation && (
                  <div style={{
                    background: '#f8fafc', border: '1px solid #e2e8f0', padding: '1rem 1.25rem',
                    textAlign: 'left'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--ios-olive)', fontWeight: 800, fontSize: '0.75rem', marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      <Lightbulb size={13} /> Explanation
                    </div>
                    <div 
                      style={{ fontSize: '0.8rem', color: '#64748b', lineHeight: 1.5 }}
                      dangerouslySetInnerHTML={{ __html: q.explanation }}
                    />
                  </div>
                )}

              </div>
            );
          })}
        </div>
      </div>

      {/* 4. Action Buttons */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '2rem' }}>
        <button
          onClick={onRestart}
          style={{
            background: '#18181b', color: 'white', border: 'none',
            padding: '1.1rem', fontSize: '0.95rem', fontWeight: 800,
            textTransform: 'uppercase', letterSpacing: '1px', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem'
          }}
        >
          <RotateCcw size={15} /> Practice Assessment Again
        </button>

        <button
          onClick={onExit}
          style={{
            background: 'white', color: '#71717a', border: '1px solid #e4e4e7',
            padding: '0.9rem', fontSize: '0.8rem', fontWeight: 700,
            textTransform: 'uppercase', letterSpacing: '1px', cursor: 'pointer'
          }}
        >
          Return to Library
        </button>
      </div>

    </div>
  );
};
