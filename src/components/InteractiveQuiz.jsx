import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { ArrowLeft, CheckCircle, XCircle, RefreshCw, Trophy, ChevronRight, HelpCircle } from 'lucide-react';

const InteractiveQuiz = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [quiz, setQuiz] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [revealed, setRevealed] = useState({}); // Track which questions have been answered/revealed
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchQuiz = async () => {
      try {
        const { data: quizData } = await supabase.from('quizzes').select('*').eq('id', id).single();
        const { data: questionsData } = await supabase.from('questions').select('*').eq('quiz_id', id).order('question_number');
        
        setQuiz(quizData);
        setQuestions(questionsData || []);
      } catch (err) {
        console.error('Error fetching quiz:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchQuiz();
  }, [id]);

  const handleSelectOption = (questionId, optionKey) => {
    if (submitted || revealed[questionId]) return;
    
    const currentQ = questions[currentQuestionIndex];
    const isCorrect = optionKey === currentQ.correct_answer;
    
    setAnswers({ ...answers, [questionId]: optionKey });
    setRevealed({ ...revealed, [questionId]: true });
    
    if (isCorrect) {
      setScore(prev => prev + 1);
    }
  };

  const handleSubmit = async () => {
    let calculatedScore = 0;
    questions.forEach(q => {
      if (answers[q.id] === q.correct_answer) {
        calculatedScore += 1;
      }
    });
    setScore(calculatedScore);
    setSubmitted(true);

    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      await supabase.from('quiz_attempts').insert({
        user_id: session.user.id,
        quiz_id: id,
        quiz_title: quiz.title,
        total_questions: questions.length,
        answered_questions: Object.keys(answers).length,
        correct_answers: calculatedScore,
        score_percent: (calculatedScore / questions.length) * 100,
        answers: answers,
        completed_at: new Date().toISOString()
      });
    }
  };

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: 'var(--ios-bg)' }}>
      <RefreshCw className="animate-spin" size={32} color="var(--ios-olive)" />
    </div>
  );

  if (!quiz) return <div style={{ padding: '4rem', textAlign: 'center' }}>Quiz not found.</div>;

  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;

  return (
    <div className="quiz-container animate-fade-in">
      <div className="quiz-header">
        <div className="header-inner">
          <Link to="/learning-center" className="back-link">
            <ArrowLeft size={18} /> Exit Quiz
          </Link>
          <div className="quiz-title-box">
            <h2 className="quiz-title">{quiz.title}</h2>
            <span className="quiz-subject">{quiz.subject}</span>
          </div>
          <div className="question-counter">
            {currentQuestionIndex + 1} / {questions.length}
          </div>
        </div>
        <div className="progress-track">
          <div className="progress-fill" style={{ width: `${progress}%` }}></div>
        </div>
      </div>

      <div className="quiz-main">
        {questions.length > 0 && !submitted && (
          <div className="question-card animate-fade-in">
            <div className="question-header">
              <span className="q-number">Question {currentQuestionIndex + 1}</span>
              <HelpCircle size={20} color="#cbd5e1" />
            </div>
            
            <h3 className="question-text">
              {questions[currentQuestionIndex].question_text}
            </h3>
            
            <div className="options-grid">
              {Object.entries(questions[currentQuestionIndex].options || {}).map(([key, value]) => {
                const questionId = questions[currentQuestionIndex].id;
                const isSelected = answers[questionId] === key;
                const isRevealed = revealed[questionId];
                const isCorrect = key === questions[currentQuestionIndex].correct_answer;
                
                let statusClass = "";
                if (isRevealed) {
                  if (isSelected) statusClass = isCorrect ? "correct" : "incorrect";
                  else if (isCorrect) statusClass = "should-have-selected";
                }

                return (
                  <div 
                    key={key}
                    onClick={() => handleSelectOption(questionId, key)}
                    className={`option-item ${isSelected ? 'selected' : ''} ${statusClass}`}
                  >
                    <div className="option-key">{key}</div>
                    <div className="option-value">{value}</div>
                    {isRevealed && isCorrect && <CheckCircle size={18} className="status-icon correct" />}
                    {isRevealed && isSelected && !isCorrect && <XCircle size={18} className="status-icon incorrect" />}
                  </div>
                );
              })}
            </div>

            {revealed[questions[currentQuestionIndex].id] && (
              <div className="immediate-feedback animate-slide-up">
                <div className={`feedback-header ${answers[questions[currentQuestionIndex].id] === questions[currentQuestionIndex].correct_answer ? 'correct' : 'incorrect'}`}>
                  {answers[questions[currentQuestionIndex].id] === questions[currentQuestionIndex].correct_answer ? 'Well Done!' : 'Not Quite...'}
                </div>
                {questions[currentQuestionIndex].explanation && (
                  <div className="explanation-text">
                    <strong>Insight:</strong> {questions[currentQuestionIndex].explanation}
                  </div>
                )}
              </div>
            )}

            <div className="quiz-actions">
              <button 
                onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
                disabled={currentQuestionIndex === 0}
                className={`nav-btn ${currentQuestionIndex === 0 ? 'disabled' : ''}`}
              >
                Previous
              </button>
              
              {currentQuestionIndex === questions.length - 1 ? (
                <button 
                  onClick={handleSubmit} 
                  className="btn-primary"
                  disabled={!revealed[questions[currentQuestionIndex].id]}
                >
                  Complete Quiz
                </button>
              ) : (
                <button 
                  onClick={() => setCurrentQuestionIndex(prev => Math.min(questions.length - 1, prev + 1))}
                  className="btn-primary"
                  disabled={!revealed[questions[currentQuestionIndex].id]}
                >
                  Next Question <ChevronRight size={18} />
                </button>
              )}
            </div>
          </div>
        )}

        {submitted && (
          <div className="result-card animate-fade-in">
            <div className="result-header">
              <Trophy size={64} className="trophy-icon" />
              <h1>Quiz Completed!</h1>
              <p>Great job finishing the assessment.</p>
            </div>

            <div className="score-summary">
              <div className="score-circle">
                <span className="score-num">{score}</span>
                <span className="score-total">/ {questions.length}</span>
              </div>
              <div className="score-details">
                <h3>Your Score: {((score / questions.length) * 100).toFixed(0)}%</h3>
                <p>{score >= questions.length / 2 ? 'You are doing great! Keep it up.' : 'Consider reviewing the study guides for this topic.'}</p>
              </div>
            </div>

            <div className="review-section">
              <h3 className="section-title">Question Review</h3>
              {questions.map((q, idx) => {
                const isCorrect = answers[q.id] === q.correct_answer;
                return (
                  <div key={q.id} className={`review-item ${isCorrect ? 'correct' : 'incorrect'}`}>
                    <div className="review-q-text">{idx + 1}. {q.question_text}</div>
                    <div className="review-answer-row">
                      <div className="user-answer">
                        <span>Your: <strong>{answers[q.id] || 'N/A'}</strong></span>
                        {isCorrect ? <CheckCircle size={14} /> : <XCircle size={14} />}
                      </div>
                      {!isCorrect && (
                        <div className="correct-answer">
                          Correct: <strong>{q.correct_answer}</strong>
                        </div>
                      )}
                    </div>
                    {q.explanation && (
                      <div className="explanation">
                        <strong>Insight:</strong> {q.explanation}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="result-footer">
              <button onClick={() => navigate('/learning-center')} className="btn-primary full-width">
                Return to Library
              </button>
            </div>
          </div>
        )}
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .quiz-container {
          min-height: 100vh;
          background: #f8fafc;
          padding-bottom: 5rem;
        }
        .quiz-header {
          background: white;
          position: sticky;
          top: 64px;
          z-index: 50;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
        }
        .header-inner {
          max-width: 800px;
          margin: 0 auto;
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem 1.5rem;
        }
        .back-link {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: #64748b;
          text-decoration: none;
          font-weight: 600;
          font-size: 0.9rem;
        }
        .quiz-title-box { text-align: center; }
        .quiz-title { font-size: 1.1rem; margin: 0; color: #1e293b; }
        .quiz-subject { font-size: 0.7rem; color: var(--ios-olive); font-weight: 800; text-transform: uppercase; }
        .question-counter { font-weight: 700; color: #94a3b8; font-variant-numeric: tabular-nums; }
        
        .progress-track { height: 4px; background: #f1f5f9; }
        .progress-fill { height: 100%; background: var(--ios-olive); transition: width 0.3s ease; }

        .quiz-main {
          max-width: 800px;
          margin: 3rem auto;
          padding: 0 1.5rem;
        }
        .question-card {
          background: white;
          border-radius: 24px;
          padding: 3rem;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.05);
        }
        .question-header { display: flex; justify-content: space-between; margin-bottom: 1.5rem; }
        .q-number { color: var(--ios-olive); font-weight: 800; font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.05em; }
        .question-text { font-size: 1.5rem; color: #0f172a; margin-bottom: 2.5rem; line-height: 1.4; font-weight: 700; }
        
        .options-grid { display: flex; flex-direction: column; gap: 1rem; margin-bottom: 3rem; }
        .option-item {
          display: flex;
          align-items: center;
          gap: 1.25rem;
          padding: 1.25rem;
          background: #f8fafc;
          border: 2px solid transparent;
          border-radius: 16px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .option-item:hover { background: #f1f5f9; transform: translateY(-2px); }
        .option-item.selected {
          background: rgba(75, 107, 50, 0.05);
          border-color: var(--ios-olive);
        }
        .option-item.correct { background: rgba(34, 197, 94, 0.1); border-color: #22c55e; }
        .option-item.incorrect { background: rgba(239, 68, 68, 0.1); border-color: #ef4444; }
        .option-item.should-have-selected { border: 2px dashed #22c55e; }
        
        .option-key {
          width: 32px;
          height: 32px;
          background: white;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          color: #64748b;
          font-size: 0.9rem;
          box-shadow: 0 2px 4px rgba(0,0,0,0.05);
        }
        .selected .option-key { background: var(--ios-olive); color: white; }
        .correct .option-key { background: #22c55e; color: white; }
        .incorrect .option-key { background: #ef4444; color: white; }
        
        .option-value { flex: 1; font-weight: 600; color: #334155; }
        .status-icon.correct { color: #22c55e; }
        .status-icon.incorrect { color: #ef4444; }

        .immediate-feedback {
          margin-bottom: 3rem;
          padding: 1.5rem;
          background: #f8fafc;
          border-radius: 16px;
          border: 1px solid #e2e8f0;
        }
        .feedback-header { font-weight: 800; font-size: 1.1rem; margin-bottom: 0.5rem; }
        .feedback-header.correct { color: #15803d; }
        .feedback-header.incorrect { color: #b91c1c; }
        .explanation-text { font-size: 0.95rem; color: #475569; line-height: 1.5; }

        .quiz-actions { display: flex; justify-content: space-between; gap: 1rem; }
        .nav-btn {
          background: #f1f5f9;
          color: #64748b;
          border: none;
          padding: 1rem 2rem;
          border-radius: 99px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
        }
        .nav-btn.disabled { opacity: 0.5; cursor: not-allowed; }
        
        /* Result Styles */
        .result-card { background: white; border-radius: 24px; padding: 4rem; text-align: center; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.05); }
        .trophy-icon { color: #f59e0b; margin-bottom: 1.5rem; }
        .score-summary {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 2.5rem;
          margin: 3rem 0;
          padding: 2rem;
          background: #f8fafc;
          border-radius: 20px;
        }
        .score-circle {
          width: 100px;
          height: 100px;
          background: white;
          border-radius: 50%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1);
        }
        .score-num { font-size: 2rem; font-weight: 800; color: var(--ios-olive); line-height: 1; }
        .score-total { font-size: 0.8rem; color: #94a3b8; font-weight: 700; }
        .score-details { text-align: left; }
        .score-details h3 { margin: 0 0 0.25rem 0; color: #1e293b; }
        .score-details p { margin: 0; color: #64748b; font-size: 0.9rem; }
        
        .review-section { text-align: left; margin-top: 4rem; }
        .section-title { font-size: 1.25rem; margin-bottom: 1.5rem; }
        .review-item { padding: 1.5rem; border-radius: 16px; margin-bottom: 1rem; border-left: 4px solid #e2e8f0; background: #f8fafc; }
        .review-item.correct { border-left-color: #22c55e; }
        .review-item.incorrect { border-left-color: #ef4444; }
        .review-q-text { font-weight: 700; margin-bottom: 1rem; color: #1e293b; }
        .review-answer-row { display: flex; gap: 2rem; margin-bottom: 0.75rem; font-size: 0.9rem; }
        .user-answer { display: flex; align-items: center; gap: 0.5rem; }
        .explanation { font-size: 0.85rem; color: #64748b; background: white; padding: 0.75rem; border-radius: 8px; margin-top: 0.75rem; }
        
        .full-width { width: 100%; margin-top: 2rem; }

        @media (max-width: 600px) {
          .question-card, .result-card { padding: 2rem 1.5rem; }
          .score-summary { flexDirection: column; text-align: center; }
          .score-details { text-align: center; }
        }
      `}} />
    </div>
  );
};

export default InteractiveQuiz;
