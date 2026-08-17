#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
scripts/fix_content_folder_structure.py

Local housekeeping for the CLIENT ASSETS content library (CENTRAL EXAMS /
STATE EXAMS), which lives outside git — this script is careful by design:
dry-run by default, every action logged, nothing destructive beyond
replacing known placeholder marker files.

For every exam folder found under --root:
  1. Renames the two known typo'd category folders in place (minimal-diff
     fix, e.g. "2.GUIDBOOK" -> "2.GUIDE BOOK", not a full re-format).
  2. Creates any of the 5 standard category folders (Intro/Guide/Precis/
     PYQ/Mock) that don't exist at all yet, using canonical names.
  3. Drops a single blank placeholder .docx (title-only, ~5-10 words) into
     any category folder that currently has no real content — either
     newly created, or only containing old marker files
     (*_placeholder.txt / *_README.txt) or is otherwise empty. The old
     marker files are removed in favor of this one canonical placeholder,
     so "does this folder have real content" becomes a pure word-count
     check later (see REAL_CONTENT_MIN_WORDS) instead of filename-pattern
     guessing.
  4. Leaves every folder that already has real content completely untouched.

Usage:
  python scripts/fix_content_folder_structure.py --root "K:\\...\\CENTRAL EXAMS"          # dry run, writes a plan report
  python scripts/fix_content_folder_structure.py --root "K:\\...\\CENTRAL EXAMS" --execute  # applies it
"""

import argparse
import os
import re
import sys
import io
import zipfile
from pathlib import Path
from docx import Document

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

CATEGORY_PATTERNS = {
    "Intro": ["INTRO"],
    "Guide": ["GUIDE"],
    "Precis": ["PRECIS", "PRÉCIS"],
    "PYQ": ["PYQ", "PREVIOUS YEAR", "PAST PAPER", "PAST YEAR"],
    "Mock/TestSeries": ["TEST SERIES", "MOCK"],
}
POSITION_CATEGORY = {1: "Intro", 2: "Guide", 3: "Precis", 4: "PYQ", 5: "Mock/TestSeries"}
CANONICAL_NEW_NAME = {
    "Intro": "1. INTRO",
    "Guide": "2. GUIDE BOOK",
    "Precis": "3. PRECIS",
    "PYQ": "4. PYQ",
    "Mock/TestSeries": "5. MOCK TEST",
}

# Explicit, minimal-diff typo fixes — scoped by exact current name, not a
# broad renaming pass. Only real misspellings go here; folders that are
# correctly spelled but differently formatted (e.g. "1.INTRO" vs
# "1. INTRODUCTION") are left alone.
TYPO_FIXES = {
    "1. INTODUCTION": "1. INTRODUCTION",
    "2.GUIDBOOK": "2.GUIDE BOOK",
}

PLACEHOLDER_MARKER_NAME = "_PENDING_CONTENT.docx"
REAL_CONTENT_MIN_WORDS = 30  # below this, treat as placeholder-only

def normalize(name):
    u = name.upper()
    u = re.sub(r'[_\-]+', ' ', u)
    u = re.sub(r'\s+', ' ', u)
    return u

def leading_number(name):
    m = re.match(r'^\s*(\d+)\s*[.)]', name)
    return int(m.group(1)) if m else None

def match_category_strict(name):
    u = normalize(name)
    for cat, pats in CATEGORY_PATTERNS.items():
        for p in pats:
            if p in u:
                return cat
    return None

def is_marker_file(name):
    lname = name.lower()
    return lname.startswith("~$") or "placeholder" in lname or "readme" in lname or name == PLACEHOLDER_MARKER_NAME

# A truly blank placeholder (title heading only) is ~36KB. Many real PYQ/
# Mock docs are scanned exam papers — near-zero extractable text but tens of
# MB of embedded images — so text word-count alone badly misclassifies them
# as empty. Read directly from the zip (docx is a zip) for both signals:
# it's faster than python-docx's full object model, and catching embedded
# images is the reliable signal text extraction can't see.
BLANK_SIZE_THRESHOLD_BYTES = 500_000  # well above the ~36KB blank baseline

def docx_has_real_content(path: Path):
    try:
        if path.stat().st_size >= BLANK_SIZE_THRESHOLD_BYTES:
            return True
        with zipfile.ZipFile(path) as z:
            if any(n.startswith("word/media/") for n in z.namelist()):
                return True
            try:
                xml = z.read("word/document.xml").decode("utf-8", errors="ignore")
            except KeyError:
                return False
            text = re.sub(r"<[^>]+>", " ", xml)
            return len(text.split()) >= REAL_CONTENT_MIN_WORDS
    except Exception:
        # Unreadable/corrupt file — treat as real rather than risk
        # overwriting something we can't verify.
        return True

def real_files_in(dir_path: Path):
    """Real (non-marker) files anywhere under dir_path, recursively."""
    out = []
    for p in dir_path.rglob("*"):
        if p.is_file() and not is_marker_file(p.name):
            out.append(p)
    return out

def make_blank_docx(dest_path: Path, title_text: str):
    doc = Document()
    doc.add_heading(title_text, level=2)
    doc.save(str(dest_path))

def is_category_container(child_dirs):
    """Same heuristic as the earlier analysis: small child count, most
    children already match a category name -> this is a category folder,
    not a deeper identity-nesting level.

    Secondary, narrower rule for badly-incomplete exam folders (e.g. NABARD
    Grade A, which only had 2 of 5 categories ever created): if there are
    very few children (<=3) and at least one matches by name, and none of
    the children themselves contain subdirectories (they're leaf,
    file-holding folders, not further identity nesting), treat it as a
    container too. A real identity-listing folder (e.g. multiple sub-exams)
    would have further subdirectories under each child, so this stays safe.
    """
    if not child_dirs:
        return False, {}
    strict = {c: match_category_strict(c.name) for c in child_dirs}
    n_strict = sum(1 for v in strict.values() if v)
    primary_ok = len(child_dirs) <= 6 and n_strict >= 3
    secondary_ok = (
        not primary_ok and len(child_dirs) <= 3 and n_strict >= 1 and
        all(not any(gc.is_dir() for gc in c.iterdir()) for c in child_dirs)
    )
    if not primary_ok and not secondary_ok:
        return False, {}
    claimed = set(v for v in strict.values() if v)
    result = {}
    for c, cat in strict.items():
        if cat:
            result[c] = cat
        else:
            n = leading_number(c.name)
            fallback = POSITION_CATEGORY.get(n)
            if fallback and fallback not in claimed:
                result[c] = fallback
                claimed.add(fallback)
    if len(result) != len(child_dirs):
        return False, {}
    return True, result

def plan_for_exam_folder(exam_dir: Path, actions):
    """exam_dir is a directory believed to be a category container (an
    exam-leaf folder). Emits planned actions: renames, folder creates,
    placeholder creates, marker cleanups."""
    child_dirs = [d for d in exam_dir.iterdir() if d.is_dir()]
    is_container, mapping = is_category_container(child_dirs)
    if not is_container:
        return False

    # original_dir = where the folder actually is right now (content lives
    # here regardless of any pending rename); final_dir = where it will be
    # once a typo-rename (if any) has been applied \u2014 used only for the
    # eventual placeholder/marker paths, never for content inspection,
    # since at plan time no rename has happened on disk yet.
    for d, cat in mapping.items():
        if d.name in TYPO_FIXES:
            new_name = TYPO_FIXES[d.name]
            actions.append({"type": "rename", "path": str(d), "new_name": new_name})
            final_dir = d.parent / new_name
        else:
            final_dir = d
        original_dir = d

        real = real_files_in(original_dir)
        real_docx = [f for f in real if f.suffix.lower() == ".docx"]
        real_other = [f for f in real if f.suffix.lower() != ".docx"]  # .doc, .pdf, images, etc. — can't zip-inspect .doc, treat presence as real
        has_real_content = any(docx_has_real_content(f) for f in real_docx) or len(real_other) > 0
        if not has_real_content:
            marker_files = [f for f in original_dir.rglob("*") if f.is_file() and is_marker_file(f.name)]
            for mf in marker_files:
                actions.append({"type": "remove_marker", "path": str(mf)})
            actions.append({"type": "placeholder", "path": str(final_dir / PLACEHOLDER_MARKER_NAME),
                             "title": f"{exam_dir.name} \u2014 {cat}", "reason": "existing folder has no real content"})

    for cat, canonical_name in CANONICAL_NEW_NAME.items():
        if cat not in mapping.values():
            new_dir = exam_dir / canonical_name
            actions.append({"type": "mkdir", "path": str(new_dir)})
            actions.append({"type": "placeholder", "path": str(new_dir / PLACEHOLDER_MARKER_NAME),
                             "title": f"{exam_dir.name} \u2014 {cat}", "reason": "category folder didn't exist"})
    return True

def walk(dir_path: Path, actions, stats):
    if not dir_path.is_dir():
        return
    child_dirs = [d for d in dir_path.iterdir() if d.is_dir()]
    if not child_dirs:
        child_files = [f for f in dir_path.iterdir() if f.is_file()]
        # Completely bare — no subfolders, no files at all. If this
        # folder's own name doesn't look like a category folder, it's an
        # exam-identity leaf that never got its 5 category folders
        # created in the first place (common in State Exams; Central had
        # none of these). Scaffold it from scratch rather than silently
        # skipping it.
        if not child_files and match_category_strict(dir_path.name) is None:
            stats["exam_folders"] += 1
            stats["bare_scaffolded"] += 1
            for cat, canonical_name in CANONICAL_NEW_NAME.items():
                new_dir = dir_path / canonical_name
                actions.append({"type": "mkdir", "path": str(new_dir)})
                actions.append({"type": "placeholder", "path": str(new_dir / PLACEHOLDER_MARKER_NAME),
                                 "title": f"{dir_path.name} — {cat}", "reason": "exam folder was completely bare"})
        return
    is_container, _ = is_category_container(child_dirs)
    if is_container:
        stats["exam_folders"] += 1
        plan_for_exam_folder(dir_path, actions)
        return
    for c in child_dirs:
        walk(c, actions, stats)

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--root", required=True)
    ap.add_argument("--execute", action="store_true")
    ap.add_argument("--report", default="fix_plan_report.txt")
    args = ap.parse_args()

    root = Path(args.root)
    actions = []
    stats = {"exam_folders": 0, "bare_scaffolded": 0}
    for top in sorted(root.iterdir()):
        if top.is_dir():
            walk(top, actions, stats)

    renames = [a for a in actions if a["type"] == "rename"]
    mkdirs = [a for a in actions if a["type"] == "mkdir"]
    placeholders = [a for a in actions if a["type"] == "placeholder"]
    removals = [a for a in actions if a["type"] == "remove_marker"]

    lines = []
    lines.append(f"Root: {root}")
    lines.append(f"Exam folders scanned: {stats['exam_folders']}")
    lines.append(f"  of which completely bare (scaffolded from scratch): {stats['bare_scaffolded']}")
    lines.append(f"Typo renames: {len(renames)}")
    lines.append(f"New category folders to create: {len(mkdirs)}")
    lines.append(f"Old marker files to remove: {len(removals)}")
    lines.append(f"Blank placeholder docx to write: {len(placeholders)}")
    lines.append("")
    lines.append("=== RENAMES ===")
    for a in renames:
        lines.append(f"  {a['path']}  ->  {a['new_name']}")
    lines.append("")
    lines.append("=== NEW FOLDERS ===")
    for a in mkdirs:
        lines.append(f"  mkdir: {a['path']}")
    lines.append("")
    lines.append("=== MARKER FILE REMOVALS ===")
    for a in removals:
        lines.append(f"  rm: {a['path']}")
    lines.append("")
    lines.append("=== PLACEHOLDER DOCX WRITES ===")
    for a in placeholders:
        lines.append(f"  write: {a['path']}   (title: \"{a['title']}\", reason: {a['reason']})")

    report = "\n".join(lines)
    with open(args.report, "w", encoding="utf-8") as f:
        f.write(report)

    print(f"Exam folders scanned: {stats['exam_folders']} (of which {stats['bare_scaffolded']} were completely bare)")
    print(f"Typo renames: {len(renames)}")
    print(f"New category folders to create: {len(mkdirs)}")
    print(f"Old marker files to remove: {len(removals)}")
    print(f"Blank placeholder docx to write: {len(placeholders)}")
    print(f"\nFull plan written to {args.report}")

    if not args.execute:
        print("\nDRY RUN — no changes made. Re-run with --execute to apply.")
        return

    print("\nEXECUTING...")
    for a in renames:
        src = Path(a["path"])
        dest = src.parent / a["new_name"]
        if src.exists() and not dest.exists():
            src.rename(dest)
    for a in mkdirs:
        Path(a["path"]).mkdir(parents=True, exist_ok=True)
    for a in removals:
        p = Path(a["path"])
        if p.exists():
            p.unlink()
    for a in placeholders:
        p = Path(a["path"])
        if not p.exists():
            make_blank_docx(p, a["title"])
    print("Done.")

if __name__ == "__main__":
    main()
