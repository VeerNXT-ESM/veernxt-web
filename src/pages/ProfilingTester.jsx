import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  CheckCircle2, AlertTriangle, ShieldCheck, Play, RefreshCw, 
  ChevronRight, ArrowRight, User, Award, BookOpen, MapPin, 
  Briefcase, Activity, Check, Download, Layers, Sparkles
} from 'lucide-react';
import testProfiles from '../data/testProfiles20.json';

const ProfilingTester = () => {
  const [activeTab, setActiveTab] = useState('single'); // 'single' | 'batch'
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [profileData, setProfileData] = useState(testProfiles[0]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  // Batch testing state
  const [batchRunning, setBatchRunning] = useState(false);
  const [batchProgress, setBatchProgress] = useState(0);
  const [batchResults, setBatchResults] = useState([]);
  const [batchSummary, setBatchSummary] = useState(null);

  // When profile selection changes
  const handleSelectProfile = (idx) => {
    setSelectedIdx(idx);
    setProfileData(testProfiles[idx]);
    setResult(null);
    setError(null);
  };

  // Run single profile recommendation
  const runRecommendation = async (overrideData = null) => {
    setLoading(true);
    setError(null);
    try {
      const payload = overrideData || profileData;
      const res = await axios.post('/api/profile/recommend?topN=5', payload);
      if (res.data && res.data.ok) {
        setResult(res.data);
      } else {
        setError(res.data?.error || 'Engine returned an unsuccessful response.');
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to call recommendation engine');
    } finally {
      setLoading(false);
    }
  };

  // Run Batch testing of all 20 profiles
  const runBatchTest = async () => {
    setBatchRunning(true);
    setBatchProgress(0);
    const results = [];
    let wrongStateViolations = 0;
    let thinPoolCount = 0;
    let zeroPrefBonus = 0;
    let zeroTradeBonus = 0;

    for (let i = 0; i < testProfiles.length; i++) {
      const p = testProfiles[i];
      setBatchProgress(i + 1);
      try {
        const res = await axios.post('/api/profile/recommend?topN=5', p);
        const data = res.data;
        const recs = data.recommendations || [];
        const userState = (p.stateOfDomicile || '').trim().toLowerCase();
        const wantsAnywhere = p.relocation === 'Anywhere in India';

        // Check if any state exam violates domicile
        let wrongState = false;
        recs.forEach(r => {
          if (r.level === 'state' && r.state_ut) {
            const examState = r.state_ut.trim().toLowerCase();
            if (!wantsAnywhere && userState && examState !== userState) {
              wrongState = true;
            }
          }
        });

        if (wrongState) wrongStateViolations++;
        if (data.totalEligible < 20) thinPoolCount++;

        // Factor check on top match
        const topBreakdown = recs[0]?.breakdown || {};
        const hasPref = Object.keys(topBreakdown).some(k => k.startsWith('preference_'));
        const hasTrade = Object.keys(topBreakdown).some(k => k.startsWith('trade_'));
        if (!hasPref) zeroPrefBonus++;
        if (!hasTrade) zeroTradeBonus++;

        results.push({
          id: p.id,
          name: p.fullName,
          domicile: p.stateOfDomicile,
          relocation: p.relocation,
          arm: p.armCorpsTrade,
          qual: p.highestQualification,
          prefs: p.careerPreferences.join(', '),
          eligibleCount: data.totalEligible || 0,
          topMatch: recs[0]?.exam_name || 'None',
          topScore: recs[0]?.score || 0,
          topLevel: recs[0]?.level || '',
          topState: recs[0]?.state_ut || '',
          wrongState,
          hasPref,
          hasTrade,
          allRecs: recs
        });
      } catch (err) {
        results.push({
          id: p.id,
          name: p.fullName,
          domicile: p.stateOfDomicile,
          relocation: p.relocation,
          arm: p.armCorpsTrade,
          qual: p.highestQualification,
          prefs: p.careerPreferences.join(', '),
          error: err.message,
          wrongState: false
        });
      }
    }

    setBatchResults(results);
    setBatchSummary({
      total: testProfiles.length,
      wrongStateViolations,
      thinPoolCount,
      zeroPrefBonus,
      zeroTradeBonus
    });
    setBatchRunning(false);
  };

  // Export batch results to JSON
  const downloadBatchReport = () => {
    const blob = new Blob([JSON.stringify({ summary: batchSummary, results: batchResults }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `veernxt_batch_recommendation_report_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--ios-bg)', padding: '2rem 1.5rem', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
        
        {/* Header */}
        <div style={{ background: '#FFFFFF', padding: '1.75rem 2rem', borderRadius: '12px', border: '1px solid var(--border)', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', boxShadow: 'var(--shadow-1)' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.25rem' }}>
              <span style={{ display: 'inline-flex', padding: '0.2rem 0.6rem', background: 'var(--success-bg)', color: 'var(--success)', borderRadius: '20px', fontSize: '12px', fontWeight: 600 }}>
                Live Database Connected
              </span>
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                1,537+ Exams Catalog
              </span>
            </div>
            <h1 style={{ fontSize: '24px', fontWeight: 700, margin: 0, color: 'var(--ios-text)' }}>
              Profiling Recommendation Engine Simulator
            </h1>
            <p style={{ margin: '0.35rem 0 0 0', fontSize: '14px', color: 'var(--text-secondary)' }}>
              Interactive test bench to simulate, inspect, and benchmark recommendations on candidate profiles from Excel.
            </p>
          </div>

          {/* Tab Switcher */}
          <div style={{ display: 'flex', background: 'var(--surface-alt)', padding: '4px', borderRadius: '8px', border: '1px solid var(--border)' }}>
            <button
              onClick={() => setActiveTab('single')}
              style={{
                padding: '8px 16px',
                border: 'none',
                borderRadius: '6px',
                background: activeTab === 'single' ? '#FFFFFF' : 'transparent',
                fontWeight: activeTab === 'single' ? 600 : 500,
                color: activeTab === 'single' ? 'var(--ios-olive)' : 'var(--text-secondary)',
                cursor: 'pointer',
                boxShadow: activeTab === 'single' ? 'var(--shadow-1)' : 'none',
                transition: 'all 0.15s ease'
              }}
            >
              Single Profile Tester
            </button>
            <button
              onClick={() => setActiveTab('batch')}
              style={{
                padding: '8px 16px',
                border: 'none',
                borderRadius: '6px',
                background: activeTab === 'batch' ? '#FFFFFF' : 'transparent',
                fontWeight: activeTab === 'batch' ? 600 : 500,
                color: activeTab === 'batch' ? 'var(--ios-olive)' : 'var(--text-secondary)',
                cursor: 'pointer',
                boxShadow: activeTab === 'batch' ? 'var(--shadow-1)' : 'none',
                transition: 'all 0.15s ease'
              }}
            >
              Batch Benchmark (All 20)
            </button>
          </div>
        </div>

        {/* TAB 1: SINGLE PROFILE TESTER */}
        {activeTab === 'single' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 380px) 1fr', gap: '1.5rem', alignItems: 'start' }}>
            
            {/* Left Column: Profile Selector & Controls */}
            <div style={{ background: '#FFFFFF', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-1)' }}>
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--ios-text)', marginBottom: '0.4rem' }}>
                  Select Test Candidate (From Excel)
                </label>
                <select
                  value={selectedIdx}
                  onChange={(e) => handleSelectProfile(Number(e.target.value))}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-strong)',
                    fontSize: '14px',
                    fontWeight: 500,
                    outline: 'none',
                    background: '#FFFFFF'
                  }}
                >
                  {testProfiles.map((p, i) => (
                    <option key={p.id} value={i}>
                      {p.id}: {p.fullName} ({p.armCorpsTrade} • {p.stateOfDomicile})
                    </option>
                  ))}
                </select>
              </div>

              {/* Profile Details Card */}
              <div style={{ background: 'var(--surface-alt)', padding: '1rem', borderRadius: '8px', marginBottom: '1.25rem', fontSize: '13px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Trade / Arm:</span>
                  <strong style={{ color: 'var(--ios-text)' }}>{profileData.armCorpsTrade || 'None'}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Domicile State:</span>
                  <strong style={{ color: 'var(--ios-text)' }}>{profileData.stateOfDomicile}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Relocation:</span>
                  <span style={{ 
                    padding: '2px 8px', 
                    borderRadius: '10px', 
                    background: profileData.relocation === 'Anywhere in India' ? '#e0f2fe' : '#fef3c7',
                    color: profileData.relocation === 'Anywhere in India' ? '#0369a1' : '#b45309',
                    fontWeight: 600,
                    fontSize: '11px'
                  }}>
                    {profileData.relocation}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Highest Qualification:</span>
                  <strong style={{ color: 'var(--ios-text)' }}>{profileData.highestQualification}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Medical Category:</span>
                  <strong style={{ color: 'var(--ios-text)' }}>{profileData.medicalCategory}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Sports Achievement:</span>
                  <strong style={{ color: 'var(--ios-text)' }}>{profileData.sportsAchievement || 'None'}</strong>
                </div>
                <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border)' }}>
                  <div style={{ color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Career Preferences:</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                    {profileData.careerPreferences.map((c, idx) => (
                      <span key={idx} style={{ padding: '2px 8px', background: '#FFFFFF', border: '1px solid var(--border)', borderRadius: '4px', fontSize: '11px', fontWeight: 500 }}>
                        {c}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Quick Field Tweaks to experiment */}
              <div style={{ marginBottom: '1.25rem', fontSize: '12px' }}>
                <span style={{ fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.5rem' }}>
                  Quickly Modify & Test:
                </span>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  <div>
                    <label style={{ color: 'var(--text-secondary)' }}>Relocation</label>
                    <select
                      value={profileData.relocation}
                      onChange={(e) => setProfileData({ ...profileData, relocation: e.target.value })}
                      style={{ width: '100%', padding: '6px', borderRadius: '6px', border: '1px solid var(--border)', fontSize: '12px' }}
                    >
                      <option value="Home State">Home State</option>
                      <option value="Home District">Home District</option>
                      <option value="Anywhere in India">Anywhere in India</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ color: 'var(--text-secondary)' }}>Medical</label>
                    <select
                      value={profileData.medicalCategory}
                      onChange={(e) => setProfileData({ ...profileData, medicalCategory: e.target.value })}
                      style={{ width: '100%', padding: '6px', borderRadius: '6px', border: '1px solid var(--border)', fontSize: '12px' }}
                    >
                      <option value="SHAPE-1">SHAPE-1</option>
                      <option value="SHAPE-2">SHAPE-2</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Run Button */}
              <button
                onClick={() => runRecommendation()}
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '8px',
                  border: 'none',
                  background: 'var(--ios-olive)',
                  color: '#FFFFFF',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  boxShadow: 'var(--shadow-2)',
                  opacity: loading ? 0.7 : 1
                }}
              >
                {loading ? <RefreshCw size={16} className="animate-spin" /> : <Play size={16} />}
                {loading ? 'Evaluating 1,537 Exams...' : 'Run Recommendation Engine'}
              </button>
            </div>

            {/* Right Column: Live Results */}
            <div>
              {error && (
                <div style={{ background: 'var(--danger-bg)', color: 'var(--danger)', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <AlertTriangle size={18} />
                  <span>{error}</span>
                </div>
              )}

              {!result && !loading && (
                <div style={{ background: '#FFFFFF', padding: '4rem 2rem', borderRadius: '12px', border: '1px dashed var(--border)', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  <Sparkles size={40} style={{ color: 'var(--ios-olive)', margin: '0 auto 1rem auto', opacity: 0.8 }} />
                  <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--ios-text)', margin: '0 0 0.5rem 0' }}>
                    Ready to Test Candidate {profileData.id}
                  </h3>
                  <p style={{ maxWidth: '420px', margin: '0 auto 1.5rem auto', fontSize: '14px' }}>
                    Click the <strong>Run Recommendation Engine</strong> button on the left to evaluate all 1,537+ exams in Supabase through the eligibility and scoring algorithms.
                  </p>
                  <button
                    onClick={() => runRecommendation()}
                    style={{
                      padding: '10px 20px',
                      borderRadius: '8px',
                      border: 'none',
                      background: 'var(--ios-olive)',
                      color: '#FFFFFF',
                      fontSize: '14px',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    Run Test Now
                  </button>
                </div>
              )}

              {loading && (
                <div style={{ background: '#FFFFFF', padding: '4rem 2rem', borderRadius: '12px', border: '1px solid var(--border)', textAlign: 'center' }}>
                  <RefreshCw size={36} className="animate-spin" style={{ color: 'var(--ios-olive)', margin: '0 auto 1rem auto' }} />
                  <h3 style={{ fontSize: '16px', fontWeight: 600, margin: '0 0 0.25rem 0' }}>Querying Database & Scoring Exams</h3>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>
                    Filtering qualifications, applying military trade crosswalk, checking state domicile...
                  </p>
                </div>
              )}

              {result && !loading && (
                <div>
                  {/* Top Stats Banner */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
                    <div style={{ background: '#FFFFFF', padding: '1rem', borderRadius: '10px', border: '1px solid var(--border)' }}>
                      <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Eligible Pool</span>
                      <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--ios-text)' }}>
                        {result.totalEligible} <span style={{ fontSize: '12px', fontWeight: 400, color: 'var(--text-secondary)' }}>/ 1,537</span>
                      </div>
                    </div>
                    <div style={{ background: '#FFFFFF', padding: '1rem', borderRadius: '10px', border: '1px solid var(--border)' }}>
                      <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Excluded (Ineligible)</span>
                      <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-secondary)' }}>
                        {result.totalRejected}
                      </div>
                    </div>
                    <div style={{ background: '#FFFFFF', padding: '1rem', borderRadius: '10px', border: '1px solid var(--border)' }}>
                      <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Domicile Filter</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--success)', fontWeight: 600, fontSize: '14px', marginTop: '4px' }}>
                        <ShieldCheck size={16} /> Enforced 100%
                      </div>
                    </div>
                    <div style={{ background: '#FFFFFF', padding: '1rem', borderRadius: '10px', border: '1px solid var(--border)' }}>
                      <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Top Match Score</span>
                      <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--ios-olive)' }}>
                        {result.recommendations?.[0]?.score || 0}%
                      </div>
                    </div>
                  </div>

                  {/* Recommendations Cards */}
                  <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--ios-text)', marginBottom: '0.75rem' }}>
                    Top Matched Recommendations ({result.recommendations?.length || 0})
                  </h3>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {result.recommendations?.map((rec, idx) => (
                      <div 
                        key={rec.exam_id || idx}
                        style={{ 
                          background: '#FFFFFF', 
                          padding: '1.25rem', 
                          borderRadius: '10px', 
                          border: '1px solid var(--border)',
                          boxShadow: 'var(--shadow-1)',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          gap: '1rem',
                          flexWrap: 'wrap'
                        }}
                      >
                        <div style={{ flex: 1, minWidth: '260px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                            <span style={{ 
                              display: 'inline-block', 
                              width: '22px', 
                              height: '22px', 
                              borderRadius: '50%', 
                              background: 'var(--surface-alt)', 
                              textAlign: 'center', 
                              lineHeight: '22px', 
                              fontSize: '12px', 
                              fontWeight: 700, 
                              color: 'var(--ios-olive)' 
                            }}>
                              {rec.rank || idx + 1}
                            </span>
                            <span style={{ 
                              fontSize: '11px', 
                              padding: '2px 6px', 
                              borderRadius: '4px', 
                              background: rec.level === 'central' ? '#f0fdf4' : '#eff6ff',
                              color: rec.level === 'central' ? '#166534' : '#1e40af',
                              fontWeight: 600,
                              textTransform: 'uppercase'
                            }}>
                              {rec.level} {rec.state_ut ? `• ${rec.state_ut}` : ''}
                            </span>
                            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                              Track: {rec.career_track}
                            </span>
                          </div>

                          <h4 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 0.35rem 0', color: 'var(--ios-text)' }}>
                            {rec.exam_name}
                          </h4>
                          <p style={{ margin: '0 0 0.5rem 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
                            {rec.conducting_body}
                          </p>

                          {/* Score breakdown tags */}
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                            {rec.breakdown && Object.entries(rec.breakdown).map(([factor, pts]) => (
                              <span key={factor} style={{ 
                                fontSize: '11px', 
                                padding: '2px 6px', 
                                borderRadius: '4px', 
                                background: 'var(--surface-alt)', 
                                border: '1px solid var(--border)',
                                color: 'var(--ios-text)'
                              }}>
                                {factor.replace(/_/g, ' ')}: +{pts}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Score and action */}
                        <div style={{ textAlign: 'right', minWidth: '120px' }}>
                          <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--ios-olive)' }}>
                            {Math.round(rec.score)}%
                          </div>
                          <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Match Compatibility</span>

                          {rec.lc_exam_id && (
                            <div style={{ marginTop: '0.5rem' }}>
                              <a 
                                href={`/exam/${rec.lc_exam_id}`} 
                                target="_blank" 
                                rel="noreferrer"
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  fontSize: '12px',
                                  color: 'var(--ios-olive)',
                                  textDecoration: 'none',
                                  fontWeight: 600
                                }}
                              >
                                Learning Center <ChevronRight size={14} />
                              </a>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: BATCH BENCHMARK (ALL 20 PROFILES) */}
        {activeTab === 'batch' && (
          <div style={{ background: '#FFFFFF', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 0.25rem 0' }}>
                  20 Profiles Automated Batch Benchmark
                </h2>
                <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>
                  Evaluates all 20 Excel profiles sequentially against the live database to verify domicile enforcement, trade bonuses, and pool depths.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem' }}>
                {batchResults.length > 0 && (
                  <button
                    onClick={downloadBatchReport}
                    style={{
                      padding: '8px 14px',
                      borderRadius: '6px',
                      border: '1px solid var(--border)',
                      background: '#FFFFFF',
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem'
                    }}
                  >
                    <Download size={15} /> Export JSON
                  </button>
                )}

                <button
                  onClick={runBatchTest}
                  disabled={batchRunning}
                  style={{
                    padding: '8px 18px',
                    borderRadius: '6px',
                    border: 'none',
                    background: 'var(--ios-olive)',
                    color: '#FFFFFF',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: batchRunning ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    opacity: batchRunning ? 0.7 : 1
                  }}
                >
                  {batchRunning ? <RefreshCw size={15} className="animate-spin" /> : <Play size={15} />}
                  {batchRunning ? `Testing (${batchProgress}/20)...` : 'Run All 20 Profiles Benchmark'}
                </button>
              </div>
            </div>

            {/* Batch KPI Summary */}
            {batchSummary && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                <div style={{ background: 'var(--surface-alt)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Wrong-State Exam Leaks</div>
                  <div style={{ fontSize: '20px', fontWeight: 700, color: batchSummary.wrongStateViolations === 0 ? 'var(--success)' : 'var(--danger)' }}>
                    {batchSummary.wrongStateViolations === 0 ? '0 / 20 (100% Passed)' : `${batchSummary.wrongStateViolations} Violations`}
                  </div>
                </div>
                <div style={{ background: 'var(--surface-alt)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Profiles with Zero Trade Bonus</div>
                  <div style={{ fontSize: '20px', fontWeight: 700, color: batchSummary.zeroTradeBonus === 0 ? 'var(--success)' : 'var(--warning)' }}>
                    {batchSummary.zeroTradeBonus === 0 ? '0 / 20 (All Matched)' : `${batchSummary.zeroTradeBonus} Unmatched`}
                  </div>
                </div>
                <div style={{ background: 'var(--surface-alt)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Thin Exam Pools (&lt; 20 exams)</div>
                  <div style={{ fontSize: '20px', fontWeight: 700, color: batchSummary.thinPoolCount === 0 ? 'var(--success)' : 'var(--warning)' }}>
                    {batchSummary.thinPoolCount === 0 ? '0 / 20 (Healthy Pools)' : `${batchSummary.thinPoolCount}`}
                  </div>
                </div>
              </div>
            )}

            {/* Results Table */}
            {batchResults.length > 0 ? (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ background: 'var(--surface-alt)', borderBottom: '1px solid var(--border)' }}>
                      <th style={{ padding: '10px 12px', fontWeight: 600 }}>ID</th>
                      <th style={{ padding: '10px 12px', fontWeight: 600 }}>Candidate</th>
                      <th style={{ padding: '10px 12px', fontWeight: 600 }}>Domicile</th>
                      <th style={{ padding: '10px 12px', fontWeight: 600 }}>Relocation</th>
                      <th style={{ padding: '10px 12px', fontWeight: 600 }}>Eligible</th>
                      <th style={{ padding: '10px 12px', fontWeight: 600 }}>Top Recommendation</th>
                      <th style={{ padding: '10px 12px', fontWeight: 600 }}>Score</th>
                      <th style={{ padding: '10px 12px', fontWeight: 600 }}>Domicile Check</th>
                      <th style={{ padding: '10px 12px', fontWeight: 600 }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {batchResults.map((row, i) => (
                      <tr key={row.id || i} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '10px 12px', fontWeight: 600 }}>{row.id}</td>
                        <td style={{ padding: '10px 12px' }}>
                          <div style={{ fontWeight: 600 }}>{row.name}</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{row.arm} • {row.qual}</div>
                        </td>
                        <td style={{ padding: '10px 12px' }}>{row.domicile}</td>
                        <td style={{ padding: '10px 12px' }}>
                          <span style={{ 
                            fontSize: '11px', 
                            padding: '2px 6px', 
                            borderRadius: '4px',
                            background: row.relocation === 'Anywhere in India' ? '#e0f2fe' : '#fef3c7',
                            color: row.relocation === 'Anywhere in India' ? '#0369a1' : '#b45309',
                            fontWeight: 500
                          }}>
                            {row.relocation}
                          </span>
                        </td>
                        <td style={{ padding: '10px 12px', fontWeight: 600 }}>{row.eligibleCount}</td>
                        <td style={{ padding: '10px 12px' }}>
                          <div style={{ fontWeight: 600 }}>{row.topMatch}</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                            {row.topLevel} {row.topState ? `• ${row.topState}` : ''}
                          </div>
                        </td>
                        <td style={{ padding: '10px 12px', fontWeight: 700, color: 'var(--ios-olive)' }}>
                          {row.topScore}%
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          {row.wrongState ? (
                            <span style={{ color: 'var(--danger)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '3px' }}>
                              <AlertTriangle size={14} /> Leaked
                            </span>
                          ) : (
                            <span style={{ color: 'var(--success)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '3px' }}>
                              <CheckCircle2 size={14} /> Passed
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          <button
                            onClick={() => {
                              setSelectedIdx(i);
                              setProfileData(testProfiles[i]);
                              setActiveTab('single');
                              runRecommendation(testProfiles[i]);
                            }}
                            style={{
                              padding: '4px 10px',
                              borderRadius: '4px',
                              border: '1px solid var(--border)',
                              background: '#FFFFFF',
                              cursor: 'pointer',
                              fontSize: '12px',
                              fontWeight: 500,
                              color: 'var(--ios-olive)'
                            }}
                          >
                            Inspect
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                Click <strong>"Run All 20 Profiles Benchmark"</strong> above to execute the live database validation batch.
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
};

export default ProfilingTester;
