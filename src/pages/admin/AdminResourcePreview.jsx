import { useEffect, useState } from 'react';
import { RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { BlockRenderer } from '../../components/book/BlockRenderer';
import { ChapterHeader } from '../../components/book/BookBlocks';
import '../../components/book/BookBlocks.css';

// Read-only content preview for the admin CMS -- reuses the same
// chapter-JSON-from-R2 + BlockRenderer pipeline SecureReader.jsx uses on
// the candidate-facing site, but deliberately skips everything tied to a
// candidate session (AuthGuard, subscription-tier locking, points, "mark
// as read"): an admin previewing a resource isn't a subscriber and
// shouldn't hit /reader/:id's login wall just to see what a document says.
const AdminResourcePreview = ({ resourceId }) => {
  const [resource, setResource] = useState(null);
  const [loading, setLoading] = useState(true);
  const [chapters, setChapters] = useState(null);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setResource(null);
    setChapters(null);
    setActiveIndex(0);

    (async () => {
      const { data } = await supabase.from('resources').select('*').eq('resource_id', resourceId).maybeSingle();
      if (!mounted) return;
      setResource(data || null);
      if (data) {
        const count = data.chapter_count || 1;
        setChapters(Array.from({ length: count }, (_, i) => ({ index: i, title: `Chapter ${i + 1}`, loaded: false })));
      }
      setLoading(false);
    })();

    return () => { mounted = false; };
  }, [resourceId]);

  useEffect(() => {
    if (!resource || !chapters || chapters[activeIndex]?.loaded) return;
    let mounted = true;

    (async () => {
      try {
        // Cache-bust -- see the matching comment in SecureReader.jsx's
        // loadChapter: this exact URL can be served stale (from a browser's
        // or Cloudflare's cache) for up to a year after a real content edit,
        // with nothing in the save path purging it.
        const chapterUrl = `${resource.storage_base_url}chapters/chapter-${activeIndex + 1}.json?t=${Date.now()}`;
        const response = await fetch(chapterUrl);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const chapterData = await response.json();
        if (!mounted) return;
        setChapters((prev) => {
          const next = [...prev];
          next[activeIndex] = {
            ...next[activeIndex],
            title: chapterData.title || `Chapter ${activeIndex + 1}`,
            body_html: chapterData.body_html || '',
            blocks: Array.isArray(chapterData.blocks) ? chapterData.blocks : null,
            loaded: true,
          };
          return next;
        });
      } catch (err) {
        if (!mounted) return;
        setChapters((prev) => {
          const next = [...prev];
          next[activeIndex] = { ...next[activeIndex], body_html: `<p>Unable to load this chapter (${err.message}).</p>`, loaded: true };
          return next;
        });
      }
    })();

    return () => { mounted = false; };
  }, [resource, chapters, activeIndex]);

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}><RefreshCw className="animate-spin" size={24} color="var(--ios-olive)" /></div>;
  }
  if (!resource) {
    return <p className="lc-muted-note" style={{ padding: '1.5rem' }}>Resource not found.</p>;
  }

  const activeChapter = chapters?.[activeIndex];
  const isBlocksFormat = resource.format === 'blocks';

  return (
    <div style={{ padding: '1.25rem 1.5rem', overflowY: 'auto', flex: 1, background: 'var(--surface)' }}>
      {chapters && chapters.length > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
          <button className="lc-btn" disabled={activeIndex === 0} onClick={() => setActiveIndex((i) => i - 1)}><ChevronLeft size={14} /></button>
          <span style={{ fontSize: '0.8rem', color: 'var(--admin-text-muted)' }}>Chapter {activeIndex + 1} of {chapters.length}</span>
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
