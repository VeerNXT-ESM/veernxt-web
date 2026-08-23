// Colour-only thumbnail — stands in for the real generated-image thumbnail
// (`renderCustomThumbnailCanvas`, still used nowhere here) per explicit
// instruction: "for now just use colours to denote the thumbnails." Colour
// now comes from the exam's dominant thumbnail subject (one of the 17 in
// src/lib/thumbnailTaxonomy.js, grouped into 8 colour families), computed
// by scripts/compute_exam_thumbnail_subjects.mjs and stored on
// exams.thumbnail_subject — replacing the earlier conducting-body hash so
// every exam reads by what it's actually about (English, GK, General
// Studies, ...), not which department runs it. See status_report.md §27.10.
import { getSubjectByKey, getFamilyHex } from '../../lib/thumbnailTaxonomy';

function abbreviate(name) {
  if (!name) return '';
  const stopWords = new Set(['of', 'the', 'and', 'for', '&']);
  return name.split(/\s+/).filter((w) => w && !stopWords.has(w.toLowerCase())).map((w) => w[0].toUpperCase()).join('').slice(0, 5);
}

/**
 * size: 'sm' (list-row badge, square) | 'lg' (editor preview panel)
 * thumbnailSubject: one of the keys in THUMBNAIL_SUBJECTS (exams.thumbnail_subject)
 */
const ExamThumbnail = ({ label, conductingBodyName, thumbnailSubject, accentColor, size = 'sm' }) => {
  const subject = getSubjectByKey(thumbnailSubject);
  const bg = accentColor || getFamilyHex(subject.family);
  const abbr = abbreviate(conductingBodyName);

  if (size === 'sm') {
    return (
      <div className="lc-thumb-sm" style={{ background: bg }} title={`${subject.label}${conductingBodyName ? ` — ${conductingBodyName}` : ''}`}>
        {abbr.slice(0, 2)}
      </div>
    );
  }

  return (
    <div className="lc-thumb-lg" style={{ background: `linear-gradient(160deg, ${bg} 0%, ${bg}cc 100%)` }}>
      <div className="lc-thumb-lg-subject">{subject.label.toUpperCase()}</div>
      <div className="lc-thumb-lg-label">{(label || 'STUDY MATERIAL').toUpperCase()}</div>
      {abbr && <div className="lc-thumb-lg-badge">{abbr}</div>}
    </div>
  );
};

export default ExamThumbnail;
