import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ALL_TOKEN_KEYS, tokenToCssVar, FONT_SCALE_MIN, FONT_SCALE_MAX } from './readerThemeTokens';
import { getRegistryTheme, readerThemes, DEFAULT_THEME_ID } from './readerThemeRegistry';
import { ReaderThemeContext } from './ReaderThemeContext';
import {
  fetchThemeById,
  normalizeReaderCategory,
  getCategoryDefaultThemeId,
  setCategoryDefaultTheme,
  fetchCategoryDefaultThemes,
} from './customThemeStore';

const STORAGE_KEY = 'veernxt_reader_theme';
const FONT_SCALE_STORAGE_KEY = 'veernxt_reader_font_scale';
const ACADEMIC = readerThemes.academic;

function readStoredFontScale() {
  try {
    const raw = localStorage.getItem(FONT_SCALE_STORAGE_KEY);
    const value = raw ? parseFloat(raw) : 1;
    return Number.isFinite(value) ? value : 1;
  } catch {
    return 1;
  }
}

function persistFontScale(scale) {
  try {
    localStorage.setItem(FONT_SCALE_STORAGE_KEY, String(scale));
  } catch {
    // ignore
  }
}

function readStoredThemeIdForCategory(category) {
  const norm = normalizeReaderCategory(category);
  try {
    const catStored = localStorage.getItem(`veernxt_category_theme_${norm.toLowerCase()}`);
    if (catStored) return catStored;
    return getCategoryDefaultThemeId(norm);
  } catch {
    return getCategoryDefaultThemeId(norm);
  }
}

function persistThemeIdForCategory(category, id) {
  const norm = normalizeReaderCategory(category);
  try {
    localStorage.setItem(`veernxt_category_theme_${norm.toLowerCase()}`, id);
  } catch {
    // localStorage unavailable
  }
}

/**
 * <ReaderThemeProvider category="Intro" theme="modern" subjectAccent="#2563eb">...</ReaderThemeProvider>
 *
 * Resolves the active reader theme per content category (Intro, Precis, Guide).
 */
export function ReaderThemeProvider({
  category = 'Guide',
  theme: initialThemeId = null,
  subjectAccent = null,
  persist = true,
  className = '',
  style,
  children,
}) {
  const normCategory = normalizeReaderCategory(category);

  const [themeId, setThemeIdState] = useState(() => {
    if (initialThemeId) return initialThemeId;
    if (!persist) return getCategoryDefaultThemeId(normCategory);
    return readStoredThemeIdForCategory(normCategory);
  });

  const [customTheme, setCustomTheme] = useState(null);
  const [fontScale, setFontScaleState] = useState(() => (persist ? readStoredFontScale() : 1));
  const rootRef = useRef(null);

  // If initialThemeId prop changes or category changes and no explicit initialThemeId was given
  useEffect(() => {
    if (initialThemeId) {
      setThemeIdState(initialThemeId);
    } else {
      const activeForCat = readStoredThemeIdForCategory(normCategory);
      setThemeIdState(activeForCat);
    }
  }, [initialThemeId, normCategory]);

  // Sync category defaults from database once on mount
  useEffect(() => {
    let mounted = true;
    fetchCategoryDefaultThemes().then((defaults) => {
      if (!mounted || initialThemeId) return;
      const dbDefault = defaults[normCategory];
      if (dbDefault && dbDefault !== themeId) {
        setThemeIdState(dbDefault);
      }
    });
    return () => { mounted = false; };
  }, [normCategory]);

  const registryTheme = getRegistryTheme(themeId);

  // themeId that isn't a built-in is treated as a custom theme's UUID.
  useEffect(() => {
    if (registryTheme) { setCustomTheme(null); return; }
    let mounted = true;
    fetchThemeById(themeId).then((t) => { if (mounted) setCustomTheme(t); });
    return () => { mounted = false; };
  }, [themeId, registryTheme]);

  const resolvedTheme = registryTheme || customTheme || ACADEMIC;

  const setThemeId = useCallback((id) => {
    setThemeIdState(id);
    if (persist) {
      persistThemeIdForCategory(normCategory, id);
      setCategoryDefaultTheme(normCategory, id);
    }
  }, [persist, normCategory]);

  const setFontScale = useCallback((scale) => {
    const clamped = Math.min(FONT_SCALE_MAX, Math.max(FONT_SCALE_MIN, scale));
    setFontScaleState(clamped);
    if (persist) persistFontScale(clamped);
  }, [persist]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const tokens = { ...resolvedTheme.tokens };
    if (subjectAccent) {
      tokens.primary = subjectAccent;
      tokens.primarySoft = `${subjectAccent}1f`; // ~12% alpha hex suffix
    }
    ALL_TOKEN_KEYS.forEach((key) => {
      const value = tokens[key];
      if (value != null) root.style.setProperty(tokenToCssVar(key), value);
    });
    const baseSize = parseFloat(tokens.bodySize) || 1.15;
    root.style.setProperty(tokenToCssVar('bodySize'), `${(baseSize * fontScale).toFixed(3)}rem`);
  }, [resolvedTheme, subjectAccent, fontScale]);

  const contextValue = useMemo(() => ({
    theme: resolvedTheme,
    themeId,
    setThemeId,
    category: normCategory,
    subjectAccent,
    fontScale,
    setFontScale,
  }), [resolvedTheme, themeId, setThemeId, normCategory, subjectAccent, fontScale, setFontScale]);

  return (
    <ReaderThemeContext.Provider value={contextValue}>
      <div ref={rootRef} className={`reader-theme-container ${className}`} style={style}>
        {children}
      </div>
    </ReaderThemeContext.Provider>
  );
}
