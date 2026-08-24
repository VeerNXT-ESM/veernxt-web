# Resource content migration — books now, PYQs and images later

## Scope for this pass

**Books only, text/enrichment content as it stands today — no images, no PYQs.** Swap the 41 already-enriched books into production now. When the image-extraction pipeline lands (already planned separately) and PYQs are further along, each is a straightforward *follow-up update* to the same R2-stored chapter JSON — not a rework of anything below. PYQs need their own reader-design decision (see the open question near the bottom) and are explicitly deferred; nothing here is blocked on them.

## Context

`SecureReader.jsx` (`/reader/:id`) currently serves `resources_v2` content as a flat `body_html` string per chapter, from the raw `.docx` conversion — which looks bad. A new pipeline (already mostly built, some of it committed today) parses `.docx` into `{ book, chapters: [{ blocks: [...] }] }`, runs it through Gemini for enrichment (adds keyFacts/pullQuote/examAlert/comparisonTable/statStrip around the original content), and renders it with a proper block-based component library (`BookBlocks.jsx`). The content team is already running this: **41 books done** at `K:\...\CLIENT ASSETS\VeerNXT\CONTENT\FINAL_CONTENT_ENRICHED\Guide\` (807 chapter JSONs), and a separate PYQ-structuring pass is underway at `FINAL_PYPS_STRUCTURED\` (68 files so far, `{ metadata, sections: [{ questions }] }` — a different shape from books). Image injection into the new content is already planned separately and isn't blocking this plan.

**The actual ask**: start uploading and swapping the 41 books we already have now — text/enrichment content as-is, no images yet. Images get layered onto the same R2 objects as a follow-up once that pipeline is ready; PYQs come later, separately, once the reader question below is settled.

---

## What's already there (confirmed by direct inspection)

- `BookBlocks.jsx`/`.css` — full renderer, all block types, no bugs found. This is what the production reader would render with.
- Two parsers (browser `mammothParser.js`, Node `batch_enrich_books.mjs`'s own) and a working batch enrichment CLI with retry/backoff.
- Real content already generated for 41 books (only 5 of which are currently copied into the repo's `public/books/` — the other 36 are sitting in `FINAL_CONTENT_ENRICHED` and haven't been touched by the app yet).

## Loose ends worth resolving before cutover (not blockers to planning, just noted for later)

1. **Two Gemini models/merge strategies in play** — `geminiEnricher.js` (browser, live, `gemini-2.0-flash` — confirmed dead; this session's own script got a 404 on it) regenerates whole chapters; `batch_enrich_books.mjs` (Node, batch, `gemini-3.6-flash`) only splices in new decoration blocks around the untouched original — the safer of the two. Worth standardizing on the batch approach and deciding whether the live browser path (and its exposed `VITE_GEMINI_API_KEY`) is needed at all going forward.
2. **PYQ JSON has a text-encoding bug** — sample question text shows `Ã·`/`â€“` instead of `÷`/`–` (UTF-8-as-Latin1 mojibake). Worth fixing at the source before ingestion.
3. `BookReaderV2.jsx` is committed but has no route (`App.jsx` never got it back after an earlier fix removed it) — orphaned right now, not urgent.
4. Two hardcoded plaintext credentials found in passing (`sum_chapters.js`'s Supabase service-role key, and `scraper-app`'s Postgres password from earlier this session) — unrelated to this pipeline, cheap to rotate whenever convenient.

## Open question — deferred, not blocking the books swap (PYQs only)

**Does PYQ content reuse `BookBlocks`/the same reader, or does it need its own?** The structured PYQ JSON (`sections[].questions[{question_text, options, correct_option, explanation}]`) doesn't map onto `BookBlocks`' chapter/paragraph model directly — it's a question-and-answer shape, not narrative content. Worth checking during the "final analysis" before committing to an approach: either a genuinely separate quiz-paper renderer, or a thin adapter that turns each question into a sequence of blocks (question as heading, options as a list, explanation as a callout) so the same reader can serve both. Both are viable; which one depends on how the PYQ reading experience is supposed to feel (a real quiz UI with instant right/wrong marking? or a flip-through paper with answers revealed?).

---

## Migration mechanics (how the swap would actually happen, once ready)

- **Storage**: upload each book's `chapters/chapter-N.json` as-is today to R2 under a new prefix (e.g. `books/{resource_id}/`), using the same `getS3Client`/`uploadToR2` helpers already used for exam logos and existing resources (`scripts/ingest-drive-content.js`) — not `public/`, not git. When images land later, they're just an updated version of the same chapter-N.json objects at the same key — an overwrite, not a new pipeline.
- **DB linkage**: add a `format` column to `resources_v2` (`'html'` default | `'blocks'`). A migrated row's `chapter-N.json` becomes `{title, order, blocks}` instead of `{title, body_html, images}`; `storage_base_url` points at the new R2 prefix. Same "add a column, dual-path at read time, backfill progressively, old rows stay untouched" pattern already used successfully for `lc_exam_resource_map` earlier this session.
- **Reader**: `SecureReader.jsx` branches on `resource.format` — `'blocks'` renders via `BookBlocks.jsx`'s block switch (currently duplicated between `DevReader.jsx`/`BookReaderV2.jsx`; lift it into one shared component first) instead of `dangerouslySetInnerHTML`. Existing tier-gating (`canAccessResource`) and points-awarding (`RESOURCE_OPENED`) logic carries over unchanged — neither prototype reader has this today, it must be preserved, not rebuilt.
- **Bulk migration script**: `scripts/migrate_resources_to_blocks.mjs` — for each `FINAL_CONTENT_ENRICHED/Guide/*` folder, match its title against the corresponding `resources_v2` row (same title-matching approach already proven in `map_exam_resources_gemini.mjs` earlier this session), upload to R2, flip `format` + `storage_base_url`. Dry-run first, same convention as every script from this session.

**Ready to implement now** for the 41 books: schema change, upload script, `resources_v2` row updates, and `SecureReader.jsx` reader-branch wiring. Images and PYQs follow later as described above, without reworking any of this.
