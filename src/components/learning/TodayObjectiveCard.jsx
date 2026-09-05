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
              background: '#84cc16',
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
    <div style={{
      background: 'linear-gradient(135deg, #1b2e1b 0%, #2b4428 100%)',
      color: '#fff',
      borderRadius: 'var(--radius-lg, 16px)',
      padding: compact ? '1.1rem 1.25rem' : '1.5rem',
      boxShadow: '0 4px 14px rgba(27, 46, 27, 0.2)',
      marginBottom: '1.5rem',
      position: 'relative',
      overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute',
        top: '-15px',
        right: '-15px',
        width: '90px',
        height: '90px',
        borderRadius: '50%',
        background: 'rgba(132, 204, 22, 0.08)',
        pointerEvents: 'none',
      }} />

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#a3e635', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
          <Target size={16} />
          <span>Today's Mission Objective</span>
        </div>
        {totalCount > 0 && (
          <span style={{ fontSize: '0.75rem', background: 'rgba(255,255,255,0.12)', padding: '0.2rem 0.6rem', borderRadius: '999px', color: '#cbd5e1', fontWeight: 600 }}>
            {completedCount}/{totalCount} Completed
          </span>
        )}
      </div>

      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{
          width: '42px',
          height: '42px',
          borderRadius: '12px',
          background: type === 'complete' ? '#22c55e22' : type === 'quiz' ? '#eab30822' : '#84cc1622',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}>
          {type === 'complete' ? (
            <CheckCircle2 size={22} color="#4ade80" />
          ) : type === 'quiz' ? (
            <PlayCircle size={22} color="#fde047" />
          ) : (
            <BookOpen size={22} color="#a3e635" />
          )}
        </div>

        <div style={{ flex: 1, minWidth: '200px' }}>
          <h3 style={{ margin: '0 0 0.25rem', fontSize: compact ? '1rem' : '1.1rem', fontWeight: 700, color: '#f8fafc' }}>
            {title}
          </h3>
          {subtitle && (
            <p style={{ margin: 0, fontSize: '0.82rem', color: '#cbd5e1' }}>
              {subtitle}
            </p>
          )}
        </div>

        <Link
          to={targetUrl}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            background: '#84cc16',
            color: '#0f172a',
            padding: compact ? '0.5rem 1rem' : '0.65rem 1.25rem',
            borderRadius: '999px',
            fontWeight: 700,
            fontSize: '0.85rem',
            textDecoration: 'none',
            whiteSpace: 'nowrap',
            transition: 'transform 0.15s ease',
          }}
        >
          {type === 'complete' ? 'Review Progress' : type === 'quiz' ? 'Start Test' : 'Read Now'} <ArrowRight size={15} />
        </Link>
      </div>
    </div>
  );
};

export default TodayObjectiveCard;
