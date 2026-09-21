"""
scripts/ocr_reconstruct_pyps_vertex.py

Structures the ~414 scanned PYP PDFs that reconstruct_all_pyps_flex.py
couldn't handle (its PyMuPDF-only text extraction bails before ever
calling Gemini when a page has no embedded text layer). This script
OCRs those PDFs with Tesseract (same setup as extract_pyps_manifest.py)
then sends the page texts in chunks to Gemini via Developer API --
using the GEMINI_API_KEY from .env and the flex tier to minimize cost.

No question solving: correct_option is set to null, explanation is set to "".
Subject mapping: categorizes questions under correct subject section_names.
"""

import os
import re
import sys
import json
import time
import subprocess
import fitz
import pytesseract
from PIL import Image
import io
from concurrent.futures import ProcessPoolExecutor, as_completed

INPUT_DIR = r"K:\H DRIVE\Quantum Climb\CLIENT ASSETS\VeerNXT\CONTENT\MASTER_PYPS"
OUTPUT_DIR = r"K:\H DRIVE\Quantum Climb\CLIENT ASSETS\VeerNXT\CONTENT\FINAL_PYPS_STRUCTURED"
MANIFEST_PATH = r"K:\H DRIVE\Quantum Climb\CLIENT ASSETS\VeerNXT\CONTENT\pyp_metadata_manifest.json"
TESSERACT_CMD = r"K:\I DRIVE\Tesseract-OCR\tesseract.exe"
ENV_PATH = r"K:\H DRIVE\Quantum Climb\APPS\VeerNXT\VeerNXT Main Repo\VeerNXT APP\veernxt-web\.env"

# Load Gemini API Key
api_key = None
if os.path.exists(ENV_PATH):
    with open(ENV_PATH, "r", encoding="utf-8") as f:
        for line in f:
            if line.startswith("GEMINI_API_KEY="):
                api_key = line.split("=", 1)[1].strip()

if not api_key:
    print("Error: GEMINI_API_KEY not found in .env")
    sys.exit(1)

GEMINI_MODEL = "gemini-3.6-flash"
GEMINI_URL = f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent?key={api_key}"

pytesseract.pytesseract.tesseract_cmd = TESSERACT_CMD

PROMPT_TEMPLATE = """You are an expert exam content compiler. Your task is to extract all questions and multiple-choice options from the provided exam paper text and structure them into a valid JSON document.

Do NOT solve or answer the questions, and do NOT write explanations. For every question, set "correct_option" to null and "explanation" to "" in the JSON response.

Do NOT summarize the questions. Maintain the exact text.
For each group of questions, identify the subject/section of the questions and group them under the correct "section_name" (e.g., General Intelligence & Reasoning, Quantitative Aptitude, General Awareness, English Language, Hindi Language, Law & Constitution, etc.). If the exam paper only has a single subject, group all questions under that subject's name.

Return ONLY a JSON object conforming to the following structure:
{{
  "metadata": {{
    "title": "Clean Title of the Exam Paper"
  }},
  "sections": [
    {{
      "section_name": "Subject/Section Name",
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
          "correct_option": null,
          "explanation": ""
        }}
      ]
    }}
  ]
}}

If the text has no readable exam questions at all, return {{"metadata": {{"title": "UNREADABLE"}}, "sections": []}}.

Here is the raw OCR text of the exam paper chunk:
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


def ocr_pdf_pages(pdf_path):
    doc = fitz.open(pdf_path)
    pages_text = []
    for page in doc:
        pix = page.get_pixmap(dpi=200)
        img = Image.open(io.BytesIO(pix.tobytes("png")))
        pages_text.append(pytesseract.image_to_string(img, lang="eng+hin"))
    doc.close()
    return pages_text


def call_gemini_via_curl(prompt, timeout=120):
    payload = json.dumps({
        "contents": [{"parts": [{"text": prompt}]}],
        "serviceTier": "flex",
        "generationConfig": {
            "responseMimeType": "application/json"
        }
    })
    result = subprocess.run(
        ["curl.exe", "-s", "--max-time", str(timeout), "-X", "POST", GEMINI_URL,
         "-H", "Content-Type: application/json",
         "-d", "@-"],
        input=payload, capture_output=True, text=True, encoding="utf-8", timeout=timeout + 10
    )
    if result.returncode != 0:
        raise RuntimeError(f"curl failed (exit {result.returncode}): {result.stderr[:300]}")
    return json.loads(result.stdout)


def structure_with_gemini(raw_text):
    prompt = PROMPT_TEMPLATE.replace("{raw_text}", raw_text[:100000])
    
    max_retries = 3
    for attempt in range(1, max_retries + 1):
        try:
            body = call_gemini_via_curl(prompt)
            if "error" in body:
                raise RuntimeError(f"Gemini API error: {body['error'].get('message')}")
            
            text_out = body["candidates"][0]["content"]["parts"][0]["text"].strip()
            if text_out.startswith("```"):
                text_out = "\n".join(text_out.split("\n")[1:])
                if text_out.endswith("```"):
                    text_out = text_out[:-3]
                text_out = text_out.strip()
            return json.loads(text_out)
        except Exception as e:
            if attempt == max_retries:
                raise e
            print(f"      [Retrying] API attempt {attempt} failed: {e}. Sleeping 10s...")
            time.sleep(10)


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

        pages_text = ocr_pdf_pages(pdf_path)
        total_pages = len(pages_text)
        
        # Partition pages into chunks of at most 6 pages
        chunk_size = 6
        page_chunks = [pages_text[i:i + chunk_size] for i in range(0, total_pages, chunk_size)]
        
        merged_title = os.path.splitext(os.path.basename(rel_path))[0]
        merged_sections_map = {}
        
        for chunk_idx, chunk_pages in enumerate(page_chunks):
            chunk_text = "\n\n=== NEW PAGE ===\n\n".join(chunk_pages)
            if len(chunk_text.strip()) < 50:
                continue
            
            structured_chunk = structure_with_gemini(chunk_text)
            
            # Extract clean title from first chunk
            if chunk_idx == 0 and structured_chunk.get("metadata", {}).get("title") not in [None, "UNREADABLE"]:
                merged_title = structured_chunk["metadata"]["title"]
            
            for section in structured_chunk.get("sections", []):
                sec_name = section.get("section_name") or "General Studies"
                sec_name = sec_name.strip()
                if not sec_name:
                    sec_name = "General Studies"
                
                if sec_name not in merged_sections_map:
                    merged_sections_map[sec_name] = []
                
                for q in section.get("questions", []):
                    q_text = (q.get("question_text") or "").strip()
                    opts = q.get("options") or []
                    if q_text and len(opts) == 4:
                        merged_sections_map[sec_name].append({
                            "question_text": q_text,
                            "options": [o.strip() for o in opts]
                        })
            
            # Pacing sleep between chunks
            if len(page_chunks) > 1:
                time.sleep(1.5)

        merged_sections = []
        global_q_num = 1
        
        for sec_name, questions in merged_sections_map.items():
            if not questions:
                continue
            sec_questions = []
            for q in questions:
                formatted_opts = []
                labels = ["A", "B", "C", "D"]
                for i, opt in enumerate(q["options"]):
                    cleaned_opt = re.sub(r'^\s*[A-D][\)\.\s\-]+', '', opt).strip()
                    formatted_opts.append(f"{labels[i]}) {cleaned_opt}")
                
                sec_questions.append({
                    "question_number": global_q_num,
                    "question_text": q["question_text"],
                    "options": formatted_opts,
                    "correct_option": None,
                    "explanation": ""
                })
                global_q_num += 1
            
            merged_sections.append({
                "section_name": sec_name,
                "questions": sec_questions
            })

        if global_q_num == 1:
            return {"status": "error", "file": rel_path, "error": "0 questions parsed from all chunks"}

        final_structured = {
            "metadata": {"title": merged_title},
            "sections": merged_sections
        }

        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(final_structured, f, indent=2, ensure_ascii=False)

        return {"status": "success", "file": rel_path, "out": new_name, "questions": global_q_num - 1}
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

    print("=== VEERNXT PYP OCR RECONSTRUCTION (GEMINI DEVELOPER API) ===")
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

    # Developer API via flex tier has strong concurrency, but ProcessPoolExecutor
    # needs to stay reasonable to avoid local CPU bounds during Tesseract OCR.
    with ProcessPoolExecutor(max_workers=3, initializer=_init_worker) as executor:
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
