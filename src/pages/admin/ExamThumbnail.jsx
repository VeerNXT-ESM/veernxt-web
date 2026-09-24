// Colour-only thumbnail — stands in for the real generated-image thumbnail
// (`renderCustomThumbnailCanvas`, still used nowhere here) per explicit
// instruction: "for now just use colours to denote the thumbnails." Colour
// now comes from the exam's dominant thumbnail subject (one of the 17 in
// src/lib/thumbnailTaxonomy.js, grouped into 8 colour families), computed
// by scripts/compute_exam_thumbnail_subjects.mjs and stored on
// exams.thumbnail_subject — replacing the earlier conducting-body hash so
// every exam reads by what it's actually about (English, GK, General
// Studies, ...), not which department runs it. See status_report.md §27.10.
import { useState, useEffect } from 'react';
import { getSubjectByKey, getFamilyHex } from '../../lib/thumbnailTaxonomy';
import { useThumbnails } from '../../lib/thumbnailStore';

function abbreviate(name) {
  if (!name) return '';
  const stopWords = new Set(['of', 'the', 'and', 'for', '&']);
  return name.split(/\s+/).filter((w) => w && !stopWords.has(w.toLowerCase())).map((w) => w[0].toUpperCase()).join('').slice(0, 5);
}

const LEVEL_BADGE = { central: 'CENTRAL', state: 'STATE', ut: 'UT' };

/**
 * size: 'sm' (list-row badge, square) | 'lg' (landscape 16:9 card)
 * lg shows only the level badge + exam name. Background is a solid colour
 * until the exam's category has a thumbnail (set on admin > Categories),
 * which then replaces it (no wash or overlay). A missing/broken image keeps
 * the solid colour.
 * level: 'central' | 'state' | 'ut'
 */
const ExamThumbnail = ({ label, conductingBodyName, thumbnailSubject, accentColor, categoryName, level, size = 'sm' }) => {
  const subject = getSubjectByKey(thumbnailSubject);
  const bg = accentColor || getFamilyHex(subject.family);
  const { categoryUrl } = useThumbnails();
  const image = size === 'lg' ? categoryUrl(categoryName) : null;
  const [failedImage, setFailedImage] = useState(null);
  useEffect(() => { setFailedImage(null); }, [image]);

  if (size === 'sm') {
    const abbr = abbreviate(conductingBodyName);
    return (
      <div className="lc-thumb-sm" style={{ background: bg }} title={conductingBodyName || ''}>
        {abbr.slice(0, 2)}
      </div>
    );
  }

  const shown = image && failedImage !== image ? image : null;
  const badge = LEVEL_BADGE[(level || '').toLowerCase()];
  const textShadow = shown ? '0 1px 4px rgba(0,0,0,0.9), 0 0 2px rgba(0,0,0,0.8)' : 'none';

  return (
    <div style={{ position: 'relative', width: '100%', aspectRatio: '16 / 9', borderRadius: 10, overflow: 'hidden', background: bg, boxSizing: 'border-box' }}>
      {shown && (
        <img
          src={shown}
          alt=""
          onError={() => setFailedImage(shown)}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
        />
      )}
      {badge && (
        <span style={{ position: 'absolute', top: 8, left: 8, padding: '0.2rem 0.55rem', borderRadius: 999, background: '#fff', color: '#0f172a', fontSize: '0.62rem', fontWeight: 800, letterSpacing: '0.06em' }}>
          {badge}
        </span>
      )}
      <div style={{ position: 'absolute', inset: 0, padding: '0 12px', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', color: '#fff', fontWeight: 800, fontSize: '0.85rem', lineHeight: 1.25, textShadow }}>
        {label || ''}
      </div>
    </div>
  );
};

export default ExamThumbnail;
