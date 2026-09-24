import { useRef, useState } from 'react';
import { Upload, RefreshCw, CheckCircle2, XCircle, Image as ImageIcon } from 'lucide-react';
import { uploadFilesToR2 } from '../../lib/r2Uploader';
import { resizeToWebp } from '../../lib/imageResize';

/**
 * Thumbnail preview + Upload/Replace button, shared by the Categories and
 * Subjects admin pages. The chosen file is cropped to width x height, uploaded
 * to R2 under `${keyPrefix}/${slug}-<timestamp>.webp`, and onSave(url)
 * persists the URL on the owning row.
 */
const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

export default function ThumbnailCell({ url, name, keyPrefix, width, height, previewWidth, onSave }) {
  const [uploading, setUploading] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const inputRef = useRef(null);

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploading(true);
    setFeedback(null);
    try {
      const blob = await resizeToWebp(file, width, height);
      const urls = await uploadFilesToR2([{ key: `${keyPrefix}/${slugify(name)}-${Date.now()}.webp`, body: blob, contentType: 'image/webp' }]);
      await onSave(Object.values(urls)[0]);
      setFeedback('ok');
    } catch (err) {
      console.error('Thumbnail upload failed:', err);
      setErrorMsg(err.message || 'Unknown error');
      setFeedback('error');
    } finally {
      setUploading(false);
      setTimeout(() => setFeedback(null), 6000);
    }
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
      <div
        style={{
          width: previewWidth, aspectRatio: `${width} / ${height}`, borderRadius: '8px', overflow: 'hidden', flexShrink: 0,
          border: '1px solid var(--border, #e2e8f0)', background: '#f1f5f9',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        {url ? <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <ImageIcon size={20} color="#cbd5e1" />}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', alignItems: 'flex-start' }}>
        <input ref={inputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileChange} />
        <button
          type="button"
          className="lc-btn"
          style={{ fontSize: '0.75rem', padding: '0.35rem 0.7rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? <RefreshCw size={12} className="animate-spin" /> : <Upload size={12} />}
          {uploading ? 'Uploading…' : url ? 'Replace' : 'Upload'}
        </button>
        {feedback === 'ok' && <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.7rem', color: '#16a34a' }}><CheckCircle2 size={12} /> Saved</span>}
        {feedback === 'error' && (
          <span title={errorMsg} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.7rem', color: '#ef4444', maxWidth: '160px' }}>
            <XCircle size={12} style={{ flexShrink: 0 }} /> {errorMsg || 'Failed'}
          </span>
        )}
      </div>
    </div>
  );
}
