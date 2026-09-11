# Learning Center & Backend — Engineering Handoff

**Snapshot date: 2026-09-08.** This is a current-state architecture reference, not a
changelog — it describes what's actually live in production right now, verified
directly against the codebase and the live Supabase schema (see §0 for how). For the
session-by-session history of *how* it got this way, see `docs/status_report.md`
(chronological, 43 sessions deep, referenced throughout below by `§N`).

This doc is written for **Shreya**, who is taking over ownership of the Learning
Center and its backend. **Gargi** provides content insight; **Souvik** provides
backend input from time to time. Open a Claude Code session in this repo and point it
at this file when you need context — it's written to be queried, not just read once.



---

## 0. How this doc was built (and how to keep it honest)

Every schema fact below came from querying the **live production Supabase database
directly** — not from reading old docs, not from guessing at code. The technique,
reusable any time you need to check "is this actually true right now":

```bash
# Write a read-only SQL query to a .sql file, then:
node scripts/db/apply_sql_via_management_api.mjs path/to/query.sql
```

This runs against the real Postgres instance via the Supabase Management API
(`SUPABASE_ACCESS_TOKEN` in `.env`), not the anon/service-role REST layer, so it can
run arbitrary SQL including `information_schema` introspection. **Only ever run
`SELECT` statements this way unless you specifically mean to change production data**
— this script has no dry-run mode and no undo.

The project's own working habit, learned the hard way across many sessions: **verify
against the live app/DB, don't trust old docs or code comments.** Table names get
renamed, features get half-shipped, comments go stale. Every claim in this document
that matters was checked against either the live schema (as of 2026-09-08) or the
actual current code (file:line cited) — but by the time you read this, more time will
have passed. If something here looks off, re-run the introspection query and see.

---

## 1. Read this first — the four things that will bite you

1. **The admin CMS has no real authentication.** Login is a hardcoded password
   compiled into the JS bundle; the "session" is an unsigned `localStorage` blob the
   admin shell trusts blindly; and the one endpoint that mints new admin accounts
   (`api/admin/admins.js`) has **zero server-side auth check at all**. Full detail in
   §5.1. This is the single most important thing to fix before this app has any real
   stakes riding on admin-only data.
2. **The points/gamification system doesn't run.** It was fully built — schema,
   RPC functions, frontend calls, everything — but the one-time SQL migration
   (`sql/points_system.sql`, `sql/rewards_system.sql`) was never actually applied to
   the live database. Every touchpoint fails silently by design, so nothing looks
   broken in the UI; it just quietly does nothing. Full detail in §7.
3. **There are two parallel exam catalogs** (`exams` and `lc_exams`) and **three
   parallel content-and-question systems** (`resources`+`lc_exam_resource_map`,
   `quizzes`+`questions`, `pyq_papers`+`pyq_questions`), each with its own quirks and
   only loosely bridged to each other. §2 is a map of this — read it before touching
   any query that joins across them.
4. **Gemini API credits are at $0**, and have been for several sessions running (most
   recently reconfirmed in `docs/status_report.md` §43.14). This blocks: the
   exam↔quiz mapping pipeline (`lc_exam_quiz_map` has zero rows as a direct result),
   the last ~17 unmapped exams in the exam↔resource pipeline, and forces the PYQ
   OCR/reconstruction pipeline onto three different non-Gemini fallbacks (Groq,
   FAL/OpenRouter, Replicate). If a fresh Gemini prepay balance shows up, this is the
   single highest-leverage unblock available — see §8.7.

---

## 2. The data model — two exam catalogs, three content systems

This is the part that trips people up fastest, so it gets its own section before
anything else. Row counts below are live as of 2026-09-08.

### 2.1 Two exam catalogs

| | `exams` (legacy) | `lc_exams` (current CMS) |
|---|---|---|
| Row count | 1,534 | 1,530 (**all** `status='published'`) |
| Primary key | `exam_id` (varchar) | `id` (uuid) |
| Backs | The profiling/recommendation engine (`api/profile/recommend.js`), and — critically — `api/exams.js`, which every Learning Center exam-detail page calls | The admin CMS (`ExamsPage.jsx` and friends), and everything `lc_exam_*` |
| Syllabus | `subject_requirements` jsonb column directly on the row | *(no equivalent column — there is no `lc_exam_subjects` table despite it being mentioned in `docs/status_report.md` §27.6; that plan doesn't appear to have shipped as a separate table)* |
| Other notable columns | `conducting_body`, `career_track`, `state_ut`, `region_id`, `conducting_body_id`, `thumbnail_subject`, `content_completeness` (jsonb) | `conducting_body_id` (FK), `region_id` (FK), `category`, `thumbnail_template_id` (FK), `accent_color`, `also_listed_as` (jsonb), `thumbnail_subject` |

They're bridged by **`lc_exam_legacy_map`** (1,525 rows: `lc_exam_id`,
`legacy_exam_id`, `match_method`, `match_confidence`) — but here's the trap:
**`api/exams.js`, the endpoint every exam-detail page actually calls, reads the
legacy `exams` table directly by `exam_id`, and every caller passes it an
`lc_exams.id` value.** It works today only because `lc_exams.id === exams.exam_id`
happens to hold as a direct identity for every exam currently in play — the code
never goes through `lc_exam_legacy_map` for this read at all. If that identity ever
breaks (e.g. a future migration regenerates `lc_exams.id` independently), every
exam-scoped link in the Learning Center (`/exam/:id`, and the `?exam=:id` querystring
scoping on PYQ Center and Quiz Center) breaks simultaneously. Worth a comment in the
code, and worth remembering before "cleaning up" either table.

### 2.2 Three content-and-question systems

These do **not** share a schema, a foreign key, or an exam-matching strategy. Each
has its own accumulated quirks:

**A. Guide/Précis/Intro documents — `resources` (15,327 rows, all `status='Published'`)**

- Was called `resources_v2` until 2026-09-08; `resources_v2` now exists only as a
  **compatibility VIEW** over the real `resources` table (kept for anything not yet
  repointed).
- Key columns: `resource_id`, `title`, `exam_name` (free text), `subject`,
  `category` (Postgres CHECK constraint: only `Guide`/`Intro`/`Precis` — PYQ/Mock
  content is deliberately routed elsewhere, never into this table), `conducting_body`,
  `chapter_count`, `storage_base_url` (R2 prefix), `thumbnail_url`, `is_freemium`,
  `is_locked`, `unlock_cost`, `format` (`'html'` legacy or `'blocks'` current,
  default `'html'`).
- Linked to exams via **`lc_exam_resource_map`** (10,737 rows: `exam_id`,
  `resource_id`, `category`, `confidence`, `reasoning`, `source` — mostly
  `'gemini'`), the output of the exam↔resource Gemini mapping pipeline (§8.5) — this
  is a genuinely working, mostly-complete mapping (1,513 of 1,530 exams have some
  mapping as of the last recorded run).
- Where the map doesn't cover an exam, `src/hooks/useExamContent.js` falls back to a
  live exact→`ilike`→career-track-keyword match against `resources.exam_name` at
  read time (`useExamContent.js:49-63`) — this is why the Learning Center still shows
  *something* for exams that predate the mapping pipeline.
- **Row duplication is a known, designed-around fact of life** — the same physical
  document often exists as several `resources` rows (one per exam it was originally
  ingested for, before the shared-master-document approach). The book-content admin
  editor (`api/admin/save-resource.js`) matches/updates by `(category, title)` via
  `ilike`, not by `resource_id`, specifically to keep duplicates converging rather
  than drifting apart on edit.

**B. Quizzes — `quizzes` (451 rows) + `questions` (43,930 rows)**

- Independent system, `exam_name` is free text — **no foreign key to either exam
  catalog.**
- `lc_exam_quiz_map` (schema exists: `exam_id`, `quiz_id`, `confidence`, `reasoning`,
  `source`) has **zero live rows** — the Gemini mapping pipeline for this
  (`scripts/exam-mapping/map_exam_quizzes_gemini.mjs`) is built but has never
  successfully run, blocked on Gemini credits.
- `QuizCenter.jsx` already anticipates this: it checks `lc_exam_quiz_map` first, and
  falls back to a subject-overlap heuristic against the exam's `subject_requirements`
  when no mapping rows exist — which, today, is **every exam**, since the table is
  empty. The code's own comment admits this fallback "barely discriminates for common
  subjects." Nothing is broken, but precision is currently low.
- Attempts are tracked in **two separate tables written on every completion**:
  `quiz_attempts` (older, unconditional insert) and `user_quiz_attempts` (newer,
  best-effort try/catch). Neither is currently *read* anywhere in the app for
  display (no "past attempts" UI exists yet) — both are write-only today.

**C. Previous-year questions — `pyq_papers` (754 rows) + `pyq_questions` (76,900 rows)**

- A third, fully independent system. `pyq_papers.exam_name` is free text with **no
  foreign key at all** to either exam catalog.
- `PyqCenter.jsx`'s exam-scoping (`?exam=:id`) is a **bidirectional case-insensitive
  substring match** between `pyq_papers.exam_name` and the target exam's name — a
  best-effort fuzzy match, not a real join. The page explicitly distinguishes "no
  PYQs matched this exam" from "no PYQs exist at all," because the fuzzy match
  legitimately produces zero-result exams.
- This is a review/practice format, not a scored quiz — questions render with
  answers/explanations visible once unlocked; there's no attempt-tracking table
  involved here at all.

### 2.3 Supporting catalog tables

| Table | Rows | Purpose |
|---|---|---|
| `lc_conducting_bodies` | 671 | Exam-issuing organizations; `name`, `website`, `logo_path` |
| `lc_regions` | 37 | Central/State/UT hierarchy (`level`, `name`) |
| `lc_exam_intro` | 1,530 (one per exam) | Guaranteed one-row-per-exam intro blurb — `manual_title`/`manual_body` (hand-written) or `resource_id` (auto-picked from the resource map), `source` tracks which |
| `lc_thumbnail_templates` | — | Background templates for exam thumbnails |
| `lc_tags` / `lc_exam_tags` | — | Lightweight exam tagging, minimal schema |
| `user_exam_targets` | 1 | Which exam a user has set as their active/primary prep target (`is_primary`, `status`) |
| `user_resource_reads` | 1 | Per-user resource completion tracking (`status`, `opened_at`, `completed_at`) — **this one is real and correctly wired**, see §3 |
| `user_profiles` | 31 | Candidate profile + `veer_score` + subscription state — see §7 |

---

## 3. Candidate-facing Learning Center — page by page

All routes below are `AuthGuard`-wrapped in `src/App.jsx`. Flow:

```
LearningCenter.jsx  (/learning-center — catalog browse + personalization)
  └─ ExamSyllabus.jsx  (/exam/:examId — single-exam hub)
       ├─ SecureReader.jsx  (/reader/:id — resource content)
       ├─ InteractiveQuiz.jsx  (/quiz/:id — quiz engine)
       ├─ QuizCenter.jsx  (/quiz-center — subject-browsed quiz catalog)
       └─ PyqCenter.jsx  (/pyq-center) → PyqReader.jsx  (/pyq-reader/:id)
```

**`src/hooks/useExamContent.js`** is the load-bearing shared piece — the one place
that resolves "what content belongs to exam X," consumed by `ExamContentPreview.jsx`
and `Dashboard.jsx` directly:

1. **Resources**: `lc_exam_resource_map` first; falls back to the exact→`ilike`→
   career-track chain against `resources.exam_name` if the map has nothing (§2.2A).
   A follow-up pass (`upgradeToCanonicalFormat`) redirects any `format='html'` row to
   a same-title/category sibling with `format='blocks'`, working around the
   duplicate-row situation.
2. **Intro**: always from `lc_exam_intro` directly, independent of the resource map.
3. **Quizzes**: always via the exam-name matching chain against `quizzes` — the
   resource map's Gemini mapping never covered quizzes (that's `lc_exam_quiz_map`,
   currently empty — §2.2B).
4. **Completion**: reads `user_resource_reads` for `completedResourceIds`;
   `markAsCompleted()` upserts into it on `(user_id, resource_id)` conflict.

### 3.1 `LearningCenter.jsx` (`/learning-center`)

Four sections: Search Results, My Exams, Preparation Centers, Skill Development.

- Fetches **the entire `lc_exams` table** once, all filtering (region mode, category,
  conducting body, search) happens client-side in `useMemo` chains.
- Personalization reads `user_profiles.recommendations` (a jsonb array the profiling
  engine writes elsewhere) to build `examMatches`.
- **"My Exams" is currently always empty** for every user — see the dead-code note
  below.
- The primary-target hero ("Your Current Mission") reads `user_exam_targets`;
  "Start Preparing"/"Make Primary" calls RPC `set_primary_exam_target(p_exam_id)`
  (an atomic demote-then-upsert, defined in `sql/user_learning_journey_fixes.sql`).

**Dead-code note — `loadPersonalization()`**: this function queries
`point_transactions` to compute per-exam "explored" counts. That table doesn't exist
in production (§7), so the query errors, is caught, and `openedIds` stays `[]`.
Consequence: `examProgress[name].explored` is permanently `0`, and since the "My
Exams" section requires `explored > 0`, **it can never show anything, regardless of
what a user has actually read.** This is a real, live bug worth fixing (or at minimum
flagging to whoever owns the roadmap) — either apply the points migration (§7) or
recompute "explored" from `user_resource_reads` instead, which is already real and
working.

### 3.2 `ExamSyllabus.jsx` (`/exam/:examId`)

Single-exam hub. Fetches the exam header via `GET /api/exams?examId=` — which, per
§2.1, reads the **legacy `exams` table**, not `lc_exams`. Renders subject chips from
`exam.subject_requirements`, two practice-loop shortcut cards (Quiz Center / PYQ
Center, exam-scoped via querystring), the main material grid via
`ExamContentPreview` (`variant="subjects"`), and a static `/subscribe` upsell.

### 3.3 `PyqCenter.jsx` / `PyqReader.jsx`

Fetches the **entire `pyq_papers` table** client-side (754 rows, no pagination),
filters/searches in-browser. Exam-scoping is the fuzzy substring match described in
§2.2C. Gating via `canAccessResource(tier, 'PYQ')` (§4) applied uniformly regardless
of individual paper metadata. `PyqReader.jsx` shows questions with answers/
explanations inline once unlocked — a review format, no scoring/attempt tracking.

### 3.4 `QuizCenter.jsx` (`/quiz-center`)

Fetches `quizzes` filtered to `category='Mock Test'`, groups client-side by canonical
subject (`thumbnailTaxonomy.js`). Exam-scoping tries `lc_exam_quiz_map` first
(currently always empty, §2.2B), then falls through to the documented subject-overlap
fallback — in practice, **every exam's Quiz Center view runs on the fallback today.**
One free quiz attempt total across the whole catalog, tracked via
`user_profiles.free_quiz_used` (not per-quiz).

### 3.5 `InteractiveQuiz.jsx` (`/quiz/:id`)

Fetches one quiz + its questions, strips legacy "Correct Answer:"/"Explanation:"
markers baked into option text (a content-authoring artifact from older ingestion),
randomly samples down to 6 questions regardless of the paper's real size. Session
state persists to `localStorage` (not the DB) so a refresh can resume mid-quiz. On
finish, writes to **both** `quiz_attempts` and `user_quiz_attempts` (§2.2B), calls
`awardPoints('QUIZ_COMPLETE', ...)` (dead — §7), and flips `free_quiz_used` if this
was the free attempt.

### 3.6 `SecureReader.jsx` (`/reader/:id`)

Fetches one `resources` row, then lazy-loads each chapter as static JSON directly
from R2 (`${storage_base_url}chapters/chapter-N.json`) — not a Supabase query. Two
shapes handled per `format`: `'html'` (legacy, `dangerouslySetInnerHTML`) or
`'blocks'` (current, `BlockRenderer`). On mount, calls
`awardPoints('RESOURCE_OPENED', ...)` — also dead, and this is specifically the write
path that was meant to feed §3.1's broken "explored" count.

**Two more real, live gotchas here:**
- **"Mark as Finished" inside the reader doesn't persist anywhere** — it's local
  component state only, lost on refresh/navigation. This is a *different* completion
  mechanism from the checkbox in `ExamContentPreview.jsx`'s resource rows/tiles
  (which correctly calls `useExamContent`'s `markAsCompleted`, persisting to
  `user_resource_reads`). So a candidate can mark a resource done from the catalog
  grid (works) but not from inside the reader itself (doesn't) — the more intuitive
  place to do it is the one that silently fails.
- `canAccessResource(tier, category, chapterIndex)` is called with a third argument
  at every `SecureReader.jsx` call site, but `subscriptionAccess.js`'s actual
  function signature is `(tier, category)` — the third argument is silently ignored.
  There's no per-chapter graduated unlock despite the call sites suggesting one was
  intended; access is all-or-nothing per resource category.

### 3.7 Dashboard.jsx — the Learning-Center-relevant sections

- **Mission Objective card** (via `TodayObjectiveCard`): prefers the user's primary
  target exam over their top profiling recommendation. Progress is computed via
  `countProgress()` against `completedResourceIds` from `user_resource_reads` — **this
  one is correct and working**, real DB-backed completion tracking, unlike the
  point_transactions-based counters elsewhere.
- **"Your Next Step" card**: has its own, separate, broken progress bar — sourced
  from the same dead `point_transactions` query as §3.1, but here with **no error
  check at all** (`.then(({ data }) => ...)` destructures only `data`, so a query
  error resolves to `undefined`, silently coerced to `[]`). Permanently shows 0%
  progress. Same root cause as §3.1's "My Exams," worth fixing together.

### 3.8 Dead code worth knowing about

`src/hooks/useLearningContent.js` is fully built (paginated resources+quizzes fetcher
with its own exam-name bridging logic) but **nothing in the codebase imports it** —
only its own definition file references the name. Looks like an earlier
Learning-Center implementation that was superseded by the current inline logic in
`LearningCenter.jsx` but never deleted. Safe to remove, or useful as a reference for
how an earlier iteration approached the same problem.

---

## 4. Paywall / subscription tier logic

Everything lives in `src/lib/subscriptionAccess.js`. Tiers, ranked:

```
FREE(0) < SCORE_UNLOCK(1) < SCORE_CV(2) < MONTHLY = ANNUAL = BIENNIAL(3) < PREMIUM(4)
```

- `SCORE_UNLOCK`/`SCORE_CV` are one-time Razorpay purchases, never expire.
- `MONTHLY`/`ANNUAL`/`BIENNIAL`/`PREMIUM` are time-based, checked against
  `user_profiles.subscription_expires_at`; an expired subscription demotes back to
  `FREE` (`getEffectiveTier()`). This is computed **client-side, independently on
  every page** — no shared context/cache, each page re-fetches `user_profiles`.
- `canAccessResource(tier, category)`: rank ≥ MONTHLY unlocks everything. Below that,
  only `category IN ('intro', 'guide')` is free; `'precis'`, `'pyq'`, anything else is
  locked.
- `canTakeQuiz(tier, freeQuizUsed)`: rank ≥ MONTHLY is unlimited; otherwise exactly
  one free attempt total (`user_profiles.free_quiz_used`), then locked.
- `subscription_tier` is written in exactly **one** place: `api/payments/actions.js`,
  after Razorpay signature verification (`verify-payment` action). No webhook path —
  verification is entirely client-round-trip-driven (order → pay → client posts back
  payment/order/signature → server HMAC-verifies → updates `user_profiles`).

**Gating is purely category-string + tier-rank. It does not read `unlock_cost`,
`is_freemium`, or `is_locked`** — those columns exist on both `resources` and
`quizzes`/`questions`, get written at content-ingestion time to mirror the exact same
rule the frontend hardcodes independently (Intro/Guide free, everything else locked),
but no runtime code anywhere reads them for an access decision. They're descriptive
metadata that happens to agree with the real rule, not the thing driving it.
`unlock_cost` specifically is fully dead — zero references anywhere in application
code. There is no "spend points to unlock a specific item" flow implemented; the only
place points can be spent is the (also currently broken, §7) merch rewards store.

---

## 5. Admin CMS

Dark-themed, unified sidebar shell (`AdminShell.jsx` + `AdminCMS.css`, CSS custom
properties scoped under `.admin-shell`). Routes live under `/admin/*` in `App.jsx`.

### 5.1 Auth model — read this before relying on anything else in this section

**There is no real authentication.** In order of severity:

- `AdminLogin.jsx` hardcodes the Super Admin credential directly in the JS bundle
  (`veernxt.esm@gmail.com` / a fixed password) — and displays it in plaintext in the
  UI itself as a "help" box. On match, it writes a plain unsigned object to
  `localStorage.admin_session` and navigates to `/admin`.
- A second, separate "registered admins" mechanism (`localStorage.admin_registry`)
  checks the password against the *same single hardcoded string* regardless of what
  was actually issued to that admin — meaning even properly-invited admins share one
  password in practice. This registry appears to be populated by nothing in the
  current code path, so it's likely dead in practice, but the design itself is the
  concerning part.
- `AdminShell.jsx` is the only route guard: reads `localStorage.admin_session` on
  mount; if present, trusts it verbatim (role, permissions, everything) — **no server
  verification, no expiry, no signature.** Anyone with devtools access can grant
  themselves Super Admin by writing directly to `localStorage`.
- Two standalone admin routes (`AdminQuizEditor`, `BookChapterBrowser`) sit outside
  `AdminShell`'s wrapper and duplicate their own redundant `localStorage` check —
  easy to forget if a new full-page admin route gets added later.
- Server-side, the only real gate that exists anywhere is a **shared static secret**
  (`ADMIN_API_SECRET` / client-bundled `VITE_ADMIN_API_SECRET`) compared against an
  `x-admin-api-secret` request header — visible to anyone who reads the JS bundle, so
  it's a "keep out casual public traffic" gate, not a real secret. This is present on
  `api/admin/redemptions.js` and the `r2-upload`/`books-*` branches of
  `api/admin/save-resource.js`.
- **`api/admin/admins.js` — the endpoint that creates real Supabase Auth admin
  accounts — has no authentication check of any kind.** Not even the shared-secret
  header. Anyone who can reach `POST /api/admin/admins` with
  `{action:'invite', email, role:'Super Admin', ...}` can mint themselves a real
  super-admin Supabase Auth account server-side. This is the top-priority item to fix
  before this admin panel handles anything with real stakes.
- `api/admin/save-resource.js` also has an **unauthenticated legacy branch** (the
  default/"V2 resource save" path, reached when the request body doesn't match any
  known `type`) that upserts directly into the live `resources` table using the
  service-role key. Nothing in the current frontend calls it this way anymore (it
  looks like an orphaned earlier resource-editor iteration), but the endpoint itself
  is still live and reachable.

Beyond the endpoints above, every admin page that writes directly via the browser
Supabase client (most of them — see the table in §5.2) uses the **anon key**, so
whatever safety exists there is entirely whatever Row Level Security policies happen
to be configured on those tables — nothing in the client code enforces admin-only
writes itself.

### 5.2 Per-page summary

| Page | What it manages | Write path |
|---|---|---|
| `ExamsPage.jsx` + `ExamEditorPanel.jsx` | Browse/filter/edit `lc_exams` (region→body drill-down, search, paginated 20/page); edit core fields, tags | Direct Supabase (anon key) |
| `ExamIntroCard.jsx` | View/edit `lc_exam_intro`; shows a live read-only preview of the auto-picked resource | Direct Supabase |
| `ExamStatusCard.jsx` | Toggle `lc_exams.status` published/draft | Direct Supabase |
| `ConductingBodiesPage.jsx` | 671 conducting bodies; logo upload | R2 upload (secret-gated) + direct Supabase for the URL write |
| `BooksPage.jsx` + `BookChapterBrowser.jsx` | Full content CMS for `resources` (Guide/Précis, `format='blocks'`): edit chapters block-by-block, duplicate+rebrand a book, delete (wipes R2 + all duplicate rows) | `api/admin/save-resource.js` `books-*` actions, secret-gated |
| `QuizzesPage.jsx` | Browse/search `quizzes`, bulk subject-assign; links to `AdminQuizEditor.jsx` for full quiz/question editing | Direct Supabase |
| `PyqPapersPage.jsx` | Browse/search `pyq_papers`, bulk subject-assign; **no per-paper editor exists yet** | Direct Supabase |
| `UsersPage.jsx` | Read-only `user_profiles` directory | Read-only |
| `RolesPermissionsPage.jsx` | List/invite/revoke admin accounts — these are real Supabase Auth users with `user_metadata.role`, **there is no `admins` table**; invite creates a real `auth.users` row with a one-time-shown temp password; revoke only flips role metadata to `'candidate'`, doesn't delete the account | `api/admin/admins.js` — **unauthenticated**, see §5.1 |
| `AdminRewardsQueue.jsx` | Reward redemption queue (approve/ship/deliver/cancel), reads/writes the real `reward_redemptions` table via RPC `update_redemption_status` — **this page is fully live, not dead code**, though it's part of the same rewards feature bundle that depends on the unapplied `sql/rewards_system.sql` migration (§7) | `api/admin/redemptions.js`, secret-gated correctly |
| `AdminJobs.jsx` | Browse/edit job postings, link/unlink to `lc_exams` | Reads via `/api/jobs`, writes direct Supabase |

`ExamThumbnail.jsx` is pure presentation — colour-block thumbnails keyed off
`thumbnail_subject` (17-key taxonomy in `src/lib/thumbnailTaxonomy.js`) and
`accent_color`. Illustrated/generated thumbnail art is deliberately not used —
solid colour blocks only, confirmed as a standing preference, not a placeholder.

None of the admin pages have a UI for managing `lc_exam_resource_map` or
`lc_exam_quiz_map` directly — those tables are purely pipeline-populated (Gemini),
with zero admin-editable surface today. Worth remembering the next time someone asks
"why can't I just fix this one exam's mapping in the admin panel."

---

## 6. Backend API layer

Vite/React 19 SPA on Vercel; all backend logic is `api/*.js` Vercel serverless
functions (plain Node, not Vite-bundled). There are 11 physical files under `api/`
right now — deliberately kept low, because **Vercel's Hobby plan caps a project at 12
serverless functions** (`docs/status_report.md` §36.3 records a real deploy failure
from exceeding this). Several files use a `?fn=action` query-param dispatch pattern
internally specifically to stay under that cap (`api/points/actions.js`,
`api/payments/actions.js`, `api/auth/account.js`, `api/auth/otp.js`,
`api/admin/admins.js`, `api/private-sector/router.js`) — `vercel.json` rewrites
pretty URLs like `/api/payments/create-subscription` to
`/api/payments/actions?fn=create-subscription`. **`api/v1/router.js` is not a general
API router** — it only serves the AI chat-completions proxy family, unrelated to the
Learning Center; don't assume it fronts anything else.

**Two auth patterns**, and every route uses exactly one:

- **Supabase JWT bearer**: client sends `Authorization: Bearer <access_token>` from
  `supabase.auth.getSession()`; server verifies via `supabaseAdmin.auth.getUser()`.
  Used by `api/points/actions.js`, `api/profile/recommend.js` (optional — proceeds
  unauthenticated but skips the save/points step if absent), private-sector
  candidate/employer routes.
- **`x-admin-api-secret` shared-secret header**: see §5.1. Used by admin routes.
- `api/exams.js` and `api/jobs.js` have **no auth at all** — public GET endpoints,
  service-role key used server-side only (never exposed to the browser).
- `api/auth/otp.js`/`api/auth/account.js` are pre-auth by nature and instead use
  short-lived HMAC-signed tokens (`SUPABASE_JWT_SECRET`-keyed) passed between the
  OTP-verify and register/reset steps.

Every `api/*.js` file that needs elevated access builds its **own** service-role
Supabase client inline — there's no shared server-side singleton module. Direct
browser-to-Supabase calls always use the anon key (`src/lib/supabase.js` throws at
startup if `VITE_SUPABASE_ANON_KEY` is missing), so their safety is entirely a
function of RLS policies, not app code.

`api/payments/actions.js` (Razorpay): order-based checkout (not the Razorpay
Subscriptions API), plan amounts hardcoded in paise, a `DEVTEST=true` env override
forces ₹1 test orders, HMAC-SHA256 verification of the client-returned
payment/order/signature triple, then a direct `user_profiles` update. No webhook —
verification is entirely client-round-trip-driven.

---

## 7. The points system — what's real, what isn't

This needed three independent agents cross-checking it to nail down precisely, so
it's worth stating cleanly in one place.

**What was built**: `sql/points_system.sql` (a one-time SQL-editor script, since "this
repo has no migration tooling") defines a `point_transactions` ledger table, two new
`user_profiles` columns (`points_balance`, `points_lifetime` — note: **not**
`veer_score`, see below), and a `SECURITY DEFINER` RPC function `award_points(...)`
that inserts a transaction and increments the balance, `EXECUTE`-restricted to
`service_role` only. `sql/rewards_system.sql` similarly defines `reward_redemptions`,
`rewards`, and a `redeem_reward`/`update_redemption_status` RPC pair for a merch
rewards store.

**What's actually live**: per direct schema introspection, **none of it** —
`point_transactions`, `points_balance`, `points_lifetime`, and the RPC functions do
not exist in production. The migration step was written but never actually run
against the live database.

**What happens at runtime, precisely**:
- `src/lib/awardPoints.js` fire-and-forget POSTs to `/api/points/actions`
  (`type:'award'`), called from `SecureReader.jsx` (`RESOURCE_OPENED`) and
  `InteractiveQuiz.jsx` (`QUIZ_COMPLETE`). The server-side RPC call genuinely errors
  (undefined function), the handler correctly returns HTTP 500 — but `awardPoints.js`
  only `console.error`s the failure and never surfaces it, by design ("earning points
  is a bonus, never a blocker").
- `api/profile/recommend.js` also tries to award `PROFILING_COMPLETE` points after a
  successful profiling run, wrapped in its own try/catch specifically so a points
  failure never fails profiling itself.
- Reads degrade the same way. `LearningCenter.jsx`'s `point_transactions` query
  explicitly checks for an error and has a comment noting *"point_transactions may
  not exist"* — a previous developer already knew about this and coded around it.
  `Dashboard.jsx`'s equivalent query does **not** check `.error` at all (destructures
  only `{ data }`), so it degrades silently to the same empty-array result without
  even a console warning.
- `src/lib/useAccountSummary.js` (which drives the header points badge) has an
  explicit comment: *"points_balance won't exist until sql/points_system.sql has
  been run against the database... fine to skip silently."*

**Net effect**: the entire points/gamification feature — earning points for reading,
quizzing, profiling, CV-building; redeeming points for merch — is currently
non-functional in production, and every single touchpoint was deliberately written to
fail silently, so it reads to end users as "the points widget just always shows
nothing" rather than a visible bug. **Fixing it is one manual step**: run
`sql/points_system.sql` then `sql/rewards_system.sql` against the live Supabase
instance via the SQL editor (or via `scripts/db/apply_sql_via_management_api.mjs`,
§0 — this is exactly the kind of DDL that script exists for, though note it's the one
case in this whole doc where you'd genuinely be writing to production, so treat it
with the appropriate care and maybe loop in Souvik or the user first).

**`veer_score` is unrelated and fully working — don't confuse the two.** It's an
exam-match-quality metric (not a spendable currency), written in exactly one place —
`api/profile/recommend.js`, as the rounded average of the user's top-3 exam-match
scores from the eligibility/scoring engine — recomputed wholesale every time
profiling runs. Displayed as "VeerScore" across Dashboard, ProfilingResults, and the
employer-facing candidate views. This one works correctly today.

---

## 8. Content ingestion pipeline — source document to live app

End to end, for the Guide/Précis/Intro book pipeline (the PYQ pipeline is separate
and covered in §8.7):

### 8.1 Parsing (`.docx` → semantic blocks)

**Two independent docx parsers exist and have already diverged once**, worth knowing
before touching either:

- `scripts/lib/docxParser.mjs` — Node-side, used by all current CLI/batch ingestion.
  Its header comment documents a real historical content-loss bug: `@xmldom/xmldom`
  elements have no `.innerHTML` (silently `undefined`), so an earlier version
  silently dropped paragraph/table/list content corpus-wide until a manual
  `serializeInner()` walk fixed it (see `docs/status_report.md` §31.3-31.4 for the
  incident — "77/77 books" repaired).
- `src/lib/mammothParser.js` — browser-side twin used by the admin drag-and-drop
  ingestion UI. Still uses real-DOM `element.innerHTML` (safe in a browser, but this
  is exactly the pattern that broke in the Node port). **A fix to one does not
  propagate to the other** — they're not shared code.
- A third, structurally different pair (`scripts/lib/ingest-drive-content.js` +
  `src/lib/contentEngineProcessor.js`) parses `word/document.xml` directly without
  mammoth, producing flat `body_html` per chapter — this is the **legacy `format='html'`**
  path, still relevant since not every resource has been migrated to `format='blocks'`.

### 8.2 Publishing to R2 + `resources`

The current, live publishing path is
**`scripts/content/migrate_resources_to_blocks.mjs`**: reads
`public/books/{Guide,Precis}/<title>/` (the in-repo drop location content team now
uses), uploads chapters+images to R2, flips the matching `resources` row's `format`
to `'blocks'`. It resolves three cases per book: an exact title+category match to an
existing row, duplicate legacy rows consolidated to one canonical folder, or (rare)
a genuinely new document — inserted as a **brand-new `resources` row with no exam
linkage at all** until a separate mapping pass runs. Easy to lose track of; worth a
periodic check for orphaned rows.

**`scripts/content/sync_books_to_r2.mjs` is confirmed dead** — its own header says so
explicitly, and the book-content admin editor was rewired to read/write R2 +
`resources` directly instead ("nothing on local disk"). It's kept only as a
one-off tool for a hypothetical future bulk local-file ingestion, not part of the
live pipeline. Also worth remembering: **`public/books/` local files are not a
reliable mirror of production either direction** — a `resources` row can be ahead
(edited live via the admin editor) or behind (never migrated) the local folder
independently.

The intermediate enrichment step (**`scripts/content/batch_enrich_books.mjs`**) calls
Gemini to add *decorative* blocks only (stat strips, key facts, pull quotes, exam
alerts, comparison tables — never regenerating original text), splicing them into the
already-parsed block array at fixed positional heuristics. This deliberately
supersedes the older, riskier `src/lib/geminiEnricher.js` (still present in the repo,
does full-chapter regeneration rather than splicing — not the live path).

### 8.3 Exam↔resource mapping (`lc_exam_resource_map`) — working, mostly complete

**`scripts/exam-mapping/map_exam_resources_gemini.mjs`** builds a per-exam candidate
shortlist across four tiers (exact name match, "dominant" universal-subject titles
from `thumbnailTaxonomy.js`, region-matched state/UT books, career-track keyword
fallback), then either short-circuits (writes `source='exact_name'`, no Gemini call
needed) or sends only the ambiguous remainder to Gemini for a confidence-scored pick
— explicitly instructed to leave a category empty rather than force a weak match.
Status: 1,513 of 1,530 exams already have some mapping; ~17 remain, blocked on
Gemini credits along with everything else in §8.7.

### 8.4 Exam intro backfill

`scripts/exam-mapping/backfill_exam_intro.mjs` populates `lc_exam_intro` by picking
the best available `lc_exam_resource_map` Intro-category row (highest confidence,
earliest created), falling back to exact-name match, and finally flagging
`source='unset'` as a manual-entry punch list item if nothing's found. Idempotent.

### 8.5 Exam↔quiz mapping (`lc_exam_quiz_map`) — built, blocked

**`scripts/exam-mapping/map_exam_quizzes_gemini.mjs`** is structurally complete and
ready to run but has never executed successfully — confirmed via a live
`--sample=2` dry run returning `429 RESOURCE_EXHAUSTED` (Gemini credits at $0,
re-confirmed as recently as `docs/status_report.md` §43.14). It only needs to iterate
the ~10 distinct `quizzes.exam_name` buckets (not all 1,530 exams), so the actual API
cost once credits exist is trivial (~10 calls total). `QuizCenter.jsx` already checks
for its output and falls back gracefully in the meantime (§2.2B/§3.4) — **nothing
else needs to change in the frontend once this pipeline finally runs.**

### 8.6 Other pipeline pieces

- `scripts/content/scan_content_issues.mjs` — read-only QA scan for structural
  content issues (chapter mismatches, empty blocks, ragged tables, missing images);
  writes a JSON report only, never modifies content.
- `scripts/exam-mapping/compute_exam_thumbnail_subjects.mjs` — writes
  `exams.thumbnail_subject` from actually-ingested resource content.
- `scripts/exam-mapping/match_jobs_to_lc_exams.mjs` — separate concern, links
  scraped `jobs` rows to `lc_exams` via conducting-body + name token overlap.
- `scripts/db/backup_catalog_tables.mjs` / `backup_content_tables.mjs` — read-only
  JSON dumps of the catalog/content tables. **Run one of these before any
  destructive catalog or content-table change** — there was reportedly no backup
  mechanism at all before these existed.

**All of the committed pipeline scripts default to dry-run and require an explicit
`--execute` flag; every one is run manually by a human from the CLI. Nothing here is
triggered automatically** — no cron, no webhook, no CI step.

### 8.7 Gemini credits — the recurring blocker

Corroborated repeatedly and independently across `docs/status_report.md` (§36, §42,
§43.14) and in code comments in the PYQ pipeline scripts themselves. It currently
blocks:

- The last ~17 unmapped exams in §8.3.
- All of §8.5 (exam↔quiz mapping) — the single highest-leverage fix available if
  credits get topped up, since the script is otherwise ready to go.
- The PYQ OCR/reconstruction pipeline (see below), which has been forced onto three
  different non-Gemini fallbacks as a result: Groq (`ocr_reconstruct_pyps.py`, "per
  user's cost objection"), FAL/OpenRouter (`reconstruct_all_pyps_fal.py`, explicit
  comment citing the $0 balance), and Replicate/Llama 3 70B
  (`structure_pyps_replicate.py`).

### 8.8 The PYQ pipeline — separate, and currently in flux

This is a genuinely different pipeline from the Guide/Précis one above, living in
loose top-level scripts under `scripts/` (not yet organized into the `scripts/content/`
/`scripts/exam-mapping/` subfolders). **As of this doc's writing these files are
uncommitted/actively changing** (`git status` shows them modified or untracked) — the
map below is accurate as of 2026-09-08 but treat it as a snapshot of moving work, not
a settled pipeline:

`extract_pyps_manifest.py` (OCR metadata extraction) → `rebrand_all_pyps.py`
(watermarking) → one of three reconstruction variants
(`reconstruct_all_pyps.py`/`_flex`/`_fal`, the latter two being Gemini-outage
workarounds) → for scans with no embedded text layer, one of two further OCR
fallbacks (`ocr_reconstruct_pyps.py` via Groq, `ocr_reconstruct_pyps_vertex.py` via
Gemini/Vertex) or plain-text extraction (`ocr_pyps_to_text_only.py`) → structuring
via `structure_pyps_replicate.py` (Replicate/Llama, another Gemini workaround) →
`ingest_structured_pyps.mjs` loads the final structured JSON (now living in-repo at
`public/FINAL_PYPS_STRUCTURED/`, 754 files matching `pyq_papers`' row count) into the
DB. `audit_pyq_source_completeness.mjs` is a read-only completeness check against
this. A handful of narrower one-off surgery scripts
(`split_large_books.mjs`, `resplit_flat_chapters.mjs`, `duplicate_enriched_books.mjs`,
`enrich_split_books.mjs`, `inject_images.mjs`, `split_orphaned_state_books.mjs`) fix
specific defects found in the enriched-book corpus along the way (e.g. books that
landed entirely in one bucket because their chapter titles weren't styled as Word's
Heading 1).

---

## 9. Consolidated punch list

Priority-ordered, combining every finding above:

1. **Admin auth is fake** (§5.1) — `api/admin/admins.js` has zero server-side check
   and can mint real admin accounts to anyone who finds the endpoint. Highest
   priority; this is a real open door, not a design smell.
2. **Points/rewards system never had its migration applied** (§7) — one SQL-editor
   run (`sql/points_system.sql`, `sql/rewards_system.sql`) would turn on a feature
   that's otherwise fully built. Low effort, meaningfully changes the product.
3. **"My Exams" (LearningCenter) and "Your Next Step" progress (Dashboard) are both
   permanently broken** (§3.1, §3.7) — both read the same nonexistent
   `point_transactions` table. Either fixable as a side effect of #2, or by
   recomputing from the already-working `user_resource_reads` table instead.
4. **`api/admin/save-resource.js`'s legacy unauthenticated branch** is dead from the
   caller's side but still a live, reachable, unauthenticated write surface on the
   server. Safe to delete or gate — low effort, closes a real hole.
5. **"Mark as Finished" inside `SecureReader.jsx` doesn't persist** (§3.6) — the more
   natural place to mark a resource done silently does nothing, while a less obvious
   control elsewhere does the real job correctly.
6. **Gemini credits at $0** blocks quiz mapping entirely and the PYQ pipeline's
   primary path (§8.7) — not a code fix, needs a prepay top-up decision.
7. `unlock_cost` is fully dead schema (§4) — either wire it into a real
   points-to-unlock flow (once #2 is fixed) or consider dropping it to reduce
   confusion for the next person who assumes it does something.
8. `src/hooks/useLearningContent.js` is unused dead code (§3.8) — safe to delete.
9. Two docx parsers have already diverged once on a real content-loss bug and aren't
   shared (§8.1) — worth consolidating eventually, or at minimum keeping both in mind
   when fixing a parsing bug reported from either the admin UI or a CLI ingestion run.

---

## 10. Where to go for more

- `docs/status_report.md` — the full chronological history (43 sessions), referenced
  by `§N` throughout this doc. Good for "why is it built this way" questions this
  document doesn't answer; not the place to check "is this still true," since it's a
  log, not a snapshot.
- §0 above — how to re-verify any schema claim in this document directly against
  production.
- `sql/` folder — the source-of-truth SQL for anything mentioned as "never applied,"
  including the points/rewards migrations from §7.
