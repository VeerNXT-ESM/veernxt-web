import os
import sys
import re
import fitz
import time
from concurrent.futures import ProcessPoolExecutor, as_completed

# Target directories
INPUT_DIR = r"K:\H DRIVE\Quantum Climb\CLIENT ASSETS\VeerNXT\CONTENT\MASTER PYP_superseded_20260822"
OUTPUT_DIR = r"K:\H DRIVE\Quantum Climb\CLIENT ASSETS\VeerNXT\CONTENT\FINAL_PYPS_REBRANDED"
LOGO_PATH = r"K:\H DRIVE\Quantum Climb\APPS\VeerNXT\VeerNXT Main Repo\VeerNXT APP\veernxt-web\public\thumbnails\VEERNXT_LOGO_TRANS.png"

# Suppress MuPDF display warnings
try:
    fitz.TOOLS.mupdf_display_errors(False)
except Exception:
    pass

def clean_segment(segment):
    # Remove numbers like "01.", "1.", "4. " from start
    seg = re.sub(r'^\s*\d+[\.\s\-]*', '', segment)
    # Remove special characters, keep alphanumeric, underscores, and spaces
    seg = re.sub(r'[^\w\s\-\(\)]', '', seg)
    # Replace spaces / hyphens / underscores with single underscores
    seg = re.sub(r'[\s\-\_]+', '_', seg)
    return seg.strip('_')

def derive_rebranded_name(rel_path):
    # Split the relative path
    parts = rel_path.split(os.sep)
    cleaned_parts = []
    
    # Process each folder level except the root (e.g. CENTRAL EXAMS)
    for idx, p in enumerate(parts):
        if p.upper() in ["CENTRAL EXAMS", "STATE EXAMS", "UT EXAMS"]:
            continue
        if idx == len(parts) - 1:
            # Strip extension from filename first
            p = os.path.splitext(p)[0]
        cleaned = clean_segment(p)
        if cleaned:
            cleaned_parts.append(cleaned)
            
    # Join and deduplicate adjacent words
    combined = "_".join(cleaned_parts)
    # Remove duplicate words next to each other
    words = combined.split('_')
    dedup_words = []
    for w in words:
        if not dedup_words or dedup_words[-1].lower() != w.lower():
            dedup_words.append(w)
            
    final_name = "_".join(dedup_words) + ".pdf"
    return final_name

def process_pdf_worker(pdf_in, logo_path):
    """
    Worker function to process a single PDF file.
    Runs inside a separate process.
    """
    # Suppress warnings in child processes
    try:
        fitz.TOOLS.mupdf_display_errors(False)
    except:
        pass

    try:
        rel_path = os.path.relpath(pdf_in, INPUT_DIR)
        new_filename = derive_rebranded_name(rel_path)
        pdf_out = os.path.join(OUTPUT_DIR, new_filename)
        
        # Skip if already processed (resumable)
        if os.path.exists(pdf_out):
            return {"status": "skipped", "file": rel_path, "out": new_filename}

        doc = fitz.open(pdf_in)
        total_pages = len(doc)
        
        # Step 1: Detect repeating watermarks / logos
        img_counts = {}
        for page in doc:
            for img in page.get_images(full=True):
                xref = img[0]
                img_counts[xref] = img_counts.get(xref, 0) + 1

        # Image is repeating if it is on >= 85% of pages (only for docs >= 3 pages)
        repeating_threshold = max(3, int(total_pages * 0.85)) if total_pages >= 3 else 999
        repeating_xrefs = [xref for xref, count in img_counts.items() if count >= repeating_threshold]
        
        flagged_xrefs = set(repeating_xrefs)

        # Step 2: Detect header/footer zone images on all pages
        for page in doc:
            rect = page.rect
            height = rect.height
            for img in page.get_images(full=True):
                xref = img[0]
                image_rects = page.get_image_rects(xref)
                for r in image_rects:
                    # Header zone: Y <= 80
                    # Footer zone: Y >= height - 80
                    if r.y0 <= 80 or r.y1 <= 80 or r.y0 >= height - 80 or r.y1 >= height - 80:
                        flagged_xrefs.add(xref)

        # Delete flagged images globally from PDF
        for xref in flagged_xrefs:
            try:
                doc._deleteObject(xref)
            except Exception:
                pass

        # Step 3: Overlay VeerNXT branding, redact mid-page text links, and strip click-through hyperlinks
        logo_exists = os.path.exists(logo_path)
        
        redact_keywords = [
            "adda247", "testbook", "play.google.com", "google play", 
            "gradeup", "byjus", "mockbox", "qmaths", "careerpower", 
            "superprofs", "kd campus", "unacademy", "www.", "http:", "https:",
            "download", "telegram.me", "t.me"
        ]
        
        for idx, page in enumerate(doc):
            rect = page.rect
            width, height = rect.width, rect.height
            
            # 1. Clear any click-through hyperlinks (annotations)
            links = page.get_links()
            if links:
                for l in links:
                    page.delete_link(l)

            # 2. Redact mid-page competitor and website text links
            for kw in redact_keywords:
                rects = page.search_for(kw)
                for r in rects:
                    # Overlay a solid white rectangle exactly over the text coordinates
                    # Expand by 1pt horizontally and vertically for a clean cover
                    expanded_r = fitz.Rect(r.x0 - 1, r.y0 - 1, r.x1 + 1, r.y1 + 1)
                    page.draw_rect(expanded_r, color=(1, 1, 1), fill=(1, 1, 1))

            # --- Draw Header ---
            # 1. Clear Y <= 45 with a white rectangle
            page.draw_rect(fitz.Rect(0, 0, width, 45), color=(1, 1, 1), fill=(1, 1, 1))
            # 2. Draw border line
            page.draw_line(fitz.Point(20, 45), fitz.Point(width - 20, 45), color=(0.85, 0.85, 0.85), width=0.5)
            # 3. Insert header text
            page.insert_text(fitz.Point(20, 28), "VEERNXT | Previous Year Solved Papers", fontsize=8.5, color=(0.2, 0.2, 0.2), fontname="helv")
            # 4. Insert logo
            if logo_exists:
                page.insert_image(fitz.Rect(width - 95, 12, width - 20, 34), filename=logo_path)

            # --- Draw Footer ---
            # 1. Clear bottom 45 points with a white rectangle
            page.draw_rect(fitz.Rect(0, height - 45, width, height), color=(1, 1, 1), fill=(1, 1, 1))
            # 2. Draw border line
            page.draw_line(fitz.Point(20, height - 45), fitz.Point(width - 20, height - 45), color=(0.85, 0.85, 0.85), width=0.5)
            # 3. Insert footer text
            page.insert_text(fitz.Point(20, height - 23), "Prepared for VeerNXT Students", fontsize=8.5, color=(0.2, 0.2, 0.2), fontname="helv")
            # 4. Insert page number
            page_text = f"Page {idx + 1} of {total_pages}"
            text_w = fitz.get_text_length(page_text, fontname="helv", fontsize=8.5)
            page.insert_text(fitz.Point(width - 20 - text_w, height - 23), page_text, fontsize=8.5, color=(0.2, 0.2, 0.2), fontname="helv")

        # Step 4: Save optimized PDF
        doc.save(pdf_out, garbage=4, deflate=True)
        doc.close()
        return {"status": "success", "file": rel_path, "out": new_filename}
        
    except Exception as e:
        return {"status": "error", "file": pdf_in, "error": str(e)}

def main():
    print("=== VEERNXT PYP REBRANDING & REDACTION PIPELINE ===")
    print(f"Input Directory:  {INPUT_DIR}")
    print(f"Output Directory: {OUTPUT_DIR}")
    
    if not os.path.exists(INPUT_DIR):
        print(f"Error: Input directory {INPUT_DIR} does not exist.")
        sys.exit(1)
        
    if not os.path.exists(OUTPUT_DIR):
        os.makedirs(OUTPUT_DIR)

    # Walk input directory and gather all PDF files
    print("Scanning input directory for PDFs...")
    pdf_files = []
    for root, dirs, files in os.walk(INPUT_DIR):
        for f in files:
            if f.lower().endswith('.pdf'):
                pdf_files.append(os.path.join(root, f))
                
    total_files = len(pdf_files)
    print(f"Total PDFs found to process: {total_files}")
    
    if total_files == 0:
        print("No PDF files found.")
        sys.exit(0)

    # Process in parallel using a ProcessPoolExecutor
    max_workers = os.cpu_count() or 4
    print(f"Starting ProcessPoolExecutor with {max_workers} workers...")
    
    success_count = 0
    skipped_count = 0
    error_count = 0
    start_time = time.time()
    
    with ProcessPoolExecutor(max_workers=max_workers) as executor:
        # Submit all tasks
        futures = {executor.submit(process_pdf_worker, pdf, LOGO_PATH): pdf for pdf in pdf_files}
        
        # Process as they complete
        for idx, future in enumerate(as_completed(futures), 1):
            res = future.result()
            status = res["status"]
            
            if status == "success":
                success_count += 1
                if idx % 10 == 0 or idx == total_files:
                    print(f"[{idx}/{total_files}] REBRANDED: {res['out']}")
            elif status == "skipped":
                skipped_count += 1
                if idx % 50 == 0 or idx == total_files:
                    print(f"[{idx}/{total_files}] (Skipped/Existing: {skipped_count} files)")
            elif status == "error":
                error_count += 1
                print(f"[{idx}/{total_files}] ERROR on {res['file']}: {res['error']}")
                
    elapsed_time = time.time() - start_time
    print("\n=== PIPELINE SUMMATION ===")
    print(f"Total Files Processed: {total_files}")
    print(f"  Successfully Rebranded: {success_count}")
    print(f"  Skipped (Already Done): {skipped_count}")
    print(f"  Failed with Errors:     {error_count}")
    print(f"Elapsed Time: {elapsed_time:.2f} seconds ({elapsed_time/60:.2f} minutes)")

if __name__ == "__main__":
    main()
