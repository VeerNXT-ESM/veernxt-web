import React, { useState, useEffect, useMemo } from 'react';
import { Link, useSearchParams, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { 
  Brain, 
  Search, 
  RefreshCw, 
  Lock, 
  ArrowLeft, 
  CheckCircle2, 
  Clock, 
  Play, 
  FileText, 
  RotateCcw, 
  Sparkles, 
  Languages, 
  Award,
  Layers,
  ChevronRight
} from 'lucide-react';
import { getEffectiveTier, canTakeQuiz, isTesterModeActive } from '../lib/subscriptionAccess';
import { resolveCanonicalSubjectLabel, getFamilyHex } from '../lib/thumbnailTaxonomy';
import { MIN_PLAYABLE_QUESTIONS } from '../lib/quizQuality';

const TABS = [
  { id: 'all', label: 'All Tests' },
  { id: 'full_mock', label: 'Full Mock' },
  { id: 'sectional', label: 'Sectional Tests' },
  { id: 'topic_wise', label: 'Topic-wise Tests' },
  { id: 'previous_year', label: 'Previous Year Papers' },
];

export default function QuizCenter() {
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [profile, setProfile] = useState(null);
  const [targetExam, setTargetExam] = useState(null);
  const [allowedSubjectKeys, setAllowedSubjectKeys] = useState(null);
  const [mappedQuizIds, setMappedQuizIds] = useState(null);
  const [showAll, setShowAll] = useState(false);
  const [userAttempts, setUserAttempts] = useState(new Map());
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const activeSubjectKey = searchParams.get('subject');
  const activeExamId = searchParams.get('exam');

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
            const examIdToLoad = activeExamId || (profileRow.recommendations || [])[0]?.exam_id;
            if (examIdToLoad) {
              try {
                const res = await fetch(`/api/exams?examId=${encodeURIComponent(examIdToLoad)}`);
                const json = await res.json();
                if (json.ok && json.exam) {
                  setTargetExam(json.exam);
                  const required = Object.entries(json.exam.subjects || {})
                    .filter(([, v]) => (v || '').toLowerCase() === 'yes')
                    .map(([k]) => resolveCanonicalSubjectLabel(k)?.key)
                    .filter(Boolean);
                  setAllowedSubjectKeys(new Set(required));
                }
              } catch (e) {
                console.error('Error fetching target exam subjects:', e);
              }

              try {
                const { data: mapRows } = await supabase
                  .from('lc_exam_quiz_map')
                  .select('quiz_id')
                  .eq('exam_id', examIdToLoad);
                if (mapRows && mapRows.length > 0) {
                  setMappedQuizIds(new Set(mapRows.map((r) => r.quiz_id)));
                } else {
                  const { data: linked } = await supabase
                    .from('quizzes')
                    .select('id')
                    .eq('lc_exam_id', examIdToLoad)
                    .eq('category', 'Mock Test');
                  if (linked && linked.length > 0) setMappedQuizIds(new Set(linked.map((r) => r.id)));
                }
              } catch (e) {
                console.warn('lc_exam_quiz_map query fallback:', e);
              }
            }
          }

          // Fetch user's previous attempts to compute completion status & score
          try {
            const { data: attempts } = await supabase
              .from('quiz_attempts')
              .select('quiz_id, score_percent, completed_at')
              .eq('user_id', session.user.id);
            if (attempts && attempts.length > 0) {
              const map = new Map();
              attempts.forEach(a => {
                const existing = map.get(a.quiz_id);
                if (!existing || new Date(a.completed_at) > new Date(existing.completed_at)) {
                  map.set(a.quiz_id, a);
                }
              });
              setUserAttempts(map);
            }
          } catch (e) {
            console.warn('Error fetching quiz attempts:', e);
          }
        }

        // Fetch mock tests
        const all = [];
        for (let from = 0; ; from += 1000) {
          const { data, error } = await supabase
            .from('quizzes')
            .select('*')
            .eq('category', 'Mock Test')
            .gte('playable_questions', MIN_PLAYABLE_QUESTIONS)
            .order('title')
            .order('id')
            .range(from, from + 999);
          if (error) throw error;
          all.push(...(data || []));
          if (!data || data.length < 1000) break;
        }
        setQuizzes(all);
      } catch (err) {
        console.error('Error fetching quizzes:', err);
      } finally {
        setLoading(false);
      }
    };
    loadQuizzes();
  }, [activeExamId]);

  const tier = isTesterModeActive() ? 'TESTER' : getEffectiveTier(profile?.subscription_tier, profile?.subscription_expires_at);
  const freeQuizUsed = isTesterModeActive() ? false : !!profile?.free_quiz_used;
  const quizAccess = canTakeQuiz(tier, freeQuizUsed);

  // Group by subject taxonomy
  const groups = useMemo(() => {
    const map = new Map();
    for (const quiz of quizzes) {
      const canonical = resolveCanonicalSubjectLabel(quiz.subject);
      if (!showAll) {
        if (mappedQuizIds) {
          if (!mappedQuizIds.has(quiz.id)) continue;
        } else if (allowedSubjectKeys && canonical && !allowedSubjectKeys.has(canonical.key)) {
          continue;
        }
      }
      const key = canonical?.key || quiz.subject || 'uncategorized';
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
  }, [quizzes, allowedSubjectKeys, mappedQuizIds, showAll]);

  const activeGroup = groups.find((g) => g.key === activeSubjectKey) || null;

  // Filter quizzes by search and active category tab
  const filterQuizByCategory = (q) => {
    const title = (q.title || '').toLowerCase();
    const count = Number(q.playable_questions || q.total_questions || 0);

    if (activeTab === 'full_mock') {
      return count >= 60 || title.includes('full') || title.includes('tier-i') || title.includes('tier 1') || title.includes('grand');
    }
    if (activeTab === 'sectional') {
      return (count >= 20 && count < 60) || title.includes('sectional') || title.includes('part') || ['reasoning', 'mathematics', 'english', 'general awareness'].some(s => title.includes(s));
    }
    if (activeTab === 'topic_wise') {
      return count < 20 || title.includes('topic') || title.includes('chapter');
    }
    if (activeTab === 'previous_year') {
      return title.includes('pyq') || title.includes('202') || title.includes('201') || title.includes('shift') || title.includes('previous');
    }
    return true; // 'all'
  };

  const visibleGroups = groups.filter((g) =>
    g.label.toLowerCase().includes(searchText.toLowerCase())
  );
  
  const allFilteredQuizzes = useMemo(() => {
    const pool = activeGroup ? (activeGroup.quizzes || []) : groups.flatMap((g) => g.quizzes);
    return pool
      .filter((q) => q.title.toLowerCase().includes(searchText.toLowerCase()))
      .filter(filterQuizByCategory);
  }, [activeGroup, groups, searchText, activeTab]);

  const openSubject = (key) => {
    setSearchText('');
    setSearchParams(key ? { subject: key } : {});
  };

  // Determine user's test status
  const getQuizStatus = (quizId) => {
    const attempt = userAttempts.get(quizId);
    if (attempt) {
      return { type: 'completed', score: Math.round(attempt.score_percent) };
    }
    const saved = localStorage.getItem('active_quiz_' + quizId);
    if (saved) {
      return { type: 'in_progress' };
    }
    return { type: 'not_started' };
  };

  const renderQuizCard = (quiz) => {
    const locked = !quizAccess.allowed && !quiz.is_freemium;
    const qCount = quiz.playable_questions || quiz.total_questions || 80;
    const durationMins = Math.max(15, Math.min(120, Math.ceil(qCount * 0.75)));
    const totalMarks = qCount * 2;
    const status = getQuizStatus(quiz.id);

    return (
      <div
        key={quiz.id}
        style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          padding: '1.5rem',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          gap: '1.25rem',
          position: 'relative',
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
          transition: 'all 0.2s ease'
        }}
      >
        {/* Top Badges (Free/Premium Tag & Status) */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          
          {/* Free / Premium Badge */}
          <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
            {locked ? (
              <span style={{
                fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px',
                background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', padding: '0.2rem 0.55rem',
                borderRadius: '6px', display: 'inline-flex', alignItems: 'center', gap: '0.25rem'
              }}>
                <Lock size={11} /> Premium
              </span>
            ) : (
              <span style={{
                fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px',
                background: '#f0fdf4', color: '#16a34a', border: '1px solid #bcf0da', padding: '0.2rem 0.55rem',
                borderRadius: '6px', display: 'inline-flex', alignItems: 'center', gap: '0.25rem'
              }}>
                <Sparkles size={11} /> Free Test
              </span>
            )}
            
            <span style={{
              fontSize: '0.68rem', fontWeight: 700, color: '#475569', background: '#f1f5f9',
              padding: '0.2rem 0.55rem', borderRadius: '6px', textTransform: 'uppercase'
            }}>
              {quiz.subject || 'All Subjects'}
            </span>
          </div>

          {/* Test Completion Status */}
          {status.type === 'completed' && (
            <span style={{
              fontSize: '0.72rem', fontWeight: 700, color: '#15803d', background: '#dcfce7',
              padding: '0.2rem 0.6rem', borderRadius: '999px', display: 'flex', alignItems: 'center', gap: '0.3rem'
            }}>
              <CheckCircle2 size={13} /> Score: {status.score}%
            </span>
          )}
          {status.type === 'in_progress' && (
            <span style={{
              fontSize: '0.72rem', fontWeight: 700, color: '#854d0e', background: '#fef9c3',
              padding: '0.2rem 0.6rem', borderRadius: '999px', display: 'flex', alignItems: 'center', gap: '0.3rem'
            }}>
              <RotateCcw size={13} /> In Progress
            </span>
          )}
          {status.type === 'not_started' && (
            <span style={{
              fontSize: '0.72rem', fontWeight: 600, color: '#64748b', background: '#f1f5f9',
              padding: '0.2rem 0.6rem', borderRadius: '999px'
            }}>
              Not Started
            </span>
          )}
        </div>

        {/* Title & Description */}
        <div>
          <h3 style={{ margin: '0 0 0.4rem 0', fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.35 }}>
            {quiz.title}
          </h3>
          <p style={{ margin: 0, fontSize: '0.82rem', color: '#64748b', lineHeight: 1.5 }}>
            {quiz.description || 'Full-length examination pattern mock test with complete solution analysis.'}
          </p>
        </div>

        {/* Test Parameters Bar (Questions, Marks, Duration, Language) */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem',
          background: '#f8fafc', border: '1px solid #f1f5f9', borderRadius: '8px', padding: '0.75rem',
          fontSize: '0.72rem', textAlign: 'center'
        }}>
          <div>
            <span style={{ color: '#94a3b8', display: 'block', fontSize: '0.62rem', fontWeight: 700, textTransform: 'uppercase' }}>Questions</span>
            <strong style={{ color: '#0f172a', fontWeight: 800, fontSize: '0.85rem' }}>{qCount} Qs</strong>
          </div>
          <div>
            <span style={{ color: '#94a3b8', display: 'block', fontSize: '0.62rem', fontWeight: 700, textTransform: 'uppercase' }}>Marks</span>
            <strong style={{ color: '#0f172a', fontWeight: 800, fontSize: '0.85rem' }}>{totalMarks} M</strong>
          </div>
          <div>
            <span style={{ color: '#94a3b8', display: 'block', fontSize: '0.62rem', fontWeight: 700, textTransform: 'uppercase' }}>Time</span>
            <strong style={{ color: '#0f172a', fontWeight: 800, fontSize: '0.85rem' }}>{durationMins}m</strong>
          </div>
          <div>
            <span style={{ color: '#94a3b8', display: 'block', fontSize: '0.62rem', fontWeight: 700, textTransform: 'uppercase' }}>Language</span>
            <strong style={{ color: '#15803d', fontWeight: 800, fontSize: '0.85rem' }}>EN / HI</strong>
          </div>
        </div>

        {/* Action Button: Start Test / Resume Test (VeerNXT Brand Green) */}
        <Link
          to={`/quiz/${quiz.id}`}
          style={{
            textDecoration: 'none',
            background: status.type === 'in_progress' ? '#ca8a04' : status.type === 'completed' ? '#15803d' : '#0d4a2b',
            color: 'white',
            textAlign: 'center',
            padding: '0.9rem 1.25rem',
            borderRadius: '10px',
            fontWeight: 800,
            fontSize: '0.85rem',
            textTransform: 'uppercase',
            letterSpacing: '0.75px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.6rem',
            border: 'none',
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(13, 74, 43, 0.25)',
            transition: 'all 0.18s ease'
          }}
        >
          {status.type === 'in_progress' ? (
            <>
              <RotateCcw size={16} /> Resume Test
            </>
          ) : status.type === 'completed' ? (
            <>
              <RotateCcw size={16} /> Reattempt Test
            </>
          ) : (
            <>
              <Play size={16} fill="white" /> Start Test
            </>
          )}
        </Link>
      </div>
    );
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'radial-gradient(1200px 600px at 50% 0%, #ecfdf5 0%, #f8fafc 45%, #f1f5f9 100%)',
      padding: '2rem 1.5rem 4rem 1.5rem',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      color: '#0f172a'
    }}>
      <div style={{ maxWidth: '1240px', margin: '0 auto' }}>

        {/* HERO HEADER CARD (Brand Aligned with VeerNXT) */}
        <div style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderTop: '4px solid #0d4a2b',
          borderRadius: '16px',
          padding: '2.25rem',
          boxShadow: '0 8px 30px rgba(13, 74, 43, 0.06)',
          marginBottom: '2rem',
          position: 'relative'
        }}>
          
          {/* Top Breadcrumb & Back Button */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
            {activeGroup ? (
              <button
                onClick={() => openSubject(null)}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '0.45rem',
                  background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '8px',
                  padding: '0.55rem 1.15rem', color: '#1e293b', fontSize: '0.82rem', fontWeight: 700,
                  cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                  transition: 'all 0.15s ease'
                }}
              >
                <ArrowLeft size={15} /> Back to All Subjects
              </button>
            ) : (
              <Link
                to={location.state?.from || "/learning-center"}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '0.45rem',
                  background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '8px',
                  padding: '0.55rem 1.15rem', color: '#1e293b', fontSize: '0.82rem', fontWeight: 700,
                  textDecoration: 'none', boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                  transition: 'all 0.15s ease'
                }}
              >
                <ArrowLeft size={15} /> Back to Learning Center
              </Link>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>
              <span style={{ cursor: 'pointer', color: '#0d4a2b' }} onClick={() => openSubject(null)}>Exams</span>
              <ChevronRight size={13} />
              <span style={{ cursor: 'pointer', color: '#0d4a2b' }} onClick={() => openSubject(null)}>Mock Tests</span>
              {activeGroup && (
                <>
                  <ChevronRight size={13} />
                  <span style={{ color: '#0f172a', fontWeight: 800 }}>{activeGroup.label}</span>
                </>
              )}
            </div>
          </div>

          {/* Hero Title & Identity */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1.5rem', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap' }}>
              <div style={{
                width: '64px', height: '64px', background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
                border: '1.5px solid #bcf0da', borderRadius: '16px', display: 'flex', alignItems: 'center',
                justifyContent: 'center', boxShadow: '0 4px 12px rgba(13, 74, 43, 0.1)'
              }}>
                <Brain size={32} color="#0d4a2b" />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '0.35rem' }}>
                  <h1 style={{ fontSize: '1.9rem', fontWeight: 800, color: '#0f172a', margin: 0, letterSpacing: '-0.5px', textTransform: 'uppercase' }}>
                    {activeGroup ? activeGroup.label : 'Mock Test Series & Exam Arena'}
                  </h1>
                  <span style={{
                    background: '#f0fdf4', color: '#15803d', border: '1px solid #bcf0da',
                    fontSize: '0.75rem', fontWeight: 800, padding: '0.25rem 0.65rem', borderRadius: '6px',
                    textTransform: 'uppercase', letterSpacing: '0.5px'
                  }}>
                    Official Pattern
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: '0.9rem', color: '#475569', fontWeight: 500, lineHeight: 1.5, maxWidth: '750px' }}>
                  {activeGroup
                    ? `Targeted examination-pattern mock tests with All India ranking, negative marking (-0.50), and complete Hindi/English bilingual solutions.`
                    : 'Real examination simulations with All India Percentile, negative marking, and comprehensive question-by-question explanations.'}
                </p>
              </div>
            </div>

            {/* Feature Badges Strip */}
            <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
                background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px',
                padding: '0.4rem 0.75rem', fontSize: '0.75rem', fontWeight: 700, color: '#334155'
              }}>
                <Languages size={14} color="#0d4a2b" /> Bilingual EN/HI
              </span>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
                background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px',
                padding: '0.4rem 0.75rem', fontSize: '0.75rem', fontWeight: 700, color: '#334155'
              }}>
                <Clock size={14} color="#0d4a2b" /> Real Exam Timer
              </span>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
                background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px',
                padding: '0.4rem 0.75rem', fontSize: '0.75rem', fontWeight: 700, color: '#334155'
              }}>
                <Award size={14} color="#0d4a2b" /> AIR Analytics
              </span>
            </div>
          </div>

          {targetExam && (
            <div style={{
              marginTop: '1.5rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.75rem',
              background: '#f0fdf4',
              border: '1px solid #bcf0da',
              borderRadius: '8px',
              padding: '0.5rem 1.15rem',
              fontSize: '0.82rem',
              color: '#15803d',
              fontWeight: 700,
            }}>
              <span>{showAll ? 'Showing all mock tests' : mappedQuizIds ? `🎯 Focused for: ${targetExam.name}` : `Related tests for: ${targetExam.name}`}</span>
              <button
                type="button"
                onClick={() => setShowAll((v) => !v)}
                style={{
                  background: 'none', border: 'none', color: '#0d4a2b',
                  cursor: 'pointer', fontSize: '0.78rem', fontWeight: 800, textDecoration: 'underline', padding: 0
                }}
              >
                {showAll ? `Only ${targetExam.name}` : 'Show all tests'}
              </button>
            </div>
          )}
        </div>

        {/* Category Tabs: Full Mock, Sectional, Topic-wise, Previous Year */}
        <div style={{
          display: 'flex', gap: '0.5rem', overflowX: 'auto', padding: '0.4rem', marginBottom: '1.5rem',
          background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
        }}>
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  padding: '0.7rem 1.35rem',
                  border: 'none',
                  borderRadius: '10px',
                  background: isActive ? '#0d4a2b' : 'transparent',
                  color: isActive ? '#ffffff' : '#64748b',
                  fontWeight: isActive ? 800 : 600,
                  fontSize: '0.82rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  boxShadow: isActive ? '0 3px 10px rgba(13, 74, 43, 0.28)' : 'none',
                  transition: 'all 0.15s ease'
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Search Input Bar */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '0.75rem', background: '#ffffff',
          border: '1px solid #e2e8f0', borderRadius: '12px', padding: '0.85rem 1.35rem',
          marginBottom: '2rem', boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
        }}>
          <Search size={18} color="#0d4a2b" />
          <input
            type="text"
            placeholder={activeGroup ? `Search tests in ${activeGroup.label}...` : 'Search mock tests, sections, or exams...'}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{
              border: 'none', outline: 'none', width: '100%', fontSize: '0.92rem',
              fontWeight: 500, color: '#0f172a', background: 'transparent'
            }}
          />
        </div>

        {/* Quizzes / Subject Groups Rendering */}
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '5rem' }}>
            <RefreshCw className="animate-spin" size={32} color="#0d4a2b" />
          </div>
        ) : allFilteredQuizzes.length === 0 ? (
          <div style={{
            textAlign: 'center', padding: '4.5rem 2rem', background: '#ffffff',
            border: '1px solid #e2e8f0', borderRadius: '16px', boxShadow: '0 4px 16px rgba(0,0,0,0.03)'
          }}>
            <Brain size={48} color="#cbd5e1" style={{ marginBottom: '1rem' }} />
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.5rem 0' }}>No Mock Tests Found</h3>
            <p style={{ color: '#64748b', fontSize: '0.88rem', margin: 0 }}>Try selecting a different category tab or clear your search query.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '1.5rem' }}>
            {allFilteredQuizzes.map(renderQuizCard)}
          </div>
        )}

      </div>
    </div>
  );
}
