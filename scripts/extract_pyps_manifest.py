import os
import sys
import re
import json
import fitz
import pytesseract
from PIL import Image
import io
import time
from concurrent.futures import ProcessPoolExecutor, as_completed

INPUT_DIR = r"K:\H DRIVE\Quantum Climb\CLIENT ASSETS\VeerNXT\CONTENT\MASTER PYP_superseded_20260822"
MANIFEST_PATH = r"K:\H DRIVE\Quantum Climb\CLIENT ASSETS\VeerNXT\CONTENT\pyp_metadata_manifest.json"
TESSERACT_CMD = r"K:\I DRIVE\Tesseract-OCR\tesseract.exe"

pytesseract.pytesseract.tesseract_cmd = TESSERACT_CMD

try:
    fitz.TOOLS.mupdf_display_errors(False)
except Exception:
    pass

# Keywords and Regex patterns
BODIES = ["SSC", "RRB", "IBPS", "UPSC", "LIC", "FCI", "ESIC", "DSSSB", "KVS", "NVS", "UPSSSC", "HSSC"]
EXAMS = [
    ("CGL", "Combined Graduate Level"),
    ("CHSL", "Combined Higher Secondary Level"),
    ("MTS", "Multi Tasking Staff"),
    ("CPO", "Central Police Organization"),
    ("GD", "GD Constable"),
    ("JE", "Junior Engineer"),
    ("STENOGRAPHER", "Stenographer"),
    ("NTPC", "NTPC"),
    ("GROUP D", "Group D"),
    ("ALP", "Assistant Loco Pilot"),
    ("PO", "Probationary Officer"),
    ("CLERK", "Clerk"),
    ("SO", "Specialist Officer")
]

DATE_PATTERN = re.compile(r'\b\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}\b')
YEAR_PATTERN = re.compile(r'\b(201\d|202\d)\b')
SHIFT_PATTERN = re.compile(r'\b(shift|batch|session)\s*\:?\s*(\d+|morning|afternoon|evening|1st|2nd|3rd|4th)\b', re.IGNORECASE)

def clean_extracted_text(text):
    # Normalize whitespaces
    return re.sub(r'\s+', ' ', text).strip()

def parse_metadata_from_text(text, file_path):
    text_upper = text.upper()
    
    # 1. Conducting Body
    body = "UNKNOWN"
    for b in BODIES:
        if b in text_upper:
            body = b
            break
    if body == "UNKNOWN":
        # Fallback to folder name matching
        for b in BODIES:
            if b in file_path.upper():
                body = b
                break

    # 2. Exam Name
    exam_name = "UNKNOWN"
    for short, full in EXAMS:
        if short in text_upper or full.upper() in text_upper:
            exam_name = short
            break
    if exam_name == "UNKNOWN":
        for short, full in EXAMS:
            if short in file_path.upper() or full.upper() in file_path.upper():
                exam_name = short
                break

    # 3. Year
    year = "UNKNOWN"
    years = YEAR_PATTERN.findall(text)
    if years:
        year = years[0]
    else:
        years_path = YEAR_PATTERN.findall(file_path)
        if years_path:
            year = years_path[0]

    # 4. Exam Date
    date = "UNKNOWN"
    dates = DATE_PATTERN.findall(text)
    if dates:
        date = dates[0]

    # 5. Shift
    shift = "UNKNOWN"
    shift_match = SHIFT_PATTERN.search(text)
    if shift_match:
        shift = f"{shift_match.group(1)} {shift_match.group(2)}"
        
    return {
        "conducting_body": body,
        "exam_name": exam_name,
        "year": year,
        "date": date,
        "shift": shift
    }

def process_single_pyp_manifest(pdf_path):
    """
    Worker function to run text extraction and OCR on page 1 of a PDF.
    """
    # Set tesseract path inside child process
    pytesseract.pytesseract.tesseract_cmd = TESSERACT_CMD
    try:
        fitz.TOOLS.mupdf_display_errors(False)
    except:
        pass
        
    rel_path = os.path.relpath(pdf_path, INPUT_DIR)
    
    try:
        doc = fitz.open(pdf_path)
        if len(doc) == 0:
            return {"file": rel_path, "status": "error", "error": "PDF has 0 pages"}
            
        page1 = doc[0]
        
        # Try text extraction first
        text = page1.get_text()
        is_scanned = False
        
        # If very little text is extracted, run OCR
        if len(text.strip()) < 100:
            is_scanned = True
            # Render page 1 as an image
            pix = page1.get_pixmap(dpi=150)
            img_data = pix.tobytes("png")
            img = Image.open(io.BytesIO(img_data))
            # Run OCR
            text = pytesseract.image_to_string(img, lang="eng+hin")
            
        doc.close()
        
        clean_txt = clean_extracted_text(text)
        metadata = parse_metadata_from_text(clean_txt, pdf_path)
        
        return {
            "file": rel_path,
            "status": "success",
            "is_scanned": is_scanned,
            "metadata": metadata,
            "raw_preview": clean_txt[:300] # store a small preview of extracted text
        }
    except Exception as e:
        return {"file": rel_path, "status": "error", "error": str(e)}

def main():
    print("=== VEERNXT PYP METADATA EXTRACTOR ===")
    print(f"Scanning Directory: {INPUT_DIR}")
    
    if not os.path.exists(INPUT_DIR):
        print(f"Error: Input directory {INPUT_DIR} does not exist.")
        sys.exit(1)
        
    pdf_files = []
    for root, dirs, files in os.walk(INPUT_DIR):
        for f in files:
            if f.lower().endswith('.pdf'):
                pdf_files.append(os.path.join(root, f))
                
    total_files = len(pdf_files)
    print(f"Total PDFs found: {total_files}")
    
    if total_files == 0:
        sys.exit(0)
        
    max_workers = os.cpu_count() or 4
    print(f"Extracting metadata using {max_workers} processes...")
    
    manifest = []
    success_count = 0
    error_count = 0
    scanned_count = 0
    
    start_time = time.time()
    
    with ProcessPoolExecutor(max_workers=max_workers) as executor:
        futures = {executor.submit(process_single_pyp_manifest, pdf): pdf for pdf in pdf_files}
        
        for idx, future in enumerate(as_completed(futures), 1):
            res = future.result()
            if res["status"] == "success":
                success_count += 1
                if res["is_scanned"]:
                    scanned_count += 1
                manifest.append(res)
                # Print progress update
                if idx % 10 == 0 or idx == total_files:
                    meta = res["metadata"]
                    print(f"[{idx}/{total_files}] Extracted: {res['file']} -> {meta['conducting_body']} | {meta['exam_name']} | {meta['year']}")
            else:
                error_count += 1
                print(f"[{idx}/{total_files}] ERROR on {res['file']}: {res['error']}")
                
    # Save manifest
    with open(MANIFEST_PATH, 'w', encoding='utf-8') as f:
        json.dump(manifest, f, indent=2, ensure_ascii=False)
        
    elapsed = time.time() - start_time
    print("\n=== EXTRACTION COMPLETED ===")
    print(f"Manifest saved to: {MANIFEST_PATH}")
    print(f"Total processed: {total_files}")
    print(f"  Success: {success_count} ({scanned_count} scanned/OCRed)")
    print(f"  Error:   {error_count}")
    print(f"Elapsed Time: {elapsed:.2f} seconds ({elapsed/60:.2f} minutes)")

if __name__ == "__main__":
    main()
