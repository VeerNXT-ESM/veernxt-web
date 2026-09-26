import React from 'react';
import { Link } from 'react-router-dom';
import { Target, ArrowRight, CheckCircle2, PlayCircle, BookOpen } from 'lucide-react';

const TodayObjectiveCard = ({ examId, examName, objective, compact = false }) => {
  // objective structure:
  // { type: 'read' | 'quiz' | 'complete', title: string, subtitle?: string, targetUrl: string, completedCount?: number, totalCount?: number }

  if (!objective) {
    return (
      <div style={{
        background: 'linear-gradient(135deg, #1b2e1b 0%, #2e432b 100%)',
        color: '#fff',
        borderRadius: 'var(--radius-lg, 16px)',
        padding: compact ? '1rem 1.25rem' : '1.5rem',
        boxShadow: '0 4px 12px rgba(27, 46, 27, 0.15)',
        marginBottom: '1.5rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: '#94a3b8', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
          <Target size={16} color="#84cc16" />
          <span>Today's Mission Objective</span>
        </div>
        <h3 style={{ margin: '0 0 0.4rem', fontSize: '1.1rem', fontWeight: 700, color: '#f8fafc' }}>
          {examName ? `Prepare for ${examName}` : 'Select your Exam Target'}
        </h3>
        <p style={{ margin: '0 0 1rem', fontSize: '0.85rem', color: '#cbd5e1' }}>
          Start exploring your study syllabus to track your daily mission objectives.
        </p>
        {examId && (
          <Link
            to={`/exam/${examId}`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              background: '#fbbf24',
              color: '#0f172a',
              padding: '0.5rem 1rem',
              borderRadius: '999px',
              fontWeight: 700,
              fontSize: '0.85rem',
              textDecoration: 'none',
            }}
          >
            Start Preparing <ArrowRight size={15} />
          </Link>
        )}
      </div>
    );
  }

  const { type, title, subtitle, targetUrl, completedCount, totalCount } = objective;

  return (
    <div className={`today-obj-card ${compact ? 'is-compact' : ''}`}>
      <div className="today-obj-glow" />

      <div className="today-obj-top">
        <div className="today-obj-badge">
          <Target size={15} />
          <span>Today's Mission Objective</span>
        </div>
        {totalCount > 0 && (
          <span className="today-obj-counter">
            {completedCount}/{totalCount} Completed
          </span>
        )}
      </div>

      <div className="today-obj-main">
        <div className={`today-obj-icon-wrap type-${type || 'read'}`}>
          {type === 'complete' ? (
            <CheckCircle2 size={22} color="#4ade80" />
          ) : type === 'quiz' ? (
            <PlayCircle size={22} color="#fde047" />
          ) : (
            <BookOpen size={22} color="#a3e635" />
          )}
        </div>

        <div className="today-obj-text">
          <h3 className="today-obj-title">{title}</h3>
          {subtitle && <p className="today-obj-sub">{subtitle}</p>}
        </div>

        <Link to={targetUrl} className="today-obj-cta">
          <span>{type === 'complete' ? 'Review Progress' : type === 'quiz' ? 'Start Test' : 'Read Now'}</span>
          <ArrowRight size={15} />
        </Link>
      </div>

      <style>{`
        .today-obj-card {
          background: linear-gradient(135deg, #1b2e1b 0%, #2b4428 100%);
          color: #fff;
          border-radius: 16px;
          padding: 1.25rem 1.35rem;
          box-shadow: 0 4px 14px rgba(27, 46, 27, 0.2);
          position: relative;
          overflow: hidden;
        }
        .today-obj-card.is-compact {
          padding: 1rem 1.15rem;
        }
        .today-obj-glow {
          position: absolute;
          top: -15px;
          right: -15px;
          width: 90px;
          height: 90px;
          border-radius: 50%;
          background: rgba(132, 204, 22, 0.08);
          pointer-events: none;
        }
        .today-obj-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 0.65rem;
          gap: 0.5rem;
          flex-wrap: wrap;
        }
        .today-obj-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.45rem;
          color: #a3e635;
          font-size: 0.72rem;
          font-weight: 700;
          letter-spacing: 0.05em;
          text-transform: uppercase;
        }
        .today-obj-counter {
          font-size: 0.72rem;
          background: rgba(255,255,255,0.12);
          padding: 0.2rem 0.6rem;
          border-radius: 999px;
          color: #cbd5e1;
          font-weight: 600;
        }
        .today-obj-main {
          display: flex;
          gap: 0.85rem;
          align-items: center;
        }
        .today-obj-icon-wrap {
          width: 42px;
          height: 42px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .today-obj-icon-wrap.type-complete { background: rgba(34, 197, 94, 0.15); }
        .today-obj-icon-wrap.type-quiz { background: rgba(234, 179, 8, 0.15); }
        .today-obj-icon-wrap.type-read { background: rgba(132, 204, 22, 0.15); }
        .today-obj-text {
          flex: 1;
          min-width: 0;
        }
        .today-obj-title {
          margin: 0 0 0.2rem;
          font-size: 1.05rem;
          font-weight: 700;
          color: #f8fafc;
          line-height: 1.35;
        }
        .today-obj-card.is-compact .today-obj-title {
          font-size: 0.95rem;
        }
        .today-obj-sub {
          margin: 0;
          font-size: 0.8rem;
          color: #cbd5e1;
          line-height: 1.4;
        }
        .today-obj-cta {
          display: inline-flex;
          align-items: center;
          gap: 0.45rem;
          background: #fbbf24;
          color: #0f172a;
          padding: 0.55rem 1.1rem;
          border-radius: 999px;
          font-weight: 700;
          font-size: 0.82rem;
          text-decoration: none;
          white-space: nowrap;
          flex-shrink: 0;
          transition: transform 0.15s ease, background 0.15s ease;
        }
        .today-obj-cta:hover {
          background: #f59e0b;
          transform: translateY(-1px);
        }
        @media (max-width: 580px) {
          .today-obj-main {
            flex-direction: column;
            align-items: stretch;
            gap: 0.75rem;
          }
          .today-obj-icon-wrap {
            display: none;
          }
          .today-obj-cta {
            width: 100%;
            justify-content: center;
            padding: 0.6rem 1rem;
          }
        }
      `}</style>
    </div>
  );
};

export default TodayObjectiveCard;
