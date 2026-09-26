// Mock-test questions carry `questions.review_flags` (set by scripts/ingest_mock_tests.mjs when the
// source docx has a defect). Students never see a question with a blocking flag; the flag list is
// the content team's hit list (docs/Central_Mock_Tests_Issues.xlsx). Keep in sync with the SQL that
// fills quizzes.playable_questions (scripts/ingest_mock_tests.mjs).
// PLACEHOLDER_EXPLANATION / NO_EXPLANATION are NOT blocking: the answer is fine, only the explanation is weak.
export const BLOCKING_QUESTION_FLAGS = [
  'NO_STEM',
  'OPTIONS_NOT_FOUND',
  'EMPTY_OPTION',
  'DUPLICATE_OPTIONS',
  'IMAGE_OPTIONS',
  'NEEDS_IMAGE',
  'ANSWER_LEAKED_IN_OPTION',
  'NO_ANSWER_KEY',
  'KEY_TEXT_MISMATCH',
  'EXPLANATION_SELF_CONTRADICTS',
  'DUP_QUESTION',
  'DUP_NUMBER',
];

// Every quiz is listed in the Quiz Center regardless of playable-question count (user directive,
// 2026-09-26): a mock test with few or no playable questions should still show up so the content
// team can see it exists and fix the source paper, rather than it being invisible. 0 means "no
// minimum" -- kept as a named constant (not simply removing the .gte call) so a future minimum is a
// one-line change everywhere this is used.
export const MIN_PLAYABLE_QUESTIONS = 0;

// PostgREST array-overlap literal for `.not('review_flags', 'ov', ...)`.
export const BLOCKING_FLAGS_FILTER = `{${BLOCKING_QUESTION_FLAGS.join(',')}}`;
