# Guide Links Audit: exams without a Guide (2026-09-30)

**Status:** findings for Content Team review. **Nothing has been changed in the database.** No links are restored until the content team confirms.

**Question asked:** which exams have no Guide linked, and did they ever have Guides that were later removed (as the content team reports)?

## Summary

- Audited all **1,575** published exams in `lc_exams`.
- **228 exams have no Guide linked today** (a Guide link counts only if the linked resource exists in `resources`). Only 1 exam has none of Intro, Guide or Precis: IBPS RRB PO (Andaman and Nicobar Islands), although it still gets content through the old exam-name fallback.
- **198 of the 228 did have a Guide linked earlier** and lost it. The content team's report is correct.
- **The Guide resources were not deleted.** The `resources` table held 16,631 rows on 09-25 and holds 16,631 now. Only the exam-to-resource *links* were removed. Of the 302 unlogged lost links (Group A), 252 point at Published Guides still used by other exams, 16 at Drafts, and 34 at Precis-content resources.
- **30 exams show no evidence of ever having a Guide**, mostly UT and Central. They need new linking, not restoring.

| Group | Exams | What happened | Restorable from |
|---|---|---|---|
| A. Removed, no log | 162 | 302 Guide links present on 09-25 are gone, and no backup or log records their removal | 09-25 snapshot |
| B. Removed by 09-26 operations | 29 | Links removed by the 09-26 rollback / English dedupe | `links_deleted.json` backups |
| C. Removed earlier | 7 | Links removed by the 09-19 dedupe or the 09-23 mock-test parking | 09-19 and 09-23 backups |
| D. Never had one | 30 | No trace of a Guide link in any snapshot or log | Not restorable, needs new links |
| **Total** | **228** | | |

## How this was determined

Current state comes from the live DB. History comes from the two full DB snapshots of 2026-09-25 (`K:/tmp/snapshots/2026-09-25_before-rollback-to-09-24` and `..._after-mock-ingest`, identical for links) and every removal backup in `K:/tmp/db_backups`. Each currently Guide-less exam was matched against those.

The map table stores only creation times, not deletions, so there is no built-in history. The evidence is limited to what the snapshots and backups captured. Anything removed before 08-20 and never backed up can't be seen.

## What removed the links

1. **Logged operations.**
   - **09-19 dedupe** (4,977 links): removed duplicates within an exam. It was meant to keep one Guide per exam.
   - **09-23 mock-test parking** (60 Guide links): moved mock tests out of Guide.
   - **09-26 rollback to 09-23 08:00Z** (3,629 links): deleted every Guide/Precis link created after that time.
   - **09-26 English dedupe** (1,181 links): removed the older duplicate English links.
2. **An unlogged removal (Group A).** 302 Guide links, created 08-23 by Gemini (204) or by the 09-17 manual backfill (98), were present on 09-25 and are gone now. The 09-26 rollback should not have touched them, because they are older than its cutoff. Whatever removed them left no backup. Likely candidates are an admin-UI unlink or a script without backup logging. **This cause is unconfirmed.**
3. **Dedupe side effect.** For 226 exams the dedupe removed a duplicate and kept one Guide, and that kept Guide is also gone today. The unlogged removal above is the likely reason.

## What to decide

1. Are the **162 Group A exams'** old links correct to restore? They include the most-lost titles: Reasoning (89), English (35), state GS books (Chhattisgarh 18, Himachal Pradesh 17, Karnataka 12, and others), and HINDI JHT (16).
2. **English links:** should any be restored, or should English follow the "one canonical English Guide" rule (Cluster_087 ENGLISH, 26 chapters)?
3. **The 34 misfiled links:** these Guide-category links point at Precis content. Restore them as Guide, or skip? The 09-19 cleanup removed similar ones.
4. For the **30 Group D exams**, which Guides should be linked? They need content decisions.

## Restore plan (after confirmation)

- **Group A:** re-insert the rows saved in `K:/tmp/unlogged_guide_losses.json` (taken from the 09-25 snapshot), skipping any exam or link the team rules out. Dry run first.
- **Group B:** `node scripts/restore_guide_precis_links_from_backup.mjs --file=<links_deleted.json> --upto=<ISO> [--execute]`. It restores only links created before `--upto`.
- **Group C:** re-insert from the 09-19 and 09-23 backups.
- Before executing: snapshot the current links, then verify with the anon key (RLS hides Draft resources from anon), not only the service role.

## Supporting files (in `K:/tmp/`, not committed)

- `no_guide_exams_history.json`: all 228 exams with removal-log matches
- `unlogged_guide_losses.json`: the 302 Group A link rows
- `no_guide_never_had.json`: the 30 Group D exams
- `exams_no_resources.json`: the one exam with no Intro, Guide or Precis

## Appendix: exams by group

### A. Removed, no log (162)

| Exam | Region | Level | Category | Guides linked before |
|---|---|---|---|---|
| AAU Jorhat Technical Posts | Assam | state | Agriculture Services | Reasoning, Assam GS |
| Agricultural Assistant | Kerala | state | Agriculture Services | Reasoning, KERALA GS |
| Agriculture Assistant | Karnataka | state | Agriculture Services | Reasoning, Karnataka GS |
| Agriculture Coordinator | Bihar | state | Agriculture Services | Reasoning, Bihar GS |
| Agriculture Coordinator | Jharkhand | state | Agriculture Services | Jharkhand GS Book, Reasoning |
| Agriculture Development Officer | Himachal Pradesh | state | Agriculture Department | Reasoning, Himachal Pradesh GS |
| Agriculture Development Officer | Madhya Pradesh | state | Agriculture Department | Madhya Pradesh GS, Reasoning |
| Agriculture Development Officer | Manipur | state | Agriculture Department | Manipur GS Book, Reasoning |
| Agriculture Development Officer | Meghalaya | state | Agriculture Department | Meghalaya GS, Reasoning |
| Agriculture Development Officer | Mizoram | state | Agriculture Department | Mizoram GS, Reasoning |
| Agriculture Field Officer | Nagaland | state | Agriculture Department | Reasoning |
| Agriculture Officer | Karnataka | state | Agriculture Department | Reasoning, Karnataka GS |
| Agriculture Officer | Kerala | state | Agriculture Department | Reasoning |
| Agriculture Officer | Sikkim | state | Agriculture Services | Reasoning |
| Agriculture Officer | Tripura | state | Agriculture Services | Reasoning |
| Agriculture Officer (AO) | Maharashtra | state | Agriculture Department | Mathematics, Reasoning, MAHARASHTRA GS, ENGLISH |
| Agriculture Supervisor | Sikkim | state | Agriculture Services | Reasoning |
| Agriculture Supervisor | Telangana | state | Agriculture Services | Reasoning |
| Agriculture Supervisor | Tripura | state | Agriculture Services | Reasoning |
| Agriculture Supervisor | Uttarakhand | state | Agriculture Services | REASONING, Reasoning |
| Agriculture Supervisor | West Bengal | state | Agriculture Services | Reasoning |
| Agriculture Technical Assistant | Madhya Pradesh | state | Agriculture Services | Madhya Pradesh GS, Reasoning |
| Agriculture Technical Assistant | Manipur | state | Agriculture Services | Reasoning, Manipur GS Book |
| Agriculture Technical Assistant | Meghalaya | state | Agriculture Services | Reasoning, Meghalaya GS |
| Agriculture Technical Assistant | Mizoram | state | Agriculture Services | Mizoram GS, Reasoning |
| Agriculture Technical Assistant | Nagaland | state | Agriculture Services | Reasoning |
| Agriculture Technical Service | Bihar | state | Agriculture Department | Bihar GS, Reasoning |
| Agriculture Technical Service | Jharkhand | state | Agriculture Department | Jharkhand GS Book, Reasoning |
| APSC Assistant Professor | Assam | state | Education Services | Assam GS, ENGLISH [Precis content], Reasoning |
| Assam CHO (Community Health Officer) | Assam | state | Health Services | Assam GS, Reasoning |
| Assam Junior Revenue Officer | Assam | state | Revenue Services | Assam GS, Reasoning, ENGLISH [Precis content] |
| Assam Lab Technician/Pharmacist | Assam | state | Health Services | Assam GS, Reasoning |
| Assam Lecturer/Assistant Professor | Assam | state | Teacher Recruitment | Assam GS, ENGLISH [Precis content] |
| Assam Staff Nurse/MTS | Assam | state | Health Services | Reasoning, Assam GS |
| Bihar Community Health Officer (CHO) | Bihar | state | Health Services | Bihar GS, Reasoning |
| Bihar Pharmacist/Lab Technician | Bihar | state | Health Services | Reasoning, Bihar GS |
| Bihar Police Home Guard | Bihar | state | Armed Police | Bihar GS, Reasoning, HINDI |
| Bihar Staff Nurse | Bihar | state | Health Services | Bihar GS |
| BPSC Assistant Professor | Bihar | state | Education Services | Reasoning, Bihar GS, ENGLISH [Precis content] |
| CG Home Guard | Chhattisgarh | state | Home Guard Services | Chhattisgarh GS, Reasoning |
| CG Vyapam Forest Guard | Chhattisgarh | state | Forest Services | Reasoning, Chhattisgarh GS |
| CG Vyapam Group 4 | Chhattisgarh | state | Group IV Services | Chhattisgarh GS, ENGLISH [Precis content], Reasoning |
| CG Vyapam Lab Technician | Chhattisgarh | state | Technical Services | Chhattisgarh GS |
| CG Vyapam Pharmacist | Chhattisgarh | state | Health Services | Reasoning, Chhattisgarh GS |
| CG Vyapam Staff Nurse | Chhattisgarh | state | Health Services | Chhattisgarh GS, Reasoning |
| CGPSC Assistant Professor | Chhattisgarh | state | Education Services | Chhattisgarh GS, ENGLISH [Precis content] |
| CGPSC Peon | Chhattisgarh | state | Administrative Services | Chhattisgarh GS, ENGLISH [Precis content] |
| Deputy Project Director (Agriculture) | Assam | state | Agriculture Services | Assam GS, Reasoning |
| District Court Clerk/Peon | Goa | state | Judicial Services | ENGLISH [Precis content], Goa GS |
| DME Grade III (Technical) | Assam | state | Health Services | Reasoning, Assam GS |
| DME Technician/Assistant | Assam | state | Health Services | Reasoning, Assam GS |
| Goa ANM | Goa | state | Health Services | Reasoning, Goa GS |
| Goa Home Guard | Goa | state | Home Guard Services | Goa GS, Reasoning |
| Goa Pharmacist | Goa | state | Health Services | Goa GS |
| Goa Staff Nurse | Goa | state | Health Services | Reasoning, Goa GS |
| GPSC Assistant Professor | Goa | state | Education Services | ENGLISH [Precis content], Goa GS |
| GPSC Medical Officer | Goa | state | Medical Services | Goa GS |
| Group D (Peon/MTS) | Karnataka | state | Group D Services | HINDI JHT, ENGLISH [Precis content], Karnataka GS |
| Group D (Peon/MTS) | Tripura | state | Group D Services | ENGLISH [Precis content], HINDI JHT |
| Gujarat ANM | Gujarat | state | Health Services | Gujarat GS, Reasoning |
| Gujarat Group D / Peon | Gujarat | state | Group D Services | ENGLISH [Precis content], HINDI JHT, Gujarat GS |
| Gujarat Pharmacist | Gujarat | state | Health Services | Gujarat GS, Reasoning |
| Gujarat Staff Nurse | Gujarat | state | Health Services | Gujarat GS, Reasoning |
| Haryana ANM | Haryana | state | Health Services | Haryana GS, Reasoning, HINDI JHT |
| Haryana Staff Nurse | Haryana | state | Health Services | Haryana GS, HINDI JHT, Reasoning |
| HP ANM | Himachal Pradesh | state | Health Services | HINDI JHT, Himachal Pradesh GS, Reasoning |
| HP Group D / Peon | Himachal Pradesh | state | Group D Services | Himachal Pradesh GS, Reasoning, HINDI JHT, ENGLISH [Precis content] |
| HP Staff Nurse | Himachal Pradesh | state | Health Services | Himachal Pradesh GS |
| HPPSC Assistant Director | Himachal Pradesh | state | Administrative Services | Himachal Pradesh GS, Reasoning |
| HPPSC Assistant Engineer | Himachal Pradesh | state | Engineering Services | Himachal Pradesh GS, HINDI JHT, Reasoning |
| HPPSC Assistant Professor | Himachal Pradesh | state | Education Services | HINDI JHT, Himachal Pradesh GS, ENGLISH [Precis content] |
| HPSSSB Staff Nurse | Himachal Pradesh | state | Health Services | HINDI JHT, Himachal Pradesh GS |
| Jharkhand ANM | Jharkhand | state | Health Services | Reasoning, Jharkhand GS Book, HINDI JHT |
| Jharkhand Group D / Peon | Jharkhand | state | Group D Services | ENGLISH [Precis content], HINDI JHT, Jharkhand GS Book, Reasoning |
| Jharkhand Police Home Guard | Jharkhand | state | Home Guard Services | Reasoning, HINDI JHT, Jharkhand GS Book |
| Jharkhand Staff Nurse | Jharkhand | state | Health Services | Reasoning, Jharkhand GS Book |
| JPSC Assistant Professor | Jharkhand | state | Education Services | Jharkhand GS Book, ENGLISH [Precis content] |
| Karnataka ANM | Karnataka | state | Health Services | Karnataka GS, Reasoning |
| Karnataka Pharmacist | Karnataka | state | Health Services | Karnataka GS |
| Karnataka Staff Nurse | Karnataka | state | Health Services | Karnataka GS |
| Kerala Pharmacist | Kerala | state | Health Services | KERALA GS |
| KPSC Assistant Engineer | Kerala | state | Engineering Services | KERALA GS, Reasoning |
| KPSC Assistant Professor | Karnataka | state | Education Services | Karnataka GS, ENGLISH [Precis content] |
| KPSC Assistant Professor | Kerala | state | Education Services | ENGLISH [Precis content] |
| Maharashtra ANM/Staff Nurse | Maharashtra | state | Technical Services | MAHARASHTRA GS |
| Maharashtra Pharmacist | Maharashtra | state | Health Services | MAHARASHTRA GS |
| Maharashtra Staff Nurse | Maharashtra | state | Health Services | MAHARASHTRA GS |
| Manipur ANM/Staff Nurse | Manipur | state | Technical Services | Manipur GS Book |
| Manipur Pharmacist | Manipur | state | Health Services | Manipur GS Book |
| Manipur Staff Nurse | Manipur | state | Health Services | Manipur GS Book |
| Meghalaya ANM/Staff Nurse | Meghalaya | state | Technical Services | Meghalaya GS |
| Meghalaya Pharmacist | Meghalaya | state | Health Services | Meghalaya GS |
| Meghalaya Staff Nurse | Meghalaya | state | Health Services | Meghalaya GS, REASONING |
| Mizoram ANM/Staff Nurse | Mizoram | state | Technical Services | Mizoram GS, Reasoning |
| Mizoram Pharmacist | Mizoram | state | Health Services | Mizoram GS, Reasoning |
| Mizoram Staff Nurse | Mizoram | state | Health Services | Reasoning, Mizoram GS |
| MP Pharmacist | Madhya Pradesh | state | Health Services | Madhya Pradesh GS |
| MP Staff Nurse | Madhya Pradesh | state | Health Services | Madhya Pradesh GS |
| MP Vyapam ANM/Staff Nurse | Madhya Pradesh | state | Technical Services | Madhya Pradesh GS |
| MPSC Assistant Engineer | Manipur | state | Engineering Services | Manipur GS Book, Reasoning |
| MPSC Assistant Engineer | Meghalaya | state | Engineering Services | Meghalaya GS, Reasoning |
| MPSC Assistant Engineer | Mizoram | state | Engineering Services | Mizoram GS, Reasoning |
| MPSC Assistant Professor | Mizoram | state | Education Services | ENGLISH [Precis content], Mizoram GS |
| MPSC Assistant Professor (Group B) | Maharashtra | state | Education Services | ENGLISH [Precis content], Reasoning, MAHARASHTRA GS |
| MPSC Lecturer/Assistant Professor | Manipur | state | Education Services | Manipur GS Book, ENGLISH [Precis content] |
| MPSC Lecturer/Assistant Professor | Meghalaya | state | Education Services | ENGLISH [Precis content], Meghalaya GS |
| Nagaland Group D (Peon/MTS) | Nagaland | state | Group D Services | HINDI JHT, ENGLISH [Precis content] |
| Nagaland Village Council Election Officer | Nagaland | state | Revenue Services | Reasoning |
| NHM Chhattisgarh CHO | Chhattisgarh | state | Health Services | Chhattisgarh GS, Reasoning |
| NHM Gujarat CHO | Gujarat | state | Health Services | Gujarat GS |
| NHM Haryana CHO | Haryana | state | Health Services | Reasoning, Haryana GS |
| NHM Himachal Pradesh CHO | Himachal Pradesh | state | Health Services | Himachal Pradesh GS |
| NHM Jharkhand CHO | Jharkhand | state | Health Services | Jharkhand GS Book |
| NHM Karnataka CHO | Karnataka | state | Health Services | Karnataka GS |
| NHM Maharashtra CHO (Community Health Officer) | Maharashtra | state | Health Services | MAHARASHTRA GS |
| NHM Manipur CHO | Manipur | state | Health Services | Manipur GS Book |
| NHM Meghalaya CHO | Meghalaya | state | Health Services | Reasoning, Meghalaya GS |
| NHM Mizoram CHO | Mizoram | state | Health Services | Mizoram GS |
| NHM MP CHO | Madhya Pradesh | state | Health Services | Madhya Pradesh GS |
| NHM Odisha CHO (Community Health Officer) | Odisha | state | Health CHO | Odisha GS |
| NHM Punjab CHO | Punjab | state | NHM Health | PUNJAB GS |
| NPSC Assistant Research Officer/Lecturer | Nagaland | state | Education Services | ENGLISH [Precis content] |
| Odisha Agriculture Services (ASO/AO) | Odisha | state | Agriculture | Reasoning, Odisha GS |
| Odisha GDS (Gramin Dak Sevak) | Odisha | state | Postal GDS | Reasoning, Odisha GS |
| OPSC Assistant Executive Engineer (AEE) | Odisha | state | Engineering | Odisha GS, Reasoning |
| OPSC Assistant Law Officer | Odisha | state | Law Service | ENGLISH [Precis content], Odisha GS |
| OPSC Medical Officer | Odisha | state | Medical Officer | Odisha GS |
| OSSSC Pharmacist Allopathy/Ayurveda | Odisha | state | Health Pharma | Odisha GS |
| OSSSC Staff Nurse/Nursing Officer | Odisha | state | Health Nursing | Odisha GS |
| PPSC Agriculture Development Officer | Punjab | state | Agriculture | PUNJAB GS, Reasoning |
| PPSC Assistant Engineer (AE PWD/Irrigation) | Punjab | state | Engineering | Reasoning, PUNJAB GS |
| PPSC Drug Inspector | Punjab | state | Drug Control | Reasoning, PUNJAB GS |
| PPSC School Lecturer | Punjab | state | Lecturer | PUNJAB GS, ENGLISH [Precis content] |
| PSSSB Junior Engineer (Civil/Mech) | Punjab | state | JE Engineering | Reasoning, PUNJAB GS |
| Punjab Agriculture Supervisor | Punjab | state | Agriculture Supervisor | Reasoning, PUNJAB GS |
| Punjab Horticulture Development Officer | Punjab | state | Horticulture | Reasoning, PUNJAB GS |
| Punjab Multipurpose Health Worker | Punjab | state | MPW | PUNJAB GS |
| Punjab Staff Nurse | Punjab | state | Health Nursing | PUNJAB GS |
| Punjab Veterinary Inspector | Punjab | state | Veterinary | PUNJAB GS |
| Rajasthan Home Guard | Rajasthan | state | Home Guard | HINDI JHT, Reasoning, RAJASTHAN GS |
| Sikkim ANM | Sikkim | state | Health Services | Reasoning |
| Sikkim Group D (Peon/MTS) | Sikkim | state | Group D Services | ENGLISH [Precis content], HINDI JHT |
| SPSC Assistant Professor/Lecturer | Sikkim | state | Education Services | ENGLISH [Precis content] |
| TN Agriculture Supervisor | Tamil Nadu | state | Agriculture Services | TamilNadu GS, Reasoning |
| TN Health CHO | Tamil Nadu | state | Health Services | TamilNadu GS |
| TN MRB Staff Nurse | Tamil Nadu | state | Health Services | TamilNadu GS |
| TN Pharmacist | Tamil Nadu | state | Health Services | TamilNadu GS |
| TPSC Assistant Professor | Tripura | state | Education Services | ENGLISH [Precis content], Tripura GS |
| Tripura Staff Nurse | Tripura | state | Health Services | Tripura GS |
| TSSSC Lab Technician | Tripura | state | Technical Services | Tripura GS |
| UK ANM/CHO | Uttarakhand | state | Health Services | Uttarakhand GS |
| UK Staff Nurse | Uttarakhand | state | Health Services | Uttarakhand GS |
| UP PGT (Post Graduate Teacher) | Uttar Pradesh | state | Teacher Recruitment | ENGLISH [Precis content] |
| UP TGT (Trained Graduate Teacher) | Uttar Pradesh | state | Teacher Recruitment | ENGLISH [Precis content] |
| UPPSC Agriculture Officer | Uttar Pradesh | state | Agriculture Services | Reasoning |
| UPPSC Assistant Professor | Uttar Pradesh | state | Education Services | ENGLISH [Precis content] |
| WB 2nd SLST (PGT/Assistant Teacher) | West Bengal | state | Teacher Recruitment | ENGLISH [Precis content], West Bengal GS |
| WB Staff Nurse | West Bengal | state | Health Services | West Bengal GS |
| WBHRB CHO | West Bengal | state | Health Services | Mathematics, West Bengal GS, HINDI |
| WBPSC Agriculture Officer | West Bengal | state | Agriculture Services | West Bengal GS, Reasoning |
| WBPSC Assistant Professor | West Bengal | state | Education Services | ENGLISH [Precis content], West Bengal GS |
| WBSSC SLST (Secondary Level) | West Bengal | state | Group C Posts | Reasoning, West Bengal GS |

### B. Removed by 09-26 operations (29)

| Exam | Region | Level | Category | Guides linked before |
|---|---|---|---|---|
| Assistant Professor / Lecturer | Andaman and Nicobar Islands | ut | Teaching | GS & GK, Mathematics |
| Assistant Professor / Lecturer | Dadra & Nagar Haveli and Daman & Diu | ut | Teaching | GS & GK |
| DNH GDS (Gramin Dak Sevak) | Dadra & Nagar Haveli and Daman & Diu | ut | Postal | Computer Science, REASONING, ENGLISH, GS & GK, Mathematics |
| GDS / Postal Assistant | Chandigarh | ut | Postal | Mathematics, Computer Science, REASONING, GS & GK, ENGLISH |
| GDS / Postal Assistant | Jammu & Kashmir | ut | Postal | ENGLISH, GS & GK, Computer Science, REASONING, Mathematics |
| Group B/C / Nursing | Jammu & Kashmir | ut | Medical | Mathematics, REASONING, ENGLISH, GS & GK |
| Group B/C / Nursing / Technical | Puducherry | ut | Medical | GS & GK, ENGLISH |
| IBPS Clerk/PO/RRB | Chandigarh | ut | Banking (UT) | Computer Science, GS & GK, REASONING, HINDI, ENGLISH |
| IBPS Clerk/PO/RRB | Dadra & Nagar Haveli and Daman & Diu | ut | Banking (UT) | Mathematics, ENGLISH, GS & GK, REASONING, Computer Science, HINDI |
| IBPS PO / Clerk / RRB | Lakshadweep | ut | Banking (UT) | Computer Science, REASONING, HINDI, Mathematics, GS & GK, ENGLISH |
| IBPS PO / Clerk / RRB | Puducherry | ut | Banking (UT) | REASONING, HINDI, Computer Science, ENGLISH, Mathematics, GS & GK |
| IBPS RRB PO | Andaman and Nicobar Islands | ut | Banking (UT) | Mathematics, GS & GK, Computer Science, ENGLISH, HINDI, REASONING |
| Junior Engineer (Civil/Electrical) | Dadra & Nagar Haveli and Daman & Diu | ut | Engineering (UT) | REASONING, ENGLISH |
| Ladakh GDS (Gramin Dak Sevak) | Ladakh | ut | Postal | Computer Science, Mathematics, REASONING, GS & GK, ENGLISH |
| Lakshadweep GDS (Gramin Dak Sevak) | Lakshadweep | ut | Postal | Mathematics, ENGLISH, GS & GK, Computer Science, REASONING |
| Puducherry GDS (Gramin Dak Sevak) | Puducherry | ut | Postal | REASONING, Computer Science, ENGLISH, Mathematics |
| SBI PO / Clerk | Ladakh | ut | Banking (UT) | ENGLISH, GS & GK, Mathematics, Computer Science, REASONING |
| SBI PO / Clerk | Lakshadweep | ut | Banking (UT) | GS & GK, ENGLISH, Mathematics, REASONING, Computer Science |
| SBI PO / Clerk | Puducherry | ut | Banking (UT) | ENGLISH, REASONING, Mathematics, GS & GK, Computer Science |
| SBI PO/Clerk | Chandigarh | ut | Banking (UT) | Computer Science, Mathematics, GS & GK, ENGLISH, REASONING |
| SBI PO/Clerk | Dadra & Nagar Haveli and Daman & Diu | ut | Banking (UT) | ENGLISH, Computer Science, GS & GK, Mathematics, REASONING |
| SBI PO/CLERK | Jammu & Kashmir | ut | Banking (UT) | GS & GK, Computer Science, REASONING, ENGLISH, Mathematics |
| SSC CGL | Andaman and Nicobar Islands | ut | SSC (UT) | REASONING, GS & GK, ENGLISH, Computer Science, Mathematics |
| SSC CGL / CHSL (UT Cadre) | Ladakh | ut | Central Govt | Mathematics, Computer Science, GS & GK, ENGLISH, REASONING |
| SSC CGL / CHSL (UT Cadre) | Lakshadweep | ut | Central Govt | Mathematics, GS & GK, REASONING, Computer Science, ENGLISH |
| SSC CGL / CHSL (UT Cadre) | Puducherry | ut | Central Govt | ENGLISH, REASONING, GS & GK, Mathematics, Computer Science |
| SSC CGL/CHSL | Jammu & Kashmir | ut | Central Govt | Computer Science, ENGLISH, REASONING, Mathematics, GS & GK |
| SSC CGL/CHSL(UT Cadre) | Dadra & Nagar Haveli and Daman & Diu | ut | Central Govt | ENGLISH, GS & GK, REASONING, Computer Science, Mathematics |
| SSC CHSL | Andaman and Nicobar Islands | ut | SSC (UT) | Computer Science, Mathematics, ENGLISH, REASONING, GS & GK |

### C. Removed earlier (7)

| Exam | Region | Level | Category | Guides linked before |
|---|---|---|---|---|
| Nagaland Pharmacist Grade III/IV | Nagaland | state | Health Services | GS & GK |
| Nagaland Staff Nurse Recruitment | Nagaland | state | Health Services | GS & GK |
| Nagaland Staff Nurse/ANM | Nagaland | state | Technical Services | GS & GK |
| NHM Nagaland CHO (Community Health) | Nagaland | state | Health Services | GS & GK |
| Sikkim Staff Nurse | Sikkim | state | Health Services | GS & GK |
| UP Community Health Officer (CHO) | Uttar Pradesh | state | Health Services | GS & GK |
| UP Staff Nurse | Uttar Pradesh | state | Health Services | GS & GK |

### D. No evidence of ever having a Guide (30)

| Exam | Region | Level | Category | Guides linked before |
|---|---|---|---|---|
| Association of Chartered Certified Accountants | Central | central | Accounting & Commerce | - |
| Certified Public Accountant (CPA) | Central | central | Accounting & Commerce | - |
| Engineer | Central | central | NIC | - |
| Judge Advocate General | Central | central | Defence | - |
| Punjab Gramin Dak Sevak | Punjab | state | Postal GDS | - |
| Assistant Professor / Lecturer | Chandigarh | ut | Teaching | - |
| Assistant Professor / Lecturer | Ladakh | ut | Teaching | - |
| Assistant Professor / Lecturer | Puducherry | ut | Teaching | - |
| Contract Medical & Admin Staff | Andaman and Nicobar Islands | ut | Medical | - |
| Contract Medical & Admin Staff | Chandigarh | ut | Medical | - |
| Contract Medical & Administrative Staff | Dadra & Nagar Haveli and Daman & Diu | ut | Medical | - |
| Contract Medical & Administrative Staff | Lakshadweep | ut | Medical | - |
| Contract Medical & Administrative Staff | Puducherry | ut | Medical | - |
| Contract Medical Staff | Delhi | ut | Health | - |
| Group B/C / Nursing / Technical | Chandigarh | ut | Medical | - |
| Guest Teacher | Delhi | ut | Judiciary | - |
| Home Guard Volunteer | Chandigarh | ut | Home Guards | - |
| Home Guard Volunteer | Dadra & Nagar Haveli and Daman & Diu | ut | Home Guards | - |
| Home Guard Volunteer | Delhi | ut | Civil Security | - |
| Home Guard Volunteer | Ladakh | ut | Home Guards | - |
| Home Guard Volunteer | Lakshadweep | ut | Police (UT) | - |
| Home Guard Volunteer | Puducherry | ut | Home Guards | - |
| Medical Officer | Jammu & Kashmir | ut | Medical | - |
| Medical Officer / Specialist | Andaman and Nicobar Islands | ut | Medical | - |
| Medical Officer / Specialist | Chandigarh | ut | Medical | - |
| Medical Officer / Specialist | Dadra & Nagar Haveli and Daman & Diu | ut | Medical | - |
| Medical Officer / Specialist | Ladakh | ut | Medical | - |
| Medical Officer / Specialist | Lakshadweep | ut | Medical | - |
| Medical Officer / Specialist | Puducherry | ut | Medical | - |
| Volunteer Recruitment | Jammu & Kashmir | ut | Police (UT) | - |
