"""
scripts/ocr_reconstruct_pyps.py

Structures the ~424 scanned PYP PDFs that reconstruct_all_pyps_flex.py
couldn't handle (its PyMuPDF-only text extraction bails before ever
calling Gemini when a page has no embedded text layer). This script
OCRs those PDFs with Tesseract (same setup as extract_pyps_manifest.py)
then segments each page's OCR text into questions via the Groq API
(fast + free-tier, not Gemini -- per user's cost objection). The model
is only asked to SEGMENT/clean up text it's given, not to answer
questions. Two prior approaches were tried and rejected first: a naive
regex grouping (every 4th "(X)" marker = one question) failed badly on
real OCR noise (missed/spurious markers cause cascading misalignment),
and a local Ollama model (qwen2.5-coder:7b) timed out at 5+ minutes per
single page with zero successful responses -- not viable on this
hardware. Correct answers are not extracted (none survive OCR anyway --
confirmed on real samples, and the user confirmed these papers are
reference-only, no answer key needed).

Output goes to the same FINAL_PYPS_STRUCTURED directory, same JSON
shape and filename convention as reconstruct_all_pyps_flex.py, so the
existing ingest_structured_pyps.mjs picks these up unchanged.
"""

import os
import re
import sys
import json
import time
import fitz
import pytesseract
import requests
from PIL import Image
import io
from concurrent.futures import ProcessPoolExecutor, as_completed

INPUT_DIR = r"K:\H DRIVE\Quantum Climb\CLIENT ASSETS\VeerNXT\CONTENT\MASTER PYP_superseded_20260822"
OUTPUT_DIR = r"K:\H DRIVE\Quantum Climb\CLIENT ASSETS\VeerNXT\CONTENT\FINAL_PYPS_STRUCTURED"
MANIFEST_PATH = r"K:\H DRIVE\Quantum Climb\CLIENT ASSETS\VeerNXT\CONTENT\pyp_metadata_manifest.json"
TESSERACT_CMD = r"K:\I DRIVE\Tesseract-OCR\tesseract.exe"
ENV_PATH = r"K:\H DRIVE\Quantum Climb\APPS\VeerNXT\VeerNXT Main Repo\VeerNXT APP\veernxt-web\.env"

GROQ_API_KEY = None
if os.path.exists(ENV_PATH):
    with open(ENV_PATH, "r", encoding="utf-8") as f:
        for line in f:
            if line.startswith("GROQ_API_KEY="):
                GROQ_API_KEY = line.split("=", 1)[1].strip()

if not GROQ_API_KEY:
    print("Error: GROQ_API_KEY not found in .env")
    sys.exit(1)

GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"
GROQ_MODEL = "openai/gpt-oss-120b"
LABELS = ['A', 'B', 'C', 'D']

SEGMENT_PROMPT = """The following text was extracted via OCR from one page of an Indian competitive exam question paper (may mix Hindi and English, and contains OCR noise/typos).

Find every complete multiple-choice question on this page that has exactly 4 answer options. For each one, output the question text and its 4 options, cleaned up (fix obvious OCR typos where certain) but do NOT invent content that isn't implied by the text, do NOT answer the question, do NOT explain anything.

Skip anything that is not a clearly complete question with exactly 4 options (partial questions cut off at the top/bottom of the page, headers, page numbers, section titles, answer keys).

Return ONLY a JSON object: {"questions": [{"question_text": "...", "options": ["...", "...", "...", "..."]}]}. If no complete questions are found, return {"questions": []}.

OCR TEXT:
---
{page_text}
---
"""


def clean_segment(segment):
    seg = re.sub(r'^\s*\d+[\.\s\-]*', '', segment)
    seg = re.sub(r'[^\w\s\-\(\)]', '', seg)
    seg = re.sub(r'[\s\-\_]+', '_', seg)
    return seg.strip('_')


def derive_rebranded_name(rel_path):
    parts = rel_path.split(os.sep)
    cleaned_parts = []
    for idx, p in enumerate(parts):
        if p.upper() in ["CENTRAL EXAMS", "STATE EXAMS", "UT EXAMS"]:
            continue
        if idx == len(parts) - 1:
            p = os.path.splitext(p)[0]
        cleaned = clean_segment(p)
        if cleaned:
            cleaned_parts.append(cleaned)
    combined = "_".join(cleaned_parts)
    words = combined.split('_')
    dedup_words = []
    for w in words:
        if not dedup_words or dedup_words[-1].lower() != w.lower():
            dedup_words.append(w)
    final_name = "_".join(dedup_words) + ".json"
    return final_name


def ocr_pdf_pages(pdf_path):
    """Returns a list of OCR'd text, one entry per page."""
    doc = fitz.open(pdf_path)
    pages_text = []
    for page in doc:
        pix = page.get_pixmap(dpi=200)
        img = Image.open(io.BytesIO(pix.tobytes("png")))
        pages_text.append(pytesseract.image_to_string(img, lang="eng+hin"))
    doc.close()
    return pages_text


# Proactive self-pacing, not reactive backoff. The free tier's 8000
# tokens/min budget looked forgiving from single test calls, but a real
# burst showed Retry-After values of 130-260s even for a modest overrun
# -- with 4 workers retrying independently and honoring that fully
# (old code), the first full run stalled for ~8 hours making zero
# progress. Spacing requests out up front (per worker) keeps combined
# throughput under the ceiling so 429s should be rare; the capped retry
# below is just a safety net, not the primary strategy.
PACE_SECONDS = 36
MAX_BACKOFF_SECONDS = 30


def segment_page_with_groq(page_text, max_retries=2):
    """Ask Groq to split one page's OCR text into complete 4-option
    questions. Segmentation/cleanup only -- explicitly told not to
    answer or invent content. Always paces itself (see PACE_SECONDS)
    before returning, whether it succeeds or not. Returns [] on a
    genuinely bad response (empty page, malformed JSON) or after
    exhausting retries, so one bad page doesn't kill the whole
    document."""
    if len(page_text.strip()) < 30:
        return []
    try:
        for attempt in range(1, max_retries + 1):
            resp = requests.post(GROQ_URL, headers={
                "Authorization": f"Bearer {GROQ_API_KEY}",
                "Content-Type": "application/json"
            }, json={
                "model": GROQ_MODEL,
                "messages": [{"role": "user", "content": SEGMENT_PROMPT.replace("{page_text}", page_text)}],
                "response_format": {"type": "json_object"},
                "temperature": 0.1,
                "reasoning_effort": "low"
            }, timeout=90)

            if resp.status_code == 429 or resp.status_code >= 500:
                if attempt == max_retries:
                    return []
                wait = min(float(resp.headers.get("Retry-After", 15)), MAX_BACKOFF_SECONDS)
                time.sleep(wait)
                continue

            resp.raise_for_status()
            raw = resp.json()["choices"][0]["message"]["content"]
            parsed = json.loads(raw)
            questions = parsed.get("questions", [])
            # Keep only well-formed entries: real text + exactly 4 options
            clean = []
            for q in questions:
                text = (q.get("question_text") or "").strip()
                opts = q.get("options") or []
                if len(text) >= 8 and len(opts) == 4 and all(isinstance(o, str) and o.strip() for o in opts):
                    clean.append({"question_text": text, "options": [o.strip() for o in opts]})
            return clean
        return []
    except Exception:
        return []
    finally:
        time.sleep(PACE_SECONDS)


def parse_questions(pages_text):
    questions = []
    qnum = 1
    for page_text in pages_text:
        for q in segment_page_with_groq(page_text):
            questions.append({
                "question_number": qnum,
                "question_text": q["question_text"],
                "options": [f"{LABELS[j]}) {q['options'][j]}" for j in range(4)],
                "correct_option": None,
                "explanation": ""
            })
            qnum += 1
    return questions


def process_single_pdf(rel_path):
    pdf_path = os.path.join(INPUT_DIR, rel_path)
    new_name = derive_rebranded_name(rel_path)
    output_path = os.path.join(OUTPUT_DIR, new_name)

    # Resumable skip -- but only if the existing output already has
    # real questions (empty stubs from the earlier pipeline must be
    # reprocessed, not treated as "done").
    if os.path.exists(output_path):
        try:
            with open(output_path, "r", encoding="utf-8") as f:
                existing = json.load(f)
            existing_q_count = sum(len(s.get("questions", [])) for s in existing.get("sections", []))
            if existing_q_count > 0:
                return {"status": "skipped", "file": rel_path, "reason": "already has questions"}
        except Exception:
            pass  # fall through and reprocess if the existing file is unreadable

    try:
        if not os.path.exists(pdf_path):
            return {"status": "error", "file": rel_path, "error": "source PDF not found"}

        pages_text = ocr_pdf_pages(pdf_path)
        questions = parse_questions(pages_text)

        if not questions:
            return {"status": "error", "file": rel_path, "error": "no questions parsed from OCR text"}

        title = os.path.splitext(os.path.basename(rel_path))[0]
        structured = {
            "metadata": {"title": title},
            "sections": [{"section_name": "General", "questions": questions}]
        }

        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(structured, f, indent=2, ensure_ascii=False)

        return {"status": "success", "file": rel_path, "out": new_name, "questions": len(questions)}
    except Exception as e:
        return {"status": "error", "file": rel_path, "error": str(e)}


def _init_worker():
    pytesseract.pytesseract.tesseract_cmd = TESSERACT_CMD
    try:
        fitz.TOOLS.mupdf_display_errors(False)
    except Exception:
        pass


def main():
    limit = None
    if len(sys.argv) > 1 and sys.argv[1].startswith("--limit="):
        limit = int(sys.argv[1].split("=", 1)[1])

    print("=== VEERNXT PYP OCR RECONSTRUCTION (GROQ SEGMENTATION) ===")
    with open(MANIFEST_PATH, "r", encoding="utf-8") as f:
        manifest = json.load(f)

    targets = [m["file"] for m in manifest if m.get("is_scanned") and m.get("status") == "success"]
    print(f"Found {len(targets)} scanned PDFs in manifest.")
    if limit:
        targets = targets[:limit]
        print(f"Limiting to first {limit} for this run.")

    success = 0
    errors = 0
    skipped = 0

    # Groq is a cloud API that handles real concurrency, unlike the local
    # Ollama instance this replaced -- kept moderate to stay comfortably
    # under free-tier rate limits rather than maximize throughput.
    total = len(targets)
    done = 0
    start_time = time.time()

    # 2 workers x PACE_SECONDS=36s pacing each ~= 1 Groq request per 18s
    # system-wide, comfortably under the free tier's 8000 tokens/min
    # ceiling (see segment_page_with_groq) while still letting one
    # worker's OCR overlap the other's Groq call. Do not raise this
    # without also reconsidering PACE_SECONDS -- more workers without
    # slower per-worker pacing just recreates the multi-hour stall this
    # replaced (a real burst showed Retry-After values of 130-260s).
    with ProcessPoolExecutor(max_workers=2, initializer=_init_worker) as executor:
        futures = {executor.submit(process_single_pdf, rel): rel for rel in targets}
        for fut in as_completed(futures):
            result = fut.result()
            done += 1
            if result["status"] == "success":
                success += 1
                print(f"[OK] {result['file']} -> {result['questions']} questions")
            elif result["status"] == "skipped":
                skipped += 1
            else:
                errors += 1
                print(f"[FAIL] {result['file']}: {result['error']}")

            if done % 10 == 0 or done == total:
                elapsed_min = (time.time() - start_time) / 60
                print(f"--- PROGRESS: {done}/{total} ({elapsed_min:.1f} min elapsed, "
                      f"success={success} errors={errors} skipped={skipped}) ---", flush=True)

    print("\n=== SUMMARY ===")
    print(f"Success: {success}  Errors: {errors}  Skipped: {skipped}")


if __name__ == "__main__":
    main()
