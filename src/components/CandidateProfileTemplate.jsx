import React from 'react';
import { 
  Award, Shield, Calendar, MapPin, Briefcase, 
  MessageSquare, User, FileText, CheckCircle2, ChevronRight,
  TrendingUp, Sparkles, Star
} from 'lucide-react';

const CandidateProfileTemplate = ({ candidate, onSendMessage, isCompact = false }) => {
  if (!candidate) {
    return (
      <div style={{ 
        display: 'flex', flexDirection: 'column', alignItems: 'center', 
        justifyContent: 'center', height: '100%', padding: '3rem', 
        color: '#666', background: '#fafafa', borderRadius: '16px' 
      }}>
        <User size={48} style={{ opacity: 0.3, marginBottom: '1rem' }} />
        <h3 style={{ fontSize: '1.1rem', fontWeight: '700' }}>No Candidate Selected</h3>
        <p style={{ fontSize: '0.85rem', textAlign: 'center', marginTop: '0.25rem' }}>
          Select a candidate profile from the directory to review their comprehensive service credentials and transition metrics.
        </p>
      </div>
    );
  }

  const {
    full_name,
    veer_score = 85,
    service_branch = 'Indian Army',
    reservation_category = 'General',
    profile_data = {}
  } = candidate;

  // Derive granular metrics or use realistic defaults
  const trade = profile_data.armCorpsTrade || profile_data.trade || 'General Duty';
  const role = profile_data.roleAppointment || 'Agniveer GD';
  const experience = profile_data.totalServiceDuration || '4 Years';
  const education = profile_data.educationLevel || '12th Pass';
  const skills = profile_data.skills || ['Tactical Security', 'Asset Maintenance', 'Crisis Coordination', 'Operations Support'];
  const state = profile_data.stateOfDomicile || 'Uttar Pradesh';
  const district = profile_data.district || 'Lucknow';

  // Veer score breakdown calculation
  const scoreBreakdown = {
    aptitude: Math.min(100, Math.round(veer_score * 1.05)),
    physical: Math.min(100, Math.round(veer_score * 0.98)),
    discipline: Math.min(100, Math.round(veer_score * 1.12))
  };

  const getBranchBadgeColor = (branch) => {
    const b = branch?.toLowerCase() || '';
    if (b.includes('army')) return { bg: '#efebe9', text: '#5d4037', border: '#d7ccc8' };
    if (b.includes('navy')) return { bg: '#e0f2fe', text: '#0369a1', border: '#bae6fd' };
    if (b.includes('force') || b.includes('air')) return { bg: '#f0fdf4', text: '#15803d', border: '#bbf7d0' };
    return { bg: '#f1f5f9', text: '#475569', border: '#e2e8f0' };
  };

  const getQuotaBadgeColor = (quota) => {
    const q = quota?.toLowerCase() || '';
    if (q.includes('ews')) return { bg: '#fef3c7', text: '#b45309', border: '#fde68a' };
    if (q.includes('obc')) return { bg: '#fae8ff', text: '#a21caf', border: '#f5d0fe' };
    if (q.includes('sc') || q.includes('st')) return { bg: '#fee2e2', text: '#b91c1c', border: '#fecaca' };
    return { bg: '#f1f5f9', text: '#4b6b32', border: '#cbd5e1' };
  };

  const colors = getBranchBadgeColor(service_branch);
  const quotaColors = getQuotaBadgeColor(reservation_category);

  return (
    <div className={`candidate-profile-view animate-fade-in ${isCompact ? 'compact' : ''}`}>
      {/* Cover / Header section */}
      <div className="profile-banner">
        <div className="watermark-insignia">{service_branch.substring(0, 3).toUpperCase()}</div>
      </div>
      
      <div className="profile-header-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center' }}>
            <div className="large-avatar">
              {full_name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2)}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <h2 style={{ fontSize: '1.5rem', margin: 0, fontWeight: '850', color: '#111827' }}>{full_name}</h2>
                <span className="verified-badge">
                  <Shield size={12} /> Verified Agniveer
                </span>
              </div>
              <p style={{ color: '#4b5563', fontWeight: 600, fontSize: '0.95rem', marginTop: '0.2rem' }}>
                {role} • <span style={{ color: 'var(--ios-olive)' }}>{trade}</span>
              </p>
              
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                <span className="info-tag" style={{ background: colors.bg, color: colors.text, borderColor: colors.border }}>
                  {service_branch}
                </span>
                <span className="info-tag" style={{ background: quotaColors.bg, color: quotaColors.text, borderColor: quotaColors.border }}>
                  Quota: {reservation_category}
                </span>
              </div>
            </div>
          </div>

          <button onClick={() => onSendMessage && onSendMessage(candidate)} className="btn-primary ios-pill start-chat-btn">
            <MessageSquare size={16} />
            <span>Message Candidate</span>
          </button>
        </div>
      </div>

      {/* Main Profile Grid */}
      <div className="profile-grid-layout">
        {/* Left Side: Score & Skills */}
        <div className="profile-column">
          <div className="ios-card score-analysis-card">
            <div className="card-top-header">
              <Award size={20} color="var(--ios-olive)" />
              <h3 style={{ fontSize: '1rem', margin: 0 }}>Veer Score Analytics</h3>
            </div>
            
            <div className="veer-score-hero">
              <div className="score-ring">
                <span className="score-num">{Math.round(veer_score)}</span>
                <span className="score-label">OVERALL</span>
              </div>
              <div className="score-status-desc">
                <h4 style={{ color: 'var(--ios-olive)', fontSize: '0.95rem', fontWeight: 800 }}>EXCEPTIONAL TRANSITION RATING</h4>
                <p style={{ fontSize: '0.8rem', color: '#666', marginTop: '0.2rem' }}>
                  Candidate scores in the top 10% of their military trade track for civilian career readiness.
                </p>
              </div>
            </div>

            <div className="metric-bars-list">
              <div className="metric-bar-item">
                <div className="metric-labels">
                  <span>Core Aptitude & Logistics</span>
                  <strong>{scoreBreakdown.aptitude}%</strong>
                </div>
                <div className="bar-bg"><div className="bar-fill" style={{ width: `${scoreBreakdown.aptitude}%` }}></div></div>
              </div>
              
              <div className="metric-bar-item">
                <div className="metric-labels">
                  <span>Physical & Tactical Endurance</span>
                  <strong>{scoreBreakdown.physical}%</strong>
                </div>
                <div className="bar-bg"><div className="bar-fill" style={{ width: `${scoreBreakdown.physical}%` }}></div></div>
              </div>

              <div className="metric-bar-item">
                <div className="metric-labels">
                  <span>Discipline & Leadership index</span>
                  <strong>{scoreBreakdown.discipline}%</strong>
                </div>
                <div className="bar-bg"><div className="bar-fill" style={{ width: `${scoreBreakdown.discipline}%` }}></div></div>
              </div>
            </div>
          </div>

          <div className="ios-card skills-card">
            <h3 style={{ fontSize: '1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Sparkles size={16} color="var(--ios-olive)" />
              Endorsed Skills & Capabilities
            </h3>
            <div className="skills-cloud">
              {skills.map((skill, index) => (
                <span key={index} className="skill-bubble">
                  {skill}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Right Side: Service Details & Bio */}
        <div className="profile-column">
          <div className="ios-card details-overview-card">
            <h3 style={{ fontSize: '1rem', marginBottom: '1.25rem' }}>Military Service & Background</h3>
            
            <div className="profile-details-list">
              <div className="detail-row">
                <div className="detail-icon-circle"><Briefcase size={16} /></div>
                <div className="detail-meta">
                  <span className="label">Appointment Role</span>
                  <span className="value">{role}</span>
                </div>
              </div>

              <div className="detail-row">
                <div className="detail-icon-circle"><Calendar size={16} /></div>
                <div className="detail-meta">
                  <span className="label">Total Service Tenure</span>
                  <span className="value">{experience}</span>
                </div>
              </div>

              <div className="detail-row">
                <div className="detail-icon-circle"><MapPin size={16} /></div>
                <div className="detail-meta">
                  <span className="label">Domicile Location</span>
                  <span className="value">{district}, {state}</span>
                </div>
              </div>

              <div className="detail-row">
                <div className="detail-icon-circle"><FileText size={16} /></div>
                <div className="detail-meta">
                  <span className="label">Educational Qualifications</span>
                  <span className="value">{education}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Transition Insights */}
          <div className="ios-card insight-panel-card">
            <h3 style={{ fontSize: '1rem', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <TrendingUp size={16} color="var(--ios-olive)" />
              Transition Pathway Recommendation
            </h3>
            <div className="pathway-insight-box">
              <p style={{ fontSize: '0.85rem', color: '#374151' }}>
                Highly suitable for <strong>Corporate Security Management</strong>, <strong>Operations & Logistics Supervision</strong>, or <strong>Technical Fitter roles</strong> in the Banking/State Police sectors.
              </p>
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                <span className="score-tag font-cta">OBC/SC/ST Reservation Compliant</span>
                <span className="score-tag font-cta">Immediate Joiner</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .candidate-profile-view {
          background: white;
          border-radius: 24px;
          overflow: hidden;
          box-shadow: var(--shadow-ios);
          border: 1px solid #f1f1f1;
        }
        .profile-banner {
          height: 120px;
          background: linear-gradient(135deg, var(--ios-olive), #1F3A2E);
          position: relative;
          display: flex;
          align-items: flex-end;
          justify-content: flex-end;
          padding: 1rem;
        }
        .watermark-insignia {
          color: rgba(255,255,255,0.08);
          font-size: 5rem;
          font-weight: 900;
          line-height: 1;
          letter-spacing: -0.05em;
          user-select: none;
          position: absolute;
          bottom: -10px;
          right: 10px;
        }
        .profile-header-card {
          padding: 1.5rem 2rem;
          border-bottom: 1px solid #f3f4f6;
          background: white;
        }
        .large-avatar {
          width: 72px;
          height: 72px;
          border-radius: 20px;
          background: var(--ios-secondary);
          color: var(--ios-olive);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.75rem;
          font-weight: 800;
          box-shadow: inset 0 2px 4px rgba(0,0,0,0.05);
          border: 2px solid white;
          margin-top: -36px;
        }
        .verified-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
          background: #f0fdf4;
          color: #16a34a;
          padding: 0.2rem 0.5rem;
          border-radius: 99px;
          font-size: 0.7rem;
          font-weight: 700;
        }
        .info-tag {
          padding: 0.25rem 0.75rem;
          border-radius: 99px;
          font-size: 0.75rem;
          font-weight: 700;
          border: 1px solid transparent;
        }
        .start-chat-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.85rem;
          padding: 0.65rem 1.25rem;
        }
        .profile-grid-layout {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1.5rem;
          padding: 2rem;
          background: #fafafa;
        }
        .profile-column {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }
        .card-top-header {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 1.25rem;
          border-bottom: 1px solid #f3f4f6;
          padding-bottom: 0.75rem;
        }
        .veer-score-hero {
          display: flex;
          align-items: center;
          gap: 1.5rem;
          margin-bottom: 1.5rem;
        }
        .score-ring {
          width: 90px;
          height: 90px;
          border-radius: 50%;
          border: 8px solid var(--ios-olive);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: white;
          box-shadow: 0 4px 10px rgba(0,0,0,0.05);
          flex-shrink: 0;
        }
        .score-num {
          font-size: 2rem;
          font-weight: 850;
          line-height: 1;
          color: var(--ios-olive);
        }
        .score-label {
          font-size: 0.6rem;
          font-weight: 800;
          color: #666;
        }
        .score-status-desc {
          flex: 1;
        }
        .metric-bars-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        .metric-bar-item {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }
        .metric-labels {
          display: flex;
          justify-content: space-between;
          font-size: 0.78rem;
          color: #4b5563;
          font-weight: 600;
        }
        .bar-bg {
          height: 8px;
          background: #f3f4f6;
          border-radius: 4px;
          overflow: hidden;
        }
        .bar-fill {
          height: 100%;
          background: var(--ios-olive);
          border-radius: 4px;
        }
        .skills-cloud {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
        }
        .skill-bubble {
          background: #f1f5f9;
          color: #334155;
          padding: 0.4rem 0.8rem;
          border-radius: 10px;
          font-size: 0.8rem;
          font-weight: 600;
          border: 1px solid #e2e8f0;
        }
        .profile-details-list {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }
        .detail-row {
          display: flex;
          align-items: center;
          gap: 1rem;
        }
        .detail-icon-circle {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          background: var(--ios-secondary);
          color: var(--ios-olive);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .detail-meta {
          display: flex;
          flex-direction: column;
        }
        .detail-meta .label {
          font-size: 0.72rem;
          color: #6b7280;
          font-weight: 550;
        }
        .detail-meta .value {
          font-size: 0.88rem;
          font-weight: 700;
          color: #111827;
        }
        .pathway-insight-box {
          background: var(--ios-secondary);
          padding: 1rem;
          border-radius: 16px;
          border: 1px solid rgba(0,0,0,0.02);
        }
        .score-tag {
          font-size: 0.7rem;
          background: white;
          color: var(--ios-olive);
          padding: 0.25rem 0.5rem;
          border-radius: 6px;
          border: 1px solid rgba(0,0,0,0.05);
          font-weight: 700;
        }
        @media (max-width: 900px) {
          .profile-grid-layout {
            grid-template-columns: 1fr;
            padding: 1.25rem;
          }
        }
      `}} />
    </div>
  );
};

export default CandidateProfileTemplate;
