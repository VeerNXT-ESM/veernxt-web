# Project Cleanup Audit

**Date:** 2026-10-09 · **Scope:** every tracked file (708 files) · **Status:** report only — nothing has been deleted or changed.

Each item says what to remove or change, why, how much it saves, and how to check it is safe first. Items are ordered by payoff. "Unreferenced" means the file name or symbol does not appear anywhere in `src/`, `api/`, `backend/`, `scripts/` or `index.html` (checked with `git grep` plus an import graph of `src/`).

## Summary

| # | Area | Action | Saves |
|---|------|--------|-------|
| 1 | `public/` images never used | Delete 63 files | ~93 MB |
| 2 | `public/` images that are used | Convert PNG → WebP, resize | ~35–40 MB more |
| 3 | `public/hero_video1.mp4` | Re-encode / host on R2 | ~20 MB |
| 4 | Sensitive / misplaced root files | Remove from git | privacy fix |
| 5 | Dead source files in `src/` | Delete 11 files | ~75 KB of code |
| 6 | Dead functions in `src/lib/` | Delete 12 functions | small, less confusion |
| 7 | Unused npm packages | Uninstall 13 | faster installs, smaller lockfile |
| 8 | Dev/test pages shipped to production | Un-route or gate 3 pages | cleaner live site |
| 9 | Duplicate files | Delete 2 copies | small |
| 10 | Repeated helper code in `scripts/` | Extract to one shared module | ~600 duplicated lines |
| 11 | Old one-off scripts / SQL | Move to an `archive/` folder | clarity |
| 12 | Git history | Optional rewrite | clone 576 MB → ~100 MB |

`public/` is 178 MB of the 186 MB tracked — **almost all the weight is images, not code.**

---

## 1. Unused images in `public/` — delete (~93 MB)

None of these file names appear anywhere in the code.

**`public/veernxt_assets/premium/` — all 7 files (9.7 MB).** Not one is used. Delete the folder.

**`public/veernxt_assets/promotional/` — all 7 files (9.8 MB).** Not one is used. Delete the folder.

**`public/veernxt_assets/icons/` — 27 of 36 files (38.4 MB).** Keep only the 9 that are used:
`S09_learning_center.png`, `S10_study_guide.png`, `S11_mock_test.png`, `S26_mentor.png`, `S29_recruiter.png`, `S30_peer_network.png`, `S32_education_loan.png`, `S35_business_funding.png`, `S36_financial_readiness.png`.
Delete every other `S*.png` (S01–S08, S12–S25, S27, S28, S31, S33, S34).

**`public/veernxt_assets/banners/` — 10 of 14 files (14.6 MB).** Keep only:
`B08_learning_path.png`, `B12_my_network.png`, `B13_next_mission.png`, `B14_next_chapter.png`.
Delete B01–B07 and B09–B11.

**`public/thumbnails/*.png` — PNG duplicates (~20 MB of the 33 MB).** Every subject exists twice: a 50 KB `.webp` (what the app uses, via `src/lib/thumbnailTaxonomy.js`) and a 2 MB `.png`. Delete these unreferenced PNGs: `General Knowledge`, `Hindi`, `Mathematics`, `Technical Trades`, `Electrical Engineering`, `HR-Personnel`, `Descriptive Writing`, `Traffic-Road Safety`, `LAw`, `Nursing`.
The other PNGs (`English`, `Reasoning`, `Agriculture`, `Financial Awareness`, `Computer Science`) are only used by hard-coded sample cards in `src/pages/LearningCenter.jsx` — change those paths to `.webp` (see §2) and delete those PNGs too.

**Also unreferenced:** `public/veernxt_assets/India-map-en.svg` (336 KB), `public/icons.svg` (8 KB).

> **Check before deleting:** images can also be referenced from the database (e.g. a URL stored in a table) or from emails. Search the DB for `veernxt_assets` and `/thumbnails/` first:
> `select * from lc_subjects where thumbnail_url like '%.png';` (and similar for any table storing image URLs).

## 2. Images that ARE used — shrink them (~35–40 MB)

The images kept in §1 are still 1–2 MB PNGs each, shown at small sizes (icons are ~64–96 px on screen).

- **`public/veernxt_assets/icons/` (9 kept) and `banners/` (4 kept):** convert to WebP at display size (icons ≤ 256 px, banners ≤ 1600 px wide). Expected 1.4 MB → 20–150 KB each. Update the file names in `src/pages/Dashboard.jsx`, `src/components/JobBoard.jsx`, `src/pages/ExamSyllabus.jsx`, `src/pages/Network.jsx`.
- **`public/homepage/` (11 files, 18 MB):** landing-page art used by `src/components/landing/LandingPage.jsx`. Same treatment. Also rename `emplyer portal.png` (typo + space in a URL).
- **`src/pages/LearningCenter.jsx`:** point the `/thumbnails/*.png` sample-card images at the `.webp` versions.
- **Bug to fix at the same time:** `LearningCenter.jsx` uses `/thumbnails/General Studies.png` (3 places) — **that file does not exist**, so those cards show a broken image today. Use `General Studies.webp`.

## 3. `public/hero_video1.mp4` — 26 MB

A single landing-page video, downloaded by every visitor. Re-encode (H.264/AV1, 720p, ~2–4 Mbps) to ~3–6 MB, or move it to R2/CDN like the book assets so it is not in the repo or the Vercel bundle.

## 4. Root files that should not be in git

| File | Problem | Action |
|------|---------|--------|
| `Profiler_Test_Input_2026-09-28.xlsx` | `docs/Profiler_Test_Instructions_for_Souvik.md` says this file is "derived from survey data" and "**not in git on purpose**" — but it is committed. | `git rm --cached`, add `*.xlsx` to `.gitignore`. It also stays in history (see §12). |
| `learning_center_handoff.md` | Byte-identical copy of `docs/learning_center_handoff.md`. | Delete the root copy. |
| `schema.sql` | Root-level schema predating the `sql/` folder; verify it is not the current source of truth, then move it to `sql/archive/` or delete. | Verify, then move. |

## 5. Dead source files in `src/` — delete

Nothing imports these files; they are only mentioned in comments or docs.

| File | Size | Notes |
|------|------|-------|
| `src/App.css` | 0 KB | Empty. |
| `src/components/CandidateProfileTemplate.jsx` | 19 KB | |
| `src/components/PremiumSelect.jsx` | 3 KB | Superseded by `src/components/ui/Select.jsx`. |
| `src/components/admin/SimpleRichTextEditor.jsx` | 6 KB | Replaced by `QuestionEditorList.jsx`. |
| `src/components/learning/SubjectProgressBar.jsx` | 1 KB | |
| `src/hooks/useLearningContent.js` | 8 KB | |
| `src/lib/contentEngineProcessor.js` | 16 KB | Only referenced in comments. Also the only user of `public/thumbnails/VEERNXT_LOGO_TRANS.png` — delete that PNG with it. |
| `src/lib/resourceMetadata.js` | 5 KB | |
| `src/lib/useInlineUnlock.js` | 5 KB | |
| `src/lib/pointsCatalog.js` | 1 KB | Display copy of `backend/points/pointsCatalog.js`; nothing imports it. |
| `src/pages/sandbox/BookReaderV2.jsx` | 10 KB | Old sandbox page. **Keep `BookReaderV2.css`** — `SecureReader.jsx` and `DevReader.jsx` import it; consider renaming it to `src/components/book/ReaderLayout.css`. |

**Do not delete** `src/lib/examCategoryTaxonomy.js` — no `src/` file imports it, but `scripts/exam-mapping/seed_exam_categories.mjs` does.

> **Check:** after deleting, `npx vite build` must still pass.

## 6. Dead functions inside used files

Exported but never used anywhere, not even inside their own file — delete the function:

- `src/lib/subscriptionAccess.js`: `canViewVeerScore`, `canViewRecommendations`, `canGenerateCV`, `canAccessMentorship`, `higherTier`
- `src/lib/privateSectorTaxonomy.js`: `getRolesForSectors`, `getTagsForSectors`, `AVAILABILITY_OPTIONS`, `LICENCE_OPTIONS`
- `src/lib/careerTrack.js`: `careerTrackLabel`
- `src/lib/r2Uploader.js`: `buildResourceR2Urls`
- `src/lib/supabase.js`: `getEngineUrl`

Used only inside their own file — just drop the `export` keyword: `BUNDLED_CATEGORY_THUMBNAILS`, `slugifyCategory` (`bundledThumbnails.js`); `yesNo`, `timeframeOptions` (`legalAidCellConfig.js`); `ROLE_TAXONOMY`, `getJobClass`, `findSector`, `ROLE_SPECIFICATIONS` (`privateSectorTaxonomy.js`); `TIER_RANK`, `isSubscriptionActive` (`subscriptionAccess.js`); `DEFAULT_THUMBNAIL_SUBJECT` (`thumbnailTaxonomy.js`).

## 7. Unused npm packages — uninstall

Never imported in `src/`, `api/`, `backend/` or `scripts/`:

- **dependencies:** `@google/generative-ai`, `docx`, `html-to-docx`, `marked`, `openai`, `page-flip`, `react-pageflip`, `pg`
- **devDependencies:** `@google/genai`, `p-limit`, `pdf-parse`

`openai` is mentioned only by a Python script (`scripts/ocr_reconstruct_pyps.py`), which uses the Python package, not the npm one. After removing `src/components/PremiumSelect.jsx` (§5), check whether `react-select` is still needed by `src/components/ui/Select.jsx` (it is today — keep it).

`@types/react` / `@types/react-dom` are unused in a JS-only project but harmless (editor hints) — optional.

> **Check:** `npm uninstall <pkg>` one group at a time, then `npx vite build` and run any API route that might use it on Vercel.

## 8. Dev / test pages reachable in production

`src/App.jsx` registers these routes for every visitor:

- `/dev-reader` → `src/pages/sandbox/DevReader.jsx`
- `/profiling-tester` → `src/pages/ProfilingTester.jsx`
- `/preview-services` → `src/pages/PreviewFinanceSuites.jsx`

Either remove the routes, or only register them when `import.meta.env.DEV` is true (keeps them for local work, drops them from the production bundle).

## 9. Duplicate files

- `backend/engine/data/designations.json` and `src/data/designations.json` are byte-identical. Keep one; import it from the other side, or generate the copy at build time.
- `learning_center_handoff.md` (root) = `docs/learning_center_handoff.md` (see §4).

## 10. Repeated code in `scripts/` — extract shared helpers

The same boilerplate is copy-pasted across scripts:

| Helper | Copies |
|--------|--------|
| `loadEnv()` (read `.env` into `process.env`) | 20 scripts |
| Supabase pagination loop (`.range(from, from + 999)`) | 28 scripts |
| `norm()` text normaliser | 13 files |

Create one module, e.g. `scripts/lib/db.mjs`, exporting `loadEnv`, `supabaseAdmin()`, `fetchAll(table, select, filter)` and `norm()`, and import it. This removes roughly 15–30 lines per script. `scripts/exam-mapping/sync_subject_book_links.mjs` and `link_matrix_exam_books.mjs` are good first candidates. (`dotenv` is already a dependency and could replace `loadEnv` entirely.)

## 11. One-off scripts and migrations — archive, don't delete

These were run once against the database; they are history, not tools. Move them to `scripts/archive/` and `sql/archive/` so the active folders only hold things people still run.

- **`scripts/` (65 files at the top level):** the `audit_*`, `fix_*`, `check_*`, `inspect_*`, `export_*`, `parse_*_dryrun`, `dedupe_*` and `restore_*` scripts (≈30 files), plus `scripts/exam-mapping/` one-offs: `retag_*`, `split_merged_categories.mjs`, `normalize_exam_categories.mjs`, `remove_misfiled_precis_links.mjs`, `dedupe_exam_resources.mjs`.
- **`sql/` (45 files):** already-applied migrations: `drop_*` (4), `fix_*` (2), `rename_resources_v2_to_resources.sql`, `resources_v2_format_column.sql`, `unify_exams_table.sql`, `user_learning_journey_fixes.sql`, `lc_exams_category_normalize.sql`.

> Confirm with whoever ran them that they are applied before moving.

**`docs/status_report.md` (612 KB, 72 sections):** a running session log. Consider splitting it: keep the latest status at the top, move older sections to `docs/archive/status_report_2026-09.md`.

## 12. Git history (optional, needs team agreement)

Deleting files does not shrink the repository: the git history is **576 MB**, mostly old images. Cloning stays slow until history is rewritten (e.g. `git filter-repo --strip-blobs-bigger-than 1M`, or move images to Git LFS/R2). This rewrites every commit hash, so everyone must re-clone afterwards — plan it as a one-time team step, after §1–§3 are done. It is also the only way to fully remove the profiler spreadsheet (§4) from history.

---

## What I would NOT touch

- `backend/engine/data/exam_master.json` (1.1 MB) — live data for the recommendation engine.
- `src/translations.js` (136 KB) — all UI strings.
- `public/category_thumbnails/` (6.4 MB, 187 WebPs) — referenced by `src/lib/bundledThumbnails.js`.
- `scripts/exam-mapping/data/` (~900 KB) — inputs for the book-mapping scripts.
- `src/components/book/BookBlocks.css` and `BookBlocksClassic.css` — they look similar but are intentionally separate (themed reader vs admin view).

## Suggested order

1. §4 (privacy) → 2. §1 + §2 + §3 (images, ~150 MB) → 3. §5 + §6 + §7 + §8 (code; run `npx vite build` after each) → 4. §9 + §10 + §11 (tidy-up) → 5. §12 (history, with the team).
