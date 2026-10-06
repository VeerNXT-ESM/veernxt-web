# Book structure scan: all 67 DOCX in MASTER DOCUMENTS (2026-10-06)

Scanned with the new direct parser (`scripts/lib/docxDirectParser.mjs`, no images saved). Source folder:
`CONTENT/FINAL_CONTENT/Final Documents/MASTER DOCUMENTS/`. Result: **all 67 parse without errors**, but the *structure* of the documents varies a lot.
GK/GS is **not** the only difficult book, and it is not the typical one either.

## Summary by problem type
| Type | Books | Meaning | Fix |
|---|---|---|---|
| Clean | 20 | Heading 1 per chapter, Word lists/tables, no flags | none, parse as is |
| "Table of Contents" becomes chapter 1 | 18 | The TOC is styled Heading 1 (all State/UT GS books written the same way) | parser rule: drop a chapter titled Table of Contents / Contents (safe, deterministic) |
| **No heading styles at all** | 8 | Everything is "Normal"; structure is only visual (bold, big text, typed numbers). The direct parser returns **0 chapters** | needs a styled copy (like GSGK), or a visual-structure fallback in the parser |
| Several subjects in one book | 12 | Empty Heading 1 dividers split the book into subjects (GK/GS, RRB, Maths, Reasoning) | subject separator page + numbering per subject (done in the reader for the preview) |
| Oversized chapter (>150 blocks) | 9 | Chapters probably merged (missing Heading 1s) or one huge chapter | content-team review; same fix as GSGK |
| Duplicate chapter titles | 6 | Repeated generic headings (MCQs, ULTRA QUICK REVISION...) styled Heading 1 | demote to Heading 2 in the DOCX |
| Over-segmented | 1 | `Cluster_079_RRB COMPLETE GK`: 693 chapters, 590 of them under 4 blocks. Sections styled Heading 1 | restyle in the DOCX (sections to Heading 2) |

## Duplicate documents (same content filed twice)
- `Guide/GK-GS/Cluster_062_GENERAL KNOWLEDGE` has the same structure as `Precis/GK-GS/Cluster_001_SSC COMPLETE GK` (127 chapters, 215 images, 2,881 list items): the GK Precis sits in the Guide folder.
- `Guide/Unlabeled/Cluster_081_GEN AWARENESS` has the same structure as `Guide/GK-GS/Cluster_006_GS & GK GUIDE BOOK` (66 chapters, 1,513 bullets, 163 tables).
- `Guide/Computer/Cluster_009` and `Precis/Computer/Cluster_040` (Computer Science) match each other; so do the Guide and Precis `Cluster_005_ENGLISH`.
- `GS BOOK STATE/RAJASTHAN SI GS GUIDE (1)` and `_uncategorized/GK-GS/Cluster_059_RAJASTHAN SI GS GUIDE`.
(Matched by chapter, list, image and table counts, not by byte comparison.)

## Per-book table
| Book | MB | Ch | Subjects | Max blocks | Typed bullets | Word-list items | Images | Tables | Flags |
|---|---|---|---|---|---|---|---|---|---|
| Guide/Computer/Cluster_009_Computer Science guide Book | 8.6 | 14 | - | 37 | 0 | 294 | 1 | 46 | - |
| Guide/English/Cluster_005_ENGLISH | 0.1 | 21 | - | 62 | 28 | 0 | 0 | 7 | 4 tiny ch |
| Guide/GK-GS/Cluster_006_GS & GK GUIDE BOOK | 17.9 | 66 | 7 | 38 | 1513 | 0 | 41 | 163 | 7 subjects |
| Guide/GK-GS/Cluster_046_RRB GENERAL SCIENCE GUIDE BOOK | 3.8 | 17 | 3 | 37 | 341 | 0 | 1 | 42 | 3 subjects |
| Guide/GK-GS/Cluster_058_ITI_Technical_Trade_Literacy_GUIDE BOOK | 7.3 | 19 | - | 67 | 20 | 301 | 1 | 77 | 1 dup titles |
| Guide/GK-GS/Cluster_062_GENERAL KNOWLEDGE | 37.2 | 127 | 8 | 249 | 124 | 2881 | 215 | 37 | oversized ch (249), 1 dup titles, 8 subjects |
| Guide/GK-GS/Cluster_076_Delhi_Police_Driver_Traffic_Rules | 0.4 | 14 | - | 14 | 0 | 135 | 0 | 13 | TOC chapter |
| Guide/GS BOOK STATE/ARUNACHAL PRADESH SI (1) | 3.2 | 15 | - | 197 | 0 | 103 | 14 | 38 | oversized ch (197) |
| Guide/GS BOOK STATE/Andhra_Pradesh CONSTABLE (1) | 3.6 | 16 | - | 94 | 0 | 0 | 19 | 37 | - |
| Guide/GS BOOK STATE/Assam_GS (1) | 2.7 | 0 | - | - | 30 | 143 | 1 | 10 | NO HEADINGS |
| Guide/GS BOOK STATE/Bihar_GS (1) | 2.8 | 0 | - | - | 33 | 160 | 1 | 23 | NO HEADINGS |
| Guide/GS BOOK STATE/Chhattisgarh_SI (1) | 3.5 | 17 | - | 55 | 0 | 136 | 16 | 51 | TOC chapter |
| Guide/GS BOOK STATE/Goa GS (1) | 2.9 | 13 | - | 79 | 0 | 160 | 11 | 37 | - |
| Guide/GS BOOK STATE/Gujarat_GS (1) | 3.5 | 14 | - | 96 | 0 | 216 | 22 | 25 | TOC chapter |
| Guide/GS BOOK STATE/Haryana_GS (1) | 3 | 11 | - | 53 | 0 | 0 | 5 | 31 | - |
| Guide/GS BOOK STATE/Himachal_Pradesh_CONSTABLE (1) | 3.7 | 13 | - | 34 | 0 | 237 | 15 | 33 | - |
| Guide/GS BOOK STATE/Jharkhand_GS_Book (1) | 2.7 | 12 | - | 17 | 0 | 89 | 1 | 14 | TOC chapter |
| Guide/GS BOOK STATE/KERALA CONSTABLE (1) | 3.3 | 15 | - | 28 | 0 | 0 | 13 | 59 | - |
| Guide/GS BOOK STATE/Karnataka_CONSTABLE (1) | 3.3 | 17 | - | 20 | 25 | 0 | 11 | 84 | - |
| Guide/GS BOOK STATE/MAHARSHTRA GS (1) | 3.3 | 12 | - | 61 | 0 | 156 | 12 | 68 | - |
| Guide/GS BOOK STATE/Madhya_Pradesh_GS (1) | 3.6 | 13 | 1 | 52 | 0 | 167 | 16 | 37 | 1 subjects |
| Guide/GS BOOK STATE/Manipur_GS_Book | 2.7 | 13 | - | 17 | 0 | 86 | 1 | 11 | TOC chapter |
| Guide/GS BOOK STATE/Meghalaya_GS_Book | 2.7 | 12 | - | 18 | 0 | 65 | 1 | 12 | TOC chapter |
| Guide/GS BOOK STATE/Mizoram_GS_Book (1) | 2.7 | 12 | - | 16 | 0 | 76 | 1 | 10 | TOC chapter |
| Guide/GS BOOK STATE/Odisha CONSTABLE (1) | 3.4 | 23 | - | 22 | 0 | 52 | 14 | 57 | TOC chapter, 5 tiny ch |
| Guide/GS BOOK STATE/RAJASTHAN SI GS GUIDE (1) | 3 | 23 | - | 21 | 0 | 68 | 7 | 61 | TOC chapter, 5 tiny ch |
| Guide/GS BOOK STATE/TamilNadu CONSTABLE (1) | 3.6 | 11 | - | 64 | 0 | 148 | 16 | 33 | - |
| Guide/GS BOOK STATE/Telangana_CONSTABLE | 3.2 | 10 | - | 72 | 0 | 162 | 7 | 30 | - |
| Guide/GS BOOK STATE/Tripura_CONSTABLE | 3.9 | 15 | - | 204 | 0 | 180 | 19 | 32 | oversized ch (204) |
| Guide/GS BOOK STATE/Uttarakhand_CONSTABLE (1) | 3.5 | 13 | - | 364 | 0 | 95 | 13 | 47 | oversized ch (364) |
| Guide/GS BOOK STATE/WB_Police_ SI | 6.6 | 27 | - | 8 | 0 | 45 | 17 | 62 | 13 tiny ch |
| Guide/GS BOOK STATE/punjab si guide book (1) | 3.3 | 12 | - | 88 | 0 | 55 | 9 | 64 | - |
| Guide/GS BOOK UT/Andaman_Nicobar_GS_Book (1) | 2.7 | 11 | - | 25 | 0 | 157 | 1 | 18 | TOC chapter |
| Guide/GS BOOK UT/Chandigarh_GS_Book | 2.7 | 12 | - | 21 | 0 | 123 | 1 | 15 | TOC chapter |
| Guide/GS BOOK UT/Dadra_Nagar_Haveli_Daman_Diu_GS_Book | 2.7 | 12 | - | 23 | 0 | 108 | 1 | 18 | TOC chapter |
| Guide/GS BOOK UT/Delhi_GS_Book | 2.7 | 13 | - | 24 | 0 | 101 | 1 | 18 | TOC chapter |
| Guide/GS BOOK UT/Jammu_Kashmir_GS_Book | 2.8 | 35 | - | 35 | 0 | 275 | 1 | 38 | TOC chapter |
| Guide/GS BOOK UT/Ladakh_GS_Book | 2.7 | 15 | - | 19 | 0 | 135 | 1 | 18 | TOC chapter |
| Guide/GS BOOK UT/Lakshadweep_GS_Book | 2.7 | 12 | - | 16 | 0 | 86 | 1 | 10 | TOC chapter |
| Guide/GS BOOK UT/Puducherry_GS_Book | 2.7 | 13 | - | 21 | 0 | 79 | 1 | 16 | TOC chapter |
| Guide/Hindi/Cluster_010_HINDI | 4 | 0 | - | - | 0 | 47 | 1 | 25 | NO HEADINGS |
| Guide/Mathematics/Cluster_008_MATHEMATICS | 4.7 | 7 | 1 | 30 | 5 | 46 | 1 | 4 | 1 subjects |
| Guide/Mathematics/Cluster_019_MATHS AND REASONING GUIDE BOOK | 4.9 | 13 | 6 | 30 | 5 | 85 | 2 | 5 | 6 subjects |
| Guide/Reasoning/Cluster_007_REASONING | 4.7 | 6 | 5 | 17 | 0 | 39 | 2 | 1 | 5 subjects |
| Guide/Reasoning/Cluster_041_SSC REASONING GUIDE BOOK | 3.4 | 0 | - | - | 0 | 0 | 1 | 44 | NO HEADINGS |
| Guide/Unlabeled/Cluster_031_BASE BOOK | 3.2 | 0 | - | - | 0 | 36 | 5 | 62 | NO HEADINGS |
| Guide/Unlabeled/Cluster_037_Financial_Awareness_IBPS_RRB_GBO | 0.4 | 12 | - | 16 | 0 | 57 | 0 | 29 | - |
| Guide/Unlabeled/Cluster_048_HR_Personnel_Officer_IBPS_RRB_SO | 0.4 | 13 | - | 20 | 0 | 37 | 0 | 57 | - |
| Guide/Unlabeled/Cluster_049_IT_Officer_ | 0.5 | 13 | - | 36 | 0 | 63 | 0 | 89 | - |
| Guide/Unlabeled/Cluster_050_Rajbhasha_Adhikari_IBPS_RRB_SO | 0.4 | 12 | - | 21 | 0 | 42 | 0 | 50 | - |
| Guide/Unlabeled/Cluster_051_Law_Officer_ | 0.4 | 13 | - | 30 | 0 | 5 | 0 | 64 | - |
| Guide/Unlabeled/Cluster_078_Nursing Book | 3 | 18 | - | 28 | 0 | 0 | 1 | 171 | - |
| Guide/Unlabeled/Cluster_080_Descriptive_Writing_Bank_Exams | 0.4 | 34 | - | 23 | 8 | 0 | 0 | 0 | - |
| Guide/Unlabeled/Cluster_081_GEN AWARENESS | 18.1 | 66 | 7 | 38 | 1513 | 0 | 40 | 163 | 7 subjects |
| Guide/Unlabeled/Cluster_082_AGRICULTURAL AND RURAL DEVELOPMENT | 0.4 | 12 | - | 32 | 0 | 87 | 0 | 49 | - |
| Precis/Computer/Cluster_040_Computer Science guide Book | 4.6 | 14 | - | 37 | 0 | 294 | 1 | 46 | - |
| Precis/English/Cluster_005_ENGLISH | 0.9 | 21 | - | 62 | 28 | 0 | 1 | 7 | 4 tiny ch |
| Precis/GK-GS/Cluster_001_SSC COMPLETE GK | 35.9 | 127 | 8 | 249 | 124 | 2881 | 215 | 37 | oversized ch (249), 1 dup titles, 8 subjects |
| Precis/GK-GS/Cluster_043_RRB GS | 33.2 | 50 | 2 | 187 | 486 | 50 | 94 | 227 | oversized ch (187), 5 dup titles, 2 subjects |
| Precis/GK-GS/Cluster_079_RRB COMPLETE GK | 21.4 | 693 | 5 | 745 | 1405 | 13 | 123 | 506 | oversized ch (745), 85 dup titles, 590 tiny ch, 5 subjects |
| Precis/GK-GS/GSGK PRECIS 2026 | 35.9 | 128 | 7 | 105 | 124 | 2881 | 215 | 37 | 7 subjects |
| Precis/Hindi/Cluster_012_HINDI | 4.3 | 18 | - | 545 | 0 | 380 | 1 | 208 | oversized ch (545) |
| Precis/Mathematics/Cluster_003_MATHEMATICS | 3 | 0 | - | - | 0 | 0 | 11 | 134 | NO HEADINGS |
| Precis/Mathematics/Cluster_034_RRB COMPLETE MATHS(1) | 3 | 13 | - | 235 | 0 | 98 | 2 | 0 | oversized ch (235), 1 dup titles |
| Precis/Reasoning/Cluster_004_REASONING | 2.8 | 0 | - | - | 0 | 0 | 1 | 44 | NO HEADINGS |
| Precis/Unlabeled/Cluster_044_ELECTRICAL ENGINEERING | 2.9 | 0 | - | - | 0 | 0 | 6 | 88 | NO HEADINGS |
| _uncategorized/GK-GS/Cluster_059_RAJASTHAN SI GS GUIDE | 3.1 | 23 | - | 21 | 0 | 68 | 7 | 61 | TOC chapter, 5 tiny ch |

Notes: "Typed bullets" are Normal paragraphs starting with a bullet character; "Word-list items" are real Word list paragraphs. Both become list blocks. Counts include table-cell content.
Subjects = empty Heading 1 dividers found (the parser stores them as `chapter.part`).


---
# Scope: only the books linked to exams (decision 2026-10-06)

Only books that are **Published, block format and linked to at least one exam** matter. Counted from the database:
**58 linked storage folders = 54 distinct titles** (Goa, Karnataka, Chhattisgarh and Himachal GS each have two variants: GS and SI/Constable). The product owner's count is 53; I could not reproduce 53 exactly (likely the admin Book Content page, which merges duplicates differently). All 8 linked Precis and 50 linked Guides are in the table. No HTML-format book is linked.

**Working order:** finish and get content-team approval for the current book (GSGK) first, then move the remaining linked books one by one. The other master DOCX files (not linked) are out of scope for now.

| Exams | Cat | Title (as in app) | Live ch | DOCX ch | Structure flags |
|---:|---|---|---:|---:|---|
| 1130 | Guide | GS & GK | 76 | 66 | 7 subjects |
| 1130 | Precis | GS & GK | 136 | 127 | oversized 249, 1 dup titles, 8 subjects |
| 1013 | Precis | MATHEMATICS | 20 | - | SOURCE NOT IN MASTER FOLDER |
| 1013 | Guide | Mathematics | 9 | 7 | 1 subjects |
| 939 | Guide | ENGLISH | 26 | - | SOURCE NOT IN MASTER FOLDER |
| 939 | Precis | ENGLISH | 1 | 21 | 4 tiny |
| 920 | Precis | REASONING | 1 | - | SOURCE NOT IN MASTER FOLDER |
| 920 | Guide | Reasoning | 12 | 6 | 5 subjects |
| 341 | Precis | Computer Science | 15 | 14 | clean |
| 341 | Guide | Computer Science | 15 | 14 | clean |
| 340 | Precis | HINDI | 19 | 18 | oversized 545 |
| 340 | Guide | HINDI | 6 | 0 | NO HEADINGS |
| 109 | Guide | Nursing | 18 | 18 | clean |
| 104 | Precis | 2026 GK-GS | 127 | 127 | oversized 249, 1 dup titles, 8 subjects |
| 46 | Guide | RAJASTHAN GS | 24 | 23 | TOC chapter, 5 tiny |
| 37 | Guide | Jammu_Kashmir_GS_Book | 36 | 35 | TOC chapter |
| 37 | Guide | 2026 Descriptive Writing Bank Exams | 34 | 34 | clean |
| 36 | Guide | Bihar GS | 1 | 0 | NO HEADINGS |
| 35 | Guide | ARUNACHAL PRADESH SI | 16 | 15 | oversized 197 |
| 34 | Guide | Jharkhand GS Book | 13 | 12 | TOC chapter |
| 33 | Guide | Delhi GS Book | 14 | 13 | TOC chapter |
| 31 | Guide | Gujarat GS | 15 | 14 | TOC chapter |
| 31 | Guide | ARUNACHAL PRADESH GS | 16 | - | SOURCE NOT IN MASTER FOLDER |
| 30 | Guide | Haryana GS | 12 | 11 | clean |
| 30 | Guide | Assam GS | 1 | 0 | NO HEADINGS |
| 28 | Guide | Madhya Pradesh GS | 16 | 13 | 1 subjects |
| 26 | Guide | MAHARASHTRA GS | 13 | 12 | clean |
| 24 | Guide | KERALA GS | 16 | 15 | clean |
| 24 | Guide | TamilNadu GS | 12 | 11 | clean |
| 23 | Guide | Chhattisgarh GS | 18 | - | SOURCE NOT IN MASTER FOLDER |
| 22 | Guide | Manipur GS Book | 14 | 13 | TOC chapter |
| 21 | Guide | Karnataka GS | 18 | - | SOURCE NOT IN MASTER FOLDER |
| 21 | Guide | Andhra Pradesh GS | 17 | - | SOURCE NOT IN MASTER FOLDER |
| 21 | Guide | Telangana GS 2026 | 11 | 10 | clean |
| 20 | Guide | Odisha GS | 24 | 23 | TOC chapter, 5 tiny |
| 18 | Guide | Ladakh GS | 16 | 15 | TOC chapter |
| 18 | Guide | Himachal Pradesh GS | 14 | - | SOURCE NOT IN MASTER FOLDER |
| 17 | Guide | Andaman Nicobar GS | 12 | 11 | TOC chapter |
| 17 | Guide | Meghalaya GS | 13 | 12 | TOC chapter |
| 17 | Guide | Mizoram GS | 13 | 12 | TOC chapter |
| 16 | Guide | Dadra Nagar Haveli Daman Diu GS | 13 | 12 | TOC chapter |
| 16 | Guide | Goa GS | 14 | 13 | clean |
| 16 | Guide | PUNJAB GS | 13 | 12 | clean |
| 16 | Guide | Uttarakhand GS | 14 | 13 | oversized 364 |
| 16 | Guide | Tripura GS | 16 | 15 | oversized 204 |
| 14 | Guide | Chandigarh GS | 13 | 12 | TOC chapter |
| 13 | Guide | Puducherry GS | 14 | 13 | TOC chapter |
| 13 | Guide | West Bengal GS | 28 | 27 | 13 tiny |
| 12 | Guide | Lakshadweep GS | 13 | 12 | TOC chapter |
| 11 | Guide | Chhattisgarh GS | 18 | 17 | TOC chapter |
| 10 | Guide | Himachal Pradesh GS | 14 | 13 | clean |
| 9 | Guide | Karnataka GS | 18 | 17 | clean |
| 3 | Guide | Metro_Technical_Knowledge | 50 | - | SOURCE NOT IN MASTER FOLDER |
| 2 | Guide | MATHS AND REASONING | 13 | 13 | 6 subjects |
| 1 | Precis | ELECTRICAL ENGINEERING | 1 | 0 | NO HEADINGS |
| 1 | Guide | Goa GS | 14 | - | SOURCE NOT IN MASTER FOLDER |
| 1 | Guide | ELECTRICAL ENGINEERING | 1 | - | SOURCE NOT IN MASTER FOLDER |
| 1 | Guide | Delhi Police Driver Traffic Rules | 14 | 14 | TOC chapter |

Flag legend: **TOC chapter** = Table of Contents parsed as chapter 1 (parser rule fixes it). **NO HEADINGS** = DOCX has no heading styles (needs a styled copy or visual-structure detection). **subjects** = several subjects in one book (separator pages). **oversized / dup titles / tiny** = chapter structure to fix in the DOCX like GSGK. **SOURCE NOT IN MASTER FOLDER** = no file with that exact name in MASTER DOCUMENTS (the live content was built from another copy, e.g. under ORIGINAL CONTENT or DEPRECATED); the correct source must be confirmed by the content team before reparsing.

## What the linked scope changes
- Of the 58 linked rows: **13 are clean**, **17 only need the Table-of-Contents rule**, **7 have several subjects**, **4 have no headings** (Hindi Guide, Bihar GS, Assam GS, Electrical Engineering Precis), **11 have a source file that is not in the master folder**, and a handful are oversized or have tiny chapters (Arunachal SI, Uttarakhand, Tripura, West Bengal, Rajasthan, Odisha, Hindi Precis).
- Live chapter counts in the app often differ from the DOCX (e.g. GS & GK Guide shows 76, the DOCX has 66; Precis shows 136, the DOCX 127). The database counts are stale; the reparse corrects them.
- Not linked and not needed now: Cluster_079 RRB COMPLETE GK (693 chapters), Cluster_043 RRB GS, Cluster_034 RRB Maths, the duplicate files (Cluster_062, 081, 059, 058 ITI...), Base Book, Financial Awareness etc.
