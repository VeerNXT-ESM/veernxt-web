import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, MoreHorizontal, Copy, Star, Trash2, RefreshCw } from 'lucide-react';
import { READER_THEME_LIST } from '../../components/book/theme/readerThemeRegistry';
import {
  fetchCustomThemes,
  saveCustomTheme,
  deleteCustomTheme,
  setDefaultTheme,
  checkTableExists,
} from '../../components/book/theme/customThemeStore';

function ThemePreviewCard({ theme }) {
  const { tokens } = theme;
  return (
    <div className="rtg-preview" style={{ background: tokens.background, borderColor: tokens.border }}>
      <div className="rtg-preview-eyebrow" style={{ color: tokens.primary, fontFamily: tokens.headingFont }}>
        Chapter 1
      </div>
      <div className="rtg-preview-title" style={{ color: tokens.heading, fontFamily: tokens.headingFont }}>
        Introduction
      </div>
      <div className="rtg-preview-line" style={{ background: tokens.textMuted }} />
      <div className="rtg-preview-line" style={{ background: tokens.textMuted, width: '70%' }} />
    </div>
  );
}

const ReaderThemesGallery = () => {
  const navigate = useNavigate();
  const [customThemes, setCustomThemes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const menuWrapRef = useRef(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [themes] = await Promise.all([fetchCustomThemes(), checkTableExists()]);
    setCustomThemes(themes);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Click outside to close open menu
  useEffect(() => {
    if (!openMenuId) return;
    const handleOutsideClick = (e) => {
      if (!e.target.closest('.rtg-menu-wrap')) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [openMenuId]);

  const allThemes = [...READER_THEME_LIST, ...customThemes];

  const handleDuplicate = async (theme) => {
    setBusyId(theme.id);
    setOpenMenuId(null);
    try {
      const copy = await saveCustomTheme({ name: `${theme.name} Copy`, description: theme.description, tokens: theme.tokens });
      setCustomThemes((prev) => [...prev, copy]);
    } catch (err) {
      console.error('Failed to duplicate theme:', err);
    } finally {
      setBusyId(null);
    }
  };

  const handleSetDefault = async (theme) => {
    setBusyId(theme.id);
    setOpenMenuId(null);
    try {
      await setDefaultTheme(theme.id);
      setCustomThemes((prev) => prev.map((t) => ({ ...t, isDefault: t.id === theme.id })));
    } catch (err) {
      console.error('Failed to set default theme:', err);
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (theme) => {
    if (!window.confirm(`Delete the "${theme.name}" theme? This can't be undone.`)) return;
    setBusyId(theme.id);
    setOpenMenuId(null);
    try {
      await deleteCustomTheme(theme.id);
      setCustomThemes((prev) => prev.filter((t) => t.id !== theme.id));
    } catch (err) {
      console.error('Failed to delete theme:', err);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div>
      <div className="lc-section-header">
        <div>
          <h2>Reader Themes</h2>
          <p>Configure how VeerNXT books look across the Learning Center.</p>
        </div>
        <button className="lc-btn primary" onClick={() => navigate('/admin/reader-themes/new')}>
          <Plus size={16} /> Create Theme
        </button>
      </div>

      {loading ? (
        <div className="lc-loading-state">Loading themes…</div>
      ) : (
        <div className="rtg-grid">
          {allThemes.map((theme) => {
            const isCustom = !theme.isSystem;
            const headingFontLabel = theme.tokens.headingFont.split(',')[0].replace(/['"]/g, '');
            const bodyFontLabel = theme.tokens.bodyFont.split(',')[0].replace(/['"]/g, '');
            const isMenuOpen = openMenuId === theme.id;

            return (
              <div key={theme.id} className="rtg-card" style={{ zIndex: isMenuOpen ? 50 : 1 }}>
                <ThemePreviewCard theme={theme} />
                <div className="rtg-card-body">
                  <div className="rtg-card-title-row">
                    <h3>{theme.name}</h3>
                    {theme.isDefault && <span className="rtg-default-badge">Default</span>}
                  </div>
                  <p className="rtg-card-desc">{theme.description}</p>
                  <div className="rtg-card-meta-row">
                    <span className="rtg-font-tag">{headingFontLabel} + {bodyFontLabel}</span>
                  </div>
                  <div className="rtg-card-swatches">
                    {[theme.tokens.primary, theme.tokens.secondary, theme.tokens.success].map((c, i) => (
                      <span key={i} className="rtg-swatch-dot" style={{ background: c }} />
                    ))}
                    {isCustom && <span className="rtg-custom-tag">Custom</span>}
                  </div>

                  <div className="rtg-card-actions">
                    <button className="lc-btn" onClick={() => navigate(`/admin/reader-themes/${theme.id}`)}>Edit</button>
                    <button className="lc-btn" onClick={() => navigate(`/admin/reader-themes/${theme.id}?preview=1`)}>Preview</button>
                    <div className="rtg-menu-wrap">
                      <button
                        className="lc-icon-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenMenuId(isMenuOpen ? null : theme.id);
                        }}
                        disabled={busyId === theme.id}
                        aria-label="More actions"
                        style={{
                          background: isMenuOpen ? 'var(--surface-alt)' : 'transparent',
                          borderColor: isMenuOpen ? 'var(--border-strong)' : 'var(--border)',
                        }}
                      >
                        {busyId === theme.id ? <RefreshCw size={15} className="animate-spin" /> : <MoreHorizontal size={15} />}
                      </button>
                      {isMenuOpen && (
                        <div className="rtg-dropdown-menu" onClick={(e) => e.stopPropagation()}>
                          <button type="button" className="rtg-dropdown-item" onClick={() => handleDuplicate(theme)}>
                            <Copy size={14} /> Duplicate
                          </button>
                          {isCustom && (
                            <>
                              <button type="button" className="rtg-dropdown-item" onClick={() => handleSetDefault(theme)}>
                                <Star size={14} /> Set as Default
                              </button>
                              <button
                                type="button"
                                className="rtg-dropdown-item danger"
                                onClick={() => handleDelete(theme)}
                              >
                                <Trash2 size={14} /> Delete
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        .rtg-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 1.5rem; }
        .rtg-card { background: var(--surface); border: 1px solid var(--border); border-radius: 12px; display: flex; flex-direction: column; position: relative; }
        .rtg-preview { height: 140px; border-bottom: 1px solid var(--border); border-top-left-radius: 11px; border-top-right-radius: 11px; padding: 1rem 1.1rem; display: flex; flex-direction: column; gap: 0.4rem; }
        .rtg-preview-eyebrow { font-size: 0.62rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; }
        .rtg-preview-title { font-size: 1.15rem; font-weight: 800; margin-bottom: 0.4rem; }
        .rtg-preview-line { height: 5px; border-radius: 3px; opacity: 0.35; width: 90%; }

        .rtg-card-body { padding: 1.1rem 1.2rem 1.25rem; display: flex; flex-direction: column; gap: 0.6rem; flex: 1; }
        .rtg-card-title-row { display: flex; align-items: center; gap: 0.5rem; }
        .rtg-card-title-row h3 { margin: 0; font-size: 1rem; color: var(--admin-text); }
        .rtg-default-badge { font-size: 0.62rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.04em; background: var(--admin-accent); color: #06281c; padding: 0.15rem 0.5rem; border-radius: 4px; }
        .rtg-card-desc { margin: 0; font-size: 0.8rem; color: var(--admin-text-muted); line-height: 1.4; }
        .rtg-card-meta-row { display: flex; }
        .rtg-font-tag { font-size: 0.72rem; color: var(--admin-text-muted); }
        .rtg-card-swatches { display: flex; align-items: center; gap: 0.4rem; }
        .rtg-swatch-dot { width: 16px; height: 16px; border-radius: 50%; border: 1px solid var(--border); }
        .rtg-custom-tag { margin-left: auto; font-size: 0.62rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.03em; color: var(--admin-text-muted); border: 1px solid var(--border); padding: 0.1rem 0.4rem; border-radius: 4px; }
        
        .rtg-card-actions { display: flex; gap: 0.5rem; margin-top: auto; padding-top: 0.5rem; align-items: center; position: relative; }
        .rtg-card-actions .lc-btn { flex: 1; justify-content: center; font-size: 0.78rem; padding: 0.5rem 0.6rem; }
        .rtg-menu-wrap { position: relative; flex-shrink: 0; }
        
        .rtg-dropdown-menu {
          position: absolute;
          bottom: calc(100% + 8px);
          right: 0;
          background: #1e293b;
          border: 1px solid #334155;
          border-radius: 8px;
          padding: 0.4rem;
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.6), 0 8px 10px -6px rgba(0, 0, 0, 0.4);
          z-index: 1000;
          min-width: 160px;
          display: flex;
          flex-direction: column;
          gap: 0.2rem;
        }

        .rtg-dropdown-item {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          padding: 0.5rem 0.75rem;
          border-radius: 6px;
          font-size: 0.82rem;
          font-weight: 500;
          color: #f1f5f9;
          background: transparent;
          border: none;
          cursor: pointer;
          width: 100%;
          text-align: left;
          transition: background 0.12s ease;
        }

        .rtg-dropdown-item:hover {
          background: #334155;
        }

        .rtg-dropdown-item.danger {
          color: #f87171;
        }

        .rtg-dropdown-item.danger:hover {
          background: rgba(239, 68, 68, 0.15);
          color: #ef4444;
        }
      `}} />
    </div>
  );
};

export default ReaderThemesGallery;
