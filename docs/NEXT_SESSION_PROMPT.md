# Prompt for the next session (paste this as your first message)

We are "cleaning ship" on the VeerNXT Guide / Precis / Intro content. Read `docs/status_report.md` sections 63 and 64 (start at 64.7 "Next session starts here") and the memory file `project_cleanup_orphan_intros_html_guides_2026-09-23.md`. Do not re-derive what is already recorded there.

**Rules I have set (do not re-ask):**
- Guides stay as they are. Work on Precis only for now.
- Intro is one per exam. Quiz Center = MOCK TESTS; PYQs are separate and are not quizzes. Both need Google Drive later; not today.
- Final documents live in `K:\H DRIVE\Quantum Climb\CLIENT ASSETS\VeerNXT\CONTENT\FINAL_CONTENT\Final Documents\MASTER DOCUMENTS`. The Drive itself has 500+ duplicate copies per exam, so work from what is in the database.
- GK: keep the combined GK book linked; also assign all 7 subject splits (GK Biology / Chemistry / Economics / Geography / History / Physics / Polity). Delink the combined book only after the content team agrees.
- No duplicate info anywhere. Dry run first, backup first, verify through the ANON key (RLS hides Draft rows from anon; a service-role check alone is not enough).
- No hardcoded secrets; scripts read `.env`. Never commit `FINAL_*_STRUCTURED/`, `books/`, `docs/*.xlsx`.

**State of play:** done and live: "2026 MATHEMATICS" rename, 468 mock tests parked (Draft, 60 links removed), GK splits deduplicated (1 per subject) and linked to 310 Central exams. Everything has a backup and a one-command rollback: `node scripts/rollback_2026_09_23.mjs --step=<rename-math|unpark-mocks|restore-gk-dupes|unlink-gk-splits>` (dry run by default).

**Blocked at end of last session:** `node scripts/archive_state_gs_html_precis.mjs --execute` was refused by the auto-mode classifier. The dry run is approved (archive 218 duplicate html state-GS Precis rows, remove 349 Precis links across 258 exams, add 3 Guide links, leave 42 rows). I need to run it myself or add a Bash permission rule for `node scripts/*.mjs --execute`. Before it runs, add a `restore-state-html` step to `rollback_2026_09_23.mjs` (the script writes its own backup files).

**Then, in order (each as a dry run first):**
1. `node scripts/link_gk_splits_to_exams.mjs --levels=state,ut` (815 state + 239 UT exams that hold the combined GK Precis).
2. The 166 exams holding only the html "GENERAL KNOWLEDGE" Precis (136 ch): repoint to the block "GS & GK" Precis.
3. Remaining html Precis and the 7 html Guides: convert to block or archive as duplicates. RRB-GK-* splits: publish the block versions, archive the html.
4. Archive the 414 orphan Intros (published, linked to no exam).
5. Small items: fix mislabelled books (`2026 Descriptive Writing Bank Exams`, `Cluster_083_MATHEMATICS`), stale `chapter_count=9` on 711 Draft Mathematics rows, purge Draft GK duplicates if I say so.

Keep replies short; tell me the numbers and what you need from me.
