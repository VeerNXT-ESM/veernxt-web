import { useContext } from 'react';
import { ReaderThemeContext } from './ReaderThemeContext';

export function useReaderTheme() {
  const ctx = useContext(ReaderThemeContext);
  if (!ctx) throw new Error('useReaderTheme must be used within a ReaderThemeProvider');
  return ctx;
}
