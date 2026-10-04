import { useMemo, useState } from 'react';
import { QuizView } from '../../components/quiz/QuizView';
import { BLOCKING_QUESTION_FLAGS } from '../../lib/quizQuality';

// Local-only preview of a parsed structured mock test (scripts/preview_structured_mock.mjs writes the
// JSON). Two views: "Paper" (everything, with flags and the three answer sources, for the content
// team) and "Student player" (the real QuizView, with the same blocking-flag filter students get).
const files = import.meta.glob('./quizPreviewData.json', { eager: true, import: 'default' });
const DATA = Object.values(files)[0] || null;
const blocking = (q) => q.flags.some((f) => BLOCKING_QUESTION_FLAGS.includes(f)) || !q.answer;
const SECTION_COLORS = ['#1565C0', '#6A1B9A', '#E65100', '#2E7D32', '#455A64'];

const pill = (bad) => ({ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: bad ? '#fee2e2' : '#e2e8f0', color: bad ? '#b91c1c' : '#475569', marginRight: 6 });

function PaperView({ data }) {
  const [onlyFlagged, setOnlyFlagged] = useState(false);
  const qs = data.questions.filter((q) => !onlyFlagged || q.flags.length);
  return (
    <div style={{ maxWidth: 860, margin: '0 auto', padding: '1rem' }}>
      <label style={{ fontSize: 13 }}>
        <input type="checkbox" checked={onlyFlagged} onChange={(e) => setOnlyFlagged(e.target.checked)} /> Show only flagged questions
      </label>
      {qs.map((q) => {
        const si = Math.max(0, data.sections.findIndex((s) => s.id === q.sectionId));
        return (
          <div key={q.position} style={{ border: '1px solid #e2e8f0', borderLeft: `5px solid ${SECTION_COLORS[si % 5]}`, borderRadius: 10, padding: '14px 16px', margin: '14px 0', background: '#fff' }}>
            <div style={{ fontSize: 12, color: '#64748b', marginBottom: 6 }}>
              <strong>Q{q.sourceNumber}</strong> · body position {q.position} · Section {q.sectionId}
              {q.flags.map((f) => <span key={f} style={{ ...pill(BLOCKING_QUESTION_FLAGS.includes(f)), marginLeft: 6 }}>{f}</span>)}
            </div>
            <div style={{ fontSize: 16, lineHeight: 1.5, whiteSpace: 'pre-line' }} dangerouslySetInnerHTML={{ __html: q.stem }} />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 8, margin: '12px 0' }}>
              {Object.entries(q.options).map(([k, v]) => (
                <div key={k} style={{ display: 'flex', gap: 8, padding: '8px 10px', border: `1px solid ${k === q.answer ? '#22c55e' : '#e2e8f0'}`, background: k === q.answer ? '#f0fdf4' : '#fff', borderRadius: 8 }}>
                  <strong>{k}</strong><span dangerouslySetInnerHTML={{ __html: v }} />
                </div>
              ))}
            </div>
            <div style={{ fontSize: 13, color: '#334155', background: '#f8fafc', borderRadius: 8, padding: '8px 10px' }}>
              <strong>Answer {q.answer || '—'}</strong>{' '}
              <span style={{ color: '#94a3b8' }}>(✓ marker {q.answer || '—'} · explanation box {q.boxLetter || '—'})</span>
              <div style={{ marginTop: 4 }} dangerouslySetInnerHTML={{ __html: q.explanation }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Player({ data, includeFlagged }) {
  const questions = useMemo(() => data.questions.filter((q) => includeFlagged || !blocking(q)).map((q) => {
    const keys = Object.keys(q.options).sort();
    return {
      id: `q${q.position}`,
      category: (data.sections.find((s) => s.id === q.sectionId) || {}).name || 'general_knowledge',
      difficulty: 'medium',
      question: q.stem,
      options: keys.map((k) => q.options[k]),
      correctIndex: Math.max(0, keys.indexOf(q.answer)),
      explanation: q.explanation,
      originalKeys: keys,
    };
  }), [data, includeFlagged]);
  const fresh = () => ({ id: 'preview', startedAt: Date.now(), config: { mode: 'learning', timeLimitSeconds: 0 }, questions, currentIndex: 0, answers: {}, score: 0, currentStreak: 0, maxStreak: 0, bookmarkedIds: [], isFinished: false, timeRemaining: 0 });
  const [state, setState] = useState(fresh);
  if (!questions.length) return <p style={{ padding: 24 }}>No playable questions.</p>;
  if (state.currentIndex >= questions.length || state.isFinished) {
    const right = Object.values(state.answers).filter((a) => a.isCorrect).length;
    return (
      <div style={{ padding: 32, textAlign: 'center' }}>
        <h2>End of preview — {right}/{questions.length} correct</h2>
        <button onClick={() => setState(fresh())}>Restart</button>
      </div>
    );
  }
  return (
    <QuizView
      state={state}
      onUpdateAnswer={(ans, next, score, streak, maxStreak) => setState((p) => ({ ...p, currentIndex: next, score, currentStreak: streak, maxStreak, answers: ans ? { ...p.answers, [ans.questionId]: ans } : p.answers }))}
      onToggleBookmark={(id) => setState((p) => ({ ...p, bookmarkedIds: p.bookmarkedIds.includes(id) ? p.bookmarkedIds.filter((x) => x !== id) : [...p.bookmarkedIds, id] }))}
      onFinishQuiz={() => setState((p) => ({ ...p, isFinished: true }))}
      onExitToMenu={() => setState(fresh())}
    />
  );
}

export default function QuizPreview() {
  const [tab, setTab] = useState('paper');
  const [includeFlagged, setIncludeFlagged] = useState(false);
  if (!DATA) return <div style={{ padding: 32 }}>No preview data. Run <code>node scripts/preview_structured_mock.mjs &lt;file.docx&gt;</code>, then reload.</div>;
  const playable = DATA.questions.filter((q) => !blocking(q)).length;
  const tally = {};
  DATA.questions.forEach((q) => q.flags.forEach((f) => { tally[f] = (tally[f] || 0) + 1; }));
  return (
    <div style={{ minHeight: '100vh', background: '#f4f5f7', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ background: '#fff', borderBottom: '1px solid #e2e8f0', padding: '14px 24px' }}>
        <h1 style={{ margin: 0, fontSize: 18 }}>{DATA.title}</h1>
        <div style={{ fontSize: 12, color: '#64748b', margin: '4px 0 8px' }}>
          {DATA.file} · {DATA.questions.length} parsed (declared {DATA.declared}) · <strong>{playable} playable</strong> · {DATA.imageCount} images · {DATA.sections.map((s) => `${s.id}: ${s.count}`).join(' · ')}
        </div>
        {DATA.issues.map((i) => <div key={i} style={{ fontSize: 12, color: '#b91c1c' }}>⚠ {i}</div>)}
        <div style={{ margin: '8px 0' }}>
          {Object.entries(tally).map(([f, n]) => <span key={f} style={pill(BLOCKING_QUESTION_FLAGS.includes(f))}>{f} × {n}</span>)}
        </div>
        <button onClick={() => setTab('paper')} style={{ fontWeight: tab === 'paper' ? 800 : 400, marginRight: 12 }}>Paper (review)</button>
        <button onClick={() => setTab('player')} style={{ fontWeight: tab === 'player' ? 800 : 400 }}>Student player</button>
        {tab === 'player' && (
          <label style={{ marginLeft: 16, fontSize: 12 }}>
            <input type="checkbox" checked={includeFlagged} onChange={(e) => setIncludeFlagged(e.target.checked)} /> include flagged (students never see these)
          </label>
        )}
      </div>
      {tab === 'paper' ? <PaperView data={DATA} /> : <Player key={String(includeFlagged)} data={DATA} includeFlagged={includeFlagged} />}
    </div>
  );
}
