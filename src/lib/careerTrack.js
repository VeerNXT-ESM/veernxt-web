// Coarse category every scraped job is tagged with (career_track, computed by
// scraper-app's classifyCareerTrack() at ingest time — always set, since a
// precise exam match only resolves a small fraction of postings). STATE_GOVT
// is the classifier's default bucket, so it reads as a neutral "General" tag
// rather than a literal state-government label.
//
// Theme-agnostic on purpose: this is shared between the candidate-facing
// light theme (JobBoard.jsx) and the admin dark theme (JobsPage.jsx) — each
// consumer derives its own bg/border tint from `hue`/`hueDark` via
// hexToRgba() instead of carrying two hardcoded palettes that can drift
// apart. `hue` reads on a light/white surface; `hueDark` is a brighter tint
// of the same colour picked to read on the admin CMS's dark surfaces
// (--surface: #141a21, --admin-bg: #0d1117).
export const CAREER_TRACK_META = {
  BANKING: { label: 'Banking', hue: '#1d4ed8', hueDark: '#60a5fa' },
  SSC: { label: 'SSC', hue: '#7e22ce', hueDark: '#c084fc' },
  RAILWAYS: { label: 'Railways', hue: '#c2410c', hueDark: '#fb923c' },
  POLICE_CAPF: { label: 'Police & CAPF', hue: '#b91c1c', hueDark: '#f87171' },
  DEFENCE: { label: 'Defence', hue: '#15803d', hueDark: '#4ade80' },
  PSU: { label: 'PSU', hue: '#0f766e', hueDark: '#2dd4bf' },
  ENGINEERING: { label: 'Engineering', hue: '#4338ca', hueDark: '#818cf8' },
  STATE_GOVT: { label: 'General', hue: '#475569', hueDark: '#94a3b8' },
};

export const CAREER_TRACK_ORDER = ['BANKING', 'SSC', 'RAILWAYS', 'POLICE_CAPF', 'DEFENCE', 'PSU', 'ENGINEERING', 'STATE_GOVT'];

export function careerTrackLabel(track) {
  return CAREER_TRACK_META[track]?.label || track;
}

export function hexToRgba(hex, alpha) {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
