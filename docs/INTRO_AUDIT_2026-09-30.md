# Intro Audit: exams without an Intro (2026-09-30)

**Status:** findings for Content Team review. **Nothing has been changed in the database.** The Excel version for the content team is `Intro_Audit_2026-09-30.xlsx` in this folder. Same method as [GUIDE_LINKS_AUDIT_2026-09-30.md](GUIDE_LINKS_AUDIT_2026-09-30.md) and [PRECIS_LINKS_AUDIT_2026-09-30.md](PRECIS_LINKS_AUDIT_2026-09-30.md).

**Question asked:** which exams have no Intro, and did they ever have one that was later removed?

## Summary

- Audited all **1,575** published exams in `lc_exams`. An exam has an Intro if `lc_exam_intro` holds a manual entry or an auto entry pointing at an existing resource, or if `lc_exam_resource_map` holds an Intro link to an existing resource.
- **11 exams have no Intro today.** 1,564 do.
- **None of the 11 ever had an Intro linked.** Unlike Guides and Precis, nothing was removed, so there is nothing to restore. The 09-25 snapshot (`lc_exam_intro` and Intro links) shows no Intro for any of them. Seven have only an empty placeholder slot (`source = unset`, no resource) and four have no slot row at all. Every removal log and backup in `K:/tmp/db_backups` that touches these exams involves Guide or Precis links only, never Intro.
- The history can't see anything removed before 08-20 and never backed up.

| Group | Exams | What it means |
|---|---|---|
| A. Possible duplicate of an exam that already has an Intro | 5 | A similar exam already has an Intro; probably a duplicate exam row or a generic version |
| B. Unlinked Published Intro exists | 2 | A matching Published Intro resource exists but is linked to no exam |
| C. Needs new content | 4 | No matching Intro resource exists |

## What to decide

1. **Group A:** is each a duplicate exam row to remove or merge, or a real separate exam that needs its own Intro?
2. **Group B:** link the unlinked Intros shown below? Intro is strictly 1:1 (one exam per Intro), so a resource already linked to another exam can't be reused.
3. **Group C:** which exams should get a new Intro written?

## Related

- 414 Published Intro resources are linked to no exam (the orphan-Intro cleanup that is waiting for the html-Guide triage). The IBPS RRB PO (two copies) and DRDO-DIHAR Intros are among them, so don't archive those before Group B is decided.
- **Side finding:** the Banking / Central exam named "Assistant" is linked to an Intro titled "BIHAR STATE CO", which looks like the wrong Intro. It is not one of the 11 and is worth a separate check.

## Detail

| Exam | Region | Level | Category | Intro slot today | Candidate Intro | Suggested action |
|---|---|---|---|---|---|---|
| Andhra Pradesh High Court | Central | Central | Judiciary & Legal Services | Empty slot ("unset") | The AP High Court exams under Andhra Pradesh (Junior Assistant, Stenographer, etc.) each have an Intro | Probably a duplicate of the state-level AP High Court exams. Decide whether to remove it or write a combined Intro. |
| Assistant | Central | Central | Insurance | Empty slot ("unset") | NIACL Assistant Introduction (already linked to another Insurance / Central exam also named "Assistant") | Check whether this is a duplicate exam row of the NIACL Assistant exam. If yes, remove or merge the duplicate. If it is a different exam, it needs its own Intro. |
| Local Bank Officers (LBO) | Central | Central | Banking | Empty slot ("unset") | INDIAN BANK LOCAL BANK OFFICER and INDIAN OVERSEAS BANK LBO (each linked to its own "Local Bank Officer (LBO)" exam) | Probably a generic or duplicate LBO exam row. Decide whether to remove it or write a generic LBO Intro. |
| Sikkim High Court | Central | Central | Judiciary & Legal Services | Empty slot ("unset") | High Court Clerk/Stenographer (Sikkim) Intro is linked to the Sikkim state exam | Probably a duplicate of the Sikkim state exam. Decide whether to remove it or write a separate Intro. |
| Tripura High Court | Central | Central | Judiciary & Legal Services | Empty slot ("unset") | High Court Clerk/Steno (Tripura) Intro is linked to the Tripura state exam | Probably a duplicate of the Tripura state exam. Decide whether to remove it or write a separate Intro. |
| IBPS RRB PO | Andaman and Nicobar Islands | UT | Banking (UT) | No Intro slot row | IBPS RRB PO (two unlinked Published copies: resource ids 114bdc6b-..., 03f545f9-...; a third copy is linked to IBPS RRB PO / Central) | Link one of the unlinked copies (Intro is strictly 1:1). Confirm this exam should exist under Andaman and Nicobar Islands at all. |
| Technical Assistant / Scientist / Admin | Chandigarh | UT | Research | No Intro slot row | Ladakh_DRDO_DIHAR_Technical_Assistant_Scientist_Admin_Introduction (4), resource id 6fb5de3d-..., unlinked, exam_name "Technical Assistant - Scientist - Admin (DRDO-DIHAR)" | Link that unlinked Intro to this exam (a second unlinked copy, (2), matches the "Technical / Scientist Recruitment" exam). |
| Electoral Staff Recruitment | Chandigarh | UT | Election Management | Empty slot ("unset") | None found | Needs a new Intro. |
| Mizoram TET Varg 2 (TGT) | Mizoram | State | Teacher Eligibility | No Intro slot row | Only the Varg 1 (PGT) Intro exists and it is linked to the Varg 1 exam | Needs its own Varg 2 (TGT) Intro (Intro cannot be shared between exams). |
| Mizoram TET Varg 3 (PRT) | Mizoram | State | Teacher Eligibility | No Intro slot row | Only the Varg 1 (PGT) Intro exists and it is linked to the Varg 1 exam | Needs its own Varg 3 (PRT) Intro (Intro cannot be shared between exams). |
| Technical Entry Schemes (TGC) | Central | Central | Defence | Empty slot ("unset") | Only Navy SSC Tech and Army SSC Tech Intros exist, both already linked to "Technical Entry Schemes (SSC Tech)" | Needs its own Technical Graduate Course Intro. |
