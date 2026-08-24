/**
 * src/lib/thumbnailTaxonomy.js
 *
 * The 17-subject / 8-colour-family thumbnail taxonomy (user-specified,
 * status_report.md §27.10), consolidated from the master-document
 * manifest's raw subject labels down to a reusable set of templates
 * rather than one thumbnail per document. Shared between the Node
 * ingestion/scoring script (scripts/compute_exam_thumbnail_subjects.mjs)
 * and the React thumbnail component (src/pages/admin/ExamThumbnail.jsx),
 * so the mapping only lives in one place.
 *
 * Deliberately excludes exam-specific unlabeled content (state Police
 * SI/Constable books, "BASE BOOK") from getting their own thumbnail
 * identity -- those fall through to a neutral default.
 */

export const COLOR_FAMILIES = {
  blue: { name: 'Blue', hex: '#2563eb' },
  purple: { name: 'Purple', hex: '#7c3aed' },
  orange: { name: 'Orange', hex: '#d97706' },
  teal: { name: 'Teal', hex: '#0d9488' },
  crimson: { name: 'Crimson', hex: '#be123c' },
  gold: { name: 'Gold', hex: '#ca8a04' },
  cyan: { name: 'Cyan', hex: '#0891b2' },
  earth: { name: 'Earth', hex: '#78350f' },
};

// 17 reusable thumbnail subjects, each assigned to one of the 8 colour
// families above (two subjects per family, per the user's spec).
export const THUMBNAIL_SUBJECTS = {
  english: { label: 'English', family: 'blue' },
  computer_science: { label: 'Computer Science', family: 'blue' },
  hindi: { label: 'Hindi', family: 'purple' },
  law: { label: 'Law', family: 'purple' },
  mathematics: { label: 'Mathematics', family: 'orange' },
  electrical_engineering: { label: 'Electrical Engineering', family: 'orange' },
  general_studies: { label: 'General Studies', family: 'teal' },
  general_science: { label: 'General Science', family: 'teal' },
  reasoning: { label: 'Reasoning', family: 'crimson' },
  nursing: { label: 'Nursing', family: 'crimson' },
  gk_general_awareness: { label: 'GK & General Awareness', family: 'gold' },
  financial_awareness: { label: 'Financial Awareness', family: 'gold' },
  technical_trades: { label: 'Technical Trades', family: 'cyan' },
  information_technology: { label: 'Information Technology', family: 'cyan' },
  agriculture_rural_dev: { label: 'Agriculture & Rural Development', family: 'earth' },
  descriptive_writing: { label: 'Descriptive Writing', family: 'earth' },
  // These two didn't get a colour-family pairing in the user's spec table;
  // grouped with their closest thematic neighbour rather than inventing a
  // 9th family for two rarely-used subjects.
  hr_personnel: { label: 'HR & Personnel', family: 'purple' },
  traffic_road_safety: { label: 'Traffic & Road Safety', family: 'gold' },
};

// Neutral fallback for exam-specific/unlabeled content (state SI/Constable
// books, "BASE BOOK", or an exam with no ingested resource at all) --
// deliberately NOT one of the 17 branded subjects, per the explicit
// instruction not to give these their own thumbnail identity.
export const DEFAULT_THUMBNAIL_SUBJECT = { key: 'general', label: 'Study Material', family: 'teal' };

// resources_v2.title -> thumbnail subject key, for the exact titles written
// by scripts/ingest_master_documents.mjs's 12 core-subject documents.
// Keyed on the cleaned title (see cleanTitle() in that script). Exported
// (alongside REGION_GS_TITLE_PATTERN below) so scripts/map_exam_resources_
// gemini.mjs can reuse the same "which resources_v2 rows are universal vs.
// region-specific" classification when building a Gemini candidate list,
// rather than re-deriving it.
export const CORE_TITLE_TO_SUBJECT = {
  'ENGLISH': 'english',
  'GS & GK GUIDE BOOK': 'gk_general_awareness',
  'SSC COMPLETE GK': 'gk_general_awareness',
  'REASONING': 'reasoning',
  'Computer Science guide Book': 'computer_science',
  'HINDI': 'hindi',
  'MATHEMATICS': 'mathematics',
};

// Any resources_v2 row whose title matches one of the 33 state/UT GS book
// titles ingested by the same script is General Studies, not generic GK --
// per the user's own observation that GS content is genuinely region-
// specific while GK/English/etc. are shared pan-India. Matched by suffix/
// keyword rather than an exhaustive list, since these titles vary
// (`{State}_GS`, `{State} GS`, `{State} CONSTABLE`, `{State}_SI`, etc.)
// but were all placed under Guide/GS BOOK STATE or Guide/GS BOOK UT.
export const REGION_GS_TITLE_PATTERN = /_GS(_Book)?$|GS$|CONSTABLE$|SI$/i;

// Fixed dominance order for when an exam carries several core-subject
// documents at once (most do -- avg 4.3 subjects/exam per status_report.md
// §27.6) -- deliberately NOT dependent on database fetch order, which is
// arbitrary. General Studies goes first: it's the most exam-distinctive of
// the set (region-specific content, per the user's own observation that
// "GS has genuinely different state/UT-specific variants"), so an exam
// with a dedicated state/UT GS book should read as that, not as generic
// English just because English happened to load first.
const SUBJECT_PRIORITY = [
  'general_studies', 'gk_general_awareness', 'reasoning', 'mathematics',
  'english', 'computer_science', 'hindi',
];

// Single-title -> subject key lookup, shared by resolveThumbnailSubject
// (one dominant subject per exam) and resolveSubjectForTitle (one subject
// per individual resource, for the per-subject syllabus thumbnail grid).
function subjectKeyForTitle(title) {
  if (CORE_TITLE_TO_SUBJECT[title]) return CORE_TITLE_TO_SUBJECT[title];
  if (REGION_GS_TITLE_PATTERN.test(title)) return 'general_studies';
  return null;
}

/**
 * Resolves the dominant thumbnail subject for an exam from its ingested
 * resources_v2 rows (title + category). Guide/Precis titles from the core
 * 12-document ingestion map directly and unambiguously; state/UT GS books
 * map to General Studies; anything else (niche/unlabeled exam-specific
 * content, or no content at all) falls back to the neutral default.
 */
export function resolveThumbnailSubject(resourceRows = []) {
  const titles = resourceRows.map((r) => (r.title || '').trim());
  const present = new Set();

  for (const title of titles) {
    const key = subjectKeyForTitle(title);
    if (key) present.add(key);
  }

  for (const key of SUBJECT_PRIORITY) {
    if (present.has(key)) return { key, ...THUMBNAIL_SUBJECTS[key] };
  }
  return DEFAULT_THUMBNAIL_SUBJECT;
}

/**
 * Per-resource subject, for grouping one exam's resources into the
 * subject-thumbnail grid (src/pages/ExamSyllabus.jsx) rather than picking
 * a single dominant subject for the whole exam. Same title-matching rules
 * as resolveThumbnailSubject, applied to one resource at a time; anything
 * unmatched falls back to the neutral default so it still gets a tile
 * instead of being silently dropped.
 */
export function resolveSubjectForTitle(title) {
  const key = subjectKeyForTitle((title || '').trim());
  return key ? { key, ...THUMBNAIL_SUBJECTS[key] } : DEFAULT_THUMBNAIL_SUBJECT;
}

export function getSubjectByKey(key) {
  if (key && THUMBNAIL_SUBJECTS[key]) return { key, ...THUMBNAIL_SUBJECTS[key] };
  return DEFAULT_THUMBNAIL_SUBJECT;
}

export function getFamilyHex(familyKey) {
  return COLOR_FAMILIES[familyKey]?.hex || COLOR_FAMILIES.teal.hex;
}

// Real thumbnail art (public/thumbnails/), one per subject key where the
// user has supplied one. Only 15 of the 18 subjects have art so far --
// general_studies, general_science, and information_technology (plus the
// neutral 'general' default) still fall back to the colour-block gradient
// in ExamThumbnail.jsx/ExamContentPreview.jsx until art exists for them.
const SUBJECT_THUMBNAIL_IMAGE = {
  english: 'English.png',
  computer_science: 'Computer Science.png',
  hindi: 'Hindi.png',
  law: 'LAw.png',
  mathematics: 'Mathematics.png',
  electrical_engineering: 'Electrical Engineering.png',
  reasoning: 'Reasoning.png',
  nursing: 'Nursing.png',
  gk_general_awareness: 'General Knowledge.png',
  financial_awareness: 'Financial Awareness.png',
  technical_trades: 'Technical Trades.png',
  agriculture_rural_dev: 'Agriculture.png',
  descriptive_writing: 'Descriptive Writing.png',
  hr_personnel: 'HR-Personnel.png',
  traffic_road_safety: 'Traffic-Road Safety.png',
};

/** Real thumbnail image URL for a subject key, or null if only the colour-block fallback is available. */
export function getSubjectThumbnailImage(key) {
  const filename = SUBJECT_THUMBNAIL_IMAGE[key];
  return filename ? `/thumbnails/${encodeURIComponent(filename)}` : null;
}
