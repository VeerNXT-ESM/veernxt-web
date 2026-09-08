# Learning Center Backend — Session Plan

Branch: `learning-center-backend` (created off `main` at `d1a547c`, same tip as `main` at time of writing). Work happens here; merge to `main` when done.

Every item below was checked live against the real database/API today (2026-09-08), not assumed from old notes — status reflects actual current state.

## 1. Fix `lc_exam_resource_map` + `lc_exam_quiz_map` RLS blocking every real user (highest priority, small fix)

**Confirmed live today**: `lc_exam_resource_map` has RLS enabled with zero policies. Service-role key sees 11,239 real mapping rows; the anon key — what every candidate's browser actually uses — sees **0**. This means the precomputed exam→resource mapping (`scripts/map_exam_resources_gemini.mjs`'s whole output) has been completely inert in production since it was built: every single resource lookup silently falls through to `useExamContent.js`'s slower, fuzzier runtime exam-name-matching chain instead, for every exam, this whole time.

`lc_exam_quiz_map` (built this session, not yet populated — see §2) has the exact same RLS-enabled-zero-policies problem already baked in, so it would hit the identical bug the moment it has data.

`lc_exam_intro` (a sibling table) already has RLS correctly disabled — that's the established pattern for these admin-populated, publicly-read lookup tables in this project (this Supabase project auto-enables RLS with zero policies on any new table, which is the actual root cause — worth remembering for any future table).

**Fix**: `ALTER TABLE lc_exam_resource_map DISABLE ROW LEVEL SECURITY;` and the same for `lc_exam_quiz_map`. Apply via `scripts/apply_sql_via_management_api.mjs`, then re-verify with an anon-key read (same check used to confirm the bug today) before calling it done.

## 2. Run the quiz→exam mapping pipeline (blocked on Gemini credits — check first)

`scripts/map_exam_quizzes_gemini.mjs` is built, mechanically verified (correct bucket detection: 10 buckets, 451 quizzes, correct candidate shortlists). **Still blocked as of today** — reconfirmed live with a real `429 RESOURCE_EXHAUSTED` this session. First thing to check at the start of the session: has AI Studio prepay been topped up? If yes: `--sample=2` to sanity-check, then `--execute` for the full run — only ~10 Gemini calls total, trivial cost. If still exhausted, this item stays blocked and everything else can proceed without it.

## 3. Carryover items — long-standing, still untouched

Restated from `docs/status_report.md` §42.4 and earlier, none touched since first flagged:

- **Concurrency pool + exact-match short-circuit for `scripts/map_exam_resources_gemini.mjs`** — agreed in principle in an earlier session, never built. Worth doing if there's still a meaningful number of unmapped exams left to process (check `lc_exam_resource_map` coverage vs. `lc_exams` total count first — may be mostly done already).
- **Whether the user's manual "adding subjects to existing exams" pass ever happened** — check before trusting either mapping script's candidate-building logic (`exams.subject_requirements`) still matches current data. A quick spot-check against a handful of exams should settle this.
- **`scripts/sync_books_to_r2.mjs`'s collision-risk re-check** — likely moot now: per session 40, the book content editor writes straight to `resources_v2`/R2 directly, so this script may no longer be the live publishing path at all. Worth confirming that explicitly and either archiving/deleting the script or updating its header comment, rather than carrying the same "re-check" note forward indefinitely.

## 4. Known content-quality bug, not yet fixed

AFCAT's and Accountant's auto-mapped Intro both point to a `resources_v2` row literally titled "ENGLISH" (category miscategorized at the source-data level, not a mapping-logic bug — found and documented in an earlier session, live-confirmed, never fixed). Small, but a real user-facing content error. In scope if there's time; not the headline item.

## 5. Open question for the user before starting

Anything else specific you want folded into "Learning Center and backend" beyond what's listed above? In particular: the dual-content-system situation (`resources_v2`/`lc_exam_resource_map`, live, vs. the incomplete admin-only `lc_resources`/`lc_subjects` CMS, which never talk to each other) has no resolution plan yet — worth a decision on whether that's this session's scope or a separate future one.

## Workflow

Commit to `learning-center-backend` as work lands (same granular-commit style used elsewhere this project — one commit per logical change, not one giant commit at the end). Build + verify each change before moving to the next (matches this session's pattern: lint/build, plus a live/authenticated check where the change is user-facing, not just a green build). Merge to `main` when the branch is in a state you're happy shipping.
