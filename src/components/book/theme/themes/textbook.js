import { DEFAULT_TOKENS } from '../readerThemeTokens';

export const textbookTheme = {
  id: 'textbook',
  name: 'Textbook',
  description: 'Classic study experience with a familiar, warm look.',
  isSystem: true,
  isDefault: false,
  tokens: {
    ...DEFAULT_TOKENS,
    primary: '#78350f',
    primarySoft: 'rgba(120, 53, 15, 0.1)',
    secondary: '#475569',

    background: '#fdfaf3',
    surfaceAlt: '#f6f0e2',

    bodyFont: "'Georgia', serif",
    headingFont: "'Georgia', serif",
    dropcapFont: "'Georgia', serif",
    bodySize: '1.15rem',
    bodyLineHeight: '1.75',
    headingWeight: '700',

    spaceMd: '1.65rem',
    spaceLg: '2.75rem',

    radiusSm: '4px',
    radiusMd: '6px',
    radiusLg: '8px',
  },
};
