# PYQ OCR Structuring — Vertex AI Plan

## Status: ready to execute once GCP billing/credits are confirmed live on the project

## Context

955 PYQ papers were run through `reconstruct_all_pyps_flex.py` (PyMuPDF text extraction + Gemini via the Developer API). 530 had a real text layer and structured successfully — already uploaded to `pyq_papers`/`pyq_questions` (see `scripts/ingest_structured_pyps.mjs`). The other **424 are scanned/image-only PDFs** — `reconstruct_all_pyps_flex.py` bails before ever calling Gemini when extracted text is under 50 characters, so these need OCR first.

Three structuring approaches were tried for the OCR'd text, in this order, each rejected for a specific reason:

1. **Rule-based regex parsing** (no LLM) — anchoring on `(A)/(B)/(C)/(D)` markers to group questions positionally. Failed badly on real OCR noise: missed/spurious markers cause cascading misalignment (question stems bleed into options, options swallow multiple subsequent questions). Verified on real samples, not usable.
2. **Local Ollama** (`qwen2.5-coder:7b`) — free, but a single page took 5+ minutes with zero successful responses in testing. Not viable on this hardware.
3. **Groq** (`openai/gpt-oss-120b`, per-page segmentation, no answers — user's "reference only" call at the time) — this genuinely worked once request pacing was fixed (free tier's 8000 tokens/min ceiling caused an 8-hour silent stall on the first attempt; proactive self-pacing fixed the stall but capped retries reduced yield under free-tier pressure). **Blocked now**: Groq's account won't accept a recharge, so this path is closed.

**Current decision: Vertex AI Gemini** (`gemini-2.5-flash`, project `gen-lang-client-0835887886`, region `us-central1`), authenticated via Application Default Credentials (`gcloud auth application-default login` — already completed against the correct VeerNXT account, verified working). This goes back to the *original* one-call-per-document approach (matching the 530 already-uploaded papers' schema, including **real correct answers and explanations** — better than the reference-only Groq approach, and validated as clearly worth it on a real sample).

## What's already built and validated

`scripts/ocr_reconstruct_pyps_vertex.py`:
- OCRs each scanned PDF page-by-page with Tesseract (`pytesseract`, `lang="eng+hin"`, reusing the exact setup from `scripts/extract_pyps_manifest.py`), concatenates into one full-document text.
- Sends the full text to Vertex AI Gemini in **one call per document**, using the same prompt/schema as `reconstruct_all_pyps_flex.py` (`metadata.title`, `sections[].questions[]` with `question_text`, `options`, `correct_option`, `explanation`).
- Calls Vertex via `curl` (subprocess), **not** Python's `requests` — `requests.post` hung unexplained for 15+ minutes against this exact endpoint in testing, while `curl` reached it reliably in ~2s. Not worth debugging further; curl works.
- Writes output to the same `FINAL_PYPS_STRUCTURED` directory, same filename convention (`derive_rebranded_name`), so the existing `scripts/ingest_structured_pyps.mjs` picks it up unchanged.
- Resumable: skips any file that already has real (non-empty) structured output.

**Validated on a real 4-page scanned PDF** (Bihar Police Constable 2017): 100 real questions extracted, correct answers and genuine explanations, clean Hindi text with OCR typos corrected by the model, `finishReason: STOP` (clean completion). This quality bar is excellent — better than anything the regex/Ollama/Groq paths produced.

## Known unresolved issue — must fix before running at scale

**Larger documents (~26 pages) fail unpredictably**, in two different ways observed on the same file across separate runs:
1. In the full batch pipeline: the JSON response gets truncated very early (~8,800 characters in) — too early to be a legitimate output-token-limit cutoff (the small file's full clean output was ~49,500 characters).
2. In an isolated diagnostic call (same file, same code path, outside the batch runner): the call just **hung indefinitely** — 15+ minutes, no timeout ever fired, no response.

Root cause **not fully diagnosed** — the inconsistency (sometimes fast-truncates, sometimes hangs forever) on the identical file points to something size/duration-related rather than a single clean bug: possibly `curl` via subprocess handling a very large piped stdin payload unreliably on this machine, possibly the same network flakiness seen elsewhere in this environment (an earlier SSL cert trust issue, an earlier unexplained `requests` hang against a different Google host). Raising `maxOutputTokens` to 65536 and the curl timeout to 480s did **not** fix it.

### Planned fix: chunk large documents

Split a document's OCR'd page-text into smaller groups (e.g., 5-8 pages per Gemini call, mirroring how Groq's per-page approach never hit this problem) instead of sending the whole document in one call. Merge each chunk's `sections[].questions[]` back into one structured JSON per source PDF, renumbering `question_number` sequentially across chunks, before writing the final output file. This keeps the output schema and file convention identical — only the *request* granularity changes. Small documents (that already work fine in one call) can stay as single calls to minimize API calls; only documents whose OCR'd text exceeds some threshold (e.g., ~15,000 characters, matching roughly what worked cleanly) need chunking.

## Execution order (next session)

1. Confirm GCP billing/credits are live on project `gen-lang-client-0835887886` (this is what's currently pending).
2. Re-verify ADC still authenticates (`gcloud auth application-default login` sessions can expire): quick test call already scripted in this session's history, or just re-run `ocr_reconstruct_pyps_vertex.py --limit=1`.
3. Implement chunking in `scripts/ocr_reconstruct_pyps_vertex.py` for documents whose OCR'd text exceeds the size threshold; keep single-call behavior for smaller ones.
4. Re-test on the known problem files (the two 26-page UP Police SI documents) to confirm chunking resolves the truncation/hang, and re-inspect output quality by hand.
5. Run the full batch (`python scripts/ocr_reconstruct_pyps_vertex.py`, no `--limit`) against all 424 scanned PDFs. Run in the background with periodic progress checks (script already logs progress every 10 files with elapsed time) — expect this to take a while given per-document Gemini calls, but nowhere near the multi-day Groq free-tier estimate since there's no aggressive per-minute token ceiling on a paid project.
6. Once complete, re-run `node scripts/ingest_structured_pyps.mjs --execute` (idempotent upsert by stable filename-derived UUID — safe to re-run over the already-good papers, will only add the newly-structured ones) to upload into `pyq_papers`/`pyq_questions`.
7. Verify row counts in Supabase match expectations, spot-check a few newly-added papers via `/pyq-reader/:id` in the browser.
8. Separately (not blocking): decide whether to clean up the 8 papers found earlier with fabricated "Question Id :" placeholder content (source PDFs that were themselves answer-key-only documents with no real question text) — flagged previously, not yet acted on.

## Files involved

- `scripts/ocr_reconstruct_pyps_vertex.py` — the OCR + Vertex AI structuring script (built, needs the chunking fix above).
- `scripts/ingest_structured_pyps.mjs` — existing, unchanged, uploads `FINAL_PYPS_STRUCTURED/*.json` to Supabase.
- `pyp_metadata_manifest.json` — source list of which PDFs are scanned (`is_scanned: true`).
- `MASTER PYP_superseded_20260822/` — source PDF directory.
- `FINAL_PYPS_STRUCTURED/` — output directory (shared with the original Gemini Developer API pipeline).
