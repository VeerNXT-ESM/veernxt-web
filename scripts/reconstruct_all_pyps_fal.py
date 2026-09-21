import os
import sys
import re
import json
import fitz
import time
import requests
from concurrent.futures import ThreadPoolExecutor, as_completed

# Configuration
INPUT_DIR = r"K:\H DRIVE\Quantum Climb\CLIENT ASSETS\VeerNXT\CONTENT\MASTER_PYPS"
# The K:-drive FINAL_PYPS_STRUCTURED is empty -- output now lives in the
# repo itself (same relocation already fixed in ingest_structured_pyps.mjs).
OUTPUT_DIR = r"K:\H DRIVE\Quantum Climb\APPS\VeerNXT\VeerNXT Main Repo\VeerNXT APP\veernxt-web\public\FINAL_PYPS_STRUCTURED"
ENV_PATH = r"K:\H DRIVE\Quantum Climb\APPS\VeerNXT\VeerNXT Main Repo\VeerNXT APP\veernxt-web\.env"

# Same task as reconstruct_all_pyps_flex.py -- identical prompt, schema,
# PDF extraction and output convention -- but billed against FAL's
# prepaid credits (via its OpenRouter proxy) instead of Google AI Studio's
# Gemini API, whose prepay balance is at $0. Model still defaults to
# Gemini for output-quality parity with everything already ingested;
# override with FAL_LLM_MODEL if you want to try a different model.
FAL_MODEL = os.environ.get("FAL_LLM_MODEL", "google/gemini-2.5-flash")

# Load FAL API Key
fal_key = None
if os.path.exists(ENV_PATH):
    with open(ENV_PATH, "r") as f:
        for line in f:
            if line.startswith("FAL_API_KEY="):
                fal_key = line.split("=", 1)[1].strip()

if not fal_key:
    print("Error: FAL_API_KEY not found in .env")
    sys.exit(1)

# Suppress MuPDF warnings
try:
    fitz.TOOLS.mupdf_display_errors(False)
except Exception:
    pass

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

def extract_pdf_text(pdf_path):
    doc = fitz.open(pdf_path)
    full_text = []
    for page in doc:
        full_text.append(page.get_text())
    doc.close()
    return "\n\n=== NEW PAGE ===\n\n".join(full_text)

def extract_json_object(text_out):
    """FAL's OpenRouter proxy has no equivalent of Gemini's strict
    responseMimeType=application/json flag -- the model can still wrap
    its answer in markdown fences or add stray prose despite being told
    not to. Strip fences and fall back to slicing the first {...last}
    before parsing, same defensive pattern used elsewhere in this repo's
    Gemini-calling scripts."""
    t = text_out.strip()
    t = re.sub(r'^```(?:json)?\s*', '', t)
    t = re.sub(r'\s*```$', '', t)
    t = t.strip()
    try:
        return json.loads(t)
    except json.JSONDecodeError:
        start = t.find('{')
        end = t.rfind('}')
        if start != -1 and end != -1 and end > start:
            return json.loads(t[start:end + 1])
        raise

def query_fal_llm(raw_text, fal_key):
    url = "https://fal.run/openrouter/router"
    headers = {
        "Authorization": f"Key {fal_key}",
        "Content-Type": "application/json",
    }

    prompt = f"""
You are an expert exam content compiler. Your task is to extract all questions, multiple-choice options, correct answers, and explanations from the provided exam paper text and structure them into a valid JSON document.

Do NOT summarize the questions. Maintain the exact text.
If the document contains answers at the end, match them to the correct questions.
If no explanation is in the source text, write a brief, highly professional explanation of why the correct option is right.

Return ONLY a JSON object conforming to the following structure, no markdown fences, no explanation outside the JSON:
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

Here is the raw text of the exam paper:
---
{raw_text}
---
"""

    payload = {
        "model": FAL_MODEL,
        "prompt": prompt,
        "temperature": 0.1,
    }

    max_retries = 5
    for attempt in range(1, max_retries + 1):
        try:
            res = requests.post(url, json=payload, headers=headers, timeout=300)
            if res.status_code == 200:
                data = res.json()
                text_out = data.get("output")
                if not text_out:
                    raise Exception(f"No 'output' field in FAL response: {data}")
                return extract_json_object(text_out)
            elif res.status_code in [429, 500, 503]:
                print(f"      [FAL] Received {res.status_code}. Retrying in 15s (Attempt {attempt}/{max_retries})...")
                time.sleep(15)
            else:
                raise Exception(f"HTTP {res.status_code}: {res.text}")
        except Exception as e:
            if attempt == max_retries:
                raise e
            print(f"      [FAL] Error: {e}. Retrying in 15s (Attempt {attempt}/{max_retries})...")
            time.sleep(15)

    raise Exception("Max retries reached without success.")

def process_single_pdf(pdf_path, fal_key, output_dir):
    rel_path = os.path.relpath(pdf_path, INPUT_DIR)
    new_name = derive_rebranded_name(rel_path)
    output_path = os.path.join(output_dir, new_name)

    # Resumable skip
    if os.path.exists(output_path):
        return {"status": "skipped", "file": rel_path, "out": new_name}

    try:
        # 1. Extract text
        raw_text = extract_pdf_text(pdf_path)
        if len(raw_text.strip()) < 50:
            return {"status": "error", "file": rel_path, "error": "Extracted text is too short or empty."}

        # 2. Query FAL (OpenRouter proxy)
        structured_json = query_fal_llm(raw_text, fal_key)

        # 3. Save output
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(structured_json, f, indent=2, ensure_ascii=False)

        return {"status": "success", "file": rel_path, "out": new_name}
    except Exception as e:
        return {"status": "error", "file": rel_path, "error": str(e)}

def main():
    print("=== VEERNXT PYP TEXT RECONSTRUCTION PIPELINE (FAL / OpenRouter) ===")
    print(f"Input Directory:  {INPUT_DIR}")
    print(f"Output Directory: {OUTPUT_DIR}")
    print(f"Model:            {FAL_MODEL}")

    only_files = None
    count_only = "--count-only" in sys.argv
    for arg in sys.argv[1:]:
        if arg.startswith("--only="):
            only_files = [s.strip().lower() for s in arg.split("=", 1)[1].split(",") if s.strip()]

    if not os.path.exists(INPUT_DIR):
        print(f"Error: Input directory {INPUT_DIR} does not exist.")
        sys.exit(1)

    if not os.path.exists(OUTPUT_DIR):
        os.makedirs(OUTPUT_DIR)

    print("Scanning input directory for PDFs...")
    pdf_files = []
    for root, dirs, files in os.walk(INPUT_DIR):
        for f in files:
            if f.lower().endswith('.pdf'):
                full = os.path.join(root, f)
                if only_files is not None:
                    rel_lower = os.path.relpath(full, INPUT_DIR).lower()
                    if not any(term in rel_lower for term in only_files):
                        continue
                pdf_files.append(full)

    total_files = len(pdf_files)
    print(f"Total PDFs matched: {total_files}")

    if total_files == 0:
        print("No matching PDF files found.")
        sys.exit(0)

    max_workers = 4
    print(f"Starting ThreadPoolExecutor with {max_workers} worker threads...")

    success_count = 0
    skipped_count = 0
    error_count = 0
    start_time = time.time()

    pending_files = []
    for pdf in pdf_files:
        rel_path = os.path.relpath(pdf, INPUT_DIR)
        new_name = derive_rebranded_name(rel_path)
        output_path = os.path.join(OUTPUT_DIR, new_name)
        if os.path.exists(output_path):
            skipped_count += 1
        else:
            pending_files.append(pdf)

    print(f"Skipped {skipped_count} already structured papers.", flush=True)
    print(f"Pending papers to process: {len(pending_files)}", flush=True)

    total_pending = len(pending_files)
    if total_pending == 0:
        print("All matched papers have already been structured!", flush=True)
        sys.exit(0)

    if count_only:
        print("\n--count-only: stopping before any FAL calls. No cost incurred.", flush=True)
        sys.exit(0)

    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        futures = {executor.submit(process_single_pdf, pdf, fal_key, OUTPUT_DIR): pdf for pdf in pending_files}

        for idx, future in enumerate(as_completed(futures), 1):
            res = future.result()
            status = res["status"]

            if status == "success":
                success_count += 1
                print(f"[{idx}/{total_pending}] STRUCTURED: {res['out']}", flush=True)
            elif status == "skipped":
                skipped_count += 1
            elif status == "error":
                error_count += 1
                print(f"[{idx}/{total_pending}] ERROR on {res['file']}: {res['error']}", flush=True)

    elapsed_time = time.time() - start_time
    print("\n=== PIPELINE SUMMARY ===", flush=True)
    print(f"Total Files Matched:      {total_files}", flush=True)
    print(f"  Successfully Structured: {success_count}", flush=True)
    print(f"  Skipped (Already Done):  {skipped_count}", flush=True)
    print(f"  Failed with Errors:      {error_count}", flush=True)
    print(f"Elapsed Time: {elapsed_time:.2f} seconds ({elapsed_time/60:.2f} minutes)", flush=True)

if __name__ == "__main__":
    main()
