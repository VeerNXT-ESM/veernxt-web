import React from 'react';
import { X, Users, Calendar, FileText, ExternalLink } from 'lucide-react';

export const JobDescriptionModal = ({ job, onClose }) => {
  if (!job) return null;

  const desc = job.ai_description || job.aiDescription || job.description || '';

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.7)',
        backdropFilter: 'blur(4px)',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.25rem'
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#FFFFFF',
          borderRadius: '14px',
          width: '100%',
          maxWidth: '740px',
          maxHeight: '88vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden',
          border: '1px solid rgba(226, 232, 240, 0.8)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', background: '#f8fafc' }}>
          <div style={{ flex: 1, paddingRight: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '10px', padding: '2px 7px', borderRadius: '4px', background: '#e0e7ff', color: '#3730a3', fontWeight: 700 }}>
                jobs_v2
              </span>
              <span style={{ fontSize: '10px', padding: '2px 7px', borderRadius: '4px', background: '#f1f5f9', color: '#475569', fontWeight: 600 }}>
                {job.career_track || job.careerTrack || 'GOVERNMENT'}
              </span>
              {job._matchScore && (
                <span style={{ fontSize: '10px', padding: '2px 7px', borderRadius: '4px', background: '#dcfce7', color: '#166534', fontWeight: 700 }}>
                  {job._matchScore}% Match
                </span>
              )}
              {job._recommendedExam && (
                <span style={{ fontSize: '10px', padding: '2px 7px', borderRadius: '4px', background: '#fef3c7', color: '#92400e', fontWeight: 600 }}>
                  Aligned: {job._recommendedExam}
                </span>
              )}
            </div>
            <h3 style={{ fontSize: '16px', fontWeight: 800, margin: 0, color: '#0f172a', lineHeight: 1.35 }}>
              {job.title}
            </h3>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              background: '#f1f5f9',
              border: 'none',
              cursor: 'pointer',
              color: '#475569',
              padding: '6px',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 0.15s ease'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Key Metrics Bar */}
        <div style={{ display: 'flex', gap: '1.25rem', padding: '0.75rem 1.5rem', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', fontSize: '12px', flexWrap: 'wrap' }}>
          {job.vacancies && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#15803d', fontWeight: 700 }}>
              <Users size={14} /> {Number(job.vacancies).toLocaleString()} Vacancies
            </div>
          )}
          {job.last_date && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#475569', fontWeight: 500 }}>
              <Calendar size={14} /> Last Date: {new Date(job.last_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
            </div>
          )}
          {job.published_on && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#64748b' }}>
              Posted: {new Date(job.published_on).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
            </div>
          )}
        </div>

        {/* Scrollable Content Body */}
        <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1, fontSize: '13.5px', color: '#334155', lineHeight: 1.7 }}>
          {desc ? (
            <div style={{ whiteSpace: 'pre-line', fontFamily: 'inherit' }}>
              {desc}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#64748b' }}>
              <FileText size={38} style={{ margin: '0 auto 0.6rem auto', color: '#94a3b8' }} />
              <p style={{ margin: 0, fontWeight: 600, color: '#334155' }}>Detailed recruitment overview is available in the official notification.</p>
              <p style={{ fontSize: '12px', marginTop: '4px', color: '#64748b' }}>Click below to read the complete notification directly on the portal.</p>
            </div>
          )}

          {/* Tags */}
          {Array.isArray(job.tags) && job.tags.length > 0 && (
            <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Tags &amp; Applicable Quotas
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                {job.tags.map((t, idx) => (
                  <span key={idx} style={{ fontSize: '11px', padding: '3px 8px', background: '#f1f5f9', color: '#334155', borderRadius: '4px', fontWeight: 500 }}>
                    #{t}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '0.9rem 1.5rem', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '8px', background: '#f8fafc' }}>
          <button
            onClick={onClose}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              background: '#FFFFFF',
              color: '#475569',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Close
          </button>
          {job.url && (
            <a
              href={job.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                padding: '8px 16px',
                borderRadius: '6px',
                border: 'none',
                background: '#1a472a',
                color: '#FFFFFF',
                fontSize: '12px',
                fontWeight: 700,
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                cursor: 'pointer',
                boxShadow: '0 1px 3px rgba(26,71,42,0.2)'
              }}
            >
              Open Official Notification <ExternalLink size={13} />
            </a>
          )}
        </div>
      </div>
    </div>
  );
};

export default JobDescriptionModal;
