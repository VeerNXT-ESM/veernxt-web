# Bulk reparse plan: every linked Guide/Precis book as a NEW "2026 NEW" book (2026-10-07)

Status: **PLAN, not executed.** Nothing below has been run against Supabase or R2 for the bulk. GS & GK Guide + Precis were done by hand as the pilot (preview only).

## 0. Rules (from the product owner)
1. **Never overwrite.** Every book becomes a NEW entry titled `<old title> 2026 NEW`. Old rows, old R2 folders and exam links are not touched.
2. Content team signs off all books. **Then** swap, **then** purge bloat. Not before.
3. Scope = the linked Guide and Precis books: 58 storage folders, 54 distinct titles (50 Guide, 8 Precis). Intros, quizzes and PYQs are out of scope. Unlinked master DOCX are out of scope unless you say otherwise.

## 1. What "a new entry" is
Same shape the admin tools already create (`api/admin/save-resource.js` books-create / books-duplicate):
- R2: `structured_resources/blocks/<Category>/<new resource_id>/` with `metadata.json`, `chapters/chapter-N.json`, `images/*`. New id per book; the prefix must not exist.
- DB: ONE new `resources` row per book: `title` = "<old title> 2026 NEW", `format` = blocks, `status` = **Draft** (hidden from learners by RLS; the admin Book Content page still shows it), `chapter_count`, `storage_base_url`, `metadata_url`, `source_file` = the DOCX used. Display fields (subject, level, state_ut, conducting_body, thumbnail_url, reader_theme_id, subject_accent, is_freemium, is_locked, unlock_cost) copied from the old canonical row so the later swap is seamless. `exam_name` left empty so the legacy text-match fallback can never surface it.
- **No** `lc_exam_resource_map` rows. New books are linked to no exam until the swap.
- Content team review: a list of all "2026 NEW" books in `/dev-reader` (driven by a manifest on R2, see 3.4), plus the admin Book Content page.

## 2. Per-book pipeline (one script, manifest driven)
`scripts/bulk_reparse_books.mjs` reads a manifest (old resource id, category, old title, source DOCX, new title) and for each book:
1. **Resolve source**: manifest path must exist and not be the old live copy by accident; record file hash.
2. **Parse** with the direct parser (no AI), images to a local folder.
3. **Verify automatically** against the DOCX XML: text order identical, every image placed after its anchor paragraph, no AI/unknown blocks, chapter count > 0. **Any failure = book skipped, nothing uploaded**, reason logged.
4. **Upload** to the new R2 prefix (refuse if the prefix is not empty).
5. **Insert** the Draft `resources` row (refuse if a row with that title+category exists; insert only, never update/delete).
6. **Record** everything in a results manifest (resource id, prefix, counts, hashes). This file is also the rollback list.
7. Write a content-team report: per book chapters, subjects, images, tables, list items, flags (oversized chapter, duplicate titles, TOC dropped, chapters missing numbers).

Modes: `--dry-run` (default: steps 1-3 only, local output, no network writes), `--only "<title>"`, `--limit N`, `--execute`. `--rollback <results.json>` deletes only the rows and R2 prefixes that run created.

Safety guarantees: insert-only DB writes; R2 writes only under new prefixes; before/after count check (`resources` rows must grow by exactly the number of new books, `lc_exam_resource_map` unchanged); anon-key check that no new Draft row is visible to learners; the run aborts on the first unexpected error.

## 3. Work to build before the bulk run
1. **Parser rule: drop a chapter titled "Table of Contents" / "Contents"** (17 linked books; State/UT GS books). Deterministic.
2. **Parser fallback for documents with no Heading styles** (4 linked: Hindi Guide, Bihar GS, Assam GS, Electrical Engineering Precis). Option A: visual rules (a paragraph that is bold + larger font or matches `Chapter N` / `अध्याय N` / numbered all-caps becomes a heading) with a report for review. Option B: content team applies Heading styles in a copy. Recommendation: A for a first pass, flagged "needs review".
3. **Subject covers** already work; make the cover/contents pages also appear for any multi-subject book automatically (already data-driven by `chapter.part`).
4. **Review list**: the bulk script writes `structured_resources/blocks/_review/index.json` (title, category, id, base URL, chapters, flags) and `/dev-reader` reads it, replacing the hard-coded picker.
5. **Verifier library**: move the checks I used by hand into `scripts/lib/verifyBook.mjs`.
6. **Rollback** script (3-line manifest replay).
7. Same-title variants (Goa, Karnataka, Chhattisgarh, Himachal: a "GS" file and an "SI/Constable" file): parse both, compare text; if identical content publish one new book, otherwise two ("<State> GS 2026 NEW", "<State> SI 2026 NEW" / "Constable").

## 4. Waves
- **Wave 0: done (GS & GK)**: 3 rows
- **Wave 1: ready now (clean, or only the Table-of-Contents rule)**: 28 rows
- **Wave 2: parse now, structure needs content-team review (oversized / tiny / duplicate chapters, several subjects)**: 12 rows
- **Wave 3: DOCX has no heading styles (needs a styled copy or a visual-structure rule)**: 4 rows
- **Wave 4: source DOCX must be named by the content team**: 11 rows

Order of execution: Wave 1 first as a pilot (3 books, then the rest), then Wave 2, then Wave 3 and 4 as the content team resolves them. Each wave ends with a report and a pause for the content team.

## 5. The 11 books whose source file is not in MASTER DOCUMENTS
The old live content was built from other copies, and the same file name exists as **many different files** (checked by hash: e.g. 42 different `Karnataka_GS.docx`, 24 `Chhattisgarh_GS.docx`, 28 `Himachal_Pradesh_GS.docx`, 19 `Andhra_Pradesh GS.docx`, ~1,090 `MATHEMATICS.docx` / `REASONING.docx`). The right source cannot be inferred. Three have no copy at all (`Metro_Technical_Knowledge.docx`, `Goa SI.docx`, `Cluster_042_ELECTRICAL ENGINEERING.docx`). **Content team: please name the final DOCX for each** (path or drop it in the master folder). Until then these books are not parsed. The Guide ENGLISH row's live source (Cluster_087, 26 chapters) is older than the master Guide Cluster_005_ENGLISH (21 chapters): which is final?

## 6. After sign-off (NOT part of this run)
1. **Swap**, per book, with a DB backup first (`K:\tmp\db_backups`): point the exam links at the new row (`lc_exam_resource_map.resource_id`, de-duplicated to one link per exam+category), set the new row Published, drop the " 2026 NEW" suffix, keep the old row as Archived until verified. Verify with the **anon key**, not only the service role.
2. **Purge bloat**, also backed up: the duplicate `resources` rows behind each book (e.g. 420 rows share the one GS & GK Guide folder; ~1,660 published Guide and ~1,900 published Precis rows for 58 folders), orphan old R2 folders, the old Preview folders, and the stale `chapter_count` values. Then add the unique index the earlier dedupe left pending.

## 7. Decisions needed
1. Scope: all 58 linked rows (54 titles). Anything else ("whatever guides are there" beyond the linked ones)?
2. OK to build the bulk script and run **Wave 1 as a dry run** (local only), then the real pilot of 3 books, then the rest of Wave 1?
3. Wave 3 approach: visual-structure rule (my recommendation) or content-team styled copies?
4. New rows as **Draft** (recommended) or Published-but-unlinked?

## 8. Per-book table
| Wave | Exams | Cat | Title (live) | New title | Live ch | DOCX ch | Source DOCX (live) | Flags |
|---|---:|---|---|---|---:|---:|---|---|
| 0 | 1130 | Guide | GS & GK | GS & GK 2026 NEW | 76 | 66 | Cluster_006_GS & GK GUIDE BOOK.docx | 7 subjects |
| 0 | 1130 | Precis | GS & GK | GS & GK 2026 NEW | 136 | 127 | Cluster_001_SSC COMPLETE GK.docx | oversized 249, 1 dup titles, 8 subjects |
| 0 | 104 | Precis | 2026 GK-GS | 2026 GK-GS 2026 NEW | 127 | 127 | Cluster_001_SSC COMPLETE GK.docx | oversized 249, 1 dup titles, 8 subjects |
| 1 | 341 | Precis | Computer Science | Computer Science 2026 NEW | 15 | 14 | Cluster_040_Computer Science guide Book.docx | clean |
| 1 | 341 | Guide | Computer Science | Computer Science 2026 NEW | 15 | 14 | Cluster_009_Computer Science guide Book.docx | clean |
| 1 | 109 | Guide | Nursing | Nursing 2026 NEW | 18 | 18 | Cluster_078_Nursing Book.docx | clean |
| 1 | 37 | Guide | Jammu_Kashmir_GS_Book | Jammu_Kashmir_GS_Book 2026 NEW | 36 | 35 | Jammu_Kashmir_GS_Book.docx | TOC chapter |
| 1 | 37 | Guide | 2026 Descriptive Writing Bank Exams | 2026 Descriptive Writing Bank Exams 2026 NEW | 34 | 34 | Cluster_080_Descriptive_Writing_Bank_Exams.docx | clean |
| 1 | 34 | Guide | Jharkhand GS Book | Jharkhand GS Book 2026 NEW | 13 | 12 | Jharkhand_GS_Book (1).docx | TOC chapter |
| 1 | 33 | Guide | Delhi GS Book | Delhi GS Book 2026 NEW | 14 | 13 | Delhi_GS_Book.docx | TOC chapter |
| 1 | 31 | Guide | Gujarat GS | Gujarat GS 2026 NEW | 15 | 14 | Gujarat_GS (1).docx | TOC chapter |
| 1 | 30 | Guide | Haryana GS | Haryana GS 2026 NEW | 12 | 11 | Haryana_GS (1).docx | clean |
| 1 | 26 | Guide | MAHARASHTRA GS | MAHARASHTRA GS 2026 NEW | 13 | 12 | MAHARSHTRA GS (1).docx | clean |
| 1 | 24 | Guide | KERALA GS | KERALA GS 2026 NEW | 16 | 15 | KERALA CONSTABLE (1).docx | clean |
| 1 | 24 | Guide | TamilNadu GS | TamilNadu GS 2026 NEW | 12 | 11 | TamilNadu CONSTABLE (1).docx | clean |
| 1 | 22 | Guide | Manipur GS Book | Manipur GS Book 2026 NEW | 14 | 13 | Manipur_GS_Book.docx | TOC chapter |
| 1 | 21 | Guide | Telangana GS 2026 | Telangana GS 2026 2026 NEW | 11 | 10 | Telangana_CONSTABLE.docx | clean |
| 1 | 18 | Guide | Ladakh GS | Ladakh GS 2026 NEW | 16 | 15 | Ladakh_GS_Book.docx | TOC chapter |
| 1 | 17 | Guide | Andaman Nicobar GS | Andaman Nicobar GS 2026 NEW | 12 | 11 | Andaman_Nicobar_GS_Book (1).docx | TOC chapter |
| 1 | 17 | Guide | Meghalaya GS | Meghalaya GS 2026 NEW | 13 | 12 | Meghalaya_GS_Book.docx | TOC chapter |
| 1 | 17 | Guide | Mizoram GS | Mizoram GS 2026 NEW | 13 | 12 | Mizoram_GS_Book (1).docx | TOC chapter |
| 1 | 16 | Guide | Dadra Nagar Haveli Daman Diu GS | Dadra Nagar Haveli Daman Diu GS 2026 NEW | 13 | 12 | Dadra_Nagar_Haveli_Daman_Diu_GS_Book.docx | TOC chapter |
| 1 | 16 | Guide | Goa GS | Goa GS 2026 NEW | 14 | 13 | Goa GS (1).docx | clean |
| 1 | 16 | Guide | PUNJAB GS | PUNJAB GS 2026 NEW | 13 | 12 | punjab si guide book (1).docx | clean |
| 1 | 14 | Guide | Chandigarh GS | Chandigarh GS 2026 NEW | 13 | 12 | Chandigarh_GS_Book.docx | TOC chapter |
| 1 | 13 | Guide | Puducherry GS | Puducherry GS 2026 NEW | 14 | 13 | Puducherry_GS_Book.docx | TOC chapter |
| 1 | 12 | Guide | Lakshadweep GS | Lakshadweep GS 2026 NEW | 13 | 12 | Lakshadweep_GS_Book.docx | TOC chapter |
| 1 | 11 | Guide | Chhattisgarh GS | Chhattisgarh GS 2026 NEW | 18 | 17 | Chhattisgarh_SI (1).docx | TOC chapter |
| 1 | 10 | Guide | Himachal Pradesh GS | Himachal Pradesh GS 2026 NEW | 14 | 13 | Himachal_Pradesh_CONSTABLE (1).docx | clean |
| 1 | 9 | Guide | Karnataka GS | Karnataka GS 2026 NEW | 18 | 17 | Karnataka_CONSTABLE (1).docx | clean |
| 1 | 1 | Guide | Delhi Police Driver Traffic Rules | Delhi Police Driver Traffic Rules 2026 NEW | 14 | 14 | Cluster_076_Delhi_Police_Driver_Traffic_Rules.docx | TOC chapter |
| 2 | 1013 | Guide | Mathematics | Mathematics 2026 NEW | 9 | 7 | Cluster_008_MATHEMATICS.docx | 1 subjects |
| 2 | 939 | Precis | ENGLISH | ENGLISH 2026 NEW | 1 | 21 | Cluster_005_ENGLISH.docx | 4 tiny |
| 2 | 920 | Guide | Reasoning | Reasoning 2026 NEW | 12 | 6 | Cluster_007_REASONING.docx | 5 subjects |
| 2 | 340 | Precis | HINDI | HINDI 2026 NEW | 19 | 18 | Cluster_012_HINDI.docx | oversized 545 |
| 2 | 46 | Guide | RAJASTHAN GS | RAJASTHAN GS 2026 NEW | 24 | 23 | RAJASTHAN SI GS GUIDE (1).docx | TOC chapter, 5 tiny |
| 2 | 35 | Guide | ARUNACHAL PRADESH SI | ARUNACHAL PRADESH SI 2026 NEW | 16 | 15 | ARUNACHAL PRADESH SI (1).docx | oversized 197 |
| 2 | 28 | Guide | Madhya Pradesh GS | Madhya Pradesh GS 2026 NEW | 16 | 13 | Madhya_Pradesh_GS (1).docx | 1 subjects |
| 2 | 20 | Guide | Odisha GS | Odisha GS 2026 NEW | 24 | 23 | Odisha CONSTABLE (1).docx | TOC chapter, 5 tiny |
| 2 | 16 | Guide | Uttarakhand GS | Uttarakhand GS 2026 NEW | 14 | 13 | Uttarakhand_CONSTABLE (1).docx | oversized 364 |
| 2 | 16 | Guide | Tripura GS | Tripura GS 2026 NEW | 16 | 15 | Tripura_CONSTABLE.docx | oversized 204 |
| 2 | 13 | Guide | West Bengal GS | West Bengal GS 2026 NEW | 28 | 27 | WB_Police_ SI.docx | 13 tiny |
| 2 | 2 | Guide | MATHS AND REASONING | MATHS AND REASONING 2026 NEW | 13 | 13 | Cluster_019_MATHS AND REASONING GUIDE BOOK.docx | 6 subjects |
| 3 | 340 | Guide | HINDI | HINDI 2026 NEW | 6 | 0 | Cluster_010_HINDI.docx | NO HEADINGS |
| 3 | 36 | Guide | Bihar GS | Bihar GS 2026 NEW | 1 | 0 | Bihar_GS (1).docx | NO HEADINGS |
| 3 | 30 | Guide | Assam GS | Assam GS 2026 NEW | 1 | 0 | Assam_GS (1).docx | NO HEADINGS |
| 3 | 1 | Precis | ELECTRICAL ENGINEERING | ELECTRICAL ENGINEERING 2026 NEW | 1 | 0 | Cluster_044_ELECTRICAL ENGINEERING.docx | NO HEADINGS |
| 4 | 1013 | Precis | MATHEMATICS | MATHEMATICS 2026 NEW | 20 | - | MATHEMATICS.docx | SOURCE NOT IN MASTER FOLDER |
| 4 | 939 | Guide | ENGLISH | ENGLISH 2026 NEW | 26 | - | Cluster_087_ENGLISH.docx | SOURCE NOT IN MASTER FOLDER |
| 4 | 920 | Precis | REASONING | REASONING 2026 NEW | 1 | - | REASONING.docx | SOURCE NOT IN MASTER FOLDER |
| 4 | 31 | Guide | ARUNACHAL PRADESH GS | ARUNACHAL PRADESH GS 2026 NEW | 16 | - | ARUNACHAL PRADESH GS.docx | SOURCE NOT IN MASTER FOLDER |
| 4 | 23 | Guide | Chhattisgarh GS | Chhattisgarh GS 2026 NEW | 18 | - | Chhattisgarh_GS.docx | SOURCE NOT IN MASTER FOLDER |
| 4 | 21 | Guide | Karnataka GS | Karnataka GS 2026 NEW | 18 | - | Karnataka_GS.docx | SOURCE NOT IN MASTER FOLDER |
| 4 | 21 | Guide | Andhra Pradesh GS | Andhra Pradesh GS 2026 NEW | 17 | - | Andhra_Pradesh GS.docx | SOURCE NOT IN MASTER FOLDER |
| 4 | 18 | Guide | Himachal Pradesh GS | Himachal Pradesh GS 2026 NEW | 14 | - | Himachal_Pradesh_GS.docx | SOURCE NOT IN MASTER FOLDER |
| 4 | 3 | Guide | Metro_Technical_Knowledge | Metro_Technical_Knowledge 2026 NEW | 50 | - | Metro_Technical_Knowledge.docx | SOURCE NOT IN MASTER FOLDER |
| 4 | 1 | Guide | Goa GS | Goa GS 2026 NEW | 14 | - | Goa SI.docx | SOURCE NOT IN MASTER FOLDER |
| 4 | 1 | Guide | ELECTRICAL ENGINEERING | ELECTRICAL ENGINEERING 2026 NEW | 1 | - | Cluster_042_ELECTRICAL ENGINEERING.docx | SOURCE NOT IN MASTER FOLDER |

---
## 9. Status 2026-10-07: tooling built, DRY RUN done (nothing written to Supabase or R2)
Decisions taken: scope = linked Guide/Precis only; new entries are **Draft**; books with no heading styles get a visual-structure rule (flagged for review); dry run first.

Built (uncommitted until the pilot): `scripts/build_reparse_manifest.mjs` (read-only, 58 entries), `scripts/bulk_reparse_books.mjs` (dry run by default; `--execute`, `--only`, `--limit`, `--rollback`), `scripts/lib/verifyBook.mjs` (independent check against the DOCX XML), parser rules in `scripts/lib/docxDirectParser.mjs` (drop a "Table of Contents" chapter; visual-structure mode only for documents with no Heading 1), `/dev-reader` reads the review index so every new book appears automatically.

Dry-run result (`docs/BULK_REPARSE_DRYRUN_2026-10-07.md`): **47 books parsed and verified** (text complete and in order, no invented text, images match, no AI blocks), **1 failed** (Mathematics Precis: no chapter names anywhere in the DOCX, only "1.1, 1.2..." sub-sections; needs a styled copy), **10 skipped** (9 need the content team to name the source file, 1 is the old "2026 GK-GS" Precis, covered by GS & GK).
Rules proven on the 4 no-heading books: Assam 10 chapters, Bihar 11, Hindi Guide 6, Electrical Engineering Precis 20; 17 Table-of-Contents chapters dropped.
Flags for the content team (per book in the report): oversized "Practice MCQs" chapters (Uttarakhand 364 blocks, Tripura 204, Arunachal SI 197, Hindi Precis 545, Reasoning Precis 376), tiny chapters (West Bengal 13, Electrical Engineering 9, Odisha and Rajasthan 4, English Precis 4), "chapter-like lines inside chapters" (Madhya Pradesh 12, Arunachal SI 11).
Title note: the old row "Telangana GS 2026" becomes "Telangana GS 2026 2026 NEW".
**Next:** pilot `--execute` on 3 books (Assam GS, Delhi GS Book, Nursing), check the counts, the anon-invisibility check and `/dev-reader`, then the rest of the verified books.
