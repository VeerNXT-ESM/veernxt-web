# GS & GK books: DOCX vs live parsed content (2026-10-05)

Method: the DOCX is read straight from its XML (paragraph styles, Word list numbering,
every image reference in order, tables). That is compared with the live chapter JSON on R2
(`structured_resources/blocks/...`). Read-only; nothing in the DB or R2 was changed.

## 0. The live book is not built from the DOCX the DB names

| | DB says | Live R2 metadata says | Live chapter files |
|---|---|---|---|
| Guide "GS & GK" | Cluster_006, 76 ch | Cluster_035 (DEPRECATED folder), 66 ch | 66 |
| Precis "GS & GK" | Cluster_001, 136 ch | Cluster_014 (DEPRECATED folder), 124 ch | 124 |

`resources.source_file` / `chapter_count` were relabelled but the content was never re-ingested.
Cluster_006 is ~identical to 035 (same 41 images, 90 H1). Cluster_001 is ~identical to 014 (same 134 chapters, 578,933 vs 578,888 chars).
So 76 and 136 do not exist as chapter counts: 66 / 124 are the real ones (the extra H1s are section dividers and blanks).

## 1. Guide: Cluster_006 (66 chapters)

| Check | DOCX | Live |
|---|---|---|
| Text | 3,565 paragraphs | all present except TOC (not wanted), "SSC" stripped from ~18 labels, 1 Mughal paragraph altered |
| Images | 41 (all floating `wp:anchor`) | 22. 19 dropped. The 22 that exist are positioned correctly |
| Bullets | 1,513 typed "•" characters (no Word list) | 0 list blocks. 1,385 paragraphs carry a literal "• ", 130 more became **H4 headings** |
| Heading levels | H1 90 / H2 586 / H3 70 | H2 575 / H3 69 / H4 147 (130 of those are bullets) |
| Bold / colour / shading | 801 bold runs, 1,697 colour runs, 307 shaded | 0 of 1,606 paragraphs keep bold or italic. No colour or shading |
| Tables | 163 | 163 present; every first row forced to header |
| Not in the DOCX | | 295 AI-added blocks (keyFacts 66, statStrip 66, examAlert 66, pullQuote 37, comparisonTable 60). statStrip has bugs, e.g. "Target Exam: ' Exams'" |

Dropped Guide images are in: Ch 1 (2), 3, 11, 14 (2), 15 (2), 17, 21, 22, 23, 26, 29, 30, 32 (2), 33, 34.

## 2. Precis: Cluster_001 (124 live chapters vs 134 in DOCX)

| Check | DOCX | Live |
|---|---|---|
| Chapters | 134 non-empty H1 | 124. 10 headings have no match (4 are real: Economics Ch 1 (43 paras), Atoms & Molecules (32 paras, 5 imgs), Biology Ch 1 (21 paras, 2 imgs)) |
| Images | 216 (109 anchored, 108 inline) | 122. ~111 not matched by position |
| Real Word lists | 2,881 list paragraphs: levels 0/1/2/3 = 805 / 1,879 / 174 / 23; 2,507 bullet, 370 decimal, 4 letter | 869 list blocks, 3,565 items, nesting only as raw `<ul>` inside items (702) |
| Numbered lists | 105 separate numbered lists | 148 numberedList blocks (restart/continuation not preserved) |
| Leftover | | 557 paragraphs contain `<br>`, many hold "• " bullets inside one block. 158 bullets/numbers became H4 headings |
| Formatting | | only 65 of 2,997 paragraphs keep bold or italic |
| Not in the DOCX | | 553 AI-added blocks; 102 prose blocks (memorising tips, intros) not found in the DOCX |

## 3. Root causes in the parser (scripts/lib/docxParser.mjs)

1. **Images**: mammoth `convertImage` only runs when `onImage` is passed, and only `<p>` with no text emits image blocks.
   An image in a paragraph that also has text, or in a table cell, is dropped. Floating (`wp:anchor`) pictures are the norm in the Guide.
2. **Typed bullets** ("• text") are never converted to `list` blocks; only `<ul>/<ol>` from real Word lists are.
3. **`classifyParagraph`**: any paragraph of 5 words or fewer with no trailing punctuation becomes an H4 heading, which swallows short bullets and numbered lines.
4. **`serializeInner`** keeps only the tags mammoth emits (`strong`, `em`...). Font colour, shading, highlight, size and alignment are discarded by mammoth.
5. **Nested lists** are flattened by `getElementsByTagName('li')`, so a sub-list is read twice or collapsed.
6. **Table header** rule is "first row = header" regardless of the DOCX.
7. **Gemini enrichment** inserted blocks that are not in the DOCX. That is not WYSIWYG.

## 4. What a WYSIWYG parse needs

- Read `word/document.xml` directly (ordered body walk), not mammoth HTML.
- Emit a block per paragraph in order, with list level and format (bullet/decimal/letter, numId for restarts) from numbering.xml.
- Convert typed-marker paragraphs ("•", "1.", "(a)") to real list items.
- Emit image blocks wherever a drawing sits: inline, anchored, and in table cells. Keep the anchor paragraph's order.
- Keep run properties: bold, italic, underline, colour, highlight, shading.
- No AI-added blocks; no heading inference from word count.
- Re-ingest from the final DOCX into a new storage folder, then repoint `resources`.
