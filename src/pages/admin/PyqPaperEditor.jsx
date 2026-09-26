import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

const ADMIN_SECRET = import.meta.env.VITE_ADMIN_API_SECRET;
import { ArrowLeft, Save, Eye, Pencil, RefreshCw } from 'lucide-react';
import QuestionEditorList from '../../components/admin/QuestionEditorList';
import QuestionSetPreview from '../../components/admin/QuestionSetPreview';

// Full-page per-paper question editor for pyq_papers/pyq_questions --
// PyqPapersPage.jsx's own list only ever covered title/exam/subject/tags;
// the ~76,900 real pyq_questions rows (paper_id FK, question_number,
// question_text, options jsonb, correct_answer, explanation -- confirmed
// live, NOT block-JSON like Book Content) had no per-paper editor until
// now. Chrome deliberately matches BookChapterBrowser.jsx (the Book
// Content full-page editor): white header bar, #1F3A2E accent, dirty-state
// badge, Preview/Edit mode toggle -- same visual language, lives outside
// AdminShell for the same reason (a content editor wants full viewport
// width), same as BookChapterBrowser and AdminQuizEditor.
const PyqPaperEditor = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [paper, setPaper] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [mode, setMode] = useState('preview'); // 'preview' | 'edit'
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  useEffect(() => {
    if (!localStorage.getItem('admin_session')) navigate('/admin/login');
  }, [navigate]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const [{ data: paperRow, error: paperErr }, { data: questionRows, error: qErr }] = await Promise.all([
          supabase.from('pyq_papers').select('id,title,exam_name,subject,details,total_questions').eq('id', id).single(),
          supabase.from('pyq_questions').select('*').eq('paper_id', id).order('question_number'),
        ]);
        if (paperErr) throw paperErr;
        if (qErr) throw qErr;
        setPaper(paperRow);
        setQuestions(questionRows || []);
        setDirty(false);
        setMode('preview');
      } catch (err) {
        setLoadError(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const enterEdit = () => { setMode('edit'); };
  const cancelEdit = () => {
    if (dirty && !window.confirm('Discard unsaved changes to this paper’s questions?')) return;
    setMode('preview');
  };

  const handleQuestionsChange = (next) => {
    setQuestions(next);
    setDirty(true);
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      // pyq_questions is read-only for the anon key (RLS), so the replace runs server-side
      // (api/admin/misc.js fn=content-writes): new rows are inserted first, old ones deleted after.
      const rows = questions.map((q, idx) => ({
        question_number: q.question_number ?? idx + 1,
        question_text: q.question_text || '',
        options: q.options || { A: '', B: '', C: '', D: '' },
        correct_answer: q.correct_answer || null,
        explanation: q.explanation || null,
      }));
      const res = await fetch('/api/admin/content-writes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-api-secret': ADMIN_SECRET },
        body: JSON.stringify({ action: 'pyq-questions-replace', paper_id: id, questions: rows }),
      });
      const out = await res.json().catch(() => ({}));
      if (!res.ok || !out.ok) throw new Error(out.error || `Save failed (${res.status})`);

      setPaper((prev) => ({ ...prev, total_questions: rows.length }));
      // Re-fetch so locally-held rows pick up real DB ids for their new rows.
      const { data: refreshed } = await supabase.from('pyq_questions').select('*').eq('paper_id', id).order('question_number');
      setQuestions(refreshed || []);
      setDirty(false);
      setMode('preview');
    } catch (err) {
      setSaveError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#f4f5f7', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem 2rem', background: 'white', borderBottom: '1px solid #e2e8f0', flexShrink: 0 }}>
        <button onClick={() => { if (dirty && !window.confirm('Discard unsaved changes?')) return; navigate('/admin/pyq-papers'); }} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'transparent', border: 'none', color: '#64748b', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}>
          <ArrowLeft size={18} /> Back
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{ fontSize: '1.1rem', margin: 0, fontWeight: 800, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {paper?.title || (loadError ? 'Paper not found' : 'Loading…')}
          </h1>
          {paper && <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>{[paper.exam_name, paper.subject].filter(Boolean).join(' · ')} {questions.length ? `· ${questions.length} questions` : ''}</div>}
        </div>

        {paper && (
          <div style={{ display: 'inline-flex', background: '#f1f5f9', padding: '3px', borderRadius: 8, border: '1px solid #e2e8f0', marginRight: '0.5rem' }}>
            <button type="button" onClick={() => { if (mode === 'edit') cancelEdit(); }} style={{
              display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.4rem 0.75rem', borderRadius: 6, border: 'none', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer',
              background: mode === 'preview' ? 'white' : 'transparent', color: mode === 'preview' ? '#0f172a' : '#64748b',
              boxShadow: mode === 'preview' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
            }}>
              <Eye size={13} /> Preview
            </button>
            <button type="button" onClick={enterEdit} style={{
              display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.4rem 0.75rem', borderRadius: 6, border: 'none', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer',
              background: mode === 'edit' ? 'white' : 'transparent', color: mode === 'edit' ? '#0f172a' : '#64748b',
              boxShadow: mode === 'edit' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
            }}>
              <Pencil size={13} /> Edit
            </button>
          </div>
        )}

        {mode === 'edit' && (
          <>
            {dirty ? (
              <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#d97706', background: '#fffbeb', border: '1px solid #fef3c7', padding: '0.2rem 0.55rem', borderRadius: 6, marginRight: '0.5rem' }}>
                Unsaved changes
              </span>
            ) : (
              <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#64748b', marginRight: '0.5rem' }}>Saved</span>
            )}
            <button onClick={cancelEdit} disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 1rem', background: 'white', color: '#64748b', border: '1px solid #e2e8f0', borderRadius: 8, fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer' }}>
              Cancel
            </button>
            <button onClick={handleSave} disabled={saving || !dirty} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 1.25rem', background: dirty ? '#1F3A2E' : '#cbd5e1', color: 'white', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: '0.8rem', cursor: dirty ? 'pointer' : 'not-allowed' }}>
              <Save size={14} /> {saving ? 'Saving…' : 'Save'}
            </button>
          </>
        )}
      </div>

      <main style={{ flex: 1, padding: '2rem', overflowY: 'auto' }}>
        <div style={{ maxWidth: 820, margin: '0 auto' }}>
          {loading && <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}><RefreshCw className="animate-spin" size={24} /></div>}
          {loadError && <p style={{ color: '#dc2626' }}>Unable to load this paper: {loadError}</p>}
          {saveError && (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', borderRadius: 8, padding: '0.6rem 0.85rem', marginBottom: '1rem', fontSize: '0.8rem' }}>
              Save failed: {saveError}
            </div>
          )}
          {paper && !loading && (
            mode === 'preview'
              ? <QuestionSetPreview questions={questions} />
              : <QuestionEditorList questions={questions} onChange={handleQuestionsChange} />
          )}
        </div>
      </main>
    </div>
  );
};

export default PyqPaperEditor;
