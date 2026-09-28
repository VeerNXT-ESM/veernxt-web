"""
Send every profile in a Profiler_Test_Input workbook to the profiler endpoint and record what it
recommends. READ-ONLY: the request carries no Authorization header, so /api/profile/recommend
never writes a user record or awards points (its only database access is reading the exams table).

Needs Python 3 and openpyxl (pip install openpyxl). No other dependencies.

Examples:
  python scripts/testdata/run_profiler_from_xlsx.py --file docs/Profiler_Test_Input_2026-09-28.xlsx \
      --url https://www.veernxt.in/api/profile/recommend
  (use the www host: veernxt.in answers with a 307 redirect, which a POST does not follow)
  python scripts/testdata/run_profiler_from_xlsx.py --file <xlsx> --url http://localhost:3000/api/profile/recommend \
      --sheet "Profiles - live form only" --limit 5

Output: a CSV next to the workbook (or --out) with, per person, the eligible-exam count, the overall
score and the top N recommendations as "Exam [level, state] score".
"""
import argparse
import csv
import json
import sys
import time
import urllib.error
import urllib.request

import openpyxl

ARRAYS = {"militaryCourses", "specificSkills", "careerPreferences", "sewaNidhiInterests"}
BOOLS = {"completedDuringService", "mathInClass12", "colourBlind", "consent"}
NUMBERS = {"heightCm", "weightKg", "chestCm", "chestExpansion"}
SCHEMA_FIELDS = [
    "fullName", "dateOfBirth", "category", "disabilityStatus", "disabilityType", "disabilityPercentage",
    "stateOfDomicile", "district", "maritalStatus", "email", "mobile", "serviceBranch", "armCorpsTrade",
    "roleAppointment", "totalServiceDuration", "militaryCourses", "characterOnDischarge", "specificSkills",
    "highestQualification", "completedDuringService", "nccCertification", "sportsAchievement", "mathInClass12",
    "heightCm", "weightKg", "chestCm", "chestExpansion", "vision", "colourBlind", "medicalCategory",
    "physicalProficiency", "careerPreferences", "relocation", "englishComfort", "sewaNidhiInterests", "consent",
]


def to_profile(header, row):
    """Turn one worksheet row into the JSON body the profiler expects. Blank cells are omitted."""
    out = {}
    for name, v in zip(header, row):
        if name not in SCHEMA_FIELDS or v is None or (isinstance(v, str) and not v.strip()):
            continue
        if name in ARRAYS:
            out[name] = [x.strip() for x in str(v).split("|") if x.strip()]
        elif name in BOOLS:
            out[name] = v if isinstance(v, bool) else str(v).strip().upper() == "TRUE"
        elif name in NUMBERS:
            out[name] = float(v) if "." in str(v) else int(v)
        elif hasattr(v, "date"):  # Excel turned it into a date; send ISO
            out[name] = v.date().isoformat()
        else:
            out[name] = str(v).strip() if name in ("mobile", "dateOfBirth") else v
    return out


def post(url, body, timeout):
    req = urllib.request.Request(url, data=json.dumps(body).encode("utf-8"), method="POST",
                                 headers={"Content-Type": "application/json"})  # deliberately NO Authorization header
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return r.status, json.loads(r.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        try:
            return e.code, json.loads(e.read().decode("utf-8"))
        except Exception:
            return e.code, {"error": str(e)}
    except Exception as e:  # network / timeout
        return 0, {"error": str(e)}


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--file", required=True, help="Profiler_Test_Input workbook")
    ap.add_argument("--url", required=True, help="full URL of /api/profile/recommend")
    ap.add_argument("--sheet", default="Profiles - full survey data")
    ap.add_argument("--top", type=int, default=10, help="recommendations to keep per person (1-50)")
    ap.add_argument("--limit", type=int, default=0, help="only the first N people (smoke test)")
    ap.add_argument("--delay", type=float, default=0.0, help="seconds between requests")
    ap.add_argument("--timeout", type=float, default=60.0)
    ap.add_argument("--out", default="", help="results CSV path (default: <workbook>_results.csv)")
    a = ap.parse_args()

    ws = openpyxl.load_workbook(a.file, read_only=True, data_only=True)[a.sheet]
    rows = list(ws.iter_rows(values_only=True))
    header = [str(h) if h is not None else "" for h in rows[0]]
    pid_col = header.index("persona_id") if "persona_id" in header else None
    data = [r for r in rows[1:] if any(c is not None for c in r)]
    if a.limit:
        data = data[: a.limit]
    out_path = a.out or a.file.rsplit(".", 1)[0] + "_results.csv"
    url = a.url + ("&" if "?" in a.url else "?") + f"topN={max(1, min(a.top, 50))}"

    ok = failed = 0
    with open(out_path, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["persona_id", "sheet", "http", "error", "total_eligible", "total_rejected", "overall_match_score"]
                   + [f"rec_{i}" for i in range(1, a.top + 1)])
        for r in data:
            pid = r[pid_col] if pid_col is not None else ""
            status, res = post(url, to_profile(header, r), a.timeout)
            if status == 200 and res.get("ok"):
                ok += 1
                recs = [f"{x['exam_name']} [{x.get('level') or ''}{', ' + x['state_ut'] if x.get('state_ut') else ''}] {x['score']}"
                        for x in res.get("recommendations", [])]
                w.writerow([pid, a.sheet, status, "", res.get("totalEligible"), res.get("totalRejected"),
                            round(res.get("summary", {}).get("overall_match_score", 0), 1)] + recs)
            else:
                failed += 1
                err = json.dumps(res.get("errors") or res.get("error") or res)[:300]
                w.writerow([pid, a.sheet, status, err, "", "", ""])
                print(f"  {pid}: HTTP {status} {err}", file=sys.stderr)
            if a.delay:
                time.sleep(a.delay)
    print(f"{ok} ok, {failed} failed of {len(data)} -> {out_path}")
    sys.exit(1 if failed else 0)


if __name__ == "__main__":
    main()
