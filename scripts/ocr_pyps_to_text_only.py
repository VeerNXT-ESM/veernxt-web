"""
scripts/ocr_pyps_to_text_only.py

Extracts raw text from scanned PYP PDFs using Tesseract OCR and saves to .txt files.
This is a decoupling step since Gemini API is temporarily blocked.
"""

import os
import re
import sys
import json
import time
from concurrent.futures import ProcessPoolExecutor, as_completed
import fitz
import pytesseract
from PIL import Image
import io

INPUT_DIR = r"K:\H DRIVE\Quantum Climb\CLIENT ASSETS\VeerNXT\CONTENT\MASTER_PYPS"
STRUCTURED_OUTPUT_DIR = r"K:\H DRIVE\Quantum Climb\CLIENT ASSETS\VeerNXT\CONTENT\FINAL_PYPS_STRUCTURED"
TEXT_OUTPUT_DIR = r"K:\H DRIVE\Quantum Climb\CLIENT ASSETS\VeerNXT\CONTENT\FINAL_PYPS_OCR_TEXT"
MANIFEST_PATH = r"K:\H DRIVE\Quantum Climb\CLIENT ASSETS\VeerNXT\CONTENT\pyp_metadata_manifest.json"
TESSERACT_CMD = r"K:\I DRIVE\Tesseract-OCR\tesseract.exe"

os.makedirs(TEXT_OUTPUT_DIR, exist_ok=True)


def clean_segment(segment):
    seg = re.sub(r'^\s*\d+[\.\s\-]*', '', segment)
    seg = re.sub(r'[^\w\s\-\(\)]', '', seg)
    seg = re.sub(r'[\s\-\_]+', '_', seg)
    return seg.strip('_')


def derive_rebranded_name(rel_path, ext=".txt"):
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
    final_name = "_".join(dedup_words) + ext
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


def process_single_pdf(rel_path):
    pdf_path = os.path.join(INPUT_DIR, rel_path)
    json_name = derive_rebranded_name(rel_path, ext=".json")
    txt_name = derive_rebranded_name(rel_path, ext=".txt")
    
    json_path = os.path.join(STRUCTURED_OUTPUT_DIR, json_name)
    txt_path = os.path.join(TEXT_OUTPUT_DIR, txt_name)

    # Skip if JSON already fully structured
    if os.path.exists(json_path):
        try:
            with open(json_path, "r", encoding="utf-8") as f:
                existing = json.load(f)
            existing_q_count = sum(len(s.get("questions", [])) for s in existing.get("sections", []))
            if existing_q_count > 0:
                return {"status": "skipped_json_exists", "file": rel_path}
        except Exception:
            pass
            
    # Skip if TXT already exists
    if os.path.exists(txt_path):
        return {"status": "skipped_txt_exists", "file": rel_path}

    try:
        if not os.path.exists(pdf_path):
            return {"status": "error", "file": rel_path, "error": "source PDF not found"}

        pages_text = ocr_pdf_pages(pdf_path)
        full_text = "\n\n=== NEW PAGE ===\n\n".join(pages_text)
        
        with open(txt_path, "w", encoding="utf-8") as f:
            f.write(full_text)

        return {"status": "success", "file": rel_path, "out": txt_name, "pages": len(pages_text)}
    except Exception as e:
        return {"status": "error", "file": rel_path, "error": str(e)}


def _init_worker():
    pytesseract.pytesseract.tesseract_cmd = TESSERACT_CMD
    try:
        fitz.TOOLS.mupdf_display_errors(False)
    except Exception:
        pass


def main():
    print("=== VEERNXT PYP TESSERACT OCR (TEXT ONLY) ===")
    with open(MANIFEST_PATH, "r", encoding="utf-8") as f:
        manifest = json.load(f)

    targets = [m["file"] for m in manifest if m.get("is_scanned") and m.get("status") == "success"]
    print(f"Found {len(targets)} scanned PDFs in manifest.")

    success_count = 0
    error_count = 0
    skipped_count = 0
    start_time = time.time()
    
    max_workers = max(1, os.cpu_count() - 2)
    print(f"Starting OCR with {max_workers} parallel workers...")
    
    with ProcessPoolExecutor(max_workers=max_workers, initializer=_init_worker) as executor:
        future_to_pdf = {executor.submit(process_single_pdf, t): t for t in targets}
        for i, future in enumerate(as_completed(future_to_pdf), 1):
            res = future.result()
            
            if res["status"].startswith("skipped"):
                skipped_count += 1
            elif res["status"] == "success":
                success_count += 1
            else:
                error_count += 1
                
            if i % 10 == 0 or i == len(targets):
                elapsed = time.time() - start_time
                print(f"[{i}/{len(targets)}] Elapsed: {elapsed:.1f}s | Success: {success_count} | Error: {error_count} | Skipped: {skipped_count}")
                if res["status"] == "error":
                    print(f"  -> Error on {res['file']}: {res['error']}")
                elif res["status"] == "success":
                    print(f"  -> [OK] {res['out']} ({res['pages']} pages)")

    print("\n=== OCR SUMMARY ===")
    print(f"Successfully Extracted: {success_count}")
    print(f"Failed with Errors:     {error_count}")
    print(f"Skipped (Already Done): {skipped_count}")

if __name__ == "__main__":
    main()
