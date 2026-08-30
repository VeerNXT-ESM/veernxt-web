"""
scripts/ocr_reconstruct_pyps_vertex.py

Structures the ~424 scanned PYP PDFs that reconstruct_all_pyps_flex.py
couldn't handle (its PyMuPDF-only text extraction bails before ever
calling Gemini when a page has no embedded text layer). This script
OCRs those PDFs with Tesseract (same setup as extract_pyps_manifest.py)
then sends the full document text to Gemini via Vertex AI -- one call
per document, same schema/prompt as reconstruct_all_pyps_flex.py (full
original schema with correct_option/explanation, matching the 530
papers already uploaded), using Application Default Credentials (the
user authenticated via `gcloud auth application-default login` against
the VeerNXT GCP project).

Two prior approaches were tried and rejected first (see git history /
conversation): per-page rule-based regex parsing failed on real OCR
noise, and per-page segmentation via Groq's free tier hit an 8000
tokens/min ceiling that made a reliable multi-day run impractical.
Going back to one-call-per-document (like the original pipeline) with
a real Gemini model via a paid GCP project sidesteps both problems.

The actual API call shells out to `curl` rather than using Python's
`requests` library -- an unexplained multi-minute hang was observed
with `requests.post` against this exact endpoint, while curl reached
it reliably in ~2s in direct testing. Not worth debugging further given
this needs to run unattended for hours.

Output goes to the same FINAL_PYPS_STRUCTURED directory, same JSON
shape and filename convention as reconstruct_all_pyps_flex.py, so the
existing ingest_structured_pyps.mjs picks these up unchanged.
"""

import os
import re
import sys
import json
import time
import subprocess
import fitz
import pytesseract
import google.auth
import google.auth.transport.requests
from PIL import Image
import io
from concurrent.futures import ProcessPoolExecutor, as_completed

INPUT_DIR = r"K:\H DRIVE\Quantum Climb\CLIENT ASSETS\VeerNXT\CONTENT\MASTER PYP_superseded_20260822"
OUTPUT_DIR = r"K:\H DRIVE\Quantum Climb\CLIENT ASSETS\VeerNXT\CONTENT\FINAL_PYPS_STRUCTURED"
MANIFEST_PATH = r"K:\H DRIVE\Quantum Climb\CLIENT ASSETS\VeerNXT\CONTENT\pyp_metadata_manifest.json"
TESSERACT_CMD = r"K:\I DRIVE\Tesseract-OCR\tesseract.exe"

GCP_PROJECT = "gen-lang-client-0835887886"
GCP_LOCATION = "us-central1"
GCP_MODEL = "gemini-2.5-flash"
VERTEX_URL = (
    f"https://{GCP_LOCATION}-aiplatform.googleapis.com/v1/projects/{GCP_PROJECT}"
    f"/locations/{GCP_LOCATION}/publishers/google/models/{GCP_MODEL}:generateContent"
)

pytesseract.pytesseract.tesseract_cmd = TESSERACT_CMD

PROMPT_TEMPLATE = """You are an expert exam content compiler. Your task is to extract all questions, multiple-choice options, correct answers, and explanations from the provided exam paper text and structure them into a valid JSON document.

This text was extracted via OCR from a scanned PDF and may contain typos/noise -- clean up obvious OCR errors where you can, but do NOT invent content that isn't implied by the text.

Do NOT summarize the questions. Maintain the exact text.
If the document contains answers at the end, match them to the correct questions.
If no explanation is in the source text, write a brief, highly professional explanation of why the correct option is right.

Return ONLY a JSON object conforming to the following structure:
{{
  "metadata": {{
    "title": "Clean Title of the Exam Paper"
  }},
  "sections": [
    {{
      "section_name": "Subject/Section Name (e.g., General Intelligence & Reasoning)",
      "questions": [
        {{
          "question_number": 1,
          "question_text": "Text of the question...",
          "options": [
            "A) Option A text",
            "B) Option B text",
            "C) Option C text",
            "D) Option D text"
          ],
          "correct_option": "B",
          "explanation": "Clear, step-by-step logical explanation..."
        }}
      ]
    }}
  ]
}}

If the text has no readable exam questions at all, return {{"metadata": {{"title": "UNREADABLE"}}, "sections": []}}.

Here is the raw OCR text of the exam paper:
---
{raw_text}
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


def ocr_pdf_text(pdf_path):
    doc = fitz.open(pdf_path)
    pages_text = []
    for page in doc:
        pix = page.get_pixmap(dpi=200)
        img = Image.open(io.BytesIO(pix.tobytes("png")))
        pages_text.append(pytesseract.image_to_string(img, lang="eng+hin"))
    doc.close()
    return "\n\n=== NEW PAGE ===\n\n".join(pages_text)


def get_fresh_token():
    creds, _ = google.auth.default(scopes=["https://www.googleapis.com/auth/cloud-platform"])
    creds.refresh(google.auth.transport.requests.Request())
    return creds.token


def call_vertex_via_curl(prompt, token, timeout=480):
    """Shell out to curl rather than Python's requests -- see module
    docstring for why. Returns the parsed response dict or raises."""
    payload = json.dumps({
        "contents": [{"role": "user", "parts": [{"text": prompt}]}],
        "generationConfig": {
            "temperature": 0.05,
            "responseMimeType": "application/json",
            "maxOutputTokens": 65536
        }
    })
    result = subprocess.run(
        ["curl", "-s", "--max-time", str(timeout), "-X", "POST", VERTEX_URL,
         "-H", f"Authorization: Bearer {token}",
         "-H", "Content-Type: application/json",
         "-d", "@-"],
        input=payload, capture_output=True, text=True, encoding="utf-8", timeout=timeout + 10
    )
    if result.returncode != 0:
        raise RuntimeError(f"curl failed (exit {result.returncode}): {result.stderr[:300]}")
    return json.loads(result.stdout)


def structure_with_gemini(raw_text, token):
    prompt = PROMPT_TEMPLATE.replace("{raw_text}", raw_text[:100000])
    body = call_vertex_via_curl(prompt, token)
    if "error" in body:
        raise RuntimeError(f"Vertex error: {body['error']}")
    text_out = body["candidates"][0]["content"]["parts"][0]["text"].strip()
    if text_out.startswith("```"):
        text_out = "\n".join(text_out.split("\n")[1:])
        if text_out.endswith("```"):
            text_out = text_out[:-3]
        text_out = text_out.strip()
    return json.loads(text_out)


def process_single_pdf(rel_path):
    pdf_path = os.path.join(INPUT_DIR, rel_path)
    new_name = derive_rebranded_name(rel_path)
    output_path = os.path.join(OUTPUT_DIR, new_name)

    # Resumable skip -- only if existing output already has real questions
    if os.path.exists(output_path):
        try:
            with open(output_path, "r", encoding="utf-8") as f:
                existing = json.load(f)
            existing_q_count = sum(len(s.get("questions", [])) for s in existing.get("sections", []))
            if existing_q_count > 0:
                return {"status": "skipped", "file": rel_path}
        except Exception:
            pass

    try:
        if not os.path.exists(pdf_path):
            return {"status": "error", "file": rel_path, "error": "source PDF not found"}

        raw_text = ocr_pdf_text(pdf_path)
        if len(raw_text.strip()) < 50:
            return {"status": "error", "file": rel_path, "error": "OCR produced no usable text"}

        token = get_fresh_token()
        structured = structure_with_gemini(raw_text, token)

        if structured.get("metadata", {}).get("title") == "UNREADABLE":
            return {"status": "error", "file": rel_path, "error": "model reported unreadable"}

        total_qs = sum(len(s.get("questions", [])) for s in structured.get("sections", []))
        if total_qs == 0:
            return {"status": "error", "file": rel_path, "error": "0 questions in model response"}

        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(structured, f, indent=2, ensure_ascii=False)

        return {"status": "success", "file": rel_path, "out": new_name, "questions": total_qs}
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

    print("=== VEERNXT PYP OCR RECONSTRUCTION (VERTEX AI GEMINI) ===")
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
    total = len(targets)
    done = 0
    start_time = time.time()

    # Vertex AI on a real GCP project has much higher throughput than
    # Groq's free tier -- no special pacing needed, just a reasonable
    # worker count.
    with ProcessPoolExecutor(max_workers=4, initializer=_init_worker) as executor:
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
