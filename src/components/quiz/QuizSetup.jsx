import React, { useState } from 'react';
import { 
  Play, 
  RotateCcw, 
  Trash2, 
  Clock, 
  BookOpen, 
  Compass, 
  Languages, 
  CheckCircle2, 
  ArrowRight, 
  ArrowLeft,
  FileText,
  ShieldCheck,
  Check,
  Award,
  ChevronRight
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
  const [currentStep, setCurrentStep] = useState('config'); // 'config' | 'instructions'
  const [selectedCount, setSelectedCount] = useState(totalQuestions || 50);
  const [language, setLanguage] = useState('en'); // 'en' | 'hi'
  
  // Calculate recommended duration: 1 minute per question, rounded to standard minutes (minimum 10 mins)
  const defaultDuration = Math.max(10, Math.min(120, Math.ceil((totalQuestions || 50) * 1)));
  const [durationMinutes, setDurationMinutes] = useState(defaultDuration);
  const [acknowledged, setAcknowledged] = useState(false);

  // Update duration when question count changes
  const handleCountChange = (count) => {
    setSelectedCount(count);
    const recommended = Math.max(10, Math.min(120, Math.ceil(count * 1)));
    setDurationMinutes(recommended);
  };

  const handleProceedToInstructions = (e) => {
    e.preventDefault();
    setCurrentStep('instructions');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleStartTest = (e) => {
    e.preventDefault();
    onStartQuiz({
      mode: 'exam',
      language,
      questionCount: selectedCount,
      totalDurationSeconds: durationMinutes * 60,
      markingScheme: {
        correct: 2,
        incorrect: 0.5,
        unattempted: 0
      },
      shuffleQuestions: false,
      shuffleOptions: false
    });
  };

  const cleanTitle = (quizTitle || 'Full Mock Test')
    .replace(/^Mock Test\s*-\s*/i, '')
    .replace(/^Practice Quiz\s*-\s*/i, '')
    .trim();

  return (
    <div style={{ maxWidth: '980px', margin: '0 auto', padding: '1.5rem 1.25rem 3rem 1.25rem', fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif", color: '#0f172a' }}>
      
      {/* TOP NAVIGATION & PROMINENT BACK BAR */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <button
          type="button"
          onClick={onExitToMenu}
          style={{
            background: '#ffffff',
            border: '1px solid #cbd5e1',
            borderRadius: '8px',
            padding: '0.55rem 1.15rem',
            color: '#334155',
            fontSize: '0.85rem',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
            transition: 'all 0.15s ease'
          }}
        >
          <ArrowLeft size={16} /> Back to Test Library
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.78rem', color: '#64748b' }}>
          <span style={{ cursor: 'pointer' }} onClick={onExitToMenu}>Exams</span>
          <ChevronRight size={12} />
          <span style={{ cursor: 'pointer' }} onClick={onExitToMenu}>Mock Tests</span>
          <ChevronRight size={12} />
          <span style={{ color: '#0f172a', fontWeight: 700 }}>
            {cleanTitle.length > 30 ? cleanTitle.substring(0, 30) + '...' : cleanTitle}
          </span>
        </div>
      </div>

      {/* Resume Banner if In-Progress Test Found */}
      {savedQuiz && (
        <div style={{
          border: '1px solid #bcf0da',
          background: '#f0fdf4',
          borderRadius: '12px',
          padding: '1.25rem 1.5rem',
          marginBottom: '1.75rem',
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
          boxShadow: '0 2px 8px rgba(13, 74, 43, 0.08)'
        }}>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <div style={{
              width: '44px', height: '44px', background: '#dcfce7',
              borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <RotateCcw size={20} color="#15803d" />
            </div>
            <div>
              <h4 style={{ margin: 0, fontSize: '0.88rem', fontWeight: 800, color: '#166534', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Saved Test Session Detected
              </h4>
              <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.8rem', color: '#15803d' }}>
                Question: <strong>{savedQuiz.currentIndex + 1}</strong> of <strong>{savedQuiz.questions.length}</strong> • Time Left: <strong>{Math.ceil((savedQuiz.timeRemaining || 0) / 60)} min</strong>
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button
              onClick={onResumeSavedQuiz}
              style={{
                background: '#0d4a2b', color: 'white', border: 'none',
                padding: '0.6rem 1.25rem', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 800,
                textTransform: 'uppercase', letterSpacing: '0.5px', cursor: 'pointer',
                boxShadow: '0 2px 4px rgba(13, 74, 43, 0.2)'
              }}
            >
              Resume Test
            </button>
            <button
              onClick={onDiscardSavedQuiz}
              style={{
                background: 'white', color: '#ef4444', border: '1px solid #fecaca',
                padding: '0.6rem 1rem', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 700,
                textTransform: 'uppercase', letterSpacing: '0.5px', cursor: 'pointer'
              }}
            >
              Discard
            </button>
          </div>
        </div>
      )}

      {/* Main Container Card */}
      <div style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '16px',
        padding: '2.5rem 2rem',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)'
      }}>
        
        {/* Step Indicator & Header (Matching VeerNXT Branding) */}
        <div style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '1.75rem', marginBottom: '2rem' }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{
                background: '#f0fdf4',
                color: '#15803d',
                border: '1px solid #bcf0da',
                fontSize: '0.72rem',
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: '0.75px',
                padding: '0.25rem 0.65rem',
                borderRadius: '6px'
              }}>
                VeerNXT Examination Portal
              </span>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>•</span>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>
                {currentStep === 'config' ? 'Step 1 of 2: Test Parameters' : 'Step 2 of 2: Exam Instructions'}
              </span>
            </div>

            {/* Stepper Navigation Pills */}
            <div style={{ display: 'flex', gap: '0.5rem', background: '#f8fafc', padding: '0.25rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <button
                type="button"
                onClick={() => setCurrentStep('config')}
                style={{
                  border: 'none',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  padding: '0.4rem 0.85rem',
                  borderRadius: '6px',
                  background: currentStep === 'config' ? '#0d4a2b' : 'transparent',
                  color: currentStep === 'config' ? '#ffffff' : '#64748b',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  transition: 'all 0.15s ease'
                }}
              >
                <span>1. Configuration</span>
              </button>

              <button
                type="button"
                onClick={() => setCurrentStep('instructions')}
                style={{
                  border: 'none',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  padding: '0.4rem 0.85rem',
                  borderRadius: '6px',
                  background: currentStep === 'instructions' ? '#0d4a2b' : 'transparent',
                  color: currentStep === 'instructions' ? '#ffffff' : '#64748b',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  transition: 'all 0.15s ease'
                }}
              >
                <span>2. Instructions</span>
              </button>
            </div>
          </div>

          <h1 style={{ fontSize: '1.85rem', fontWeight: 800, margin: '0.5rem 0 0.4rem 0', color: '#0f172a', letterSpacing: '-0.5px' }}>
            {currentStep === 'config' ? 'Configure Exam Practice' : 'Examination Guidelines & Instructions'}
          </h1>
          <p style={{ margin: 0, fontSize: '0.9rem', color: '#64748b', lineHeight: 1.5 }}>
            {currentStep === 'config'
              ? 'Select question count, overall timer duration, and preferred medium before entering the exam arena.'
              : 'Please read the examination scheme, marking rules, and navigation guidelines before starting.'}
          </p>
        </div>

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* STEP 1: CONFIGURATION VIEW */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        {currentStep === 'config' && (
          <form onSubmit={handleProceedToInstructions}>
            
            {/* 1. Target Subject / Paper Card */}
            <div style={{ marginBottom: '2rem' }}>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.75px', color: '#475569', marginBottom: '0.75rem' }}>
                1. Target Subject / Paper
              </label>
              
              <div style={{
                border: '1.5px solid #0d4a2b',
                borderRadius: '12px',
                padding: '1.5rem',
                background: '#f8fafc',
                position: 'relative',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '1rem',
                boxShadow: '0 2px 8px rgba(13, 74, 43, 0.05)'
              }}>
                <div style={{
                  width: '46px', height: '46px',
                  background: '#f0fdf4',
                  border: '1px solid #bcf0da',
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <Compass size={24} color="#0d4a2b" />
                </div>

                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.35rem' }}>
                    <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.2px' }}>
                      {cleanTitle}
                    </h3>
                    <span style={{
                      fontSize: '0.75rem',
                      fontWeight: 800,
                      background: '#f0fdf4',
                      color: '#15803d',
                      border: '1px solid #bcf0da',
                      padding: '0.25rem 0.65rem',
                      borderRadius: '6px',
                      fontFamily: 'monospace'
                    }}>
                      {totalQuestions} Qs Available
                    </span>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.82rem', color: '#64748b', lineHeight: 1.5 }}>
                    Full Standard Competitive Syllabus & Official Benchmark Practice Pool
                  </p>
                </div>
              </div>
            </div>

            {/* 2. Questions Per Test */}
            <div style={{ marginBottom: '2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <label style={{ fontSize: '0.78rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.75px', color: '#475569', margin: 0 }}>
                  2. Questions Per Test
                </label>
                <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                  Total Pool: <strong style={{ color: '#0d4a2b', fontFamily: 'monospace' }}>{totalQuestions} Qs</strong>
                </span>
              </div>
              
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                gap: '0.65rem'
              }}>
                {[5, 10, 15, 20].map((count) => {
                  const available = totalQuestions >= count;
                  const active = selectedCount === count;
                  return (
                    <button
                      key={count}
                      type="button"
                      disabled={!available}
                      onClick={() => handleCountChange(count)}
                      style={{
                        padding: '0.85rem 0.5rem',
                        borderRadius: '8px',
                        border: active ? '2px solid #0d4a2b' : '1px solid #e2e8f0',
                        background: active ? '#0d4a2b' : available ? '#ffffff' : '#f8fafc',
                        color: active ? '#ffffff' : available ? '#1e293b' : '#cbd5e1',
                        fontWeight: 800,
                        fontSize: '0.82rem',
                        cursor: available ? 'pointer' : 'not-allowed',
                        transition: 'all 0.15s ease',
                        boxShadow: active ? '0 2px 6px rgba(13, 74, 43, 0.25)' : 'none'
                      }}
                    >
                      {count} Questions
                    </button>
                  );
                })}

                <button
                  type="button"
                  onClick={() => handleCountChange(totalQuestions)}
                  style={{
                    padding: '0.85rem 0.5rem',
                    borderRadius: '8px',
                    border: selectedCount === totalQuestions ? '2px solid #0d4a2b' : '1px solid #e2e8f0',
                    background: selectedCount === totalQuestions ? '#0d4a2b' : '#ffffff',
                    color: selectedCount === totalQuestions ? '#ffffff' : '#1e293b',
                    fontWeight: 800,
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    boxShadow: selectedCount === totalQuestions ? '0 2px 6px rgba(13, 74, 43, 0.25)' : 'none'
                  }}
                >
                  Full Set ({totalQuestions})
                </button>
              </div>
            </div>

            {/* 3. Language & Overall Timer Options (2-Column Grid) */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.75rem', marginBottom: '2.5rem' }}>
              
              {/* Test Language Selection */}
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.78rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.75px', color: '#475569', marginBottom: '0.75rem' }}>
                  <Languages size={15} color="#0d4a2b" /> 3. Test Language
                </label>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <button
                    type="button"
                    onClick={() => setLanguage('en')}
                    style={{
                      border: language === 'en' ? '2px solid #16a34a' : '1px solid #e2e8f0',
                      background: language === 'en' ? '#f0fdf4' : '#ffffff',
                      color: language === 'en' ? '#0d4a2b' : '#475569',
                      padding: '1.1rem 0.75rem',
                      borderRadius: '10px',
                      textAlign: 'center',
                      cursor: 'pointer',
                      position: 'relative',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {language === 'en' && (
                      <span style={{ position: 'absolute', top: '0.5rem', right: '0.5rem', color: '#16a34a' }}>
                        <Check size={16} />
                      </span>
                    )}
                    <strong style={{ display: 'block', fontSize: '0.92rem', fontWeight: 800 }}>English</strong>
                    <span style={{ fontSize: '0.72rem', color: language === 'en' ? '#15803d' : '#94a3b8' }}>Default Medium</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setLanguage('hi')}
                    style={{
                      border: language === 'hi' ? '2px solid #16a34a' : '1px solid #e2e8f0',
                      background: language === 'hi' ? '#f0fdf4' : '#ffffff',
                      color: language === 'hi' ? '#0d4a2b' : '#475569',
                      padding: '1.1rem 0.75rem',
                      borderRadius: '10px',
                      textAlign: 'center',
                      cursor: 'pointer',
                      position: 'relative',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {language === 'hi' && (
                      <span style={{ position: 'absolute', top: '0.5rem', right: '0.5rem', color: '#16a34a' }}>
                        <Check size={16} />
                      </span>
                    )}
                    <strong style={{ display: 'block', fontSize: '0.92rem', fontWeight: 800 }}>हिंदी (Hindi)</strong>
                    <span style={{ fontSize: '0.72rem', color: language === 'hi' ? '#15803d' : '#94a3b8' }}>हिंदी माध्यम</span>
                  </button>
                </div>
              </div>

              {/* Overall Test Duration (Unified Timer) */}
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.78rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.75px', color: '#475569', marginBottom: '0.75rem' }}>
                  <Clock size={15} color="#0d4a2b" /> 4. Overall Test Duration
                </label>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem' }}>
                  {[15, 30, 45, 60].map((mins) => (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => setDurationMinutes(mins)}
                      style={{
                        padding: '0.75rem 0.25rem',
                        borderRadius: '8px',
                        border: durationMinutes === mins ? '2px solid #0d4a2b' : '1px solid #e2e8f0',
                        background: durationMinutes === mins ? '#0d4a2b' : '#ffffff',
                        color: durationMinutes === mins ? '#ffffff' : '#334155',
                        fontWeight: 800,
                        fontSize: '0.85rem',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        textAlign: 'center',
                        boxShadow: durationMinutes === mins ? '0 2px 6px rgba(13, 74, 43, 0.25)' : 'none'
                      }}
                    >
                      <span style={{ display: 'block' }}>{mins}m</span>
                      <span style={{ fontSize: '0.62rem', opacity: durationMinutes === mins ? 0.85 : 0.6, fontWeight: 600 }}>
                        {mins} MINS
                      </span>
                    </button>
                  ))}
                </div>
                <div style={{ marginTop: '0.6rem', fontSize: '0.75rem', color: '#64748b', lineHeight: 1.4 }}>
                  One single continuous countdown timer for the entire test. Auto-submits on expiry.
                </div>
              </div>

            </div>

            {/* Step 1 Action Buttons: Symmetrical with Step 2 */}
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginTop: '1rem' }}>
              <button
                type="button"
                onClick={onExitToMenu}
                style={{
                  background: 'white',
                  color: '#475569',
                  border: '1px solid #cbd5e1',
                  borderRadius: '10px',
                  padding: '1rem 1.5rem',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
                }}
              >
                <ArrowLeft size={16} /> Back to Test Library
              </button>

              <button
                type="submit"
                style={{
                  flex: 1,
                  minWidth: '220px',
                  background: '#0d4a2b',
                  color: 'white',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '1rem 2rem',
                  fontSize: '0.95rem',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.75rem',
                  boxShadow: '0 4px 14px rgba(13, 74, 43, 0.25)',
                  transition: 'background-color 0.15s ease'
                }}
              >
                Proceed to Instructions <ArrowRight size={18} />
              </button>
            </div>

          </form>
        )}

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* STEP 2: INSTRUCTIONS SCREEN */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        {currentStep === 'instructions' && (
          <form onSubmit={handleStartTest}>
            
            {/* Quick Summary Pill Bar (4 Themed Tiles) */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
              gap: '0.85rem',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '1.25rem',
              marginBottom: '2rem'
            }}>
              <div style={{ background: 'white', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Test Duration</span>
                <strong style={{ display: 'block', fontSize: '1.1rem', color: '#0d4a2b', marginTop: '0.15rem' }}>{durationMinutes} Minutes</strong>
              </div>
              <div style={{ background: 'white', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Questions</span>
                <strong style={{ display: 'block', fontSize: '1.1rem', color: '#0d4a2b', marginTop: '0.15rem' }}>{selectedCount} MCQs</strong>
              </div>
              <div style={{ background: 'white', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Maximum Marks</span>
                <strong style={{ display: 'block', fontSize: '1.1rem', color: '#0d4a2b', marginTop: '0.15rem' }}>{selectedCount * 2} Marks</strong>
              </div>
              <div style={{ background: 'white', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Selected Medium</span>
                <strong style={{ display: 'block', fontSize: '1.1rem', color: '#0d4a2b', marginTop: '0.15rem' }}>
                  {language === 'hi' ? 'हिंदी (Hindi)' : 'English'}
                </strong>
              </div>
            </div>

            {/* Instruction Points */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginBottom: '2rem' }}>
              
              {/* Marking Scheme */}
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px', padding: '1.25rem', background: '#ffffff' }}>
                <h4 style={{ margin: '0 0 0.65rem 0', fontSize: '0.88rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#0f172a' }}>
                  <Award size={18} color="#0d4a2b" /> 1. Marking Scheme & Scoring
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.85rem', color: '#334155', lineHeight: 1.5 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ background: '#f0fdf4', color: '#16a34a', border: '1px solid #bcf0da', fontWeight: 800, fontSize: '0.75rem', padding: '0.15rem 0.5rem', borderRadius: '4px' }}>
                      +2.00
                    </span>
                    <span>Marks awarded for each correct answer.</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', fontWeight: 800, fontSize: '0.75rem', padding: '0.15rem 0.5rem', borderRadius: '4px' }}>
                      -0.50
                    </span>
                    <span>Marks deducted for each incorrect answer (Negative marking penalty).</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ background: '#f8fafc', color: '#64748b', border: '1px solid #e2e8f0', fontWeight: 800, fontSize: '0.75rem', padding: '0.15rem 0.5rem', borderRadius: '4px' }}>
                      0.00
                    </span>
                    <span>Marks for unattempted questions (no penalty).</span>
                  </div>
                </div>
              </div>

              {/* Navigation Rules */}
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px', padding: '1.25rem', background: '#ffffff' }}>
                <h4 style={{ margin: '0 0 0.65rem 0', fontSize: '0.88rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#0f172a' }}>
                  <Clock size={18} color="#0d4a2b" /> 2. Test Rules & Navigation
                </h4>
                <ul style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.85rem', color: '#475569', lineHeight: 1.6 }}>
                  <li><strong>Single Overall Timer:</strong> A continuous countdown timer monitors total remaining time in the top header.</li>
                  <li><strong>Free Navigation:</strong> Jump freely between questions using <strong>Previous</strong>, <strong>Save & Next</strong>, or clicking on the <strong>Question Palette</strong>.</li>
                  <li><strong>Answer Editing:</strong> You can change or clear your answer at any time prior to submitting the test.</li>
                  <li><strong>Mark for Review:</strong> Flag questions for later review using the review marker.</li>
                  <li><strong>Auto-Submission:</strong> The test automatically finalizes and calculates your results if the timer expires.</li>
                </ul>
              </div>

              {/* Solutions Policy */}
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px', padding: '1.25rem', background: '#ffffff' }}>
                <h4 style={{ margin: '0 0 0.65rem 0', fontSize: '0.88rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#0f172a' }}>
                  <CheckCircle2 size={18} color="#16a34a" /> 3. Solutions & Performance Analytics
                </h4>
                <p style={{ margin: 0, fontSize: '0.85rem', color: '#475569', lineHeight: 1.6 }}>
                  To ensure authentic exam simulation conditions, solutions and explanations are concealed during the test. Complete question-by-question explanations, key takeaways, and comprehensive scoring metrics will be presented on your <strong>Assessment Report</strong> immediately following submission.
                </p>
              </div>

            </div>

            {/* Declaration Checkbox */}
            <div style={{
              background: acknowledged ? '#f0fdf4' : '#f8fafc',
              border: acknowledged ? '1.5px solid #16a34a' : '1px solid #e2e8f0',
              borderRadius: '10px',
              padding: '1.25rem',
              marginBottom: '2rem',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.75rem',
              transition: 'all 0.15s ease'
            }}>
              <input
                type="checkbox"
                id="exam-ack"
                checked={acknowledged}
                onChange={(e) => setAcknowledged(e.target.checked)}
                style={{ marginTop: '0.2rem', width: '18px', height: '18px', cursor: 'pointer', accentColor: '#16a34a' }}
              />
              <label htmlFor="exam-ack" style={{ fontSize: '0.85rem', color: '#1e293b', cursor: 'pointer', lineHeight: 1.5, fontWeight: 600 }}>
                I have read and understood all the above instructions and rules. I declare that I will take this examination in good faith and adhere to standard examination conduct.
              </label>
            </div>

            {/* Final Action Buttons */}
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => setCurrentStep('config')}
                style={{
                  background: 'white',
                  color: '#475569',
                  border: '1px solid #cbd5e1',
                  borderRadius: '10px',
                  padding: '1rem 1.5rem',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                <ArrowLeft size={16} /> Back to Parameters
              </button>

              <button
                type="submit"
                disabled={!acknowledged}
                style={{
                  flex: 1,
                  minWidth: '220px',
                  background: acknowledged ? '#0d4a2b' : '#94a3b8',
                  color: 'white',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '1rem 2rem',
                  fontSize: '0.95rem',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                  cursor: acknowledged ? 'pointer' : 'not-allowed',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.75rem',
                  boxShadow: acknowledged ? '0 4px 14px rgba(13, 74, 43, 0.3)' : 'none',
                  transition: 'all 0.2s ease'
                }}
              >
                <Play size={18} fill="white" /> Start Test
              </button>
            </div>

          </form>
        )}

      </div>
    </div>
  );
};
