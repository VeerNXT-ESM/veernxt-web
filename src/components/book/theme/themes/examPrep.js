import { DEFAULT_TOKENS } from '../readerThemeTokens';

export const examPrepTheme = {
  id: 'exam-prep',
  name: 'Exam Prep',
  description: 'Optimized for competitive exam preparation. High contrast, compact layout.',
  isSystem: true,
  isDefault: false,
  tokens: {
    ...DEFAULT_TOKENS,
    primary: '#e11d48',
    primarySoft: 'rgba(225, 29, 72, 0.1)',
    secondary: '#1e293b',
    warning: '#f59e0b',

    bodyFont: "'Roboto', sans-serif",
    headingFont: "'Roboto', sans-serif",
    dropcapFont: "'Roboto', sans-serif",
    bodySize: '1.05rem',
    bodyLineHeight: '1.6',
    h1Size: '2.5rem',
    h2Size: '2rem',
    h3Size: '1.3rem',
    headingWeight: '900',

    // Compact spacing throughout — this theme is built for scanning past
    // content fast during revision, not lingering on it.
    spaceXs: '0.4rem',
    spaceSm: '0.6rem',
    spaceMd: '1.1rem',
    spaceLg: '1.75rem',
    spaceXl: '2.5rem',
    space2xl: '2.75rem',

    radiusSm: '4px',
    radiusMd: '6px',
    radiusLg: '8px',
  },
};
