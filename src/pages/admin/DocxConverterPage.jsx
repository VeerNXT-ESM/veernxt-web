import { useState, useRef } from 'react';
import { UploadCloud, RefreshCw, ChevronDown, ChevronRight, Code2, Eye } from 'lucide-react';
import { BlockRenderer } from '../../components/book/BlockRenderer';
import { ChapterHeader } from '../../components/book/BookBlocks';
import '../../components/book/BookBlocks.css';

const ADMIN_SECRET = import.meta.env.VITE_ADMIN_API_SECRET;

// A deployed Vercel serverless function caps the request body around
// 4.5MB; base64 adds ~33% on top of the raw file, so anything past
// roughly 3.3MB raw won't fit. Real master book docx files run up to
// ~39MB -- this page still lets you try one (useful when testing via
// `npm run dev`, where the local Vite api-shim has no such cap, see
// vite.config.js's vercelApiPlugin), it just warns first rather than
// let a large file fail silently against the deployed admin site.
const VERCEL_SAFE_BYTES = 3.3 * 1024 * 1024;

function arrayBufferToBase64(arrayBuffer) {
  const bytes = new Uint8Array(arrayBuffer);
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

function formatBytes(n) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

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

// Try-a-real-docx page for the non-AI mechanical converter
// (scripts/lib/docxParser.mjs's parseDocxToSemanticModelNode, the same
// parser scripts/convert_docx_books_to_blocks.mjs and
// scripts/convert_docx_intros_to_blocks.mjs already use from the CLI) --
// lets the content team try a real file from the browser and see the
// resulting chapters/blocks rendered, without running a script locally.
// Preview only: the API action behind this (docx-preview-convert) never
// writes to Supabase or R2, nothing here is saved anywhere.
const DocxConverterPage = () => {
  const [file, setFile] = useState(null);
  const [converting, setConverting] = useState(false);
  const [error, setError] = useState(null);
  const [book, setBook] = useState(null);
  const [expandedChapters, setExpandedChapters] = useState(new Set());
  const [rawChapters, setRawChapters] = useState(new Set());
  const fileInputRef = useRef(null);

  const oversized = file && file.size > VERCEL_SAFE_BYTES;

  const handleFileChange = (e) => {
    const f = e.target.files?.[0];
    setFile(f || null);
    setBook(null);
    setError(null);
  };

  const handleConvert = async () => {
    if (!file) return;
    setConverting(true);
    setError(null);
    setBook(null);
    try {
      const buffer = await file.arrayBuffer();
      const res = await fetch('/api/admin/save-resource', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-api-secret': ADMIN_SECRET },
        body: JSON.stringify({
          type: 'docx-preview-convert',
          fileName: file.name,
          dataBase64: arrayBufferToBase64(buffer),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setBook(data.book);
      setExpandedChapters(new Set(data.book.chapters.length ? [data.book.chapters[0].id] : []));
    } catch (err) {
      setError(err.message);
    } finally {
      setConverting(false);
    }
  };

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

  const totalBlocks = book ? book.chapters.reduce((sum, ch) => sum + ch.blocks.length, 0) : 0;

  return (
    <div>
      <div className="lc-section-header">
        <div>
          <h2>Docx Converter</h2>
          <p className="lc-muted-note" style={{ marginTop: '0.3rem' }}>
            Try a real Guide/Precis/Intro .docx against the non-AI mechanical converter and see the resulting chapters/blocks.
            Preview only — nothing here is saved to the database or R2.
          </p>
        </div>
      </div>

      <div className="lc-card" style={{ padding: '1.25rem', marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button className="lc-btn" onClick={() => fileInputRef.current?.click()} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
            <UploadCloud size={16} /> Choose .docx file
          </button>
          <input ref={fileInputRef} type="file" accept=".docx" onChange={handleFileChange} style={{ display: 'none' }} />
          {file && (
            <span style={{ fontSize: '0.85rem', color: 'var(--admin-text-muted)' }}>
              {file.name} ({formatBytes(file.size)})
            </span>
          )}
          <button className="lc-btn primary" disabled={!file || converting} onClick={handleConvert} style={{ marginLeft: 'auto' }}>
            {converting ? 'Converting…' : 'Convert'}
          </button>
        </div>

        {oversized && (
          <div style={{ marginTop: '0.85rem', padding: '0.65rem 0.9rem', background: 'var(--admin-warn-bg, #fffbeb)', border: '1px solid #fde68a', borderRadius: 8, fontSize: '0.8rem', color: '#92400e' }}>
            This file is {formatBytes(file.size)} — larger than the deployed admin site's ~3.3MB safe limit (Vercel's serverless function body cap). It will still work right now if you're testing against the local dev server (<code>npm run dev</code>), but would fail against the live veernxt.in admin site.
          </div>
        )}

        {error && (
          <div style={{ marginTop: '0.85rem', padding: '0.65rem 0.9rem', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, fontSize: '0.8rem', color: '#b91c1c' }}>
            Conversion failed: {error}
          </div>
        )}
      </div>

      {converting && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
          <RefreshCw className="animate-spin" size={24} color="var(--admin-accent)" />
        </div>
      )}

      {book && (
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
      )}
    </div>
  );
};

export default DocxConverterPage;
