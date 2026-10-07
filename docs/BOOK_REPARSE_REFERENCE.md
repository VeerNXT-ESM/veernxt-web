# Book reparse programme: reference (written 2026-10-07)

**Purpose:** everything needed to pick this work up again without redoing the analysis. Read section 1 first. The daily log is `docs/status_report.md` §71-§72; this file is the distilled version.

## 1. Where things stand (2026-10-07)
- All **linked Guide/Precis books** (58 old storage folders = 54 titles) were re-created from their DOCX with a new WYSIWYG parser (no AI) as **50 NEW books titled "<old title> 2026 NEW"**. They are **Draft** rows linked to **no exam**; the old books and every exam link are untouched.
- Review: **https://www.veernxt.in/dev-reader** (public sandbox reader, no login; dropdown lists the new books; `?book=<category>-<title-slug>&ch=N` deep-links). The list comes from `structured_resources/blocks/_review/index.json` on R2.
- **Waiting on the content team's feedback.** Only the **English Guide** (939 exams) is not built (source choice open). Nothing has been swapped or purged.
- Old to new mapping for the swap: `docs/book_swap_map_2026-10-07.json` (all 58 old books; 57 map to a new book).
- Run records (needed for rollback): `docs/bulk_reparse_runs/results_*.json` (7 runs) and `docs/bulk_reparse_runs/manifest.json`.

### Policy decided by the product owner
1. **Never overwrite.** New entries only, suffixed " 2026 NEW" (drop the suffix at swap time).
2. One wave at a time; the content team signs off **all** books; **then** swap; **then** purge bloat.
3. Scope = linked books only (Intros, quizzes, PYQs and unlinked master DOCX are out of scope).
4. New rows are **Draft** (hidden from learners by RLS). **In the admin, Draft = "archived"** (`books-archive` sets status Draft), so the new books appear under *Show archived* on Book Content, not in the active list. Review them in `/dev-reader`.

## 2. Why this was done (findings, so the analysis need not be repeated)
- Live GS & GK books were **not built from the DOCX the database named**: R2 metadata said Cluster_035 / Cluster_014 (in `DEPRECATED`) while `resources.source_file` / `chapter_count` said Cluster_006 / 001 (76 / 136; real counts 66 / 124). DB chapter counts are stale.
- The old pipeline (mammoth in `scripts/lib/docxParser.mjs` + Gemini enrichment) lost content: images only from text-less paragraphs (22 of 41 kept), typed "•" bullets never became lists (130 became H4 headings), a 5-word rule made short lines H4, first table row forced to header, bold/centring lost, and **295 (Guide) / 553 (Precis) AI-added blocks** that are not in any DOCX (some wrong, e.g. "Target Exam: ' Exams'").
- The DOCX has no real colour/shading (all `000000` / `auto`); real formatting is bold, centring, header rows.
- **Bullets and numbers were invisible in every book** because Tailwind v4's preflight sets `ul, ol { list-style: none }` and the book CSS never restored markers. Fixed in `BookBlocks.css` and `BookBlocksClassic.css` (also tables made plain white, no outlines).
- Detail: `docs/GS_GK_Book_Comparison_2026-10-05.md`, `docs/GS_GK_REPARSE_HANDOFF_2026-10-05.md`, `docs/BOOK_STRUCTURE_SCAN_2026-10-06.md` (all 67 master DOCX scanned).

## 3. The tooling (all in `scripts/`)
| File | What it does |
|---|---|
| `lib/docxDirectParser.mjs` | WYSIWYG parser: ordered walk of `word/document.xml`. Headings from Word styles only. Word lists and typed bullets become nested `list` / `numberedList` blocks with Word numbering counters (numbered headings get "1.", "1.1"; lists carry `start` / `format`). Every drawing (anchored, inline, in tables) becomes an image in place. Bold/italic/underline/strike/sup/sub/colour/highlight, centring, `tblHeader` rows. Empty Heading 1 = subject divider stored as `chapter.part`. Cover/contents dropped. **A chapter titled "Table of Contents" is dropped.** **Visual-structure mode** only for documents with **no Heading 1 at all** (chapter = prominent paragraph starting CHAPTER/UNIT/PART/LESSON/अध्याय + number; a bare "CHAPTER 3" line merges with the next prominent line; sub-heading levels from font-size tiers). |
| `lib/verifyBook.mjs` | Independent check against the DOCX XML: only known block types, no empty chapters, no invented text, 99%+ coverage, order, image count. **Gates every upload.** |
| `build_reparse_manifest.mjs` | READ-ONLY. Builds `FINAL_BOOKS_STRUCTURED/_bulk/manifest.json`: the 58 linked books, canonical row, display fields to copy, source DOCX, new title/id. Holds the hand-made `TEXT_MATCH` (identical twins) and `EXTERNAL_SOURCES` (files outside the library) tables. |
| `bulk_reparse_books.mjs` | Dry run by default. `--execute` = parse, verify, upload to a **new R2 prefix** `structured_resources/blocks/<Cat>/<new resource_id>/`, **insert one Draft `resources` row**, update the review index. Insert-only; refuses existing rows/prefixes; stops at the first error; checks row counts before/after and anon invisibility. `--only "<text>"`, `--limit N`, `--rollback <results_*.json> [--only "<title>"]` (rollback is **untested**). |
| `rebuild_review_index.mjs` | Rebuilds the R2 review list from `docs/bulk_reparse_runs/results_*.json` (`--execute` to write). |
| `reparse_book_direct.mjs`, `upload_book_preview.mjs` | One-book local parse and the older R2 `Preview/` upload (pilot tooling; superseded by the bulk script). |
| `fix_gkgs_precis_chapters.mjs`, `fix_gkgs_guide_chapters.mjs` | Make a **corrected COPY of a DOCX** (styles/numbering only; original untouched, checksum verified). Templates for fixing other books. |

Code outside `scripts/`: `src/pages/sandbox/DevReader.jsx` (review reader: subject cover, contents, chapters; reads the review index), `src/components/book/BookBlocks.jsx` + `BlockRenderer.jsx` (`numberedList` `start`/`format`; `ChapterHeader` without the big number), the two book CSS files, `api/admin/misc.js` + `api/_lib/adminAuth.js` + `vercel.json` (Vercel function cap, section 8).

## 4. Pipeline per book
`DOCX` (optionally a fixed copy) -> parse -> verify -> local output (`FINAL_BOOKS_STRUCTURED/_bulk/<id>/`, untracked) -> R2 upload under a new prefix -> Draft `resources` row (copies subject, level, state_ut, conducting_body, thumbnail, reader theme, freemium/lock fields from the old canonical row; `exam_name` NULL so the legacy text-match fallback never shows it) -> review index entry.

## 5. How to find the source DOCX of an old book (what worked)
The same file name exists as **many different files** (e.g. 42 different `Karnataka_GS.docx`, ~1,090 `MATHEMATICS.docx`), and `resources.source_file` is unreliable. What worked: **compare the old live book's text with candidate DOCX files** (normalised paragraphs, share found; 99%+ = same book). Candidate sets: MASTER DOCUMENTS, `DEPRECATED`, `ORIGINAL CONTENT`, **and `CLIENT ASSETS/VeerNXT/` root** (two sources lived there). Also read the replace/ingest scripts and `docs/status_report.md` (the Mathematics Precis was replaced on 09-21 from `Mathematics_Precis_FULL_fixed.docx`). Scratch tools used (untracked): `FINAL_BOOKS_STRUCTURED/_bulk/match_sources.cjs`, `find_source2.cjs`.

Results: six old books are **identical twins** of another (published twice as "GS" and "SI/CONSTABLE"), so one new book serves both; two sources outside the library; the English Guide is English *Precis* content (stored title "ENGLISH PRECIS", 26 AI-enriched chapters, chapters 14+ broken) 100% identical to `DEPRECATED/.../Precis/English/Cluster_002_ENGLISH.docx`, while the master `Cluster_005_ENGLISH` (21 ch) is a different edition.

## 6. Open items (content team / product owner)
1. **English Guide**: which file is final? (a) master Cluster_005 edition, (b) old Cluster_002 rebuilt, (c) another document. Not built.
2. **Identical pairs**: confirm one new book replaces both old titles, and choose the title (Arunachal GS/SI, Chhattisgarh GS/SI, Goa GS/SI, Himachal GS/Constable, Karnataka GS/Constable (99.4%), Electrical Engineering Guide/Precis). Four new titles carry my labels ("Chhattisgarh GS (SI)", "Himachal Pradesh GS (CONSTABLE)", "Karnataka GS (CONSTABLE)", "ARUNACHAL PRADESH SI"). "Telangana GS 2026 2026 NEW" doubles the year.
3. **Are `Mathematics_Precis_FULL_fixed.docx` and `Metro_Technical_Knowledge.docx` final?**
4. **GS & GK**: Geography chapter 37 missing (numbering 36 -> 38)? Chemistry has no Chapter 12; Economics repeats Public Finance (13, 21) and Economic Planning (14, 20); are Physics Ch 12 and Chemistry Ch 14 environment chapters intended?
5. The old "2026 GK-GS" Precis (104 exams) is covered by the new GS & GK Precis: OK?
6. **Large "Practice MCQs" chapters** (10 chapters, 6 books): Reasoning Precis ch 15 (376 blocks), Hindi Precis ch 18 (545), Arunachal SI ch 12 (197), Tripura ch 14 (204), Uttarakhand ch 12 (364), Metro ch 47-51 (306-378 each). They are single Heading 1s in the DOCX. Split into papers/sets by giving each its own Heading 1.
7. **Possible merged chapters** (chapter-like lines inside chapters): Andhra Pradesh 13, Madhya Pradesh 12, Arunachal SI 11, Tamil Nadu 1, Hindi Precis 1. **Tiny chapters**: West Bengal 13, Electrical Engineering 9, Odisha 4, Rajasthan 4, English Precis 4.
8. Cover pictures per subject come from Admin > Subjects (`lc_subjects.thumbnail_url`); a per-book override would need a table + admin screen (not built). Cover/contents pages exist only in `/dev-reader`, not in `SecureReader`.

## 7. How-to
**Re-run one book after a DOCX or parser fix**
1. Fix the DOCX (make a copy in MASTER DOCUMENTS; never edit the original; see `fix_gkgs_*_chapters.mjs`) or the parser.
2. If the source changed, update `TEXT_MATCH` / `EXTERNAL_SOURCES` in `build_reparse_manifest.mjs` (or drop the new file in MASTER DOCUMENTS with the same name) and run `node scripts/build_reparse_manifest.mjs`.
3. Remove the old attempt: `node scripts/bulk_reparse_books.mjs --rollback docs/bulk_reparse_runs/results_<run containing it>.json --only "<new title>"` (deletes only that Draft row and its R2 prefix).
4. Dry run: `node scripts/bulk_reparse_books.mjs --only "<title>"`; read `FINAL_BOOKS_STRUCTURED/_bulk/report_dryrun.md`; then `--execute`.
5. Save the new `results_*.json` into `docs/bulk_reparse_runs/` and regenerate the swap map (`node scripts/build_swap_map.cjs`).

**Check the state**: `resources` rows with title like `% 2026 NEW` (expect 50; all Draft, format blocks, exam_name NULL); `lc_exam_resource_map` rows pointing at them (expect 0); anon key must see 0 of them; `resources` was 16,631 rows before and 16,681 after; `lc_exam_resource_map` 11,990 unchanged.

**Swap (NOT built, plan)**, per book, with a backup first (`K:\tmp\db_backups`): (1) back up `lc_exam_resource_map` and the old `resources` rows; (2) repoint every link of every old row sharing the old `storage_base_url` (`oldResourceId` and siblings; the map JSON lists `oldStorageBaseUrl`) to the new `resource_id`, then de-duplicate to **one link per (exam, category)**; (3) set the new row Published and drop " 2026 NEW" from the title; (4) retire the old rows (admin "Archive" = status Draft); (5) verify with the **anon key** and spot-check exams. **Gotcha:** many exams reach books through the **legacy `exam_name` text-match fallback**, not links (memory note 2026-09-17: 14,044 of 14,655 Guide/Precis rows) so purging old rows before backfilling real links removes those books from those exams. Then **purge bloat** (backup first): the duplicate `resources` rows behind each book (e.g. 420 rows share the GS & GK Guide folder), orphan old R2 folders, the old `Preview/` folders, then the unique index left pending by the earlier dedupe.

**Rollback of everything**: for each file in `docs/bulk_reparse_runs/results_*.json` run `--rollback <file>`; then `node scripts/rebuild_review_index.mjs --execute`.

## 8. Gotchas and lessons (these cost time)
- **Vercel Hobby cap = 12 serverless functions** (every non-underscore `.js` under `api/`). A 13th makes every deploy fail. Admin auth now lives in `api/_lib/adminAuth.js`, dispatched from `api/admin/misc.js` (`?fn=auth`) by a rewrite. List and ideas: `docs/VERCEL_FUNCTIONS.md`. Check with `find api -name '*.js' ! -path '*/_*' | wc -l`.
- Vercel's security checkpoint blocks scripted `curl` after repeated requests (403 "Security Checkpoint"). Check deploys with `gh api repos/VeerNXT-ESM/veernxt-web/commits/<sha>/status`.
- Supabase returns **max 1,000 rows per query**: always page with `.range()`; this once showed 0 exams for a book that has 1,130.
- Repo files are **CRLF**; scripted edits must normalise line endings. Heredocs and `sed` mangle backslashes and backticks: use the Edit/Write tools or a patch file.
- In Git Bash `/tmp` and Node's `/tmp` were different folders (`K:\tmp`).
- Windows folder locks (`ENOTEMPTY` / `EPERM`) after deleting a folder open in the IDE: write to a fresh folder; `rmSync` now retries. A stale empty `.git/index.lock` (no git process) blocked commits once: it is safe to delete only after checking no git process runs.
- `normalise` text for comparison with `\p{L}\p{M}\p{N}` and the `u` flag (Devanagari marks are `\p{M}`); never strip `<...>` from text that is already plain (a literal "<" deletes everything up to the next ">").
- R2 files are cached 300 s (`Cache-Control`), so a re-upload can look stale for 5 minutes.
- No browser automation exists here: nothing was verified in a real browser. Lint, `vite build`, data checks and the verifier were the evidence.
- The review index once lost entries because it de-duplicated by title only (Guide and Precis share titles): key it by category + title.
- `docs/*.xlsx`, `FINAL_*_STRUCTURED/` and `books/` stay untracked (user rule); `docs/bulk_reparse_runs/` and the swap map are small JSON and ARE tracked.

## 9. Commits (main)
`afff8a1` direct parser + scripts; `6fea884` / `efc7bfc` list markers CSS; `856e758` Vercel back to 12 functions; `013e409` `b3df0ef` big number removed, subject separator, scan docs; `e8a9cb6` `8df2a36` first "2026 NEW" previews; `ea94d9e` `3586abf` subject covers, full-page cover; `81a5e13` white tables; `0c9ad86` plan; `f4f4a08` bulk tooling; `3d88b7c` run + review doc; `e006446` `c466e47` sources by text; `359e59f` DevReader clean list; plus this reference commit.

## 10. Appendix: old books to new books (from `book_swap_map_2026-10-07.json`)
| Cat | Old book (exams) | Old resource_id (canonical row) | Status | New book | New resource_id |
|---|---|---|---|---|---|
| Guide | 2026 Descriptive Writing Bank Exams (37) | dd5e3b80-fdd2-454e-8711-d519e343e0a5 | ready | 2026 Descriptive Writing Bank Exams 2026 NEW | 1fe504eb-4548-4454-a454-1fe504eb4548 |
| Guide | Andaman Nicobar GS (17) | 489f834b-6134-4613-a613-489f834b6134_7e78399e | ready | Andaman Nicobar GS 2026 NEW | 50299cf0-13c9-413c-a13c-50299cf013c9 |
| Guide | Andhra Pradesh GS (21) | 70be19d4-399e-4399-a399-70be19d4399e | ready | Andhra Pradesh GS 2026 NEW | 3765985b-0b9f-40b9-a0b9-3765985b0b9f |
| Guide | ARUNACHAL PRADESH GS (31) | 74750d3d-2b66-42b6-a2b6-74750d3d2b66 | covered (identical text) | ARUNACHAL PRADESH SI 2026 NEW | 4e9c2ad7-183c-4183-a183-4e9c2ad7183c |
| Guide | ARUNACHAL PRADESH SI (35) | 40f537cc-2779-4277-a277-40f537cc2779_63c5c185 | ready | ARUNACHAL PRADESH SI 2026 NEW | 4e9c2ad7-183c-4183-a183-4e9c2ad7183c |
| Guide | Assam GS (30) | 53e01e37-23ae-423a-a23a-53e01e3723ae_777bea35 | ready | Assam GS 2026 NEW | 4ecd2c29-2fcd-42fc-a2fc-4ecd2c292fcd |
| Guide | Bihar GS (36) | 7afaca17-588f-4588-a588-7afaca17588f_489d4f05 | ready | Bihar GS 2026 NEW | 225a86b4-0a2c-40a2-a0a2-225a86b40a2c |
| Guide | Chandigarh GS (14) | 0622afa9-0835-4083-a083-0622afa90835_174a9890 | ready | Chandigarh GS 2026 NEW | 3ce4dae1-68e6-468e-a68e-3ce4dae168e6 |
| Guide | Chhattisgarh GS (11) | 4d1e99b8-7fdf-47fd-a7fd-4d1e99b87fdf_13258dd4 | ready | Chhattisgarh GS (SI) 2026 NEW | 5e0848d7-02e6-402e-a02e-5e0848d702e6 |
| Guide | Chhattisgarh GS (23) | 73463d42-4554-4455-a455-73463d424554 | covered (identical text) | Chhattisgarh GS (SI) 2026 NEW | 5e0848d7-02e6-402e-a02e-5e0848d702e6 |
| Guide | Computer Science (341) | 31cb6eed-1354-4135-a135-31cb6eed1354_1d174c11 | ready | Computer Science 2026 NEW | 714a4117-47be-447b-a47b-714a411747be |
| Guide | Dadra Nagar Haveli Daman Diu GS (16) | 33399396-4b22-44b2-a4b2-333993964b22_4b9b274b | ready | Dadra Nagar Haveli Daman Diu GS 2026 NEW | 688dbca1-7c11-47c1-a7c1-688dbca17c11 |
| Guide | Delhi GS Book (33) | 14ab519b-68e2-468e-a68e-14ab519b68e2_51ecbb18 | ready | Delhi GS Book 2026 NEW | 0a8eaf3d-5e60-45e6-a5e6-0a8eaf3d5e60 |
| Guide | Delhi Police Driver Traffic Rules (1) | d9e23dad-112d-4e82-b284-733f46ed18a4 | ready | Delhi Police Driver Traffic Rules 2026 NEW | 2fba9371-2b63-42b6-a2b6-2fba93712b63 |
| Guide | ELECTRICAL ENGINEERING (1) | 28505818-fc7b-47e1-a17c-dea90daa717a | covered (identical text) | ELECTRICAL ENGINEERING 2026 NEW | 01fca38c-7561-4756-a756-01fca38c7561 |
| Guide | ENGLISH (939) | 345ae2f4-c7f8-4cc8-9926-578d005fe2d8 | source_needed | **not built (English Guide: source undecided)** |  |
| Guide | Goa GS (1) | 3af95599-61fa-461f-a61f-3af9559961fa | covered (identical text) | Goa GS 2026 NEW | 69e7fca2-7024-4702-a702-69e7fca27024 |
| Guide | Goa GS (16) | 0a84fa19-7d2e-47d2-a7d2-0a84fa197d2e_0378fdf2 | ready | Goa GS 2026 NEW | 69e7fca2-7024-4702-a702-69e7fca27024 |
| Guide | GS & GK (1130) | 125ec54d-0a3d-40a3-a0a3-125ec54d0a3d_1d174c11 | ready | GS & GK 2026 NEW | 2933909f-556e-4556-a556-2933909f556e |
| Guide | Gujarat GS (31) | 0482fccc-1048-4104-a104-0482fccc1048_314547d2 | ready | Gujarat GS 2026 NEW | 30350892-08ea-408e-a08e-3035089208ea |
| Guide | Haryana GS (30) | 08d819d4-3339-4333-a333-08d819d43339_61c722d1 | ready | Haryana GS 2026 NEW | 5864e1d5-2d4c-42d4-a2d4-5864e1d52d4c |
| Guide | Himachal Pradesh GS (10) | 64176b06-4417-4441-a441-64176b064417_7c750442 | ready | Himachal Pradesh GS (CONSTABLE) 2026 NEW | 02943cd6-5187-4518-a518-02943cd65187 |
| Guide | Himachal Pradesh GS (18) | 2ea775a3-22a0-422a-a22a-2ea775a322a0 | covered (identical text) | Himachal Pradesh GS (CONSTABLE) 2026 NEW | 02943cd6-5187-4518-a518-02943cd65187 |
| Guide | HINDI (340) | 8f1d501f-cef0-4268-a112-883052142a15 | ready | HINDI 2026 NEW | 4ae22552-1aee-41ae-a1ae-4ae225521aee |
| Guide | Jammu_Kashmir_GS_Book (37) | 53f3fb1a-26e1-426e-a26e-53f3fb1a26e1_087a1d1e | ready | Jammu_Kashmir_GS_Book 2026 NEW | 11ea16c3-3fbf-43fb-a3fb-11ea16c33fbf |
| Guide | Jharkhand GS Book (34) | 317d179a-396a-4396-a396-317d179a396a_16dc2e86 | ready | Jharkhand GS Book 2026 NEW | 29d86906-1562-4156-a156-29d869061562 |
| Guide | Karnataka GS (9) | 5d133db9-653a-4653-a653-5d133db9653a_161197db | ready | Karnataka GS (CONSTABLE) 2026 NEW | 26038f77-4ca2-44ca-a4ca-26038f774ca2 |
| Guide | Karnataka GS (21) | 1d7bf23d-51b7-451b-a51b-1d7bf23d51b7 | covered (identical text) | Karnataka GS (CONSTABLE) 2026 NEW | 26038f77-4ca2-44ca-a4ca-26038f774ca2 |
| Guide | KERALA GS (24) | 76b3b088-6776-4677-a677-76b3b0886776_0c8d1833 | ready | KERALA GS 2026 NEW | 635d5d65-017b-4017-a017-635d5d65017b |
| Guide | Ladakh GS (18) | 25f1a637-7020-4702-a702-25f1a6377020_3e5c1537 | ready | Ladakh GS 2026 NEW | 1903d603-1899-4189-a189-1903d6031899 |
| Guide | Lakshadweep GS (12) | 29dec820-2d4d-42d4-a2d4-29dec8202d4d_4f0c555b | ready | Lakshadweep GS 2026 NEW | 0d9fccff-24e0-424e-a24e-0d9fccff24e0 |
| Guide | Madhya Pradesh GS (28) | 6216e61f-37f5-437f-a37f-6216e61f37f5_76e0f56c | ready | Madhya Pradesh GS 2026 NEW | 3da05460-56dc-456d-a56d-3da0546056dc |
| Guide | MAHARASHTRA GS (26) | 20b8a4db-2add-42ad-a2ad-20b8a4db2add_65ec1d58 | ready | MAHARASHTRA GS 2026 NEW | 5e5377f1-1755-4175-a175-5e5377f11755 |
| Guide | Manipur GS Book (22) | 2eb2379d-4b02-44b0-a4b0-2eb2379d4b02_1d174c11 | ready | Manipur GS Book 2026 NEW | 04f55e26-62e9-462e-a62e-04f55e2662e9 |
| Guide | Mathematics (1013) | 20924968-4525-4452-a452-209249684525_1d174c11 | ready | Mathematics 2026 NEW | 5e69a4a9-6a93-46a9-a6a9-5e69a4a96a93 |
| Guide | MATHS AND REASONING (2) | 7826dff8-69ab-41c4-aac9-f4792eed62ed | ready | MATHS AND REASONING 2026 NEW | 32861a4a-5697-4569-a569-32861a4a5697 |
| Guide | Meghalaya GS (17) | 48561952-74ca-474c-a74c-4856195274ca_1e2d8340 | ready | Meghalaya GS 2026 NEW | 6e3ec792-2654-4265-a265-6e3ec7922654 |
| Guide | Metro_Technical_Knowledge (3) | 482fadc4-0504-4050-a050-482fadc40504 | ready | Metro_Technical_Knowledge 2026 NEW | 690cc395-58ea-458e-a58e-690cc39558ea |
| Guide | Mizoram GS (17) | 03f73970-1cf1-41cf-a1cf-03f739701cf1_6dba1b05 | ready | Mizoram GS 2026 NEW | 3009b8d3-547e-4547-a547-3009b8d3547e |
| Guide | Nursing (109) | 0fc930ab-0140-4133-91be-15651aa7dbe5 | ready | Nursing 2026 NEW | 06a72a5a-067a-4067-a067-06a72a5a067a |
| Guide | Odisha GS (20) | 5e0f8b4a-1859-4185-a185-5e0f8b4a1859_059ef870 | ready | Odisha GS 2026 NEW | 14da93fd-4885-4488-a488-14da93fd4885 |
| Guide | Puducherry GS (13) | 73cf1ee4-437c-4437-a437-73cf1ee4437c_7955396e | ready | Puducherry GS 2026 NEW | 6b2bd0aa-4f7a-44f7-a4f7-6b2bd0aa4f7a |
| Guide | PUNJAB GS (16) | 7b55951d-03bb-403b-a03b-7b55951d03bb_315b590d | ready | PUNJAB GS 2026 NEW | 0406085c-1aa5-41aa-a1aa-0406085c1aa5 |
| Guide | RAJASTHAN GS (46) | 3a68a75a-42dc-442d-a42d-3a68a75a42dc_74fc4fd1 | ready | RAJASTHAN GS 2026 NEW | 777a7ed9-7d29-47d2-a7d2-777a7ed97d29 |
| Guide | Reasoning (920) | 756514fe-4f8c-44f8-a4f8-756514fe4f8c_47228b1e | ready | Reasoning 2026 NEW | 6f3c6236-6e53-46e5-a6e5-6f3c62366e53 |
| Guide | TamilNadu GS (24) | 5623812b-5b47-45b4-a5b4-5623812b5b47_0918ee90 | ready | TamilNadu GS 2026 NEW | 3aff8dfe-7954-4795-a795-3aff8dfe7954 |
| Guide | Telangana GS 2026 (21) | 23275112-0968-4096-a096-232751120968_3f365d2c | ready | Telangana GS 2026 2026 NEW | 4b13df73-2a66-42a6-a2a6-4b13df732a66 |
| Guide | Tripura GS (16) | 2d86f4e0-1862-4186-a186-2d86f4e01862_616fe1f9 | ready | Tripura GS 2026 NEW | 20fd80f8-285e-4285-a285-20fd80f8285e |
| Guide | Uttarakhand GS (16) | 75ac958c-4322-4432-a432-75ac958c4322_58b6af96 | ready | Uttarakhand GS 2026 NEW | 399940e1-384c-4384-a384-399940e1384c |
| Guide | West Bengal GS (13) | 14484429-2347-4234-a234-144844292347_02bbef62 | ready | West Bengal GS 2026 NEW | 2af1f30a-3641-4364-a364-2af1f30a3641 |
| Precis | 2026 GK-GS (104) | 050f4eea-49b4-483c-b396-948ae6480b45 | covered (replaced by GS & GK Precis) | GS & GK 2026 NEW | 088a411c-0efe-40ef-a0ef-088a411c0efe |
| Precis | Computer Science (341) | 77a55f03-23c9-423c-a23c-77a55f0323c9_1d174c11 | ready | Computer Science 2026 NEW | 101d1a4c-7d3f-47d3-a7d3-101d1a4c7d3f |
| Precis | ELECTRICAL ENGINEERING (1) | b73afd42-f681-453c-8d04-32d2d172656c | ready | ELECTRICAL ENGINEERING 2026 NEW | 01fca38c-7561-4756-a756-01fca38c7561 |
| Precis | ENGLISH (939) | 0503abd3-2d38-42d3-a2d3-0503abd32d38 | ready | ENGLISH 2026 NEW | 62442489-1e32-41e3-a1e3-624424891e32 |
| Precis | GS & GK (1130) | 349e75e0-7927-4792-a792-349e75e07927_7101afd1 | ready | GS & GK 2026 NEW | 088a411c-0efe-40ef-a0ef-088a411c0efe |
| Precis | HINDI (340) | 472e55b9-34ef-434e-a34e-472e55b934ef_7c149f88 | ready | HINDI 2026 NEW | 7bb8ae90-7047-4704-a704-7bb8ae907047 |
| Precis | MATHEMATICS (1013) | 7c4ebdfc-5c68-45c6-a5c6-7c4ebdfc5c68 | ready | MATHEMATICS 2026 NEW | 049a73af-47cc-447c-a47c-049a73af47cc |
| Precis | REASONING (920) | 4aaea18f-598c-4598-a598-4aaea18f598c_47228b1e | ready | REASONING 2026 NEW | 36dcf839-0c80-40c8-a0c8-36dcf8390c80 |

