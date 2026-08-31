import React, { useState, useEffect, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Brain, Search, RefreshCw, Lock, ArrowLeft } from 'lucide-react';
import { getEffectiveTier, canTakeQuiz } from '../lib/subscriptionAccess';
import { resolveCanonicalSubjectLabel, getFamilyHex } from '../lib/thumbnailTaxonomy';

export default function QuizCenter() {
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [profile, setProfile] = useState(null);
  // null = no matched exam yet (fallback: show every subject, unfiltered);
  // a Set = canonical subject keys required by the user's top-matched exam.
  const [allowedSubjectKeys, setAllowedSubjectKeys] = useState(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const activeSubjectKey = searchParams.get('subject');

  useEffect(() => {
    const loadQuizzes = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const { data: profileRow } = await supabase
            .from('user_profiles')
            .select('subscription_tier, subscription_expires_at, free_quiz_used, recommendations')
            .eq('id', session.user.id)
            .maybeSingle();
          if (profileRow) {
            setProfile(profileRow);
            const topExam = (profileRow.recommendations || [])[0];
            if (topExam?.exam_id) {
              try {
                const res = await fetch(`/api/exams?examId=${encodeURIComponent(topExam.exam_id)}`);
                const json = await res.json();
                if (json.ok) {
                  const required = Object.entries(json.exam.subjects || {})
                    .filter(([, v]) => (v || '').toLowerCase() === 'yes')
                    .map(([k]) => resolveCanonicalSubjectLabel(k)?.key)
                    .filter(Boolean);
                  setAllowedSubjectKeys(new Set(required));
                }
              } catch (e) {
                console.error('Error fetching top exam subjects:', e);
              }
            }
          }
        }

        const { data, error } = await supabase
          .from('quizzes')
          .select('*')
          .eq('category', 'Mock Test')
          .order('title');

        if (error) throw error;
        setQuizzes(data || []);
      } catch (err) {
        console.error('Error fetching quizzes:', err);
      } finally {
        setLoading(false);
      }
    };
    loadQuizzes();
  }, []);

  const tier = getEffectiveTier(profile?.subscription_tier, profile?.subscription_expires_at);
  const freeQuizUsed = !!profile?.free_quiz_used;
  const quizAccess = canTakeQuiz(tier, freeQuizUsed);

  // Group quizzes by canonical subject where possible. A quiz whose subject
  // doesn't match the 17-subject taxonomy (which is most of them today --
  // quizzes.subject is largely untagged/"General") falls back to an ad-hoc
  // group keyed on its raw subject text, and that fallback group is always
  // shown regardless of exam-match filtering -- only canonically-tagged
  // quizzes get filtered to the user's matched exam's required subjects.
  // This means the page stays useful today and tightens up automatically
  // as quizzes get properly re-tagged via the admin bulk-assign tool.
  const groups = useMemo(() => {
    const map = new Map();
    for (const quiz of quizzes) {
      const canonical = resolveCanonicalSubjectLabel(quiz.subject);
      const key = canonical?.key || quiz.subject || 'uncategorized';
      if (allowedSubjectKeys && canonical && !allowedSubjectKeys.has(key)) continue;
      if (!map.has(key)) {
        map.set(key, {
          key,
          label: canonical?.label || quiz.subject || 'Uncategorized',
          family: canonical?.family || null,
          quizzes: [],
        });
      }
      map.get(key).quizzes.push(quiz);
    }
    return [...map.values()].sort((a, b) => a.label.localeCompare(b.label));
  }, [quizzes, allowedSubjectKeys]);

  const activeGroup = groups.find((g) => g.key === activeSubjectKey) || null;

  const visibleGroups = groups.filter((g) =>
    g.label.toLowerCase().includes(searchText.toLowerCase())
  );
  const visibleQuizzesInGroup = (activeGroup?.quizzes || []).filter((q) =>
    q.title.toLowerCase().includes(searchText.toLowerCase())
  );

  const openSubject = (key) => {
    setSearchText('');
    setSearchParams(key ? { subject: key } : {});
  };

  return (
    <div style={{ minHeight: '100vh', background: '#F4F4F8', padding: '2rem 1.5rem', fontFamily: "'Inter', sans-serif" }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>

        {/* Breadcrumb */}
        {activeGroup ? (
          <button
            onClick={() => openSubject(null)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: 'none', border: 'none',
              color: '#64748b', fontSize: '0.85rem', fontWeight: 700, marginBottom: '1.5rem', cursor: 'pointer',
              textTransform: 'uppercase', letterSpacing: '0.5px', padding: 0
            }}
          >
            <ArrowLeft size={14} /> Back to Subjects
          </button>
        ) : (
          <Link
            to="/learning-center"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.4rem', textDecoration: 'none',
              color: '#64748b', fontSize: '0.85rem', fontWeight: 700, marginBottom: '1.5rem',
              textTransform: 'uppercase', letterSpacing: '0.5px'
            }}
          >
            <ArrowLeft size={14} /> Back to Library
          </Link>
        )}

        {/* Title & Description */}
        <div style={{ marginBottom: '2.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <div style={{
              width: '40px', height: '40px', background: 'rgba(75,107,50,0.08)',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <Brain size={22} color="var(--ios-olive)" />
            </div>
            <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--ios-text)', margin: 0, textTransform: 'uppercase', letterSpacing: '-0.5px' }}>
              {activeGroup ? activeGroup.label : 'Quiz & Mock Center'}
            </h1>
          </div>
          <p style={{ margin: 0, fontSize: '0.9rem', color: '#64748b', fontWeight: 500 }}>
            {activeGroup
              ? `Mock tests for ${activeGroup.label}.`
              : 'Test your competitive exam readiness with custom mock simulations and subject-wise testing.'}
          </p>
        </div>

        {/* Search */}
        <div style={{
          display: 'flex', gap: '1rem',
          background: 'white', border: '1px solid #e2e8f0', padding: '1.25rem', marginBottom: '2rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', border: '1px solid #e2e8f0', padding: '0.5rem 0.75rem', flex: 1 }}>
            <Search size={16} color="#94a3b8" />
            <input
              type="text"
              placeholder={activeGroup ? 'Search mock assessments...' : 'Search subjects...'}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              style={{ border: 'none', outline: 'none', width: '100%', fontSize: '0.85rem', fontWeight: 500 }}
            />
          </div>
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '4rem' }}>
            <RefreshCw className="animate-spin" size={24} color="var(--ios-olive)" />
          </div>
        ) : !activeGroup ? (
          /* ---- Subject landing view ---- */
          visibleGroups.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '4rem 2rem', background: 'white', border: '1px solid #e2e8f0' }}>
              <Brain size={48} color="#cbd5e1" style={{ marginBottom: '1rem' }} />
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--ios-text)' }}>No Mock Tests Found</h3>
              <p style={{ color: '#64748b', fontSize: '0.85rem', margin: 0 }}>Try a different search or check back later.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1rem' }}>
              {visibleGroups.map((g) => (
                <div
                  key={g.key}
                  onClick={() => openSubject(g.key)}
                  style={{
                    background: 'white', border: '1px solid #e2e8f0', borderTop: `3px solid ${g.family ? getFamilyHex(g.family) : '#cbd5e1'}`,
                    padding: '1.5rem', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '0.5rem'
                  }}
                >
                  <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: 'var(--ios-text)' }}>{g.label}</h3>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>
                    {g.quizzes.length} mock test{g.quizzes.length === 1 ? '' : 's'}
                  </p>
                </div>
              ))}
            </div>
          )
        ) : visibleQuizzesInGroup.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem 2rem', background: 'white', border: '1px solid #e2e8f0' }}>
            <Brain size={48} color="#cbd5e1" style={{ marginBottom: '1rem' }} />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--ios-text)' }}>No Mock Tests Found</h3>
            <p style={{ color: '#64748b', fontSize: '0.85rem', margin: 0 }}>Try clearing your search.</p>
          </div>
        ) : (
          /* ---- Quiz grid for the selected subject ---- */
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
            {visibleQuizzesInGroup.map(quiz => {
              const locked = !quizAccess.allowed;
              return (
                <div
                  key={quiz.id}
                  style={{
                    background: 'white', border: '1px solid #e2e8f0', padding: '1.5rem',
                    display: 'flex', flexDirection: 'column', gap: '1rem', position: 'relative'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
                    {locked && (
                      <span style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: '0.2rem', fontSize: '0.7rem', fontWeight: 700 }}>
                        <Lock size={12} /> LOCKED
                      </span>
                    )}
                  </div>

                  <div style={{ flex: 1 }}>
                    <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.05rem', fontWeight: 800, color: 'var(--ios-text)', lineHeight: 1.3 }}>
                      {quiz.title}
                    </h3>
                    <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b', lineHeight: 1.4 }}>
                      {quiz.description || 'Practice questions curated for examination preparation.'}
                    </p>
                  </div>

                  <Link
                    to={`/quiz/${quiz.id}`}
                    style={{
                      textDecoration: 'none', background: 'var(--ios-olive)', color: 'white',
                      textAlign: 'center', padding: '0.75rem', fontWeight: 800, fontSize: '0.85rem',
                      textTransform: 'uppercase', letterSpacing: '0.5px',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
                      border: 'none', cursor: 'pointer'
                    }}
                  >
                    Start Arena Session
                  </Link>
                </div>
              );
            })}
          </div>
        )}

      </div>
    </div>
  );
}
