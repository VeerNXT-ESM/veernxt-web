"""
Build anonymised test personas for the profiling engine (Phase 1).

Reads the real survey export (docs/Contact Information (Responses).xlsx) and writes to
test-data/personas/ (gitignored):

  survey_personas.json     one entry per usable survey row
  synthetic_personas.json  hand-designed edge cases the survey doesn't cover
  rejects.json             rows dropped, with reason (row number only -- no PII)
  REPORT.md                data-quality + cohort summary

Every persona carries TWO profiles:
  profile_survey  everything the survey knows, mapped to the engine's vocabulary
  profile_app     only what the LIVE form (src/pages/Profiling.jsx) can send -- it never asks for
                  skills, courses, sports, maths, English, relocation, medical category or
                  proficiency, so those go to the engine as defaults.
Comparing the two in Phase 2 measures what the form's omissions cost.

No name, phone, email or DOB from the survey is copied. DOBs are regenerated to preserve age only.

Usage:  python scripts/testdata/build_personas.py
"""
import collections
import datetime as dt
import json
import pathlib
import random
import re
import statistics

import openpyxl

ROOT = pathlib.Path(__file__).resolve().parents[2]
SRC = ROOT / "docs" / "Contact Information (Responses).xlsx"
OUT = ROOT / "test-data" / "personas"
TODAY = dt.date.today()
rng = random.Random(20260928)  # deterministic: same input -> same personas

# --- Vocabulary the live form / engine understand -------------------------------------------
FORM_PREF_CODES = ["POLICE_CAPF", "SSC", "BANKING", "RAILWAYS", "TEACHING", "ENGINEERING", "NURSING"]

# ASSUMPTION (review me): the survey asks Central/State/Private/Entrepreneurship buckets, the form
# asks track codes. There is no exact mapping; this is the closest reading of each bucket's label
# ("Central (CAPF, CDS, SSC, Railways, PSU, Banking)", "State (Police, Forest, Transport, ...)").
BUCKET_TO_FORM_CODES = {
    "Central Government": ["POLICE_CAPF", "SSC", "BANKING", "RAILWAYS"],
    "State Government": ["POLICE_CAPF"],
    "Private Sector": [],
    "Entrepreneurship": [],
}

QUAL_MAP = {
    "matriculation": ("Class 10", False),
    "intermediate": ("Class 12", False),
    "graduation": ("Graduate", False),
    "graduation while in service": ("Graduate", True),
}
SKILL_MAP = {  # survey label -> the key the engine's TRADE_MAP actually contains
    "weapon handling": "Weapons Handling",
    "inventory/ store management": "Inventory/Store Management",
    "technical repair/ maintenance": "Technical Repair/Maintenance",
    "driving": "Driving (LMV/HMV)",
    "office admin/ computer work": "Office Admin/Computer Work",
    "instruction/ training": "Instruction/Training",
    "cooking": "Cooking",
}
NO_COURSE = {"no", "nil", "nill", "none", "non", "nahi", "ni", "on", "-", "etc", "vv", "12th", "bba",
             "military course completed", ""}
SEWA_NIDHI_FORM = []  # form options (Agriculture, Small Business, ...) don't overlap survey options

APP_DEFAULTS = {
    "militaryCourses": [], "specificSkills": [], "completedDuringService": False,
    "sportsAchievement": "None", "mathInClass12": False, "vision": "", "colourBlind": False,
    "medicalCategory": "SHAPE-1", "physicalProficiency": "Good", "relocation": "Home State",
    "englishComfort": "Basic", "sewaNidhiInterests": [],
}

STATES = [
    "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat", "Haryana",
    "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur",
    "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana",
    "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal", "Delhi", "Andaman and Nicobar Islands",
    "Chandigarh", "Dadra & Nagar Haveli and Daman & Diu", "Jammu & Kashmir", "Ladakh", "Lakshadweep", "Puducherry",
]
STATE_LOOKUP = {s.lower(): s for s in STATES}
STATE_LOOKUP.update({"jammu and kashmir": "Jammu & Kashmir", "j&k": "Jammu & Kashmir",
                     "orissa": "Odisha", "new delhi": "Delhi", "nct of delhi": "Delhi"})

ARM_ARMOURED = "ARMOURED CORPS"
ARM_EME = "ELECTRICAL AND MECHANICAL ENGINEERS (EME)"


# --- Cleaning helpers -----------------------------------------------------------------------
def clean(v):
    return re.sub(r"\s+", " ", str(v)).strip() if v is not None else ""


def norm_arm(raw):
    s = clean(raw).lower()
    if any(k in s for k in ("armd", "armo", "armed")):
        return ARM_ARMOURED, ["arm_multi"] if "chef" in s or "/" in s else []
    if s == "eme":
        return ARM_EME, []
    if s in ("chef", "barber"):
        return s.title(), []
    return "Unspecified", ["arm_unresolved"]


ROLE_RULES = [  # (regex, canonical) -- abbreviation expansion only, no semantic remapping
    (r"general duty|^gd\b|\bgd\b", "General Duty"),
    (r"\bdvr\b|driver", "Driver"),
    (r"gunner|gunnet|\bgnr\b", "Gunner"),
    (r"\bopr\b|operator", "Operator"),
    (r"clerk", "Clerk"),
    (r"storekeeper", "Storekeeper"),
    (r"tradesm[ae]n|trademan|\btdn\b", "Tradesman"),
    (r"chef|cook", "Chef"),
    (r"washerman", "Washerman"),
    (r"steward", "Steward"),
    (r"barber|hair ?dresser", "Barber"),
]


def norm_role(raw):
    s = clean(raw).lower()
    if s in ("", "vv"):
        return "Unspecified", ["role_unresolved"]
    hits = []
    for pat, canon in ROLE_RULES:
        m = re.search(pat, s)
        if m and canon not in [h[1] for h in hits]:
            hits.append((m.start(), canon))
    if hits:
        return " / ".join(c for _, c in sorted(hits)), []
    return clean(raw).title(), ["role_kept_verbatim"]


def split_prefs(raw):
    # commas appear inside the bracketed lists, so split only where a new bucket starts
    parts = re.split(r",\s*(?=(?:Central|State|Private|Entrepreneurship))", clean(raw))
    out = []
    for p in parts:
        pl = p.lower()
        for key, canon in (("central", "Central Government"), ("state", "State Government"),
                           ("private", "Private Sector"), ("entrepren", "Entrepreneurship")):
            if pl.startswith(key) and canon not in out:
                out.append(canon)
    return out


def to_number(raw):
    m = re.findall(r"\d+(?:\.\d+)?", clean(raw))
    return [float(x) for x in m]


def make_dob(age):
    return (TODAY - dt.timedelta(days=int(age * 365.25) + rng.randint(0, 364))).isoformat()


def age_of(d):
    return (TODAY - d).days / 365.25


def app_view(p, n):
    """What the live form could send for this person."""
    codes = []
    for pref in p["careerPreferences"]:
        for c in ([pref] if pref in FORM_PREF_CODES else BUCKET_TO_FORM_CODES.get(pref, [])):
            if c not in codes:
                codes.append(c)
    flags = []
    if not codes:
        codes, flags = ["SSC"], ["app_pref_fallback"]
    a = {**p, **APP_DEFAULTS, "careerPreferences": codes}
    return a, flags


def base_profile(pid, n):
    return {
        "fullName": f"Persona {pid}", "dateOfBirth": None, "category": "General", "disabilityStatus": "No",
        "disabilityType": "", "disabilityPercentage": "", "stateOfDomicile": "Uttar Pradesh", "district": "",
        "maritalStatus": "Single", "email": f"veernxt-test+{pid.lower()}@example.com",
        "mobile": f"0000{n:06d}", "serviceBranch": "Indian Army", "armCorpsTrade": ARM_ARMOURED,
        "roleAppointment": "General Duty", "totalServiceDuration": "4 years 0 months", "militaryCourses": [],
        "characterOnDischarge": "Exemplary", "specificSkills": [], "highestQualification": "Class 12",
        "completedDuringService": False, "nccCertification": "None", "sportsAchievement": "None",
        "mathInClass12": False, "heightCm": 172, "weightKg": None, "chestCm": 85, "chestExpansion": 5,
        "vision": "6/6", "colourBlind": False, "medicalCategory": "SHAPE-1", "physicalProficiency": "Excellent",
        "careerPreferences": ["Central Government"], "relocation": "Home State", "englishComfort": "Basic",
        "sewaNidhiInterests": [], "consent": True,
    }


# --- Survey rows ----------------------------------------------------------------------------
def load_rows():
    ws = openpyxl.load_workbook(SRC, read_only=True).active
    rows = list(ws.iter_rows(values_only=True))
    return rows[1:]


def build_survey():
    rows = load_rows()
    personas, rejects, seen = [], [], set()
    heights = [n[0] for r in rows for n in [to_number(r[18])] if n and 140 <= n[0] <= 220]
    med_height = int(statistics.median(heights))
    flag_counts = collections.Counter()

    for i, r in enumerate(rows):
        row_no = i + 2
        name, email, phone = clean(r[1]).lower(), clean(r[4]).lower(), clean(r[3])
        if name in ("vv", "") or email == "vv":
            rejects.append({"sourceRow": row_no, "reason": "test/junk row (placeholder name/email)"})
            continue
        key = email or phone
        if key in seen:
            rejects.append({"sourceRow": row_no, "reason": "duplicate submission (same email/phone as earlier row)"})
            continue
        seen.add(key)
        if not isinstance(r[2], dt.datetime):
            rejects.append({"sourceRow": row_no, "reason": "DOB missing/unparseable"})
            continue
        age = age_of(r[2].date())
        if not 18 <= age <= 50:  # the form's own DOB dropdown range
            rejects.append({"sourceRow": row_no, "reason": f"age {age:.0f} outside form range 18-50 (bad DOB)"})
            continue

        pid = f"S{len(personas) + 1:03d}"
        p = base_profile(pid, len(personas) + 1)
        flags = []
        p["dateOfBirth"] = make_dob(int(age))

        cat = clean(r[5])
        p["category"] = "EWS" if "ews" in cat.lower() else next(
            (c for c in ("OBC", "SC", "ST") if cat.upper().startswith(c)), "General")

        st = clean(r[6])
        p["stateOfDomicile"] = STATE_LOOKUP.get(st.lower(), st.title())
        if st.lower() not in STATE_LOOKUP:
            flags.append("state_unrecognised")
        p["district"] = clean(r[7]).title()

        p["armCorpsTrade"], f = norm_arm(r[10]); flags += f
        p["roleAppointment"], f = norm_role(r[11]); flags += f
        courses = clean(r[12])
        p["militaryCourses"] = [] if courses.lower() in NO_COURSE else [courses.title()]
        p["characterOnDischarge"] = clean(r[13]) if clean(r[13]) in ("Exemplary", "Very Good", "Good") else "Good"

        skills, unknown_skills = [], []
        for s in [x.strip() for x in clean(r[14]).split(",") if x.strip()]:
            (skills if s.lower() in SKILL_MAP else unknown_skills).append(SKILL_MAP.get(s.lower(), s))
        p["specificSkills"] = skills
        if unknown_skills:
            flags.append("skills_unrecognised_dropped")

        q, during = QUAL_MAP.get(clean(r[15]).lower(), ("Class 12", False))
        if clean(r[15]).lower() not in QUAL_MAP:
            flags.append("qualification_defaulted")
        p["highestQualification"], p["completedDuringService"] = q, during

        ncc = clean(r[16]).lower()
        p["nccCertification"] = {"a certificate": "A Certificate", "b certificate": "B Certificate",
                                 "c certificate": "C Certificate"}.get(ncc, "None")
        sp = clean(r[17]).lower()
        p["sportsAchievement"] = {"district": "District", "state": "State", "national": "National",
                                  "services": "International/Services", "international": "International/Services"}.get(sp, "None")

        h = to_number(r[18])
        hv = h[0] if h else None
        if hv and 140 <= hv <= 220:
            p["heightCm"] = int(hv)
        elif hv and 1400 <= hv <= 2200:
            p["heightCm"] = int(hv / 10); flags.append("height_recovered")
        else:
            p["heightCm"] = med_height; flags.append("height_imputed")
        c = to_number(r[19])
        p["chestCm"] = int(c[0]) if c and 60 <= c[0] <= 130 else None
        if p["chestCm"] is None:
            flags.append("chest_unusable")
        exp = None
        if len(c) > 1 and p["chestCm"]:
            exp = c[1] if c[1] < 30 else c[1] - c[0]
            exp = int(exp) if 0 <= exp <= 20 else None
        p["chestExpansion"] = exp
        p["vision"] = clean(r[20])

        med = clean(r[21])
        if med == "SHAPE-1":
            p["medicalCategory"] = "SHAPE-1"
        elif med.lower().startswith("f(2)"):
            p["medicalCategory"] = "SHAPE-2"; flags.append("medical_mapped_F2_to_SHAPE-2")
        else:
            p["medicalCategory"] = "SHAPE-1"; flags.append("medical_ambiguous_assumed_SHAPE-1")
        prof = clean(r[22])
        p["physicalProficiency"] = prof if prof in ("Excellent", "Good", "Satisfactory") else "Good"

        p["careerPreferences"] = split_prefs(r[23]) or ["Central Government"]
        p["relocation"] = "Anywhere in India" if "pan" in clean(r[24]).lower() else "Home State"
        eng = clean(r[25]).title()
        p["englishComfort"] = eng if eng in ("Basic", "Intermediate", "Fluent") else "Basic"
        p["sewaNidhiInterests"] = [clean(r[26]).strip(", ")] if clean(r[26]) else []
        p["mathInClass12"] = False
        flags += ["assumed_4yr_service(Agniveer)", "math_unknown_assumed_false", "weight_not_collected"]

        a, af = app_view(p, len(personas) + 1)
        flags += af
        flag_counts.update(flags)
        personas.append({"id": pid, "source": "survey", "sourceRow": row_no, "flags": flags,
                         "profile_survey": p, "profile_app": a})
    return personas, rejects, flag_counts


# --- Synthetic edge cases -------------------------------------------------------------------
def build_synthetic(start_n):
    specs = [
        ("class10_only", "Lowest qualification: only Class 10 exams should surface", dict(highestQualification="Class 10", age=21)),
        ("postgrad_delhi", "Highest qualification, Fluent English, maths: everything qual-wise is open", dict(highestQualification="Post-Graduate", stateOfDomicile="Delhi", englishComfort="Fluent", mathInClass12=True, armCorpsTrade="ARMY PAY CORPS (APC)", roleAppointment="Clerk", age=27)),
        ("navy_electrical", "Navy trade -> engineering tracks, open to all India", dict(serviceBranch="Indian Navy", armCorpsTrade="ENGINEERING BRANCH (Marine Engineering)", roleAppointment="Electrical (Navy)", highestQualification="Graduate", stateOfDomicile="Kerala", relocation="Anywhere in India", careerPreferences=["Central Government"], age=24)),
        ("iaf_technical", "IAF technical airman, Class 12", dict(serviceBranch="Indian Air Force", armCorpsTrade="GROUND DUTY TECHNICAL (Airmen)", roleAppointment="Mechanical Fitter", stateOfDomicile="Punjab", specificSkills=["Technical Repair/Maintenance"], age=23)),
        ("iaf_admin_graduate", "IAF admin trade -> clerical/banking tracks", dict(serviceBranch="Indian Air Force", armCorpsTrade="GROUND DUTY NON-TECHNICAL (Admin / Logistics)", roleAppointment="Clerk", highestQualification="Graduate", stateOfDomicile="Haryana", specificSkills=["Office Admin/Computer Work"], careerPreferences=["Central Government", "State Government"], age=25)),
        ("shape2_graduate", "SHAPE-2: no physical-required exam may appear", dict(medicalCategory="SHAPE-2", highestQualification="Graduate", age=24)),
        ("shape3_class12", "SHAPE-3: no physical-required exam may appear", dict(medicalCategory="SHAPE-3", age=23)),
        ("satisfactory_fitness", "SHAPE-1 but Satisfactory proficiency: POLICE_CAPF/DEFENCE physical exams excluded", dict(physicalProficiency="Satisfactory", careerPreferences=["Central Government"], age=24)),
        ("st_jharkhand", "ST reservation bonus, state preference", dict(category="ST", stateOfDomicile="Jharkhand", careerPreferences=["State Government"], age=22)),
        ("sc_bihar_graduate", "SC + graduate + central preference", dict(category="SC", stateOfDomicile="Bihar", highestQualification="Graduate", careerPreferences=["Central Government"], age=25)),
        ("ews_rajasthan", "EWS category", dict(category="EWS", stateOfDomicile="Rajasthan", age=22)),
        ("disability_locomotor", "Locomotor 40-49%: physical-required exams should be treated with care", dict(disabilityStatus="Yes", disabilityType="Locomotor", disabilityPercentage="40-49%", highestQualification="Graduate", stateOfDomicile="Madhya Pradesh", age=26)),
        ("disability_visual_pg", "Visual 70-100%, colour-blind, post-graduate", dict(disabilityStatus="Yes", disabilityType="Visual", disabilityPercentage="70-100%", colourBlind=True, highestQualification="Post-Graduate", stateOfDomicile="Delhi", age=28)),
        ("small_state_sikkim", "Small state: very few home-state exams", dict(stateOfDomicile="Sikkim", age=22)),
        ("small_ut_andaman", "UT with almost no state exams, Class 10", dict(stateOfDomicile="Andaman and Nicobar Islands", highestQualification="Class 10", age=22)),
        ("anywhere_tamilnadu", "Anywhere in India + Fluent English: widest pool", dict(stateOfDomicile="Tamil Nadu", relocation="Anywhere in India", highestQualification="Graduate", englishComfort="Fluent", age=25)),
        ("home_district_only", "relocation=Home District (valid in schema, never handled by engine)", dict(relocation="Home District", stateOfDomicile="Maharashtra", age=23)),
        ("sports_international", "Services/International sports achiever, police preference", dict(sportsAchievement="International/Services", careerPreferences=["POLICE_CAPF"], age=24)),
        ("ncc_c_ssc", "NCC C + state sports, SSC preference", dict(nccCertification="C Certificate", sportsAchievement="State", careerPreferences=["SSC"], age=22)),
        ("pref_banking_code", "Form code BANKING: the only form code the scorer recognises", dict(careerPreferences=["BANKING"], highestQualification="Graduate", age=25)),
        ("pref_form_codes_multi", "Six form codes: scorer recognises none of them (preference score should be 0)", dict(careerPreferences=["POLICE_CAPF", "SSC", "RAILWAYS", "TEACHING", "ENGINEERING", "NURSING"], highestQualification="Graduate", age=24)),
        ("pref_entrepreneur_only", "Entrepreneurship only: maps to no exam track", dict(careerPreferences=["Entrepreneurship"], age=23)),
        ("pref_private_only", "Private sector only", dict(careerPreferences=["Private Sector"], age=23)),
        ("character_good", "Lowest discharge character", dict(characterOnDischarge="Good", age=22)),
        ("maxed_profile", "Everything favourable: checks the score cap at 100 / ties", dict(highestQualification="Graduate", nccCertification="C Certificate", sportsAchievement="International/Services", englishComfort="Fluent", mathInClass12=True, careerPreferences=["Central Government", "State Government", "Private Sector"], specificSkills=["Weapons Handling", "Driving (LMV/HMV)", "Office Admin/Computer Work"], relocation="Anywhere in India", age=26)),
        ("youngest_18", "Youngest age the form allows", dict(highestQualification="Class 10", age=18)),
        ("oldest_45", "Older applicant: age is never hard-checked by the engine", dict(highestQualification="Graduate", totalServiceDuration="15 years 0 months", age=45)),
        ("short_service_2y", "2 years service: no full-term bonus", dict(totalServiceDuration="2 years 0 months", age=21)),
        ("married", "Married status", dict(maritalStatus="Married", age=27)),
        ("army_medical", "AMC trade -> health/nursing", dict(armCorpsTrade="ARMY MEDICAL CORPS (AMC)", roleAppointment="Nursing Assistant", highestQualification="Graduate", careerPreferences=["State Government"], age=24)),
        ("navy_seaman_kerala", "Navy seaman -> transport/police", dict(serviceBranch="Indian Navy", armCorpsTrade="EXECUTIVE BRANCH (Seamen Branch)", roleAppointment="Seaman", stateOfDomicile="Kerala", age=23)),
        ("signals_karnataka", "Signals + maths + graduate: technical tracks", dict(armCorpsTrade="CORPS OF SIGNALS", roleAppointment="Radio Operator", highestQualification="Graduate", mathInClass12=True, stateOfDomicile="Karnataka", age=24)),
        ("jk_state_naming", "J&K naming: 'Jammu & Kashmir' vs 'Jammu and Kashmir' must match exam state_ut", dict(stateOfDomicile="Jammu & Kashmir", age=23)),
    ]
    out = []
    for i, (slug, purpose, ov) in enumerate(specs):
        pid = f"X{i + 1:02d}"
        p = base_profile(pid, start_n + i)
        age = ov.pop("age")
        p.update(ov)
        p["dateOfBirth"] = make_dob(age)
        a, af = app_view(p, start_n + i)
        out.append({"id": pid, "source": "synthetic", "slug": slug, "purpose": purpose, "flags": af,
                    "profile_survey": p, "profile_app": a})
    return out


# --- Report ---------------------------------------------------------------------------------
def report(survey, rejects, flags, synth):
    def dist(field, src="profile_survey"):
        return dict(collections.Counter(p[src][field] for p in survey).most_common())

    lines = [f"# Persona build report ({TODAY})", "",
             f"- Survey rows read: {len(survey) + len(rejects)}",
             f"- Personas kept: **{len(survey)}**   rejected: **{len(rejects)}**",
             f"- Synthetic edge personas: **{len(synth)}**", "", "## Rejected rows"]
    lines += [f"- row {r['sourceRow']}: {r['reason']}" for r in rejects] or ["- none"]
    lines += ["", "## Flags (fields cleaned/assumed, across kept survey personas)"]
    lines += [f"- {k}: {v}" for k, v in flags.most_common()]
    lines += ["", "## Cohort (survey personas)"]
    for f in ("category", "highestQualification", "stateOfDomicile", "armCorpsTrade", "roleAppointment", "medicalCategory",
              "nccCertification", "sportsAchievement", "relocation", "englishComfort", "characterOnDischarge"):
        lines.append(f"- {f}: {dist(f)}")
    lines.append(f"- careerPreferences: {dict(collections.Counter(x for p in survey for x in p['profile_survey']['careerPreferences']).most_common())}")
    lines.append(f"- app-view careerPreferences (form codes): {dict(collections.Counter(x for p in survey for x in p['profile_app']['careerPreferences']).most_common())}")
    ages = [int(age_of(dt.date.fromisoformat(p['profile_survey']['dateOfBirth']))) for p in survey]
    lines.append(f"- age: min {min(ages)} median {int(statistics.median(ages))} max {max(ages)}")
    lines += ["", "## Known gaps between the survey and the live form",
              "- Form never asks: skills, courses, sports, maths, English, relocation, medical category, proficiency (defaults sent).",
              "- Form's career-preference options are track codes; the scorer only recognises Central/State/Bank/PSU/Private/Entrepreneurship words.",
              "- Form's role dropdown comes from designations.json (no General Duty/Chef/Barber/Washerman/Tradesman for Armoured Corps).",
              "- profile_app career preferences are derived from survey buckets via an assumed mapping (BUCKET_TO_FORM_CODES).",
              "- Survey has no service duration, weight or maths-in-12th: assumed 4 years (Agniveer), null, false."]
    (OUT / "REPORT.md").write_text("\n".join(lines) + "\n", encoding="utf-8")


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    survey, rejects, flags = build_survey()
    synth = build_synthetic(start_n=len(survey) + 1)
    (OUT / "survey_personas.json").write_text(json.dumps(survey, indent=2, ensure_ascii=False), encoding="utf-8")
    (OUT / "synthetic_personas.json").write_text(json.dumps(synth, indent=2, ensure_ascii=False), encoding="utf-8")
    (OUT / "rejects.json").write_text(json.dumps(rejects, indent=2), encoding="utf-8")
    report(survey, rejects, flags, synth)
    print(f"survey personas: {len(survey)}  rejected: {len(rejects)}  synthetic: {len(synth)}  -> {OUT}")


if __name__ == "__main__":
    main()
