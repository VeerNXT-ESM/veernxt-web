import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Save, ArrowLeft, Plus, Trash2, HelpCircle, Layout, List } from 'lucide-react';

const AdminQuizEditor = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('metadata'); // metadata or questions
  
  const [quizData, setQuizData] = useState({
    title: '',
    exam_name: '',
    subject: '',
    category: 'PYQ',
    description: '',
    total_questions: 0,
    is_freemium: false
  });

  const [questions, setQuestions] = useState([]);

  useEffect(() => {
    const session = localStorage.getItem('admin_session');
    if (!session) { navigate('/admin/login'); return; }
    if (id) fetchQuiz();
  }, [id, navigate]);

  const fetchQuiz = async () => {
    const { data: quiz } = await supabase.from('quizzes').select('*').eq('id', id).single();
    if (quiz) setQuizData(quiz);
    
    const { data: qList } = await supabase.from('questions').select('*').eq('quiz_id', id).order('question_number', { ascending: true });
    if (qList) setQuestions(qList);
  };

  const handleAddQuestion = () => {
    const newQ = {
      question_number: questions.length + 1,
      question_text: '',
      options: { A: '', B: '', C: '', D: '' },
      correct_answer: 'A',
      explanation: ''
    };
    setQuestions([...questions, newQ]);
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      // 1. Save Quiz Metadata
      let quizId = id;
      if (id) {
        await supabase.from('quizzes').update(quizData).eq('id', id);
      } else {
        const { data } = await supabase.from('quizzes').insert([{...quizData, total_questions: questions.length}]).select();
        quizId = data[0].id;
      }

      // 2. Save Questions (Delete old and re-insert for simplicity in this rapid tool)
      if (id) {
        await supabase.from('questions').delete().eq('quiz_id', id);
      }
      
      const questionsWithId = questions.map(q => ({
        ...q,
        quiz_id: quizId,
        id: undefined // Remove old ID if it exists to allow fresh insert
      }));
      
      await supabase.from('questions').insert(questionsWithId);
      
      alert('Quiz and Questions saved!');
      navigate('/admin');
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-container">
      <div className="editor-header">
        <button onClick={() => navigate('/admin')} className="btn-back"><ArrowLeft size={20} /></button>
        <div className="header-text">
          <h1>{id ? 'Edit Quiz' : 'New Quiz Factory'}</h1>
          <p>Rapidly build question sets and answer keys</p>
        </div>
        <button onClick={handleSave} className="btn-primary" disabled={loading}>
          <Save size={18} /> {loading ? 'Syncing...' : 'Publish Quiz'}
        </button>
      </div>

      <div className="tab-switcher">
        <button className={activeTab === 'metadata' ? 'active' : ''} onClick={() => setActiveTab('metadata')}>
          <Layout size={18} /> Quiz Info
        </button>
        <button className={activeTab === 'questions' ? 'active' : ''} onClick={() => setActiveTab('questions')}>
          <List size={18} /> Questions ({questions.length})
        </button>
      </div>

      <div className="editor-body">
        {activeTab === 'metadata' ? (
          <div className="card animate-fade-in">
            <h3>Metadata</h3>
            <div className="form-row">
              <div className="form-group">
                <label>Quiz Title</label>
                <input type="text" placeholder="e.g. 2024 English PYQ Set 1" value={quizData.title} onChange={e => setQuizData({...quizData, title: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Category</label>
                <select value={quizData.category} onChange={e => setQuizData({...quizData, category: e.target.value})}>
                  <option value="PYQ">Previous Year Question</option>
                  <option value="Mock Test">Mock Test</option>
                  <option value="Topic Test">Topic Test</option>
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Exam Name</label>
                <input type="text" value={quizData.exam_name} onChange={e => setQuizData({...quizData, exam_name: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Subject</label>
                <input type="text" value={quizData.subject} onChange={e => setQuizData({...quizData, subject: e.target.value})} />
              </div>
            </div>
            <div className="form-group">
              <label>Description</label>
              <textarea rows={4} value={quizData.description} onChange={e => setQuizData({...quizData, description: e.target.value})} />
            </div>
          </div>
        ) : (
          <div className="questions-manager animate-fade-in">
            {questions.map((q, idx) => (
              <div key={idx} className="card question-card">
                <div className="q-header">
                  <div className="q-circle">{idx + 1}</div>
                  <button className="btn-delete" onClick={() => setQuestions(questions.filter((_, i) => i !== idx))}>
                    <Trash2 size={16} />
                  </button>
                </div>
                
                <div className="form-group">
                  <label>Question Text</label>
                  <textarea 
                    value={q.question_text} 
                    onChange={e => {
                      const newQ = [...questions];
                      newQ[idx].question_text = e.target.value;
                      setQuestions(newQ);
                    }}
                  />
                </div>

                <div className="options-editor">
                  {['A', 'B', 'C', 'D'].map(key => (
                    <div key={key} className="option-row">
                      <div className={`option-selector ${q.correct_answer === key ? 'active' : ''}`} onClick={() => {
                        const newQ = [...questions];
                        newQ[idx].correct_answer = key;
                        setQuestions(newQ);
                      }}>{key}</div>
                      <input 
                        type="text" 
                        placeholder={`Option ${key}...`} 
                        value={q.options[key]}
                        onChange={e => {
                          const newQ = [...questions];
                          newQ[idx].options[key] = e.target.value;
                          setQuestions(newQ);
                        }}
                      />
                    </div>
                  ))}
                </div>

                <div className="form-group">
                  <label>Explanation / Insight</label>
                  <textarea 
                    rows={2}
                    placeholder="Why is this the correct answer?"
                    value={q.explanation} 
                    onChange={e => {
                      const newQ = [...questions];
                      newQ[idx].explanation = e.target.value;
                      setQuestions(newQ);
                    }}
                  />
                </div>
              </div>
            ))}
            <button className="btn-add-q" onClick={handleAddQuestion}>
              <Plus size={20} /> Add Next Question
            </button>
          </div>
        )}
      </div>

      <style>{`
        .admin-container { padding: 2rem; max-width: 1000px; margin: 0 auto; }
        .editor-header { display: flex; align-items: center; gap: 1.5rem; margin-bottom: 2rem; }
        .tab-switcher { display: flex; gap: 1rem; margin-bottom: 2rem; border-bottom: 1px solid #e2e8f0; padding-bottom: 1rem; }
        .tab-switcher button {
          display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem 1rem;
          background: transparent; border: none; font-weight: 700; color: #64748b; cursor: pointer; border-radius: 8px;
        }
        .tab-switcher button.active { background: #f1f5f9; color: var(--ios-olive); }
        
        .card { background: white; padding: 2rem; border-radius: 24px; border: 1px solid #f1f5f9; margin-bottom: 1.5rem; }
        .question-card { border-left: 6px solid #e2e8f0; transition: border 0.3s; }
        .question-card:focus-within { border-left-color: var(--ios-olive); }
        
        .q-header { display: flex; justify-content: space-between; margin-bottom: 1.5rem; }
        .q-circle { width: 32px; height: 32px; background: #f1f5f9; border-radius: 100px; display: flex; align-items: center; justify-content: center; font-weight: 800; color: #475569; }
        .btn-delete { color: #94a3b8; background: transparent; border: none; cursor: pointer; }
        .btn-delete:hover { color: #ef4444; }

        .options-editor { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin: 1.5rem 0; }
        .option-row { display: flex; align-items: center; gap: 0.5rem; }
        .option-selector { 
          width: 32px; height: 32px; border: 2px solid #e2e8f0; border-radius: 8px; 
          display: flex; align-items: center; justify-content: center; font-weight: 800; color: #94a3b8; cursor: pointer;
        }
        .option-selector.active { border-color: var(--ios-olive); background: var(--ios-olive); color: white; }
        
        .btn-add-q {
          width: 100%; padding: 1.5rem; border: 2px dashed #e2e8f0; border-radius: 24px;
          background: transparent; color: #64748b; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 1rem;
        }
        .btn-add-q:hover { background: #f8fafc; border-color: var(--ios-olive); color: var(--ios-olive); }

        .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem; }
        .form-group { display: flex; flex-direction: column; gap: 0.5rem; margin-bottom: 1rem; }
        label { font-size: 0.8rem; font-weight: 700; color: #475569; }
        input, select, textarea { padding: 0.75rem; border: 1px solid #e2e8f0; border-radius: 12px; outline: none; }
        .btn-primary { background: var(--ios-olive); color: white; border: none; padding: 0.75rem 2rem; border-radius: 12px; font-weight: 700; cursor: pointer; }
        .btn-back { width: 40px; height: 40px; border-radius: 100px; border: 1px solid #e2e8f0; background: white; cursor: pointer; display: flex; align-items: center; justify-content: center; }
      `}</style>
    </div>
  );
};

export default AdminQuizEditor;
