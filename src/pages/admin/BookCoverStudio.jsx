import { useEffect, useRef, useState, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Upload, Download, Plus, Trash2, RefreshCw, CheckCircle2, XCircle, Save, FileJson, RotateCcw, ArrowLeft } from 'lucide-react';
import { BookCoverTemplate, BookSpineTemplate } from '../../components/book/BookCoverTemplate';
import { DEFAULT_COVER, TOPIC_ICONS, COVER_W, COVER_H, SPINE_W, LAYOUT_DEFAULTS, LAYOUT_CONTROLS } from '../../components/book/bookCoverConfig';
import { rasterize, composeBook3D, canvasToBlob } from '../../lib/bookPerspective';
import { uploadFilesToR2 } from '../../lib/r2Uploader';

const DRAFT_KEY = 'admin-book-cover-studio-draft';
const ADMIN_SECRET = import.meta.env.VITE_ADMIN_API_SECRET;
const THUMB_W = 768;
const THUMB_H = 1152;

// A book with no saved cover starts blank: the sample content (Computer Science,
// UPSC...) must never get baked into a different book's thumbnail by accident.
const BLANK_COVER = { ...DEFAULT_COVER, exams: '', topics: [], bullets: '' };

const api = async (body) => {
  const res = await fetch('/api/admin/save-resource', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-admin-api-secret': ADMIN_SECRET },
    body: JSON.stringify(body),
  });
  const out = await res.json().catch(() => ({}));
  if (!res.ok || !out.ok) throw new Error(out.error || `HTTP ${res.status}`);
  return out;
};

const adminName = () => {
  try { const s = JSON.parse(localStorage.getItem('admin_session') || '{}'); return s.email || s.name || null; } catch { return null; }
};

const slugify = (s) => String(s || 'book').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'book';
const BADGE_FOR = { GUIDE: 'COMPLETE GUIDE', PRECIS: 'PRECIS' };

const readDraft = () => {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    return raw ? { ...DEFAULT_COVER, ...JSON.parse(raw) } : DEFAULT_COVER;
  } catch { return DEFAULT_COVER; }
};

// Downscale before storing: a full-size photo as a data URL blows past the
// localStorage quota and slows every re-render of the cover.
async function fileToScaledDataUrl(file, maxSide) {
  const bmp = await createImageBitmap(file);
  const k = Math.min(1, maxSide / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas');
  c.width = Math.round(bmp.width * k);
  c.height = Math.round(bmp.height * k);
  c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
  bmp.close?.();
  const isPng = file.type === 'image/png';
  return c.toDataURL(isPng ? 'image/png' : 'image/jpeg', 0.9);
}

const download = (blob, name) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
};

const field = { display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, fontWeight: 600 };
const input = { padding: '7px 9px', borderRadius: 6, border: '1px solid var(--border, #cbd5e1)', fontSize: 13, fontFamily: 'inherit', background: 'transparent', color: 'inherit' };
const card = { border: '1px solid var(--border, #e2e8f0)', borderRadius: 10, padding: 14, display: 'flex', flexDirection: 'column', gap: 10 };

export default function BookCoverStudio() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const resourceId = params.get('resourceId');
  const [book, setBook] = useState(null);
  const [loading, setLoading] = useState(Boolean(resourceId));
  const [saved, setSaved] = useState(null);
  const origin = useRef({ image: '', imageUrl: null, logo: '', logoUrl: null });
  const [data, setData] = useState(() => (resourceId ? BLANK_COVER : readDraft()));
  const [angle, setAngle] = useState(22);
  const [depth, setDepth] = useState(0.35);
  const [bg, setBg] = useState('transparent');
  const [preview, setPreview] = useState('');
  const [rendering, setRendering] = useState(false);
  const [status, setStatus] = useState(null);
  const coverRef = useRef(null);
  const spineRef = useRef(null);
  const renderSeq = useRef(0);

  const set = (patch) => setData((d) => ({ ...d, ...patch }));

  // Opened from a book's "Design cover" button: the saved cover (Supabase + R2)
  // is the source of truth, so load it instead of the browser draft.
  useEffect(() => {
    if (!resourceId) return undefined;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const out = await api({ type: 'book-cover-get', resourceId });
        if (cancelled) return;
        setBook(out.book);
        if (out.cover) {
          const image = out.imageDataUrl || '';
          const logo = out.logoDataUrl || '';
          origin.current = { image, imageUrl: out.cover.image_url, logo, logoUrl: out.cover.logo_url };
          setData({ ...BLANK_COVER, ...out.cover.cover_data, image, logo });
          setSaved({ at: out.cover.updated_at, thumb: out.cover.thumb_url });
        } else {
          const type = out.book.category === 'Precis' ? 'PRECIS' : 'GUIDE';
          origin.current = { image: '', imageUrl: null, logo: '', logoUrl: null };
          setData({ ...BLANK_COVER, title: out.book.title, type, badge: BADGE_FOR[type] });
        }
      } catch (err) {
        if (!cancelled) setStatus({ kind: 'error', msg: `Could not load this book: ${err.message}` });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [resourceId]);

  useEffect(() => {
    if (resourceId) return undefined;
    const t = setTimeout(() => {
      try { localStorage.setItem(DRAFT_KEY, JSON.stringify(data)); } catch { /* quota: draft is best-effort */ }
    }, 500);
    return () => clearTimeout(t);
  }, [data, resourceId]);

  const bake = useCallback(async (opts = {}) => {
    const { outW = 1024, outH = 1536, pixelRatio = 1.5 } = opts;
    const [front, spine] = await Promise.all([
      rasterize(coverRef.current, { pixelRatio }),
      rasterize(spineRef.current, { pixelRatio }),
    ]);
    return composeBook3D(front, spine, { outW, outH, angle, depth, background: bg === 'transparent' ? null : bg });
  }, [angle, depth, bg]);

  // Debounced live 3D preview — same compositor as the export, so what the
  // team sees is exactly what gets uploaded.
  useEffect(() => {
    const seq = ++renderSeq.current;
    const t = setTimeout(async () => {
      setRendering(true);
      try {
        const canvas = await bake({ outW: 640, outH: 960, pixelRatio: 1 });
        if (seq === renderSeq.current) setPreview(canvas.toDataURL('image/png'));
      } catch (err) {
        console.error('Preview render failed:', err);
      } finally {
        if (seq === renderSeq.current) setRendering(false);
      }
    }, 450);
    return () => clearTimeout(t);
  }, [data, bake]);

  const slug = slugify(data.title.replace(/\n/g, ' ') + '-' + data.type);

  const handleImage = (key, maxSide) => async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    set({ [key]: await fileToScaledDataUrl(file, maxSide) });
  };

  const handleType = (type) => {
    // Keep the badge in sync unless the team has hand-edited it.
    const wasDefault = !data.badge || data.badge === BADGE_FOR[data.type];
    set({ type, ...(wasDefault ? { badge: BADGE_FOR[type] } : {}) });
  };

  const layout = { ...LAYOUT_DEFAULTS, ...(data.layout || {}) };
  const setLayout = (key, value) => set({ layout: { ...(data.layout || {}), [key]: value } });

  const setTopic = (i, patch) => set({ topics: data.topics.map((t, j) => (j === i ? { ...t, ...patch } : t)) });

  const run = async (label, fn) => {
    setStatus({ kind: 'busy', msg: label });
    try {
      const msg = await fn();
      setStatus({ kind: 'ok', msg: msg || 'Done' });
    } catch (err) {
      console.error(err);
      setStatus({ kind: 'error', msg: err.message || 'Failed' });
    }
  };

  const downloadThumb = () => run('Rendering thumbnail…', async () => {
    const canvas = await bake({ outW: 1024, outH: 1536, pixelRatio: 2 });
    download(await canvasToBlob(canvas), `${slug}-3d.png`);
  });

  const downloadFlat = () => run('Rendering cover…', async () => {
    const canvas = await rasterize(coverRef.current, { pixelRatio: 2 });
    download(await canvasToBlob(canvas), `${slug}-cover.png`);
  });

  const exportJson = () => download(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }), `${slug}.cover.json`);
  const importJson = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try { setData({ ...DEFAULT_COVER, ...JSON.parse(await file.text()) }); }
    catch { setStatus({ kind: 'error', msg: 'That file is not a valid cover JSON.' }); }
  };

  // Upload only images that changed since the last load/save, so re-saving a
  // text fix doesn't pile up duplicate R2 objects.
  const uploadIfChanged = async (kind, files) => {
    const current = data[kind];
    const o = origin.current;
    if (!current) return null;
    if (current === o[kind] && o[`${kind}Url`]) return { url: o[`${kind}Url`] };
    const blob = await (await fetch(current)).blob();
    const ext = blob.type === 'image/png' ? 'png' : 'jpg';
    const key = `book-covers/${slug}/${kind}-${Date.now()}.${ext}`;
    files.push({ key, body: blob, contentType: blob.type });
    return { key };
  };

  const saveToBook = () => run('Rendering and saving…', async () => {
    const canvas = await bake({ outW: THUMB_W, outH: THUMB_H, pixelRatio: 2 });
    const flat = await rasterize(coverRef.current, { pixelRatio: 1.5 });
    const stamp = Date.now();
    const files = [];
    const imageRef = await uploadIfChanged('image', files);
    const logoRef = await uploadIfChanged('logo', files);
    const thumbKey = `book-covers/${slug}/thumb-3d-${stamp}.webp`;
    const flatKey = `book-covers/${slug}/cover-flat-${stamp}.webp`;
    files.push(
      { key: thumbKey, body: await canvasToBlob(canvas, 'image/webp', 0.9), contentType: 'image/webp' },
      { key: flatKey, body: await canvasToBlob(flat, 'image/webp', 0.88), contentType: 'image/webp' },
    );
    const urls = await uploadFilesToR2(files);
    const urlOf = (r) => (r ? (r.url || urls[r.key]) : null);
    const imageUrl = urlOf(imageRef);
    const logoUrl = urlOf(logoRef);
    const { image, logo, ...coverData } = data; // pictures are in R2, not in the jsonb
    await api({
      type: 'book-cover-save', resourceId, coverData, imageUrl, logoUrl,
      thumbUrl: urls[thumbKey], flatUrl: urls[flatKey], updatedBy: adminName(),
    });
    origin.current = { image, imageUrl, logo, logoUrl };
    setSaved({ at: new Date().toISOString(), thumb: urls[thumbKey] });
    return "Saved. The 3D thumbnail is now this book's thumbnail.";
  });

  const previewScale = 0.5;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 440px) 1fr', gap: 18, alignItems: 'start' }}>
      {/* ── Editor ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={card}>
          <label style={field}>Subject name (one line per row)
            <textarea style={{ ...input, minHeight: 56 }} value={data.title} onChange={(e) => set({ title: e.target.value })} />
          </label>
          <div style={{ display: 'flex', gap: 10 }}>
            <label style={{ ...field, flex: 1 }}>Type
              <select style={input} value={data.type} onChange={(e) => handleType(e.target.value)}>
                <option value="GUIDE">Guide</option>
                <option value="PRECIS">Precis</option>
              </select>
            </label>
            <label style={{ ...field, flex: 2 }}>Badge text
              <input style={input} value={data.badge} onChange={(e) => set({ badge: e.target.value })} />
            </label>
          </div>
        </div>

        <div style={card}>
          <label style={field}>Brand name (cover and spine)
            <input style={input} value={data.brandName} onChange={(e) => set({ brandName: e.target.value })} />
          </label>
          <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 12, fontWeight: 600 }}>
            <input type="checkbox" checked={!!data.spineType} onChange={(e) => set({ spineType: e.target.checked })} />
            Also show Guide / Precis on the spine
          </label>
        </div>

        <div style={card}>
          <label style={field}>Exams label
            <input style={input} value={data.examsPrefix} onChange={(e) => set({ examsPrefix: e.target.value })} />
          </label>
          <label style={field}>Exams (one line per row)
            <textarea style={{ ...input, minHeight: 70 }} value={data.exams} onChange={(e) => set({ exams: e.target.value })} />
          </label>
        </div>

        <div style={card}>
          <div style={{ ...field, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Subjects in this book ({data.topics.length}/7)</span>
            <button type="button" className="lc-btn" disabled={data.topics.length >= 7}
              onClick={() => set({ topics: [...data.topics, { label: 'New topic', icon: 'book' }] })}
              style={{ fontSize: 12, padding: '4px 9px', display: 'inline-flex', alignItems: 'center', gap: 4 }}><Plus size={12} /> Add</button>
          </div>
          {data.topics.map((t, i) => (
            <div key={i} style={{ display: 'flex', gap: 6 }}>
              <select style={{ ...input, width: 104 }} value={t.icon} onChange={(e) => setTopic(i, { icon: e.target.value })}>
                {Object.keys(TOPIC_ICONS).map((k) => <option key={k} value={k}>{k}</option>)}
              </select>
              <input style={{ ...input, flex: 1, minWidth: 0 }} value={t.label} onChange={(e) => setTopic(i, { label: e.target.value })} />
              <button type="button" title="Remove" onClick={() => set({ topics: data.topics.filter((_, j) => j !== i) })}
                style={{ border: 0, background: 'transparent', cursor: 'pointer', color: '#ef4444' }}><Trash2 size={15} /></button>
            </div>
          ))}
        </div>

        <div style={card}>
          <label style={field}>Bullet points (one per line, max 8)
            <textarea style={{ ...input, minHeight: 120 }} value={data.bullets} onChange={(e) => set({ bullets: e.target.value })} />
          </label>
        </div>

        <div style={card}>
          <div style={{ ...field, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Text size &amp; spacing</span>
            <button type="button" className="lc-btn" onClick={() => set({ layout: {} })} style={{ fontSize: 12, padding: '4px 9px' }}>Reset layout</button>
          </div>
          {LAYOUT_CONTROLS.map(([group, items]) => (
            <div key={group} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', opacity: 0.6 }}>{group}</div>
              {items.map(([key, label, min, max]) => (
                <label key={key} style={{ display: 'grid', gridTemplateColumns: '1fr 120px 44px', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 500 }}>
                  <span>{label}</span>
                  <input type="range" min={min} max={max} value={layout[key]} onChange={(e) => setLayout(key, +e.target.value)} />
                  <input type="number" min={min} max={max} value={layout[key]} onChange={(e) => setLayout(key, Math.min(max, Math.max(min, +e.target.value || 0)))}
                    style={{ ...input, padding: '3px 4px', width: 44, textAlign: 'center' }} />
                </label>
              ))}
            </div>
          ))}
        </div>

        <div style={card}>
          <div style={{ display: 'flex', gap: 10 }}>
            <label className="lc-btn" style={{ fontSize: 12, padding: '6px 10px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <Upload size={13} /> {data.image ? 'Replace picture' : 'Upload picture'}
              <input type="file" accept="image/*" hidden onChange={handleImage('image', 1600)} />
            </label>
            {data.image && <button type="button" className="lc-btn" style={{ fontSize: 12, padding: '6px 10px' }} onClick={() => set({ image: '' })}>Remove</button>}
          </div>
          <label style={field}>Picture height ({data.imageHeight}%)
            <input type="range" min="20" max="50" value={data.imageHeight} onChange={(e) => set({ imageHeight: +e.target.value })} />
          </label>
          <label style={field}>Picture focus ({data.imageY}%)
            <input type="range" min="0" max="100" value={data.imageY} onChange={(e) => set({ imageY: +e.target.value })} />
          </label>
          <div style={{ display: 'flex', gap: 10 }}>
            <label className="lc-btn" style={{ fontSize: 12, padding: '6px 10px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <Upload size={13} /> {data.logo ? 'Replace logo' : 'Custom logo'}
              <input type="file" accept="image/*" hidden onChange={handleImage('logo', 600)} />
            </label>
            {data.logo && <button type="button" className="lc-btn" style={{ fontSize: 12, padding: '6px 10px' }} onClick={() => set({ logo: '' })}>Use VeerNXT logo</button>}
          </div>
          <div style={{ display: 'flex', gap: 14 }}>
            {[['paper', 'Paper'], ['primary', 'Text / green'], ['accent', 'Gold']].map(([k, label]) => (
              <label key={k} style={{ ...field, alignItems: 'flex-start' }}>{label}
                <input type="color" value={data[k]} onChange={(e) => set({ [k]: e.target.value })} />
              </label>
            ))}
          </div>
        </div>

        <div style={card}>
          <label style={field}>Book angle ({angle}°)
            <input type="range" min="8" max="40" value={angle} onChange={(e) => setAngle(+e.target.value)} />
          </label>
          <label style={field}>Spine thickness ({Math.round(depth * 100)}%)
            <input type="range" min="15" max="35" value={Math.round(depth * 100)} onChange={(e) => setDepth(+e.target.value / 100)} />
          </label>
          <label style={field}>Thumbnail background
            <select style={input} value={bg} onChange={(e) => setBg(e.target.value)}>
              <option value="transparent">Transparent</option>
              <option value="#ffffff">White</option>
              <option value="#f1f5f9">Light grey</option>
              <option value="#0b1220">Dark navy</option>
            </select>
          </label>
        </div>
      </div>

      {/* ── Previews + actions ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, position: 'sticky', top: 12 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          {resourceId ? (
            <>
              <button type="button" className="lc-btn" onClick={() => navigate('/admin/books')} style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><ArrowLeft size={14} /> Books</button>
              <button type="button" className="lc-btn" onClick={saveToBook} disabled={loading || status?.kind === 'busy'} style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><Save size={14} /> Save to book</button>
            </>
          ) : (
            <span style={{ fontSize: 12, color: '#b45309' }}>Open this page from a book&apos;s “Design cover” button to save it.</span>
          )}
          <button type="button" className="lc-btn" onClick={downloadThumb} style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><Download size={14} /> 3D PNG</button>
          <button type="button" className="lc-btn" onClick={downloadFlat} style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><Download size={14} /> Flat cover PNG</button>
          <button type="button" className="lc-btn" onClick={exportJson} style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><FileJson size={14} /> Save JSON</button>
          <label className="lc-btn" style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5 }}><Upload size={14} /> Load JSON
            <input type="file" accept="application/json" hidden onChange={importJson} />
          </label>
          <button type="button" className="lc-btn" onClick={() => { if (window.confirm('Reset to the sample cover?')) setData(DEFAULT_COVER); }} style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><RotateCcw size={14} /> Reset</button>
        </div>

        {status && (
          <div style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, color: status.kind === 'error' ? '#ef4444' : status.kind === 'ok' ? '#16a34a' : 'inherit' }}>
            {status.kind === 'busy' && <RefreshCw size={14} className="animate-spin" />}
            {status.kind === 'ok' && <CheckCircle2 size={14} />}
            {status.kind === 'error' && <XCircle size={14} />}
            {status.msg}
          </div>
        )}
        {book && (
          <div style={{ fontSize: 12, opacity: 0.8 }}>
            Book: <strong>{book.title}</strong> ({book.category}){saved ? ` — last saved ${new Date(saved.at).toLocaleString()}` : ' — no cover saved yet'}
          </div>
        )}

        <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Flat cover (live)</div>
            <div style={{ width: COVER_W * previewScale, height: COVER_H * previewScale, border: '1px solid var(--border, #e2e8f0)' }}>
              <div style={{ transform: `scale(${previewScale})`, transformOrigin: 'top left' }}>
                <BookCoverTemplate data={data} />
              </div>
            </div>
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6, display: 'flex', gap: 6, alignItems: 'center' }}>
              3D thumbnail {rendering && <RefreshCw size={12} className="animate-spin" />}
            </div>
            <div style={{ width: 360, aspectRatio: '2 / 3', border: '1px solid var(--border, #e2e8f0)', background: bg === 'transparent' ? 'repeating-conic-gradient(#e5e7eb 0% 25%, #fff 0% 50%) 0 0 / 16px 16px' : bg }}>
              {preview && <img src={preview} alt="3D preview" style={{ width: '100%', display: 'block' }} />}
            </div>
          </div>
        </div>
      </div>

      {/* Unscaled copies used only for rasterising, kept off-screen. */}
      <div aria-hidden="true" style={{ position: 'fixed', left: -20000, top: 0, pointerEvents: 'none' }}>
        <div ref={coverRef} style={{ width: COVER_W, height: COVER_H }}><BookCoverTemplate data={data} /></div>
        <div ref={spineRef} style={{ width: SPINE_W, height: COVER_H }}><BookSpineTemplate data={data} /></div>
      </div>
    </div>
  );
}
