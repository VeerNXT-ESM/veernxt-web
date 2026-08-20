#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
scripts/dedupe_exam_list.py

master_exam_list.json (1,597 rows parsed from the client's Central/State/UT
source docx) has conducting bodies whose exams show up at more than one
level -- some are genuine national exams duplicated into a state/UT row,
some are state Police forces double-listed under a generic, unlabeled
Central entry that's already covered by a detailed State entry, and some
are just two different spellings of the same org ("SSC" vs "Staff Selection
Commission").

This produces a deduplicated list where each real exam appears exactly
once. Nothing is silently dropped: every row folded into a canonical row is
preserved verbatim as an `also_listed_as` tag on that row. Rows that don't
match anything (including bodies that are genuinely mis-leveled but not
duplicated, and bodies that just share a generic name across unrelated
states) pass through unchanged.

Usage:
  python scripts/dedupe_exam_list.py            # dry run, writes changelog only
  python scripts/dedupe_exam_list.py --execute  # also writes master_exam_list_unique.json
"""

import argparse
import difflib
import json
import re
import sys
import io
from collections import defaultdict

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

SOURCE = r"K:\tmp\exam_list_extract\master_exam_list.json"
OUT_DIR = r"K:\H DRIVE\Quantum Climb\CLIENT ASSETS\VeerNXT\CONTENT\1. EXAM LIST"
OUT_JSON = OUT_DIR + r"\master_exam_list_unique.json"
OUT_CHANGELOG = OUT_DIR + r"\dedupe_changelog.md"

STOPWORDS = {"of", "the", "and", "for", "a", "an", "in", "&"}

# Bodies confirmed to be one single national organization -- when they show
# up duplicated across levels, the CENTRAL row is canonical.
KNOWN_CENTRAL_ORGS = [
    "staff selection commission",
    "institute of banking personnel selection",
    "india post",
    "esic", "employees state insurance corporation",
    "union public service commission", "upsc",
    "railway recruitment board",
    "delhi metro rail corporation", "dmrc",
]

# Seed alias merges confirmed during manual review (§B in the plan).
SEED_ALIASES = {
    "ssc": "Staff Selection Commission",
    "staff selection commission (ssc)": "Staff Selection Commission",
}

# Category E from the manual review: generic department names shared by
# unrelated real organizations across different states/UTs (coincidence,
# not duplication) -- e.g. Goa's "Directorate of Education" and Delhi's are
# two different departments. Excluded from duplicate detection entirely, even
# when a specific post title happens to match verbatim across them.
EXCLUDE_BODIES = {
    "directorate of education",
    "animal husbandry dept",
    "animal husbandry",
    "agriculture dept",
    "punjab & haryana high court",
}


def strip_paren(s):
    return re.sub(r"\([^)]*\)", " ", s or "")


def norm(s):
    s = strip_paren(s)
    s = s.lower()
    s = re.sub(r"^\d+\.\s*", "", s.strip())  # leading "12. " list numbering
    s = re.sub(r"[^a-z0-9]+", " ", s)
    return re.sub(r"\s+", " ", s).strip()


def norm_body(s):
    return re.sub(r"\s+", " ", (s or "").strip().lower())


def initials(name):
    base = strip_paren(name)
    words = re.findall(r"[A-Za-z']+", base)
    sig = [w for w in words if w.lower() not in STOPWORDS]
    return "".join(w[0].upper() for w in sig)


def tokens(s):
    return set(t for t in norm(s).split() if t)


# Common Indian police-recruitment abbreviation <-> spelled-out equivalents,
# needed because the source docx mixes both styles ("SI" vs "Sub-Inspector").
ABBREV_EQUIV = {
    frozenset({"si"}): frozenset({"sub", "inspector"}),
    frozenset({"hc"}): frozenset({"head", "constable"}),
}

# Confirmed-during-review phrase equivalences that plain string similarity
# won't catch (different wording for the literal same recruitment drive).
# Any two rows each containing a phrase from the same group are treated as
# the same exam, e.g. "Dak Sevak" (central) == "GDS / Postal Assistant" (UT)
# == "Gramin Dak Sevak" (state) -- all India Post's one nationally-run GDS exam.
CURATED_PHRASE_GROUPS = [
    {"dak sevak", "gds"},
]


def phrase_synonym_match(a_norm, b_norm):
    for group in CURATED_PHRASE_GROUPS:
        a_hit = any(p in a_norm for p in group)
        b_hit = any(p in b_norm for p in group)
        if a_hit and b_hit:
            return True
    return False


class UnionFind:
    def __init__(self):
        self.parent = {}

    def find(self, x):
        self.parent.setdefault(x, x)
        while self.parent[x] != x:
            self.parent[x] = self.parent[self.parent[x]]
            x = self.parent[x]
        return x

    def union(self, a, b):
        ra, rb = self.find(a), self.find(b)
        if ra != rb:
            self.parent[ra] = rb


def stem_core(tok_set):
    """Naive plural stemming (constable/constables) for short generic
    police/exam terms, plus abbreviation expansion (SI -> sub inspector)."""
    for abbr, full in ABBREV_EQUIV.items():
        if tok_set == abbr:
            tok_set = full
    return frozenset(t[:-1] if len(t) > 4 and t.endswith("s") else t for t in tok_set)


def load():
    with open(SOURCE, encoding="utf-8") as f:
        return json.load(f)


def detect_aliases(rows):
    """Detect acronym <-> full-name body splits. Returns (alias_map, flagged)."""
    body_counts = defaultdict(int)
    for r in rows:
        body_counts[r["conducting_body"]] += 1

    alias_map = {}
    flagged = []

    for short, canonical in SEED_ALIASES.items():
        for b in body_counts:
            if norm_body(b) == short:
                alias_map[b] = canonical

    short_bodies = [
        b for b in body_counts
        if b and len(b) <= 8 and b.upper() == b and " " not in b.strip()
        and norm_body(b) not in SEED_ALIASES
    ]
    for s in short_bodies:
        matches = sorted({
            full for full in body_counts
            if full != s and len(full) > 8 and initials(full) == s
        })
        if len(matches) == 1:
            alias_map[s] = matches[0]
        elif len(matches) > 1:
            flagged.append({
                "acronym": s, "candidates": matches,
                "reason": "ambiguous -- multiple distinct full-name matches, likely different real orgs per state",
            })
        # 0 matches: not an alias split, it's just an acronym-only body (fine, leave alone)

    return alias_map, flagged


def apply_aliases(rows, alias_map):
    out = []
    applied = defaultdict(int)
    for r in rows:
        r = dict(r)
        if r["conducting_body"] in alias_map:
            applied[(r["conducting_body"], alias_map[r["conducting_body"]])] += 1
            r["conducting_body"] = alias_map[r["conducting_body"]]
        out.append(r)
    return out, applied


def is_placeholder_row(central_row, body_norm_tokens, peer_rows):
    """A central row whose 'exam name' just restates the org's own name/
    acronym, with 2+ more specific rows elsewhere -- not a real single exam
    to match 1:1, so it gets dropped (with a changelog note) rather than
    forced onto one arbitrary canonical row."""
    name = central_row.get("exam_name") or ""
    if not name.strip():
        return len(peer_rows) >= 2
    nt = tokens(name)
    if not nt:
        return len(peer_rows) >= 2
    overlap = len(nt & body_norm_tokens) / len(nt)
    return overlap >= 0.6 and len(peer_rows) >= 2


def find_duplicates(rows):
    """Returns: unique_rows (list, each possibly carrying also_listed_as),
    dropped_placeholders (list of changelog entries),
    unmatched_flags (list of changelog entries)."""
    by_body = defaultdict(list)
    for i, r in enumerate(rows):
        by_body[norm_body(r["conducting_body"])].append((i, r))

    fold_into = {}          # row index -> canonical row index
    canonical_tags = defaultdict(list)  # canonical row index -> [also_listed_as entries]
    dropped = []
    unmatched = []
    consumed = set()

    for body_key, entries in by_body.items():
        if body_key in EXCLUDE_BODIES:
            continue  # Category E -- confirmed name collision, not a real duplicate
        levels_present = {r["level"] for _, r in entries}
        if len(levels_present) <= 1:
            continue  # nothing to dedupe within a single-level body

        body_display = entries[0][1]["conducting_body"]
        body_tok = tokens(body_display)
        central_entries = [(i, r) for i, r in entries if r["level"] == "central"]
        other_entries = [(i, r) for i, r in entries if r["level"] != "central"]
        is_known_central_org = any(co in body_key for co in KNOWN_CENTRAL_ORGS)

        # -- Placeholder rows first (generic central rows that just restate
        # the org name, superseded by several specific rows -- these can't
        # be folded 1:1 onto any single row so they're dropped outright).
        for ci, crow in central_entries:
            peers = other_entries + [(i, r) for i, r in central_entries if i != ci]
            if is_placeholder_row(crow, body_tok, peers):
                dropped.append({
                    "conducting_body": body_display,
                    "dropped_row": {"level": crow["level"], "state": crow["state"], "exam_name": crow["exam_name"]},
                    "reason": f"placeholder -- restates org name/acronym, superseded by {len(other_entries)} more specific entries",
                })
                consumed.add(ci)

        # -- Pass 1: cluster ALL entries in this body (any level, any
        # count) that are the same real exam under different wording --
        # near-exact string match or a curated phrase synonym (e.g. "Dak
        # Sevak" / "GDS" / "Gramin Dak Sevak"). Union-Find so it also
        # handles fan-in: one exam repeated across several states/UTs all
        # collapse into a single cluster even though each pairwise wording
        # differs slightly.
        # NOTE: deliberately NOT using a fuzzy string-similarity threshold
        # here. Exam names in this domain are short, codified strings where
        # a single differing word is almost always semantically significant
        # ("Constable" vs "Head Constable", "CET Group C" vs "Group D",
        # "TGT" vs "PGT" vs "TET") -- high SequenceMatcher ratio does NOT
        # imply same exam for strings this short. Only exact (post-
        # normalization) equality or an explicitly hand-vetted curated
        # synonym counts as a match; anything else is left alone rather
        # than risk merging two different real exams.
        uf = UnionFind()
        remaining = [(i, r) for i, r in entries if i not in consumed]
        for idx_a in range(len(remaining)):
            ia, ra = remaining[idx_a]
            na = norm(ra["exam_name"])
            if not na:
                continue
            for idx_b in range(idx_a + 1, len(remaining)):
                ib, rb = remaining[idx_b]
                nb = norm(rb["exam_name"])
                if not nb:
                    continue
                if na == nb or phrase_synonym_match(na, nb):
                    uf.union(ia, ib)

        clusters = defaultdict(list)
        for i, r in remaining:
            clusters[uf.find(i)].append((i, r))

        for root, members in clusters.items():
            if len(members) < 2:
                continue
            central_members = [(i, r) for i, r in members if r["level"] == "central"]
            if is_known_central_org and central_members:
                canon_i, canon_r = central_members[0]
            else:
                canon_i, canon_r = max(members, key=lambda ir: len(ir[1]["exam_name"] or ""))
            for i, r in members:
                if i == canon_i:
                    continue
                na, nb = norm(canon_r["exam_name"]), norm(r["exam_name"])
                if na == nb:
                    kind = "exact"
                elif phrase_synonym_match(na, nb):
                    kind = "curated-synonym"
                else:
                    kind = "exact-chain"  # linked transitively through another cluster member
                canonical_tags[canon_i].append({
                    "level": r["level"], "state": r["state"], "exam_name": r["exam_name"], "match_type": kind,
                })
                fold_into[i] = canon_i
                consumed.add(i)
            consumed.add(canon_i)

        # -- Pass 2: generic short post-title token-set equality (Category
        # C -- Police pattern), 1:1 between a remaining central row and a
        # remaining specific state/UT row. Exact SET equality (not
        # containment), so "Constable" != "Head Constable".
        for ci, crow in central_entries:
            if ci in consumed:
                continue
            cn_tok = tokens(crow["exam_name"])
            if not cn_tok:
                continue
            best = None
            for oi, orow in other_entries:
                if oi in consumed:
                    continue
                on_tok = tokens(orow["exam_name"])
                if not on_tok:
                    continue
                strip_words = body_tok | tokens(orow.get("state") or "")
                on_core = stem_core(frozenset(on_tok - strip_words))
                cn_core = stem_core(frozenset(cn_tok - strip_words))
                if len(cn_tok) <= 3 and bool(cn_core) and cn_core == on_core:
                    best = (oi, orow)
                    break
            if best:
                oi, orow = best
                canon = ci if is_known_central_org else oi
                folded = oi if canon == ci else ci
                folded_row = rows[folded]
                canonical_tags[canon].append({
                    "level": folded_row["level"], "state": folded_row["state"],
                    "exam_name": folded_row["exam_name"], "match_type": "generic-term",
                })
                fold_into[folded] = canon
                consumed.add(ci)
                consumed.add(oi)

        # Anything left over in central_entries that looks like a generic
        # Police-style term but found no match -- flag, don't drop silently.
        for ci, crow in central_entries:
            if ci in consumed:
                continue
            cn_tok = tokens(crow["exam_name"])
            if 0 < len(cn_tok) <= 3 and other_entries:
                unmatched.append({
                    "conducting_body": body_display,
                    "row": {"level": crow["level"], "state": crow["state"], "exam_name": crow["exam_name"]},
                    "reason": "short/generic exam name, no matching state-level entry found -- left as its own row",
                })

    unique_rows = []
    for i, r in enumerate(rows):
        if i in fold_into:
            continue
        if any(d["dropped_row"]["exam_name"] == r["exam_name"] and d["dropped_row"]["level"] == r["level"]
               and d["dropped_row"]["state"] == r["state"] and d["conducting_body"] == r["conducting_body"]
               for d in dropped):
            continue
        out_row = dict(r)
        if canonical_tags.get(i):
            out_row["also_listed_as"] = canonical_tags[i]
        unique_rows.append(out_row)

    return unique_rows, dropped, unmatched


def write_changelog(alias_map, alias_applied, alias_flagged, unique_rows, dropped, unmatched, source_count):
    lines = []
    lines.append("# Exam list dedupe changelog\n")
    lines.append(f"Source: `master_exam_list.json`, {source_count} rows.\n")
    tagged = sum(1 for r in unique_rows if r.get("also_listed_as"))
    folded_total = sum(len(r["also_listed_as"]) for r in unique_rows if r.get("also_listed_as"))
    lines.append(
        f"Result: {len(unique_rows)} unique rows "
        f"({tagged} carry an `also_listed_as` tag, {folded_total} rows folded in total, "
        f"{len(dropped)} placeholder rows dropped).\n"
    )

    lines.append("\n## Alias merges applied\n")
    if alias_applied:
        for (orig, canon), count in sorted(alias_applied.items()):
            lines.append(f"- `{orig}` -> `{canon}` ({count} rows)")
    else:
        lines.append("- none")

    lines.append("\n## Alias candidates flagged (not auto-merged)\n")
    if alias_flagged:
        for f in alias_flagged:
            lines.append(f"- `{f['acronym']}`: {f['reason']} -- candidates: {f['candidates']}")
    else:
        lines.append("- none")

    lines.append("\n## Rows folded into a canonical row\n")
    for r in unique_rows:
        if not r.get("also_listed_as"):
            continue
        lines.append(f"\n**{r['conducting_body']}** -- canonical: [{r['level']}] {r['exam_name']!r}")
        for tag in r["also_listed_as"]:
            lines.append(f"  - also listed as [{tag['level']}/{tag['state']}] {tag['exam_name']!r} ({tag['match_type']})")

    lines.append("\n## Placeholder rows dropped (no specific exam, superseded by detailed entries)\n")
    if dropped:
        for d in dropped:
            lines.append(f"- **{d['conducting_body']}** [{d['dropped_row']['level']}] {d['dropped_row']['exam_name']!r} -- {d['reason']}")
    else:
        lines.append("- none")

    lines.append("\n## Flagged, left as their own row (no confident match found)\n")
    if unmatched:
        for u in unmatched:
            lines.append(f"- **{u['conducting_body']}** [{u['row']['level']}/{u['row']['state']}] {u['row']['exam_name']!r} -- {u['reason']}")
    else:
        lines.append("- none")

    with open(OUT_CHANGELOG, "w", encoding="utf-8") as f:
        f.write("\n".join(lines) + "\n")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--execute", action="store_true")
    args = ap.parse_args()

    rows = load()
    print(f"Loaded {len(rows)} rows from {SOURCE}")

    alias_map, alias_flagged = detect_aliases(rows)
    rows, alias_applied = apply_aliases(rows, alias_map)
    print(f"Alias merges: {len(alias_applied)} body-name pairs merged, {len(alias_flagged)} ambiguous candidates flagged")

    unique_rows, dropped, unmatched = find_duplicates(rows)

    tagged = sum(1 for r in unique_rows if r.get("also_listed_as"))
    folded_total = sum(len(r["also_listed_as"]) for r in unique_rows if r.get("also_listed_as"))
    print(f"Unique rows: {len(unique_rows)} (source {len(rows)})")
    print(f"  {tagged} canonical rows carry also_listed_as tags, {folded_total} rows folded in")
    print(f"  {len(dropped)} placeholder rows dropped")
    print(f"  {len(unmatched)} generic rows flagged, left standalone (no match found)")

    write_changelog(alias_map, alias_applied, alias_flagged, unique_rows, dropped, unmatched, len(rows))
    print(f"\nChangelog written to {OUT_CHANGELOG}")

    if args.execute:
        with open(OUT_JSON, "w", encoding="utf-8") as f:
            json.dump(unique_rows, f, indent=1, ensure_ascii=False)
        print(f"master_exam_list_unique.json written to {OUT_JSON} ({len(unique_rows)} rows)")
    else:
        print("\nDry run only -- rerun with --execute to write master_exam_list_unique.json")


if __name__ == "__main__":
    main()
