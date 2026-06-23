import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { ArrowLeft, CheckCircle, XCircle, RefreshCw, Trophy, ChevronRight, HelpCircle } from 'lucide-react';
import 'react-quill-new/dist/quill.snow.css';

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

        setQuiz(quizData);
        setQuestions(parsedQuestions);
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
    <div className="quiz-container animate-fade-in quiz-theme">
      <div className="quiz-header">
        <div className="header-inner">
          <Link to="/learning-center" className="back-link">
            <ArrowLeft size={18} /> Exit
          </Link>
          <div className="progress-container">
            <div className="progress-track">
              <div className="progress-fill" style={{ width: `${progress}%` }}></div>
            </div>
          </div>
          <div className="question-counter">
            {currentQuestionIndex + 1} / {questions.length}
          </div>
        </div>
      </div>

      <div className="quiz-main">
        {questions.length > 0 && !submitted && (
          <div className="question-card animate-fade-in">
            <div className="question-badge">
              {score}
            </div>
            
            <h2 className="q-title">Question <span>{String(currentQuestionIndex + 1).padStart(2, '0')}</span></h2>
            <span className="q-subject">{quiz.subject || 'Quiz'}</span>
            <div className="q-divider"></div>
            
            <div className="question-text ql-snow">
              <div className="ql-editor" dangerouslySetInnerHTML={{ __html: questions[currentQuestionIndex].question_text }} />
            </div>
            
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
                    <div className="option-value ql-snow" style={{ padding: 0 }}>
                      <div className="ql-editor" style={{ padding: 0, minHeight: 'auto' }} dangerouslySetInnerHTML={{ __html: value }} />
                    </div>
                    <div className="option-indicator">
                      {isRevealed && isCorrect ? <CheckCircle size={24} className="indicator-icon correct" /> :
                       isRevealed && isSelected && !isCorrect ? <XCircle size={24} className="indicator-icon incorrect" /> :
                       <div className="empty-circle"></div>}
                    </div>
                  </div>
                );
              })}
            </div>

            {revealed[questions[currentQuestionIndex].id] && (
              <div className="immediate-feedback animate-slide-up">
                {questions[currentQuestionIndex].explanation && (
                  <div className="explanation-text ql-snow">
                    <strong>Insight:</strong>
                    <div className="ql-editor" style={{ padding: '0.5rem 0', minHeight: 'auto' }} dangerouslySetInnerHTML={{ __html: questions[currentQuestionIndex].explanation }} />
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {questions.length > 0 && !submitted && (
          <div className="bottom-action-container animate-slide-up">
            {currentQuestionIndex === questions.length - 1 ? (
              <button 
                onClick={handleSubmit} 
                className="btn-next-action"
                disabled={!revealed[questions[currentQuestionIndex].id]}
              >
                Complete Quiz
              </button>
            ) : (
              <button 
                onClick={() => setCurrentQuestionIndex(prev => Math.min(questions.length - 1, prev + 1))}
                className="btn-next-action"
                disabled={!revealed[questions[currentQuestionIndex].id]}
              >
                Next
              </button>
            )}
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
                    <div className="review-q-text ql-snow">
                      <div className="ql-editor" style={{ padding: 0, minHeight: 'auto' }} dangerouslySetInnerHTML={{ __html: `${idx + 1}. ` + q.question_text }} />
                    </div>
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
                      <div className="explanation ql-snow">
                        <strong>Insight:</strong>
                        <div className="ql-editor" style={{ padding: 0, minHeight: 'auto' }} dangerouslySetInnerHTML={{ __html: q.explanation }} />
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
        .quiz-theme {
          min-height: 100vh;
          background: var(--ios-bg);
          padding-bottom: 5rem;
          color: var(--ios-text);
          font-family: 'Inter', sans-serif;
        }
        .quiz-header {
          position: sticky;
          top: 0;
          z-index: 50;
          padding: 1.5rem 0;
          background: rgba(244, 244, 248, 0.9);
          backdrop-filter: blur(10px);
        }
        .header-inner {
          max-width: 600px;
          margin: 0 auto;
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0 1.5rem;
        }
        .back-link, .question-counter {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background: white;
          padding: 0.5rem 1rem;
          border-radius: 12px;
          color: var(--ios-text);
          text-decoration: none;
          font-weight: 600;
          font-size: 0.9rem;
          box-shadow: var(--shadow-ios);
        }
        .progress-container {
          flex: 1;
          margin: 0 1rem;
        }
        .progress-track {
          height: 6px;
          background: #e2e8f0;
          border-radius: 99px;
          overflow: hidden;
        }
        .progress-fill {
          height: 100%;
          background: var(--ios-olive);
          border-radius: 99px;
          transition: width 0.3s ease;
        }

        .quiz-main {
          max-width: 600px;
          margin: 4rem auto 2rem auto;
          padding: 0 1.5rem;
        }
        .question-card {
          background: white;
          border-radius: 24px;
          padding: 3rem 2rem 2rem 2rem;
          position: relative;
          box-shadow: var(--shadow-ios);
          text-align: center;
          border: 1px solid #f1f1f1;
        }
        .question-badge {
          position: absolute;
          top: -30px;
          left: 50%;
          transform: translateX(-50%);
          width: 60px;
          height: 60px;
          background: white;
          border: 4px solid var(--ios-olive);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.5rem;
          font-weight: 800;
          color: var(--ios-text);
          box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1);
        }
        
        .q-title {
          font-size: 1.5rem;
          color: var(--ios-text);
          margin: 0 0 0.5rem 0;
          font-weight: 800;
        }
        .q-title span { color: var(--ios-olive); }
        .q-subject {
          color: #64748b;
          font-size: 0.9rem;
          text-transform: uppercase;
          letter-spacing: 1px;
          font-weight: 600;
        }
        .q-divider {
          height: 1px;
          background: #e2e8f0;
          margin: 1.5rem 0;
          border-style: dashed;
        }
        .question-text {
          font-size: 1.25rem;
          color: var(--ios-text);
          margin-bottom: 2.5rem;
          line-height: 1.6;
          font-weight: 600;
        }
        
        .options-grid {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        .option-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1.25rem 1.5rem;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .option-item:hover {
          background: #f1f5f9;
          transform: translateY(-2px);
        }
        .option-value {
          flex: 1;
          text-align: left;
          font-weight: 600;
          font-size: 1rem;
          color: #334155;
        }
        
        .option-item.selected {
          border-color: var(--ios-olive);
          background: rgba(75, 107, 50, 0.05);
        }
        .option-item.correct {
          background: rgba(34, 197, 94, 0.1);
          border-color: #22c55e;
        }
        .option-item.incorrect {
          background: rgba(239, 68, 68, 0.1);
          border-color: #ef4444;
        }
        .option-item.should-have-selected {
          border: 2px dashed #22c55e;
        }
        
        .option-indicator {
          margin-left: 1rem;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .empty-circle {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          border: 2px solid #cbd5e1;
        }
        .indicator-icon.correct {
          color: #22c55e;
          fill: rgba(34, 197, 94, 0.2);
        }
        .indicator-icon.incorrect {
          color: #ef4444;
          fill: rgba(239, 68, 68, 0.2);
        }

        .immediate-feedback {
          margin-top: 2rem;
          padding: 1.5rem;
          background: #f8fafc;
          border-radius: 16px;
          border: 1px solid #e2e8f0;
          text-align: left;
        }
        .explanation-text {
          font-size: 0.95rem;
          color: #475569;
          line-height: 1.6;
        }

        .bottom-action-container {
          max-width: 600px;
          margin: 0 auto;
          padding: 2rem 1.5rem;
        }
        .btn-next-action {
          width: 100%;
          background: var(--ios-olive);
          color: white;
          border: none;
          padding: 1.25rem;
          border-radius: 99px;
          font-weight: 800;
          font-size: 1.1rem;
          cursor: pointer;
          transition: all 0.2s;
          box-shadow: 0 10px 15px -3px rgba(75, 107, 50, 0.3);
        }
        .btn-next-action:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          box-shadow: none;
        }
        .btn-next-action:not(:disabled):hover {
          transform: translateY(-2px);
          opacity: 0.9;
        }

        /* Result Styles */
        .result-card { background: white; border-radius: 24px; padding: 3rem 2rem; text-align: center; border: 1px solid #f1f1f1; box-shadow: var(--shadow-ios); }
        .trophy-icon { color: #f59e0b; margin-bottom: 1.5rem; }
        .result-card h1 { color: var(--ios-text); margin-bottom: 0.5rem; }
        .result-card p { color: #64748b; }
        .score-summary {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 2rem;
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
          border: 4px solid var(--ios-olive);
          box-shadow: 0 4px 10px rgba(0,0,0,0.05);
        }
        .score-num { font-size: 2rem; font-weight: 800; color: var(--ios-text); line-height: 1; }
        .score-total { font-size: 0.8rem; color: #64748b; font-weight: 700; }
        .score-details { text-align: left; }
        .score-details h3 { margin: 0 0 0.25rem 0; color: var(--ios-text); }
        .score-details p { margin: 0; color: #64748b; font-size: 0.9rem; }
        
        .review-section { text-align: left; margin-top: 3rem; }
        .section-title { font-size: 1.25rem; margin-bottom: 1.5rem; color: var(--ios-text); border-bottom: 1px solid #e2e8f0; padding-bottom: 1rem; }
        .review-item { padding: 1.5rem; border-radius: 16px; margin-bottom: 1rem; border-left: 4px solid #94a3b8; background: #f8fafc; }
        .review-item.correct { border-left-color: #22c55e; }
        .review-item.incorrect { border-left-color: #ef4444; }
        .review-q-text { font-weight: 700; margin-bottom: 1rem; color: var(--ios-text); }
        .review-answer-row { display: flex; gap: 2rem; margin-bottom: 0.75rem; font-size: 0.9rem; color: #334155; }
        .user-answer { display: flex; align-items: center; gap: 0.5rem; }
        .explanation { font-size: 0.85rem; color: #475569; background: white; padding: 0.75rem; border-radius: 8px; margin-top: 0.75rem; border: 1px solid #f1f1f1; }
        
        @media (max-width: 600px) {
          .question-card, .result-card { padding: 2rem 1.5rem; }
          .score-summary { flex-direction: column; text-align: center; }
          .score-details { text-align: center; }
        }
      `}} />
    </div>
  );
};

export default InteractiveQuiz;
