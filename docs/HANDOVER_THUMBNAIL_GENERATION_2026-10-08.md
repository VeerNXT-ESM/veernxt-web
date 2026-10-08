# Handover for Shreya — Bulk Thumbnail Generation (OpenAI)

**Date:** 2026-10-08. Written from the repo and the live database (read-only, anon key) today.
**Nothing here has been run for thumbnails yet** — this is the starting brief. The OpenAI key will be given to you separately; **never paste it into a file that is committed** (see §9).

---

## 1. Read this first — what actually exists

The brief said "we already have a thumbnail generation program". What the repo, git history and status report actually show:

| Thing | Finding |
|---|---|
| `scripts/assets/generate_veernxt_assets.py` | The only OpenAI image program in the repo (`gpt-image-2`, 84 prompts, writes `public/veernxt_assets/`). It produced the **dashboard banners / icons / premium / promo graphics**. It is **not** what produced the category images. Status report calls it "a separate visual-asset-generation workstream" (§ list of untracked files). |
| The 187 category images + 29 subject covers | **How they were made is not recorded** in the status report or git. §65.2 only says the user "supplied" them (the 65 state ones arrived the same day); the commit that added them (`e47b80c`, 2026-09-24) contains no generator script. The full-size PNG originals (`public/category_thumbnails/png/`, 438 MB; `public/thumbnails/png/`, 71 MB — §65.7) were never committed and the folders are now **empty**; `CLIENT ASSETS/VeerNXT/CONTENT/Thumbnails/` is empty too. **Ask Hari where the originals and the prompts/tool used live.** |
| Earlier prompt work (Aug 2026) | `thumbnail_generation_prompt.md` **is recoverable from git history** (`git show e92baca:thumbnail_generation_prompt.md`, also `d513cad^:docs/thumbnail_generation_prompt.md`) and `docs/image-generation.txt` (`git show d513cad^:docs/image-generation.txt`). Status report §(content handoff, ~line 154): it was handed to the content team and "the user is running it directly via Gemini". **That prompt is for 5 document-type background templates (Intro / Guide / Precis / PYQ / Mock Test), portrait 1024×1536 — not the 187 categories.** But it is the best written record of the method: a shared style prompt written in `generate_veernxt_assets.py`'s `ASSETS` format, AI draws background + a motif only, and the VeerNXT crest/wordmark is **composited by code afterwards** (the AI is never asked to redraw the logo). The category images carry the same faint centred shield, so they were very likely made the same way. |
| Plumbing to show an image on the site | Yes — admin upload (`ThumbnailCell.jsx`), R2, the `thumbnail_url` columns, the front-end store (§3–§4). |
| Planned intent | `status_report.md` §65.4 / §65.8 item 4: content team to generate with the OpenAI key and write into the same `thumbnail_url` columns; "nothing here needs redoing". |

**Provenance, as told by Hari on 2026-10-08:** the category images were made with **"gptimages 2.5 sunburst"**. Recorded verbatim — I could not verify it from the repo. It is not clear whether "2.5" is the OpenAI image-model version and "sunburst" a style/prompt/preset name (or the tool they used); **ask Hari to confirm both and to share the exact prompt.** Practical consequence: `generate_veernxt_assets.py` hard-codes `gpt-image-2`; the model actually used may be a different ID. **Call the API's model list (or one test image) with the key you are given and use whatever ID it really offers — do not assume either name.** If "sunburst" is a visual style (a radiating-light look is not obvious in the Banking image I viewed), get the prompt wording from Hari before generating anything new, so new images match the old 187.

So: **the "program" is the pattern in `generate_veernxt_assets.py` + the Aug prompt file (both in the repo/history); there is no recorded script that generated the category thumbnails.** The job is to write a small generator in that same pattern, produce the images, and load them through the existing path.

## 2. What a "thumbnail" is in this app (important — it is NOT per exam)

From `status_report.md` §65.1 (user's design):

- **Exams use their CATEGORY's thumbnail** — landscape **640×360 WebP**. There is no per-exam image. All ~1,575 exams inherit from **187 categories**: Central 21, State 102, UT 64 (counts of the files in `public/category_thumbnails/{central,state,ut}/`).
- **Books / study material use their SUBJECT's cover** — portrait **400×600 WebP** (admin crops 512×768; the existing files are 400×600). **29 subjects** (`src/lib/thumbnailTaxonomy.js`).
- An exam whose category has no image shows a **plain solid colour** (no overlay). That is the safe fallback and stays in place.

> **Scope question for Hari before you spend money:** "bulk generate thumbnails for the exams" could mean (a) re-do / improve the 187 category images, (b) fill only the gaps, (c) the 29 subject covers, or (d) something genuinely new per exam. Per exam would be ~1,575 images and a schema change (an `lc_exams.thumbnail_url`) — not what the app does today. Assume **(a)/(b)/(c) only** unless told otherwise.

## 3. Current state of the data (live DB, checked 2026-10-08, anon key)

- `lc_exam_categories`: **187 rows, 187 have `thumbnail_url`** — but **all 187 are local bundled paths** like `/category_thumbnails/central/banking.webp` (served from `public/`). **None are on R2.**
- `lc_subjects`: **29 rows; 28 have a (local bundled) URL; 1 has none: `civil_engineering`** (no file, no DB URL, no title rule — a known gap, §65.8).
- **So the real gaps today:** `civil_engineering` subject cover, plus whatever the content team wants replaced/improved. Everything else already has art.
- Standing preference on file: *"solid colour blocks, no generated art, until asked"* — the user has now **explicitly asked for generated thumbnails**, so that no longer blocks you. Keep the solid-colour fallback working for any category you don't generate.

## 4. How a thumbnail gets from file to screen (the pipeline you plug into)

1. Image file → **centre-crop to exact size and convert to WebP** (quality 0.85). Browser version: `src/lib/imageResize.js::resizeToWebp`.
2. **Upload to Cloudflare R2** with key `category-thumbnails/<slug>-<timestamp>.webp` (categories) or `subject-thumbnails/<slug>-<timestamp>.webp` (subjects). Admin path: `ThumbnailCell.jsx` → `src/lib/r2Uploader.js` → server proxy `api/admin/save-resource.js`. Script path: use `@aws-sdk/client-s3` with `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME` from `.env` — copy the S3 client setup from `scripts/r2_shrink_brand_cover.mjs`. Public base URL: `R2_PUBLIC_URL` in `src/lib/r2Uploader.js`.
3. **Write the public URL** to `lc_exam_categories.thumbnail_url` (matched on `id`/`name`) or `lc_subjects.thumbnail_url` (matched on `key`). Use the service-role key from `.env` in a script (the admin pages do it through `adminFrom`).
4. The site reads it via `src/lib/thumbnailStore.js` → `useThumbnails().categoryUrl(name)` / `.subjectUrl(key)`: **DB value first, then the bundled file, then a solid colour.** One cached read per page load, so a change shows on next load. The new `/v2` Learning pages use this too.

Category name ↔ file slug: lowercase, non-alphanumerics → `-` (e.g. "Teaching & Education" → `teaching-education`). Names must match `lc_exam_categories.name` **exactly** (the lists in `src/lib/{central,state,ut}ExamCategories.js` are the source). Note UT names that collide with Central/State carry a " (UT)" suffix.

## 5. The existing generator — what to copy and what to fix

`scripts/assets/generate_veernxt_assets.py` (246 lines, Python, standard library only):

- Reads `OPENAI_API_KEY` from `.env` in the **current directory** (run it from the repo root).
- `POST https://api.openai.com/v1/images/generations`, `model: "gpt-image-2"`, `n: 1`, size `1024x1024`; accepts either a `url` or `b64_json` response.
- One shared style prompt (`SHARED_PROMPT`: premium 3D, VeerNXT green / muted gold / deep navy / ivory, no text, no logos) + a per-asset subject phrase.
- **Skips files that already exist**, sleeps 2 s between calls, and appends every attempt (prompt, model, status, error) to `manifest.json` — good habits to keep.
- **Check before relying on it:** (1) confirm the model name `gpt-image-2` is valid for the key you are given with a **single test call** — model names change; (2) it has no retry/backoff on 429/5xx and no cost cap; (3) it only takes square sizes; thumbnails need landscape/portrait — check which sizes the model supports and crop, don't stretch.

## 6. Matching the existing look (inferred from the files — confirm with Hari)

I looked at `public/category_thumbnails/central/banking.webp` and `public/thumbnails/Mathematics.webp`:

- **Category (landscape 640×360):** deep blue/navy background, glowing gold accents and light streaks, the **VeerNXT shield emblem faintly in the centre**, two or three subject objects framing the left and right (Banking: vault door left, gold currency symbols and rising chart right).
- **Subject cover (portrait 400×600):** warm copper/gold tone per colour family, the shield emblem at upper centre, subject props (Mathematics: polyhedra, compass, equations, books).
- Colour families are defined in `src/lib/thumbnailTaxonomy.js` (`COLOR_FAMILIES`, 8 families) — keep each subject in its family so the set stays coherent.
- **The emblem:** AI models cannot be trusted to redraw the VeerNXT shield consistently. Prefer generating the **background/props only** (empty centre) and **compositing the real emblem** (from `public/logo.png` or the existing art) afterwards. This also keeps "no baked-in text/logos" true, as the current generator's prompt requires.
- Starting prompt template (adapt): *"Landscape editorial 3D illustration for the exam category '{category}' (India government recruitment). Deep navy-blue gradient background with soft gold light streaks. Left and right sides: {2–3 props for the category}. Leave the centre empty and calm. No text, no letters, no numbers, no logos, no people. Premium, restrained, consistent across a collection."*

## 7. Suggested plan

1. **Get answers (Hari):** scope (§2), whether to replace the existing 187 or only fill gaps, **where the original category-image PNGs and the prompt/tool used for them are** (§1), budget ceiling. Recover the Aug prompt file from git (§1) in the meantime.
2. **Pilot: 3 categories + `civil_engineering`.** Generate, crop, review by eye. Do not touch the DB yet.
3. **Agree the style** with Hari/Gargi on the pilot, then lock the shared prompt.
4. **Backup first:** `node scripts/db/backup_catalog_tables.mjs` (read-only; it saves the `lc_*` tables) so every old `thumbnail_url` can be restored.
5. **Batch run**, categories one level at a time (Central 21 → State 102 → UT 64). Script behaviour to build in: dry-run by default, `--execute` to write, skip rows that already have an **R2** URL, never overwrite without `--replace`, retry with backoff on 429/5xx, stop on repeated failure, write a results JSON (slug, prompt, status, R2 URL) for rollback.
6. **Review sheet:** a simple contact-sheet image or HTML of all results for the content team to approve **before** the DB update step. Generation (files only) and publishing (DB write) should be separate commands.
7. **Publish:** upload to R2, set `thumbnail_url`. Rollback = restore from the backup / results JSON.
8. **Verify with the anon key** (not the service role — house rule), then look at `/v2/learning` and the exam pages in a real browser. This environment has no browser tool, so a person must do the visual check.

## 8. Cost / rate sanity

187 category + 29 subject images is a few hundred calls. Check current per-image pricing for the model and size you use and multiply by ~1.5 for retries/regenerations; get Hari's OK on the number first. Run the pilot before the batch.

## 9. Rules that apply (standing directives)

- **Secrets:** read the key from `.env` only; `.env` is git-ignored — keep it that way. Never hard-code a key, even in a one-off script.
- **Git:** stage files **by explicit path** (never `git add .` or `git add docs`). Do not commit bulk generated image folders (the repo already deliberately leaves out `public/category_thumbnails/png/` (438 MB) and `public/thumbnails/png/` (71 MB)). Generated outputs belong on R2 and in the DB, not in git, unless Hari says otherwise.
- **Don't change** `thumbnailStore.js`, `ExamThumbnail.jsx` or the admin pages for this — they already support everything needed.
- **Verify, don't trust:** re-run the DB count query (below) before and after; don't claim a UI check you didn't do.

Read-only check you can reuse (needs `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `.env`; prints counts only, no secrets): fetch `lc_exam_categories?select=name,thumbnail_url` and `lc_subjects?select=key,thumbnail_url` from the REST API and tally `null` / starts-with `/` (bundled) / contains `r2.dev` (R2).

## 10. Files to know

```
scripts/assets/generate_veernxt_assets.py    existing OpenAI generator (dashboard assets) — the template
scripts/seed_thumbnail_urls.mjs              links bundled files to categories/subjects (idempotent; never overwrites uploaded R2 URLs)
scripts/r2_shrink_brand_cover.mjs            example of R2 S3 client setup + --execute convention
scripts/db/backup_catalog_tables.mjs         backup before any DB change
src/lib/thumbnailStore.js                    how the site reads thumbnails (DB → bundled → solid colour)
src/lib/thumbnailTaxonomy.js                 29 subjects, 8 colour families, title→subject matching
src/lib/{central,state,ut}ExamCategories.js  exact category names
src/lib/imageResize.js                       crop+WebP logic to mirror (640×360 / 512×768)
src/pages/admin/{ThumbnailCell,CategoriesPage,SubjectsPage}.jsx   the manual upload path
public/category_thumbnails/{central,state,ut}/  current 187 images;  public/thumbnails/  current 29 subject covers
docs/status_report.md  §65 (thumbnail system design), §27.10 (older colour-family system)
```
