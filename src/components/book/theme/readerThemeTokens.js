// Canonical list of every `--reader-*` CSS custom property the theme
// system defines, grouped the same way ThemeEditor_UI.md's Colors/
// Typography/Layout panels are grouped. Each theme (themes/*.js) supplies
// a flat `tokens` object using these exact keys; ReaderThemeProvider turns
// that into real `--reader-*` custom properties. BookBlocks.css and
// SecureReader's legacy-HTML styles both read these tokens (with a
// fallback matching Academic's own value) so nothing regresses if a token
// is ever missing from a theme.
export const TOKEN_GROUPS = {
  colors: [
    'primary', 'primarySoft', 'secondary',
    'background', 'surface', 'surfaceAlt',
    'text', 'textMuted', 'heading',
    'border', 'borderStrong',
    'success', 'warning', 'danger', 'info',
  ],
  typography: [
    'bodyFont', 'headingFont', 'uiFont', 'dropcapFont',
    'bodySize', 'bodyLineHeight',
    'h1Size', 'h2Size', 'h3Size', 'h4Size',
    'headingWeight',
  ],
  spacing: ['spaceXs', 'spaceSm', 'spaceMd', 'spaceLg', 'spaceXl', 'space2xl'],
  shape: ['radiusSm', 'radiusMd', 'radiusLg'],
  shadow: ['shadowSm', 'shadowMd', 'shadowLg'],
  layout: ['contentWidth', 'readingWidth', 'sidebarWidth'],
};

export const ALL_TOKEN_KEYS = Object.values(TOKEN_GROUPS).flat();

// Reader font-scale control (SecureReader.jsx's A-/A+ buttons) — a
// multiplier applied on top of whatever the active theme's own bodySize
// token is, not a token itself.
export const FONT_SCALE_STEP = 0.075;
export const FONT_SCALE_MIN = 0.85;
export const FONT_SCALE_MAX = 1.35;

// kebab-case CSS var name for a camelCase token key, e.g. bodyFont ->
// --reader-body-font, h1Size -> --reader-h1-size.
export function tokenToCssVar(key) {
  const kebab = key.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
  return `--reader-${kebab}`;
}

// Academic's own values double as the fallback baked into BookBlocks.css
// (var(--reader-x, <this value>)), so this object is the single source of
// truth both places pull from -- change it here and both the default
// theme and the safety-net fallback move together.
export const DEFAULT_TOKENS = {
  primary: '#0f766e',
  primarySoft: 'rgba(15, 118, 110, 0.12)',
  secondary: '#334155',

  background: '#f8fafc',
  surface: '#ffffff',
  surfaceAlt: '#f1f5f9',

  text: '#1e293b',
  textMuted: '#64748b',
  heading: '#0f172a',

  border: '#e2e8f0',
  borderStrong: '#cbd5e1',

  success: '#16a34a',
  warning: '#f59e0b',
  danger: '#dc2626',
  info: '#2563eb',

  bodyFont: "'Merriweather', 'Palatino Linotype', serif",
  headingFont: "'Inter', sans-serif",
  uiFont: "'Inter', sans-serif",
  dropcapFont: "'Georgia', 'Times New Roman', serif",

  bodySize: '1.15rem',
  bodyLineHeight: '1.8',
  h1Size: '2.75rem',
  h2Size: '2.25rem',
  h3Size: '1.4rem',
  h4Size: '1.2rem',
  headingWeight: '800',

  spaceXs: '0.5rem',
  spaceSm: '0.75rem',
  spaceMd: '1.5rem',
  spaceLg: '2.5rem',
  spaceXl: '3.5rem',
  space2xl: '4rem',

  radiusSm: '6px',
  radiusMd: '8px',
  radiusLg: '12px',

  shadowSm: '0 1px 3px rgba(15, 23, 42, 0.06)',
  shadowMd: '0 4px 6px -1px rgba(15, 23, 42, 0.08)',
  shadowLg: '0 20px 25px -5px rgba(15, 23, 42, 0.12)',

  contentWidth: '1000px',
  readingWidth: '720px',
  sidebarWidth: '280px',
};
