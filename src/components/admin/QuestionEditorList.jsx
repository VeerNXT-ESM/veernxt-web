import { Plus, Trash2, ChevronUp, ChevronDown } from 'lucide-react';

// Shared add/reorder/delete question editor -- used by both the PYQ paper
// editor (pyq_questions, paper_id FK) and AdminQuizEditor (questions,
// quiz_id FK). Both tables store the exact same shape (question_number,
// question_text, options: {A,B,C,D}, correct_answer, explanation), checked
// live against real rows before building this rather than assumed --
// neither holds HTML, both are plain text (multi-line, often bilingual),
// so this deliberately uses plain textareas/inputs rather than
// SimpleRichTextEditor (a Quill/HTML editor AdminQuizEditor used to reach
// for -- a mismatch for this content, since Quill can't round-trip a plain
// string containing literal newlines the way this table's real rows do).
//
// `questions` items don't need an `id` (a new, unsaved question has none);
// this component only reorders/edits the array in memory via `onChange` --
// the caller owns persistence.
const emptyQuestion = () => ({
  question_text: '',
  options: { A: '', B: '', C: '', D: '' },
  correct_answer: 'A',
  explanation: '',
});

// Keeps question_number contiguous with on-screen position after any
// structural change (add/delete/reorder) -- the original AdminQuizEditor
// only ever set this once, on add, and never fixed it up afterward.
const renumber = (list) => list.map((q, i) => ({ ...q, question_number: i + 1 }));

const cardStyle = {
  background: 'white',
  border: '1px solid #e2e8f0',
  borderRadius: 12,
  padding: '1.1rem 1.25rem',
  marginBottom: '1rem',
};

const labelStyle = { fontSize: '0.72rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '0.35rem', textTransform: 'uppercase', letterSpacing: '0.04em' };

const textAreaStyle = {
  width: '100%',
  padding: '0.65rem 0.85rem',
  border: '1px solid #cbd5e1',
  borderRadius: 8,
  fontSize: '0.9rem',
  fontFamily: 'inherit',
  lineHeight: 1.5,
  whiteSpace: 'pre-wrap',
  boxSizing: 'border-box',
  resize: 'vertical',
  background: '#f8fafc',
  color: '#0f172a',
};

const iconBtnStyle = {
  width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center',
  border: '1px solid #e2e8f0', borderRadius: 7, background: 'white', color: '#64748b', cursor: 'pointer',
};

export default function QuestionEditorList({ questions, onChange }) {
  const update = (idx, patch) => {
    const next = questions.map((q, i) => (i === idx ? { ...q, ...patch } : q));
    onChange(next);
  };
  const updateOption = (idx, key, value) => {
    update(idx, { options: { ...questions[idx].options, [key]: value } });
  };
  const addQuestion = () => onChange(renumber([...questions, emptyQuestion()]));
  const deleteQuestion = (idx) => onChange(renumber(questions.filter((_, i) => i !== idx)));
  const moveQuestion = (idx, dir) => {
    const target = idx + dir;
    if (target < 0 || target >= questions.length) return;
    const next = [...questions];
    [next[idx], next[target]] = [next[target], next[idx]];
    onChange(renumber(next));
  };

  return (
    <div>
      {questions.length === 0 && (
        <div style={{ textAlign: 'center', padding: '2.5rem 1rem', background: '#f8fafc', borderRadius: 12, border: '1px dashed #cbd5e1', color: '#64748b', fontSize: '0.85rem', marginBottom: '1rem' }}>
          No questions yet. Click below to add the first one.
        </div>
      )}

      {questions.map((q, idx) => (
        <div key={q.id || `new-${idx}`} style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.9rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <div style={{ width: 28, height: 28, borderRadius: 100, background: '#f1f5f9', color: '#475569', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.78rem', fontWeight: 800 }}>
                {idx + 1}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.4rem' }}>
              <button type="button" title="Move up" disabled={idx === 0} onClick={() => moveQuestion(idx, -1)} style={{ ...iconBtnStyle, opacity: idx === 0 ? 0.4 : 1, cursor: idx === 0 ? 'not-allowed' : 'pointer' }}>
                <ChevronUp size={15} />
              </button>
              <button type="button" title="Move down" disabled={idx === questions.length - 1} onClick={() => moveQuestion(idx, 1)} style={{ ...iconBtnStyle, opacity: idx === questions.length - 1 ? 0.4 : 1, cursor: idx === questions.length - 1 ? 'not-allowed' : 'pointer' }}>
                <ChevronDown size={15} />
              </button>
              <button type="button" title="Delete question" onClick={() => deleteQuestion(idx)} style={{ ...iconBtnStyle, color: '#dc2626' }}>
                <Trash2 size={14} />
              </button>
            </div>
          </div>

          <div style={{ marginBottom: '0.9rem' }}>
            <label style={labelStyle}>Question text</label>
            <textarea
              rows={4}
              value={q.question_text}
              onChange={(e) => update(idx, { question_text: e.target.value })}
              style={textAreaStyle}
              placeholder="Enter the question..."
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.9rem' }}>
            {['A', 'B', 'C', 'D'].map((key) => {
              const isCorrect = q.correct_answer === key;
              return (
                <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <button
                    type="button"
                    title={`Mark ${key} as correct`}
                    onClick={() => update(idx, { correct_answer: key })}
                    style={{
                      width: 30, height: 30, flexShrink: 0, borderRadius: 8, fontWeight: 800, fontSize: '0.82rem', cursor: 'pointer',
                      border: isCorrect ? '2px solid #1F3A2E' : '2px solid #e2e8f0',
                      background: isCorrect ? '#1F3A2E' : 'white',
                      color: isCorrect ? 'white' : '#94a3b8',
                    }}
                  >
                    {key}
                  </button>
                  <input
                    type="text"
                    value={q.options?.[key] || ''}
                    onChange={(e) => updateOption(idx, key, e.target.value)}
                    placeholder={`Option ${key}`}
                    style={{ flex: 1, minWidth: 0, padding: '0.5rem 0.7rem', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: '0.85rem', boxSizing: 'border-box', background: '#f8fafc', color: '#0f172a' }}
                  />
                </div>
              );
            })}
          </div>

          <div>
            <label style={labelStyle}>Explanation (optional)</label>
            <textarea
              rows={2}
              value={q.explanation || ''}
              onChange={(e) => update(idx, { explanation: e.target.value })}
              style={{ ...textAreaStyle, fontSize: '0.82rem', color: '#475569' }}
              placeholder="Why this answer is correct..."
            />
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={addQuestion}
        style={{ width: '100%', padding: '0.85rem', border: '1.5px dashed #94a3b8', borderRadius: 10, background: '#f8fafc', color: '#1F3A2E', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
      >
        <Plus size={16} /> Add question
      </button>
    </div>
  );
}
