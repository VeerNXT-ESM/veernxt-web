import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ALL_TOKEN_KEYS, tokenToCssVar, FONT_SCALE_MIN, FONT_SCALE_MAX } from './readerThemeTokens';
import { getRegistryTheme, readerThemes, DEFAULT_THEME_ID } from './readerThemeRegistry';
import { ReaderThemeContext } from './ReaderThemeContext';
import { fetchThemeById } from './customThemeStore';

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

function readStoredThemeId() {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function persistThemeId(id) {
  try {
    localStorage.setItem(STORAGE_KEY, id);
  } catch {
    // localStorage unavailable (private browsing) -- selection just won't
    // survive a reload, still applies for this session.
  }
}


/**
 * <ReaderThemeProvider theme="academic" subjectAccent="#2563eb">...</ReaderThemeProvider>
 *
 * Resolves the active reader theme, exposes it through context, and applies
 * every --reader-* token as a real CSS custom property on its own root
 * element (not document.documentElement) so multiple providers can coexist
 * without fighting (e.g. the candidate reader and the admin CMS's own dark
 * chrome around AdminResourcePreview's instance).
 *
 * Precedence for the *starting* theme, resolved once on mount:
 *   1. The candidate's own last explicit choice (localStorage, if valid)
 *   2. The `theme` prop (e.g. a resource's admin-assigned default)
 *   3. Academic
 * Calling setThemeId (via useReaderTheme(), e.g. from ThemeSwitcher) always
 * persists the new choice, so it becomes step 1 for every reader from then on.
 *
 * `subjectAccent` is a separate layer on top of the resolved theme -- it
 * overrides only --reader-primary/--reader-primary-soft, never the theme's
 * other tokens, matching ThemeEditor.md §7's "theme vs subject identity"
 * split. `persist` can be set false (e.g. AdminResourcePreview) so preview
 * switching never clobbers a real candidate's saved preference.
 */
export function ReaderThemeProvider({
  theme: initialThemeId = DEFAULT_THEME_ID,
  subjectAccent = null,
  persist = true,
  className = '',
  style,
  children,
}) {
  const [themeId, setThemeIdState] = useState(() => {
    if (!persist) return initialThemeId || DEFAULT_THEME_ID;
    const stored = readStoredThemeId();
    return stored || initialThemeId || DEFAULT_THEME_ID;
  });
  const [customTheme, setCustomTheme] = useState(null);
  const [fontScale, setFontScaleState] = useState(() => (persist ? readStoredFontScale() : 1));
  const rootRef = useRef(null);

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
    if (persist) persistThemeId(id);
  }, [persist]);

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
    // Font scale only ever multiplies the theme's own body size -- headings
    // stay at the theme's fixed hN sizes so scaling reading text doesn't
    // also blow up chapter titles.
    const baseSize = parseFloat(tokens.bodySize) || 1.15;
    root.style.setProperty(tokenToCssVar('bodySize'), `${(baseSize * fontScale).toFixed(3)}rem`);
  }, [resolvedTheme, subjectAccent, fontScale]);

  const contextValue = useMemo(() => ({
    theme: resolvedTheme,
    themeId,
    setThemeId,
    subjectAccent,
    fontScale,
    setFontScale,
  }), [resolvedTheme, themeId, setThemeId, subjectAccent, fontScale, setFontScale]);

  return (
    <ReaderThemeContext.Provider value={contextValue}>
      <div ref={rootRef} className={`reader-theme-container ${className}`} style={style}>
        {children}
      </div>
    </ReaderThemeContext.Provider>
  );
}
