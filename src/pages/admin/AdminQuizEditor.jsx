import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Save, ArrowLeft, Layout, List } from 'lucide-react';
import QuestionEditorList from '../../components/admin/QuestionEditorList';
import { THUMBNAIL_SUBJECTS } from '../../lib/thumbnailTaxonomy';

const SUBJECT_OPTIONS = Object.values(THUMBNAIL_SUBJECTS).map((s) => s.label).sort();

// Chrome restyled to match BookChapterBrowser.jsx / PyqPaperEditor.jsx --
// same white header bar, #1F3A2E accent, dirty-state "Unsaved changes"
// badge -- so the three full-page content editors (Book Content, PYQ
// Papers, Quizzes) read as one consistent editing surface even though
// their underlying content genuinely differs (prose blocks vs. structured
// questions). Question editing itself (add/reorder/delete, 4 options,
// mark correct, optional explanation) is now QuestionEditorList, shared
// verbatim with PyqPaperEditor.jsx -- `questions` (quiz_id FK) and
// pyq_questions (paper_id FK) turned out to hold the exact same shape,
// confirmed by reading live rows from both before building this, not
// assumed from either table's docstring.
const AdminQuizEditor = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [loadingInitial, setLoadingInitial] = useState(!!id);
  const [activeTab, setActiveTab] = useState('metadata'); // metadata or questions
  const [dirty, setDirty] = useState(false);
  const [saveError, setSaveError] = useState(null);

  const [quizData, setQuizData] = useState({
    title: '',
    exam_name: '',
    subject: '',
    category: 'Mock Test',
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
    setLoadingInitial(true);
    const { data: quiz } = await supabase.from('quizzes').select('*').eq('id', id).single();
    if (quiz) setQuizData(quiz);

    const { data: qList } = await supabase.from('questions').select('*').eq('quiz_id', id).order('question_number', { ascending: true });
    if (qList) setQuestions(qList);
    setDirty(false);
    setLoadingInitial(false);
  };

  const updateQuizData = (patch) => { setQuizData((prev) => ({ ...prev, ...patch })); setDirty(true); };
  const handleQuestionsChange = (next) => { setQuestions(next); setDirty(true); };

  const handleSave = async () => {
    setLoading(true);
    setSaveError(null);
    try {
      // 1. Save Quiz Metadata
      let quizId = id;
      if (id) {
        await supabase.from('quizzes').update(quizData).eq('id', id);
      } else {
        const { data } = await supabase.from('quizzes').insert([{ ...quizData, total_questions: questions.length }]).select();
        quizId = data[0].id;
      }

      // 2. Save Questions (Delete old and re-insert for simplicity in this rapid tool)
      if (id) {
        await supabase.from('questions').delete().eq('quiz_id', id);
      }

      const questionsWithId = questions.map((q) => ({
        ...q,
        quiz_id: quizId,
        id: undefined // Remove old ID if it exists to allow fresh insert
      }));

      if (questionsWithId.length > 0) {
        await supabase.from('questions').insert(questionsWithId);
      }
      await supabase.from('quizzes').update({ total_questions: questionsWithId.length }).eq('id', quizId);

      setDirty(false);
      if (!id) {
        navigate(`/admin/quiz/${quizId}`);
      } else {
        fetchQuiz();
      }
    } catch (err) {
      setSaveError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const labelStyle = { fontSize: '0.72rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '0.35rem', textTransform: 'uppercase', letterSpacing: '0.04em' };
  const inputStyle = { width: '100%', padding: '0.65rem 0.85rem', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: '0.9rem', fontFamily: 'inherit', boxSizing: 'border-box', background: '#f8fafc', color: '#0f172a' };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#f4f5f7', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem 2rem', background: 'white', borderBottom: '1px solid #e2e8f0', flexShrink: 0 }}>
        <button onClick={() => { if (dirty && !window.confirm('Discard unsaved changes?')) return; navigate('/admin/quizzes'); }} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'transparent', border: 'none', color: '#64748b', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}>
          <ArrowLeft size={18} /> Back
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{ fontSize: '1.1rem', margin: 0, fontWeight: 800, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {id ? (quizData.title || 'Edit Quiz') : 'New Quiz'}
          </h1>
          <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>{questions.length} question{questions.length === 1 ? '' : 's'}</div>
        </div>

        <div style={{ display: 'inline-flex', background: '#f1f5f9', padding: '3px', borderRadius: 8, border: '1px solid #e2e8f0', marginRight: '0.5rem' }}>
          <button type="button" onClick={() => setActiveTab('metadata')} style={{
            display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.4rem 0.75rem', borderRadius: 6, border: 'none', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer',
            background: activeTab === 'metadata' ? 'white' : 'transparent', color: activeTab === 'metadata' ? '#0f172a' : '#64748b',
            boxShadow: activeTab === 'metadata' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
          }}>
            <Layout size={13} /> Quiz Info
          </button>
          <button type="button" onClick={() => setActiveTab('questions')} style={{
            display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.4rem 0.75rem', borderRadius: 6, border: 'none', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer',
            background: activeTab === 'questions' ? 'white' : 'transparent', color: activeTab === 'questions' ? '#0f172a' : '#64748b',
            boxShadow: activeTab === 'questions' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
          }}>
            <List size={13} /> Questions ({questions.length})
          </button>
        </div>

        {dirty ? (
          <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#d97706', background: '#fffbeb', border: '1px solid #fef3c7', padding: '0.2rem 0.55rem', borderRadius: 6, marginRight: '0.5rem' }}>
            Unsaved changes
          </span>
        ) : (
          <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#64748b', marginRight: '0.5rem' }}>Saved</span>
        )}
        <button onClick={handleSave} disabled={loading || !dirty} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 1.25rem', background: dirty ? '#1F3A2E' : '#cbd5e1', color: 'white', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: '0.8rem', cursor: dirty ? 'pointer' : 'not-allowed' }}>
          <Save size={14} /> {loading ? 'Saving…' : 'Save'}
        </button>
      </div>

      <main style={{ flex: 1, padding: '2rem', overflowY: 'auto' }}>
        <div style={{ maxWidth: 820, margin: '0 auto' }}>
          {saveError && (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', borderRadius: 8, padding: '0.6rem 0.85rem', marginBottom: '1rem', fontSize: '0.8rem' }}>
              Save failed: {saveError}
            </div>
          )}

          {activeTab === 'metadata' ? (
            <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 12, padding: '1.5rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={labelStyle}>Quiz Title</label>
                  <input type="text" placeholder="e.g. 2024 English PYQ Set 1" value={quizData.title} onChange={(e) => updateQuizData({ title: e.target.value })} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Category</label>
                  <select value={quizData.category} onChange={(e) => updateQuizData({ category: e.target.value })} style={inputStyle}>
                    <option value="Mock Test">Mock Test</option>
                    <option value="Topic Test">Topic Test</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={labelStyle}>Exam Name</label>
                  <input type="text" value={quizData.exam_name || ''} onChange={(e) => updateQuizData({ exam_name: e.target.value })} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Subject</label>
                  <select value={quizData.subject || ''} onChange={(e) => updateQuizData({ subject: e.target.value })} style={inputStyle}>
                    <option value="">Select a subject...</option>
                    {SUBJECT_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label style={labelStyle}>Description</label>
                <textarea rows={4} value={quizData.description || ''} onChange={(e) => updateQuizData({ description: e.target.value })} style={{ ...inputStyle, resize: 'vertical' }} />
              </div>
            </div>
          ) : (
            !loadingInitial && <QuestionEditorList questions={questions} onChange={handleQuestionsChange} />
          )}
        </div>
      </main>
    </div>
  );
};

export default AdminQuizEditor;
