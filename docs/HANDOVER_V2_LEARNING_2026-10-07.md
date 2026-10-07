# Handover for Shreya — v2 Landing + Learning Module

**Date:** 2026-10-07  **Status:** built, linted, production-build checked, pushed to `main`.
**Not yet click-tested in a browser** (this environment has no browser tool). First job: open it and look.

This is the pickup note for the **content-team-driven changes** to the new Learning experience.
It covers only the new `/v2` work. For the whole backend/architecture picture, read
`learning_center_handoff.md` (repo root, snapshot 2026-09-08) and `docs/status_report.md` (§73 is this work).

---

## 1. What this is, in one paragraph

Signed-in users used to land on the student dashboard. The new idea: a **universal landing page**
(`/v2`) with four sections — **Learning, Jobs, Finance, Legal** — each becoming its own module with
its own links and a banner saying where you are. The **dashboard moves behind the avatar**, and
**messaging is a chat icon next to the avatar**. Learning is the first module rebuilt: a home page
(like the approved screenshot) with **Central / State / UT exam rows**, and a browse page per level
whose **left filter is Central categories, States, or UTs**. Everything lives under `/v2` in new
files; **no old file was overwritten**, so nothing is lost and old pages can be removed later.

## 2. Try it (before changing anything)

Sign in, then open:

| URL | What you should see |
|---|---|
| `/v2` | Four big section tiles |
| `/v2/learning` | Banner + search + 3 feature chips + 3 scrolling rows (Central categories, States, UTs) |
| `/v2/learning/central` | All central exams; left filter = categories with counts |
| `/v2/learning/central?category=SSC` | Same, filtered to SSC (breadcrumb shows Learning › Central Exams › SSC) |
| `/v2/learning/state` / `/v2/learning/ut` | Left filter = states / UTs |
| `/v2/learning/state?region=<lc_regions.id>` | One state's exams |
| `/v2/learning/all?q=police` | Hero-search results across all levels |
| `/v2/me` | The existing dashboard (avatar menu → My Profile goes here) |
| `/v2/messages` | The existing messaging page (chat icon) |

Check at phone width too (≤767px: bottom nav, filter drawer slides in from the left).

## 3. Files (all new unless marked)

```
src/v2/
  V2Layout.jsx        header (logo→/v2, 4 section links, chat icon, avatar+AccountMenu) + mobile bottom nav
  sections.js         THE list of 4 sections: label, icon, link, colour, blurb  ← edit here for tile/nav changes
  SectionBanner.jsx   reusable banner: title, subtitle, colour, icon, breadcrumbs (use it in every future module)
  UniversalLanding.jsx  /v2
  LearningHome.jsx    /v2/learning (hero search, feature chips, the 3 rows)
  LearningBrowse.jsx  /v2/learning/:level (central | state | ut | all) — one component, URL-driven
  ExamCard.jsx        GroupTile (category/state/UT tile) + ExamCard (single exam)
  useExamCatalog.js   fetch+cache of all lc_exams; helpers regionsForLevel / categoriesForLevel; LEVELS labels
  v2.css              all styles, every class prefixed v2-
src/App.jsx           (modified) imports + one <Route> block for /v2/*, wrapped in AuthGuard
src/components/ui/AccountMenu.jsx  (modified) new optional prop profilePath (default '/dashboard', v2 passes '/v2/me')
public/robots.txt     (committed with the SEO work) now has Disallow: /v2
```

**Rule of thumb:** to remove v2 entirely, delete `src/v2/`, the `/v2` Route block in `App.jsx`,
and `Disallow: /v2`. `profilePath` is harmless to leave.

## 4. How the data works (this is where content changes land)

- **One query** (`useExamCatalog.js`): all of `lc_exams` with `conducting_body` and `region:lc_regions(id,name,level)`,
  paged 1000 at a time, cached for the page session.
- **Level** of an exam = `exam.region.level` (`central` | `state` | `ut`). Exams with no region don't appear anywhere in v2.
- **Central filter** = distinct `exam.category` among central exams, sorted by the order in
  `src/lib/centralExamCategories.js` (the content team's list); any category not in that list is appended alphabetically.
- **State / UT filter** = distinct `exam.region` among that level's exams, alphabetical.
- Tiles on the home rows only appear for categories/regions that **have at least one exam**. An empty category won't show — by design, no dead tiles.
- **Thumbnails:** `useThumbnails().categoryUrl(category)` — the image uploaded in Admin › Categories, else bundled fallback, else a **solid colour block with initials** (no generated art — standing instruction). State/UT tiles are always colour blocks.
- Exam cards link to the **old** `/exam/:id` (exam pages are deliberately out of scope until the next round).

## 5. Cookbook: likely content-team requests

| Request | Where / how |
|---|---|
| Rename / reorder / add a **Central category** | Names must match `lc_exam_categories.name` exactly. Order = `src/lib/centralExamCategories.js`. Rename in Admin › Categories (and re-tag exams — see `scripts/exam-mapping/retag_central_exams.mjs`). |
| Add a **category thumbnail** | Admin › Categories (upload). No code change. |
| Move an exam to another level/region/category | Admin › Exams (editor panel). Shows up in v2 automatically (cache lasts one page load). |
| Add a **state or UT** | Add the row to `lc_regions` with the right `level`; it appears once an exam is assigned to it. |
| Change **banner text / colour** | Text: the `title`/`subtitle` props in `LearningHome.jsx` / `LearningBrowse.jsx`. Colour: `color` prop of `SectionBanner` (default `#1F3A2E`); section colours live in `sections.js`. |
| Change **hero copy / feature chips** | `LearningHome.jsx` → `FEATURES` array and the `SectionBanner` props. Chips with a `to` become links. |
| Change **row order / row titles** | Order of the three `<Row>` blocks in `LearningHome.jsx`; titles in `LEVELS` (`useExamCatalog.js`). |
| Change **nav items / section tiles** | `sections.js` only (header, bottom nav and landing tiles all read it). |
| Show exam counts / "popular" rows | Counts already come from `categoriesForLevel`/`regionsForLevel`; a "Popular" row would be a new `<Row>`. |

## 6. Known gaps and decisions (read before promising anything)

1. **Finance and Legal pages:** left as they were except for one approved addition — a **"← Home"** link back to the landing. Finance: the existing "← Main Site" nav link is now "← Home" and goes to `/v2` for signed-in users, `/` for public visitors (`ClientNavbar` in `FinancialGuidance.jsx`). Legal Aid Cell: a slim green bar with "← Home" → `/v2` at the top of `LegalAidCell.jsx`. Terms (`/legal`), Privacy and Support are unchanged. Not click-tested.
2. **Jobs** still points at the old `/jobs` (JobBoard). Combining Jobs (incl. Private Sector) into a v2 module is **Phase 2**, not started.
3. **`/` still redirects signed-in users to `/dashboard`** (`RootRoute` in `App.jsx`). Switch it to `/v2` only after the team signs off on the new flow, then repoint old links.
4. **Employer accounts** see the same v2 header as students — no employer-specific handling yet (they have their own flow: Find Candidates, post a job).
5. **Visibility:** open to everyone who is signed in (only testers exist today). Pages are `noindex` via `useSeo`.
6. **Old-page return paths:** the avatar's `/v2/me` dashboard still contains links to old routes (e.g. `/learning-center`). Fine for now; fix during cut-over.
7. **Browse page** shows 60 exams at a time ("Show more"); no virtualisation. ~1.5k exams total, fine.
8. `ExamCard` uses `exam.accent_color` as the block colour if present — assumes it is a valid CSS colour. If a bad value exists in the DB the thumb will fall back to no background; check one with the data.
9. The older `LearningCenter.jsx` (2,300 lines) is **unchanged and still live** at `/learning-center`. v2 re-uses its query/idea but not its code.

## 7. Cleanup list for AFTER cut-over (do not do now)

`src/pages/LearningCenter.jsx` + `.css`, `Header.jsx`, `ui/BottomNav.jsx` (old chrome), `/learning-center` and `/dashboard` as entry points, `PreviewFinanceSuites` route, and whichever `Dashboard` quick links point at them. Verify each is unreferenced (grep) first.

## 8. How to verify changes (house rules)

- `npx eslint src/v2 src/App.jsx` and `npx vite build --outDir $TEMP/x` — both currently clean (the repo has many unrelated warnings; v2 adds none).
- No browser automation exists here: don't claim UI verification you didn't do. Click through the table in §2.
- Data checks: verify with the **anon key**, not just the service role (RLS hides Draft content from anon).
- Never commit credentials; never commit `FINAL_*_STRUCTURED/`, `books/`, or `docs/*.xlsx` (standing directives).

## 9. Working-tree notes (what is deliberately NOT in git)

- 90+ `public/` image deletions show in `git status` — **uncommitted on purpose**; they look like a folder reorganisation. Confirm with Hari before committing, and make sure nothing in `src/` still references them.
- `FINAL_*_STRUCTURED/`, `books/`, `docs/*.xlsx` exports stay untracked.
- `src/components/book/FlipbookReader.*` and `scripts/set_tester_tier.mjs` are untracked and unrelated to this work — left alone.
- Pushes can be rejected if teammates pushed first; **merge** (`git pull --no-rebase`) when the working tree is dirty — never `git stash` mid-merge.

## 10. People / context

Gargi = content insight, Souvik = backend. Content-team feedback on the **2026 NEW books** is a separate open thread (see `docs/BOOK_REPARSE_REFERENCE.md`).
