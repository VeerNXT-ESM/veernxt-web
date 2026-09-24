import { academicTheme } from './themes/academic';
import { modernTheme } from './themes/modern';
import { examPrepTheme } from './themes/examPrep';
import { textbookTheme } from './themes/textbook';

// Central registry of built-in themes. To add a fifth theme later: create
// themes/yourTheme.js exporting { id, name, description, isSystem: true,
// tokens: { ...DEFAULT_TOKENS, ...yourOverrides } } (see readerThemeTokens.js
// for the full token list), then add it here -- nothing else in the app
// needs to change, since every consumer (ReaderThemeProvider, the gallery,
// the editor) reads from this registry rather than hardcoding theme ids.
export const readerThemes = {
  academic: academicTheme,
  modern: modernTheme,
  examPrep: examPrepTheme,
  textbook: textbookTheme,
};

export const READER_THEME_LIST = Object.values(readerThemes);

export function getRegistryTheme(id) {
  return readerThemes[id] || Object.values(readerThemes).find((t) => t.id === id) || null;
}

export const DEFAULT_THEME_ID = 'academic';
