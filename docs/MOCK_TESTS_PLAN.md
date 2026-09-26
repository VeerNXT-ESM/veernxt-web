# Mock Tests (Quiz Center) - Drive vs DB plan

**Purpose:** make `quizzes`/`questions` (Quiz Center = Mock Tests; PYQs are separate) match the Drive, correctly named, correctly mapped to exams, with ONLY correct content. Work CENTRAL first, folder by folder. **STATE and UT do not start until CENTRAL is signed off by the user.**

Read this file first when restarting. Update the STATUS section after every folder.

---

## 0. Rules (from the user, do not relax)
1. Sequential: one category folder at a time; finish + verify it before the next (see memory `feedback_sequential_folder_ingest`). CENTRAL fully done and verified before STATE; STATE before UT.
2. Naming: no underscores. Format `<Exam Name> Mock Test NN` (NN = 01..10, zero padded). `<Exam Name>` = the `exams.exam_name` of the matched exam.
3. Every quiz must have `lc_exam_id` set to its exam (`exams.exam_id` == `lc_exams.id`). Leave `quizzes.exam_name` as-is (app queries by it: `useExamContent.js`, `ProfilingResults.jsx`).
4. Only correct info: no duplicates, no wrong-exam content, no placeholder content, no wrong answer keys (see gate G3).
5. Exams with no mock tests on Drive -> reported to the content team (sheet "Need mock tests"), never fabricated.
6. Every write: dry run -> user confirms -> backup to `K:\tmp\db_backups\<ts>` -> execute -> verify with the **anon key** (RLS can hide rows; service-role checks alone are not enough).
7. No secrets in scripts (read `.env`). Do not commit generated content/xlsx (`docs/*.xlsx` stay untracked). No git stash during a merge.
8. Drive is read at `G:\My Drive\VeerNXT_Final_Content\{CENTRAL,STATE,UT} EXAMS` (Drive desktop). The Drive link the user gave could not be resolved to a local path; the whole tree is used.

## 1. Facts established (2026-09-25)
- Mock tests = table `quizzes` (`category='Mock Test'`) + `questions` (`quiz_id` FK). `quiz_attempts` also references quizzes. `lc_exam_quiz_map` exists but is empty (QuizCenter can use it optionally). `quizzes` has NO status column: removal = delete.
- Drive test-series folders are named many ways (`5. 10 TEST SERIES`, `5.10_TEST_SERIES`, `5. 10 MOCK TESTS`, `5. TEST SERIES-10`, ...). Real docx are ~90 KB+; placeholder docx are tiny (<20 KB flag).
- Docx format seen (RRB JE): header lines, `SECTION n: ... (Qa - Qb)`, then `Qn.  question`, `A) .. D)`, `Answer: C) 15%`, `Explanation: ...`. `mammoth` is installed (raw text extraction). No mock-test parser exists yet -> must be written (start from `scripts/ingest_structured_pyps.mjs` / `scripts/lib/ingest-drive-content.js` patterns; check them first).
- **Content-quality risk:** RRB JE Paper 01 Q2's explanation reads "wait ... Actually profit 3.3%. Take A) 2.9% loss." -> source answer keys/explanations can be wrong or self-contradicting.
- CENTRAL audit: 442 exam folders, 231 with real mocks, 2,307 real docx. Only 9 exams in DB before cleanup (RRB/RPF x8 + SSC Selection Post), 0 linked.
- Cleanup DONE 09-25: quizzes 451 -> 100. 90 kept quizzes renamed + linked (9 exams x 10). 351 dup quizzes (34,128 questions) deleted; backup `K:\tmp\db_backups\2026-09-25T06-15-31-237Z`.

## 2. Tools / artifacts
| What | Where |
|---|---|
| Audit (read-only, per category root, `--json=`) | `scripts/audit_mock_test_linkage.mjs` |
| Workbook builder for content team | `scripts/export_mock_test_report.mjs` (needs `xlsx` from `K:\tmp\xlsx_tool`; `cd K:\tmp\xlsx_tool && npm i xlsx` if missing) |
| Dedupe + rename + link (CENTRAL, done) | `scripts/dedupe_and_rename_mock_tests.mjs` (reads the xlsx sheet "Existing quizzes to fix") |
| Audit JSON per category | `K:\tmp\mock_audit\CENTRAL_<category>.json` (regenerate anytime: run the audit per category root) |
| Report | `docs/Central_Mock_Tests_Audit.xlsx` (untracked) |
| Backups | `K:\tmp\db_backups\` and `K:\H DRIVE\Quantum Climb\CLIENT ASSETS\VeerNXT\CONTENT\FINAL_QUIZZES_BACKUP` (old, pre-cleanup, 451 files) |
| Memory | `project_mock_test_audit_central_2026-09-25.md` |

Regenerate audit for all CENTRAL categories:
```
R="G:/My Drive/VeerNXT_Final_Content/CENTRAL EXAMS"
for d in "$R"/*/; do n=$(basename "$d"); node scripts/audit_mock_test_linkage.mjs "$d" --json="K:/tmp/mock_audit/CENTRAL_${n//[^A-Za-z0-9]/_}.json"; done
node scripts/export_mock_test_report.mjs K:/tmp/mock_audit docs/Central_Mock_Tests_Audit.xlsx CENTRAL
```
(Re-run after each folder so the workbook reflects the DB. NB: the dedupe script must not be re-run on a changed workbook without a dry run.)

## 3. Per-category procedure (repeat for each CENTRAL category folder)
For category X:
1. **Audit** X with the audit script; list its exam folders and statuses.
2. **Resolve exam matches:** every folder with real mocks must map to exactly one `exams` row. Fix the 72 unmatched / 15 multi-claimed CENTRAL folders in X with the user (sheet "Unmatched", "Verify duplicate matches"). Never guess; record manual mappings in `scripts/data/mock_exam_overrides.json` (create; `{ "<relPath>": "<exam_id>" }`) and have the audit read it.
3. **Parse** each real docx -> structured quiz (title, ~N questions, 4 options, correct answer, explanation, section/subject). Dry-run report per folder: file, question count, parse errors, questions missing options/answer.
4. **Quality gate G3 (correct info only)** per paper:
   - question count is what the header says (e.g. 100) - flag shortfall (RRB ALP has 75 in DB: compare with docx),
   - every question has 4 options and a valid answer letter,
   - explanation does not contradict the key (flag phrases like "wait", "actually", "take", "standard", "however" and answer text not matching the explanation's computed result),
   - no duplicate questions within/between papers of the same exam,
   - not a placeholder/template.
   Failing papers are NOT ingested; they go to the content team sheet with the reason.
5. **User confirms** the dry run for X (counts: quizzes to add, questions, papers rejected).
6. **Backup, then ingest**: insert `quizzes` (title per rule 2, `category='Mock Test'`, `exam_name`, `conducting_body`, `subject`, `level`, `lc_exam_id`, `source_file` = the Drive path, `file_hash`, `total_questions` = actual inserted count) then `questions`. Idempotent: skip if `file_hash` exists (this is what prevented nothing before - the DB had 5x duplicates from re-ingests).
7. **Verify** (anon key): quiz count per exam == real papers on Drive, titles have no underscores, all linked, question counts match, `InteractiveQuiz` fetch works, no duplicates. Re-run audit: category X must show only OK / NO_MOCKS_ON_DRIVE.
8. Update STATUS below + memory + regenerate workbook. Then next category.

## 4. CENTRAL categories (order = audit order; start with SSC)
Counts from the 09-25 audit: folders / real mock docx on Drive / no mocks on Drive / unmatched exams.

| # | Category | Folders | Real docx | No mocks (content team) | Unmatched | Status |
|---|---|---|---|---|---|---|
| 01 | SSC | 13 | 119 | 1 (SSC JE) | 2 (JHT, Delhi Police MTS-HC) | Selection Post done; 11 to ingest |
| 02 | BANKING | 36 | 120 | 24 | 2 | not started |
| 03 | TEACHING | 72 | 415 | 29 | 3 | not started |
| 04 | RRB | 9 | 90 | 0 | 0 | 8 done (ALP is 75q - recheck); RRB NTPC to ingest |
| 05 | UGC-NET | 3 | 30 | 0 | 0 | not started |
| 06 | NURSING | 78 | 158 | 62 | 12 | not started |
| 07 | CIVIL SERVICES | 2 | 10 | 1 | 1 | not started |
| 08 | ENGINEERING RECRUITMENT | 6 | 60 | 0 | 2 | not started |
| 09 | DEFENCE | 19 | 150 | 7 | 16 | not started |
| 10 | JUDICIARY | 27 | 90 | 18 | 0 | not started |
| 11 | INSURANCE | 17 | 170 | 0 | 6 | not started |
| 12 | OTHER GOVERNMENT | 21 | 210 | 0 | 1 | not started |
| 13 | INDIA POST | 4 | 0 | 4 | 1 | report only |
| 14 | BARC | 5 | 0 | 5 | 0 | report only |
| 15 | ICAR-IARI | 1 | 0 | 1 | 1 | report only |
| 16 | NIC | 3 | 0 | 3 | 0 | report only |
| 17 | ACCOUNTS & COMMERCE | 5 | 10 | 4 | 2 | not started |
| 18 | POLICE | 62 | 92 | 52 | 21 | not started |
| 19 | PSU MAHARATNA | 14 | 140 | 0 | 0 | not started |
| 20 | PSU NAVRATNA | 25 | 243 | 0 | 1 | not started |
| 21 | METRO RAIL | 20 | 200 | 0 | 1 | not started |

## 5. CENTRAL definition of done (gate to STATE)
- Every CENTRAL folder with real, passing mocks has exactly the right quizzes in DB; nothing else in `quizzes` maps to CENTRAL.
- 0 underscore titles, 0 unlinked quizzes, 0 duplicate papers, 0 quizzes failing gate G3.
- Remaining exams with no/failed mocks are all listed in the content-team workbook.
- The 9 "Section N" quizzes (exam unknown) and the 1 duplicate with a `quiz_attempts` row are resolved (ask content team / user).
- User signs off explicitly. Only then: run the same audit for STATE (`STATE EXAMS`, 28 states, 464 folders, ~3,983 docx) and UT (307 folders, ~2,881 docx). Remember the 468 html mock-test rows parked as Draft in `resources` (09-23) belong to STATE and must be reconciled then (see memory `project_cleanup_orphan_intros_html_guides_2026-09-23`).

## 6. Open items / questions for the user or content team
- 9 quizzes titled "Section 1..10": which exam? (Stenographer folders exist under ESIC, KVS, ...)
- 1 leftover duplicate (underscore title) has a `quiz_attempts` row: move attempt to kept copy and delete? Currently left alone.
- RRB ALP mocks have 75 real questions each (not 100): partial parse or source is 75?
- RRB NTPC: 10 mocks on Drive, none in DB.
- Unmatched folders (Defence abbreviations, Police posts, Nursing): mapping decisions.
- Answer-key/explanation errors in source docx (example above): who fixes them - content team re-issue, or do we correct?
- Drive folder names with underscores / "(1)" suffixes: cosmetic, tell content team.

## 7. STATUS LOG (append newest at bottom)
- 2026-09-25: audit built + run for all CENTRAL; workbook created; dedupe + rename + link executed (451 -> 100 quizzes; verified via anon). Plan written. Next: 01.SSC (write parser first: inspect `scripts/ingest_structured_pyps.mjs`, `scripts/lib/ingest-drive-content.js`, sample SSC CGL docx `SSC_CGL_MockTest_01_with_Answers.docx`).

- 2026-09-25 (later): **Parser + gate built** (`scripts/lib/mock_test_parser.mjs`, `scripts/parse_mock_tests_dryrun.mjs`, `scripts/parse_mock_tests_category.mjs`; read-only). Gate results are in `K:\tmp\mock_audit\gate_01_SSC.json` / `gate_04_RRB.json`.
  - **DB defect found:** in the 100 remaining quizzes ~7,000/9,800 questions have "Correct Answer / Explanation" text glued into option D and `explanation` empty; SSC Selection Post 961/993 and Stenographer 534/539 have no `correct_answer`. So the 90 renamed quizzes need their questions REWRITTEN from the docx (not just renamed). Only RRB JE is mostly clean (41/1000).
  - **Source docx defects (real, not parser artefacts):** answer key belonging to another question, options duplicated ("3,4" vs "4,3"), self-contradicting explanations ("Wait... Recalc..."), "[Answer not available for Qn]", image-only questions. 0 of 209 papers (SSC 119 + RRB 90) are fully clean; question-level clean rate: SSC 71% (8,234/11,599), RRB/RPF 91% (8,181/8,998).
  - **RRB ALP is 75 questions per paper in the source itself** (declared), so 75 is correct - not a partial parse.
  - **Multiple docx formats** (each folder differs): RRB `Qn. / A) / Answer: / Explanation:`; SSC CGL `Q.n` + 4 unlabeled option lines + `✔ Correct Answer: Option (B) – text`; SSC GD `(a) .. (d)` inline, unnumbered; SSC JHT (Hindi) `1.` + inline `(A)..(D)`; SSC CHSL `Qn` alone, `A)` then option on next line, `Correct Answer / Option B)`, `📝 Explanation`; Stenographer/CPO have other quirks. Parser handles RRB+CGL+Selection Post; GD, JHT, CHSL, Stenographer, CPO need format handlers.
  - **Identical content cloned across exams:** SSC Delhi Police Constable == SSC Constable (Driver); SSC MTS == Delhi Police MTS-HC (same counts/clean numbers). Decide whether one paper set may serve several exams.
  - **Waiting on user decision:** policy for papers that have some flawed questions (see chat): (A) reject the whole paper, (B) ingest only clean questions and send flagged ones to the content team, (C) ingest all with flags.

- 2026-09-25 (later still): **USER CHOSE POLICY C** (ingest everything, mark flawed questions). Implemented in `scripts/ingest_mock_tests.mjs` (dry-run default; `--only=<relPath prefix>`; writes backup to K:\tmp\db_backups; idempotent on (lc_exam_id,title); replaces questions of existing quizzes). Exception I added: a paper is HELD (not ingested) if it parsed <5 questions or <50% of questions have an answer key (cannot be scored) - tell the user this deviation.
  - Parser v2 (`scripts/lib/mock_test_parser.mjs`) is now a single tolerant engine (numbering styles, option layouts incl. glued inline, answer styles, answer-key tables, Directions passages, sections restarting numbering, Unicode/Hindi safe). New flags: PLACEHOLDER_EXPLANATION. Paper-level: PARSED_TOO_FEW, SOURCE_HAS_NO_ANSWER_KEYS, SHORT_PAPER (category script).
  - Manual exam mappings live in `scripts/data/mock_exam_overrides.json` (key `<category folder>|<relPath>`): SSC JHT and SSC Delhi Police MTS-HC added.
  - **Needs DDL before --execute** (script stops and prints it): `ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS review_flags text[] NOT NULL DEFAULT '{}';` No DDL path exists in repo scripts; SUPABASE_ACCESS_TOKEN exists in .env (Management API could run it) - ask the user first.
  - **01.SSC dry run (not executed):** 12 folders -> 114 papers (10 replace existing Selection Post quizzes, 104 new), 13,764 questions, 2,299 with review flags; 5 papers HELD (GD #02 parsed 2; Stenographer #04 parsed 1, #09 49/100 keyed, #10 23/100 keyed; CPO #10 0/200 keyed). SSC JE has no mock docx (content team). Cloned content: Delhi Police Constable == Constable (Driver); MTS == Delhi Police MTS-HC.
  - Under policy C flagged questions (some with wrong keys) will be visible to students unless the app hides `review_flags <> '{}'`: offer that as a follow-up.
  - Next: get user OK for the DDL + `--execute` on 01.SSC, then verify (anon key, counts, no underscores, all linked), regenerate audit/workbook, mark 01 done, then 02.BANKING.

- 2026-09-25 (bulk run): **User authorized "ingest everything" and running the ENTIRE CENTRAL folder at once, and the use of SUPABASE_ACCESS_TOKEN for DDL.** Done: `questions.review_flags text[] NOT NULL DEFAULT '{}'` added via Management API (`POST api.supabase.com/v1/projects/<ref>/database/query`).
  - Changes since the SSC dry run: papers with no answer keys are now INGESTED (flagged NO_ANSWER_KEY); only papers with <5 parsed questions are held; folders whose exam match is claimed by >1 folder are NOT loaded (avoid wrong-exam overwrite); parser learned `Ans: (C) text | explanation`, drops numbered instruction preambles; titles prefix the conducting body when `exam_name` is not unique in `exams` (e.g. "Bihar Police Constable Mock Test 01").
  - Full dry run (before Police fix): 1,925 papers / 247,434 questions / 32,858 flagged (Police fix cut its flags 9,529 -> 1,067); 35 folders not loaded (no exam match/ambiguous: Defence UPSC/IAF/NDA/CDS/CAPF/AFCAT..., Insurance duplicates, Civil Services UPSC CSE, ISRO Scientist, etc.); 5 papers held (parse failures).
  - Execute loop: `K:\tmp\run_central_exec.sh` -> log `K:\tmp\mock_audit\execute_all.log`; per-category backups in `K:\tmp\db_backups\<ts>` (created_quiz_ids.json = rollback list of new quizzes; quizzes_replaced/questions_replaced.json = originals of the 90 replaced).
  - Then: verify via anon key, run `scripts/export_mock_test_issues.mjs K:/tmp/mock_audit docs/Central_Mock_Tests_Issues.xlsx CENTRAL` (content-team hit list), map the 35 unloaded folders (add to `scripts/data/mock_exam_overrides.json`), fix the unresolved 'Section N' quizzes, decide on hiding flagged questions in the Quiz Center, then user sign-off for CENTRAL.

- 2026-09-25 (CENTRAL BULK INGEST DONE, pass 1): all 21 CENTRAL categories run with `--execute` (log `K:\tmp\mock_audit\execute_all.log`). **Verified exactly via SQL aggregates** (Management API): quizzes 1,928, questions 246,947, 0 count mismatches, 0 empty quizzes, 0 duplicate (exam,title), 196 exams have quizzes. Leftovers = 10 legacy quizzes: 9 "Section N" (exam unknown, corrupted, unlinked) + 1 `RPF_CONSTABLE_PAPER_01` (dup, has quiz_attempts). NOTE: verifying with `.range()` over `questions` gives false mismatches/timeouts - use SQL aggregates (`POST api.supabase.com/v1/projects/<ref>/database/query`, token in .env).
  - **Issues hit list:** `docs/Central_Mock_Tests_Issues.xlsx` (untracked) from `scripts/export_mock_test_issues.mjs K:/tmp/mock_audit docs/Central_Mock_Tests_Issues.xlsx CENTRAL` (sheets: Read me, Summary by exam, Quizzes with issues, Flagged questions, Held, Not loaded - exam match, Exams with no mock tests). Regenerate after every re-ingest.
  - **Parser round 2 (fixes found while sanity-checking the worst-flagged exams):** answer-text capture no longer crosses newlines / "Detailed Explanation:" handled; `Answer:` always starts a line; answers given as option TEXT (Marathi) resolved to a letter; trailing "✓" on option lines; instruction preambles dropped (junk-option or instruction-text heuristics); numbering locked to one family (Q-prefixed vs plain "1.") so numbered steps in explanations are not questions; separate answer sections (questions first, then "Qn Answer/Explanation") merged back by number. Effect: Kanpur Metro 99%->~7% flagged, Police 71%->~6%, SUPER TET 95%->fixed.
  - **Genuine source duplication/defects (leave flagged):** KVS Principal 51% (700 dup questions), PPSC (repeated "[PPSC-MOCK-n]" questions), Stenographer 60%, KVS PRT 32%, Arunachal TET 28%.
  - NEXT (pass 2): full dry run (`/k/tmp/run_central.sh`, log dryrun_all2.log) -> compare with pass 1 -> re-run execute loop (`/k/tmp/run_central_exec.sh`; idempotent replace, backups per category) -> regenerate issues workbook -> handle 35 unloaded folders (add overrides in `scripts/data/mock_exam_overrides.json`: Defence UPSC/NDA/CDS/CAPF/IAF/AFCAT/ICG..., Civil Services CSE, ISRO Scientist, SSC JE, Insurance duplicate-claimed folders, Metro Gurgaon...) -> resolve the 10 legacy quizzes -> decide app behaviour for flagged questions -> user sign-off CENTRAL -> STATE.

- 2026-09-25 (PASS 2 DONE): all 21 categories re-ingested with the round-2 parser (`execute_all2.log`, all "Ingested", exit 0). **Verified (SQL aggregates):** quizzes 1,929 (1,919 loaded + 10 legacy), questions 245,209, 0 count mismatches, 0 empty quizzes, 0 orphan questions, 0 duplicate (exam,title), 196 exams with mocks; questions without answer key 3,399 (was 6,453); hard-flagged questions 16,160 (was 21,822); 11 papers held (parse failures <5 questions). Issues workbook regenerated: `docs/Central_Mock_Tests_Issues.xlsx` (1,780 of 1,919 quizzes have >=1 flagged question; sort is worst-first). Anon view of quizzes = service view (checked 1,928 after pass 1).
  - **CENTRAL is NOT yet signed off.** Open: (1) 35 folders not loaded (exam match missing/ambiguous) -> add overrides; (2) 10 legacy quizzes (9 "Section N", 1 `RPF_CONSTABLE_PAPER_01` w/ quiz_attempts); (3) 11 held papers (parser cannot read: e.g. KVS Librarian 4/5/9, UKMSSB GNM-ANM 3/5, RRB Nursing Supt 3, Bihar SI 01, GAIL 2, SECI EE 3, Agra Metro 7, SSC GD 02, SSC Steno 04); (4) 211 exams with no mock docx (content team); (5) decide whether the app hides flagged questions; (6) optional LLM-assisted answer checking for flagged/unkeyed questions; (7) user sign-off, then STATE.

- 2026-09-25 (user: "do 5 and 1"): 
  - **(5) App now hides flagged questions.** New column `quizzes.playable_questions` (count of questions with a key and no blocking flag) + `src/lib/quizQuality.js` (`BLOCKING_QUESTION_FLAGS`, `MIN_PLAYABLE_QUESTIONS=10`, must match `BLOCKING` in `scripts/ingest_mock_tests.mjs` = HARD_FLAGS minus PLACEHOLDER_EXPLANATION; ingest script now updates `playable_questions`). `InteractiveQuiz.jsx` skips blocking-flagged/unkeyed questions (previously a missing key silently became "option A correct"). `QuizCenter.jsx` now pages through ALL mock tests (PostgREST caps at 1,000; there are ~2,200), lists only quizzes with >=10 playable questions, and when `lc_exam_quiz_map` is empty falls back to `quizzes.lc_exam_id`. Lint + `vite build` pass; verified the exact queries via anon key (list 1,896 unique; player returns only playable rows; exam link fallback works). NOT verified in a browser (no automation tool). Changes uncommitted: `src/components/InteractiveQuiz.jsx`, `src/pages/QuizCenter.jsx`, `src/lib/quizQuality.js`.
  - **(1) 29 previously unloaded folders mapped** via `scripts/data/mock_exam_overrides.json` (hand-reviewed) and loaded with `/k/tmp/run_overrides.sh --execute` (268 new quizzes; per-folder backups). NDA and CDS have NO mock docx on Drive (content team). **6 folders left for the user** because `exams` lumps several posts into one row and title collisions would overwrite: ESIC UDC / Stenographer / JE / Nursing Officer / Doctors (exam rows: 364d7ded "Clerical: UDC, Stenographer", eebdaf48 "UDC / Stenographer", 8029abc0 "Technical & Medical JE, Nursing Officer/Staff Nurse, Doctors") and ISRO Scientist/Engineer (only exam row 3932488a "Scientist/Engineer Technical Assistant" which already holds ISRO Technical Assistant mocks).
  - DB now: 2,197 quizzes, 278,519 questions, 223 exams with mocks, 0 mismatches, 0 dup (exam,title). exams-table typos flow into titles: "IRFCRecruitment", "Assistant Grade lII" - fix in `exams`, then re-title.
  - Hidden-list findings (33 quizzes <10 playable, e.g. Uttarakhand Nursing Officer 01 0/197, NHPC 01 3/200, IBPS Clerk 02 1/12, SBI PO 04/05 8/8, Grade B Officers 10 7/211, ICG AC 53% flagged, ICG Navik only ~47 q/paper): more parser gaps and short papers to review.
  - NOTE: per-folder `--only` runs overwrite that category's `issues_*.json`; after any `--only` run, re-run the full dry run (`/k/tmp/run_central.sh`) before regenerating the workbook.

- 2026-09-25 (user: "fix the parser gaps; are quizzes mapped to exams properly?"):
  - **Mapping audit** (`scripts/audit_mock_mapping.mjs`, read-only): 223 folder->exam links, 222 agree with the Drive path (12 flagged are all acronym false alarms: GRMFL, IRDA, SSB, RSSB, ICG, AFCAT, IRFC...). All quiz `lc_exam_id`s exist in `lc_exams` AND `exams`; `quizzes.exam_name` equals the linked exam's name for every quiz. **ONE REAL ERROR:** the 10 quizzes from Drive `5.ISRO\Technical Assistant` ("Technical Assistant Mock Test NN") are linked to NIC's exam `a32ce9b5-fc1d-4996-bb87-b1621922f1fe` ("Technical Assistant | NIC"); they belong to ISRO's `3932488a-b7a8-402f-a71b-ea3de2666160` ("Scientist/Engineer Technical Assistant | ISRO"). The relink UPDATE via Management API was **DENIED by the auto-mode classifier** (raw SQL UPDATE on prod) - left for the user (run it themselves or add a permission rule). Intended SQL: `update quizzes set lc_exam_id='3932488a-b7a8-402f-a71b-ea3de2666160', exam_name='Scientist/Engineer Technical Assistant', conducting_body='ISRO', title='ISRO '||title where source_file ilike '%5.ISRO%Technical Assistant%' and lc_exam_id='a32ce9b5-fc1d-4996-bb87-b1621922f1fe'` (also add an override so re-ingest keeps it).
  - **App mapping hole fixed:** `useExamContent.fetchQuizzesByExamName` and `ProfilingResults` matched quizzes by `exam_name` text (+ `ilike` and career-track keyword fallbacks), so generic names ("Constable", "Staff Nurse", "Assistant") leaked one state's mocks into every exam with that name. Now: exact `quizzes.lc_exam_id` link first (playable >= 10), name fallbacks only see quizzes with `lc_exam_id IS NULL`. Lint+build pass; not browser-tested. Uncommitted: `src/hooks/useExamContent.js`, `src/pages/ProfilingResults.jsx`.
  - **Parser gaps fixed** (`scripts/lib/mock_test_parser.mjs`): markdown bold `**Q31. ...**`; `Q1.` alone on a line; numeric options `(1)..(4)` + `Correct Option: (2) Brave`; first option's `A)` label missing (`0.25 S B) 0.2 S C) ...`); answer letter on the line AFTER `Answer:`; numbered steps inside explanations no longer accepted as questions (candidate must be followed by an answer marker or A-D options before the next sequential number; falls back to non-strict if <5 found). Verified: Coast Guard AC 100%->clean, NHPC 197 noOpt->clean, KVS Principal 103->299 parsed, DSSSB PRT 35->200, RSSB Staff Nurse fixed; RRB JE/CGL/SUPER TET unchanged.
  - **Remaining genuine source defects (leave flagged):** SSC Stenographer answers belong to other questions; GATE "Multiple Select" (several correct answers, single-answer schema cannot hold them -> stay hidden); IRDAI/JHT residual stem-less items (cloze blanks, DI sets).
  - NEXT: fresh full dry run on the final parser -> if flags drop and counts sane -> full `--execute` (`/k/tmp/run_central_exec.sh`; idempotent replace) -> regenerate workbook -> re-check hidden list.

- 2026-09-25 (PARSER ROUND 3 + FULL RELOAD DONE): more parser fixes (5-option A-E papers, unlabeled 5-option lines, end-of-paper answer keys accepted, mixed "Q1."/plain numbering in one paper, answer-marker splitting when Word auto-numbering hides question numbers, strict "followed by answer/options" check for question starts). Reloaded ALL CENTRAL with `--execute --no-regress` (`execute_all3.log` cats 01-02, `execute_all4.log` cats 03-21 via `/k/tmp/run_central_exec2.sh 03`). `--no-regress` keeps an existing quiz when the new parse would have FEWER playable questions: **110 papers kept their previous data** (investigate later: several "Mock Test 10" papers newly show DUP_QUESTION under the new sequencing). Fixed a crash in the backup step (single IN(...) with 400+ ids exceeded the URL limit; now chunked).
  - **Final DB (exact SQL):** 2,205 quizzes (2,195 from CENTRAL + 10 legacy), 295,348 questions, **276,641 playable** (was 258,910 before this round; 245k questions/no blocking-flag filter earlier), 223 exams with mocks, questions without key 2,554, listed in Quiz Center 2,185, hidden 20 (<10 playable). 0 count mismatch, 0 playable mismatch, 0 empty quizzes, 0 orphans, 0 duplicate (exam,title).
  - Still hidden: 9 legacy "Section N", Arunachal TET/TGT+PGT Mock 08-10 (only 9 questions in source), Grade B Officers 10, Nursing Superintendent 08, SSC CPO 10 (no keys), SSC GD 02 (9 q), one Coast Guard AC paper.
  - Mapping audit re-run: still 222/223 correct; the ISRO Technical Assistant -> NIC link is STILL WRONG (fix denied, user must run/approve).
  - Workbook regenerated: `docs/Central_Mock_Tests_Issues.xlsx` (2,194 quizzes, 18,236 flagged questions, 4 held, 6 folders not loaded, 211 exams with no mocks). Papers kept under no-regress appear in it by the NEW parse.
  - Open for sign-off: ISRO relink; ESIC x5 + ISRO Scientist/Engineer mapping decision; 10 legacy quizzes; typos in exams names (IRFCRecruitment, Assistant Grade lII); 110 no-regress papers; LLM check of flagged keys; browser test of the app changes; commit (uncommitted: InteractiveQuiz.jsx, QuizCenter.jsx, useExamContent.js, ProfilingResults.jsx, src/lib/quizQuality.js + scripts).

## 8. How to restart after a limit
1. Read this file, then memory `project_mock_test_audit_central_2026-09-25.md`.
2. Check the STATUS LOG and the table in section 4 to see the current category.
3. Re-run the audit for that category (section 2 command) and compare with the DB (`quizzes` count, underscore titles, `lc_exam_id`).
4. Continue at the first unfinished step of section 3. Never skip the dry run / backup / anon verification.

- 2026-09-25 (user decision): **CENTRAL open items DEFERRED to later** (ISRO->NIC mislink, ESIC x5 + ISRO Scientist/Engineer mapping, 10 legacy quizzes, 110 no-regress papers, exam-name typos, browser test + commit of app changes, 211 exams with no mocks on Drive). User waived the "CENTRAL signed off first" gate and asked to BEGIN STATE EXAMS. Central stays loaded and live as-is.

- 2026-09-25 (STATE AUDIT DONE, read-only): audit run for all 28 states (`K:\tmp\mock_audit\STATE_*.json`; the file `STATE_01_Andhra_Pradesh.json` is a duplicate test run of `STATE_1__Andhra_Pradesh.json`). **643 exam folders, 374 with real mocks, 269 without; 3,705 real docx, 308 placeholder-size (<20 KB); 11 folders with no exam match; 22 exams claimed by more than one folder; nothing from STATE is in `quizzes` yet.** States with mocks: AP 197, Arunachal 320, Assam 211 (+10 tiny), Bihar 166 (+20 tiny), Chhattisgarh 290, Goa 201, Gujarat 251, Haryana 220, Karnataka 199, Maharashtra 177, Manipur 77, Meghalaya 176, Mizoram 194, Nagaland 199 (+10 tiny), Odisha 176 (+11 tiny), Punjab 10, Tripura 100 (+80 tiny), Uttar Pradesh 180 (+70 tiny), Uttarakhand 210, West Bengal 141 (+79 tiny), Jharkhand 10. **No mocks at all (content team):** Himachal Pradesh (30 folders), Kerala (27), Madhya Pradesh (30), Tamil Nadu (9 folders; empty mock folders); Rajasthan, Sikkim, Telangana have only INTRODUCTION folders. The 468 html mock rows parked as Draft in `resources` on 09-23 are the older html versions of these same Drive papers (e.g. AP High Court x10) and become redundant once a state is ingested from Drive.

- 2026-09-25 (STATE + UT LOADED; GAP REPORT BUILT): user: "whatever quizzes are there, parse and map them properly; then give the content team the gap document; they upload and map new mock tests with our quiz parser". Every STATE (20 states with mocks) and UT (all 8) folder with readable papers was ingested with `ingest_mock_tests.mjs --execute` (state loop `K:\tmp\run_state_exec.sh`, UT loop `K:\tmp\run_ut_exec.sh`; logs `K:\tmp\mock_audit\execute_state.log`, `execute_ut.log`; one backup dir per folder in `K:\tmp\db_backups`).
  - **Final DB (exact SQL + anon key): 7,963 quizzes, 772,833 questions, 801 exams with mocks, 7,823 quizzes shown in the app, 140 hidden (<10 playable), 79,733 flagged questions (hidden from students, listed for review), 0 count mismatches, 0 orphan questions, 0 duplicate (exam,title); anon sees all 7,963.** 10 legacy unlinked quizzes remain (Central, deferred).
  - **Problems found and fixed on the way (all from name collisions across states):** (1) audit matcher was not scoped to the folder's own state/UT, so generic names ("Constable Recruitment", "MPSC ...", "MSSC Clerk") matched another state's exam. `audit_mock_test_linkage.mjs` now restricts candidates to exams whose `state_ut` equals the STATE/UT root (UT unmatched-with-mocks 128 -> 36, State 6 -> 3). (2) The ingest only checked CENTRAL audit files for exams claimed by several folders; it now checks CENTRAL+STATE+UT (`ingest_mock_tests.mjs`). (3) The Manipur and Meghalaya MPSC folders had been written onto Maharashtra's exam (last load won); fixed via explicit overrides and reload (Maharashtra 10, Manipur 5, Meghalaya 10 each on their own exam). (4) Meghalaya MSSC papers were on Manipur's exam; reloaded to Meghalaya's and the 10 wrong quizzes deleted (backup `2026-09-25T14-05-05-128Z`). (5) Central "J&K Staff Nurse" papers were on the Dadra & Nagar Haveli Staff Nurse exam; mapped to the J&K exam (`f9985b98...`) and DNH's own papers loaded onto DNH's exam. Overrides added in `scripts/data/mock_exam_overrides.json`. Cross-region check afterwards: 0 mismatches on 3,641 STATE and 2,117 UT quizzes.
  - **Still open (shown in the gap report "Conflicts (shared exams)" sheet, 8 rows):** UP PGT (Central English set vs State UP set, State currently wins); ESIC vs FCI Junior Engineer; ESIC vs KVS Stenographer; Karnataka Group D (two folders). Not loaded: 43 Drive folders with papers that match no exam (36 UT, 3 State, 4 Central).
  - **GAP REPORT for the content team:** `docs/Mock_Tests_Gap_Report.xlsx` (untracked; regenerate with `node scripts/export_mock_gap_report.mjs docs/Mock_Tests_Gap_Report.xlsx`). Sheets: Read me, Summary by region, Exams needing mock tests (736: no Drive folder / no mock sub-folder / empty folder / placeholders), Incomplete exams (27 with fewer than 10 papers), Placeholder files (99 folders), Drive folders not matched (43), Conflicts (8), Hidden in app (140), Flagged questions by exam (801). Central 217 of 409 exams have mocks, State 370 of 835, UT 213 of 293. States with no mock files at all: Himachal Pradesh, Kerala, Madhya Pradesh, Tamil Nadu (empty folders); Rajasthan, Sikkim, Telangana (Introduction folders only).
  - Snapshots: `K:\tmp\snapshots\2026-09-25_after-mock-ingest` (taken BEFORE the state/UT load; the quiz tables are much larger now - take a new one before any destructive quiz change).

- 2026-09-26 (user: "Dont hide anything. Even if it has too few playable questions ... content team can update those"): **quizzes are no longer hidden from the Quiz Center listing.** `src/lib/quizQuality.js` `MIN_PLAYABLE_QUESTIONS` 10 -> 0 (used by `QuizCenter.jsx`, `useExamContent.js`, `ProfilingResults.jsx`), so all 7,963 mock tests are listed (was 7,823; the 140 formerly hidden are now visible; verified via the anon key with the exact listing query). Scope confirmed with the user: ONLY the listing gate was removed; inside a quiz, individual questions with a blocking flaw (no answer key, contradictory explanation, duplicate, ...) are still skipped during play so students are never shown a wrong-key question. `InteractiveQuiz.jsx` got a small "This mock test is being prepared" screen for a quiz with 0 playable questions (previously it would have shown 0/0 and NaN). Lint 0 errors, `vite build` passes; NOT tested in a browser (no automation tool). Uncommitted: `src/lib/quizQuality.js`, `src/pages/QuizCenter.jsx`, `src/components/InteractiveQuiz.jsx`. Gap report sheet "Hidden in app (<10 playable)" renamed "Few playable questions (<10)" and its wording fixed (`scripts/export_mock_gap_report.mjs`; report regenerated). The `quizzes.playable_questions` column and the ingest script's calculation are unchanged (still the content team's measure of how much of a paper is usable).
