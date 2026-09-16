import { useState } from 'react';
import { ChevronDown, ChevronRight, Code2, Eye } from 'lucide-react';
import { BlockRenderer } from '../../components/book/BlockRenderer';
import { ChapterHeader } from '../../components/book/BookBlocks';
import '../../components/book/BookBlocks.css';

const BLOCK_TYPE_COLORS = {
  heading: '#0f766e',
  paragraph: '#64748b',
  table: '#b45309',
  list: '#7c3aed',
  numberedList: '#7c3aed',
  callout: '#0369a1',
  important: '#dc2626',
  examTip: '#a16207',
  definition: '#0f766e',
  example: '#475569',
};

// Renders a converted { title, chapters: [{ id, order, title, blocks }] }
// "book" -- shared by PublishContentPage.jsx's preview-then-publish flow
// for all three categories (Intro/Guide/Precis).
//
// Callers must remount this on every new conversion (e.g. `<DocxPreview
// key={conversionId} book={book} />`, bumping conversionId each time a
// convert succeeds) rather than relying on an effect to reset
// expanded/raw state when `book` changes -- avoids a synchronous setState
// in an effect body (react-hooks/set-state-in-effect) for what's really
// just per-mount initial state.
export const DocxPreview = ({ book }) => {
  const [expandedChapters, setExpandedChapters] = useState(() => new Set(book.chapters.length ? [book.chapters[0].id] : []));
  const [rawChapters, setRawChapters] = useState(() => new Set());

  const toggleChapter = (id) => {
    setExpandedChapters((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleRaw = (id) => {
    setRawChapters((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const totalBlocks = book.chapters.reduce((sum, ch) => sum + ch.blocks.length, 0);

  return (
    <>
      <div className="lc-card" style={{ padding: '1rem 1.25rem', marginBottom: '1rem', display: 'flex', gap: '1.5rem', flexWrap: 'wrap', fontSize: '0.85rem' }}>
        <span><strong>{book.title}</strong></span>
        <span className="lc-muted-note">{book.chapters.length} chapter{book.chapters.length === 1 ? '' : 's'}</span>
        <span className="lc-muted-note">{totalBlocks} block{totalBlocks === 1 ? '' : 's'} total</span>
      </div>

      {book.chapters.length === 0 && (
        <div className="lc-empty-state"><p>No chapters detected — this docx may not use Word's Heading 1 style for section breaks.</p></div>
      )}

      {book.chapters.map((ch) => {
        const isOpen = expandedChapters.has(ch.id);
        const isRaw = rawChapters.has(ch.id);
        const typeCounts = {};
        for (const b of ch.blocks) typeCounts[b.type] = (typeCounts[b.type] || 0) + 1;

        return (
          <div key={ch.id} className="lc-card" style={{ marginBottom: '0.75rem', overflow: 'hidden' }}>
            <div
              onClick={() => toggleChapter(ch.id)}
              style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.85rem 1.1rem', cursor: 'pointer' }}
            >
              {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              <strong style={{ fontSize: '0.9rem' }}>{ch.order}. {ch.title}</strong>
              <span className="lc-muted-note" style={{ fontSize: '0.78rem' }}>{ch.blocks.length} blocks</span>
              <div style={{ display: 'flex', gap: '0.35rem', marginLeft: '0.5rem', flexWrap: 'wrap' }}>
                {Object.entries(typeCounts).map(([type, count]) => (
                  <span key={type} style={{ fontSize: '0.68rem', fontWeight: 700, padding: '0.1rem 0.4rem', borderRadius: 4, color: 'white', background: BLOCK_TYPE_COLORS[type] || '#64748b' }}>
                    {type} {count}
                  </span>
                ))}
              </div>
              <button
                className="lc-icon-btn"
                title={isRaw ? 'Show rendered preview' : 'Show raw JSON'}
                onClick={(e) => { e.stopPropagation(); toggleRaw(ch.id); }}
                style={{ marginLeft: 'auto' }}
              >
                {isRaw ? <Eye size={14} /> : <Code2 size={14} />}
              </button>
            </div>

            {isOpen && (
              <div style={{ borderTop: '1px solid var(--border)', padding: '1.25rem' }}>
                {isRaw ? (
                  <pre style={{ fontSize: '0.75rem', background: '#0f172a', color: '#e2e8f0', padding: '1rem', borderRadius: 8, overflowX: 'auto', maxHeight: 500, overflowY: 'auto' }}>
                    {JSON.stringify(ch, null, 2)}
                  </pre>
                ) : (
                  <div style={{ background: '#ffffff', borderRadius: 12, border: '1px solid #e2e8f0', padding: '2rem' }}>
                    <ChapterHeader title={ch.title} order={ch.order} />
                    <div className="bk-blocks-container">
                      {ch.blocks.map((block) => <BlockRenderer key={block.id} block={block} />)}
                    </div>
                    {ch.blocks.length === 0 && <p style={{ color: '#94a3b8' }}>This chapter has no blocks.</p>}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </>
  );
};
