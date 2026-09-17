import { useEffect, useState } from 'react';
import { RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { BlockRenderer } from '../../components/book/BlockRenderer';
import { ChapterHeader } from '../../components/book/BookBlocks';
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
    <div style={{ padding: '1.25rem 1.5rem', overflowY: 'auto', flex: 1, background: 'var(--surface)' }}>
      {chapters && chapters.length > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
          <button className="lc-btn" disabled={activeIndex === 0} onClick={() => setActiveIndex((i) => i - 1)}><ChevronLeft size={14} /></button>
          <span style={{ fontSize: '0.8rem', color: 'var(--admin-text-muted)' }}>Chapter {activeIndex + 1} of {chapters.length}: {activeChapter?.title}</span>
          <button className="lc-btn" disabled={activeIndex === chapters.length - 1} onClick={() => setActiveIndex((i) => i + 1)}><ChevronRight size={14} /></button>
        </div>
      )}

      {!activeChapter?.loaded ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}><RefreshCw className="animate-spin" size={24} color="var(--ios-olive)" /></div>
      ) : (
        // BookBlocks.css / the raw body_html both hardcode dark, light-page-only
        // text/background colors (shared with the candidate-facing reader, which
        // IS on a light page) -- so on this admin CMS's dark drawer (--surface:
        // #141a21) that text rendered near-black-on-near-black, unreadable except
        // for the browser's own text-selection highlight. Give it the light
        // "paper" it was designed for, same as the manual/draft preview paths in
        // ExamIntroCard.jsx already do with their own .reader-card wrapper.
        <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '2rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)' }}>
          {isBlocksFormat ? (
            <>
              <ChapterHeader title={activeChapter?.title} order={activeIndex + 1} />
              <div className="bk-blocks-container">
                {(activeChapter?.blocks || []).map((block) => <BlockRenderer key={block.id} block={block} />)}
              </div>
            </>
          ) : (
            <div style={{ color: '#1e293b' }} dangerouslySetInnerHTML={{ __html: activeChapter?.body_html || '' }} />
          )}
        </div>
      )}
    </div>
  );
};

export default AdminResourcePreview;
