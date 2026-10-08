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

> **UPDATE (Hari, 2026-10-08, later): the scope is now PER-EXAM book covers (~1,575 images), not just the 187 category images.** The spec, generator snippet and pipeline prompt Hari supplied are in **§12**; §12.4 lists what that changes (there is no per-exam image column or display code yet). Sections 2-4 below describe how thumbnails work **today** (per category / per subject) and remain accurate for that.

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


## 12. Appendix — per-exam cover generator spec (Hari, 2026-10-08), verbatim

Three pieces were supplied. They are reproduced as given; where they disagree, see §12.4.

### 12.1 "VEERNXT EXAM THUMBNAIL GENERATOR" — settings and prompt template

```text
VEERNXT EXAM THUMBNAIL GENERATOR

Generate premium competitive-exam study-guide book covers.

MODEL:
gpt-image-2.5-sunburst
QUALITY:
high
SIZE:
1024x1536
FORMAT:
PNG

PROMPT TEMPLATE:

Create a premium Indian competitive-examination study-guide
book cover.

EXAM TITLE: "{{EXAM_NAME}}"
CONDUCTING BODY: "{{CONDUCTING_BODY}}"
LEVEL: "{{LEVEL}}"
CATEGORY: "{{CATEGORY}}"
SUBTITLE: "{{SUBTITLE}}"
YEAR: "{{YEAR}}"

The exact supplied text must appear on the book cover.
SPELL EVERY WORD EXACTLY AS PROVIDED.
Do not abbreviate, paraphrase, rearrange, duplicate or invent text.
Do not add any other readable text.

Make "{{EXAM_NAME}}" the dominant title.
Use "{{SUBTITLE}}" and "{{YEAR}}" as secondary typography.

Create a premium hardcover book with rounded corners,
visible spine, realistic material texture, sophisticated
editorial typography and professional studio lighting.

PRIMARY COLOR: {{PRIMARY_COLOR}}
ACCENT COLOR: {{ACCENT_COLOR}}
VISUAL THEME: {{VISUAL_THEME}}
HERO VISUAL: {{HERO_VISUAL}}

The visual should communicate the examination subject while
remaining subordinate to the typography.

Consistent VeerNXT publishing-series design.
Clean neutral background.
Realistic 3D product render.
No people, hands, watermark, fake logo, random text or clutter.
Portrait 3:4 composition.
```

### 12.2 Generator snippet (Python, OpenAI SDK)

```python
from openai import OpenAI
import base64
from pathlib import Path

client = OpenAI()

def generate(exam_id, prompt):
    result = client.images.generate(
        model="gpt-image-2.5-sunburst",
        prompt=prompt,
        quality="high",
        size="1024x1536",
        output_format="png",
        background="opaque",
    )

    path = Path("images") / f"{exam_id}.png"
    path.parent.mkdir(exist_ok=True)
    path.write_bytes(base64.b64decode(result.data[0].b64_json))
    return path
```

(`OpenAI()` reads the key from the `OPENAI_API_KEY` environment variable — set it in your shell or `.env`; never put the key in code.)

### 12.3 Pipeline brief for Shreya's own Claude/Gemini

Hari's instruction: **the CSV is not generated by OpenAI; it is created locally with Shreya's Claude or Gemini.**

```text
Build an Exam Thumbnail Generation Pipeline for VeerNXT.

STEP 1 — CSV
Create a CSV containing all 1,550 exams with these columns:

id, exam_name, conducting_body, level, category, subtitle, year,
primary_color, accent_color, visual_theme, hero_visual

Use authoritative/available exam data. Do not invent exam names.
Flag uncertain/missing fields for manual review.

STEP 2 — PROMPT GENERATION
For every CSV row, generate a deterministic image prompt using this template:

Create a premium Indian competitive-examination study-guide book cover.

EXACT TITLE: "{{exam_name}}"
CONDUCTING BODY: "{{conducting_body}}"
SUBTITLE: "{{subtitle}}"
YEAR: "{{year}}"

Render ALL supplied text exactly as written.
Do not misspell, abbreviate, duplicate, rearrange or invent text.
Do not add any other readable text.

Premium hardcover book, rounded corners, visible spine,
realistic material texture, sophisticated editorial typography,
professional studio lighting and realistic 3D product rendering.

PRIMARY COLOR: {{primary_color}}
ACCENT COLOR: {{accent_color}}
VISUAL THEME: {{visual_theme}}
HERO VISUAL: {{hero_visual}}

Maintain a consistent VeerNXT publishing-series design.
Clean neutral background. Portrait 3:4 composition.
No people, hands, watermark, fake logo, random text or clutter.

STEP 3 — IMAGE GENERATION
Use OpenAI Images API:

model = "gpt-image-2.5-sunburst"
quality = "high"
size = "1024x1536"
output_format = "png"

Save:
prompts/{id}.txt
images/{id}.png

The pipeline must support retrying an individual exam without
regenerating the entire batch.

STEP 4 — VALIDATION
After generation, use OCR to verify that the required exam title
appears correctly. Flag any image where the expected text does not
match the CSV exactly.
```

### 12.4 Checked against the repo and the live database (read-only, anon key, 2026-10-08) — flags before you start

1. **Exam count is 1,575, not 1,550.** `lc_exams` has **1,575** rows: Central **429**, State **836**, UT **310**. Ask Hari what the 25 missing are (excluded status? a stale number?) before building the CSV, and say in the CSV how rows were chosen.
2. **There is nowhere to store a per-exam image yet.** `lc_exams` has no `thumbnail_url` column (columns today: id, conducting_body_id, region_id, category, name, website, status, thumbnail_template_id, accent_color, also_listed_as, created_at, updated_at, thumbnail_subject, category_detail, has_hindi_subject). Exams currently show their **category's** landscape image. Delivering per-exam covers needs, in order: (a) an additive migration `alter table lc_exams add column if not exists thumbnail_url text` (same pattern as `sql/lc_thumbnails.sql`; **needs Hari's go-ahead** — it changes the production DB); (b) a loader script (upload to R2, write the URL); (c) front-end changes so exam cards prefer the exam's own image, then the category image, then a solid colour (`src/lib/thumbnailStore.js`, `ExamThumbnail.jsx`, the Learning Center cards and the new `/v2` `ExamCard`). **None of (a)–(c) exists.** (c) also has a layout decision: the covers are **portrait 3:4**, but every exam card/slot today is **landscape 16:9** (§2) — Hari to decide the card design.
3. **The model ID is as supplied and unverified.** `gpt-image-2.5-sunburst` appears in both the spec and the snippet; earlier today Hari described the 09-24 tool as "GPT Starburst Medium" ("sunburst" vs "starburst"). Before 1,575 calls: list the models for the key you are given (or make one test call) and confirm the exact ID and that `quality="high"`, `size="1024x1536"`, `output_format`, `background` are accepted. If the call fails on the ID, stop and ask Hari — do not guess a substitute.
4. **The two prompt templates differ.** §12.1 prints LEVEL and CATEGORY on the cover; the §12.3 Step-2 template does not. Pick one with Hari. Fewer printed words = fewer misspellings; I'd lean to the §12.3 version.
5. **The CSV must come from the database, not from an LLM's memory.** A local Claude/Gemini cannot know our 1,575 exams. Export `lc_exams` (id, name, conducting body name, region → level, category) with a read-only query and give that file to the LLM; let it **only draft** subtitle, colours, visual theme and hero visual (and flag uncertain rows), never rename exams or change names. Printed text must equal `lc_exams.name` exactly. `year`: don't invent — leave blank unless Hari supplies it, and then drop the YEAR line from the prompt for those rows.
6. **Duplicate names.** Many exams share a name across states (an earlier audit, status report §27.14, found hundreds). Identical printed titles on different covers are confusing — consider printing the region as the subtitle, or flag them for manual review. Re-count on the current data.
7. **Validation (Step 4).** OCR tool isn't specified. Normalise both strings (case, spaces, punctuation) before comparing, and send mismatches to a manual-review list instead of auto-rejecting (OCR noise on stylised fonts is common). Exact-title match is a useful gate but does not prove the *rest* of the cover is clean — also eyeball a sample for extra or garbled text, which the prompt forbids but models still produce. Check whether any exam names contain Devanagari; Tesseract needs the extra language pack.
8. **Size, cost, storage.** 1,575 high-quality 1024×1536 PNGs is likely several GB (assume ~2–3 MB each, unverified) and the most expensive quality tier. **Pilot with ~10 exams first**, read the actual per-image price from your usage dashboard, then multiply by exams × ~1.3 for retries and get Hari's OK. Convert to WebP (e.g. 600×900) before upload; R2 key suggestion `exam-thumbnails/<exam_id>.webp`. Keep the PNGs and `prompts/` out of git (standing rule: generated content stays untracked).
9. **Retry one exam:** `generate()` as written overwrites `images/{id}.png`. Build the loop to **skip existing files** by default and take `--only <id>` / `--force` to redo a single exam; log every attempt (id, prompt hash, model, status, error) to a manifest, as `generate_veernxt_assets.py` does.
10. **Does not match the 187 category images.** These covers are 3:4 book renders with printed titles; the existing category art is 16:9 title-free scenes (see §11.1). They will be a **new, different look** alongside the old one — confirm that's intended.

### 12.5 The CSV is already built (Step 1 is done) — `docs/Exam_Thumbnail_Input_2026-10-08.csv`

Hari asked me to generate it so Shreya doesn't have to. **It is a file Hari forwards; it is not committed to git** (standing rule: exports stay untracked). Encoding UTF-8 with BOM, so Excel opens it correctly.

**How it was made:** read-only query of the live `lc_exams` table (+ conducting body name and region), 2026-10-08. **1,575 rows, one per exam, unique ids** — Central 429, State 836, UT 310 (all status `published`). No exam name was changed, stripped or invented; `exam_name` is exactly `lc_exams.name`. Sorted by level, region, name.

**Columns.** The first 11 are the ones the pipeline brief asks for, in its order; the rest are extras:

| Column | Source |
|---|---|
| `id`, `exam_name`, `conducting_body`, `level` (Central / State / Union Territory), `category` | **Straight from the database** |
| `subtitle` | Rule, no claims: Central → `Study Guide`; State/UT → `<Region> Study Guide` (e.g. "Karnataka Study Guide"). Hari/Shreya can change the wording in one place before generating. |
| `year` | **Blank for every row** — not in the database, and we do not invent it. Drop the YEAR line from the prompt if you leave it blank. |
| `primary_color`, `accent_color`, `visual_theme`, `hero_visual` | **Draft, rule-based** (see below), same colours and symbol for all exams in a group so the series looks related |
| `region`, `visual_group`, `same_name_exams` | Helper columns: region name, which rule matched, how many exams share this exact name |
| `needs_review`, `review_reason` | `YES` + why, for the **65 rows** that can affect what gets printed (below) |
| `data_check_level` | **173 rows** — a data-quality note, not a printing issue (below) |

**The visual rules** are keyword matches on category + exam name, first match wins, and use the symbol list from the supplied prompt (Parliament-style architecture for civil services/SSC, bank building, railway station, restrained ceremonial defence element, books and classroom architecture, blueprint, courthouse, crop landscape, medical motif, …). Groups and counts: civil 295, teaching 237, medical 207, police 202, legal 136, banking 127, engineering 120, agriculture 117, PSU 39, defence 35, railways 35, postal 13, IT 6, default 6. **These are drafts, not facts** — a person should skim the groups and the `default` rows. Heuristics can be wrong (e.g. "Marine" exams land under engineering; "Health" categories under medical).

**The 65 `needs_review` rows:**
- **49** — another exam has the **same name and the same conducting body**, so two covers would be identical. Give them distinguishing text or confirm they are true duplicates (this may be a data problem to fix in `lc_exams`, not a cover problem).
- **8** — the name has non-ASCII characters (curly quotes ‘ ’, en dashes, non-breaking hyphens). The image model may substitute plain characters, and an OCR check against the exact string will then "fail". Normalise both sides, or review by eye.
- **2** — very long titles (78 and 85 characters): the text will shrink or wrap.
- **6** — no keyword matched, so the hero visual is the generic default (categories: Drug Control, Hostel Management, Junior Scale Officer, Storekeeper). Pick a visual by hand.

**`data_check_level` (173 rows)** — the exam's level is **Central**, but its conducting body names a state or UT (e.g. several "ANM" / "Staff Nurse" rows run by state commissions). This may be how the content team files them, or a mis-tag. **It does not block generation** (the cover prints the conducting body and exam name, not the level in the §12.3 template) but tell Hari: it affects which row of the new `/v2` Learning page these exams appear in.

**Still true:** this CSV answers the *1,550 vs 1,575* question only by being complete — it contains all 1,575. If Hari wants 1,550, filter by `id`, and note which 25 were dropped.
