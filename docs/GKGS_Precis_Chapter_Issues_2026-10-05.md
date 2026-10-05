# GKGS Precis 2026: chapter structure issues in the source DOCX

Source: `Cluster_001_SSC COMPLETE GK.docx`. The parser splits chapters **only where the DOCX uses the Word style "Heading 1"** (127 chapters result). The items below come from the DOCX's own styling, not from the parser. Fixing them in Word (chapter titles = Heading 1, everything inside a chapter = Heading 2 or lower) fixes them in the app.

## A. Chapters hidden inside another chapter (title is not Heading 1)
| Hidden chapter | Sits inside (live chapter #) | Currently styled as |
|---|---|---|
| CHAPTER 18: NATURAL VEGETATION & WILDLIFE OF INDIA | "DETAILED TABLE OF SOILS OF INDIA" (#20), 3rd block | bold paragraph |
| CHAPTER 5: JAINISM AND BUDDHISM | "CHAPTER 4: MAHAJANAPADAS" (#30), block 33 | Heading 6 |
| CHAPTER 5: CHEMICAL REACTIONS AND EQUATIONS | "CHAPTER 4: STRUCTURE OF THE ATOM" (#110), block 44 | bold paragraph |
| CHAPTER 9: COMBUSTION AND FLAME | "CHAPTER 8: COAL AND PETROLEUM" (#113), block 39 | bold paragraph |
| CHAPTER 10: CONSERVATION OF NATURAL RESOURCES | same (#113), block 84 | bold paragraph |
| CHAPTER 11: SOURCES OF ENERGY | same (#113), block 119 | bold paragraph |
| CHAPTER 13: SYNTHETIC FIBRES AND PLASTICS | same (#113), block 157 | bold paragraph |
| CHAPTER 14: ENVIRONMENTAL POLLUTION | same (#113), block 200 | bold paragraph |

Effect: live chapter #113 has 249 blocks (six chapters in one). Chemistry chapters 12 and Chapter 5 (History) are not in the book at all as separate chapters.

## B. Section headings styled as Heading 1 (become their own chapters)
- "LOCAL WINDS (COMPLETE TABLE)" (#15, 2 tables) belongs inside Chapter 13.
- "DETAILED TABLE OF SOILS OF INDIA" (#20) belongs inside Chapter 17 (or is chapter 18's table).
- "Paleolithic / Mesolithic / Neolithic / Chalcolithic Age" (#24-27) belong inside "CHAPTER 1: PREHISTORIC AGE" (#23).
- "1. INTRODUCTION TO ATOMS AND MOLECULES" (#109) sits under an empty Heading 1 "CHAPTER 3 : ATOMS AND MOLECULES"; the chapter title is lost to a section label.
- Empty-title chapters: Economics "CHAPTER 1: INTRODUCTION TO ECONOMICS" and Biology "CHAPTER 1: INTRODUCTION TO BIOLOGY" come through, but check that their text is not one block above the heading.

## C. Titles with no name
- Indian Polity chapters #48-71 are titled only "CHAPTER – 1" ... "CHAPTER – 24". The real name ("CONSTITUTIONAL DEVELOPMENT OF INDIA (1773–1947)" etc.) is the first Heading 2 inside the chapter. Put the name in the Heading 1.

## D. Duplicates / numbering gaps
- "CHAPTER 3: LATITUDE, LONGITUDE & TIME" appears twice (#3, #4: 26 and 78 blocks); second one starts "CORE CONCEPT (READ ONCE)". Probably a repeated Heading 1.
- Geography numbering: 17 → (detailed table) → 19; Chapter 18 is hidden (A).
- History numbering: 4 → 6 (Chapter 5 hidden, A). Chemistry: 4 → 6 (Chapter 5 hidden, A).
- Economics repeats subjects: Ch 13 PUBLIC FINANCE and Ch 21 PUBLIC FINANCE; Ch 14 ECONOMIC PLANNING & FIVE-YEAR PLANS and Ch 20 ECONOMIC PLANNING IN INDIA. Check whether both are wanted.
- Physics Ch 12 "ENVIRONMENT & NATURAL RESOURCES" and Chemistry Ch 14 "ENVIRONMENTAL POLLUTION": confirm placement.

## E. Section labels in the app
Parts are taken from empty Heading 1 dividers: SSC GEOGRAPHY, SSC COMPLETE HISTORY BOOK, INDIAN POLITY, SSC ECONOMICS, SSC PHYSICS, SSC CHEMISTRY, SSC BIOLOGY (plus "CHAPTER 3 : ATOMS AND MOLECULES", see B).

---
## STATUS 2026-10-05 (later): fixed copy made
- Corrected copy: `...\MASTER DOCUMENTS\Precis\GK-GS\GSGK PRECIS 2026.docx` (original `Cluster_001_SSC COMPLETE GK.docx` untouched, checksum verified).
- Made by `scripts/fix_gkgs_precis_chapters.mjs` (style changes only; all other parts of the .docx copied byte-for-byte).
- Fixed: A (8 hidden chapters promoted to Heading 1), B (7 sub-sections demoted), C (24 Polity titles now "CHAPTER – n: NAME"; the duplicate name heading removed, a banner image on "FUNDAMENTAL RIGHTS" kept), D (second "CHAPTER 3: LATITUDE…" removed), plus 81 numbered section lines in the Chemistry chapters 5/9/10/11/13/14 set to Heading 2.
- Result: **128 chapters** (was 127), text/order identical to the DOCX, 214/214 images placed, no chapter over ~110 blocks.
- Still open for the content team: Chemistry has no Chapter 12 (11 -> 13); Economics repeats Public Finance (13, 21) and Economic Planning (14, 20); confirm Physics Ch 12 / Chemistry Ch 14 environment chapters are meant to be there; Polity chapters 4 and 7 had an empty Heading 2 line after the name (harmless).
- Review copy on R2: `Preview/gsgk-precis-2026/`; reader: `/dev-reader?book=gsgk-precis-2026` (after deploy).
