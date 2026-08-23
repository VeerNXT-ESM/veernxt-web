#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
scripts/consolidate_pyps.py

Consolidates all real PYQs (Previous Year Questions) and PYPs (Previous Year Papers)
from scattered content directories into K:\\H DRIVE\\Quantum Climb\\CLIENT ASSETS\\VeerNXT\\CONTENT\\MASTER PYP.
Excludes placeholders like _PENDING_CONTENT.docx and *_README.txt.

Usage:
  python scripts/consolidate_pyps.py [--dry-run] [--move]
"""

import os
import sys
import shutil
import json
import argparse
from collections import Counter

def is_placeholder_file(filename):
    f_lower = filename.lower()
    return (
        "_pending_content" in f_lower or
        "readme" in f_lower or
        "placeholder" in f_lower or
        "empty" in f_lower
    )

def main():
    parser = argparse.ArgumentParser(description="Consolidate PYQs and PYPs into MASTER PYP folder.")
    parser.add_argument("--dry-run", action="store_true", help="Perform a dry run without modifying files.")
    parser.add_argument("--move", action="store_true", help="Move files (delete from source) instead of copying.")
    args = parser.parse_args()

    paths = {
        "CENTRAL EXAMS": r"K:\H DRIVE\Quantum Climb\CLIENT ASSETS\VeerNXT\CONTENT\CENTRAL EXAMS",
        "PYPs": r"K:\H DRIVE\Quantum Climb\CLIENT ASSETS\VeerNXT\CONTENT\PYPs",
        "STATE EXAMS": r"K:\H DRIVE\Quantum Climb\CLIENT ASSETS\VeerNXT\CONTENT\STATE EXAMS",
        "UT EXAMS": r"K:\H DRIVE\Quantum Climb\CLIENT ASSETS\VeerNXT\CONTENT\UT EXAMS"
    }

    target_dir = r"K:\H DRIVE\Quantum Climb\CLIENT ASSETS\VeerNXT\CONTENT\MASTER PYP"

    if args.dry_run:
        print("=== DRY RUN MODE: No files will be copied or moved ===")
    else:
        print("=== EXECUTION MODE ===")
        if args.move:
            print("WARNING: Files will be MOVED (deleted from source).")
        else:
            print("Files will be COPIED (originals kept in source).")
        
        # Create target directory
        if not os.path.exists(target_dir):
            os.makedirs(target_dir)

    actions = []
    manifest_entries = []
    skipped_placeholders_count = 0

    for name, path_val in paths.items():
        if not os.path.exists(path_val):
            print(f"Skipping directory {path_val} (does not exist).")
            continue
        
        print(f"Scanning {name}...")
        for root, dirs, files in os.walk(path_val):
            for f in files:
                full_path = os.path.join(root, f)
                rel_path = os.path.relpath(full_path, path_val)
                
                # Check for placeholder files
                if is_placeholder_file(f):
                    skipped_placeholders_count += 1
                    continue
                
                # Check if it represents a PYQ or PYP
                path_parts = rel_path.split(os.sep)
                is_pyq_dir = any("pyq" in part.lower() for part in path_parts)
                is_pyp_dir = any("pyp" in part.lower() for part in path_parts)
                
                is_pyq = is_pyq_dir or "pyq" in f.lower()
                is_pyp = is_pyp_dir or "pyp" in f.lower()
                
                # In the 'PYPs' root directory, everything is a PYP
                if name == "PYPs":
                    is_pyp = True
                    is_pyq = False
                
                if is_pyq or is_pyp:
                    # Construct destination path:
                    # MASTER PYP / {Source Name} / {Original Relative Path}
                    dest_rel = os.path.join(name, rel_path)
                    dest_full = os.path.join(target_dir, dest_rel)
                    
                    file_type = "PYQ" if is_pyq else "PYP"
                    actions.append({
                        "src": full_path,
                        "dest": dest_full,
                        "rel_dest": dest_rel,
                        "type": file_type
                    })
                    
                    manifest_entries.append({
                        "original_path": full_path,
                        "master_path": dest_full,
                        "relative_master_path": dest_rel,
                        "type": file_type
                    })

    print(f"\nScan Complete:")
    print(f"  Total real files identified for consolidation: {len(actions)}")
    print(f"  Total placeholder files skipped: {skipped_placeholders_count}")
    
    # Count types
    type_counts = Counter(a["type"] for a in actions)
    print(f"  PYQs: {type_counts['PYQ']}")
    print(f"  PYPs: {type_counts['PYP']}")

    if not actions:
        print("No files found to consolidate. Exiting.")
        return

    # Execute actions
    copied_count = 0
    moved_count = 0
    failed_count = 0

    for idx, action in enumerate(actions):
        src = action["src"]
        dest = action["dest"]
        
        # Display progress every 100 files
        if idx % 100 == 0:
            print(f"Processing file {idx}/{len(actions)}...")

        if args.dry_run:
            continue

        try:
            # Create destination parent directory if needed
            dest_parent = os.path.dirname(dest)
            if not os.path.exists(dest_parent):
                os.makedirs(dest_parent)
            
            if args.move:
                shutil.move(src, dest)
                moved_count += 1
            else:
                shutil.copy2(src, dest)
                copied_count += 1
        except Exception as e:
            print(f"Error processing {src} -> {dest}: {e}")
            failed_count += 1

    # Write manifest.json
    manifest_path = os.path.join(target_dir, "manifest.json")
    if not args.dry_run:
        try:
            with open(manifest_path, "w", encoding="utf-8") as mf:
                json.dump({
                    "total_files": len(manifest_entries),
                    "pyq_count": type_counts['PYQ'],
                    "pyp_count": type_counts['PYP'],
                    "files": manifest_entries
                }, mf, indent=2)
            print(f"Manifest written to {manifest_path}")
        except Exception as e:
            print(f"Error writing manifest: {e}")
    else:
        print(f"Dry run: manifest would be written to {manifest_path}")

    print("\n=== SUMMARY ===")
    if args.dry_run:
        print(f"Dry run complete. Would copy/move {len(actions)} files.")
    else:
        if args.move:
            print(f"Successfully moved: {moved_count} files.")
        else:
            print(f"Successfully copied: {copied_count} files.")
        if failed_count > 0:
            print(f"Failed to process: {failed_count} files.")
        print("Consolidation process complete.")

if __name__ == "__main__":
    main()
