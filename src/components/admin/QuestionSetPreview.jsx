import { CheckCircle2 } from 'lucide-react';

// Read-only render of a question list, styled to match the admin chrome
// (white cards, #1F3A2E accent) -- same content/highlight logic as the
// candidate-facing PyqReader.jsx, kept as a separate component since that
// one renders inside the candidate app's pastel theme, not the admin shell.
export default function QuestionSetPreview({ questions }) {
  if (!questions || questions.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#94a3b8' }}>
        <p style={{ margin: 0, fontWeight: 700, fontSize: '0.9rem', color: '#64748b' }}>No questions to preview yet.</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {questions.map((q, idx) => (
        <div key={q.id || idx} style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 12, padding: '1.25rem' }}>
          <div style={{ display: 'flex', gap: '0.65rem', marginBottom: '0.9rem' }}>
            <span style={{ fontWeight: 800, color: '#1F3A2E', fontSize: '0.9rem' }}>{q.question_number ?? idx + 1}.</span>
            <p style={{ margin: 0, fontSize: '0.9rem', lineHeight: 1.5, color: '#0f172a', whiteSpace: 'pre-wrap' }}>{q.question_text || <em style={{ color: '#94a3b8' }}>(empty)</em>}</p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginLeft: '1.3rem' }}>
            {['A', 'B', 'C', 'D'].map((key) => {
              const isCorrect = key === q.correct_answer;
              return (
                <div key={key} style={{
                  display: 'flex', alignItems: 'flex-start', gap: '0.5rem', padding: '0.45rem 0.7rem',
                  fontSize: '0.85rem', lineHeight: 1.4, borderRadius: 6,
                  background: isCorrect ? 'rgba(31,58,46,0.06)' : 'transparent',
                  color: isCorrect ? '#1F3A2E' : '#374151',
                  fontWeight: isCorrect ? 700 : 400,
                  border: isCorrect ? '1px solid #1F3A2E' : '1px solid transparent',
                }}>
                  {isCorrect ? <CheckCircle2 size={14} style={{ flexShrink: 0, marginTop: '0.15rem' }} /> : <span style={{ width: 14, flexShrink: 0 }}>{key}.</span>}
                  <span>{q.options?.[key] || <em style={{ color: '#cbd5e1' }}>(empty)</em>}</span>
                </div>
              );
            })}
          </div>
          {q.explanation && (
            <p style={{ margin: '0.9rem 0 0 1.3rem', fontSize: '0.8rem', color: '#64748b', lineHeight: 1.5, borderLeft: '2px solid #e2e8f0', paddingLeft: '0.7rem', whiteSpace: 'pre-wrap' }}>
              {q.explanation}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
