# Admin CMS — Guaranteed Per-Exam INTRO Document — Plan

## Status: built and verified live (2026-09-02).

`lc_exam_intro` exists (`sql/lc_exam_intro.sql`, RLS disabled to match every
other admin-CMS table `ExamEditorPanel.jsx` writes to), backfilled via
`scripts/backfill_exam_intro.mjs --execute` (1,058 `auto` + 472 `unset`,
matching this doc's live-verified counts exactly), and the fixed
"Introduction" card is live in `ExamEditorPanel.jsx`'s Syllabus & Resources
tab — confirmed in a real browser session (auto-populated read-only view
with Preview/Override, the unset inline editor, Override toggling, and Save
persisting).

One correction found while sanity-checking the 121-exam tie-break rule
before running the backfill: `resources_v2.exam_name` carries a "N. "
ordinal prefix `lc_exams.name` never has (same issue already documented for
`scripts/map_exam_resources_gemini.mjs`) — the exact-name fallback tier
needed the same prefix-stripping fix to actually reach the 29 exams this
doc counted, or it silently found only 17.

## The ask

Every exam should have an "Intro" document visible in the admin CMS
(`/admin/exams` → exam editor). It should not be something an admin has to
find and attach manually — it should already be there, pre-populated, with
a manual-entry fallback for exams that genuinely have nothing yet.

## What's actually going on — two parallel content systems

This took real digging because there are **two separate, non-overlapping
systems** for connecting content to an exam, both keyed off the same
`lc_exams` table:

| | Legacy (live, candidate-facing) | "Learning Center CMS" (admin-only) |
|---|---|---|
| Tables | `resources_v2` + `lc_exam_resource_map` | `lc_resources` + `lc_subjects` + `lc_exam_subjects` + `lc_subject_resources` |
| Who reads it | `useExamContent.js` → `ExamSyllabus.jsx`, `ExamContentPreview.jsx`, `Dashboard.jsx`, `JobBoard.jsx` — this is what candidates actually see | `ExamEditorPanel.jsx`, `ResourcesTab.jsx` — admin-only, confirmed zero references anywhere outside `src/pages/admin/` |
| Structure | Resource attached directly to an exam, with a `category` (Intro/Guide/Precis/PYQ) | Resource attached to a **subject**, and a subject attached to an exam — there is no exam-level (subject-less) attachment point in the UI at all |
| Intro content | **713 resources**, category='Intro', already live | **0** rows with `resource_type='Intro'` in `lc_resources` (98 rows total, all still `status='draft'`, all with `storage_base_url: null` — no real file content behind any of them yet) |

**This is the actual gap.** The content the user means by "already
ingested" is the 713 real Intro documents sitting in the legacy,
candidate-facing system. The admin CMS the user is looking at has no path
to show them at all — not because of a bug, but because its data model
(subject → resource) structurally has no slot for something that belongs
to the exam itself, not to any subject.

## Live-verified coverage of the existing 713 Intro documents

- **1,530 total exams.**
- **1,058 (69%)** already have a usable Intro: 1,029 via a precomputed
  `lc_exam_resource_map` row (category='Intro'), plus 29 more reachable
  only through the runtime exact-name fallback chain (no map row, but
  `resources_v2.exam_name` matches `lc_exams.name` exactly).
- **472 (31%)** have no Intro anywhere, mapped or fallback.
- **121 exams have more than one mapped Intro** — an ambiguity that needs
  a tie-break rule before this can be "the" Intro shown per exam.

## Plan

### 1. New table: `lc_exam_intro`

```sql
create table if not exists lc_exam_intro (
  exam_id uuid primary key references lc_exams(id) on delete cascade,
  resource_id text,              -- points into resources_v2.resource_id when auto-populated
  manual_title text,             -- used only when there's no resource_id
  manual_body text,              -- admin-typed fallback content
  source text not null check (source in ('auto', 'manual', 'unset')),
  updated_at timestamptz not null default now()
);
```

One row per exam, always. `source='auto'` means it was backfilled from
the existing legacy mapping; `'manual'` means an admin typed it directly
(for the 472 gap exams, or to override a bad auto-match); `'unset'` is the
placeholder state before anyone has touched it — lets the admin UI show
"needs attention" instead of silently looking empty.

Kept as its own table rather than overloading `lc_exam_resource_map`
(which models "pointer to an existing resources_v2 row" — it has no place
to hold admin-typed freeform text) or extending `lc_resources`/
`lc_subject_resources` (which would require inventing a fake subject for
something that is explicitly not subject-scoped).

### 2. Backfill script: `scripts/backfill_exam_intro.mjs`

For each of the 1,530 `lc_exams` rows:
1. Look up `lc_exam_resource_map` for `category='Intro'`. If exactly one
   row, use it (`source='auto'`).
2. If more than one (the 121 ambiguous cases): pick the highest-confidence
   row (`high` > `medium` > `low`); if still tied, the earliest
   `created_at`. Log every exam this rule fires on so it's a reviewable
   list, not a silent guess.
3. If zero rows, fall back to the exact-name match against
   `resources_v2.exam_name` (the same 29 exams found live this session).
4. If still nothing, insert with `source='unset'`, `resource_id=null` —
   this is the 472-exam punch list for manual entry, made visible rather
   than left as an absence no one notices.

Idempotent (upsert on `exam_id`), safe to re-run as the legacy mapping
data changes.

### 3. Admin UI — `ExamEditorPanel.jsx`

Add a fixed **"Introduction"** card at the top of the "Syllabus &
Resources" tab, above the Subjects list — not draggable, not removable,
not part of `AddResourceDrawer`'s subject-scoped search:
- If `resource_id` is set: show the resource's title (joined from
  `resources_v2`) as read-only, with a link to preview it. Optional: an
  "Override" action that opens the same manual-entry editor below, for
  the cases where the auto-match turns out to be wrong.
- If unset/manual: an inline title + rich-text-or-plain-text body editor,
  saving directly to `lc_exam_intro.manual_title`/`manual_body` with
  `source='manual'`.

This is intentionally read-mostly for the 1,058 already-covered exams —
no "select and assign" step, matching the explicit ask.

### 4. Explicitly out of scope for this plan (flag, don't assume)

Whether admin-entered manual Intro content (`lc_exam_intro.manual_*`)
should also render on the **candidate-facing** exam page is a separate
decision — `useExamContent.js` currently only knows about
`resources_v2`/`lc_exam_resource_map`, not this new table. Wiring that in
is a natural follow-up but wasn't asked for here and changes what
candidates see, so it should be its own explicit go-ahead, not bundled
into "housekeeping."

## Open question before building

The 121-exam tie-break rule (highest confidence, then earliest) is a
reasonable default but a real judgment call — worth a quick look at a few
of those 121 cases to confirm the rule doesn't systematically pick the
wrong one before running the backfill for real.
