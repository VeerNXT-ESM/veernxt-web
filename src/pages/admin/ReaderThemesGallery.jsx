import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, MoreHorizontal, Copy, Star, Trash2, RefreshCw, BookOpen, FileText, BookMarked, CheckCircle2, Sparkles } from 'lucide-react';
import { READER_THEME_LIST } from '../../components/book/theme/readerThemeRegistry';
import {
  fetchCustomThemes,
  saveCustomTheme,
  deleteCustomTheme,
  setDefaultTheme,
  checkTableExists,
  READER_CATEGORIES,
  normalizeReaderCategory,
  fetchCategoryDefaultThemes,
  setCategoryDefaultTheme,
} from '../../components/book/theme/customThemeStore';

const CATEGORY_META = {
  Intro: {
    label: 'Intro',
    fullLabel: 'Introduction',
    icon: BookOpen,
    desc: 'Applied to exam overviews, intros, and preliminary guides',
    previewEyebrow: 'Intro & Syllabus',
    previewTitle: 'Exam Overview & Pattern',
  },
  Precis: {
    label: 'Precis',
    fullLabel: 'Precis & Notes',
    icon: FileText,
    desc: 'Applied to precis, key takeaways, and concise revision notes',
    previewEyebrow: 'High-Yield Precis',
    previewTitle: 'Core Revision Summary',
  },
  Guide: {
    label: 'Guide',
    fullLabel: 'Comprehensive Guides',
    icon: BookMarked,
    desc: 'Applied to comprehensive guides, textbooks, and detailed chapters',
    previewEyebrow: 'Chapter 1',
    previewTitle: 'Core Frameworks & Principles',
  },
};

function ThemePreviewCard({ theme, category }) {
  const { tokens } = theme;
  const meta = CATEGORY_META[category] || CATEGORY_META.Guide;
  return (
    <div className="rtg-preview" style={{ background: tokens.background, borderColor: tokens.border }}>
      <div className="rtg-preview-eyebrow" style={{ color: tokens.primary, fontFamily: tokens.headingFont }}>
        {meta.previewEyebrow}
      </div>
      <div className="rtg-preview-title" style={{ color: tokens.heading, fontFamily: tokens.headingFont }}>
        {meta.previewTitle}
      </div>
      <div className="rtg-preview-line" style={{ background: tokens.textMuted }} />
      <div className="rtg-preview-line" style={{ background: tokens.textMuted, width: '70%' }} />
    </div>
  );
}

const ReaderThemesGallery = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialCategory = normalizeReaderCategory(searchParams.get('category') || 'Intro');
  const [activeCategory, setActiveCategory] = useState(initialCategory);

  const [customThemes, setCustomThemes] = useState([]);
  const [categoryDefaults, setCategoryDefaults] = useState({ Intro: 'modern', Precis: 'examPrep', Guide: 'academic' });
  const [loading, setLoading] = useState(true);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [successToast, setSuccessToast] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [themes, catDefaults] = await Promise.all([
      fetchCustomThemes(),
      fetchCategoryDefaultThemes(),
      checkTableExists(),
    ]);
    setCustomThemes(themes);
    if (catDefaults) setCategoryDefaults(catDefaults);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCategoryChange = (cat) => {
    setActiveCategory(cat);
    setSearchParams({ category: cat });
  };

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
  const activeThemeIdForCategory = categoryDefaults[activeCategory] || 'academic';

  const handleApplyToCategory = async (theme) => {
    setBusyId(theme.id);
    try {
      await setCategoryDefaultTheme(activeCategory, theme.id);
      setCategoryDefaults((prev) => ({ ...prev, [activeCategory]: theme.id }));
      setSuccessToast(`"${theme.name}" is now the active theme for all ${activeCategory} content!`);
      setTimeout(() => setSuccessToast(null), 4000);
    } catch (err) {
      console.error(`Failed to apply theme to ${activeCategory}:`, err);
    } finally {
      setBusyId(null);
    }
  };

  const handleDuplicate = async (theme) => {
    setBusyId(theme.id);
    setOpenMenuId(null);
    try {
      const copy = await saveCustomTheme(
        { name: `${theme.name} (${activeCategory})`, description: theme.description, tokens: theme.tokens },
        activeCategory
      );
      setCustomThemes((prev) => [...prev, copy]);
    } catch (err) {
      console.error('Failed to duplicate theme:', err);
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

  const activeMeta = CATEGORY_META[activeCategory];
  const ActiveIcon = activeMeta.icon;

  return (
    <div>
      {/* 3-Way Category Bifurcation Switcher */}
      <div className="rtg-category-bar">
        <div className="rtg-category-tabs">
          {READER_CATEGORIES.map((cat) => {
            const meta = CATEGORY_META[cat];
            const Icon = meta.icon;
            const isActive = activeCategory === cat;
            const currentThemeId = categoryDefaults[cat];
            const currentTheme = allThemes.find((t) => t.id === currentThemeId);

            return (
              <button
                key={cat}
                type="button"
                className={`rtg-category-tab ${isActive ? 'active' : ''}`}
                onClick={() => handleCategoryChange(cat)}
              >
                <Icon size={17} />
                <div className="rtg-category-tab-text">
                  <span className="rtg-category-tab-name">{meta.label}</span>
                  <span className="rtg-category-tab-sub">
                    {currentTheme ? currentTheme.name : 'Custom'}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        <button
          className="lc-btn primary"
          onClick={() => navigate(`/admin/reader-themes/new?category=${activeCategory}`)}
        >
          <Plus size={16} /> Create Theme for {activeCategory}
        </button>
      </div>

      {/* Category Info Header Banner */}
      <div className="rtg-info-banner">
        <div className="rtg-info-left">
          <ActiveIcon size={20} className="rtg-info-icon" />
          <div>
            <div className="rtg-info-title">
              Managing <strong>{activeCategory}</strong> Reader Theme
            </div>
            <div className="rtg-info-desc">{activeMeta.desc}</div>
          </div>
        </div>
        <div className="rtg-info-active-pill">
          <Sparkles size={14} color="var(--admin-accent, #10b981)" />
          <span>Active for {activeCategory}: <strong>{allThemes.find((t) => t.id === activeThemeIdForCategory)?.name || 'Academic'}</strong></span>
        </div>
      </div>

      {successToast && (
        <div className="rtg-toast animate-fade-in">
          <CheckCircle2 size={16} /> {successToast}
        </div>
      )}

      {loading ? (
        <div className="lc-loading-state">Loading themes…</div>
      ) : (
        <div className="rtg-grid">
          {allThemes.map((theme) => {
            const isCustom = !theme.isSystem;
            const isCategoryActive = activeThemeIdForCategory === theme.id;
            const headingFontLabel = theme.tokens.headingFont.split(',')[0].replace(/['"]/g, '');
            const bodyFontLabel = theme.tokens.bodyFont.split(',')[0].replace(/['"]/g, '');
            const isMenuOpen = openMenuId === theme.id;

            return (
              <div
                key={theme.id}
                className={`rtg-card ${isCategoryActive ? 'category-active' : ''}`}
                style={{ zIndex: isMenuOpen ? 50 : 1 }}
              >
                <ThemePreviewCard theme={theme} category={activeCategory} />
                <div className="rtg-card-body">
                  <div className="rtg-card-title-row">
                    <h3>{theme.name}</h3>
                    {isCategoryActive ? (
                      <span className="rtg-active-badge">
                        <CheckCircle2 size={11} /> Active for {activeCategory}
                      </span>
                    ) : theme.isDefault ? (
                      <span className="rtg-default-badge">Global Default</span>
                    ) : null}
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
                    {isCategoryActive ? (
                      <button
                        className="lc-btn primary"
                        style={{ background: 'var(--admin-accent-soft, rgba(16,185,129,0.15))', color: 'var(--admin-accent, #10b981)', borderColor: 'var(--admin-accent, #10b981)' }}
                        onClick={() => navigate(`/admin/reader-themes/${theme.id}?category=${activeCategory}`)}
                      >
                        Customize for {activeCategory}
                      </button>
                    ) : (
                      <button
                        className="lc-btn"
                        onClick={() => handleApplyToCategory(theme)}
                        disabled={busyId === theme.id}
                      >
                        {busyId === theme.id ? <RefreshCw size={13} className="animate-spin" /> : <Star size={13} />}
                        Apply to {activeCategory}
                      </button>
                    )}

                    <button
                      className="lc-btn"
                      style={{ flex: '0 0 auto', padding: '0.5rem 0.75rem' }}
                      onClick={() => navigate(`/admin/reader-themes/${theme.id}?category=${activeCategory}`)}
                      title={`Edit theme settings for ${activeCategory}`}
                    >
                      Edit
                    </button>

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
                            <Copy size={14} /> Duplicate for {activeCategory}
                          </button>
                          {!isCategoryActive && (
                            <button type="button" className="rtg-dropdown-item" onClick={() => handleApplyToCategory(theme)}>
                              <Star size={14} /> Set as {activeCategory} Theme
                            </button>
                          )}
                          {isCustom && (
                            <button
                              type="button"
                              className="rtg-dropdown-item danger"
                              onClick={() => handleDelete(theme)}
                            >
                              <Trash2 size={14} /> Delete
                            </button>
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
        .rtg-category-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
          flex-wrap: wrap;
          margin-bottom: 1.25rem;
        }

        .rtg-category-tabs {
          display: flex;
          gap: 0.5rem;
          background: var(--surface-alt, #0f172a);
          padding: 0.35rem;
          border-radius: 12px;
          border: 1px solid var(--border, #334155);
        }

        .rtg-category-tab {
          display: flex;
          align-items: center;
          gap: 0.65rem;
          padding: 0.6rem 1.1rem;
          border-radius: 8px;
          border: 1px solid transparent;
          background: transparent;
          color: var(--admin-text-muted, #94a3b8);
          cursor: pointer;
          transition: all 0.15s ease;
          text-align: left;
        }

        .rtg-category-tab:hover {
          background: rgba(255, 255, 255, 0.04);
          color: var(--admin-text, #f1f5f9);
        }

        .rtg-category-tab.active {
          background: var(--surface, #1e293b);
          border-color: var(--admin-accent, #10b981);
          color: var(--admin-text, #f1f5f9);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
        }

        .rtg-category-tab-text {
          display: flex;
          flex-direction: column;
        }

        .rtg-category-tab-name {
          font-size: 0.88rem;
          font-weight: 700;
          line-height: 1.2;
        }

        .rtg-category-tab-sub {
          font-size: 0.7rem;
          color: var(--admin-text-muted, #64748b);
        }

        .rtg-category-tab.active .rtg-category-tab-sub {
          color: var(--admin-accent, #10b981);
          font-weight: 600;
        }

        .rtg-info-banner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
          flex-wrap: wrap;
          padding: 0.9rem 1.25rem;
          margin-bottom: 1.5rem;
          background: var(--surface, #1e293b);
          border: 1px solid var(--border, #334155);
          border-radius: 12px;
        }

        .rtg-info-left {
          display: flex;
          align-items: center;
          gap: 0.85rem;
        }

        .rtg-info-icon {
          color: var(--admin-accent, #10b981);
          flex-shrink: 0;
        }

        .rtg-info-title {
          font-size: 0.92rem;
          color: var(--admin-text, #f1f5f9);
        }

        .rtg-info-desc {
          font-size: 0.78rem;
          color: var(--admin-text-muted, #94a3b8);
          margin-top: 0.15rem;
        }

        .rtg-info-active-pill {
          display: flex;
          align-items: center;
          gap: 0.45rem;
          padding: 0.4rem 0.8rem;
          border-radius: 999px;
          background: var(--surface-alt, #0f172a);
          border: 1px solid var(--border, #334155);
          font-size: 0.8rem;
          color: var(--admin-text, #f1f5f9);
        }

        .rtg-toast {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1.1rem;
          margin-bottom: 1.25rem;
          background: rgba(16, 185, 129, 0.15);
          border: 1px solid var(--admin-accent, #10b981);
          border-radius: 8px;
          font-size: 0.84rem;
          color: #a7f3d0;
        }

        .rtg-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1.5rem; }
        .rtg-card { background: var(--surface); border: 1px solid var(--border); border-radius: 12px; display: flex; flex-direction: column; position: relative; transition: border-color 0.2s, box-shadow 0.2s; }
        .rtg-card.category-active { border-color: var(--admin-accent, #10b981); box-shadow: 0 0 0 1px var(--admin-accent, #10b981), 0 4px 16px rgba(16, 185, 129, 0.12); }
        .rtg-preview { height: 140px; border-bottom: 1px solid var(--border); border-top-left-radius: 11px; border-top-right-radius: 11px; padding: 1rem 1.1rem; display: flex; flex-direction: column; gap: 0.4rem; }
        .rtg-preview-eyebrow { font-size: 0.62rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; }
        .rtg-preview-title { font-size: 1.15rem; font-weight: 800; margin-bottom: 0.4rem; }
        .rtg-preview-line { height: 5px; border-radius: 3px; opacity: 0.35; width: 90%; }

        .rtg-card-body { padding: 1.1rem 1.2rem 1.25rem; display: flex; flex-direction: column; gap: 0.6rem; flex: 1; }
        .rtg-card-title-row { display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; flex-wrap: wrap; }
        .rtg-card-title-row h3 { margin: 0; font-size: 1rem; color: var(--admin-text); }
        .rtg-active-badge { display: inline-flex; align-items: center; gap: 0.3rem; font-size: 0.68rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.04em; background: var(--admin-accent, #10b981); color: #06281c; padding: 0.2rem 0.55rem; border-radius: 6px; }
        .rtg-default-badge { font-size: 0.62rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.04em; background: var(--surface-alt); color: var(--admin-text-muted); border: 1px solid var(--border); padding: 0.15rem 0.5rem; border-radius: 4px; }
        .rtg-card-desc { margin: 0; font-size: 0.8rem; color: var(--admin-text-muted); line-height: 1.4; }
        .rtg-card-meta-row { display: flex; }
        .rtg-font-tag { font-size: 0.72rem; color: var(--admin-text-muted); }
        .rtg-card-swatches { display: flex; align-items: center; gap: 0.4rem; }
        .rtg-swatch-dot { width: 16px; height: 16px; border-radius: 50%; border: 1px solid var(--border); }
        .rtg-custom-tag { margin-left: auto; font-size: 0.62rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.03em; color: var(--admin-text-muted); border: 1px solid var(--border); padding: 0.1rem 0.4rem; border-radius: 4px; }
        
        .rtg-card-actions { display: flex; gap: 0.5rem; margin-top: auto; padding-top: 0.5rem; align-items: center; position: relative; }
        .rtg-card-actions .lc-btn { font-size: 0.78rem; padding: 0.5rem 0.65rem; }
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
          min-width: 175px;
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
