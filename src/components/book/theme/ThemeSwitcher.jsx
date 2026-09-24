import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { useReaderTheme } from './useReaderTheme';
import { READER_THEME_LIST } from './readerThemeRegistry';
import { fetchCustomThemes } from './customThemeStore';

function ThemeSwatch({ theme }) {
  const { tokens } = theme;
  return (
    <span className="rts-swatch" style={{ background: tokens.background, borderColor: tokens.border }}>
      <span className="rts-swatch-bar" style={{ background: tokens.primary }} />
      <span className="rts-swatch-lines">
        <span style={{ background: tokens.primary }} />
        <span style={{ background: tokens.textMuted }} />
        <span style={{ background: tokens.textMuted, width: '60%' }} />
      </span>
    </span>
  );
}

/**
 * Compact reader-facing theme picker (ThemeEditor_UI.md §1) — a small
 * trigger + popover, not a settings panel. Reads/writes the active theme
 * through useReaderTheme(), so it must render inside a ReaderThemeProvider.
 * `extraThemes` lets a caller (e.g. the admin editor's own preview) offer
 * custom themes alongside the 4 built-ins without this component knowing
 * anything about where they came from.
 */
const ThemeSwitcher = ({ extraThemes = [] }) => {
  const { theme, themeId, setThemeId } = useReaderTheme();
  const [open, setOpen] = useState(false);
  const [customThemes, setCustomThemes] = useState([]);
  const rootRef = useRef(null);

  useEffect(() => {
    let mounted = true;
    fetchCustomThemes().then((list) => {
      if (mounted && Array.isArray(list)) setCustomThemes(list);
    });
    return () => { mounted = false; };
  }, []);

  const allThemes = [...READER_THEME_LIST, ...extraThemes, ...customThemes];

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    const handleKeyDown = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  return (
    <div className="rts-root" ref={rootRef}>
      <button type="button" className="rts-trigger" onClick={() => setOpen((v) => !v)} aria-haspopup="menu" aria-expanded={open}>
        {theme.name}
        <ChevronDown size={14} />
      </button>

      {open && (
        <div className="rts-panel" role="menu" aria-label="Reading theme">
          <div className="rts-panel-heading">Reading Theme</div>
          <div className="rts-theme-list">
            {allThemes.map((t) => {
              const isActive = t.id === themeId;
              return (
                <button
                  key={t.id}
                  type="button"
                  role="menuitemradio"
                  aria-checked={isActive}
                  className={`rts-theme-row ${isActive ? 'active' : ''}`}
                  onClick={() => { setThemeId(t.id); setOpen(false); }}
                >
                  <ThemeSwatch theme={t} />
                  <span className="rts-theme-info">
                    <span className="rts-theme-name">{t.name}</span>
                    <span className="rts-theme-desc">{t.description}</span>
                  </span>
                  <span className={`rts-radio ${isActive ? 'checked' : ''}`}>
                    {isActive && <Check size={11} strokeWidth={3} />}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        .rts-root { position: relative; display: inline-block; }
        .rts-trigger {
          display: inline-flex; align-items: center; gap: 0.4rem; background: #ffffff; border: 1px solid #e2e8f0;
          border-radius: 8px; padding: 0.45rem 0.85rem; font-size: 0.85rem; font-weight: 700; color: #0f172a;
          cursor: pointer; transition: border-color 0.15s;
        }
        .rts-trigger:hover { border-color: #0f766e; color: #0f766e; }

        .rts-panel {
          position: absolute; top: calc(100% + 8px); left: 0; width: min(320px, calc(100vw - 24px));
          background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px;
          box-shadow: 0 12px 32px rgba(16, 24, 40, 0.14), 0 2px 8px rgba(16, 24, 40, 0.06);
          padding: 0.9rem; z-index: 60; animation: rts-in 0.15s ease-out;
        }
        @keyframes rts-in { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }

        .rts-panel-heading { font-size: 0.78rem; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.04em; margin-bottom: 0.6rem; }
        .rts-theme-list { display: flex; flex-direction: column; gap: 0.3rem; }
        .rts-theme-row {
          display: flex; align-items: center; gap: 0.75rem; padding: 0.5rem; border-radius: 10px; border: 1.5px solid transparent;
          background: none; cursor: pointer; text-align: left; transition: background 0.12s, border-color 0.12s;
        }
        .rts-theme-row:hover { background: #f8fafc; }
        .rts-theme-row.active { background: #f0fdfa; border-color: #99f6e4; }

        .rts-swatch { flex-shrink: 0; width: 40px; height: 50px; border-radius: 5px; border: 1px solid #e2e8f0; display: flex; flex-direction: column; overflow: hidden; }
        .rts-swatch-bar { height: 6px; width: 100%; flex-shrink: 0; }
        .rts-swatch-lines { flex: 1; padding: 6px 5px; display: flex; flex-direction: column; gap: 3px; }
        .rts-swatch-lines span { display: block; height: 3px; border-radius: 2px; width: 85%; }

        .rts-theme-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 0.1rem; }
        .rts-theme-name { font-size: 0.86rem; font-weight: 800; color: #0f172a; }
        .rts-theme-desc { font-size: 0.72rem; color: #64748b; line-height: 1.35; }

        .rts-radio { flex-shrink: 0; width: 18px; height: 18px; border-radius: 50%; border: 1.5px solid #cbd5e1; display: flex; align-items: center; justify-content: center; color: #ffffff; }
        .rts-radio.checked { background: #0f766e; border-color: #0f766e; }
      `}} />
    </div>
  );
};

export default ThemeSwitcher;
