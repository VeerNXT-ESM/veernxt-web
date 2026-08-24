import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { uploadFilesToR2 } from '../../lib/r2Uploader';
import { useDebounced } from './lcShared';
import { Search, Landmark, Upload, RefreshCw, CheckCircle2, XCircle } from 'lucide-react';

// Manual logo replacements land under a distinct R2 prefix (not
// exam-logos/, which scripts/upload_logos_to_r2.mjs owns and could
// otherwise overwrite/re-derive from exam-logos/manifest.json on a future
// re-run) — keeps "the admin swapped this in by hand" and "the bulk-mapped
// default" from colliding.
function r2KeyFor(bodyId, file) {
  const ext = (file.name.split('.').pop() || 'png').toLowerCase();
  return `exam-logos/manual/${bodyId}-${Date.now()}.${ext}`;
}

function LogoCell({ body, onReplaced }) {
  const [uploading, setUploading] = useState(false);
  const [feedback, setFeedback] = useState(null); // 'ok' | 'error' | null
  const [errorMsg, setErrorMsg] = useState('');
  const inputRef = useRef(null);

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-selecting the same file later
    if (!file) return;
    setUploading(true);
    setFeedback(null);
    try {
      const urls = await uploadFilesToR2([{ key: r2KeyFor(body.id, file), body: file, contentType: file.type || 'image/png' }]);
      const url = Object.values(urls)[0];
      const { error } = await supabase.from('lc_conducting_bodies').update({ logo_path: url }).eq('id', body.id);
      if (error) throw error;
      onReplaced(body.id, url);
      setFeedback('ok');
    } catch (err) {
      console.error('Logo replace failed:', err);
      setErrorMsg(err.message || 'Unknown error');
      setFeedback('error');
    } finally {
      setUploading(false);
      setTimeout(() => setFeedback(null), 6000);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.6rem' }}>
      <div
        style={{
          width: '96px', height: '96px', borderRadius: 'var(--radius-md, 10px)',
          border: '1px solid var(--border, #e2e8f0)', background: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
        }}
      >
        {body.logo_path ? (
          <img src={body.logo_path} alt="" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
        ) : (
          <Landmark size={28} color="#cbd5e1" />
        )}
      </div>
      <input ref={inputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileChange} />
      <button
        type="button"
        className="lc-btn"
        style={{ fontSize: '0.75rem', padding: '0.35rem 0.7rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
      >
        {uploading ? <RefreshCw size={12} className="animate-spin" /> : <Upload size={12} />}
        {uploading ? 'Uploading…' : body.logo_path ? 'Replace' : 'Upload'}
      </button>
      {feedback === 'ok' && <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.7rem', color: '#16a34a' }}><CheckCircle2 size={12} /> Saved</span>}
      {feedback === 'error' && (
        <span title={errorMsg} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.7rem', color: '#ef4444', textAlign: 'center', maxWidth: '140px' }}>
          <XCircle size={12} style={{ flexShrink: 0 }} /> {errorMsg || 'Failed'}
        </span>
      )}
    </div>
  );
}

const ConductingBodiesPage = () => {
  const [bodies, setBodies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounced(search);
  const [onlyMissing, setOnlyMissing] = useState(false);

  const fetchBodies = useCallback(async () => {
    setLoading(true);
    let all = [];
    let from = 0;
    const pageSize = 1000;
    while (true) {
      const { data, error } = await supabase.from('lc_conducting_bodies').select('id,name,logo_path').order('name').range(from, from + pageSize - 1);
      if (error) { console.error('Error fetching conducting bodies:', error); break; }
      all = all.concat(data);
      if (data.length < pageSize) break;
      from += pageSize;
    }
    setBodies(all);
    setLoading(false);
  }, []);

  useEffect(() => { fetchBodies(); }, [fetchBodies]);

  const handleReplaced = (id, url) => {
    setBodies((prev) => prev.map((b) => (b.id === id ? { ...b, logo_path: url } : b)));
  };

  const filtered = bodies
    .filter((b) => !debouncedSearch || b.name.toLowerCase().includes(debouncedSearch.toLowerCase()))
    .filter((b) => !onlyMissing || !b.logo_path);

  const withLogoCount = bodies.filter((b) => b.logo_path).length;

  return (
    <div>
      <div className="lc-section-header">
        <div>
          <h2>Conducting Bodies</h2>
          <p>{withLogoCount} of {bodies.length} bodies have a logo. Upload or replace one below — swap in a higher-resolution version any time.</p>
        </div>
      </div>

      <div className="lc-filter-bar">
        <div className="lc-filter-field lc-search-input-wrapper">
          <Search size={16} />
          <input type="text" placeholder="Search conducting bodies..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', color: 'var(--admin-text-muted, #64748b)' }}>
          <input type="checkbox" checked={onlyMissing} onChange={(e) => setOnlyMissing(e.target.checked)} />
          Missing logo only
        </label>
      </div>

      {loading ? (
        <div className="lc-loading-state">Loading conducting bodies…</div>
      ) : filtered.length === 0 ? (
        <div className="lc-empty-state"><p>No conducting bodies match the current filters.</p></div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '1.25rem', marginTop: '1.5rem' }}>
          {filtered.map((body) => (
            <div key={body.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', padding: '1rem', borderRadius: 'var(--radius-md, 10px)', border: '1px solid var(--border, #e2e8f0)', background: 'var(--surface, #fff)' }}>
              <LogoCell body={body} onReplaced={handleReplaced} />
              <span style={{ fontSize: '0.78rem', textAlign: 'center', color: 'var(--admin-text, #0f172a)', lineHeight: 1.3 }}>{body.name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ConductingBodiesPage;
