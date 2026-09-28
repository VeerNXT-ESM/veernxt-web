"""
Turn test-data/baseline/{results,jobs_audit}.json into a review workbook for the
Colonel and the Content Head:  docs/Profiling_Baseline_<date>.xlsx  (untracked, like other docs/*.xlsx)

Usage:  python scripts/testdata/make_baseline_xlsx.py
"""
import collections
import datetime as dt
import json
import pathlib
import statistics as st

from openpyxl import Workbook
from openpyxl.styles import Alignment, Font, PatternFill
from openpyxl.utils import get_column_letter
from openpyxl.worksheet.datavalidation import DataValidation

ROOT = pathlib.Path(__file__).resolve().parents[2]
BASE = ROOT / "test-data" / "baseline"
res = json.loads((BASE / "results.json").read_text(encoding="utf-8"))
jobs = json.loads((BASE / "jobs_audit.json").read_text(encoding="utf-8"))
meta, R = res["meta"], res["results"]
OUT = ROOT / "docs" / f"Profiling_Baseline_{dt.date.today().isoformat()}.xlsx"

HEAD = PatternFill("solid", fgColor="1F3A2E")
PERSONA = PatternFill("solid", fgColor="E8EFE9")
INPUT = PatternFill("solid", fgColor="FFF6CC")
BAD = PatternFill("solid", fgColor="FBE3E0")
WRAP = Alignment(wrap_text=True, vertical="top")


def sheet(wb, title, header, rows, widths, freeze="A2"):
    ws = wb.create_sheet(title)
    ws.append(header)
    for c in ws[1]:
        c.font, c.fill, c.alignment = Font(bold=True, color="FFFFFF"), HEAD, Alignment(wrap_text=True, vertical="center")
    for r in rows:
        ws.append(r)
    for i, w in enumerate(widths, 1):
        ws.column_dimensions[get_column_letter(i)].width = w
    for row in ws.iter_rows(min_row=2):
        for c in row:
            c.alignment = WRAP
    ws.freeze_panes = freeze
    return ws


def norm(s):
    return (s or "").lower().replace(" and ", " & ").strip()


def blurb(p):
    pref = ", ".join(p["preferences"])
    bits = [f"{p['branch']} - {p['arm']} / {p['role']}", p["qualification"], p["category"], p["state"],
            f"prefers: {pref}", f"relocate: {p['relocation']}"]
    if p["ncc"] != "None": bits.append(f"NCC {p['ncc']}")
    if p["sports"] != "None": bits.append(f"sports: {p['sports']}")
    if p["medical"] != "SHAPE-1": bits.append(f"medical {p['medical']}")
    if p["proficiency"] == "Satisfactory": bits.append("fitness: Satisfactory")
    if p["disability"] == "Yes": bits.append("disability")
    bits.append(f"English: {p['english']}")
    return " | ".join(bits)


S = [r for r in R if r["variant"] == "profile_survey" and r["source"] == "survey"]
A = [r for r in R if r["variant"] == "profile_app" and r["source"] == "survey"]
ALL_SV = [r for r in R if r["variant"] == "profile_survey"]
by = {}
for r in R:
    by.setdefault(r["id"], {})[r["variant"]] = r


def pct(n, d):
    return f"{100 * n / d:.0f}%" if d else "-"


def slots(rs):
    return sum(len(r["top10"]) for r in rs)


# ------------------------------------------------------------------ headline numbers
c = collections.Counter()
names = {}
for r in S:
    for t in r["top10"]:
        c[t["exam_id"]] += 1
        names[t["exam_id"]] = t
n_slots = slots(S)
gen = {"ex_servicemen_quota", "priority_track", "category_reservation", "character_general", "character_required_track",
       "english", "full_term", "qualification_exact", "qualification_over", "sports_quota", "ncc", "physical_fit", "math"}
generic_only = sum(1 for r in S for t in r["top10"] if set(t["breakdown"]) <= gen)
out_state = tot_home = aff = out_ut = 0
for r in S:
    if r["profile"]["relocation"] != "Home State":
        continue
    home = norm(r["profile"]["state"])
    o = [t for t in r["top10"] if t["state"] and norm(t["state"]) != home]
    out_state += len(o); tot_home += len(r["top10"]); aff += 1 if o else 0
    out_ut += sum(1 for t in o if t["level"] == "ut")
state_only = [r for r in S if set(r["profile"]["preferences"]) == {"State Government"}]
central_in_state_only = sum(1 for r in state_only for t in r["top10"] if t["level"] == "central")
hp = [r for r in S if r["metrics"]["homeStatePoliceInPool"]]
sig = collections.Counter(tuple(t["exam_id"] for t in r["top10"]) for r in S)
overlap = [len({t["exam_id"] for t in v["profile_survey"]["top10"]} & {t["exam_id"] for t in v["profile_app"]["top10"]}) for v in by.values()]
viol = sum(1 for r in R if r["metrics"]["violations"])
top_names = collections.Counter(t["exam"] for r in S for t in r["top10"]).most_common(2)
lta = jobs["levelTagAccuracy"]
tagA = jobs["tagAudit"]

summary = [
    ("HOW TO READ", "", "Baseline = what the profiling engine and Job Board do TODAY, before any fix. 145 test personas (112 from the survey, 33 hand-built edge cases), each run in two ways: 'survey' (everything the survey knows) and 'app' (only what the live form actually asks).", ""),
    ("Run health", f"{meta['calls']} runs, {meta['httpErrors']} errors; same input gave same output every time", "The engine is stable and deterministic. Problems below are about matching quality, not crashes.", ""),
    ("EXAMS", "", "", ""),
    ("Hard rules broken in the top 10", f"{viol} runs", "No recommended exam breaks a qualification, home-state or physical rule THAT THE DATA CAN CHECK. This is weaker than it sounds - see next row.", ""),
    ("...but the rules often can't be checked", f"{pct(sum(r['metrics']['qualUnverifiable'] for r in S), n_slots)} of recommended exams have no minimum qualification on record ({meta['poolMissingMinQualification']} of {meta['examPool']} exams overall)", "For these the engine cannot tell a Class 10 soldier that an exam needs a degree.", "Content team: min qualification per exam"),
    ("Exam categories the engine understands", f"{meta['poolWithRecognisedTrack']} of {meta['examPool']} exams ({pct(meta['poolWithRecognisedTrack'], meta['examPool'])})", "The catalogue uses ~170 free-text career tracks; the engine only recognises 36 codes. For the rest, preference and trade bonuses never fire. No exam at all carries POLICE_CAPF / RAILWAYS / PSU - the codes the trade table maps soldiers to.", ""),
    ("Top-10 places earned only by generic bonuses", f"{generic_only} of {n_slots} ({pct(generic_only, n_slots)})", "These exams scored on things everyone gets (ex-servicemen quota, character, category) - no preference, trade or home-state match.", ""),
    ("Same two exams for almost everyone", f"'{top_names[0][0]}' in {top_names[0][1]} of {len(S)} profiles; '{top_names[1][0]}' in {top_names[1][1]} of {len(S)}", "JKSSB is a Jammu & Kashmir body, but it is catalogued as Central level, tracked as TEACHING, with no state - so it is offered to soldiers from UP, Bengal and Assam.", "Content team: fix JKSSB record"),
    ("Exams from another state/UT shown to 'home state only' people", f"{out_state} of {tot_home} places ({pct(out_state, tot_home)}), {aff} people affected; {out_ut} are Union Territory exams", "Lakshadweep, Puducherry, Andaman and Ladakh postal (GDS) exams keep appearing for people from other states. UT exams are not marked as domicile-restricted, so the home-state rule skips them.", "Colonel: should a UP soldier be shown a Lakshadweep GDS post?"),
    ("'State Government' preference only weakly applied", f"{len(state_only)} people chose State only; {pct(central_in_state_only, len(state_only) * 10)} of their top 10 are Central exams", "The level (Central/State/UT) is never matched directly - only a flat preference bonus that Central exams can also earn.", ""),
    ("Home-state police exam reached top 10", f"{sum(1 for r in hp if r['metrics']['homeStatePoliceInTop10'])} of {len(hp)} people (survey run)", "Most respondents are General Duty / Armoured Corps soldiers preferring State Police-type jobs. Their own state's police recruitment should be near the top.", "Colonel: sanity check"),
    ("Variety across the cohort", f"{len(c)} distinct exams fill {n_slots} places; {sum(1 for v in sig.values() if v > 1)} groups of people got an IDENTICAL top 10 (largest group: {max(sig.values())} people)", "Very different people receive nearly the same list.", ""),
    ("What the live form loses", f"Top 10 overlap between 'survey' and 'app' runs averages {st.mean(overlap):.1f}/10; identical for only {sum(1 for o in overlap if o == 10)} of {len(overlap)} people", "The form never asks skills, sports, maths, English, relocation or medical category, and its preference options barely score. Preference points reach " + f"{pct(sum(r['metrics']['withPrefPoints'] for r in S), n_slots)} of places in the survey run but only {pct(sum(r['metrics']['withPrefPoints'] for r in A), slots(A))} in the app run.", ""),
    ("Age", "not tested", "The exam catalogue holds no age limits, and the engine does not check age. A 45-year-old and an 18-year-old see the same exam pool.", "Needs age limits per exam"),
    ("JOBS", "", "", ""),
    ("'Recommended for You' tab", f"{jobs['recommendedTab']['v2Matches']} of {jobs['jobsV2']} jobs, identical for every user", "It is a hardcoded keyword filter (developer, graphic, game, designer, artist, video, intern, 'ai'...) that ignores the profile. 'ai' also matches Railway, Admit Card, Result, Assistant. If nothing matched it would show all jobs.", ""),
    ("'New Jobs V2' vs legacy jobs", f"{jobs['v2UrlsAlsoInLegacy']} of {jobs['jobsV2']} V2 jobs are the same URLs as legacy jobs", "V2 is the same postings with tags and an AI write-up added, not new postings.", ""),
    ("Rows that are not jobs", f"{jobs['nonJobRows']['count']} of {jobs['jobsV2']} ({pct(jobs['nonJobRows']['count'], jobs['jobsV2'])}): admit cards, results, answer keys, scholarships, admissions", "They would be recommended as jobs.", ""),
    ("Tag 'postal_job'", f"{tagA['postal_job']['tagged']} jobs tagged; only {tagA['postal_job']['evidenceInTitleOrAi']} mention anything postal", "Applied almost everywhere - useless for matching. Other tags are unsupported by the job's own text 35-83% of the time (approximate: see method).", "Souvik: how are tags generated?"),
    ("Central vs State tag", f"Of {lta['titlesClearlyCentral']} jobs from clearly central organisations (Railways, SBI, IBPS, SSC, RBI...), {lta['ofWhichTaggedState']} are tagged STATE. Of {lta['titlesClearlyState']} clearly state ones, {lta['ofWhichTaggedCentral_']} are tagged CENTRAL", "The Central/State split is right roughly 60-70% of the time; there is no UT value.", ""),
    ("What tags/data DO give us", "Sector (bank, railway, police...), qualification band (10th/12th/graduate/diploma/ITI), a Central/State flag, AI description with eligibility prose", "Usable as hints.", ""),
    ("What is missing for matching", f"State/UT (only {jobs['structuredFields']['withStateNameInTitle']} titles even name one), canonical exam category (0), linked exam (0 of {jobs['jobsV2']}), conducting body column (does not exist), age range ({jobs['structuredFields']['withAgeRange']}), qualification field ({jobs['structuredFields']['withQualificationInRawJson']})", "The AI description contains age/qualification/dates in prose, so these could be extracted - but nothing extracts them today.", ""),
]

wb = Workbook()
wb.remove(wb.active)
ws = sheet(wb, "Summary", ["Finding", "Result (baseline)", "What it means", "Question / owner"], summary, [38, 62, 90, 34])
for row in ws.iter_rows(min_row=2):
    if row[0].value in ("EXAMS", "JOBS", "HOW TO READ"):
        for cell in row:
            cell.font, cell.fill = Font(bold=True), PERSONA

# ------------------------------------------------------------------ reviewer sheet
def pick(rs, used, pred):
    for r in rs:
        if r["id"] not in used and pred(r["profile"], r):
            used.add(r["id"]); return r
    return None


used = set()
crit = [
    lambda p, r: p["qualification"] == "Class 12" and p["state"] == "Uttar Pradesh" and p["preferences"] == ["State Government"],
    lambda p, r: p["qualification"] == "Class 12" and p["state"] == "West Bengal" and "State Government" in p["preferences"],
    lambda p, r: p["qualification"] == "Graduate" and p["state"] == "Bihar",
    lambda p, r: p["state"] == "Rajasthan",
    lambda p, r: p["state"] == "Madhya Pradesh",
    lambda p, r: p["state"] == "Assam",
    lambda p, r: p["qualification"] == "Class 10",
    lambda p, r: p["relocation"] == "Anywhere in India" and "Central Government" in p["preferences"],
    lambda p, r: p["ncc"] == "C Certificate",
    lambda p, r: p["sports"] == "National",
    lambda p, r: "ELECTRICAL" in p["arm"],
    lambda p, r: p["arm"] in ("Chef", "Barber"),
    lambda p, r: p["medical"] != "SHAPE-1",
    lambda p, r: p["state"] == "Jammu & Kashmir",
    lambda p, r: p["english"] == "Fluent",
    lambda p, r: p["category"] == "ST",
    lambda p, r: p["category"] == "SC",
    lambda p, r: p["role"] == "Driver",
    lambda p, r: p["arm"] == "Unspecified",
    lambda p, r: p["qualification"] == "Graduate" and p["state"] == "Uttar Pradesh",
]
review = [pick(S, used, f) for f in crit]
for slug in ("class10_only", "postgrad_delhi", "navy_electrical", "iaf_technical", "shape2_graduate", "small_state_sikkim", "disability_locomotor", "maxed_profile"):
    review.append(next((r for r in ALL_SV if r.get("slug") == slug), None))
review = [r for r in review if r]

ws = wb.create_sheet("Review - Top 10 per person")
hdr = ["Persona", "Rank", "Exam", "Conducting body", "Level", "State / UT", "Engine track", "Score", "Reviewer: right for this person? (Y / N / Partly)", "Reviewer comment / what should it be?"]
ws.append(hdr)
for cell in ws[1]:
    cell.font, cell.fill, cell.alignment = Font(bold=True, color="FFFFFF"), HEAD, Alignment(wrap_text=True, vertical="center")
dv = DataValidation(type="list", formula1='"Y,N,Partly"', allow_blank=True)
ws.add_data_validation(dv)
for r in review:
    ws.append([f"{r['id']}" + (f"  ({r['purpose']})" if r.get("purpose") else ""), "", blurb(r["profile"])])
    row = ws.max_row
    ws.merge_cells(start_row=row, start_column=3, end_row=row, end_column=8)
    ws.append(["", "", "OVERALL: are these 10 sensible for this person? What is missing?", "", "", "", "", "", "", ""])
    orow = ws.max_row
    for cell in ws[row]:
        cell.fill, cell.font, cell.alignment = PERSONA, Font(bold=True), WRAP
    for col in (9, 10):
        ws.cell(orow, col).fill = INPUT
    ws.cell(orow, 3).font = Font(italic=True)
    dv.add(ws.cell(orow, 9))
    for t in r["top10"]:
        ws.append(["", t["rank"], t["exam"], t["body"], t["level"], t["state"] or "", t["track"], t["score"], "", ""])
        for col in (9, 10):
            ws.cell(ws.max_row, col).fill = INPUT
        dv.add(ws.cell(ws.max_row, 9))
for i, w in enumerate([26, 6, 46, 30, 9, 22, 26, 7, 22, 50], 1):
    ws.column_dimensions[get_column_letter(i)].width = w
for row in ws.iter_rows(min_row=2):
    for cell in row:
        cell.alignment = WRAP
ws.freeze_panes = "A2"

# ------------------------------------------------------------------ all personas
rows = []
for r in R:
    m = r["metrics"]
    rows.append([r["id"], "survey" if r["variant"] == "profile_survey" else "app", r["source"], r.get("purpose") or "", blurb(r["profile"]),
                 m["totalEligible"], m["totalRejected"], m["recCount"], "; ".join(m["violations"]) or "", m["qualUnverifiable"],
                 m["recognisedTrack"], m["withPrefPoints"], m["withTradeMatch"], m["withDomicileHome"], m["atScoreCap"], m["distinctScores"],
                 ", ".join(f"{k}:{v}" for k, v in m["levelMix"].items()), ", ".join(m["engineStrongTracks"]), m["strongTrackExamsInPool"],
                 m["homeStateExamsInPool"], m["homeStatePoliceInPool"], m["homeStatePoliceInTop10"], m["bestHomeStatePoliceRank"] or "", "; ".join(m["skillGaps"]),
                 " | ".join(f"{t['rank']}. {t['exam']} ({t['level']}{', ' + t['state'] if t['state'] else ''})" for t in r["top10"])])
sheet(wb, "All personas", ["ID", "Run", "Source", "Purpose (synthetic)", "Profile", "Eligible exams", "Rejected", "Recs", "Rule violations", "Recs w/o min-qualification data",
                           "Recs w/ track engine knows (of 10)", "Recs w/ preference points", "Recs w/ trade match", "Recs w/ home-state bonus", "Recs at score cap 100", "Distinct scores (of 10)",
                           "Level mix", "Engine's 'strong' tracks for this trade", "Exams in catalogue on those tracks", "Exams in home state", "Home-state police exams", "...in top 10", "Best rank of one (top 50)",
                           "Skill gaps shown", "Top 10"], rows,
      [7, 8, 9, 32, 70, 9, 9, 6, 30, 12, 12, 12, 10, 10, 10, 10, 22, 30, 12, 10, 10, 8, 10, 40, 120], freeze="B2")

# ------------------------------------------------------------------ cohort top exams
rows = [[names[k]["exam"], names[k]["body"], names[k]["level"], names[k]["state"] or "", names[k]["track"], v, pct(v, len(S))] for k, v in c.most_common(40)]
sheet(wb, "Cohort top exams", ["Exam", "Conducting body", "Level", "State / UT", "Engine track", "Profiles with it in top 10", "% of 112 survey profiles"], rows, [50, 34, 9, 26, 28, 14, 12])

# ------------------------------------------------------------------ engine vs data
rows = [[t, n, "yes" if t in {"TEACHING", "NURSING", "BANKING", "ADMINISTRATIVE", "JUDICIARY", "ENGINEERING", "SSC", "AGRICULTURE", "HEALTH", "TRANSPORT", "ENVIRONMENT", "DEFENCE", "FOREST", "MUNICIPAL", "METRO", "TOURISM", "REVENUE", "EXCISE", "POLICE_CAPF", "RAILWAYS", "PSU"} else "no"] for t, n in meta["poolTrackCounts"]]
ws = sheet(wb, "Catalogue vs engine", ["career_track value in exams table", "Exams", "Engine recognises it?"], rows, [46, 10, 18])
ws.cell(1, 5).value = "Data gaps in the exams table"
for i, (k, v) in enumerate([("Exams total", meta["examPool"]), ("Missing min_qualification", meta["poolMissingMinQualification"]), ("Missing physical_required flag", meta["poolMissingPhysicalFlag"]),
                            ("career_track recognised by engine", meta["poolWithRecognisedTrack"]), ("Engine track vocabulary size", meta["engineVocabSize"])], start=2):
    ws.cell(i, 5).value, ws.cell(i, 6).value = k, v
ws.column_dimensions["E"].width, ws.column_dimensions["F"].width = 38, 10

# ------------------------------------------------------------------ form vs survey
rows = []
for pid, v in by.items():
    if "profile_app" not in v or "profile_survey" not in v:
        continue
    a, b = v["profile_survey"], v["profile_app"]
    sa, sb = [t["exam_id"] for t in a["top10"]], [t["exam_id"] for t in b["top10"]]
    only_s = [t["exam"] for t in a["top10"] if t["exam_id"] not in sb][:3]
    only_a = [t["exam"] for t in b["top10"] if t["exam_id"] not in sa][:3]
    rows.append([pid, a["source"], len(set(sa) & set(sb)), a["metrics"]["withPrefPoints"], b["metrics"]["withPrefPoints"], ", ".join(a["profile"]["preferences"]), ", ".join(b["profile"]["preferences"]), "; ".join(only_s), "; ".join(only_a)])
sheet(wb, "Form vs survey", ["ID", "Source", "Top 10 overlap (of 10)", "Pref points - survey run", "Pref points - app run", "Preferences (survey)", "Preferences (form codes)", "Only in survey run (first 3)", "Only in app run (first 3)"], rows, [7, 9, 10, 10, 10, 34, 40, 60, 60])

# ------------------------------------------------------------------ jobs
rows = [[t, a["tagged"], a["evidenceInTitleOrAi"], a["evidenceInRawPageText"], f"{a['unsupportedPct']}%"] for t, a in sorted(tagA.items(), key=lambda x: -x[1]["tagged"])]
ws = sheet(wb, "Jobs - tag audit", ["Tag (jobs_v2)", "Jobs tagged", "...with evidence in title / AI description", "...with evidence anywhere in scraped page text", "Unsupported (upper bound)"], rows, [22, 12, 24, 26, 18])
r0 = len(rows) + 3
ws.cell(r0, 1).value = "Method: crude keyword tests per tag on the job's own title + AI description, so 'unsupported' overestimates; postal_job is unsupported even against the whole page text."
ws.cell(r0 + 2, 1).value = "'Recommended for You' sample (what every user gets):"
for i, t in enumerate(jobs["recommendedTab"]["v2Sample"]):
    ws.cell(r0 + 3 + i, 1).value = t
r1 = r0 + 3 + len(jobs["recommendedTab"]["v2Sample"]) + 1
ws.cell(r1, 1).value = "Rows that are not jobs (sample):"
for i, t in enumerate(jobs["nonJobRows"]["sample"]):
    ws.cell(r1 + 1 + i, 1).value = t
r2 = r1 + len(jobs["nonJobRows"]["sample"]) + 2
ws.cell(r2, 1).value = "Central organisations tagged STATE (sample):"
for i, t in enumerate(lta["exampleCentralTaggedState"]):
    ws.cell(r2 + 1 + i, 1).value = t

# ------------------------------------------------------------------ method
notes = [
    ("What was run", "The real /api/profile/recommend handler code, called directly with no login token (so nothing is written to any user record and no points are awarded). Exams read from the live exams table."),
    ("Personas", "112 usable survey rows (2 rejected: a test row and a bad DOB) + 33 hand-built edge cases. Names/phones/emails/DOBs replaced by synthetic values. See test-data/personas/REPORT.md."),
    ("Assumptions about survey people", "Service length assumed 4 years (Agniveer); maths-in-Class-12 assumed No; weight not collected; 'Good' medical category assumed SHAPE-1; F(2)p mapped to SHAPE-2."),
    ("'App' run", "Uses only what the live form asks. Career preferences are the survey's Central/State/Private choices translated to the form's track codes by an assumed table (BUCKET_TO_FORM_CODES in build_personas.py)."),
    ("Rule checks", "Qualification, home-state and physical rules are checked only where the exam has the data; the '...w/o min-qualification data' column shows how often that is missing."),
    ("Jobs audit", "Keyword evidence tests are approximate. The tag generator is not in this repository, so tags were measured, not traced."),
    ("Not covered yet", "Age limits, actual job-to-exam matching (no such feature exists), payment/tier behaviour, saving to user_profiles."),
    ("Regenerate", "python scripts/testdata/build_personas.py; node scripts/testdata/run_baseline.mjs; node scripts/testdata/audit_jobs_tags.mjs; python scripts/testdata/make_baseline_xlsx.py"),
]
sheet(wb, "Method & caveats", ["Topic", "Detail"], notes, [30, 140])

wb.save(OUT)
print("wrote", OUT)
