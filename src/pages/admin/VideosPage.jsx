import { useEffect, useState } from 'react';
import { Video, Save, RotateCcw, CheckCircle2, XCircle, RefreshCw, ExternalLink, Play } from 'lucide-react';
import { adminFrom } from '../../lib/adminDb';
import { VIDEO_LANGUAGES, DEFAULT_VIDEOS, parseYouTubeId, refreshVideos, useVideoRows } from '../../lib/videoStore';

/**
 * Admin -> Videos. One card per landing-page language ("What is VeerNXT?" section).
 * Paste a YouTube link (or id) and Replace to switch the video; Restore goes back to the built-in one.
 * Rows live in site_videos (sql/site_videos.sql).
 */

const adminEmail = () => {
  try {
    return JSON.parse(localStorage.getItem('admin_session') || '{}').email || null;
  } catch {
    return null;
  }
};

async function saveVideo(lang, youtubeId) {
  const { error } = await adminFrom('site_videos').upsert(
    { lang, youtube_id: youtubeId, updated_at: new Date().toISOString(), updated_by: adminEmail() },
    { onConflict: 'lang' },
  );
  if (error) throw new Error(error.message || 'Save failed');
  refreshVideos();
}

const thumb = (id) => `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;

function VideoCard({ language, row }) {
  const custom = row?.youtube_id || null;
  const current = custom || DEFAULT_VIDEOS[language.code];
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    setInput('');
    setPlaying(false);
  }, [current]);

  const parsed = input.trim() ? parseYouTubeId(input) : null;
  const invalid = input.trim() !== '' && !parsed;

  const run = async (fn, okMsg) => {
    setBusy(true);
    setStatus(null);
    try {
      await fn();
      setStatus({ ok: true, msg: okMsg });
    } catch (e) {
      setStatus({ ok: false, msg: e.message });
    } finally {
      setBusy(false);
      setTimeout(() => setStatus(null), 6000);
    }
  };
  const replace = () => run(() => saveVideo(language.code, parsed), 'Video replaced');
  const reset = () => {
    if (!window.confirm(`Remove the custom ${language.name} video and go back to the original?`)) return undefined;
    return run(() => saveVideo(language.code, null), 'Original video restored');
  };

  return (
    <div className="vd-card">
      <div className="vd-top">
        <span className="vd-pill"><Video size={12} /> {language.name}</span>
        <span className={`vd-tag ${custom ? 'custom' : ''}`}>{custom ? 'Custom' : 'Default'}</span>
      </div>

      <div className="vd-preview">
        {playing ? (
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${current}?autoplay=1&rel=0`}
            title={`${language.name} video preview`}
            allow="autoplay; encrypted-media; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <button type="button" className="vd-play" onClick={() => setPlaying(true)} aria-label={`Play ${language.name} video`}>
            <img src={thumb(current)} alt="" />
            <span className="vd-play-icon"><Play size={22} fill="currentColor" /></span>
          </button>
        )}
      </div>

      <a className="vd-link" href={`https://www.youtube.com/watch?v=${current}`} target="_blank" rel="noreferrer">
        youtube.com/watch?v={current} <ExternalLink size={11} />
      </a>

      <div className="lc-input-group vd-field">
        <label htmlFor={`vd-${language.code}`}>Replace with a new YouTube link</label>
        <input
          id={`vd-${language.code}`}
          type="text"
          value={input}
          placeholder="https://www.youtube.com/watch?v=… or video id"
          onChange={(e) => setInput(e.target.value)}
        />
        {invalid && <span className="vd-err">That does not look like a YouTube link or video id.</span>}
        {parsed && (
          <span className="vd-new">
            <img src={thumb(parsed)} alt="" /> New video: {parsed}
          </span>
        )}
      </div>

      <div className="vd-foot">
        <button type="button" className="lc-btn primary" onClick={replace} disabled={busy || !parsed || parsed === current}>
          {busy ? <RefreshCw size={13} className="animate-spin" /> : <Save size={13} />} Replace video
        </button>
        {custom && (
          <button type="button" className="lc-btn" onClick={reset} disabled={busy}>
            <RotateCcw size={13} /> Restore original
          </button>
        )}
        {status && (
          <span className="vd-status" style={{ color: status.ok ? '#16a34a' : '#ef4444' }}>
            {status.ok ? <CheckCircle2 size={14} /> : <XCircle size={14} />} {status.msg}
          </span>
        )}
        {row?.updated_at && (
          <span className="vd-updated">
            Last changed {new Date(row.updated_at).toLocaleString()}{row.updated_by ? ` by ${row.updated_by}` : ''}
          </span>
        )}
      </div>
    </div>
  );
}

const VideosPage = () => {
  const { rows, ready } = useVideoRows();
  if (!ready) return <div className="lc-loading-state">Loading videos…</div>;
  return (
    <>
      <div className="vd-grid">
        {VIDEO_LANGUAGES.map((l) => <VideoCard key={l.code} language={l} row={rows[l.code]} />)}
      </div>
      <style>{`
        .vd-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; align-items: start; }
        .vd-card { display: flex; flex-direction: column; gap: 12px; min-width: 0; padding: 18px 20px; border-radius: 16px; background: var(--admin-surface, var(--c-bg-0, #fff)); border: 1px solid var(--admin-border, var(--c-line-2, #e2e8f0)); box-shadow: 0 1px 3px rgba(15,23,42,.05); }
        .vd-top { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
        .vd-pill { display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; border-radius: 8px; font-size: 12px; font-weight: 700; background: rgba(16,185,129,.12); color: #047857; border: 1px solid rgba(16,185,129,.28); }
        .vd-tag { font-size: 10.5px; font-weight: 700; text-transform: uppercase; letter-spacing: .04em; padding: 3px 9px; border-radius: 999px; background: rgba(100,116,139,.14); color: var(--admin-text-muted, #64748b); }
        .vd-tag.custom { background: rgba(16,185,129,.14); color: #059669; }
        .vd-preview { position: relative; aspect-ratio: 16 / 9; border-radius: 12px; overflow: hidden; background: #0f172a; }
        .vd-preview iframe, .vd-play, .vd-play img { position: absolute; inset: 0; width: 100%; height: 100%; border: 0; }
        .vd-play { padding: 0; cursor: pointer; background: none; display: block; }
        .vd-play img { object-fit: cover; }
        .vd-play-icon { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); width: 52px; height: 52px; border-radius: 50%; background: rgba(0,0,0,.65); color: #fff; display: flex; align-items: center; justify-content: center; transition: transform .15s, background .15s; }
        .vd-play:hover .vd-play-icon { background: #dc2626; transform: translate(-50%, -50%) scale(1.08); }
        .vd-link { display: inline-flex; align-items: center; gap: 4px; font-size: 12px; color: var(--admin-text-muted, #64748b); text-decoration: none; overflow-wrap: anywhere; }
        .vd-field { display: flex; flex-direction: column; gap: 6px; margin: 0; }
        .vd-field label { font-size: 12px; font-weight: 700; color: var(--admin-text, #334155); }
        .vd-field input { width: 100%; box-sizing: border-box; min-height: 42px; padding: 10px 12px; border-radius: 10px; font: inherit; font-size: 13.5px; color: var(--admin-text, #0f172a); background: var(--admin-surface, #fff); border: 1px solid var(--admin-border, #cbd5e1); }
        .vd-field input:focus { outline: none; border-color: #059669; box-shadow: 0 0 0 3px rgba(16,185,129,.18); }
        .vd-err { font-size: 12px; color: #dc2626; }
        .vd-new { display: inline-flex; align-items: center; gap: 8px; font-size: 12px; color: #059669; font-weight: 600; }
        .vd-new img { width: 56px; aspect-ratio: 16 / 9; object-fit: cover; border-radius: 6px; }
        .vd-foot { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
        .vd-foot .lc-btn { min-height: 38px; padding: 0 16px; border-radius: 10px; font-weight: 700; }
        .vd-status { display: inline-flex; align-items: center; gap: 4px; font-size: 12px; }
        .vd-updated { font-size: 11px; color: var(--admin-text-muted, #64748b); margin-left: auto; }
        @media (max-width: 1100px) { .vd-grid { grid-template-columns: minmax(0, 1fr); } }
        @media (max-width: 600px) { .vd-card { padding: 14px; } .vd-updated { margin-left: 0; } }
      `}</style>
    </>
  );
};

export default VideosPage;
