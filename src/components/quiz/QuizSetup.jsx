import React, { useState } from 'react';
import { 
  Play, 
  RotateCcw, 
  Trash2, 
  Clock, 
  Zap, 
  GraduationCap, 
  Sliders,
  Award,
  BookOpen,
  Calendar,
  Calculator,
  Compass,
  Shuffle
} from 'lucide-react';

export const QuizSetup = ({
  quizTitle,
  totalQuestions,
  onStartQuiz,
  savedQuiz,
  onResumeSavedQuiz,
  onDiscardSavedQuiz,
  onExitToMenu
}) => {
  const [mode, setMode] = useState('competitive');
  const [timeLimitSeconds, setTimeLimitSeconds] = useState(30);
  const [selectedCount, setSelectedCount] = useState(totalQuestions);
  const [difficulty, setDifficulty] = useState('all');

  const handleStart = (e) => {
    e.preventDefault();
    onStartQuiz({
      mode,
      timeLimitSeconds: mode === 'learning' ? 0 : timeLimitSeconds,
      difficulty,
      questionCount: selectedCount,
      shuffleQuestions: false,
      shuffleOptions: false
    });
  };

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '2rem 1.5rem', fontFamily: "'Inter', sans-serif", color: '#18181b' }}>
      
      {/* Resume Banner if In-Progress Quiz Found */}
      {savedQuiz && (
        <div style={{
          border: '1px solid #e2e8f0',
          background: '#f8fafc',
          padding: '1.25rem',
          borderRadius: 0,
          marginBottom: '2rem',
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem'
        }}>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <div style={{
              width: '40px', height: '40px', background: '#f1f5f9',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <RotateCcw size={18} color="#64748b" />
            </div>
            <div>
              <h4 style={{ margin: 0, fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Saved Arena Session Detected
              </h4>
              <p style={{ margin: '0.15rem 0 0 0', fontSize: '0.75rem', color: '#64748b' }}>
                Question: <strong>{savedQuiz.currentIndex + 1}</strong> of <strong>{savedQuiz.questions.length}</strong> • Current Score: <strong>{savedQuiz.score} pts</strong>
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={onResumeSavedQuiz}
              style={{
                background: '#18181b', color: 'white', border: 'none',
                padding: '0.5rem 1rem', fontSize: '0.75rem', fontWeight: 700,
                textTransform: 'uppercase', letterSpacing: '0.5px', cursor: 'pointer'
              }}
            >
              Resume Arena
            </button>
            <button
              onClick={onDiscardSavedQuiz}
              style={{
                background: 'white', color: '#ef4444', border: '1px solid #fecaca',
                padding: '0.5rem 1rem', fontSize: '0.75rem', fontWeight: 700,
                textTransform: 'uppercase', letterSpacing: '0.5px', cursor: 'pointer'
              }}
            >
              Discard
            </button>
          </div>
        </div>
      )}

      {/* Configuration Form */}
      <form onSubmit={handleStart} style={{ background: 'white', border: '1px solid #e2e8f0', padding: '2.5rem' }}>
        
        {/* Title Block */}
        <div style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '1.5rem', marginBottom: '2rem' }}>
          <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px' }}>
            Round Configuration
          </span>
          <h1 style={{ fontSize: '2.2rem', fontWeight: 300, margin: '0.25rem 0 0.5rem 0', color: '#09090b', letterSpacing: '-0.5px' }}>
            Configure Competition Arena
          </h1>
          <p style={{ margin: 0, fontSize: '0.9rem', color: '#71717a' }}>
            Choose domain, question count, difficulty, and competitive time controls.
          </p>
        </div>

        {/* 1. Target Domain */}
        <div style={{ marginBottom: '2rem' }}>
          <h3 style={{ fontSize: '0.78rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', color: '#71717a', marginBottom: '1rem' }}>
            1. Target Domain
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
            
            {/* General Knowledge */}
            <div style={{
              border: '2px solid #18181b', padding: '1.25rem', background: '#fff',
              position: 'relative', display: 'flex', flexDirection: 'column', gap: '0.5rem'
            }}>
              <span style={{
                position: 'absolute', top: '0.75rem', right: '0.75rem', fontSize: '0.65rem',
                fontWeight: 700, background: '#f4f4f5', padding: '0.15rem 0.4rem', fontFamily: 'monospace'
              }}>
                {totalQuestions} Qs
              </span>
              <Compass size={22} color="#18181b" />
              <div style={{ marginTop: '0.25rem' }}>
                <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 800, textTransform: 'uppercase' }}>
                  {quizTitle.replace('Mock Test', '').replace('Practice Quiz', '').trim()}
                </h4>
                <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.75rem', color: '#71717a', lineHeight: 1.4 }}>
                  History, Science, Geography, Polity, Economics & Arts
                </p>
              </div>
            </div>

            {/* Math/Reasoning placeholder */}
            <div style={{
              border: '1px solid #e4e4e7', padding: '1.25rem', background: '#fff',
              opacity: 0.5, display: 'flex', flexDirection: 'column', gap: '0.5rem'
            }}>
              <Calculator size={22} color="#71717a" />
              <div>
                <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 800, textTransform: 'uppercase', color: '#71717a' }}>
                  MATHEMATICS
                </h4>
                <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.75rem', color: '#a1a1aa' }}>
                  Arithmetic, Algebra, Geometry & Logic
                </p>
              </div>
            </div>

            {/* Mixed Arena */}
            <div style={{
              border: '1px solid #e4e4e7', padding: '1.25rem', background: '#fff',
              opacity: 0.5, display: 'flex', flexDirection: 'column', gap: '0.5rem'
            }}>
              <Shuffle size={22} color="#71717a" />
              <div>
                <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 800, textTransform: 'uppercase', color: '#71717a' }}>
                  MIXED ARENA
                </h4>
                <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.75rem', color: '#a1a1aa' }}>
                  Randomized pool combining Math & GK
                </p>
              </div>
            </div>

          </div>
        </div>

        {/* 2. Questions Per Round */}
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <h3 style={{ fontSize: '0.78rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', color: '#71717a', margin: 0 }}>
              2. Questions Per Round
            </h3>
            <span style={{ fontSize: '0.75rem', color: '#71717a' }}>
              Max available: <strong style={{ fontFamily: 'monospace' }}>{totalQuestions}</strong>
            </span>
          </div>
          
          <div style={{ display: 'flex', flexWrap: 'wrap', border: '1px solid #e4e4e7' }}>
            {[5, 10, 15, 20].map((count) => {
              const available = totalQuestions >= count;
              const active = selectedCount === count;
              return (
                <button
                  key={count}
                  type="button"
                  disabled={!available}
                  onClick={() => setSelectedCount(count)}
                  style={{
                    flex: 1, padding: '0.9rem 0', border: 'none', borderRight: '1px solid #e4e4e7',
                    background: active ? '#18181b' : 'white',
                    color: active ? 'white' : available ? '#18181b' : '#a1a1aa',
                    fontWeight: 700, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.5px',
                    cursor: available ? 'pointer' : 'not-allowed', transition: 'all 0.15s',
                    minWidth: '100px'
                  }}
                >
                  {count} Questions
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => setSelectedCount(totalQuestions)}
              style={{
                flex: 1, padding: '0.9rem 0', border: 'none',
                background: selectedCount === totalQuestions ? '#18181b' : 'white',
                color: selectedCount === totalQuestions ? 'white' : '#18181b',
                fontWeight: 700, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.5px',
                cursor: 'pointer', minWidth: '100px'
              }}
            >
              Full set ({totalQuestions})
            </button>
          </div>
        </div>

        {/* 3. Difficulty Calibration */}
        <div style={{ marginBottom: '2rem' }}>
          <h3 style={{ fontSize: '0.78rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', color: '#71717a', marginBottom: '0.75rem' }}>
            3. Difficulty Calibration
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.5rem' }}>
            
            <button
              type="button"
              onClick={() => setDifficulty('all')}
              style={{
                border: difficulty === 'all' ? '2px solid #18181b' : '1px solid #e4e4e7',
                background: difficulty === 'all' ? '#18181b' : 'white',
                color: difficulty === 'all' ? 'white' : '#18181b',
                padding: '0.8rem', textAlign: 'left', cursor: 'pointer'
              }}
            >
              <strong style={{ display: 'block', fontSize: '0.8rem', textTransform: 'uppercase' }}>All Levels</strong>
              <span style={{ fontSize: '0.7rem', opacity: 0.8 }}>Balanced distribution</span>
            </button>

            <button
              type="button"
              onClick={() => setDifficulty('easy')}
              style={{
                border: difficulty === 'easy' ? '2px solid #18181b' : '1px solid #e4e4e7',
                background: difficulty === 'easy' ? '#18181b' : 'white',
                color: difficulty === 'easy' ? 'white' : '#18181b',
                padding: '0.8rem', textAlign: 'left', cursor: 'pointer'
              }}
            >
              <strong style={{ display: 'block', fontSize: '0.8rem', textTransform: 'uppercase' }}>Easy</strong>
              <span style={{ fontSize: '0.7rem', opacity: 0.8 }}>100 pts / Question</span>
            </button>

            <button
              type="button"
              onClick={() => setDifficulty('medium')}
              style={{
                border: difficulty === 'medium' ? '2px solid #18181b' : '1px solid #e4e4e7',
                background: difficulty === 'medium' ? '#18181b' : 'white',
                color: difficulty === 'medium' ? 'white' : '#18181b',
                padding: '0.8rem', textAlign: 'left', cursor: 'pointer'
              }}
            >
              <strong style={{ display: 'block', fontSize: '0.8rem', textTransform: 'uppercase' }}>Medium</strong>
              <span style={{ fontSize: '0.7rem', opacity: 0.8 }}>150 pts / Question</span>
            </button>

            <button
              type="button"
              onClick={() => setDifficulty('hard')}
              style={{
                border: difficulty === 'hard' ? '2px solid #18181b' : '1px solid #e4e4e7',
                background: difficulty === 'hard' ? '#18181b' : 'white',
                color: difficulty === 'hard' ? 'white' : '#18181b',
                padding: '0.8rem', textAlign: 'left', cursor: 'pointer'
              }}
            >
              <strong style={{ display: 'block', fontSize: '0.8rem', textTransform: 'uppercase' }}>Hard</strong>
              <span style={{ fontSize: '0.7rem', opacity: 0.8 }}>220 pts / Question</span>
            </button>

          </div>
        </div>

        {/* 4. Game Mode & 5. Time Limit per Question */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem', marginBottom: '2.5rem' }}>
          
          {/* Game Mode */}
          <div>
            <h3 style={{ fontSize: '0.78rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', color: '#71717a', marginBottom: '0.75rem' }}>
              ⚡ 4. Game Mode
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              
              <button
                type="button"
                onClick={() => setMode('competitive')}
                style={{
                  border: mode === 'competitive' ? '2px solid #18181b' : '1px solid #e4e4e7',
                  background: mode === 'competitive' ? '#18181b' : 'white',
                  color: mode === 'competitive' ? 'white' : '#18181b',
                  padding: '0.9rem 1.25rem', textAlign: 'left', cursor: 'pointer', width: '100%'
                }}
              >
                <strong style={{ display: 'block', fontSize: '0.8rem', textTransform: 'uppercase' }}>Competitive</strong>
                <span style={{ fontSize: '0.7rem', opacity: 0.8 }}>Speed bonuses, streak combos & ranking.</span>
              </button>

              <button
                type="button"
                onClick={() => setMode('learning')}
                style={{
                  border: mode === 'learning' ? '2px solid #18181b' : '1px solid #e4e4e7',
                  background: mode === 'learning' ? '#18181b' : 'white',
                  color: mode === 'learning' ? 'white' : '#18181b',
                  padding: '0.9rem 1.25rem', textAlign: 'left', cursor: 'pointer', width: '100%'
                }}
              >
                <strong style={{ display: 'block', fontSize: '0.8rem', textTransform: 'uppercase' }}>Learning</strong>
                <span style={{ fontSize: '0.7rem', opacity: 0.8 }}>Instant step-by-step solutions per question.</span>
              </button>

            </div>
          </div>

          {/* Time Limit */}
          <div>
            <h3 style={{ fontSize: '0.78rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', color: '#71717a', marginBottom: '0.75rem' }}>
              🕒 5. Time Limit Per Question
            </h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', border: '1px solid #e4e4e7' }}>
              {[15, 30, 45].map((sec) => (
                <button
                  key={sec}
                  type="button"
                  disabled={mode === 'learning'}
                  onClick={() => setTimeLimitSeconds(sec)}
                  style={{
                    padding: '1rem 0', border: 'none', borderRight: '1px solid #e4e4e7',
                    background: mode === 'learning' ? '#f4f4f5' : (timeLimitSeconds === sec ? '#18181b' : 'white'),
                    color: mode === 'learning' ? '#a1a1aa' : (timeLimitSeconds === sec ? 'white' : '#18181b'),
                    fontWeight: 700, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.5px',
                    cursor: mode === 'learning' ? 'not-allowed' : 'pointer'
                  }}
                >
                  <span style={{ display: 'block' }}>{sec}s</span>
                  <span style={{ fontSize: '0.55rem', opacity: 0.7, fontWeight: 400 }}>
                    {sec === 15 ? 'FAST' : sec === 30 ? 'STANDARD' : 'DEEP'}
                  </span>
                </button>
              ))}
              <button
                type="button"
                disabled={mode === 'learning'}
                onClick={() => setTimeLimitSeconds(0)}
                style={{
                  padding: '1rem 0', border: 'none',
                  background: mode === 'learning' ? '#f4f4f5' : (timeLimitSeconds === 0 ? '#18181b' : 'white'),
                  color: mode === 'learning' ? '#a1a1aa' : (timeLimitSeconds === 0 ? 'white' : '#18181b'),
                  fontWeight: 700, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.5px',
                  cursor: mode === 'learning' ? 'not-allowed' : 'pointer'
                }}
              >
                <span style={{ display: 'block' }}>None</span>
                <span style={{ fontSize: '0.55rem', opacity: 0.7, fontWeight: 400 }}>UNTIMED</span>
              </button>
            </div>
          </div>

        </div>

        {/* Launch Button */}
        <button
          type="submit"
          style={{
            background: '#18181b', color: 'white', border: 'none', width: '100%',
            padding: '1.25rem', fontSize: '0.95rem', fontWeight: 800, textTransform: 'uppercase',
            letterSpacing: '1.5px', cursor: 'pointer', display: 'flex', alignItems: 'center',
            justifyContent: 'center', gap: '0.75rem', transition: 'background-color 0.2s'
          }}
        >
          <Play size={16} fill="white" /> Launch Arena Session
        </button>

        <button
          type="button"
          onClick={onExitToMenu}
          style={{
            background: 'transparent', color: '#71717a', border: '1px dashed #e4e4e7',
            width: '100%', padding: '0.9rem', fontSize: '0.8rem', fontWeight: 700,
            textTransform: 'uppercase', letterSpacing: '1px', cursor: 'pointer', marginTop: '0.75rem'
          }}
        >
          Return to library
        </button>

      </form>
    </div>
  );
};
