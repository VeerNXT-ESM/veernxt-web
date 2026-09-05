import React from 'react';

const SubjectProgressBar = ({ subjectName, completedCount, totalCount, active, onClick }) => {
  const pct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <div
      onClick={onClick}
      style={{
        padding: '0.75rem 1rem',
        borderRadius: 'var(--radius-md, 12px)',
        border: active ? '2px solid var(--ios-olive, #4b6b32)' : '1px solid var(--border, #e2e8f0)',
        background: active ? 'var(--ios-olive-tint, #f4f7f2)' : '#fff',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.2s ease',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a' }}>{subjectName}</span>
        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--ios-olive, #4b6b32)' }}>
          {completedCount}/{totalCount} ({pct}%)
        </span>
      </div>
      <div style={{ height: '6px', width: '100%', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
        <div
          style={{
            height: '100%',
            width: `${pct}%`,
            background: 'var(--ios-olive, #4b6b32)',
            borderRadius: '3px',
            transition: 'width 0.3s ease',
          }}
        />
      </div>
    </div>
  );
};

export default SubjectProgressBar;
