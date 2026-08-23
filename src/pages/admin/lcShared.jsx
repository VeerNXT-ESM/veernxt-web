import { useState, useEffect } from 'react';

// Shared constants/helpers used across the Learning Center CMS tab pages
// (Exams/Syllabus/Resources/Content Graph/Analytics) — extracted from the
// original single-file LearningCenterCMS.jsx so each tab can live in its
// own file under the new sidebar shell.

export const PAGE_SIZE = 20;

export const REGION_LEVELS = [
  { value: '', label: 'All Regions' },
  { value: 'central', label: 'Central' },
  { value: 'state', label: 'State' },
  { value: 'ut', label: 'UT' },
];

export const RESOURCE_TYPES = ['Intro', 'Guide', 'Precis', 'PYQ', 'Mock', 'Other'];

// Debounce a fast-changing value (search inputs) so filtered queries don't
// fire on every keystroke — CMS_Rehaul.md §22 calls this out explicitly.
export function useDebounced(value, delayMs = 350) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);
  return debounced;
}

const statusColors = {
  published: { bg: 'var(--admin-accent-soft)', color: 'var(--admin-accent)' },
  draft: { bg: 'var(--surface-alt)', color: 'var(--admin-text-muted)' },
  archived: { bg: 'var(--admin-danger-bg)', color: 'var(--admin-danger)' },
};

export const StatusBadge = ({ status }) => {
  const c = statusColors[status] || statusColors.draft;
  return (
    <span className="lc-status-badge" style={{ background: c.bg, color: c.color }}>
      {status || 'draft'}
    </span>
  );
};
