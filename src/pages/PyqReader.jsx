import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { ArrowLeft, RefreshCw, Lock, Crown, CheckCircle2 } from 'lucide-react';
import { getEffectiveTier, canAccessResource } from '../lib/subscriptionAccess';

export default function PyqReader() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [paper, setPaper] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [effectiveTier, setEffectiveTier] = useState(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        let tier = null;
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const { data: profileRow } = await supabase
            .from('user_profiles')
            .select('subscription_tier, subscription_expires_at')
            .eq('id', session.user.id)
            .maybeSingle();
          if (profileRow) {
            tier = getEffectiveTier(profileRow.subscription_tier, profileRow.subscription_expires_at);
          }
        }
        setEffectiveTier(tier);

        const { data: paperRow } = await supabase.from('pyq_papers').select('*').eq('id', id).single();
        setPaper(paperRow);

        if (paperRow && canAccessResource(tier, 'PYQ').allowed) {
          const { data: questionRows } = await supabase
            .from('pyq_questions')
            .select('*')
            .eq('paper_id', id)
            .order('question_number');
          setQuestions(questionRows || []);
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const access = canAccessResource(effectiveTier, 'PYQ');

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: 'var(--ios-bg)' }}>
        <RefreshCw className="animate-spin" size={32} color="var(--ios-olive)" />
      </div>
    );
  }

  if (!paper) {
    return (
      <div style={{ minHeight: '100vh', background: '#F4F4F8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: '#64748b' }}>PYQ paper not found.</p>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F4F4F8', padding: '2rem 1.5rem', fontFamily: "'Inter', sans-serif" }}>
      <div style={{ maxWidth: '820px', margin: '0 auto' }}>
        <button
          onClick={() => navigate('/pyq-center')}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: 'none', border: 'none',
            color: '#64748b', fontSize: '0.85rem', fontWeight: 700, marginBottom: '1.5rem', cursor: 'pointer',
            textTransform: 'uppercase', letterSpacing: '0.5px', padding: 0
          }}
        >
          <ArrowLeft size={14} /> Back to PYQ Center
        </button>

        <div style={{ marginBottom: '2rem' }}>
          <span style={{
            fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px',
            color: '#64748b', background: '#fff', border: '1px solid #e2e8f0', padding: '0.2rem 0.5rem'
          }}>
            {paper.subject || 'GENERAL'}
          </span>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--ios-text)', margin: '0.75rem 0 0.4rem' }}>
            {paper.title}
          </h1>
          <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>
            {paper.exam_name} {paper.total_questions ? `· ${paper.total_questions} Questions` : ''}
          </p>
        </div>

        {!access.allowed ? (
          <div style={{
            padding: '4rem 2rem', textAlign: 'center', display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', background: '#fff', border: '1px solid #e2e8f0'
          }}>
            <div style={{
              width: '60px', height: '60px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.08)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem'
            }}>
              <Lock size={30} color="#ef4444" />
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.75rem' }}>
              PYQ Locked
            </h3>
            <p style={{ color: '#64748b', fontSize: '0.9rem', maxWidth: '380px', margin: '0 auto 1.75rem', lineHeight: 1.5 }}>
              {access.reason || 'Upgrade to a paid plan to unlock previous year question papers.'}
            </p>
            <Link to="/subscribe" className="btn-primary ios-pill" style={{
              textDecoration: 'none', padding: '0.85rem 2rem', fontSize: '0.95rem',
              display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: 'white',
            }}>
              <Crown size={16} /> View Upgrade Options
            </Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {questions.map((q, idx) => (
              <div key={q.id} style={{ background: '#fff', border: '1px solid #e2e8f0', padding: '1.5rem' }}>
                <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem' }}>
                  <span style={{ fontWeight: 800, color: 'var(--ios-olive)', fontSize: '0.95rem' }}>{q.question_number || idx + 1}.</span>
                  <p style={{ margin: 0, fontSize: '0.95rem', lineHeight: 1.5, color: 'var(--ios-text)' }}>{q.question_text}</p>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginLeft: '1.5rem' }}>
                  {Object.entries(q.options || {}).map(([key, value]) => {
                    const isCorrect = key === q.correct_answer;
                    return (
                      <div key={key} style={{
                        display: 'flex', alignItems: 'flex-start', gap: '0.5rem', padding: '0.5rem 0.75rem',
                        fontSize: '0.88rem', lineHeight: 1.4,
                        background: isCorrect ? 'rgba(75,107,50,0.08)' : 'transparent',
                        color: isCorrect ? 'var(--ios-olive)' : '#374151',
                        fontWeight: isCorrect ? 700 : 400,
                        border: isCorrect ? '1px solid var(--ios-olive)' : '1px solid transparent'
                      }}>
                        {isCorrect ? <CheckCircle2 size={16} style={{ flexShrink: 0, marginTop: '0.1rem' }} /> : <span style={{ width: '16px', flexShrink: 0 }}>{key}.</span>}
                        <span>{value}</span>
                      </div>
                    );
                  })}
                </div>
                {q.explanation && (
                  <p style={{
                    margin: '1rem 0 0 1.5rem', fontSize: '0.82rem', color: '#64748b', lineHeight: 1.5,
                    borderLeft: '2px solid #e2e8f0', paddingLeft: '0.75rem'
                  }}>
                    {q.explanation}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
