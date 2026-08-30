import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { ScrollText, Search, RefreshCw, Lock, ArrowLeft } from 'lucide-react';
import { getEffectiveTier, canAccessResource } from '../lib/subscriptionAccess';

export default function PyqCenter() {
  const [papers, setPapers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('All');
  const [effectiveTier, setEffectiveTier] = useState(null);

  useEffect(() => {
    const loadPapers = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const { data: profileRow } = await supabase
            .from('user_profiles')
            .select('subscription_tier, subscription_expires_at')
            .eq('id', session.user.id)
            .maybeSingle();
          if (profileRow) {
            setEffectiveTier(getEffectiveTier(profileRow.subscription_tier, profileRow.subscription_expires_at));
          }
        }

        const { data, error } = await supabase
          .from('pyq_papers')
          .select('*')
          .order('title');

        if (error) throw error;
        setPapers(data || []);
      } catch (err) {
        console.error('Error fetching PYQ papers:', err);
      } finally {
        setLoading(false);
      }
    };
    loadPapers();
  }, []);

  const access = canAccessResource(effectiveTier, 'PYQ');

  const subjects = ['All', ...new Set(papers.map(p => p.subject).filter(Boolean))];

  const filteredPapers = papers.filter(p => {
    const matchesSearch = p.title.toLowerCase().includes(searchText.toLowerCase()) ||
                          (p.exam_name || '').toLowerCase().includes(searchText.toLowerCase()) ||
                          (p.subject || '').toLowerCase().includes(searchText.toLowerCase());
    const matchesSubject = selectedSubject === 'All' || p.subject === selectedSubject;
    return matchesSearch && matchesSubject;
  });

  return (
    <div style={{ minHeight: '100vh', background: '#F4F4F8', padding: '2rem 1.5rem', fontFamily: "'Inter', sans-serif" }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>

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

        <div style={{ marginBottom: '2.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <div style={{
              width: '40px', height: '40px', background: 'rgba(75,107,50,0.08)',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <ScrollText size={22} color="var(--ios-olive)" />
            </div>
            <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--ios-text)', margin: 0, textTransform: 'uppercase', letterSpacing: '-0.5px' }}>
              PYQ Center
            </h1>
          </div>
          <p style={{ margin: 0, fontSize: '0.9rem', color: '#64748b', fontWeight: 500 }}>
            Practice with real questions from previous examinations, with answers and explanations.
          </p>
        </div>

        <div style={{
          display: 'flex', flexDirection: 'column', mdDirection: 'row', gap: '1rem',
          background: 'white', border: '1px solid #e2e8f0', padding: '1.25rem', marginBottom: '2rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', border: '1px solid #e2e8f0', padding: '0.5rem 0.75rem', flex: 1 }}>
            <Search size={16} color="#94a3b8" />
            <input
              type="text"
              placeholder="Search previous year papers..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              style={{ border: 'none', outline: 'none', width: '100%', fontSize: '0.85rem', fontWeight: 500 }}
            />
          </div>

          <div style={{ display: 'flex', gap: '0.35rem', overflowX: 'auto', paddingBottom: '0.25rem' }}>
            {subjects.map(sub => (
              <button
                key={sub}
                onClick={() => setSelectedSubject(sub)}
                style={{
                  background: selectedSubject === sub ? 'var(--ios-olive)' : '#f8fafc',
                  color: selectedSubject === sub ? 'white' : '#64748b',
                  border: `1px solid ${selectedSubject === sub ? 'var(--ios-olive)' : '#e2e8f0'}`,
                  padding: '0.4rem 1rem', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer',
                  textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap'
                }}
              >
                {sub}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '4rem' }}>
            <RefreshCw className="animate-spin" size={24} color="var(--ios-olive)" />
          </div>
        ) : filteredPapers.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem 2rem', background: 'white', border: '1px solid #e2e8f0' }}>
            <ScrollText size={48} color="#cbd5e1" style={{ marginBottom: '1rem' }} />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--ios-text)' }}>No PYQs Found</h3>
            <p style={{ color: '#64748b', fontSize: '0.85rem', margin: 0 }}>Try clearing filters or checking back later.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
            {filteredPapers.map(paper => {
              const locked = !access.allowed;
              return (
                <div
                  key={paper.id}
                  style={{
                    background: 'white', border: '1px solid #e2e8f0', padding: '1.5rem',
                    display: 'flex', flexDirection: 'column', gap: '1rem', position: 'relative'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{
                      fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase',
                      letterSpacing: '0.5px', color: '#64748b', background: '#f8fafc',
                      padding: '0.2rem 0.5rem', border: '1px solid #e2e8f0'
                    }}>
                      {paper.subject || 'GENERAL'}
                    </span>
                    {locked && (
                      <span style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: '0.2rem', fontSize: '0.7rem', fontWeight: 700 }}>
                        <Lock size={12} /> LOCKED
                      </span>
                    )}
                  </div>

                  <div style={{ flex: 1 }}>
                    <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.05rem', fontWeight: 800, color: 'var(--ios-text)', lineHeight: 1.3 }}>
                      {paper.title}
                    </h3>
                    <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b', lineHeight: 1.4 }}>
                      {paper.exam_name || 'Previous year question paper'} {paper.total_questions ? `· ${paper.total_questions} Qs` : ''}
                    </p>
                  </div>

                  <Link
                    to={`/pyq-reader/${paper.id}`}
                    style={{
                      textDecoration: 'none', background: 'var(--ios-olive)', color: 'white',
                      textAlign: 'center', padding: '0.75rem', fontWeight: 800, fontSize: '0.85rem',
                      textTransform: 'uppercase', letterSpacing: '0.5px',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
                      border: 'none', cursor: 'pointer'
                    }}
                  >
                    View Paper
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
