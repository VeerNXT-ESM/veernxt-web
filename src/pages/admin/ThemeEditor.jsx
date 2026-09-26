import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import {
  ChevronLeft, Monitor, Tablet, Smartphone, Sun, Moon, RotateCcw, Save,
  Palette, Type, LayoutGrid, RefreshCw, CheckCircle2, MessageSquareQuote,
  Table, Quote, Layers,
} from 'lucide-react';
import { BlockRenderer } from '../../components/book/BlockRenderer';
import { ChapterHeader } from '../../components/book/BookBlocks';
import '../../components/book/BookBlocks.css';
import { ALL_TOKEN_KEYS, tokenToCssVar, DEFAULT_TOKENS } from '../../components/book/theme/readerThemeTokens';
import { getRegistryTheme, readerThemes } from '../../components/book/theme/readerThemeRegistry';
import { fetchThemeById, saveCustomTheme } from '../../components/book/theme/customThemeStore';

const ACADEMIC = readerThemes.academic;

const FONT_OPTIONS = [
  { label: 'Inter', value: "'Inter', sans-serif" },
  { label: 'Merriweather', value: "'Merriweather', serif" },
  { label: 'Outfit', value: "'Outfit', sans-serif" },
  { label: 'Roboto', value: "'Roboto', sans-serif" },
  { label: 'Georgia', value: "'Georgia', serif" },
  { label: 'Playfair Display', value: "'Playfair Display', serif" },
  { label: 'Poppins', value: "'Poppins', sans-serif" },
];

const VIEWPORTS = {
  desktop: { label: 'Desktop', icon: Monitor, width: '100%' },
  tablet: { label: 'Tablet', icon: Tablet, width: '760px' },
  mobile: { label: 'Mobile', icon: Smartphone, width: '400px' },
};

// Rich sample chapter blocks demonstrating Tables, Pull Quotes, Callouts, Key Facts, and Exam Alerts
const SAMPLE_PREVIEW_BLOCKS = [
  {
    id: 'sample-p1',
    type: 'paragraph',
    content: 'The architectural foundations of modern institutional frameworks require a disciplined understanding of strategic principles, regulatory governance, and quantitative benchmarking methods.',
  },
  {
    id: 'sample-h2',
    type: 'heading',
    level: 2,
    content: 'Key Structural Concepts & Methodologies',
  },
  {
    id: 'sample-callout-1',
    type: 'examTip',
    content: 'Candidates must memorize the distinct classification criteria for Tier-1 and Tier-2 asset allocation under Basel III regulatory compliance frameworks.',
  },
  {
    id: 'sample-p2',
    type: 'paragraph',
    content: 'The following comparative matrix establishes standard metric variations observed across institutional evaluation cycles.',
  },
  {
    id: 'sample-table',
    type: 'table',
    rows: [
      ['Dimension', 'Standard Model', 'Advanced Paradigm', 'Target Threshold'],
      ['Capital Adequacy Ratio', '8.0%', '11.5%', '≥ 12.0%'],
      ['Liquidity Coverage Ratio', '90.0%', '115.0%', '≥ 100.0%'],
      ['Leverage Ratio', '3.0%', '4.5%', '≥ 4.0%'],
      ['Net Stable Funding Ratio', '85.0%', '105.0%', '≥ 100.0%'],
    ],
  },
  {
    id: 'sample-quote',
    type: 'pullQuote',
    content: '“Discipline is the bridge between operational goals and sustained strategic execution.” — VeerNXT Leadership',
  },
  {
    id: 'sample-callout-2',
    type: 'important',
    content: 'Critical Rule: Direct regulatory audits will automatically trigger if the capital adequacy buffer dips below statutory limits during consecutive quarterly filings.',
  },
  {
    id: 'sample-callout-3',
    type: 'definition',
    content: 'Statutory Liquidity Ratio (SLR): The mandatory percentage of total deposits that commercial institutions must maintain in high-grade sovereign securities.',
  },
  {
    id: 'sample-keyfacts',
    type: 'keyFacts',
    title: 'Core Revision Summary',
    items: [
      'Statutory ratio adjustments take effect within 14 calendar days of monetary notification.',
      'Tier-1 reserves must consist of paid-up equity capital and audited statutory reserves.',
      'Risk-weighted assets determine minimum capital buffer thresholds across all lending divisions.',
    ],
  },
  {
    id: 'sample-statstrip',
    type: 'statStrip',
    stats: [
      { value: '1,250+', label: 'Veterans Placed' },
      { value: '99.4%', label: 'Exam Accuracy' },
      { value: '100%', label: 'Syllabus Coverage' },
    ],
  },
];

const DARK_SURFACE_OVERRIDE = {
  background: '#0f172a',
  surface: '#1e293b',
  surfaceAlt: '#0b1220',
  text: '#e2e8f0',
  textMuted: '#94a3b8',
  heading: '#f1f5f9',
  border: '#334155',
  borderStrong: '#475569',
};

function colorField(label, value, onChange) {
  return (
    <div className="te-color-field" key={label}>
      <label>{label}</label>
      <div className="te-color-input-row">
        <input type="color" value={value || '#000000'} onChange={(e) => onChange(e.target.value)} />
        <input type="text" value={value || ''} onChange={(e) => onChange(e.target.value)} className="te-color-hex" />
      </div>
    </div>
  );
}

function sliderField(label, value, unit, min, max, step, onChange) {
  const numeric = parseFloat(value) || 0;
  return (
    <div className="te-slider-field" key={label}>
      <label>{label} <span>{numeric}{unit}</span></label>
      <input type="range" min={min} max={max} step={step} value={numeric} onChange={(e) => onChange(`${e.target.value}${unit}`)} />
    </div>
  );
}

const ThemeEditor = () => {
  const { themeId } = useParams();
  const navigate = useNavigate();
  const isNew = !themeId || themeId === 'new';

  const [theme, setTheme] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activePanel, setActivePanel] = useState('colors');
  const [viewport, setViewport] = useState('desktop');
  const [darkPreview, setDarkPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [previewBlocks, setPreviewBlocks] = useState(SAMPLE_PREVIEW_BLOCKS);
  const [previewTitle, setPreviewTitle] = useState('Chapter 01: Core Frameworks & Principles');
  const [previewLoading, setPreviewLoading] = useState(false);
  const previewRootRef = useRef(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      if (isNew) {
        setTheme({ id: null, name: 'New Theme', description: '', tokens: { ...ACADEMIC.tokens } });
      } else {
        const found = await fetchThemeById(themeId);
        setTheme(found ? { ...found, tokens: { ...found.tokens } } : { id: null, name: 'New Theme', description: '', tokens: { ...ACADEMIC.tokens } });
      }
      setLoading(false);
    })();
  }, [themeId, isNew]);

  useEffect(() => {
    (async () => {
      try {
        const { data: resource } = await supabase
          .from('resources')
          .select('resource_id, title, exam_name, storage_base_url')
          .eq('format', 'blocks')
          .eq('status', 'Published')
          .limit(1)
          .maybeSingle();

        if (resource?.storage_base_url) {
          const res = await fetch(`${resource.storage_base_url}chapters/chapter-1.json`);
          if (res.ok) {
            const chapterData = await res.json();
            if (Array.isArray(chapterData.blocks) && chapterData.blocks.length > 0) {
              setPreviewBlocks(chapterData.blocks);
              setPreviewTitle(chapterData.title || resource.title);
            }
          }
        }
      } catch (err) {
        console.warn('Could not load real chapter from database, using rich sample preview blocks:', err.message);
      }
    })();
  }, []);

  useEffect(() => {
    if (!theme || !previewRootRef.current) return;
    const root = previewRootRef.current;
    const tokens = darkPreview ? { ...theme.tokens, ...DARK_SURFACE_OVERRIDE } : theme.tokens;
    ALL_TOKEN_KEYS.forEach((key) => {
      const value = tokens[key];
      if (value != null) root.style.setProperty(tokenToCssVar(key), value);
    });
  }, [theme, darkPreview]);

  const updateToken = (key, value) => {
    setTheme((prev) => ({ ...prev, tokens: { ...prev.tokens, [key]: value } }));
  };

  const handleReset = () => {
    if (!window.confirm('Reset all changes back to Academic defaults?')) return;
    setTheme((prev) => ({ ...prev, tokens: { ...DEFAULT_TOKENS } }));
  };

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      const savedTheme = await saveCustomTheme({
        id: theme.id,
        name: theme.name,
        description: theme.description,
        tokens: theme.tokens,
      });
      setTheme((prev) => ({ ...prev, id: savedTheme.id }));
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      if (savedTheme.id !== themeId) navigate(`/admin/reader-themes/${savedTheme.id}`, { replace: true });
    } catch (err) {
      console.error('Failed to save theme:', err);
      window.alert(`Could not save this theme: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading || !theme) {
    return (
      <div className="te-loading">
        <RefreshCw size={28} className="animate-spin" />
      </div>
    );
  }

  const { tokens } = theme;
  const isSystemTheme = !!getRegistryTheme(themeId);

  return (
    <div className="te-root">
      <header className="te-topbar">
        <div className="te-topbar-left">
          <button className="te-back-btn" onClick={() => navigate('/admin/reader-themes')} title="Back to themes gallery">
            <ChevronLeft size={18} />
          </button>
          <div>
            <div className="te-topbar-title-row">
              <input
                className="te-name-input"
                value={theme.name}
                onChange={(e) => setTheme((p) => ({ ...p, name: e.target.value }))}
                placeholder="Theme name"
              />
              {theme.isDefault && <span className="rtg-default-badge">Default</span>}
              {isSystemTheme && <span className="te-system-badge">System Preset</span>}
            </div>
            <input
              className="te-desc-input"
              value={theme.description || ''}
              onChange={(e) => setTheme((p) => ({ ...p, description: e.target.value }))}
              placeholder="Short description for this theme…"
            />
          </div>
        </div>

        <div className="te-topbar-right">
          <div className="te-viewport-toggle">
            {Object.entries(VIEWPORTS).map(([k, v]) => {
              const Icon = v.icon;
              return (
                <button
                  key={k}
                  className={`te-viewport-btn ${viewport === k ? 'active' : ''}`}
                  onClick={() => setViewport(k)}
                  title={v.label}
                  aria-label={v.label}
                >
                  <Icon size={16} />
                </button>
              );
            })}
          </div>

          <button
            className="te-mode-toggle"
            onClick={() => setDarkPreview((v) => !v)}
            title={darkPreview ? 'Preview light surface' : 'Preview dark surface'}
          >
            {darkPreview ? <Sun size={15} /> : <Moon size={15} />}
            <span>{darkPreview ? 'Dark Surface' : 'Light Surface'}</span>
          </button>

          <button className="te-btn" onClick={handleReset} title="Reset all changes">
            <RotateCcw size={15} /> Reset
          </button>

          <button className="te-btn primary" onClick={handleSave} disabled={saving}>
            {saving ? <RefreshCw size={15} className="animate-spin" /> : saved ? <CheckCircle2 size={15} /> : <Save size={15} />}
            {saved ? 'Saved!' : 'Save Theme'}
          </button>
        </div>
      </header>

      <div className="te-body">
        <aside className="te-side-nav">
          <button className={`te-side-nav-item ${activePanel === 'colors' ? 'active' : ''}`} onClick={() => setActivePanel('colors')}>
            <Palette size={16} /> Colors
          </button>
          <button className={`te-side-nav-item ${activePanel === 'typography' ? 'active' : ''}`} onClick={() => setActivePanel('typography')}>
            <Type size={16} /> Typography
          </button>
          <button className={`te-side-nav-item ${activePanel === 'layout' ? 'active' : ''}`} onClick={() => setActivePanel('layout')}>
            <LayoutGrid size={16} /> Layout & Spacing
          </button>
          <button className={`te-side-nav-item ${activePanel === 'callouts' ? 'active' : ''}`} onClick={() => setActivePanel('callouts')}>
            <MessageSquareQuote size={16} /> Callouts & Alerts
          </button>
          <button className={`te-side-nav-item ${activePanel === 'tables' ? 'active' : ''}`} onClick={() => setActivePanel('tables')}>
            <Table size={16} /> Tables & Quotes
          </button>
        </aside>

        <main className="te-preview-area">
          <div className="te-preview-frame" style={{ width: VIEWPORTS[viewport].width }}>
            <div
              className="reader-theme-container te-preview-page"
              ref={previewRootRef}
              style={{ background: darkPreview ? DARK_SURFACE_OVERRIDE.background : tokens.background }}
            >
              {previewLoading ? (
                <div className="te-preview-loading"><RefreshCw size={22} className="animate-spin" /></div>
              ) : previewBlocks && previewBlocks.length > 0 ? (
                <div className="bk-article" style={{ padding: '2.5rem 3rem' }}>
                  <ChapterHeader title={previewTitle} order={1} />
                  <div className="bk-blocks-container">
                    {previewBlocks.map((block) => <BlockRenderer key={block.id} block={block} />)}
                  </div>
                </div>
              ) : (
                <p className="te-preview-empty">No preview content available.</p>
              )}
            </div>
          </div>
        </main>

        <aside className="te-controls-panel">
          {activePanel === 'colors' && (
            <>
              <div className="te-controls-group">
                <div className="te-controls-group-header"><h4>Brand & Primary</h4></div>
                {colorField('Primary (Accent)', tokens.primary, (v) => updateToken('primary', v))}
                {colorField('Primary Soft (Tint)', tokens.primarySoft, (v) => updateToken('primarySoft', v))}
                {colorField('Secondary', tokens.secondary, (v) => updateToken('secondary', v))}
              </div>
              <div className="te-controls-group">
                <div className="te-controls-group-header"><h4>Reader Surface & Text</h4></div>
                {colorField('Background', tokens.background, (v) => updateToken('background', v))}
                {colorField('Surface Card', tokens.surface, (v) => updateToken('surface', v))}
                {colorField('Surface Alt', tokens.surfaceAlt, (v) => updateToken('surfaceAlt', v))}
                {colorField('Body Text', tokens.text, (v) => updateToken('text', v))}
                {colorField('Muted Text', tokens.textMuted, (v) => updateToken('textMuted', v))}
                {colorField('Heading Text', tokens.heading, (v) => updateToken('heading', v))}
                {colorField('Border', tokens.border, (v) => updateToken('border', v))}
                {colorField('Strong Border', tokens.borderStrong, (v) => updateToken('borderStrong', v))}
              </div>
              <div className="te-controls-group">
                <div className="te-controls-group-header"><h4>Semantic Badges & Alerts</h4></div>
                {colorField('Success (Key Facts)', tokens.success, (v) => updateToken('success', v))}
                {colorField('Warning (Exam Tips)', tokens.warning, (v) => updateToken('warning', v))}
                {colorField('Danger (Important)', tokens.danger, (v) => updateToken('danger', v))}
                {colorField('Info (Definitions)', tokens.info, (v) => updateToken('info', v))}
              </div>
            </>
          )}

          {activePanel === 'typography' && (
            <div className="te-controls-group">
              <div className="te-controls-group-header"><h4>Font Families</h4></div>
              <div className="te-select-field">
                <label>Heading Font</label>
                <select value={tokens.headingFont} onChange={(e) => updateToken('headingFont', e.target.value)}>
                  {FONT_OPTIONS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
                </select>
              </div>
              <div className="te-select-field">
                <label>Body Font</label>
                <select value={tokens.bodyFont} onChange={(e) => updateToken('bodyFont', e.target.value)}>
                  {FONT_OPTIONS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
                </select>
              </div>
              <div className="te-select-field">
                <label>UI Font</label>
                <select value={tokens.uiFont} onChange={(e) => updateToken('uiFont', e.target.value)}>
                  {FONT_OPTIONS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
                </select>
              </div>
              <div className="te-select-field">
                <label>Drop Cap & Quote Font</label>
                <select value={tokens.dropcapFont} onChange={(e) => updateToken('dropcapFont', e.target.value)}>
                  {FONT_OPTIONS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
                </select>
              </div>

              <div className="te-controls-group-header" style={{ marginTop: '0.5rem' }}><h4>Body Scale</h4></div>
              {sliderField('Body Size', tokens.bodySize, 'rem', 0.9, 1.4, 0.025, (v) => updateToken('bodySize', v))}
              {sliderField('Line Height', tokens.bodyLineHeight, '', 1.4, 2.1, 0.05, (v) => updateToken('bodyLineHeight', v))}

              <div className="te-controls-group-header" style={{ marginTop: '0.5rem' }}><h4>Heading Scale</h4></div>
              {sliderField('H1 Size', tokens.h1Size, 'rem', 1.8, 3.5, 0.05, (v) => updateToken('h1Size', v))}
              {sliderField('H2 Size', tokens.h2Size, 'rem', 1.4, 2.8, 0.05, (v) => updateToken('h2Size', v))}
              {sliderField('H3 Size', tokens.h3Size, 'rem', 1, 1.8, 0.025, (v) => updateToken('h3Size', v))}
              {sliderField('Heading Weight', tokens.headingWeight, '', 400, 900, 100, (v) => updateToken('headingWeight', v))}
            </div>
          )}

          {activePanel === 'layout' && (
            <div className="te-controls-group">
              <div className="te-controls-group-header"><h4>Container Widths</h4></div>
              {sliderField('Reading Width', tokens.readingWidth, 'px', 560, 900, 10, (v) => updateToken('readingWidth', v))}
              {sliderField('Content Max Width', tokens.contentWidth, 'px', 720, 1200, 20, (v) => updateToken('contentWidth', v))}
              {sliderField('Sidebar Width', tokens.sidebarWidth, 'px', 220, 380, 10, (v) => updateToken('sidebarWidth', v))}

              <div className="te-controls-group-header" style={{ marginTop: '0.5rem' }}><h4>Spacing</h4></div>
              {sliderField('Paragraph Spacing', tokens.spaceMd, 'rem', 0.8, 2.4, 0.05, (v) => updateToken('spaceMd', v))}
              {sliderField('Heading Spacing', tokens.space2xl, 'rem', 2, 5.5, 0.1, (v) => updateToken('space2xl', v))}

              <div className="te-controls-group-header" style={{ marginTop: '0.5rem' }}><h4>Corner Radius</h4></div>
              {sliderField('Small (Pills/Icons)', tokens.radiusSm, 'px', 0, 20, 1, (v) => updateToken('radiusSm', v))}
              {sliderField('Medium (Cards/Tables)', tokens.radiusMd, 'px', 0, 24, 1, (v) => updateToken('radiusMd', v))}
              {sliderField('Large (Covers/Panels)', tokens.radiusLg, 'px', 0, 32, 1, (v) => updateToken('radiusLg', v))}
            </div>
          )}

          {activePanel === 'callouts' && (
            <div className="te-controls-group">
              <div className="te-controls-group-header"><h4>Callout Visuals</h4></div>
              <p className="te-controls-hint" style={{ marginBottom: '0.5rem' }}>
                Callout boxes automatically combine the <strong>Primary</strong>, <strong>Danger</strong>, <strong>Warning</strong>, and <strong>Info</strong> tokens with the Surface background for harmonious cards.
              </p>
              {colorField('Important (Danger)', tokens.danger, (v) => updateToken('danger', v))}
              {colorField('Exam Tip (Warning)', tokens.warning, (v) => updateToken('warning', v))}
              {colorField('Definition (Info)', tokens.info, (v) => updateToken('info', v))}
              {colorField('Generic Callout', tokens.primary, (v) => updateToken('primary', v))}
              {colorField('Example Callout', tokens.secondary, (v) => updateToken('secondary', v))}
              <div className="te-controls-group-header" style={{ marginTop: '0.5rem' }}><h4>Card Shape</h4></div>
              {sliderField('Corner Radius', tokens.radiusMd, 'px', 0, 24, 1, (v) => updateToken('radiusMd', v))}
            </div>
          )}

          {activePanel === 'tables' && (
            <div className="te-controls-group">
              <div className="te-controls-group-header"><h4>Table Styling</h4></div>
              {colorField('Header Background', tokens.primary, (v) => updateToken('primary', v))}
              {colorField('Alternate Row Color', tokens.background, (v) => updateToken('background', v))}
              {colorField('Hover Highlight', tokens.surfaceAlt, (v) => updateToken('surfaceAlt', v))}
              {colorField('Table Grid Border', tokens.border, (v) => updateToken('border', v))}
              {colorField('Outer Border', tokens.borderStrong, (v) => updateToken('borderStrong', v))}
              <div className="te-controls-group-header" style={{ marginTop: '0.5rem' }}><h4>Quotes</h4></div>
              {colorField('Quote Accent / Mark', tokens.primary, (v) => updateToken('primary', v))}
              {colorField('Quote Background', tokens.primarySoft, (v) => updateToken('primarySoft', v))}
            </div>
          )}
        </aside>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .te-loading { display: flex; align-items: center; justify-content: center; height: 100vh; color: #0f766e; }
        .te-root { height: 100vh; display: flex; flex-direction: column; background: #0d1117; color: #e6edf3; font-family: 'Inter', sans-serif; }

        .te-topbar { display: flex; align-items: center; justify-content: space-between; padding: 0.85rem 1.5rem; border-bottom: 1px solid rgba(255,255,255,0.08); flex-shrink: 0; flex-wrap: wrap; gap: 0.75rem; }
        .te-topbar-left { display: flex; align-items: center; gap: 0.85rem; }
        .te-back-btn { background: none; border: 1px solid rgba(255,255,255,0.12); border-radius: 8px; color: #8b949e; width: 34px; height: 34px; display: flex; align-items: center; justify-content: center; cursor: pointer; flex-shrink: 0; }
        .te-back-btn:hover { color: #e6edf3; border-color: rgba(255,255,255,0.25); }
        .te-topbar-title-row { display: flex; align-items: center; gap: 0.6rem; flex-wrap: wrap; }
        .te-name-input { background: none; border: none; font-size: 1.05rem; font-weight: 800; color: #e6edf3; padding: 0.15rem 0.3rem; border-radius: 6px; min-width: 120px; }
        .te-name-input:focus { outline: 1px solid #10b981; background: rgba(255,255,255,0.04); }
        .te-desc-input { display: block; background: none; border: none; font-size: 0.78rem; color: #8b949e; width: 100%; padding: 0.1rem 0.3rem; border-radius: 6px; }
        .te-desc-input:focus { outline: 1px solid #10b981; background: rgba(255,255,255,0.04); }
        .rtg-default-badge { font-size: 0.62rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.04em; background: #10b981; color: #06281c; padding: 0.15rem 0.5rem; border-radius: 4px; }
        .te-system-badge { font-size: 0.62rem; font-weight: 700; color: #8b949e; background: rgba(255,255,255,0.06); padding: 0.15rem 0.5rem; border-radius: 4px; }

        .te-topbar-right { display: flex; align-items: center; gap: 0.6rem; flex-wrap: wrap; }
        .te-viewport-toggle { display: flex; gap: 0.2rem; background: rgba(255,255,255,0.05); border-radius: 8px; padding: 0.2rem; }
        .te-viewport-btn { width: 32px; height: 30px; display: flex; align-items: center; justify-content: center; background: none; border: none; border-radius: 6px; color: #8b949e; cursor: pointer; }
        .te-viewport-btn.active { background: #10b981; color: #06281c; }
        .te-mode-toggle { display: flex; align-items: center; gap: 0.4rem; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; padding: 0.5rem 0.8rem; font-size: 0.8rem; font-weight: 700; color: #e6edf3; cursor: pointer; }
        .te-btn { display: flex; align-items: center; gap: 0.4rem; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; padding: 0.5rem 0.9rem; font-size: 0.8rem; font-weight: 700; color: #e6edf3; cursor: pointer; }
        .te-btn:hover { border-color: rgba(255,255,255,0.25); }
        .te-btn.primary { background: #10b981; border-color: #10b981; color: #06281c; }
        .te-btn.primary:hover { background: #0ea975; }
        .te-btn:disabled { opacity: 0.6; cursor: default; }

        .te-body { flex: 1; display: grid; grid-template-columns: 210px 1fr 320px; min-height: 0; }

        .te-side-nav { border-right: 1px solid rgba(255,255,255,0.08); padding: 1rem 0.75rem; display: flex; flex-direction: column; gap: 0.25rem; overflow-y: auto; }
        .te-side-nav-item { display: flex; align-items: center; gap: 0.6rem; background: none; border: none; border-radius: 8px; padding: 0.65rem 0.75rem; font-size: 0.82rem; font-weight: 600; color: #8b949e; cursor: pointer; text-align: left; }
        .te-side-nav-item:hover { background: rgba(255,255,255,0.05); color: #e6edf3; }
        .te-side-nav-item.active { background: rgba(16, 185, 129, 0.14); color: #10b981; }

        .te-preview-area { overflow: auto; padding: 2rem; display: flex; justify-content: center; align-items: flex-start; background: #05070a; }
        .te-preview-frame { max-width: 100%; transition: width 0.2s ease; }
        .te-preview-page { border-radius: 12px; box-shadow: 0 20px 50px rgba(0,0,0,0.45); overflow: hidden; min-height: 600px; transition: background 0.15s ease; }
        .te-preview-loading, .te-preview-empty { display: flex; align-items: center; justify-content: center; min-height: 400px; color: #94a3b8; padding: 2rem; text-align: center; }

        .te-controls-panel { border-left: 1px solid rgba(255,255,255,0.08); padding: 1.25rem; overflow-y: auto; display: flex; flex-direction: column; gap: 1.5rem; }
        .te-controls-group { display: flex; flex-direction: column; gap: 0.75rem; }
        .te-controls-group-header h4 { margin: 0 0 0.25rem; font-size: 0.72rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; color: #8b949e; }
        .te-controls-hint { font-size: 0.8rem; color: #8b949e; line-height: 1.5; margin: 0; }

        .te-color-field { display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; }
        .te-color-field label { font-size: 0.83rem; color: #e6edf3; }
        .te-color-input-row { display: flex; align-items: center; gap: 0.4rem; }
        .te-color-input-row input[type="color"] { width: 28px; height: 28px; border: 1px solid rgba(255,255,255,0.15); border-radius: 6px; background: none; cursor: pointer; padding: 0; }
        .te-color-hex { width: 84px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; color: #e6edf3; font-size: 0.78rem; padding: 0.3rem 0.45rem; font-family: monospace; }

        .te-select-field { display: flex; flex-direction: column; gap: 0.35rem; }
        .te-select-field label { font-size: 0.78rem; font-weight: 700; color: #8b949e; }
        .te-select-field select { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; color: #e6edf3; padding: 0.55rem 0.7rem; font-size: 0.85rem; font-family: inherit; cursor: pointer; }

        .te-slider-field { display: flex; flex-direction: column; gap: 0.35rem; }
        .te-slider-field label { display: flex; justify-content: space-between; font-size: 0.78rem; font-weight: 700; color: #8b949e; }
        .te-slider-field label span { color: #10b981; }
        .te-slider-field input[type="range"] { width: 100%; accent-color: #10b981; }

        @media (max-width: 1100px) {
          .te-body { grid-template-columns: 1fr; }
          .te-side-nav { flex-direction: row; overflow-x: auto; border-right: none; border-bottom: 1px solid rgba(255,255,255,0.08); }
          .te-controls-panel { border-left: none; border-top: 1px solid rgba(255,255,255,0.08); }
        }
      `}} />
    </div>
  );
};

export default ThemeEditor;
