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

**Provenance, as told by Hari (2026-10-08):** the 187 category images were generated **on Hari's own machine on Thursday 2026-09-24**, with **"GPT Starburst Medium"** (an earlier message said "gptimages 2.5 sunburst"; Hari's latest wording is "GPT Starburst Medium"). They entered git in commit **`e47b80c`, 2026-09-24 17:16:59 +0530** ("Thumbnails: category thumbnails for exams, subject thumbnails for books, admin Subjects page") — that commit has the 187 WebPs and the app code, **but no generator script and no prompt**, and nothing else in the repo records them. I could not verify the tool name from any file. "GPT Starburst Medium" is not a model ID I can confirm; **ask Hari what it is exactly** (an app, a ChatGPT image mode, an API model/quality setting such as "medium"?) **and for the prompt text and any settings (size, quality), plus where the original PNGs were saved on that machine.** Until then:
- Don't assume the API model name. `generate_veernxt_assets.py` hard-codes `gpt-image-2`; with the key you are given, list the models it offers (or generate one test image) and use a real ID. If "medium" is a quality setting, the API exposes it as a parameter.
- Without the old prompt, new images may not match the 187 existing ones. Match against the files in `public/category_thumbnails/`, and keep the pilot small.

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

## 11. Appendix — the prompt Hari supplied (2026-10-08), verbatim

Hari's statement: this is the prompt used on 2026-09-24 ("GPT Starburst Medium", generated on Hari's machine). Placeholders in `[BRACKETS]` are filled per image. (`->` replaces the original arrow characters; nothing else was changed.)

```text
Create a premium educational exam-resource thumbnail designed to look like the front cover of a high-quality competitive-exam preparation book.

FORMAT:
Vertical 3:4 aspect ratio.
Portrait book-cover composition.
Centered composition with generous margins.
The finished artwork should resemble a professionally photographed or rendered physical study guide standing upright.

VISUAL STYLE:
Premium Indian competitive-exam publishing aesthetic.
Clean, authoritative, academic and trustworthy.
Minimal but visually rich.
High-end realistic 3D book cover / product render.
Soft studio lighting.
Subtle shadows.
Slightly rounded book corners.
Visible book spine on the left side.
Very subtle paper and cover texture.
No clutter.

BOOK DESIGN:
Use a solid or subtly textured primary cover color: [PRIMARY COLOR].
Use a complementary secondary/accent color: [ACCENT COLOR].
Typography should be large, extremely legible and professionally typeset.

At the very top, leave a small area for the brand mark:
"[BRAND NAME]"
Do NOT invent, redraw, modify or stylize the logo. If an actual logo asset is supplied, preserve it exactly.

MAIN TITLE:
"[EXAM NAME]"

SUBTITLE:
"[SUBTITLE]"

OPTIONAL YEAR:
"[YEAR]"

OPTIONAL CATEGORY:
"[CATEGORY]"

The main exam title must be the dominant typographic element.
Use strong editorial typography with clear hierarchy:
small brand -> large exam name -> supporting title -> year/category.

VISUAL SYMBOL:
Include ONE elegant, relevant visual illustration associated with the examination or subject.

Examples:
- UPSC / Civil Services -> Indian government / Parliament / Supreme Court / administrative architecture
- SSC -> subtle government/administrative architecture
- Banking -> bank building, financial architecture or refined financial symbol
- Railway -> elegant railway station or locomotive detail
- Defence -> restrained military architectural or ceremonial element
- Teaching -> books, classroom architecture or academic symbolism
- Engineering -> technical blueprint / engineering structure
- Medical -> subtle medical/academic symbolism
- Law -> courthouse, law books or classical legal architecture
- Agriculture -> refined agricultural landscape or crop symbolism

The visual symbol should occupy the lower or middle portion of the cover and remain subordinate to the title.

COMPOSITION:
Front-facing or very slightly angled book.
Book should fill approximately 75-85% of the vertical frame.
Centered horizontally.
Clean neutral background.
Soft contact shadow underneath.
No people.
No hands.
No desk clutter.
No extra objects.
No decorative borders unless they are extremely subtle.

TYPOGRAPHY:
Crisp, professional, editorial typography.
Excellent kerning and spacing.
High contrast between title and background.
Do not use excessive fonts.
Maximum 2 typefaces.
Make all supplied text accurately spelled and completely readable.

REALISM:
Photorealistic premium product visualization.
High-quality commercial publishing mockup.
Sharp edges.
Natural paper/cover materials.
Subtle realistic depth.
Soft studio illumination.
No exaggerated reflections.

IMPORTANT:
This is a SERIES.
The generated cover must look like it belongs to the same publishing family as the other exam covers.
Maintain the same layout, typography hierarchy, proportions, lighting, book geometry and visual sophistication across every generated thumbnail.

Do not add any text that was not explicitly supplied.
Do not invent exam names, subtitles, dates or claims.
Do not use watermarks.
Do not use random symbols.
Do not distort typography.
Do not create a fake logo.
```

### 11.1 Caution — read before assuming this reproduces the 187 images

I compared this prompt with the files it supposedly produced (looked at `public/category_thumbnails/central/banking.webp` and `public/thumbnails/Mathematics.webp`):

- The prompt asks for a **3:4 portrait, photorealistic 3D book cover with visible spine and printed title text**. The category files are **16:9 landscape (640×360) scenic backgrounds with no book, no spine and no text** (Banking: vault door, gold currency symbols, rising chart, faint shield emblem). The subject covers are portrait 400×600 but are also scenes with props and the shield, not a rendered book.
- So this prompt is most likely **the book-cover/subject-cover template (or an early version of it)**, or it was adapted/followed by other steps. It does **not** by itself explain the landscape category images. **Ask Hari which image set it was run for, and whether a second prompt (landscape category scenes) exists.**
- If the aim is the existing look for **category thumbnails**, generate a landscape scene with the same family of wording (premium, studio-lit, restrained, one relevant symbol, no text) and the real crest composited afterwards (§6). If the aim is **book covers / subject covers**, this prompt applies as written.
- Practical points for either: AI models misspell printed text, so **check every title by eye** or, better, composite the title text with code over a text-free background; never let the model draw the logo (the prompt already says so — supply the real asset and place it yourself).
- Fill placeholders from the DB (category name → `[EXAM NAME]`/`[CATEGORY]`; colours from the colour family in `src/lib/thumbnailTaxonomy.js`), and keep the symbol list (UPSC, SSC, Banking, Railway, Defence, Teaching, Engineering, Medical, Law, Agriculture) as a lookup so each category gets one relevant symbol.

### 11.2 Using `generate_veernxt_assets.py` (Hari's instruction: reuse it)

Reuse it as the base. Changes needed: (1) replace the `ASSETS` list with one entry per category/subject built from the DB, each with the filled prompt; (2) set `size` to a portrait or landscape size the API actually supports (it only uses `1024x1024` today) and crop to 640×360 or 400×600 afterwards; (3) confirm the model ID with the key (§5); (4) write into a new folder (e.g. `generated_thumbnails/<run-date>/`, not `public/veernxt_assets/`) and keep the manifest; (5) keep skip-if-exists; add retries, a dry-run and a cost cap; (6) keep it out of git until reviewed (§9).
