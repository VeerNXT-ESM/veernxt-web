import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { RefreshCw, Lock, Crown } from 'lucide-react';
import { getEffectiveTier, canTakeQuiz } from '../lib/subscriptionAccess';
import { awardPoints } from '../lib/awardPoints';
import { QuizSetup } from './quiz/QuizSetup';
import { QuizView } from './quiz/QuizView';
import { QuizResults } from './quiz/QuizResults';

const MAX_QUIZ_QUESTIONS = 6;

const InteractiveQuiz = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [quiz, setQuiz] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [effectiveTier, setEffectiveTier] = useState('FREE');
  const [freeQuizUsed, setFreeQuizUsed] = useState(false);
  const [isFreeAttempt, setIsFreeAttempt] = useState(false);

  // Quiz Engine State
  const [quizPhase, setQuizPhase] = useState('setup'); // 'setup' | 'active' | 'results'
  const [activeQuiz, setActiveQuiz] = useState(null);
  const [savedQuiz, setSavedQuiz] = useState(null);

  // Load Quiz & Check Permissions
  useEffect(() => {
    const fetchQuiz = async () => {
      try {
        let tier = 'FREE';
        let quizUsed = false;

        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            const { data: profile } = await supabase
              .from('user_profiles')
              .select('subscription_tier, subscription_expires_at, free_quiz_used')
              .eq('id', session.user.id)
              .maybeSingle();
            if (profile) {
              tier = getEffectiveTier(profile.subscription_tier, profile.subscription_expires_at);
              setEffectiveTier(tier);
              quizUsed = !!profile.free_quiz_used;
              setFreeQuizUsed(quizUsed);
            }
          }
        } catch (err) {
          console.error('Error fetching subscription tier:', err);
        }

        const quizDataRes = await supabase.from('quizzes').select('*').eq('id', id).single();
        const quizData = quizDataRes.data;

        if (!quizData) {
          setLoading(false);
          return;
        }

        const quizAccess = canTakeQuiz(tier, quizUsed);
        if (!quizAccess.allowed) {
          setQuiz(quizData);
          setLoading(false);
          return;
        }

        setIsFreeAttempt(!!quizAccess.isFreeAttempt);

        const { data: questionsData } = await supabase.from('questions').select('*').eq('quiz_id', id).order('question_number');
        
        // Clean options and extract dynamic explanations
        const parsedQuestions = (questionsData || []).map(q => {
          let dynamicExplanation = null;
          const cleanOptions = {};
          if (q.options) {
            Object.entries(q.options).forEach(([k, v]) => {
              if (typeof v === 'string') {
                const markerRegex = /(?:<[^>]+>|\s)*(?:(?:✓|✔|&#10003;|&#10004;|&check;)?\s*Correct(?:\s*Answer:?)?|Answer:|💡\s*Explanation:|Explanation:)/i;
                const fullMatchIdx = v.search(markerRegex);
                if (fullMatchIdx !== -1 && fullMatchIdx > 0) {
                  cleanOptions[k] = v.substring(0, fullMatchIdx);
                  const extra = v.substring(fullMatchIdx).replace(/^(?:<[^>]+>|\s)*/i, '');
                  if (!dynamicExplanation) dynamicExplanation = extra;
                } else {
                  cleanOptions[k] = v;
                }
              } else {
                cleanOptions[k] = v;
              }
            });
          }
          return {
            ...q,
            options: cleanOptions,
            explanation: q.explanation || dynamicExplanation
          };
        });

        // Sample a subset of questions for the session
        const sampled = parsedQuestions.length > MAX_QUIZ_QUESTIONS
          ? [...parsedQuestions]
              .sort(() => Math.random() - 0.5)
              .slice(0, MAX_QUIZ_QUESTIONS)
              .sort((a, b) => a.question_number - b.question_number)
          : parsedQuestions;

        // Map Supabase questions to QuizMaster Model
        const mappedQuestions = sampled.map(q => {
          const optionKeys = Object.keys(q.options).sort();
          const optionsArray = optionKeys.map(k => q.options[k]);
          const correctIndex = optionKeys.indexOf(q.correct_answer);

          return {
            id: q.id,
            category: quizData.subject || 'general_knowledge',
            difficulty: q.difficulty || 'medium',
            question: q.question_text,
            options: optionsArray,
            correctIndex: correctIndex !== -1 ? correctIndex : 0,
            explanation: q.explanation || '',
            originalKeys: optionKeys // to map selected index back to A, B, C, D
          };
        });

        setQuiz(quizData);
        setQuestions(mappedQuestions);

        // Check if there is an in-progress saved session in localStorage
        const localSaved = localStorage.getItem('active_quiz_' + id);
        if (localSaved) {
          try {
            const parsedSaved = JSON.parse(localSaved);
            if (parsedSaved && !parsedSaved.isFinished) {
              setSavedQuiz(parsedSaved);
            }
          } catch (e) {
            console.error('Error loading saved quiz session:', e);
          }
        }

      } catch (err) {
        console.error('Error fetching quiz:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchQuiz();
  }, [id]);

  // Handler: Start a new quiz session
  const handleStartQuiz = (config) => {
    const newQuizState = {
      id: 'quiz-' + Date.now(),
      startedAt: Date.now(),
      config,
      questions: questions,
      currentIndex: 0,
      answers: {},
      score: 0,
      currentStreak: 0,
      maxStreak: 0,
      bookmarkedIds: [],
      isFinished: false,
      timeRemaining: config.timeLimitSeconds
    };

    setActiveQuiz(newQuizState);
    localStorage.setItem('active_quiz_' + id, JSON.stringify(newQuizState));
    setQuizPhase('active');
  };

  // Handler: Update User Answers and progress to next question
  const handleUpdateAnswer = (newAnswer, nextIndex, newScore, newStreak, newMaxStreak) => {
    setActiveQuiz(prev => {
      if (!prev) return prev;
      
      const updatedAnswers = { ...prev.answers };
      if (newAnswer) {
        updatedAnswers[newAnswer.questionId] = newAnswer;
      }

      const updated = {
        ...prev,
        currentIndex: nextIndex,
        answers: updatedAnswers,
        score: newScore,
        currentStreak: newStreak,
        maxStreak: newMaxStreak
      };

      localStorage.setItem('active_quiz_' + id, JSON.stringify(updated));
      return updated;
    });
  };

  // Handler: Bookmark toggle
  const handleToggleBookmark = (questionId) => {
    setActiveQuiz(prev => {
      if (!prev) return prev;
      const isBookmarked = prev.bookmarkedIds.includes(questionId);
      const updatedBookmarks = isBookmarked
        ? prev.bookmarkedIds.filter(bid => bid !== questionId)
        : [...prev.bookmarkedIds, questionId];
      
      const updated = { ...prev, bookmarkedIds: updatedBookmarks };
      localStorage.setItem('active_quiz_' + id, JSON.stringify(updated));
      return updated;
    });
  };

  // Handler: Resume Saved Session
  const handleResumeSavedQuiz = () => {
    if (savedQuiz) {
      setActiveQuiz(savedQuiz);
      setQuizPhase('active');
    }
  };

  // Handler: Discard Saved Session
  const handleDiscardSavedQuiz = () => {
    localStorage.removeItem('active_quiz_' + id);
    setSavedQuiz(null);
  };

  // Handler: Complete Assessment & Sync with Supabase
  const handleFinishQuiz = async () => {
    if (!activeQuiz) return;

    const answersList = Object.values(activeQuiz.answers);
    const correctCount = answersList.filter(a => a.isCorrect).length;
    const scorePercent = (correctCount / questions.length) * 100;

    // Build DB answer map
    const dbAnswersMap = {};
    questions.forEach(q => {
      const ansObj = activeQuiz.answers[q.id];
      if (ansObj && ansObj.selectedIndex !== null) {
        dbAnswersMap[q.id] = q.originalKeys[ansObj.selectedIndex];
      } else {
        dbAnswersMap[q.id] = 'N/A';
      }
    });

    const finalQuizState = {
      ...activeQuiz,
      isFinished: true
    };
    setActiveQuiz(finalQuizState);
    localStorage.removeItem('active_quiz_' + id);
    setSavedQuiz(null);
    setQuizPhase('results');

    // Save to Database
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      await supabase.from('quiz_attempts').insert({
        user_id: session.user.id,
        quiz_id: id,
        quiz_title: quiz.title,
        total_questions: questions.length,
        answered_questions: answersList.length,
        correct_answers: correctCount,
        score_percent: scorePercent,
        answers: dbAnswersMap,
        completed_at: new Date().toISOString()
      });

      // Write to new Learning Journey tracking table
      try {
        await supabase.from('user_quiz_attempts').insert({
          user_id: session.user.id,
          quiz_id: id,
          subject_key: quiz.subject || null,
          score_pct: scorePercent,
          questions_total: questions.length,
          questions_correct: correctCount,
          attempted_at: new Date().toISOString()
        });
      } catch (e) {
        console.warn('user_quiz_attempts insert warning:', e);
      }

      awardPoints('QUIZ_COMPLETE', { refId: id, metadata: { score_percent: scorePercent } });

      if (isFreeAttempt) {
        try {
          await supabase
            .from('user_profiles')
            .update({ free_quiz_used: true })
            .eq('id', session.user.id);
          setFreeQuizUsed(true);
        } catch (e) {
          console.error('Error updating free_quiz_used:', e);
        }
      }
    }
  };

  const access = canTakeQuiz(effectiveTier, freeQuizUsed);

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: 'var(--ios-bg)' }}>
      <RefreshCw className="animate-spin" size={32} color="var(--ios-olive)" />
    </div>
  );

  if (!quiz) return <div style={{ padding: '4rem', textAlign: 'center' }}>Quiz not found.</div>;

  if (!access.allowed) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #1F3A2E 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem 1.5rem',
        fontFamily: "'Inter', sans-serif"
      }}>
        <div style={{
          background: 'rgba(255, 255, 255, 0.98)',
          borderRadius: '24px',
          padding: '3rem 2.25rem',
          maxWidth: '460px',
          width: '100%',
          textAlign: 'center',
          boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
        }}>
          <div style={{
            width: '60px', height: '60px', borderRadius: '50%',
            background: 'rgba(239, 68, 68, 0.08)', display: 'flex',
            alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem'
          }}>
            <Lock size={30} color="#ef4444" />
          </div>
          <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.75rem' }}>
            Mock Test Locked
          </h3>
          <p style={{ color: '#64748b', fontSize: '0.95rem', marginBottom: '2rem', lineHeight: 1.5 }}>
            {access.reason || "You have already used your 1 free mock test. Upgrade to access all exams, practice resources, and unlimited mock tests."}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <button onClick={() => navigate('/subscribe')} className="btn-primary ios-pill" style={{
              border: 'none', padding: '0.85rem 2rem', fontSize: '0.95rem',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
              color: 'white', cursor: 'pointer'
            }}>
              <Crown size={16} /> View Upgrade Options
            </button>
            <button 
              onClick={() => navigate('/learning-center')} 
              style={{
                background: 'none', border: 'none', color: '#64748b', fontSize: '0.85rem', fontWeight: 600,
                marginTop: '0.5rem', cursor: 'pointer'
              }}
            >
              Back to Learning Center
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Render view phase
  return (
    <div style={{ minHeight: '100vh', background: 'var(--ios-bg)', paddingBottom: '4rem' }}>
      {quizPhase === 'setup' && (
        <QuizSetup
          quizTitle={quiz.title}
          totalQuestions={questions.length}
          onStartQuiz={handleStartQuiz}
          savedQuiz={savedQuiz}
          onResumeSavedQuiz={handleResumeSavedQuiz}
          onDiscardSavedQuiz={handleDiscardSavedQuiz}
          onExitToMenu={() => navigate('/learning-center')}
        />
      )}

      {quizPhase === 'active' && activeQuiz && (
        <QuizView
          state={activeQuiz}
          onUpdateAnswer={handleUpdateAnswer}
          onToggleBookmark={handleToggleBookmark}
          onFinishQuiz={handleFinishQuiz}
          onExitToMenu={() => navigate('/learning-center')}
        />
      )}

      {quizPhase === 'results' && activeQuiz && (
        <QuizResults
          state={activeQuiz}
          onRestart={() => {
            setQuizPhase('setup');
            setActiveQuiz(null);
            setSavedQuiz(null);
          }}
          onExit={() => navigate('/learning-center')}
        />
      )}
    </div>
  );
};

export default InteractiveQuiz;
