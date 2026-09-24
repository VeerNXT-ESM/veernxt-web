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

// Reusable thumbnail subjects (the original 17 from the user's spec plus the
// split-book subjects: History, Physics, Banking, ...), each assigned to one of
// the 8 colour families above. Labels are also the values used by
// quizzes.subject and the quiz/PYQ subject dropdowns, so don't rename them.
export const THUMBNAIL_SUBJECTS = {
  english: { label: 'English', family: 'blue' },
  computer_science: { label: 'Computer Science', family: 'blue' },
  hindi: { label: 'Hindi', family: 'purple' },
  law: { label: 'Law', family: 'purple' },
  mathematics: { label: 'Mathematics', family: 'orange' },
  electrical_engineering: { label: 'Electrical Engineering', family: 'orange' },
  civil_engineering: { label: 'Civil Engineering', family: 'orange' },
  general_studies: { label: 'General Studies', family: 'teal' },
  general_science: { label: 'General Science', family: 'teal' },
  physics: { label: 'Physics', family: 'cyan' },
  chemistry: { label: 'Chemistry', family: 'teal' },
  biology: { label: 'Biology', family: 'teal' },
  environment: { label: 'Environment & Ecology', family: 'earth' },
  history: { label: 'History', family: 'gold' },
  geography: { label: 'Geography', family: 'earth' },
  polity: { label: 'Polity & Constitution', family: 'purple' },
  economy: { label: 'Indian Economy', family: 'gold' },
  reasoning: { label: 'Reasoning', family: 'crimson' },
  nursing: { label: 'Nursing', family: 'crimson' },
  gk_general_awareness: { label: 'GK & General Awareness', family: 'gold' },
  financial_awareness: { label: 'Financial Awareness', family: 'gold' },
  banking: { label: 'Banking', family: 'gold' },
  accounting: { label: 'Accounting', family: 'gold' },
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

// resources.title -> thumbnail subject key, for the exact titles written
// by scripts/ingest_master_documents.mjs's 12 core-subject documents.
// Keyed on the cleaned title (see cleanTitle() in that script). Exported
// (alongside REGION_GS_TITLE_PATTERN below) so scripts/map_exam_resources_
// gemini.mjs can reuse the same "which resources rows are universal vs.
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

// Any resources row whose title matches one of the 33 state/UT GS book
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
  'english', 'computer_science', 'hindi', 'history', 'geography', 'polity',
  'economy', 'general_science', 'physics', 'chemistry', 'biology',
  'environment', 'information_technology', 'banking', 'accounting',
];

// Single-title -> subject key lookup, shared by resolveThumbnailSubject
// (one dominant subject per exam) and resolveSubjectForTitle (one subject
// per individual resource, for the per-subject syllabus thumbnail grid).
// Real titles vary in case/spacing ("MATHEMATICS" vs "Mathematics", "Computer
// Science" vs "Computer Science guide Book", "HINDI JHT", "GS & GK",
// "Descriptive Writing Bank Exams", optionally year-prefixed), so exact-match
// on CORE_TITLE_TO_SUBJECT alone left most books with no subject thumbnail.
const normalizeTitle = (t) => (t || '').toLowerCase().replace(/[_\s]+/g, ' ').trim();
const NORMALIZED_CORE_TITLES = Object.fromEntries(
  Object.entries(CORE_TITLE_TO_SUBJECT).map(([title, key]) => [normalizeTitle(title), key])
);
const TITLE_KEYWORD_SUBJECTS = [
  [/descriptive writing/, 'descriptive_writing'],
  [/computer science/, 'computer_science'],
  [/information technology|(^|\s)it (officer|manager)/, 'information_technology'],
  [/electrical engineering/, 'electrical_engineering'],
  [/financial awareness/, 'financial_awareness'],
  [/hr personnel|hr & personnel/, 'hr_personnel'],
  [/law officer|^law$|judiciary/, 'law'],
  [/technical trade|technical knowledge/, 'technical_trades'],
  [/rajbhasha/, 'hindi'],
  [/(^|[^a-z])(maths?|mathematics)([^a-z]|$)/, 'mathematics'],
  [/(^|[^a-z])hindi([^a-z]|$)/, 'hindi'],
  [/^(\d{4} )?english(?![a-z])/, 'english'],
  [/(^|[^a-z])reasoning([^a-z]|$)/, 'reasoning'],
  // Split GK books ("SSC-GK-History", "GK Polity") get their own subject
  // before the generic GK match at the end.
  [/history/, 'history'],
  [/geography/, 'geography'],
  [/polity|constitution|civics/, 'polity'],
  [/economy|economics/, 'economy'],
  [/general science/, 'general_science'],
  [/physics/, 'physics'],
  [/chemistry/, 'chemistry'],
  [/biology|botany|zoology/, 'biology'],
  [/environment|ecology/, 'environment'],
  [/banking|bank exams/, 'banking'],
  [/accounting|auditing/, 'accounting'],
  [/nursing/, 'nursing'],
  [/agriculture|rural dev/, 'agriculture_rural_dev'],
  [/traffic|road safety/, 'traffic_road_safety'],
  [/^(\d{4} )?(gs ?& ?gk|general knowledge|gen(eral)? awareness)(?![a-z])|(^|[^a-z])gk([^a-z]|$)/, 'gk_general_awareness'],
];
const GS_BOOK_TITLE_PATTERN = /[ _]GS[ _]Book$/i;

// Intro documents are titled by exam ("Banking - SBI PO - Clerk"), not by
// subject, so subject keywords in their titles must not give them a subject.
const isIntroCategory = (category) => /^intro/i.test(category || '');

function subjectKeyForTitle(title) {
  if (CORE_TITLE_TO_SUBJECT[title]) return CORE_TITLE_TO_SUBJECT[title];
  if (REGION_GS_TITLE_PATTERN.test(title) || GS_BOOK_TITLE_PATTERN.test(title)) return 'general_studies';
  const norm = normalizeTitle(title);
  if (NORMALIZED_CORE_TITLES[norm]) return NORMALIZED_CORE_TITLES[norm];
  for (const [pattern, key] of TITLE_KEYWORD_SUBJECTS) {
    if (pattern.test(norm)) return key;
  }
  return null;
}

/**
 * Resolves the dominant thumbnail subject for an exam from its ingested
 * resources rows (title + category). Guide/Precis titles from the core
 * 12-document ingestion map directly and unambiguously; state/UT GS books
 * map to General Studies; anything else (niche/unlabeled exam-specific
 * content, or no content at all) falls back to the neutral default.
 */
export function resolveThumbnailSubject(resourceRows = []) {
  const present = new Set();

  for (const r of resourceRows) {
    if (isIntroCategory(r.category)) continue;
    const key = subjectKeyForTitle((r.title || '').trim());
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
export function resolveSubjectForTitle(title, category) {
  if (isIntroCategory(category)) return DEFAULT_THUMBNAIL_SUBJECT;
  const key = subjectKeyForTitle((title || '').trim());
  return key ? { key, ...THUMBNAIL_SUBJECTS[key] } : DEFAULT_THUMBNAIL_SUBJECT;
}

export function getSubjectByKey(key) {
  if (key && THUMBNAIL_SUBJECTS[key]) return { key, ...THUMBNAIL_SUBJECTS[key] };
  return DEFAULT_THUMBNAIL_SUBJECT;
}

// Free-text subject name -> canonical THUMBNAIL_SUBJECTS entry, for names
// coming from sources that don't use the 17-subject vocabulary directly:
// exams.subject_requirements keys (e.g. "Quantitative Aptitude", "Hindi /
// Regional Language") and quizzes.subject (free text today). Exact label
// match first (case-insensitive), then a small alias table for the known
// naming mismatches -- same "Quantitative Aptitude"/"Maths" -> Mathematics
// alias already established in scripts/rebuild_exam_subjects_from_
// requirements.mjs, extended to the other subject_requirements keys found
// on the live exams table. Anything unmatched (e.g. "Interview", "Physical
// Test" -- real subject_requirements keys but not academic subjects, or
// stray free text like "SSC Stenographer") returns null rather than a
// fabricated match, so callers can decide how to handle it instead of
// silently mis-grouping.
const LABEL_ALIASES = {
  'quantitative aptitude': 'mathematics',
  'maths': 'mathematics',
  'math': 'mathematics',
  // "General Knowledge / GS" is the one subject_requirements flag covering
  // combined GS/GK mock papers (per the actual quizzes.subject retag pass --
  // RRB/SSC/RPF combined-post papers are tagged "General Studies", not "GK
  // & General Awareness") -- aliased to general_studies, not gk_general_
  // awareness, so the exam-relevance filter in QuizCenter.jsx actually
  // matches those quizzes instead of silently hiding them.
  'general knowledge / gs': 'general_studies',
  'general knowledge': 'gk_general_awareness',
  'gk': 'gk_general_awareness',
  'gs': 'general_studies',
  'hindi / regional language': 'hindi',
  'computer knowledge': 'computer_science',
  'it officer': 'information_technology',
  'pcb': 'general_science',
};

const LABEL_TO_KEY = Object.fromEntries(
  Object.entries(THUMBNAIL_SUBJECTS).map(([key, { label }]) => [label.toLowerCase(), key])
);

export function resolveCanonicalSubjectLabel(rawName) {
  const name = (rawName || '').trim().toLowerCase();
  if (!name) return null;
  const key = LABEL_TO_KEY[name] || LABEL_ALIASES[name];
  return key ? { key, ...THUMBNAIL_SUBJECTS[key] } : null;
}

export function getFamilyHex(familyKey) {
  return COLOR_FAMILIES[familyKey]?.hex || COLOR_FAMILIES.teal.hex;
}

// Art shipped in public/thumbnails/ (400x600 WebP), used ONLY to seed
// lc_subjects.thumbnail_url (scripts/seed_thumbnail_urls.mjs). At runtime the
// thumbnail for a subject comes from lc_subjects via src/lib/thumbnailStore.js
// and is changed on the admin Subjects page. Subjects with none fall back to
// a solid colour.
export const SUBJECT_THUMBNAIL_FILES = {
  english: 'English.webp',
  computer_science: 'Computer Science.webp',
  hindi: 'Hindi.webp',
  law: 'LAw.webp',
  mathematics: 'Mathematics.webp',
  electrical_engineering: 'Electrical Engineering.webp',
  general_studies: 'General Studies.webp',
  general_science: 'General Science.webp',
  physics: 'Physics.webp',
  chemistry: 'Chemistry.webp',
  biology: 'Biology.webp',
  environment: 'Environment.webp',
  history: 'History.webp',
  geography: 'Geography.webp',
  polity: 'Polity.webp',
  economy: 'Economy.webp',
  reasoning: 'Reasoning.webp',
  nursing: 'Nursing.webp',
  gk_general_awareness: 'General Knowledge.webp',
  financial_awareness: 'Financial Awareness.webp',
  banking: 'Banking.webp',
  accounting: 'Accounting.webp',
  technical_trades: 'Technical Trades.webp',
  information_technology: 'Information Technology.webp',
  agriculture_rural_dev: 'Agriculture.webp',
  descriptive_writing: 'Descriptive Writing.webp',
  hr_personnel: 'HR-Personnel.webp',
  traffic_road_safety: 'Traffic-Road Safety.webp',
};
