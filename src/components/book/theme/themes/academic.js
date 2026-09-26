import { DEFAULT_TOKENS } from '../readerThemeTokens';

// Academic IS the baseline every other theme, and BookBlocks.css's own
// var() fallbacks, are measured against -- no overrides here on purpose.
export const academicTheme = {
  id: 'academic',
  name: 'Academic',
  description: 'Traditional scholarly reading experience. Clean, focused and timeless.',
  isSystem: true,
  isDefault: true,
  tokens: { ...DEFAULT_TOKENS },
};
