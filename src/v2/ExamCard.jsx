import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useThumbnails } from '../lib/thumbnailStore';

const FALLBACK_COLORS = ['#1F3A2E', '#4b6b32', '#8a5a12', '#2a4d6e', '#6b2d3a', '#4a3f6b', '#2f6b66'];
const colorFor = (text = '') => {
  let h = 0;
  for (let i = 0; i < text.length; i += 1) h = (h * 31 + text.charCodeAt(i)) >>> 0;
  return FALLBACK_COLORS[h % FALLBACK_COLORS.length];
};

/** Thumbnail: the category's uploaded image if there is one, else a solid colour block. */
function Thumb({ image, label, color }) {
  return (
    <div className="v2-thumb" style={{ background: color }}>
      {image && <img src={image} alt="" loading="lazy" onError={(e) => { e.currentTarget.style.display = 'none'; }} />}
      {!image && <span>{label.slice(0, 2).toUpperCase()}</span>}
    </div>
  );
}

/** A row/grid tile for a category, state or UT: links to a filtered browse page. */
export function GroupTile({ to, name, count, imageCategory }) {
  const { categoryUrl } = useThumbnails();
  const image = imageCategory ? categoryUrl(imageCategory) : null;
  return (
    <Link to={to} className="v2-tile">
      <Thumb image={image} label={name} color={colorFor(name)} />
      <div className="v2-tile-body">
        <h3>{name}</h3>
        <span>{count} {count === 1 ? 'exam' : 'exams'}</span>
        <ArrowRight size={16} className="v2-tile-arrow" />
      </div>
    </Link>
  );
}

/** A single exam in the browse results. Exam pages are unchanged (/exam/:id). */
export function ExamCard({ exam, from }) {
  const { categoryUrl } = useThumbnails();
  const image = categoryUrl(exam.category);
  return (
    <Link to={`/exam/${exam.id}`} state={{ from }} className="v2-exam-card">
      <Thumb image={image} label={exam.name} color={exam.accent_color || colorFor(exam.category || exam.name)} />
      <div className="v2-exam-card-body">
        <h3>{exam.name}</h3>
        <p>{exam.conducting_body?.name || exam.region?.name || ''}</p>
        {exam.category && <span className="v2-chip">{exam.category}</span>}
      </div>
    </Link>
  );
}
