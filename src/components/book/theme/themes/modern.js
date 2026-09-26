import { DEFAULT_TOKENS } from '../readerThemeTokens';

export const modernTheme = {
  id: 'modern',
  name: 'Modern',
  description: 'Contemporary digital learning platform. Clean and modern.',
  isSystem: true,
  isDefault: false,
  tokens: {
    ...DEFAULT_TOKENS,
    primary: '#1e40af',
    primarySoft: 'rgba(30, 64, 175, 0.1)',
    secondary: '#334155',

    bodyFont: "'Inter', sans-serif",
    headingFont: "'Outfit', 'Inter', sans-serif",
    dropcapFont: "'Outfit', 'Inter', sans-serif",
    bodySize: '1.1rem',
    bodyLineHeight: '1.7',
    headingWeight: '700',

    spaceMd: '1.75rem',
    spaceLg: '2.75rem',
    spaceXl: '3.75rem',
    space2xl: '4.25rem',

    radiusSm: '10px',
    radiusMd: '14px',
    radiusLg: '20px',

    shadowSm: '0 2px 8px rgba(30, 64, 175, 0.06)',
    shadowMd: '0 8px 20px -4px rgba(30, 64, 175, 0.12)',
    shadowLg: '0 24px 40px -8px rgba(30, 64, 175, 0.16)',
  },
};
