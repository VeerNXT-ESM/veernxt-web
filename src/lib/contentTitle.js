/**
 * `title` on every resources_v2/quizzes row is literally the source
 * filename from the Drive-folder batch ingestion pipeline (extension
 * stripped — see contentEngineProcessor.js), so it carries filename
 * artifacts: an exam-abbreviation prefix, underscores, and a trailing
 * batch/version marker. This is a display-only cleanup — the stored title
 * and the ingestion pipeline are untouched.
 */
export function cleanContentTitle(title, examName) {
  if (!title) return title;
  // Titles/exam names come from admin-entered filenames and folder names —
  // uncontrolled input. A regex built from that input (the acronym prefix
  // below) previously crashed the whole page when an exam name contained a
  // stray "(" or other regex-special character (Learning Center threw
  // "Unterminated group" on real data). Never let a display-formatting
  // helper take the page down — fall back to the raw title on any error.
  try {
    let result = title;

    // 1. Strip a leading exam-abbreviation prefix, derived from exam_name
    //    (no separate abbreviation field exists in the schema — exam_name
    //    and conducting_body are both full names). "Assam Public Service
    //    Commission" -> "APSC", "Staff Selection Commission" -> "SSC", etc.,
    //    matching how these bodies are actually abbreviated.
    const acronym = deriveAcronym(examName);
    if (acronym) {
      const prefixPattern = new RegExp(`^${escapeRegExp(acronym)}[\\s_-]+`, 'i');
      result = result.replace(prefixPattern, '');
    }

    // 2. Strip trailing batch/version markers, iteratively (a filename can
    //    stack more than one: "Title_Final_v2_1"). Only ever removes a
    //    matched trailing token — never rewrites the middle of a title —
    //    so worst case is "didn't clean up as much as hoped," not corruption.
    const suffixPattern = /[\s_-]+(v(?:ersion)?\d{1,2}|ver\d{1,2}|final|draft|copy\d*|new|updated|rev(?:ised)?\d{0,2}|part\d{1,2}|p\d{1,2}|\(\d{1,3}\)|\d{1,3})$/i;
    let prev;
    do {
      prev = result;
      result = result.replace(suffixPattern, '');
    } while (result !== prev);

    // 3. Filename underscores -> spaces, collapse whitespace.
    result = result.replace(/_/g, ' ').replace(/\s+/g, ' ').trim();

    return result || title; // never return an empty title
  } catch (err) {
    console.warn('cleanContentTitle: falling back to raw title', err);
    return title;
  }
}

function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function deriveAcronym(examName) {
  if (!examName) return '';
  const skip = new Set(['of', 'the', 'and', 'for', 'in', 'to']);
  const letters = examName
    .split(/\s+/)
    .filter((w) => w && !skip.has(w.toLowerCase()))
    .map((w) => (w.match(/[a-zA-Z]/) || [''])[0]) // first *alphabetic* char only — skips symbol-only tokens like "(IIIE)" contributing punctuation
    .join('');
  return letters.length >= 2 ? letters.toUpperCase() : '';
}
