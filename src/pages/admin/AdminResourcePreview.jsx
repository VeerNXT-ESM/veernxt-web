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
  const [chapterLoading, setChapterLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setResource(null);
    setChapters(null);
    setActiveIndex(0);

    (async () => {
      const { data } = await supabase.from('resources_v2').select('*').eq('resource_id', resourceId).maybeSingle();
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
    setChapterLoading(true);

    (async () => {
      try {
        const chapterUrl = `${resource.storage_base_url}chapters/chapter-${activeIndex + 1}.json`;
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
      } finally {
        if (mounted) setChapterLoading(false);
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
    <div style={{ padding: '1.25rem 1.5rem', overflowY: 'auto', flex: 1 }}>
      {chapters && chapters.length > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
          <button className="lc-btn" disabled={activeIndex === 0} onClick={() => setActiveIndex((i) => i - 1)}><ChevronLeft size={14} /></button>
          <span style={{ fontSize: '0.8rem', color: 'var(--admin-text-muted)' }}>Chapter {activeIndex + 1} of {chapters.length}</span>
          <button className="lc-btn" disabled={activeIndex === chapters.length - 1} onClick={() => setActiveIndex((i) => i + 1)}><ChevronRight size={14} /></button>
        </div>
      )}

      {chapterLoading && !activeChapter?.loaded ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}><RefreshCw className="animate-spin" size={24} color="var(--ios-olive)" /></div>
      ) : isBlocksFormat ? (
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
  );
};

export default AdminResourcePreview;
