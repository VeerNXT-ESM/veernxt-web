import './BookCoverTemplate.css';
import veernxtLogo from '../../assets/veernxt-logo.png';
import { Check, BookOpen } from 'lucide-react';
import { COVER_W, COVER_H, SPINE_W, TOPIC_ICONS, DEFAULT_COVER, LAYOUT_DEFAULTS } from './bookCoverConfig';

/**
 * Flat (front-on) book cover + spine, driven entirely by a `data` object so the
 * content team can fix a typo and re-render instead of regenerating artwork.
 * Both are laid out at fixed design pixels (COVER_W x COVER_H) and scaled by
 * the caller; bookPerspective.js turns them into the angled 3D thumbnail.
 */
const lines = (s) => String(s || '').split('\n').map((l) => l.trim()).filter(Boolean);

// Auto size: shrink until the longest line fits the cover width (Playfair 900
// capitals run about 0.72em per character) and the block stays a sane height.
const autoTitleSize = (titleLines) => {
  const longest = Math.max(1, ...titleLines.map((l) => l.length));
  const byWidth = 880 / (longest * 0.72);
  const byHeight = 440 / Math.max(1, titleLines.length);
  return Math.max(60, Math.min(190, byWidth, byHeight));
};

export function BookCoverTemplate({ data }) {
  const d = { ...DEFAULT_COVER, ...data };
  const L = { ...LAYOUT_DEFAULTS, ...(d.layout || {}) };
  const titleLines = lines(d.title);
  const tSize = L.titleSize > 0 ? L.titleSize : autoTitleSize(titleLines);
  const topics = (d.topics || []).slice(0, 7);
  const fadeHex = Math.round((L.fade / 100) * 235).toString(16).padStart(2, '0');

  return (
    <div className="bct-cover" style={{ width: COVER_W, height: COVER_H, background: d.paper, color: d.primary, '--bct-primary': d.primary, '--bct-accent': d.accent, '--bct-paper': d.paper }}>
      {d.image && (
        <div className="bct-hero" style={{ height: `${d.imageHeight}%` }}>
          <img src={d.image} alt="" style={{ objectPosition: `50% ${d.imageY}%` }} />
          {/* top fade blends into the paper; left fade keeps the bullets readable */}
          <div className="bct-hero-fade" style={{ background: `linear-gradient(180deg, ${d.paper} 0%, ${d.paper}00 40%)` }} />
          <div className="bct-hero-fade" style={{ background: `linear-gradient(90deg, ${d.paper}${fadeHex} 0%, ${d.paper}${fadeHex} ${L.bulletsWidth - 10}%, ${d.paper}00 ${L.bulletsWidth + 22}%)` }} />
        </div>
      )}

      <div className="bct-flow">
        <div className="bct-head">
          <div className="bct-brand">
            <img className="bct-logo" src={d.logo || veernxtLogo} alt="" />
            <div className="bct-brand-text">
              <div className="bct-wordmark" style={{ fontSize: L.brandSize }}>{d.brandName}<sup>®</sup></div>
              <div className="bct-tagline" style={{ fontSize: L.tagline }}>From Service to a Prosperous Tomorrow</div>
              <div className="bct-rule" style={{ background: d.accent }} />
            </div>
          </div>
          {lines(d.exams).length > 0 && (
            <div className="bct-corner" style={{ background: `linear-gradient(160deg, ${d.accent}55 0%, ${d.accent}99 100%)`, fontSize: L.examsSize }}>
              <div>{d.examsPrefix}</div>
              {lines(d.exams).map((l, i) => <div key={i}>{l}</div>)}
            </div>
          )}
        </div>

        <h1 className="bct-title" style={{ fontSize: tSize, lineHeight: L.titleLeading / 100, marginTop: L.headerGap }}>
          {titleLines.map((l, i) => <span key={i}>{l}</span>)}
        </h1>

        <div className="bct-badge" style={{ background: `${d.accent}55`, fontSize: L.badgeSize, marginTop: L.titleGap }}>{d.badge || d.type}</div>

        {topics.length > 0 && (
          <div className="bct-topics" style={{ marginTop: L.badgeGap }}>
            {topics.map((t, i) => {
              const Icon = TOPIC_ICONS[t.icon] || BookOpen;
              return (
                <div key={i} className="bct-topic">
                  <span className="bct-topic-ico" style={{ background: `${d.primary}18` }}><Icon size={42} strokeWidth={1.6} /></span>
                  <span className="bct-topic-label" style={{ fontSize: L.topicSize }}>{t.label}</span>
                </div>
              );
            })}
          </div>
        )}

        <ul className="bct-bullets" style={{ marginTop: L.topicsGap, gap: L.bulletGap, width: `${L.bulletsWidth}%` }}>
          {lines(d.bullets).slice(0, 8).map((l, i) => (
            <li key={i} style={{ fontSize: L.bulletSize }}>
              <span className="bct-check" style={{ background: d.accent }}><Check size={20} color="#fff" strokeWidth={3.5} /></span>
              {l}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// Spine title: fit the text to the height left between the logo and the brand
// mark (Playfair 900 capitals run about 0.78em per character with tracking).
const SPINE_TITLE_ROOM = 860;
const autoSpineTitleSize = (text) => Math.max(34, Math.min(96, SPINE_TITLE_ROOM / (Math.max(1, text.length) * 0.78)));

export function BookSpineTemplate({ data }) {
  const d = { ...DEFAULT_COVER, ...data };
  const L = { ...LAYOUT_DEFAULTS, ...(d.layout || {}) };
  const title = lines(d.title).join(' ');
  const tSize = L.spineTitleSize > 0 ? L.spineTitleSize : autoSpineTitleSize(title);
  return (
    <div className="bct-spine" style={{ width: SPINE_W, height: COVER_H, background: d.paper, color: d.primary }}>
      <img className="bct-spine-logo" src={d.logo || veernxtLogo} alt="" style={{ width: L.spineLogoSize, height: L.spineLogoSize }} />
      <div className="bct-spine-text">
        <span className="bct-spine-title" style={{ fontSize: tSize }}>{title}</span>
        {d.spineType && (
          <>
            <span className="bct-spine-dash" style={{ background: d.accent }} />
            <span className="bct-spine-sub">{d.badge || d.type}</span>
          </>
        )}
      </div>
      <div className="bct-spine-brand">{d.brandName}<sup>®</sup></div>
    </div>
  );
}
