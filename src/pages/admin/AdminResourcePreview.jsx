import { useEffect, useState } from 'react';
import { RefreshCw, ChevronLeft, ChevronRight, CheckCircle2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { BlockRenderer } from '../../components/book/BlockRenderer';
import { ChapterHeader } from '../../components/book/BookBlocks';
import { ReaderThemeProvider } from '../../components/book/theme/ReaderThemeProvider';
import { useReaderTheme } from '../../components/book/theme/useReaderTheme';
import ThemeSwitcher from '../../components/book/theme/ThemeSwitcher';
import { READER_THEME_LIST } from '../../components/book/theme/readerThemeRegistry';
import '../../components/book/BookBlocks.css';

const ADMIN_SECRET = import.meta.env.VITE_ADMIN_API_SECRET;

async function fetchR2Json(url, fallbackPayload) {
  try {
    const directRes = await fetch(`${url}${url.includes('?') ? '&' : '?'}t=${Date.now()}`, { cache: 'no-store' });
    if (directRes.ok) {
      return await directRes.json();
    }
  } catch (e) {
    // Direct fetch failed (likely CORS on localhost or network), fallback to server proxy
  }

  const proxyRes = await fetch('/api/admin/save-resource', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-admin-api-secret': ADMIN_SECRET },
    body: JSON.stringify({ type: 'books-fetch-content', url, ...fallbackPayload }),
  });
  if (proxyRes.ok) {
    const proxyData = await proxyRes.json();
    if (proxyData.ok && proxyData.data) {
      return proxyData.data;
    }
    if (proxyData.error) throw new Error(proxyData.error);
  }
  throw new Error(`Failed to load content from ${url}`);
}

// Read-only content preview for the admin CMS -- reuses the same
// chapter-JSON-from-R2 + BlockRenderer pipeline SecureReader.jsx uses on
// the candidate-facing site, but deliberately skips everything tied to a
// candidate session (AuthGuard, subscription-tier locking, points, "mark
// as read"): an admin previewing a resource isn't a subscriber and
// shouldn't hit /reader/:id's login wall just to see what a document says.
const AdminResourcePreview = ({ resourceId, book: propBook }) => {
  const [resource, setResource] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [chapters, setChapters] = useState(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [savingTheme, setSavingTheme] = useState(false);
  const [themeSaved, setThemeSaved] = useState(false);

  // Persists which theme this specific resource opens with for every
  // candidate (ThemeEditor_UI.md §12-13: "apply a theme to whatever book
  // you want") -- separate from the ThemeSwitcher above the preview, which
  // only previews other themes without saving anything.
  const handleAssignTheme = async (themeId) => {
    if (!resource) return;
    setSavingTheme(true);
    setThemeSaved(false);
    try {
      const { error } = await supabase
        .from('resources')
        .update({ reader_theme_id: themeId || null })
        .eq('resource_id', resource.resourceId || resource.resource_id);
      if (error) throw error;
      setResource((prev) => ({ ...prev, reader_theme_id: themeId || null }));
      setThemeSaved(true);
      setTimeout(() => setThemeSaved(false), 2500);
    } catch (err) {
      console.error('Failed to assign reader theme:', err);
      window.alert(`Could not save the reader theme for this resource. If this is the first time, run sql/reader_themes.sql in the Supabase SQL Editor first.\n\n${err.message}`);
    } finally {
      setSavingTheme(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setLoadError(null);
    setResource(null);
    setChapters(null);
    setActiveIndex(0);

    (async () => {
      try {
        let bookData = propBook || null;

        if (!bookData && resourceId) {
          try {
            const res = await fetch('/api/admin/save-resource', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'x-admin-api-secret': ADMIN_SECRET },
              body: JSON.stringify({ type: 'books-get', resourceId }),
            });
            const data = await res.json();
            if (res.ok && data.ok) {
              bookData = data;
            }
          } catch {
            // fallback to direct supabase query
          }

          if (!bookData) {
            const { data } = await supabase.from('resources').select('*').eq('resource_id', resourceId).maybeSingle();
            bookData = data;
          }
        }

        if (!mounted) return;
        if (!bookData) {
          setLoadError('Resource not found.');
          setLoading(false);
          return;
        }

        setResource(bookData);
        const rawBase = bookData.storageBaseUrl || bookData.storage_base_url || '';
        const storageBase = rawBase ? (rawBase.endsWith('/') ? rawBase : `${rawBase}/`) : '';

        // Attempt to fetch metadata.json to get exact chapter list and titles
        let chapterList = [];
        if (storageBase) {
          try {
            const metaData = await fetchR2Json(`${storageBase}metadata.json`, {
              storageBaseUrl: storageBase,
              fileName: 'metadata.json',
              resourceId: bookData.resourceId || bookData.resource_id,
            });
            if (metaData && Array.isArray(metaData.chapters) && metaData.chapters.length > 0) {
              chapterList = metaData.chapters.map((c, i) => ({
                index: i,
                order: c.order || (i + 1),
                title: c.title || `Chapter ${c.order || i + 1}`,
                fileName: c.file_name,
                loaded: false,
              }));
            }
          } catch {
            // metadata.json is optional
          }
        }

        if (chapterList.length === 0) {
          const count = bookData.chapterCount ?? bookData.chapter_count ?? 1;
          chapterList = Array.from({ length: count }, (_, i) => ({
            index: i,
            order: i + 1,
            title: `Chapter ${i + 1}`,
            fileName: `chapters/chapter-${i + 1}.json`,
            loaded: false,
          }));
        }

        if (!mounted) return;
        setChapters(chapterList);
      } catch (err) {
        if (!mounted) return;
        setLoadError(err.message || 'Failed to load preview');
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => { mounted = false; };
  }, [resourceId, propBook]);

  useEffect(() => {
    if (!resource || !chapters || chapters[activeIndex]?.loaded) return;
    let mounted = true;

    (async () => {
      try {
        const rawBase = resource.storageBaseUrl || resource.storage_base_url || '';
        const base = rawBase ? (rawBase.endsWith('/') ? rawBase : `${rawBase}/`) : '';
        const activeChapter = chapters[activeIndex];
        const fName = activeChapter?.fileName || `chapter-${activeIndex + 1}.json`;
        const cleanName = fName.replace(/^chapters\//, '');

        // Candidate URLs to try in order
        const candidates = [
          activeChapter?.fileName ? `${base}${activeChapter.fileName}` : null,
          `${base}chapters/${cleanName}`,
          `${base}${cleanName}`,
          `${base}chapters/chapter-${activeIndex + 1}.json`,
          `${base}chapter-${activeIndex + 1}.json`,
        ].filter(Boolean);

        let chapterData = null;
        let lastErrorMsg = '';

        for (const url of [...new Set(candidates)]) {
          try {
            chapterData = await fetchR2Json(url, {
              storageBaseUrl: base,
              fileName: fName,
              resourceId: resource.resourceId || resource.resource_id,
            });
            if (chapterData) break;
          } catch (e) {
            lastErrorMsg = e.message;
          }
        }

        if (!chapterData) {
          throw new Error(lastErrorMsg || 'Failed to fetch chapter content');
        }

        if (!mounted) return;
        setChapters((prev) => {
          if (!prev) return prev;
          const next = [...prev];
          next[activeIndex] = {
            ...next[activeIndex],
            title: chapterData.title || next[activeIndex]?.title || `Chapter ${activeIndex + 1}`,
            body_html: chapterData.body_html || '',
            blocks: Array.isArray(chapterData.blocks) ? chapterData.blocks : null,
            loaded: true,
          };
          return next;
        });
      } catch (err) {
        if (!mounted) return;
        setChapters((prev) => {
          if (!prev) return prev;
          const next = [...prev];
          next[activeIndex] = {
            ...next[activeIndex],
            body_html: `<p>Unable to load this chapter (${err.message}).</p>`,
            loaded: true,
          };
          return next;
        });
      }
    })();

    return () => { mounted = false; };
  }, [resource, chapters, activeIndex]);

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}><RefreshCw className="animate-spin" size={24} color="var(--ios-olive)" /></div>;
  }
  if (loadError || !resource) {
    return <p className="lc-muted-note" style={{ padding: '1.5rem' }}>{loadError || 'Resource not found.'}</p>;
  }

  const activeChapter = chapters?.[activeIndex];
  const isBlocksFormat = resource.format === 'blocks' || (Array.isArray(activeChapter?.blocks) && activeChapter.blocks.length > 0);

  return (
    // One shared provider for both the switcher and the previewed content
    // below -- they must be the same context instance, or picking a theme
    // in the switcher would have nothing to actually apply to.
    // persist=false: switching themes here previews other options without
    // overwriting the admin's own candidate-mode reading preference, which
    // lives in the same browser's localStorage under the same key.
    <ReaderThemeProvider
      theme={resource.reader_theme_id || resource.readerThemeId || undefined}
      persist={false}
      style={{ padding: '1.25rem 1.5rem', overflowY: 'auto', flex: 1, background: 'var(--surface)' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        {chapters && chapters.length > 1 ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button className="lc-btn" disabled={activeIndex === 0} onClick={() => setActiveIndex((i) => i - 1)}><ChevronLeft size={14} /></button>
            <span style={{ fontSize: '0.8rem', color: 'var(--admin-text-muted)' }}>Chapter {activeIndex + 1} of {chapters.length}: {activeChapter?.title}</span>
            <button className="lc-btn" disabled={activeIndex === chapters.length - 1} onClick={() => setActiveIndex((i) => i + 1)}><ChevronRight size={14} /></button>
          </div>
        ) : <span />}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.1rem', flexWrap: 'wrap' }}>
          <AssignedThemeControl
            resource={resource}
            onAssign={handleAssignTheme}
            savingTheme={savingTheme}
            themeSaved={themeSaved}
          />
          <span style={{ fontSize: '0.72rem', color: 'var(--admin-text-muted)' }}>Preview:</span>
          <ThemeSwitcher />
        </div>
      </div>

      {!activeChapter?.loaded ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}><RefreshCw className="animate-spin" size={24} color="var(--ios-olive)" /></div>
      ) : (
        // BookBlocks.css's own token fallbacks are all light-page values, but
        // this admin CMS's own chrome around it is dark (--surface: #141a21)
        // -- the provider above gives this preview its own real light-theme
        // token scope (matching the candidate reader, not a fake white box
        // wrapper) so admin preview == real reader.
        <div style={{ background: 'var(--reader-surface)', borderRadius: '12px', border: '1px solid var(--reader-border)', padding: '2rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)' }}>
          {isBlocksFormat ? (
            <>
              <ChapterHeader title={activeChapter?.title} order={activeIndex + 1} />
              <div className="bk-blocks-container">
                {(activeChapter?.blocks || []).map((block) => <BlockRenderer key={block.id} block={block} />)}
              </div>
            </>
          ) : (
            <div dangerouslySetInnerHTML={{ __html: activeChapter?.body_html || '' }} />
          )}
        </div>
      )}
    </ReaderThemeProvider>
  );
};

// Lives inside ReaderThemeProvider (unlike the parent component) so
// picking a theme here can call setThemeId for instant visual feedback,
// alongside onAssign's real DB write -- the dropdown doesn't wait for the
// round-trip to reflect the choice.
function AssignedThemeControl({ resource, onAssign, savingTheme, themeSaved }) {
  const { setThemeId } = useReaderTheme();
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.78rem', color: 'var(--admin-text-muted)' }}>
      Assigned Theme
      <select
        value={resource.reader_theme_id || ''}
        onChange={(e) => {
          const id = e.target.value;
          setThemeId(id || 'academic');
          onAssign(id);
        }}
        disabled={savingTheme}
        style={{ padding: '0.35rem 0.5rem', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--admin-text)', fontSize: '0.8rem', fontWeight: 600 }}
      >
        <option value="">Candidate's own preference</option>
        {READER_THEME_LIST.map((t) => (
          <option key={t.id} value={t.id}>{t.name}</option>
        ))}
      </select>
      {savingTheme && <RefreshCw size={13} className="animate-spin" />}
      {themeSaved && <CheckCircle2 size={13} color="#16a34a" />}
    </label>
  );
}

export default AdminResourcePreview;
