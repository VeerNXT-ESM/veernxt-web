# GS & GK Guide: reparse-from-scratch handoff (2026-10-05)

Read this first next session. It replaces re-running the analysis.
Companion detail report: `docs/GS_GK_Book_Comparison_2026-10-05.md`.
Also written today: `docs/Final_Book_Content_In_Use_2026-10-05.csv` (58 published+linked Guide/Precis books and their source DOCX).

## Goal
Make book content a true WYSIWYG parse of the DOCX. Start with the **GS & GK Guide**, then the Precis, then the other books.
Plan agreed so far: **start from scratch: new parser, reparse from the DOCX, replace the live content.** No code written yet. No DB or R2 changes made.

## Decisions still open (ask the user first)
1. **Source DOCX for the Guide**: recommended = Selection Post original (below). Alternatives: CGL original, or Cluster_006.
2. Is the **"UP LT" cover** on Cluster_006 intentional? (It is the Selection Post body with a different cover.)
3. Then Precis: which source (Cluster_001 vs Cluster_014, see below).

## Source files (K:\H DRIVE\Quantum Climb\CLIENT ASSETS\VeerNXT\CONTENT\...)
| Label | Path | Notes |
|---|---|---|
| Selection Post original | `ORIGINAL CONTENT\CENTRAL EXAMS\01.SSC\8.SSC Selection Post (Phase I, II, III, etc.)\2.GUIDE BOOK\GK\SSC GS & GK GUIDE BOOK.docx` | 17.5 MB, cover "GK & GS GUIDEBOOK / SSC SELECTION POST 2026", full shading. **Recommended** |
| CGL original | `ORIGINAL CONTENT\CENTRAL EXAMS\01.SSC\1.SSC CGL (Combined Graduate Level)\2.GUIDE BOOK\GK\SSC GS & GK GUIDE BOOK.docx` | 8.3 MB, no cover, almost no shading (3 vs ~310), own image files |
| Cluster_006 | `FINAL_CONTENT\Final Documents\MASTER DOCUMENTS\Guide\GK-GS\Cluster_006_GS & GK GUIDE BOOK.docx` | 18.7 MB, cover "UP LT GS & GK GUIDEBOOK 2026"; 40/41 images identical to Selection Post |
| Cluster_035 (what is live) | `DEPRECATED\MASTER DOCUMENTS_superseded_20260819\Guide\GK-GS\Cluster_035_GS & GK GUIDE BOOK.docx` | ~identical to 006 |
| Precis Cluster_001 | `FINAL_CONTENT\Final Documents\MASTER DOCUMENTS\Precis\GK-GS\Cluster_001_SSC COMPLETE GK.docx` | 134 chapters, 215 images, real Word lists |
| Precis Cluster_014 (what is live) | `DEPRECATED\...\Precis\GK-GS\Cluster_014_SSC COMPLETE GK.docx` | ~identical to 001 (578,888 vs 578,933 chars) |

## Findings: the three Guide DOCX are the same book
Same chapters/sections/tables/images/bullets; body text ~138.1k chars in each; only cover + TOC page numbers + shading/colour counts differ.

| | CGL | Selection Post | Cluster_006 |
|---|---|---|---|
| H1 / H2 / H3 | 74 / 575 / 69 | same | same |
| Tables / images / typed "•" | 163 / 41 / 1,513 | same | same |
| Bold / colour / shaded runs | 780 / 1,525 / 3 | 797 / 1,700 / 310 | 801 / 1,697 / 307 |

- **None of the DOCX contains the AI "enrichment"** ("Key Takeaways" and "Exam Alert" count = 0). Gemini added 295 blocks to the live Guide (keyFacts 66, statStrip 66, examAlert 66, pullQuote 37, comparisonTable 60) and 553 to the live Precis. Some are wrong (e.g. statStrip "Target Exam: ' Exams'").
- 74 H1 = 66 real chapters + 8 section dividers (SECTION A - HISTORY, SECTION B: INDIAN POLITY, SECTION C- GEOGRAPHY, SECTION D- ECONOMICS, GENERAL SCIENCE, SECTION A : PHYSICS, SECTION B : CHEMISTRY, SECTION C : BIOLOGY) plus cover/TOC. Treat sections as part dividers, not chapters.
- DB says 76 chapters (Guide) / 136 (Precis). Real live chapter files: **66 / 124**. DB `source_file` and `chapter_count` were relabelled without re-ingesting.

## Live state of GS & GK (what gets replaced)
- Live Guide storage: `https://pub-8c123d43246448199bbe4a14bffa2c06.r2.dev/structured_resources/blocks/Guide/4f39098f-651c-4651-a651-4f39098f651c/` (metadata.json + chapters/chapter-N.json + images/). Metadata says source Cluster_035, 66 ch, 22 images.
- Live Precis storage: `.../blocks/Precis/349e75e0-7927-4792-a792-349e75e07927/` (metadata says Cluster_014, 124 ch, 122 images).
- Guide `resources` rows: ~420 duplicate rows share that storage URL; together they carry **1,130 exam links** (`lc_exam_resource_map`). Precis: 355 rows, 1,130 links. A separate "2026 GK-GS" Precis (`.../Precis/050f4eea-49b4-483c-b396-948ae6480b45/`, 127 ch, 104 exam links) also exists.
- Cheapest safe replace: write new content to a **new storage folder**, then update `storage_base_url` / `metadata_url` / `chapter_count` / `source_file` on all rows sharing the old URL (or collapse them to one canonical row and repoint the links). Back up first (K:\tmp\db_backups convention). Verify with the **anon key**, not only service role (RLS hides Drafts from anon, see memory).
- Never hardcode creds; scripts read `.env`. Never commit generated dirs (FINAL_*_STRUCTURED/, books/, docs/*.xlsx).

## What is wrong in the live Guide (vs Cluster_006)
- Text: complete except the TOC, "SSC" stripped from ~18 labels, 1 Mughal paragraph altered.
- Images: **22 of 41** present (all 22 correctly placed); 19 dropped. Dropped are in Ch 1 (2), 3, 11, 14 (2), 15 (2), 17, 21, 22, 23, 26, 29, 30, 32 (2), 33, 34. All 41 are floating `wp:anchor` drawings.
- Bullets: 1,513 typed "•" lines → 0 list blocks; 1,385 are plain paragraphs with a literal "• ", 130 became H4 headings.
- Headings: H4 count 147 (130 are bullets); caused by the "≤5 words and no end punctuation = H4" rule.
- Formatting: 0 of 1,606 paragraphs keep bold/italic; colour (≈1,700 runs) and shading (≈310) lost.
- Tables: 163/163 present, first row forced to header.

## Live Precis (vs Cluster_001)
134 chapters in DOCX vs 124 live. Missing: Economics Ch 1 (43 paras), Atoms & Molecules (32 paras, 5 imgs), Biology Ch 1 (21 paras, 2 imgs). Images 215/216 vs 122 live. DOCX has real Word lists (2,881 items, levels 0-3: 805/1,879/174/23; 2,507 bullet, 370 decimal, 4 letter; 105 numbered-list instances); live has 869 list blocks with nesting only as raw `<ul>` inside items, 557 paragraphs holding `<br>`-joined "• " lines, 158 bullets/numbers turned into H4.

## Root causes in `scripts/lib/docxParser.mjs`
1. Image blocks only emitted for a `<p>` with **no text** (and only when `onImage` is passed); images in paragraphs with text or in table cells are dropped.
2. Typed bullets never converted to list blocks.
3. `classifyParagraph` word-count rule makes short lines H4.
4. mammoth drops colour/shading/highlight/size; `serializeInner` keeps only tags mammoth emits.
5. `getElementsByTagName('li')` flattens/duplicates nested lists.
6. First table row always `isHeader`.
7. Gemini enrichment step (scripts/content/batch_enrich_books.mjs pipeline) adds non-source blocks.

## Plan for the new parser (next session)
- Read `word/document.xml` directly with an ordered body walk. A working ground-truth extractor already exists (see Scratch tools below): paragraph style, numPr/ilvl, numFmt, runs, drawing refs (`a:blip r:embed` via document.xml.rels), tables.
- Block per paragraph in order. Lists: real `numPr` → list level + format (bullet/decimal/letter) + numId for restarts; typed markers ("•", "1.", "(a)") → real list items, nested by indent where present. Headings from style only (no word-count inference).
- Images wherever a drawing sits (anchor + inline + table cells + text boxes), uploaded to R2, in document order.
- Run formatting kept: bold, italic, underline, colour, highlight, shading (and paragraph shading/borders if present).
- Tables: real header detection (tblHeader / first-row formatting), cell content with nested paragraphs/lists/images.
- No AI blocks, no inference. Drop cover + TOC, split chapters on Heading 1, sections as part dividers.
- Check the renderer (`BlockRenderer.jsx` / `BookBlocks.jsx`) supports the needed block types and inline styles (colour/shading/nested lists); extend if not.
- Acceptance test = rerun the comparison: 100% text coverage, 41/41 images in position, 1,513 bullets as list items, 0 AI blocks, formatting counts match, then visual check of a few chapters (note: no browser automation here; verify via data + Vite transform, do not claim live UI verification).

## Scratch tools (session scratchpad; copy into scripts/ if keeping)
`C:\Users\mmu\AppData\Local\Temp\claude\k--H-DRIVE-Quantum-Climb-APPS-VeerNXT-VeerNXT-Main-Repo-VeerNXT-APP-veernxt-web\584ef0c7-9e1b-40ed-8e8a-cbe927543c78\scratchpad\`
- `extract.mjs <docx> <out.json>`: ground-truth token stream
- `cmp.mjs`: text/block-type/bullet comparison vs live chapters
- `img2.mjs`: image position comparison
- `more.mjs`, `pair.mjs`: heading/format counts and 3-way DOCX comparison
- `live/Guide`, `live/Precis`: downloaded live chapter JSON
- `g006.json p001.json oA.json oB.json g035.json p014.json`: extracted DOCX token streams
(The scratchpad is session-specific and may be gone; the scripts are easy to recreate from the descriptions above.)
Gotcha hit while comparing: do not strip `<...>` from already-plain text (a literal "<" such as "pH < 7" deletes everything up to the next ">"), and use the `u` flag for `\p{L}` regexes.

## Next steps
1. Get the three open decisions from the user.
2. Build the new parser + a local preview/dry-run (like `scripts/preview_structured_mock.mjs`); output to a local folder only.
3. Run the acceptance comparison on the GS & GK Guide; show the user.
4. On approval: upload to new R2 folder, back up DB rows, repoint rows/links, verify with anon key.
5. Repeat for the Precis, then the rest of the 58 in-use books.

---
## UPDATE (same day, after lunch): first reparse done -> "GKGS 2026"

**Correction to the earlier findings:** the "1,700 colour runs / 310 shaded runs lost" claim was wrong. In the Selection Post DOCX every colour is `000000` (black) and every shading fill is `auto`, so there is no visible colour or shading to preserve. The real formatting is bold (797 runs), centred paragraphs (384), 3 underlines, internal hyperlinks (TOC only), and 960 `tblHeader` table-header rows. The parser still supports colour/highlight/shading if a future book uses them.

**Source used:** Selection Post original (the recommended one). Decisions 1-3 above were not answered; this is a local test only, nothing uploaded.

**New code (uncommitted):**
- `scripts/lib/docxDirectParser.mjs`: direct XML parser (heading styles only, Word lists + typed bullets -> nested list blocks, images in order, inline bold/italic/underline/strike/sup/sub/colour/highlight/shading, centred/right paragraphs, `tblHeader` rows, no AI blocks).
- `scripts/reparse_book_direct.mjs --src <docx> --title "GKGS 2026" --category Guide`: writes `FINAL_BOOKS_STRUCTURED/Guide/guide-gkgs-2026/` (metadata.json, chapters/, images/, parse_report.json, preview.html). Local only, no DB/R2.

**Result (verified against the DOCX XML):**
- 66 chapters, with 7 part labels from the 8 section dividers (stored as `chapter.part`; `GENERAL SCIENCE › SECTION A : PHYSICS` are joined because they are consecutive empty H1s).
- Text and reading order: **4,766 / 4,766 units identical**, nothing added or dropped (cover + TOC dropped on purpose).
- Images: **40 / 40 placed right after the paragraph they are anchored to**, plus 1 more image on the cover page (dropped with the cover; the file is still saved in images/). Chapter-banner images sit in the Heading 1 paragraph; the one in an empty H1 opens the next chapter.
- Lists: 1,513 typed bullets -> 416 `list` blocks (0 stray "•" paragraphs). Headings: H2 575, H3 69, H4 0 (all from Word styles). Tables 163, 960 header rows from the DOCX. 387 `<strong>`, 278 centred paragraphs. **0 AI blocks.**
- Block types now: heading 644, paragraph 240, list 416, table 163, image 40 (the old live book had 1,606 paragraphs + 295 AI blocks).

**Known limits / to check next:**
- Typed numbered lines ("1. Foo") in Normal paragraphs stay as paragraph text (the number is literal text, so it displays the same). Word-native numbered lists would become `numberedList`; this DOCX has none.
- Nested lists have no test case in this book (all bullets are level 0); needed for the Precis (levels 0-3).
- Table cell shading, column widths, merged cells: none in this DOCX (no gridSpan/vMerge); not handled yet.
- Images are written locally as `images/image_NNN.ext` (relative); upload step must rewrite `src` to the R2 URL.
- Not yet visually reviewed in the real reader (no browser automation here). `preview.html` in the output folder is a static render using the reader's tag/class names.

**Next:** user reviews `preview.html`; then decide upload + repoint (see Next steps), then run the same parser on the Precis (Cluster_001) to test nested lists.

---
## UPDATE 2: Precis reparsed + content-team preview (same day)

- Source (as instructed by the content team): `FINAL_CONTENT\...\Precis\GK-GS\Cluster_001_SSC COMPLETE GK.docx` -> title "GKGS Precis 2026" -> `FINAL_BOOKS_STRUCTURED/Precis/precis-gkgs-precis-2026/`.
- Parser upgrade: Word auto-numbering is now computed (counters per numId/level, resets deeper levels, `%1.%2` patterns, decimal/letter/roman). Numbered headings get their number prefixed ("1. Universe", "1.1 Big Bang Theory"); numbered lists carry `start`/`format` (renderer: `NumberedListBlock` in BookBlocks.jsx now honours both; nested `<ol start type>` inside items).
- Result: 127 chapters, 9,085/9,085 text units identical in order, 214/214 images placed correctly (the DOCX counts 215 refs because one picture is stored twice as an AlternateContent choice/fallback pair), 3,005 list items (2,881 real Word list items + 124 typed bullets) -> 809 list + 186 numberedList blocks (11 with nested sub-lists; 70 numbered lists continue a count with start>1; 2 lettered), 37 tables, 0 AI blocks. Part labels from dividers: SSC GEOGRAPHY, SSC COMPLETE HISTORY BOOK, ...
- Preview data uploaded to R2 (public bucket), nothing in Supabase touched:
  `.../structured_resources/blocks/Preview/gkgs-2026/` (108 objects) and `.../Preview/gkgs-precis-2026/` (343 objects). Uploader: `scripts/upload_book_preview.mjs --dir <parsed dir> --name <slug> [--execute] [--overwrite]` (dry run by default, refuses to overwrite an existing prefix).
- Preview page = existing public sandbox reader `/dev-reader` (no login). Edited `src/pages/sandbox/DevReader.jsx`: two new books at the top of the selector, `?book=gkgs-2026|gkgs-precis-2026` and `&ch=N` deep links, chapter "part" label. **Needs a deploy to go live** (uncommitted: DevReader.jsx, BookBlocks.jsx, BlockRenderer.jsx, 3 new scripts). Links once deployed: `https://www.veernxt.in/dev-reader?book=gkgs-2026` and `...?book=gkgs-precis-2026`.
- Not done: no DB repoint, no live row touched. /dev-reader uses the sandbox "classic" CSS, not the production themed reader, so it shows structure/content/formatting faithfully but not production theming.

---
## UPDATE 3: Precis chapterisation fixed (GSGK PRECIS 2026.docx)
Fixed copy of Cluster_001 made with `scripts/fix_gkgs_precis_chapters.mjs` (see docs/GKGS_Precis_Chapter_Issues_2026-10-05.md STATUS). Parsed to `FINAL_BOOKS_STRUCTURED/Precis/precis-gsgk-precis-2026/` (128 chapters, 214/214 images, text identical), uploaded to R2 `Preview/gsgk-precis-2026/`; DevReader lists it first, the first (127-chapter) parse is kept as "superseded". Nothing committed/deployed yet.

---
## UPDATE 4 (2026-10-06): "GS & GK 2026 NEW" books + Guide renumbering
- Naming rule: reparsed books are suffixed "2026 NEW" (title "GS & GK 2026 NEW"); drop the suffix at swap time. Preview ids: `gsgk-guide-2026-new`, `gsgk-precis-2026-new` (R2 `Preview/...`), links `/dev-reader?book=<id>`.
- Guide source = `GSGK GUIDE 2026.docx` (copy of the Selection Post original, made by `scripts/fix_gkgs_guide_chapters.mjs`): chapter numbers restart in each section (History 1-14, Polity 1-15 (was 14-28), Geography 1-11 (source skipped 37), Economics 1-9, Physics 1-7, Chemistry 1-5, Biology 1-5), titles normalised to "Chapter N: Name", TOC lines renumbered. Original untouched. **Ask the content team whether a Geography chapter 37 is missing** (the source jumps 36 -> 38).
- Reader: the subject separator page no longer has a "Start this subject" button; it uses the normal Previous / Next pager (Next = first chapter of the subject).
- Known cosmetic: General Science sub-sections read "GENERAL SCIENCE › SECTION A : PHYSICS", then "SECTION B : CHEMISTRY", "SECTION C : BIOLOGY" (parent label only on the first).
