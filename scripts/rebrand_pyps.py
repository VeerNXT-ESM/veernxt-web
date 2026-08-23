#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
scripts/rebrand_pyps.py

Automates the scanning, watermark removal, and rebranding of Previous Year Papers (PYPs) in PDF format.
Uses PyMuPDF (fitz) for PDF operations and Tesseract OCR to verify watermark images.
Preserves folder structure under the target rebranded output directories.

Usage:
  python scripts/rebrand_pyps.py --input-dir "path/to/input" --output-dir "path/to/output" [--tesseract "path/to/tesseract.exe"] [--sample-size 10]
"""

import os
import sys
import argparse
import json
import fitz  # PyMuPDF

# Suppress MuPDF warnings/errors to avoid console output flooding and deadlocks in sub-process pipes
try:
    fitz.TOOLS.mupdf_display_errors(False)
except Exception:
    pass

import pytesseract
from PIL import Image
import io

# Default config
DEFAULT_TESSERACT_PATH = r"K:\I DRIVE\Tesseract-OCR\tesseract.exe"
DEFAULT_LOGO_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "public", "thumbnails", "VEERNXT_LOGO_TRANS.png")

WATERMARK_KEYWORDS = [
    "testbook", "adda247", "gradeup", "mockbox", "byju", "qmaths", 
    "careerpower", "superprofs", "kd campus", "adda", "mock", "solution"
]

def setup_tesseract(tesseract_path):
    if os.path.exists(tesseract_path):
        pytesseract.pytesseract.tesseract_cmd = tesseract_path
        print(f"[Config] Configured Tesseract path: {tesseract_path}")
        return True
    else:
        print(f"[Warning] Tesseract executable not found at: {tesseract_path}")
        return False

def ocr_image_bytes(image_bytes):
    """Runs OCR on image bytes and returns lowercase text."""
    try:
        img = Image.open(io.BytesIO(image_bytes))
        text = pytesseract.image_to_string(img)
        return text.lower()
    except Exception as e:
        # Fallback or silent ignore
        return ""

def is_watermark_image(doc, xref, ocr_enabled=True):
    """
    Checks if an image is a watermark based on:
    1. Running OCR on it and checking for known keywords.
    2. Dimension heuristics (very large background images repeated on pages).
    """
    try:
        base_image = doc.extract_image(xref)
        if not base_image:
            return False
            
        w = base_image["width"]
        h = base_image["height"]
        
        # Heuristic 1: If it's a full page background scan (e.g. 1545x1999)
        # Background watermarks are usually large and low contrast
        if w > 800 and h > 1000:
            print(f"  [Analyze] Xref {xref} detected as large background image ({w}x{h}). Marking as watermark.")
            return True
            
        if not ocr_enabled:
            return False
            
        # Run OCR
        ocr_text = ocr_image_bytes(base_image["image"])
        for kw in WATERMARK_KEYWORDS:
            if kw in ocr_text:
                print(f"  [Analyze] Xref {xref} ({w}x{h}) contains watermark text: '{kw}' in OCR. Marking as watermark.")
                return True
                
    except Exception as e:
        print(f"  [Error] Failed to analyze image xref {xref}: {e}")
        
    return False

def process_pdf(pdf_in, pdf_out, logo_path, ocr_enabled=True):
    """Processes a single PDF to remove watermarks and apply VeerNXT branding."""
    print(f"\n[Process] Processing: {pdf_in}")
    try:
        doc = fitz.open(pdf_in)
        total_pages = len(doc)
        
        if total_pages == 0:
            print("  [Error] Empty PDF document.")
            return False, "Empty PDF"

        # Step 1: Detect repeating images
        img_counts = {}
        for page in doc:
            # get_images returns tuples: (xref, smask, width, height, bpc, colorspace, alt.colorspace, name, filter, referer)
            for img in page.get_images(full=True):
                xref = img[0]
                img_counts[xref] = img_counts.get(xref, 0) + 1

        # A repeating image is present on >= 85% of pages
        repeating_threshold = max(1, int(total_pages * 0.85))
        repeating_xrefs = [xref for xref, count in img_counts.items() if count >= repeating_threshold]
        
        watermark_xrefs = []
        for xref in repeating_xrefs:
            if is_watermark_image(doc, xref, ocr_enabled):
                watermark_xrefs.append(xref)

        # Step 2: Remove watermark images globally
        if watermark_xrefs:
            print(f"  [Action] Stripping repeating watermark image xrefs: {watermark_xrefs}")
            for xref in watermark_xrefs:
                doc._deleteObject(xref)
        else:
            print("  [Info] No repeating watermark images found.")

        # Step 3: Add new Rebranding (Header / Footer) on each page
        logo_exists = os.path.exists(logo_path)
        if not logo_exists:
            print(f"  [Warning] Logo file not found at: {logo_path}. Proceeding with text-only branding.")

        for idx, page in enumerate(doc):
            rect = page.rect
            width, height = rect.width, rect.height
            
            # --- Draw Header ---
            # 1. Clear any old header elements by drawing a white rectangle (top 40 points)
            page.draw_rect(fitz.Rect(0, 0, width, 40), color=(1, 1, 1), fill=(1, 1, 1))
            # Draw header border line
            page.draw_line(fitz.Point(20, 40), fitz.Point(width - 20, 40), color=(0.85, 0.85, 0.85), width=0.5)
            # Insert header text
            page.insert_text(fitz.Point(20, 25), "VEERNXT | Previous Year Solved Papers", fontsize=8.5, color=(0.2, 0.2, 0.2), fontname="helv")
            # Insert logo image if exists
            if logo_exists:
                # Place logo on the right side of header: x1=width-95, y1=10, x2=width-20, y2=32
                page.insert_image(fitz.Rect(width - 95, 10, width - 20, 32), filename=logo_path)

            # --- Draw Footer ---
            # 1. Clear any old footer elements by drawing a white rectangle (bottom 40 points)
            page.draw_rect(fitz.Rect(0, height - 40, width, height), color=(1, 1, 1), fill=(1, 1, 1))
            # Draw footer border line
            page.draw_line(fitz.Point(20, height - 40), fitz.Point(width - 20, height - 40), color=(0.85, 0.85, 0.85), width=0.5)
            # Insert footer text
            page.insert_text(fitz.Point(20, height - 20), "Prepared for VeerNXT Students", fontsize=8.5, color=(0.2, 0.2, 0.2), fontname="helv")
            # Insert right-aligned page numbering
            page_text = f"Page {idx + 1} of {total_pages}"
            text_w = fitz.get_text_length(page_text, fontname="helv", fontsize=8.5)
            page.insert_text(fitz.Point(width - 20 - text_w, height - 20), page_text, fontsize=8.5, color=(0.2, 0.2, 0.2), fontname="helv")

        # Step 4: Save optimized file
        dest_parent = os.path.dirname(pdf_out)
        if not os.path.exists(dest_parent):
            os.makedirs(dest_parent)
            
        doc.save(pdf_out, garbage=4, deflate=True)
        doc.close()
        
        orig_size = os.path.getsize(pdf_in)
        new_size = os.path.getsize(pdf_out)
        saved_bytes = orig_size - new_size
        print(f"  [Success] Saved to {pdf_out} (Size: {new_size} bytes, saved: {saved_bytes} bytes)")
        return True, {
            "original_size": orig_size,
            "new_size": new_size,
            "saved_bytes": saved_bytes,
            "watermarks_removed": len(watermark_xrefs)
        }
    except Exception as e:
        print(f"  [Error] Failed to process PDF: {e}")
        return False, str(e)

def main():
    parser = argparse.ArgumentParser(description="VeerNXT PDF Rebranding and Watermark Remover")
    parser.add_argument("--input-dir", required=True, help="Path to input directory containing PDFs.")
    parser.add_argument("--output-dir", required=True, help="Path to output directory where rebranded PDFs will be saved.")
    parser.add_argument("--tesseract", default=DEFAULT_TESSERACT_PATH, help="Path to Tesseract executable.")
    parser.add_argument("--logo", default=DEFAULT_LOGO_PATH, help="Path to VeerNXT logo image file.")
    parser.add_argument("--sample-size", type=int, default=0, help="If > 0, only process this many PDFs as a test run.")
    parser.add_argument("--no-ocr", action="store_true", help="Disable OCR (only use size heuristics).")
    args = parser.parse_args()

    print("=== VEERNXT REBRANDING RUN ===")
    print(f"Input Dir:  {args.input_dir}")
    print(f"Output Dir: {args.output_dir}")
    
    ocr_enabled = not args.no_ocr
    if ocr_enabled:
        ocr_enabled = setup_tesseract(args.tesseract)

    if not os.path.exists(args.input_dir):
        print(f"Error: Input directory does not exist: {args.input_dir}")
        sys.exit(1)

    # Walk through input directory and find all PDFs
    pdf_files = []
    for root, dirs, files in os.walk(args.input_dir):
        for f in files:
            if f.lower().endswith('.pdf'):
                pdf_files.append(os.path.join(root, f))

    total_found = len(pdf_files)
    print(f"Total PDFs found: {total_found}")
    
    if args.sample_size > 0:
        pdf_files = pdf_files[:args.sample_size]
        print(f"Limiting to first {args.sample_size} files for testing.")

    processed_count = 0
    failed_count = 0
    results = {}

    for idx, pdf_path in enumerate(pdf_files):
        # Determine relative output path to preserve folder structure
        rel_path = os.path.relpath(pdf_path, args.input_dir)
        output_path = os.path.join(args.output_dir, rel_path)
        
        success, info = process_pdf(pdf_path, output_path, args.logo, ocr_enabled)
        if success:
            processed_count += 1
            results[rel_path] = {
                "status": "success",
                "details": info
            }
        else:
            failed_count += 1
            results[rel_path] = {
                "status": "failed",
                "error": info
            }

    print("\n=== EXECUTION SUMMARY ===")
    print(f"Total Files Found: {total_found}")
    print(f"Successfully Rebranded: {processed_count}")
    print(f"Failed to Rebrand: {failed_count}")
    
    # Save a run summary report in the output directory
    summary_path = os.path.join(args.output_dir, "rebranding_report.json")
    try:
        with open(summary_path, "w", encoding="utf-8") as f:
            json.dump({
                "summary": {
                    "total_found": total_found,
                    "processed": processed_count,
                    "failed": failed_count
                },
                "files": results
            }, f, indent=2)
        print(f"Report written to {summary_path}")
    except Exception as e:
        print(f"Error saving report: {e}")

if __name__ == "__main__":
    main()
