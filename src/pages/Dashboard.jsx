import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { BookOpen, Award, Target, ExternalLink, ShieldCheck, MapPin, Briefcase, RefreshCw, ChevronDown, ChevronUp, FileText, PlayCircle, Landmark } from 'lucide-react';

const PreparationPanel = ({ examName }) => {
  const [resources, setResources] = useState([]);
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPrepData = async () => {
      setLoading(true);
      try {
        const [resData, quizData] = await Promise.all([
          supabase.from('resources').select('*').eq('exam_name', examName).limit(3),
          supabase.from('quizzes').select('*').eq('exam_name', examName).limit(3)
        ]);
        
        setResources(resData.data || []);
        setQuizzes(quizData.data || []);
      } catch (err) {
        console.error('Error fetching prep materials:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchPrepData();
  }, [examName]);

  if (loading) return <div style={{ padding: '1rem', textAlign: 'center' }}><RefreshCw className="animate-spin" size={20} color="var(--ios-olive)" /></div>;

  if (resources.length === 0 && quizzes.length === 0) {
    return <div style={{ padding: '1rem', textAlign: 'center', color: '#999', fontSize: '0.9rem' }}>No specific preparation materials found for this exam.</div>;
  }

  return (
    <div className="prep-panel animate-fade-in" style={{ padding: '1rem 0', borderTop: '1px solid rgba(0,0,0,0.05)', marginTop: '1rem' }}>
      <h4 style={{ fontSize: '0.85rem', color: 'var(--ios-olive)', marginBottom: '1rem', fontWeight: '800' }}>RECOMMENDED PREPARATION</h4>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <div className="prep-section">
          <h5 style={{ fontSize: '0.75rem', color: '#888', marginBottom: '0.5rem' }}>STUDY GUIDES</h5>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {resources.map(res => (
              <Link key={res.id} to={`/reader/${res.id}`} className="prep-item">
                <FileText size={14} />
                <span>{res.title}</span>
              </Link>
            ))}
          </div>
        </div>
        <div className="prep-section">
          <h5 style={{ fontSize: '0.75rem', color: '#888', marginBottom: '0.5rem' }}>PRACTICE QUIZZES</h5>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {quizzes.map(quiz => (
              <Link key={quiz.id} to={`/quiz/${quiz.id}`} className="prep-item">
                <PlayCircle size={14} />
                <span>{quiz.title}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const Dashboard = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expandedExamId, setExpandedExamId] = useState(null);

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        let data = null;
        
        if (session) {
          const { data: profileData, error } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();
          data = profileData;
        }

        if (data) {
          setProfile(data);
        } else {
          // Fallback to mock profile for dummy testing
          setProfile({
            full_name: 'Test Veer',
            veer_score: 92,
            profiling_completed: true,
            recommendations: [
              {
                exam_name: "SSC Stenographer Grade ‘C’ & ‘D’",
                match_score: 95,
                career_track: "SSC",
                website: "https://ssc.gov.in"
              },
              {
                exam_name: "RRB Jr. Engineer",
                match_score: 88,
                career_track: "Railways",
                website: "https://indianrailways.gov.in"
              }
            ]
          });
        }
      } catch (err) {
        console.error('Error fetching profile:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [navigate]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: 'var(--ios-bg)' }}>
        <div style={{ textAlign: 'center' }}>
          <RefreshCw className="animate-spin" size={32} color="var(--ios-olive)" />
          <p style={{ marginTop: '1rem', color: 'var(--text-secondary)' }}>Loading your profile...</p>
        </div>
      </div>
    );
  }

  if (profile && !profile.profiling_completed) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 'calc(100vh - 64px)', padding: '2rem' }}>
        <div className="ios-card animate-fade-in" style={{ maxWidth: '500px', textAlign: 'center' }}>
          <ShieldCheck size={64} color="var(--ios-olive)" style={{ marginBottom: '1.5rem', opacity: 0.2 }} />
          <h2 style={{ fontSize: '1.5rem' }}>Complete Your Profile</h2>
          <p style={{ marginBottom: '2rem', color: 'var(--text-secondary)' }}>We need a few details to calculate your Veer Score and find the best exam matches for you.</p>
          <Link to="/profiling" className="btn-primary ios-pill" style={{ textDecoration: 'none', display: 'inline-block' }}>Start Profiling</Link>
        </div>
      </div>
    );
  }

  const recommendations = profile?.recommendations || [];

  const handleRecalculate = async () => {
    if (!profile?.profile_data) {
      navigate('/profiling');
      return;
    }

    setLoading(true);
    try {
      const ENGINE_URL = import.meta.env.VITE_ENGINE_URL || 'https://veernxt-profiling-engine.onrender.com';
      const response = await axios.post(`${ENGINE_URL}/api/recommend`, profile.profile_data);
      
      if (response.data.ok) {
        const { error } = await supabase
          .from('user_profiles')
          .update({
            recommendations: response.data.recommendations,
            veer_score: response.data.summary?.overall_match_score || 0,
            updated_at: new Date().toISOString()
          })
          .eq('id', profile.id);

        if (error) throw error;
        window.location.reload(); // Refresh to show new results
      }
    } catch (err) {
      console.error('Recalculation failed:', err);
      alert('Failed to recalculate: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dashboard-wrapper">
      <div className="dashboard-content animate-fade-in">
        <div className="welcome-hero animate-fade-in">
          <div className="welcome-content">
            <h1 style={{ fontSize: '2.5rem', tracking: '-0.03em', color: 'white' }}>Hello, {profile?.full_name?.split(' ')[0] || 'Agniveer'}</h1>
            <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '1.1rem', marginBottom: '1.5rem' }}>Here are your top career recommendations based on your military profile.</p>
            
            <div style={{ display: 'flex', gap: '1rem' }}>
              <Link to="/profiling" className="btn-secondary ios-pill" style={{ textDecoration: 'none', background: 'rgba(255,255,255,0.2)', color: 'white', borderColor: 'rgba(255,255,255,0.3)' }}>
                Edit Profile
              </Link>
              <button 
                onClick={handleRecalculate} 
                disabled={loading}
                className="btn-secondary ios-pill" 
                style={{ background: 'rgba(255,255,255,0.1)', color: 'white', borderColor: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              >
                {loading ? <RefreshCw className="animate-spin" size={14} /> : <RefreshCw size={14} />} 
                Recalculate
              </button>
            </div>
          </div>
        </div>

        <div className="dashboard-grid">
          {/* Veer Score Card */}
          <div className="ios-card score-card">
            <div className="card-top">
              <Award size={24} color="var(--ios-olive)" />
              <span className="font-cta" style={{ fontWeight: '700', fontSize: '0.9rem', color: 'var(--ios-olive)' }}>VEER SCORE</span>
            </div>
            <div className="score-display">
              {profile?.veer_score ? Math.round(profile.veer_score) : '—'}
            </div>
            <p className="card-desc">Your overall readiness score calculated from service history, skills, and physical standards.</p>
          </div>

          {/* Learning Center CTA */}
          <div className="ios-card library-card">
            <div className="card-top">
              <BookOpen size={24} color="var(--ios-olive)" />
              <span className="font-cta" style={{ fontWeight: '700', fontSize: '0.9rem', color: 'var(--ios-olive)' }}>LEARNING CENTER</span>
            </div>
            <p className="card-desc" style={{ marginBottom: '1.5rem' }}>
              Access curated textbooks, practice papers, and secure readers for your targeted exams.
            </p>
            <Link to="/learning-center" className="btn-primary ios-pill" style={{ textDecoration: 'none', textAlign: 'center', fontSize: '0.9rem' }}>
              Enter Library
            </Link>
          </div>

          {/* Financial Guidance CTA */}
          <div className="ios-card library-card" style={{ gridColumn: 'span 2' }}>
            <div className="card-top">
              <Landmark size={24} color="var(--ios-olive)" />
              <span className="font-cta" style={{ fontWeight: '700', fontSize: '0.9rem', color: 'var(--ios-olive)' }}>FINANCIAL GUIDANCE</span>
            </div>
            <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
              <p className="card-desc" style={{ flex: 1 }}>
                Explore tailored financial schemes, low-interest education loans, and start-up seed funding designed for candidates and transitioning service members.
              </p>
              <Link to="/financial-guidance" className="btn-primary ios-pill" style={{ textDecoration: 'none', whiteSpace: 'nowrap', fontSize: '0.9rem' }}>
                View Schemes
              </Link>
            </div>
          </div>

          {/* Matches Section */}
          <div className="ios-card matches-card">
            <div className="card-top" style={{ marginBottom: '2rem' }}>
              <Target size={24} color="var(--ios-olive)" />
              <h2 style={{ fontSize: '1.25rem', margin: 0 }}>Top Exam Matches</h2>
            </div>
            
            {recommendations.length > 0 ? (
              <div className="recommendations-list">
                {recommendations.slice(0, 5).map((rec, idx) => (
                  <React.Fragment key={rec.exam_id || idx}>
                    <div className="recommendation-item">
                    <div className="rec-rank">{idx + 1}</div>
                    <div className="rec-info">
                      <h3 style={{ fontSize: '1.05rem', marginBottom: '0.2rem' }}>{rec.exam_name}</h3>
                      <div className="rec-meta">
                        <span><Briefcase size={14} /> {rec.career_track}</span>
                        {rec.state_ut && <span><MapPin size={14} /> {rec.state_ut}</span>}
                      </div>
                    </div>
                    <div className="rec-score-section">
                      <div className="score-bar-bg">
                        <div className="score-bar-fill" style={{ width: `${rec.match_score}%` }}></div>
                      </div>
                      <span className="score-text">{Math.round(rec.match_score)}% Match</span>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <button 
                        onClick={() => setExpandedExamId(expandedExamId === rec.exam_id ? null : rec.exam_id)}
                        className="btn-secondary ios-pill"
                        style={{ padding: '0.5rem 1rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                      >
                        {expandedExamId === rec.exam_id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        Prepare
                      </button>
                      <a href={rec.website} target="_blank" rel="noopener noreferrer" className="rec-link">
                        <ExternalLink size={18} />
                      </a>
                    </div>
                  </div>
                  {expandedExamId === rec.exam_id && <PreparationPanel examName={rec.exam_name} />}
                </React.Fragment>
              ))}
              </div>
            ) : (
              <div className="empty-matches">
                <p>No matches found yet.</p>
                <Link to="/profiling" className="btn-primary ios-pill" style={{ textDecoration: 'none' }}>Update Profile</Link>
              </div>
            )}
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .dashboard-wrapper {
          padding: 3rem 1.5rem;
          max-width: 1100px;
          margin: 0 auto;
        }
        .welcome-hero {
          margin-bottom: 3rem;
          background-image: linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.5)), url("/hero/hero_image.png");
          background-size: cover;
          background-position: center;
          padding: 4rem 3rem;
          border-radius: 24px;
          position: relative;
          overflow: hidden;
          box-shadow: 0 20px 40px rgba(0,0,0,0.1);
        }
        .welcome-content {
          position: relative;
          z-index: 2;
        }
        .dashboard-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1.5rem;
        }
        .card-top {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 1.25rem;
        }
        .score-card .score-display {
          font-size: 5rem;
          font-weight: 800;
          letter-spacing: -0.05em;
          line-height: 1;
          margin-bottom: 1rem;
          color: var(--ios-olive);
        }
        .card-desc {
          color: #777;
          font-size: 0.95rem;
          line-height: 1.5;
        }
        .library-card {
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }
        .matches-card {
          grid-column: span 2;
        }
        .recommendations-list {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }
        .recommendation-item {
          display: flex;
          align-items: center;
          gap: 1.25rem;
          padding: 1rem;
          background: var(--ios-secondary);
          border-radius: 16px;
          transition: transform 0.2s;
        }
        .recommendation-item:hover {
          transform: scale(1.01);
        }
        .rec-rank {
          width: 32px;
          height: 32px;
          background: white;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          color: var(--ios-olive);
          font-size: 0.9rem;
        }
        .rec-info {
          flex: 1;
        }
        .rec-meta {
          display: flex;
          gap: 1rem;
          font-size: 0.75rem;
          color: #888;
        }
        .rec-meta span {
          display: flex;
          align-items: center;
          gap: 0.25rem;
        }
        .rec-score-section {
          width: 140px;
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
        }
        .score-bar-bg {
          height: 6px;
          background: rgba(0,0,0,0.05);
          border-radius: 3px;
          overflow: hidden;
        }
        .score-bar-fill {
          height: 100%;
          background: var(--ios-olive);
          border-radius: 3px;
        }
        .score-text {
          font-size: 0.7rem;
          font-weight: 700;
          color: var(--ios-olive);
          text-align: right;
        }
        .rec-link {
          color: #ccc;
          transition: color 0.2s;
        }
        .rec-link:hover {
          color: var(--ios-olive);
        }
        .prep-item {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem;
          background: white;
          border-radius: 8px;
          text-decoration: none;
          color: var(--ios-text);
          font-size: 0.8rem;
          font-weight: 600;
          transition: all 0.2s;
          border: 1px solid transparent;
        }
        .prep-item:hover {
          border-color: var(--ios-olive);
          color: var(--ios-olive);
          transform: translateX(4px);
        }
        .animate-spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @media (max-width: 850px) {
          .dashboard-grid { grid-template-columns: 1fr; }
          .matches-card { grid-column: auto; }
          .recommendation-item { flex-wrap: wrap; gap: 0.75rem; }
          .rec-score-section { width: 100%; order: 3; }
        }
      `}} />
    </div>
  );
};

export default Dashboard;
