# Precis Links Audit: exams without a Precis (2026-09-30)

**Status:** findings for Content Team review. **Nothing has been changed in the database.** No links are restored until the content team confirms. The Excel version for the content team is `Precis_Links_Audit_2026-09-30.xlsx` in this folder. It follows the same method as [GUIDE_LINKS_AUDIT_2026-09-30.md](GUIDE_LINKS_AUDIT_2026-09-30.md).

**Question asked:** which exams have no Precis linked, and did they ever have Precis that were later removed?

## Summary

- Audited all **1,575** published exams in `lc_exams`.
- **238 exams have no Precis linked today** (a Precis link counts only if the linked resource exists in `resources`).
- **202 of the 238 did have a Precis linked earlier** and lost it.
- **The Precis resources were not deleted.** The `resources` table held 16,631 rows on 09-25 and holds 16,631 now. Only the exam-to-resource *links* were removed. All 187 Group A lost links point at Published Precis resources that still exist.
- **36 exams show no evidence of ever having a Precis** (mostly UT and Central). They need new linking, not restoring.

| Group | Exams | What happened | Restorable from |
|---|---|---|---|
| A. Removed, no log | 110 | 187 Precis links present on 09-25 are gone, and no backup or log records their removal | 09-25 snapshot |
| B. Removed by 09-26 operations | 31 | Links removed by the 09-26 rollback / English dedupe | `links_deleted.json` backups |
| C. Removed by 09-19 duplicate cleanup | 55 | The cleanup was meant to keep one Precis per exam, and the kept one is also gone now | 09-19 dedupe backup |
| M. Removed 09-19 as misfiled | 6 | English Guide content that was filed as Precis was removed on purpose | Not recommended, see decision 3 |
| D. Never had one | 36 | No trace of a Precis link in any snapshot or log | Not restorable, needs new links |
| **Total** | **238** | | |

## How this was determined

Same method as the Guide audit. Current state comes from the live DB. History comes from the full DB snapshots of 2026-09-25 (`K:/tmp/snapshots/`) and every removal backup in `K:/tmp/db_backups`. The map table stores only creation times, not deletions, so anything removed before 08-20 and never backed up can't be seen.

## What removed the links

1. **Logged operations.**
   - **09-19 dedupe:** 2,175 Precis links removed as duplicates within an exam.
   - **09-19 misfiled-Precis cleanup:** 683 Precis links that pointed at Guide content, removed on purpose.
   - **09-26 rollback to 09-23 08:00Z:** 1,542 Precis links created after that time.
   - **09-26 English dedupe:** 497 older duplicate English Precis links.
2. **An unlogged removal (Group A).** 187 Precis links, created 08-23 by Gemini (119), by the 09-17 manual backfill (57), or manually on 09-21 (11), were present on 09-25 and are gone now. The 09-26 rollback cutoff was 09-23 08:00Z, so it could not have removed the 08-23 and 09-17 links. Whatever removed them left no backup. **This cause is unconfirmed**, and it is the same unexplained removal seen in the Guide audit.
3. **Dedupe side effect (Group C).** The dedupe removed a duplicate and kept one Precis, and for these 55 exams the kept Precis is also gone today.

## What to decide

1. Are the **110 Group A exams'** old links correct to restore?
2. **GENERAL KNOWLEDGE:** 100 of the 187 lost links point at this Precis. It may have been replaced on purpose by the split GK books (GK Chemistry, GK Geography and others linked on 09-23). Restore, or leave?
3. **English Precis:** the single canonical English Precis is still an open decision. Restore the old English links, or wait?
4. For the **36 Group D exams**, which Precis should be linked?

## Restore plan (after confirmation)

- **Group A:** re-insert the rows saved in `K:/tmp/unlogged_precis_losses.json` (taken from the 09-25 snapshot), skipping any exam or link the team rules out. Dry run first.
- **Group B:** `node scripts/restore_guide_precis_links_from_backup.mjs --file=<links_deleted.json> --upto=<ISO> [--execute]`.
- **Group C:** re-insert from `K:/tmp/db_backups/2026-09-19T12-37-19-855Z/lc_exam_resource_map_removed_duplicates.json` (Precis rows only).
- Before executing: snapshot the current links, then verify with the anon key, not only the service role.

## Supporting files (in `K:/tmp/`, not committed)

- `no_precis_exams_history.json`: all 238 exams with group and removal-log matches
- `unlogged_precis_losses.json`: the 187 Group A link rows

## Appendix: exams by group

### A. Removed, no log (110)

| Exam | Region | Level | Category | Precis linked before |
|---|---|---|---|---|
| AAU Jorhat Technical Posts | Assam | State | Agriculture Services | GENERAL KNOWLEDGE |
| APPSC General Duty Medical Officer | Arunachal Pradesh | State | Medical Services | ARUNACHAL PRADESH SI, GENERAL KNOWLEDGE |
| APSC Assistant Professor | Assam | State | Education Services | GENERAL KNOWLEDGE |
| Agricultural Assistant | Kerala | State | Agriculture Services | KERALA CONSTABLE, GENERAL KNOWLEDGE |
| Agriculture Assistant | Karnataka | State | Agriculture Services | Karnataka_GS |
| Agriculture Coordinator | Bihar | State | Agriculture Services | GENERAL KNOWLEDGE |
| Agriculture Coordinator | Jharkhand | State | Agriculture Services | GENERAL KNOWLEDGE, 2026 GK-GS |
| Agriculture Development Officer | Himachal Pradesh | State | Agriculture Department | Himachal_Pradesh_GS, GENERAL KNOWLEDGE |
| Agriculture Development Officer | Madhya Pradesh | State | Agriculture Department | GENERAL KNOWLEDGE |
| Agriculture Development Officer | Manipur | State | Agriculture Department | 2026 GK-GS, GENERAL KNOWLEDGE |
| Agriculture Development Officer | Meghalaya | State | Agriculture Department | GENERAL KNOWLEDGE |
| Agriculture Development Officer | Mizoram | State | Agriculture Department | GENERAL KNOWLEDGE |
| Agriculture Officer | Karnataka | State | Agriculture Department | Karnataka_GS, GENERAL KNOWLEDGE |
| Agriculture Officer | Kerala | State | Agriculture Department | GENERAL KNOWLEDGE |
| Agriculture Officer | Sikkim | State | Agriculture Services | GENERAL KNOWLEDGE, 2026 GK-GS |
| Agriculture Officer | Tripura | State | Agriculture Services | GENERAL KNOWLEDGE, 2026 GK-GS |
| Agriculture Officer (AO) | Maharashtra | State | Agriculture Department | GENERAL KNOWLEDGE, MATHEMATICS, ENGLISH |
| Agriculture Supervisor | Sikkim | State | Agriculture Services | 2026 GK-GS, GENERAL KNOWLEDGE |
| Agriculture Supervisor | Telangana | State | Agriculture Services | GENERAL KNOWLEDGE |
| Agriculture Supervisor | Tripura | State | Agriculture Services | GENERAL KNOWLEDGE, 2026 GK-GS |
| Agriculture Supervisor | Uttarakhand | State | Agriculture Services | GENERAL KNOWLEDGE, 2026 GK-GS, REASONING |
| Agriculture Supervisor | West Bengal | State | Agriculture Services | 2026 GK-GS, GENERAL KNOWLEDGE |
| Agriculture Technical Assistant | Madhya Pradesh | State | Agriculture Services | GENERAL KNOWLEDGE |
| Agriculture Technical Assistant | Manipur | State | Agriculture Services | GENERAL KNOWLEDGE |
| Agriculture Technical Assistant | Meghalaya | State | Agriculture Services | GENERAL KNOWLEDGE |
| Agriculture Technical Assistant | Mizoram | State | Agriculture Services | GENERAL KNOWLEDGE |
| Agriculture Technical Assistant | Nagaland | State | Agriculture Services | 2026 GK-GS, GENERAL KNOWLEDGE |
| Agriculture Technical Service | Bihar | State | Agriculture Department | GENERAL KNOWLEDGE |
| Agriculture Technical Service | Jharkhand | State | Agriculture Department | 2026 GK-GS, GENERAL KNOWLEDGE |
| Arunachal Pradesh D.El.Ed Selection | Arunachal Pradesh | State | Teacher Recruitment | ARUNACHAL PRADESH SI, GENERAL KNOWLEDGE, ENGLISH |
| Arunachal Pradesh Home Guard | Arunachal Pradesh | State | Home Guard Services | ARUNACHAL PRADESH SI, GENERAL KNOWLEDGE |
| Assam CHO (Community Health Officer) | Assam | State | Health Services | GENERAL KNOWLEDGE |
| Assam Junior Revenue Officer | Assam | State | Revenue Services | GENERAL KNOWLEDGE |
| Assam Lecturer/Assistant Professor | Assam | State | Teacher Recruitment | GENERAL KNOWLEDGE |
| Assam Staff Nurse/MTS | Assam | State | Health Services | GENERAL KNOWLEDGE |
| Bihar Community Health Officer (CHO) | Bihar | State | Health Services | GENERAL KNOWLEDGE |
| Bihar Pharmacist/Lab Technician | Bihar | State | Health Services | GENERAL KNOWLEDGE |
| Bihar Police Home Guard | Bihar | State | Armed Police | GENERAL KNOWLEDGE, HINDI |
| Bihar Staff Nurse | Bihar | State | Health Services | GENERAL KNOWLEDGE |
| CG Home Guard | Chhattisgarh | State | Home Guard Services | Chhattisgarh_GS, Chhattisgarh_SI, GENERAL KNOWLEDGE |
| CG Vyapam Forest Guard | Chhattisgarh | State | Forest Services | GENERAL KNOWLEDGE, Chhattisgarh_GS, Chhattisgarh_SI |
| CG Vyapam Group 4 | Chhattisgarh | State | Group IV Services | GENERAL KNOWLEDGE, Chhattisgarh_SI, Chhattisgarh_GS |
| CG Vyapam Lab Technician | Chhattisgarh | State | Technical Services | Chhattisgarh_SI, GENERAL KNOWLEDGE, Chhattisgarh_GS |
| CG Vyapam Pharmacist | Chhattisgarh | State | Health Services | Chhattisgarh_GS, GENERAL KNOWLEDGE, Chhattisgarh_SI, ENGLISH |
| CG Vyapam Staff Nurse | Chhattisgarh | State | Health Services | GENERAL KNOWLEDGE, Chhattisgarh_GS, Chhattisgarh_SI |
| CGPSC Assistant Professor | Chhattisgarh | State | Education Services | Chhattisgarh_GS, Chhattisgarh_SI, GENERAL KNOWLEDGE |
| CGPSC Peon | Chhattisgarh | State | Administrative Services | GENERAL KNOWLEDGE, Chhattisgarh_GS, Chhattisgarh_SI |
| DME Grade III (Technical) | Assam | State | Health Services | GENERAL KNOWLEDGE |
| DME Technician/Assistant | Assam | State | Health Services | GENERAL KNOWLEDGE |
| Deputy Project Director (Agriculture) | Assam | State | Agriculture Services | GENERAL KNOWLEDGE |
| District Court Clerk/Peon | Goa | State | Judicial Services | Goa GS |
| GPSC Assistant Professor | Goa | State | Education Services | Goa GS |
| GPSC Medical Officer | Goa | State | Medical Services | Goa GS, GENERAL KNOWLEDGE |
| Goa ANM | Goa | State | Health Services | Goa GS, GENERAL KNOWLEDGE |
| Goa Home Guard | Goa | State | Home Guard Services | Goa GS, GENERAL KNOWLEDGE |
| Goa Pharmacist | Goa | State | Health Services | GENERAL KNOWLEDGE, Goa GS |
| Goa Staff Nurse | Goa | State | Health Services | Goa GS, Gujarat_CONSTABLE, GENERAL KNOWLEDGE |
| Group D (Peon/MTS) | Karnataka | State | Group D Services | Karnataka_GS |
| Group D (Peon/MTS) | Tripura | State | Group D Services | 2026 GK-GS |
| Gujarat ANM | Gujarat | State | Health Services | GENERAL KNOWLEDGE, Gujarat_CONSTABLE |
| Gujarat Group D / Peon | Gujarat | State | Group D Services | Gujarat_CONSTABLE, GENERAL KNOWLEDGE |
| Gujarat Pharmacist | Gujarat | State | Health Services | Gujarat_CONSTABLE, GENERAL KNOWLEDGE |
| Gujarat Staff Nurse | Gujarat | State | Health Services | Gujarat_CONSTABLE, GENERAL KNOWLEDGE |
| HP ANM | Himachal Pradesh | State | Health Services | Himachal_Pradesh_GS |
| HP Group D / Peon | Himachal Pradesh | State | Group D Services | GENERAL KNOWLEDGE, Himachal_Pradesh_GS |
| HP Staff Nurse | Himachal Pradesh | State | Health Services | Himachal_Pradesh_GS, GENERAL KNOWLEDGE |
| HPPSC Assistant Director | Himachal Pradesh | State | Administrative Services | GENERAL KNOWLEDGE, Himachal_Pradesh_GS |
| HPPSC Assistant Engineer | Himachal Pradesh | State | Engineering Services | Himachal_Pradesh_GS, GENERAL KNOWLEDGE |
| HPPSC Assistant Professor | Himachal Pradesh | State | Education Services | GENERAL KNOWLEDGE, Himachal_Pradesh_GS |
| HPSSSB Staff Nurse | Himachal Pradesh | State | Health Services | GENERAL KNOWLEDGE, Himachal_Pradesh_GS |
| Haryana ANM | Haryana | State | Health Services | Haryana_GS, GENERAL KNOWLEDGE |
| Haryana Staff Nurse | Haryana | State | Health Services | Haryana_GS, GENERAL KNOWLEDGE |
| Jharkhand ANM | Jharkhand | State | Health Services | GENERAL KNOWLEDGE |
| Jharkhand Group D / Peon | Jharkhand | State | Group D Services | GENERAL KNOWLEDGE |
| Jharkhand Police Home Guard | Jharkhand | State | Home Guard Services | GENERAL KNOWLEDGE |
| Jharkhand Staff Nurse | Jharkhand | State | Health Services | GENERAL KNOWLEDGE |
| KPSC Assistant Engineer | Kerala | State | Engineering Services | KERALA CONSTABLE, GENERAL KNOWLEDGE |
| KPSC Assistant Professor | Karnataka | State | Education Services | Karnataka_GS |
| KPSC Assistant Professor | Kerala | State | Education Services | GENERAL KNOWLEDGE |
| Karnataka ANM | Karnataka | State | Health Services | GENERAL KNOWLEDGE, Karnataka_GS |
| Karnataka Pharmacist | Karnataka | State | Health Services | Karnataka_GS, GENERAL KNOWLEDGE |
| Karnataka Staff Nurse | Karnataka | State | Health Services | Karnataka_GS, GENERAL KNOWLEDGE |
| Kerala Pharmacist | Kerala | State | Health Services | KERALA CONSTABLE |
| MP Pharmacist | Madhya Pradesh | State | Health Services | GENERAL KNOWLEDGE, MATHEMATICS |
| MP Staff Nurse | Madhya Pradesh | State | Health Services | GENERAL KNOWLEDGE, MATHEMATICS |
| MP Vyapam ANM/Staff Nurse | Madhya Pradesh | State | Technical Services | GENERAL KNOWLEDGE, MATHEMATICS |
| MPSC Assistant Engineer | Manipur | State | Engineering Services | GENERAL KNOWLEDGE |
| MPSC Assistant Engineer | Meghalaya | State | Engineering Services | GENERAL KNOWLEDGE |
| MPSC Assistant Engineer | Mizoram | State | Engineering Services | GENERAL KNOWLEDGE |
| MPSC Assistant Professor | Mizoram | State | Education Services | GENERAL KNOWLEDGE |
| MPSC Assistant Professor (Group B) | Maharashtra | State | Education Services | GENERAL KNOWLEDGE |
| Manipur ANM/Staff Nurse | Manipur | State | Technical Services | MATHEMATICS, GENERAL KNOWLEDGE |
| Manipur Pharmacist | Manipur | State | Health Services | MATHEMATICS, GENERAL KNOWLEDGE |
| Manipur Staff Nurse | Manipur | State | Health Services | GENERAL KNOWLEDGE, MATHEMATICS |
| Mizoram ANM/Staff Nurse | Mizoram | State | Technical Services | GENERAL KNOWLEDGE |
| Mizoram Pharmacist | Mizoram | State | Health Services | GENERAL KNOWLEDGE |
| Mizoram Staff Nurse | Mizoram | State | Health Services | GENERAL KNOWLEDGE |
| NHM Chhattisgarh CHO | Chhattisgarh | State | Health Services | GENERAL KNOWLEDGE, Chhattisgarh_SI, Chhattisgarh_GS, ENGLISH |
| NHM Gujarat CHO | Gujarat | State | Health Services | Gujarat_CONSTABLE, GENERAL KNOWLEDGE |
| NHM Haryana CHO | Haryana | State | Health Services | Haryana_GS |
| NHM Himachal Pradesh CHO | Himachal Pradesh | State | Health Services | Himachal_Pradesh_GS |
| NHM Karnataka CHO | Karnataka | State | Health Services | Karnataka_GS |
| NHM MP CHO | Madhya Pradesh | State | Health Services | GENERAL KNOWLEDGE |
| NHM Manipur CHO | Manipur | State | Health Services | GENERAL KNOWLEDGE, MATHEMATICS |
| NHM Meghalaya CHO | Meghalaya | State | Health Services | GENERAL KNOWLEDGE |
| NHM Mizoram CHO | Mizoram | State | Health Services | ENGLISH |
| PPSC Agriculture Development Officer | Punjab | State | Agriculture | GENERAL KNOWLEDGE |
| PPSC Drug Inspector | Punjab | State | Drug Control | GENERAL KNOWLEDGE |
| UPPSC Agriculture Officer | Uttar Pradesh | State | Agriculture Services | GENERAL KNOWLEDGE |
| WBPSC Agriculture Officer | West Bengal | State | Agriculture Services | GENERAL KNOWLEDGE |

### B. Removed by 09-26 operations (31)

| Exam | Region | Level | Category | Precis linked before |
|---|---|---|---|---|
| Meghalaya Staff Nurse | Meghalaya | State | Health Services | REASONING |
| WBHRB CHO | West Bengal | State | Health Services | HINDI, MATHEMATICS |
| Assistant Professor / Lecturer | Andaman and Nicobar Islands | UT | Teaching | GS & GK, MATHEMATICS |
| Assistant Professor / Lecturer | Dadra & Nagar Haveli and Daman & Diu | UT | Teaching | Cluster_085_MATHEMATICS, GS & GK |
| DNH GDS (Gramin Dak Sevak) | Dadra & Nagar Haveli and Daman & Diu | UT | Postal | Computer Science, GS & GK, REASONING, ENGLISH, MATHEMATICS, Cluster_085_MATHEMATICS |
| GDS / Postal Assistant | Chandigarh | UT | Postal | GS & GK, Cluster_085_MATHEMATICS, REASONING, ENGLISH, Computer Science, MATHEMATICS |
| GDS / Postal Assistant | Jammu & Kashmir | UT | Postal | Cluster_085_MATHEMATICS, Computer Science, ENGLISH, REASONING, GS & GK, MATHEMATICS |
| Group B/C / Nursing | Jammu & Kashmir | UT | Medical | ENGLISH, MATHEMATICS, REASONING, GS & GK, Cluster_085_MATHEMATICS |
| Group B/C / Nursing / Technical | Puducherry | UT | Medical | ENGLISH, GS & GK |
| IBPS Clerk/PO/RRB | Chandigarh | UT | Banking (UT) | ENGLISH, HINDI, REASONING, Computer Science, Cluster_085_MATHEMATICS, GS & GK |
| IBPS Clerk/PO/RRB | Dadra & Nagar Haveli and Daman & Diu | UT | Banking (UT) | Computer Science, HINDI, REASONING, ENGLISH, MATHEMATICS, Cluster_085_MATHEMATICS, GS & GK |
| IBPS PO / Clerk / RRB | Lakshadweep | UT | Banking (UT) | Cluster_085_MATHEMATICS, GS & GK, Computer Science, MATHEMATICS, HINDI, REASONING, ENGLISH |
| IBPS PO / Clerk / RRB | Puducherry | UT | Banking (UT) | HINDI, Computer Science, ENGLISH, GS & GK, MATHEMATICS, Cluster_085_MATHEMATICS, REASONING |
| IBPS RRB PO | Andaman and Nicobar Islands | UT | Banking (UT) | GS & GK, Cluster_085_MATHEMATICS, MATHEMATICS, ENGLISH, REASONING, Computer Science, HINDI |
| Junior Engineer (Civil/Electrical) | Dadra & Nagar Haveli and Daman & Diu | UT | Engineering (UT) | ENGLISH, REASONING |
| Ladakh GDS (Gramin Dak Sevak) | Ladakh | UT | Postal | ENGLISH, MATHEMATICS, Computer Science, REASONING, Cluster_085_MATHEMATICS, GS & GK |
| Lakshadweep GDS (Gramin Dak Sevak) | Lakshadweep | UT | Postal | ENGLISH, GS & GK, Cluster_085_MATHEMATICS, MATHEMATICS, Computer Science, REASONING |
| Puducherry GDS (Gramin Dak Sevak) | Puducherry | UT | Postal | REASONING, ENGLISH, Computer Science, MATHEMATICS, Cluster_085_MATHEMATICS |
| SBI PO / Clerk | Ladakh | UT | Banking (UT) | MATHEMATICS, Cluster_085_MATHEMATICS, ENGLISH, REASONING, Computer Science, GS & GK |
| SBI PO / Clerk | Lakshadweep | UT | Banking (UT) | ENGLISH, REASONING, MATHEMATICS, Computer Science, Cluster_085_MATHEMATICS, GS & GK |
| SBI PO / Clerk | Puducherry | UT | Banking (UT) | Computer Science, REASONING, GS & GK, Cluster_085_MATHEMATICS, ENGLISH, MATHEMATICS |
| SBI PO/CLERK | Jammu & Kashmir | UT | Banking (UT) | Cluster_085_MATHEMATICS, Computer Science, MATHEMATICS, REASONING, GS & GK, ENGLISH |
| SBI PO/Clerk | Chandigarh | UT | Banking (UT) | GS & GK, Computer Science, ENGLISH, MATHEMATICS, Cluster_085_MATHEMATICS, REASONING |
| SBI PO/Clerk | Dadra & Nagar Haveli and Daman & Diu | UT | Banking (UT) | GS & GK, Cluster_085_MATHEMATICS, MATHEMATICS, REASONING, Computer Science, ENGLISH |
| SSC CGL | Andaman and Nicobar Islands | UT | SSC (UT) | GS & GK, Cluster_085_MATHEMATICS, MATHEMATICS, ENGLISH, Computer Science, REASONING |
| SSC CGL / CHSL (UT Cadre) | Ladakh | UT | Central Govt | MATHEMATICS, GS & GK, Cluster_085_MATHEMATICS, Computer Science, ENGLISH, REASONING |
| SSC CGL / CHSL (UT Cadre) | Lakshadweep | UT | Central Govt | GS & GK, Computer Science, REASONING, ENGLISH, Cluster_085_MATHEMATICS, MATHEMATICS |
| SSC CGL / CHSL (UT Cadre) | Puducherry | UT | Central Govt | MATHEMATICS, ENGLISH, Computer Science, Cluster_085_MATHEMATICS, REASONING, GS & GK |
| SSC CGL/CHSL | Jammu & Kashmir | UT | Central Govt | GS & GK, Cluster_085_MATHEMATICS, REASONING, MATHEMATICS, ENGLISH, Computer Science |
| SSC CGL/CHSL(UT Cadre) | Dadra & Nagar Haveli and Daman & Diu | UT | Central Govt | GS & GK, ENGLISH, Cluster_085_MATHEMATICS, REASONING, MATHEMATICS, Computer Science |
| SSC CHSL | Andaman and Nicobar Islands | UT | SSC (UT) | MATHEMATICS, REASONING, Computer Science, GS & GK, Cluster_085_MATHEMATICS, ENGLISH |

### C. Removed by 09-19 duplicate cleanup (55)

| Exam | Region | Level | Category | Precis linked before |
|---|---|---|---|---|
| Agriculture Field Officer | Nagaland | State | Agriculture Department | GS & GK, REASONING |
| Assam Lab Technician/Pharmacist | Assam | State | Health Services | GS & GK, ENGLISH |
| Maharashtra ANM/Staff Nurse | Maharashtra | State | Technical Services | GS & GK |
| Maharashtra Pharmacist | Maharashtra | State | Health Services | GS & GK |
| Maharashtra Staff Nurse | Maharashtra | State | Health Services | GS & GK |
| Meghalaya ANM/Staff Nurse | Meghalaya | State | Technical Services | GS & GK |
| Meghalaya Pharmacist | Meghalaya | State | Health Services | GS & GK |
| NHM Jharkhand CHO | Jharkhand | State | Health Services | GS & GK |
| NHM Maharashtra CHO (Community Health Officer) | Maharashtra | State | Health Services | GS & GK |
| NHM Nagaland CHO (Community Health) | Nagaland | State | Health Services | GS & GK |
| NHM Odisha CHO (Community Health Officer) | Odisha | State | Health CHO | GS & GK |
| NHM Punjab CHO | Punjab | State | NHM Health | GS & GK |
| NPSC Assistant Research Officer/Lecturer | Nagaland | State | Education Services | GS & GK, ENGLISH |
| Nagaland Group D (Peon/MTS) | Nagaland | State | Group D Services | GS & GK, HINDI, ENGLISH |
| Nagaland Pharmacist Grade III/IV | Nagaland | State | Health Services | GS & GK |
| Nagaland Staff Nurse Recruitment | Nagaland | State | Health Services | GS & GK |
| Nagaland Staff Nurse/ANM | Nagaland | State | Technical Services | GS & GK |
| Nagaland Village Council Election Officer | Nagaland | State | Revenue Services | GS & GK, REASONING |
| OPSC Assistant Executive Engineer (AEE) | Odisha | State | Engineering | GS & GK, REASONING |
| OPSC Assistant Law Officer | Odisha | State | Law Service | GS & GK, ENGLISH |
| OPSC Medical Officer | Odisha | State | Medical Officer | GS & GK |
| OSSSC Pharmacist Allopathy/Ayurveda | Odisha | State | Health Pharma | GS & GK |
| OSSSC Staff Nurse/Nursing Officer | Odisha | State | Health Nursing | GS & GK |
| Odisha Agriculture Services (ASO/AO) | Odisha | State | Agriculture | REASONING, GS & GK |
| Odisha GDS (Gramin Dak Sevak) | Odisha | State | Postal GDS | GS & GK, REASONING |
| PPSC Assistant Engineer (AE PWD/Irrigation) | Punjab | State | Engineering | GS & GK, REASONING |
| PSSSB Junior Engineer (Civil/Mech) | Punjab | State | JE Engineering | REASONING, GS & GK |
| Punjab Agriculture Supervisor | Punjab | State | Agriculture Supervisor | GS & GK, REASONING |
| Punjab Horticulture Development Officer | Punjab | State | Horticulture | GS & GK, REASONING |
| Punjab Multipurpose Health Worker | Punjab | State | MPW | GS & GK |
| Punjab Staff Nurse | Punjab | State | Health Nursing | GS & GK |
| Punjab Veterinary Inspector | Punjab | State | Veterinary | GS & GK |
| Rajasthan Home Guard | Rajasthan | State | Home Guard | GS & GK, REASONING, HINDI, MATHEMATICS |
| Sikkim ANM | Sikkim | State | Health Services | GS & GK, REASONING |
| Sikkim Group D (Peon/MTS) | Sikkim | State | Group D Services | GS & GK, HINDI, ENGLISH |
| Sikkim Staff Nurse | Sikkim | State | Health Services | GS & GK |
| TN Agriculture Supervisor | Tamil Nadu | State | Agriculture Services | GS & GK, REASONING |
| TN Health CHO | Tamil Nadu | State | Health Services | GS & GK |
| TN MRB Staff Nurse | Tamil Nadu | State | Health Services | GS & GK |
| TN Pharmacist | Tamil Nadu | State | Health Services | GS & GK |
| TPSC Assistant Professor | Tripura | State | Education Services | GS & GK, ENGLISH |
| TS CHO (Community Health Officer) | Telangana | State | Health Services | GS & GK |
| TS Health Staff Nurse | Telangana | State | Health Services | GS & GK |
| TSSSC Lab Technician | Tripura | State | Technical Services | GS & GK |
| Tripura Staff Nurse | Tripura | State | Health Services | GS & GK |
| UK ANM/CHO | Uttarakhand | State | Health Services | GS & GK |
| UK Staff Nurse | Uttarakhand | State | Health Services | GS & GK |
| UP Community Health Officer (CHO) | Uttar Pradesh | State | Health Services | GS & GK |
| UP Staff Nurse | Uttar Pradesh | State | Health Services | GS & GK |
| UP TGT (Trained Graduate Teacher) | Uttar Pradesh | State | Teacher Recruitment | GS & GK, ENGLISH |
| WB 2nd SLST (PGT/Assistant Teacher) | West Bengal | State | Teacher Recruitment | GS & GK, ENGLISH |
| WB Staff Nurse | West Bengal | State | Health Services | GS & GK |
| WBPSC Assistant Professor | West Bengal | State | Education Services | GS & GK, ENGLISH |
| WBSSC SLST (Secondary Level) | West Bengal | State | Group C Posts | GS & GK, REASONING |
| Driver Recruitment | Delhi | UT | Transport | GS & GK, HINDI |

### M. Removed 09-19 as misfiled (6)

| Exam | Region | Level | Category | Precis linked before |
|---|---|---|---|---|
| BPSC Assistant Professor | Bihar | State | Education Services | ENGLISH |
| JPSC Assistant Professor | Jharkhand | State | Education Services | ENGLISH |
| PPSC School Lecturer | Punjab | State | Lecturer | ENGLISH |
| SPSC Assistant Professor/Lecturer | Sikkim | State | Education Services | ENGLISH |
| UP PGT (Post Graduate Teacher) | Uttar Pradesh | State | Teacher Recruitment | ENGLISH |
| UPPSC Assistant Professor | Uttar Pradesh | State | Education Services | ENGLISH |

### D. No evidence of ever having a Precis (36)

| Exam | Region | Level | Category | Precis linked before |
|---|---|---|---|---|
| Association of Chartered Certified Accountants | Central | Central | Accounting & Commerce | - |
| Certified Public Accountant (CPA) | Central | Central | Accounting & Commerce | - |
| Engineer | Central | Central | NIC | - |
| Judge Advocate General | Central | Central | Defence | - |
| MPSC Lecturer/Assistant Professor | Manipur | State | Education Services | - |
| MPSC Lecturer/Assistant Professor | Meghalaya | State | Education Services | - |
| Punjab Gramin Dak Sevak | Punjab | State | Postal GDS | - |
| Assistant Professor / Lecturer | Chandigarh | UT | Teaching | - |
| Assistant Professor / Lecturer | Ladakh | UT | Teaching | - |
| Assistant Professor / Lecturer | Lakshadweep | UT | Teaching | - |
| Assistant Professor / Lecturer | Puducherry | UT | Teaching | - |
| Civil Defence Volunteer | Delhi | UT | Disaster Response | - |
| Civil Defence Volunteer | Jammu & Kashmir | UT | Disaster | - |
| Contract Medical & Admin Staff | Andaman and Nicobar Islands | UT | Medical | - |
| Contract Medical & Admin Staff | Chandigarh | UT | Medical | - |
| Contract Medical & Administrative Staff | Dadra & Nagar Haveli and Daman & Diu | UT | Medical | - |
| Contract Medical & Administrative Staff | Ladakh | UT | Medical | - |
| Contract Medical & Administrative Staff | Lakshadweep | UT | Medical | - |
| Contract Medical & Administrative Staff | Puducherry | UT | Medical | - |
| Contract Medical Staff | Delhi | UT | Health | - |
| Group B/C / Nursing / Technical | Chandigarh | UT | Medical | - |
| Guest Teacher | Delhi | UT | Judiciary | - |
| Home Guard Volunteer | Chandigarh | UT | Home Guards | - |
| Home Guard Volunteer | Dadra & Nagar Haveli and Daman & Diu | UT | Home Guards | - |
| Home Guard Volunteer | Delhi | UT | Civil Security | - |
| Home Guard Volunteer | Ladakh | UT | Home Guards | - |
| Home Guard Volunteer | Lakshadweep | UT | Police (UT) | - |
| Home Guard Volunteer | Puducherry | UT | Home Guards | - |
| Medical Officer | Jammu & Kashmir | UT | Medical | - |
| Medical Officer / Specialist | Andaman and Nicobar Islands | UT | Medical | - |
| Medical Officer / Specialist | Chandigarh | UT | Medical | - |
| Medical Officer / Specialist | Dadra & Nagar Haveli and Daman & Diu | UT | Medical | - |
| Medical Officer / Specialist | Ladakh | UT | Medical | - |
| Medical Officer / Specialist | Lakshadweep | UT | Medical | - |
| Medical Officer / Specialist | Puducherry | UT | Medical | - |
| Volunteer Recruitment | Jammu & Kashmir | UT | Police (UT) | - |
