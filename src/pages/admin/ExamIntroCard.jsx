import { useState, useEffect } from 'react';
import mammoth from 'mammoth';
import { FileText, Upload, X, Eye } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import AdminResourcePreview from './AdminResourcePreview';

/**
 * Rail card for the exam's Introduction (lc_exam_intro) — self-contained,
 * fetches its own data by examId rather than depending on the editor
 * panel's internal state, same pattern ExamStatusCard uses so this keeps
 * working while the editor is mid-load.
 *
 * Uploading a .docx just converts it straight to HTML (headings, lists,
 * tables, quotes, embedded images all come along as normal HTML/base64
 * images) and stores that HTML directly on lc_exam_intro as manual_body.
 * There's no chapter/AI pipeline here — that machinery is for Guide/Precis
 * books, Introduction is a single simple document. The saved Introduction
 * is shown with the same reading styles as the candidate-facing reader, and
 * clicking its title opens it in a preview drawer.
 *
 * A handful of exams may still have an older, resource-linked Introduction
 * (source: 'auto') from before — that display path is kept as-is so those
 * keep working, but new uploads always save as plain HTML (source: 'manual').
 *
 * "Remove" only clears this card's own lc_exam_intro slot (back to
 * 'unset') — it never touches anything added separately via "Add
 * Resource" (lc_exam_resource_map), so that stays exactly as it was. When
 * there's no dedicated Introduction (never set, or just removed) and this
 * exam does have an "Intro" category resource linked via Add Resource,
 * that's shown here too — it's what the candidate-facing page falls back
 * to (useExamContent.js), so this card mirrors that instead of just
 * saying "no intro" while one is actually still showing live.
 */
const ExamIntroCard = ({ examId }) => {
  const [examIntro, setExamIntro] = useState(null); // lc_exam_intro row, or null if none exists yet
  const [introResourceTitle, setIntroResourceTitle] = useState(null); // joined from resources when auto-populated (legacy)
  const [editing, setEditing] = useState(false);
  const [introTitleDraft, setIntroTitleDraft] = useState('');
  const [introSaving, setIntroSaving] = useState(false);
  const [introPreviewOpen, setIntroPreviewOpen] = useState(false);
  const [pendingPreviewOpen, setPendingPreviewOpen] = useState(false);
  const [introFileName, setIntroFileName] = useState(null); // name of the .docx last converted, for display
  const [pendingHtml, setPendingHtml] = useState(null); // HTML string from the last converted docx, awaiting Save
  const [parsingDocx, setParsingDocx] = useState(false);
  const [docxError, setDocxError] = useState(null);
  const [fallbackResource, setFallbackResource] = useState(null); // "Intro" category resource from Add Resource, shown only when there's no dedicated Introduction

  useEffect(() => {
    setIntroPreviewOpen(false);
    if (!examId) {
      setExamIntro(null);
      setIntroResourceTitle(null);
      setFallbackResource(null);
      setEditing(false);
      setIntroTitleDraft('');
      resetUpload();
      return;
    }
    fetchIntro(examId);
  }, [examId]);

  const fetchIntro = async (id) => {
    const { data: intro } = await supabase.from('lc_exam_intro').select('*').eq('exam_id', id).maybeSingle();
    setExamIntro(intro || null);
    setEditing(!intro || intro.source === 'unset');
    setIntroTitleDraft(intro?.manual_title || '');
    if (intro?.resource_id) {
      const { data: resource } = await supabase.from('resources').select('title').eq('resource_id', intro.resource_id).maybeSingle();
      setIntroResourceTitle(resource?.title || null);
    } else {
      setIntroResourceTitle(null);
    }

    if (!intro || intro.source === 'unset') {
      const { data: mapRows } = await supabase
        .from('lc_exam_resource_map')
        .select('resource_id')
        .eq('exam_id', id)
        .eq('category', 'Intro')
        .limit(1);
      const fallbackId = mapRows?.[0]?.resource_id;
      if (fallbackId) {
        const { data: resource } = await supabase.from('resources').select('resource_id, title').eq('resource_id', fallbackId).maybeSingle();
        setFallbackResource(resource || null);
      } else {
        setFallbackResource(null);
      }
    } else {
      setFallbackResource(null);
    }
  };

  const resetUpload = () => {
    setIntroFileName(null);
    setPendingHtml(null);
    setDocxError(null);
  };

  const cancelEditing = () => {
    setEditing(false);
    setIntroTitleDraft(examIntro?.manual_title || '');
    resetUpload();
  };

  // Clears this exam's dedicated Introduction slot only (lc_exam_intro).
  // Anything added separately via "Add Resource" (lc_exam_resource_map)
  // lives in a different table entirely and is never touched by this —
  // removing the Introduction here has no effect on it either way.
  const removeIntro = async () => {
    if (!examId) return;
    if (!window.confirm('Remove this Introduction? This only clears the dedicated Introduction slot — any separate resource added via "Add Resource" is untouched and stays as it is.')) return;
    setIntroSaving(true);
    setDocxError(null);
    try {
      const payload = {
        exam_id: examId,
        resource_id: null,
        manual_title: null,
        manual_body: null,
        source: 'unset',
        updated_at: new Date().toISOString(),
      };
      const { error } = await supabase.from('lc_exam_intro').upsert(payload, { onConflict: 'exam_id' });
      if (error) throw error;

      resetUpload();
      await fetchIntro(examId);
    } catch (err) {
      setDocxError('Failed to remove Introduction: ' + err.message);
    } finally {
      setIntroSaving(false);
    }
  };

  // Straight docx -> HTML conversion. No chapter splitting, no block
  // classification, no AI enrichment — just headings/lists/quotes/tables
  // and embedded images carried over as-is (images come back as inline
  // base64 <img> tags, so they render immediately, no separate upload step).
  const handleDocxFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setDocxError(null);
    setParsingDocx(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.convertToHtml({ arrayBuffer }, {
        styleMap: [
          "p[style-name='Heading 1'] => h1:fresh",
          "p[style-name='Heading 2'] => h2:fresh",
          "p[style-name='Heading 3'] => h3:fresh",
          "p[style-name='Title'] => h1:fresh",
          "p[style-name='Subtitle'] => h2:fresh",
          "p[style-name='Quote'] => blockquote:fresh",
          "p[style-name='Intense Quote'] => blockquote:fresh",
        ],
        convertImage: mammoth.images.imgElement((image) =>
          image.read('base64').then((imageBuffer) => ({
            src: `data:${image.contentType};base64,${imageBuffer}`,
          }))
        ),
      });
      const html = result.value;
      if (!html || !html.trim()) throw new Error('No readable content found in that document.');

      const headingMatch = html.match(/<h[12][^>]*>(.*?)<\/h[12]>/i);
      const derivedTitle = (headingMatch ? headingMatch[1].replace(/<[^>]+>/g, '') : '').trim()
        || file.name.replace(/\.[^/.]+$/, '').replace(/[_-]+/g, ' ').trim();

      setIntroTitleDraft(derivedTitle);
      setPendingHtml(html);
      setIntroFileName(file.name);
    } catch (err) {
      setDocxError('Could not read that file: ' + err.message);
    } finally {
      setParsingDocx(false);
      e.target.value = ''; // allow re-selecting the same file
    }
  };

  // Saves the converted HTML straight onto lc_exam_intro — no resource,
  // no R2 upload, nothing else involved.
  const saveIntro = async () => {
    if (!examId || !pendingHtml) return;
    setIntroSaving(true);
    setDocxError(null);
    try {
      const payload = {
        exam_id: examId,
        resource_id: null,
        manual_title: introTitleDraft.trim() || 'Introduction',
        manual_body: pendingHtml,
        source: 'manual',
        updated_at: new Date().toISOString(),
      };
      const { error } = await supabase.from('lc_exam_intro').upsert(payload, { onConflict: 'exam_id' });
      if (error) throw error;

      resetUpload();
      await fetchIntro(examId);
    } catch (err) {
      setDocxError('Failed to save Introduction: ' + err.message);
    } finally {
      setIntroSaving(false);
    }
  };

  return (
    <div className="lc-card">
      <h3>Introduction</h3>
      {!examId ? (
        <span className="lc-muted-note">Save the exam first — an Introduction slot is created automatically.</span>
      ) : (examIntro?.source === 'auto' && examIntro?.resource_id && !editing) ? (
        <div>
          <p
            onClick={() => setIntroPreviewOpen(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0 0 0.75rem', cursor: 'pointer' }}
            title="Click to open"
          >
            <FileText size={15} color="var(--ios-olive)" /> {introResourceTitle || 'Untitled resource'}
          </p>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="lc-btn" onClick={() => setIntroPreviewOpen(true)}><Eye size={14} /> Preview</button>
            <button className="lc-btn" onClick={() => setEditing(true)}>Replace Document</button>
            <button className="lc-btn" style={{ color: '#dc2626' }} disabled={introSaving} onClick={removeIntro}>Remove</button>
          </div>
        </div>
      ) : examIntro?.source === 'manual' && !editing ? (
        <div>
          <p
            onClick={() => setIntroPreviewOpen(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0 0 0.75rem', cursor: 'pointer' }}
            title="Click to open"
          >
            <FileText size={15} color="var(--ios-olive)" /> {examIntro.manual_title || 'Introduction'}
          </p>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="lc-btn" onClick={() => setIntroPreviewOpen(true)}><Eye size={14} /> Preview</button>
            <button className="lc-btn" onClick={() => setEditing(true)}>Replace Document</button>
            <button className="lc-btn" style={{ color: '#dc2626' }} disabled={introSaving} onClick={removeIntro}>Remove</button>
          </div>
        </div>
      ) : (
        <div>
          {fallbackResource ? (
            <div style={{ marginBottom: '1rem' }}>
              <p className="lc-muted-note" style={{ marginTop: 0, marginBottom: '0.5rem' }}>
                No dedicated Introduction set — this exam currently falls back to this resource added via Add Resource:
              </p>
              <p
                onClick={() => setIntroPreviewOpen(true)}
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0 0 0.75rem', cursor: 'pointer' }}
                title="Click to open"
              >
                <FileText size={15} color="var(--ios-olive)" /> {fallbackResource.title || 'Untitled resource'}
              </p>
            </div>
          ) : (
            examIntro?.source === 'unset' && <p className="lc-muted-note" style={{ marginTop: 0 }}>No Intro document found for this exam yet — upload one below.</p>
          )}

          <div className="lc-input-group">
            <label>Upload Introduction (.docx)</label>
            <label
              className="lc-btn"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', cursor: parsingDocx ? 'not-allowed' : 'pointer', opacity: parsingDocx ? 0.6 : 1 }}
            >
              <Upload size={14} />
              {parsingDocx ? 'Reading document…' : introFileName ? 'Choose a different file' : 'Choose .docx file'}
              <input
                type="file"
                accept=".docx"
                onChange={handleDocxFile}
                disabled={parsingDocx || introSaving}
                style={{ display: 'none' }}
              />
            </label>
            {introFileName && !docxError && (
              <span className="lc-muted-note" style={{ display: 'block', marginTop: '0.4rem' }}>
                Converted {introFileName} — review the title below, then save.
              </span>
            )}
            {docxError && <span className="lc-muted-note" style={{ display: 'block', marginTop: '0.4rem', color: '#dc2626' }}>{docxError}</span>}
          </div>

          {pendingHtml && (
            <div className="lc-input-group">
              <label>Title</label>
              <input type="text" value={introTitleDraft} onChange={(e) => setIntroTitleDraft(e.target.value)} placeholder="Introduction title" />
            </div>
          )}

          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button
              className="lc-btn primary"
              disabled={introSaving || parsingDocx || !pendingHtml}
              onClick={saveIntro}
            >
              {introSaving ? 'Saving…' : 'Save Introduction'}
            </button>
            {pendingHtml && (
              <button
                type="button"
                className="lc-btn"
                onClick={() => setPendingPreviewOpen(true)}
              >
                <Eye size={14} /> Preview
              </button>
            )}
            {examIntro?.source && examIntro.source !== 'unset' && <button className="lc-btn" onClick={cancelEditing}>Cancel</button>}
          </div>
        </div>
      )}

      {introPreviewOpen && examIntro?.source === 'auto' && examIntro?.resource_id && (
        <div className="lc-drawer-backdrop" onClick={() => setIntroPreviewOpen(false)}>
          <div className="lc-drawer-panel" style={{ width: 'min(900px, 92vw)', height: '85vh', display: 'flex', flexDirection: 'column' }} onClick={(e) => e.stopPropagation()}>
            <div className="lc-drawer-header">
              <div><h3>Introduction Preview</h3><p>{introResourceTitle || 'Untitled resource'}</p></div>
              <button className="lc-close-btn" onClick={() => setIntroPreviewOpen(false)}><X size={20} /></button>
            </div>
            <AdminResourcePreview resourceId={examIntro.resource_id} />
          </div>
        </div>
      )}

      {introPreviewOpen && (!examIntro || examIntro.source === 'unset') && fallbackResource && (
        <div className="lc-drawer-backdrop" onClick={() => setIntroPreviewOpen(false)}>
          <div className="lc-drawer-panel" style={{ width: 'min(900px, 92vw)', height: '85vh', display: 'flex', flexDirection: 'column' }} onClick={(e) => e.stopPropagation()}>
            <div className="lc-drawer-header">
              <div><h3>Introduction Preview</h3><p>{fallbackResource.title || 'Untitled resource'} (from Add Resource)</p></div>
              <button className="lc-close-btn" onClick={() => setIntroPreviewOpen(false)}><X size={20} /></button>
            </div>
            <AdminResourcePreview resourceId={fallbackResource.resource_id} />
          </div>
        </div>
      )}

      {introPreviewOpen && examIntro?.source === 'manual' && (
        <div className="lc-drawer-backdrop" onClick={() => setIntroPreviewOpen(false)}>
          <div className="lc-drawer-panel" style={{ width: 'min(900px, 92vw)', height: '85vh', display: 'flex', flexDirection: 'column' }} onClick={(e) => e.stopPropagation()}>
            <div className="lc-drawer-header">
              <div><h3>Introduction Preview</h3><p>{examIntro.manual_title || 'Introduction'}</p></div>
              <button className="lc-close-btn" onClick={() => setIntroPreviewOpen(false)}><X size={20} /></button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '2rem' }}>
              <div className="glass-panel reader-card">
                <div className="reader-content" dangerouslySetInnerHTML={{ __html: examIntro.manual_body || '' }} />
              </div>
            </div>
          </div>
        </div>
      )}

      {pendingPreviewOpen && pendingHtml && (
        <div className="lc-drawer-backdrop" onClick={() => setPendingPreviewOpen(false)}>
          <div className="lc-drawer-panel" style={{ width: 'min(900px, 92vw)', height: '85vh', display: 'flex', flexDirection: 'column' }} onClick={(e) => e.stopPropagation()}>
            <div className="lc-drawer-header">
              <div>
                <h3>Introduction Preview (Draft)</h3>
                <p>{introTitleDraft || introFileName || 'Introduction'}</p>
              </div>
              <button className="lc-close-btn" onClick={() => setPendingPreviewOpen(false)}><X size={20} /></button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '2rem' }}>
              <div className="glass-panel reader-card">
                <div className="reader-content" dangerouslySetInnerHTML={{ __html: pendingHtml }} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Same reading styles the candidate-facing reader uses, scoped to this card's preview drawer only. */}
      <style dangerouslySetInnerHTML={{ __html: `
        .reader-card {
          padding: 3rem 3.5rem;
          background: #ffffff;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);
          border-radius: 12px;
          border: 1px solid #e2e8f0;
          min-width: 0;
          overflow-wrap: break-word;
          word-wrap: break-word;
        }
        .reader-content {
          font-family: 'Merriweather', serif;
          line-height: 1.8;
          font-size: 1.1rem;
          color: #1e293b;
        }
        .reader-content h1, .reader-content h2, .reader-content h3, .reader-content h4 {
          font-family: 'Inter', sans-serif;
          color: var(--ios-olive);
          font-weight: 700;
          letter-spacing: -0.02em;
          margin-top: 2.5rem;
          margin-bottom: 1.25rem;
          line-height: 1.3;
        }
        .reader-content h1 { font-size: 2.25rem; border-bottom: 1px solid #e2e8f0; padding-bottom: 0.5rem; }
        .reader-content h2 { font-size: 1.75rem; }
        .reader-content h3 { font-size: 1.4rem; }
        .reader-content p { margin-bottom: 1.5rem; }
        .reader-content > p:first-of-type::first-letter {
          float: left;
          font-size: 4.5rem;
          line-height: 0.8;
          padding-top: 4px;
          padding-right: 8px;
          padding-left: 3px;
          font-family: 'Inter', sans-serif;
          font-weight: 800;
          color: var(--ios-olive);
        }
        .reader-content blockquote {
          margin: 2.5rem 0;
          padding: 1.5rem 2rem;
          background: #f8fafc;
          border-left: 4px solid var(--ios-olive);
          border-radius: 0 8px 8px 0;
          font-style: italic;
          color: #334155;
          font-size: 1.25rem;
          line-height: 1.6;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.02);
        }
        .reader-content blockquote p:last-child { margin-bottom: 0; }
        .reader-content p strong:first-child { color: var(--ios-olive); }
        .reader-content ul, .reader-content ol {
          margin-bottom: 1.5rem;
          padding-left: 1.5rem;
        }
        .reader-content li { margin-bottom: 0.5rem; }
        .reader-content li::marker { color: var(--ios-olive); font-weight: 600; }
        .reader-content code {
          background: #f1f5f9;
          padding: 0.2rem 0.4rem;
          border-radius: 4px;
          font-family: monospace;
          font-size: 0.9em;
          color: #ef4444;
        }
        .reader-content img {
          max-width: 100%;
          width: 100%;
          margin: 2.5rem 0;
          height: auto;
          border-radius: 12px;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.08);
          display: block;
        }
        .reader-content img + p > em {
          display: block;
          text-align: center;
          font-size: 0.9rem;
          color: #64748b;
          margin-top: -1.5rem;
          margin-bottom: 2.5rem;
        }
        .reader-content table {
          width: 100%;
          border-collapse: separate;
          border-spacing: 0;
          font-family: 'Inter', sans-serif;
          font-size: 0.95rem;
          margin: 2rem 0;
          box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
          border-radius: 12px;
          border: 1px solid #e2e8f0;
          overflow: hidden;
        }
        .reader-content th, .reader-content td {
          padding: 1rem 1.25rem;
          text-align: left;
          border-bottom: 1px solid #e2e8f0;
          border-right: 1px solid #e2e8f0;
        }
        .reader-content th:last-child, .reader-content td:last-child { border-right: none; }
        .reader-content tr:last-child td { border-bottom: none; }
        .reader-content th { background-color: #f8fafc; font-weight: 600; color: #334155; }
        .reader-content tr:nth-child(even) td { background-color: #fcfcfd; }
      `}} />
    </div>
  );
};

export default ExamIntroCard;
